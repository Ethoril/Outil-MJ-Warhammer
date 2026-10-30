import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { fixture, priest, snap, input, BATTLE } from '../../helpers/divin-b5-fixture.mjs';
import { calculateArmor, locationProtection } from '../../../js/core/equipment.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { resolveDivineTalentRestriction } from '../../../js/core/v5-divine-access.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';

describe('Chance divine (B09) — caractérisation', () => {
test('B09 caractérisation — setFortune est une correction explicite et réversible',async()=>{const{store,persistence}=await fixture();await store.setFortune('priest',3);assert.equal(store.getFortune('priest').permanent,3);await store.setFortune('priest',1);assert.equal(store.getFortune('priest').permanent,1);await store.undo();assert.equal(store.getFortune('priest').permanent,3);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(reload.getFortune('priest').permanent,1);});
test('B09 caractérisation — révision attendue et refus de persistance ne changent aucun solde',async()=>{const{store,setRefuse}=await fixture();await store.setFortune('priest',3);const revision=store.getLocalRevision();await store.setFortune('priest',2);const before=snap(store);await assert.rejects(()=>store.setFortune('priest',1,{baseRevision:revision}),/changé/);assert.deepEqual(snap(store),before);setRefuse(true);assert.equal((await store.setFortune('priest',1)).ok,false);assert.deepEqual(snap(store),before);});
test('B09 caractérisation — corriger le permanent préserve la Chance temporaire',async()=>{const{store}=await fixture();await store.setFortune('priest',3);const a=priest(store);await store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineEffects:[{id:'temp-b9',remainingTempFortune:2}]}}});await store.setFortune('priest',1);assert.equal(store.getFortune('priest').balance,3);assert.equal(store.getFortune('priest').temporary,2);});
});

describe('Chance divine (B09)', () => {
const markers=s=>priest(s).extensions.v5.divineEffects?.filter(row=>row.type==='wrath-fortune-refresh')||[];
async function impose(s,id='b9-trigger'){const p=s.previewDivineExecution(BATTLE,input(91,{executionId:id}));assert.equal(p.ready,true,p.error);assert.deepEqual(p.wrathFortunePreview?.limit,1);const r=await s.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true);return p;}
const refresh=(s,amount=4,options={})=>s.setFortune('priest',amount,{operation:'refresh',reason:'Renouvellement normal confirmé par le MJ',...options});
test('B09 — poser la sanction ne dépense ni ne renouvelle la Chance',async()=>{const{store}=await fixture(3);await store.setFortune('priest',4);await impose(store);assert.equal(store.getFortune('priest').permanent,4);assert.equal(markers(store).length,1);assert.equal(markers(store)[0].resultId,'wrath:121-125');assert.equal(store.getFortune('priest').refreshLimit,1);});
test('B09 — correction et dépense ne consomment pas le prochain renouvellement',async()=>{const{store}=await fixture(3);await store.setFortune('priest',4);await impose(store);await store.setFortune('priest',3);assert.equal(markers(store).length,1);await store.acquireConditions('priest',[{name:'Sonné',level:1}],{resolutionId:'b9-stun'});await store.recoverCondition('priest','sonne',{method:'fortune'});assert.equal(store.getFortune('priest').permanent,2);assert.equal(markers(store).length,1);});
test('B09 — un seul renouvellement limité puis prochain pool normal',async()=>{const{store}=await fixture(3);await store.setFortune('priest',4);await impose(store);await refresh(store);assert.equal(store.getFortune('priest').permanent,1);assert.equal(markers(store).length,0);await refresh(store);assert.equal(store.getFortune('priest').permanent,4);const receipt=snap(store).extensions.v5.fortuneRefreshReceipts[0];assert.equal(receipt.granted,1);assert.equal(receipt.normalAmount,4);assert.equal(receipt.markerIds.length,1);});
test('B09 — renouvellement sans sanction et Chance temporaire conservée',async()=>{const{store}=await fixture(3);await store.setFortune('priest',4);const a=priest(store);await store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineEffects:[{id:'b9-temp',remainingTempFortune:2}]}}});await impose(store);await refresh(store);assert.equal(store.getFortune('priest').temporary,2);assert.equal(store.getFortune('priest').balance,3);await refresh(store,5);assert.equal(store.getFortune('priest').balance,7);});
test('B09 — Undo/Redo et reload restaurent ensemble solde et marqueur',async()=>{const{store,persistence}=await fixture(3);await store.setFortune('priest',4);await impose(store);await refresh(store);await store.undo();assert.equal(markers(store).length,1);assert.equal(store.getFortune('priest').permanent,4);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(markers(reload).length,0);assert.equal(reload.getFortune('priest').permanent,1);});
test('B09 — refus de persistance et stale ne consomment pas la sanction',async()=>{const{store,setRefuse}=await fixture(3);await store.setFortune('priest',4);await impose(store);const before=snap(store);setRefuse(true);assert.equal((await refresh(store)).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);const revision=store.getLocalRevision();await refresh(store,4,{baseRevision:revision});await assert.rejects(()=>refresh(store,4,{baseRevision:revision}),/changé/);assert.equal(store.getFortune('priest').permanent,1);});
test('B09 — inconnue, motif absent ou opération forgée refusés',async()=>{const{store}=await fixture(3);await impose(store);await assert.rejects(()=>refresh(store),/initialis|connu/i);await store.setFortune('priest',3);for(const options of [{operation:'refresh',reason:''},{operation:'forged'}])await assert.rejects(()=>store.setFortune('priest',3,options));assert.equal(markers(store).length,1);});
test('B09 — retrait générique du marqueur refusé',async()=>{const{store}=await fixture(3);await impose(store);const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineEffects:[]}}}),/Courroux|renouvel/i);assert.equal(markers(store).length,1);});
test('B09 — occurrences distinctes visent le même prochain renouvellement',async()=>{const{store}=await fixture(3);await store.setFortune('priest',4);await impose(store);await store.setDivineSin('priest',3,{reason:'Nouvelle occurrence'});await impose(store,'b9-second');assert.equal(markers(store).length,2);await refresh(store);assert.equal(markers(store).length,0);assert.equal(store.getFortune('priest').permanent,1);});
test('B09 — une Prière de récupération peut poser le prochain renouvellement',async()=>{const{store}=await fixture(1);const p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b9-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',3,{reason:'Nouveaux Péchés'});const r=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:91});assert.equal(r.ready,true,r.error);await store.applyDivineWrathRecovery({preview:r});assert.equal(markers(store).length,1);});
});

describe('Pénitence (B10) — caractérisation', () => {
test('B10 caractérisation — une extension de fiche est conservée, annulable et sans modification des Péchés',async()=>{const{store}=await fixture();const a=priest(store);await store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,characterNote:{text:'Mission de culte',status:'open'}}}});assert.equal(priest(store).extensions.v5.characterNote.status,'open');assert.equal(priest(store).extensions.v5.divine.sin,1);await store.undo();assert.equal(priest(store).extensions.v5.characterNote,undefined);await store.redo();assert.equal(priest(store).extensions.v5.characterNote.text,'Mission de culte');});
test('B10 caractérisation — commande atomique refusée ne publie ni fiche ni journal',async()=>{const{store,setRefuse}=await fixture(),before=snap(store);setRefuse(true);const r=await store.executeCommand('b10-characterization',draft=>{draft.combat.participants[0].name='Mutation';draft.log.unshift({id:'b10-note',kind:'management',text:'Note'});return draft;});assert.equal(r.ok,false);assert.deepEqual(snap(store),before);});
test('B10 caractérisation — updateParticipant refuse une révision de fiche périmée',async()=>{const{store}=await fixture();const revision=store.getLocalRevision();await store.updateParticipant('priest',{name:'Nom courant'});const before=snap(store);await assert.rejects(()=>store.updateParticipant('priest',{name:'Ancien nom'},{expectedLocalRevision:revision}),/changé|modifi|actualis/i);assert.deepEqual(snap(store),before);});
});

describe('Pénitence (B10)', () => {
const records=s=>priest(s).extensions.v5.divinePenances||[];
const create=(s,extra={})=>s.createDivinePenance('priest',{text:'Escorter les pèlerins',reason:'Mission choisie par le MJ',cult:'Myrmidia',...extra});
const close=(s,id,extra={})=>s.completeDivinePenance('priest',id,{reason:'Retour des pèlerins confirmé',...extra});
test('B10 — création sourcée distincte, texte et statut en cours sur la fiche',async()=>{const{store}=await fixture();await create(store);await create(store);assert.equal(records(store).length,2);assert.notEqual(records(store)[0].id,records(store)[1].id);assert.equal(records(store)[0].status,'open');assert.equal(records(store)[0].source.printedPage,219);assert.equal(priest(store).extensions.v5.divine.sin,1);});
test('B10 — clôture MJ motivée, idempotente et sans retrait de Péché',async()=>{const{store}=await fixture();await create(store);const id=records(store)[0].id;await close(store,id);assert.equal(records(store)[0].status,'completed');assert.equal(records(store)[0].completedBy,'MJ');assert.equal(priest(store).extensions.v5.divine.sin,1);const before=snap(store);assert.equal((await close(store,id)).status,'duplicate');assert.deepEqual(snap(store),before);});
test('B10 — autorité joueur ne peut clôturer, même avec un rôle MJ forgé dans la requête',async()=>{const{store}=await fixture();await create(store);const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));assert.equal(player.canManageDivinePenances(),false);await assert.rejects(()=>close(player,records(player)[0].id,{role:'MJ',completedBy:'MJ'}),/MJ/);assert.equal(records(player)[0].status,'open');});
test('B10 — champs absents, source forgée et pénitence inconnue refusés',async()=>{const{store}=await fixture();for(const extra of [{text:''},{reason:''},{cult:''},{exampleId:'inventé'},{source:{printedPage:1}}])await assert.rejects(()=>create(store,extra));await assert.rejects(()=>close(store,'inconnue'),/introuvable|inconnue/i);assert.equal(records(store).length,0);});
test('B10 — exemple de culte sourcé et personnalisation MJ explicite',async()=>{const{store}=await fixture();assert.ok(store.getDivinePenanceExamples().some(row=>row.cult==='Stromfels'&&row.source.printedPage===89));const example=store.getDivinePenanceExamples().find(row=>row.cult==='Ulric'&&row.source.printedPage===112);await create(store,{cult:'Ulric',exampleId:example.id,text:'Convaincre les habitants du palais de fréquenter la chapelle'});assert.deepEqual(records(store)[0].source,example.source);assert.equal(records(store)[0].exampleId,example.id);});
test('B10 (B-C20) — 96–100 : le suivi structuré est facultatif, la note libre du MJ suffit',async()=>{const{store}=await fixture();const before=snap(store),missing=store.previewDivineExecution(BATTLE,input(86,{}));assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(row=>row.field==='wrathConsequences'));assert.deepEqual(snap(store),before);const note=store.previewDivineExecution(BATTLE,input(86,{wrathConsequences:'Mission orale donnée à la table'}));assert.equal(note.ready,true,note.error);await store.applyDivineExecution(BATTLE,{preview:note});assert.equal(records(store).length,0);});
test('B10 — 96–100 avec texte structuré : pénitence suivie (Q8)',async()=>{const{store}=await fixture();const p=store.previewDivineExecution(BATTLE,input(86,{wrathPenanceText:'Protéger un pèlerinage'}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(records(store)[0].origin.resultId,'wrath:96-100');assert.equal(records(store)[0].text,'Protéger un pèlerinage');});
test('B10 — récupération B04 peut imposer une pénitence sourcée',async()=>{const{store}=await fixture();let p=store.previewDivineExecution(BATTLE,input(6));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Péché'});p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:86,wrathPenanceText:'Protéger les pèlerins'});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(records(store)[0].origin.kind,'wrath');});
test('B10 — persistance refusée, Undo/Redo, reload et source préservée',async()=>{const{store,persistence,setRefuse}=await fixture();await create(store);const id=records(store)[0].id,before=snap(store);setRefuse(true);assert.equal((await close(store,id)).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await close(store,id);await store.undo();assert.equal(records(store)[0].status,'open');await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(records(reload)[0].status,'completed');assert.equal(records(reload)[0].source.printedPage,219);});
test('B10 — clôture stale refusée, écriture générique et effacement refusés',async()=>{const{store}=await fixture();await create(store);const id=records(store)[0].id,revision=store.getLocalRevision();await store.updateParticipant('priest',{name:'Nom modifié'});await assert.rejects(()=>close(store,id,{baseRevision:revision}),/changé|recalcul/i);for(const data of [[],records(store).map(row=>({...row,status:'completed'}))]){const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divinePenances:data}}}),/pénitence|penitence/i);}assert.equal(records(store)[0].status,'open');});
test('B10 — ligne canonique visible même lorsque la mission manque',async()=>{const{store}=await fixture();const p=store.previewDivineExecution(BATTLE,input(86,{wrathResult:{resultId:'forged'}}));assert.equal(p.ready,false);assert.equal(p.input?.wrathResult?.resultId,'wrath:96-100');});
test('B10 — une identité de Chance créée ensuite ne permet pas d’effacer la pénitence',async()=>{const{store}=await fixture();await create(store);await store.setFortune('priest',3);const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divinePenances:[]}}}),/pénitence/i);});
test('B10 — une clôture sur un autre client ne compare pas deux révisions locales',async()=>{const{createStoreDivinePenance,completeStoreDivinePenance,finalizeDivineState}=await import('../../../js/core/v5-divine-store.js');const{store}=await fixture();const high=snap(store);high.localRevision=100;const created=createStoreDivinePenance(high,'priest',{text:'Mission interclients',reason:'MJ',cult:'Myrmidia'});const remote=structuredClone(created.state);remote.localRevision=5;const completed=completeStoreDivinePenance(remote,'priest',created.record.id,{reason:'Autre client MJ'});assert.doesNotThrow(()=>finalizeDivineState(remote,completed.state));assert.equal(completed.record.completedRevision,6);});
});

