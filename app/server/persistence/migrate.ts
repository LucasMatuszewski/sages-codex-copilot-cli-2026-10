import { openFindingsDatabaseWithMigrationCount, resolveDatabasePath } from './unit-of-work.js'

async function main() {
  const databasePath = resolveDatabasePath(process.env.DATABASE_PATH)
  const { unitOfWork, appliedMigrations } = await openFindingsDatabaseWithMigrationCount(databasePath)
  await unitOfWork.close()
  process.stdout.write(`${JSON.stringify({ appliedMigrations })}\n`)
}

main().catch(() => {
  process.stderr.write('Migration failed. Check the database path and storage availability.\n')
  process.exitCode = 1
})
