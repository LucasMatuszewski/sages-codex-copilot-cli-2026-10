import type { ApiError, FieldError, Identity, Instant } from '../../shared/common.js'
import { RegisterQueryResultSchema, RegisterQuerySchema, type RegisterQuery, type RegisterQueryResult, type RegisterRow } from '../../shared/register-contracts.js'
import { VulnerabilityReadSchema, type VulnerabilityRead } from '../../shared/review-contracts.js'
import type { DetectionEventRecord, FindingsStore, FindingsUnitOfWork, VulnerabilityRecord } from './ports/findings-store.js'
import { eventGaps, sharedGaps } from '../domain/gaps.js'
import { reconcileStatus } from '../domain/handling-status.js'

export class RegisterQueryError extends Error {
  constructor(readonly body: ApiError) {
    super(body.message)
    this.name = 'RegisterQueryError'
  }
}

function fieldPath(path: PropertyKey[]): string {
  return path.reduce<string>((result, part) => typeof part === 'number'
    ? `${result}[${part}]` : `${result ? `${result}.` : ''}${String(part)}`, '') || '$'
}

function parseQuery(input: unknown): RegisterQuery {
  const parsed = RegisterQuerySchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: FieldError[] = parsed.error.issues.map((issue) => ({
      path: fieldPath(issue.path), code: issue.code, message: 'Sprawdź wartość pola i wymagany format.',
    }))
    throw new RegisterQueryError({
      code: 'INVALID_REQUEST', message: 'Parametry wyszukiwania zawierają niepoprawne dane.', fieldErrors, retryable: false,
    })
  }
  return parsed.data
}

function normalized(value: string): string {
  return value.normalize('NFC').toLowerCase()
}

function contains(value: string | null | undefined, needle: string): boolean {
  return typeof value === 'string' && normalized(value).includes(needle)
}

function tagMatches(tags: readonly string[], tag: string): boolean {
  return tags.some((value) => normalized(value) === tag)
}

function projectVulnerability(record: VulnerabilityRecord): VulnerabilityRead {
  const gaps = sharedGaps(record, record.gapResolutions)
  return VulnerabilityReadSchema.parse({ ...record, gaps, status: reconcileStatus(record.status, gaps) })
}

function effectiveEventStatus(record: DetectionEventRecord, parent: VulnerabilityRecord): DetectionEventRecord['status'] {
  return reconcileStatus(record.status, eventGaps(record, parent, record.gapResolutions))
}

function identityOrder(left: Identity, right: Identity): number {
  return left.scheme < right.scheme ? -1 : left.scheme > right.scheme ? 1
    : left.value < right.value ? -1 : left.value > right.value ? 1 : 0
}

