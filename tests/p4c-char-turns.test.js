// Caractérisation (P4c) : ordre d'initiative, Tours et retraits de participants.
// Ces tests épinglent le comportement ACTUEL de la production ; aucun ne corrige le code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewV5Turn } from '../js/core/v5-turn.js';
import { removeFromCombat, setOrderMode as pureSetOrderMode } from '../js/core/turn-order.js';
import { createHistory, recordCommand, MAX_HISTORY_COMMANDS, DEFAULT_HISTORY_MAX_BYTES } from '../js/core/history.js';

function memoryPersistence() {
  let saved = null;
  return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } };
}
const person = (id, initiative, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 20, maxHp: 20, initiative,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 },
  skills: [], talents: [], traits: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: {} }, ...extra
});
// A(60) B(40) C(20) ; N(50) est ajouté en cours de Round.
async function fixture({ mode, current = 'A', round = 1 } = {}) {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round, currentActorId: current, order: ['A', 'B', 'C'], ...(mode ? { orderMode: mode } : {}), participants: [person('A', 60), person('B', 40), person('C', 20)] } });
  return store;
}
// Ajout « à la magie » : push direct, sans toucher à order ni à orderMode.
const summon = (store, participant) => store.executeCommand('summon-test', draft => ({ ...draft, combat: { ...draft.combat, participants: [...draft.combat.participants, participant] } }));
const full = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const view = store => { const c = full(store).combat; return { round: c.round, current: c.currentActorId, order: c.order, mode: c.orderMode, ids: c.participants.map(p => p.id) }; };
const world = store => { const v = full(store); return { combat: v.combat, diceLines: v.diceLines }; };
const byId = (store, id) => full(store).combat.participants.find(p => p.id === id);
// Joue n Tours avec le moteur V5 ou le chemin legacy ; renvoie « round:acteur ».
async function play(store, engineName, n) {
  const engine = createCombatEngine(store), seq = [];
  for (let i = 0; i < n; i++) {
    if (engineName === 'v5') { const r = await engine.nextTurn(); assert.equal(r?.status, 'applied', JSON.stringify(r)); }
    else await store.nextTurn();
    const c = store.getCombat(); seq.push(`${c.round}:${c.currentActorId}`);
  }
  return seq;
}
async function scenario(mode, engineName, { current = 'A', before = 0, init = 50, turns = 5 } = {}) {
  const store = await fixture({ mode, current });
  await play(store, engineName, before);
  await summon(store, person('N', init));
  return { store, seq: await play(store, engineName, turns) };
}
// Créature auxiliaire X liée à son auteur B (même marquage que la magie : couche d'effet + summon*).
const AUX_LAYER = { id: 'fx1', castExecutionId: 'cast1', spellId: 'spell-x', casterId: 'B', name: 'Invocation' };
const auxiliary = (id, init) => person(id, init, { extensions: { v5: { summonCastExecutionId: 'cast1', summonOwnerId: 'B', summonedBySpellId: 'spell-x' } } });
const summonAux = store => store.executeCommand('summon-aux-test', draft => ({ ...draft, combat: { ...draft.combat,
  participants: draft.combat.participants.map(p => p.id === 'B' ? { ...p, extensions: { ...p.extensions, v5: { ...p.extensions.v5, spellEffects: [AUX_LAYER] } } } : p).concat([auxiliary('X', 50)]) } }));

