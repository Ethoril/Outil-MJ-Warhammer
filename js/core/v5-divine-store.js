import {normalizeCamp} from './encounters.js';
/** Adaptateur du domaine divin : contrats canoniques, sources actuelles et commandes du Store. */
import registry from '../data/v5-divine-contracts.json' with {type:'json'};
import {getReferenceCatalogue} from './reference-catalog.js';
import {previewDivineExecution,applyDivineExecution,expireDivineEffects,resolveSinAdjustmentCult,divineSinPolicy,wrathDeityRejections} from './v5-divine-engine.js';
import {calculateArmor,spellObjectChoices} from './equipment.js';
import {refreshEffectLayers,rebaseMagicLayers} from './v5-magic-effects.js';
import {uid,normalizeAction} from './models.js';
import {resolveDivineAccess,createDivineAccessGrant,revokeDivineAccessGrant,consumeDivineAccessGrant,emptyDivineAccess,wrathAccessRules,validateDivineAccessSuspensions,readDivineRejections} from './v5-divine-access.js';
import {v5ResourceIdentity,getV5Fortune,refreshV5Fortune} from './v5-resources.js';
import {advanceGameClock,readCombatPosition} from './v5-game-time.js';
import {validatePrayerSLCaps,getPrayerSLModifiers,applyPrayerSLCaps,wrathRoundRules,validateWrathRounds,wrathPrayerBan,wrathForcedPrayerGate,wrathTurnPosition,wrathActionSpent} from './v5-divine-prayer-caps.js';
import {acquireV5Conditions,isV5ConditionImmune,assertDivineWrathConditionsKept,hasDivineWrathLock} from './v5-effects.js';
import {removeFromCombat} from './turn-order.js';
import {effectHandler} from './v5-divine-effect-handlers.js';
import {WRATH_SUMMON_RULES,planWrathSummon,wrathSummonParticipant} from './v5-divine-effects-summon.js';
import {previewV5Test,selectV5Test,normalizeV5Roll} from './v5-roll.js';
import {resolveV5ConditionTestContext} from './v5-test-context.js';
import {effectiveSkillScore,baseCharacteristicScore,magicSkillModifiers} from './v5-magic-talents.js';

