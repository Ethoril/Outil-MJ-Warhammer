import test from 'node:test';
import assert from 'node:assert/strict';
import { specializationMatches, specializationMigrationReport, buildReferential, traitTargets, traitTargetMatches } from '../js/core/creature-keywords.js';
import { isPsychologyImmune, previewGenericFearEncounter } from '../js/core/v5-talent-psychology.js';
import { previewV5TalentTestModifiers } from '../js/core/v5-talent-tests.js';

const talent = (id, specialization) => ({ id, status: 'resolved', rank: 1, ...(specialization ? { specialization } : {}) });
const person = (extra = {}, ...talents) => ({ id: 'p', name: 'P', camp: 'a', talents, states: [], traits: [], ...extra });
const attack = { id: 'a', type: 'attack', base: 50, note: 'Épée', extensions: {} };
const orc = { id: 'o', name: 'Orque', camp: 'b', keywords: ['orque'], talents: [], states: [] };
const dwarf = { id: 'd', name: 'Nain', camp: 'b', keywords: ['nain'], talents: [], states: [] };

test('K4 : une spécialisation désigne un mot-clé ; la cible porteuse du terme ou d’un descendant est visée', () => {
  assert.equal(specializationMatches('Peaux-vertes', { enemyKeywords: ['orque'] }), true);
  assert.equal(specializationMatches('peau verte', { enemyKeywords: ['gobelin', 'humain'] }), true);
  assert.equal(specializationMatches('Orques', { enemyKeywords: ['gobelin'] }), false, 'un Gobelin n’est pas un Orque');
  assert.equal(specializationMatches('Orques', { enemyKeywords: ['peaux-vertes'] }), false, 'la généralisation ne descend pas');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Orques' }), true, 'groupe saisi par le MJ, résolu par alias');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Nains', enemyKeywords: ['orque'] }), false, 'la saisie explicite du MJ prime sur la déduction');
  assert.equal(specializationMatches('Peaux-vertes', { enemyGroup: 'Orques', enemyKeywords: ['nain'] }), true, 'et peut forcer l’effet');
  assert.equal(specializationMatches('Tout', { enemyKeywords: ['nain'] }), true);
  assert.equal(specializationMatches('Everything', { enemyGroup: 'Nains' }), true);
  assert.equal(specializationMatches('Gobelins des collines', { enemyGroup: 'Gobelins des collines' }), true, 'texte non résoluble : égalité conservée');
  assert.equal(specializationMatches('Gobelins des collines', { enemyKeywords: ['gobelin'] }), false, 'texte non résoluble : jamais deviné');
  assert.equal(specializationMatches('Orques', {}), false);
  assert.equal(specializationMatches(null, { enemyKeywords: ['orque'] }), false);
  const extended = buildReferential([{ id: 'ulricain', nameFr: 'Ulricain', nameEn: 'Ulrican', parents: ['humain'] }]);
  assert.equal(specializationMatches('Humain', { enemyKeywords: ['ulricain'] }, extended), true);
});

test('K4 : rapport de migration des spécialisations en texte libre, cas par cas', () => {
  const rows = [talent('talent-hatred', 'Peaux-vertes'), talent('talent-hatred', 'Orques'), talent('talent-fearless', 'Tout'), talent('talent-hatred', 'Gobelins des collines'), talent('talent-hatred', 'Associés au Chaos'), talent('talent-ancestral-grudge', 'Elfes noirs'), talent('talent-hatred')];
  const report = specializationMigrationReport(rows);
  assert.deepEqual(report.map(row => [row.specialization, row.status, row.keywordId ?? null]), [
    ['Peaux-vertes', 'resolu', 'peaux-vertes'], ['Orques', 'resolu', 'orque'], ['Tout', 'joker', null],
    ['Gobelins des collines', 'a-migrer', null], ['Associés au Chaos', 'resolu', 'chaos'], ['Elfes noirs', 'resolu', 'elfe-noir']
  ]);
});

test('K4 : Sans peur et Haine s’appliquent d’office quand l’ennemi porte le mot-clé ou un descendant', () => {
  const fearless = person({}, talent('talent-fearless', 'Peaux-vertes'));
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: orc }), true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: dwarf }), false);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: { ...orc, keywordExclusions: ['orque'] } }), false, 'le MJ retire le mot-clé de l’ennemi');
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: dwarf, enemyGroup: 'Orques' }), true, 'saisie MJ prioritaire');
  assert.equal(isPsychologyImmune(fearless, { kind: 'terror', enemy: orc }), false);
  const hater = person({}, talent('talent-hatred', 'Skaven'));
  assert.equal(isPsychologyImmune(hater, { kind: 'fear', enemy: { keywords: ['skaven'] } }), true);
  assert.equal(isPsychologyImmune(hater, { kind: 'fear', enemy: { keywords: ['rat-ogre'] } }), true, 'le Rat-ogre est un Skaven');
  const raceDerived = { race: 'Gobelin', talents: [], states: [] };
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: raceDerived }), true, 'mot-clé déduit de la race');
});

