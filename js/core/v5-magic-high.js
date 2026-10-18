import { uid } from './models.js';
import {commitV5Resources,getV5Fate,projectV5ResourceEnvelope,projectV5Resources,spendV5Temporary} from './v5-resources.js';
/**
 * Haute Magie V5 — Épuisement magique & Runes des Cadai — Lot 3.1.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */
import { normalizeV5Roll, previewV5Test, selectV5Test } from './v5-roll.js';
import { effectiveSkillScore, baseCharacteristicScore } from './v5-magic-talents.js';

export const V5_MAGIC_HIGH_VERSION = 'v5-magic-high-2026-10-10.1';

/**
 * Calcule le risque d'épuisement magique (Magical Burnout) :
 * Risque en % = (DR dépensés en surpuissance - BFM) % si > 0, sinon 0.
 */
export function calculateBurnoutRisk({ overcastSpent = 0, bfm = 0 } = {}) {
  const spent = Math.max(0, Number(overcastSpent) || 0);
  const limit = Math.max(0, Number(bfm) || 0);
  const excess = spent > limit ? spent - limit : 0;
  return {
    overcastSpent: spent,
    bfm: limit,
    excess,
    riskPercent: excess,
    triggered: excess > 0
  };
}

/**
 * Vérifie si un jet de d100 est un double (11, 22, 33, 44, 55, 66, 77, 88, 99, 100/00).
 */
export function isD100Double(roll) {
  const val = Number(roll);
  if (!Number.isFinite(val) || val < 1 || val > 100) return false;
  if (val === 100) return true; // 00 est un double
  return val % 11 === 0;
}

/**
 * Récupère le statut d'épuisement magique d'un participant.
 */
export function getBurnoutStatus(participant) {
  const raw = participant?.extensions?.v5?.burnout || participant?.burnout;
  if (!raw || typeof raw !== 'object' || raw.active !== true) {
    return {
      active: false,
      permanent: false,
      days: 0,
      roll: null,
      source: null
    };
  }
  return {
    active: true,
    permanent: Boolean(raw.permanent),
    days: raw.permanent ? Infinity : Math.max(0, Number(raw.days) || 0),
    roll: raw.roll ?? null,
    source: raw.source || 'high-magic-overcast'
  };
}

/**
 * Prévisualisation du jet d'épuisement magique (Burnout).
 * Déterministe et sans mutation d'état.
 */
export function previewBurnout({ participant = null, overcastSpent = 0, bfm = null, roll = null } = {}) {
  if((participant || bfm == null) && (participant?.caracs?.FM == null || participant.caracs.FM === '' || !Number.isFinite(Number(participant.caracs.FM)))) return {ready:false,error:'Épuisement : Force Mentale (FM) du lanceur requise.',summary:'Saisir la Force Mentale (FM).'};
  const resolvedBfm = bfm !== null && bfm !== undefined
    ? Number(bfm)
    : Math.floor((Number(participant?.caracs?.FM) || 0) / 10);

  const risk = calculateBurnoutRisk({ overcastSpent, bfm: resolvedBfm });

  if (!risk.triggered) {
    return {
      triggered: false,
      riskPercent: 0,
      overcastSpent: risk.overcastSpent,
      bfm: risk.bfm,
      roll: null,
      burnedOut: false,
      permanent: false,
      durationDays: 0,
      ready: true,
      summary: 'Aucun risque d’épuisement magique (surpuissance ≤ BFM).'
    };
  }

  if (roll === null || roll === undefined) {
    return {
      triggered: true,
      riskPercent: risk.riskPercent,
      overcastSpent: risk.overcastSpent,
      bfm: risk.bfm,
      roll: null,
      burnedOut: false,
      permanent: false,
      durationDays: 0,
      ready: false,
      summary: `Risque d’épuisement : ${risk.riskPercent} % (jet 1d100 requis).`
    };
  }

  const rollValue = normalizeV5Roll(roll);
  const burnedOut = rollValue <= risk.riskPercent;
  const permanent = burnedOut && isD100Double(rollValue);
  const durationDays = burnedOut ? (permanent ? Infinity : rollValue) : 0;

  const summary = burnedOut
    ? (permanent
      ? `Épuisement magique PERMANENT (jet ${rollValue} ≤ ${risk.riskPercent} %, double) ! Interdiction totale de lancer des sorts.`
      : `Épuisement magique temporaire pour ${durationDays} jour(s) (jet ${rollValue} ≤ ${risk.riskPercent} %). Interdiction de lancer des sorts.`)
    : `Épuisement évité (jet ${rollValue} > ${risk.riskPercent} %).`;

  return {
    triggered: true,
    riskPercent: risk.riskPercent,
    overcastSpent: risk.overcastSpent,
    bfm: risk.bfm,
    roll: rollValue,
    burnedOut,
    permanent,
    durationDays,
    ready: true,
    summary
  };
}

