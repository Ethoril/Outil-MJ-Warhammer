import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, expireDivineAtPhases } from '../../../js/core/v5-divine-store.js';
import { fixture, priest, snap, input, BATTLE, impose } from '../../helpers/divin-b5-fixture.mjs';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { v5StoreActionClock, buildV5StoreActionInput } from '../../../js/core/v5-store-action.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import DIVINE_REGISTRY from '../../../js/data/v5-divine-contracts.json' with { type: 'json' };
import { wrathConditionReading } from '../../../docs/divin/sources/L06-wrath-conditions-readings.mjs';

const clone = value => structuredClone(value);
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};

describe('Morsure du Loup et sorts', () => {
// P5 — Morsure du Loup (Ulric, Power Behind the Throne Companion p.50) : +20 au jet de gravité de toute Blessure Critique que le
// prêtre inflige pendant la durée (attaque ou défense). Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const WOLF = 'divine:miracle:ulric:wolf-s-bite';
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
});

describe('récupération — caractérisation B14', () => {
// Caractérisation B14 avant raccord de store.js (applyDivineWrathRecovery) : une récupération sans nouveau participant ne touche ni l'ordre ni le Tour courant.
test('B14 caractérisation — récupération B04 (ordre automatique) : ordre, acteur courant et participants inchangés',async()=>{
  const{store}=await fixture(1),state=JSON.parse(store.getFullJSON());state.combat.orderMode='automatic';state.extensions.v5.orderRound=1;await store.loadFromJSON(state);
  const p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-char-prone'}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});
  const before=snap(store).combat,recovery=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,executionId:'b14-char-rec'});
  assert.equal(recovery.ready,true,recovery.error);assert.equal((await store.applyDivineWrathRecovery({preview:recovery})).ok,true);
  const after=snap(store).combat;assert.deepEqual(after.order,before.order);assert.equal(after.currentActorId,before.currentActorId);assert.deepEqual(after.participants.map(row=>row.id),before.participants.map(row=>row.id));
});
});

describe('quota d’horloge — caractérisation B05', () => {
const actor={id:'a',name:'A',zone:'active',states:[],hp:10,maxHp:10,caracs:{Ag:40,E:40},extensions:{v5:{}}};
const state=()=>({localRevision:4,combat:{round:2,currentActorId:'a',order:['a','b'],orderMode:'manual',participants:[structuredClone(actor),{...structuredClone(actor),id:'b'}]},extensions:{v5:{combatId:'enc',turnIndex:3}},log:[]});
test('B05 caractérisation — horloge de quota liée au Tour canonique',()=>assert.deepEqual(v5StoreActionClock(state()),{encounterId:'enc',round:2,turnId:'enc:3:a'}));
test('B05 caractérisation — transition pure conserve état et change uniquement le vrai Tour',()=>{const before=state(),copy=structuredClone(before),preview=previewV5Turn(before);assert.equal(preview.ready,true,preview.error);assert.equal(preview.state.combat.currentActorId,'b');assert.equal(preview.state.combat.round,2);assert.deepEqual(before,copy);});
test('B05 caractérisation — aucune transition depuis un combat non démarré',()=>{const before=state();before.combat.round=0;assert.equal(previewV5Turn(before).status,'idle');});
test('B05 caractérisation — entrée générique conserve identité, jet et contexte Action',()=>{const before=state(),input=buildV5StoreActionInput(before,{actorId:'a',roll:34,action:{name:'Calme',type:'test'},v5:{context:{isAction:true}}});assert.equal(input.actorId,'a');assert.equal(input.roll,34);assert.equal(input.v5.context.isAction,true);assert.equal(input.v5Clock.turnId,'enc:3:a');});
});

