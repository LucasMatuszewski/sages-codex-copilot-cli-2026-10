import { randomUUID } from 'node:crypto'
import { UUIDSchema, type Identity } from '../../../shared/common.js'
import { SharedFactsSchema } from '../../../shared/finding-contracts.js'
import {
  SharedPatchRequestSchema, SharedPatchResponseSchema, VulnerabilityDetailResponseSchema,
  type DetectionEventRead, type SharedPatchRequest, type SharedPatchResponse,
  type VulnerabilityDetailResponse, type VulnerabilityRead,
} from '../../../shared/review-contracts.js'
import type {
  DetectionEventRecord, FindingsStore, FindingsUnitOfWork, VulnerabilityChanges, VulnerabilityRecord,
} from '../ports/findings-store.js'
import { PersistenceConstraintError } from '../ports/findings-store.js'
import { eventGaps, sharedGaps } from '../../domain/gaps.js'
import { decideStatusChange, reconcileStatus } from '../../domain/handling-status.js'
import { identityKey } from '../../domain/identity.js'
import { ReviewError } from './errors.js'

function parseId(input: unknown): string {
  const parsed = UUIDSchema.safeParse(input)
  if (!parsed.success) {
    throw new ReviewError(400, {
      code: 'INVALID_REQUEST', message: 'Niepoprawny identyfikator podatności.', retryable: false,
      fieldErrors: [{ path: 'id', code: 'invalid_format', message: 'Podaj poprawny identyfikator UUID.' }],
    })
  }
  return parsed.data
}

async function requireVulnerability(store: FindingsStore, id: string): Promise<VulnerabilityRecord> {
  const record = await store.findVulnerabilityById(id)
  if (!record) {
    throw new ReviewError(404, {
      code: 'VULNERABILITY_NOT_FOUND', message: 'Nie znaleziono wskazanej podatności.',
      fieldErrors: [], retryable: false,
    })
  }
  return record
}

function projectVulnerability(record: VulnerabilityRecord): VulnerabilityRead {
  const gaps = sharedGaps(record, record.gapResolutions)
  return { ...record, gaps, status: reconcileStatus(record.status, gaps) }
}

function projectEvent(record: DetectionEventRecord, vulnerability: VulnerabilityRecord): DetectionEventRead {
  const { requestFingerprint: _privateFingerprint, ...publicFields } = record
  const gaps = eventGaps(record, vulnerability, record.gapResolutions)
  return { ...publicFields, gaps, status: reconcileStatus(record.status, gaps) }
}

async function identitiesFor(store: FindingsStore, id: string): Promise<Identity[]> {
  const rows = await store.listIdentities(id)
  return rows.map(({ scheme, value }) => ({ scheme, value })).sort((a, b) =>
    a.scheme < b.scheme ? -1 : a.scheme > b.scheme ? 1 : a.value < b.value ? -1 : a.value > b.value ? 1 : 0,
  )
}

export async function getVulnerabilityDetail(
  unitOfWork: FindingsUnitOfWork, inputId: unknown,
): Promise<VulnerabilityDetailResponse> {
  const id = parseId(inputId)
  return unitOfWork.run(async (store) => {
    const vulnerability = await requireVulnerability(store, id)
    const events = (await store.listEvents(id)).sort((a, b) =>
      b.receiptAt.localeCompare(a.receiptAt) || a.id.localeCompare(b.id),
    )
    return VulnerabilityDetailResponseSchema.parse({
      vulnerability: projectVulnerability(vulnerability),
      identities: await identitiesFor(store, id),
      events: events.map((event) => projectEvent(event, vulnerability)),
      contexts: [],
    } satisfies VulnerabilityDetailResponse)
  })
}

interface ReviewDependencies { now(): string; newId(): string }
const defaults: ReviewDependencies = { now: () => new Date().toISOString(), newId: randomUUID }

function parsePatch(input: unknown): SharedPatchRequest {
  const parsed = SharedPatchRequestSchema.safeParse(input)
  if (!parsed.success) {
    throw new ReviewError(400, {
      code: 'INVALID_REQUEST', message: 'Żądanie zawiera niepoprawne dane.', retryable: false,
      fieldErrors: parsed.error.issues.map((issue) => ({
        path: issue.path.reduce<string>((path, part) => typeof part === 'number'
          ? `${path}[${part}]` : `${path ? `${path}.` : ''}${String(part)}`, '') || '$',
        code: issue.code, message: 'Sprawdź wartość pola i wymagany format.',
      })),
    })
  }
  return parsed.data
}

function stale(currentRevision?: number): ReviewError {
  return new ReviewError(409, {
    code: 'STALE_REVISION', message: 'Dane zostały zmienione. Odczytaj bieżącą wersję przed ponownym zapisem.',
    fieldErrors: [], retryable: false,
    ...(currentRevision === undefined ? {} : { currentRevision }),
  })
}

function identityConflict(): ReviewError {
  return new ReviewError(409, {
    code: 'IDENTITY_CONFLICT', message: 'Identyfikator należy już do innej podatności.',
    fieldErrors: [], retryable: false,
  })
}

