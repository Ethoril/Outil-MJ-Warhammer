import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { combatReminderInfo, expireDivineEffects } from '../../../js/core/v5-divine-engine.js';
import { deriveReminders } from '../../../js/core/reminders.js';
import { reminderLayerLabel } from '../../../js/ui/v5-divine-form-model.js';

// L9 (F6, rappel enrichi) : les prières « combat » restées en rappel portent une couche avec libellé court, portée, cibles et échéance ;
// les prières hors combat gardent leur rappel actuel, sans rien de plus. Aucun calcul n'est ajouté (Q2) ; la Conscience reste inchangée (Q3).
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const byCanonical = name => getAllDivineContracts().find(row => row.canonicalName === name);
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'],
    participants: [actor('priest', cult), actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' }, clockAnchor: { campaignSeconds: 1000 }, ...more });
async function cast(store, contractId, more = {}) {
  more = { ...more, facts: { targets: Object.fromEntries((more.targetIds || []).map(id => [id, { withinRange: true, withinTouch: true }])) } };
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id = 'priest') => person(store, id).extensions?.v5?.divineEffects || [];
const reminderLayers = (store, id) => layers(store, id).filter(row => row.type === 'manual-prayer-reminder');

describe('L9 — inventaire des rappels enrichis', () => {
  test('trente contrats marqués : sept restés manual, vingt-trois assistés, la liste du tri', () => {
    const marked = getAllDivineContracts().filter(row => combatReminderInfo(row, {}));
    assert.equal(marked.length, 30);
    const manual = marked.filter(row => row.status === 'manual').map(row => row.canonicalName).sort();
    assert.deepEqual(manual, ['Bitter Catharsis', 'Free Your Mind', 'Know Your Enemy', 'Last Rites', "Rhya's Dominion", "Rhya's Taming", 'Waterlungs']);
    assert.equal(marked.filter(row => row.status === 'assisted').length, 23);
    // Chaque contrat marqué a de quoi se libeller : libellé de contrat, ou libellé d'au moins une clause manuelle.
    for (const row of marked) assert.ok(row.labels.shortLabel || row.clauses.some(clause => clause.mode === 'manual' && clause.shortLabel), row.id);
    assert.ok(marked.every(row => row.status !== 'manual' || row.labels.combatReminder === true));
    for (const row of getAllDivineContracts()) for (const clause of row.clauses || []) if (clause.shortLabel !== undefined) assert.ok(clause.shortLabel.length <= 60, `${row.id}#${clause.id}`);
  });
  test('Conscience (Q3) et les prières hors combat : aucun marquage', () => {
    const consciences = getAllDivineContracts().filter(row => row.id.endsWith(':conscience'));
    assert.ok(consciences.length >= 7, 'sept Consciences attendues, trouvées : ' + consciences.length);
    for (const row of consciences) { assert.equal(combatReminderInfo(row, {}), null, row.id); assert.equal(row.status, 'manual', row.id); }
    for (const name of ['Unblemished Innocence', 'Pelt of the Winter Wolf', 'Carry My Burdens', "A Deal's a Deal"]) {
      const row = byCanonical(name);
      if (row) assert.equal(combatReminderInfo(row, {}), null, name);
    }
  });
});

describe('L9 — prière manuelle à durée : couche enrichie', () => {
  test('Poumons d’eau : libellé, portée, cible, durée en heures et échéance calendaire ; le rappel au résultat demeure (CA8)', async () => {
    const store = await fixture('Mathlann');
    const id = byCanonical('Waterlungs').id;
    const { preview } = await cast(store, id, { targetIds: ['priest'] });
    assert.ok(preview.preview.reminders.some(text => /Prière résolue; effet laissé au rappel MJ/.test(text)));
    assert.equal(getDivineContract(id).status, 'manual');
    const [layer] = reminderLayers(store);
    assert.deepEqual(layer.reminder, { label: 'Respire sous l’eau', range: '60 m', targets: '1 cible' });
    assert.deepEqual(layer.duration, { value: 6, unit: 'hours' });
    assert.equal(layer.deadline.kind, 'campaign-time');
    assert.ok(!layer.testModifiers && !layer.traits && !layer.characteristics);
    assert.match(reminderLayerLabel(layer), /^Rappel : Respire sous l’eau \(portée : 60 m ; cible : 1 cible\) · jusqu’à /);
  });
  test('Domination de Rhya : durée spéciale, fin au Tour du prêtre ; la couche expire puis disparaît', async () => {
    const store = await fixture('Rhya');
    await cast(store, byCanonical("Rhya's Dominion").id, { targetIds: ['priest'] });
    const [layer] = reminderLayers(store);
    assert.deepEqual(layer.reminder, { label: 'Esprit de la nature pour une tâche', range: '4 m', targets: '1 cible' });
    assert.equal(layer.expiry.round, 1);
    const expired = expireDivineEffects(person(store, 'priest'), { phase: 'endOfTurn', actorId: 'priest', round: 1 });
    assert.equal(expired.status, 'expired');
    assert.equal(expired.participant.extensions.v5.divineEffects.filter(row => row.type === 'manual-prayer-reminder').length, 0);
  });
  test('prière instantanée : aucune couche, rappel au résultat seulement (CA8)', async () => {
    const store = await fixture('Morr');
    const { preview } = await cast(store, byCanonical('Last Rites').id, { targetIds: ['foe'] });
    assert.equal(reminderLayers(store).length, 0);
    assert.ok(preview.preview.reminders.some(text => /Prière résolue/.test(text)));
  });
});

describe('L9 — prière assistée : clauses de combat en rappel', () => {
  test('Masque mortuaire : le rappel est porté par la couche d’effet datée, sans couche en plus ; échéance du Round', async () => {
    const store = await fixture('Morr');
    await cast(store, byCanonical('Death Mask').id, { expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
    const carried = layers(store).filter(row => row.reminder);
    assert.equal(carried.length, 1);
    assert.deepEqual(carried[0].reminder, { label: 'Morts-vivants non immunisés à la Peur', range: 'le prêtre', targets: 'le prêtre' });
    assert.equal(reminderLayers(store).length, 0, 'aucune couche de rappel supplémentaire');
    assert.equal(carried[0].expiry.round, 6);
    assert.match(reminderLayerLabel(carried[0]), /fin du Tour du prêtre, Round 6/);
  });
  test('Épée de justice : le Péché à attribuer à la main est dans le libellé (Q15)', () => {
    const info = combatReminderInfo(byCanonical('Sword of Justice'), { range: { value: null, unit: 'self' }, targets: { value: null, unit: 'self' } });
    assert.match(info.label, /Péché à attribuer à la main/);
  });
  test('Sur un terrain mortel : la note « durée non attestée par le livre » (Q13) est portée par le rappel', () => {
    const info = combatReminderInfo(byCanonical('On Deadly Ground'), { range: { value: null, unit: 'self' }, targets: { value: 6, unit: 'yards' } });
    assert.equal(info.durationNote, 'durée non attestée par le livre');
    assert.equal(info.targets, 'zone de 6 m');
    assert.match(reminderLayerLabel({ type: 'manual-prayer-reminder', reminder: info, expiry: { round: 2, phase: 'endOfRound' } }), /durée non attestée par le livre/);
  });
  test('contrat marqué sans shortLabel : libellé de repli tiré du nom ; contrat non marqué : aucun rappel enrichi', () => {
    const plain = clone(byCanonical('Death Mask'));
    plain.clauses = plain.clauses.map(({ shortLabel, ...clause }) => clause);
    assert.equal(combatReminderInfo(plain, {}), null);
    const marked = { ...plain, labels: { ...plain.labels, combatReminder: true } };
    assert.equal(combatReminderInfo(marked, {}).label, marked.name);
  });
});

describe('L9 — affichage sur le participant', () => {
  test('deriveReminders liste la couche enrichie du porteur ; une couche sans reminder ne s’affiche pas', async () => {
    const store = await fixture('Mathlann');
    await cast(store, byCanonical('Waterlungs').id, { targetIds: ['foe'] });
    const participants = store.listParticipants();
    const texts = deriveReminders({ sceneId: 's', participants, allParticipants: participants }, { type: 'participant' }).map(row => row.text);
    assert.ok(texts.some(text => /^foe : Respire sous l’eau \(prêtre : priest\) \(portée : 60 m ; cible : 1 cible\)/.test(text)), JSON.stringify(texts));
    const bare = { id: 'x', name: 'X', extensions: { v5: { divineEffects: [{ type: 'manual-prayer-reminder', id: 'l', casterId: 'x' }] } } };
    assert.deepEqual(deriveReminders({ sceneId: 's', participants: [bare] }, { type: 'participant' }).filter(row => /divine-reminder/.test(row.id)), []);
  });
});
