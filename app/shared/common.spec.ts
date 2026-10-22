import { describe, expect, it } from 'vitest'
import {
  ApiErrorSchema,
  FieldErrorSchema,
  GapResolutionSchema,
  GapSchema,
  IdentitySchema,
  InstantSchema,
  MemberStatesSchema,
  ReferenceSchema,
  TagsSchema,
  TimingAnchorSchema,
  UUIDSchema,
} from './common.js'

describe('common browser-safe contracts', () => {
  it('normalizes UUID casing and validates positive revisions through public schemas', async () => {
    const { RevisionSchema } = await import('./common.js')
    expect(UUIDSchema.parse('A0B1C2D3-0000-4000-8000-000000000001')).toBe('a0b1c2d3-0000-4000-8000-000000000001')
    expect(RevisionSchema.parse(1)).toBe(1)
    expect(RevisionSchema.safeParse(0).success).toBe(false)
  })

  it('normalizes explicit-offset instants and rejects timezone-less and impossible dates', () => {
    expect(InstantSchema.parse('2026-10-22T12:30:15+02:00')).toBe('2026-10-22T10:30:15.000Z')
    expect(InstantSchema.parse('0099-01-01T00:00:00Z')).toBe('0099-01-01T00:00:00.000Z')
    for (const value of ['2026-10-22T10:30:15', '2026-02-30T10:30:00Z', '2026-10-22', '2026-10-22T10:30:15+25:00']) {
      expect(InstantSchema.safeParse(value).success).toBe(false)
    }
  })

  it('canonicalizes identity and accepts stable source identities without public-ID syntax rules', () => {
    expect(IdentitySchema.parse({ scheme: 'cve', value: ' cve-2026-12345 ' })).toEqual({ scheme: 'cve', value: 'CVE-2026-12345' })
    expect(IdentitySchema.parse({ scheme: 'source: scanner-ref ', value: ' Ref-A ' })).toEqual({ scheme: 'source:scanner-ref', value: 'Ref-A' })
    expect(IdentitySchema.parse({ scheme: 'euvd', value: 'euvd-2026-1' }).value).toBe('EUVD-2026-1')
    expect(IdentitySchema.safeParse({ scheme: 'manual', value: 'x'.repeat(256) }).success).toBe(false)
    expect(IdentitySchema.safeParse({ scheme: 'source:   ', value: 'x' }).success).toBe(false)
  })

  it('trims and deduplicates tags and EU member states, preserving tag case', () => {
    expect(TagsSchema.parse([' Alpha ', 'alpha', 'Alpha'])).toEqual(['Alpha', 'alpha'])
    expect(TagsSchema.safeParse(['   ']).success).toBe(false)
    expect(MemberStatesSchema.parse(['pl', 'PL', 'de'])).toEqual(['PL', 'DE'])
    expect(MemberStatesSchema.safeParse(['US']).success).toBe(false)
  })

  it('accepts plain references and explicit HTTP references while normalizing observedAt', () => {
    expect(ReferenceSchema.parse({ label: ' Advisory ', reference: ' ADV-1 ', observedAt: '2026-10-22T12:30:15+02:00' })).toEqual({ label: 'Advisory', reference: 'ADV-1', observedAt: '2026-10-22T10:30:15.000Z' })
    expect(ReferenceSchema.parse({ label: 'Web', reference: 'https://example.test/advisory' })).toEqual({ label: 'Web', reference: 'https://example.test/advisory' })
    expect(ReferenceSchema.safeParse({ label: 'x', reference: 'y', surprise: true }).success).toBe(false)
  })

  it('validates gap and resolution shapes and rejects nested unknown keys', () => {
    expect(GapSchema.safeParse({ field: 'title', code: 'required', message: 'Brak tytułu', extra: true }).success).toBe(false)
    expect(GapResolutionSchema.safeParse({ field: 'title', reason: 'Reviewed', extra: true }).success).toBe(false)
    expect(GapSchema.safeParse({ field: '', code: 'required', message: 'x' }).success).toBe(false)
  })

  it('enforces timing anchor consistency and strict API error fields', () => {
    expect(TimingAnchorSchema.parse({ at: null, accuracy: 'unknown', basis: null })).toEqual({ at: null, accuracy: 'unknown', basis: null })
    expect(TimingAnchorSchema.safeParse({ at: null, accuracy: 'unknown', basis: null, extra: true }).success).toBe(false)
    expect(TimingAnchorSchema.safeParse({ at: '2026-10-22T10:30:15Z', accuracy: 'unknown', basis: null }).success).toBe(false)
    expect(TimingAnchorSchema.safeParse({ at: '2026-10-22T10:30:15Z', accuracy: 'estimated', basis: null }).success).toBe(false)
    expect(FieldErrorSchema.safeParse({ path: 'items[0].name', code: 'invalid', message: 'Niepoprawne', trace: 'private' }).success).toBe(false)
    expect(ApiErrorSchema.parse({ code: 'INVALID_REQUEST', message: 'Niepoprawne żądanie', fieldErrors: [{ path: '$', code: 'invalid', message: 'Niepoprawne' }], retryable: false })).toMatchObject({ retryable: false })
    expect(ApiErrorSchema.safeParse({ code: 'INTERNAL', message: 'Błąd', fieldErrors: [], retryable: true, stack: 'private' }).success).toBe(false)
  })
})
