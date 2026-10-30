import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import registry from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { createCombatEngine } from '../../../js/core/combat.js';
import * as divineStore from '../../../js/core/v5-divine-store.js';
import { getAllDivineContracts, expireDivineAtPhases } from '../../../js/core/v5-divine-store.js';
import { expireDivineEffects } from '../../../js/core/v5-divine-engine.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { previewMagicMeditation } from '../../../js/core/v5-magic-talents.js';
import { advanceGameClock, createGameClock } from '../../../js/core/v5-game-time.js';
import { migrateSnapshot } from '../../../js/core/migrations.js';
import { previewHistoricalWrath, applyHistoricalWrath, imposeHistoricalWrath } from '../../fixtures/divine-wrath-history.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import corpus from '../../../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };
import { wrathConditionReading, wrathConditionRules } from '../../../docs/divin/sources/L06-wrath-conditions-readings.mjs';
import { recoverV5Condition } from '../../../js/core/v5-effects.js';
import { sanitizeMagicSubject } from '../../../js/core/sanitize.js';
import * as prayerCaps from '../../../js/core/v5-divine-prayer-caps.js';
import { getPrayerSLModifiers } from '../../../js/core/v5-divine-prayer-caps.js';
import { normalizeRemoteDocument } from '../../../js/core/sync-session.js';

const BATTLE = 'divine:blessing:myrmidia:battle';
const PRAY_ID = 'skill-50_72_69_e8_72_65-base';
const clone = value => structuredClone(value);
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30,
  caracs: { CC:40, CT:40, F:30, E:30, I:40, Ag:40, Dex:40, Int:50, FM:50, Soc:60, M:4 },
  armor: { head:0, body:0, arms:0, legs:0 }, states: [], traits: [], equipment: [],
  skills: [{ id:PRAY_ID, name:'Prière', carac:'Soc', status:'resolved', total:60 }],
  talents: [{ id:'talent-bless', status:'resolved', rank:1, specialization:'Myrmidia' },
    { id:'talent-invoke', status:'resolved', rank:1, specialization:'Myrmidia' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name:row.catalogueName, status:'resolved' })),
  extensions: { v5: { divine: { sin:1 } } }, ...extra
});
const stateOf = store => { const state=JSON.parse(store.getFullJSON()); delete state.exportedAt; return state; };

describe('critiques de la fiche (A11)', () => {
const clone=structuredClone;
async function fixture(){
 let saved;const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){saved=clone(state);return {ok:true};}};
 const store=createStore({storage:null,persistence});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'p',order:['p'],participants:[{id:'p',name:'Garde',zone:'active',hp:20,maxHp:20,states:[{id:'bleed',name:'Hémorragique',key:'hemorragique',level:2}],extensions:{v5:{criticalWounds:[{id:'c1',name:'Entaille',location:'Bras',round:1,stateIds:['bleed']},{id:'c2',name:'Coup',location:'Tête',round:1}]}}}]},log:[],diceLines:[]});
 return {store,persistence};
}
const person=s=>s.listParticipants()[0];
test('A11 : guerison manuelle du seul critique choisi, Etats conserves, Undo/Redo',async()=>{
 const {store}=await fixture(),before=clone(person(store));
 await store.healCriticalWound('p','c1');assert.deepEqual(person(store).extensions.v5.criticalWounds.map(r=>r.id),['c2']);assert.deepEqual(person(store).states,before.states);
 await store.undo();assert.deepEqual(person(store).extensions.v5.criticalWounds,before.extensions.v5.criticalWounds);assert.deepEqual(person(store).states,before.states);
 await store.redo();assert.deepEqual(person(store).extensions.v5.criticalWounds.map(r=>r.id),['c2']);
});
test('A11 : persistance et rechargement de la guerison',async()=>{
 const {store,persistence}=await fixture();await store.healCriticalWound('p','c1');
 const reloaded=createStore({storage:null,persistence});await reloaded.ready;assert.deepEqual(person(reloaded).extensions.v5.criticalWounds.map(r=>r.id),['c2']);assert.equal(person(reloaded).states[0].id,'bleed');
});
test('A11 : participant ou critique inconnu refuse sans mutation',async()=>{
 const {store}=await fixture(),before=clone(person(store));
 for(const [id,critical] of [['absent','c1'],['p','absent']])await assert.rejects(async()=>store.healCriticalWound(id,critical),/introuvable/i);
 assert.deepEqual(clone(person(store)),before);
});
});

describe('Courroux — dégâts (B03)', () => {
const BATTLE='divine:blessing:myrmidia:battle',clone=structuredClone;
const person=id=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:id==='priest'?60:30,hp:30,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:50,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 armor:{head:10,body:10,arms:10,legs:10},states:[],traits:[],equipment:[],
 skills:[{id:'pray',name:'Prière',carac:'Soc',status:'resolved',total:60},{id:'endurance',name:'Résistance',carac:'E',status:'resolved',total:50}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin:2},hasMomentum:true}}});
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
const actor=store=>snapshot(store).combat.participants.find(row=>row.id==='priest');
const level=(row,name)=>(row.states||[]).filter(state=>state.name===name).reduce((n,state)=>n+(state.level||1),0);
async function fixture(extra={}){
 let saved=null,refuse=false;
 const persistence={async load(){return saved&&clone(saved);},async saveAtomic({state}){if(refuse)return {ok:false,error:'Refus B03'};saved=clone(state);return {ok:true};}};
 const store=createStore({persistence,storage:null});await store.ready;
 const priest=person('priest');Object.assign(priest,extra);
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[priest,person('ally')]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return {store,persistence,setRefuse(value){refuse=value;}};
}
const input=(wrathRoll,extra={})=>({actorId:'priest',targetIds:['ally'],roll:99,wrathRoll,wrathEnduranceRoll:99,
 executionId:'b3:'+wrathRoll,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
 facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6},...extra});

test('B03 — quatre règles source chiffrées, 01–05 reste inaccessible sous Q12',()=>{
 assert.deepEqual(registry.wrathDamageRules?.map(row=>[row.resultId,row.diceCount,row.fixed,row.perSin,row.enduranceDifficulty,row.extraStunnedPerNegativeSL]),[
  ['wrath:36-40',0,1,1,2,false],['wrath:51-55',1,0,1,0,false],['wrath:71-75',1,0,1,-1,false],['wrath:81-87',2,0,1,-2,true]
 ]);
 assert.equal(registry.wrathTable.find(row=>row.id==='wrath:1-5').accessibility.accessible,false);
});

for(const [wrathRoll,resultId,damageRoll,wounds,difficulty,stunned] of [
 [16,'wrath:36-40',undefined,3,2,1],[31,'wrath:51-55',4,6,0,1],
 [51,'wrath:71-75',4,6,-1,1],[61,'wrath:81-87',7,9,-2,7]
])test(`B03 — ${resultId} applique Blessures, Résistance et États canoniques`,async()=>{
 const {store}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input(wrathRoll,{wrathDamageRoll:damageRoll,wrathConsequences:'Texte libre falsifié',wrathEnduranceDifficulty:99}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.wrathTableResult.id,resultId);
 assert.equal(preview.wrathDamagePreview.wounds,wounds);
 assert.equal(preview.wrathDamagePreview.enduranceDifficulty,difficulty);
 assert.equal(preview.wrathDamagePreview.stunnedRequested,stunned);
 assert.deepEqual(snapshot(store),before,'la projection ne touche ni PV ni Péchés ni États');
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=actor(store),ally=snapshot(store).combat.participants.find(row=>row.id==='ally');
 assert.equal(priest.hp,30-wounds,'Blessures directes sans second calcul BE/PA');
 assert.equal(ally.hp,30,'le Courroux vise le prêtre et pas le destinataire');
 assert.equal(priest.extensions.v5.divine.sin,1,'quantité évaluée avec deux Péchés avant décrément');
 assert.equal(priest.extensions.v5.hasMomentum,false);
 if(stunned>5){assert.equal(level(priest,'Inconscient'),1);assert.equal(level(priest,'Sonné'),0,'conversion canonique au-delà du BE');}
 else assert.equal(level(priest,'Sonné'),1);
 const receipt=result.receipt.wrathDamageReceipt;
 assert.equal(receipt.proof.sinAtTest,2);assert.equal(receipt.sourceReceipt.sourceRefs[0].printedPage,218);
 assert.equal(receipt.enduranceTest.sl,preview.wrathDamagePreview.enduranceTest.sl);
 assert.ok(priest.states.some(state=>state.divineWrathExecutionId===preview.executionId));
 assert.equal(priest.states.some(state=>state.v5Timing?.expiry?.round===6),false,'pas d’échéance héritée de la Bénédiction');
});

test('B03 — dés manquants, hors bornes ou Résistance non résolue bloquent malgré le texte MJ',async()=>{
 const {store}=await fixture(),before=snapshot(store);
 for(const extra of [{wrathDamageRoll:undefined},{wrathDamageRoll:0},{wrathDamageRoll:11},{wrathDamageRoll:4,wrathEnduranceRoll:undefined},{wrathDamageRoll:4,wrathEnduranceRoll:101}]){
  const preview=store.previewDivineExecution(BATTLE,input(31,{...extra,wrathConsequences:'MJ a tout traité'}));
  assert.equal(preview.ready,false);
  assert.ok(preview.needsInput.some(row=>/wrath(Damage|Endurance)/.test(row.field||row.path||'')));
  assert.deepEqual(snapshot(store),before);
 }
 const skills=clone(actor(store).skills);skills.find(row=>row.name==='Résistance').status='unresolved';await store.updateParticipant('priest',{skills});
 assert.equal(store.previewDivineExecution(BATTLE,input(16)).ready,false);
});

test('B03 — réussite de Résistance, vraie réussite de Prière et immunité à Sonné',async()=>{
 for(const immune of [false,true]){
  const {store}=await fixture(immune?{extensions:{v5:{divine:{sin:2},immunities:{conditions:['Sonné']}}}}:{});
  const preview=store.previewDivineExecution(BATTLE,input(16,{roll:10,wrathEnduranceRoll:immune?99:23}));
  assert.equal(preview.ready,true,preview.error);assert.equal(preview.preview.prayer.success,true);
  const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
  assert.equal(actor(store).hp,27);assert.equal(level(actor(store),'Sonné'),0);
  assert.equal(snapshot(store).combat.participants.find(row=>row.id==='ally').caracs.CC,50,'l’effet de Prière réussi est conservé');
 }
});

test('B03 — aperçu falsifié, double clic, Undo/Redo et rechargement',async()=>{
 const {store,persistence}=await fixture(),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input(31,{wrathDamageRoll:4}));assert.equal(preview.ready,true,preview.error);
 const forged=clone(preview);forged.wrathDamagePreview.wounds=999;
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|recalculez|modifié/i);assert.deepEqual(snapshot(store),before);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);const committed=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/aperçu|calcul|changé|recalculez/i);assert.deepEqual(snapshot(store),committed);
 await store.undo();assert.deepEqual(snapshot(store).combat,before.combat);
 await store.redo();assert.deepEqual(snapshot(store).combat,committed.combat);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;assert.deepEqual(snapshot(reloaded).combat,committed.combat);
 assert.equal(snapshot(reloaded).extensions.v5.divineExecutions.at(-1).wrathDamageReceipt.damage.woundsLost,6);
});

test('B03 — refus de persistance et aperçu périmé préservent tout l’état',async()=>{
 const {store,setRefuse}=await fixture();let preview=store.previewDivineExecution(BATTLE,input(16));assert.equal(preview.ready,true,preview.error);
 const before=snapshot(store);setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview})).ok,false);assert.deepEqual(snapshot(store),before);
 setRefuse(false);await store.updateParticipant('priest',{hp:29});const changed=snapshot(store);
 await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/changé|recalculez|aperçu/i);assert.deepEqual(snapshot(store),changed);
});

test('B03 — un État restant interdit de rejouer le même identifiant après éviction du journal',async()=>{
 const {store}=await fixture(),first=store.previewDivineExecution(BATTLE,input(16));
 assert.equal((await store.applyDivineExecution(BATTLE,{preview:first})).ok,true);
 const saved=snapshot(store);saved.extensions.v5.divineExecutions=[];saved.combat.participants[0].extensions.v5.divine.sin=2;
 await store.loadFromJSON(saved);const before=snapshot(store);
 const repeated=store.previewDivineExecution(BATTLE,input(16));
 assert.equal(repeated.ready,false);assert.equal(repeated.status,'blocked');
 assert.match(repeated.error,/identifiant|État/i);assert.deepEqual(snapshot(store),before);
});
});

