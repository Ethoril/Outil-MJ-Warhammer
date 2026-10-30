import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { buildDivineForm, emptyDivineForm, setFieldValue, toEngineInput } from '../../../js/ui/v5-divine-form-model.js';
import { acquireV5Conditions, recoverV5Condition, advanceV5Effects, healV5Wounds } from '../../../js/core/v5-effects.js';
import { imposeHistoricalWrath } from '../../fixtures/divine-wrath-history.mjs';
import { getPrayerSLModifiers } from '../../../js/core/v5-divine-prayer-caps.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';

const clone = value => structuredClone(value);

describe('indice d’inversion (A6)', () => {
// P5 — Fortune généreuse (Ranald) : les alliés ciblés peuvent inverser les dés de pourcentage à leur PROCHAIN Test (82 devient 28) ;
// faveur perdue si elle n’est pas utilisée dans la durée. Modèle : couche à usage unique, consommée quand l’allié demande l’inversion
// (`v5.reverseDice: true`). Critère d’acceptation écrit avant l’implémentation (doit échouer avant).
const BOUNTIFUL = 'divine:miracle:ranald:bountiful-fortune';
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (s, id) => s.listParticipants().find(row => row.id === id);
async function fixture() {
  const s = createStore(); await s.ready;
  await s.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'enemy'], participants: [actor('priest'), actor('ally', { initiative: 30 }), actor('enemy', { kind: 'PNJ', camp: 'ennemi', initiative: 10 })] } });
  const preview = s.previewDivineExecution(BOUNTIFUL, { actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { ally: { withinRange: true, ally: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await s.applyDivineExecution(BOUNTIFUL, { preview });
  assert.equal(result.ready, true, result.error);
  return { s, result };
}

for(const [roll,base,who,reverse,expected] of [[82,50,'ally',false,{reversed:28,wouldSucceed:true}],[91,10,'ally',false,undefined],[82,50,'priest',false,undefined],[28,50,'ally',false,undefined],[82,50,'ally',true,undefined],[100,50,'ally',false,undefined]])test('A6 : indice inversion '+[roll,base,who,reverse].join('/'),async()=>{
 const {s}=await fixture();const before=person(s,'ally').extensions.v5.divineEffects;
 const preview=s.previewResolution({actorId:who,action:{type:'test',attr:'FM',base},roll,v5:{kind:'test',reverseDice:reverse}});
 assert.deepEqual(preview.reverseDiceHint,expected);
 assert.deepEqual(person(s,'ally').extensions.v5.divineEffects,before,'aperçu : couche intacte');
});
});

describe('rappel d’Attaque Rapide (A8)', () => {
// P5 — Attaque Rapide (Myrmidia, Up in Arms p.79) : au début de chaque Round du miracle, le prêtre peut tenter un Test d'Initiative
// Intermédiaire (+0 DR) pour une attaque gratuite hors séquence avec l'arme de la main principale (modèle : attaque gratuite
// de Frénésie). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const QUICK = 'divine:miracle:attaque-rapide';
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
});

describe('États et critiques (A9)', () => {
// Étape 6 du plan — Larmes de Shallya (Livre de base V5 p.226) : guérit 1 Blessure Critique de la cible,
// +1 par tranche de +2 DR. Les Blessures Critiques du registre (étape 5) sont retirées, les États qu'elles
// avaient posés restent. Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const TEARS = 'divine:miracle:shallya:shallya-s-tears';
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
});

describe('États — caractérisation B04', () => {
const actor=()=>({id:'priest',name:'Prêtre',kind:'PJ',camp:'pj',zone:'active',hp:10,maxHp:20,caracs:{E:40,Soc:60},states:[],extensions:{v5:{hasMomentum:true}},armor:{head:0,body:0,arms:0,legs:0}});
const snap=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
test('B04 caractérisation — États uniques et occurrences Aveuglé séparées',()=>{
 const first=acquireV5Conditions(actor(),[{name:'À Terre'},{name:'Aveuglé',level:3}]);
 const second=acquireV5Conditions(first.participant,[{name:'À Terre'},{name:'Aveuglé',level:1}]);
 assert.equal(second.participant.states.filter(row=>row.name==='À Terre').length,1);
 assert.equal(second.participant.states.filter(row=>row.name==='Aveuglé').length,2);
 assert.equal(second.acquiredInstances,1);assert.equal(second.participant.extensions.v5.hasMomentum,false);
});
test('B04 caractérisation — se relever et retour spontané de la vue ordinaires',()=>{
 const first=acquireV5Conditions(actor(),[{name:'À Terre'},{name:'Aveuglé',level:3}]).participant;
 const stood=recoverV5Condition(first,'À Terre',{method:'stand-up'});assert.equal(stood.removed.length,1);
 const ended=advanceV5Effects(stood.participant,{phase:'endOfTurn',actorId:'priest',round:1});
 assert.equal(ended.participant.states.find(row=>row.name==='Aveuglé').level,2);
});
test('B04 caractérisation — récupération ciblée, Fortune et immunité existantes',()=>{
 const first=acquireV5Conditions(actor(),[{id:'a',name:'Aveuglé',level:3},{id:'b',name:'Aveuglé',level:2}]).participant;
 const healed=recoverV5Condition(first,'b',{method:'fortune'});assert.deepEqual(healed.removed,[{id:'b',key:'aveugle',level:1}]);
 assert.equal(healed.participant.states.find(row=>row.id==='a').level,3);
 const immune=actor();immune.extensions={v5:{immunities:{conditions:['Aveuglé']}}};
 assert.equal(acquireV5Conditions(immune,[{name:'Aveuglé',level:3}]).acquiredInstances,0);
});
test('B04 caractérisation — Inconscient ordinaire, soins effectifs et poison',()=>{
 const first=acquireV5Conditions({...actor(),hp:0},[{name:'Inconscient'},{name:'Hémorragique',level:3}]).participant;
 const healed=healV5Wounds(first,2);assert.equal(healed.hpDelta,2);assert.equal(healed.participant.states.find(row=>row.name==='Hémorragique').level,1);
 assert.ok(healed.participant.states.some(row=>row.name==='Inconscient'));
 const blocked=healV5Wounds({...first,states:[{name:'Empoisonné'}]},2);assert.equal(blocked.hpDelta,0);
});
test('B04 caractérisation — Store : édition ordinaire, récupération, soins, Undo/Redo et refus atomique',async()=>{
 let saved,refuse=false;const store=createStore({storage:null,persistence:{async load(){return saved;},async saveAtomic({state}){if(refuse)return {ok:false};saved=structuredClone(state);return {ok:true};}}});await store.ready;
 await store.loadFromJSON({schemaVersion:3,combat:{round:1,currentActorId:'priest',order:['priest'],participants:[{...actor(),states:[{id:'prone',name:'À Terre'}]}]},reserve:[],log:[],diceLines:[]});
 await store.updateParticipant('priest',{states:[]});assert.equal(store.listParticipants()[0].states.length,0);
 await store.undo();assert.equal(store.listParticipants()[0].states[0].id,'prone');
 await store.redo();await store.acquireConditions('priest',[{name:'À Terre'}]);
 assert.equal((await store.recoverCondition('priest','À Terre',{method:'stand-up'})).removed.length,1);
 assert.equal((await store.healWounds('priest',2)).hpDelta,2);
 const before=snap(store);refuse=true;assert.equal((await store.updateParticipant('priest',{states:[]})).ok,false);assert.deepEqual(snap(store),before);
});
});

describe('États du Courroux (B04)', () => {
const BATTLE='divine:blessing:myrmidia:battle',clone=structuredClone;
const person=(id,sin=1)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:40,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:[],skills:[{name:'Prière',status:'resolved',carac:'Soc',total:60}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{hasMomentum:true,divine:{sin}}}});
const snap=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
const priest=store=>snap(store).combat.participants.find(row=>row.id==='priest');
const level=(actor,key)=>actor.states.filter(row=>row.key===key).reduce((n,row)=>n+row.level,0);
async function fixture(sin=1,extra={}){let saved,refuse=false;const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'Refus B04'};saved=clone(state);return {ok:true};}};const store=createStore({storage:null,persistence});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[{...person('priest',sin),...extra},person('ally',0)]},extensions:{v5:{turnIndex:1}}});return {store,persistence,setRefuse(value){refuse=value;}};}
const input=(wrathRoll,extra={})=>({actorId:'priest',targetIds:['ally'],roll:99,wrathRoll,canSpeak:true,executionId:'b4:'+wrathRoll,facts:{targets:{ally:{withinRange:true,ally:true}}},...extra});
async function impose(store,wrathRoll){const preview=store.previewDivineExecution(BATTLE,input(wrathRoll));assert.equal(preview.ready,true,preview.error);assert.equal((await store.applyDivineExecution(BATTLE,{preview})).ok,true);return preview;}
for(const [roll,sin,resultId,hp,states] of [[6,1,'wrath:16-20',20,{'a-terre':1}],[56,1,'wrath:66-70',20,{'a-terre':1,aveugle:3}],[91,1,'wrath:101-105',0,{inconscient:1}],[96,3,'wrath:126-130',0,{enflamme:1}]])test(`B04 — ${resultId} applique source, PV et États canoniques`,async()=>{
 const {store}=await fixture(sin),before=snap(store),preview=store.previewDivineExecution(BATTLE,input(roll,{wrathConsequences:'pas un substitut'}));
 assert.equal(preview.ready,true,preview.error);assert.equal(preview.wrathStatePreview?.resultId,resultId);assert.deepEqual(snap(store),before);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true);assert.equal(priest(store).hp,hp);assert.equal(priest(store).extensions.v5.divine.sin,sin-1);assert.equal(priest(store).extensions.v5.hasMomentum,false);
 for(const [key,count]of Object.entries(states))assert.equal(level(priest(store),key),count);
 assert.equal(result.receipt.wrathStateReceipt.source.printedPage,resultId.includes('101')||resultId.includes('126')?219:218);
 assert.equal(snap(store).combat.participants[1].hp,20);assert.equal(snap(store).combat.participants[1].states.length,0);
});
test('B04 — verrous par occurrence, fin de Tour et retraits génériques ne les contournent pas',async()=>{
 const {store}=await fixture();await impose(store,56);const actor=priest(store),blind=actor.states.find(row=>row.key==='aveugle');
 assert.equal(level(advanceV5Effects(actor,{phase:'endOfTurn',actorId:'priest',round:1}).participant,'aveugle'),3);
 for(const method of ['fortune','cause-ended','medical-attention','divine-removal'])assert.equal(recoverV5Condition(actor,blind.id,{method,causeEnded:true,medicalAttention:true,overrideRecovery:true,amount:9}).removed.length,0);
 await assert.rejects(()=>store.updateParticipant('priest',{states:actor.states.filter(row=>row.id!==blind.id)}),/Courroux|récupération/i);
 const forged=clone(actor.states);forged.find(row=>row.id===blind.id).divineWrathLocks=[];
 await assert.rejects(()=>store.updateParticipant('priest',{states:forged}),/Courroux|récupération/i);
 assert.equal((await store.recoverCondition('priest','À Terre',{method:'stand-up'})).removed.length,1,'À Terre de 66–70 reste ordinaire');
});
test('B04 — Prière de récupération +2 réelle, échec appliqué puis réussite, aperçu inerte',async()=>{
 const {store}=await fixture();await impose(store,6);const state=priest(store).states.find(row=>row.key==='a-terre');
 assert.equal((await store.recoverCondition('priest',state.id,{method:'stand-up',overrideRecovery:true})).removed.length,0);
 const before=snap(store);
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:state.id,roll:99,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.test.success,false);assert.equal(preview.difficulty,2);assert.deepEqual(snap(store),before);
 assert.equal((await store.applyDivineWrathRecovery({preview})).ok,true);assert.equal(level(priest(store),'a-terre'),1);
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:state.id,roll:65,canSpeak:true});assert.equal(preview.test.success,true,'+2 transforme le résultat défavorable');
 await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);
});
test('F2-B — récupération de Courroux consomme Visée dans la même transaction et Undo la restaure',async()=>{
 const bow={id:'recovery-bow',kind:'weapon',name:'Arc',category:'Arc',range:60,damage:'BF+4',grip:'two-hands'};
 const {store}=await fixture(1,{equipment:[bow]});await impose(store,6);
 await store.updateParticipant('ally',{name:'zzz'});
 const engine=createCombatEngine(store);await engine.start();
 const aimed=store.previewV5CombatAction({actorId:'priest',kind:'aim',targetId:'ally',weaponId:bow.id,rangedWeaponHeldConfirmed:true});
 assert.equal(aimed.ready,true,JSON.stringify(aimed));await store.applyV5CombatAction(aimed);
 await engine.nextTurn();await engine.nextTurn();
 const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 const recovery=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:65,canSpeak:true});assert.equal(recovery.ready,true,recovery.error);
 assert.equal((await store.applyDivineWrathRecovery({preview:recovery})).ok,true);
 assert.equal(snap(store).extensions.v5.combatActions?.byActorId?.priest,undefined);
 await store.undo();assert.equal(snap(store).extensions.v5.combatActions.byActorId.priest.kind,'aim');
});
test('B04 — Aveuglé retire 1+DR seulement sur l’occurrence choisie, conserve le reste',async()=>{
 const {store}=await fixture();await impose(store,56);await store.acquireConditions('priest',[{id:'ordinary-blind',name:'Aveuglé',level:2}]);
 const source=priest(store).states.find(row=>row.key==='aveugle'&&row.id!=='ordinary-blind');
 const preview=store.previewDivineWrathRecovery({actorId:'priest',stateId:source.id,roll:54,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.difficulty,0);assert.equal(preview.removedCount,2);
 await store.applyDivineWrathRecovery({preview});assert.equal(priest(store).states.find(row=>row.id===source.id).level,1);assert.equal(priest(store).states.find(row=>row.id==='ordinary-blind').level,2);
});
test('B04 — Inconscient source se libère au soin effectif, pas par une confirmation ni un soin nul/poison bloqué',async()=>{
 const {store}=await fixture();await impose(store,91);const actor=priest(store),state=actor.states.find(row=>row.key==='inconscient');
 assert.equal(recoverV5Condition(actor,state.id,{method:'cause-ended',causeEnded:true,overrideRecovery:true}).removed.length,0);
 assert.equal(level(healV5Wounds(actor,0).participant,'inconscient'),1);
 assert.equal(level(healV5Wounds({...actor,states:[...actor.states,{id:'poison',name:'Empoisonné',level:1}]},1).participant,'inconscient'),1);
 const healed=await store.healWounds('priest',1);assert.equal(healed.hpDelta,1);assert.equal(priest(store).hp,1);assert.equal(level(priest(store),'inconscient'),0);
 await store.undo();assert.equal(priest(store).hp,0);assert.equal(level(priest(store),'inconscient'),1);await store.redo();assert.equal(level(priest(store),'inconscient'),0);
});
test('B04 — verrou ajouté à À Terre déjà unique, immunité respectée',async()=>{
 const {store}=await fixture(1,{states:[{id:'old-prone',name:'À Terre'}]});await impose(store,6);assert.equal(priest(store).states.filter(row=>row.key==='a-terre').length,1);assert.equal(priest(store).states.find(row=>row.id==='old-prone').divineWrathLocks.length,1);
 assert.equal((await store.recoverCondition('priest','old-prone',{method:'stand-up'})).removed.length,0);
 const immune=await fixture(1,{extensions:{v5:{divine:{sin:1},immunities:{conditions:['Aveuglé']}}}});await impose(immune.store,56);assert.equal(level(priest(immune.store),'aveugle'),0);assert.equal(level(priest(immune.store),'a-terre'),1);
});
test('B04 — récupération falsifiée/périmée, refus de persistance, Undo/Redo et reload',async()=>{
 const {store,persistence,setRefuse}=await fixture();await impose(store,6);const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}),before=snap(store),forged=clone(preview);forged.removedCount=9;
 await assert.rejects(()=>store.applyDivineWrathRecovery({preview:forged}),/aperçu|modifié/i);assert.deepEqual(snap(store),before);
 setRefuse(true);assert.equal((await store.applyDivineWrathRecovery({preview})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);
 await store.updateParticipant('priest',{hp:19});await assert.rejects(()=>store.applyDivineWrathRecovery({preview}),/changé|recalculez/i);
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});await store.applyDivineWrathRecovery({preview});await assert.rejects(()=>store.applyDivineWrathRecovery({preview}),/changé|recalculez|appliqu/i);
 await store.undo();assert.equal(level(priest(store),'a-terre'),1);await store.redo();const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.equal(level(priest(reloaded),'a-terre'),0);assert.equal(snap(reloaded).extensions.v5.divineWrathRecoveries.at(-1).test.success,true);
});
test('B04 — Prière de récupération à Péché positif peut déclencher un nouveau Courroux atomique',async()=>{
 const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Nouveau Péché avant récupération'});const stateId=priest(store).states.find(row=>row.key==='a-terre').id;
 const missing=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true});assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(row=>row.field==='wrathRoll'));
 const preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll:51});assert.equal(preview.ready,true,preview.error);assert.equal(preview.wrath.resultId,'wrath:61-65');
 await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);assert.equal(level(priest(store),'hemorragique'),2);assert.equal(priest(store).extensions.v5.divine.sin,0);
});