describe('Possessions (B11) — caractérisation', () => {
const item={id:'mail',baseId:'mail',kind:'armour',ap:2,layer:'rigid',locations:['body'],keywords:[]};
test('B11 caractérisation — les PA d’équipement utilisent les pièces présentes, pas l’agrégat manuel',()=>{const actor={equipment:[item],armor:{body:9}};assert.equal(locationProtection(actor,{location:'body'}).ap,2);assert.equal(calculateArmor(actor.equipment).body,2);});
test('B11 caractérisation — sans pièce les PA manuels sont utilisés',()=>{assert.equal(locationProtection({equipment:[],armorLocations:{body:1}},{location:'body'}).ap,1);});
test('B11 caractérisation — les PA magiques et dégâts d’armure restent distincts des pièces',()=>{const actor={equipment:[item],extensions:{v5:{magicAp:{body:2},armorDamage:{body:1}}}};assert.equal(locationProtection(actor,{location:'body'}).ap,3);});
});

describe('Possessions (B11)', () => {
const armor={head:0,body:0,rightArm:0,leftArm:0,rightLeg:0,leftLeg:0};
const item=(id,kind='weapon')=>({id,baseId:'custom-'+id,name:id,kind,category:'Base',keywords:[],locations:kind==='armour'?['body']:[],ap:kind==='armour'?2:null,layer:'rigid',damage:4,custom:true});
async function setup(){const ctx=await fixture(2);await ctx.store.updateParticipant('priest',{equipment:[item('sword'),item('mail','armour'),item('coat','trapping')],actions:[{id:'sword-action',type:'attack',attr:'CC',base:40,damage:4,note:'sword',extensions:{fiche:{equipmentId:'sword'}}}],armor:{...armor,body:2},armorLocations:{...armor,body:2}});return ctx;}
const ledger=s=>priest(s).extensions.v5.divineConfiscations||[];
const args=(extra={})=>input(91,{executionId:'b11-trigger',wrathInventoryConfirmed:true,wrathMagicalItemIds:['sword','mail'],wrathRetainedArmor:armor,...extra});
async function impose(s,extra={}){const p=s.previewDivineExecution(BATTLE,args(extra));assert.equal(p.ready,true,p.error);assert.deepEqual(snap(s).combat.participants.find(x=>x.id==='priest').equipment.map(x=>x.id),['sword','mail','coat']);await s.applyDivineExecution(BATTLE,{preview:p});return p;}
async function penance(s){await s.createDivinePenance('priest',{cult:'Myrmidia',text:'Mission B11',reason:'Choix MJ'});return priest(s).extensions.v5.divinePenances.at(-1).id;}
const complete=(s,id,itemId,extra={})=>s.completeDivinePenance('priest',id,{reason:'Mission accomplie',confiscationId:ledger(s)[0].id,restoreItemId:itemId,...extra});
test('B11 — saisie MJ complète obligatoire, objets magiques identifiés et armure intrinsèque connue',async()=>{const{store}=await setup();for(const extra of [{wrathInventoryConfirmed:false},{wrathMagicalItemIds:undefined},{wrathMagicalItemIds:['unknown']},{wrathMagicalItemIds:['sword','sword']},{wrathRetainedArmor:undefined},{wrathRetainedArmor:{body:0}}]){const p=store.previewDivineExecution(BATTLE,args(extra));assert.equal(p.ready,false);assert.ok(p.needsInput.length);}assert.equal(ledger(store).length,0);});
test('B11 — aperçu inerte, confiscation canonique de tous les objets et des Actions liées, PA recalculés',async()=>{const{store}=await setup(),before=snap(store),p=store.previewDivineExecution(BATTLE,args());assert.equal(p.ready,true,p.error);assert.deepEqual(snap(store),before);await store.applyDivineExecution(BATTLE,{preview:p});assert.deepEqual(priest(store).equipment,[]);assert.deepEqual(priest(store).actions,[]);assert.equal(priest(store).armor.body,0);assert.equal(ledger(store)[0].items.length,3);assert.equal(ledger(store)[0].items.filter(x=>x.magical).length,2);});
test('B11 — une pénitence rend exactement un objet magique choisi avec son Action',async()=>{const{store}=await setup();await impose(store);const id=await penance(store);await complete(store,id,'sword');assert.deepEqual(priest(store).equipment.map(x=>x.id),['sword']);assert.equal(priest(store).actions[0].id,'sword-action');assert.equal(ledger(store)[0].items.find(x=>x.itemId==='mail').status,'held');assert.equal(ledger(store)[0].items.find(x=>x.itemId==='sword').returnedByPenanceId,id);assert.equal(priest(store).extensions.v5.divine.sin,1);});
test('B11 — seconde pénitence rend l’armure sans duplication ni restitution globale',async()=>{const{store}=await setup();await impose(store);await complete(store,await penance(store),'sword');await complete(store,await penance(store),'mail');assert.deepEqual(priest(store).equipment.map(x=>x.id),['sword','mail']);assert.equal(priest(store).armorLocations.body,2);assert.equal(ledger(store)[0].items.find(x=>x.itemId==='coat').status,'held');});
test('B11 — aucun objet magique ni restitution choisie : aucun retour inventé',async()=>{const{store}=await setup();await impose(store,{wrathMagicalItemIds:[]});const id=await penance(store);assert.equal((await store.completeDivinePenance('priest',id,{reason:'Accomplie'})).ok,true);assert.deepEqual(priest(store).equipment,[]);});
test('B11 — sélection manquante, objet non magique et déjà rendu refusés',async()=>{const{store}=await setup();await impose(store);const id=await penance(store);for(const itemId of [undefined,'coat','absent'])await assert.rejects(()=>complete(store,id,itemId),/objet|sélect|choisi/i);await complete(store,id,'sword');const second=await penance(store);await assert.rejects(()=>complete(store,second,'sword'),/rendu|retenu/i);});
test('B11 — inventaire modifié pendant la retenue bloque une restitution périmée',async()=>{const{store}=await setup();await impose(store);const id=await penance(store);await store.updateParticipant('priest',{equipment:[item('new')]});await assert.rejects(()=>complete(store,id,'sword'),/inventaire|changé/i);assert.equal(priest(store).extensions.v5.divinePenances[0].status,'open');assert.deepEqual(priest(store).equipment.map(x=>x.id),['new']);});
test('B11 — double clôture idempotente ne rend jamais deux objets',async()=>{const{store}=await setup();await impose(store);const id=await penance(store);await complete(store,id,'sword');const before=snap(store);assert.equal((await complete(store,id,'sword')).status,'duplicate');assert.deepEqual(snap(store),before);await assert.rejects(()=>complete(store,id,'mail'),/accomplie|restitution/i);});
test('B11 — persistance refusée, Undo/Redo et reload réunissent équipement et retenue',async()=>{const{store,persistence,setRefuse}=await setup();await impose(store);const id=await penance(store),before=snap(store);setRefuse(true);assert.equal((await complete(store,id,'sword')).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await complete(store,id,'sword');await store.undo();assert.deepEqual(priest(store).equipment,[]);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(priest(reload).equipment.length,1);assert.equal(ledger(reload)[0].items.find(x=>x.itemId==='sword').status,'returned');});
test('B11 — effacement de retenue, réinjection d’objet retenu ou snapshot modifié refusés',async()=>{const{store}=await setup();await impose(store);for(const patch of [{equipment:[item('sword')]},{extensions:{...priest(store).extensions,v5:{...priest(store).extensions.v5,divineConfiscations:[]}}}])await assert.rejects(()=>store.updateParticipant('priest',patch),/reten|confisc|objet/i);});
test('B11 — PA intrinsèques conservés avant et après restitution d’armure',async()=>{const{locationProtection}=await import('../../../js/core/equipment.js');const{store}=await setup();await impose(store,{wrathRetainedArmor:{...armor,body:1}});assert.equal(locationProtection(priest(store),{location:'body'}).ap,1);await complete(store,await penance(store),'mail');assert.equal(locationProtection(priest(store),{location:'body'}).ap,3);});
test('B11 — après sérialisation RTDB les tableaux vides omis restent des snapshots vides',async()=>{const{store}=await setup();await impose(store);const prune=value=>Array.isArray(value)?value.map(prune):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==null&&!(Array.isArray(v)&&v.length===0)).map(([k,v])=>[k,prune(v)])):value;const remote=createStore({storage:null});await remote.ready;const raw=snap(store);raw.combat.participants[0].extensions.v5.divineConfiscations=prune(raw.combat.participants[0].extensions.v5.divineConfiscations);await remote.loadFromJSON(raw);const id=await penance(remote);await complete(remote,id,'sword');assert.equal(priest(remote).equipment[0].id,'sword');await complete(remote,await penance(remote),'mail');assert.equal(priest(remote).equipment.length,2);});
test('B11 — la Prière de récupération B04 peut confisquer les possessions',async()=>{const{store}=await setup();await store.setDivineSin('priest',1,{reason:'Occurrence À Terre'});let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b11-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',2,{reason:'Nouvelle occurrence'});p=store.previewDivineWrathRecovery({...args(),stateId:priest(store).states[0].id,executionId:'b11-recovery'});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(ledger(store).length,1);assert.deepEqual(priest(store).equipment,[]);});
test('B11 — inventaire vide confirmé et RTDB : une pénitence se clôt sans objet inventé',async()=>{const{store}=await fixture(2);await store.updateParticipant('priest',{equipment:[]});const p=store.previewDivineExecution(BATTLE,args({wrathMagicalItemIds:[]}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});const raw=snap(store);for(const row of raw.combat.participants)for(const record of row.extensions?.v5?.divineConfiscations||[]){delete record.items;delete record.unaffectedActions;}const remote=createStore({storage:null});await remote.ready;await remote.loadFromJSON(raw);const id=await penance(remote);await remote.completeDivinePenance('priest',id,{reason:'Mission accomplie'});assert.deepEqual(priest(remote).equipment,[]);});
test('B11 — une restitution ne peut survivre sans sa pénitence accomplie, même après une préparation autorisée',async()=>{const{completeStoreDivinePenance,finalizeDivineState}=await import('../../../js/core/v5-divine-store.js');const{store}=await setup();await impose(store);const id=await penance(store),before=snap(store),result=completeStoreDivinePenance(before,'priest',id,{reason:'Mission accomplie',confiscationId:ledger(store)[0].id,restoreItemId:'sword'});result.state.combat.participants[0].extensions.v5.divinePenances=structuredClone(before.combat.participants[0].extensions.v5.divinePenances);assert.throws(()=>finalizeDivineState(before,result.state),/pénitence|restitution/i);});
});

describe('Rejet divin (B13) — caractérisation', () => {
const action={id:'charme',type:'skill',attr:'Soc',base:60,note:'Charme'},context={isAction:false,involvesMovement:false,requiresSight:false,reliesOnSight:false};
test('B13 caractérisation — difficulté sociale explicite et bonus commun donnent les DR réels',async()=>{const{store}=await fixture(),actor=priest(store),before=structuredClone(actor),p=previewResolution({actor,action,roll:45,v5:{kind:'test',slModifier:2,slModifiers:[{id:'context-gift',amount:1}],context}});assert.equal(p.test.sl,5);assert.deepEqual(actor,before);});
test('B13 caractérisation — une opposition sociale conserve séparément les deux Tests',async()=>{const{store}=await fixture(),actor=priest(store),target=snap(store).combat.participants[1],p=previewResolution({actor,target,action,roll:45,defense:{base:60,attr:'Soc',label:'Charme',roll:45,v5:{kind:'test',context}},v5:{kind:'test',slModifier:2,context}});assert.equal(p.test.sl,4);assert.equal(p.defenderTest.sl,2);assert.equal(p.opposition.netSl,2);});
test('B13 caractérisation — Store utilise la fiche canonique et refuse un aperçu social périmé',async()=>{const{store}=await fixture();const p=store.previewResolution({actorId:'priest',action,roll:45,v5:{kind:'test',slModifier:2,context}});assert.equal(p.test.sl,4);await store.updateParticipant('priest',{name:'Nom actuel'});assert.equal((await store.applyResolution(p)).status,'stale');});
});

describe('Rejet divin (B13)', () => {
const rows=s=>priest(s).extensions.v5.divineRejections||[];
async function setup(){const c=await fixture(5),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,{id:'talent-invoke',rank:1,status:'resolved',specialization:'Myrmidia'},{id:'talent-bless',rank:1,status:'resolved',specialization:'Manann'}],skills:a.skills.map(row=>row.id==='pray'?{...row,advances:10,total:70}:row)});return c;}
async function impose(s,permanent=false,extra={}){const p=s.previewDivineExecution(BATTLE,input(permanent?96:86,{executionId:'b13-trigger',wrathRejectionConfirmed:true,wrathPrayAdvances:10,...extra}));assert.equal(p.ready,true,p.error);await s.applyDivineExecution(BATTLE,{preview:p});return p;}
async function penance(s,cult='Myrmidia'){await s.createDivinePenance('priest',{cult,text:'Mission B13',reason:'Choix MJ'});const id=priest(s).extensions.v5.divinePenances.at(-1).id;await s.completeDivinePenance('priest',id,{reason:'Mission accomplie'});return id;}
const raw=(extra={})=>({actorId:'priest',action:{id:'social',type:'skill',attr:'Soc',base:60,note:'Charme'},roll:45,v5:{kind:'test',slModifier:0,context:{isAction:false,requiresSight:false,reliesOnSight:false,divineCultMembership:{Myrmidia:true}}},...extra});
test('B13 — excommunication sans effacer les acquisitions, deux talents inaccessibles malgré grant',async()=>{const{store}=await setup(),talents=priest(store).talents;await impose(store);assert.deepEqual(priest(store).talents,talents);assert.equal(rows(store)[0].stage,0);assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);await store.grantDivineAccess('priest',BATTLE,{scope:'durable',reason:'Ancien grant'});assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);});
test('B13 — première nouvelle pénitence rend Béni, seconde Invocation',async()=>{const{store}=await setup();await penance(store);await impose(store);assert.equal(rows(store)[0].stage,0);await penance(store,'Manann');assert.equal(rows(store)[0].stage,0);await penance(store);assert.equal(rows(store)[0].stage,1);assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,true);assert.equal(resolveDivineTalentRestriction(priest(store),{cult:'Myrmidia',talentId:'talent-invoke'}).allowed,false);await penance(store);assert.equal(rows(store)[0].stage,2);assert.equal(resolveDivineTalentRestriction(priest(store),{cult:'Myrmidia',talentId:'talent-invoke'}).allowed,true);});
test('B13 — rejet définitif confirmé retire les talents du culte et les avances Prière, autres acquisitions gardées',async()=>{const{store}=await setup();await impose(store,true);const a=priest(store);assert.equal(a.talents.some(row=>row.specialization==='Myrmidia'),false);assert.equal(a.talents.some(row=>row.specialization==='Manann'),true);assert.equal(a.skills.find(row=>row.id==='pray').advances,0);assert.equal(a.skills.find(row=>row.id==='pray').total,60);assert.equal(a.skills.find(row=>row.id==='cool').total,50);assert.equal(rows(store)[0].kind,'permanent');await penance(store);assert.equal(store.resolveDivineAccess('priest',BATTLE).allowed,false);});
test('B13 — données et confirmation de perte obligatoires, aucun zéro d’avances supposé',async()=>{const{store}=await setup();for(const extra of [{wrathRejectionConfirmed:false},{wrathPrayAdvances:undefined},{wrathPrayAdvances:0},{wrathPrayAdvances:11}])assert.equal(store.previewDivineExecution(BATTLE,input(96,{wrathRejectionConfirmed:true,wrathPrayAdvances:10,...extra})).ready,false);assert.equal(rows(store).length,0);});
test('B13 — avances inconnues demandent une valeur MJ compatible avec le score connu',async()=>{const{store}=await setup(),a=priest(store);await store.updateParticipant('priest',{skills:a.skills.map(({advances,...row})=>row)});let p=store.previewDivineExecution(BATTLE,input(96,{wrathRejectionConfirmed:true}));assert.equal(p.ready,false);p=store.previewDivineExecution(BATTLE,input(96,{wrathRejectionConfirmed:true,wrathPrayAdvances:10}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(priest(store).skills.find(row=>row.id==='pray').total,60);});
test('B13 — faits sociaux inconnus bloquent le Test, membre confirmé reçoit la difficulté source',async()=>{const{store}=await setup();await impose(store);const missing=raw();delete missing.v5.context.divineCultMembership;assert.ok(store.previewResolution(missing).unresolved.some(row=>/culte|membre/i.test(row)));const p=store.previewResolution(raw());assert.equal(p.test.sl,-1);assert.equal(p.test.success,false);assert.equal(p.test.details.totalModifier,-3);});
test('B13 — bonus positifs ne remontent pas au-dessus de −3, difficulté plus dure conservée',async()=>{const{store}=await setup();await impose(store);const a=raw();a.v5.slModifier=8;a.v5.slModifiers=[{id:'gift',amount:5}];a.v5.advantageSources=[{id:'adv1'},{id:'adv2'},{id:'adv3'}];const p=store.previewResolution(a);assert.equal(p.test.details.totalModifier,-3);assert.equal(p.test.sl,-1);const hard=raw();hard.v5.slModifier=-5;assert.equal(store.previewResolution(hard).test.sl,-3);});
test('B13 — autre culte/non-membre, Test physique et Prière ne reçoivent pas la sanction sociale',async()=>{const{store}=await setup();await impose(store);const a=raw();a.v5.context.divineCultMembership.Myrmidia=false;a.v5.slModifier=2;assert.equal(store.previewResolution(a).test.sl,4);const physical=raw();physical.action={...physical.action,attr:'F',note:'Force'};delete physical.v5.context.divineCultMembership;assert.equal(store.previewResolution(physical).test.details.totalModifier,0);const prayer=raw();prayer.action={...prayer.action,note:'Prière',extensions:{fiche:{skillId:'pray'}}};delete prayer.v5.context.divineCultMembership;assert.equal(store.previewResolution(prayer).test.details.totalModifier,0);});
test('B13 — opposition applique la règle au défenseur réprouvé aussi',async()=>{const{store}=await setup();await impose(store);const state=snap(store),actor=state.combat.participants[1],target=priest(store),p=previewResolution({actor,target,action:raw().action,roll:45,v5:raw().v5,defense:{base:60,attr:'Soc',label:'Charme',roll:45,v5:raw().v5}});assert.equal(p.defenderTest.details.totalModifier,-3);assert.equal(p.defenderTest.sl,-1);assert.equal(p.test.sl,2);});
test('B13 — deux pénitences lèvent la sanction sociale temporaire, rejet définitif la conserve',async()=>{for(const permanent of [false,true]){const{store}=await setup();await impose(store,permanent);await penance(store);await penance(store);assert.equal(store.previewResolution(raw()).test.details.totalModifier,permanent?-3:0);}});
test('B13 — refus persistance, Undo/Redo et reload restaurent talents, avances et rejet ensemble',async()=>{const{store,persistence,setRefuse}=await setup(),before=snap(store),p=store.previewDivineExecution(BATTLE,input(96,{wrathRejectionConfirmed:true,wrathPrayAdvances:10}));setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);await store.applyDivineExecution(BATTLE,{preview:p});await store.undo();assert.equal(priest(store).skills.find(row=>row.id==='pray').advances,10);assert.equal(rows(store).length,0);await store.redo();const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(rows(reload)[0].kind,'permanent');assert.equal(priest(reload).skills.find(row=>row.id==='pray').advances,0);});
test('B13 — retrait générique et copie vers un autre sujet refusés',async()=>{const{store}=await setup();await impose(store);const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineRejections:[]}}}),/rejet|excomm|pénitence/i);const ally=store.listParticipants().find(row=>row.id==='ally');await assert.rejects(()=>store.updateParticipant('ally',{extensions:{...ally.extensions,v5:{...ally.extensions.v5,divineRejections:rows(store)}}}),/rejet|source|invalide/i);});
test('B13 — Intimidation sur Force exige aussi les faits de culte',async()=>{const{store}=await setup();await impose(store);const action=raw();action.action={...action.action,attr:'F',note:'Intimidation'};delete action.v5.context.divineCultMembership;assert.ok(store.previewResolution(action).unresolved.some(row=>/culte|membre/i.test(row)));});
test('B13 — Prière d’un autre culte utilise le score réduit réel après perte des avances communes',async()=>{const{store}=await setup();await impose(store,true);const p=store.previewDivineExecution('divine:blessing:manann:battle',input(11,{roll:98,executionId:'b13-manann'}));assert.equal(p.ready,true,p.error);assert.equal(p.preview.prayer.score,60);});
test('B13 — nouveau rejet depuis récupération B04 et critique social normal conservé',async()=>{const{store}=await setup();await store.setDivineSin('priest',1,{reason:'À Terre'});let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b13-prone'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',5,{reason:'Nouvelle occurrence'});p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:96,wrathRejectionConfirmed:true,wrathPrayAdvances:10});assert.equal(p.ready,true,p.error);await store.applyDivineWrathRecovery({preview:p});assert.equal(rows(store)[0].kind,'permanent');const r=raw({roll:11});const social=store.previewResolution(r);assert.equal(social.test.details.totalModifier,-3);assert.equal(social.test.critical,true);assert.equal(social.test.sl,5);});
test('B13 — une compétence Prière sans identifiant stable bloque avant toute perte',async()=>{const{store}=await setup();await store.updateParticipant('priest',{skills:priest(store).skills.map(row=>{if(row.id!=='pray')return row;const{id,...without}=row;return without;})});const before=snap(store),p=store.previewDivineExecution(BATTLE,input(96,{wrathRejectionConfirmed:true,wrathPrayAdvances:10}));assert.equal(p.ready,false);assert.deepEqual(snap(store),before);});
});