// ---------------------------------------------------------------- C4 : ajout en milieu de Round
test('C4 — push direct : N reste hors de order ; ordre effectif automatique = rang d’initiative, manuel = fin de piste', async () => {
  const auto = await fixture({ current: 'B' }); await summon(auto, person('N', 50));
  assert.deepEqual(auto.getCombat().order, ['A', 'B', 'C']);
  assert.deepEqual(auto.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
  assert.equal(auto.getOrderMode(), 'automatic');
  assert.deepEqual(auto.listParticipants().map(p => p.id), ['A', 'B', 'C', 'N'], 'listParticipants : ordre stocké puis hors-ordre');
  const manual = await fixture({ mode: 'manual', current: 'B' }); await summon(manual, person('N', 50));
  assert.deepEqual(manual.getCombat().order, ['A', 'B', 'C']);
  assert.deepEqual(manual.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
  assert.equal(manual.getOrderMode(), 'manual');
});

for (const engineName of ['v5', 'legacy']) {
  test(`C4 ${engineName} — automatique, N(50) ajouté pendant le Tour de B (déjà passé) : N rate le Round, agit au suivant à son rang`, async () => {
    const { store, seq } = await scenario('automatic', engineName, { current: 'B', turns: 5 });
    assert.deepEqual(seq, ['1:C', '2:A', '2:N', '2:B', '2:C']);
    assert.deepEqual(store.getCombat().order, ['A', 'N', 'B', 'C'], 'le premier Tour matérialise l’ordre effectif dans order');
    assert.equal(store.getOrderMode(), 'automatic');
  });
  test(`C4 ${engineName} — automatique, N(50) ajouté pendant le Tour de A (premier) : N joue juste après A, au même Round`, async () => {
    const { seq } = await scenario('automatic', engineName, { current: 'A', turns: 5 });
    assert.deepEqual(seq, ['1:N', '1:B', '1:C', '2:A', '2:N']);
  });
  test(`C4 ${engineName} — automatique, N(10) plus lent que tous : fin de Round`, async () => {
    const { seq } = await scenario('automatic', engineName, { init: 10, turns: 5 });
    assert.deepEqual(seq, ['1:B', '1:C', '1:N', '2:A', '2:B']);
  });
  test(`C4 ${engineName} — automatique, N(70) ajouté pendant le dernier Tour (C) : N ouvre le Round suivant`, async () => {
    const { store, seq } = await scenario('automatic', engineName, { current: 'C', init: 70, turns: 4 });
    assert.deepEqual(seq, ['2:N', '2:A', '2:B', '2:C']);
    assert.deepEqual(store.getCombat().order, ['N', 'A', 'B', 'C']);
  });
  test(`C4 ${engineName} — manuel : N s’ajoute en fin de piste, quel que soit son rang d’initiative`, async () => {
    for (const [current, init, expected] of [['A', 50, ['1:B', '1:C', '1:N', '2:A', '2:B']], ['C', 70, ['1:N', '2:A', '2:B', '2:C']]]) {
      const { store, seq } = await scenario('manual', engineName, { current, init, turns: expected.length });
      assert.deepEqual(seq, expected);
      assert.deepEqual(store.getCombat().order, ['A', 'B', 'C', 'N']);
      assert.equal(store.getOrderMode(), 'manual', 'le mode manuel n’est pas modifié par les Tours');
    }
  });
}

test('C4 DIFFÉRENCE V5/legacy — N ajouté après un Tour déjà joué du Round (automatique) : V5 gèle l’ordre du Round, legacy recalcule à chaque Tour', async () => {
  const v5 = await scenario('automatic', 'v5', { current: 'A', before: 1, turns: 5 });
  const legacy = await scenario('automatic', 'legacy', { current: 'A', before: 1, turns: 5 });
  assert.deepEqual(v5.seq, ['1:C', '1:N', '2:A', '2:N', '2:B'], 'V5 : N(50) est placé en fin de Round 1 (ordre gelé, piste manuelle du Round)');
  assert.deepEqual(legacy.seq, ['1:C', '2:A', '2:N', '2:B', '2:C'], 'legacy : N(50) est au-dessus de B déjà passé, donc raté au Round 1');
  assert.deepEqual(v5.store.getCombat().order, ['A', 'N', 'B', 'C'], 'le recalcul au changement de Round réintègre N à son rang');
});

test('C4 DIFFÉRENCE V5/legacy — N ajouté en plein Round 2 : V5 après C (ordre gelé), legacy tout de suite à son rang', async () => {
  const v5 = await scenario('automatic', 'v5', { current: 'A', before: 3, turns: 5 });
  const legacy = await scenario('automatic', 'legacy', { current: 'A', before: 3, turns: 5 });
  assert.deepEqual(v5.seq, ['2:B', '2:C', '2:N', '3:A', '3:N']);
  assert.deepEqual(legacy.seq, ['2:N', '2:B', '2:C', '3:A', '3:N']);
});

test('C4 V5 — orderRound : le Tour V5 marque le Round de l’ordre ; legacy ne le pose pas', async () => {
  const v5 = await fixture({ current: 'A' });
  assert.equal(full(v5).extensions.v5.orderRound, undefined);
  await play(v5, 'v5', 1); assert.equal(full(v5).extensions.v5.orderRound, 1);
  await play(v5, 'v5', 2); assert.equal(full(v5).extensions.v5.orderRound, 2, 'orderRound suit le Round de la transition');
  const legacy = await fixture({ current: 'A' }); await play(legacy, 'legacy', 4);
  assert.equal(full(legacy).extensions.v5.orderRound, undefined);
});

test('C4 V5 — l’ordre effectif du Store suit orderRound : une fois posé pour le Round courant, il est manuel (N en fin) ; au Round suivant, par initiative', async () => {
  const store = await fixture({ current: 'A' });
  await play(store, 'v5', 1); // A -> B, orderRound = 1, order = A,B,C
  await summon(store, person('N', 50));
  assert.equal(store.getOrderMode(), 'automatic');
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
  assert.deepEqual(await play(store, 'v5', 3), ['1:C', '1:N', '2:A']);
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
});

test('C4 previewV5Turn pur — transition calculée sur l’état fourni sans le muter ; N (automatique, courant A) est le prochain acteur', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const state = full(store), frozen = structuredClone(state);
  const preview = previewV5Turn(state);
  assert.equal(preview.ready, true, JSON.stringify(preview.requests));
  assert.equal(preview.transition.currentActorId, 'N');
  assert.equal(preview.transition.round, 1);
  assert.deepEqual(preview.transition.order, ['A', 'N', 'B', 'C']);
  assert.deepEqual(state, frozen, 'l’état passé n’est pas muté');
  assert.equal(preview.baseRevision, state.localRevision);
  assert.equal(preview.state.combat.currentActorId, 'N');
  assert.equal(preview.state.extensions.v5.turnIndex, 2);
  assert.equal(preview.state.extensions.v5.orderRound, 1);
});

test('C4 previewV5Turn — Round 0 : idle, rien n’est calculé', async () => {
  const store = await fixture({ round: 0, current: null });
  const preview = previewV5Turn(full(store));
  assert.equal(preview.status, 'idle'); assert.equal(preview.ready, false); assert.deepEqual(preview.requests, []);
});

test('C4 previewV5Turn — au changement de Round, N rapide ouvre le Round (ordre recalculé, acteur = premier)', async () => {
  const store = await fixture({ current: 'C' }); await summon(store, person('N', 99));
  const preview = previewV5Turn(full(store));
  assert.equal(preview.transition.round, 2);
  assert.equal(preview.transition.currentActorId, 'N');
  assert.deepEqual(preview.transition.order, ['N', 'A', 'B', 'C']);
});

test('C4 nextTurnV5 — une baseRevision périmée est refusée sans rien appliquer', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const engine = createCombatEngine(store), stale = store.getLocalRevision();
  await store.updateParticipant('B', { hp: 19 });
  const afterUpdate = world(store);
  assert.deepEqual(await engine.nextTurn({ baseRevision: stale }), { status: 'stale', requiresPreview: true });
  assert.deepEqual(world(store), afterUpdate);
  const ok = await engine.nextTurn({ baseRevision: store.getLocalRevision() });
  assert.equal(ok.status, 'applied'); assert.equal(store.getCombat().currentActorId, 'N');
});

