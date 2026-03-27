import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import './App.css'

type VoterRow = Record<string, string>

type SearchResponse = {
  rows: VoterRow[]
  truncated: boolean
  scannedFiles: string[]
  maxResults: number
}

type CountiesResponse = {
  counties: string[]
}

/** Common Ohio SOS registration party codes (file may use others). */
const PARTY_CODE_HINTS: Record<string, string> = {
  R: 'Republican',
  D: 'Democrat',
  L: 'Libertarian',
  N: 'Natural Law',
  G: 'Green',
}

const DISPLAY_KEYS: (keyof VoterRow)[] = [
  'LAST_NAME',
  'FIRST_NAME',
  'MIDDLE_NAME',
  'SUFFIX',
  'PARTY_AFFILIATION',
  'DATE_OF_BIRTH',
  'REGISTRATION_DATE',
  'VOTER_STATUS',
  'RESIDENTIAL_ADDRESS1',
  'RESIDENTIAL_SECONDARY_ADDR',
  'RESIDENTIAL_CITY',
  'RESIDENTIAL_STATE',
  'RESIDENTIAL_ZIP',
  'PRECINCT_NAME',
  'PRECINCT_CODE',
  'CONGRESSIONAL_DISTRICT',
  'STATE_REPRESENTATIVE_DISTRICT',
  'STATE_SENATE_DISTRICT',
  'SOS_VOTERID',
  'COUNTY_ID',
  'CITY',
  'TOWNSHIP',
  'WARD',
  'CAREER_CENTER',
]

const ELECTION_KEY =
  /^(PRIMARY|GENERAL|SPECIAL)-(\d{2})\/(\d{2})\/(\d{4})/

type ElectionKind = 'PRIMARY' | 'GENERAL' | 'SPECIAL'

type ElectionEntry = {
  kind: ElectionKind
  sortKey: number
  dateLabel: string
  value: string
}

function extractElections(row: VoterRow): ElectionEntry[] {
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

function electionSectionTitle(kind: ElectionKind): string {
  if (kind === 'PRIMARY') return 'Primary elections'
  if (kind === 'GENERAL') return 'General elections'
  return 'Special elections'
}

function VotingHistory({ row }: { row: VoterRow }) {
  const elections = useMemo(() => extractElections(row), [row])
  const partyRaw = (row.PARTY_AFFILIATION ?? '').trim()
  const partyHint = partyRaw ? PARTY_CODE_HINTS[partyRaw] ?? null : null

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
              <span className="vh-party-hint" title="Common SOS label; confirm in your layout doc">
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

function App() {
  const [last, setLast] = useState('')
  const [first, setFirst] = useState('')
  const [middle, setMiddle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [counties, setCounties] = useState<string[]>([])
  const [county, setCounty] = useState('')
  const searchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/counties')
        const body = (await res.json().catch(() => ({}))) as CountiesResponse
        if (!res.ok || !Array.isArray(body.counties)) return
        if (!cancelled) setCounties(body.counties)
      } catch {
        /* counties optional; search still works for all files */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setExpandedKey(null)
  }, [data?.rows])

  useEffect(() => {
    return () => searchAbortRef.current?.abort()
  }, [])

  const labelByKey = useMemo(() => {
    const map: Record<string, string> = {}
    for (const k of DISPLAY_KEYS) {
      map[k] =
        k === 'PARTY_AFFILIATION'
          ? 'Party affiliation'
          : String(k).replaceAll('_', ' ')
    }
    return map
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setData(null)
    if (!last.trim() && !first.trim() && !middle.trim()) {
      setError('Enter at least one name field.')
      return
    }

    searchAbortRef.current?.abort()
    const ac = new AbortController()
    searchAbortRef.current = ac

    const q = new URLSearchParams()
    if (last.trim()) q.set('last', last.trim())
    if (first.trim()) q.set('first', first.trim())
    if (middle.trim()) q.set('middle', middle.trim())
    if (county) q.set('county', county)

    setLoading(true)
    try {
      const res = await fetch(`/api/search?${q}`, {
        signal: ac.signal,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : res.statusText)
        return
      }
      setData(body as SearchResponse)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
      searchAbortRef.current = null
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Look up a voter</h1>
        <p className="lede">
          Enter part or all of someone’s name to search Ohio registration records
          on this computer. Matching isn’t case-sensitive—you can try a last name
          only, or add first or middle name to narrow things down. Choose a county
          to search there only, or leave it on “All counties” to search everywhere.
          Open a result to see address details, party, and voting participation.
        </p>
      </header>

      <form className="search" onSubmit={onSubmit}>
        <div className="fields">
          <label>
            Last name
            <input
              type="text"
              name="last"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
              placeholder="e.g. Hartwell"
            />
          </label>
          <label>
            First name
            <input
              type="text"
              name="first"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
            />
          </label>
          <label>
            Middle name
            <input
              type="text"
              name="middle"
              value={middle}
              onChange={(e) => setMiddle(e.target.value)}
            />
          </label>
          <label>
            County
            <select
              name="county"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              aria-label="Limit search to one county"
            >
              <option value="">All counties</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error ? <p className="banner error">{error}</p> : null}

      {data ? (
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
            <div className="table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-expand" aria-hidden />
                    {DISPLAY_KEYS.map((k) => (
                      <th key={k}>{labelByKey[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => {
                    const rowKey = `${row.SOS_VOTERID ?? 'row'}-${i}`
                    const expanded = expandedKey === rowKey
                    const label = [
                      row.LAST_NAME,
                      row.FIRST_NAME,
                      row.MIDDLE_NAME,
                    ]
                      .filter(Boolean)
                      .join(' ')

                    function toggleRow() {
                      setExpandedKey((k) => (k === rowKey ? null : rowKey))
                    }

                    function onProfileKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleRow()
                      }
                    }

                    return (
                      <Fragment key={rowKey}>
                        <tr
                          className={`row-profile row-profile--interactive${expanded ? ' row-profile--expanded' : ''}`}
                          onClick={toggleRow}
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
                            <span className="row-chevron">
                              {expanded ? '▼' : '▶'}
                            </span>
                          </td>
                          {DISPLAY_KEYS.map((k) => (
                            <td key={k}>{row[k] ?? ''}</td>
                          ))}
                        </tr>
                        {expanded ? (
                          <tr className="row-history">
                            <td
                              colSpan={DISPLAY_KEYS.length + 1}
                              className="history-cell"
                            >
                              <VotingHistory row={row} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

export default App
