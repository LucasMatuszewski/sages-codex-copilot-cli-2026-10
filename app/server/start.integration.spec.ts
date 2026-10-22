import Database from 'better-sqlite3'
import { writeFile } from 'node:fs/promises'
import { createServer, type Server as NetServer } from 'node:net'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ApiConfig } from './config.js'
import { createIsolatedDirectory, type IsolatedDirectory } from './test-support/isolated-directory.js'
import { startApi } from './start.js'

async function unusedPort() {
  const server = createServer()
  await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1').once('listening', resolve).once('error', reject))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No TCP address')
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return address.port
}
async function canBind(port: number) {
  const server = createServer()
  return await new Promise<boolean>((resolve) => {
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close((error) => resolve(!error)))
    server.listen(port, '127.0.0.1')
  })
}

describe('API lifecycle', () => {
  let directory: IsolatedDirectory | undefined
  let started: Awaited<ReturnType<typeof startApi>> | undefined
  let portBlocker: NetServer | undefined
  afterEach(async () => { await started?.close().catch(() => undefined); started = undefined; if (portBlocker?.listening) await new Promise<void>((resolve) => portBlocker?.close(() => resolve())); portBlocker = undefined; await directory?.cleanup(); directory = undefined })

  it('opens and migrates storage before listening, then closes listener and storage idempotently', async () => {
    directory = await createIsolatedDirectory('cra-b03-start-')
    const databasePath = join(directory.path, 'findings.sqlite')
    const config: ApiConfig = { host: '127.0.0.1', port: 3001, databasePath }
    started = await startApi(config, { port: 0 })
    const response = await fetch(`${started.address}/api/v1/health`)
    expect(response.status).toBe(200)
    const database = new Database(databasePath, { readonly: true })
    try {
      expect(database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vulnerabilities'").get())
        .toEqual({ name: 'vulnerabilities' })
      expect(database.prepare('SELECT COUNT(*) AS count FROM migrations').get()).toEqual({ count: 1 })
    } finally { database.close() }
    const port = Number(new URL(started.address).port)
    await Promise.all([started.close(), started.close()])
    expect(await canBind(port)).toBe(true)
  }, 30_000)

  it('reports a listener failure separately when an owned loopback port is occupied', async () => {
    directory = await createIsolatedDirectory('cra-b03-bind-fail-')
    portBlocker = createServer()
    await new Promise<void>((resolve, reject) => portBlocker?.listen(0, '127.0.0.1').once('listening', resolve).once('error', reject))
    const address = portBlocker.address()
    if (!address || typeof address === 'string') throw new Error('No TCP address')
    const config: ApiConfig = { host: '127.0.0.1', port: address.port, databasePath: join(directory.path, 'findings.sqlite') }
    await expect(startApi(config)).rejects.toMatchObject({ name: 'ApiListenerUnavailableError' })
    expect(portBlocker.listening).toBe(true)
  }, 30_000)

  it('does not listen when storage startup or migration fails', async () => {
    directory = await createIsolatedDirectory('cra-b03-start-fail-')
    const blocker = join(directory.path, 'not-a-directory')
    await writeFile(blocker, 'synthetic blocker')
    const port = await unusedPort()
    const config: ApiConfig = { host: '127.0.0.1', port, databasePath: join(blocker, 'findings.sqlite') }
    await expect(startApi(config)).rejects.toThrow()
    expect(await canBind(port)).toBe(true)
  }, 30_000)
})