test('B04 — regain de PV par éditeur libère la seule cause 101–105 ; KO préexistant conservé',async()=>{
 const {store}=await fixture();await impose(store,91);const actor=priest(store);
 // Sauvegarde historique d’un KO dont la cause initiale est indépendante.
 const historical=clone(actor);historical.states.find(row=>row.key==='inconscient').divineWrathLocks.forEach(lock=>lock.ownedState=false);
 assert.equal(level(healV5Wounds(historical,1).participant,'inconscient'),1);
 await store.updateParticipant('priest',{hp:1});assert.equal(level(priest(store),'inconscient'),0);
});

test('B04 — dés, capacité à parler et compétence résolue requis ; résultat client ignoré',async()=>{
 const {store}=await fixture();await impose(store,6);const stateId=priest(store).states.find(row=>row.key==='a-terre').id,before=snap(store);
 for(const extra of [{roll:undefined},{roll:0},{roll:101},{roll:23,canSpeak:false}])assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,canSpeak:true,...extra}).ready,false);
 const falsified=store.previewDivineWrathRecovery({actorId:'priest',stateId,canSpeak:true,roll:99,test:{success:true,sl:9},difficulty:99,removedCount:999});assert.equal(falsified.test.success,false);assert.equal(falsified.removedCount,0);assert.equal(falsified.difficulty,2);assert.deepEqual(snap(store),before);
 await store.updateParticipant('priest',{skills:[{name:'Prière',carac:'Soc',status:'unresolved',total:60}]});assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}).ready,false);
});
test('B04 — plafond historique et vrais modificateurs atteignent aussi la récupération',async()=>{
 const {store}=await fixture();await impose(store,56);const stateId=priest(store).states.find(row=>row.key==='aveugle').id;
 await imposeHistoricalWrath(store,{executionId:'b4-historical-cap'});
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});assert.equal(preview.ready,true,preview.error);assert.equal(preview.test.sl,0);assert.equal(preview.removedCount,1);
 const current=priest(store);await store.updateParticipant('priest',{extensions:{...current.extensions,v5:{...current.extensions.v5,spellEffects:[{id:'b4-pray-penalty',testModifiers:{Pray:-6},remainingRounds:3}]}}});
 assert.equal(priest(store).extensions.v5.testModifiers.Pray,-6,'projection effective de la couche, pas un agrégat écrasé à la sauvegarde');
 preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true});assert.equal(preview.test.success,false);assert.equal(preview.removedCount,0);
});
test('B04 — occurrences répétées sur À Terre unique, sélection explicite et collision après éviction',async()=>{
 const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Seconde occurrence'});
 const second=store.previewDivineExecution(BATTLE,input(6,{executionId:'second-b4'}));await store.applyDivineExecution(BATTLE,{preview:second});let actor=priest(store),stateId=actor.states.find(row=>row.key==='a-terre').id;
 assert.equal(actor.states.filter(row=>row.key==='a-terre').length,1);assert.equal(actor.states[0].divineWrathLocks.length,2);
 assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:23,canSpeak:true}).ready,false);
 let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,originExecutionId:'b4:6',roll:23,canSpeak:true});await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),1);assert.equal(priest(store).states[0].divineWrathLocks.length,1);
 const saved=snap(store);saved.extensions.v5.divineExecutions=[];saved.combat.participants[0].extensions.v5.divine.sin=1;await store.loadFromJSON(saved);
 assert.equal(store.previewDivineExecution(BATTLE,input(6,{executionId:'second-b4'})).ready,false);
});
test('B04 — nouveau Courroux de Blessures ou de Leçons calculé avant toute mutation',async()=>{
 for(const kind of ['damage','lessons']){
  const {store}=await fixture();await impose(store,6);await store.setDivineSin('priest',1,{reason:'Risque du Test de récupération'});const stateId=priest(store).states.find(row=>row.key==='a-terre').id,before=snap(store),wrathRoll=kind==='damage'?26:1;
  let preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll});assert.equal(preview.ready,false);assert.deepEqual(snap(store),before);
  preview=store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:20,canSpeak:true,wrathRoll,wrathEnduranceRoll:99,wrathDurationRoll:1});assert.equal(preview.ready,true,preview.error);
  await store.applyDivineWrathRecovery({preview});assert.equal(level(priest(store),'a-terre'),0);assert.equal(priest(store).extensions.v5.divine.sin,0);
  if(kind==='damage'){assert.equal(priest(store).hp,18);assert.equal(level(priest(store),'sonne'),1);}
  else {
   assert.ok(priest(store).extensions.v5.divineEffects.some(row=>row.type==='prayer-sl-modifier'&&row.duration.rounds===2));
   assert.equal(getPrayerSLModifiers(priest(store),{sceneId:null,round:1}).ok,true,'le reçu des nouvelles Leçons est accepté par le validateur partagé');
  }
 }
});

