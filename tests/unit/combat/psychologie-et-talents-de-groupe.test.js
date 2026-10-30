import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getReferenceCatalogue, resolveTalent } from '../../../js/core/reference-catalog.js';
import { withMomentum, buildCombatTest } from '../../../js/core/v5-combat-rules.js';
import { previewGenericFearEncounter, previewGenericTerrorEncounter, resolveGenericTerrorTest, resolveGenericFearTest, isPsychologyImmune, psychologyTestRules, combatIntimidationModifiers, groupIntimidationDefenceSl, previewCombatIntimidation, previewGhostlyHowl, previewSkittishReaction, isAnimosityOverridden, effectiveSizeAgainstFear, untrainedMountDisadvantage, PSYCHOLOGY_SOURCES, PSYCHOLOGY_SOURCE_IDS, previewPsychologySource } from '../../../js/core/v5-talent-psychology.js';
import { acquireV5Conditions, advanceV5Effects, recoverV5Condition, previewLeadershipRallyAllies, leadershipRallySlModifiers, MASTER_AND_COMMANDER_TALENT, previewDeliciousExcruciation } from '../../../js/core/v5-effects.js';
import { readFileSync } from 'node:fs';
import { v5TalentCoverage } from '../../../js/core/v5-talent-coverage.js';
import { applicableV5TalentTestFields } from '../../../js/core/v5-talent-tests.js';

describe('Peur et terreur', () => {
const owned = (id, rank = 1, specialization) => ({
  id: 'talent-' + id,
  status: 'resolved',
  rank,
  ...(specialization ? { specialization } : {})
});
const skill = (name) => getReferenceCatalogue().skills.find((s) => s.nom === name).id;

const subject = (id, talents = [], extra = {}) => ({
  id,
  name: id,
  kind: 'PJ',
  camp: id === 'a' ? 'pj' : 'ennemi',
  hp: 40,
  maxHp: 40,
  zone: 'active',
  caracs: { CC: 60, CT: 60, F: 40, E: 30, Ag: 40, FM: 40, Soc: 60, Int: 60 },
  talents,
  states: [],
  traits: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false } },
  ...extra
});

