import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, applyFicheSync, planProfileSync, equipmentActionKey } from '../js/core/fiche-sync.js';
import { createStore } from '../js/core/store.js';
import { launchEncounter } from '../js/core/encounters.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const profile = extra => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], extensions: {}, ...extra });
const object = (id, extra = {}) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name: 'Épée personnelle', category: 'Base', damage: 'BF+4', reach: 'Moyenne', range: '', ap: null, locations: [], layer: 'none', keywords: [], notes: 'note personnalisée', source: 'Campagne', custom: true, ...extra });
const snapshot = (equipment, charId = 'caelel') => ficheSnapshot(charId, { ...fixture, equipment });
const actor = (actions = [], extra = {}) => ({ id: 'actor', profileId: 'pj', name: 'Caelel', kind: 'PJ', hp: 8, maxHp: 14, states: [], actions, zone: 'active', camp: 'pj', extensions: {}, ...extra });
const memory = () => { let saved = null; return { async load() { return structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };

// Ces scénarios partent des invariants métier, sans reproduire l'algorithme testé.
test('Contrôle final R04 — une action de scène locale homonyme ne reçoit pas la liaison d’une action de réserve', () => {
  const template = { id: 'template', type: 'attack', note: 'Épée personnelle', base: 35, damage: 6, qualities: [], extensions: { ficheSkill: 'Corps à corps (Base)' } };
  const independent = { id: 'improvised', type: 'attack', note: 'Épée personnelle', base: 21, damage: 2, qualities: [], extensions: { origin: 'scene-local' } };
  const original = { reserve: [profile({ diceLines: [template] })], combat: { participants: [actor([independent])] } };
  const next = applyFicheSync(original, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  assert.deepEqual(next.combat.participants[0].actions.find(row => row.id === 'improvised'), independent, 'pas de reprise implicite par ressemblance');
});

test('Contrôle final R04/R05 — une action source retirée de la réserve ne reste pas fantôme dans une copie de scène historique', () => {
  const weapon = object('removed-instance'); const first = snapshot([weapon]);
  const initial = applyFicheSync({ reserve: [profile()] }, [{ profileId: 'pj', snapshot: first }]);
  const actions = structuredClone(initial.reserve[0].diceLines);
  const alreadyUpdated = applyFicheSync(initial, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  // Ancienne scène suspendue réintroduite après la mise à jour de la réserve.
  const local = { id: 'local', type: 'attack', note: 'Épée personnelle', base: 21, damage: 2, qualities: [], extensions: {} };
  const draft = { ...alreadyUpdated, suspendedScenes: [{ id: 'old-scene', participants: [actor([...actions, local])] }] };
  const next = applyFicheSync(draft, [{ profileId: 'pj', snapshot: snapshot([]) }]);
  assert.deepEqual(next.suspendedScenes[0].participants[0].actions, [local], 'retrait par liaison charId/instance/role, même si le profil est déjà actualisé');
});

test('Contrôle final association — le remplacement explicite retire les actions de l’ancien lien et conserve les actions locales', () => {
  const local = { id: 'local', type: 'skill', note: 'Rappel local', base: 25, damage: 0, qualities: [], extensions: {} };
  const first = applyFicheSync({ reserve: [profile({ diceLines: [local] })] }, [{ profileId: 'pj', snapshot: snapshot([object('one')]) }]);
  const next = applyFicheSync(first, [{ profileId: 'pj', snapshot: snapshot([object('two')], 'elysia'), replaceAssociation: true }]);
  assert.equal(next.reserve[0].extensions.ficheId, 'elysia');
  assert.deepEqual(next.reserve[0].equipment.map(row => row.id), ['two']);
  assert.equal(next.reserve[0].diceLines.filter(row => row.extensions?.fiche?.charId === 'caelel').length, 0, 'l’ancien lien est remplacé');
  assert.deepEqual(next.reserve[0].diceLines.find(row => row.id === 'local'), local);
});

test('Contrôle final R09/R10 — un emplacement ouvert choisi explicitement ne devient pas un score d’arme utilisable', () => {
  const source = ficheSnapshot('caelel', { ...fixture, skillsAdvanced: [{ id: 'placeholder', nom: 'Projectiles (au choix)', carac: 'ct', adv: 7 }], equipment: [object('bow', { category: 'Arc', range: '50' })] });
  const placeholder = source.skills.find(row => row.storageKey === 'placeholder');
  assert.equal(placeholder.total, null);
  const plan = planProfileSync(source, profile(), { equipmentLinks: { [equipmentActionKey('caelel', 'bow', 'attack')]: 'placeholder' } });
  const action = plan.updated.diceLines.find(row => row.type === 'attack');
  assert.equal(action.base, '');
  assert.equal(action.extensions.fiche.requiresLink, true, 'une liaison vers un emplacement ouvert reste non calculable');
});

test('Contrôle final R20/R27/R29 — le journal exporté conserve la version d’effet et la provenance arme/munition/protection appliquées', async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const weapon = object('bow', { name: 'Arc historique', category: 'Arc', range: '50', keywords: [{ id: 'precise', parameter: '' }] });
  const ammo = object('arrow', { kind: 'ammunition', name: 'Flèche historique', category: 'Arc', range: '', damage: '+0', keywords: [{ id: 'precise', parameter: '' }] });
  const armor = object('mail', { kind: 'armour', name: 'Maille historique', category: 'Maille', damage: '', ap: 2, layer: 'flexible', locations: ['body', 'rightArm', 'leftArm'], keywords: [] });
  const attacker = actor([], { equipment: [weapon, ammo], caracs: { F: 30, E: 40 }, extensions: { ficheId: 'caelel' } });
  const target = actor([], { id: 'target', profileId: 'enemy', name: 'Cible', hp: 30, maxHp: 30, equipment: [armor], armorLocations: { head: 0, body: 2, rightArm: 2, leftArm: 2, rightLeg: 0, leftLeg: 0 }, caracs: { E: 30 } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { participants: [attacker, target], order: ['actor', 'target'], currentActorId: 'actor', round: 1 }, diceLines: [], log: [] });
  const preview = store.previewResolution({ actorId: 'actor', targetId: 'target', roll: 12, ammunitionId: 'arrow', action: { id: 'shot', type: 'attack', base: 65, damage: 'BF+4', qualities: [{ id: 'precise', parameter: '' }], extensions: { fiche: { charId: 'caelel', equipmentId: 'bow', role: 'attack', requiresLink: false } } } });
  assert.ok(preview.referenceVersion); assert.equal(preview.input.ammunitionSources.length, 2);
  const applied = await store.applyResolution(preview); assert.equal(applied.status, 'applied');
  const exported = JSON.parse(store.getFullJSON());
  const entry = exported.log.find(row => row.kind === 'resolution');
  const detail = JSON.stringify(entry.detail);
  assert.ok(detail.includes(preview.referenceVersion), 'version de référence historisée');
  for (const id of ['bow', 'arrow', 'mail']) assert.ok(detail.includes(id), `provenance ${id} historisée`);
});

test('Contrôle final R35/R37 — un maximum persistant explicitement inconnu ne devient pas le maximum du profil lors du lancement', () => {
  const scene = launchEncounter({ id: 'encounter', entries: [{ id: 'entry', profileId: 'pj', persistentCharacterId: 'pc', quantity: 1, zone: 'active' }] }, { profiles: [profile()], persistentCharacters: [{ id: 'pc', hp: 5, maxHp: null, states: [] }], idFactory: () => 'launched' });
  assert.equal(scene.participants[0].hp, 5);
  assert.equal(scene.participants[0].maxHp, null, 'aucun historique vérifié ne permet de reconstituer les blessures subies');
});


test('Contrôle final R37 — réhydratation Store conserve le maximum explicitement inconnu d’un participant lié', async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [profile()], combat: { participants: [actor([], { maxHp: null })], order: ['actor'], round: 1 }, diceLines: [], log: [] });
  assert.equal(store.listParticipants()[0].maxHp, null);
  const exported = store.getFullJSON();
  const second = createStore({ persistence: memory() }); await second.ready; await second.loadFromJSON(exported);
  assert.equal(second.listParticipants()[0].maxHp, null);
});