test('B04 — les anciens Aveuglé et une immunité sur À Terre préexistant ne reçoivent aucun verrou nouveau',async()=>{
 const {store}=await fixture(1,{states:[{id:'old-blind',name:'Aveuglé',level:2}]});await impose(store,56);
 assert.equal(priest(store).states.find(row=>row.id==='old-blind').divineWrathLocks?.length||0,0);
 const sourceBlind=priest(store).states.find(row=>row.key==='aveugle'&&row.id!=='old-blind');assert.equal(sourceBlind.divineWrathLocks.length,1);
 const immune=await fixture(1,{states:[{id:'old-prone',name:'À Terre'}],extensions:{v5:{divine:{sin:1},immunities:{conditions:['À Terre']}}}});await impose(immune.store,6);
 assert.equal(priest(immune.store).states.find(row=>row.id==='old-prone').divineWrathLocks?.length||0,0);
});

test('B04 — ordre des clés source après sérialisation cloud sans effet sur la récupération',async()=>{
 const {store}=await fixture();await impose(store,56);const saved=snap(store),stateId=priest(store).states.find(row=>row.key==='aveugle').id;
 const state=saved.combat.participants[0].states.find(row=>row.id===stateId);state.divineWrathLocks[0].source=Object.fromEntries(Object.entries(state.divineWrathLocks[0].source).sort(([a],[b])=>a.localeCompare(b)));
 await store.loadFromJSON(saved);assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId,roll:54,canSpeak:true}).ready,true);
});

