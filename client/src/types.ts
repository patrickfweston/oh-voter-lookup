export type VoterRow = Record<string, string>

export type SearchResponse = {
  rows: VoterRow[]
  truncated: boolean
  scannedFiles: string[]
  maxResults: number
}

export type CountiesResponse = {
  counties: string[]
}
