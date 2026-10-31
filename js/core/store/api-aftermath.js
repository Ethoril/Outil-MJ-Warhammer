import { createAftermathState, validateAftermathState, previewAftermathAdvance, aftermathEnduranceScore, registerWoundIncident, advanceAftermathCalendar, archiveAftermathIncident, treatWoundIncident, treatInfection, treatSurgicalIncident, closeAftermathIncident, registerDisease, careForDisease } from '../v5-aftermath.js';
import { previewSequelaeAdvance, sequelaeOutstanding, planSequelae, sequelaWarnings, pendingSequelaDecisions, openSequelae, setSequelaFacts, immobilizeFracture, unbindFracture, resolveFractureHealing, treatTornMuscle, confirmResetLimb, recordPostEncounterTest, decideSurgeryDeadline, recordRelearning, decideImpressiveScars, recordCharacteristicLoss } from '../v5-sequelae.js';
import { previewFamiliarHealing } from '../familiars.js';
import { healV5Wounds } from '../v5-effects.js';
import { criticalDeathToughnessBonus } from '../store/critical-death.js';
import { updateCriticalDeathCountdown } from '../v5-critical-aftermath.js';
import { uid, cloneValue } from '../models.js';
import { sequelaCharacteristicTotals, sequelaEffectRows, sequelaPhase } from '../v5-sequela-effects.js';

