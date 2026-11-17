/**
 * Brique F2 des miracles narratifs : « Test imposé à la cible » (type `imposed-test`). Registre : v5-divine-effect-handlers.js.
 * Le moteur ne tire aucun dé (Q4) : le MJ saisit le d100 de la cible (réussite et DR calculés depuis son score) ou la réussite et
 * les DR. Forme : `{ type: 'imposed-test', label, test: { skill, slModifier }, subjects: 'targets'|'enemies'|'allies',
 * when: 'cast'|'round'|'turn'|'move'|'manual', onFailure: [issue], onSuccess?: [issue], waivedBy?: { fact, label }, optional?, once? }`.
 * - `cast` : saisie au lancement (`imposedTests.<cible>` = d100, ou `imposedTestResult.<cible>` 'success'|'failure' + `imposedTestSl.<cible>`).
 * - `round` / `turn` / `move` : demande du Tour V5 (collecteur `collectDivineRecurringEffects`, v5-divine-recurring.js).
 * - `manual` : commande `resolveDivineImposedTest` du Store (panneau divin) ; `once` : une fois par sujet et par prière.
 * Issues (vocabulaire fermé) : `condition` (État acquis ; `lockRounds` : verrouillé au moins N Rounds), `lost-turn` (marqueur « tour perdu » de trait-effects.js, avec libellé),
 * `terror` (Test de Terreur des services de Psychologie : Brisé puis Peur), `frenzy` (entrée en Frénésie), `marker` (libellé porté
 * par la couche, sans calcul). `waivedBy` : fait de cible qui dispense du Test (ex. cible consentante) ; l'échec s'applique alors.
 */
import { acquireV5Conditions } from './v5-effects.js';
import { markLostTurn, testTargetOf, skillTotalOf, resolveTraitAnswer, traitRequest } from './trait-effects.js';
import { traitFrenzyState } from './v5-talent-actions.js';
import { sourceActive } from './v5-talent-source.js';
import { previewGenericTerrorEncounter, resolveGenericTerrorTest } from './v5-talent-psychology.js';
import { participantCamp } from './participant-camp.js';

const clone = value => structuredClone(value);
const need = (field, label) => ({ field, label });
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim() !== '';
const positive = value => Number.isSafeInteger(value) && value >= 1;
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nameOf = participant => participant?.name || participant?.id || '—';

export const IMPOSED_WHEN = Object.freeze(['cast', 'round', 'turn', 'move', 'manual']);
export const IMPOSED_SUBJECTS = Object.freeze(['targets', 'enemies', 'allies']);
// Compétence testée -> Caractéristique, noms de la compétence sur la fiche, libellé. `willpower` : Test de Volonté nu (Frénésie, p.184).
export const IMPOSED_SKILLS = Object.freeze({
  calm: { characteristic: 'FM', trait: 'calm', label: 'Calme' },
  resistance: { characteristic: 'E', trait: 'resistance', label: 'Endurance' },
  athletics: { characteristic: 'Ag', names: ['athletisme', 'athletics'], label: 'Athlétisme' },
  willpower: { characteristic: 'FM', label: 'Volonté' }
});
const OUTCOMES = {
  // `lockRounds` (Épée de justice, L11) : l'État ne se récupère pas avant N Rounds, N = Bonus de la Caractéristique du porteur de la couche.
  condition: outcome => isText(outcome.key) && (outcome.level === undefined || positive(outcome.level))
    && (outcome.lockRounds === undefined || (record(outcome.lockRounds) && isText(outcome.lockRounds.characteristicBonus))),
  'lost-turn': outcome => isText(outcome.cause) && isText(outcome.label),
  terror: outcome => positive(outcome.rating),
  frenzy: () => true,
  marker: outcome => isText(outcome.label)
};
const FACT_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

