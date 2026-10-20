/** Pure V5 turn transition; every die is an explicit input and all actors share one commit. */
import {expireDivineEffects} from './v5-divine-engine.js';
import {refreshEffectLayers} from './v5-magic-effects.js';
import { effectiveOrder, nextTurn } from './turn-order.js';
import { advanceV5Effects, acquireV5Conditions } from './v5-effects.js';
import { getV5CriticalEffect } from '../data/v5-crits.js';
import { processCombatTurnSpells, shieldAtTurnStart, recurringSpellHits, roundSpellEffects } from './v5-magic-turn.js';
import { advanceGameClock, createGameClock, deriveTurnPhasePlan, readCombatPosition } from './v5-game-time.js';
import { expireDivineAtClock } from './v5-divine-store.js';
import { resolveV5ConditionTestContext } from './v5-test-context.js';

const kinds = { fireRoll: 'd10', bleedingDeathRoll: 'd10', fireCriticalRoll: 'd100', bleedingEnduranceTest: 'test', poisonEnduranceTest: 'test', recoveryTest: 'test', currentWounds: 'manual' };
function brokenEscapeTurnGate(state){
 const actor=state.combat?.participants?.find(row=>row.id===state.combat?.currentActorId);
 const context=actor&&resolveV5ConditionTestContext(actor,{characteristic:'Ag',isAction:true,involvesMovement:true,runningOrHiding:true,requiresSight:false,reliesOnSight:false});
 if(!(context?.levels?.brise>0))return null;
 const scene=state.activeScene,encounterId=scene?.encounterId||scene?.id||state.extensions?.v5?.combatId,serial=scene?.extensions?.v5?.turnIndex??state.extensions?.v5?.turnIndex,turnId=encounterId&&actor?.id&&Number.isSafeInteger(serial)?`${scene?.id||encounterId}:${serial}:${actor.id}`:null;
 if(!turnId)return {status:'requires-input',code:'BROKEN_ESCAPE_CLOCK',error:'Horloge canonique du Tour requise pour vérifier la fuite de Brisé.',needsInput:[{field:'clock.turnId',label:'Établir l’horloge canonique du Tour.'}]};
 const sequence=state.extensions?.v5?.brokenEscape?.byActorId?.[actor.id];
 if(sequence?.turnId===turnId&&sequence.factsCommitted===true&&sequence.visibleToAnyEnemy===false)return null;
 if(sequence?.turnId===turnId&&sequence.fleeCommitted===true&&sequence.sprintCommitted===true)return null;
 const key=JSON.stringify([encounterId,turnId]),ledger=state.extensions?.v5?.actionLedger||{quotaUsage:[]};
 const actionSpent=(ledger.quotaUsage||[]).some(row=>row.actorId===actor.id&&row.quotaId==='system:turn-action'&&row.scope==='turn'&&row.scopeKey===key&&row.used>0)||(state.extensions?.v5?.standardTurnActions||[]).some(row=>row.actorId===actor.id&&row.encounterId===encounterId&&row.turnId===turnId);
 if(actionSpent&&!(sequence?.turnId===turnId&&sequence?.fleeCommitted))return {status:'blocked',code:'DIV-BROKEN-MIDTURN-01',error:'Une Action a été dépensée avant Move (Flee) : décision MJ explicite requise pour cette occurrence.',needsInput:[{field:'decision.DIV-BROKEN-MIDTURN-01',label:'Décision MJ explicite requise; aucune Action supplémentaire ni report automatique.'}]};
 return {status:'blocked',code:'BROKEN_ESCAPE_REQUIRED',error:'Brisé exige Move (Flee), puis Action (Sprint) si visible, ou une attestation MJ hors vue.',needsInput:[{field:'brokenEscapeFacts.visibleToAnyEnemy',label:'Résoudre Flee/Sprint ou confirmer explicitement hors vue.'}]};
}
export function previewV5Turn(state, { inputs = {} } = {}) {
  const before = structuredClone(state);
  const combat = before.combat || {};
  if (!combat.round) return { status: 'idle', ready: false, baseRevision: state.localRevision || 0, requests: [] };
  const brokenGate=brokenEscapeTurnGate(before);if(brokenGate)return {...brokenGate,ready:false,baseRevision:before.localRevision||0,requests:[]};
  // Le froid prend effet sur l'ordre automatique au prochain Round, jamais sur les Tours en cours.
  const order = before.extensions?.v5?.orderRound===combat.round?effectiveOrder(combat.participants || [],{mode:'manual',order:combat.order}):effectiveOrder(combat.participants || [], { mode: combat.orderMode, order: combat.order,round:combat.round });
  const transition = nextTurn({ participants: combat.participants, order, currentActorId: combat.currentActorId, round: combat.round });
  if (!transition.currentActorId) return { status: 'idle', ready: false, baseRevision: state.localRevision || 0, requests: [] };
  const fromPosition = readCombatPosition(before);
  const turn = fromPosition.turnIndex;
  const clock = before.extensions?.v5?.gameClock || createGameClock(before);
  if (JSON.stringify(clock.combat) !== JSON.stringify(fromPosition)) return { status: 'clock-conflict', ready: false,
    baseRevision: before.localRevision || 0, requests: [], error: 'La projection de l’horloge ne correspond pas au combat canonique.' };
  let toPosition = { ...fromPosition, round: transition.round, turnIndex: turn + 1, currentActorId: transition.currentActorId };
  let phasePlan;
  try { phasePlan = deriveTurnPhasePlan({ from: fromPosition, to: toPosition }); }
  catch (error) { return { status: 'clock-conflict', ready: false, baseRevision: before.localRevision || 0, requests: [], error: error.message }; }
  const phaseRows = name => phasePlan.filter(item => item.phase === name);
  const phaseRow = name => phaseRows(name).at(-1) || null;
  const requests = [], receipts = [], effectLogs = [];
  let participants = (combat.participants || []).map(participant => structuredClone(participant));
  const runPhase = (phase, rows) => {
    const start = rows[0], finish = rows.at(-1);
    if (!start || !finish) throw new Error(`Plan de phases incomplet : ${phase}`);
    const { round, actorId, turnIndex: serial } = start;
    participants = participants.map(participant => {
      // Combat clocks for actors waiting to enter the scene do not advance.
      if (phase === 'endOfRound' && participant.zone !== 'active') return participant;
      const beforeDivine=expireDivineEffects(participant,{...start,turn:start.turnIndex});
      if(beforeDivine.removed.length)participant=refreshEffectLayers(beforeDivine.participant,participant);
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
      const afterDivine=expireDivineEffects(updated,{...finish,turn:finish.turnIndex});
      if(afterDivine.removed.length)updated=refreshEffectLayers(afterDivine.participant,updated);
      receipt.removed.push(...beforeDivine.removed.concat(afterDivine.removed).map(id=>({id,kind:'divine-effect'})));
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
  runPhase('endOfTurn', phaseRows('endOfTurn'));
  const ending=phaseRow('endOfTurn');
  const endedSpells=roundSpellEffects(participants,ending.phase,ending.round,inputs,ending.actorId);participants=endedSpells.participants;requests.push(...endedSpells.requests);effectLogs.push(...endedSpells.logs);
  const expiry=phaseRow('expiry');
  const closingSpells=roundSpellEffects(participants,expiry.phase,expiry.round,inputs,expiry.actorId);participants=closingSpells.participants;requests.push(...closingSpells.requests);effectLogs.push(...closingSpells.logs);
  participants = processCombatTurnSpells(participants, transition.round, transition.currentActorId, { actorId: combat.currentActorId, round: combat.round });
  const caster=phaseRow('endOfCasterTurn');
  const casterSpells=roundSpellEffects(participants,caster.phase,caster.round,inputs,caster.actorId);participants=casterSpells.participants;requests.push(...casterSpells.requests);effectLogs.push(...casterSpells.logs);
  if (transition.round > combat.round) {
    runPhase('endOfRound', phaseRows('endOfRound'));
    const endRound=phaseRows('endOfRound').at(-1),startRound=phaseRow('startOfRound');
    for (const row of [endRound,startRound]) {
      const spells=roundSpellEffects(participants,row.phase,row.round,inputs,row.actorId); participants=spells.participants; requests.push(...spells.requests); effectLogs.push(...spells.logs);
    }
  }
  if(transition.round>combat.round){transition.order=effectiveOrder(participants,{mode:combat.orderMode,order:combat.order,round:transition.round});transition.currentActorId=transition.order[0] || null;}
  toPosition = { ...fromPosition, round: transition.round, turnIndex: turn + 1, currentActorId: transition.currentActorId };
  try { phasePlan = deriveTurnPhasePlan({ from: fromPosition, to: toPosition }); }
  catch (error) { return { status: 'clock-conflict', ready: false, baseRevision: before.localRevision || 0, requests: [], error: error.message }; }
  runPhase('startOfTurn', phaseRows('startOfTurn'));
  const starting=phaseRow('startOfTurn');
  const startSpells=roundSpellEffects(participants,starting.phase,starting.round,inputs,starting.actorId);participants=startSpells.participants;requests.push(...startSpells.requests);effectLogs.push(...startSpells.logs);
  participants = shieldAtTurnStart(participants, transition.currentActorId);
  // Sorts à coups récurrents (Lames Azurées) : portés au début du Tour de l'adversaire désigné.
  const recurring = recurringSpellHits(participants, transition.currentActorId, inputs);
  participants = recurring.participants;
  requests.push(...recurring.requests);
  effectLogs.push(...recurring.logs);
  const nextActor = participants.find(participant => participant.id === transition.currentActorId);
  const uniqueRequests = requests.filter((request, index) => requests.findIndex(other => other.participantId === request.participantId && other.field === request.field) === index);
  const clockEvent = {
    // A repeated preview of the same state is the same CAS payload (safe to
    // retry); every accepted transition changes the base revision, while this
    // producer marker keeps it distinct from legacy Store.nextTurn events.
    id: `clock-v1:${clock.revision}:v5-preview-${before.localRevision || 0}-${turn}-${toPosition.turnIndex}-${encodeURIComponent(toPosition.currentActorId)}`,
    baseRevision: clock.revision, kind: 'combat-transition', sceneId: fromPosition.sceneId,
    from: fromPosition, to: toPosition, phases: phasePlan
  };
  const clockResult = advanceGameClock(clock, clockEvent);
  if (!clockResult.ok) return { status: `clock-${clockResult.status}`, ready: false, baseRevision: before.localRevision || 0, requests: [], error: 'La transition de Tour n’a pas pu être validée sur l’horloge.' };
  let stateAfter = { ...before,
    ...(before.activeScene ? { activeScene: { ...before.activeScene, extensions: { ...(before.activeScene.extensions || {}), v5: { ...(before.activeScene.extensions?.v5 || {}), turnIndex: turn + 1 } } } } : {}),
    extensions: { ...(before.extensions || {}), v5: { ...(before.extensions?.v5 || {}), turnIndex: turn + 1,orderRound:transition.round, gameClock: clockResult.clock } },
    combat: { ...combat, participants, ...transition },
    log: [{ id: `v5-turn:${before.localRevision || 0}:${turn}:management`,  kind: 'management', actorId: nextActor?.id, actorName: nextActor?.name,
      text: `▶ ${transition.round !== combat.round ? `Round ${transition.round} — ` : ''}Tour de ${nextActor?.name || '—'}` }, ...effectLogs, ...(before.log || [])].slice(0, 300) };
  const divineClock=expireDivineAtClock(stateAfter,{fromClock:clock,toClock:clockResult.clock,receipt:clockResult.receipt});
  if(!divineClock.ok)return {status:'requires-input',ready:false,baseRevision:before.localRevision||0,requests:[],error:divineClock.needsInput.map(row=>row.message).join(' '),needsInput:divineClock.needsInput};
  stateAfter=divineClock.state;
  if (transition.round > combat.round) {
    const reminders = stateAfter.combat.participants.filter(participant => participant.zone === 'active' && (participant.extensions?.v5?.divineEffects || []).some(layer => layer.freeAttack))
      .map(participant => ({ id: `divine-free-attack:${transition.round}:${participant.id}`, kind: 'reminder', actorId: participant.id,
        text: `Attaque Rapide disponible pour ${participant.name} (Test d’Initiative +0, main principale).` }));
    stateAfter.log = [...reminders, ...(stateAfter.log || [])].slice(0, 300);
  }
  return { status: uniqueRequests.length ? 'requires-input' : 'ready', ready: !uniqueRequests.length,
    baseRevision: before.localRevision || 0, inputs: structuredClone(inputs), requests: uniqueRequests, receipts, transition, phases: clockResult.validatedPhases, clockReceipt: clockResult.receipt, state: stateAfter };
}
