import { z } from 'zod'

const nonemptyTrimmedString = z.string().trim().min(1)
const fieldPathPattern = /^(?:[A-Za-z_$][\w$]*(?:\[\d+\])?)(?:\.[A-Za-z_$][\w$]*(?:\[\d+\])?)*$/
const indexedPathPattern = /^(?:\$|[A-Za-z_$][\w$]*(?:\[\d+\])?)(?:\.[A-Za-z_$][\w$]*(?:\[\d+\])?)*$/

export const UUIDSchema = z.uuid().transform((value) => value.toLowerCase())
export type UUID = z.infer<typeof UUIDSchema>

export const RevisionSchema = z.number().int().positive()
export type Revision = z.infer<typeof RevisionSchema>

const explicitOffsetInstant = z.iso.datetime({ offset: true }).refine((value) => {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const calendarDate = new Date(0)
  calendarDate.setUTCFullYear(year, month - 1, day)
  calendarDate.setUTCHours(0, 0, 0, 0)
  return Number.isFinite(Date.parse(value)) && calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day
}, { error: 'Wymagana jest poprawna data i czas ze strefą czasową.' })
export const InstantSchema = explicitOffsetInstant.transform((value) => new Date(value).toISOString())
export type Instant = z.infer<typeof InstantSchema>

export const HandlingStatusSchema = z.enum(['review', 'missing_data', 'in_progress', 'closed'])
export type HandlingStatus = z.infer<typeof HandlingStatusSchema>

export const CategorySchema = z.enum(['dependency', 'application', 'other', 'unknown'])
export type Category = z.infer<typeof CategorySchema>

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'unknown'])
export type Severity = z.infer<typeof SeveritySchema>

export const ExploitationSignalSchema = z.enum(['confirmed', 'not_established', 'unknown'])
export type ExploitationSignal = z.infer<typeof ExploitationSignalSchema>

export const ProductAffectedSchema = z.enum(['affected', 'not_affected', 'unknown'])
export type ProductAffected = z.infer<typeof ProductAffectedSchema>

const IdentitySchemeSchema = z.string().trim().superRefine((value, context) => {
  if (value === 'cve' || value === 'euvd' || value === 'manual') return
  if (!value.startsWith('source:')) {
    context.addIssue({ code: 'custom', message: 'Nieobsługiwany schemat identyfikatora.' })
    return
  }
  const name = value.slice('source:'.length).trim()
  if (name.length === 0 || name.length > 255) context.addIssue({ code: 'custom', message: 'Nazwa źródła musi zawierać od 1 do 255 znaków.' })
}).transform((value) => value.startsWith('source:') ? `source:${value.slice('source:'.length).trim()}` : value)

export const IdentitySchema = z.strictObject({
  scheme: IdentitySchemeSchema,
  value: z.string().trim().min(1).max(255),
}).transform((identity) => ({
  ...identity,
  value: identity.scheme === 'cve' || identity.scheme === 'euvd' ? identity.value.toUpperCase() : identity.value,
}))
export type Identity = z.infer<typeof IdentitySchema>

export const TagsSchema = z.array(nonemptyTrimmedString).transform((values) => [...new Set(values)])
export type Tags = z.infer<typeof TagsSchema>

const euMemberStateCodes = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'] as const
const MemberStateCodeSchema = z.string().trim().toUpperCase().pipe(z.enum(euMemberStateCodes))
export const MemberStatesSchema = z.array(MemberStateCodeSchema).transform((values) => [...new Set(values)])
export type MemberStates = z.infer<typeof MemberStatesSchema>

export const ReferenceSchema = z.strictObject({
  label: nonemptyTrimmedString,
  reference: nonemptyTrimmedString,
  observedAt: InstantSchema.nullable().optional(),
})
export type Reference = z.infer<typeof ReferenceSchema>

export const GapResolutionSchema = z.strictObject({
  field: nonemptyTrimmedString.refine((value) => fieldPathPattern.test(value), { error: 'Ścieżka pola musi być zapisana w formacie z kropkami.' }),
  reason: nonemptyTrimmedString,
})
export type GapResolution = z.infer<typeof GapResolutionSchema>

export const TimingAnchorSchema = z.strictObject({
  at: InstantSchema.nullable(),
  accuracy: z.enum(['exact', 'estimated', 'unknown']),
  basis: z.string().trim().nullable(),
}).superRefine((anchor, context) => {
  if (anchor.accuracy === 'unknown' && anchor.at !== null) {
    context.addIssue({ code: 'custom', path: ['at'], message: 'Nieznany czas musi mieć wartość null.' })
  }
  if ((anchor.accuracy === 'exact' || anchor.accuracy === 'estimated') && anchor.at === null) {
    context.addIssue({ code: 'custom', path: ['at'], message: 'Znany czas wymaga wartości daty i godziny.' })
  }
  if (anchor.accuracy === 'estimated' && (anchor.basis === null || anchor.basis.length === 0)) {
    context.addIssue({ code: 'custom', path: ['basis'], message: 'Szacowany czas wymaga uzasadnienia.' })
  }
})
export type TimingAnchor = z.infer<typeof TimingAnchorSchema>

export const GapSchema = z.strictObject({
  field: nonemptyTrimmedString.refine((value) => fieldPathPattern.test(value), { error: 'Ścieżka pola musi być zapisana w formacie z kropkami.' }),
  code: nonemptyTrimmedString,
  message: nonemptyTrimmedString,
})
export type Gap = z.infer<typeof GapSchema>

export const FieldErrorSchema = z.strictObject({
  path: nonemptyTrimmedString.refine((value) => indexedPathPattern.test(value), { error: 'Ścieżka błędu jest niepoprawna.' }),
  code: nonemptyTrimmedString,
  message: nonemptyTrimmedString,
})
export type FieldError = z.infer<typeof FieldErrorSchema>

export const ApiErrorSchema = z.strictObject({
  code: nonemptyTrimmedString,
  message: nonemptyTrimmedString,
  fieldErrors: z.array(FieldErrorSchema),
  retryable: z.boolean(),
  currentRevision: RevisionSchema.optional(),
  existingResourceId: UUIDSchema.optional(),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
