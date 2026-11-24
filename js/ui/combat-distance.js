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
  // G2-f (g-distance) : ce qui est retenu et d'où, en clair (« Courte · 12 m · carte », « Au contact · plateau »).
  const meters = Number.isFinite(mapMeters) ? `${mapMeters} m` : '';
  let summary = 'Distance à choisir';
  if (selected === 'contact') summary = source === 'plateau' ? 'Au contact · plateau' : 'Au contact · choisi par le MJ';
  else if (selected && source === 'carte') summary = [LABELS[selected], meters, 'carte'].filter(Boolean).join(' · ');
  else if (selected) summary = `${LABELS[selected]} · choisi par le MJ${meters ? ` (carte : ${meters})` : ''}`;
  else if (meters) summary = `Carte : ${meters}, au-delà de l’Extrême`;
  return { selected, source, options, explanation, summary };
}

/**
 * G2-b : distance en mètres renvoyée par la carte, gardée dans le brouillon (`v5Context.mapDistance`) pour la paire
 * tireur → cible. Retourne le nouveau contexte, ou null si la mesure est déjà connue.
 */
export function mapDistanceContext(context = {}, { meters, actorId, targetId, band } = {}) {
  if (!Number.isFinite(meters)) return null;
  const known = context.mapDistance;
  if (known && !known.offline && known.meters === meters && known.actorId === actorId && known.targetId === targetId && (band === undefined || known.band === band)) return null;
  return { ...context, mapDistance: { meters, actorId, targetId, ...(band !== undefined ? { band } : {}) } };
}

/**
 * G10 (R14) : contexte du brouillon après une réponse de la carte (rendu du panneau, ou redemande à chaque `map.adjacency`).
 * La bande écrite par la carte suit la nouvelle mesure ; une bande choisie par le MJ reste telle quelle. Sans bande choisie, la
 * première réponse la préremplit (`firstFill`, sauf engagement). Rend `{ context, filled }` : `context` est null quand rien ne change,
 * `filled` vrai quand la bande vient d'être préremplie (l'appelant ne la préremplit plus pour cette paire).
 */
export function mapAnswerContext(current = {}, { meters, band = null, actorId, targetId, engaged = false, firstFill = true } = {}) {
  const previous = mapBandFor(current, actorId, targetId);
  let shotRange = current.shotRange, filled = false;
  if (band && previous && shotRange === previous) shotRange = band;
  if (band && !shotRange && current.engagedWithShooter !== true && !engaged && firstFill) { filled = true; shotRange = band; }
  const fromMap = Boolean(band) && shotRange === band;
  const next = mapDistanceContext({ ...current, ...(shotRange ? { shotRange } : {}) }, { meters, actorId, targetId, band: fromMap ? band : null });
  return { context: next || (shotRange !== current.shotRange ? { ...current, shotRange } : null), filled };
}

/** Mètres de la carte pour cette paire, sinon null (mesure d'une autre cible, d'un autre tireur, ou carte débranchée ignorée). */
export function mapMetersFor(context = {}, actorId, targetId) {
  const known = context.mapDistance;
  return known && !known.offline && known.actorId === actorId && known.targetId === targetId && Number.isFinite(known.meters) ? known.meters : null;
}

/** Bande de portée que la carte a écrite pour cette paire (pour la faire suivre une nouvelle mesure), sinon null. */
export function mapBandFor(context = {}, actorId, targetId) {
  const known = context.mapDistance;
  return known && known.actorId === actorId && known.targetId === targetId && known.band ? known.band : null;
}

/** Bonus d'Initiative de la cible (même lecture que le moteur : dizaines de la caractéristique I). */
function initiativeBonusOf(target) {
  const value = Math.floor(Number(target?.caracs?.I) / 10);
  return Number.isFinite(value) ? value : null;
}

/** PA restants du meilleur bouclier disponible de la cible (qualité Bouclier, dégâts d'armure déduits ; pavois planté exclu). */
function shieldRatingOf(target) {
  const unavailable = target?.extensions?.shieldUnavailable || [];
  const damage = target?.extensions?.v5?.armorDamageByItem || {};
  const planted = target?.extensions?.v5?.paviseDeploymentByItemId || {};
  let best = 0;
  for (const item of Array.isArray(target?.equipment) ? target.equipment : []) {
    if (item?.kind !== 'shield' || unavailable.includes(item.id) || planted[item.id]?.status === 'planted') continue;
    if (!(item.keywords || []).some(row => (typeof row === 'string' ? row : row?.id) === 'bouclier')) continue;
    const rating = Math.max(0, Number(item.ap) - (Number(damage[item.id]) || 0));
    if (Number.isFinite(rating) && rating > best) best = rating;
  }
  return best;
}

const pairOf = (actor, target) => `${actor?.id ?? ''}>${target?.id ?? ''}`;

/**
 * G2-a (R14, p. 165) : droit d'opposer un tir par Esquive, calculé dans l'interface.
 * - cible engagée avec le tireur → « contact » : Corps à corps opposé, déjà résolu par le moteur ;
 * - carte ≤ BI m, ou bouclier de 2 PA ou plus → permise, sans question ;
 * - carte > BI m sans bouclier → interdite : le tir est un Test non opposé (p. 164) ;
 * - ni carte ni bouclier → « ask » : question en clair, Oui / Non du MJ, sans précoche (réponse du MJ à Q1).
 * Un choix du MJ (`rangedOppositionBy: 'mj'`, pour la même paire ; ou l'ancienne case « Tir opposé par Esquive confirmé »)
 * l'emporte sur la déduction. `defense` : 'none' (aucun jet de défense), 'dodge', 'melee' (contact) ou 'open' (question ouverte).
 */