test('B04 — Recommencer et une commande générique ne peuvent effacer une récupération par Prière',async()=>{
 const {store}=await fixture();await impose(store,6);const before=snap(store);
 await assert.rejects(()=>store.restartCombat(),/Courroux|récupération/i);assert.deepEqual(snap(store),before);
 await assert.rejects(()=>store.executeCommand('generic-clear-states',draft=>{draft.combat.participants[0].states=[];return draft;}),/Courroux|récupération/i);assert.deepEqual(snap(store),before);
});
});

describe('contexte de Test des États (E4)', () => {
const context = extra => ({ characteristic: 'Soc', isAction: false, ...extra });

test('E4 contexte — alias français/anglais agrégés; un seul pire DR entre États distincts', () => {
  const actor = { states: [
    { key: 'extenue', name: 'Fatigued', level: 2 },
    { key: 'Sonné', name: 'Stunned', level: 1 },
    { key: 'empoisonne', name: 'Poisoned', level: 3 },
    { key: 'extenué', name: 'Exténué', level: 1 }
  ] };
  const before = structuredClone(actor);
  const result = resolveV5ConditionTestContext(actor, context());
  assert.equal(result.ready, true);
  assert.deepEqual(result.levels, { extenue: 3, sonne: 1, empoisonne: 3 });
  assert.equal(result.slModifiers.length, 1);
  assert.equal(result.slModifiers[0].amount, -3);
  assert.deepEqual(actor, before);
});

test('E4 contexte — marqueurs de talents ignorés et conditions non cumulatives ramenées à une instance', () => {
  const actor = { states: [
    { key: 'brise', name: 'Brisé', level: 8, kind: 'talent-active' },
    { key: 'a-terre', name: 'À terre', level: 4 },
    { key: 'prone', name: 'Prone', level: 2 },
    { key: 'souille', name: 'Souillé', level: 3 }
  ] };
  const result = resolveV5ConditionTestContext(actor, context({ involvesMovement: true }));
  assert.equal(result.ready, true);
  assert.equal(result.levels.brise, undefined);
  assert.equal(result.levels.aterre, 1);
  assert.equal(result.levels.souille, 1);
  assert.deepEqual(result.disadvantageSources.map(row => row.label), ['À terre']);
});

test('E4 contexte — normalise les états historiques sans confondre leur durée avec le niveau', () => {
  const result = resolveV5ConditionTestContext({ states: ['Sonné|2'] }, context());
  assert.equal(result.ready, true);
  assert.equal(result.levels.sonne, 1);
  assert.equal(result.slModifiers[0].amount, -1);
});

test('E4 contexte — Clarté d’esprit écarte seulement Sonné pour Int/I/FM/Soc avec provenance', () => {
  const actor = { states: [{ key: 'sonne', name: 'Sonné', level: 2 }],
    extensions: { v5: { specialStates: { clarityOfThought: true } } } };
  for (const characteristic of ['Int', 'I', 'FM', 'Soc']) {
    const result = resolveV5ConditionTestContext(actor, context({ characteristic }));
    assert.equal(result.ready, true);
    assert.equal(result.levels.sonne, 2);
    assert.deepEqual(result.slModifiers, []);
    assert.match(JSON.stringify(result.ignoredPenaltySources), /Clarté|clarityOfThought/);
    assert.match(JSON.stringify(result.ignoredPenaltySources), /p\. 251/);
  }
  const physical = resolveV5ConditionTestContext(actor, context({ characteristic: 'CC' }));
  assert.deepEqual(physical.slModifiers.map(row => row.amount), [-2]);
  assert.deepEqual(physical.ignoredPenaltySources, []);
});

test('E4 contexte — Exténué mental avec Clarté bloque tant que ignoreFatiguePenalties n’est pas projeté', () => {
  const result = resolveV5ConditionTestContext({
    states: [{ key: 'extenue', name: 'Exténué', level: 2 }],
    extensions: { v5: { specialStates: { clarityOfThought: true } } }
  }, { characteristic: 'Soc' });
  assert.equal(result.ready, false);
  assert.equal(result.levels.extenue, 2);
  assert.ok(result.needsInput.some(row => row.field === 'clarityFatigueProjection'));
  assert.match(result.needsInput.find(row => row.field === 'clarityFatigueProjection').label, /p\. 251|fatigue/i);
});

test('E4 contexte — conflit de pénalités exige décision DIV-05 motivée', () => {
  const actor = { states: [{ key: 'sonne', name: 'Sonné', level: 2 }, { key: 'souille', name: 'Souillé', level: 1 }] };
  const unresolved = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc' }));
  assert.equal(unresolved.ready, false);
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyMode'));
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyReason'));
  assert.equal(unresolved.conditionPenaltyMode, null);
  assert.equal(unresolved.conditionPenaltyReason, null);

  const missingReason = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc', conditionPenaltyMode: 'disadvantage' }));
  assert.equal(missingReason.ready, false);
  assert.ok(missingReason.needsInput.some(row => row.field === 'conditionPenaltyReason'));

  const chosen = resolveV5ConditionTestContext(actor, context({ characteristic: 'Soc', conditionPenaltyMode: 'disadvantage', conditionPenaltyReason: 'Le MJ retient le Désavantage de Souillé.' }));
  assert.equal(chosen.ready, true);
  assert.equal(chosen.slModifiers.length, 0);
  assert.equal(chosen.disadvantageSources.length, 1);
  assert.deepEqual(chosen.arbitration, { decisionId: 'DIV-05', mode: 'disadvantage', reason: 'Le MJ retient le Désavantage de Souillé.' });
  assert.equal(chosen.conditionPenaltyMode, 'disadvantage');
  assert.equal(chosen.conditionPenaltyReason, 'Le MJ retient le Désavantage de Souillé.');
});
});

