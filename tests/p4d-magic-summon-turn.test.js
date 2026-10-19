// Tour des invocations MAGIQUES : une invocation dont la couche expire ne désigne jamais un mauvais acteur
// (ni Tour rejoué, ni Tour sauté). Un orphelin acteur courant (hors tête d'ordre) attend la commande suivante, comme sweepDivineSummons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { encounter, cast, inputFor, endTurn } from './helpers/lot3-domain-fixture.js';

const DAWN = c => ({ domainFacts: { ...inputFor(c).domainFacts, minutesToDawn: 1 } });
const json = store => JSON.parse(store.getFullJSON());
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const layersOf = (store, spellId) => store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === spellId).map(e => ({ ...e, holderId: p.id })));
const jumpTo = async (store, round, currentActorId) => {
  const state = json(store); state.combat.round = round; state.combat.currentActorId = currentActorId; await store.loadFromJSON(state);
};
const combatOf = store => json(store).combat;
const spellId = getSpellContract('Destrier d’Ombre').id;
async function destrier(extras = {}) {
  const env = await encounter(extras), c = getSpellContract('Destrier d’Ombre');
  await cast(env.store, c, DAWN(c));
  return { ...env, c, horse: auxOf(env.store)[0] };
}
// Joue un Tour avec le moteur V5 ou le chemin legacy ; renvoie « round:acteur ».
async function step(env, engineName) {
  if (engineName === 'v5') await endTurn(env.engine); else await env.store.nextTurn();
  const c = combatOf(env.store);
  return `${c.round}:${c.currentActorId}`;
}

for (const engineName of ['v5', 'legacy']) {
  test(`${engineName} : invocation prochain acteur à l’expiration — gardée courante, puis retirée ; ni rejeu du lanceur ni Tour sauté`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);                           // la monture entre dans l'ordre, courante
    await step(env, engineName); await step(env, engineName);
    await jumpTo(store, 7, 'mage');
    assert.deepEqual(combatOf(store).order, ['mage', horse.id, 'foe']);
    const before = json(store);
    assert.equal(await step(env, engineName), `7:${horse.id}`, 'la monture reste l’acteur désigné par le Tour');
    assert.equal(json(store).localRevision, before.localRevision + 1);
    assert.equal(layersOf(store, spellId).length, 0, 'la couche a expiré');
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id], 'orpheline mais courante : retirée à la commande suivante');
    assert.equal(json(store).extensions.v5.gameClock.combat.currentActorId, horse.id);
    assert.equal(await step(env, engineName), '7:foe', 'foe joue son Tour du Round 7');
    assert.equal(auxOf(store).length, 0);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : invocation qui n’est pas le prochain acteur — retirée aussitôt, l’ordre se déroule normalement`, async () => {
    const env = await destrier(), { store, horse } = env;       // foe I20 > monture : ordre mage, foe, monture
    await step(env, engineName);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe', horse.id]);
    await jumpTo(store, 7, 'mage');
    assert.equal(await step(env, engineName), '7:foe');
    assert.equal(auxOf(store).length, 0);
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : invocation courante dont la couche n’a pas expiré — son Tour ne la retire pas`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    await jumpTo(store, 7, horse.id);
    assert.equal(await step(env, engineName), '7:foe');
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  });

  test(`${engineName} : ordre manuel — monture placée juste après le lanceur, expiration sans rejeu`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    store.setOrderMode('manual');
    await store.moveInOrder(horse.id, 'foe');
    assert.equal(combatOf(store).orderMode, 'manual');
    await jumpTo(store, 7, 'mage');
    assert.deepEqual(combatOf(store).order, ['mage', horse.id, 'foe']);
    assert.equal(await step(env, engineName), `7:${horse.id}`);
    assert.equal(await step(env, engineName), '7:foe');
    assert.deepEqual(combatOf(store).order, ['mage', 'foe']);
    assert.equal(auxOf(store).length, 0);
    assert.equal(await step(env, engineName), '8:mage');
  });

  test(`${engineName} : Annuler / Rétablir autour de l’expiration — états identiques`, async () => {
    const env = await destrier({ foe: { initiative: 5 } }), { store, horse } = env;
    await step(env, engineName);
    await jumpTo(store, 7, 'mage');
    const s0 = combatOf(store);
    await step(env, engineName);
    const s1 = combatOf(store);
    await step(env, engineName);
    const s2 = combatOf(store);
    assert.equal(s1.currentActorId, horse.id); assert.equal(s2.currentActorId, 'foe');
    await store.undo(); assert.deepEqual(combatOf(store), s1);
    assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
    await store.undo(); assert.deepEqual(combatOf(store), s0);
    assert.equal(layersOf(store, spellId).length, 1);
    await store.redo(); assert.deepEqual(combatOf(store), s1);
    await store.redo(); assert.deepEqual(combatOf(store), s2);
  });
}

