/**
 * Brique F3 des miracles narratifs : compteurs et cases propres à un miracle (type `miracle-counter`). Registre : v5-divine-effect-handlers.js.
 * Deux formes, exclusives :
 * - `counter: { key, label, initial: entier | { fromSuccessLevels: true, add? } }` : réserve de DR portée par la couche (min 0). Le MJ reporte
 *   le bonus dans le Test (affiché, jamais injecté). Options : `push: { threshold, step }` (Forcer la main du hasard : un d1d10 saisi à
 *   `threshold` ou moins ajoute `step`, au-dessus la réserve est perdue et le Test initial subit −1 DR) ; `borrow: { characteristic,
 *   backfireSl }` (Revirement de fortune : le MJ saisit le Test opposé de la cible, d100 ou réussite et DR, contre les DR de la Prière ;
 *   la réserve vaut 1 seulement si la cible échoue, et dépenser ce point retire un point de Chance permanent à la cible).
 * - `flag: { key, label, grantTalents: [{ id, rank?, name?, specialization? }] }` : case cochée par le MJ sur le porteur ; cochée, les
 *   Talents listés s'ajoutent à la couche (`grantedTalents`, projetés par projectDivineGear). Vaincre les impies : la Haine accorde
 *   +2 DR au lieu de +1, soit une seconde ligne de Haine par groupe, sous l'identifiant du mot-clé (même ennemi, autre clé de Talent).
 * Le moteur ne tire aucun dé ; chaque commande est un seul ↶. Aucun Péché automatique (Q9).
 */
import { resolveTraitAnswer, testTargetOf } from './trait-effects.js';
import { getV5Fortune, setV5Fortune } from './v5-resources.js';
import { projectDivineGear } from './v5-divine-effects-gear.js';

const clone = value => structuredClone(value);
const record = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim() !== '';
const nat = value => Number.isSafeInteger(value) && value >= 0;
const need = (field, label) => ({ field, label });
const nameOf = participant => participant?.name || participant?.id || '—';

export function counterProblem(effect) {
  const forms = ['counter', 'flag'].filter(key => effect?.[key] !== undefined);
  if (forms.length !== 1) return 'miracle-counter exige exactement une forme : counter ou flag.';
  if (effect.flag !== undefined) {
    const flag = effect.flag;
    if (!(record(flag) && isText(flag.key) && isText(flag.label))) return 'miracle-counter : flag doit déclarer key et label.';
    if (!Array.isArray(flag.grantTalents) || !flag.grantTalents.length || !flag.grantTalents.every(row => record(row) && isText(row.id) && (row.rank === undefined || (Number.isSafeInteger(row.rank) && row.rank >= 1))))
      return 'miracle-counter : flag.grantTalents doit lister des Talents [{id, rank}].';
    return null;
  }
  const counter = effect.counter;
  if (!(record(counter) && isText(counter.key) && isText(counter.label))) return 'miracle-counter : counter doit déclarer key et label.';
  const initial = counter.initial;
  if (!(nat(initial) || (record(initial) && initial.fromSuccessLevels === true && (initial.add === undefined || nat(initial.add)))))
    return 'miracle-counter : counter.initial doit être un entier ≥ 0 ou { fromSuccessLevels: true }.';
  if (effect.push !== undefined && !(record(effect.push) && Number.isSafeInteger(effect.push.threshold) && effect.push.threshold >= 1 && Number.isSafeInteger(effect.push.step) && effect.push.step >= 1))
    return 'miracle-counter : push doit déclarer threshold et step (entiers positifs).';
  if (effect.borrow !== undefined && !(record(effect.borrow) && isText(effect.borrow.characteristic) && Number.isSafeInteger(effect.borrow.backfireSl) && effect.borrow.backfireSl >= 1))
    return 'miracle-counter : borrow doit déclarer characteristic et backfireSl.';
  return null;
}

