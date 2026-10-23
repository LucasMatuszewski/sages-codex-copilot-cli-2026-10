import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { FindingCreateRequestSchema, FindingCreateResponseSchema } from '../shared/finding-contracts.js'
import { RegisterQueryResultSchema } from '../shared/register-contracts.js'
import { createIsolatedRuntime, type IsolatedRuntime } from './support/runtime.js'

const viewports = [
  { width: 1440, height: 1000, name: '1440x1000' },
  { width: 1024, height: 768, name: '1024x768' },
]

type SeedReceipt = { vulnerabilityId: string; eventId: string }
type Seed = { a: SeedReceipt; aFirstEvent: string; b: SeedReceipt; requests: Array<{ label: string; sourceEventId: string; receipt: SeedReceipt }> }

const evidenceRunId = process.env.F03_RUN_ID ?? `local-${process.pid}`
const evidenceRoot = path.resolve(process.cwd(), 'artifacts/F03', evidenceRunId)
const screenshotRoot = path.resolve(process.cwd(), 'artifacts/screenshots/F03', evidenceRunId)
let queryReceiptSequence = 0

async function saveJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'w' })
}

async function postFinding(runtime: IsolatedRuntime, request: unknown, label: string, evidenceRoot: string): Promise<SeedReceipt> {
  const validRequest = FindingCreateRequestSchema.parse(request)
  const requestBody = JSON.stringify(validRequest)
  const response = await fetch('http://127.0.0.1:3001/api/v1/findings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: requestBody,
  })
  const responseText = await response.text()
  let responseBody: unknown
  try { responseBody = JSON.parse(responseText) } catch { responseBody = responseText }
  await saveJson(path.join(evidenceRoot, `${label}.json`), {
    request: validRequest, requestBody, status: response.status, responseBody: responseText, parsedResponse: responseBody,
  })
  expect(response.status, `${label} API intake`).toBe(201)
  const receipt = FindingCreateResponseSchema.parse(responseBody)
  return { vulnerabilityId: receipt.vulnerabilityId, eventId: receipt.eventId }
}

async function snapshot(runtime: IsolatedRuntime, name: string, evidenceRoot: string) {
  const result = await runtime.readOnlyDatabase((db) => ({
    integrity: db.pragma('integrity_check'),
    vulnerabilities: db.prepare('SELECT * FROM vulnerabilities ORDER BY id').all(),
    identities: db.prepare('SELECT * FROM vulnerability_identities ORDER BY vulnerabilityId, id').all(),
    events: db.prepare('SELECT * FROM detection_events ORDER BY id').all(),
  }))
  await saveJson(path.join(evidenceRoot, `${name}.json`), result)
  return result
}

async function seed(runtime: IsolatedRuntime, evidenceRoot: string): Promise<Seed> {
  const first = await postFinding(runtime, {
    source: 'synthetic-f03',
    sourceEventId: 'f03-amber-atlas-pine',
    vulnerability: {
      identities: [{ scheme: 'cve', value: 'CVE-2026-44001' }],
      title: 'Synthetic Amber Advisory',
      description: 'Synthetic local register acceptance fixture.',
      componentName: 'lib-alpha',
      category: 'application',
      severity: 'high',
      severityRationale: 'Synthetic severity for local QA only.',
      tags: ['qa-tag-amber'],
    },
    observation: {
      detectedAt: '2026-10-23T10:00:00.000Z',
      product: 'Atlas', productVersion: '1.0', client: 'Pine', installedComponentVersion: '2.1.0',
    },
  }, 'intake-amber-atlas', evidenceRoot)

  await new Promise((resolve) => setTimeout(resolve, 1_100))
  const second = await postFinding(runtime, {
    source: 'synthetic-f03',
    sourceEventId: 'f03-amber-beacon-cedar',
    vulnerability: {
      id: first.vulnerabilityId,
      title: 'Synthetic Amber Advisory',
      description: 'Synthetic local register acceptance fixture.',
      componentName: 'lib-alpha',
      category: 'application',
      severity: 'high',
      severityRationale: 'Synthetic severity for local QA only.',
      tags: ['qa-tag-amber'],
    },
    observation: {
      detectedAt: '2026-10-23T10:01:00.000Z',
      product: 'Beacon', productVersion: '2.0', client: 'Cedar', installedComponentVersion: '2.1.0',
    },
  }, 'intake-amber-beacon', evidenceRoot)
  expect(second.vulnerabilityId).toBe(first.vulnerabilityId)

  // Keep receipt ordering independent of millisecond timestamp resolution.
  await new Promise((resolve) => setTimeout(resolve, 1_100))
  const third = await postFinding(runtime, {
    source: 'synthetic-f03',
    sourceEventId: 'f03-quartz-comet-alder',
    vulnerability: {
      identities: [{ scheme: 'euvd', value: 'EUVD-2026-44002' }],
      title: 'Synthetic Quartz Advisory',
      description: 'Synthetic local register acceptance fixture.',
      componentName: 'lib-beta',
      category: 'application',
      severity: 'high',
      severityRationale: 'Synthetic severity for local QA only.',
      tags: ['qa-tag-violet'],
    },
    observation: {
      detectedAt: '2026-10-23T10:02:00.000Z',
      product: 'Comet', productVersion: '3.0', client: 'Alder', installedComponentVersion: '5.4.0',
    },
  }, 'intake-quartz-comet', evidenceRoot)

  const requests = [
    { label: 'amber-atlas', sourceEventId: 'f03-amber-atlas-pine', receipt: first },
    { label: 'amber-beacon', sourceEventId: 'f03-amber-beacon-cedar', receipt: second },
    { label: 'quartz-comet', sourceEventId: 'f03-quartz-comet-alder', receipt: third },
  ]
  await saveJson(path.join(evidenceRoot, 'seed-receipts.json'), requests)
  return { a: first, aFirstEvent: first.eventId, b: third, requests }
}

