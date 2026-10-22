import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = fs.readFileSync(path.join(PROJECT_ROOT, 'css', 'style.css'), 'utf8');
const required = [
  '--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6',
  '--ruang-tepi-mobile', '--sentuh', '--kendali-ruang'
];
const missing = required.filter((token) => !css.includes(token));
const hasMobileDvh = /@media\s*\([^)]*max-width[^)]*\)[\s\S]*--ruang-tepi-mobile/.test(css)
  && css.includes('100dvh');
const hasSafeArea = ['top', 'right', 'bottom', 'left']
  .every((side) => css.includes(`safe-area-inset-${side}`));

if (missing.length || !hasMobileDvh || !hasSafeArea) {
  if (missing.length) console.error(`Token hilang: ${missing.join(', ')}`);
  if (!hasMobileDvh) console.error('Token mobile/dvh tidak ditemukan.');
  if (!hasSafeArea) console.error('Safe-area empat sisi tidak lengkap.');
  process.exit(1);
}

console.log('TOKEN_OK');
