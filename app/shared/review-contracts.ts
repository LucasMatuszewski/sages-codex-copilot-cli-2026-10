import { z } from 'zod'
import {
  GapResolutionSchema, GapSchema, HandlingStatusSchema, IdentitySchema, InstantSchema,
  RevisionSchema, TagsSchema, UUIDSchema,
} from './common.js'
import {
  FindingCreateRequestSchema, ObservationSchema, ReportingEvidenceSchema, SharedFactsSchema,
} from './finding-contracts.js'

const closureNote = z.string().trim().nullable()
const sharedResolution = GapResolutionSchema.refine(
  (resolution) => ['componentName', 'category', 'severity'].includes(resolution.field),
  { path: ['field'], error: 'Wyjaśnienie nie dotyczy dozwolonego pola wspólnego.' },
)

export const SharedPatchRequestSchema = z.strictObject({
  expectedRevision: RevisionSchema,
  ...SharedFactsSchema.shape,
  status: HandlingStatusSchema.optional(),
  closureNote: closureNote.optional(),
  gapResolutions: z.array(sharedResolution).nullable().optional(),
  addIdentities: z.array(IdentitySchema).optional(),
})
export type SharedPatchRequest = z.infer<typeof SharedPatchRequestSchema>

const reviewMetadata = {
  id: UUIDSchema,
  status: HandlingStatusSchema,
  closureNote,
  tags: TagsSchema,
  gapResolutions: z.array(GapResolutionSchema),
  gaps: z.array(GapSchema),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
  revision: RevisionSchema,
}

export const VulnerabilityReadSchema = z.strictObject({
  ...SharedFactsSchema.required().shape,
  ...reviewMetadata,
})
export type VulnerabilityRead = z.infer<typeof VulnerabilityReadSchema>

export const DetectionEventReadSchema = z.strictObject({
  ...ObservationSchema.required().shape,
  ...reviewMetadata,
  vulnerabilityId: UUIDSchema,
  source: z.string().trim().min(1).max(255),
  sourceEventId: z.string().trim().min(1),
  receiptAt: InstantSchema,
  reportingEvidence: ReportingEvidenceSchema.nullable(),
  incomingSharedSnapshot: SharedFactsSchema,
  originalIntakeSnapshot: FindingCreateRequestSchema,
})
export type DetectionEventRead = z.infer<typeof DetectionEventReadSchema>

export const ContextSummarySchema = z.strictObject({
  id: UUIDSchema,
  manufacturer: z.string().trim().nullable(),
  product: z.string().trim().nullable(),
  productVersions: z.string().trim().nullable(),
  notificationAssessment: z.enum(['required', 'not_required', 'undecided']),
  revision: RevisionSchema,
})
export type ContextSummary = z.infer<typeof ContextSummarySchema>

export const VulnerabilityDetailResponseSchema = z.strictObject({
  vulnerability: VulnerabilityReadSchema,
  identities: z.array(IdentitySchema),
  events: z.array(DetectionEventReadSchema),
  contexts: z.array(ContextSummarySchema),
})
export type VulnerabilityDetailResponse = z.infer<typeof VulnerabilityDetailResponseSchema>

export const SharedPatchResponseSchema = z.strictObject({
  vulnerability: VulnerabilityReadSchema,
  identities: z.array(IdentitySchema),
})
export type SharedPatchResponse = z.infer<typeof SharedPatchResponseSchema>