describe('Courroux calendaire — contrôle indépendant', () => {
// Contrôles indépendants. Sources: Courroux 6–10, L06 p.218;
// semaine impériale huit jours p.177/289 (contrôle texte + visuel séparé).
// 86400s/jour = convention d'unité outil, jamais une citation de ces pages.
const WEEK = 8 * 86400;
const COURAGE = 'divine:blessing:myrmidia:courage';
const SUN = 'divine:miracle:soleil-flamboyant';
const row = registry.wrathTable.find(item => item.id === 'wrath:6-10');
const person = (id, extra = {}) => ({
  id, name: 'Même nom', kind: 'PJ', camp: 'pj', zone: 'active', initiative: id === 'priest' ? 60 : 30,
  hp: 20, maxHp: 30, caracs: { CC:40, CT:40, F:30, E:30, I:40, Ag:40, Dex:40, Int:50, FM:50, Soc:60, M:4 },
  armor: { head:0, body:0, arms:0, legs:0 }, states: [], traits: [], equipment: [],
  skills: [{ id:PRAY_ID, name:'Prière', carac:'Soc', status:'resolved', total:60 }],
  talents: [{ id:'talent-bless', status:'resolved', rank:1, specialization:'Myrmidia' },
    { id:'talent-invoke', status:'resolved', rank:1, specialization:'Myrmidia' }],
  prayers: divineStore.getAllDivineContracts().filter(contract => contract.type === 'miracle')
    .map(contract => ({ name:contract.catalogueName, status:'resolved' })),
  extensions: { v5: { divine: { sin:0 } } }, ...extra
});
const stateOf = store => { const state = JSON.parse(store.getFullJSON()); delete state.exportedAt; return state; };
const clockOf = store => stateOf(store).extensions.v5.gameClock;
const actorOf = (store, id='priest') => stateOf(store).combat.participants.find(item => item.id === id);
const capsOf = subject => (subject.extensions?.v5?.divineEffects || []).filter(effect => effect.type === 'prayer-sl-cap');
const prayer = (extra={}) => ({
  actorId:'priest', targetIds:['ally'], roll:23, canSpeak:true,
  choices:{ range:0, targets:0, duration:0, effect:0 },
  facts:{ targets:{ ally:{ withinRange:true, ally:true } } },
  expiry:{ phase:'endOfTurn', actorId:'priest', round:6, moment:'afterEffects' }, ...extra
});
function memory() {
  let saved=null, writes=0, refuse=false;
  return {
    async load(){ return saved && clone(saved); },
    async saveAtomic({state}){ if(refuse)return {ok:false,error:'Refus indépendant'}; saved=clone(state); writes++; return {ok:true}; },
    get saved(){return clone(saved);}, get writes(){return writes;}, set refuse(value){refuse=value;}
  };
}
async function fixture({people=[person('priest'),person('ally')], extra={}, persistence=memory()}={}) {
  const store=createStore({persistence,storage:null}); await store.ready;
  const state={ schemaVersion:3, reserve:[], combat:{round:1,currentActorId:'priest',order:people.map(p=>p.id),participants:people},
    log:[], diceLines:[], extensions:{v5:{turnIndex:1}}, ...extra };
  state.extensions.v5.gameClock ||= createGameClock(state);
  await store.loadFromJSON(state);
  return {store,persistence};
}
async function impose(store,{executionId='independent-wrath-1',roll=99,note=true}={}) {
  // Q12 : le résultat bas est restauré comme sanction historique, sans nouveau jet.
  const before=stateOf(store), preview=previewHistoricalWrath(before,{executionId,roll});
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:6-10');
  assert.deepEqual(stateOf(store),before,'calculer le Courroux ne pose aucune sanction');
  const result=await applyHistoricalWrath(store,preview);
  assert.equal(result.ok,true,result.error); assert.equal(result.ready,true,result.error);
  const caps=capsOf(actorOf(store));
  assert.ok(caps.some(effect=>effect.originExecutionId===executionId),'la sanction historique6–10 doit poser son plafond autonome');
  return {preview,result,cap:caps.find(effect=>effect.originExecutionId===executionId)};
}
const step=(store,seconds,extra={})=>store.advanceCampaignTime({seconds,reason:'Temps MJ du contrôle Courroux',...extra});
async function replaceCaps(store,mutate) {
  const actor=actorOf(store), changed=clone(actor.extensions);
  changed.v5.divineEffects=changed.v5.divineEffects.map(effect=>effect.type==='prayer-sl-cap'?mutate(clone(effect)):effect);
  await store.updateParticipant(actor.id,{extensions:changed});
}
async function refuseTimeUnchanged(store,seconds=1) {
  const before=stateOf(store), result=await step(store,seconds);
  assert.equal(result.ok,false,'une donnée temporelle ambiguë doit bloquer toute la commande');
  assert.equal(result.status,'requires-input');
  assert.ok(result.needsInput?.length,'le champ à résoudre est localisé');
  assert.deepEqual(stateOf(store),before,'clock, couches, journal, révision et Undo restent inchangés');
  return result;
}

test('Courroux calendaire indépendant —6–10 historique sourcé ne requiert aucun texte MJ libre',async()=>{
  const {store}=await fixture();
  const preview=previewHistoricalWrath(stateOf(store),{roll:99,executionId:'without-note'});
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult.id,'wrath:6-10');
  const result=await applyHistoricalWrath(store,preview);
  assert.equal(result.ok,true); assert.equal(capsOf(actorOf(store)).length,1);
});
test('Courroux calendaire indépendant —16–20 automatisé, les lignes restantes conservent leurs besoins',async()=>{
  const {store}=await fixture();
  await store.setDivineSin('priest',1,{reason:'Fixture B01 à Péché positif'});
  for(const wrathRoll of [6,78]) {
    const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll}));
    if(wrathRoll===6){
      assert.equal(preview.ready,true,preview.error);
      assert.equal(preview.status,'ready');
      assert.equal(preview.wrathStatePreview.resultId,'wrath:16-20');
      assert.deepEqual(preview.wrathStatePreview.conditions.map(row=>[row.name,row.level,row.locked]),[['À Terre',1,true]]);
      continue;
    }
    assert.equal(preview.ready,false);
    assert.equal(preview.status,'requires-input');
    assert.ok(preview.needsInput.some(need=>need.field==='wrathSummonProfile'));
  }
  const lessons=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:1}));
  assert.equal(lessons.ready,false);
  assert.ok(lessons.needsInput.some(need=>(need.field||need.path||'').includes('wrathDurationRoll')),
    '11–15 exige le dé de durée explicite et ne se résout plus par texte libre');
});
test('Courroux calendaire indépendant —pose auteur sur échec, provenance et ancre immuables',async()=>{
  const {store}=await fixture(); const before=clockOf(store);
  const {cap,result}=await impose(store);
  assert.equal(result.receipt.prayer.success,false);
  assert.equal(cap.cap,0); assert.equal(cap.ruleId,'wrath:6-10:pray-sl-cap');
  assert.equal(cap.originKind,'wrath'); assert.equal(cap.wrathResultId,'wrath:6-10');
  assert.equal(cap.targetId,'priest'); assert.deepEqual(cap.source,row.source);
  assert.ok(cap.sourceReceipt && cap.wrathProof);
  assert.equal(cap.wrathProof.schemaVersion,1); assert.equal(cap.wrathProof.wrath.resultId,'wrath:6-10');
  assert.equal(cap.wrathProof.wrath.modifiedRoll,6);
  assert.deepEqual(cap.clockAnchor,{campaignSeconds:before.campaignSeconds,clockRevision:before.revision,lastEventId:before.lastEvent?.id??null});
  assert.equal(cap.deadline.kind,'campaign-time'); assert.equal(cap.deadline.atSeconds,WEEK);
  assert.equal(cap.duration.days,8); assert.equal(cap.duration.seconds,WEEK);
  assert.equal(cap.duration.conversionPolicyId,'imperial-week-8-days');
  assert.equal(cap.duration.secondPolicyId,'campaign-day-86400s');
  for(const key of ['prayerId','executionId','expiry','statModifiers','apModifiers','conditionStateIds'])assert.equal(Object.hasOwn(cap,key),false,key);
  assert.equal(capsOf(actorOf(store,'ally')).length,0);
  await step(store,1); assert.deepEqual(capsOf(actorOf(store))[0].clockAnchor,cap.clockAnchor);
});
test('Courroux calendaire indépendant —pas de plafond rétroactif au Test déclencheur réussi',async()=>{
  const {store}=await fixture();
  const {result}=await impose(store,{roll:20});
  assert.equal(result.receipt.prayer.success,true);
  assert.equal(result.receipt.prayer.sl,4,'la nouvelle conséquence ne réécrit pas le Test déjà résolu');
  const preview=store.previewDivineExecution(COURAGE,prayer());
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.preview.prayer.success,true); assert.equal(preview.preview.prayer.sl,0);
  assert.equal(preview.preview.extensionBudget.available,0);
});
test('Courroux calendaire indépendant —jet choisi, critique et détails bruts préservés',async()=>{
  const {store}=await fixture();
  const raw=store.previewDivineExecution(COURAGE,prayer({roll:22})).preview.prayer;
  await impose(store);
  const limited=store.previewDivineExecution(COURAGE,prayer({roll:22})).preview.prayer;
  for(const key of ['roll','initialRoll','optionId','reversed','success','critical','fumble','details'])assert.deepEqual(limited[key],raw[key],key);
  assert.equal(raw.sl,5); assert.equal(limited.sl,0); assert.equal(limited.zeroOutcome,'marginalSuccess');
});
test('Courroux calendaire indépendant —échec et déclenchement Courroux restent inchangés',async()=>{
  const {store}=await fixture(); await impose(store);
  const preview=store.previewDivineExecution(COURAGE,prayer({roll:87}));
  assert.equal(preview.ready,true,preview.error); assert.equal(preview.preview.prayer.success,false);
  assert.equal(preview.preview.prayer.sl,-2); assert.equal(preview.preview.wrath.triggered,false);
  await store.setDivineSin('priest',1,{reason:'Fixture B01 : maladresse avec Péché positif'});
  const fumble=store.previewDivineExecution(COURAGE,prayer({roll:99,wrathRoll:51}));
  assert.equal(fumble.ready,true,fumble.error); assert.equal(fumble.preview.prayer.sl,-5);
  assert.equal(fumble.preview.wrath.triggered,true); assert.equal(fumble.preview.wrath.reason,'fumble');
});
test('Courroux calendaire indépendant —budget nul refuse une extension et Soleil garde son effet de base',async()=>{
  const {store}=await fixture(); await impose(store);
  const extra=store.previewDivineExecution(COURAGE,prayer({choices:{targets:1}}));
  assert.equal(extra.ready,false); assert.ok(extra.needsInput.some(need=>need.field==='choices'));
  const sun=store.previewDivineExecution(SUN,prayer({expiry:undefined,facts:{targets:{ally:{withinRange:true,nonMyrmidian:true,lookingAtPriest:true}}}}));
  assert.equal(sun.ready,true,sun.error); assert.equal(sun.preview.prayer.sl,0);
  assert.equal(sun.preview.effects.find(effect=>effect.type==='condition').level,1,'aucun palier issu des DR bruts');
});
test('Courroux calendaire indépendant —Désavantage légal conservé sous plafond',async()=>{
  const {store}=await fixture(); await impose(store);
  await store.updateParticipant('priest',{states:[{id:'besmirched',key:'souille',name:'Souillé',level:1}]});
  const preview=store.previewDivineExecution(COURAGE,prayer());
  assert.equal(preview.ready,true,preview.error); assert.equal(preview.preview.prayer.optionId,'reverse');
  assert.equal(preview.preview.prayer.initialRoll,23); assert.equal(preview.preview.prayer.roll,32);
  assert.equal(preview.preview.prayer.success,true); assert.equal(preview.preview.prayer.sl,0);
});
test('Courroux calendaire indépendant —Action Prière plafonnée, Action Calme inchangée',async()=>{
  const {store}=await fixture(); await impose(store); const actor=actorOf(store);
  const run=(name,skillId,attr)=>previewResolution({actor,action:{id:'skill-action',type:'skill',base:60,attr,note:name,
    extensions:{fiche:{skillId}}},roll:23,v5:{kind:'test',context:{skillId,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:attr==='Soc'}}});
  const pray=run('Prière',PRAY_ID,'Soc'); assert.equal(pray.test.success,true); assert.equal(pray.test.sl,0);
  assert.equal(run('Calme','skill-43_61_6c_6d_65-base','FM').test.sl,4);
});
test('Courroux calendaire indépendant —méditation Prière réussie ne requiert que1d10 de durée',async()=>{
  const {store}=await fixture(); await impose(store); const actor=actorOf(store);
  actor.talents.push({id:'talent-mind-over-body',status:'resolved',rank:1});
  const preview=previewMagicMeditation(actor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[3]});
  assert.equal(preview.ready,true,preview.error); assert.equal(preview.success,true);
  assert.equal(preview.test.sl,0); assert.deepEqual(preview.durationRolls,[3]); assert.equal(preview.effect.duration,'3 heures');
});
test('Courroux calendaire indépendant —Terminer la prière source préserve la sanction autonome',async()=>{
  const {store}=await fixture(); const {cap}=await impose(store,{roll:20});
  await store.endDivinePrayer(cap.originExecutionId,{reason:'Fin du bonus de la bénédiction'});
  assert.equal(capsOf(actorOf(store)).length,1);
  assert.equal(actorOf(store,'ally').caracs.CC,40);
  const preview=store.previewDivineExecution(BATTLE,prayer());assert.equal(preview.ready,true,preview.error);assert.equal(preview.preview.prayer.sl,0);
});
test('Courroux calendaire indépendant —expiration exacte huit jours, retry inerte',async()=>{
  const {store,persistence}=await fixture(); await impose(store); await step(store,WEEK-1);
  assert.equal(capsOf(actorOf(store)).length,1);
  const input={seconds:1,reason:'Seconde exacte de fin',eventId:'clock-v1:1:wrath-boundary',clockBaseRevision:1};
  const result=await store.advanceCampaignTime(input);
  assert.equal(result.ok,true);assert.equal(clockOf(store).campaignSeconds,WEEK);assert.equal(capsOf(actorOf(store)).length,0);
  const after=stateOf(store), writes=persistence.writes;
  assert.equal((await store.advanceCampaignTime(input)).status,'duplicate');
  assert.deepEqual(stateOf(store),after);assert.equal(persistence.writes,writes);
  const ordinary=store.previewDivineExecution(COURAGE,prayer());assert.equal(ordinary.preview.prayer.sl,4);
});
test('Courroux calendaire indépendant —couches successives ne cumulent pas et gardent leurs échéances propres',async()=>{
  const {store}=await fixture();const first=await impose(store);await step(store,10);
  const second=await impose(store,{executionId:'independent-wrath-2'});
  assert.notEqual(first.cap.id,second.cap.id);assert.equal(second.cap.deadline.atSeconds,WEEK+10);
  assert.equal(capsOf(actorOf(store)).length,2);await step(store,WEEK-10);
  assert.equal(capsOf(actorOf(store)).length,1);assert.equal(store.previewDivineExecution(COURAGE,prayer()).preview.prayer.sl,0);
  await step(store,10);assert.equal(capsOf(actorOf(store)).length,0);
});
test('Courroux calendaire indépendant —reload simulé, Undo et Redo restaurent heure et sanction ensemble',async()=>{
  const {store,persistence}=await fixture();await impose(store);const before=stateOf(store);await step(store,WEEK);
  const after=stateOf(store);const reloaded=createStore({persistence,storage:null});await reloaded.ready;
  assert.equal(capsOf(actorOf(reloaded)).length,0);await reloaded.undo();
  assert.deepEqual(clockOf(reloaded),before.extensions.v5.gameClock);assert.deepEqual(capsOf(actorOf(reloaded)),capsOf(before.combat.participants[0]));
  await reloaded.redo();assert.deepEqual(clockOf(reloaded),after.extensions.v5.gameClock);assert.equal(capsOf(actorOf(reloaded)).length,0);
});
test('Courroux calendaire indépendant —échec sauvegarde pose et expiration sans mutation',async()=>{
  const {store,persistence}=await fixture();
  const preview=previewHistoricalWrath(stateOf(store));assert.equal(preview.ready,true,preview.error);
  let before=stateOf(store);persistence.refuse=true;assert.equal((await applyHistoricalWrath(store,preview)).ok,false);
  assert.deepEqual(stateOf(store),before);persistence.refuse=false;
  await applyHistoricalWrath(store,preview);assert.equal(capsOf(actorOf(store)).length,1);
  before=stateOf(store);persistence.refuse=true;assert.equal((await step(store,WEEK)).ok,false);assert.deepEqual(stateOf(store),before);
});
test('Courroux calendaire indépendant —aperçu périmé par temps refusé sans pose',async()=>{
  const {store}=await fixture();await store.setDivineSin('priest',1,{reason:'Fixture B01 : refus périmé'});
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);await step(store,1);const before=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/changé|recalculez|horloge/i);assert.deepEqual(stateOf(store),before);
});
for(const mode of ['legacy','v5'])test('Courroux calendaire indépendant —vrai Round '+mode+' expire le cap sans temps par combattant',async()=>{
  const {store}=await fixture();await impose(store);await step(store,WEEK-10);
  const engine=createCombatEngine(store), before=stateOf(store);
  const turn=()=>mode==='legacy'?store.nextTurn():engine.nextTurn();
  if(mode==='v5'){assert.equal(engine.previewNextTurn().ready,true);assert.deepEqual(stateOf(store),before);}
  await turn();assert.equal(clockOf(store).campaignSeconds,WEEK-10);assert.equal(capsOf(actorOf(store)).length,1);
  await turn();assert.equal(clockOf(store).campaignSeconds,WEEK);assert.equal(capsOf(actorOf(store)).length,0);
});
test('Courroux calendaire indépendant —Round manuel et phase matching ne retirent jamais le cap',async()=>{
  const {store}=await fixture();const {cap}=await impose(store);await store.setRoundTurn(100,'priest');
  assert.equal(clockOf(store).campaignSeconds,0);assert.deepEqual(capsOf(actorOf(store)),[cap]);
  const malformed=actorOf(store);malformed.extensions.v5.divineEffects[0].expiry={phase:'endOfTurn',round:1,actorId:'priest',moment:'afterEffects'};
  const result=expireDivineEffects(malformed,{phase:'endOfTurn',round:100,actorId:'priest',moment:'afterEffects'});
  assert.equal(capsOf(result.participant).length,1,'une couche deadline ne doit jamais suivre son ancien expiry phase');
});
test('Courroux calendaire indépendant —preuve autonome survit à la troncature de l’historique des Prières',async()=>{
  const {store}=await fixture();await impose(store);
  const state=stateOf(store);state.extensions.v5.divineExecutions=[];const reloaded=(await fixture({extra:state})).store;
  assert.equal(reloaded.previewDivineExecution(COURAGE,prayer()).preview.prayer.sl,0);
  assert.equal((await step(reloaded,WEEK)).ok,true);assert.equal(capsOf(actorOf(reloaded)).length,0);
});
test('Courroux calendaire indépendant —deux PNJ même nom et modèle restent des instances distinctes',async()=>{
  const a=person('priest',{kind:'PNJ',profileId:'same-template'}),b=person('ally',{kind:'PNJ',profileId:'same-template'});
  const {store}=await fixture({people:[a,b]});await impose(store);assert.equal(capsOf(actorOf(store,'ally')).length,0);
});
test('Courroux calendaire indépendant —pose et expiration des vrais miroirs durables dans la même commande',async()=>{
  const priest=person('priest',{persistentCharacterId:'hero'});
  const persistent={...clone(priest),id:'hero'};delete persistent.persistentCharacterId;
  const suspendedCopy={...clone(priest),id:'suspended-copy'};
  const scene={id:'paused-scene',status:'suspended',round:1,currentActorId:'suspended-copy',order:['suspended-copy'],participants:[suspendedCopy]};
  const {store}=await fixture({people:[priest,person('ally')],extra:{persistentCharacters:[persistent],suspendedScenes:[scene]}});
  const {cap}=await impose(store);const state=stateOf(store);
  assert.deepEqual(capsOf(state.persistentCharacters[0]),[cap]);assert.deepEqual(capsOf(state.suspendedScenes[0].participants[0]),[cap]);
  assert.equal(cap.targetId,'priest','la provenance ne devient pas l’id de sa projection');
  await step(store,WEEK);const after=stateOf(store);
  assert.equal(capsOf(after.persistentCharacters[0]).length,0);assert.equal(capsOf(after.suspendedScenes[0].participants[0]).length,0);
});
for(const [name,mutate] of [
  ['deadline fractionnaire',cap=>({...cap,deadline:{kind:'campaign-time',atSeconds:WEEK+0.5}})],
  ['ancre absente',cap=>{delete cap.clockAnchor;return cap;}],
  ['preuve Courroux absente',cap=>{delete cap.wrathProof;return cap;}],
  ['preuve Courroux fausse',cap=>{cap.wrathProof.wrath.modifiedRoll=11;return cap;}],
  ['double expiry phase',cap=>({...cap,expiry:{phase:'endOfRound',round:1}})],
  ['bonus caractéristique clandestin',cap=>({...cap,statModifiers:{CC:50}})],
  ['deadline à origine déplacée',cap=>({...cap,deadline:{kind:'campaign-time',atSeconds:WEEK+1}})]
])test('Courroux calendaire indépendant —refus atomique '+name,async()=>{
  const {store}=await fixture();await impose(store);await replaceCaps(store,mutate);await refuseTimeUnchanged(store);
});
test('Courroux calendaire indépendant —deadline Bataille valide est retirée à son échéance par l’horloge',async()=>{
  const {store}=await fixture();const p=store.previewDivineExecution(BATTLE,prayer());await store.applyDivineExecution(BATTLE,{preview:p});
  const ally=actorOf(store,'ally'),extensions=clone(ally.extensions);extensions.v5.divineEffects[0].deadline={kind:'campaign-time',atSeconds:60};
  await store.updateParticipant('ally',{extensions});
  assert.equal((await step(store,59)).status,'applied');assert.equal(actorOf(store,'ally').extensions.v5.divineEffects.length,1);assert.equal(actorOf(store,'ally').caracs.CC,50);
  assert.equal((await step(store,1)).status,'applied');assert.equal(actorOf(store,'ally').extensions.v5.divineEffects.length,0);assert.equal(actorOf(store,'ally').caracs.CC,40);
});
test('Courroux calendaire indépendant —deadline divine illisible bloque l’avance sans mutation',async()=>{
  const {store}=await fixture();const p=store.previewDivineExecution(BATTLE,prayer());await store.applyDivineExecution(BATTLE,{preview:p});
  const ally=actorOf(store,'ally'),extensions=clone(ally.extensions);extensions.v5.divineEffects[0].deadline={kind:'campaign-time',atSeconds:'60'};
  await store.updateParticipant('ally',{extensions});await refuseTimeUnchanged(store,60);
});
test('Courroux calendaire indépendant —migration sans clock refuse l’origine du cap existant',async()=>{
  const {store}=await fixture();await impose(store);const raw=stateOf(store);delete raw.extensions.v5.gameClock;const before=clone(raw);
  assert.throws(()=>migrateSnapshot(raw),/horloge|clock|ancre|calendaire/i);assert.deepEqual(raw,before);
});
test('Courroux calendaire indépendant —dépassement safe integer à la pose refusé sans effet partiel',async()=>{
  const base={schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest'),person('ally')]},extensions:{v5:{turnIndex:1}},log:[],diceLines:[]};
  const advanced=advanceGameClock(createGameClock(base),{id:'clock-v1:0:large-cursor',baseRevision:0,kind:'campaign-time-advance',seconds:Number.MAX_SAFE_INTEGER-WEEK+1,reason:'Curseur borne'});
  base.extensions.v5.gameClock=advanced.clock;const {store}=await fixture({extra:base}),before=stateOf(store);
  const preview=previewHistoricalWrath(stateOf(store));
  assert.equal(preview.ready,false,'addition de la durée hors entier sûr refusée avant confirmation');assert.deepEqual(stateOf(store),before);
});
test('Courroux calendaire indépendant —helper commun pur et retour d’expireur existent',async()=>{
  let module=null;try{module=await import('../../../js/core/v5-divine-prayer-caps.js');}catch{}
  assert.equal(typeof module?.applyPrayerSLCaps,'function');
  assert.equal(typeof divineStore.expireDivineAtClock,'function');
  const {store}=await fixture();await impose(store);const actor=actorOf(store);
  const raw={ruleVersion:'v5-test-2026-10-08.1',roll:23,initialRoll:23,optionId:'keep',reversed:false,success:true,sl:4,critical:false,fumble:false,zeroOutcome:null,details:{baseSl:4}};
  const before=clone({actor,raw}),result=module.applyPrayerSLCaps(actor,raw);
  assert.equal(result.ok,true);assert.equal(result.test.sl,0);assert.equal(result.caps[0].rawSL,4);assert.equal(result.caps[0].effectiveSL,0);
  assert.deepEqual({actor,raw},before);
});

test('Courroux calendaire indépendant —réserve profil sans states garde le cap lié par fiche',async()=>{
  const linked=id=>person(id,{extensions:{ficheId:'sheet-hero',v5:{divine:{sin:0}}}});
  const reserve=linked('reserve-copy');delete reserve.states;
  const {store}=await fixture({people:[linked('priest'),person('ally')],extra:{reserve:[reserve]}});
  const {cap}=await impose(store),state=stateOf(store);
  assert.deepEqual(capsOf(state.reserve[0]),[cap],'la pose atteint le profil de réserve de même identité attestée');
  assert.equal(cap.targetId,'priest');
  assert.equal((await step(store,WEEK)).ok,true);assert.equal(capsOf(stateOf(store).reserve[0]).length,0);
});
test('Courroux calendaire indépendant —miroir scène active et sujets hors scène à la frontière globale',async()=>{
  const people=[person('priest'),person('ally')];
  const activeScene={id:'active-cap-scene',status:'active',round:1,currentActorId:'priest',order:['priest','ally'],participants:clone(people),extensions:{v5:{turnIndex:1}}};
  const {store}=await fixture({people,extra:{activeScene}});const {cap}=await impose(store);
  assert.deepEqual(capsOf(stateOf(store).activeScene.participants.find(p=>p.id==='priest')),[cap]);
  await step(store,WEEK);assert.equal(capsOf(actorOf(store)).length,0);
  assert.equal(capsOf(stateOf(store).activeScene.participants.find(p=>p.id==='priest')).length,0);
});
test('Courroux calendaire indépendant —divergence de caps durables bloque avant toute expiration',async()=>{
  const priest=person('priest',{persistentCharacterId:'hero'}),persistent={...clone(priest),id:'hero'};delete persistent.persistentCharacterId;
  const {store}=await fixture({people:[priest,person('ally')],extra:{persistentCharacters:[persistent]}});
  await impose(store);
  await store.executeCommand('independent-mirror-divergence',draft=>{
    draft.persistentCharacters[0].extensions.v5.divineEffects=[];
    return draft;
  });
  const result=await refuseTimeUnchanged(store,WEEK);
  assert.match(result.needsInput.map(need=>need.message).join(' '),/diverg|copie|miroir|identité/i);
});
test('Courroux calendaire indépendant —cap invalide bloque aussi le sort qui devait expirer',async()=>{
  const {store}=await fixture();await impose(store);
  await store.applySpellEffects('ally',{spellId:'atomic-wrath-control',spellName:'Sort témoin',duration:'1 minute',statModifiers:{CC:10}});
  assert.equal(actorOf(store,'ally').caracs.CC,50);
  await replaceCaps(store,cap=>({...cap,deadline:{kind:'campaign-time',atSeconds:WEEK+1}}));
  await refuseTimeUnchanged(store,60);assert.equal(actorOf(store,'ally').caracs.CC,50);
});
async function clockFixture() {
  assert.equal(typeof divineStore.expireDivineAtClock,'function','adaptateur divin calendaire absent');
  const {store}=await fixture();await impose(store);
  const state=stateOf(store),fromClock=clone(state.extensions.v5.gameClock);
  const advanced=advanceGameClock(fromClock,{id:'clock-v1:'+fromClock.revision+':independent-divine-adapter',
    baseRevision:fromClock.revision,kind:'campaign-time-advance',seconds:WEEK,reason:'Intervalle attesté indépendant'});
  assert.equal(advanced.ok,true);
  const candidate=clone(state);candidate.extensions.v5.gameClock=clone(advanced.clock);
  return {state,candidate,options:{fromClock,toClock:advanced.clock,receipt:advanced.receipt}};
}
test('Courroux calendaire indépendant —expireur pur valide le replay puis retire exactement le cap',async()=>{
  const {candidate,options}=await clockFixture(),before=clone({candidate,options});
  const result=divineStore.expireDivineAtClock(candidate,options);
  assert.equal(result.ok,true);assert.equal(result.status,'applied');
  assert.equal(capsOf(result.state.combat.participants.find(p=>p.id==='priest')).length,0);
  assert.equal(result.removed.length,1);assert.equal(result.removed[0].participantId,'priest');
  assert.ok(result.removed[0].effectId);assert.match(result.removed[0].path,/combat.participants/);
  assert.deepEqual(result.state.extensions.v5.gameClock,options.toClock,'l’expireur ne fabrique pas de clock');
  assert.deepEqual({candidate,options},before,'expireur purement calculé sans mutation des entrées');
});
for(const [name,mutate] of [
  ['from absent',(candidate,options)=>{delete options.fromClock;}],
  ['to non attesté',(candidate,options)=>{options.toClock.campaignSeconds++;candidate.extensions.v5.gameClock=clone(options.toClock);}],
  ['reçu différent',(candidate,options)=>{options.receipt.resultRevision++;}],
  ['snapshot sans clock acceptée',(candidate)=>{delete candidate.extensions.v5.gameClock;}],
  ['combat candidat incompatible',(candidate)=>{candidate.combat.round=100;}]
])test('Courroux calendaire indépendant —expireur refuse '+name+' sans sortie partielle',async()=>{
  const {candidate,options}=await clockFixture();mutate(candidate,options);const before=clone({candidate,options});
  const result=divineStore.expireDivineAtClock(candidate,options);
  assert.equal(result.ok,false);assert.equal(result.status,'requires-input');assert.equal(result.state,null);
  assert.deepEqual(result.removed,[]);assert.ok(result.needsInput.length);
  assert.deepEqual({candidate,options},before);
});
test('Courroux calendaire indépendant —cap déjà échu au curseur de départ exige résolution, sans réancrage',async()=>{
  const {candidate,options}=await clockFixture();
  const later=advanceGameClock(options.toClock,{id:'clock-v1:1:after-overdue',baseRevision:1,kind:'campaign-time-advance',seconds:1,reason:'Refus de la couche déjà échue'});
  candidate.extensions.v5.gameClock=clone(later.clock);
  const before=clone(candidate),result=divineStore.expireDivineAtClock(candidate,{fromClock:options.toClock,toClock:later.clock,receipt:later.receipt});
  assert.equal(result.ok,false);assert.equal(result.state,null);assert.deepEqual(result.removed,[]);
  assert.ok(result.needsInput.some(need=>/échu|dépass|départ|origine|antéri/i.test(need.message)));
  assert.deepEqual(candidate,before);
});

test('Courroux calendaire indépendant —capture clock exacte revalidée même à localRevision inchangée',async()=>{
  const {store}=await fixture();
  await store.setDivineSin('priest',1,{reason:'Fixture B01 : capture exacte de clock'});
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  const candidate=stateOf(store),clock=candidate.extensions.v5.gameClock;
  const advanced=advanceGameClock(clock,{id:'clock-v1:'+clock.revision+':same-local-revision',
    baseRevision:clock.revision,kind:'campaign-time-advance',seconds:1,reason:'Horloge réellement distincte'});
  assert.equal(advanced.ok,true);candidate.extensions.v5.gameClock=advanced.clock;const before=clone(candidate);
  assert.throws(()=>divineStore.applyStoreDivine(candidate,BATTLE,{preview}),/changé|recalculez|horloge|clock/i);
  assert.deepEqual(candidate,before);
});

test('Courroux calendaire adversarial —ordre des clés JSON ne change pas une source canonique',async()=>{
  const {store}=await fixture();await impose(store);const actor=actorOf(store);
  const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reorder(value[key])])):value;
  const reordered=reorder(actor),before=clone(reordered),{applyPrayerSLCaps}=await import('../../../js/core/v5-divine-prayer-caps.js');
  const result=applyPrayerSLCaps(reordered,{success:true,sl:4});
  assert.equal(result.ok,true,'l’ordre des clés transportées par RTDB ne modifie pas la règle');
  assert.equal(result.test.sl,0);assert.deepEqual(reordered,before);
});
test('Courroux calendaire adversarial —RTDB restaure uniquement lastEventId null initial attesté',async()=>{
  const {store}=await fixture();const {cap}=await impose(store);
  assert.equal(cap.clockAnchor.clockRevision,0);assert.equal(cap.clockAnchor.lastEventId,null);
  const {validateSyncDocument}=await import('../../../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../../../js/core/sync-session.js');
  const canonical=validateSyncDocument({revision:0,state:stateOf(store)}),wire=clone(canonical);
  const wireCap=wire.state.combat.participants.find(p=>p.id==='priest').extensions.v5.divineEffects.find(e=>e.type==='prayer-sl-cap');
  delete wireCap.clockAnchor.lastEventId;
  const before=clone(wire),decoded=normalizeRemoteDocument(wire);
  assert.deepEqual(capsOf(decoded.state.combat.participants.find(p=>p.id==='priest'))[0].clockAnchor,cap.clockAnchor);
  assert.deepEqual(wire,before,'normaliser le transport ne modifie pas le payload reçu');
});
test('Courroux calendaire adversarial —import local incomplet ne fabrique pas lastEventId null',async()=>{
  const {store}=await fixture();await impose(store);const state=stateOf(store);
  const cap=capsOf(state.combat.participants.find(p=>p.id==='priest'))[0];delete cap.clockAnchor.lastEventId;
  const {sanitizeMagicEnvelope}=await import('../../../js/core/sanitize.js');
  const {validatePrayerSLCaps}=await import('../../../js/core/v5-divine-prayer-caps.js');
  const local=sanitizeMagicEnvelope(state),actor=local.combat.participants.find(p=>p.id==='priest');
  assert.equal(Object.hasOwn(capsOf(actor)[0].clockAnchor,'lastEventId'),false);
  assert.equal(validatePrayerSLCaps(actor).ok,false,'la réparation distante ne devient pas une permission d’import local');
});
for(const [name,foreign] of [['ward',{ward:2}],['testModifiers',{testModifiers:{all:5}}]])test('Courroux calendaire adversarial —champ mécanique étranger '+name+' refusé',async()=>{
  const {store}=await fixture();await impose(store);
  await replaceCaps(store,cap=>({...cap,...foreign}));await refuseTimeUnchanged(store);
});
test('Courroux calendaire adversarial —ancre de révision future ne peut précéder le curseur réel',async()=>{
  const {store}=await fixture();await impose(store);
  await replaceCaps(store,cap=>({...cap,clockAnchor:{...cap.clockAnchor,clockRevision:100,lastEventId:'clock-v1:99:future-anchor'}}));
  await refuseTimeUnchanged(store);
});
test('Courroux calendaire adversarial —copier une sanction sur un autre sujet ne lui transfère pas sa propriété',async()=>{
  const {store}=await fixture();const {cap}=await impose(store),ally=actorOf(store,'ally');
  await store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...ally.extensions.v5,divineEffects:[clone(cap)]}}});
  const preview=store.previewDivineExecution(COURAGE,prayer({actorId:'ally',targetIds:['ally'],
    expiry:{phase:'endOfTurn',round:6,actorId:'ally'},facts:{targets:{ally:{withinRange:true,ally:true}}}}));
  assert.equal(preview.ready,false,'une source et un subjectKey d’un tiers doivent bloquer ce Test');
  assert.ok(preview.needsInput?.length);
  await refuseTimeUnchanged(store);
});
for(const mode of ['legacy','v5'])test('Courroux calendaire adversarial —deadline calendaire protégée des phases de Tour '+mode,async()=>{
  const {store}=await fixture();const preview=store.previewDivineExecution(BATTLE,prayer());await store.applyDivineExecution(BATTLE,{preview});
  const ally=actorOf(store,'ally'),extensions=clone(ally.extensions);
  extensions.v5.divineEffects[0].deadline={kind:'campaign-time',atSeconds:60};
  extensions.v5.divineEffects[0].expiry={phase:'endOfTurn',round:1,actorId:'priest',moment:'afterEffects'};
  await store.updateParticipant('ally',{extensions});
  const result=await (mode==='legacy'?store.nextTurn():createCombatEngine(store).nextTurn());
  assert.notEqual(result?.ok,false);assert.notEqual(result?.ready,false);
  assert.equal(actorOf(store,'ally').extensions.v5.divineEffects.length,1,'une phase de Tour ne retire pas une couche qui porte une échéance calendaire');
});
test('Courroux calendaire adversarial —expireur divin refuse un miroir durable vide sans aide du processeur magique',async()=>{
  const priest=person('priest',{persistentCharacterId:'hero'}),persistent={...clone(priest),id:'hero'};delete persistent.persistentCharacterId;
  const {store}=await fixture({people:[priest,person('ally')],extra:{persistentCharacters:[persistent]}});
  await impose(store);const state=stateOf(store);state.persistentCharacters[0].extensions.v5.divineEffects=[];
  const fromClock=clone(state.extensions.v5.gameClock),advanced=advanceGameClock(fromClock,{id:'clock-v1:0:missing-mirror',
    baseRevision:0,kind:'campaign-time-advance',seconds:WEEK,reason:'Préflight miroir calendaire'});
  state.extensions.v5.gameClock=advanced.clock;const before=clone(state);
  const result=divineStore.expireDivineAtClock(state,{fromClock,toClock:advanced.clock,receipt:advanced.receipt});
  assert.equal(result.ok,false);assert.equal(result.state,null);assert.deepEqual(state,before);
});
test('Courroux calendaire adversarial —méditation dont Prière est résolue par nom sans ID reste plafonnée',async()=>{
  const {store}=await fixture();await impose(store);const actor=actorOf(store);
  for(const skill of actor.skills)delete skill.id;
  actor.talents.push({id:'talent-mind-over-body',status:'resolved',rank:1});
  const result=previewMagicMeditation(actor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[3]});
  assert.equal(result.ready,true,result.error);assert.equal(result.test.success,true);assert.equal(result.test.sl,0);
});