describe('contexte de Test des États — contrôle indépendant (E4)', () => {
const state = (key, name, level = 1) => ({ key, name, level });
const emptyContext = extra => ({ characteristic: 'Soc', isAction: true, ...extra });

test('E4 indépendant — même état additionné, états distincts appliquent seulement le pire malus', () => {
  const actor = { states: [state('extenue', 'Exténué', 2), state('sonne', 'Sonné', 1), state('empoisonne', 'Empoisonné', 3)] };
  const before = structuredClone(actor);
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.ready, true);
  assert.deepEqual(actor, before, 'le contexte ne modifie pas la fiche');
  assert.equal(result.slModifiers.reduce((sum, item) => sum + item.amount, 0), -3,
    'Exténué 2 et Empoisonné 3 ne s’ajoutent pas: seul le pire état distinct donne −3 DR');
});

test('E4 indépendant — listes répétées du même état sont agrégées avant le pire distinct', () => {
  const actor = { states: [state('empoisonne', 'Empoisonné', 1), state('empoisonne', 'Empoisonné', 1)] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.slModifiers.reduce((sum, item) => sum + item.amount, 0), -2);
  assert.equal(result.levels.empoisonne, 2);
});

test('E4 indépendant — Brisé et Enchevêtré demandent les faits et ne prennent pas faux par défaut', () => {
  const actor = { states: [state('brise', 'Brisé', 2), state('enchevetre', 'Enchevêtré', 1)] };
  const absent = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag' }));
  assert.equal(absent.ready, false);
  assert.ok(absent.needsInput.some(row => row.field === 'involvesMovement'));

  const walking = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag', involvesMovement: true, runningOrHiding: false }));
  assert.equal(walking.ready, true);
  assert.equal(walking.slModifiers.reduce((sum, item) => sum + item.amount, 0), -2,
    'Brisé 2 et Enchevêtré 1 sont des États distincts: seul le pire malus s’applique');

  const running = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Ag', involvesMovement: true, runningOrHiding: true }));
  assert.equal(running.ready, true);
  assert.equal(running.slModifiers.reduce((sum, item) => sum + item.amount, 0), -1,
    'course confirmée écarte Brisé, Enchevêtré reste applicable');
});

test('E4 indépendant — À terre et Souillé ne cumulent pas leurs Désavantages', () => {
  const actor = { states: [state('a-terre', 'À terre'), state('souille', 'Souillé')] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'Soc', involvesMovement: true }));
  assert.equal(result.ready, true);
  assert.equal(result.disadvantageSources.length, 1, 'les Désavantages de sources distinctes ne s’empilent pas');
  assert.equal(result.advantageSources.length, 0);
});

