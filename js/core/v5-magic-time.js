import { expireMiscastConsequences } from './v5-magic-miscasts.js';
/** Expiration des conséquences d’incident et de Haute Magie, sans modifier les fiches. */
export function advanceMagicConsequences(participant,{currentRound=null,minutes=0}={}){
 const next=expireMiscastConsequences(participant,{currentRound,minutes}),v5=next.extensions?.v5;if(!v5)return next;
 if(v5.burnout?.active && !v5.burnout.permanent && minutes>0){v5.burnout.days=Math.max(0,v5.burnout.days-minutes/1440);if(v5.burnout.days===0)v5.burnout=null;}
 return next;
}
