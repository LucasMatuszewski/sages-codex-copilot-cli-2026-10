import type { EntityManager } from 'typeorm'
import type { Identity, Revision, UUID } from '../../shared/common.js'
import type { DetectionEventRecord, EventChanges, FindingsStore, VulnerabilityChanges, VulnerabilityIdentityRecord, VulnerabilityRecord } from '../application/ports/findings-store.js'
import { PersistenceConstraintError, PersistenceUnavailableError } from '../application/ports/findings-store.js'
import { DetectionEventEntity, VulnerabilityEntity, VulnerabilityIdentityEntity } from './entities.js'

function codeOf(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const candidate = error as { code?: unknown; driverError?: unknown; cause?: unknown }
  if (typeof candidate.code === 'string') return candidate.code
  return codeOf(candidate.driverError ?? candidate.cause)
}

function toPortError(error: unknown): Error {
  const code = codeOf(error)
  const message = error instanceof Error ? error.message : ''
  if (code.startsWith('SQLITE_CONSTRAINT') || /constraint failed|foreign key constraint|unique constraint|not null constraint|check constraint/i.test(message)) {
    return new PersistenceConstraintError()
  }
  return new PersistenceUnavailableError()
}

export function createFindingsStore(manager: EntityManager, isActive: () => boolean): FindingsStore {
  const vulnerabilities = manager.getRepository(VulnerabilityEntity)
  const identities = manager.getRepository(VulnerabilityIdentityEntity)
  const events = manager.getRepository(DetectionEventEntity)
  const storage = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (!isActive()) throw new PersistenceUnavailableError()
    try { return await operation() }
    catch (error) { throw toPortError(error) }
  }

  return {
    async findVulnerabilityById(id) {
      return await storage(() => vulnerabilities.findOneBy({ id }))
    },
    async listVulnerabilities() {
      return await storage(() => vulnerabilities.find({ order: { id: 'ASC' } }))
    },
    async insertVulnerability(record) {
      await storage(async () => { await vulnerabilities.insert(record) })
    },
    async updateVulnerability(id: UUID, expectedRevision: Revision, changes: VulnerabilityChanges, updatedAt) {
      const result = await storage(() => vulnerabilities.createQueryBuilder()
        .update(VulnerabilityEntity)
        .set({ ...changes, updatedAt, revision: expectedRevision + 1 })
        .where('id = :id AND revision = :expectedRevision', { id, expectedRevision })
        .execute())
      if (result.affected === 0) return null
      return await storage(() => vulnerabilities.findOneBy({ id }))
    },
    async findIdentities(requested: readonly Identity[]) {
      if (!requested.length) return []
      return await storage(() => identities.find({ where: requested.map(({ scheme, value }) => ({ scheme, value })) }))
    },
    async listIdentities(vulnerabilityId: UUID) {
      return await storage(() => identities.find({ where: { vulnerabilityId }, order: { id: 'ASC' } }))
    },
    async insertIdentity(record: VulnerabilityIdentityRecord) {
      await storage(async () => { await identities.insert(record) })
    },
    async findEventById(id: UUID) {
      return await storage(() => events.findOneBy({ id }))
    },
    async findEventBySourceKey(source, sourceEventId) {
      return await storage(() => events.findOneBy({ source, sourceEventId }))
    },
    async listEvents(vulnerabilityId?: UUID) {
      return await storage(() => events.find({
        where: vulnerabilityId === undefined ? {} : { vulnerabilityId },
        order: { id: 'ASC' },
      }))
    },
    async insertEvent(record: DetectionEventRecord) {
      await storage(async () => { await events.insert(record) })
    },
    async updateEvent(id, expectedRevision, changes: EventChanges, updatedAt) {
      const result = await storage(() => events.createQueryBuilder()
        .update(DetectionEventEntity)
        .set({ ...changes, updatedAt, revision: expectedRevision + 1 })
        .where('id = :id AND revision = :expectedRevision', { id, expectedRevision })
        .execute())
      if (result.affected === 0) return null
      return await storage(() => events.findOneBy({ id }))
    },
  }
}