function invalidTransition(noteRequired: boolean): ReviewError {
  return new ReviewError(409, {
    code: 'INVALID_STATUS_TRANSITION', retryable: false,
    message: noteRequired ? 'Zamknięcie wymaga niepustej notatki.' : 'Wybrany status jest niezgodny z brakami danych.',
    fieldErrors: [{
      path: noteRequired ? 'closureNote' : 'status', code: 'invalid_transition',
      message: noteRequired ? 'Uzupełnij notatkę zamknięcia.' : 'Uzupełnij dane lub wybierz dozwolony status.',
    }],
  })
}

function mergedChanges(current: VulnerabilityRecord, request: SharedPatchRequest): VulnerabilityChanges {
  const changes: VulnerabilityChanges = {}
  const factKeys = new Set(Object.keys(SharedFactsSchema.shape))
  for (const [key, value] of Object.entries(request)) {
    if (factKeys.has(key) && value !== undefined) Object.assign(changes, { [key]: value })
  }
  if (request.tags !== undefined) changes.tags = request.tags ?? []
  if (request.gapResolutions !== undefined) changes.gapResolutions = request.gapResolutions ?? []
  if (request.closureNote !== undefined) changes.closureNote = request.closureNote

  const merged = { ...current, ...changes }
  const gaps = sharedGaps(merged, merged.gapResolutions)
  const decision = decideStatusChange({
    current: current.status, gaps, closureNote: merged.closureNote,
    ...(request.status === undefined ? {} : { requested: request.status }),
  })
  if (!decision.ok) throw invalidTransition(decision.reason === 'closure_note_required')
  if (decision.status === 'closed' && !merged.closureNote?.trim()) throw invalidTransition(true)
  changes.status = decision.status
  return changes
}

function meaningfulChanges(current: VulnerabilityRecord, changes: VulnerabilityChanges): boolean {
  const previous: Record<string, unknown> = { ...current }
  return Object.entries(changes).some(([key, value]) => {
    if (key === 'tags' && changes.tags !== undefined) {
      return current.tags.length !== changes.tags.length
        || changes.tags.some((tag) => !current.tags.includes(tag))
    }
    return JSON.stringify(previous[key]) !== JSON.stringify(value)
  })
}

class IdentityInsertConstraint extends Error {
  constructor(readonly original: PersistenceConstraintError, readonly identity: Identity) {
    super('Shared identity insert constraint.')
  }
}

async function executePatch(
  store: FindingsStore, id: string, request: SharedPatchRequest, dependencies: ReviewDependencies,
): Promise<SharedPatchResponse> {
  const current = await requireVulnerability(store, id)
  if (current.revision !== request.expectedRevision) throw stale(current.revision)

  const aliases = [...new Map((request.addIdentities ?? []).map((identity) => [identityKey(identity), identity])).values()]
  const owners = await store.findIdentities(aliases)
  if (owners.some((owner) => owner.vulnerabilityId !== id)) throw identityConflict()
  const ownedKeys = new Set(owners.map(({ scheme, value }) => identityKey({ scheme, value })))
  const additions = aliases.filter((identity) => !ownedKeys.has(identityKey(identity)))
  const changes = mergedChanges(current, request)

  let vulnerability = current
  if (additions.length > 0 || meaningfulChanges(current, changes)) {
    const updated = await store.updateVulnerability(id, request.expectedRevision, changes, dependencies.now())
    if (!updated) throw stale((await store.findVulnerabilityById(id))?.revision)
    vulnerability = updated
    for (const identity of additions) {
      try { await store.insertIdentity({ ...identity, vulnerabilityId: id, id: dependencies.newId() }) }
      catch (error) {
        if (error instanceof PersistenceConstraintError) throw new IdentityInsertConstraint(error, identity)
        throw error
      }
    }
  }
  return SharedPatchResponseSchema.parse({
    vulnerability: projectVulnerability(vulnerability), identities: await identitiesFor(store, id),
  } satisfies SharedPatchResponse)
}

export async function updateSharedVulnerability(
  unitOfWork: FindingsUnitOfWork, inputId: unknown, input: unknown,
  dependencies: ReviewDependencies = defaults,
): Promise<SharedPatchResponse> {
  const id = parseId(inputId)
  const request = parsePatch(input)
  try { return await unitOfWork.run((store) => executePatch(store, id, request, dependencies)) }
  catch (error) {
    if (!(error instanceof IdentityInsertConstraint)) throw error
    // The first transaction has rolled back. Only a proven competing alias owner
    // can classify this specific insert constraint as an identity conflict.
    const contested = await unitOfWork.run(async (store) => {
      const owners = await store.findIdentities([error.identity])
      return owners.some((owner) => owner.vulnerabilityId !== id
        && identityKey({ scheme: owner.scheme, value: owner.value }) === identityKey(error.identity))
    })
    if (contested) throw identityConflict()
    throw error.original
  }
}
