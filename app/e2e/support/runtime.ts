import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createWriteStream, type WriteStream } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const appDir = process.cwd()
const runId = process.env.Q01_RUN_ID ?? `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${process.pid}`
const logsDir = path.resolve(appDir, 'artifacts/Q01/logs', runId)
const screenshotsDir = path.resolve(appDir, 'artifacts/screenshots/Q01', runId)
const apiPort = 3001
const webPort = 4200
const startupDeadlineMs = 45_000

export type ExitResult = { code: number | null; signal: NodeJS.Signals | null }
type ProcessEvidence = { pid: number; ppid: number; processGroup: number; session: number; startTime: string; command: string }

export type IsolatedRuntime = {
  readonly databasePath: string
  readonly logsPath: string
  readonly screenshotsPath: string
  readonly pid: number
  start(): Promise<void>
  stop(signal?: NodeJS.Signals): Promise<ExitResult | null>
  killOwnedApiChild(): Promise<{ pid: number; exit: ExitResult }>
  runMigration(): Promise<{ stdout: string; appliedMigrations: number }>
  readOnlyDatabase<T>(inspect: (database: import('better-sqlite3').Database) => T): Promise<T>
  processGroupMembers(): Promise<number[]>
  processDescendants(): Promise<number[]>
  portsCanBind(): Promise<boolean>
  close(): Promise<void>
}

function listenFor(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => server.close((error) => error ? reject(error) : resolve()))
  })
}

async function assertPortsFree() {
  for (const port of [apiPort, webPort]) {
    try {
      await listenFor(port)
    } catch (error) {
      throw new Error(`Q01 refuses to start because 127.0.0.1:${port} is already occupied (${String(error)}).`)
    }
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, description: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(description)), timeoutMs) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function getProcessGroupMembers(groupId: number): Promise<number[]> {
  const members: number[] = []
  for (const entry of await readdir('/proc', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue
    try {
      const stat = await readFile(`/proc/${entry.name}/stat`, 'utf8')
      const closeParen = stat.lastIndexOf(')')
      const fields = stat.slice(closeParen + 2).split(/\s+/)
      if (Number(fields[2]) === groupId) members.push(Number(entry.name))
    } catch {
      // Processes can exit while the owned group is being inspected.
    }
  }
  return members
}

async function readProcessEvidence(pid: number): Promise<ProcessEvidence | null> {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8')
    const openParen = stat.indexOf('(')
    const closeParen = stat.lastIndexOf(')')
    const fields = stat.slice(closeParen + 2).split(/\s+/)
    return {
      pid,
      command: stat.slice(openParen + 1, closeParen),
      ppid: Number(fields[1]) || 0,
      processGroup: Number(fields[2]) || 0,
      session: Number(fields[3]) || 0,
      startTime: fields[19] ?? '',
    }
  } catch {
    return null
  }
}

async function processAncestry(pid: number): Promise<ProcessEvidence[]> {
  const chain: ProcessEvidence[] = []
  let current: number | null = pid
  for (let depth = 0; current !== null && depth < 64; depth++) {
    const evidence = await readProcessEvidence(current)
    if (!evidence) break
    chain.push(evidence)
    current = evidence.ppid || null
  }
  return chain
}

async function getDescendantProcesses(ancestor: number): Promise<ProcessEvidence[]> {
  const processes = new Map<number, ProcessEvidence>()
  for (const entry of await readdir('/proc', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue
    const evidence = await readProcessEvidence(Number(entry.name))
    if (evidence) processes.set(evidence.pid, evidence)
  }
  const owned = new Set([ancestor])
  let changed = true
  while (changed) {
    changed = false
    for (const evidence of processes.values()) {
      if (!owned.has(evidence.pid) && owned.has(evidence.ppid)) {
        owned.add(evidence.pid)
        changed = true
      }
    }
  }
  owned.delete(ancestor)
  return [...owned].flatMap((pid) => {
    const evidence = processes.get(pid)
    return evidence ? [evidence] : []
  }).sort((left, right) => left.pid - right.pid)
}

async function waitForProcessesToExit(processes: ProcessEvidence[], timeoutMs: number) {
  const until = Date.now() + timeoutMs
  let remaining = processes
  while (Date.now() < until) {
    remaining = []
    for (const initial of processes) {
      const current = await readProcessEvidence(initial.pid)
      if (current?.startTime === initial.startTime) remaining.push(initial)
    }
    if (remaining.length === 0) return remaining
    await sleep(100)
  }
  return remaining
}

function closeResult(child: ChildProcess): Promise<ExitResult> {
  return new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })))
}

async function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = await execFileAsync(command, args, { cwd: appDir, env, timeout: 45_000, maxBuffer: 1024 * 1024 })
  return result.stdout.trim()
}

