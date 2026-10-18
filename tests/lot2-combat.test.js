import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResolution, previewResolution, replayResolution } from '../js/core/resolution.js';
import { acquiredConditionInstances, conditionLevels, hasMomentum, momentumAfterChange } from '../js/core/v5-combat-rules.js';

const source = id => ({ id, label: id });
const actor = extra => ({ id: 'a', name: 'Attaquant', hp: 10, caracs: { E: 30 }, states: [], ...extra });
const target = extra => ({ id: 't', name: 'Défenseur', hp: 10, caracs: { E: 30 }, armor: { head: 0, body: 0, arms: 0, legs: 0 }, states: [], ...extra });
const input = extra => ({ actor: actor(), target: target(), action: { id: 'sword', type: 'attack', base: 65, damage: 6 }, roll: 43,
  defense: { base: 40, roll: 47, v5: { kind: 'melee' } }, baseRevision: 2, ...extra });
const state = p => ({ revision: p.baseRevision, participants: [p.input.actor, p.input.target], appliedResolutionIds: [] });
const take = (p, id) => applyResolution(p, state(p)).state.participants.find(row => row.id === id);

test('Lot2 combat V5 — conserver61 cause5 Blessures, inverser16 en cause3 selon armure latérale', () => {
  const options = input({ roll: 61, action: { type: 'attack', base: 65, damage: 8 }, actor: actor({ extensions: { v5: { hasMomentum: true } } }),
    target: target({ armorLocations: { head: 0, body: 7, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 } }) });
  const preview = previewResolution(options);
  assert.equal(preview.choiceRequired, true);
  assert.deepEqual(preview.decisions.actor.options.map(row => [row.id, row.summary.roll, row.summary.location, row.summary.woundsLost]),
    [['keep', 61, 'Bras Gauche', 5], ['reverse', 16, 'Corps', 3]]);
  assert.equal(preview.decisions.actor.recommendation.optionId, 'keep');
  assert.equal(applyResolution(preview, state(preview)).reason, 'choix-inversion-requis');
  const kept = previewResolution({ ...options, v5: { choice: 'keep' } });
  const reversed = previewResolution({ ...options, v5: { choice: 'reverse' } });
  assert.equal(take(kept, 't').hp, 5);
  assert.equal(take(reversed, 't').hp, 7);
  assert.equal(kept.resolutionId, reversed.resolutionId, 'deux options de la même action, pas deux applications');
});

test('Lot2 combat V5 — défense recommande moins de Blessures subies avec critère explicite', () => {
  const preview = previewResolution(input({ action: { type: 'attack', base: 65, damage: 4 }, target: target({ hp: 20 }),
    defense: { base: 30, roll: 81, v5: { kind: 'melee', advantageSources: [source('terrain')] } } }));
  assert.deepEqual(preview.decisions.defender.options.map(row => row.summary.woundsLost), [8, 1]);
  assert.deepEqual(preview.decisions.defender.recommendation, { optionId: 'reverse', criterion: 'minimumKnownWoundsLost', label: 'Moins de Blessures subies' });
});

test('Lot2 combat V5 — les deux choix doivent être résolus, aucune recommandation complète sur autre choix inconnu', () => {
  const raw = input({ actor: actor({ extensions: { v5: { hasMomentum: true } } }),
    defense: { base: 30, roll: 81, v5: { kind: 'melee', advantageSources: [source('terrain')] } } });
  const pending = previewResolution(raw);
  assert.equal(pending.choiceRequired, true);
  assert.ok(pending.decisions.actor.options.every(row => row.summary.certainty === 'partial'));
  assert.equal(pending.decisions.actor.recommendation, null);
  assert.equal(pending.decisions.defender.recommendation, null);
  const one = previewResolution({ ...raw, v5: { choice: 'keep' } });
  assert.equal(one.choiceRequired, true);
  assert.equal(applyResolution(one, state(one)).status, 'manual');
  const both = previewResolution({ ...raw, v5: { choice: 'keep' }, defense: { ...raw.defense, v5: { ...raw.defense.v5, choice: 'reverse' } } });
  assert.equal(both.choiceRequired, false);
  assert.equal(applyResolution(both, state(both)).status, 'applied');
});

