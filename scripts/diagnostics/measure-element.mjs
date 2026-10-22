// Probe detail:urai tinggi tiap anak di dalam satu elemen.
// Pakai dari root: npm run measure:element -- [selector] [lebar] [tinggi]
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SEL = process.argv[2] || '.kartu[data-kartu="1"]';
const W = +(process.argv[3] || 390);
const H = +(process.argv[4] || 844);

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const url = pathToFileURL(path.join(PROJECT_ROOT, 'index.html')).href;
const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: 'light' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(700);

const hasil = await page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return { error: 'tidak ada: ' + sel };
  const cs = getComputedStyle(root);
  const baris = [];
  const fmt = (el, kedalaman) => {
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    baris.push({
      d: kedalaman,
      el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      h: Math.round(r.height),
      w: Math.round(r.width),
      pad: c.padding,
      mar: c.margin,
      fs: c.fontSize,
      lh: c.lineHeight,
      minH: c.minHeight,
      gap: c.gap,
      cols: c.gridTemplateColumns,
      rows: c.gridTemplateRows,
      text: (el.children.length === 0 ? el.textContent.trim().slice(0, 46) : ''),
    });
    Array.from(el.children).forEach((c2) => fmt(c2, kedalaman + 1));
  };
  fmt(root, 0);
  return { root: { h: Math.round(root.getBoundingClientRect().height), pad: cs.padding, radius: cs.borderRadius, display: cs.display, cols: cs.gridTemplateColumns, rows: cs.gridTemplateRows, gap: cs.gap }, baris };
}, SEL);

console.log(JSON.stringify(hasil, null, 1));
await browser.close();
