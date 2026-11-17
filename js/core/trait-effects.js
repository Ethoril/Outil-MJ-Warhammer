// Effets d'office des Traits de créature (second chantier des Traits) : trois collecteurs et leurs patches.
// Module pur : entrées jamais mutées, aucun dé tiré, sauf la localisation du Sang corrosif (D19, injectable). Une demande de dé (`traitRequest`) est posée au bon moment ; la réponse
// (valeur tirée par le bouton, ou résultat saisi) est lue dans `inputs[participantId][field]` ; l'effet est rendu en patches
// que `applyTraitPatches` applique d'un seul passage (donc un seul ↶). Un Trait coché se lit comme un Trait imprimé :
// chaque calcul lit `participant.traits` (et `extensions.traits`) par les modules de Traits existants.
import { psychologyTraits, planPsychology } from './creature-psychology.js';
import { stateTraits, planStateOnWound, planUnstableEndOfRound } from './creature-states.js';
import { isLiving } from './creature-natures.js';
import { canBeEngaged } from './engagements.js';
import { previewV5Test } from './v5-roll.js';
import { resolveV5TestModifiers } from './v5-test-modifiers.js';
import { d100 } from './dice.js';
import { creatureLocationOf, incidentalArmour } from './resolution/criticals.js';
import { participantCamp } from './participant-camp.js';
import { withMomentum } from './v5-momentum-state.js';

const DIE_HARD_TARGET = 6;
const clone = value => structuredClone(value);
const isNum = value => typeof value === 'number' && Number.isFinite(value);
const bonusOf = value => (isNum(Number(value)) && value !== null && value !== '' && value !== undefined ? Math.floor(Number(value) / 10) : null);
const v5Of = participant => participant?.extensions?.v5 || {};
const isDead = participant => v5Of(participant).dead === true;
const inPlay = participant => Boolean(participant) && (!participant.zone || participant.zone === 'active');
const nameOf = participant => participant?.name || participant?.id || '—';
const hasState = (participant, key) => stateTraits(participant).some(trait => trait.key === key);
const hasPsy = (participant, key) => psychologyTraits(participant).some(trait => trait.key === key);
/** Côté d'un participant pour le guidage d'un Stupide : PJ et alliés ensemble, puis le camp canonique. */
const sideOf = participant => { const camp = participantCamp(participant); return camp === 'allie' ? 'pj' : camp; };

/** Élan du moteur (booléen `extensions.v5.hasMomentum`) lu comme le nombre que `planUnstableEndOfRound` attend. */
export const momentumCount = participant => (v5Of(participant).hasMomentum === true ? 1 : 0);

const foldName = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*$/, '').trim();

/** Inflammable (Flammable, L07) : Trait imprimé ou coché, lu dans `traits` et `extensions.traits` (D11). */
export function isFlammable(participant) {
  return [...(Array.isArray(participant?.traits) ? participant.traits : []), ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])]
    .some(trait => ['flammable', 'inflammable'].includes(foldName(typeof trait === 'string' ? trait : trait?.name ?? trait?.nom)));
}

/** Marqueur de drapeau de fiche (« protège ses petits », « acculé ») : `extensions.v5.flags`, à défaut `flags`. */
const flagOf = (participant, flag) => v5Of(participant).flags?.[flag] === true || participant?.flags?.[flag] === true;

/** Bouclier (Shield n, L22) : `{ rating, rear }` ; `rear` pour « Shield 2* » (porté dans le dos, rappel seul). `null` sans le Trait. */
export function shieldTraitOf(participant) {
  for (const trait of [...(Array.isArray(participant?.traits) ? participant.traits : []), ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])]) {
    const text = typeof trait === 'string' ? trait : `${trait?.name ?? trait?.nom ?? ''} ${trait?.param ?? trait?.rating ?? ''}`;
    const match = /^\s*(?:shield|bouclier)\s*\(?\s*(\d+)\s*(\*)?\s*\)?\s*$/i.exec(String(text));
    if (match) return { rating: Number(match[1]), rear: Boolean(match[2]) };
  }
  return null;
}

// ─────────────────────────────── Demandes et réponses (CA0) ───────────────────────────────

