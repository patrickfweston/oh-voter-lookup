export type VoterRow = Record<string, string>

export type SearchResponse = {
  rows: VoterRow[]
  truncated: boolean
  scannedFiles: string[]
  maxResults: number
}

/** Ohio SOS county number (string "1"–"88") with display name. */
export type CountyOption = {
  number: string
  name: string
}

export type CountiesResponse = {
  counties: CountyOption[]
}