for(const [name,mutate] of [
  ['maladresse impossible sur23',cap=>{cap.wrathProof.prayer.initialRoll=23;cap.wrathProof.prayer.roll=23;
    cap.wrathProof.prayer.fumble=true;cap.wrathProof.prayer.success=false;cap.wrathProof.trigger.fumble=true;cap.wrathProof.trigger.sinThreshold=false;return cap;}],
  ['duration.value contradictoire',cap=>{cap.duration.value=2;return cap;}],
  ['duration.sourceUnit contradictoire',cap=>{cap.duration.sourceUnit='hours';return cap;}],
  ['identifiant sans lien à origine',cap=>{cap.id='prayer-sl-cap:another-origin';return cap;}]
])test('Courroux calendaire attestation —'+name+' refusé',async()=>{
  const {store}=await fixture();await impose(store);await replaceCaps(store,mutate);await refuseTimeUnchanged(store);
});

for(const mode of ['ancre-positive','source-forgée'])test('Courroux calendaire codec strict —ne répare pas '+mode,async()=>{
  const {store}=await fixture();if(mode==='ancre-positive')await step(store,1);await impose(store);
  const wire={revision:0,state:stateOf(store)},cap=capsOf(wire.state.combat.participants.find(p=>p.id==='priest'))[0];
  delete cap.clockAnchor.lastEventId;
  if(mode==='source-forgée')cap.source.document='Livre FR V4.pdf';
  const before=clone(wire),{normalizeRemoteDocument}=await import('../../../js/core/sync-session.js');
  let decoded;
  try{decoded=normalizeRemoteDocument(wire);}
  catch(error){assert.match(error.message,/source|sanction|cap|clock|calendaire|reçu|ancre|invalid/i);assert.deepEqual(wire,before);return;}
  const actor=decoded.state.combat.participants.find(p=>p.id==='priest');
  assert.equal(Object.hasOwn(capsOf(actor)[0].clockAnchor,'lastEventId'),false,'le null n’est reconstruit que pour la forme initiale canonique attestée');
  const {validatePrayerSLCaps}=await import('../../../js/core/v5-divine-prayer-caps.js');
  assert.equal(validatePrayerSLCaps(actor).ok,false);assert.deepEqual(wire,before);
});

