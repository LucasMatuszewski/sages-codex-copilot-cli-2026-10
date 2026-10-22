import { expect, test as base } from '@playwright/test'
import { createIsolatedRuntime, ensureScreenshotDirectory, type IsolatedRuntime } from './support/runtime.js'

const test = base.extend<{ runtime: IsolatedRuntime }>({
  runtime: async ({}, use, testInfo) => {
    const runtime = await createIsolatedRuntime({ databaseParentFile: testInfo.title.includes('invalid database parent') })
    try { await use(runtime) } finally { await runtime.close() }
  },
})

const viewports = [
  { width: 1440, height: 1000, name: '1440x1000' },
  { width: 1024, height: 768, name: '1024x768' },
]

test('real browser renders the home and unknown-route return flow at desktop viewports', async ({ page, runtime }) => {
  await runtime.start()
  await ensureScreenshotDirectory()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') pageErrors.push(message.text()) })

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page).toHaveTitle('Rejestr podatności CRA')
    await expect(page.getByRole('main')).toHaveAttribute('id', 'page-main')
    await expect(page.getByRole('heading', { level: 1, name: 'Rejestr podatności CRA' })).toBeVisible()
    await expect(page.getByText('Ewidencja podatności i wykryć oraz przygotowanie treści zgłoszeń.')).toBeVisible()
    await expect(page.getByText('Wersja PoC — ekran startowy')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Start' })).toBeVisible()
    const logo = page.getByRole('img', { name: 'Sygnity' })
    await expect(logo).toBeVisible()
    await expect(logo).toHaveAttribute('src', 'assets/brand/logo.svg')
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    const favicon = await page.request.get('/assets/brand/favicon.png')
    expect(favicon.status()).toBe(200)
    expect(favicon.headers()['content-type']).toContain('image/png')
    await page.screenshot({ path: `${runtime.screenshotsPath}/home-${viewport.name}.png`, fullPage: true })

    await page.goto('/q01-unknown-route')
    await expect(page.getByRole('heading', { level: 1, name: 'Nie znaleziono strony' })).toBeVisible()
    const returnLink = page.getByRole('link', { name: 'Wróć na start' })
    await expect(returnLink).toHaveAttribute('href', '/')
    await page.screenshot({ path: `${runtime.screenshotsPath}/not-found-${viewport.name}.png`, fullPage: true })
    await returnLink.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Rejestr podatności CRA' })).toBeVisible()
  }

  expect(pageErrors).toEqual([])
})

test('direct and proxied health use the same API, then an owned API exit releases its web sibling', async ({ page, runtime }) => {
  await runtime.start()
  const direct = await page.request.get('http://127.0.0.1:3001/api/v1/health')
  expect(direct.status()).toBe(200)
  expect(direct.headers()['content-type']).toContain('application/json')
  const directBody = await direct.json()
  expect(directBody).toEqual({ status: 'ok' })

  await page.goto('/')
  const proxiedBody = await page.evaluate(async () => {
    const response = await fetch('/api/v1/health')
    return { status: response.status, contentType: response.headers.get('content-type'), body: await response.json() }
  })
  expect(proxiedBody).toEqual({ status: 200, contentType: expect.stringContaining('application/json'), body: directBody })

  const { pid, exit } = await runtime.killOwnedApiChild()
  expect(pid).toBeGreaterThan(0)
  expect(exit).toEqual({ code: 1, signal: null })
  expect(await runtime.processGroupMembers()).toEqual([])
  expect(await runtime.portsCanBind()).toBe(true)
})

test('private SQLite migration applies once, reopens cleanly, and contains no findings', async ({ runtime }) => {
  const firstMigration = await runtime.runMigration()
  const reopenedMigration = await runtime.runMigration()
  expect(firstMigration.appliedMigrations).toBe(1)
  expect(reopenedMigration.appliedMigrations).toBe(0)
  await runtime.start()
  const health = await fetch('http://127.0.0.1:3001/api/v1/health')
  expect(health.status).toBe(200)
  await runtime.stop('SIGINT')
  expect(await runtime.processGroupMembers()).toEqual([])
  expect(await runtime.portsCanBind()).toBe(true)
  const schema = await runtime.readOnlyDatabase((db) => ({
    tables: db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('vulnerabilities','vulnerability_identities','detection_events') ORDER BY name").all(),
    migrationCount: db.prepare('SELECT COUNT(*) AS count FROM migrations').get(),
    vulnerabilities: db.prepare('SELECT COUNT(*) AS count FROM vulnerabilities').get(),
    identities: db.prepare('SELECT COUNT(*) AS count FROM vulnerability_identities').get(),
    events: db.prepare('SELECT COUNT(*) AS count FROM detection_events').get(),
  }))
  expect(schema.tables).toEqual([{ name: 'detection_events' }, { name: 'vulnerabilities' }, { name: 'vulnerability_identities' }])
  expect(schema.migrationCount).toEqual({ count: 1 })
  expect(schema.vulnerabilities).toEqual({ count: 0 })
  expect(schema.identities).toEqual({ count: 0 })
  expect(schema.events).toEqual({ count: 0 })
})

test('parent SIGINT stops the full owned dev process tree and releases both ports', async ({ runtime }) => {
  await runtime.start()
  const exit = await runtime.stop('SIGINT')
  expect(exit).not.toBeNull()
  expect(await runtime.processGroupMembers()).toEqual([])
  expect(await runtime.portsCanBind()).toBe(true)
})

test('invalid database parent fails API startup and stops the owned web sibling', async ({ runtime }) => {
  await expect(runtime.start()).rejects.toThrow('exited before readiness')
  expect(await runtime.processGroupMembers()).toEqual([])
  expect(await runtime.portsCanBind()).toBe(true)
})
