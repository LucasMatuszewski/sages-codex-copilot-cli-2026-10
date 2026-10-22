import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface IsolatedDirectory {
  readonly path: string
  cleanup(): Promise<void>
}

/** Creates a private temporary directory and cleanup scoped to that directory. */
export async function createIsolatedDirectory(
  prefix = 'cra-poc-test-',
): Promise<IsolatedDirectory> {
  const path = await mkdtemp(join(tmpdir(), prefix))
  let cleaned = false

  return {
    path,
    async cleanup() {
      if (cleaned) return
      await rm(path, { recursive: true, force: true })
      cleaned = true
    },
  }
}
