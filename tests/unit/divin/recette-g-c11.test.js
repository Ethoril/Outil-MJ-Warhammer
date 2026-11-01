import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseProfileJson} from '../../../js/core/json-profile-import.js';
import {createStore} from '../../../js/core/store.js';

test('C11 : Serres d’Ambre et un critique s’appliquent dans une grande rencontre',async()=>{
  const p=parseProfileJson(readFileSync(new URL('../../../docs/recette/profils-recette-complets.json',import.meta.url),'utf8')).profiles;
  const setup=createStore({storage:null});await setup.ready;
  await setup.importParsedProfiles([...p,...p.slice(0,14).map((x,i)=>({...x,name:x.name+' '+i}))]);
  await setup.addProfilesToCombat(setup.listProfiles().map(x=>x.id),{zone:'active'});
  const v=JSON.parse(setup.getFullJSON()),c=v.combat;delete v.history;
  v.activeScene={id:'scene',encounterId:'enc',title:'test',notes:'',status:'active',round:c.round,currentActorId:c.currentActorId,order:c.order,participants:structuredClone(c.participants),reinforcements:[],events:[],startedAt:null,extensions:{},revision:0};
  v.encounters=[{id:'enc',name:'test'}];
  let saved;const store=createStore({persistence:{async load(){return null},async saveAtomic({state}){saved=structuredClone(state);return {ok:true}}},storage:null});await store.ready;await store.loadFromJSON(v);
  const mage=store.listParticipants().find(x=>x.name==='Recette Mage des Bêtes');
  const input={actorId:mage.id,targetIds:[mage.id],roll:23,attributeActive:false};
  const spell=store.previewSpellExecution('Serres d’Ambre',input);assert.equal(spell.ready,true,spell.error);
  const cast=await store.applySpellExecution('Serres d’Ambre',{...input,preview:spell});assert.equal(cast.success,true);
  const actor=store.listParticipants().find(x=>x.id!==mage.id), target=store.listParticipants().find(x=>x.id!==mage.id&&x.id!==actor.id);
  const critical=store.previewResolution({actorId:actor.id,targetId:target.id,resolutionId:'critical',roll:22,criticalRolls:{location:2,effect:20},action:{type:'attack',attr:'CC',base:60,damage:4},defense:{base:30,roll:81},v5:{kind:'melee'}});
  assert.equal(critical.ready,true);assert.deepEqual(critical.unresolved,[]);assert.equal((await store.applyResolution(critical)).status,'applied');
});