describe('Invocations de démons (B14) — caractérisation', () => {
// Caractérisation B14 (commit « caracteriser 88 et 141-145 avant B14 ») : avant le lot, 88 et 141–145 se réglaient par une note libre du MJ,
// sans participant créé. Depuis B14, la note ne suffit plus : le profil, la distance et la position confirmés par le MJ sont requis.
const ids=store=>snap(store).combat.participants.map(row=>row.id);
test('B14 caractérisation — 88 (78 + 10 Péché) : la note MJ seule ne suffit plus, rien n’est créé ni décrémenté',async()=>{
  const{store}=await fixture(1),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(78,{executionId:'b14-char-88',wrathConsequences:'Le MJ gère le démon.'}));
  assert.equal(p.ready,false);assert.equal(p.wrathTableResult.id,'wrath:88-88');assert.ok(p.needsInput.some(row=>row.field==='wrathSummonProfile'));
  assert.deepEqual(ids(store),before);
});
test('B14 caractérisation — 141–145 (91 + 10×5 Péchés) : la note MJ seule ne suffit plus',async()=>{
  const{store}=await fixture(5),before=ids(store);
  const p=store.previewDivineExecution(BATTLE,input(91,{executionId:'b14-char-141',wrathConsequences:'Le MJ gère le serviteur.'}));
  assert.equal(p.ready,false);assert.equal(p.wrathTableResult.id,'wrath:141-145');assert.ok(p.needsInput.some(row=>row.field==='wrathSummonCamp'));
  assert.deepEqual(ids(store),before);
});
test('B14 caractérisation — sans note MJ, 88 et 141–145 restent bloqués',async()=>{
  for(const[sin,roll]of[[1,78],[5,91]]){const{store}=await fixture(sin);const p=store.previewDivineExecution(BATTLE,input(roll,{executionId:'b14-char-none'}));assert.equal(p.ready,false);}
});
});

