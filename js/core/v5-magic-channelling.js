import {enforceMagicTestRestrictions} from './v5-magic-talents.js';
import { beastFormRestriction } from './v5-magic-arbitrations.js';
import { prepareMagicOptions, magicTalentRank, applyMagicAttempt, magicTurnKey, effectiveSkillScore, baseCharacteristicScore, activeMagicTalent } from './v5-magic-talents.js';
/**
 * Moteur de Focalisation (Channelling) V5 — Lot 3.0.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */
import { MAGIC_DATA } from '../data/magic.js';
import { HIT_LOCATIONS } from '../data/shared/fiche/equipment.js';
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import { resolveMiscast, applyMiscastToParticipant, explicitMagicDie, missingMagicDiceMessage } from './v5-magic-miscasts.js';
import { armorMaterial, unknownArmorMaterials } from './v5-armor-material.js';
import { uid } from './models.js';
import {endSpellEffectsOnEvent} from './v5-magic-turn.js';

export const V5_MAGIC_CHANNELLING_VERSION = 'v5-magic-channelling-2026-10-10.1';

/**
 * Normalisation de chaîne pour comparaison insensible à la casse et aux accents.
 */
const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Récupère la réserve de focalisation d'un participant.
 * Retourne { type: 'winds' | 'high' | null, sl: number }
 */
export function getChannellingReserve(participant) {
  const raw = participant?.extensions?.v5?.channelling
    || participant?.extensions?.v5?.magic?.reserve
    || participant?.channellingReserve;
  if (!raw || typeof raw !== 'object') {
    return { type: null, sl: 0 };
  }
  const sl = Number.isSafeInteger(Number(raw.sl)) && Number(raw.sl) > 0 ? Number(raw.sl) : 0;
  const type = sl > 0 ? (raw.type === 'high' ? 'high' : raw.type === 'winds' ? 'winds' : null) : null;
  return { type, sl };
}

/**
 * Définit la réserve de focalisation d'un participant (fonction pure retournant une copie).
 */
export function setChannellingReserve(participant, { type = null, sl = 0 } = {}) {
  const safeSl = Math.max(0, Number.isSafeInteger(Number(sl)) ? Number(sl) : 0);
  const safeType = safeSl > 0 ? (type === 'high' ? 'high' : 'winds') : null;
  const next = structuredClone(participant);
  next.extensions = next.extensions || {};
  next.extensions.v5 = next.extensions.v5 || {};
  next.extensions.v5.channelling = { type: safeType, sl: safeSl };
  if (next.extensions.v5.magic) {
    next.extensions.v5.magic.reserve = { type: safeType, sl: safeSl };
  }
  next.channellingReserve = { type: safeType, sl: safeSl };
  return next;
}

/**
 * Réinitialise la réserve de focalisation d'un participant (remise à 0).
 */
export function clearChannellingReserve(participant) {
  return setChannellingReserve(participant, { type: null, sl: 0 });
}

/**
 * Calcule la pénalité d'armure portée pour la magie V5 :
 * −1 DR par PA de la localisation la plus protégée (max des PA portés).
 * Exceptions :
 * - Métal ignoré pour Chamon (or / metal).
 * - Cuir ignoré pour Ghur (bêtes / ambre / leather).
 * - Les PA de sorts (layer: 'bonus') et l'armure naturelle n'imposent pas de pénalité.
 */
