import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ApiErrorSchema } from '../../shared/common.js'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { openFindingsDatabase } from '../persistence/unit-of-work.js'
import { createHttpApp } from './app.js'
import type { Server } from 'node:http'

async function listen(app: ReturnType<typeof createHttpApp>) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No TCP address')
  return { server, url: `http://127.0.0.1:${address.port}` }
}
async function close(server: Server) { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) }

describe('health transport', () => {
  let directory: IsolatedDirectory | undefined
  let unit: Awaited<ReturnType<typeof openFindingsDatabase>> | undefined
  let server: Server | undefined
  afterEach(async () => {
    if (server) await close(server)
    await unit?.close().catch(() => undefined)
    await directory?.cleanup()
    server = undefined; unit = undefined; directory = undefined
  })
  it('reports readiness only while the migrated storage transaction is available', async () => {
    directory = await createIsolatedDirectory('cra-b03-health-')
    const path = join(directory.path, 'findings.sqlite')
    unit = await openFindingsDatabase(path)
    const listener = await listen(createHttpApp(unit))
    server = listener.server
    const ready = await fetch(`${listener.url}/api/v1/health`)
    expect(ready.status).toBe(200)
    expect(ready.headers.get('content-type')).toContain('application/json')
    expect(await ready.json()).toEqual({ status: 'ok' })
    await unit.close()
    const unavailable = await fetch(`${listener.url}/api/v1/health`)
    expect(unavailable.status).toBe(503)
    const error = await unavailable.json()
    expect(ApiErrorSchema.safeParse(error).success).toBe(true)
    expect(error).toMatchObject({ code: 'STORAGE_UNAVAILABLE', retryable: true })
    expect(JSON.stringify(error)).not.toContain(path)
    unit = await openFindingsDatabase(path)
    await unit.run(async () => undefined)
  }, 30_000)
})