test('Lot2 combat V5 — comparaison et rejeu sans tirage, avec les mêmes jets et DR', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('tirage implicite interdit'); };
  try {
    const first = previewResolution(input({ v5: { advantageSources: [source('terrain')], choice: 'reverse' } }));
    assert.deepEqual(replayResolution(first.input), first);
    assert.equal(first.roll, 34);
    assert.equal(first.test.initialRoll, 43);
    assert.equal(first.defenderTest.initialRoll, 47);
  } finally { Math.random = random; }
});

test('Lot2 combat V5 — perte effective borne PV à zéro, Élan et double application atomiques', () => {
  const preview = previewResolution(input({ target: target({ hp: 2, extensions: { v5: { hasMomentum: true } } }),
    criticalRolls: { secondEffect: 1 } }));
  const before = state(preview);
  const applied = applyResolution(preview, before);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').hp, 0);
  assert.equal(hasMomentum(applied.state.participants.find(row => row.id === 'a')), true);
  assert.equal(hasMomentum(applied.state.participants.find(row => row.id === 't')), false);
  assert.deepEqual(before, state(preview), 'entrée immuable');
  assert.equal(applyResolution(preview, applied.state).status, 'duplicate');
  assert.equal(applyResolution(preview, { ...before, revision: 3 }).status, 'stale');
  const changedActor = { ...before, participants: [actor({ hp: 9 }), preview.input.target] };
  assert.equal(applyResolution(preview, changedActor).status, 'stale');
});

test('Lot2 combat V5 — réussir double défensif inflige critique même en perdant opposition', () => {
  const preview = previewResolution(input({ roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, criticalRolls: { location: 57, effect: 65 },
    defenderCriticalRolls: { location: 4, effect: 20 } }));
  assert.equal(preview.hit, true);
  assert.ok(preview.critical);
  assert.ok(preview.defenderCritical);
  const applied = applyResolution(preview, state(preview));
  assert.equal(applied.status, 'applied');
  const attacker = applied.state.participants.find(row => row.id === 'a');
  const defender = applied.state.participants.find(row => row.id === 't');
  assert.equal(attacker.hp, 9);
  assert.ok(attacker.states.some(row => row.key === 'sonne'));
  assert.equal(hasMomentum(attacker), false, 'victoire donne Élan, blessures/État critique le retirent dans la même commande');
  assert.equal(defender.hp, 5);
});

test('Lot2 combat V5 — qualités défensives Empaleuse, Dangereuse et Inoffensive respectées', () => {
  const impale = previewResolution(input({ defense: { base: 50, roll: 30, qualities: ['Empaleuse'], v5: { kind: 'melee' } },
    defenderCriticalRolls: { location: 57, effect: 25 } }));
  assert.ok(impale.defenderCritical);
  const danger = previewResolution(input({ defense: { base: 30, roll: 49, qualities: ['Dangereuse'], v5: { kind: 'melee' } } }));
  assert.equal(danger.defenderFumble.expanded, true);
  const harmless = input({ defense: { base: 60, roll: 11, qualities: ['Inoffensive'], v5: { kind: 'melee' } },
    defenderCriticalRolls: { location: 57, effect: 65 } });
  const missing = previewResolution(harmless);
  assert.equal(missing.defenderCritical.details.needsAlternative, true);
  assert.equal(applyResolution(missing, state(missing)).reason, 'deux-jets-gravite-requis:inoffensive');
  const complete = previewResolution({ ...harmless, defenderCriticalRolls: { ...harmless.defenderCriticalRolls, effectAlternative: 25 } });
  assert.equal(complete.defenderCritical.details.effectRoll, 25);
  assert.equal(take(complete, 'a').hp, 9);
});

test('Lot2 combat V5 — défense Ag/Esquive donne test générique, aucun critique de mêlée', () => {
  for (const label of ['Ag', 'Esquive', 'Dodge']) {
    const preview = previewResolution(input({ defense: { label, base: 60, roll: 11 } }));
    assert.equal(preview.defenderTest.kind, 'test');
    assert.equal(preview.defenderCritical, null);
  }
});

