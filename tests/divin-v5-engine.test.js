import test from 'node:test';
import assert from 'node:assert/strict';
import DIVINE_REGISTRY from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { previewDivineExecution, applyDivineExecution, expireDivineEffects } from '../js/core/v5-divine-engine.js';
import { acquireV5Conditions } from '../js/core/v5-effects.js';
import { previewV5Turn } from '../js/core/v5-turn.js';
import { ficheSnapshot } from '../js/core/fiche-sync.js';

const baseContract = DIVINE_REGISTRY.contracts.find(row => row.id === 'divine:blessing:myrmidia:battle');
const fingerprint = DIVINE_REGISTRY.sourceFingerprint;
const actor = {
  id: 'priest-1', name: 'Priest', skills: [{ id: 'skill-pray', name: 'Prière', carac: 'Soc', status: 'resolved', total: 50 }],
  talents: [{ id: baseContract.requiredTalent.catalogueTalentId, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  extensions: { v5: { divine: { sin: 0 } } }
};

test('prayer preview requires an explicit d100 and leaves state untouched', () => {
  const before = structuredClone(actor);
  const result = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, sourceFingerprint: fingerprint,
    facts: { targets: { [actor.id]: { withinRange: true } } } });
  assert.equal(result.ready, false);
  assert.ok(result.needsInput.some(item => item.field === 'roll'));
  assert.deepEqual(actor, before);
});

