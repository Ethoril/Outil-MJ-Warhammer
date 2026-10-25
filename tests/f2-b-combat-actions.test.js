import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewResolution } from '../js/core/resolution.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { buildExpiry } from '../js/ui/v5-divine-form-model.js';

const HOWL='divine:miracle:ulric:howl-of-the-wolf';
const person=(id,extra={})=>({id,name:id,kind:'PJ',camp:id==='a'?'pj':'ennemi',zone:'active',initiative:60,hp:40,maxHp:40,
  caracs:{CC:60,CT:60,F:40,E:30,I:50,Ag:40,Dex:40,Int:60,FM:60,Soc:60,M:4},skills:[{name:'Prière',status:'resolved',total:60},{name:'Langue (Magick)',status:'resolved',total:200}],
  talents:[],prayers:[],spells:[{name:'Carreau',status:'resolved'}],
  states:[],equipment:[],traits:[],armor:{head:0,body:0,arms:0,legs:0},extensions:{v5:{hasMomentum:id==='a',divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}},...extra});
function persistence(){let data=null;return {async load(){return data&&structuredClone(data)},async saveAtomic({state}){data=structuredClone(state);return {ok:true}},read(){return data&&structuredClone(data)}}}
async function setup({actor=person('a'),target=person('b')}={}){const p=persistence(),store=createStore({persistence:p,storage:null});await store.ready;await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],extensions:{v5:{combatId:'f2-b-actions',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b'],participants:[actor,target]}});return {store,persistence:p}}
const hit=(id,extra={})=>({resolutionId:id,actorId:'a',targetId:'b',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
  defense:{base:35,roll:80,v5:{kind:'melee',choice:'keep'}},v5:{kind:'melee',choice:'keep',...extra}});
const ordinary=id=>({resolutionId:id,actorId:'a',action:{type:'skill',attr:'Int',base:60},roll:25,v5:{kind:'test',context:{isAction:true,involvesMovement:false,requiresSight:false,reliesOnSight:false}}});

test('F2-B — les Actions manuelles historiques restent applicables; une Action spéciale ultérieure est refusée',async()=>{
  const {store}=await setup();const first=store.previewResolution(hit('first-action'));
  assert.equal(first.ready,true);assert.deepEqual(first.unresolved,[]);assert.equal((await store.applyResolution(first)).status,'applied',JSON.stringify(first));
  const second=store.previewResolution(ordinary('second-action'));
  assert.deepEqual(second.unresolved,[],'les Actions héritées ne sont pas re-plafonnées');
  assert.equal((await store.applyResolution(second)).status,'applied');
  assert.equal(store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',actionId:'late-aim'}).ready,false,
    'Visée ne peut pas s’ajouter après une Action ordinaire déjà consommée');
});

test('F2-B — Action Défensive/Vise sont persistées, distinctes et libèrent le créneau au début du prochain Tour',async()=>{
  const {store,persistence}=await setup();
  const declared=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-a'});
  assert.equal(declared.ready,true);assert.equal((await store.applyV5CombatAction(declared)).status,'applied');
  const defense=store.previewResolution({resolutionId:'dodge-test',actorId:'b',targetId:'a',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'melee',choice:'keep'}});
  assert.equal(defense.defenderTest.details.modifiers.find(row=>row.id==='combat:defensive-action')?.amount,2,
    'bonus +2 DR seulement à la défense de la compétence choisie');
  assert.equal(defense.test.details.modifiers.some(row=>row.id==='combat:defensive-action'),false,'aucun bonus à l’attaque');
  assert.equal(store.previewResolution(ordinary('action-after-defense')).ready,false);
  const reload=createStore({persistence,storage:null});await reload.ready;
  assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a.skillId,'dodge');
  const undo=await reload.undo();assert.equal(undo,true);
  assert.equal(reload.listParticipants().find(p=>p.id==='a').extensions.v5.combatActions,undefined);
  const engine=createCombatEngine(store);assert.equal((await engine.nextTurn()).status,'applied');assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(store.listParticipants().find(p=>p.id==='a').states.some(row=>row.key==='defensive-action'),false,
    'la Défensive expire au début du prochain Tour propre');
  const {store:aimStore}=await setup();
  const bow={id:'bow',kind:'weapon',name:'Arc',category:'Armes à distance',range:'60/120',damage:'BF+4'};await aimStore.updateParticipant('a',{equipment:[bow]});
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',actionId:'aim-missing-confirmation'}).ready,false);
  const unknownRange={id:'custom-ranged',kind:'weapon',name:'Objet inconnu',category:'Arme exotique',range:'',damage:'BF+4'};await aimStore.updateParticipant('a',{equipment:[bow,unknownRange]});
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'custom-ranged',rangedWeaponHeldConfirmed:true,actionId:'aim-unknown-kind'}).ready,false);
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'custom-ranged',rangedWeaponConfirmed:true,rangedWeaponHeldConfirmed:true,actionId:'aim-unknown-range'}).ready,true);
  const {store:manualAimStore}=await setup();
  assert.equal(manualAimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponName:'Arme du PNJ',rangedWeaponConfirmed:true,rangedWeaponHeldConfirmed:true,actionId:'manual-aim'}).ready,true,
    'une arme absente du tableau équipement exige une déclaration MJ explicite plutôt qu’un blocage de la fiche');
  const aimed=aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true,actionId:'aim-a'});
  assert.equal(aimed.ready,true);assert.equal((await aimStore.applyV5CombatAction(aimed)).status,'applied');
  const aimEngine=createCombatEngine(aimStore);await aimEngine.nextTurn();await aimEngine.nextTurn();
  const shot=aimStore.previewResolution({ ...hit('aimed-shot'), action:{type:'attack',attr:'CT',base:60,damage:5},defense:undefined,v5:{kind:'ranged',context:{}} });
  assert.equal(shot.test.sl,5,'Visée ajoute +1 aux DR de base 4 du jet 25 contre score 60');
  assert.equal((await aimStore.applyResolution(shot)).status,'applied');
  assert.equal(aimStore.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow',rangedWeaponHeldConfirmed:true,actionId:'aim-again'}).ready,false,
    'Visée est une Action et ne se répète pas dans le même Tour');
});

