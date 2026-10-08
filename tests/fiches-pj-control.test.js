import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, applyFicheSync } from '../js/core/fiche-sync.js';
import { Profile, Participant } from '../js/core/models.js';
import { sanitizeProfile, sanitizeParticipant } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import { launchEncounter } from '../js/core/encounters.js';

// Contrôle indépendant : résultats du cahier des charges, sans réutiliser les
// fonctions de calcul d'équipement pour construire les valeurs attendues.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const snapshotWithMax = max => ({ ...ficheSnapshot('caelel', fixture), wounds: max, woundsMax: max });
const profile = extra => ({ id: 'pj', name: 'Caelel', kind: 'PJ', hp: 14, maxHp: 14, caracs: { F: 30, E: 40 }, diceLines: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ...extra });
const actor = (id, hp = 8, maxHp = 14) => ({ id, profileId: 'pj', persistentCharacterId: 'pc', name: 'Caelel', hp, maxHp, states: [{ id: 'etat', key: 'sonne', name: 'Sonné', level: 2, duration: 3 }], actions: [], zone: 'bench', camp: 'pj', extensions: { shieldUnavailable: { id: 'shield', round: 4 } } });
const sync = (draft, snapshot) => applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {} }]);
const healthDraft = (hp = 8, maxHp = 14) => ({
  reserve: [profile()],
  persistentCharacters: [{ id: 'pc', name: 'Caelel', hp, maxHp, states: ['Sonné|3'] }],
  encounters: [{ id: 'encounter', entries: [{ profileId: 'pj', persistentCharacterId: 'pc' }] }],
  combat: { participants: [actor('active', hp, maxHp)], round: 4, currentActorId: 'active', order: ['active'] },
  activeScene: { id: 'scene', participants: [actor('active', hp, maxHp)], round: 4, currentActorId: 'active', order: ['active'] },
  suspendedScenes: [{ id: 'suspended', participants: [actor('suspended', hp, maxHp)], round: 2, currentActorId: 'suspended', order: ['suspended'] }],
  archives: [{ id: 'finished', participants: [actor('archived', hp, maxHp)] }], log: []
});

for (const [label, oldHp, oldMax, newMax, expected] of [
  ['R23 augmentation', 8, 14, 16, 10], ['R24 réduction', 8, 14, 10, 4],
  ['R24 négatif autorisé', 8, 14, 4, -2], ['R38 écart signé', 16, 14, 16, 18],
  ['R40 passage à zéro', -2, 14, 16, 0]
]) test(`Contrôle santé ${label} — même delta appliqué une fois par état`, () => {
  const draft = healthDraft(oldHp, oldMax); const before = structuredClone(draft);
  const next = sync(draft, snapshotWithMax(newMax));
  assert.deepEqual(draft, before, 'entrée immuable');
  for (const state of [next.persistentCharacters[0], next.combat.participants[0], next.activeScene.participants[0], next.suspendedScenes[0].participants[0]]) {
    assert.equal(state.hp, expected); assert.equal(state.maxHp, newMax);
    assert.equal(state.maxHp - state.hp, oldMax - oldHp, 'écart signé conservé');
  }
  assert.deepEqual(next.combat.participants[0].states, before.combat.participants[0].states);
  assert.deepEqual(next.combat.participants[0].extensions.shieldUnavailable, before.combat.participants[0].extensions.shieldUnavailable);
  assert.equal(next.combat.round, 4); assert.equal(next.combat.currentActorId, 'active');
  assert.deepEqual(next.combat.order, ['active']); assert.deepEqual(next.archives, before.archives);
  assert.equal(next.reserve[0].maxHp, newMax); assert.equal(next.reserve[0].hp, newMax, 'réserve : compatibilité maximum');
  assert.equal(sync(next, snapshotWithMax(newMax)), next, 'aucun second delta ni nouvel événement');
});

test('Contrôle R37 — maximum nouveau non calculable : les deux nombres et les états restent intacts', () => {
  const draft = healthDraft(); const next = sync(draft, snapshotWithMax(null));
  for (const state of [next.persistentCharacters[0], next.combat.participants[0], next.activeScene.participants[0], next.suspendedScenes[0].participants[0]]) {
    assert.equal(state.hp, 8); assert.equal(state.maxHp, 14);
  }
});

