import { describe, expect, it } from 'vitest'
import { ObservationSchema, SharedFactsSchema } from './finding-contracts.js'
import { DetectionEventReadSchema } from './review-contracts.js'
import { EventPatchRequestSchema, EventPatchResponseSchema } from './event-review-contracts.js'

const id = '11111111-1111-4111-8111-111111111111'
const at = '2026-10-23T08:00:00.000Z'
const event = {
  ...Object.fromEntries(Object.keys(ObservationSchema.shape).map((key) => [key, null])),
  id, vulnerabilityId: id, source: 'scanner', sourceEventId: 'event-1', receiptAt: at,
  status: 'review', closureNote: null, tags: [], gapResolutions: [], gaps: [], reportingEvidence: null,
  incomingSharedSnapshot: { ...Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null])) },
  originalIntakeSnapshot: { source: 'scanner', sourceEventId: 'event-1', vulnerability: { identities: [{ scheme: 'manual', value: 'sample' }] } },
  createdAt: at, updatedAt: at, revision: 1,
}

describe('event review transport contracts', () => {
  it('accepts a valid partial patch and preserves omission and explicit clears', () => {
    const valid = {
      expectedRevision: 1,
      detectedAt: '2026-10-23T10:00:00+02:00',
      product: ' Synthetic product ',
      tags: null,
      scannerAssessment: { severity: 'low' },
      reportingEvidence: { manufacturer: null },
    }
    expect(EventPatchRequestSchema.safeParse(valid).success).toBe(true)
    expect(EventPatchRequestSchema.parse(valid)).toEqual({
      expectedRevision: 1, detectedAt: at, product: 'Synthetic product', tags: null,
      scannerAssessment: { severity: 'low' }, reportingEvidence: { manufacturer: null },
    })
    expect(EventPatchRequestSchema.parse({ expectedRevision: 1 })).toEqual({ expectedRevision: 1 })
    expect(EventPatchRequestSchema.safeParse({
      expectedRevision: 1,
      gapResolutions: ['detectedAt', 'product', 'productVersion', 'client', 'installedComponentVersion']
        .map((field) => ({ field, reason: 'Not available in the source' })),
    }).success).toBe(true)
  })

  it.each([
    {}, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { expectedRevision: '1' },
    { expectedRevision: 1, status: null }, { expectedRevision: 1, detectedAt: '2026-02-30T09:00:00Z' },
    ...['id', 'vulnerabilityId', 'source', 'sourceEventId', 'receiptAt', 'incomingSharedSnapshot', 'originalIntakeSnapshot', 'requestFingerprint', 'createdAt', 'updatedAt', 'revision'].map((key) => ({ expectedRevision: 1, [key]: id })),
    { expectedRevision: 1, gapResolutions: [{ field: 'severity', reason: 'Unknown' }] },
    { expectedRevision: 1, gapResolutions: [{ field: 'product', reason: ' ' }] },
    { expectedRevision: 1, gapResolutions: [{ field: 'environment', reason: 'Unsupported field' }] },
  ])('rejects invalid or immutable patch data %#', (input) => {
    expect(EventPatchRequestSchema.safeParse(input).success).toBe(false)
  })

  it('accepts only the strict existing event projection in the response envelope', () => {
    const response = { event }
    expect(EventPatchResponseSchema.safeParse(response).success).toBe(true)
    expect(EventPatchResponseSchema.parse(response)).toEqual(response)
    expect(DetectionEventReadSchema.parse(event)).toEqual(event)
    expect(EventPatchResponseSchema.safeParse({ event, gaps: [] }).success).toBe(false)
    expect(EventPatchResponseSchema.safeParse({ event: { ...event, requestFingerprint: 'private' } }).success).toBe(false)
  })
})
