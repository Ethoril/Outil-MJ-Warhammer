/**
 * Livraison 2b du lot 3, retours de vérification : Protections filtrées sans blocage parasite (chute, écrasement, projectile
 * organique), nature de l'arme dans les protections défensives, Lumière aveuglante, Épée enflammée, Test d'Endurance par
 * compétence, Lames Azurées à chaque Tour de l'adversaire, étiquettes magiques et de feu déclarables.
 */
import test from 'node:test';
import {declaredAnswers,declaredFacts,fixtureBlade} from './helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { previewResolution } from '../js/core/resolution.js';
import { previewV5Turn } from '../js/core/v5-turn.js';
import { getSpellContract, previewSpellExecution } from '../js/core/v5-spell-contracts.js';
import { attackNature, matchFilter, natureTagLabel, spellAttackNature, targetNatureTags, weaponAttackNature } from '../js/core/v5-magic-combat.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [], actions:[fixtureBlade],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 8 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const cast = (store, name, extra = {}) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll: 25, ...declaredAnswers(['mage','enemy']), ...extra });
const hasState = (p, key) => (p.states || []).some(s => (s.key || s.name) === key);
const MELEE_DEFENSE = { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } };
const swing = (store, { kind = 'melee', context = {}, qualities = [] } = {}) => store.previewResolution({
  actorId: 'enemy', targetId: 'mage', action: { type: 'attack', attr: kind === 'ranged' ? 'CT' : 'CC', base: 60, damageFormula: 'BF+4', qualities }, roll: 25,
  v5: { kind, choice: 'keep', context }, ...(kind === 'melee' ? { defense: MELEE_DEFENSE } : {}) });
const fighters = () => [wizard('mage'), wizard('enemy', { camp: 'ennemi', caracs: { CC: 40, CT: 40, F: 40, E: 30, Int: 30, FM: 30, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 } })];

test('P1 : une attaque d’arme ou un sort ordinaire n’est ni une chute ni un écrasement, déclarables sinon', () => {
  const weapon = attackNature({ ranged: false });
  assert.equal(weapon.fall, false);
  assert.equal(weapon.crush, false);
  assert.equal(attackNature({ ranged: false, declared: { fall: true } }).fall, true);
  const leaves = { any: ['blunt', 'fall', 'crush'] };
  assert.deepEqual(matchFilter(leaves, weapon), { match: 'unknown', unknown: ['blunt'] }, 'seule l’arme contondante est demandée');
  assert.equal(matchFilter(leaves, attackNature({ ranged: false, declared: { fall: true } })).match, 'yes');
  assert.equal(matchFilter(leaves, spellAttackNature(getSpellContract('Carreau'))).match, 'no', 'un sort n’est pas une arme contondante');
});

test('P1 : Chute des feuilles ne bloque pas toute attaque et ne présente aucun libellé brut', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Chute des feuilles');
  const unknown = swing(store);
  assert.deepEqual(unknown.unresolved.filter(text => /préciser/.test(text)).length, 1, unknown.unresolved.join(' | '));
  assert.ok(unknown.unresolved.every(text => !/\bfall\b|\bcrush\b|\?/.test(text)), unknown.unresolved.join(' | '));
  assert.ok(swing(store, { context: { attackNature: { blunt: false } } }).unresolved.every(text => !/Protection/.test(text)));
  assert.equal(natureTagLabel('fall'), 'chute');
  assert.equal(natureTagLabel('crush'), 'écrasement');
  assert.match(natureTagLabel('inconnu'), /condition/, 'libellé de repli en français');
});

test('P5 : le Bouclier anti-flèches ne bloque ni l’épée ni un sort, même sans réponse du MJ', async () => {
  const people = fighters();
  const store = await combat(...people);
  await cast(store, 'Bouclier anti-flèches');
  const mage = person(store, 'mage');
  assert.deepEqual(mage.extensions.v5.wards[0].filter, { all: ['ranged', 'organicProjectile', 'external'] });
  const sword = swing(store);
  assert.ok(sword.unresolved.every(text => !/projectile|origine/.test(text)), sword.unresolved.join(' | '));
  assert.ok(sword.damage.finalDamage > 0);
  const bolt = previewSpellExecution(person(store, 'enemy'), 'Carreau', [mage], { participants: store.listParticipants(), roll: 25, reserveSl: 8 });
  assert.ok(!/projectile organique|origine extérieure/.test(bolt.error || ''), bolt.error);
  assert.equal(spellAttackNature(getSpellContract('Carreau')).organicProjectile, false);
  assert.equal(attackNature({ ranged: true }).organicProjectile, undefined, 'un tir reste à préciser');
  assert.equal(attackNature({ ranged: false }).organicProjectile, false);
});

