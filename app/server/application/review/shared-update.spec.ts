import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { ApiErrorSchema } from '../../../shared/common.js'
import type { FindingsStore, FindingsUnitOfWork, VulnerabilityRecord } from '../ports/findings-store.js'
import { PersistenceConstraintError, PersistenceUnavailableError } from '../ports/findings-store.js'
import { getVulnerabilityDetail, updateSharedVulnerability } from './shared-update.js'
import { ReviewError } from './errors.js'

const id = '10000000-0000-4000-8000-000000000001'
const otherId = '20000000-0000-4000-8000-000000000002'
const at = '2026-10-23T09:00:00.000Z'

function fixture() {
  const record: VulnerabilityRecord = {
    id, title: 'Title', description: 'Description', componentName: 'Library', ecosystem: null,
    vendor: null, affectedComponentVersions: null, generalExploit: null, exploitPrerequisites: null,
    remediationGuidance: null, fixedComponentVersions: null, category: 'dependency', weaknessCode: null,
    severity: 'high', severityRationale: 'Local evidence', score: null, scoreSystem: null, scoreVersion: null,
    scoreSource: null, exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null, references: null,
    tags: ['b', 'a'], status: 'review', closureNote: null, gapResolutions: [], createdAt: at, updatedAt: at, revision: 2,
  }
  const store = {
    findVulnerabilityById: vi.fn<FindingsStore['findVulnerabilityById']>(async () => record),
    listVulnerabilities: vi.fn<FindingsStore['listVulnerabilities']>(async () => [record]),
    insertVulnerability: vi.fn<FindingsStore['insertVulnerability']>(async () => undefined),
    updateVulnerability: vi.fn<FindingsStore['updateVulnerability']>(async (_id, _revision, changes, updatedAt) => ({ ...record, ...changes, updatedAt, revision: 3 })),
    findIdentities: vi.fn<FindingsStore['findIdentities']>(async () => []),
    listIdentities: vi.fn<FindingsStore['listIdentities']>(async () => []),
    insertIdentity: vi.fn<FindingsStore['insertIdentity']>(async () => undefined),
    findEventById: vi.fn<FindingsStore['findEventById']>(async () => null),
    findEventBySourceKey: vi.fn<FindingsStore['findEventBySourceKey']>(async () => null),
    listEvents: vi.fn<FindingsStore['listEvents']>(async () => []),
    insertEvent: vi.fn<FindingsStore['insertEvent']>(async () => undefined),
  }
  const run = vi.fn()
  const unit: FindingsUnitOfWork = {
    async run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T> { run(); return work(store) },
    close: async () => undefined,
  }
  const dependencies = { now: vi.fn(() => at), newId: vi.fn(randomUUID) }
  return { record, store, unit, run, dependencies }
}

describe('shared review bounded dependency branches', () => {
  it('validates before transactions and returns safe root/index paths', async () => {
    const { unit, run, dependencies } = fixture()
    for (const [input, path] of [
      [[], '$'], [{ expectedRevision: 1, addIdentities: [{ scheme: 'manual', value: ' ' }] }, 'addIdentities[0].value'],
    ] as const) {
      const error: unknown = await updateSharedVulnerability(unit, id, input, dependencies).catch((cause: unknown) => cause)
      expect(error).toBeInstanceOf(ReviewError)
      if (!(error instanceof ReviewError)) throw new Error('Expected typed review error')
      expect(ApiErrorSchema.parse(error.body).fieldErrors.map((item) => item.path)).toContain(path)
    }
    await expect(getVulnerabilityDetail(unit, 'invalid')).rejects.toMatchObject({ status: 400 })
    expect(run).not.toHaveBeenCalled()
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
  })

  it('rejects stale requests before alias lookups, clocks, IDs or writes', async () => {
    const { unit, store, dependencies } = fixture()
    await expect(updateSharedVulnerability(unit, id, {
      expectedRevision: 1, title: 'New', addIdentities: [{ scheme: 'manual', value: 'Alias' }],
    }, dependencies)).rejects.toMatchObject({ status: 409, body: { code: 'STALE_REVISION', currentRevision: 2 } })
    expect(store.findIdentities).not.toHaveBeenCalled()
    expect(store.updateVulnerability).not.toHaveBeenCalled()
    expect(store.insertIdentity).not.toHaveBeenCalled()
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
  })

  it('does not write or call dependencies for a normalized tag-set no-op', async () => {
    const { unit, store, dependencies } = fixture()
    expect((await updateSharedVulnerability(unit, id, { expectedRevision: 2, tags: ['a', ' b ', 'a'] }, dependencies)).vulnerability.revision).toBe(2)
    expect(store.updateVulnerability).not.toHaveBeenCalled()
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
  })

  it('keeps inherited failed CAS as stale and never retries or inserts aliases after it', async () => {
    const { unit, store, run, dependencies } = fixture()
    store.updateVulnerability.mockResolvedValue(null)
    store.findVulnerabilityById.mockResolvedValueOnce({ ...fixture().record }).mockResolvedValue({ ...fixture().record, revision: 3 })
    await expect(updateSharedVulnerability(unit, id, {
      expectedRevision: 2, title: 'New', addIdentities: [{ scheme: 'manual', value: 'Alias' }],
    }, dependencies)).rejects.toMatchObject({ status: 409, body: { code: 'STALE_REVISION', currentRevision: 3 } })
    expect(store.updateVulnerability).toHaveBeenCalledTimes(1)
    expect(store.insertIdentity).not.toHaveBeenCalled()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('maps an alias insert constraint only after proving another owner in a fresh post-rollback read', async () => {
    const { unit, store, run, dependencies } = fixture()
    store.insertIdentity.mockRejectedValue(new PersistenceConstraintError())
    store.findIdentities.mockResolvedValueOnce([]).mockResolvedValue([
      { id: randomUUID(), vulnerabilityId: otherId, scheme: 'manual', value: 'Alias' },
    ])
    await expect(updateSharedVulnerability(unit, id, {
      expectedRevision: 2, addIdentities: [{ scheme: 'manual', value: 'Alias' }],
    }, dependencies)).rejects.toMatchObject({ status: 409, body: { code: 'IDENTITY_CONFLICT' } })
    expect(store.insertIdentity).toHaveBeenCalledTimes(1)
    expect(store.updateVulnerability).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('propagates unproven insert constraints, unrelated write constraints and unavailable storage without retries', async () => {
    const first = fixture()
    const constraint = new PersistenceConstraintError()
    first.store.insertIdentity.mockRejectedValue(constraint)
    await expect(updateSharedVulnerability(first.unit, id, {
      expectedRevision: 2, addIdentities: [{ scheme: 'manual', value: 'Alias' }],
    }, first.dependencies)).rejects.toBe(constraint)
    expect(first.run).toHaveBeenCalledTimes(2)
    for (const failure of [constraint, new PersistenceUnavailableError()]) {
      const next = fixture()
      next.store.updateVulnerability.mockRejectedValue(failure)
      await expect(updateSharedVulnerability(next.unit, id, { expectedRevision: 2, title: 'New' }, next.dependencies)).rejects.toBe(failure)
      expect(next.run).toHaveBeenCalledTimes(1)
    }
  })
})
