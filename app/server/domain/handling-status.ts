import type { Gap, HandlingStatus } from '../../shared/common.js'

export type StatusDecision =
  | { ok: true; status: HandlingStatus }
  | { ok: false; reason: 'gaps_remain' | 'closure_note_required' | 'no_gaps' }

export function initialStatus(gaps: readonly Gap[]): HandlingStatus {
  return gaps.length === 0 ? 'review' : 'missing_data'
}

export function reconcileStatus(current: HandlingStatus, gaps: readonly Gap[]): HandlingStatus {
  if (gaps.length > 0) return 'missing_data'
  return current === 'missing_data' ? 'review' : current
}

export function decideStatusChange(input: {
  current: HandlingStatus
  requested?: HandlingStatus
  gaps: readonly Gap[]
  closureNote?: string | null
}): StatusDecision {
  if (input.requested === undefined) {
    return { ok: true, status: reconcileStatus(input.current, input.gaps) }
  }

  if (input.gaps.length > 0) {
    return input.requested === 'missing_data'
      ? { ok: true, status: 'missing_data' }
      : { ok: false, reason: 'gaps_remain' }
  }

  if (input.requested === 'missing_data') return { ok: false, reason: 'no_gaps' }
  if (input.requested === 'closed' && !(typeof input.closureNote === 'string' && input.closureNote.trim().length > 0)) {
    return { ok: false, reason: 'closure_note_required' }
  }

  return { ok: true, status: input.requested }
}

export function statusAfterNewEvent(current: HandlingStatus, sharedGaps: readonly Gap[], eventOutcome: 'created' | 'replayed'): HandlingStatus {
  if (eventOutcome === 'replayed') return current
  if (current === 'closed') return initialStatus(sharedGaps)
  return reconcileStatus(current, sharedGaps)
}
