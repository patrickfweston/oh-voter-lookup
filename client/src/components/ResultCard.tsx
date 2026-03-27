import {
  DISPLAY_KEYS,
  COLUMN_LABELS,
  MOBILE_CARD_SUMMARY_KEYS,
} from '../constants'
import { countyNameFromNumber } from '../lib/countyNumber'
import type { CountyOption, VoterRow } from '../types'
import { VotingHistory } from './VotingHistory'

const summaryKeySet = new Set<string>(MOBILE_CARD_SUMMARY_KEYS)

const expandedFieldKeys = DISPLAY_KEYS.filter((k) => !summaryKeySet.has(k))

type ResultCardProps = {
  row: VoterRow
  counties: CountyOption[]
  expanded: boolean
  onToggle: () => void
}

export function ResultCard({ row, counties, expanded, onToggle }: ResultCardProps) {
  const label = [row.LAST_NAME, row.FIRST_NAME, row.MIDDLE_NAME, row.SUFFIX]
    .filter(Boolean)
    .join(' ')

  const nameForAria = label || 'voter'

  const countyDisplay = countyNameFromNumber(row.COUNTY_NUMBER, counties)

  return (
    <article className="result-card">
      <div className="result-card-banner">
        <h3 className="result-card-name">{label || 'Voter record'}</h3>
        <button
          type="button"
          className="result-card-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? `Collapse full details for ${nameForAria}`
              : `Show full details for ${nameForAria}`
          }
        >
          <span className="result-card-chevron" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
        </button>
      </div>

      {!expanded ? (
        <dl className="result-card-fields result-card-summary">
          <div className="result-card-field">
            <dt>{COLUMN_LABELS.DATE_OF_BIRTH}</dt>
            <dd>{row.DATE_OF_BIRTH ?? ''}</dd>
          </div>
          <div className="result-card-field">
            <dt>{COLUMN_LABELS.COUNTY_NUMBER}</dt>
            <dd>{countyDisplay}</dd>
          </div>
        </dl>
      ) : (
        <>
          <dl className="result-card-fields result-card-detail">
            {expandedFieldKeys.map((k) => (
              <div key={k} className="result-card-field">
                <dt>{COLUMN_LABELS[k]}</dt>
                <dd>
                  {k === 'COUNTY_NUMBER'
                    ? countyDisplay
                    : (row[k] ?? '')}
                </dd>
              </div>
            ))}
          </dl>
          <div className="result-card-history">
            <VotingHistory row={row} />
          </div>
        </>
      )}
    </article>
  )
}
