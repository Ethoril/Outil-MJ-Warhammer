import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseCriticalEffect } from '../../../js/core/criticals.js';
import { V5_CRIT_DATA, getV5CriticalEffect, V5_CRITICAL_TABLE_VERSION } from '../../../js/data/v5-crits.js';
import { CRIT_DATA } from '../../../js/data/crits.js';
import { applyResolution, describeResolutionDetail, previewHpLoss, previewResolution } from '../../../js/core/resolution.js';
import { createStore } from '../../../js/core/store.js';
import { prepareV5TalentCriticalRolls } from '../../../js/core/v5-talent-combat.js';

describe('Critiques', () => {
const state = (key, name, level) => ({ key, name, level });
const parse = (table, max) => parseCriticalEffect(CRIT_DATA[table].find(line => line.max === max).eff);
const ALLOWED = new Set(['hemorragique', 'sonne', 'aveugle', 'assourdi', 'a-terre', 'extenue']);
const CONDITIONAL = /(?:^|[^\p{L}])(?:test|ou|risque|si)(?![\p{L}])|\d+d\d+/iu;

test('E22 critiques — invariants sur les 80 lignes de la table', () => {
  let lines = 0;
  for (const rows of Object.values(CRIT_DATA)) {
    for (const { eff } of rows) {
      lines++;
      const parsed = parseCriticalEffect(eff);
      const prefix = /^\+(\d+) Blessures?/.exec(eff);
      assert.equal(parsed.extraWounds, prefix ? Number(prefix[1]) : 0, eff);
      assert.equal(parsed.death, eff === 'Mort instantanée.', eff);
      if (parsed.death) assert.deepEqual([parsed.extraWounds, parsed.states, parsed.reminders], [0, [], []]);
      parsed.states.forEach(item => {
        assert.ok(ALLOWED.has(item.key), `${item.key} dans « ${eff} »`);
        assert.ok(item.level >= 1);
      });
      // Un segment conditionnel ou aléatoire reste en rappel, sans aucun état.
      const conditional = eff.replace(/Rés\./g, 'Rés').split(/[,.;]/).map(item => item.trim())
        .filter(item => item && CONDITIONAL.test(item.replace(/\s*\([^)]*\)$/, '')));
      conditional.forEach(segment => assert.ok(parsed.reminders.includes(segment), `« ${segment} » en rappel`));
    }
  }
  assert.equal(lines, 80);
});

test('E22 critiques — exemples exacts', () => {
  assert.deepEqual(parse('HEAD', 35), { extraWounds: 2, states: [state('sonne', 'Sonné', 1)], reminders: [], death: false });
  assert.deepEqual(parse('ARM', 70), {
    extraWounds: 4, states: [state('hemorragique', 'Hémorragique', 4)], reminders: ['Hémorragie : risque réouverture'], death: false
  });
  assert.deepEqual(parse('LEG', 75), {
    extraWounds: 4, states: [state('a-terre', 'À Terre', 1), state('sonne', 'Sonné', 1)],
    reminders: ['Test Rés ou Inconscient', 'Jambe inutilisable'], death: false
  });
  assert.deepEqual(parse('LEG', 80), {
    extraWounds: 4, states: [state('sonne', 'Sonné', 1), state('a-terre', 'À Terre', 1)],
    reminders: ['Déchirure (Maj)', 'Fracture (Maj)'], death: false
  });
  assert.deepEqual(parse('BODY', 25), { extraWounds: 1, states: [], reminders: ['Test Rés ou 3 États Sonné'], death: false });
  assert.deepEqual(parse('BODY', 93), {
    extraWounds: 5, states: [state('hemorragique', 'Hémorragique', 3), state('extenue', 'Exténué', 1)],
    reminders: ['1d10 Sonné', 'Exténué : perm'], death: false
  });
  assert.deepEqual(parse('BODY', 96), {
    extraWounds: 5, states: [], reminders: ['Hémorragie interne (difficile à soigner)'], death: false
  });
  assert.deepEqual(parse('HEAD', 80), {
    extraWounds: 4,
    states: [state('assourdi', 'Assourdi', 1), state('hemorragique', 'Hémorragique', 2), state('extenue', 'Exténué', 1)],
    reminders: ['1d10 Sonné', 'Exténué (1d10j)'], death: false
  });
  assert.deepEqual(parse('HEAD', 100), { extraWounds: 0, states: [], reminders: [], death: true });
});

const target = (hp, extra = {}) => ({
  id: 't', name: 'Cible', hp, caracs: { E: 35 }, armor: { head: 0, body: 1, arms: 2, legs: 4 }, states: [], ...extra
});
const hero = { id: 'a', name: 'Héros', hp: 10, caracs: { E: 30 }, states: [] };
// Ranged normal hit: roll22 => left arm, 4+4SL−BE3−AP2=3 wounds.
const strike = (over = {}) => previewResolution({
  actor: hero, target: target(10), action: { type: 'attack', base: 60, damage: 4 }, v5: { kind: 'ranged' }, roll: 22, baseRevision: 1, ...over
});
const current = preview => ({ revision: 1, participants: [preview.input.actor, preview.input.target], appliedResolutionIds: [] });

test('V5 critiques — 80 lignes, bornes propres à chaque zone et aucune limite générale à 100', () => {
  assert.equal(Object.values(V5_CRIT_DATA).flat().length, 80);
  for (const [table, deathAt] of Object.entries({ HEAD: 100, ARM: 136, BODY: 116, LEG: 126 })) {
    assert.equal(getV5CriticalEffect(table, deathAt - 1).parsed.death, false, table);
    assert.equal(getV5CriticalEffect(table, deathAt).parsed.death, true, table);
    assert.equal(getV5CriticalEffect(table, 200).parsed.death, true, table);
    const rows = V5_CRIT_DATA[table];
    assert.ok(rows.every((row, i) => !i || row.max > rows[i - 1].max));
    assert.ok(rows.every(row => Number.isFinite(row.max)), 'receipts serialize to JSON');
  }
  assert.equal(getV5CriticalEffect('BODY', 100).name, 'Blessure majeure à la poitrine');
  assert.equal(getV5CriticalEffect('ARM', 110).parsed.extraWounds, 4);
});

test('V5 critiques — localisation critique aléatoire et dégâts ordinaires indépendants', () => {
  const preview = strike({ criticalRolls: { location: 57, effect: 43 } });
  assert.equal(preview.location.name, 'Bras Gauche');
  assert.equal(preview.location.roll, 22);
  assert.equal(preview.damage.finalDamage, 3);
  assert.equal(preview.critical.details.location.name, 'Corps');
  assert.equal(preview.critical.details.locationRoll, 57);
  assert.equal(preview.critical.details.effect.name, 'Bleus aux côtes');
  assert.equal(strike({ criticalRolls: { location: 30, effect: 43 } }).damage.finalDamage, 3);
});

test('V5 critiques — jets manquants restent un aperçu, même quand dégâts normaux connus', () => {
  const preview = strike();
  assert.equal(preview.damage.finalDamage, 3);
  assert.equal(preview.critical.details.needsLocation, true);
  assert.equal(applyResolution(preview, current(preview)).reason, 'localisation-du-critique-requise');
  const noSeverity = strike({ criticalRolls: { location: 57 } });
  assert.equal(applyResolution(noSeverity, current(noSeverity)).reason, 'jets-de-critique-requis');
});

test('V5 critiques — excédent +10 par Blessure, indépendant du double et sans plafond', () => {
  const hit = hp => previewResolution({ actor: hero, target: target(hp), roll: 30, baseRevision: 1,
    v5: { kind: 'ranged' }, action: { type: 'attack', base: 60, damage: 6 }, criticalRolls: { secondEffect: 95 } });
  const over = hit(3);
  assert.equal(over.damage.finalDamage, 6);
  assert.equal(over.critical.details, null, 'aucun double');
  assert.equal(over.critical.excessWounds, 3);
  assert.equal(over.critical.second.bonus, 30);
  assert.equal(over.critical.second.effectRoll, 125);
  assert.equal(over.critical.second.parsed.death, true);
  assert.equal(hit(6).critical, null, 'exactement zéro PV sans excédent');
  assert.equal(hit(0).critical.second.bonus, 60);
  assert.equal(applyResolution(over, current(over)).state.participants.find(p => p.id === 't').hp, 0);
});

test('V5 critiques — double et excédent créent deux critiques, blessures supplémentaires sans récursion', () => {
  const over = strike({ target: target(2), criticalRolls: { location: 57, effect: 65, secondEffect: 30 } });
  assert.equal(over.critical.details.bonus, 0, 'double indépendant de l’excédent');
  assert.equal(over.critical.second.bonus, 10, '3 dégâts normaux moins2PV');
  assert.equal(over.critical.second.location.name, 'Bras Gauche');
  assert.equal(over.critical.details.parsed.extraWounds, 2);
  const onlyExtraCrossesZero = strike({ target: target(4), criticalRolls: { location: 57, effect: 65 } });
  assert.equal(onlyExtraCrossesZero.critical.second, undefined, '3 dégâts normaux seulement, 2 Blessures critiques ne recréent pas de critique');
  assert.equal(applyResolution(onlyExtraCrossesZero, current(onlyExtraCrossesZero)).state.participants.find(p => p.id === 't').hp, 0);
});

test('V5 critiques — décocher un effet ajuste aperçu et application, niveau fusionné durée conservée', () => {
  const all = strike({ criticalRolls: { location: 57, effect: 65 } });
  assert.deepEqual(all.critical.items.map(item => [item.id, item.applied]), [['first-wounds', true], ['first-state-sonne', true]]);
  assert.equal(previewHpLoss(all), 5);
  const partial = strike({ criticalRolls: { location: 57, effect: 65 }, criticalDeclined: ['first-wounds'] });
  assert.equal(previewHpLoss(partial), 3);
  const merge = strike({ target: target(10, { states: ['Sonné|2'] }), criticalRolls: { location: 57, effect: 65 } });
  const next = applyResolution(merge, current(merge)).state.participants.find(p => p.id === 't');
  assert.deepEqual([next.hp, next.states.filter(row => row.key === 'sonne').reduce((sum, row) => sum + row.level, 0), next.states[0].duration], [5, 2, 2]);
});

test('V5 critiques — zéro PV ne crée pas automatiquement À Terre', () => {
  const preview = strike({ target: target(1), criticalRolls: { location: 57, effect: 10, secondEffect: 1 } });
  const next = applyResolution(preview, current(preview)).state.participants.find(p => p.id === 't');
  assert.equal(next.hp, 0);
  assert.ok(!next.states.some(s => s.key === 'a-terre'));
});

test('V5 critiques — compétence double sans localisation de dégâts', () => {
  const skill = previewResolution({ actor: hero, roll: 22, baseRevision: 1, action: { type: 'skill', base: 60 } });
  assert.equal(skill.critical.kind, 'Critique');
  assert.equal(skill.critical.details, null);
  assert.equal(skill.location, null);
  assert.equal(skill.sl, 5);
});

test('V5 critiques — journal montre les deux zones et gravité excédentaire sans modifier vieux reçus', () => {
  const preview = strike({ target: target(0), criticalRolls: { location: 57, effect: 43, secondEffect: 35 } });
  const lines = describeResolutionDetail({ actionType: 'attack', location: preview.location, critical: preview.critical });
  assert.ok(lines.includes('Localisation : 22 → Bras Gauche'));
  assert.ok(lines.includes('Critique : localisation 57 → Corps · gravité 43 → Bleus aux côtes'));
  assert.ok(lines.some(line => line.startsWith('Critique d’excédent : Bras Gauche · gravité 35 + 30 = 65 → ')));
  assert.ok(lines.some(line => line.startsWith('À arbitrer : ')));
  assert.deepEqual(describeResolutionDetail({ actionType: 'attack', critical: { kind: 'Critique', details: { pending: true, locationRoll: null, location: null } } }), ['Type : Attaque', 'Coup critique']);
});

test('E22 critiques — conditionnels de la table : aucun état tiré de « Test… ou » ni de « risque »', () => {
  // Lignes relues à la main : seul l'état inconditionnel est proposé.
  assert.deepEqual(parse('BODY', 20).states, [state('sonne', 'Sonné', 1)], 'pas d’À Terre tiré de « Test Rés. ou vomissement et À Terre »');
  assert.deepEqual(parse('ARM', 80).states, [], '« Test Rés. ou Sonné et À Terre » reste à arbitrer');
  assert.deepEqual(parse('LEG', 30).states, [], '« Test Rés. ou À Terre » reste à arbitrer');
  assert.deepEqual(parse('LEG', 90).states, [state('a-terre', 'À Terre', 1)], '« risque Sonné » reste à arbitrer');
  assert.deepEqual(parse('LEG', 65).states, [state('hemorragique', 'Hémorragique', 2), state('a-terre', 'À Terre', 1)], '« risque Sonné » reste à arbitrer');
  assert.deepEqual(parse('HEAD', 70).states, [state('hemorragique', 'Hémorragique', 2)], '« Test Résistance ou Sonné » reste à arbitrer');
});
});

