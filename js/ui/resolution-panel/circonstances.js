/**
 * Refonte de l'interface, lot E4b (CA15a, CA15b) : circonstances lisibles de la résolution.
 *
 * - `deducedCircumstances(facts)` : ce que l'outil sait déjà (plateau des mêlées, positions, scène, faits du Tour, arme).
 *   Ces circonstances s'affichent en puces actives dans la résolution ; un clic les retire (valeur forcée par le MJ dans le
 *   brouillon), un second clic rend la déduction. Aucune case ne les redemande.
 * - `pertinentCircumstances(facts)` : le panneau « autres… », au plus 12 cases, seulement celles qui s'appliquent à l'action
 *   en cours (mêlée, tir, sort, prière, test), chacune avec un libellé qui dit son effet. Une circonstance déduite n'y figure pas.
 *
 * Les cases qui remplacent une case de la 3.56.0 en reprennent le libellé exact (même nom accessible).
 * Fonctions pures : elles lisent le brouillon et les faits, et rendent le correctif à passer à `handlers.select` — les mêmes
 * champs du brouillon (`charging`, `extraAttack`, `v5Context.*`…) que les cases de la 3.56.0, que le moteur lit déjà.
 */

/** Plafond du panneau « autres… » (CA15a). */
export const MAX_PERTINENT = 12;

/** Type d'action de la résolution → famille de circonstances. */
export function actionKindOf({ type, kind } = {}) {
  if (['cast', 'channelling', 'dispel'].includes(type)) return 'sort';
  if (type === 'prayer') return 'priere';
  if (type === 'attack') return kind === 'ranged' ? 'tir' : 'melee';
  return 'test';
}

/** Clés d'engagement du plateau (spec engagements CA15-CA18) : les retirer rend la déduction du plateau. */
export const ENGAGEMENT_KEYS = ['outnumberAttackerIds', 'outnumberDefenderIds', 'surrounded', 'targetEngaged', 'engagedWithShooter', 'engagedTargetIds', 'shooterEngagedElsewhere', 'engagementForced'];

const ctxOf = facts => facts.draft?.v5Context || {};
const withCtx = (facts, patch) => ({ v5Context: { ...ctxOf(facts), ...patch } });
const withoutKeys = (facts, keys) => { const next = { ...ctxOf(facts) }; for (const key of keys) delete next[key]; return { v5Context: next }; };
const penaltiesPatch = (facts, key, amount) => {
  const penalties = { ...(ctxOf(facts).penalties || {}) };
  if (amount === null) delete penalties[key]; else penalties[key] = amount;
  return withCtx(facts, { penalties });
};

const WEATHER = { fog: 'Brouillard : −1 DR au tir', 'rain-wind': 'Pluie ou vent : −2 DR au tir', extreme: 'Météo extrême : −3 DR au tir' };
const LIGHTING = { fog: 'Faible lumière : −1 DR au tir', dim: 'Pénombre : −1 DR au tir', dark: 'Noir total : −3 DR au tir' };

/**
 * Circonstances déduites (CA15b). `facts` : { type, kind, draft, plateau, scene, turnFacts, knownThrowing }.
 * `plateau` = deriveEngagementContext(…) ; `scene` = deriveSceneContext(…) ; `turnFacts` = Store.getV5TurnFacts(acteur).
 * Retour : [{ id, label, source, active, forced, toggle }] ; `toggle` est le correctif du brouillon (null : non forçable ici).
 */