test('Contrôle final §5.4 — réserve historique blessée reprend le maximum, états courants gardent leurs Blessures subies', () => {
  const source = { ...snapshot([]), wounds: 16, woundsMax: 16 };
  const old = profile({ hp: 8, maxHp: 14 });
  const plan = planProfileSync(source, old);
  assert.equal(plan.updated.hp, 16); assert.equal(plan.updated.maxHp, 16);
  assert.ok(plan.warnings.some(row => row.code === 'reserve-health-normalized' && row.message));
  const next = applyFicheSync({ reserve: [old], combat: { participants: [actor()] } }, [{ profileId: 'pj', snapshot: source }]);
  assert.equal(next.reserve[0].hp, 16, 'réserve : maximum de compatibilité, §5.4');
  assert.equal(next.combat.participants[0].hp, 10, 'état courant : six Blessures subies conservées');
});

for (const linked of [true, false]) test(`Contrôle final §5.4 — export santé PJ ${linked ? 'avec' : 'sans'} personnage persistant lié`, async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const pc = { id: 'pc', profileId: 'pj', name: 'Caelel', hp: 14, maxHp: 14, states: [] };
  const p = profile({ extensions: { ficheId: 'caelel' } });
  const participant = actor([], { hp: -2, states: ['Sonné|3'], ...(linked ? { persistentCharacterId: 'pc' } : {}) });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [p], persistentCharacters: linked ? [pc] : [], combat: { participants: [participant], order: ['actor'], round: 1 }, diceLines: [], log: [] });
  const result = await store.exportToReserve();
  assert.equal(store.getProfile('pj').hp, 14); assert.equal(store.getProfile('pj').maxHp, 14);
  if (linked) {
    const current = store.listPersistentCharacters()[0];
    assert.equal(current.hp, -2); assert.equal(current.maxHp, 14);
    assert.deepEqual(current.states, store.listParticipants()[0].states);
    assert.equal(result.warnings.length, 0);
  } else {
    assert.deepEqual(store.listPersistentCharacters(), [], 'aucun personnage créé implicitement');
    assert.equal(result.warnings.length, 1); assert.match(result.warnings[0], /aucun personnage persistant lié/);
  }
  await store.undo(); assert.equal(store.getProfile('pj').hp, 14);
  if (linked) assert.equal(store.listPersistentCharacters()[0].hp, 14);
});


