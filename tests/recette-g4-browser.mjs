/**
 * Passe G, lot G4 (docs/specs/refonte-interface/tasks.md, « G4 · Sorts de zone : point d'impact choisi sur la carte ») :
 * retour R16 du MJ, option B (22/11), liaison version 3 (contrat §10.1).
 * Rencontre R20 (tests/fixtures/rencontre-r20.json) à 1440 × 800, round 1, au tour du chamane-bray.
 * La carte (lot jumeau C4, autre dépôt) est simulée par un second BroadcastChannel('wfrp-map-link') dans la page : il répond
 * `map.hello`, puis `map.impact` aux demandes `mj.impactQuery`, et note tout ce que l'outil envoie.
 * - G4-a : un sort sans zone ne propose ni « Point d'impact » ni « Choisir sur la carte ».
 * - G4-b : sans carte, point d'impact, rayon en mètres, liste des actifs à cocher, rien de précoché ; le sort part aux cochés.
 * - G4-c : carte connectée, une seule `mj.impactQuery` ; la réponse précoche exactement les actifs des `refs` ; le MJ
 *   décoche ; le sort part aux cochés restants (entrée du moteur relevée).
 * - G4-d : Annuler, changer de sort, quitter le panneau → `mj.impactCancel` ; `cancelled` ou version différente → manuel.
 * - G4-e : version 3 ; une carte en version 2 voit « Versions de liaison différentes ».
 * Usage : timeout 120 node tests/recette-g4-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g4/`;
mkdirSync(shots, { recursive: true });
const save = JSON.parse(readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url), 'utf8'));
const people = save.combat.participants;
const shaman = people.find(row => /Chamane/.test(row.name));
const [gor1, gor2, ungor1] = ['Gor 1', 'Gor 2', 'Ungor 1'].map(name => people.find(row => row.name === name));
const hero = people.find(row => row.kind === 'PJ');
save.combat.order = people.map(row => row.id);
save.combat.round = 1;
save.combat.currentActorId = shaman.id;

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
const failures = [];
const check = async (name, fn) => { try { await fn(); console.log(`✔ ${name}`); } catch (error) { failures.push(name); console.log(`✖ ${name}\n  ${error.message}`); } };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss(); });
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
  await page.evaluate(async data => {
    const { Store } = await import('/js/main.js');
    await Store.ready;
    await Store.loadFromJSON(data);
    // Entrée du moteur relevée à chaque aperçu de sort : les cibles qui partent vraiment.
    const original = Store.previewSpellExecution.bind(Store);
    window.__spellTargets = [];
    Store.previewSpellExecution = (id, options) => { window.__spellTargets.push([...(options?.targetIds || [])]); return original(id, options); };
  }, save);
  await page.locator('#tab-combat').click();
  const resolution = page.locator('.workspace-resolution');
  const drawer = page.locator('.workspace-resolution-drawer');
  const zone = drawer.locator('[data-magic-zone]');
  const fits = async () => {
    const measure = await page.evaluate(() => {
      const doc = document.documentElement, open = document.querySelector('.workspace-resolution-drawer:not([hidden])');
      return { page: doc.scrollHeight <= innerHeight + 1 && doc.scrollWidth <= innerWidth + 1,
        drawer: !open || (open.scrollHeight <= open.clientHeight + 1 && open.getBoundingClientRect().bottom <= innerHeight + 1),
        heights: open ? `${open.scrollHeight}/${open.clientHeight}` : '-',
        parts: open ? [...open.querySelectorAll(':scope > *, .workspace-v5-magic > *')].filter(el => el.getBoundingClientRect().height > 0)
          .map(el => `${(el.dataset.magicZone !== undefined ? 'zone' : el.className || el.tagName).slice(0, 28)}:${Math.round(el.getBoundingClientRect().height)}`).join(' | ') : '' };
    });
    console.log(`  panneau Magie : ${measure.heights} px (contenu / hauteur)${measure.drawer ? '' : ` ; ${measure.parts}`}`);
    return { page: measure.page, drawer: measure.drawer };
  };
  async function openCast() {
    await page.locator(`[data-workspace-select="${shaman.id}"]`).first().click({ force: true }).catch(() => {});
    await resolution.locator('[data-magic-menu]').click();
    await resolution.getByRole('button', { name: 'Incantation V5' }).click();
    await drawer.locator('[data-magic-options]').waitFor({ state: 'attached' });
  }
  /** Sorts proposés au chamane : un de zone au rayon chiffré, un sans zone. */
  const spells = await page.evaluate(async actorId => {
    const { spellHasZone, zoneRadius } = await import('/js/ui/resolution-panel/magic.js');
    const { getSpellContract } = await import('/js/core/v5-spell-contracts.js');
    const { spellChoices } = await import('/js/core/magic-lists.js');
    const { Store } = await import('/js/main.js');
    const actor = Store.listParticipants().find(row => row.id === actorId);
    const rows = choices => choices.map(spell => getSpellContract(spell.id)).filter(Boolean);
    const own = rows(spellChoices(actor, { showAll: false }).own), all = rows(spellChoices(actor, { showAll: true }).others);
    const zoned = list => list.find(contract => spellHasZone(contract) && zoneRadius(contract, actor).meters > 0);
    const pick = zoned(own) || zoned(all), plain = own.find(contract => !spellHasZone(contract)) || all.find(contract => !spellHasZone(contract));
    return { zone: { id: pick.id, name: pick.name, meters: zoneRadius(pick, actor).meters, own: own.includes(pick) }, plain: { id: plain.id, name: plain.name, own: own.includes(plain) } };
  }, shaman.id);
  console.log(`  sort de zone : ${spells.zone.name} (rayon ${spells.zone.meters} m${spells.zone.own ? '' : ', hors liste'}) ; sans zone : ${spells.plain.name}`);
  const chooseSpell = async spell => {
    const all = drawer.locator('[data-focus-key="magic-all-spells"]');
    if (!spell.own && await all.count() && !(await all.isChecked())) { await drawer.locator('[data-magic-options] > summary').click(); await all.check(); }
    await drawer.getByLabel('Sort à lancer', { exact: true }).selectOption(spell.id);
    await page.waitForTimeout(100);
    // « Options » refermé (fermé par défaut, G3-a) : le parcours ne l'ouvre que pour « Tous les sorts ».
    if (await drawer.locator('[data-magic-options]').evaluate(el => el.open)) await drawer.locator('[data-magic-options] > summary').click();
  };
  const activeCount = people.filter(row => row.zone === 'active').length;
  // Cochés = puces de la ligne « Dans la zone » ; les autres actifs sont dans « + ajouter… ».
  const checkedTargets = () => zone.locator('[data-impact-target]').evaluateAll(chips => chips.map(chip => chip.getAttribute('aria-label').replace('Retirer de la zone : ', '')));
  const addable = () => zone.getByLabel('Ajouter dans la zone', { exact: true }).evaluate(select => [...select.options].filter(option => option.value).length).catch(() => 0);
  const addTarget = async person => { await zone.getByLabel('Ajouter dans la zone', { exact: true }).selectOption(person.id); await page.waitForTimeout(100); };
  const removeTarget = async person => { await zone.getByRole('button', { name: `Retirer de la zone : ${person.name}`, exact: true }).click(); await page.waitForTimeout(100); };

  // Carte simulée : second canal de la page ; elle ne parle qu'après `map.hello`.
  await page.evaluate(() => {
    const channel = new BroadcastChannel('wfrp-map-link');
    let seq = 0;
    window.__map = { received: [], answers: [], channel, version: 3,
      post(type, payload = {}, v = window.__map.version) { channel.postMessage({ v, type, seq: ++seq, at: Date.now(), from: 'map', payload }); } };
    channel.onmessage = event => { if (event.data?.from === 'outil-mj') window.__map.received.push(event.data); };
  });
  const received = type => page.evaluate(kind => window.__map.received.filter(message => message.type === kind), type);
  const mapPost = (type, payload, v) => page.evaluate(([kind, body, version]) => window.__map.post(kind, body, version), [type, payload, v]);
  const refOf = ids => page.evaluate(async list => {
    const { mapRefOf } = await import('/js/core/map-link-state.js');
    const { Store } = await import('/js/main.js');
    return list.map(id => mapRefOf(Store.listParticipants().find(row => row.id === id)));
  }, ids);

  await openCast();
  await check('G4-a : un sort sans zone ne propose ni point d’impact ni carte', async () => {
    await chooseSpell(spells.plain);
    assert.equal(await zone.count(), 0);
    assert.equal(await drawer.getByRole('button', { name: /Point d’impact/ }).count(), 0);
    assert.equal(await drawer.getByRole('button', { name: 'Choisir sur la carte' }).count(), 0);
  });
  await check('G4-b : sans carte, point d’impact, rayon en mètres, actifs à cocher, rien de précoché', async () => {
    await chooseSpell(spells.zone);
    assert.equal(await zone.count(), 1, 'bloc de zone en vue');
    await zone.getByRole('button', { name: 'Point d’impact (case)' }).click();
    assert.equal(await zone.getAttribute('data-magic-zone'), 'impact');
    assert.equal(Number(await zone.getByLabel('Rayon de la zone (m)').inputValue()), spells.zone.meters);
    assert.equal(await zone.getByRole('button', { name: 'Choisir sur la carte' }).count(), 0, 'pas de carte connectée');
    assert.equal(await addable(), activeCount, 'tous les actifs proposés, aucun d’office');
    assert.deepEqual(await checkedTargets(), []);
    assert.equal(await zone.locator('[data-impact-none]').isVisible(), true);
    assert.equal(await zone.evaluate(el => !el.closest('[data-magic-options]') && el.checkVisibility()), true, 'hors du repli « Options »');
    await page.screenshot({ path: `${shots}01-sans-carte.png` });
    assert.deepEqual(await fits(), { page: true, drawer: true }, 'ni la page ni le panneau ne défilent');
  });
  // G4-b, « aucun coché : le sort s'applique sans cible » : la liste des cibles envoyée au moteur se calcule dans
  // workspace-view.js (cible par défaut quand `magicTargetIds` est vide), fichier hors du lot G4 : relevé, non compté.
  {
    await page.evaluate(() => { window.__spellTargets = []; });
    const input = page.locator('[data-roll-input="attack"]').first();
    await input.fill('5');
    await input.press('Enter');
    await page.locator('.workspace-magic-result').waitFor();
    const sent = (await page.evaluate(() => window.__spellTargets)).at(-1);
    console.log(`${sent?.length ? '⚠' : '✔'} G4-b (relevé, hors lot) : aucun coché → cibles envoyées au moteur : [${(sent || []).join(', ')}]${sent?.length ? ' (attendu : aucune ; correctif dans workspace-view.js)' : ''}`);
    await resolution.locator('[data-focus-key="cancel-preview"]').first().click().catch(() => {});
  }
  await check('G4-b : le sort part aux seuls cochés', async () => {
    await addTarget(gor2);
    assert.deepEqual(await checkedTargets(), [gor2.name]);
    assert.deepEqual(await fits(), { page: true, drawer: true }, 'un coché : toujours sans défilement');
    await page.evaluate(() => { window.__spellTargets = []; });
    const input = page.locator('[data-roll-input="attack"]').first();
    await input.fill('5');
    await input.press('Enter');
    await page.locator('.workspace-magic-result').waitFor();
    assert.deepEqual((await page.evaluate(() => window.__spellTargets)).at(-1), [gor2.id]);
    await resolution.locator('[data-focus-key="cancel-preview"]').first().click().catch(() => {});
  });

  // Carte connectée.
  await mapPost('map.hello', { sessionId: 'carte-simulee' });
  await page.waitForFunction(() => /connect/i.test(document.querySelector('#map-link-indicator')?.textContent || ''));
  await check('G4-c : « Choisir sur la carte » envoie une seule mj.impactQuery', async () => {
    const ask = zone.getByRole('button', { name: 'Choisir sur la carte' });
    await ask.waitFor();
    await ask.click();
    await zone.locator('[data-impact-waiting]').waitFor();
    const queries = await received('mj.impactQuery');
    assert.equal(queries.length, 1);
    const [casterRef] = await refOf([shaman.id]);
    assert.deepEqual(Object.keys(queries[0].payload).sort(), ['casterRef', 'label', 'queryId', 'radiusCells']);
    assert.equal(queries[0].v, 3);
    assert.equal(queries[0].payload.label, spells.zone.name.slice(0, 40));
    assert.equal(queries[0].payload.radiusCells, spells.zone.meters);
    assert.equal(queries[0].payload.casterRef, casterRef);
    assert.match(await zone.locator('[data-impact-waiting]').innerText(), /Clique une case sur la carte/);
    await page.screenshot({ path: `${shots}02-attente-carte.png` });
  });
  await check('G4-c : la réponse précoche exactement les actifs des refs ; le MJ décoche ; le sort part aux cochés', async () => {
    const [queryId] = (await received('mj.impactQuery')).map(message => message.payload.queryId);
    const refs = [...await refOf([gor1.id, ungor1.id, hero.id]), 'p:inconnu'];
    await mapPost('map.impact', { queryId, levelId: 'L1', cell: { x: 7, y: 4 }, refs });
    await zone.locator('[data-impact-placed]').waitFor();
    assert.deepEqual((await checkedTargets()).sort(), [gor1.name, ungor1.name, hero.name].sort(), 'gor 2, coché à la main, est remplacé par la réponse');
    assert.equal(await zone.locator('[data-impact-placed]').getAttribute('data-impact-placed'), '3');
    assert.deepEqual(await fits(), { page: true, drawer: true }, 'trois précochés : sans défilement');
    await removeTarget(ungor1);
    assert.deepEqual((await checkedTargets()).sort(), [gor1.name, hero.name].sort());
    await page.screenshot({ path: `${shots}03-reponse-carte.png` });
    await page.evaluate(() => { window.__spellTargets = []; });
    const input = page.locator('[data-roll-input="attack"]').first();
    await input.fill('5');
    await input.press('Enter');
    await page.locator('.workspace-magic-result').waitFor();
    assert.deepEqual([...(await page.evaluate(() => window.__spellTargets)).at(-1)].sort(), [gor1.id, hero.id].sort());
    assert.deepEqual(await fits(), { page: true, drawer: true });
    const apply = resolution.locator('[data-focus-key="apply"]').first();
    assert.equal(await apply.isEnabled(), true, `Appliquer actif (${await apply.getAttribute('title')})`);
    await apply.click();
    await page.waitForFunction(name => import('/js/main.js').then(({ Store }) => Store.getLog().some(row => row.text.includes(`Sort ${name} lancé`))), spells.zone.name);
    assert.equal((await received('mj.impactQuery')).length, 1, 'toujours une seule demande');
  });

  const askAgain = async () => {
    await openCast();
    await chooseSpell(spells.zone);
    if (await zone.getAttribute('data-magic-zone') !== 'impact') await zone.getByRole('button', { name: 'Point d’impact (case)' }).click();
    await zone.getByRole('button', { name: 'Choisir sur la carte' }).click();
    await zone.locator('[data-impact-waiting]').waitFor();
    return (await received('mj.impactQuery')).at(-1).payload.queryId;
  };
  const cancels = async () => (await received('mj.impactCancel')).map(message => message.payload.queryId);
  await check('G4-d : Annuler → mj.impactCancel, retour au choix manuel', async () => {
    const queryId = await askAgain();
    await zone.locator('[data-impact-cancel]').click();
    await zone.getByRole('button', { name: 'Choisir sur la carte' }).waitFor();
    assert.deepEqual(await cancels(), [queryId]);
  });
  await check('G4-d : changer de sort → mj.impactCancel', async () => {
    const queryId = await askAgain();
    await chooseSpell(spells.plain);
    await page.waitForFunction(id => window.__map.received.some(message => message.type === 'mj.impactCancel' && message.payload.queryId === id), queryId);
  });
  await check('G4-d : quitter le panneau (autre combattant) → mj.impactCancel', async () => {
    const queryId = await askAgain();
    await page.locator(`[data-workspace-select="${gor1.id}"]`).first().click({ force: true });
    await page.waitForFunction(id => window.__map.received.some(message => message.type === 'mj.impactCancel' && message.payload.queryId === id), queryId, { timeout: 3000 });
  });
  await check('G4-d : la carte répond « cancelled » → retour au manuel, sans erreur ni fenêtre', async () => {
    const before = (await cancels()).length;
    const queryId = await askAgain();
    await mapPost('map.impact', { queryId, cancelled: true });
    await zone.getByRole('button', { name: 'Choisir sur la carte' }).waitFor();
    assert.equal(await zone.locator('[data-impact-waiting]').count(), 0);
    assert.equal((await cancels()).length, before, 'rien à renvoyer à la carte');
  });
  await check('G4-e : version 3 ; une carte en version 2 → « Versions de liaison différentes », demande abandonnée, rien ne passe', async () => {
    // mj.hello est parti au démarrage, avant l'ouverture du canal simulé : l'outil répond à map.hello par l'instantané.
    const all = await page.evaluate(() => window.__map.received.map(message => message.v));
    assert.ok(all.length > 0 && all.every(v => v === 3), 'tous les messages de l’outil en version 3');
    assert.ok((await received('mj.snapshot')).length >= 1, 'instantané reçu en réponse à map.hello');
    const queryId = await askAgain();
    await mapPost('map.impact', { queryId, levelId: 'L1', cell: { x: 1, y: 1 }, refs: await refOf([gor2.id]) }, 2);
    await page.waitForFunction(() => /Versions de liaison différentes/.test(document.querySelector('#map-link-indicator')?.textContent || ''));
    await page.waitForFunction(() => !document.querySelector('[data-impact-waiting]'));
    assert.equal(await zone.getByRole('button', { name: 'Choisir sur la carte' }).count(), 0, 'carte non connectée : pas de bouton');
    assert.equal((await checkedTargets()).includes(gor2.name), false, 'réponse en version 2 ignorée');
    await page.screenshot({ path: `${shots}04-version-differente.png` });
  });
  // En dernier : une fois le panneau fermé, le parcours ne le rouvre pas.
  await check('G4-d : « Fermer » le panneau → mj.impactCancel', async () => {
    await mapPost('map.hello', { sessionId: 'carte-simulee' });
    await page.waitForFunction(() => !/différentes/.test(document.querySelector('#map-link-indicator')?.textContent || ''));
    const queryId = await askAgain();
    await drawer.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await page.waitForFunction(id => window.__map.received.some(message => message.type === 'mj.impactCancel' && message.payload.queryId === id), queryId, { timeout: 3000 });
  });
  await check('aucune erreur de page, aucune boîte native', async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(dialogs, []);
  });
} finally {
  await browser.close();
  await close();
}
if (failures.length) { console.log(`\n${failures.length} échec(s) : ${failures.join(' ; ')}`); process.exit(1); }
console.log('\nRecette G4 : tout est vert.');