describe('Critiques F2-I (caractérisation)', () => {
const clone = structuredClone;
const participant = (id, overrides = {}) => ({
  id, name: id, kind: id === 'pj' ? 'PJ' : 'PNJ', camp: id === 'foe' ? 'ennemi' : 'pj',
  zone: 'active', hp: 20, maxHp: 20, caracs: { CC: 60, CT: 60, F: 30, E: 30 },
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], extensions: { v5: {} }, ...overrides
});

function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; }
  };
}

async function fixture(persistence, target) {
  const store = createStore({ storage: null, persistence });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3, reserve: [],
    combat: { round: 1, currentActorId: 'foe', order: ['foe', target.id], participants: [participant('foe'), target] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'critical-characterization' } }
  });
  return store;
}

test('F2-I caractérisation — le registre V5 garde ses tables et son seuil de mort', () => {
  assert.equal(V5_CRITICAL_TABLE_VERSION, 'v5-critical-2026-10-09.1');
  assert.deepEqual(Object.keys(V5_CRIT_DATA).sort(), ['ARM', 'BODY', 'HEAD', 'LEG']);
  assert.equal(getV5CriticalEffect('HEAD', 99).parsed.death, false);
  assert.equal(getV5CriticalEffect('HEAD', 100).parsed.death, true);
  assert.equal(getV5CriticalEffect('HEAD', 101).name, getV5CriticalEffect('HEAD', 100).name);
  assert.equal(getV5CriticalEffect('ARM', 136).parsed.death, true);
  assert.equal(getV5CriticalEffect('BODY', 116).parsed.death, true);
  assert.equal(getV5CriticalEffect('LEG', 126).parsed.death, true);
});