/**
 * Application de l'épuisement magique sur un participant ou un Store.
 */
export function applyBurnout(target, preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu d’épuisement incomplet ou non prêt');
  }

  const burnoutData = preview.burnedOut
    ? {
      active: true,
      permanent: preview.permanent,
      days: preview.durationDays,
      roll: preview.roll,
      source: 'high-magic-overcast'
    }
    : null;

  // Si cible est un Store
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-burnout', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable dans le combat');

      participants[index].extensions = participants[index].extensions || {};
      participants[index].extensions.v5 = participants[index].extensions.v5 || {};
      participants[index].extensions.v5.burnout = burnoutData;

      draft.log = [
        { id: uid(), ts: Date.now(), kind: 'magic', text: preview.summary },
        ...(draft.log || [])
      ].slice(0, 300);

      return draft;
    });
  }

  // Participant simple
  if (target && (target.id || target.caracs)) {
    const updated = structuredClone(target);
    updated.extensions = updated.extensions || {};
    updated.extensions.v5 = updated.extensions.v5 || {};
    updated.extensions.v5.burnout = burnoutData;
    return {
      status: 'applied',
      participant: updated,
      resolution: structuredClone(preview)
    };
  }

  throw new TypeError('Cible invalide pour applyBurnout');
}

/**
 * Prévisualisation de l'annulation d'un épuisement magique via Fortune (Chance) ou Destin (Fate).
 * - Épuisement temporaire : 1 Point de Chance (Fortune) seulement.
 * - Épuisement permanent : 1 Point de Destin (High Elf Players Guide p. 84) seulement.
 * S-11 : la Chance se lit dans le registre V5 (`resources.fortune`, absent tant que le compteur n'est pas initialisé) ;
 * jamais de repli sur `participant.fortune`. Le Destin se lit via getV5Fate (champ canonique `extensions.v5.fate` + Destin temporaire des couches).
 */
export function previewBurnoutRecovery(participant, { resource = null, envelope = {} } = {}) {
  const current = getBurnoutStatus(participant);
  if (!current.active) {
    return {
      possible: false,
      reason: 'Le participant ne souffre d’aucun épuisement magique.',
      requiredResource: null
    };
  }

  const requiredResource=current.permanent?'fate':'fortune';
  const providedResource=resource || requiredResource;
  if (providedResource !== requiredResource) {
    return {
      possible: false,
      reason: current.permanent
        ? 'L’épuisement permanent nécessite la dépense d’un Point de Destin (Fate).'
        : 'L’épuisement temporaire nécessite un Point de Chance (Fortune).',
      requiredResource,
      providedResource
    };
  }
  const balance = requiredResource === 'fate'
    ? (getV5Fate(envelope, participant).balance ?? NaN)
    : Number(participant?.extensions?.v5?.resources?.fortune ?? NaN);
  if (!Number.isFinite(balance)) {
    return { possible: false, requiredResource, reason: requiredResource === 'fate' ? 'Destin non renseigné pour ce personnage.' : 'Compteur de Chance non initialisé : initialisez-le avant d’annuler l’épuisement.' };
  }
  if (balance < 1) return { possible: false, requiredResource, reason: 'Ressource insuffisante pour annuler l’épuisement magique.' };

  return {
    possible: true,
    requiredResource,
    providedResource,
    currentBurnout: current,
    summary: `Annulation de l’épuisement magique (${current.permanent ? 'permanent' : `${current.days} jours`}) via dépense de 1 Point de ${requiredResource === 'fate' ? 'Destin' : 'Chance'}.`
  };
}

/**
 * Application de l'annulation d'un épuisement magique.
 */
