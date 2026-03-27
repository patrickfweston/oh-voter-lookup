#!/usr/bin/env node
/**
 * Download Ohio SOS county voter file products (P2_PRODUCT_NUMBER 1–88).
 *
 * URLs: https://www6.ohiosos.gov/ords/f?p=VOTERFTP:DOWNLOAD::FILE:NO:2:P2_PRODUCT_NUMBER:N
 *
 * Output: files written under ./data (or --out), using filenames from
 * Content-Disposition when present.
 *
 * Cloudflare often blocks scripts with 403. In your browser, open the voter
 * file download page, complete any challenge, then copy the full Cookie header
 * and run either:
 *   OH_SOS_COOKIE='...' node scripts/download-ohio-counties.mjs
 *   node scripts/download-ohio-counties.mjs --cookie '...'
 *
 * Repo .env: if `<repo>/.env` defines OH_SOS_COOKIE, it is loaded automatically
 * unless that variable is already set in the environment.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const BASE_URL =
  'https://www6.ohiosos.gov/ords/f?p=VOTERFTP:DOWNLOAD::FILE:NO:2:P2_PRODUCT_NUMBER:'

const UA_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const REFERER =
  'https://www6.ohiosos.gov/ords/r/sep/sos/voter-registration/voter-file-download'

/** Load OH_SOS_COOKIE from <repo>/.env (does not override existing env). */
async function loadRepoDotenv() {
  const envPath = path.join(REPO_ROOT, '.env')
  try {
    const text = await fs.readFile(envPath, 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      if (key !== 'OH_SOS_COOKIE') continue
      if (process.env.OH_SOS_COOKIE) break
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (val) process.env.OH_SOS_COOKIE = val
      break
    }
  } catch {
    /* no .env or unreadable */
  }
}

function parseArgs(argv) {
  const out = {
    dir: path.join(REPO_ROOT, 'data'),
    start: 1,
    end: 88,
    dry: false,
    cookie: process.env.OH_SOS_COOKIE || '',
    delayMs: 2000,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') out.help = true
    else if (a === '--dry-run') out.dry = true
    else if (a === '--out') out.dir = path.resolve(argv[++i])
    else if (a === '--from') out.start = Number(argv[++i])
    else if (a === '--to') out.end = Number(argv[++i])
    else if (a === '--cookie') out.cookie = argv[++i]
    else if (a === '--delay-ms') out.delayMs = Number(argv[++i])
  }
  if (
    !Number.isFinite(out.start) ||
    !Number.isFinite(out.end) ||
    out.start < 1 ||
    out.end < out.start
  ) {
    console.error('Invalid --from / --to')
    process.exit(2)
  }
  return out
}

function filenameFromDisposition(cd) {
  if (!cd) return null
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      return star[1]
    }
  }
  const q = /filename="([^"]+)"/i.exec(cd)
  if (q) return q[1]
  const u = /filename=([^;\s]+)/i.exec(cd)
  if (u) return u[1].replace(/^["']|["']$/g, '')
  return null
}

function sanitizeFilename(name) {
  const base = path.basename(name.trim() || 'download')
  return base.replace(/[/\\?*:|"<>]/g, '_')
}

async function resolveOutputPath(dir, preferredName, productNumber) {
  const rawExt = path.extname(preferredName)
  const ext = rawExt || '.bin'
  const stem =
    sanitizeFilename(path.basename(preferredName, rawExt) || `PRODUCT_${productNumber}`) ||
    `PRODUCT_${productNumber}`

  for (let i = 0; i < 100; i++) {
    const name =
      i === 0
        ? sanitizeFilename(`${stem}${ext}`)
        : sanitizeFilename(`${stem}_product${productNumber}_${i}${ext}`)
    const full = path.join(dir, name)
    try {
      await fs.access(full)
    } catch {
      return full
    }
  }
  return path.join(dir, sanitizeFilename(`${stem}_product${productNumber}_${Date.now()}${ext}`))
}

async function downloadOne(productNumber, opts) {
  const url = `${BASE_URL}${productNumber}`
  const hasCookie = Boolean(opts.cookie?.trim())

  const headers = {
    'User-Agent': UA_CHROME,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: REFERER,
  }
  if (hasCookie) headers.Cookie = opts.cookie

  const res = await fetch(url, { headers, redirect: 'follow' })
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = (res.headers.get('content-type') || '').toLowerCase()

  if (!res.ok) {
    let hint
    if (res.status === 403) {
      hint = hasCookie
        ? '403: cookie was sent but rejected (often expired cf_clearance/__cf_bm, wrong browser/IP, or bot check). Copy a fresh full Cookie header right after a successful download click in the same browser.'
        : '403: set OH_SOS_COOKIE, add it to .env, or use --cookie from your browser after opening the SOS download page.'
    }
    return {
      ok: false,
      productNumber,
      status: res.status,
      hint,
      snippet: buf.slice(0, 400).toString('utf8'),
    }
  }

  if (ct.includes('text/html')) {
    return {
      ok: false,
      productNumber,
      status: res.status,
      hint: 'Response is HTML (login/challenge or error page), not a file download.',
      snippet: buf.slice(0, 400).toString('utf8'),
    }
  }

  const fromHeader = filenameFromDisposition(
    res.headers.get('content-disposition'),
  )
  const preferred = fromHeader || `PRODUCT_${productNumber}.bin`
  const outPath = await resolveOutputPath(opts.dir, preferred, productNumber)

  await fs.writeFile(outPath, buf)
  return {
    ok: true,
    productNumber,
    path: outPath,
    bytes: buf.length,
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  await loadRepoDotenv()
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(`Usage: node scripts/download-ohio-counties.mjs [options]

  --out DIR       Output directory (default: <repo>/data)
  --from N        First P2_PRODUCT_NUMBER (default: 1)
  --to N          Last P2_PRODUCT_NUMBER (default: 88)
  --cookie STR    Cookie header (or env / repo .env OH_SOS_COOKIE)
  --delay-ms MS   Pause between requests (default: 2000)
  --dry-run       Print target URLs only

Example:
  OH_SOS_COOKIE='cf_clearance=...; __cf_bm=...' \\
    node scripts/download-ohio-counties.mjs --out ./data
`)
    process.exit(0)
  }

  await fs.mkdir(opts.dir, { recursive: true })

  console.log(`Output directory: ${opts.dir}`)
  console.log(`Products: ${opts.start} … ${opts.end}`)
  if (!opts.cookie && !opts.dry) {
    console.warn(
      '\n⚠ No cookie set (OH_SOS_COOKIE / --cookie). If downloads fail with 403, copy Cookie from your browser.\n',
    )
  }

  const failures = []
  for (let n = opts.start; n <= opts.end; n++) {
    if (opts.dry) {
      console.log(`${n}/${opts.end}  ${BASE_URL}${n}`)
      continue
    }
    process.stdout.write(`${n}/${opts.end} … `)
    try {
      const r = await downloadOne(n, opts)
      if (r.ok) {
        const mb = (r.bytes / 1024 / 1024).toFixed(2)
        console.log(`${path.basename(r.path)} (${mb} MB)`)
      } else {
        console.log(`FAILED (${r.status}) ${r.hint || ''}`)
        failures.push(r)
      }
    } catch (e) {
      console.log(`ERROR ${e instanceof Error ? e.message : e}`)
      failures.push({ productNumber: n, error: String(e) })
    }
    if (n < opts.end && !opts.dry && opts.delayMs > 0)
      await sleep(opts.delayMs)
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s). First details:`)
    console.error(failures[0])
    process.exit(1)
  }
  console.log('\nDone.')
}

main()