const clone=value=>structuredClone(value);
const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
const entries=()=>(registry.contracts || registry.entries || []).map(row=>({...row,schemaVersion:registry.schemaVersion,sourceFingerprint:registry.sourceFingerprint}));
const failure=(status,error,needsInput=[])=>({ready:false,ok:false,status,error,needsInput});
const ruleError=message=>Object.assign(new Error(message),{userFacing:true,code:'DIVINE_REFUSED'});
// Une confirmation est liée à l’aperçu effectivement émis, y compris son jet,
// ses choix et son résultat. Le formulaire n’en devient pas l’autorité.
const issuedPreviews=new Map();
function rememberPreview(preview){
 issuedPreviews.set(preview.executionId,JSON.stringify(clone(preview)));
 while(issuedPreviews.size>200)issuedPreviews.delete(issuedPreviews.keys().next().value);
 return preview;
}
export const getAllDivineContracts=()=>clone(entries());
export function getDivineContract(id){const contract=entries().find(row=>row.id===id);return contract?clone(contract):null;}
const parts=state=>state?.combat?.participants || [];
const stateFingerprint=state=>JSON.stringify({combat:state.combat,activeScene:state.activeScene||null,reserve:state.reserve||[],persistentCharacters:state.persistentCharacters||[],suspendedScenes:state.suspendedScenes||[],gameClock:state.extensions?.v5?.gameClock||null,divineAccess:state.extensions?.v5?.divineAccess||emptyDivineAccess(),divineExecutions:state.extensions?.v5?.divineExecutions||[]});
const divineAccessState=state=>state.extensions?.v5?.divineAccess||emptyDivineAccess();
function divineSubjectKey(state,actor){return v5ResourceIdentity(state,actor)|| (actor?.extensions?.v5?.divineSubjectId?'divine-local:'+actor.extensions.v5.divineSubjectId:'instance:'+actor?.id);}
function storeActor(state,actorId){return parts(state).find(row=>row.id===actorId&&row.zone==='active')||null;}
const prayerCaps=participant=>(participant?.extensions?.v5?.divineEffects||[]).filter(row=>row?.type==='prayer-sl-cap');
const prayerNeeds=(path,message)=>({path,code:'unresolved-divine-prayer-cap',message});
function wrathConditionRule(resultId){return (registry.wrathConditionRules||[]).find(row=>row.resultId===resultId)||null;}
const wrathDamageRule=resultId=>(registry.wrathDamageRules||[]).find(row=>row.resultId===resultId)||null;
const wrathStateRule=resultId=>(registry.wrathStateRules||[]).find(row=>row.resultId===resultId)||null;
function projectWrathStates(actor,rule,executionId,round,cult){
 const next=clone(actor),beforeIds=new Set((actor.states||[]).map(row=>row.id));
 if(!Number.isSafeInteger(actor.hp)||actor.hp<0)return {ok:false,error:'Blessures courantes valides requises.',needsInput:[{field:'actor.hp',label:'Blessures courantes'}]};
 if(rule.zeroWounds)effectHandler('direct-damage').applyInstant(next,{type:'direct-damage',fixed:next.hp},{actor,prayer:{sl:0},input:{},executionId,targetId:actor.id});
 const acquired=acquireV5Conditions(next,rule.conditions.map(row=>({...row,source:{kind:'divine-wrath',executionId,ruleId:rule.id,resultId:rule.resultId}})),{authorId:actor.id,targetId:actor.id,round});
 if(!acquired.ready)return {ok:false,error:'Acquisition des États à préciser.',needsInput:acquired.needsInput};
 let index=0;
 for(const state of acquired.participant.states){
  const added=!beforeIds.has(state.id);
  if(added){state.id=`divine-wrath-state:${executionId}:${index++}`;state.divineWrathExecutionId=executionId;state.divineWrathRuleId=rule.id;}
  if(rule.recovery&&state.key===rule.lockCondition&&(added||['a-terre','inconscient'].includes(state.key))&&!isV5ConditionImmune(actor,state)){
   state.divineWrathLocks=[...(state.divineWrathLocks||[]),{executionId,ruleId:rule.id,resultId:rule.resultId,kind:rule.recovery.kind,cult,ownedState:added,source:clone(rule.source)}];
  }
 }
 const preview={ruleId:rule.id,resultId:rule.resultId,targetId:actor.id,hpBefore:actor.hp,hpAfter:acquired.participant.hp,
  conditions:acquired.participant.states.filter(row=>row.divineWrathExecutionId===executionId||(row.divineWrathLocks||[]).some(lock=>lock.executionId===executionId)).map(row=>({id:row.id,name:row.name,level:row.level,locked:Boolean(row.divineWrathLocks?.length)})),reminders:clone(acquired.reminders),recovery:clone(rule.recovery||null)};
 return {ok:true,participant:acquired.participant,preview,receipt:{...clone(preview),source:clone(rule.source),sourceReceipt:clone(rule.sourceReceipt),acquiredCount:acquired.acquiredInstances}};
}
function projectWrathDamage(actor,rule,input,executionId,sinAtTest,round){
 const projection={ruleId:rule.id,resultId:rule.resultId,targetId:actor.id,sinAtTest,diceCount:rule.diceCount,enduranceDifficulty:rule.enduranceDifficulty};
 const fail=(error,needsInput)=>({ok:false,error,needsInput,preview:projection});
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const need=(field,label)=>({field,label});
 const effect={type:rule.damageType,fixed:rule.fixed+rule.perSin*sinAtTest,...(rule.diceCount?{dice:{count:rule.diceCount,sides:10}}:{})};
 const damageInput={damageRoll:input.wrathDamageRoll},handler=effectHandler(effect.type);
 const required=handler.needs(effect,{actor,targets:[actor],input:damageInput}).map(row=>({...row,field:row.field==='damageRoll'?'wrathDamageRoll':row.field}));
 if(input.wrathEnduranceRoll===undefined)required.push(need('wrathEnduranceRoll','Jet de Résistance du Courroux (d100) requis.'));
 if(required.length)return fail('Les dés du Courroux doivent être saisis avant application.',required);
 const skills=(actor.skills||[]).filter(row=>['resistance','endurance'].includes(fold(row.name||row.nom)));
 if(skills.some(row=>row.status!=='resolved'||row.carac&&fold(row.carac)!=='e')||new Set(skills.map(row=>row.total)).size>1)
  return fail('La compétence Résistance doit être résolue sans ambiguïté sur la fiche.',[need('actor.skills.Endurance','Résistance résolue sur la fiche')]);
 if(!Number.isSafeInteger(actor.caracs?.E)||actor.caracs.E<0||skills.some(row=>!Number.isSafeInteger(row.total)||row.total<0))
  return fail('Score de Résistance ou Endurance du personnage invalide.',[need('actor.caracs.E','Endurance courante et score de Résistance valides')]);
 const skillName=skills[0]?.name||skills[0]?.nom||'Résistance';
 const score=effectiveSkillScore(actor,skills[0]?.total??baseCharacteristicScore(actor,'E'),'E');
 const changed=clone(actor),damage=handler.applyInstant(changed,effect,{actor,prayer:{sl:0},input:damageInput,executionId,targetId:actor.id});
 const context=resolveV5ConditionTestContext(changed,{characteristic:'E',isAction:false,involvesMovement:false,runningOrHiding:false,requiresSight:false,reliesOnSight:false,
  conditionPenaltyMode:input.wrathConditionContext?.conditionPenaltyMode,conditionPenaltyReason:input.wrathConditionContext?.conditionPenaltyReason});
 if(!context.ready)return fail('Le contexte des États du Test de Résistance doit être précisé.',context.needsInput.map(row=>need('wrathConditionContext.'+row.field,row.label)).concat(context.restrictions.map(label=>need('wrathConditionContext',label))));
 let testPreview,test;
 try{
  testPreview=previewV5Test({score,roll:normalizeV5Roll(input.wrathEnduranceRoll),kind:'test',
   slModifiers:[{id:rule.id+':difficulty',label:'Difficulté source du Courroux',amount:rule.enduranceDifficulty},...context.slModifiers,...magicSkillModifiers(changed,skillName)],
   advantageSources:context.advantageSources,disadvantageSources:context.disadvantageSources});
  projection.testOptions=clone(testPreview.options);
  if(testPreview.choiceRequired&&!input.wrathTestOptionId)return fail('Choisissez l’issue du Test de Résistance.',[need('wrathTestOptionId','Issue de Résistance')]);
  test=selectV5Test(testPreview,input.wrathTestOptionId||(testPreview.forcedInversion?'reverse':'keep'));
 }catch(error){return fail(error.message,[need('wrathEnduranceRoll','Jet d100 et choix de Résistance valides')]);}
 const count=test.success?0:1+(rule.extraStunnedPerNegativeSL?Math.max(0,-test.sl):0);
 const priorIds=new Set((changed.states||[]).map(row=>row.id));
 const acquisition=acquireV5Conditions(changed,count?[{name:'Sonné',level:count,source:{kind:'divine-wrath',ruleId:rule.id,resultId:rule.resultId,executionId,source:clone(rule.source)}}]:[],{authorId:actor.id,targetId:actor.id,round});
 if(!acquisition.ready)return fail('L’acquisition des États du Courroux requiert une précision.',acquisition.needsInput||[]);
 const added=(acquisition.participant.states||[]).filter(row=>!priorIds.has(row.id));
 added.forEach((row,index)=>{row.id=`divine-wrath-damage:${executionId}:${index}`;row.divineWrathExecutionId=executionId;row.divineWrathRuleId=rule.id;});
 Object.assign(projection,{wounds:damage.wounds,woundsLost:damage.woundsLost,hpBefore:actor.hp,hpAfter:acquisition.participant.hp,
  enduranceTest:clone(test),enduranceScore:score,stunnedRequested:count,conditions:added.map(row=>({id:row.id,name:row.name,level:row.level})),
  reminders:clone(acquisition.reminders||[]),momentumBefore:Boolean(actor.extensions?.v5?.hasMomentum),momentumAfter:Boolean(acquisition.participant.extensions?.v5?.hasMomentum)});
 const result={...damage,conditions:added.map(row=>row.name)};
 const effectReceipt=handler.receipt(effect,{actor,targetId:actor.id},result);
 effectReceipt.log=`${actor.name} · Courroux ${rule.resultId} · ${damage.woundsLost} Blessure(s) : ${actor.hp} → ${acquisition.participant.hp} · Résistance ${test.sl} DR · ${count} Sonné demandé(s)`;
 return {ok:true,participant:acquisition.participant,preview:projection,receipt:{ruleId:rule.id,resultId:rule.resultId,sourceReceipt:clone(rule.sourceReceipt),
  proof:{sinAtTest,executionId},damage:clone(result),enduranceTest:clone(test),testContext:clone(context),stunnedRequested:count,conditions:clone(projection.conditions),reminders:clone(acquisition.reminders||[])},effectReceipt};
}
function projectWrathConditions(actor,rule,executionId,sinAtTest){
 if(!actor||!rule||!Number.isSafeInteger(sinAtTest)||sinAtTest<0)return {ok:false,needsInput:[prayerNeeds('wrathConditionRules','Règle source, acteur et Péchés au déclenchement requis.')]};
 const requested=rule.conditions.map(row=>({name:row.name,level:row.base+row.perSin*sinAtTest,source:{kind:'divine-wrath',ruleId:rule.id,resultId:rule.resultId,executionId,source:clone(rule.source)}}));
 const beforeMomentum=Boolean(actor.extensions?.v5?.hasMomentum);
 const acquired=acquireV5Conditions(actor,requested,{authorId:actor.id,targetId:actor.id});
 if(!acquired.ready)return {ok:false,needsInput:acquired.needsInput||[]};
 const beforeIds=new Set((actor.states||[]).map(row=>row.id));
 const added=(acquired.participant.states||[]).filter(row=>!beforeIds.has(row.id));
 const stateIds=added.map((row,index)=>`divine-wrath-condition:${executionId}:${actor.id}:${index}`);
 added.forEach((row,index)=>{row.id=stateIds[index];row.divineWrathExecutionId=executionId;row.divineWrathRuleId=rule.id;});
 const immunized=acquired.acquiredInstances===0&&acquired.reminders.some(message=>message.startsWith('Immunité :'));
 return {ok:true,participant:acquired.participant,preview:{ruleId:rule.id,resultId:rule.resultId,targetId:actor.id,sinAtTest,
  requested:{condition:rule.conditions[0].name==='Hémorragique'?'hemorragique':'brise',count:requested[0].level},
  projection:{acquiredCount:acquired.acquiredInstances,stateIds,immunized,reminders:clone(acquired.reminders),momentumBefore:beforeMomentum,momentumAfter:Boolean(acquired.participant.extensions?.v5?.hasMomentum)},
  needsInput:clone(acquired.needsInput||[])},acquired};
}
function subjectRows(state){
 const rows=[];const add=(row,path,kind='instance')=>{if(row&&typeof row==='object')rows.push({row,path,kind});};
 (state.combat?.participants||[]).forEach((row,index)=>add(row,`combat.participants[${index}]`));
 (state.reserve||[]).forEach((row,index)=>add(row,`reserve[${index}]`,'reserve'));
 (state.persistentCharacters||[]).forEach((row,index)=>add(row,`persistentCharacters[${index}]`,'persistent'));
 if(state.activeScene?.participants)(state.activeScene.participants||[]).forEach((row,index)=>add(row,`activeScene.participants[${index}]`));
 (state.suspendedScenes||[]).forEach((scene,sceneIndex)=>(scene?.participants||[]).forEach((row,index)=>add(row,`suspendedScenes[${sceneIndex}].participants[${index}]`)));
 return rows;
}
function hasWrathConditionOrigin(state,executionId){
 if(typeof executionId!=='string'||!executionId)return false;
 return subjectRows(state).some(({row})=>(row.states||[]).some(condition=>condition?.divineWrathExecutionId===executionId||(condition.divineWrathLocks||[]).some(lock=>lock.executionId===executionId)
  ||condition?.source?.executionId===executionId||typeof condition?.id==='string'&&condition.id.startsWith(`divine-wrath-condition:${executionId}:`)));
}
function prayerSubjectKey(state,row,kind='instance'){
 const fiche=row?.extensions?.ficheId||row?.ficheSnapshot?.charId;if(typeof fiche==='string'&&fiche)return 'fiche:'+fiche;
 if(typeof row?.persistentCharacterId==='string'&&row.persistentCharacterId)return 'persistent:'+row.persistentCharacterId;
 if(kind==='persistent'&&typeof row?.id==='string'&&row.id)return 'persistent:'+row.id;
 if(typeof row?.extensions?.v5?.resourceCharacterId==='string'&&row.extensions.v5.resourceCharacterId)return 'local:'+row.extensions.v5.resourceCharacterId;
 return 'instance:'+String(row?.id||'unknown');
}
function stableJSON(value){
 if(Array.isArray(value))return `[${value.map(stableJSON).join(',')}]`;
 if(!value||typeof value!=='object')return JSON.stringify(value);
 return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableJSON(value[key])}`).join(',')}}`;
}
function inspectPrayerCaps(state,{clock=state.extensions?.v5?.gameClock,subjectKey=null,checkClock=true}={}){
 const needsInput=[],rows=subjectRows(state),cohorts=new Map();
 for(const item of rows){
  const key=prayerSubjectKey(state,item.row,item.kind);if(subjectKey&&key!==subjectKey)continue;
  const check=validatePrayerSLCaps(item.row,{clock});
  if(!check.ok)needsInput.push(...check.needsInput.map(row=>prayerNeeds(`${item.path}.${row.path}`,row.message)));
  const caps=check.ok?check.caps:[];
  if(caps.length&&checkClock&&(!clock||!Number.isSafeInteger(clock.campaignSeconds)))needsInput.push(prayerNeeds(`${item.path}.extensions.v5.divineEffects`,'Horloge absente : l’ancre calendaire de la sanction ne peut pas être vérifiée.'));
  else if(caps.length&&checkClock&&caps.some(cap=>cap.deadline.atSeconds<=clock.campaignSeconds))needsInput.push(prayerNeeds(`${item.path}.extensions.v5.divineEffects`,'Une sanction de Prière est déjà échue au curseur actuel; résolution requise avant une nouvelle commande.'));
  if(!cohorts.has(key))cohorts.set(key,[]);
  cohorts.get(key).push({path:item.path,caps});
 }
 const groups=new Map();
 for(const [key,rowsForSubject] of cohorts){
  if(!rowsForSubject.some(item=>item.caps.length))continue;
  const encode=caps=>stableJSON(caps.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));
  const expected=encode(rowsForSubject.find(item=>item.caps.length).caps);
  for(const item of rowsForSubject)if(encode(item.caps)!==expected)
   needsInput.push(prayerNeeds(item.path,'Une sanction manque ou diverge entre les copies durables de la même identité.'));
  groups.set(key,{encoded:expected,caps:rowsForSubject.find(item=>item.caps.length).caps});
 }
 return {ok:needsInput.length===0,needsInput,groups,rows};
}
function inspectPrayerLessons(state,{subjectKey=null}={}){
 const needsInput=[],cohorts=new Map(),rows=subjectRows(state);
 for(const item of rows){
  const key=prayerSubjectKey(state,item.row,item.kind);if(subjectKey&&key!==subjectKey)continue;
  const check=getPrayerSLModifiers(item.row),lessons=check.ok?(item.row.extensions?.v5?.divineEffects||[]).filter(row=>row?.type==='prayer-sl-modifier'):[];
  if(!check.ok)needsInput.push(...check.needsInput.map(row=>prayerNeeds(`${item.path}.${row.path}`,row.message)));
  if(!cohorts.has(key))cohorts.set(key,[]);cohorts.get(key).push({path:item.path,lessons});
 }
 const groups=new Map();
 for(const [key,items] of cohorts){
  if(!items.some(item=>item.lessons.length))continue;
  const encode=lessons=>stableJSON(lessons.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))));
  const expected=encode(items.find(item=>item.lessons.length).lessons);
  for(const item of items)if(encode(item.lessons)!==expected)needsInput.push(prayerNeeds(item.path,'Une sanction « Leçons divines » manque ou diverge entre les copies durables.'));
  const lessons=items.find(item=>item.lessons.length).lessons;
  if(lessons.length>1)needsInput.push(prayerNeeds(items[0].path,'Plusieurs sanctions « Leçons divines » sont actives; cumul non défini par la source.'));
  groups.set(key,{encoded:expected,lessons});
 }
 return {ok:needsInput.length===0,needsInput,groups,rows};
}
function projectPrayerCap(state,subjectKey,cap,{operation='add',now=0}={}){
 const inspected=inspectPrayerCaps(state,{subjectKey,checkClock:false});if(!inspected.ok)return {ok:false,state:null,needsInput:inspected.needsInput};
 const rows=inspected.rows.filter(item=>prayerSubjectKey(state,item.row,item.kind)===subjectKey);
 if(!rows.length)return {ok:false,state:null,needsInput:[prayerNeeds('subjectKey','Sujet durable introuvable pour la sanction de Prière.')]};
 const next=clone(state),removed=[];
 for(const item of rows){
  const target=next;let participant;
  if(item.path.startsWith('combat.participants['))participant=target.combat.participants[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('reserve['))participant=target.reserve[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('persistentCharacters['))participant=target.persistentCharacters[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('activeScene.participants['))participant=target.activeScene.participants[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else {const match=item.path.match(/^suspendedScenes\[(\d+)\]\.participants\[(\d+)\]/);participant=match?target.suspendedScenes[Number(match[1])].participants[Number(match[2])]:null;}
  if(!participant)continue;
  participant.extensions||={};participant.extensions.v5||={};const effects=participant.extensions.v5.divineEffects||[];
  if(operation==='add'){
   if(effects.some(row=>row?.type==='prayer-sl-cap'&&row.originExecutionId===cap.originExecutionId))continue;
   participant.extensions.v5.divineEffects=[...effects,clone(cap)];
  }else{
   const keep=[];for(const row of effects){if(row?.type==='prayer-sl-cap'&&row.deadline.atSeconds<=now){removed.push({path:item.path,participantId:participant.id??null,effectId:row.id});}else keep.push(row);}
   participant.extensions.v5.divineEffects=keep;
  }
 }
 return {ok:true,state:next,removed,needsInput:[]};
}
function projectPrayerLesson(state,subjectKey,lesson,{operation='add'}={}){
 const inspected=inspectPrayerLessons(state,{subjectKey});if(!inspected.ok)return {ok:false,state:null,needsInput:inspected.needsInput};
 const rows=inspected.rows.filter(item=>prayerSubjectKey(state,item.row,item.kind)===subjectKey);
 if(!rows.length)return {ok:false,state:null,needsInput:[prayerNeeds('subjectKey','Sujet durable introuvable pour le malus de Prière.')]} ;
 const existing=inspected.groups.get(subjectKey)?.lessons||[];
 if(operation==='add'&&existing.length)return {ok:false,state:null,needsInput:[prayerNeeds('extensions.v5.divineEffects','Une sanction « Leçons divines » est déjà active; cumul à arbitrer.')]} ;
 const next=clone(state),removed=[];
 for(const item of rows){
  const target=next;let participant;
  if(item.path.startsWith('combat.participants['))participant=target.combat.participants[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('reserve['))participant=target.reserve[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('persistentCharacters['))participant=target.persistentCharacters[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else if(item.path.startsWith('activeScene.participants['))participant=target.activeScene.participants[Number(item.path.match(/\[(\d+)\]/)?.[1])];
  else {const match=item.path.match(/^suspendedScenes\[(\d+)\]\.participants\[(\d+)\]/);participant=match?target.suspendedScenes[Number(match[1])].participants[Number(match[2])]:null;}
  if(!participant)continue;
  participant.extensions||={};participant.extensions.v5||={};const effects=participant.extensions.v5.divineEffects||[];
  if(operation==='add')participant.extensions.v5.divineEffects=[...effects,clone(lesson)];
  else {participant.extensions.v5.divineEffects=effects.filter(row=>{if(row?.type==='prayer-sl-modifier'&&row.id===lesson.id){removed.push({path:item.path,participantId:participant.id??null,effectId:row.id});return false;}return true;});}
 }
 return {ok:true,state:next,removed,needsInput:[]};
}
const reducedRow=row=>row&&Object.fromEntries(['nom','portee','cible','duree','effet'].map(key=>[key,row[key]||'']));
// Bonus d'arme divin et magique visant la même arme (ou toute arme) avec un même type de bonus de dégâts : cumul à arbitrer.
const weaponBonusKeys=['damage','replaceDamageBonus','damageFormula'];
const overlappingWeaponBonus=(left,right)=>Boolean(left&&right)&&(!left.equipmentId||!right.equipmentId||left.equipmentId===right.equipmentId)&&weaponBonusKeys.some(key=>left[key]!==undefined&&right[key]!==undefined);
function unresolvedCombination(state){
 for(const target of parts(state)){
  const spells=target.extensions?.v5?.spellEffects||[],divine=target.extensions?.v5?.divineEffects||[];
  for(const layer of divine)for(const spell of spells){
   if(Object.keys(layer.statModifiers||{}).some(key=>Number(layer.statModifiers[key])&&Number(spell.statModifiers?.[key])))return 'Le cumul d’un bonus divin et magique sur la même caractéristique reste à arbitrer (DIV-05).';
   if(Object.keys(layer.testModifiers||{}).some(key=>Number(layer.testModifiers[key])&&Number(spell.testModifiers?.[key])))return 'Le cumul d’un modificateur de Test divin et magique sur la même cible de Test reste à arbitrer (DIV-05).';
   if((layer.traits||[]).some(trait=>(spell.traits||[]).includes(trait)))return 'Le cumul d’un Trait divin et magique identique reste à arbitrer (DIV-05).';
   if(overlappingWeaponBonus(layer.weaponBonus,spell.weaponBonus))return 'Le cumul d’un bonus d’arme divin et magique sur la même arme reste à arbitrer (DIV-05).';
   if(Object.keys(layer.apModifiers||{}).length && (Object.keys(spell.apModifiers||{}).length||Number(spell.apBonus)||Number(spell.armorBonus)))return 'Le cumul de PA divins et magiques reste à arbitrer (DIV-05).';
  }
 }
 return null;
}

export function validateDivineSources(contract){
 if(!contract)return 'Prière inconnue dans le registre divin.';
 const current=getReferenceCatalogue();
 const pins=registry.sourceTalentDescriptions || {};
 const requiredId=contract.requiredTalent?.id || (contract.type==='blessing'?'talent-bless':'talent-invoke');
 if(typeof pins[requiredId]!=='string')return 'La source du talent divin n’est pas épinglée : contrat à vérifier.';
 const currentTalent=current.talents.find(row=>row.id===requiredId);
 if(currentTalent?.description!==pins[requiredId])return 'La source du talent divin a changé : nouvelle validation nécessaire.';
 if(contract.catalogueEntry){
  const actual=current.magic.miracles.find(row=>row.nom===contract.catalogueEntry.nom);
  if(JSON.stringify(reducedRow(actual))!==JSON.stringify(reducedRow(contract.catalogueEntry)))return 'La description publique de cette prière a changé : contrat à vérifier.';
 }
 return null;
}


function inspectWrathRounds(state){
 const groups=new Map(),needsInput=[];
 for(const item of subjectRows(state)){
  const check=validateWrathRounds(item.row),key=prayerSubjectKey(state,item.row,item.kind);
  if(!check.ok)needsInput.push(...check.needsInput);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push({item,layers:check.layers});
 }
 for(const rows of groups.values()){
  const canonical=stableJSON(rows[0].layers.slice().sort((a,b)=>a.id.localeCompare(b.id)));
  if(rows.some(row=>stableJSON(row.layers.slice().sort((a,b)=>a.id.localeCompare(b.id)))!==canonical))needsInput.push({field:'extensions.v5.divineEffects',message:'Sanction du Courroux différente entre copies durables.'});
 }
 return {ok:!needsInput.length,groups,needsInput};
}
function projectWrathRound(state,actor,layer){
 const next=clone(state),key=prayerSubjectKey(state,actor);
 for(const item of subjectRows(next))if(prayerSubjectKey(next,item.row,item.kind)===key){item.row.extensions??={};item.row.extensions.v5??={};item.row.extensions.v5.divineEffects=[...(item.row.extensions.v5.divineEffects||[]),clone(layer)];}
 return next;
}
function prepareWrathRound(state,actor,row,input,wrath,prayer){
 const rule=wrathRoundRules[row.id],roll=input.wrathDurationRoll,need=(field,label)=>({field,label});
 const refuse=(error,field,label=error)=>({...failure('requires-input',error,[need(field,label)]),wrathTableResult:clone(row),wrathRoundPreview:{resultId:row.id,mode:rule.mode,dice:rule.dice}});
 if(!Number.isSafeInteger(roll)||roll<rule.dice||roll>10*rule.dice)return refuse('Jet de durée explicite du Courroux requis.','wrathDurationRoll',rule.dice+'d10 de durée');
 if(!['current','next'].includes(input.wrathRoundPolicy))return refuse('Choisissez explicitement le premier Round compté.','wrathRoundPolicy');
 const current=readCombatPosition(state),clock=state.extensions?.v5?.gameClock;
 let anchor;
 if(current.round>0){
  if(current.round!==clock?.combat?.round||current.sceneId!==clock?.combat?.sceneId)return refuse('Round canonique et horloge concordants requis.','wrathRoundAnchor');
  anchor={sceneId:current.sceneId??'',round:current.round};
 }else{
  anchor=input.wrathRoundAnchor;
  if(!anchor||typeof anchor.sceneId!=='string'||!anchor.sceneId.trim()||!Number.isSafeInteger(anchor.round)||anchor.round<1)return refuse('Hors combat : indiquez une scène et un Round d’ancrage explicites.','wrathRoundAnchor');
  anchor={sceneId:anchor.sceneId,round:anchor.round};
 }
 if(subjectRows(state).some(({row})=>(row.extensions?.v5?.divineEffects||[]).some(layer=>layer.originExecutionId===input.executionId)))return refuse('Cette occurrence du Courroux est déjà appliquée.','executionId');
 const rounds=roll+rule.perSin*wrath.sinAtTest,roundDeadline=anchor.round+rounds-(input.wrathRoundPolicy==='current'?1:0);
 if(!Number.isSafeInteger(roundDeadline))return refuse('Durée en Rounds non représentable.','wrathDurationRoll');
 if(rule.mode==='forced'&&(!['count-trigger','next-turn'].includes(input.wrathActionDecision)||wrathActionSpent(state,actor.id)&&input.wrathActionDecision!=='next-turn'))return refuse('Action déjà utilisée ou déclencheuse : décision MJ requise, sans Action supplémentaire.','wrathActionDecision');
 const layer={id:'wrath-round:'+input.executionId,type:'wrath-round-rule',ruleVersion:1,originExecutionId:input.executionId,subjectKey:prayerSubjectKey(state,actor),resultId:row.id,mode:rule.mode,cult:input.forcedPrayerCult||input.divinePrayerCult||null,source:clone(row.source),
  durationRoll:roll,sinAtTrigger:wrath.sinAtTest,rounds,roundPolicy:input.wrathRoundPolicy,roundAnchor:clone(anchor),roundDeadline,
  originTurnId:wrathTurnPosition(state).turnId||'',actionDecision:rule.mode==='forced'?input.wrathActionDecision:'none',
  prayerProof:{roll:prayer.roll,fumble:Boolean(prayer.fumble)},wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 if(!validateWrathRounds({...actor,extensions:{...actor.extensions,v5:{...actor.extensions?.v5,divineEffects:[layer]}}}).ok)return refuse('Preuve source du Courroux invalide.','wrathRoll');
 return {ready:true,layer,wrathRoundPreview:{resultId:row.id,mode:rule.mode,dice:rule.dice,rounds,roundAnchor:clone(anchor),roundDeadline,roundPolicy:input.wrathRoundPolicy,actionDecision:layer.actionDecision}};
}


const wrathSkillRules={'wrath:26-30':{unit:'hours',seconds:3600,multiple:true},'wrath:56-60':{unit:'days',seconds:86400,multiple:false}};
function prepareWrathSkills(state,actor,row,input,wrath){
 const rule=wrathSkillRules[row.id],ids=input.wrathSkillIds,roll=input.wrathDurationRoll,clock=state.extensions?.v5?.gameClock;
 const blocked=(error,field)=>({...failure('requires-input',error,[{field,label:error}]),wrathTableResult:clone(row),wrathSkillPreview:{resultId:row.id,unit:rule.unit,multiple:rule.multiple}});
 if(!Array.isArray(ids)||!ids.length||!rule.multiple&&ids.length!==1||ids.some(id=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length)return blocked(rule.multiple?'Choisissez au moins une compétence de cette fiche.':'Choisissez exactement une compétence de cette fiche.','wrathSkillIds');
 const skills=[];
 for(const id of ids){
  const matches=(actor.skills||[]).filter(skill=>skill.id===id),skill=matches[0],name=text(skill?.name||skill?.nom);
  if(matches.length!==1||skill.status!=='resolved'||!name||/[.$#\[\]\/]/.test(name))return blocked('Compétence inconnue, ambiguë ou non résolue : '+id,'wrathSkillIds');
  skills.push({id,name});
 }
 if(new Set(skills.map(row=>row.name.toLocaleLowerCase())).size!==skills.length)return blocked('Les compétences choisies doivent être distinctes sans homonymie ambiguë.','wrathSkillIds');
 if(!Number.isSafeInteger(roll)||roll<1||roll>10)return blocked('Saisissez le d10 explicite de durée.','wrathDurationRoll');
 const value=roll+wrath.sinAtTest,seconds=value*rule.seconds,deadline=clock?.campaignSeconds+seconds;
 if(!clock||!Number.isSafeInteger(seconds)||!Number.isSafeInteger(deadline))return blocked('Horloge et durée calendaires sûres requises.','extensions.v5.gameClock');
 if(subjectRows(state).some(({row})=>(row.extensions?.v5?.divineEffects||[]).some(layer=>layer.originExecutionId===input.executionId)))return blocked('Occurrence du Courroux déjà appliquée.','executionId');
 const layer={id:'wrath-skills:'+input.executionId,type:'wrath-skill-penalty',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),source:clone(row.source),skillIds:ids.slice(),skills,
  testModifiers:Object.fromEntries(skills.map(row=>[row.name,-1])),duration:{roll,sinAtTrigger:wrath.sinAtTest,value,unit:rule.unit,seconds},clockAnchor:{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision},deadline:{kind:'campaign-time',atSeconds:deadline},
  wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 return {ready:true,layer,wrathSkillPreview:{resultId:row.id,skills:clone(skills),unit:rule.unit,multiple:rule.multiple,value,deadline:clone(layer.deadline)}};
}
function inspectWrathCalendar(state){
 const groups=new Map(),needsInput=[];
 for(const item of subjectRows(state)){
  const key=prayerSubjectKey(state,item.row,item.kind),layers=(item.row.extensions?.v5?.divineEffects||[]).filter(row=>row.type==='wrath-skill-penalty'||row.type==='wrath-deity-rejection'||row.type==='divine-access-suspension');
  if(new Set(layers.map(row=>row.id)).size!==layers.length)needsInput.push({field:item.path+'.extensions.v5.divineEffects',message:'Occurrence calendaire du Courroux dupliquée.'});
  for(const layer of layers){
   if(layer.type==='divine-access-suspension'){const suspended=validateDivineAccessSuspensions(item.row);if(!suspended.ok)needsInput.push(...suspended.needsInput);continue;}
   if(layer.type==='wrath-deity-rejection'){const rejected=wrathDeityRejections(item.row);if(!rejected.ok)needsInput.push(...rejected.needsInput);continue;}
   const rule=wrathSkillRules[layer.resultId],row=registry.wrathTable.find(row=>row.id===layer.resultId),d=layer.duration,p=layer.wrathProof;
   if(!rule||layer.ruleVersion!==1||layer.subjectKey!==key||layer.id!=='wrath-skills:'+layer.originExecutionId||!text(layer.originExecutionId)||stableJSON(row?.source)!==stableJSON(layer.source)
    ||!Array.isArray(layer.skills)||!layer.skills.length||!rule.multiple&&layer.skills.length!==1||new Set(layer.skills.map(row=>row.id)).size!==layer.skills.length
    ||layer.skills.some(row=>!text(row.id)||!text(row.name))||stableJSON(layer.skillIds)!==stableJSON(layer.skills.map(row=>row.id))
    ||stableJSON(layer.testModifiers)!==stableJSON(Object.fromEntries(layer.skills.map(row=>[row.name,-1])))
    ||!Number.isSafeInteger(d?.roll)||d.roll<1||d.roll>10||!Number.isSafeInteger(d.sinAtTrigger)||d.sinAtTrigger<1||d.value!==d.roll+d.sinAtTrigger||d.unit!==rule.unit||d.seconds!==d.value*rule.seconds
    ||!Number.isSafeInteger(layer.clockAnchor?.campaignSeconds)||layer.clockAnchor.campaignSeconds<0||!Number.isSafeInteger(layer.clockAnchor.clockRevision)||layer.clockAnchor.clockRevision<0
    ||layer.deadline?.kind!=='campaign-time'||!Number.isSafeInteger(layer.deadline.atSeconds)||layer.deadline.atSeconds!==layer.clockAnchor.campaignSeconds+d.seconds
    ||!p||p.sinAtTest!==d.sinAtTrigger||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||p.resultId!==row.id||p.modifiedRoll!==p.roll+10*p.sinAtTest||p.modifiedRoll<row.min||p.modifiedRoll>row.max)
     needsInput.push({field:item.path+'.extensions.v5.divineEffects',message:'Malus de compétences du Courroux invalide ou non sourcé.'});
  }
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push({item,layers});
 }
 for(const rows of groups.values())if(rows.some(row=>stableJSON(row.layers)!==stableJSON(rows[0].layers)))needsInput.push({field:'extensions.v5.divineEffects',message:'Malus de compétences divergent entre copies durables.'});
 return {ok:!needsInput.length,groups,needsInput};
}
function guardWrathCalendar(before,next){
 const old=inspectWrathCalendar(before),current=inspectWrathCalendar(next);if(!old.ok||!current.ok)throw ruleError('Sanction calendaire du Courroux invalide ou divergente.');
 let attested=null;const from=before.extensions?.v5?.gameClock,to=next.extensions?.v5?.gameClock;
 for(const [key,rows]of old.groups){const candidates=current.groups.get(key);if(!candidates)continue;
  for(const layer of rows[0].layers){const kept=candidates[0].layers.find(row=>row.id===layer.id);
   if(kept){if(stableJSON(kept)!==stableJSON(layer))throw ruleError('Courroux : modification du malus de compétences refusée.');continue;}
   if(!attested){try{attested=advanceGameClock(from,JSON.parse(to.lastEvent.payloadFingerprint));}catch{} }
   if(!attested?.ok||attested.status!=='applied'||stableJSON(attested.clock)!==stableJSON(to)||layer.deadline.atSeconds>to.campaignSeconds||layer.deadline.atSeconds<=from.campaignSeconds)throw ruleError('Courroux : expiration calendaire attestée requise pour ce malus de compétences.');
  }
 }
 for(const [key,rows]of current.groups)for(const layer of rows[0].layers){
  if((old.groups.get(key)?.[0].layers||[]).some(row=>row.id===layer.id))continue;
  const encoded=issuedPreviews.get(layer.originExecutionId),issued=encoded&&JSON.parse(encoded),authentic=issued?.input?.wrathAccessLayer||issued?.input?.wrathSkillLayer||issued?.input?.wrathAlliesPlan?.layers.find(row=>row.id===layer.id)||issued?.receipt?.wrathDetails?.layers?.find(row=>row.id===layer.id)||issued?.receipt?.wrathDetails;
  if(!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(layer))throw ruleError('Courroux : malus de compétences sans aperçu attesté.');
 }
}


function prepareWrathAllies(state,actor,row,input,wrath,cult){
 const proposedIds=parts(state).filter(target=>target.zone==='active'&&target.id!==actor.id&&normalizeCamp(target.camp,target.kind)===normalizeCamp(actor.camp,actor.kind)).map(target=>target.id);
 const preview={resultId:row.id,proposedIds,selectedIds:Array.isArray(input.wrathAllyIds)?clone(input.wrathAllyIds):[],cult};
 const blocked=(error,field)=>({...failure('requires-input',error,[{field,label:error}]),wrathTableResult:clone(row),wrathAlliesPreview:preview});
 const ids=input.wrathAllyIds,roll=input.wrathDurationRoll,clock=state.extensions?.v5?.gameClock;
 if(input.wrathAlliesConfirmed!==true||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id))return blocked('Confirmez explicitement la liste d’alliés, y compris si elle est vide.','wrathAllyIds');
 const targets=ids.map(id=>parts(state).find(target=>target.id===id&&target.zone==='active'));
 if(targets.some(target=>!target))return blocked('Une cible confirmée a disparu ou n’est plus active.','wrathAllyIds');
 if(new Set(targets.map(target=>prayerSubjectKey(state,target))).size!==targets.length)return blocked('Un même sujet durable ne peut être confirmé deux fois.','wrathAllyIds');
 if(!Number.isSafeInteger(roll)||roll<1||roll>10)return blocked('Saisissez le d10 explicite de durée.','wrathDurationRoll');
 const value=roll+wrath.sinAtTest,seconds=value*86400,deadline=clock?.campaignSeconds+seconds;
 if(!text(cult)||!clock||!Number.isSafeInteger(deadline)||!Number.isSafeInteger(seconds))return blocked('Culte source, horloge et échéance représentables requis.','wrathDurationRoll');
 if(subjectRows(state).some(({row})=>(row.extensions?.v5?.divineEffects||[]).some(layer=>layer.originExecutionId===input.executionId)))return blocked('Occurrence de Courroux déjà appliquée.','executionId');
 const layers=targets.map(target=>{const subjectKey=prayerSubjectKey(state,target);return {id:'wrath-rejection:'+input.executionId+':'+subjectKey,type:'wrath-deity-rejection',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey,cult,source:clone(row.source),
  duration:{roll,sinAtTrigger:wrath.sinAtTest,value,unit:'days',seconds},clockAnchor:{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision},deadline:{kind:'campaign-time',atSeconds:deadline},wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};});
 const plan={...preview,targets:targets.map(target=>({id:target.id,name:target.name,subjectKey:prayerSubjectKey(state,target)})),layers,value,deadline:{kind:'campaign-time',atSeconds:deadline}};
 return {ready:true,plan,wrathAlliesPreview:clone(plan)};
}
function projectWrathAllies(state,plan,executionId){
 let next=clone(state);const conditions=[];
 for(const target of plan.targets){
  const index=parts(next).findIndex(row=>row.id===target.id&&row.zone==='active');if(index<0)return {ok:false,error:'Une cible confirmée n’est plus active.',needsInput:[{field:'wrathAllyIds',label:'Liste à recalculer'}]};
  const before=parts(next)[index],ids=new Set((before.states||[]).map(row=>row.id));
  const acquired=acquireV5Conditions(before,[{name:'À Terre',source:{kind:'divine-wrath',executionId,resultId:'wrath:41-45'}}],{authorId:target.id,targetId:target.id,round:state.combat?.round});
  if(!acquired.ready)return {ok:false,error:'Acquisition À Terre à préciser.',needsInput:acquired.needsInput};
  for(const state of acquired.participant.states)if(!ids.has(state.id))state.id='wrath-allies-prone:'+executionId+':'+target.id;
  next.combat.participants[index]=acquired.participant;
  const layer=plan.layers.find(row=>row.subjectKey===target.subjectKey);next=projectWrathRound(next,acquired.participant,layer);
  conditions.push({targetId:target.id,acquired:acquired.acquiredInstances,proneStateIds:acquired.participant.states.filter(row=>row.key==='a-terre').map(row=>row.id),reminders:clone(acquired.reminders)});
 }
 return {ok:true,state:next,preview:{...clone(plan),conditions}};
}


// Registre de pénitences dans l'adaptateur déjà précaché (B-C04).
const rejectionAuthority=new Map();
const foldCult=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const rejectionTalentIds=new Set(registry.contracts.flatMap(row=>[row.requiredTalent?.id,row.requiredTalent?.catalogueTalentId]).filter(Boolean));
const talentOfCult=(row,cult)=>rejectionTalentIds.has(row.id)&&['talent-bless','talent-invoke'].some(id=>row.id===id||registry.contracts.some(c=>c.requiredTalent?.id===id&&c.requiredTalent.catalogueTalentId===row.id))&&foldCult(row.specialization||row.specialty)===foldCult(cult);
function prepareWrathRejection(state,actor,row,input,wrath,cult){const permanent=row.id==='wrath:146-150',blocked=(error,field)=>({...failure('requires-input',error,[{field,label:error}]),wrathTableResult:clone(row),wrathRejectionPreview:{cult,permanent}}),checked=readDivineRejections(actor);if(!checked.ok)return blocked('Rejets divins de la fiche à vérifier.','actor.extensions.v5.divineRejections');if(checked.records.some(record=>foldCult(record.cult)===foldCult(cult)&&(record.kind==='permanent'||!permanent&&record.stage<2)))return blocked('Un rejet du même culte est déjà actif : articulation des occurrences à arbitrer.','divineRejections');
 const record={id:'wrath-rejection:'+input.executionId,ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),cult,source:clone(row.source),kind:permanent?'permanent':'temporary',stage:0,penanceIds:[],wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 if(permanent){if(input.wrathRejectionConfirmed!==true)return blocked('Confirmez la perte définitive des talents du culte et de toutes les avances Prière.','wrathRejectionConfirmed');const skills=(actor.skills||[]).filter(skill=>skill.status==='resolved'&&(['priere','pray'].includes(foldCult(skill.name))||skill.id==='skill-50_72_69_e8_72_65-base'));if(skills.length!==1)return blocked('Une unique compétence Prière résolue doit être identifiée sur la fiche.','actor.skills');const skill=skills[0],advances=input.wrathPrayAdvances;if(!text(skill.id))return blocked('Identifiant stable de la compétence Prière requis avant sa modification.','actor.skills');if(!Number.isSafeInteger(advances)||advances<0||skill.advances!==undefined&&skill.advances!==advances||!Number.isSafeInteger(skill.total)||skill.total<advances)return blocked('Confirmez les avances Prière connues et un total cohérent ; aucun zéro n’est supposé.','wrathPrayAdvances');if((actor.talents||[]).some(t=>rejectionTalentIds.has(t.id)&&!text(t.specialization||t.specialty)))return blocked('Culte des talents d’accès ambigu : préciser leurs spécialisations avant le retrait.','actor.talents');for(const item of subjectRows(state))if(prayerSubjectKey(state,item.row,item.kind)===prayerSubjectKey(state,actor)&&stableJSON({talents:item.row.talents,skills:item.row.skills})!==stableJSON({talents:actor.talents,skills:actor.skills}))return blocked('Talents ou avances divergents entre copies du personnage.','actor.skills');record.lossConfirmedBy='MJ';record.removedTalents=clone((actor.talents||[]).filter(t=>talentOfCult(t,cult)));record.prayLoss={skillId:skill.id,advances,scoreBefore:skill.total,scoreAfter:skill.total-advances};}
 return {ready:true,record,wrathRejectionPreview:{cult,permanent,prayLoss:clone(record.prayLoss||null)}};
}
function projectRejection(state,actor,record,{applyLoss=false}={}){const next=clone(state),key=prayerSubjectKey(state,actor);for(const item of subjectRows(next))if(prayerSubjectKey(next,item.row,item.kind)===key){item.row.extensions??={};item.row.extensions.v5??={};item.row.extensions.v5.divineRejections=[...(item.row.extensions.v5.divineRejections||[]).filter(row=>row.id!==record.id),clone(record)];if(applyLoss&&record.kind==='permanent'){item.row.talents=(item.row.talents||[]).filter(row=>!talentOfCult(row,record.cult));item.row.skills=(item.row.skills||[]).map(row=>row.id===record.prayLoss.skillId?{...row,advances:0,total:record.prayLoss.scoreAfter}:row);}}return next;}
function progressRejectionsForPenance(state,actor,penance,authorityState=state){let next=state;const progress=[];for(const old of actor.extensions?.v5?.divineRejections||[])if(old.kind==='temporary'&&old.stage<2&&foldCult(old.cult)===foldCult(penance.cult)){const record={...clone(old),stage:old.stage+1,penanceIds:[...(old.penanceIds||[]),penance.id]};next=projectRejection(next,actor,record);rejectionAuthority.set(record.id,{revision:authorityState.localRevision,fingerprint:stateFingerprint(authorityState),record:clone(record)});progress.push({recordId:record.id,stage:record.stage});}return {state:next,progress};}
function guardRejections(before,next){const inspect=state=>{const all=new Map(),groups=new Map();for(const item of subjectRows(state)){const checked=readDivineRejections(item.row);if(!checked.ok)throw ruleError('Rejet divin invalide, sujet ou source à vérifier.');const key=prayerSubjectKey(state,item.row,item.kind);if(groups.has(key)&&stableJSON(groups.get(key))!==stableJSON(checked.records))throw ruleError('Rejets divins divergents entre copies.');groups.set(key,checked.records);for(const record of checked.records)all.set(record.id,{record,item});}return all;};const old=inspect(before),current=inspect(next);for(const[id,{record,item}]of old)if(!current.has(id)&&subjectRows(next).some(row=>row.row.id===item.row.id||prayerSubjectKey(next,row.row,row.kind)===record.subjectKey))throw ruleError('Effacement du rejet sans pénitence refusé.');for(const[id,{record}]of current){if(stableJSON(old.get(id)?.record)===stableJSON(record))continue;const approved=rejectionAuthority.get(id);if(approved?.revision===before.localRevision&&approved.fingerprint===stateFingerprint(before)&&stableJSON(approved.record)===stableJSON(record))continue;const encoded=issuedPreviews.get(record.originExecutionId),issued=encoded&&JSON.parse(encoded),authentic=issued?.input?.wrathRejection||issued?.receipt?.wrathDetails?.rejection;if(old.has(id)||!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(record))throw ruleError('Rejet divin sans aperçu ou pénitence attestés.');}}

function validPersistentSubject(state,actor,kind,key){const fiche=actor.extensions?.ficheId||actor.ficheSnapshot?.charId;return new Set([prayerSubjectKey(state,actor,kind),'instance:'+actor.id,'persistent:'+actor.id,...(actor.profileId?['profile:'+actor.profileId]:[]),...(actor.persistentCharacterId?['persistent:'+actor.persistentCharacterId]:[]),...(actor.extensions?.v5?.resourceCharacterId?['local:'+actor.extensions.v5.resourceCharacterId]:[]),...(fiche?['fiche:'+fiche]:[])]).has(key);}
const dailyBleedingAuthority=new Map(),morningApprovals=new Map();
const dailyBleedingOf=actor=>{const rows=actor?.extensions?.v5?.divineDailyBleeding??[];if(!Array.isArray(rows))throw ruleError('Récurrence Hémorragique invalide.');return rows;};
function projectDailyBleeding(state,actor,record){const next=clone(state),key=prayerSubjectKey(state,actor);for(const item of subjectRows(next))if(prayerSubjectKey(next,item.row,item.kind)===key){item.row.extensions??={};item.row.extensions.v5??={};item.row.extensions.v5.divineDailyBleeding=[...dailyBleedingOf(item.row).filter(row=>row.id!==record.id),clone(record)];}return next;}
function attestDailyBleeding(state,record){dailyBleedingAuthority.set(record.id,{revision:state.localRevision,fingerprint:stateFingerprint(state),record:clone(record)});if(dailyBleedingAuthority.size>200)dailyBleedingAuthority.delete(dailyBleedingAuthority.keys().next().value);}
function prepareWrathDailyBleeding(state,actor,row,input,wrath,cult){const clock=state.extensions?.v5?.gameClock,at=input.wrathFirstMorningAt,blocked=error=>({...failure('requires-input',error,[{field:'wrathFirstMorningAt',label:'Premier matin connu en secondes de campagne, futur et représentable'}]),wrathTableResult:clone(row),wrathDailyBleedingPreview:{cult,quantity:1+wrath.sinAtTest}});
 if(!clock||!Number.isSafeInteger(at)||at<=clock.campaignSeconds||!Number.isSafeInteger(at+86400))return blocked('Le MJ doit renseigner le prochain matin réel : aucune heure implicite n’est choisie.');
 const record={id:'wrath-daily:'+input.executionId,type:'wrath-daily-bleeding',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),cult,source:clone(row.source),quantity:1+wrath.sinAtTest,sinAtTrigger:wrath.sinAtTest,clockAnchor:{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision},firstMorningAt:at,nextMorningAt:at,processedMornings:0,morningReceipts:[],status:'active',wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 return {ready:true,record,wrathDailyBleedingPreview:{cult,quantity:record.quantity,nextMorningAt:at}};
}
function inspectDailyBleeding(state){const result=new Map(),groups=new Map();for(const item of subjectRows(state)){const rows=dailyBleedingOf(item.row),key=prayerSubjectKey(state,item.row,item.kind);if(new Set(rows.map(row=>row.id)).size!==rows.length)throw ruleError('Récurrence Hémorragique dupliquée.');if(groups.has(key)&&stableJSON(groups.get(key))!==stableJSON(rows))throw ruleError('Récurrence Hémorragique divergente entre copies.');groups.set(key,rows);
 for(const record of rows){const source=registry.wrathTable.find(row=>row.id==='wrath:131-135'),p=record.wrathProof,receipts=record.morningReceipts||[];if(record.id!=='wrath-daily:'+record.originExecutionId||record.type!=='wrath-daily-bleeding'||!validPersistentSubject(state,item.row,item.kind,record.subjectKey)||record.ruleVersion!==1||record.resultId!==source.id||stableJSON(record.source)!==stableJSON(source.source)||!text(record.cult)||!text(record.subjectKey)||!Number.isSafeInteger(record.sinAtTrigger)||record.sinAtTrigger<1||record.quantity!==1+record.sinAtTrigger||!Number.isSafeInteger(record.clockAnchor?.campaignSeconds)||record.clockAnchor.campaignSeconds<0||!Number.isSafeInteger(record.clockAnchor.clockRevision)||record.clockAnchor.clockRevision<0||!Number.isSafeInteger(record.firstMorningAt)||record.firstMorningAt<=record.clockAnchor.campaignSeconds||!Number.isSafeInteger(record.nextMorningAt)||!Number.isSafeInteger(record.processedMornings)||record.processedMornings<0||record.nextMorningAt!==record.firstMorningAt+86400*record.processedMornings||!['active','completed'].includes(record.status)||!Array.isArray(receipts)||receipts.length>300||receipts.some(row=>!text(row.clockEventId)||!Number.isSafeInteger(row.at)||row.quantity!==record.quantity||(row.at-record.firstMorningAt)%86400!==0)||record.processedMornings>0&&receipts.at(-1)?.at!==record.nextMorningAt-86400||!p||p.resultId!==source.id||p.sinAtTest!==record.sinAtTrigger||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||p.modifiedRoll!==p.roll+10*p.sinAtTest||p.modifiedRoll<131||p.modifiedRoll>135)throw ruleError('Récurrence Hémorragique non sourcée ou curseur de matin invalide.');
 if(record.status==='completed'){const penance=penancesOf(item.row).find(row=>row.id===record.completedByPenanceId);if(penance?.status!=='completed'||penance.cult!==record.cult||!penance.stoppedDailyBleedingIds?.includes(record.id))throw ruleError('Arrêt de récurrence sans pénitence accomplie.');}result.set(record.id,{record,item});}}
 return result;
}
export function getWrathMorningAdvanceSummary(state,{seconds}={}){const from=state.extensions?.v5?.gameClock?.campaignSeconds,to=from+seconds;if(!Number.isSafeInteger(seconds)||seconds<1||!Number.isSafeInteger(to))return {mornings:0,requiresConfirmation:false,subjects:[]};const subjects=[];for(const{record,item}of inspectDailyBleeding(state).values()){if(record.status!=='active'||record.nextMorningAt>to)continue;const count=1+Math.floor((to-record.nextMorningAt)/86400);subjects.push({actorId:item.row.id,name:item.row.name,recordId:record.id,count,quantity:record.quantity});}return {mornings:subjects.reduce((n,row)=>n+row.count,0),requiresConfirmation:subjects.some(row=>row.count>1),subjects};}
export function authorizeWrathMorningAdvance(state,{seconds,reason,eventId,clockBaseRevision,confirmedAll}={}){if(confirmedAll!==true)throw ruleError('Confirmez tous les matins franchis.');const clock=state.extensions?.v5?.gameClock,event={id:eventId,baseRevision:clockBaseRevision,kind:'campaign-time-advance',seconds,reason},advanced=advanceGameClock(clock,event);if(!advanced.ok||advanced.status!=='applied')throw ruleError('Avance de matin périmée ou invalide.');const summary=getWrathMorningAdvanceSummary(state,{seconds});if(summary.subjects.some(row=>row.count*row.quantity>500))throw ruleError('Trop de matins en une transaction : avancer par intervalles plus courts.');morningApprovals.set(eventId,{revision:state.localRevision,fingerprint:stateFingerprint(state),payload:stableJSON(event)});if(morningApprovals.size>200)morningApprovals.delete(morningApprovals.keys().next().value);return summary;}
function progressWrathMornings(before,candidate){const old=inspectDailyBleeding(before),from=before.extensions?.v5?.gameClock,to=candidate.extensions?.v5?.gameClock;if(!from||!to||to.campaignSeconds===from.campaignSeconds)return candidate;const due=[...old.values()].filter(({record})=>record.status==='active'&&record.nextMorningAt<=to.campaignSeconds);if(!due.length)return candidate;
 let event,attested;try{event=JSON.parse(to.lastEvent.payloadFingerprint);attested=advanceGameClock(from,event);}catch{}if(!attested?.ok||attested.status!=='applied'||stableJSON(attested.clock)!==stableJSON(to))throw ruleError('Matin : reçu canonique d’avance du temps requis.');
 let next=clone(candidate);for(const{record:oldRecord,item}of due){if(oldRecord.nextMorningAt<=from.campaignSeconds)throw ruleError('Un matin antérieur est resté sans traitement : arbitrage requis.');const count=1+Math.floor((to.campaignSeconds-oldRecord.nextMorningAt)/86400),approval=morningApprovals.get(event.id);if(count>1&&(approval?.revision!==before.localRevision||approval.fingerprint!==stateFingerprint(before)||approval.payload!==stableJSON(event)))throw ruleError('Plusieurs matins franchis : confirmer explicitement leur traitement dans Temps de campagne.');if(count*oldRecord.quantity>500||!Number.isSafeInteger(oldRecord.nextMorningAt+count*86400))throw ruleError('Trop de matins ou échéance non représentable : avancer par intervalles plus courts.');
 const record=clone(oldRecord),key=prayerSubjectKey(before,item.row,item.kind),receipts=[];for(let n=0;n<count;n++){const at=record.nextMorningAt+n*86400;receipts.push({at,quantity:record.quantity,clockEventId:event.id});for(const target of subjectRows(next))if(prayerSubjectKey(next,target.row,target.kind)===key){const ids=new Set((target.row.states||[]).map(row=>row.id)),acquired=acquireV5Conditions(target.row,[{name:'Hémorragique',level:record.quantity,source:{kind:'divine-wrath',executionId:record.originExecutionId,resultId:record.resultId,morningAt:at}}],{authorId:target.row.id,targetId:target.row.id,round:next.combat?.round});if(!acquired.ready)throw ruleError('Acquisition Hémorragique du matin à préciser.');let index=0;for(const condition of acquired.participant.states)if(!ids.has(condition.id))condition.id=record.id+':morning:'+at+':'+index++;Object.assign(target.row,acquired.participant);}}
 record.processedMornings+=count;record.nextMorningAt+=count*86400;record.morningReceipts=[...(record.morningReceipts||[]),...receipts].slice(-300);const target=subjectRows(next).find(row=>prayerSubjectKey(next,row.row,row.kind)===key);if(!target)continue;next=projectDailyBleeding(next,target.row,record);attestDailyBleeding(before,record);next.log=[{id:record.id+':morning:'+record.processedMornings,kind:'effect',actorId:target.row.id,text:'Courroux : '+count+' matin(s), '+record.quantity+' Hémorragique par matin',detail:{source:clone(record.source),receipts:clone(receipts)}},...(next.log||[])].slice(0,300);
 }return next;
}
function finishDailyBleedingForPenance(state,actor,penance,authorityState=state){let next=state;const ids=[];for(const record of dailyBleedingOf(actor))if(record.status==='active'&&record.cult===penance.cult){const completed={...clone(record),status:'completed',completedByPenanceId:penance.id};next=projectDailyBleeding(next,actor,completed);attestDailyBleeding(authorityState,completed);ids.push(record.id);}return {state:next,ids};}
function guardDailyBleeding(before,next){const old=inspectDailyBleeding(before),current=inspectDailyBleeding(next);for(const[id,{record,item}]of old)if(!current.has(id)&&subjectRows(next).some(row=>row.row.id===item.row.id||prayerSubjectKey(next,row.row,row.kind)===record.subjectKey))throw ruleError('Effacement de récurrence Hémorragique refusé.');for(const[id,{record}]of current){if(stableJSON(old.get(id)?.record)===stableJSON(record))continue;const attested=dailyBleedingAuthority.get(id);if(attested?.revision===before.localRevision&&attested.fingerprint===stateFingerprint(before)&&stableJSON(attested.record)===stableJSON(record))continue;const encoded=issuedPreviews.get(record.originExecutionId),issued=encoded&&JSON.parse(encoded),authentic=issued?.input?.wrathDailyBleeding||issued?.receipt?.wrathDetails?.dailyBleeding;if(old.has(id)||!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(record))throw ruleError('Récurrence Hémorragique sans aperçu, matin ou pénitence attestés.');}}

const confiscationAuthority=new Map(),armourKeys=['head','body','rightArm','leftArm','rightLeg','leftLeg'];
const confiscationsOf=actor=>{const rows=actor?.extensions?.v5?.divineConfiscations??[];if(!Array.isArray(rows))throw ruleError('Registre de confiscations invalide.');return rows;};
const inventoryFingerprint=actor=>stableJSON({equipment:actor.equipment||[],actions:actor.actions||[],armor:actor.armor||{},armorLocations:actor.armorLocations||{}});
function inventoryCopy(actor,{equipment,actions,retainedArmor}){const base=calculateArmor(equipment);for(const key of armourKeys)base[key]+=(retainedArmor[key]||0);const next=rebaseMagicLayers({...clone(actor),equipment:clone(equipment),actions:actions.map(normalizeAction),armorLocations:clone(base)},{armor:base});next.armorLocations=clone(base);return next;}
function projectConfiscation(state,actor,record,{restore=false}={}){const next=clone(state),key=prayerSubjectKey(state,actor);for(const item of subjectRows(next))if(prayerSubjectKey(next,item.row,item.kind)===key){const existing=confiscationsOf(item.row),selected=restore?(record.items||[]).filter(row=>row.status==='returned'):[],equipment=selected.flatMap(row=>row.equipment?[clone(row.equipment)]:[]),actions=[...(record.unaffectedActions||[]),...selected.flatMap(row=>row.actions||[])];const changed=inventoryCopy(item.row,{equipment,actions,retainedArmor:record.retainedArmor});changed.extensions??={};changed.extensions.v5??={};changed.extensions.v5.divineConfiscations=[...existing.filter(row=>row.id!==record.id),clone(record)];Object.assign(item.row,changed);}return next;}
function prepareWrathConfiscation(state,actor,row,input,wrath,cult){
 const choices=spellObjectChoices(actor),ids=choices.map(row=>row.id),selected=input.wrathMagicalItemIds,retained=input.wrathRetainedArmor;
 const blocked=(error,field)=>({...failure('requires-input',error,[{field,label:error}]),wrathTableResult:clone(row),wrathConfiscationPreview:{choices:clone(choices),cult}});
 if(input.wrathInventoryConfirmed!==true)return blocked('Confirmez que les possessions identifiées représentent l’inventaire à retirer.','wrathInventoryConfirmed');
 if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(id=>!ids.includes(id)))return blocked('Identifiez explicitement les objets magiques, y compris une sélection vide confirmée.','wrathMagicalItemIds');
 if(!retained||armourKeys.some(key=>!Number.isSafeInteger(retained[key])||retained[key]<0)||Object.keys(retained).some(key=>!armourKeys.includes(key)))return blocked('Saisissez les six PA physiques conservés sans possession ; ne supposez pas une armure intrinsèque nulle.','wrathRetainedArmor');
 if(new Set(ids).size!==ids.length||!Array.isArray(actor.equipment)||actor.equipment.some(item=>!text(item.id)))return blocked('Inventaire canonique et identifiants uniques requis.','actor.equipment');
 if(confiscationsOf(actor).some(record=>(record.items||[]).some(item=>item.magical&&item.status==='held')))return blocked('Une confiscation contient encore des objets magiques retenus : faire préciser leur articulation avant une nouvelle occurrence.','divineConfiscations');
 for(const item of subjectRows(state))if(prayerSubjectKey(state,item.row,item.kind)===prayerSubjectKey(state,actor)&&inventoryFingerprint(item.row)!==inventoryFingerprint(actor))return blocked('Inventaires divergents entre projections du personnage.','actor.equipment');
 const actions=actor.actions||[],belongs=(action,id)=>(action.extensions?.fiche?.equipmentId||action.id)===id&&['attack','attaque'].includes(action.type),items=choices.map(choice=>{const equipment=actor.equipment.find(item=>item.id===choice.id);return {itemId:choice.id,label:choice.label,magical:selected.includes(choice.id),status:'held',...(equipment?{equipment:clone(equipment)}:{}),actions:clone(actions.filter(action=>belongs(action,choice.id)))};});
 const unaffectedActions=clone(actions.filter(action=>!ids.some(id=>belongs(action,id)))),record={id:'wrath-confiscation:'+input.executionId,type:'wrath-confiscation',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),cult,source:clone(row.source),items,unaffectedActions,retainedArmor:clone(retained),wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 record.expectedInventory=inventoryFingerprint(inventoryCopy(actor,{equipment:[],actions:unaffectedActions,retainedArmor:retained}));return {ready:true,record,wrathConfiscationPreview:{choices:clone(choices),cult,magicalItemIds:clone(selected),count:items.length}};
}
function restituteForPenance(state,actor,penance,input){
 const cohorts=confiscationsOf(actor),eligible=cohorts.filter(row=>row.cult===penance.cult).flatMap(record=>(record.items||[]).filter(item=>item.magical&&item.status==='held').map(item=>({record,item})));
 if(!eligible.length){if(input.restoreItemId||input.confiscationId)throw ruleError('Aucun objet magique encore retenu pour cette pénitence.');return {state};}
 if(!text(input.restoreItemId)||!text(input.confiscationId))throw ruleError('Sélectionnez exactement un objet magique retenu à rendre.');
 const selected=eligible.find(row=>row.record.id===input.confiscationId&&row.item.itemId===input.restoreItemId);if(!selected)throw ruleError('Objet inconnu, non magique ou déjà rendu ; choisir un objet encore retenu.');
 const record=clone(selected.record);if(inventoryFingerprint(actor)!==record.expectedInventory)throw ruleError('L’inventaire a changé depuis la confiscation ou la dernière restitution : arbitrage MJ requis.');
 const item=(record.items||[]).find(row=>row.itemId===selected.item.itemId);item.status='returned';item.returnedByPenanceId=penance.id;
 let next=projectConfiscation(state,actor,record,{restore:true}),updated=penanceSubject(next,actor.id);record.expectedInventory=inventoryFingerprint(updated);next=projectConfiscation(next,updated,record,{restore:true});
 confiscationAuthority.set(record.id,{revision:state.localRevision,fingerprint:stateFingerprint(state),record:clone(record)});return {state:next,restitution:{confiscationId:record.id,itemId:item.itemId}};
}
function guardConfiscations(before,next){
 const inspect=state=>{const all=new Map(),groups=new Map();for(const item of subjectRows(state)){const rows=confiscationsOf(item.row),key=prayerSubjectKey(state,item.row,item.kind);if(new Set(rows.map(row=>row.id)).size!==rows.length)throw ruleError('Confiscation dupliquée.');if(groups.has(key)&&stableJSON(groups.get(key))!==stableJSON(rows))throw ruleError('Confiscations divergentes entre copies.');groups.set(key,rows);for(const record of rows){const source=registry.wrathTable.find(row=>row.id==='wrath:111-115'),p=record.wrathProof;if(record.id!=='wrath-confiscation:'+record.originExecutionId||record.type!=='wrath-confiscation'||!validPersistentSubject(state,item.row,item.kind,record.subjectKey)||record.ruleVersion!==1||record.resultId!==source.id||stableJSON(record.source)!==stableJSON(source.source)||!text(record.cult)||!text(record.subjectKey)||!text(record.expectedInventory)||!Array.isArray(record.items||[])||new Set((record.items||[]).map(row=>row.itemId)).size!==(record.items||[]).length||!Array.isArray(record.unaffectedActions||[])||armourKeys.some(key=>!Number.isSafeInteger(record.retainedArmor?.[key])||record.retainedArmor[key]<0)||!p||p.resultId!==source.id||!Number.isSafeInteger(p.sinAtTest)||p.sinAtTest<1||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||p.modifiedRoll!==p.roll+10*p.sinAtTest||p.modifiedRoll<111||p.modifiedRoll>115)throw ruleError('Confiscation invalide ou non sourcée.');for(const held of record.items||[]){if(!text(held.itemId)||typeof held.magical!=='boolean'||!['held','returned'].includes(held.status)||!Array.isArray(held.actions||[])||held.equipment&&held.equipment.id!==held.itemId||held.status==='returned'&&(!held.magical||!text(held.returnedByPenanceId)))throw ruleError('Snapshot de possession invalide.');if(held.status==='returned'){const completed=penancesOf(item.row).find(p=>p.id===held.returnedByPenanceId);if(completed?.status!=='completed'||completed.restitution?.confiscationId!==record.id||completed.restitution?.itemId!==held.itemId)throw ruleError('Restitution sans sa pénitence accomplie.');}if(held.status==='held'&&((item.row.equipment||[]).some(row=>row.id===held.itemId)||(item.row.actions||[]).some(row=>(row.extensions?.fiche?.equipmentId||row.id)===held.itemId)))throw ruleError('Objet encore retenu réinjecté dans l’inventaire.');}all.set(record.id,{record,item});}}return all;};
 const old=inspect(before),current=inspect(next);for(const[id,{record,item}]of old)if(!current.has(id)&&subjectRows(next).some(row=>row.row.id===item.row.id||prayerSubjectKey(next,row.row,row.kind)===record.subjectKey))throw ruleError('Effacement de confiscation refusé.');
 for(const[id,{record}]of current){if(stableJSON(old.get(id)?.record)===stableJSON(record))continue;const attested=confiscationAuthority.get(id);if(attested?.revision===before.localRevision&&attested.fingerprint===stateFingerprint(before)&&stableJSON(attested.record)===stableJSON(record))continue;const encoded=issuedPreviews.get(record.originExecutionId),issued=encoded&&JSON.parse(encoded),authentic=issued?.input?.wrathConfiscation||issued?.receipt?.wrathDetails?.confiscation;if(old.has(id)||!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(record))throw ruleError('Confiscation sans aperçu ou restitution MJ attestés.');}
}

const penanceAuthority=new Map();
const penanceSource=(book,page)=>book==='L06'?{...clone(registry.wrathTable[0].source),printedPage:page,section:'Pénitences'}:{document:{L19:'WFRP-Middenheim-City-of-the-White-Wolf_18.01.2021.pdf',L21:'WFRP_Empire_in_Ruins_Companion.pdf',L25:'WFRP_Sea_Of_Claws_221021.pdf'}[book],fileSha256:{L19:'3038d48bd4314e8e95f25fbf7cd1660b82321950f623ab33478666a944e063fb',L21:'6df76acdd7f0b3fd1cb8af756bef086a6a46432f7a8c1c8cebd1f86e14701edd',L25:'60f5b8856c94c3969e56b4747522bbb78030f5a067a5265a744c48cd8148b4dc'}[book],edition:'V4 adaptée au socle V5',sourceStatus:'read-and-page-checked',printedPage:page,section:'Pénitences'};
const penanceExamples=[
 ['manann-voyage','Manann','L06',205,'Accomplir une traversée maritime périlleuse choisie par le MJ.'],
 ['morr-sepulture','Morr','L06',206,'Restaurer une sépulture abandonnée au service de Morr.'],
 ['myrmidia-defense','Myrmidia','L06',207,'Former les villageois et organiser leur défense.'],
 ['ranald-oppression','Ranald','L06',208,'Humilier un oppresseur des pauvres sans mission automatique.'],
 ['rhya-grove','Rhya','L06',209,'Replanter un lieu dévasté et protéger les familles.'],
 ['shallya-soins','Shallya','L06',210,'Soigner les habitants d’un village éprouvé par la maladie.'],
 ['sigmar-communaute','Sigmar','L06',211,'Rebâtir une communauté pour renforcer son unité.'],
 ['taal-bosquet','Taal','L06',212,'Entretenir un bosquet sacré et affronter les difficultés de la nature.'],
 ['ulric-courage','Ulric','L06',213,'Vaincre une menace désignée lors d’une épreuve de courage.'],
 ['verena-savoir','Verena','L06',214,'Retrouver un ouvrage oublié ou résoudre un différend.'],
 ['ulric-chapelle','Ulric','L19',112,'Inciter les habitants du Middenpalaz à fréquenter leur chapelle délaissée.'],
 ['sigmar-rocher','Sigmar','L21',6,'Effectuer un pèlerinage au sanctuaire du Rocher brillant.'],
 ['ulric-rocher','Ulric','L21',6,'Effectuer un pèlerinage au sanctuaire du Rocher brillant.'],
 ['stromfels-epreuve','Stromfels','L25',89,'Traverser à la nage des eaux dangereuses lors d’une épreuve confirmée par le MJ.']
].map(([id,cult,book,page,text])=>({id,cult,text,source:penanceSource(book,page)}));
export const getDivinePenanceExamples=()=>clone(penanceExamples);
const penancesOf=actor=>{const rows=actor?.extensions?.v5?.divinePenances??[];if(!Array.isArray(rows))throw ruleError('Registre de pénitences invalide.');return rows;};
function penanceSubject(state,id){return subjectRows(state).find(item=>item.row.id===id)?.row;}
function validPenance(record){
 const source=record?.origin?.kind==='wrath'?registry.wrathTable.find(row=>row.id===record.origin.resultId)?.source:record?.exampleId?penanceExamples.find(row=>row.id===record.exampleId&&row.cult===record.cult)?.source:penanceSource('L06',219);
 return text(record?.id)&&text(record.subjectKey)&&text(record.cult)&&text(record.text)&&record.text.length<=1000&&record.createdBy==='MJ'&&Number.isSafeInteger(record.createdRevision)&&record.createdRevision>=0&&['open','completed'].includes(record.status)&&source&&stableJSON(source)===stableJSON(record.source)
  &&(record.origin?.kind==='wrath'?record.origin.resultId==='wrath:96-100'&&text(record.origin.executionId):record.origin?.kind==='gm'&&text(record.origin.reason))
  &&(record.status==='open'?!Object.hasOwn(record,'completedBy')&&!Object.hasOwn(record,'completedRevision')&&!Object.hasOwn(record,'completedReason'):record.completedBy==='MJ'&&text(record.completedReason)&&Number.isSafeInteger(record.completedBaseRevision)&&record.completedBaseRevision>=0&&record.completedRevision===record.completedBaseRevision+1);
}
function projectPenance(state,actor,record){const next=clone(state),key=prayerSubjectKey(state,actor);for(const item of subjectRows(next))if(prayerSubjectKey(next,item.row,item.kind)===key){item.row.extensions??={};item.row.extensions.v5??={};const rows=penancesOf(item.row).filter(row=>row.id!==record.id);item.row.extensions.v5.divinePenances=[...rows,clone(record)];}return next;}
function attestPenance(state,record){penanceAuthority.set(record.id+':'+record.status,{revision:state.localRevision,fingerprint:stateFingerprint(state),record:clone(record)});if(penanceAuthority.size>200)penanceAuthority.delete(penanceAuthority.keys().next().value);}
export function createStoreDivinePenance(state,actorId,input={}){
 if(input.baseRevision!==undefined&&input.baseRevision!==state.localRevision)throw ruleError('La partie a changé : relisez les pénitences.');
 const actor=penanceSubject(state,actorId);if(!actor)throw ruleError('Fiche de pénitence introuvable.');
 if(Object.hasOwn(input,'source')||!text(input.text)||input.text.length>1000||!text(input.reason)||!text(input.cult)||!entries().some(row=>row.deity===input.cult))throw ruleError('Texte, culte connu et motif MJ requis ; la source est canonique.');
 const example=input.exampleId?penanceExamples.find(row=>row.id===input.exampleId&&row.cult===input.cult):null;if(input.exampleId&&!example)throw ruleError('Exemple de pénitence inconnu pour ce culte.');
 const record={id:'penance:'+uid(),subjectKey:prayerSubjectKey(state,actor),cult:input.cult,text:input.text.trim(),source:example?clone(example.source):penanceSource('L06',219),...(example?{exampleId:example.id}:{}),status:'open',createdBy:'MJ',createdRevision:state.localRevision,origin:{kind:'gm',reason:input.reason.trim()}};
 const next=projectPenance(state,actor,record);attestPenance(state,record);next.log=[{id:record.id+':create',kind:'management',actorId,text:'Pénitence en cours : '+record.text,detail:clone(record)},...(next.log||[])].slice(0,300);return {ok:true,status:'created',record:clone(record),state:next};
}
export function completeStoreDivinePenance(state,actorId,id,input={}){
 const actor=penanceSubject(state,actorId),old=penancesOf(actor).find(row=>row.id===id);if(!actor||!old)throw ruleError('Pénitence introuvable.');if(!validPenance(old))throw ruleError('Pénitence source invalide.');if(old.status==='completed'){if(input.restoreItemId&&old.restitution?.itemId!==input.restoreItemId||input.confiscationId&&old.restitution?.confiscationId!==input.confiscationId)throw ruleError('Pénitence déjà accomplie : restitution différente refusée.');return {ok:true,status:'duplicate',record:clone(old),state};}
 if(input.baseRevision!==undefined&&input.baseRevision!==state.localRevision)throw ruleError('La partie a changé : relisez les pénitences.');if(!text(input.reason))throw ruleError('Motif MJ de clôture requis.');
 const record={...clone(old),status:'completed',completedBy:'MJ',completedBaseRevision:state.localRevision,completedRevision:state.localRevision+1,completedReason:input.reason.trim()},restored=restituteForPenance(state,actor,record,input);if(restored.restitution)record.restitution=restored.restitution;const stopped=finishDailyBleedingForPenance(restored.state,penanceSubject(restored.state,actorId),record,state);if(stopped.ids.length)record.stoppedDailyBleedingIds=stopped.ids;const recovered=progressRejectionsForPenance(stopped.state,penanceSubject(stopped.state,actorId),record,state);if(recovered.progress.length)record.divineRejectionProgress=recovered.progress;const next=projectPenance(recovered.state,penanceSubject(recovered.state,actorId),record);attestPenance(state,record);next.log=[{id:id+':complete',kind:'management',actorId,text:'Pénitence accomplie : '+record.text,detail:clone(record)},...(next.log||[])].slice(0,300);return {ok:true,status:'completed',record:clone(record),state:next};
}
function prepareWrathPenance(state,actor,row,input,cult){
 const preview={cult,source:clone(row.source)};if(!text(input.wrathPenanceText)||input.wrathPenanceText.length>1000)return {...failure('requires-input','Le MJ doit définir la pénitence à suivre.',[{field:'wrathPenanceText',label:'Texte de la pénitence imposée'}]),wrathTableResult:clone(row),wrathPenancePreview:preview};
 const record={id:'wrath-penance:'+input.executionId,subjectKey:prayerSubjectKey(state,actor),cult,text:input.wrathPenanceText.trim(),source:clone(row.source),status:'open',createdBy:'MJ',createdRevision:state.localRevision,origin:{kind:'wrath',executionId:input.executionId,resultId:row.id}};
 return {ready:true,record,wrathPenancePreview:{...preview,text:record.text}};
}
function guardPenances(before,next){
 const inspect=state=>{const result=new Map(),groups=new Map();for(const item of subjectRows(state)){const rows=penancesOf(item.row),key=prayerSubjectKey(state,item.row,item.kind);if(new Set(rows.map(row=>row.id)).size!==rows.length||rows.some(row=>!validPenance(row)||!validPersistentSubject(state,item.row,item.kind,row.subjectKey)))throw ruleError('Registre de pénitences invalide ou non sourcé.');if(groups.has(key)&&stableJSON(groups.get(key))!==stableJSON(rows))throw ruleError('Pénitences divergentes entre copies.');groups.set(key,rows);for(const record of rows){if(result.has(record.id)&&stableJSON(result.get(record.id))!==stableJSON(record))throw ruleError('Pénitence divergente.');result.set(record.id,record);}}return result;};
 const old=inspect(before),current=inspect(next);for(const[id,record]of old){const present=current.get(id);if(!present&&subjectRows(next).some(item=>prayerSubjectKey(next,item.row,item.kind)===record.subjectKey||subjectRows(before).some(prior=>prior.row.id===item.row.id&&penancesOf(prior.row).some(row=>row.id===id))))throw ruleError('Effacement de pénitence refusé.');}
 for(const[id,record]of current){if(stableJSON(old.get(id))===stableJSON(record))continue;const attested=penanceAuthority.get(id+':'+record.status);if(attested?.revision===before.localRevision&&attested.fingerprint===stateFingerprint(before)&&stableJSON(attested.record)===stableJSON(record))continue;
 const issued=record.origin.kind==='wrath'&&issuedPreviews.get(record.origin.executionId),preview=issued&&JSON.parse(issued),authentic=preview?.input?.wrathPenance||preview?.receipt?.wrathDetails?.record;if(old.has(id)||!preview?.ready||preview.baseRevision!==before.localRevision||preview.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(record))throw ruleError('Mutation de pénitence sans commande MJ attestée.');}
}

// B14 : apparition du Courroux (démon 88, Serviteur 141-145) à partir du plan figé du MJ.
function prepareWrathSummon(state,actor,row,input,wrath){
 const planned=planWrathSummon(row,input,{participants:parts(state),actorId:actor.id,executionId:input.executionId,wrath});
 if(!planned.ready)return {...failure('requires-input','Apparition du Courroux à confirmer par le MJ : '+planned.needs.map(item=>item.label).join(' ; ')+'.',planned.needs),wrathTableResult:clone(row),wrathSummonPreview:{kind:WRATH_SUMMON_RULES[row.id].kind,dice:WRATH_SUMMON_RULES[row.id].dice}};
 const plan=planned.plan;
 return {ready:true,plan,wrathSummonPreview:{kind:plan.kind,name:plan.profile.name,wounds:plan.profile.wounds,distanceYards:plan.distanceYards,position:plan.position,camp:plan.camp,targetId:plan.targetId||null,behavior:plan.behavior||null}};
}
function projectWrathSummon(state,plan){
 const next=clone(state),target=plan.targetId?parts(next).find(row=>row.id===plan.targetId):null;
 next.combat.participants=[...parts(next),wrathSummonParticipant(plan,target?.name)];
 return next;
}
function prepareWrathFortune(state,actor,row,input,wrath){
 const layer={id:'wrath-fortune:'+input.executionId,type:'wrath-fortune-refresh',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),source:clone(row.source),limit:1,wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 return {ready:true,layer,wrathFortunePreview:{limit:1,source:clone(row.source)}};
}
function guardWrathFortune(before,next){
 const inspect=state=>{const groups=new Map();for(const item of subjectRows(state)){const layers=(item.row.extensions?.v5?.divineEffects||[]).filter(row=>row.type==='wrath-fortune-refresh'),key=prayerSubjectKey(state,item.row,item.kind);if(new Set(layers.map(row=>row.id)).size!==layers.length)throw ruleError('Courroux Chance dupliqué.');for(const layer of layers){const source=registry.wrathTable.find(row=>row.id==='wrath:121-125'),p=layer.wrathProof;if(layer.ruleVersion!==1||!validPersistentSubject(state,item.row,item.kind,layer.subjectKey)||layer.id!=='wrath-fortune:'+layer.originExecutionId||!text(layer.originExecutionId)||layer.resultId!==source.id||layer.limit!==1||stableJSON(layer.source)!==stableJSON(source.source)||!text(layer.subjectKey)||!p||!Number.isSafeInteger(p.sinAtTest)||p.sinAtTest<1||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||p.modifiedRoll!==p.roll+10*p.sinAtTest||p.modifiedRoll<121||p.modifiedRoll>125||p.resultId!==source.id)throw ruleError('Courroux Chance non sourcé.');}if(groups.has(key)&&stableJSON(groups.get(key).layers)!==stableJSON(layers))throw ruleError('Courroux Chance divergent entre copies.');groups.set(key,{layers,item});}return groups;};
 const old=inspect(before),current=inspect(next);
 for(const[key,{layers,item}]of old){const kept=current.get(key)||[...current.values()].find(row=>row.item.row.id===item.row.id);if(!kept)continue;const removed=layers.filter(layer=>!kept.layers.some(row=>row.id===layer.id));if(removed.length){const receipt=(next.extensions?.v5?.fortuneRefreshReceipts||[]).find(row=>row.actorId===item.row.id&&removed.every(layer=>row.markerIds?.includes(layer.id))&&!(before.extensions?.v5?.fortuneRefreshReceipts||[]).some(old=>old.eventId===row.eventId));if(!receipt)throw ruleError('Courroux : renouvellement de Chance attesté requis.');const expected=refreshV5Fortune(before,item.row,receipt.normalAmount,{reason:receipt.reason,eventId:receipt.eventId});if(stableJSON(expected.extensions.v5.fortuneRefreshReceipts)!==stableJSON(next.extensions.v5.fortuneRefreshReceipts)||getV5Fortune(expected,item.row).permanent!==getV5Fortune(next,kept.item.row).permanent)throw ruleError('Courroux : renouvellement de Chance divergent.');}
 for(const layer of layers){const other=kept.layers.find(row=>row.id===layer.id);if(other&&stableJSON(other)!==stableJSON(layer))throw ruleError('Courroux : marqueur de Chance modifié.');}}
 for(const[key,{layers}]of current)for(const layer of layers){if([...old.values()].some(group=>group.layers.some(row=>row.id===layer.id)))continue;const encoded=issuedPreviews.get(layer.originExecutionId),issued=encoded&&JSON.parse(encoded),authentic=issued?.input?.wrathFortuneLayer||issued?.receipt?.wrathDetails;if(!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(layer))throw ruleError('Courroux Chance sans aperçu attesté.');}
}
function prepareWrathAccess(state,actor,row,input,wrath,cult){
 const rule=wrathAccessRules[row.id],roll=input.wrathDurationRoll,clock=state.extensions?.v5?.gameClock;
 const blocked=(error,field)=>({...failure('requires-input',error,[{field,label:error}]),wrathTableResult:clone(row),wrathAccessPreview:{resultId:row.id,cult,dice:rule.dice}});
 if(!Number.isSafeInteger(roll)||roll<rule.dice||roll>10*rule.dice)return blocked('Saisissez le jet explicite de durée ('+rule.dice+'d10).','wrathDurationRoll');
 const value=roll+wrath.sinAtTest,seconds=value*86400,deadline=clock?.campaignSeconds+seconds;
 if(!text(cult)||!clock||!Number.isSafeInteger(seconds)||!Number.isSafeInteger(deadline))return blocked('Culte, horloge et durée représentables requis.','wrathDurationRoll');
 if(subjectRows(state).some(({row})=>(row.extensions?.v5?.divineEffects||[]).some(layer=>layer.originExecutionId===input.executionId)))return blocked('Occurrence de Courroux déjà appliquée.','executionId');
 const layer={id:'wrath-access:'+input.executionId,type:'divine-access-suspension',ruleVersion:1,originExecutionId:input.executionId,resultId:row.id,subjectKey:prayerSubjectKey(state,actor),cult,source:clone(row.source),suspendedTalentIds:['talent-bless','talent-invoke'],
  duration:{roll,sinAtTrigger:wrath.sinAtTest,value,unit:'days',seconds},clockAnchor:{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision},deadline:{kind:'campaign-time',atSeconds:deadline},wrathProof:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:row.id}};
 return {ready:true,layer,wrathAccessPreview:{resultId:row.id,cult,dice:rule.dice,value,deadline:clone(layer.deadline),suspendedTalentIds:clone(layer.suspendedTalentIds)}};
}

function context(state,contract,input){
 const participants=parts(state),actorId=input.actorId || state.combat?.currentActorId;
 const actor=participants.find(row=>row.id===actorId);
 if(!actor || actor.zone!=='active')return failure('blocked','Le personnage priant doit être présent en jeu.');
 if(!Array.isArray(input.targetIds || []))return failure('invalid','Liste de cibles invalide.');
 const ids=input.targetIds || [];
 if(new Set(ids).size!==ids.length)return failure('invalid','Une cible ne peut pas être sélectionnée deux fois.');
 const targets=ids.map(id=>participants.find(row=>row.id===id && row.zone==='active'));
 if(targets.some(row=>!row))return failure('invalid','Une cible sélectionnée n’est plus en jeu.');
 const skillCheck=inspectWrathCalendar(state);if(!skillCheck.ok)return failure('requires-input','Malus de compétences à vérifier.',skillCheck.needsInput);
 const roundCheck=inspectWrathRounds(state);if(!roundCheck.ok)return failure('requires-input','Sanctions du Courroux à vérifier.',roundCheck.needsInput);
 const ban=wrathPrayerBan(actor);if(ban)return ban;
 const forced=wrathForcedPrayerGate(state,actor.id,{prayer:true});if(forced)return forced;
 const pending=(state.extensions?.v5?.divineExecutions || []).some(row=>row.actorId===actor.id && row.pendingWrath?.status==='pending');
 if(pending)return failure('blocked','Un Courroux divin doit être résolu avant une nouvelle prière.');
 if(actor.extensions?.v5?.specialStates?.cannotSpeak || (actor.states||[]).some(row=>['inconscient','surpris'].includes(row.key)))return failure('blocked','Le personnage ne peut pas prononcer cette prière dans son état actuel.');
 const combatRound=Number.isSafeInteger(state.combat?.round)&&state.combat.round>0?state.combat.round:0;
 return {actor,targets,input:{...clone(input),participants:clone(participants),actorId,targetIds:ids.slice(),round:Number(state.combat.round)||1,turn:Number(state.extensions?.v5?.turnIndex)||1,
  prayerSLContext:{sceneId:state.activeScene?.status==='active'?state.activeScene.id:null,round:combatRound}}};
}

/** Aperçu intégral : le calcul d'application pur vérifie aussi les préconditions qui précèdent le commit. */
export function resolveStoreDivineAccess(state,actorId,contractId){
 const actor=parts(state).find(row=>row.id===actorId&&row.zone==='active'),contract=getDivineContract(contractId);
 if(!actor)return {allowed:false,mode:'denied',grantId:null,reason:'Acteur de prière absent de la rencontre.',needsInput:[]};
 const sourceError=validateDivineSources(contract);if(!contract||contract.status==='blocked'||sourceError)return {allowed:false,mode:'denied',grantId:null,reason:sourceError||'La source de cette prière est bloquée.',needsInput:[]};
 return resolveDivineAccess(divineAccessState(state),{actor,subjectKey:divineSubjectKey(state,actor),contract,activeScene:state.activeScene});
}export function getStoreDivineAccessGrants(state,actorId=null){
 const actor=actorId?parts(state).find(row=>row.id===actorId):null;
 const subjectKey=actor?divineSubjectKey(state,actor):null;
 const activeScene=state.activeScene?.status==='active'?state.activeScene:null;
 return clone((divineAccessState(state).grants||[]).filter(row=>!actorId||row.actorId===actorId||(
  subjectKey&&row.subjectKey===subjectKey&&(['durable','once'].includes(row.scope)||row.scope==='scene'&&activeScene?.id===row.sceneId))));
}
export function createStoreDivineAccessGrant(state,actorId,contractId,{scope,reason,baseRevision}={}){
 if(!Number.isSafeInteger(baseRevision)||baseRevision!==state.localRevision)return {ok:false,error:'La partie a changé : recalculez la décision d’accès.',code:'DIVINE_ACCESS_STALE'};
 const contract=getDivineContract(contractId),sourceError=validateDivineSources(contract);
 if(!contract||contract.status==='blocked'||sourceError)return {ok:false,error:sourceError||'Une source bloquée ne peut pas recevoir de dérogation.',code:'DIVINE_ACCESS_SOURCE_BLOCKED'};
 const actor=storeActor(state,actorId);if(!actor)return {ok:false,error:'Choisissez un acteur présent et actif dans la rencontre.',code:'DIVINE_ACCESS_ACTOR'};
 const scene=state.activeScene?.status==='active'&&text(state.activeScene.id)?state.activeScene:null;
 if(scope==='scene'&&!scene)return {ok:false,error:'Aucune scène active ne peut recevoir cette dérogation.',code:'DIVINE_ACCESS_SCENE'};
 let subjectKey=v5ResourceIdentity(state,actor);
 if(!subjectKey&&actor.extensions?.v5?.divineSubjectId)subjectKey='divine-local:'+actor.extensions.v5.divineSubjectId;
 const next=clone(state);const liveActor=parts(next).find(row=>row.id===actorId);
 if(!subjectKey){
  const localId=uid();liveActor.extensions??={};liveActor.extensions.v5??={};liveActor.extensions.v5.divineSubjectId=localId;subjectKey='divine-local:'+localId;
  const sceneActor=next.activeScene?.participants?.find(row=>row.id===actorId);if(sceneActor){sceneActor.extensions??={};sceneActor.extensions.v5??={};sceneActor.extensions.v5.divineSubjectId=localId;}
 }
 const rootV5=next.extensions?.v5||{};const current=rootV5.divineAccess||emptyDivineAccess();
 const transition=createDivineAccessGrant(current,{actorId,subjectKey,contract,scope,sceneId:scope==='scene'?scene.id:null,reason,revision:baseRevision,id:'divine-access:'+uid(),commandId:'decision:'+uid()});
 if(!transition.ok)return transition;
 next.extensions??={};next.extensions.v5={...rootV5,divineAccess:transition.state};
 next.log=[{id:uid(),kind:'management',actorId,actorName:actor.name,text:`Dérogation divine ${scope} accordée à ${contract.name} · ${text(reason)||''}`,detail:{kind:'divine-access',grantId:transition.grant.id,decisionId:'DIV-02',reason:text(reason)}},...(next.log||[])].slice(0,300);
 return {...transition,state:next};
}
export function revokeStoreDivineAccessGrant(state,grantId,{reason,baseRevision}={}){
 if(!Number.isSafeInteger(baseRevision)||baseRevision!==state.localRevision)return {ok:false,error:'La partie a changé : recalculez la révocation.',code:'DIVINE_ACCESS_STALE'};
 const rootV5=state.extensions?.v5||{},current=rootV5.divineAccess||emptyDivineAccess();
 const transition=revokeDivineAccessGrant(current,{grantId,reason,revision:baseRevision,commandId:'revocation:'+uid()});
 if(!transition.ok)return transition;
 const next=clone(state);next.extensions??={};next.extensions.v5={...(next.extensions.v5||{}),divineAccess:transition.state};
 next.log=[{id:uid(),kind:'management',text:`Dérogation divine révoquée · ${transition.grant.prayerId} · ${text(reason)||''}`,detail:{kind:'divine-access-revocation',grantId,decisionId:'DIV-02',reason:text(reason)}},...(next.log||[])].slice(0,300);
 return {...transition,state:next};
}
export function previewStoreDivine(state,contractId,input={}){
 const contract=getDivineContract(contractId),sourceError=validateDivineSources(contract);
 if(sourceError)return failure('blocked',sourceError);
 const ctx=context(state,contract,input);if(!ctx.actor)return ctx;
 // Chance temporaire : une première invocation est libre ; ensuite, pas de réinvocation tant que le total de Chance (permanente et temporaire) n'est pas retombé à 0.
 if((contract.effects||[]).some(effect=>effect.type==='temporary-fortune')&&(state.extensions?.v5?.divineExecutions||[]).some(row=>row.contractId===contractId&&row.actorId===ctx.actor.id)){const fortune=getV5Fortune(state,ctx.actor);if((fortune.balance??fortune.temporary)>0)return failure('blocked','Ce miracle ne peut pas être réinvoqué tant que le prêtre a encore des points de Chance.',[{field:'fortune',label:'Chance revenue à 0'}]);}
 const subjectKey=divineSubjectKey(state,ctx.actor);
 const clock=state.extensions?.v5?.gameClock||null,capSubject=prayerSubjectKey(state,ctx.actor);
 const roundAnchor={sceneId:state.activeScene?.status==='active'?state.activeScene.id:null,round:state.combat?.round};
 const capCheck=inspectPrayerCaps(state,{clock,subjectKey:capSubject});
 if(!capCheck.ok)return failure('requires-input','La sanction calendaire de Prière doit être vérifiée avant ce Test.',capCheck.needsInput);
 const lessonsCheck=inspectPrayerLessons(state,{subjectKey:capSubject});
 if(!lessonsCheck.ok)return failure('requires-input','Le malus de Prière du Courroux doit être vérifié avant ce Test.',lessonsCheck.needsInput);
 const modifierCheck=getPrayerSLModifiers(ctx.actor,ctx.input.prayerSLContext);
 if(!modifierCheck.ok)return failure('requires-input','Le malus de Prière du Courroux doit être vérifié avant ce Test.',modifierCheck.needsInput);
 const access=resolveDivineAccess(divineAccessState(state),{actor:ctx.actor,subjectKey,contract,activeScene:state.activeScene});
 if(!access.allowed)return failure(access.code==='DIVINE_DATA_REQUIRED'?'requires-input':'blocked',access.reason,access.needsInput||[]);
 const captured={...ctx.input,sourceFingerprint:registry.sourceFingerprint,participants:clone(parts(state)),executionId:input.executionId || 'divine:'+uid(),divineAccessState:clone(divineAccessState(state)),divineSubjectKey:subjectKey,divineActiveScene:clone(state.activeScene||null),divineAccessDecision:clone(access),clockAnchor:clock?{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision,lastEventId:clock.lastEvent?.id??null}:null,prayerRoundAnchor:clone(roundAnchor)};
 delete captured.wrathDamageRuleId;
 delete captured.wrathStateRuleId;
 delete captured.wrathRoundLayer;
 delete captured.wrathRejection;delete captured.wrathDailyBleeding;delete captured.wrathConfiscation;delete captured.wrathPenance;delete captured.wrathAccessLayer;delete captured.wrathFortuneLayer;
 delete captured.wrathAlliesPlan;delete captured.wrathSummonPlan;
 delete captured.wrathSkillLayer;
 delete captured.wrathSkillPreview;
 delete captured.wrathRoundPreview;
 captured.divinePrayerCult=contract.deity;
 delete captured.forcedPrayerCult;
 let preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
 let wrathTableResult=null;
 if(preview.preview?.wrath?.triggered && Number.isSafeInteger(captured.wrathRoll) && captured.wrathRoll>=1 && captured.wrathRoll<=100){
  const modified=captured.wrathRoll+10*preview.preview.wrath.sinAtTest;
  wrathTableResult=clone((registry.wrathTable||[]).find(row=>modified>=row.min&&(row.max===null||modified<=row.max))||null);
  if(wrathTableResult?.id==='wrath:6-10'){
   const rule=(registry.prayerSLRules||[]).find(row=>row.id==='wrath:6-10:pray-sl-cap');
   if(!rule||!captured.clockAnchor||!Number.isSafeInteger(captured.clockAnchor.campaignSeconds+rule.sourceReceipt.duration.seconds))return failure('requires-input','La règle calendaire, l’horloge ou son futur curseur manque pour résoudre le Courroux 6–10.',[prayerNeeds('extensions.v5.gameClock','Horloge et fin des huit jours représentables en secondes entières sûres requises.')]);
   captured.wrathConsequences='Sanction automatique : les Tests de Prière réussis sont plafonnés à +0 DR jusqu’à huit jours de jeu après la résolution.';
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,consequences:captured.wrathConsequences,resolvedBy:'source-contract',ruleId:rule.id,sourceReceipt:clone(rule.sourceReceipt)};
   captured.wrathSanctionRuleId=rule.id;
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(['wrath:61-65','wrath:89-95'].includes(wrathTableResult?.id)){
   const rule=wrathConditionRule(wrathTableResult.id);
   if(!rule||rule.type!=='condition-acquisition'||rule.ruleVersion!==1||rule.sourceReceipt?.ruleId!==rule.id)
    return failure('requires-input','La règle source d’acquisition des États du Courroux est absente ou invalide.',[prayerNeeds('wrathConditionRules','Contrat généré source-validé requis.')]);
   if(hasWrathConditionOrigin(state,captured.executionId))return failure('blocked','Cet identifiant d’exécution est déjà porté par un État de Courroux encore présent; utilisez un nouvel identifiant.',[prayerNeeds('executionId','Identifiant unique pour éviter la collision avec un État déjà acquis.')]);
   captured.wrathConditionRuleId=rule.id;
   captured.wrathConditionRequest={sinAtTest:preview.preview.wrath.sinAtTest,sourceReceipt:clone(rule.sourceReceipt)};
   captured.wrathConsequences=`Acquisition automatique de ${rule.conditions[0].base+rule.conditions[0].perSin*preview.preview.wrath.sinAtTest} état(s) ${rule.conditions[0].name} sur le prêtre; le nombre utilise les Péchés avant décrément.`;
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(rule.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,consequences:captured.wrathConsequences,resolvedBy:'source-contract',ruleId:rule.id,sourceReceipt:clone(rule.sourceReceipt)};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:11-15'){
   const rule=(registry.prayerSLRules||[]).find(row=>row.id==='wrath:11-15:pray-sl-modifier');
   if(!rule)return failure('requires-input','Le contrat source de Leçons divines est absent.',[prayerNeeds('prayerSLRules','Règle Courroux 11–15 générée requise.')]);
   if(!Number.isSafeInteger(roundAnchor.round)||roundAnchor.round<1||Number.isSafeInteger(roundAnchor.round)&&roundAnchor.round!==clock?.combat?.round
    ||roundAnchor.sceneId!==(clock?.combat?.sceneId??null))return failure('requires-input','Un Round de combat réel et concordant est requis pour poser ce malus en Rounds.',[prayerNeeds('combat.round','Round et scène courants attestés requis; hors combat, le malus ne peut pas être daté automatiquement.')]);
   if(!Number.isSafeInteger(captured.wrathDurationRoll)||captured.wrathDurationRoll<1||captured.wrathDurationRoll>10){
    const blocked=failure('requires-input','Saisissez le d10 explicite de durée de Leçons divines.',[prayerNeeds('wrathDurationRoll','Résultat d10 entier compris entre 1 et 10 requis.')]);
    // Keep the already-resolved prayer and table row available to the form so
    // it can request the missing die. This is preview data only, never a commit.
    blocked.preview=clone(preview.preview);blocked.wrathTableResult=clone(wrathTableResult);
    return blocked;
   }
   if(lessonsCheck.groups.get(capSubject)?.lessons?.length)return failure('requires-input','Une seconde occurrence de Leçons divines est déjà active; cumul ou remplacement à arbitrer, aucune mutation effectuée.',[prayerNeeds('extensions.v5.divineEffects','Résoudre le cumul de deux sanctions avant cette commande.')]);
   const rounds=captured.wrathDurationRoll+preview.preview.wrath.sinAtTest,expiryRound=roundAnchor.round+rounds-1;
   if(!Number.isSafeInteger(rounds)||!Number.isSafeInteger(expiryRound))return failure('requires-input','La durée de Leçons divines dépasse la plage de Rounds représentable.',[prayerNeeds('wrathDurationRoll','Durée sûre requise.')]);
   captured.wrathLessonDuration={roll:captured.wrathDurationRoll,sinAtTrigger:preview.preview.wrath.sinAtTest,rounds,expiryRound};
   captured.wrathConsequences=`Malus automatique de −1 DR aux futurs Tests de Prière jusqu’à la fin du ${rounds}e Round compté depuis le Round courant inclus.`;
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,consequences:captured.wrathConsequences,resolvedBy:'source-contract',ruleId:rule.id,sourceReceipt:clone(rule.sourceReceipt)};
   captured.wrathLessonRuleId=rule.id;
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(['wrath:136-140','wrath:146-150'].includes(wrathTableResult?.id)){
   const planned=prepareWrathRejection(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id},contract.deity);if(!planned.ready)return {...planned,preview:clone(preview.preview),input:{...captured,wrathResult:{resultId:wrathTableResult.id,source:clone(wrathTableResult.source)}}};captured.wrathRejection=planned.record;captured.wrathConsequences=planned.record.kind==='permanent'?'Rejet définitif : talents du culte et avances Prière retirés après confirmation MJ.':'Excommunication : Béni puis Invocation rendus par deux nouvelles pénitences ; sanction sociale source.';captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':rejection'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:131-135'){
   const planned=prepareWrathDailyBleeding(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id},contract.deity);if(!planned.ready)return {...planned,preview:clone(preview.preview)};captured.wrathDailyBleeding=planned.record;captured.wrathConsequences='Hémorragique chaque matin connu jusqu’à pénitence accomplie.';captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':daily'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:111-115'){
   const planned=prepareWrathConfiscation(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id},contract.deity);if(!planned.ready)return {...planned,preview:clone(preview.preview)};captured.wrathConfiscation=planned.record;captured.wrathConsequences='Possessions retirées ; chaque pénitence accomplie pourra rendre un seul objet magique choisi.';captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':confiscation'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:96-100'){
   const planned=prepareWrathPenance(state,ctx.actor,wrathTableResult,captured,contract.deity);if(!planned.ready)return {...planned,preview:clone(preview.preview),input:{...captured,wrathResult:{resultId:wrathTableResult.id,source:clone(wrathTableResult.source)}}};captured.wrathPenance=planned.record;captured.wrathConsequences='Pénitence enregistrée sur la fiche : '+planned.record.text;captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':penance'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(WRATH_SUMMON_RULES[wrathTableResult?.id]){
   const planned=prepareWrathSummon(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id});if(!planned.ready)return {...planned,preview:clone(preview.preview)};captured.wrathSummonPlan=planned.plan;captured.wrathConsequences=(planned.plan.kind==='demon'?'Un démon inférieur apparaît et attaque la cible désignée : ':'Un Serviteur divin apparaît : ')+planned.plan.profile.name+'.';captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':summon'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:121-125'){
   const planned=prepareWrathFortune(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id});captured.wrathFortuneLayer=planned.layer;captured.wrathConsequences='Le prochain renouvellement normal de Chance donnera un point ; le solde actuel et les points temporaires sont conservés.';captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':fortune'};preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathAccessRules[wrathTableResult?.id]){
   const planned=prepareWrathAccess(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id},contract.deity);
   if(!planned.ready)return {...planned,preview:clone(preview.preview)};
   captured.wrathAccessLayer=planned.layer;captured.wrathConsequences='Suspension temporaire de Béni et Invocation du culte, sans perte des acquisitions.';
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':access'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult?.id==='wrath:41-45'){
   const planned=prepareWrathAllies(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id},contract.deity);
   if(!planned.ready)return {...planned,preview:clone(preview.preview)};
   captured.wrathAlliesPlan=planned.plan;captured.wrathConsequences='Alliés confirmés : À Terre et rejet calendaire des prières du culte.';
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':allies'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathSkillRules[wrathTableResult?.id]){
   const planned=prepareWrathSkills(state,ctx.actor,wrathTableResult,captured,{...preview.preview.wrath,resultId:wrathTableResult.id});
   if(!planned.ready)return {...planned,preview:clone(preview.preview)};
   captured.wrathSkillLayer=planned.layer;captured.wrathSkillPreview=planned.wrathSkillPreview;
   captured.wrathConsequences='Malus automatique de compétences sélectionnées par le MJ.';
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':skills'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathRoundRules[wrathTableResult?.id]){
   const wrath=preview.preview.wrath,planned=prepareWrathRound(state,ctx.actor,wrathTableResult,captured,{...wrath,resultId:wrathTableResult.id},preview.preview.prayer);
   if(!planned.ready)return {...planned,preview:clone(preview.preview)};
   captured.wrathRoundLayer=planned.layer;captured.wrathRoundPreview=planned.wrathRoundPreview;
   captured.wrathConsequences='Sanction sourcée en Rounds : '+planned.layer.mode;
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,resolvedBy:'source-contract',consequences:captured.wrathConsequences,ruleId:wrathTableResult.id+':rounds'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathStateRule(wrathTableResult?.id)){
   const rule=wrathStateRule(wrathTableResult.id);
   if(hasWrathConditionOrigin(state,captured.executionId))return failure('blocked','Identifiant déjà porté par un État du Courroux.',[{field:'executionId',label:'Nouvel identifiant requis'}]);
   captured.wrathStateRuleId=rule.id;
   captured.wrathConsequences='États canoniques et récupération source, application automatique sur le prêtre.';
   captured.wrathResult={resultId:rule.resultId,source:clone(rule.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,resolvedBy:'source-contract',ruleId:rule.id,consequences:captured.wrathConsequences,sourceReceipt:clone(rule.sourceReceipt)};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathDamageRule(wrathTableResult?.id)){
   const rule=wrathDamageRule(wrathTableResult.id);
   if(hasWrathConditionOrigin(state,captured.executionId))return failure('blocked','Cet identifiant d’exécution est déjà porté par un État de Courroux encore présent; utilisez un nouvel identifiant.',[prayerNeeds('executionId','Identifiant unique pour éviter la collision avec un État déjà acquis.')]);
   captured.wrathDamageRuleId=rule.id;
   captured.wrathConsequences='Blessures directes et Résistance seront résolues selon la règle structurée de la table.';
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(rule.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,
    consequences:captured.wrathConsequences,resolvedBy:'source-contract',ruleId:rule.id,sourceReceipt:clone(rule.sourceReceipt)};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }else if(wrathTableResult && typeof captured.wrathConsequences==='string' && captured.wrathConsequences.trim()){
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,
    consequences:captured.wrathConsequences.trim(),resolvedBy:'MJ'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }
 }
 let calculated=preview.ready?applyDivineExecution(state,contract,captured):preview;
 if(calculated.ready){const conflict=unresolvedCombination(calculated.state);if(conflict)calculated=failure('blocked',conflict);}
 let wrathConditionPreview=null,wrathDamagePreview=null,wrathStatePreview=null;
 if(calculated.ready&&captured.wrathStateRuleId){
  const projected=projectWrathStates(parts(calculated.state).find(row=>row.id===ctx.actor.id),wrathStateRule(wrathTableResult.id),captured.executionId,state.combat?.round,contract.deity);
  if(!projected.ok)calculated=failure('requires-input',projected.error,projected.needsInput);else wrathStatePreview=projected.preview;
 }
 if(calculated.ready&&captured.wrathDamageRuleId){
  const rule=wrathDamageRule(wrathTableResult?.id),postActor=parts(calculated.state).find(row=>row.id===ctx.actor.id);
  const projection=projectWrathDamage(postActor,rule,captured,captured.executionId,calculated.preview.wrath.sinAtTest,state.combat?.round);
  wrathDamagePreview=projection.preview;
  if(!projection.ok)calculated=failure('requires-input',projection.error,projection.needsInput);
 }
 if(calculated.ready&&captured.wrathConditionRuleId){
  const rule=wrathConditionRule(wrathTableResult?.id),postPrayerActor=parts(calculated.state).find(row=>row.id===ctx.actor.id);
  const projection=projectWrathConditions(postPrayerActor,rule,captured.executionId,calculated.preview.wrath.sinAtTest);
  if(!projection.ok)calculated=failure('requires-input','L’acquisition des États ne peut pas être préparée intégralement.',projection.needsInput);
  else wrathConditionPreview=projection.preview;
 }
 let wrathAlliesPreview=null;
 if(captured.wrathAlliesPlan&&calculated.ready){const projected=projectWrathAllies(calculated.state,captured.wrathAlliesPlan,captured.executionId);if(!projected.ok)return failure('requires-input',projected.error,projected.needsInput);wrathAlliesPreview=projected.preview;}
 const result=calculated.ready?preview:{...preview,...calculated,preview:calculated.preview||preview.preview};
 return rememberPreview({...result,...(wrathStatePreview?{wrathStatePreview}:{}),...(wrathConditionPreview?{wrathConditionPreview}:{}),...(wrathDamagePreview?{wrathDamagePreview}:{}),...(calculated.ready?{projectedEffects:clone(calculated.receipt?.effectReceipts||[])}:{}),contractId,contract:clone(contract),baseRevision:state.localRevision||0,baseStateFingerprint:stateFingerprint(state),baseClockFingerprint:JSON.stringify(clock),input:captured,access:clone(access),
  executionId:captured.executionId,sourceReceipt:clone(contract.sourceReceipt),wrathTableResult,wrathRejectionPreview:captured.wrathRejection?{cult:captured.wrathRejection.cult,permanent:captured.wrathRejection.kind==='permanent',prayLoss:clone(captured.wrathRejection.prayLoss||null)}:null,wrathDailyBleedingPreview:captured.wrathDailyBleeding?{cult:captured.wrathDailyBleeding.cult,quantity:captured.wrathDailyBleeding.quantity,nextMorningAt:captured.wrathDailyBleeding.nextMorningAt}:null,wrathConfiscationPreview:captured.wrathConfiscation?{count:captured.wrathConfiscation.items.length,cult:captured.wrathConfiscation.cult}:null,wrathPenancePreview:captured.wrathPenance?{cult:captured.wrathPenance.cult,text:captured.wrathPenance.text}:null,wrathFortunePreview:captured.wrathFortuneLayer?{limit:1}:null,wrathSummonPreview:captured.wrathSummonPlan?prepareWrathSummon(state,ctx.actor,wrathTableResult,captured,{...calculated.preview.wrath,resultId:wrathTableResult.id}).wrathSummonPreview:null,wrathAccessPreview:captured.wrathAccessLayer?{resultId:captured.wrathAccessLayer.resultId,cult:captured.wrathAccessLayer.cult,dice:wrathAccessRules[captured.wrathAccessLayer.resultId].dice,value:captured.wrathAccessLayer.duration.value,deadline:clone(captured.wrathAccessLayer.deadline)}:null,wrathAlliesPreview,wrathSkillPreview:clone(captured.wrathSkillPreview||null),wrathRoundPreview:clone(captured.wrathRoundPreview||null),wrathLessonDuration:clone(captured.wrathLessonDuration||null),ruleVersion:preview.ruleVersion});
}