/** Valeur d'un Test avec ses modificateurs : de quoi déduire réussite et DR d'un d100, sans connaître aucune règle. */
const SKILLS = Object.freeze({
  resistance: { id: 'skill-52_e9_73_69_73_74_61_6e_63_65-base', names: ['resistance', 'endurance'] },
  calm: { id: 'skill-43_61_6c_6d_65-base', names: ['calme', 'calm'] }
});
/** Total de la compétence de la fiche (`resistance`, `calm`) quand elle existe, sinon `fallback` (la Caractéristique), comme `resolution.js`. */
export function skillTotalOf(participant, skill, fallback) {
  const wanted = SKILLS[skill];
  const row = wanted && (participant?.skills || []).find(item => item?.id === wanted.id || wanted.names.includes(foldName(item?.name)));
  return Number.isSafeInteger(Number(row?.total)) && row?.total !== null && row?.total !== '' ? Number(row.total) : fallback;
}

export function testTargetOf(participant, { characteristic, base, dr = 0, bare = false, skill = null }) {
  if (skill) base = skillTotalOf(participant, skill, base);
  // `bare` : Test +0 sans aucun modificateur du porteur (Increvable, MJ 17/11 : les États du mort ne comptent pas).
  let resolved = null;
  if (!bare) { try { resolved = resolveV5TestModifiers(participant, { kind: 'test', characteristic }, {}); } catch { resolved = null; } }
  const usable = list => (list || []).filter(row => typeof row?.id === 'string' && row.id).map(row => ({ ...row }));
  const slModifiers = usable(resolved?.slModifiers).filter(row => Number.isInteger(row.amount));
  if (dr) slModifiers.push({ id: 'trait-dr', label: 'DR du Trait', amount: dr });
  return { score: Math.max(0, Math.floor(Number(base) || 0)), characteristic, dr, slModifiers,
    advantageSources: usable(resolved?.advantageSources), disadvantageSources: usable(resolved?.disadvantageSources) };
}

/**
 * Demande de dé uniforme. `kind` : `d10` (valeur à tirer), `test` (d100 ou résultat, `testTarget` permet de tirer), `choice` (oui/non).
 * Le libellé d'une demande de d10 nomme le dé.
 */
export function traitRequest({ key, field, kind, participantId, participantName, label, testTarget } = {}) {
  const text = String(label ?? '');
  return { field: field ?? key, kind, participantId, ...(participantName ? { participantName } : {}),
    label: kind === 'd10' && !/d10/i.test(text) ? `${text} (d10)` : text, ...(testTarget ? { testTarget } : {}) };
}

/**
 * Réponse à une demande, normalisée : `d10` → `{ value }` ; `test` → `{ success, sl }` (d'un d100 tiré, par `testTarget`, ou d'un
 * résultat saisi) ; `choice` → `{ value: boolean }`. `null` tant que la réponse manque ou est invalide. Deux saisies équivalentes
 * (valeur du dé, résultat saisi) donnent la même réponse, donc le même patch.
 */
export function resolveTraitAnswer(request, raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (request.kind === 'd10') {
    const value = typeof raw === 'object' ? raw.value : raw;
    return Number.isInteger(value) && value >= 1 && value <= 10 ? { value } : null;
  }
  if (request.kind === 'choice') {
    const value = typeof raw === 'object' ? raw.value : raw;
    return typeof value === 'boolean' ? { value } : null;
  }
  if (typeof raw === 'object') {
    return typeof raw.success === 'boolean' ? { success: raw.success, sl: Number.isInteger(raw.sl) ? raw.sl : 0 } : null;
  }
  const target = request.testTarget;
  if (!Number.isInteger(raw) || !target) return null;
  let preview;
  try { preview = previewV5Test({ score: target.score, roll: raw, slModifiers: target.slModifiers, advantageSources: target.advantageSources, disadvantageSources: target.disadvantageSources }); }
  catch { return null; }
  // Inversion facultative : la meilleure option pour le testeur (réussite, puis DR), l'obligatoire est déjà seule.
  const best = [...preview.options].sort((a, b) => (Number(b.result.success) - Number(a.result.success)) || (b.result.sl - a.result.sl))[0].result;
  return { success: best.success, sl: best.sl };
}

const answerOf = (inputs, request) => resolveTraitAnswer(request, inputs?.[request.participantId]?.[request.field]);

