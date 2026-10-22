import registry from '../data/v5-divine-contracts.json' with { type: 'json' };

const clone = value => structuredClone(value);
const ruleId = 'wrath:6-10:pray-sl-cap';
const rule = (registry.prayerSLRules || []).find(row => row.id === ruleId) || null;
const lessonsRuleId = 'wrath:11-15:pray-sl-modifier';
const lessonsRule = (registry.prayerSLRules || []).find(row => row.id === lessonsRuleId) || null;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const needs = (path, message) => ({ path, message });

function stableJSON(value) {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJSON(value[key])}`).join(',')}}`;
}
function hasOnlyKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
}
function subjectKeys(actor) {
  const keys = new Set();
  const fiche = actor?.extensions?.ficheId || actor?.ficheSnapshot?.charId;
  if (typeof fiche === 'string' && fiche) keys.add(`fiche:${fiche}`);
  if (typeof actor?.persistentCharacterId === 'string' && actor.persistentCharacterId) keys.add(`persistent:${actor.persistentCharacterId}`);
  if (typeof actor?.id === 'string' && actor.id) {
    keys.add(`instance:${actor.id}`);
    // Persistent rows use their canonical id while their combat mirrors carry persistentCharacterId.
    keys.add(`persistent:${actor.id}`);
  }
  if (typeof actor?.extensions?.v5?.resourceCharacterId === 'string' && actor.extensions.v5.resourceCharacterId)
    keys.add(`local:${actor.extensions.v5.resourceCharacterId}`);
  return keys;
}
function validCap(layer, actor) {
  const layerKeys = ['id','type','cap','originKind','originExecutionId','wrathResultId','ruleId','ruleVersion','targetId','subjectKey','source','sourceReceipt','duration','clockAnchor','deadline','wrathProof'];
  if (!rule || !hasOnlyKeys(layer, layerKeys)) return false;
  if (layer.type !== 'prayer-sl-cap' || layer.cap !== 0 || layer.originKind !== 'wrath'
    || layer.wrathResultId !== 'wrath:6-10' || layer.ruleId !== rule.id || layer.ruleVersion !== 1
    || typeof layer.id !== 'string' || layer.id !== `prayer-sl-cap:${layer.originExecutionId}`
    || typeof layer.originExecutionId !== 'string' || !layer.originExecutionId
    || typeof layer.targetId !== 'string' || !layer.targetId || typeof layer.subjectKey !== 'string' || !layer.subjectKey
    || (actor && !subjectKeys(actor).has(layer.subjectKey))
    || !hasOnlyKeys(layer.duration,['value','sourceValue','sourceUnit','unit','days','seconds','conversionPolicyId','secondPolicyId'])
    || layer.duration?.value !== 1 || layer.duration?.sourceValue !== 1 || layer.duration?.sourceUnit !== 'imperial-week'
    || layer.duration?.unit !== 'imperial-week' || layer.duration?.days !== 8 || layer.duration?.seconds !== 691200
    || layer.duration?.conversionPolicyId !== 'imperial-week-8-days' || layer.duration?.secondPolicyId !== 'campaign-day-86400s'
    || !hasOnlyKeys(layer.clockAnchor,['campaignSeconds','clockRevision','lastEventId'])
    || !Number.isSafeInteger(layer.deadline?.atSeconds) || layer.deadline.atSeconds < 0
    || !hasOnlyKeys(layer.deadline,['kind','atSeconds']) || layer.deadline?.kind !== 'campaign-time'
    || !Number.isSafeInteger(layer.clockAnchor?.campaignSeconds) || layer.clockAnchor.campaignSeconds < 0
    || !Number.isSafeInteger(layer.clockAnchor?.clockRevision) || layer.clockAnchor.clockRevision < 0
    || !(layer.clockAnchor.lastEventId === null || typeof layer.clockAnchor.lastEventId === 'string')
    || (layer.clockAnchor.clockRevision === 0 && (layer.clockAnchor.campaignSeconds !== 0 || layer.clockAnchor.lastEventId !== null))
    || (layer.clockAnchor.clockRevision > 0 && (typeof layer.clockAnchor.lastEventId !== 'string' || !layer.clockAnchor.lastEventId.trim()))) return false;
  if (!Number.isSafeInteger(layer.clockAnchor.campaignSeconds + layer.duration.seconds)
    || layer.deadline.atSeconds !== layer.clockAnchor.campaignSeconds + layer.duration.seconds) return false;
  const sourceReceiptDuration=rule.sourceReceipt?.duration;
  if (stableJSON(layer.source) !== stableJSON(rule.source)
    || stableJSON(layer.sourceReceipt) !== stableJSON(rule.sourceReceipt)
    || layer.duration.sourceValue !== sourceReceiptDuration?.sourceValue
    || layer.duration.sourceUnit !== sourceReceiptDuration?.sourceUnit
    || layer.duration.days !== sourceReceiptDuration?.days
    || layer.duration.seconds !== sourceReceiptDuration?.seconds
    || layer.duration.conversionPolicyId !== sourceReceiptDuration?.conversionPolicyId
    || layer.duration.secondPolicyId !== sourceReceiptDuration?.secondPolicyId) return false;
  const proof = layer.wrathProof;
  if (!hasOnlyKeys(proof,['schemaVersion','originExecutionId','trigger','prayer','wrath'])
    || !hasOnlyKeys(proof.trigger,['fumble','sinThreshold']) || !hasOnlyKeys(proof.prayer,['initialRoll','roll','optionId','reversed','success','fumble','sl'])
    || !hasOnlyKeys(proof.wrath,['roll','modifiedRoll','sinAtTest','resultId'])
    || proof.schemaVersion !== 1 || proof.originExecutionId !== layer.originExecutionId
    || typeof proof.trigger?.fumble !== 'boolean' || typeof proof.trigger?.sinThreshold !== 'boolean'
    || (!proof.trigger.fumble && !proof.trigger.sinThreshold)
    || !Number.isSafeInteger(proof.prayer?.initialRoll) || proof.prayer.initialRoll < 1 || proof.prayer.initialRoll > 100
    || !Number.isSafeInteger(proof.prayer?.roll) || proof.prayer.roll < 1 || proof.prayer.roll > 100
    || !['keep', 'reverse'].includes(proof.prayer.optionId) || typeof proof.prayer.reversed !== 'boolean'
    || typeof proof.prayer.fumble !== 'boolean'
    || proof.prayer.reversed !== (proof.prayer.optionId === 'reverse')
    || proof.prayer.roll !== (proof.prayer.reversed ? proof.prayer.initialRoll === 100 ? 100 : (proof.prayer.initialRoll % 10) * 10 + Math.floor(proof.prayer.initialRoll / 10) : proof.prayer.initialRoll)
    || typeof proof.prayer.success !== 'boolean' || proof.prayer.fumble !== ((proof.prayer.roll === 100 || proof.prayer.roll % 11 === 0) && !proof.prayer.success)
    || !Number.isSafeInteger(proof.prayer.sl)
    || !Number.isSafeInteger(proof.wrath?.roll) || proof.wrath.roll < 1 || proof.wrath.roll > 100
    || !Number.isSafeInteger(proof.wrath?.sinAtTest) || proof.wrath.sinAtTest < 0
    || proof.trigger.fumble!==proof.prayer.fumble
    || proof.trigger.sinThreshold!==(proof.prayer.roll%10<=proof.wrath.sinAtTest)
    || ![0, 10, 20, 30].includes(proof.wrath.roll + 10 * proof.wrath.sinAtTest - proof.wrath.modifiedRoll)
    || proof.wrath.resultId !== 'wrath:6-10' || proof.wrath.modifiedRoll < 6 || proof.wrath.modifiedRoll > 10) return false;
  return true;
}