const payload = {
  skills: [{ id: 'skill-id', name: 'Corps à corps (Base)', total: 51 }],
  talents: [{ id: 'talent-id', name: 'Talent retiré', rank: 2, speciality: 'Mêlée', acquisitions: [{ id: 'one', note: 'ancienne note' }, { id: 'two', note: 'seconde note' }] }],
  equipment: [{ id: 'instance', baseId: 'same-model', catalogVersion: 'v1', kind: 'weapon', name: 'Arme personnalisée', damage: 'BF+4', keywords: [{ id: 'entangle', parameter: 'corde renforcée' }], notes: '<img src=x onerror=alert(1)>', custom: true }],
  spells: [{ nom: 'Sort', note: 'consultation' }], prayers: [{ nom: 'Prière', note: 'consultation' }],
  armorLocations: { head: 0, body: 5, rightArm: 4, leftArm: 1, rightLeg: 2, leftLeg: 0 },
  ficheSnapshot: { format: 1, charId: 'caelel', source: { fingerprint: 'fixture', revision: 'r2' }, coverage: { equipment: 'present' } },
  movement: 5, race: 'humain'
};

test('Contrôle R27 — constructeurs, sanitize, JSON, migration et scène conservent les collections et paramètres textuels', () => {
  const input = profile(payload); const before = structuredClone(input);
  const p = new Profile(input); const participant = new Participant({ ...input, id: 'participant', profileId: 'pj', hp: -2 });
  const scene = launchEncounter({ id: 'enc', title: 'Recette', entries: [{ id: 'entry', profileId: 'pj', quantity: 1, zone: 'active', persistentCharacterId: 'pc' }] }, { profiles: [p], persistentCharacters: [{ id: 'pc', hp: 8, maxHp: 14, states: ['Sonné|3'] }], idFactory: () => 'scene-actor' });
  const envelope = { schemaVersion: 3, reserve: [sanitizeProfile(p)], combat: { participants: [sanitizeParticipant(participant)], round: 1, order: ['participant'], currentActorId: 'participant' }, activeScene: scene, suspendedScenes: [], diceLines: [], log: [] };
  const migrated = migrateSnapshot(JSON.parse(JSON.stringify(envelope))).data;
  for (const item of [p, participant, sanitizeProfile(p), sanitizeParticipant(participant), migrated.reserve[0], migrated.combat.participants[0], migrated.activeScene.participants[0]]) {
    for (const [key, expected] of Object.entries(payload)) assert.deepEqual(item[key], expected, `${key} perdu ou modifié`);
  }
  assert.equal(migrated.combat.participants[0].hp, -2);
  assert.equal(migrated.activeScene.participants[0].hp, 8);
  assert.deepEqual(input, before);
  p.equipment[0].keywords[0].parameter = 'mutation locale';
  assert.equal(input.equipment[0].keywords[0].parameter, 'corde renforcée', 'copies indépendantes');
});

test('Contrôle R16 — migration v2 des quatre familles vers six zones sans créer d’équipement', () => {
  const legacy = { schemaVersion: 2, reserve: [profile({ armor: { head: 0, body: 3, arms: 2, legs: 1 } })], combat: { participants: [actor('legacy')], round: 0 }, log: [], diceLines: [] };
  const before = structuredClone(legacy); const result = migrateSnapshot(legacy).data;
  assert.equal(result.schemaVersion, 3);
  assert.deepEqual(result.reserve[0].armorLocations, { head: 0, body: 3, rightArm: 2, leftArm: 2, rightLeg: 1, leftLeg: 1 });
  assert.ok(!result.reserve[0].equipment || result.reserve[0].equipment.length === 0);
  assert.deepEqual(legacy, before);
});

const object = (id, extra = {}) => ({ id, baseId: 'custom-model', catalogVersion: 'fixture-v1', kind: 'weapon', name: 'Épée personnelle', category: 'Base', damage: 'BF+4', reach: 'Moyenne', range: '', ap: null, locations: [], layer: 'none', keywords: [{ id: 'unknown-word', parameter: 'corde renforcée' }], notes: 'note personnalisée', source: 'Campagne', custom: true, ...extra });
const equipmentSnapshot = equipment => ficheSnapshot('caelel', { ...fixture, equipment });