test('C4 journal — le Tour V5 écrit « ▶ Tour de … », le chemin legacy n’écrit aucune entrée de gestion', async () => {
  const v5 = await fixture({ current: 'A' }); await play(v5, 'v5', 1);
  assert.match(full(v5).log[0].text, /^▶ Tour de B$/);
  const legacy = await fixture({ current: 'A' }); await play(legacy, 'legacy', 1);
  assert.equal(full(legacy).log.some(entry => /Tour de/.test(entry.text || '')), false);
});

// ---------------------------------------------------------------- removeFromCombat / setOrderMode / moveParticipant / insertReinforcement
test('removeFromCombat pur — acteur courant retiré : la main passe au suivant de order (circulaire), sans changer de Round', () => {
  const participants = [person('A', 60), person('B', 40), person('C', 20)];
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'B', participantId: 'B' }), { order: ['A', 'C'], currentActorId: 'C' });
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'C', participantId: 'C' }), { order: ['A', 'B'], currentActorId: 'A' }, 'dernier de la piste : retour au premier');
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'A', participantId: 'C' }), { order: ['A', 'B'], currentActorId: 'A' });
  assert.deepEqual(removeFromCombat({ participants: [person('A', 60)], order: ['A'], currentActorId: 'A', participantId: 'A' }), { order: [], currentActorId: null });
  assert.deepEqual(removeFromCombat({ participants, order: ['A', 'B', 'C'], currentActorId: 'B', participantId: 'ghost' }), { order: ['A', 'B', 'C'], currentActorId: 'B' });
});

for (const mode of ['automatic', 'manual']) {
  test(`removeParticipant (${mode}) — l’acteur courant retiré passe la main au suivant de order ; N (hors order) n’est jamais choisi`, async () => {
    const store = await fixture({ mode, current: 'B' }); await summon(store, person('N', 50));
    await store.removeParticipant('B');
    assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C'], mode, ids: ['A', 'C', 'N'] });
    assert.match(full(store).log[0].text, /Combat: retiré B/);
  });
  test(`removeParticipant (${mode}) — dernier acteur retiré : retour au premier, Round inchangé`, async () => {
    const store = await fixture({ mode, current: 'C' }); await summon(store, person('N', 50));
    await store.removeParticipant('C');
    assert.deepEqual(view(store), { round: 1, current: 'A', order: ['A', 'B'], mode, ids: ['A', 'B', 'N'] });
  });
  test(`removeParticipant (${mode}) — retirer N ne touche ni order, ni acteur courant, ni mode`, async () => {
    const store = await fixture({ mode, current: 'B' }); await summon(store, person('N', 50));
    await store.removeParticipant('N');
    assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C'], mode, ids: ['A', 'B', 'C'] });
  });
}

test('removeParticipant — identifiant inconnu : aucune commande, état et révision inchangés', async () => {
  const store = await fixture({ current: 'B' }); const before = world(store), rev = store.getLocalRevision();
  assert.equal(await store.removeParticipant('ghost'), undefined);
  assert.deepEqual(world(store), before); assert.equal(store.getLocalRevision(), rev);
});