// ─────────────────────────────── Marqueurs et patches ───────────────────────────────

const touchV5 = (participant, patch) => ({ ...participant, extensions: { ...(participant.extensions || {}), v5: { ...v5Of(participant), ...patch } } });

/** Marqueur « tour perdu » (D8), posé pour le prochain Tour du porteur ; `since` : `{ round, turnIndex }` de la pose. */
export function markLostTurn(participant, { cause, sourceId = null, since = {} } = {}) {
  return touchV5(clone(participant), { lostTurn: { cause, sourceId, since: { round: since.round ?? null, turnIndex: since.turnIndex ?? null } } });
}

/** Lève le marqueur à la fin d'un Tour postérieur à celui de la pose (jamais celui où il a été posé). */
export function liftLostTurn(participant, { turnIndex, round } = {}) {
  const marker = v5Of(participant).lostTurn;
  if (!marker) return clone(participant);
  const later = isNum(marker.since?.turnIndex) ? isNum(turnIndex) && turnIndex > marker.since.turnIndex : isNum(round) && round > (marker.since?.round ?? Infinity);
  if (!later) return clone(participant);
  const next = clone(participant);
  delete next.extensions.v5.lostTurn;
  return next;
}

/** Mort d'un porteur d'Increvable à corps intact : Test étendu pendant BE Rounds (D15). Sans la case, sans Trait ou sans Endurance : inchangé. */
export function startDieHard(participant, { round = null, bodyIntact = false } = {}) {
  const rounds = bonusOf(participant?.caracs?.E);
  if (bodyIntact !== true || !hasState(participant, 'diehard') || rounds === null || rounds < 1) return clone(participant);
  return touchV5(clone(participant), { dieHard: { total: 0, roundsLeft: rounds, bodyIntact: true, startRound: round, lastRound: round, ended: null } });
}

const dieHardActive = participant => {
  const record = v5Of(participant).dieHard;
  return Boolean(record) && !record.ended && record.roundsLeft > 0 && isDead(participant);
};

/**
 * Clôture d'un suivi d'Increvable ouvert : `cancelled` si la créature n'est plus morte (relevée, PV corrigés), `expired` une fois
 * BE Rounds écoulés depuis la mort, même passés hors de la zone active (`lastRound + roundsLeft` reste le dernier Round permis).
 */
const dieHardClosure = (participant, round) => {
  const record = v5Of(participant).dieHard;
  if (!record || record.ended) return null;
  if (!isDead(participant)) return 'cancelled';
  return isNum(round) && isNum(record.lastRound) && round > record.lastRound + record.roundsLeft ? 'expired' : null;
};

/**
 * Un Round de Test étendu d'Increvable : les DR de réussite s'additionnent ; au total de 6 DR, retour à 1 Blessure et fin de la mort ;
 * sinon le compte à rebours de BE Rounds s'épuise. `test` : `{ success, sl }`.
 */
export function advanceDieHard(participant, { round = null, test } = {}) {
  if (!dieHardActive(participant)) return { participant: clone(participant), total: v5Of(participant).dieHard?.total ?? 0, revived: false };
  const record = v5Of(participant).dieHard;
  const total = record.total + (test?.success === true ? Math.max(0, Number(test.sl) || 0) : 0);
  const roundsLeft = record.roundsLeft - 1;
  const revived = total >= DIE_HARD_TARGET;
  const ended = revived ? 'revived' : roundsLeft <= 0 ? 'expired' : null;
  let next = touchV5(clone(participant), { dieHard: { ...record, total, roundsLeft, lastRound: round, ended } });
  if (revived) {
    next.hp = 1;
    delete next.extensions.v5.dead;
    delete next.extensions.v5.deathCause;
    delete next.extensions.v5.pendingStateDeath;
    // Une mort critique confirmée ne doit plus bloquer un nouveau décompte : le décompte repart de zéro.
    const countdown = next.extensions.v5.criticalDeath;
    if (countdown) next.extensions.v5.criticalDeath = { ...countdown, status: 'cancelled', cancelledAtRound: round, cancelReason: 'die-hard-revived' };
  }
  return { participant: next, total, revived };
}