test('Courroux calendaire opposition —défenseur Prière plafonné avant comparaison avec jets et réussite conservés',async()=>{
  const {store}=await fixture();await impose(store);const target=actorOf(store),actor=actorOf(store,'ally');
  const input={actor,target,action:{id:'opposed-calm',type:'opposition',base:60,attr:'FM',note:'Calme',
    extensions:{fiche:{skillId:'skill-43_61_6c_6d_65-base'}}},roll:45,
    defense:{base:60,attr:'Soc',label:'Prière',roll:23,extensions:{fiche:{skillId:PRAY_ID}},
      v5:{kind:'test',context:{skillId:PRAY_ID,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:true}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}};
  const raw=clone(input);raw.target.extensions.v5.divineEffects=raw.target.extensions.v5.divineEffects.filter(e=>e.type!=='prayer-sl-cap');
  const ordinary=previewResolution(raw),limited=previewResolution(input);
  assert.equal(ordinary.opposition.defender.sl,4);assert.equal(limited.opposition.defender.sl,0);
  for(const key of ['roll','initialRoll','optionId','reversed','success','critical','fumble','details'])
    assert.deepEqual(limited.opposition.defender[key],ordinary.opposition.defender[key],key);
  assert.equal(limited.opposition.defender.success,true);
  assert.equal(limited.opposition.netSl,2,'opposition calculée sur2DR contre0, pas contre les4DR bruts');
  assert.equal(limited.opposition.winner,'attacker');
});
test('Courroux calendaire opposition —trace DR bruts de l’option inversée réellement choisie',async()=>{
  const {store}=await fixture();await impose(store);const actor=actorOf(store);
  const result=previewResolution({actor,action:{id:'pray-choice',type:'skill',base:60,attr:'Soc',note:'Prière',
    extensions:{fiche:{skillId:PRAY_ID}}},roll:32,v5:{kind:'test',choice:'reverse',
    advantageSources:[{id:'explicit-prayer-advantage',label:'Choix favorable explicite'}],
    context:{skillId:PRAY_ID,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:true}}});
  assert.equal(result.test.initialRoll,32);assert.equal(result.test.optionId,'reverse');assert.equal(result.test.roll,23);
  assert.equal(result.test.success,true);assert.equal(result.test.sl,0);
  assert.equal(result.prayerSLAdjustment.rawSL,4,'le choix initial32 avait3DR, le jet choisi23 a4DR');
  assert.equal(result.prayerSLAdjustment.effectiveSL,0);
});

test('Courroux calendaire codec historique —ancre initiale null conservée quand la clock courante a avancé',async()=>{
  const {store}=await fixture();const {cap}=await impose(store);await step(store,7*86400);
  assert.equal(clockOf(store).revision,1);assert.equal(capsOf(actorOf(store))[0].clockAnchor.lastEventId,null);
  const {validateSyncDocument}=await import('../../../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../../../js/core/sync-session.js');
  const wire=validateSyncDocument({revision:0,state:stateOf(store)});
  const actor=wire.state.combat.participants.find(p=>p.id==='priest');
  delete capsOf(actor)[0].clockAnchor.lastEventId;
  const before=clone(wire),decoded=normalizeRemoteDocument(wire),received=decoded.state.combat.participants.find(p=>p.id==='priest');
  assert.deepEqual(capsOf(received)[0].clockAnchor,cap.clockAnchor,'la pose à0 reste historique quand le curseur courant devient positif');
  const {validatePrayerSLCaps}=await import('../../../js/core/v5-divine-prayer-caps.js');
  assert.equal(validatePrayerSLCaps(received,{clock:decoded.state.extensions.v5.gameClock}).ok,true);
  assert.deepEqual(wire,before);
});

for(const [name,positiveAnchor,mutate] of [
  ['null sur ancre positive',true,cap=>{cap.clockAnchor.lastEventId=null;return cap;}],
  ['ID vide sur ancre positive',true,cap=>{cap.clockAnchor.lastEventId='';return cap;}],
  ['ID texte sur ancre initiale',false,cap=>{cap.clockAnchor.lastEventId='clock-v1:0:impossible-initial-receipt';return cap;}],
  ['seconde non nulle sur ancre initiale',false,cap=>{cap.clockAnchor.campaignSeconds=1;cap.deadline.atSeconds=WEEK+1;return cap;}]
])test('Courroux certificat temporel —'+name+' refusé même après une clock ultérieure',async()=>{
  const {store}=await fixture();if(positiveAnchor)await step(store,1);await impose(store);await step(store,2);
  const original=capsOf(actorOf(store))[0];
  if(positiveAnchor){assert.ok(original.clockAnchor.clockRevision>0);assert.ok(original.clockAnchor.lastEventId);}
  else{assert.equal(original.clockAnchor.clockRevision,0);assert.equal(original.clockAnchor.campaignSeconds,0);assert.equal(original.clockAnchor.lastEventId,null);}
  await replaceCaps(store,mutate);await refuseTimeUnchanged(store);
});

for(const mode of ['échu','ancre-future'])test('Courroux défenseur clock —'+mode+' refuse la résolution Store sans mutation',async()=>{
  const {store}=await fixture();await impose(store);
  if(mode==='échu'){
    const imported=stateOf(store),from=imported.extensions.v5.gameClock;
    const advanced=advanceGameClock(from,{id:'clock-v1:0:imported-overdue-defender',baseRevision:0,
      kind:'campaign-time-advance',seconds:WEEK,reason:'Curseur importé sans expiration de la couche'});
    assert.equal(advanced.ok,true);imported.extensions.v5.gameClock=advanced.clock;
    await store.loadFromJSON(imported);assert.equal(clockOf(store).campaignSeconds,WEEK);
  }else await replaceCaps(store,cap=>({...cap,clockAnchor:{...cap.clockAnchor,clockRevision:100,lastEventId:'clock-v1:99:future-defender'}}));
  assert.equal(capsOf(actorOf(store)).length,1,'la couche importée reste présente et doit être contrôlée');
  const input={actorId:'ally',targetId:'priest',resolutionId:'independent-defender-clock-'+mode,
    action:{id:'opposed-calm',type:'opposition',base:60,attr:'FM',note:'Calme',
      extensions:{fiche:{skillId:'skill-43_61_6c_6d_65-base'}}},roll:45,
    defense:{base:60,attr:'Soc',label:'Prière',roll:23,extensions:{fiche:{skillId:PRAY_ID}},
      v5:{kind:'test',context:{skillId:PRAY_ID,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:true}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}};
  const before=stateOf(store),preview=store.previewResolution(input);
  assert.equal(preview.ready,false,'la clock du défenseur doit être contrôlée avant de plafonner son Test');
  assert.equal(preview.status,'requires-input');assert.ok(preview.needsInput?.length);
  assert.deepEqual(stateOf(store),before,'aperçu refusé sans mutation');
  try{await store.applyResolution(preview);}catch(error){assert.ok(error.userFacing===true||/résolution|aperçu|incomplet|invalide|Prière|sanction/i.test(error.message));}
  assert.deepEqual(stateOf(store),before,'une résolution refusée ne peut être appliquée');
});
});