export function applyBurnoutRecovery(target, preview, options = {}) {
  if (!preview || preview.possible === false) {
    throw new TypeError('Annulation d’épuisement impossible ou invalide');
  }

  // Si cible est un Store
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-burnout-recovery', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable dans le combat');

      const participant = participants[index];
      const projected=projectV5Resources(draft,[participant])[0];
      const checked=previewBurnoutRecovery(projected,{resource:preview.providedResource,envelope:draft});
      if(!checked.possible)throw new Error(checked.reason);
      participant.extensions = participant.extensions || {};
      participant.extensions.v5 = participant.extensions.v5 || {};
      participant.extensions.v5.burnout = null;

      const before=structuredClone(draft);
      if(checked.requiredResource==='fortune'){
        participant.extensions.v5.resources={...(participant.extensions.v5.resources || {}),fortune:Number(projected.extensions.v5.resources.fortune)-1};
        const paid=commitV5Resources(before,participants);
        draft.extensions=paid.extensions;participants.splice(0,participants.length,...paid.combat.participants);
      }else{
        // Destin temporaire d'abord (couches d'effets), puis champ canonique extensions.v5.fate (models.js le fait primer), miroir à plat.
        const spent=spendV5Temporary(draft,participants,participant,'fate',1);
        participants.splice(0,participants.length,...spent.participants);
        if(spent.consumed<1){
          const paid=participants[index];
          paid.fate=Number(paid.extensions.v5.fate ?? paid.fate)-1;
          paid.extensions.v5.fate=paid.fate;
          if(paid.extensions.v5.resources?.fate!=null)paid.extensions.v5.resources.fate=paid.fate;
        }
      }

      draft.log = [
        { id: uid(), ts: Date.now(), kind: 'magic', text: preview.summary },
        ...(draft.log || [])
      ].slice(0, 300);

      return projectV5ResourceEnvelope(draft);
    });
  }

  // Participant simple
  if (target && (target.id || target.caracs)) {
    const checked=previewBurnoutRecovery(target,{resource:preview.providedResource});if(!checked.possible)throw new Error(checked.reason);
    const updated = structuredClone(target);
    updated.extensions = updated.extensions || {};
    updated.extensions.v5 = updated.extensions.v5 || {};
    updated.extensions.v5.burnout = null;

    if (preview.requiredResource === 'fate') {
      const spent = spendV5Temporary({}, [updated], updated, 'fate', 1);
      Object.assign(updated, spent.participants[0]);
      if (spent.consumed < 1) {
        updated.fate = Number(updated.extensions.v5.fate ?? updated.fate) - 1;
        updated.extensions.v5.fate = updated.fate;
      }
    } else if (preview.requiredResource === 'fortune') {
      updated.extensions.v5.resources = { ...(updated.extensions.v5.resources || {}), fortune: Number(updated.extensions.v5.resources.fortune) - 1 };
    }

    return {
      status: 'applied',
      participant: updated,
      resolution: structuredClone(preview)
    };
  }

  throw new TypeError('Cible invalide pour applyBurnoutRecovery');
}

// ============================================================================
// RUNES DES CADAI
// ============================================================================

/**
 * Récupère le stock de runes des Cadai déployées pour un participant.
 */
export function getCadaiRunes(participant) {
  const bfm = Math.floor((Number(participant?.caracs?.FM) || 0) / 10);
  const raw = participant?.extensions?.v5?.cadaiRunes || participant?.cadaiRunes;
  const deployed = Number.isSafeInteger(Number(raw?.deployed)) ? Math.max(0, Number(raw.deployed)) : 0;
  const max = Math.max(0, bfm);
  return {
    deployed: Math.min(deployed, max),
    max
  };
}

/**
 * Déploie des runes des Cadai (maximum BFM runes).
 * Fonction pure retournant une copie du participant.
 */
export function deployCadaiRune(participant, { count = 1 } = {}) {
  const next = structuredClone(participant);
  const current = getCadaiRunes(participant);
  const maxLimit = current.max;
  const addCount = Math.max(0, Number(count) || 1);
  const newDeployed = Math.min(maxLimit, current.deployed + addCount);

  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  next.extensions.v5.cadaiRunes = { deployed: newDeployed, max: maxLimit };
  return next;
}

/**
 * Consomme une rune des Cadai pour relancer un test éligible.
 * Fonction pure retournant une copie du participant et le statut.
 */
export function consumeCadaiRune(participant, { purpose = 'reroll' } = {}) {
  const current = getCadaiRunes(participant);
  if (current.deployed <= 0) {
    return {
      success: false,
      participant,
      remaining: 0,
      reason: 'Aucune rune des Cadai déployée disponible.'
    };
  }

  const next = structuredClone(participant);
  const newDeployed = current.deployed - 1;
  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  next.extensions.v5.cadaiRunes = { deployed: newDeployed, max: current.max };

  return {
    success: true,
    participant: next,
    remaining: newDeployed,
    purpose,
    summary: `Rune des Cadai consommée (${purpose}). Il reste ${newDeployed} rune(s).`
  };
}