export async function createIsolatedRuntime(options: { databaseParentFile?: boolean } = {}): Promise<IsolatedRuntime> {
  await mkdir(logsDir, { recursive: true })
  const workDir = await mkdtemp(path.join(os.tmpdir(), 'cra-q01-'))
  let parentFile: string | undefined
  let databasePath: string
  if (options.databaseParentFile) {
    parentFile = path.join(workDir, 'regular-file-parent')
    await writeFile(parentFile, 'Q01 owned invalid parent fixture\n', { flag: 'wx' })
    databasePath = path.join(parentFile, 'cra.sqlite')
  } else {
    const databaseDir = path.join(workDir, 'database')
    await mkdir(databaseDir)
    databasePath = path.join(databaseDir, 'cra.sqlite')
  }

  const logPath = path.join(logsDir, `runtime-${Date.now()}-${Math.random().toString(16).slice(2)}.log`)
  const logStream: WriteStream = createWriteStream(logPath, { flags: 'wx' })
  await new Promise<void>((resolve, reject) => {
    logStream.once('open', () => resolve())
    logStream.once('error', reject)
  })
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_PATH: databasePath, API_HOST: '127.0.0.1', API_PORT: String(apiPort) }
  let child: ChildProcess | undefined
  let closePromise: Promise<ExitResult> | undefined
  let started = false
  let closed = false
  const ownedProcesses = new Map<number, ProcessEvidence>()

  const endLog = async () => {
    if (logStream.closed) return
    await new Promise<void>((resolve) => logStream.end(resolve))
  }
  const logEvidence = (message: string) => logStream.write(`[Q01] ${new Date().toISOString()} ${message}\n`)
  const groupMembers = () => child?.pid ? getProcessGroupMembers(child.pid) : Promise.resolve([])
  const waitForGroupExit = async (timeoutMs: number) => {
    const until = Date.now() + timeoutMs
    while (Date.now() < until) {
      if ((await groupMembers()).length === 0) return true
      await sleep(100)
    }
    return (await groupMembers()).length === 0
  }
  const terminateGroup = async (signal: NodeJS.Signals) => {
    if (!child?.pid) return
    try { process.kill(-child.pid, signal) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }

  const runtime: IsolatedRuntime = {
    databasePath,
    logsPath: logPath,
    screenshotsPath: screenshotsDir,
    get pid() { return child?.pid ?? 0 },
    async start() {
      if (started) throw new Error('Q01 runtime can only be started once.')
      started = true
      await assertPortsFree()
      child = spawn('pnpm', ['dev'], { cwd: appDir, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
      child.once('error', (error) => logEvidence(`spawn-error=${error.message}`))
      if (!child.pid) throw new Error('Could not obtain the owned pnpm dev process PID.')
      logEvidence(`owned-pnpm-pid=${child.pid} process-group=${child.pid} database=${databasePath}`)
      child.stdout?.pipe(logStream, { end: false })
      child.stderr?.pipe(logStream, { end: false })
      closePromise = closeResult(child)
      const until = Date.now() + startupDeadlineMs
      let apiReady = false
      let webReady = false
      while (Date.now() < until) {
        if (child.exitCode !== null || child.signalCode !== null) {
          const exit = await closePromise
          throw new Error(`Owned pnpm dev exited before readiness (${JSON.stringify(exit)}); see ${logPath}.`)
        }
        try {
          const response = await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`, { signal: AbortSignal.timeout(1_000) })
          apiReady = response.ok
        } catch { /* Keep waiting for the owned API listener. */ }
        try {
          const response = await fetch(`http://127.0.0.1:${webPort}/`, { signal: AbortSignal.timeout(1_000) })
          webReady = response.ok
        } catch { /* Keep waiting for the owned Angular dev server. */ }
        if (apiReady && webReady) {
          for (const evidence of await getDescendantProcesses(child.pid)) ownedProcesses.set(evidence.pid, evidence)
          logEvidence(`readiness-owned-descendants=${JSON.stringify([...ownedProcesses.values()])}`)
          return
        }
        await sleep(250)
      }
      throw new Error(`Owned pnpm dev did not reach API and web readiness within ${startupDeadlineMs}ms; see ${logPath}.`)
    },
    async stop(signal = 'SIGINT') {
      if (!child?.pid || closed) return closePromise ? await closePromise : null
      for (const evidence of await getDescendantProcesses(child.pid)) ownedProcesses.set(evidence.pid, evidence)
      logEvidence(`sending-process-group-signal=${signal} process-group=${child.pid}`)
      await terminateGroup(signal)
      if (!await waitForGroupExit(8_000)) {
        await terminateGroup('SIGTERM')
        if (!await waitForGroupExit(4_000)) {
          await terminateGroup('SIGKILL')
          if (!await waitForGroupExit(3_000)) throw new Error(`Owned process group ${child.pid} remained after SIGKILL.`)
        }
      }
      const exit = closePromise ? await closePromise : null
      const members = await groupMembers()
      if (members.length !== 0) throw new Error(`Owned process group ${child.pid} remained after close.`)
      const remainingDescendants = await waitForProcessesToExit([...ownedProcesses.values()], 3_000)
      if (remainingDescendants.length !== 0) {
        logEvidence(`process-group-exit=${JSON.stringify(exit)} remaining-members=${JSON.stringify(members)} owned-descendants-still-alive=${JSON.stringify(remainingDescendants)}`)
        throw new Error(`Owned process descendants remained after ${signal}: ${remainingDescendants.map(({ pid, processGroup }) => `${pid}(pgid=${processGroup})`).join(',')}; see ${logPath}.`)
      }
      const portsRebind = await runtime.portsCanBind()
      logEvidence(`process-group-exit=${JSON.stringify(exit)} remaining-members=${JSON.stringify(members)} remaining-descendants=[] ports-rebind=${portsRebind}`)
      if (!portsRebind) throw new Error('API/web port could not be rebound after owned process-group shutdown.')
      closed = true
      await endLog()
      return exit
    },
    async killOwnedApiChild() {
      if (!child?.pid || !closePromise) throw new Error('Start the owned runtime before stopping its API child.')
      const { stdout } = await execFileAsync('ss', ['-ltnp'], { encoding: 'utf8' })
      const listenerLine = stdout.split('\n').find((line) => line.includes(`:${apiPort} `) || line.includes(`:${apiPort}\n`))
      const pid = listenerLine?.match(/pid=(\d+)/)?.[1]
      if (!pid) throw new Error(`Could not identify the API listener PID from ss for port ${apiPort}.`)
      const apiPid = Number(pid)
      const members = await groupMembers()
      const ancestry = await processAncestry(apiPid)
      const descendants = await getDescendantProcesses(child.pid)
      for (const evidence of descendants) ownedProcesses.set(evidence.pid, evidence)
      const provenOwnedDescendant = ancestry.some((entry) => entry.pid === child?.pid)
      logEvidence(`api-listener-ownership=${JSON.stringify({ listenerLine: listenerLine?.trim(), apiPid, runtimePid: child.pid, ancestry, sameProcessGroup: members.includes(apiPid), processGroupMembers: members, ownedDescendants: descendants })}`)
      if (!provenOwnedDescendant) {
        throw new Error(`Refusing to signal PID ${apiPid}: PPID ancestry does not reach owned runtime PID ${child.pid}; see ${logPath}.`)
      }
      process.kill(apiPid, 'SIGTERM')
      logEvidence(`signaled-owned-api-listener-pid=${apiPid}`)
      const exit = await withTimeout(closePromise, 15_000, `Owned dev supervisor did not close after API child PID ${apiPid} received SIGTERM.`)
      const membersAfterExit = await groupMembers()
      if (membersAfterExit.length !== 0) throw new Error(`Owned siblings remained after API child exit; see ${logPath}.`)
      const remainingDescendants = await waitForProcessesToExit(descendants, 3_000)
      if (remainingDescendants.length !== 0) throw new Error(`Owned descendant PIDs remained after API child exit: ${remainingDescendants.map(({ pid }) => pid).join(',')}; see ${logPath}.`)
      const portsRebind = await runtime.portsCanBind()
      if (!portsRebind) throw new Error('API/web port could not be rebound after owned sibling shutdown.')
      logEvidence(`supervisor-exit=${JSON.stringify(exit)} remaining-members=${JSON.stringify(membersAfterExit)} remaining-descendants=${JSON.stringify(remainingDescendants)} ports-rebind=${portsRebind}`)
      await endLog()
      closed = true
      return { pid: apiPid, exit }
    },
    async runMigration() {
      const stdout = await runCommand('pnpm', ['db:migrate'], env)
      const receipt = stdout.split(/\r?\n/).map((line) => line.trim()).find((line) => /^\{"appliedMigrations":\d+\}$/.test(line))
      if (!receipt) throw new Error(`Migration command did not emit a JSON receipt; captured stdout: ${stdout}`)
      const appliedMigrations = Number(JSON.parse(receipt).appliedMigrations)
      logEvidence(`migration-stdout=${JSON.stringify(stdout)} applied-migrations=${appliedMigrations}`)
      return { stdout, appliedMigrations }
    },
    async readOnlyDatabase<T>(inspect: (database: import('better-sqlite3').Database) => T): Promise<T> {
      const { default: Database } = await import('better-sqlite3')
      const db = new Database(databasePath, { readonly: true, fileMustExist: true })
      try { return inspect(db) } finally { db.close() }
    },
    processGroupMembers: groupMembers,
    async processDescendants() {
      return child?.pid ? (await getDescendantProcesses(child.pid)).map(({ pid }) => pid) : []
    },
    async portsCanBind() {
      try { await listenFor(apiPort); await listenFor(webPort); return true } catch { return false }
    },
    async close() {
      if (child?.pid && !closed) await runtime.stop()
      await endLog()
      await rm(workDir, { recursive: true, force: true })
    },
  }
  return runtime
}

export async function ensureScreenshotDirectory() {
  await mkdir(screenshotsDir, { recursive: true })
}