export function deducedCircumstances(facts = {}) {
  const kind = actionKindOf(facts), ctx = ctxOf(facts), plateau = facts.plateau || {}, scene = facts.scene || {};
  const out = [];
  const recit = ctx.engagementForced === 'recit';
  const backToPlateau = withoutKeys(facts, ENGAGEMENT_KEYS);
  const engagement = (id, label, active, neutral) => out.push({ id, label, source: 'plateau', active: active && !recit, forced: recit,
    toggle: recit ? backToPlateau : withCtx(facts, { ...neutral, engagementForced: 'recit' }) });
  // Une valeur saisie par le MJ dans le brouillon l'emporte sur la scène ou la position (même règle que le moteur).
  const sceneChip = (id, key, label, neutral, source) => {
    const forced = ctx[key] !== undefined && ctx[key] !== scene[key];
    out.push({ id, label, source, active: !forced, forced, toggle: forced ? withoutKeys(facts, [key]) : withCtx(facts, { [key]: neutral }) });
  };
  if (kind === 'melee') {
    const attackers = (plateau.outnumberAttackerIds || []).length, defenders = (plateau.outnumberDefenderIds || []).length;
    const neutral = { outnumberAttackerIds: [], outnumberDefenderIds: [], surrounded: false };
    if (attackers || defenders) engagement('surnombre', `Surnombre ${1 + attackers} contre ${1 + defenders} (plateau)`, true, neutral);
    if (plateau.surrounded === true) engagement('encercle', 'Cible encerclée : +2 DR (plateau)', true, neutral);
    if (scene.height === 'attacker') sceneChip('hauteur', 'height', 'Attaquant plus haut : +1 DR (position)', null, 'position');
    if (scene.height === 'defender') sceneChip('hauteur', 'height', 'Défenseur plus haut : −1 DR (position)', null, 'position');
    if (scene.difficultTerrain === true) sceneChip('terrain', 'difficultTerrain', 'Terrain difficile : −1 DR (scène)', false, 'scène');
    if (scene.narrowSpace === true) sceneChip('exigu', 'narrowSpace', 'Espace exigu : −1 ou −2 DR selon l’allonge (scène)', false, 'scène');
  }
  if (kind === 'tir') {
    const neutral = { targetEngaged: false, engagedWithShooter: false, engagedTargetIds: [], shooterEngagedElsewhere: false };
    if (plateau.targetEngaged === true && plateau.engagedWithShooter !== true && ctx.engagedWithShooter !== true) engagement('engage-tiers', 'Cible engagée avec d’autres : Désavantage au tir (plateau)', true, neutral);
    if (plateau.shooterEngagedElsewhere === true && plateau.engagedWithShooter !== true) engagement('tireur-engage', 'Tireur engagé en mêlée : Pistolet seulement (plateau)', true, neutral);
    if (scene.cover === true) sceneChip('couvert', 'cover', 'Cible à couvert : −1 DR (position)', false, 'position');
    if (scene.weather && WEATHER[scene.weather]) sceneChip('meteo', 'weather', `${WEATHER[scene.weather]} (scène)`, 'normal', 'scène');
    if (scene.lighting && LIGHTING[scene.lighting]) sceneChip('lumiere', 'lighting', `${LIGHTING[scene.lighting]} (scène)`, 'normal', 'scène');
    // Déplacement noté par « Se déplacer » : le moteur l'ajoute de lui-même pour ce Tour (non forçable ici).
    if (facts.turnFacts?.moved === true) out.push({ id: 'deplace', label: 'Tireur déplacé ce Tour : −1 DR (barre d’actions)', source: 'tour', active: true, forced: false, toggle: null });
    if (facts.knownThrowing === true) out.push({ id: 'arme-de-jet', label: 'Arme de jet : dispersion si le tir échoue (arme)', source: 'arme', active: true, forced: false, toggle: null });
  }
  return out;
}

