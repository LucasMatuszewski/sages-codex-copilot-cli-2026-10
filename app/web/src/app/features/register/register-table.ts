import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CdkTableModule } from '@angular/cdk/table'
import type { HandlingStatus, Severity } from '../../../../../shared/common.js'
import type { RegisterRow } from '../../../../../shared/register-contracts.js'

const handlingStatusLabels: Record<HandlingStatus, string> = {
  review: 'Do weryfikacji',
  missing_data: 'Braki danych',
  in_progress: 'W obsłudze',
  closed: 'Zamknięte',
}

const severityLabels: Record<Severity, string> = {
  critical: 'Krytyczna',
  high: 'Wysoka',
  medium: 'Średnia',
  low: 'Niska',
  unknown: 'Nieznana',
}

@Component({
  selector: 'app-register-table',
  standalone: true,
  imports: [CdkTableModule, RouterLink],
  templateUrl: './register-table.html',
  styleUrl: './register-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterTable {
  readonly rows = input<readonly RegisterRow[]>([])
  readonly queryActive = input(false)
  readonly detailLinkPrefix = input<string | null>(null)
  readonly displayedColumns = ['record', 'component', 'severity', 'status', 'events']

  trackByVulnerabilityId(_index: number, row: RegisterRow): string {
    return row.vulnerability.id
  }

  title(row: RegisterRow): string {
    return row.vulnerability.title?.trim() || 'Brak tytułu'
  }

  componentName(row: RegisterRow): string {
    return row.vulnerability.componentName?.trim() || 'Brak komponentu'
  }

  severity(value: Severity | null | undefined): string {
    return value === null || value === undefined ? 'Nie podano' : severityLabels[value]
  }

  handlingStatus(value: HandlingStatus): string {
    return handlingStatusLabels[value]
  }

  identityScheme(value: string): string {
    if (value === 'cve') return 'CVE'
    if (value === 'euvd') return 'EUVD'
    if (value === 'manual') return 'Identyfikator wewnętrzny'
    if (value.startsWith('source:')) return `Źródło: ${value.slice('source:'.length)}`
    return 'Inny identyfikator'
  }

  identityTrackKey(identity: RegisterRow['identities'][number]): string {
    return JSON.stringify([identity.scheme, identity.value])
  }
}
