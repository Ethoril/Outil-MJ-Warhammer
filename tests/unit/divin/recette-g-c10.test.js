import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProfileJson} from '../../../js/core/json-profile-import.js';
import {createStore} from '../../../js/core/store.js';

test('C10 : Protection reste annulable et sa commande sous 200 Ko dans une grande rencontre',async()=>{
  const p=parseProfileJson(readFileSync(new URL('../../../docs/recette/profils-recette-complets.json',import.meta.url),'utf8')).profiles;
  const setup=createStore({storage:null});await setup.ready;
  await setup.importParsedProfiles([...p,...p.slice(0,14).map((x,i)=>({...x,name:x.name+' '+i}))]);
  await setup.addProfilesToCombat(setup.listProfiles().map(x=>x.id),{zone:'active'});
  const v=JSON.parse(setup.getFullJSON()),c=v.combat;delete v.history;
  v.activeScene={id:'scene',encounterId:'enc',title:'test',notes:'',status:'active',round:c.round,currentActorId:c.currentActorId,order:c.order,participants:structuredClone(c.participants),reinforcements:[],events:[],startedAt:null,extensions:{},revision:0};
  v.encounters=[{id:'enc',name:'test'}];
  let saved;const store=createStore({persistence:{async load(){return null},async saveAtomic({state}){saved=structuredClone(state);return {ok:true}}},storage:null});await store.ready;await store.loadFromJSON(v);
  const actor=store.listParticipants().find(x=>x.name==='Recette Prêtre de Myrmidia'), target=store.listParticipants().find(x=>x.id!==actor.id);
  const before=store.listParticipants();const id='divine:blessing:myrmidia:protection';
  const preview=store.previewDivineExecution(id,{actorId:actor.id,targetIds:[target.id],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0},expiry:{phase:'endOfTurn',round:6,actorId:actor.id},facts:{targets:{[target.id]:{withinRange:true}}}});
  assert.equal(preview.ready,true,preview.error);
  const result=await store.applyDivineExecution(id,{preview});assert.equal(result.ready,true,result.error);
  assert.ok(Buffer.byteLength(JSON.stringify(saved.history.past.at(-1)))<200*1024,'commande sous 200 Ko');
  const restored=createStore({persistence:{async load(){return structuredClone(saved)},async saveAtomic({state}){saved=structuredClone(state);return {ok:true}}},storage:null});await restored.ready;
  assert.equal(await restored.undo(),true);assert.deepEqual(restored.listParticipants(),before);
  assert.equal(await restored.redo(),true);assert.ok(restored.listParticipants().find(x=>x.id===target.id).extensions.v5.divineEffects?.length);
});

test('C10 : la purge de rencontre ne réintroduit pas de reçus depuis une commande compacte',async()=>{
  const {createCompactStateCommand,applyStateChanges}=await import('../../../js/core/commands.js');
  const {purgeEncounterJournalHistory,encounterJournalScope}=await import('../../../js/core/encounter-journal.js');
  const before={activeScene:{id:'s',encounterId:'a',participants:[{id:'p'}]},extensions:{v5:{actionLedger:{appliedActions:[],quotaUsage:[]}}},log:[],archives:[],appliedResolutionIds:[]};
  const after=structuredClone(before);after.extensions.v5.actionLedger.appliedActions.push({encounterId:'a'});
  const command=createCompactStateCommand({id:'c',type:'test',before,after});
  const history={past:[command],future:[]};
  const scope=encounterJournalScope({...after,history},'a');
  const clean=purgeEncounterJournalHistory(history,scope,after);
  const replay=applyStateChanges(before,clean.past[0].result.changes);
  assert.deepEqual(replay.extensions.v5.actionLedger.appliedActions,[]);
  assert.deepEqual(scope.participantIds,['p']);
});


// Contre-vérification (Claude) : toutes les commandes ordinaires doivent passer dans une grande rencontre.
test('C10/C14 : Tour suivant et PV directs passent et s’annulent dans une grande rencontre',async()=>{
  const p=parseProfileJson(readFileSync(new URL('../../../docs/recette/profils-recette-complets.json',import.meta.url),'utf8')).profiles;
  const setup=createStore({storage:null});await setup.ready;
  await setup.importParsedProfiles([...p,...p.slice(0,14).map((x,i)=>({...x,name:x.name+' '+i}))]);
  await setup.addProfilesToCombat(setup.listProfiles().map(x=>x.id),{zone:'active'});
  const v=JSON.parse(setup.getFullJSON()),c=v.combat;delete v.history;
  v.activeScene={id:'scene',encounterId:'enc',title:'test',notes:'',status:'active',round:c.round,currentActorId:c.currentActorId,order:c.order,participants:structuredClone(c.participants),reinforcements:[],events:[],startedAt:null,extensions:{},revision:0};
  v.encounters=[{id:'enc',name:'test'}];
  const store=createStore({persistence:{async load(){return null},async saveAtomic(){return {ok:true}}},storage:null});await store.ready;await store.loadFromJSON(v);
  const target=store.listParticipants()[1];const before=store.listParticipants();
  await store.updateParticipant(target.id,{hp:target.hp-1});
  assert.equal(store.listParticipants().find(x=>x.id===target.id).hp,target.hp-1);
  await store.nextTurn();
  assert.equal(await store.undo(),true);assert.equal(await store.undo(),true);
  assert.deepEqual(store.listParticipants(),before);
});
