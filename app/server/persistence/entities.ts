import { EntitySchema } from 'typeorm'
import type { DetectionEventRecord, VulnerabilityIdentityRecord, VulnerabilityRecord } from '../application/ports/findings-store.js'

const jsonTransformer = {
  to(value: unknown) { return value === null ? null : JSON.stringify(value) },
  from(value: string | null) { return value === null ? null : JSON.parse(value) as unknown },
}

const text = (nullable = true) => ({ type: 'text' as const, nullable })
const json = (name: string, nullable = false) => ({ name, type: 'text' as const, nullable, transformer: jsonTransformer })
const sharedTextNames = [
  'title', 'description', 'componentName', 'ecosystem', 'vendor', 'affectedComponentVersions',
  'generalExploit', 'exploitPrerequisites', 'remediationGuidance', 'fixedComponentVersions',
  'category', 'weaknessCode', 'severity', 'severityRationale', 'scoreSystem', 'scoreVersion',
  'scoreSource', 'exploitationSignal', 'exploitationEvidence', 'knowledgeAt',
] as const

export const VulnerabilityEntity = new EntitySchema<VulnerabilityRecord>({
  name: 'VulnerabilityEntity',
  tableName: 'vulnerabilities',
  columns: {
    id: { type: 'text', primary: true },
    ...Object.fromEntries(sharedTextNames.map((name) => [name, text()])),
    score: { type: 'float', nullable: true },
    references: json('referencesJson', true),
    tags: json('tagsJson'),
    status: { type: 'text' },
    closureNote: text(),
    gapResolutions: json('gapResolutionsJson'),
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    revision: { type: 'integer' },
  },
  checks: [{ name: 'ck_vulnerabilities_revision_positive', expression: 'revision > 0' }],
})

export const VulnerabilityIdentityEntity = new EntitySchema<VulnerabilityIdentityRecord>({
  name: 'VulnerabilityIdentityEntity',
  tableName: 'vulnerability_identities',
  columns: {
    id: { type: 'text', primary: true },
    vulnerabilityId: { type: 'text' },
    scheme: { type: 'text' },
    value: { type: 'text' },
  },
  uniques: [{ name: 'uq_vulnerability_identities_scheme_value', columns: ['scheme', 'value'] }],
  foreignKeys: [{
    name: 'fk_vulnerability_identities_vulnerability', target: VulnerabilityEntity,
    columnNames: ['vulnerabilityId'], referencedColumnNames: ['id'], onDelete: 'RESTRICT',
  }],
})

const observationTextNames = [
  'detectedAt', 'product', 'productVersion', 'client', 'environment', 'installedComponentVersion',
  'componentLocation', 'evidence', 'reviewNotes', 'productAffected', 'exploitabilityNotes', 'impactDescription',
] as const

export const DetectionEventEntity = new EntitySchema<DetectionEventRecord>({
  name: 'DetectionEventEntity',
  tableName: 'detection_events',
  columns: {
    id: { type: 'text', primary: true },
    vulnerabilityId: { type: 'text' },
    source: { type: 'text' },
    sourceEventId: { type: 'text' },
    receiptAt: { type: 'text' },
    ...Object.fromEntries(observationTextNames.map((name) => [name, text()])),
    scannerAssessment: json('scannerAssessmentJson', true),
    status: { type: 'text' },
    closureNote: text(),
    tags: json('tagsJson'),
    gapResolutions: json('gapResolutionsJson'),
    reportingEvidence: json('reportingEvidenceJson', true),
    incomingSharedSnapshot: json('incomingSharedSnapshotJson'),
    originalIntakeSnapshot: json('originalIntakeSnapshotJson'),
    requestFingerprint: { type: 'text' },
    createdAt: { type: 'text' },
    updatedAt: { type: 'text' },
    revision: { type: 'integer' },
  },
  uniques: [{ name: 'uq_detection_events_source_source_event_id', columns: ['source', 'sourceEventId'] }],
  foreignKeys: [{
    name: 'fk_detection_events_vulnerability', target: VulnerabilityEntity,
    columnNames: ['vulnerabilityId'], referencedColumnNames: ['id'], onDelete: 'RESTRICT',
  }],
  checks: [{ name: 'ck_detection_events_revision_positive', expression: 'revision > 0' }],
})
