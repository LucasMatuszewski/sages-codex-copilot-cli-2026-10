import { z } from 'zod'
import {
  CategorySchema,
  ExploitationSignalSchema,
  GapSchema,
  HandlingStatusSchema,
  IdentitySchema,
  InstantSchema,
  MemberStatesSchema,
  ProductAffectedSchema,
  ReferenceSchema,
  RevisionSchema,
  SeveritySchema,
  TagsSchema,
  TimingAnchorSchema,
  UUIDSchema,
} from './common.js'

const nullableText = z.string().trim().nullable().optional()
const optionalNullable = <T extends z.ZodType>(schema: T) => schema.nullable().optional()
const finiteNullableNumber = z.number().finite().nullable().optional()

export const SharedFactsSchema = z.strictObject({
  title: nullableText,
  description: nullableText,
  componentName: nullableText,
  ecosystem: nullableText,
  vendor: nullableText,
  affectedComponentVersions: nullableText,
  generalExploit: nullableText,
  exploitPrerequisites: nullableText,
  remediationGuidance: nullableText,
  fixedComponentVersions: nullableText,
  category: optionalNullable(CategorySchema),
  weaknessCode: nullableText,
  severity: optionalNullable(SeveritySchema),
  severityRationale: nullableText,
  score: finiteNullableNumber,
  scoreSystem: nullableText,
  scoreVersion: nullableText,
  scoreSource: nullableText,
  exploitationSignal: optionalNullable(ExploitationSignalSchema),
  exploitationEvidence: nullableText,
  knowledgeAt: optionalNullable(InstantSchema),
  references: z.array(ReferenceSchema).nullable().optional(),
  tags: TagsSchema.nullable().optional(),
})
export type SharedFacts = z.infer<typeof SharedFactsSchema>

export const ScannerAssessmentSchema = z.strictObject({
  category: optionalNullable(CategorySchema),
  weaknessCode: nullableText,
  severity: optionalNullable(SeveritySchema),
  severityRationale: nullableText,
  score: finiteNullableNumber,
  scoreSystem: nullableText,
  scoreVersion: nullableText,
  scoreSource: nullableText,
  exploitationSignal: optionalNullable(ExploitationSignalSchema),
  exploitationEvidence: nullableText,
  knowledgeAt: optionalNullable(InstantSchema),
})
export type ScannerAssessment = z.infer<typeof ScannerAssessmentSchema>

export const ObservationSchema = z.strictObject({
  detectedAt: optionalNullable(InstantSchema),
  product: nullableText,
  productVersion: nullableText,
  client: nullableText,
  environment: nullableText,
  installedComponentVersion: nullableText,
  componentLocation: nullableText,
  evidence: nullableText,
  reviewNotes: nullableText,
  scannerAssessment: optionalNullable(ScannerAssessmentSchema),
  productAffected: optionalNullable(ProductAffectedSchema),
  exploitabilityNotes: nullableText,
  impactDescription: nullableText,
})
export type Observation = z.infer<typeof ObservationSchema>

export const ReportingEvidenceSchema = z.strictObject({
  manufacturer: nullableText,
  reportingContact: nullableText,
  establishmentCountry: nullableText,
  coordinator: nullableText,
  product: nullableText,
  productVersions: nullableText,
  memberStates: MemberStatesSchema.nullable().optional(),
  applicability: optionalNullable(z.enum(['in_scope', 'out_of_scope', 'not_assessed'])),
  applicabilityRationale: nullableText,
  productAffected: optionalNullable(ProductAffectedSchema),
  productAffectedRationale: nullableText,
  exploitation: optionalNullable(ExploitationSignalSchema),
  exploitationEvidence: nullableText,
  notificationAssessment: optionalNullable(z.enum(['required', 'not_required', 'undecided'])),
  notificationRationale: nullableText,
  title: nullableText,
  summary: nullableText,
  vulnerabilityAccount: nullableText,
  exploitAccount: nullableText,
  severityDescription: nullableText,
  impactDescription: nullableText,
  maliciousActor: nullableText,
  measuresTaken: nullableText,
  userMeasures: nullableText,
  updateDetails: nullableText,
  sensitivityExplanation: nullableText,
  attackVector: nullableText,
  sensitivity: optionalNullable(z.enum(['sensitive', 'not_sensitive', 'unknown'])),
  regulatoryType: optionalNullable(z.enum(['default', 'important', 'critical'])),
  productClass: nullableText,
  productCategory: nullableText,
  supportEnded: z.boolean().nullable().optional(),
  mitigationExpected: z.boolean().nullable().optional(),
  awareness: optionalNullable(TimingAnchorSchema),
  measureAvailable: optionalNullable(TimingAnchorSchema),
  requestReference: nullableText,
  requestDescription: nullableText,
  requestedResponseAt: optionalNullable(InstantSchema),
  userAudience: nullableText,
  userInstructions: nullableText,
  userCommunicationReference: nullableText,
  userCommunicationState: optionalNullable(z.enum(['not_recorded', 'pending', 'recorded'])),
  userCommunicatedAt: optionalNullable(InstantSchema),
})
export type ReportingEvidence = z.infer<typeof ReportingEvidenceSchema>

const VulnerabilityCreateSchema = z.strictObject({
  ...SharedFactsSchema.shape,
  id: UUIDSchema.optional(),
  identities: z.array(IdentitySchema).min(1).optional(),
}).superRefine((vulnerability, context) => {
  const hasId = vulnerability.id !== undefined
  const hasIdentities = vulnerability.identities !== undefined
  if (hasId === hasIdentities) {
    context.addIssue({
      code: 'custom',
      path: hasId ? ['identities'] : ['id'],
      message: 'Podaj dokładnie jeden identyfikator: id albo identities.',
    })
  }
})

export const FindingCreateRequestSchema = z.strictObject({
  source: z.string().trim().min(1).max(255),
  sourceEventId: z.string().trim().min(1),
  vulnerability: VulnerabilityCreateSchema,
  observation: ObservationSchema.nullable().optional(),
  reportingEvidence: ReportingEvidenceSchema.nullable().optional(),
})
export type FindingCreateRequestInput = z.input<typeof FindingCreateRequestSchema>
export type FindingCreateRequest = z.output<typeof FindingCreateRequestSchema>

export const FindingCreateResponseSchema = z.strictObject({
  vulnerabilityId: UUIDSchema,
  eventId: UUIDSchema,
  vulnerabilityOutcome: z.enum(['created', 'reused']),
  eventOutcome: z.enum(['created', 'replayed']),
  vulnerabilityStatus: HandlingStatusSchema,
  eventStatus: HandlingStatusSchema,
  vulnerabilityRevision: RevisionSchema,
  eventRevision: RevisionSchema,
  vulnerabilityGaps: z.array(GapSchema),
  eventGaps: z.array(GapSchema),
})
export type FindingCreateResponseInput = z.input<typeof FindingCreateResponseSchema>
export type FindingCreateResponse = z.output<typeof FindingCreateResponseSchema>

export type SharedFactsInput = z.input<typeof SharedFactsSchema>
export type ScannerAssessmentInput = z.input<typeof ScannerAssessmentSchema>
export type ObservationInput = z.input<typeof ObservationSchema>
export type ReportingEvidenceInput = z.input<typeof ReportingEvidenceSchema>