function outcomeProblem(list, name) {
  if (list === undefined) return null;
  if (!Array.isArray(list)) return `imposed-test : ${name} doit être une liste d’issues.`;
  const bad = list.find(outcome => !record(outcome) || !OUTCOMES[outcome.type]?.(outcome));
  return bad ? `imposed-test : issue inconnue ou incomplète dans ${name} (attendu : ${Object.keys(OUTCOMES).join(', ')}).` : null;
}
export function imposedTestProblem(effect) {
  const spec = effect?.test;
  if (!record(spec) || !IMPOSED_SKILLS[spec.skill]) return `imposed-test : test.skill doit valoir ${Object.keys(IMPOSED_SKILLS).join(', ')}.`;
  if (!Number.isSafeInteger(spec.slModifier)) return 'imposed-test : test.slModifier doit être un entier (DR).';
  if (!IMPOSED_SUBJECTS.includes(effect.subjects)) return `imposed-test : subjects doit valoir ${IMPOSED_SUBJECTS.join(', ')}.`;
  if (!IMPOSED_WHEN.includes(effect.when)) return `imposed-test : when doit valoir ${IMPOSED_WHEN.join(', ')}.`;
  const problem = outcomeProblem(effect.onFailure, 'onFailure') ?? outcomeProblem(effect.onSuccess, 'onSuccess');
  if (problem) return problem;
  if (!(effect.onFailure || []).length && !(effect.onSuccess || []).length) return 'imposed-test : au moins une issue (onFailure ou onSuccess) est requise.';
  if (effect.waivedBy !== undefined && !(record(effect.waivedBy) && FACT_NAME.test(effect.waivedBy.fact ?? '') && isText(effect.waivedBy.label)))
    return 'imposed-test : waivedBy doit déclarer fact (identifiant) et label.';
  return null;
}

const signed = value => value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '+0';
/** « Test de Calme (−2 DR) » */
export const imposedTestLabel = spec => `Test de ${IMPOSED_SKILLS[spec?.skill]?.label || '?'} (${signed(spec?.slModifier ?? 0)}${spec?.slModifier ? ' DR' : ''})`;