// d100 saisi (`counterContests`), sinon résultat choisi (`counterContestResult` : 'success' | 'failure') et DR (`counterContestSl`).
const contestRaw = (input, id) => {
  const roll = input?.counterContests?.[id];
  if (roll !== undefined && roll !== null && roll !== '') return roll;
  const choice = input?.counterContestResult?.[id];
  if (choice !== 'success' && choice !== 'failure') return null;
  const sl = Number(input?.counterContestSl?.[id]);
  return { success: choice === 'success', sl: Number.isInteger(sl) && input?.counterContestSl?.[id] !== '' ? sl : 0 };
};
function contestAnswer(target, borrow, raw) {
  if (raw === null) return null;
  const score = Number(target?.caracs?.[borrow.characteristic]);
  const testTarget = Number.isFinite(score) ? testTargetOf(target, { characteristic: borrow.characteristic, base: score, dr: 0 }) : null;
  return resolveTraitAnswer({ kind: 'test', testTarget }, raw);
}

const handler = {
  // Porté par le prêtre (appliesTo 'caster') ; la cible du Revirement de fortune est exigée par `needs` (pas de cible implicite).
  validate: counterProblem,
  needs(effect, { targets = [], input } = {}) {
    if (counterProblem(effect)) return [need('contract.effects.counter', counterProblem(effect))];
    if (!effect.borrow) return [];
    const target = targets[0];
    if (!target) return [need('targetIds', 'Cible dont le prêtre emprunte la Chance')];
    if (contestAnswer(target, effect.borrow, contestRaw(input, target.id))) return [];
    const known = Number.isFinite(Number(target.caracs?.[effect.borrow.characteristic]));
    return [need(`counterContests.${target.id}`, `${nameOf(target)} : Test de ${effect.borrow.characteristic} contre les DR du prêtre, d100 de la cible ou réussite et DR${known ? '' : ' (score inconnu : saisir réussite et DR)'}`)];
  },
  // Valeur initiale et issue du Test opposé figées à l'aperçu ; l'application ne recalcule rien.
  resolve(effect, { targets = [], prayer, input } = {}) {
    if (effect.flag) return effect;
    const initial = effect.counter.initial;
    const value = nat(initial) ? initial : Math.floor(Math.max(0, prayer?.sl ?? 0)) + (initial.add ?? 0);
    const resolved = { ...effect, counter: { ...effect.counter, initial: value } };
    if (!effect.borrow) return resolved;
    const target = targets[0], answer = target ? contestAnswer(target, effect.borrow, contestRaw(input, target.id)) : null;
    if (!answer) return resolved; // la saisie manque : `needs` la réclame, rien n'est appliqué
    const margin = answer.sl - (prayer?.sl ?? 0);
    const keeps = answer.success && margin > 0;
    return { ...resolved, contest: { targetId: target.id, targetName: nameOf(target), success: answer.success, sl: answer.sl, prayerSl: prayer?.sl ?? 0,
      kept: keeps, backfire: answer.success && margin >= effect.borrow.backfireSl } };
  },
  inputFields(effect) {
    if (!effect.borrow) return [];
    const what = `${effect.label || effect.counter?.label} — Test de ${effect.borrow.characteristic} de la cible`;
    return [
      { path: 'counterContests', label: `${what} : d100 de la cible`, kind: 'number', scope: 'target', min: 1, max: 100, help: 'Réussite et DR calculés depuis le score de la cible, comparés aux DR de la Prière.' },
      { path: 'counterContestResult', label: `${what} : résultat (si le d100 n’est pas saisi)`, kind: 'select', scope: 'target', options: [['', 'À saisir'], ['success', 'Réussite'], ['failure', 'Échec']] },
      { path: 'counterContestSl', label: `${what} : DR (si le d100 n’est pas saisi)`, kind: 'number', scope: 'target', min: -20, max: 20 }
    ];
  },
  buildLayer(effect) {
    if (effect.flag) return { flag: { key: effect.flag.key, label: effect.flag.label, set: false, talents: clone(effect.flag.grantTalents) }, grantedTalents: [] };
    const contest = effect.contest;
    const lent = contest && !contest.kept;
    const value = contest ? (lent ? effect.counter.initial : 0) : effect.counter.initial;
    return { counter: { key: effect.counter.key, label: effect.counter.label, value, min: 0,
      ...(effect.push ? { push: clone(effect.push) } : {}),
      ...(contest ? { contest: clone(contest), ...(lent ? { lender: { id: contest.targetId, name: contest.targetName } } : {}) } : {}) } };
  },
  receipt: (effect, { targetId }, out) => effect.contest && targetId ? { targetId, type: effect.type, result: clone(effect.contest),
    log: `${effect.contest.targetName} · ${effect.label || effect.counter.label} : Test opposé ${effect.contest.success ? 'réussi' : 'raté'} (${effect.contest.sl} DR contre ${effect.contest.prayerSl}) · ${effect.contest.kept ? 'garde sa Chance' : 'point de Chance emprunté'}` } : null
};
export default { 'miracle-counter': handler };

