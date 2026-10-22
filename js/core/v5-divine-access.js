import registry from '../data/v5-divine-contracts.json' with {type:'json'};
/** Pure, exact-scope authorization for V5 divine prayers (DIV-02). */
const clone=value=>structuredClone(value);
const isObject=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
const fail=(code,error)=>({ok:false,code,error});
const canonical=(current)=>isObject(current)&&current.schemaVersion===1&&Array.isArray(current.grants)
 &&Object.keys(current).every(key=>key==='schemaVersion'||key==='grants');
function validGrant(row){
 if(!isObject(row)||!text(row.id)||!text(row.actorId)||!text(row.subjectKey)||!text(row.tradition)||!text(row.prayerId)||!text(row.reason)||row.reason.length>1000||row.decisionId!=='DIV-02'||(row.createdBy!==undefined&&row.createdBy!=='MJ')||!['once','scene','durable'].includes(row.scope)||!['active','revoked','consumed'].includes(row.status)||!Number.isSafeInteger(row.createdRevision)||row.createdRevision<0)return false;
 if(row.scope==='scene'?!text(row.sceneId):row.sceneId!==null)return false;
 if(row.status==='active'&&(row.consumedBy!==undefined||row.revokedRevision!==undefined||row.revokedReason!==undefined))return false;
 if(row.status==='consumed'&&(row.scope!=='once'||!text(row.consumedBy)||!Number.isSafeInteger(row.consumedRevision)||row.revokedReason!==undefined))return false;
 if(row.status==='revoked'&&(!text(row.revokedReason)||!Number.isSafeInteger(row.revokedRevision)||row.consumedBy!==undefined))return false;
 return true;
}
const contractOkay=contract=>isObject(contract)&&text(contract.id)&&['blessing','miracle'].includes(contract.type)
  && contract.status!=='blocked'&&['implemented','assisted','manual'].includes(contract.status)
  && text(contract.requiredTalent?.id)&&text(contract.requiredTalent?.specialization)
  && isObject(contract.source)&&isObject(contract.sourceReceipt);
const requiredTalent=(actor,contract)=>{
 const req=contract.requiredTalent,ids=new Set([req.id,req.catalogueTalentId].filter(Boolean));
 return (Array.isArray(actor?.talents)?actor.talents:[]).some(row=>row?.status==='resolved'&&ids.has(row.id)
  && Number.isSafeInteger(Number(row.rank))&&Number(row.rank)>=1
  && fold(row.specialization??row.specialty??req.specialization)===fold(req.specialization));
};
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function accessResult(access){return {...access,access};}


