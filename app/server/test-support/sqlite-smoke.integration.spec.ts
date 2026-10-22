import Database from 'better-sqlite3'
import { access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createIsolatedDirectory, type IsolatedDirectory } from './isolated-directory.js'

describe('native SQLite driver smoke', () => {
  let directory: IsolatedDirectory | undefined

  afterEach(async () => {
    await directory?.cleanup()
    directory = undefined
  })

  it('writes synthetic data to a file, reopens it, reads it, and cleans up', async () => {
    directory = await createIsolatedDirectory()
    const databasePath = join(directory.path, 'smoke.sqlite')
    const initial = new Database(databasePath)

    try {
      initial.exec('CREATE TABLE harness_smoke (value TEXT NOT NULL)')
      initial.prepare('INSERT INTO harness_smoke (value) VALUES (?)').run('synthetic-value')
    } finally {
      initial.close()
    }

    const reopened = new Database(databasePath)
    try {
      const row = reopened.prepare('SELECT value FROM harness_smoke').get() as
        | { value: string }
        | undefined
      expect(row).toEqual({ value: 'synthetic-value' })
    } finally {
      reopened.close()
    }

    expect(await access(databasePath)).toBeUndefined()
    await directory.cleanup()
    await expect(access(databasePath)).rejects.toThrow()
  })
})
