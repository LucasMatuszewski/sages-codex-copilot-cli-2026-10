export interface ApiConfig {
  host: '127.0.0.1' | '::1'
  port: number
  databasePath?: string
}

export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const host = env.API_HOST ?? '127.0.0.1'
  if (host !== '127.0.0.1' && host !== '::1') throw new Error('API_HOST must be a loopback address.')

  const portText = env.API_PORT ?? '3001'
  if (!/^\d+$/.test(portText)) throw new Error('API_PORT must be an integer from 1 to 65535.')
  const port = Number(portText)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new Error('API_PORT must be an integer from 1 to 65535.')
  const config: ApiConfig = { host, port }
  if (env.DATABASE_PATH !== undefined) config.databasePath = env.DATABASE_PATH
  return config
}
