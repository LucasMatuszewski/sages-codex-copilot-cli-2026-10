import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { Location } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { Router, convertToParamMap, provideRouter, withDisabledInitialNavigation } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { ApiErrorSchema } from '../../../../../shared/common.js'
import { SharedFactsSchema } from '../../../../../shared/finding-contracts.js'
import { RegisterQueryResultSchema, type RegisterQueryResult } from '../../../../../shared/register-contracts.js'
import { VulnerabilityReadSchema } from '../../../../../shared/review-contracts.js'
import { RegisterPage, decodeRegisterLocation, encodeRegisterLocation } from './register-page'

const idA = '00000000-0000-4000-8000-000000000001'
const idB = '00000000-0000-4000-8000-000000000002'
const at = '2026-10-23T09:00:00.000Z'

function result(ids: string[] = [idA], counts = { vulnerabilityCount: ids.length, matchingEventCount: ids.length * 2 }): RegisterQueryResult {
  return RegisterQueryResultSchema.parse({
    rows: ids.map((id) => ({
      vulnerability: VulnerabilityReadSchema.parse({
        ...Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null])),
        title: `Podatność ${id}`,
        description: 'Syntetyczny opis rekordu.',
        componentName: `Komponent ${id}`,
        category: 'application',
        severity: 'high',
        severityRationale: 'Syntetyczne uzasadnienie.',
        id,
        status: 'review',
        closureNote: null,
        tags: [],
        gapResolutions: [],
        gaps: [],
        createdAt: at,
        updatedAt: at,
        revision: 1,
      }),
      identities: [{ scheme: id === idA ? 'cve' : 'manual', value: id === idA ? 'CVE-2026-10001' : `wewnętrzny-${id.slice(-1)}` }],
      eventCount: id === idA ? 3 : 2,
      matchingEventIds: [0, 1].map((matchingIndex) => {
        const tail = (BigInt(id.slice(-12)) * 10n + BigInt(matchingIndex + 1)).toString().padStart(12, '0')
        return `00000000-0000-4000-8000-${tail}`
      }),
      latestReceiptAt: at,
      products: ['Atlas'],
      clients: ['Cedar'],
    })),
    counts,
  })
}

