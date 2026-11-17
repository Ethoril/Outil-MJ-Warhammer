// Boutons de Traits de créature du Store (chantier traits-calculs, lot L5) : Rencontre (Effrayé, Animosité), Entrer en Frénésie,
// soin Vampirique, Se cabrer, cadavre frais d'Affamé, drapeaux de Bestial. Chaque commande passe par l'historique (un seul ↶, ↷ rejoue)
// et le journal. Une demande de dé sans réponse rend `{ ok: false, status: 'requires-input', requests }` sans rien écrire ; la réponse
// revient dans `options.inputs[participantId][field]` (valeur tirée par le bouton ou résultat saisi, D13).
import { uid } from '../models.js';
import { planPsychology, psychologyTraits } from '../creature-psychology.js';
import { traitTargets, traitTargetMatches } from '../creature-keywords.js';
import { planVampiricHeal } from '../creature-states.js';
import { planNaturalAttack } from '../creature-combat.js';
import { creatureSizeOf } from '../creature-size.js';
import { loseMomentumUnderFear } from '../v5-combat-rules.js';
import { v5StoreActionClock } from '../v5-store-action.js';
import { canonicalV5ActionLedger } from '../v5-action-costs.js';
import { traitFrenzyState } from '../v5-talent-actions.js';
import { sourceActive } from '../v5-talent-source.js';
import { creatureLocationOf, incidentalArmour } from '../resolution/criticals.js';
import { d100 } from '../dice.js';
import { traitRequest, resolveTraitAnswer, testTargetOf, psychologyTestRequest, applyTraitPatches } from '../trait-effects.js';

const FLAGS = Object.freeze({ protectsYoung: '« protège ses petits »', cornered: '« acculé »' });
const refuse = (reason, message) => ({ ok: false, reason, message });
const needsInput = requests => ({ ok: false, status: 'requires-input', requests });
const effectLog = (actorId, targetId, text, detail) => ({ id: uid(), kind: 'effect', actorId, targetId, text, detail });
const withLog = (draft, entry) => ({ ...draft, log: [entry, ...(draft.log || [])].slice(0, 300) });
const mapParticipant = (draft, id, change) => ({ ...draft, combat: { ...draft.combat, participants: (draft.combat?.participants || []).map(row => (row.id === id ? change(row) : row)) } });
const nameOf = row => row?.name || row?.id;
const bonusOf = value => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Math.floor(Number(value) / 10) : 0);
const answerOf = (request, inputs) => resolveTraitAnswer(request, inputs?.[request.participantId]?.[request.field]);
// Comme les autres commandes du Store : le résultat de `executeCommand` peut être une promesse.
const finish = (result, extra = {}) => {
  const done = value => ({ ...value, ok: value?.ok !== false, ...extra });
  return typeof result?.then === 'function' ? result.then(done) : done(result);
};