describe('Invocations de démons (B14)', () => {
const PROFILE={name:'Démon mineur B14',wounds:12,initiative:35,caracs:{CC:45,F:40,E:30},traits:['Démoniaque']};
const demon=(extra={})=>input(78,{executionId:'b14-demon',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:11,wrathSummonPosition:'Derrière les caisses, côté nord',wrathSummonTargetId:'ally',...extra});
const servant=(extra={})=>input(91,{executionId:'b14-servant',wrathSummonProfile:{...PROFILE,name:'Loup blanc B14',traits:[]},wrathSummonDistanceRoll:64,wrathSummonPosition:'Sur le toit voisin',wrathSummonCamp:'allie',wrathSummonBehavior:'Observe puis réprimande le prêtre',...extra});
const rows=s=>snap(s).combat.participants,created=s=>rows(s).filter(r=>r.extensions?.v5?.divineWrathSummon);
async function go(store,payload){const p=store.previewDivineExecution(BATTLE,payload);assert.equal(p.ready,true,p.error);const r=await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true,r.error);return p;}
test('B14 — démon : champs obligatoires, aucun défaut inventé, aperçu inerte',async()=>{
  const{store}=await fixture(1),before=snap(store);
  for(const key of['wrathSummonProfile','wrathSummonDistanceRoll','wrathSummonPosition','wrathSummonTargetId']){const p=store.previewDivineExecution(BATTLE,demon({[key]:undefined}));assert.equal(p.ready,false,key);assert.equal(p.wrathTableResult.id,'wrath:88-88');assert.ok(p.needsInput.some(row=>row.field===key),key+' '+JSON.stringify(p.needsInput));}
  assert.deepEqual(snap(store),before);
  const ok=store.previewDivineExecution(BATTLE,demon());assert.equal(ok.ready,true,ok.error);assert.equal(ok.wrathSummonPreview.kind,'demon');assert.equal(ok.wrathSummonPreview.distanceYards,11);assert.deepEqual(snap(store),before);
});
test('B14 — démon : 2d10 entre 2 et 20, cible existante, profil valide',async()=>{
  const{store}=await fixture(1);
  for(const bad of[{wrathSummonDistanceRoll:1},{wrathSummonDistanceRoll:21},{wrathSummonDistanceRoll:5.5},{wrathSummonTargetId:'inconnu'},{wrathSummonPosition:'  '},{wrathSummonPosition:'x'.repeat(201)},
    {wrathSummonProfile:{...PROFILE,wounds:0}},{wrathSummonProfile:{...PROFILE,initiative:-1}},{wrathSummonProfile:{...PROFILE,name:''}},{wrathSummonProfile:{...PROFILE,caracs:{XX:10}}},{wrathSummonProfile:{...PROFILE,caracs:{CC:-1}}},{wrathSummonProfile:{...PROFILE,traits:[3]}},{wrathSummonProfile:{...PROFILE,armor:{head:9}}}])
    assert.equal(store.previewDivineExecution(BATTLE,demon(bad)).ready,false,JSON.stringify(bad));
  for(const good of[2,20])assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonDistanceRoll:good})).ready,true);
});
test('B14 — démon appliqué : un seul participant hostile, profil confirmé, rien d’inventé, Péché décrémenté',async()=>{
  const{store}=await fixture(1),before=rows(store).map(r=>r.id);await go(store,demon());
  const made=created(store);assert.equal(made.length,1);const d=made[0];
  assert.equal(d.camp,'ennemi');assert.equal(d.name,PROFILE.name);assert.equal(d.hp,12);assert.equal(d.maxHp,12);assert.equal(d.initiative,35);assert.equal(d.zone,'active');assert.deepEqual(d.caracs,{CC:45,F:40,E:30});assert.deepEqual(d.traits,['Démoniaque']);
  assert.deepEqual(d.actions||[],[]);assert.deepEqual(d.armor,{head:0,body:0,arms:0,legs:0});
  const link=d.extensions.v5.divineWrathSummon;assert.equal(link.kind,'demon');assert.equal(link.targetId,'ally');assert.equal(link.distanceYards,11);assert.equal(link.ownerId,'priest');assert.equal(link.resultId,'wrath:88-88');assert.equal(link.executionId,'b14-demon');
  assert.match(d.notes,/11 m/);assert.match(d.notes,/Derrière les caisses/);
  assert.equal(rows(store).length,before.length+1);assert.equal(priest(store).extensions.v5.divine.sin,0);
  assert.equal(snap(store).extensions.v5.divineExecutions.at(-1).wrathSummonReceipt.participantId,d.id);
});
test('B14 — la cible désignée peut être le prêtre ; le démon ne peut pas se cibler lui-même',async()=>{
  const{store}=await fixture(1);assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonTargetId:'priest'})).ready,true);
  assert.equal(store.previewDivineExecution(BATTLE,demon({wrathSummonTargetId:'divine-wrath-summon:b14-demon'})).ready,false);
});
test('B14 — serviteur : d100, camp et comportement choisis par le MJ, un seul participant',async()=>{
  const{store}=await fixture(5);
  for(const key of['wrathSummonProfile','wrathSummonDistanceRoll','wrathSummonPosition','wrathSummonCamp','wrathSummonBehavior']){const p=store.previewDivineExecution(BATTLE,servant({[key]:undefined}));assert.equal(p.ready,false,key);assert.equal(p.wrathTableResult.id,'wrath:141-145');assert.ok(p.needsInput.some(row=>row.field===key),key);}
  for(const bad of[{wrathSummonDistanceRoll:0},{wrathSummonDistanceRoll:101},{wrathSummonCamp:'pj'},{wrathSummonCamp:'amis'},{wrathSummonBehavior:' '}])assert.equal(store.previewDivineExecution(BATTLE,servant(bad)).ready,false,JSON.stringify(bad));
  await go(store,servant());const made=created(store);assert.equal(made.length,1);const s=made[0];
  assert.equal(s.camp,'allie');assert.equal(s.name,'Loup blanc B14');assert.equal(s.extensions.v5.divineWrathSummon.kind,'servant');assert.equal(s.extensions.v5.divineWrathSummon.distanceYards,64);assert.equal(s.extensions.v5.divineWrathSummon.targetId,undefined);
  assert.match(s.notes,/64 m/);assert.match(s.notes,/réprimande/);assert.deepEqual(s.actions||[],[]);assert.equal(priest(store).extensions.v5.divine.sin,4);
});
test('B14 — une réinjection client du plan ou de l’identifiant du participant est ignorée',async()=>{
  const{store}=await fixture(1);const p=store.previewDivineExecution(BATTLE,demon({wrathSummonPlan:{id:'x',profile:{name:'Dragon',wounds:999,initiative:99}}}));assert.equal(p.ready,true,p.error);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(created(store).length,1);assert.equal(created(store)[0].name,PROFILE.name);assert.equal(created(store)[0].hp,12);
});
test('B14 — aperçu falsifié ou périmé, double application : aucune mutation ni second participant',async()=>{
  const{store}=await fixture(1),p=store.previewDivineExecution(BATTLE,demon());const forged=structuredClone(p);forged.input.wrathSummonProfile.wounds=99;
  await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:forged}),/aperçu|recalculez/i);assert.equal(created(store).length,0);
  await store.applyDivineExecution(BATTLE,{preview:p});await assert.rejects(()=>store.applyDivineExecution(BATTLE,{preview:p}),/aperçu|recalculez|changé/i);assert.equal(created(store).length,1);
  const stale=(await fixture(1)).store;const q=stale.previewDivineExecution(BATTLE,demon());await stale.updateParticipant('ally',{name:'Autre'});await assert.rejects(()=>stale.applyDivineExecution(BATTLE,{preview:q}),/changé|recalculez/i);assert.equal(created(stale).length,0);
});
test('B14 — identifiant de participant déjà pris : blocage sans écrasement',async()=>{
  const{store}=await fixture(1),state=JSON.parse(store.getFullJSON());state.combat.participants.push({...state.combat.participants[1],id:'divine-wrath-summon:b14-clash',name:'Occupant'});state.combat.order.push('divine-wrath-summon:b14-clash');await store.loadFromJSON(state);
  const p=store.previewDivineExecution(BATTLE,demon({executionId:'b14-clash'}));assert.equal(p.ready,false);assert.equal(rows(store).filter(r=>r.id==='divine-wrath-summon:b14-clash').length,1);
});
test('B14 — refus de persistance, Undo/Redo et rechargement',async()=>{
  const{store,persistence,setRefuse}=await fixture(1),before=snap(store),p=store.previewDivineExecution(BATTLE,demon());
  setRefuse(true);assert.equal((await store.applyDivineExecution(BATTLE,{preview:p})).ok,false);assert.deepEqual(snap(store),before);setRefuse(false);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(created(store).length,1);
  await store.undo();assert.equal(created(store).length,0);assert.equal(priest(store).extensions.v5.divine.sin,1);
  await store.redo();assert.equal(created(store).length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(created(reload).length,1);assert.equal(created(reload)[0].extensions.v5.divineWrathSummon.targetId,'ally');
});
test('B14 — la créature reste jusqu’au retrait par le MJ (pas de balayage d’invocation)',async()=>{
  const{store}=await fixture(1);await go(store,demon());await store.updateParticipant('priest',{hp:19});await store.undo();await store.redo();
  assert.equal(created(store).length,1);await store.removeParticipant?.(created(store)[0].id);
});
test('B14 — récupération B04 déclenchant 88 crée aussi le démon',async()=>{
  const{store}=await fixture(1);let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-prone'}));assert.equal(p.ready,true,p.error);await store.applyDivineExecution(BATTLE,{preview:p});
  await store.setDivineSin('priest',1,{reason:'Nouvelle occurrence'});
  const rec={actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:78};
  const missing=store.previewDivineWrathRecovery(rec);assert.equal(missing.ready,false);
  p=store.previewDivineWrathRecovery({...rec,executionId:'b14-rec',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:4,wrathSummonPosition:'À la porte',wrathSummonTargetId:'ally'});assert.equal(p.ready,true,p.error);
  assert.equal((await store.applyDivineWrathRecovery({preview:p})).ok,true);assert.equal(created(store).length,1);assert.equal(priest(store).extensions.v5.divine.sin,0);
});
const auto=async sin=>{const f=await fixture(sin),state=JSON.parse(f.store.getFullJSON());state.combat.orderMode='automatic';state.extensions.v5.orderRound=1;await f.store.loadFromJSON(state);return f;};
test('B14 — ordre automatique : le participant entre dans l’ordre d’Initiative sans rejouer de Tour',async()=>{
  const{store}=await auto(1),order=snap(store).combat.order,current=snap(store).combat.currentActorId;await go(store,demon());
  const id=created(store)[0].id,after=snap(store).combat;assert.ok(after.order.includes(id));assert.equal(after.currentActorId,current);assert.deepEqual(after.order.filter(x=>x!==id),order);
});
test('B14 — récupération B04 en ordre automatique : le participant entre dans l’ordre',async()=>{
  const{store}=await auto(1);let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b14-prone-auto'}));await store.applyDivineExecution(BATTLE,{preview:p});await store.setDivineSin('priest',1,{reason:'Nouvelle occurrence'});
  p=store.previewDivineWrathRecovery({actorId:'priest',stateId:priest(store).states[0].id,roll:99,canSpeak:true,wrathRoll:78,executionId:'b14-rec-auto',wrathSummonProfile:PROFILE,wrathSummonDistanceRoll:4,wrathSummonPosition:'À la porte',wrathSummonTargetId:'ally'});assert.equal(p.ready,true,p.error);
  await store.applyDivineWrathRecovery({preview:p});assert.ok(snap(store).combat.order.includes(created(store)[0].id));
});
});