/** Cases du panneau « autres… » : chaque entrée dit son effet ; `when` écarte ce qui ne s'applique pas ou est déjà déduit. */
const OPTIONS = [
  { id: 'charge', kinds: ['melee'], label: 'Charge donnant Élan (distance et conditions vérifiées)',
    get: f => f.draft?.charging === true, set: (f, on) => ({ charging: on }) },
  { id: 'attaque-supplementaire', kinds: ['melee', 'tir'], when: f => !f.draft?.reactionId, label: 'Attaque supplémentaire : payer 1 Élan (une fois par Tour)',
    get: f => f.draft?.extraAttack === true, set: (f, on) => ({ extraAttack: on }) },
  { id: 'main-secondaire', kinds: ['melee', 'tir'], label: 'Attaque avec la main secondaire (−2 DR selon les règles)',
    get: f => Number(ctxOf(f).penalties?.offHand) === -2, set: (f, on) => penaltiesPatch(f, 'offHand', on ? -2 : null) },
  { id: 'sans-defense', kinds: ['melee', 'tir'], when: f => Boolean(f.target), label: 'Cible sans défense : pas de jet de défense (vérifié par le MJ)',
    get: f => ctxOf(f).targetHelpless === true, set: (f, on) => withCtx(f, { targetHelpless: on ? true : undefined }) },
  { id: 'plus-haut', kinds: ['melee'], when: f => !f.scene?.height, label: 'Attaquant plus haut : +1 DR',
    get: f => ctxOf(f).height === 'attacker', set: (f, on) => withCtx(f, { height: on ? 'attacker' : undefined }) },
  { id: 'plus-bas', kinds: ['melee'], when: f => !f.scene?.height, label: 'Défenseur plus haut : −1 DR',
    get: f => ctxOf(f).height === 'defender', set: (f, on) => withCtx(f, { height: on ? 'defender' : undefined }) },
  { id: 'terrain', kinds: ['melee'], when: f => f.scene?.difficultTerrain !== true, label: 'Terrain difficile : −1 DR',
    get: f => ctxOf(f).difficultTerrain === true, set: (f, on) => withCtx(f, { difficultTerrain: on ? true : undefined }) },
  { id: 'exigu', kinds: ['melee'], when: f => f.scene?.narrowSpace !== true, label: 'Espace exigu : −1 ou −2 DR selon l’allonge de l’arme',
    get: f => ctxOf(f).narrowSpace === true, set: (f, on) => withCtx(f, { narrowSpace: on ? true : undefined }) },
  { id: 'couvert', kinds: ['tir'], when: f => f.scene?.cover !== true, label: 'La cible est à couvert ou À Terre (−1 DR, une seule fois)',
    get: f => Number(ctxOf(f).penalties?.cover) < 0 || Number(ctxOf(f).penalties?.targetProne) < 0,
    set: (f, on) => { const penalties = { ...(ctxOf(f).penalties || {}) }; delete penalties.targetProne; if (on) penalties.cover = -1; else delete penalties.cover; return withCtx(f, { penalties }); } },
  { id: 'deplace', kinds: ['tir'], when: f => f.turnFacts?.moved !== true, label: 'Tireur déplacé avant ce tir (−1 DR)',
    get: f => ctxOf(f).movedBeforeRangedAttack === true, set: (f, on) => withCtx(f, { movedBeforeRangedAttack: on }) },
  { id: 'vise', kinds: ['tir'], when: f => f.accurateShot === true, label: 'Visée effectuée : Tir précis donne +2 Dégâts',
    get: f => f.draft?.aimed === true, set: (f, on) => ({ aimed: on }) },
  { id: 'arme-de-jet', kinds: ['tir'], when: f => f.knownThrowing !== true, label: 'Il s’agit d’une arme de jet (dispersion seulement si le tir échoue)',
    get: f => ctxOf(f).throwingWeapon === true, set: (f, on) => withCtx(f, { throwingWeapon: on }) },
  { id: 'penombre', kinds: ['tir'], when: f => !f.scene?.lighting, label: 'Pénombre ou faible lumière : −1 DR au tir',
    get: f => ['dim', 'fog'].includes(ctxOf(f).lighting), set: (f, on) => withCtx(f, { lighting: on ? 'dim' : undefined }) },
  { id: 'pluie', kinds: ['tir'], when: f => !f.scene?.weather, label: 'Pluie ou vent : −2 DR au tir',
    get: f => ctxOf(f).weather === 'rain-wind', set: (f, on) => withCtx(f, { weather: on ? 'rain-wind' : undefined }) },
  { id: 'chance-avantage', kinds: ['melee', 'tir', 'sort', 'test'], label: 'Dépenser 1 Point de Chance pour obtenir Avantage avant le jet',
    get: f => f.draft?.fortuneForAdvantage === true, set: (f, on) => ({ fortuneForAdvantage: on }),
    disabled: f => f.draft?.preview != null || (f.draft?.attackRoll !== undefined && f.draft?.attackRoll !== null && String(f.draft.attackRoll).trim() !== '') },
  { id: 'chance-relance', kinds: ['melee', 'tir', 'sort', 'test'], label: 'Relancer ce Test avec 1 Point de Chance',
    get: f => f.draft?.fortuneReroll === true, set: (f, on) => ({ fortuneReroll: on }) }
];

/**
 * Panneau « autres… » (CA15a) : [{ id, label, checked, disabled, set(on) → correctif }], au plus 12, dans l'ordre du catalogue.
 */
export function pertinentCircumstances(facts = {}) {
  const kind = actionKindOf(facts);
  const deduced = new Set(deducedCircumstances(facts).map(row => row.id));
  return OPTIONS
    .filter(option => option.kinds.includes(kind) && !deduced.has(option.id) && (!option.when || option.when(facts)))
    .slice(0, MAX_PERTINENT)
    .map(option => ({ id: option.id, label: option.label, checked: option.get(facts), disabled: option.disabled?.(facts) === true, set: on => option.set(facts, on) }));
}

/** Toutes les cases du catalogue (pour les tests) : identifiant, familles, libellé. */
export function circumstanceCatalog() {
  return OPTIONS.map(({ id, kinds, label }) => ({ id, kinds: [...kinds], label }));
}
