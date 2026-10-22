import { access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createIsolatedDirectory, type IsolatedDirectory } from './isolated-directory.js'

describe('createIsolatedDirectory', () => {
  const directories: IsolatedDirectory[] = []

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => directory.cleanup()))
  })

  it('creates separate temporary paths and removes only its own fixture tree', async () => {
    const first = await createIsolatedDirectory()
    const second = await createIsolatedDirectory()
    directories.push(first, second)

    expect(first.path).not.toBe(second.path)
    await mkdir(join(first.path, 'nested'))
    await writeFile(join(first.path, 'nested', 'fixture.txt'), 'synthetic fixture')
    await writeFile(join(second.path, 'keep.txt'), 'second fixture')

    await first.cleanup()
    await first.cleanup()

    await expect(access(first.path)).rejects.toThrow()
    await expect(access(join(second.path, 'keep.txt'))).resolves.toBeUndefined()
  })
})