async function setup(talents = [], defenderTalents = [], extra = {}) {
  let saved = null;
  const persistence = {
    load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => {
      saved = structuredClone(state);
      return { ok: true };
    }
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({
    schemaVersion: 3,
    reserve: [],
    extensions: { v5: { combatId: 'c01-encounter', turnIndex: 1 } },
    combat: {
      round: 1,
      currentActorId: 'a',
      order: ['a', 'b'],
      participants: [subject('a', talents, extra.actor), subject('b', defenderTalents, extra.target)]
    },
    diceLines: [],
    log: []
  });
  return { store, persistence };
}

test('C01 — Peur générique (Q01) : seuil atteindre (DR >= indice), allié connu exempt, perte de gain d’Élan et Avantage adverse', async () => {
  const author = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  // Allié connu exempt (C0-L06-002)
  const allyAttempt = previewGenericFearEncounter({
    author: { ...author, camp: 'pj' },
    target: victim,
    rating: 2,
    knownAlly: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(allyAttempt.ready, true);
  assert.equal(allyAttempt.exempt, true);
  assert.equal(allyAttempt.addedStates.length, 0);

  // Source hostile de Peur (2) (C0-L06-002, C0-L06-032)
  const posed = previewGenericFearEncounter({
    author,
    target: victim,
    rating: 2,
    sourceLabel: 'Trait Peur (2)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates.length, 1);
  const activeVictim = { ...victim, states: [...posed.addedStates] };

  // Conséquence Peur (C0-L06-003) : pas de gain d’Élan
  assert.equal(withMomentum(activeVictim, true).extensions.v5.hasMomentum, false);

  // Test étendu de Calme : +1 DR (total 1 < 2) ne surmonte pas encore Peur (2), mais cumule 1 DR
  const step1 = resolveGenericFearTest({
    actor: activeVictim,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 1
  });
  assert.equal(step1.ready, true);
  assert.equal(step1.overcome, false);
  assert.equal(step1.participant.states[0].successes, 1);

  // Même Round : une seule tentative par Round (C0-L06-002)
  const sameRound = resolveGenericFearTest({
    actor: step1.participant,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 1
  });
  assert.equal(sameRound.ready, false);
  assert.match(sameRound.error, /Round/i);

  // Round 2 : +1 DR supplémentaire atteint l’indice 2 (total 2 >= 2, Q01 « atteindre » sans devoir dépasser)
  const step2 = resolveGenericFearTest({
    actor: step1.participant,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 1 },
    round: 2
  });
  assert.equal(step2.ready, true);
  assert.equal(step2.overcome, true);
  assert.equal(step2.participant.states[0].key, 'fear-overcome');
  assert.equal(withMomentum(step2.participant, true).extensions.v5.hasMomentum, true);
});

test('C01 — Peureux / Afraid (C0-L06-029, C0-L23-005) fonctionne comme Peur (0) surmontée dès 0 DR réussi', () => {
  const source = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj', traits: ['Peureux (Feu)'] });

  const posed = previewGenericFearEncounter({
    author: source,
    target: victim,
    rating: 0,
    sourceKind: 'afraid',
    sourceLabel: 'Peureux (Feu)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates[0].rating, 0);
  const activeVictim = { ...victim, states: [...posed.addedStates] };
  assert.equal(withMomentum(activeVictim, true).extensions.v5.hasMomentum, false);

  const resolved = resolveGenericFearTest({
    actor: activeVictim,
    fearEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 0 },
    round: 1
  });
  assert.equal(resolved.ready, true);
  assert.equal(resolved.overcome, true);
});

test('C01 — Terreur générique (Q02, C0-L06-004, C0-L06-005, C0-L06-039) : indice + DR négatifs après le premier en Brisé, puis Peur de même indice', () => {
  const monster = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  const posed = previewGenericTerrorEncounter({
    author: monster,
    target: victim,
    rating: 3,
    sourceLabel: 'Trait Terreur (3)',
    encounterId: 'c01-encounter'
  });
  assert.equal(posed.ready, true);
  assert.equal(posed.addedStates[0].key, 'terror-of-talent');
  assert.equal(posed.addedStates[0].rating, 3);

  const activeVictim = { ...victim, states: [...posed.addedStates] };

  // Échec avec -4 DR : 3 (indice) + max(0, 4 - 1) = 6 États Brisé (Q02), plus suivi en Peur (3) (C0-L06-005)
  const failed = resolveGenericTerrorTest({
    actor: activeVictim,
    terrorEffectId: posed.addedStates[0].id,
    test: { success: false, sl: -4 },
    encounterId: 'c01-encounter'
  });
  assert.equal(failed.ready, true);
  assert.equal(failed.brokenAdded, 6);
  const brokenLevel = failed.participant.states
    .filter((s) => s.key === 'brise')
    .reduce((sum, s) => sum + (s.level || 1), 0);
  assert.equal(brokenLevel, 6);
  const followUpFear = failed.participant.states.find((s) => s.key === 'fear-of-talent');
  assert.ok(followUpFear, 'la source de Terreur cause ensuite Peur de même indice');
  assert.equal(followUpFear.rating, 3);

  // Réussite initiale contre Terreur : immunité à toute Terreur de la rencontre + suivi en Peur (3)
  const passed = resolveGenericTerrorTest({
    actor: activeVictim,
    terrorEffectId: posed.addedStates[0].id,
    test: { success: true, sl: 0 },
    encounterId: 'c01-encounter'
  });
  assert.equal(passed.ready, true);
  assert.equal(passed.brokenAdded, 0);
  assert.ok(passed.participant.states.some((s) => s.key === 'terror-immunity'));
  assert.ok(passed.participant.states.some((s) => s.key === 'fear-of-talent' && s.rating === 3));

  // Nouvelle source de Terreur (4) dans la même rencontre : dégradée directement en Peur (4) grâce à l’immunité de rencontre
  const secondTerror = previewGenericTerrorEncounter({
    author: subject('c', [], { camp: 'ennemi' }),
    target: passed.participant,
    rating: 4,
    sourceLabel: 'Faille du Chaos (Terreur 4)',
    encounterId: 'c01-encounter'
  });
  assert.equal(secondTerror.ready, true);
  assert.equal(secondTerror.downgradedToFear, true);
  assert.equal(secondTerror.addedStates[0].key, 'fear-of-talent');
  assert.equal(secondTerror.addedStates[0].rating, 4);
});

test('C01 — Q03, Q04, Q08, Q13, Q19 : Effrayant distinct (par Tour), Petit préservé, Taille V5 sans Terreur automatique, et indices non chiffrés bloqués sans saisie MJ', async () => {
  const author = subject('b', [], { camp: 'ennemi' });
  const victim = subject('a', [], { camp: 'pj' });

  // Source non chiffrée (Cry of War C0-L09-008, Masque mortuaire C0-L06-051, Givre d'Ulric C0-L06-055, Arche noire C0-L09-001) : refuse sans indice MJ (Q13, Q19)
  const missingFearRating = previewGenericFearEncounter({
    author,
    target: victim,
    rating: undefined,
    sourceId: 'C0-L06-051',
    sourceLabel: 'Masque mortuaire',
    encounterId: 'c01-encounter'
  });
  assert.equal(missingFearRating.ready, false);
  assert.ok(missingFearRating.needsInput.some((n) => n.field === 'rating'));

  const missingTerrorRating = previewGenericTerrorEncounter({
    author,
    target: victim,
    rating: null,
    sourceId: 'C0-L09-008',
    sourceLabel: 'Cry of War',
    encounterId: 'c01-encounter'
  });
  assert.equal(missingTerrorRating.ready, false);
  assert.ok(missingTerrorRating.needsInput.some((n) => n.field === 'rating'));

  // Taille V5 générique sans homebrew Petit (C0-L06-036, Q04, Q08) : 2 écarts de taille causent Peur (2) (V5 v3), pas Terreur
  const sizeFearV5 = previewGenericFearEncounter({
    author,
    target: victim,
    sourceKind: 'v5-size',
    actorSize: 5,
    targetSize: 3,
    aggressive: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(sizeFearV5.ready, true);
  assert.equal(sizeFearV5.addedStates[0].key, 'fear-of-talent');
  assert.equal(sizeFearV5.addedStates[0].rating, 2, 'V5 v3 p.360 : Peur (2)');

  // Masque mortuaire (C0-L06-051) avec indice MJ saisi : affecte même un mort-vivant grâce à ignoreUndeadImmunity
  const undeadTarget = subject('u', [], { camp: 'ennemi', traits: ['Mort-vivant', 'Immunité à la Psychologie'] });
  const normalFearOnUndead = previewGenericFearEncounter({
    author: victim,
    target: undeadTarget,
    rating: 2,
    encounterId: 'c01-encounter'
  });
  assert.equal(normalFearOnUndead.exempt, true);

  const deathsHeadFear = previewGenericFearEncounter({
    author: victim,
    target: undeadTarget,
    rating: 2,
    sourceId: 'C0-L06-051',
    ignoreUndeadImmunity: true,
    encounterId: 'c01-encounter'
  });
  assert.equal(deathsHeadFear.ready, true);
  assert.equal(deathsHeadFear.exempt, false);
  assert.equal(deathsHeadFear.addedStates.length, 1);
});
});

describe('Ralliement et monture', () => {
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

test('C03 — Master and Commander (L25-003, 22/10) : Talent du catalogue, +1 DR par rang à bord, fait « à bord » MJ', () => {
  const holder = (rank) => ({ id: 'cap', talents: rank ? [{ id: MASTER_AND_COMMANDER_TALENT.id, status: 'resolved', rank }] : [] });
  assert.equal(MASTER_AND_COMMANDER_TALENT.id, 'talent-master-and-commander');
  assert.match(MASTER_AND_COMMANDER_TALENT.source, /L25.*63/);
  assert.deepEqual(leadershipRallySlModifiers({ participant: holder(0) }).modifiers, []);
  assert.deepEqual(leadershipRallySlModifiers({ masterAndCommanderRank: 2 }).modifiers, []);
  const unknown = leadershipRallySlModifiers({ participant: holder(2) });
  assert.ok(unknown.needsInput.some((n) => n.field === 'onBoardVessel'));
  const no = leadershipRallySlModifiers({ participant: holder(2), onBoardVessel: false });
  assert.deepEqual(no.modifiers, []);
  const yes = leadershipRallySlModifiers({ participant: holder(2), onBoardVessel: true });
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
});

describe('Intimidation et traits', () => {
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PNJ', camp: id === 'a' ? 'pj' : 'ennemi', hp: 20, maxHp: 20,
  caracs: { E: 30, FM: 40 }, states: [], traits: [], extensions: { v5: { hasMomentum: false } }, ...extra
});
const levelOf = (p, key) => (p.states || []).filter((s) => s.key === key).reduce((n, s) => n + (s.level || 1), 0);

test('C04 — Intimidation en combat (L06-019) : Peur 1 + (DR net − 1), groupe à −2 DR, défense du chef ou du plus faible Calme', () => {
  assert.deepEqual(combatIntimidationModifiers({ targetGroup: false }), []);
  assert.equal(combatIntimidationModifiers({ targetGroup: true })[0].amount, -2);
  assert.equal(groupIntimidationDefenceSl({ organizedGroup: true, chiefSl: 3, calmSls: [1, 5] }), 3);
  assert.equal(groupIntimidationDefenceSl({ organizedGroup: false, chiefSl: 3, calmSls: [1, 5] }), 1);
  assert.equal(groupIntimidationDefenceSl({ organizedGroup: true, calmSls: [1, 5] }), null);
  const author = person('b');
  const target = person('a', { kind: 'PJ' });
  const win = previewCombatIntimidation({ author, target, authorTest: { sl: 4 }, defenceTest: { sl: 1 }, encounterId: 'e' });
  assert.equal(win.ready, true);
  assert.equal(win.addedStates[0].rating, 3);
  assert.equal(win.addedStates[0].key, 'fear-of-talent');
  const lose = previewCombatIntimidation({ author, target, authorTest: { sl: 1 }, defenceTest: { sl: 3 }, encounterId: 'e' });
  assert.equal(lose.ready, true);
  assert.equal(lose.addedStates.length, 0);
  const tie = previewCombatIntimidation({ author, target, authorTest: { sl: 2 }, defenceTest: { sl: 2 }, encounterId: 'e' });
  assert.equal(tie.ready, true);
  assert.equal(tie.addedStates.length, 0);
  const immune = previewCombatIntimidation({ author, target: person('a', { traits: ['Sans peur'], states: [{ key: 'heart-of-the-wolf' }] }), authorTest: { sl: 4 }, defenceTest: { sl: 0 }, encounterId: 'e' });
  assert.equal(immune.addedStates.length, 0);
  const missing = previewCombatIntimidation({ author, target, authorTest: { sl: 4 }, encounterId: 'e' });
  assert.equal(missing.ready, false);
});

test('C04 — Intimidation lors d’un vol (L04-004) : un PJ intimidé reçoit une Peur, aucune remise automatique de ses biens', () => {
  const r = previewCombatIntimidation({ author: person('b'), target: person('a', { kind: 'PJ' }), authorTest: { sl: 2 }, defenceTest: { sl: 0 }, encounterId: 'e', theft: true });
  assert.equal(r.addedStates.length, 1);
  assert.equal(r.forcedHandover, false);
  assert.ok(r.reminders.some((m) => /biens/i.test(m)));
});

test('C04 — Belliqueux (Q09) : immunité à Peur seulement avec l’Élan, pas à la Terreur', () => {
  const withM = person('a', { traits: ['Belliqueux'], extensions: { v5: { hasMomentum: true } } });
  const without = person('a', { traits: ['Belliqueux'], extensions: { v5: { hasMomentum: false } } });
  const src = person('b');
  assert.equal(previewGenericFearEncounter({ author: src, target: withM, rating: 2 }).exempt, true);
  assert.equal(previewGenericFearEncounter({ author: src, target: without, rating: 2 }).exempt, false);
  assert.equal(previewGenericTerrorEncounter({ author: src, target: withM, rating: 2 }).exempt, false);
});

test('C04 — À Sang-froid (Q20) : Avantage à tout Test de Calme, y compris les résistances de Psychologie', () => {
  const calm = getReferenceCatalogue().skills.find((s) => s.nom === 'Calme').id;
  const action = { extensions: { fiche: { skillId: calm } } };
  const ctx = { actor: person('a'), target: null };
  const cold = person('a', { traits: ['À Sang-froid'] });
  const r = psychologyTestRules(ctx, cold, action, { context: {} }, { kind: 'test', defending: false });
  assert.ok(r.advantages.some((a) => a.id === 'trait:cold-blooded'));
  const other = psychologyTestRules(ctx, cold, { extensions: { fiche: { skillId: 'autre' } } }, { context: {} }, { kind: 'test', defending: false });
  assert.ok(!other.advantages.some((a) => a.id === 'trait:cold-blooded'));
  const plain = psychologyTestRules(ctx, person('a'), action, { context: {} }, { kind: 'test', defending: false });
  assert.ok(!plain.advantages.some((a) => a.id === 'trait:cold-blooded'));
});

test('C04 — Hurlement spectral (Q10) : 1 Élan, dégâts directs, Assourdi, Calme +2 DR sinon Brisé', () => {
  const author = person('b', { extensions: { v5: { hasMomentum: true } } });
  const t1 = person('a');
  const t2 = person('c', { camp: 'pj' });
  const noMomentum = previewGhostlyHowl({ author: person('b'), targets: [t1], damageRoll: 4, calmTests: { a: { success: true, sl: 0 } } });
  assert.equal(noMomentum.ready, false);
  const missing = previewGhostlyHowl({ author, targets: [t1], damageRoll: 4, calmTests: {} });
  assert.equal(missing.ready, false);
  const r = previewGhostlyHowl({ author, targets: [t1, t2], damageRoll: 4, calmTests: { a: { success: false, sl: -1 }, c: { success: true, sl: 1 } }, round: 1 });
  assert.equal(r.ready, true);
  assert.equal(r.calmModifier, 2);
  assert.equal(r.author.extensions.v5.hasMomentum, false);
  const a = r.participants.find((p) => p.id === 'a'), c = r.participants.find((p) => p.id === 'c');
  assert.equal(a.hp, 16);
  assert.equal(levelOf(a, 'assourdi'), 1);
  assert.equal(levelOf(a, 'brise'), 1);
  assert.equal(c.hp, 16);
  assert.equal(levelOf(c, 'assourdi'), 1);
  assert.equal(levelOf(c, 'brise'), 0);
  const immune = previewGhostlyHowl({ author, targets: [person('u', { traits: ['Immunité à la Psychologie'] })], damageRoll: 3, calmTests: {}, round: 1 });
  assert.equal(immune.ready, true);
  assert.equal(levelOf(immune.participants[0], 'brise'), 0);
  assert.equal(levelOf(immune.participants[0], 'assourdi'), 1);
});

test('C04 — Immunité à la Psychologie, Nuée, Marque de Slaanesh (L06-034/035/038)', () => {
  const immune = person('a', { traits: ['Immunité à la Psychologie'] });
  const swarm = person('a', { traits: ['Nuée'] });
  for (const kind of ['fear', 'terror', 'intimidate', 'hatred', 'animosity', 'frenzy']) {
    assert.equal(isPsychologyImmune(immune, { kind }), true, kind);
    assert.equal(isPsychologyImmune(swarm, { kind }), true, kind);
  }
  const mark = person('a', { traits: ['Marque de Slaanesh'] });
  assert.equal(isPsychologyImmune(mark, { kind: 'fear' }), true);
  assert.equal(isPsychologyImmune(mark, { kind: 'intimidate' }), true);
  assert.equal(isPsychologyImmune(mark, { kind: 'terror' }), false);
});

test('C04 — Craintif / Skittish (L06-037/040, L13-006, L23-001, L26-004) : 1 Brisé (v3) sauf dressage adapté', () => {
  const horse = person('h', { traits: ['Craintif'] });
  const magic = previewSkittishReaction({ subject: horse, trigger: 'magic', visible: true, round: 1 });
  assert.equal(levelOf(magic.participant, 'brise'), 1);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'noise', round: 1 }).participant, 'brise'), 1);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'magic', training: 'Magie', round: 1 }).participant, 'brise'), 0);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'noise', training: 'Guerre', round: 1 }).participant, 'brise'), 0);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'magic', training: 'Guerre', round: 1 }).participant, 'brise'), 1);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'noise', isolatedVoice: true, round: 1 }).participant, 'brise'), 0);
  assert.equal(previewSkittishReaction({ subject: horse, trigger: undefined, round: 1 }).ready, false);
  assert.equal(levelOf(previewSkittishReaction({ subject: person('x'), trigger: 'magic', round: 1 }).participant, 'brise'), 0);
  const noVisible = previewSkittishReaction({ subject: horse, trigger: 'magic', visible: false, round: 1 });
  assert.equal(levelOf(noVisible.participant, 'brise'), 0);
});

