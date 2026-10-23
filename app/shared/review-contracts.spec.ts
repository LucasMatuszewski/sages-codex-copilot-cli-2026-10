import { describe, expect, it } from 'vitest'
import { ObservationSchema, SharedFactsSchema } from './finding-contracts.js'
import {
  ContextSummarySchema, DetectionEventReadSchema, SharedPatchRequestSchema,
  SharedPatchResponseSchema, VulnerabilityDetailResponseSchema, VulnerabilityReadSchema,
} from './review-contracts.js'

const id = '11111111-1111-4111-8111-111111111111'
const at = '2026-10-23T09:00:00.000Z'
const metadata = {
  id, status: 'missing_data', closureNote: null, tags: [], gapResolutions: [], gaps: [],
  createdAt: at, updatedAt: at, revision: 1,
}
const facts = Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null]))
const vulnerability = { ...facts, ...metadata }
const event = {
  ...Object.fromEntries(Object.keys(ObservationSchema.shape).map((key) => [key, null])),
  ...metadata, vulnerabilityId: id, source: 'scanner', sourceEventId: 'event-1', receiptAt: at,
  reportingEvidence: null, incomingSharedSnapshot: { title: 'Incoming' },
  originalIntakeSnapshot: {
    source: 'scanner', sourceEventId: 'event-1',
    vulnerability: { identities: [{ scheme: 'manual', value: 'sample' }] },
  },
}

describe('shared review transport contracts', () => {
  it('accepts expected-revision-only and normalizes editable fields without filling omitted values', () => {
    expect(SharedPatchRequestSchema.parse({ expectedRevision: 1 })).toEqual({ expectedRevision: 1 })
    expect(SharedPatchRequestSchema.parse({
      expectedRevision: 2, title: ' Updated ', tags: [' triage ', 'triage'],
      knowledgeAt: '2026-10-23T11:00:00+02:00', addIdentities: [{ scheme: 'cve', value: ' cve-2026-1234 ' }],
    })).toEqual({
      expectedRevision: 2, title: 'Updated', tags: ['triage'], knowledgeAt: at,
      addIdentities: [{ scheme: 'cve', value: 'CVE-2026-1234' }],
    })
  })

  it('preserves explicit null clears and accepts only the three permitted shared explanations', () => {
    expect(SharedPatchRequestSchema.parse({
      expectedRevision: 1, title: null, tags: null, references: null, closureNote: null, gapResolutions: null,
    })).toEqual({ expectedRevision: 1, title: null, tags: null, references: null, closureNote: null, gapResolutions: null })
    expect(SharedPatchRequestSchema.safeParse({
      expectedRevision: 1,
      gapResolutions: ['componentName', 'category', 'severity'].map((field) => ({ field, reason: ' Unknown ' })),
      addIdentities: [],
    }).success).toBe(true)
  })

  it.each([
    {}, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { expectedRevision: '1' },
    { expectedRevision: 1, status: null }, { expectedRevision: 1, addIdentities: null },
    { expectedRevision: 1, tags: [' '] }, { expectedRevision: 1, knowledgeAt: '2026-02-30T09:00:00Z' },
    { expectedRevision: 1, knowledgeAt: '2026-10-23T09:00:00' },
    ...['id', 'identities', 'source', 'events', 'incomingSharedSnapshot', 'originalIntakeSnapshot', 'revision'].map((key) => ({ expectedRevision: 1, [key]: id })),
    { expectedRevision: 1, addIdentities: [{ scheme: 'manual', value: ' ' }] },
    { expectedRevision: 1, addIdentities: [{ scheme: 'manual', value: 'x', id }] },
    ...['title', 'detectedAt', 'severity.bad', 'bad path'].map((field) => ({ expectedRevision: 1, gapResolutions: [{ field, reason: 'Unknown' }] })),
    { expectedRevision: 1, gapResolutions: [{ field: 'severity', reason: ' ' }] },
  ])('rejects malformed or immutable patch data %#', (input) => {
    expect(SharedPatchRequestSchema.safeParse(input).success).toBe(false)
  })

  it('roundtrips complete shared/event projections and strict response envelopes', () => {
    expect(VulnerabilityReadSchema.parse(vulnerability)).toEqual(vulnerability)
    expect(DetectionEventReadSchema.parse(event)).toEqual(event)
    const detail = { vulnerability, identities: [{ scheme: 'manual', value: 'sample' }], events: [event], contexts: [] }
    expect(VulnerabilityDetailResponseSchema.parse(detail)).toEqual(detail)
    expect(SharedPatchResponseSchema.parse({ vulnerability, identities: [] })).toEqual({ vulnerability, identities: [] })
    expect(ContextSummarySchema.safeParse({ id, manufacturer: null, product: null, productVersions: null, notificationAssessment: 'undecided', revision: 1 }).success).toBe(true)
  })

  it('requires every fact, observation and event gap projection and excludes private metadata', () => {
    for (const key of Object.keys(SharedFactsSchema.shape)) {
      const incomplete: Record<string, unknown> = { ...vulnerability }; delete incomplete[key]
      expect(VulnerabilityReadSchema.safeParse(incomplete).success).toBe(false)
    }
    for (const key of [...Object.keys(ObservationSchema.shape), 'gaps']) {
      const incomplete: Record<string, unknown> = { ...event }; delete incomplete[key]
      expect(DetectionEventReadSchema.safeParse(incomplete).success).toBe(false)
    }
    expect(DetectionEventReadSchema.safeParse({ ...event, requestFingerprint: 'secret' }).success).toBe(false)
    expect(VulnerabilityDetailResponseSchema.safeParse({ vulnerability, identities: [{ scheme: 'manual', value: 'x', id }], events: [], contexts: [] }).success).toBe(false)
  })

  it.each([
    { gaps: [{ field: 'bad path', code: 'MISSING_VALUE', message: 'Missing' }] },
    { gaps: [{ field: 'title', code: 'MISSING_VALUE', message: 'Missing', extra: true }] },
    { createdAt: '2026-02-30T09:00:00Z' }, { updatedAt: 'yesterday' }, { tags: [' '] },
    { gapResolutions: [{ field: 'bad path', reason: 'Unknown' }] },
  ])('retains common strict gap/instant/tag metadata constraints %#', (changes) => {
    expect(VulnerabilityReadSchema.safeParse({ ...vulnerability, ...changes }).success).toBe(false)
    expect(DetectionEventReadSchema.safeParse({ ...event, ...changes }).success).toBe(false)
  })
})
