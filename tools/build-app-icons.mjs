// Icônes d'installation de la PWA (BOOT-07), tirées de favicon.svg par le navigateur des parcours (tests/helpers/browser.mjs).
// Usage : node tools/build-app-icons.mjs — réécrit assets/icons/*.png. À relancer si favicon.svg change.
import { launchBrowser } from '../tests/helpers/browser.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(resolve(root, 'favicon.svg'), 'utf8');
const background = /<rect[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg)?.[1];
if (!background) throw new Error('favicon.svg : couleur de fond introuvable');
// Motif sans le cartouche arrondi, pour les icônes à fond plein.
const glyph = svg.replace(/<rect[^>]*\/>/, '');

// `plain` : l'icône telle quelle, coins transparents. `bleed` : fond plein jusqu'aux bords (le système rogne lui-même),
// motif réduit à `scale` pour rester dans la zone sûre (80 % du côté pour une icône masquable).
const ICONS = [
  { file: 'icon-192.png', size: 192, mode: 'plain' },
  { file: 'icon-512.png', size: 512, mode: 'plain' },
  { file: 'icon-maskable-512.png', size: 512, mode: 'bleed', scale: 0.72 },
  { file: 'apple-touch-icon-180.png', size: 180, mode: 'bleed', scale: 0.86 }
];

await mkdir(resolve(root, 'assets/icons'), { recursive: true });
const browser = await launchBrowser();
try {
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
    const inner = icon.mode === 'plain' ? icon.size : Math.round(icon.size * icon.scale);
    const picture = (icon.mode === 'plain' ? svg : glyph).replace(/width="64" height="64"/, `width="${inner}" height="${inner}"`);
    await page.setContent(`<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:${icon.mode === 'plain' ? 'transparent' : background}}
      body{display:flex;align-items:center;justify-content:center}svg{display:block}</style>${picture}`);
    await page.screenshot({ path: resolve(root, 'assets/icons', icon.file), omitBackground: icon.mode === 'plain' });
    await page.close();
    console.log(`${icon.file} : ${icon.size} px`);
  }
} finally { await browser.close(); }
