import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { ApiErrorSchema } from '../../shared/common.js'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { intakeFinding } from '../application/intake/command.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from '../persistence/unit-of-work.js'
import { createHttpApp } from './app.js'

const common = {
  source: 'synthetic-register',
  vulnerability: {
    title: 'Synthetic register issue', description: 'Local fixture', componentName: 'lib-x',
    category: 'application', severity: 'high', severityRationale: 'Synthetic assessment',
  },
}

describe('vulnerability register HTTP collection with real SQLite', () => {
  let directory: IsolatedDirectory | undefined
  let unit: FindingsUnitOfWork | undefined
  let server: Server | undefined

  async function fresh() {
    directory = await createIsolatedDirectory('cra-b08a-register-route-')
    unit = await openFindingsDatabase(join(directory.path, 'register.sqlite'))
    server = createServer(createHttpApp(unit))
    await new Promise<void>((resolve, reject) => server!.listen(0, '127.0.0.1').once('listening', resolve).once('error', reject))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Local API did not bind an ephemeral loopback port.')
    return `http://127.0.0.1:${address.port}`
  }

  async function snapshot() {
    return unit!.run(async (store) => {
      const vulnerabilities = await store.listVulnerabilities()
      return JSON.stringify({
        vulnerabilities,
        events: await store.listEvents(),
        identities: await Promise.all(vulnerabilities.map((vulnerability) => store.listIdentities(vulnerability.id))),
      })
    })
  }

  afterEach(async () => {
    if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
    await unit?.close()
    unit = undefined
    await directory?.cleanup()
    directory = undefined
  })

  it('enforces same-event AND filters and leaves persisted SQLite state unchanged on successful reads', async () => {
    const base = await fresh()
    const first = await intakeFinding(unit!, {
      ...common, sourceEventId: 'atlas-cedar',
      vulnerability: { ...common.vulnerability, identities: [{ scheme: 'manual', value: 'b08a-shared-fixture' }] },
      observation: { detectedAt: '2026-10-20T12:00:00Z', product: 'Atlas', productVersion: '1.0', client: 'Cedar', installedComponentVersion: '2.0' },
    }, { now: () => '2026-10-22T10:00:00.000Z', newId: randomUUID })
    await intakeFinding(unit!, {
      ...common, sourceEventId: 'beacon-delta',
      vulnerability: { ...common.vulnerability, id: first.vulnerabilityId },
      observation: { detectedAt: '2026-10-22T12:00:00Z', product: 'Beacon', productVersion: '1.0', client: 'Delta', installedComponentVersion: '2.0' },
    }, { now: () => '2026-10-23T10:00:00.000Z', newId: randomUUID })
    const before = await snapshot()

    const split = await fetch(`${base}/api/v1/vulnerabilities?product=Atlas&client=Delta`)
    expect(split.status).toBe(200)
    expect(await split.json()).toMatchObject({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })

    const third = await intakeFinding(unit!, {
      ...common, sourceEventId: 'atlas-delta',
      vulnerability: { ...common.vulnerability, id: first.vulnerabilityId },
      observation: { detectedAt: '2026-10-22T12:00:00Z', product: 'Atlas', productVersion: '1.0', client: 'Delta', installedComponentVersion: '2.0' },
    }, { now: () => '2026-10-24T10:00:00.000Z', newId: randomUUID })
    const afterIntake = await snapshot()
    const matched = await fetch(`${base}/api/v1/vulnerabilities?product=Atlas&client=Delta`)
    expect(matched.status).toBe(200)
    expect(await matched.json()).toMatchObject({
      rows: [{ vulnerability: { id: first.vulnerabilityId }, eventCount: 3, matchingEventIds: [third.eventId] }],
      counts: { vulnerabilityCount: 1, matchingEventCount: 1 },
    })
    expect(await snapshot()).toBe(afterIntake)
    expect(before).not.toBe(afterIntake)
  }, 30_000)

  it('returns safe validation errors for malformed scalar query parameters', async () => {
    const base = await fresh()
    const response = await fetch(`${base}/api/v1/vulnerabilities?q=Atlas&q=Beacon`)
    expect(response.status).toBe(400)
    const body = ApiErrorSchema.parse(await response.json())
    expect(body.code).toBe('INVALID_REQUEST')
    expect(body.fieldErrors).toContainEqual({ path: 'q', code: expect.any(String), message: expect.any(String) })
    expect(JSON.stringify(body)).not.toMatch(/Zod|SQLITE|stack|\.sqlite/)
    expect(await snapshot()).toEqual(JSON.stringify({ vulnerabilities: [], events: [], identities: [] }))
  }, 30_000)
})
