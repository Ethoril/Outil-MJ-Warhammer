import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCriticalEffect } from '../js/core/criticals.js';
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
const hero = { id: 'a', name: 'Héros', states: [] };
// 22 : double, réussite, DR 4 ; jet inversé 22 (Bras Gauche, armure 2).
const strike = (over = {}) => previewResolution({
  actor: hero, target: target(10), action: { type: 'attack', base: 60, damage: 4 }, roll: 22, baseRevision: 1, ...over
});

test('E22 critiques — localisation du critique ≠ inversée, armure de la nouvelle zone', () => {
  const plain = strike();
  assert.equal(plain.critical.kind, 'Critique');
  assert.equal(plain.location, null);
  const preview = strike({ criticalRolls: { location: 57 } });
  assert.equal(preview.location.name, 'Corps');
  assert.equal(preview.location.roll, 57);
  assert.equal(preview.damage.finalDamage, 4, '4 + 4 DR − (BE3 + PA corps 1)');
  assert.equal(preview.critical.details.needsLocation, false);
  assert.equal(preview.critical.details.effect, null);
  assert.equal(preview.critical.details.pending, true);
  // Armure des bras (2) si la localisation tombe sur un bras : 1 dégât de moins.
  assert.equal(strike({ criticalRolls: { location: 30 } }).damage.finalDamage, 3);
});

test('E22 critiques — sans localisation : pas de dégâts, application refusée', () => {
  const preview = strike();
  assert.equal(preview.damage, null);
  assert.equal(preview.critical.details.needsLocation, true);
  const refused = applyResolution(preview, { revision: 1, participants: [target(10)] });
  assert.equal(refused.status, 'manual');
  assert.equal(refused.reason, 'localisation-du-critique-requise');
});

test('E22 critiques — gravité, Acharnement +10 et plafond 100', () => {
  const normal = strike({ criticalRolls: { location: 57, effect: 43 } });
  assert.equal(normal.critical.details.bonus, 0);
  assert.equal(normal.critical.details.effectRoll, 43);
  assert.equal(normal.critical.details.effect.name, 'Clavicule tordue');
  const fury = strike({ target: target(0), criticalRolls: { location: 57, effect: 43, secondEffect: 95 } });
  assert.equal(fury.critical.acharnement, true);
  assert.equal(fury.critical.details.effectRoll, 53);
  assert.equal(fury.critical.details.effect.name, 'Côtes fracturées');
  assert.equal(fury.critical.second.effectRollBase, 95);
  assert.equal(fury.critical.second.bonus, 10);
  assert.equal(fury.critical.second.effectRoll, 100, 'plafonné à 100');
  assert.equal(fury.critical.second.effect.name, 'Démembrement');
  assert.equal(fury.critical.second.parsed.death, true);
});

