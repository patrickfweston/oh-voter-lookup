import { Fragment } from 'react'
import type { KeyboardEvent } from 'react'
import { DISPLAY_KEYS } from '../constants'
import type { VoterRow } from '../types'
import { VotingHistory } from './VotingHistory'

const HISTORY_COLSPAN = DISPLAY_KEYS.length + 1

type ResultTableRowProps = {
  row: VoterRow
  expanded: boolean
  onToggle: () => void
}

export function ResultTableRow({ row, expanded, onToggle }: ResultTableRowProps) {
  const label = [row.LAST_NAME, row.FIRST_NAME, row.MIDDLE_NAME]
    .filter(Boolean)
    .join(' ')

  function onProfileKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <Fragment>
      <tr
        className={`row-profile row-profile--interactive${expanded ? ' row-profile--expanded' : ''}`}
        onClick={onToggle}
        onKeyDown={onProfileKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse voting history for ${label || 'voter'}`
            : `Show voting history for ${label || 'voter'}`
        }
      >
        <td className="col-expand" aria-hidden>
          <span className="row-chevron">{expanded ? '▼' : '▶'}</span>
        </td>
        {DISPLAY_KEYS.map((k) => (
          <td key={k}>{row[k] ?? ''}</td>
        ))}
      </tr>
      {expanded ? (
        <tr className="row-history">
          <td colSpan={HISTORY_COLSPAN} className="history-cell">
            <VotingHistory row={row} />
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}