const counterLayers = participant => (participant?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'miracle-counter');

/** Texte affiché pour une couche compteur ou case (panneau divin). */
export function counterLayerLabel(layer) {
  if (layer?.counter) {
    const counter = layer.counter;
    const text = `${counter.label} : ${counter.value}${counter.push ? ' DR en réserve' : ''}`;
    if (counter.bust) return `${text} · jet de ${counter.bust.roll} : réserve perdue, Test initial à −1 DR`;
    if (counter.contest) return `${text} · ${counter.lender ? `Chance de ${counter.lender.name} empruntée` : `${counter.contest.targetName} garde sa Chance`}${counter.contest.backfire ? ` · ${counter.contest.targetName} peut dépenser un point de Chance du prêtre` : ''}`;
    return text;
  }
  return layer?.flag ? `${layer.flag.label} : ${layer.flag.set ? 'oui' : 'non'}` : '';
}

function find(state, participantId, layerId, form) {
  const participants = state?.combat?.participants || [];
  const bearer = participants.find(row => row.id === participantId);
  const layer = bearer && counterLayers(bearer).find(row => row.id === layerId && row[form]);
  return layer ? { bearer, layer } : null;
}
const logged = (next, entry, state) => { next.log = [{ ...entry, id: `${entry.id}:${state.localRevision || 0}`, kind: 'effect' }, ...(next.log || [])].slice(0, 300); };
const liveLayer = (next, participantId, layerId) => next.combat.participants.find(row => row.id === participantId).extensions.v5.divineEffects.find(row => row.id === layerId);

/**
 * Dépense `amount` de la réserve d'un compteur. Rend `{ ok, state, remaining, reminders }` ou `{ ok: false, error }` sans écrire ; refus sous
 * le minimum. Un point de Chance emprunté retire un point permanent à son propriétaire (rappel si son solde est inconnu).
 */
export function spendDivineCounterOnState(state, participantId, layerId, amount = 1) {
  const found = find(state, participantId, layerId, 'counter');
  if (!found) return { ok: false, error: 'Compteur introuvable (prière terminée ?).' };
  const { bearer, layer } = found, counter = layer.counter;
  if (!(Number.isSafeInteger(amount) && amount >= 1)) return { ok: false, error: 'Quantité à dépenser : entier positif requis.' };
  if (counter.value - amount < counter.min) return { ok: false, error: `${counter.label} : ${counter.value} en réserve, impossible d’en dépenser ${amount}.` };
  let next = clone(state);
  const reminders = [];
  let lenderText = '';
  if (counter.lender) {
    const lender = next.combat.participants.find(row => row.id === counter.lender.id);
    try {
      const known = lender ? getV5Fortune(next, lender) : null;
      if (known && known.permanent !== null && known.permanent >= amount) {
        next = setV5Fortune(next, lender, known.permanent - amount);
        lenderText = ` · ${nameOf(lender)} perd ${amount} point(s) de Chance`;
      } else reminders.push(`${counter.lender.name} : retirer ${amount} point(s) de Chance à la main (solde inconnu ou insuffisant) ; il revient à la prochaine session.`);
    } catch { reminders.push(`${counter.lender.name} : retirer ${amount} point(s) de Chance à la main ; il revient à la prochaine session.`); }
  }
  const live = liveLayer(next, participantId, layerId);
  live.counter = { ...live.counter, value: counter.value - amount };
  logged(next, { id: `divine-counter:${layerId}`, actorId: bearer.id, actorName: bearer.name,
    text: `${counter.label} : ${amount} dépensé(s), reste ${live.counter.value}${lenderText}`, detail: { kind: 'divine-counter-spend', layerId, amount, remaining: live.counter.value, reminders } }, state);
  return { ok: true, state: next, remaining: live.counter.value, reminders };
}

