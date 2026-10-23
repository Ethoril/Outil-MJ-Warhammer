/**
 * Dispositions des capacités propres de profil (lot T12) : Imperial Zoo, Lustria et compléments L18-L26.
 *   node tools/build-creature-abilities.mjs
 * Lit docs/BESTIAIRE_INVENTAIRE.json et écrit js/data/creature-abilities.js (idempotent). Chaque capacité du périmètre est soit prise en
 * charge par un lot de Traits (T1 à T11), soit un rappel dont le motif est consigné par entrée.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const inScope = n => (n >= 96 && n <= 161) || (n >= 173 && n <= 205) || (n >= 250 && n <= 288);

// Capacités déjà couvertes par un lot de Traits (même règle, mêmes services).
const COVERED = {
  'T1 Bouclier': [287],
  'T2 Souffle': [108, 250, 252],
  'T2 Vomissement': [123, 125],
  'T2 Hurlement': [260],
  'T2 Attaques gratuites': [113, 262],
  'T2 Armes naturelles V4': [288],
  'T3 Venin': [135, 153, 156, 183],
  'T3 Nuée': [144],
  'T3 Instable': [147],
  'T3 Déclencheurs de mort': [253, 256, 259, 269, 286],
  'T4 Fouissage': [105],
  'T4 Respiration aquatique': [150, 152],
  'T4 Créature marine': [272],
  'T4 Aquatique': [276],
  'T5 Sens vibratoires': [142],
  'T6 Haine': [96],
  'T6 Frénésie': [138, 146, 154, 191],
  'T6 Rage': [140],
  'T7 Marques du Chaos': [267, 268],
  'T7 Dressé': [195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205]
};
const COVERED_BY = new Map(Object.entries(COVERED).flatMap(([by, ids]) => ids.map(id => [id, by])));

// Motif du rappel, par famille de mécanique (première famille reconnue).
const MOTIVES = [
  [['weaponQuality', 'weaponQualities', 'weaponFlaw', 'armorQuality', 'ignoreAP', 'armorMaterial', 'hitLocation'],
    'Qualité ou défaut d\'arme ou d\'armure propre au profil : lu sur l\'attaque imprimée, ajouter une seconde fois fausserait le profil importé tel qu\'imprimé.'],
  [['surprise', 'surpriseImmunity', 'surprisedTrigger', 'outnumbering', 'reverseDice', 'terrainMJ'],
    'Dépend du surnombre, de la Surprise ou du terrain : le moteur n\'arbitre pas ces situations de scène, décision du MJ.'],
  [['charge', 'advantage', 'virtualAdvantage', 'freeAttack', 'freeAttacks', 'costException', 'turnBudget'],
    'Modifie un coût d\'Élan ou une attaque gratuite hors des attaques gratuites automatisées : suivi à la main, sans règle de coût propre dans le moteur.'],
  [['psychology', 'psychologyDifficulty', 'psychologyException', 'terrorException', 'broken', 'brokenTest', 'fear', 'commander', 'friendlyFire', 'traitSuppression'],
    'Exception ou difficulté de Psychologie propre au profil : les décisions de Peur, Terreur et fuite restent au MJ (arbitrage C0).'],
  [['entangled', 'grapple', 'engulf', 'digestion', 'periodicWounds', 'periodicAttack', 'entangledGate', 'drain', 'escapeDamageThreshold', 'threshold'],
    'Entrave, empoignade ou engloutissement à effet périodique : l\'état est géré par le MJ, aucune durée ni extraction n\'est tirée par le moteur.'],
  [['stunned', 'poison', 'poisonLink', 'bleeding', 'disease', 'diseaseSymptom', 'ablaze', 'conditionLink', 'noDamage', 'startTurn', 'deafened', 'poisoned', 'poisonMultiplier', 'venom'],
    'Condition appliquée sous un test propre (Sonné, Empoisonné, Hémorragique, Enflammé, maladie) : le test et la durée sont rappelés, la condition se pose à la main.'],
  [['sound', 'aura', 'zone', 'nonStacking', 'firstExposure', 'species', 'speciesFilter', 'illusion', 'immunityQuota', 'detection', 'detectionMJ', 'scentMJ', 'stealth', 'duration'],
    'Aura, zone ou filtre d\'espèces : la portée et les cibles concernées se décident en scène, le moteur ne cartographie pas les distances.'],
  [['shapechange', 'copyTraits', 'fullMoon', 'willpowerTest', 'aspects', 'armourTrait', 'reconstitution'],
    'Changement de forme : le profil de destination et ses valeurs se choisissent à la main, le moteur ne recompose pas un participant.'],
  [['spell', 'miracle', 'overcast', 'pooledCasting', 'magicAura', 'castingModifier', 'castingBonus', 'consumable', 'magicImmunity', 'elemental', 'animalCharm', 'marineOnly', 'miracleAnalogy', 'magicEnvironment'],
    'Effet de magie propre à la créature : sorts et miracles se jouent par leurs services, cette variante n\'a pas de contrat et reste un rappel.'],
  [['fortune', 'fortuneLock', 'expiry', 'profileMJ', 'profileSpecific', 'factsMJ', 'movementMJ', 'controlMJ', 'triggerMJ', 'mjDiscretion', 'shipMood', 'socialModifier', 'd10Table', 'retest', 'opposition', 'command', 'commandTest', 'training', 'campaignTime', 'tracking', 'pursuit'],
    'Dépend d\'un fait de scène ou d\'une décision narrative du MJ (état d\'esprit, humeur, ordre donné, durée de campagne) que le moteur ne peut pas lire.'],
  [['damage', 'damageReduction', 'deathException', 'fireException', 'characteristicSubstitution', 'retaliation', 'minimumDamage', 'endRound', 'areaDamage', 'criticalModifier', 'criticalChoice', 'criticalQuota', 'criticalLocation', 'health', 'collision', 'quota', 'size'],
    'Dégât, réduction ou critique spécial hors du calcul de dégâts ordinaire : le moteur n\'a pas de règle de substitution pour cette variante.'],
  [['ranged', 'ammo', 'artillery', 'platform', 'breath', 'breathCost', 'secondaryTest', 'trait', 'breathing', 'movement', 'aquatic', 'suffocation', 'testPenalty', 'movementRestriction', 'momentumFloor', 'groupPool', 'stationary', 'mount', 'traitAddition', 'handlingTest', 'gearRestriction', 'unstable', 'enduranceTest', 'corruption', 'frenzy', 'trigger', 'redirect', 'hatred', 'web', 'unconscious', 'deathTrigger', 'summon', 'replacement', 'noDamage', 'd10', 'naturalWeapon', 'printedDamage', 'armour', 'opposedBonus', 'markOfChaos', 'mutation', 'animosity', 'talentAccess', 'swarm', 'training']
    , 'Règle de profil sans équivalent chiffré dans le moteur (tir spécial, monture, terrain, plateforme) : rappelée sur la fiche, jouée par le MJ.']
];
const DEFAULT_MOTIVE = 'Règle de profil sans équivalent chiffré dans le moteur : rappelée sur la fiche, jouée par le MJ.';

const motiveOf = mechanic => {
  const list = Array.isArray(mechanic) ? mechanic : [];
  for (const [keys, motive] of MOTIVES) if (list.some(key => keys.includes(key))) return motive;
  return DEFAULT_MOTIVE;
};

const inventory = JSON.parse(readFileSync(new URL('../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8'));
const entries = inventory.traits
  .filter(trait => inScope(Number(trait.id.slice(5))))
  .map(trait => {
    const by = COVERED_BY.get(Number(trait.id.slice(5)));
    const base = { id: trait.id, book: trait.book, name: trait.name, summaryFr: trait.summaryFr };
    return by ? { ...base, status: 'covered', by } : { ...base, status: 'reminder', motive: motiveOf(trait.mechanic) };
  });

const text = `// Dispositions des capacités propres de profil (lot T12). Fichier généré par tools/build-creature-abilities.mjs : ne pas modifier à la main.
export const CREATURE_ABILITIES = Object.freeze(${JSON.stringify(entries, null, 2)}.map(entry => Object.freeze(entry)));
`;
writeFileSync(new URL('../js/data/creature-abilities.js', import.meta.url), text, 'utf8');
console.log(`${entries.length} capacités (${entries.filter(entry => entry.status === 'covered').length} couvertes)`);