export function createAftermathApi({ api, currentEnvelope, absentAftermathSubjects, runAftermathCommand, aftermathHealerOf, sequelaAmputation, aftermathAmputation, withHealingFumble }) {
  return {
    getAftermathState() {
      const stored = currentEnvelope().extensions?.v5?.aftermathRegister;
      return stored == null ? createAftermathState() : validateAftermathState(stored);
    },
    previewAftermathAdvance(input = {}) {
      const participants = currentEnvelope().combat?.participants || [];
      const state = api.getAftermathState();
      const preview = previewAftermathAdvance(state, { ...input, absentParticipantIds: absentAftermathSubjects(state, participants) });
      if (preview.status !== 'ready') return preview;
      return { ...preview, sequelaEvents: previewSequelaeAdvance(state, preview.days).map(event => ({ ...event, participantName: participants.find(row => row.id === event.participantId)?.name || null })), requiredDailyChecks: preview.requiredDailyChecks.map(check => {
        const patient = participants.find(row => row.id === check.participantId);
        return { ...check, participantName: patient?.name || null, score: patient ? aftermathEnduranceScore(patient) : null };
      }) };
    },
    /** F2-I occurrences that have no incident yet: the only way (with a lost-Wounds cause) to open one. */
    listAftermathProposals() {
      const linked = new Set(api.getAftermathState().incidents.filter(row => row.source.kind === 'critical').map(row => `${row.participantId}:${row.source.criticalId}`));
      return (currentEnvelope().combat?.participants || []).flatMap(participant => (participant.extensions?.v5?.criticalAftermath || [])
        .filter(record => !linked.has(`${participant.id}:${record.id}`))
        .map(record => ({
          participantId: participant.id, participantName: participant.name, criticalId: record.id, criticalWoundId: record.criticalWoundId,
          effectName: record.effectName, location: record.location,
          requiresSurgery: (record.sequela?.durableEffects || []).some(effect => effect.kind === 'surgery-required')
        })));
    },
    registerAftermathIncident(input = {}) {
      return runAftermathCommand('register-aftermath-incident', (state, draft) => {
        const refuse = reason => ({ status: 'refused', reason, receipt: { id: input.operationId ?? null, kind: 'incident', status: 'refused', reason } });
        const participant = (draft.combat?.participants || []).find(row => row.id === input.participantId);
        if (!participant) return refuse('unknown-subject');
        let source, requiresSurgery = false, id = input.id;
        if (input.criticalId != null) {
          // Lien par identifiant stable avec l'occurrence F2-I ; l'exigence de chirurgie vient de la table, jamais de la saisie.
          const record = (participant.extensions?.v5?.criticalAftermath || []).find(row => row.id === input.criticalId);
          if (!record) return refuse('critical-occurrence-not-found');
          source = { kind: 'critical', criticalId: record.id, criticalWoundId: record.criticalWoundId };
          requiresSurgery = (record.sequela?.durableEffects || []).some(effect => effect.kind === 'surgery-required');
          id ??= `incident:${record.id}`;
        } else if (typeof input.cause === 'string' && input.cause.trim()) {
          // Blessures perdues sans critique : le patient doit réellement en avoir perdu.
          if (!(Number(participant.hp) < Number(participant.maxHp))) return refuse('no-wounds-lost');
          source = { kind: 'wounds-lost', cause: input.cause.trim() };
          id ??= `incident:${input.operationId}`;
        } else return refuse('incident-source-required');
        return registerWoundIncident(state, { id, operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, participantId: participant.id, source, subjectKind: input.subjectKind, bandaged: input.bandaged, requiresSurgery });
      });
    },
    advanceAftermathCalendar(input = {}) {
      return runAftermathCommand('advance-aftermath-calendar', (state, draft) => {
        const participants = draft.combat?.participants || [];
        const enduranceScores = {};
        for (const incident of state.incidents) {
          const patient = participants.find(row => row.id === incident.participantId);
          const score = patient ? aftermathEnduranceScore(patient) : null;
          if (score !== null) enduranceScores[incident.participantId] = score;
        }
        return advanceAftermathCalendar(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, days: input.days, dailyTests: input.dailyTests, enduranceScores, absentParticipantIds: absentAftermathSubjects(state, participants) });
      });
    },
    /** Patient retiré du combat : l'incident est archivé, l'historique reste, plus aucun Test n'est attendu. */
    archiveAftermathIncident(input = {}) {
      return runAftermathCommand('archive-aftermath-incident', (state, draft) => {
        const incident = state.incidents.find(row => row.id === input.incidentId);
        if (incident && (draft.combat?.participants || []).some(row => row.id === incident.participantId)) return { status: 'refused', reason: 'subject-still-present', receipt: { id: input.operationId ?? null, kind: 'archive-incident', status: 'refused', reason: 'subject-still-present', incidentId: input.incidentId } };
        return archiveAftermathIncident(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId });
      });
    },
    treatAftermathWound(input = {}) {
      return runAftermathCommand('treat-aftermath-wound', (state, draft) => {
        const incident = state.incidents.find(row => row.id === input.incidentId);
        const patient = incident && (draft.combat?.participants || []).find(row => row.id === incident.participantId);
        const refuse = reason => ({ status: 'refused', reason, receipt: { id: input.operationId ?? null, kind: 'treatment', status: 'refused', reason, incidentId: input.incidentId } });
        // Un homoncule ne guérit que par guérison naturelle ou par magie : ni Soin ni médecine.
        if (patient && !previewFamiliarHealing(patient, { kind: 'heal' }).ok) return refuse('familiar-healing');
        const found = incident ? aftermathHealerOf(draft, incident.subjectKind === 'animal' ? 'animal-care' : 'heal', input) : { ok: false };
        const outcome = treatWoundIncident(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId, healer: found.ok ? found.healer : null, roll: input.roll, wounds: Number(patient?.hp) || 0, supplies: input.supplies, difficultyDR: input.difficultyDR ?? 0, d10: input.d10 ?? null, inCombat: input.inCombat === true, bleedingOnly: input.bleedingOnly === true, surgeryChoice: input.surgeryChoice ?? null });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        if (outcome.receipt.status === 'applied') {
          const receipt = outcome.receipt;
          // Même chemin que les autres soins : Empaleuse fiché, Empoisonné à 0, plafond de Blessures, Hémorragiques retirés par Blessure rendue.
          outcome.afterApply = next => {
            const target = next.combat.participants.find(row => row.id === patient.id);
            const planned = receipt.bleedingOnly ? receipt.bleedingToRemove : receipt.healed;
            if (planned > 0) {
              const hpBefore = target.hp;
              const ceilingProbe = receipt.bleedingOnly ? { ...target, maxHp: Number(target.hp) + planned + 1 } : target;
              const healing = healV5Wounds(ceilingProbe, planned);
              target.states = healing.participant.states;
              if (!receipt.bleedingOnly) {
                target.hp = healing.participant.hp;
                target.extensions = healing.participant.extensions;
              }
              receipt.healed = receipt.bleedingOnly ? 0 : healing.hpDelta;
              receipt.bleedingRemoved = healing.removed.length;
              if (healing.healingBlockedByLodgedProjectiles) receipt.healingBlockedByLodgedProjectiles = healing.healingBlockedByLodgedProjectiles;
              if (receipt.bleedingOnly) target.hp = hpBefore;
            }
            if (receipt.fumbleDamage) target.hp = Math.max(0, Number(target.hp) - receipt.fumbleDamage);
            receipt.currentWoundsAfter = target.hp;
            return next;
          };
        }
        return outcome;
      });
    },
    treatAftermathInfection(input = {}) {
      return runAftermathCommand('treat-aftermath-infection', (state, draft) => {
        const incident = state.incidents.find(row => row.id === input.incidentId);
        const found = input.remedy === true || !incident ? { ok: false } : aftermathHealerOf(draft, incident.subjectKind === 'animal' ? 'animal-care' : 'heal', input);
        const outcome = treatInfection(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId, healer: found.ok ? found.healer : null, roll: input.roll ?? null, remedy: input.remedy === true });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        return outcome;
      });
    },
    treatAftermathSurgicalIncident(input = {}) {
      return runAftermathCommand('treat-aftermath-surgery', (state, draft) => {
        const incident = state.incidents.find(row => row.id === input.incidentId);
        const patient = incident && (draft.combat?.participants || []).find(row => row.id === incident.participantId);
        const record = incident?.source.kind === 'critical' ? (patient?.extensions?.v5?.criticalAftermath || []).find(row => row.id === incident.source.criticalId) : null;
        const found = aftermathHealerOf(draft, 'heal', input);
        const outcome = treatSurgicalIncident(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId, healer: found.ok ? found.healer : null, roll: input.roll, surgeryRequired: sequelaAmputation(record) === 'occurred' || (record?.sequela?.durableEffects || []).some(effect => effect.kind === 'surgery-deadline'), d10: input.d10 ?? null, wounds: Number(patient?.hp) || 0 });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        if (outcome.receipt.status === 'applied' && outcome.receipt.fumbleDamage) {
          outcome.afterApply = next => {
            const target = next.combat.participants.find(row => row.id === patient.id);
            target.hp = Math.max(0, Number(target.hp) - outcome.receipt.fumbleDamage);
            return next;
          };
        }
        return outcome;
      });
    },
    /** Critique guéri (V5 p.172, 178) : États retirés, malus temporaires terminés (MJ), chirurgie faite si exigée ou si une amputation a eu lieu. */
    closeAftermathIncident(input = {}) {
      return runAftermathCommand('close-aftermath-incident', (state, draft) => {
        const refuse = (reason, details = {}) => ({ status: 'refused', reason, receipt: { id: input.operationId ?? null, kind: 'close-incident', status: 'refused', reason, incidentId: input.incidentId, ...details } });
        const incident = state.incidents.find(row => row.id === input.incidentId);
        const patient = incident && (draft.combat?.participants || []).find(row => row.id === incident.participantId);
        let statesCleared = true, wound = null, record = null, surgeryRequired = false;
        if (incident?.status === 'open' && incident.source.kind === 'critical') {
          if (!patient) return refuse('unknown-subject');
          record = (patient.extensions?.v5?.criticalAftermath || []).find(row => row.id === incident.source.criticalId);
          if (!record) return refuse('critical-occurrence-not-found');
          const amputation = aftermathAmputation(record);
          if (amputation === 'pending') return refuse('amputation-decision-pending');
          // Lésions, pertes et durables (J2) : un critique n'est guéri que quand chacune de ses séquelles a un suivi terminé ; l'historique et les effets permanents restent.
          const outstanding = sequelaeOutstanding(state, incident.id, { planned: planSequelae(record), amputation: sequelaAmputation(record) });
          if (outstanding.length) return refuse(outstanding.some(row => row.reason === 'not-opened') ? 'sequelae-follow-up-not-opened' : 'sequelae-follow-up-open', { outstanding });
          // Toute amputation exige la Chirurgie (p.178), y compris les pertes fonctionnelles et les pertes conditionnelles confirmées.
          surgeryRequired = sequelaAmputation(record) === 'occurred';
          wound = (patient.extensions?.v5?.criticalWounds || []).find(row => row.id === incident.source.criticalWoundId) || null;
          if ((record.sequela?.states || []).length) {
            // Un enregistrement sans stateIds (ancien ou non rattaché) n'est jamais validé tout seul : le MJ confirme.
            if (wound?.stateIds?.length) {
              const stateIds = new Set(wound.stateIds);
              statesCleared = !(patient.states || []).some(row => stateIds.has(row.id) && Number(row.level ?? 1) > 0);
            } else statesCleared = input.statesConfirmed === true;
          }
        }
        const outcome = closeAftermathIncident(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId, statesCleared, temporaryEffectsEnded: input.temporaryEffectsEnded === true, surgeryRequired });
        if (outcome.receipt.status === 'applied' && wound) {
          outcome.afterApply = next => {
            const target = next.combat.participants.find(row => row.id === patient.id);
            target.extensions.v5.criticalWounds = (target.extensions.v5.criticalWounds || []).filter(row => row.id !== wound.id);
            const be = criticalDeathToughnessBonus(target);
            if (be !== null) {
              const reconciled = updateCriticalDeathCountdown(target, { round: next.combat?.round, toughnessBonus: be });
              if (reconciled.participant) Object.assign(target, reconciled.participant);
            }
            next.log = [{ id: uid(), kind: 'management', actorId: target.id, actorName: target.name,
              text: `${target.name} : Blessure Critique guérie (états et malus temporaires terminés) · ${record.effectName || record.id}`,
              detail: { kind: 'heal-critical-wound', incidentId: incident.id, criticalId: record.id } }, ...(next.log || [])].slice(0, 300);
            return next;
          };
        }
        return outcome;
      });
    },
    /** Séquelles de la convalescence (F2-J2) : suivis, phases, décisions en attente, étapes proposées par incident et pertes de caractéristique à renvoyer à la fiche. */
    listAftermathSequelae() {
      const state = api.getAftermathState();
      const participants = currentEnvelope().combat?.participants || [];
      const day = state.calendar.currentDay;
      const incidents = state.incidents.filter(row => row.status === 'open' && row.source.kind === 'critical').map(incident => {
        const record = (participants.find(row => row.id === incident.participantId)?.extensions?.v5?.criticalAftermath || []).find(row => row.id === incident.source.criticalId);
        const planned = record ? planSequelae(record) : [];
        return { incidentId: incident.id, participantId: incident.participantId, planned, needsOpening: planned.some(item => !(state.sequelae || []).some(row => row.id === item.id)),
          outstanding: sequelaeOutstanding(state, incident.id, { planned, amputation: sequelaAmputation(record) }) };
      });
      const characteristics = {};
      for (const id of new Set((state.sequelae || []).map(row => row.participantId))) {
        const totals = sequelaCharacteristicTotals(sequelaEffectRows(state, id), { lifetime: 'permanent' });
        if (Object.keys(totals).length) characteristics[id] = totals;
      }
      return { day, sequelae: (state.sequelae || []).map(row => ({ ...cloneValue(row), phase: sequelaPhase(row, day), warnings: sequelaWarnings(state, row) })), incidents, pending: pendingSequelaDecisions(state), characteristics };
    },
    openAftermathSequelae(input = {}) {
      return runAftermathCommand('open-aftermath-sequelae', (state, draft) => {
        const incident = state.incidents.find(row => row.id === input.incidentId);
        const patient = incident && (draft.combat?.participants || []).find(row => row.id === incident.participantId);
        const record = incident?.source.kind === 'critical' ? (patient?.extensions?.v5?.criticalAftermath || []).find(row => row.id === incident.source.criticalId) : null;
        const toughnessBonus = Number.isSafeInteger(input.toughnessBonus) && input.toughnessBonus >= 0 ? input.toughnessBonus : (patient ? criticalDeathToughnessBonus(patient) : null);
        return openSequelae(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, incidentId: input.incidentId, record, toughnessBonus, facts: input.facts || {} });
      });
    },
    setAftermathSequelaFacts(input = {}) {
      return runAftermathCommand('set-aftermath-sequela-facts', (state, draft) => {
        const sequela = (state.sequelae || []).find(row => row.id === input.sequelaId);
        const patient = sequela && (draft.combat?.participants || []).find(row => row.id === sequela.participantId);
        const toughnessBonus = Number.isSafeInteger(input.toughnessBonus) && input.toughnessBonus >= 0 ? input.toughnessBonus : (patient ? criticalDeathToughnessBonus(patient) : null);
        return setSequelaFacts(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, facts: input.facts || {}, toughnessBonus });
      });
    },
    immobilizeAftermathFracture(input = {}) {
      return runAftermathCommand('immobilize-aftermath-fracture', (state, draft) => {
        const found = aftermathHealerOf(draft, 'heal', input);
        const sequela = (state.sequelae || []).find(row => row.id === input.sequelaId);
        const patient = sequela && (draft.combat?.participants || []).find(row => row.id === sequela.participantId);
        const outcome = immobilizeFracture(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, healer: found.ok ? found.healer : null, roll: input.roll, d10: input.d10 ?? null, wounds: Number(patient?.hp) || 0 });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        return withHealingFumble(outcome, patient);
      });
    },
    unbindAftermathFracture(input = {}) {
      return runAftermathCommand('unbind-aftermath-fracture', state => unbindFracture(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId }));
    },
    resolveAftermathFracture(input = {}) {
      return runAftermathCommand('resolve-aftermath-fracture', (state, draft) => {
        const sequela = (state.sequelae || []).find(row => row.id === input.sequelaId);
        const patient = sequela && (draft.combat?.participants || []).find(row => row.id === sequela.participantId);
        return resolveFractureHealing(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, enduranceScore: patient ? aftermathEnduranceScore(patient) : null, roll: input.roll ?? null });
      });
    },
    treatAftermathTornMuscle(input = {}) {
      return runAftermathCommand('treat-aftermath-torn-muscle', (state, draft) => {
        const found = aftermathHealerOf(draft, 'heal', input);
        const sequela = (state.sequelae || []).find(row => row.id === input.sequelaId);
        const patient = sequela && (draft.combat?.participants || []).find(row => row.id === sequela.participantId);
        const outcome = treatTornMuscle(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, healer: found.ok ? found.healer : null, roll: input.roll, difficultyDR: input.difficultyDR ?? 0, d10: input.d10 ?? null, wounds: Number(patient?.hp) || 0 });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        return withHealingFumble(outcome, patient);
      });
    },
    confirmAftermathResetLimb(input = {}) {
      return runAftermathCommand('confirm-aftermath-reset-limb', state => confirmResetLimb(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId }));
    },
    recordAftermathPostEncounterTest(input = {}) {
      return runAftermathCommand('record-aftermath-post-encounter-test', (state, draft) => {
        const sequela = (state.sequelae || []).find(row => row.id === input.sequelaId);
        const patient = sequela && (draft.combat?.participants || []).find(row => row.id === sequela.participantId);
        return recordPostEncounterTest(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, enduranceScore: patient ? aftermathEnduranceScore(patient) : null, roll: input.roll });
      });
    },
    decideAftermathSurgeryDeadline(input = {}) {
      return runAftermathCommand('decide-aftermath-surgery-deadline', state => decideSurgeryDeadline(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, footLost: input.footLost, side: input.side ?? null }));
    },
    recordAftermathRelearning(input = {}) {
      return runAftermathCommand('record-aftermath-relearning', state => recordRelearning(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, sequelaId: input.sequelaId, hundredsOfXp: input.hundredsOfXp }));
    },
    decideAftermathImpressiveScars(input = {}) {
      return runAftermathCommand('decide-aftermath-impressive-scars', (state, draft) => {
        if (!(draft.combat?.participants || []).some(row => row.id === input.participantId)) return { status: 'refused', reason: 'unknown-subject', receipt: { id: input.operationId ?? null, kind: 'scar-decision', status: 'refused', reason: 'unknown-subject' } };
        return decideImpressiveScars(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, participantId: input.participantId, agreed: input.agreed });
      });
    },
    /** Perte de caractéristique décidée par le MJ (V5 p.177). Rien n'est écrit sur la fiche : la valeur est conservée avec sa provenance pour le retour futur. */
    recordAftermathCharacteristicLoss(input = {}) {
      return runAftermathCommand('record-aftermath-characteristic-loss', (state, draft) => {
        if (!(draft.combat?.participants || []).some(row => row.id === input.participantId)) return { status: 'refused', reason: 'unknown-subject', receipt: { id: input.operationId ?? null, kind: 'characteristic-loss', status: 'refused', reason: 'unknown-subject' } };
        return recordCharacteristicLoss(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, participantId: input.participantId, carac: input.carac, amount: input.amount, base: input.base ?? null, advances: input.advances ?? null, reason: input.reason });
      });
    },
    registerAftermathDisease(input = {}) {
      return runAftermathCommand('register-aftermath-disease', (state, draft) => {
        if (!(draft.combat?.participants || []).some(row => row.id === input.participantId)) return { status: 'refused', reason: 'unknown-subject', receipt: { id: input.operationId ?? null, kind: 'disease', status: 'refused', reason: 'unknown-subject' } };
        return registerDisease(state, { id: input.id ?? `disease:${input.operationId}`, operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, participantId: input.participantId, label: input.label, durationDays: input.durationDays, sequelaId: (state.sequelae || []).some(row => row.id === input.sequelaId && row.kind === 'disease' && row.participantId === input.participantId) ? input.sequelaId : null });
      });
    },
    careForAftermathDisease(input = {}) {
      return runAftermathCommand('care-aftermath-disease', (state, draft) => {
        const found = aftermathHealerOf(draft, 'heal', input);
        const outcome = careForDisease(state, { operationId: input.operationId, expectedRevision: input.expectedRevision ?? state.revision, diseaseId: input.diseaseId, healer: found.ok ? found.healer : null, roll: input.roll, difficultyDR: input.difficultyDR ?? 0, rested: input.rested === true });
        if (outcome.receipt.reason === 'healer-skill-required' && found.reason) outcome.receipt.reason = found.reason;
        return outcome;
      });
    },
  };
}
