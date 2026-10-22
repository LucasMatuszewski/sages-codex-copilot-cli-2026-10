import type { MigrationInterface, QueryRunner } from 'typeorm'

const vulnerabilityColumns = [
  'id TEXT NOT NULL PRIMARY KEY',
  'title TEXT NULL', 'description TEXT NULL', 'componentName TEXT NULL', 'ecosystem TEXT NULL',
  'vendor TEXT NULL', 'affectedComponentVersions TEXT NULL', 'generalExploit TEXT NULL',
  'exploitPrerequisites TEXT NULL', 'remediationGuidance TEXT NULL', 'fixedComponentVersions TEXT NULL',
  'category TEXT NULL', 'weaknessCode TEXT NULL', 'severity TEXT NULL', 'severityRationale TEXT NULL',
  'score REAL NULL', 'scoreSystem TEXT NULL', 'scoreVersion TEXT NULL', 'scoreSource TEXT NULL',
  'exploitationSignal TEXT NULL', 'exploitationEvidence TEXT NULL', 'knowledgeAt TEXT NULL',
  'referencesJson TEXT NULL', 'tagsJson TEXT NOT NULL', 'status TEXT NOT NULL', 'closureNote TEXT NULL',
  'gapResolutionsJson TEXT NOT NULL', 'createdAt TEXT NOT NULL', 'updatedAt TEXT NOT NULL',
  'revision INTEGER NOT NULL CHECK (revision > 0)',
]

const eventColumns = [
  'id TEXT NOT NULL PRIMARY KEY', 'vulnerabilityId TEXT NOT NULL', 'source TEXT NOT NULL',
  'sourceEventId TEXT NOT NULL', 'receiptAt TEXT NOT NULL', 'detectedAt TEXT NULL', 'product TEXT NULL',
  'productVersion TEXT NULL', 'client TEXT NULL', 'environment TEXT NULL', 'installedComponentVersion TEXT NULL',
  'componentLocation TEXT NULL', 'evidence TEXT NULL', 'reviewNotes TEXT NULL', 'scannerAssessmentJson TEXT NULL',
  'productAffected TEXT NULL', 'exploitabilityNotes TEXT NULL', 'impactDescription TEXT NULL', 'status TEXT NOT NULL',
  'closureNote TEXT NULL', 'tagsJson TEXT NOT NULL', 'gapResolutionsJson TEXT NOT NULL',
  'reportingEvidenceJson TEXT NULL', 'incomingSharedSnapshotJson TEXT NOT NULL',
  'originalIntakeSnapshotJson TEXT NOT NULL', 'requestFingerprint TEXT NOT NULL', 'createdAt TEXT NOT NULL',
  'updatedAt TEXT NOT NULL', 'revision INTEGER NOT NULL CHECK (revision > 0)',
]

export class InitialFindings1792627200000 implements MigrationInterface {
  name = 'InitialFindings1792627200000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE vulnerabilities (${vulnerabilityColumns.join(', ')})`)
    await queryRunner.query(`CREATE TABLE vulnerability_identities (
      id TEXT NOT NULL PRIMARY KEY,
      vulnerabilityId TEXT NOT NULL,
      scheme TEXT NOT NULL,
      value TEXT NOT NULL,
      CONSTRAINT uq_vulnerability_identities_scheme_value UNIQUE (scheme, value),
      CONSTRAINT fk_vulnerability_identities_vulnerability FOREIGN KEY (vulnerabilityId)
        REFERENCES vulnerabilities(id) ON DELETE RESTRICT
    )`)
    await queryRunner.query(`CREATE TABLE detection_events (
      ${eventColumns.join(', ')},
      CONSTRAINT uq_detection_events_source_source_event_id UNIQUE (source, sourceEventId),
      CONSTRAINT fk_detection_events_vulnerability FOREIGN KEY (vulnerabilityId)
        REFERENCES vulnerabilities(id) ON DELETE RESTRICT
    )`)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE detection_events')
    await queryRunner.query('DROP TABLE vulnerability_identities')
    await queryRunner.query('DROP TABLE vulnerabilities')
  }
}
