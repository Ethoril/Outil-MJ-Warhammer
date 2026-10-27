import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { describeEffectResult, summonLayerLabel, buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput } from '../js/ui/v5-divine-form-model.js';

// P4c B2 : les trois miracles qui invoquent (Hurlement du loup, Roi de la Nature, Œil de l'aigle), contre les VRAIS contrats régénérés.
const clone = value => structuredClone(value);
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf', KING = 'divine:miracle:taal:king-of-the-wild', EAGLE = 'divine:miracle:il-de-l-aigle';
const FROST = 'divine:miracle:ulric:hoarfrost-s-chill';

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: ['Ulric', 'Taal', 'Myrmidia'].map(specialization => ({ id: 'talent-invoke', status: 'resolved', rank: 1, specialization })),
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const world = store => { const v = stateOf(store); return { combat: v.combat, diceLines: v.diceLines, extensions: v.extensions }; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const summoned = store => store.listParticipants().filter(row => row.extensions?.v5?.divineSummon);
const layersOf = store => (person(store, 'priest')?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'summon-creature');
async function fixture({ soc = 60 } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60, { caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: soc, M: 4 } }), actor('ally', 30), actor('foe', 20, { camp: 'ennemi' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = (round = 6) => ({ phase: 'endOfTurn', round, actorId: 'priest' });
// Le moteur exige une cible explicite pour une portée chiffrée : le prêtre lui-même (les effets d'invocation retombent toujours sur lui).
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } }, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, ...more });
async function cast(store, contractId, more = {}) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const castHowl = (store, more) => cast(store, HOWL, { expiry: expiry(), ...more });
const castKing = (store, more) => cast(store, KING, { summon: { beastKey: 'giant-spider', position: 'au pied du prêtre' }, ...more });
const castEagle = (store, more) => cast(store, EAGLE, { expiry: expiry(), ...more });

test('contrats : les trois miracles passent de manual à assisted avec un effet summon-creature et des clauses engine + rappels', () => {
  const howl = getDivineContract(HOWL), king = getDivineContract(KING), eagle = getDivineContract(EAGLE);
  assert.deepEqual([howl, king, eagle].map(row => row.status), ['assisted', 'assisted', 'assisted']);
  assert.deepEqual([howl, king, eagle].map(row => row.effects.map(effect => [effect.type, effect.kind, effect.appliesTo])),
    [[['summon-creature', 'creature', 'caster']], [['summon-creature', 'creature', 'caster']], [['summon-creature', 'sensor', 'caster']]]);
  assert.deepEqual(howl.effects[0].overrides, { caracs: { CC: 45, FM: 35 }, size: 'large', traits: ['Magique', 'Frénésie'], recomputeWounds: true });
  assert.equal(howl.effects[0].profile, 'wolf');
  assert.deepEqual([king.effects[0].choice, king.effects[0].requiresPosition, king.params.duration.unit], ['beast', true, 'minutes']);
  assert.deepEqual(eagle.effects[0].traits, ['Perception 55', 'Sens aiguisé (Vue)', 'Vol (80)', 'Intangible', 'Invulnérable']);
  for (const contract of [howl, king, eagle]) {
    const modes = Object.fromEntries(contract.clauses.map(row => [row.id, row.mode]));
    assert.ok(Object.values(modes).includes('engine'), contract.id);
    assert.ok(Object.values(modes).includes('manual'), contract.id);
  }
  assert.equal(eagle.clauses.find(row => row.id === 'eagle-sight').mode, 'manual');
});