test('C04 — Animosité supplantée par Peur ou Terreur (L06-006), monture non dressée (L06-047), Cavalier accompli (L13-013)', () => {
  const animus = { key: 'animosity', name: 'Animosité' };
  assert.equal(isAnimosityOverridden(person('a', { states: [animus] })), false);
  assert.equal(isAnimosityOverridden(person('a', { states: [animus, { key: 'fear-of-talent' }] })), true);
  assert.equal(isAnimosityOverridden(person('a', { states: [animus, { key: 'terror-of-talent' }] })), true);
  assert.ok(untrainedMountDisadvantage({ training: null }));
  assert.equal(untrainedMountDisadvantage({ training: 'Guerre' }), null);
  // C0-L13-013 (22/10) : « Cavalier accompli » = Talent Cavalier émérite du cavalier, plus un fait MJ.
  const roughrider = person('cav', { talents: [{ id: 'talent-roughrider', status: 'resolved', rank: 1 }] });
  const plain = person('cav2');
  assert.equal(effectiveSizeAgainstFear({ rider: roughrider, riderSize: 3, mountSize: 5, sizeOnlyCause: true }), 5);
  assert.equal(effectiveSizeAgainstFear({ rider: roughrider, riderSize: 3, mountSize: 5, sizeOnlyCause: false }), 3);
  assert.equal(effectiveSizeAgainstFear({ rider: plain, riderSize: 3, mountSize: 5, sizeOnlyCause: true }), 3);
  assert.equal(effectiveSizeAgainstFear({ rider: plain, riderSize: 3, mountSize: 5, accomplishedRider: true, sizeOnlyCause: true }), 3);
});
});

