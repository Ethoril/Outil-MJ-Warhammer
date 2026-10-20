import{normalizeQualities}from'./quality-normalization.js';
const weaponSignature=a=>JSON.stringify({id:a.id,type:a.type,attr:a.attr,base:Number(a.base)||0,mod:Number(a.mod)||0,damage:a.damage,damageFormula:a.damageFormula,qualities:normalizeQualities(a.qualities),fiche:a.extensions?.fiche});
import{situationPlan,activeSource}from'./v5-talent-situations.js';import{hasV5Talent}from'./v5-talents.js';
export function previewAttackPrelude(n){
 const c=n.v5.context||{},id=c.freeAttackTalent,plans=[],unresolved=[],attack=['attack','attaque'].includes(n.action.type);let glorious=false;
 if(!attack)return{plans,unresolved,glorious};
 const used=n.v5State?.v5ActionLedger?.quotaUsage?.some(q=>q.actorId===n.actor.id&&q.quotaId==='talent:fast-shot'&&q.scopeKey===JSON.stringify([n.v5Clock.encounterId,n.v5Clock.round])&&q.used>0);
 if(used&&id!=='fast-shot')unresolved.push('Tir rapide : l’Action du Round est consommée, aucune autre attaque ce Round.');
 if(id==='reaction-strike'){
  const pending=(n.actor.states||[]).find(s=>s.key==='reaction-strike-ready'&&activeSource(s)&&s.id===c.attackOpportunityId);
  if(!pending||pending.targetId!==n.target?.id||pending.turnId!==n.v5Clock.turnId||pending.round!==n.v5Clock.round||pending.actionId!==n.action.id||pending.weaponSignature!==weaponSignature(n.action)||c.mainHand!==true)unresolved.push('Frappe réactive : Initiative réussie, même chargeur, arme de main directrice et réaction immédiate requis.');
  if(pending)plans.push({proposals:[{origins:[pending.source]}]});
 }
 if(id==='glorious-demise'){
  const plan=situationPlan(n.actor,id);plans.push(plan);const trigger=(n.actor.states||[]).find(s=>s.id===c.triggerConditionId&&['sonne','inconscient'].includes(s.key)&&s.source?.resolutionId);
  if(!plan.proposals.length||!trigger||trigger.gloriousWindowClosed===true||c.immediateReaction!==true||trigger.v5Timing?.acquiredRound!==n.v5Clock.round||n.v5.kind!=='melee')unresolved.push('Fin glorieuse : nouvel État identifié et attaque immédiate avant mise hors combat requis.');
  glorious=!unresolved.length;
 }
 if(id==='divine-free-attack'){
  if(c.freeAttackTest?.success!==true)unresolved.push('Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.');
  if(c.mainHand!==true)unresolved.push('Attaque rapide : arme de la main principale requise.');
 }
 if(id==='fast-shot'){
  const plan=situationPlan(n.actor,id);plans.push(plan);const pistol=n.action.qualities.some(q=>q.id==='pistolet'),order=c.fastShotActorIds;
  if(!plan.proposals.length||!pistol||n.v5.kind!=='ranged'||c.weaponLoaded!==true||c.actorEngaged!==false||c.beforeFirstTurn!==true||!Array.isArray(order)||!order.includes(n.actor.id)||new Set(order).size!==order.length)unresolved.push('Tir rapide : Pistol chargé, hors engagement, avant le premier Tour et tireurs déclarés requis.');
  if(Array.isArray(order)){
   const candidates=order.map(id=>n.v5State.participants.find(p=>p.id===id));
   if(candidates.some(p=>!p||!hasV5Talent(p,'talent-fast-shot')||!Number.isFinite(p.initiative)))unresolved.push('Tir rapide : tireur ou Initiative de combat indisponible.');
   else{const remaining=candidates.filter(p=>p.id===n.actor.id||!n.v5State.v5ActionLedger.quotaUsage.some(q=>q.actorId===p.id&&q.quotaId==='talent:fast-shot'&&q.scopeKey===JSON.stringify([n.v5Clock.encounterId,n.v5Clock.round])&&q.used>0)).sort((a,b)=>b.initiative-a.initiative||(b.caracs?.I||0)-(a.caracs?.I||0));if(remaining[0]?.id!==n.actor.id)unresolved.push('Tir rapide : résoudre d’abord le tireur à l’Initiative la plus élevée.');}
  }
 }
 return{plans,unresolved,glorious};
}
export function previewReactionStrike(n,test){
 if(n.v5.context?.talentAction!=='reaction-strike')return null;const c=n.v5.context,plan=situationPlan(n.actor,'reaction-strike'),changes=[],unresolved=[],reminders=[];
 const action=n.actor.actions?.find(a=>a.id===c.mainHandActionId&&['attack','attaque'].includes(a.type)&&a.attr!=='CT');
 if(!plan.proposals.length||!n.target||n.action.attr!=='I'||c.receivedCharge!==true||!action||typeof c.chargeEventId!=='string'||!c.chargeEventId.trim())unresolved.push('Frappe réactive : chargeur identifié, Test d’Initiative et arme de main directrice désignée requis.');
 if(test.success&&!unresolved.length)changes.push({participantId:n.actor.id,add:[{id:n.resolutionId+':reaction-ready',key:'reaction-strike-ready',name:'Frappe réactive : attaque immédiate disponible',kind:'talent-pending',level:1,source:plan.proposals[0].origins[0],actionId:action.id,weaponSignature:weaponSignature(action),targetId:n.target.id,turnId:n.v5Clock.turnId,round:n.v5Clock.round,eventId:c.chargeEventId}]});
 return{plan,changes,unresolved,reminders};
}
export function finishImmediateAttack(n){
 const c=n.v5.context||{},changes=[];
 for(const p of[n.actor,n.target].filter(Boolean)){
  const ready=(p.states||[]).filter(s=>s.key==='reaction-strike-ready'&&(p.id===n.actor.id||s.targetId===n.actor.id));
  const triggers=(p.states||[]).filter(s=>['sonne','inconscient'].includes(s.key)&&s.source?.resolutionId&&!s.gloriousWindowClosed);
  if(ready.length||triggers.length)changes.push({participantId:p.id,removeIds:[...ready,...triggers].map(s=>s.id),add:triggers.map(s=>({...s,gloriousWindowClosed:true}))});
 }
 if(c.freeAttackTalent==='glorious-demise')changes.push({participantId:n.actor.id,add:[{id:n.resolutionId+':glorious-spent',key:'glorious-spent',name:'Fin glorieuse effectuée : prochain Tour normal',kind:'talent-pending',level:1,source:situationPlan(n.actor,'glorious-demise').proposals[0]?.origins[0]}]});
 return changes;
}
