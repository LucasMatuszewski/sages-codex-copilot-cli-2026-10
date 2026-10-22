import { createHash } from 'node:crypto'
import { UUIDSchema, type UUID } from '../../shared/common.js'
import { FindingCreateRequestSchema, type FindingCreateRequestInput } from '../../shared/finding-contracts.js'

function compareLexically(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function canonicalize(value: unknown, path: readonly string[] = []): unknown {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => canonicalize(item, path))
    if (isSetPath(path)) {
      if (path.at(-1) === 'identities') {
        const byKey = new Map<string, { scheme: string; value: string; canonical: unknown }>()
        for (const item of normalized) {
          const identity = item as { scheme: string; value: string }
          byKey.set(JSON.stringify([identity.scheme, identity.value]), { ...identity, canonical: item })
        }
        return [...byKey.values()]
          .sort((left, right) => compareLexically(left.scheme, right.scheme) || compareLexically(left.value, right.value))
          .map(({ canonical }) => canonical)
      }
      return [...new Set(normalized as string[])].sort(compareLexically)
    }
    return normalized
  }

  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(object).sort(compareLexically)) {
      result[key] = canonicalize(object[key], [...path, key])
    }
    return result
  }

  return value
}

function isSetPath(path: readonly string[]): boolean {
  return (path.length === 3 && path[0] === 'request' && path[1] === 'vulnerability' && (path[2] === 'identities' || path[2] === 'tags'))
    || (path.length === 3 && path[0] === 'request' && path[1] === 'reportingEvidence' && path[2] === 'memberStates')
}

export function canonicalFinding(input: FindingCreateRequestInput, resolvedVulnerabilityId: UUID): string {
  const request = FindingCreateRequestSchema.parse(input)
  const vulnerabilityId = UUIDSchema.parse(resolvedVulnerabilityId)
  const canonical = canonicalize({ vulnerabilityId, request })
  return JSON.stringify(canonical)
}

export function fingerprintFinding(input: FindingCreateRequestInput, resolvedVulnerabilityId: UUID): string {
  return createHash('sha256').update(canonicalFinding(input, resolvedVulnerabilityId)).digest('hex')
}
