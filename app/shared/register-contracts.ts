import { z } from 'zod'
import {
  CategorySchema, HandlingStatusSchema, IdentitySchema, InstantSchema, SeveritySchema, UUIDSchema,
} from './common.js'
import { VulnerabilityReadSchema } from './review-contracts.js'

const freeTextFilter = z.string().transform((value) => value.trim()).transform((value) => value || undefined).optional()

const queryFields = z.strictObject({
  q: freeTextFilter,
  tag: freeTextFilter,
  product: freeTextFilter,
  client: freeTextFilter,
  status: HandlingStatusSchema.optional(),
  eventStatus: HandlingStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  category: CategorySchema.optional(),
  detectedFrom: InstantSchema.optional(),
  detectedTo: InstantSchema.optional(),
})

export const RegisterQuerySchema = queryFields.superRefine((query, context) => {
  if (query.detectedFrom !== undefined && query.detectedTo !== undefined
    && query.detectedFrom > query.detectedTo) {
    context.addIssue({ code: 'custom', path: ['detectedTo'], message: 'Data końcowa nie może poprzedzać daty początkowej.' })
  }
}).transform((query) => {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) Reflect.deleteProperty(query, key)
  }
  return query
})
export type RegisterQuery = z.infer<typeof RegisterQuerySchema>

const NonnegativeIntegerSchema = z.number().int().nonnegative()

export const RegisterRowSchema = z.strictObject({
  vulnerability: VulnerabilityReadSchema,
  identities: z.array(IdentitySchema),
  eventCount: NonnegativeIntegerSchema,
  matchingEventIds: z.array(UUIDSchema),
  latestReceiptAt: InstantSchema.nullable(),
  products: z.array(z.string()),
  clients: z.array(z.string()),
})
export type RegisterRow = z.infer<typeof RegisterRowSchema>

export const RegisterQueryResultSchema = z.strictObject({
  rows: z.array(RegisterRowSchema),
  counts: z.strictObject({
    vulnerabilityCount: NonnegativeIntegerSchema,
    matchingEventCount: NonnegativeIntegerSchema,
  }),
})
export type RegisterQueryResult = z.infer<typeof RegisterQueryResultSchema>