describe('interdictions de prière du Courroux (B05)', () => {
const layers=store=>priest(store).extensions.v5.divineEffects||[];
for(const [roll,sin,result,rounds] of [[11,1,'wrath:21-25',2],[21,1,'wrath:31-35',3],[36,1,'wrath:46-50',3]])test(`B05 — ${result} interdit vraiment la Prière avec durée sourcée`,async()=>{
 const {store}=await fixture(sin),before=snap(store),preview=store.previewDivineExecution(BATTLE,input(roll));assert.equal(preview.ready,true,preview.error);assert.deepEqual(snap(store),before);assert.equal(preview.wrathRoundPreview?.rounds,rounds);assert.equal(preview.wrathRoundPreview.resultId,result);await store.applyDivineExecution(BATTLE,{preview});assert.equal(priest(store).extensions.v5.divine.sin,0);assert.equal(layers(store).find(row=>row.type==='wrath-round-rule').rounds,rounds);assert.equal(store.previewDivineExecution(BATTLE,input(roll,{roll:98,executionId:'after-expiry',expiry:{phase:'endOfRound',round:snap(store).combat.round,moment:'afterEffects'}})).ready,false);
});
test('B05 (B-C10) — le Round en cours compte toujours comme le premier : aucun choix de politique, une valeur fournie est ignorée',async()=>{for(const wrathRoundPolicy of [undefined,'current','next']){const {store}=await fixture(),p=store.previewDivineExecution(BATTLE,input(11,{wrathRoundPolicy,wrathConsequences:'fait'}));assert.equal(p.ready,true,p.error);assert.equal(p.wrathRoundPreview.roundPolicy,'current');assert.equal(p.wrathRoundPreview.roundDeadline,p.wrathRoundPreview.roundAnchor.round+p.wrathRoundPreview.rounds-1);}});
test('B05 — dés obligatoires, texte libre sans effet',async()=>{for(const extra of [{wrathDurationRoll:undefined},{wrathDurationRoll:0},{wrathDurationRoll:2.5},{wrathDurationRoll:11}]){const {store}=await fixture(),before=snap(store),preview=store.previewDivineExecution(BATTLE,input(11,{...extra,wrathConsequences:'fait'}));assert.equal(preview.ready,false);assert.deepEqual(snap(store),before);}});
test('B05 — 2d10 est une somme explicite entre 2 et 20',async()=>{for(const n of [1,21,'4',NaN]){const {store}=await fixture();assert.equal(store.previewDivineExecution(BATTLE,input(36,{wrathDurationRoll:n})).ready,false);}const {store}=await fixture();const preview=store.previewDivineExecution(BATTLE,input(36,{wrathDurationRoll:20}));assert.equal(preview.ready,true,preview.error);assert.equal(preview.wrathRoundPreview.rounds,21);});
test('B05 — seules les transitions de vrais Rounds expirent, Round en cours compté comme le premier (B-C10)',async()=>{for(const policy of ['current']){const {store}=await fixture();await impose(store,11,{wrathDurationRoll:1,wrathRoundPolicy:policy});const engine=createCombatEngine(store);const before=snap(store);assert.equal(expireDivineAtPhases(before,[{phase:'endOfRound',moment:'afterEffects',round:99}]).combat.participants[0].extensions.v5.divineEffects.some(row=>row.type==='wrath-round-rule'),true);await engine.nextTurn();await engine.nextTurn();assert.equal(layers(store).some(row=>row.type==='wrath-round-rule'),policy==='next');if(policy==='next'){await engine.nextTurn();await engine.nextTurn();assert.equal(layers(store).some(row=>row.type==='wrath-round-rule'),false);}assert.equal(store.previewDivineExecution(BATTLE,input(11,{roll:98,executionId:'after-expiry',expiry:{phase:'endOfRound',round:snap(store).combat.round,moment:'afterEffects'}})).ready,true);}});
test('B05 — retrait générique et édition du Round ne libèrent aucune sanction',async()=>{const {store}=await fixture();await impose(store,11);const actor=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...actor.extensions,v5:{...actor.extensions.v5,divineEffects:[]}}}),/Courroux|sanction/i);assert.ok(layers(store).length);await assert.rejects(()=>store.executeCommand('fake-round',draft=>{draft.combat.round=10;return draft;}),/Round|horloge|Courroux/i);});
test('B05 — récupération B04 interdite et nouveau Courroux B05 sur récupération raccordé',async()=>{const {store}=await fixture();await impose(store,6,{executionId:'state'});await store.setDivineSin('priest',1,{reason:'Nouveau'});let p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:11,wrathDurationRoll:1,wrathRoundPolicy:'current'});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:34,canSpeak:true}).ready,false);});
test('B05 — 76–80 impose une vraie Prière, sans seconde Action au Tour déclencheur',async()=>{const {store}=await fixture();let p=store.previewDivineExecution(BATTLE,input(66,{wrathActionDecision:undefined}));assert.equal(p.ready,true,p.error);assert.equal(p.wrathRoundPreview.actionDecision,'count-trigger');await impose(store,66);assert.equal(previewV5Turn(snap(store)).ready,true);assert.equal(store.previewDivineExecution(BATTLE,input(11,{roll:98,executionId:'after-expiry',expiry:{phase:'endOfRound',round:snap(store).combat.round,moment:'afterEffects'}})).ready,false);const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();let turn=previewV5Turn(snap(store));assert.equal(turn.ready,false);assert.equal(turn.code,'DIV-WRATH-PRAYER-REQUIRED');assert.throws(()=>buildV5StoreActionInput(snap(store),{actorId:'priest',roll:34,action:{type:'attack',name:'Épée'},v5:{context:{isAction:true}}}),/Prière|Courroux/i);p=store.previewDivineExecution(BATTLE,input(11,{roll:98,executionId:'forced-prayer',expiry:{phase:'endOfRound',round:snap(store).combat.round,moment:'afterEffects'}}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(previewV5Turn(snap(store)).ready,true);});
test('B05 — aperçu falsifié, refus persistance, reload et Undo/Redo',async()=>{const {store,persistence,setRefuse}=await fixture();const p=store.previewDivineExecution(BATTLE,input(11)),before=snap(store),forged=structuredClone(p);forged.wrathRoundPreview.rounds=999;await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|modifié/i);assert.deepEqual(snap(store),before);setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await store.applyDivineExecution(BATTLE,{preview:p});await store.undo();assert.equal(layers(store).some(row=>row.type==='wrath-round-rule'),false);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(store.previewDivineExecution(BATTLE,input(11,{roll:98,executionId:'after-expiry',expiry:{phase:'endOfRound',round:snap(store).combat.round,moment:'afterEffects'}})).ready,false);assert.equal(layers(reload).some(row=>row.type==='wrath-round-rule'),true);});
test('B05 — hors combat, ancre explicite requise, jamais de conversion depuis secondes',async()=>{const {store}=await fixture();await store.executeCommand('outside',draft=>{draft.combat.round=0;draft.combat.currentActorId=null;delete draft.extensions.v5.gameClock;return draft;});const p=store.previewDivineExecution(BATTLE,input(11));assert.equal(p.ready,false);assert.ok(p.needsInput.some(row=>row.field==='wrathRoundAnchor'));const anchored=store.previewDivineExecution(BATTLE,input(11,{wrathRoundAnchor:{sceneId:'future-scene',round:4}}));assert.equal(anchored.ready,true,anchored.error);await store.applyDivineExecution(BATTLE,{preview:anchored});assert.equal(layers(store).find(row=>row.type==='wrath-round-rule').roundAnchor.sceneId,'future-scene');});
test('B05 — test générique de Prière identifié par la fiche respecte le verrou',async()=>{const {store}=await fixture();await impose(store,11);assert.throws(()=>buildV5StoreActionInput(snap(store),{actorId:'priest',roll:34,action:{type:'test',name:'Quelconque',extensions:{fiche:{skillId:'pray'}}},v5:{context:{isAction:false}}}),/Prière|Courroux/i);});
test('B05 — copie sur autre sujet, source ou preuve forgée refusées à la lecture',async()=>{const {store}=await fixture();await impose(store,11);for(const mutate of [s=>{s.combat.participants[1].extensions.v5.divineEffects=structuredClone(s.combat.participants[0].extensions.v5.divineEffects);},s=>{s.combat.participants[0].extensions.v5.divineEffects[0].source.printedPage=219;},s=>{s.combat.participants[0].extensions.v5.divineEffects[0].prayerProof={roll:23,fumble:true};}]){const state=snap(store);mutate(state);const {previewStoreDivine}=await import('../../../js/core/v5-divine-store.js');assert.equal(previewStoreDivine(state,BATTLE,input(11)).ready,false);}});
test('B05 (B-C11) — Action déjà consommée : obligation au prochain Tour d’office et aucune Action bonus',async()=>{const {store}=await fixture();await store.executeCommand('spent',draft=>{draft.extensions.v5.standardTurnActions=[{actorId:'priest',actionId:'old',encounterId:'b5',turnId:'b5:1:priest',round:1,kind:'action'}];return draft;});const auto=store.previewDivineExecution(BATTLE,input(66,{wrathActionDecision:'count-trigger'}));assert.equal(auto.ready,true,auto.error);assert.equal(auto.wrathRoundPreview.actionDecision,'next-turn');const p=await impose(store,66,{wrathActionDecision:undefined});assert.equal(p.wrathRoundPreview.actionDecision,'next-turn');assert.equal(store.previewDivineExecution(BATTLE,input(11,{executionId:'extra'})).ready,false);assert.equal(previewV5Turn(snap(store)).ready,true);});
test('B05 — passage de secondes ne simule aucun Round, même au-delà de la durée',async()=>{const {store}=await fixture();await impose(store,11,{wrathDurationRoll:1});const {advanceGameClock}=await import('../../../js/core/v5-game-time.js'),{expireDivineAtClock}=await import('../../../js/core/v5-divine-store.js');const s=snap(store),from=s.extensions.v5.gameClock;const a=advanceGameClock(from,{id:'clock-v1:'+from.revision+':calendar-b5',kind:'campaign-time-advance',baseRevision:from.revision,seconds:86400,reason:'Attente MJ'});assert.equal(a.ok,true);s.extensions.v5.gameClock=a.clock;const result=expireDivineAtClock(s,{fromClock:from,toClock:a.clock,receipt:a.receipt});assert.equal(result.ok,true);assert.equal(result.state.combat.participants[0].extensions.v5.divineEffects.some(row=>row.type==='wrath-round-rule'),true);});
test('B05 — suspendre et reprendre une scène conserve son ancre et sa sanction',async()=>{const {store}=await fixture();const data=snap(store);data.activeScene={id:'scene-b5',encounterId:'enc-b5',status:'active',round:1,currentActorId:'priest',order:['priest','ally'],participants:structuredClone(data.combat.participants),extensions:{v5:{turnIndex:1}}};data.encounters=[{id:'enc-b5',status:'active'}];data.suspendedScenes=[];await store.loadFromJSON(data);await impose(store,11);assert.equal((await store.suspendActiveScene())?.ok===false,false);const suspended=snap(store);assert.equal(suspended.suspendedScenes[0].participants[0].extensions.v5.divineEffects.some(row=>row.type==='wrath-round-rule'),true);await store.resumeScene('scene-b5');assert.equal(layers(store).some(row=>row.type==='wrath-round-rule'),true);});
test('B05 — Action de Prière dédiée sans Bénédiction, avec Test et quota réels',async()=>{const {store}=await fixture();await impose(store,66);const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();const before=snap(store),p=store.previewDivineWrathRecovery({actorId:'priest',forcedPrayer:true,roll:34,canSpeak:true});assert.equal(p.ready,true,p.error);assert.equal(p.difficulty,0);assert.equal(p.removedCount,0);assert.deepEqual(snap(store),before);assert.equal(p.test.success,true);await store.applyDivineWrathRecovery({preview:p});assert.equal(previewV5Turn(snap(store)).ready,true);assert.equal(priest(store).states.length,0);assert.deepEqual(snap(store).combat.participants[1].caracs,before.combat.participants[1].caracs);assert.equal(store.previewDivineWrathRecovery({actorId:'priest',forcedPrayer:true,roll:34,canSpeak:true}).ready,false);});
test('B05 — pas de Prière imposée forgée sans sanction active',async()=>{const {store}=await fixture();assert.equal(store.previewDivineWrathRecovery({actorId:'priest',forcedPrayer:true,roll:34,canSpeak:true}).ready,false);});
test('B05 — sérialisation RTDB sans null conserve la sanction locale et sa lecture',async()=>{const {store}=await fixture();await impose(store,11);const remote=snap(store);const omit=value=>Array.isArray(value)?value.map(omit):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==null).map(([k,v])=>[k,omit(v)])):value;const actor=omit(priest(store)),{validateWrathRounds}=await import('../../../js/core/v5-divine-prayer-caps.js');assert.equal(validateWrathRounds(actor).ok,true);});
});

