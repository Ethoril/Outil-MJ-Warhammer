/** Maître à bord et Commandement (ARCH-03) : module feuille, sorti pour casser un cycle d'imports. */
import { acquiredV5Talents } from './v5-talent-registry.js';
export const needs = (list,field,label) => { if (!list.some(item=>item.field===field)) list.push({field,label}); };
/** Master and Commander (L25 p.63) : +1 DR par rang aux Tests de Commandement à bord ; le fait « à bord » reste une saisie MJ. */
export const MASTER_AND_COMMANDER_TALENT=Object.freeze({id:'talent-master-and-commander',nom:'Maître à bord',englishName:'Master and Commander',source:'L25 p.63'});
/** Rang du Talent : lignes résolues du catalogue (« Maître à bord » est au catalogue importé depuis le 23/10/2026). */
function masterAndCommanderRank(participant){
  return Math.max(0,...acquiredV5Talents(participant).filter(row=>row.talentId===MASTER_AND_COMMANDER_TALENT.id).map(row=>row.rank));
}
export function leadershipRallySlModifiers({participant,onBoardVessel}={}) {
  const modifiers=[],needsInput=[],rank=masterAndCommanderRank(participant);
  if(rank>0){
    if(typeof onBoardVessel!=='boolean')needs(needsInput,'onBoardVessel','Confirmer si le Test de Commandement a lieu à bord');
    else if(onBoardVessel)modifiers.push({id:'master-and-commander',label:'Master and Commander (+1 DR par rang)',amount:rank});
  }
  return {modifiers,needsInput};
}
