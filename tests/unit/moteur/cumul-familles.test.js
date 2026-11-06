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
import { calculateEffectiveStats, calculateMagicApByLocation, calculateEffectiveMagicAP } from '../../../js/core/v5-magic-effects.js';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { combineEffects } from '../../../js/core/effect-engine.js';
import { conditionPenaltyEffects, conditionDisadvantageEffects } from '../../../js/core/condition-effects.js';
import { finalizeDivineState } from '../../../js/core/v5-divine-store.js';
import { psychologyTraits } from '../../../js/core/creature-psychology.js';
import { magicWeaponBonus } from '../../../js/core/v5-magic-combat.js';
import { applyArcaneArmorDamage } from '../../../js/core/v5-magic-arcane-unforgiving.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { previewHistoricalWrath } from '../../fixtures/divine-wrath-history.mjs';

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

// Lot L3 : sorts et prières passés en deux groupes (spellEffects, divineEffects), comme dans recomputeLayerValues.
test('Q2 prière et sort sur la même caractéristique : somme, E 30 + 10 (sort) + 10 (prière) = 50', () => {
  const stats = calculateEffectiveStats({ E: 30 }, [{ id: 's', casterId: 'x', statModifiers: { E: 10 } }], [{ id: 'p', type: 'characteristic-modifier', statModifiers: { E: 10 } }]);
  assert.equal(stats.E, 50);
});

test('Q2 la pose d\'une prière sur un sort de même clé n\'est plus refusée (DIV-05 lu dans la table du moteur)', () => {
  const state = (divine, spell) => ({ combat: { participants: [{ id: 'p', zone: 'active', extensions: { v5: { divineEffects: [{ id: 'd', ...divine }], spellEffects: [{ id: 's', ...spell }] } } }] } });
  const same = state({ testModifiers: { 'Résistance': 1 }, statModifiers: { E: 10 } }, { testModifiers: { 'Résistance': 1 }, statModifiers: { E: 10 } });
  assert.doesNotThrow(() => finalizeDivineState(same, structuredClone(same)));
  // Q14 (06/11) : PA, bonus d'arme et Traits identiques se somment aussi, la pose n'est plus refusée.
  const others = state({ traits: ['Peur (1)'], apModifiers: { all: 1 }, weaponBonus: { damage: 1 } }, { traits: ['Peur (1)'], apModifiers: { all: 1 }, weaponBonus: { damage: 1 } });
  assert.doesNotThrow(() => finalizeDivineState(others, structuredClone(others)));
});

test('Q14 PA d\'un sort et d\'une prière sur la même localisation : somme, meilleur bonus dans chaque groupe', () => {
  const spells = [{ id: 's1', casterId: 'x', apModifiers: { body: 2 } }, { id: 's2', casterId: 'y', apModifiers: { body: 1 } }];
  const prayers = [{ id: 'p1', type: 'armor-bonus', apModifiers: { all: 1 } }];
  assert.equal(calculateMagicApByLocation(spells, prayers).body, 3);
  assert.equal(calculateEffectiveMagicAP({ body: 1 }, spells, {}, prayers).body, 4);
});

test('Q17 deux Traits identiques à valeur (Peur (2) et Peur (3)) : la plus haute est gardée, quel que soit l\'ordre', () => {
  for (const traits of [['Peur (2)', 'Peur (3)'], ['Peur (3)', 'Peur (2)']]) {
    const fear = psychologyTraits({ traits }).filter(trait => trait.key === 'fear');
    assert.equal(fear.length, 1);
    assert.equal(Number.parseInt(fear[0].detail, 10), 3, JSON.stringify(fear));
  }
});

test('Q18 deux remplacements du bonus de dégâts (sort et prière) : le plus haut est gardé', () => {
  const actor = { extensions: { v5: { weaponBonuses: [{ effectId: 's', replaceDamageBonus: 4 }, { effectId: 'd', divineEffectId: 'd', replaceDamageBonus: 6 }] } } };
  assert.equal(magicWeaponBonus(actor, { id: 'w', type: 'attack' }, false, 3), 3, 'remplacement 6 contre une base de 3');
});

