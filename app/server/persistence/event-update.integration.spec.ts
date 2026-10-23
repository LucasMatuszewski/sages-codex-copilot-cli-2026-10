import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { DetectionEventRecord, VulnerabilityRecord } from '../application/ports/findings-store.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from './unit-of-work.js'

const at = '2026-10-23T08:00:00.000Z'
const later = '2026-10-23T09:00:00.000Z'
const vulnerabilityId = '10000000-0000-4000-8000-000000000001'
const eventId = '30000000-0000-4000-8000-000000000003'

function vulnerability(): VulnerabilityRecord {
  return {
    id: vulnerabilityId, title: 'Curated', description: null, componentName: 'Library', ecosystem: 'npm', vendor: null,
    affectedComponentVersions: null, generalExploit: null, exploitPrerequisites: null, remediationGuidance: null,
    fixedComponentVersions: null, category: 'dependency', weaknessCode: null, severity: 'high', severityRationale: null,
    score: null, scoreSystem: null, scoreVersion: null, scoreSource: null, exploitationSignal: null,
    exploitationEvidence: null, knowledgeAt: null, references: null, tags: [], status: 'review', closureNote: null,
    gapResolutions: [], createdAt: at, updatedAt: at, revision: 1,
  }
}

function event(): DetectionEventRecord {
  return {
    id: eventId, vulnerabilityId, source: 'scanner', sourceEventId: 'source-key', receiptAt: at,
    detectedAt: null, product: 'Raw product', productVersion: null, client: null, environment: null,
    installedComponentVersion: null, componentLocation: null, evidence: null, reviewNotes: 'Raw note',
    scannerAssessment: { severity: 'high', score: 0 }, productAffected: null, exploitabilityNotes: null,
    impactDescription: null, status: 'missing_data', closureNote: null, tags: ['old'], gapResolutions: [],
    reportingEvidence: { manufacturer: 'Raw maker', supportEnded: false }, incomingSharedSnapshot: { title: 'Candidate' },
    originalIntakeSnapshot: { source: 'scanner', sourceEventId: 'source-key', vulnerability: { id: vulnerabilityId, title: 'Candidate' } },
    requestFingerprint: 'b'.repeat(64), createdAt: at, updatedAt: at, revision: 1,
  }
}

describe('SQLite event update compare-and-set', () => {
  let directory: IsolatedDirectory | undefined
  let database: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let databasePath: string | undefined

  async function openFresh() {
    directory = await createIsolatedDirectory('cra-b07c-event-store-')
    databasePath = join(directory.path, 'findings.sqlite')
    database = await openFindingsDatabase(databasePath)
    await database.run(async (store) => { await store.insertVulnerability(vulnerability()); await store.insertEvent(event()) })
    return database
  }

  afterEach(async () => {
    await database?.close()
    database = undefined
    await directory?.cleanup()
    directory = undefined
    databasePath = undefined
  })

  it('increments once under expected revision, preserves omissions and immutable source columns across reopen', async () => {
    const store = await openFresh()
    const updated = await store.run((tx) => tx.updateEvent(eventId, 1, { product: 'Reviewed product', tags: ['new'] }, later))
    expect(updated).toMatchObject({ product: 'Reviewed product', productVersion: null, tags: ['new'], revision: 2, updatedAt: later })
    expect(updated).toMatchObject({
      id: eventId, vulnerabilityId, source: 'scanner', sourceEventId: 'source-key', receiptAt: at,
      incomingSharedSnapshot: event().incomingSharedSnapshot, originalIntakeSnapshot: event().originalIntakeSnapshot,
      requestFingerprint: event().requestFingerprint, createdAt: at,
    })
    await store.close()
    database = await openFindingsDatabase(databasePath!)
    const reopened = await database.run((tx) => tx.findEventById(eventId))
    expect(reopened).toEqual(updated)
    expect(await database.run((tx) => tx.updateEvent(eventId, 1, { product: 'Stale overwrite' }, later))).toBeNull()
    expect(await database.run((tx) => tx.updateEvent('40000000-0000-4000-8000-000000000004', 1, { product: 'Missing' }, later))).toBeNull()
    expect((await database.run((tx) => tx.findEventById(eventId)))?.product).toBe('Reviewed product')
  })
})