export function calculateMagicArmorPenalty(participant, { wind = null } = {}) {
  const normalizedWind = fold(wind);
  const ignoreMetal = ['chamon', 'metal', 'or', 'gold'].includes(normalizedWind);
  const ignoreLeather = ['ghur', 'beasts', 'betes', 'ambre', 'amber'].includes(normalizedWind);

  const equipment = Array.isArray(participant?.equipment) ? participant.equipment : [];
  const armours = equipment.filter(item => item && item.kind === 'armour' && item.equipped !== false);

  // Si aucun équipement porté n'est présent, vérifier si des PA portés explicites existent
  if (armours.length === 0 && !equipment.some(item => item?.kind === 'armour')) {
    const worn = participant?.wornArmorLocations;
    if (worn && typeof worn === 'object') {
      const damage = participant?.extensions?.v5?.armorDamage || {};
      const max = Math.max(0, ...Object.entries(worn).map(([loc, ap]) => Math.max(0, (Number(ap) || 0) - (damage[loc] || 0))));
      return { penalty: -max, maxAp: max, maxLocation: null, details: {} };
    }
    // Armure naturelle uniquement (ex: participant.armor ou participant.armorLocations sans equipment) -> 0 pénalité
    return { penalty: 0, maxAp: 0, maxLocation: null, details: {} };
  }

  const locationAps = {};
  for (const loc of HIT_LOCATIONS) {
    const covered = armours.filter(item => Array.isArray(item.locations) && item.locations.includes(loc.id));
    const layers = new Map();
    for (const item of covered) {
      if (!Number.isInteger(item.ap) || item.ap <= 0) continue;
      // Les PA de sorts sont ignorés
      if (item.layer === 'bonus') continue;

      const isLeather = armorMaterial(item) !== 'metal' && (item.layer === 'leather' || /^(leather|cuir(?: souple| bouilli)?)$/i.test(String(item.material || item.category || '').trim()));
      // Un matériau inconnu n'est jamais ignoré : la pénalité reste entière et la pièce est signalée (unknownMaterials).
      const isMetal = armorMaterial(item) === 'metal';

      if (ignoreMetal && isMetal) continue;
      if (ignoreLeather && isLeather) continue;

      const layerKey = item.layer || 'rigid';
      const existing = layers.get(layerKey);
      if (!existing || item.ap > existing.ap) {
        layers.set(layerKey, item);
      }
    }
    const totalAp = [...layers.values()].reduce((sum, item) => sum + item.ap, 0);
    locationAps[loc.id] = Math.max(0, totalAp - (participant?.extensions?.v5?.armorDamage?.[loc.id] || 0));
  }

  let maxAp = 0;
  let maxLocation = null;
  for (const [locId, ap] of Object.entries(locationAps)) {
    if (ap > maxAp) {
      maxAp = ap;
      maxLocation = locId;
    }
  }

  return {
    penalty: maxAp ? -maxAp : 0,
    maxAp,
    maxLocation,
    details: locationAps,
    ignoreMetal,
    ignoreLeather,
    unknownMaterials: unknownArmorMaterials(participant)
  };
}

/**
 * Résout la compétence de focalisation appropriée :
 * - Huit Vents : "Focalisation" (Channelling)
 * - Haute Magie : "Focalisation (Haute Magie)" ou "Focalisation (Qhaysh)"
 */