test('Q14 Arcanes impitoyables : les PA recalculés après dégradation gardent les prières, en groupe sommé aux sorts', () => {
  const target = { id: 't', armor: { body: 2 }, extensions: { v5: { baseArmor: { head: 0, body: 2, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 },
    spellEffects: [{ id: 's', casterId: 'x', apModifiers: { body: 1 } }], divineEffects: [{ id: 'p', type: 'armor-bonus', apModifiers: { body: 2 } }] } } };
  const next = applyArcaneArmorDamage(target, { destroyedAp: 1, damageByLocation: { body: 1 } });
  assert.equal(next.armor.body, 2 + 1 + 2 - 1);
});

test('Q16 clé « … adverse » du porteur et sort posé sur l\'opposant, même Test : les deux se somment', () => {
  const holder = fighter('h', 'pj', { spells: [spellLayer('a', { 'Perception adverse': -1 })] });
  const opponent = fighter('o', 'ennemi', { spells: [spellLayer('b', { 'Perception': -2 })] });
  assert.equal(sum([...magicSkillModifiers(opponent, 'Perception'), ...magicAdverseModifiers(holder, 'Perception')]), -3);
});

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

// Lot L4 : les États passent dans le moteur d'effets (condition-effects.js) : plus forte pénalité seule (`strongest`), un seul
// État donne ses Désavantages, exceptions appliquées avant le cumul.
const state = (key, name, level = 1) => ({ key, name, level });
const conditionRows = result => modifiersOf(result).filter(row => row.id === 'conditions');

test('L4 pénalités d\'États différents : seule la plus forte s\'applique (Sonné 2, Exténué 1, Empoisonné 1 → −2)', () => {
  const result = melee(fighter('a', 'pj', { states: [state('sonne', 'Sonné', 2), state('extenue', 'Exténué'), state('empoisonne', 'Empoisonné')] }), fighter('t', 'ennemi'));
  assert.equal(result.penalty, 2);
  assert.deepEqual(conditionRows(result).map(row => row.amount), [-2]);
  assert.deepEqual(result.penaltyStates, ['sonne', 'extenue', 'empoisonne']);
});

test('L4 les États écartés restent listés avec la règle qui les écarte (CA7)', () => {
  const effects = conditionPenaltyEffects(new Map([['sonne', 1], ['extenue', 3], ['empoisonne', 0]]));
  assert.equal(effects.penalty, 3);
  assert.deepEqual(effects.kept, ['extenue']);
  assert.deepEqual(effects.dropped, [{ key: 'sonne', rule: 'strongest' }]);
});

test('L4 Désavantages d\'États : seul l\'État qui en donne le plus s\'applique (À terre 1, Aveuglé 2 → 2 Désavantages)', () => {
  const result = melee(fighter('a', 'pj', { states: [state('aterre', 'À terre'), state('aveugle', 'Aveuglé', 2)] }), fighter('t', 'ennemi'));
  assert.deepEqual(result.test.advantage.disadvantage.map(row => row.id), ['blinded-0', 'blinded-1']);
  assert.deepEqual(conditionDisadvantageEffects(new Map([['prone', [{ id: 'prone' }]], ['besmirched', [{ id: 'besmirched' }]]])).map(row => row.id), ['prone'], 'à égalité, le premier déclaré');
});

test('L4 exception : Endurance de l\'anachorète (ignoreConditionPenalties) ôte pénalité et Désavantages d\'États', () => {
  const result = melee(fighter('a', 'pj', { states: [state('sonne', 'Sonné', 2), state('aveugle', 'Aveuglé')], extra: { specialStates: { ignoreConditionPenalties: true } } }), fighter('t', 'ennemi'));
  assert.equal(result.penalty, 0);
  assert.deepEqual(conditionRows(result), []);
  assert.deepEqual(result.test.advantage.disadvantage, []);
});

