import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

const memory=()=>{let saved=null;return{async load(){return saved&&structuredClone(saved);},async saveAtomic({state}){saved=structuredClone(state);return{ok:true};}};};
const item=name=>getReferenceCatalogue().items.find(row=>row.name===name);

async function scene(weapon){
  const persistence=memory(),store=createStore({storage:null,persistence});await store.ready;
  const holder={id:'holder',name:'Porteur',kind:'PJ',camp:'allies',zone:'active',hp:20,maxHp:20,caracs:{CC:50,CT:50,F:3,E:30},skills:[],states:[],equipment:[weapon],extensions:{v5:{}}};
  const victim={id:'victim',name:'Cible',kind:'PNJ',camp:'foes',zone:'active',hp:20,maxHp:20,caracs:{CC:40,CT:40,F:30,E:30},skills:[],states:[],equipment:[],extensions:{v5:{}}};
  await store.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:holder.id,order:[holder.id,victim.id],participants:[holder,victim]},log:[],diceLines:[]});
  const attack=store.previewResolution({actorId:holder.id,targetId:victim.id,resolutionId:`hit-${weapon.id}`,roll:20,round:1,
    action:{type:'attack',attr:'CC',base:50,damage:4,qualities:weapon.keywords,extensions:{fiche:{equipmentId:weapon.id}}},
    defense:{type:'skill',attr:'CC',base:30,roll:20,label:'Corps à corps',v5:{kind:'melee',context:{}}},v5:{kind:'melee'}});
  const applied=await store.applyResolution(attack);assert.equal(applied.status,'applied',attack.unresolved.join('; '));
  return store;
}

test('T2 bis filet générique — la Force catalogue est testée et un échec ne renforce pas Empêtré',async()=>{
  const store=await scene(item('Filet'));
  let victim=store.listParticipants().find(row=>row.id==='victim');
  const condition=victim.states.find(row=>row.key==='enchevetre');assert.equal(condition.strength,50);
  const escapeInput={actorId:'victim',resolutionId:'escape-catalog-net-negative',roll:20,round:1,
    action:{type:'skill',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:20,requiresSight:false,reliesOnSight:false,usesFellowship:false}}};
  const wrongType=store.previewResolution(escapeInput);
  assert.ok(wrongType.unresolved.includes('Entrave : le Test de sortie doit être un Test de Force.'),'un jet de compétence ne peut pas se déclarer Test de sortie');
  const wrongAttribute=store.previewResolution({...escapeInput,resolutionId:'escape-catalog-net-wrong-attribute',action:{...escapeInput.action,type:'test',attr:'Ag'}});
  assert.ok(wrongAttribute.unresolved.includes('Entrave : le Test de sortie doit être un Test de Force.'),'le type Test ne suffit pas sans caractéristique Force');
  const preview=store.previewResolution({actorId:'victim',resolutionId:'escape-catalog-net',roll:20,round:1,
    action:{type:'test',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:20,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.test.sl,0,'Empêtré impose −1 DR au Test de sortie impliquant un mouvement');
  assert.equal(preview.netEscape.opposition.sourceScore,50,'la Force publiée du filet sert de score au Test adverse');
  assert.equal(preview.netEscape.freed,false);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  victim=store.listParticipants().find(row=>row.id==='victim');
  assert.equal(victim.states.find(row=>row.id===condition.id).level,1);
  assert.equal(victim.extensions.v5.netEscapeProgress?.[condition.id],undefined,'les DR ne se cumulent pas');
});

test('T2 bis Mancatcher catalogue — ressort ajoute +2 DR au Test de Force du porteur pendant l’opposition',async()=>{
  const catalog=item('Mancatcher (2M)');
  const weapon={...catalog,extensions:{v5:{springLoaded:true}}};
  const store=await scene(weapon);
  let victim=store.listParticipants().find(row=>row.id==='victim');
  const condition=victim.states.find(row=>row.key==='enchevetre');
  assert.equal(condition.strength,3,'le profil emploie votre Force, ici celle du porteur');
  assert.equal(condition.source.entanglementKind,'mancatcher');
  assert.equal(condition.source.springLoaded,true);
  const preview=store.previewResolution({actorId:'victim',resolutionId:'escape-mancatcher-spring',roll:10,round:1,
    action:{type:'test',attr:'F',base:30,label:'Force'},
    v5:{kind:'test',context:{netEscapeConditionId:condition.id,netEscapeOpponentRoll:30,requiresSight:false,reliesOnSight:false,usesFellowship:false}}});
  assert.deepEqual(preview.unresolved,[]);
  assert.equal(preview.test.sl,1,'le Test du personnage subit −1 DR pour se dégager');
  assert.equal(preview.netEscape.opposition.sourceScore,3,'la Force de la source vient du porteur sans conversion implicite');
  assert.equal(preview.netEscape.opposition.sourceSl,-1,'DR de la Force publiée 3 +2 DR du ressort');
  assert.equal(preview.netEscape.opposition.netSl,2);
  assert.equal(preview.netEscape.freed,true,'l’opposition utilise directement la Force publiée 3');
  assert.equal((await store.applyResolution(preview)).status,'applied');
  victim=store.listParticipants().find(row=>row.id==='victim');
  assert.equal(victim.states.some(row=>row.id===condition.id),false,'l’évasion complète retire l’état Empêtré');
});