test('K4 : la rencontre de Peur est annulée d’office pour la cible sans peur de ce groupe', () => {
  const author = { ...orc, id: 'author' };
  const brave = person({ id: 'brave', camp: 'a' }, talent('talent-fearless', 'Peaux-vertes'));
  const timid = person({ id: 'timid', camp: 'a' });
  const immune = previewGenericFearEncounter({ author, target: brave, rating: 2, sourceKind: 'trait' });
  assert.equal(immune.exempt, true);
  assert.equal(immune.reason, 'psychology-immunity');
  const affected = previewGenericFearEncounter({ author, target: timid, rating: 2, sourceKind: 'trait' });
  assert.equal(affected.exempt, false);
  assert.deepEqual(affected.addedStates[0].enemyKeywords, ['orque']);
});

test('K4 : le +1 DR de la Haine se déduit de l’adversaire, avec correction possible du MJ', () => {
  const hater = person({}, talent('talent-hatred', 'Peaux-vertes'));
  const run = (opponent, context) => previewV5TalentTestModifiers(hater, { action: attack, kind: 'melee', role: 'attacker', opponent, settings: { context: context || {} } });
  assert.equal(run(orc).slModifiers.length, 1);
  assert.equal(run(orc).plan.unresolved.length, 0, 'plus de saisie demandée au MJ');
  assert.equal(run(dwarf).slModifiers.length, 0);
  assert.equal(run(dwarf).plan.unresolved.length, 0, 'un Nain n’est pas visé, sans question');
  assert.equal(run(orc, { enemyGroup: 'Nains' }).slModifiers.length, 0, 'correction MJ : retirer l’effet');
  assert.equal(run(dwarf, { enemyGroup: 'Orques' }).slModifiers.length, 1, 'correction MJ : forcer l’effet');
  const unknown = run({ id: 'x', name: 'Inconnu', talents: [], states: [] });
  assert.equal(unknown.slModifiers.length, 0);
  assert.ok(unknown.plan.unresolved.some(row => row.fields.includes('enemyGroup')), 'sans mot-clé connu : le MJ doit trancher comme avant');
  assert.equal(run(undefined).plan.unresolved.some(row => row.fields.includes('enemyGroup')), true);
});

test('K4 : Haine, Animosité, Préjugé (Traits à cible) se lisent dans le référentiel, forme texte ou structurée', () => {
  const dwarf = { traits: ['Haine (Peaux-vertes)', { name: 'Animosity', param: 'Elves' }, { name: 'Prejudice (Strangers)' }, 'Hatred (Orcs and Goblins)', 'Animosity (Everything)', 'Hatred (Sigmarites des collines)'] };
  assert.deepEqual(traitTargets(dwarf, ['hatred', 'haine']).map(row => row.keywordId ?? row.raw), ['peaux-vertes', 'peaux-vertes', 'Sigmarites des collines']);
  assert.deepEqual(traitTargets(dwarf, ['animosity', 'animosite']).map(row => row.keywordId ?? row.wildcard), ['elfe', true]);
  assert.deepEqual(traitTargets(dwarf, ['prejudice', 'prejuge']).map(row => row.keywordId), ['etranger']);
  assert.equal(traitTargetMatches(dwarf, ['animosity'], { keywords: ['elfe-noir'] }), true, 'un Elfe noir est un Elfe');
  assert.equal(traitTargetMatches(dwarf, ['animosity'], { keywords: ['nain'] }), true, 'Animosité (Tout)');
  assert.equal(traitTargetMatches(dwarf, ['prejudice'], { keywords: ['humain'] }), false, 'Étranger est posé par le MJ, jamais déduit');
  assert.equal(traitTargetMatches(dwarf, ['prejudice'], { keywords: ['humain', 'etranger'] }), true);
  assert.equal(traitTargetMatches(dwarf, ['hatred'], { keywords: ['sigmarite'] }), false, 'texte non résoluble : jamais deviné');
});

test('K4 : le Trait Haine (cible) protège de la Peur et de l’Intimidation du groupe, pas de la Terreur', () => {
  const dwarf = person({ traits: ['Haine (Peaux-vertes)'] });
  assert.equal(isPsychologyImmune(dwarf, { kind: 'fear', enemy: orc }), true);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'intimidate', enemy: orc }), true);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'terror', enemy: orc }), false);
  assert.equal(isPsychologyImmune(dwarf, { kind: 'fear', enemy: { keywords: ['skaven'] } }), false);
  assert.equal(isPsychologyImmune(person({ traits: [{ name: 'Hatred', param: 'Greenskins' }] }), { kind: 'fear', enemy: orc }), true);
});

test('K4 : un mot-clé ajouté par le MJ sert aussitôt aux effets (référentiel actif posé par le Store)', async () => {
  const { createStore } = await import('../js/core/store.js');
  const values = new Map();
  const store = createStore({ storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } });
  const ulrican = { id: 'u', name: 'Ulricain', camp: 'b', keywords: ['ulricain'], talents: [], states: [] };
  const fearless = person({}, talent('talent-fearless', 'Humain'));
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), false, 'terme encore inconnu');
  assert.equal(store.addCreatureKeyword({ nameFr: 'Ulricain', parents: ['humain'] }).ok, true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), true, 'un Ulricain est un Humain');
  assert.equal(store.undo(), true);
  assert.equal(isPsychologyImmune(fearless, { kind: 'fear', enemy: ulrican }), false, 'annulé : retiré du référentiel actif');
});
