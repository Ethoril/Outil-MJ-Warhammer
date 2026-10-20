import test from 'node:test';
import {buildDivineForm,emptyDivineForm,setFieldValue,toEngineInput} from '../js/ui/v5-divine-form-model.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';

// Étape 6 du plan — Larmes de Shallya (Livre de base V5 p.226) : guérit 1 Blessure Critique de la cible,
// +1 par tranche de +2 DR. Les Blessures Critiques du registre (étape 5) sont retirées, les États qu'elles
// avaient posés restent. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TEARS = 'divine:miracle:shallya:shallya-s-tears';
const clone = value => structuredClone(value);
const base = (id, extra = {}) => ({ id, name: id, kind: id === 'foe' ? 'PNJ' : 'PJ', camp: id === 'foe' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false } }, ...extra });
const priest = () => base('priest', { initiative: 70,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Shallya' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })) });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const records = (store, id) => person(store, id).extensions?.v5?.criticalWounds || [];
async function fixture() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [priest(), base('ally', { initiative: 50 }), base('foe', { initiative: 30 })] }, log: [], diceLines: [],
    extensions: { v5: { turnIndex: 1, combatId: 'larmes-shallya' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
// L'ennemi porte deux coups critiques à l'allié : deux enregistrements au registre (étape 5), avec leurs États.
const critAttack = (resolutionId, effectRoll) => ({ resolutionId, actorId: 'foe', targetId: 'ally', roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
  criticalRolls: { location: 2, effect: effectRoll } });
async function woundAllyTwice(store) {
  const ids = [];
  for (const [index, effectRoll] of [80, 45].entries()) {
    const preview = store.previewResolution(critAttack(`w${index + 1}`, effectRoll));
    assert.ok(preview.critical?.details, 'critique attendu');
    const result = await store.applyResolution(preview);
    assert.notEqual(result.status, 'manual', result.reason);
    ids.push(records(store, 'ally').at(-1).id);
  }
  assert.equal(records(store, 'ally').length, 2, 'deux Blessures Critiques au registre');
  return ids;
}
const invokeInput = (ids, roll) => ({ actorId: 'priest', targetIds: ['ally'], roll, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 },
  criticalHeals: { first: { ally: ids[0] ?? '' }, second: { ally: ids[1] ?? '' }, third: { ally: ids[2] ?? '' } },
  facts: { targets: { ally: { withinTouch: true } } } });


for(const checked of [false,true])test('A9 : liaison critique et Etats, retrait choisi '+checked,async()=>{
 const store=await fixture();const attack=store.previewResolution(critAttack('a9',45));assert.equal((await store.applyResolution(attack)).status,'applied');
 const wound=records(store,'ally')[0],before=clone(person(store,'ally').states);assert.ok(before.length);assert.ok(wound.stateIds?.length,'identifiants des Etats du critique');
 assert.ok(wound.stateIds.every(id=>before.some(s=>s.id===id)));
 const form=emptyDivineForm(),contract=getDivineContract(TEARS);const model=buildDivineForm(contract,{actor:person(store,'priest'),targets:[person(store,'ally')],form});
 const field=model.effectFields.find(f=>f.engineField==='criticalHealStates.ally');assert.equal(field.kind,'check');setFieldValue(form,field,checked);
 const input={...invokeInput([wound.id],45),...toEngineInput(form,{targetIds:['ally'],contract,actor:person(store,'priest')}),criticalHeals:{first:{ally:wound.id}},facts:{targets:{ally:{withinTouch:true}}}};
 const preview=store.previewDivineExecution(TEARS,input);assert.equal(preview.ready,true,JSON.stringify(preview.needsInput));
 const result=await store.applyDivineExecution(TEARS,{preview});assert.equal(result.ready,true,result.error);
 assert.equal(records(store,'ally').length,0);assert.equal(person(store,'ally').states.filter(s=>wound.stateIds.includes(s.id)).length,checked?0:before.length);
 const receipt=result.receipt.effectReceipts.find(r=>r.type==='heal-critical').result;assert.deepEqual((receipt.removedStates||[]).map(s=>s.id).sort(),checked?[...wound.stateIds].sort():[]);
 await store.undo();assert.deepEqual(person(store,'ally').states,before);assert.deepEqual(records(store,'ally')[0],wound);
});
test('A9 : aucun Etat preexistant ou etranger rattache au critique',async()=>{
 const store=await fixture();await store.updateParticipant('ally',{states:[{id:'old',key:'hemorragique',name:'Hémorragique',level:1}]});
 const p=store.previewResolution(critAttack('a9-old',45));assert.equal((await store.applyResolution(p)).status,'applied');assert.ok(!records(store,'ally')[0].stateIds?.includes('old'));assert.ok(records(store,'ally')[0].stateIds?.length);
});