test('removeParticipant d’un participant du banc : order nettoyé, acteur courant inchangé', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveParticipant('C', 'bench');
  await store.removeParticipant('C');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B'], mode: 'automatic', ids: ['A', 'B'] });
});

test('removeParticipant — retire ses lignes de dés et vide la cible des lignes qui le visaient', async () => {
  const store = await fixture({ current: 'A' });
  await store.addDiceLine({ id: 'own', participantId: 'B', type: 'attack', attr: 'CC', base: 40 });
  await store.addDiceLine({ id: 'aimed', participantId: 'A', type: 'attack', attr: 'CC', base: 40, targetId: 'B' });
  await store.removeParticipant('B');
  const lines = full(store).diceLines;
  assert.deepEqual(lines.map(l => l.id), ['aimed']);
  assert.equal(lines[0].targetId, null);
});

test('setOrderMode — passer en manuel fige order = ancien order + hors-ordre en fin : N, 2e en automatique, passe dernier (surprenant)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'N', 'B', 'C']);
  assert.deepEqual(await store.setOrderMode('manual'), { ok: true });
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C', 'N'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  await store.setOrderMode('automatic');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'N', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

test('setOrderMode — ne passe pas le Tour : round, acteur courant et turnIndex inchangés', async () => {
  const store = await fixture({ current: 'B' }); const turnIndex = full(store).extensions.v5.turnIndex;
  await store.setOrderMode('manual'); await store.setOrderMode('automatic');
  assert.equal(store.getCombat().round, 1); assert.equal(store.getCombat().currentActorId, 'B');
  assert.equal(full(store).extensions.v5.turnIndex, turnIndex);
});

test('setOrderMode pur — acteur courant absent de la piste : bascule sur le premier ; piste vide : null', () => {
  const participants = [person('A', 60), person('B', 40)];
  assert.deepEqual(pureSetOrderMode(participants, { mode: 'automatic', order: ['B', 'A'], currentActorId: 'ghost' }), { mode: 'automatic', order: ['A', 'B'], currentActorId: 'A' });
  assert.deepEqual(pureSetOrderMode([], { mode: 'manual', order: [], currentActorId: 'A' }), { mode: 'manual', order: [], currentActorId: null });
});

test('moveParticipant — banc puis retour actif sans beforeId, automatique : rang d’initiative, mode conservé', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.moveParticipant('N', 'bench');
  assert.deepEqual(view(store).order, ['A', 'B', 'C', 'N']);
  await store.moveParticipant('N', 'active');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'N', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

test('moveParticipant — retour actif avec beforeId : place choisie et bascule persistante en MANUEL', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.moveParticipant('N', 'bench');
  await store.moveParticipant('N', 'active', 'C');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'N', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.equal(store.getOrderMode(), 'manual');
  assert.deepEqual(await play(store, 'v5', 2), ['1:N', '1:C']);
});

test('moveParticipant — en manuel sans beforeId, le participant activé va en fin de piste active', async () => {
  const store = await fixture({ mode: 'manual', current: 'B' });
  await store.moveParticipant('A', 'bench');
  await store.moveParticipant('A', 'active');
  assert.deepEqual(view(store).order, ['B', 'C', 'A']);
  assert.equal(view(store).mode, 'manual');
});

test('moveParticipant — mettre l’acteur courant au banc ne recalcule pas currentActorId (surprenant)', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveParticipant('B', 'bench');
  const v = view(store);
  assert.equal(v.current, 'B', 'currentActorId reste sur un participant du banc');
  assert.deepEqual(v.order, ['A', 'C', 'B']);
});

test('moveInOrder sur N hors de order : order inchangé mais bascule quand même en MANUEL (surprenant)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.deepEqual(await store.moveInOrder('N', 'A'), { ok: true });
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.deepEqual(store.getEffectiveOrder(), ['A', 'B', 'C', 'N']);
});

test('moveInOrder sur un participant de la piste : déplacement avant la cible et MANUEL', async () => {
  const store = await fixture({ current: 'B' });
  await store.moveInOrder('C', 'A');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['C', 'A', 'B'], mode: 'manual', ids: ['A', 'B', 'C'] });
  assert.equal(await store.moveInOrder('ghost', 'A'), false);
});

test('insertReinforcement — N va juste après l’acteur courant ; la bascule en MANUEL est persistante (Tours et Rounds suivants)', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  assert.equal(store.getOrderMode(), 'automatic');
  await store.insertReinforcement('N');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'N', 'C'], mode: 'manual', ids: ['A', 'B', 'C', 'N'] });
  assert.deepEqual(await play(store, 'v5', 6), ['1:N', '1:C', '2:A', '2:B', '2:N', '2:C']);
  assert.equal(store.getOrderMode(), 'manual', 'ne revient jamais seul en automatique');
});

