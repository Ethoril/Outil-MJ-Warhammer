import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const base = '/Outil-MJ-Warhammer/';
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    assert.ok(pathname.startsWith(base));
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    assert.ok(path.startsWith(resolve(root) + sep) && statSync(path).isFile());
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end('Not found'); }
});
let browser;
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined) });
  const context = await browser.newContext({ serviceWorkers: 'block' }), page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  await page.locator('#tab-combat').click();
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    await Store.addParticipant({ id: 'f2a-npc', name: 'Garde', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 12, maxHp: 12, initiative: 40, caracs: { I: 40 } });
    await Store.addParticipant({ id: 'f2a-pj', name: 'Aline', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 0, caracs: { I: 0 } });
    await Store.setOrderMode('manual'); await Store.moveInOrder('f2a-npc','f2a-pj');
  });
  await page.locator('#combat-banner .combat-banner-primary').click({ timeout: 10000 });
  const dialog = page.locator('dialog.tool-sheet');
  await dialog.waitFor({ state: 'visible' });
  assert.match(await dialog.innerText(),/ordre manuel existe déjà/i,'le MJ est averti que son ordre sera remplacé');
  const npcDie = Number(await dialog.locator('input[name="die:f2a-npc"]').inputValue());
  assert.ok(npcDie >= 1 && npcDie <= 10);
  await dialog.locator('input[name="characteristic:f2a-pj"]').fill('35');
  await dialog.locator('input[name="die:f2a-pj"]').fill('8');
  await dialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  assert.equal(Number(await dialog.locator('input[name="die:f2a-npc"]').inputValue()), npcDie, 'le d10 PNJ ne change pas au recalcul');
  await dialog.locator('select[name="surprisedCamp"]').selectOption('ennemi');
  await dialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  assert.equal(Number(await dialog.locator('input[name="die:f2a-npc"]').inputValue()), npcDie, 'le d10 PNJ reste identique après un second calcul');
  await dialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  await page.waitForFunction(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().round === 1;
  });
  const state = await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    const combat = Store.getCombat(); return { round: combat.round, actor: combat.currentActorId, order: combat.order, participants: Store.listParticipants() };
  });
  assert.equal(state.round, 1);
  assert.equal(state.actor, state.order[0]);
  assert.equal(state.participants.find(row => row.id === 'f2a-pj').extensions.v5.combatInitiative.characteristic, 35);
  assert.equal(state.participants.find(row => row.id === 'f2a-pj').initiative, 0);
  await page.locator('#tab-combat').click();
  const pjCombatScore=state.participants.find(row=>row.id==='f2a-pj').extensions.v5.combatInitiative.score;
  assert.match(await page.locator('#init-tracker .init-token').filter({hasText:'Aline'}).innerText(),new RegExp(`Combat ${pjCombatScore} · I 0`));
  assert.match(await page.locator('.actor-card[data-id="f2a-pj"] .init-badge').innerText(),new RegExp(`I 0 · ordre ${pjCombatScore}`));
  assert.ok(state.participants.find(row => row.id === 'f2a-npc').states.some(row => row.key === 'surpris'));
  assert.ok(!state.participants.find(row => row.id === 'f2a-pj').states.some(row => row.key === 'surpris'));
  const exactApplied = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  await page.locator('#btn-undo').click();
  const undone = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const combat = Store.getCombat(); return { round: combat.round, initialized: Store.listParticipants().some(row => row.extensions?.v5?.combatInitiative), surprise: Store.listParticipants().some(row => row.states?.some(state => state.key === 'surpris')) }; });
  assert.deepEqual(undone, { round: 0, initialized: false, surprise: false }, 'Undo annule exactement jets et surprise de l’initialisation');
  await page.locator('#btn-menu').click();
  await page.locator('#btn-redo').click();
  const exactRedone = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return JSON.parse(Store.getFullJSON()); });
  assert.deepEqual(exactRedone.combat.order, exactApplied.combat.order);
  assert.equal(exactRedone.combat.participants.find(row => row.id === 'f2a-npc').extensions.v5.combatInitiative.die, npcDie);
  assert.ok(exactRedone.combat.participants.find(row => row.id === 'f2a-npc').states.some(row => row.key === 'surpris'));
  // Reload is a read/recovery path: it must preserve the captured PNJ die and never reroll it.
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const afterReload = await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready;
    const npc = Store.listParticipants().find(row => row.id === 'f2a-npc');
    return { die: npc.extensions.v5.combatInitiative.die, round: Store.getCombat().round, order: Store.getCombat().order };
  });
  assert.equal(afterReload.die, npcDie);
  assert.equal(afterReload.round, 1);
  assert.deepEqual(afterReload.order, state.order);

  // The same main.js advanceTurn path is bound to the N shortcut at Round 0.
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: ['f2b-npc', 'f2b-pj'], orderMode: 'automatic', participants: [
      { id: 'f2b-npc', name: 'Sentinelle', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 12, maxHp: 12, initiative: 40, caracs: { I: 40 }, states: [], extensions: { v5: {} } },
      { id: 'f2b-pj', name: 'Béatrice', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 38, caracs: { I: 38 }, states: [], extensions: { v5: {} } }
    ] }, activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  });
  await page.keyboard.press('n');
  const shortcutDialog = page.locator('dialog.tool-sheet'); await shortcutDialog.waitFor({ state: 'visible' });
  const shortcutDie = Number(await shortcutDialog.locator('input[name="die:f2b-npc"]').inputValue());
  await shortcutDialog.locator('input[name="die:f2b-pj"]').fill('4');
  await shortcutDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await shortcutDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().round === 1; });
  const shortcutState = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.listParticipants().map(row => [row.id, row.extensions.v5.combatInitiative.die]); });
  assert.equal(shortcutState.find(row => row[0] === 'f2b-npc')[1], shortcutDie);

  // The legacy DOM.combat.btnStart listener is retained separately; its panel is hidden in the current workspace, so force-click only verifies that binding.
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.resetCombat();
    await Store.addParticipant({ id: 'f2a-fresh-npc', name: 'Nouvelle sentinelle', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 12, maxHp: 12, initiative: 40, caracs: { I: 40 } });
    await Store.addParticipant({ id: 'f2a-fresh-pj', name: 'Nouvelle héroïne', kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, initiative: 38, caracs: { I: 38 } });
  });
  await page.evaluate(() => document.querySelector('#btn-start').click());
  const legacyStartDialog = page.locator('dialog.tool-sheet'); await legacyStartDialog.waitFor({ state: 'visible' });
  const freshDie = Number(await legacyStartDialog.locator('input[name="die:f2a-fresh-npc"]').inputValue());
  await legacyStartDialog.locator('input[name="die:f2a-fresh-pj"]').fill('4');
  await legacyStartDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await legacyStartDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const freshCombat = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { round: Store.getCombat().round, die: Store.listParticipants().find(row => row.id === 'f2a-fresh-npc')?.extensions?.v5?.combatInitiative?.die }; });
  assert.equal(freshCombat.round, 1, 'le handler historique démarre aussi un combat nouvellement vidé');
  assert.equal(freshCombat.die, freshDie);

  // The encounter-list launch route stages the scene. Closing the dialog is a true cancel.
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], orderMode: 'automatic', participants: [] }, activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
    await Store.addProfile({ id: 'f2a-profile-npc', name: 'Garde de la porte', kind: 'PNJ', hp: 12, initiative: 40, caracs: { I: 40 } });
    await Store.addProfile({ id: 'f2a-profile-pj', name: 'Maëlys', kind: 'PJ', hp: 12, initiative: 37, caracs: { I: 37 } });
    await Store.saveEncounter({ id: 'f2a-encounter', title: 'Porte nord', entries: [
      { id: 'f2a-entry-npc', profileId: 'f2a-profile-npc', quantity: 1, camp: 'ennemi', zone: 'active' },
      { id: 'f2a-entry-pj', profileId: 'f2a-profile-pj', quantity: 1, camp: 'pj', zone: 'active' }
    ] });
  });
  await page.locator('#tab-prepare').click();
  const encounterLaunch = page.locator('#workspace-prepare [data-workspace-action="launch-encounter"][data-encounter-id="f2a-encounter"]');
  await encounterLaunch.waitFor({ state: 'visible' });
  const encounterBefore = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { rev: Store.getLocalRevision(), scene: Store.getActiveScene(), count: Store.getCombat().participants.size }; });
  await encounterLaunch.click();
  const encounterDialog = page.locator('dialog.tool-sheet'); await encounterDialog.waitFor({ state: 'visible' });
  const stagedNpcIds = await encounterDialog.locator('input[name^="die:"]').evaluateAll(inputs => inputs.map(input => input.name.slice(4)));
  assert.equal(new Set(stagedNpcIds).size, stagedNpcIds.length, 'identifiants distincts dans le dialogue staged');
  await encounterDialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  const cancelledEncounter = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { rev: Store.getLocalRevision(), scene: Store.getActiveScene(), count: Store.getCombat().participants.size }; });
  assert.deepEqual(cancelledEncounter, encounterBefore, 'annuler le lancement staged ne modifie ni scène ni combat');

  // Open the editor callback route and launch; input is completed in the staged init dialog.
  await page.locator('#tab-combat').click();
  await page.evaluate(() => { window.__f2OriginalRandom = Math.random; let draw = 0; Math.random = () => 0.8 + draw++ * 0.000001; });
  await page.locator('#workspace-play [data-workspace-action="begin-encounter"]').click();
  const prepareDialog = page.locator('dialog.tool-sheet'); await prepareDialog.waitFor({ state: 'visible' });
  await prepareDialog.getByLabel('Profil').selectOption('f2a-profile-npc');
  await prepareDialog.getByLabel('Camp').selectOption('ennemi');
  await prepareDialog.getByLabel('Zone').selectOption('active');
  await prepareDialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await prepareDialog.getByLabel('Profil').selectOption('f2a-profile-pj');
  await prepareDialog.getByLabel('Camp').selectOption('pj');
  await prepareDialog.getByLabel('Zone').selectOption('active');
  await prepareDialog.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const titleInput = prepareDialog.getByLabel('Titre'); await titleInput.fill('Via préparation'); await titleInput.dispatchEvent('change');
  const compositionText = await prepareDialog.locator('.encounter-composition').innerText();
  assert.match(compositionText, /Garde de la porte.*actif/);
  assert.match(compositionText, /Maëlys.*actif/);
  assert.equal(await prepareDialog.locator('.encounter-composition li').count(), 2, 'l’éditeur conserve les deux entrées avec des UID distincts');
  await prepareDialog.getByRole('button', { name: 'Lancer la rencontre' }).click();
  const callbackDialog = page.locator('dialog.tool-sheet'); await callbackDialog.waitFor({ state: 'visible' });
  await callbackDialog.locator('input[name^="die:"]:not([readonly])').fill('6');
  await callbackDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await callbackDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Boolean(Store.getActiveScene()); });
  const launchedScene = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getActiveScene(); });
  assert.equal(launchedScene.title, 'Via préparation');
  assert.equal(new Set(launchedScene.participants.map(row => row.id)).size, launchedScene.participants.length, 'UIDs uniques après lancement');
  assert.equal(launchedScene.participants.length, 2);
  const launchNpc = launchedScene.participants.find(row => row.name === 'Garde de la porte');
  const launchDie = launchNpc.extensions.v5.combatInitiative.die;
  assert.equal(launchDie, 9, 'le d10 PNJ initial est contrôlé pour tester une éventuelle relance');
  await page.evaluate(() => { let draw = 0; Math.random = () => 0.01 + draw++ * 0.000001; });
  await page.locator('#combat-banner .combat-banner-primary').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().round === 1 || Boolean(document.querySelector('dialog.tool-sheet')); }, { timeout: 5000 });
  assert.equal(await page.locator('dialog.tool-sheet').count(), 0, 'Démarrer après le lancement initialisé ne redemande aucun jet');
  const afterEncounterStart = await page.evaluate(async id => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const combat = Store.getCombat(); return { round: combat.round, die: combat.participants.get(id)?.extensions?.v5?.combatInitiative?.die, sceneId: Store.getActiveScene()?.id }; }, launchNpc.id);
  assert.deepEqual(afterEncounterStart, { round: 1, die: launchDie, sceneId: launchedScene.id }, 'Démarrer conserve scène et d10 capturé au lancement');
  await page.evaluate(() => { Math.random = window.__f2OriginalRandom; delete window.__f2OriginalRandom; });
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare [data-workspace-action="suspend-scene"]').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getActiveScene() === null; });
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.addParticipant({id:'f2a-after-suspend',name:'Combat libre suivant',kind:'PNJ',camp:'ennemi',zone:'active',hp:10,maxHp:10,initiative:40,caracs:{I:40}});});
  await page.locator('#tab-combat').click();await page.locator('#combat-banner .combat-banner-primary').click();
  const afterSuspendDialog=page.locator('dialog.tool-sheet');await afterSuspendDialog.waitFor({state:'visible'});
  assert.equal(await afterSuspendDialog.locator('input[name="die:f2a-after-suspend"]').count(),1,'après suspension, le combat libre suivant redemande un d10');
  await afterSuspendDialog.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.resetCombat();});
  await page.locator('#btn-menu').click();
  await page.locator('#app-menu').getByRole('button', { name: 'Reprendre « Via préparation »' }).click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getActiveScene()?.status === 'active'; });
  const resumed = await page.evaluate(async id => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { round: Store.getCombat().round, die: Store.getCombat().participants.get(id)?.extensions?.v5?.combatInitiative?.die }; }, launchNpc.id);
  assert.deepEqual(resumed, { round: 1, die: launchDie }, 'reprendre une scène suspendue conserve Round et d10 sans redemander de jet');

  // Restart asks for confirmation, stages fresh initiative, and Cancel leaves exact state intact.
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#btn-menu').click();
  await page.locator('#workspace-restart-combat').click();
  const restartDialog = page.locator('dialog.tool-sheet'); await restartDialog.waitFor({ state: 'visible' });
  const beforeRestartCancel = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { rev: Store.getLocalRevision(), scene: Store.getActiveScene(), combat: Store.getCombat() }; });
  await restartDialog.getByRole('button', { name: 'Annuler', exact: true }).click();
  const afterRestartCancel = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { rev: Store.getLocalRevision(), scene: Store.getActiveScene(), combat: Store.getCombat() }; });
  assert.deepEqual(afterRestartCancel, beforeRestartCancel, 'annuler recommencer conserve le combat initialisé');
  await page.evaluate(() => { window.__f2RestartRandom = Math.random; let draw = 0; Math.random = () => 0.1 + draw++ * 0.000001; });
  await page.locator('#btn-menu').click(); await page.locator('#workspace-restart-combat').click();
  const applyRestart = page.locator('dialog.tool-sheet'); await applyRestart.waitFor({ state: 'visible' });
  const restartNpcDie = Number(await applyRestart.locator('input[name^="die:"]').first().inputValue());
  assert.equal(restartNpcDie, 2, 'recommencer tire un nouveau d10 PNJ distinct du d10 9 conservé au lancement');
  await applyRestart.locator('input[name^="die:"]:not([readonly])').fill('4');
  await applyRestart.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await applyRestart.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const restarted = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const scene = Store.getActiveScene(); return { round: Store.getCombat().round, sceneId: scene?.id, scopeId: scene?.extensions?.v5?.combatScopeId, die: scene?.participants[0]?.extensions?.v5?.combatInitiative?.die }; });
  assert.equal(restarted.round, 0, 'recommencer revient au Round 0');
  assert.equal(restarted.sceneId, launchedScene.id, 'le contrat conserve l’identité de scène');
  assert.ok(restarted.scopeId&&restarted.scopeId!==launchedScene.id,'le redémarrage renouvelle la portée des turnId sans changer la scène');
  assert.equal(restarted.die, restartNpcDie);
  await page.evaluate(() => { Math.random = window.__f2RestartRandom; delete window.__f2RestartRandom; });

  // Three-way tie through the visible direct-order selector; no participant IDs are supplied by the runner.
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js');
    await Store.resetCombat();
    for (const [index, name] of ['Alba', 'Basile', 'Cléo'].entries()) await Store.addParticipant({ id: `f2a-tie-${index}`, name, kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, initiative: 40, caracs: { I: 40 } });
  });
  await page.locator('#tab-combat').click();
  const tieStart = page.locator('#combat-banner .combat-banner-primary'); await tieStart.waitFor({ state: 'visible' }); await tieStart.click();
  const tieDialog = page.locator('dialog.tool-sheet'); await tieDialog.waitFor({ state: 'visible' });
  for (const input of await tieDialog.locator('input[name^="die:"]').all()) await input.fill('5');
  await tieDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  assert.equal(await tieDialog.locator('select[data-kind="tieOrder"]').count(), 0, 'à trois, aucun tournoi ni Test opposé n’est demandé');
  assert.match(await tieDialog.locator('[data-tie-area]').innerText(), /choisissez directement l’ordre/i);
  const tieChoice = tieDialog.locator('select[data-kind="tieChoice"]');
  assert.equal(await tieChoice.count(), 3, 'le MJ choisit une permutation complète');
  const chosenOrder = ['Cléo', 'Basile', 'Alba'];
  for (const [index, name] of chosenOrder.entries()) await tieChoice.nth(index).selectOption({ label: `${name} · pj · PJ` });
  await tieDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await tieDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const tiedState = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const full = JSON.parse(Store.getFullJSON()); return { order: Store.getCombat().order, people: Store.listParticipants(), full, initiative: full.combat.participants[0]?.extensions?.v5?.combatInitiative, resolution: full.extensions?.v5?.combatInitiativeResolution }; });
  assert.deepEqual(tiedState.order.map(id => tiedState.people.find(person => person.id === id)?.name), chosenOrder, 'le vrai dialogue applique la permutation choisie');
  const tieAudit = tiedState.resolution?.tieGroups?.[0];
  assert.equal(tieAudit?.matches?.length, 0, 'trois ex aequo ne produisent pas d’opposition');
  assert.deepEqual(tieAudit.participantIds.map(id => tiedState.people.find(person => person.id === id)?.name), ['Alba', 'Basile', 'Cléo']);
  assert.deepEqual(tieAudit.bracketOrder, []);
  assert.deepEqual(tieAudit.chosenOrder.map(id => tiedState.people.find(person => person.id === id)?.name), chosenOrder);
  console.log(`equality audit persisted: direct chosen order for ${tieAudit.participantIds.length} participants`);
  await page.locator('#btn-undo').click();
  const tieUndo = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { round: Store.getCombat().round, initialized: Store.listParticipants().some(person => person.extensions?.v5?.combatInitiative), order: Store.getCombat().order }; });
  assert.equal(tieUndo.round, 0); assert.equal(tieUndo.initialized, false);
  assert.deepEqual(tieUndo.order.map(id => tiedState.people.find(person => person.id === id)?.name), ['Alba', 'Basile', 'Cléo']);
  await page.locator('#btn-menu').click(); await page.locator('#btn-redo').click();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const tieReload = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; const combat = Store.getCombat(), full = JSON.parse(Store.getFullJSON()); return { order: combat.order, initiative: Store.listParticipants()[0]?.extensions?.v5?.combatInitiative, resolution: full.extensions?.v5?.combatInitiativeResolution }; });
  assert.deepEqual(tieReload.order, tiedState.order, 'reload conserve l’ordre choisi après les oppositions');
  assert.equal(tieReload.initiative.die, tiedState.initiative.die);
  assert.deepEqual(tieReload.resolution, tiedState.resolution, 'reload restitue exactement l’ordre direct choisi par le MJ');

  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.resetCombat();
    for (const [index, name] of ['Daria', 'Émile'].entries()) await Store.addParticipant({ id: `f2a-tie-two-${index}`, name, kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, initiative: 40, caracs: { I: 40 } });
  });
  await page.locator('#tab-combat').click();
  const twoStart = page.locator('#combat-banner .combat-banner-primary'); await twoStart.waitFor({ state: 'visible' }); await twoStart.click();
  const twoDialog = page.locator('dialog.tool-sheet'); await twoDialog.waitFor({ state: 'visible' });
  for (const input of await twoDialog.locator('input[name^="die:"]').all()) await input.fill('5');
  await twoDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  const twoBracket = twoDialog.locator('select[data-kind="tieOrder"]'); assert.equal(await twoBracket.count(), 2);
  await twoBracket.nth(0).selectOption({ label: 'Daria · pj · PJ' }); await twoBracket.nth(1).selectOption({ label: 'Émile · pj · PJ' });
  await twoDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  for (const roll of ['20', '80']) {
    const opposed = twoDialog.locator('[data-match-id]'); assert.equal(await opposed.count(), 1);
    await opposed.fill(roll); await twoDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  }
  const twoChoice = twoDialog.locator('select[data-kind="tieChoice"]'); assert.equal(await twoChoice.count(), 2);
  await twoChoice.nth(0).selectOption({ label: 'Émile · pj · PJ' }); await twoChoice.nth(1).selectOption({ label: 'Daria · pj · PJ' });
  await twoDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await twoDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const twoState = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const full = JSON.parse(Store.getFullJSON()); return { order: Store.getCombat().order, people: Store.listParticipants(), audit: full.extensions?.v5?.combatInitiativeResolution?.tieGroups?.[0] }; });
  assert.deepEqual(twoState.order.map(id => twoState.people.find(person => person.id === id)?.name), ['Émile', 'Daria']);
  assert.equal(twoState.audit.matches.length, 1, 'deux ex aequo produisent un seul Test opposé tracé');
  await page.locator('#tab-combat').click();
  await page.locator('#workspace-play [aria-label="Modifier Daria"]').click();
  const participantEditor = page.locator('dialog.tool-sheet'); await participantEditor.waitFor({ state: 'visible' });
  await participantEditor.locator('[data-order="up"]').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return Store.getCombat().order[0] === Store.listParticipants().find(person => person.name === 'Daria')?.id; });
  const manualOrder = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { mode: Store.getOrderMode(), names: Store.getCombat().order.map(id => Store.getCombat().participants.get(id)?.name) }; });
  assert.equal(manualOrder.mode, 'manual');
  assert.deepEqual(manualOrder.names, ['Daria', 'Émile']);
  await participantEditor.locator('[data-order="initiative"]').click();
  await page.waitForFunction(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const order = Store.getCombat().order, people = Store.listParticipants(); return order[0] === people.find(person => person.name === 'Émile')?.id; });
  const automaticOrder = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); return { mode: Store.getOrderMode(), names: Store.getCombat().order.map(id => Store.getCombat().participants.get(id)?.name) }; });
  assert.equal(automaticOrder.mode, 'automatic');
  assert.deepEqual(automaticOrder.names, ['Émile', 'Daria'], 'Trier par initiative restaure l’ordre résolu canonique');

  await participantEditor.getByRole('button', { name: 'Fermer', exact: true }).click();
  // A pre-Round 1 bench activation opens the same initiative dialog, keeps old dice, and captures the new PNJ die once.
  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.resetCombat();
    await Store.addParticipant({ id: 'f2a-pre-active', name: 'Déjà tiré', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 10, maxHp: 10, initiative: 40, caracs: { I: 40 } });
    await Store.addParticipant({ id: 'f2a-pre-bench', name: 'Renfort avant Round 1', kind: 'PNJ', camp: 'ennemi', zone: 'bench', hp: 10, maxHp: 10, initiative: 30, caracs: { I: 30 } });
    await Store.applyCombatInitialization(Store.previewCombatInitialization({ diceById: { 'f2a-pre-active': 5 } }));
  });
  const directAddition=await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');try{await Store.addParticipant({id:'f2a-direct-after-roll',name:'Ajout actif direct',kind:'PNJ',camp:'ennemi',zone:'active',hp:10,maxHp:10,initiative:35,caracs:{I:35}});return 'accepted';}catch(error){return error.code||error.message;}});
  assert.equal(directAddition,'COMBAT_INIT_REQUIRED','un ajout actif après le tirage doit passer par une saisie d’Initiative');
  assert.equal(await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.listParticipants().some(row=>row.id==='f2a-direct-after-roll');}),false,'le refus API ne laisse pas un combattant non initialisé dans la piste');
  await page.locator('#tab-combat').click();
  await page.locator('#workspace-play [aria-label="Faire entrer Renfort avant Round 1"]').click();
  const activationDialog=page.locator('dialog.tool-sheet');await activationDialog.waitFor({state:'visible'});
  assert.equal(await activationDialog.locator('input[name="die:f2a-pre-active"]').inputValue(),'5','le jet antérieur reste fixé');
  const preRoundDie=Number(await activationDialog.locator('input[name="die:f2a-pre-bench"]').inputValue());
  assert.ok(preRoundDie>=1&&preRoundDie<=10,'le nouveau PNJ reçoit son d10 avant le Round 1');
  await activationDialog.getByRole('button',{name:'Calculer / actualiser l’ordre'}).click();
  assert.equal(Number(await activationDialog.locator('input[name="die:f2a-pre-bench"]').inputValue()),preRoundDie);
  await activationDialog.getByRole('button',{name:'Confirmer et appliquer'}).click();
  const preRoundApplied=await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');return {round:Store.getCombat().round,participants:Store.listParticipants()};});
  assert.equal(preRoundApplied.round,0);assert.equal(preRoundApplied.participants.find(row=>row.id==='f2a-pre-bench').zone,'active');
  assert.equal(preRoundApplied.participants.find(row=>row.id==='f2a-pre-active').extensions.v5.combatInitiative.die,5);
  assert.equal(preRoundApplied.participants.find(row=>row.id==='f2a-pre-bench').extensions.v5.combatInitiative.die,preRoundDie);

  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.resetCombat();
    await Store.addParticipant({ id: 'f2a-reflex-pj', name: 'Réflexe PJ', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10, initiative: 43, caracs: { I: 43 }, talents: [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }] });
  });
  await page.locator('#tab-combat').click();
  await page.locator('#combat-banner .combat-banner-primary').click();
  const reflexDialog = page.locator('dialog.tool-sheet'); await reflexDialog.waitFor({ state: 'visible' });
  const firstReflex = reflexDialog.locator('input[name="reflexFirst:f2a-reflex-pj"]');
  const secondReflex = reflexDialog.locator('input[name="reflexSecond:f2a-reflex-pj"]');
  assert.equal(await firstReflex.count(), 1, 'un véritable talent détenu expose deux d10 PJ');
  await firstReflex.fill('9'); await secondReflex.fill('2');
  await reflexDialog.locator('select[name="reflexChoice:f2a-reflex-pj"]').selectOption('second');
  await reflexDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  await reflexDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const pjReflexApplied = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const person = Store.listParticipants()[0]; return { initiative: person.initiative, meta: person.extensions.v5.combatInitiative }; });
  assert.equal(pjReflexApplied.initiative, 43);
  assert.deepEqual(pjReflexApplied.meta.dice, [9, 2]);
  assert.equal(pjReflexApplied.meta.choice, 'second');
  assert.equal(pjReflexApplied.meta.die, 2);
  assert.equal(pjReflexApplied.meta.bonus, 4);
  assert.equal(pjReflexApplied.meta.score, 6);
  await page.reload(); await page.waitForFunction(() => document.querySelector('#app-content')?.style.display === 'block', { timeout: 20000 });
  const pjReflexReload = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.ready; const person = Store.listParticipants()[0]; return { initiative: person.initiative, meta: person.extensions.v5.combatInitiative }; });
  assert.equal(pjReflexReload.initiative, 43);
  assert.deepEqual(pjReflexReload.meta.dice, [9, 2]);
  assert.equal(pjReflexReload.meta.score, 6);

  await page.evaluate(async () => {
    const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); await Store.resetCombat();
    await Store.addParticipant({ id: 'f2a-reflex-npc', name: 'Réflexe PNJ', kind: 'PNJ', camp: 'ennemi', zone: 'active', hp: 10, maxHp: 10, initiative: 43, caracs: { I: 43 }, talents: [{ id: 'talent-combat-reflexes', status: 'resolved', rank: 1 }] });
    window.__f2ReflexRandom = Math.random; let draw = 0; const values = [0.2, 0.8, 0.234567, 0.345678]; Math.random = () => values[draw++] ?? (0.4 + draw++ * 0.000001);
  });
  await page.locator('#tab-combat').click(); await page.locator('#combat-banner .combat-banner-primary').click();
  const npcReflexDialog = page.locator('dialog.tool-sheet'); await npcReflexDialog.waitFor({ state: 'visible' });
  const npcFirst = npcReflexDialog.locator('input[name="reflexFirst:f2a-reflex-npc"]'), npcSecond = npcReflexDialog.locator('input[name="reflexSecond:f2a-reflex-npc"]');
  assert.equal(await npcFirst.inputValue(), '3'); assert.equal(await npcSecond.inputValue(), '9');
  await npcReflexDialog.locator('select[name="reflexChoice:f2a-reflex-npc"]').selectOption('second');
  await npcReflexDialog.getByRole('button', { name: 'Calculer / actualiser l’ordre' }).click();
  assert.equal(await npcFirst.inputValue(), '3', 'le premier d10 PNJ ne change pas à Actualiser');
  assert.equal(await npcSecond.inputValue(), '9', 'le second d10 PNJ ne change pas à Actualiser');
  await npcReflexDialog.getByRole('button', { name: 'Confirmer et appliquer' }).click();
  const npcReflexApplied = await page.evaluate(async () => { const { Store } = await import('/Outil-MJ-Warhammer/js/main.js'); const person = Store.listParticipants()[0]; return { initiative: person.initiative, meta: person.extensions.v5.combatInitiative }; });
  assert.equal(npcReflexApplied.initiative, 43); assert.deepEqual(npcReflexApplied.meta.dice, [3, 9]); assert.equal(npcReflexApplied.meta.choice, 'second'); assert.equal(npcReflexApplied.meta.score, 13);
  await page.evaluate(() => { Math.random = window.__f2ReflexRandom; delete window.__f2ReflexRandom; });

  // A reserve profile added from the live UI after the initial draw opens one atomic Round-0 initiative dialog.
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');await Store.resetCombat();await Store.addParticipant({id:'f2a-round0-active',name:'Actif Round 0',kind:'PNJ',camp:'ennemi',zone:'active',initiative:40,hp:10,maxHp:10,caracs:{I:40}});await Store.applyCombatInitialization(Store.previewCombatInitialization({diceById:{'f2a-round0-active':5}}));await Store.addProfile({id:'f2a-direct-profile',name:'Ajout direct',kind:'PNJ',initiative:35,hp:10,caracs:{I:35}});});
  await page.locator('#tab-combat').click();
  await page.locator('#workspace-side-tab-profiles').click();
  await page.locator('#workspace-play [aria-label="Ajouter Ajout direct actif au combat"]').click();
  const directDialog=page.locator('dialog.tool-sheet');await directDialog.waitFor({state:'visible'});
  const directDie=Number(await directDialog.locator('input[name^="die:"]').last().inputValue());assert.ok(directDie>=1&&directDie<=10);
  await directDialog.getByRole('button',{name:'Confirmer et appliquer'}).click();
  const directApplied=await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.listParticipants().find(row=>row.profileId==='f2a-direct-profile');});
  assert.equal(directApplied.zone,'active');assert.equal(directApplied.extensions.v5.combatInitiative.die,directDie);
  const activeBadge=page.locator('.actor-card[data-id="f2a-round0-active"] .init-badge');
  const beforeBadge=await activeBadge.innerText(),combatScore=beforeBadge.match(/ordre (\d+)/)?.[1];assert.ok(combatScore);
  await activeBadge.evaluate(el=>el.click());await activeBadge.locator('input').evaluate(input=>{input.value='41';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));});
  await page.waitForFunction(({selector,score})=>{const text=document.querySelector(selector)?.textContent||'';return text.includes('I 41')&&text.includes(`ordre ${score}`);},{selector:'.actor-card[data-id="f2a-round0-active"] .init-badge',score:combatScore});
  await activeBadge.evaluate(el=>el.click());await activeBadge.locator('input').evaluate(input=>{input.value='99';input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));});
  assert.match(await activeBadge.innerText(),new RegExp(`I 41 · ordre ${combatScore}`),'édition annulée garde le badge du score de combat');

  // An encounter whose entire composition is on the bench still opens and commits the encounter launch route.
  await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');if(Store.getActiveScene())await Store.suspendActiveScene();await Store.resetCombat();await Store.saveEncounter({id:'f2a-all-bench',title:'Rencontre tout au banc',entries:[{id:'f2a-all-bench-entry',profileId:'f2a-direct-profile',quantity:1,camp:'ennemi',zone:'bench'}]});});
  await page.locator('#tab-prepare').click();
  await page.locator('#workspace-prepare [data-workspace-action="launch-encounter"][data-encounter-id="f2a-all-bench"]').click();
  const benchDialog=page.locator('dialog.tool-sheet');await benchDialog.waitFor({state:'visible'});
  assert.equal(await benchDialog.locator('input[name^="die:"]').count(),0,'tout le banc ne demande aucun dé actif');
  await benchDialog.getByRole('button',{name:'Confirmer et appliquer'}).click();
  const allBench=await page.evaluate(async()=>{const {Store}=await import('/Outil-MJ-Warhammer/js/main.js');return Store.getActiveScene();});
  assert.equal(allBench.title,'Rencontre tout au banc');assert.equal(allBench.participants[0].zone,'bench');
  assert.deepEqual(errors, []);
  await context.close();
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
console.log('F2-A initiative browser: banner/N start, hidden legacy handler, encounter launch/start/resume/restart, tie-2/tie-3 audit, Undo/Redo/reload, manual→automatic, Combat instinctif PJ/PNJ OK');
