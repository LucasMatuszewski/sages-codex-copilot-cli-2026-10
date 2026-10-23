import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SharedPatchResponseSchema } from '../../../shared/review-contracts.js'
import type { FindingsUnitOfWork } from '../ports/findings-store.js'
import { intakeFinding } from '../intake/command.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../../test-support/isolated-directory.js'
import { openFindingsDatabaseWithMigrationCount } from '../../persistence/unit-of-work.js'
import { getVulnerabilityDetail, updateSharedVulnerability } from './shared-update.js'

const at = '2026-10-23T09:00:00.000Z'
const reviewedAt = '2026-10-23T10:00:00.000Z'
const complete = {
  title: 'Synthetic title', description: 'Synthetic description', componentName: 'Library',
  category: 'dependency', severity: 'high', severityRationale: 'Local review',
}

describe('atomic shared review with real SQLite', () => {
  let directory: IsolatedDirectory | undefined
  let unit: FindingsUnitOfWork | undefined
  let path: string

  async function fresh(facts: Record<string, unknown> = complete) {
    directory = await createIsolatedDirectory('cra-b07b002-review-')
    path = join(directory.path, 'review.sqlite')
    unit = (await openFindingsDatabaseWithMigrationCount(path)).unitOfWork
    return intake(facts)
  }

  async function intake(facts: Record<string, unknown>, manualId: string = randomUUID()) {
    return intakeFinding(unit!, {
      source: 'manual', sourceEventId: randomUUID(),
      vulnerability: { identities: [{ scheme: 'manual', value: manualId }], ...facts },
      observation: { reviewNotes: 'Original note', scannerAssessment: { severity: 'critical', score: 0 } },
      reportingEvidence: { manufacturer: 'Synthetic manufacturer', notificationAssessment: 'undecided' },
    }, { now: () => at, newId: randomUUID })
  }

  async function snapshot() {
    return unit!.run(async (store) => {
      const vulnerabilities = await store.listVulnerabilities()
      return JSON.stringify({
        vulnerabilities, events: await store.listEvents(),
        identities: await Promise.all(vulnerabilities.map((row) => store.listIdentities(row.id))),
      })
    })
  }

  // Every successful and failed review operation must preserve complete persisted events.
  async function patch(id: unknown, input: unknown, dependencies = { now: () => reviewedAt, newId: randomUUID }) {
    const eventsBefore = await unit!.run(async (store) => JSON.stringify(await store.listEvents()))
    try { return await updateSharedVulnerability(unit!, id, input, dependencies) }
    finally {
      expect(await unit!.run(async (store) => JSON.stringify(await store.listEvents()))).toBe(eventsBefore)
    }
  }

  async function rejectPatch(id: unknown, input: unknown, status: number, code: string) {
    const before = await snapshot()
    const error: unknown = await patch(id, input).then(() => undefined, (cause: unknown) => cause)
    expect(error).toMatchObject({ status, body: { code, retryable: false } })
    expect(await snapshot()).toBe(before)
    return error
  }

  afterEach(async () => {
    try { await unit?.close() }
    finally { await directory?.cleanup(); unit = undefined; directory = undefined }
  })

  it('saves facts, score zero, evidence, tags and a deduplicated public alias once and restores after reopen', async () => {
    const created = await fresh()
    const result = SharedPatchResponseSchema.parse(await patch(created.vulnerabilityId, {
      expectedRevision: 1, title: ' Revised ', category: 'application', severity: 'low',
      severityRationale: null, scoreSource: 'Local score evidence', score: 0, scoreSystem: 'CVSS', scoreVersion: '4.0',
      exploitationEvidence: 'Synthetic evidence', knowledgeAt: '2026-10-23T12:00:00+02:00',
      tags: [' reviewed ', 'urgent', 'reviewed'], references: [{ label: 'Advisory', reference: 'local advisory' }],
      addIdentities: [{ scheme: 'cve', value: 'cve-2026-1234' }, { scheme: 'cve', value: ' CVE-2026-1234 ' }],
    }))
    expect(result.vulnerability).toMatchObject({
      title: 'Revised', category: 'application', severity: 'low', score: 0, scoreSystem: 'CVSS',
      severityRationale: null, scoreSource: 'Local score evidence', tags: ['reviewed', 'urgent'],
      knowledgeAt: reviewedAt, revision: 2, updatedAt: reviewedAt, status: 'review', gaps: [],
    })
    expect(result.identities.filter((identity) => identity.scheme === 'cve')).toEqual([{ scheme: 'cve', value: 'CVE-2026-1234' }])
    const before = await snapshot()
    await unit!.close()
    const reopened = await openFindingsDatabaseWithMigrationCount(path)
    unit = reopened.unitOfWork
    expect(reopened.appliedMigrations).toBe(0)
    expect(await snapshot()).toBe(before)
    expect((await getVulnerabilityDetail(unit, created.vulnerabilityId)).vulnerability).toEqual(result.vulnerability)
  })

  it('retains first accepted data and aliases when another change or no-op uses its stale revision', async () => {
    const created = await fresh()
    const first = await patch(created.vulnerabilityId, {
      expectedRevision: 1, title: 'First save', addIdentities: [{ scheme: 'cve', value: 'CVE-2026-FIRST' }],
    })
    expect(first.vulnerability.revision).toBe(2)
    const dependencies = { now: vi.fn(() => reviewedAt), newId: vi.fn(randomUUID) }
    for (const stale of [{ expectedRevision: 1, title: 'Lost update' }, { expectedRevision: 1 }]) {
      const before = await snapshot()
      await expect(patch(created.vulnerabilityId, stale, dependencies)).rejects.toMatchObject({
        status: 409, body: { code: 'STALE_REVISION', currentRevision: 2 },
      })
      expect(await snapshot()).toBe(before)
    }
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
    expect((await getVulnerabilityDetail(unit!, created.vulnerabilityId)).vulnerability.title).toBe('First save')
  })

  it('treats reordered tag sets and same-owner alias additions as semantic no-ops without clock or ID calls', async () => {
    const created = await fresh({ ...complete, tags: ['b', 'a'] })
    const detail = await getVulnerabilityDetail(unit!, created.vulnerabilityId)
    const dependencies = { now: vi.fn(() => reviewedAt), newId: vi.fn(randomUUID) }
    const before = await snapshot()
    for (const input of [
      { expectedRevision: 1 },
      { expectedRevision: 1, title: ' Synthetic title ', tags: ['a', 'b', 'a'], addIdentities: detail.identities },
    ]) {
      expect(await patch(created.vulnerabilityId, input, dependencies)).toEqual({ vulnerability: detail.vulnerability, identities: detail.identities })
      expect(await snapshot()).toBe(before)
    }
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(dependencies.newId).not.toHaveBeenCalled()
  })

  it('rolls back all facts and free aliases when any alias belongs to another owner', async () => {
    const first = await fresh()
    const other = await intake({ title: 'Other' }, 'other-owner')
    await rejectPatch(first.vulnerabilityId, {
      expectedRevision: 1, title: 'Must roll back', addIdentities: [
        { scheme: 'cve', value: 'CVE-2026-FREE' }, { scheme: 'manual', value: 'other-owner' },
      ],
    }, 409, 'IDENTITY_CONFLICT')
    expect((await getVulnerabilityDetail(unit!, other.vulnerabilityId)).identities).toEqual([{ scheme: 'manual', value: 'other-owner' }])
    expect(await unit!.run((store) => store.findIdentities([{ scheme: 'cve', value: 'CVE-2026-FREE' }]))).toEqual([])
  })

  it('rejects invalid fields/IDs/aliases with safe paths and zero writes, including removal and source evidence edits', async () => {
    const created = await fresh()
    const invalid: [unknown, string][] = [
      [[], '$'], [{ expectedRevision: 1, surprise: true }, '$'],
      [{ expectedRevision: 1, addIdentities: [{ scheme: 'manual', value: ' ' }] }, 'addIdentities[0].value'],
      [{ expectedRevision: 1, knowledgeAt: '2026-02-30T12:00:00Z' }, 'knowledgeAt'],
      [{ expectedRevision: 0 }, 'expectedRevision'], [{ expectedRevision: 1, status: null }, 'status'],
      [{ expectedRevision: 1, addIdentities: null }, 'addIdentities'],
      ...['identities', 'events', 'source', 'originalIntakeSnapshot', 'incomingSharedSnapshot', 'id'].map((key): [unknown, string] => [{ expectedRevision: 1, [key]: 'forbidden' }, '$']),
      [{ expectedRevision: 1, gapResolutions: [{ field: 'title', reason: 'Unknown' }] }, 'gapResolutions[0].field'],
    ]
    for (const [input, path] of invalid) {
      const error = await rejectPatch(created.vulnerabilityId, input, 400, 'INVALID_REQUEST')
      expect(error).toMatchObject({ body: { fieldErrors: expect.arrayContaining([expect.objectContaining({ path })]) } })
      expect(JSON.stringify(error)).not.toMatch(/Zod|SQLITE|stack|\.sqlite/)
    }
    await rejectPatch('invalid', { expectedRevision: 1 }, 400, 'INVALID_REQUEST')
    await rejectPatch(randomUUID(), { expectedRevision: 1 }, 404, 'VULNERABILITY_NOT_FOUND')
  })

  it('blocks progress/closure while gaps remain, then returns review when the last gap is resolved', async () => {
    const created = await fresh({ title: 'Only title' })
    for (const status of ['in_progress', 'review', 'closed']) {
      await rejectPatch(created.vulnerabilityId, { expectedRevision: 1, status, closureNote: 'Reviewed' }, 409, 'INVALID_STATUS_TRANSITION')
    }
    const result = await patch(created.vulnerabilityId, {
      expectedRevision: 1, description: 'Completed', componentName: null, category: 'unknown', severity: null,
      gapResolutions: ['componentName', 'category', 'severity'].map((field) => ({ field, reason: 'Not established locally' })),
    })
    expect(result.vulnerability).toMatchObject({ status: 'review', revision: 2, gaps: [] })
    await rejectPatch(created.vulnerabilityId, { expectedRevision: 2, status: 'missing_data' }, 409, 'INVALID_STATUS_TRANSITION')
    const cleared = await patch(created.vulnerabilityId, { expectedRevision: 2, gapResolutions: null })
    expect(cleared.vulnerability).toMatchObject({ status: 'missing_data', revision: 3, gapResolutions: [] })
    expect(cleared.vulnerability.gaps.map((gap) => gap.field)).toEqual(['componentName', 'category', 'severity'])
  })

  it('allows explicit progress/closure when the same patch completes facts and enforces merged closure-note invariants', async () => {
    const created = await fresh({ title: 'Incomplete' })
    const progress = await patch(created.vulnerabilityId, { expectedRevision: 1, ...complete, status: 'in_progress' })
    expect(progress.vulnerability).toMatchObject({ status: 'in_progress', revision: 2 })
    for (const closureNote of [undefined, null, ' ']) {
      await rejectPatch(created.vulnerabilityId, { expectedRevision: 2, status: 'closed', closureNote }, 409, 'INVALID_STATUS_TRANSITION')
    }
    const closed = await patch(created.vulnerabilityId, { expectedRevision: 2, status: 'closed', closureNote: ' Reviewed locally ' })
    expect(closed.vulnerability).toMatchObject({ status: 'closed', closureNote: 'Reviewed locally', revision: 3 })
    await rejectPatch(created.vulnerabilityId, { expectedRevision: 3, closureNote: null }, 409, 'INVALID_STATUS_TRANSITION')
    await rejectPatch(created.vulnerabilityId, { expectedRevision: 3, closureNote: ' ' }, 409, 'INVALID_STATUS_TRANSITION')
    const opened = await patch(created.vulnerabilityId, { expectedRevision: 3, status: 'review', closureNote: null })
    expect(opened.vulnerability).toMatchObject({ status: 'review', closureNote: null, revision: 4 })
    const direct = await freshSecondIncomplete()
    expect((await patch(direct, { expectedRevision: 1, ...complete, status: 'closed', closureNote: 'Complete now' })).vulnerability.status).toBe('closed')
  })

  async function freshSecondIncomplete() { return (await intake({ title: 'Another' })).vulnerabilityId }

  it('distinguishes omitted facts from explicit null clears and retains ordered references and explanation arrays', async () => {
    const created = await fresh({ ...complete, tags: ['a'], references: [{ label: 'One', reference: '1' }, { label: 'Two', reference: '2' }] })
    const first = await patch(created.vulnerabilityId, { expectedRevision: 1, vendor: 'Vendor' })
    expect(first.vulnerability).toMatchObject({ title: complete.title, tags: ['a'], vendor: 'Vendor' })
    const reordered = await patch(created.vulnerabilityId, { expectedRevision: 2, references: [{ label: 'Two', reference: '2' }, { label: 'One', reference: '1' }] })
    expect(reordered.vulnerability.revision).toBe(3)
    const cleared = await patch(created.vulnerabilityId, { expectedRevision: 3, vendor: null, tags: null, references: null, title: null })
    expect(cleared.vulnerability).toMatchObject({ vendor: null, tags: [], references: null, title: null, revision: 4, status: 'missing_data' })
    expect(cleared.vulnerability.gaps.map((gap) => gap.field)).toContain('title')
    const score = await patch(created.vulnerabilityId, { expectedRevision: 4, score: 0 })
    expect(score.vulnerability.gaps.map((gap) => gap.field)).toEqual(['title', 'scoreSystem', 'scoreVersion'])
    const reasons = [{ field: 'componentName', reason: 'Unknown' }, { field: 'category', reason: 'Unknown' }]
    const explained = await patch(created.vulnerabilityId, { expectedRevision: 5, gapResolutions: reasons })
    expect(explained.vulnerability.revision).toBe(6)
    expect((await patch(created.vulnerabilityId, { expectedRevision: 6, gapResolutions: [...reasons].reverse() })).vulnerability.revision).toBe(7)
  })
})
