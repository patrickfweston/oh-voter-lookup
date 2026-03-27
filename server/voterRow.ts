import path from 'node:path';

export function stemFromFile(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/** FRANKLIN -> Franklin; FRANKLIN_COUNTY -> Franklin county */
export function fileStemToSentenceCase(stem: string): string {
  const parts = stem.split(/[_\s-]+/).filter(Boolean);
  if (parts.length === 0) return '';
  const normalized = parts.map((p) => p.toLowerCase());
  const head =
    normalized[0].charAt(0).toUpperCase() + normalized[0].slice(1);
  const tail = normalized.slice(1).join(' ');
  return tail ? `${head} ${tail}` : head;
}

export const PROFILE_KEYS = [
  'SOS_VOTERID',
  'COUNTY_NUMBER',
  'COUNTY_ID',
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
  'RESIDENTIAL_ZIP_PLUS4',
  'PRECINCT_NAME',
  'PRECINCT_CODE',
  'CONGRESSIONAL_DISTRICT',
  'STATE_REPRESENTATIVE_DISTRICT',
  'STATE_SENATE_DISTRICT',
  'CITY',
  'TOWNSHIP',
  'WARD',
  'CAREER_CENTER',
] as const;

export function isElectionColumn(key: string): boolean {
  return (
    key.startsWith('PRIMARY-') ||
    key.startsWith('GENERAL-') ||
    key.startsWith('SPECIAL-')
  );
}

/** Profile fields plus PRIMARY-/GENERAL-/SPECIAL- columns from the SOS layout. */
export function pickRow(row: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of PROFILE_KEYS) {
    if (k in row) o[k] = row[k] ?? '';
  }
  for (const [k, v] of Object.entries(row)) {
    if (isElectionColumn(k)) o[k] = v ?? '';
  }
  return o;
}

export function isDataRow(row: Record<string, string>): boolean {
  return (row.LAST_NAME ?? '') !== 'LAST_NAME';
}

export function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function matchesName(
  row: Record<string, string>,
  last: string,
  first: string,
  middle: string,
): boolean {
  if (last && !norm(row.LAST_NAME ?? '').includes(norm(last))) return false;
  if (first && !norm(row.FIRST_NAME ?? '').includes(norm(first))) return false;
  if (middle && !norm(row.MIDDLE_NAME ?? '').includes(norm(middle)))
    return false;
  return true;
}