/**
 * Jet de relance saisi (d10) d'un compteur à `push` : au seuil ou en dessous, la réserve gagne `step` ; au-dessus, elle tombe à 0 et le Test
 * initial subit −1 DR (le compteur n'accepte plus de jet). Rend `{ ok, state, value, bust }` ou `{ ok: false, error }`.
 */
export function pushDivineCounterOnState(state, participantId, layerId, roll) {
  const found = find(state, participantId, layerId, 'counter');
  if (!found?.layer.counter.push) return { ok: false, error: 'Compteur à relances introuvable (prière terminée ?).' };
  const { bearer, layer } = found, counter = layer.counter;
  if (!(Number.isSafeInteger(roll) && roll >= 1 && roll <= 10)) return { ok: false, error: 'Jet de 1d10 requis (entier de 1 à 10).' };
  if (counter.bust) return { ok: false, error: `${counter.label} : réserve déjà perdue.` };
  const next = clone(state), live = liveLayer(next, participantId, layerId);
  const bust = roll > counter.push.threshold;
  live.counter = bust ? { ...live.counter, value: 0, bust: { roll, penalty: -1 } } : { ...live.counter, value: counter.value + counter.push.step };
  logged(next, { id: `divine-counter:${layerId}`, actorId: bearer.id, actorName: bearer.name,
    text: bust ? `${counter.label} : 1d10 = ${roll}, réserve perdue, le Test initial se fait à −1 DR` : `${counter.label} : 1d10 = ${roll}, +${counter.push.step} DR (réserve ${live.counter.value})`,
    detail: { kind: 'divine-counter-push', layerId, roll, bust, value: live.counter.value } }, state);
  return { ok: true, state: next, value: live.counter.value, bust };
}

/**
 * Coche ou décoche une case (`flag`) sur son porteur. Tout le porteur est mis à jour : les couches de même `key` (le prêtre à la fois désigné
 * et porteur de sa propre couche) suivent. Cochée, les Talents de la case rejoignent la couche et sont projetés (projectDivineGear).
 */
export function setDivineFlagOnState(state, participantId, layerId, value) {
  const found = find(state, participantId, layerId, 'flag');
  if (!found) return { ok: false, error: 'Case introuvable (prière terminée ?).' };
  if (typeof value !== 'boolean') return { ok: false, error: 'Valeur oui ou non requise.' };
  const { bearer, layer } = found;
  const next = clone(state);
  const index = next.combat.participants.findIndex(row => row.id === participantId);
  const participant = next.combat.participants[index];
  for (const row of participant.extensions.v5.divineEffects) {
    if (row.type !== 'miracle-counter' || row.flag?.key !== layer.flag.key) continue;
    row.flag = { ...row.flag, set: value };
    row.grantedTalents = value ? clone(row.flag.talents) : [];
  }
  projectDivineGear(participant);
  logged(next, { id: `divine-flag:${layerId}`, actorId: bearer.id, actorName: bearer.name,
    text: `${nameOf(bearer)} · ${layer.flag.label} : ${value ? 'oui' : 'non'}`, detail: { kind: 'divine-flag', layerId, value } }, state);
  return { ok: true, state: next, value };
}
