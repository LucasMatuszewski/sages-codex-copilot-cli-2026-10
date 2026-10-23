import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { ApiErrorSchema } from '../../../../../shared/common.js'
import { SharedFactsSchema } from '../../../../../shared/finding-contracts.js'
import { RegisterQueryResultSchema, type RegisterQueryResult } from '../../../../../shared/register-contracts.js'
import { VulnerabilityReadSchema } from '../../../../../shared/review-contracts.js'
import { ApiClientError } from '../../core/errors/api-error'
import { RegisterDataService } from './register-data.service'

const vulnerabilityId1 = '00000000-0000-4000-8000-000000000001'
const vulnerabilityId2 = '00000000-0000-4000-8000-000000000002'
const eventId1 = '00000000-0000-4000-8000-000000000011'
const eventId2 = '00000000-0000-4000-8000-000000000012'
const eventId3 = '00000000-0000-4000-8000-000000000013'
const timestamp = '2026-10-23T09:00:00.000Z'

function vulnerability(id: string, title: string) {
  return VulnerabilityReadSchema.parse({
    ...Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null])),
    title,
    description: `Description for ${title}`,
    componentName: 'Synthetic component',
    category: 'application',
    severity: 'high',
    severityRationale: 'Synthetic assessment evidence.',
    id,
    status: 'review',
    closureNote: null,
    tags: [],
    gapResolutions: [],
    gaps: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  })
}

const populatedResult: RegisterQueryResult = RegisterQueryResultSchema.parse({
  rows: [
    {
      vulnerability: vulnerability(vulnerabilityId2, 'Second server row'),
      identities: [{ scheme: 'manual', value: 'second-parent' }],
      eventCount: 2,
      matchingEventIds: [eventId1, eventId2],
      latestReceiptAt: '2026-10-23T10:00:00.000Z',
      products: ['Second product', 'Shared product'],
      clients: ['Second client'],
    },
    {
      vulnerability: vulnerability(vulnerabilityId1, 'First server row'),
      identities: [{ scheme: 'cve', value: 'CVE-2026-10001' }],
      eventCount: 1,
      matchingEventIds: [eventId3],
      latestReceiptAt: timestamp,
      products: ['First product'],
      clients: ['First client', 'Shared client'],
    },
  ],
  counts: { vulnerabilityCount: 2, matchingEventCount: 3 },
})