describe('Courroux — états, développement', () => {
const BATTLE='divine:blessing:myrmidia:battle',PRAY='skill-50_72_69_e8_72_65-base';
const clone=value=>structuredClone(value);
const person=(id,sin=0,{immunities=null,hasMomentum=false,states=[]}={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:id==='priest'?60:30,hp:20,maxHp:30,
 caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:clone(states),traits:[],equipment:[],
 skills:[{id:PRAY,name:'Prière',carac:'Soc',status:'resolved',total:60}],talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
 prayers:registry.contracts.filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),extensions:{v5:{divine:{sin},...(immunities?{immunities}:{}),...(hasMomentum?{hasMomentum:true}:{})}}});
async function setup(sin=1,actorOptions={}){
 const store=createStore({storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest',sin,actorOptions),person('ally')]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
 return store;
}
const input=(extra={})=>({actorId:'priest',targetIds:['ally'],roll:10,wrathRoll:41,executionId:'wrath-conditions-dev',canSpeak:true,expiry:{phase:'endOfRound',round:6},choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},...extra});
const snapshot=store=>{const state=JSON.parse(store.getFullJSON());delete state.exportedAt;return state;};
const levels=(actor,name)=>(actor.states||[]).filter(row=>row.name===name).reduce((sum,row)=>sum+row.level,0);

test('wrath condition source is tied to canonical L06 and separates state rules from prayer SL rules',()=>{
 const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
 execFileSync(process.execPath,['tools/build-v5-divine-contracts.mjs','--check'],{cwd:projectRoot,stdio:'pipe'});
 assert.equal(corpus.books.find(book=>book.id==='L06')?.sha256,wrathConditionRules[0].source.fileSha256);
 assert.equal(wrathConditionReading.sinTiming,'before-decrement');
 assert.equal(wrathConditionRules.length,2);
 for(const rule of registry.wrathConditionRules){
  assert.equal(rule.source.fileSha256,registry.sourceManifest.v5EnglishBaseSha256);
  assert.equal(rule.source.printedPage,218);
  assert.equal(rule.sourceReceipt.application.order,'apply-then-decrement');
  assert.equal(rule.sourceReceipt.sourceRefs.some(ref=>[184,185,186].includes(ref.printedPage)),true);
 }
 assert.deepEqual(registry.wrathConditionRules.map(rule=>rule.conditions),[[{name:'Hémorragique',base:1,perSin:1}],[{name:'Brisé',base:1,perSin:1}]]);
 assert.deepEqual(registry.prayerSLRules.map(rule=>rule.type),['prayer-sl-cap','prayer-sl-modifier']);
});

test('preview projects source quantity and real immunity without mutating the state',async()=>{
 const store=await setup(2),before=snapshot(store);
 const preview=store.previewDivineExecution(BATTLE,input({wrathConsequences:'texte arbitraire'}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.wrathTableResult.id,'wrath:61-65');
 assert.deepEqual(preview.wrathConditionPreview.requested,{condition:'hemorragique',count:3});
 assert.equal(preview.wrathConditionPreview.projection.acquiredCount,3);
 assert.deepEqual(snapshot(store),before);
});

test('commit applies wrath states on the priest after either prayer outcome, with one compact source receipt',async()=>{
 for(const [roll,success] of [[10,true],[99,false]]){
  const store=await setup(2),preview=store.previewDivineExecution(BATTLE,input({roll}));
  assert.equal(preview.ready,true,preview.error);assert.equal(preview.preview.prayer.success,success);
  const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
  const state=snapshot(store),priest=state.combat.participants.find(row=>row.id==='priest'),ally=state.combat.participants.find(row=>row.id==='ally');
  assert.equal(levels(priest,'Hémorragique'),3);assert.equal(levels(ally,'Hémorragique'),0);
  assert.equal(priest.extensions.v5.divine.sin,1);
  const receipt=state.extensions.v5.divineExecutions.at(-1).conditionReceipt;
  assert.equal(receipt.proof.sinAtTest,2);assert.equal(receipt.acquiredCount,3);assert.equal(receipt.stateIds.length,1);
  assert.deepEqual(receipt.requested,{condition:'hemorragique',count:3});
  assert.equal((priest.extensions.v5.divineEffects||[]).some(layer=>layer.conditionStateIds?.includes(receipt.stateIds[0])),false);
 }
});

test('self-targeted blessing and wrath preserve both the active prayer buff and source state',async()=>{
 const store=await setup(1),preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51,targetIds:['priest'],facts:{targets:{priest:{withinRange:true,ally:true}}}}));
 assert.equal(preview.ready,true,preview.error);
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=snapshot(store).combat.participants.find(row=>row.id==='priest');
 assert.equal(levels(priest,'Hémorragique'),2);
 assert.ok(priest.extensions.v5.divineEffects.some(layer=>layer.executionId===preview.executionId),'la couche du buff sur soi survit à l’acquisition');
 assert.equal(priest.extensions.v5.divineEffects.some(layer=>layer.conditionStateIds?.includes(result.receipt.conditionReceipt.stateIds[0])),false);
});

test('l’immunité conserve Momentum et la projection expose les quantités demandée/réelle',async()=>{
 const store=await setup(1,{immunities:{conditions:['Hémorragique']},hasMomentum:true});
 const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
 assert.equal(preview.ready,true,preview.error);
 assert.deepEqual(preview.wrathConditionPreview.projection,{acquiredCount:0,stateIds:[],immunized:true,reminders:['Immunité : Hémorragique ignoré.'],momentumBefore:true,momentumAfter:true});
 const result=await store.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,true,result.error);
 const priest=snapshot(store).combat.participants.find(row=>row.id==='priest');
 assert.equal(levels(priest,'Hémorragique'),0);assert.equal(priest.extensions.v5.hasMomentum,true);
 assert.deepEqual(result.receipt.conditionReceipt.momentum,{before:true,after:true});
 assert.equal(result.receipt.conditionReceipt.requested.count,2);assert.equal(result.receipt.conditionReceipt.acquiredCount,0);
});
});

