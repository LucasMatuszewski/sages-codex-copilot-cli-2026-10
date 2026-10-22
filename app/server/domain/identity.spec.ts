import { describe, expect, it } from 'vitest'
import type { Identity, UUID } from '../../shared/common.js'
import { identityKey, normalizeIdentity, resolveIdentitySet } from './identity.js'

const A = '10000000-0000-4000-8000-000000000001' as UUID
const B = '20000000-0000-4000-8000-000000000002' as UUID
const cve = (value: string): Identity => ({ scheme: 'cve', value })
const sourceId = (scheme: string, value: string): Identity => ({ scheme, value })

describe('identity normalization and resolution', () => {
  it('reuses the shared identity schema and preserves case for non-public values', () => {
    expect(normalizeIdentity(cve(' cve-2026-12345 '))).toEqual(cve('CVE-2026-12345'))
    expect(normalizeIdentity({ scheme: 'euvd', value: ' euvd-2026-12345 ' })).toEqual({ scheme: 'euvd', value: 'EUVD-2026-12345' })
    expect(normalizeIdentity(sourceId('source:scanner-a', ' Finding-X '))).toEqual(sourceId('source:scanner-a', 'Finding-X'))
    expect(normalizeIdentity(sourceId('manual', 'Finding-X'))).not.toEqual(sourceId('manual', 'finding-x'))
    expect(identityKey(sourceId('source:scanner-a', 'b:c'))).not.toBe(identityKey(sourceId('source:scanner-a:b', 'c')))
    expect(identityKey(sourceId('source:scanner-a', 'Finding-X'))).not.toBe(identityKey(sourceId('source:scanner-b', 'Finding-X')))
  })

  it('reuses when all requested identities point to one vulnerability', () => {
    const requested = [cve('CVE-2026-12345'), sourceId('source:scanner-a', 'Finding-X')]
    const owners = requested.map((identity) => ({ identity, vulnerabilityId: A }))
    expect(resolveIdentitySet(requested, owners)).toEqual({ kind: 'reuse', vulnerabilityId: A })
  })

  it('returns a stable conflict when requested identities have different owners', () => {
    const requested = [cve('CVE-2026-12345'), sourceId('source:scanner-a', 'Finding-X')]
    const owners = [
      { identity: requested[0]!, vulnerabilityId: A },
      { identity: requested[1]!, vulnerabilityId: B },
    ]
    expect(resolveIdentitySet(requested, owners)).toEqual({ kind: 'conflict', vulnerabilityIds: [A, B] })
    expect(resolveIdentitySet(requested, [...owners].reverse())).toEqual({ kind: 'conflict', vulnerabilityIds: [A, B] })
  })

  it('ignores unrequested owner rows, deduplicates repeated requests, and returns new when none match', () => {
    const requested = [cve(' cve-2026-12345 '), cve('CVE-2026-12345')]
    const owners = [
      { identity: cve('CVE-2026-12345'), vulnerabilityId: A },
      { identity: sourceId('source:scanner-z', 'unrelated'), vulnerabilityId: B },
    ]
    expect(resolveIdentitySet(requested, owners)).toEqual({ kind: 'reuse', vulnerabilityId: A })
    expect(resolveIdentitySet(requested, [])).toEqual({ kind: 'new' })
  })

  it('does not mutate caller-owned identity arrays or objects', () => {
    const requested = [cve(' cve-2026-12345 '), sourceId('source:scanner-a', 'Finding-X')]
    const before = structuredClone(requested)
    resolveIdentitySet(requested, [{ identity: cve('CVE-2026-12345'), vulnerabilityId: A }])
    expect(requested).toEqual(before)
  })
})