test('insertReinforcement — legacy : même résultat que V5 une fois en manuel', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.insertReinforcement('N');
  assert.deepEqual(await play(store, 'legacy', 6), ['1:N', '1:C', '2:A', '2:B', '2:N', '2:C']);
});

test('insertReinforcement — sans acteur courant : ajouté en fin de piste ; identifiant inconnu : refusé', async () => {
  const store = await fixture({ round: 0, current: null }); await summon(store, person('N', 50));
  await store.insertReinforcement('N');
  assert.deepEqual(view(store).order, ['A', 'B', 'C', 'N']);
  assert.equal(view(store).mode, 'manual');
  assert.equal(await store.insertReinforcement('ghost'), false);
});

test('insertReinforcement — un participant déjà en piste est déplacé (pas dupliqué) après l’acteur courant', async () => {
  const store = await fixture({ current: 'A' });
  await store.insertReinforcement('C');
  assert.deepEqual(view(store).order, ['A', 'C', 'B']);
});

test('setOrderMode automatique après insertReinforcement : retrie par initiative, N repasse à son rang', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 10));
  await store.insertReinforcement('N');
  assert.deepEqual(view(store).order, ['A', 'B', 'N', 'C']);
  await store.setOrderMode('automatic');
  assert.deepEqual(view(store), { round: 1, current: 'B', order: ['A', 'B', 'C', 'N'], mode: 'automatic', ids: ['A', 'B', 'C', 'N'] });
});

// ---------------------------------------------------------------- C5 : retraits, reset, restart, scènes
test('C5 removeParticipant d’une créature auxiliaire : retirée seule, la couche d’effet de l’auteur reste (orpheline)', async () => {
  const store = await fixture({ current: 'A' }); await summonAux(store);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C', 'X']);
  await store.removeParticipant('X');
  assert.deepEqual(view(store), { round: 1, current: 'A', order: ['A', 'B', 'C'], mode: 'automatic', ids: ['A', 'B', 'C'] });
  assert.deepEqual(byId(store, 'B').extensions.v5.spellEffects.map(e => e.id), ['fx1'], 'aucun nettoyage de la couche de l’auteur');
});

test('C5 removeParticipant de l’auteur : la créature auxiliaire disparaît dans la même commande (une seule annulation la ramène)', async () => {
  const store = await fixture({ current: 'A' }); await summonAux(store);
  const before = world(store);
  await store.removeParticipant('B');
  assert.deepEqual(view(store).ids, ['A', 'C']);
  assert.deepEqual(view(store).order, ['A', 'C']);
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C', 'X']);
});

test('C5 removeParticipant de l’auteur qui est l’acteur courant : la main passe à C, X (hors order) n’hérite pas du Tour', async () => {
  const store = await fixture({ current: 'B' }); await summonAux(store);
  await store.removeParticipant('B');
  assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C'], mode: 'automatic', ids: ['A', 'C'] });
});

test('C5 une créature auxiliaire sans couche d’auteur est supprimée dès la commande suivante (nettoyage automatique)', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, auxiliary('X', 50)); // marquée summon*, mais B n’a aucune couche
  assert.deepEqual(view(store).ids, ['A', 'B', 'C'], 'removeExpiredSummons est appliqué dans la commande même');
});

test('C5 resetCombat — vide combat et lignes de dés, journalise ; orderMode et turnIndex ne sont PAS réinitialisés (surprenant) ; annulable', async () => {
  const store = await fixture({ mode: 'manual', current: 'A' }); await summon(store, person('N', 50));
  await store.addDiceLine({ id: 'd1', participantId: 'N', type: 'attack', attr: 'CC', base: 40 });
  await play(store, 'v5', 2);
  const before = world(store), turnIndex = full(store).extensions.v5.turnIndex;
  assert.equal(turnIndex, 3);
  await store.resetCombat();
  assert.deepEqual(view(store), { round: 0, current: null, order: [], mode: 'manual', ids: [] });
  assert.deepEqual(full(store).diceLines, []);
  assert.equal(full(store).extensions.v5.turnIndex, 3);
  assert.equal(full(store).log[0].text, 'Combat terminé.');
  await store.undo();
  assert.deepEqual(world(store), before);
});

test('C5 resetCombat sans combat : commande valide, journal « Combat terminé. »', async () => {
  const store = await fixture({ round: 0, current: null });
  await store.resetCombat(); await store.resetCombat();
  assert.deepEqual(view(store).ids, []);
  assert.equal(full(store).log.filter(e => e.text === 'Combat terminé.').length, 2);
});