function receiptOrder(left: DetectionEventRecord, right: DetectionEventRecord): number {
  return right.receiptAt < left.receiptAt ? -1 : right.receiptAt > left.receiptAt ? 1
    : left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function textValues(events: readonly DetectionEventRecord[], field: 'product' | 'client'): string[] {
  const seen = new Set<string>()
  const values: string[] = []
  for (const event of [...events].sort(receiptOrder)) {
    const value = event[field]?.trim()
    if (!value) continue
    const key = normalized(value)
    if (seen.has(key)) continue
    seen.add(key)
    values.push(value)
  }
  return values.sort((left, right) => {
    const a = normalized(left), b = normalized(right)
    return a < b ? -1 : a > b ? 1 : left < right ? -1 : left > right ? 1 : 0
  })
}

function rowFor(
  vulnerability: VulnerabilityRecord,
  identities: Identity[],
  events: DetectionEventRecord[],
  matchingEvents: DetectionEventRecord[],
): RegisterRow {
  const latest = [...events].sort(receiptOrder)[0]
  return {
    vulnerability: projectVulnerability(vulnerability),
    identities: identities.sort(identityOrder),
    eventCount: events.length,
    matchingEventIds: [...matchingEvents].sort(receiptOrder).map(({ id }) => id),
    latestReceiptAt: latest?.receiptAt ?? null,
    products: textValues(events, 'product'),
    clients: textValues(events, 'client'),
  }
}

function matchesSharedQuery(record: VulnerabilityRecord, identities: readonly Identity[], q: string): boolean {
  return contains(record.id, q)
    || identities.some(({ value }) => contains(value, q))
    || contains(record.title, q)
    || contains(record.componentName, q)
    || record.tags.some((tag) => contains(tag, q))
}

function matchesEventQuery(event: DetectionEventRecord, q: string): boolean {
  return contains(event.product, q) || contains(event.client, q) || event.tags.some((tag) => contains(tag, q))
}

function hasEventFilters(query: RegisterQuery): boolean {
  return query.product !== undefined || query.client !== undefined || query.eventStatus !== undefined
    || query.detectedFrom !== undefined || query.detectedTo !== undefined
}

function eventMatchesExplicitFilters(
  event: DetectionEventRecord,
  effectiveStatus: DetectionEventRecord['status'],
  query: RegisterQuery,
): boolean {
  if (query.product !== undefined && !contains(event.product, normalized(query.product))) return false
  if (query.client !== undefined && !contains(event.client, normalized(query.client))) return false
  if (query.eventStatus !== undefined && effectiveStatus !== query.eventStatus) return false
  if (query.detectedFrom !== undefined || query.detectedTo !== undefined) {
    if (event.detectedAt === null) return false
    if (query.detectedFrom !== undefined && event.detectedAt < query.detectedFrom) return false
    if (query.detectedTo !== undefined && event.detectedAt > query.detectedTo) return false
  }
  return true
}

function matchesRow(
  record: VulnerabilityRecord,
  identities: Identity[],
  events: DetectionEventRecord[],
  query: RegisterQuery,
): RegisterRow | undefined {
  const shared = projectVulnerability(record)
  if (query.status !== undefined && shared.status !== query.status) return undefined
  if (query.severity !== undefined && record.severity !== query.severity) return undefined
  if (query.category !== undefined && record.category !== query.category) return undefined

  const q = query.q === undefined ? undefined : normalized(query.q)
  const tag = query.tag === undefined ? undefined : normalized(query.tag)
  const sharedQmatch = q === undefined || matchesSharedQuery(record, identities, q)
  const sharedTagmatch = tag === undefined || tagMatches(record.tags, tag)
  const needsEventMatch = hasEventFilters(query)
    || (q !== undefined && !sharedQmatch)
    || (tag !== undefined && !sharedTagmatch)

  const matchingEvents = events.filter((event) => {
    const status = effectiveEventStatus(event, record)
    if (!eventMatchesExplicitFilters(event, status, query)) return false
    if (q !== undefined && !sharedQmatch && !matchesEventQuery(event, q)) return false
    if (tag !== undefined && !sharedTagmatch && !tagMatches(event.tags, tag)) return false
    return true
  })

  if (needsEventMatch && matchingEvents.length === 0) return undefined
  return rowFor(record, identities, events, matchingEvents)
}

export async function queryRegister(unitOfWork: FindingsUnitOfWork, input: unknown): Promise<RegisterQueryResult> {
  const query = parseQuery(input)
  return unitOfWork.run(async (store: FindingsStore) => {
    const vulnerabilities = await store.listVulnerabilities()
    const events = await store.listEvents()
    const identityEntries = await Promise.all(vulnerabilities.map(async (vulnerability) => {
      const identities = (await store.listIdentities(vulnerability.id)).map(({ scheme, value }) => ({ scheme, value }))
      return [vulnerability.id, identities] as const
    }))
    const identitiesByParent = new Map(identityEntries)
    const eventsByParent = new Map<string, DetectionEventRecord[]>()
    for (const event of events) {
      const linked = eventsByParent.get(event.vulnerabilityId) ?? []
      linked.push(event)
      eventsByParent.set(event.vulnerabilityId, linked)
    }

    const rows = vulnerabilities.flatMap((vulnerability) => {
      const linkedEvents = eventsByParent.get(vulnerability.id) ?? []
      const row = matchesRow(vulnerability, identitiesByParent.get(vulnerability.id) ?? [], linkedEvents, query)
      return row === undefined ? [] : [row]
    }).sort((left, right) => {
      const a: Instant | null = left.latestReceiptAt
      const b: Instant | null = right.latestReceiptAt
      if (a === null && b !== null) return 1
      if (a !== null && b === null) return -1
      if (a !== null && b !== null && a !== b) return a > b ? -1 : 1
      return left.vulnerability.id < right.vulnerability.id ? -1 : left.vulnerability.id > right.vulnerability.id ? 1 : 0
    })
    return RegisterQueryResultSchema.parse({
      rows,
      counts: {
        vulnerabilityCount: rows.length,
        matchingEventCount: rows.reduce((count, row) => count + row.matchingEventIds.length, 0),
      },
    })
  })
}
