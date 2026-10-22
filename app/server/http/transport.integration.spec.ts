import { join } from 'node:path'
import { Router } from 'express'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiErrorSchema } from '../../shared/common.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from '../persistence/unit-of-work.js'
import { createHttpApp } from './app.js'
import type { Server } from 'node:http'

async function start(unitOfWork: Awaited<ReturnType<typeof openFindingsDatabase>>) {
  let calls = 0
  const testRoutes = Router()
  testRoutes.post('/api/v1/__test/ack', (req, res) => { calls++; res.json({ accepted: req.body }) })
  testRoutes.post('/api/v1/__test/throw', (_req, _res, next) => next(new Error('SQL /private/synthetic/path')))
  const server = createHttpApp(unitOfWork, testRoutes).listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const addr = server.address()
  if (!addr || typeof addr === 'string') throw new Error('No TCP address')
  return { server, url: `http://127.0.0.1:${addr.port}`, calls: () => calls }
}
async function stop(server: Server) { await new Promise<void>((resolve) => server.close(() => resolve())) }
async function post(url: string, body: string, contentType?: string, extra: Record<string,string> = {}, path = '/api/v1/__test/ack') {
  return fetch(`${url}${path}`, { method: 'POST', headers: { ...(contentType ? { 'content-type': contentType } : {}), ...extra }, body: new TextEncoder().encode(body) })
}

describe('HTTP transport', () => {
  let server: Server | undefined
  let unit: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let directory: IsolatedDirectory | undefined
  afterEach(async () => { if (server) await stop(server); server = undefined; await unit?.close(); unit = undefined; await directory?.cleanup(); directory = undefined })
  it('accepts JSON and rejects unsafe or malformed transport before fixture side effects', async () => {
    directory = await createIsolatedDirectory('cra-b03-transport-')
    unit = await openFindingsDatabase(join(directory.path, 'findings.sqlite'))
    const fixture = await start(unit); server = fixture.server
    expect((await post(fixture.url, '{"ok":true}', 'application/json; charset=utf-8')).status).toBe(200)
    const cases: Array<[string, Response, number, string]> = [
      ['malformed JSON', await post(fixture.url, '{', 'application/json'), 400, 'INVALID_JSON'],
      ['over 1 MiB', await post(fixture.url, JSON.stringify({ value: 'x'.repeat(1_048_580) }), 'application/json'), 413, 'PAYLOAD_TOO_LARGE'],
      ['text/plain', await post(fixture.url, 'x', 'text/plain'), 415, 'UNSUPPORTED_MEDIA_TYPE'],
      ['missing content type', await post(fixture.url, 'x'), 415, 'UNSUPPORTED_MEDIA_TYPE'],
      ['unsupported charset', await post(fixture.url, '{}', 'application/json; charset=iso-8859-1'), 415, 'UNSUPPORTED_MEDIA_TYPE'],
      ['unsupported content encoding', await post(fixture.url, 'x', 'application/json', { 'content-encoding': 'compress' }), 415, 'UNSUPPORTED_MEDIA_TYPE'],
      ['malformed gzip', await post(fixture.url, 'not-gzip', 'application/json', { 'content-encoding': 'gzip' }), 400, 'INVALID_JSON'],
    ]
    for (const [description, response, status, code] of cases) {
      expect(response.status, description).toBe(status)
      const error = await response.json()
      expect(ApiErrorSchema.safeParse(error).success).toBe(true)
      expect(error).toMatchObject({ code, retryable: false, fieldErrors: [] })
    }
    expect(fixture.calls()).toBe(1)
    const boundaryBody = JSON.stringify({ value: 'x'.repeat(1_048_576 - Buffer.byteLength(JSON.stringify({ value: '' }))) })
    expect(Buffer.byteLength(boundaryBody)).toBe(1_048_576)
    expect((await post(fixture.url, boundaryBody, 'application/json')).status).toBe(200)
    expect(fixture.calls()).toBe(2)
    const thrown = await post(fixture.url, '{}', 'application/json', {}, '/api/v1/__test/throw')
    expect(thrown.status).toBe(500)
    const thrownBody = await thrown.json()
    expect(ApiErrorSchema.safeParse(thrownBody).success).toBe(true)
    expect(JSON.stringify(thrownBody)).not.toMatch(/SQL|private|synthetic|path/)
    const missing = await fetch(`${fixture.url}/api/v1/missing`)
    expect(missing.status).toBe(404)
    expect(ApiErrorSchema.safeParse(await missing.json()).success).toBe(true)
  }, 30_000)
})
