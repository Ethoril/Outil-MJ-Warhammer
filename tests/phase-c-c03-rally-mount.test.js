import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireV5Conditions,
  advanceV5Effects,
  recoverV5Condition,
  previewLeadershipRallyAllies,
  leadershipRallySlModifiers,
  previewDeliciousExcruciation
} from '../js/core/v5-effects.js';

const person = (id, extra = {}) => ({
  id,
  name: id,
  camp: 'pj',
  hp: 20,
  maxHp: 20,
  caracs: { E: 30, FM: 40 },
  states: [],
  extensions: { v5: {} },
  ...extra
});
const broken = (level) => ({ key: 'brise', name: 'Brisé', level });
const levelOf = (p, key) => (p.states || []).filter((s) => s.key === key).reduce((n, s) => n + (s.level || 1), 0);
const withBroken = (id, level) => acquireV5Conditions(person(id), [broken(level)]).participant;

test('C03 — ralliement personnel (L06-016) : Calme en fin de Round, 1 + DR après le premier, jamais en milieu de Tour, aucun Exténué (Q06)', () => {
  const actor = withBroken('a', 4);
  const midTurn = recoverV5Condition(actor, 'brise', { method: 'cool', engaged: false, test: { success: true, sl: 2 }, transition: { phase: 'endOfTurn', round: 1 } });
  assert.equal(midTurn.ready, false);
  assert.equal(levelOf(midTurn.participant, 'brise'), 4);
  const engaged = recoverV5Condition(actor, 'brise', { method: 'cool', engaged: true, test: { success: true, sl: 2 }, transition: { phase: 'endOfRound', round: 1 } });
  assert.equal(engaged.ready, false);
  const ok = recoverV5Condition(actor, 'brise', { method: 'cool', engaged: false, test: { success: true, sl: 3 }, transition: { phase: 'endOfRound', round: 1 } });
  assert.equal(levelOf(ok.participant, 'brise'), 1);
  const last = recoverV5Condition(ok.participant, 'brise', { method: 'cool', engaged: false, test: { success: true, sl: 0 }, transition: { phase: 'endOfRound', round: 2 } });
  assert.equal(levelOf(last.participant, 'brise'), 0);
  assert.equal(levelOf(last.participant, 'extenue'), 0);
});

test('C03 — Round entier caché (L06-017) : attestation MJ requise, un seul Brisé retiré', () => {
  const actor = withBroken('a', 3);
  const missing = recoverV5Condition(actor, 'brise', { method: 'hiding', engaged: false });
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some((n) => n.field === 'fullRoundHidden'));
  const ok = recoverV5Condition(actor, 'brise', { method: 'hiding', engaged: false, fullRoundHidden: true });
  assert.equal(levelOf(ok.participant, 'brise'), 2);
});

test('C03 — Commandement : ralliement d’alliés (L06-018), budget 1 + (DR − 1) réparti, meneur non Brisé', () => {
  const leader = person('chef');
  const a1 = withBroken('a1', 3);
  const a2 = withBroken('a2', 1);
  const base = { leader, allies: [a1, a2], round: 1 };
  const r = previewLeadershipRallyAllies({ ...base, test: { success: true, sl: 3 }, distribution: { a1: 2, a2: 1 } });
  assert.equal(r.ready, true);
  assert.equal(r.budget, 3);
  assert.equal(levelOf(r.participants.find((p) => p.id === 'a1'), 'brise'), 1);
  assert.equal(levelOf(r.participants.find((p) => p.id === 'a2'), 'brise'), 0);
  // DR 0 = budget 1 ; trop demander est refusé
  const over = previewLeadershipRallyAllies({ ...base, test: { success: true, sl: 0 }, distribution: { a1: 2 } });
  assert.equal(over.ready, false);
  assert.equal(over.budget, 1);
  // répartition obligatoire
  const nodist = previewLeadershipRallyAllies({ ...base, test: { success: true, sl: 2 } });
  assert.equal(nodist.ready, false);
  assert.ok(nodist.needsInput.some((n) => n.field === 'distribution'));
  // échec : rien
  const fail = previewLeadershipRallyAllies({ ...base, test: { success: false, sl: -1 }, distribution: {} });
  assert.equal(fail.ready, true);
  assert.equal(fail.budget, 0);
  assert.equal(levelOf(fail.participants.find((p) => p.id === 'a1'), 'brise'), 3);
  // meneur Brisé : refusé
  const bl = previewLeadershipRallyAllies({ ...base, leader: withBroken('chef', 1), test: { success: true, sl: 3 }, distribution: { a1: 1 } });
  assert.equal(bl.ready, false);
  assert.match(bl.error, /Brisé/);
});