export function applyStoreDivine(state,contractId,input={}){
 let captured;
 try{captured=clone(input.preview);}catch{throw ruleError('L’aperçu a été modifié : recalculez la prière.');}
 if(!captured || !captured.ready || captured.contractId!==contractId)throw ruleError('Calculez cette prière avant de l’appliquer.');
 if(issuedPreviews.get(captured.executionId)!==JSON.stringify(captured))throw ruleError('L’aperçu a été modifié ou n’est plus disponible : recalculez la prière.');
 if(captured.baseClockFingerprint!==JSON.stringify(state.extensions?.v5?.gameClock||null))throw ruleError('L’horloge a changé depuis le calcul : recalculez la prière.');
 if(captured.baseRevision!==state.localRevision || captured.baseStateFingerprint!==stateFingerprint(state))throw ruleError('La partie a changé depuis le calcul : recalculez la prière.');
 const contract=getDivineContract(contractId),sourceError=validateDivineSources(contract);if(sourceError)throw ruleError(sourceError);
 const ctx=context(state,contract,captured.input);if(!ctx.actor)throw ruleError(ctx.error);
 const subjectKey=divineSubjectKey(state,ctx.actor);
 const access=resolveDivineAccess(divineAccessState(state),{actor:ctx.actor,subjectKey,contract,activeScene:state.activeScene,executionId:captured.executionId});
 if(!access.allowed)throw ruleError(access.reason);
 if(JSON.stringify(access)!==JSON.stringify(captured.access))throw ruleError('La décision d’accès a changé depuis l’aperçu : recalculez la prière.');
 const engineInput={...ctx.input,divineAccessState:clone(divineAccessState(state)),divineSubjectKey:subjectKey,divineActiveScene:clone(state.activeScene||null)};
 const calculated=applyDivineExecution(state,contract,engineInput);
 if(!calculated.ready)throw ruleError(calculated.error || 'Prière non appliquée : données requises.');
 let next=calculated.state;
 if(captured.input.wrathRejection){const row=registry.wrathTable.find(row=>row.id===captured.input.wrathRejection.resultId),planned=prepareWrathRejection(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},contract.deity);if(!planned.ready||stableJSON(planned.record)!==stableJSON(captured.input.wrathRejection))throw ruleError('Rejet divin modifié : recalculez.');next=projectRejection(next,ctx.actor,planned.record,{applyLoss:true});calculated.receipt.wrathRejectionReceipt=clone(planned.record);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathRejectionReceipt=clone(planned.record);}
 if(captured.input.wrathDailyBleeding){const row=registry.wrathTable.find(row=>row.id==='wrath:131-135'),planned=prepareWrathDailyBleeding(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},contract.deity);if(!planned.ready||stableJSON(planned.record)!==stableJSON(captured.input.wrathDailyBleeding))throw ruleError('Matin de récurrence modifié : recalculez.');next=projectDailyBleeding(next,ctx.actor,planned.record);calculated.receipt.wrathDailyBleedingReceipt=clone(planned.record);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathDailyBleedingReceipt=clone(planned.record);}
 if(captured.input.wrathConfiscation){const row=registry.wrathTable.find(row=>row.id==='wrath:111-115'),planned=prepareWrathConfiscation(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},contract.deity);if(!planned.ready||stableJSON(planned.record)!==stableJSON(captured.input.wrathConfiscation))throw ruleError('Inventaire modifié : recalculez.');next=projectConfiscation(next,ctx.actor,planned.record);calculated.receipt.wrathConfiscationReceipt=clone(planned.record);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathConfiscationReceipt=clone(planned.record);}
 if(captured.input.wrathPenance){const row=registry.wrathTable.find(row=>row.id==='wrath:96-100'),planned=prepareWrathPenance(state,ctx.actor,row,captured.input,contract.deity);if(!planned.ready||stableJSON(planned.record)!==stableJSON(captured.input.wrathPenance))throw ruleError('Pénitence modifiée : recalculez.');next=projectPenance(next,ctx.actor,planned.record);calculated.receipt.wrathPenanceReceipt=clone(planned.record);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathPenanceReceipt=clone(planned.record);}
 if(captured.input.wrathSummonPlan){const row=registry.wrathTable.find(row=>row.id===captured.wrathTableResult?.id),planned=row&&WRATH_SUMMON_RULES[row.id]?prepareWrathSummon(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id}):{ready:false};if(!planned.ready||stableJSON(planned.plan)!==stableJSON(captured.input.wrathSummonPlan))throw ruleError('Apparition du Courroux modifiée : recalculez.');next=projectWrathSummon(next,planned.plan);const receipt={...clone(planned.plan),participantId:planned.plan.id};calculated.receipt.wrathSummonReceipt=receipt;next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathSummonReceipt=clone(receipt);}
 if(captured.input.wrathFortuneLayer){const row=registry.wrathTable.find(row=>row.id==='wrath:121-125'),planned=prepareWrathFortune(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id});if(stableJSON(planned.layer)!==stableJSON(captured.input.wrathFortuneLayer))throw ruleError('Courroux Chance modifié : recalculez.');next=projectWrathRound(next,ctx.actor,planned.layer);calculated.receipt.wrathFortuneReceipt=clone(planned.layer);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathFortuneReceipt=clone(planned.layer);}
 if(captured.input.wrathAccessLayer){
  const row=registry.wrathTable.find(row=>row.id===captured.wrathTableResult?.id),planned=prepareWrathAccess(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},contract.deity);
  if(!planned.ready||stableJSON(planned.layer)!==stableJSON(captured.input.wrathAccessLayer))throw ruleError('La suspension divine a changé : recalculez.');
  next=projectWrathRound(next,ctx.actor,planned.layer);calculated.receipt.wrathAccessReceipt=clone(planned.layer);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathAccessReceipt=clone(planned.layer);
 }
 if(captured.input.wrathAlliesPlan){
  const row=registry.wrathTable.find(row=>row.id==='wrath:41-45'),planned=prepareWrathAllies(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},contract.deity);
  if(!planned.ready||stableJSON(planned.plan)!==stableJSON(captured.input.wrathAlliesPlan))throw ruleError('La liste d’alliés a changé : recalculez.');
  const projection=projectWrathAllies(next,planned.plan,captured.executionId);if(!projection.ok||stableJSON(projection.preview)!==stableJSON(captured.wrathAlliesPreview))throw ruleError('La projection des alliés a changé : recalculez.');
  next=projection.state;calculated.receipt.wrathAlliesReceipt=clone(projection.preview);next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathAlliesReceipt=clone(projection.preview);
 }
 if(captured.input.wrathSkillLayer){
  const row=registry.wrathTable.find(row=>row.id===captured.wrathTableResult?.id),planned=prepareWrathSkills(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id});
  if(!planned.ready||stableJSON(planned.layer)!==stableJSON(captured.input.wrathSkillLayer))throw ruleError('Le malus de compétences a changé : recalculez.');
  next=projectWrathRound(next,ctx.actor,planned.layer);calculated.receipt.wrathSkillReceipt=clone(planned.layer);
  next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathSkillReceipt=clone(planned.layer);
 }
 if(captured.input.wrathRoundLayer){
  const row=registry.wrathTable.find(row=>row.id===captured.wrathTableResult?.id),planned=prepareWrathRound(state,ctx.actor,row,captured.input,{...calculated.preview.wrath,resultId:row.id},calculated.preview.prayer);
  if(!planned.ready||stableJSON(planned.layer)!==stableJSON(captured.input.wrathRoundLayer))throw ruleError('La sanction de Rounds a changé : recalculez.');
  next=projectWrathRound(next,ctx.actor,planned.layer);calculated.receipt.wrathRoundReceipt=clone(planned.layer);
  next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId).wrathRoundReceipt=clone(planned.layer);
 }
 if(captured.input.wrathStateRuleId){
  const rule=wrathStateRule(captured.wrathTableResult?.id),index=parts(next).findIndex(row=>row.id===ctx.actor.id);
  if(!rule||rule.id!==captured.input.wrathStateRuleId)throw ruleError('Règle des États du Courroux modifiée.');
  const projected=projectWrathStates(parts(next)[index],rule,captured.executionId,state.combat?.round,contract.deity);
  if(!projected.ok||JSON.stringify(projected.preview)!==JSON.stringify(captured.wrathStatePreview))throw ruleError('Les États du Courroux ont changé : recalculez.');
  next.combat.participants[index]=projected.participant;
  const receipt={...projected.receipt,proof:clone(calculated.preview.wrath)};
  calculated.receipt.wrathStateReceipt=receipt;
  const stored=next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId);if(stored)stored.wrathStateReceipt=clone(receipt);
 }
 if(captured.input.wrathDamageRuleId){
  const rule=wrathDamageRule(captured.wrathTableResult?.id),wrath=calculated.preview.wrath;
  if(!rule||rule.id!==captured.input.wrathDamageRuleId)throw ruleError('La règle de dégâts du Courroux a changé.');
  const index=parts(next).findIndex(row=>row.id===ctx.actor.id);
  const projection=projectWrathDamage(parts(next)[index],rule,captured.input,captured.executionId,wrath.sinAtTest,state.combat?.round);
  if(!projection.ok)throw ruleError(projection.error);
  if(JSON.stringify(projection.preview)!==JSON.stringify(captured.wrathDamagePreview))throw ruleError('La projection du Courroux a changé : recalculez.');
  next.combat.participants[index]=projection.participant;
  const receipt={...projection.receipt,proof:{...projection.receipt.proof,roll:wrath.roll,modifiedRoll:wrath.modifiedRoll}};
  const effects=[...(calculated.receipt.effectReceipts||[]),projection.effectReceipt];
  calculated.receipt.wrathDamageReceipt=clone(receipt);calculated.receipt.effectReceipts=effects;
  const stored=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===captured.executionId);
  if(stored){stored.wrathDamageReceipt=clone(receipt);stored.effectReceipts=clone(effects);}
 }
 let wrathConditionReceipt=null;
 if(captured.input.wrathConditionRuleId){
  const resultId=captured.wrathTableResult?.id,rule=wrathConditionRule(resultId),prayer=calculated.preview.wrath;
  if(!rule||rule.id!==captured.input.wrathConditionRuleId||rule.type!=='condition-acquisition'||rule.ruleVersion!==1
   ||captured.input.wrathConditionRequest?.sinAtTest!==prayer.sinAtTest||captured.wrathConditionPreview?.ruleId!==rule.id
   ||captured.wrathConditionPreview?.sinAtTest!==prayer.sinAtTest)
   throw ruleError('La règle source ou la preuve des États du Courroux a changé depuis le calcul.');
  const liveActor=parts(next).find(row=>row.id===ctx.actor.id);
  const projection=projectWrathConditions(liveActor,rule,captured.executionId,prayer.sinAtTest);
  if(!projection.ok)throw ruleError(projection.needsInput.map(row=>row.message).join(' '));
  if(JSON.stringify(projection.preview)!==JSON.stringify(captured.wrathConditionPreview))throw ruleError('La projection des États a changé depuis le calcul.');
  const index=parts(next).findIndex(row=>row.id===ctx.actor.id);
  if(index<0)throw ruleError('Le prêtre n’est plus présent au moment de l’acquisition des États.');
  next.combat.participants[index]=projection.participant;
  const momentumBefore=projection.preview.projection.momentumBefore,momentumAfter=projection.preview.projection.momentumAfter;
  wrathConditionReceipt={ruleId:rule.id,ruleVersion:rule.ruleVersion,resultId:rule.resultId,targetId:ctx.actor.id,
   requested:clone(projection.preview.requested),acquiredCount:projection.acquired.acquiredInstances,stateIds:clone(projection.preview.projection.stateIds),
   removed:clone(projection.acquired.removed||[]),reminders:clone(projection.acquired.reminders||[]),momentum:{before:momentumBefore,after:momentumAfter},
   proof:{roll:prayer.roll,modifiedRoll:prayer.modifiedRoll,sinAtTest:prayer.sinAtTest},sourceReceipt:clone(rule.sourceReceipt)};
  const stored=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===captured.executionId);
  if(stored)stored.conditionReceipt=clone(wrathConditionReceipt);
  calculated.receipt.conditionReceipt=clone(wrathConditionReceipt);
 }
 let wrathSanction=null;
 if(captured.input.wrathSanctionRuleId==='wrath:6-10:pray-sl-cap'&&captured.wrathTableResult?.id==='wrath:6-10'){
  const rule=(registry.prayerSLRules||[]).find(row=>row.id==='wrath:6-10:pray-sl-cap'),clock=state.extensions?.v5?.gameClock;
  const prayer=calculated.preview.prayer,wrath=calculated.preview.wrath,anchor=captured.input.clockAnchor;
  if(!rule||!clock||!anchor||anchor.campaignSeconds!==clock.campaignSeconds||anchor.clockRevision!==clock.revision||anchor.lastEventId!==(clock.lastEvent?.id??null))throw ruleError('L’horloge ou la preuve du Courroux a changé depuis le calcul.');
  const seconds=rule.sourceReceipt.duration.seconds,deadline=anchor.campaignSeconds+seconds;
  if(!Number.isSafeInteger(deadline))throw ruleError('La fin des huit jours dépasse la capacité de l’horloge.');
  const subjectKey=prayerSubjectKey(state,ctx.actor),cap={id:`prayer-sl-cap:${captured.executionId}`,type:'prayer-sl-cap',cap:0,
   originKind:'wrath',originExecutionId:captured.executionId,wrathResultId:'wrath:6-10',ruleId:rule.id,ruleVersion:1,
   targetId:ctx.actor.id,subjectKey,source:clone(rule.source),sourceReceipt:clone(rule.sourceReceipt),
   duration:{value:1,sourceValue:1,sourceUnit:'imperial-week',unit:'imperial-week',days:8,seconds,
    conversionPolicyId:'imperial-week-8-days',secondPolicyId:'campaign-day-86400s'},
   clockAnchor:{campaignSeconds:anchor.campaignSeconds,clockRevision:anchor.clockRevision,lastEventId:anchor.lastEventId},
   deadline:{kind:'campaign-time',atSeconds:deadline},
   wrathProof:{schemaVersion:1,originExecutionId:captured.executionId,
    trigger:{fumble:Boolean(wrath.reason==='fumble'),sinThreshold:Boolean(wrath.sinTrigger)},
    prayer:{initialRoll:prayer.initialRoll,roll:prayer.roll,optionId:prayer.optionId,reversed:Boolean(prayer.reversed),success:Boolean(prayer.success),fumble:Boolean(prayer.fumble),sl:calculated.preview.prayerSLAdjustment?.rawSL??prayer.sl},
    wrath:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:'wrath:6-10'}}};
  const projected=projectPrayerCap(next,subjectKey,cap);
  if(!projected.ok)throw ruleError(projected.needsInput.map(row=>row.message).join(' '));
  next=projected.state;wrathSanction={effectId:cap.id,ruleId:cap.ruleId,subjectKey,targetId:cap.targetId,deadline:clone(cap.deadline)};
  const stored=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===captured.executionId);if(stored)stored.wrathSanction=clone(wrathSanction);
  calculated.receipt.wrathSanction=clone(wrathSanction);
 }
 let wrathLesson=null;
 if(captured.input.wrathLessonRuleId==='wrath:11-15:pray-sl-modifier'&&captured.wrathTableResult?.id==='wrath:11-15'){
  const rule=(registry.prayerSLRules||[]).find(row=>row.id==='wrath:11-15:pray-sl-modifier');
  const prayer=calculated.preview.prayer,wrath=calculated.preview.wrath,anchor=captured.input.prayerRoundAnchor,durationRoll=captured.input.wrathDurationRoll;
  const current=readCombatPosition(state);
  if(!rule||!anchor||!Number.isSafeInteger(durationRoll)||durationRoll<1||durationRoll>10
   ||anchor.round!==current.round||anchor.sceneId!==current.sceneId||current.round<1)
   throw ruleError('Le reçu, le d10 ou le Round courant de Leçons divines a changé depuis le calcul.');
  const rounds=durationRoll+wrath.sinAtTest,expiryRound=anchor.round+rounds-1;
  if(!Number.isSafeInteger(rounds)||rounds<1||!Number.isSafeInteger(expiryRound))throw ruleError('La durée en Rounds de Leçons divines dépasse la plage représentable.');
  const subjectKey=prayerSubjectKey(state,ctx.actor),lesson={id:`prayer-sl-modifier:${captured.executionId}`,type:'prayer-sl-modifier',amount:-1,
   originKind:'wrath',originExecutionId:captured.executionId,wrathResultId:'wrath:11-15',ruleId:rule.id,ruleVersion:1,
   targetId:ctx.actor.id,subjectKey,source:clone(rule.source),sourceReceipt:clone(rule.sourceReceipt),
   duration:{roll:durationRoll,sinAtTrigger:wrath.sinAtTest,rounds,unit:'rounds'},roundAnchor:clone(anchor),
   expiry:{round:expiryRound,phase:'endOfRound',moment:'afterEffects'},
   wrathProof:{schemaVersion:1,originExecutionId:captured.executionId,durationRoll,
    prayer:{initialRoll:prayer.initialRoll,roll:prayer.roll,optionId:prayer.optionId,reversed:Boolean(prayer.reversed),success:Boolean(prayer.success),fumble:Boolean(prayer.fumble),sl:calculated.preview.prayerSLAdjustment?.rawSL??prayer.sl},
    wrath:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:wrath.sinAtTest,resultId:'wrath:11-15'}}};
  const projected=projectPrayerLesson(next,subjectKey,lesson);
  if(!projected.ok)throw ruleError(projected.needsInput.map(row=>row.message).join(' '));
  next=projected.state;wrathLesson={effectId:lesson.id,ruleId:lesson.ruleId,subjectKey,targetId:lesson.targetId,duration:clone(lesson.duration),roundAnchor:clone(lesson.roundAnchor),expiry:clone(lesson.expiry)};
  const stored=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===captured.executionId);if(stored)stored.wrathLesson=clone(wrathLesson);
  calculated.receipt.wrathLesson=clone(wrathLesson);
 }
 next.extensions.v5.divineExecutions=next.extensions.v5.divineExecutions.slice(-100);
 if(access.mode==='grant'){
  const grants=divineAccessState(next);
  if(access.scope==='once'){const consumed=consumeDivineAccessGrant(grants,{grantId:access.grantId,executionId:captured.executionId,revision:(state.localRevision||0)+1,commandId:'prayer:'+captured.executionId});if(!consumed.ok)throw ruleError(consumed.error);next.extensions.v5.divineAccess=consumed.state;}
  const receipt=next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId);if(receipt)receipt.accessDecision={decisionId:'DIV-02',grantId:access.grantId,scope:access.scope,reason:access.reason,subjectKey};
 }
 const prayer=calculated.receipt.prayer;
 next.log=[{id:captured.executionId+':log',kind:'effect',actorId:ctx.actor.id,actorName:ctx.actor.name,
  text:`${ctx.actor.name} · ${contract.name} · ${calculated.receipt.targetRejections?.length?'invocation rejetée (Test de Prière résolu)':prayer.success?'prière réussie':'prière ratée'} (${prayer.sl} DR)${calculated.receipt.pendingWrath?' · Courroux à résoudre':''}${wrathSanction?' · Pensez à vos actes : cap +0 DR pendant huit jours':''}${wrathLesson?' · Leçons divines : −1 DR à Prière jusqu’à la fin du Round '+wrathLesson.expiry.round:''}`,
  detail:{kind:'divine',contractId:contract.id,executionId:captured.executionId,source:contract.source,reminders:calculated.receipt.reminders,...(access.mode==='grant'?{accessDecision:clone(next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId)?.accessDecision)}:{})}},...(next.log||[])].slice(0,300);
 // Une ligne de journal par cible touchée (dégâts directs : dés et DR) ; les reçus d'effet portent leur texte dans `log`.
 const effectLogs=(calculated.receipt.effectReceipts||[]).filter(row=>typeof row.log==='string').map((row,index)=>({id:`${captured.executionId}:effect:${index}`,kind:'effect',actorId:ctx.actor.id,actorName:ctx.actor.name,text:row.log,detail:{kind:'divine-effect',executionId:captured.executionId,targetId:row.targetId,type:row.type,result:clone(row.result)}}));
 if(effectLogs.length)next.log=[next.log[0],...effectLogs,...next.log.slice(1)].slice(0,300);
 return {...calculated,state:next};
}

