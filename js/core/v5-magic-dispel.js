import { casterCaracs } from './creature-abilities.js';
import { uid } from './models.js';
import { beastFormRestriction } from './v5-magic-arbitrations.js';
import { expireSpellEffects } from './v5-magic-effects.js';
/**
 * Moteur de Dissipation (Dispel) V5 — Lot 3.1.
 * Conforme au Cahier des charges Lot 3 et au Cadrage Magie V5.
 * Module pur : aucune E/S, aucun tirage implicite, prévisualisations sans mutation d'état.
 */
import { previewV5Test, selectV5Test, normalizeV5Roll } from './v5-roll.js';
import { calculateMagicArmorPenalty } from './v5-magic-channelling.js';
import { resolveCastingSkill } from './v5-magic-casting.js';
import { prepareMagicOptions, enforceMagicTestRestrictions, magicSkillModifiers, familiarSkillSupport, applyMagicAttempt } from './v5-magic-talents.js';

export const V5_MAGIC_DISPEL_VERSION = 'v5-magic-dispel-2026-10-11.1';

/**
 * Normalisation de chaîne pour comparaison insensible à la casse et aux accents.
 */
const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const refused = (actionType, reason, context = {}) => ({
  ...context, actionType, allowed: false, ready: false, dispelled: false, reason,
  summary: `Dissipation impossible : ${reason}`
});

function spatialRestriction(dispeller, options) {
  if (typeof options.distance !== 'number' || !Number.isFinite(options.distance) || options.distance < 0)
    return 'Saisir une distance valide en yards (zéro ou plus).';
  if (typeof options.visible !== 'boolean') return 'Saisir explicitement la visibilité du sort ou de son point ciblé.';
  if (!options.visible) return 'Le lanceur ou le point ciblé doit être visible.';
  const range = Math.max(0, Number(casterCaracs(dispeller).FM) || 0);
  if (options.distance > range) return `Hors de portée de dissipation (${options.distance} yards > ${range} yards / FM).`;
  return null;
}

function languageRestriction(actor) {
  const names = ['langue (magick)', 'langue (magie)', 'language (magick)', 'langue magick', 'langue magie'];
  const known = (actor?.skills || []).some(s => names.includes(fold(s.name || s.nom || s.sourceName)))
    || (actor?.actions || []).some(a => names.includes(fold(a.note || a.name)) && a.base != null && Number.isFinite(Number(a.base)));
  return known ? null : 'Langue (Magick) est une compétence avancée : compétence connue requise pour dissiper.';
}

function prepareDispelOptions(actor, options) {
  // Dissiper utilise Langue, sans devenir une Action d'incantation ou de Focalisation.
  const prepared = prepareMagicOptions(actor, 'dispel', options);
  if ((actor.extensions?.v5?.miscastEffects || []).some(e => e.type === 'restriction' && (e.restrictions || []).some(r => /langue|verbal/i.test(r))))
    throw new Error('Incident magique : utilisation de Langue (Magick) interdite.');
  const assistance = familiarSkillSupport(actor, options.assistant, 'Langue (Magick)', { magicAssistantLinked: options.assistantLinked });
  prepared.slModifiers = [...magicSkillModifiers(actor, 'Langue (Magick)'),
    ...prepared.slModifiers.filter(m => !m.id.startsWith('spell-skill:') && !m.id.startsWith('miscast:')),
    ...assistance.modifiers];
  prepared.advantageSources = [...prepared.advantageSources, ...assistance.advantages];
  return prepared;
}

function dispelTest(actor, options, ownSpell = false, persistent = false) {
  const prepared = prepareDispelOptions(actor, options);
  const skill = resolveCastingSkill(actor);
  const score = options.score != null && Number.isFinite(Number(options.score)) ? Number(options.score) : skill.score;
  // V5 p.237 : la pénalité d’armure ne concerne pas la dissipation.
  const armorDetails = { penalty: 0, maxAp: 0, details: {} };
  const armorPenalty = 0;
  const magicShieldBonus = Number(actor?.extensions?.v5?.magicShieldBonusSl
    ?? actor?.extensions?.v5?.testModifiers?.[persistent ? 'Dissipation (Sort persistant étendu)' : 'Dissipation (Incantation opposée)']
    ?? actor?.extensions?.v5?.testModifiers?.Dissipation ?? 0) || 0;
  const slModifiers = [
    ...(Number(options.slModifier) ? [{ id: 'difficulty', label: 'Difficulté', amount: Number(options.slModifier) }] : []),
    ...(armorPenalty ? [{ id: 'armor', label: 'Pénalité d’armure', amount: armorPenalty }] : []),
    ...(ownSpell ? [{ id: 'own-spell', label: 'Propre sort', amount: 1 }] : []),
    ...(magicShieldBonus ? [{ id: 'magic-shield', label: 'Bouclier magique', amount: magicShieldBonus }] : []),
    ...prepared.slModifiers
  ];
  const context = { score, armorPenalty, armorDetails, slModifiers, cadaiReceipt: prepared.cadaiReceipt || null, turnKey: options.turnKey };
  if (prepared.roll == null) return { ...context, missing: ['roll'], ready: false };
  const roll = normalizeV5Roll(prepared.roll);
  const test = previewV5Test({ score, roll, kind: 'test', slModifiers,
    advantageSources: prepared.advantageSources, disadvantageSources: prepared.disadvantageSources || [] });
  const choice = prepared.choice || (test.options.length === 1 ? test.options[0].id : 'keep');
  const selectedTest = enforceMagicTestRestrictions(actor, selectV5Test(test, choice));
  return { ...context, roll, test, selectedTest, ready: true };
}

