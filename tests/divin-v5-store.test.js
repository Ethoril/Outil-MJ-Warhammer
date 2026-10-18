import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {locationProtection} from '../js/core/equipment.js';
import {getAllDivineContracts,applyStoreDivine} from '../js/core/v5-divine-store.js';

const contracts=getAllDivineContracts();
const BATTLE='divine:blessing:myrmidia:battle',SHIELD='divine:miracle:bouclier-de-myrmidia',SUN='divine:miracle:soleil-flamboyant';
const actor=(id,extra={})=>({id,name:id,kind:'PJ',camp:'pj',zone:'active',initiative:60,hp:20,maxHp:30,caracs:{CC:40,CT:40,F:30,E:30,I:40,Ag:40,Dex:40,Int:50,FM:50,Soc:60,M:4},
 skills:[{id:'skill-50_72_69_e8_72_65-base',name:'Prière',status:'resolved',carac:'Soc',total:60}],
 talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
 prayers:contracts.filter(c=>c.type==='miracle').map(c=>({name:c.catalogueName,status:'resolved'})),equipment:[],traits:[],states:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{divine:{sin:0},channelling:{type:'winds',sl:17}}},...extra});
const envelope=s=>{const value=JSON.parse(s.getFullJSON());delete value.exportedAt;return value;};
const person=(s,id)=>s.listParticipants().find(p=>p.id===id);
async function fixture(options={}){const s=createStore(options);await s.ready;await s.loadFromJSON({schemaVersion:3,reserve:[],combat:{round:1,currentActorId:'priest',order:['priest','ally'],participants:[actor('priest'),actor('ally',{initiative:30})]},log:[],diceLines:[],extensions:{v5:{turnIndex:1}}});return s;}
const input=(more={})=>({actorId:'priest',targetIds:['ally'],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},facts:{targets:{ally:{withinRange:true,ally:true}}},expiry:{phase:'endOfTurn',round:6,actorId:'priest',moment:'afterEffects'},...more});

test('bénédiction appliquée : valeur effective, réserve magique préservée, rechargement, Undo et Redo',async()=>{
 const s=await fixture();const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);
 const result=await s.applyDivineExecution(BATTLE,{preview});assert.equal(result.ready,true,result.error);
 assert.equal(person(s,'ally').caracs.CC,50);assert.equal(person(s,'priest').extensions.v5.channelling.sl,17);
 const loaded=createStore();await loaded.ready;await loaded.loadFromJSON(envelope(s));assert.equal(person(loaded,'ally').caracs.CC,50);
 await s.undo();assert.equal(person(s,'ally').caracs.CC,40);await s.redo();assert.equal(person(s,'ally').caracs.CC,50);
});

test('une révision périmée et un double clic sont refusés sans seconde couche',async()=>{
 const s=await fixture(),p=s.previewDivineExecution(BATTLE,input());assert.equal(p.ready,true,p.error);
 await s.updateParticipant('ally',{hp:19});const before=envelope(s);
 await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:p}),/changé/);assert.deepEqual(envelope(s),before);
 const fresh=s.previewDivineExecution(BATTLE,input());await s.applyDivineExecution(BATTLE,{preview:fresh});const after=envelope(s);
 await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:fresh}),/changé|déjà/);assert.deepEqual(envelope(s),after);
});

test('une sauvegarde refusée laisse l’état, l’historique et le jet récupérables',async()=>{
 let refuse=false;const persistence={load:async()=>null,saveAtomic:async()=>refuse?{ok:false,error:'Sauvegarde refusée'}:{ok:true}};
 const s=await fixture({persistence});const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);const before=envelope(s);
 refuse=true;const result=await s.applyDivineExecution(BATTLE,{preview});assert.equal(result.ok,false);assert.deepEqual(envelope(s),before);assert.equal(preview.input.roll,45);
 refuse=false;assert.equal((await s.applyDivineExecution(BATTLE,{preview})).ready,true);
});

test('le jet, les faits, les cibles et le résultat confirmés restent ceux de l’aperçu émis',async()=>{
 const s=await fixture();const preview=s.previewDivineExecution(BATTLE,input());assert.equal(preview.ready,true,preview.error);
 const before=envelope(s);
 for(const mutate of [
  p=>{p.input.roll=81;},p=>{p.input.targetIds=['priest'];},
  p=>{p.input.choices.duration=1;},p=>{p.input.facts.targets.ally.withinRange=false;},
  p=>{p.preview.prayer.sl=20;},p=>{p.executionId='divine:invented';}
 ]){
  const modified=structuredClone(preview);mutate(modified);
  await assert.rejects(async()=>s.applyDivineExecution(BATTLE,{preview:modified}),/aperçu.*modifié|recalculez/);
  assert.deepEqual(envelope(s),before);
 }
 const applied=await s.applyDivineExecution(BATTLE,{preview:structuredClone(preview)});
 assert.equal(applied.receipt.prayer.roll,45);assert.equal(applied.receipt.prayer.success,true);
});

test('une méthode toJSON cliente ne peut pas masquer une altération de l’aperçu',async()=>{
 const s=await fixture(),preview=s.previewDivineExecution(BATTLE,input()),original=structuredClone(preview);
 preview.input.roll=81;preview.toJSON=()=>original;const before=envelope(s);
 assert.throws(()=>applyStoreDivine(before,BATTLE,{preview}),/aperçu.*modifié|recalculez/);
 assert.deepEqual(envelope(s),before);
});