// Une récupération est un vrai Test de Prière, distinct d’une Bénédiction/Miracle.
// Le moteur commun calcule le Test ; aucun bonus de Bénédiction n’est appliqué.
function calculateWrathRecovery(state,input){
 const ctx=context(state,null,{actorId:input.actorId,targetIds:[]});if(!ctx.actor)return ctx;
 const actor=ctx.actor,forcedLayer=input.forcedPrayer===true?validateWrathRounds(actor).layers.find(row=>row.mode==='forced'):null;
 const condition=input.forcedPrayer===true?null:(actor.states||[]).find(row=>row.id===input.stateId);
 const lock=forcedLayer?{executionId:forcedLayer.originExecutionId,cult:forcedLayer.cult,source:clone(forcedLayer.source)}:condition?.divineWrathLocks?.find(row=>row.kind==='pray'&&(!input.originExecutionId||row.executionId===input.originExecutionId));
 const rule=forcedLayer?{id:'wrath:76-80:pray-action',source:clone(forcedLayer.source),recovery:{difficulty:0,remove:'none'}}:wrathStateRule(lock?.resultId);
 if(!forcedLayer&&(!rule||rule.id!==lock.ruleId||rule.recovery?.kind!=='pray'||stableJSON(lock.source)!==stableJSON(rule.source)||!lock.cult))return failure('blocked','Cette occurrence ne porte pas de récupération par Prière sourcée.');
 if(forcedLayer&&!lock.cult)return failure('requires-input','Culte source de la Prière imposée manquant.');
 if(condition?.divineWrathLocks.filter(row=>row.kind==='pray').length>1&&!input.originExecutionId)return failure('requires-input','Choisissez l’occurrence de Courroux.',[{field:'originExecutionId',label:'Origine à récupérer'}]);
 if(input.canSpeak!==true)return failure('requires-input','La capacité à prononcer la Prière doit être confirmée.',[{field:'canSpeak',label:'Peut prononcer la Prière'}]);
 const caps=inspectPrayerCaps(state,{subjectKey:prayerSubjectKey(state,actor)}),lessons=inspectPrayerLessons(state,{subjectKey:prayerSubjectKey(state,actor)});
 if(!caps.ok||!lessons.ok)return failure('requires-input','Les sanctions de Prière doivent être résolues.',[...caps.needsInput,...lessons.needsInput]);
 const modifiers=getPrayerSLModifiers(actor,{sceneId:state.activeScene?.status==='active'?state.activeScene.id:null,round:state.combat?.round});
 if(!modifiers.ok)return failure('requires-input','Malus de Prière non résolu.',modifiers.needsInput);
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const skills=(actor.skills||[]).filter(row=>['pray','priere'].includes(fold(row.name||row.nom)));
 if(!skills.length||skills.some(row=>row.status!=='resolved'||!Number.isSafeInteger(row.total)||row.total<0||!['soc','fellowship'].includes(fold(row.carac||'Soc')))||new Set(skills.map(row=>row.total)).size!==1||!Number.isSafeInteger(actor.caracs?.Soc))return failure('requires-input','Prière résolue et Sociabilité courante requises.',[{field:'actor.skills',label:'Score de Prière résolu'}]);
 const testContext=resolveV5ConditionTestContext(actor,{characteristic:'Soc',isAction:true,involvesMovement:false,runningOrHiding:false,requiresSight:false,reliesOnSight:false,conditionPenaltyMode:input.conditionContext?.conditionPenaltyMode,conditionPenaltyReason:input.conditionContext?.conditionPenaltyReason});
 if(!testContext.ready)return failure('requires-input','Précisez le contexte des États.',testContext.needsInput.concat(testContext.restrictions.map(label=>({field:'conditionContext',label}))));
 let test,options;
 const prayerSheetModifiers=[...new Map([...magicSkillModifiers(actor,'Prière'),...magicSkillModifiers(actor,'Pray')].map(row=>[row.id,row])).values()];
 try{
  const preview=previewV5Test({score:effectiveSkillScore(actor,skills[0].total,'Soc'),roll:normalizeV5Roll(input.roll),kind:'test',
   slModifiers:[{id:rule.id+':recovery',label:'Prière de récupération',amount:rule.recovery.difficulty},...testContext.slModifiers,...modifiers.modifiers,...prayerSheetModifiers],advantageSources:testContext.advantageSources,disadvantageSources:testContext.disadvantageSources});
  options=preview.options;
  if(preview.choiceRequired&&!input.testOptionId)return {...failure('requires-input','Choisissez le jet de Prière.',[{field:'testOptionId',label:'Choix du jet de Prière'}]),testOptions:options};
  test=selectV5Test(preview,input.testOptionId||(preview.forcedInversion?'reverse':'keep'));
 }catch(error){return failure('requires-input',error.message,[{field:'roll',label:'Jet d100 explicite'}]);}
 const capped=applyPrayerSLCaps(actor,test);if(!capped.ok)return failure('requires-input','Plafond de Prière non résolu.',capped.needsInput);test=capped.test;
 const sin=actor.extensions?.v5?.divine?.sin,exempt=divineSinPolicy({deity:lock.cult}).exempt;
 if(!exempt&&(!Number.isSafeInteger(sin)||sin<0))return failure('requires-input','Péchés courants requis.',[{field:'sin',label:'Péchés'}]);
 const wrath={triggered:!exempt&&sin>0&&(test.fumble||test.roll%10<=sin),sinAtTest:exempt?0:sin};
 const next=clone(state),index=parts(next).findIndex(row=>row.id===actor.id),changed=parts(next)[index];let removedCount=0;
 if(test.success&&condition){
  const target=changed.states.find(row=>row.id===condition.id),remaining=target.divineWrathLocks.filter(row=>row.executionId!==lock.executionId);
  const amount=rule.recovery.remove==='one-plus-sl'?1+Math.max(0,test.sl):target.level;
  if(rule.recovery.remove==='one-plus-sl'&&target.level>amount){target.level-=amount;removedCount=amount;}
  else{target.divineWrathLocks=remaining;if(!remaining.length){removedCount=target.level;changed.states=changed.states.filter(row=>row.id!==target.id);}}
 }
 let wrathDetails=null,wrathDamagePreview=null,wrathSkillPreview=null,wrathAlliesPreview=null,wrathSummonPreview=null,wrathAccessPreview=null;
 if(wrath.triggered){
  if(!Number.isSafeInteger(input.wrathRoll)||input.wrathRoll<1||input.wrathRoll>100)return {...failure('requires-input','Ce Test déclenche un nouveau Courroux : saisissez sa table.',[{field:'wrathRoll',label:'Jet de Courroux d100'}]),test,wrath};
  wrath.roll=input.wrathRoll;wrath.modifiedRoll=input.wrathRoll+10*sin;
  const row=registry.wrathTable.find(row=>wrath.modifiedRoll>=row.min&&(row.max===null||wrath.modifiedRoll<=row.max));wrath.resultId=row.id;
  const stateRule=wrathStateRule(row.id),conditionRule=wrathConditionRule(row.id),damageRule=wrathDamageRule(row.id);
  if(stateRule||conditionRule||damageRule){
   const projected=stateRule?projectWrathStates(changed,stateRule,input.executionId,state.combat?.round,lock.cult)
    :conditionRule?projectWrathConditions(changed,conditionRule,input.executionId,sin):projectWrathDamage(changed,damageRule,input,input.executionId,sin,state.combat?.round);
   if(!projected.ok)return {...failure('requires-input',projected.error||'Acquisition à préciser.',projected.needsInput),test,wrath,...(damageRule?{wrathDamagePreview:projected.preview}:{})};
   next.combat.participants[index]=projected.participant;wrathDetails=clone(projected.receipt||projected.preview);if(damageRule)wrathDamagePreview=projected.preview;
  }else if(['wrath:136-140','wrath:146-150'].includes(row.id)){
   const planned=prepareWrathRejection(state,actor,row,input,wrath,lock.cult);if(!planned.ready)return {...planned,test,wrath};Object.assign(next,projectRejection(next,actor,planned.record,{applyLoss:true}));wrathDetails={rejection:clone(planned.record)};
  }else if(WRATH_SUMMON_RULES[row.id]){
   const planned=prepareWrathSummon(state,actor,row,input,wrath);if(!planned.ready)return {...planned,test,wrath};Object.assign(next,projectWrathSummon(next,planned.plan));wrathDetails={summon:{...clone(planned.plan),participantId:planned.plan.id}};wrathSummonPreview=planned.wrathSummonPreview;
  }else if(row.id==='wrath:131-135'){
   const planned=prepareWrathDailyBleeding(state,actor,row,input,wrath,lock.cult);if(!planned.ready)return {...planned,test,wrath};Object.assign(next,projectDailyBleeding(next,actor,planned.record));wrathDetails={dailyBleeding:clone(planned.record)};
  }else if(row.id==='wrath:111-115'){
   const planned=prepareWrathConfiscation(state,actor,row,input,wrath,lock.cult);if(!planned.ready)return {...planned,test,wrath};Object.assign(next,projectConfiscation(next,actor,planned.record));wrathDetails={confiscation:clone(planned.record)};
  }else if(row.id==='wrath:96-100'){
   const planned=prepareWrathPenance(state,actor,row,input,lock.cult);if(!planned.ready)return {...planned,test,wrath};Object.assign(next,projectPenance(next,actor,planned.record));wrathDetails={record:clone(planned.record)};
  }else if(row.id==='wrath:121-125'){
   const planned=prepareWrathFortune(state,actor,row,input,wrath);Object.assign(next,projectWrathRound(next,actor,planned.layer));wrathDetails=clone(planned.layer);
  }else if(wrathAccessRules[row.id]){
   const planned=prepareWrathAccess(state,actor,row,input,wrath,lock.cult);if(!planned.ready)return {...planned,test,wrath};
   Object.assign(next,projectWrathRound(next,actor,planned.layer));wrathDetails=clone(planned.layer);wrathAccessPreview=planned.wrathAccessPreview;
  }else if(row.id==='wrath:41-45'){
   const planned=prepareWrathAllies(state,actor,row,input,wrath,lock.cult);if(!planned.ready)return {...planned,test,wrath};
   const projection=projectWrathAllies(next,planned.plan,input.executionId);if(!projection.ok)return failure('requires-input',projection.error,projection.needsInput);
   Object.assign(next,projection.state);wrathDetails=clone(projection.preview);wrathAlliesPreview=projection.preview;
  }else if(wrathSkillRules[row.id]){
   const planned=prepareWrathSkills(state,actor,row,input,wrath);if(!planned.ready)return {...planned,test,wrath};
   Object.assign(next,projectWrathRound(next,actor,planned.layer));wrathDetails=clone(planned.layer);wrathSkillPreview=planned.wrathSkillPreview;
  }else if(wrathRoundRules[row.id]){
   const planned=prepareWrathRound(state,actor,row,{...input,forcedPrayerCult:lock.cult},wrath,test);
   if(!planned.ready)return {...planned,test,wrath};
   Object.assign(next,projectWrathRound(next,actor,planned.layer));wrathDetails=clone(planned.layer);
  }else if(row.id==='wrath:11-15'){
   const duration=input.wrathDurationRoll,clock=state.extensions?.v5?.gameClock,round=state.combat?.round,sceneId=state.activeScene?.status==='active'?state.activeScene.id:null;
   if(!Number.isSafeInteger(duration)||duration<1||duration>10||clock?.combat?.round!==round||clock?.combat?.sceneId!==sceneId||lessons.groups.get(prayerSubjectKey(state,actor))?.lessons?.length)
    return {...failure('requires-input','d10, Round attesté et absence de Leçons actives requis.',[{field:'wrathDurationRoll',label:'Durée d10 des Leçons'}]),test,wrath};
   const sourceRule=registry.prayerSLRules.find(row=>row.id==='wrath:11-15:pray-sl-modifier'),rounds=duration+sin,expiryRound=round+rounds-1;
   if(!Number.isSafeInteger(expiryRound))return failure('blocked','Durée de Rounds non représentable.');
   const subjectKey=prayerSubjectKey(state,actor),layer={id:`prayer-sl-modifier:${input.executionId}`,type:'prayer-sl-modifier',amount:-1,originKind:'wrath',originExecutionId:input.executionId,wrathResultId:row.id,ruleId:sourceRule.id,ruleVersion:1,targetId:actor.id,subjectKey,source:clone(sourceRule.source),sourceReceipt:clone(sourceRule.sourceReceipt),duration:{roll:duration,sinAtTrigger:sin,rounds,unit:'rounds'},roundAnchor:{sceneId,round},expiry:{round:expiryRound,phase:'endOfRound',moment:'afterEffects'},wrathProof:{schemaVersion:1,originExecutionId:input.executionId,durationRoll:duration,prayer:Object.fromEntries(["initialRoll","roll","optionId","reversed","success","fumble","sl"].map(key=>[key,test[key]])),wrath:{roll:wrath.roll,modifiedRoll:wrath.modifiedRoll,sinAtTest:sin,resultId:row.id}}};
   const projected=projectPrayerLesson(next,subjectKey,layer);if(!projected.ok)return failure('requires-input','Leçons non projetables.',projected.needsInput);Object.assign(next,projected.state);wrathDetails=layer;
  }else{
   if(!text(input.wrathConsequences))return {...failure('requires-input','Conséquences MJ requises pour cette ligne encore assistée.',[{field:'wrathConsequences',label:row.label}]),test,wrath};
   wrathDetails={source:clone(row.source),resolvedBy:'MJ',consequences:input.wrathConsequences.trim()};
  }
  parts(next)[index].extensions.v5.divine.sin=Math.max(0,sin-1);
 }
 const receipt={executionId:input.executionId,actorId:actor.id,stateId:condition?.id||null,forcedPrayer:Boolean(forcedLayer),originExecutionId:lock.executionId,ruleId:rule.id,source:clone(rule.source),test:clone(test),difficulty:rule.recovery.difficulty,removedCount,wrath,wrathDetails};
 next.extensions??={};next.extensions.v5??={};next.extensions.v5.divineWrathRecoveries=[...(next.extensions.v5.divineWrathRecoveries||[]),clone(receipt)].slice(-300);
 next.log=[{id:input.executionId+':log',kind:'effect',actorId:actor.id,text:`${actor.name} · Récupération du Courroux : Prière ${test.success?'réussie':'ratée'}, ${test.sl} DR, ${removedCount} État(s) retiré(s)${wrath.triggered?' · nouveau Courroux '+wrath.resultId:''}`,detail:clone(receipt)},...(next.log||[])].slice(0,300);
 return {ready:true,status:'ready',test:clone(test),testOptions:options,difficulty:rule.recovery.difficulty,removedCount,wrath,wrathDamagePreview,wrathSkillPreview,wrathAlliesPreview,wrathSummonPreview,wrathAccessPreview,source:clone(rule.source),input:clone(input),executionId:input.executionId,receipt,state:next};
}
export function previewStoreDivineWrathRecovery(state,input={}){
 const captured={...clone(input),executionId:input.executionId||'wrath-recovery:'+uid()};
 const calculated=calculateWrathRecovery(state,captured),{state:discard,...preview}=calculated;
 return rememberPreview({...preview,input:captured,executionId:captured.executionId,sourceFingerprint:registry.sourceFingerprint,baseRevision:state.localRevision||0,baseStateFingerprint:stateFingerprint(state)});
}
export function applyStoreDivineWrathRecovery(state,{preview}={}){
 if(!preview?.ready||issuedPreviews.get(preview.executionId)!==JSON.stringify(preview))throw ruleError('L’aperçu de récupération a été modifié : recalculez.');
 if(preview.baseRevision!==state.localRevision||preview.baseStateFingerprint!==stateFingerprint(state)||preview.sourceFingerprint!==registry.sourceFingerprint)throw ruleError('La partie a changé : recalculez la récupération.');
 if((state.extensions?.v5?.divineWrathRecoveries||[]).some(row=>row.executionId===preview.executionId)||hasWrathConditionOrigin(state,preview.executionId))throw ruleError('Récupération déjà appliquée.');
 const result=calculateWrathRecovery(state,preview.input);if(!result.ready)throw ruleError(result.error);
 return {...result,ok:true};
}

