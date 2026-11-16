import { createServer } from 'node:http';
import { appendFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const dataDir = process.env.DATA_DIR || join(root, 'data');
const csvPath = join(dataDir, 'inquiries.csv');
const port = Number(process.env.PORT || 3000);
const adminKey = process.env.MEGALIFT_ADMIN_KEY || '';
const maxBodyBytes = 20_000;
const recentRequests = new Map();
let writeQueue = Promise.resolve();

const columns = [
  'submission_id', 'submitted_at_utc', 'name', 'email', 'company', 'phone',
  'cargo', 'weight', 'origin', 'destination', 'notes', 'quote_weight_tonnes',
  'route_distance_km', 'move_type', 'indicative_quote_inr', 'consent'
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function csvCell(value) {
  let text = String(value ?? '').replace(/[\r\n\0]/g, ' ').trim();
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Please send a valid enquiry.'), { status: 400 }); }
}

function textField(body, key, maxLength = 500) {
  return typeof body[key] === 'string' ? body[key].trim().slice(0, maxLength) : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function tooManyRequests(ip) {
  const now = Date.now();
  const prior = recentRequests.get(ip) || [];
  const active = prior.filter((time) => now - time < 60_000);
  if (active.length >= 12) return true;
  active.push(now);
  recentRequests.set(ip, active);
  return false;
}

async function saveInquiry(req, res) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') {
    return send(res, 415, JSON.stringify({ error: 'Expected an application/json enquiry.' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      const host = req.headers.host;
      if (`${parsed.host}` !== host || !['http:', 'https:'].includes(parsed.protocol)) {
        return send(res, 403, JSON.stringify({ error: 'This enquiry source is not allowed.' }), { 'Content-Type': 'application/json; charset=utf-8' });
      }
    } catch {
      return send(res, 403, JSON.stringify({ error: 'This enquiry source is not allowed.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    }
  }
  const ip = req.socket.remoteAddress || 'unknown';
  if (tooManyRequests(ip)) return send(res, 429, JSON.stringify({ error: 'Please wait a moment before sending another enquiry.' }), { 'Content-Type': 'application/json; charset=utf-8' });

  let body;
  try { body = await readJson(req); }
  catch (error) { return send(res, error.status || 400, JSON.stringify({ error: error.message }), { 'Content-Type': 'application/json; charset=utf-8' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return send(res, 400, JSON.stringify({ error: 'Please send a valid enquiry.' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  const record = {
    submission_id: randomUUID(),
    submitted_at_utc: new Date().toISOString(),
    name: textField(body, 'name', 120),
    email: textField(body, 'email', 254),
    company: textField(body, 'company', 160),
    phone: textField(body, 'phone', 60),
    cargo: textField(body, 'cargo', 160),
    weight: textField(body, 'weight', 60),
    origin: textField(body, 'origin', 180),
    destination: textField(body, 'destination', 180),
    notes: textField(body, 'notes', 2000),
    quote_weight_tonnes: textField(body, 'quoteWeight', 20),
    route_distance_km: textField(body, 'quoteDistance', 20),
    move_type: textField(body, 'quoteType', 50),
    indicative_quote_inr: textField(body, 'quoteRange', 100),
    consent: body.consent === true ? 'yes' : 'no'
  };
  if (record.name.length < 2 || !validEmail(record.email) || !record.cargo || !record.origin || !record.destination || body.consent !== true) {
    return send(res, 400, JSON.stringify({ error: 'Please complete the required fields and confirm the enquiry consent.' }), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  const save = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    let needsHeader = false;
    try { needsHeader = (await stat(csvPath)).size === 0; }
    catch { needsHeader = true; }
    const row = columns.map((column) => csvCell(record[column])).join(',');
    await appendFile(csvPath, `${needsHeader ? `\uFEFF${columns.map(csvCell).join(',')}\r\n` : ''}${row}\r\n`, 'utf8');
  });
  writeQueue = save.catch(() => {});
  await save;
  return send(res, 201, JSON.stringify({ ok: true, id: record.submission_id }), { 'Content-Type': 'application/json; charset=utf-8' });
}

function adminDownload(req, res) {
  if (!adminKey) return send(res, 503, 'Enquiry export is disabled until MEGALIFT_ADMIN_KEY is configured.');
  const authorization = req.headers.authorization || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!safeEqual(supplied, adminKey)) return send(res, 401, 'Administrator authorization required.');
  createReadStream(csvPath)
    .on('error', (error) => {
      if (error.code === 'ENOENT') send(res, 404, 'No enquiries have been received yet.');
      else if (!res.headersSent) send(res, 500, 'Unable to read the enquiry log.');
    })
    .on('open', () => res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="megalift-inquiries.csv"',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
    }))
    .pipe(res);
}

async function serveStatic(pathname, res) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return send(res, 400, 'Invalid path.'); }
  if (decoded.includes('\0') || decoded.split('/').includes('..') || decoded.startsWith('/data/')) return send(res, 404, 'Not found.');
  const relative = normalize(decoded === '/' ? 'index.html' : decoded.slice(1));
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${sep}`)) return send(res, 404, 'Not found.');
  try {
    const info = await stat(file);
    if (!info.isFile()) return send(res, 404, 'Not found.');
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': extname(file) === '.html' ? 'no-store' : 'public, max-age=86400'
    });
    createReadStream(file).pipe(res);
  } catch { send(res, 404, 'Not found.'); }
}

createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'POST' && url.pathname === '/api/inquiries') {
    try { await saveInquiry(req, res); }
    catch (error) {
      console.error('Could not store enquiry:', error.message);
      if (!res.headersSent) send(res, 500, JSON.stringify({ error: 'We could not save the enquiry. Please try again shortly.' }), { 'Content-Type': 'application/json; charset=utf-8' });
    }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/inquiries.csv') return adminDownload(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed.', { Allow: 'GET, HEAD, POST' });
  await serveStatic(url.pathname, res);
}).listen(port, '0.0.0.0', () => {
  console.log(`MegaLift website running at http://localhost:${port}`);
  if (!adminKey) console.log('Set MEGALIFT_ADMIN_KEY to enable protected enquiry downloads.');
});
