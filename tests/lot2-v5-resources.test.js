import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, KEY } from '../js/core/store.js';
import { ficheSnapshot, applyFicheSync } from '../js/core/fiche-sync.js';
import { getV5Fortune, setV5Fortune, projectV5Resources, commitV5Resources, reconcileV5ResourceBindings } from '../js/core/v5-resources.js';
import { sharedState } from '../js/core/sync-protocol.js';
import { migrateSnapshot } from '../js/core/migrations.js';

function memory() {
  let state = null, reject = false;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => {
    if (reject) throw new Error('Disque indisponible');
    state = structuredClone(next); return { ok: true };
  }, snapshot: () => structuredClone(state), reject: value => { reject = value; } };
}
async function live() { const persistence = memory(), store = createStore({ persistence }); await store.ready; return { persistence, store }; }
const actor = (id, extra = {}) => ({ id, name: 'Même nom', kind: 'PJ', hp: 10, maxHp: 10, states: [{ name: 'À Terre', level: 1 }], zone: 'active', ...extra });
const envelope = participants => ({ localRevision: 1, reserve: [], persistentCharacters: [], combat: { participants }, extensions: {}, log: [], diceLines: [] });

test('Fortune V5 — fiche current Chance strict, maximum Destin absent/current vide jamais solde zéro', () => {
  for (const chance of ['2', 2, '0', 0]) assert.equal(ficheSnapshot('synthetic', { chance, destin: 8 }).resources.fortune, Number(chance));
  for (const chance of ['', ' ', '1e3', '1.5', -1, null, true, undefined]) assert.equal(ficheSnapshot('synthetic', { chance, destin: 8 }).resources, undefined);
  assert.equal(ficheSnapshot('synthetic', { destin: 8 }).resources, undefined);
  const subject = actor('a', { extensions: { ficheId: 'synthetic' }, ficheSnapshot: ficheSnapshot('synthetic', { chance: '2', destin: 8 }) });
  const input = envelope([subject]), before = structuredClone(input);
  assert.deepEqual(getV5Fortune(input, subject), { characterId: 'fiche:synthetic', balance: null, permanent: null, temporary: 0, sourceBalance: 2, initializedFrom: null });
  const initialized = setV5Fortune(input, subject, 2, { source: 'fiche' });
  assert.equal(getV5Fortune(initialized, subject).balance, 2);
  assert.throws(() => setV5Fortune(initialized, subject, 2, { source: 'fiche' }), /initialisation/);
  assert.deepEqual(input, before);
});

test('Fortune V5 — noms et templates PNJ identiques ne fusionnent pas les soldes', async () => {
  const { store } = await live();
  await store.addParticipant(actor('a', { kind: 'PNJ', profileId: 'template' }));
  await store.addParticipant(actor('b', { kind: 'PNJ', profileId: 'template' }));
  await store.setFortune('a', 2); await store.setFortune('b', 4);
  assert.notEqual(store.getFortune('a').characterId, store.getFortune('b').characterId);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.equal(store.getFortune('a').balance, 1); assert.equal(store.getFortune('b').balance, 4);
});

test('Fortune V5 — action payée répercute le solde unique sur toutes les copies du personnage', () => {
  const a = actor('a', { extensions: { ficheId: 'same' } }), b = actor('b', { extensions: { ficheId: 'same' } });
  let input = envelope([a, b]); input.activeScene = { participants: [a, b] }; input.suspendedScenes = [{ participants: [actor('c', { extensions: { ficheId: 'same' } })] }];
  input = setV5Fortune(input, a, 3);
  const paid = projectV5Resources(input, input.combat.participants); paid[0].extensions.v5.resources.fortune = 2;
  const next = commitV5Resources(input, paid);
  assert.equal(getV5Fortune(next, a).balance, 2);
  for (const row of [...next.combat.participants, ...next.activeScene.participants, ...next.suspendedScenes[0].participants]) assert.equal(row.extensions.v5.resources.fortune, 2);
  assert.equal(getV5Fortune(input, a).balance, 3);
});

test('Fortune V5 — ancien cache participant ou maximum ne devient pas solde courant', () => {
  const subject = actor('a', { extensions: { v5: { resources: { fortune: 5, focus: 2 } } }, ficheSnapshot: { charId: 'same', resources: { fortuneMax: 5 } } });
  const input = envelope([subject]);
  assert.equal(getV5Fortune(input, subject).balance, null);
  assert.deepEqual(projectV5Resources(input, [subject])[0].extensions.v5.resources, { focus: 2 });
});

