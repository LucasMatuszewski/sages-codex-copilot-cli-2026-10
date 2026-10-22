import { describe, expect, it } from 'vitest'
import type { Gap, HandlingStatus } from '../../shared/common.js'
import { decideStatusChange, initialStatus, reconcileStatus, statusAfterNewEvent } from './handling-status.js'

const gap: Gap = { field: 'title', code: 'MISSING_VALUE', message: 'Uzupełnij tytuł podatności.' }
const noGaps: readonly Gap[] = []


describe('handling status transitions', () => {
  it('initializes from the current gap list', () => {
    expect(initialStatus(noGaps)).toBe('review')
    expect(initialStatus([gap])).toBe('missing_data')
  })

  it('forces missing_data while gaps remain and returns cleared records to review', () => {
    const statuses: HandlingStatus[] = ['review', 'missing_data', 'in_progress', 'closed']
    for (const status of statuses) expect(reconcileStatus(status, [gap])).toBe('missing_data')
    expect(reconcileStatus('missing_data', noGaps)).toBe('review')
    expect(reconcileStatus('in_progress', noGaps)).toBe('in_progress')
    expect(reconcileStatus('closed', noGaps)).toBe('closed')
    expect(reconcileStatus('review', noGaps)).toBe('review')
  })

  it('rejects leaving missing_data while gaps remain and allows remaining in that state', () => {
    expect(decideStatusChange({ current: 'missing_data', requested: 'in_progress', gaps: [gap] })).toEqual({ ok: false, reason: 'gaps_remain' })
    expect(decideStatusChange({ current: 'missing_data', requested: 'closed', gaps: [gap], closureNote: 'closed' })).toEqual({ ok: false, reason: 'gaps_remain' })
    expect(decideStatusChange({ current: 'review', requested: 'missing_data', gaps: [gap] })).toEqual({ ok: true, status: 'missing_data' })
  })

  it('returns to review after clearing gaps unless the same command explicitly chooses an allowed status', () => {
    expect(decideStatusChange({ current: 'missing_data', gaps: noGaps })).toEqual({ ok: true, status: 'review' })
    expect(decideStatusChange({ current: 'missing_data', requested: 'in_progress', gaps: noGaps })).toEqual({ ok: true, status: 'in_progress' })
    expect(decideStatusChange({ current: 'missing_data', requested: 'closed', gaps: noGaps, closureNote: '  resolved by mitigation  ' })).toEqual({ ok: true, status: 'closed' })
    expect(decideStatusChange({ current: 'closed', gaps: noGaps })).toEqual({ ok: true, status: 'closed' })
  })

  it('requires a closure note and rejects missing_data when there are no gaps', () => {
    expect(decideStatusChange({ current: 'review', requested: 'closed', gaps: noGaps })).toEqual({ ok: false, reason: 'closure_note_required' })
    expect(decideStatusChange({ current: 'review', requested: 'closed', gaps: noGaps, closureNote: '  ' })).toEqual({ ok: false, reason: 'closure_note_required' })
    expect(decideStatusChange({ current: 'review', requested: 'closed', gaps: noGaps, closureNote: 'disposition recorded' })).toEqual({ ok: true, status: 'closed' })
    expect(decideStatusChange({ current: 'review', requested: 'missing_data', gaps: noGaps })).toEqual({ ok: false, reason: 'no_gaps' })
  })

  it('reopens a closed shared record only for a newly created event, preserving other statuses', () => {
    expect(statusAfterNewEvent('closed', noGaps, 'created')).toBe('review')
    expect(statusAfterNewEvent('closed', [gap], 'created')).toBe('missing_data')
    expect(statusAfterNewEvent('in_progress', noGaps, 'created')).toBe('in_progress')
    expect(statusAfterNewEvent('review', [gap], 'created')).toBe('missing_data')
  })

  it('leaves every status unchanged for an exact event replay', () => {
    const statuses: HandlingStatus[] = ['review', 'missing_data', 'in_progress', 'closed']
    for (const status of statuses) expect(statusAfterNewEvent(status, [gap], 'replayed')).toBe(status)
  })
})