test('C03 — Master and Commander (L25-003) : +1 DR par rang à bord, fait MJ requis', () => {
  assert.deepEqual(leadershipRallySlModifiers({ masterAndCommanderRank: 0 }).modifiers, []);
  const unknown = leadershipRallySlModifiers({ masterAndCommanderRank: 2 });
  assert.ok(unknown.needsInput.some((n) => n.field === 'onBoardVessel'));
  const no = leadershipRallySlModifiers({ masterAndCommanderRank: 2, onBoardVessel: false });
  assert.deepEqual(no.modifiers, []);
  const yes = leadershipRallySlModifiers({ masterAndCommanderRank: 2, onBoardVessel: true });
  assert.equal(yes.modifiers[0].amount, 2);
  assert.equal(yes.needsInput.length, 0);
});

test('C03 — monture Brisée (L13-005, Q16) : Équitation en fin de Round, hors engagement, cavalier en selle et non Brisé', () => {
  const mount = withBroken('cheval', 3);
  const rider = person('cav');
  const opts = { method: 'ride', engaged: false, riderMounted: true, rider, test: { success: true, sl: 2 }, transition: { phase: 'endOfRound', round: 1 } };
  const ok = recoverV5Condition(mount, 'brise', opts);
  assert.equal(levelOf(ok.participant, 'brise'), 1);
  assert.equal(levelOf(ok.participant, 'extenue'), 0);
  const mid = recoverV5Condition(mount, 'brise', { ...opts, transition: { phase: 'endOfTurn', round: 1 } });
  assert.equal(levelOf(mid.participant, 'brise'), 3);
  assert.ok(mid.needsInput.some((n) => n.field === 'recoveryMoment'));
  const engaged = recoverV5Condition(mount, 'brise', { ...opts, engaged: true });
  assert.equal(levelOf(engaged.participant, 'brise'), 3);
  const afoot = recoverV5Condition(mount, 'brise', { ...opts, riderMounted: false });
  assert.equal(levelOf(afoot.participant, 'brise'), 3);
  const brokenRider = recoverV5Condition(mount, 'brise', { ...opts, rider: withBroken('cav', 1) });
  assert.equal(levelOf(brokenRider.participant, 'brise'), 3);
  const outOfCombat = recoverV5Condition(mount, 'brise', { ...opts, transition: undefined, outOfCombat: true });
  assert.equal(levelOf(outOfCombat.participant, 'brise'), 1);
});

test('C03 — Delicious Excruciation (L18-002) : purge de Brisé et immunité pendant BFM Rounds', () => {
  const target = withBroken('t', 4);
  const r = previewDeliciousExcruciation({ caster: person('c'), target, bfm: 2, round: 3 });
  assert.equal(r.ready, true);
  assert.equal(levelOf(r.participant, 'brise'), 0);
  assert.ok(r.participant.states.some((s) => s.key === 'brise-immunity'));
  const again = acquireV5Conditions(r.participant, [broken(2)], { round: 3 });
  assert.equal(levelOf(again.participant, 'brise'), 0);
  const later = advanceV5Effects(r.participant, { phase: 'endOfRound', round: 5 }).participant;
  assert.ok(!later.states.some((s) => s.key === 'brise-immunity'));
  const reacquired = acquireV5Conditions(later, [broken(1)], { round: 6 });
  assert.equal(levelOf(reacquired.participant, 'brise'), 1);
  assert.equal(previewDeliciousExcruciation({ caster: person('c'), target, round: 3 }).ready, false);
});

test('C03 — Curse of the Harsh Mistress (L25-005) : Calme (−1 DR) avant de retirer Exténué au repos', () => {
  const tired = acquireV5Conditions(person('t', { states: [{ key: 'harsh-mistress-curse', name: 'Malédiction', kind: 'talent-pending', level: 1 }] }), [{ name: 'Exténué', level: 1 }]).participant;
  const none = recoverV5Condition(tired, 'extenue', { method: 'rest', restSatisfied: true });
  assert.equal(levelOf(none.participant, 'extenue'), 1);
  assert.ok(none.needsInput.some((n) => n.field === 'harshMistressCalmTest'));
  const failed = recoverV5Condition(tired, 'extenue', { method: 'rest', restSatisfied: true, harshMistressCalmTest: { success: false, sl: -1 } });
  assert.equal(levelOf(failed.participant, 'extenue'), 1);
  const ok = recoverV5Condition(tired, 'extenue', { method: 'rest', restSatisfied: true, harshMistressCalmTest: { success: true, sl: 0 } });
  assert.equal(levelOf(ok.participant, 'extenue'), 0);
  // sans la malédiction : comportement inchangé
  const plain = acquireV5Conditions(person('p'), [{ name: 'Exténué', level: 1 }]).participant;
  assert.equal(levelOf(recoverV5Condition(plain, 'extenue', { method: 'rest', restSatisfied: true }).participant, 'extenue'), 0);
});