export function resolveChannellingSkill(participant, { type = 'winds', wind = null } = {}) {
  const bfm = Math.floor((Number(participant?.caracs?.FM) || 0) / 10);
  const targetType = type === 'high' ? 'high' : 'winds';

  const highNames = ['focalisation (haute magie)', 'focalisation (qhaysh)', 'channelling (high magic)', 'focalisation haute magie'];
  const windsNames = ['focalisation', 'channelling', 'focalisation (vents)', 'channelling (winds)'];
  const windAliases = {
    aqshy: ['aqshy', 'fire', 'feu'], azyr: ['azyr', 'heavens', 'cieux'], chamon: ['chamon', 'metal', 'or'],
    ghur: ['ghur', 'beasts', 'betes', 'ambre'], ghyran: ['ghyran', 'life', 'vie', 'jade'],
    hysh: ['hysh', 'light', 'lumiere'], shyish: ['shyish', 'death', 'mort'], ulgu: ['ulgu', 'shadow', 'shadows', 'ombres']
  };
  const aliases = Object.values(windAliases).find(names => names.includes(fold(wind))) || [];
  const specializedNames = aliases.flatMap(name => [`focalisation (${name})`, `channelling (${name})`]);
  const coloredNames = Object.values(windAliases).flat().flatMap(name => [`focalisation (${name})`, `channelling (${name})`]);
  const targetNames = targetType === 'high' ? highNames : [...windsNames, ...coloredNames];

  const skills = Array.isArray(participant?.skills) ? participant.skills : [];
  const foundSkill = skills.find(s => (targetType === 'high' ? highNames : windsNames).includes(fold(s.name || s.nom || s.sourceName)))
    || skills.find(s => targetNames.includes(fold(s.name || s.nom || s.sourceName)));

  const actions = Array.isArray(participant?.actions) ? participant.actions : [];
  const foundAction = actions.find(a => targetNames.includes(fold(a.note || a.name)));

  let score = null;
  let skillName = targetType === 'high' ? 'Focalisation (Haute Magie)' : 'Focalisation';

  if (foundSkill) {
    skillName = foundSkill.name || foundSkill.nom || skillName;
    score = foundSkill.total ?? foundSkill.value ?? foundSkill.score ?? (baseCharacteristicScore(participant,'FM') + (Number(foundSkill.advances ?? foundSkill.adv) || 0));
  } else if (foundAction && Number.isFinite(Number(foundAction.base))) {
    skillName = foundAction.note || foundAction.name || skillName;
    score = Number(foundAction.base);
  } else {
    score = baseCharacteristicScore(participant,'FM');
  }

  return {
    skillName,
    score: effectiveSkillScore(participant, Number(score) || 0, 'FM'),
    bfm,
    carac: 'FM',
    type: targetType,
    warning: targetType === 'winds' && new Set(skills.filter(s => targetNames.includes(fold(s.name || s.nom || s.sourceName))).map(s => Number(s.total ?? s.value ?? s.score ?? (baseCharacteristicScore(participant,'FM') + Number(s.advances ?? s.adv ?? 0))))).size > 1
      ? 'Anomalie de fiche : plusieurs valeurs de Focalisation des Vents. La compétence générique prime lorsqu’elle existe ; sinon la première valeur importée est commune à tous les Vents. Corriger la fiche avec le MJ.' : null
  };
}

/**
 * Recherche d'incident magique dans les tables V5 de MAGIC_DATA.
 */
export function lookupMiscast(tableKey, rawRoll, modifier = 0, options = {}) {
  const result = resolveMiscast({
    severity: tableKey,
    roll: rawRoll,
    modifier,
    ...options
  });
  return result.cancelled && result.ready !== false ? null : result;
}

/**
 * Maladresse ou interruption : perte de 1d10 DR (plafonnée à la réserve), puis incident Mineur
 * majoré de +10 par DR réellement perdu. Chaque dé utilisé doit être saisi.
 */
function resolveReserveLoss(reserveSl, options, miscastContext) {
  const lossRoll = explicitMagicDie(options.lossRoll, 'd10');
  const missing = reserveSl > 0 && lossRoll === null ? ['lossRoll'] : [];
  const actualLoss = reserveSl > 0 && lossRoll !== null ? Math.min(reserveSl, lossRoll) : 0;
  let miscast = null;
  if (missing.length) {
    if (explicitMagicDie(options.miscastRoll, 'd100') === null) missing.push('miscastRoll');
  } else {
    miscast = lookupMiscast(options.forceMajorMiscast?'MAJOR':'MINOR', options.miscastRoll, options.forceMajorMiscast?0:10 * actualLoss, miscastContext);
    missing.push(...(miscast?.missingSecondaryDice || []).map(key => key === 'roll' ? 'miscastRoll' : key));
  }
  return { lossRoll, actualLoss, miscast, missing };
}

/**
 * Prévisualisation d'une Action de Focalisation V5.
 * Pure et déterministe, SANS MUTATION D'ÉTAT.
 */
