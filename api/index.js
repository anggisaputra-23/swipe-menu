import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';
import { del, put } from '@vercel/blob';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const authAttempts = new Map();
let sqlClient;
let schemaReady;

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum dikonfigurasi.');
  return sqlClient ||= neon(process.env.DATABASE_URL);
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = sql();
      await db.query(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug TEXT NOT NULL UNIQUE,
        cafe_name TEXT NOT NULL,
        orientation TEXT NOT NULL,
        binding TEXT NOT NULL,
        size_preset TEXT NOT NULL,
        custom_width DOUBLE PRECISION,
        custom_height DOUBLE PRECISION,
        pages_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await db.query('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)');
      await db.query('CREATE INDEX IF NOT EXISTS menus_owner ON menus(owner_id, updated_at DESC)');
    })().catch((error) => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
  });
}

function fail(status, message) { return json({ error: message }, status); }
function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }
function safeUser(user) { return { id: user.id, email: user.email }; }
function parsePages(row) { return typeof row.pages_json === 'string' ? JSON.parse(row.pages_json) : row.pages_json; }

function menuSummary(row) {
  return {
    id: row.id, slug: row.slug, cafeName: row.cafe_name,
    orientation: row.orientation, binding: row.binding,
    pageCount: parsePages(row).length, updatedAt: row.updated_at,
    url: `/menu/${encodeURIComponent(row.slug)}`
  };
}

function menuDetail(row) {
  return {
    ...menuSummary(row), sizePreset: row.size_preset,
    customWidth: row.custom_width, customHeight: row.custom_height,
    pages: parsePages(row)
  };
}

function cookieMap(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map((entry) => {
    const index = entry.indexOf('=');
    if (index < 0) return ['', ''];
    try { return [entry.slice(0, index).trim(), decodeURIComponent(entry.slice(index + 1).trim())]; }
    catch { return ['', '']; }
  }).filter(([key]) => key));
}