describe('Brisé, Flee et Sprint — contrôle indépendant', () => {
// Black-box obligations from the inspected L06 V5 pages 163, 185–186.
// These tests do not import the developer's escape helper or trust its private state.
const PRAY='skill-50_72_69_e8_72_65-base';
const ATHLETICS='skill-41_74_68_6c_e9_74_69_73_6d_65-base';
const clone=value=>structuredClone(value);
const level=(actor,key)=> (actor.states||[]).filter(row=>row.key===key||row.name===key).reduce((sum,row)=>sum+(row.level||1),0);
function memoryPersistence(){let saved=null,refuse=false;return{
 async load(){return saved&&clone(saved);},
 async saveAtomic({state}){if(refuse)return{ok:false,error:'Contrôle indépendant : écriture refusée'};saved=clone(state);return{ok:true};},
 get saved(){return clone(saved);},set refuse(value){refuse=value;}
};}
function person(id,{camp='pj',states=[],skills=true,hasMomentum=false,talents=[]}={}){return{
 id,name:id,kind:'PJ',camp,zone:'active',initiative:id==='priest'?60:30,hp:20,maxHp:30,
 caracs:{CC:45,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 armor:{head:0,body:0,arms:0,legs:0},states:clone(states),traits:[],equipment:[],talents:clone(talents),prayers:[],
 skills:skills?[{id:ATHLETICS,name:'Athlétisme',carac:'Ag',status:'resolved',total:60},
  {id:PRAY,name:'Prière',carac:'Soc',status:'resolved',total:60}]:[],
 actions:[{id:'blade',type:'attack',base:45,damage:3,note:'Arme de contrôle'}],
 extensions:{v5:{...(hasMomentum?{hasMomentum:true}:{}),divine:{sin:0}}}
};}
async function fixture({states=[{id:'broken-a',key:'brise',name:'Brisé',level:1,source:{type:'control-fixture'}}],skills=true,talents=[],refusal=false}={}){
 const persistence=memoryPersistence(),store=createStore({persistence,storage:null});await store.ready;
 const actors=[person('priest',{states,skills,talents,hasMomentum:true}),person('enemy',{camp:'ennemi',states:[],hasMomentum:false})];
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:actors},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-independent-encounter'}}});
 persistence.refuse=refusal;
 return{store,persistence};
}
const fleeFacts=(visible=true,patch={})=>({visibleToAnyEnemy:visible,engagedEnemyIds:[],moveMode:'run',visibleToAnyEnemyAfter:true,...patch});
const preview=(store,action,facts,extra={})=>store.previewBrokenEscape({actorId:'priest',action,facts,...extra});
const apply=(store,plan)=>store.applyBrokenEscape(plan);
const quotaRows=state=>state.extensions?.v5?.actionLedger?.quotaUsage||[];
const isReady=result=>result?.ready===true&&result?.status!=='blocked';

function ordinaryAttack(store,visibleToAnyEnemy,extra={}){return store.previewResolution({actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,defense:{roll:60,base:35,label:'Esquive'},brokenEscapeFacts:{visibleToAnyEnemy},...extra});}
function sprintFacts(after=true){return {visibleToAnyEnemy:true,engagedEnemyIds:[],visibleToAnyEnemyAfter:after};}

test('Brisé indépendant — source d’obligation correspond au reçu source L06',()=>{
 const rules=DIVINE_REGISTRY.wrathConditionRules||[];
 assert.ok(rules.some(row=>row.source?.printedPage===218),'le Courroux reste relié à L06 p.218');
 const pages=new Set((wrathConditionReading.sourceRefs||[]).map(ref=>ref.printedPage));
 assert.ok([185,186].every(page=>pages.has(page)),'le reçu de lecture inclut les deux pages de Brisé');
 assert.match(wrathConditionReading.limits?.brokenFleeing||'',/Move.*Flee.*Action.*Sprint.*sight/i);
});

test('Brisé indépendant — absence de faits de visibilité/engagement bloque la prévisualisation pure',async()=>{
 const {store}=await fixture();const before=snapshot(store);
 const plan=preview(store,'flee',undefined);
 assert.equal(plan.ready,false,'les faits MJ absents ne deviennent pas faux par défaut');
 assert.ok(plan.needsInput?.length||plan.unresolved?.length||plan.status==='requires-input');
 assert.deepEqual(snapshot(store),before,'un aperçu incomplet ne pose aucun État, ne consomme aucun quota');
});

test('Brisé indépendant — Flee est un vrai Move et dépense le quota canonique du Tour une seule fois',async()=>{
 const {store}=await fixture();const before=snapshot(store);
 const plan=preview(store,'flee',fleeFacts(true));assert.equal(isReady(plan),true,plan.error);
 assert.deepEqual(snapshot(store),before,'le plan ne dépense rien');
 assert.ok(plan.turn?.encounterId==='broken-independent-encounter');assert.ok(plan.turn?.round===1);
 assert.ok(plan.turn?.turnId||plan.turn?.turnIndex,'le Tour est dérivé de l’horloge canonique');
 const result=await apply(store,plan);assert.equal(result?.status,'applied',JSON.stringify(result));
 const citedPages=(result.receipt?.source?.readingRefs||[]).map(ref=>ref.printedPage);assert.ok([163,185,186].every(page=>citedPages.includes(page)),'le reçu public relie Flee aux pages source pertinentes');
 const usages=quotaRows(snapshot(store));
 assert.ok(usages.some(row=>row.scope==='turn'&&/move/i.test(row.quotaId)&&row.used===1),'un quota Move Tour est réellement inscrit');
 assert.equal(usages.filter(row=>row.scope==='turn'&&/move/i.test(row.quotaId)).length,1,'un seul quota Move pour cet acteur/Tour');
 assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'brise'),1,'une fuite non engagée n’invente pas de Brisé');
});