test('Lot2 combat V5 — Pointue et Imprécise réservées aux attaques, aucune conversion Précise V4', () => {
  const plain = previewResolution(input());
  const defensivePointue = previewResolution(input({ defense: { base: 40, roll: 47, qualities: ['Pointue', 'Imprécise'] } }));
  assert.equal(defensivePointue.defenderTest.sl, plain.defenderTest.sl);
  const old = previewResolution(input({ action: { type: 'attack', base: 65, damage: 4, qualities: ['Précise'] } }));
  assert.equal(old.score.target, 65);
  assert.equal(old.damage, null);
  assert.equal(old.decisions.actor.options[0].summary.certainty, 'partial');
  assert.equal(applyResolution(old, state(old)).reason, 'version-effet-non-couverte');
});

test('Lot2 combat V5 — Charge donne Élan avant Test mais choix explicite reste nécessaire', () => {
  const preview = previewResolution(input({ v5: { charging: true } }));
  assert.equal(preview.test.advantage.net, 1);
  assert.equal(preview.choiceRequired, true);
  const picked = previewResolution(input({ v5: { charging: true, choice: 'keep' } }));
  assert.equal(hasMomentum(take(picked, 'a')), true);
});

test('Lot2 combat V5 — perte Élan sur blessures réelles ou instance effectivement acquise', () => {
  const before = actor({ extensions: { v5: { hasMomentum: true } }, states: [{ name: 'À Terre', level: 1 }] });
  assert.equal(acquiredConditionInstances(before, [{ key: 'a-terre', level: 1 }]), 0);
  assert.equal(acquiredConditionInstances(before, [{ key: 'sonne', level: 2 }]), 2);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, hp: 9 })), false);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, states: [...before.states, { name: 'Sonné', level: 1 }] })), false);
  assert.equal(hasMomentum(momentumAfterChange(before, { ...before, hp: 12 })), true);
});

test('Lot2 combat V5 — ancien État|durée garde niveau1, conditions différentes prennent pire DR', () => {
  assert.equal(conditionLevels(actor({ states: ['Sonné|3'] })).get('sonne'), 1);
  const preview = previewResolution(input({ actor: actor({ states: [{ name: 'Sonné', level: 2 }, { name: 'Exténué', level: 3 }, { name: 'Empoisonné', level: 1 }] }) }));
  assert.equal(preview.score.statePenalty, 3);
  assert.equal(preview.score.target, 65);
  assert.equal(preview.sl, -1);
});

test('Lot2 combat V5 — cible Surprise sans défense est résoluble, cible Inconsciente touche automatique', () => {
  const surprise = previewResolution(input({ target: target({ states: ['Surpris'] }), defense: undefined }));
  assert.equal(surprise.sl, 4);
  assert.equal(surprise.unresolved.length, 0);
  assert.equal(applyResolution(surprise, state(surprise)).status, 'applied');
  const helpless = previewResolution(input({ target: target({ states: ['Inconscient'] }), defense: undefined, roll: 89, action: { type: 'attack', base: 30, damage: 4 } }));
  assert.equal(helpless.success, false);
  assert.equal(helpless.hit, true);
  assert.equal(helpless.unresolved.length, 0);
  assert.equal(applyResolution(helpless, state(helpless)).status, 'applied');
});

test('Lot2 combat V5 — tir opposé exige confirmation de la règle autorisant défense', () => {
  const blocked = previewResolution(input({ v5: { kind: 'ranged' } }));
  assert.match(blocked.unresolved[0], /autorisant cette défense contre un tir/);
  assert.equal(applyResolution(blocked, state(blocked)).status, 'manual');
  const allowed = previewResolution(input({ v5: { kind: 'ranged', context: { rangedOppositionAllowed: true } } }));
  assert.equal(allowed.unresolved.length, 0);
});

