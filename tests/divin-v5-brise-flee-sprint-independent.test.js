import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../js/core/store.js';
import {createCombatEngine} from '../js/core/combat.js';
import DIVINE_REGISTRY from '../js/data/v5-divine-contracts.json' with {type:'json'};
import {wrathConditionReading} from '../docs/divin/sources/L06-wrath-conditions-readings.mjs';

// Black-box obligations from the inspected L06 V5 pages 163, 185–186.
// These tests do not import the developer's escape helper or trust its private state.
const PRAY='skill-50_72_69_e8_72_65-base';
const ATHLETICS='skill-41_74_68_6c_e9_74_69_73_6d_65-base';
const clone=value=>structuredClone(value);
const snapshot=store=>{const value=JSON.parse(store.getFullJSON());delete value.exportedAt;return value;};
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