test('F2-I caractérisation — critique V5 appliqué, journalisé, annulable et rechargé sans mort implicite', async () => {
  const persistence = memoryPersistence();
  const target = participant('pj', { states: [{ id: 'preexisting', key: 'hemorragique', name: 'Hémorragique', level: 1 }] });
  const store = await fixture(persistence, target);
  const before = clone(store.listParticipants().find(row => row.id === 'pj'));
  const preview = store.previewResolution({
    resolutionId: 'f2-i-characterization-1', actorId: 'foe', targetId: 'pj',
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5 },
    v5: { kind: 'melee' }, roll: 22,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    criticalRolls: { location: 2, effect: 12 }
  });

  assert.equal(preview.critical.details.effect.name, 'Coup à l’œil');
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', applied.reason);
  const after = store.listParticipants().find(row => row.id === 'pj');
  const records = after.extensions.v5.criticalWounds;
  assert.equal(records.length, 1);
  assert.equal(records[0].resolutionId, preview.resolutionId);
  assert.ok(records[0].stateIds.length > 0, 'les États créés par le critique sont rattachés à son enregistrement');
  assert.ok(!records[0].stateIds.includes('preexisting'), 'un État antérieur reste indépendant');
  assert.equal(after.extensions.v5.dead, undefined, 'les conséquences mortelles ne sont jamais déduites implicitement');

  assert.equal((await store.applyResolution(preview)).status, 'duplicate', 'rejouer le même identifiant ne double pas le critique');
  assert.equal(await store.undo(), true);
  assert.deepEqual(clone(store.listParticipants().find(row => row.id === 'pj')), before);
  assert.equal(await store.redo(), true);
  assert.equal(store.listParticipants().find(row => row.id === 'pj').extensions.v5.criticalWounds.length, 1);

  const reloaded = createStore({ storage: null, persistence });
  await reloaded.ready;
  const restored = reloaded.listParticipants().find(row => row.id === 'pj');
  assert.deepEqual(restored.extensions.v5.criticalWounds, store.listParticipants().find(row => row.id === 'pj').extensions.v5.criticalWounds);
  assert.deepEqual(restored.states, store.listParticipants().find(row => row.id === 'pj').states);
});
});

