/** Normalize SOS county number for display (1–88). Empty string if missing or invalid. */
export function formatSosCountyNumber(raw: string | undefined): string {
  const t = raw?.trim() ?? ''
  if (!t) return ''
  const n = parseInt(t, 10)
  if (Number.isNaN(n) || n < 1 || n > 88) return t
  return String(n)
}