test('Fortune V5 — récupération, reçu et dépense atomiques, annuler/redo/source fiche intacte', async () => {
  const { store, persistence } = await live();
  const snapshot = ficheSnapshot('synthetic', { chance: '3', destin: 5 });
  await store.addParticipant(actor('a', { extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot }));
  await store.setFortune('a', 3, { source: 'fiche' });
  const before = persistence.snapshot(), result = await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.equal(result.status, 'applied'); assert.equal(store.getFortune('a').balance, 2);
  assert.equal(store.listParticipants()[0].states.length, 0);
  assert.equal(store.getLog()[0].detail.resourceCost.after, 2);
  assert.deepEqual(store.listParticipants()[0].ficheSnapshot, snapshot);
  await store.undo(); assert.equal(store.getFortune('a').balance, 3); assert.equal(store.listParticipants()[0].states.length, 1);
  await store.redo(); assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 0);
  assert.deepEqual(before.combat.participants[0].ficheSnapshot, snapshot);
});

test('Fortune V5 — unknown, épuisée, révision périmée ou disque refusé ne changent pas état/journal', async () => {
  const { store, persistence } = await live(); await store.addParticipant(actor('a'));
  const before = persistence.snapshot();
  await assert.rejects(store.recoverCondition('a', 'a-terre', { method: 'fortune' }), error => error.code === 'V5_FORTUNE_UNKNOWN');
  assert.deepEqual(persistence.snapshot(), before);
  await store.setFortune('a', 0);
  const depleted = persistence.snapshot();
  await assert.rejects(store.recoverCondition('a', 'a-terre', { method: 'fortune' }), error => error.code === 'V5_FORTUNE_INSUFFICIENT');
  assert.deepEqual(persistence.snapshot(), depleted);
  const revision = store.getLocalRevision(); await store.setFortune('a', 2);
  assert.equal((await store.recoverCondition('a', 'a-terre', { method: 'fortune', baseRevision: revision })).status, 'stale');
  const ready = persistence.snapshot(); persistence.reject(true);
  assert.equal((await store.recoverCondition('a', 'a-terre', { method: 'fortune' })).ok, false);
  assert.deepEqual(persistence.snapshot(), ready);
  assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 1);
});

test('Fortune V5 — donnée de récupération manquante et État déjà absent ne paient pas', async () => {
  const { store } = await live();
  await store.addParticipant(actor('a', { states: [{ name: 'Inconscient', level: 1 }] }));
  await store.setFortune('a', 2);
  const pending = await store.recoverCondition('a', 'inconscient', { method: 'fortune' });
  assert.equal(pending.status, 'requires-input'); assert.equal(store.getFortune('a').balance, 2);
  assert.equal(store.listParticipants()[0].states.length, 1);
  await store.recoverCondition('a', 'inconscient', { method: 'fortune', causeEnded: true });
  assert.equal(store.getFortune('a').balance, 1);
  await store.recoverCondition('a', 'inconscient', { method: 'fortune', causeEnded: true });
  assert.equal(store.getFortune('a').balance, 1);
});

test('Fortune V5 — copies anonymes gardent leur solde propre entre rencontres', async () => {
  const { store, persistence } = await live();
  await store.addProfile({ id: 'pj', kind: 'PJ', name: 'Même nom', hp: 10 });
  for (const id of ['a', 'b']) await store.saveEncounter({ id, entries: [{ id: id + ':entry', profileId: 'pj', zone: 'active' }] });
  await store.launchEncounter('a'); const first = store.listParticipants()[0].id; await store.setFortune(first, 3);
  await store.suspendActiveScene(); const suspended = store.listSuspendedScenes()[0].id;
  await store.launchEncounter('b'); const second = store.listParticipants()[0].id;
  assert.notEqual(first, second); assert.equal(store.getFortune(second).balance, null, 'une copie anonyme ne récupère pas le solde d’une autre copie du profil');
  await store.setFortune(second, 1); await store.restartCombat();
  assert.equal(store.getFortune(store.listParticipants()[0].id).balance, 1);
  await store.deleteEncounter('b'); await store.resumeScene(suspended);
  assert.equal(store.getFortune(first).balance, 3);
  assert.equal(store.listParticipants()[0].extensions.v5.resources.fortune, 3);
  const reloaded = createStore({ persistence }); await reloaded.ready;
  assert.equal(reloaded.getFortune(first).balance, 3);
  await reloaded.deleteEncounter('a');
  await reloaded.saveEncounter({ id: 'c', entries: [{ id: 'c:entry', profileId: 'pj', zone: 'active' }] }); await reloaded.launchEncounter('c');
  assert.equal(reloaded.getFortune(reloaded.listParticipants()[0].id).balance, null);
});

