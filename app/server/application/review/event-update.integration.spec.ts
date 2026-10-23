import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { intakeFinding } from '../intake/command.js'
import { openFindingsDatabase } from '../../persistence/unit-of-work.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../../test-support/isolated-directory.js'
import { updateDetectionEvent } from './event-update.js'

describe('event review against SQLite and intake replay', () => {
  let directory: IsolatedDirectory | undefined
  let unit: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let databasePath: string | undefined

  async function openFresh() {
    directory = await createIsolatedDirectory('cra-b07c-event-app-')
    databasePath = join(directory.path, 'findings.sqlite')
    unit = await openFindingsDatabase(databasePath)
    return unit
  }

  afterEach(async () => {
    await unit?.close()
    unit = undefined
    await directory?.cleanup()
    directory = undefined
    databasePath = undefined
  })

  it('keeps original intake idempotency and snapshots while returning current event revision after reopen', async () => {
    const database = await openFresh()
    const original = {
      source: 'scanner', sourceEventId: 'stable-intake-token',
      vulnerability: { identities: [{ scheme: 'manual' as const, value: 'stable-idempotency' }], title: 'Incoming title' },
      observation: { product: 'Initial product', reviewNotes: 'Source note' },
    }
    const created = await intakeFinding(database, original, { now: () => '2026-10-23T08:00:00.000Z', newId: randomUUID })
    const before = await database.run(async (store) => ({
      parent: await store.findVulnerabilityById(created.vulnerabilityId), event: await store.findEventById(created.eventId),
    }))
    const changed = await updateDetectionEvent(database, created.eventId, {
      expectedRevision: 1, product: 'Reviewed product', productVersion: '2', client: 'Synthetic client',
      installedComponentVersion: '2.1', detectedAt: '2026-10-23T09:00:00Z',
      reportingEvidence: { manufacturer: 'Synthetic manufacturer' },
    }, { now: () => '2026-10-23T09:00:00.000Z' })
    expect(changed.event.revision).toBe(2)
    await database.close()
    unit = await openFindingsDatabase(databasePath!)
    const replay = await intakeFinding(unit, original, { now: () => '2026-10-23T10:00:00.000Z', newId: randomUUID })
    expect(replay).toMatchObject({ eventId: created.eventId, eventOutcome: 'replayed', eventRevision: 2 })
    const rawAfter = await unit.run(async (store) => ({
      parent: await store.findVulnerabilityById(created.vulnerabilityId), event: await store.findEventById(created.eventId),
    }))
    expect(rawAfter.event?.originalIntakeSnapshot).toEqual(before.event?.originalIntakeSnapshot)
    expect(rawAfter.event?.incomingSharedSnapshot).toEqual(before.event?.incomingSharedSnapshot)
    expect(rawAfter.event?.requestFingerprint).toBe(before.event?.requestFingerprint)
    expect(rawAfter.event?.sourceEventId).toBe(before.event?.sourceEventId)
    expect(rawAfter.event?.revision).toBe(2)
    expect(rawAfter.parent).toEqual(before.parent)
    await expect(intakeFinding(unit, { ...original, observation: { ...original.observation, product: 'Changed under old token' } }))
      .rejects.toMatchObject({ body: { code: 'SOURCE_EVENT_CONFLICT' } })
  })
})