test('Brisé indépendant — une décision d’engagement incomplète bloque Flee sans Momentum, Brisé ni dépense',async()=>{
 const {store}=await fixture();const before=snapshot(store);
 for(const facts of [fleeFacts(true,{engagedEnemyIds:undefined}),fleeFacts(true,{engagedEnemyIds:['enemy']})]){
  const plan=preview(store,'flee',facts);assert.equal(plan.ready,false,'Flee engagée non raccordée reste explicitement bloquée');
  assert.ok(plan.status==='blocked'||plan.needsInput?.length||plan.unresolved?.length);
  assert.deepEqual(snapshot(store),before,'aucune conséquence engagée n’est simulée ou partiellement débitée');
 }
});

test('Brisé indépendant — Sprint exige une Flee préalable, l’Athlétisme canonique, un d100 et les faits MJ',async()=>{
 const {store}=await fixture();const before=snapshot(store);
 const tooSoon=preview(store,'sprint',{visibleToAnyEnemyAfter:true},{roll:20});
 assert.equal(tooSoon.ready,false,'Sprint ne saute pas le Move(Flee)');
 assert.deepEqual(snapshot(store),before);
 const {store:withoutSkill}=await fixture({skills:false});
 const fleeOut=preview(withoutSkill,'flee',fleeFacts(true,{visibleToAnyEnemyAfter:false}));assert.equal(isReady(fleeOut),true,'Flee ne demande aucun Test d’Athlétisme');
 assert.equal((await apply(withoutSkill,fleeOut))?.status,'applied');
});

test('Brisé indépendant — Sprint utilise Test partagé Athlétisme +2 DR et Run+SL yards en plus du Move',async()=>{
 const {store}=await fixture();
 const move=preview(store,'flee',fleeFacts(true,{moveMode:'walk'}));assert.equal(isReady(move),true,move.error);
 assert.equal((await apply(store,move))?.status,'applied');
 const beforeSprint=snapshot(store);
 const sprint=preview(store,'sprint',sprintFacts(true),{roll:23});
 assert.equal(isReady(sprint),true,sprint.error);assert.deepEqual(snapshot(store),beforeSprint,'aperçu de Sprint inerte');
 assert.equal(sprint.test?.result?.sl,6,'Athlétisme 60, d100 23 donne 4 DR bruts +2 DR de difficulté');
 assert.equal(sprint.moveDistance,8,'M4 en Walk = 2×M = 8 yards');
 assert.equal(sprint.sprintDistance,22,'Sprint additionnel = Run(4×M=16) + 6 DR = 22 yards');
 assert.equal(sprint.totalDistance,30,'la distance Sprint est en plus du Move du Round');
 const done=await apply(store,sprint);assert.equal(done?.status,'applied',JSON.stringify(done));
 const ledger=quotaRows(snapshot(store));assert.ok(ledger.some(row=>row.scope==='turn'&&/action/i.test(row.quotaId)&&row.used===1),'l’Action Sprint est débitée dans le ledger du Tour');
});

test('Brisé indépendant — tant que visible, les Actions génériques sont bloquées au preview et revalidées au commit',async()=>{
 const {store}=await fixture();const move=preview(store,'flee',fleeFacts(true));assert.equal(isReady(move),true,move.error);assert.equal((await apply(store,move))?.status,'applied');
 const before=snapshot(store);const blocked=ordinaryAttack(store,true);assert.equal(blocked.ready,false,'une attaque ne peut contourner Sprint obligatoire');assert.deepEqual(snapshot(store),before);
 const divineMissing=store.previewDivineExecution('divine:blessing:myrmidia:battle',{actorId:'priest'});assert.equal(divineMissing.status,'requires-input','la prière exige le fait de visibilité');assert.deepEqual(snapshot(store),before);
 const divineVisible=store.previewDivineExecution('divine:blessing:myrmidia:battle',{actorId:'priest',brokenEscapeFacts:{visibleToAnyEnemy:true}});assert.equal(divineVisible.ready,false);assert.match(divineVisible.error,/Brisé impose Move/i);assert.deepEqual(snapshot(store),before);
 const spellVisible=store.previewSpellExecution('unrelated-spell',{actorId:'priest',brokenEscapeFacts:{visibleToAnyEnemy:true}});assert.equal(spellVisible.ready,false);assert.match(spellVisible.error,/Brisé impose Move/i);assert.deepEqual(snapshot(store),before);
 const simulated=store.simulateAction({actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,brokenEscapeFacts:{visibleToAnyEnemy:true}});assert.equal(simulated.ready,false);assert.match(simulated.error,/Brisé impose Move/i);assert.deepEqual(snapshot(store),before);
 const forgedReaction=store.previewResolution({actorId:'priest',targetId:'enemy',reactionId:'qa-reaction',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,defense:{roll:60,base:35,label:'Esquive'},brokenEscapeFacts:{visibleToAnyEnemy:true}});assert.equal(forgedReaction.ready,false,'un reactionId racine inventé ne constitue pas une opportunité validée');assert.match(forgedReaction.error||'',/Brisé impose Move/i);assert.deepEqual(store.getReactionOpportunities('priest'),[],'aucune opportunité canonique n’autorise cette attaque');assert.deepEqual(snapshot(store),before);
 const allowed=ordinaryAttack(store,false);assert.notEqual(allowed.status,'requires-input',allowed.error||'une action générique ne doit pas rester bloquée par Brisé hors de vue');assert.doesNotMatch(allowed.error||'',/Brisé impose Move/i);assert.deepEqual(snapshot(store),before,'le fait de vue reste non persisté au preview');
 if(allowed.ready){const forged=clone(allowed);forged.input.brokenEscapeFacts.visibleToAnyEnemy=true;let result;try{result=await store.applyResolution(forged);}catch(error){result={status:'error',reason:error.message};}
  assert.notEqual(result?.status,'applied','le commit revalide le verrou même si le client altère ses faits');assert.deepEqual(snapshot(store),before,'le refus ne mute rien');}
});

