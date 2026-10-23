import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';
import {
  isPsychologyImmune,
  previewGenericFearEncounter,
  previewGenericTerrorEncounter,
  psychologyTestRules,
  combatIntimidationModifiers,
  groupIntimidationDefenceSl,
  previewCombatIntimidation,
  previewGhostlyHowl,
  previewSkittishReaction,
  isAnimosityOverridden,
  effectiveSizeAgainstFear,
  untrainedMountDisadvantage
} from '../js/core/v5-talent-psychology.js';

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

test('C04 — Craintif / Skittish (L06-037/040, L13-006, L23-001, L26-004) : 3 Brisé sauf dressage adapté', () => {
  const horse = person('h', { traits: ['Craintif'] });
  const magic = previewSkittishReaction({ subject: horse, trigger: 'magic', visible: true, round: 1 });
  assert.equal(levelOf(magic.participant, 'brise'), 3);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'noise', round: 1 }).participant, 'brise'), 3);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'magic', training: 'Magie', round: 1 }).participant, 'brise'), 0);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'noise', training: 'Guerre', round: 1 }).participant, 'brise'), 0);
  assert.equal(levelOf(previewSkittishReaction({ subject: horse, trigger: 'magic', training: 'Guerre', round: 1 }).participant, 'brise'), 3);
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