test('fin anticipée du sort alors que l’invocation n’est pas l’acteur courant : retirée aussitôt, acteur courant inchangé', async () => {
  const { store, c, horse } = await destrier({ foe: { initiative: 5 } });
  const [layer] = layersOf(store, c.id);
  assert.equal(combatOf(store).currentActorId, 'mage');
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  assert.equal(auxOf(store).length, 0);
  assert.equal(combatOf(store).currentActorId, 'mage');
  await store.undo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
});

test('deux lanceurs, deux montures dont chacune est tour à tour le prochain acteur à l’expiration : jamais de Tour faux', async () => {
  const env = await destrier({ foe: { initiative: 5 } }), { store, engine } = env;
  const state = json(store), mage2 = structuredClone(state.combat.participants.find(p => p.id === 'mage'));
  Object.assign(mage2, { id: 'mage2', name: 'mage2', initiative: 50 });
  state.combat.participants.push(mage2); state.combat.order = ['mage', 'mage2', 'foe'];
  await store.loadFromJSON(state);
  const c = getSpellContract('Destrier d’Ombre');
  await cast(store, c, { ...DAWN(c), actorId: 'mage2', targetIds: ['foe'] });
  const horses = auxOf(store).map(a => a.id);
  assert.equal(horses.length, 2);
  await endTurn(engine); await endTurn(engine);
  await jumpTo(store, 7, 'mage');
  const seq = [];
  for (let i = 0; i < 8; i++) { await endTurn(engine); const cb = combatOf(store); seq.push(`${cb.round}:${cb.currentActorId}`); }
  assert.equal(seq.filter(s => s.startsWith('7:') && s.endsWith(':mage')).length, 0, JSON.stringify(seq));
  assert.ok(seq.includes('7:foe'), JSON.stringify(seq));
  assert.equal(auxOf(store).length, 0);
  assert.ok(horses.every(id => !combatOf(store).order.includes(id)));
});

test('magie et divin simultanés : monture et loup expirent au même Tour du lanceur, chacun retiré sans Tour faux', async () => {
  const { getDivineContract, getAllDivineContracts } = await import('../js/core/v5-divine-store.js');
  const { default: registry } = await import('../js/data/v5-divine-contracts.json', { with: { type: 'json' } });
  const maskId = getAllDivineContracts().find(row => row.type === 'miracle' && row.name === 'Masque mortuaire').id;
  const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(maskId);
  const id = 'divine:miracle:morr:test-summon-p4d-r4';
  registry.contracts.push({ ...structuredClone(base), id, name: 'Essai invocation p4d', catalogueName: 'Essai invocation p4d', canonicalName: 'Test summon p4d', status: 'assisted',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
    effects: [{ appliesTo: 'caster', duration: { value: 6, unit: 'rounds' }, type: 'summon-creature', kind: 'creature', profile: 'wolf' }], targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] });
  try {
    const env = await destrier({ foe: { initiative: 5 } }), { store, engine, horse } = env;
    const state = json(store), mage = state.combat.participants.find(p => p.id === 'mage');
    mage.skills.push({ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 80 });
    mage.talents = [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }];
    mage.prayers = [{ name: 'Essai invocation p4d', status: 'resolved' }];
    mage.extensions.v5.divine = { sin: 0 };
    state.combat.round = 2;                                // le loup (6 Rounds) expire alors au Round 7, comme la monture
    await store.loadFromJSON(state);
    const preview = store.previewDivineExecution(id, { actorId: 'mage', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 7, actorId: 'mage' } });
    assert.equal(preview.ready, true, preview.error);
    assert.equal((await store.applyDivineExecution(id, { preview })).ready, true);
    const wolf = store.listParticipants().find(p => p.extensions?.v5?.divineSummon);
    assert.ok(wolf);
    await jumpTo(store, 7, 'mage');
    const seq = [];
    for (let i = 0; i < 6; i++) {
      await endTurn(engine);
      const cb = combatOf(store); seq.push(`${cb.round}:${cb.currentActorId}`);
      const orphan = store.listParticipants().filter(p => p.extensions?.isAuxiliary || p.extensions?.v5?.divineSummon).map(p => p.id);
      assert.ok(orphan.every(pid => pid === cb.currentActorId || !seq.length), JSON.stringify(seq) + orphan);
      if (cb.round === 8) break;
    }
    assert.equal(seq.filter(s => s.startsWith('7:') && s.endsWith(':mage')).length, 0, JSON.stringify(seq));
    assert.ok(seq.includes('7:foe'), JSON.stringify(seq));
    assert.equal(seq.at(-1), '8:mage');
    assert.ok(![horse.id, wolf.id].some(pid => store.listParticipants().some(p => p.id === pid)));
  } finally { registry.contracts = registry.contracts.filter(row => row.id !== id); }
});
