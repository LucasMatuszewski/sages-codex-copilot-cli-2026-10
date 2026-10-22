import { IdentitySchema, UUIDSchema, type Identity, type UUID } from '../../shared/common.js'

export function normalizeIdentity(input: Identity): Identity {
  return IdentitySchema.parse(input)
}

export function identityKey(input: Identity): string {
  const identity = normalizeIdentity(input)
  return JSON.stringify([identity.scheme, identity.value])
}

export type IdentityOwner = { identity: Identity; vulnerabilityId: UUID }

export type IdentityResolution =
  | { kind: 'new' }
  | { kind: 'reuse'; vulnerabilityId: UUID }
  | { kind: 'conflict'; vulnerabilityIds: readonly UUID[] }

export function resolveIdentitySet(requested: readonly Identity[], owners: readonly IdentityOwner[]): IdentityResolution {
  const requestedKeys = new Set(requested.map(identityKey))
  const vulnerabilityIds = new Set<UUID>()

  for (const owner of owners) {
    if (!requestedKeys.has(identityKey(owner.identity))) continue
    vulnerabilityIds.add(UUIDSchema.parse(owner.vulnerabilityId))
  }

  const matches = [...vulnerabilityIds].sort()
  if (matches.length === 0) return { kind: 'new' }
  if (matches.length === 1) return { kind: 'reuse', vulnerabilityId: matches[0]! }
  return { kind: 'conflict', vulnerabilityIds: matches }
}