test('E22 critiques — second critique selon les PV avant le coup', () => {
  // Empaleuse, jet 30 (DR 3) : jet inversé 03 → Tête ; dégâts 6 + 3 − (3 + PA corps 1) = 5.
  const hit = hp => previewResolution({
    actor: hero, target: target(hp), roll: 30, baseRevision: 1,
    action: { type: 'attack', base: 60, damage: 6, qualities: ['Empaleuse'] },
    criticalRolls: { location: 57, effect: 43, secondEffect: 35 }
  });
  const under = hit(3);
  assert.equal(under.damage.finalDamage, 5);
  assert.equal(under.critical.second.location.name, 'Tête');
  assert.equal(under.critical.second.locationRoll, 3);
  assert.equal(under.critical.second.effect.name, 'Coup percutant');
  assert.equal(hit(5).critical.second, undefined, '5 PV → 0 : pas sous zéro');
  assert.equal(hit(-1).critical.second, undefined, 'déjà sous zéro avant le coup');
  assert.ok(hit(0).critical.second, 'à 0 PV avant : Acharnement et sous zéro');
  assert.equal(hit(0).critical.second.bonus, 10);
  // Dégâts non calculables : rappel seulement.
  const manual = previewResolution({
    actor: hero, target: target(3), roll: 30, baseRevision: 1,
    action: { type: 'attack', base: 60, damage: 'BF+2', qualities: ['Empaleuse'] }, criticalRolls: { location: 57 }
  });
  assert.equal(manual.damage, null);
  assert.equal(manual.critical.second, undefined);
  assert.equal(manual.critical.secondHint.locationRoll, 3);
  assert.equal(manual.critical.secondHint.location.name, 'Tête');
  // Cible déjà sous zéro : elle ne peut plus y passer, pas de rappel non plus.
  const already = previewResolution({
    actor: hero, target: target(-1), roll: 30, baseRevision: 1,
    action: { type: 'attack', base: 60, damage: 'BF+2', qualities: ['Empaleuse'] }, criticalRolls: { location: 57 }
  });
  assert.equal(already.critical.secondHint, undefined);
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

test('E22 critiques — un coup non critique ou une compétence n’ont ni localisation ni table', () => {
  const plain = previewResolution({ actor: hero, target: target(3), roll: 40, baseRevision: 1, action: { type: 'attack', base: 60, damage: 9 } });
  assert.equal(plain.critical, null);
  assert.equal(plain.location.roll, 4);
  const skill = previewResolution({ actor: hero, roll: 22, baseRevision: 1, action: { type: 'skill', base: 60 }, criticalRolls: { location: 57 } });
  assert.equal(skill.critical.kind, 'Critique');
  assert.equal(skill.critical.details, null);
  assert.equal(skill.location.roll, 22, 'localisation inversée inchangée hors attaque');
  assert.deepEqual(describeResolutionDetail({ actionType: 'skill', critical: skill.critical }).slice(-1), ['Réussite critique']);
});

test('E22 critiques — effets décochés exclus de la perte de PV et de l’application', () => {
  // BODY 55 = « +3 Blessures, 1 Sonné, Fracture (Mineure) ».
  const all = strike({ criticalRolls: { location: 57, effect: 55 } });
  assert.deepEqual(all.critical.items.map(item => [item.id, item.applied]), [['first-wounds', true], ['first-state-sonne', true]]);
  assert.equal(all.critical.items[0].label, '+3 Blessures');
  assert.equal(all.critical.items[1].label, 'Sonné 1');
  assert.equal(previewHpLoss(all), 7);
  const partial = strike({ criticalRolls: { location: 57, effect: 55 }, criticalDeclined: ['first-wounds'] });
  assert.equal(previewHpLoss(partial), 4);
  assert.equal(partial.critical.items[0].applied, false);
  assert.deepEqual(partial.critical.application, { extraWounds: 0, states: [state('sonne', 'Sonné', 1)] });
});

test('E22 critiques — application : PV, fusion des niveaux, À Terre unique', () => {
  const preview = strike({
    target: target(10, { states: ['Sonné|2', { name: 'Hémorragique', key: 'hemorragique', level: 1, duration: 3 }] }),
    criticalRolls: { location: 57, effect: 55 }
  });
  const applied = applyResolution(preview, { revision: 1, participants: [preview.input.target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  const next = applied.state.participants[0];
  assert.equal(next.hp, 10 - 4 - 3);
  const sonne = next.states.find(item => item.key === 'sonne');
  assert.equal(sonne.level, 2);
  assert.equal(sonne.duration, 2, 'durée existante conservée');
  // BODY 70 = « +3 Blessures, 4 Hémorragie (risque réouverture) » : niveau 1 + 4, durée 3 conservée.
  const merged = strike({
    target: target(10, { states: [{ name: 'Hémorragique', key: 'hemorragique', level: 1, duration: 3 }] }),
    criticalRolls: { location: 57, effect: 70 }
  });
  const hemo = applyResolution(merged, { revision: 1, participants: [merged.input.target] }).state.participants[0]
    .states.find(item => item.key === 'hemorragique');
  assert.deepEqual([hemo.level, hemo.duration], [5, 3]);
  const fresh = strike({ criticalRolls: { location: 57, effect: 70 } });
  const created = applyResolution(fresh, { revision: 1, participants: [fresh.input.target] }).state.participants[0]
    .states.find(item => item.key === 'hemorragique');
  assert.equal(created.level, 4);
  assert.deepEqual(created.source, { kind: 'critical', resolutionId: fresh.resolutionId });
  // À Terre déjà présent + PV ≤ 0 : une seule occurrence.
  const kill = strike({ target: target(2, { states: [{ name: 'À Terre', key: 'a-terre', level: 1 }] }), criticalRolls: { location: 57, effect: 55 } });
  const killed = applyResolution(kill, { revision: 1, participants: [kill.input.target] }).state.participants[0];
  assert.equal(killed.hp, 2 - 4 - 3);
  assert.equal(killed.states.filter(item => item.key === 'a-terre').length, 1);
  // Gravité non tirée : l'application reste possible.
  const noSeverity = strike({ criticalRolls: { location: 57 } });
  assert.equal(applyResolution(noSeverity, { revision: 1, participants: [noSeverity.input.target] }).status, 'applied');
});

test('E22 critiques — journal lisible, anciennes entrées inchangées', () => {
  const preview = strike({ target: target(0), criticalRolls: { location: 57, effect: 43, secondEffect: 35 } });
  const lines = describeResolutionDetail({ actionType: 'attack', location: { roll: 57, name: 'Corps' }, critical: preview.critical });
  assert.ok(lines.includes('Critique : localisation 57 → Corps · gravité 43 + 10 = 53 → Côtes fracturées'), lines.join('|'));
  assert.ok(lines.some(line => line.startsWith('Second critique (PV sous zéro) : Bras Gauche · gravité 35 + 10 = 45 → ')), lines.join('|'));
  assert.ok(lines.includes('Effets appliqués : +5 Blessures, Sonné 1'), lines.join('|'));
  assert.ok(lines.some(line => line.startsWith('À arbitrer : ')));
  assert.ok(!lines.some(line => line.startsWith('Localisation :')), 'pas de doublon avec la localisation du critique');
  const legacy = describeResolutionDetail({ actionType: 'attack', critical: { kind: 'Critique', details: { pending: true, locationRoll: null, location: null } } });
  assert.deepEqual(legacy, ['Type : Attaque', 'Coup critique']);
  assert.deepEqual(describeResolutionDetail({ critical: { kind: 'Critique' } }), ['Coup critique']);
});