/** Applique les patches d'un seul passage : entrées jamais modifiées, sortie neuve (un seul ↶ les annule). */
export function applyTraitPatches(participants, patches = []) {
  const next = (participants || []).map(participant => clone(participant));
  for (const patch of patches || []) {
    const index = next.findIndex(participant => participant.id === patch.participantId);
    if (index < 0) continue;
    const current = next[index];
    if (patch.type === 'wounds') {
      // Comme toute perte de Blessures du moteur (`advanceV5Effects`) : l'Élan tombe.
      const hp = Math.max(0, (Number(current.hp) || 0) - Math.max(0, Number(patch.amount) || 0));
      next[index] = hp < (Number(current.hp) || 0) ? withMomentum({ ...current, hp }, false) : { ...current, hp };
    } else if (patch.type === 'lost-turn') next[index] = markLostTurn(current, patch);
    else if (patch.type === 'lift-lost-turn') next[index] = liftLostTurn(current, patch);
    else if (patch.type === 'state-death') {
      // Une décision de mort déjà proposée (Hémorragique, critique de feu…) garde sa cause : la première cause l'emporte.
      if (!isDead(current) && !v5Of(current).pendingStateDeath) next[index] = touchV5(current, { pendingStateDeath: clone(patch.pending) });
    } else if (patch.type === 'die-hard-start') next[index] = startDieHard(current, patch);
    else if (patch.type === 'die-hard-advance') next[index] = advanceDieHard(current, patch).participant;
    else if (patch.type === 'die-hard-close' && v5Of(current).dieHard && !v5Of(current).dieHard.ended) {
      next[index] = touchV5(current, { dieHard: { ...v5Of(current).dieHard, ended: patch.ended } });
    }
  }
  return next;
}

// ─────────────────────────────── Collecteurs ───────────────────────────────

const newOut = () => ({ plans: [], requests: [], patches: [], logs: [], unresolved: [] });
const makeLog = (id, participant, text, detail) => ({ id, kind: 'effect', actorId: participant?.id ?? null, actorName: participant?.name ?? null, text, detail });

/** Un test de plan psychologique (Calme, Intelligence…) devient une demande de Test ; `unresolved` si la base manque. */
export function psychologyTestRequest(out, participant, key, planOptions, { field, label, characteristic, dr, skill = null }) {
  const plan = planPsychology(participant, key, planOptions);
  const test = plan.tests[0];
  if (!test || !isNum(test.base)) { out.unresolved.push(...(plan.unresolved.length ? plan.unresolved : [`${plan.label} : valeur du Test inconnue.`])); return null; }
  return traitRequest({ field, kind: 'test', participantId: participant.id, participantName: participant.name, label,
    testTarget: testTargetOf(participant, { characteristic, base: test.base, dr: test.dr ?? dr, skill }) });
}

/**
 * À la blessure : Sang corrosif, Infecté, Bestial, Affamé. `target` est le blessé, `actor` l'auteur du coup.
 * `engagedIds` : engagés avec le porteur de Sang corrosif (lus sur le plateau par l'appelant). `rollLocation(engagé)` : d100 de localisation
 * tiré par l'outil (D19), injectable pour les tests.
 */
