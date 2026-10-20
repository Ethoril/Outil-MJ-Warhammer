import test from 'node:test';
import {createCombatEngine} from '../js/core/combat.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Attaque Rapide (Myrmidia, Up in Arms p.79) : au début de chaque Round du miracle, le prêtre peut tenter un Test d'Initiative
// Intermédiaire (+0 DR) pour une attaque gratuite hors séquence avec l'arme de la main principale (modèle : attaque gratuite
// de Frénésie). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const QUICK = 'divine:miracle:attaque-rapide';
const clone = value => structuredClone(value);
const priest = () => ({ id: 'priest', name: 'priest', kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } });
const foe = () => ({ id: 'foe', name: 'foe', kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 30, hp: 40, maxHp: 40,
  caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), foe()] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'quick' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(QUICK, { actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: store.getCombat().round + 2, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(QUICK, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}

const nextTurn=async store=>{const r=await createCombatEngine(store).nextTurn();assert.equal(r.status,'applied',JSON.stringify(r));};
const reminders=store=>store.getLog().filter(l=>l.text?.startsWith('Attaque Rapide disponible'));
test('A8 : rappel une fois par porteur au debut du Round, pas avant ni apres',async()=>{
 const store=await fixture();await nextTurn(store);await nextTurn(store);assert.equal(reminders(store).length,0);
 const invocation=await invoke(store);await nextTurn(store);assert.equal(reminders(store).length,0);
 await nextTurn(store);assert.equal(reminders(store).length,1);assert.equal(reminders(store)[0].text,'Attaque Rapide disponible pour priest (Test d’Initiative +0, main principale).');
 await nextTurn(store);assert.equal(reminders(store).length,1,'pas de doublon pendant le Round');
 await store.endDivinePrayer(invocation.receipt.executionId,{reason:'fin'});await nextTurn(store);assert.equal(reminders(store).length,1,'aucun nouveau rappel apres fin');
});
test('A8 : plusieurs couches donnent un seul rappel par porteur actif',async()=>{
 const store=await fixture();await invoke(store);
 const source=store.listParticipants().find(p=>p.id==='priest').extensions.v5.divineEffects[0];
 await store.updateParticipant('priest',{extensions:{v5:{...store.listParticipants().find(p=>p.id==='priest').extensions.v5,divineEffects:[source,{...clone(source),id:source.id+'-double'}]}}});
 await store.updateParticipant('foe',{extensions:{v5:{divineEffects:[{...clone(source),id:source.id+'-foe',targetId:'foe'}]}}});
 await nextTurn(store);await nextTurn(store);
 assert.deepEqual(reminders(store).map(r=>r.actorId).sort(),['foe','priest']);
});
