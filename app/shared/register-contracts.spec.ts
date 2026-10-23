import { describe, expect, it } from 'vitest'
import { SharedFactsSchema } from './finding-contracts.js'
import { VulnerabilityReadSchema } from './review-contracts.js'
import { RegisterQueryResultSchema, RegisterQuerySchema } from './register-contracts.js'

const vulnerabilityId = '00000000-0000-4000-8000-000000000001'
const timestamp = '2026-10-22T00:00:00.000Z'
const vulnerability = VulnerabilityReadSchema.parse({
  ...Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null])),
  id: vulnerabilityId, status: 'missing_data', closureNote: null, tags: [], gapResolutions: [], gaps: [],
  createdAt: timestamp, updatedAt: timestamp, revision: 1,
})

function row(overrides: Record<string, unknown> = {}) {
  return {
    vulnerability, identities: [], eventCount: 0, matchingEventIds: [], latestReceiptAt: null,
    products: [], clients: [], ...overrides,
  }
}

describe('RegisterQuerySchema', () => {
  it('accepts an empty query and trims free-text values', () => {
    expect(RegisterQuerySchema.parse({})).toEqual({})
    expect(RegisterQuerySchema.parse({ q: '  CVE-2026-1000  ', tag: ' ops ', product: ' Atlas ', client: ' Cedar ' }))
      .toEqual({ q: 'CVE-2026-1000', tag: 'ops', product: 'Atlas', client: 'Cedar' })
  })

  it('treats whitespace-only free-text fields as absent', () => {
    expect(RegisterQuerySchema.parse({ q: '  ', tag: '\t', product: '  ', client: '\n' })).toEqual({})
  })

  it('accepts exact controlled filters and canonicalizes explicit-offset instants', () => {
    expect(RegisterQuerySchema.parse({
      status: 'review', eventStatus: 'missing_data', severity: 'high', category: 'dependency',
      detectedFrom: '2026-10-22T01:00:00+01:00', detectedTo: '2026-10-22T00:00:00Z',
    })).toEqual({
      status: 'review', eventStatus: 'missing_data', severity: 'high', category: 'dependency',
      detectedFrom: '2026-10-22T00:00:00.000Z', detectedTo: '2026-10-22T00:00:00.000Z',
    })
  })

  it.each([
    ['unknown key', { notificationAssessment: 'required' }],
    ['repeated scalar', { q: ['Atlas', 'Beacon'] }],
    ['nested value', { q: { value: 'Atlas' } }],
    ['non-string value', { q: 10 }],
    ['empty controlled value', { status: '' }],
    ['wrong enum casing', { severity: 'HIGH' }],
    ['malformed instant', { detectedFrom: '2026-02-30T00:00:00Z' }],
    ['inverted bounds', { detectedFrom: '2026-10-23T00:00:00Z', detectedTo: '2026-10-22T00:00:00Z' }],
  ])('rejects %s', (_name, input) => {
    expect(RegisterQuerySchema.safeParse(input).success).toBe(false)
  })
})

describe('RegisterQueryResultSchema', () => {
  it('accepts an empty register result with zero distinct counts', () => {
    expect(RegisterQueryResultSchema.parse({
      rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 },
    })).toEqual({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
  })

  it('accepts strict register rows and the bounded aggregate counts', () => {
    expect(RegisterQueryResultSchema.safeParse({
      rows: [row({
        identities: [{ scheme: 'cve', value: 'CVE-2026-1000' }],
        eventCount: 2,
        matchingEventIds: ['00000000-0000-4000-8000-000000000002'],
        latestReceiptAt: '2026-10-22T00:00:00.000Z',
        products: ['Atlas'],
        clients: ['Cedar'],
      })],
      counts: { vulnerabilityCount: 1, matchingEventCount: 1 },
    }).success).toBe(true)
  })

  it.each([
    ['identity with storage metadata', { rows: [row({ identities: [{ scheme: 'cve', value: 'CVE-2026-1000', id: 'x', vulnerabilityId: 'x' }] })], counts: { vulnerabilityCount: 1, matchingEventCount: 0 } }],
    ['negative count', { rows: [], counts: { vulnerabilityCount: -1, matchingEventCount: 0 } }],
    ['non-integer count', { rows: [], counts: { vulnerabilityCount: 0.5, matchingEventCount: 0 } }],
    ['extra result metadata', { rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 }, contexts: [] }],
    ['extra row data', { rows: [row({ events: [] })], counts: { vulnerabilityCount: 1, matchingEventCount: 0 } }],
  ])('rejects %s', (_name, input) => {
    expect(RegisterQueryResultSchema.safeParse(input).success).toBe(false)
  })
})