test('L4 exceptions avant le cumul : Exténué ignoré (Revigorer), Sonné ignoré sur un Test mental (Clarté de pensée), talent qui retire des niveaux', () => {
  const levels = new Map([['sonne', 1], ['extenue', 3], ['empoisonne', 0]]);
  assert.equal(conditionPenaltyEffects(levels, { ignoreFatigue: true }).penalty, 1);
  assert.equal(conditionPenaltyEffects(levels, { ignoreFatigue: true, ignoreStun: true }).penalty, 0);
  assert.equal(conditionPenaltyEffects(levels, { talentIgnores: [{ key: 'extenue', amount: 2 }] }).penalty, 1);
  assert.equal(levels.get('extenue'), 3, 'niveaux d\'entrée intacts');
});

test('L4 Q12 talent et pénalité d\'États se somment ; la saisie du MJ aussi', () => {
  const entries = [
    { bearer: { kind: 'condition', sourceId: 'sonne' }, effect: { op: 'modifySL', amount: -2, stack: 'strongest', stackGroup: 'condition-penalty' } },
    { bearer: { kind: 'condition', sourceId: 'extenue' }, effect: { op: 'modifySL', amount: -1, stack: 'strongest', stackGroup: 'condition-penalty' } },
    { bearer: { kind: 'talent', sourceId: 't' }, effect: { op: 'modifySL', amount: 1, stack: 'add', stackGroup: 'talent-t' } }];
  assert.equal(combineEffects(entries).totals.modifySL, -1);
  const target = fighter('t', 'ennemi');
  const stateOnly = melee(fighter('a', 'pj', { states: stunned }), target);
  const withGm = buildCombatTest({ actor: fighter('a', 'pj', { states: stunned }), target, roll: 42,
    action: { type: 'attack', label: 'Épée', attr: 'CC', base: 40, qualities: [] },
    defense: { type: 'skill', label: 'Corps à corps (Base)', attr: 'CC', base: 40, roll: 42, qualities: [], v5: { kind: 'melee', context: {} } },
    attackContext: { ranged: false }, v5: { kind: 'melee', context: {}, slModifiers: [{ id: 'gm', label: 'MJ', amount: -1 }] }, v5State: { participants: [target] },
    combatPrelude: {}, weaponSkillUnresolved: [], protectionContext: {} }, 'actor');
  assert.equal(withGm.penalty, stateOnly.penalty);
  assert.equal(sum(modifiersOf(withGm)), sum(modifiersOf(stateOnly)) - 1);
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
// Comportement actuel conforme (applyPrayerSLCaps appelé sur le Test déjà modifié). Sanction calendaire 6–10 sourcée, posée par la
// fixture historique de tests/unit/divin/courroux.test.js (previewHistoricalWrath, validée par validCap).
test('Q5 plafond de DR de prière sur le résultat final, bonus compris : 1 DR + 2 de bonus = 3, plafonné à +0', () => {
  const PRAY = 'skill-50_72_69_e8_72_65-base';
  const priest = { ...fighter('priest', 'pj', { extra: { divine: { sin: 0 } } }), kind: 'PJ', skills: [{ id: PRAY, name: 'Prière', carac: 'Soc', status: 'resolved', total: 60 }] };
  const state = { schemaVersion: 3, reserve: [], combat: { round: 1, participants: [priest] }, extensions: { v5: {} } };
  state.extensions.v5.gameClock = createGameClock(state);
  const wrath = previewHistoricalWrath(state);
  assert.equal(wrath.ready, true, wrath.error);
  const sanctioned = wrath.state.combat.participants[0];
  // Soc 60, jet 50 : 1 DR ; bonus de +2 DR : 3 DR.
  const pray = actor => previewResolution({ actor, roll: 50, action: { type: 'skill', label: 'Prière', attr: 'Soc', base: 60, extensions: { fiche: { skillId: PRAY } } },
    v5: { kind: 'test', slModifiers: [{ id: 'gm-bonus', label: 'Bonus du MJ', amount: 2 }] }, v5State: { participants: [actor] } });
  const free = pray(priest), capped = pray(sanctioned);
  assert.equal(free.test.success, true); assert.equal(free.test.sl, 3, 'sans sanction : 1 DR + 2 de bonus');
  assert.equal(capped.test.success, true); assert.equal(capped.test.sl, 0, 'plafond sur le résultat final, bonus compris');
});

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