function validLessonsModifier(layer, actor) {
  const keys=['id','type','amount','originKind','originExecutionId','wrathResultId','ruleId','ruleVersion','targetId','subjectKey','source','sourceReceipt','duration','roundAnchor','expiry','wrathProof'];
  if(!lessonsRule||!hasOnlyKeys(layer,keys)||layer.type!=='prayer-sl-modifier'||layer.amount!==-1
    ||layer.originKind!=='wrath'||layer.wrathResultId!=='wrath:11-15'||layer.ruleId!==lessonsRule.id||layer.ruleVersion!==1
    ||typeof layer.originExecutionId!=='string'||!layer.originExecutionId||layer.id!==`prayer-sl-modifier:${layer.originExecutionId}`
    ||typeof layer.targetId!=='string'||!layer.targetId||typeof layer.subjectKey!=='string'||!layer.subjectKey
    ||(actor&&!subjectKeys(actor).has(layer.subjectKey))
    ||stableJSON(layer.source)!==stableJSON(lessonsRule.source)||stableJSON(layer.sourceReceipt)!==stableJSON(lessonsRule.sourceReceipt)
    ||stableJSON(lessonsRule.roundPolicy)!==stableJSON({currentRoundCountsAsFirst:true,expiryPhase:'endOfRound',expiryMoment:'afterEffects',decisionId:'DIV-TIME-LESSONS-01',decisionProvenance:{kind:'user-arbitration',statement:'Fin du Nᵉ Round, en comptant le Round actuel comme premier Round',example:{anchorRound:4,durationRoll:3,sinAtTrigger:1,rounds:4,expiryRound:7}}})
    ||!hasOnlyKeys(layer.duration,['roll','sinAtTrigger','rounds','unit'])||layer.duration.unit!=='rounds'
    ||!Number.isSafeInteger(layer.duration.roll)||layer.duration.roll<1||layer.duration.roll>10
    ||!Number.isSafeInteger(layer.duration.sinAtTrigger)||layer.duration.sinAtTrigger<0
    ||!Number.isSafeInteger(layer.duration.rounds)||layer.duration.rounds!==layer.duration.roll+layer.duration.sinAtTrigger
    ||!hasOnlyKeys(layer.roundAnchor,['sceneId','round'])
    ||!(layer.roundAnchor.sceneId===null||(typeof layer.roundAnchor.sceneId==='string'&&layer.roundAnchor.sceneId.trim()))
    ||!Number.isSafeInteger(layer.roundAnchor.round)||layer.roundAnchor.round<1
    ||!Number.isSafeInteger(layer.expiry?.round)||!hasOnlyKeys(layer.expiry,['round','phase','moment'])||layer.expiry.phase!=='endOfRound'||layer.expiry.moment!=='afterEffects'
    ||!Number.isSafeInteger(layer.roundAnchor.round+layer.duration.rounds-1)||layer.expiry.round!==layer.roundAnchor.round+layer.duration.rounds-1
    ||!hasOnlyKeys(layer.wrathProof,['schemaVersion','originExecutionId','durationRoll','prayer','wrath'])
    ||layer.wrathProof.schemaVersion!==1||layer.wrathProof.originExecutionId!==layer.originExecutionId
    ||layer.wrathProof.durationRoll!==layer.duration.roll
    ||!hasOnlyKeys(layer.wrathProof.prayer,['initialRoll','roll','optionId','reversed','success','fumble','sl'])
    ||!hasOnlyKeys(layer.wrathProof.wrath,['roll','modifiedRoll','sinAtTest','resultId'])
    ||!Number.isSafeInteger(layer.wrathProof.prayer?.initialRoll)||layer.wrathProof.prayer.initialRoll<1||layer.wrathProof.prayer.initialRoll>100
    ||!Number.isSafeInteger(layer.wrathProof.prayer?.roll)||layer.wrathProof.prayer.roll<1||layer.wrathProof.prayer.roll>100
    ||!['keep','reverse'].includes(layer.wrathProof.prayer.optionId)||typeof layer.wrathProof.prayer.reversed!=='boolean'
    ||layer.wrathProof.prayer.reversed!==(layer.wrathProof.prayer.optionId==='reverse')
    ||layer.wrathProof.prayer.roll!==(layer.wrathProof.prayer.reversed?(layer.wrathProof.prayer.initialRoll===100?100:(layer.wrathProof.prayer.initialRoll%10)*10+Math.floor(layer.wrathProof.prayer.initialRoll/10)):layer.wrathProof.prayer.initialRoll)
    ||typeof layer.wrathProof.prayer.success!=='boolean'||typeof layer.wrathProof.prayer.fumble!=='boolean'
    ||layer.wrathProof.prayer.fumble!==((layer.wrathProof.prayer.roll===100||layer.wrathProof.prayer.roll%11===0)&&!layer.wrathProof.prayer.success)
    ||!Number.isSafeInteger(layer.wrathProof.prayer.sl)
    ||!Number.isSafeInteger(layer.wrathProof.wrath?.roll)||layer.wrathProof.wrath.roll<1||layer.wrathProof.wrath.roll>100
    ||layer.wrathProof.wrath.sinAtTest!==layer.duration.sinAtTrigger
    ||![0,10,20,30].includes(layer.wrathProof.wrath.roll+10*layer.wrathProof.wrath.sinAtTest-layer.wrathProof.wrath.modifiedRoll)
    ||layer.wrathProof.wrath.resultId!=='wrath:11-15'||layer.wrathProof.wrath.modifiedRoll<11||layer.wrathProof.wrath.modifiedRoll>15
    ||(!layer.wrathProof.prayer.fumble&&layer.wrathProof.prayer.roll%10>layer.wrathProof.wrath.sinAtTest)) return false;
  return true;
}