describe('Destin (B15)', () => {
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
});

describe('Absolution (B16)', () => {
const absol=(extra={})=>({actorId:'priest',kind:'absolution',cult:'Myrmidia',roll:35,canSpeak:true,count:2,reason:'Pèlerinage accompli',executionId:'b16-abs',...extra});
const altdorf=(extra={})=>({actorId:'priest',kind:'altdorf',cult:'Sigmar',roll:45,canSpeak:true,pilgrimageConfirmed:true,executionId:'b16-alt',...extra});
const sin=s=>priest(s).extensions.v5.divine.sin;
async function go(store,payload){const p=store.previewDivineAbsolution(payload);assert.equal(p.ready,true,p.error);const r=await store.applyDivineAbsolution({preview:p});assert.equal(r.ok,true,r.error);return p;}
test('B16 — absolution : données MJ obligatoires, aucun Péché à zéro, aperçu inerte',async()=>{
  const{store}=await fixture(3),before=snap(store);
  for(const bad of[{count:undefined},{count:0},{count:4},{count:1.5},{reason:' '},{cult:'Inconnu'},{canSpeak:false},{roll:undefined},{kind:'autre'}])assert.equal(store.previewDivineAbsolution(absol(bad)).ready,false,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const zero=(await fixture(0)).store;assert.equal(zero.previewDivineAbsolution(absol({count:1})).ready,false);
  const ok=store.previewDivineAbsolution(absol());assert.equal(ok.ready,true,ok.error);assert.equal(ok.test.success,true);assert.deepEqual(snap(store),before);
});
test('B16 — absolution réussie retire exactement N Péchés, jamais de valeur négative, sans Action consommée',async()=>{
  const{store}=await fixture(3),actions=snap(store).extensions.v5.standardTurnActions;await go(store,absol());assert.equal(sin(store),1);assert.deepEqual(snap(store).extensions.v5.standardTurnActions,actions);
  const rec=snap(store).extensions.v5.divineWrathRecoveries.at(-1);assert.equal(rec.absolution.kind,'absolution');assert.equal(rec.absolution.removed,2);assert.equal(rec.absolution.cult,'Myrmidia');assert.match(snap(store).log[0].text,/Absolution/);
});
test('B16 — absolution ratée : aucun retrait, aucune bénédiction fictive, aucun État',async()=>{
  const{store}=await fixture(3);await go(store,absol({roll:78,executionId:'b16-fail'}));assert.equal(sin(store),3);assert.deepEqual(priest(store).states,[]);assert.equal(snap(store).extensions.v5.divineWrathRecoveries.at(-1).absolution.removed,0);
});
test('B16 — échec avec Courroux : table à Péché positif, À Terre appliqué dans la même commande',async()=>{
  const{store}=await fixture(1);const missing=store.previewDivineAbsolution(absol({roll:91,count:1,executionId:'b16-w'}));assert.equal(missing.ready,false);assert.ok(missing.needsInput.some(n=>n.field==='wrathRoll'));
  await go(store,absol({roll:91,count:1,executionId:'b16-w',wrathRoll:6}));assert.equal(sin(store),0);assert.equal(priest(store).states.length,1);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B16 — succès avec Courroux : retrait d’abord, puis table ; jamais sous zéro',async()=>{
  const{store}=await fixture(1);await go(store,absol({roll:31,count:1,executionId:'b16-sw',wrathRoll:6}));assert.equal(sin(store),0);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B16 — Altdorf : +2 DR, retrait 1 ou 2 à +4 DR, Sigmar et pèlerinage confirmé exigés',async()=>{
  for(const bad of[{cult:'Myrmidia'},{pilgrimageConfirmed:false},{pilgrimageConfirmed:undefined}]){const{store}=await fixture(3);assert.equal(store.previewDivineAbsolution(altdorf(bad)).ready,false,JSON.stringify(bad));}
  let c=await fixture(3);let p=await go(c.store,altdorf({roll:51}));assert.equal(p.difficulty,2);assert.equal(sin(c.store),2);
  c=await fixture(3);await go(c.store,altdorf({roll:35}));assert.equal(sin(c.store),1);
  c=await fixture(3);await go(c.store,altdorf({roll:30,executionId:'b16-alt30'}));assert.equal(sin(c.store),1);assert.equal(snap(c.store).extensions.v5.divineWrathRecoveries.at(-1).wrath.triggered,false);
  c=await fixture(0);assert.equal(c.store.previewDivineAbsolution(altdorf()).ready,false);
});
test('B16 — Altdorf (B-C45) : échec ordinaire = rappel d’Exténué sans État posé, aucun retrait',async()=>{
  const{store}=await fixture(3);await go(store,altdorf({roll:97}));assert.equal(sin(store),3);assert.deepEqual(priest(store).states,[]);assert.equal(snap(store).extensions.v5.divineWrathRecoveries.at(-1).absolution.fatigued,true);
});
test('B16 — Altdorf : maladresse ouvre la table à Péché positif (pas d’Exténué)',async()=>{
  const{store}=await fixture(1);const miss=store.previewDivineAbsolution(altdorf({roll:99,executionId:'b16-f'}));assert.equal(miss.ready,false);assert.ok(miss.needsInput.some(n=>n.field==='wrathRoll'));
  await go(store,altdorf({roll:99,executionId:'b16-f',wrathRoll:6}));assert.deepEqual(priest(store).states.map(s=>s.name),['À Terre']);assert.equal(sin(store),0);
});
test('B16 — Péchés d’un culte elfe : absolution refusée (exemption)',async()=>{
  const{store}=await fixture(3);assert.equal(store.previewDivineAbsolution(absol({cult:'Mathlann'})).ready,false);
});
test('B16 — aperçu falsifié, périmé et double clic : aucune mutation',async()=>{
  const{store}=await fixture(3),p=store.previewDivineAbsolution(absol()),forged=structuredClone(p);forged.input.count=3;const b=snap(store);
  await assert.rejects(()=>store.applyDivineAbsolution({preview:forged}),/aperçu|recalculez/i);assert.deepEqual(snap(store),b);
  await store.setDivineSin('priest',2,{reason:'Changement'});await assert.rejects(()=>store.applyDivineAbsolution({preview:p}),/changé|recalculez/i);
  const q=store.previewDivineAbsolution(absol({executionId:'b16-two'}));await store.applyDivineAbsolution({preview:q});await assert.rejects(()=>store.applyDivineAbsolution({preview:q}),/aperçu|recalculez|changé|déjà/i);assert.equal(sin(store),0);
});
test('B16 — refus de persistance, Undo/Redo et rechargement',async()=>{
  const{store,persistence,setRefuse}=await fixture(3),p=store.previewDivineAbsolution(absol()),b=snap(store);
  setRefuse(true);const r=await store.applyDivineAbsolution({preview:p}).catch(e=>({ok:false,e}));assert.equal(r.ok,false);assert.deepEqual(snap(store),b);setRefuse(false);
  await store.applyDivineAbsolution({preview:p});assert.equal(sin(store),1);await store.undo();assert.equal(sin(store),3);await store.redo();assert.equal(sin(store),1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divine.sin,1);
});
});

describe('Événements de Péché (B17)', () => {
const MECH=['l06-217-sin-award','l06-220-petty-concerns','l06-229-sword-of-justice','l02-046-handrich-profit-sin','l02-047-shake-on-it-break-sin','l02-018-temple-event','l01-069-hospice-sin','l18-028-taal-sin-award','l21-013-shrine-desecration','l10-020-shrine-sin-removal','l21-007-shining-rock-sin','l26-119-funeral-sin'];
const REMIND=['l06-217-cult-commandements','l02-051-khaine-strictures-penances','l02-053-solkan-strictures-penances','l13-070-myrmidia-strictures','l18-049-ulric-omens','l19-021-ulric-strictures','l20-027-cult-strictures','l24-090-gnome-strictures','l25-083-manann-strictures','l06-229-shackles-of-truth','l06-218-gm-discretionary'];
async function setup(sin){const c=await fixture(sin),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,...['Verena','Handrich','Sigmar','Ulric','Shallya','Taal','Mathlann'].map(specialization=>({id:'talent-bless',rank:1,status:'resolved',specialization}))]});return c;}
const ev=(id,extra={})=>({actorId:'priest',eventId:id,cult:id==='l06-229-sword-of-justice'?'Verena':'Myrmidia',fact:'Fait constaté par le MJ',confirmed:true,...extra});
const sin=s=>priest(s).extensions.v5.divine.sin;
test('B17 — catalogue : douze événements mécaniques et onze rappels, sources et paraphrases courtes',async()=>{
  const{store}=await setup(1),events=store.getDivineSinEvents(),reminders=store.getDivineSinReminders();
  assert.deepEqual(events.map(e=>e.id).sort(),[...MECH].sort());assert.deepEqual(reminders.map(e=>e.id).sort(),[...REMIND].sort());
  for(const row of[...events,...reminders]){assert.ok(row.source.printedPage>0&&row.source.document,row.id);assert.ok(row.text.length>20&&row.text.length<=260,row.id+' '+row.text.length);}
  for(const row of events)assert.ok(['add','add-mj','remove','clear'].includes(row.effect.kind),row.id);
});
test('B17 — ajout fixe : confirmation, fait et culte obligatoires, aperçu inerte, journal et reçu',async()=>{
  const{store}=await setup(1),before=snap(store);
  for(const bad of[{confirmed:false},{confirmed:undefined},{fact:' '},{cult:undefined,eventId:'l06-229-sword-of-justice'},{eventId:'inconnu'}]){const p=store.previewDivineSinEvent(ev('l06-229-sword-of-justice',bad));assert.equal(p.ready,false,JSON.stringify(bad));}
  assert.deepEqual(snap(store),before);const p=store.previewDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(p.ready,true,p.error);assert.equal(p.sinBefore,1);assert.equal(p.sinAfter,2);assert.deepEqual(snap(store),before);
  const r=await store.applyDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(r.ok,true);assert.equal(sin(store),2);
  const rec=priest(store).extensions.v5.divineSinEvents.at(-1);assert.equal(rec.eventId,'l06-229-sword-of-justice');assert.equal(rec.sinBefore,1);assert.equal(rec.sinAfter,2);assert.equal(rec.fact,'Fait constaté par le MJ');assert.match(snap(store).log[0].text,/Péchés/);
});
test('B17 — attribution à montant MJ : bornes, aucun plafond haut',async()=>{
  const{store}=await setup(10);
  for(const bad of[undefined,0,-1,1.5])assert.equal(store.previewDivineSinEvent(ev('l06-217-sin-award',{amount:bad})).ready,false);
  for(const bad of[0,4])assert.equal(store.previewDivineSinEvent(ev('l06-220-petty-concerns',{amount:bad})).ready,false);
  await store.applyDivineSinEvent(ev('l06-220-petty-concerns',{amount:3}));assert.equal(sin(store),13);await store.applyDivineSinEvent(ev('l06-217-sin-award',{amount:7}));assert.equal(sin(store),20);
});
test('B17 — retraits : un Péché, jamais sous zéro, rien à zéro, remise à zéro pour le fragment sacré, cultes éligibles seulement',async()=>{
  let c=await setup(2);assert.equal(c.store.previewDivineSinEvent(ev('l10-020-shrine-sin-removal')).ready,false,'Myrmidia non éligible');
  await c.store.applyDivineSinEvent(ev('l10-020-shrine-sin-removal',{cult:'Sigmar'}));assert.equal(sin(c.store),1);
  await c.store.applyDivineSinEvent(ev('l26-119-funeral-sin'));assert.equal(sin(c.store),0);assert.equal(c.store.previewDivineSinEvent(ev('l26-119-funeral-sin')).ready,false,'rien à retirer à zéro');
  c=await setup(5);await c.store.applyDivineSinEvent(ev('l21-007-shining-rock-sin',{cult:'Ulric'}));assert.equal(sin(c.store),0);
  c=await setup(5);assert.equal(c.store.previewDivineSinEvent(ev('l21-007-shining-rock-sin')).ready,false);
});
test('B17 — événements propres à Handrich, Shallya, Taal : refusés pour un autre culte',async()=>{
  const{store}=await setup(1);for(const id of['l02-046-handrich-profit-sin','l02-047-shake-on-it-break-sin'])assert.equal(store.previewDivineSinEvent(ev(id)).ready,false,id);
  assert.equal(store.previewDivineSinEvent(ev('l01-069-hospice-sin',{amount:1})).ready,false);assert.equal(store.previewDivineSinEvent(ev('l18-028-taal-sin-award',{amount:1})).ready,false);
});
test('B17 — cultes elfes exemptés : aucune attribution (Q10)',async()=>{
  const{store}=await setup(1);assert.equal(store.previewDivineSinEvent(ev('l06-217-sin-award',{cult:'Mathlann',amount:1})).ready,false);
});
test('B17 — autorité MJ, révision périmée, Undo/Redo, rechargement et refus de persistance',async()=>{
  const{store,persistence,setRefuse}=await setup(1);const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));
  await assert.rejects(()=>player.applyDivineSinEvent(ev('l06-229-sword-of-justice')),/MJ/);await assert.rejects(()=>store.applyDivineSinEvent(ev('l06-229-sword-of-justice',{baseRevision:0})),/changé|relisez/i);
  const b=snap(store);setRefuse(true);const r=await store.applyDivineSinEvent(ev('l06-229-sword-of-justice')).catch(e=>({ok:false,e}));assert.equal(r.ok,false);assert.deepEqual(snap(store),b);setRefuse(false);
  await store.applyDivineSinEvent(ev('l06-229-sword-of-justice'));assert.equal(sin(store),2);await store.undo();assert.equal(sin(store),1);assert.equal(priest(store).extensions.v5.divineSinEvents,undefined);await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineSinEvents.length,1);
});
test('B17 — les rappels (commandements, présages) ne modifient rien',async()=>{
  const{store}=await setup(3),b=snap(store);for(const row of store.getDivineSinReminders())assert.ok(row.text);assert.deepEqual(snap(store),b);
});
const gm=(extra={})=>({actorId:'priest',kind:'gm-wrath',cult:'Myrmidia',reason:'Insulte imprudente envers la déesse',wrathRoll:6,executionId:'b17-gm',...extra});
test('B17 — Courroux décidé par le MJ : Péché positif obligatoire, motif, table sans Test de Prière',async()=>{
  const zero=(await setup(0)).store;assert.equal(zero.previewDivineAbsolution(gm()).ready,false);
  const{store}=await setup(1),before=snap(store);assert.equal(store.previewDivineAbsolution(gm({reason:' '})).ready,false);const miss=store.previewDivineAbsolution(gm({wrathRoll:undefined}));assert.equal(miss.ready,false);assert.ok(miss.needsInput.some(n=>n.field==='wrathRoll'));assert.deepEqual(snap(store),before);
  const p=store.previewDivineAbsolution(gm());assert.equal(p.ready,true,p.error);const r=await store.applyDivineAbsolution({preview:p});assert.equal(r.ok,true,r.error);
  assert.equal(sin(store),0);assert.deepEqual(priest(store).states.map(s=>s.name),['À Terre']);assert.equal(snap(store).extensions.v5.divineWrathRecoveries.at(-1).absolution.kind,'gm-wrath');
});
test('B17 — Courroux MJ : réservé au MJ, ligne dépendant d’un vrai Test de Prière refusée',async()=>{
  const{store}=await setup(1);const p=store.previewDivineAbsolution(gm());const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));
  assert.throws(()=>player.applyDivineAbsolution({preview:p}),/MJ/);assert.equal(sin(store),1);
  const lessons=store.previewDivineAbsolution(gm({wrathRoll:1,executionId:'b17-gm-lessons',wrathDurationRoll:3}));assert.equal(lessons.ready,false);
});
});

