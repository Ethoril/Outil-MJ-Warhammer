import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { simulateAction, compareSimulationTargets, applySimulation, discardSimulation } from '../../../js/core/simulation.js';
import { parseProfileText } from '../../../js/core/text-profile-import.js';
import { createStore } from '../../../js/core/store.js';
import { Profile, normalizeAction } from '../../../js/core/models.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { parseProfileJson, parseProfileInput, PROFILE_JSON_EXAMPLE } from '../../../js/core/json-profile-import.js';
import { qualityLabel } from '../../../js/core/quality-normalization.js';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, BESTIARY_FREE_ATTACK_KEY } from '../../../js/core/bestiary-profiles.js';
import { sanitizeParticipant } from '../../../js/core/sanitize.js';
import { participantKeywords } from '../../../js/core/creature-keywords.js';
import { F2_H_PROFILE_ABILITIES } from '../../../js/data/f2-h-profile-abilities.js';

describe('Simulation et import de profils texte', () => {
const actor = { id: 'a', name: 'MJ', states: [] };
const target = { id: 't', name: 'Cible', hp: 10, caracs: { E: 30 }, armor: { body: 1 }, states: [] };

test('E16 simulation — copie isolée, abandon sans mutation et réutilisation E12', () => {
  const state = { revision: 2, participants: [actor, target], appliedResolutionIds: [] };
  const simulation = simulateAction(state, { v5: { kind: 'ranged' }, actorId: 'a', targetId: 't', action: { id: 'coup', type: 'attack', base: 60, damage: 4 }, roll: '42' });
  assert.equal(simulation.status, 'pending');
  assert.equal(simulation.preview.roll, 42);
  assert.equal(simulation.preview.baseRevision, 2);
  assert.equal(state.participants[1].hp, 10);
  simulation.simulatedState.participants[1].hp = 1;
  assert.equal(state.participants[1].hp, 10);
  assert.equal(discardSimulation(simulation).status, 'discarded');
});

test('E16 simulation — comparaison de cibles et application idempotente/stale', () => {
  const state = { revision: 0, participants: [actor, target, { ...target, id: 't2', name: 'Autre' }], appliedResolutionIds: [] };
  const compared = compareSimulationTargets(state, { v5: { kind: 'ranged' }, actorId: 'a', action: { type: 'attack', base: 60, damage: 2 }, roll: 40 }, ['t', 't2']);
  assert.deepEqual(compared.simulations.map(item => item.preview.targetId), ['t', 't2']);
  const applied = applySimulation(compared.simulations[0], state);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants[1].hp, 9);
  assert.equal(applySimulation(compared.simulations[0], applied.state).status, 'duplicate');
  const stale = applySimulation(compared.simulations[1], { ...state, revision: 1 });
  assert.equal(stale.status, 'stale');
});

test('E17 import texte — bloc complet, accents, qualités canonisées et contenu HTML inerte', () => {
  const result = parseProfileText(`[Profil]\nNom: <b>Garde</b>\nType PNJ: PNJ\nPV: 12\nInitiative: 30\nCaractéristique E: 35\nArmure tête: 2\nAction: Attaque | base=40 | dégâts=1d10 | qualités=Impact, Percutante, Météore\n---\nNom: Éclaireur\nPV: 8`);
  assert.equal(result.profiles.length, 2);
  assert.equal(result.profiles[0].name, '<b>Garde</b>');
  assert.deepEqual(result.profiles[0].caracs, { E: 35 });
  assert.equal(result.profiles[0].armor.head, 2);
  assert.deepEqual(result.profiles[0].actions[0].qualities.map(item => item.id), ['percutante', 'meteore']);
  assert.deepEqual(result.unknownQualities.map(item => item.value), ['Météore']);
  assert.equal(result.status, 'needs-review');
});

test('E17 import texte — décimales rejetées, champs absents et ambiguïtés explicites', () => {
  const result = parseProfileText('Nom: Orc\nPV: 12.5\nPV: 13\nNotes: <script>alert(1)</script>');
  assert.equal(result.blocks[0].fields.hp.status, 'ambiguous');
  assert.equal(result.blocks[0].errors[0].reason, 'entier-attendu');
  assert.equal(result.status, 'needs-review');
  const missing = parseProfileText('Nom: Sans PV');
  assert.equal(missing.blocks[0].fields.hp.status, 'missing');
  assert.equal(missing.status, 'needs-review');
  assert.match(missing.sourceText, /Sans PV/);
});
});

describe('Actions de profil et normalisation', () => {
function memoryPersistence(initial = null) {
  let state = initial && structuredClone(initial);
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; },
    peek() { return state && structuredClone(state); }
  };
}