export function setStoreDivineSin(state,actorId,value,{reason,cult}={}){
 if(!Number.isSafeInteger(value)||value<0)throw ruleError('Le total de Péchés doit être un entier positif ou nul.');
 if(typeof reason!=='string'||!reason.trim())throw ruleError('Indiquez la raison de cet ajustement des Péchés.');
 if((state.extensions?.v5?.divineExecutions||[]).some(row=>row.actorId===actorId&&row.pendingWrath?.status==='pending'))throw ruleError('Résolvez d’abord le Courroux en attente avant de modifier les Péchés.');
 const next=clone(state),actor=parts(next).find(row=>row.id===actorId);if(!actor)throw ruleError('Personnage introuvable.');
 const cultDecision=resolveSinAdjustmentCult(actor,cult);if(!cultDecision.ok)throw ruleError(cultDecision.error);
 const before=actor.extensions?.v5?.divine?.sin;
 actor.extensions??={};actor.extensions.v5??={};actor.extensions.v5.divine??={};actor.extensions.v5.divine.sin=value;
 next.log=[{id:'divine-sin:'+uid(),kind:'management',actorId,actorName:actor.name,text:`${actor.name} · Péchés ${before??'non renseigné'} → ${value}${cultDecision.cult?' · '+cultDecision.cult:''} · ${reason.trim()}`},...(next.log||[])].slice(0,300);
 return next;
}