/** Contexte réel du Test ou du sort, transmis par son appelant (HEPG p. 84). */
export function prepareCadaiRerolls(actor, kind, options = {}, spell = null) {
  if (!options.useCadaiRune && options.cadaiRerolls === undefined) return {};
  const domain = spell?.domain ?? spell?.type;
  if (!(kind === 'channelling' && options.type === 'high' || kind === 'casting' && domain === 'high')) {
    throw new Error('Runes des Cadai : Focalisation ou sort de Haute Magie requis (contexte du sort nécessaire).');
  }
  if (options.cadaiAccessible !== true) throw new Error('Confirmer que la rune est visible et à portée de bras.');
  if (options.useCadaiRune && options.cadaiRerolls !== undefined) throw new Error('Utilisez une seule liste de relances Cadai.');
  const rerolls = options.cadaiRerolls ?? [{ purpose: options.cadaiPurpose || 'test', roll: options.cadaiRoll }];
  if (!Array.isArray(rerolls) || !rerolls.length) throw new Error('Liste de relances Cadai invalide.');
  const fields = { test: 'roll', miscast: 'miscastRoll', burnout: 'burnoutRoll' }, purposes = new Set(), result = {}, receipts = [];
  if (getCadaiRunes(actor).deployed < rerolls.length) throw new Error('Aucune rune des Cadai déployée disponible pour chaque relance.');
  for (const reroll of rerolls) {
    const purpose = reroll?.purpose;
    if (!Object.hasOwn(fields, purpose) || kind === 'channelling' && purpose === 'burnout') throw new Error('Usage de rune invalide pour ce Test.');
    if (purposes.has(purpose)) throw new Error('Une rune des Cadai au maximum pour le même jet.');
    if (purpose === 'miscast' && actor?.extensions?.v5?.specialStates?.forbidMitigation) throw new Error('La Fortune est Capricieuse interdit l’atténuation des incidents.');
    purposes.add(purpose);
    const field = fields[purpose];
    if (options[field] == null) throw new Error('Jet initial requis avant une relance Cadai.');
    const value = normalizeV5Roll(reroll.roll);
    receipts.push({ purpose, initialRoll: normalizeV5Roll(options[field]), reroll: value });
    result[field] = value;
  }
  return { ...result, cadaiReceipt: receipts.length === 1 ? receipts[0] : null, cadaiReceipts: receipts };
}

export function previewCadaiCorruptionReroll(actor, options = {}) {
  const fail = error => ({ ready: false, error });
  if ((options.spell?.domain ?? options.spell?.type) !== 'high' || typeof options.castExecutionId !== 'string' || !options.castExecutionId.trim()) return fail('Relance de Corruption : exécution de Haute Magie liée requise.');
  if (options.accessible !== true) return fail('Confirmer que la rune est visible et à portée de bras.');
  if (getCadaiRunes(actor).deployed < 1) return fail('Aucune rune des Cadai déployée.');
  if (options.alreadyRerolled === true) return fail('Une rune des Cadai au maximum pour ce jet de Corruption.');
  const modifier = options.slModifier ?? 0;
  if (!Number.isSafeInteger(modifier)) return fail('Modificateur de Corruption entier requis.');
  let firstRoll, reroll;
  try { firstRoll = normalizeV5Roll(options.firstRoll); reroll = normalizeV5Roll(options.reroll); } catch { return fail('Deux jets de Corruption explicites requis.'); }
  const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const skill = (actor.skills || []).find(row => ['calme', 'cool'].includes(fold(row.name || row.nom)));
  const score = effectiveSkillScore(actor, skill?.total ?? skill?.value ?? skill?.score ?? baseCharacteristicScore(actor, 'FM'), 'FM');
  const test = selectV5Test(previewV5Test({ score, roll: reroll, slModifiers: modifier ? [{ id: 'corruption-difficulty', label: 'Exposition à la Corruption', amount: modifier }] : [] }), 'keep');
  return { ready: true, firstRoll, reroll, test, slModifier: modifier, castExecutionId: options.castExecutionId, spellId: options.spell.id,
    cadaiReceipt: { purpose: 'corruption', initialRoll: firstRoll, reroll } };
}
