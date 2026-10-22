// Ukur tinggi bagian landing page di beberapa viewport HP + screenshot.
// Pakai dari root: npm run measure:landing -- [folder-output]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const targetArg = process.argv[2] || 'artifacts/visual-audits/latest-measurement';
const TARGET = path.isAbsolute(targetArg) ? targetArg : path.resolve(PROJECT_ROOT, targetArg);
const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 360, h: 800 },
  { w: 430, h: 932 },
];

const SECTIONS = [
  { nama: 'Navbar', sel: '.situs-header' },
  { nama: 'Hero', sel: '.hero' },
  { nama: 'Cara kerja', sel: '#cara-kerja' },
  { nama: 'Keunggulan', sel: '#keunggulan' },
  { nama: 'Alat penyusun', sel: '#alat' },
  { nama: '  Gaya buku (di alat)', sel: '#gaya-buku' },
  { nama: '  Kartu alat (01+02)', sel: '.kartu-grid' },
  { nama: '  Aksi bawah', sel: '.aksi-bawah' },
  { nama: 'FAQ', sel: '#faq' },
  { nama: 'CTA', sel: '.landing-cta' },
  { nama: 'Footer', sel: '.kaki' },
];

const CARDS = [
  { nama: 'Cara kerja — kartu 1', sel: '.langkah-card' },
  { nama: 'Keunggulan — baris 1', sel: '.keunggulan-grid li' },
  { nama: 'Gaya buku — kartu contoh 1', sel: '.contoh-item' },
  { nama: 'Alat — kartu 01 Ukuran', sel: '.kartu[data-kartu="1"]' },
  { nama: 'Alat — kartu 02 Halaman', sel: '.kartu[data-kartu="2"]' },
  { nama: 'Alat — dropzone', sel: '#dropzone' },
  { nama: 'Alat — info rasio', sel: '.info-box' },
  { nama: 'FAQ — baris accordion', sel: '.faq-item summary' },
];

const SHOTS = [
  { nama: 'navbar', sel: '.situs-header' },
  { nama: 'hero', sel: '.hero' },
  { nama: 'cara-section', sel: '#cara-kerja' },
  { nama: 'keunggulan-section', sel: '#keunggulan' },
  { nama: 'gaya-section', sel: '#gaya-buku' },
  { nama: 'kartu-alat', sel: '.kartu-grid' },
  { nama: 'alat-section', sel: '#alat' },
  { nama: 'faq-section', sel: '#faq' },
  { nama: 'cta-footer', sel: '.landing-cta' },
];

const url = pathToFileURL(path.join(PROJECT_ROOT, 'index.html')).href;
const browser = await chromium.launch({ channel: 'chromium' });
const laporan = { target: TARGET, viewport: [], catatan: {} };

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const data = await page.evaluate(
    ({ SECTIONS, CARDS }) => {
      const tinggi = (el) => (el ? Math.round(el.getBoundingClientRect().height) : null);
      const pick = (sel) => document.querySelector(sel);
      const all = (sel) => Array.from(document.querySelectorAll(sel));
      const section = SECTIONS.map((s) => ({ nama: s.nama, px: tinggi(pick(s.sel)) }));
      const kartu = CARDS.map((c) => ({ nama: c.nama, px: tinggi(pick(c.sel)) }));

      const total = document.documentElement.scrollHeight;
      const vh = window.innerHeight;
      const layar = +(total / vh).toFixed(2);

      // overflow horizontal
      const lebarDoc = document.documentElement.scrollWidth;
      const adaOverflowX = lebarDoc > window.innerWidth + 1;

      // target sentuh < 44x44 (yang terlihat)
      const sentuhKecil = [];
      all('a, button, summary, [role="button"], select, input[type="file"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 44 || r.width < 44) {
          sentuhKecil.push({
            tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      });

      // font kecil pada teks isi (p, li, h3-h4)
      const fontKecil = new Map();
      all('p, li, h3, h4, summary, label, .kecil, .label-mono').forEach((el) => {
        if (!el.textContent.trim()) return;
        const r = el.getBoundingClientRect();
        if (r.height === 0) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 13) {
          const k = (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase());
          fontKecil.set(k, Math.min(fontKecil.get(k) ?? 99, fs));
        }
      });

      // padding/gap yang berlaku untuk kartu utama
      const gayaKartu = {};
      [['.langkah-card', 'cara'], ['.keunggulan-grid li', 'keunggulan'], ['.contoh-item', 'gaya'], ['.kartu', 'kartu alat'], ['.faq-item summary', 'faq']].forEach(([sel, nama]) => {
        const el = pick(sel);
        if (!el) return;
        const cs = getComputedStyle(el);
        const judul = el.querySelector('h3, h4, strong, span');
        const desc = el.querySelector('p, span:not(.langkah-card__no)');
        gayaKartu[nama] = {
          padding: cs.padding,
          radius: cs.borderRadius,
          minHeight: cs.minHeight,
          gap: cs.gap,
          judulPx: judul ? parseFloat(getComputedStyle(judul).fontSize) : null,
          descPx: desc ? parseFloat(getComputedStyle(desc).fontSize) : null,
        };
      });

      return { section, kartu, total, vh, layar, adaOverflowX, lebarDoc, sentuhKecil, fontKecil: Object.fromEntries(fontKecil), gayaKartu };
    },
    { SECTIONS, CARDS }
  );

  // screenshot per bagian
  const dir = path.join(TARGET, `${vp.w}x${vp.h}`);
  fs.mkdirSync(dir, { recursive: true });
  for (const s of SHOTS) {
    const el = page.locator(s.sel).first();
    try {
      if (await el.count()) await el.screenshot({ path: path.join(dir, `${s.nama}.png`) });
    } catch (e) {
      await page.screenshot({ path: path.join(dir, `${s.nama}.png`), fullPage: false });
    }
  }
  await page.screenshot({ path: path.join(dir, 'landing-full.png'), fullPage: true });

  // kontras: ukur pasangan warna teks di mode terang & gelap
  const kontras = await page.evaluate(() => {
    const toRGB = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +(((x + 0.05) / (y + 0.05))).toFixed(2); };
    const bgDari = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return toRGB(bg);
        n = n.parentElement;
      }
      return toRGB(getComputedStyle(document.body).backgroundColor);
    };
    const uji = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { sel, rasio: ratio(toRGB(cs.color), bgDari(el)), warna: cs.color };
    };
    return {
      tema: document.documentElement.getAttribute('data-tema'),
      pasangan: ['.langkah-card p', '.keunggulan-grid span', '.contoh-item h4', '.kartu p', '.faq-item summary', '.kecil', '.info-box p'].map(uji).filter(Boolean),
    };
  });

  laporan.viewport.push({ ...data, kontras });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(TARGET, 'report.json'), JSON.stringify(laporan, null, 2));

// ringkasan tabel
for (const v of laporan.viewport) {
  console.log(`\n=== ${v.lebarDoc}x${v.vh} — total ${v.total}px = ${v.layar} layar, overflowX=${v.adaOverflowX}`);
}
console.log(JSON.stringify(laporan.viewport.map(v => ({ vh: v.vh, total: v.total, layar: v.layar, section: v.section, kartu: v.kartu })), null, 2));
console.log('fontKecil(390):', JSON.stringify(laporan.viewport[0].fontKecil));
console.log('sentuhKecil(390):', JSON.stringify(laporan.viewport[0].sentuhKecil.slice(0, 20)));
console.log('gayaKartu(390):', JSON.stringify(laporan.viewport[0].gayaKartu, null, 2));
console.log('kontras:', JSON.stringify(laporan.viewport[0].kontras, null, 2));
