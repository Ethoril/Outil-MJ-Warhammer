import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';
import { closeU1Drawer } from './helpers/u1-drawer.mjs';
import { engagedWith } from '../js/core/engagements.js';

// Fuite d'un Brisé encore engagé (L06 p. 163, 185-186) : le panneau « Brisé · fuite obligatoire » pré-remplit les adversaires
// engagés du plateau et demande les deux confirmations du MJ ; Appliquer retire l'engagement, rend l'Élan aux adversaires et
// ajoute un Brisé par adversaire engagé ; ↶ rend l'état d'avant ; le rechargement conserve le résultat.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = createStaticServer({ root, headers: { 'Cache-Control': 'no-store' } });
await new Promise(done => server.listen(0, '127.0.0.1', done));
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 900 } });
  await blockExternalNetwork(context, server);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return JSON.parse(Store.getFullJSON()); });
  const person = (state, id) => state.combat.participants.find(row => row.id === id);
  const engagedOf = (value, id) => engagedWith(value.combat, value.combat.participants, id);
  const brokenLevel = who => (who.states || []).filter(row => row.key === 'brise').reduce((sum, row) => sum + Number(row.level ?? 1), 0);
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const fighter = (id, name, camp, initiative, states = []) => ({ id, name, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', initiative, hp: 20, maxHp: 30,
      caracs: { CC: 45, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states, traits: [], equipment: [], talents: [], prayers: [],
      skills: [{ id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 }], actions: [{ id: 'blade', type: 'attack', base: 45, damage: 3 }], extensions: { v5: {} } });
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], diceLines: [], log: [], extensions: { v5: { turnIndex: 1, combatId: 'qa-brise-engage' } },
      combat: { round: 1, currentActorId: 'priest', order: ['priest', 'orc', 'gob'], participants: [
        fighter('priest', 'Prêtresse', 'pj', 60, [{ id: 'qa-broken', key: 'brise', name: 'Brisé', level: 1, source: { type: 'browser-fixture' } }]),
        fighter('orc', 'Orc', 'ennemi', 50), fighter('gob', 'Gobelin', 'ennemi', 30)] } });
    await Store.engageParticipants('priest', 'orc');
  });
  await page.getByRole('tab', { name: 'Jouer', exact: true }).click();
  await closeU1Drawer(page);
  const actor = page.locator('[data-broken-escape-actor="priest"]');
  await actor.waitFor({ state: 'visible' });
  // L'engagement du plateau est pré-rempli ; le MJ renseigne les faits habituels.
  assert.equal(await actor.getByLabel('Ennemi engagé : Orc', { exact: true }).isChecked(), true, 'l’Orc engagé est pré-coché');
  await actor.getByLabel('Visibilité par rapport aux ennemis', { exact: true }).selectOption('true');
  await actor.getByLabel('Déplacement Flee', { exact: true }).selectOption('walk');
  await actor.getByLabel('Visibilité après cette étape', { exact: true }).selectOption('true');
  const calc = actor.getByRole('button', { name: 'Calculer l’aperçu', exact: true });
  const apply = actor.getByRole('button', { name: 'Appliquer Move (Flee)', exact: true });
  // Sans les confirmations : bloqué, avec un message qui dit quoi cocher.
  await calc.click();
  const blockedText = await actor.innerText();
  assert.doesNotMatch(blockedText, /non raccordée/, 'plus de message « non raccordée »');
  assert.match(blockedText, /Cochez/, 'le message dit quoi cocher');
  assert.equal(await apply.isDisabled(), true, 'sans aperçu prêt, Appliquer reste inactif');
  // Les deux confirmations nomment l'adversaire engagé.
  const confirmFlee = actor.getByLabel(/Fuite engagée confirmée.*Orc/);
  const confirmAttacks = actor.getByLabel(/Attaques gratuites résolues.*Orc/);
  await confirmFlee.check();
  await calc.click();
  assert.match(await actor.innerText(), /Cochez/, 'une seule confirmation ne suffit pas');
  await confirmAttacks.check();
  await calc.click();
  const preview = actor.locator('[data-broken-escape-preview="priest"]');
  await preview.waitFor({ state: 'visible' });
  assert.match(await preview.innerText(), /Aperçu : aucun effet appliqué/);
  assert.match(await preview.innerText(), /Move \(Flee\) : 8 mètres de jeu/);
  const before = await state();
  assert.equal(brokenLevel(person(before, 'priest')), 1);
  assert.deepEqual(engagedOf(before, 'priest'), ['orc']);
  await apply.click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return (JSON.parse(Store.getFullJSON()).extensions?.v5?.brokenEscape?.receipts || []).some(row => row.actorId === 'priest' && row.action === 'flee'); });
  const after = await state();
  assert.equal(brokenLevel(person(after, 'priest')), 2, '1 Brisé initial + 1 pour l’Orc engagé');
  assert.equal(person(after, 'orc').extensions.v5.hasMomentum, true, 'l’Orc gagne l’Élan');
  assert.equal(person(after, 'gob').extensions?.v5?.hasMomentum, undefined, 'un adversaire non engagé n’est pas touché');
  assert.deepEqual(engagedOf(after, 'priest'), [], 'le fuyard n’est plus engagé');
  const receipt = after.extensions.v5.brokenEscape.receipts.find(row => row.actorId === 'priest' && row.action === 'flee');
  assert.deepEqual(receipt.engagedEscapeEffects.engagedEnemyIds, ['orc']);
  // ↶ rend l'engagement et l'état d'avant.
  await page.locator('#btn-undo').click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return !(JSON.parse(Store.getFullJSON()).extensions?.v5?.brokenEscape?.receipts || []).length; });
  const undone = await state();
  assert.equal(brokenLevel(person(undone, 'priest')), 1, 'Undo retire le Brisé ajouté');
  assert.notEqual(person(undone, 'orc').extensions?.v5?.hasMomentum, true, 'Undo retire l’Élan');
  assert.deepEqual(engagedOf(undone, 'priest'), ['orc'], 'Undo rend l’engagement');
  // Redo puis rechargement : le résultat persiste.
  await page.locator('#btn-menu').click();
  await page.locator('#btn-redo').click();
  await page.waitForFunction(async () => { const { Store } = await import('/js/main.js'); await Store.whenIdle(); return (JSON.parse(Store.getFullJSON()).extensions?.v5?.brokenEscape?.receipts || []).length === 1; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block');
  const reloaded = await state();
  assert.equal(brokenLevel(person(reloaded, 'priest')), 2, 'le rechargement conserve la fuite appliquée');
  assert.deepEqual(engagedOf(reloaded, 'priest'), []);
  assert.deepEqual(errors, [], 'aucune erreur JS');
  console.log('brise-engage-fuite-browser: OK');
} finally { await browser.close(); server.close(); }
