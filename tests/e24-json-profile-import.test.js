import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProfileJson, parseProfileInput, PROFILE_JSON_EXAMPLE } from '../js/core/json-profile-import.js';
import { parseProfileText } from '../js/core/text-profile-import.js';
import { createStore } from '../js/core/store.js';
import { qualityLabel } from '../js/core/quality-normalization.js';

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
    { nom: 'Massue', score: 50, degats: 'BF+4', qualites: [{ nom: 'Recharge', valeur: 3 }, 'Taille 2', 'Impact'] },
    { nom: 'Souffle', score: 30, degats: '1d10' }
  ] });
  assert.equal(result.status, 'ready');
  const [profile] = result.profiles;
  assert.deepEqual(profile.caracs, { M: 4, A: 2, B: 20, BF: 3, F: 45 });
  const [club, breath] = profile.actions;
  assert.deepEqual(club.qualities.map(({ id, rating }) => [id, rating]), [['recharge', 3], ['taille', 2], ['percutante', undefined]]);
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
  const result = one({ nom: 'A', pv: 1, jets: [{ nom: 'Arbalète', score: 40, qualites: ['Recharge 2, Taille 1', 'Percutante 3', 'constructor', { id: 'zorglub', name: 'Zorglub Spécial' }] }] });
  const qualities = result.profiles[0].actions[0].qualities;
  assert.deepEqual(qualities.map(({ id, rating }) => [id, rating]), [['recharge', 2], ['taille', 1], ['percutante', undefined], ['constructor', undefined], ['zorglub-special', undefined]]);
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