test('E4 indépendant — Aveuglé bloque la tâche visuelle indispensable et désavantage une tâche dépendante', () => {
  const actor = { states: [state('aveugle', 'Aveuglé', 2)] };
  const required = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'I', requiresSight: true, reliesOnSight: true }));
  assert.equal(required.ready, false);
  assert.ok(required.restrictions.length);

  const useful = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'I', requiresSight: false, reliesOnSight: true }));
  assert.equal(useful.ready, true);
  assert.equal(useful.disadvantageSources.length, 2,
    'Aveuglé 2 est un même État: la pénalité de Désavantage se cumule par niveau');
});

test('E4 indépendant — Surpris/Inconscient bloquent une Action; parler reste un prérequis de la prière', () => {
  for (const condition of [state('surpris', 'Surpris'), state('inconscient', 'Inconscient')]) {
    const blocked = resolveV5ConditionTestContext({ states: [condition] }, emptyContext({ isAction: true }));
    assert.equal(blocked.ready, false, condition.key);
  }
  const nonAction = resolveV5ConditionTestContext({ states: [state('inconscient', 'Inconscient')] }, emptyContext({ isAction: false }));
  assert.equal(nonAction.ready, true, 'le module de contexte n’invente pas une interdiction hors Action');
});

test('E4 indépendant — malus SL et Désavantage incomparables imposent un arbitrage MJ DIV-05', () => {
  const actor = { states: [state('sonne', 'Sonné', 1), state('a-terre', 'À terre')] };
  const unresolved = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'CC', involvesMovement: true }));
  assert.equal(unresolved.ready, false);
  assert.ok(unresolved.needsInput.some(row => row.field === 'conditionPenaltyMode'));

  const choice = resolveV5ConditionTestContext(actor, emptyContext({ characteristic: 'CC', involvesMovement: true,
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Le MJ retient le malus en DR pour cette action.' }));
  assert.equal(choice.ready, true);
  assert.equal(choice.arbitration?.decisionId, 'DIV-05');
  assert.equal(choice.arbitration?.mode, 'sl');
  assert.equal(choice.disadvantageSources.length, 0, 'le système ne cumule pas silencieusement les deux pénalités');
});

test('E4 indépendant — états inconnus/niveaux invalides et faits non booléens ne sont pas normalisés silencieusement', () => {
  for (const actor of [
    { states: [state('sonne', 'Sonné', 0)] },
    { states: [state('sonne', 'Sonné', 1.5)] },
    { states: [state('etat-inconnu', 'État inconnu', 1)] }
  ]) {
    const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
    assert.equal(result.ready, false);
  }
  const invalidFact = resolveV5ConditionTestContext({ states: [state('brise', 'Brisé', 1)] },
    emptyContext({ characteristic: 'Ag', involvesMovement: 'oui', runningOrHiding: false }));
  assert.equal(invalidFact.ready, false);
});

test('E4 indépendant — formats historiques passent par normalizeState sans devenir niveaux ou Conditions nouveaux', () => {
  const actor = { states: ['Sonné|2', { id: 'talent-marker', kind: 'talent-active', key: 'souille', name: 'Souillé', level: 1 }] };
  const result = resolveV5ConditionTestContext(actor, emptyContext({ isAction: false }));
  assert.equal(result.ready, true);
  assert.equal(result.levels.sonne, 1, 'le suffixe historique |2 est une durée, pas deux niveaux');
  assert.equal(result.levels.souille, undefined, 'un marqueur de talent n’est pas une Condition active');
});
});

describe('États dans la Prière (E4)', () => {
const BATTLE='divine:blessing:myrmidia:battle';
const contracts=getAllDivineContracts();
const actor=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 skills:[{id:'pray',name:'Prière',status:'resolved',carac:'Soc',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],prayers:[],equipment:[],traits:[],states:[],
 armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0}}},...extra});
const input=(extra={})=>({actorId:'priest',targetIds:['ally'],roll:23,canSpeak:true,
 choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},
 expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra});
async function fixture(priest){
 const store=createStore();await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],
  participants:[priest,actor('ally',{initiative:30})]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return store;
}

test('E4 runtime — Prière applique au Test le plus fort de Sonné, Exténué et Empoisonné',async()=>{
 const priest=actor('priest',{states:[{key:'sonne',name:'Sonné',level:2},{key:'extenue',name:'Exténué',level:1},{key:'empoisonne',name:'Empoisonné',level:3}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'sl',conditionPenaltyReason:'Le pire malus d’État est retenu.'}}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.prayer.sl,1,'socle 4 DR puis seul le pire malus distinct de −3');
 assert.deepEqual(preview.preview.conditionTestContext.slModifiers.map(row=>row.amount),[-3]);
 assert.deepEqual(preview.preview.conditionTestContext.levels,{sonne:2,extenue:1,empoisonne:3});
});

test('E4 runtime — Souillé affecte le Test de Soc et force l’inversion défavorable',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input());
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.prayer.optionId,'reverse');
 assert.equal(preview.preview.prayer.roll,32,'le jet 23 est inversé à 32 par le Désavantage de Souillé');
 assert.deepEqual(preview.preview.conditionTestContext.disadvantageSources.map(row=>row.label),['Souillé']);
});

