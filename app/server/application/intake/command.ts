import { randomUUID } from 'node:crypto'
import type { Identity } from '../../../shared/common.js'
import { FindingCreateRequestSchema, ObservationSchema, SharedFactsSchema, type FindingCreateRequest, type FindingCreateResponse, type SharedFacts } from '../../../shared/finding-contracts.js'
import type { DetectionEventRecord, FindingsStore, FindingsUnitOfWork, PersistedObservation, PersistedSharedFacts, VulnerabilityChanges, VulnerabilityRecord } from '../ports/findings-store.js'
import { PersistenceConstraintError, PersistenceUnavailableError } from '../ports/findings-store.js'
import { fingerprintFinding } from '../../domain/fingerprint.js'
import { eventGaps, sharedGaps } from '../../domain/gaps.js'
import { initialStatus, reconcileStatus, statusAfterNewEvent } from '../../domain/handling-status.js'
import { identityKey, resolveIdentitySet } from '../../domain/identity.js'
import { IntakeError } from './errors.js'

export interface IntakeDependencies {
  now(): string
  newId(): string
}

const defaults: IntakeDependencies = { now: () => new Date().toISOString(), newId: randomUUID }

class StaleSharedWrite extends Error {}

type CollisionCandidate = { kind: 'event' } | { kind: 'identity'; identity: Identity }

// Only failures at these unique-key insert sites are eligible for a race check.
// The check runs after the enclosing transaction has rolled back.
class InsertConstraint extends Error {
  constructor(readonly original: PersistenceConstraintError, readonly candidate: CollisionCandidate) {
    super('Intake insert constraint.')
  }
}

function failure(status: 404 | 409, code: string, message: string): IntakeError {
  return new IntakeError(status, { code, message, fieldErrors: [], retryable: false })
}

function parseRequest(input: unknown): FindingCreateRequest {
  const parsed = FindingCreateRequestSchema.safeParse(input)
  if (!parsed.success) {
    throw new IntakeError(400, {
      code: 'INVALID_REQUEST', message: 'Żądanie zawiera niepoprawne dane.', retryable: false,
      fieldErrors: parsed.error.issues.map((issue) => ({
        path: issue.path.reduce<string>((path, part) => typeof part === 'number' ? `${path}[${part}]` : `${path ? `${path}.` : ''}${String(part)}`, '') || '$',
        code: issue.code, message: 'Sprawdź wartość pola i wymagany format.',
      })),
    })
  }
  return parsed.data
}

function response(vulnerability: VulnerabilityRecord, event: DetectionEventRecord, vulnerabilityOutcome: 'created' | 'reused', eventOutcome: 'created' | 'replayed'): FindingCreateResponse {
  const vulnerabilityGaps = sharedGaps(vulnerability, vulnerability.gapResolutions)
  const observationGaps = eventGaps(event, vulnerability, event.gapResolutions)
  return {
    vulnerabilityId: vulnerability.id, eventId: event.id, vulnerabilityOutcome, eventOutcome,
    vulnerabilityRevision: vulnerability.revision, eventRevision: event.revision,
    vulnerabilityStatus: reconcileStatus(vulnerability.status, vulnerabilityGaps),
    eventStatus: reconcileStatus(event.status, observationGaps),
    vulnerabilityGaps, eventGaps: observationGaps,
  }
}

function unknownValue(key: keyof SharedFacts, value: unknown): boolean {
  return value === null || value === undefined
    || (typeof value === 'string' && value.trim().length === 0)
    || (Array.isArray(value) && value.length === 0)
    || (['category', 'severity', 'exploitationSignal'].includes(key) && value === 'unknown')
}

function enrichment(current: VulnerabilityRecord, incoming: SharedFacts): VulnerabilityChanges {
  const changes: VulnerabilityChanges = {}
  for (const key of Object.keys(SharedFactsSchema.shape) as (keyof SharedFacts)[]) {
    if (unknownValue(key, current[key]) && !unknownValue(key, incoming[key])) {
      Object.assign(changes, { [key]: incoming[key] })
    }
  }
  return changes
}

async function insertWithRaceCheck(work: () => Promise<void>, candidate: CollisionCandidate): Promise<void> {
  try { await work() }
  catch (error) {
    if (error instanceof PersistenceConstraintError) throw new InsertConstraint(error, candidate)
    throw error
  }
}

