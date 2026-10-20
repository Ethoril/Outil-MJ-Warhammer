import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// P5 — Morsure du Loup (Ulric, Power Behind the Throne Companion p.50) : +20 au jet de gravité de toute Blessure Critique que le
// prêtre inflige pendant la durée (attaque ou défense). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const WOLF = 'divine:miracle:ulric:wolf-s-bite';
const clone = value => structuredClone(value);
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 20, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const priest = () => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 200 }, { id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ulric' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, magic: { reserve: { type: 'winds', sl: 0 } } } } });
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'foe'], participants: [priest(), fighter('foe')] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'wolf' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
async function invoke(store) {
  const preview = store.previewDivineExecution(WOLF, { actorId: 'priest', targetIds: ['priest'], roll: 45, canSpeak: true, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' },
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { priest: { withinRange: true, withinTouch: true } } } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(WOLF, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}

const summaries=p=>p.targetResults.flatMap(r=>r.actions.filter(a=>a.kind==='critical-wound').map(a=>a.summary));
const snapshot=store=>{const s=JSON.parse(store.getFullJSON());delete s.exportedAt;return s;};
for(const name of ['Carreau','Cendres et Poussière'])test('A5 : rappel de Morsure du Loup pour '+name,async()=>{
 const store=await fixture();
 const request={actorId:'priest',targetIds:['foe'],roll:22,miscastRoll:15,criticalChoice:'critical-wound',willpowerSuccess:true,direction:'E',distanceRoll:10,targetTests:{foe:{inside:true,locationRoll:34}}};
 const cast=()=>store.previewSpellExecution(name,request);
 const without=cast();assert.equal(without.ready,true,without.error);assert.ok(summaries(without).length);assert.ok(summaries(without).every(s=>!s.includes('Morsure du Loup')));
 const invocation=await invoke(store);const before=snapshot(store);const withWolf=cast();assert.equal(withWolf.ready,true,withWolf.error);
 assert.ok(summaries(withWolf).every(s=>s.includes('(+20 à la gravité : Morsure du Loup)')),JSON.stringify(summaries(withWolf)));
 assert.deepEqual(snapshot(store),before,'aperçu inerte');
 const actor=store.listParticipants().find(p=>p.id==='priest');actor.extensions.v5.divineEffects.find(l=>l.criticalSeverityBonus).criticalSeverityBonus=7;
 await store.updateParticipant('priest',{extensions:actor.extensions});
 assert.ok(summaries(cast()).every(s=>s.includes('(+7 à la gravité : Morsure du Loup)')),'valeur réelle de la couche');
 await store.endDivinePrayer(invocation.receipt.executionId,{reason:'fin'});
 assert.ok(summaries(cast()).every(s=>!s.includes('Morsure du Loup')),'fin de la prière');
});