test('Lot2 combat V5 — PV inconnus ne génèrent ni excédent inventé ni recommandation', () => {
  const preview = previewResolution(input({ target: target({ hp: null }), v5: { advantageSources: [source('terrain')] } }));
  assert.equal(preview.critical, null);
  assert.equal(preview.decisions.actor.recommendation, null);
  assert.ok(preview.decisions.actor.options.every(row => row.summary.certainty === 'partial'));
});

test('Lot2 combat V5 — pénalités différentes demandent arbitrage MJ et Désavantages d’États ne se cumulent pas', () => {
  const raw = input({ actor: actor({ states: [{ name: 'Sonné', level: 1 }, { name: 'Aveuglé', level: 2 }, { name: 'À Terre', level: 1 }] }), roll: 61 });
  const undecided = previewResolution(raw);
  assert.match(undecided.unresolved[0], /pénalités différentes/);
  assert.equal(undecided.decisions.actor.recommendation, null);
  assert.equal(applyResolution(undecided, state(undecided)).status, 'manual');
  const sl = previewResolution({ ...raw, v5: { context: { conditionPenaltyMode: 'sl' } } });
  assert.equal(sl.score.statePenalty, 1);
  assert.equal(sl.test.advantage.net, 0);
  const disadvantage = previewResolution({ ...raw, v5: { context: { conditionPenaltyMode: 'disadvantage' } } });
  assert.equal(disadvantage.score.statePenalty, 0);
  assert.equal(disadvantage.test.advantage.net, -2, 'Aveuglé2, ÀTerre ne devient pas un troisième');
});

test('Lot2 combat V5 — Bouclier oppose avec +1DR, ne cumule pas Défensive et nécessite vraie disponibilité', () => {
  const shield = { id: 'shield', baseId: 'fixture-shield', kind: 'shield', custom: true, name: 'Bouclier', ap: 2, locations: [], layer: 'none',
    category: 'Bouclier', damage: '', range: '', keywords: [{ id: 'protectrice', parameter: '2' }], catalogVersion: 'fixture' };
  const raw = input({ v5: { kind: 'melee' }, target: target({ equipment: [shield] }), protectionContext: { shieldId: 'shield', shieldAvailable: true, opposedWithShield: true },
    defense: { base: 40, roll: 47, qualities: ['Défensive'], v5: { kind: 'melee' } } });
  const withShield = previewResolution(raw);
  assert.equal(withShield.defenderTest.sl, 1);
  assert.equal(withShield.protection.shieldAp, 2);
  const withoutShield = previewResolution({ ...raw, target: target({ equipment: [shield], extensions: { shieldUnavailable: ['shield'] } }) });
  assert.equal(withoutShield.defenderTest.sl, 1, 'Défensive reste +1');
  assert.equal(withoutShield.protection.shieldAp, 0);
  const unbalanced = previewResolution({ ...raw, defense: { ...raw.defense, qualities: ['Défensive', 'Déséquilibrée'] } });
  assert.equal(unbalanced.defenderTest.sl, 0, '+1Bouclier−1Déséquilibrée, Défensive écartée');
  const ranged = previewResolution({ ...raw, v5: { kind: 'ranged' }, defense: { base: 40, roll: 47, label: 'Esquive', v5: { kind: 'test' } },
    protectionContext: { ...raw.protectionContext, lineOfSight: true } });
  assert.equal(ranged.unresolved.length, 0, 'Bouclier2 permet Esquive contre tir sans exception inventée');
  assert.equal(ranged.defenderTest.sl, 1);
});

test('Lot2 combat V5 — critique autonome bloqué si qualité d’armure inconnue, verrous de récupération conservés', () => {
  const armor = { id: 'mail', baseId: 'fixture-mail', kind: 'armour', custom: true, name: 'Armure étrange', ap: 2, locations: ['body'], layer: 'flexible',
    category: 'Armure', damage: '', range: '', keywords: [{ id: 'inconnue', parameter: '' }], catalogVersion: 'fixture' };
  const incomplete = previewResolution(input({ roll: 44, action: { type: 'attack', base: 50, damage: 4 },
    target: target({ equipment: [armor] }), defense: { base: 60, roll: 12 }, criticalRolls: { location: 57, effect: 65 } }));
  assert.equal(incomplete.hit, false);
  assert.match(incomplete.unresolved[0], /Protection du critique/);
  assert.equal(applyResolution(incomplete, state(incomplete)).status, 'manual');
  const locked = previewResolution(input({ roll: 22, criticalRolls: { location: 4, effect: 50 } }));
  const blinded = take(locked, 't').states.find(row => row.key === 'aveugle');
  assert.deepEqual(blinded.v5Recovery, { kind: 'medicalAttention' });
  assert.equal(blinded.source.resolutionId, locked.resolutionId);
  assert.equal(blinded.source.authorId, 'a');
  assert.equal(blinded.source.targetId, 't');
});

