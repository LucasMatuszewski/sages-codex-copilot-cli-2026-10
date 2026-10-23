import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms'
import { IonButton, IonContent } from '@ionic/angular'
import { ActivatedRoute, ParamMap, Router } from '@angular/router'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, map, merge, of, Subject, switchMap } from 'rxjs'
import type { RegisterQueryResult } from '../../../../../shared/register-contracts.js'
import { RegisterDataService } from './register-data.service'
import { RegisterTable } from './register-table'

export interface RegisterLocation {
  q?: string
  view: 'table'
}

export function decodeRegisterLocation(params: ParamMap): RegisterLocation {
  const allowed = new Set(['q', 'view'])
  if (params.keys.some((key) => !allowed.has(key))) throw new Error('Nie można odczytać parametrów adresu.')

  const queries = params.getAll('q')
  const views = params.getAll('view')
  if (queries.length > 1 || views.length > 1) throw new Error('Nie można odczytać parametrów adresu.')
  if (views.length === 1 && views[0] !== 'table') throw new Error('Nie można odczytać parametrów adresu.')

  const q = queries[0]?.trim()
  return q ? { q, view: 'table' } : { view: 'table' }
}

export function encodeRegisterLocation(location: RegisterLocation): Record<string, string> {
  if (location.view !== 'table') throw new Error('Nie można zapisać widoku rejestru.')
  const q = location.q?.trim()
  return q ? { q } : {}
}

type AcceptedResult = { query?: string; result: RegisterQueryResult }
type RouteRequest = { valid: true; location: RegisterLocation; syncDraft: boolean } | { valid: false }
type ReadResponse = { kind: 'success'; result: RegisterQueryResult } | { kind: 'error' }

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [IonContent, IonButton, ReactiveFormsModule, RegisterTable],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly data = inject(RegisterDataService)
  private readonly refreshRequests = new Subject<RouteRequest>()

  readonly searchForm = new FormGroup({ q: new FormControl('', { nonNullable: true }) })
  readonly activeQuery = signal<string | undefined>(undefined)
  readonly accepted = signal<AcceptedResult | null>(null)
  readonly status = signal<'loading' | 'success' | 'error' | 'invalid'>('loading')
  readonly pendingQuery = signal<string | undefined>(undefined)
  readonly showingPrevious = computed(() => {
    const accepted = this.accepted()
    return accepted !== null && accepted.query !== this.activeQuery()
  })

  constructor() {
    merge(
      this.route.queryParamMap.pipe(map((params) => this.routeRequest(params))),
      this.refreshRequests,
    ).pipe(
      switchMap((request) => this.read(request)),
      takeUntilDestroyed(),
    ).subscribe((response) => {
      if (response.kind === 'success') {
        const query = this.activeQuery()
        this.accepted.set({ query, result: response.result })
        this.pendingQuery.set(undefined)
        this.status.set('success')
      } else if (response.kind === 'invalid') {
        this.pendingQuery.set(undefined)
        this.status.set('invalid')
      } else {
        this.pendingQuery.set(undefined)
        this.status.set('error')
      }
    })
  }

  vulnerabilityCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'podatność' : 'podatności'}`
  }

  matchingEventCountLabel(count: number): string {
    const lastTwoDigits = count % 100
    const noun = count === 1
      ? 'dopasowane zdarzenie'
      : count % 10 >= 2 && count % 10 <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)
        ? 'dopasowane zdarzenia'
        : 'dopasowanych zdarzeń'
    return `${count} ${noun}`
  }

  previousScopeLabel(query: string | undefined): string {
    return query === undefined ? 'Poprzednie wyniki z całego rejestru' : `Poprzednie wyniki dla „${query}”`
  }

  submitSearch(event: Event): void {
    event.preventDefault()
    const q = this.searchForm.controls.q.value.trim() || undefined
    const location: RegisterLocation = q ? { q, view: 'table' } : { view: 'table' }

    if (this.status() !== 'invalid' && q === this.activeQuery()) {
      this.refreshRequests.next({ valid: true, location, syncDraft: false })
      return
    }

    void this.navigate(location)
  }

  clearSearch(): void {
    this.searchForm.controls.q.setValue('')
    if (this.status() !== 'invalid' && this.activeQuery() === undefined) return
    void this.navigate({ view: 'table' })
  }

  retry(): void {
    if (this.status() !== 'error') return
    const query = this.activeQuery()
    this.refreshRequests.next({
      valid: true,
      location: query ? { q: query, view: 'table' } : { view: 'table' },
      syncDraft: false,
    })
  }

  private routeRequest(params: ParamMap): RouteRequest {
    try {
      return { valid: true, location: decodeRegisterLocation(params), syncDraft: true }
    } catch {
      return { valid: false }
    }
  }

  private read(request: RouteRequest) {
    if (!request.valid) {
      this.status.set('invalid')
      this.pendingQuery.set(undefined)
      return of({ kind: 'invalid' as const })
    }

    const query = request.location.q
    this.activeQuery.set(query)
    if (request.syncDraft) this.searchForm.controls.q.setValue(query ?? '')
    this.pendingQuery.set(query)
    this.status.set('loading')

    return this.data.load(query ? { q: query } : {}).pipe(
      map((result): ReadResponse => ({ kind: 'success', result })),
      catchError(() => of({ kind: 'error' as const })),
    )
  }

  private navigate(location: RegisterLocation): Promise<boolean> {
    return this.router.navigate(['/register'], { queryParams: encodeRegisterLocation(location) })
  }
}