test('a resolved prayer records fumble as Wrath trigger without inventing Wrath outcome', () => {
  const result = previewDivineExecution(actor, baseContract, [actor], {
    canSpeak: true, roll: 99, sourceFingerprint: fingerprint, facts: { targets: { [actor.id]: { withinRange: true } } }
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.ok(result.preview);
  assert.equal(result.preview.prayer.success, false);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.outcome, null);
  assert.ok(result.preview.reminders.some(item => /Courroux|Wrath/i.test(item)));
});

test('Sin threshold can trigger Wrath on a successful prayer without changing Sin before the Wrath resolves', () => {
  const sinner = { ...actor, extensions: { v5: { divine: { sin: 4 } } } };
  const result = previewDivineExecution(sinner, baseContract, [sinner], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, facts: { targets: { [sinner.id]: { withinRange: true } } }
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'needs-wrath-resolution');
  assert.equal(result.preview.prayer.success, true);
  assert.equal(result.preview.wrath.triggered, true);
  assert.equal(result.preview.wrath.sinAtTest, 4);
  assert.equal(result.preview.wrath.sinAfter, 4);
});

test('apply records a resolved prayer once per execution id and rejects reuse', () => {
  const input = { canSpeak: true, roll: 99, wrathRoll: 25, wrathConsequences: 'Résultat de Courroux traité par le MJ.',
    sourceFingerprint: fingerprint, actorId: actor.id, targetIds: [actor.id],
    facts: { targets: { [actor.id]: { withinRange: true } } }, executionId: 'pray-1' };
  const state = { combat: { participants: [actor] }, extensions: { v5: { divineExecutions: [] } } };
  const first = applyDivineExecution(state, baseContract, input);
  assert.equal(first.ready, true, JSON.stringify(first));
  assert.equal(first.receipt.executionId, 'pray-1');
  const repeated = applyDivineExecution(first.state, baseContract, input);
  assert.equal(repeated.ready, false);
  assert.equal(repeated.status, 'duplicate');
  assert.equal(repeated.state.extensions.v5.divineExecutions.length, 1);
});

test('a forged V4 source cannot pass even when its supplied fingerprint matches', () => {
  const forged = structuredClone(baseContract);
  forged.source.document = 'Livre FR V4.pdf';
  const result = previewDivineExecution(actor, forged, [actor], {
    canSpeak: true, roll: 22, sourceFingerprint: fingerprint
  });
  assert.equal(result.ready, false);
  assert.equal(result.status, 'blocked');
});

test('sourced duration extensions change both the layer and its required absolute deadline', () => {
  const target = { ...actor, caracs: { Soc: 50 } };
  const expiry = { phase: 'endOfRound', round: 12 };
  const input = { canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    choices: { duration: 1 }, expiry, actorId: actor.id, targetIds: [target.id], executionId: 'extended-duration',
    facts: { targets: { [target.id]: { withinRange: true } } } };
  const state = { combat: { participants: [target] } };
  const result = applyDivineExecution(state, baseContract, input);
  assert.equal(result.ready, true, result.error);
  assert.equal(result.state.combat.participants[0].extensions.v5.divineEffects[0].duration.value, 12);
  const shortDeadline = previewDivineExecution(target, baseContract, [target], { ...input, expiry: { ...expiry, round: 6 } });
  assert.equal(shortDeadline.ready, false);
  assert.match(shortDeadline.error, /durée sourcée/i);
});

test('a multi-level Blinded condition recovers one level at each target turn', () => {
  const target = { id: 'target', hp: 5, maxHp: 10, states: [], caracs: { E: 40 }, extensions: { v5: {} } };
  const acquired = acquireV5Conditions(target, [{ name: 'Blinded', level: 2 }], { round: 1 });
  assert.equal(acquired.ready, true);
  let state = { combat: { round: 1, currentActorId: 'priest', order: ['priest', target.id], orderMode: 'manual', participants: [
    { id: 'priest', name: 'Priest', zone: 'active', hp: 5, maxHp: 10, states: [], caracs: { E: 40 }, extensions: { v5: {} } },
    { ...acquired.participant, name: 'Target', zone: 'active' }
  ] }, extensions: { v5: { turnIndex: 1 } } };
  const levels = () => state.combat.participants.find(row => row.id === target.id).states
    .filter(row => row.key === 'aveugle').reduce((sum, row) => sum + row.level, 0);
  let turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // enters target turn; no recovery yet
  assert.equal(levels(), 2);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // target's turn ends: one level recovers
  assert.equal(levels(), 1);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // other character's turn does not recover it
  assert.equal(levels(), 1);
  turn = previewV5Turn(state); assert.equal(turn.ready, true); state = turn.state; // target's next turn ends: remaining level recovers
  assert.equal(levels(), 0);
});

test('two synthetic layers sharing a condition state expire without orphaning it', () => {
  const stateId = 'condition:shared-synthetic';
  const participant = { id: 'target-1', states: [{ id: stateId, name: 'État temporaire' }],
    extensions: { v5: { divineEffects: [
      { id: 'layer-first', conditionStateIds: [stateId], expiry: { phase: 'endOfRound', round: 1 } },
      { id: 'layer-second', conditionStateIds: [stateId], expiry: { phase: 'endOfRound', round: 2 } }
    ] } } };
  const first = expireDivineEffects(participant, { phase: 'endOfRound', round: 1 });
  assert.deepEqual(first.removed, ['layer-first']);
  assert.deepEqual(first.participant.extensions.v5.divineEffects.map(layer => layer.id), ['layer-second']);
  assert.equal(first.participant.states.some(state => state.id === stateId), true, 'l’état reste référencé par la seconde couche');

  const second = expireDivineEffects(first.participant, { phase: 'endOfRound', round: 2 });
  assert.deepEqual(second.removed, ['layer-second']);
  assert.deepEqual(second.participant.extensions.v5.divineEffects, []);
  assert.equal(second.participant.states.some(state => state.id === stateId), false, 'l’état disparaît avec sa dernière référence');
});

test('missing, empty, boolean, infinite, composite or non-integer skill totals cannot supply the Pray test score', () => {
  for (const total of [null, '', false, Infinity, 0.5, -1, [], {}]) {
    const invalid = { ...actor, skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', total }] };
    const result = previewDivineExecution(invalid, baseContract, [invalid], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
    assert.equal(result.ready, false);
    assert.match(result.error, /Compétence Prière/i);
  }

  const numericString = { ...actor, skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', total: '50' }] };
  const accepted = previewDivineExecution(numericString, baseContract, [numericString], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [numericString.id]: { withinRange: true } } } });
  assert.equal(accepted.ready, true, accepted.error);
  assert.equal(accepted.preview.skillScore, 50);
});

test('null, boolean, infinite and composite extension choices are rejected instead of coerced', () => {
  for (const choices of [null, '', false, Infinity, [], {}]) {
    if (choices && typeof choices === 'object' && !Array.isArray(choices)) continue;
    const malformed = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, roll: 23,
      sourceFingerprint: fingerprint, choices, facts: { targets: { [actor.id]: { withinRange: true } } } });
    assert.equal(malformed.ready, false);
    assert.match(malformed.error, /choix d’extension/i);
  }
  for (const range of [null, '', false, Infinity, [], {}]) {
    const result = previewDivineExecution(actor, baseContract, [actor], { canSpeak: true, roll: 23,
      sourceFingerprint: fingerprint, choices: { range }, facts: { targets: { [actor.id]: { withinRange: true } } } });
    assert.equal(result.ready, false, `range=${String(range)} ne doit pas devenir un choix implicite`);
    assert.match(result.error, /choix d’extension|nombres entiers/i);
  }
});

test('contradictory duplicate Pray rows and invalid characteristic values stop the preview', () => {
  const duplicate = { ...actor, skills: [
    { id: 'skill-pray', name: 'Prière', status: 'resolved', total: 50 },
    { id: 'skill-pray', name: 'Pray', status: 'resolved', total: 51 }
  ] };
  const duplicateResult = previewDivineExecution(duplicate, baseContract, [duplicate], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
  assert.equal(duplicateResult.ready, false);
  assert.match(duplicateResult.error, /Compétence Prière/i);

  const shield = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  for (const Soc of [null, '', false, Infinity, 40.5, -1, 101, [], {}]) {
    const invalid = { ...actor, caracs: { Soc }, skills: [{ name: 'Pray', status: 'resolved', total: 50 }],
      talents: [{ id: shield.requiredTalent.catalogueTalentId, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
      prayers: [{ nom: shield.catalogueName }] };
    const result = previewDivineExecution(invalid, shield, [invalid], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint });
    assert.equal(result.ready, false, `Soc=${String(Soc)} ne doit pas devenir une valeur numérique implicite`);
    assert.match(result.error, /Compétence Prière|valeur de base range/i);
  }
  const ambiguousCaracs = { ...actor, caracs: { Soc: 80, soc: 90 },
    extensions: { v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } } };
  const ambiguous = previewDivineExecution(ambiguousCaracs, baseContract, [ambiguousCaracs], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { [ambiguousCaracs.id]: { withinRange: true } } }
  });
  assert.equal(ambiguous.ready, false, 'des clés de même carac avec valeurs divergentes doivent bloquer');
  assert.match(ambiguous.error, /Compétence Prière/i);
});

