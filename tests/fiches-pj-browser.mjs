/** Independent browser receipt for fiche sync. No Firebase/network account is used. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
const root = fileURLToPath(new URL('..', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const route = (req.url || '/').split('?')[0];
  if (route === '/control-harness.html') { res.writeHead(200, { 'Content-Type': mime['.html'] }); res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Recette fiches PJ</title><main id="mount"></main></html>'); return; }
  const path = join(root, normalize(decodeURIComponent(route)));
  try { assert.ok(path.startsWith(root)); assert.ok(statSync(path).isFile()); res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path)); }
  catch { res.writeHead(404); res.end('Not found'); }
});
const weapon = (id, extra = {}) => ({ id, baseId: 'fixture-same-model', catalogVersion: 'fixture-v1', kind: 'weapon', name: 'Épée de recette', category: 'Base', damage: 'BF+4', reach: 'Moyenne', range: '', ap: null, locations: [], layer: 'none', keywords: [{ id: 'unknown-test-keyword', parameter: 'valeur textuelle' }], notes: '<img src=x onerror="alert(1)">', source: 'Campagne', custom: true, ...extra });
let browser;
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(edge) ? edge : chromium.executablePath());
  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ serviceWorkers: 'block' }); const page = await context.newPage();
  const errors = []; const dialogs = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
  await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin + '/control-harness.html');
  await page.evaluate(async ({ fixture, equipment }) => {
    const { createStore } = await import('/js/core/store.js');
    const { initFicheSyncView } = await import('/js/ui/fiche-sync-view.js');
    let saved = null;
    const persistence = { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
    const store = createStore({ persistence }); await store.ready;
    const legacy = { id: 'legacy', type: 'attack', base: 35, note: 'Ancienne épée', damage: 6, mod: -10, targetId: 'enemy', qualities: [], extensions: {} };
    const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, armor: { head: 0, body: 0, arms: 0, legs: 0 }, caracs: { F: 30 }, diceLines: [legacy] };
    await store.addProfile(profile);
    await store.savePersistentCharacter({ id: 'pc', name: 'Caelel', hp: 8, maxHp: 14, states: ['Sonné|3'] });
    await store.saveEncounter({ id: 'enc', title: 'Recette', entries: [{ id: 'entry', profileId: 'pj', quantity: 1, zone: 'active', persistentCharacterId: 'pc' }] });
    await store.launchEncounter('enc');
    const actor = store.listParticipants()[0]; await store.updateParticipant(actor.id, { hp: 8, maxHp: 14, states: ['Sonné|3'] });
    const harness = window.harness = { store, data: { ...fixture, equipment }, sourceRevision: 'r1', sourceCalls: 0, applied: 0 };
    const source = { async getUser() { return { name: 'MJ simulé' }; }, async signIn() { return { name: 'MJ simulé' }; }, async signOut() {}, async fetchAll() { harness.sourceCalls++; if (harness.pauseNextFetch) { harness.pauseNextFetch = false; await new Promise(resolve => { harness.sourceWaiting = true; harness.releaseSource = resolve; }); harness.sourceWaiting = false; } return [{ charId: 'caelel', data: structuredClone(harness.data), metadata: { schemaVersion: 4, revision: harness.sourceRevision }, status: 'ok' }]; } };
    const view = initFicheSyncView({ mount: document.querySelector('#mount'), source, getContext: () => ({ profiles: store.listProfiles(), participants: store.listParticipants(), revision: store.getLocalRevision() }), callbacks: { async onApply(entries, options) { await store.applyFicheSync(entries, options); harness.applied++; } } });
    harness.view = view; await view.start();
  }, { fixture, equipment: [weapon('one'), weapon('two')] });
  await expect(page.getByRole('heading', { name: 'Actions issues des armes et boucliers' })).toBeVisible();
  await expect(page.locator('[data-key="equipment:caelel:one:attack"]')).toHaveValue('');
  await expect(page.locator('#mount')).toContainText('8/14 → 12/18 PV');
  await page.locator('[data-key="adopt:caelel:one:attack"]').selectOption('legacy');
  const skillValue = await page.locator('[data-key="equipment:caelel:one:attack"] option').evaluateAll(options => options.find(option => option.textContent.startsWith('Corps à corps (Base)'))?.value);
  assert.ok(skillValue); await page.locator('[data-key="equipment:caelel:one:attack"]').selectOption(skillValue);
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.harness.applied)).toBe(1);
  const applied = await page.evaluate(() => {
    const store = window.harness.store;
    return { profile: store.getProfile('pj'), actor: store.listParticipants()[0], sourceCalls: window.harness.sourceCalls, scene: store.getActiveScene(), revision: store.getLocalRevision() };
  });
  assert.equal(applied.sourceCalls, 2, 'source re-read before apply');
  assert.equal(applied.profile.equipment.length, 2);
  assert.equal(applied.actor.hp, 12); assert.equal(applied.actor.maxHp, 18); assert.equal(applied.scene.participants[0].hp, 12);
  assert.ok(applied.actor.states.some(state => state.name === 'Sonné')); assert.equal(applied.actor.actions.filter(action => action.id === 'legacy').length, 1);
  assert.equal(applied.actor.actions.find(action => action.id === 'legacy').mod, -10);
  assert.equal(applied.actor.actions.find(action => action.id === 'legacy').targetId, 'enemy');
  assert.equal(new Set(applied.actor.actions.map(action => action.id)).size, applied.actor.actions.length);
  assert.deepEqual(dialogs, [], 'source notes stay inert');

  // Source stale: updated equipment/revision after preview must not apply.
  await page.getByRole('button', { name: 'Relire les fiches', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true })).toBeEnabled();
  await page.evaluate(() => { window.harness.data.equipment[0].name = 'Renommage source après aperçu'; window.harness.sourceRevision = 'r2'; });
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Une fiche a changé');
  assert.equal(await page.evaluate(() => window.harness.applied), 1);
  assert.equal(await page.evaluate(() => window.harness.store.getLocalRevision()), applied.revision);

  // Local stale: changed profile/session after preview must not apply or hit source again.
  await page.getByRole('button', { name: 'Relire les fiches', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true })).toBeEnabled();
  const localState = await page.evaluate(async () => { const h = window.harness; await h.store.updateProfile('pj', { notes: 'changement local depuis aperçu' }); return { sourceCalls: h.sourceCalls, revision: h.store.getLocalRevision() }; });
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('La séance a changé');
  assert.equal(await page.evaluate(() => window.harness.applied), 1);
  assert.equal(await page.evaluate(() => window.harness.sourceCalls), localState.sourceCalls);

  // Local edits during the asynchronous source re-read must invalidate the pending apply.
  await page.getByRole('button', { name: 'Relire les fiches', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true })).toBeEnabled();
  await page.evaluate(() => { window.harness.pauseNextFetch = true; });
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.harness.sourceWaiting === true)).toBe(true);
  await page.evaluate(async () => { const h = window.harness; const actor = h.store.listParticipants()[0]; await h.store.updateParticipant(actor.id, { notes: 'changement de scène pendant relecture source' }); h.releaseSource(); });
  await expect(page.getByRole('alert')).toContainText('La séance a changé');
  assert.equal(await page.evaluate(() => window.harness.applied), 1, 'local revision rechecked after source await');
  // Renamed source keeps IDs; [] removes source actions but keeps an independent local action.
  await page.evaluate(async () => { await window.harness.store.updateProfile('pj', { diceLines: [...window.harness.store.getProfile('pj').diceLines, { id: 'local-second', note: 'Action indépendante', type: 'skill', base: 33, mod: 0, damage: 0, qualities: [] }] }); });
  await page.getByRole('button', { name: 'Relire les fiches', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.harness.applied)).toBe(2);
  const renamed = await page.evaluate(() => window.harness.store.getProfile('pj'));
  assert.equal(renamed.diceLines.find(action => action.id === 'legacy').note, 'Renommage source après aperçu');
  await page.evaluate(() => { window.harness.data.equipment = []; window.harness.sourceRevision = 'r3'; });
  await page.getByRole('button', { name: 'Relire les fiches', exact: true }).click();
  await expect(page.locator('#mount')).toContainText('Actions source retirées');
  await page.getByRole('button', { name: 'Appliquer (1 fiche)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.harness.applied)).toBe(3);
  const cleared = await page.evaluate(() => window.harness.store.getProfile('pj'));
  assert.deepEqual(cleared.equipment, []); assert.deepEqual(cleared.diceLines.map(action => action.id), ['local-second']);
  assert.equal(await page.evaluate(() => window.harness.store.listParticipants()[0].hp), 12, 'no second health delta');

  // Offline rendering uses the already stored profile and embedded catalogue.
  await context.setOffline(true);
  const offline = await page.evaluate(async () => {
    const { getReferenceCatalogue } = await import('/js/core/reference-catalog.js');
    return { profile: window.harness.store.getProfile('pj'), keywords: getReferenceCatalogue().keywords.length };
  });
  assert.equal(offline.profile.talents.length > 0, true); assert.ok(offline.keywords >= 40);
  assert.deepEqual(errors, []);
  // Actual application/CSS receipt, independent from the unstyled contract harness.
  await context.setOffline(false);
  const visual = await context.newPage(); const visualErrors = [];
  visual.on('pageerror', error => visualErrors.push(error.stack || error.message));
  await visual.route('**/js/core/sync.js', route => route.fulfill({ contentType: 'text/javascript', body: `export function initFirebaseSync(onConnected) { document.querySelector('#login-screen')?.style.setProperty('display', 'none'); document.querySelector('#app-content')?.style.setProperty('display', 'block'); onConnected({ dbRef: 'isolated-test', onValue() {}, update() { return Promise.resolve(); } }); }` }));
  await visual.setViewportSize({ width: 1440, height: 1000 });
  await visual.goto(origin + '/index.html');
  await expect(visual.locator('#app-content')).toBeVisible().catch(error => { throw new Error(error.message + '\nPAGE ERRORS: ' + JSON.stringify(visualErrors)); });
  await visual.evaluate(async ({ fixture, equipment }) => {
    const { Store } = await import('/js/main.js'); await Store.ready;
    const { ficheSnapshot } = await import('/js/core/fiche-sync.js');
    await Store.addProfile({ id: 'visual-pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, initiative: 55, group: 'Recette des fiches', armor: { head: 0, body: 0, arms: 0, legs: 0 }, caracs: { F: 30, E: 43 }, diceLines: [] });
    const snapshot = ficheSnapshot('caelel', { ...fixture, equipment }, { schemaVersion: 4, revision: 'fixture-v1' });
    const skill = snapshot.skills.find(row => row.name === 'Corps à corps (Base)');
    await Store.applyFicheSync([{ charId: 'caelel', profileId: 'visual-pj', snapshot, equipmentLinks: { 'caelel:one:attack': skill.id, 'caelel:one:defense': skill.id } }]);
    await Store.savePersistentCharacter({ id: 'visual-pc', name: 'Caelel', hp: 12, maxHp: 18, states: ['Sonné|3'] });
    await Store.saveEncounter({ id: 'visual-encounter', title: 'Recette PJ : armes, talents et protection', entries: [{ id: 'visual-entry', profileId: 'visual-pj', quantity: 1, zone: 'active', persistentCharacterId: 'visual-pc' }] });
    await Store.launchEncounter('visual-encounter');
  }, { fixture, equipment: [weapon('one', { name: 'Épée longue personnalisée de la forêt de Loren', keywords: [{ id: 'empaleuse', parameter: '' }] }), weapon('shield', { name: 'Bouclier gravé de Caelel', kind: 'shield', ap: 2, damage: 'BF+2', keywords: [{ id: 'protectrice', parameter: '2' }] }), weapon('leather', { name: 'Veste de cuir', kind: 'armour', damage: '', reach: '', ap: 1, locations: ['body', 'rightArm'], layer: 'leather', keywords: [] }), weapon('plate', { name: 'Plastron et bras gauche rigides', kind: 'armour', damage: '', reach: '', ap: 3, locations: ['body', 'leftArm'], layer: 'rigid', keywords: [] })] });
  await visual.locator('#tab-library').click();
  const card = visual.locator('.workspace-space-library .workspace-profile-card').filter({ hasText: 'Caelel' });
  await expect(card).toHaveCount(1); await card.locator('.fiche-consultation > summary').click();
  await card.locator('.fiche-consultation > details').filter({ has: visual.locator('summary', { hasText: /^Talents/ }) }).locator(':scope > summary').click();
  await card.locator('.fiche-consultation > details').filter({ has: visual.locator('summary', { hasText: /^Équipement/ }) }).locator(':scope > summary').click();
  const output = join(root, 'tmp', 'fiches-pj-receipt'); mkdirSync(output, { recursive: true });
  for (const [name, width, height, theme] of [['desktop-light', 1440, 1000, 'light'], ['desktop-dark', 1440, 1000, 'dark'], ['mobile-light', 390, 900, 'light'], ['mobile-dark', 390, 900, 'dark']]) {
    await visual.setViewportSize({ width, height }); await visual.evaluate(theme => { document.documentElement.setAttribute('data-theme', theme); }, theme);
    const overflow = await visual.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    if (overflow.scroll > overflow.width + 1) { await visual.screenshot({ path: join(output, name + '-overflow.png'), fullPage: true }); console.error('OVERFLOW ELEMENTS — ' + JSON.stringify(await visual.evaluate(() => [...document.querySelectorAll('body *')].filter(node => { const rect=node.getBoundingClientRect(); return rect.height>0 && rect.width>0 && rect.right>document.documentElement.clientWidth+1; }).slice(-20).map(node => ({tag:node.tagName,id:node.id,class:node.className,rect:{left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right},text:node.textContent.slice(0,100)}))))); } assert.ok(overflow.scroll <= overflow.width + 1, `${name}: page horizontal overflow ${JSON.stringify(overflow)}`);
    await visual.screenshot({ path: join(output, name + '.png'), fullPage: true });
  }
  await visual.locator('#tab-combat').click();
  await expect(visual.locator('#workspace-play')).toBeVisible();
  await visual.setViewportSize({ width: 1440, height: 1000 });
  await visual.screenshot({ path: join(output, 'combat-desktop-dark.png'), fullPage: true });
  await visual.setViewportSize({ width: 390, height: 900 });
  await visual.screenshot({ path: join(output, 'combat-mobile-dark.png'), fullPage: true });
  // Historical overview must route source attacks into the canonical resolver.
  const legacyBefore = await visual.evaluate(async () => {
    const { Store } = await import('/js/main.js');
    const actor = Store.listParticipants().find(row => row.profileId === 'visual-pj');
    const action = actor.actions.find(row => row.extensions?.fiche?.equipmentId === 'shield' && row.type === 'attack');
    if (!action) throw new Error('Expected source shield action');
    await Store.addDiceLine({ ...action, id: 'legacy-overview-test', participantId: actor.id, extensions: { ...action.extensions, profileActionId: action.id } });
    const line = Store.getDiceLines().find(row => row.id === 'legacy-overview-test');
    const button = [...document.querySelectorAll('.mini-dice-line')].find(row => row.dataset.diceId === line.id)?.querySelector('.btn-roll');
    if (!button) throw new Error('Historical attack button absent');
    const before = { revision: Store.getLocalRevision(), health: Store.listParticipants().map(row => [row.id, row.hp]), note: line.note };
    button.click();
    return before;
  });
  await expect(visual.locator('.workspace-resolution [data-action-key][aria-pressed="true"]')).toContainText(legacyBefore.note);
  await expect(visual.locator('.workspace-resolution [data-roll-input="attack"]')).toHaveValue('');
  assert.deepEqual(await visual.evaluate(async () => { const { Store } = await import('/js/main.js'); return { revision: Store.getLocalRevision(), health: Store.listParticipants().map(row => [row.id, row.hp]) }; }), { revision: legacyBefore.revision, health: legacyBefore.health }, 'historical attack navigation must not roll or mutate combat');
  console.log('PASS — historical attack button selects the canonical action without rolling or damage');
  // Actual combat UI: ammunition compatibility and Inoffensive's two gravities.
  await visual.setViewportSize({ width: 1440, height: 1000 });
  await visual.evaluate(async ({ bow, arrows }) => {
    const { Store } = await import('/js/main.js');
    const actor = Store.listParticipants().find(row => row.profileId === 'visual-pj');
    await Store.updateParticipant(actor.id, { equipment: [...actor.equipment, bow, arrows], actions: [...actor.actions,
      { id: 'inoff-test', type: 'attack', note: 'Inoffensive recette', base: 90, mod: 0, damage: 3, qualities: ['inoffensive'], extensions: {} },
      { id: 'bow-test', type: 'attack', note: 'Arc de recette', base: 90, mod: 0, damage: 3, qualities: [], extensions: { equipment: bow, fiche: { charId: 'caelel', equipmentId: bow.id, role: 'attack', requiresLink: false } } }
    ] });
    await Store.addParticipant({ id: 'visual-target', name: 'Cible recette', kind: 'PNJ', hp: 30, maxHp: 30, initiative: 10, caracs: { E: 0 }, armorLocations: { head: 0, body: 0, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 }, actions: [], states: [], zone: 'active' });
  }, { bow: weapon('bow-test', { name: 'Arc de recette', category: 'Arc', range: '50', keywords: [] }), arrows: weapon('arrows', { kind: 'ammunition', name: 'Flèches recette', category: 'Arc', damage: '', reach: '', range: '', keywords: [{ id: 'empaleuse', parameter: '' }] }) });
  const resolution = visual.locator('.workspace-resolution');
  await resolution.getByRole('button', { name: /Arc de recette/ }).first().click();
  const ammo = resolution.getByRole('combobox', { name: 'Munition', exact: true });
  await expect(ammo).toBeVisible().catch(async error => { console.error('AMMO DEBUG — '+JSON.stringify(await visual.evaluate(async () => { const { Store } = await import('/js/main.js'); return { participants:Store.listParticipants().map(row=>({name:row.name,equipment:row.equipment?.map(item=>({id:item.id,kind:item.kind,category:item.category,range:item.range})),actions:row.actions?.map(action=>({note:action.note,fiche:action.extensions?.fiche}))})), resolution:document.querySelector('.workspace-resolution')?.textContent }; }))); throw error; }); await expect(ammo.locator('option[value="arrows"]')).toHaveCount(1);
  await ammo.selectOption('arrows');
  await resolution.getByRole('button', { name: /Inoffensive recette/ }).first().click();
  await expect(resolution.getByRole('combobox', { name: 'Munition', exact: true })).toHaveCount(0, 'no ammunition on melee attack');
  await resolution.getByRole('button', { name: 'Cible recette', exact: true }).click();
  await resolution.locator('[data-roll-input="attack"]').fill('33');
  await resolution.getByRole('button', { name: 'Calculer', exact: true }).click();
  await resolution.locator('[data-roll-input="critical-location"]').fill('55');
  await resolution.getByRole('button', { name: 'Calculer', exact: true }).click();
  await resolution.locator('[data-roll-input="critical-effect"]').fill('60');
  await resolution.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(resolution.locator('[data-roll-input="critical-effect-alternative"]')).toBeVisible();
  await expect(resolution.locator('[data-focus-key="apply"]')).toBeDisabled();
  await resolution.locator('[data-roll-input="critical-effect-alternative"]').fill('20');
  await resolution.getByRole('button', { name: 'Calculer', exact: true }).click();
  await expect(resolution.locator('[data-focus-key="apply"]')).toBeEnabled();
  await expect(resolution.locator('.workspace-critical-effect')).toContainText('20');
  await visual.screenshot({ path: join(output, 'inoffensive-two-gravities-desktop.png'), fullPage: true });
  const targetUnchanged = await visual.evaluate(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(row => row.id === 'visual-target').hp; });
  assert.equal(targetUnchanged, 30, 'preview has not applied damage/critical');
  console.log('PASS — real combat UI: ranged ammunition offered, no melee ammunition, Inoffensive needs both gravities and retains20 from60/20');  assert.deepEqual(visualErrors, []);
  console.log('SCREENSHOTS — ' + output);  console.log('PASS — fiche sync browser: source mock, preview, explicit skill/adoption, unique scene actions, signed health, source/local stale refusal, stable rename/removal and offline consultation');
}
main().catch(error => { console.error(`FAIL — fiches PJ browser: ${error.stack || error.message}`); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); });
