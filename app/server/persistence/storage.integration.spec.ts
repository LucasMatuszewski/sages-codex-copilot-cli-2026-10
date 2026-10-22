import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { DetectionEventRecord, VulnerabilityIdentityRecord, VulnerabilityRecord } from '../application/ports/findings-store.js'
import { PersistenceConstraintError, PersistenceUnavailableError } from '../application/ports/findings-store.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from './unit-of-work.js'

const at = '2026-10-22T08:00:00.000Z'
const later = '2026-10-22T08:05:00.000Z'
const vulnerabilityId = '10000000-0000-4000-8000-000000000001'
const identityId = '20000000-0000-4000-8000-000000000002'
const eventId = '30000000-0000-4000-8000-000000000003'
const alternateVulnerabilityId = '50000000-0000-4000-8000-000000000005'

function vulnerability(id = vulnerabilityId): VulnerabilityRecord {
  return {
    id, title: 'Produkt testowy', description: null, componentName: 'Paczka testowa', ecosystem: 'npm',
    vendor: null, affectedComponentVersions: '1.0.0', generalExploit: null, exploitPrerequisites: null,
    remediationGuidance: null, fixedComponentVersions: null, category: 'dependency', weaknessCode: null,
    severity: 'high', severityRationale: null, score: 7.5, scoreSystem: 'CVSS', scoreVersion: null,
    scoreSource: 'scanner-a', exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null,
    references: [{ label: 'Advisory', reference: 'https://example.test/advisory', observedAt: null }],
    tags: ['synthetic'], status: 'missing_data', closureNote: null, gapResolutions: [],
    createdAt: at, updatedAt: at, revision: 1,
  }
}

function identity(id = identityId, parentId = vulnerabilityId, scheme = 'cve', value = 'CVE-2026-12345'): VulnerabilityIdentityRecord {
  return { id, vulnerabilityId: parentId, scheme, value }
}

function event(id = eventId, parentId = vulnerabilityId, source = 'scanner-a', sourceEventId = 'run-001'): DetectionEventRecord {
  return {
    id, vulnerabilityId: parentId, source, sourceEventId, receiptAt: at,
    detectedAt: null, product: 'Produkt testowy', productVersion: null, client: 'Klient testowy',
    environment: null, installedComponentVersion: '1.0.0', componentLocation: null, evidence: null,
    reviewNotes: null, scannerAssessment: { severity: 'high', score: 7.5 }, productAffected: null,
    exploitabilityNotes: null, impactDescription: null, status: 'missing_data', closureNote: null,
    tags: [], gapResolutions: [],
    reportingEvidence: { manufacturer: 'Producent testowy', product: 'Produkt testowy', memberStates: ['PL'], awareness: { at, accuracy: 'exact', basis: null } },
    incomingSharedSnapshot: { title: 'Produkt testowy', severity: 'high', score: 7.5, tags: ['synthetic'] },
    originalIntakeSnapshot: {
      source, sourceEventId,
      vulnerability: { title: 'Produkt testowy', identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }] },
      reportingEvidence: null,
    },
    requestFingerprint: 'a'.repeat(64), createdAt: at, updatedAt: at, revision: 1,
  }
}