describe('Courroux — états, contrôle indépendant', () => {
// Contrôle indépendant des entrées de table L06 p.218. Le lecteur source
// distinct doit joindre son reçu avant la clôture de ce contrôle.
const persistence = () => {
  let saved = null, refuse=false;
  return { async load(){ return saved && clone(saved); }, async saveAtomic({state}){ if(refuse)return {ok:false,error:'Refus de persistance indépendant'}; saved=clone(state); return {ok:true}; },
    get saved(){ return clone(saved); }, set refuse(value){refuse=value;} };
};
async function fixture({sin=1,states=[],actorKind='PJ',actorExtensions={}}={}) {
  const persist=persistence(), store=createStore({persistence:persist,storage:null}); await store.ready;
  const v5=clone(actorExtensions.v5||{});
  const priest=person('priest',{kind:actorKind,extensions:{v5:{...v5,divine:{...v5.divine,sin}}},states:clone(states)});
  const ally=person('ally',{extensions:{v5:{divine:{sin:0}}}});
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[priest,ally]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  return {store,persist};
}
const input = extra => ({actorId:'priest',targetIds:['ally'],roll:1,wrathRoll:51,executionId:'wrath-condition-independent',canSpeak:true,
  choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra});
const priestOf = store => stateOf(store).combat.participants.find(row=>row.id==='priest');
const level = (actor,name) => (actor.states||[]).filter(row=>row.name===name||row.key===name.toLocaleLowerCase('fr')).reduce((n,row)=>n+(row.level||1),0);
const safeApply = async (store,preview) => { try{return await store.applyDivineExecution(BATTLE,{preview});}catch(error){return {ok:false,error:error.message};} };

test('Courroux états indépendant — table source rattache 61–65 et 89–95 aux États canoniques',()=>{
  const bleeding=registry.wrathTable.find(row=>row.id==='wrath:61-65');
  const broken=registry.wrathTable.find(row=>row.id==='wrath:89-95');
  assert.equal(bleeding?.label,'Blessures divines');
  assert.equal(broken?.label,'Craignez ma colère');
  assert.equal(bleeding?.source?.printedPage,218);
  assert.equal(broken?.source?.printedPage,218);
  const bleedingRule=registry.wrathConditionRules?.find(row=>row.id==='wrath:61-65:conditions');
  const brokenRule=registry.wrathConditionRules?.find(row=>row.id==='wrath:89-95:conditions');
  assert.deepEqual(bleedingRule?.conditions,[{name:'Hémorragique',base:1,perSin:1}]);
  assert.deepEqual(brokenRule?.conditions,[{name:'Brisé',base:1,perSin:1}]);
  assert.equal(bleedingRule?.source?.printedPage,218);
  assert.equal(brokenRule?.source?.printedPage,218);
  assert.notEqual(bleedingRule?.id,'wrath:6-10:pray-sl-cap');
});

test('Courroux états indépendant — aperçu automatique ignore le texte MJ libre sans muter',async()=>{
  for (const [wrathRoll,resultId] of [[51,'wrath:61-65'],[79,'wrath:89-95']]) {
    const {store}=await fixture(); const before=stateOf(store);
    const preview=store.previewDivineExecution(BATTLE,input({wrathRoll,wrathConsequences:'Ajoute arbitrairement les États indiqués.'}));
    assert.equal(preview.ready,true,`${resultId}: la règle source complète résout la mécanique sans texte MJ`);
    assert.equal(preview.wrathTableResult?.id,resultId);
    assert.ok(preview.wrathConditionPreview,'projection explicite demandée avant application');
    assert.notEqual(preview.preview.wrath.consequences,'Ajoute arbitrairement les États indiqués.', 'le texte libre ne devient pas la preuve d’acquisition');
    assert.ok(!(preview.preview.reminders||[]).some(text=>/reste à résoudre/i.test(text)),'pas de rappel générique après résolution automatique');
    assert.deepEqual(stateOf(store),before,'l’aperçu reste sans mutation, y compris Péché et États');
  }
});

test('Courroux états indépendant — les bornes exactes après +10 par Péché sont déterministes',async()=>{
  const cases=[[51,'wrath:61-65'],[55,'wrath:61-65'],[56,'wrath:66-70'],[79,'wrath:89-95'],[85,'wrath:89-95'],[86,'wrath:96-100']];
  for (const [wrathRoll,expected] of cases) {
    const {store}=await fixture();
    const preview=store.previewDivineExecution(BATTLE,input({wrathRoll}));
    assert.equal(preview.wrathTableResult?.id,expected,`jet ${wrathRoll} + 10 (1 Péché)`);
  }
});

test('Courroux états indépendant — falsification, retry et double application ne dupliquent rien',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,'une règle entièrement sourcée ne demande ni arbitrage ni texte libre');
  const before=stateOf(store);
  const forged=clone(preview); forged.input.wrathConsequences='Hémorragique';
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|calcul|recalculez/i);
  assert.deepEqual(stateOf(store),before,'un aperçu falsifié ne change ni état ni Péché');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  const committed=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/aperçu|calcul|déjà|recalculez/i,'le même aperçu est à usage unique');
  assert.deepEqual(stateOf(store),committed,'le retry ne duplique pas les états');
  assert.notDeepEqual(committed,before);
});

test('Courroux états indépendant — succès et échec appliquent 1 + Péchés à la prêtresse seulement',async()=>{
  for (const [roll,success] of [[10,true],[99,false]]) {
    const {store}=await fixture({sin:2});
    const preview=store.previewDivineExecution(BATTLE,input({roll,wrathRoll:41}));
    assert.equal(preview.ready,true,preview.error);
    assert.equal(preview.preview.prayer.success,success);
    assert.equal(preview.wrathTableResult?.id,'wrath:61-65');
    assert.equal(preview.wrathConditionPreview?.requested?.count,3);
    assert.equal(preview.wrathConditionPreview?.requested?.condition,'hemorragique');
    assert.equal(preview.wrathConditionPreview?.targetId,'priest');
    const applied=await store.applyDivineExecution(BATTLE,{preview});
    assert.equal(applied.ok,true,applied.error);
    const actor=priestOf(store),ally=stateOf(store).combat.participants.find(row=>row.id==='ally');
    assert.equal(level(actor,'Hémorragique'),3);
    const acquired=actor.states.find(row=>row.divineWrathExecutionId===preview.executionId);
    assert.equal(acquired?.source?.kind,'divine-wrath');
    assert.equal(acquired?.source?.source?.printedPage,218);
    assert.equal(acquired?.v5Timing?.expiry,undefined,'l’État n’hérite pas de l’échéance de la Bénédiction');
    assert.equal(level(ally,'Hémorragique'),0,'la victime de la bénédiction n’est pas la cible du Courroux');
    assert.equal(applied.receipt.conditionReceipt?.proof?.sinAtTest,2);
    assert.ok(applied.receipt.conditionReceipt?.sourceReceipt?.sourceRefs?.some(row=>row.printedPage===218));
    assert.equal(actor.extensions.v5.divine.sin,1,'le nombre appliqué utilise le Péché avant décrément');
  }
});

test('Courroux états indépendant — acquisition cumulative préserve les instances existantes et le buff allié',async()=>{
  const {store}=await fixture({states:[{id:'old-bleed',key:'hemorragique',name:'Hémorragique',level:2}]});
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathConditionPreview?.projection?.acquiredCount,2);
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  const actor=priestOf(store),ally=stateOf(store).combat.participants.find(row=>row.id==='ally');
  assert.equal(actor.states.find(row=>row.id==='old-bleed')?.level,2,'l’instance préexistante reste intacte');
  assert.equal(level(actor,'Hémorragique'),4,'la nouvelle occurrence s’ajoute au cumul canonique');
  assert.equal(ally.caracs.CC,50,'la bénédiction conserve son effet sur l’allié');
  assert.equal((ally.states||[]).some(row=>row.name==='Hémorragique'),false,'Courroux cible uniquement la prêtresse');
  assert.ok((result.receipt.conditionReceipt?.stateIds||[]).every(id=>id!=='old-bleed'));
});

test('Courroux états indépendant — le malus de Brisé atteint les Tests concernés sans consommer son état',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:79}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const actor=priestOf(store),before=clone(actor.states);
  const action={id:'calm-test',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}};
  const test=previewResolution({actor,action,roll:23,v5:{kind:'test',context:{runningOrHiding:false}}});
  assert.equal(test.test.sl,2,'Brisé 2 applique son malus au Test calme concerné');
  assert.deepEqual(priestOf(store).states,before,'le Test ne consomme pas Brisé');
});

test('Courroux états indépendant — le vrai Store exécute Hémorragique en fin de Round, puis expire séparément la Bénédiction',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const afterApply=stateOf(store),priest=afterApply.combat.participants.find(row=>row.id==='priest'),ally=afterApply.combat.participants.find(row=>row.id==='ally');
  assert.equal(level(priest,'Hémorragique'),2);
  assert.equal(ally.caracs.CC,50,'la Bénédiction affecte le destinataire pendant sa durée propre');
  assert.equal((priest.extensions.v5.divineEffects||[]).length,0,'la Condition est un État canonique, pas une couche de durée divine inventée');
  const engine=createCombatEngine(store);await engine.start();
  const first=await engine.nextTurn();assert.equal(first.status,'applied',first.error);
  assert.equal(store.listParticipants().find(row=>row.id==='priest').hp,20,'Hémorragique ne se résout pas à chaque fin de Tour');
  const crossing=await engine.nextTurn();assert.equal(crossing.status,'applied',crossing.error);
  assert.equal(store.listParticipants().find(row=>row.id==='priest').hp,18,'2 états causent 2 Blessures à la fin du Round');
  assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'Hémorragique'),2,'fin de Round ne retire pas la Condition');
  for(let i=0;i<10;i++){const transition=await engine.nextTurn();assert.equal(transition.status,'applied',transition.error);}
  assert.equal(store.listParticipants().find(row=>row.id==='ally').caracs.CC,40,'la Bénédiction expire à son échéance de Round 6');
  assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'Hémorragique'),2,'l’État autonome survit à l’expiration du sort');
});

test('Courroux états indépendant — immunité canonique donne une projection et un reçu acquis nul',async()=>{
  for (const [wrathRoll,name] of [[51,'Hémorragique'],[79,'Brisé']]) {
    const {store}=await fixture({actorExtensions:{v5:{immunities:{conditions:[name]}}}});
    const before=stateOf(store),preview=store.previewDivineExecution(BATTLE,input({wrathRoll}));
    assert.equal(preview.ready,true,preview.error);
    assert.equal(preview.wrathConditionPreview?.projection?.immunized,true);
    assert.equal(preview.wrathConditionPreview?.projection?.acquiredCount,0);
    assert.ok(preview.wrathConditionPreview?.projection?.reminders?.length);
    assert.deepEqual(stateOf(store),before,'projection de l’immunité pure');
    const applied=await store.applyDivineExecution(BATTLE,{preview});
    assert.equal(applied.ok,true,applied.error);
    assert.equal(level(priestOf(store),name),0,'l’immunité interdit la pose canonique');
    assert.equal(applied.receipt.conditionReceipt?.acquiredCount,0);
    assert.equal(priestOf(store).extensions.v5.divine.sin,0,'le Courroux résolu décrémente aussi sous immunité');
  }
});

test('Courroux états indépendant — l’aperçu projette la perte de Momentum et l’application suit le service V5',async()=>{
  const {store}=await fixture({actorExtensions:{v5:{hasMomentum:true}}});
  const before=stateOf(store),preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathConditionPreview?.projection?.momentumBefore,true);
  assert.equal(preview.wrathConditionPreview?.projection?.momentumAfter,false);
  assert.deepEqual(stateOf(store),before,'le Momentum ne change pas au calcul');
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  assert.equal(priestOf(store).extensions.v5.hasMomentum,false,'acquireV5Conditions applique la règle réelle de Momentum');
  assert.deepEqual(applied.receipt.conditionReceipt?.momentum,{before:true,after:false});
});

test('Courroux états indépendant — refus de persistance laisse état et aperçu récupérables',async()=>{
  const {store,persist}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  const before=stateOf(store);persist.refuse=true;
  const refused=await safeApply(store,preview);
  assert.equal(refused.ok,false,'refus atomique remonté');
  assert.deepEqual(stateOf(store),before,'aucun État ni Péché en mémoire');
  assert.ok(preview.wrathConditionPreview,'le même aperçu reste disponible');
  persist.refuse=false;
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  assert.equal(level(priestOf(store),'Hémorragique'),2,'le retry réussi ne pose qu’une occurrence');
});

test('Courroux états indépendant — rechargement, Undo et Redo gardent états et preuve au même commit',async()=>{
  const {store,persist}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  const receipt=stateOf(store).extensions.v5.divineExecutions.at(-1);
  assert.equal(receipt.conditionReceipt?.proof?.modifiedRoll,61);
  const loaded=createStore({persistence:persist,storage:null}); await loaded.ready;
  const loadedPriest=loaded.listParticipants().find(row=>row.id==='priest');
  assert.equal(level(loadedPriest,'Hémorragique'),2);
  const receiptIds=JSON.parse(loaded.getFullJSON()).extensions.v5.divineExecutions.at(-1).conditionReceipt?.stateIds||[];
  assert.ok(receiptIds.length>0);
  assert.equal(receiptIds.reduce((sum,id)=>sum+(loadedPriest.states.find(row=>row.id===id)?.level||0),0),2,'IDs sourcés du reçu désignent bien les niveaux persistés');
  await store.undo();
  assert.equal(level(priestOf(store),'Hémorragique'),0,'Annuler enlève les États du commit');
  assert.equal((stateOf(store).extensions.v5.divineExecutions||[]).length,0,'Annuler retire aussi le reçu');
  await store.redo();
  assert.equal(level(priestOf(store),'Hémorragique'),2,'Rétablir les États une seule fois');
  assert.equal(stateOf(store).extensions.v5.divineExecutions.at(-1).conditionReceipt?.proof?.sinAtTest,1);
});

test('Courroux états indépendant — preview périmé refuse État et décrément après une autre mutation',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:51}));
  assert.equal(preview.ready,true,preview.error);
  await store.updateParticipant('ally',{hp:19});
  const before=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/changé|recalculez/i);
  assert.deepEqual(stateOf(store),before);
  assert.equal(level(priestOf(store),'Hémorragique'),0);
  assert.equal(priestOf(store).extensions.v5.divine.sin,1);
});

test('Courroux états indépendant — la récupération de Brisé exige ses faits et ne retire que les occurrences prouvées',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,input({wrathRoll:79}));
  assert.equal(preview.ready,true,preview.error);
  await store.applyDivineExecution(BATTLE,{preview});
  const participant=priestOf(store),transition={phase:'endOfRound',round:1,actorId:'priest'};
  const unconfirmed=recoverV5Condition(participant,'brise',{method:'cool',test:{success:true,sl:1},transition});
  assert.equal(unconfirmed.ready,false,'un engagement inconnu ne devient pas une récupération implicite');
  assert.ok(unconfirmed.needsInput.some(row=>row.field==='engaged'));
  assert.equal(level(priestOf(store),'Brisé'),2,'aperçu incomplet sans mutation');
  const cooled=recoverV5Condition(participant,'brise',{method:'cool',test:{success:true,sl:1},engaged:false,transition});
  assert.equal(cooled.ready,true,cooled.error);
  assert.equal(level(cooled.participant,'Brisé'),1,'1 DR retiré enlève une occurrence');
  const hidden=recoverV5Condition(cooled.participant,'brise',{method:'hiding',engaged:false,fullRoundHidden:true});
  assert.equal(hidden.ready,true,hidden.error);
  assert.equal(level(hidden.participant,'Brisé'),0,'Round entier caché explicitement confirmé retire le dernier état');
});