/**
 * Fin manuelle : retire les couches de la prière, puis balaie ses créatures comme à l'expiration. Une créature qui est l'acteur courant
 * reste (marquée `divineSummon.endedPending`) jusqu'à la commande suivante, une fois la main passée : `removeFromCombat` ne sait pas
 * désigner le successeur d'un acteur absent de `combat.order` ni faire avancer le Round, et le prêtre rejouerait son Tour. Une
 * créature qui n'est pas l'acteur courant est retirée aussitôt.
 */
export function endStoreDivinePrayer(state,executionId,{reason}={}){
 if(typeof reason!=='string'||!reason.trim())throw ruleError('Indiquez la raison de la fin de cette prière.');
 const next=clone(state);let removed=0;
 for(const participant of parts(next)){
  const layers=participant.extensions?.v5?.divineEffects;if(!layers)continue;
  const ending=layers.filter(layer=>layer.executionId===executionId),kept=layers.filter(layer=>layer.executionId!==executionId);
  const retainedStateIds=new Set(kept.flatMap(layer=>layer.conditionStateIds||[]));
  const removeStateIds=new Set(ending.flatMap(layer=>layer.conditionStateIds||[]).filter(id=>!retainedStateIds.has(id)));
  if(removeStateIds.size)participant.states=(participant.states||[]).filter(row=>!removeStateIds.has(row.id));
  removed+=ending.length;participant.extensions.v5.divineEffects=kept;
 }
 if(!removed)throw ruleError('Cette prière ne possède plus d’effet actif.');
 sweepDivineSummons(next);
 const receipt=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===executionId);if(receipt)receipt.endedByMJ=reason.trim();
 next.log=[{id:executionId+':end',kind:'effect',text:'Prière terminée par le MJ · '+reason.trim()},...(next.log||[])].slice(0,300);
 return next;
}

