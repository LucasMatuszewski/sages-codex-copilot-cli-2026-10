import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiErrorSchema } from '../../../shared/common.js'
import { FindingCreateRequestSchema, FindingCreateResponseSchema, type FindingCreateRequestInput } from '../../../shared/finding-contracts.js'
import type { FindingsUnitOfWork } from '../ports/findings-store.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../../test-support/isolated-directory.js'
import { openFindingsDatabase } from '../../persistence/unit-of-work.js'
import { fingerprintFinding } from '../../domain/fingerprint.js'
import { intakeFinding } from './command.js'
import { IntakeError } from './errors.js'

const receivedAt = '2026-10-22T12:00:00.000Z'
const reviewedAt = '2026-10-22T12:30:00.000Z'
const complete: FindingCreateRequestInput = {
  source: 'scanner-a', sourceEventId: 'synthetic-001',
  vulnerability: {
    identities: [{ scheme: 'cve', value: ' cve-2026-12345 ' }], title: 'Synthetic issue', description: 'Local only',
    componentName: 'lib-x', category: 'dependency', severity: 'high', severityRationale: 'Synthetic assessment',
  },
  observation: { detectedAt: '2026-10-21T10:30:15+02:00', product: 'Widget', productVersion: '1.0', client: 'Client A', installedComponentVersion: '2.0' },
}

