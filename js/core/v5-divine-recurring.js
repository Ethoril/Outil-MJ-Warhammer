/**
 * Collecteur pur des effets divins récurrents (brique F2 des miracles narratifs) : Tests imposés `round` (début de chaque Round),
 * `turn` et `move` (début du Tour du porteur). Appelé par `previewV5Turn` comme les effets de Traits : les demandes vont dans
 * `requests`, les issues sont appliquées dans le même état (un commit, un ↶). Aucun dé tiré : la réponse est lue dans
 * `inputs[participantId][field]` (d100, ou `{ success, sl }`). `optional` et `move` : demande `choice` « tente-t-il ? » d'abord.
 * Un participant sans couche concernée reste tel quel (même objet). Début de Round : perte d'Élan des zones `momentumLoss` (L11).
 */
import { imposedField, imposedRequest, imposedAnswer, outcomesFor, applyImposedOutcomes } from './v5-divine-effects-imposed.js';
import { sourceActive } from './v5-talent-source.js';
import { divineZoneMomentumLoss } from './v5-divine-effects-zones.js';

const nameOf = participant => participant?.name || participant?.id || '—';
const inPlay = participant => Boolean(participant) && (!participant.zone || participant.zone === 'active') && participant.extensions?.v5?.dead !== true;
const PHASE_WHEN = { startOfRound: ['round'], startOfTurn: ['turn', 'move'] };
const frenzied = participant => (participant.states || []).some(row => row.key === 'frenzy' && sourceActive(row));

export function collectDivineRecurringEffects({ participants = [], phase, round = null, turnIndex = null, actorId = null, inputs = {} } = {}) {
  const out = { participants, requests: [], logs: [] };
  const whens = PHASE_WHEN[phase];
  if (!whens) return out;
  let changed = false;
  const next = participants.map(participant => {
    if (!inPlay(participant) || (phase === 'startOfTurn' && participant.id !== actorId)) return participant;
    const layers = (participant.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'imposed-test' && whens.includes(layer.imposedTest?.when));
    let current = participant;
    for (const layer of layers) {
      const spec = layer.imposedTest;
      // Frénésie déjà active : aucun Test gratuit à proposer.
      if (spec.onSuccess?.some(row => row.type === 'frenzy') && frenzied(current)) continue;
      const field = imposedField(layer), given = inputs?.[participant.id] || {};
      if (spec.optional || spec.when === 'move') {
        const attempt = given[`${field}:attempt`];
        if (typeof attempt !== 'boolean') {
          out.requests.push({ field: `${field}:attempt`, kind: 'choice', participantId: participant.id, participantName: participant.name,
            label: spec.when === 'move' ? `${nameOf(participant)} · ${spec.label} : utilise-t-il son Mouvement ce Tour ?` : `${nameOf(participant)} · ${spec.label} : tente-t-il le Test ?` });
          continue;
        }
        if (!attempt) continue;
      }
      const result = imposedAnswer(current, spec.test, given[field]);
      if (!result) { out.requests.push(imposedRequest(current, layer)); continue; }
      const outcomes = outcomesFor(spec, result).filter(row => row.type !== 'marker');
      const applied = applyImposedOutcomes(current, outcomes, { prayerId: layer.prayerId, executionId: layer.executionId,
        resolutionId: `${layer.id}:r${round}:t${turnIndex}`, round, author: participant, test: result });
      current = applied.participant;
      changed = true;
      out.logs.push({ id: `divine-imposed:${layer.id}:r${round}:t${turnIndex}:${phase}`, kind: 'effect', actorId: participant.id, actorName: participant.name,
        text: `${nameOf(participant)} · ${spec.label} : Test ${result.success ? 'réussi' : 'raté'} (${result.sl} DR)${applied.applied.length ? ' · ' + applied.applied.join(', ') : ''}`,
        detail: { kind: 'divine-imposed-test', layerId: layer.id, phase, round, result, applied: applied.applied, reminders: applied.reminders } });
    }
    return current;
  });
  if (changed) out.participants = next;
  if (phase === 'startOfRound') {
    const loss = divineZoneMomentumLoss(out.participants, { round });
    out.participants = loss.participants; out.logs.push(...loss.logs);
  }
  return out;
}