test('E4 — un État de Prière résolu contribue au Test; les modificateurs de fiche restent explicites', () => {
  const stunned = { ...actor, states: [{ key: 'sonne', level: 1 }] };
  const resolved = previewDivineExecution(stunned, baseContract, [stunned], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint,
    round: 1, expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { [stunned.id]: { withinRange: true } } } });
  assert.equal(resolved.ready, true, resolved.error);
  assert.deepEqual(resolved.preview.conditionTestContext.slModifiers.map(row => row.amount), [-1]);
  assert.equal(resolved.preview.prayer.sl, resolved.preview.prayer.details.baseSl - 1);

  const modified = { ...actor, extensions: { v5: { divine: { sin: 0 }, testModifiers: { Prière: -1 } } } };
  const withModifier = previewDivineExecution(modified, baseContract, [modified], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [modified.id]: { withinRange: true } } } });
  assert.equal(withModifier.ready, true, withModifier.error);
  assert.equal(withModifier.preview.slModifiers[0].amount, -1);
  assert.equal(withModifier.preview.prayer.sl, withModifier.preview.prayer.details.baseSl - 1);
});

test('self/self miracles still enforce canonical targets and their sourced duration', () => {
  const spear = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Spear of Myrmidia');
  const priest = { ...actor, caracs: { Soc: 50 }, skills: [{ name: 'Pray', status: 'resolved', total: 50 }],
    talents: [{ id: spear.requiredTalent.id, status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    prayers: [{ nom: spear.catalogueName }] };
  const foe = { id: 'foe-1', name: 'Opponent' };
  const wrongTarget = previewDivineExecution(priest, spear, [foe], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 5 } });
  assert.equal(wrongTarget.ready, false);
  assert.match(wrongTarget.error, /se cible elle-même/i);

  const self = previewDivineExecution(priest, spear, [priest], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 5 }, facts: { weapon: { equipmentId: 'spear' } } });
  assert.equal(self.ready, true, self.error);
  assert.equal(self.status, 'ready');
  assert.equal(self.preview.resolvedParams.targets.unit, 'self');
});

test('raw prayer rows from fiche-sync establish a catalog-pinned learned miracle', () => {
  const shield = DIVINE_REGISTRY.contracts.find(row => row.canonicalName === 'Shield of Myrmidia');
  const snapshot = ficheSnapshot('priest-1', { nom: 'Priest', race: 'humain', carac: { soc: { base: 80 } },
    skillsAdvanced: [{ nom: 'Prière', adv: 0 }],
    talentsAcq: [{ nom: 'Invocation (Myrmidia)' }], prieres: [{ nom: shield.catalogueName }] });
  const priest = { ...snapshot, id: actor.id, zone: 'active', extensions: { v5: { divine: { sin: 0 } } } };
  const result = previewDivineExecution(priest, shield, [priest], { canSpeak: true, roll: 23,
    sourceFingerprint: fingerprint, round: 1, expiry: { phase: 'endOfRound', round: 8 },
    facts: { targets: { [priest.id]: { withinRange: true, ally: true } } } });
  assert.equal(result.ready, true, result.error);
  assert.equal(result.preview.resolvedParams.duration.value, 8);

  const importedWithModifier = { ...priest, caracs: { ...priest.caracs, Soc: 90 },
    talents: actor.talents, extensions: { v5: { divine: { sin: 0 }, baseCaracs: { Soc: 80 } } } };
  const baseBefore = importedWithModifier.extensions.v5.baseCaracs.Soc;
  const blessing = previewDivineExecution(importedWithModifier, baseContract, [importedWithModifier], {
    canSpeak: true, roll: 23, sourceFingerprint: fingerprint, round: 1,
    expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { [importedWithModifier.id]: { withinRange: true } } }
  });
  assert.equal(blessing.ready, true, blessing.error);
  assert.equal(blessing.preview.skillScore, 90, 'le carac soc importé doit trouver Soc courant et son +10 temporaire');
  assert.equal(importedWithModifier.extensions.v5.baseCaracs.Soc, baseBefore, 'le calcul ne modifie pas le socle');
  assert.equal(snapshot.caracs.Soc, 80, 'la fiche source reste inchangée');
});