export function collectWoundTraitEffects({ actor = null, target = null, participants = [], hpBefore, hpAfter, killed = false, resolutionId = null, round = null, turnIndex = null,
  engagedIds = [], traitInputs = {}, rollLocation = () => d100() } = {}) {
  const out = newOut();
  if (!target || !isNum(hpBefore) || !isNum(hpAfter) || hpAfter >= hpBefore) return out;
  const scope = resolutionId ?? `r${round}`;
  const since = { round, turnIndex };
  const dead = killed === true || hpAfter <= 0;

  // Sang corrosif : un seul d10 pour tous les engagés, réduit par BE et PA de chacun, minimum 1 (D14). Les PA sont ceux d'une
  // localisation que l'outil tire lui-même pour chaque engagé, une fois le d10 connu (D19, `rollLocation` injectable).
  if (hasState(target, 'corrosive')) {
    const engaged = [...new Set(engagedIds)].filter(id => id !== target.id).map(id => participants.find(row => row.id === id)).filter(row => row && canBeEngaged(row));
    if (engaged.length) {
      const request = traitRequest({ field: 'corrosiveBlood', kind: 'd10', participantId: target.id, participantName: target.name, label: `${nameOf(target)} · Sang corrosif : dégâts sur ${engaged.map(nameOf).join(', ')}` });
      const answer = answerOf(traitInputs, request);
      if (!answer) { out.requests.push(request); out.plans.push({ key: 'corrosive', participantId: target.id, status: 'requested' }); }
      else {
        const hits = engaged.map(row => {
          const locationRoll = rollLocation(row), location = creatureLocationOf(locationRoll, row), ap = Number(incidentalArmour(row, location)) || 0;
          return { id: row.id, name: nameOf(row), locationRoll, location: location.name, ap, amount: Math.max(1, answer.value - (bonusOf(row.caracs?.E) ?? 0) - ap) };
        });
        for (const hit of hits) out.patches.push({ type: 'wounds', participantId: hit.id, amount: hit.amount, cause: 'corrosive' });
        out.plans.push({ key: 'corrosive', participantId: target.id, status: 'applied', d10: answer.value, hits });
        out.logs.push(makeLog(`trait:${scope}:corrosive:${target.id}`, target, `${nameOf(target)} · Sang corrosif (d10 ${answer.value}) : ${hits.map(hit => `${hit.name} (${hit.location}) −${hit.amount}`).join(', ')} Blessure(s)`,
          { kind: 'trait-effect', key: 'corrosive', d10: answer.value, hits }));
      }
    }
  }

  // Infecté : Test d'Endurance +4 DR de la victime vivante ; échec : ligne « Plaie purulente », aucun état (D7).
  if (actor && hasState(actor, 'infected') && isLiving(target) && !dead) {
    const plan = planStateOnWound(actor, 'infected', { living: true });
    const E = Number(target.caracs?.E);
    if (!plan.available || !isNum(E)) out.unresolved.push(...(plan.unresolved.length ? plan.unresolved : ['Infecté : Endurance de la victime inconnue.']));
    else {
      const request = traitRequest({ field: 'infectedEndurance', kind: 'test', participantId: target.id, participantName: target.name,
        label: `${nameOf(target)} · Endurance (+4 DR) contre l'Infecté de ${nameOf(actor)}`, testTarget: testTargetOf(target, { characteristic: 'E', base: E, dr: 4, skill: 'resistance' }) });
      const answer = answerOf(traitInputs, request);
      if (!answer) { out.requests.push(request); out.plans.push({ key: 'infected', participantId: target.id, status: 'requested' }); }
      else {
        out.plans.push({ key: 'infected', participantId: target.id, status: answer.success ? 'resisted' : 'failed' });
        if (!answer.success) out.logs.push(makeLog(`trait:${scope}:infected:${target.id}`, target, `${nameOf(target)} · Plaie purulente (Infecté de ${nameOf(actor)}) : Endurance ratée`, { kind: 'trait-effect', key: 'infected', failed: true }));
      }
    }
  }

  // Bestial : sous la moitié des Blessures, une seule ligne par franchissement du seuil.
  const maxHp = Number(target.maxHp);
  if (hasPsy(target, 'bestial') && maxHp > 0 && hpBefore >= maxHp / 2 && hpAfter < maxHp / 2 && hpAfter > 0) {
    const plan = planPsychology({ ...target, hp: hpAfter }, 'bestial', { protecting: flagOf(target, 'protectsYoung') || flagOf(target, 'cornered') });
    const reaction = plan.effects.find(effect => effect.reaction)?.reaction;
    if (reaction) {
      const word = reaction === 'frenzy' ? 'Frénésie' : 'fuite';
      out.plans.push({ key: 'bestial', participantId: target.id, status: 'applied', reaction });
      out.logs.push(makeLog(`trait:${scope}:bestial:${target.id}`, target, `${nameOf(target)} · Bestial : sous la moitié de ses Blessures, ${word}`, { kind: 'trait-effect', key: 'bestial', reaction }));
    }
  }

  // Affamé : le porteur met un vivant à 0 Blessure → Test de Calme +2 DR ; échec : tour perdu.
  if (actor && hasPsy(actor, 'hungry') && isLiving(target) && dead && hpBefore > 0) {
    const request = psychologyTestRequest(out, actor, 'hungry', { trigger: true }, { field: 'hungryCalm', characteristic: 'FM', dr: 2, skill: 'calm',
      label: `${nameOf(actor)} · Calme (+2 DR) devant sa victime : résister à la faim` });
    if (request) {
      const answer = answerOf(traitInputs, request);
      if (!answer) { out.requests.push(request); out.plans.push({ key: 'hungry', participantId: actor.id, status: 'requested' }); }
      else {
        out.plans.push({ key: 'hungry', participantId: actor.id, status: answer.success ? 'resisted' : 'failed' });
        if (!answer.success) {
          out.patches.push({ type: 'lost-turn', participantId: actor.id, cause: 'hungry', sourceId: target.id, since });
          out.logs.push(makeLog(`trait:${scope}:hungry:${actor.id}`, actor, `${nameOf(actor)} · Affamé : Calme raté, repas — il perd son prochain Mouvement et Action`, { kind: 'trait-effect', key: 'hungry', failed: true }));
        }
      }
    }
  }
  return out;
}

