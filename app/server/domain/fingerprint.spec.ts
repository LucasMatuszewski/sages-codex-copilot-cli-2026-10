import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { FindingCreateRequestInput } from '../../shared/finding-contracts.js'
import type { UUID } from '../../shared/common.js'
import { canonicalFinding, fingerprintFinding } from './fingerprint.js'

const A = '10000000-0000-4000-8000-000000000001' as UUID
const B = '20000000-0000-4000-8000-000000000002' as UUID

const base = (): FindingCreateRequestInput => ({
  source: 'scanner-a',
  sourceEventId: 'run-17',
  vulnerability: {
    identities: [
      { scheme: 'cve', value: ' cve-2026-12345 ' },
      { scheme: 'source:scanner-a', value: ' Finding-X ' },
    ],
    title: 'Example',
    tags: ['triage', 'security'],
  },
  observation: { detectedAt: '2026-10-22T12:30:15+02:00', product: 'Widget' },
  reportingEvidence: {
    memberStates: ['pl', 'DE'],
    awareness: { at: '2026-10-22T12:30:15+02:00', accuracy: 'exact', basis: null },
  },
})

const reversed = (): FindingCreateRequestInput => ({
  reportingEvidence: {
    awareness: { basis: null, accuracy: 'exact', at: '2026-10-22T10:30:15Z' },
    memberStates: ['PL', 'DE', 'PL'],
  },
  observation: { product: 'Widget', detectedAt: '2026-10-22T10:30:15Z' },
  vulnerability: {
    tags: ['security', 'triage', 'triage'],
    title: 'Example',
    identities: [
      { value: 'Finding-X', scheme: 'source:scanner-a' },
      { value: 'CVE-2026-12345', scheme: 'cve' },
      { value: ' cve-2026-12345 ', scheme: 'cve' },
    ],
  },
  sourceEventId: 'run-17',
  source: 'scanner-a',
})

describe('canonical finding fingerprints', () => {
  it('canonicalizes object keys, set-like arrays, aliases, and equivalent explicit-offset instants', () => {
    const canonical = canonicalFinding(base(), A)
    const equivalent = canonicalFinding(reversed(), A)
    expect(equivalent).toBe(canonical)
    expect(fingerprintFinding(reversed(), A)).toBe(fingerprintFinding(base(), A))

    const parsed = JSON.parse(canonical) as { request: FindingCreateRequestInput }
    expect(parsed.request.observation).toMatchObject({ detectedAt: '2026-10-22T10:30:15.000Z' })
    expect(parsed.request.reportingEvidence).toMatchObject({
      memberStates: ['DE', 'PL'],
      awareness: { at: '2026-10-22T10:30:15.000Z' },
    })
    expect(parsed.request.vulnerability.identities).toEqual([
      { scheme: 'cve', value: 'CVE-2026-12345' },
      { scheme: 'source:scanner-a', value: 'Finding-X' },
    ])
  })

  it('returns a lowercase SHA-256 digest of the canonical string', () => {
    const canonical = canonicalFinding(base(), A)
    expect(fingerprintFinding(base(), A)).toBe(createHash('sha256').update(canonical).digest('hex'))
    expect(fingerprintFinding(base(), A)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes the fingerprint for material request or resolved-identity changes', () => {
    const variants: FindingCreateRequestInput[] = []
    const product = base(); product.observation = { ...product.observation as object, product: 'Widget-2' }
    variants.push(product)
    const title = base(); title.vulnerability = { ...title.vulnerability, title: 'Example 2' }
    variants.push(title)
    const alias = base(); alias.vulnerability = { ...alias.vulnerability, identities: [...alias.vulnerability.identities!, { scheme: 'manual', value: 'local-7' }] }
    variants.push(alias)
    const source = base(); source.sourceEventId = 'run-18'
    variants.push(source)
    expect(variants.every((variant) => fingerprintFinding(variant, A) !== fingerprintFinding(base(), A))).toBe(true)
    expect(fingerprintFinding(base(), A)).not.toBe(fingerprintFinding(base(), B))
  })

  it('preserves absent, null, and empty-object distinctions and rejects unknown keys or invalid instants', () => {
    const absent = base(); delete absent.observation
    const explicitNull = { ...base(), observation: null }
    const empty = { ...base(), observation: {} }
    expect(new Set([absent, explicitNull, empty].map((input) => fingerprintFinding(input, A))).size).toBe(3)

    const omittedTitle = base(); delete omittedTitle.vulnerability.title
    const nullTitle = base(); nullTitle.vulnerability.title = null
    expect(fingerprintFinding(omittedTitle, A)).not.toBe(fingerprintFinding(nullTitle, A))
    expect(() => fingerprintFinding({ ...base(), receiptAt: '2026-10-22T10:30:15Z' } as FindingCreateRequestInput, A)).toThrow()
    const invalidDate = base(); invalidDate.observation = { detectedAt: '2026-02-30T12:00:00Z' }
    expect(() => fingerprintFinding(invalidDate, A)).toThrow()
  })

  it('preserves ordered references and does not mutate frozen caller input', () => {
    const first = base()
    first.vulnerability.references = [
      { label: 'one', reference: 'https://example.test/one' },
      { label: 'two', reference: 'https://example.test/two' },
    ]
    const second = structuredClone(first)
    second.vulnerability.references = [...second.vulnerability.references!].reverse()
    expect(fingerprintFinding(first, A)).not.toBe(fingerprintFinding(second, A))

    const frozen = deepFreeze(base())
    const before = JSON.stringify(frozen)
    canonicalFinding(frozen, A)
    fingerprintFinding(frozen, A)
    expect(JSON.stringify(frozen)).toBe(before)
  })
})

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}
