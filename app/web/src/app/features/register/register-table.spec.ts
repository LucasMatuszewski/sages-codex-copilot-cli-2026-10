import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { SharedFactsSchema } from '../../../../../shared/finding-contracts.js'
import { RegisterRowSchema } from '../../../../../shared/register-contracts.js'
import { VulnerabilityReadSchema } from '../../../../../shared/review-contracts.js'
import { RegisterTable } from './register-table'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const eventIds = [
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000013',
]
const timestamp = '2026-10-23T09:00:00.000Z'

function vulnerability(id: string, overrides: Record<string, unknown> = {}) {
  return VulnerabilityReadSchema.parse({
    ...Object.fromEntries(Object.keys(SharedFactsSchema.shape).map((key) => [key, null])),
    title: `Tytuł ${id}`,
    description: 'Opis syntetycznego rekordu.',
    componentName: 'Moduł płatności',
    category: 'application',
    severity: 'high',
    severityRationale: 'Syntetyczne uzasadnienie oceny.',
    id,
    status: 'review',
    closureNote: null,
    tags: [],
    gapResolutions: [],
    gaps: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
    ...overrides,
  })
}

function row(
  id: string,
  overrides: { vulnerability?: Record<string, unknown>; eventCount?: number; matchingEventIds?: string[]; identities?: unknown[] } = {},
) {
  return RegisterRowSchema.parse({
    vulnerability: vulnerability(id, overrides.vulnerability),
    identities: overrides.identities ?? [{ scheme: 'cve', value: `CVE-2026-${id.slice(-5)}` }],
    eventCount: overrides.eventCount ?? 1,
    matchingEventIds: overrides.matchingEventIds ?? [`00000000-0000-4000-8000-000000000${id.slice(-3)}`],
    latestReceiptAt: timestamp,
    products: ['Atlas'],
    clients: ['Cedar'],
  })
}