test('Hurlement du loup : le loup apparaît avec le profil du bestiaire et les valeurs de la source, camp du prêtre, hors ordre inchangé', async () => {
  const store = await fixture(), before = stateOf(store);
  const { preview, result } = await castHowl(store);
  const [wolf] = summoned(store);
  assert.equal(summoned(store).length, 1);
  assert.equal(wolf.name, 'Loup'); assert.equal(wolf.camp, 'pj'); assert.equal(wolf.zone, 'active');
  assert.equal(wolf.caracs.CC, 45); assert.equal(wolf.caracs.FM, 35);
  assert.equal(wolf.maxHp, 24); assert.equal(wolf.hp, 24);
  for (const trait of ['Bestial', 'Magique', 'Frénésie', 'Taille (Grande)']) assert.ok(wolf.traits.includes(trait), trait);
  assert.deepEqual(wolf.actions.map(row => row.base), [55, 55]);
  assert.equal(wolf.actions[1].damageFormula, 'BF+3', 'Morsure +6 du bestiaire');
  assert.equal(wolf.extensions.v5.divineSummon.contractId, HOWL);
  assert.equal(wolf.extensions.isAuxiliary, true); assert.equal(wolf.extensions.casterId, 'priest');
  assert.deepEqual(stateOf(store).combat.order, before.combat.order);
  assert.equal(layersOf(store).length, 1);
  assert.deepEqual(layersOf(store)[0].expiry, expiry());
  // aperçu = application : même profil figé
  const line = describeEffectResult(preview.projectedEffects[0], { contract: getDivineContract(HOWL), participants: store.listParticipants() });
  assert.match(line, /Loup \(profil wolf\) · 24 Blessure\(s\)/);
  assert.equal(describeEffectResult(result.receipt.effectReceipts[0], {}), line);
});

test('Invocation de Prière au Round 0 après le tirage — initiative automatique et rang selon le score', async () => {
  const store = await fixture();
  const snapshot = stateOf(store);
  snapshot.combat.round = 0;
  for (const [id, die, characteristic] of [['priest', 10, 50], ['ally', 1, 30], ['foe', 1, 20]]) {
    const participant = snapshot.combat.participants.find(row => row.id === id);
    participant.extensions.v5.combatInitiative = { die, characteristic, bonus: Math.floor(characteristic / 10), score: die + Math.floor(characteristic / 10), initialized: true };
  }
  snapshot.extensions.v5.combatInitiativeInitialized = true;
  snapshot.extensions.v5.combatInitiativeResolution = { order: [...snapshot.combat.order] };
  await store.loadFromJSON(snapshot);
  await castHowl(store);
  const wolf = summoned(store)[0];
  const initiative = wolf.extensions.v5.combatInitiative;
  assert.ok(initiative.die >= 1 && initiative.die <= 10);
  assert.equal(initiative.characteristic, wolf.caracs.I);
  assert.equal(initiative.score, initiative.die + Math.floor(wolf.caracs.I / 10));
  assert.equal(initiative.initialized, true);
  const rows = store.listParticipants().filter(row => row.zone === 'active');
  const expected = [...rows].sort((a, b) => b.extensions.v5.combatInitiative.score - a.extensions.v5.combatInitiative.score).map(row => row.id);
  assert.deepEqual(store.getCombat().order, expected);
});

test('Hurlement du loup : fin de prière retire le loup et la couche ; Undo puis Redo restituent exactement', async () => {
  const store = await fixture();
  const s0 = world(store);
  const { result } = await castHowl(store);
  const s1 = world(store);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s1);
  assert.equal(summoned(store).length, 1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(summoned(store).length, 0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(summoned(store)[0].caracs.CC, 45);
});

test('Hurlement du loup : à l’échéance en Rounds le loup disparaît avec la couche', async () => {
  const store = await fixture({ soc: 20 });
  await castHowl(store, { expiry: expiry(2) });
  assert.equal(summoned(store).length, 1);
  for (let i = 0; i < 12 && summoned(store).length; i++) await store.nextTurn();
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
});

test('Roi de la Nature : sans bête ni position l’aperçu est refusé, hors liste aussi ; la bête choisie est créée', async () => {
  const store = await fixture();
  const blocked = store.previewDivineExecution(KING, input());
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.needsInput.map(row => row.field), ['summon.beastKey', 'summon.position']);
  assert.equal(store.previewDivineExecution(KING, input({ summon: { beastKey: 'dragon', position: 'ici' } })).ready, false);
  assert.equal(store.previewDivineExecution(KING, input({ summon: { beastKey: 'wolf', position: ' ' } })).ready, false);
  assert.equal(summoned(store).length, 0);
  const { result } = await castKing(store);
  const [spider] = summoned(store);
  assert.equal(spider.extensions.v5.divineSummon.profileKey, 'giant-spider');
  assert.equal(spider.name, 'Araignée géante');
  assert.equal(spider.notes, 'Position : au pied du prêtre');
  assert.equal(result.receipt.effectReceipts[0].result.profileKey, 'giant-spider');
  assert.equal(layersOf(store).length, 1);
});

