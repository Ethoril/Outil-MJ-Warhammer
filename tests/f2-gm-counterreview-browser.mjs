import { openU1Types } from './helpers/u1-drawer.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = '/Outil-MJ-Warhammer/';
const server = createStaticServer({ root, base, headers: { 'Cache-Control': 'no-store' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
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
  await openU1Types(workspace);await workspace.getByLabel('Type d’action').selectOption('attack');
  assert.equal(await workspace.getByLabel('Morphologie de la cible (choix du MJ)').count(), 1);
  assert.deepEqual(errors, [], `la résolution réelle doit s’ouvrir sans ReferenceError: ${errors.join('; ')}`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