export function previewChannelling(participant, options = {}) {
  const locked = beastFormRestriction(participant, 'channel');
  if (locked) return { actionType: 'channelling', ready: false, error: locked, summary: locked };
  options = prepareMagicOptions(participant,options.mode==='pause'?'pause':options.mode==='interruption'?'interruption':'channelling',options);
  if (options.mode === 'interruption') {
    return previewChannellingInterruption(participant, options);
  }
  if (options.mode === 'pause') {
    return previewChannellingPause(participant, options);
  }
  const targetType = options.type === 'high' ? 'high' : 'winds';
  const currentReserve = getChannellingReserve(participant);

  // Commencer une action de l'autre type efface la réserve précédente avant même le jet
  const typeChanged = currentReserve.type !== null && currentReserve.sl > 0 && currentReserve.type !== targetType;
  const startingReserve = typeChanged ? 0 : currentReserve.sl;

  const skill = resolveChannellingSkill(participant, { type: targetType, wind: options.wind });
  const score = Number.isFinite(Number(options.score)) ? Number(options.score) : skill.score;
  const bfm = Number.isFinite(Number(options.bfm)) ? Number(options.bfm) : skill.bfm;

  const armorContext = calculateMagicArmorPenalty(participant, { wind: options.wind });
  const armorPenalty = armorContext.penalty;

  const difficultyModifier = Number(options.slModifier) || 0; // standard +0 DR
  const extraModifiers = Array.isArray(options.slModifiers) ? options.slModifiers : [];
  // HEPG p. 83 : Bénédiction de Lileath, +1 DR par niveau aux Tests de Focalisation (Qhaysh), réussis ou non.
  const lileath = targetType === 'high' ? magicTalentRank(participant, 'lileath-s-blessing') : 0;
  const slModifiers = [
    ...(difficultyModifier !== 0 ? [{ id: 'difficulty', label: 'Difficulté', amount: difficultyModifier }] : []),
    ...(armorPenalty !== 0 ? [{ id: 'armor', label: 'Pénalité d’armure', amount: armorPenalty }] : []),
    ...(lileath > 0 ? [{ id: 'lileath-s-blessing', label: 'Bénédiction de Lileath', amount: lileath }] : []),
    ...extraModifiers
  ];

  if (options.roll === undefined || options.roll === null) {
    return {
      actionType: 'channelling',
      type: targetType,
      currentReserve,
      typeChanged,
      startingReserve,
      score,
      bfm,
      armorPenalty,
      slModifiers,
      missing: ['roll'],
      ready: false
    };
  }

  const roll = normalizeV5Roll(options.roll);
  const testPreview = previewV5Test({
    score,
    roll,
    kind: 'test',
    channellingGain: true,
    slModifiers,
    advantageSources: options.advantageSources || [],
    disadvantageSources: options.disadvantageSources || []
  });

  const optionId = testPreview.options.length === 1 ? testPreview.options[0].id : options.choice || 'keep';
  const selectedTest = enforceMagicTestRestrictions(participant,selectV5Test(testPreview, optionId));
  const { success, critical, fumble } = selectedTest;
  const sl = selectedTest.sl;

  let gain = 0;
  let lossRoll = null;
  let actualLoss = 0;
  let newReserveSl = startingReserve;
  let miscast = null;
  let missing = [];

  if (success) {
    if (critical) {
      // Critique : gain = DR + 2 × BFM (ne provoque pas d'incident à lui seul)
      gain = sl + 2 * bfm;
    } else {
      // Gain standard : gain = DR + BFM
      gain = sl + bfm;
    }
    newReserveSl = startingReserve + gain;
  } else if (fumble) {
    // Maladresse : perte de 1d10 DR (plafonné à la réserve actuelle) et incident Mineur
    ({ lossRoll, actualLoss, miscast, missing } = resolveReserveLoss(startingReserve, options, {
      bfm,
      isHighMagic: targetType === 'high',
      secondaryRolls: options.secondaryRolls,
      hasIngredient: false,
      instinctiveDiction: Boolean(options.instinctiveDiction),
    attunementRank: options.attunementRank, miscastRoll2: options.miscastRoll2, miscastChoice: options.miscastChoice,
      corruptingInfluence: Boolean(options.corruptingInfluence),
      majorRoll: options.majorRoll
    }));
    newReserveSl = Math.max(0, startingReserve - actualLoss);
  } else {
    // Échec standard : aucune perte, la réserve est maintenue
    gain = 0;
    newReserveSl = startingReserve;
  }

  const newReserve = {
    type: newReserveSl > 0 ? targetType : null,
    sl: newReserveSl
  };

  return {
    actionType: 'channelling',
    type: targetType,
    currentReserve,
    typeChanged,
    startingReserve,
    score,
    bfm,
    armorPenalty,
    armorDetails: armorContext,
    roll,
    test: selectedTest,
    success,
    sl,
    critical,
    fumble,
    gain,
    lossRoll,
    actualLoss,
    miscast,
    newReserve,
    turnKey:options.turnKey,
    skillWarning: skill.warning,
    cadaiReceipt: options.cadaiReceipt?.purpose === 'test' || options.cadaiReceipt?.purpose === 'miscast' && miscast ? options.cadaiReceipt : null,
    // HEPG p. 84 : une rune ne se paie que pour un jet réellement utilisé (incident seulement s'il y en a un).
    cadaiReceipts: (options.cadaiReceipts || []).filter(receipt => receipt.purpose === 'test' || receipt.purpose === 'miscast' && miscast),
    missing,
    error: missing.length ? missingMagicDiceMessage(missing) : miscast?.ready === false ? miscast.summary : null,
    ready: !missing.length && (!miscast || miscast.ready !== false)
  };
}

