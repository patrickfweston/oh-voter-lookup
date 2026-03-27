/**
 * Full reload of voter rows from Ohio SOS-style TXT (quoted CSV) files into PostgreSQL.
 *
 * - Truncates the voters table, then loads every file matching VOTER_DATA_GLOB (default data/*.txt).
 * - SOS_VOTERID is the primary key; county comes from each row's COUNTY_NUMBER (works for one statewide file or per-county files).
 *
 * Prerequisites: DATABASE_URL in environment or repo .env; PostgreSQL with pg_trgm (created by ensureSchema).
 *
 * Usage: npm run db:import
 */

import { createReadStream } from 'node:fs';
import path from 'path';
import { parse } from 'csv-parse';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import pg from 'pg';
import { pickRow, isDataRow } from '../server/voterRow';
import { ensureSchema, getDatabaseUrl } from '../server/db';

/** Run from the repo root (e.g. `npm run db:import`). */
const REPO_ROOT = process.cwd();
const DATA_GLOB = process.env.VOTER_DATA_GLOB || 'data/*.txt';
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE) || 800;

type BatchRow = {
  sos: string;
  countyNumber: string;
  last: string;
  first: string;
  middle: string;
  json: Record<string, string>;
};

/** Log connection target with password redacted. */
function redactedDatabaseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '(could not parse DATABASE_URL)';
  }
}

async function loadRepoDotenv(): Promise<boolean> {
  const envPath = path.join(REPO_ROOT, '.env');
  try {
    const text = await readFile(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    return true;
  } catch {
    return false;
  }
}

async function flushBatch(
  client: pg.PoolClient,
  batch: BatchRow[],
): Promise<void> {
  if (batch.length === 0) return;
  const parts: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const r of batch) {
    parts.push(
      `($${i},$${i + 1},$${i + 2},$${i + 3},$${i + 4},$${i + 5},$${i + 6}::jsonb)`,
    );
    i += 7;
    vals.push(
      r.sos,
      r.countyNumber,
      '',
      r.last,
      r.first,
      r.middle,
      JSON.stringify(r.json),
    );
  }
  await client.query(
    `INSERT INTO voters (sos_voterid, county_number, county_label, last_name, first_name, middle_name, row_json)
     VALUES ${parts.join(',')}
     ON CONFLICT (sos_voterid) DO UPDATE SET
       county_number = EXCLUDED.county_number,
       county_label = EXCLUDED.county_label,
       last_name = EXCLUDED.last_name,
       first_name = EXCLUDED.first_name,
       middle_name = EXCLUDED.middle_name,
       row_json = EXCLUDED.row_json`,
    vals,
  );
}

async function importFile(
  client: pg.PoolClient,
  filePath: string,
  onStats: (inserted: number) => void,
): Promise<void> {
  const batch: BatchRow[] = [];
  let batchCount = 0;
  let sawFirstDataRow = false;
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }),
  );

  console.log(
    '  Streaming CSV (skipping blank lines until first data row; large files can pause here while parsing)…',
  );

  for await (const record of parser as AsyncIterable<Record<string, string>>) {
    if (!isDataRow(record)) continue;
    if (!sawFirstDataRow) {
      sawFirstDataRow = true;
      console.log(
        `  First voter row seen; committing in batches of ${BATCH_SIZE} (each further batch prints a dot).`,
      );
    }
    const picked = pickRow(record);
    const sos = (picked.SOS_VOTERID ?? '').trim();
    if (!sos) continue;

    const countyNumber = (picked.COUNTY_NUMBER ?? '').trim();

    batch.push({
      sos,
      countyNumber,
      last: picked.LAST_NAME ?? '',
      first: picked.FIRST_NAME ?? '',
      middle: picked.MIDDLE_NAME ?? '',
      json: picked,
    });

    if (batch.length >= BATCH_SIZE) {
      const n = batch.length;
      await flushBatch(client, batch);
      batchCount += 1;
      onStats(n);
      batch.length = 0;
      if (batchCount > 1) process.stdout.write('.');
    }
  }

  if (batch.length > 0) {
    const n = batch.length;
    await flushBatch(client, batch);
    batchCount += 1;
    onStats(n);
    batch.length = 0;
  }

  if (batchCount > 1) process.stdout.write('\n');
  if (!sawFirstDataRow) console.log('  No data rows found in this file (nothing inserted).');
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const hadDotenv = await loadRepoDotenv();
  console.log(
    hadDotenv
      ? `Loaded environment from ${path.join(REPO_ROOT, '.env')}`
      : 'No repo .env file (using process environment only).',
  );

  const dbUrl = getDatabaseUrl();
  console.log(`DATABASE_URL → ${redactedDatabaseUrl(dbUrl)}`);
  console.log(`Matching data files: ${DATA_GLOB}`);

  const files = await glob(DATA_GLOB, { cwd: REPO_ROOT, absolute: true, nodir: true });
  const sorted = files.sort();
  if (sorted.length === 0) {
    console.error(
      `No files matched "${DATA_GLOB}" under ${REPO_ROOT}. Set VOTER_DATA_GLOB or add data files.`,
    );
    process.exit(1);
  }
  console.log(`Found ${sorted.length} file(s).`);

  console.log('Connecting to PostgreSQL…');
  const pool = new pg.Pool({ connectionString: dbUrl, max: 1 });
  const tConnect = Date.now();
  const client = await pool.connect();
  console.log(`Connected (${Date.now() - tConnect}ms).`);

  let inserted = 0;

  try {
    console.log('BEGIN transaction (import is all-or-nothing until commit).');
    await client.query('BEGIN');

    console.log(
      'ensureSchema: extension pg_trgm, voters table, indexes (can take a while on a big existing table)…',
    );
    const tSchema = Date.now();
    await ensureSchema(client);
    console.log(`ensureSchema finished (${Date.now() - tSchema}ms).`);

    console.log('TRUNCATE voters — removing all existing rows before reload.');
    const tTrunc = Date.now();
    await client.query('TRUNCATE voters');
    console.log(`TRUNCATE complete (${Date.now() - tTrunc}ms). Loading ${sorted.length} file(s)…`);

    let fileIndex = 0;
    for (const filePath of sorted) {
      fileIndex += 1;
      const base = path.basename(filePath);
      console.log('');
      console.log(`[${fileIndex}/${sorted.length}] ${base}`);
      console.log(`  ${filePath}`);
      const before = inserted;
      await importFile(client, filePath, (n) => {
        inserted += n;
      });
      console.log(
        `  Done with file: +${inserted - before} rows this file; ${inserted} rows staged in DB so far (uncommitted until all files finish).`,
      );
    }

    console.log('');
    console.log('COMMIT transaction…');
    await client.query('COMMIT');
    console.log('Running ANALYZE voters…');
    await client.query('ANALYZE voters');
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Finished. ${inserted} rows loaded in ${sec}s.`);
  } catch (err) {
    console.error('Error during import; rolling back transaction.');
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
