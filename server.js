import { createServer } from 'node:http';
import { createReadStream, mkdirSync, unlinkSync } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const scrypt = promisify(scryptCallback);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 3001);
const SESSION_DAYS = 30;
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const authAttempts = new Map();
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'swipemenu.sqlite'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS menus (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
    cafe_name TEXT NOT NULL,
    orientation TEXT NOT NULL,
    binding TEXT NOT NULL,
    size_preset TEXT NOT NULL,
    custom_width REAL,
    custom_height REAL,
    pages_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS menus_owner ON menus(owner_id, updated_at DESC);
`);

const sendJson = (res, status, body) => {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(data);
};

const fail = (res, status, error) => sendJson(res, status, { error });
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const safeUser = (user) => ({ id: user.id, email: user.email });
const parsePages = (row) => JSON.parse(row.pages_json);
const menuSummary = (row) => ({
  id: row.id, slug: row.slug, cafeName: row.cafe_name,
  orientation: row.orientation, binding: row.binding,
  pageCount: parsePages(row).length, updatedAt: row.updated_at,
  url: `/menu/${encodeURIComponent(row.slug)}`
});
const menuDetail = (row) => ({
  ...menuSummary(row), sizePreset: row.size_preset,
  customWidth: row.custom_width, customHeight: row.custom_height,
  pages: parsePages(row)
});

function cookieMap(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((entry) => {
    const i = entry.indexOf('=');
    return i < 0 ? ['', ''] : [entry.slice(0, i).trim(), decodeURIComponent(entry.slice(i + 1).trim())];
  }).filter(([key]) => key));
}

function cookieOptions(req) {
  const secure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

function setSessionCookie(res, req, token) {
  res.setHeader('Set-Cookie', `swipe_session=${encodeURIComponent(token)}; ${cookieOptions(req)}`);
}

function clearSessionCookie(res, req) {
  const secure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `swipe_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const trusted = process.env.PUBLIC_ORIGIN
      ? new URL(process.env.PUBLIC_ORIGIN).origin
      : `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
    return new URL(origin).origin === trusted;
  } catch { return false; }
}

function authRateLimited(req) {
  const forwardedIp = process.env.TRUST_PROXY === 'true'
    ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    : '';
  const key = forwardedIp || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = authAttempts.get(key);
  if (!bucket || now - bucket.startedAt > 10 * 60 * 1000) {
    bucket = { startedAt: now, count: 0 };
    authAttempts.set(key, bucket);
  }
  bucket.count++;
  if (authAttempts.size > 1000) {
    for (const [ip, item] of authAttempts) if (now - item.startedAt > 10 * 60 * 1000) authAttempts.delete(ip);
  }
  return bucket.count > 12;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) return;
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        reject(Object.assign(new Error('Ukuran data menu terlalu besar.'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Format permintaan tidak valid.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function currentUser(req) {
  const token = cookieMap(req).swipe_session;
  if (!token || token.length > 200) return null;
  const session = db.prepare(`SELECT users.id, users.email, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?`).get(hashToken(token));
  if (!session || session.expires_at <= Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    return null;
  }
  return session;
}

function requireUser(req, res) {
  const user = currentUser(req);
  if (!user) fail(res, 401, 'Masuk ke akun untuk melanjutkan.');
  return user;
}

async function createSession(user, req, res) {
  const token = randomBytes(32).toString('base64url');
  const expiry = Date.now() + SESSION_DAYS * 86400000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), user.id, expiry);
  setSessionCookie(res, req, token);
}

function validSlug(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 48 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    !['api', 'akun', 'menu', 'assets', 'css', 'js', 'uploads', 'admin', 'login', 'register'].includes(value);
}

function hasImageSignature(buffer, mime) {
  if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return mime === 'image/webp' && buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

async function storePage(page) {
  if (!page || typeof page.dataUrl !== 'string') throw new Error('Salah satu gambar halaman tidak tersedia.');
  const match = page.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error('Format gambar halaman tidak dikenali.');
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !hasImageSignature(buffer, mime)) {
    throw new Error('Gambar harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.');
  }
  const file = `${randomUUID()}.${MIME_EXT[mime]}`;
  await writeFile(path.join(UPLOAD_DIR, file), buffer, { flag: 'wx', mode: 0o644 });
  return {
    name: String(page.name || 'Halaman menu').slice(0, 120),
    url: `/uploads/${file}`,
    w: Math.min(10000, Math.max(1, Number(page.w) || 1)),
    h: Math.min(10000, Math.max(1, Number(page.h) || 1)),
    fit: page.fit === 'contain' ? 'contain' : 'cover'
  };
}

function removePageFiles(pages) {
  for (const page of pages || []) {
    if (typeof page.url !== 'string' || !page.url.startsWith('/uploads/')) continue;
    const name = path.basename(page.url);
    if (!/^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(name)) continue;
    try { unlinkSync(path.join(UPLOAD_DIR, name)); } catch { /* file already removed */ }
  }
}

function validateMenu(body) {
  if (!body || typeof body !== 'object') return 'Data menu tidak valid.';
  const cafeName = String(body.cafeName || '').trim();
  if (cafeName.length < 2 || cafeName.length > 80) return 'Nama kafe harus berisi 2 sampai 80 karakter.';
  if (!validSlug(body.slug)) return 'Alamat menu harus 3–48 karakter, memakai huruf kecil, angka, dan tanda hubung.';
  if (!Array.isArray(body.pages) || body.pages.length < 1 || body.pages.length > 40) return 'Menu harus memiliki 1 sampai 40 halaman.';
  if (!['portrait', 'landscape'].includes(body.orientation)) return 'Bentuk halaman tidak valid.';
  if (!['biasa', 'spiral'].includes(body.binding)) return 'Jenis jilid tidak valid.';
  if (!['A4', 'A5', 'custom'].includes(body.sizePreset)) return 'Ukuran halaman tidak valid.';
  return null;
}

async function saveMenu(req, res, user) {
  const body = await readJson(req);
  const invalid = validateMenu(body);
  if (invalid) return fail(res, 400, invalid);

  const id = typeof body.id === 'string' && /^[a-f0-9-]{36}$/.test(body.id) ? body.id : randomUUID();
  const existing = db.prepare('SELECT * FROM menus WHERE id = ? AND owner_id = ?').get(id, user.id);
  if (body.id && !existing) return fail(res, 404, 'Menu tidak ditemukan di akun ini.');
  const conflict = db.prepare('SELECT id FROM menus WHERE slug = ? COLLATE NOCASE AND id != ?').get(body.slug, id);
  if (conflict) return fail(res, 409, 'Alamat itu sudah dipakai. Coba nama lain.');

  const pages = [];
  try {
    for (const page of body.pages) pages.push(await storePage(page));
  } catch (error) {
    removePageFiles(pages);
    return fail(res, 400, error.message || 'Gambar tidak dapat disimpan.');
  }

  const now = new Date().toISOString();
  const customWidth = body.sizePreset === 'custom' ? Number(body.customWidth) : null;
  const customHeight = body.sizePreset === 'custom' ? Number(body.customHeight) : null;
  if (body.sizePreset === 'custom' && (![customWidth, customHeight].every(Number.isFinite) ||
      customWidth < 80 || customWidth > 500 || customHeight < 80 || customHeight > 500)) {
    removePageFiles(pages);
    return fail(res, 400, 'Ukuran khusus harus berada antara 80 dan 500 mm.');
  }

  try {
    const query = existing
      ? `UPDATE menus SET slug=?, cafe_name=?, orientation=?, binding=?, size_preset=?, custom_width=?, custom_height=?, pages_json=?, updated_at=? WHERE id=? AND owner_id=?`
      : `INSERT INTO menus (slug, cafe_name, orientation, binding, size_preset, custom_width, custom_height, pages_json, updated_at, id, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [body.slug, String(body.cafeName).trim(), body.orientation, body.binding,
      body.sizePreset, customWidth, customHeight, JSON.stringify(pages), now];
    if (existing) db.prepare(query).run(...values, id, user.id);
    else db.prepare(query).run(...values, id, user.id, now);
  } catch (error) {
    removePageFiles(pages);
    if (String(error.message).includes('UNIQUE')) return fail(res, 409, 'Alamat itu sudah dipakai. Coba nama lain.');
    throw error;
  }
  if (existing) removePageFiles(parsePages(existing));
  const row = db.prepare('SELECT * FROM menus WHERE id = ?').get(id);
  sendJson(res, existing ? 200 : 201, menuDetail(row));
}

