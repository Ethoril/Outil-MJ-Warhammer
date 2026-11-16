// Monture déclarée sur la fiche en ligne, lue par « Mettre à jour les PJ » : chemin réel de l'interface
// (menu, bouton, aperçu, callback mountProfile de js/main.js qui charge un livre du bestiaire, application, ↶).
// Aucun réseau : les modules Firebase de vendor/ sont remplacés par de faux modules qui servent les fiches de `window.fiches`,
// et la synchronisation Realtime Database est neutralisée. À lancer sous `timeout 120 node tests/monture-fiche-browser.mjs`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'playwright/test';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer, blockExternalNetwork } from './helpers/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
// Valeurs attendues relues dans le bestiaire, pas recopiées en dur.
const cheval = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles.find(row => row.id === 'E0-P-077');
assert.ok(cheval && cheval.stats && cheval.wounds, 'Cheval E0-P-077 présent dans L06.json');
const server = createStaticServer({ root });

const FAKE_MODULES = {
  'firebase-app.js': 'export const getApps = () => []; export const initializeApp = () => ({});',
  'firebase-auth.js': 'export const getAuth = () => ({ authStateReady: async () => {}, currentUser: { displayName: "MJ simulé" } }); export class GoogleAuthProvider {} export const signInWithPopup = async () => ({ user: { displayName: "MJ simulé" } }); export const signOut = async () => {};',
  'firebase-firestore.js': 'export const getFirestore = () => ({}); export const doc = (db, collection, id) => ({ id }); export const getDocFromServer = async ref => { const fiche = window.fiches?.[ref.id]; return { exists: () => Boolean(fiche), data: () => ({ data: structuredClone(fiche), schemaVersion: 4, revision: window.ficheRevision }) }; };'
};

