import type { VoterRow } from './types'

/** Common Ohio SOS registration party codes (file may use others). */
export const PARTY_CODE_HINTS: Record<string, string> = {
  R: 'Republican',
  D: 'Democrat',
  L: 'Libertarian',
  N: 'Natural Law',
  G: 'Green',
}

export const DISPLAY_KEYS: (keyof VoterRow)[] = [
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
  'COUNTY_NUMBER',
  'COUNTY_ID',
  'CITY',
  'TOWNSHIP',
  'WARD',
  'CAREER_CENTER',
]

/**
 * Mobile card: these fields are only in the title row (banner), so the expanded
 * detail list uses the rest of DISPLAY_KEYS. Date of birth and county number stay
 * in the collapsed preview but also appear again when expanded (full record).
 */
export const MOBILE_CARD_SUMMARY_KEYS: (keyof VoterRow)[] = [
  'LAST_NAME',
  'FIRST_NAME',
  'MIDDLE_NAME',
  'SUFFIX',
]

const _columnLabels: Record<string, string> = {}
for (const k of DISPLAY_KEYS) {
  _columnLabels[k] =
    k === 'PARTY_AFFILIATION'
      ? 'Party affiliation'
      : k === 'COUNTY_NUMBER'
        ? 'County'
        : String(k).replaceAll('_', ' ')
}

/** Human-readable table header labels aligned with DISPLAY_KEYS. */
export const COLUMN_LABELS = _columnLabels