/**
 * Application atomique d'une Action de Focalisation.
 */
export function applyChannelling(target, preview, options = {}) {
  if (!preview || preview.ready === false) {
    throw new TypeError('Aperçu de focalisation incomplet ou non prêt');
  }

  const applyToOne = (p, round = 1) => {
    let updated = setChannellingReserve(p, preview.newReserve);
    if (preview.actionType === 'channelling') updated = applyMagicAttempt(updated, preview, options);
    if (preview.miscast) {
      updated = applyMiscastToParticipant(updated, preview.miscast, { round, ...options }).participant;
    }
    if(preview.actionType==='channelling')updated=endSpellEffectsOnEvent([updated],updated.id,'channelling')[0];
    return updated;
  };

  // Si target est un Store
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || preview.input?.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-channelling', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable dans le combat');
      if(preview.baseRevision!==undefined && draft.localRevision!==undefined && preview.baseRevision!==draft.localRevision)throw new Error('Focalisation périmée : recalcul requis.');
      if(preview.input){
        const raw=preview.input;
        preview=previewChannelling(participants[index],{...raw,assistant:participants.find(p=>p.id===raw.assistantId),turnKey:String(draft.combat?.round || 1)+':'+String(draft.extensions?.v5?.turnIndex || 1)});
        if(!preview.ready)throw new Error(preview.miscast?.summary || 'Focalisation incomplète.');
      }
      participants[index] = applyToOne(participants[index], draft.combat?.round ?? 1);
      const logText = preview.actionType === 'channelling-pause'
        ? `Pause de Focalisation : ${preview.success ? 'réserve conservée' : 'réserve perdue'} (${preview.newReserve.sl} DR).`
        : preview.actionType === 'channelling-interruption'
          ? `Interruption de Focalisation : ${preview.success ? 'réserve conservée' : `perte de ${preview.actualLoss} DR`} (réserve : ${preview.newReserve.sl} DR).${preview.miscast ? ` Incident : ${preview.miscast.name}.` : ''}`
          : `Focalisation (${preview.type}) : ${preview.success ? `+${preview.gain} DR (réserve : ${preview.newReserve.sl})` : preview.fumble ? `Maladresse ! Perte de ${preview.actualLoss} DR (réserve : ${preview.newReserve.sl})${preview.miscast ? ` · Incident : ${preview.miscast.name} (${preview.miscast.details?.summary || preview.miscast.description})` : ''}` : 'Échec'}`;
      draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic',actorId, text: logText }, ...(draft.log || [])].slice(0, 300);
      return draft;
    });
  }

  // Participant simple
  if (target && (target.id || target.caracs)) {
    const updated = applyToOne(target, options.round ?? 1);
    return {
      status: 'applied',
      participant: updated,
      resolution: structuredClone(preview)
    };
  }

  // État de combat ou enveloppe avec tableau participants
  if (target && Array.isArray(target.participants)) {
    const actorId = options.actorId || target.participants[0]?.id;
    const nextState = structuredClone(target);
    nextState.participants = nextState.participants.map(p => p.id === actorId ? applyToOne(p, nextState.round ?? 1) : p);
    return {
      status: 'applied',
      state: nextState,
      resolution: structuredClone(preview)
    };
  }

  throw new TypeError('Cible invalide pour applyChannelling');
}

