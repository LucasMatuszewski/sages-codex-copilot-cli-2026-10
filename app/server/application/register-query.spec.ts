import { describe, expect, it, vi } from 'vitest'
import type { FindingsStore, FindingsUnitOfWork, DetectionEventRecord, VulnerabilityRecord } from './ports/findings-store.js'
import { PersistenceUnavailableError } from './ports/findings-store.js'
import { queryRegister } from './register-query.js'

const at = '2026-10-22T12:00:00.000Z'
const vulnerabilityId = '10000000-0000-4000-8000-000000000001'
const eventIds = [
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000004',
]

function vulnerability(overrides: Partial<VulnerabilityRecord> = {}): VulnerabilityRecord {
  return {
    id: vulnerabilityId, title: 'Synthetic issue', description: 'Synthetic description', componentName: 'lib-x',
    ecosystem: null, vendor: null, affectedComponentVersions: null, generalExploit: null, exploitPrerequisites: null,
    remediationGuidance: null, fixedComponentVersions: null, category: 'application', weaknessCode: null,
    severity: 'high', severityRationale: 'Synthetic assessment', score: null, scoreSystem: null, scoreVersion: null,
    scoreSource: null, exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null, references: null,
    tags: [], status: 'review', closureNote: null, gapResolutions: [], createdAt: at, updatedAt: at, revision: 1,
    ...overrides,
  }
}

function event(id: string, overrides: Partial<DetectionEventRecord> = {}): DetectionEventRecord {
  const observation = {
    detectedAt: at, product: 'Atlas', productVersion: '1.0', client: 'Cedar', environment: null,
    installedComponentVersion: '2.0', componentLocation: null, evidence: null, reviewNotes: null,
    scannerAssessment: null, productAffected: null, exploitabilityNotes: null, impactDescription: null,
  }
  return {
    id, vulnerabilityId, source: 'synthetic', sourceEventId: id, receiptAt: at, ...observation,
    status: 'review', closureNote: null, tags: [], gapResolutions: [], reportingEvidence: null,
    incomingSharedSnapshot: { title: 'incoming' },
    originalIntakeSnapshot: { source: 'synthetic', sourceEventId: id, vulnerability: { id: vulnerabilityId } },
    requestFingerprint: 'private-fingerprint', createdAt: at, updatedAt: at, revision: 1, ...overrides,
  }
}

function fixture(parent = vulnerability(), events: DetectionEventRecord[] = []) {
  const store = {
    findVulnerabilityById: vi.fn<FindingsStore['findVulnerabilityById']>(async () => parent),
    listVulnerabilities: vi.fn<FindingsStore['listVulnerabilities']>(async () => [parent]),
    insertVulnerability: vi.fn<FindingsStore['insertVulnerability']>(async () => { throw new Error('GET attempted a write') }),
    updateVulnerability: vi.fn<FindingsStore['updateVulnerability']>(async () => { throw new Error('GET attempted a write') }),
    findIdentities: vi.fn<FindingsStore['findIdentities']>(async () => []),
    listIdentities: vi.fn<FindingsStore['listIdentities']>(async () => [{ id: 'identity-row', vulnerabilityId, scheme: 'cve', value: 'CVE-2026-1000' }]),
    insertIdentity: vi.fn<FindingsStore['insertIdentity']>(async () => { throw new Error('GET attempted a write') }),
    findEventById: vi.fn<FindingsStore['findEventById']>(async () => null),
    findEventBySourceKey: vi.fn<FindingsStore['findEventBySourceKey']>(async () => null),
    listEvents: vi.fn<FindingsStore['listEvents']>(async () => events),
    insertEvent: vi.fn<FindingsStore['insertEvent']>(async () => { throw new Error('GET attempted a write') }),
    updateEvent: vi.fn<FindingsStore['updateEvent']>(async () => { throw new Error('GET attempted a write') }),
  }
  const run = vi.fn()
  const unit: FindingsUnitOfWork = {
    async run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T> { run(); return work(store) },
    close: async () => undefined,
  }
  return { unit, store, run, parent, events }
}