test('P7 : critique défensif et Riposte transmettent la nature de l’arme qui frappe', () => {
  const attacker = { id: 'a', name: 'Attaquant', hp: 20, caracs: { E: 30 }, states: [], armor: { head: 0, body: 2, arms: 0, legs: 0 },
    extensions: { v5: { conditionalAp: [{ ap: 3, filter: { all: ['metal'] } }] } } };
  const input = context => ({ actor: attacker, target: { id: 't', name: 'Défenseur', hp: 20, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [] },
    action: { id: 'sword', type: 'attack', base: 60, damage: 4 }, roll: 22, baseRevision: 2,
    defense: { base: 50, roll: 33, v5: { kind: 'melee', context }, qualities: [] }, criticalRolls: { location: 57, effect: 65 }, defenderCriticalRolls: { location: 4, effect: 20 } });
  const asked = previewResolution(input({}));
  assert.ok(asked.unresolved.some(text => /critique défensif.*arme en métal/.test(text)), asked.unresolved.join(' | '));
  const answered = previewResolution(input({ attackNature: { metal: false } }));
  assert.ok(answered.unresolved.every(text => !/critique défensif.*arme en métal/.test(text)), answered.unresolved.join(' | '));
});

test('Lumière aveuglante : les créatures dotées de la Magie des Arcanes (Lumière) y sont immunisées', async () => {
  const arcane = wizard('enemy', { camp: 'ennemi', talents: [{ id: 'talent-arcane-magic', status: 'resolved', rank: 1, specialization: 'Hysh' }] });
  const store = await combat(wizard('mage'), arcane, wizard('brute', { camp: 'ennemi' }));
  const preview = store.previewSpellExecution('Lumière aveuglante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy', 'brute'] } });
  assert.equal(preview.ready, true, preview.error);
  const rows = Object.fromEntries(preview.secondaryResults.map(r => [r.targetId, r]));
  assert.ok(rows.enemy.immune);
  assert.deepEqual(rows.enemy.conditions, []);
  assert.deepEqual(rows.brute.conditions, ['Aveuglé', 'Aveuglé', 'Aveuglé']);
  await store.applySpellExecution('Lumière aveuglante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy', 'brute'] } });
  assert.ok(!hasState(person(store, 'enemy'), 'aveugle'));
  assert.ok(hasState(person(store, 'brute'), 'aveugle'));
});