describe('Critique et blessure (caractérisation)', () => {
const INJURE = { id: 'talent-strike-to-injure', status: 'resolved', rank: 1 };
const subject = (id, talents = []) => ({ id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', hp: 40, maxHp: 40, zone: 'active', caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 }, talents, states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: false } } });
async function setup(talents = []) {
  const persistence = { load: async () => null, saveAtomic: async () => ({ ok: true }) };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'injure-test', turnIndex: 1 } }, combat: { round: 1, currentActorId: 'a', order: ['a', 'b'], participants: [subject('a', talents), subject('b')] }, diceLines: [], log: [] });
  return store;
}
const melee = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 22, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const prep = (talents, raw, settings, extra = {}) => prepareV5TalentCriticalRolls(subject('a', talents), raw, { settings, role: 'attacker', parts: ['first'], ...extra });
const BOTH = { effect: 80, injureEffect: 20 };

test('Frappe blessante : choix true garde le jet de Frappe blessante', () => {
  const r = prep([INJURE], BOTH, { talentChoices: { 'injure:first': true } });
  assert.equal(r.rolls.effect, 20);
  assert.deepEqual(r.unresolved, []);
});

test('Frappe blessante : choix false garde le jet d’origine, même plus élevé', () => {
  const r = prep([INJURE], BOTH, { talentChoices: { 'injure:first': false } });
  assert.equal(r.rolls.effect, 80);
  assert.deepEqual(r.unresolved, []);
});