const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function stable(value){return Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;}
export const wrathAccessRules=Object.freeze({'wrath:106-110':{dice:1},'wrath:116-120':{dice:2}});
export function validateDivineAccessSuspensions(actor){
 const layers=(actor?.extensions?.v5?.divineEffects||[]).filter(row=>row.type==='divine-access-suspension'),bad=()=>({ok:false,layers:[],needsInput:[{field:'actor.extensions.v5.divineEffects',label:'Suspension des talents divins invalide ou non sourcée.'}]});
 if(new Set(layers.map(row=>row.id)).size!==layers.length)return bad();
 const fiche=actor?.extensions?.ficheId||actor?.ficheSnapshot?.charId,keys=new Set(['instance:'+actor?.id,'persistent:'+actor?.id,...(fiche?['fiche:'+fiche]:[]),...(actor?.persistentCharacterId?['persistent:'+actor.persistentCharacterId]:[]),...(actor?.extensions?.v5?.resourceCharacterId?['local:'+actor.extensions.v5.resourceCharacterId]:[])]);
 for(const layer of layers){const rule=wrathAccessRules[layer.resultId],row=registry.wrathTable.find(row=>row.id===layer.resultId),d=layer.duration,p=layer.wrathProof;
  if(!rule||layer.ruleVersion!==1||!text(layer.originExecutionId)||layer.id!=='wrath-access:'+layer.originExecutionId||!keys.has(layer.subjectKey)||!text(layer.cult)||!same(layer.source,row.source)||!same(layer.suspendedTalentIds,['talent-bless','talent-invoke'])
   ||!Number.isSafeInteger(d?.roll)||d.roll<rule.dice||d.roll>10*rule.dice||!Number.isSafeInteger(d.sinAtTrigger)||d.sinAtTrigger<1||d.value!==d.roll+d.sinAtTrigger||d.unit!=='days'||d.seconds!==d.value*86400
   ||!Number.isSafeInteger(layer.clockAnchor?.campaignSeconds)||layer.clockAnchor.campaignSeconds<0||!Number.isSafeInteger(layer.clockAnchor.clockRevision)||layer.clockAnchor.clockRevision<0
   ||layer.deadline?.kind!=='campaign-time'||!Number.isSafeInteger(layer.deadline.atSeconds)||layer.deadline.atSeconds!==layer.clockAnchor.campaignSeconds+d.seconds
   ||!p||p.resultId!==row.id||p.sinAtTest!==d.sinAtTrigger||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||![0,10,20,30].includes(p.roll+10*p.sinAtTest-p.modifiedRoll)||p.modifiedRoll<row.min||p.modifiedRoll>row.max)return bad();
 }
 return {ok:true,layers:clone(layers),needsInput:[]};
}
export function readDivineRejections(actor){
 const records=actor?.extensions?.v5?.divineRejections??[],bad=()=>({ok:false,records:[],needsInput:[{field:'actor.extensions.v5.divineRejections',label:'Rejet divin invalide, sujet ou source à vérifier.'}]});if(!Array.isArray(records)||records.some(row=>!isObject(row))||new Set(records.map(row=>row.id)).size!==records.length)return bad();
 const fiche=actor?.extensions?.ficheId||actor?.ficheSnapshot?.charId,keys=new Set(['instance:'+actor?.id,'persistent:'+actor?.id,...(actor?.profileId?['profile:'+actor.profileId]:[]),...(fiche?['fiche:'+fiche]:[]),...(actor?.persistentCharacterId?['persistent:'+actor.persistentCharacterId]:[]),...(actor?.extensions?.v5?.resourceCharacterId?['local:'+actor.extensions.v5.resourceCharacterId]:[])]);
 for(const row of records){const source=registry.wrathTable.find(item=>item.id===row.resultId),p=row.wrathProof,ids=row.penanceIds||[];if(!['temporary','permanent'].includes(row.kind)||row.resultId!==(row.kind==='temporary'?'wrath:136-140':'wrath:146-150')||row.id!=='wrath-rejection:'+row.originExecutionId||row.ruleVersion!==1||!text(row.originExecutionId)||!keys.has(row.subjectKey)||!text(row.cult)||!same(row.source,source?.source)||!Number.isSafeInteger(row.stage)||row.stage<0||row.stage>2||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!text(id))||ids.length!==(row.kind==='temporary'?row.stage:0)||row.kind==='permanent'&&row.stage!==0||!p||p.resultId!==(text(row.judgmentId)?'wrath:151-plus':row.resultId)||!Number.isSafeInteger(p.sinAtTest)||p.sinAtTest<1||!Number.isSafeInteger(p.roll)||p.roll<1||p.roll>100||![0,10,20,30].includes(p.roll+10*p.sinAtTest-p.modifiedRoll)||p.modifiedRoll<(text(row.judgmentId)?151:source.min)||p.modifiedRoll>(text(row.judgmentId)?Infinity:source.max))return bad();
 if(row.kind==='permanent'){const loss=row.prayLoss;if(row.lossConfirmedBy!=='MJ'||!Array.isArray(row.removedTalents||[])||!text(loss?.skillId)||!Number.isSafeInteger(loss.advances)||loss.advances<0||!Number.isSafeInteger(loss.scoreBefore)||loss.scoreBefore<loss.advances||loss.scoreAfter!==loss.scoreBefore-loss.advances)return bad();}
 for(let index=0;index<ids.length;index++){const penance=(actor?.extensions?.v5?.divinePenances||[]).find(item=>item.id===ids[index]);if(penance?.status!=='completed'||fold(penance.cult)!==fold(row.cult)||!penance.divineRejectionProgress?.some(progress=>progress.recordId===row.id&&progress.stage===index+1))return bad();}
 }return {ok:true,records:clone(records),needsInput:[]};
}
export function divineSocialRestriction(actor,action={},settings={}){
 const checked=readDivineRejections(actor);if(!checked.ok)return {applies:false,needsInput:checked.needsInput};const active=checked.records.filter(row=>row.kind==='permanent'||row.stage<2);if(!active.length)return {applies:false,needsInput:[]};
 const id=action.extensions?.fiche?.skillId||settings.context?.skillId,skill=(actor?.skills||[]).find(row=>row.id===id),name=fold(skill?.name||action.label||action.note||action.name||'');if(['priere','pray'].includes(name)||id==='skill-50_72_69_e8_72_65-base')return {applies:false,needsInput:[]};
 const social=(settings.kind||(['attack','attaque'].includes(action.type)?'melee':'test'))==='test'&&(action.attr==='Soc'||/^(charme|commandement|commerage|marchandage|intimidation|representation|charm|leadership|gossip|haggle|bribery|intimidate|entertain)(\b|\s|\()/i.test(name)||settings.context?.socialInteraction===true);if(!social)return {applies:false,needsInput:[]};
 const facts=settings.context?.divineCultMembership||{},cults=[...new Set(active.map(row=>row.cult))],missing=cults.filter(cult=>typeof facts[cult]!=='boolean');if(missing.length)return {applies:false,needsInput:missing.map(cult=>({field:'v5.context.divineCultMembership.'+cult,label:'Confirmer si l’interaction concerne un membre du culte de '+cult+'.'}))};const records=active.filter(row=>facts[row.cult]===true);return {applies:records.length>0,records,needsInput:[]};
}

/** Les règles de culte et les suspensions s'appliquent avant toute dérogation DIV-02. */
export function resolveDivineTalentRestriction(actor,{cult,talentId}={}){
 const blocked=(code,reason,needsInput=[],source=null)=>({allowed:false,status:needsInput.length?'requires-input':'blocked',code,reason,needsInput,source:source?clone(source):null});
 const rejected=readDivineRejections(actor);if(!rejected.ok)return blocked('DIVINE_DATA_REQUIRED','Rejet divin à vérifier.',rejected.needsInput);const rejection=rejected.records.find(row=>fold(row.cult)===fold(cult)&&(row.kind==='permanent'||row.stage<(talentId==='talent-invoke'?2:1)));if(rejection)return blocked('DIVINE_REJECTION',rejection.kind==='permanent'?'Rejet définitif du dieu : cet accès est perdu.':'Excommunication : Béni revient après la première pénitence, Invocation après la deuxième.',[],rejection.source);
 const checked=validateDivineAccessSuspensions(actor);if(!checked.ok)return blocked('DIVINE_DATA_REQUIRED','Suspension divine à vérifier.',checked.needsInput);
 const layer=checked.layers.find(row=>fold(row.cult)===fold(cult)&&row.suspendedTalentIds.includes(talentId));
 if(layer)return blocked('DIVINE_ACCESS_SUSPENDED','Courroux : Béni et Invocation ('+layer.cult+') sont suspendus jusqu’à leur échéance calendaire.',[],clone(layer.source));
 const key=fold(cult);if(!['solkan','stromfels'].includes(key))return {allowed:true,status:'ready',needsInput:[]};
 const source=registry.contracts.find(row=>row.id==='divine:blessing:'+key+':battle')?.source;
 if(!source)return blocked('DIVINE_SOURCE_REQUIRED','Source du culte absente du registre.');
 const sin=actor?.extensions?.v5?.divine?.sin;
 if(!Number.isSafeInteger(sin)||sin<0)return blocked('DIVINE_DATA_REQUIRED','Total de Péchés connu requis pour '+cult+'.',[{field:'actor.extensions.v5.divine.sin',label:'Péchés connus du prêtre'}],source);
 if(key==='solkan'){
  const corruption=actor?.extensions?.v5?.corruptionPoints;
  if(!Number.isSafeInteger(corruption)||corruption<0)return blocked('DIVINE_DATA_REQUIRED','Solkan : valeur connue de Corruption requise, aucune valeur zéro supposée (L02 p.55).',[{field:'actor.extensions.v5.corruptionPoints',label:'Corruption connue, entière et positive ou nulle'}],source);
  if(sin>0||corruption>0)return blocked('SOLKAN_PURITY','Solkan refuse Bénédiction et Miracle avec le moindre Péché ou Point de Corruption (L02 p.55).',[],source);
 }else if(sin>=(talentId==='talent-invoke'?2:5))return blocked('STROMFELS_SIN','Stromfels refuse Invocation dès 2 Péchés et Béni dès 5 (L25 p.91).',[],source);
 return {allowed:true,status:'ready',needsInput:[],source:clone(source)};
}

/** Resolve canonical-sheet access first, then an exact active exception. */
export function resolveDivineAccess(current,{actor,subjectKey,contract,activeScene=null,executionId=null}={}){
 const denied=(reason,needsInput=[])=>accessResult({allowed:false,mode:'denied',grantId:null,reason,needsInput});
 if(!canonical(current)||(current.grants||[]).some(row=>!validGrant(row))||new Set((current.grants||[]).map(row=>row.id)).size!==(current.grants||[]).length)return denied('Registre de dérogations divines invalide.');
 if(!contractOkay(contract))return denied(!contract?'Prière inconnue dans le registre divin.':'Le contrat/source de cette prière est bloqué ou incomplet.');
 if(!isObject(actor)||!text(actor.id))return denied('Acteur de prière introuvable.');
 const restriction=resolveDivineTalentRestriction(actor,{cult:contract.deity||contract.requiredTalent.specialization,talentId:contract.requiredTalent.id});
 if(!restriction.allowed)return accessResult({...restriction,mode:'denied',grantId:null});
 if(!requiredTalent(actor,contract))return resolveGrant('Talent d’accès '+(contract.requiredTalent.name||contract.requiredTalent.id)+' ('+contract.requiredTalent.specialization+') non acquis.');
 if(contract.type==='miracle'){
  const wanted=fold(contract.catalogueName||contract.labels?.canonicalName||contract.name);
  const known=(Array.isArray(actor.prayers)?actor.prayers:[]).some(row=>!['unresolved','open','blocked'].includes(row?.status)&&fold(row?.nom||row?.name)===wanted);
  if(!known)return resolveGrant('L’acquisition de ce miracle par le personnage n’est pas établie.');
 }
 return accessResult({allowed:true,mode:'sheet',grantId:null,reason:'Accès établi par la fiche.',needsInput:[]});
 function resolveGrant(reason){
  const sceneId=activeScene?.status==='active'?text(activeScene.id):null;
  const grant=(current.grants||[]).find(row=>validGrant(row)&&row.status==='active'&&row.subjectKey===subjectKey
   &&row.tradition===contract.requiredTalent.specialization&&row.prayerId===contract.id
   &&((row.scope==='durable')||(row.scope==='once'&&row.sceneId==null)
    ||(row.scope==='scene'&&sceneId!==null&&row.sceneId===sceneId)));
  return grant?accessResult({allowed:true,mode:'grant',grantId:grant.id,reason:'Dérogation MJ · '+grant.reason,needsInput:[],scope:grant.scope})
   :denied(reason,[{field:'actor.talents',label:reason}]);
 }
}
function validateTransitionBase(current){
 if(!canonical(current))return fail('invalid-registry','Registre de dérogations divines invalide.');
 const ids=new Set();for(const row of current.grants){if(!validGrant(row)||ids.has(row.id))return fail('invalid-registry','Entrée de dérogation invalide ou identifiant dupliqué.');ids.add(row.id);}
 return null;
}
export function createDivineAccessGrant(current,{actorId,subjectKey,contract,scope,sceneId=null,reason,revision,id,commandId}={}){
 const invalid=validateTransitionBase(current);if(invalid)return invalid;
 if(!contractOkay(contract))return fail('source-blocked','La source ou le contrat interdit cette dérogation.');
 if(!text(actorId)||!text(subjectKey))return fail('subject-required','Identité stable du sujet et acteur actif requis.');
 if(!['once','scene','durable'].includes(scope))return fail('scope-invalid','Choisissez une portée valide.');
 if(scope==='scene'&&(!text(sceneId)))return fail('scene-required','Une scène active est requise pour cette portée.');
 if(scope!=='scene'&&sceneId!==null)return fail('scene-invalid','Une scène ne peut être liée qu’à une dérogation de scène.');
 const why=text(reason);if(!why||why.length>1000)return fail('reason-required','Indiquez un motif de 1 à 1000 caractères.');
 if(!Number.isSafeInteger(revision)||revision<0)return fail('revision-invalid','Révision de base invalide.');
 const grantId=text(id);if(!grantId||current.grants.some(row=>row.id===grantId))return fail('id-invalid','Identifiant de dérogation absent ou déjà utilisé.');
 const grant={id:grantId,actorId:text(actorId),subjectKey:text(subjectKey),tradition:text(contract.requiredTalent.specialization),prayerId:contract.id,scope,sceneId:scope==='scene'?text(sceneId):null,
  reason:why,decisionId:'DIV-02',createdBy:'MJ',...(text(commandId)?{commandId:text(commandId)}:{}),status:'active',createdRevision:revision};
 const state={schemaVersion:1,grants:[...clone(current.grants),grant]};return {ok:true,state,grant:clone(grant)};
}
export function revokeDivineAccessGrant(current,{grantId,reason,revision,commandId}={}){
 const invalid=validateTransitionBase(current);if(invalid)return invalid;const idx=current.grants.findIndex(row=>row.id===grantId),old=current.grants[idx];
 if(!old||old.status!=='active')return fail('not-active','Cette dérogation n’est plus active.');
 const why=text(reason);if(!why||why.length>1000)return fail('reason-required','Indiquez le motif de révocation.');
 if(!Number.isSafeInteger(revision)||revision<0)return fail('revision-invalid','Révision de base invalide.');
 const grant={...old,status:'revoked',revokedRevision:revision,revokedReason:why,...(text(commandId)?{revokedCommandId:text(commandId)}:{})};
 const grants=clone(current.grants);grants[idx]=grant;return {ok:true,state:{schemaVersion:1,grants},grant:clone(grant)};
}
export function consumeDivineAccessGrant(current,{grantId,executionId,revision,commandId}={}){
 const invalid=validateTransitionBase(current);if(invalid)return invalid;const idx=current.grants.findIndex(row=>row.id===grantId),old=current.grants[idx];
 if(!old||old.status!=='active'||old.scope!=='once')return fail('not-consumable','Cette dérogation unique n’est plus disponible.');
 if(!text(executionId)||current.grants.some(row=>row.consumedBy===executionId))return fail('execution-replay','Cette exécution a déjà consommé une dérogation.');
 if(!Number.isSafeInteger(revision)||revision<0)return fail('revision-invalid','Révision de base invalide.');
 const grant={...old,status:'consumed',consumedBy:text(executionId),consumedRevision:revision,...(text(commandId)?{consumedCommandId:text(commandId)}:{})};
 const grants=clone(current.grants);grants[idx]=grant;return {ok:true,state:{schemaVersion:1,grants},grant:clone(grant)};
}
export function emptyDivineAccess(){return {schemaVersion:1,grants:[]};}
export function validateDivineAccessRegistry(value){
 if(value===undefined)return emptyDivineAccess();
 if(!canonical(value))throw new TypeError('Registre de dérogations divines mal formé.');
 const ids=new Set();for(const row of value.grants){
  if(!validGrant(row)||ids.has(row.id)||row.createdBy!=='MJ')throw new TypeError('Entrée de dérogation divine invalide.');
  ids.add(row.id);
 }
 return clone(value);
}