test('Contrôle R02/R03/R04/R21/R22 — identité des instances, retrait ciblé, couvertures absente et invalide', () => {
  const local = { id: 'local', type: 'attack', base: 35, mod: -10, targetId: 'enemy', note: 'Épée personnelle', damage: 6, qualities: [], valuesX: null, capacity: null, extensions: {} };
  const original = { reserve: [profile({ diceLines: [local] })], persistentCharacters: [], encounters: [] };
  const first = sync(original, equipmentSnapshot([object('one'), object('two')]));
  assert.equal(first.reserve[0].equipment.length, 2, 'deux instances même modèle/nom');
  assert.equal(first.reserve[0].diceLines.filter(row => row.extensions?.fiche?.role === 'attack').length, 2);
  assert.deepEqual(first.reserve[0].diceLines.find(row => row.id === 'local'), local, 'action locale sans confirmation inchangée');
  const linkedId = first.reserve[0].diceLines.find(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack').id;
  const renamed = sync(first, equipmentSnapshot([object('one', { name: 'Nouvelle épée', damage: 'BF*2+4' }), object('two')]));
  const linked = renamed.reserve[0].diceLines.filter(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack');
  assert.equal(linked.length, 1); assert.equal(linked[0].id, linkedId); assert.equal(linked[0].note, 'Nouvelle épée');
  assert.equal(renamed.reserve[0].equipment[0].damage, 'BF*2+4');
  assert.deepEqual(renamed.reserve[0].equipment[0].keywords, [{ id: 'unknown-word', parameter: 'corde renforcée' }]);
  const absent = sync(renamed, ficheSnapshot('caelel', fixture));
  assert.deepEqual(absent.reserve[0].equipment, renamed.reserve[0].equipment, 'absence ne retire rien');
  const invalid = sync(renamed, equipmentSnapshot([object('duplicate'), object('duplicate')]));
  assert.equal(invalid.reserve[0].ficheSnapshot.coverage.equipment, 'invalid');
  assert.deepEqual(invalid.reserve[0].equipment, renamed.reserve[0].equipment, 'ID dupliqué bloque la collection entière');
  assert.deepEqual(invalid.reserve[0].diceLines, renamed.reserve[0].diceLines);
  const cleared = sync(renamed, equipmentSnapshot([]));
  assert.deepEqual(cleared.reserve[0].equipment, []);
  assert.deepEqual(cleared.reserve[0].diceLines, [local], 'seules actions liées retirées');
});

test('Contrôle R25 — précondition périmée refuse tout lot sans mutation', () => {
  const draft = { reserve: [profile()], persistentCharacters: [] }; const before = structuredClone(draft);
  assert.throws(() => applyFicheSync(draft, [{ charId: 'caelel', profileId: 'pj', snapshot: equipmentSnapshot([object('one')]), expectedProfileFingerprint: 'old-invalid-fingerprint' }]), error => error.code === 'fiche-plan-stale');
  assert.deepEqual(draft, before);
});

test('Contrôle reprise confirmée — adoption de l’ancienne action ne crée aucun doublon dans ses copies de scène', () => {
  const local = { id: 'legacy', type: 'attack', base: 35, mod: -10, targetId: 'enemy', note: 'Vieille épée', damage: 6, qualities: [] };
  const draft = { reserve: [profile({ diceLines: [local] })], combat: { participants: [{ ...actor('participant'), actions: [local] }] }, activeScene: { id: 'scene', participants: [{ ...actor('participant'), actions: [local] }] } };
  const snapshot = equipmentSnapshot([object('one')]);
  const entry = { charId: 'caelel', profileId: 'pj', snapshot, adoptActions: { 'caelel:one:attack': 'legacy' }, equipmentLinks: { 'caelel:one:attack': 'Corps à corps (Base)' } };
  const next = applyFicheSync(draft, [entry]);
  for (const rows of [next.reserve[0].diceLines, next.combat.participants[0].actions, next.activeScene.participants[0].actions]) {
    assert.equal(rows.filter(row => row.extensions?.fiche?.equipmentId === 'one' && row.type === 'attack').length, 1, 'une seule attaque liée');
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'IDs uniques');
    const adopted = rows.find(row => row.id === 'legacy'); assert.equal(adopted.mod, -10); assert.equal(adopted.targetId, 'enemy');
  }
});

test('Contrôle R17 — bouclier sans profil offensif consultable sans attaque inventée', () => {
  const draft = { reserve: [profile()] };
  const next = sync(draft, equipmentSnapshot([object('shield', { kind: 'shield', category: 'Bouclier', damage: '', reach: '', ap: 2 })]));
  assert.equal(next.reserve[0].equipment.length, 1);
  assert.equal(next.reserve[0].diceLines.filter(row => row.extensions?.fiche?.equipmentId === 'shield' && row.type === 'attack').length, 0);
});


import { planHealthSync, planProfileSync } from '../js/core/fiche-sync.js';
import { previewResolution } from '../js/core/resolution.js';
import { createStore } from '../js/core/store.js';

test('Contrôle R10 — tir sans compétence : visible, score absent, liaison requise et calcul bloqué', () => {
  const snapshot = ficheSnapshot('caelel', { ...fixture, skillsAdvanced: [], equipment: [object('ranged', { name: 'Arc personnalisé', category: 'Arc', range: '50', damage: 'BF+3' })] });
  const plan = planProfileSync(snapshot, profile()); const action = plan.updated.diceLines.find(row => row.type === 'attack');
  assert.equal(action.base, ''); assert.equal(action.extensions.fiche.requiresLink, true);
  assert.equal(plan.equipmentActions[0].proposed, '', 'aucun repli vers une compétence de mêlée');
  assert.throws(() => previewResolution({ actor: { id: 'actor', equipment: snapshot.equipment }, action, roll: 42, baseRevision: 0 }), error => error.code === 'SKILL_LINK_REQUIRED');
});

test('Contrôle R37 — ancien maximum inconnu : PV conservés et avertissement explicite', () => {
  const health = planHealthSync({ hp: -2 }, 16);
  assert.equal(health.oldMax, null); assert.equal(health.new, -2); assert.equal(health.newMax, 16);
  assert.equal(health.warning, 'old-maximum-unknown'); assert.equal(health.suffered, null);
});

test('Contrôle source — révision disponible retenue et empreinte stable sur lectures identiques', () => {
  const first = ficheSnapshot('caelel', { ...fixture, equipment: [object('one')] }, { schemaVersion: 4, revision: 'r1', fetchedAt: '2026-10-08T00:00:00Z' });
  const second = ficheSnapshot('caelel', { equipment: [object('one')], ...fixture }, { schemaVersion: 4, revision: 'r1', fetchedAt: '2026-10-08T01:00:00Z' });
  assert.equal(first.source.revision, 'r1'); assert.equal(first.source.schemaVersion, 4);
  assert.equal(first.source.fingerprint, second.source.fingerprint, 'date de lecture sans effet sur identité');
  assert.notEqual(first.source.fingerprint, ficheSnapshot('caelel', { ...fixture, equipment: [object('one')] }, { schemaVersion: 4, revision: 'r2' }).source.fingerprint);
});

const memoryPersistence = () => {
  let state = null;
  return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } };
};
test('Contrôle R26/R39 — commande annulable puis export/reprise second appareil sans second delta santé', async () => {
  const first = createStore({ persistence: memoryPersistence() }); await first.ready;
  await first.loadFromJSON({ schemaVersion: 3, ...healthDraft(), diceLines: [] });
  const before = JSON.parse(first.getFullJSON());
  const entry = { charId: 'caelel', profileId: 'pj', snapshot: snapshotWithMax(16) };
  await first.applyFicheSync([entry]);
  assert.equal(first.listParticipants()[0].hp, 10); assert.equal(first.listParticipants()[0].maxHp, 16);
  const exported = first.getFullJSON();
  await first.undo();
  assert.equal(first.listParticipants()[0].hp, 8); assert.equal(first.listParticipants()[0].maxHp, 14);
  assert.deepEqual(first.listParticipants()[0].states, before.combat.participants[0].states);
  const second = createStore({ persistence: memoryPersistence() }); await second.ready; await second.loadFromJSON(exported);
  const revision = second.getLocalRevision();
  assert.equal(second.listParticipants()[0].hp, 10); assert.equal(second.listParticipants()[0].maxHp, 16);
  assert.deepEqual(await second.applyFicheSync([entry]), { ok: true, changed: false });
  assert.equal(second.getLocalRevision(), revision); assert.equal(second.listParticipants()[0].hp, 10);
  assert.equal(second.getActiveScene().participants[0].hp, 10);
});