test('E4 runtime — Clarté d’esprit laisse Sonné actif mais écarte son malus de Prière mentale',async()=>{
 const priest=actor('priest',{states:[{key:'sonne',name:'Sonné',level:2}],extensions:{v5:{divine:{sin:0},specialStates:{clarityOfThought:true}}}});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input());
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.conditionTestContext.levels.sonne,2);
 assert.deepEqual(preview.preview.conditionTestContext.slModifiers,[]);
 assert.match(JSON.stringify(preview.preview.conditionTestContext.ignoredPenaltySources),/Clarté|clarityOfThought/i);
 assert.match(JSON.stringify(preview.preview.conditionTestContext.ignoredPenaltySources),/p\. 251/);
});

test('E4 runtime — Souillé et malus en DR exigent DIV-05, choix motivé et capture périmée sur changement d’État',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1},{key:'sonne',name:'Sonné',level:2}]});
 const store=await fixture(priest);
 const unresolved=store.previewDivineExecution(BATTLE,input());
 assert.equal(unresolved.ready,false);
 assert.ok(unresolved.needsInput.some(row=>row.field==='conditionContext.conditionPenaltyMode'));
 const chosen=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'disadvantage',
  conditionPenaltyReason:'Le MJ retient le Désavantage de Souillé.'}}));
 assert.equal(chosen.ready,true,chosen.error);
 assert.equal(chosen.preview.prayer.optionId,'reverse');
 await store.updateParticipant('priest',{states:[]});
 await assert.rejects(async()=>store.applyDivineExecution(BATTLE,{preview:chosen}),/changé depuis le calcul|recalculez/i);
});

test('E4 runtime — contexte calculé et arbitrage restent dans le reçu après reload; Undo annule reçu et effet',async()=>{
 const priest=actor('priest',{states:[{key:'souille',name:'Souillé',level:1},{key:'sonne',name:'Sonné',level:2}]});
 const store=await fixture(priest);
 const preview=store.previewDivineExecution(BATTLE,input({conditionContext:{conditionPenaltyMode:'disadvantage',
  conditionPenaltyReason:'Le MJ retient le Désavantage pour cette Prière.'}}));
 assert.equal(preview.ready,true,preview.error);
 const applied=await store.applyDivineExecution(BATTLE,{preview});
 assert.equal(applied.ready,true,applied.error);
 assert.equal(applied.receipt.testContext.arbitration.decisionId,'DIV-05');
 assert.equal(applied.receipt.testContext.arbitration.mode,'disadvantage');
 assert.equal(applied.receipt.prayer.optionId,'reverse');
 const saved=JSON.parse(store.getFullJSON());
 const loaded=createStore();await loaded.ready;await loaded.loadFromJSON(saved);
 const receipt=(JSON.parse(loaded.getFullJSON()).extensions.v5.divineExecutions||[]).find(row=>row.executionId===applied.executionId);
 assert.deepEqual(receipt.testContext,applied.receipt.testContext);
 await store.undo();
 const undone=JSON.parse(store.getFullJSON());
 assert.equal((undone.extensions.v5.divineExecutions||[]).some(row=>row.executionId===applied.executionId),false);
 assert.equal(undone.combat.participants.find(row=>row.id==='ally').extensions.v5.divineEffects?.length||0,0);
});
});

describe('États dans la Prière — contrôle indépendant (E4)', () => {
const BATTLE = 'divine:blessing:myrmidia:battle';
const contract = getAllDivineContracts().find(row => row.id === BATTLE);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  persistentCharacterId: 'persistent-' + id,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'pray', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }], prayers: [],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const prayer = (extra = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 23, canSpeak: true,
  choices: { range: 0, targets: 0, duration: 0, effect: 0 }, facts: { targets: { ally: { withinRange: true, ally: true } } },
  expiry: { phase: 'endOfRound', round: 6, moment: 'afterEffects' }, ...extra });
async function makeStore(states = [], specialStates = {}) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'],
    participants: [actor('priest', { states, extensions: { v5: { divine: { sin: 0 }, specialStates } } }), actor('ally')] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const snapshot = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };

test('E4 runtime indépendant — états Sonné/Exténué/Empoisonné réduisent le Test par le pire modificateur', async () => {
  const store = await makeStore([
    { key: 'sonne', name: 'Sonné', level: 2 },
    { key: 'extenue', name: 'Exténué', level: 1 },
    { key: 'empoisonne', name: 'Empoisonné', level: 3 }
  ]);
  const before = snapshot(store);
  const preview = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Le MJ retient le malus d’État maximal.'
  } }));
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.prayer.sl, 1, 'base +4 SL moins le pire malus distinct de 3');
  assert.deepEqual(preview.preview.conditionTestContext.slModifiers.map(row => row.amount), [-3]);
  assert.deepEqual(preview.preview.conditionTestContext.levels, { sonne: 2, extenue: 1, empoisonne: 3 });
  assert.deepEqual(snapshot(store), before, 'l’aperçu ne modifie ni États ni ressources');
});

test('E4 runtime indépendant — Souillé utilise le sélecteur légal du moteur de Test partagé', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }]);
  const preview = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.prayer.optionId, 'reverse');
  assert.equal(preview.preview.prayer.roll, 32, 'le Désavantage impose l’inversion défavorable du jet 23');
  assert.deepEqual(preview.preview.conditionTestContext.disadvantageSources.map(row => row.label), ['Souillé']);
});

test('E4 runtime indépendant — combinaison Souillé + malus SL exige DIV-05 motivé et n’applique qu’un choix', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }, { key: 'sonne', name: 'Sonné', level: 2 }]);
  const missingDecision = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(missingDecision.ready, false);
  assert.ok(missingDecision.needsInput.some(row => row.field === 'conditionContext.conditionPenaltyMode'));
  assert.ok(missingDecision.needsInput.some(row => row.field === 'conditionContext.conditionPenaltyReason'));

  const chosen = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Je retiens le malus maximal en DR.'
  } }));
  assert.equal(chosen.ready, true, chosen.error);
  assert.equal(chosen.preview.conditionTestContext.arbitration.decisionId, 'DIV-05');
  assert.equal(chosen.preview.conditionTestContext.arbitration.mode, 'sl');
  assert.deepEqual(chosen.preview.conditionTestContext.slModifiers.map(row => row.amount), [-2]);
  assert.deepEqual(chosen.preview.conditionTestContext.disadvantageSources, []);
});