test('Brisé indépendant — Flee qui confirme hors vue clôt l’obligation et rend Hide facultatif',async()=>{
 const {store}=await fixture();
 const flee=preview(store,'flee',fleeFacts(true,{visibleToAnyEnemyAfter:false,moveMode:'walk'}));assert.equal(isReady(flee),true,flee.error);
 assert.equal((await apply(store,flee))?.status,'applied');

 const attack=ordinaryAttack(store,false);assert.notEqual(attack.status,'requires-input',attack.error||'les autres Actions redeviennent possibles une fois hors de vue');assert.doesNotMatch(attack.error||'',/Brisé impose Move/i);
 const hide=preview(store,'hide',{visibleToAnyEnemy:false,engagedEnemyIds:[]},{roll:20});assert.equal(hide.ready,false,'Hide reste facultatif et ne peut pas simuler un Test sans compétence choisie.');assert.match(hide.error||'',/facultative|compétence|test partagé/i);

});

test('Brisé indépendant — Sprint resté visible ne permet pas une autre Action et reprend au prochain Tour',async()=>{
 const {store}=await fixture();const move=preview(store,'flee',fleeFacts(true));assert.equal(isReady(move),true,move.error);await apply(store,move);
 const sprint=preview(store,'sprint',sprintFacts(true),{roll:23});assert.equal(isReady(sprint),true,sprint.error);await apply(store,sprint);
 const afterSprint=snapshot(store);const other=ordinaryAttack(store,true);assert.equal(other.ready,false,'Brisé visible demeure prioritaire après Sprint');assert.deepEqual(snapshot(store),afterSprint);
 const ally=store.previewResolution({actorId:'enemy',targetId:'priest',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,defense:{roll:60,base:35,label:'Esquive'}});assert.notEqual(ally.status,'requires-input',ally.error||'le verrou Brisé ne pénalise pas les autres participants');
 const sameTurn=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:fleeFacts(true)});assert.equal(sameTurn.ready,false,'un second Move du même Tour est refusé');
 const engine=createCombatEngine(store);const firstTurn=await engine.nextTurn();assert.equal(firstTurn.status,'applied',JSON.stringify(firstTurn));const secondTurn=await engine.nextTurn();assert.equal(secondTurn.status,'applied',JSON.stringify(secondTurn));
 const nextFlee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:fleeFacts(true)});assert.equal(isReady(nextFlee),true,nextFlee.error||'la transition V5 réouvre le Move au Tour suivant');assert.notEqual(nextFlee.turn.turnId,sprint.turn.turnId);
});

test('Brisé indépendant — états cumulés ne réinitialisent pas la séquence ni les quotas',async()=>{
 const stacked=[{id:'broken-one',key:'brise',name:'Brisé',level:1,source:{type:'divine'}},{id:'broken-two',key:'brise',name:'Brisé',level:2,source:{type:'divine'}}];
 const {store}=await fixture({states:stacked});assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'brise'),3);
 const first=preview(store,'flee',fleeFacts(true));assert.equal(isReady(first),true,first.error);await apply(store,first);
 const second=preview(store,'flee',fleeFacts(true));assert.notEqual(second.status,'applied','le Move ne peut être dépensé deux fois au même Tour');assert.equal(second.ready,false,'l’empilement d’États ne réinitialise pas le quota du Tour');
 assert.equal(level(store.listParticipants().find(row=>row.id==='priest'),'brise'),3);
});

test('Brisé indépendant — hors vue dès le déclenchement permet toute Action; aucune sortie fictive n’est imposée',async()=>{
 const {store}=await fixture();const stateBefore=snapshot(store);
 const start=preview(store,'flee',fleeFacts(false,{engagedEnemyIds:[],visibleToAnyEnemyAfter:false}));
 assert.equal(start.ready,false,'la séquence ne commence pas par Flee quand le MJ confirme déjà hors de vue');
 assert.deepEqual(snapshot(store),stateBefore);
 const anyAction=ordinaryAttack(store,false);assert.notEqual(anyAction.status,'requires-input',anyAction.error||'aucun verrou de fuite après confirmation MJ hors vue');assert.doesNotMatch(anyAction.error||'',/Brisé impose Move/i);
});

test('Brisé indépendant — aperçu falsifié, périmé ou doublé ne peut débiter deux fois Move/Action',async()=>{
 const {store}=await fixture();const plan=preview(store,'flee',fleeFacts(true));assert.equal(isReady(plan),true,plan.error);
 const forged=clone(plan);forged.facts.visibleToAnyEnemyAfter=false;
 await assert.rejects(Promise.resolve().then(()=>apply(store,forged)),/aperçu|périm|recalcul|corrompu/i);assert.equal(quotaRows(snapshot(store)).length,0);
 const stale=preview(store,'flee',fleeFacts(true));await store.updateParticipant('enemy',{hp:19});const before=snapshot(store);
 await assert.rejects(Promise.resolve().then(()=>apply(store,stale)),/changé|périm|recalcul/i);assert.deepEqual(snapshot(store),before);
 const fresh=preview(store,'flee',fleeFacts(true));assert.equal(isReady(fresh),true,fresh.error);const first=await apply(store,fresh);assert.equal(first?.status,'applied');const committed=snapshot(store);
 const duplicate=await apply(store,fresh);assert.ok(['duplicate','stale'].includes(duplicate?.status)||duplicate?.ok===false,'le retry identique est idempotent ou explicitement refusé');assert.deepEqual(snapshot(store),committed);
});

test('Brisé indépendant — refus de persistance conserve le plan et ne mute ni l’état ni les quotas',async()=>{
 const {store,persistence}=await fixture();const plan=preview(store,'flee',fleeFacts(true));assert.equal(isReady(plan),true,plan.error);const before=snapshot(store);
 persistence.refuse=true;const refused=await apply(store,plan);assert.ok(refused?.ok===false||refused?.status==='error');assert.deepEqual(snapshot(store),before);
 persistence.refuse=false;const retried=await apply(store,plan);assert.equal(retried?.status,'applied',retried?.error);assert.equal(quotaRows(snapshot(store)).filter(row=>/move/i.test(row.quotaId)).length,1);
});

test('Brisé indépendant — reload, Undo et Redo conservent progression et reçus de dépense',async()=>{
 const {store,persistence}=await fixture();const plan=preview(store,'flee',fleeFacts(true));assert.equal(isReady(plan),true,plan.error);assert.equal((await apply(store,plan))?.status,'applied');const applied=snapshot(store);
 const reloaded=createStore({persistence,storage:null});await reloaded.ready;assert.deepEqual(snapshot(reloaded),applied,'IndexedDB/Store persistence restaure l’obligation et le quota');
 const loaded=preview(reloaded,'flee',fleeFacts(true));assert.equal(loaded.ready,false,'reload conserve la dépense Move du Tour');
 await store.undo();assert.equal(quotaRows(snapshot(store)).filter(row=>/move/i.test(row.quotaId)).length,0);assert.equal(isReady(preview(store,'flee',fleeFacts(true))),true,'Undo libère à nouveau le Move');
 await store.redo();assert.equal(quotaRows(snapshot(store)).filter(row=>/move/i.test(row.quotaId)).length,1);assert.equal(preview(store,'flee',fleeFacts(true)).ready,false,'Redo restaure le quota et empêche le double Move');
});