describe('RegisterDataService', () => {
  let service: RegisterDataService
  let controller: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(RegisterDataService)
    controller = TestBed.inject(HttpTestingController)
  })

  afterEach(() => controller.verify())

  it('loads a valid empty result with one GET and no query suffix for an empty query', () => {
    const next = vi.fn()
    service.load({ q: '  ', tag: '  ', product: '  ', client: '  ' }).subscribe({ next, error: vi.fn() })

    const request = controller.expectOne('/api/v1/vulnerabilities')
    expect(request.request.method).toBe('GET')
    expect(request.request.urlWithParams).toBe('/api/v1/vulnerabilities')
    request.flush({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
  })

  it('trims q and encodes Unicode, backslash, hash and ampersand as query data', () => {
    const query = { q: '  żółć \\#&  ' }
    const next = vi.fn()
    service.load(query).subscribe({ next, error: vi.fn() })

    const params = new URLSearchParams({ q: 'żółć \\#&' })
    const expectedPath = `/api/v1/vulnerabilities?${params.toString()}`
    const request = controller.expectOne(expectedPath)
    expect(request.request.method).toBe('GET')
    expect(request.request.urlWithParams).toBe(expectedPath)
    request.flush({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
    expect(next).toHaveBeenCalledOnce()
  })

  it('serializes every defined scalar filter and canonical UTC date bounds in schema order', () => {
    const query = {
      tag: ' ops ',
      product: ' Atlas ',
      client: ' Cedar ',
      status: 'review' as const,
      eventStatus: 'missing_data' as const,
      severity: 'high' as const,
      category: 'dependency' as const,
      detectedFrom: '2026-10-22T01:00:00+01:00',
      detectedTo: '2026-10-23T00:00:00Z',
    }
    const next = vi.fn()
    service.load(query).subscribe({ next, error: vi.fn() })

    const params = new URLSearchParams({
      tag: 'ops',
      product: 'Atlas',
      client: 'Cedar',
      status: 'review',
      eventStatus: 'missing_data',
      severity: 'high',
      category: 'dependency',
      detectedFrom: '2026-10-22T00:00:00.000Z',
      detectedTo: '2026-10-23T00:00:00.000Z',
    })
    const expectedPath = `/api/v1/vulnerabilities?${params.toString()}`
    const request = controller.expectOne(expectedPath)
    expect(request.request.method).toBe('GET')
    expect(request.request.urlWithParams).toBe(expectedPath)
    request.flush({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
    expect(next).toHaveBeenCalledOnce()
  })

  it('preserves server row order, parent/event counts, identities, matching IDs and arrays', () => {
    const next = vi.fn()
    service.load({ q: 'no local row should match' }).subscribe({ next, error: vi.fn() })

    const request = controller.expectOne('/api/v1/vulnerabilities?q=no+local+row+should+match')
    request.flush(populatedResult)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(populatedResult)
    const result = next.mock.calls[0]?.[0] as RegisterQueryResult
    expect(result.rows.map(({ vulnerability: row }) => row.id)).toEqual([vulnerabilityId2, vulnerabilityId1])
    expect(result.rows.map(({ identities, eventCount, matchingEventIds, products, clients }) => ({
      identities, eventCount, matchingEventIds, products, clients,
    }))).toEqual(populatedResult.rows.map(({ identities, eventCount, matchingEventIds, products, clients }) => ({
      identities, eventCount, matchingEventIds, products, clients,
    })))
    expect(result.counts).toEqual({ vulnerabilityCount: 2, matchingEventCount: 3 })
  })

  it('reports an invalid successful response as ApiClientError with HTTP 200 and no value', () => {
    const next = vi.fn()
    const failure = vi.fn()
    service.load({}).subscribe({ next, error: failure })

    controller.expectOne('/api/v1/vulnerabilities').flush({ rows: [], counts: { vulnerabilityCount: -1, matchingEventCount: 0 } }, {
      status: 200,
      statusText: 'OK',
    })

    expect(next).not.toHaveBeenCalled()
    expect(failure).toHaveBeenCalledOnce()
    expect(failure.mock.calls[0]?.[0]).toBeInstanceOf(ApiClientError)
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ kind: 'unexpected', status: 200, code: 'UNEXPECTED_ERROR' })
  })

  it('propagates a 503 error envelope and metadata without an automatic retry', () => {
    const failure = vi.fn()
    service.load({}).subscribe({ next: vi.fn(), error: failure })

    const errorBody = ApiErrorSchema.parse({
      code: 'TEMPORARY_FAILURE',
      message: 'Try again later.',
      fieldErrors: [{ path: 'q', code: 'TOO_BROAD', message: 'Narrow the query.' }],
      retryable: true,
    })
    controller.expectOne('/api/v1/vulnerabilities').flush(errorBody, { status: 503, statusText: 'Unavailable' })

    expect(failure).toHaveBeenCalledOnce()
    expect(failure.mock.calls[0]?.[0]).toBeInstanceOf(ApiClientError)
    expect(failure.mock.calls[0]?.[0]).toMatchObject({
      kind: 'api', status: 503, code: 'TEMPORARY_FAILURE', retryable: true,
      fieldErrors: [{ path: 'q', code: 'TOO_BROAD', message: 'Narrow the query.' }],
    })
    controller.expectNone('/api/v1/vulnerabilities')
  })

  it('sends exactly the explicitly requested repeated loads without caching or polling', () => {
    const first = vi.fn()
    const second = vi.fn()
    const query = { status: 'review' as const }
    service.load(query).subscribe({ next: first, error: vi.fn() })
    service.load(query).subscribe({ next: second, error: vi.fn() })

    const requests = controller.match('/api/v1/vulnerabilities?status=review')
    expect(requests).toHaveLength(2)
    requests.forEach((request, index) => {
      expect(request.request.method).toBe('GET')
      request.flush({ rows: [], counts: { vulnerabilityCount: 0, matchingEventCount: 0 } })
      expect(index === 0 ? first : second).toHaveBeenCalledOnce()
    })
    controller.expectNone('/api/v1/vulnerabilities?status=review')
  })
})