/** Validate the structure and independent source/proof carried by each active cap. */
export function validatePrayerSLCaps(actor, { clock = null } = {}) {
  const layers = actor?.extensions?.v5?.divineEffects || [];
  if (!Array.isArray(layers)) return { ok: false, status: 'requires-input', needsInput: [needs('extensions.v5.divineEffects', 'Couches divines invalides.')] };
  const caps = [];
  for (const [index, layer] of layers.entries()) {
    if (layer?.type !== 'prayer-sl-cap') continue;
    if (!validCap(layer, actor)) return { ok: false, status: 'requires-input', needsInput: [needs(`extensions.v5.divineEffects[${index}]`, 'Sanction calendaire de Prière invalide ou non sourcée.')] };
    if (clock && (layer.clockAnchor.clockRevision > clock.revision || layer.clockAnchor.campaignSeconds > clock.campaignSeconds
      || (layer.clockAnchor.clockRevision === clock.revision && (layer.clockAnchor.campaignSeconds !== clock.campaignSeconds
        || layer.clockAnchor.lastEventId !== (clock.lastEvent?.id ?? null))))) return { ok: false, status: 'requires-input', needsInput: [needs(`extensions.v5.divineEffects[${index}].clockAnchor`, 'Ancre de sanction postérieure ou distincte du curseur attesté.')] };
    caps.push(layer);
  }
  return { ok: true, status: caps.length ? 'valid' : 'unchanged', caps: clone(caps), needsInput: [] };
}

