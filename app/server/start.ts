import { createServer, type Server } from 'node:http'
import type { ApiConfig } from './config.js'
import { PersistenceUnavailableError } from './application/ports/findings-store.js'
import { createHttpApp } from './http/app.js'
import { openFindingsDatabase, resolveDatabasePath } from './persistence/unit-of-work.js'

export class ApiListenerUnavailableError extends Error {
  constructor() { super('The API listener could not start.'); this.name = 'ApiListenerUnavailableError' }
}

export interface StartedApi {
  server: Server
  address: string
  close(): Promise<void>
}

export async function startApi(config: ApiConfig, options: { port?: number } = {}): Promise<StartedApi> {
  if (config.host !== '127.0.0.1' && config.host !== '::1') throw new Error('API_HOST must be a loopback address.')
  const port = options.port ?? config.port
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('API_PORT must be an integer from 0 to 65535.')

  let unitOfWork: Awaited<ReturnType<typeof openFindingsDatabase>>
  try {
    unitOfWork = await openFindingsDatabase(resolveDatabasePath(config.databasePath))
  } catch {
    throw new PersistenceUnavailableError()
  }

  const server = createServer(createHttpApp(unitOfWork))
  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error)
      server.once('error', onError)
      server.once('listening', () => {
        server.off('error', onError)
        resolve()
      })
      server.listen(port, config.host)
    })
  } catch {
    await unitOfWork.close().catch(() => undefined)
    throw new ApiListenerUnavailableError()
  }

  const boundAddress = server.address()
  if (!boundAddress || typeof boundAddress === 'string') {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await unitOfWork.close()
    throw new ApiListenerUnavailableError()
  }
  const host = config.host === '::1' ? '[::1]' : config.host
  const address = `http://${host}:${boundAddress.port}`
  let closePromise: Promise<void> | undefined
  return {
    server,
    address,
    close() {
      if (closePromise) return closePromise
      closePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      }).finally(() => unitOfWork.close())
      return closePromise
    },
  }
}
