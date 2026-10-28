import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = '/Outil-MJ-Warhammer/';
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml' };
const server = createServer((req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await chromium.launch({ headless:true, executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}${base}`;
  await page.goto(origin, { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout:20000 });
  const actor = { id:'gm-ui-actor', name:'Cavalier test', kind:'PJ', camp:'pj', zone:'active', hp:20, maxHp:20,
    caracs:{ CC:60, Ag:40, F:30, E:30, BE:3 }, skills:[], talents:[], states:[], armor:{head:0,body:0,arms:0,legs:0},
    actions:[{ id:'gm-ui-attack', note:'Attaque test', type:'attack', attr:'CC', base:60, damage:4, qualities:[], extensions:{} }], extensions:{v5:{}} };
  const target = { ...actor, id:'gm-ui-target', name:'Cible test', camp:'ennemi', actions:[], extensions:{v5:{hitMorphology:'spider'}} };
  await page.evaluate(async state => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.ready;
    await Store.loadFromJSON(state);
  }, { schemaVersion:3, reserve:[], diceLines:[], log:[], combat:{round:1,currentActorId:actor.id,order:[actor.id,target.id],participants:[actor,target]} });
  await page.locator('#tab-combat').click();
  await page.locator('[data-action-key="gm-ui-attack"]').click();
  const workspace = page.locator('#workspace-root');
  await workspace.getByLabel('Type d’action').selectOption('attack');
  assert.equal(await workspace.getByLabel('Morphologie de la cible (choix du MJ)').count(), 1);
  assert.deepEqual(errors, [], `la résolution réelle doit s’ouvrir sans ReferenceError: ${errors.join('; ')}`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