const ORC = 'Nom: Orc\nPV: 12\nAction: Hache | 45 | dégâts BF+4\n';
const line = note => ({ id: `l-${note}`, base: 50, note });

async function reload(persistence) {
  const store = createStore({ persistence: memoryPersistence(persistence.peek()) });
  await store.ready;
  return store;
}

test('E20 profil importé par texte — updateProfile({ diceLines }) survit au rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.importParsedProfiles(parseProfileText(ORC).profiles);
  const id = store.listProfiles()[0].id;
  await store.updateProfile(id, { diceLines: [line('Nouvelle')] });
  const reloaded = await reload(persistence);
  assert.deepEqual(reloaded.getProfile(id).diceLines.map(item => item.note), ['Nouvelle']);
  assert.deepEqual(reloaded.getProfile(id).actions.map(item => item.note), ['Nouvelle']);
  assert.equal(Object.hasOwn(persistence.peek().reserve[0], 'actions'), false);
});

test('E20 profil créé avec actions — la modification des diceLines survit au rechargement', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile(new Profile({ id: 'p', name: 'Garde', actions: [line('Ancienne')] }));
  await store.updateProfile('p', { diceLines: [line('Nouvelle')] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines.map(item => item.note), ['Nouvelle']);
  await store.updateProfile('p', { diceLines: [] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines, []);
});

test('E20 duplication et propagation — une seule copie, participants alimentés', async () => {
  const persistence = memoryPersistence();
  const store = createStore({ persistence });
  await store.ready;
  await store.addProfile(new Profile({ id: 'p', name: 'Garde', actions: [line('Ancienne')] }));
  await store.addParticipant({ id: 'c', profileId: 'p', name: 'Garde', hp: 5, actions: [line('Ancienne')] });
  await store.updateProfile('p', { diceLines: [line('Nouvelle')] }, { propagate: true });
  const saved = persistence.peek();
  assert.deepEqual(saved.combat.participants[0].actions.map(item => item.note), ['Nouvelle']);
  store.duplicateProfile('p');
  await new Promise(resolve => setTimeout(resolve, 20));
  const copy = (await reload(persistence)).listProfiles().find(item => item.id !== 'p');
  assert.deepEqual(copy.diceLines.map(item => item.note), ['Nouvelle']);
});

test('E20 migration — profil stocké avec actions et diceLines divergents : diceLines l’emporte', async () => {
  const stored = { id: 'p', name: 'Orc', hp: 12, actions: [line('Obsolete')], diceLines: [line('Voulue')] };
  const { data, report } = migrateSnapshot({ schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Voulue']);
  assert.equal(Object.hasOwn(data.reserve[0], 'actions'), false);
  assert.ok(report.repaired.some(item => item.reason === 'actions-divergentes-ignorees'));

  const persistence = memoryPersistence({ format: 'snapshot-v2', schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  const store = createStore({ persistence });
  await store.ready;
  assert.deepEqual(store.getProfile('p').diceLines.map(item => item.note), ['Voulue']);
});

test('E20 migration — profil stocké avec actions seules : actions conservées', () => {
  const { data } = migrateSnapshot({ schemaVersion: 2, reserve: [{ id: 'p', name: 'Orc', hp: 12, actions: [line('Seule')] }], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Seule']);
});

test('E20 migration — diceLines vide à côté d’actions remplies (ancien sanitizeProfile) : actions conservées', async () => {
  // Les versions précédentes produisaient `diceLines: []` à côté des `actions`
  // d'un import texte et affichaient ces actions : elles ne doivent pas disparaître.
  const stored = { id: 'p', name: 'Orc', hp: 12, actions: [line('Importee')], diceLines: [] };
  const { data } = migrateSnapshot({ schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  assert.deepEqual(data.reserve[0].diceLines.map(item => item.note), ['Importee']);
  assert.equal(Object.hasOwn(data.reserve[0], 'actions'), false);

  const persistence = memoryPersistence({ format: 'snapshot-v2', schemaVersion: 2, reserve: [stored], combat: { round: 0, participants: [] }, diceLines: [], log: [] });
  const store = createStore({ persistence });
  await store.ready;
  assert.deepEqual(store.getProfile('p').diceLines.map(item => item.note), ['Importee']);
  // Vider ensuite les actions reste possible : le patch fait foi, même vide.
  await store.updateProfile('p', { diceLines: [] });
  assert.deepEqual((await reload(persistence)).getProfile('p').diceLines, []);
});

test('E20 normalizeAction reprend `name` dans `note` quand `note` est vide, sans écraser une note existante', () => {
  const legacy = normalizeAction({ name: 'Hache ancienne', base: 40 });
  assert.equal(legacy.note, 'Hache ancienne');
  assert.equal(legacy.name, 'Hache ancienne');
  assert.equal(normalizeAction({ name: 'Ancien', note: 'Nouveau' }).note, 'Nouveau');
  assert.equal(normalizeAction({ base: 40 }).note, '');
});

test('E20 import texte — le libellé de l’action est aussi dans `note`', () => {
  const [profile] = parseProfileText('Nom: Orc\nPV: 12\nAction: Hache ancienne | base=40 | note=lourde\nAction: Coup | 45\n').profiles;
  assert.equal(profile.actions[0].name, 'Hache ancienne');
  assert.equal(profile.actions[0].note, 'Hache ancienne ; lourde');
  assert.equal(profile.actions[1].note, 'Coup ; 45');
});
});

describe('Import de profils JSON et texte', () => {
function memoryPersistence() {
  let state = null;
  return {
    async load() { return state && structuredClone(state); },
    async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }
  };
}

const one = json => parseProfileJson(JSON.stringify(json));
const messages = result => result.errors.map(error => `${error.field}|${error.reason}`);

test('JSON — l’exemple complet est prêt et remplit chaque case', () => {
  const result = parseProfileJson(PROFILE_JSON_EXAMPLE);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.errors, []);
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].fields.name.status, 'found');
  assert.equal(result.blocks[0].fields.hp.status, 'found');
  const [profile] = result.profiles;
  assert.equal(profile.name, 'Garde du pont');
  assert.equal(profile.kind, 'PNJ');
  assert.equal(profile.group, 'Milice de Bögenhafen');
  assert.equal(profile.hp, 12);
  assert.equal(profile.initiative, 35);
  assert.deepEqual(profile.caracs, { CC: 45, CT: 35, F: 35, E: 35, I: 35, Ag: 38, Dex: 30, Int: 28, FM: 32, Soc: 25 });
  assert.deepEqual(profile.armor, { head: 1, body: 2, arms: 1, legs: 0 });
  assert.deepEqual(profile.tags, ['humain', 'milice']);
  assert.match(profile.notes, /^Patrouille le pont de nuit\.\nSonne/);
  assert.equal(profile.favorite, true);
  assert.equal(profile.actions.length, 4);
  const [halberd, crossbow, dodge, skill] = profile.actions;
  assert.deepEqual([halberd.name, halberd.note, halberd.type, halberd.base, halberd.mod, halberd.damage, halberd.damageFormula], ['Hallebarde', 'Hallebarde', 'attack', 45, 0, 4, 'BF+4']);
  assert.deepEqual(halberd.qualities, [{ id: 'percutante', name: 'Percutante' }]);
  assert.deepEqual([crossbow.damage, 'damageFormula' in crossbow, crossbow.mod, crossbow.valuesX, crossbow.capacity], [9, false, -10, null, null]);
  assert.deepEqual(crossbow.qualities, [{ id: 'recharge', name: 'Recharge X', rating: 1 }]);
  assert.deepEqual([dodge.type, dodge.base, 'damage' in dodge, dodge.valuesX, dodge.capacity], ['defense', 38, false, null, null]);
  assert.deepEqual([skill.type, skill.mod], ['skill', 10]);
});

test('JSON — qualité avec valeur, formule de dégâts, caracs supplémentaires', () => {
  const result = one({ nom: 'Brute', pv: 20, caracteristiques: { M: 4, A: 2, B: 20, BF: 3, F: 45 }, jets: [
    { nom: 'Massue', score: 50, degats: 'BF+4', qualites: [{ nom: 'Recharge', valeur: 3 }, 'Dispersion 2', 'Impact'] },
    { nom: 'Souffle', score: 30, degats: '1d10' }
  ] });
  assert.equal(result.status, 'ready');
  const [profile] = result.profiles;
  assert.deepEqual(profile.caracs, { M: 4, A: 2, B: 20, BF: 3, F: 45 });
  const [club, breath] = profile.actions;
  assert.deepEqual(club.qualities.map(({ id, rating }) => [id, rating]), [['recharge', 3], ['dispersion', 2], ['percutante', undefined]]);
  assert.deepEqual([breath.damage, breath.damageFormula], [0, '1d10']);
});

test('JSON — clés françaises accentuées, majuscules et anglaises', () => {
  const french = one({ 'NOM': 'A', 'Type': 'créature', 'PV_Max': 7, 'Mots-Clés': 'x, y', 'Caractéristiques': { cc: 30, AGI: 40 }, 'Armure': { 'Tête': 1, 'JAMBES': 2 }, 'Jets': [{ Nom: 'Épée', 'Score': 40, 'Dégâts': 5, 'Qualités': 'Percutante, Précise', 'Modificateur': -5 }] });
  assert.equal(french.status, 'ready');
  const [profile] = french.profiles;
  assert.equal(profile.hp, 7);
  assert.deepEqual(profile.tags, ['x', 'y']);
  assert.deepEqual(profile.caracs, { CC: 30, Ag: 40 });
  assert.deepEqual(profile.armor, { head: 1, body: 0, arms: 0, legs: 2 });
  assert.equal(profile.actions[0].name, 'Épée');
  assert.equal(profile.actions[0].mod, -5);
  assert.equal(profile.actions[0].qualities.length, 2);

  const english = one({ name: 'B', kind: 'PJ', group: 'G', hp: 9, init: 44, caracs: { E: 30 }, armor: { head: 1, body: 1, arms: 1, legs: 1 }, tags: ['t'], notes: 'n', favorite: true,
    diceLines: [{ note: 'Arc', base: 35, mod: 0, type: 'attack', damage: 7, qualities: [{ id: 'percutante', name: 'Percutante' }], valuesX: 2, capacity: 12, id: 'x1', attr: 'CT', targetId: 't' }], id: 'keep-out', extensions: { a: 1 } });
  assert.equal(english.status, 'ready');
  assert.deepEqual(english.profiles[0], { name: 'B', kind: 'PJ', group: 'G', hp: 9, initiative: 44, caracs: { E: 30 }, armor: { head: 1, body: 1, arms: 1, legs: 1 }, tags: ['t'], notes: 'n', favorite: true,
    actions: [{ name: 'Arc', note: 'Arc', type: 'attack', base: 35, mod: 0, damage: 7, qualities: [{ id: 'percutante', name: 'Percutante' }], valuesX: 2, capacity: 12 }] });
});

test('JSON — objet seul, liste et enveloppe { profils }', () => {
  assert.equal(one({ nom: 'A', pv: 1 }).profiles.length, 1);
  assert.equal(one([{ nom: 'A', pv: 1 }, { nom: 'B', pv: 2 }]).profiles.length, 2);
  const wrapped = one({ format: 'outil-mj-profil', version: 1, profils: [{ nom: 'A', pv: 1 }, { nom: 'B', pv: 2 }] });
  assert.deepEqual(wrapped.profiles.map(profile => profile.name), ['A', 'B']);
  assert.equal(one({ profiles: [{ nom: 'A', pv: 1 }] }).profiles.length, 1);
  assert.throws(() => one({ version: 2, profils: [] }), error => error.userFacing === true && /version de format inconnue/i.test(error.message));
});

test('JSON — JSON illisible : erreur en français avec ligne et colonne', () => {
  const fails = (text, pattern) => assert.throws(() => parseProfileJson(text), error => error.userFacing === true && pattern.test(error.message), text);
  fails('{\n  "nom": "A",\n  "pv" 12\n}', /^JSON illisible, ligne 3, colonne 8 : « : » attendu après le nom du champ\.$/);
  fails('{"nom": "A",}', /^JSON illisible, ligne 1, colonne 13 : virgule en trop avant la fermeture\.$/);
  fails('[{"nom": "A"', /^JSON illisible, ligne 1, colonne 13 : le texte s’arrête trop tôt/);
  // Cas sans position dans le message de JSON.parse : valeur sans guillemets, virgule finale d'une liste, commentaire.
  fails('{ "nom": "A", "pv": douze }', /^JSON illisible, ligne 1, colonne 21 : valeur inattendue « d »/);
  fails('[{ "nom": "A", "pv": 1 }, ]', /^JSON illisible, ligne 1, colonne 27 : virgule en trop avant la fermeture\.$/);
  fails('{\n  // garde\n  "nom": "A"\n}', /^JSON illisible, ligne 2, colonne 3 : commentaire « \/\/ » non permis en JSON\.$/);
  fails("{'nom': 'A'}", /^JSON illisible, ligne 1, colonne 2 : nom de champ entre guillemets doubles attendu\.$/);
  fails('{"nom": "A", "pv": 1} x', /^JSON illisible, ligne 1, colonne 23 : texte en trop après la fin du JSON\.$/);
  fails('{"nom": "A" "pv": 1}', /^JSON illisible, ligne 1, colonne 13 : virgule ou « } » attendu/);
  // Échappement invalide (chemin Windows), nombre mal écrit, espace insécable entre deux éléments.
  fails('{"nom": "C:\\Users\\x", "pv": 1}', /^JSON illisible, ligne 1, colonne 12 : barre oblique inverse « \\ » invalide dans un texte : doublez-la/);
  fails('{"nom": "A", "pv": 012}', /^JSON illisible, ligne 1, colonne 20 : nombre mal écrit/);
  fails('{"nom": "A", "pv": .5}', /^JSON illisible, ligne 1, colonne 20 : nombre mal écrit/);
  fails('{"nom":\u00a0"A", "pv": 1}', /^JSON illisible, ligne 1, colonne 8 : espace spéciale \(insécable \?\)/);
  // Un fichier « UTF-8 avec BOM » ou des espaces insécables autour du JSON se lisent normalement.
  assert.equal(parseProfileJson('\uFEFF{"nom": "A", "pv": 1}').profiles[0].name, 'A');
  assert.equal(parseProfileJson('\u00a0{"nom": "A", "pv": 1}\u00a0').profiles[0].name, 'A');
  assert.equal(parseProfileInput('\u00a0{"nom": "A", "pv": 1}').profiles[0].name, 'A');
  // JSON valide avec échappements : accepté tel quel.
  assert.equal(parseProfileJson('{"nom": "Gob\\u00e9lin \\"le\\" \\\\ petit", "pv": 1}').profiles[0].name, 'Gobélin "le" \\ petit');
});

test('JSON — valeurs trop larges ou ambiguës signalées', () => {
  const listHp = one({ nom: 'A', pv: [12], armure: [2] });
  assert.deepEqual(messages(listHp), ['hp|entier-attendu', 'armure|entier-attendu']);
  const decimal = one({ nom: 'A', pv: 1, jets: [{ nom: 'Dague', score: 30, degats: '4.5' }] });
  assert.deepEqual(messages(decimal), ['jet 1 (Dague) · dégâts|entier-attendu']);
  // Une formule de sauvegarde et un nombre différent : le nombre l'emporte, comme dans le modèle.
  const [saved] = one({ nom: 'A', pv: 1, jets: [{ nom: 'Épée', score: 40, damage: 9, damageFormula: 'BF+4' }] }).profiles[0].actions;
  assert.deepEqual([saved.damage, 'damageFormula' in saved], [9, false]);
  const [formula] = one({ nom: 'A', pv: 1, jets: [{ nom: 'Épée', score: 40, damage: 4, damageFormula: 'BF+4' }] }).profiles[0].actions;
  assert.deepEqual([formula.damage, formula.damageFormula], [4, 'BF+4']);
  assert.throws(() => one({ profils: null }), error => error.userFacing === true && /« profils » doit être une liste/.test(error.message));
});

test('JSON — qualités : liste de textes groupés, valeur X réservée aux mots-clés à X, héritage d’objet ignoré', () => {
  const result = one({ nom: 'A', pv: 1, jets: [{ nom: 'Arbalète', score: 40, qualites: ['Recharge 2, Salve 1', 'Percutante 3', 'constructor', { id: 'zorglub', name: 'Zorglub Spécial' }] }] });
  const qualities = result.profiles[0].actions[0].qualities;
  assert.deepEqual(qualities.map(({ id, rating }) => [id, rating]), [['recharge', 2], ['salve', 1], ['percutante', undefined], ['constructor', undefined], ['zorglub-special', undefined]]);
  assert.deepEqual(result.unknownQualities.map(item => item.value), ['constructor', 'Zorglub Spécial']);
  // Objet sans « valeur » : l'entier final du nom en tient lieu, comme pour un texte.
  const [crossbow] = one({ nom: 'A', pv: 1, jets: [{ nom: 'Arbalète', score: 40, qualites: [{ nom: 'Recharge 2' }] }] }).profiles[0].actions;
  assert.deepEqual(crossbow.qualities, [{ id: 'recharge', name: 'Recharge X', rating: 2 }]);
});

test('Import texte : une qualité du registre sans moteur (« Défensive ») n’est plus « inconnue »', () => {
  const result = parseProfileText('Nom: Garde\nPV: 12\nAction: Épée | base=40 | qualités=Défensive, Météore');
  assert.deepEqual(result.unknownQualities.map(item => item.value), ['Météore']);
});

test('JSON — un élément de liste qui n’est pas un objet est refusé', () => {
  assert.throws(() => one([{ nom: 'A', pv: 1 }, { nom: 'B', pv: 1 }, 'C']), error => error.userFacing === true && error.message === 'Profil n°3 : un objet { … } est attendu.');
  assert.throws(() => one(42), error => error.userFacing === true);
});

test('JSON — nom ou PV absent : à vérifier', () => {
  const noName = one({ pv: 5 });
  assert.equal(noName.status, 'needs-review');
  assert.equal(noName.blocks[0].fields.name.status, 'missing');
  assert.equal(noName.blocks[0].fields.hp.status, 'found');
  const noHp = one({ nom: 'A' });
  assert.equal(noHp.status, 'needs-review');
  assert.equal(noHp.blocks[0].fields.hp.status, 'missing');
  assert.equal(noHp.blocks[0].blocking, true);
  const noJetName = one({ nom: 'A', pv: 1, jets: [{ score: 30 }, { nom: 'B' }] });
  assert.deepEqual(messages(noJetName), ['jet 1 · nom|champ-manquant', 'jet 2 (B) · score|champ-manquant']);
});

test('JSON — entier invalide, champ inconnu, type inconnu, qualité inconnue sont signalés', () => {
  const result = one({ nom: 'A', pv: 'douze', initiative: 3.5, type: 'Dragon', truc: 1, caracteristiques: { CC: 'x', Xy: 3 }, armure: { tete: -1, cou: 2 },
    jets: [{ nom: 'Arbalète', type: 'magie', score: 'a', qualites: ['Zorglub', 'Recharge 2'], bidule: 1 }] });
  assert.equal(result.status, 'needs-review');
  const found = messages(result);
  for (const expected of ['hp|entier-attendu', 'initiative|entier-attendu', 'kind|type-inconnu', 'truc|champ-inconnu', 'caracs.CC|entier-attendu', 'caractéristique Xy|champ-inconnu',
    'armor.head|valeur-negative', 'armure cou|champ-inconnu', 'jet 1 (Arbalète) · type|type-inconnu', 'jet 1 (Arbalète) · score|entier-attendu', 'jet 1 (Arbalète) · bidule|champ-inconnu']) {
    assert.ok(found.includes(expected), `${expected} absent de ${found.join(', ')}`);
  }
  assert.equal(result.profiles[0].kind, 'Créature');
  assert.equal(result.profiles[0].actions[0].type, '');
  assert.deepEqual(result.unknownQualities, [{ value: 'Zorglub', action: 'jet 1 (Arbalète)' }]);
  assert.deepEqual(result.profiles[0].actions[0].qualities.map(quality => quality.id), ['zorglub', 'recharge']);
  assert.equal(result.blocks[0].unknownQualities.length, 1);
});

test('JSON — armure en entier seul, tags en texte, PV depuis B, initiative depuis I puis 30', () => {
  const [armored] = one({ nom: 'A', pv: 1, armure: 3 }).profiles;
  assert.deepEqual(armored.armor, { head: 3, body: 3, arms: 3, legs: 3 });
  assert.deepEqual(one({ nom: 'A', pv: 1 }).profiles[0].armor, { head: 0, body: 0, arms: 0, legs: 0 });
  assert.deepEqual(one({ nom: 'A', pv: 1, tags: 'a, b ,c' }).profiles[0].tags, ['a', 'b', 'c']);
  const fromB = one({ nom: 'A', caracteristiques: { B: 14, I: 41 } });
  assert.equal(fromB.status, 'ready');
  assert.equal(fromB.profiles[0].hp, 14);
  assert.equal(fromB.profiles[0].initiative, 41);
  assert.equal(one({ nom: 'A', pv: 1 }).profiles[0].initiative, 30);
  assert.equal(one({ nom: 'A', pv: 1, initiative: 50, caracteristiques: { I: 41 } }).profiles[0].initiative, 50);
  assert.equal(one({ nom: 'A', pv: 1, notes: ['un', 'deux'] }).profiles[0].notes, 'un\ndeux');
});

test('JSON — id et extensions sont ignorés sans avertissement', () => {
  const result = one({ id: 'abc', extensions: { a: 1 }, nom: 'A', pv: 1, jets: [{ id: 'j', participantId: 'p', targetId: 't', attr: 'CC', nom: 'Coup', score: 30 }] });
  assert.equal(result.status, 'ready');
  assert.equal('id' in result.profiles[0], false);
  assert.equal('id' in result.profiles[0].actions[0], false);
});

test('parseProfileInput — aiguille JSON ou texte', () => {
  assert.equal(parseProfileInput('  \n{ "nom": "A", "pv": 4 }').profiles[0].name, 'A');
  assert.equal(parseProfileInput('[{ "nom": "A", "pv": 4 }]').profiles.length, 1);
  assert.deepEqual(parseProfileInput('Nom: Garde\nPV: 12').profiles, parseProfileText('Nom: Garde\nPV: 12').profiles);
  assert.throws(() => parseProfileInput('{ pas du json'), error => error.userFacing === true);
  // L'en-tête « [Profil] » du format texte n'est pas du JSON.
  assert.deepEqual(parseProfileInput('[Profil]\nNom: A\nPV: 3').profiles, parseProfileText('[Profil]\nNom: A\nPV: 3').profiles);
  assert.equal(parseProfileInput('\ufeff[ { "nom": "A", "pv": 4 } ]').profiles[0].name, 'A');
});

test('JSON — intégration Store : profil de la réserve avec jets normalisés et caracs', async () => {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const parsed = parseProfileJson(PROFILE_JSON_EXAMPLE);
  await store.importParsedProfiles(parsed.profiles);
  const [profile] = store.listProfiles();
  assert.equal(profile.name, 'Garde du pont');
  assert.equal(profile.caracs.CC, 45);
  assert.equal(profile.armor.body, 2);
  assert.equal(profile.diceLines.length, 4);
  const [halberd, crossbow] = profile.diceLines;
  assert.ok(halberd.id);
  assert.equal(halberd.damageFormula, 'BF+4');
  assert.equal(halberd.qualities[0].id, 'percutante');
  assert.deepEqual([crossbow.damage, crossbow.valuesX, crossbow.capacity, crossbow.qualities[0].rating], [9, null, null, 1]);
  assert.equal(profile.favorite, true);
});

test('Libellé des qualités : la valeur remplace le X d’un mot-clé à X', () => {
  assert.equal(qualityLabel({ id: 'recharge', name: 'Recharge X', rating: 2 }), 'Recharge 2');
  assert.equal(qualityLabel({ id: 'recharge', name: 'Recharge X' }), 'Recharge X');
  assert.equal(qualityLabel({ id: 'percutante', name: 'Percutante', rating: 3 }), 'Percutante');
  assert.equal(qualityLabel('Précise'), 'Précise');
});
});

describe('Participants issus du bestiaire', () => {
const library = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const byName = name => library.find(profile => profile.name === name && profile.kind === 'profile');
const build = (name, options = {}) => buildParticipantFromBestiary(byName(name).id, { library, ...options });

test('B1 Zombie — valeurs imprimées, aucune recalculée', () => {
  const zombie = build('Zombie', { idFactory: () => 'p1' });
  assert.equal(zombie.id, 'p1');
  assert.equal(zombie.name, 'Zombie');
  assert.equal(zombie.hp, 12);
  assert.equal(zombie.maxHp, 12);
  assert.deepEqual(zombie.caracs, { M: 4, CC: 15, F: 30, E: 30, I: 5, Ag: 10, Dex: 10 });
  assert.equal(zombie.initiative, 5);
  assert.equal(zombie.extensions.v5.bestiary.armour.toughnessBonus, 3);
  assert.deepEqual(zombie.armor, { head: 0, body: 0, arms: 0, legs: 0 });
  assert.equal(zombie.camp, 'neutre');
  assert.equal(zombie.zone, 'bench');
});

test('B1 Zombie — attaques à dégâts fixes imprimés, Morsure gratuite marquée', () => {
  const zombie = build('Zombie');
  assert.deepEqual(zombie.actions.map(a => [a.note, a.base, a.damage]), [['Hand Weapon', 25, 7], ['Bite', 30, 6]]);
  assert.deepEqual(zombie.actions[0].qualities.map(q => q.id), ['magique']);
  const bite = zombie.actions[1];
  assert.equal(bite.extensions.v5[BESTIARY_FREE_ATTACK_KEY], 'momentum');
  assert.equal(zombie.actions[0].extensions.v5?.[BESTIARY_FREE_ATTACK_KEY], undefined);
});

test('B1 Zombie — Traits sous forme de textes, mots-clés conservés et déduits', () => {
  const zombie = build('Zombie');
  assert.ok(zombie.traits.every(t => typeof t === 'string'));
  assert.ok(zombie.traits.includes('Undead'));
  assert.deepEqual(zombie.keywords, ['zombie']);
  assert.ok(participantKeywords(zombie).ids.includes('mort-vivant'));
  assert.equal(zombie.extensions.v5.bestiary.traitRefs.Undead, 'E0-T-061');
});

test('B1 Traits à précision : « Nom (précision) », sans valeur inventée', () => {
  const traits = Object.fromEntries(library.filter(p => p.kind === 'profile').flatMap(p => (p.traits || []).filter(t => t.param || t.rating).map(t => [t.name, p.name])));
  const sample = library.find(p => p.kind === 'profile' && (p.traits || []).some(t => t.name === 'Size' && t.param));
  const built = buildParticipantFromBestiary(sample.id, { library });
  const size = sample.traits.find(t => t.name === 'Size');
  assert.ok(built.traits.includes(`Size (${size.param})`));
  assert.ok(Object.keys(traits).length > 0);
});

test('B1 armure imprimée : parts non facultatives par zone, jamais de BE ajouté', () => {
  const withParts = library.find(p => p.kind === 'profile' && p.armour?.parts?.some(x => !x.optional && x.locations === 'Arms and Body'));
  const built = buildParticipantFromBestiary(withParts.id, { library });
  assert.deepEqual(built.armor, { head: 0, body: 1, arms: 1, legs: 0 });
  const all = [];
  for (const file of ['L01']) all.push(...JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${file}.json`, import.meta.url), 'utf8')).profiles);
  const uniform = all.find(p => p.kind === 'profile' && Number.isInteger(p.armour?.ap) && p.armour.ap > 0);
  const ap = uniform.armour.ap;
  assert.deepEqual(buildParticipantFromBestiary(uniform.id, { library: all }).armor, { head: ap, body: ap, arms: ap, legs: ap });
});

test('B1 attaques facultatives écartées par défaut, incluses sur demande', () => {
  const halfling = byName('Halfling');
  assert.deepEqual(build('Halfling').actions.map(a => a.note), ['Hand Weapon']);
  const all = build('Halfling', { includeOptional: true });
  assert.deepEqual(all.actions.map(a => a.note), ['Hand Weapon', 'Sling and Bullets']);
  assert.equal(all.actions[1].rangeYards, 60);
  assert.equal(all.actions[1].type, 'attack');
  assert.equal(all.actions[1].attr, 'CT');
  assert.equal(all.actions[0].attr, 'CC');
  assert.equal(halfling.attacks[1].optional, true);
});

test('B1 Blessures absentes : null conservé, jamais 0 ; case vide de caractéristique absente', () => {
  const absent = library.find(p => p.woundsAbsent === true) || null;
  if (absent) {
    const built = buildParticipantFromBestiary(absent.id, { library });
    assert.equal(built.hp, null);
    assert.equal(built.maxHp, null);
  }
  const zombie = build('Zombie');
  assert.equal(Object.hasOwn(zombie.caracs, 'CT'), false);
});

test('B1 options : nom français, camp, zone, rang d’exemplaire, suffixe', () => {
  const built = build('Zombie', { nameFr: true, camp: 'ennemi', zone: 'active', index: 2 });
  assert.equal(built.name, 'Zombie 2');
  assert.equal(built.camp, 'ennemi');
  assert.equal(built.zone, 'active');
  assert.equal(built.extensions.v5.bestiary.id, byName('Zombie').id);
});

test('B1 un participant passe sanitizeParticipant sans perte', () => {
  const zombie = build('Zombie');
  const clean = sanitizeParticipant(zombie);
  assert.equal(clean.hp, 12);
  assert.deepEqual(clean.keywords, ['zombie']);
  assert.equal(clean.actions.length, 2);
  assert.equal(clean.actions[1].extensions.v5[BESTIARY_FREE_ATTACK_KEY], 'momentum');
  assert.equal(clean.extensions.v5.bestiary.book, 'L06');
});

test('B1 refus : identifiant inconnu, gabarit, profil incohérent', () => {
  assert.throws(() => buildParticipantFromBestiary('E0-P-999', { library }), /inconnu/);
  const template = library.find(p => p.kind === 'template');
  assert.throws(() => buildParticipantFromBestiary(template.id, { library }), /gabarit/);
  assert.throws(() => buildParticipantFromBestiary(byName('Zombie').id, {}), /bibliothèque/);
});

test('B1 deux exemplaires : identifiants distincts, sans partage d’objets', () => {
  const a = build('Zombie');
  const b = build('Zombie');
  assert.notEqual(a.id, b.id);
  a.actions[0].damage = 99;
  a.extensions.v5.bestiary.armour.toughnessBonus = 99;
  assert.equal(b.actions[0].damage, 7);
  assert.equal(byName('Zombie').attacks[0].damage, 7);
  assert.equal(b.extensions.v5.bestiary.armour.toughnessBonus, 3);
});

test('B1 tous les profils de tous les livres (hors gabarits) se construisent', async () => {
  const { readdirSync } = await import('node:fs');
  let built = 0;
  for (const file of readdirSync(new URL('../../../js/data/bestiary/', import.meta.url)).filter(name => /^L\d\d\.json$/.test(name))) {
    const profiles = JSON.parse(readFileSync(new URL(`../../../js/data/bestiary/${file}`, import.meta.url), 'utf8')).profiles;
    for (const profile of profiles.filter(item => item.kind !== 'template')) {
      const participant = buildParticipantFromBestiary(profile.id, { library: profiles, includeOptional: true });
      assert.equal(participant.actions.length, (profile.attacks || []).reduce((sum, attack) => sum + (attack.count > 1 ? attack.count : 1), 0)
        + F2_H_PROFILE_ABILITIES.filter(rule => rule.profileId === profile.id && rule.specialAction).length, profile.id); // Q16 : « 2 Claws » = 2 actions ; F2-H : actions propres au profil
      assert.equal(participant.maxHp, profile.woundsAbsent ? null : profile.wounds, profile.id);
      built += 1;
    }
  }
  assert.equal(built, 882);
});
});