// Seul un lien complet (propriétaire, couche, exécution) est celui du moteur : une autre forme de `divineSummon` n'est jamais balayée.
const summonLink=row=>{const link=row?.extensions?.v5?.divineSummon;return ['ownerId','layerId','executionId'].every(key=>typeof link?.[key]==='string'&&link[key])?link:null;};
const ownsSummon=(owner,link)=>(owner?.extensions?.v5?.divineEffects||[]).some(layer=>layer?.type==='summon-creature'&&layer.id===link.layerId&&layer.executionId===link.executionId);
/**
 * Retire (en place) les créatures invoquées par un miracle dont la couche `summon-creature` a disparu du prêtre (même liste), dans le
 * combat, la scène active et les scènes suspendues : order, acteur courant, lignes de dés et journal suivent dans la même commande.
 * Une créature qui est l'acteur courant n'est pas retirée mais marquée `divineSummon.endedPending` (retrait à la commande suivante, une
 * fois la main passée : jamais de Tour rejoué ni sauté), que la couche ait expiré ou que le MJ ait terminé la prière.
 */
export function sweepDivineSummons(state){
 const lists=[state?.combat?.participants,state?.activeScene?.participants,...(state?.suspendedScenes||[]).map(scene=>scene?.participants)];
 const orphans=list=>Array.isArray(list)?list.filter(row=>{const link=summonLink(row);return link&&!ownsSummon(list.find(item=>item.id===link.ownerId),link);}):[];
 if(!lists.some(list=>orphans(list).length))return state;
 const deferred=new Set(),removed=new Map();
 const combatList=orphans(lists[0]);
 for(const creature of combatList){
  if(state.combat.currentActorId===creature.id){summonLink(creature).endedPending=true;deferred.add(creature.id);continue;}
  const transition=creature.zone==='active'?removeFromCombat({participants:state.combat.participants,order:state.combat.order||[],currentActorId:state.combat.currentActorId,participantId:creature.id}):null;
  state.combat.participants=state.combat.participants.filter(row=>row.id!==creature.id);
  state.combat.order=transition?transition.order:(state.combat.order||[]).filter(id=>id!==creature.id);
  if(transition)state.combat.currentActorId=transition.currentActorId;else if(state.combat.currentActorId===creature.id)state.combat.currentActorId=state.combat.order[0]||null;
  removed.set(creature.id,creature);
 }
 for(const list of lists.slice(1))for(const creature of orphans(list)){
  if(deferred.has(creature.id))continue;
  list.splice(list.findIndex(row=>row.id===creature.id),1);removed.set(creature.id,creature);
 }
 if(!removed.size)return state;
 if(Array.isArray(state.diceLines))state.diceLines=state.diceLines.filter(line=>!removed.has(line.participantId)).map(line=>removed.has(line.targetId)?{...line,targetId:null}:line);
 const known=new Set((state.log||[]).map(entry=>entry?.id));
 const entries=[...removed.values()].map(creature=>({id:`divine-summon-end:${summonLink(creature).executionId}:${creature.id}`,kind:'effect',actorId:creature.id,actorName:creature.name,
  text:`${creature.name} disparaît · fin de l’invocation divine`})).filter(entry=>!known.has(entry.id));
 if(entries.length)state.log=[...entries,...(state.log||[])].slice(0,300);
 return state;
}

