import { z } from 'zod'
import { GapResolutionSchema, HandlingStatusSchema, RevisionSchema, TagsSchema } from './common.js'
import { ObservationSchema, ReportingEvidenceSchema } from './finding-contracts.js'
import { DetectionEventReadSchema } from './review-contracts.js'

const eventResolution = GapResolutionSchema.refine(
  (resolution) => ['detectedAt', 'product', 'productVersion', 'client', 'installedComponentVersion'].includes(resolution.field),
  { path: ['field'], error: 'Wyjaśnienie nie dotyczy dozwolonego pola zdarzenia.' },
)

export const EventPatchRequestSchema = z.strictObject({
  expectedRevision: RevisionSchema,
  ...ObservationSchema.shape,
  status: HandlingStatusSchema.optional(),
  closureNote: z.string().trim().nullable().optional(),
  tags: TagsSchema.nullable().optional(),
  gapResolutions: z.array(eventResolution).nullable().optional(),
  reportingEvidence: ReportingEvidenceSchema.partial().nullable().optional(),
})
export type EventPatchRequest = z.infer<typeof EventPatchRequestSchema>

export const EventPatchResponseSchema = z.strictObject({ event: DetectionEventReadSchema })
export type EventPatchResponse = z.infer<typeof EventPatchResponseSchema>
