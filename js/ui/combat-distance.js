/**
 * Refonte de l'interface, lot E4b (CA13 à CA15) : une seule ligne « Distance » pour une attaque à distance.
 *
 * Au contact · Bout portant · Courte · Moyenne · Longue · Extrême, préremplie par le plateau (engagements) et la carte
 * (distance mesurée), modifiable d'un clic. La ligne se traduit dans les champs `v5Context` que le moteur lit déjà :
 * - Au contact → `engagedWithShooter: true` (le tir se résout comme une mêlée : Corps à corps opposé, sans modificateur de
 *   portée, Pistolet seulement — V5 p. 165) ;
 * - une bande → `shotRange` (Bout portant = `'point-blank'`). La case « Tir à bout portant » (`pointBlank`), doublon de la
 *   bande, disparaît de l'interface ; le moteur traite l'une ou l'autre de la même façon.
 * Fonctions pures, sans DOM.
 */

export const DISTANCE_CHOICES = Object.freeze([
  ['contact', 'Au contact'],
  ['point-blank', 'Bout portant'],
  ['short', 'Courte'],
  ['medium', 'Moyenne'],
  ['long', 'Longue'],
  ['extreme', 'Extrême']
]);
const BANDS = new Set(['point-blank', 'short', 'medium', 'long', 'extreme']);
const LABELS = Object.fromEntries(DISTANCE_CHOICES);
const EFFECT = { 'point-blank': '+2 DR', short: '+1 DR', medium: '0 DR', long: '−1 DR', extreme: '−2 DR' };

/** Bornes en mètres d'une bande (yards = mètres), d'après les bandes dérivées de la portée imprimée. */
function bandLimit(key, bands) {
  if (!bands) return '';
  const limit = { 'point-blank': bands.pointBlankYards, short: bands.shortYards, medium: bands.mediumYards, long: bands.longYards, extreme: bands.extremeYards }[key];
  return Number.isFinite(limit) ? ` ≤ ${limit} m` : '';
}

/**
 * Choix proposés et choix courant.
 * @param {{ plateau?: object, context?: object, rangeBands?: object|null, mapBand?: string|null, mapMeters?: number|null, names?: (ids: string[]) => string }} input
 *   `plateau` = deriveEngagementContext(… kind: 'ranged') ; `context` = draft.v5Context ; `rangeBands` = computeV5WeaponRangeBands(…).
 * @returns {{ selected: string|null, source: 'mj'|'plateau'|'carte'|null, options: Array<{key,label,limit,title,disabled,reason}>, explanation: string }}
 */
export function distanceChoices({ plateau = {}, context = {}, rangeBands = null, mapBand = null, mapMeters = null, names = ids => ids.join(', ') } = {}) {
  const noPointBlank = Boolean(rangeBands) && rangeBands.pointBlankYards === null;
  let selected = null, source = null;
  // Même ordre que le moteur : « au contact » (saisi, ou déduit du plateau sans contrordre du MJ) annule toute bande de portée.
  if (context.engagedWithShooter === true) { selected = 'contact'; source = 'mj'; }
  else if (context.engagedWithShooter !== false && plateau.engagedWithShooter === true) { selected = 'contact'; source = 'plateau'; }
  else if (BANDS.has(context.shotRange)) { selected = context.shotRange; source = mapBand && mapBand === context.shotRange ? 'carte' : 'mj'; }
  else if (mapBand && BANDS.has(mapBand)) { selected = mapBand; source = 'carte'; }
  const options = DISTANCE_CHOICES.map(([key, label]) => {
    const disabled = key === 'point-blank' && noPointBlank;
    return {
      key, label, limit: key === 'contact' ? '' : bandLimit(key, rangeBands).trim(),
      title: key === 'contact' ? 'Cible engagée avec le tireur : Corps à corps opposé, sans modificateur de portée' : `${label} : ${EFFECT[key]}`,
      disabled, reason: disabled ? 'Cette arme n’a pas de bout portant (portée courte de 4 m ou moins).' : ''
    };
  });
  const from = source === 'plateau' ? 'Déduit du plateau' : source === 'carte' ? `Déduit de la carte${Number.isFinite(mapMeters) ? ` (${mapMeters} m)` : ''}` : source === 'mj' ? 'Choix du MJ' : '';
  let explanation = '';
  if (selected === 'contact') explanation = `${from} : la cible est engagée avec le tireur. Le tir se résout comme une mêlée : Corps à corps opposé, sans modificateur de portée ; Pistolet seulement.`;
  else if (selected) explanation = `${from} : ${LABELS[selected]}, ${EFFECT[selected]}.`;
  else explanation = 'Distance à choisir.';
  if (selected !== 'contact' && plateau.targetEngaged === true && context.engagementForced !== 'recit') {
    const others = (plateau.engagedTargetIds || []).slice(1);
    explanation += ` Cible engagée avec ${others.length ? names(others) : 'd’autres combattants'} : Désavantage au tir ; si le Désavantage fait rater un tir qui aurait touché, l’outil demandera le d100 qui désigne le combattant touché.`;
  }
  return { selected, source, options, explanation };
}

/**
 * Le brouillon `v5Context` après un clic sur la ligne Distance, avec les mêmes champs que les cases de la 3.56.0 :
 * « La cible est engagée avec le tireur » (`engagedWithShooter`) et « Bande de portée choisie par le MJ » (`shotRange`).
 * Choisir une bande alors que le plateau déduit « au contact » écrit `engagedWithShooter: false` (le MJ l'emporte).
 */
export function distanceToContext(key, { context = {}, plateau = {} } = {}) {
  const next = { ...context };
  delete next.pointBlank;
  if (key === 'contact') {
    next.engagedWithShooter = true;
    delete next.shotRange;
    return next;
  }
  if (!BANDS.has(key)) throw new RangeError(`Distance inconnue : ${key}`);
  next.shotRange = key;
  if (plateau.engagedWithShooter === true) next.engagedWithShooter = false;
  else delete next.engagedWithShooter;
  return next;
}

/**
 * Le d100 de déviation ne se demande (dans le pied de la résolution) que s'il sert (CA15) : le moteur l'exige quand le
 * Désavantage du tir dans la mêlée fait rater un tir qui aurait touché.
 */
export function deviationRollNeeded(preview) {
  return Boolean(preview && Array.isArray(preview.unresolved) && preview.unresolved.some(text => /^Tir engagé : saisir le dé/.test(String(text))));
}
