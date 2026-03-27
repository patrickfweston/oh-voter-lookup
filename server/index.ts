import express from 'express';
import {
  ensureSchema,
  getPool,
  listCountyOptionsFromDb,
  searchVoters,
  voterCount,
} from './db';
import { loadRepoDotenvSync } from './env';

/** Env: PORT (default 3001), HOST (default 127.0.0.1), DATABASE_URL (required). */
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const app = express();

app.get('/api/counties', async (_req, res) => {
  try {
    const n = await voterCount();
    if (n === 0) {
      res.status(503).json({
        error:
          'No voter data loaded. Run npm run db:import after starting PostgreSQL.',
      });
      return;
    }
    const counties = await listCountyOptionsFromDb();
    res.json({ counties });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to list counties';
    res.status(500).json({ error: message });
  }
});

app.get('/api/search', async (req, res) => {
  const last = String(req.query.last ?? '').trim();
  const first = String(req.query.first ?? '').trim();
  const middle = String(req.query.middle ?? '').trim();
  const county = String(req.query.county ?? '').trim();
  const congressional = String(req.query.congressional ?? '').trim();
  const ohHouse = String(req.query.oh_house ?? '').trim();
  const ohSenate = String(req.query.oh_senate ?? '').trim();

  if (!last && !first && !middle && !congressional && !ohHouse && !ohSenate) {
    res.status(400).json({
      error:
        'Provide at least one name field or one district (congressional, oh_house, or oh_senate).',
    });
    return;
  }

  try {
    const n = await voterCount();
    if (n === 0) {
      res.status(503).json({
        error:
          'No voter data loaded. Run npm run db:import after starting PostgreSQL.',
      });
      return;
    }
    const result = await searchVoters({
      last,
      first,
      middle,
      county,
      congressional,
      ohHouse,
      ohSenate,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    res.status(500).json({ error: message });
  }
});

async function main(): Promise<void> {
  loadRepoDotenvSync();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await ensureSchema(client);
  } finally {
    client.release();
  }

  app.listen(PORT, HOST, () => {
    console.log(`Voter search API at http://${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
