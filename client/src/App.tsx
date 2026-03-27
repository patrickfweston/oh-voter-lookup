import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AppHeader } from './components/AppHeader'
import { SearchForm } from './components/SearchForm'
import { SearchResults } from './components/SearchResults'
import type { CountiesResponse, SearchResponse } from './types'

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
  const [congressional, setCongressional] = useState('')
  const [ohHouse, setOhHouse] = useState('')
  const [ohSenate, setOhSenate] = useState('')
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
        /* counties optional; search still works */
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setData(null)
    if (
      !last.trim() &&
      !first.trim() &&
      !middle.trim() &&
      !congressional.trim() &&
      !ohHouse.trim() &&
      !ohSenate.trim()
    ) {
      setError(
        'Enter at least one name field or one district (Congressional, Ohio House, or Ohio Senate).',
      )
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
    if (congressional.trim()) q.set('congressional', congressional.trim())
    if (ohHouse.trim()) q.set('oh_house', ohHouse.trim())
    if (ohSenate.trim()) q.set('oh_senate', ohSenate.trim())

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

  function toggleRow(rowKey: string) {
    setExpandedKey((k) => (k === rowKey ? null : rowKey))
  }

  return (
    <div className="app">
      <AppHeader />

      <SearchForm
        last={last}
        first={first}
        middle={middle}
        county={county}
        congressional={congressional}
        ohHouse={ohHouse}
        ohSenate={ohSenate}
        counties={counties}
        loading={loading}
        onLastChange={setLast}
        onFirstChange={setFirst}
        onMiddleChange={setMiddle}
        onCountyChange={setCounty}
        onCongressionalChange={setCongressional}
        onOhHouseChange={setOhHouse}
        onOhSenateChange={setOhSenate}
        onSubmit={onSubmit}
      />

      {error ? <p className="banner error">{error}</p> : null}

      {data ? (
        <SearchResults
          data={data}
          expandedKey={expandedKey}
          onToggleRow={toggleRow}
        />
      ) : null}
    </div>
  )
}

export default App