/**
 * Pause de Focalisation :
 * À chaque Tour, Test de Résistance Accessible (+2 DR) pour conserver la réserve.
 * Échec = réserve perdue (sl: 0).
 */
export function previewChannellingPause(participant, options = {}) {
  const currentReserve = getChannellingReserve(participant);
  const endurance = Number(participant?.caracs?.E) || 0;
  const skills = Array.isArray(participant?.skills) ? participant.skills : [];
  const foundSkill = skills.find(s => ['resistance', 'endurance'].includes(fold(s.name || s.nom || s.sourceName)));
  const score = Number.isFinite(Number(options.score)) ? Number(options.score) : effectiveSkillScore(participant,foundSkill?.total ?? foundSkill?.value ?? foundSkill?.score ?? baseCharacteristicScore(participant,'E'),'E');

  const slModifiers = [{ id: 'pause-difficulty', label: 'Accessible (+2 DR)', amount: 2 },...(options.slModifiers || [])];

  if (options.roll === undefined || options.roll === null) {
    return {
      actionType: 'channelling-pause',
      currentReserve,
      score,
      missing: ['roll'],
      ready: false
    };
  }

  const roll = normalizeV5Roll(options.roll);
  const testPreview = previewV5Test({
    score,
    roll,
    kind: 'test',
    slModifiers
  });
  const selectedTest = enforceMagicTestRestrictions(participant,selectV5Test(testPreview,'keep'),{magical:false});
  const success = selectedTest.success;
  const newReserve = success ? currentReserve : { type: null, sl: 0 };

  return {
    actionType: 'channelling-pause',
    currentReserve,
    score,
    roll,
    test: selectedTest,
    success,
    reserveLost: !success,
    newReserve,
    cadaiReceipt: options.cadaiReceipt || null,
    ready: true
  };
}

export function applyChannellingPause(target, preview, options = {}) {
  if (!preview || preview.ready === false) throw new TypeError('Aperçu incomplet');
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-channelling-pause', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable');
      participants[index] = setChannellingReserve(participants[index], preview.newReserve);
      return draft;
    });
  }
  if (target && (target.id || target.caracs)) {
    return {
      status: 'applied',
      participant: setChannellingReserve(target, preview.newReserve),
      resolution: structuredClone(preview)
    };
  }
  throw new TypeError('Cible invalide');
}

/**
 * Interruption de Focalisation :
 * Dégâts ou état subi pendant la focalisation -> Test de Calme Difficile (−2 DR).
 * Échec = perte de 1d10 DR (plafonné), incident Mineur avec +10 par DR réellement perdu.
 */
