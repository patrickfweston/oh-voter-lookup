import type { VoterRow } from '../types'

export const ELECTION_KEY =
  /^(PRIMARY|GENERAL|SPECIAL)-(\d{2})\/(\d{2})\/(\d{4})/

export type ElectionKind = 'PRIMARY' | 'GENERAL' | 'SPECIAL'

export type ElectionEntry = {
  kind: ElectionKind
  sortKey: number
  dateLabel: string
  value: string
}

export function extractElections(row: VoterRow): ElectionEntry[] {
  const out: ElectionEntry[] = []
  for (const [key, raw] of Object.entries(row)) {
    const m = key.match(ELECTION_KEY)
    if (!m) continue
    const val = (raw ?? '').trim()
    if (!val) continue
    const [, kind, mm, dd, yyyy] = m
    const sortKey = new Date(
      `${yyyy}-${mm}-${dd}T12:00:00`,
    ).getTime()
    out.push({
      kind: kind as ElectionKind,
      sortKey,
      dateLabel: `${mm}/${dd}/${yyyy}`,
      value: val,
    })
  }
  out.sort((a, b) => a.sortKey - b.sortKey)
  return out
}

export function electionSectionTitle(kind: ElectionKind): string {
  if (kind === 'PRIMARY') return 'Primary elections'
  if (kind === 'GENERAL') return 'General elections'
  return 'Special elections'
}
