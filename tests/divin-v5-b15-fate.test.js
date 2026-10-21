import test from 'node:test';import assert from 'node:assert/strict';import{createStore}from '../js/core/store.js';import{fixture,priest,snap,input,BATTLE}from './divin-v5-b5-fixture.mjs';
const rows=s=>priest(s).extensions.v5.divineJudgments||[],rejections=s=>priest(s).extensions.v5.divineRejections||[];
async function setup(fate=1){const c=await fixture(6),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,{id:'talent-invoke',rank:1,status:'resolved',specialization:'Myrmidia'}],skills:a.skills.map(row=>row.id==='pray'?{...row,advances:10,total:70}:row),fate,extensions:{...a.extensions,v5:{...a.extensions.v5,fate}}});return c;}
async function judge(s,extra={}){const p=s.previewDivineExecution(BATTLE,input(91,{executionId:'b15-judgment',...extra}));assert.equal(p.ready,true,p.error);assert.equal(p.wrathTableResult.id,'wrath:151-plus');const r=await s.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true,r.error);return p;}
const back=(s,extra={})=>s.returnDivineJudgment('priest',rows(s)[0].id,{reason:'Retour au choix du MJ',returnPoint:'Au temple de Myrmidia',...extra});
const decide=(s,extra={})=>s.decideDivineJudgmentRejection('priest',rows(s)[0].id,{confirm:true,reason:'Je vous rejette',wrathRejectionConfirmed:true,wrathPrayAdvances:10,...extra});
const fate=s=>priest(s).extensions.v5.fate;
test('B15 — 151+ sans note MJ : départ enregistré, Péché décrémenté, aucun Destin débité, rien d’inventé',async()=>{
  const{store}=await setup(1),before=snap(store);const p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b15-judgment'}));assert.equal(p.ready,true,p.error);assert.deepEqual(snap(store),before);assert.equal(p.wrathJudgmentPreview.fate,1);
  await store.applyDivineExecution(BATTLE,{preview:p});const j=rows(store);assert.equal(j.length,1);assert.equal(j[0].status,'departed');assert.equal(j[0].resultId,'wrath:151-plus');assert.equal(j[0].cult,'Myrmidia');
  assert.equal(fate(store),1);assert.equal(priest(store).extensions.v5.divine.sin,5);assert.equal(rejections(store).length,0);assert.ok(snap(store).combat.participants.some(r=>r.id==='priest'));assert.equal(priest(store).hp,20);
});
test('B15 — retour refusé sans Destin, Destin inconnu, joueur, motif/point manquant, révision périmée',async()=>{
  for(const value of[0]){const{store}=await setup(1);await judge(store);const state=JSON.parse(store.getFullJSON()),a=state.combat.participants.find(r=>r.id==='priest');if(value===undefined){delete a.fate;delete a.extensions.v5.fate;}else{a.fate=0;a.extensions.v5.fate=0;}await store.loadFromJSON(state);const b=snap(store);await assert.rejects(()=>back(store),/Destin/);assert.deepEqual(snap(store),b);}
  const{store}=await setup(1);await judge(store);const b=snap(store);
  await assert.rejects(()=>back(store,{returnPoint:' '}),/point|retour/i);await assert.rejects(()=>back(store,{reason:''}),/motif/i);await assert.rejects(()=>back(store,{baseRevision:0}),/changé|relisez/i);await assert.rejects(()=>store.returnDivineJudgment('priest','inconnu',{reason:'x',returnPoint:'y'}),/introuvable|jugement/i);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.returnDivineJudgment('priest',rows(player)[0].id,{reason:'x',returnPoint:'y'}),/MJ/);assert.deepEqual(snap(store),b);
});
test('B15 — retour : Destin débité une seule fois, rejet seulement proposé, aucune mutation du personnage',async()=>{
  const{store}=await setup(2);await judge(store);const talents=priest(store).talents,skills=priest(store).skills;
  const r=await back(store);assert.equal(r.ok,true);assert.equal(fate(store),1);assert.equal(priest(store).fate,1);const j=rows(store)[0];assert.equal(j.status,'returned');assert.equal(j.returnPoint,'Au temple de Myrmidia');assert.equal(j.rejectionProposal.status,'proposed');assert.equal(j.rejectionProposal.resultId,'wrath:146-150');
  assert.equal(rejections(store).length,0);assert.deepEqual(priest(store).talents,talents);assert.deepEqual(priest(store).skills,skills);
  await assert.rejects(()=>back(store),/déjà|retour/i);assert.equal(fate(store),1);
});
test('B15 — le Destin temporaire des couches est dépensé avant le permanent, et suffit seul',async()=>{
  for(const permanent of[0,1]){const{store}=await setup(permanent);await judge(store);const state=JSON.parse(store.getFullJSON());const a=state.combat.participants.find(r=>r.id==='priest');a.extensions.v5.spellEffects=[{id:'tf-b15',remainingTempFate:1}];await store.loadFromJSON(state);
   await back(store);assert.equal(priest(store).extensions.v5.spellEffects[0].remainingTempFate,0);assert.equal(fate(store),permanent);}
});
test('B15 — confirmation du rejet : perte réelle des talents du culte et des avances, données MJ obligatoires',async()=>{
  const{store}=await setup(1);await judge(store);await back(store);
  for(const extra of[{wrathRejectionConfirmed:false},{wrathPrayAdvances:undefined},{wrathPrayAdvances:0},{wrathPrayAdvances:11},{reason:''}]){const b=snap(store);await assert.rejects(()=>decide(store,extra));assert.deepEqual(snap(store),b);}
  const r=await decide(store);assert.equal(r.ok,true);const a=priest(store);assert.equal(a.talents.some(t=>t.specialization==='Myrmidia'),false);assert.equal(a.skills.find(s=>s.id==='pray').advances,0);assert.equal(a.skills.find(s=>s.id==='pray').total,60);
  assert.equal(rejections(store).length,1);assert.equal(rejections(store)[0].kind,'permanent');assert.equal(rows(store)[0].status,'rejected');assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);
  await assert.rejects(()=>decide(store),/déjà|décidé/i);
});
test('B15 — le MJ peut ne pas confirmer le rejet : motif consigné, aucune perte',async()=>{
  const{store}=await setup(1);await judge(store);await back(store);const talents=priest(store).talents;
  await assert.rejects(()=>store.decideDivineJudgmentRejection('priest',rows(store)[0].id,{confirm:false,reason:''}),/motif/i);
  assert.equal((await store.decideDivineJudgmentRejection('priest',rows(store)[0].id,{confirm:false,reason:'Clémence du MJ'})).ok,true);assert.equal(rows(store)[0].status,'returned-without-rejection');assert.equal(rows(store)[0].rejectionProposal.declinedReason,'Clémence du MJ');assert.deepEqual(priest(store).talents,talents);assert.equal(rejections(store).length,0);
});
test('B15 — décision avant retour refusée, retour après décision refusé',async()=>{
  const{store}=await setup(1);await judge(store);const b=snap(store);await assert.rejects(()=>decide(store),/retour|Destin/i);assert.deepEqual(snap(store),b);
  await back(store);await decide(store);await assert.rejects(()=>back(store),/déjà|retour/i);
});
test('B15 — un rejet permanent survenu entre-temps n’est pas dupliqué à la confirmation',async()=>{
  const{store}=await setup(1);await judge(store);await store.setDivineSin('priest',5,{reason:'Cible 146-150'});
  const p=store.previewDivineExecution(BATTLE,input(96,{executionId:'b15-pre',wrathRejectionConfirmed:true,wrathPrayAdvances:10}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});
  await back(store);const r=await decide(store);assert.equal(r.ok,true);assert.equal(rejections(store).length,1);assert.equal(rows(store)[0].status,'rejected');assert.equal(rows(store)[0].rejectionProposal.outcome,'already-permanent');
});
test('B15 — refus de persistance, Undo/Redo et rechargement pour départ, retour et décision',async()=>{
  const{store,persistence,setRefuse}=await setup(1),p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b15-judgment'})),b0=snap(store);
  setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),b0);setRefuse(false);await store.applyDivineExecution(BATTLE,{preview:p});
  const b1=snap(store);setRefuse(true);const refused=await back(store).catch(error=>({ok:false,error}));assert.equal(refused.ok,false);assert.deepEqual(snap(store),b1);setRefuse(false);
  await back(store);assert.equal(fate(store),0);await store.undo();assert.equal(fate(store),1);assert.equal(rows(store)[0].status,'departed');await store.redo();assert.equal(rows(store)[0].status,'returned');
  await decide(store);await store.undo();assert.equal(rejections(store).length,0);assert.equal(priest(store).skills.find(s=>s.id==='pray').advances,10);await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(reload.getFullJSON()&&JSON.parse(reload.getFullJSON()).combat.participants.find(r=>r.id==='priest').extensions.v5.divineJudgments[0].status,'rejected');
});
test('B15 — retrait, copie ou changement de statut par commande générique refusés',async()=>{
  const{store}=await setup(1);await judge(store);const a=priest(store),ext=(patch)=>({...a.extensions,v5:{...a.extensions.v5,...patch}});
  await assert.rejects(()=>store.updateParticipant('priest',{extensions:ext({divineJudgments:[]})}),/jugement|attest|refus/i);
  await assert.rejects(()=>store.updateParticipant('priest',{extensions:ext({divineJudgments:[{...rows(store)[0],status:'returned'}]})}),/jugement|attest|refus/i);
  const ally=store.listParticipants().find(r=>r.id==='ally');await assert.rejects(()=>store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...ally.extensions.v5,divineJudgments:rows(store)}}}),/jugement|sujet|source|invalide/i);
  assert.equal(rows(store)[0].status,'departed');
});
test('B15 — récupération B04 déclenchant 151+ enregistre aussi le départ',async()=>{
  const{store}=await setup(1);await store.setDivineSin('priest',1,{reason:'À Terre'});let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b15-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',6,{reason:'Nouvelle occurrence'});
  p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:91,executionId:'b15-rec'});assert.equal(p.ready,true,p.error);assert.equal((await store.applyDivineWrathRecovery({preview:p})).ok,true);assert.equal(rows(store)[0].status,'departed');assert.equal(fate(store),1);
});