describe('Terre sanctifiée et navires (B18)', () => {
const sin=s=>priest(s).extensions.v5.divine.sin;
// ── B18.3 Terre sanctifiée (L22 p.71) ───────────────────────────────────────────────────────────────────────
const grounds=s=>snap(s).extensions.v5.sanctifiedGrounds||[];
const ground=(extra={})=>({label:'Ermitage du Vieux Hâlin',radiusYards:30,sinThreshold:3,effect:'ablaze',reason:'Terre sanctifiée par la piété de l’ermite',...extra});
test('B18 terre sanctifiée — création MJ : rayon ≤ 30 yards, seuil de Péchés fourni par le MJ (jamais par défaut)',async()=>{
  const{store}=await fixture(1);
  for(const bad of[{radiusYards:0},{radiusYards:31},{radiusYards:2.5},{sinThreshold:0},{sinThreshold:undefined},{sinThreshold:1.5},{effect:'autre'},{label:' '},{reason:''}])await assert.rejects(()=>store.setSanctifiedGround(ground(bad)),undefined,JSON.stringify(bad));
  assert.equal(grounds(store).length,0);const r=await store.setSanctifiedGround(ground());assert.equal(r.ok,true);assert.equal(grounds(store)[0].source.printedPage,71);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.setSanctifiedGround(ground({label:'Autre'})),/MJ/);
});
test('B18 terre sanctifiée — entrée : Péchés au seuil ou monstre déclaré = un Enflammé canonique, sans doublon ; sortie le retire',async()=>{
  const{store}=await fixture(3);await store.setSanctifiedGround(ground());const id=grounds(store)[0].id;
  assert.equal((await store.enterSanctifiedGround('ally',id,{kind:'character',reason:'Entre'})).affected,false);assert.deepEqual(snap(store).combat.participants.find(p=>p.id==='ally').states,[]);
  const r=await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Entre au seuil'});assert.equal(r.affected,true);assert.equal(r.outcome,'ablaze');assert.deepEqual(priest(store).states.map(s=>[s.name,s.level||1]),[['Enflammé',1]]);
  await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Encore'});assert.equal(priest(store).states.length,1,'pas de doublon');
  await store.leaveSanctifiedGround('priest',id,{reason:'Sort'});assert.deepEqual(priest(store).states,[]);
  await store.enterSanctifiedGround('ally',id,{kind:'monster',reason:'Monstre'});assert.equal(snap(store).combat.participants.find(p=>p.id==='ally').states.length,1);
});
test('B18 terre sanctifiée — mode « barré » : franchissement refusé sans mutation ; seuil strictement fourni',async()=>{
  const{store}=await fixture(2);await store.setSanctifiedGround(ground({effect:'barred',sinThreshold:3}));const id=grounds(store)[0].id;
  assert.equal((await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'x'})).affected,false);
  await store.setDivineSin('priest',3,{reason:'Au seuil'});const before=snap(store),r=await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'Tente'});assert.equal(r.affected,true);assert.equal(r.outcome,'barred');assert.deepEqual(snap(store).combat.participants.find(p=>p.id==='priest').states,before.combat.participants.find(p=>p.id==='priest').states);
  await assert.rejects(()=>store.enterSanctifiedGround('priest',id,{kind:'inconnu',reason:'x'}));await assert.rejects(()=>store.enterSanctifiedGround('priest','nope',{kind:'character',reason:'x'}));
});
test('B18 terre sanctifiée — Undo/Redo, rechargement, retrait par le MJ',async()=>{
  const{store,persistence}=await fixture(3);await store.setSanctifiedGround(ground());const id=grounds(store)[0].id;await store.enterSanctifiedGround('priest',id,{kind:'character',reason:'x'});
  await store.undo();assert.equal(priest(store).states.length,0);await store.redo();assert.equal(priest(store).states.length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).extensions.v5.sanctifiedGrounds.length,1);
  await assert.rejects(()=>store.removeSanctifiedGround(id,{reason:''}));await store.removeSanctifiedGround(id,{reason:'Lieu profané'});assert.equal(grounds(store).length,0);
});
// ── B18.4 Manann et Stromfels (L25 p.87/91) : faits navals fournis, aucun sous-système naval ────────────────
const naval=s=>priest(s).extensions.v5.divineNavalEvents||[];
const nv=(extra={})=>({actorId:'priest',kind:'manann-overuse',cult:'Manann',ship:'La Mouette',moonPeriod:'Entre les pleines lunes de Mannslieb du 12',shipsBlessed:4,failedPrayerConfirmed:true,moodRoll:6,fact:'Quatrième navire béni, Prière ratée',confirmed:true,...extra});
async function setupNaval(n){const c=await fixture(n),a=priest(c.store);await c.store.updateParticipant('priest',{talents:[...a.talents,...['Manann','Stromfels'].map(specialization=>({id:'talent-bless',rank:1,status:'resolved',specialization}))]});return c;}
test('B18 Manann — surutilisation : plus de trois navires et Prière ratée = 1 Péché et −d10 d’humeur, faits fournis',async()=>{
  const{store}=await setupNaval(1),before=snap(store);
  for(const bad of[{shipsBlessed:3},{shipsBlessed:undefined},{failedPrayerConfirmed:false},{moodRoll:0},{moodRoll:11},{ship:' '},{moonPeriod:''},{confirmed:false},{fact:' '},{cult:'Myrmidia'}])assert.equal(store.previewDivineNavalEvent(nv(bad)).ready,false,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const p=store.previewDivineNavalEvent(nv());assert.equal(p.ready,true,p.error);assert.equal(p.sinDelta,1);assert.equal(p.moodDelta,-6);assert.deepEqual(snap(store),before);
  const r=await store.applyDivineNavalEvent(nv());assert.equal(r.ok,true);assert.equal(sin(store),2);assert.equal(naval(store)[0].moodDelta,-6);assert.equal(naval(store)[0].ship,'La Mouette');
});
test('B18 Manann — voyage béni : humeur +2d10 − Péchés calculée depuis la fiche, aucune mutation de Péché',async()=>{
  const{store}=await setupNaval(3);const base={actorId:'priest',kind:'blessed-voyage',cult:'Manann',ship:'La Mouette',diceTotal:14,fact:'Rites accomplis',confirmed:true};
  for(const bad of[{diceTotal:1},{diceTotal:21},{diceTotal:undefined},{ship:''}])assert.equal(store.previewDivineNavalEvent({...base,...bad}).ready,false,JSON.stringify(bad));
  const p=store.previewDivineNavalEvent(base);assert.equal(p.ready,true,p.error);assert.equal(p.moodDelta,11);await store.applyDivineNavalEvent(base);assert.equal(sin(store),3);assert.equal(naval(store)[0].moodDelta,11);
});
test('B18 Stromfels — le jet de table reçoit le total de Péchés (L25 p.91)',async()=>{
  const{store}=await setupNaval(4);const base={actorId:'priest',kind:'stromfels-mood',cult:'Stromfels',tableRoll:37,fact:'Miracle ignorant l’humeur de Manann',confirmed:true};
  for(const bad of[{tableRoll:0},{tableRoll:101},{tableRoll:undefined},{cult:'Manann'}])assert.equal(store.previewDivineNavalEvent({...base,...bad}).ready,false,JSON.stringify(bad));
  const p=store.previewDivineNavalEvent(base);assert.equal(p.ready,true,p.error);assert.equal(p.modifiedRoll,41);await store.applyDivineNavalEvent(base);assert.equal(naval(store)[0].modifiedRoll,41);assert.equal(sin(store),4);
});
test('B18 navals — MJ seul, Undo/Redo et rechargement',async()=>{
  const{store,persistence}=await setupNaval(1);const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.applyDivineNavalEvent(nv()),/MJ/);
  await store.applyDivineNavalEvent(nv());await store.undo();assert.equal(sin(store),1);assert.equal(naval(store).length,0);await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineNavalEvents.length,1);
});
});

