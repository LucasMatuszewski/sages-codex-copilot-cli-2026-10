import Database from 'better-sqlite3'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createIsolatedDirectory, type IsolatedDirectory } from '../test-support/isolated-directory.js'
import { PersistenceUnavailableError } from '../application/ports/findings-store.js'
import { openFindingsDatabase, resolveDatabasePath } from './unit-of-work.js'

const appDirectory = process.cwd()

async function runMigration(databasePath: string) {
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn('pnpm', ['db:migrate'], {
      cwd: appDirectory,
      env: { ...process.env, DATABASE_PATH: databasePath },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform === 'linux',
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const killGroup = (signal: NodeJS.Signals) => {
      if (process.platform === 'linux' && child.pid) {
        try { process.kill(-child.pid, signal) } catch {}
      } else {
        child.kill(signal)
      }
    }
    const timeout = setTimeout(() => {
      timedOut = true
      killGroup('SIGTERM')
      killTimer = setTimeout(() => killGroup('SIGKILL'), 5_000)
    }, 60_000)
    let killTimer: NodeJS.Timeout | undefined
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => { stderr += chunk })
    child.once('error', (error) => { clearTimeout(timeout); clearTimeout(killTimer); reject(error) })
    child.once('close', (code) => {
      clearTimeout(timeout)
      clearTimeout(killTimer)
      resolve({ code: timedOut ? null : code, stdout, stderr })
    })
  })
}

describe('database migration CLI', () => {
  let directory: IsolatedDirectory | undefined

  afterEach(async () => {
    await directory?.cleanup()
    directory = undefined
  })

  it('applies migrations once, preserves existing rows, and reports JSON receipts', async () => {
    directory = await createIsolatedDirectory('cra-b02-migrate-')
    const databasePath = join(directory.path, 'findings.sqlite')

    const first = await runMigration(databasePath)
    expect(first.code, first.stderr).toBe(0)
    expect(JSON.parse(first.stdout.trim())).toEqual({ appliedMigrations: 1 })

    const db = new Database(databasePath)
    try {
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('vulnerabilities','vulnerability_identities','detection_events') ORDER BY name").all())
        .toEqual([{ name: 'detection_events' }, { name: 'vulnerabilities' }, { name: 'vulnerability_identities' }])
      expect(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='vulnerability_identities'").get())
        .toMatchObject({ sql: expect.stringContaining('uq_vulnerability_identities_scheme_value') })
      expect(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='detection_events'").get())
        .toMatchObject({ sql: expect.stringContaining('uq_detection_events_source_source_event_id') })
      expect((db.prepare("PRAGMA table_info(vulnerabilities)").all() as { name: string; type: string }[]).find((column) => column.name === 'score'))
        .toMatchObject({ type: 'REAL' })
      expect(db.prepare("PRAGMA foreign_key_list(detection_events)").all())
        .toEqual([expect.objectContaining({ table: 'vulnerabilities', from: 'vulnerabilityId', to: 'id', on_delete: 'RESTRICT' })])
    } finally {
      db.close()
    }
    const unitOfWork = await openFindingsDatabase(databasePath)
    try {
      await unitOfWork.run((store) => store.insertVulnerability({
        id: '10000000-0000-4000-8000-000000000001', title: 'synthetic finding', description: null,
        componentName: null, ecosystem: null, vendor: null, affectedComponentVersions: null, generalExploit: null,
        exploitPrerequisites: null, remediationGuidance: null, fixedComponentVersions: null, category: null,
        weaknessCode: null, severity: null, severityRationale: null, score: 7.5, scoreSystem: null, scoreVersion: null,
        scoreSource: null, exploitationSignal: null, exploitationEvidence: null, knowledgeAt: null, references: null,
        tags: [], status: 'missing_data', closureNote: null, gapResolutions: [],
        createdAt: '2026-10-22T08:00:00.000Z', updatedAt: '2026-10-22T08:00:00.000Z', revision: 1,
      }))
    } finally {
      await unitOfWork.close()
    }

    const second = await runMigration(databasePath)
    expect(second.code, second.stderr).toBe(0)
    expect(JSON.parse(second.stdout.trim())).toEqual({ appliedMigrations: 0 })
    const reopened = new Database(databasePath)
    try {
      expect(reopened.prepare('SELECT id, score, tagsJson FROM vulnerabilities').get())
        .toEqual({ id: '10000000-0000-4000-8000-000000000001', score: 7.5, tagsJson: '[]' })
    } finally {
      reopened.close()
    }
  }, 90_000)

  it('fails safely for an invalid database location', async () => {
    directory = await createIsolatedDirectory('cra-b02-migrate-fail-')
    const result = await runMigration(directory.path)
    expect(result.code).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Migration failed')
    expect(result.stderr).not.toContain(directory.path)
  }, 75_000)

  it('resolves only file-backed database paths against the application directory', async () => {
    directory = await createIsolatedDirectory('cra-b02-path-')
    expect(resolveDatabasePath(undefined, directory.path)).toBe(join(directory.path, '.data/cra.sqlite'))
    expect(resolveDatabasePath('relative/findings.sqlite', directory.path)).toBe(join(directory.path, 'relative/findings.sqlite'))
    expect(resolveDatabasePath(join(directory.path, 'absolute.sqlite'), '/')).toBe(join(directory.path, 'absolute.sqlite'))
    expect(() => resolveDatabasePath('')).toThrow(/must not be empty/)
    expect(() => resolveDatabasePath(':memory:')).toThrow(/In-memory/)
    await expect(openFindingsDatabase('')).rejects.toBeInstanceOf(PersistenceUnavailableError)
    await expect(openFindingsDatabase(':memory:')).rejects.toBeInstanceOf(PersistenceUnavailableError)
  })
})