describe('findings persistence', () => {
  let directory: IsolatedDirectory | undefined
  let database: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let databasePath: string | undefined

  async function openFresh() {
    directory = await createIsolatedDirectory('cra-b02-store-')
    databasePath = join(directory.path, 'findings.sqlite')
    database = await openFindingsDatabase(databasePath)
    return database
  }

  afterEach(async () => {
    await database?.close()
    database = undefined
    await directory?.cleanup()
    directory = undefined
    databasePath = undefined
  })

  it('round-trips complete records, JSON snapshots, nullable facts, and score through reopen', async () => {
    const store = await openFresh()
    await store.run(async (tx) => {
      await tx.insertVulnerability(vulnerability())
      await tx.insertIdentity(identity())
      await tx.insertEvent(event())
    })
    await store.close()
    database = await openFindingsDatabase(databasePath!)
    const loaded = await database.run(async (tx) => ({
      vulnerability: await tx.findVulnerabilityById(vulnerabilityId),
      identities: await tx.listIdentities(vulnerabilityId),
      event: await tx.findEventById(eventId),
    }))
    expect(loaded.vulnerability).toEqual(vulnerability())
    expect(loaded.identities).toEqual([identity()])
    expect(loaded.event).toEqual(event())
    expect(loaded.vulnerability?.score).toBe(7.5)
    expect(loaded.event?.originalIntakeSnapshot).toEqual(event().originalIntakeSnapshot)
    expect(loaded.event?.receiptAt).toBe(at)
  })

  it('enforces global exact identity and source-event keys and foreign keys', async () => {
    const store = await openFresh()
    await store.run(async (tx) => {
      await tx.insertVulnerability(vulnerability())
      await tx.insertVulnerability(vulnerability(alternateVulnerabilityId))
      await tx.insertIdentity(identity())
      await tx.insertIdentity(identity('20000000-0000-4000-8000-000000000004', vulnerabilityId, 'manual', 'CVE-2026-12345'))
      await tx.insertEvent(event())
      await tx.insertEvent(event('30000000-0000-4000-8000-000000000008', vulnerabilityId, 'scanner-a', 'run-002'))
      await tx.insertEvent(event('30000000-0000-4000-8000-000000000009', vulnerabilityId, 'scanner-b', 'run-001'))
    })
    await expect(store.run((tx) => tx.insertIdentity(identity('20000000-0000-4000-8000-000000000006', alternateVulnerabilityId))))
      .rejects.toBeInstanceOf(PersistenceConstraintError)
    await expect(store.run((tx) => tx.insertEvent(event('30000000-0000-4000-8000-000000000004', alternateVulnerabilityId))))
      .rejects.toBeInstanceOf(PersistenceConstraintError)
    await expect(store.run((tx) => tx.insertIdentity(identity('20000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000006'))))
      .rejects.toBeInstanceOf(PersistenceConstraintError)
    await expect(store.run((tx) => tx.insertEvent(event('30000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000006', 'scanner-b', 'orphan'))))
      .rejects.toBeInstanceOf(PersistenceConstraintError)
    expect(await store.run((tx) => tx.findIdentities([{ scheme: 'cve', value: 'CVE-2026-12345' }]))).toEqual([identity()])
    expect(await store.run((tx) => tx.listEvents(vulnerabilityId))).toHaveLength(3)
  })

  it('rolls back earlier valid writes on a later constraint failure and keeps the queue usable', async () => {
    const store = await openFresh()
    await expect(store.run(async (tx) => {
      await tx.insertVulnerability(vulnerability())
      await tx.insertIdentity(identity())
      await tx.insertEvent(event(eventId, '60000000-0000-4000-8000-000000000006'))
    })).rejects.toBeInstanceOf(PersistenceConstraintError)
    expect(await store.run(async (tx) => [
      await tx.findVulnerabilityById(vulnerabilityId), await tx.listIdentities(vulnerabilityId), await tx.listEvents(vulnerabilityId),
    ])).toEqual([null, [], []])
    const callbackFailure = new Error('synthetic callback failure')
    await expect(store.run(async (tx) => { await tx.insertVulnerability(vulnerability()); throw callbackFailure })).rejects.toBe(callbackFailure)
    expect(await store.run((tx) => tx.findVulnerabilityById(vulnerabilityId))).toBeNull()
    await store.run((tx) => tx.insertVulnerability(vulnerability()))
    expect(await store.run((tx) => tx.findVulnerabilityById(vulnerabilityId))).toEqual(vulnerability())
  })

  it('rejects zero and negative revisions in the database without leaving partial records', async () => {
    const store = await openFresh()
    const zeroVulnerability = await store.run((tx) => tx.insertVulnerability({ ...vulnerability(), revision: 0 }))
      .then(() => null, (error: unknown) => error)
    expect(zeroVulnerability).toBeInstanceOf(PersistenceConstraintError)
    expect((zeroVulnerability as Error).message).toBe('Persistence constraint rejected the operation.')
    const negativeVulnerability = await store.run((tx) => tx.insertVulnerability({ ...vulnerability(), revision: -1 }))
      .then(() => null, (error: unknown) => error)
    expect(negativeVulnerability).toBeInstanceOf(PersistenceConstraintError)
    expect((negativeVulnerability as Error).message).toBe('Persistence constraint rejected the operation.')
    expect(await store.run((tx) => tx.findVulnerabilityById(vulnerabilityId))).toBeNull()

    await store.run((tx) => tx.insertVulnerability(vulnerability()))
    const zeroEvent = await store.run((tx) => tx.insertEvent({ ...event(), revision: 0 }))
      .then(() => null, (error: unknown) => error)
    expect(zeroEvent).toBeInstanceOf(PersistenceConstraintError)
    expect((zeroEvent as Error).message).toBe('Persistence constraint rejected the operation.')
    const negativeEvent = await store.run((tx) => tx.insertEvent({ ...event('30000000-0000-4000-8000-000000000004'), revision: -1 }))
      .then(() => null, (error: unknown) => error)
    expect(negativeEvent).toBeInstanceOf(PersistenceConstraintError)
    expect((negativeEvent as Error).message).toBe('Persistence constraint rejected the operation.')
    expect(await store.run((tx) => tx.listEvents(vulnerabilityId))).toEqual([])
    expect(await store.run((tx) => tx.findVulnerabilityById(vulnerabilityId))).toEqual(vulnerability())
  })

  it('serializes full callbacks, hides uncommitted data, and resolves concurrent exact-key writes safely', async () => {
    const store = await openFresh()
    let releaseFirst!: () => void
    const held = new Promise<void>((resolve) => { releaseFirst = resolve })
    let firstStarted!: () => void
    const started = new Promise<void>((resolve) => { firstStarted = resolve })
    let secondBegan = false
    const first = store.run(async (tx) => {
      await tx.insertVulnerability(vulnerability())
      firstStarted()
      await held
      throw new Error('rollback held transaction')
    })
    let second: Promise<VulnerabilityRecord | null> | undefined
    let secondWasBlocked = false
    try {
      await Promise.race([started, first.then(() => undefined, () => undefined)])
      second = store.run(async (tx) => { secondBegan = true; return await tx.findVulnerabilityById(vulnerabilityId) })
      await Promise.resolve()
      await new Promise<void>((resolve) => setImmediate(resolve))
      secondWasBlocked = !secondBegan
    } finally {
      releaseFirst()
    }
    const firstResult = await Promise.allSettled([first])
    const secondResult = second ? await Promise.allSettled([second]) : []
    expect(secondWasBlocked).toBe(true)
    expect(firstResult[0]).toMatchObject({ status: 'rejected', reason: new Error('rollback held transaction') })
    expect(secondResult[0]).toMatchObject({ status: 'fulfilled', value: null })

    await store.run((tx) => tx.insertVulnerability(vulnerability()))
    const outcomes = await Promise.allSettled([
      store.run((tx) => tx.insertIdentity(identity())),
      store.run((tx) => tx.insertIdentity(identity('20000000-0000-4000-8000-000000000008'))),
    ])
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((outcome) => outcome.status === 'rejected' && outcome.reason instanceof PersistenceConstraintError)).toHaveLength(1)
    expect(await store.run((tx) => tx.listIdentities(vulnerabilityId))).toHaveLength(1)
  })

  it('updates with revision compare-and-set while preserving omitted values', async () => {
    const store = await openFresh()
    await store.run((tx) => tx.insertVulnerability(vulnerability()))
    const changed = await store.run((tx) => tx.updateVulnerability(vulnerabilityId, 1, { title: 'Revised', description: 'Updated detail' }, later))
    expect(changed).toEqual({ ...vulnerability(), title: 'Revised', description: 'Updated detail', updatedAt: later, revision: 2 })
    const cleared = await store.run((tx) => tx.updateVulnerability(vulnerabilityId, 2, { description: null }, later))
    expect(cleared?.description).toBeNull()
    expect(cleared?.revision).toBe(3)
    expect(await store.run((tx) => tx.updateVulnerability(vulnerabilityId, 1, { title: 'stale' }, later))).toBeNull()
    expect(await store.run((tx) => tx.updateVulnerability(alternateVulnerabilityId, 1, { title: 'missing' }, later))).toBeNull()
    expect(await store.run((tx) => tx.findVulnerabilityById(vulnerabilityId))).toEqual(cleared)
  })

  it('drains accepted work on close and rejects later work with a sanitized error', async () => {
    const store = await openFresh()
    let escapedStore: import('../application/ports/findings-store.js').FindingsStore | undefined
    await store.run(async (tx) => { escapedStore = tx })
    await expect(escapedStore!.findVulnerabilityById(vulnerabilityId)).rejects.toBeInstanceOf(PersistenceUnavailableError)
    let release!: () => void
    const barrier = new Promise<void>((resolve) => { release = resolve })
    const accepted = store.run(async (tx) => { await tx.insertVulnerability(vulnerability()); await barrier })
    const close = store.close()
    let laterWorkAssertion: unknown
    try {
      await expect(store.run(async () => undefined)).rejects.toBeInstanceOf(PersistenceUnavailableError)
    } catch (error) {
      laterWorkAssertion = error
    } finally {
      release()
    }
    const [acceptedResult, closeResult] = await Promise.allSettled([accepted, close])
    expect(acceptedResult).toMatchObject({ status: 'fulfilled' })
    expect(closeResult).toMatchObject({ status: 'fulfilled' })
    if (laterWorkAssertion) throw laterWorkAssertion
    await expect(openFindingsDatabase(databasePath!.concat('/blocked.sqlite'))).rejects.toBeInstanceOf(PersistenceUnavailableError)
  })
})
