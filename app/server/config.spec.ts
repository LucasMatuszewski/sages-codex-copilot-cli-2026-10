import { describe, expect, it } from 'vitest'
import { readApiConfig } from './config.js'

describe('API configuration', () => {
  it('defaults to loopback and the documented port', () => {
    expect(readApiConfig({} as NodeJS.ProcessEnv)).toMatchObject({ host: '127.0.0.1', port: 3001 })
  })
  it('accepts each explicitly supported loopback address and port boundaries', () => {
    expect(readApiConfig({ API_HOST: '::1', API_PORT: '65535' } as NodeJS.ProcessEnv)).toMatchObject({ host: '::1', port: 65_535 })
    expect(readApiConfig({ API_HOST: '127.0.0.1', API_PORT: '1', DATABASE_PATH: 'private.sqlite' } as NodeJS.ProcessEnv))
      .toMatchObject({ host: '127.0.0.1', port: 1, databasePath: 'private.sqlite' })
  })
  it.each(['0', '-1', '65536', '3.5', 'abc'])('rejects invalid port %s', (port) => {
    expect(() => readApiConfig({ API_PORT: port } as NodeJS.ProcessEnv)).toThrow()
  })
  it.each(['0.0.0.0', '192.168.1.2', 'localhost.localdomain'])('rejects non-loopback host %s', (host) => {
    expect(() => readApiConfig({ API_HOST: host } as NodeJS.ProcessEnv)).toThrow()
  })
})
