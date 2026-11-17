// L7 des miracles narratifs : transferts de Dégâts. Valeurs relues : Martyr (LdB V5 p.226 : tous les Dégâts de la cible sont subis par le
// prêtre, dont le Bonus d'Endurance est augmenté de son Bonus de Sociabilité), Retour à l'envoyeur (Deft Steps p.25 : plus faible et plus
// fort comparés sur CC, F, E ; les Blessures d'une attaque du plus fort s'ajoutent à la prochaine attaque du plus faible qui le blesse),
// Jugement du Roi de la neige (LdB V5 p.228) : redirect-stunned reste un rappel, figée en manual par prieres-benedictions.test.js (CA7).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.canonicalName === name).id;
const MARTYR = idOf('Martyr'), ECHO = idOf('Back at You'), JUDGEMENT = idOf('The Snow King\'s Judgement');
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;

const caracs = (more = {}) => ({ CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4, ...more });
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 20, maxHp: 30, caracs: caracs(),
  skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
// Prêtre d'E 30 (BE 3) et de Soc 40 (BSoc 4) : absorption de Martyr 7, durée 4 Rounds (échéance fin du Round 4).
const priest = (cult, extra = {}) => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });

async function open(participants) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: participants[0].id, order: participants.map(row => row.id), participants },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const layersOf = (store, id) => who(store, id).extensions?.v5?.divineEffects || [];
const castInput = (targetIds, more = {}) => ({ actorId: 'priest', targetIds, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: Object.fromEntries(targetIds.map(id => [id, { withinRange: true }])) }, expiry: { phase: 'endOfRound', round: 4 }, ...more });
async function cast(store, contractId, request) {
  const preview = store.previewDivineExecution(contractId, request);
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Mêlée : l'attaquant touche (25 contre 60), le défenseur rate (80 contre 30) ; arme à 5 Dégâts.
const melee = (id, actorId, targetId) => ({ resolutionId: id, actorId, targetId, action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, roll: 25,
  defense: { base: 30, roll: 80, damage: 5, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', context: {} } });
async function strike(store, id, actorId, targetId) {
  const preview = store.previewResolution(melee(id, actorId, targetId));
  assert.ok(preview.damage, JSON.stringify(preview.unresolved));
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify(applied.reason || preview.unresolved));
  return preview;
}
const rawOf = damage => damage.net + damage.absorption;

describe('L7 — contrats et grammaire', () => {
  test('Martyr et Retour à l’envoyeur passent assisted ; redirect-stunned reste un rappel ; types inconnus refusés', () => {
    assert.equal(getDivineContract(MARTYR).status, 'assisted');
    assert.deepEqual(getDivineContract(MARTYR).effects.map(({ type, toughnessBonusFrom }) => ({ type, toughnessBonusFrom })), [{ type: 'damage-transfer', toughnessBonusFrom: 'Soc' }]);
    assert.equal(modeOf(MARTYR, 'damage-transfer'), 'engine');
    assert.equal(modeOf(MARTYR, 'toughness-add'), 'engine');
    assert.equal(modeOf(MARTYR, 'other-damage'), 'manual');
    assert.equal(getDivineContract(ECHO).status, 'assisted');
    assert.deepEqual(getDivineContract(ECHO).effects.map(({ type, compare }) => ({ type, compare })), [{ type: 'wound-echo', compare: ['CC', 'F', 'E'] }]);
    assert.equal(modeOf(ECHO, 'weaker-stronger'), 'engine');
    assert.equal(modeOf(ECHO, 'echo-wounds'), 'engine');
    assert.equal(modeOf(JUDGEMENT, 'redirect-stunned'), 'manual');
    assert.equal(validateEffect({ type: 'damage-transfer' }), null);
    assert.match(validateEffect({ type: 'damage-transfer', toughnessBonusFrom: 'XX' }), /toughnessBonusFrom/);
    assert.match(validateEffect({ type: 'wound-echo', compare: ['CC', 'F'] }), /compare/);
    assert.match(validateEffect({ type: 'damage-redirect' }), /non pris en charge/);
  });
});

describe('L7 — Martyr', () => {
  const scene = () => [priest('Shallya'), fighter('ward', { camp: 'pj', kind: 'PJ', initiative: 40 }), fighter('foe', { initiative: 30, caracs: caracs({ CC: 60 }) })];

  test('le coup sur la cible protégée est subi par le prêtre (BE + BSoc), la cible intacte ; journal ; ↶ et ↷', async () => {
    const control = await open(scene());
    const reference = await strike(control.store, 'ctl-1', 'foe', 'ward');
    const raw = rawOf(reference.damage);
    assert.equal(who(control.store, 'ward').hp, 20 - (raw - 3), 'sans Martyr : la cible perd Dégâts − BE');

    const { store } = await open(scene());
    await cast(store, MARTYR, castInput(['ward']));
    const layer = layersOf(store, 'ward').find(row => row.damageTransfer);
    assert.deepEqual(layer.damageTransfer, { toId: 'priest', toughnessBonusFrom: 'Soc' });
    const preview = await strike(store, 'mar-1', 'foe', 'ward');
    assert.equal(preview.damageTransfer.toId, 'priest');
    assert.equal(preview.damageTransfer.rawDamage, raw);
    assert.equal(preview.damageTransfer.absorption, 7);
    assert.equal(preview.damageTransfer.wounds, raw - 7);
    assert.equal(who(store, 'ward').hp, 20, 'la cible ne perd aucune Blessure');
    assert.equal(who(store, 'priest').hp, 20 - (raw - 7));
    assert.ok(full(store).log.some(row => /Martyr/.test(row.text) && /priest/.test(row.text)), 'journal des deux');
    await store.undo();
    assert.equal(who(store, 'ward').hp, 20);
    assert.equal(who(store, 'priest').hp, 20, 'un seul ↶');
    await store.redo();
    assert.equal(who(store, 'priest').hp, 20 - (raw - 7));
  });

  test('prêtre à 0 Blessure : Blessures plafonnées à 0, pas de mort posée, rappel du Critique', async () => {
    const participants = scene();
    participants[0].hp = 2;
    const { store } = await open(participants);
    await cast(store, MARTYR, castInput(['ward']));
    const preview = await strike(store, 'mar-2', 'foe', 'ward');
    assert.equal(who(store, 'priest').hp, 0);
    assert.notEqual(who(store, 'priest').extensions?.v5?.dead, true);
    assert.equal(who(store, 'ward').hp, 20);
    assert.ok(preview.reminders.some(text => /Martyr/.test(text) && /Critique/.test(text)), JSON.stringify(preview.reminders));
  });

  test('expiration : à la fin de la durée, le coup frappe de nouveau la cible', async () => {
    const { store, engine } = await open(scene());
    await cast(store, MARTYR, castInput(['ward']));
    for (let i = 0; i < 12; i += 1) assert.equal((await engine.nextTurn()).status, 'applied');
    assert.equal(full(store).combat.round, 5);
    assert.equal(layersOf(store, 'ward').some(row => row.damageTransfer), false);
    const preview = await strike(store, 'mar-3', 'foe', 'ward');
    assert.equal(preview.damageTransfer, undefined);
    assert.equal(who(store, 'priest').hp, 20);
    assert.ok(who(store, 'ward').hp < 20);
  });

  test('résultat sans couche de transfert : identique, même quand un autre participant est protégé (CA7)', async () => {
    const plain = await open(scene());
    const before = await strike(plain.store, 'ca7-1', 'ward', 'foe');
    const { store } = await open(scene());
    await cast(store, MARTYR, castInput(['ward']));
    const after = await strike(store, 'ca7-1', 'ward', 'foe');
    for (const key of ['damage', 'critical', 'momentum', 'reminders', 'unresolved']) assert.deepEqual(after[key], before[key], key);
    assert.equal(Object.hasOwn(after, 'damageTransfer'), false);
    assert.equal(Object.hasOwn(after, 'woundEcho'), false);
    for (const id of ['foe', 'ward']) {
      const [left, right] = [who(store, id), who(plain.store, id)];
      assert.deepEqual([left.hp, left.states, left.extensions?.v5?.hasMomentum], [right.hp, right.states, right.extensions?.v5?.hasMomentum], id);
    }
  });
});

describe('L7 — Retour à l’envoyeur', () => {
  const scene = () => [priest('Ranald'), fighter('weak', { camp: 'pj', kind: 'PJ', initiative: 40, hp: 30, caracs: caracs({ CC: 60, F: 20, E: 20 }) }),
    fighter('strong', { initiative: 30, hp: 60, maxHp: 60, caracs: caracs({ CC: 60, F: 50, E: 40 }) })];

  test('les Blessures du plus fort sont mises en réserve, ajoutées une fois à la prochaine attaque du plus faible, puis consommées', async () => {
    const { store } = await open(scene());
    await cast(store, ECHO, castInput(['weak']));
    const taken = await strike(store, 'echo-1', 'strong', 'weak');
    const stored = 30 - who(store, 'weak').hp;
    assert.ok(stored > 0);
    assert.deepEqual(taken.woundEcho.store, { participantId: 'weak', layerId: layersOf(store, 'weak')[0].id, fromId: 'strong', wounds: stored });
    assert.deepEqual(layersOf(store, 'weak')[0].woundEcho, { compare: ['CC', 'F', 'E'], fromId: 'strong', stored });

    const control = await open(scene());
    const plain = rawOf((await strike(control.store, 'ctl-2', 'weak', 'strong')).damage) - 4;
    const echoed = await strike(store, 'echo-2', 'weak', 'strong');
    assert.equal(echoed.woundEcho.consume.bonus, stored);
    assert.equal(who(store, 'strong').hp, 60 - plain - stored);
    assert.equal(layersOf(store, 'weak')[0].woundEcho.spent, true);
    const again = await strike(store, 'echo-3', 'weak', 'strong');
    assert.equal(again.woundEcho, undefined, 'consommé : plus aucun ajout');
    assert.equal(who(store, 'strong').hp, 60 - plain - stored - plain);
    await store.undo(); await store.undo();
    assert.equal(layersOf(store, 'weak')[0].woundEcho.spent, undefined, '↶ rend la réserve');
    assert.equal(who(store, 'strong').hp, 60);
  });

  test('un attaquant qui n’est pas le plus fort ne remplit pas la réserve', async () => {
    const participants = scene();
    participants[2].caracs = caracs({ CC: 60, F: 50, E: 20 });
    const { store } = await open(participants);
    await cast(store, ECHO, castInput(['weak']));
    const preview = await strike(store, 'echo-4', 'strong', 'weak');
    assert.equal(preview.woundEcho, undefined);
    assert.equal(layersOf(store, 'weak')[0].woundEcho.stored, undefined);
  });
});