describe('portable register query application service', () => {
  it('returns an empty result for an empty database and includes eventless parents without event constraints', async () => {
    const empty = fixture()
    empty.store.listVulnerabilities.mockResolvedValue([])
    expect(await queryRegister(empty.unit, {})).toEqual({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })

    const noEvents = fixture()
    const result = await queryRegister(noEvents.unit, {})
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({ eventCount: 0, matchingEventIds: [], latestReceiptAt: null, products: [], clients: [] })
    expect(result.counts).toEqual({ vulnerabilityCount: 1, matchingEventCount: 0 })
  })

  it('requires every event-only predicate to match the same linked event', async () => {
    const events = [
      event(eventIds[0]!, { product: 'Atlas', client: 'Cedar', detectedAt: '2026-10-20T12:00:00.000Z', tags: ['osint'] }),
      event(eventIds[1]!, { product: 'Beacon', client: 'Delta', detectedAt: '2026-10-22T12:00:00.000Z' }),
    ]
    const data = fixture(vulnerability(), events)
    expect((await queryRegister(data.unit, { product: 'Atlas', client: 'Delta' })).rows).toEqual([])
    expect((await queryRegister(data.unit, { product: 'Atlas', detectedFrom: '2026-10-22T00:00:00Z' })).rows).toEqual([])
    expect((await queryRegister(data.unit, { q: 'Atlas', client: 'Delta' })).rows).toEqual([])
    expect((await queryRegister(data.unit, { tag: 'osint', client: 'Delta' })).rows).toEqual([])

    events.push(event(eventIds[2]!, { product: 'Atlas', client: 'Delta', detectedAt: '2026-10-22T12:00:00.000Z', tags: ['osint'], receiptAt: '2026-10-23T12:00:00.000Z' }))
    const matched = await queryRegister(data.unit, { product: 'Atlas', client: 'Delta' })
    expect(matched.rows).toHaveLength(1)
    expect(matched.rows[0]).toMatchObject({ eventCount: 3, matchingEventIds: [eventIds[2]], latestReceiptAt: '2026-10-23T12:00:00.000Z' })
    expect(matched.counts).toEqual({ vulnerabilityCount: 1, matchingEventCount: 1 })
  })

  it('normalizes Unicode text searches and searches reviewed shared/event fields only', async () => {
    const events = [event(eventIds[0]!, { product: 'Café Atlas', tags: ['Incident'] })]
    const parent = vulnerability({ title: 'Café vulnerability', tags: ['Curated'] })
    const data = fixture(parent, events)
    expect((await queryRegister(data.unit, { q: '  Cafe\u0301 VULNERABILITY ' })).rows).toHaveLength(1)
    expect((await queryRegister(data.unit, { q: 'Cafe\u0301' })).rows).toHaveLength(1)
    expect((await queryRegister(data.unit, { tag: ' curated ' })).rows).toHaveLength(1)
    expect((await queryRegister(data.unit, { tag: 'incident' })).rows[0]?.matchingEventIds).toEqual([eventIds[0]])

    const privateOnly = fixture(vulnerability({ title: null, description: 'private search term' }), [event(eventIds[0]!, {
      product: null, reportingEvidence: { product: 'private search term' },
      originalIntakeSnapshot: { source: 'synthetic', sourceEventId: 'private', vulnerability: { id: vulnerabilityId, title: 'private search term' } },
      incomingSharedSnapshot: { title: 'private search term' },
    })])
    expect((await queryRegister(privateOnly.unit, { q: 'private search term' })).rows).toEqual([])
  })

  it('searches each approved shared and current-event text field and exact normalized tags', async () => {
    const data = fixture(vulnerability({ tags: ['Shared Label'] }), [event(eventIds[0]!, { tags: ['Event Label'] })])
    for (const q of ['CVE-2026-1000', vulnerabilityId, 'lib-x', 'Cedar', 'Atlas', 'event label', 'Shared Label']) {
      expect((await queryRegister(data.unit, { q })).rows).toHaveLength(1)
    }
    expect((await queryRegister(data.unit, { tag: 'shared label' })).rows).toHaveLength(1)
    expect((await queryRegister(data.unit, { tag: 'event label' })).rows).toHaveLength(1)
    expect((await queryRegister(data.unit, { q: 'incoming' })).rows).toEqual([])
  })

  it('uses inclusive detection bounds and excludes null detection times only when bounded', async () => {
    const events = [
      event(eventIds[0]!, { detectedAt: '2026-10-22T00:00:00.000Z', receiptAt: '2026-10-23T00:00:00Z' }),
      event(eventIds[1]!, { detectedAt: '2026-10-23T00:00:00.000Z', receiptAt: '2026-10-24T00:00:00Z' }),
      event(eventIds[2]!, { detectedAt: '2026-10-23T00:00:00.001Z', receiptAt: '2026-10-25T00:00:00Z' }),
      event(eventIds[3]!, { detectedAt: null, receiptAt: '2026-10-26T00:00:00Z' }),
    ]
    const data = fixture(vulnerability(), events)
    const bounded = await queryRegister(data.unit, { detectedFrom: '2026-10-22T01:00:00+01:00', detectedTo: '2026-10-23T00:00:00Z' })
    expect(bounded.rows[0]?.matchingEventIds).toEqual([eventIds[1], eventIds[0]])
    expect(bounded.rows[0]?.eventCount).toBe(4)
    expect((await queryRegister(data.unit, { detectedFrom: '2026-10-22T00:00:00.001Z' })).rows[0]?.matchingEventIds).toEqual([eventIds[2], eventIds[1]])
    expect((await queryRegister(data.unit, { detectedTo: '2026-10-23T00:00:00Z' })).rows[0]?.matchingEventIds).toEqual([eventIds[1], eventIds[0]])
    expect((await queryRegister(data.unit, {})).rows[0]?.matchingEventIds).toHaveLength(4)
  })

  it('sorts rows and matching event IDs deterministically and emits actual normalized distinct-unit values', async () => {
    const events = [
      event(eventIds[0]!, { product: ' Atlas ', client: 'Cedar', receiptAt: '2026-10-22T12:00:00.000Z' }),
      event(eventIds[1]!, { product: 'ATLAS', client: ' Cedar ', receiptAt: '2026-10-22T12:00:00.000Z' }),
      event(eventIds[2]!, { product: 'Beacon', client: 'Delta', receiptAt: '2026-10-23T12:00:00.000Z' }),
    ]
    const data = fixture(vulnerability(), events)
    const result = await queryRegister(data.unit, {})
    expect(result.rows[0]).toMatchObject({
      matchingEventIds: [eventIds[2], eventIds[0], eventIds[1]],
      products: ['Atlas', 'Beacon'], clients: ['Cedar', 'Delta'],
      latestReceiptAt: '2026-10-23T12:00:00.000Z',
    })
  })

  it('filters on effective shared and event statuses without mutating persisted statuses or writing', async () => {
    const parent = vulnerability({ title: 'Ready', status: 'missing_data' })
    const detected = event(eventIds[0]!, { status: 'missing_data' })
    const data = fixture(parent, [detected])
    const result = await queryRegister(data.unit, { status: 'review', eventStatus: 'review' })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.vulnerability.status).toBe('review')
    expect(parent.status).toBe('missing_data')
    expect(detected.status).toBe('missing_data')
    for (const method of ['insertVulnerability', 'updateVulnerability', 'insertIdentity', 'insertEvent', 'updateEvent'] as const) {
      expect(data.store[method]).not.toHaveBeenCalled()
    }
    expect(data.run).toHaveBeenCalledTimes(1)
  })

  it('combines exact shared controlled filters and keeps explicit unknown values distinct from null', async () => {
    const parent = vulnerability({ tags: ['Curated'], severity: 'unknown', category: 'unknown' })
    const data = fixture(parent, [event(eventIds[0]!, { tags: ['Incident'] })])
    expect((await queryRegister(data.unit, { severity: 'unknown', category: 'unknown', tag: 'curated' })).rows).toHaveLength(1)
    for (const query of [
      { severity: 'high' }, { category: 'application' }, { tag: 'missing' },
    ]) expect((await queryRegister(data.unit, query)).rows).toEqual([])
    expect((await queryRegister(data.unit, { severity: 'unknown', category: 'unknown', tag: 'incident' })).rows).toHaveLength(1)

    const nullFacts = fixture(vulnerability({ severity: null, category: null }))
    expect((await queryRegister(nullFacts.unit, { severity: 'unknown' })).rows).toEqual([])
    expect((await queryRegister(nullFacts.unit, { category: 'unknown' })).rows).toEqual([])
  })

  it('sorts multiple parents by latest receipt across all events, ties by UUID and counts distinct matching events', async () => {
    const idLow = '10000000-0000-4000-8000-000000000001'
    const idHigh = '10000000-0000-4000-8000-000000000002'
    const first = vulnerability({ id: idHigh })
    const second = vulnerability({ id: idLow })
    const events = [
      event(eventIds[0]!, { vulnerabilityId: idHigh, product: 'Atlas', receiptAt: '2026-10-23T12:00:00.000Z' }),
      event(eventIds[1]!, { vulnerabilityId: idHigh, product: 'Beacon', receiptAt: '2026-10-24T12:00:00.000Z' }),
      event(eventIds[2]!, { vulnerabilityId: idLow, product: 'Atlas', receiptAt: '2026-10-24T12:00:00.000Z' }),
      event(eventIds[3]!, { vulnerabilityId: idLow, product: 'Atlas', receiptAt: '2026-10-24T12:00:00.000Z' }),
    ]
    const data = fixture(first, events)
    data.store.listVulnerabilities.mockResolvedValue([first, second])
    data.store.listIdentities.mockImplementation(async (id) => [{ id: `identity-${id}`, vulnerabilityId: id, scheme: 'manual', value: `fixture-${id}` }])
    const result = await queryRegister(data.unit, { product: 'Atlas' })
    expect(result.rows.map(({ vulnerability: item }) => item.id)).toEqual([idLow, idHigh])
    expect(result.rows.map(({ matchingEventIds }) => matchingEventIds)).toEqual([[eventIds[2], eventIds[3]], [eventIds[0]]])
    expect(result.rows.map(({ eventCount }) => eventCount)).toEqual([2, 2])
    expect(result.counts).toEqual({ vulnerabilityCount: 2, matchingEventCount: 3 })
  })

  it('propagates storage unavailability from its single read-only transaction', async () => {
    const unavailable = new PersistenceUnavailableError()
    const unit: FindingsUnitOfWork = { run: async () => { throw unavailable }, close: async () => undefined }
    await expect(queryRegister(unit, {})).rejects.toBe(unavailable)
  })
})
