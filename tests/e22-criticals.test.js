import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCriticalEffect } from '../js/core/criticals.js';
import { V5_CRIT_DATA, getV5CriticalEffect } from '../js/data/v5-crits.js';
import { CRIT_DATA } from '../js/data/crits.js';
import {
  applyResolution, describeResolutionDetail, previewHpLoss, previewResolution
} from '../js/core/resolution.js';

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