export function hasUsedDispelReaction(participant, currentRound = 1) {
  return participant?.extensions?.v5?.dispelReactionRound === (Number(currentRound) || 1);
}

export function markDispelReactionUsed(participant, currentRound = 1) {
  const next = structuredClone(participant);
  next.extensions ||= {}; next.extensions.v5 ||= {};
  next.extensions.v5.dispelReactionRound = Number(currentRound) || 1;
  return next;
}

export function canDispelCasting(dispeller, castingPreview, options = {}) {
  const locked = beastFormRestriction(dispeller, 'dispel');
  if (locked) return { allowed: false, reason: locked };
  if (!dispeller) return { allowed: false, reason: 'Dissipateur non spécifié.' };
  if (!castingPreview) return { allowed: false, reason: 'Sort à dissiper non spécifié.' };
  if (castingPreview.criticalChoice === 'unstoppable-force' || castingPreview.unstoppableForce)
    return { allowed: false, reason: 'Force irrésistible : ce sort ne peut pas être dissipé.' };
  const reason = spatialRestriction(dispeller, options) || languageRestriction(dispeller);
  if (reason) return { allowed: false, reason };
  if (hasUsedDispelReaction(dispeller, options.round ?? 1))
    return { allowed: false, reason: `La créature a déjà utilisé sa tentative de dissipation pour le Round ${options.round ?? 1}.` };
  return { allowed: true, maxRangeYards: Math.max(0, Number(dispeller.caracs?.FM) || 0) };
}

export function previewDispelCasting(dispeller, castingPreview, options = {}) {
  const round = Number(options.round ?? 1);
  const context = { dispellerId: dispeller?.id, round, distance: options.distance, input: structuredClone(options) };
  const check = canDispelCasting(dispeller, castingPreview, { ...options, round });
  if (!check.allowed) return refused('dispel-casting', check.reason, context);
  const casterSl = castingPreview.testSl ?? castingPreview.test?.sl;
  if (typeof casterSl !== 'number' || !Number.isFinite(casterSl))
    return refused('dispel-casting', 'DR du seul Test d’incantation requis pour l’opposition.', context);
  let result;
  try { result = dispelTest(dispeller, options); }
  catch (error) { return refused('dispel-casting', error.message, context); }
  const base = { ...context, ...result, actionType: 'dispel-casting', allowed: true, maxRangeYards: check.maxRangeYards };
  if (!result.ready) return { ...base, summary: 'Saisir le jet de dissipation de Langue (Magick) (+0 DR).' };
  const dispellerSl = Math.max(0, result.selectedTest.sl); // un DR négatif du dissipateur compte pour 0 (arbitrage du MJ)
  const netSl = casterSl - dispellerSl;
  const reserveSl = Number(castingPreview.matchingReserve ?? castingPreview.reserveConsumed
    ?? Math.max(0, Number(castingPreview.totalCastingSl) - casterSl)) || 0;
  const casterSlAfterDispel = netSl + reserveSl;
  const dispelled = !result.selectedTest.magicRestriction && netSl < 0;
  const summary = dispelled
    ? `Sort DISSIPÉ ! Dissipateur ${dispellerSl} DR contre Test du lanceur ${casterSl} DR.`
    : `Le lanceur gagne l’opposition : ${casterSl} − ${dispellerSl} = ${netSl} DR nets ; réserve ${reserveSl}, total restant ${casterSlAfterDispel} DR à comparer au NI.`;
  return { ...base, dispellerSl, casterSl, netSl, reserveSl, casterSlAfterDispel, dispelled, castingPreview: structuredClone(castingPreview), summary };
}