test('Contrôle R25 — une commande locale en file invalide aussi la précondition durable de synchronisation', async () => {
  let persisted = null; let holdNext = false; let release; let entered;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const persistence = { async load() { return persisted && structuredClone(persisted); }, async saveAtomic({ state }) {
    if (holdNext) { holdNext = false; entered(); await new Promise(resolve => { release = resolve; }); }
    persisted = structuredClone(state); return { ok: true };
  } };
  const store = createStore({ persistence }); await store.ready; await store.loadFromJSON({ schemaVersion: 3, ...healthDraft(), diceLines: [] });
  const revision = store.getLocalRevision(); holdNext = true;
  const edit = store.updateParticipant('active', { notes: 'édition en attente IndexedDB' });
  await enteredPromise;
  const apply = Promise.resolve(store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot: snapshotWithMax(16) }], { expectedLocalRevision: revision }));
  const rejection = assert.rejects(apply, error => error.code === 'fiche-plan-stale');
  release(); await edit; await rejection;
  assert.equal(store.listParticipants()[0].hp, 8); assert.equal(store.listParticipants()[0].maxHp, 14);
  assert.equal(store.listParticipants()[0].notes, 'édition en attente IndexedDB');
  assert.equal(store.getLocalRevision(), revision + 1, 'seule la vraie édition ajoute une révision');
});