test('Frappe blessante : ne modifie pas l’objet de jets fourni', () => {
  const raw = { ...BOTH };
  prep([INJURE], raw, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(raw, BOTH);
});

test('Frappe blessante : le critique d’excédent utilise injureSecondEffect', () => {
  const raw = { effect: 50, secondEffect: 90, injureSecondEffect: 10 };
  const r = prepareV5TalentCriticalRolls(subject('a', [INJURE]), raw, { settings: { talentChoices: { 'injure:second': true } }, role: 'attacker', parts: ['second'] });
  assert.equal(r.rolls.secondEffect, 10);
  assert.equal(r.rolls.effect, 50);
  assert.deepEqual(r.unresolved, []);
});

test('Sans le talent : jets inchangés et rien de non résolu', () => {
  const r = prep([], BOTH, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(r.rolls, BOTH);
  assert.deepEqual(r.unresolved, []);
  const none = prep([], BOTH, {});
  assert.deepEqual(none.rolls, BOTH);
  assert.deepEqual(none.unresolved, []);
});

test('Frappe blessante : second jet de gravité manquant signalé', () => {
  const r = prep([INJURE], { effect: 80 }, { talentChoices: { 'injure:first': true } });
  assert.deepEqual(r.unresolved, ['Frappe blessante : saisir les deux gravités.']);
});

test('Frappe blessante : jet d’origine manquant signalé aussi', () => {
  const r = prep([INJURE], { injureEffect: 20 }, { talentChoices: { 'injure:first': false } });
  assert.ok(r.unresolved.includes('Frappe blessante : saisir les deux gravités.'));
});

test('Frappe blessante : choix manquant ou non booléen signalé, jets inchangés', () => {
  for (const settings of [{}, { talentChoices: {} }, { talentChoices: { 'injure:first': 'true' } }]) {
    const r = prep([INJURE], BOTH, settings);
    assert.deepEqual(r.unresolved, ['Frappe blessante : choisir la gravité du critique du jet.']);
    assert.equal(r.rolls.effect, 80);
  }
});

test('Frappe blessante : jets et choix manquants donnent deux messages', () => {
  const r = prep([INJURE], undefined, {});
  assert.equal(r.unresolved.length, 2);
});

test('Frappe blessante avec Inoffensive : deux paires exigées et paire choisie appliquée', () => {
  const settings = { talentChoices: { 'injure:first': true } };
  const missing = prep([INJURE], { effect: 80, effectAlternative: 30, injureEffect: 70 }, settings, { inoffensive: true });
  assert.deepEqual(missing.unresolved, ['Frappe blessante : saisir les deux gravités (deux paires avec Inoffensive).']);
  const full = prep([INJURE], { effect: 80, effectAlternative: 30, injureEffect: 70, injureEffectAlternative: 10 }, settings, { inoffensive: true });
  assert.deepEqual(full.unresolved, []);
  assert.equal(full.rolls.effect, 70);
  assert.equal(full.rolls.effectAlternative, 10);
});

test('Store : l’aperçu d’un critique garde la gravité d’origine si le choix est false', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-false', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': false } } }));
  assert.equal(p.critical.details.effectRollBase, 80);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});

test('Store : l’aperçu d’un critique expose la gravité de Frappe blessante si le choix est true', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-true', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.equal(p.critical.details.effectRollBase, 20);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});

test('Store : choix manquant signalé dans l’aperçu et application manuelle', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-nochoice', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 } }));
  assert.ok(p.unresolved.some(x => x.includes('Frappe blessante : choisir la gravité')));
  assert.equal((await store.applyResolution(p)).status, 'manual');
});

test('Store : second jet de gravité manquant signalé dans l’aperçu', async () => {
  const store = await setup([INJURE]);
  const p = store.previewResolution(melee('inj-missing', { criticalRolls: { location: 2, effect: 80 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.ok(p.unresolved.includes('Frappe blessante : saisir les deux gravités.'));
});

test('Store : sans le talent, aucun message Frappe blessante et le jet d’origine est gardé', async () => {
  const store = await setup([]);
  const p = store.previewResolution(melee('no-talent', { criticalRolls: { location: 2, effect: 80, injureEffect: 20 }, v5: { kind: 'melee', talentChoices: { 'injure:first': true } } }));
  assert.equal(p.critical.details.effectRollBase, 80);
  assert.ok(!p.unresolved.some(x => x.includes('Frappe blessante')));
});
});
