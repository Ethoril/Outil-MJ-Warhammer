// Fuzz d'invariants du Tour avec invocations MAGIQUES : séquences déterministes (graines) mêlant lancements, fins de Tour (moteur V5 et
// legacy), fin anticipée, retrait manuel, sauts vers l'échéance et Annuler/Rétablir. FUZZ_SEEDS / FUZZ_STEPS élargissent le balayage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { encounter, cast, inputFor, endTurn } from './helpers/lot3-domain-fixture.js';

const SEEDS = Number(process.env.FUZZ_SEEDS || 30), STEPS = Number(process.env.FUZZ_STEPS || 14);
const json = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const rng = seed => { let a = seed * 2654435761 >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const DESTRIER = getSpellContract('Destrier d’Ombre');
const DAWN = { domainFacts: { ...inputFor(DESTRIER).domainFacts, minutesToDawn: 1 } };
const view = store => { const s = json(store); return { s, c: s.combat, ids: new Set(s.combat.participants.map(p => p.id)) }; };
const orphans = c => c.participants.filter(p => {
  const v = p.extensions?.v5; if (!v?.summonCastExecutionId) return false;
  const owner = c.participants.find(x => x.id === v.summonOwnerId);
  return !owner?.extensions?.v5?.spellEffects?.some(e => e.castExecutionId === v.summonCastExecutionId && e.spellId === v.summonedBySpellId);
}).map(p => p.id);

function checkState(label, store) {
  const { c, ids } = view(store);
  assert.ok(c.currentActorId === null || ids.has(c.currentActorId), `${label} : acteur courant inconnu ${c.currentActorId}`);
  for (const id of c.order) assert.ok(ids.has(id), `${label} : ordre contient un absent ${id}`);
  const stray = orphans(c).filter(id => id !== c.currentActorId);
  assert.deepEqual(stray, [], `${label} : invocation orpheline hors acteur courant`);
  const clock = json(store).extensions?.v5?.gameClock?.combat;
  if (clock) { assert.equal(clock.currentActorId, c.currentActorId, `${label} : horloge/acteur`); assert.equal(clock.round, c.round, `${label} : horloge/round`); }
}

// Un Tour ne rejoue ni ne saute : le nouvel acteur suit l'ancien dans l'ordre d'avant, les absents entre les deux ayant été retirés.
function checkTurn(label, before, after) {
  const a = before.c, b = after.c;
  if (!a.currentActorId || !b.currentActorId) return;
  // Le chemin legacy recalcule l'ordre à chaque Tour (C4) : la comparaison n'a de sens que si l'ordre relatif des survivants est conservé.
  const kept = a.order.filter(id => b.order.includes(id)), now = b.order.filter(id => kept.includes(id));
  if (kept.join() !== now.join()) return;
  const old = a.order.indexOf(a.currentActorId);
  if (b.round === a.round) {
    const at = a.order.indexOf(b.currentActorId);
    if (at === -1) return;                                   // entrée dans l'ordre pendant le Tour : pas comparable
    assert.ok(at > old, `${label} : Tour rejoué (${a.currentActorId} -> ${b.currentActorId}, ordre ${a.order})`);
    for (const id of a.order.slice(old + 1, at)) assert.ok(!after.ids.has(id), `${label} : Tour sauté ${id}`);
  } else {
    assert.equal(b.round, a.round + 1, `${label} : round`);
    assert.equal(b.currentActorId, b.order[0] ?? b.currentActorId, `${label} : le Round ne s'ouvre pas sur la tête de l'ordre`);
    for (const id of a.order.slice(old + 1)) assert.ok(!after.ids.has(id) || id === b.currentActorId, `${label} : fin de Round sautée ${id}`);
  }
}

async function run(seed) {
  const rand = rng(seed), pick = list => list[Math.floor(rand() * list.length)];
  const env = await encounter({ foe: { initiative: pick([5, 20, 45, 70]) }, mage: { initiative: pick([60, 10, 30]) } }), { store, engine } = env;
  const mage2 = json(store).combat.participants.find(p => p.id === 'mage');
  const state = json(store);
  state.combat.participants.push({ ...structuredClone(mage2), id: 'mage2', name: 'mage2', initiative: pick([50, 25, 3]) });
  state.combat.order = ['mage', 'mage2', 'foe'].sort((x, y) => state.combat.participants.find(p => p.id === y).initiative - state.combat.participants.find(p => p.id === x).initiative);
  state.combat.currentActorId = state.combat.order[0];
  await store.loadFromJSON(state);
  const log = [];
  for (let i = 0; i < STEPS; i++) {
    const before = view(store), op = pick(['cast', 'end', 'end', 'end', 'legacy', 'legacy', 'early', 'remove', 'jump', 'jump', 'undoredo']);
    const label = `graine ${seed} pas ${i} ${op} [${log.join(' ')}]`;
    log.push(op);
    let changed = true;
    try {
      if (op === 'cast') {
        const caster = pick(['mage', 'mage2']);
        const input = { ...DAWN, actorId: caster, targetIds: ['foe'] };
        const preview = store.previewSpellExecution(DESTRIER.id, inputFor(DESTRIER, input));
        if (!preview.ready) changed = false; else { const r = await store.applySpellExecution(DESTRIER.id, inputFor(DESTRIER, input)); if (r?.ok === false) changed = false; }
      } else if (op === 'end') await endTurn(engine);
      else if (op === 'legacy') await store.nextTurn();
      else if (op === 'early') {
        const layers = store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === DESTRIER.id));
        if (!layers.length) changed = false; else await store.applySpellInteraction({ effectId: pick(layers).id, targetId: 'foe', kind: 'end' });
      } else if (op === 'remove') {
        const aux = auxOf(store);
        if (!aux.length) changed = false; else await store.removeParticipant(pick(aux).id);
      } else if (op === 'jump') {
        const layers = store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === DESTRIER.id));
        if (!layers.length) changed = false; else { const l = pick(layers), s = json(store); s.combat.round = l.expiresAtRound; s.combat.currentActorId = l.casterId; await store.loadFromJSON(s); changed = false; }
      } else if (op === 'undoredo') {
        const here = json(store);
        if (await store.undo()) { checkState(label + ' (après undo)', store); assert.equal(await store.redo(), true); assert.deepEqual(json(store).combat, here.combat, label + ' : Rétablir'); }
        changed = false;
      }
    } catch (error) { if (/déjà appliquée|requis|refus/i.test(error.message)) changed = false; else throw error; }
    checkState(label, store);
    if (op === 'end' || op === 'legacy') checkTurn(label, before, view(store));
    if (changed) {
      const after = json(store);
      if (await store.undo()) {
        assert.deepEqual(json(store).combat, before.s.combat, label + ' : Annuler');
        assert.equal(await store.redo(), true);
        assert.deepEqual(json(store).combat, after.combat, label + ' : Rétablir');
      }
    }
  }
}

test(`fuzz Tour et invocations magiques : ${SEEDS} graines x ${STEPS} pas`, async () => {
  for (let seed = 1; seed <= SEEDS; seed++) await run(seed);
});