export function rangedDodgeRight({ actor = null, target = null, context = {}, plateau = {} } = {}) {
  const bi = initiativeBonusOf(target);
  const biText = bi === null ? 'BI ?' : `BI ${bi}`;
  const meters = mapMetersFor(context, actor?.id, target?.id);
  const contact = context.engagedWithShooter === true || (context.engagedWithShooter !== false && plateau.engagedWithShooter === true);
  const base = { initiativeBonus: bi, meters, forced: false, answer: null };
  if (contact) return { ...base, status: 'contact', deduced: 'contact', by: 'plateau', defense: 'melee', label: 'Au contact : Corps à corps opposé',
    title: 'Cible engagée avec le tireur : le tir se résout comme une mêlée, Capacité de Tir opposée au Corps à corps (p. 165).' };
  const shield = shieldRatingOf(target);
  let deduced;
  if (meters !== null && bi !== null && meters <= bi) deduced = { status: 'allowed', by: 'carte', label: `Esquive permise : ${meters} m ≤ ${biText}` };
  else if (shield >= 2) deduced = { status: 'allowed', by: 'bouclier', label: `Esquive permise : bouclier ${shield} PA` };
  else if (meters !== null && bi !== null) deduced = { status: 'forbidden', by: 'carte', label: `Esquive interdite : ${meters} m > ${biText}` };
  else deduced = { status: 'ask', by: null, label: `Esquive permise si le tireur est à ${bi ?? '?'} m ou moins (${biText})` };
  const rule = 'p. 165 : un tir s’oppose par Esquive si le tireur est à au plus Bonus d’Initiative mètres de la cible, ou à toute portée avec un bouclier de 2 PA ou plus ; sinon le tir est un Test de Capacité de Tir non opposé (p. 164).';
  const value = context.rangedOppositionAllowed;
  const by = context.rangedOppositionBy;
  const mjAnswer = typeof value === 'boolean' && (by === undefined || (by === 'mj' && context.rangedOppositionFor === pairOf(actor, target))) ? value : null;
  if (mjAnswer !== null) {
    const status = mjAnswer ? 'allowed' : 'forbidden';
    const forced = deduced.status !== 'ask';
    return { ...base, status, deduced: deduced.status, by: 'mj', forced, answer: deduced.status === 'ask' ? mjAnswer : null,
      defense: mjAnswer ? 'dodge' : 'none', label: mjAnswer ? 'Esquive permise (MJ)' : 'Esquive interdite (MJ)',
      title: `Choix du MJ${forced ? ` (déduit : ${deduced.label})` : ''}. ${rule}` };
  }
  return { ...base, ...deduced, deduced: deduced.status, defense: deduced.status === 'allowed' ? 'dodge' : deduced.status === 'forbidden' ? 'none' : 'open',
    title: `${deduced.status === 'ask' ? 'Sans carte, la distance du tireur est inconnue : au MJ de répondre.' : `Déduit (${deduced.by}).`} ${rule}` };
}

const DODGE_KEYS = ['rangedOppositionAllowed', 'rangedOppositionBy', 'rangedOppositionFor'];

/**
 * Le droit déduit passe au moteur par le champ existant `v5Context.rangedOppositionAllowed` (js/core intact). Retourne le
 * contexte à écrire, ou null s'il n'y a rien à changer. Un choix du MJ pour cette paire n'est jamais réécrit ; une réponse
 * donnée pour une autre cible est oubliée.
 */
export function rangedDodgeSync(right, context = {}, { actorId, targetId } = {}) {
  const pair = `${actorId ?? ''}>${targetId ?? ''}`;
  const strip = () => { const next = { ...context }; for (const key of DODGE_KEYS) delete next[key]; return next; };
  if (context.rangedOppositionBy === 'mj') return context.rangedOppositionFor === pair ? null : strip();
  if (typeof context.rangedOppositionAllowed === 'boolean' && context.rangedOppositionBy === undefined) return null;
  if (right.by === 'mj') return null;
  if (['allowed', 'forbidden'].includes(right.status)) {
    const value = right.status === 'allowed';
    if (context.rangedOppositionAllowed === value && context.rangedOppositionBy === right.by && context.rangedOppositionFor === pair) return null;
    return { ...context, rangedOppositionAllowed: value, rangedOppositionBy: right.by, rangedOppositionFor: pair };
  }
  return DODGE_KEYS.some(key => key in context) ? strip() : null;
}

/** Réponse du MJ (Oui = true, Non = false, null = rendre la déduction / retirer la réponse), pour cette paire. */
export function rangedDodgeAnswer(context = {}, { actorId, targetId } = {}, value) {
  const next = { ...context };
  for (const key of DODGE_KEYS) delete next[key];
  if (typeof value !== 'boolean') return next;
  return { ...next, rangedOppositionAllowed: value, rangedOppositionBy: 'mj', rangedOppositionFor: `${actorId ?? ''}>${targetId ?? ''}` };
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
