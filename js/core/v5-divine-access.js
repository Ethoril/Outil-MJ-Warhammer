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

/** Resolve canonical-sheet access first, then an exact active exception. */
export function resolveDivineAccess(current,{actor,subjectKey,contract,activeScene=null,executionId=null}={}){
 const denied=(reason,needsInput=[])=>accessResult({allowed:false,mode:'denied',grantId:null,reason,needsInput});
 if(!canonical(current)||(current.grants||[]).some(row=>!validGrant(row))||new Set((current.grants||[]).map(row=>row.id)).size!==(current.grants||[]).length)return denied('Registre de dérogations divines invalide.');
 if(!contractOkay(contract))return denied(!contract?'Prière inconnue dans le registre divin.':'Le contrat/source de cette prière est bloqué ou incomplet.');
 if(!isObject(actor)||!text(actor.id))return denied('Acteur de prière introuvable.');
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