test('C5 restartCombat SANS scène — participants (dont N) et leurs extensions CONSERVÉS ; PV max, états vidés, Round 0, order et mode inchangés', async () => {
  const store = await fixture({ mode: 'manual', current: 'B' });
  await summon(store, person('N', 50, { hp: 3, states: [{ key: 'sonne', name: 'Sonné', level: 1 }], extensions: { v5: { marqueur: 'conserve', spellEffects: [{ id: 'fxN', spellId: 'spell-y' }] } } }));
  await play(store, 'v5', 2);
  await store.restartCombat();
  const v = view(store);
  assert.equal(v.round, 0); assert.equal(v.current, null);
  assert.deepEqual(v.ids, ['A', 'B', 'C', 'N'], 'N survit au redémarrage sans scène');
  assert.equal(v.mode, 'manual', 'orderMode conservé');
  assert.deepEqual(v.order, ['A', 'B', 'C', 'N'], 'les Tours joués avaient matérialisé N dans order ; restart ne le touche pas');
  const n = byId(store, 'N');
  assert.equal(n.hp, 20); assert.deepEqual(n.states, []);
  assert.equal(n.extensions.v5.marqueur, 'conserve');
  assert.deepEqual(n.extensions.v5.spellEffects.map(e => e.id), ['fxN'], 'les effets magiques ne sont pas purgés');
  assert.equal(full(store).extensions.v5.turnIndex, 1);
  assert.match(full(store).log[0].text, /Combat recommencé : PV remis au maximum\./);
});

test('C5 restartCombat sans scène — annulable ; combat vide : erreur explicite', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50, { hp: 4 }));
  const before = world(store);
  await store.restartCombat();
  assert.equal(byId(store, 'N').hp, 20);
  await store.undo();
  assert.deepEqual(world(store), before);
  const empty = await fixture({ round: 0, current: null });
  await empty.resetCombat();
  assert.throws(() => empty.restartCombat(), /Aucun combat à recommencer/);
});

async function sceneFixture() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.addProfile({ id: 'archer', name: 'Archer', hp: 8, initiative: 50 });
  await store.saveEncounter({ id: 'rencontre', title: 'Cour', entries: [
    { id: 'e1', profileId: 'garde', quantity: 1, zone: 'active' }, { id: 'e2', profileId: 'archer', quantity: 1, zone: 'active' }] });
  await store.launchEncounter('rencontre');
  const ids = store.listParticipants().map(p => p.id);
  await store.setRoundTurn(1, ids[0]);
  return { store, ids };
}

test('C5 restartCombat AVEC scène — tout est reconstruit : N et ses extensions disparaissent, ordre et mode remis au lancement', async () => {
  const { store, ids } = await sceneFixture();
  await summon(store, person('N', 99, { extensions: { v5: { marqueur: 'conserve' } } }));
  await store.moveInOrder(ids[0], null); // bascule en MANUEL
  assert.equal(store.getOrderMode(), 'manual');
  assert.ok(store.listParticipants().some(p => p.id === 'N'));
  const sceneId = store.getActiveScene().id, before = world(store);
  await store.restartCombat();
  assert.equal(store.listParticipants().some(p => p.id === 'N'), false);
  assert.deepEqual(store.listParticipants().map(p => p.profileId).sort(), ['archer', 'garde']);
  assert.equal(view(store).ids.some(id => ids.includes(id)), false, 'les participants sont recréés avec de NOUVEAUX identifiants');
  assert.equal(view(store).round, 0); assert.equal(view(store).current, null);
  assert.equal(store.getOrderMode(), 'automatic');
  assert.equal(store.getActiveScene().id, sceneId);
  assert.deepEqual(store.getCombat().order, store.getActiveScene().order);
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.ok(store.listParticipants().some(p => p.id === 'N'), 'l’annulation ramène N et son état');
});

test('C5 suspension puis reprise de scène avec N ajouté : N part avec la scène et revient, combat vidé entre-temps', async () => {
  const { store, ids } = await sceneFixture();
  await summon(store, person('N', 99, { extensions: { v5: { marqueur: 'conserve' } } }));
  await store.updateParticipant(ids[1], { hp: 5 }); // force la synchronisation scène <- combat
  assert.ok(store.getActiveScene().participants.some(p => p.id === 'N'), 'la scène suit les participants du combat');
  await store.suspendActiveScene();
  assert.equal(store.getActiveScene(), null);
  assert.deepEqual(view(store), { round: 0, current: null, order: [], mode: view(store).mode, ids: [] });
  const suspended = store.listSuspendedScenes();
  assert.equal(suspended.length, 1);
  assert.ok(suspended[0].participants.some(p => p.id === 'N'));
  assert.equal(store.listEncounters()[0].status, 'suspended');
  await store.resumeScene(suspended[0].id);
  assert.equal(store.listSuspendedScenes().length, 0);
  assert.equal(store.listEncounters()[0].status, 'active');
  assert.ok(view(store).ids.includes('N'));
  assert.equal(byId(store, 'N').extensions.v5.marqueur, 'conserve');
  assert.equal(byId(store, ids[1]).hp, 5);
  assert.equal(store.getCombat().round, 1);
});