describe('Reliques et suppléments (B18)', () => {
const sin=s=>priest(s).extensions.v5.divine.sin,relics=s=>priest(s).extensions.v5.divineRelics||[];
const relic=(extra={})=>({deity:'Myrmidia',label:'Lance de la déesse',prayerSL:2,wrathReduction:20,reason:'Relique authentique selon le MJ',...extra});
// ── B18.1 Reliques (L21 p.7) ─────────────────────────────────────────────────
test('B18 relique — création MJ : paramètres de la source seulement, aucune valeur inventée',async()=>{
  const{store}=await fixture(0),before=snap(store);
  for(const bad of[{prayerSL:0},{prayerSL:4},{prayerSL:1.5},{wrathReduction:5},{wrathReduction:40},{wrathReduction:15},{deity:'Inconnu'},{label:' '},{reason:''},{prayerSL:undefined},{wrathReduction:undefined}])await assert.rejects(()=>store.setDivineRelic('priest',relic(bad)),undefined,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const r=await store.setDivineRelic('priest',relic());assert.equal(r.ok,true);assert.equal(relics(store).length,1);assert.equal(relics(store)[0].source.printedPage,7);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.setDivineRelic('priest',relic({label:'Autre'})),/MJ/);
});
test('B18 relique — +1 à +3 DR aux Tests de Prière de ce dieu seulement',async()=>{
  const{store}=await fixture(0),pay={roll:40,wrathRoll:undefined,executionId:'b18-sl',expiry:{phase:'endOfRound',round:6}};
  const base=store.previewDivineExecution(BATTLE,input(1,pay));assert.equal(base.ready,true,base.error);await store.setDivineRelic('priest',relic({prayerSL:2}));
  const boosted=store.previewDivineExecution(BATTLE,input(1,pay));assert.equal(boosted.ready,true,boosted.error);assert.equal(boosted.preview.prayer.sl,base.preview.prayer.sl+2);
  await store.setDivineRelic('priest',relic({label:'Seconde relique'}));assert.equal(store.previewDivineExecution(BATTLE,input(1,pay)).ready,false,'cumul non défini');
});
test('B18 relique — Courroux : résultat ≤ 0 évité, sans table, sans décrément',async()=>{
  const{store}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:20}));
  const p=store.previewDivineExecution(BATTLE,input(10,{executionId:'b18-avoid'}));assert.equal(p.ready,true,p.error);assert.equal(p.preview.wrath.triggered,true);assert.equal(p.preview.wrath.avoided,true);assert.equal(p.preview.wrath.modifiedRoll,0);assert.equal(p.wrathTableResult,null);assert.equal(p.preview.wrath.sinAfter,1);
  const r=await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(r.ok,true,r.error);assert.equal(sin(store),1);assert.deepEqual(priest(store).states,[]);assert.equal(r.receipt.wrath.avoided,true);
});
test('B18 relique — la réduction décale la ligne de table avec une preuve de jet cohérente',async()=>{
  const{store}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:10}));
  const p=store.previewDivineExecution(BATTLE,input(16,{executionId:'b18-shift'}));assert.equal(p.ready,true,p.error);assert.equal(p.wrathTableResult.id,'wrath:16-20');assert.equal(p.preview.wrath.rawRoll,16);assert.equal(p.preview.wrath.roll,16);assert.equal(p.preview.wrath.modifiedRoll,16);assert.equal(p.preview.wrath.relic.wrathReduction,10);
  await store.applyDivineExecution(BATTLE,{preview:p});assert.equal(sin(store),0);assert.equal(priest(store).states[0].name,'À Terre');
});
test('B18 relique (B-C50) — le malus s’applique au total (d100 + 10 × Péché), le d100 saisi reste la preuve 1–100',async()=>{
  const{store}=await fixture(3);await store.setDivineRelic('priest',relic({wrathReduction:30}));
  const p=store.previewDivineExecution(BATTLE,input(16,{executionId:'b18-low'}));assert.equal(p.ready,true,p.error);
  assert.equal(p.preview.wrath.roll,16);assert.equal(p.preview.wrath.modifiedRoll,16);assert.equal(p.preview.wrath.avoided,undefined);assert.equal(p.wrathTableResult.id,'wrath:16-20');
});
test('B18 relique (B-C50) — total réduit à 0 ou moins : Courroux évité même avec des Péchés',async()=>{
  const{store}=await fixture(2);await store.setDivineRelic('priest',relic({wrathReduction:30}));
  const p=store.previewDivineExecution(BATTLE,input(10,{executionId:'b18-total-avoid'}));assert.equal(p.ready,true,p.error);
  assert.equal(p.preview.wrath.roll,10);assert.equal(p.preview.wrath.modifiedRoll,0);assert.equal(p.preview.wrath.avoided,true);assert.equal(p.wrathTableResult,null);
});
test('B18 relique — récupération B04 et retrait, Undo/Redo et rechargement',async()=>{
  const{store,persistence}=await fixture(1);await store.setDivineRelic('priest',relic({wrathReduction:20}));
  let p=store.previewDivineExecution(BATTLE,input(6,{executionId:'b18-prone'}));assert.equal(p.ready,true,p.error);
  await store.undo();assert.equal(relics(store).length,0);await store.redo();assert.equal(relics(store).length,1);
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineRelics.length,1);
  const id=relics(store)[0].id;await assert.rejects(()=>store.removeDivineRelic('priest',id,{reason:''}));assert.equal((await store.removeDivineRelic('priest',id,{reason:'Relique perdue'})).ok,true);assert.equal(relics(store).length,0);
});
// ── B18.2 Livre sacré perdu (L22 p.39) : Courroux quotidien jusqu'aux faits MJ ──────────────────────────────
const daily=s=>priest(s).extensions.v5.divineDailyWraths||[];
async function advance(s,seconds){const clock=snap(s).extensions.v5.gameClock,command={seconds,reason:'Temps B18',eventId:'clock-v1:'+clock.revision+':b18-'+seconds,clockBaseRevision:clock.revision};return s.advanceCampaignTime(command);}
const tome=(extra={})=>({cult:'Myrmidia',label:'Liber Bubonicus perdu',reason:'Perte constatée par le MJ',...extra});
const gm=(id,extra={})=>({actorId:'priest',kind:'gm-wrath',cult:'Myrmidia',reason:'Jour du livre perdu',wrathRoll:6,dailyWrathId:id,executionId:'b18-day-'+Math.random().toString(36).slice(2),...extra});
test('B18 livre — suivi quotidien : données MJ, horloge et culte requis, MJ seul',async()=>{
  const{store}=await fixture(1),before=snap(store);
  for(const bad of[{label:' '},{reason:''},{cult:'Inconnu'},{cult:'Mathlann'}])await assert.rejects(()=>store.startDivineDailyWrath('priest',tome(bad)),undefined,JSON.stringify(bad));
  assert.deepEqual(snap(store),before);const r=await store.startDivineDailyWrath('priest',tome());assert.equal(r.ok,true);const rec=daily(store)[0];assert.equal(rec.status,'active');assert.equal(rec.resolvedDays,0);assert.equal(rec.waivedDays,0);assert.equal(rec.source.printedPage,39);assert.equal(store.getDivineDailyWrathStatus('priest',rec.id).dueDays,0);
  const player=createStore({storage:null,divineAuthority:'player'});await player.ready;await player.loadFromJSON(snap(store));await assert.rejects(()=>player.startDivineDailyWrath('priest',tome()),/MJ/);
});
test('B18 livre — jours dus calculés sur l’horloge de campagne, jamais inventés',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  await advance(store,86399);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,0);await advance(store,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,1);await advance(store,86400*2);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,3);
  assert.equal(store.previewDivineAbsolution(gm('inconnu')).ready,false);
});
test('B18 livre — un jour dû se joue par la table MJ (Péché positif), un seul jour par exécution',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  assert.equal(store.previewDivineAbsolution(gm(id)).ready,false,'aucun jour dû');await advance(store,86400*2);
  const p=store.previewDivineAbsolution(gm(id));assert.equal(p.ready,true,p.error);await store.applyDivineAbsolution({preview:p});
  assert.equal(daily(store)[0].resolvedDays,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,1);assert.equal(sin(store),0);
  assert.equal(store.previewDivineAbsolution(gm(id)).ready,false,'Péché à zéro : pas de table (Q12)');
});
test('B18 livre — à zéro Péché le jour est écarté par le MJ avec motif (Q12) ; jamais à Péché positif',async()=>{
  const{store}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;await advance(store,86400);
  await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:'x'}),/Péché|table/i);
  await store.setDivineSin('priest',0,{reason:'Remise à zéro'});await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:' '}),/motif/i);
  assert.equal((await store.waiveDivineDailyWrathDay('priest',id,{reason:'Aucun Péché : pas de table'})).ok,true);assert.equal(daily(store)[0].waivedDays,1);assert.equal(store.getDivineDailyWrathStatus('priest',id).dueDays,0);
  await assert.rejects(()=>store.waiveDivineDailyWrathDay('priest',id,{reason:'encore'}),/jour|dû/i);
});
test('B18 livre — clôture MJ, Undo/Redo, rechargement ; retrait générique refusé',async()=>{
  const{store,persistence}=await fixture(1);await store.startDivineDailyWrath('priest',tome());const id=daily(store)[0].id;
  const a=priest(store);await assert.rejects(()=>store.updateParticipant('priest',{extensions:{...a.extensions,v5:{...a.extensions.v5,divineDailyWraths:[]}}}),/livre|quotidien|attest|refus/i);
  await assert.rejects(()=>store.closeDivineDailyWrath('priest',id,{reason:''}),/motif/i);await store.closeDivineDailyWrath('priest',id,{reason:'Livre retrouvé et voleurs punis'});assert.equal(daily(store)[0].status,'closed');
  await assert.rejects(()=>store.closeDivineDailyWrath('priest',id,{reason:'encore'}),/déjà|clos/i);await store.undo();assert.equal(daily(store)[0].status,'active');await store.redo();
  const reload=createStore({storage:null,persistence});await reload.ready;assert.equal(JSON.parse(reload.getFullJSON()).combat.participants.find(x=>x.id==='priest').extensions.v5.divineDailyWraths[0].status,'closed');
});
});