export function previewChannellingInterruption(participant, options = {}) {
  const currentReserve = getChannellingReserve(participant);
  if(options.distraction===true && activeMagicTalent(participant,'eye-of-the-storm'))return {actionType:'channelling-interruption',ready:true,success:true,newReserve:currentReserve,summary:'Œil de la tempête : cette distraction n’interrompt pas la Focalisation.'};
  const fm = Number(participant?.caracs?.FM) || 0;
  const bfm = Math.floor(fm / 10);
  const skills = Array.isArray(participant?.skills) ? participant.skills : [];
  const foundSkill = skills.find(s => /calme|cool/i.test(s.name || s.nom || ''));
  const score = Number.isFinite(Number(options.score)) ? Number(options.score) : effectiveSkillScore(participant,foundSkill?.total ?? foundSkill?.value ?? foundSkill?.score ?? baseCharacteristicScore(participant,'FM'),'FM');

  const slModifiers = [{ id: 'interruption-difficulty', label: 'Difficile (−2 DR)', amount: -2 },...(options.slModifiers || [])];

  if (options.roll === undefined || options.roll === null) {
    return {
      actionType: 'channelling-interruption',
      currentReserve,
      score,
      missing: ['roll'],
      ready: false
    };
  }

  const roll = normalizeV5Roll(options.roll);
  const testPreview = previewV5Test({
    score,
    roll,
    kind: 'test',
    slModifiers
  });
  const selectedTest = selectV5Test(testPreview, 'keep');
  const success = selectedTest.success;

  let lossRoll = null;
  let actualLoss = 0;
  let newReserveSl = currentReserve.sl;
  let miscast = null;
  let missing = [];

  if (!success) {
    ({ lossRoll, actualLoss, miscast, missing } = resolveReserveLoss(currentReserve.sl, options, {
      bfm,
      isHighMagic: currentReserve.type === 'high',
      secondaryRolls: options.secondaryRolls,
      hasIngredient: false,
      instinctiveDiction: Boolean(options.instinctiveDiction),
    attunementRank: options.attunementRank, miscastRoll2: options.miscastRoll2, miscastChoice: options.miscastChoice,
      corruptingInfluence: Boolean(options.corruptingInfluence),
      majorRoll: options.majorRoll
    }));
    newReserveSl = Math.max(0, currentReserve.sl - actualLoss);
  }

  const newReserve = {
    type: newReserveSl > 0 ? currentReserve.type : null,
    sl: newReserveSl
  };

  return {
    actionType: 'channelling-interruption',
    currentReserve,
    score,
    roll,
    test: selectedTest,
    success,
    interrupted: !success,
    lossRoll,
    actualLoss,
    miscast,
    newReserve,
    cadaiReceipt: options.cadaiReceipt || null,
    missing,
    error: missing.length ? missingMagicDiceMessage(missing) : miscast?.ready === false ? miscast.summary : null,
    ready: !missing.length && (!miscast || miscast.ready !== false)
  };
}

export function applyChannellingInterruption(target, preview, options = {}) {
  if (!preview || preview.ready === false) throw new TypeError('Aperçu incomplet');
  const applyToOne = (p, round = 1) => {
    let updated = setChannellingReserve(p, preview.newReserve);
    if (preview.miscast) {
      updated = applyMiscastToParticipant(updated, preview.miscast, { round, ...options }).participant;
    }
    return updated;
  };
  if (target && typeof target.executeCommand === 'function') {
    const actorId = options.actorId || target.getCombat()?.currentActorId || target.listParticipants()[0]?.id;
    return target.executeCommand('v5-channelling-interruption', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === actorId);
      if (index === -1) throw new Error('Participant introuvable');
      participants[index] = applyToOne(participants[index], draft.combat?.round ?? 1);
      return draft;
    });
  }
  if (target && (target.id || target.caracs)) {
    return {
      status: 'applied',
      participant: applyToOne(target, options.round ?? 1),
      resolution: structuredClone(preview)
    };
  }
  throw new TypeError('Cible invalide');
}