let browser;
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await launchBrowser();
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  const requested = [];
  page.on('request', request => { if (!request.url().startsWith(origin)) requested.push(request.url()); });
  await blockExternalNetwork(context, origin);
  for (const [file, body] of Object.entries(FAKE_MODULES)) await context.route(`**/vendor/firebase/${file}`, route => route.fulfill({ contentType: 'text/javascript', body }));
  await context.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `export function initFirebaseSync(onConnected) { document.querySelector('#login-screen')?.style.setProperty('display', 'none'); document.querySelector('#app-content')?.style.setProperty('display', 'block'); onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } }); }` }));
  await page.goto(origin + '/index.html');
  await expect(page.locator('#app-content')).toBeVisible();

  let revisionCounter = 0;
  const setFiche = async monture => page.evaluate(({ fixture, monture, revision }) => {
    const data = structuredClone(fixture);
    if (monture !== undefined) data.monture = monture;
    window.fiches = { caelel: data }; window.ficheRevision = revision;
  }, { fixture, monture, revision: `r${++revisionCounter}` });
  const state = () => page.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const pj = Store.getProfile('pj'), mount = Store.getProfile('monture-pj');
    return { declared: pj?.extensions?.v5?.declaredMount ?? null, mount: mount ? structuredClone(mount) : null, revision: Store.getLocalRevision() };
  });
  const openUpdate = async () => {
    await page.locator('#btn-menu').click();
    await page.locator('#workspace-fiche-sync').click();
    await expect(page.locator('.fiche-sync-view')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Appliquer \(1 fiche\)$/ })).toBeEnabled();
  };
  const mountLine = () => page.locator('[data-key="monture:caelel"]');
  const apply = async () => {
    await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
    await expect(page.locator('.fiche-sync-view')).toHaveCount(0);
  };

  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js'); await Store.ready;
    await Store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, initiative: 55, armor: { head: 0, body: 0, arms: 0, legs: 0 }, caracs: { F: 30 }, diceLines: [] });
  });
  assert.deepEqual((await state()).declared, null, 'départ : aucune monture déclarée');

  // 1. Déclaration : aperçu, application, profil créé depuis le bestiaire.
  await setFiche({ espece: 'E0-P-077', nom: 'Tonnerre' });
  await openUpdate();
  await expect(mountLine()).toContainText('Tonnerre');
  await expect(mountLine()).toContainText('déclarée par la fiche');
  await apply();
  let now = await state();
  assert.equal(now.declared?.profileId, 'monture-pj'); assert.equal(now.declared?.name, 'Tonnerre'); assert.equal(now.declared?.bestiaryId, 'E0-P-077');
  assert.ok(now.mount, 'profil de monture dans la Réserve'); assert.equal(now.mount.name, 'Tonnerre');
  assert.equal(now.mount.extensions?.mountFor?.profileId, 'pj'); assert.equal(now.mount.extensions?.mountFor?.bestiaryId, 'E0-P-077');
  const caracs = now.mount.caracs || {};
  const caracOf = key => caracs[key] ?? caracs[key.toUpperCase()] ?? caracs[key.toLowerCase()];
  assert.equal(caracOf('F'), cheval.stats.F, `F du Cheval (${JSON.stringify(caracs)})`);
  assert.equal(caracOf('CC'), cheval.stats.CC, 'CC du Cheval');
  assert.equal(now.mount.maxHp, cheval.wounds, `PV du Cheval (hp=${now.mount.hp}, maxHp=${now.mount.maxHp})`);
  assert.deepEqual(errors, [], 'aucune erreur de page après le scénario 1');
  console.log('PASS 1 — monture déclarée par la fiche : aperçu nommé, profil Cheval créé');

  // 2. Renommage : même espèce, profil non reconstruit (marqueur posé par le Store avant la mise à jour).
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.updateProfile('monture-pj', { notes: 'marqueur-scenario-2' }); });
  await setFiche({ espece: 'E0-P-077', nom: 'Éclair' });
  await openUpdate();
  await expect(mountLine()).toContainText('renommée');
  await expect(mountLine()).toContainText('Tonnerre'); await expect(mountLine()).toContainText('Éclair');
  await apply();
  now = await state();
  assert.equal(now.declared?.name, 'Éclair'); assert.equal(now.mount.name, 'Éclair');
  assert.equal(now.mount.notes, 'marqueur-scenario-2', 'profil de la monture non reconstruit');
  console.log('PASS 2 — renommage annoncé, marqueur du profil conservé');

  // 3. Fiche inchangée, monture renommée dans l'outil : le nom de l'outil est gardé.
  await page.evaluate(async () => {
    const { Store } = await import('/js/main.js'); const mount = Store.getProfile('monture-pj'), pj = Store.getProfile('pj');
    await Store.setProfileMount('pj', { template: mount, bestiaryId: pj.extensions.v5.declaredMount.bestiaryId, name: 'Foudre' });
    await Store.updateProfile('monture-pj', { notes: 'marqueur-scenario-3' });
  });
  now = await state(); assert.equal(now.declared.name, 'Foudre', 'renommage fait dans l’outil');
  await setFiche({ espece: 'E0-P-077', nom: 'Éclair' });
  await page.locator('#btn-menu').click(); await page.locator('#workspace-fiche-sync').click();
  await expect(page.locator('.fiche-sync-view')).toBeVisible();
  await expect(page.locator('.fiche-sync-view')).not.toContainText('renommée');
  const applyButton = page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true });
  if (await applyButton.isEnabled()) { await applyButton.click(); await expect(page.locator('.fiche-sync-view')).toHaveCount(0); }
  else { await page.getByRole('button', { name: 'Fermer', exact: true }).click(); }
  now = await state();
  assert.equal(now.declared?.name, 'Foudre', 'nom de l’outil gardé'); assert.equal(now.mount.name, 'Foudre'); assert.equal(now.mount.notes, 'marqueur-scenario-3');
  console.log('PASS 3 — fiche inchangée : le nom de l’outil est gardé');

  // 4. Retrait explicite (monture: null).
  await setFiche(null);
  await openUpdate();
  await expect(mountLine()).toContainText('retirée du profil');
  await apply();
  now = await state();
  assert.equal(now.declared, null, 'plus de monture déclarée'); assert.ok(now.mount, 'le profil de la monture reste en bibliothèque');
  console.log('PASS 4 — retrait annoncé puis appliqué');

  // 5. Clé inconnue : avertissement qui nomme la clé, rien n'est modifié.
  const before5 = await state();
  await setFiche({ espece: 'E0-P-INCONNUE', nom: 'Fantôme' });
  await page.locator('#btn-menu').click(); await page.locator('#workspace-fiche-sync').click();
  await expect(page.locator('.fiche-sync-view')).toBeVisible();
  await expect(page.locator('.fiche-sync-view')).toContainText('E0-P-INCONNUE');
  await expect(mountLine()).toHaveCount(0);
  const apply5 = page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true });
  if (await apply5.isEnabled()) { await apply5.click(); await expect(page.locator('.fiche-sync-view')).toHaveCount(0); }
  else await page.getByRole('button', { name: 'Fermer', exact: true }).click();
  const after5 = await state();
  assert.deepEqual(after5.declared, before5.declared); assert.deepEqual(after5.mount, before5.mount);
  console.log('PASS 5 — clé inconnue : avertissement nommant la clé, monture intacte');

  // 6. Annulation d'une création (profil de monture supprimé au préalable pour rejouer le scénario 1 complet).
  await page.evaluate(async () => { const { Store } = await import('/js/main.js'); await Store.removeProfile('monture-pj'); });
  const before6 = await state(); assert.equal(before6.declared, null); assert.equal(before6.mount, null);
  await setFiche({ espece: 'E0-P-077', nom: 'Tonnerre' });
  await openUpdate();
  await expect(mountLine()).toContainText('Tonnerre');
  await apply();
  now = await state(); assert.equal(now.declared?.name, 'Tonnerre'); assert.equal(now.mount?.name, 'Tonnerre');
  await expect(page.locator('#btn-undo')).toBeEnabled();
  await page.locator('#btn-undo').click();
  await expect.poll(async () => (await state()).declared).toBeNull();
  const after6 = await state();
  assert.equal(after6.mount, null, 'profil de la monture retiré par ↶');
  console.log('PASS 6 — ↶ rend l’état d’avant la création');

  assert.deepEqual(errors, [], 'aucune erreur de page ni de console');
  assert.deepEqual(requested, [], 'aucune requête hors du serveur local');
  console.log('PASS — monture de la fiche : interface réelle (menu, aperçu, bestiaire, application, ↶), sans réseau');
}
main().catch(error => { console.error(`FAIL — monture fiche browser: ${error.stack || error.message}`); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); });