/** Apply only the maximum +0 SL to a successful selected Prayer Test. */
export function applyPrayerSLCaps(actor, test) {
  const ban=wrathPrayerBan(actor);if(ban)return {ok:false,status:ban.status,test:clone(test),caps:[],needsInput:[{path:"extensions.v5.divineEffects",message:ban.error}]};
  const checked = validatePrayerSLCaps(actor);
  if (!checked.ok) return { ok: false, status: 'requires-input', test: clone(test), caps: [], needsInput: checked.needsInput };
  const copy = clone(test);
  if (!checked.caps.length || copy?.success !== true || !Number.isSafeInteger(copy.sl) || copy.sl <= 0) {
    return { ok: true, status: 'unchanged', test: copy, caps: [], needsInput: [] };
  }
  const active = checked.caps.map(layer => ({ effectId: layer.id, ruleId: layer.ruleId, rawSL: copy.sl, effectiveSL: 0 }));
  copy.sl = 0;
  copy.zeroOutcome = 'marginalSuccess';
  return { ok: true, status: 'applied', test: copy, caps: active, needsInput: [] };
}

/** Return source-validated ordinary SL modifiers to add before the shared Test engine. */
export function getPrayerSLModifiers(actor,{sceneId,round}={}) {
  const layers=actor?.extensions?.v5?.divineEffects||[];
  if(!Array.isArray(layers))return {ok:false,status:'requires-input',modifiers:[],needsInput:[needs('extensions.v5.divineEffects','Couches divines invalides.')]};
  const modifiers=[];
  for(const [index,layer] of layers.entries()){
    if(layer?.type!=='prayer-sl-modifier')continue;
    if(!validLessonsModifier(layer,actor))return {ok:false,status:'requires-input',modifiers:[],needsInput:[needs(`extensions.v5.divineEffects[${index}]`,'Malus de Prière du Courroux invalide ou non sourcé.')]};
    if(sceneId!==undefined&&(layer.roundAnchor.sceneId!==sceneId||!Number.isSafeInteger(round)||round<layer.roundAnchor.round||round>layer.expiry.round))
      return {ok:false,status:'requires-input',modifiers:[],needsInput:[needs(`extensions.v5.divineEffects[${index}].roundAnchor`,'Repère de scène ou Round incompatible avec la durée du malus; résolution explicite requise.')]};
    modifiers.push({id:layer.id,label:'Courroux « Leçons divines » : malus à Prière',amount:layer.amount,ruleId:layer.ruleId,effectId:layer.id});
  }
  if(modifiers.length>1)return {ok:false,status:'requires-input',modifiers:[],needsInput:[needs('extensions.v5.divineEffects','Plusieurs sanctions « Leçons divines » actives : cumul non défini par la source.')]};
  return {ok:true,status:modifiers.length?'active':'unchanged',modifiers,needsInput:[]};
}