describe('RegisterPage', () => {
  let controller: HttpTestingController
  let harness: RouterTestingHarness

  async function open(url = '/register') {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'register', component: RegisterPage }], withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents()
    controller = TestBed.inject(HttpTestingController)
    harness = await RouterTestingHarness.create()
    await harness.navigateByUrl(url, RegisterPage)
    return harness.routeNativeElement as HTMLElement
  }

  async function waitForUrl(url: string) {
    await expect.poll(() => TestBed.inject(Router).url, { timeout: 1000 }).toBe(url)
  }

  function searchInput(host: HTMLElement): HTMLInputElement {
    const input = host.querySelector<HTMLInputElement>('input[name="q"]')
    expect(input).not.toBeNull()
    return input!
  }

  function submitSearch(host: HTMLElement) {
    const form = host.querySelector<HTMLFormElement>('form')
    expect(form).not.toBeNull()
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }

  async function ionicAction(host: HTMLElement, accessibleName: string): Promise<HTMLElement> {
    const findControl = () => {
      for (const element of host.querySelectorAll<HTMLElement>('ion-button')) {
        const nativeButton = element.shadowRoot?.querySelector<HTMLButtonElement>('button.button-native')
        if (nativeButton?.getAttribute('aria-label') === accessibleName || element.getAttribute('aria-label') === accessibleName) {
          return nativeButton ?? element
        }
      }
      return null
    }
    await expect.poll(findControl, { timeout: 2000 }).not.toBeNull()
    return findControl()!
  }

  function clearButton(host: HTMLElement): Promise<HTMLElement> {
    return ionicAction(host, 'Wyczyść wyszukiwanie')
  }

  function retryButton(host: HTMLElement): Promise<HTMLElement> {
    return ionicAction(host, 'Ponów wczytywanie')
  }

  afterEach(() => controller?.verify())

  it('normalizes q, defaults and omits table view, and round-trips Unicode and URL punctuation', () => {
    const params = convertToParamMap({ q: '  żółć #&/\u2603  ' })
    const decoded = decodeRegisterLocation(params)
    expect(decoded).toEqual({ q: 'żółć #&/☃', view: 'table' })
    expect(decodeRegisterLocation(convertToParamMap({ q: '  ' }))).toEqual({ view: 'table' })
    expect(decodeRegisterLocation(convertToParamMap({ view: 'table' }))).toEqual({ view: 'table' })
    expect(encodeRegisterLocation(decoded)).toEqual({ q: 'żółć #&/☃' })
    expect(encodeRegisterLocation({ view: 'table' })).toEqual({})
    expect(decodeRegisterLocation(convertToParamMap(encodeRegisterLocation(decoded)))).toEqual(decoded)
  })

  it.each([
    ['repeated q', '/register?q=pierwsze&q=drugie'],
    ['repeated view', '/register?view=table&view=table'],
    ['empty view', '/register?view='],
    ['unsupported view', '/register?view=kanban'],
    ['unknown URL field', '/register?debug=yes'],
  ])('rejects %s in a safe local state and sends no request', async (_name, url) => {
    const host = await open(url)
    expect(host.textContent).toContain('Nie można odczytać parametrów adresu')
    await clearButton(host)
    controller.expectNone('/api/v1/vulnerabilities')
    ;(await clearButton(host)).click()
    await waitForUrl('/register')
    controller.expectOne('/api/v1/vulnerabilities').flush(result())
  })

  it('loads exactly the URL query, announces loading and renders server order and exact scoped counts', async () => {
    const host = await open('/register?q=Atlas%20%26%20%23tag')
    expect(host.querySelector('h1')?.textContent).toBe('Rejestr podatności CRA')
    expect(host.textContent).toContain('Ładowanie rejestru')
    expect(host.querySelector('[aria-live="polite"]')).not.toBeNull()
    const request = controller.expectOne('/api/v1/vulnerabilities?q=Atlas+%26+%23tag')
    request.flush(result([idB, idA], { vulnerabilityCount: 2, matchingEventCount: 4 }))
    harness.detectChanges()
    const rows = [...host.querySelectorAll('tr[data-vulnerability-id]')]
    expect(rows.map((row) => row.getAttribute('data-vulnerability-id'))).toEqual([idB, idA])
    expect(host.textContent).toContain('2 podatności')
    expect(host.textContent).toContain('4 dopasowane zdarzenia')
    expect(rows[0]?.textContent).toContain('Łącznie zdarzeń: 2')
    expect(rows[1]?.textContent).toContain('Łącznie zdarzeń: 3')
    expect(rows[0]?.textContent).toContain('Liczba dopasowanych zdarzeń: 2')
    expect(host.querySelectorAll('h1')).toHaveLength(1)
    expect(host.querySelectorAll('main,[role="main"]')).toHaveLength(0)
    expect(host.querySelector('ion-content[role="presentation"]')).not.toBeNull()
    expect(host.querySelector('a,button[data-add-finding],button[data-board-toggle]')).toBeNull()
  })

  it('submits only on Enter/form submit, updates URL, and sends one request for changed or same q', async () => {
    const host = await open()
    const input = searchInput(host)
    input.value = '  CVE-2026-20001  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    harness.detectChanges()
    controller.expectOne('/api/v1/vulnerabilities').flush(result())
    expect(controller.match('/api/v1/vulnerabilities').length).toBe(0)
    submitSearch(host)
    await waitForUrl('/register?q=CVE-2026-20001')
    expect(TestBed.inject(Router).url).toBe('/register?q=CVE-2026-20001')
    controller.expectOne('/api/v1/vulnerabilities?q=CVE-2026-20001').flush(result())
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    controller.expectOne('/api/v1/vulnerabilities?q=CVE-2026-20001').flush(result())
    controller.expectNone('/api/v1/vulnerabilities?q=CVE-2026-20001')
  })

  it('distinguishes empty register from filtered empty and clearing restores the valid full URL', async () => {
    const host = await open()
    controller.expectOne('/api/v1/vulnerabilities').flush(result([], { vulnerabilityCount: 0, matchingEventCount: 0 }))
    harness.detectChanges()
    expect(host.textContent).toContain('Rejestr jest pusty')
    const input = searchInput(host)
    input.value = 'brak-wyników'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    submitSearch(host)
    await waitForUrl('/register?q=brak-wynik%C3%B3w')
    controller.expectOne('/api/v1/vulnerabilities?q=brak-wynik%C3%B3w').flush(result([], { vulnerabilityCount: 0, matchingEventCount: 0 }))
    harness.detectChanges()
    expect(host.textContent).toContain('Brak wyników dla „brak-wyników”')
    ;(await clearButton(host)).click()
    await waitForUrl('/register')
    expect(TestBed.inject(Router).url).toBe('/register')
    controller.expectOne('/api/v1/vulnerabilities').flush(result())
  })

  it('keeps the failed query and draft for an explicit retry without automatic retry', async () => {
    const host = await open('/register?q=Atlas')
    const request = controller.expectOne('/api/v1/vulnerabilities?q=Atlas')
    request.flush(ApiErrorSchema.parse({ code: 'TEMPORARY_FAILURE', message: 'Spróbuj później.', fieldErrors: [], retryable: true }), { status: 503, statusText: 'Unavailable' })
    harness.detectChanges()
    expect(host.textContent).toContain('Nie udało się wczytać rejestru')
    expect(searchInput(host).value).toBe('Atlas')
    await retryButton(host)
    controller.expectNone('/api/v1/vulnerabilities?q=Atlas')
    ;(await retryButton(host)).click()
    const retry = controller.expectOne('/api/v1/vulnerabilities?q=Atlas')
    retry.flush(result())
    harness.detectChanges()
    expect(host.querySelectorAll('tr[data-vulnerability-id]')).toHaveLength(1)
  })

  it('keeps the accepted result labelled with its old scope while a new query is pending, then replaces atomically', async () => {
    const host = await open('/register?q=pierwsze')
    controller.expectOne('/api/v1/vulnerabilities?q=pierwsze').flush(result([idA], { vulnerabilityCount: 1, matchingEventCount: 2 }))
    harness.detectChanges()
    const input = searchInput(host)
    input.value = 'drugie'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    submitSearch(host)
    await waitForUrl('/register?q=drugie')
    const pending = controller.expectOne('/api/v1/vulnerabilities?q=drugie')
    harness.detectChanges()
    expect(host.textContent).toContain('Poprzednie wyniki dla „pierwsze”')
    expect(host.textContent).toContain('Ładowanie rejestru dla „drugie”')
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idA)
    pending.flush(result([idB], { vulnerabilityCount: 1, matchingEventCount: 2 }))
    harness.detectChanges()
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idB)
    expect(host.textContent).not.toContain('Poprzednie wyniki')
  })

  it('retains the accepted rows and their scope when the next query fails', async () => {
    const host = await open('/register?q=pierwsze')
    controller.expectOne('/api/v1/vulnerabilities?q=pierwsze').flush(result([idA], { vulnerabilityCount: 1, matchingEventCount: 2 }))
    harness.detectChanges()
    const input = searchInput(host)
    input.value = 'drugie'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    submitSearch(host)
    await waitForUrl('/register?q=drugie')
    controller.expectOne('/api/v1/vulnerabilities?q=drugie').flush(
      ApiErrorSchema.parse({ code: 'TEMPORARY_FAILURE', message: 'Spróbuj później.', fieldErrors: [], retryable: true }),
      { status: 503, statusText: 'Unavailable' },
    )
    harness.detectChanges()
    expect(host.textContent).toContain('Poprzednie wyniki dla „pierwsze”')
    expect(host.textContent).toContain('Nie udało się wczytać rejestru')
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idA)
    expect(searchInput(host).value).toBe('drugie')
    controller.expectNone('/api/v1/vulnerabilities?q=drugie')
  })

  it('labels a retained unfiltered result as the whole register while a filtered query loads or fails', async () => {
    const host = await open('/register')
    controller.expectOne('/api/v1/vulnerabilities').flush(result([idA], { vulnerabilityCount: 1, matchingEventCount: 2 }))
    harness.detectChanges()
    const input = searchInput(host)
    input.value = 'CVE-2026'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    submitSearch(host)
    await waitForUrl('/register?q=CVE-2026')
    const request = controller.expectOne('/api/v1/vulnerabilities?q=CVE-2026')
    harness.detectChanges()
    expect(host.textContent).toContain('Poprzednie wyniki z całego rejestru')
    expect(host.textContent).not.toContain('Poprzednie wyniki dla „”.')
    request.flush(
      ApiErrorSchema.parse({ code: 'TEMPORARY_FAILURE', message: 'Spróbuj później.', fieldErrors: [], retryable: true }),
      { status: 503, statusText: 'Unavailable' },
    )
    harness.detectChanges()
    expect(host.textContent).toContain('Poprzednie wyniki z całego rejestru')
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idA)
  })

  it('cancels an obsolete query when URL state changes and cannot render a late response', async () => {
    const host = await open('/register?q=stare')
    const obsolete = controller.expectOne('/api/v1/vulnerabilities?q=stare')
    await TestBed.inject(Router).navigateByUrl('/register?q=nowsze')
    expect(obsolete.cancelled).toBe(true)
    const current = controller.expectOne('/api/v1/vulnerabilities?q=nowsze')
    current.flush(result([idB]))
    harness.detectChanges()
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idB)
    expect(searchInput(host).value).toBe('nowsze')
  })

  it('restores committed query, input and rows after browser back navigation', async () => {
    const host = await open('/register?q=pierwsze')
    controller.expectOne('/api/v1/vulnerabilities?q=pierwsze').flush(result([idA]))
    harness.detectChanges()
    await TestBed.inject(Router).navigateByUrl('/register?q=drugie')
    controller.expectOne('/api/v1/vulnerabilities?q=drugie').flush(result([idB]))
    harness.detectChanges()
    TestBed.inject(Location).back()
    await waitForUrl('/register?q=pierwsze')
    controller.expectOne('/api/v1/vulnerabilities?q=pierwsze').flush(result([idA]))
    harness.detectChanges()
    expect(searchInput(host).value).toBe('pierwsze')
    expect(host.querySelector('tr[data-vulnerability-id]')?.getAttribute('data-vulnerability-id')).toBe(idA)
  })

  it('has visible labelled search help and a keyboard-submittable semantic form', async () => {
    const host = await open()
    expect(host.querySelector('label[for="register-search"]')?.textContent).toContain('Szukaj')
    expect(host.textContent).toContain('identyfikatorze, tytule, komponencie, produkcie, kliencie lub tagu')
    expect(host.querySelector('form button[type="submit"], form ion-button[type="submit"]')?.textContent).toContain('Szukaj')
    expect(host.querySelectorAll('h1')).toHaveLength(1)
    controller.expectOne('/api/v1/vulnerabilities').flush(result())
  })
})