test('C5 suspendActiveScene sans scène : erreur ; resumeScene inconnue : erreur', async () => {
  const store = await fixture({ current: 'A' });
  assert.throws(() => store.suspendActiveScene(), /Aucune scène active/);
  assert.throws(() => store.resumeScene('fantome'), /Scène suspendue introuvable/);
});

test('C5 deleteEncounter — purge lignes de dés (et cibles) des participants de la scène, journal de la rencontre, vide le combat ; le journal étranger reste', async () => {
  const { store, ids } = await sceneFixture();
  await store.addDiceLine({ id: 'own', participantId: ids[0], type: 'attack', attr: 'CC', base: 40 });
  await store.addDiceLine({ id: 'aimed', participantId: 'etranger', type: 'attack', attr: 'CC', base: 40, targetId: ids[1] });
  await store.log({ id: 'l-scene', kind: 'management', actorId: ids[0], actorName: 'Garde', text: 'dans la scène' });
  await store.log({ id: 'l-autre', kind: 'management', actorId: 'etranger', actorName: 'Autre', encounterId: 'autre-rencontre', text: 'hors scène' });
  await store.log({ id: 'l-orphelin', kind: 'management', actorId: 'etranger', actorName: 'Autre', text: 'écrit pendant la scène sans étiquette' });
  await store.deleteEncounter('rencontre');
  const state = full(store);
  assert.equal(store.getActiveScene(), null);
  assert.deepEqual(store.listEncounters(), []);
  assert.deepEqual(view(store).ids, []);
  assert.deepEqual(state.diceLines.map(l => l.id), ['aimed']);
  assert.equal(state.diceLines[0].targetId, null);
  assert.equal(state.log.some(e => e.text === 'dans la scène'), false);
  assert.equal(state.log.some(e => e.text === 'hors scène'), true, 'une entrée étiquetée d’une autre rencontre reste');
  assert.equal(state.log.some(e => /sans étiquette/.test(e.text)), false, 'toute entrée écrite pendant la scène est étiquetée de sa rencontre (tagNewEncounterLogs), donc purgée (surprenant)');
});

test('C5 deleteEncounter d’une rencontre non lancée : seule la rencontre part, le combat en cours est intact', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  await store.saveEncounter({ id: 'libre', title: 'Libre', entries: [] });
  const before = view(store);
  await store.deleteEncounter('libre');
  assert.deepEqual(store.listEncounters(), []);
  assert.deepEqual(view(store), before);
});

// ---------------------------------------------------------------- C6 : Undo / Redo / historique
test('C6 Undo/Redo en chaîne sur 3 commandes (ajout de N, retrait de B, passage en manuel) : état identique à chaque étape', async () => {
  const store = await fixture({ current: 'B' });
  const s0 = world(store);
  await summon(store, person('N', 50)); const s1 = world(store);
  await store.removeParticipant('B'); const s2 = world(store);
  await store.setOrderMode('manual'); const s3 = world(store);
  assert.deepEqual(view(store), { round: 1, current: 'C', order: ['A', 'C', 'N'], mode: 'manual', ids: ['A', 'C', 'N'] });
  assert.notDeepEqual(s1, s2); assert.notDeepEqual(s2, s3);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s3);
  assert.equal(await store.redo(), false, 'plus rien à rejouer');
  // Undo/Redo entremêlés
  await store.undo(); await store.undo(); await store.redo(); assert.deepEqual(world(store), s2);
});

test('C6 le journal est hors Undo/Redo : l’entrée « retiré B » survit à l’annulation du retrait', async () => {
  const store = await fixture({ current: 'B' });
  await store.removeParticipant('B');
  await store.undo();
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
  assert.match(full(store).log[0].text, /Combat: retiré B/);
  await store.redo();
  assert.equal(full(store).log.filter(e => /Combat: retiré B/.test(e.text)).length, 1, 'le Redo n’ajoute pas de doublon');
});

test('C6 Undo/Redo — la révision locale avance à chaque Undo/Redo, jamais en arrière', async () => {
  const store = await fixture({ current: 'B' }); await summon(store, person('N', 50));
  const r0 = store.getLocalRevision();
  await store.undo(); const r1 = store.getLocalRevision();
  await store.redo(); const r2 = store.getLocalRevision();
  assert.ok(r1 > r0); assert.ok(r2 > r1);
});

test('C6 une nouvelle commande après Undo purge le Redo', async () => {
  const store = await fixture({ current: 'B' });
  await summon(store, person('N', 50));
  await store.removeParticipant('B');
  await store.undo(); await store.undo();
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
  await store.updateParticipant('A', { hp: 7 });
  assert.equal(await store.redo(), false);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C'], 'N, annulé puis écrasé, ne revient pas');
  assert.equal(byId(store, 'A').hp, 7);
});

test('C6 Undo sans historique (rien après le chargement) : jamais d’exception, et on ne remonte pas avant le chargement', async () => {
  const store = await fixture({ current: 'B' });
  while (await store.undo());
  assert.equal(await store.undo(), false);
  assert.equal(await store.redo() === true, true, 'le chargement initial est lui-même une commande annulable');
});

