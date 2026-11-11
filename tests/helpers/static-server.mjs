/** Outillage commun des parcours navigateur (tests/*.mjs) : serveur statique du dépôt, table MIME et blocage du réseau externe.
 * Seul endroit à modifier quand l'amorçage change (nouveau type de fichier, en-tête, règle de blocage).
 *
 *   const server = createStaticServer({ root });                      // http.Server, pas encore à l'écoute
 *   await new Promise(done => server.listen(0, '127.0.0.1', done));
 *   await blockExternalNetwork(context, server);                      // seul le serveur local répond
 *
 *   const { server, origin, port, close } = await startStaticServer(); // variante déjà à l'écoute sur un port libre
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

/** Sert les fichiers de `root` sous le préfixe `base` ; « / » et tout dossier renvoient leur index.html.
 * - `pages` : réponses hors fichiers, par chemin exact ({ '/blank': '<main></main>' }). Valeur : texte ou Buffer (servi en HTML),
 *   { type, body, status, headers }, ou fonction (req, url) qui renvoie l'un des deux à chaque requête.
 * - `headers` : en-têtes ajoutés à chaque fichier servi (par exemple { 'Cache-Control': 'no-store' }). */
export function createStaticServer({ root = REPO_ROOT, base = '/', pages = {}, headers = {} } = {}) {
  const directory = resolve(root);
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return avoidUnsafePorts(createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (Object.hasOwn(pages, pathname)) {
        let page = pages[pathname];
        if (typeof page === 'function') page = await page(req, url);
        if (typeof page === 'string' || Buffer.isBuffer(page)) page = { body: page };
        res.writeHead(page.status || 200, { 'Content-Type': page.type || MIME['.html'], ...page.headers });
        res.end(page.body ?? '');
        return;
      }
      if (!pathname.startsWith(prefix)) throw new Error('hors du préfixe servi');
      let file = resolve(directory, pathname.slice(prefix.length) || 'index.html');
      if (!file.startsWith(directory + sep)) throw new Error('hors du dossier servi');
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', ...headers });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': MIME['.txt'] });
      res.end('Not found');
    }
  }));
}

/** Ports que Chromium refuse d'ouvrir (net::ERR_UNSAFE_PORT). Sous Windows la plage dynamique peut commencer à 1024 :
 * un listen(0) tombe alors parfois sur 1719, 1720, 6000, 6665-6669, 10080… et le parcours échoue sans raison. */
export const UNSAFE_PORTS = new Set([1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]);

// server.listen(0, …) recommence tant que le port attribué est refusé par Chromium ; le rappel n'est appelé qu'une fois, sur un port sûr.
function avoidUnsafePorts(server) {
  const listen = server.listen.bind(server);
  server.listen = (...args) => {
    if (args[0] !== 0) return listen(...args);
    const callback = typeof args.at(-1) === 'function' ? args.pop() : null;
    let attempts = 0;
    const attempt = () => listen(...args, () => {
      if (UNSAFE_PORTS.has(server.address().port) && ++attempts < 50) server.close(attempt);
      else callback?.();
    });
    attempt();
    return server;
  };
  return server;
}

/** createStaticServer déjà à l'écoute sur 127.0.0.1 (port libre par défaut). `baseUrl` = origin + base, sans barre finale. */
export async function startStaticServer({ port = 0, ...options } = {}) {
  const server = createStaticServer(options);
  await new Promise((done, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = (options.base || '/').replace(/\/$/, '');
  return { server, port: server.address().port, origin, baseUrl: origin + base, close: () => new Promise(done => server.close(done)) };
}

/** Coupe tout le réseau sauf le serveur local : `target` est une page ou un contexte Playwright ; `allowed` le serveur,
 * son port, son origine (ou une URL qui en dérive), ou une fonction qui renvoie l'un des trois (lue à chaque requête).
 * Les routes posées après celle-ci (bouchons de modules, etc.) gardent la priorité, comme avec page.route. */
export function blockExternalNetwork(target, allowed) {
  const originOf = value => {
    if (typeof value === 'function') return originOf(value());
    if (typeof value === 'number') return `http://127.0.0.1:${value}`;
    if (typeof value === 'string') return new URL(value).origin;
    if (value && typeof value.address === 'function') return `http://127.0.0.1:${value.address().port}`;
    throw new Error('blockExternalNetwork : serveur, port ou origine attendu');
  };
  if (typeof allowed !== 'function' && !(allowed && typeof allowed.address === 'function')) originOf(allowed);
  return target.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!/^https?:$/.test(url.protocol) || url.origin === originOf(allowed)) return route.continue();
    return route.abort();
  });
}