describe('Supplements C05', () => {
const person = (id, extra = {}) => ({
  id, name: id, camp: id.startsWith('e') ? 'ennemi' : 'pj', hp: 20, maxHp: 20,
  caracs: { E: 30, FM: 40 }, states: [], traits: [], extensions: { v5: { hasMomentum: false } }, ...extra
});
const levelOf = (p, key) => (p.states || []).filter((s) => s.key === key).reduce((n, s) => n + (s.level || 1), 0);
const broken = (id, level) => acquireV5Conditions(person(id), [{ name: 'Brisé', level }]).participant;

test('C05 — chaque clause C05 du plan est raccordée au catalogue de sources', () => {
  const plan = readFileSync(new URL('../../../docs/plans-gpt/PLAN_GPT_PHASE_C.md', import.meta.url), 'utf8');
  const block = plan.match(/### C05[\s\S]*?### C06/)[0];
  const ids = [...new Set(block.match(/C0-L\d+-\d+/g))];
  const missing = ids.filter((id) => !PSYCHOLOGY_SOURCE_IDS.includes(id));
  assert.deepEqual(missing, []);
  for (const entry of PSYCHOLOGY_SOURCES) assert.ok(entry.name && (entry.steps || entry.variants), entry.name);
});

test('C05 — Effrayant/Terrifiant : sorts, indice 1 + floor(surincantation / 3), cible hostile', () => {
  const caster = person('a');
  const t = person('e1');
  const fear = previewPsychologySource('C0-L06-060', { author: caster, targets: [t], overcast: 7 });
  assert.equal(fear.ready, true);
  assert.equal(fear.addedStates[0].rating, 3);
  assert.equal(fear.participants[0].states[0].key, 'fear-of-talent');
  const terror = previewPsychologySource('C0-L06-061', { author: caster, targets: [t], overcast: 2 });
  assert.equal(terror.addedStates[0].key, 'terror-of-talent');
  assert.equal(terror.addedStates[0].rating, 1);
  assert.equal(previewPsychologySource('C0-L06-060', { author: caster, targets: [t], overcast: -1 }).ready, false);
  assert.equal(previewPsychologySource('C0-L06-060', { author: caster, targets: [t] }).addedStates[0].rating, 1);
});

test('C05 — indice non chiffré : saisie MJ (Q13) ; Peur par runes et Sword of Fear', () => {
  const author = person('a');
  const t = person('e1');
  const noRating = previewPsychologySource('C0-L11-019', { author, targets: [t] });
  assert.equal(noRating.addedStates[0].rating, 2);
  const flambeau = previewPsychologySource('C0-L06-054', { author, targets: [broken('a2', 2)] });
  assert.equal(flambeau.ready, false);
  assert.ok(flambeau.needsInput.some((n) => n.field === 'rating'));
  const withRating = previewPsychologySource('C0-L06-054', { author, targets: [broken('a2', 2)], facts: { rating: 1 } });
  assert.equal(levelOf(withRating.participants[0], 'brise'), 0);
  const sword = previewPsychologySource('C0-L19-001', { author, targets: [t] });
  assert.equal(sword.addedStates[0].rating, 2);
  const daunting = previewPsychologySource('C0-L15-004', { author, targets: [t], facts: { runeCount: 3 } });
  assert.equal(daunting.addedStates[0].rating, 3);
});

test('C05 — Laurels of Victory : Peur 2 seulement dès le Round 2', () => {
  const author = person('a');
  const t = person('e1');
  assert.equal(previewPsychologySource('C0-L20-001', { author, targets: [t], round: 1 }).addedStates.length, 0);
  assert.equal(previewPsychologySource('C0-L20-001', { author, targets: [t], round: 2 }).addedStates[0].rating, 2);
});

test('C05 — Poisoned Whispers (Q12) : BFM Rounds et rappel du Test quotidien ; Fellstave (Q14) : Calme sinon Brisé, Intuition au rétablissement', () => {
  const pw = previewPsychologySource('C0-L09-005', { author: person('a'), targets: [person('e1')] });
  assert.equal(pw.grants[0].duration, 'BFM Rounds');
  assert.ok(pw.reminders.some((r) => /quotidien/.test(r)));
  const fs = previewPsychologySource('C0-L02-001', { author: person('a'), targets: [person('e1'), person('e2')], tests: { calm: { e1: { success: false, sl: -1 }, e2: { success: true, sl: 0 } } } });
  assert.equal(fs.ready, true);
  assert.equal(levelOf(fs.participants[0], 'brise'), 1);
  assert.equal(levelOf(fs.participants[1], 'brise'), 0);
  assert.ok(fs.reminders.some((r) => /Intuition \(\+0\).*échec/.test(r)));
  const noTest = previewPsychologySource('C0-L02-001', { author: person('a'), targets: [person('e1')] });
  assert.equal(noTest.ready, false);
});

test('C05 — Howl of the Great Beast : 1 Élan, 3 Assourdi, Calme −1 DR sinon 3 Brisé', () => {
  const author = person('a', { extensions: { v5: { hasMomentum: true } } });
  const targets = [person('e1'), person('e2')];
  const tests = { calm: { e1: { success: false, sl: -2 }, e2: { success: true, sl: 1 } } };
  const r = previewPsychologySource('C0-L17-010', { author, targets, tests });
  assert.equal(r.ready, true);
  assert.equal(r.author.extensions.v5.hasMomentum, false);
  assert.equal(levelOf(r.participants[0], 'assourdi'), 3);
  assert.equal(levelOf(r.participants[0], 'brise'), 3);
  assert.equal(levelOf(r.participants[1], 'assourdi'), 3);
  assert.equal(levelOf(r.participants[1], 'brise'), 0);
  assert.ok(r.modifiers.some((m) => m.amount === -1));
  const noMomentum = previewPsychologySource('C0-L19-002', { author: person('a'), targets, tests });
  assert.equal(noMomentum.ready, false);
});

test('C05 — Breath of Nightmares : Terreur 2 malgré l’immunité à la Psychologie ; Gastromancie, WAAAGH! et Cœur du loup', () => {
  const immune = person('e1', { traits: ['Immunité à la Psychologie'] });
  const r = previewPsychologySource('C0-L11-009', { author: person('a'), targets: [immune] });
  assert.equal(r.addedStates[0].key, 'terror-of-talent');
  const gast = previewPsychologySource('C0-L12-001', { author: person('a'), targets: [broken('a2', 2)] });
  assert.equal(levelOf(gast.participants[0], 'brise'), 2);
  assert.equal(gast.grants[0].duration, 'BFM Rounds');
  const waaagh = previewPsychologySource('C0-L12-006', { author: person('a'), targets: [broken('o1', 3), broken('o2', 1)] });
  assert.equal(waaagh.participants.reduce((n, p) => n + levelOf(p, 'brise'), 0), 0);
  const heart = previewPsychologySource('C0-L18-006', { author: person('a'), targets: [broken('a2', 4)], bfm: 3, round: 1 });
  assert.equal(levelOf(heart.participants[0], 'brise'), 0);
  assert.ok(heart.participants[0].states.some((s) => s.key === 'brise-immunity'));
  assert.equal(previewPsychologySource('C0-L18-006', { author: person('a'), targets: [broken('a2', 4)] }).ready, false);
});

test('C05 — conversions V4 → V5 (Q17) et variantes explicites', () => {
  const fervent = previewPsychologySource('C0-L02-004', { author: person('a'), targets: [broken('a2', 3)] });
  assert.equal(levelOf(fervent.participants[0], 'brise'), 2);
  const claustro = previewPsychologySource('C0-L17-005', { author: person('a'), targets: [person('a2')], tests: { calm: { a2: { success: false, sl: -1 } } } });
  assert.equal(claustro.modifiers[0].amount, 4);
  assert.equal(levelOf(claustro.participants[0], 'brise'), 1);
  const horror = previewPsychologySource('C0-L17-001', { author: person('a'), targets: [person('a2')], tests: { calm: { a2: { success: true, sl: 0 } } } });
  assert.equal(horror.modifiers[0].amount, -2);
  const rune = previewPsychologySource('C0-L15-005', {});
  assert.equal(rune.modifiers[0].amount, 1);
  const noVariant = previewPsychologySource('C0-L01-003', { author: person('a'), targets: [person('e1')] });
  assert.equal(noVariant.ready, false);
  const dolorous = previewPsychologySource('C0-L01-003', { author: person('a'), targets: [person('e1')], variant: 'dolorous' });
  assert.equal(dolorous.addedStates[0].rating, 1);
  assert.equal(previewPsychologySource('INCONNU').ready, false);
});
});

describe('Couverture C06', () => {
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const inventory = JSON.parse(read('../../../docs/COURAGE_BRISE_INVENTAIRE.json'));
const plan = read('../../../docs/plans-gpt/PLAN_GPT_PHASE_C.md');

const rows = new Map();
for (const line of plan.split('\n')) {
  const m = line.match(/^\| (C0-L\d+-\d+) \| (\w+) \| (.+) \|$/);
  if (m) rows.set(m[1], { status: m[2], target: m[3].trim() });
}
const lotIds = (lot) => {
  const block = plan.match(new RegExp(`### ${lot} [\\s\\S]*?(?=\\n### |\\n## )`))[0];
  const line = block.split('\n').find((l) => l.startsWith('- Inventaire'));
  return new Set(line.match(/C0-L\d+-\d+/g) || []);
};

test('C06 — les 239 entrées de l’inventaire figurent au plan, avec un lot ou une exclusion motivée', () => {
  assert.equal(inventory.length, 239);
  assert.equal(rows.size, 239);
  const lots = { C01: lotIds('C01'), C02: lotIds('C02'), C03: lotIds('C03'), C04: lotIds('C04'), C05: lotIds('C05') };
  let covered = 0;
  let excluded = 0;
  for (const entry of inventory) {
    const row = rows.get(entry.id);
    assert.ok(row, `${entry.id} absent du tableau de couverture`);
    if (/^C0[1-5]$/.test(row.target)) {
      assert.ok(lots[row.target].has(entry.id), `${entry.id} annoncé en ${row.target} mais absent de son lot`);
      covered++;
    } else {
      assert.match(row.target, /^Exclu par /, `${entry.id} sans lot ni exclusion motivée`);
      assert.ok(row.target.length > 30, `${entry.id} : motif d’exclusion trop court`);
      excluded++;
    }
  }
  assert.equal(covered, 202);
  assert.equal(excluded, 37);
});

test('C06 — chaque clause du lot C05 est raccordée au catalogue de sources', () => {
  const missing = [...lotIds('C05')].filter((id) => !PSYCHOLOGY_SOURCE_IDS.includes(id));
  assert.deepEqual(missing, []);
});

test('C06 — chaque lot C03 et C04 a son fichier de tests et le plan ne mentionne que des identifiants d’inventaire', () => {
  const known = new Set(inventory.map((e) => e.id));
  for (const id of plan.match(/C0-L\d+-\d+/g)) assert.ok(known.has(id), `${id} inconnu de l’inventaire`);
  for (const file of ['c01-fear-terror', 'c02-engaged-flee', 'c03-rally-mount', 'c04-intimidation-traits', 'c05-supplements']) {
    const path = file === 'c02-engaged-flee' ? './initiative-et-tours.test.js' : './psychologie-et-talents-de-groupe.test.js';
    assert.ok(read(path).length > 0, file);
  }
});
});

describe('Maitre et commandant', () => {
// Sea of Claws (V4) p. 63 : le MJ l'a ajouté à la feuille Drive (« Maître à bord (Master and Commander) »).
const ID = 'talent-master-and-commander';
const captain = (rank, extra = {}) => ({ id: 'cap', talents: [{ id: ID, status: 'resolved', rank, ...extra }] });

test('Q10b — Maître à bord est au catalogue importé, reconnu par son id sous ses deux noms', () => {
  const entry = getReferenceCatalogue().talents.find(row => row.id === ID);
  assert.equal(entry.nom, 'Maître à bord');
  assert.equal(entry.englishName, 'Master and Commander');
  assert.equal(entry.limitText, 'Bonus de Sociabilité');
  assert.match(entry.source, /Sea of Claws.*63/);
  for (const name of ['Master and Commander', 'Maître à bord']) {
    const resolved = resolveTalent(name);
    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.entry.id, ID);
  }
  assert.equal(MASTER_AND_COMMANDER_TALENT.nom, entry.nom);
});

test('Q10b — contrat « verified » du talent comme les autres identités', () => {
  const coverage = v5TalentCoverage(ID);
  assert.equal(coverage.status, 'verified');
  assert.ok(coverage.clauses.length > 0);
});

test('Q10b — +1 DR de Commandement par niveau, à bord seulement, sur une ligne résolue par id', () => {
  assert.equal(leadershipRallySlModifiers({ participant: captain(3), onBoardVessel: true }).modifiers[0].amount, 3);
  assert.deepEqual(leadershipRallySlModifiers({ participant: captain(3), onBoardVessel: false }).modifiers, []);
  assert.equal(leadershipRallySlModifiers({ participant: captain(2) }).needsInput.length, 1);
});

test('Q10b — plus de repli par nom : une ligne non résolue ne donne aucun bonus', () => {
  const byName = { id: 'cap', talents: [{ nom: 'Master and Commander', rank: 2 }] };
  assert.deepEqual(leadershipRallySlModifiers({ participant: byName, onBoardVessel: true }), { modifiers: [], needsInput: [] });
});
});

