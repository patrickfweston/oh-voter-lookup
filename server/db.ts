import pg from 'pg';
import {
  type CountyOption,
  OHIO_COUNTY_NAME_BY_NUMBER,
} from './ohCounties';

const MAX_RESULTS = 500;

function rowJsonToRecord(json: unknown): Record<string, string> {
  if (!json || typeof json !== 'object') return {};
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    o[k] = v == null ? '' : String(v);
  }
  return o;
}

let pool: pg.Pool | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (e.g. postgresql://user:pass@localhost:5432/voter_guide).',
    );
  }
  return url;
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: getDatabaseUrl(), max: 10 });
  }
  return pool;
}

/** Run on server start and before import (idempotent). */
export async function ensureSchema(client: pg.PoolClient): Promise<void> {
  await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  await client.query(`
    CREATE TABLE IF NOT EXISTS voters (
      sos_voterid TEXT PRIMARY KEY,
      county_label TEXT NOT NULL DEFAULT '',
      county_number TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      first_name TEXT NOT NULL DEFAULT '',
      middle_name TEXT NOT NULL DEFAULT '',
      row_json JSONB NOT NULL
    )
  `);
  await client.query(`
    ALTER TABLE voters ADD COLUMN IF NOT EXISTS county_number TEXT NOT NULL DEFAULT '';
  `);
  await client.query(`
    UPDATE voters SET county_number = trim(coalesce(row_json->>'COUNTY_NUMBER',''))
    WHERE trim(coalesce(county_number,'')) = ''
      AND (row_json->>'COUNTY_NUMBER') IS NOT NULL
      AND trim(row_json->>'COUNTY_NUMBER') <> '';
  `);
  await client.query(`DROP INDEX IF EXISTS idx_voters_county`);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_voters_county_number ON voters (county_number)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_voters_last_trgm
    ON voters USING gin (lower(last_name) gin_trgm_ops)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_voters_first_trgm
    ON voters USING gin (lower(first_name) gin_trgm_ops)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_voters_middle_trgm
    ON voters USING gin (lower(middle_name) gin_trgm_ops)
  `);
}

export async function listCountyOptionsFromDb(): Promise<CountyOption[]> {
  const p = getPool();
  const { rows } = await p.query<{ n: string }>(
    `
    SELECT DISTINCT trim(county_number) AS n
    FROM voters
    WHERE trim(county_number) <> ''
    ORDER BY trim(county_number)::int
    `,
  );
  return rows.map((r) => {
    const num = String(parseInt(r.n, 10));
    return {
      number: num,
      name: OHIO_COUNTY_NAME_BY_NUMBER[num] ?? `County ${num}`,
    };
  });
}

export type SearchResult = {
  rows: Record<string, string>[];
  truncated: boolean;
  scannedFiles: string[];
  maxResults: number;
};

/** Match stored SOS district strings; numeric values compare equal with or without leading zeros (e.g. 5 vs 05). */
function jsonDistrictClause(jsonKey: string, paramIndex: number): string {
  const j = `coalesce(row_json->>'${jsonKey}','')`;
  return `($${paramIndex}::text = '' OR (
      trim(${j}) = trim($${paramIndex}::text)
      OR (
        trim(${j}) ~ '^[0-9]+$'
        AND trim($${paramIndex}::text) ~ '^[0-9]+$'
        AND trim(${j})::int = trim($${paramIndex}::text)::int
      )
    ))`;
}

/** Filter on normalized SOS county number (column), same numeric rules as districts. */
function countyNumberClause(paramIndex: number): string {
  const c = `trim(coalesce(county_number,''))`;
  return `($${paramIndex}::text = '' OR (
      ${c} = trim($${paramIndex}::text)
      OR (
        ${c} ~ '^[0-9]+$'
        AND trim($${paramIndex}::text) ~ '^[0-9]+$'
        AND ${c}::int = trim($${paramIndex}::text)::int
      )
    ))`;
}

export async function searchVoters(params: {
  last: string;
  first: string;
  middle: string;
  county: string;
  congressional: string;
  ohHouse: string;
  ohSenate: string;
}): Promise<SearchResult> {
  const last = params.last.trim();
  const first = params.first.trim();
  const middle = params.middle.trim();
  const county = params.county.trim();
  const congressional = params.congressional.trim();
  const ohHouse = params.ohHouse.trim();
  const ohSenate = params.ohSenate.trim();

  if (!last && !first && !middle && !congressional && !ohHouse && !ohSenate) {
    throw new Error(
      'Provide at least one name field or one district filter (Congressional, Ohio House, or Ohio Senate).',
    );
  }

  const limit = MAX_RESULTS + 1;
  const p = getPool();
  const countyClause = countyNumberClause(4);
  const districtCongress = jsonDistrictClause('CONGRESSIONAL_DISTRICT', 5);
  const districtHouse = jsonDistrictClause(
    'STATE_REPRESENTATIVE_DISTRICT',
    6,
  );
  const districtSenate = jsonDistrictClause('STATE_SENATE_DISTRICT', 7);
  const { rows: dbRows } = await p.query<{ row_json: unknown }>(
    `
    SELECT row_json
    FROM voters
    WHERE
      ($1::text = '' OR strpos(lower(last_name), lower($1::text)) > 0)
      AND ($2::text = '' OR strpos(lower(first_name), lower($2::text)) > 0)
      AND ($3::text = '' OR strpos(lower(middle_name), lower($3::text)) > 0)
      AND ${countyClause}
      AND ${districtCongress}
      AND ${districtHouse}
      AND ${districtSenate}
    ORDER BY last_name, first_name, sos_voterid
    LIMIT $8
    `,
    [
      last,
      first,
      middle,
      county,
      congressional,
      ohHouse,
      ohSenate,
      limit,
    ],
  );

  const truncated = dbRows.length > MAX_RESULTS;
  const sliced = truncated ? dbRows.slice(0, MAX_RESULTS) : dbRows;
  const rows = sliced.map((r) => rowJsonToRecord(r.row_json));

  return {
    rows,
    truncated,
    scannedFiles: [],
    maxResults: MAX_RESULTS,
  };
}

export async function voterCount(): Promise<number> {
  const p = getPool();
  const { rows } = await p.query<{ n: string }>(
    'SELECT count(*)::text AS n FROM voters',
  );
  return Number(rows[0]?.n ?? 0);
}
