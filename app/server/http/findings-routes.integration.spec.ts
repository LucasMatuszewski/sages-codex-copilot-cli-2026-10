import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiErrorSchema } from '../../shared/common.js'
import { FindingCreateResponseSchema } from '../../shared/finding-contracts.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from '../persistence/unit-of-work.js'
import { createHttpApp } from './app.js'

describe('production finding intake transport', () => {
  let directory: IsolatedDirectory | undefined
  let unit: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let server: Server | undefined
  async function start() {
    directory = await createIsolatedDirectory('cra-b06-http-')
    unit = await openFindingsDatabase(join(directory.path, 'findings.sqlite'))
    server = createHttpApp(unit).listen(0, '127.0.0.1')
    await new Promise<void>((resolve, reject) => {
      server!.once('listening', resolve)
      server!.once('error', reject)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No TCP address')
    return `http://127.0.0.1:${address.port}/api/v1/findings`
  }
  function post(url: string, input: unknown) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
  }
  const request = { source: 'scanner-a', sourceEventId: 'synthetic-001', vulnerability: { identities: [{ scheme: 'cve', value: ' cve-2026-12345 ' }] } }
  afterEach(async () => {
    try {
      if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
    } finally {
      try { await unit?.close() }
      finally {
        await directory?.cleanup()
        server = undefined; unit = undefined; directory = undefined
      }
    }
  })

  it('retains an identifiable incomplete finding through the production POST route', async () => {
    const url = await start()
    const response = await post(url, request)
    expect(response.status).toBe(201)
    const body = FindingCreateResponseSchema.parse(await response.json())
    expect(body).toMatchObject({ vulnerabilityOutcome: 'created', eventOutcome: 'created', vulnerabilityStatus: 'missing_data', eventStatus: 'missing_data', vulnerabilityRevision: 1, eventRevision: 1 })
    const saved = await unit!.run(async (store) => ({ vulnerabilities: await store.listVulnerabilities(), events: await store.listEvents(), identities: await store.listIdentities(body.vulnerabilityId) }))
    expect(saved.vulnerabilities).toHaveLength(1)
    expect(saved.events).toHaveLength(1)
    expect(saved.identities).toMatchObject([{ vulnerabilityId: body.vulnerabilityId, scheme: 'cve', value: 'CVE-2026-12345' }])
    expect(saved.events[0]).toMatchObject({ id: body.eventId, vulnerabilityId: body.vulnerabilityId, detectedAt: null })
  })

  it('rejects materially changed source-key reuse after successful creation without any write', async () => {
    const url = await start()
    expect((await post(url, request)).status).toBe(201)
    const before = await unit!.run(async (store) => JSON.stringify([await store.listVulnerabilities(), await store.listEvents(), await store.findIdentities(request.vulnerability.identities)]))
    const conflict = await post(url, { ...request, vulnerability: { ...request.vulnerability, title: 'Changed candidate' } })
    expect(conflict.status).toBe(409)
    expect(ApiErrorSchema.parse(await conflict.json())).toMatchObject({ code: 'SOURCE_EVENT_CONFLICT', retryable: false })
    const after = await unit!.run(async (store) => JSON.stringify([await store.listVulnerabilities(), await store.listEvents(), await store.findIdentities(request.vulnerability.identities)]))
    expect(after).toBe(before)
  })

  it('returns an exact retry as200 with original IDs and no extra records', async () => {
    const url = await start()
    const first = await post(url, request)
    expect(first.status).toBe(201)
    const original = FindingCreateResponseSchema.parse(await first.json())
    const replay = await post(url, request)
    expect(replay.status).toBe(200)
    expect(FindingCreateResponseSchema.parse(await replay.json())).toEqual({ ...original, vulnerabilityOutcome: 'reused', eventOutcome: 'replayed' })
    expect(await unit!.run(async (store) => [ (await store.listVulnerabilities()).length, (await store.listEvents()).length ])).toEqual([1, 1])
  })

  it('returns strict safe field errors including bracket indices and root paths without retaining invalid requests', async () => {
    const url = await start()
    const invalid: [unknown, string][] = [
      [[], '$'], [{ ...request, source: ' ' }, 'source'], [{ ...request, sourceEventId: '' }, 'sourceEventId'],
      [{ ...request, vulnerability: { id: 'invalid' } }, 'vulnerability.id'],
      [{ ...request, vulnerability: {} }, 'vulnerability.id'],
      [{ ...request, vulnerability: { ...request.vulnerability, id: randomUUID() } }, 'vulnerability.identities'],
      [{ ...request, vulnerability: { identities: [{ scheme: 'manual', value: ' ' }] } }, 'vulnerability.identities[0].value'],
      [{ ...request, vulnerability: { ...request.vulnerability, category: 'invalid' } }, 'vulnerability.category'],
      [{ ...request, observation: { detectedAt: '2026-02-30T12:00:00Z' } }, 'observation.detectedAt'],
      [{ ...request, observation: { detectedAt: '2026-10-22T12:00:00' } }, 'observation.detectedAt'],
      [{ ...request, unknown: 'forbidden' }, '$'],
      [{ ...request, observation: { scannerAssessment: { unknown: true } } }, 'observation.scannerAssessment'],
    ]
    for (const [input, path] of invalid) {
      const response = await post(url, input)
      expect(response.status).toBe(400)
      const error = ApiErrorSchema.parse(await response.json())
      expect(error).toMatchObject({ code: 'INVALID_REQUEST', retryable: false })
      expect(error.fieldErrors.some((field) => field.path === path)).toBe(true)
      expect(JSON.stringify(error)).not.toMatch(/Zod|SQLITE|stack|\.sqlite/)
    }
    expect(await unit!.run(async (store) => [await store.listVulnerabilities(), await store.listEvents(), await store.findIdentities([{ scheme: 'cve', value: 'CVE-2026-12345' }])])).toEqual([[], [], []])
  })

  it('returns404 for absent selected UUIDs and409 for multiple exact owners without mutations', async () => {
    const url = await start()
    const missing = await post(url, { source: 'manual', sourceEventId: randomUUID(), vulnerability: { id: randomUUID() } })
    expect(missing.status).toBe(404)
    expect(ApiErrorSchema.parse(await missing.json())).toMatchObject({ code: 'VULNERABILITY_NOT_FOUND', retryable: false })
    const first = await post(url, request)
    expect(first.status).toBe(201)
    const firstBody = FindingCreateResponseSchema.parse(await first.json())
    const otherIdentity = { scheme: 'euvd', value: 'EUVD-2026-123' }
    const other = await post(url, { ...request, sourceEventId: 'other-key', vulnerability: { identities: [otherIdentity] } })
    expect(other.status).toBe(201)
    const before = await unit!.run(async (store) => JSON.stringify([await store.listVulnerabilities(), await store.listEvents(), await store.listIdentities(firstBody.vulnerabilityId)]))
    const conflict = await post(url, { ...request, sourceEventId: 'multi-owner', vulnerability: { identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }, otherIdentity, { scheme: 'manual', value: 'new' }] } })
    expect(conflict.status).toBe(409)
    expect(ApiErrorSchema.parse(await conflict.json())).toMatchObject({ code: 'IDENTITY_CONFLICT', retryable: false })
    expect(await unit!.run(async (store) => JSON.stringify([await store.listVulnerabilities(), await store.listEvents(), await store.listIdentities(firstBody.vulnerabilityId)]))).toBe(before)
  })

  it('handles real simultaneous HTTP deliveries with one retained event per source key', async () => {
    const url = await start()
    const same = await Promise.all([post(url, request), post(url, request)])
    expect(same.map((response) => response.status).sort()).toEqual([200, 201])
    const bodies = await Promise.all(same.map(async (response) => FindingCreateResponseSchema.parse(await response.json())))
    expect(bodies[0]?.eventId).toBe(bodies[1]?.eventId)
    const next = { ...request, sourceEventId: 'race-changed' }
    const changed = await Promise.all([post(url, next), post(url, { ...next, vulnerability: { ...next.vulnerability, title: 'Different content' } })])
    expect(changed.map((response) => response.status).sort()).toEqual([201, 409])
    const error = changed.find((response) => response.status === 409)!
    expect(ApiErrorSchema.parse(await error.json()).code).toBe('SOURCE_EVENT_CONFLICT')
    expect(await unit!.run(async (store) => [(await store.listVulnerabilities()).length, (await store.listEvents()).length, (await store.listIdentities(bodies[0]!.vulnerabilityId)).length])).toEqual([1, 2, 1])
  })

  it('maps actual closed storage to503 with no partial intake on reopen', async () => {
    const url = await start()
    await unit!.close()
    const unavailable = await post(url, request)
    expect(unavailable.status).toBe(503)
    const error = ApiErrorSchema.parse(await unavailable.json())
    expect(error).toMatchObject({ code: 'STORAGE_UNAVAILABLE', retryable: true })
    expect(JSON.stringify(error)).not.toMatch(/SQLITE|stack|\.sqlite/)
    const reopened = await openFindingsDatabase(join(directory!.path, 'findings.sqlite'))
    try {
      expect(await reopened.run(async (store) => [await store.listVulnerabilities(), await store.listEvents()])).toEqual([[], []])
    } finally { await reopened.close() }
  })
})
