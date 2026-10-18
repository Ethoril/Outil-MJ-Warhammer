/** Adaptateur du domaine divin : contrats canoniques, sources actuelles et commandes du Store. */
import registry from '../data/v5-divine-contracts.json' with {type:'json'};
import {getReferenceCatalogue} from './reference-catalog.js';
import {previewDivineExecution,applyDivineExecution,expireDivineEffects} from './v5-divine-engine.js';
import {refreshEffectLayers} from './v5-magic-effects.js';
import {uid} from './models.js';
import {resolveDivineAccess,createDivineAccessGrant,revokeDivineAccessGrant,consumeDivineAccessGrant,emptyDivineAccess} from './v5-divine-access.js';
import {v5ResourceIdentity} from './v5-resources.js';
import {advanceGameClock,readCombatPosition} from './v5-game-time.js';
import {validatePrayerSLCaps,getPrayerSLModifiers} from './v5-divine-prayer-caps.js';
import {acquireV5Conditions} from './v5-effects.js';

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
 return subjectRows(state).some(({row})=>(row.states||[]).some(condition=>condition?.divineWrathExecutionId===executionId
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

function context(state,contract,input){
 const participants=parts(state),actorId=input.actorId || state.combat?.currentActorId;
 const actor=participants.find(row=>row.id===actorId);
 if(!actor || actor.zone!=='active')return failure('blocked','Le personnage priant doit être présent en jeu.');
 if(!Array.isArray(input.targetIds || []))return failure('invalid','Liste de cibles invalide.');
 const ids=input.targetIds || [];
 if(new Set(ids).size!==ids.length)return failure('invalid','Une cible ne peut pas être sélectionnée deux fois.');
 const targets=ids.map(id=>participants.find(row=>row.id===id && row.zone==='active'));
 if(targets.some(row=>!row))return failure('invalid','Une cible sélectionnée n’est plus en jeu.');
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
 if(!access.allowed)return failure('blocked',access.reason);
 const captured={...ctx.input,sourceFingerprint:registry.sourceFingerprint,participants:clone(parts(state)),executionId:input.executionId || 'divine:'+uid(),divineAccessState:clone(divineAccessState(state)),divineSubjectKey:subjectKey,divineActiveScene:clone(state.activeScene||null),divineAccessDecision:clone(access),clockAnchor:clock?{campaignSeconds:clock.campaignSeconds,clockRevision:clock.revision,lastEventId:clock.lastEvent?.id??null}:null,prayerRoundAnchor:clone(roundAnchor)};
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
  }else if(wrathTableResult && typeof captured.wrathConsequences==='string' && captured.wrathConsequences.trim()){
   captured.wrathResult={resultId:wrathTableResult.id,source:clone(wrathTableResult.source),label:wrathTableResult.label,reminder:wrathTableResult.reminder,
    consequences:captured.wrathConsequences.trim(),resolvedBy:'MJ'};
   preview=previewDivineExecution(ctx.actor,contract,ctx.targets,captured);
  }
 }
 let calculated=preview.ready?applyDivineExecution(state,contract,captured):preview;
 if(calculated.ready){const conflict=unresolvedCombination(calculated.state);if(conflict)calculated=failure('blocked',conflict);}
 let wrathConditionPreview=null;
 if(calculated.ready&&captured.wrathConditionRuleId){
  const rule=wrathConditionRule(wrathTableResult?.id),postPrayerActor=parts(calculated.state).find(row=>row.id===ctx.actor.id);
  const projection=projectWrathConditions(postPrayerActor,rule,captured.executionId,calculated.preview.wrath.sinAtTest);
  if(!projection.ok)calculated=failure('requires-input','L’acquisition des États ne peut pas être préparée intégralement.',projection.needsInput);
  else wrathConditionPreview=projection.preview;
 }
 const result=calculated.ready?preview:{...preview,...calculated,preview:calculated.preview||preview.preview};
 return rememberPreview({...result,...(wrathConditionPreview?{wrathConditionPreview}:{}),contractId,contract:clone(contract),baseRevision:state.localRevision||0,baseStateFingerprint:stateFingerprint(state),baseClockFingerprint:JSON.stringify(clock),input:captured,access:clone(access),
  executionId:captured.executionId,sourceReceipt:clone(contract.sourceReceipt),wrathTableResult,wrathLessonDuration:clone(captured.wrathLessonDuration||null),ruleVersion:preview.ruleVersion});
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
  text:`${ctx.actor.name} · ${contract.name} · ${prayer.success?'prière réussie':'prière ratée'} (${prayer.sl} DR)${calculated.receipt.pendingWrath?' · Courroux à résoudre':''}${wrathSanction?' · Pensez à vos actes : cap +0 DR pendant huit jours':''}${wrathLesson?' · Leçons divines : −1 DR à Prière jusqu’à la fin du Round '+wrathLesson.expiry.round:''}`,
  detail:{kind:'divine',contractId:contract.id,executionId:captured.executionId,source:contract.source,reminders:calculated.receipt.reminders,...(access.mode==='grant'?{accessDecision:clone(next.extensions.v5.divineExecutions.find(row=>row.executionId===captured.executionId)?.accessDecision)}:{})}},...(next.log||[])].slice(0,300);
 return {...calculated,state:next};
}

export function setStoreDivineSin(state,actorId,value,{reason}={}){
 if(!Number.isSafeInteger(value)||value<0)throw ruleError('Le total de Péchés doit être un entier positif ou nul.');
 if(typeof reason!=='string'||!reason.trim())throw ruleError('Indiquez la raison de cet ajustement des Péchés.');
 if((state.extensions?.v5?.divineExecutions||[]).some(row=>row.actorId===actorId&&row.pendingWrath?.status==='pending'))throw ruleError('Résolvez d’abord le Courroux en attente avant de modifier les Péchés.');
 const next=clone(state),actor=parts(next).find(row=>row.id===actorId);if(!actor)throw ruleError('Personnage introuvable.');
 const before=actor.extensions?.v5?.divine?.sin;
 actor.extensions??={};actor.extensions.v5??={};actor.extensions.v5.divine??={};actor.extensions.v5.divine.sin=value;
 next.log=[{id:'divine-sin:'+uid(),kind:'management',actorId,actorName:actor.name,text:`${actor.name} · Péchés ${before??'non renseigné'} → ${value} · ${reason.trim()}`},...(next.log||[])].slice(0,300);
 return next;
}

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
 const receipt=(next.extensions?.v5?.divineExecutions||[]).find(row=>row.executionId===executionId);if(receipt)receipt.endedByMJ=reason.trim();
 next.log=[{id:executionId+':end',kind:'effect',text:'Prière terminée par le MJ · '+reason.trim()},...(next.log||[])].slice(0,300);
 return next;
}

/** Commande de finalisation : valide les combinaisons et recalcule les couches sans déduire de phases d'une différence d'état. */
export function finalizeDivineState(before,next){
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
 const calendar=expireCalendarLayers(next,toClock.campaignSeconds);
 next=calendar.state;removed.push(...calendar.removed);
 return {ok:true,status:removed.length?'applied':'unchanged',state:next,removed,needsInput:[]};
}




