// U8 lot L0 (CA4, CA5) : cumul entre familles d'effets sur un même Test (docs/specs/moteur-effets-unifie/).
// Une ligne par paire de familles. Réponses du MJ du 05/11 (docs/PLAN_CHANTIERS_PARALLELES_05_11.md, « Décisions du MJ ») :
//  Q2 prière et sort sur le même Test se somment (sources différentes, p. 130), même clé comprise.
//  Q3 le malus d'un sort ou d'une prière s'ajoute à la pénalité d'États.
//  Q4 Avantage de cavalerie et Avantage d'un talent sont deux sources distinctes ; pas d'autre exclusion.
//  Q5 le plafond de DR d'une prière s'applique au résultat final, bonus compris.
// Un cas conforme aujourd'hui est un test ; un cas encore non conforme reste en `todo`, valeur attendue dans son titre.
// Déjà couverts par cumul-effets.test.js : talent + prière (R1), sorts entre eux (R3), même prière deux fois (R4), Avantages (R2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { magicSkillModifiers, magicAdverseModifiers, collectTestEffects } from '../../../js/core/v5-magic-talents.js';
import { calculateEffectiveStats } from '../../../js/core/v5-magic-effects.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { combineEffects } from '../../../js/core/effect-engine.js';

const spellLayer = (id, testModifiers) => ({ id, spellId: 'spell-' + id, spellName: id, casterId: 'caster-' + id, testModifiers });
const prayerLayer = (id, testModifiers) => ({ id, type: 'test-modifier', testModifiers });
const fighter = (id, camp, { spells = [], prayers = [], states = [], extra = {} } = {}) => ({
  id, name: id, kind: 'PNJ', camp, zone: 'active', size: 'average', hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 30, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  states, talents: [], skills: [], equipment: [], traits: [], armor: {},
  extensions: { v5: { hasMomentum: false, spellEffects: spells, divineEffects: prayers, ...extra } } });
const sum = rows => rows.reduce((total, row) => total + row.amount, 0);
const modifiersOf = result => result.test.options[0].result.details.modifiers;

// Attaque de mêlée (score 40, jet 42 : -0 DR de base) de `actor` sur `target`, Test de l'attaquant ou du défenseur.
const melee = (actor, target, { role = 'actor', participants = [actor, target], context = {}, defenseQualities = [] } = {}) => buildCombatTest({
  actor, target, roll: 42,
  action: { type: 'attack', label: 'Épée', attr: 'CC', base: 40, qualities: [] },
  defense: { type: 'skill', label: 'Corps à corps (Base)', attr: 'CC', base: 40, roll: 42, qualities: defenseQualities, v5: { kind: 'melee', context: {} } },
  attackContext: { ranged: false }, v5: { kind: 'melee', context }, v5State: { participants },
  combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} }, role);

// ---- Q2 · prière et sort ----
test('Q2 prière et sort sur le même Test, même clé : les deux bonus se somment (+1 et +1 = +2)', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('s', { 'Tous les Tests': 1 })], prayers: [prayerLayer('p', { 'Tous les Tests': 1 })] });
  assert.equal(sum(magicSkillModifiers(holder, 'Résistance', { carac: 'E' })), 2);
});

test('Q2 prière et sort sur le même Test, clés différentes : somme (+2 et +2 = +4)', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('s', { 'carac:e': 2 })], prayers: [prayerLayer('p', { 'Résistance': 2 })] });
  assert.equal(sum(magicSkillModifiers(holder, 'Résistance', { carac: 'E' })), 4);
});

test.todo('Q2 prière et sort sur la même caractéristique : somme, E 30 + 10 (sort) + 10 (prière) = 50 (aujourd\'hui 40, meilleur bonus commun)', () => {
  const stats = calculateEffectiveStats({ E: 30 }, [{ id: 's', casterId: 'x', statModifiers: { E: 10 } }, { id: 'p', type: 'characteristic-modifier', statModifiers: { E: 10 } }]);
  assert.equal(stats.E, 50);
});

test.todo('Q2 la pose d\'une prière sur un sort de même clé n\'est plus refusée (DIV-05) : somme attendue (aujourd\'hui refus à la pose, v5-divine-store.js)');

// Arbitrage du MJ du 06/11 : deux prières différentes suivent la règle des sorts, meilleur bonus et pire pénalité par Test résolu.
test('MJ 06/11 deux prières différentes, clés différentes, même Test : meilleur bonus et pire pénalité (+2, +1, -1, -2 donnent 0)', () => {
  const holder = fighter('h', 'pj', { prayers: [prayerLayer('p1', { 'Résistance': 2 }), prayerLayer('p2', { 'carac:e': 1 }),
    prayerLayer('p3', { 'Tous les Tests': -1 }), prayerLayer('p4', { 'Résistance': -2 })] });
  assert.equal(sum(magicSkillModifiers(holder, 'Résistance', { carac: 'E' })), 0);
});