export function applyDispelCasting(target, preview, options = {}) {
  if (!preview || preview.ready !== true || preview.allowed !== true)
    throw new TypeError(preview?.reason || 'Aperçu de dissipation incomplet ou non prêt.');
  if (target && typeof target.executeCommand === 'function') {
    if (options.dispellerId && options.dispellerId !== preview.dispellerId) throw new Error('Dissipateur modifié : recalcul requis.');
    return target.executeCommand('v5-dispel-casting', draft => {
      const participants = draft.combat?.participants || [];
      const index = participants.findIndex(p => p.id === preview.dispellerId);
      if (index === -1) throw new Error('Dissipateur introuvable dans le combat.');
      const round = Number(draft.combat?.round) || 1;
      if (round !== preview.round) throw new Error('Round modifié : recalcul requis.');
      const checked = previewDispelCasting(participants[index], preview.castingPreview, { ...preview.input, round });
      if (!checked.ready || !checked.allowed) throw new Error(checked.reason || 'Aperçu incomplet : recalcul requis.');
      if (checked.dispellerSl !== preview.dispellerSl || checked.casterSlAfterDispel !== preview.casterSlAfterDispel || checked.dispelled !== preview.dispelled)
        throw new Error('Test modifié : recalcul requis.');
      participants[index] = markDispelReactionUsed(applyMagicAttempt(participants[index], checked), round);
      draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: checked.summary }, ...(draft.log || [])].slice(0, 300);
      return draft;
    });
  }
  if (target && (target.id || target.caracs)) {
    const checked = previewDispelCasting(target, preview.castingPreview, preview.input);
    if (!checked.ready || !checked.allowed) throw new Error(checked.reason || 'Aperçu incomplet : recalcul requis.');
    return { status: 'applied', participant: markDispelReactionUsed(applyMagicAttempt(target, checked), preview.round), resolution: checked };
  }
  throw new TypeError('Cible invalide pour applyDispelCasting.');
}

function persistentRestriction(effect) {
  if (effect?.magicTalentId || String(effect?.spellId || '').startsWith('talent-'))
    return 'Les méditations de talents ne sont pas dissipables.';
  if (effect?.unstoppableForce || effect?.criticalChoice === 'unstoppable-force')
    return 'Force irrésistible : ce sort ne peut pas être dissipé.';
  if (effect?.dispelled) return 'Ce sort est déjà dissipé.';
  const cn = effect?.cn ?? effect?.ni;
  if (typeof cn !== 'number' || !Number.isFinite(cn) || cn < 0) return 'NI explicite du sort persistant requis.';
  return null;
}

export function listDispellablePersistentEffects(participants = []) {
  return participants.flatMap(p => p.extensions?.v5?.spellEffects || []).filter(e => !persistentRestriction(e));
}

const castKey = effect => effect.castExecutionId || effect.id;
function progressFor(effect, dispellerId) {
  const record = effect.dispelProgressByCast?.[castKey(effect)]?.[dispellerId];
  return record || { total: Number(effect.progressByDispeller?.[dispellerId]) || 0, failed: false };
}

export function previewDispelPersistent(dispeller, persistentEffect, options = {}) {
  if (!dispeller) throw new TypeError('Dissipateur requis');
  if (!persistentEffect) throw new TypeError('Effet persistant requis');
  const locked = beastFormRestriction(dispeller, 'dispel');
  if (locked) return { ready: false, allowed: false, reason: locked, summary: locked };
  const context = { dispellerId: dispeller.id, effectId: persistentEffect.id, effectName: persistentEffect.name || persistentEffect.spellName,
    castExecutionId: castKey(persistentEffect), distance: options.distance, input: structuredClone(options) };
  const reason = persistentRestriction(persistentEffect) || spatialRestriction(dispeller, options) || languageRestriction(dispeller);
  if (reason) return refused('dispel-persistent', reason, context);
  const progress = progressFor(persistentEffect, dispeller.id);
  if (progress.failed && options.restartAttempt !== true)
    return refused('dispel-persistent', 'Le Test étendu a échoué ; confirmer une nouvelle tentative pour repartir de zéro.', context);
  const currentProgress = options.restartAttempt === true ? 0 : progress.total;
  const targetCN = persistentEffect.cn ?? persistentEffect.ni;
  const isOwnSpell = Boolean(options.isOwnSpell ?? persistentEffect.casterId === dispeller.id);
  let result;
  try { result = dispelTest(dispeller, options, isOwnSpell, true); }
  catch (error) { return refused('dispel-persistent', error.message, context); }
  const base = { ...context, ...result, actionType: 'dispel-persistent', allowed: true, targetCN, currentProgress, isOwnSpell,
    progressBefore: structuredClone(progress), persistentEffect: structuredClone(persistentEffect) };
  if (!result.ready) return { ...base, summary: `Saisir le jet de Langue (Magick). Progression : ${currentProgress}/${targetCN} DR.` };
  const selected = result.selectedTest;
  const minimum = selected.critical || selected.fumble ? 5 : 1;
  const earnedSl = selected.success ? Math.max(minimum, selected.sl) : Math.min(-minimum, selected.sl);
  const newProgress = currentProgress + earnedSl;
  const attemptFailed = newProgress < 0;
  const dispelled = !attemptFailed && newProgress >= targetCN;
  const summary = attemptFailed
    ? `Test étendu échoué : total ${newProgress} DR inférieur à zéro. Une nouvelle tentative doit être confirmée.`
    : dispelled ? `Sort persistant DISSIPÉ ! Progression : ${newProgress}/${targetCN} DR.`
      : `Test étendu : ${earnedSl >= 0 ? '+' : ''}${earnedSl} DR ; progression ${newProgress}/${targetCN} DR.`;
  return { ...base, earnedSl, newProgress, attemptFailed, dispelled, summary };
}