test('Brisé indépendant — Exténué reste dans le Test Sprint partagé et modifie le résultat',async()=>{
 const {store}=await fixture({states:[{id:'broken',key:'brise',name:'Brisé',level:1},{id:'fatigue',key:'extenue',name:'Exténué',level:1}]});
 const move=preview(store,'flee',fleeFacts(true,{moveMode:'run'}));assert.equal(isReady(move),true,move.error);assert.equal((await apply(store,move))?.status,'applied');
 const sprint=preview(store,'sprint',sprintFacts(true),{roll:23});assert.equal(isReady(sprint),true,sprint.error);
 assert.equal(sprint.test.result.sl,5,'Athlétisme 60: 4 DR bruts +2 DR Sprint −1 DR Exténué');
 assert.ok(sprint.test.context.slModifiers.some(row=>/Exténué/.test(row.label)&&row.amount===-1),'le Test partagé expose la source du malus');
 assert.equal(sprint.moveDistance,16);assert.equal(sprint.sprintDistance,21);assert.equal(sprint.totalDistance,37);
});

test('Brisé indépendant — les États qui rendent la distance incertaine bloquent le déplacement sans débit',async()=>{
 for(const state of [{key:'sonne',name:'Sonné'},{key:'aterre',name:'À terre'},{key:'enchevetre',name:'Enchevêtré'},{key:'inconscient',name:'Inconscient'}]){
  const {store}=await fixture({states:[{id:'broken',key:'brise',name:'Brisé',level:1},{id:`state-${state.key}`,...state,level:1}]});const before=snapshot(store);
  const plan=preview(store,'flee',fleeFacts(true));assert.equal(plan.ready,false,`${state.name} ne doit pas disparaître dans une distance inventée`);
  assert.ok(plan.status==='blocked'||plan.needsInput?.length||plan.unresolved?.length);assert.deepEqual(snapshot(store),before);
 }
});

test('Brisé indépendant — Sprinter et les jets critiques ne sont jamais ignorés',async()=>{
 const {store}=await fixture({talents:[{id:'sprinter',name:'Sprinter',status:'resolved'}]});
 const move=preview(store,'flee',fleeFacts(true));assert.equal(isReady(move),true,move.error);await apply(store,move);
 const before=snapshot(store);const blocked=preview(store,'sprint',sprintFacts(true),{roll:23});
 assert.equal(blocked.ready,false,'le talent Sprinter doit être raccordé au Test partagé ou bloquer');assert.match(blocked.error||'',/Sprinter/i);assert.deepEqual(snapshot(store),before);
 const {store:criticalStore}=await fixture();const fleePlan=preview(criticalStore,'flee',fleeFacts(true));assert.equal(isReady(fleePlan),true,fleePlan.error);await apply(criticalStore,fleePlan);
 const critical=preview(criticalStore,'sprint',sprintFacts(true),{roll:99});assert.equal(isReady(critical),true,critical.error);
 assert.equal(critical.test.result.roll,99);assert.equal(critical.test.result.success,false);assert.equal(critical.test.result.fumble,true,'96 est un échec critique transmis par le Test partagé');
 assert.equal(critical.sprintDistance,11,'la distance dépend des DR de l’échec critique, pas du seul score Athlétisme');
});

test('Brisé indépendant — score ou jet Sprint absent et inversion favorable non choisie restent des entrées bloquantes',async()=>{
 const {store}=await fixture({skills:false});const move=preview(store,'flee',fleeFacts(true));assert.equal(isReady(move),true,move.error);await apply(store,move);
 const missingSkill=preview(store,'sprint',sprintFacts(true),{roll:20});assert.equal(missingSkill.ready,false);assert.ok(missingSkill.needsInput?.length);
 const {store:valid}=await fixture();const fleePlan=preview(valid,'flee',fleeFacts(true));await apply(valid,fleePlan);
 const missingRoll=preview(valid,'sprint',sprintFacts(true));assert.equal(missingRoll.ready,false);assert.ok(missingRoll.needsInput?.length);
});
test('Brisé indépendant — Prière déjà actionnelle puis acquisition bloque avec arbitrage MJ par occurrence',async()=>{
 const {store}=await fixture({states:[]});const contract=store.getDivineContract('divine:blessing:myrmidia:battle');
 await store.updateParticipant('priest',{talents:[{id:'talent-bless',catalogueTalentId:contract.requiredTalent.catalogueTalentId,status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],extensions:{v5:{divine:{sin:1},hasMomentum:true}}});
 const input={actorId:'priest',targetIds:['priest'],roll:99,wrathRoll:79,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{priest:{withinRange:true,ally:true}}}};
 const prayer=store.previewDivineExecution(contract.id,input);assert.equal(prayer.ready,true,prayer.error||JSON.stringify(prayer));
 const applied=await store.applyDivineExecution(contract.id,{preview:prayer});assert.equal(applied?.ok,true,JSON.stringify(applied));
 const afterPrayer=snapshot(store);assert.ok(afterPrayer.combat.participants.find(row=>row.id==='priest').states.some(row=>row.key==='brise'),'Courroux 89–95 pose réellement Brisé après la Prière');
 const actionRows=afterPrayer.extensions?.v5?.standardTurnActions||[];assert.ok(actionRows.some(row=>row.actorId==='priest'&&typeof row.turnId==='string'&&row.kind==='action'),'la preuve d’Action canonique du Tour est enregistrée pour la Prière');
 const blocked=preview(store,'flee',fleeFacts(true));assert.equal(blocked.ready,false);assert.equal(blocked.status,'blocked');assert.match(blocked.error,/DIV-BROKEN-MIDTURN-01/,'l’arbitrage explicitement décidé par le MJ est visible');
 const confirm=store.confirmBrokenEscapeVisibility({actorId:'priest',visibleToAnyEnemy:false});assert.equal(confirm.status,'blocked');assert.equal(confirm.code,'DIV-BROKEN-MIDTURN-01','le fait hors vue ne contourne pas la décision mid-Tour');
 assert.deepEqual(snapshot(store),afterPrayer,'aucun Move, Sprint, report automatique, confirmation visible ou mutation supplémentaire ne suit la décision requise');
});
test('Brisé indépendant — Sprint hors vue consomme son Action et interdit une seconde Action du même Tour',async()=>{
 const {store}=await fixture();
 const move=preview(store,'flee',fleeFacts(true,{moveMode:'walk'}));assert.equal(isReady(move),true,move.error);assert.equal((await apply(store,move))?.status,'applied');
 const sprint=preview(store,'sprint',sprintFacts(false),{roll:23});assert.equal(isReady(sprint),true,sprint.error);assert.equal((await apply(store,sprint))?.status,'applied');
 const afterSprint=snapshot(store);const attack=ordinaryAttack(store,false);
 assert.equal(attack.ready,false,'la visibilité hors vue ne rend pas à nouveau l’Action déjà dépensée par Sprint');
 assert.ok(attack.status==='blocked'||/Action|quota|déjà dépensée/i.test(attack.error||''));assert.deepEqual(snapshot(store),afterSprint,'le refus ne modifie ni cible, reçu, ni quotas');
 const prayer=store.previewDivineExecution('divine:blessing:myrmidia:battle',{actorId:'priest',brokenEscapeFacts:{visibleToAnyEnemy:false}});
 assert.equal(prayer.ready,false,'une Prière ne peut utiliser une seconde Action au même Tour après Sprint');assert.deepEqual(snapshot(store),afterSprint);
 const spell=store.previewSpellExecution('unrelated-spell',{actorId:'priest',brokenEscapeFacts:{visibleToAnyEnemy:false}});
 assert.equal(spell.ready,false,'un sort ne peut utiliser une seconde Action au même Tour après Sprint');assert.deepEqual(snapshot(store),afterSprint);
});