test('Courroux états indépendant — un executionId réutilisé reste refusé après éviction du journal',async()=>{
  const executionId='wrath-id-reuse-after-eviction';
  const {store}=await fixture();
  const first=store.previewDivineExecution(BATTLE,input({roll:99,wrathRoll:51,executionId}));
  assert.equal(first.ready,true,first.error);
  assert.equal((await store.applyDivineExecution(BATTLE,{preview:first})).ok,true);
  const snapshot=stateOf(store);
  snapshot.extensions.v5.divineExecutions=[]; // simule l’éviction légitime après rétention bornée
  const prior= snapshot.combat.participants.find(row=>row.id==='priest').states.find(row=>row.divineWrathExecutionId===executionId);
  assert.ok(prior,'la Condition conserve son identité de déclenchement hors journal');
  snapshot.combat.participants.find(row=>row.id==='priest').extensions.v5.divine.sin=1;
  await store.loadFromJSON(snapshot);
  const replay=store.previewDivineExecution(BATTLE,input({roll:99,wrathRoll:51,executionId}));
  assert.equal(replay.ready,false,'l’identité ne peut pas être réutilisée au-delà de la rétention du reçu');
  assert.ok(replay.needsInput?.length||/execution|identité|déjà|réutilis/i.test(replay.error||''));
});
});

describe('Leçons divines — développement', () => {
const PRAY='skill-50_72_69_e8_72_65-base';
const person=(id,sin,initiative)=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative,hp:20,maxHp:30,
  caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},
  states:[],traits:[],equipment:[],skills:[{id:PRAY,name:'Prière',carac:'Soc',status:'resolved',total:60}],
  talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
  prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),extensions:{v5:{divine:{sin}}}});
async function divineFixture(){
  let saved=null;const persistence={async load(){return saved&&structuredClone(saved)},async saveAtomic({state}){saved=structuredClone(state);return {ok:true}}};
  const store=createStore({persistence,storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[person('priest',1,60),person('ally',0,30)]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});
  return store;
}
function lessonInput(extra={}){return {actorId:'priest',targetIds:['ally'],roll:99,wrathRoll:1,executionId:'ready-reminder-dev',canSpeak:true,
  choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra};}

test('Leçons divines — sanitation préserve le -1 typé sans élargir les quantités de dégâts', () => {
  const cleaned=sanitizeMagicSubject({id:'p',extensions:{v5:{divineEffects:[
    {type:'prayer-sl-modifier',amount:-1},
    {type:'spell',amount:-1,damageReduction:-1},
  ]}}});
  assert.equal(cleaned.extensions.v5.divineEffects[0].amount,-1);
  assert.equal(cleaned.extensions.v5.divineEffects[1].amount,0);
  assert.equal(cleaned.extensions.v5.divineEffects[1].damageReduction,0);
  for(const amount of [0,'-1']){
    const forged={id:'p',extensions:{v5:{divineEffects:[{type:'prayer-sl-modifier',amount}]}}};
    assert.equal(getPrayerSLModifiers(forged).ok,false,'une couche mal formée doit demander une vérification');
  }
});

test('Leçons divines — un aperçu prêt ne garde pas le rappel Courroux à résoudre; d10 absent reste bloquant',async()=>{
  const store=await divineFixture();
  const blocked=store.previewDivineExecution('divine:blessing:myrmidia:battle',lessonInput({wrathDurationRoll:undefined}));
  assert.equal(blocked.ready,false);
  assert.ok(blocked.needsInput.some(row=>(row.path||row.field)==='wrathDurationRoll'));
  const ready=store.previewDivineExecution('divine:blessing:myrmidia:battle',lessonInput({wrathDurationRoll:4}));
  assert.equal(ready.ready,true,ready.error);
  assert.equal(ready.wrathTableResult?.id,'wrath:11-15');
  assert.equal(ready.wrathLessonDuration.rounds,5);
  assert.equal(ready.preview.reminders.some(text=>/Courroux divin déclenché.*reste à résoudre/i.test(text)),false);
});

test('Leçons divines —codec distant restaure seulement le sceneId null attesté',()=>{
  const rule=registry.prayerSLRules.find(row=>row.id==='wrath:11-15:pray-sl-modifier');
  const layer={id:'prayer-sl-modifier:codec-proof',type:'prayer-sl-modifier',amount:-1,originKind:'wrath',originExecutionId:'codec-proof',
    wrathResultId:'wrath:11-15',ruleId:rule.id,ruleVersion:1,targetId:'priest',subjectKey:'instance:priest',source:structuredClone(rule.source),sourceReceipt:structuredClone(rule.sourceReceipt),
    duration:{roll:1,sinAtTrigger:1,rounds:2,unit:'rounds'},roundAnchor:{round:1},expiry:{round:2,phase:'endOfRound',moment:'afterEffects'},
    wrathProof:{schemaVersion:1,originExecutionId:'codec-proof',durationRoll:1,
      prayer:{initialRoll:99,roll:99,optionId:'keep',reversed:false,success:false,fumble:true,sl:-5},
      wrath:{roll:1,modifiedRoll:11,sinAtTest:1,resultId:'wrath:11-15'}}};
  const raw={revision:1,receipts:{},state:{combat:{round:1,participants:[{id:'priest',extensions:{v5:{divineEffects:[layer]}}}]}}};
  const remote=normalizeRemoteDocument(raw),restored=remote.state.combat.participants[0].extensions.v5.divineEffects[0];
  assert.equal(restored.roundAnchor.sceneId,null);
  assert.equal(getPrayerSLModifiers({id:'priest',extensions:{v5:{divineEffects:[restored]}}}).ok,true);
  const invalid=structuredClone(raw);invalid.state.combat.participants[0].extensions.v5.divineEffects[0].amount=0;
  const untrusted=normalizeRemoteDocument(invalid).state.combat.participants[0].extensions.v5.divineEffects[0];
  assert.equal(Object.hasOwn(untrusted.roundAnchor,'sceneId'),false,'une preuve invalide ne doit pas obtenir de réparation canonique');
});
});

describe('Leçons divines — contrôle indépendant', () => {
// Source: L06 p.218, independently checked in extracted text and the rendered
// table. Duration is an explicit d10 plus Sin at Wrath resolution; no conversion
// to seconds or unreviewed Round-expiry convention is asserted here.
const memory = () => {
  let saved = null;
  return {
    async load(){ return saved && clone(saved); },
    async saveAtomic({state}){ saved = clone(state); return {ok:true}; },
    get saved(){ return clone(saved); }
  };
};
async function fixture({sin=1,round=1,currentActorId='priest',scene=false,persistence=memory()}={}) {
  const store = createStore({persistence,storage:null}); await store.ready;
  const priest = person('priest',{extensions:{v5:{divine:{sin}}}}), ally = person('ally',{extensions:{v5:{divine:{sin:0}}}});
  const snapshot={schemaVersion:3,reserve:[],combat:{round,currentActorId,order:['priest','ally'],participants:[priest,ally]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}};
  if(scene){snapshot.activeScene={id:'lessons-scene',status:'active',round,currentActorId,order:['priest','ally'],participants:[clone(priest),clone(ally)],extensions:{v5:{turnIndex:1}}};snapshot.suspendedScenes=[];snapshot.encounters=[{id:'lessons-encounter',status:'active'}];}
  await store.loadFromJSON(snapshot);
  return {store,persistence};
}
const prayerInput = extra => ({
  actorId:'priest',targetIds:['ally'],roll:99,wrathRoll:1,executionId:'lessons-independent',
  canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},
  facts:{targets:{ally:{withinRange:true,ally:true}}},
  expiry:{phase:'endOfRound',round:6,moment:'afterEffects'},...extra
});
const actorOf = store => { const state=stateOf(store); return (state.activeScene?.participants||state.combat.participants).find(row=>row.id==='priest'); };
const layersOf = subject => subject?.extensions?.v5?.divineEffects || [];
async function applyLessons(store,{durationRoll=4,roll=99,wrathRoll=1,executionId='lessons-independent'}={}){
  const preview=store.previewDivineExecution(BATTLE,prayerInput({roll,wrathRoll,wrathDurationRoll:durationRoll,executionId}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const applied=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(applied.ok,true,applied.error);
  return {preview,applied,effect:layersOf(actorOf(store)).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier')};
}

test('Leçons divines indépendant —contrat source distinct du plafond hebdomadaire',()=>{
  const lesson = (registry.prayerSLRules||[]).find(row=>row.id==='wrath:11-15:pray-sl-modifier');
  assert.ok(lesson,'le générateur doit exposer une règle séparée pour 11–15');
  assert.equal(lesson.type,'prayer-sl-modifier');
  assert.equal(lesson.amount,-1);
  assert.notEqual(lesson.id,'wrath:6-10:pray-sl-cap');
});

test('Leçons divines indépendant —d10 de durée requis même si un texte MJ est fourni',async()=>{
  const {store}=await fixture();
  const before=stateOf(store);
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathConsequences:'Le fidèle subit -1 DR à Prière.'}));
  assert.equal(preview.ready,false,'un rappel libre ne remplace pas le dé explicite requis par la durée');
  assert.ok(preview.needsInput?.some(row=>/wrathDurationRoll|d10|durée/i.test(`${row.field||row.path||''} ${row.message||''}`)));
  assert.deepEqual(stateOf(store),before,'un aperçu bloqué ne doit rien muter');
});

test('Leçons divines indépendant —d10 absent ou hors bornes ne produit aucune sanction',async()=>{
  for (const wrathDurationRoll of [undefined,0,11,2.5,'4',NaN]) {
    const {store}=await fixture();
    const extra=wrathDurationRoll===undefined?{}:{wrathDurationRoll};
    const preview=store.previewDivineExecution(BATTLE,prayerInput({...extra,wrathConsequences:'Texte libre ne satisfait pas le jet de durée.'}));
    assert.equal(preview.ready,false,`valeur d10 invalide acceptée: ${String(wrathDurationRoll)}`);
    assert.ok(preview.needsInput?.some(row=>/wrathDurationRoll|d10|durée/i.test(`${row.field||row.path||''} ${row.message||''}`)),`refus non attribué au d10 invalide: ${String(wrathDurationRoll)}`);
    assert.equal((actorOf(store).extensions?.v5?.divineEffects||[]).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false);
  }
});

test('Leçons divines indépendant —dé de durée explicite et Sin avant décrément déterminent les rounds',async()=>{
  const {store}=await fixture({sin:1});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  assert.equal(result.receipt.prayer.success,false,'la règle ne réécrit pas le Test qui déclenche le Courroux');
  const effect=(actorOf(store).extensions?.v5?.divineEffects||[]).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.ok(effect,'11–15 doit créer un modificateur actif et sourcé');
  assert.equal(effect.amount,-1);
  assert.equal(effect.duration.roll,4);
  assert.equal(effect.duration.sinAtTrigger,1);
  assert.equal(effect.duration.rounds,5);
  assert.equal(actorOf(store).extensions.v5.divine.sin,0,'le Courroux décrémente ensuite le Péché sans changer la durée capturée');
});

test('Leçons divines indépendant —déclenchement sur réussite ne rétroagit pas sur le Test qui le crée',async()=>{
  const {store}=await fixture({sin:1});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({roll:10,wrathRoll:1,wrathDurationRoll:2,executionId:'lessons-trigger-success'}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.preview.prayer.success,true);
  assert.equal(preview.wrathTableResult?.id,'wrath:11-15');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error);
  assert.equal(result.receipt.prayer.success,true);
  assert.equal(result.receipt.prayer.sl,preview.preview.prayer.sl,'le malus ne change pas le Test déjà résolu');
  assert.ok(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'));
});

test('Leçons divines indépendant —service renvoie le modificateur avant toute issue du Test',async()=>{
  const getPrayerSLModifiers=prayerCaps.getPrayerSLModifiers;
  assert.equal(typeof getPrayerSLModifiers,'function','API commune de modificateurs pré-Test manquante');
  const clean=person('clean',{extensions:{v5:{divine:{sin:0}}}});
  const empty=getPrayerSLModifiers(clean);
  assert.equal(empty.ok,true);
  assert.deepEqual(empty.modifiers,[]);
  const {store}=await fixture();await applyLessons(store);
  const active=actorOf(store);
  const result=getPrayerSLModifiers(active);
  assert.equal(result.ok,true);
  assert.equal(result.modifiers.length,1);
  assert.equal(result.modifiers[0].amount,-1);
});

test('Leçons divines indépendant —le malus entre avant l’issue de chaque Test de Prière',async()=>{
  const getPrayerSLModifiers=prayerCaps.getPrayerSLModifiers;
  assert.equal(typeof getPrayerSLModifiers,'function','API commune de modificateurs pré-Test manquante');
  const {store}=await fixture();await applyLessons(store);
  const active=actorOf(store);
  const skill={id:PRAY_ID,name:'Prière',carac:'Soc',status:'resolved',total:60};
  const direct=previewResolution({actor:active,action:{id:'skill-action',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}},roll:23,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  assert.equal(direct.test.sl,3,'23 contre 60 donne +4 DR; le modificateur doit entrer avant évaluation');
  assert.equal(direct.test.success,true);
  const ally=store.listParticipants().find(row=>row.id==='ally');
  const opposing=previewResolution({actor:ally,target:active,action:{id:'opposed-calm',type:'opposition',base:60,attr:'FM',note:'Calme',extensions:{fiche:{skillId:'skill-43_61_6c_6d_65-base'}}},roll:45,
    defense:{base:60,attr:'Soc',label:'Prière',roll:23,extensions:{fiche:{skillId:PRAY_ID}},v5:{kind:'test',context:{skillId:PRAY_ID,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:true}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(opposing.opposition.defender.sl,3,'le même service pré-Test doit couvrir le défenseur en opposition');
  const otherActor=clone(active);otherActor.talents.push({id:'talent-mind-over-body',status:'resolved',rank:1});
  const missingDuration=previewMagicMeditation(otherActor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[2,2,2]});
  assert.equal(missingDuration.ready,false,'3d10 ne satisfont pas le nombre de dés calculé après malus de -1 DR');
  const meditation=previewMagicMeditation(otherActor,{talentId:'talent-mind-over-body',minutes:20,roll:23,durationRolls:[2,2,2,2]});
  assert.equal(meditation.ready,true,meditation.error);
  assert.equal(meditation.test.sl,3);
  assert.equal(meditation.effect.duration,'8 heures','la durée de méditation utilise les4d10 requis pour3 DR');
  const divine=store.previewDivineExecution(BATTLE,prayerInput({roll:23,wrathRoll:undefined,executionId:'lessons-follow-up'}));
  assert.equal(divine.ready,true,divine.error);
  assert.equal(divine.preview.prayer.sl,3,'le consommateur Prière divine doit également appliquer le malus préissue');
});

test('Leçons divines indépendant —échéance N inclus au Round courant et vraie phase endOfRound',async()=>{
  const {store}=await fixture({round:1});
  const {effect}=await applyLessons(store,{durationRoll:3});
  assert.equal(effect.duration.rounds,4,'3 au d10 + 1 Péché au déclenchement');
  assert.deepEqual(effect.roundAnchor,{sceneId:null,round:1});
  assert.deepEqual(effect.expiry,{round:4,phase:'endOfRound',moment:'afterEffects'});
  for(let i=0;i<7;i++)await store.nextTurn();
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'le malus reste actif jusqu’aux effets de fin du Round 4');
  await store.nextTurn();
  assert.equal(layersOf(actorOf(store)).some(row=>row.id===effect.id),false,'il expire après les effets du Round 4');
});

test('Leçons divines indépendant —temps de campagne et Round manuel ne simulent pas une phase',async()=>{
  const {store}=await fixture({round:1});
  const {effect}=await applyLessons(store,{durationRoll:2,roll:99,wrathRoll:1});
  const before=stateOf(store);
  await store.advanceCampaignTime({seconds:864000,reason:'Contrôle indépendant de durée en rounds'});
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'un grand saut de secondes n’expire pas une durée en Rounds');
  await store.setRoundTurn(100,'priest');
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===effect.id),'le Round réglé manuellement ne fabrique pas les phases manquantes');
  assert.ok(JSON.parse(store.getFullJSON()).extensions.v5.gameClock.campaignSeconds>before.extensions.v5.gameClock.campaignSeconds);
});

test('Leçons divines indépendant —expireDivineAtPhases seul ne peut pas retirer une échéance non attestée',async()=>{
  const {store}=await fixture();
  const {effect}=await applyLessons(store,{durationRoll:1,executionId:'lessons-forged-phase'});
  const before=stateOf(store),candidate=clone(before);
  const projected=expireDivineAtPhases(candidate,[{phase:'endOfRound',round:999,sceneId:null,moment:'afterEffects'}]);
  assert.ok(layersOf(projected.combat.participants.find(row=>row.id==='priest')).some(row=>row.id===effect.id),
    'un plan de phase non rattaché à un reçu Store ne doit pas expirer le malus');
});

test('Leçons divines indépendant —seconde occurrence non sourcée bloque sans cumul ni remplacement',async()=>{
  const {store}=await fixture();
  const first=await applyLessons(store,{executionId:'lessons-first'});
  assert.equal(actorOf(store).extensions.v5.divine.sin,0,'la première résolution retire le Péché avant le second Courroux');
  await store.setDivineSin('priest',1,{reason:'Fixture Q12 : nouvelle infraction avant la seconde occurrence'});
  const before=stateOf(store);
  const second=store.previewDivineExecution(BATTLE,prayerInput({roll:99,wrathRoll:1,wrathDurationRoll:4,executionId:'lessons-second'}));
  assert.equal(second.ready,false,'la source ne définit pas si une seconde occurrence s’additionne, remplace ou renouvelle');
  assert.ok(second.status==='blocked'||second.status==='requires-input');
  assert.deepEqual(stateOf(store),before,'arbitrage absent: aucune mutation ni remplacement silencieux');
  assert.ok(layersOf(actorOf(store)).some(row=>row.id===first.effect.id));
});

test('Leçons divines indépendant —hors combat sans Round courant bloque explicitement',async()=>{
  const {store}=await fixture({round:0,currentActorId:null});
  const before=stateOf(store);
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,false,'aucune conversion en secondes ou Round inventé hors combat');
  assert.ok(preview.needsInput?.length||preview.status==='blocked');
  assert.deepEqual(stateOf(store),before);
});

