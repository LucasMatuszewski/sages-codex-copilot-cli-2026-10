import { resolve } from 'node:path'
import type { FindingsStore, FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { PersistenceUnavailableError } from '../application/ports/findings-store.js'
import { createFindingsDataSource } from './data-source.js'
import { createFindingsStore } from './findings-store.js'

export function resolveDatabasePath(configured: string | undefined, baseDirectory = process.cwd()): string {
  if (configured === '') throw new Error('DATABASE_PATH must not be empty.')
  const value = configured ?? '.data/cra.sqlite'
  if (value === ':memory:') throw new Error('In-memory databases are not supported.')
  return resolve(baseDirectory, value)
}

export interface OpenFindingsDatabaseResult {
  unitOfWork: FindingsUnitOfWork
  appliedMigrations: number
}

class QueuedFindingsUnitOfWork implements FindingsUnitOfWork {
  private tail: Promise<void> = Promise.resolve()
  private closing = false
  private closePromise: Promise<void> | undefined

  constructor(private readonly dataSource: Awaited<ReturnType<typeof createFindingsDataSource>>) {}

  run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T> {
    if (this.closing) return Promise.reject(new PersistenceUnavailableError())
    const result = this.tail.then(async () => {
      let callbackFailed = false
      try {
        return await this.dataSource.manager.transaction(async (manager) => {
          let active = true
          try { return await work(createFindingsStore(manager, () => active)) }
          catch (error) { callbackFailed = true; throw error }
          finally { active = false }
        })
      } catch (error) {
        if (callbackFailed) throw error
        throw new PersistenceUnavailableError()
      }
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.closing = true
    this.closePromise = this.tail.then(async () => {
      if (this.dataSource.isInitialized) await this.dataSource.destroy()
    }).catch(() => { throw new PersistenceUnavailableError() })
    return this.closePromise
  }
}

export async function openFindingsDatabaseWithMigrationCount(databasePath: string): Promise<OpenFindingsDatabaseResult> {
  let dataSource: Awaited<ReturnType<typeof createFindingsDataSource>> | undefined
  try {
    dataSource = await createFindingsDataSource(databasePath)
    await dataSource.initialize()
    const migrations = await dataSource.runMigrations()
    return { unitOfWork: new QueuedFindingsUnitOfWork(dataSource), appliedMigrations: migrations.length }
  } catch {
    if (dataSource?.isInitialized) await dataSource.destroy().catch(() => undefined)
    throw new PersistenceUnavailableError()
  }
}

export async function openFindingsDatabase(databasePath: string): Promise<FindingsUnitOfWork> {
  return (await openFindingsDatabaseWithMigrationCount(databasePath)).unitOfWork
}