test('Brisé indépendant — Flee immédiatement hors de vue n’impose pas Sprint et laisse une Action unique',async()=>{
 const {store}=await fixture();const before=snapshot(store);
 const plan=preview(store,'flee',fleeFacts(true,{visibleToAnyEnemyAfter:false}));
 assert.equal(isReady(plan),true,'la Flee peut atteindre la cachette sans Sprint si le MJ confirme hors de vue');assert.deepEqual(snapshot(store),before,'le Move reste en preview pur');
 assert.equal((await apply(store,plan))?.status,'applied');
 const action=ordinaryAttack(store,false);assert.equal(action.ready,true,action.error||JSON.stringify(action));
 const committed=await store.applyResolution(action);assert.equal(committed?.status,'applied',JSON.stringify(committed));
 const second=ordinaryAttack(store,false);assert.equal(second.ready,false,'l’Action ordinaire est unique après le Move(Flee) qui a atteint hors vue');
});

test('Brisé indépendant — Sprinter reconnu depuis ids catalogue et libellés français reste explicitement bloqué',async()=>{
 for(const talent of [
  {id:'talent-sprinter',status:'resolved',rank:1},
  {id:'catalogue-sprinter',catalogueTalentId:'talent-sprinter',status:'resolved',rank:1},
  {id:'sprinter-fr',name:'Sprinter',status:'resolved',rank:1}
 ]){
  const {store}=await fixture({talents:[talent]});const move=preview(store,'flee',fleeFacts(true));assert.equal(isReady(move),true,move.error);await apply(store,move);
  const before=snapshot(store);const result=preview(store,'sprint',sprintFacts(true),{roll:23});
  assert.equal(result.ready,false,`talent valide ${JSON.stringify(talent)} ne doit pas disparaître de l’évaluation`);
  assert.match(result.error||'',/Sprinter|talent|non raccord/i);assert.deepEqual(snapshot(store),before);
 }
});
});

describe('fuite obligatoire de Brisé — Store', () => {
const person = (id, { states = [], hasMomentum = false } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 20,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  states: clone(states), armor: { head: 0, body: 0, arms: 0, legs: 0 },
  skills: [{ id: 'skill-athletics', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 60 }],
  extensions: { v5: { ...(hasMomentum ? { hasMomentum: true } : {}) } }
});
async function setup({ actor = person('hero', { states: [{ id: 'broken-state', name: 'Brisé', key: 'brise', level: 1 }] }), turnIndex = 1 } = {}) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [],
    combat: { round: 1, currentActorId: actor.id, order: [actor.id], participants: [actor] },
    log: [], diceLines: [], extensions: { v5: { combatId: 'encounter-broken', turnIndex } } });
  return store;
}
const snapshot = store => {
  const state = JSON.parse(store.getFullJSON());
  delete state.exportedAt;
  return state;
};

// This first focused test is the preserved red reproduction: Brisé has no
// canonical movement/Action sequence in the Store yet.
test('le Store expose un aperçu pur et une commande durable pour la fuite obligatoire de Brisé', async () => {
  const store = await setup();
  assert.equal(typeof store.previewBrokenEscape, 'function');
  assert.equal(typeof store.applyBrokenEscape, 'function');
  const before = snapshot(store);
  const preview = store.previewBrokenEscape({ actorId: 'hero', action: 'flee', facts: {
    visibleToAnyEnemy: true, engagedEnemyIds: [], moveMode: 'run', visibleToAnyEnemyAfter: true
  } });
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(snapshot(store), before, 'l’aperçu doit rester sans mutation');
});

test('une attestation MJ hors vue est durable, sans quota, et laisse le vrai prochain Tour avancer', async () => {
  const store = await setup();
  const before = snapshot(store);
  const confirmed = await store.confirmBrokenEscapeVisibility({ actorId: 'hero', visibleToAnyEnemy: false });
  assert.equal(confirmed.status, 'applied');
  const saved = snapshot(store);
  assert.deepEqual(saved.extensions.v5.brokenEscape.receipts.at(-1).visibleToAnyEnemy, false);
  assert.equal(saved.extensions.v5.brokenEscape.receipts.at(-1).source, 'explicit-gm');
  assert.deepEqual(saved.extensions.v5.actionLedger || before.extensions.v5.actionLedger, before.extensions.v5.actionLedger);
  const { previewV5Turn } = await import('../../../js/core/v5-turn.js');
  const turn = previewV5Turn(JSON.parse(store.getFullJSON()));
  assert.equal(turn.ready, true, turn.error);
});
});