/** Commande de finalisation : valide les combinaisons et recalcule les couches sans déduire de phases d'une différence d'état. */
export function finalizeDivineState(before,next){
 next=progressWrathMornings(before,next);guardDailyBleeding(before,next);guardRejections(before,next);
 guardWrathCalendar(before,next);guardWrathFortune(before,next);guardPenances(before,next);guardConfiscations(before,next);
 const oldRoundCheck=inspectWrathRounds(before),newRoundCheck=inspectWrathRounds(next);
 if(!oldRoundCheck.ok||!newRoundCheck.ok)throw ruleError('Sanction du Courroux en Rounds invalide ou divergente.');
 let roundPhases=[];
 const fromClock=before.extensions?.v5?.gameClock,toClock=next.extensions?.v5?.gameClock;
 const sceneChanged=readCombatPosition(before).sceneId!==readCombatPosition(next).sceneId;
 if([...oldRoundCheck.groups.values()].some(rows=>rows[0].layers.length)){
  if(!sceneChanged&&stableJSON(readCombatPosition(next))!==stableJSON(toClock?.combat))throw ruleError('Courroux : Round et horloge doivent rester concordants.');
  if(stableJSON(fromClock)!==stableJSON(toClock)){
   let replay;try{replay=advanceGameClock(fromClock,JSON.parse(toClock.lastEvent.payloadFingerprint));}catch{}
   if(!replay?.ok||replay.status!=='applied'||stableJSON(replay.clock)!==stableJSON(toClock))throw ruleError('Courroux : transition temporelle non attestée.');
   roundPhases=replay.validatedPhases;
  }
 }
 for(const [key,rows]of oldRoundCheck.groups){
  const candidates=newRoundCheck.groups.get(key);if(!candidates)continue;
  for(const layer of rows[0].layers){
   const current=candidates[0].layers.find(row=>row.id===layer.id);
   const expired=roundPhases.some(p=>p.phase==='endOfRound'&&p.moment==='afterEffects'&&(p.sceneId??'')===layer.roundAnchor.sceneId&&p.round===layer.roundDeadline);
   if(current?stableJSON(current)!==stableJSON(layer):!expired)throw ruleError('Courroux : la sanction exige une vraie expiration de Rounds.');
  }
 }
 for(const [key,rows]of newRoundCheck.groups)for(const layer of rows[0].layers){
  if((oldRoundCheck.groups.get(key)?.[0].layers||[]).some(row=>row.id===layer.id))continue;
  const encoded=issuedPreviews.get(layer.originExecutionId),issued=encoded&&JSON.parse(encoded);
  const authentic=issued?.input?.wrathRoundLayer||issued?.receipt?.wrathDetails;
  if(!issued?.ready||issued.baseRevision!==before.localRevision||issued.baseStateFingerprint!==stateFingerprint(before)||stableJSON(authentic)!==stableJSON(layer))throw ruleError('Courroux : ajout de sanction non attesté par un aperçu.');
 }
 for(const actor of parts(before)){
  const forced=wrathForcedPrayerGate(before,actor.id,{endingTurn:true});
  if(forced&&!sceneChanged&&before.combat?.currentActorId===actor.id&&next.combat?.currentActorId!==actor.id)throw ruleError(forced.error);
  const layers=validateWrathRounds(actor).layers||[];if(!layers.some(row=>row.mode==='forced'))continue;
  const oldIds=new Set((before.extensions?.v5?.standardTurnActions||[]).map(row=>row.actionId));
  const additions=(next.extensions?.v5?.standardTurnActions||[]).filter(row=>row.actorId===actor.id&&!oldIds.has(row.actionId));
  if(additions.length){
   if(wrathActionSpent(before,actor.id))throw ruleError('Courroux : quota Action déjà dépensé.');
   const beforeIds=new Set([...(before.extensions?.v5?.divineExecutions||[]),...(before.extensions?.v5?.divineWrathRecoveries||[])].map(row=>row.executionId));
   const prayers=[...(next.extensions?.v5?.divineExecutions||[]),...(next.extensions?.v5?.divineWrathRecoveries||[])].filter(row=>!beforeIds.has(row.executionId));
   if(additions.some(row=>!prayers.some(prayer=>prayer.actorId===actor.id&&prayer.executionId===row.actionId)))throw ruleError('Courroux : seule la Prière peut servir d’Action.');
  }
 }

 // Les autres commandes (sorts, Recommencer, édition générique) passent aussi
 // par le verrou. Seule une récupération émise et vérifiée peut le réduire.
 const oldRecoveries=new Set((before.extensions?.v5?.divineWrathRecoveries||[]).map(row=>row.executionId));
 for(const prior of parts(before))if((prior.states||[]).some(hasDivineWrathLock)){
  const index=parts(next).findIndex(row=>row.id===prior.id);if(index<0)continue;
  let expected=prior;
  const recovery=(next.extensions?.v5?.divineWrathRecoveries||[]).find(row=>row.actorId===prior.id&&!oldRecoveries.has(row.executionId));
  if(recovery){
   const encoded=issuedPreviews.get(recovery.executionId),issued=encoded&&JSON.parse(encoded);
   if(!issued?.ready||issued.sourceFingerprint!==registry.sourceFingerprint||issued.baseStateFingerprint!==stateFingerprint(before)||issued.baseRevision!==before.localRevision)throw ruleError('Récupération du Courroux non attestée : recalculez.');
   const recalculated=calculateWrathRecovery(before,issued.input);if(!recalculated.ready)throw ruleError(recalculated.error);
   expected=parts(recalculated.state).find(row=>row.id===prior.id);
  }
  next.combat.participants[index]=assertDivineWrathConditionsKept(expected,parts(next)[index]);
 }
 sweepDivineSummons(next);
 const conflict=unresolvedCombination(next);if(conflict)throw ruleError(conflict);
 if(!parts(next).some(row=>row.extensions?.v5?.divineEffects?.length) && !parts(before).some(row=>row.extensions?.v5?.divineEffects?.length))return next;
 next.combat.participants=parts(next).map(participant=>{
  const prior=parts(before).find(row=>row.id===participant.id);
  return refreshEffectLayers(participant,prior);
 });
 return next;
}

/** End only the divine layers named by a real, prevalidated combat phase plan. */
export function expireDivineAtPhases(state,phases=[]){
 const next=clone(state),before=parts(state);
 next.combat ||= {};
 next.combat.participants=parts(next).map(participant=>{
  let updated=participant;
  for(const phase of phases)if(['endOfTurn','endOfRound','startOfTurn'].includes(phase.phase))
   updated=expireDivineEffects(updated,{...phase,turn:phase.turnIndex}).participant;
  return refreshEffectLayers(updated,before.find(row=>row.id===participant.id));
 });
 return next;
}

function participantAtPath(state,path){
 const flat=path.match(/^(combat\.participants|reserve|persistentCharacters|activeScene\.participants)\[(\d+)\]$/);
 if(flat){
  const list=flat[1]==='combat.participants'?state.combat?.participants:flat[1]==='reserve'?state.reserve:flat[1]==='persistentCharacters'?state.persistentCharacters:state.activeScene?.participants;
  return list?.[Number(flat[2])]||null;
 }
 const scene=path.match(/^suspendedScenes\[(\d+)\]\.participants\[(\d+)\]$/);
 return scene?state.suspendedScenes?.[Number(scene[1])]?.participants?.[Number(scene[2])]||null:null;
}
const calendarLayer=effect=>effect?.deadline?.kind==='campaign-time'&&effect.type!=='prayer-sl-cap';
/** Retire toute couche divine calendaire échue, ses États rattachés, puis recalcule les valeurs effectives. */
function expireCalendarLayers(state,now){
 const next=clone(state),removed=[];
 for(const item of subjectRows(next)){
  const participant=participantAtPath(next,item.path),layers=participant?.extensions?.v5?.divineEffects;
  if(!Array.isArray(layers)||!layers.some(effect=>calendarLayer(effect)&&effect.deadline.atSeconds<=now))continue;
  const before=clone(participant),ended=layers.filter(effect=>calendarLayer(effect)&&effect.deadline.atSeconds<=now),kept=layers.filter(effect=>!ended.includes(effect));
  const retained=new Set(kept.flatMap(layer=>layer.conditionStateIds||[]));
  const gone=new Set(ended.flatMap(layer=>layer.conditionStateIds||[]).filter(id=>!retained.has(id)));
  if(gone.size)participant.states=(participant.states||[]).filter(row=>!gone.has(row.id));
  participant.extensions.v5.divineEffects=kept;
  removed.push(...ended.map(effect=>({path:item.path,participantId:participant.id??null,effectId:effect.id})));
  Object.assign(participant,refreshEffectLayers(participant,before));
 }
 return {state:next,removed};
}

/** Expire only this source-backed Prayer cap over one verified clock transition. */
export function expireDivineAtClock(candidate,{fromClock,toClock,receipt}={}){
 const refuse=message=>({ok:false,status:'requires-input',state:null,removed:[],needsInput:[prayerNeeds('extensions.v5.divineEffects',message)]});
 if(!candidate||typeof candidate!=='object'||!fromClock||!toClock||!receipt)return refuse('Horloges source et reçu de transition requis.');
 let event,replayed;
 try{
  if(typeof receipt.payloadFingerprint!=='string')return refuse('Reçu d’horloge sans événement rejouable.');
  event=JSON.parse(receipt.payloadFingerprint);
  replayed=advanceGameClock(fromClock,event);
 }catch{return refuse('Reçu d’horloge ou ancre de départ invalide.');}
 if(!replayed?.ok||replayed.status!=='applied'||JSON.stringify(replayed.receipt)!==JSON.stringify(receipt)
  ||JSON.stringify(replayed.clock)!==JSON.stringify(toClock)
  ||JSON.stringify(candidate.extensions?.v5?.gameClock||null)!==JSON.stringify(toClock)
  ||JSON.stringify(readCombatPosition(candidate))!==JSON.stringify(toClock.combat))return refuse('Le reçu rejoué, la clock de snapshot ou la position finale ne concordent pas.');
 const elapsed=toClock.campaignSeconds-fromClock.campaignSeconds;
 if(!Number.isSafeInteger(fromClock.campaignSeconds)||!Number.isSafeInteger(toClock.campaignSeconds)||elapsed<0)return refuse('Intervalle de clock invalide.');
 if(event.kind==='campaign-time-advance'){
  if(!Number.isSafeInteger(event.seconds)||event.seconds<1||elapsed!==event.seconds)return refuse('Avance calendaire non attestée par les secondes du reçu.');
 }else if(event.kind==='combat-transition'){
  const roundDelta=event.to?.round-event.from?.round;
  if(![0,1].includes(roundDelta)||elapsed!==(roundDelta===1?10:0))return refuse('Seul un Tour réel attesté sans saut manuel ou un vrai Round de +10 secondes peut expirer cette sanction.');
 }else return refuse('Type de transition temporelle non accepté pour cette sanction.');
 const skillCheck=inspectWrathCalendar(candidate);if(!skillCheck.ok)return refuse('Malus de compétences du Courroux invalide.');
 const checked=inspectPrayerCaps(candidate,{clock:toClock,checkClock:false});
 if(!checked.ok)return {ok:false,status:'requires-input',state:null,removed:[],needsInput:checked.needsInput};
 const lessons=inspectPrayerLessons(candidate);
 if(!lessons.ok)return {ok:false,status:'requires-input',state:null,removed:[],needsInput:lessons.needsInput};
 for(const item of subjectRows(candidate))for(const [index,effect] of (item.row.extensions?.v5?.divineEffects||[]).entries())
  if(calendarLayer(effect)&&!(Number.isSafeInteger(effect.deadline.atSeconds)&&effect.deadline.atSeconds>=0))return refuse(`Échéance divine invalide : ${item.path}.extensions.v5.divineEffects[${index}].`);
 for(const {caps} of checked.groups.values())for(const cap of caps){
  if(cap.deadline.atSeconds<=fromClock.campaignSeconds)return refuse('Une sanction est déjà échue au curseur de départ; résolution explicite requise.');
 }
 let next=clone(candidate),removed=[];
 for(const [subjectKey,{caps}] of checked.groups){
  if(!caps.some(cap=>fromClock.campaignSeconds<cap.deadline.atSeconds&&cap.deadline.atSeconds<=toClock.campaignSeconds))continue;
  const result=projectPrayerCap(next,subjectKey,null,{operation:'remove',now:toClock.campaignSeconds});
  if(!result.ok)return {ok:false,status:'requires-input',state:null,removed:[],needsInput:result.needsInput};
  next=result.state;removed.push(...result.removed);
 }
 for(const [subjectKey,{lessons:layers}] of lessons.groups){
  for(const lesson of layers){
   // A different or suspended scene does not advance this Round-based effect.
   if(event.kind!=='combat-transition'||event.from.sceneId!==lesson.roundAnchor.sceneId||event.to.sceneId!==lesson.roundAnchor.sceneId)continue;
   if(fromClock.combat.round>lesson.expiry.round)return refuse('La sanction de Leçons divines est déjà échue au Round de départ sans phase d’expiration attestée.');
   const phaseSeen=replayed.validatedPhases.some(phase=>phase.phase==='endOfRound'&&phase.moment==='afterEffects'
    &&phase.round===lesson.expiry.round&&phase.sceneId===lesson.roundAnchor.sceneId);
   if(phaseSeen){
    const projected=projectPrayerLesson(next,subjectKey,lesson,{operation:'remove'});
    if(!projected.ok)return {ok:false,status:'requires-input',state:null,removed:[],needsInput:projected.needsInput};
    next=projected.state;removed.push(...projected.removed);
   }else if(toClock.combat.round>lesson.expiry.round){
    return refuse('La phase de fin du Round de Leçons divines a été dépassée sans reçu afterEffects correspondant.');
   }else if(toClock.combat.round===lesson.expiry.round&&replayed.validatedPhases.some(phase=>phase.phase==='endOfRound'&&phase.round===lesson.expiry.round)){
    return refuse('La phase de fin du Round de Leçons divines n’a pas la borne afterEffects attendue.');
  }
  }
 }
 const roundCheck=inspectWrathRounds(next);if(!roundCheck.ok)return refuse('Sanctions du Courroux en Rounds divergentes.');
 if(event.kind==='combat-transition')for(const rows of roundCheck.groups.values())for(const layer of rows[0].layers){
  if((event.from.sceneId??'')!==layer.roundAnchor.sceneId||(event.to.sceneId??'')!==layer.roundAnchor.sceneId)continue;
  const ended=replayed.validatedPhases.some(phase=>phase.phase==='endOfRound'&&phase.moment==='afterEffects'&&(phase.sceneId??'')===layer.roundAnchor.sceneId&&phase.round===layer.roundDeadline);
  if(ended)for(const {item} of rows){const actor=participantAtPath(next,item.path);actor.extensions.v5.divineEffects=actor.extensions.v5.divineEffects.filter(row=>row.id!==layer.id);removed.push({path:item.path,effectId:layer.id});}
  else if(toClock.combat.round>layer.roundDeadline)return refuse('Échéance de Rounds dépassée sans expiration attestée.');
 }
 const calendar=expireCalendarLayers(next,toClock.campaignSeconds);
 next=calendar.state;removed.push(...calendar.removed);
 return {ok:true,status:removed.length?'applied':'unchanged',state:next,removed,needsInput:[]};
}