async function serveFile(res, fullPath) {
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) return false;
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff'
    });
    createReadStream(fullPath).pipe(res);
    return true;
  } catch { return false; }
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  const method = req.method;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !originAllowed(req)) return fail(res, 403, 'Sumber permintaan tidak diizinkan.');
  if (method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(pathname) && authRateLimited(req)) {
    return fail(res, 429, 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
  }
  if (method === 'OPTIONS') { res.writeHead(204, { Allow: 'GET, POST, PUT, DELETE, OPTIONS' }); return res.end(); }

  if (pathname === '/api/health' && method === 'GET') return sendJson(res, 200, { ok: true });
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = currentUser(req);
    return sendJson(res, 200, { user: user ? safeUser(user) : null });
  }
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object') return fail(res, 400, 'Data akun tidak valid.');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(res, 400, 'Masukkan alamat email yang valid.');
    if (password.length < 10 || password.length > 128) return fail(res, 400, 'Kata sandi harus berisi 10–128 karakter.');
    const salt = randomBytes(16).toString('hex');
    const digest = await scrypt(password, salt, 64);
    const user = { id: randomUUID(), email };
    try {
      db.prepare('INSERT INTO users (id, email, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(user.id, email, salt, Buffer.from(digest).toString('hex'), new Date().toISOString());
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return fail(res, 409, 'Email ini sudah memiliki akun. Silakan masuk.');
      throw error;
    }
    await createSession(user, req, res);
    return sendJson(res, 201, { user });
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object') return fail(res, 400, 'Data akun tidak valid.');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (!user || password.length > 128) return fail(res, 401, 'Email atau kata sandi tidak cocok.');
    const digest = Buffer.from(await scrypt(password, user.salt, 64));
    const expected = Buffer.from(user.password_hash, 'hex');
    if (digest.length !== expected.length || !timingSafeEqual(digest, expected)) return fail(res, 401, 'Email atau kata sandi tidak cocok.');
    await createSession(user, req, res);
    return sendJson(res, 200, { user: safeUser(user) });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = cookieMap(req).swipe_session;
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    clearSessionCookie(res, req);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/public/menus' && method === 'GET') return fail(res, 404, 'Menu tidak ditemukan.');
  const publicMatch = pathname.match(/^\/api\/public\/menus\/([a-z0-9-]+)$/);
  if (publicMatch && method === 'GET') {
    const menu = db.prepare('SELECT * FROM menus WHERE slug = ? COLLATE NOCASE').get(publicMatch[1]);
    if (!menu) return fail(res, 404, 'Menu ini tidak ditemukan atau belum diterbitkan.');
    return sendJson(res, 200, menuDetail(menu));
  }

  if (pathname.startsWith('/api/menus')) {
    const user = requireUser(req, res);
    if (!user) return;
    if (pathname === '/api/menus' && method === 'GET') {
      const rows = db.prepare('SELECT * FROM menus WHERE owner_id = ? ORDER BY updated_at DESC').all(user.id);
      return sendJson(res, 200, { menus: rows.map(menuSummary) });
    }
    if (pathname === '/api/menus' && method === 'POST') return saveMenu(req, res, user);
    const menuMatch = pathname.match(/^\/api\/menus\/([a-f0-9-]{36})$/);
    if (menuMatch && method === 'GET') {
      const row = db.prepare('SELECT * FROM menus WHERE id = ? AND owner_id = ?').get(menuMatch[1], user.id);
      return row ? sendJson(res, 200, menuDetail(row)) : fail(res, 404, 'Menu tidak ditemukan di akun ini.');
    }
    if (menuMatch && method === 'DELETE') {
      const row = db.prepare('SELECT * FROM menus WHERE id = ? AND owner_id = ?').get(menuMatch[1], user.id);
      if (!row) return fail(res, 404, 'Menu tidak ditemukan di akun ini.');
      db.prepare('DELETE FROM menus WHERE id = ? AND owner_id = ?').run(menuMatch[1], user.id);
      removePageFiles(parsePages(row));
      return sendJson(res, 200, { ok: true });
    }
    return fail(res, 404, 'Rute API tidak ditemukan.');
  }
  return fail(res, 404, 'Rute API tidak ditemukan.');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/akun' || url.pathname === '/akun/') return await serveFile(res, path.join(ROOT, 'account.html')) || fail(res, 404, 'Halaman akun tidak ditemukan.');
    if (/^\/menu\/[a-z0-9-]+\/?$/.test(url.pathname)) return await serveFile(res, path.join(ROOT, 'index.html')) || fail(res, 404, 'Halaman menu tidak ditemukan.');
    if (url.pathname.startsWith('/uploads/')) {
      const filename = path.basename(url.pathname);
      if (!/^[a-f0-9-]+\.(?:jpg|png|webp)$/.test(filename)) return fail(res, 404, 'Gambar tidak ditemukan.');
      return await serveFile(res, path.join(UPLOAD_DIR, filename)) || fail(res, 404, 'Gambar tidak ditemukan.');
    }
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relative);
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || filePath === DATA_DIR || filePath.startsWith(`${DATA_DIR}${path.sep}`) ||
        relative.split(/[\\/]/).some((part) => part.startsWith('.'))) return fail(res, 404, 'Berkas tidak ditemukan.');
    return await serveFile(res, filePath) || fail(res, 404, 'Berkas tidak ditemukan.');
  } catch (error) {
    console.error(error);
    if (!res.headersSent) fail(res, error.status || 500, error.status ? error.message : 'Terjadi kesalahan di server.');
    else res.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Swipe.menu berjalan di http://localhost:${PORT}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(() => { db.close(); process.exit(0); });
});
