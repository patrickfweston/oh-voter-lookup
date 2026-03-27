import { useMemo } from 'react'
import { PARTY_CODE_HINTS } from '../constants'
import {
  electionSectionTitle,
  extractElections,
  type ElectionKind,
  type ElectionEntry,
} from '../lib/elections'
import type { VoterRow } from '../types'

type VotingHistoryProps = { row: VoterRow }

export function VotingHistory({ row }: VotingHistoryProps) {
  const elections = useMemo(() => extractElections(row), [row])
  const partyRaw = (row.PARTY_AFFILIATION ?? '').trim()
  const partyHint = partyRaw ? (PARTY_CODE_HINTS[partyRaw] ?? null) : null

  const primaries = elections.filter((e) => e.kind === 'PRIMARY')
  const generals = elections.filter((e) => e.kind === 'GENERAL')
  const specials = elections.filter((e) => e.kind === 'SPECIAL')

  const blocks = (
    [
      { kind: 'PRIMARY' as const, items: primaries },
      { kind: 'GENERAL' as const, items: generals },
      { kind: 'SPECIAL' as const, items: specials },
    ] satisfies { kind: ElectionKind; items: ElectionEntry[] }[]
  ).filter((b) => b.items.length > 0)

  return (
    <div className="vh-wrap">
      <p className="vh-party">
        <strong>Party affiliation</strong>
        {partyRaw ? (
          <>
            :{' '}
            <span className="vh-party-code">{partyRaw}</span>
            {partyHint ? (
              <span
                className="vh-party-hint"
                title="Common SOS label; confirm in your layout doc"
              >
                {' '}
                ({partyHint})
              </span>
            ) : null}
          </>
        ) : (
          <span className="vh-party-none">: None listed in file</span>
        )}
      </p>

      {!elections.length ? (
        <p className="vh-empty">
          No voting participation markers in file for this voter (empty cells are
          omitted).
        </p>
      ) : (
        <div className="voting-history">
          {blocks.map(({ kind, items }) => (
            <section key={kind} className="vh-block">
              <h4 className="vh-heading">{electionSectionTitle(kind)}</h4>
              <ul className="vh-list">
                {items.map((e) => (
                  <li key={`${kind}-${e.dateLabel}`}>
                    <span className="vh-date">{e.dateLabel}</span>
                    <span className="vh-sep">·</span>
                    <span
                      className="vh-mark"
                      title="File code (e.g. voted / party)"
                    >
                      {e.value}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
