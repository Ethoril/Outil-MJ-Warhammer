// Chantier H, T7 : écran « Envoyer aux fiches » sur une fonction simulée (contrat outil-mj, plan.md §1).
// Servi sur 127.0.0.1:8766 (PORT pour changer). Aucun compte ni réseau : tout ce qui sort de l'origine est bloqué.
// À lancer sous `timeout 120 node tests/fiche-writeback-browser.mjs`. CAPTURES=<dossier> enregistre l'aperçu et le conflit.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 8766);
const captures = process.env.CAPTURES || '';
const harnessHtml = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Recette envoi aux fiches</title><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"><body><main id="mount" style="max-width:760px;padding:16px"></main></body></html>';
const server = createStaticServer({ root, pages: { '/control-harness.html': () => harnessHtml } });

let browser;
async function main() {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${port}`;
  browser = await launchBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 820, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await blockExternalNetwork(context, origin);
  await page.goto(origin + '/control-harness.html');

  await page.evaluate(async () => {
    const { createStore } = await import('/js/core/store.js');
    const { ficheSnapshot } = await import('/js/core/fiche-sync.js');
    const { initFicheWritebackView } = await import('/js/ui/fiche-writeback-view.js');
    const { createFakeFunction } = await import('/tests/helpers/fake-fiche-function.mjs');
    const carac = (base, adv = 0) => ({ base, adv });
    const fiches = {
      wren: { revision: 7, data: { nom: 'Wren', race: 'Humain', destin: '3', fortune: '2', peche: '1', corruption: '0', blessuresAct: '4',
        carac: { cc: carac(31, 5), ct: carac(30), f: carac(30), e: carac(30), i: carac(30), ag: carac(32, 4), dex: carac(30), int: carac(30), fm: carac(30), soc: carac(3, 5) } } },
      elysia: { revision: 2, data: { nom: 'Elysia', race: 'Humain', destin: '2', fortune: '1', corruption: '', carac: { ag: carac(30) } } }
    };
    const fn = createFakeFunction(fiches);
    let saved = null;
    const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
    const snapshot = charId => ficheSnapshot(charId, fiches[charId].data, { schemaVersion: 4, revision: fiches[charId].revision });
    const profile = (charId, fate) => ({ id: `prof-${charId}`, name: `Nom secret ${charId}`, kind: 'PJ', hp: 10, maxHp: 12, caracs: { ...snapshot(charId).caracs },
      extensions: { ficheId: charId, v5: { fate, corruptionPoints: snapshot(charId).durables?.corruption ?? 0, divine: { sin: snapshot(charId).durables?.sin ?? null } } }, ficheSnapshot: snapshot(charId) });
    const participant = (charId, fate) => ({ ...profile(charId, fate), id: `p-${charId}`, profileId: `prof-${charId}`, camp: 'pj', zone: 'active', hp: 3, states: ['Sonné|2'], skills: [], talents: [] });
    const register = { schemaVersion: 1, revision: 2, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], incidents: [], sequelae: [
      { id: 'characteristic-loss:op1', participantId: 'p-wren', kind: 'characteristic-loss', label: 'Perte de Ag', status: 'permanent', carac: 'Ag', requested: 5, applied: 5, split: null, reason: 'Motif secret du MJ', day: 0, history: [] },
      { id: 'loss:teeth', participantId: 'p-wren', kind: 'loss', part: 'teeth', count: 8, status: 'permanent', history: [] }] };
    const makeStore = async () => { const store = createStore({ storage: null, persistence }); await store.ready; return store; };
    const store = await makeStore();
    await store.loadFromJSON({ schemaVersion: 3, reserve: [profile('wren', 2), profile('elysia', 1)], combat: { round: 0, currentActorId: null, order: [], participants: [participant('wren', 2), participant('elysia', 1)] },
      log: [], diceLines: [], extensions: { v5: { aftermathRegister: register, characterResources: [{ characterId: 'fiche:wren', fortune: 0 }, { characterId: 'fiche:elysia', fortune: 1 }] } } });
    // Le joueur d'Elysia a modifié son Destin depuis la dernière lecture : conflit attendu.
    fn.edit('elysia', data => { data.destin = '4'; });
    const harness = window.harness = { fn, store, signedIn: false, sent: [] };
    const source = {
      async getUser() { return harness.signedIn ? { name: 'MJ simulé' } : null; },
      async signIn() { harness.signedIn = true; return { name: 'MJ simulé' }; },
      async signOut() {},
      async fetchAll() { return Object.entries(fn.store).map(([charId, fiche]) => ({ charId, data: structuredClone(fiche.data), status: 'available', metadata: { schemaVersion: 4, revision: fiche.revision } })); },
      async sendCommand(command) { harness.sent.push(structuredClone(command)); return fn.execute(command); }
    };
    harness.mountView = currentStore => {
      const api = { plan: () => currentStore.planFicheWriteback(), applySuccess: (...args) => currentStore.applyFicheWritebackSuccess(...args), applyChoice: (...args) => currentStore.applyFicheWritebackConflictChoice(...args) };
      const view = initFicheWritebackView({ mount: document.querySelector('#mount'), source, api, now: () => new Date(2026, 10, 6, 23, 0) });
      harness.view = view; return view.start();
    };
    harness.reload = async () => { harness.store = await makeStore(); await harness.mountView(harness.store); };
    await harness.mountView(store);
  });

  // CA1 : sans connexion, la vue propose de se connecter.
  await page.getByRole('button', { name: 'Se connecter avec Google' }).click();
  // CA2 : aperçu par fiche (identité, jamais le nom), « fiche → outil » et provenance.
  const wren = page.locator('[data-fiche="wren"]');
  await expect(wren).toContainText('Destin : 3 → 2');
  await expect(wren).toContainText('Chance : 2 → 0');
  await expect(wren).toContainText('Agilité (Base) : 32 → 27');
  await expect(wren).toContainText('Séquelles permanentes : Ag −5 au total');
  await expect(page.locator('[data-fiche="elysia"]')).toContainText('Destin : 2 → 1');
  await expect(page.locator('#mount')).not.toContainText('Nom secret');
  await expect(page.locator('#mount')).not.toContainText('Motif secret');
  // CA5 : ni Blessures ni états.
  await expect(page.locator('#mount')).not.toContainText('Blessures');
  await expect(page.locator('#mount')).not.toContainText('Sonné');
  // Ligne « à faire à la main » visible, non cochable.
  const soc = page.locator('[data-key="row:wren:carac:soc"]');
  await expect(soc).toBeDisabled();
  await expect(wren).toContainText('à faire à la main');
  // T8 : séquelle permanente vers le « Suivi du MJ » (lot C).
  await expect(wren).toContainText('Suivi du MJ : — → « Perte : dents »');
  // CA4 : une ligne décochée ne part pas.
  await page.locator('[data-key="row:wren:counter:fortune"]').uncheck();
  if (captures) { mkdirSync(captures, { recursive: true }); await page.locator('#mount').screenshot({ path: join(captures, 't7-apercu.png') }); }

  await page.getByRole('button', { name: /^Envoyer \(2 fiches\)/ }).click();
  // Wren écrite ; Elysia en conflit (CA10), sans rien écrire.
  await expect(page.locator('[data-fiche="elysia"] [data-key="conflict:elysia:counter:destin"]')).toContainText('fiche 4 · outil 1');
  const after = await page.evaluate(() => ({ wren: window.harness.fn.store.wren, elysia: window.harness.fn.store.elysia, sent: window.harness.sent.map(c => ({ charId: c.charId, keys: c.payload.changes.map(x => x.op + ':' + (x.field || x.carac || x.id)) })) }));
  assert.equal(after.wren.data.destin, '2'); assert.equal(after.wren.data.fortune, '2', 'ligne décochée non envoyée'); assert.deepEqual(after.wren.data.carac.ag, { base: 27, adv: 4 });
  assert.equal(after.elysia.data.destin, '4');
  assert.deepEqual(after.sent.find(c => c.charId === 'wren').keys.sort(), ['carac:ag', 'counter:destin', 'suivi:outil:loss:teeth']);
  assert.deepEqual(after.wren.data.suiviMj.map(row => [row.id, row.categorie]), [['outil:loss:teeth', 'sequelle']]);
  if (captures) await page.locator('#mount').screenshot({ path: join(captures, 't7-conflit.png') });
  // Une fiche en conflit attend le choix du MJ : elle ne compte plus dans l'envoi (Fortune de Wren reste décochée).
  await expect(page.locator('[data-key="send"]')).toHaveText('Rien à envoyer');

  // CA11 : « Garder la fiche » → l'outil reprend 4, Elysia n'a plus de différence.
  await page.locator('[data-key="keep:elysia:counter:destin"]').click();
  await expect(page.locator('[data-fiche="elysia"]')).toHaveCount(0);
  const elysiaFate = await page.evaluate(() => window.harness.store.listParticipants().find(row => row.id === 'p-elysia').extensions.v5.fate);
  assert.equal(elysiaFate, 4);
  // Fortune décochée reste à envoyer, décochée (CA4) ; Destin et Agilité ne reviennent pas (CA7).
  await expect(page.locator('[data-key="row:wren:counter:fortune"]')).not.toBeChecked();
  await expect(page.locator('[data-key="row:wren:counter:destin"]')).toHaveCount(0);
  await expect(page.locator('[data-key="row:wren:carac:ag"]')).toHaveCount(0);

  // Contre-vérification (2) : recocher une ligne puis renvoyer ne réutilise pas l'envoi précédent (pas d'already-exists).
  await page.locator('[data-key="row:wren:counter:fortune"]').check();
  await page.getByRole('button', { name: 'Envoyer (1 fiche)', exact: true }).click();
  await expect(page.locator('#mount')).toContainText('Envoi terminé.');
  const resent = await page.evaluate(() => ({ fortune: window.harness.fn.store.wren.data.fortune, ops: window.harness.sent.map(c => c.operationId) }));
  assert.equal(resent.fortune, '0');
  assert.equal(new Set(resent.ops).size, resent.ops.length, 'chaque écriture a son propre identifiant d’opération');
  // CA13 : annulation proposée pour la seule fiche écrite, et toujours là après rechargement.
  await expect(page.locator('[data-key="undo"]')).toContainText('wren');
  await expect(page.locator('[data-key="undo"]')).not.toContainText('elysia');
  await page.evaluate(() => window.harness.reload());
  await expect(page.locator('[data-key="undo"]')).toContainText('wren');
  await page.locator('[data-key="undo"]').click();
  await expect(page.locator('#mount')).toContainText('Dernier envoi annulé');
  const undone = await page.evaluate(() => ({ wren: window.harness.fn.store.wren.data, history: window.harness.fn.history.map(h => h.summary), store: window.harness.store.planFicheWriteback(), fate: window.harness.store.listParticipants().find(row => row.id === 'p-wren').extensions.v5.fate }));
  assert.equal(undone.wren.destin, '3'); assert.equal(undone.wren.carac.ag.base, 32); assert.deepEqual(undone.wren.suiviMj, []);
  assert.equal(undone.wren.fortune, '2', 'l’annulation couvre les deux envois de la même ouverture de l’écran');
  assert.equal(undone.history.filter(h => h.undoOf).length, 2);
  assert.equal(undone.fate, 2, 'l’annulation ne touche pas l’état de jeu');
  // CA15 : une annulation ne s'annule pas.
  await expect(page.locator('[data-key="undo"]')).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log('fiche-writeback-browser : OK');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.close(); });
