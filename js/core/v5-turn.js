/** Pure V5 turn transition; every die is an explicit input and all actors share one commit. */
import { effectiveOrder, nextTurn } from './turn-order.js';
import { advanceV5Effects, acquireV5Conditions } from './v5-effects.js';
import { getV5CriticalEffect } from '../data/v5-crits.js';
import { processCombatTurnSpells, shieldAtTurnStart, recurringSpellHits, roundSpellEffects } from './v5-magic-turn.js';

const kinds = { fireRoll: 'd10', bleedingDeathRoll: 'd10', fireCriticalRoll: 'd100', bleedingEnduranceTest: 'test', poisonEnduranceTest: 'test', recoveryTest: 'test', currentWounds: 'manual' };
export function previewV5Turn(state, { inputs = {} } = {}) {
  const before = structuredClone(state);
  const combat = before.combat || {};
  if (!combat.round) return { status: 'idle', ready: false, baseRevision: state.localRevision || 0, requests: [] };
  // Le froid prend effet sur l'ordre automatique au prochain Round, jamais sur les Tours en cours.
  const order = before.extensions?.v5?.orderRound===combat.round?effectiveOrder(combat.participants || [],{mode:'manual',order:combat.order}):effectiveOrder(combat.participants || [], { mode: combat.orderMode, order: combat.order,round:combat.round });
  const transition = nextTurn({ participants: combat.participants, order, currentActorId: combat.currentActorId, round: combat.round });
  if (!transition.currentActorId) return { status: 'idle', ready: false, baseRevision: state.localRevision || 0, requests: [] };
  const turn = before.activeScene?.extensions?.v5?.turnIndex ?? before.extensions?.v5?.turnIndex ?? 1;
  const requests = [], receipts = [], effectLogs = [];
  let participants = (combat.participants || []).map(participant => structuredClone(participant));
  const runPhase = (phase, round, actorId, serial) => {
    participants = participants.map(participant => {
      // Combat clocks for actors waiting to enter the scene do not advance.
      if (phase === 'endOfRound' && participant.zone !== 'active') return participant;
      const data = inputs[participant.id] || {};
      const receipt = advanceV5Effects(participant, { phase, round, actorId, turn: serial }, data);
      for (const need of receipt.needsInput) requests.push({ ...need, participantId: participant.id, participantName: participant.name, kind: kinds[need.field] || 'integer' });
      let updated = receipt.participant;
      for (const critical of receipt.criticalRequests) {
        if (!Number.isInteger(data.fireCriticalRoll) || data.fireCriticalRoll < 1 || data.fireCriticalRoll > 100) {
          requests.push({ participantId: participant.id, participantName: participant.name, field: 'fireCriticalRoll', kind: 'd100', label: 'Critique de feu au corps : jet de gravité d100', bonus: critical.bonus });
          continue;
        }
        const severity = data.fireCriticalRoll + critical.bonus;
        const effect = getV5CriticalEffect(critical.location, severity);
        if (!effect) throw new Error('Table de critique V5 absente');
        updated.hp = Math.max(0, updated.hp - effect.parsed.extraWounds);
        const acquired = acquireV5Conditions(updated, effect.parsed.states, { authorId: participant.id, targetId: participant.id, round, toughnessBonus: data.toughnessBonus, source: { kind: 'fire-critical', severity } });
        updated = acquired.participant;
        receipt.acquiredInstances += acquired.acquiredInstances;
        receipt.removed.push(...acquired.removed);
        for (const need of acquired.needsInput) requests.push({ ...need, participantId: participant.id, participantName: participant.name, kind: kinds[need.field] || 'integer' });
        receipt.reminders.push(`Critique au corps ${severity} : ${effect.name}. ${effect.eff}`);
        receipt.reminders.push(...effect.parsed.reminders);
        if (effect.parsed.death) receipt.death = true;
        receipt.fireCritical = { ...critical, roll: data.fireCriticalRoll, severity, effect };
      }
      receipt.participant = updated;
      receipt.hpDelta = (Number(updated.hp) || 0) - (Number(participant.hp) || 0);
      receipts.push({ participantId: participant.id, phase, ...receipt });
      if (receipt.hpDelta || receipt.removed.length || receipt.acquiredInstances || receipt.reminders.length || receipt.fireCritical || receipt.death) {
        effectLogs.push({ id: `v5-turn:${before.localRevision || 0}:${serial}:${phase}:${participant.id}`,  kind: 'effect', actorId: participant.id, actorName: participant.name,
          text: `${participant.name} · ${phase === 'endOfRound' ? 'fin de Round' : phase === 'startOfTurn' ? 'début de Tour' : 'fin de Tour'}${receipt.hpDelta ? ` · ${-receipt.hpDelta} Blessures perdues` : ''}${receipt.removed.length ? ` · ${receipt.removed.length} effet(s) retiré(s)` : ''}${receipt.death ? ' · décès : vérifier le personnage' : ''}`,
          detail: { ruleVersion: receipt.ruleVersion, phase, round, turn: serial, hpBefore: participant.hp, hpAfter: updated.hp,
            input: structuredClone(data), removed: receipt.removed, reminders: receipt.reminders, fireCritical: receipt.fireCritical || null, death: receipt.death } });
      }
      return updated;
    });
  };
  runPhase('endOfTurn', combat.round, combat.currentActorId, turn);
  const endedSpells=roundSpellEffects(participants,'endOfTurn',combat.round,inputs,combat.currentActorId);participants=endedSpells.participants;requests.push(...endedSpells.requests);effectLogs.push(...endedSpells.logs);
  const closingSpells=roundSpellEffects(participants,'expiry',combat.round,inputs,combat.currentActorId);participants=closingSpells.participants;requests.push(...closingSpells.requests);effectLogs.push(...closingSpells.logs);
  participants = processCombatTurnSpells(participants, transition.round, transition.currentActorId, { actorId: combat.currentActorId, round: combat.round });
  const casterSpells=roundSpellEffects(participants,'endOfCasterTurn',combat.round,inputs,combat.currentActorId);participants=casterSpells.participants;requests.push(...casterSpells.requests);effectLogs.push(...casterSpells.logs);
  if (transition.round > combat.round) {
    runPhase('endOfRound', combat.round, combat.currentActorId, turn);
    for (const [phase,round] of [['endOfRound',combat.round],['startOfRound',transition.round]]) {
      const spells=roundSpellEffects(participants,phase,round,inputs); participants=spells.participants; requests.push(...spells.requests); effectLogs.push(...spells.logs);
    }
  }
  if(transition.round>combat.round){transition.order=effectiveOrder(participants,{mode:combat.orderMode,order:combat.order,round:transition.round});transition.currentActorId=transition.order[0] || null;}
  runPhase('startOfTurn', transition.round, transition.currentActorId, turn + 1);
  const startSpells=roundSpellEffects(participants,'startOfTurn',transition.round,inputs,transition.currentActorId);participants=startSpells.participants;requests.push(...startSpells.requests);effectLogs.push(...startSpells.logs);
  participants = shieldAtTurnStart(participants, transition.currentActorId);
  // Sorts à coups récurrents (Lames Azurées) : portés au début du Tour de l'adversaire désigné.
  const recurring = recurringSpellHits(participants, transition.currentActorId, inputs);
  participants = recurring.participants;
  requests.push(...recurring.requests);
  effectLogs.push(...recurring.logs);
  const nextActor = participants.find(participant => participant.id === transition.currentActorId);
  const uniqueRequests = requests.filter((request, index) => requests.findIndex(other => other.participantId === request.participantId && other.field === request.field) === index);
  const stateAfter = { ...before,
    ...(before.activeScene ? { activeScene: { ...before.activeScene, extensions: { ...(before.activeScene.extensions || {}), v5: { ...(before.activeScene.extensions?.v5 || {}), turnIndex: turn + 1 } } } } : {}),
    extensions: { ...(before.extensions || {}), v5: { ...(before.extensions?.v5 || {}), turnIndex: turn + 1,orderRound:transition.round } },
    combat: { ...combat, participants, ...transition },
    log: [{ id: `v5-turn:${before.localRevision || 0}:${turn}:management`,  kind: 'management', actorId: nextActor?.id, actorName: nextActor?.name,
      text: `▶ ${transition.round !== combat.round ? `Round ${transition.round} — ` : ''}Tour de ${nextActor?.name || '—'}` }, ...effectLogs, ...(before.log || [])].slice(0, 300) };
  return { status: uniqueRequests.length ? 'requires-input' : 'ready', ready: !uniqueRequests.length,
    baseRevision: before.localRevision || 0, inputs: structuredClone(inputs), requests: uniqueRequests, receipts, transition, state: stateAfter };
}
