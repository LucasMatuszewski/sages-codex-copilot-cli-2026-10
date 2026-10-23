import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { DetectionEventRecord, FindingsStore, FindingsUnitOfWork, VulnerabilityRecord } from '../ports/findings-store.js'
import { PersistenceUnavailableError } from '../ports/findings-store.js'
import { updateDetectionEvent } from './event-update.js'

const id = '30000000-0000-4000-8000-000000000003'
const vulnerabilityId = '10000000-0000-4000-8000-000000000001'
const at = '2026-10-23T08:00:00.000Z'

function records() {
  const parent: VulnerabilityRecord = {
    id: vulnerabilityId, title: 'Curated title', description: null, componentName: 'Library', ecosystem: 'npm',
    vendor: null, affectedComponentVersions: '1.x', generalExploit: null, exploitPrerequisites: null,
    remediationGuidance: null, fixedComponentVersions: null, category: 'dependency', weaknessCode: null,
    severity: 'high', severityRationale: null, score: null, scoreSystem: null, scoreVersion: null,
    scoreSource: null, exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null, references: null,
    tags: ['shared'], status: 'review', closureNote: null, gapResolutions: [], createdAt: at, updatedAt: at, revision: 1,
  }
  const originalIntakeSnapshot: DetectionEventRecord['originalIntakeSnapshot'] = {
    source: 'scanner', sourceEventId: 'stable-source-event', vulnerability: { id: vulnerabilityId, title: 'Incoming candidate' },
    observation: { reviewNotes: 'Original observation' },
  }
  const event: DetectionEventRecord = {
    id, vulnerabilityId, source: 'scanner', sourceEventId: 'stable-source-event', receiptAt: at,
    detectedAt: null, product: null, productVersion: null, client: null, environment: null,
    installedComponentVersion: null, componentLocation: null, evidence: null, reviewNotes: null,
    scannerAssessment: { severity: 'high', score: 0 }, productAffected: null, exploitabilityNotes: null,
    impactDescription: null, status: 'missing_data', closureNote: null, tags: ['event'], gapResolutions: [],
    reportingEvidence: { manufacturer: 'Manufacturer', product: 'Product', awareness: { at, accuracy: 'exact', basis: 'Synthetic awareness' }, supportEnded: false, memberStates: ['DE', 'PL'] },
    incomingSharedSnapshot: { title: 'Incoming candidate', category: 'application' }, originalIntakeSnapshot,
    requestFingerprint: 'a'.repeat(64), createdAt: at, updatedAt: at, revision: 1,
  }
  return { parent, event }
}

function fixture(current = records().event, parent = records().parent) {
  const store = {
    findVulnerabilityById: vi.fn<FindingsStore['findVulnerabilityById']>(async () => parent),
    listVulnerabilities: vi.fn<FindingsStore['listVulnerabilities']>(async () => [parent]),
    insertVulnerability: vi.fn<FindingsStore['insertVulnerability']>(async () => undefined),
    updateVulnerability: vi.fn<FindingsStore['updateVulnerability']>(async () => null),
    findIdentities: vi.fn<FindingsStore['findIdentities']>(async () => []),
    listIdentities: vi.fn<FindingsStore['listIdentities']>(async () => []),
    insertIdentity: vi.fn<FindingsStore['insertIdentity']>(async () => undefined),
    findEventById: vi.fn<FindingsStore['findEventById']>(async () => current),
    findEventBySourceKey: vi.fn<FindingsStore['findEventBySourceKey']>(async () => null),
    listEvents: vi.fn<FindingsStore['listEvents']>(async () => [current]),
    insertEvent: vi.fn<FindingsStore['insertEvent']>(async () => undefined),
    updateEvent: vi.fn<FindingsStore['updateEvent']>(async (_eventId, _revision, changes, updatedAt) => ({ ...current, ...changes, updatedAt, revision: current.revision + 1 })),
  }
  const run = vi.fn()
  const unit: FindingsUnitOfWork = {
    async run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T> { run(); return work(store) },
    close: async () => undefined,
  }
  const now = vi.fn(() => '2026-10-23T09:00:00.000Z')
  return { store, unit, run, now }
}