/** Score et modificateurs du Test pour un participant : la compétence de la fiche si elle existe, sinon la Caractéristique. */
export function imposedTestTarget(participant, spec) {
  const skill = IMPOSED_SKILLS[spec.skill];
  const carac = Number(participant?.caracs?.[skill.characteristic]);
  let base = Number.isFinite(carac) ? carac : null;
  if (skill.trait) base = skillTotalOf(participant, skill.trait, base);
  else if (skill.names) {
    const row = (participant?.skills || []).find(item => skill.names.includes(fold(item?.name).replace(/\s*\(.*$/, '')));
    if (Number.isSafeInteger(Number(row?.total)) && row?.total !== null && row?.total !== '') base = Number(row.total);
  }
  if (base === null) return null;
  return testTargetOf(participant, { characteristic: skill.characteristic, base, dr: spec.slModifier });
}

/** Réponse normalisée `{ success, sl }` d'un d100 (calculé sur le score de la cible) ou d'un résultat saisi ; `null` si absente. */
export function imposedAnswer(participant, spec, raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (record(raw)) return typeof raw.success === 'boolean' ? { success: raw.success, sl: Number.isInteger(raw.sl) ? raw.sl : 0 } : null;
  const testTarget = imposedTestTarget(participant, spec);
  return testTarget ? resolveTraitAnswer({ kind: 'test', testTarget }, raw) : null;
}

// d100 saisi (`imposedTests`), sinon résultat choisi (`imposedTestResult` : 'success' | 'failure') et DR (`imposedTestSl`, 0 par défaut).
const castRaw = (input, id) => {
  const roll = input?.imposedTests?.[id];
  if (roll !== undefined && roll !== null && roll !== '') return roll;
  const choice = input?.imposedTestResult?.[id];
  if (choice !== 'success' && choice !== 'failure') return null;
  const sl = Number(input?.imposedTestSl?.[id]);
  return { success: choice === 'success', sl: Number.isInteger(sl) && input?.imposedTestSl?.[id] !== '' ? sl : 0 };
};
const waived = (effect, participant, input) => effect.waivedBy !== undefined && input?.facts?.targets?.[participant?.id]?.[effect.waivedBy.fact] === true;
const waiverKnown = (effect, participant, input) => effect.waivedBy === undefined || typeof input?.facts?.targets?.[participant?.id]?.[effect.waivedBy.fact] === 'boolean';

/** Issues dues pour un résultat (dispense : l'issue d'échec). */
export const outcomesFor = (effect, result) => clone((result?.waived || result?.success === false ? effect.onFailure : effect.onSuccess) || []);
const markerLabels = outcomes => outcomes.filter(row => row.type === 'marker').map(row => row.label);

// « Tour perdu » levé à la fin du prochain Tour de la cible : `since.round` placé un Round avant quand la cible joue encore ce Round.
function lostTurnSince(combat, participantId, round) {
  const order = Array.isArray(combat?.order) ? combat.order : [];
  const current = order.indexOf(combat?.currentActorId), target = order.indexOf(participantId);
  const later = current >= 0 && target > current;
  return { round: later ? round - 1 : round, turnIndex: null };
}

// Verrou d'un État acquis (`lockRounds`) : couche propre sur le sujet, échue en fin du Round (courant + N − 1) ; l'État reste ensuite,
// récupérable selon les règles ordinaires (« au moins N Rounds »). Rend le libellé appliqué, ou null si N ou le Round est inconnu.
function lockAddedStates(participant, beforeIds, outcome, index, ctx) {
  const score = Number(ctx.author?.caracs?.[outcome.lockRounds.characteristicBonus]);
  const rounds = Number.isFinite(score) ? Math.floor(score / 10) : null;
  if (!positive(rounds) || !positive(ctx.round)) return null;
  const added = (participant.states || []).filter(row => !beforeIds.has(row.id));
  if (!added.length) return null;
  const id = `${ctx.resolutionId}:${index}:lock`;
  for (const row of added) Object.assign(row, { divineEffectId: id, divineExecutionId: ctx.executionId ?? null, divineLock: true });
  participant.extensions ??= {}; participant.extensions.v5 ??= {};
  participant.extensions.v5.divineEffects = [...(participant.extensions.v5.divineEffects || []), { id, executionId: ctx.executionId ?? null, prayerId: ctx.prayerId ?? null,
    casterId: ctx.author?.id ?? null, targetId: participant.id, type: 'imposed-test', expiry: { phase: 'endOfRound', round: ctx.round + rounds - 1, moment: 'afterEffects' },
    lockedStateIds: added.map(row => row.id), reminder: { label: `${outcome.key} au moins ${rounds} Round(s), non récupérable avant` } }];
  return `${outcome.key} au moins ${rounds} Round(s)`;
}

/**
 * Applique les issues à un participant (copie rendue) ; `ctx` : { prayerId, executionId, resolutionId, round, combat, author, test }.
 * Rend { participant, applied: [libellés], reminders }.
 */
export function applyImposedOutcomes(participant, outcomes, ctx = {}) {
  let next = clone(participant);
  const applied = [], reminders = [];
  for (const [index, outcome] of outcomes.entries()) {
    if (outcome.type === 'marker') { applied.push(outcome.label); continue; }
    if (outcome.type === 'condition') {
      const acquired = acquireV5Conditions(next, [{ name: outcome.key, level: outcome.level ?? 1, source: { kind: 'divine', prayerId: ctx.prayerId ?? null, executionId: ctx.executionId ?? null } }], { round: ctx.round });
      if (!acquired.ready) { reminders.push(`${nameOf(participant)} : État ${outcome.key} à poser à la main (données manquantes).`); continue; }
      const beforeIds = new Set((next.states || []).map(row => row.id));
      next = acquired.participant;
      applied.push(`État ${outcome.key}`);
      if (outcome.lockRounds) {
        const lock = lockAddedStates(next, beforeIds, outcome, index, ctx);
        if (lock) applied.push(lock); else reminders.push(`${nameOf(participant)} : durée minimale de l’État ${outcome.key} à suivre à la main (Bonus ou Round inconnu).`);
      }
      continue;
    }
    if (outcome.type === 'lost-turn') {
      next = markLostTurn(next, { cause: outcome.cause, sourceId: ctx.executionId ?? null, since: lostTurnSince(ctx.combat, participant.id, ctx.round) });
      next.extensions.v5.lostTurn.label = outcome.label;
      applied.push(`prochain Tour : ${outcome.label}`);
      continue;
    }
    if (outcome.type === 'frenzy') {
      if ((next.states || []).some(row => row.key === 'frenzy' && sourceActive(row))) { applied.push('déjà en Frénésie'); continue; }
      const state = traitFrenzyState(next, { resolutionId: `${ctx.resolutionId}:${index}` });
      if (!state) { reminders.push(`${nameOf(participant)} : Frénésie à poser à la main (source du Talent à revalider).`); continue; }
      next = { ...next, states: [...(next.states || []).filter(row => row.key !== 'frenzy'), state] };
      applied.push('entre en Frénésie');
      continue;
    }
    if (outcome.type === 'terror') {
      const encounter = previewGenericTerrorEncounter({ author: ctx.author, target: next, rating: outcome.rating, sourceKind: 'divine', sourceLabel: `Terreur (${outcome.rating})`,
        encounterId: ctx.executionId || 'default-encounter', resolutionId: `${ctx.resolutionId}:${index}` });
      if (encounter.exempt) { applied.push(`Terreur sans effet (${encounter.reason})`); continue; }
      if (!encounter.ready || !encounter.addedStates.length) { reminders.push(...(encounter.unresolved || []), `${nameOf(participant)} : Terreur à résoudre à la main.`); continue; }
      const withTerror = { ...next, states: [...(next.states || []), ...clone(encounter.addedStates)] };
      const resolved = resolveGenericTerrorTest({ actor: withTerror, terrorEffectId: encounter.addedStates[0].id, test: ctx.test, encounterId: ctx.executionId || 'default-encounter', round: ctx.round ?? 1 });
      if (!resolved.ready) { reminders.push(`${nameOf(participant)} : ${resolved.error}`); continue; }
      next = resolved.participant;
      applied.push(resolved.passed ? `Terreur surmontée, Peur (${outcome.rating})` : `Brisé ×${resolved.brokenAdded}, Peur (${outcome.rating})`);
    }
  }
  return { participant: next, applied, reminders };
}

/** Champ de saisie (couche) d'une demande du Tour : `divineImposedTest:<couche>` ; `…:attempt` pour le choix de tenter. */
export const imposedField = layer => `divineImposedTest:${layer.id}`;

/** Demande d'un Test imposé pour un participant : `kind: 'test'` avec le score de la cible (bouton d100). */
export function imposedRequest(participant, layer) {
  const spec = layer.imposedTest.test;
  return traitRequest({ field: imposedField(layer), kind: 'test', participantId: participant.id, participantName: participant.name,
    label: `${nameOf(participant)} · ${layer.imposedTest.label} : ${imposedTestLabel(spec)}`, testTarget: imposedTestTarget(participant, spec) ?? undefined });
}

/** Le sujet d'un Test `manual` appartient-il au bon camp par rapport au porteur de la couche ? */
export function subjectAllowed(subjects, bearer, subject) {
  if (subjects === 'targets') return subject?.id === bearer?.id;
  const same = participantCamp(subject) === participantCamp(bearer);
  return subjects === 'allies' ? same : !same;
}

const handler = {
  // Test `manual` porté par le prêtre (appliesTo 'caster', ex. Seuil du Portail) : aucune cible désignée requise.
  implicitTarget: true,
  validate: imposedTestProblem,
  needs(effect, { targets = [], input } = {}) {
    if (imposedTestProblem(effect)) return [need('contract.effects.imposedTest', imposedTestProblem(effect))];
    if (effect.when !== 'cast' || effect.appliesTo === 'caster') return [];
    const needs = [];
    for (const target of targets) {
      if (!waiverKnown(effect, target, input)) { needs.push(need(`facts.targets.${target.id}.${effect.waivedBy.fact}`, `${nameOf(target)} : ${effect.waivedBy.label}`)); continue; }
      if (waived(effect, target, input)) continue;
      const raw = castRaw(input, target.id);
      if (imposedAnswer(target, effect.test, raw)) continue;
      const known = imposedTestTarget(target, effect.test);
      needs.push(need(`imposedTests.${target.id}`, `${nameOf(target)} : ${effect.label || 'Test imposé'} — ${imposedTestLabel(effect.test)}, d100 de la cible ou réussite et DR${known ? '' : ' (score inconnu : saisir réussite et DR)'}`));
    }
    return needs;
  },
  // Résultats figés une fois pour toutes dans l'effet résolu (aperçu) : l'application ne recalcule rien.
  resolve(effect, { targets = [], input } = {}) {
    if (effect.when !== 'cast') return effect;
    const results = {};
    for (const target of targets) {
      if (waived(effect, target, input)) { results[target.id] = { waived: true }; continue; }
      const answer = imposedAnswer(target, effect.test, castRaw(input, target.id));
      if (answer) results[target.id] = answer;
    }
    return { ...effect, results };
  },
  factFields(effect) {
    if (effect.waivedBy === undefined || imposedTestProblem(effect)) return [];
    const label = effect.waivedBy.label.trim();
    return [{ field: effect.waivedBy.fact, label: label[0].toUpperCase() + label.slice(1), help: label + '.', required: true }];
  },
  inputFields(effect) {
    if (effect.when !== 'cast') return [];
    const what = `${effect.label || 'Test imposé'} — ${imposedTestLabel(effect.test)}`;
    return [
      { path: 'imposedTests', label: `${what} : d100 de la cible`, kind: 'number', scope: 'target', min: 1, max: 100, help: 'Réussite et DR calculés depuis le score de la cible.' },
      { path: 'imposedTestResult', label: `${what} : résultat (si le d100 n’est pas saisi)`, kind: 'select', scope: 'target',
        options: [['', 'À saisir'], ['success', 'Réussite'], ['failure', 'Échec']] },
      { path: 'imposedTestSl', label: `${what} : DR (si le d100 n’est pas saisi)`, kind: 'number', scope: 'target', min: -20, max: 20 }
    ];
  },
  buildLayer(effect, { targetId } = {}) {
    const result = effect.results?.[targetId];
    return { imposedTest: { label: effect.label || 'Test imposé', test: clone(effect.test), when: effect.when, subjects: effect.subjects,
      onFailure: clone(effect.onFailure || []), onSuccess: clone(effect.onSuccess || []),
      ...(effect.optional ? { optional: true } : {}), ...(effect.once ? { once: true, resolved: {} } : {}),
      ...(result ? { result: clone(result), outcome: markerLabels(outcomesFor(effect, result)) } : {}) } };
  },
  applyInstant(participant, effect, { contract, executionId, index, round, combat, actor, layer } = {}) {
    if (effect.when !== 'cast') return null;
    const result = effect.results?.[participant.id];
    if (!result) return null;
    const outcomes = outcomesFor(effect, result);
    const out = applyImposedOutcomes(participant, outcomes.filter(row => row.type !== 'marker'),
      { prayerId: contract?.id, executionId, resolutionId: `${executionId}:${participant.id}:${index}`, round, combat, author: actor, test: result });
    Object.assign(participant, out.participant);
    const live = layer && (participant.extensions?.v5?.divineEffects || []).find(row => row.id === layer.id);
    if (live) live.imposedTest = { ...live.imposedTest, result: clone(result), outcome: [...markerLabels(outcomes), ...out.applied] };
    return { result: clone(result), applied: [...markerLabels(outcomes), ...out.applied], reminders: out.reminders };
  },
  receipt: (effect, { targetId, targetName }, out) => out ? { targetId, type: effect.type, result: clone(out),
    log: `${targetName || targetId} · ${effect.label || 'Test imposé'} : ${out.result.waived ? 'dispensé' : out.result.success ? `réussi (${out.result.sl} DR)` : `raté (${out.result.sl} DR)`}${out.applied.length ? ' · ' + out.applied.join(', ') : ''}` } : null
};

/**
 * Commande pure du Test imposé `manual` : `participantId` (sujet), `layerId` (couche portée par n'importe quel participant), `input`
 * (`{ roll }` d100 ou `{ success, sl }`). Rend `{ ok, state, result, applied }` ou `{ ok: false, error, needsInput? }` sans écrire.
 */
export function resolveImposedTestOnState(state, participantId, layerId, input = {}) {
  const participants = state?.combat?.participants || [];
  const bearer = participants.find(row => (row.extensions?.v5?.divineEffects || []).some(layer => layer.id === layerId));
  const layer = bearer && bearer.extensions.v5.divineEffects.find(row => row.id === layerId);
  if (!layer?.imposedTest) return { ok: false, error: 'Test imposé introuvable (prière terminée ?).' };
  if (layer.imposedTest.when !== 'manual') return { ok: false, error: 'Ce Test imposé est demandé par le Tour, pas par un bouton.' };
  const subject = participants.find(row => row.id === participantId);
  if (!subject) return { ok: false, error: 'Participant introuvable.' };
  if (!subjectAllowed(layer.imposedTest.subjects, bearer, subject))
    return { ok: false, error: layer.imposedTest.subjects === 'enemies' ? `${nameOf(subject)} n’est pas un ennemi du porteur.` : `${nameOf(subject)} n’est pas concerné par ce Test.` };
  if (layer.imposedTest.once && layer.imposedTest.resolved?.[subject.id]) return { ok: false, error: `${nameOf(subject)} a déjà fait ce Test pendant la prière.` };
  const raw = Number.isInteger(input?.roll) ? input.roll : typeof input?.success === 'boolean' ? { success: input.success, sl: input.sl } : null;
  const result = imposedAnswer(subject, layer.imposedTest.test, raw);
  if (!result) return { ok: false, error: 'Résultat du Test requis.', needsInput: [need('roll', `${nameOf(subject)} : ${layer.imposedTest.label} — ${imposedTestLabel(layer.imposedTest.test)}, d100 ou réussite et DR`)] };
  const round = Number.isSafeInteger(state.combat?.round) ? state.combat.round : 1;
  const outcomes = outcomesFor(layer.imposedTest, result);
  const out = applyImposedOutcomes(subject, outcomes.filter(row => row.type !== 'marker'),
    { prayerId: layer.prayerId, executionId: layer.executionId, resolutionId: `${layer.id}:${subject.id}`, round, combat: state.combat, author: bearer, test: result });
  const applied = [...markerLabels(outcomes), ...out.applied];
  const next = clone(state);
  next.combat.participants = next.combat.participants.map(row => row.id === subject.id ? out.participant : row);
  const liveBearer = next.combat.participants.find(row => row.id === bearer.id);
  const liveLayer = liveBearer.extensions.v5.divineEffects.find(row => row.id === layerId);
  liveLayer.imposedTest = { ...liveLayer.imposedTest, resolved: { ...(liveLayer.imposedTest.resolved || {}), [subject.id]: { ...clone(result), outcome: applied } } };
  const text = `${nameOf(subject)} · ${layer.imposedTest.label} : ${imposedTestLabel(layer.imposedTest.test)} ${result.success ? 'réussi' : 'raté'} (${result.sl} DR)${applied.length ? ' · ' + applied.join(', ') : ''}`;
  next.log = [{ id: `divine-imposed:${layerId}:${subject.id}:${state.localRevision || 0}`, kind: 'effect', actorId: subject.id, actorName: subject.name, text,
    detail: { kind: 'divine-imposed-test', layerId, result: clone(result), applied, reminders: out.reminders } }, ...(next.log || [])].slice(0, 300);
  return { ok: true, state: next, result, applied, reminders: out.reminders };
}

export default { 'imposed-test': handler };