describe('fuite de Brisé — simulation indépendante', () => {
function persistence(){let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};}
function actor(id,{camp='pj',state=false,initiative=60}={}){return{id,name:id,kind:'PJ',camp,zone:'active',initiative,hp:20,maxHp:30,caracs:{CC:45,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},armor:{head:0,body:0,arms:0,legs:0},states:state?[{id:'broken',key:'brise',name:'Brisé',level:1}]:[],traits:[],equipment:[],talents:[],skills:[{id:'athletics',name:'Athlétisme',carac:'Ag',status:'resolved',total:60}],actions:[{id:'blade',type:'attack',base:45,damage:3}],extensions:{v5:{divine:{sin:0}}}};}

test('Simulation indépendante — une seconde Action après Sprint hors vue est bloquée en preview, Test actionnel et commit',async()=>{
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-independent'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:true}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');
 const sprint=store.previewBrokenEscape({actorId:'priest',action:'sprint',facts:{visibleToAnyEnemyAfter:false},roll:23});
 assert.equal(sprint.ready,true,sprint.error);assert.equal((await store.applyBrokenEscape(sprint))?.status,'applied');
 const before=snapshot(store);
 const freeTest=store.previewResolution({actorId:'priest',action:{id:'free-test',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context:{isAction:false,runningOrHiding:false,involvesMovement:false,requiresSight:false,reliesOnSight:false}},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 assert.equal(freeTest.ready,true,freeTest.error||JSON.stringify(freeTest));assert.deepEqual(snapshot(store),before,'un Test nonActionnel reste disponible et le preview reste pur');
 const actionTest=store.previewResolution({actorId:'priest',action:{id:'action-test',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context:{isAction:true,runningOrHiding:false,involvesMovement:false,requiresSight:false,reliesOnSight:false}},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 const simulation=store.simulateAction({v5:{kind:'ranged'},actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,brokenEscapeFacts:{visibleToAnyEnemy:false}});
 let applied;try{applied=await store.applySimulation(simulation);}catch(error){applied={status:'rejected',reason:error?.message||String(error)};}
 const after=snapshot(store),failures=[];
 if(actionTest.ready!==false)failures.push('Test de Compétence explicitement actionnel accepté après que Sprint a consommé Action');
 if(simulation.ready!==false)failures.push('simulateAction accepte une nouvelle attaque Actionnelle après Sprint hors vue');
 if(applied?.status==='applied')failures.push('applySimulation applique effectivement une deuxième attaque Actionnelle');
 if(JSON.stringify(after)!==JSON.stringify(before))failures.push('la route Simulation a muté participants, journal ou quotas malgré la dépense du Tour');
 assert.deepEqual(failures,[],failures.join('; '));
});

async function afterSprint(){
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-reaction-independent'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:true}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');
 const sprint=store.previewBrokenEscape({actorId:'priest',action:'sprint',facts:{visibleToAnyEnemyAfter:false},roll:23});
 assert.equal(sprint.ready,true,sprint.error);assert.equal((await store.applyBrokenEscape(sprint))?.status,'applied');
 return store;
}
function attackInput(extra={}){return{actorId:'priest',targetId:'enemy',action:{id:'blade',type:'attack',base:45,damage:3},roll:25,brokenEscapeFacts:{visibleToAnyEnemy:false},...extra};}

test('Simulation indépendante — aucune Action seconde ne passe par simulation/commit, même avec marqueurs de réaction forgés',async t=>{
 const cases=[
  ['attaque ordinaire',attackInput({v5:{kind:'ranged'}})],
  ['isReaction non validé',attackInput({v5:{kind:'ranged',context:{isReaction:true}}})],
  ['reactionId racine inventé',attackInput({reactionId:'invented-reaction',v5:{kind:'ranged'}})],
  ['reactionId V5 inventé',attackInput({v5:{kind:'ranged',reactionId:'invented-reaction'}})]
 ];
 for(const [label,input] of cases){await t.test(label,async()=>{
  const store=await afterSprint(),before=snapshot(store),simulation=store.simulateAction(input);
  let applied;try{applied=await store.applySimulation(simulation);}catch(error){applied={status:'rejected',reason:error?.message||String(error)};}
  const after=snapshot(store),failures=[];
  if(simulation.ready!==false)failures.push('simulateAction accepte une seconde Action après Sprint hors vue');
  if(applied?.status==='applied')failures.push('applySimulation applique une deuxième Action après Sprint hors vue');
  if(JSON.stringify(after)!==JSON.stringify(before))failures.push('la tentative modifie l’état malgré le quota Action consommé');
  assert.deepEqual(failures,[],`${label}: ${failures.join('; ')}`);
 });}
});

async function afterFleeHidden(){
 const store=createStore({persistence:persistence(),storage:null});await store.ready;
 await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','enemy'],participants:[actor('priest',{state:true}),actor('enemy',{camp:'ennemi',initiative:30})]},diceLines:[],log:[],extensions:{v5:{turnIndex:1,combatId:'broken-simulation-classification'}}});
 const flee=store.previewBrokenEscape({actorId:'priest',action:'flee',facts:{visibleToAnyEnemy:true,engagedEnemyIds:[],moveMode:'walk',visibleToAnyEnemyAfter:false}});
 assert.equal(flee.ready,true,flee.error);assert.equal((await store.applyBrokenEscape(flee))?.status,'applied');return store;
}

test('Simulation indépendante — un Test de compétence ambigu sous Brisé exige sa classification avant et après Sprint',async t=>{
 const input=(context={runningOrHiding:false,involvesMovement:false})=>({actorId:'priest',action:{id:'generic-skill',type:'skill',base:60,attr:'Ag'},roll:23,v5:{kind:'test',context},brokenEscapeFacts:{visibleToAnyEnemy:false}});
 const store=await afterSprint(),before=snapshot(store),unknown=store.previewResolution(input());
 const directBefore=snapshot(store);let direct;try{direct=await store.applyResolution(unknown);}catch(error){direct={status:'rejected',reason:error?.message||String(error)};}
 const afterDirect=snapshot(store);
 const simulation=store.simulateAction(input());let simulationApply;try{simulationApply=await store.applySimulation(simulation);}catch(error){simulationApply={status:'rejected',reason:error?.message||String(error)};}
 const afterSimulation=snapshot(store);
 const action=store.previewResolution(input({isAction:true,runningOrHiding:false,involvesMovement:false}));
 const free=store.previewResolution(input({isAction:false,runningOrHiding:false,involvesMovement:false}));
 const hidden=await afterFleeHidden(),hiddenBefore=snapshot(hidden),unknownBeforeSpend=hidden.previewResolution(input());
 const freeBeforeSpend=hidden.previewResolution(input({isAction:false,runningOrHiding:false,involvesMovement:false}));
 const freeCommit=await hidden.applyResolution(freeBeforeSpend);const hiddenAfter=snapshot(hidden);
 const failures=[];
 if(unknown.ready!==false)failures.push('Test Compétence isAction absent accepté après Sprint au lieu de demander une classification');
 if(direct?.status==='applied')failures.push('applyResolution direct applique le Test Compétence non classé après Sprint');
 if(JSON.stringify(afterDirect)!==JSON.stringify(directBefore))failures.push('applyResolution direct mute le Store après refus manquant');
 if(simulation.ready!==false)failures.push('simulateAction accepte le Test Compétence non classé après Sprint');
 if(simulationApply?.status==='applied')failures.push('applySimulation applique le Test Compétence non classé après Sprint');
 if(JSON.stringify(afterSimulation)!==JSON.stringify(before))failures.push('applySimulation mute le Store après dépense Sprint');
 if(action.ready!==false)failures.push('isAction=true devrait être bloqué par quota Action déjà dépensé');
 if(free.ready!==true)failures.push('isAction=false explicite doit rester un Test libre disponible après Sprint');
 if(unknownBeforeSpend.ready!==false)failures.push('Test Compétence ambigu avant dépense accepté sans classification explicite');
 if(freeBeforeSpend.ready!==true||freeCommit?.status!=='applied')failures.push('isAction=false explicite doit rester testable avant dépense');
 const spentBefore=before.extensions?.v5?.actionLedger?.quotaUsage||[],spentAfter=hiddenAfter.extensions?.v5?.actionLedger?.quotaUsage||[];
 if(JSON.stringify(spentAfter)!==JSON.stringify(hiddenBefore.extensions?.v5?.actionLedger?.quotaUsage||[]))failures.push('Test isAction=false a inventé une dépense Action');
 assert.deepEqual(failures,[],failures.join('; '));
});
});
