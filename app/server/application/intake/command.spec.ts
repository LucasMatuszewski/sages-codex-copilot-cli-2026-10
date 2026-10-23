import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { ApiErrorSchema } from '../../../shared/common.js'
import type { FindingCreateRequest } from '../../../shared/finding-contracts.js'
import type { DetectionEventRecord, FindingsStore, FindingsUnitOfWork, VulnerabilityRecord } from '../ports/findings-store.js'
import { PersistenceConstraintError, PersistenceUnavailableError } from '../ports/findings-store.js'
import { fingerprintFinding } from '../../domain/fingerprint.js'
import { intakeFinding } from './command.js'
import { IntakeError } from './errors.js'

const at = '2026-10-22T12:00:00.000Z'
const vulnerabilityId = '10000000-0000-4000-8000-000000000001'
const eventId = '20000000-0000-4000-8000-000000000002'
const request: FindingCreateRequest = { source: 'manual', sourceEventId: 'stable-save', vulnerability: { id: vulnerabilityId, title: 'Filled' } }

function vulnerability(): VulnerabilityRecord {
  return {
    id: vulnerabilityId, title: null, description: 'Synthetic description', componentName: 'lib-x', ecosystem: null,
    vendor: null, affectedComponentVersions: null, generalExploit: null, exploitPrerequisites: null,
    remediationGuidance: null, fixedComponentVersions: null, category: 'dependency', weaknessCode: null,
    severity: 'high', severityRationale: 'Synthetic assessment', score: null, scoreSystem: null, scoreVersion: null,
    scoreSource: null, exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null, references: null,
    tags: [], status: 'missing_data', closureNote: null, gapResolutions: [], createdAt: at, updatedAt: at, revision: 1,
  }
}

function event(input = request): DetectionEventRecord {
  return {
    id: eventId, vulnerabilityId, source: input.source, sourceEventId: input.sourceEventId, receiptAt: at,
    detectedAt: null, product: null, productVersion: null, client: null, environment: null, installedComponentVersion: null,
    componentLocation: null, evidence: null, reviewNotes: null, scannerAssessment: null, productAffected: null,
    exploitabilityNotes: null, impactDescription: null, status: 'missing_data', closureNote: null, tags: [], gapResolutions: [],
    reportingEvidence: null, incomingSharedSnapshot: { title: 'Filled' }, originalIntakeSnapshot: input,
    requestFingerprint: fingerprintFinding(input, vulnerabilityId), createdAt: at, updatedAt: at, revision: 1,
  }
}

function fixture() {
  const record = vulnerability()
  const store = {
    findVulnerabilityById: vi.fn<FindingsStore['findVulnerabilityById']>(async () => record),
    listVulnerabilities: vi.fn<FindingsStore['listVulnerabilities']>(async () => [record]),
    insertVulnerability: vi.fn<FindingsStore['insertVulnerability']>(async () => undefined),
    updateVulnerability: vi.fn<FindingsStore['updateVulnerability']>(async (_id, _revision, changes, updatedAt) => ({ ...record, ...changes, updatedAt, revision: 2 })),
    findIdentities: vi.fn<FindingsStore['findIdentities']>(async () => []),
    listIdentities: vi.fn<FindingsStore['listIdentities']>(async () => []),
    insertIdentity: vi.fn<FindingsStore['insertIdentity']>(async () => undefined),
    findEventById: vi.fn<FindingsStore['findEventById']>(async () => null),
    findEventBySourceKey: vi.fn<FindingsStore['findEventBySourceKey']>(async () => null),
    listEvents: vi.fn<FindingsStore['listEvents']>(async () => []),
    insertEvent: vi.fn<FindingsStore['insertEvent']>(async () => undefined),
    updateEvent: vi.fn<FindingsStore['updateEvent']>(async () => null),
  }
  const run = vi.fn()
  const unit: FindingsUnitOfWork = {
    async run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T> { run(); return work(store) },
    close: async () => undefined,
  }
  const dependencies = { now: vi.fn(() => at), newId: vi.fn(randomUUID) }
  return { store, run, unit, dependencies, record }
}