test('Leçons divines indépendant —RTDB restaure uniquement sceneId null attesté par la scène canonique',async()=>{
  const {store}=await fixture({round:1});await applyLessons(store,{durationRoll:3});
  const {validateSyncDocument}=await import('../../../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../../../js/core/sync-session.js');
  const canonical=validateSyncDocument({revision:0,state:stateOf(store)}),wire=clone(canonical);
  const layer=wire.state.combat.participants.find(row=>row.id==='priest').extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.deepEqual(layer.roundAnchor,{sceneId:null,round:1});
  delete layer.roundAnchor.sceneId;
  const before=clone(wire),decoded=normalizeRemoteDocument(wire);
  const restored=decoded.state.combat.participants.find(row=>row.id==='priest').extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.equal(restored.roundAnchor.sceneId,null,'le transport RTDB peut omettre ce null attesté par le combat canonique');
  assert.deepEqual(wire,before,'le décodeur ne modifie pas le payload reçu');
});

test('Leçons divines indépendant —import local avec roundAnchor.sceneId absent reste invalide',async()=>{
  const {store}=await fixture({round:1});await applyLessons(store,{durationRoll:3});
  const state=stateOf(store),actor=state.combat.participants.find(row=>row.id==='priest');
  const layer=actor.extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');delete layer.roundAnchor.sceneId;
  const {sanitizeMagicEnvelope}=await import('../../../js/core/sanitize.js');
  const {getPrayerSLModifiers}=await import('../../../js/core/v5-divine-prayer-caps.js');
  const local=sanitizeMagicEnvelope(state),localActor=local.combat.participants.find(row=>row.id==='priest');
  const localLayer=localActor.extensions.v5.divineEffects.find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  assert.equal(Object.hasOwn(localLayer.roundAnchor,'sceneId'),false,'la sanitisation/import locale ne fabrique pas un null');
  assert.equal(getPrayerSLModifiers(localActor,{sceneId:null,round:1}).ok,false,'une couche locale incomplète ne s’active pas');
});

test('Leçons divines indépendant —le −1 DR fait basculer la frontière de résultat pré-Test dans les quatre voies',async()=>{
  const {store}=await fixture();await applyLessons(store);
  const setPrayerScore=async targetStore=>{
    const actor=actorOf(targetStore),skills=actor.skills.map(skill=>skill.id===PRAY_ID?{...skill,total:69}:skill);
    await targetStore.updateParticipant(actor.id,{caracs:{...actor.caracs,Soc:69},skills});
  };
  await setPrayerScore(store);
  const active=actorOf(store),baseline=clone(active);
  baseline.extensions.v5.divineEffects=(baseline.extensions.v5.divineEffects||[]).filter(row=>row.ruleId!=='wrath:11-15:pray-sl-modifier');
  const skillAction={id:'skill-action',type:'skill',base:60,attr:'Soc',note:'Prière',extensions:{fiche:{skillId:PRAY_ID}}};
  skillAction.base=69;
  const plain=previewResolution({actor:baseline,action:skillAction,roll:65,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  const penalized=previewResolution({actor:active,action:skillAction,roll:65,v5:{kind:'test',context:{skillId:PRAY_ID}}});
  assert.equal(plain.test.success,true,'à 65 contre 69, le résultat de base est une réussite marginale');
  assert.equal(penalized.test.success,false,'le −1 DR préissue transforme la réussite marginale en échec');
  assert.equal(penalized.test.sl,-1);

  const opposition=inputActor=>previewResolution({actor:person('ally'),target:inputActor,
    action:{id:'opposed',type:'opposition',base:60,attr:'FM',note:'Calme'},roll:50,
    defense:{base:69,attr:'Soc',label:'Prière',roll:65,extensions:{fiche:{skillId:PRAY_ID}},v5:{kind:'test',context:{skillId:PRAY_ID}}},
    v5:{kind:'test',context:{involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(opposition(baseline).opposition.defender.success,true);
  assert.equal(opposition(active).opposition.defender.success,false,'le même seuil bascule pour le Test opposé défenseur');

  const meditator=inputActor=>previewMagicMeditation({...clone(inputActor),talents:[...inputActor.talents,{id:'talent-mind-over-body',status:'resolved',rank:1}]},
    {talentId:'talent-mind-over-body',minutes:20,roll:65,durationRolls:[2]});
  const meditationBase=meditator(baseline),meditationPenalty=meditator(active);
  assert.equal(meditationBase.test.success,true);
  assert.equal(meditationPenalty.test.success,false,'la méditation applique le malus avant son seuil de réussite');

  const {store:baseStore}=await fixture({sin:0});await setPrayerScore(baseStore);
  const divineBase=baseStore.previewDivineExecution(BATTLE,prayerInput({roll:65,wrathRoll:undefined,executionId:'lessons-prayer-boundary-base'}));
  const divinePenalty=store.previewDivineExecution(BATTLE,prayerInput({roll:65,wrathRoll:undefined,executionId:'lessons-prayer-boundary-penalty'}));
  assert.equal(divineBase.ready,true,JSON.stringify(divineBase));assert.equal(divineBase.preview.prayer.success,true);
  assert.equal(divinePenalty.ready,true,divinePenalty.error);
  assert.equal(divinePenalty.preview.prayer.success,false,'le malus transforme aussi la réussite marginale de Prière divine en échec');
});

test('Leçons divines indépendant —le plafond6–10 et le malus11–15 coexistent sans fusion',async()=>{
  const {store}=await fixture();const first=await applyLessons(store,{executionId:'lesson-before-cap'});
  const {preview:capPreview,result:capResult}=await imposeHistoricalWrath(store,{executionId:'cap-alongside-lesson'});
  assert.equal(capPreview.ready,true,capPreview.error);
  assert.equal(capPreview.wrathTableResult?.id,'wrath:6-10');
  assert.equal(capResult.ok,true,capResult.error);
  const active=actorOf(store),layers=layersOf(active);
  assert.ok(layers.some(layer=>layer.id===first.effect.id&&layer.ruleId==='wrath:11-15:pray-sl-modifier'));
  assert.ok(layers.some(layer=>layer.type==='prayer-sl-cap'&&layer.ruleId==='wrath:6-10:pray-sl-cap'));
  const modifiers=prayerCaps.getPrayerSLModifiers(active,{sceneId:null,round:1});
  assert.equal(modifiers.ok,true);assert.equal(modifiers.modifiers.length,1);assert.equal(modifiers.modifiers[0].amount,-1);
  const capped=prayerCaps.applyPrayerSLCaps(active,{success:true,sl:3});
  assert.equal(capped.ok,true);assert.equal(capped.test.sl,0,'le plafond transforme une réussite positive en +0 DR après son issue');
  const uncappedFailure=prayerCaps.applyPrayerSLCaps(active,{success:false,sl:-1});
  assert.equal(uncappedFailure.test.sl,-1,'le plafond ne transforme pas l’échec ni le malus en une sanction fusionnée');
});

test('Leçons divines indépendant —refus de persistance et Annuler ne laissent aucune sanction',async()=>{
  const base=memory();let refuse=false;
  const persistence={load:()=>base.load(),saveAtomic:args=>refuse?Promise.resolve({ok:false,error:'Refus de persistance indépendant'}):base.saveAtomic(args)};
  const {store}=await fixture({persistence});const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4}));
  assert.equal(preview.ready,true,preview.error);const before=stateOf(store);refuse=true;
  const failed=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(failed.ok,false,'une écriture persistante refusée n’est pas déclarée comme sanction appliquée');
  assert.deepEqual(stateOf(store),before,'l’échec d’écriture laisse intact l’état en mémoire');
  refuse=false;const good=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:4,executionId:'lessons-undo'}));
  assert.equal(good.ready,true,good.error);const applied=await store.applyDivineExecution(BATTLE,{preview:good});assert.equal(applied.ok,true,applied.error);
  assert.ok(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'));
  assert.equal(store.canUndo(),true);await store.undo();
  assert.equal(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false,'Annuler retire aussi la couche sauvegardée');
  assert.equal((base.saved?.combat?.participants||[]).some(row=>layersOf(row).some(layer=>layer.ruleId==='wrath:11-15:pray-sl-modifier')),false);
});

test('Leçons divines indépendant —aperçu périmé après changement de Round ne pose pas la sanction',async()=>{
  const {store}=await fixture({round:4});
  const preview=store.previewDivineExecution(BATTLE,prayerInput({wrathDurationRoll:3,executionId:'lessons-stale-round'}));
  assert.equal(preview.ready,true,preview.error);
  await store.setRoundTurn(5,'priest');
  const beforeApply=stateOf(store);
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview}),/horloge a changé|recalculez la prière/i,
    'un aperçu ancré au Round 4 ne peut pas s’appliquer au Round 5');
  assert.deepEqual(stateOf(store),beforeApply,'le refus périmé ne pose ni couche ni décrément de Péché');
  assert.equal(layersOf(actorOf(store)).some(row=>row.ruleId==='wrath:11-15:pray-sl-modifier'),false);
});

test('Leçons divines indépendant —une preuve de Courroux falsifiée bloque le modificateur',async()=>{
  const {store}=await fixture();await applyLessons(store);
  const actor=actorOf(store),forged=clone(actor),layer=layersOf(forged).find(row=>row.ruleId==='wrath:11-15:pray-sl-modifier');
  layer.wrathProof.wrath.modifiedRoll+=10;
  const result=prayerCaps.getPrayerSLModifiers(forged,{sceneId:null,round:1});
  assert.equal(result.ok,false,'une preuve qui ne correspond plus au jet modifié ne produit pas −1 DR');
  assert.deepEqual(result.modifiers,[]);
});
});