for (const target of ['participant', 'profile']) test('Contrôle R25 — édition ' + target + ' refuse dans la file durable des valeurs source antérieures', async () => {
  let state = null, holdNext = false, release, entered;
  const enteredPromise = new Promise(resolve => entered = resolve);
  const persistence = { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) {
    if (holdNext) { holdNext = false; entered(); await new Promise(resolve => release = resolve); }
    state = structuredClone(next); return { ok: true };
  } };
  const store = createStore({ persistence }); await store.ready;
  const first = sync({ ...healthDraft(), diceLines: [] }, equipmentSnapshot([object('queue-source', { damage: 'BF+4' })]));
  await store.loadFromJSON({ schemaVersion: 3, ...first });
  const previousRevision = store.getLocalRevision();
  holdNext = true;
  const sourceUpdate = store.applyFicheSync([{ profileId: 'pj', snapshot: equipmentSnapshot([object('queue-source', { damage: 'BF+7' })]) }]);
  await enteredPromise;
  // Reproduce submit-time rebase while the previous source command is not yet visible.
  const prior = target === 'participant' ? store.listParticipants().find(row => row.id === 'active') : store.getProfile('pj');
  const collection = target === 'participant' ? 'actions' : 'diceLines';
  const patch = { [collection]: prior[collection].map(action => ({ ...action, mod: -10 })) };
  const edit = target === 'participant'
    ? store.updateParticipant('active', patch, { expectedLocalRevision: previousRevision })
    : store.updateProfile('pj', patch, { expectedLocalRevision: previousRevision });
  const rejection = assert.rejects(edit, error => /stale/i.test(error.code));
  release(); await sourceUpdate; await rejection;
  const current = target === 'participant' ? store.listParticipants().find(row => row.id === 'active') : store.getProfile('pj');
  const attack = current[collection].find(action => action.type === 'attack');
  assert.equal(attack.damageFormula, 'BF+7', 'source récente conservée');
  assert.notEqual(attack.mod, -10, 'édition périmée non appliquée partiellement');
  assert.equal(store.getLocalRevision(), previousRevision + 1, 'seule la synchronisation valide avance la révision');
});
