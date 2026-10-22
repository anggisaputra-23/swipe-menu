/* Audit screenshot mobile Swipe.menu.
 * Jalankan dari root proyek setelah memasang Playwright:
 *   npm i -D playwright
 *   npm run audit:layout
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const BASE_URL = process.env.SWIPE_URL || 'http://127.0.0.1:5500/';
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'artifacts', 'visual-audits', 'latest-audit');
const SIZES = [
  { name: 'portrait-360x800', width: 360, height: 800 },
  { name: 'portrait-390x844', width: 390, height: 844 },
  { name: 'portrait-430x932', width: 430, height: 932 },
  { name: 'landscape-667x375', width: 667, height: 375 },
  { name: 'landscape-844x390', width: 844, height: 390 }
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function waitForApp(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function capture(page, size, name) {
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${size.name}-${name}.png`),
    fullPage: false
  });
}

async function auditSize(browser, size) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${BASE_URL}#screen-setup`);
  await waitForApp(page);
  await capture(page, size, 'landing-hero');

  for (const id of ['cara-kerja', 'keunggulan', 'gaya-buku', 'faq']) {
    await page.goto(`${BASE_URL}#${id}`);
    await waitForApp(page);
    await capture(page, size, `landing-${id}`);
  }

  await page.goto(`${BASE_URL}#alat`);
  await waitForApp(page);
  await capture(page, size, 'builder-empty');
  await page.locator('#btn-contoh').click({ force: true });
  await page.waitForTimeout(1200);
  await capture(page, size, 'builder-filled');

  await page.evaluate(() => document.querySelector('#btn-lihat').click());
  await page.waitForTimeout(1600);
  await capture(page, size, 'book-cover');
  await page.evaluate(() => document.querySelector('#btn-berikut').click());
  await page.waitForTimeout(850);
  await capture(page, size, 'book-middle');
  await page.evaluate(() => {
    document.querySelector('#book-kendali').classList.remove('is-sembunyi');
    document.querySelector('#btn-drawer').click();
  });
  await page.waitForTimeout(400);
  await capture(page, size, 'book-drawer');

  const metrics = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('button, a, input, select, summary')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      consoleErrors: 0,
      undersizedControls: controls.filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width < 44 || r.height < 44;
      }).map((e) => e.id || e.className || e.tagName)
    };
  });
  await page.close();
  return { size: size.name, errors, metrics };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  try {
    const results = [];
    for (const size of SIZES) results.push(await auditSize(browser, size));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})();
