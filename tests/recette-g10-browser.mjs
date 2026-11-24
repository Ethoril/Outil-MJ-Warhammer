/**
 * Passe G · lot G10 (recette manuelle du MJ : f4-autres, f6-esquive / g-distance, f5-armure) :
 *  - R11 : « Autres actions » ouvre un menu qui contient aussi « Test… » (même effet que le bouton de la ligne Action), focus sur
 *    la première entrée ; au tour d'un PNJ qui ne sait faire que de la magie (Chamane-bray de rencontre-r20, attaques retirées) ;
 *  - R14 : une résolution de tir ouverte redemande la distance à la carte à chaque `map.adjacency` (24 m → 2 m : la ligne Distance
 *    et le droit d'esquiver suivent, sans reprendre la cible) ; une bande de portée choisie par le MJ reste. La carte est un second
 *    onglet de la même origine qui parle sur le vrai canal de liaison (BroadcastChannel), sans fournisseur simulé ;
 *  - R2 (p. 304) : une Vermine de choc construite depuis le bestiaire L06 (hallebarde « Hack », armure Heavy Armour 5 PA) frappe au
 *    Corps un PJ à 5 PA : « Taille (arme) » est visible dans la résolution sans ouvrir « autres… », la liste n'apparaît que
 *    s'il y a plusieurs pièces (la plus forte précochée), et « Appliquer » fait perdre 1 PA à la pièce frappée.
 * Captures dans tmp/recette-g10/ (non versionné).
 *
 * Usage : timeout 120 node tests/recette-g10-browser.mjs
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { blockExternalNetwork, startStaticServer } from './helpers/static-server.mjs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = `${root}tmp/recette-g10/`;
mkdirSync(shots, { recursive: true });
const r20 = readFileSync(new URL('./fixtures/rencontre-r20.json', import.meta.url));
const SHAMAN = 'Swilegrakk — Chamane-bray (Lanceur de sorts)';
const CHANNEL = 'wfrp-map-link', VERSION = 3;

// ── R11 : le Chamane perd ses attaques et garde la magie ; le round 1 est commencé, il joue.
function shamanSave() {
  const save = JSON.parse(r20.toString('utf8'));
  const people = save.combat.participants;
  const shaman = people.find(row => row.name === SHAMAN);
  shaman.actions = [
    { id: 'g10-focus', name: 'Focalisation', type: 'channelling', attr: 'FM', base: 50, note: 'Focalisation' },
    { id: 'g10-cast', name: 'Incantation', type: 'cast', attr: 'Int', base: 45, note: 'Incantation' }
  ];
  save.combat.round = 1;
  save.combat.order = people.map(row => row.id);
  save.combat.currentActorId = shaman.id;
  return save;
}

// ── R14 : une archère PJ tire sur un Gor (BI 4) ; la carte est un second onglet.
const archer = { id: 'g10-ulla', name: 'Ulla', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 50,
  caracs: { CC: 35, CT: 55, F: 30, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 30, Soc: 30 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  actions: [{ id: 'g10-arc', name: 'Arc court', note: 'Arc court', type: 'attack', attr: 'CT', base: 55, mod: 0, damage: 7, range: 50, qualities: [], extensions: { v5: { kind: 'ranged' } } }],
  extensions: { v5: { hasMomentum: false } } };
const gor = { id: 'g10-gor', name: 'Gor', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 14, maxHp: 14, initiative: 40,
  caracs: { CC: 40, CT: 25, F: 35, E: 35, I: 42, Ag: 35, Dex: 25, Int: 20, FM: 25, Soc: 15 }, states: [], skills: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [], extensions: { v5: { hasMomentum: false } } };
const shotSave = { schemaVersion: 3, reserve: [], encounters: [], activeScene: null, suspendedScenes: [], log: [], diceLines: [],
  combat: { round: 1, currentActorId: archer.id, order: [archer.id, gor.id], orderMode: 'automatic', participants: [archer, gor] } };

// ── R2 : Vermine de choc du bestiaire L06 (profil E0-P-110), PJ « venu d'une fiche » à 5 PA au Corps.
const books = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8'));
const records = Array.isArray(books) ? books : books.profiles || books.records || Object.values(books);
const piece = (id, name, ap, layer = 'chain') => ({ id, baseId: id, kind: 'armour', name, category: layer === 'leather' ? 'Cuir' : 'Mailles', damage: '', reach: '', range: '', ap, locations: ['body'], layer, keywords: [], notes: '', source: '', custom: false });
function tailleSave(equipment, { rawQualities = false } = {}) {
  const vermine = { ...buildParticipantFromBestiary('E0-P-110', { library: records, camp: 'ennemi', zone: 'active' }), id: 'g10-vermine' };
  if (rawQualities) vermine.actions[0].qualities = ['Defensive', 'Hack', 'Impale'];
  const body = equipment.reduce((sum, item) => sum + item.ap, 0) || 5;
  const pj = { id: 'g10-caelel', name: 'Caelel', kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, initiative: 40,
    caracs: { CC: 35, CT: 40, F: 25, E: 30, I: 40, Ag: 40, Dex: 35, Int: 30, FM: 30, Soc: 30 }, states: [], skills: [], equipment,
    armorLocations: { head: 0, body, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 }, armor: { head: 0, body, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } };
  return { schemaVersion: 3, reserve: [], encounters: [], activeScene: null, suspendedScenes: [], log: [], diceLines: [],
    combat: { round: 1, currentActorId: vermine.id, order: [vermine.id, pj.id], orderMode: 'automatic', participants: [vermine, pj] } };
}

const { origin, close } = await startStaticServer({ root });
const browser = await launchBrowser();
let failed = false;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, serviceWorkers: 'block' });
  await blockExternalNetwork(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const resolution = () => page.locator('.workspace-resolution');
  const load = async save => {
    await page.goto(`${origin}/index.html`);
    await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', null, { timeout: 20000 });
    await page.locator('#file-input').setInputFiles({ name: 'recette-g10.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save)) });
    await page.locator('#tab-combat').click();
    await page.locator('[data-zone="bas"] .workspace-action-bar').waitFor({ state: 'visible' });
    await resolution().first().waitFor({ state: 'visible' });
  };

  // ───────────────────────── R11 ─────────────────────────
  await load(shamanSave());
  const menu = page.locator('#workspace-magic-menu');
  assert.ok(await menu.isHidden(), 'R11 : le menu est fermé au départ');
  await page.locator('[data-zone="bas"] [data-bar-action="other"]').click();
  await page.waitForTimeout(200);
  assert.ok(await menu.isVisible(), 'R11 : « Autres actions » ouvre le menu');
  assert.deepEqual((await menu.locator('button').allTextContents()).map(text => text.trim()),
    ['Focalisation V5', 'Incantation V5', 'Dissipation persistante V5', 'Prière', 'Corruption', 'Test…'], 'R11 : le menu porte magie, prière, Corruption et Test…');
  assert.ok(await page.evaluate(() => document.activeElement === document.querySelector('#workspace-magic-menu button:not(:disabled)')), 'R11 : focus sur la première entrée');
  await page.screenshot({ path: `${shots}autres-actions-test.png` });
  const typeBox = page.locator('#workspace-test-menu');
  assert.ok(await typeBox.isHidden(), 'R11 : le choix du type de Test est fermé avant le clic');
  await menu.getByRole('button', { name: 'Test…', exact: true }).click();
  await page.waitForTimeout(150);
  assert.ok(await typeBox.isVisible(), 'R11 : « Test… » du menu ouvre le choix du type de Test, comme le bouton de la ligne Action');
  assert.ok(await page.evaluate(() => document.activeElement === document.querySelector('#workspace-test-menu select')), 'R11 : le focus passe au type de Test');
  console.log('ok : R11 — « Autres actions » : menu magie, prière, Corruption et Test…, Test… ouvre le type de Test');

  // ───────────────────────── R14 ─────────────────────────
  const mapPage = await context.newPage();
  await mapPage.goto(`${origin}/package.json`);
  await mapPage.evaluate(({ channel, version }) => {
    const ch = new BroadcastChannel(channel);
    let n = 0;
    window.cells = 12;
    window.queries = 0;
    window.say = (type, payload = {}) => ch.postMessage({ v: version, type, seq: ++n, at: Date.now(), from: 'map', payload });
    ch.onmessage = event => {
      const message = event.data;
      if (message?.from !== 'outil-mj') return;
      if (message.type === 'mj.hello') window.say('map.hello');
      if (message.type === 'mj.distanceQuery') { window.queries += 1; window.say('map.distance', { queryId: message.payload.queryId, cells: window.cells }); }
    };
    window.say('map.hello');
  }, { channel: CHANNEL, version: VERSION });
  await load(shotSave);
  await mapPage.evaluate(() => window.say('map.hello'));
  await page.waitForTimeout(400);
  await mapPage.evaluate(ids => { for (const id of ids) window.say('map.placed', { ref: `p:${id}` }); }, [archer.id, gor.id]);
  await page.waitForTimeout(300);
  await page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').filter({ hasText: 'Arc court' }).first().click();
  await resolution().getByRole('button', { name: 'Gor', exact: true }).first().click();
  const summary = () => page.locator('[data-distance-summary]').first().textContent().then(text => text.trim());
  await page.waitForFunction(() => /24 m/.test(document.querySelector('[data-distance-summary]')?.textContent || ''));
  assert.match(await summary(), /24 m · carte/, 'R14 : la carte dit 24 m');
  assert.match(await page.locator('[data-dodge-chip]').textContent(), /Esquive interdite : 24 m > BI 4/, 'R14 : esquive interdite à 24 m');
  const band24 = await page.locator('[data-distance-choice][aria-pressed="true"]').first().getAttribute('data-distance-choice');
  await page.screenshot({ path: `${shots}distance-24m.png` });
  // Le MJ déplace le pion à 2 m (1 case) : la carte envoie map.adjacency ; aucune nouvelle sélection de la cible.
  await mapPage.evaluate(() => { window.cells = 1; window.say('map.adjacency', { pairs: [] }); });
  await page.waitForFunction(() => /2 m/.test(document.querySelector('[data-distance-summary]')?.textContent || '') && !/24 m/.test(document.querySelector('[data-distance-summary]')?.textContent || ''), null, { timeout: 5000 });
  assert.match(await summary(), /2 m · carte/, 'R14 : la ligne Distance suit la nouvelle mesure (2 m)');
  assert.match(await page.locator('[data-dodge-chip]').textContent(), /Esquive permise : 2 m ≤ BI 4/, 'R14 : esquive permise à 2 m');
  const bandNear = await page.locator('[data-distance-choice][aria-pressed="true"]').first().getAttribute('data-distance-choice');
  assert.notEqual(bandNear, band24, 'R14 : la bande tirée de la carte suit la nouvelle mesure');
  await page.screenshot({ path: `${shots}distance-2m.png` });
  console.log(`ok : R14 — 24 m → 2 m sans reprendre la cible : « ${await summary()} », bande ${band24} → ${bandNear}, esquive interdite → permise`);
  // Bande choisie par le MJ : elle reste, la mesure change.
  const chosen = bandNear === 'extreme' ? 'long' : 'extreme';
  await page.locator(`[data-distance-choice="${chosen}"]`).click();
  await mapPage.evaluate(() => { window.cells = 6; window.say('map.adjacency', { pairs: [] }); });
  await page.waitForFunction(() => /12 m/.test(document.querySelector('[data-distance-summary]')?.textContent || ''), null, { timeout: 5000 });
  assert.equal(await page.locator(`[data-distance-choice="${chosen}"]`).getAttribute('aria-pressed'), 'true', 'R14 : la bande choisie par le MJ reste');
  assert.match(await page.locator('[data-dodge-chip]').textContent(), /Esquive interdite : 12 m > BI 4/, 'R14 : le droit d’esquiver suit la mesure (12 m)');
  console.log(`ok : R14 — bande « ${chosen} » choisie par le MJ conservée, mesure passée à 12 m`);
  await mapPage.close();

  // ───────────────────────── R2 ─────────────────────────
  const apply = () => resolution().locator('[data-focus-key="apply"]').first();
  async function hit(save) {
    await load(save);
    await page.locator('[data-zone="bas"] [data-bar-action^="prepared-"]').first().click();
    await resolution().getByRole('button', { name: 'Caelel', exact: true }).first().click();
    await page.locator('[data-roll-input="attack"]').first().fill('54');
    await page.locator('[data-roll-input="defense"]').first().fill('95');
    await page.locator('[data-roll-input="defense"]').first().press('Enter');
    await apply().waitFor();
    await page.waitForTimeout(200);
  }
  const tailleLines = () => resolution().evaluate(section => {
    const out = [];
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) if (/Taille \(arme\)/.test(node.textContent)) out.push({ text: node.textContent.trim(), shown: node.parentElement.getClientRects().length > 0, inDrawer: Boolean(node.parentElement.closest('.workspace-resolution-drawer')) });
    return out;
  });
  const damaged = id => page.evaluate(async ownerId => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(row => row.id === ownerId)?.extensions?.v5?.armorDamageByItem || {}; }, id);
  const answerInfected = async () => {
    const roll = resolution().getByRole('button', { name: /Lancer d100 : .*Infecté/ }).first();
    if (await roll.count()) { await roll.click(); await page.waitForTimeout(250); }
  };

  // A : une seule pièce de 5 PA au Corps → phrase « Taille (arme) : Plastron perd 1 PA. », pas de liste.
  await hit(tailleSave([piece('g10-plastron', 'Plastron', 5)]));
  let lines = await tailleLines();
  assert.ok(lines.some(row => row.shown && !row.inDrawer && /Plastron perd 1 PA/.test(row.text)), `R2 (A) : « Taille (arme) : Plastron perd 1 PA. » visible hors tiroir (${JSON.stringify(lines)})`);
  assert.equal(await page.locator('[data-hack-piece]').count(), 0, 'R2 (A) : pas de liste pour une seule pièce');
  assert.ok(await page.locator('.workspace-resolution-drawer').first().evaluate(el => el.hidden), 'R2 (A) : le tiroir « autres… » est resté fermé');
  await page.screenshot({ path: `${shots}taille-une-piece.png` });
  await answerInfected();
  assert.ok(await apply().isEnabled(), 'R2 (A) : « Appliquer » actif');
  await apply().click();
  await page.waitForTimeout(400);
  assert.equal((await damaged('g10-caelel'))['g10-plastron'], 1, 'R2 (A) : le Plastron perd durablement 1 PA');
  console.log('ok : R2 (A) — une pièce de 5 PA : ligne visible sans tiroir, Plastron −1 PA');

  // B : plusieurs pièces → liste, la plus forte précochée.
  await hit(tailleSave([piece('g10-veste', 'Veste', 2), piece('g10-cotte', 'Cotte', 3, 'leather')]));
  lines = await tailleLines();
  assert.ok(lines.some(row => row.shown && !row.inDrawer && /^Taille \(arme\) : pièce touchée/.test(row.text)), `R2 (B) : libellé « Taille (arme) » de la liste visible hors tiroir (${JSON.stringify(lines)})`);
  assert.equal(await page.locator('[data-hack-piece]').inputValue(), 'g10-cotte', 'R2 (B) : la pièce la plus forte est précochée');
  assert.ok(await page.locator('[data-hack-piece]').isVisible(), 'R2 (B) : la liste est visible');
  await answerInfected();
  await apply().click();
  await page.waitForTimeout(400);
  assert.equal((await damaged('g10-caelel'))['g10-cotte'], 1, 'R2 (B) : la Cotte perd 1 PA');
  console.log('ok : R2 (B) — deux pièces : liste visible, Cotte précochée et abîmée');

  // C : 5 PA sans pièce identifiable → phrase et nom libre facultatif, aucun blocage.
  await hit(tailleSave([]));
  lines = await tailleLines();
  assert.ok(lines.some(row => row.shown && !row.inDrawer && /la protection touchée perd 1 PA/.test(row.text)), `R2 (C) : phrase visible hors tiroir (${JSON.stringify(lines)})`);
  assert.equal(await page.locator('[data-hack-piece]').count(), 0);
  console.log('ok : R2 (C) — PA sans pièce : phrase visible, nom libre facultatif');

  // D : qualités imprimées brutes (« Hack ») d'une ancienne sauvegarde : reconnues par alias comme par le calcul.
  await hit(tailleSave([piece('g10-plastron', 'Plastron', 5)], { rawQualities: true }));
  lines = await tailleLines();
  assert.ok(lines.some(row => row.shown && !row.inDrawer && /Taille \(arme\)/.test(row.text)), `R2 (D) : « Hack » brut reconnu (${JSON.stringify(lines)})`);
  console.log('ok : R2 (D) — qualité « Hack » brute reconnue');

  assert.deepEqual(errors, [], `aucune erreur de page : ${errors.join(' | ')}`);
  console.log('recette G10 : vert');
} catch (error) {
  failed = true;
  console.error('recette G10 : ROUGE —', error.message);
  const page = browser.contexts()[0]?.pages()[0];
  if (page) await page.screenshot({ path: `${shots}echec.png` }).catch(() => {});
} finally {
  await browser.close();
  await close();
}
process.exit(failed ? 1 : 0);