test('Épée enflammée : maladresse du porteur sans Magie des Arcanes (Feu) = Enflammé ; attaque magique', async () => {
  // A natural 99 on a combat attack is a fumble; provide its explicit d10 table roll.
  const strike = (store, actorId, roll = 99) => store.previewResolution({ actorId, targetId: 'enemy', action: { id:'blade', type: 'attack', attr: 'CC', base: 40, damageFormula: 'BF+4', qualities: [] }, roll,
    v5: { kind: 'melee', choice: 'keep', context: { fumbleRoll: 8 } }, defense: MELEE_DEFENSE });
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await cast(store, 'Épée Enflammée de Rhuin');
  const fumble = strike(store, 'mage');
  assert.ok(fumble.actorConditionApplication.some(row => row.name === 'Enflammé' && row.source.kind === 'magic-weapon'), JSON.stringify(fumble.actorConditionApplication));
  await store.applyResolution(fumble);
  assert.ok(hasState(person(store, 'mage'), 'enflamme'));
  const plainMiss = strike(store, 'mage', 70);
  assert.ok(!plainMiss.actorConditionApplication.some(row => row.name === 'Enflammé'), 'un simple échec ne brûle pas');
  const fire = await combat(wizard('mage', { talents: [{ id: 'talent-arcane-magic', status: 'resolved', rank: 1, specialization: 'Aqshy' }] }), wizard('enemy', { camp: 'ennemi' }));
  await cast(fire, 'Épée Enflammée de Rhuin');
  assert.ok(!strike(fire, 'mage').actorConditionApplication.some(row => row.name === 'Enflammé'), 'Magie des Arcanes (Feu) : exempté');
  const bonus = person(store, 'mage');
  assert.equal(weaponAttackNature({ actor: bonus, action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' }).magical, true);
  assert.equal(weaponAttackNature({ actor: bonus, action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' }).fire, true);
});

test('Robe scintillante : le Test d’Endurance utilise la compétence Endurance quand le personnage l’a', async () => {
  const skilled = wizard('enemy', { camp: 'ennemi', skills: [{ name: 'Endurance', total: 55 }] });
  const store = await combat(wizard('mage'), skilled);
  const roll = value => store.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: value } } });
  const passed = roll(50).secondaryResults[0].test;
  assert.deepEqual([passed.score, passed.passed], [55, true], 'compétence 55, pas la caractéristique E 30');
  assert.equal(roll(60).secondaryResults[0].test.passed, false);
  const noSkill = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  const plain = noSkill.previewSpellExecution('Robe scintillante', { actorId: 'mage', targetIds: ['mage'], roll: 25, secondaryTargets: { engaged: ['enemy'] }, targetTests: { enemy: { roll: 50 } } });
  assert.deepEqual([plain.secondaryResults[0].test.score, plain.secondaryResults[0].test.passed], [30, false], 'sans compétence : caractéristique E');
});

test('Lames Azurées : 3 coups de 8 à chaque Tour de l’adversaire désigné, jets de localisation demandés', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }), wizard('other', { camp: 'ennemi' }));
  await cast(store, 'Lames Azurées', { secondaryTargets: { engaged: ['other'] } });
  const state = JSON.parse(store.getFullJSON());
  const first = previewV5Turn(state);
  assert.equal(first.status, 'requires-input');
  assert.deepEqual(first.requests.map(r => [r.participantId, r.kind]), [['other', 'd100'], ['other', 'd100'], ['other', 'd100']]);
  assert.match(first.requests[0].label, /Lames Azurées.*Localisation du coup 1/);
  const inputs = { other: Object.fromEntries(first.requests.map((r, i) => [r.field, [22, 45, 77][i]])) };
  const second = previewV5Turn(state, { inputs });
  assert.equal(second.status, 'ready', JSON.stringify(second.requests));
  const struck = second.state.combat.participants.find(p => p.id === 'other');
  assert.equal(struck.hp, 30 - 3 * (8 - 3), '3 coups de 8 − BE 3, sans armure');
  assert.ok(second.state.log.some(row => /Lames Azurées/.test(row.text) && /Très Longues/.test(row.text)));
  // Un adversaire non désigné n'est jamais touché, et chaque nouveau Tour de l'adversaire redemande les coups.
  const next = previewV5Turn(second.state, {});
  assert.equal(next.status, 'ready', 'Tour de l’ennemi non désigné : aucune demande');
  assert.equal(next.state.combat.participants.find(p => p.id === 'enemy').hp, 30);
  const round2 = previewV5Turn(next.state, {});
  assert.equal(round2.status, 'ready', 'Tour du lanceur');
  const again = previewV5Turn(round2.state, {});
  assert.equal(again.status, 'requires-input', 'Round suivant, Tour de l’adversaire désigné : nouveaux coups à localiser');
  assert.equal(again.requests.length, 3);
});

test('Étiquettes magique et feu : déclarables seulement quand une Protection active en dépend', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Égide d’Aqshy');
  const aegis = person(store, 'mage');
  const melee = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' });
  assert.deepEqual(targetNatureTags(aegis, melee), ['fire'], 'le feu non magique peut être déclaré ; pas « magique » en contact');
  const ranged = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'ranged' });
  assert.ok(targetNatureTags(aegis, ranged).includes('fire'));
  const plain = person(store, 'enemy');
  assert.deepEqual(targetNatureTags(plain, melee), [], 'aucune Protection : aucune question');
  // Un tir de feu sans qualité Enflammée est déclaré par le MJ : l'Égide le traite comme du feu non magique.
  const undeclared = swing(store, { kind: 'ranged', context: { attackNature: { external: true } } });
  const declared = swing(store, { kind: 'ranged', context: { attackNature: { fire: true } } });
  assert.ok(declared.damage.finalDamage < undeclared.damage.finalDamage || declared.damage.finalDamage === 0, 'le feu déclaré est neutralisé par l’Égide');
});

test('Dôme : aucune question d’origine pour une attaque de contact', async () => {
  const store = await combat(...fighters());
  await cast(store, 'Dôme');
  const dome = person(store, 'mage');
  const melee = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'melee' });
  assert.deepEqual(targetNatureTags(dome, melee), []);
  const ranged = weaponAttackNature({ actor: person(store, 'enemy'), action: { id:'blade', type: 'attack', qualities: [] }, kind: 'ranged' });
  assert.deepEqual(targetNatureTags(dome, ranged), ['external'], 'un tir est déjà éprouvé : seule l’origine reste à préciser');
});
