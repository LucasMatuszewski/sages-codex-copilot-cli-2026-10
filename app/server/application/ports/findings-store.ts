import type { GapResolution, HandlingStatus, Identity, Instant, Revision, UUID } from '../../../shared/common.js'
import type { FindingCreateRequest, Observation, ReportingEvidence, ScannerAssessment, SharedFacts } from '../../../shared/finding-contracts.js'

export type PersistedSharedFacts = { [K in keyof SharedFacts]-?: Exclude<SharedFacts[K], undefined> } & { tags: string[] }
export type PersistedObservation = { [K in keyof Observation]-?: Exclude<Observation[K], undefined> }

export interface VulnerabilityRecord extends PersistedSharedFacts {
  id: UUID
  status: HandlingStatus
  closureNote: string | null
  gapResolutions: GapResolution[]
  createdAt: Instant
  updatedAt: Instant
  revision: Revision
}

export interface VulnerabilityIdentityRecord {
  id: UUID
  vulnerabilityId: UUID
  scheme: Identity['scheme']
  value: string
}

export interface DetectionEventRecord extends PersistedObservation {
  id: UUID
  vulnerabilityId: UUID
  source: string
  sourceEventId: string
  receiptAt: Instant
  status: HandlingStatus
  closureNote: string | null
  tags: string[]
  gapResolutions: GapResolution[]
  reportingEvidence: ReportingEvidence | null
  incomingSharedSnapshot: SharedFacts
  originalIntakeSnapshot: FindingCreateRequest
  requestFingerprint: string
  createdAt: Instant
  updatedAt: Instant
  revision: Revision
}

export type VulnerabilityChanges = Partial<Omit<VulnerabilityRecord, 'id' | 'createdAt' | 'updatedAt' | 'revision'>>
export type EventChanges = Partial<PersistedObservation & Pick<DetectionEventRecord, 'status' | 'closureNote' | 'tags' | 'gapResolutions' | 'reportingEvidence'>>

export interface FindingsStore {
  findVulnerabilityById(id: UUID): Promise<VulnerabilityRecord | null>
  listVulnerabilities(): Promise<VulnerabilityRecord[]>
  insertVulnerability(record: VulnerabilityRecord): Promise<void>
  updateVulnerability(id: UUID, expectedRevision: Revision, changes: VulnerabilityChanges, updatedAt: Instant): Promise<VulnerabilityRecord | null>
  findIdentities(identities: readonly Identity[]): Promise<VulnerabilityIdentityRecord[]>
  listIdentities(vulnerabilityId: UUID): Promise<VulnerabilityIdentityRecord[]>
  insertIdentity(record: VulnerabilityIdentityRecord): Promise<void>
  findEventById(id: UUID): Promise<DetectionEventRecord | null>
  findEventBySourceKey(source: string, sourceEventId: string): Promise<DetectionEventRecord | null>
  listEvents(vulnerabilityId?: UUID): Promise<DetectionEventRecord[]>
  insertEvent(record: DetectionEventRecord): Promise<void>
  updateEvent(id: UUID, expectedRevision: Revision, changes: EventChanges, updatedAt: Instant): Promise<DetectionEventRecord | null>
}

export interface FindingsUnitOfWork {
  run<T>(work: (store: FindingsStore) => Promise<T>): Promise<T>
  close(): Promise<void>
}

export class PersistenceUnavailableError extends Error {
  constructor() { super('Persistence is currently unavailable.'); this.name = 'PersistenceUnavailableError' }
}

export class PersistenceConstraintError extends Error {
  constructor() { super('Persistence constraint rejected the operation.'); this.name = 'PersistenceConstraintError' }
}