describe('detection event review updates', () => {
  it('validates UUID and strict event fields before a transaction', async () => {
    const { unit, run, now } = fixture()
    await expect(updateDetectionEvent(unit, 'invalid', { expectedRevision: 1 }, { now })).rejects.toMatchObject({ status: 400, body: { code: 'INVALID_REQUEST' } })
    await expect(updateDetectionEvent(unit, id, { expectedRevision: 1, sourceEventId: 'retargeted' }, { now })).rejects.toMatchObject({ status: 400, body: { code: 'INVALID_REQUEST' } })
    expect(run).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it('checks stale revision before reads with side effects, clocks, or writes, including semantic no-ops', async () => {
    const { unit, store, now } = fixture({ ...records().event, revision: 2 })
    await expect(updateDetectionEvent(unit, id, { expectedRevision: 1, tags: ['event'] }, { now })).rejects.toMatchObject({
      status: 409, body: { code: 'STALE_REVISION', currentRevision: 2 },
    })
    expect(store.updateEvent).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it('merges partial nested evidence, preserves false and zero, and keeps all immutable evidence', async () => {
    const { event } = records()
    const immutablePublic = {
      id: event.id, vulnerabilityId: event.vulnerabilityId, source: event.source, sourceEventId: event.sourceEventId,
      receiptAt: event.receiptAt, incomingSharedSnapshot: event.incomingSharedSnapshot,
      originalIntakeSnapshot: event.originalIntakeSnapshot, createdAt: event.createdAt,
    }
    const { unit, store, now } = fixture(event)
    const result = await updateDetectionEvent(unit, id, {
      expectedRevision: 1, scannerAssessment: { severity: 'low' },
      reportingEvidence: { manufacturer: null, mitigationExpected: false },
      tags: ['new'],
    }, { now })
    expect(result.event).toMatchObject({
      scannerAssessment: { severity: 'low', score: 0 },
      reportingEvidence: { manufacturer: null, product: 'Product', supportEnded: false, mitigationExpected: false },
      tags: ['new'], revision: 2, updatedAt: '2026-10-23T09:00:00.000Z',
    })
    expect(Object.fromEntries(Object.keys(immutablePublic).map((key) => [key, result.event[key as keyof typeof result.event]]))).toEqual(immutablePublic)
    expect('requestFingerprint' in result.event).toBe(false)
    expect(store.updateVulnerability).not.toHaveBeenCalled()
    expect(store.updateEvent).toHaveBeenCalledTimes(1)
  })

  it('returns normalized set no-ops without a write or clock, while stale no-ops remain conflicts', async () => {
    const { event } = records()
    const { unit, store, now } = fixture({ ...event, tags: ['a', 'b'] })
    const result = await updateDetectionEvent(unit, id, { expectedRevision: 1, tags: [' b ', 'a', 'a'] }, { now })
    expect(result.event.revision).toBe(1)
    expect(store.updateEvent).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it('treats canonically equal Unicode tag sets as a no-op without locale collation', async () => {
    const { event } = records()
    const accents = ['é', 'e\u0301']
    const { unit, store, now } = fixture({ ...event, tags: accents })
    const result = await updateDetectionEvent(unit, id, { expectedRevision: 1, tags: [...accents].reverse() }, { now })
    expect(result.event.revision).toBe(1)
    expect(store.updateEvent).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it('treats reordered member-state sets and partial nested evidence as normalized no-ops', async () => {
    const { event } = records()
    const { unit, store, now } = fixture(event)
    const result = await updateDetectionEvent(unit, id, {
      expectedRevision: 1, reportingEvidence: { memberStates: ['pl', 'DE', 'PL'], manufacturer: ' Manufacturer ' },
      scannerAssessment: { score: 0, severity: 'high' },
    }, { now })
    expect(result.event.revision).toBe(1)
    expect(store.updateEvent).not.toHaveBeenCalled()
    expect(now).not.toHaveBeenCalled()
  })

  it('clears nullable scalar and nested groups and accepts only permitted event gap explanations', async () => {
    const { event } = records()
    const { unit, store, now } = fixture({ ...event, product: 'Existing product' })
    const result = await updateDetectionEvent(unit, id, {
      expectedRevision: 1, product: null, scannerAssessment: null, reportingEvidence: null,
      gapResolutions: [{ field: 'product', reason: 'Not supplied by the source' }],
    }, { now })
    expect(result.event).toMatchObject({ product: null, scannerAssessment: null, reportingEvidence: null })
    expect(result.event.gapResolutions).toEqual([{ field: 'product', reason: 'Not supplied by the source' }])
    expect(store.updateEvent).toHaveBeenCalledTimes(1)
  })

  it('rejects unresolved gaps, empty close notes and attempts to clear a closed event note', async () => {
    const { event } = records()
    const incomplete = fixture(event)
    await expect(updateDetectionEvent(incomplete.unit, id, { expectedRevision: 1, status: 'closed', closureNote: 'Reviewed' }, { now: incomplete.now }))
      .rejects.toMatchObject({ status: 409, body: { code: 'INVALID_STATUS_TRANSITION' } })
    expect(incomplete.store.updateEvent).not.toHaveBeenCalled()
    for (const note of [undefined, null, '   ']) {
      const completeRecord = {
        ...event, detectedAt: at, product: 'Product', productVersion: '1', client: 'Client',
        installedComponentVersion: '1.2', status: 'in_progress' as const,
      }
      const { unit, store } = fixture(completeRecord)
      await expect(updateDetectionEvent(unit, id, { expectedRevision: 1, status: 'closed', closureNote: note }, { now: () => at }))
        .rejects.toMatchObject({ status: 409, body: { code: 'INVALID_STATUS_TRANSITION' } })
      expect(store.updateEvent).not.toHaveBeenCalled()
    }
    const closed = fixture({ ...event, detectedAt: at, product: 'Product', productVersion: '1', client: 'Client', installedComponentVersion: '1.2', status: 'closed', closureNote: 'Existing note' })
    await expect(updateDetectionEvent(closed.unit, id, { expectedRevision: 1, closureNote: null }, { now: closed.now }))
      .rejects.toMatchObject({ status: 409, body: { code: 'INVALID_STATUS_TRANSITION' } })
    expect(closed.store.updateEvent).not.toHaveBeenCalled()
  })

  it('clears the last gap to review and permits complete plus in-progress or closed in one patch', async () => {
    const { event } = records()
    const onlyMissingProduct = {
      ...event, detectedAt: at, product: null, productVersion: '1', client: 'Client', installedComponentVersion: '1.2', status: 'missing_data' as const,
    }
    const { unit, store } = fixture(onlyMissingProduct)
    const reviewed = await updateDetectionEvent(unit, id, { expectedRevision: 1, product: 'Product' }, { now: () => at })
    expect(reviewed.event.status).toBe('review')
    for (const status of ['in_progress', 'closed'] as const) {
      const complete = fixture(onlyMissingProduct)
      const result = await updateDetectionEvent(complete.unit, id, {
        expectedRevision: 1, product: 'Product', status, ...(status === 'closed' ? { closureNote: 'Reviewed' } : {}),
      }, { now: () => at })
      expect(result.event.status).toBe(status)
    }
    expect(store.updateEvent).toHaveBeenCalledTimes(1)
  })

  it('persists a reconciled status when stored status lags already complete event facts', async () => {
    const { event } = records()
    const completeButStaleStatus = {
      ...event, detectedAt: at, product: 'Product', productVersion: '1', client: 'Client',
      installedComponentVersion: '1.2', status: 'missing_data' as const,
    }
    const { unit, store, now } = fixture(completeButStaleStatus)
    const result = await updateDetectionEvent(unit, id, { expectedRevision: 1 }, { now })
    expect(result.event.status).toBe('review')
    expect(result.event.revision).toBe(2)
    expect(store.updateEvent).toHaveBeenCalledTimes(1)
    expect(now).toHaveBeenCalledTimes(1)
  })

  it('does not retry a failed CAS and propagates storage unavailability', async () => {
    const { unit, store, run, now } = fixture()
    store.updateEvent.mockResolvedValue(null)
    store.findEventById.mockResolvedValueOnce(records().event).mockResolvedValue({ ...records().event, revision: 2 })
    await expect(updateDetectionEvent(unit, id, { expectedRevision: 1, reviewNotes: 'Edited' }, { now }))
      .rejects.toMatchObject({ status: 409, body: { code: 'STALE_REVISION', currentRevision: 2 } })
    expect(store.updateEvent).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(1)
    const unavailable = fixture()
    unavailable.store.updateEvent.mockRejectedValue(new PersistenceUnavailableError())
    await expect(updateDetectionEvent(unavailable.unit, id, { expectedRevision: 1, reviewNotes: 'Edited' }, { now: unavailable.now }))
      .rejects.toBeInstanceOf(PersistenceUnavailableError)
    expect(unavailable.store.updateEvent).toHaveBeenCalledTimes(1)
  })

  it('returns a valid missing-event error without writes', async () => {
    const { event } = records()
    const { unit, store, now } = fixture(event)
    store.findEventById.mockResolvedValue(null)
    await expect(updateDetectionEvent(unit, randomUUID(), { expectedRevision: 1 }, { now })).rejects.toMatchObject({ status: 404, body: { code: 'EVENT_NOT_FOUND' } })
    expect(store.updateEvent).not.toHaveBeenCalled()
  })
})
