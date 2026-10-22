import { describe, expect, it } from 'vitest'
import { FindingCreateRequestSchema, FindingCreateResponseSchema } from './finding-contracts.js'

const identity = { scheme: 'cve', value: ' cve-2026-12345 ' }
const scannerRequest = {
  source: ' scanner-a ',
  sourceEventId: ' run-001 ',
  vulnerability: { identities: [identity] },
}
const manualRequest = {
  source: 'manual',
  sourceEventId: '001',
  vulnerability: { id: '10000000-0000-4000-8000-000000000001' },
}

function hasIssueAt(result: ReturnType<typeof FindingCreateRequestSchema.safeParse>, path: string): boolean {
  return !result.success && result.error.issues.some((issue) => issue.path.join('.') === path)
}

describe('finding create contracts', () => {
  it('accepts minimal incomplete scanner and manual requests without manufacturing fields', () => {
    const scanner = FindingCreateRequestSchema.parse(scannerRequest)
    expect(scanner).toEqual({ source: 'scanner-a', sourceEventId: 'run-001', vulnerability: { identities: [{ scheme: 'cve', value: 'CVE-2026-12345' }] } })
    expect(scanner).not.toHaveProperty('observation')
    expect(FindingCreateRequestSchema.parse(manualRequest)).toEqual(manualRequest)
    expect(FindingCreateRequestSchema.parse({ ...manualRequest, observation: null, reportingEvidence: null })).toEqual({ ...manualRequest, observation: null, reportingEvidence: null })
    expect(FindingCreateRequestSchema.parse({ source: 'manual', sourceEventId: 'save-1', vulnerability: { identities: [{ scheme: 'manual', value: 'draft-1' }] } })).toBeTruthy()
    expect(FindingCreateRequestSchema.parse({ source: 'Scanner-A', sourceEventId: 'r', vulnerability: { identities: [{ scheme: 'source:scanner-ref', value: 'Ref-A' }] } }).source).toBe('Scanner-A')
    expect(FindingCreateRequestSchema.parse({ source: 'scanner-a', sourceEventId: 'r', vulnerability: { identities: [{ scheme: 'source:scanner-ref', value: 'Ref-A' }] } }).source).toBe('scanner-a')
  })

  it('preserves omitted, null and blank facts and accepts zero and false', () => {
    const parsed = FindingCreateRequestSchema.parse({ ...manualRequest, vulnerability: { ...manualRequest.vulnerability, title: null, description: '  ', score: 0, generalExploit: '  ' }, observation: { evidence: null, detectedAt: null, exploitabilityNotes: '' }, reportingEvidence: { mitigationExpected: false } })
    expect(parsed.vulnerability).toMatchObject({ title: null, description: '', score: 0, generalExploit: '' })
    expect(parsed.observation).toMatchObject({ evidence: null, detectedAt: null, exploitabilityNotes: '' })
    expect(parsed.reportingEvidence?.mitigationExpected).toBe(false)
    expect(parsed.vulnerability).not.toHaveProperty('severity')
    expect(parsed.observation).not.toHaveProperty('product')
    expect(FindingCreateRequestSchema.parse({ ...manualRequest, vulnerability: { ...manualRequest.vulnerability, score: 3.2 } }).vulnerability.score).toBe(3.2)
  })

  it('normalizes instants across intake paths and rejects invalid forms', () => {
    const parsed = FindingCreateRequestSchema.parse({ ...manualRequest, vulnerability: { ...manualRequest.vulnerability, knowledgeAt: '2026-10-22T12:30:15+02:00', references: [{ label: 'A', reference: 'plain', observedAt: '2026-10-22T12:30:15+02:00' }] }, observation: { detectedAt: '2026-10-22T12:30:15+02:00' }, reportingEvidence: { awareness: { at: '2026-10-22T12:30:15+02:00', accuracy: 'exact', basis: null }, requestedResponseAt: '2026-10-22T12:30:15+02:00', userCommunicatedAt: null } })
    expect(parsed.vulnerability.knowledgeAt).toBe('2026-10-22T10:30:15.000Z')
    expect(parsed.vulnerability.references?.[0]?.observedAt).toBe('2026-10-22T10:30:15.000Z')
    expect(parsed.observation?.detectedAt).toBe('2026-10-22T10:30:15.000Z')
    expect(parsed.reportingEvidence?.awareness?.at).toBe('2026-10-22T10:30:15.000Z')
    expect(parsed.reportingEvidence?.requestedResponseAt).toBe('2026-10-22T10:30:15.000Z')
    for (const value of ['2026-10-22T10:30:15', '2026-02-30T10:30:00Z', '2026-10-22', '2026-10-22T10:30:15+25:00']) {
      expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, observation: { detectedAt: value } }).success).toBe(false)
    }
    expect(hasIssueAt(FindingCreateRequestSchema.safeParse({ ...manualRequest, observation: { detectedAt: '2026-02-30T10:30:00Z' } }), 'observation.detectedAt')).toBe(true)
    const utc = '2026-10-22T10:30:15Z'
    const offset = '2026-10-22T12:30:15+02:00'
    expect(FindingCreateRequestSchema.parse({ ...manualRequest, observation: { detectedAt: utc } }).observation?.detectedAt).toBe(FindingCreateRequestSchema.parse({ ...manualRequest, observation: { detectedAt: offset } }).observation?.detectedAt)
  })

  it('validates enums and rejects coerced values, nonfinite scores and malformed selectors', () => {
    for (const vulnerability of [
      { ...manualRequest.vulnerability, severity: 'urgent' },
      { ...manualRequest.vulnerability, score: '0' },
      { ...manualRequest.vulnerability, score: Number.POSITIVE_INFINITY },
      { ...manualRequest.vulnerability, score: Number.NaN },
      {},
      { id: '10000000-0000-4000-8000-000000000001', identities: [identity] },
      { identities: [] },
      { id: 'bad' },
      { identities: [{ scheme: 'manual', value: ' ' }] },
    ]) expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, vulnerability }).success).toBe(false)
    for (const value of [' ', '', undefined]) {
      const request = { ...scannerRequest, sourceEventId: value }
      expect(FindingCreateRequestSchema.safeParse(request).success).toBe(false)
    }
    expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, source: ' ' }).success).toBe(false)
    expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, source: 's'.repeat(256) }).success).toBe(false)
    expect(hasIssueAt(FindingCreateRequestSchema.safeParse({ ...manualRequest, vulnerability: { id: 'bad' } }), 'vulnerability.id')).toBe(true)
    expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, sourceEventId: ' ' }).success).toBe(false)
  })

  it('rejects unknown keys recursively in request sections and identity fields', () => {
    for (const request of [
      { ...scannerRequest, extra: true },
      { ...manualRequest, vulnerability: { ...manualRequest.vulnerability, extra: true } },
      { ...manualRequest, observation: { scannerAssessment: { extra: true } } },
      { ...manualRequest, observation: { extra: true } },
      { ...manualRequest, reportingEvidence: { extra: true } },
      { ...scannerRequest, vulnerability: { identities: [{ ...identity, extra: true }] } },
      { ...manualRequest, vulnerability: { ...manualRequest.vulnerability, references: [{ label: 'x', reference: 'y', extra: true }] } },
    ]) expect(FindingCreateRequestSchema.safeParse(request).success).toBe(false)
  })

  it('accepts flat incomplete reporting facts and rejects context or server-owned keys', () => {
    expect(FindingCreateRequestSchema.parse({ ...manualRequest, reportingEvidence: { manufacturer: ' Maker ', memberStates: ['PL', 'de', 'PL'], applicability: 'not_assessed', mitigationExpected: false } }).reportingEvidence).toMatchObject({ manufacturer: 'Maker', memberStates: ['PL', 'DE'], mitigationExpected: false })
    for (const reportingEvidence of [{ eventIds: [] }, { contextId: 'x' }, { revision: 1 }]) {
      expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, reportingEvidence }).success).toBe(false)
    }
    expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, vulnerability: { ...manualRequest.vulnerability, status: 'review' } }).success).toBe(false)
    expect(FindingCreateRequestSchema.safeParse({ ...manualRequest, observation: { source: 'forged' } }).success).toBe(false)
  })

  it('validates response completeness, separate states and positive revisions', () => {
    const response = { vulnerabilityId: '10000000-0000-4000-8000-000000000001', eventId: '20000000-0000-4000-8000-000000000002', vulnerabilityOutcome: 'created', eventOutcome: 'created', vulnerabilityStatus: 'missing_data', eventStatus: 'review', vulnerabilityRevision: 1, eventRevision: 2, vulnerabilityGaps: [{ field: 'title', code: 'required', message: 'Brak tytułu' }], eventGaps: [] }
    expect(FindingCreateResponseSchema.parse(response)).toEqual(response)
    expect(FindingCreateResponseSchema.safeParse({ ...response, vulnerabilityRevision: 0 }).success).toBe(false)
    expect(FindingCreateResponseSchema.safeParse({ ...response, eventGaps: undefined }).success).toBe(false)
    expect(FindingCreateResponseSchema.safeParse({ ...response, extra: true }).success).toBe(false)
    expect(FindingCreateResponseSchema.safeParse({ ...response, vulnerabilityGaps: [{ field: 'title', code: 'required', message: 'Brak', extra: true }] }).success).toBe(false)
  })

  it('returns useful nested issue paths for bad intake fields', () => {
    const parsed = FindingCreateRequestSchema.safeParse({ ...manualRequest, observation: { scannerAssessment: { severity: 'urgent' } } })
    expect(hasIssueAt(parsed, 'observation.scannerAssessment.severity')).toBe(true)
  })
})
