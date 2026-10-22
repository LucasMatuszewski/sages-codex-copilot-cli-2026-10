import { ReferenceSchema, type Gap, type GapResolution } from '../../shared/common.js'
import type { Observation, SharedFacts } from '../../shared/finding-contracts.js'

const sharedResolutionFields = new Set(['componentName', 'category', 'severity'])
const eventResolutionFields = new Set(['detectedAt', 'product', 'productVersion', 'client', 'installedComponentVersion'])

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isExplained(field: string, resolutions: readonly GapResolution[], allowedFields: ReadonlySet<string>): boolean {
  return allowedFields.has(field) && resolutions.some((resolution) => resolution.field === field && hasText(resolution.reason))
}

function makeGap(field: string, code: string, message: string): Gap {
  return { field, code, message }
}

export function sharedGaps(facts: SharedFacts, resolutions: readonly GapResolution[] = []): Gap[] {
  const gaps: Gap[] = []

  if (!hasText(facts.title)) gaps.push(makeGap('title', 'MISSING_VALUE', 'Uzupełnij tytuł podatności.'))
  if (!hasText(facts.description)) gaps.push(makeGap('description', 'MISSING_VALUE', 'Uzupełnij opis podatności.'))
  if (!hasText(facts.componentName) && !isExplained('componentName', resolutions, sharedResolutionFields)) {
    gaps.push(makeGap('componentName', 'MISSING_VALUE', 'Podaj nazwę komponentu lub wyjaśnij jej brak.'))
  }

  if ((!facts.category || facts.category === 'unknown') && !isExplained('category', resolutions, sharedResolutionFields)) {
    const isUnknown = facts.category === 'unknown'
    gaps.push(makeGap('category', isUnknown ? 'UNKNOWN_VALUE' : 'MISSING_VALUE', isUnknown
      ? 'Wyjaśnij, dlaczego kategoria podatności pozostaje nieustalona.'
      : 'Wybierz kategorię podatności lub wyjaśnij jej brak.'))
  }

  if (!facts.severity) {
    if (!isExplained('severity', resolutions, sharedResolutionFields)) {
      gaps.push(makeGap('severity', 'MISSING_VALUE', 'Oceń poziom istotności lub wyjaśnij brak oceny.'))
    }
  } else if (facts.severity === 'unknown') {
    if (!hasText(facts.severityRationale) && !isExplained('severity', resolutions, sharedResolutionFields)) {
      gaps.push(makeGap('severity', 'UNKNOWN_VALUE', 'Wyjaśnij nieustalony poziom istotności.'))
    }
  } else {
    const hasReference = Array.isArray(facts.references) && facts.references.some((reference) => ReferenceSchema.safeParse(reference).success)
    if (!hasText(facts.severityRationale) && !hasText(facts.scoreSource) && !hasReference
      && !isExplained('severity', resolutions, sharedResolutionFields)) {
      gaps.push(makeGap('severity', 'ASSESSMENT_EVIDENCE_MISSING', 'Uzasadnij ocenę poziomu istotności lub podaj źródło.'))
    }
  }

  if (typeof facts.score === 'number' && Number.isFinite(facts.score)) {
    if (!hasText(facts.scoreSystem)) gaps.push(makeGap('scoreSystem', 'SCORE_METADATA_MISSING', 'Podaj metodę wyznaczenia wyniku.'))
    if (!hasText(facts.scoreVersion)) gaps.push(makeGap('scoreVersion', 'SCORE_METADATA_MISSING', 'Podaj wersję metody wyznaczenia wyniku.'))
  }

  return gaps
}

export function eventGaps(
  observation: Observation | null | undefined,
  componentContext: Pick<SharedFacts, 'category' | 'componentName'>,
  resolutions: readonly GapResolution[] = [],
): Gap[] {
  const gaps: Gap[] = []
  const event = observation ?? {}

  if (!hasText(event.detectedAt) && !isExplained('detectedAt', resolutions, eventResolutionFields)) {
    gaps.push(makeGap('detectedAt', 'MISSING_VALUE', 'Uzupełnij czas wykrycia lub wyjaśnij jego brak.'))
  }
  if (!hasText(event.product) && !isExplained('product', resolutions, eventResolutionFields)) {
    gaps.push(makeGap('product', 'MISSING_VALUE', 'Podaj produkt objęty obserwacją lub wyjaśnij jego brak.'))
  }
  if (!hasText(event.productVersion) && !isExplained('productVersion', resolutions, eventResolutionFields)) {
    gaps.push(makeGap('productVersion', 'MISSING_VALUE', 'Podaj wersję produktu lub wyjaśnij jej brak.'))
  }
  if (!hasText(event.client) && !isExplained('client', resolutions, eventResolutionFields)) {
    gaps.push(makeGap('client', 'MISSING_VALUE', 'Podaj klienta lub wyjaśnij brak tej informacji.'))
  }

  const componentIsRelevant = componentContext.category === 'dependency'
    || hasText(componentContext.componentName)
    || hasText(event.componentLocation)
  if (componentIsRelevant && !hasText(event.installedComponentVersion)
    && !isExplained('installedComponentVersion', resolutions, eventResolutionFields)) {
    gaps.push(makeGap('installedComponentVersion', 'MISSING_VALUE', 'Podaj zainstalowaną wersję komponentu lub wyjaśnij jej brak.'))
  }

  return gaps
}
