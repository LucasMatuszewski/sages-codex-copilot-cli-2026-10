import { describe, expect, it } from 'vitest'
import { GapSchema, type GapResolution } from '../../shared/common.js'
import type { Observation, SharedFacts } from '../../shared/finding-contracts.js'
import { eventGaps, sharedGaps } from './gaps.js'

const completeShared: SharedFacts = {
  title: 'Example',
  description: 'Issue',
  componentName: 'lib-x',
  category: 'dependency',
  severity: 'high',
  severityRationale: 'Local assessment',
}
const completeEvent: Observation = {
  detectedAt: '2026-10-22T10:30:15.000Z',
  product: 'Widget',
  productVersion: '1.0',
  client: 'Client A',
  installedComponentVersion: '2.0',
}
const fields = (gaps: readonly { field: string }[]) => gaps.map(({ field }) => field)
const resolutions = (...items: GapResolution[]) => items


describe('review gaps', () => {
  it('reports the ordered shared minimum for an empty finding and none for a complete one', () => {
    expect(fields(sharedGaps({}))).toEqual(['title', 'description', 'componentName', 'category', 'severity'])
    expect(sharedGaps(completeShared)).toEqual([])
  })

  it('does not allow explanations to waive title or description, and only accepts exact nonblank resolutions', () => {
    const partial = { title: ' ', description: null, componentName: null, category: 'unknown', severity: 'unknown' } satisfies SharedFacts
    const gaps = sharedGaps(partial, resolutions(
      { field: 'title', reason: 'not applicable' },
      { field: 'description', reason: 'unavailable' },
      { field: 'componentName', reason: ' not applicable ' },
      { field: 'category', reason: '  ' },
      { field: 'severity', reason: 'unknown' },
      { field: 'componentName.extra', reason: 'stale reason' },
    ))
    expect(fields(gaps)).toEqual(['title', 'description', 'category'])
    expect(gaps.find((gap) => gap.field === 'componentName')).toBeUndefined()
  })

  it('keeps explained unknowns unknown while resolving only their review gaps', () => {
    const facts: SharedFacts = { ...completeShared, category: 'unknown', severity: 'unknown', severityRationale: 'Assessment unavailable after review' }
    expect(sharedGaps({ ...facts, severityRationale: null })).toContainEqual(expect.objectContaining({ field: 'severity', code: 'UNKNOWN_VALUE' }))
    expect(sharedGaps(facts)).toEqual([
      expect.objectContaining({ field: 'category', code: 'UNKNOWN_VALUE' }),
    ])
    expect(sharedGaps(facts, [{ field: 'category', reason: 'not applicable to this finding' }])).toEqual([])
    expect(facts.category).toBe('unknown')
    expect(facts.severity).toBe('unknown')
  })

  it('requires evidence for known severity, accepting rationale, score source, or a valid reference', () => {
    const facts: SharedFacts = { ...completeShared, severityRationale: null }
    expect(sharedGaps(facts)).toEqual([expect.objectContaining({ field: 'severity', code: 'ASSESSMENT_EVIDENCE_MISSING' })])
    expect(sharedGaps({ ...facts, scoreSource: 'scanner X' })).toEqual([])
    expect(sharedGaps({ ...facts, references: [{ label: 'Advisory', reference: 'https://example.test/advisory' }] })).toEqual([])
    expect(sharedGaps({ ...facts, references: [{ label: ' ', reference: 'bad' }] })).toHaveLength(1)
    expect(sharedGaps(facts, [{ field: 'severity', reason: 'No assessment source is available' }])).toEqual([])
  })

  it('requires both score method and version whenever a finite score is retained, including zero', () => {
    const facts: SharedFacts = { ...completeShared, score: 0, scoreSource: 'scanner X' }
    expect(sharedGaps(facts).map((gap) => [gap.field, gap.code])).toEqual([
      ['scoreSystem', 'SCORE_METADATA_MISSING'],
      ['scoreVersion', 'SCORE_METADATA_MISSING'],
    ])
    expect(fields(sharedGaps({ ...facts, scoreSystem: 'CVSS' }))).toEqual(['scoreVersion'])
    expect(sharedGaps({ ...facts, scoreSystem: 'CVSS', scoreVersion: '4.0' })).toEqual([])
    expect(sharedGaps({ ...completeShared, score: null })).toEqual([])
    expect(sharedGaps({ ...facts, scoreSystem: ' ', scoreVersion: null }, [
      { field: 'scoreSystem', reason: 'unavailable' },
      { field: 'scoreVersion', reason: 'unavailable' },
    ])).toHaveLength(2)
  })

  it('reports required event observations in stable order and accepts a complete component event', () => {
    expect(eventGaps(completeEvent, { category: 'dependency', componentName: 'lib-x' })).toEqual([])
    expect(fields(eventGaps(null, { category: 'application', componentName: null }))).toEqual([
      'detectedAt', 'product', 'productVersion', 'client',
    ])
  })

  it('allows exact event explanations without changing unknown source facts', () => {
    const explained: GapResolution[] = [
      { field: 'detectedAt', reason: 'not provided by source' },
      { field: 'product', reason: 'unavailable' },
      { field: 'productVersion', reason: 'not applicable' },
      { field: 'client', reason: 'withheld' },
      { field: 'installedComponentVersion', reason: 'component version not reported' },
    ]
    expect(eventGaps({}, { category: 'dependency', componentName: 'lib-x' }, explained)).toEqual([])
    expect(fields(eventGaps({}, { category: 'dependency', componentName: 'lib-x' }, [
      { field: 'product', reason: 'unknown' },
      { field: 'productVersion', reason: ' ' },
      { field: 'client.other', reason: 'stale' },
    ]))).toEqual(['detectedAt', 'productVersion', 'client', 'installedComponentVersion'])
  })

  it('requires installed version only when a dependency/component is identified or located', () => {
    expect(eventGaps({ ...completeEvent, installedComponentVersion: null }, { category: 'application', componentName: null })).toEqual([])
    expect(fields(eventGaps({ ...completeEvent, installedComponentVersion: null }, { category: 'dependency', componentName: null }))).toContain('installedComponentVersion')
    expect(fields(eventGaps({ ...completeEvent, installedComponentVersion: null, componentLocation: 'src/auth.ts' }, { category: 'other', componentName: null }))).toContain('installedComponentVersion')
    expect(fields(eventGaps({ ...completeEvent, installedComponentVersion: ' ' }, { category: 'application', componentName: 'named component' }))).toContain('installedComponentVersion')
  })

  it('emits schema-valid Polish-safe gaps, stable ordering, and does not mutate frozen inputs', () => {
    const facts = Object.freeze({ ...completeShared, severity: 'unknown' as const, severityRationale: null, score: 0 })
    const resolutions = Object.freeze([{ field: 'severity', reason: 'unknown' }])
    const first = sharedGaps(facts, resolutions)
    const second = sharedGaps(facts, resolutions)
    expect(first).toEqual(second)
    expect(first.map((gap) => gap.field)).toEqual(['scoreSystem', 'scoreVersion'])
    for (const gap of first) {
      expect(GapSchema.safeParse(gap).success).toBe(true)
      expect(gap.message).toMatch(/[ąćęłńóśźż]/i)
      expect(gap.message).not.toMatch(/[<>]/)
    }
    expect(facts).toMatchObject({ severity: 'unknown', score: 0 })
    expect(resolutions).toEqual([{ field: 'severity', reason: 'unknown' }])
  })
})
