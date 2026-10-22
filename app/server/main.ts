import { readApiConfig } from './config.js'
import { ApiListenerUnavailableError, startApi } from './start.js'
import { PersistenceUnavailableError } from './application/ports/findings-store.js'

async function main() {
  let config
  try {
    config = readApiConfig()
  } catch {
    process.stderr.write('API configuration is invalid.\n')
    process.exitCode = 1
    return
  }

  let api
  try {
    api = await startApi(config)
  } catch (error) {
    const message = error instanceof PersistenceUnavailableError
      ? 'API startup failed: storage is unavailable.'
      : error instanceof ApiListenerUnavailableError
        ? 'API startup failed: listener could not start.'
        : 'API startup failed.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
    return
  }

  let stopping: Promise<void> | undefined
  const stop = () => {
    if (stopping) return
    stopping = api.close().catch(() => {
      process.stderr.write('API shutdown failed.\n')
      process.exitCode = 1
    })
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
}

void main()
