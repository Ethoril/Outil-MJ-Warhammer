import { uid } from '../models.js';
import { ORDER_MODES, insertParticipantsByInitiative } from '../turn-order.js';

export const withV5 = (participant, change) => ({ ...participant, extensions: { ...(participant.extensions || {}), v5: change(participant.extensions?.v5 || {}) } });
export function newV5ParticipantOrder(before, participants) {
  const combat = before.combat;
  if (before.extensions?.v5?.combatInitiativeInitialized) return insertParticipantsByInitiative(combat, participants);
  if (!combat?.round || before.extensions?.v5?.orderRound !== combat.round || combat.orderMode === ORDER_MODES.MANUAL) return null;
  return insertParticipantsByInitiative(combat, participants);
}
export function registerNewV5Participants(before, next) {
  const oldIds = new Set((before.combat?.participants || []).filter(participant => participant.zone === 'active').map(participant => participant.id));
  if (!(next.combat?.participants || []).some(participant => participant.zone === 'active' && !oldIds.has(participant.id))) return;
  if(before.extensions?.v5?.combatInitiativeInitialized){
    // Une invocation qui apparaît après le tirage du Round 0 est un PNJ nouveau :
    // son initiative doit être tirée immédiatement (d10 + Bonus d'Initiative),
    // puis il rejoint l'ordre au rang correspondant. Les arrivées ordinaires
    // conservent leur comportement de renfort.
    if (before.combat?.round === 0) {
      for (const participant of next.combat.participants || []) {
        if (participant.zone !== 'active' || oldIds.has(participant.id)) continue;
        const v5 = participant.extensions?.v5 || {};
        const summoned = v5.summonedBySpellId || v5.divineSummon || v5.divineWrathSummon;
        const characteristic = Number.isInteger(participant.caracs?.I) ? participant.caracs.I : participant.initiative;
        if (!summoned || !Number.isInteger(characteristic) || characteristic < 0) continue;
        const die = Math.floor(Math.random() * 10) + 1;
        participant.extensions = { ...(participant.extensions || {}), v5: { ...v5,
          combatInitiative: { die, characteristic, characteristicSource: Number.isInteger(participant.caracs?.I) ? 'caracs.I' : 'initiative',
            bonus: Math.floor(characteristic / 10), score: die + Math.floor(characteristic / 10), initialized: true, summoned: true }
        } };
      }
    }
    const resolved=before.extensions?.v5?.combatInitiativeResolution||{},canonical={...before.combat,order:resolved.order||before.combat?.order||[]};
    const automatic=insertParticipantsByInitiative(canonical,next.combat.participants);
    const actual=before.combat?.orderMode===ORDER_MODES.MANUAL?insertParticipantsByInitiative(before.combat,next.combat.participants):automatic;
    const byId=new Map((next.combat.participants||[]).map(row=>[row.id,row]));
    const bench=(next.combat.order||[]).filter(id=>byId.get(id)?.zone==='bench'&&!actual.includes(id));
    next.combat.order=[...actual,...bench];
    next.extensions={...(next.extensions||{}),v5:{...(next.extensions?.v5||{}),combatInitiativeInitialized:true,combatInitiativeResolution:{...resolved,order:automatic}}};
    return;
  }
  const order = newV5ParticipantOrder(before, next.combat.participants);
  if (order) next.combat.order = order;
}
export function withoutCombatInitiativeResolution(extensions) {
  const next={...(extensions||{})},v5={...(extensions?.v5||{})};
  delete v5.combatInitiativeInitialized;
  delete v5.combatInitiativeResolution;
  delete v5.orderRound;
  next.v5=v5;
  return next;
}
export function freshCombatScopedV5(value, combatScopeId = uid()) {
  const { combatActions, standardTurnActions, ...v5 } = value || {};
  return { ...v5, combatScopeId, turnIndex: 1 };
}
export function clearV5FortuneAdvantageDeclaration(envelope,actorId){
  const v5=envelope.extensions?.v5||{},rows=v5.fortuneAdvantageDeclarations||[];
  if(!rows.some(row=>row.actorId===actorId))return envelope;
  return {...envelope,extensions:{...(envelope.extensions||{}),v5:{...v5,fortuneAdvantageDeclarations:rows.filter(row=>row.actorId!==actorId)}}};
}
export function clearMountedRelation(participant) {
  if (!participant?.extensions?.v5 || (participant.extensions.v5.mounted !== true && !participant.extensions.v5.mountId)) return participant;
  return withV5(participant, v5 => {
    const { mountId, ...rest } = v5;
    return { ...rest, mounted: false };
  });
}
export function dismountLinkedRiders(participants, mountId) {
  return (participants || []).map(participant => participant?.extensions?.v5?.mounted === true
    && participant.extensions.v5.mountId === mountId ? clearMountedRelation(participant) : participant);
}