describe('RegisterTable', () => {
  async function create(rows = [
    row(secondId, { eventCount: 4, matchingEventIds: [eventIds[0]!, eventIds[1]!], identities: [
      { scheme: 'cve', value: 'CVE-2026-20402' },
      { scheme: 'manual', value: 'wewnętrzny-42' },
    ] }),
    row(firstId, { eventCount: 1, matchingEventIds: [eventIds[2]!] }),
  ]) {
    await TestBed.configureTestingModule({ providers: [provideRouter([])] }).compileComponents()
    const fixture = TestBed.createComponent(RegisterTable)
    fixture.componentRef.setInput('rows', rows)
    fixture.componentRef.setInput('queryActive', true)
    fixture.detectChanges()
    return fixture
  }

  it('renders one semantic data row per supplied vulnerability in server order with all identities and titles', async () => {
    const fixture = await create()
    const host = fixture.nativeElement as HTMLElement
    const rows = [...host.querySelectorAll('tr[data-vulnerability-id]')]

    expect(rows).toHaveLength(2)
    expect(rows.map((element) => element.getAttribute('data-vulnerability-id'))).toEqual([secondId, firstId])
    expect(rows[0]?.textContent).toContain('CVE-2026-20402')
    expect(rows[0]?.textContent).toContain('wewnętrzny-42')
    expect(rows[0]?.textContent).toContain(`Tytuł ${secondId}`)
    expect(rows[0]?.textContent).toContain('Moduł płatności')
    expect(rows[1]?.textContent).toContain(`Tytuł ${firstId}`)
    fixture.destroy()
  })

  it('uses Polish severity and handling labels, while distinguishing explicit unknown from unset values', async () => {
    const fixture = await create([
      row(secondId, { vulnerability: { severity: 'unknown', status: 'review' } }),
      row(firstId, { vulnerability: {
        severity: null,
        status: 'missing_data',
        gaps: [{ field: 'severity', code: 'MISSING', message: 'Uzupełnij ocenę.' }],
      } }),
      row('00000000-0000-4000-8000-000000000003', { vulnerability: { severity: 'high', status: 'in_progress' } }),
      row('00000000-0000-4000-8000-000000000004', { vulnerability: { severity: 'critical', status: 'closed', closureNote: 'Naprawiono.' } }),
    ])
    const host = fixture.nativeElement as HTMLElement

    expect(host.textContent).toContain('Nieznana')
    expect(host.textContent).toContain('Nie podano')
    expect(host.textContent).toContain('Braki danych')
    expect(host.textContent).toContain('W obsłudze')
    expect(host.textContent).toContain('Do weryfikacji')
    expect(host.textContent).toContain('Zamknięte')
    expect(host.textContent).toContain('Wysoka')
    expect(host.textContent).toContain('Krytyczna')
    expect(host.textContent).not.toContain('missing_data')
    expect(host.textContent).not.toContain('in_progress')
    fixture.destroy()
  })

  it('shows total events separately from matching-event markers only while a query is active', async () => {
    const fixture = await create([
      row(secondId, { eventCount: 4, matchingEventIds: [eventIds[0]!, eventIds[1]!] }),
    ])
    const host = fixture.nativeElement as HTMLElement
    const eventCell = host.querySelector('tr[data-vulnerability-id] td.event-count')

    expect(eventCell?.textContent).toContain('Łącznie zdarzeń: 4')
    expect(eventCell?.textContent).toContain('Liczba dopasowanych zdarzeń: 2')

    fixture.componentRef.setInput('queryActive', false)
    fixture.detectChanges()
    expect(eventCell?.textContent).not.toContain('Liczba dopasowanych zdarzeń')
    fixture.destroy()
  })

  it('keeps text that resembles markup inert and provides an accessible scroll region and table headers', async () => {
    const literal = '<img src=x onerror=alert(1)>'
    const fixture = await create([row(firstId, { vulnerability: {
      title: literal,
      componentName: null,
      status: 'missing_data',
      gaps: [{ field: 'componentName', code: 'MISSING', message: 'Dodaj komponent.' }],
    } })])
    const host = fixture.nativeElement as HTMLElement
    const region = host.querySelector('[role="region"][tabindex="0"]')

    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain(literal)
    expect(host.textContent).toContain('Brak komponentu')
    expect(host.querySelector('table caption')?.textContent).toContain('Rejestr podatności')
    expect([...host.querySelectorAll('table thead th[scope="col"]')]).toHaveLength(5)
    expect(region?.getAttribute('aria-label')).toMatch(/tabel/i)
    fixture.destroy()
  })

  it('uses explicit localized fallbacks for nullable title, component and severity', async () => {
    const fixture = await create([row(firstId, { vulnerability: {
      title: null,
      componentName: null,
      severity: null,
      status: 'missing_data',
      gaps: [
        { field: 'title', code: 'MISSING', message: 'Dodaj tytuł.' },
        { field: 'componentName', code: 'MISSING', message: 'Dodaj komponent.' },
        { field: 'severity', code: 'MISSING', message: 'Uzupełnij ocenę.' },
      ],
    } })])
    const text = (fixture.nativeElement as HTMLElement).textContent ?? ''

    expect(text).toContain('Brak tytułu')
    expect(text).toContain('Brak komponentu')
    expect(text).toContain('Nie podano')
    fixture.destroy()
  })

  it('renders read-only identity text by default and a real detail RouterLink only when a prefix is supplied', async () => {
    const fixture = await create([row(firstId)])
    const host = fixture.nativeElement as HTMLElement
    expect(host.querySelector('a')).toBeNull()
    expect(host.querySelector('button')).toBeNull()

    fixture.componentRef.setInput('detailLinkPrefix', '/vulnerabilities')
    fixture.detectChanges()
    const link = host.querySelector('a')
    expect(link?.getAttribute('href')).toBe(`/vulnerabilities/${firstId}`)
    expect(link?.textContent).toContain('CVE-2026-00001')
    fixture.destroy()
  })

  it('keeps distinct source identity pairs when their delimiter-joined text would collide', async () => {
    const warning = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    try {
      const collidingPairs = () => [row(firstId, { identities: [
        { scheme: 'source:a', value: 'b:c' },
        { scheme: 'source:a:b', value: 'c' },
      ] })]
      const fixture = await create(collidingPairs())
      const host = fixture.nativeElement as HTMLElement
      const renderedPairs = () => [...host.querySelectorAll('.identity-pair')].map((pair) => [
        pair.querySelector('.identity-scheme')?.textContent?.trim(),
        pair.querySelector('span:not(.identity-scheme)')?.textContent?.trim(),
      ])

      expect(renderedPairs()).toEqual([['Źródło: a', 'b:c'], ['Źródło: a:b', 'c']])
      fixture.componentRef.setInput('rows', collidingPairs())
      fixture.detectChanges()
      const angularDiagnostics = [...warning.mock.calls, ...error.mock.calls].flat().join('\n')

      expect(renderedPairs()).toEqual([['Źródło: a', 'b:c'], ['Źródło: a:b', 'c']])
      expect(angularDiagnostics).not.toContain('NG0955:')
      fixture.destroy()
    } finally {
      warning.mockRestore()
      error.mockRestore()
    }
  })

  it('updates rendered rows when OnPush inputs change through the component input API', async () => {
    const fixture = await create([row(firstId)])
    expect(fixture.nativeElement.querySelectorAll('tr[data-vulnerability-id]')).toHaveLength(1)

    fixture.componentRef.setInput('rows', [row(secondId)])
    fixture.detectChanges()

    const rows = fixture.nativeElement.querySelectorAll('tr[data-vulnerability-id]')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.getAttribute('data-vulnerability-id')).toBe(secondId)
    fixture.destroy()
  })
})