describe('Registre des Blessures Critiques', () => {
// Étape 5 du plan : registre des Blessures Critiques — chaque Blessure Critique (attaque ou incantation)
// laisse un enregistrement stable et identifié dans extensions.v5.criticalWounds.
// Critère d'acceptation écrit avant le correctif (doit échouer avant).
const clone = value => structuredClone(value);
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'foe' || id === 'enemy2' ? 'ennemi' : 'pj', zone: 'active', initiative: 60, hp: 40, maxHp: 40,
  caracs: { CC: 60, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }, { name: 'Langue (Magick)', total: 70 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Taal' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, magic: { reserve: { type: 'winds', sl: 0 } } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const records = (store, id) => person(store, id).extensions?.v5?.criticalWounds || [];
async function baseFixture(participants, order) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: order || ['priest', 'ally', 'foe'],
    participants }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'crit-registry' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const attack = (resolutionId, actorId, targetId, extra = {}) => ({ resolutionId, actorId, targetId, roll: 22,
  action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
  v5: { kind: 'melee' }, ...extra });

test('Un coup critique enregistre une Blessure Critique identifiée sur la cible', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('hit1', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80 } }));
  assert.ok(preview.critical?.details, 'critique principal attendu');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[0].source, 'attack');
  assert.equal(foeRecords[0].name, preview.critical.details.effect.name);
  assert.equal(foeRecords[0].location, preview.critical.details.location.name);
  assert.equal(foeRecords[0].effectRoll, preview.critical.details.effectRoll);
  assert.equal(foeRecords[0].round, 1);
  assert.equal(foeRecords[0].resolutionId, preview.resolutionId);
  assert.equal(foeRecords[0].authorId, 'priest');
});

test('Un premier et un second critique enregistrent deux Blessures Critiques distinctes', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe', { hp: 1 })]);
  const preview = store.previewResolution(attack('hit2', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80, secondEffect: 45 } }));
  assert.ok(preview.critical?.details, 'critique principal attendu');
  assert.ok(preview.critical?.second, 'critique secondaire attendu (dégâts excédentaires)');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 2, 'deux enregistrements');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[1].id, `${preview.resolutionId}:crit:foe:1`);
  assert.equal(foeRecords[0].name, preview.critical.details.effect.name);
  assert.equal(foeRecords[1].name, preview.critical.second.effect.name);
  assert.equal(foeRecords[1].location, preview.critical.second.location.name);
  assert.equal(foeRecords[1].effectRoll, preview.critical.second.effectRoll);
  assert.equal(foeRecords[1].authorId, 'priest');
});

test('Un critique défensif enregistre la Blessure Critique sur l’attaquant', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution({ resolutionId: 'def', actorId: 'foe', targetId: 'ally', roll: 45,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5 }, defense: { base: 60, roll: 22, v5: { kind: 'melee' } }, v5: { kind: 'melee' },
    defenderCriticalRolls: { location: 2, effect: 80 } });
  assert.ok(preview.defenderCritical?.details, 'critique défensif attendu');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement sur l’attaquant');
  assert.equal(foeRecords[0].id, `${preview.resolutionId}:crit:foe:0`);
  assert.equal(foeRecords[0].source, 'attack');
  assert.equal(foeRecords[0].name, preview.defenderCritical.details.effect.name);
  assert.equal(foeRecords[0].authorId, 'ally', 'l’auteur est le défenseur');
  assert.equal(records(store, 'ally').length, 0, 'rien sur le défenseur');
});

test('Un critique de Tourbillon de mort sur une cible secondaire y enregistre la Blessure Critique', async () => {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe', 'enemy2'],
    participants: [actor('priest'), actor('ally', { initiative: 50, talents: [{ id: 'talent-whirlwind-of-death', status: 'resolved', rank: 1 }],
      extensions: { v5: { divine: { sin: 0 }, hasMomentum: false, resourceCharacterId: 'ra' } } }), actor('foe', { initiative: 30, talents: [] }),
      actor('enemy2', { hp: 1, maxHp: 40, initiative: 10 })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'crit-registry-ww' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  await store.nextTurn();
  await store.setFortune('ally', 2);
  const preview = store.previewResolution({ resolutionId: 'ww', actorId: 'ally', targetId: 'foe', roll: 22,
    action: { type: 'attack', base: 60, attr: 'CC', damage: 5, qualities: ['inoffensive'] }, defense: { base: 30, roll: 82, v5: { kind: 'melee' } },
    v5: { kind: 'melee', context: { specialAttack: 'whirlwind-of-death', engagedIds: ['foe', 'enemy2'], allEngagedIncluded: true,
      whirlwindRolls: { enemy2: { secondEffect: 80, secondEffectAlternative: 70 } } } } });
  const secondary = (preview.secondaryTargets || []).find(row => row.critical?.second);
  assert.ok(secondary, 'critique secondaire attendu sur enemy2');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  const enemy2Records = records(store, 'enemy2');
  assert.equal(enemy2Records.length, 1, 'un enregistrement sur la cible secondaire');
  assert.equal(enemy2Records[0].id, `${preview.resolutionId}:crit:enemy2:0`);
  assert.equal(enemy2Records[0].source, 'attack');
  assert.equal(enemy2Records[0].name, secondary.critical.second.effect.name);
  assert.equal(enemy2Records[0].location, secondary.critical.second.location.name);
  assert.equal(enemy2Records[0].effectRoll, secondary.critical.second.effectRoll);
  assert.equal(enemy2Records[0].authorId, 'ally');
});

test('Une Blessure Critique d’incantation porte un identifiant stable et la source « spell »', async () => {
  const store = await baseFixture([actor('priest'), actor('ally', { initiative: 50 }), actor('foe')]);
  await store.nextTurn();
  const input = { actorId: 'ally', targetIds: ['foe'], roll: 22, miscastRoll: 15, criticalChoice: 'critical-wound' };
  const preview = store.previewSpellExecution('Carreau', input);
  assert.equal(preview.valid, true, preview.error);
  await store.applySpellExecution('Carreau', input);
  const foeRecords = records(store, 'foe');
  assert.equal(foeRecords.length, 1, 'un enregistrement');
  assert.equal(typeof foeRecords[0].id, 'string');
  assert.ok(foeRecords[0].id.length > 0, 'identifiant non vide');
  assert.ok(foeRecords[0].id.endsWith(':crit:foe'), 'identifiant de la forme <exécution>:crit:<cible>');
  assert.equal(foeRecords[0].source, 'spell');
  assert.equal(foeRecords[0].spellName, 'Carreau', 'champs existants conservés');
  assert.equal(foeRecords[0].casterId, 'ally', 'champs existants conservés');
});

test('Undo retire l’enregistrement de Blessure Critique', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('undo1', 'priest', 'foe', { criticalRolls: { location: 2, effect: 80 } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(records(store, 'foe').length, 1);
  await store.undo();
  assert.equal(records(store, 'foe').length, 0, 'l’Undo retire l’enregistrement');
});

test('Aucun enregistrement sans coup critique', async () => {
  const store = await baseFixture([actor('priest'), actor('ally'), actor('foe')]);
  const preview = store.previewResolution(attack('plain', 'priest', 'foe', { roll: 45 }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.equal(records(store, 'foe').length, 0, 'aucun enregistrement');
});
});