test('F2-B — une défense effectivement appliquée annule la Visée du défenseur, pas une défense seulement proposée absente',async()=>{
  async function aimedDefender(){
    const {store,persistence}=await setup();
    const bow={id:'bow-a',kind:'weapon',name:'Arc',category:'Armes à distance',range:'60/120',damage:'BF+4'};
    await store.updateParticipant('a',{equipment:[bow]});
    const aim=store.previewV5CombatAction({actorId:'a',kind:'aim',targetId:'b',weaponId:'bow-a',rangedWeaponHeldConfirmed:true,actionId:'aim-before-incoming'});
    assert.equal(aim.ready,true);assert.equal((await store.applyV5CombatAction(aim)).status,'applied');
    return {store,persistence};
  }
  const {store:noDefense,persistence:noDefensePersistence}=await aimedDefender();
  const unopposed=noDefense.previewResolution({resolutionId:'incoming-unopposed',actorId:'b',targetId:'a',action:{type:'attack',attr:'CT',base:60,damage:5},roll:25,v5:{kind:'ranged'}});
  assert.equal(unopposed.ready,true);assert.equal((await noDefense.applyResolution(unopposed)).status,'applied');
  assert.equal(noDefensePersistence.read().extensions.v5.combatActions.byActorId.a?.kind,'aim','absence de jet défensif appliqué ne dépense pas l’Action Visée');

  const {store:defended,persistence:defendedPersistence}=await aimedDefender();
  const incoming=defended.previewResolution({resolutionId:'incoming-defended',actorId:'b',targetId:'a',action:{type:'attack',attr:'CT',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'ranged',choice:'keep',context:{rangedOppositionAllowed:true}}});
  assert.equal(incoming.ready,true);assert.ok(incoming.defenderTest,'le test défensif est réellement calculé');
  assert.equal((await defended.applyResolution(incoming)).status,'applied');
  assert.equal(defendedPersistence.read().extensions.v5.combatActions.byActorId.a,undefined,'le défenseur perd sa Visée dans la même transaction');
});

test('F2-B — Défensive reste active pendant le Tour adverse et expire au début du Tour propre suivant',async()=>{
  const {store,persistence}=await setup();
  const declaration=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-cross-turn'});
  assert.equal(declaration.ready,true);assert.equal((await store.applyV5CombatAction(declaration)).status,'applied');
  const engine=createCombatEngine(store);assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(persistence.read().combat.currentActorId,'b');
  const incoming=store.previewResolution({resolutionId:'incoming-during-b',actorId:'b',targetId:'a',action:{type:'attack',attr:'CC',base:60,damage:5},roll:25,
    defense:{base:40,roll:80,label:'Esquive',v5:{kind:'test',choice:'keep',context:{skillId:'dodge'}}},v5:{kind:'melee',choice:'keep'}});
  assert.equal(incoming.defenderTest.details.modifiers.find(row=>row.id==='combat:defensive-action')?.amount,2,
    'le +2 s’applique au défenseur pendant le Tour de B');
  assert.equal((await store.applyResolution(incoming)).status,'applied');
  assert.equal((await engine.nextTurn()).status,'applied');
  assert.equal(persistence.read().combat.currentActorId,'a');
  assert.equal(persistence.read().extensions.v5.combatActions.byActorId.a,undefined,
    'la Défensive est expirée et retirée au début du prochain Tour de A');
});

