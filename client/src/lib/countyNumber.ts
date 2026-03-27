import type { CountyOption } from '../types'

/** Normalize SOS county number for display (1–88). Empty string if missing or invalid. */
export function formatSosCountyNumber(raw: string | undefined): string {
  const t = raw?.trim() ?? ''
  if (!t) return ''
  const n = parseInt(t, 10)
  if (Number.isNaN(n) || n < 1 || n > 88) return t
  return String(n)
}

function canonicalCountyNum(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  const n = parseInt(t, 10)
  if (!Number.isNaN(n)) return String(n)
  return t
}

/** Map SOS county number (from voter data) to name using `/api/counties`. Falls back to formatted digits if lookup missing. */
export function countyNameFromNumber(
  countyNumberRaw: string | undefined,
  counties: CountyOption[],
): string {
  const raw = countyNumberRaw?.trim() ?? ''
  if (!raw) return ''
  const formatted = formatSosCountyNumber(raw)
  if (counties.length === 0) return formatted || raw
  const key = canonicalCountyNum(raw)
  const hit = counties.find((c) => canonicalCountyNum(c.number) === key)
  return hit?.name ?? (formatted || raw)
}
