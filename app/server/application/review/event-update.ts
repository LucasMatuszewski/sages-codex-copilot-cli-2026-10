import { UUIDSchema } from '../../../shared/common.js'
import { ObservationSchema } from '../../../shared/finding-contracts.js'
import { EventPatchRequestSchema, EventPatchResponseSchema, type EventPatchRequest, type EventPatchResponse } from '../../../shared/event-review-contracts.js'
import type { DetectionEventRead } from '../../../shared/review-contracts.js'
import type { DetectionEventRecord, EventChanges, FindingsStore, FindingsUnitOfWork, VulnerabilityRecord } from '../ports/findings-store.js'
import { eventGaps } from '../../domain/gaps.js'
import { decideStatusChange, reconcileStatus } from '../../domain/handling-status.js'
import { ReviewError } from './errors.js'

interface EventUpdateDependencies { now(): string }
const defaults: EventUpdateDependencies = { now: () => new Date().toISOString() }

function parseId(input: unknown): string {
  const parsed = UUIDSchema.safeParse(input)
  if (!parsed.success) {
    throw new ReviewError(400, {
      code: 'INVALID_REQUEST', message: 'Niepoprawny identyfikator zdarzenia.', retryable: false,
      fieldErrors: [{ path: 'id', code: 'invalid_format', message: 'Podaj poprawny identyfikator UUID.' }],
    })
  }
  return parsed.data
}

function parsePatch(input: unknown): EventPatchRequest {
  const parsed = EventPatchRequestSchema.safeParse(input)
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

function eventNotFound(): ReviewError {
  return new ReviewError(404, {
    code: 'EVENT_NOT_FOUND', message: 'Nie znaleziono wskazanego zdarzenia.', fieldErrors: [], retryable: false,
  })
}

function stale(currentRevision?: number): ReviewError {
  return new ReviewError(409, {
    code: 'STALE_REVISION', message: 'Dane zostały zmienione. Odczytaj bieżącą wersję przed ponownym zapisem.',
    fieldErrors: [], retryable: false,
    ...(currentRevision === undefined ? {} : { currentRevision }),
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

function projectEvent(record: DetectionEventRecord, parent: VulnerabilityRecord): DetectionEventRead {
  const { requestFingerprint: _privateFingerprint, ...publicFields } = record
  const gaps = eventGaps(record, { category: parent.category, componentName: parent.componentName }, record.gapResolutions)
  return { ...publicFields, gaps, status: reconcileStatus(record.status, gaps) }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalized(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => normalized(item))
    return key === 'tags' || key === 'memberStates'
      ? items.sort((left, right) => compareStrings(JSON.stringify(left), JSON.stringify(right)))
      : items
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => compareStrings(left, right))
      .map(([property, member]) => [property, normalized(member, property)]))
  }
  return value
}

function equalValue(left: unknown, right: unknown, key?: string): boolean {
  return JSON.stringify(normalized(left, key)) === JSON.stringify(normalized(right, key))
}

function mergedChanges(current: DetectionEventRecord, request: EventPatchRequest, parent: VulnerabilityRecord): EventChanges {
  const changes: EventChanges = {}
  for (const key of Object.keys(ObservationSchema.shape) as (keyof typeof ObservationSchema.shape)[]) {
    if (key === 'scannerAssessment') continue
    const value = request[key]
    if (value === undefined) continue
    Object.assign(changes, { [key]: value })
  }
  if (request.scannerAssessment !== undefined) {
    changes.scannerAssessment = request.scannerAssessment === null
      ? null
      : { ...(current.scannerAssessment ?? {}), ...request.scannerAssessment }
  }
  if (request.reportingEvidence !== undefined) {
    changes.reportingEvidence = request.reportingEvidence === null
      ? null
      : { ...(current.reportingEvidence ?? {}), ...request.reportingEvidence }
  }
  if (request.tags !== undefined) changes.tags = request.tags ?? []
  if (request.gapResolutions !== undefined) changes.gapResolutions = request.gapResolutions ?? []
  if (request.closureNote !== undefined) changes.closureNote = request.closureNote

  const merged: DetectionEventRecord = { ...current, ...changes }
  const gaps = eventGaps(merged, { category: parent.category, componentName: parent.componentName }, merged.gapResolutions)
  const decision = decideStatusChange({
    current: current.status, gaps, closureNote: merged.closureNote,
    ...(request.status === undefined ? {} : { requested: request.status }),
  })
  if (!decision.ok) throw invalidTransition(decision.reason === 'closure_note_required')
  if (decision.status === 'closed' && !merged.closureNote?.trim()) throw invalidTransition(true)
  changes.status = decision.status
  return changes
}

function isMeaningful(current: DetectionEventRecord, changes: EventChanges): boolean {
  return Object.entries(changes).some(([key, value]) => !equalValue(current[key as keyof DetectionEventRecord], value, key))
}

async function applyPatch(
  store: FindingsStore, id: string, request: EventPatchRequest, dependencies: EventUpdateDependencies,
): Promise<EventPatchResponse> {
  const current = await store.findEventById(id)
  if (!current) throw eventNotFound()
  if (current.revision !== request.expectedRevision) throw stale(current.revision)
  const parent = await store.findVulnerabilityById(current.vulnerabilityId)
  if (!parent) throw eventNotFound()

  const changes = mergedChanges(current, request, parent)
  let event = current
  if (isMeaningful(current, changes)) {
    const updated = await store.updateEvent(id, request.expectedRevision, changes, dependencies.now())
    if (!updated) throw stale((await store.findEventById(id))?.revision)
    event = updated
  }
  return EventPatchResponseSchema.parse({ event: projectEvent(event, parent) } satisfies EventPatchResponse)
}

export async function updateDetectionEvent(
  unitOfWork: FindingsUnitOfWork, inputId: unknown, input: unknown,
  dependencies: EventUpdateDependencies = defaults,
): Promise<EventPatchResponse> {
  const id = parseId(inputId)
  const request = parsePatch(input)
  return unitOfWork.run((store) => applyPatch(store, id, request, dependencies))
}