async function execute(store: FindingsStore, request: FindingCreateRequest, dependencies: IntakeDependencies): Promise<FindingCreateResponse> {
  const existing = await store.findEventBySourceKey(request.source, request.sourceEventId)
  if (existing) {
    if (fingerprintFinding(request, existing.vulnerabilityId) !== existing.requestFingerprint) {
      throw failure(409, 'SOURCE_EVENT_CONFLICT', 'Ten identyfikator zdarzenia został już użyty z innymi danymi.')
    }
    const vulnerability = await store.findVulnerabilityById(existing.vulnerabilityId)
    if (!vulnerability) throw new PersistenceUnavailableError()
    return response(vulnerability, existing, 'reused', 'replayed')
  }

  const { id: selectedId, identities: declared = [], ...facts } = request.vulnerability
  const identities = [...new Map(declared.map((identity) => [identityKey(identity), identity])).values()]
  const owners = await store.findIdentities(identities)
  let vulnerability: VulnerabilityRecord | null
  if (selectedId !== undefined) {
    vulnerability = await store.findVulnerabilityById(selectedId)
    if (!vulnerability) throw failure(404, 'VULNERABILITY_NOT_FOUND', 'Nie znaleziono wskazanej podatności.')
  } else {
    const resolution = resolveIdentitySet(identities, owners.map((owner) => ({ identity: { scheme: owner.scheme, value: owner.value }, vulnerabilityId: owner.vulnerabilityId })))
    if (resolution.kind === 'conflict') throw failure(409, 'IDENTITY_CONFLICT', 'Podane identyfikatory należą do różnych podatności.')
    vulnerability = resolution.kind === 'reuse' ? await store.findVulnerabilityById(resolution.vulnerabilityId) : null
    if (resolution.kind === 'reuse' && !vulnerability) throw new PersistenceUnavailableError()
  }

  const at = dependencies.now()
  const created = vulnerability === null
  if (!vulnerability) {
    // The schema owns the complete field vocabulary. Omitted descriptive facts
    // become null; only tags have an empty-array persistence default.
    const persistedFacts = Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, facts[key as keyof SharedFacts] ?? null])) as PersistedSharedFacts
    persistedFacts.tags = facts.tags ?? []
    vulnerability = {
      ...persistedFacts, id: dependencies.newId(), status: initialStatus(sharedGaps(facts)),
      closureNote: null, gapResolutions: [], createdAt: at, updatedAt: at, revision: 1,
    }
    await store.insertVulnerability(vulnerability)
  }

  const ownedKeys = new Set(owners.map((owner) => identityKey({ scheme: owner.scheme, value: owner.value })))
  const addedAliases = identities.filter((identity) => !ownedKeys.has(identityKey(identity)))
  for (const identity of addedAliases) {
    const record = { ...identity, id: dependencies.newId(), vulnerabilityId: vulnerability.id }
    await insertWithRaceCheck(() => store.insertIdentity(record), { kind: 'identity', identity })
  }

  if (!created) {
    const changes = enrichment(vulnerability, facts)
    const nextStatus = statusAfterNewEvent(vulnerability.status, sharedGaps({ ...vulnerability, ...changes }, vulnerability.gapResolutions), 'created')
    if (nextStatus !== vulnerability.status) changes.status = nextStatus
    if (Object.keys(changes).length > 0 || addedAliases.length > 0) {
      const updated = await store.updateVulnerability(vulnerability.id, vulnerability.revision, changes, at)
      if (!updated) throw new StaleSharedWrite()
      vulnerability = updated
    }
  }

  const observation = request.observation ?? {}
  const persistedObservation = Object.fromEntries(Object.keys(ObservationSchema.shape).map((key) => [key, observation[key as keyof typeof observation] ?? null])) as PersistedObservation
  const event: DetectionEventRecord = {
    ...persistedObservation, id: dependencies.newId(), vulnerabilityId: vulnerability.id,
    source: request.source, sourceEventId: request.sourceEventId, receiptAt: at,
    status: initialStatus(eventGaps(observation, vulnerability)), closureNote: null, tags: [], gapResolutions: [],
    reportingEvidence: request.reportingEvidence ?? null, incomingSharedSnapshot: facts, originalIntakeSnapshot: request,
    requestFingerprint: fingerprintFinding(request, vulnerability.id), createdAt: at, updatedAt: at, revision: 1,
  }
  await insertWithRaceCheck(() => store.insertEvent(event), { kind: 'event' })
  return response(vulnerability, event, created ? 'created' : 'reused', 'created')
}

async function provenCollision(unitOfWork: FindingsUnitOfWork, request: FindingCreateRequest, candidate: CollisionCandidate): Promise<boolean> {
  return unitOfWork.run(async (store) => {
    if (await store.findEventBySourceKey(request.source, request.sourceEventId)) return true
    if (candidate.kind === 'identity') {
      const owners = await store.findIdentities(request.vulnerability.identities ?? [])
      return owners.some((owner) => identityKey({ scheme: owner.scheme, value: owner.value }) === identityKey(candidate.identity))
    }
    return false
  })
}

export async function intakeFinding(unitOfWork: FindingsUnitOfWork, input: unknown, dependencies: IntakeDependencies = defaults): Promise<FindingCreateResponse> {
  const request = parseRequest(input)
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await unitOfWork.run((store) => execute(store, request, dependencies)) }
    catch (error) {
      if (error instanceof StaleSharedWrite) {
        if (attempt === 0) continue
        throw new PersistenceUnavailableError()
      }
      if (error instanceof InsertConstraint) {
        if (!await provenCollision(unitOfWork, request, error.candidate)) throw error.original
        if (attempt === 0) continue
        throw new PersistenceUnavailableError()
      }
      throw error
    }
  }
  throw new PersistenceUnavailableError()
}
