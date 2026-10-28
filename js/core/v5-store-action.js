import {wrathPrayerBan,wrathForcedPrayerGate,validateWrathRounds} from './v5-divine-prayer-caps.js';
import {withMomentum} from './v5-combat-rules.js';
import { acquiredV5Talents,currentV5TalentHashes } from './v5-talents.js';
import { sourceActive } from './v5-talent-actions.js';
import { v5ResourceIdentity } from './v5-resources.js';
import { validateV5ReactionInput, registerV5ReactionOpportunities } from './v5-reactions.js';
/** Bridge from the durable Store envelope to the pure V5 action transaction. */
import { previewV5ActionCosts, prepareV5ActionState, commitV5ActionCosts } from './v5-action-costs.js';
import { projectV5Resources, commitV5Resources, commitV5Fate, v5CombatActionClock } from './v5-resources.js';
import { effectiveOrder } from './turn-order.js';
import { planNaturalAttack } from './creature-combat.js';
import { weaponHandsForParticipant } from './equipment.js';
import { planManyHeads, headRegistryOf, hasManyHeads, headAttackKeyOf } from './creature-heads.js';
import { defaultResolutionId, previewResolution } from './resolution.js';
import { FREE_REROLL_SOURCE, freeRerollLayers, consumeFreeReroll, reverseDiceLayers, consumeReverseDice } from './v5-divine-effects-conditions.js';
import { slExtremeLayers, consumeSlExtreme } from './v5-divine-effects-tests.js';
const clone = structuredClone;
const quotaClock = clock => {
  const filtered = {};
  if (clock && typeof clock === 'object' && !Array.isArray(clock))
    for (const key of ['encounterId', 'round', 'turnId', 'sessionId']) if (Object.hasOwn(clock, key)) filtered[key] = clock[key];
  return filtered;
};
// Même lecture que attackType() de resolution.js : « attack » ou « attaque » (fiches importées).
const isAttackType = type => ['attack', 'attaque'].includes(String(type || '').trim().toLocaleLowerCase());
export const v5StoreActionClock = v5CombatActionClock;
export function v5StoreActionState(envelope) {
  return { revision: envelope.localRevision || 0,
    ...(Number.isSafeInteger(envelope.combat?.round) && envelope.combat.round > 0 ? { round: envelope.combat.round } : {}),
    participants: projectV5Resources(envelope, envelope.combat?.participants || []),
    v5ActionLedger: clone(envelope.extensions?.v5?.actionLedger || { appliedActions: [], quotaUsage: [] }),
    appliedResolutionIds: [...(envelope.appliedResolutionIds || [])] };
}
function authorNextTurnEnd(envelope, actorId) {
  const combat = envelope.combat || {};
  const order = effectiveOrder(combat.participants || [], { mode: combat.orderMode, order: combat.order });
  const current = order.indexOf(combat.currentActorId), author = order.indexOf(actorId);
  const serial = envelope.activeScene?.extensions?.v5?.turnIndex ?? envelope.extensions?.v5?.turnIndex;
  if (current < 0 || author < 0 || !Number.isSafeInteger(serial) || serial < 1 || !Number.isSafeInteger(combat.round) || combat.round < 1) return undefined;
  const distance = (author - current + order.length) % order.length || order.length;
  return { phase: 'endOfTurn', actorId, round: combat.round + Math.floor((current + distance) / order.length), turn: serial + distance, moment: 'afterEffects' };
}
export function buildV5StoreActionInput(envelope, raw = {}) {
 if(raw.reactionId&&!raw.v5?.reactionId)raw={...raw,v5:{...(raw.v5||{}),reactionId:raw.reactionId}};
 const sourceActorId=raw.actorId||raw.actor?.id,sourceActor=envelope.combat?.participants?.find(row=>row.id===sourceActorId);
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const skillId=raw.action?.extensions?.fiche?.skillId||raw.v5?.context?.skillId,skill=sourceActor?.skills?.find(row=>row.id===skillId);
 const pray=skillId==='skill-50_72_69_e8_72_65-base'||['priere','pray'].includes(fold(skill?.name||raw.action?.name||raw.action?.nom||raw.action?.skill));
 if(pray){const ban=wrathPrayerBan(sourceActor);if(ban)throw new TypeError(ban.error);if(validateWrathRounds(sourceActor).layers.some(row=>row.mode==='forced'))throw new TypeError('Courroux : utilisez la Prière divine sourcée ou la récupération.');}
 const action=raw.v5?.context?.isAction===true||isAttackType(raw.action?.type);
 if(action){const gate=wrathForcedPrayerGate(envelope,sourceActorId);if(gate)throw new TypeError(gate.error);}

  const state = v5StoreActionState(envelope), clock = v5StoreActionClock(envelope);
  const reactionValidation = validateV5ReactionInput(envelope, raw, { clock });
  const supplied = reactionValidation.input;
  const actorId = supplied.actorId || supplied.actor?.id, targetId = supplied.targetId || supplied.target?.id;
  const resolutionId = supplied.resolutionId || supplied.id || defaultResolutionId({ id: actorId }, supplied.action || {}, targetId ? { id: targetId } : null, supplied.baseRevision ?? state.revision, Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll)), v5 = supplied.v5 || {};
  if(['glorious-demise','reaction-strike','divine-free-attack'].includes(v5.context?.freeAttackTalent))v5.extraAttack=true;
  if(v5.context?.freeAttackTalent==='fast-shot')v5.extraAttack=false;
  if(v5.context?.talentAction==='stomp')v5.extraAttack=true;
  const costs = [...(v5.costs || [])];
  const fortuneForAdvantage=Boolean(v5.context?.fortuneForAdvantage||v5.fortuneForAdvantage||supplied.fortuneForAdvantage);
  const fortuneAdvantageDeclarationId=v5.fortuneAdvantageDeclarationId||v5.context?.fortuneAdvantageDeclarationId||supplied.fortuneAdvantageDeclarationId;
  if(fortuneForAdvantage){
    if(!['test','skill','defense','opposition','attack','attaque'].includes(String(supplied.action?.type||'').toLowerCase()))throw new TypeError('Chance → Avantage : un Test doit être choisi avant le jet.');
    const declaration=(envelope.extensions?.v5?.fortuneAdvantageDeclarations||[]).find(row=>row.id===fortuneAdvantageDeclarationId);
    const identity=sourceActor?v5ResourceIdentity(envelope,sourceActor):null;
    if(!declaration||declaration.actorId!==actorId||declaration.characterId!==identity||declaration.revision!==envelope.localRevision)throw new TypeError('Chance → Avantage : déclaration préalable du MJ requise avant le jet.');
    supplied.fortuneAdvantageDeclarationId=fortuneAdvantageDeclarationId;
    if(!costs.some(cost=>cost.id==='system:fortune-for-advantage'))costs.push({id:'system:fortune-for-advantage',resource:'fortune',amount:1});
    v5.advantageSources=[...(v5.advantageSources||[]),{id:'fortune-spent-for-advantage',label:'1 Point de Chance dépensé avant le jet'}];
  }
  const fateAction = v5.context?.fateAction;
  if(['cancel-attack','survive'].includes(fateAction)&&(!isAttackType(supplied.action?.type)||!targetId))throw new TypeError(`Destin (${fateAction}) : une attaque et sa cible sont requises.`);
  // Destin laisse le MJ choisir le résultat du dé sans lancer les dés; le moteur
  // garantit ensuite la réussite et conserve les doubles choisis pour un critique.
  if(fateAction==='automatic-success'){
    const chosen=Number(v5.context.fateChosenRoll);
    if(Number.isInteger(chosen)&&chosen>=1&&chosen<=100){supplied.roll=chosen;supplied.dieRoll=chosen;supplied.enteredRoll=chosen;}
    else {supplied.roll=50;supplied.dieRoll=50;supplied.enteredRoll=50;}
    v5.context={...v5.context,fateChosenRoll:Number.isInteger(chosen)&&chosen>=1&&chosen<=100?chosen:null};supplied.v5=v5;
  }
  if (fateAction && ['cancel-attack', 'survive', 'automatic-success'].includes(fateAction)
      && !costs.some(cost => cost.id === 'system:fate-action'))
    costs.push({ id: 'system:fate-action', resource: 'fate', amount: 1,
      actorId: ['cancel-attack', 'survive'].includes(fateAction) ? targetId : actorId });
  if (v5.extraAttack === true && !costs.some(cost => cost.resource === 'momentum')) costs.push({ id: 'system:extra-attack-momentum', resource: 'momentum', amount: 1 });
  const quotas=[...(v5.quotas||[])],exemptions=[...(v5.exemptions||[])],actor=state.participants.find(p=>p.id===actorId),context=v5.context||{};
  if(context.secondWeaponAttack===true){
    if(!v5.extraAttack||!['melee','ranged'].includes(v5.kind))throw new TypeError('Seconde arme : attaque supplémentaire de mêlée ou de tir requise.');
    {
      const primary=(envelope.extensions?.v5?.standardTurnActions||[]).find(row=>row.actionId===context.primaryResolutionId&&row.actorId===actorId&&row.encounterId===clock.encounterId&&row.turnId===clock.turnId&&row.kind==='action'&&row.weaponId);
      const weaponId=supplied.action?.extensions?.fiche?.equipmentId,weapon=actor?.equipment?.find(item=>item.id===weaponId);
      const firstWeapon=actor?.equipment?.find(item=>item.id===primary?.weaponId);
      if(!primary||primary.actionType!=='attack'||primary.weaponId===weaponId||weaponHandsForParticipant(weapon,actor)!==1||weaponHandsForParticipant(firstWeapon,actor)!==1)throw new TypeError('Seconde arme : attaque précédente et deux armes différentes utilisables à une main requises.');
      if(!quotas.some(q=>q.id==='combat:base-second-weapon'))quotas.push({id:'combat:base-second-weapon',scope:'turn',maximum:1});
    }
  }
  // Combat naturel (T2) : l'attaque gratuite d'un Trait de créature coûte l'Élan qu'il indique ; le Trait est exigé.
  if(context.naturalAttack){
    const natural=planNaturalAttack(actor,context.naturalAttack,{used:context.naturalUsed,count:context.tentacleCount,charged:context.charged??v5.charging,actorSize:context.actorSize??v5.actorSize,targetSize:context.targetSize??v5.targetSize});
    if(natural.unresolved.some(r=>/Trait absent|déjà/.test(r)))throw new TypeError(natural.unresolved.join(' '));
    for(const cost of natural.costs)if(!costs.some(c=>c.resource===cost.resource))costs.push({id:'creature:'+context.naturalAttack+':'+cost.resource,...cost});
    if(natural.quota)quotas.push(natural.quota);
  }
  // Plusieurs têtes : au plus une attaque gratuite (Morsure, Cornes, Langue) par tête valide et par Tour, qu'elle soit déclarée comme
  // attaque naturelle ou portée par une action gratuite du profil (« Bite », freeAttack).
  if(hasManyHeads(actor)){
    const attackKey=context.naturalAttack||(supplied.action?.extensions?.v5?.freeAttack?headAttackKeyOf(supplied.action.name):null);
    const headsPlan=attackKey?planManyHeads(actor,headRegistryOf(actor)):null;
    // Nombre de têtes absent ou registre différent : le plafond par tête ne peut pas être appliqué, on le dit au lieu de le sauter.
    if(headsPlan?.unresolved.length)throw new TypeError(headsPlan.unresolved.join(' '));
    const perHead=headsPlan?.freeAttacks.find(entry=>entry.key===attackKey);
    if(perHead){
      if(perHead.count<1)throw new TypeError('Plusieurs têtes : aucune tête valide pour cette attaque.');
      quotas.push({id:'creature:heads:'+perHead.key,scope:'turn',maximum:perHead.count});
    }
  }
  // Attaques multiples d'un profil de bestiaire (« 2 Claws », « 8 × Tentacles ») : les attaques gratuites partagent un quota par Tour,
  // sans Élan ; Tentacules : toutes gratuites (quota commun avec l'attaque naturelle), autre multiplicateur : toutes sauf la première.
  const multi=supplied.action?.extensions?.v5?.multiAttack;
  if(multi&&supplied.action.extensions.v5.freeAttack&&!v5.extraAttack){
    const tentacles=/tentacle/i.test(multi.group),id=tentacles?'creature:tentacles':'creature:multi:'+encodeURIComponent(String(multi.group).toLowerCase());
    if(!quotas.some(q=>q.id===id))quotas.push({id,scope:'turn',maximum:tentacles?multi.of:multi.of-1});
  }
  let quotaActorId;
  const selected=context.preRollTalent;
  if(selected&&selected!=='none'){
    const acquired=acquiredV5Talents(actor).find(t=>t.talentId==='talent-'+selected&&(selected!=='resistant'||t.specialization===context.threatId));
    if(!['resistant','strong-minded'].includes(selected)||!acquired||!currentV5TalentHashes()['talent-'+selected]?.startsWith('sha256:'))throw new TypeError('Talent de séance ou spécialité non disponible.');
    quotas.push({id:'talent:'+selected+(selected==='resistant'?':'+encodeURIComponent(acquired.specialization):''),scope:'session',maximum:1});quotaActorId=v5ResourceIdentity(envelope,actor)||'instance:'+actorId;
  }
  if(v5.extraAttack&&context.freeAttackTalent==='frenzy'){
    if((actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.frenzyFury))throw new TypeError('Fureur d’Ulric : la Frénésie ajoute 1d10 Dégâts au premier coup au lieu de l’attaque gratuite.');
    if(!(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s)))throw new TypeError('Attaque gratuite de Frénésie non disponible.');
    quotas.push({id:'talent:frenzy-extra-attack',scope:'round',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-frenzy'});
  }
  // Attaque rapide (Myrmidia) : couche freeAttack requise ; une attaque gratuite par Round, sans Élan.
  if(v5.extraAttack&&context.freeAttackTalent==='divine-free-attack'){
    if(!(actor.extensions?.v5?.divineEffects||[]).some(layer=>layer?.freeAttack))throw new TypeError('Attaque rapide non disponible.');
    quotas.push({id:'divine:free-attack',scope:'round',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'divine-free-attack'});
  }
  const secondaryTalentRequests=[];
  const defender=state.participants.find(p=>p.id===targetId),defenderContext=supplied.defense?.v5?.context||{},defenderSelected=defenderContext.preRollTalent;
  if(defenderSelected&&defenderSelected!=='none'){
    const acquired=acquiredV5Talents(defender).find(t=>t.talentId==='talent-'+defenderSelected&&(defenderSelected!=='resistant'||t.specialization===defenderContext.threatId));
    if(!['resistant','strong-minded'].includes(defenderSelected)||!acquired)throw new TypeError('Talent de séance en défense indisponible.');
    secondaryTalentRequests.push({actorId:targetId,actionId:resolutionId+':session:defender',costs:[],quotas:[{id:'talent:'+defenderSelected+(defenderSelected==='resistant'?':'+encodeURIComponent(acquired.specialization):''),scope:'session',maximum:1}],exemptions:[],quotaActorId:v5ResourceIdentity(envelope,defender)||'instance:'+targetId,clock});
  }
  if(context.talentAction==='drilled')costs.push({id:'talent:drilled:momentum',resource:'momentum',amount:1});
  if(context.talentAction==='martial-arts')quotas.push({id:'talent:martial-arts-choice',scope:'turn',maximum:1});
  if(v5.extraAttack&&context.freeAttackTalent==='dual-wielder'){
    if(!acquiredV5Talents(actor).some(t=>t.talentId==='talent-dual-wielder')||!currentV5TalentHashes()['talent-dual-wielder']?.startsWith('sha256:')||context.dualWielding!==true||context.secondWeaponAttack!==true||v5.kind!=='melee')throw new TypeError('Maniement de deux armes : seconde arme en mêlée requise.');
    quotas.push({id:'talent:dual-wielder-second-weapon',scope:'turn',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-dual-wielder'});
  }
  if(context.talentAction==='shield-ally'){costs.push({id:'talent:shieldsman:momentum',resource:'momentum',amount:1});quotas.push({id:'talent:shieldsman',scope:'round',maximum:1});}
  if(context.talentAction==='overcome-fear'){const active=(actor.states||[]).find(s=>s.key==='fear-of-talent'&&s.id===context.fearEffectId&&sourceActive(s));if(active)quotas.push({id:'talent:frightening:control',scope:active.mode==='sl'?'round':'turn',maximum:1});}
  if(context.talentAction==='overcome-terror')quotas.push({id:'talent:small-terror:'+encodeURIComponent(context.terrorEffectId||''),scope:'encounter',maximum:1});
  if(context.talentAction==='hatred')quotas.push({id:'talent:hatred:'+encodeURIComponent(context.psychologySpecialty||''),scope:context.hatredRetry===true?'round':'encounter',maximum:1});
  if(context.talentAction==='vice'&&context.viceRetry===true)quotas.push({id:'talent:vice-retry:'+encodeURIComponent(context.psychologySpecialty||''),scope:'round',maximum:1});
  if(context.talentAction==='end-contact')costs.push({id:'talent:contact:momentum',resource:'momentum',amount:1});
  if(['reaction-strike','glorious-demise'].includes(context.freeAttackTalent)){const id=context.freeAttackTalent;quotas.push({id:'talent:'+id+(id==='glorious-demise'?':'+context.triggerConditionId:''),scope:id==='reaction-strike'?'round':'encounter',maximum:1});for(const cost of costs.filter(c=>c.resource==='momentum'))exemptions.push({costId:cost.id,sourceId:'talent-'+id});if(id==='glorious-demise'&&(actor.states||[]).find(s=>s.id===context.triggerConditionId)?.key==='sonne')costs.push({id:'talent:glorious:fortune',resource:'fortune',amount:1});}
  if(context.freeAttackTalent==='fast-shot')quotas.push({id:'talent:fast-shot',scope:'round',maximum:1});
  if(context.specialAttack==='whirlwind-of-death')costs.push({id:'talent:whirlwind:fortune',resource:'fortune',amount:1});
  // Fortune généreuse (Ranald) : inversion demandée des dés de pourcentage du prochain Test (82 devient 28), couche à usage unique consommée par la résolution.
  // Le marqueur v5.reverseDiceApplied survit dans l'entrée normalisée et empêche la double inversion quand l'entrée est reconstruite à l'application.
  let reverseDiceApplied = false;
  if (v5.reverseDice === true && v5.reverseDiceApplied !== true) {
    const rawReverse = supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll;
    if (reverseDiceLayers(actor).length && rawReverse !== null && rawReverse !== undefined && rawReverse !== '' && Number.isInteger(Number(rawReverse)) && Number(rawReverse) >= 1 && Number(rawReverse) <= 100) {
      const original = Number(rawReverse), reversed = original === 100 ? 100 : (original % 10) * 10 + Math.floor(original / 10);
      supplied.roll = reversed;
      if (supplied.dieRoll !== undefined) supplied.dieRoll = reversed;
      if (supplied.enteredRoll !== undefined) supplied.enteredRoll = reversed;
      reverseDiceApplied = v5.reverseDiceApplied = true;
    }
  }
  const rerollValues=context.fortuneRerollRolls??v5.fortuneRerollRolls??supplied.fortuneRerollRolls;
  const legacyReroll=context.fortuneRerollRoll??v5.fortuneRerollRoll??supplied.fortuneRerollRoll;
  const invalidRerollSequence=Array.isArray(rerollValues)&&rerollValues.some(value=>value===null||value===undefined||value===''||!Number.isInteger(Number(value))||Number(value)<1||Number(value)>100);
  const rerollRolls=Array.isArray(rerollValues)?rerollValues.map(Number).filter(value=>Number.isInteger(value)&&value>=1&&value<=100):legacyReroll!==null&&legacyReroll!==undefined&&legacyReroll!==''&&Number.isInteger(Number(legacyReroll))&&Number(legacyReroll)>=1&&Number(legacyReroll)<=100?[Number(legacyReroll)]:[];
  const fortuneReroll = Boolean(context.fortuneReroll || v5.fortuneReroll || supplied.fortuneReroll || rerollValues?.length);
  const hasValidReroll=rerollRolls.length>0;
  let initialRollBeforeFortune = null, freeReroll = false;
  if (fortuneReroll) {
    if (!costs.some(c => c.id?.startsWith('system:fortune-reroll'))) {
      const chargeCount=Math.max(1,rerollRolls.length);
      for(let index=0;index<chargeCount;index++)costs.push({id:`system:fortune-reroll:${index+1}`,resource:'fortune',amount:1});
      // Bénédiction de Chance (D4) : échec propre ou opposition perdue ; le Test d'origine est évalué avant la relance.
      // Jet d'origine absent ou invalide : impossible de savoir s'il est raté, la relance reste payante (pas d'erreur levée).
      const initialRoll = Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll);
      if (freeRerollLayers(actor, { round: state.round, attack: isAttackType(supplied.action?.type) }).length && Number.isInteger(initialRoll) && initialRoll >= 1 && initialRoll <= 100) {
        const { fortuneReroll: _context, fortuneRerollRoll: _contextRoll, fortuneRerollRolls:_contextRolls, ...plainContext } = context;
        const { fortuneReroll: _supplied, fortuneRerollRoll: _suppliedRoll, fortuneRerollRolls:_suppliedRolls, ...plainSupplied } = supplied;
        const original = previewResolution({ ...plainSupplied, resolutionId, actorId, targetId,
          actor: supplied.actor?.id === actorId ? supplied.actor : actor, target: state.participants.find(p => p.id === targetId) || supplied.target || null,
          round: state.round ?? supplied.round, baseRevision: supplied.baseRevision ?? state.revision, v5State: state, v5Clock: clock,
          v5: { ...v5, context: plainContext, fortuneReroll: undefined, fortuneRerollRoll: undefined, fortuneRerollRolls:undefined } });
        if (original.success === false || original.opposition?.winner === 'defender') { freeReroll = true; exemptions.push({ costId: 'system:fortune-reroll:1', sourceId: FREE_REROLL_SOURCE }); }
      }
    }
    initialRollBeforeFortune = Number(supplied.roll ?? supplied.dieRoll ?? supplied.enteredRoll);
    if (hasValidReroll) {
      const nextRoll = rerollRolls.at(-1);
      supplied.roll = nextRoll;
      if (supplied.dieRoll !== undefined) supplied.dieRoll = nextRoll;
      if (supplied.enteredRoll !== undefined) supplied.enteredRoll = nextRoll;
    }
  }
  const hasRequest = costs.length || quotas.length || exemptions.length || v5.extraAttack;
  // Avant le premier Round (combat monté, pas encore démarré) : pas de Tour courant ; les attaques gratuites de créature
  // (quotas « creature: ») partagent alors un Tour 0 par rencontre, et le quota est rappelé dans l'aperçu.
  // Store neuf sans rencontre ni scène : une rencontre implicite porte le Tour 0.
  const preCombatQuota = !clock.turnId && quotas.some(q => q.scope === 'turn' && q.id.startsWith('creature:'));
  const quotaClock = preCombatQuota ? { ...clock, encounterId: clock.encounterId || 'sans-rencontre', turnId: `${clock.encounterId || 'sans-rencontre'}:0:pre-combat` } : clock;
  let actionCostPlan = null, paid = state;
  if (hasRequest) {
    actionCostPlan = previewV5ActionCosts({ state, actionId: resolutionId, actorId, costs, quotas, exemptions,...(quotaActorId?{quotaActorId}:{} ), extraAttack: v5.extraAttack === true, clock: quotaClock });
    const prepared = prepareV5ActionState(actionCostPlan, state);
    if (prepared.status === 'prepared') paid = prepared.state;
  }
  const combatTurnIndex=envelope.activeScene?.extensions?.v5?.turnIndex??envelope.extensions?.v5?.turnIndex;
  return { ...supplied, resolutionId, actorId, targetId,
    actor: paid.participants.find(item => item.id === actorId) || supplied.actor,
    target: paid.participants.find(item => item.id === targetId) || supplied.target || null,
    round: state.round ?? supplied.round, baseRevision: supplied.baseRevision ?? state.revision,
    v5State: paid, v5Clock: {...quotaClock,...(Number.isSafeInteger(combatTurnIndex)?{turnIndex:combatTurnIndex}:{})}, ...(preCombatQuota ? { preCombatQuota: quotas.filter(q => q.id.startsWith('creature:')).map(q => ({ id: q.id, maximum: q.maximum })) } : {}), authorNextTurnEnd: authorNextTurnEnd(envelope, actorId), actionCostPlan, secondaryTalentRequests, reactionValidation,
    fortuneReroll, fortuneRerollRoll: hasValidReroll ? rerollRolls.at(-1) : null, fortuneRerollRolls:rerollRolls, invalidRerollSequence, initialRollBeforeFortune, freeReroll, reverseDiceApplied, ...(reverseDiceApplied ? { reverseDice: { used: true } } : {}) };
}
export function annotateV5StoreActionPreview(preview, input) {
  const fateAction = input.v5?.context?.fateAction;
  if (fateAction) preview = { ...preview, fateAction: { action: fateAction, cost: 1, paid: input.actionCostPlan?.ready === true,
    payerId: input.actionCostPlan?.request?.costs?.find(cost=>cost.id==='system:fate-action')?.actorId||input.actionCostPlan?.actorId,
    ...(fateAction==='automatic-success'?{chosenRoll:input.v5?.context?.fateChosenRoll??null}:{}),
    ...(fateAction === 'cancel-attack' ? { cancelled: true } : {}), ...(fateAction==='survive'?{removedFromEncounter:true}:{}) } };
  // Indice seulement : la faveur reste disponible jusqu'à une inversion demandée et appliquée.
  if (preview.success === false && input.v5?.reverseDice !== true && reverseDiceLayers(input.actor).length && Number.isInteger(preview.roll) && preview.roll >= 1 && preview.roll <= 100) {
    const reversed = preview.roll === 100 ? 100 : (preview.roll % 10) * 10 + Math.floor(preview.roll / 10);
    const alternative = previewResolution({ ...input, roll: reversed, dieRoll: reversed, enteredRoll: reversed });
    if (alternative.success === true) preview = { ...preview, reverseDiceHint: { reversed, wouldSucceed: true } };
  }
  if (input.preCombatQuota?.length) preview = { ...preview, reminders: [...(preview.reminders || []), `Avant le premier Round : attaques gratuites limitées à ${input.preCombatQuota.map(q => q.maximum).join(' + ')} avant le début du combat (quota du Tour 0).`] };
  if (input.reactionValidation?.ready === false) preview ={ ...preview, unresolved: [...(preview.unresolved || []), input.reactionValidation.reason] };
  if (input.fortuneReroll) {
    if(input.invalidRerollSequence){preview={...preview,ready:false,status:'manual',unresolved:[...(preview.unresolved||[]),'Relance de Fortune : chaque résultat doit être un entier de 1 à 100.']};}
    if (input.fortuneRerollRoll === null) {
      preview = { ...preview, unresolved: [...(preview.unresolved || []), 'Relance de Fortune : saisir le nouveau jet d100 (1 à 100).'] };
    }
    preview = { ...preview, fortuneReroll: { active: true, used: Boolean(input.fortuneRerollRoll !== null), initialRoll: input.initialRollBeforeFortune, rerollRoll: input.fortuneRerollRoll,
      rolls:input.fortuneRerollRolls||[],
      ...(input.freeReroll ? { free: true, reminder: 'Bénédiction de Chance : relance gratuite' } : {}) } };
  }
  if(input.secondaryTalentRequests?.length){
    const plans=input.secondaryTalentRequests.map(request=>previewV5ActionCosts({...request,state:input.v5State}));
    preview={...preview,talentUsageRequests:[...(preview.talentUsageRequests||[]),...input.secondaryTalentRequests],unresolved:[...(preview.unresolved||[]),...plans.flatMap(p=>p.unresolved.map(u=>'Défense : '+u.reason))]};
  }
  const postRequests=[];for(const[subject,settings,replaced]of[[input.actor,input.v5,preview.damageReplacedByTalent],[input.target,input.defense?.v5,preview.defenderDamageReplacedByTalent]]){const c=settings?.context||{};if(!subject||!replaced)continue;const shield=c.specialAttack==='shieldsman',catching=c.specialAttack==='disarm'&&c.catchWeapon===true;if(!shield&&!catching)continue;const request={phase:'after-result',actorId:subject.id,actionId:preview.resolutionId+':post:'+subject.id,costs:[{id:shield?'talent:shieldsman:momentum':'talent:disarm:catch',resource:'momentum',amount:1}],quotas:shield?[{id:'talent:shieldsman',scope:'round',maximum:1}]:[],exemptions:[],clock:quotaClock(input.v5Clock)};const state=clone(input.v5State);state.participants=state.participants.map(p=>p.id===subject.id?withMomentum(p,preview.momentum.find(m=>m.participantId===p.id)?.after??p.extensions?.v5?.hasMomentum===true):p);const plan=previewV5ActionCosts({...request,state});postRequests.push(request);preview={...preview,postActionCosts:[...(preview.postActionCosts||[]),plan],unresolved:[...(preview.unresolved||[]),...plan.unresolved.map(u=>u.reason)]};}
  if(postRequests.length)preview={...preview,talentUsageRequests:[...(preview.talentUsageRequests||[]),...postRequests]};
  if (!input.actionCostPlan) return preview;
  const decisions = clone(preview.decisions || {});
  const label = resource => ({ momentum: 'Élan', fortune: 'Fortune' }[resource] || resource);
  const summaries = [...input.actionCostPlan.paid.map(cost => label(cost.resource) + ' : ' + cost.amount + ' (payé avant le jet)'), ...input.actionCostPlan.waived.map(cost => label(cost.resource) + ' : exempté')];
  for (const decision of Object.values(decisions)) for (const option of decision.options || []) option.summary.costs = [...summaries];
  return { ...preview, decisions, actionCostPlan: clone(input.actionCostPlan),
    unresolved: [...(preview.unresolved || []), ...input.actionCostPlan.unresolved.map(item => item.reason), ...(input.actionCostPlan.duplicate ? ['Action déjà confirmée.'] : [])],
    actionCosts: { paid: clone(input.actionCostPlan.paid), waived: clone(input.actionCostPlan.waived), usages: clone(input.actionCostPlan.usages), ready: input.actionCostPlan.ready } };
}
export function commitV5StoreTalentUsages(preview, result, initial) {
  if (result.status !== 'applied') return result;
  let usageState = clone(initial);
  const receipts = [];
  for (const request of preview.talentUsageRequests || []) {
    const costState=request.phase==='after-result'?{...clone(result.state),revision:initial.revision,v5ActionLedger:usageState.v5ActionLedger}:usageState;
    const plan = previewV5ActionCosts({ ...request, state: costState });
    const committed = commitV5ActionCosts(plan, costState, { resolveAction: state => ({ status: 'applied', state }) });
    if (committed.status !== 'applied') return { status: committed.status === 'stale' ? 'stale' : 'manual', reason: committed.unresolved?.[0]?.reason || 'Usage de talent indisponible', state: initial };
    usageState = { ...committed.state, revision: initial.revision };
    if(request.phase==='after-result')result={...result,state:{...committed.state,revision:result.state.revision}};
    receipts.push(committed.receipt);
  }
  return { ...result, state: { ...result.state, v5ActionLedger: usageState.v5ActionLedger }, talentUsageReceipts: receipts };
}
export function applyV5StoreAction(preview, envelope, resolveAction) {
  const current = v5StoreActionState(envelope);
  if (current.appliedResolutionIds.includes(preview.resolutionId) || current.v5ActionLedger.appliedActions.some(row => row.actionId === preview.resolutionId)) return { status: 'duplicate', state: current, resolution: clone(preview) };
  const reaction = validateV5ReactionInput(envelope, preview.input, { clock: v5StoreActionClock(envelope) });
  if (!reaction.ready) return { status: current.revision !== preview.baseRevision ? 'stale' : 'manual', reason: reaction.reason, state: current };
  if (reaction.opportunity) {
    const request = preview.actionCostPlan?.request;
    if (!request || !request.extraAttack || request.actorId !== reaction.opportunity.actorId || ['costs', 'quotas', 'exemptions'].some(field => JSON.stringify(request[field]) !== JSON.stringify(reaction.opportunity[field]))) return { status: 'manual', reason: 'Le coût et le quota doivent correspondre à la réaction proposée.', state: current };
  }
  // Relance gratuite : exemption vérifiée contre l'état courant, couche consommée dans la même commande que la résolution.
  const free = preview.actionCostPlan?.request?.exemptions?.some(row => row.sourceId === FREE_REROLL_SOURCE);
  if (free && !freeRerollLayers(current.participants.find(p => p.id === preview.actionCostPlan.request.actorId), { round: current.round, attack: isAttackType(preview.input?.action?.type) }).length) return { status: 'manual', reason: 'Bénédiction de Chance : plus de relance gratuite disponible.', state: current };
  // Fortune généreuse : inversion vérifiée contre l'état courant, couche consommée dans la même commande que la résolution.
  const reversed = preview.input?.v5?.reverseDiceApplied === true;
  const reverseActorId = preview.input?.actorId || preview.input?.actor?.id;
  const extreme = Boolean(preview.slExtreme);
  if (extreme && !slExtremeLayers(current.participants.find(p => p.id === reverseActorId)).length) return { status: 'manual', reason: 'Faire monter les enjeux : faveur indisponible.', state: current };
  if (reversed && !reverseDiceLayers(current.participants.find(p => p.id === reverseActorId)).length) return { status: 'manual', reason: 'Fortune généreuse : plus d\'inversion disponible.', state: current };
  const resolve = state => {
    const result = commitV5StoreTalentUsages(preview, resolveAction(state), state);
    if (result.status !== 'applied' || (!free && !reversed && !extreme)) return result;
    // Relance gratuite et inversion des dés peuvent servir dans la même résolution : chacune consomme sa propre couche.
    const participants = clone(result.state.participants);
    if (free) consumeFreeReroll(participants.find(p => p.id === preview.actionCostPlan.request.actorId), { round: state.round, attack: isAttackType(preview.input?.action?.type) });
    if (reversed) consumeReverseDice(participants.find(p => p.id === reverseActorId));
    if (extreme) consumeSlExtreme(participants.find(p => p.id === reverseActorId));
    return { ...result, state: { ...result.state, participants } };
  };
  if (!preview.actionCostPlan) return resolve(current);
  const committed = commitV5ActionCosts(preview.actionCostPlan, current, { resolveAction: resolve });
  if (committed.status !== 'applied') {
    if (committed.status === 'blocked' && committed.result) return committed.result;
    return { ...committed, status: committed.status === 'blocked' ? 'manual' : committed.status, reason: committed.unresolved?.[0]?.reason || 'Coût ou quota indisponible' };
  }
  return { ...committed.result, state: committed.state, actionCostReceipt: committed.receipt };
}
export function v5StoreActionResult(envelope, result) {
  const next = commitV5Fate(envelope,result.state.participants);
  next.appliedResolutionIds=result.state.appliedResolutionIds;
  next.extensions={...(envelope.extensions||{}),v5:{...(envelope.extensions?.v5||{}),actionLedger:clone(result.state.v5ActionLedger||{appliedActions:[],quotaUsage:[]})}};
  if(result.resolution?.talentActionChanges?.some(c=>c.patch?.initiative!=null)&&next.combat.orderMode!=='manual')next.combat.order=effectiveOrder(next.combat.participants,{mode:'initiative'});
  const resources = commitV5Resources(next, result.state.participants);
  return registerV5ReactionOpportunities(resources, result.resolution, { clock: v5StoreActionClock(envelope) });
}
