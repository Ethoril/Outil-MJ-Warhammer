import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import * as divineStore from '../js/core/v5-divine-store.js';
import { expireDivineEffects } from '../js/core/v5-divine-engine.js';
import { previewResolution } from '../js/core/resolution.js';
import { previewMagicMeditation } from '../js/core/v5-magic-talents.js';
import { advanceGameClock, createGameClock } from '../js/core/v5-game-time.js';
import { migrateSnapshot } from '../js/core/migrations.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };

// Contrôles indépendants. Sources: Courroux 6–10, L06 p.218;
// semaine impériale huit jours p.177/289 (contrôle texte + visuel séparé).
// 86400s/jour = convention d'unité outil, jamais une citation de ces pages.
const WEEK = 8 * 86400;
const BATTLE = 'divine:blessing:myrmidia:battle';
const COURAGE = 'divine:blessing:myrmidia:courage';
const SUN = 'divine:miracle:soleil-flamboyant';
const PRAY_ID = 'skill-50_72_69_e8_72_65-base';
const row = registry.wrathTable.find(item => item.id === 'wrath:6-10');
const clone = value => structuredClone(value);
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
  const input=prayer({roll,wrathRoll:6,executionId,...(note?{wrathConsequences:'Ancienne confirmation MJ explicite du résultat6–10.'}:{})});
  const before=stateOf(store), preview=store.previewDivineExecution(BATTLE,input);
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult?.id,'wrath:6-10');
  assert.deepEqual(stateOf(store),before,'calculer le Courroux ne pose aucune sanction');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true,result.error); assert.equal(result.ready,true,result.error);
  const caps=capsOf(actorOf(store));
  assert.ok(caps.some(effect=>effect.originExecutionId===executionId),'la vraie résolution6–10 doit poser son plafond autonome');
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

test('Courroux calendaire indépendant —6–10 canonique n’exige plus de texte MJ libre',async()=>{
  const {store}=await fixture();
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:6,executionId:'without-note'}));
  assert.equal(preview.ready,true,preview.error);
  assert.equal(preview.wrathTableResult.id,'wrath:6-10');
  const result=await store.applyDivineExecution(BATTLE,{preview});
  assert.equal(result.ok,true); assert.equal(capsOf(actorOf(store)).length,1);
});
test('Courroux calendaire indépendant —les autres lignes conservent le traitement MJ',async()=>{
  const {store}=await fixture();
  for(const wrathRoll of [1,78]) {
    const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll}));
    assert.equal(preview.ready,false);
    assert.equal(preview.status,'needs-wrath-resolution');
    assert.ok(preview.needsInput.some(need=>need.field==='wrathConsequences'));
  }
  const lessons=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:11}));
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
  const fumble=store.previewDivineExecution(COURAGE,prayer({roll:99,wrathRoll:6}));
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
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:6,wrathConsequences:'Ancienne note'}));assert.equal(preview.ready,true,preview.error);
  let before=stateOf(store);persistence.refuse=true;assert.equal((await store.applyDivineExecution(BATTLE,{preview})).ok,false);
  assert.deepEqual(stateOf(store),before);persistence.refuse=false;
  await store.applyDivineExecution(BATTLE,{preview});assert.equal(capsOf(actorOf(store)).length,1);
  before=stateOf(store);persistence.refuse=true;assert.equal((await step(store,WEEK)).ok,false);assert.deepEqual(stateOf(store),before);
});
test('Courroux calendaire indépendant —aperçu périmé par temps refusé sans pose',async()=>{
  const {store}=await fixture();const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:6,wrathConsequences:'Ancienne note'}));
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
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:6,wrathConsequences:'Ancienne note'}));
  assert.equal(preview.ready,false,'addition de la durée hors entier sûr refusée avant confirmation');assert.deepEqual(stateOf(store),before);
});
test('Courroux calendaire indépendant —helper commun pur et retour d’expireur existent',async()=>{
  let module=null;try{module=await import('../js/core/v5-divine-prayer-caps.js');}catch{}
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
  const preview=store.previewDivineExecution(BATTLE,prayer({roll:99,wrathRoll:6,wrathConsequences:'Ancienne note'}));
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
  const reordered=reorder(actor),before=clone(reordered),{applyPrayerSLCaps}=await import('../js/core/v5-divine-prayer-caps.js');
  const result=applyPrayerSLCaps(reordered,{success:true,sl:4});
  assert.equal(result.ok,true,'l’ordre des clés transportées par RTDB ne modifie pas la règle');
  assert.equal(result.test.sl,0);assert.deepEqual(reordered,before);
});
test('Courroux calendaire adversarial —RTDB restaure uniquement lastEventId null initial attesté',async()=>{
  const {store}=await fixture();const {cap}=await impose(store);
  assert.equal(cap.clockAnchor.clockRevision,0);assert.equal(cap.clockAnchor.lastEventId,null);
  const {validateSyncDocument}=await import('../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../js/core/sync-session.js');
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
  const {sanitizeMagicEnvelope}=await import('../js/core/sanitize.js');
  const {validatePrayerSLCaps}=await import('../js/core/v5-divine-prayer-caps.js');
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
  const before=clone(wire),{normalizeRemoteDocument}=await import('../js/core/sync-session.js');
  let decoded;
  try{decoded=normalizeRemoteDocument(wire);}
  catch(error){assert.match(error.message,/source|sanction|cap|clock|calendaire|reçu|ancre|invalid/i);assert.deepEqual(wire,before);return;}
  const actor=decoded.state.combat.participants.find(p=>p.id==='priest');
  assert.equal(Object.hasOwn(capsOf(actor)[0].clockAnchor,'lastEventId'),false,'le null n’est reconstruit que pour la forme initiale canonique attestée');
  const {validatePrayerSLCaps}=await import('../js/core/v5-divine-prayer-caps.js');
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
  const {validateSyncDocument}=await import('../js/core/sync-protocol.js');
  const {normalizeRemoteDocument}=await import('../js/core/sync-session.js');
  const wire=validateSyncDocument({revision:0,state:stateOf(store)});
  const actor=wire.state.combat.participants.find(p=>p.id==='priest');
  delete capsOf(actor)[0].clockAnchor.lastEventId;
  const before=clone(wire),decoded=normalizeRemoteDocument(wire),received=decoded.state.combat.participants.find(p=>p.id==='priest');
  assert.deepEqual(capsOf(received)[0].clockAnchor,cap.clockAnchor,'la pose à0 reste historique quand le curseur courant devient positif');
  const {validatePrayerSLCaps}=await import('../js/core/v5-divine-prayer-caps.js');
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
