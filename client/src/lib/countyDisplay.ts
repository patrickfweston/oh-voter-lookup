import type { CountyOption } from '../types'

function canonicalCountyNum(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const n = parseInt(t, 10)
  if (!Number.isNaN(n)) return String(n)
  return t
}

/** Resolve SOS county number (any padding) to display name using `/api/counties` data. */
export function countyDisplayName(
  countyId: string | undefined,
  counties: CountyOption[],
): string {
  const raw = countyId?.trim() ?? ''
  if (!raw) return ''
  if (counties.length === 0) return raw
  const key = canonicalCountyNum(raw)
  const hit = counties.find((c) => canonicalCountyNum(c.number) === key)
  return hit?.name ?? raw
}
