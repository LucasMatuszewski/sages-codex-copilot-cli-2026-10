import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiErrorSchema } from '../../shared/common.js'
import { EventPatchResponseSchema } from '../../shared/event-review-contracts.js'
import { VulnerabilityDetailResponseSchema } from '../../shared/review-contracts.js'
import { intakeFinding } from '../application/intake/command.js'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { openFindingsDatabase } from '../persistence/unit-of-work.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { createHttpApp } from './app.js'

describe('event review HTTP PATCH', () => {
  let directory: IsolatedDirectory | undefined
  let unit: FindingsUnitOfWork | undefined
  let server: Server | undefined
  let baseUrl: string

  async function start() {
    directory = await createIsolatedDirectory('cra-b07c-event-http-')
    unit = await openFindingsDatabase(join(directory.path, 'findings.sqlite'))
    server = createHttpApp(unit).listen(0, '127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve)
      server!.once('error', reject)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing TCP address')
    baseUrl = `http://127.0.0.1:${address.port}/api/v1/events`
    return baseUrl
  }

  afterEach(async () => {
    try {
      if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
    } finally {
      try { await unit?.close() }
      finally { await directory?.cleanup(); server = undefined; unit = undefined; directory = undefined }
    }
  })

  function patch(id: string, body: unknown) {
    return fetch(`${baseUrl}/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  }

  it('updates an event independently and preserves raw snapshots through an explicit shared candidate adoption', async () => {
    await start()
    const created = await intakeFinding(unit!, {
      source: 'scanner', sourceEventId: 'event-http', vulnerability: {
        identities: [{ scheme: 'manual', value: 'event-http' }], title: 'Curated', category: 'dependency', componentName: 'Library',
      },
      observation: { reviewNotes: 'Raw review source', scannerAssessment: { severity: 'high', score: 0 } },
    }, { now: () => '2026-10-23T08:00:00.000Z', newId: randomUUID })
    const candidate = await intakeFinding(unit!, {
      source: 'scanner', sourceEventId: 'event-http-candidate', vulnerability: {
        id: created.vulnerabilityId, title: 'Candidate from second event', category: 'application', componentName: 'Other library',
      }, observation: { product: 'Second event product' },
    }, { now: () => '2026-10-23T08:05:00.000Z', newId: randomUUID })
    const before = await unit!.run(async (store) => ({
      parent: await store.findVulnerabilityById(created.vulnerabilityId),
      events: await store.listEvents(created.vulnerabilityId),
    }))
    const response = await patch(created.eventId, {
      expectedRevision: 1, detectedAt: '2026-10-23T10:00:00+02:00', product: 'Synthetic product',
      productVersion: '1', client: 'Synthetic client', installedComponentVersion: '1.2',
      status: 'in_progress', reportingEvidence: { manufacturer: 'Synthetic manufacturer' },
    })
    expect(response.status).toBe(200)
    const body = EventPatchResponseSchema.parse(await response.json())
    const event = body.event
    expect(event).toMatchObject({ status: 'in_progress', revision: 2, product: 'Synthetic product', reportingEvidence: { manufacturer: 'Synthetic manufacturer' } })
    const original = before.events.find((row) => row.id === created.eventId)!
    expect(event.originalIntakeSnapshot).toEqual(original.originalIntakeSnapshot)
    expect(event.incomingSharedSnapshot).toEqual(original.incomingSharedSnapshot)
    expect((await unit!.run((store) => store.findVulnerabilityById(created.vulnerabilityId)))?.status).toBe(before.parent?.status)

    const adopted = await fetch(`http://127.0.0.1:${new URL(baseUrl).port}/api/v1/vulnerabilities/${created.vulnerabilityId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expectedRevision: 1, title: 'Candidate from second event', category: 'application', componentName: 'Other library' }),
    })
    expect(adopted.status).toBe(200)
    const after = await unit!.run((store) => store.listEvents(created.vulnerabilityId))
    expect(after).toHaveLength(2)
    for (const prior of before.events) {
      const retained = after.find((row) => row.id === prior.id)!
      expect(retained.incomingSharedSnapshot).toEqual(prior.incomingSharedSnapshot)
      expect(retained.originalIntakeSnapshot).toEqual(prior.originalIntakeSnapshot)
      expect(retained.requestFingerprint).toBe(prior.requestFingerprint)
      expect(retained.sourceEventId).toBe(prior.sourceEventId)
    }
    expect(after.find((row) => row.id === candidate.eventId)?.incomingSharedSnapshot?.title).toBe('Candidate from second event')
  })

  it('allows only one same-revision HTTP event update and returns safe validation, missing and stale errors', async () => {
    await start()
    const created = await intakeFinding(unit!, {
      source: 'scanner', sourceEventId: 'event-race', vulnerability: { identities: [{ scheme: 'manual', value: 'event-race' }] },
      observation: { product: 'Initial' },
    })
    const before = await unit!.run((store) => store.findEventById(created.eventId))
    const responses = await Promise.all([
      patch(created.eventId, { expectedRevision: 1, reviewNotes: 'First update' }),
      patch(created.eventId, { expectedRevision: 1, reviewNotes: 'Second update' }),
    ])
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    const accepted = responses.find((response) => response.status === 200)!
    const rejected = responses.find((response) => response.status === 409)!
    const acceptedBody = EventPatchResponseSchema.parse(await accepted.json())
    expect(ApiErrorSchema.parse(await rejected.json())).toMatchObject({ code: 'STALE_REVISION', currentRevision: 2 })
    const detailResponse = await fetch(`http://127.0.0.1:${new URL(baseUrl).port}/api/v1/vulnerabilities/${created.vulnerabilityId}`)
    const detail = VulnerabilityDetailResponseSchema.parse(await detailResponse.json())
    expect(detail.events.find((item) => item.id === created.eventId)).toMatchObject(acceptedBody.event)
    const after = await unit!.run((store) => store.findEventById(created.eventId))
    expect(after?.revision).toBe(2)
    expect(after?.originalIntakeSnapshot).toEqual(before?.originalIntakeSnapshot)
    expect(after?.incomingSharedSnapshot).toEqual(before?.incomingSharedSnapshot)
    const winnerState = JSON.stringify(after)
    for (const [id, body, status, code] of [
      ['bad-uuid', { expectedRevision: 1 }, 400, 'INVALID_REQUEST'],
      [randomUUID(), { expectedRevision: 1 }, 404, 'EVENT_NOT_FOUND'],
      [created.eventId, { expectedRevision: 2, sourceEventId: 'changed' }, 400, 'INVALID_REQUEST'],
    ] as const) {
      const response = await patch(id, body)
      expect(response.status).toBe(status)
      const error = ApiErrorSchema.parse(await response.json())
      expect(error.code).toBe(code)
      expect(JSON.stringify(error)).not.toMatch(/Zod|SQLITE|stack|\.sqlite/)
    }
    expect(JSON.stringify(await unit!.run((store) => store.findEventById(created.eventId)))).toBe(winnerState)
  })
})