test('Fortune V5 — export/import, migration et document cloud conservent registre stable', async () => {
  const { store } = await live(); await store.addParticipant(actor('a', { extensions: { ficheId: 'same' } })); await store.setFortune('a', 2);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  const exported = store.getFullJSON(), state = JSON.parse(exported);
  assert.deepEqual(migrateSnapshot(state).data.extensions.v5.characterResources, state.extensions.v5.characterResources);
  const cloud = sharedState(state);
  assert.deepEqual(cloud.extensions.v5.characterResources, state.extensions.v5.characterResources);
  assert.equal(cloud.history, undefined);
  const copy = await live(); await copy.store.loadFromJSON(exported); assert.equal(copy.store.getFortune('a').balance, 1);
});

test('Fortune V5 — synchroniser la fiche ne réinitialise pas le solde du registre', async () => {
  const { store } = await live(); const snapshot = ficheSnapshot('synthetic', { nom: 'Même nom', chance: '3' });
  await store.addProfile({ id: 'profile', kind: 'PJ', name: 'Même nom', extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot });
  await store.addParticipant(actor('a', { profileId: 'profile', extensions: { ficheId: 'synthetic' }, ficheSnapshot: snapshot }));
  await store.setFortune('a', 1);
  const input = JSON.parse(store.getFullJSON()), updated = applyFicheSync(input, [{ profileId: 'profile', snapshot: ficheSnapshot('synthetic', { nom: 'Même nom', chance: '3' }) }]);
  await store.loadFromJSON(updated);
  assert.equal(store.getFortune('a').balance, 1); assert.equal(store.listParticipants()[0].extensions.v5.resources.fortune, 1);
});

test('Fortune V5 — ancienne façade localStorage conserve registre et annulation', async () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
  const store = createStore({ storage }); await store.addParticipant(actor('a')); await store.setFortune('a', 2);
  await store.recoverCondition('a', 'a-terre', { method: 'fortune' });
  assert.ok(data.has(KEY.EXTENSIONS));
  const reloaded = createStore({ storage }); assert.equal(reloaded.getFortune('a').balance, 1);
  await store.undo(); assert.equal(store.getFortune('a').balance, 2); assert.equal(store.listParticipants()[0].states.length, 1);
});


test('Fortune V5 — premier lien PJ explicite conserve le solde outil, undo et refresh sans refill', async () => {
  const { store } = await live();
  await store.addProfile({ id: 'local-pj', kind: 'PJ', name: 'Même nom', hp: 10 });
  await store.addParticipant(actor('bound-copy', { profileId: 'local-pj' }));
  await store.setFortune('local-pj', 1);
  const source = ficheSnapshot('synthetic-first-link', { chance: '9', destin: 12 });
  await store.applyFicheSync([{ profileId: 'local-pj', snapshot: source }]);
  assert.equal(store.getFortune('local-pj').characterId, 'fiche:synthetic-first-link');
  assert.equal(store.getFortune('local-pj').balance, 1);
  assert.equal(store.getFortune('bound-copy').balance, 1);
  await store.undo(); assert.equal(store.getFortune('local-pj').characterId, 'profile:local-pj'); assert.equal(store.getFortune('local-pj').balance, 1);
  await store.redo(); assert.equal(store.getFortune('local-pj').balance, 1);
  await store.applyFicheSync([{ profileId: 'local-pj', snapshot: ficheSnapshot('synthetic-first-link', { chance: '8' }) }]);
  assert.equal(store.getFortune('local-pj').balance, 1);
  await store.applyFicheSync([{ profileId: 'local-pj', replaceAssociation: true, snapshot: ficheSnapshot('synthetic-other-character', { chance: '5' }) }]);
  assert.equal(store.getFortune('local-pj').characterId, 'fiche:synthetic-other-character'); assert.equal(store.getFortune('local-pj').balance, null);
});

test('Fortune V5 — destination connue ou association ambiguë ne transfère aucun solde par hypothèse', () => {
  const profile = { id: 'local', kind: 'PJ' }, other = { id: 'other', kind: 'PJ', extensions: { ficheId: 'existing' } };
  const before = { reserve: [profile, other], combat: { participants: [] }, persistentCharacters: [], extensions: { v5: { characterResources: [{ characterId: 'profile:local', fortune: 1, initializedFrom: 'mj' }, { characterId: 'fiche:existing', fortune: 4, initializedFrom: 'mj' }] } } };
  const next = { ...structuredClone(before), reserve: [{ ...profile, extensions: { ficheId: 'existing' } }, other] };
  const bound = reconcileV5ResourceBindings(before, next, [{ profileId: 'local', snapshot: { charId: 'existing' } }]);
  assert.deepEqual(bound.extensions.v5.characterResources, before.extensions.v5.characterResources);
  const ambiguous = reconcileV5ResourceBindings(before, { ...next, reserve: [{ ...profile, extensions: { ficheId: 'new' } }, other] }, [{ profileId: 'local', snapshot: { charId: 'new' } }, { profileId: 'other', snapshot: { charId: 'new' } }]);
  assert.deepEqual(ambiguous.extensions.v5.characterResources, before.extensions.v5.characterResources);
});