test('Lot2 combat V5 — critiques accumulés au-delà de BE rendent Inconscient et retirent Sonné atomiquement', () => {
  const preview = previewResolution(input({ roll: 22, target: target({ states: [{ name: 'Sonné', level: 3 }], caracs: { E: 30 } }),
    criticalRolls: { location: 57, effect: 65 } }));
  const defender = take(preview, 't');
  assert.ok(defender.states.some(row => row.key === 'inconscient'));
  assert.ok(!defender.states.some(row => row.key === 'sonne'));
  assert.equal(hasMomentum(defender), false);
});

test('Lot2 combat V5 — Aveuglé distingue tâche strictement visuelle et Test réalisable avec Désavantage', () => {
  const blind = actor({ states: [{ name: 'Aveuglé', level: 2 }] });
  const climb = previewResolution({ actor: blind, action: { type: 'skill', base: 60 }, roll: 52, v5: { context: { reliesOnSight: true } } });
  assert.equal(climb.test.advantage.net, -2);
  const reading = previewResolution({ actor: blind, action: { type: 'skill', base: 60 }, roll: 52, v5: { context: { requiresSight: true } } });
  assert.match(reading.unresolved[0], /exige la vue/);
  assert.equal(applyResolution(reading, { revision: 0, participants: [blind] }).status, 'manual');
});

test('Lot2 combat V5 — le Round explicite protège les échéances critiques et le rejeu', () => {
  const raw = input({ round: 5, roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    target: target({ hp: 30 }), criticalRolls: { location: 2, effect: 9 } });
  const preview = previewResolution(raw);
  const before = { ...state(preview), round: 5 };
  assert.equal(preview.input.round, 5);
  assert.deepEqual(replayResolution(preview.input), preview);
  const receipt = preview.conditionChanges.target;
  assert.equal(receipt.ready, true);
  assert.equal(receipt.participant.states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const applied = applyResolution(preview, before);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 't').states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const defended = previewResolution(input({ round: 5, actor: actor({ hp: 30 }), target: target({ hp: 30 }),
    defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, defenderCriticalRolls: { location: 2, effect: 9 } }));
  assert.equal(defended.conditionChanges.actor.participant.states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  const counter = applyResolution(defended, { ...state(defended), round: 5 });
  assert.equal(counter.status, 'applied');
  assert.equal(counter.state.participants.find(row => row.id === 'a').states.find(row => row.key === 'assourdi').v5Timing.acquiredRound, 5);
  assert.equal(applyResolution(preview, { ...before, round: 6 }).status, 'stale');
  assert.deepEqual(before, { ...state(preview), round: 5 }, 'Un Round changé ne doit rien appliquer');
  for (const round of [null, 0, -1, 1.5, '5', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => previewResolution({ ...raw, round }), { code: 'INVALID_ROUND' });
  }
});

test('Lot2 combat V5 — un critique à échéance inconnue refuse une application complète', () => {
  const preview = previewResolution(input({ round: undefined, roll: 22, action: { type: 'attack', base: 60, damage: 4 },
    target: target({ hp: 30 }), criticalRolls: { location: 2, effect: 9 } }));
  const before = state(preview);
  assert.equal(preview.conditionChanges.target.ready, false);
  assert.ok(preview.conditionChanges.target.needsInput.some(row => row.field === 'currentRound'));
  assert.equal(applyResolution(preview, before).status, 'manual');
  assert.deepEqual(before, state(preview));
});