test('E4 runtime indépendant — les paramètres du formulaire ne peuvent pas forger une exemption ou un bonus d’État', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }]);
  const ordinary = store.previewDivineExecution(BATTLE, prayer());
  const forged = store.previewDivineExecution(BATTLE, prayer({ conditionContext: {
    conditionPenaltyMode: 'sl', conditionPenaltyReason: 'Motif quelconque', isAction: false,
    runningOrHiding: true, slModifiers: [{ id: 'forged', amount: 99 }], advantageSources: ['free advantage']
  } }));
  assert.equal(ordinary.ready, true, ordinary.error);
  assert.equal(forged.ready, true, forged.error);
  assert.deepEqual(forged.preview.conditionTestContext.slModifiers, ordinary.preview.conditionTestContext.slModifiers,
    'le moteur dérive les Conditions de l’acteur et ignore les exceptions/modificateurs arbitraires');
  assert.deepEqual(forged.preview.conditionTestContext.advantageSources, ordinary.preview.conditionTestContext.advantageSources);
  assert.equal(forged.preview.conditionTestContext.levels.sonne, 2);
});

test('E4 runtime indépendant — Clarté d’esprit canonique neutralise Sonné mental ou bloque explicitement sa dépendance', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  if (result.ready) {
    assert.equal(result.preview.conditionTestContext.levels.sonne, 2,
      'la Condition demeure enregistrée, seule son exception source s’applique');
    assert.deepEqual(result.preview.conditionTestContext.slModifiers, [],
      'Clarté d’esprit neutralise le malus Sonné du Test mental/Prière');
    assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base n’est pas réduit par Sonné');
  } else {
    const details = [result.error, ...(result.needsInput || []).map(row => row.label || row.field)].join(' ');
    assert.match(details, /Clarté|clarity|mental|exception|projection/i,
      'si l’exception n’est pas raccordée, la dépendance doit bloquer explicitement le preview');
  }
});

test('E4 runtime indépendant — Clarté d’esprit canonique écarte seulement Sonné d’une Prière mentale avec preuve p. 251', async () => {
  const store = await makeStore([{ key: 'sonne', name: 'Sonné', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(result.ready, true, result.error || JSON.stringify(result.needsInput));
  const context = result.preview.conditionTestContext;
  assert.equal(context.levels.sonne, 2, 'la Condition et son niveau restent présents');
  assert.deepEqual(context.slModifiers, [], 'Clarté ignore uniquement le malus de Sonné pour ce Test mental');
  assert.deepEqual(context.disadvantageSources, [], 'aucune pénalité non sourcée n’est introduite');
  assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base reste intact');
  const exceptionEvidence = JSON.stringify(context);
  assert.match(exceptionEvidence, /Clarté|clarityOfThought/i,
    'le contexte du Test doit exposer la dérogation canonique réellement appliquée');
  assert.match(exceptionEvidence, /p\.?\s*251|V5[^\"]{0,12}251/i,
    'la dérogation appliquée doit conserver sa référence de source p. 251');
});

test('E4 runtime indépendant — Clarté d’esprit ne laisse pas passer le malus mental Exténué sans examen explicite', async () => {
  const store = await makeStore([{ key: 'extenue', name: 'Exténué', level: 2 }], {
    clarityOfThought: true
  });
  const result = store.previewDivineExecution(BATTLE, prayer());
  if (result.ready) {
    assert.equal(result.preview.conditionTestContext.levels.extenue, 2,
      'la Condition Exténué et son niveau restent présents même si une règle l’exempte');
    assert.deepEqual(result.preview.conditionTestContext.slModifiers, [],
      'Clarté ne laisse pas appliquer son malus à ce Test mental');
    assert.equal(result.preview.prayer.sl, 4, 'le +4 SL de base n’est pas réduit par Exténué');
    const evidence = JSON.stringify(result.preview.conditionTestContext);
    assert.match(evidence, /Clarté|clarityOfThought/i);
    assert.match(evidence, /p\.?\s*251|V5[^\"]{0,12}251/i,
      'l’exemption doit porter une provenance explicite p. 251');
  } else {
    const details = [result.error, ...(result.needsInput || []).map(row => row.label || row.field)].join(' ');
    assert.match(details, /Clarté|clarity|Exténué|fatigue|mental/i,
      'un cas connu mais non raccordé doit bloquer explicitement plutôt que produire un malus erroné');
  }
});

test('E4 runtime indépendant — aperçu avec Courroux et Péché ne mutile pas le Store avant Apply', async () => {
  const store = await makeStore();
  const edit = await store.setDivineSin('priest', 1, { reason: 'Sin initial explicite pour la sonde', baseRevision: store.getLocalRevision() });
  assert.equal(edit.ok, true, edit.error);
  const before = snapshot(store);
  const preview = store.previewDivineExecution(BATTLE, prayer({ roll: 21, wrathRoll: 78,
    wrathSummonProfile: { name: 'Démon mineur', wounds: 10, initiative: 30 }, wrathSummonDistanceRoll: 8, wrathSummonPosition: 'Au fond de la salle', wrathSummonTargetId: 'priest' }));
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.wrathTableResult?.id, 'wrath:88-88');
  assert.deepEqual(snapshot(store), before, 'Calculer ne consomme pas le Péché et ne modifie pas le sujet ou les cibles');
});

test('E4 runtime indépendant — capture de Condition devient stale avant Apply sans effet partiel', async () => {
  const store = await makeStore([{ key: 'souille', name: 'Souillé', level: 1 }]);
  const preview = store.previewDivineExecution(BATTLE, prayer());
  assert.equal(preview.ready, true, preview.error);
  await store.updateParticipant('priest', { states: [] });
  const beforeApply = snapshot(store);
  await assert.rejects(async () => store.applyDivineExecution(BATTLE, { preview }), /changé depuis le calcul|recalculez/i);
  assert.deepEqual(snapshot(store), beforeApply, 'le refus stale n’applique pas la prière ou la décision de Test');
  assert.equal(beforeApply.combat.participants.find(row => row.id === 'ally').extensions?.v5?.divineEffects?.length || 0, 0);
});
});
