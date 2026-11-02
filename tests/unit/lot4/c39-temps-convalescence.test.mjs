// C39 · G-CRI-6 · Décision MJ du 02/11 : un seul temps. Avancer le temps de campagne fait avancer le calendrier de
// convalescence ; « Suites de combat → Jours à avancer » est un raccourci du même temps.
// Deux calendriers aujourd'hui : horloge de campagne (extensions.v5.gameClock.campaignSeconds, js/core/v5-game-time.js,
// Store.advanceCampaignTime) et calendrier de convalescence (extensions.v5.aftermathRegister.calendar.currentDay,
// js/core/v5-aftermath.js, Store.advanceAftermathCalendar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';

const DAY = 86400;
const clone = structuredClone;
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const patient = { id: 'patient', name: 'Blessé', kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} } };
async function setup() {
  const store = createStore({ storage: null, persistence: memory() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [clone(patient)] }, log: [], diceLines: [], extensions: { v5: {} } });
  // Blessure bandée : aucun Test quotidien de Résistance n'est exigé, seul le temps compte.
  const reg = await store.registerAftermathIncident({ operationId: 'reg', participantId: 'patient', cause: 'combat', bandaged: true });
  assert.notEqual(reg?.status, 'refused', JSON.stringify(reg));
  assert.equal(store.getAftermathState().incidents.length, 1, 'précondition : un incident ouvert');
  return store;
}
const clockSeconds = store => JSON.parse(store.getFullJSON()).extensions?.v5?.gameClock?.campaignSeconds ?? 0;

test('C39 : Avancer le temps de campagne de 3 jours fait passer le calendrier de convalescence au jour 3', async () => {
  const store = await setup();
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
  const result = await store.advanceCampaignTime({ seconds: 3 * DAY, reason: 'Trois jours de repos' });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(clockSeconds(store), 3 * DAY, 'précondition : l’horloge de campagne a avancé');
  assert.equal(store.getAftermathState().calendar.currentDay, 3, 'calendrier de convalescence resté au jour 0');
});

test('C39 : une durée de campagne qui ne fait pas un jour entier ne perd pas la fraction (36 h = jour 1, puis 12 h de plus = jour 2)', async () => {
  const store = await setup();
  await store.advanceCampaignTime({ seconds: 36 * 3600, reason: 'Un jour et demi' });
  assert.equal(store.getAftermathState().calendar.currentDay, 1);
  await store.advanceCampaignTime({ seconds: 12 * 3600, reason: 'Une demi-journée de plus' });
  assert.equal(store.getAftermathState().calendar.currentDay, 2, 'la demi-journée restante est reportée, pas perdue');
});

test('C39 : une durée inférieure à un jour n’avance pas le calendrier de convalescence', async () => {
  const store = await setup();
  await store.advanceCampaignTime({ seconds: 3600, reason: 'Une heure' });
  assert.equal(store.getAftermathState().calendar.currentDay, 0);
});

test('C39 : « Jours à avancer » (Suites de combat) est un raccourci : l’horloge de campagne avance aussi de N jours', async () => {
  const store = await setup();
  const out = await store.advanceAftermathCalendar({ operationId: 'adv', days: 2, dailyTests: [] });
  assert.equal(out?.receipt?.status ?? out?.status, 'applied', JSON.stringify(out?.receipt ?? out));
  assert.equal(store.getAftermathState().calendar.currentDay, 2, 'précondition : calendrier de convalescence avancé');
  assert.equal(clockSeconds(store), 2 * DAY, 'horloge de campagne restée à 0 : deux temps distincts');
});