test('l’expiration réelle retire uniquement la bénédiction et conserve les Blessures subies',async()=>{
 const s=await fixture(),preview=s.previewDivineExecution(BATTLE,input());await s.applyDivineExecution(BATTLE,{preview});await s.updateParticipant('ally',{hp:11});
 for(let i=0;i<12;i++)await s.nextTurn();
 assert.equal(person(s,'ally').caracs.CC,40);assert.equal(person(s,'ally').hp,11);assert.equal(person(s,'ally').extensions.v5.divineEffects.length,0);
});

test('le Bouclier modifie les PA lus par le combat avec armure de fiche',async()=>{
 const s=await fixture();await s.updateParticipant('ally',{armorLocations:{head:2,body:2,leftArm:2,rightArm:2,leftLeg:2,rightLeg:2}});
 const preview=s.previewDivineExecution(SHIELD,input({expiry:{phase:'endOfTurn',round:6,actorId:'priest'}}));assert.equal(preview.ready,true,preview.error);
 await s.applyDivineExecution(SHIELD,{preview});
 assert.equal(locationProtection(person(s,'ally'),{location:'body'}).ap,3);assert.equal(person(s,'ally').extensions.v5.divineEffects[0].apModifiers.all,1);
});

test('Soleil : faits requis, États réels, paliers et absence de couche à échéance inventée',async()=>{
 const s=await fixture();let p=s.previewDivineExecution(SUN,input({expiry:undefined}));assert.equal(p.ready,false);
 p=s.previewDivineExecution(SUN,input({expiry:undefined,facts:{targets:{ally:{withinRange:true,nonMyrmidian:true,lookingAtPriest:true}}}}));assert.equal(p.ready,true,p.error);
 await s.applyDivineExecution(SUN,{preview:p});assert.equal(person(s,'ally').states.filter(row=>row.key==='aveugle').reduce((n,row)=>n+row.level,0),2);
});

test('Courroux : le d100 et le traitement MJ sont requis, ligne canonique puis Péchés décrémentés une fois',async()=>{
 const s=await fixture();await s.setDivineSin('priest',2,{reason:'Préparation du scénario'});
 const basic=input({roll:22});const missing=s.previewDivineExecution(BATTLE,basic);assert.equal(missing.ready,false);assert.equal(person(s,'priest').extensions.v5.divine.sin,2);
 const preview=s.previewDivineExecution(BATTLE,{...basic,wrathRoll:3,wrathConsequences:'Interdiction de prier suivie par le MJ, durée tirée et notée hors outil.'});assert.equal(preview.ready,true,preview.error);assert.ok(preview.wrathTableResult);
 assert.equal(preview.wrathTableResult.min,21);assert.equal(preview.wrathTableResult.max,25);
 await s.applyDivineExecution(BATTLE,{preview});assert.equal(person(s,'priest').extensions.v5.divine.sin,1);
});

test('previewStoreDivine avec Courroux et une cible distincte ne mutate pas le prêtre',async()=>{
 const s=await fixture();await s.setDivineSin('priest',1,{reason:'Préparation pureté du preview'});
 const before=envelope(s);
 const preview=s.previewDivineExecution(SUN,input({roll:21,wrathRoll:78,
  wrathConsequences:'Le MJ a traité la conséquence indiquée par le résultat 88.',
  facts:{targets:{ally:{withinRange:true,nonMyrmidian:true,lookingAtPriest:true}}}}));
 assert.equal(preview.ready,true,preview.error);
 assert.equal(preview.preview.wrath.sinAfter,0);
 assert.deepEqual(envelope(s),before,'Calculer un Courroux ciblant un allié ne modifie ni la fiche ni le snapshot du prêtre');
});

test('les paramètres d’un contrat fourni par le client ne remplacent jamais le registre',async()=>{
 const s=await fixture(),contract=s.getDivineContract(BATTLE);contract.effects=[{type:'characteristic-modifier',characteristic:'CC',value:999}];
 const p=s.previewDivineExecution(contract,input());assert.equal(p.ready,false);assert.match(p.error,/inconnue/);
});

test('un second prêtre peut utiliser la même bénédiction sans cumuler le bonus sur une cible',async()=>{
 const s=await fixture();await s.applyDivineExecution(BATTLE,{preview:s.previewDivineExecution(BATTLE,input())});
 const p=s.previewDivineExecution(BATTLE,input({actorId:'ally',targetIds:['ally'],expiry:{phase:'endOfTurn',round:6,actorId:'ally'}}));assert.equal(p.ready,true,p.error);
 await s.applyDivineExecution(BATTLE,{preview:p});assert.equal(person(s,'ally').caracs.CC,50);
});

test('terminer une prière via le Store retire sa couche et Annuler la restitue',async()=>{
 const s=await fixture({persistence:{load:async()=>null,saveAtomic:async()=>({ok:true})}});
 const p=s.previewDivineExecution(SHIELD,input());assert.equal(p.ready,true,p.error);await s.applyDivineExecution(SHIELD,{preview:p});
 assert.equal(person(s,'ally').armor.body,1);
 await s.endDivinePrayer(p.executionId,{reason:'Fin anticipée déclarée',baseRevision:s.getLocalRevision()});
 assert.equal(person(s,'ally').extensions.v5.divineEffects?.length||0,0);assert.equal(person(s,'ally').armor.body,0);
 await s.undo();assert.equal(person(s,'ally').extensions.v5.divineEffects.length,1);assert.equal(person(s,'ally').armor.body,1);
});