describe('Maitre a bord', () => {
// Sea of Claws p. 63 (Q23) : +1 DR par niveau aux Tests de Commandement à bord, appliqué par le moteur de Test.
const COMMAND = 'skill-43_6f_6d_6d_61_6e_64_65_6d_65_6e_74-base';
const captain = rank => ({ id: 'cap', hp: 12, states: [], talents: [{ id: 'talent-master-and-commander', status: 'resolved', rank }] });
const run = (actor, context = {}, label = 'Commandement') => buildCombatTest({
  actor, target: { id: 'b', hp: 12, states: [], talents: [] }, roll: 47,
  action: { type: 'test', label, base: 50, extensions: { fiche: { skillId: COMMAND } } },
  v5: { kind: 'test', context }
});

test('Q23 — 2 niveaux, à bord : +2 DR au Test de Commandement (DR 1 → 3)', () => {
  const built = run(captain(2), { onBoardVessel: true });
  const result = built.test.options[0].result;
  assert.equal(result.sl, 3);
  assert.ok(result.details.modifiers.some(row => row.id === 'master-and-commander' && row.amount === 2));
});

test('Q23 — hors du navire : aucun bonus ; fait non précisé : question posée, pas de bonus', () => {
  assert.equal(run(captain(2), { onBoardVessel: false }).test.options[0].result.sl, 1);
  const unknown = run(captain(2));
  assert.equal(unknown.test.options[0].result.sl, 1);
  assert.ok(unknown.unresolved.some(text => /à bord/i.test(text)));
});

test('Q23 — sans le talent, ou pour une autre compétence : aucun bonus ni question', () => {
  const plain = { id: 'x', hp: 12, states: [], talents: [] };
  assert.equal(run(plain, { onBoardVessel: true }).test.options[0].result.sl, 1);
  assert.equal(run(plain).unresolved.length, 0);
  const other = buildCombatTest({ actor: captain(2), target: plain, roll: 47, action: { type: 'test', label: 'Charme', base: 50 }, v5: { kind: 'test', context: { onBoardVessel: true } } });
  assert.equal(other.test.options[0].result.sl, 1);
});

test('Q23 — l’interface propose le champ « à bord » seulement au porteur, pour Commandement', () => {
  const field = applicableV5TalentTestFields(captain(1), COMMAND).find(row => row.field === 'onBoardVessel');
  assert.equal(field.type, 'boolean');
  assert.equal(applicableV5TalentTestFields(captain(1), 'none').some(row => row.field === 'onBoardVessel'), false);
  assert.equal(applicableV5TalentTestFields({ id: 'x', talents: [] }, COMMAND).some(row => row.field === 'onBoardVessel'), false);
});
});
