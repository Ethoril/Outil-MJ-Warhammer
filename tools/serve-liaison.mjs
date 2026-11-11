// Serveur local de la liaison Map Display (contrat v1 §2.1) : sert les deux dépôts sous une même origine, comme
// GitHub Pages, pour que BroadcastChannel relie les onglets. Usage : node tools/serve-liaison.mjs [--check] [port] [chemin rpg-map-display]
// Le dossier de la carte doit porter la liaison (js/app/mjLink.js) : sinon l'indicateur resterait « Carte déconnectée » sans erreur (MAP-01).
// `--check` fait ce contrôle et s'arrête, sans ouvrir de port.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter(arg => arg !== '--check');
const checkOnly = process.argv.includes('--check');
const port = Number(args[0]) || 8770;
const roots = {
  '/Outil-MJ-Warhammer/': resolve(fileURLToPath(new URL('..', import.meta.url))),
  '/rpg-map-display/': resolve(args[1] || 'E:/rpg-map-display')
};
const linkModule = join(roots['/rpg-map-display/'], 'js', 'app', 'mjLink.js');
if (!existsSync(linkModule)) {
  console.error(`Liaison impossible : ${linkModule} est absent. Ce dossier de RPG Map Display ne contient pas la liaison avec l'outil MJ (dossier trop ancien ou mauvais chemin). Mettez-le à jour ou passez le bon chemin en second argument.`);
  process.exit(1);
}
if (checkOnly) process.exit(0);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const prefix = Object.keys(roots).find(key => path.startsWith(key) || `${path}/` === key);
  if (!prefix) {
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    res.end(Object.keys(roots).map(key => `<p><a href="${key}">${key}</a></p>`).join(''));
    return;
  }
  if (`${path}/` === prefix) { res.writeHead(301, { location: prefix }); res.end(); return; }
  const root = roots[prefix];
  let file = normalize(join(root, path.slice(prefix.length)));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Introuvable');
  }
}).listen(port, '127.0.0.1', () => console.log(`Liaison : http://localhost:${port}/Outil-MJ-Warhammer/ et http://localhost:${port}/rpg-map-display/gm.html`));