function writeProgress(effect, preview) {
  effect.dispelProgressByCast ||= {};
  effect.dispelProgressByCast[castKey(effect)] ||= {};
  effect.dispelProgressByCast[castKey(effect)][preview.dispellerId] = { total: preview.newProgress, failed: preview.attemptFailed };
  effect.progressByDispeller ||= {};
  effect.progressByDispeller[preview.dispellerId] = preview.newProgress;
}

export function applyDispelPersistent(target, preview, options = {}) {
  if (!preview || preview.ready !== true || preview.allowed !== true)
    throw new TypeError(preview?.reason || 'Aperçu de dissipation persistant incomplet ou non prêt.');
  if (target && typeof target.executeCommand === 'function') {
    return target.executeCommand('v5-dispel-persistent', draft => {
      const participants = draft.combat?.participants || [];
      const dispellerIndex = participants.findIndex(p => p.id === preview.dispellerId);
      if (dispellerIndex === -1) throw new Error('Dissipateur introuvable.');
      const allEffects = [...participants.flatMap(p => p.extensions?.v5?.spellEffects || []), ...(draft.persistentEffects || [])];
      const current = allEffects.find(e => e.id === preview.effectId);
      if (!current) throw new Error('Effet persistant expiré ou introuvable.');
      if (castKey(current) !== preview.castExecutionId) throw new Error('Lancer modifié : recalcul requis.');
      const group = allEffects.filter(e => castKey(e) === castKey(current));
      const blocked = group.map(persistentRestriction).find(Boolean);
      if (blocked) throw new Error(blocked);
      if (JSON.stringify(progressFor(current, preview.dispellerId)) !== JSON.stringify(preview.progressBefore))
        throw new Error('Progression modifiée : recalcul requis.');
      const checked = previewDispelPersistent(participants[dispellerIndex], current, preview.input);
      if (!checked.ready || !checked.allowed) throw new Error(checked.reason || 'Test incomplet : recalcul requis.');
      if (checked.targetCN !== preview.targetCN || checked.earnedSl !== preview.earnedSl || checked.newProgress !== preview.newProgress)
        throw new Error('Test ou NI modifié : recalcul requis.');
      participants[dispellerIndex] = applyMagicAttempt(participants[dispellerIndex], checked);
      if (checked.dispelled) {
        for (let i = 0; i < participants.length; i++) {
          const ids = (participants[i].extensions?.v5?.spellEffects || []).filter(e => castKey(e) === castKey(current)).map(e => e.id);
          for (const id of ids) participants[i] = expireSpellEffects(participants[i], { effectId: id }).participant;
        }
        draft.persistentEffects = (draft.persistentEffects || []).filter(e => castKey(e) !== castKey(current));
      } else {
        // Chaque couche du même lancer porte le reçu commun pour les aperçus du Store.
        for (const layer of participants.flatMap(p => p.extensions?.v5?.spellEffects || []))
          if (castKey(layer) === castKey(current)) writeProgress(layer, checked);
        for (const layer of draft.persistentEffects || []) if (castKey(layer) === castKey(current)) writeProgress(layer, checked);
      }
      draft.log = [{ id: uid(), ts: Date.now(), kind: 'magic', text: checked.summary }, ...(draft.log || [])].slice(0, 300);
      return draft;
    });
  }
  if (target && target.id) {
    const updated = structuredClone(target);
    if (preview.dispelled) updated.dispelled = true;
    else writeProgress(updated, preview);
    return { status: 'applied', effect: updated, resolution: structuredClone(preview) };
  }
  throw new TypeError('Cible invalide pour applyDispelPersistent.');
}