describe('atomic intake command with real SQLite', () => {
  let directory: IsolatedDirectory | undefined
  let unit: FindingsUnitOfWork | undefined
  let path: string
  async function fresh() {
    directory = await createIsolatedDirectory('cra-b06-command-')
    path = join(directory.path, 'findings.sqlite')
    unit = await openFindingsDatabase(path)
    return unit
  }
  function intake(input: unknown) { return intakeFinding(unit!, input, { now: () => receivedAt, newId: randomUUID }) }
  async function snapshot() {
    return unit!.run(async (store) => {
      const vulnerabilities = await store.listVulnerabilities()
      return JSON.stringify({ vulnerabilities, events: await store.listEvents(), identities: await Promise.all(vulnerabilities.map((vulnerability) => store.listIdentities(vulnerability.id))) })
    })
  }
  afterEach(async () => {
    try { await unit?.close() }
    finally { await directory?.cleanup(); unit = undefined; directory = undefined }
  })

  it('creates complete linked records, normalizes historical detection and preserves source evidence through reopen', async () => {
    await fresh()
    const input = {
      ...complete,
      observation: { ...complete.observation, scannerAssessment: { severity: 'critical', score: 9.9, exploitationSignal: 'confirmed' } },
      reportingEvidence: { manufacturer: 'Synthetic manufacturer', memberStates: ['pl', 'DE', 'PL'], supportEnded: false, awareness: { at: '2026-10-21T09:00:00+02:00', accuracy: 'exact', basis: null } },
    }
    const result = FindingCreateResponseSchema.parse(await intake(input))
    expect(result).toMatchObject({ vulnerabilityOutcome: 'created', eventOutcome: 'created', vulnerabilityStatus: 'review', eventStatus: 'review', vulnerabilityGaps: [], eventGaps: [], vulnerabilityRevision: 1, eventRevision: 1 })
    const beforeReopen = await snapshot()
    await unit!.close()
    unit = await openFindingsDatabase(path)
    expect(await snapshot()).toBe(beforeReopen)
    const saved = await unit.run(async (store) => ({ vulnerability: await store.findVulnerabilityById(result.vulnerabilityId), event: await store.findEventById(result.eventId) }))
    expect(saved.vulnerability).toMatchObject({ severity: 'high', score: null, exploitationSignal: null, tags: [], vendor: null, revision: 1 })
    expect(saved.event).toMatchObject({ vulnerabilityId: result.vulnerabilityId, detectedAt: '2026-10-21T08:30:15.000Z', receiptAt: receivedAt, scannerAssessment: input.observation.scannerAssessment, closureNote: null, tags: [], gapResolutions: [], revision: 1 })
    expect(saved.event?.originalIntakeSnapshot).toEqual(FindingCreateRequestSchema.parse(input))
    expect(saved.event?.incomingSharedSnapshot).not.toHaveProperty('identities')
    expect(saved.event?.incomingSharedSnapshot).not.toHaveProperty('id')
    expect(saved.event?.reportingEvidence).toMatchObject({ memberStates: ['PL', 'DE'], supportEnded: false, awareness: { at: '2026-10-21T07:00:00.000Z' } })
    expect(saved.event?.requestFingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  it('reuses exact/source/manual identities, adds deduplicated aliases, and supports selected UUIDs without title matching', async () => {
    await fresh()
    const first = await intake(complete)
    const second = await intake({ ...complete, sourceEventId: 'synthetic-002', vulnerability: { ...complete.vulnerability, title: 'Different title', identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }, { scheme: 'source:scanner-a', value: ' Source-Case ' }, { scheme: 'source:scanner-a', value: 'Source-Case' }] } })
    expect(second).toMatchObject({ vulnerabilityId: first.vulnerabilityId, vulnerabilityOutcome: 'reused', eventOutcome: 'created', vulnerabilityRevision: 2 })
    expect(await unit!.run((store) => store.listIdentities(first.vulnerabilityId))).toHaveLength(2)
    const bySource = await intake({ source: 'scanner-a', sourceEventId: 'synthetic-003', vulnerability: { identities: [{ scheme: 'source:scanner-a', value: 'Source-Case' }] } })
    expect(bySource.vulnerabilityId).toBe(first.vulnerabilityId)
    expect(bySource.vulnerabilityRevision).toBe(2)
    const manual = await intake({ source: 'manual', sourceEventId: '20000000-0000-4000-8000-000000000002', vulnerability: { id: first.vulnerabilityId } })
    expect(manual).toMatchObject({ vulnerabilityId: first.vulnerabilityId, vulnerabilityOutcome: 'reused', eventOutcome: 'created' })
    const internal = await intake({ source: 'manual', sourceEventId: '30000000-0000-4000-8000-000000000003', vulnerability: { identities: [{ scheme: 'manual', value: '40000000-0000-4000-8000-000000000004' }], title: 'Synthetic issue' } })
    expect(internal.vulnerabilityId).not.toBe(first.vulnerabilityId)
    const caseDistinct = await intake({ source: 'scanner-a', sourceEventId: 'synthetic-004', vulnerability: { identities: [{ scheme: 'source:scanner-a', value: 'source-case' }], title: 'Synthetic issue' } })
    expect(caseDistinct.vulnerabilityId).not.toBe(first.vulnerabilityId)
    expect(await unit!.run(async (store) => [(await store.listVulnerabilities()).length, (await store.listEvents()).length])).toEqual([3, 6])
  })

  it('replays canonically equivalent contents without clocks, IDs, writes or reopening a closed record', async () => {
    await fresh()
    const input = { ...complete, vulnerability: { ...complete.vulnerability, identities: [{ scheme: 'euvd', value: 'euvd-2026-123' }, ...complete.vulnerability.identities!], tags: ['z', 'a', 'a'] }, reportingEvidence: { memberStates: ['PL', 'DE', 'PL'] } }
    const first = await intake(input)
    await unit!.run((store) => store.updateVulnerability(first.vulnerabilityId, 1, { title: 'Curated title', status: 'closed', closureNote: 'Reviewed locally' }, reviewedAt))
    const before = await snapshot()
    const now = vi.fn(() => reviewedAt)
    const newId = vi.fn(randomUUID)
    const replay = await intakeFinding(unit!, {
      reportingEvidence: { memberStates: ['DE', 'PL'] }, observation: { ...complete.observation, detectedAt: '2026-10-21T08:30:15Z' },
      vulnerability: { ...input.vulnerability, identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }, { scheme: 'euvd', value: 'EUVD-2026-123' }, { scheme: 'cve', value: 'CVE-2026-12345' }], tags: ['a', 'z'] },
      sourceEventId: input.sourceEventId, source: input.source,
    }, { now, newId })
    expect(replay).toMatchObject({ vulnerabilityId: first.vulnerabilityId, eventId: first.eventId, eventOutcome: 'replayed', vulnerabilityOutcome: 'reused', vulnerabilityRevision: 2, eventRevision: 1, vulnerabilityStatus: 'closed', vulnerabilityGaps: [] })
    expect(now).not.toHaveBeenCalled()
    expect(newId).not.toHaveBeenCalled()
    expect(await snapshot()).toBe(before)
  })

  it('projects current shared and event gaps after review changes without mutating either resource on replay', async () => {
    await fresh()
    const input = { ...complete, vulnerability: { ...complete.vulnerability, componentName: null, category: 'application' }, observation: { ...complete.observation, installedComponentVersion: null } }
    const first = await intake(input)
    expect(first.eventStatus).toBe('review')
    await unit!.run((store) => store.updateVulnerability(first.vulnerabilityId, 1, { componentName: 'Added during review' }, reviewedAt))
    const before = await snapshot()
    const replay = await intake(input)
    expect(replay).toMatchObject({ vulnerabilityStatus: 'review', vulnerabilityRevision: 2, vulnerabilityGaps: [], eventStatus: 'missing_data', eventRevision: 1 })
    expect(replay.eventGaps.map((gap) => gap.field)).toEqual(['installedComponentVersion'])
    expect(await snapshot()).toBe(before)
    expect(await unit!.run((store) => store.findEventById(first.eventId))).toMatchObject({ status: 'review', revision: 1 })
  })

  it('rejects changed content, changed selectors, added aliases and absent/null changes before any mutation', async () => {
    await fresh()
    await intake(complete)
    const other = await intake({ ...complete, sourceEventId: 'other-key', vulnerability: { ...complete.vulnerability, identities: [{ scheme: 'cve', value: 'CVE-2026-99999' }] } })
    const before = await snapshot()
    const changed = [
      { ...complete, vulnerability: { ...complete.vulnerability, title: 'Changed' } },
      { ...complete, observation: { ...complete.observation, product: 'Changed' } },
      { ...complete, vulnerability: { identities: [{ scheme: 'cve', value: 'CVE-2026-77777' }] } },
      { ...complete, vulnerability: { id: other.vulnerabilityId } },
      { ...complete, vulnerability: { ...complete.vulnerability, identities: [...complete.vulnerability.identities!, { scheme: 'manual', value: 'new-alias' }] } },
      { ...complete, reportingEvidence: null },
    ]
    for (const input of changed) {
      await expect(intake(input)).rejects.toMatchObject({ status: 409, body: { code: 'SOURCE_EVENT_CONFLICT', retryable: false } })
      expect(await snapshot()).toBe(before)
    }
  })

  it('rejects multi-owner aliases atomically and never merges similar titles', async () => {
    await fresh()
    const first = await intake(complete)
    const second = await intake({ ...complete, sourceEventId: 'other-key', vulnerability: { ...complete.vulnerability, identities: [{ scheme: 'euvd', value: 'EUVD-2026-123' }] } })
    expect(first.vulnerabilityId).not.toBe(second.vulnerabilityId)
    const before = await snapshot()
    await expect(intake({ ...complete, sourceEventId: 'conflicting-owner', vulnerability: { identities: [...complete.vulnerability.identities!, { scheme: 'euvd', value: 'EUVD-2026-123' }, { scheme: 'manual', value: 'unowned-alias' }] } })).rejects.toMatchObject({ status: 409, body: { code: 'IDENTITY_CONFLICT' } })
    expect(await snapshot()).toBe(before)
  })

  it('fills only unknown facts, preserves curated values and0, and retains all incoming candidates', async () => {
    await fresh()
    const references = [{ label: 'Curated reference', reference: 'local-reference' }]
    const first = await intake({ ...complete, vulnerability: { identities: complete.vulnerability.identities!, title: 'Curated title', description: ' ', category: 'unknown', severity: 'low', score: 0, exploitationSignal: 'not_established', tags: ['curated'], references } })
    expect(first.vulnerabilityStatus).toBe('missing_data')
    const input = { ...complete, sourceEventId: 'candidate-002', vulnerability: { ...complete.vulnerability, title: 'Candidate title', severity: 'critical', score: 9.9, scoreSystem: 'CVSS', scoreVersion: '4.0', exploitationSignal: 'confirmed', vendor: 'N/A', tags: ['candidate'], references: [{ label: 'Candidate reference', reference: 'candidate-local' }], identities: [...complete.vulnerability.identities!, { scheme: 'source:scanner-a', value: 'alias-2' }] } }
    const next = await intake(input)
    expect(next).toMatchObject({ vulnerabilityRevision: 2, vulnerabilityStatus: 'review', vulnerabilityGaps: [], eventStatus: 'review' })
    const saved = await unit!.run(async (store) => ({ vulnerability: await store.findVulnerabilityById(first.vulnerabilityId), event: await store.findEventById(next.eventId), original: await store.findEventById(first.eventId) }))
    expect(saved.vulnerability).toMatchObject({ title: 'Curated title', description: 'Local only', category: 'dependency', componentName: 'lib-x', severity: 'low', score: 0, scoreSystem: 'CVSS', scoreVersion: '4.0', exploitationSignal: 'not_established', vendor: 'N/A', tags: ['curated'], references, revision: 2 })
    expect(saved.event?.incomingSharedSnapshot).toMatchObject({ title: 'Candidate title', severity: 'critical', score: 9.9, tags: ['candidate'], references: input.vulnerability.references })
    expect(saved.original?.incomingSharedSnapshot).toMatchObject({ description: '', category: 'unknown', score: 0 })
    const nulls = await intake({ source: 'scanner-a', sourceEventId: 'blank-003', vulnerability: { id: first.vulnerabilityId, title: null, description: ' ', tags: [], references: [] } })
    expect(nulls.vulnerabilityRevision).toBe(2)
    expect(await unit!.run((store) => store.findVulnerabilityById(first.vulnerabilityId))).toEqual(saved.vulnerability)
  })

  it('treats arbitrary nonempty text as known and enriches empty collections without extra revision increments', async () => {
    await fresh()
    const first = await intake({ ...complete, vulnerability: { ...complete.vulnerability, title: 'unknown', vendor: 'N/A', tags: [], references: [] } })
    const next = await intake({ ...complete, sourceEventId: 'collections-002', vulnerability: { ...complete.vulnerability, title: 'Replacement', vendor: 'Vendor', tags: ['new'], references: [{ label: 'Local', reference: 'local-2' }] } })
    expect(next.vulnerabilityRevision).toBe(2)
    expect(await unit!.run((store) => store.findVulnerabilityById(first.vulnerabilityId))).toMatchObject({ title: 'unknown', vendor: 'N/A', tags: ['new'], references: [{ label: 'Local', reference: 'local-2' }] })
    expect((await intake({ ...complete, sourceEventId: 'unchanged-003' })).vulnerabilityRevision).toBe(2)
  })

  it('reopens only closed shared records on distinct events and preserves closure explanation and event history', async () => {
    await fresh()
    const first = await intake(complete)
    await unit!.run((store) => store.updateVulnerability(first.vulnerabilityId, 1, { status: 'closed', closureNote: 'Synthetic closure' }, reviewedAt))
    const closedBeforeReplay = await snapshot()
    expect((await intake(complete)).vulnerabilityStatus).toBe('closed')
    expect(await snapshot()).toBe(closedBeforeReplay)
    const next = await intake({ ...complete, sourceEventId: 'new-event' })
    expect(next).toMatchObject({ vulnerabilityStatus: 'review', vulnerabilityRevision: 3, eventRevision: 1 })
    expect(await unit!.run((store) => store.findVulnerabilityById(first.vulnerabilityId))).toMatchObject({ closureNote: 'Synthetic closure' })
    expect(await unit!.run((store) => store.findEventById(first.eventId))).toMatchObject({ status: 'review', revision: 1, updatedAt: receivedAt })
    expect((await intake({ ...complete, sourceEventId: 'another-event' })).vulnerabilityRevision).toBe(3)
  })

  it('returns the current revision and closed status of an already reviewed event without rewriting history', async () => {
    await fresh()
    const original = await intake(complete)
    const reviewedRequest = FindingCreateRequestSchema.parse({ ...complete, sourceEventId: 'reviewed-event' })
    const reviewedEventId = randomUUID()
    await unit!.run(async (store) => {
      const saved = await store.findEventById(original.eventId)
      if (!saved) throw new Error('Missing synthetic event fixture')
      await store.insertEvent({ ...saved, id: reviewedEventId, sourceEventId: reviewedRequest.sourceEventId, originalIntakeSnapshot: reviewedRequest, requestFingerprint: fingerprintFinding(reviewedRequest, original.vulnerabilityId), status: 'closed', closureNote: 'Reviewed synthetic event', updatedAt: reviewedAt, revision: 4 })
    })
    const before = await snapshot()
    expect(await intake(reviewedRequest)).toMatchObject({ eventId: reviewedEventId, eventOutcome: 'replayed', eventStatus: 'closed', eventRevision: 4, eventGaps: [] })
    expect(await snapshot()).toBe(before)
  })

  it('retains missing detection time and independent shared/event gaps without inventing observations', async () => {
    await fresh()
    const first = await intake({ source: 'manual', sourceEventId: 'minimal', vulnerability: { identities: [{ scheme: 'manual', value: 'local-only' }] } })
    expect(first).toMatchObject({ vulnerabilityStatus: 'missing_data', eventStatus: 'missing_data' })
    expect(first.vulnerabilityGaps.map((gap) => gap.field)).toEqual(['title', 'description', 'componentName', 'category', 'severity'])
    expect(first.eventGaps.map((gap) => gap.field)).toEqual(['detectedAt', 'product', 'productVersion', 'client'])
    expect(await unit!.run((store) => store.findEventById(first.eventId))).toMatchObject({ detectedAt: null, receiptAt: receivedAt, scannerAssessment: null, reportingEvidence: null, productAffected: null })
    const completeEvent = await intake({ source: 'manual', sourceEventId: 'full-event', vulnerability: { id: first.vulnerabilityId }, observation: complete.observation })
    expect(completeEvent).toMatchObject({ vulnerabilityStatus: 'missing_data', eventStatus: 'review', eventGaps: [] })
  })

  it('rolls back every table after an injected failure following a real event write, then accepts the same token', async () => {
    const real = await fresh()
    const failure = new Error('Synthetic post-write failure')
    let actualEventWrites = 0
    const failing: FindingsUnitOfWork = {
      close: () => real.close(),
      run: (work) => real.run((store) => work({ ...store, insertEvent: async (record) => { await store.insertEvent(record); actualEventWrites++; throw failure } })),
    }
    await expect(intakeFinding(failing, complete)).rejects.toBe(failure)
    expect(actualEventWrites).toBe(1)
    expect(await unit!.run(async (store) => [await store.listVulnerabilities(), await store.findIdentities(complete.vulnerability.identities!), await store.listEvents()])).toEqual([[], [], []])
    expect(await intake(complete)).toMatchObject({ vulnerabilityOutcome: 'created', eventOutcome: 'created' })
  })

  it('serializes real concurrent same-key commands into create/replay or create/conflict without duplicates', async () => {
    await fresh()
    const same = await Promise.all([intake(complete), intake(complete)])
    expect(same.map((result) => result.eventOutcome).sort()).toEqual(['created', 'replayed'])
    expect(same[0]?.eventId).toBe(same[1]?.eventId)
    const input = { ...complete, sourceEventId: 'race-changed' }
    const changed = await Promise.allSettled([intake(input), intake({ ...input, observation: { ...complete.observation, product: 'Other product' } })])
    expect(changed.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(changed.filter((result) => result.status === 'rejected' && result.reason instanceof IntakeError && result.reason.body.code === 'SOURCE_EVENT_CONFLICT')).toHaveLength(1)
    expect(await unit!.run(async (store) => [(await store.listVulnerabilities()).length, (await store.listEvents()).length, (await store.listIdentities(same[0]!.vulnerabilityId)).length])).toEqual([1, 2, 1])
  })

  it('rejects strict invalid input and missing selected UUIDs with validated safe errors and no rows', async () => {
    await fresh()
    const invalid = [
      null, {}, { ...complete, source: ' ' }, { ...complete, sourceEventId: '' }, { ...complete, vulnerability: {} },
      { ...complete, vulnerability: { ...complete.vulnerability, id: randomUUID() } },
      { ...complete, vulnerability: { identities: [{ scheme: 'manual', value: ' ' }] } },
      { ...complete, vulnerability: { ...complete.vulnerability, severity: 'invalid' } },
      { ...complete, observation: { detectedAt: '2026-02-30T12:00:00Z' } },
      { ...complete, observation: { detectedAt: '2026-10-22T12:00:00' } }, { ...complete, unknown: true },
    ]
    for (const input of invalid) {
      const error = await intake(input).then(() => undefined, (cause: unknown) => cause)
      expect(error).toBeInstanceOf(IntakeError)
      expect(error).toMatchObject({ status: 400, body: { code: 'INVALID_REQUEST', retryable: false } })
      const body = ApiErrorSchema.parse((error as IntakeError).body)
      expect(JSON.stringify(body)).not.toMatch(/Zod|SQLITE|stack|\.sqlite/)
    }
    await expect(intake({ source: 'manual', sourceEventId: 'missing', vulnerability: { id: randomUUID() } })).rejects.toMatchObject({ status: 404, body: { code: 'VULNERABILITY_NOT_FOUND' } })
    expect(await unit!.run(async (store) => [await store.listVulnerabilities(), await store.listEvents()])).toEqual([[], []])
  })
})