test('F2-B — Défensive ne bloque pas la vraie Attaque Rapide gratuite Myrmidia, mais bloque une attaque ordinaire',async()=>{
  const quick='divine:miracle:attaque-rapide',actor=person('a',{talents:[{id:'talent-bless',status:'resolved',rank:1,specialization:'Myrmidia'},{id:'talent-invoke',status:'resolved',rank:1,specialization:'Myrmidia'}],
    prayers:getAllDivineContracts().filter(row=>row.type==='miracle').map(row=>({name:row.catalogueName,status:'resolved'})),
    skills:[{id:'dodge',name:'Esquive',status:'resolved',carac:'Ag',total:40},{id:'prayer',name:'Prière',status:'resolved',carac:'Soc',total:60}],
    equipment:[{id:'sword',kind:'weapon',name:'Épée',category:'Base',damage:'BF+4',reach:'Moyenne',grip:'one-hand',layer:'none'}],extensions:{v5:{hasMomentum:false,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const {store}=await setup({actor});
  const prayer=store.previewDivineExecution(quick,{actorId:'a',targetIds:[],roll:45,canSpeak:true,expiry:{phase:'endOfTurn',round:3,actorId:'a'},choices:{range:0,targets:0,duration:0,effect:0}});
  assert.equal(prayer.ready,true);assert.equal((await store.applyDivineExecution(quick,{preview:prayer})).ready,true);
  const engine=createCombatEngine(store);await engine.nextTurn();await engine.nextTurn();
  const defensive=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defense-before-free'});
  assert.equal(defensive.ready,true);assert.equal((await store.applyV5CombatAction(defensive)).status,'applied');
  const free=store.previewResolution({resolutionId:'myrmidia-free-after-defense',actorId:'a',targetId:'b',roll:24,action:{type:'attack',base:60,attr:'CC',damage:5},defense:{base:30,roll:82,v5:{kind:'melee'}},
    v5:{kind:'melee',extraAttack:true,context:{freeAttackTalent:'divine-free-attack',freeAttackTest:{success:true},mainHand:true}}});
  assert.equal(free.actionCosts.ready,true,JSON.stringify(free.actionCosts.unresolved));assert.equal(free.actionCosts.paid.length,0);
  assert.equal((await store.applyResolution(free)).status,'applied');
  assert.equal(store.previewResolution(hit('ordinary-after-defensive')).ready,false,'l’attaque ordinaire reste refusée après Défensive');
  assert.equal(store.previewResolution(hit('paid-extra-after-defensive',{extraAttack:true})).ready,false,'extraAttack seul sans exemption légitime ne contourne pas Défensive');
});

test('F2-B — la garde du créneau couvre attaque, magie et Prière, sans s’appliquer à réaction/attaque supplémentaire',async()=>{
  const prayerActor=person('a',{talents:[{id:'talent-invoke',status:'resolved',rank:1,specialization:'Ulric'}],prayers:[{name:getDivineContract(HOWL).catalogueName,status:'resolved'}]});
  const {store}=await setup({actor:prayerActor});
  const declaration=store.previewV5CombatAction({actorId:'a',kind:'defensive',skillId:'dodge',actionId:'defensive-action'});
  assert.equal(declaration.ready,true);assert.equal((await store.applyV5CombatAction(declaration)).status,'applied');
  assert.equal(store.previewResolution(ordinary('after-defense')).ready,false);
  assert.equal(store.previewSpellExecution('Carreau',{actorId:'a',targetIds:['b'],roll:23,miscastRoll:15,attributeActive:false}).ready,false);
  const contract=getDivineContract(HOWL),actor=store.listParticipants().find(p=>p.id==='a');
  const prayer=store.previewDivineExecution(HOWL,{actorId:'a',targetIds:[],roll:45,canSpeak:true,choices:{range:0,targets:0,duration:0,effect:0},expiry:buildExpiry({contract,actor,choices:{},round:1,phase:'endOfTurn'})});
  assert.equal(prayer.ready,false);
  const {store:second}=await setup();
  assert.equal(second.previewResolution(hit('legacy-extra',{extraAttack:true})).actionCosts.ready,true,
    'le quota ne supprime pas les attaques supplémentaires legacy hors règle seconde arme');
});

test('F2-B — après une attaque même ratée, seconde arme différente consomme 1 Élan et quota atomiques',async()=>{
  const item=(id,name)=>({id,baseId:'custom-model',catalogVersion:'fixture-v1',kind:'weapon',name,category:'Base',damage:'BF+4',reach:'Moyenne',range:'',ap:null,locations:[],layer:'none',keywords:[],notes:'',source:'Campagne',custom:true,grip:'one-hand'});
  const actor=person('a',{equipment:[item('sword','Épée'),item('axe','Hache')]});
  const {store,persistence}=await setup();await store.updateParticipant('a',{equipment:actor.equipment});
  const miss=store.previewResolution({...hit('first-missed'),roll:99,defense:{base:35,roll:20,v5:{kind:'melee'}},action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}}});
  assert.equal(miss.ready,true);assert.equal(miss.hit,false);assert.equal((await store.applyResolution(miss)).status,'applied');
  await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const extra=store.previewResolution({...hit('second-axe',{extraAttack:true,context:{secondWeaponAttack:true,weaponId:'axe',primaryResolutionId:'first-missed'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'axe'}}}});
  assert.equal(extra.actionCosts.ready,true);assert.deepEqual(extra.actionCosts.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  assert.equal(extra.test.details.modifiers.find(row=>row.id==='penalty:offHand')?.amount,-2);
  const applied=await store.applyResolution(extra);assert.equal(applied.status,'applied');
  assert.deepEqual(applied.actionCostReceipt.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  const retry=store.previewResolution({...extra.input,resolutionId:'second-axe-again'});assert.equal(retry.actionCosts.ready,false);
  const ledger=(await persistence.read())?.extensions?.v5?.actionLedger;
  assert.equal(ledger.quotaUsage.find(row=>row.quotaId==='combat:base-second-weapon')?.used,1);
  assert.throws(()=>store.previewResolution({...hit('same-weapon',{extraAttack:true,context:{secondWeaponAttack:true,weaponId:'sword',primaryResolutionId:'first-missed'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}}}),/arme différente utilisable à une main/);
  const dualActor=person('a',{equipment:[item('sword','Épée'),item('axe','Hache')],talents:[{id:'talent-dual-wielder',name:'Maniement de deux armes',status:'resolved',rank:1}],extensions:{v5:{hasMomentum:false,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const {store:dualStore}=await setup({actor:dualActor});
  const dualPrimary=dualStore.previewResolution({...hit('dual-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'sword'}}}});
  assert.equal((await dualStore.applyResolution(dualPrimary)).status,'applied');
  const dualSecond=dualStore.previewResolution({...hit('dual-second',{extraAttack:true,context:{freeAttackTalent:'dual-wielder',dualWielding:true,secondWeaponAttack:true,weaponId:'axe',primaryResolutionId:'dual-primary'}}),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'axe'}}}});
  assert.equal(dualSecond.actionCosts.ready,true);
  assert.equal(dualSecond.actionCosts.paid.length,0,'Maniement de deux armes exonère le coût d’Élan');
});

test('F2-B — Croche-pied exige une touche appliquée de la même cible et l’atout réellement porté par cette attaque',async()=>{
  const {store,persistence}=await setup();
  const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
  await store.updateParticipant('a',{equipment:[tripWeapon]});
  await store.updateParticipant('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]});
  const primary=store.previewResolution({...hit('trip-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
  assert.equal(primary.ready,true);assert.equal(primary.hit,true);assert.equal((await store.applyResolution(primary)).status,'applied');
  assert.ok(persistence.read().extensions.v5.standardTurnActions.find(row=>row.actionId==='trip-primary').qualityIds.includes('croche-pied'),
    'le reçu de l’attaque appliquée conserve la qualité issue de son arme');
  await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const trip=store.previewResolution({resolutionId:'trip-follow-up',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-primary',athleticsSkillId:'athletics'}}});
  assert.equal(trip.ready,true,JSON.stringify(trip.unresolved));assert.equal(trip.trip.winner,'attacker');
  assert.deepEqual(trip.actionCosts.paid.map(row=>[row.resource,row.amount]),[['momentum',1]]);
  assert.equal((await store.applyResolution(trip)).status,'applied');
  assert.ok(persistence.read().combat.participants.find(row=>row.id==='b').states.some(row=>row.key==='aterre'),
    'la victoire de l’attaquant applique À Terre à la cible');
  await store.undo();
  const defenderWin=store.previewResolution({resolutionId:'trip-defender-win',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:90,
    defense:{base:30,roll:10,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-primary',athleticsSkillId:'athletics'}}});
  assert.equal(defenderWin.ready,true);assert.equal(defenderWin.trip.winner,'defender');assert.equal(defenderWin.trip.conditionApplied,false);
  const appliedDefenderWin=await store.applyResolution(defenderWin);assert.equal(appliedDefenderWin.status,'applied');
  assert.deepEqual(appliedDefenderWin.actionCostReceipt.paid.map(row=>[row.resource,row.amount]),[['momentum',1]],'1 Élan reste dépensé même si le défenseur gagne');
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').states.some(row=>row.key==='aterre'),false,'aucun À Terre sur victoire défensive');
  const {store:untrainedStore}=await setup({actor:person('a',{skills:[{id:'cc-flail',name:'Corps à corps (Fléau)',group:'Corps à corps',specialty:'Fléau',total:60,advances:0,status:'resolved'}],equipment:[{id:'untrained-flail',kind:'weapon',name:'Fléau',category:'Fléau',damage:'BF+4',keywords:[{id:'croche-pied'}]}]}),target:person('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]})});
  const untrainedHit=untrainedStore.previewResolution({...hit('untrained-trip-hit'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'untrained-flail'}}}});
  assert.equal(untrainedHit.ready,true);assert.equal((await untrainedStore.applyResolution(untrainedHit)).status,'applied');
  const blockedByC=untrainedStore.previewResolution({resolutionId:'trip-after-c-strip',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'untrained-trip-hit',athleticsSkillId:'athletics'}}});
  assert.equal(blockedByC.ready,false);assert.ok(blockedByC.unresolved.some(row=>/atout Croche-pied/.test(row)),'le filtrage C retire Croche-pied sans maîtrise du groupe');
});

test('F2-B — Croche-pied refuse une arme sans Atout et accepte les scores absents seulement après confirmation MJ',async()=>{
  const {store}=await setup();
  const sword={id:'plain-sword',kind:'weapon',name:'Épée',category:'Base',damage:'BF+4',keywords:[]};
  await store.updateParticipant('a',{equipment:[sword]});
  const primary=store.previewResolution({...hit('plain-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'plain-sword'}}}});
  assert.equal(primary.ready,true);assert.equal((await store.applyResolution(primary)).status,'applied');
  const actor=store.listParticipants().find(row=>row.id==='a'),{F,...withoutForce}=actor.caracs;
  await store.updateParticipant('a',{caracs:withoutForce});
  const target=store.listParticipants().find(row=>row.id==='b');
  await store.updateParticipant('b',{skills:(target.skills||[]).filter(row=>row.id!=='athletics')});
  const request={resolutionId:'ineligible-trip',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep'}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'plain-primary',athleticsSkillId:'athletics'}}};
  const blocked=store.previewResolution(request);
  assert.equal(blocked.ready,false);assert.ok(blocked.unresolved.some(row=>/arme portant l’atout Croche-pied/.test(row)));
  const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
  await store.updateParticipant('a',{equipment:[sword,tripWeapon],extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
  const validPrimary=store.previewResolution({...hit('trip-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
  assert.equal(validPrimary.ready,true);assert.equal((await store.applyResolution(validPrimary)).status,'applied');
  const eligibleBase={...request,v5:{...request.v5,context:{...request.v5.context,tripPrimaryResolutionId:'trip-primary'}}};
  const missingScores=store.previewResolution(eligibleBase);
  assert.equal(missingScores.ready,false);assert.ok(missingScores.unresolved.some(row=>/Force absente/.test(row)));assert.ok(missingScores.unresolved.some(row=>/Athlétisme absent/.test(row)));
  const confirmed=store.previewResolution({...eligibleBase,v5:{...eligibleBase.v5,context:{...eligibleBase.v5.context,forceScoreConfirmed:true,forceScore:40,athleticsScoreConfirmed:true,athleticsScore:30}}});
  assert.equal(confirmed.ready,true,JSON.stringify(confirmed.unresolved));
});

test('F2-B — chute montée applique E30, bloque E20 sans test atomique, BE≥6 ne soigne jamais, et traite critiques Jambe/supplémentaires',async()=>{
  async function mountedCase(id,E){
    const target=person('b',{caracs:{...person('b').caracs,E},extensions:{v5:{mounted:true}}}),{store,persistence}=await setup({target});
    const tripWeapon={id:'trip-weapon',kind:'weapon',name:'Gaffe de marin',category:'Bagarre',damage:'BF+4',keywords:[{id:'croche-pied'}]};
    await store.updateParticipant('a',{equipment:[tripWeapon]});
    await store.updateParticipant('b',{skills:[{id:'athletics',name:'Athlétisme',status:'resolved',total:30}]});
    const primary=store.previewResolution({...hit(id+'-primary'),action:{type:'attack',attr:'CC',base:60,damage:5,extensions:{fiche:{equipmentId:'trip-weapon'}}}});
    assert.equal(primary.ready,true);assert.equal((await store.applyResolution(primary)).status,'applied');const hpAfterPrimary=persistence.read().combat.participants.find(row=>row.id==='b').hp;
    await store.updateParticipant('a',{extensions:{v5:{hasMomentum:true,divine:{sin:0},magic:{reserve:{type:'winds',sl:0}}}}});
    return{store,persistence,id,hpAfterPrimary};
  }
  const e30=await mountedCase('trip-e30',30);
  const fall30=e30.store.previewResolution({resolutionId:'trip-e30-fall',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e30-primary',athleticsSkillId:'athletics'}}});
  assert.equal(fall30.ready,true,JSON.stringify(fall30.unresolved));assert.equal(fall30.tripFall.rawDamage,3);assert.equal(fall30.tripFall.damageLoss,3);assert.equal(fall30.tripFall.enduranceTest,null);
  assert.equal((await e30.store.applyResolution(fall30)).status,'applied');
  let fallen=e30.persistence.read().combat.participants.find(row=>row.id==='b');assert.equal(fallen.hp,e30.hpAfterPrimary-3);assert.equal(fallen.extensions.v5.mounted,false);assert.ok(fallen.states.some(row=>row.key==='aterre'));

  const e20=await mountedCase('trip-e20',20);
  const missing=e20.store.previewResolution({resolutionId:'trip-e20-missing-test',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-primary',athleticsSkillId:'athletics'}}});
  assert.equal(missing.ready,false);assert.ok(missing.unresolved.some(row=>/Test d’Endurance \+0/.test(row)));
  assert.equal((await e20.store.applyResolution(missing)).status,'manual');assert.equal(e20.persistence.read().combat.participants.find(row=>row.id==='b').hp,e20.hpAfterPrimary);
  const fall20=e20.store.previewResolution({...missing.input,resolutionId:'trip-e20-successful-endurance',v5:{...missing.input.v5,context:{...missing.input.v5.context,tripFallEnduranceRoll:10}}});
  assert.equal(fall20.ready,true,JSON.stringify(fall20.unresolved));assert.equal(fall20.tripFall.damageLoss,4);assert.equal(fall20.tripFall.enduranceTest.success,true);
  assert.equal((await e20.store.applyResolution(fall20)).status,'applied');fallen=e20.persistence.read().combat.participants.find(row=>row.id==='b');assert.equal(fallen.hp,e20.hpAfterPrimary-4);assert.equal(fallen.extensions.v5.mounted,false);

  const e60=await mountedCase('trip-e60',60);
  const noHealing=e60.store.previewResolution({resolutionId:'trip-e60-fall',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e60-primary',athleticsSkillId:'athletics'}}});
  assert.equal(noHealing.ready,true,JSON.stringify(noHealing.unresolved));assert.equal(noHealing.tripFall.damageLoss,0);
  assert.equal((await e60.store.applyResolution(noHealing)).status,'applied');assert.equal(e60.persistence.read().combat.participants.find(row=>row.id==='b').hp,e60.hpAfterPrimary);

  const e20Fail=await mountedCase('trip-e20-fail',20);
  await e20Fail.store.updateParticipant('b',{armor:{head:4,body:4,arms:4,legs:4}});
  const wrongLoc=e20Fail.store.previewResolution({resolutionId:'trip-e20-wrong-loc',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-fail-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:65,tripLegLocationRoll:10,tripLegCriticalEffectRoll:20}}});
  assert.equal(wrongLoc.ready,false);assert.ok(wrongLoc.unresolved.some(row=>/localisation d100 de Jambe/.test(row)));
  const legCrit=e20Fail.store.previewResolution({resolutionId:'trip-e20-leg-crit',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-fail-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:65,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20}}});
  assert.equal(legCrit.ready,true,JSON.stringify(legCrit.unresolved));
  assert.equal(legCrit.tripFall.armourApplied,false);assert.equal(legCrit.tripFall.damageLoss,4);assert.equal(legCrit.tripFall.criticals.length,1);
  assert.equal((await e20Fail.store.applyResolution(legCrit)).status,'applied');
  let critTarget=e20Fail.persistence.read().combat.participants.find(row=>row.id==='b');
  assert.equal(critTarget.extensions.v5.criticalWounds.length,1);assert.equal(critTarget.extensions.v5.criticalWounds[0].source,'fall');
  assert.equal(await e20Fail.store.undo(),true);
  assert.equal(e20Fail.persistence.read().combat.participants.find(row=>row.id==='b').extensions.v5.mounted,true);

  const e20Astounding=await mountedCase('trip-e20-astounding',20);
  const missingExtra=e20Astounding.store.previewResolution({resolutionId:'trip-e20-missing-extra',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-astounding-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:95,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20}}});
  assert.equal(missingExtra.ready,false);assert.ok(missingExtra.unresolved.some(row=>/Échec éclatant/.test(row)));
  const twoCrits=e20Astounding.store.previewResolution({resolutionId:'trip-e20-two-crits',actorId:'a',targetId:'b',action:{type:'test',attr:'F',base:40},roll:25,
    defense:{base:30,roll:80,v5:{kind:'test',choice:'keep',context:{skillId:'athletics'}}},v5:{kind:'test',context:{trip:true,tripPrimaryResolutionId:'trip-e20-astounding-primary',athleticsSkillId:'athletics',tripFallEnduranceRoll:95,tripLegLocationRoll:85,tripLegCriticalEffectRoll:20,tripExtraLocationRoll:15,tripExtraCriticalEffectRoll:25}}});
  assert.equal(twoCrits.ready,true,JSON.stringify(twoCrits.unresolved));assert.equal(twoCrits.tripFall.criticals.length,2);
  assert.equal((await e20Astounding.store.applyResolution(twoCrits)).status,'applied');
  critTarget=e20Astounding.persistence.read().combat.participants.find(row=>row.id==='b');
  assert.equal(critTarget.extensions.v5.criticalWounds.length,2);
});

test('F2-B — Tir engagé ne redirige que la touche annulée par Désavantage, puis blesse la vraie cible dans le Store',async()=>{
  const actor=person('a'),initial=person('b',{hp:30,maxHp:30}),ally=person('c',{camp:'pj',hp:30,maxHp:30,armor:{head:2,body:2,arms:2,legs:2}});
  const p=persistence(),store=createStore({persistence:p,storage:null});await store.ready;
  await store.loadFromJSON({schemaVersion:3,reserve:[],log:[],diceLines:[],extensions:{v5:{combatId:'f2-b-engaged',turnIndex:1}},combat:{round:1,currentActorId:'a',order:['a','b','c'],participants:[actor,initial,ally]}});
  const preview=store.previewResolution({resolutionId:'engaged-redirect',actorId:'a',targetId:'b',action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c'],engagedTargetRoll:80}}});
  assert.deepEqual(preview.unresolved,[]);assert.equal(preview.engagedShot.selectedTargetId,'c');assert.equal(preview.targetId,'c');assert.equal(preview.hit,true);
  assert.equal((await store.applyResolution(preview)).status,'applied');
  assert.equal(p.read().combat.participants.find(row=>row.id==='b').hp,30,'la cible initiale n’est pas blessée');
  assert.ok(p.read().combat.participants.find(row=>row.id==='c').hp<30,'le combattant tiré au sort subit réellement les dégâts');
  assert.equal(await store.undo(),true);assert.equal(p.read().combat.participants.find(row=>row.id==='c').hp,30);
  const ordinaryMiss=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:79,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c'],engagedTargetRoll:80}},v5State:{participants:[actor,initial,ally]}});
  assert.equal(ordinaryMiss.engagedShot,null,'un échec même sans le Désavantage ne change pas de cible');
  const missingRoll=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['b','c']}},v5State:{participants:[actor,initial,ally]}});
  assert.ok(missingRoll.unresolved.some(row=>/d100/i.test(row)),'pas de cible remplacée sans aléa MJ capturé');
  const missingInitial=previewResolution({actor,target:initial,action:{type:'attack',attr:'CT',base:60,damage:4},roll:18,
    v5:{kind:'ranged',choice:'reverse',context:{targetEngaged:true,engagedTargetIds:['c'],engagedTargetRoll:80}},v5State:{participants:[actor,initial,ally]}});
  assert.ok(missingInitial.unresolved.some(row=>/cible initiale comprise/i.test(row)));
});

test('F2-B — mouvement déclaré efface Visée, ne consomme pas Action et pénalise le tir dans le Tour',async()=>{
  const {store}=await setup();const movement=await store.declareV5CombatMovement({actorId:'a'});assert.equal(movement.status,'applied');
  const shot=store.previewResolution({...hit('moved-shot'),action:{type:'attack',attr:'CT',base:60,damage:4},defense:undefined,v5:{kind:'ranged',context:{}}});
  assert.equal(shot.test.details.modifiers.find(row=>row.id==='movement:ranged')?.amount,-1);
  assert.equal(shot.ready,true,'déplacement ne consomme pas l’Action standard');
  assert.equal((await store.applyResolution(shot)).status,'applied');
});

test('F2-B — cible sans défense choisit librement le jet; touche auto seulement en mêlée/point blank',()=>{
  const actor=person('a'),target=person('b');
  const melee=previewResolution({actor,target,action:{type:'attack',attr:'CC',base:60,damage:4},roll:11,criticalRolls:{location:34,effect:20},v5:{kind:'melee',choice:'keep',context:{targetHelpless:true}}});
  assert.deepEqual(melee.unresolved,[]);assert.equal(melee.hit,true);assert.equal(melee.critical?.kind,'Critique','le jet choisi peut produire un critique');
  const pointBlank=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:60,damage:4},roll:99,v5:{kind:'ranged',choice:'keep',context:{targetHelpless:true,shotRange:'point-blank'}}});
  assert.equal(pointBlank.hit,true);
  const long=previewResolution({actor,target,action:{type:'attack',attr:'CT',base:60,damage:4},roll:99,v5:{kind:'ranged',choice:'keep',context:{targetHelpless:true,shotRange:'long'}}});
  assert.equal(long.hit,false,'tir hors bout portant ne touche pas automatiquement');
});

test('F2-B — mort directe désactivée par défaut, éligibilité bornée, option et confirmation MJ requises puis Undo/reload',async()=>{
  const {store,persistence}=await setup();
  const base={...hit('lethal-default'),defense:undefined,v5:{kind:'melee',context:{targetHelpless:true}}};
  const ordinary=store.previewResolution(base);assert.equal(ordinary.ready,true);assert.equal(ordinary.lethalDeath,null);
  const intent=store.previewResolution({...base,resolutionId:'lethal-intent',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true}}});
  assert.equal(intent.ready,false);assert.ok(intent.unresolved.some(row=>/option létale/i.test(row)));
  const noConfirmation=store.previewResolution({...base,resolutionId:'lethal-no-confirm',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true,lethalTableEnabled:true}}});
  assert.equal(noConfirmation.ready,false);assert.ok(noConfirmation.unresolved.some(row=>/confirmation explicite/i.test(row)));
  const rangedIneligible=store.previewResolution({...base,resolutionId:'lethal-long-shot',action:{type:'attack',attr:'CT',base:60,damage:5},v5:{kind:'ranged',context:{targetHelpless:true,shotRange:'long',lethalIntent:true,lethalTableEnabled:true,confirmLethalDeath:true}}});
  assert.equal(rangedIneligible.ready,false);assert.ok(rangedIneligible.unresolved.some(row=>/bout portant/i.test(row)));
  const approved=store.previewResolution({...base,resolutionId:'lethal-confirmed',v5:{kind:'melee',context:{targetHelpless:true,lethalIntent:true,lethalTableEnabled:true,confirmLethalDeath:true}}});
  assert.equal(approved.ready,true);assert.deepEqual(approved.lethalDeath,{targetId:'b',confirmedBy:'explicit-gm',tableOptionEnabled:true});
  const applied=await store.applyResolution(approved);assert.equal(applied.status,'applied');assert.deepEqual(applied.resolution.lethalDeath.application,{hp:0,dead:true});
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').extensions.v5.dead,true);
  assert.equal(persistence.read().combat.participants.find(row=>row.id==='b').hp,0);
  assert.equal(await store.undo(),true);assert.notEqual(persistence.read().combat.participants.find(row=>row.id==='b').extensions?.v5?.dead,true);
  const reload=createStore({persistence,storage:null});await reload.ready;assert.notEqual(reload.listParticipants().find(row=>row.id==='b').extensions?.v5?.dead,true);
});
