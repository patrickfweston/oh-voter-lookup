import { DISPLAY_KEYS, COLUMN_LABELS } from '../constants'
import type { CountyOption, SearchResponse } from '../types'
import { ResultCard } from './ResultCard'
import { ResultTableRow } from './ResultTableRow'

type SearchResultsProps = {
  data: SearchResponse
  counties: CountyOption[]
  expandedKey: string | null
  onToggleRow: (rowKey: string) => void
}

export function SearchResults({
  data,
  counties,
  expandedKey,
  onToggleRow,
}: SearchResultsProps) {
  return (
    <section className="results" aria-live="polite">
      <p className="meta">
        <strong>{data.rows.length}</strong> row
        {data.rows.length === 1 ? '' : 's'}
        {data.truncated ? (
          <>
            {' '}
            (cap {data.maxResults}; list may be truncated)
          </>
        ) : null}
      </p>

      {data.rows.length === 0 ? (
        <p className="empty">No matching voters.</p>
      ) : (
        <>
          <div className="results-table-wrap table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th scope="col" className="col-expand" aria-hidden />
                  {DISPLAY_KEYS.map((k) => (
                    <th key={k}>{COLUMN_LABELS[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => {
                  const rowKey = `${row.SOS_VOTERID ?? 'row'}-${i}`
                  return (
                    <ResultTableRow
                      key={rowKey}
                      row={row}
                      counties={counties}
                      expanded={expandedKey === rowKey}
                      onToggle={() => onToggleRow(rowKey)}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
          <div
            className="results-cards"
            aria-label="Search results (mobile layout)"
          >
            {data.rows.map((row, i) => {
              const rowKey = `${row.SOS_VOTERID ?? 'row'}-${i}`
              return (
                <ResultCard
                  key={rowKey}
                  row={row}
                  counties={counties}
                  expanded={expandedKey === rowKey}
                  onToggle={() => onToggleRow(rowKey)}
                />
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
