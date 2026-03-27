import { DISPLAY_KEYS, COLUMN_LABELS } from '../constants'
import type { VoterRow } from '../types'
import { VotingHistory } from './VotingHistory'

type ResultCardProps = {
  row: VoterRow
  expanded: boolean
  onToggle: () => void
}

export function ResultCard({ row, expanded, onToggle }: ResultCardProps) {
  const label = [row.LAST_NAME, row.FIRST_NAME, row.MIDDLE_NAME]
    .filter(Boolean)
    .join(' ')

  return (
    <article className="result-card">
      <button
        type="button"
        className="result-card-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse voting history for ${label || 'voter'}`
            : `Show voting history for ${label || 'voter'}`
        }
      >
        <span className="result-card-chevron" aria-hidden>
          {expanded ? '▼' : '▶'}
        </span>
        <span className="result-card-heading">{label || 'Voter record'}</span>
      </button>

      <dl className="result-card-fields">
        {DISPLAY_KEYS.map((k) => (
          <div key={k} className="result-card-field">
            <dt>{COLUMN_LABELS[k]}</dt>
            <dd>{row[k] ?? ''}</dd>
          </div>
        ))}
      </dl>

      {expanded ? (
        <div className="result-card-history">
          <VotingHistory row={row} />
        </div>
      ) : null}
    </article>
  )
}