test('Roi de la Nature : durée en minutes (horloge de campagne), l’animal disparaît à l’échéance ; Undo le restitue', async () => {
  const store = await fixture();
  await castKing(store, { summon: { beastKey: 'horse', position: 'devant' } });
  const [layer] = layersOf(store);
  assert.deepEqual(layer.deadline, { kind: 'campaign-time', atSeconds: 360 }, 'Bonus de Sociabilité 6 minutes');
  assert.equal((await store.advanceCampaignTime({ seconds: 359, reason: 'Temps MJ' })).status, 'applied');
  assert.equal(summoned(store).length, 1);
  const before = world(store);
  assert.equal((await store.advanceCampaignTime({ seconds: 1, reason: 'Temps MJ' })).status, 'applied');
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(await store.undo(), true);
  assert.deepEqual(world(store), before);
  assert.equal(summoned(store).length, 1);
});

test('Œil de l’aigle : capteur hors de l’ordre, au banc, sans initiative, invulnérable, avec Perception 55, Sens aiguisé (Vue), Vol 80', async () => {
  const store = await fixture(), before = stateOf(store);
  const { preview } = await castEagle(store);
  const [eagle] = summoned(store);
  assert.equal(eagle.name, 'Aigle spectral'); assert.equal(eagle.zone, 'bench');
  assert.deepEqual(eagle.traits, ['Perception 55', 'Sens aiguisé (Vue)', 'Vol (80)', 'Intangible', 'Invulnérable']);
  assert.equal(eagle.extensions.sensor, true);
  assert.equal(eagle.extensions.v5.divineSummon.kind, 'sensor');
  assert.equal(eagle.maxHp, null); assert.deepEqual(eagle.actions, []);
  assert.deepEqual(stateOf(store).combat.order, before.combat.order, 'aucun participant dans l’ordre');
  assert.equal(stateOf(store).combat.currentActorId, 'priest');
  assert.match(describeEffectResult(preview.projectedEffects[0], {}), /^Invocation : Aigle spectral, capteur hors de l’ordre du combat, invulnérable$/);
});

test('Œil de l’aigle : Undo et Redo, puis fin à l’échéance', async () => {
  const store = await fixture();
  const s0 = world(store);
  await castEagle(store);
  const s1 = world(store);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0); assert.equal(summoned(store).length, 0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1); assert.equal(summoned(store).length, 1);
  for (let i = 0; i < 30 && summoned(store).length; i++) await store.nextTurn();
  assert.equal(summoned(store).length, 0);
});

test('une prière sans invocation laisse l’état exempt de toute créature ou couche d’invocation', async () => {
  const store = await fixture();
  await cast(store, FROST, { targetIds: ['foe'], facts: undefined, expiry: expiry() });
  assert.equal(summoned(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(stateOf(store).combat.participants.length, 3);
});

test('formulaire : le choix de la bête et la position viennent des inputFields, et la ligne « Prières actives » nomme l’invocation', async () => {
  const store = await fixture();
  const contract = getDivineContract(KING), priest = person(store, 'priest');
  const form = emptyDivineForm();
  const model = buildDivineForm(contract, { actor: priest, targets: [], form, choices: { effect: 0 } });
  const beast = model.effectFields.find(row => row.path.join('.') === 'summon.beastKey'), position = model.effectFields.find(row => row.path.join('.') === 'summon.position');
  assert.deepEqual([beast.kind, beast.options.length, beast.options[0]], ['select', 7, ['', 'À préciser']]);
  assert.equal(position.kind, 'text');
  setFieldValue(form, beast, 'boar'); setFieldValue(form, position, 'sous le chêne');
  assert.deepEqual(toEngineInput(form, { targetIds: [], contract, actor: priest }).summon, { beastKey: 'boar', position: 'sous le chêne' });
  assert.equal(buildDivineForm(getDivineContract(HOWL), { actor: priest, form: emptyDivineForm() }).effectFields.filter(row => row.path.join('.').startsWith('summon')).length, 0);
  await castKing(store, { summon: { beastKey: 'boar', position: 'sous le chêne' } });
  const [layer] = layersOf(store);
  assert.equal(summonLayerLabel(layer, store.listParticipants()), 'Invocation : Sanglier');
  assert.equal(summonLayerLabel({ ...layer, summon: { kind: 'sensor' } }, []), 'Invocation : capteur');
  assert.equal(summonLayerLabel({ type: 'grant-trait' }, []), null);
});
