import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { availableV5TalentActions } from '../js/core/v5-talent-actions.js';

// P5 — Fureur d'Ulric (Livre de base V5 p.228) : l'allié désigné gagne Frénésie ; au lieu de l'attaque gratuite,
// la Frénésie ajoute +1d10 Dégâts (d10 explosif : sur 10, relancer et ajouter) au premier coup de mêlée de chacun
// de ses Tours. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const FURY = 'divine:miracle:ulric:ulric-s-fury';
const clone = value => structuredClone(value);
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priest = () => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } } });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const furyLayer = store => (person(store, 'ally').extensions?.v5?.divineEffects || []).find(layer => layer?.frenzyFury);
async function fixture({ allyTalents = [] } = {}) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'ally', order: ['priest', 'ally', 'foe'],
    participants: [priest(), fighter('ally', { kind: 'PJ', camp: 'pj', initiative: 40, talents: allyTalents }), fighter('foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'fury' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(FURY, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0 }, facts: { targets: { ally: { ally: true, withinRange: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(FURY, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
async function enterFrenzy(store, actorId, resolutionId) {
  const raw = { resolutionId, actorId, action: { type: 'skill', attr: 'FM', base: 50 }, roll: 20, v5: { kind: 'test', context: { talentAction: 'frenzy' } } };
  const applied = await store.applyResolution(store.previewResolution(raw));
  assert.equal(applied.status, 'applied');
}
const melee = (id, extra = {}) => ({ resolutionId: id, actorId: 'ally', targetId: 'foe', action: { type: 'attack', base: 60, attr: 'CC', damage: 5 },
  roll: 24, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, ...extra });
const FURY_MESSAGE = 'Fureur d’Ulric : saisir le d10 de dégâts (relancer et ajouter sur 10).';

test('Fureur d’Ulric : contrat assisté, l’allié gagne Frénésie et la couche, l’action « Entrer en Frénésie » est disponible', async () => {
  assert.notEqual(getDivineContract(FURY).status, 'manual');
  assert.equal(getDivineContract(FURY).status, 'assisted');
  assert.deepEqual(getDivineContract(FURY).effects.map(effect => ({ type: effect.type, talents: effect.talents })), [
    { type: 'grant-talent', talents: [{ id: 'talent-frenzy', rank: 1 }] },
    { type: 'frenzy-fury', talents: undefined }]);
  const store = await fixture();
  const result = await invoke(store);
  const ally = person(store, 'ally');
  assert.ok(ally.talents.some(row => row.id === 'talent-frenzy'), 'le Talent Frénésie est injecté');
  const layer = furyLayer(store);
  assert.ok(layer, 'la couche frenzyFury est posée sur l’allié');
  assert.deepEqual(layer.frenzyFury, { lastTurnId: null });
  assert.ok(availableV5TalentActions(ally).some(row => row.id === 'activate:frenzy'), 'l’action Entrer en Frénésie est disponible');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.ok(!person(store, 'ally').talents.some(row => row.id === 'talent-frenzy'), 'fin de prière : Talent retiré');
  assert.ok(!furyLayer(store), 'fin de prière : couche retirée');
});

test('Fureur d’Ulric : l’attaque gratuite de Frénésie est refusée pour le porteur de la couche', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  const free = melee('free', { v5: { kind: 'melee', extraAttack: true, context: { freeAttackTalent: 'frenzy' } } });
  assert.throws(() => store.previewResolution(free), /Fureur d’Ulric : la Frénésie ajoute 1d10 Dégâts au premier coup au lieu de l’attaque gratuite\./);
});

test('Fureur d’Ulric : +1d10 explosif au premier coup de mêlée du Tour, une seule fois, puis au Tour suivant ; Undo', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  const baselineStore = await fixture({ allyTalents: [{ id: 'talent-frenzy', status: 'resolved', rank: 1 }] });
  await enterFrenzy(baselineStore, 'ally', 'baseline-frenzy');
  const baseline = baselineStore.previewResolution(melee('base')).damage;
  const first = store.previewResolution(melee('first', { v5: { kind: 'melee', context: { ulricFuryDice: [10, 4] } } }));
  assert.equal(first.damage.talentDamage, baseline.talentDamage + 14, '+10 puis +4 = +14 Dégâts');
  const appliedFirst = await store.applyResolution(first); assert.equal(appliedFirst.status, 'applied', JSON.stringify(appliedFirst.reason ?? appliedFirst.error ?? appliedFirst.message));
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, 'fury:1:ally', 'la couche enregistre le Tour du coup');
  await store.undo();
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, null, 'Undo restaure lastTurnId');
  await store.redo();
  assert.equal(furyLayer(store).frenzyFury.lastTurnId, 'fury:1:ally');
  const second = store.previewResolution(melee('second'));
  assert.ok(!second.unresolved.some(row => row.includes('Fureur d’Ulric')), 'second coup du même Tour : rien à saisir');
  assert.equal(second.damage.talentDamage, baseline.talentDamage, 'aucun bonus supplémentaire ce Tour');
  const state = JSON.parse(store.getFullJSON()); state.extensions.v5.turnIndex = 2; await store.loadFromJSON(state);
  const nextTurn = store.previewResolution(melee('next-turn'));
  assert.ok(nextTurn.unresolved.some(row => row === FURY_MESSAGE), 'au Tour suivant, le d10 est redemandé');
});

test('Fureur d’Ulric : séquences de dés invalides ou absentes non applicables', async () => {
  const store = await fixture();
  await invoke(store);
  await enterFrenzy(store, 'ally', 'ally-frenzy');
  for (const dice of [[4, 10], [11], []]) {
    const preview = store.previewResolution(melee('invalid-' + dice.join('-'), { v5: { kind: 'melee', context: { ulricFuryDice: dice } } }));
    assert.ok(preview.unresolved.some(row => row === FURY_MESSAGE), JSON.stringify(dice) + ' : saisie refusée');
    assert.equal((await store.applyResolution(preview)).status, 'manual');
  }
  const missing = store.previewResolution(melee('missing'));
  assert.ok(missing.unresolved.some(row => row === FURY_MESSAGE), 'sans saisie : d10 demandé');
});

test('Fureur d’Ulric : hors Frénésie, rien n’est demandé et aucun bonus ne s’applique', async () => {
  const store = await fixture();
  await invoke(store);
  const calm = store.previewResolution(melee('calm'));
  assert.ok(!calm.unresolved.some(row => row.includes('Fureur d’Ulric')), 'hors Frénésie : rien à saisir');
  assert.equal(calm.damage.talentDamage ?? 0, 0);
});