/**
 * Début et fin de Round, fin de Tour. `phase` : `startOfRound` (Stupide, Increvable), `endOfRound` (Instable), `endOfTurn` (levée du tour perdu de `actorId`).
 * `turnIndex` : numéro du Tour qui s'achève (`endOfTurn`) ou du premier Tour du Round qui s'ouvre (`startOfRound`).
 * `engagedIdsOf(id)` : engagés du participant sur le plateau. `inputs[participantId][field]` : réponses aux demandes.
 * `momentumOf(participant)` : Élan retenu pour Instable (par défaut `momentumCount`) ; le Tour V5 le lit avant les pertes de fin de Round.
 */
export function collectRoundTraitEffects({ participants = [], phase, round = null, turnIndex = null, actorId = null, inputs = {}, engagedIdsOf = () => [], momentumOf = momentumCount } = {}) {
  const out = newOut();
  const scope = `r${round}:${phase}`;
  if (phase === 'endOfTurn') {
    const person = participants.find(row => row.id === actorId);
    const marker = v5Of(person).lostTurn;
    if (marker && liftLostTurn(person, { turnIndex, round }).extensions.v5.lostTurn === undefined) {
      out.patches.push({ type: 'lift-lost-turn', participantId: person.id, turnIndex, round });
      out.plans.push({ key: 'lost-turn', participantId: person.id, status: 'lifted' });
    }
    return out;
  }

  for (const person of participants) {
    const closure = phase === 'startOfRound' ? dieHardClosure(person, round) : null;
    if (closure) {
      out.patches.push({ type: 'die-hard-close', participantId: person.id, ended: closure });
      out.plans.push({ key: 'diehard', participantId: person.id, status: closure, total: v5Of(person).dieHard.total });
    }
    if (!inPlay(person)) continue;

    if (phase === 'endOfRound' && hasState(person, 'unstable') && !isDead(person) && Number(person.hp) > 0) {
      const engaged = [...new Set(engagedIdsOf(person.id) || [])].map(id => participants.find(row => row.id === id)).filter(Boolean);
      const plan = planUnstableEndOfRound(person, { engaged: engaged.length > 0, enemyMomentum: Math.max(0, ...engaged.map(momentumOf)), ownMomentum: momentumOf(person) });
      if (!plan.available) { out.unresolved.push(...plan.unresolved); continue; }
      if (!plan.damage) continue;
      out.patches.push({ type: 'wounds', participantId: person.id, amount: plan.damage.amount, cause: 'unstable' });
      out.plans.push({ key: 'unstable', participantId: person.id, status: 'applied', amount: plan.damage.amount });
      out.logs.push(makeLog(`trait:${scope}:unstable:${person.id}`, person, `${nameOf(person)} · Instable, fin de Round : ${plan.damage.amount} Blessures directes`, { kind: 'trait-effect', key: 'unstable', amount: plan.damage.amount }));
      if (Number(person.hp) - plan.damage.amount <= 0) {
        out.patches.push({ type: 'state-death', participantId: person.id, pending: { id: `state-death:${person.id}:${round}:${turnIndex}:endOfRound`, cause: 'unstable', source: 'trait', round, phase, reminders: ['Instable à zéro Blessure : disparition à confirmer par le MJ.'] } });
        out.logs.push(makeLog(`trait:${scope}:unstable-death:${person.id}`, person, `${nameOf(person)} · Instable à zéro Blessure : décès à confirmer par le MJ`, { kind: 'trait-effect', key: 'unstable', death: true }));
      }
    }

    if (phase === 'startOfRound') {
      // Stupide : guidé par un allié non Stupide, rien ; sinon Test d'Intelligence +4 DR, échec : tour perdu.
      if (hasPsy(person, 'stupid') && !hasState(person, 'swarm') && !hasPsy(person, 'immunePsychology') && !isDead(person) && Number(person.hp) > 0 && !v5Of(person).lostTurn) {
        const allies = participants.some(other => other.id !== person.id && inPlay(other) && !isDead(other) && Number(other.hp) > 0 && sideOf(other) === sideOf(person) && !hasPsy(other, 'stupid'));
        let guided = false, asking = false;
        if (allies) {
          const choice = traitRequest({ field: 'stupidGuided', kind: 'choice', participantId: person.id, participantName: person.name, label: `${nameOf(person)} · Stupide : un allié non Stupide le guide-t-il ?` });
          const answer = answerOf(inputs, choice);
          if (!answer) { out.requests.push(choice); out.plans.push({ key: 'stupid', participantId: person.id, status: 'requested' }); asking = true; }
          else guided = answer.value;
        }
        if (!asking && !guided) {
          const request = psychologyTestRequest(out, person, 'stupid', { guidedByAlly: false }, { field: 'stupidIntelligence', characteristic: 'Int', dr: 4,
            label: `${nameOf(person)} · Intelligence (+4 DR) : Stupide, début de Round` });
          if (request) {
            const answer = answerOf(inputs, request);
            if (!answer) { out.requests.push(request); out.plans.push({ key: 'stupid', participantId: person.id, status: 'requested' }); }
            else {
              out.plans.push({ key: 'stupid', participantId: person.id, status: answer.success ? 'resisted' : 'failed' });
              if (!answer.success) {
                out.patches.push({ type: 'lost-turn', participantId: person.id, cause: 'stupid', sourceId: null, since: { round, turnIndex: isNum(turnIndex) ? turnIndex - 1 : null } });
                out.logs.push(makeLog(`trait:${scope}:stupid:${person.id}`, person, `${nameOf(person)} · Stupide : Intelligence ratée, il perd son Mouvement et son Action`, { kind: 'trait-effect', key: 'stupid', failed: true }));
              }
            }
          }
        }
      }

      // Increvable : Test de Résistance (+0) à chaque début de Round, les DR s'additionnent (D15).
      const record = v5Of(person).dieHard;
      if (!closure && dieHardActive(person) && (!isNum(record.lastRound) || round > record.lastRound)) {
        const E = Number(person.caracs?.E);
        if (!isNum(E)) { out.unresolved.push('Increvable : Endurance du participant inconnue.'); continue; }
        const request = traitRequest({ field: 'dieHardEndurance', kind: 'test', participantId: person.id, participantName: person.name,
          label: `${nameOf(person)} · Increvable : Endurance (+0), total ${record.total}/${DIE_HARD_TARGET} DR, ${record.roundsLeft} Round(s) restant(s)`,
          testTarget: testTargetOf(person, { characteristic: 'E', base: E, dr: 0, bare: true, skill: 'resistance' }) });
        const answer = answerOf(inputs, request);
        if (!answer) { out.requests.push(request); out.plans.push({ key: 'diehard', participantId: person.id, status: 'requested', total: record.total }); continue; }
        const advanced = advanceDieHard(person, { round, test: answer });
        out.patches.push({ type: 'die-hard-advance', participantId: person.id, round, test: answer });
        out.plans.push({ key: 'diehard', participantId: person.id, status: advanced.revived ? 'revived' : 'applied', total: advanced.total });
        out.logs.push(makeLog(`trait:${scope}:diehard:${person.id}`, person, advanced.revived
          ? `${nameOf(person)} · Increvable : ${advanced.total}/${DIE_HARD_TARGET} DR, revient à 1 Blessure`
          : `${nameOf(person)} · Increvable : ${advanced.total}/${DIE_HARD_TARGET} DR cumulés`, { kind: 'trait-effect', key: 'diehard', total: advanced.total, revived: advanced.revived }));
      }
    }
  }
  return out;
}
