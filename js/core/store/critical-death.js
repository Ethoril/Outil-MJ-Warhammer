import { updateCriticalDeathCountdown } from '../v5-critical-aftermath.js';

export function criticalDeathToughnessBonus(participant){
 const stored=participant?.extensions?.v5?.criticalDeath?.toughnessBonus;
 if(Number.isSafeInteger(stored)&&stored>=0)return stored;
 const numericCarac=value=>((typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value)))?Number(value):null;
 const explicit=numericCarac(participant?.caracs?.BE);
 if(explicit!==null&&Number.isSafeInteger(explicit)&&explicit>=0)return explicit;
 const endurance=numericCarac(participant?.caracs?.E);
 if(endurance===null||endurance<0)return null;
 return Math.floor(endurance/10);
}
export function reconcileCriticalDeathForRound(envelope,round){
 for(const participant of envelope.combat?.participants||[]){
  const be=criticalDeathToughnessBonus(participant);
  if(be===null)continue;
  const result=updateCriticalDeathCountdown(participant,{round,toughnessBonus:be});
  if(result.participant)Object.assign(participant,result.participant);
 }
}
export function reconcileCriticalDeathOnParticipantTransitions(before,next){
 const round=next.combat?.round;
 if(!Number.isSafeInteger(round)||round<0)return next;
 const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const unconscious=participant=>(participant?.states||[]).some(row=>['inconscient','unconscious'].includes(normalized(row.key||row.name))&&Number(row.level??1)>0);
 const criticalIds=participant=>(participant?.extensions?.v5?.criticalWounds||[]).map(row=>row?.id).filter(id=>typeof id==='string'&&id).sort();
 const sameCriticalIds=(left,right)=>{
   const a=criticalIds(left),b=criticalIds(right);
   return a.length===b.length&&a.every((id,index)=>id===b[index]);
 };
 const previous=new Map((before.combat?.participants||[]).map(row=>[row.id,row]));
 let changed=false;
 const participants=(next.combat?.participants||[]).map(participant=>{
  const old=previous.get(participant.id),nowUnconscious=unconscious(participant),wasUnconscious=unconscious(old);
  if(nowUnconscious===wasUnconscious&&sameCriticalIds(participant,old))return participant;
  const be=criticalDeathToughnessBonus(participant);
  if(be===null)return participant;
  const result=updateCriticalDeathCountdown(participant,{round,toughnessBonus:be});
  if(!result.participant)return participant;
  changed=true;
  return result.participant;
 });
 return changed?{...next,combat:{...next.combat,participants}}:next;
}
