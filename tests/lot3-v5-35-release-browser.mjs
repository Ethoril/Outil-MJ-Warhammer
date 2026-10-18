/** Verify the exported application, including a real SW/offline/native IDB reload. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, realpathSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { APP_VERSION } from '../js/version.js';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const pointer = JSON.parse(readFileSync(resolve(root, 'tmp/lot3/release-path.json')));
const site = realpathSync(pointer.directory);
assert.ok(site.startsWith(resolve(root, 'tmp/lot3/release') + sep));
const manifest = JSON.parse(readFileSync(resolve(site, 'release-manifest.json')));
assert.equal(manifest.appVersion, APP_VERSION);
for (const asset of manifest.files) {
  const file = realpathSync(resolve(site, asset.file));
  assert.ok(file.startsWith(site + sep));
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), asset.sha256, asset.file);
}
const base = '/Outil-MJ-Warhammer/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(path.startsWith(base));
    const file = realpathSync(resolve(site, path.slice(base.length) || 'index.html'));
    assert.ok(file.startsWith(site + sep) && statSync(file).isFile());
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Unavailable'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'allow' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.goto(origin + base);
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(async () => {
      const { Store } = await import('./js/main.js'); await Store.ready;
      const actor={id:'release-mage',name:'Mage de recette',kind:'PJ',camp:'pj',zone:'active',init:50,hp:30,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:60,FM:50,Soc:40,M:4},skills:[{name:'Focalisation',total:60},{name:'Langue (Magick)',total:60},{name:'Savoir (Magie)',total:60}],armor:{head:0,body:0,arms:0,legs:0},states:[],talents:[{id:'talent-instinctive-diction',status:'resolved',rank:1}],extensions:{v5:{}}};
      await Store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:actor.id,order:[actor.id],participants:[actor]},diceLines:[],log:[],extensions:{v5:{turnIndex:1}}});
      await Store.addProfile({ id: 'release-qa', name: 'Paquet local', kind: 'PJ', hp: 14, maxHp: 14 });
      await Store.setFortune(actor.id,2);await Store.applyChannelling(Store.previewChannelling({actorId:actor.id,roll:25}),{actorId:actor.id});
      await Store.deployCadaiRune({actorId:actor.id,roll:25,conditionsConfirmed:true});
      await Store.applySpellEffects(actor.id,{id:'release-buff',spellId:'release-buff',spellName:'Effet de recette',duration:'10 minutes',cn:8,casterId:actor.id,castExecutionId:'release-group',statModifiers:{FM:20},ward:7});await Store.whenIdle();
    });
    await context.setOffline(true); await page.reload();
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
    const proof = await page.evaluate(async () => {
      const [{ Store }, { APP_VERSION }] = await Promise.all([import('./js/main.js'), import('./js/version.js')]); await Store.ready;
      const actor=Store.listParticipants().find(p=>p.id==='release-mage');return {magic:{reserve:actor.extensions.v5.channelling.sl,runes:Store.getCadaiRunes(actor.id).deployed,fortune:Store.getFortune(actor.id).balance,FM:actor.caracs.FM,ward:actor.extensions.v5.ward,effects:actor.extensions.v5.spellEffects.length,preview:Store.previewChannelling({actorId:actor.id,type:'high',roll:25}).gain}, version: APP_VERSION, hp: Store.getProfile('release-qa')?.hp, caches: await caches.keys(), overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.equal(proof.version, APP_VERSION); assert.equal(proof.hp, 14);
    assert.ok(proof.caches.includes(`wfrp-cache-v${APP_VERSION}`)); assert.equal(proof.overflow, false); assert.deepEqual(errors, []);
    assert.deepEqual(proof.magic,{reserve:9,runes:1,fortune:2,FM:70,ward:7,effects:1,preview:12});
    await page.evaluate(async()=>{const {Store}=await import('./js/main.js');await Store.expireSpellEffects('release-mage',{effectId:'release-buff'});await Store.whenIdle();});
    assert.equal(await page.evaluate(async()=>{const {Store}=await import('./js/main.js');return Store.listParticipants()[0].caracs.FM;}),50);
    await page.evaluate(async()=>{const {Store}=await import('./js/main.js');await Store.undo();await Store.whenIdle();});
    assert.equal(await page.evaluate(async()=>{const {Store}=await import('./js/main.js');return Store.listParticipants()[0].caracs.FM;}),70);
    checks.push({ width,magic:proof.magic,expiryAndUndo:true, version: proof.version, offline: true, profilePreserved: true, overflow: false });
    await context.close();
  }
  writeFileSync(resolve(root, 'tmp/lot3/release-browser-receipt.json'), JSON.stringify({ appVersion: APP_VERSION, assets: manifest.files.length, checks }, null, 2));
  console.log(`PASS — exported ${APP_VERSION}, ${manifest.files.length} hashes, desktop/mobile startup, real offline PWA and native IDB`);
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