test('MJ 06/11 groupe des prières à côté du groupe des sorts : meilleur bonus de chaque groupe, puis somme (Q2)', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('s1', { 'carac:e': 2 }), spellLayer('s2', { 'Endurance': 1 })],
    prayers: [prayerLayer('p1', { 'Résistance': 1 }), prayerLayer('p2', { 'Tous les Tests': 2 })] });
  assert.equal(sum(magicSkillModifiers(holder, 'Résistance', { carac: 'E' })), 4);
});

// Lot L3 : buildCombatTest lit talents et couches par collectTestEffects (R1 talent + sort/prière, Q2 sort + prière).
test('L3 talent, sort et prière sur le même Test : réunis par le moteur, chacun gardé (R1, Q2)', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('s', { 'Tous les Tests': 1 })], prayers: [prayerLayer('p', { 'Résistance': 1 })] });
  const talentRow = { id: 'talent:test', label: 'Talent', amount: 1 };
  const collected = collectTestEffects(holder, { skill: 'Résistance', carac: 'E' }, { talentRows: [talentRow] });
  assert.deepEqual(collected.talentRows, [talentRow]);
  assert.deepEqual(collected.layerRows, [{ key: 'Tous les Tests', amount: 1 }, { key: 'Résistance', amount: 1 }]);
  assert.deepEqual(collected.unresolved, []);
});

test('L3 Q13 une couche à deux clés visant le même Test : une source, clés additionnées (Charme +2 et Tous les Tests +1 → +3)', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('a', { 'Charme': 2, 'Tous les Tests': 1 }), spellLayer('b', { 'Charme': 2 })] });
  assert.equal(sum(magicSkillModifiers(holder, 'Charme', { carac: 'Soc' })), 3);
});

test('L3 clés « … adverse » de deux sorts sur le même Test de l\'opposant : meilleur bonus par Test résolu, plus de somme par clé', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('a', { 'Perception adverse': -1 }), spellLayer('b', { 'Perception (Vue) adverse': -2 })] });
  assert.equal(sum(magicAdverseModifiers(holder, 'Perception (Vue)')), -2);
  assert.equal(sum(magicAdverseModifiers(holder, 'Perception (Ouïe)')), -1);
});

// ---- Q3 · États et effets ----
const stunned = [{ key: 'sonne', name: 'Sonné', level: 1 }];
const conditionPenalty = result => result.penalty;

test('Q3 pénalité d\'État et malus de sort au même Test : ils s\'additionnent', () => {
  const target = fighter('t', 'ennemi');
  const stateOnly = melee(fighter('a', 'pj', { states: stunned }), target);
  const both = melee(fighter('a', 'pj', { states: stunned, spells: [spellLayer('s', { 'Tous les Tests': -1 })] }), target);
  assert.ok(conditionPenalty(stateOnly) > 0, 'Sonné donne une pénalité');
  assert.equal(conditionPenalty(both), conditionPenalty(stateOnly), 'la pénalité d\'États n\'absorbe pas le malus de sort');
  assert.equal(modifiersOf(both).find(row => row.id.startsWith('spell-skill:'))?.amount, -1);
  assert.equal(modifiersOf(both).length, modifiersOf(stateOnly).length + 1);
});

test('Q3 pénalité d\'État et malus de prière au même Test : ils s\'additionnent', () => {
  const target = fighter('t', 'ennemi');
  const stateOnly = melee(fighter('a', 'pj', { states: stunned }), target);
  const both = melee(fighter('a', 'pj', { states: stunned, prayers: [prayerLayer('p', { 'Tous les Tests': -1 })] }), target);
  assert.equal(conditionPenalty(both), conditionPenalty(stateOnly));
  assert.equal(modifiersOf(both).find(row => row.id.startsWith('spell-skill:'))?.amount, -1);
});

// ---- Q4 · qualités, surnombre, montures ----
test('Q4 qualité Défensive et bonus de sort au même Test de défense : +1 et +1 se somment', () => {
  const attacker = fighter('a', 'pj'), defender = fighter('t', 'ennemi', { spells: [spellLayer('s', { 'Tous les Tests': 1 })] });
  const rows = modifiersOf(melee(attacker, defender, { role: 'defender', defenseQualities: [{ id: 'defensive' }] }));
  assert.equal(rows.find(row => row.id === 'defensive-protection')?.amount, 1, JSON.stringify(rows));
  assert.equal(rows.find(row => row.id.startsWith('spell-skill:'))?.amount, 1, JSON.stringify(rows));
});

