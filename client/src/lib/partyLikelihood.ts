import type { VoterRow } from '../types'
import { extractElections } from './elections'

/** Ohio SOS-style cell value → Dem (+1), Rep (−1), or unknown. */
function ballotCodeLean(raw: string): -1 | 0 | 1 {
  const u = raw.trim().toUpperCase()
  if (!u) return 0
  if (/^D($|EM|EMOCRAT|EMOCRATIC)/.test(u)) return 1
  if (/^R($|EP|EPUBLICAN)/.test(u)) return -1
  return 0
}

function registrationScore(partyRaw: string): { add: number; note: string | null } {
  const p = partyRaw.trim().toUpperCase()
  if (p === 'D') return { add: 40, note: 'Registered Democrat' }
  if (p === 'R') return { add: -40, note: 'Registered Republican' }
  return { add: 0, note: null }
}

export type PartisanLikert = 1 | 2 | 3 | 4 | 5

/**
 * Visual Likert bar: five slots left → right, Democrat on the left, Republican
 * on the right. Active indices always include the middle (2) and extend toward
 * the corresponding party (see likertBarFill).
 */
export type LikertBarFillVariant =
  | 'd-strong'
  | 'd-lean'
  | 'neutral'
  | 'r-lean'
  | 'r-strong'

export function likertBarFill(likert: PartisanLikert): {
  activeIndices: number[]
  variant: LikertBarFillVariant
} {
  switch (likert) {
    case 5:
      return { activeIndices: [0, 1, 2], variant: 'd-strong' }
    case 4:
      return { activeIndices: [1, 2], variant: 'd-lean' }
    case 3:
      return { activeIndices: [2], variant: 'neutral' }
    case 2:
      return { activeIndices: [2, 3], variant: 'r-lean' }
    case 1:
      return { activeIndices: [2, 3, 4], variant: 'r-strong' }
    default: {
      const _exhaustive: never = likert
      return _exhaustive
    }
  }
}

export const LIKERT_SHORT: Record<PartisanLikert, string> = {
  1: 'Strong R',
  2: 'Lean R',
  3: 'Unclear',
  4: 'Lean D',
  5: 'Strong D',
}

/** Map combined score (roughly −76…+76) to a 1–5 Likert bar. */
export function scoreToLikert(score: number): PartisanLikert {
  if (score <= -44) return 1
  if (score <= -16) return 2
  if (score >= 44) return 5
  if (score >= 16) return 4
  return 3
}

export type PartisanLean = {
  likert: PartisanLikert
  score: number
  summary: string
  detailLines: string[]
}

/**
 * Heuristic Dem vs Republican leaning from registration + primary/special ballot
 * fields (not predictive modeling). GENERAL columns are ignored — SOS cells are
 * usually non-party voting flags.
 */
export function computePartisanLean(row: VoterRow): PartisanLean {
  const detailLines: string[] = []
  const reg = registrationScore(row.PARTY_AFFILIATION ?? '')
  let score = reg.add
  if (reg.note) detailLines.push(reg.note)

  const elections = extractElections(row)
  let primaryDelta = 0
  for (const e of elections) {
    if (e.kind === 'GENERAL') continue
    const lean = ballotCodeLean(e.value)
    if (lean === 0) continue
    primaryDelta += lean * 12
    detailLines.push(
      `${e.kind[0]} ${e.dateLabel}: ballot code ${e.value.trim()} → ${lean > 0 ? 'Dem' : 'Rep'}`,
    )
  }
  primaryDelta = Math.max(-40, Math.min(40, primaryDelta))
  score += primaryDelta

  score = Math.max(-80, Math.min(80, score))

  const likert = scoreToLikert(score)
  const summary = LIKERT_SHORT[likert]

  if (detailLines.length === 0) {
    detailLines.push(
      'No party registration (D/R) and no partisan primary/special ballot codes found.',
    )
  }

  return { likert, score, summary, detailLines }
}
