import type { FormEvent } from 'react'
import type { CountyOption } from '../types'

type SearchFormProps = {
  last: string
  first: string
  middle: string
  county: string
  congressional: string
  ohHouse: string
  ohSenate: string
  counties: CountyOption[]
  loading: boolean
  onLastChange: (value: string) => void
  onFirstChange: (value: string) => void
  onMiddleChange: (value: string) => void
  onCountyChange: (value: string) => void
  onCongressionalChange: (value: string) => void
  onOhHouseChange: (value: string) => void
  onOhSenateChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function SearchForm({
  last,
  first,
  middle,
  county,
  congressional,
  ohHouse,
  ohSenate,
  counties,
  loading,
  onLastChange,
  onFirstChange,
  onMiddleChange,
  onCountyChange,
  onCongressionalChange,
  onOhHouseChange,
  onOhSenateChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <form className="search" onSubmit={onSubmit}>
      <div className="fields">
        <label>
          Last name
          <input
            type="text"
            name="last"
            value={last}
            onChange={(e) => onLastChange(e.target.value)}
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
            onChange={(e) => onFirstChange(e.target.value)}
            autoComplete="given-name"
          />
        </label>
        <label>
          Middle name
          <input
            type="text"
            name="middle"
            value={middle}
            onChange={(e) => onMiddleChange(e.target.value)}
          />
        </label>
        <label>
          County
          <select
            name="county"
            value={county}
            onChange={(e) => onCountyChange(e.target.value)}
            aria-label="Limit search to one county by SOS county number"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c.number} value={c.number}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Congressional district
          <input
            type="text"
            name="congressional"
            value={congressional}
            onChange={(e) => onCongressionalChange(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 4"
            aria-label="Congressional district number"
          />
        </label>
        <label>
          Ohio House district
          <input
            type="text"
            name="ohHouse"
            value={ohHouse}
            onChange={(e) => onOhHouseChange(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 87"
            aria-label="Ohio House (state representative) district"
          />
        </label>
        <label>
          Ohio Senate district
          <input
            type="text"
            name="ohSenate"
            value={ohSenate}
            onChange={(e) => onOhSenateChange(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 26"
            aria-label="Ohio Senate district"
          />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
    </form>
  )
}