test('C6 Undo d’un Tour V5 après ajout de N : retour à l’acteur et au turnIndex précédents', async () => {
  const store = await fixture({ current: 'A' }); await summon(store, person('N', 50));
  const before = world(store), ext = full(store).extensions.v5.turnIndex;
  await play(store, 'v5', 1);
  assert.equal(store.getCombat().currentActorId, 'N');
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.equal(full(store).extensions.v5.turnIndex, ext);
  assert.equal(full(store).extensions.v5.orderRound, undefined);
});

test('C6 historique pur — rognage à 50 commandes, le plus récent est conservé', () => {
  let history = createHistory();
  const command = i => ({ id: 'c' + i, type: 'x', inverse: { state: { i: i - 1 } }, result: { state: { i } } });
  for (let i = 1; i <= 60; i++) history = recordCommand(history, command(i));
  assert.equal(MAX_HISTORY_COMMANDS, 50);
  assert.equal(history.past.length, 50);
  assert.equal(history.past.at(-1).result.state.i, 60);
  assert.equal(history.past[0].result.state.i, 11);
});

test('C6 historique pur — rognage par octets (2 Mo) : les plus anciennes commandes partent d’abord ; une commande seule trop grosse est refusée', () => {
  assert.equal(DEFAULT_HISTORY_MAX_BYTES, 2 * 1024 * 1024);
  const blob = 'x'.repeat(400000);
  let history = createHistory();
  for (let i = 1; i <= 6; i++) history = recordCommand(history, { id: 'c' + i, type: 'x', inverse: { state: { i: i - 1 } }, result: { state: { i, blob } } });
  assert.ok(history.past.length < 6 && history.past.length >= 1);
  assert.equal(history.past.at(-1).result.state.i, 6);
  assert.ok(Buffer.byteLength(JSON.stringify(history.past)) <= DEFAULT_HISTORY_MAX_BYTES);
  assert.throws(() => recordCommand(createHistory(), { id: 'big', type: 'x', inverse: { state: {} }, result: { state: { blob: 'x'.repeat(2 * 1024 * 1024) } } }), /trop volumineuse/);
});

test('C6 Store — 60 commandes : seules les 50 dernières sont annulables, la 51e Undo renvoie false', async () => {
  const store = await fixture({ current: 'B' });
  for (let i = 1; i <= 60; i++) await store.updateParticipant('A', { hp: 1 + (i % 15) });
  let undone = 0;
  while (await store.undo()) undone++;
  assert.equal(undone, 50);
  assert.equal(byId(store, 'A').hp, 1 + (10 % 15), 'on s’arrête à l’état de la 10e commande');
  assert.equal(await store.undo(), false);
  let redone = 0;
  while (await store.redo()) redone++;
  assert.equal(redone, 50);
  assert.equal(byId(store, 'A').hp, 1 + (60 % 15));
});

test('C6 Store — participant volumineux (~100 Ko) : l’historique est rogné par octets, les plus anciennes commandes (dont l’ajout) ne sont plus annulables', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, person('N', 50, { notes: 'x'.repeat(100000), extensions: { v5: { blob: 'x'.repeat(100000) } } }));
  for (let i = 1; i <= 5; i++) await store.updateParticipant('A', { hp: 19 - i });
  let undone = 0;
  while (await store.undo()) undone++;
  assert.ok(undone < 7 && undone >= 1, `rognage par octets attendu, ${undone} Undo possibles`);
  assert.ok(view(store).ids.includes('N'), 'l’ajout de N, trop ancien, a été rogné : N reste après tous les Undo');
  assert.equal(byId(store, 'N').extensions.v5.blob.length, 100000);
});

test('C6 Store — une commande dont l’état dépasse 2 Mo est refusée, l’état reste celui d’avant', async () => {
  const store = await fixture({ current: 'A' });
  const before = world(store);
  await assert.rejects(async () => summon(store, person('N', 50, { notes: 'x'.repeat(1200000), extensions: { v5: { blob: 'x'.repeat(1200000) } } })), /trop volumineuse/);
  assert.deepEqual(world(store), before);
  assert.deepEqual(view(store).ids, ['A', 'B', 'C']);
});

test('C6 Store — un participant de 900 Ko ajouté puis une mise à jour (inverse + résultat > 2 Mo) : la mise à jour est refusée, l’état est intact', async () => {
  const store = await fixture({ current: 'A' });
  await summon(store, person('N', 50, { notes: 'x'.repeat(900000), extensions: { v5: { blob: 'x'.repeat(900000) } } }));
  const before = world(store);
  await assert.rejects(async () => store.updateParticipant('A', { hp: 3 }), /trop volumineuse/);
  assert.deepEqual(world(store), before);
  assert.equal(byId(store, 'A').hp, 20);
});