for (const conflict of [true, false]) test(`Contrôle final §5.4 — deux copies vers le même persistant avec états ${conflict ? 'différents' : 'identiques'}`, async () => {
  const store = createStore({ persistence: memory() }); await store.ready;
  const pc = { id: 'pc', name: 'Caelel', hp: 14, maxHp: 14, states: [] };
  const p = profile({ extensions: { ficheId: 'caelel' } });
  const first = actor([], { persistentCharacterId: 'pc', hp: 8, states: [] });
  const second = { ...first, id: 'second-copy', hp: conflict ? 3 : 8 };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [p], persistentCharacters: [pc], combat: { participants: [first, second], order: ['actor', 'second-copy'], round: 1 }, diceLines: [], log: [] });
  const result = await store.exportToReserve();
  assert.equal(store.getProfile('pj').hp, 14);
  assert.equal(store.listPersistentCharacters()[0].hp, conflict ? 14 : 8, 'aucun arbitrage par dernière copie');
  assert.equal(result.warnings.length, conflict ? 1 : 0);
  if (conflict) assert.match(result.warnings[0], /plusieurs états/);
});


// Recette réelle complémentaire, déclenchée explicitement avec LOT1_BROWSER_FINAL=1.
// Le test unitaire standard n'exige pas une installation de navigateur.
if (process.env.LOT1_BROWSER_FINAL === '1') test('Contrôle final navigateur — consultation source et adoption/actualisation pendant édition', { timeout: 30000 }, async () => {
  const { createServer } = await import('node:http');
  const { statSync } = await import('node:fs');
  const { join, extname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { chromium } = await import('playwright');
  const { expect } = await import('playwright/test');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
  const server = createServer((req, res) => {
    try {
      const route = (req.url || '/').split('?')[0];
      if (route === '/association-harness.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><main id="mount"></main></html>'); return; }
      const path = join(root, decodeURIComponent(route === '/' ? '/index.html' : route));
      assert.ok(path.startsWith(root)); assert.ok(statSync(path).isFile());
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(readFileSync(path));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin); await expect(page.locator('#app-content')).toBeVisible();
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); await Store.ready;
      const source = { id: 'source', type: 'attack', note: 'Épée source', base: 54, mod: 0, damage: 4, damageFormula: 'BF+4', qualities: [], extensions: { fiche: { charId: 'caelel', equipmentId: 'one', role: 'attack', requiresLink: false } } };
      const local = { id: 'local', type: 'attack', note: 'Ancienne action locale', base: 21, mod: 0, damage: 2, qualities: [], extensions: {} };
      const independent = { ...local, id: 'independent', type: 'skill', note: 'Rappel local' };
      const removed = { ...source, id: 'removed-source', note: 'Arme retirée', extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'removed' } } };
      await Store.loadFromJSON({ schemaVersion: 3, reserve: [{ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, diceLines: [source], extensions: { ficheId: 'caelel' } }], combat: { participants: [{ id: 'actor', profileId: 'pj', name: 'Caelel', kind: 'PJ', hp: 8, maxHp: 14, initiative: 30, caracs: { F: 30 }, actions: [source, local, independent, removed], states: [], extensions: { ficheId: 'caelel' }, zone: 'active' }], round: 1, order: ['actor'], currentActorId: 'actor' }, diceLines: [], log: [] });
    });
    await page.locator('#tab-combat').click(); await expect(page.locator('#workspace-play')).toBeVisible();
    await page.locator('#workspace-play [data-workspace-action="edit-participant"]').click();
    const form = page.locator('[data-participant-editor="actor"]'); await expect(form).toBeVisible();
    const row = name => form.locator('.participant-action-list>.card').filter({ has: page.locator('strong', { hasText: name }) });
    const sourceRow = row('Épée source');
    for (const selector of ['.action-type', '.action-base', '.action-note', '.action-damage', '.btn-inoffensive']) await expect(sourceRow.locator(selector)).toBeDisabled();
    await expect(sourceRow.getByRole('button', { name: 'Retirer cette action' })).toBeDisabled();
    await expect(sourceRow.locator('.action-mod')).toBeEnabled(); await expect(form.locator('[name=initiative]')).toHaveJSProperty('readOnly', true);
    await expect(row('Rappel local').locator('.action-base')).toBeEnabled();
    await expect(row('Rappel local').getByRole('button', { name: 'Retirer cette action' })).toBeEnabled();
    await sourceRow.locator('.action-mod').fill('-10');
    await row('Ancienne action locale').locator('.action-base').fill('1');
    await row('Ancienne action locale').locator('.action-mod').fill('5');
    await row('Rappel local').locator('.action-note').fill('Rappel local édité'); await form.locator('[name=hp]').click();
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); const actor = Store.listParticipants().find(row => row.id === 'actor');
      const source = actor.actions.find(row => row.id === 'source');
      await Store.updateParticipant(actor.id, { actions: actor.actions.filter(row => row.id !== 'removed-source').map(action => action.id === 'source'
        ? { ...action, note: 'Épée source actualisée', damage: 7, damageFormula: 'BF+7' }
        : action.id === 'local' ? { ...action, note: 'Arme source adoptée', base: 69, damage: 9, damageFormula: 'BF+9', qualities: [{ id: 'precise', parameter: '' }], extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'adopted' } } } : action)
        .concat({ ...source, id: 'new-source', note: 'Nouvelle arme', extensions: { fiche: { ...source.extensions.fiche, equipmentId: 'two' } } }) });
    });
    await page.evaluate(async () => {
      const { Store } = await import('/js/main.js'); const original = Store.updateParticipant;
      window.restoreParticipantSave = () => { Store.updateParticipant = original; };
      Store.updateParticipant = (id, patch, options) => {
        if (options?.expectedLocalRevision !== undefined) throw Object.assign(new Error('La séance a changé. Votre saisie est conservée : vérifiez puis réessayez.'), { code: 'LOCAL_EDIT_STALE', userFacing: true });
        return original.call(Store, id, patch, options);
      };
    });
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(form).toBeVisible();
    await expect(form.getByRole('alert')).toContainText('Votre saisie est conservée');
    await expect(sourceRow.locator('.btn-inoffensive')).toBeDisabled(); await expect(sourceRow.getByRole('button', { name: 'Retirer cette action' })).toBeDisabled();
    await expect(sourceRow.locator('.action-mod')).toHaveValue('-10'); await expect(row('Rappel local édité').locator('.action-note')).toHaveValue('Rappel local édité');
    await page.evaluate(() => window.restoreParticipantSave());
    await form.getByRole('button', { name: 'Enregistrer', exact: true }).click(); await expect(form).toBeHidden();
    const actions = await page.evaluate(async () => { const { Store } = await import('/js/main.js'); return Store.listParticipants().find(row => row.id === 'actor').actions; });
    assert.equal(actions.find(row => row.id === 'source').damageFormula, 'BF+7'); assert.equal(actions.find(row => row.id === 'source').mod, -10);
    const adopted = actions.find(row => row.id === 'local'); assert.equal(adopted.damageFormula, 'BF+9'); assert.equal(adopted.base, 69); assert.equal(adopted.mod, 5); assert.equal(adopted.qualities[0].id, 'precise'); assert.equal(adopted.extensions.fiche.equipmentId, 'adopted');
    assert.equal(actions.find(row => row.id === 'independent').note, 'Rappel local édité'); assert.ok(actions.some(row => row.id === 'new-source')); assert.ok(!actions.some(row => row.id === 'removed-source')); assert.deepEqual(errors, []);
    const association = await context.newPage(); await association.goto(origin + '/association-harness.html');
    await association.evaluate(async ({ fixture, weapon }) => {
      const { createStore } = await import('/js/core/store.js'); const { initFicheSyncView } = await import('/js/ui/fiche-sync-view.js'); const { ficheSnapshot, applyFicheSync } = await import('/js/core/fiche-sync.js');
      let saved = null; const store = createStore({ persistence: { async load() { return saved; }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } } }); await store.ready;
      const initial = applyFicheSync({ reserve: [{ id: 'linked', name: 'PJ lié', kind: 'PJ', hp: 14, maxHp: 14, diceLines: [{ id: 'local', type: 'skill', note: 'Action locale', base: 25, damage: 0, qualities: [], extensions: {} }], extensions: {} }] }, [{ profileId: 'linked', snapshot: ficheSnapshot('caelel', { ...fixture, equipment: [{ ...weapon, id: 'old-instance' }] }) }]);
      await store.loadFromJSON({ schemaVersion: 3, ...initial, combat: { participants: [], order: [], round: 0 }, diceLines: [] });
      const records = ['caelel', 'elysia'].map(charId => ({ charId, data: { ...fixture, nom: charId === 'elysia' ? 'Nouvelle fiche' : 'Ancienne fiche', equipment: [{ ...weapon, id: charId === 'elysia' ? 'new-instance' : 'old-instance' }] }, metadata: { revision: 1 }, status: 'ok' }));
      const harness = window.associationHarness = { store, entries: [] };
      const view = initFicheSyncView({ mount: document.querySelector('#mount'), source: { async getUser() { return { name: 'MJ' }; }, async fetchAll() { return structuredClone(records); } }, getContext: () => ({ profiles: store.listProfiles(), participants: [], revision: store.getLocalRevision() }), callbacks: { async onApply(entries, options) { await store.applyFicheSync(entries, options); harness.entries = entries; } } });
      await view.start();
    }, { fixture, weapon: object('fixture') });
    const applyButton = association.getByRole('button', { name: /^Appliquer/ });
    await association.locator('[data-key="profil:elysia"]').selectOption('linked');
    const confirmReplacement = association.locator('[data-key="replace:elysia"]'); await expect(confirmReplacement).toBeVisible(); await expect(confirmReplacement).not.toBeChecked();
    await expect(applyButton).toBeDisabled(); await expect(association.getByRole('alert')).toContainText('Deux fiches visent le même profil');
    await association.locator('[data-key="profil:caelel"]').selectOption(''); await expect(applyButton).toBeDisabled();
    await confirmReplacement.check(); await expect(applyButton).toBeEnabled(); await expect(association.locator('#mount')).toContainText('Actions source retirées');
    await association.locator('[data-key="profil:elysia"]').selectOption(''); await association.locator('[data-key="profil:elysia"]').selectOption('linked');
    await expect(confirmReplacement).not.toBeChecked(); await expect(applyButton).toBeDisabled();
    await confirmReplacement.check(); await applyButton.click();
    await expect.poll(() => association.evaluate(() => window.associationHarness.entries.length)).toBe(1);
    const result = await association.evaluate(() => ({ entry: window.associationHarness.entries[0], profile: window.associationHarness.store.getProfile('linked') }));
    assert.equal(result.entry.replaceAssociation, true); assert.equal(result.profile.extensions.ficheId, 'elysia'); assert.deepEqual(result.profile.equipment.map(row => row.id), ['new-instance']);
    assert.ok(!result.profile.diceLines.some(row => row.extensions?.fiche?.charId === 'caelel')); assert.ok(result.profile.diceLines.some(row => row.id === 'local'));
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});