describe('intake validation and bounded contention decisions', () => {
  it('validates before opening any transaction and formats array-index and root errors safely', async () => {
    const { unit, run } = fixture()
    for (const [input, path] of [[null, '$'], [{ ...request, vulnerability: { identities: [{ scheme: 'manual', value: '' }] } }, 'vulnerability.identities[0].value']] as const) {
      const error = await intakeFinding(unit, input).then(() => undefined, (cause: unknown) => cause)
      expect(error).toBeInstanceOf(IntakeError)
      const body = ApiErrorSchema.parse((error as IntakeError).body)
      expect(body.fieldErrors).toContainEqual({ path, code: expect.any(String), message: expect.any(String) })
      expect(JSON.stringify(body)).not.toMatch(/Zod|SQLITE|stack/)
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('checks existing source key before identity lookup, ID generation or shared updates', async () => {
    const { unit, store, dependencies } = fixture()
    store.findEventBySourceKey.mockResolvedValue(event())
    await expect(intakeFinding(unit, { ...request, vulnerability: { identities: [{ scheme: 'manual', value: 'retarget' }] } }, dependencies)).rejects.toMatchObject({ body: { code: 'SOURCE_EVENT_CONFLICT' } })
    expect(store.findIdentities).not.toHaveBeenCalled()
    expect(store.findVulnerabilityById).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(store.updateVulnerability).not.toHaveBeenCalled()
  })

  it('resolves a proven event-key insert race after rollback with one bounded retry', async () => {
    const { unit, store, run, dependencies } = fixture()
    store.insertEvent.mockRejectedValueOnce(new PersistenceConstraintError())
    store.findEventBySourceKey.mockResolvedValueOnce(null).mockResolvedValue(event())
    expect(await intakeFinding(unit, request, dependencies)).toMatchObject({ eventId, eventOutcome: 'replayed', vulnerabilityOutcome: 'reused' })
    expect(store.insertEvent).toHaveBeenCalledTimes(1)
    expect(run.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('resolves a proven exact-alias insertion race against its new owner rather than creating a duplicate', async () => {
    const { unit, store, run, dependencies } = fixture()
    const identity = { scheme: 'manual', value: 'new-alias' }
    const owner = { ...identity, id: randomUUID(), vulnerabilityId }
    store.findIdentities.mockResolvedValueOnce([]).mockResolvedValue([owner])
    store.insertIdentity.mockRejectedValueOnce(new PersistenceConstraintError())
    const result = await intakeFinding(unit, { ...request, vulnerability: { identities: [identity], title: 'Filled' } }, dependencies)
    expect(result).toMatchObject({ vulnerabilityId, vulnerabilityOutcome: 'reused', eventOutcome: 'created' })
    expect(store.insertVulnerability).toHaveBeenCalledTimes(1)
    expect(store.insertIdentity).toHaveBeenCalledTimes(1)
    expect(run.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('propagates an unproven event constraint instead of treating every database error as replay', async () => {
    const { unit, store, run, dependencies } = fixture()
    const constraint = new PersistenceConstraintError()
    store.insertEvent.mockRejectedValue(constraint)
    await expect(intakeFinding(unit, request, dependencies)).rejects.toBe(constraint)
    expect(store.insertEvent).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('does not retry constraints outside alias/event insertion or infrastructure failures', async () => {
    const first = fixture()
    const constraint = new PersistenceConstraintError()
    first.store.insertVulnerability.mockRejectedValue(constraint)
    await expect(intakeFinding(first.unit, { source: 'scanner-a', sourceEventId: 'new', vulnerability: { identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }] } }, first.dependencies)).rejects.toBe(constraint)
    expect(first.run).toHaveBeenCalledTimes(1)
    const second = fixture()
    const unavailable = new PersistenceUnavailableError()
    second.store.insertEvent.mockRejectedValue(unavailable)
    await expect(intakeFinding(second.unit, request, second.dependencies)).rejects.toBe(unavailable)
    expect(second.run).toHaveBeenCalledTimes(1)
  })

  it('retries a stale shared compare-and-set once from a fresh transaction', async () => {
    const { unit, store, run, dependencies } = fixture()
    store.updateVulnerability.mockResolvedValueOnce(null)
    expect(await intakeFinding(unit, request, dependencies)).toMatchObject({ vulnerabilityRevision: 2, vulnerabilityOutcome: 'reused', eventOutcome: 'created' })
    expect(store.updateVulnerability).toHaveBeenCalledTimes(2)
    expect(store.insertEvent).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('bounds genuine repeated stale contention and surfaces safe retryable storage unavailability', async () => {
    const { unit, store, run, dependencies } = fixture()
    store.updateVulnerability.mockResolvedValue(null)
    await expect(intakeFinding(unit, request, dependencies)).rejects.toBeInstanceOf(PersistenceUnavailableError)
    expect(store.updateVulnerability).toHaveBeenCalledTimes(2)
    expect(store.insertEvent).not.toHaveBeenCalled()
    expect(run).toHaveBeenCalledTimes(2)
  })
})