export const prayerSLCapRuleId = ruleId;

// B05 : données de calcul, liées à la table canonique L06 p.218.
export const wrathRoundRules = Object.freeze({
 'wrath:21-25':{mode:'ban',dice:1,perSin:0},
 'wrath:31-35':{mode:'ban',dice:1,perSin:1},
 'wrath:46-50':{mode:'ban',dice:2,perSin:1},
 'wrath:76-80':{mode:'forced',dice:1,perSin:1}
});
export function validateWrathRounds(actor){
 const layers=actor?.extensions?.v5?.divineEffects||[],bad=message=>({ok:false,layers:[],needsInput:[{field:'extensions.v5.divineEffects',message,label:message}]});
 if(!Array.isArray(layers))return bad('Couches du Courroux invalides.');
 const active=[];
 for(const layer of layers){
  if(layer?.type!=='wrath-round-rule')continue;
  const rule=wrathRoundRules[layer.resultId],row=registry.wrathTable.find(row=>row.id===layer.resultId),proof=layer.wrathProof;
  if(!rule||layer.mode==='forced'&&(typeof layer.cult!=='string'||!layer.cult.trim())||!subjectKeys(actor).has(layer.subjectKey)||layer.ruleVersion!==1||layer.mode!==rule.mode||!row||stableJSON(layer.source)!==stableJSON(row.source)
   ||typeof layer.originExecutionId!=='string'||!layer.originExecutionId||layer.id!=='wrath-round:'+layer.originExecutionId
   ||!Number.isSafeInteger(layer.durationRoll)||layer.durationRoll<rule.dice||layer.durationRoll>10*rule.dice
   ||!Number.isSafeInteger(layer.sinAtTrigger)||layer.sinAtTrigger<1||layer.rounds!==layer.durationRoll+rule.perSin*layer.sinAtTrigger
   ||!['current','next'].includes(layer.roundPolicy)||!Number.isSafeInteger(layer.roundAnchor?.round)||layer.roundAnchor.round<1
   ||typeof layer.roundAnchor.sceneId!=='string'
   ||layer.roundDeadline!==layer.roundAnchor.round+layer.rounds-(layer.roundPolicy==='current'?1:0)||!Number.isSafeInteger(layer.roundDeadline)
   ||!proof||proof.sinAtTest!==layer.sinAtTrigger||proof.resultId!==layer.resultId||!Number.isSafeInteger(proof.roll)||proof.roll<1||proof.roll>100
   ||![0,10,20,30].includes(proof.roll+10*proof.sinAtTest-proof.modifiedRoll)||proof.modifiedRoll<row.min||proof.modifiedRoll>row.max
   ||!layer.prayerProof||!Number.isSafeInteger(layer.prayerProof.roll)||layer.prayerProof.roll<1||layer.prayerProof.roll>100
   ||!(layer.prayerProof.fumble===true||layer.prayerProof.roll%10<=proof.sinAtTest)
   ||layer.mode==='forced'&&!['count-trigger','next-turn'].includes(layer.actionDecision))return bad('Sanction du Courroux en Rounds invalide ou non sourcée.');
  if(active.some(row=>row.id===layer.id))return bad('Occurrence du Courroux dupliquée.');
  if(layer.prayerProof.fumble&&layer.prayerProof.roll!==100&&layer.prayerProof.roll%11!==0)return bad('Preuve de maladresse du Courroux invalide.');
  active.push(layer);
 }
 return {ok:true,layers:clone(active),needsInput:[]};
}
export function wrathPrayerBan(actor){
 const checked=validateWrathRounds(actor);
 if(!checked.ok)return {ready:false,status:'requires-input',error:checked.needsInput[0].message,needsInput:checked.needsInput};
 if(checked.layers.some(row=>row.mode==='ban'))return {ready:false,status:'blocked',code:'DIV-WRATH-PRAYER-BANNED',error:'Courroux : tout Test de Prière est interdit jusqu’à expiration attestée des Rounds.',needsInput:[]};
 return null;
}
export function wrathTurnPosition(state){
 const scene=state.activeScene,encounterId=scene?.encounterId||scene?.id||state.extensions?.v5?.combatId;
 const serial=scene?.extensions?.v5?.turnIndex??state.extensions?.v5?.turnIndex,actorId=state.combat?.currentActorId;
 return {encounterId:encounterId||null,turnId:encounterId&&actorId&&Number.isSafeInteger(serial)?(scene?.id||encounterId)+':'+serial+':'+actorId:null,actorId};
}
export function wrathActionSpent(state,actorId){
 const clock=wrathTurnPosition(state),key=JSON.stringify([clock.encounterId,clock.turnId]);
 return Boolean(clock.turnId&&((state.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===actorId&&row.encounterId===clock.encounterId&&row.turnId===clock.turnId)
  ||(state.extensions?.v5?.actionLedger?.quotaUsage||[]).some(row=>row.actorId===actorId&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0)));
}
export function wrathForcedPrayerGate(state,actorId,{prayer=false,endingTurn=false}={}){
 const actor=state.combat?.participants?.find(row=>row.id===actorId),checked=validateWrathRounds(actor);
 if(!checked.ok)return {ready:false,status:'requires-input',error:checked.needsInput[0].message,needsInput:checked.needsInput};
 const forced=checked.layers.filter(row=>row.mode==='forced');if(!forced.length)return null;
 const position=wrathTurnPosition(state),sceneId=state.activeScene?.status==='active'?state.activeScene.id:'';
 const block=(code,error)=>({ready:false,status:'requires-input',code,error,needsInput:[{field:'forcedPrayer',label:error}]});
 if(!position.turnId||position.actorId!==actorId||forced.some(row=>row.roundAnchor.sceneId!==sceneId||state.combat.round<row.roundAnchor.round||state.combat.round>row.roundDeadline))return block('DIV-WRATH-ROUND-ANCHOR','Courroux : Tour et ancre de Rounds concordants requis.');
 const executionIds=new Set([...(state.extensions?.v5?.divineExecutions||[]),...(state.extensions?.v5?.divineWrathRecoveries||[])].filter(row=>row.actorId===actorId).map(row=>row.executionId));
 const fulfilled=(state.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===actorId&&row.turnId===position.turnId&&row.encounterId===position.encounterId&&executionIds.has(row.actionId));
 const deferred=forced.every(row=>row.originTurnId===position.turnId&&row.actionDecision==='next-turn');
 if(endingTurn)return fulfilled||deferred?null:block('DIV-WRATH-PRAYER-REQUIRED','Courroux : une Prière comme Action est requise avant la fin du Tour.');
 if(!prayer)return block('DIV-WRATH-PRAYER-REQUIRED','Courroux : seule une Prière peut servir d’Action.');
 if(wrathActionSpent(state,actorId))return block('DIV-WRATH-ACTION-SPENT','Courroux : l’Action de ce Tour est déjà dépensée, aucune Prière supplémentaire.');
 return null;
}
