/**
 * Clauses de sorts que le moteur ne calcule pas : chaque drapeau écrit par un contrat (`contract.effects`) y a son rappel chiffré,
 * affiché à l'exécution du sort. Un drapeau absent d'ici doit être lu par le moteur : le test « tout drapeau écrit est lu »
 * (tests/lot3-v5-engine-socle.test.js) échoue sinon. Sources : V5 pp. 242-255, WoM pp. 20-23 et sorts, HEPG pp. 80-89.
 */
const signed = value => (Number(value) > 0 ? '+' : '') + value;

export const REMINDER_FLAGS = Object.freeze({
  aoeMaximum: () => 'Zone plafonnée par la portée : aucune extension générique de zone.',
  conditionalMJFacts: () => 'Rebonds conditionnels : ordre, cible la plus proche et distances explicitement déclarés par le MJ.',
  grapplingFloor: () => 'Les empoignades du lanceur réussissent automatiquement : un échec compte pour +0 DR (WoM p. 124).',
  opposedTest: value => typeof value==='object'?'Test opposé de Force Mentale : deux dés explicites, égalité au lanceur.':`Test opposé ${value} (à jouer par le MJ).`,
  talents: value => `Talents accordés pour la durée (non évalués par le moteur) : ${[].concat(value).join(', ')}.`,
  maxPerTarget: value => `Au plus ${value} par cible.`,
  dispelBonusSlFormula: (value, { bfm }) => `+${value === 'BFM' ? bfm : value} DR aux seuls Tests de dissipation du lanceur (Bonus de Force Mentale), jamais à l’incantation.`,
  removeBrokenAmount: value => `Retire ${String(value).replace('SL', 'DR')} états Brisé.`,
  entangledStrength: value => `Enchevêtré de Force ${value} : l’état n’a pas de Force propre dans l’outil ; s’en défaire demande un Test de Force opposé à cette Force ${value}.`,
});

/** Rappels des drapeaux présents dans un contrat (au premier niveau de `effects` et dans `healing`, `summon`, `mjInput`). */
export function reminderFlagTexts(contract, caster) {
  const effects = contract?.effects || {};
  const bfm = Math.floor((Number(caster?.caracs?.FM) || 0) / 10);
  const texts = [];
  for (const [key, value] of Object.entries({ ...(effects.healing || {}), ...(effects.summon || {}), ...(effects.mjInput || {}), ...effects })) {
    if (REMINDER_FLAGS[key] && value !== false && value != null) texts.push(REMINDER_FLAGS[key](value, { contract, bfm }));
  }
  return texts;
}

/**
 * États spéciaux (`extensions.v5.specialStates`) écrits à l'application d'un sort pour garder la trace de l'effet : aucune règle
 * moteur ne les lit, la règle est rappelée par les traits de la couche d'effet et par les rappels du contrat.
 */
export const MARKER_ONLY_SPECIAL_STATES = Object.freeze([
  'fickleFingers', 'firstPortent', 'secondPortent', 'thirdPortent', 'casterLosesFateIfUsed',
  'cannotUseFortune', 'arrowAttraction', 'lockedTarget', 'glamourOfTeclis', 'amberTrance',
  'beastMaster', 'controlledBy', 'spiralStaircase', 'phasProtection', 'clarityOfThought',
  'ignoreMentalAndFatiguePenalties', 'ignoreMentalPenalties', 'ignoreFatiguePenalties', 'ignoreHeadCriticalPenalties', 'vegetalEnchantment',
  'magicalAlarm', 'mindMask', 'bodyPurification', 'poisonPurged', 'comfortZone',
  'revealMagic', 'sanctifiedGround', 'swiftPassing', 'arrowShield', 'droppedItem',
  'magicShield', 'rotArmour', 'hornOfAndar', 'dropEngagement', 'tasteOfFireLiquid',
  'createdItem', 'liquidCreated', 'flammableOil', 'cholericMode', 'inextinguishableFlameMode',
  'divinationMode', 'restoredMetalMode', 'silenceMode', 'silenced', 'calmed',
  'removedPsychology',
  // Reçus des Arcanes/mineurs (V5 pp. 240–245) : quantités et géométrie jouées par le MJ, aucun compteur de fiche.
  'suffocating','lineOfSightBlocked','sleeping','assistedReminder','quantifiedReminder',
  'corrosiveBloodMode','flyRange','rotReceipt','conjuredWeapon',
  'visibleMagic','suppressionReceipt','suppressedObjectId',
  // Clauses de fiction et marqueurs ; les effets typés/Tests/interactions associés sont mesurés séparément.
  "purging", "preventsInfection", "firewall", "mayTestFrenzy", "summonedAttack", "objectMelted", "metalIsGold", "itemQualityChanges", "malleableMetal", "trance", "cannotMove", "controlledByCaster", "speakWithAnimals", "beastSpeechOnly", "mountTest", "lifebloom", "needNotBreathe", "forestOfThorns", "corpseServant", "oakTree", "grappleStrength", "corruptionImmune", "hostileEntryBlocked", "pit", "snare", "purified", "understandLanguages", "seeThroughObscurity", "cannotHide", "mindReadingCastingPenaltySl", "exposureImmune", "coma", "cannotAct", "crystalMaze", "undeadBoundary", "actionBeforeDeath", "magicAuraHidden", "teleport", "animalTrust", "sounds", "objectToHand", "marshLights", "palmFlame", "illumination", "organicGroundUnharmed", "waterSpring", "distantHearing", "danceRequired", "disguise", "illusion", "memoryOfCasterHidden", "shadowsteed", "invisible", "immaterial", "shadowSensor", "underground"
]);