async function queryResponse(page: import('@playwright/test').Page, evidenceRoot: string, query?: string) {
  const response = await page.waitForResponse((candidate) => {
    const url = new URL(candidate.url())
    return candidate.request().method() === 'GET'
      && url.pathname === '/api/v1/vulnerabilities'
      && url.searchParams.get('q') === (query ?? null)
  })
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/json')
  const url = new URL(response.url())
  expect([...url.searchParams.keys()]).toEqual(query ? ['q'] : [])
  const responseBody = await response.text()
  const result = RegisterQueryResultSchema.parse(JSON.parse(responseBody))
  await saveJson(path.join(evidenceRoot, `register-query-${query ? encodeURIComponent(query) : 'all'}-${++queryReceiptSequence}.json`), {
    method: response.request().method(), url: response.url(), status: response.status(), responseBody, result,
  })
  return result
}

async function submitQuery(page: import('@playwright/test').Page, evidenceRoot: string, query: string) {
  const responsePromise = queryResponse(page, evidenceRoot, query)
  await page.getByLabel('Szukaj podatności').fill(query)
  await page.getByRole('button', { name: 'Szukaj' }).click()
  return responsePromise
}

async function expectRows(page: import('@playwright/test').Page, ids: string[], eventCounts: number[], matchedCounts?: number[]) {
  const rows = page.locator('tr[data-vulnerability-id]')
  await expect(rows).toHaveCount(ids.length)
  await expect.poll(() => rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-vulnerability-id')))).toEqual(ids)
  for (const [index, row] of (await rows.all()).entries()) {
    await expect(row.getByText(`Łącznie zdarzeń: ${eventCounts[index]}`, { exact: true })).toBeVisible()
    if (matchedCounts) await expect(row.getByText(`Liczba dopasowanych zdarzeń: ${matchedCounts[index]}`, { exact: true })).toBeVisible()
  }
}

async function expectQueryResult(
  page: import('@playwright/test').Page,
  result: ReturnType<typeof RegisterQueryResultSchema.parse>,
  rows: Array<{ id: string; events: number; matches: string[] }>,
  counts: { vulnerabilities: number; events: number },
  queryActive = true,
) {
  expect(result.counts).toEqual({ vulnerabilityCount: counts.vulnerabilities, matchingEventCount: counts.events })
  expect(result.rows.map((row) => ({
    id: row.vulnerability.id, eventCount: row.eventCount, matchingEventIds: row.matchingEventIds,
  }))).toEqual(rows.map((row) => ({ id: row.id, eventCount: row.events, matchingEventIds: row.matches })))
  await expectRows(
    page, rows.map((row) => row.id), rows.map((row) => row.events),
    queryActive ? rows.map((row) => row.matches.length) : undefined,
  )
  await expect(page.getByLabel('Podsumowanie wyświetlanych wyników')).toContainText(`${counts.vulnerabilities} ${counts.vulnerabilities === 1 ? 'podatność' : 'podatności'}`)
  const lastTwoDigits = counts.events % 100
  const eventNoun = counts.events === 1
    ? 'dopasowane zdarzenie'
    : counts.events % 10 >= 2 && counts.events % 10 <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
      ? 'dopasowane zdarzenia'
      : 'dopasowanych zdarzeń'
  await expect(page.getByLabel('Podsumowanie wyświetlanych wyników')).toContainText(`${counts.events} ${eventNoun}`)
}

for (const viewport of viewports) {
  test(`real register searches server-backed SQLite findings at ${viewport.name}`, async ({ page }, testInfo) => {
    const runtime: IsolatedRuntime = await createIsolatedRuntime()
    const runEvidenceRoot = path.join(evidenceRoot, viewport.name)
    const pageErrors: string[] = []
    const consoleProblems: string[] = []
    const queryRequests: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') consoleProblems.push(`${message.type()}: ${message.text()}`)
    })
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/v1/vulnerabilities') queryRequests.push(request.url())
    })

    try {
      await runtime.start()
      const fixtures = await seed(runtime, runEvidenceRoot)
      const seeded = await snapshot(runtime, 'sqlite-after-seed', runEvidenceRoot)
      expect(seeded.integrity).toEqual([{ integrity_check: 'ok' }])
      expect(seeded.vulnerabilities).toHaveLength(2)
      expect(seeded.identities).toHaveLength(2)
      expect(seeded.events).toHaveLength(3)
      const eventById = new Map((seeded.events as Array<{ id: string; receiptAt: string }>).map((event) => [event.id, event]))
      const aFirstReceiptAt = Date.parse(eventById.get(fixtures.a.eventId)!.receiptAt)
      const aSecondReceiptAt = Date.parse(eventById.get(fixtures.requests[1]!.receipt.eventId)!.receiptAt)
      expect(aSecondReceiptAt).toBeGreaterThan(aFirstReceiptAt)
      const aLatest = Math.max(aFirstReceiptAt, aSecondReceiptAt)
      expect(Date.parse(eventById.get(fixtures.b.eventId)!.receiptAt)).toBeGreaterThan(aLatest)

      await page.setViewportSize(viewport)
      const initialResponse = queryResponse(page, runEvidenceRoot)
      await page.goto('/')
      await expect(page).toHaveURL(/\/register$/)
      const initial = await initialResponse
      const idA = fixtures.a.vulnerabilityId
      const idB = fixtures.b.vulnerabilityId
      const eventA1 = fixtures.aFirstEvent
      const eventA2 = fixtures.requests[1]!.receipt.eventId
      const eventB = fixtures.b.eventId
      await expect(page.getByRole('region', { name: 'Wyniki rejestru' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Tabela rejestru podatności' })).toBeVisible()
      await expectQueryResult(page, initial, [
        { id: idB, events: 1, matches: [eventB] },
        { id: idA, events: 2, matches: [eventA2, eventA1] },
      ], { vulnerabilities: 2, events: 3 }, false)
      const routeLinks = await page.locator('tr[data-vulnerability-id] a').count()
      expect(routeLinks).toBe(0)
      const caseScreenshots = path.join(screenshotRoot, viewport.name)
      await mkdir(caseScreenshots, { recursive: true })
      await page.screenshot({ path: path.join(caseScreenshots, 'register-populated.png'), fullPage: true })

      const vectors = [
        { q: 'CVE-2026-44001', rows: [{ id: idA, events: 2, matches: [eventA2, eventA1] }], counts: { vulnerabilities: 1, events: 2 } },
        { q: 'Synthetic Quartz Advisory', rows: [{ id: idB, events: 1, matches: [eventB] }], counts: { vulnerabilities: 1, events: 1 } },
        { q: 'lib-beta', rows: [{ id: idB, events: 1, matches: [eventB] }], counts: { vulnerabilities: 1, events: 1 } },
        { q: 'Atlas', rows: [{ id: idA, events: 2, matches: [eventA1] }], counts: { vulnerabilities: 1, events: 1 } },
        { q: 'Cedar', rows: [{ id: idA, events: 2, matches: [eventA2] }], counts: { vulnerabilities: 1, events: 1 } },
        { q: 'qa-tag-violet', rows: [{ id: idB, events: 1, matches: [eventB] }], counts: { vulnerabilities: 1, events: 1 } },
      ]
      for (const vector of vectors) {
        const result = await submitQuery(page, runEvidenceRoot, vector.q)
        await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(vector.q)
        await expectQueryResult(page, result, vector.rows, vector.counts)
      }

      const requestCountBeforeTyping = queryRequests.length
      await page.getByLabel('Szukaj podatności').fill('No matching synthetic advisory')
      await page.waitForTimeout(250)
      expect(queryRequests).toHaveLength(requestCountBeforeTyping)
      const noResults = await submitQuery(page, runEvidenceRoot, 'No matching synthetic advisory')
      expect(noResults).toEqual({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
      await expect(page.getByRole('heading', { name: 'Brak wyników dla „No matching synthetic advisory”' })).toBeVisible()
      await expect(page.getByLabel('Podsumowanie wyświetlanych wyników')).toContainText('0 podatności')
      await expectRows(page, [], [])
      await page.screenshot({ path: path.join(caseScreenshots, 'register-no-results.png'), fullPage: true })

      const clearResponse = queryResponse(page, runEvidenceRoot)
      await page.locator('form.search-form').getByRole('button', { name: 'Wyczyść wyszukiwanie' }).click()
      const cleared = await clearResponse
      await expect(page).toHaveURL('/register')
      await expectQueryResult(page, cleared, [
        { id: idB, events: 1, matches: [eventB] },
        { id: idA, events: 2, matches: [eventA2, eventA1] },
      ], { vulnerabilities: 2, events: 3 }, false)

      let sameQueryResponseCount = 0
      const sameQueryListener = (response: import('@playwright/test').Response) => {
        if (new URL(response.url()).pathname === '/api/v1/vulnerabilities' && new URL(response.url()).searchParams.get('q') === 'Atlas') sameQueryResponseCount++
      }
      page.on('response', sameQueryListener)
      const atlasResult = await submitQuery(page, runEvidenceRoot, 'Atlas')
      await expectQueryResult(page, atlasResult, [{ id: idA, events: 2, matches: [eventA1] }], { vulnerabilities: 1, events: 1 })
      sameQueryResponseCount = 0
      const sameQuery = await submitQuery(page, runEvidenceRoot, 'Atlas')
      expect(sameQuery.rows.map((row) => row.vulnerability.id)).toEqual([idA])
      expect(sameQueryResponseCount).toBe(1)
      page.off('response', sameQueryListener)

      const cedar = await submitQuery(page, runEvidenceRoot, 'Cedar')
      expect(cedar.rows[0]?.matchingEventIds).toEqual([eventA2])
      const backResponse = queryResponse(page, runEvidenceRoot, 'Atlas')
      await page.goBack()
      const backResult = await backResponse
      await expect(page).toHaveURL(/\/register\?q=Atlas$/)
      await expectQueryResult(page, backResult, [{ id: idA, events: 2, matches: [eventA1] }], { vulnerabilities: 1, events: 1 })
      const reloadResponse = queryResponse(page, runEvidenceRoot, 'Atlas')
      await page.reload()
      const reloaded = await reloadResponse
      await expect(page.getByLabel('Szukaj podatności')).toHaveValue('Atlas')
      await expectQueryResult(page, reloaded, [{ id: idA, events: 2, matches: [eventA1] }], { vulnerabilities: 1, events: 1 })

      const afterBrowser = await snapshot(runtime, 'sqlite-after-browser', runEvidenceRoot)
      expect(afterBrowser).toEqual(seeded)
      const runtimeLogPath = runtime.logsPath
      await runtime.stop('SIGINT')
      expect(await runtime.processGroupMembers()).toEqual([])
      expect(await runtime.processDescendants()).toEqual([])
      expect(await runtime.portsCanBind()).toBe(true)
      const afterStop = await snapshot(runtime, 'sqlite-after-stop', runEvidenceRoot)
      expect(afterStop).toEqual(seeded)
      const migration = await runtime.runMigration()
      expect(migration.appliedMigrations).toBe(0)
      const afterMigration = await snapshot(runtime, 'sqlite-after-migration', runEvidenceRoot)
      expect(afterMigration).toEqual(seeded)
      await saveJson(path.join(evidenceRoot, `runtime-${viewport.name}.json`), {
        runtimeLogPath, databasePath: runtime.databasePath, migration,
        processGroupMembers: await runtime.processGroupMembers(), processDescendants: await runtime.processDescendants(),
        portsCanBindAfterStop: await runtime.portsCanBind(), queryRequests,
      })
      expect(pageErrors).toEqual([])
      expect(consoleProblems).toEqual([])
      await testInfo.attach(`runtime-log-${viewport.name}`, { path: runtimeLogPath, contentType: 'text/plain' })
    } finally {
      await runtime.close()
    }
  })
}