export function createTraitButtonsApi({ api, currentEnvelope }) {
  const find = id => (currentEnvelope().combat?.participants || []).find(row => row.id === id);
  const turnPosition = envelope => ({ round: envelope.combat?.round ?? null, turnIndex: envelope.extensions?.v5?.turnIndex ?? null });
  // Déplacement du Tour (`system:turn-move`) : suivi seulement pour l'acteur courant d'un Tour identifié.
  const moveKeyOf = (envelope, actorId) => {
    const clock = v5StoreActionClock(envelope);
    return clock.encounterId && clock.turnId && envelope.combat?.currentActorId === actorId ? JSON.stringify([clock.encounterId, clock.turnId]) : null;
  };
  const ledgerOf = envelope => structuredClone(canonicalV5ActionLedger(envelope.extensions?.v5?.actionLedger || { appliedActions: [], quotaUsage: [] }));
  const moveRow = (ledger, actorId, key) => ledger.quotaUsage.find(row => row.actorId === actorId && row.quotaId === 'system:turn-move' && row.scope === 'turn' && row.scopeKey === key);

  return {
    /**
     * Bouton « Rencontre » (D9). `key` : `afraid` (Peur (2) venant de la cible, posée sur le porteur) ou `animosity` (Test de Calme demandé ;
     * le +1 DR de Sociabilité reste un rappel). Une cible sans le mot-clé nommé par le Trait est refusée.
     */
    applyCreatureEncounter(carrierId, key, { targetId = null, inputs = null } = {}) {
      const label = key === 'afraid' ? 'Effrayé' : 'Animosité';
      const source = find(carrierId);
      if (!['afraid', 'animosity'].includes(key)) return refuse('bad-key', 'Rencontre : Effrayé ou Animosité seulement.');
      if (!source || !psychologyTraits(source).some(trait => trait.key === key)) return refuse('no-trait', `Ce participant n’a pas le Trait ${label}.`);
      const target = find(targetId);
      if (!target || target.id === carrierId) return refuse('no-target', `${label} : désignez la créature rencontrée.`);
      const names = key === 'afraid' ? ['afraid', 'effraye'] : ['animosity', 'animosite'];
      if (traitTargets(source, names).length && !traitTargetMatches(source, names, target)) return refuse('wrong-target', `${label} : ${nameOf(target)} ne porte pas le mot-clé nommé par le Trait.`);
      if (key === 'afraid') {
        const encounterId = v5StoreActionClock(currentEnvelope()).encounterId || 'default-encounter';
        const plan = planPsychology(source, 'afraid', { source: target, encounterId });
        if (!plan.available) return refuse('refused', plan.unresolved.join(' '));
        if (!plan.states.length) return refuse('no-effect', `Effrayé : aucune Peur à poser devant ${nameOf(target)} (immunité ou rencontre déjà subie).`);
        return finish(api.executeCommand('creature-afraid', draft => withLog(mapParticipant(draft, carrierId, row => loseMomentumUnderFear({ ...row, states: [...(row.states || []), ...plan.states] })),
          effectLog(carrierId, targetId, `${nameOf(source)} · Effrayé : Peur (2) de ${nameOf(target)}, Test de Calme demandé`, { kind: 'creature-encounter', key }))));
      }
      const plan = planPsychology(source, 'animosity', { target });
      const base = plan.tests[0]?.base;
      if (!plan.available || !Number.isFinite(base)) return refuse('refused', plan.unresolved.join(' ') || 'Animosité : Force Mentale du porteur inconnue.');
      const request = traitRequest({ field: 'animosityCalm', kind: 'test', participantId: carrierId, participantName: source.name, label: `${nameOf(source)} · Calme devant ${nameOf(target)} : se retenir (Animosité)`,
        testTarget: testTargetOf(source, { characteristic: 'FM', base }) });
      const answer = answerOf(request, inputs);
      if (!answer) return needsInput([request]);
      const text = answer.success ? `${nameOf(source)} · Animosité devant ${nameOf(target)} : Calme réussi, il se retient`
        : `${nameOf(source)} · Animosité devant ${nameOf(target)} : Calme raté, il l’attaque (socialement ou physiquement) ; +1 DR de Sociabilité contre elle, à jouer`;
      return finish(api.executeCommand('creature-animosity', draft => withLog(draft, effectLog(carrierId, targetId, text, { kind: 'creature-encounter', key, success: answer.success }))));
    },

    /** Entrer en Frénésie (Trait) : Test de Volonté demandé ; réussi, l'état Frénésie du Talent est posé (+1 dégât déjà lu par la résolution). */
    enterTraitFrenzy(participantId, { inputs = null } = {}) {
      const person = find(participantId);
      if (!person || !psychologyTraits(person).some(trait => trait.key === 'frenzy')) return refuse('no-trait', 'Ce participant n’a pas le Trait Frénésie.');
      if ((person.states || []).some(row => row.key === 'frenzy' && sourceActive(row))) return refuse('already', 'Frénésie : ce participant est déjà en Frénésie.');
      const plan = planPsychology(person, 'frenzy');
      const base = plan.tests[0]?.base;
      if (!plan.available || !Number.isFinite(base)) return refuse('refused', plan.unresolved.join(' ') || 'Frénésie : Volonté du participant inconnue.');
      const request = traitRequest({ field: 'frenzyWill', kind: 'test', participantId, participantName: person.name, label: `${nameOf(person)} · Volonté : entrer en Frénésie`,
        testTarget: testTargetOf(person, { characteristic: 'FM', base }) });
      const answer = answerOf(request, inputs);
      if (!answer) return needsInput([request]);
      const state = answer.success ? traitFrenzyState(person, { resolutionId: uid() }) : null;
      if (answer.success && !state) return refuse('source', 'Frénésie : source du Talent à revalider, l’état n’a pas pu être posé.');
      return finish(api.executeCommand('creature-frenzy', draft => withLog(
        answer.success ? mapParticipant(draft, participantId, row => ({ ...row, states: [...(row.states || []).filter(item => item.key !== 'frenzy'), state] })) : draft,
        effectLog(participantId, participantId, answer.success ? `${nameOf(person)} · Frénésie : Volonté réussie, il entre en Frénésie` : `${nameOf(person)} · Frénésie : Volonté ratée, il n’entre pas en Frénésie`,
          { kind: 'creature-frenzy', success: answer.success }))));
    },

    /** Vampirique : soigne de la valeur saisie, sur Morsure et proie admissible cochées par le MJ, sans dépasser les Blessures maximales. */
    applyVampiricHeal(participantId, { wounds, viaBite = false, preyAdmissible = false } = {}) {
      const person = find(participantId);
      const plan = planVampiricHeal(person, { wounds, viaBite, preyAdmissible });
      if (!plan.available) return refuse('refused', plan.unresolved.join(' '));
      if (!(Number(person.maxHp) > 0)) return refuse('no-max', 'Vampirique : Blessures maximales du participant inconnues.');
      const hp = Math.max(0, Number(person.hp) || 0);
      const gained = Math.max(0, Math.min(plan.heal.amount, Number(person.maxHp) - hp));
      return finish(api.executeCommand('creature-vampiric-heal', draft => withLog(mapParticipant(draft, participantId, row => ({ ...row, hp: hp + gained })),
        effectLog(participantId, null, `${nameOf(person)} · Vampirique (${plan.heal.cause}) : ${gained} Blessure(s) regagnée(s)`, { kind: 'creature-vampiric-heal', gained, requested: plan.heal.amount }))), { healed: gained });
    },

    /**
     * Se cabrer (Imperial Zoo p.136) : à la place du déplacement, un Piétinement contre une cible plus petite. Dégâts du Piétinement moins
     * Endurance et armure de la localisation (tirée par l'outil, `rollLocation` injectable), aucun Élan, déplacement du Tour dépensé.
     */
    rearUp(participantId, targetId, { rollLocation = () => d100(), damage = null } = {}) {
      const actor = find(participantId), target = find(targetId);
      if (!actor) return refuse('no-actor', 'Se cabrer : participant introuvable.');
      if (!target || target.id === participantId) return refuse('no-target', 'Se cabrer : désignez la cible piétinée.');
      const plan = planNaturalAttack(actor, 'stomp', { via: 'rear', ordinary: true, actorSize: creatureSizeOf(actor).rank, targetSize: creatureSizeOf(target).rank });
      if (!plan.available) return refuse('refused', plan.unresolved.join(' '));
      const printed = Number(damage ?? plan.damageFormula);
      if (!Number.isFinite(printed)) return refuse('no-damage', 'Se cabrer : dégâts du Piétinement à saisir (valeur imprimée).');
      const envelope = currentEnvelope(), key = moveKeyOf(envelope, participantId);
      if (key && moveRow(ledgerOf(envelope), participantId, key)?.used) return refuse('move-spent', 'Se cabrer : le déplacement de ce Tour est déjà dépensé.');
      const location = creatureLocationOf(rollLocation(target), target), armour = Number(incidentalArmour(target, location)) || 0;
      const amount = Math.max(1, printed - bonusOf(target.caracs?.E) - armour);
      return finish(api.executeCommand('creature-rear-up', draft => {
        let next = { ...draft, combat: { ...draft.combat, participants: applyTraitPatches(draft.combat?.participants || [], [{ type: 'wounds', participantId: targetId, amount, cause: 'rear-up' }]) } };
        if (key) {
          const ledger = ledgerOf(draft), row = moveRow(ledger, participantId, key);
          if (row) row.used = 1; else ledger.quotaUsage.push({ actorId: participantId, quotaId: 'system:turn-move', scope: 'turn', scopeKey: key, used: 1 });
          next = { ...next, extensions: { ...(next.extensions || {}), v5: { ...(next.extensions?.v5 || {}), actionLedger: ledger } } };
        }
        return withLog(next, effectLog(participantId, targetId, `${nameOf(actor)} · Se cabrer : ${nameOf(target)} (${location.name}) perd ${amount} Blessure(s), à la place du déplacement`,
          { kind: 'creature-rear-up', amount, damage: printed, location: location.name, armour }));
      }), { amount });
    },

    /** Affamé devant un cadavre frais : Test de Calme (+2 DR) demandé ; raté, marqueur « tour perdu » (le MJ peut passer outre). */
    markFreshCorpse(participantId, { inputs = null } = {}) {
      const person = find(participantId);
      if (!person || !psychologyTraits(person).some(trait => trait.key === 'hungry')) return refuse('no-trait', 'Ce participant n’a pas le Trait Affamé.');
      const out = { unresolved: [] };
      const request = psychologyTestRequest(out, person, 'hungry', { trigger: true }, { field: 'hungryCalm', characteristic: 'FM', dr: 2, label: `${nameOf(person)} · Calme (+2 DR) devant un cadavre frais : résister à la faim` });
      if (!request) return refuse('refused', out.unresolved.join(' '));
      const answer = answerOf(request, inputs);
      if (!answer) return needsInput([request]);
      const since = turnPosition(currentEnvelope());
      return finish(api.executeCommand('creature-fresh-corpse', draft => withLog(
        answer.success ? draft : { ...draft, combat: { ...draft.combat, participants: applyTraitPatches(draft.combat?.participants || [], [{ type: 'lost-turn', participantId, cause: 'hungry', sourceId: null, since }]) } },
        effectLog(participantId, null, answer.success ? `${nameOf(person)} · Affamé : Calme réussi devant le cadavre frais` : `${nameOf(person)} · Affamé : Calme raté devant le cadavre frais, repas — il perd son prochain Mouvement et Action`,
          { kind: 'creature-fresh-corpse', success: answer.success }))));
    },

    /** Drapeaux de Bestial (`protectsYoung`, `cornered`) : la fuite sous la moitié des Blessures devient Frénésie. Écrits dans `extensions.v5.flags`. */
    setCreatureFlag(participantId, flag, value) {
      const person = find(participantId);
      if (!Object.hasOwn(FLAGS, flag)) return refuse('bad-flag', 'Drapeau inconnu : « protège ses petits » ou « acculé ».');
      if (!person || !psychologyTraits(person).some(trait => trait.key === 'bestial')) return refuse('no-trait', 'Ce participant n’a pas le Trait Bestial.');
      const on = value === true;
      return finish(api.executeCommand('creature-flag', draft => withLog(mapParticipant(draft, participantId, row => ({ ...row, extensions: { ...(row.extensions || {}),
        v5: { ...(row.extensions?.v5 || {}), flags: { ...(row.extensions?.v5?.flags || {}), [flag]: on } } } })),
      effectLog(participantId, null, `${nameOf(person)} · Bestial : ${FLAGS[flag]} ${on ? 'coché' : 'décoché'}`, { kind: 'creature-flag', flag, value: on }))));
    }
  };
}