function cookieValue(token, request) {
  const secure = new URL(request.url).protocol === 'https:' || process.env.VERCEL === '1';
  return `swipe_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const expected = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : new URL(request.url).origin;
    return new URL(origin).origin === expected;
  } catch { return false; }
}

function authRateLimited(request) {
  const key = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
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

async function readJson(request, maxBytes = MAX_JSON_BYTES) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBytes) throw Object.assign(new Error('Data yang dikirim terlalu besar.'), { status: 413 });
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.byteLength > maxBytes) throw Object.assign(new Error('Data yang dikirim terlalu besar.'), { status: 413 });
  try { return JSON.parse(new TextDecoder().decode(data)); }
  catch { throw Object.assign(new Error('Format permintaan tidak valid.'), { status: 400 }); }
}

async function currentUser(request) {
  const token = cookieMap(request).swipe_session;
  if (!token || token.length > 200) return null;
  const rows = await sql().query(`SELECT users.id, users.email, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = $1`, [hashToken(token)]);
  const user = rows[0];
  if (!user || Number(user.expires_at) <= Date.now()) {
    if (user) await sql().query('DELETE FROM sessions WHERE expires_at <= $1', [Date.now()]);
    return null;
  }
  return user;
}

async function createSession(user, request) {
  const token = randomBytes(32).toString('base64url');
  const expiry = Date.now() + SESSION_DAYS * 86400000;
  await sql().query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), user.id, expiry]);
  return cookieValue(token, request);
}

function validSlug(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 48 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    !['api', 'akun', 'menu', 'assets', 'css', 'js', 'uploads', 'admin', 'login', 'register'].includes(value);
}

function hasImageSignature(buffer, mime) {
  if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.length > 8 && Buffer.from(buffer.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return mime === 'image/webp' && buffer.length > 12 && Buffer.from(buffer.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(buffer.subarray(8, 12)).toString('ascii') === 'WEBP';
}

function validPageUrl(value, ownerId) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (/^\/?assets\/menu\/[a-z0-9/-]+\.(?:svg|jpg|png|webp)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') &&
      url.pathname.startsWith(`/menus/${ownerId}/`);
  } catch { return false; }
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

function normalizePage(page, ownerId) {
  if (!page || typeof page !== 'object' || !validPageUrl(page.url, ownerId)) throw new Error('Alamat gambar halaman tidak valid.');
  const w = Number(page.w);
  const h = Number(page.h);
  if (![w, h].every(Number.isFinite) || w < 1 || h < 1 || w > 10000 || h > 10000) throw new Error('Ukuran gambar halaman tidak valid.');
  return {
    name: String(page.name || 'Halaman menu').slice(0, 120), url: page.url,
    w, h, fit: page.fit === 'contain' ? 'contain' : 'cover'
  };
}

async function uploadPage(request, user) {
  const mime = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!MIME_EXT[mime]) return fail(400, 'Format gambar harus JPG, PNG, atau WebP.');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return fail(413, 'Ukuran halaman maksimal 4 MB setelah dikompres.');
  if (!hasImageSignature(bytes, mime)) return fail(400, 'Isi berkas tidak cocok dengan format gambar.');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return fail(503, 'Penyimpanan gambar Vercel Blob belum dikonfigurasi.');
  const pathname = `menus/${user.id}/${randomUUID()}.${MIME_EXT[mime]}`;
  const blob = await put(pathname, bytes, {
    access: 'public', addRandomSuffix: true, contentType: mime,
    cacheControlMaxAge: 31536000
  });
  return json({ url: blob.url }, 201);
}

async function deleteBlobPages(pages) {
  const urls = [...new Set((pages || []).map((page) => page.url).filter((url) =>
    typeof url === 'string' && url.startsWith('https://') && url.includes('.public.blob.vercel-storage.com/menus/')))];
  await Promise.allSettled(urls.map((url) => del(url)));
}

async function saveMenu(request, user) {
  const body = await readJson(request);
  const invalid = validateMenu(body);
  if (invalid) return fail(400, invalid);
  const id = typeof body.id === 'string' && /^[a-f0-9-]{36}$/.test(body.id) ? body.id : randomUUID();
  const db = sql();
  const existingRows = await db.query('SELECT * FROM menus WHERE id = $1 AND owner_id = $2', [id, user.id]);
  const existing = existingRows[0];
  if (body.id && !existing) return fail(404, 'Menu tidak ditemukan di akun ini.');
  const conflict = await db.query('SELECT id FROM menus WHERE slug = $1 AND id <> $2', [body.slug, id]);
  if (conflict.length) return fail(409, 'Alamat itu sudah dipakai. Coba nama lain.');

  let pages;
  try { pages = body.pages.map((page) => normalizePage(page, user.id)); }
  catch (error) { return fail(400, error.message); }

  const customWidth = body.sizePreset === 'custom' ? Number(body.customWidth) : null;
  const customHeight = body.sizePreset === 'custom' ? Number(body.customHeight) : null;
  if (body.sizePreset === 'custom' && (![customWidth, customHeight].every(Number.isFinite) ||
      customWidth < 80 || customWidth > 500 || customHeight < 80 || customHeight > 500)) {
    return fail(400, 'Ukuran khusus harus berada antara 80 dan 500 mm.');
  }

  const now = new Date().toISOString();
  try {
    if (existing) {
      await db.query(`UPDATE menus SET slug=$1, cafe_name=$2, orientation=$3, binding=$4, size_preset=$5,
        custom_width=$6, custom_height=$7, pages_json=$8::jsonb, updated_at=$9
        WHERE id=$10 AND owner_id=$11`, [body.slug, String(body.cafeName).trim(), body.orientation,
        body.binding, body.sizePreset, customWidth, customHeight, JSON.stringify(pages), now, id, user.id]);
    } else {
      await db.query(`INSERT INTO menus (id, owner_id, slug, cafe_name, orientation, binding, size_preset,
        custom_width, custom_height, pages_json, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$11)`, [id, user.id, body.slug,
        String(body.cafeName).trim(), body.orientation, body.binding, body.sizePreset,
        customWidth, customHeight, JSON.stringify(pages), now]);
    }
  } catch (error) {
    if (error.code === '23505') return fail(409, 'Alamat itu sudah dipakai. Coba nama lain.');
    throw error;
  }
  if (existing) {
    const retained = new Set(pages.map((page) => page.url));
    await deleteBlobPages(parsePages(existing).filter((page) => !retained.has(page.url)));
  }
  const rows = await db.query('SELECT * FROM menus WHERE id = $1 AND owner_id = $2', [id, user.id]);
  return json(menuDetail(rows[0]), existing ? 200 : 201);
}

async function handle(request) {
  const url = new URL(request.url);
  const route = (url.searchParams.get('route') || '').replace(/^\/+/, '');
  const pathname = `/api/${route}`;
  const method = request.method.toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !originAllowed(request)) return fail(403, 'Sumber permintaan tidak diizinkan.');
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'GET, POST, PUT, DELETE, OPTIONS' } });
  await ensureSchema();
  if (method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(pathname) && authRateLimited(request)) {
    return fail(429, 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
  }

  if (pathname === '/api/health' && method === 'GET') return json({ ok: true });
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await currentUser(request);
    return json({ user: user ? safeUser(user) : null });
  }
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readJson(request);
    if (!body || typeof body !== 'object') return fail(400, 'Data akun tidak valid.');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return fail(400, 'Masukkan alamat email yang valid.');
    if (password.length < 10 || password.length > 128) return fail(400, 'Kata sandi harus berisi 10–128 karakter.');
    const salt = randomBytes(16).toString('hex');
    const digest = await scrypt(password, salt, 64);
    const user = { id: randomUUID(), email };
    try {
      await sql().query('INSERT INTO users (id, email, salt, password_hash) VALUES ($1, $2, $3, $4)',
        [user.id, email, salt, Buffer.from(digest).toString('hex')]);
    } catch (error) {
      if (error.code === '23505') return fail(409, 'Email ini sudah memiliki akun. Silakan masuk.');
      throw error;
    }
    return json({ user }, 201, { 'Set-Cookie': await createSession(user, request) });
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJson(request);
    if (!body || typeof body !== 'object') return fail(400, 'Data akun tidak valid.');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const rows = await sql().query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || password.length > 128) return fail(401, 'Email atau kata sandi tidak cocok.');
    const digest = Buffer.from(await scrypt(password, user.salt, 64));
    const expected = Buffer.from(user.password_hash, 'hex');
    if (digest.length !== expected.length || !timingSafeEqual(digest, expected)) return fail(401, 'Email atau kata sandi tidak cocok.');
    return json({ user: safeUser(user) }, 200, { 'Set-Cookie': await createSession(user, request) });
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = cookieMap(request).swipe_session;
    if (token) await sql().query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
    const secure = new URL(request.url).protocol === 'https:' || process.env.VERCEL === '1';
    return json({ ok: true }, 200, { 'Set-Cookie': `swipe_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}` });
  }

  if (pathname === '/api/uploads' && method === 'PUT') {
    const user = await currentUser(request);
    return user ? uploadPage(request, user) : fail(401, 'Masuk ke akun untuk melanjutkan.');
  }
  if (pathname === '/api/public/menus' && method === 'GET') return fail(404, 'Menu tidak ditemukan.');
  const publicMatch = pathname.match(/^\/api\/public\/menus\/([a-z0-9-]+)$/);
  if (publicMatch && method === 'GET') {
    const rows = await sql().query('SELECT * FROM menus WHERE slug = $1', [publicMatch[1]]);
    return rows[0] ? json(menuDetail(rows[0])) : fail(404, 'Menu ini tidak ditemukan atau belum diterbitkan.');
  }

  if (pathname === '/api/menus' || pathname.startsWith('/api/menus/')) {
    const user = await currentUser(request);
    if (!user) return fail(401, 'Masuk ke akun untuk melanjutkan.');
    if (pathname === '/api/menus' && method === 'GET') {
      const rows = await sql().query('SELECT * FROM menus WHERE owner_id = $1 ORDER BY updated_at DESC', [user.id]);
      return json({ menus: rows.map(menuSummary) });
    }
    if (pathname === '/api/menus' && method === 'POST') return saveMenu(request, user);
    const menuMatch = pathname.match(/^\/api\/menus\/([a-f0-9-]{36})$/);
    if (menuMatch && method === 'GET') {
      const rows = await sql().query('SELECT * FROM menus WHERE id = $1 AND owner_id = $2', [menuMatch[1], user.id]);
      return rows[0] ? json(menuDetail(rows[0])) : fail(404, 'Menu tidak ditemukan di akun ini.');
    }
    if (menuMatch && method === 'DELETE') {
      const rows = await sql().query('SELECT * FROM menus WHERE id = $1 AND owner_id = $2', [menuMatch[1], user.id]);
      const row = rows[0];
      if (!row) return fail(404, 'Menu tidak ditemukan di akun ini.');
      await sql().query('DELETE FROM menus WHERE id = $1 AND owner_id = $2', [menuMatch[1], user.id]);
      await deleteBlobPages(parsePages(row));
      return json({ ok: true });
    }
    return fail(404, 'Rute API tidak ditemukan.');
  }
  return fail(404, 'Rute API tidak ditemukan.');
}

export default {
  async fetch(request) {
    try { return await handle(request); }
    catch (error) {
      console.error(error);
      return fail(error.status || 500, error.status ? error.message : 'Terjadi kesalahan di server.');
    }
  }
};
