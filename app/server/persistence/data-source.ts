import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { DataSource } from 'typeorm'
import { DetectionEventEntity, VulnerabilityEntity, VulnerabilityIdentityEntity } from './entities.js'
import { InitialFindings1792627200000 } from './migrations/1792627200000-InitialFindings.js'

export async function createFindingsDataSource(databasePath: string): Promise<DataSource> {
  if (databasePath === '' || databasePath === ':memory:') throw new Error('A non-empty file database path is required.')
  await mkdir(dirname(databasePath), { recursive: true })
  return new DataSource({
    type: 'better-sqlite3',
    database: databasePath,
    entities: [VulnerabilityEntity, VulnerabilityIdentityEntity, DetectionEventEntity],
    migrations: [InitialFindings1792627200000],
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    migrationsTransactionMode: 'all',
    timeout: 5000,
    prepareDatabase(database: { pragma(source: string): unknown }) {
      database.pragma('foreign_keys = ON')
    },
  })
}
