import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const memory=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const q=(id,parameter='')=>({id,parameter});
async function setup(){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  const weapon={id:'net-1',kind:'weapon',name:'Entrave',keywords:[q('immobilisante','2')],extensions:{}};
  const holder={id:'holder',name:'Porteur',camp:'allies',kind:'PJ',zone:'active',hp:20,maxHp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],armor:{},extensions:{v5:{hasMomentum:false}}};
  const victim={id:'victim',name:'Cible',camp:'foes',kind:'PNJ',zone:'active',hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],armor:{},extensions:{v5:{hasMomentum:false}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'holder',order:['holder','victim'],participants:[holder,victim]},log:[],diceLines:[]});
  return{store,persistence};
}
const participant=(store,id)=>store.listParticipants().find(row=>row.id===id);

test('F2-D Immobilisante Store — échec sans changement, libération, Undo et rechargement restent atomiques',async()=>{
  let {store,persistence}=await setup();
  let plan=store.previewResolution({actorId:'holder',targetId:'victim',resolutionId:'net-store-hit',roll:20,round:1,
    action:{id:'net-attack',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('immobilisante','2')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(plan.entanglement.weaponLocked,true);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  assert.equal(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
  assert.equal(participant(store,'victim').states[0].strength,3,'Immobilisante utilise la Force de l’attaquant, non le chiffre non publié du mot-clé');
  assert.equal(await store.undo(),true);
  assert.equal(participant(store,'victim').states.some(row=>row.key==='enchevetre'),false);
  assert.equal(participant(store,'holder').equipment[0].extensions?.v5?.entanglementLocks,undefined);
  assert.equal(await store.redo(),true);
  assert.equal(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
  const afterHit=store.getFullJSON();
  let restored=createStore({storage:null,persistence});await restored.ready;await restored.loadFromJSON(afterHit);
  assert.equal(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);

  let victim=participant(restored,'victim');
  for(const [index,roll] of [30,12,12].entries()){
    if(!victim.states.length)break;
    plan=restored.previewResolution({actorId:'victim',resolutionId:`net-store-escape-${index+1}`,roll,round:1,
      action:{id:'escape',type:'test',attr:'F',base:30,label:'Force'},
      v5:{kind:'test',context:{netEscapeConditionId:victim.states[0].id,netEscapeOpponentRoll:index===0?1:30,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
    assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
    assert.equal((await restored.applyResolution(plan)).status,'applied');
    victim=participant(restored,'victim');
    if(index===0){
      assert.equal(victim.states[0].level,1,'un échec opposé ne change pas Empêtré');
      assert.equal(victim.extensions.v5.netEscapeProgress?.[victim.states[0].id],undefined,'les DR ne se cumulent plus');
      const mid=restored.getFullJSON(),afterReload=createStore({storage:null,persistence});await afterReload.ready;await afterReload.loadFromJSON(mid);
      assert.equal(participant(afterReload,'victim').states[0].level,1);
      restored=afterReload;
    }
  }
  assert.equal(participant(restored,'victim').states.some(row=>row.key==='enchevetre'),false);
  assert.deepEqual(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks,[]);
  assert.equal(await restored.undo(),true);
  assert.equal(participant(restored,'victim').states.some(row=>row.key==='enchevetre'),true);
  assert.equal(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks.length,1);
});

test('F2-D Inflige Empêtré — libération volontaire retire état et verrou; Undo et persistence les restaurent',async()=>{
  const {store,persistence}=await setup();
  let plan=store.previewResolution({actorId:'holder',targetId:'victim',resolutionId:'voluntary-net-hit',roll:20,round:1,
    action:{id:'net-attack',type:'attack',attr:'CT',base:50,damage:0,qualities:[q('inflige','Empêtré 55')],extensions:{fiche:{equipmentId:'net-1'}}},
    attackContext:{ranged:true},v5:{kind:'ranged'}});
  assert.equal(plan.entanglement.weaponLocked,true);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  const linkId=participant(store,'victim').states[0].source.linkId;
  plan=store.previewResolution({actorId:'holder',resolutionId:'voluntary-net-release',round:1,roll:20,
    action:{id:'release-net',type:'test',attr:'F',base:50,label:'Force'},
    v5:{kind:'test',context:{releaseEntanglementLinkId:linkId,involvesMovement:false,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.equal(plan.unresolved.length,0,plan.unresolved.join('; '));
  assert.ok(plan.entanglementRelease);
  assert.equal((await store.applyResolution(plan)).status,'applied');
  assert.equal(participant(store,'victim').states.some(row=>row.source?.linkId===linkId),false);
  assert.deepEqual(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks,[]);
  assert.equal(await store.undo(),true);
  assert.equal(participant(store,'victim').states.some(row=>row.source?.linkId===linkId),true);
  assert.deepEqual(participant(store,'holder').equipment[0].extensions.v5.entanglementLocks,[linkId]);
  const snapshot=store.getFullJSON(),restored=createStore({storage:null,persistence});await restored.ready;await restored.loadFromJSON(snapshot);
  assert.equal(participant(restored,'victim').states.some(row=>row.source?.linkId===linkId),true);
  assert.deepEqual(participant(restored,'holder').equipment[0].extensions.v5.entanglementLocks,[linkId]);
});