test('Q4 surnombre et bonus de sort au même Test d\'attaque : +1 et +1 se somment', () => {
  const attacker = fighter('a', 'pj', { spells: [spellLayer('s', { 'Tous les Tests': 1 })] }), ally = fighter('b', 'pj'), target = fighter('t', 'ennemi');
  const rows = modifiersOf(melee(attacker, target, { participants: [attacker, ally, target], context: { outnumberAttackerIds: ['b'] } }));
  assert.equal(rows.find(row => row.id === 'outnumber')?.amount, 1, JSON.stringify(rows));
  assert.equal(rows.find(row => row.id.startsWith('spell-skill:'))?.amount, 1, JSON.stringify(rows));
});

const weapon = name => { const item = getReferenceCatalogue().items.find(row => row.kind === 'weapon' && row.name === name); assert.ok(item, name); return item; };
const horse = () => ({ id: 'horse', kind: 'Créature', zone: 'active', size: 'large', caracs: { F: 50 }, traits: [], states: [] });

test('Q4 Avantage de cavalerie et Avantage d\'un talent sur la même attaque : deux sources distinctes', () => {
  const lance = weapon('Lance de cavalerie');
  const rider = fighter('attacker', 'pj', { extra: { mounted: true, mountId: 'horse' } }); rider.caracs.CC = 60; rider.equipment = [lance];
  const target = fighter('target', 'ennemi'); target.size = 'small';
  const preview = previewResolution({ actor: rider, target, roll: 25,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: lance.id } } },
    v5: { kind: 'melee', advantageSources: [{ id: 'talent-test', label: 'Talent donnant un Avantage' }] },
    v5State: { participants: [rider, target, horse()] } });
  const ids = preview.test.advantage.advantage.map(row => row.id);
  assert.ok(ids.includes('mounted:cavalry-against-smaller'), JSON.stringify(ids));
  assert.ok(ids.includes('talent-test'), JSON.stringify(ids));
  assert.equal(preview.test.advantage.net, 2);
});

test('Q4 Désavantage du cavalier protégé et autre Désavantage sur la même attaque : deux sources distinctes', () => {
  const dagger = weapon('Dague');
  const attacker = fighter('attacker', 'pj'); attacker.caracs.CC = 60; attacker.size = 'small'; attacker.equipment = [dagger];
  const rider = fighter('target', 'ennemi', { extra: { mounted: true, mountId: 'horse' } });
  const preview = previewResolution({ actor: attacker, target: rider, roll: 25,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5, extensions: { fiche: { equipmentId: dagger.id } } },
    v5: { kind: 'melee', disadvantageSources: [{ id: 'other-disadvantage', label: 'Autre Désavantage' }] },
    v5State: { participants: [attacker, rider, horse()] } });
  const ids = preview.test.advantage.disadvantage.map(row => row.id);
  assert.ok(ids.includes('mounted:protected-rider'), JSON.stringify(ids));
  assert.ok(ids.includes('other-disadvantage'), JSON.stringify(ids));
  assert.equal(preview.test.advantage.net, -2);
});

// ---- Q5 · plafond de prière ----
// Comportement actuel conforme (applyPrayerSLCaps appelé sur le Test déjà modifié) ; un cas réel demande une sanction calendaire
// sourcée (validCap, v5-divine-prayer-caps.js), à reprendre des fixtures de tests/unit/divin/courroux.test.js.
test.todo('Q5 plafond de DR de prière sur le résultat final, bonus compris : 1 DR + 2 de bonus = 3, plafonné à +0');

// ---- CA5 ----
// Lot L2 : le moteur d'effets (effect-engine.js) lit la table de cumul entre familles ; une table vide rend toute paire absente.
test('CA5 une paire de familles absente de la table est signalée au MJ, jamais additionnée en silence (lot L2)', () => {
  const entry = (kind, sourceId, target, amount, stack) => ({ bearer: { kind, sourceId }, effect: { op: 'modifySL', amount, stack, stackGroup: 'sl', target } });
  const entries = [entry('spell', 's', 'carac:e', 2, 'bestBonusWorstPenalty'), entry('prayer', 'p', 'Résistance', 1, 'bestBonusWorstPenalty')];
  const test = { skill: 'Résistance', carac: 'E' };
  assert.equal(combineEffects(entries, { test }).totals.modifySL, 3, 'paire tracée (Q2) : somme');
  const absent = combineEffects(entries, { test, table: {} });
  assert.equal(absent.ready, false);
  assert.deepEqual(absent.signals, [{ type: 'pairNotArbitrated', op: 'modifySL', kinds: ['prayer', 'spell'] }]);
  assert.equal(absent.totals.modifySL, undefined);
  assert.deepEqual(absent.groups.map(group => [group.kind, group.amount, group.status]), [['spell', 2, 'unresolved'], ['prayer', 1, 'unresolved']]);
});
