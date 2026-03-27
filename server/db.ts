import pg from 'pg';

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
      county_label TEXT NOT NULL,
      last_name TEXT NOT NULL DEFAULT '',
      first_name TEXT NOT NULL DEFAULT '',
      middle_name TEXT NOT NULL DEFAULT '',
      row_json JSONB NOT NULL
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_voters_county ON voters (county_label)
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

export async function listCountiesFromDb(): Promise<string[]> {
  const p = getPool();
  const { rows } = await p.query<{ county_label: string }>(
    `SELECT DISTINCT county_label FROM voters ORDER BY county_label`,
  );
  return rows.map((r) => r.county_label);
}

export type SearchResult = {
  rows: Record<string, string>[];
  truncated: boolean;
  scannedFiles: string[];
  maxResults: number;
};

export async function searchVoters(params: {
  last: string;
  first: string;
  middle: string;
  county: string;
}): Promise<SearchResult> {
  const last = params.last.trim();
  const first = params.first.trim();
  const middle = params.middle.trim();
  const county = params.county.trim();

  if (!last && !first && !middle) {
    throw new Error('Provide at least one of last, first, or middle.');
  }

  const limit = MAX_RESULTS + 1;
  const p = getPool();
  const { rows: dbRows } = await p.query<{ row_json: unknown }>(
    `
    SELECT row_json
    FROM voters
    WHERE
      ($1::text = '' OR strpos(lower(last_name), lower($1::text)) > 0)
      AND ($2::text = '' OR strpos(lower(first_name), lower($2::text)) > 0)
      AND ($3::text = '' OR strpos(lower(middle_name), lower($3::text)) > 0)
      AND ($4::text = '' OR county_label = $4)
    ORDER BY last_name, first_name, sos_voterid
    LIMIT $5
    `,
    [last, first, middle, county, limit],
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
