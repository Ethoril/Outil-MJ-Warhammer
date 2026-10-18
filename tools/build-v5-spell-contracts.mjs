import {ELVEN_SPELL_CONFIG} from './v5-elven-spell-contracts.mjs';
import {ARCANE_WEAPON_PROFILES} from '../js/core/equipment.js';
import fs from 'node:fs';
import { OVERCAST_SPECIFIC } from './v5-overcast-specific.mjs';
import {measurePeriodicSpellOutcome} from './spell-coverage-probe.mjs';
import {getV5Fate,getV5Fortune} from '../js/core/v5-resources.js';
import {previewSpellInteraction} from '../js/core/v5-magic-turn.js';

const audit = JSON.parse(fs.readFileSync('docs/lot3/LOT3_AUDIT_SORTS.json', 'utf8'));
for(const item of audit.items)if(item.name==='empête'){item.name='Tempête';if(item.source?.canonical)item.source.canonical.name='Tempête';}
const catalogueSnapshot = JSON.parse(fs.readFileSync('js/data/reference-snapshot.json', 'utf8'));
const catalogueNameKey = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const catalogueDescriptions = new Map(catalogueSnapshot.magic.spells.map(s=>[catalogueNameKey(s.nom),s.desc]));
const readableReminder = text => String(text).replaceAll('WoM','__WOM__').replace(/([a-zà-ÿ])([A-ZÀ-Þ])/gu,'$1 $2').replace(/([A-ZÀ-Þ]{2,})([A-ZÀ-Þ][a-zà-ÿ])/gu,'$1 $2').replace(/([a-zà-ÿ])([0-9])/gu,(_,a,b,i,s)=>a==='d'&&(i===0||/[^a-zà-ÿ]/u.test(s[i-1]))?a+b:a+' '+b).replace(/([0-9])([a-zà-ÿ])/gu,(_,a,b)=>b==='d'?a+b:a+' '+b).replace(/([a-zà-ÿ])(?=[+−–-]\d|\{)/gu,'$1 ').replace(/\s*×\s*/gu,' × ').replaceAll('__WOM__','WoM');
function readableEffectLabels(value){
 if(!value || typeof value!=='object')return;
 if(typeof value.label==='string')value.label=readableReminder(value.label);
 if(Array.isArray(value.options))value.options=value.options.map(option=>Array.isArray(option)&&typeof option[1]==='string'?[option[0],readableReminder(option[1]),...option.slice(2)]:option);
 for(const child of Object.values(value))if(child&&typeof child==='object')readableEffectLabels(child);
}

console.log(`Extraction de ${audit.items.length} contrats depuis l’audit.`);

function extractElvenWinds(name) {
  const match = name.match(/\((.*?)\)/);
  if (match) {
    const parts = match[1].split('&').map(s => s.trim());
    if (parts.length === 2) return parts;
  }
  return null;
}

// Map des domaines vers identifiants et vents
const DOMAIN_MAP = {
  'Aqshy - Rouge - Domaine du Feu': { domain: 'fire', wind: 'Aqshy' },
  'Azyr - Bleu - Domaine des Cieux': { domain: 'heavens', wind: 'Azyr' },
  'Chamon - Jaune - Domaine du Métal': { domain: 'metal', wind: 'Chamon' },
  'Ghur - Ambre - Domaine de la Bête': { domain: 'beasts', wind: 'Ghur' },
  'Ghyran - Jade - Domaine de la Vie': { domain: 'life', wind: 'Ghyran' },
  'Hysh - Blanc - Domaine de la Lumière': { domain: 'light', wind: 'Hysh' },
  'Shyish - Pourpre - Domaine de la Mort': { domain: 'death', wind: 'Shyish' },
  "Uglu - Gris - Domaine de l'Ombre": { domain: 'shadow', wind: 'Ulgu' },
  "Sort d'Arcane": { domain: 'arcane', wind: null },
  'Sort Mineur': { domain: 'petty', wind: null },
  'Domaine de Haute Magie': { domain: 'high', wind: 'Qhaysh' },
  'Magie Elfique Arcanique': { domain: 'elven-arcane', wind: null }, // Rempli dynamiquement
  'Petite Magie Elfique': { domain: 'elven-petty', wind: null }
};

// Map des 5 paires de doublons du livre V5
const DUPLICATE_PAIRS = [
  // 1. Incarnation <-> Forme Sauvage de Wyssan
  ['spell-audit-27b7eb34ac74692cfbef', 'spell-audit-be7e195d8c5087da6b38'],
  // 2. Vol du Destin <-> Nuée Funeste
  ['spell-audit-ee1752bbac18ba560cc0', 'spell-audit-5eae06fb766c99529fa2'],
  // 3. Don de Vie <-> Floraison de vie
  ['spell-audit-164df4985bcd9ab74191', 'spell-audit-dfbec341458fa72c77ef'],
  // 4. Pensée rapide <-> Vitesse de pensée
  ['spell-audit-c23f44072985d55e1a65', 'spell-audit-f27b9c69f07b55bf35e9'],
  // 5. Portail d’Ombre <-> Pas d’Ombre
  ['spell-audit-fc2c279c18eedda14a9b', 'spell-audit-580f27a6663cd13507ad']
];

const sharedWithMap = new Map();
for (const [idA, idB] of DUPLICATE_PAIRS) {
  sharedWithMap.set(idA, idB);
  sharedWithMap.set(idB, idA);
}
// Forme bestiale <-> Forme bestiale - Jade
sharedWithMap.set('spell-audit-4bfcce9bbf0b40106247', 'spell-audit-44d3e9b3a2c7a6e5cef2');
sharedWithMap.set('spell-audit-44d3e9b3a2c7a6e5cef2', 'spell-audit-4bfcce9bbf0b40106247');

// Dictionnaire des définitions d'effets spécifiques par nom canonique, nom français ou id
const SPELL_EFFECTS_CONFIG = {
  // === SORT MINEUR (CN 0) ===
  'Shock': {
    type: 'magic-missile',
    missile: { damage: 0 },
    conditions: ['Sonné']
  },
  'Dart': {
    type: 'magic-missile',
    missile: { damage: 0 }
  },
  'Fléchette': {
    type: 'magic-missile',
    missile: { damage: 0 }
  },
  'Fléchette (Dart)': {
    type: 'magic-missile',
    missile: { damage: 0 }
  },
  'Twitch': {
    type: 'special',
    special: 'twitch'
  },
  'Sleep': {
    type: 'condition',
    conditions: ['Inconscient']
  },
  'Dazzle': {
    type: 'condition',
    conditions: ['Aveuglé']
  },
  'Careful Step': {
    type: 'test-modifiers',
    testModifiers: { 'Pistage adverse': -3 },
    special: 'careful-step'
  },
  'Pas léger': {
    type: 'test-modifiers',
    testModifiers: { 'Pistage adverse': -3 },
    special: 'careful-step'
  },
  'Produce Small Animal': {
    type: 'special',
    special: 'summon-small-animal'
  },
  'Rot': {
    type: 'special',
    special: 'rot-armour'
  },

  // === SORT D'ARCANE ===
  'Aethyric Arms': {
    type: 'special',
    special: 'aethyric-arms',
    weaponDamageBonus: 3
  },
  'Aethyric Armour': {
    type: 'armor',
    apModifiers: { all: 2 }
  },
  'Bolt': {
    type: 'magic-missile',
    missile: { damage: 4 }
  },
  'Blast': {
    type: 'magic-missile',
    missile: { damage: 3 },
    aoe: true
  },
  'Explosion': {
    type: 'magic-missile',
    missile: { damage: 3 },
    aoe: true
  },
  'Explosion (Blast)': {
    type: 'magic-missile',
    missile: { damage: 3 },
    aoe: true
  },
  // V5 p. 243 : les projectiles organiques entrant dans la zone sont détruits sans dégâts (aucun jet) ; les autres projectiles passent.
  'Arrow Shield': {
    type: 'special',
    special: 'arrow-shield',
    ward: 1,
    wardFilter: { all: ['ranged', 'organicProjectile', 'external'] }
  },
  'Magic Shield': {
    type: 'special',
    special: 'magic-shield',
    dispelBonusSlFormula: 'BFM'
  },
  'Drop': {
    type: 'special',
    special: 'drop-item'
  },
  'Fearsome': {
    type: 'traits',
    traits: ['Peur (1)']
  },
  'Terrifying': {
    type: 'traits',
    traits: ['Terreur (1)']
  },
  'Flight': {
    type: 'traits',
    traits: ['Vol (4)']
  },
  'Ward': {
    type: 'ward',
    ward: 7
  },
  'Breath': {
    type: 'magic-missile',
    missile: { damage: 4 },
    aoe: true
  },
  'Entangle': {
    type: 'condition',
    conditions: ['Enchevêtré']
  },
  'Distracting': {
    type: 'traits',
    traits: ['Perturbant']
  },
  'Corrosive Blood': {
    type: 'traits',
    traits: ['Sang corrosif']
  },
  'Dark Vision': {
    type: 'traits',
    traits: ['Vision dans le noir']
  },

  // === AQSHY (FEU) ===
  // V5 p. 248 : Protection 7+ contre le feu magique seulement ; immunité aux dégâts de feu non magique et aux États Enflammé reçus.
  'Aqshy’s Aegis': {
    type: 'ward',
    ward: 7,
    wardFilter: { all: ['magical', 'fire'] },
    immunities: {
      damage: [{ filter: { all: ['fire'], not: ['magical'] }, label: 'Feu non magique' }],
      conditions: ['Enflammé']
    }
  },
  'Cauterise': {
    type: 'healing',
    healing: { amount: 1 },
    removeConditions: ['Hémorragique']
  },
  'Crown of Flame': {
    type: 'traits',
    traits: ['Peur (1)']
  },
  'Firewall': {
    type: 'special',
    special: 'firewall',
    missile: { damage: 8 },
    conditions: ['Enflammé']
  },
  'Flaming Hearts': {
    type: 'special',
    special: 'flaming-hearts',
    removeConditions: ['Brisé', 'Exténué']
  },
  'Flaming Sword of Rhuin': {
    type: 'special',
    special: 'flaming-sword',
    weaponDamageBonus: 6,
    weaponHitConditions: ['Enflammé'],
    // V5 p. 248 : le porteur sans Magie des Arcanes (Feu) qui fait une maladresse avec l'épée gagne Enflammé.
    weaponFumbleCondition: { name: 'Enflammé', exceptLore: 'fire' }
  },
  'Great Fires of U’Zhul': {
    type: 'magic-missile',
    missile: { damage: 10, ignoreAp: true },
    aoe: true,
    conditions: ['Enflammé']
  },
  'Purge': {
    type: 'condition',
    conditions: ['Enflammé']
  },

  // === AZYR (CIEUX) ===
  // V5 p. 249 : +3 PA à toutes les Localisations contre les armes en métal ; l'attaquant de mêlée en métal subit 6 Dégâts au bras qui frappe.
  'Cerulean Shield': {
    type: 'armor',
    conditionalAp: { ap: 3, filter: { all: ['metal'] } },
    reflect: { filter: { all: ['metal', 'melee'] }, damage: 6, summary: 'Bouclier céruléen : l’attaquant subit 6 Dégâts au bras qui frappe (arme de mêlée en métal) — à appliquer par le MJ.' }
  },
  // V5 p. 249 : projectile magique +18 (BFM + 18), sans ajout des DR ; Enflammé 1 et À Terre.
  'Comet of Casandora': {
    type: 'damage',
    damage: { formula: 'BFM + 18', raw: 18, magicMissile: true },
    conditions: ['Enflammé', 'À Terre'],
    aoe: true
  },
  'Fate’s Fickle Fingers': {
    type: 'special',
    special: 'fickle-fingers'
  },
  'The First Portent of Amul': {
    type: 'special',
    special: 'first-portent',
    fortunePoints: 1,
    overcastFortunePer2Sl: 1
  },
  'The Second Portent of Amul': {
    type: 'special',
    special: 'second-portent',
    fortunePoints: 3,
    overcastFortunePer2Sl: 1
  },
  'The Third Portent of Amul': {
    type: 'special',
    special: 'third-portent',
    fatePoints: 1
  },
  'Starcrossed': {
    type: 'special',
    special: 'starcrossed'
  },

  // === CHAMON (MÉTAL) ===
  'Feather of Lead': {
    type: 'stat-modifiers',
    statModifiers: { M: -2 }
  },
  'Transmutation of Chamon': {
    type: 'magic-missile',
    missile: { damage: 9, ignoreBe: true, ignoreAp: true },
    conditions: ['Exténué']
  },
  'Crucible of Chamon': {
    type: 'magic-missile',
    missile: { damage: 6, ignoreAp: true }
  },
  'Enchant Weapon': {
    type: 'special',
    special: 'enchant-weapon',
    weaponDamageBonus: 2
  },
  'Fool’s Gold': {
    type: 'special',
    special: 'fools-gold'
  },
  'Forge of Chamon': {
    type: 'special',
    special: 'forge-of-chamon'
  },
  'Glittering Robe': {
    type: 'armor',
    apModifiers: { all: 2 },
    conditions: ['Aveuglé']
  },
  'Mutable Metal': {
    type: 'special',
    special: 'mutable-metal'
  },

  // === GHUR (BÊTES) ===
  'Beast Form': {
    type: 'transformation',
    special: 'beast-form'
  },
  'Wyssan’s Wildform': {
    type: 'stat-modifiers',
    statModifiers: { M: 1, F: 30, E: 30 },
    traits: ['Belliqueux', 'Morsure (BF+1)', 'Peur (1)', 'Frénésie', 'Magique', 'Foulée (Forêts)']
  },
  'Flock of Doom': {
    type: 'damage',
    damage: { formula: '7', location: 'HEAD' },
    conditions: ['Aveuglé']
  },
  'Amber Talons': {
    type: 'special',
    special: 'amber-talons',
    weaponDamageBonus: 4,
    traits: ['Magique']
  },
  'Beast Master': {
    type: 'special',
    special: 'beast-master'
  },
  'Beast Tongue': {
    type: 'special',
    special: 'beast-tongue'
  },
  'Hunter’s Hide': {
    type: 'stat-modifiers',
    statModifiers: { E: 20 },
    traits: ['Vision dans le noir', 'Peur (1)', 'Foulée (Forêts)'],
    talents: ['Sens aiguisé (Odorat)']
  },
  'Peau du Chasseur': {
    type: 'stat-modifiers',
    statModifiers: { E: 20 },
    traits: ['Vision dans le noir', 'Peur (1)', 'Foulée (Forêts)'],
    talents: ['Sens aiguisé (Odorat)']
  },
  'The Amber Spear': {
    type: 'magic-missile',
    missile: { damage: 8 }
  },

  // === GHYRAN (VIE) ===
  'Barkskin': {
    type: 'stat-modifiers',
    statModifiers: { E: 20, Ag: -10, Dex: -10 },
    apModifiers: { all: 1 }
  },
  'Écorce': {
    type: 'stat-modifiers',
    statModifiers: { E: 20, Ag: -10, Dex: -10 },
    apModifiers: { all: 1 }
  },
  'Earthblood': {
    type: 'healing',
    healing: { amountFormula: 'BFM' }
  },
  'Earthpool': {
    type: 'healing',
    healing: { amount: 4 }
  },
  'Fare of the Land': {
    type: 'narrative',
    special: 'fare-of-the-land'
  },
  'Forest of Thorns': {
    type: 'special',
    special: 'forest-of-thorns',
    missile: { damage: 4 },
    conditions: ['Enchevêtré', 'Hémorragique']
  },
  'Lie of the Land': {
    type: 'narrative',
    special: 'lie-of-the-land'
  },
  'Lifebloom': {
    type: 'healing',
    healing: { amount: 4, cureDisease: true }
  },
  'Regenerate': {
    type: 'traits',
    traits: ['Régénération']
  },

  // === HYSH (LUMIÈRE) ===
  'Banishment': {
    type: 'damage',
    damage: { formula: '10 + DR', daemonBonus: 10, undeadBonus: 10 },
    aoe: true
  },
  'Blinding Light': {
    type: 'condition',
    engagedEnemyConditions: ['Aveuglé', 'Aveuglé', 'Aveuglé'],
    // V5 p. 251 : les créatures qui possèdent la Magie des Arcanes (Lumière) y sont immunisées.
    engagedEnemyImmuneLore: 'light',
    aoeMaximum: true
  },
  'Clarity of Thought': {
    type: 'special',
    special: 'clarity-of-thought',
    ignoreMentalPenalties: true,
    ignoreFatiguePenalties: true,
    ignoreHeadCriticalPenalties: true
  },
  'Daemonbane': {
    type: 'special',
    special: 'daemonbane'
  },
  'Healing Light': {
    type: 'healing',
    healing: { amountFormula: 'BI' },
    removeConditions: ['Hémorragique']
  },
  'Net of Amyntok': {
    type: 'condition',
    conditions: ['Enchevêtré']
  },
  'Phâ’s Protection': {
    type: 'special',
    special: 'phas-protection'
  },
  'Speed of Thought': {
    type: 'stat-modifiers',
    statModifiers: { Int: 20, I: 20 }
  },

  // === SHYISH (MORT) ===
  // V5 p. 247 : projectile magique +6 qui ignore BE et PA.
  'Caress of Laniph': {
    type: 'damage',
    damage: { formula: 'BFM + 6', raw: 6, ignoreBe: true, ignoreAp: true, isContact: true, permanentMaxHpReduction: true, magicMissile: true }
  },
  'Dying Words': {
    type: 'narrative',
    special: 'dying-words'
  },
  'Purple Pall of Shyish': {
    type: 'armor',
    apModifiers: { all: 1 },
    traits: ['Peur (1)'],
    aoe: true
  },
  'Voile Pourpre de Shyish': {
    type: 'armor',
    apModifiers: { all: 1 },
    traits: ['Peur (1)'],
    aoe: true
  },
  'Sanctify': {
    type: 'special',
    special: 'sanctify'
  },
  'Scythe of Shyish': {
    type: 'special',
    special: 'scythe-of-shyish'
  },
  // V5 p. 247 : projectile +8 qui ignore BE et PA, Morts-vivants seulement ; +1 Brisé à tous les ciblés.
  'Soul Vortex': {
    type: 'damage',
    damage: { formula: 'BFM + 8', raw: 8, undeadOnly: true, ignoreBe: true, ignoreAp: true, magicMissile: true },
    conditions: ['Brisé'],
    aoe: true
  },
  // V5 p. 247 : projectile +6 qui ignore les PA ; soin de 1 Blessure par 2 infligées.
  'Steal Life': {
    type: 'damage',
    damage: { formula: 'BFM + 6', raw: 6, ignoreAp: true, lifeStealRatio: 0.5, magicMissile: true }
  },
  'Swift Passing': {
    type: 'special',
    special: 'swift-passing'
  },

  // === ULGU (OMBRES) ===
  'Choking Shadows': {
    type: 'condition',
    conditions: ['Exténué'],
    special: 'choking-shadows'
  },
  'Doppelganger': {
    type: 'special',
    special: 'doppelganger'
  },
  'Illusion': {
    type: 'special',
    special: 'illusion'
  },
  'Mindslip': {
    type: 'special',
    special: 'mindslip'
  },
  'Mystifying Miasma': {
    type: 'condition',
    conditions: ['Aveuglé', 'Assourdi', 'Exténué'],
    aoe: true,
    special: 'mystifying-miasma'
  },
  'Miasme mystifiant': {
    type: 'condition',
    conditions: ['Aveuglé', 'Assourdi', 'Exténué'],
    aoe: true,
    special: 'mystifying-miasma'
  },
  'Shadowsteed': {
    type: 'special',
    special: 'shadowsteed'
  },
  'Shadowstep': {
    type: 'special',
    special: 'shadowstep',
    engagedEnemyConditions: ['Surpris']
  },
  'Shroud of Invisibility': {
    type: 'special',
    special: 'invisibility'
  },

  // =========================================================================
  // === SUPPLÉMENT ELFE : 16 HAUTE MAGIE, 8 ARCANES ELFIQUES, 6 PETITE MAGIE ===
  // =========================================================================
  'Apothéose': {
    type: 'healing',
    healing: { amountFormula: 'BFM' },
    traits: ['Peur (1)'], // HEPG p. 86 : la cible gagne Peur 1 (elle ne perd ni Peur ni Terreur)
    special: 'apotheose'
  },
  'Destruction des Arcanes': {
    type: 'special',
    special: 'arcane-unforgiving',
    // Coûts, Tests et réductions : portés par v5-magic-arcane-unforgiving.js (HEPG p. 86).
    damageFromTotalWornAp: true,
    ignoreAp: true
  },
  // HEPG p. 86 : Vol (Agilité) et 5 PA à toutes les Localisations, non cumulés avec l'armure portée ; aucun projectile.
  'Coruscation de Finreir': {
    type: 'armor',
    apFloor: { all: 5 },
    traits: ['Vol (Agilité)']
  },
  'Malédiction d\'Attraction des Flèches': {
    type: 'special',
    special: 'arrow-attraction',
    missileHitBonusSl: 2
  },
  'Impasse': {
    type: 'special',
    special: 'deadlock',
    blockMagic: true
  },
  'Drain de Magie': {
    type: 'special',
    special: 'drain-magic',
    dispelAoE: true,
    emptyReserves: true
  },
  'Convocation Ardente': {
    type: 'damage',
    damage: { formula: 'BFM + 5', raw: 5, magicMissile: true },
    conditions: ['Enflammé'],
    aoe: true,
    special: 'fiery-convocation'
  },
  'La Fortune est Capricieuse': {
    type: 'special',
    special: 'fortune-is-fickle',
    forceFumbleOnDoubles: true,
    forbidCrits: true,
    forbidMitigation: true
  },
  'Glamour de Teclis': {
    type: 'special',
    special: 'glamour-of-teclis',
    navigationPenaltySl: -3,
    failureThreshold: 3
  },
  'Bannissement Majeur': {
    type: 'damage',
    damage: { formula: '14 + DR', raw: 14, daemonBonus: 14, undeadBonus: 14, doubleOnUnstable: true },
    special: 'major-banishment',
    freeMultipleDispels: true,
    aoe: true
  },
  'Main de Gloire': {
    type: 'special',
    special: 'hand-of-glory'
  },
  'Œil Invisible': {
    type: 'summon',
    special: 'invisible-eye',
    summon: { name: 'Œil Invisible', hp: 3, sensor: true, trance: true }
  },
  'Bouclier de Saphery': {
    type: 'ward',
    ward: 9,
    special: 'shield-of-saphery'
  },
  'Extinction de l\'Âme': {
    type: 'magic-missile',
    missile: { damage: 9 },
    special: 'soul-quench',
    aoe: true
  },
  'Tempête': {
    type: 'vortex',
    special: 'tempete',
    statModifiers: { CC: -20, CT: -20 },
    rangedTestsPenaltySl: -3,
    flightDamageBonus: 5,
    aoe: true
  },
  'Tempête': {
    type: 'vortex',
    special: 'tempete',
    statModifiers: { CC: -20, CT: -20 },
    rangedTestsPenaltySl: -3,
    flightDamageBonus: 5,
    aoe: true
  },
  'Chemin entre les Mondes': {
    type: 'special',
    special: 'walk-between-worlds',
    traits: ['Éthéré'],
    movementMultiplier: 2
  },

  // 8 Arcanes Elfiques
  'Enchantement Végétal (Ghyran & Chamon)': {
    type: 'special',
    special: 'vegetal-enchantment',
    permanentPlant: true
  },
  'Bannissement Mineur (Hysh & Shyish)': {
    type: 'special',
    special: 'minor-banishment',
    opposedTest: 'FM/Calme'
  },
  'Alarme Magique (Azyr & Ulgu)': {
    type: 'special',
    special: 'magical-alarm',
    triggerSize: 'Minuscule+'
  },
  'Masque de l\'Esprit (Shyish & Ulgu)': {
    type: 'special',
    special: 'mind-mask',
    intuitionPenaltySl: -3
  },
  'Purification du Corps (Ghyran & Hysh)': {
    type: 'special',
    special: 'body-purification',
    test: 'Endurance',
    secondaryTest: { actor: 'caster', mandatory: true, skill: 'Endurance', stat: 'E', modifierSl: 0, rollField: 'enduranceRoll' },
    fumbleTransfersAffliction: true
  },
  'Parler avec un Animal (Azyr & Ghur)': {
    type: 'special',
    special: 'animal-speech',
    substituteCharm: true,
    magickSlBonus: 2
  },
  'Voix de Fer (Aqshy & Chamon)': {
    type: 'special',
    special: 'iron-voice',
    intimidationSlBonus: 1,
    leadershipSlBonus: 1
  },
  'Zone de Confort (Aqshy & Ghur)': {
    type: 'special',
    special: 'comfort-zone',
    fireColdDamageReduction: 1,
    swarmImmunity: true
  },

  // 6 Petites Magies Elfiques
  'Flèche Bénie': {
    type: 'special',
    special: 'blessed-arrow',
    weaponDamageBonus: 1,
    weaponRanged: true,
    magical: true
  },
  'Calme': {
    type: 'special',
    special: 'calm',
    secondaryTest: { actor: 'caster', mandatory: true, skill: 'Sociabilité', stat: 'Soc', modifierSl: 0, rollField: 'fellowshipRoll' },
    removePsychology: true,
    removeFrenzy: true
  },
  'Doigt Vert': {
    type: 'narrative',
    special: 'green-thumb'
  },
  'Identifier une Maladie': {
    type: 'narrative',
    special: 'diagnose-disease'
  },
  'Enlever la Saleté': {
    type: 'special',
    special: 'remove-dirt',
    removeConditions: ['Souillé']
  },
  'Révéler la Magie': {
    type: 'special',
    special: 'reveal-magic',
    detectAuras: true
  },

  // =========================================================================
  // === WINDS OF MAGIC (18 SORTS) ===
  // =========================================================================
  'Sang Bouillonnant': {
    type: 'damage',
    damage: { formula: '10 + DR', raw: 10, noBfmAdded: true, periodic: true },
    conditions: ['Aveuglé'],
    resistanceModifierSl: -1
  },
  'Epées Sanguines': {
    type: 'summon',
    special: 'blood-swords',
    summon: { name: 'Épée Sanguine', damage: 4, noMomentum: true, maxPerTarget: 1, actionToDirect: true }
  },
  'Blizzard enflammé de Ygethmor': {
    type: 'damage',
    damage: { formula: '8 + DR', raw: 8, noBfmAdded: true },
    athleticsTestSl: 0,
    failCondition: 'À Terre',
    aoe: true
  },
  'Transe d’Ambre': {
    type: 'special',
    special: 'amber-trance',
    trance: true,
    // WoM p. 146 : la statue d'ambre ne peut être blessée ; le premier coup ne fait aucun dégât et met fin au sort (à retirer par le MJ).
    immunities: { damage: [{ filter: null, label: 'Transe d’Ambre : insensible aux dégâts jusqu’au premier coup (le sort prend fin à ce coup)' }] }
  },
  'Éveil du Bois': {
    type: 'special',
    special: 'awakening-of-wood',
    conditions: ['Enchevêtré', 'Hémorragique'],
    entangledStrength: 30,
    dodgeBonusSl: 2,
    aoe: true
  },
  'Malédiction d’Anraheir': {
    type: 'stat-modifiers',
    statModifiers: { M: -1, CC: -10, CT: -10, Ag: -10 },
    aoe: true
  },
  'Yeux de la Meute': {
    type: 'narrative',
    special: 'eyes-of-the-pack',
    sharedSight: true
  },
  'Suivi de l\'Odeur': {
    type: 'test-modifiers',
    testModifiers: { 'Pistage': 2, 'Perception (Odorat)': 2 },
    special: 'scent-tracking'
  },
  'Lunes du Chasseur': {
    type: 'stat-modifiers',
    statModifiers: { M: 1, F: 10, E: 10 },
    aoe: true
  },
  'Le Bœuf Reste Debout': {
    type: 'special',
    special: 'ox-stands',
    removeBrokenAmount: 'SL + 1',
    fearTerrorImmunity: true,
    aoe: true
  },
  'Ver Grouillant': {
    type: 'condition',
    conditions: ['Enchevêtré'],
    entangledStrength: 50,
    corrodeLeatherAp: 1
  },
  'Escalier en Spirale': {
    type: 'special',
    special: 'spiral-staircase'
  },
  'Transmogrification Exaltée de Colchis': {
    type: 'special',
    special: 'colchis-transmogrification',
    removeConditions: ['Enflammé'],
    fireImmunityInAoE: true,
    aoe: true
  },
  'Apothéose Verdoyante': {
    type: 'resurrection',
    special: 'verdant-apotheosis',
    aoe: true
  },
  'L’Étreinte d’Iyrtu': {
    type: 'stat-modifiers',
    statModifiers: { F: 10 },
    special: 'iyrtus-embrace',
    strengthPerSl: 10,
    grapplingFloor: true
  },
  'Les Enfants Sauvages de Zandox': {
    type: 'summon',
    special: 'wild-children-of-zandox',
    summon: { name: 'Chien Sauvage de Zandox', count: 2, ws: 50, damage: 8, traits: ['Arme (Morsure) +8', 'Invisible', 'Sans Élan'], noMomentum: true, invisible: true }
  },
  'Cor du Andar': {
    type: 'special',
    special: 'horn-of-andar',
    fearToEnemies: true,
    leadershipBonusSl: 2,
    aoe: true
  },
  'Visage mutable': {
    type: 'stat-modifiers',
    statModifiers: { Soc: 10 },
    special: 'mutable-visage'
  },

  // =========================================================================
  // === VORTEX SPELLS (LIVRE & CATALOGUE) ===
  // =========================================================================
  'Tempête Magmatique': {
    type: 'vortex',
    special: 'magma-storm',
    damage: { formula: '8 + DR', raw: 8 },
    conditions: ['Enflammé'],
    aoe: true
  },
  'Orage de Thorsen': {
    type: 'vortex',
    special: 'thorsen-storm',
    damage: { formula: '10 + DR', raw: 10 },
    conditions: ['À Terre'],
    aoe: true
  },
  'Globe doré de Gehenna': {
    type: 'vortex',
    special: 'golden-globe-gehenna',
    aoe: true
  },
  'Cendres et Poussière': {
    type: 'vortex',
    special: 'ash-and-dust',
    damage: { formula: '6 + DR', raw: 6 },
    conditions: ['Exténué'],
    aoe: true
  },
  'Vortex d’Âmes': {
    type: 'vortex',
    special: 'soul-vortex',
    damage: { formula: 'BFM + 8', raw: 8, undeadOnly: true, ignoreBe: true, ignoreAp: true, magicMissile: true },
    conditions: ['Brisé'],
    aoe: true
  },

  // =========================================================================
  // === CATALOGUE GÉNÉRAL EXPLICITE (TOUS LES SORTS RESTANTS) ===
  // =========================================================================
  'Tête Brûlante': {
    type: 'magic-missile',
    missile: { damage: 4 },
    conditions: ['Enflammé'],
    traits: ['Peur (1) si blessé'],
    aoe: true,
    special: 'burning-head'
  },
  'Flamme Captivante': {
    type: 'condition',
    conditions: ['Sonné', 'Sonné', 'Sonné'],
    special: 'captivating-flame',
    testRequired: 'Calme (+0 DR)'
  },
  'Colérique': {
    type: 'traits',
    traits: ['Préjugé (Cible désignée)'],
    special: 'choleric',
    mjInput: { options: ['Préjugé', 'Animosité (+4 DR)', 'Haine (+8 DR)'] }
  },
  'Forge de Tarnus': {
    type: 'test-modifiers',
    testModifiers: { 'Métier (Forgeron)': 1, 'Fabrication d’Objets Magiques': 1 },
    special: 'forge-of-tarnus'
  },
  'Ignition': {
    type: 'condition',
    conditions: ['Enflammé', 'Enflammé'],
    special: 'ignition-spread'
  },
  'Flamme Inextinguible': {
    type: 'mj-input',
    special: 'inextinguishable-flame',
    mjInput: { mode: ['Rendre inextinguible', 'Éteindre feu'], nonDispellable: true }
  },
  'Flamme Attisée': {
    type: 'special',
    special: 'stoked-flame',
    traits: ['Inflammable (+DR Dégâts de feu, +1 Enflammé additionnel)']
  },
  'Esprit du Foyer': {
    type: 'summon',
    special: 'hearth-spirit',
    casterSelfDamage: 6,
    selfHarm: { minusBe: true, clause: 'Plonger les mains dans le feu : 6 Dégâts − Bonus d’Endurance (catalogue)' },
    summon: { name: 'Esprit du Foyer', move: 3, damage: 6, traits: ['Peur (1)', 'Enflammé au coup'] }
  },
  'Goût de Feu': {
    type: 'mj-input',
    special: 'taste-of-fire-liquid',
    mjInput: { options: ['Plat épicé (Endurance +4 DR)', 'Alcool fort (1 L)', 'Huile inflammable (0,5 L)'] }
  },
  'Chaleur Desséchante': {
    type: 'condition',
    triggeredConditions: ['Exténué'],
    special: 'parching-heat',
    traits: ['Vulnérabilité Feu (+DR Dégâts, +1 Enflammé)'],
    aoe: true
  },
  'Arc de T’Essla': {
    type: 'magic-missile',
    missile: { damage: 10 },
    conditions: ['Aveuglé'],
    special: 'tesslas-arc'
  },
  'Polir et Exalter': {
    type: 'test-modifiers',
    testModifiers: { 'Savoir (Astronomie)': 2, 'Perception (Seconde vue)': 2 },
    special: 'polish-and-exalt'
  },
  'Projection Spirituelle': {
    type: 'mj-input',
    special: 'spirit-projection',
    traits: ['Esprit projeté (Invisible, Intangible)'],
    mjInput: { corruptionOnLateReturn: 'Modérée' }
  },
  'Arche de Saphir': {
    type: 'mj-input',
    special: 'sapphire-arch',
    mjInput: { limboArch: true, failConditions: ['Sonné', 'À Terre'] }
  },
  // Winds of Magic p. 98 : 3 coups de 8 Dégâts, Localisations aléatoires, lancés à chaque Round au Tour de l'adversaire engagé ; jamais le lanceur.
  // `recurring` : les coups ne sont pas portés au lancement mais à chaque début de Tour d'un adversaire désigné (fin de Tour V5).
  'Lames Azurées': {
    type: 'special',
    special: 'azure-blades',
    engagedEnemyDamage: { formula: '8', hits: 3, randomLocation: true, recurring: 'opponent-turn' },
    traits: ['Lames Azurées (3 coups de 8 Dégâts contre chaque adversaire engagé, à chacun de ses Tours)']
  },
  'Malédiction du Destin': {
    type: 'test-modifiers',
    testModifiers: { 'Tous les Tests': -1 },
    special: 'curse-of-fate',
    mjInput: { overcast6Sl: 'Perte 1 Destin ou prochain Critique = 100' }
  },
  'Divination': {
    type: 'mj-input',
    special: 'divination',
    testModifiers: { 'Jet futur désigné': 1 },
    mjInput: { options: ['Moment propice', 'Localiser objet', 'Modifier jet futur (±10)'] }
  },
  'Ennemi Anticipé': {
    type: 'traits',
    traits: ['Immunité Surpris', 'Alerte danger (BI Rounds avant)'],
    removeConditions: ['Surpris'],
    special: 'anticipated-enemy'
  },
  'Prémonition Fantastique': {
    type: 'special',
    special: 'fantastic-premonition',
    traits: ['Relance 1er échec magique (Alliés) / Désorientation de Solmann (Ennemis)'],
    aoe: true
  },
  'Destin Illuminé': {
    type: 'narrative',
    special: 'illuminated-fate'
  },
  'Lentille du Ciel': {
    type: 'test-modifiers',
    testModifiers: { 'Perception (Longue distance)': 2, 'Orientation': 2 },
    traits: ['Ignorer brouillard/nuages'],
    special: 'sky-lens'
  },
  'Que les Quatre Vents Soufflent !': {
    type: 'condition',
    conditions: ['À Terre'],
    damage: { formula: '7', raw: 7 },
    special: 'four-winds-blow',
    aoe: true
  },
  'Mistral de la Stratosphère': {
    type: 'damage',
    damage: { formula: '12', raw: 12, ignoreAp: true },
    special: 'stratosphere-mistral',
    aoe: true,
    mjInput: { testRequired: 'Résistance (-2 DR) sinon Exposition au Froid' }
  },
  'Miroir Mystique': {
    type: 'narrative',
    special: 'mystic-mirror'
  },
  'Éclat Stellaire': {
    type: 'mj-input',
    special: 'starshine',
    traits: ['Révélation des cibles invisibles et portes dissimulées', 'Dissipation obscurité'],
    aoe: true
  },
  'Tempête de Shemtek': {
    type: 'magic-missile',
    missile: { damage: 6 },
    special: 'shemtek-storm',
    mjInput: { casterStunned: true, witnessFear: 1 }
  },
  'Écaille d’acier': {
    type: 'ward',
    ward: 9,
    special: 'steel-scales-progressive'
  },
  'Inscription': {
    type: 'magic-missile',
    missile: { damage: 2 },
    corrodeMetalAp: 1,
    special: 'inscription-acid'
  },
  'Métal restauré': {
    type: 'mj-input',
    special: 'restored-metal',
    testModifiers: { 'Métier (Forgeron)': 1 },
    mjInput: { options: ['Réparer objet métallique', 'Souder / Défauts Peu fiable & Encombrant'] }
  },
  'Armure d’étain': {
    type: 'armor',
    apModifiers: { all: -2 },
    special: 'tin-armour',
    aoe: true
  },
  'Franchir l’inconnu': {
    type: 'mj-input',
    special: 'bridge-the-unknown',
    talents: ['Détection des Artefacts'],
    mjInput: { infoRevealed: 'État de santé, meilleur attribut, +1 propriété par +2 DR' }
  },
  'Malédiction de rouille': {
    type: 'mj-input',
    special: 'curse-of-rust',
    mjInput: { destroyMetalItem: true, encumbranceLimit: '1 + 1 par +2 DR' }
  },
  'Défaut de Forme': {
    type: 'test-modifiers',
    testModifiers: { 'Attaque (Arme métallique ciblée)': -1 },
    traits: ['Atouts d’arme neutralisés', 'Défauts d’arme aggravés'],
    special: 'flaw-of-form'
  },
  'Cage dorée': {
    type: 'mj-input',
    special: 'gilded-cage',
    mjInput: { escapeTest: 'Force Difficile (-2 DR)', aoe: true }
  },
  'Toucher doré': {
    type: 'mj-input',
    special: 'golden-touch',
    mjInput: { resistanceTest: 'Force Mentale (+0 DR)', petrifiedTb: 10 }
  },
  'Blindage d’oracier': {
    type: 'mj-input',
    special: 'goldsteel-plating',
    testModifiers: { 'Dissipation (Derrière abri d’oracier)': 1 },
    mjInput: { surfaceApBonus: 4, corruptionReductionLevels: 2 }
  },
  'Nœud défait': {
    type: 'test-modifiers',
    testModifiers: { 'Savoir (Énigme/Problème)': 2 },
    special: 'undone-knot'
  },
  'Blindage de météorite': {
    type: 'ward',
    ward: 4,
    special: 'meteoric-ironclad'
  },
  'Réfraction prismatique de Habermas': {
    type: 'test-modifiers',
    testModifiers: { 'Focalisation': -1, 'Langue (Magick)': -1 },
    aoe: true,
    special: 'habermas-refraction'
  },
  'Boussole d’Argent de Puchta': {
    type: 'mj-input',
    special: 'puchta-silver-compass',
    traits: ['Boussole en Argent Météoritique (Détection Vents/Malepierre)']
  },
  'Réplique de Levorg': {
    type: 'mj-input',
    special: 'levorg-replica',
    mjInput: { maxEncumbrance: '4 (+1 par +2 DR)', secretDuration: true }
  },
  'Essais et Erreurs': {
    type: 'test-modifiers',
    testModifiers: { 'Compétence choisie': 2 },
    special: 'trial-and-error'
  },
  'Bête Indomptée': {
    type: 'mj-input',
    special: 'untamed-beast',
    mjInput: { mountTest: 'Chevaucher Difficile (-2 DR)', humanOvercast4Sl: 'Force Mentale (-1 DR) sinon table bestiale 1d10' }
  },
  'Régiment Monstrueux de Merciw': {
    type: 'stat-modifiers',
    statModifiers: { F: 30, E: 30 },
    excludeCaster: true,
    aoe: true,
    special: 'merciw-monstrous-regiment'
  },
  'Pulvérisation Musquée': {
    type: 'test-modifiers',
    testModifiers: { 'Pistage (Cible marquée)': 2 },
    special: 'musk-spray'
  },
  'Passage Rapide': {
    type: 'stat-modifiers',
    statModifiers: { M: 1 },
    talents: ['Escalade', 'Foulée'],
    testModifiers: { 'Éviter Enchevêtré': 1 },
    special: 'swift-passage'
  },
  'Invocation de Monture': {
    type: 'mj-input',
    special: 'summon-mount',
    talents: ['Chevaucher = Langue (Magick)'],
    mjInput: { mountChoice: 'Cerf, Sanglier, Ours...' }
  },
  'Transformation de Kadon': {
    type: 'transformation',
    special: 'transformation-of-kadon'
  },
  'Capuche Vengeresse': {
    type: 'special',
    special: 'vengeful-hood',
    damageReductionFormula: 'BFM',
    damageReductionFilter: { not: ['magical'] },
    damageReductionCalmTest: true,
    testRequired: 'Calme (+0 DR)',
    traits: ['Déviation si dégâts réduits à 0']
  },
  'Manteau d’Hiver': {
    type: 'stat-modifiers',
    statModifiers: { Ag: -10, Soc: -10 },
    traits: ['Immunité Exposition au Froid', 'Coups Critiques reçus -10'],
    special: 'winter-coat'
  },
  'Habitants d’en bas': {
    type: 'mj-input',
    special: 'dwellers-below-spirits',
    aoe: true,
    mjInput: { testRequired: 'Force (+0 DR)', consequence: 'Entraîné sous terre 1d10h + Exposition Modérée Corruption' }
  },
  'Cri de Guerre du Jardinier': {
    type: 'damage',
    damage: { formula: '10', raw: 10 },
    conditions: ['Hémorragique'],
    aoe: true,
    special: 'gardeners-warcry'
  },
  'Almanach': {
    type: 'narrative',
    special: 'almanac'
  },
  'Chair de Pierre': {
    type: 'stat-modifiers',
    statModifiers: { F: 30, E: 30 },
    apModifiers: { all: 4 },
    movementMultiplier: 0.5,
    traits: ['Sans respiration', 'Muet'],
    special: 'flesh-to-stone'
  },
  'Geyser': {
    type: 'magic-missile',
    missile: { damage: 4 },
    conditions: ['À Terre'],
    aoe: true,
    special: 'geyser'
  },
  'Chant vivifiant': {
    type: 'healing',
    healing: { amountFormula: 'DR', amount: 2 },
    testModifiers: { 'Tous les Tests (Créatures végétales)': 1 },
    aoe: true,
    special: 'invigorating-song'
  },
  'Cercueil de Jade': {
    type: 'summon',
    special: 'jade-casket',
    summon: { name: 'Serviteur de Jade', hp: 12, traits: ['Non Mort-vivant', 'Muet'] }
  },
  'Chute des feuilles': {
    type: 'special',
    special: 'falling-leaves',
    rangedOpponentPenaltySl: -2,
    damageReduction: 3,
    damageReductionFilter: { any: ['blunt', 'fall', 'crush'] },
    talents: ['Contorsionniste']
  },
  'Traque des lignes telluriques': {
    type: 'test-modifiers',
    testModifiers: { 'Orientation (Lignes telluriques)': 2 },
    special: 'leyline-tracking'
  },
  'Murmure de la Nature': {
    type: 'narrative',
    special: 'nature-whisper'
  },
  'Sentier de Paranoth': {
    type: 'special',
    special: 'path-of-paranoth',
    talents: ['Foulée (Forêts)'],
    aoe: true
  },
  'Croissance Vitale': {
    type: 'mj-input',
    special: 'vital-growth',
    mjInput: { growthMultiplier: '1x (base), 2x (+2 DR), 3x (+4 DR), 4x (+6 DR)' }
  },
  'Forme de Bois': {
    type: 'mj-input',
    special: 'wood-shape',
    mjInput: { resistanceTest: 'Force Mentale Accessible (+2 DR)', form: 'Chêne' }
  },
  'Mains de Karkora': {
    type: 'condition',
    conditions: ['Enchevêtré'],
    aoe: true,
    special: 'hands-of-karkora',
    mjInput: { dodgeTest: 'Esquive (+0 DR)', grappleStrength: 'FM', optionalSuffocation: true }
  },
  'Crevasse': {
    type: 'damage',
    damage: { formula: '20', raw: 20 },
    aoe: true,
    special: 'crevasse',
    mjInput: { dodgeTest: 'Esquive (+0 DR)', crushDamageOnClose: 20 }
  },
  'Piège d\'Abulla': {
    type: 'condition',
    conditions: ['Enchevêtré', 'Enchevêtré'],
    special: 'abullas-snare',
    mjInput: { levitationMeters: 2, fallDamageOnRelease: true }
  },
  'Assaut de pierre': {
    type: 'damage',
    damage: { formula: '20', raw: 20 },
    aoe: true,
    special: 'stone-assault',
    mjInput: { dodgeTest: 'Esquive (+0 DR) réduit à 10 Dégâts' }
  },
  'Éclat éblouissant': {
    type: 'condition',
    conditions: ['Aveuglé'],
    aoe: true,
    special: 'dazzling-brightness',
    mjInput: { daemonExtraCondition: 'Sonné' }
  },
  'Volonté inébranlable': {
    type: 'test-modifiers',
    testModifiers: { 'Résistance (Séduction/Intimidation)': 2, 'Charme (Vérité)': 2 },
    special: 'unshakable-will'
  },
  'Ériger l’édifice': {
    type: 'mj-input',
    special: 'raise-edifice',
    mjInput: { dimensions: '5m × 1m × 15cm', cover: 'Couverture Dure' }
  },
  'Yeux de Volans': {
    type: 'test-modifiers',
    testModifiers: { 'Perception (Seconde vue)': 2, 'Perception (Vue normale)': -2 },
    traits: ['Lecture de la Corruption'],
    special: 'eyes-of-volans'
  },
  'Illuminer l’édifice': {
    type: 'damage',
    damage: { formula: 'DR', raw: 0, ignoreBe: true, ignoreAp: true },
    special: 'illuminate-edifice',
    mjInput: { daemonUndeadEntryTest: 'Force Mentale (+0 DR)' }
  },
  'Lumière de pureté': {
    type: 'test-modifiers',
    testModifiers: { 'Dissipation (Magie Noire/Chaos)': 2 },
    talents: ['Résistance (Maladies)'],
    special: 'light-of-purity'
  },
  'Bibliothécaire instantané de Meissner': {
    type: 'test-modifiers',
    testModifiers: { 'Recherche': 2 },
    special: 'meissner-instant-librarian'
  },
  'Orbe de Hysh': {
    type: 'mj-input',
    special: 'orb-of-hysh',
    mjInput: { maxEncumbrance: 'BFM + DR', corruptionReductionLevels: 1 }
  },
  'Compréhension parfaite': {
    type: 'narrative',
    special: 'perfect-comprehension'
  },
  'Percer le Voile': {
    type: 'special',
    special: 'pierce-the-veil',
    traits: ['Vision sans pénalité (Brouillard/Fumée/Obscurité)']
  },
  'Cape chatoyante': {
    type: 'special',
    special: 'shimmering-cloak',
    damageCapToSlOnly: true,
    testModifiers: { 'Discrétion': -3 },
    traits: ['Attaques ordinaires limitées aux DR', 'Immunité Dégâts non-magiques hors attaques']
  },
  'Dérèglement temporel': {
    type: 'special',
    special: 'time-amok',
    bonusAction: 1,
    traits: ['Action supplémentaire (Alliés)'],
    aoe: true
  },
  'Acceptation du Destin': {
    type: 'traits',
    traits: ['Immunisé à la Peur', 'Terreur traitée comme Peur'],
    removeConditions: ['Peur'],
    aoe: true,
    special: 'acceptance-of-fate'
  },
  'Amarante': {
    type: 'special',
    special: 'amaranth',
    talents: ['Résistance (Poison)', 'Résistance (Maladies)', 'Résistance (Chaos)'],
    traits: ['Coups Critiques reçus -10']
  },
  'Âme Emprisonnée': {
    type: 'condition',
    conditions: ['Inconscient'],
    special: 'imprisoned-soul',
    mjInput: { soulReceptacle: true, corruptionOnWake: 'Modérée' }
  },
  'Contrainte des Esprits': {
    type: 'summon',
    special: 'spirit-compulsion',
    summon: { name: 'Fantôme', hp: 12, traits: ['Mort-vivant', 'Éthéré', 'Terreur (2)'] }
  },
  'Labyrinthe de Cristal': {
    type: 'mj-input',
    special: 'crystal-labyrinth',
    aoe: true,
    mjInput: { table1d10: '1-3 Évasion, 4-6 Confusion, 7-9 Perdue 1d10h + Corruption Modérée, 10 Condamnée' }
  },
  'Délivrance de la Mort': {
    type: 'condition',
    conditions: ['Sonné'],
    special: 'deaths-release',
    testRequired: 'Calme (+0 DR)'
  },
  'Destin de Bjuna': {
    type: 'damage',
    damage: { formula: 'BF + 6', raw: 6, ignoreAp: true },
    conditions: ['Sonné'],
    special: 'fate-of-bjuna'
  },
  'Flétrissement des Membres': {
    type: 'mj-input',
    special: 'limb-withering',
    mjInput: { disabledLimbDurationMinutes: 'BFM', tombCurseDays: 'BFM' }
  },
  'Révélation de Shyish': {
    type: 'narrative',
    special: 'shyish-revelation'
  },
  'Vitesse de Lykos': {
    type: 'stat-modifiers',
    statModifiers: { M: 4 },
    traits: ['Sprint 100m', 'Action bonus si mort'],
    special: 'speed-of-lykos'
  },
  'Goût de la Mort': {
    type: 'condition',
    conditions: ['Inconscient', 'Sonné', 'Exténué'],
    special: 'taste-of-death',
    aoe: true
  },
  'Télépathie': {
    type: 'mj-input',
    special: 'telepathy',
    mjInput: { intuitionTest: 'Intuition (+0 DR)', mindReadOpposition: 'Force Mentale opposée' }
  },
  'Marée des Âges': {
    type: 'mj-input',
    special: 'tide-of-ages',
    mjInput: { objectEncumbrance: '2 (+1 par +2 DR)', livingOvercast4Sl: 'Calme (+2 DR) sinon -1d10 F et E permanent' }
  },
  'Chain Attack': {
    type: 'magic-missile',
    missile: { damage: 4 },
    special: 'chain-attack',
    mjInput: { maxBounces: 'BFM (+1 par +2 DR)', bounceDamageDecay: -1 }
  },
  'Attaques en chaine': {
    type: 'magic-missile',
    missile: { damage: 4 },
    special: 'chain-attack',
    mjInput: { maxBounces: 'BFM (+1 par +2 DR)', bounceDamageDecay: -1 }
  },
  'Mundane Aura': {
    type: 'special',
    special: 'mundane-aura',
    traits: ['Aura magique masquée', 'Incantation interdite']
  },
  'Aura ordinaire': {
    type: 'special',
    special: 'mundane-aura',
    traits: ['Aura magique masquée', 'Incantation interdite']
  },
  // V5 p. 244 : Protection 6+ contre les attaques magiques ou à distance venant de l'extérieur du dôme.
  'Dome': {
    type: 'ward',
    ward: 6,
    wardFilter: { any: ['magical', 'ranged'], all: ['external'] },
    special: 'dome-ward-ranged',
    aoe: true
  },
  'Dôme': {
    type: 'ward',
    ward: 6,
    wardFilter: { any: ['magical', 'ranged'], all: ['external'] },
    special: 'dome-ward-ranged',
    aoe: true
  },
  'Bridge': {
    type: 'mj-input',
    special: 'bridge',
    mjInput: { dimensionsMeters: 'BFM × BFM (+BFM par +2 DR)' }
  },
  'Pont': {
    type: 'mj-input',
    special: 'bridge',
    mjInput: { dimensionsMeters: 'BFM × BFM (+BFM par +2 DR)' }
  },
  'Push': {
    type: 'condition',
    engagedEnemyConditions: ['À Terre'],
    engagedEnemyDamage: { dice: '1d10', ignoreAp: true },
    aoe: true,
    special: 'push'
  },
  'Poussée': {
    type: 'condition',
    engagedEnemyConditions: ['À Terre'],
    engagedEnemyDamage: { dice: '1d10', ignoreAp: true },
    aoe: true,
    special: 'push'
  },
  'Teleport': {
    type: 'mj-input',
    special: 'teleport',
    mjInput: { distanceMeters: 'BFM + DR' }
  },
  'Téléportation': {
    type: 'mj-input',
    special: 'teleport',
    mjInput: { distanceMeters: 'BFM + DR' }
  },
  'Move Object': {
    type: 'mj-input',
    special: 'move-object',
    mjInput: { maxDimensionMeters: '1 + DR', effectiveStrength: 'FM', distanceMeters: 'BFM' }
  },
  'Déplacement d’objet': {
    type: 'mj-input',
    special: 'move-object',
    mjInput: { maxDimensionMeters: '1 + DR', effectiveStrength: 'FM', distanceMeters: 'BFM' }
  },
  'Warning': {
    type: 'narrative',
    special: 'warning-detect'
  },
  'Alerte': {
    type: 'narrative',
    special: 'warning-detect'
  },
  'Animal Friend': {
    type: 'mj-input',
    special: 'animal-friend',
    traits: ['Confiance animale (Bestial plus petit)']
  },
  'Amitié animale': {
    type: 'mj-input',
    special: 'animal-friend',
    traits: ['Confiance animale (Bestial plus petit)']
  },
  'Sounds': {
    type: 'mj-input',
    special: 'sounds',
    mjInput: { controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Bruits': {
    type: 'mj-input',
    special: 'sounds',
    mjInput: { controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Conserve': {
    type: 'narrative',
    special: 'conserve'
  },
  'Conservation': {
    type: 'narrative',
    special: 'conserve'
  },
  'Gust': {
    type: 'narrative',
    special: 'gust'
  },
  'Coup de vent': {
    type: 'narrative',
    special: 'gust'
  },
  'Drain': {
    type: 'magic-missile',
    missile: { damage: 0, ignoreAp: true, isContact: true },
    healing: { amount: 1 },
    special: 'drain-life'
  },
  'Sly Hands': {
    type: 'mj-input',
    special: 'sly-hands',
    mjInput: { maxObjectSize: 'Poing' }
  },
  'En catimini': {
    type: 'mj-input',
    special: 'sly-hands',
    mjInput: { maxObjectSize: 'Poing' }
  },
  'Marsh Lights': {
    type: 'mj-input',
    special: 'marsh-lights',
    mjInput: { count: 'BI', controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Feux follets': {
    type: 'mj-input',
    special: 'marsh-lights',
    mjInput: { count: 'BI', controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Magic Flame': {
    type: 'mj-input',
    special: 'magic-flame',
    mjInput: { palmFlame: true }
  },
  'Flamme magique': {
    type: 'mj-input',
    special: 'magic-flame',
    mjInput: { palmFlame: true }
  },
  'Light': {
    type: 'mj-input',
    special: 'light',
    mjInput: { controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Lumière': {
    type: 'mj-input',
    special: 'light',
    mjInput: { controlTest: 'Force Mentale Accessible (+2 DR)' }
  },
  'Protection from Rain': {
    type: 'narrative',
    special: 'protection-from-rain'
  },
  'Protection contre la pluie': {
    type: 'narrative',
    special: 'protection-from-rain'
  },
  'Purify Water': {
    type: 'narrative',
    special: 'purify-water'
  },
  'Purification de l\'eau': {
    type: 'narrative',
    special: 'purify-water'
  },
  'Bearings': {
    type: 'narrative',
    special: 'bearings'
  },
  'Repères': {
    type: 'narrative',
    special: 'bearings'
  },
  'Open Lock': {
    type: 'narrative',
    special: 'open-lock'
  },
  'Serrure ouverte': {
    type: 'narrative',
    special: 'open-lock'
  },
  'Spring': {
    type: 'narrative',
    special: 'spring'
  },
  'Source': {
    type: 'narrative',
    special: 'spring'
  },
  'Murmured Whisper': {
    type: 'narrative',
    special: 'murmured-whisper'
  },
  'Murmures': {
    type: 'narrative',
    special: 'murmured-whisper'
  },
  'Eavesdrop': {
    type: 'test-modifiers',
    testModifiers: { 'Perception (Écoute à distance)': 2 },
    special: 'eavesdrop',
    mjInput: { rangeMeters: 'Initiative', durationMinutes: 'BFM' }
  },
  'Tendre l\'oreille': {
    type: 'test-modifiers',
    testModifiers: { 'Perception (Écoute à distance)': 2 },
    special: 'eavesdrop',
    mjInput: { rangeMeters: 'Initiative', durationMinutes: 'BFM' }
  },
  'Danse du Désespoir': {
    type: 'condition',
    triggeredConditions: ['Exténué'],
    special: 'dance-of-despair',
    aoe: true,
    traits: ['Danse forcée (Test Athlétisme -2 DR ou Représentation +0 DR pour agir)']
  },
  'Égarer': {
    type: 'condition',
    conditions: ['À Terre'],
    special: 'bewilder',
    traits: ['Comportement confus (1d10)']
  },
  'Horreurs Noires': {
    type: 'traits',
    traits: ['Peur (1)'],
    aoe: true,
    special: 'black-horrors'
  },
  'Pont d’Ombres': {
    type: 'mj-input',
    special: 'shadow-bridge',
    aoe: true,
    mjInput: { maxDistanceMeters: 'FM', maxObstacleHeightMeters: 'FM' }
  },
  'Poches Profondes': {
    type: 'mj-input',
    special: 'deep-pockets',
    mjInput: { encumbranceLimit: '1 (+1 par +2 DR)' }
  },
  'Grande Illusion': {
    type: 'mj-input',
    special: 'grand-illusion',
    aoe: true,
    mjInput: { multisensory: true }
  },
  'Ailes Grises': {
    type: 'mj-input',
    special: 'grey-wings',
    mjInput: { teleportDistanceMeters: '100 (+100 par +2 DR)', dodgeTestUnwilling: 'Esquive Facile (+4 DR)' }
  },
  'Silence': {
    type: 'mj-input',
    special: 'silence-ulgu',
    aoe: true,
    mjInput: { modes: ['Aucun son ne sort', 'Aucun son n’entre', 'Silence total dans la zone'] }
  },
  'Gouffre de Tarnus': {
    type: 'damage',
    damage: { formula: '20', raw: 20 },
    aoe: true,
    special: 'pit-of-tarnus',
    mjInput: { dodgeTest: 'Esquive (+0 DR)', crushDamageOnClose: 20 }
  },
  'Illusion rétroactive de Ribauld': {
    type: 'narrative',
    special: 'ribauld-retroactive-illusion'
  },
  'Bosquet d’ombres': {
    type: 'test-modifiers',
    testModifiers: { 'Attaque contre cible révélée': -1 },
    traits: ['Révélation des ombres et invisibles'],
    aoe: true,
    special: 'shadow-grove'
  },
  'Substance d’Ombre': {
    type: 'special',
    special: 'shadow-substance',
    traits: ['Éthéré (dans l’ombre)', 'Invisible (dans l’ombre)']
  },
  'Traître de Tarn': {
    type: 'test-modifiers',
    testModifiers: { 'Sociabilité (Cible neutre)': 2 },
    traits: ['Changement d’allégeance temporaire (FM opposé)'],
    special: 'traitor-of-tarn'
  },
  'Ombre Vagabonde': {
    type: 'summon',
    special: 'wandering-shadow',
    summon: { name: 'Ombre Vagabonde', hp: 1, traits: ['Peur (1)', 'Capteur sensoriel', 'Détruite au soleil'] }
  }
};

/**
 * Dictionnaire d'ajustements et de valeurs V5 retenues issues du livre V5 et du cadrage (Phase 3.3 / 3.4).
 */
// Décision MJ du 13 octobre : les deux profils de Robe conservent des identités distinctes.
const SOURCE_REMINDER_OVERRIDES = {
  'Écaille d’acier': 'Décision MJ du 13 octobre : sort distinct de Robe scintillante V5. Profil de Winds of Magic p. 75 : Protection (9) initiale, durée BE Rounds. Les identités et références des deux sorts sont conservées.',
  'Robe scintillante': 'Décision MJ du 13 octobre : sort distinct d’Écaille d’acier (Winds of Magic p. 75). Profil V5 p. 253 : NI 6, durée BFM Rounds, lumière de chandelier et +2 PA à toutes les localisations ; ennemis engagés : Résistance (+0) ou 1 Aveuglé. Les identités et références des deux sorts sont conservées.'
};

const V5_PARAMETER_OVERRIDES = {
  // 1. Robe scintillante (Glittering Robe) : NI 6, durée BFM Rounds, +2 PA all zones, Aveuglé 1 sur échec Résistance
  'Glittering Robe': {
    cn: 6,
    duration: '(Bonus de Force Mentale) Rounds',
    range: 'Vous',
    target: 'Vous',
    effects: { type: 'armor', apModifiers: { all: 2 }, engagedEnemyConditions: ['Aveuglé'], engagedEnemyTest: { stat: 'E', skill: 'Endurance' }, special: 'glittering-robe' }
  },
  'Robe scintillante': {
    cn: 6,
    duration: '(Bonus de Force Mentale) Rounds',
    range: 'Vous',
    target: 'Vous',
    effects: { type: 'armor', apModifiers: { all: 2 }, engagedEnemyConditions: ['Aveuglé'], engagedEnemyTest: { stat: 'E', skill: 'Endurance' }, special: 'glittering-robe' }
  },

  // Transformation de Kadon (Winds of Magic p. 149) : NI 14, Vous ou Contact, Vous ou 1, BFM Rounds ; monstre de Taille Grande ou Énorme
  'Transformation de Kadon': {
    cn: 14,
    duration: '(Bonus de Force Mentale) Rounds',
    range: 'Vous ou Contact',
    target: 'Vous ou 1'
  },

  // 2. Forme bestiale (Beast Form) : durée Endurance minutes, remplace Mouvement, stats de bête, crits/blessures conservés
  'Beast Form': {
    cn: 5,
    duration: 'Endurance minutes',
    range: 'Vous',
    target: 'Vous',
    effects: { type: 'transformation', special: 'beast-form' }
  },
  'Forme bestiale': {
    cn: 5,
    duration: 'Endurance minutes',
    range: 'Vous',
    target: 'Vous',
    effects: { type: 'transformation', special: 'beast-form' }
  },
  'Forme bestiale - Jade': {
    cn: 5,
    duration: 'Endurance minutes',
    range: 'Vous',
    target: 'Vous',
    domain: 'life',
    wind: 'Ghyran',
    effects: { type: 'transformation', special: 'beast-form' }
  },
  'Forme bestiale — Jade': {
    cn: 5,
    duration: 'Endurance minutes',
    range: 'Vous',
    target: 'Vous',
    domain: 'life',
    wind: 'Ghyran',
    effects: { type: 'transformation', special: 'beast-form' }
  },
  'spell-audit-44d3e9b3a2c7a6e5cef2': {
    cn: 5,
    duration: 'Endurance minutes',
    range: 'Vous',
    target: 'Vous',
    domain: 'life',
    wind: 'Ghyran',
    effects: { type: 'transformation', special: 'beast-form' }
  },

  // 3. Ajustements V5 canoniques relevés dans le cadrage et l'audit
  'Dying Words': { cn: 2 },
  'Derniers Mots': { cn: 2 },
  'Aethyric Arms': { cn: 3 },
  'Arme aethyrique': { cn: 3 },
  'Ward': { cn: 6, effects: { type: 'ward', ward: 7 } },
  'Protection (Ward)': { cn: 6, effects: { type: 'ward', ward: 7 } },
  'Protection': { cn: 6, effects: { type: 'ward', ward: 7 } },
  'Teleport': { cn: 3, range: '(Bonus de Force Mentale) + DR mètres' },
  'Téléportation': { cn: 3, range: '(Bonus de Force Mentale) + DR mètres' },
  'Terrifying': { cn: 6 },
  'Terrifiant': { cn: 6 },
  'Corrosive Blood': { cn: 2 },
  'Sang corrosif': { cn: 2 },
  'Caress of Laniph': { cn: 6 },
  'Caresse de Laniph': { cn: 6 },
  'Steal Life': { cn: 8 },
  'Vol de Vie': { cn: 8 },
  'Soul Vortex': { cn: 10 },
  'Vortex d’Âmes': { cn: 10 },
  'Healing Light': { cn: 8 },
  'Lumière guérisseuse': { cn: 8 },
  'Cauterise': { cn: 2 },
  'Cautérisation': { cn: 2 },
  'Flaming Hearts': { cn: 5, duration: 'Instantané', target: 'ZdE (Bonus de Sociabilité) mètres' },
  'Cœurs Enflammés': { cn: 5, duration: 'Instantané', target: 'ZdE (Bonus de Sociabilité) mètres' },
  'Comet of Casandora': { cn: 18, target: 'ZdE (2 × Bonus de Force Mentale) mètres' },
  'Comète de Cassandora': { cn: 18, target: 'ZdE (2 × Bonus de Force Mentale) mètres' },
  'Amber Talons': { cn: 3 },
  'Serres d’Ambre': { cn: 3 },
  'The Amber Spear': { cn: 10, range: '(Force) mètres', target: '1' },
  'Lance d’Ambre': { cn: 10, range: '(Force) mètres', target: '1' },
  'Clarity of Thought': { duration: '(Intelligence) minutes' },
  'Clarté d’esprit': { duration: '(Intelligence) minutes' },
  'Sanctify': { duration: '(Force Mentale) minutes' },
  'Sanctifier': { duration: '(Force Mentale) minutes' },
  'Illusion': { duration: '(Intelligence) minutes', target: 'ZdE (Bonus d’Intelligence) mètres' },
  'Mindslip': { duration: '(Intelligence) minutes' },
  'Effacement d’esprit': { duration: '(Intelligence) minutes' },
  'Careful Step': { duration: '(Agilité) minutes' },
  'Pas léger': { duration: '(Agilité) minutes' },
  'Eavesdrop': { range: '(Initiative) mètres', duration: '(Bonus de Force Mentale) minutes' },
  'Tendre l\'oreille': { range: '(Initiative) mètres', duration: '(Bonus de Force Mentale) minutes' },
  'Protection from Rain': { duration: '(Bonus de Force Mentale) heures' },
  'Protection contre la pluie': { duration: '(Bonus de Force Mentale) heures' },
  'Conserve': { duration: '(Bonus de Force Mentale) jours' },
  'Conservation': { duration: '(Bonus de Force Mentale) jours' },
  'Dark Vision': { duration: '(Bonus d’Initiative) Rounds' }, // Livre de base V5 p. 243 : Initiative Bonus Rounds
  'Vision dans l’obscurité': { duration: '(Bonus d’Initiative) Rounds' },
  'Purification': { duration: '(Bonus de Force Mentale) Rounds' },
  'Forge de Tarnus': { duration: '(Bonus de Force Mentale) heures', target: '1 Forge' },
  'Suivi de l\'Odeur': { duration: '(Initiative) minutes' },
  'Arc de T’Essla': { cn: 7, target: '1' },
  'En catimini': { range: 'Vous', target: 'Vous', duration: 'Instantané' },
  'Sly Hands': { range: 'Vous', target: 'Vous', duration: 'Instantané' },
  'Repères': { range: 'Vous', target: 'Vous', duration: 'Instantané' },
  'Bearings': { range: 'Vous', target: 'Vous', duration: 'Instantané' },
  'Warning': { target: '1 Objet' },
  'Alerte': { target: '1 Objet' },

  // Sorts avec arbitrages et mécaniques complètes
  'Corps de Feu': {
    effects: { type: 'stat-modifiers', statModifiers: { F: 10, E: 10 }, traits: ['Enflammé au contact', 'Immunité Feu'] }
  },
  'Tempête de Flammes': {
    effects: { type: 'damage', damage: { formula: 'BFM + 8', raw: 8 }, aoe: true, conditions: ['Enflammé'] }
  },
  'Voix de Fer (Aqshy & Chamon)': {
    effects: { type: 'special', special: 'iron-voice', statModifiers: { Soc: 10 }, traits: ['Intimidation +10', 'Peur (1)'], intimidationSlBonus: 1, leadershipSlBonus: 1 }
  },
  'Main de Gloire': {
    effects: {
      type: 'special',
      special: 'hand-of-glory'
    }
  },
  'Le Bœuf Reste Debout': {
    target: 'ZdE (Force Mentale) mètres',
    effects: {
      type: 'special',
      special: 'ox-stands',
      removeBrokenAmount: 'SL + 1',
      fearTerrorImmunity: true,
      aoe: true
    }
  },
  'The First Portent of Amul': {
    duration: '(Bonus d’Initiative) Rounds'
  },
  'Le Premier Signe d’Amul': {
    duration: '(Bonus d’Initiative) Rounds'
  },
  'The Second Portent of Amul': {
    duration: '(Bonus d’Initiative) Rounds'
  },
  'Le Second Signe d’Amul': {
    duration: '(Bonus d’Initiative) Rounds'
  },
  'Apothéose Verdoyante': {
    effects: { type: 'resurrection', special: 'verdant-apotheosis', aoe: true }
  },
  'Bouclier de Saphery': {
    effects: { type: 'ward', ward: 9, special: 'shield-of-saphery' }
  },
  'Scythe of Shyish': {
    effects: { type: 'special', special: 'scythe-of-shyish' }
  },
  'La Faux de Shyish': {
    effects: { type: 'special', special: 'scythe-of-shyish' }
  },
  'Daemonbane': {
    effects: { type: 'special', special: 'daemonbane' }
  },
  'Fléau des Démons': {
    effects: { type: 'special', special: 'daemonbane' }
  }
};

/**
 * Résout les paramètres V5 retenus d'un sort (NI, durée, portée, cible).
 */
// Domaines V5, livre pp. 245–255 ; décisions du MJ du 11 octobre. Remplace les adaptations héritées de V4.
const DOMAIN_V5 = {
  'Caress of Laniph': { target:'1 (maximum)' },
  'Blinding Light': { range:'Vous',target:'Vous' },
  'Dying Words': {assisted:['Le MJ vérifie la mort datant de moins d’un jour et interprète la réponse : âge du cadavre et paroles ne sont pas des données du combat. Communication seulement, aucune Action autre que parler, sans résurrection ni contrainte à répondre ; le mort ne ment pas.']},
  'Fare of the Land': {assisted:['Une cible n’a plus besoin de manger ou boire pendant BFM jours ; excrétion normale, verdâtre. Le MJ suit cette subsistance hors combat car la faim et la soif ne sont pas enregistrées.']},
  'Lie of the Land': {assisted:['Contact direct avec la terre et minute de communion à confirmer par le MJ : carte mentale des éléments naturels dans BI miles. Chaque DR dépensé en portée ajoute une minute. Aucun modèle géographique ni horloge de communion n’existe dans le combat.']},
  'Daemonbane': {target:'1 Démon',effects:{type:'special',special:'daemonbane',engagedEnemyConditions:['Aveuglé','Aveuglé','Aveuglé'],engagedEnemyImmuneLore:'light',allowCasterSecondary:true,secondaryWhen:{path:'daemonbane.effect',value:'banished'},secondaryLabel:'Créatures regardant le bannissement dans FM mètres (désignées par le MJ)'},assisted:['Le MJ désigne les créatures regardant le Démon banni dans FM mètres, faute de positions et orientations enregistrées. Éclair : trois Aveuglé, exemption Magie (Lumière), uniquement si le Démon est banni.']},
  'Regenerate': { effects: { type: 'traits', traits: ['Régénération'], roundEffect: { phase: 'startOfRound', regeneration: true } }, assisted: ['Blessures et Critiques causés par le feu exclus : le MJ saisit les Blessures récupérables hors feu, et désigne le Critique récupéré sur 10 (V5 p. 360).'] },
  'Steal Life': { effects: { type: 'damage', damage: { formula: 'BFM + 6', raw: 6, ignoreAp: true, lifeStealRatio: 0.5, magicMissile: true }, casterRemoveConditions: ['Exténué'] } },
  'Purge': { effects: { type: 'condition', conditionsPerSl: 'Enflammé', specialState: { purging: true } }, assisted: ['Le MJ confirme les matières inflammables et la Corruption de la zone ; maintien : Focalisation +0 chaque Action, Résistance −1 toutes les 30 minutes, fatigue et fin sur échec. Le temps nécessaire dépend du foyer de Corruption.'] },
  'Cauterise': { effects: { type: 'healing', healing: { amount: 1, loreAmount: { lore: 'fire', formula: '1 + DR' } }, removeConditions: ['Hémorragique'], specialState: { preventsInfection: true }, secondaryTest: { actor: 'target', mandatory: true, skill: 'Endurance', stat: 'E', modifierSl: 0, rollField: 'enduranceRoll', exceptLore: 'fire', outcomeOnly: true, astoundingCondition: 'Sonné' } }, assisted: ['Cicatrice permanente sur échec stupéfiant : à reporter sur la fiche par le MJ.'] },
  'Crown of Flame': { effects: { type: 'traits', traits: ['Peur (1)'], talents: ['Chef de guerre'], loreTestBonus: { lore: 'fire', amount: 1 } } },
  'Firewall': { effects: { type: 'special', specialState: { firewall: true }, triggered: { event: 'crossing', missile: 4, conditions: ['Enflammé'] } }, assisted: ['Mur : BFM mètres × 1 × 1 ; la surpuissance de zone multiplie la longueur. Le MJ désigne les traversées, indépendantes de la création du mur.'] },
  'Flaming Hearts': { range:'Vous', effects: { type: 'special', removeConditions: ['Brisé','Exténué'], targetRule: { alliesOnly: true }, specialState: { mayTestFrenzy: true }, optionalTargetTest:{choiceKey: 'takeFrenzy',rollField: 'frenzyRoll',label: 'Frénésie',stat: 'FM',modifierSl:0,successCondition:{kind: 'talent-active',key: 'frenzy',name: 'Frénésie',level:1}} }, assisted: ['Chaque allié peut entreprendre son Test de Frénésie ; choix du joueur/MJ, pas un état automatique.'] },
  'Flaming Sword of Rhuin': { target:'1 épée (arme de base)',effects: { type: 'special', weaponBonus: { replaceDamageBonus: 6, magical: true, qualities: ['damaging','magical'], hitConditions: ['Enflammé'], fumbleCondition: { name: 'Enflammé', exceptLore: 'fire' } }, facts: [{ key: 'objectId', label: 'Épée désignée (arme de base)', type: 'object',weaponsOnly:true,perTarget:true }] } },
  'Great Fires of U’Zhul': { target:'1 (maximum) + ZdE (Bonus de Force Mentale) mètres',effects: { type: 'magic-missile', missile: { damage: 10, ignoreAp: true }, aoe: true, primarySplash: { damage: 5, conditions: ['Enflammé','Enflammé','À Terre'] }, roundEffect: { phase: 'endOfRound', damage: { formula: 'BFM + 5', ignoreAp: true }, conditions: ['Enflammé'], presence: true } }, assisted: ['Premier destinataire = centre de l’explosion ; les autres subissent +5. À chaque fin de Round, la présence dans la zone doit être confirmée.'] },
  'Fate’s Fickle Fingers': { treatment:'narrative',effects: { type: 'narrative', specialState: { assistedReminder:'Réserve commune de Chance des alliés, premier demandeur servi ; redistribution équitable à la fin.' }, targetRule: { alliesOnly: true, exceptLore: 'heavens' } }, assisted: ['Chance : pool commun tenu par le MJ, premier demandeur servi ; redistribution équitable à l’expiration. Les compteurs personnels du Store ne représentent pas un pool partagé, donc ils ne sont pas dupliqués.'] },
  'The Third Portent of Amul': { duration: 'Initiative Rounds' },
  'Starcrossed': { range:'Initiative mètres',treatment:'narrative',effects: { type: 'narrative', specialState: { assistedReminder:'Le lanceur peut dépenser sa Chance pour imposer une relance à la cible.' } }, assisted: ['Le lanceur dépense sa Chance pour imposer une relance du Test choisi ; résultat du nouveau dé à saisir dans le Test. Pas d’interdiction de Chance ni relance automatique des réussites.'] },
  'Comet of Casandora': { duration: 'Spécial', effects: { type: 'special', aoe: true, roundEffect: { phase: 'endOfRound', after: 1, once: true, presence: true, guidance: true, damage: { formula: 'BFM + 18', magicMissile: true }, conditions: ['Enflammé','À Terre'] } }, assisted: ['À la fin du prochain Round : CT −3 ou Savoir (Astronomie) +2. Réussite : +BFM mètres par DR ; échec : 1d10 mètres par DR négatif, direction fixée par le MJ. Le MJ confirme ensuite les destinataires de l’impact.'] },
  'Feather of Lead': { effects: { type: 'special', encumbrance: true, facts: [{ key: 'encumbranceMode', label: 'Plume de plomb : effet commun', type: 'select', options: [['heavier','Deux paliers plus encombré'],['lighter','Aucun encombrement']] }, { key: 'encumbranceStep', label: 'Palier d’encombrement actuel (0 à 3)', type: 'number', min: 0, max: 3, perTarget:true }, {key:'unburdenedM',label:'Mouvement sans encombrement',type:'number',min:0,max:99,perTarget:true},{key:'unburdenedAg',label:'Agilité sans encombrement',type:'number',min:0,max:300,perTarget:true}] }, assisted: ['Le MJ renseigne le palier, M et Ag sans encombrement pour chaque cible, car le poids d’inventaire n’est pas enregistré. Minima p. 299 appliqués en couche ; au troisième palier, mouvement interdit sans nouveau malus d’Ag. Fatigue de voyage et désavantage de Résistance restent des rappels car le voyage n’est pas modélisé.'] },
  'Transmutation of Chamon': { effects: { type: 'magic-missile', missile: { damage: 9, ignoreBe: true, ignoreAp: true }, apModifiers: { all: 1 }, conditions: ['Aveuglé','Assourdi','Sonné'], lockConditions: true, specialState: { suffocating: true }, roundEffect: { phase: 'endOfRound', suffocation: true } }, assisted: ['Une cible morte sous le sort garde sa gangue métallique : conséquence narrative permanente à noter.'] },
  'Crucible of Chamon': { target:'1 objet',effects: { type: 'magic-missile', missile: { damage: 6, ignoreAp: true }, damageWhenFact: 'objectWorn', facts: [{ key: 'objectId', label: 'Objet métallique désigné', type: 'object',perTarget:true }, { key: 'objectMetal', label: 'Objet en métal', type: 'boolean', expected: true }, { key: 'objectMagical', label: 'Objet magique', type: 'boolean', expected: false }, { key: 'objectWorn', label: 'Objet porté sur le corps', type: 'boolean' }], specialState: { objectMelted: true } }, assisted: ['Objet détruit, métal récupérable à sa valeur initiale ; un objet tenu est lâché sans blesser son porteur. Inventaire permanent à confirmer sur la fiche.'] },
  'Enchant Weapon': { range:'1 mètre',effects: { type: 'special', weaponBonus: { damageFormula: 'BFM', magical: true, qualities: ['magical','unbreakable'] }, facts: [{ key: 'objectId', label: 'Arme non magique désignée', type: 'object',perTarget:true,weaponsOnly:true }] }, assisted: ['Qualité ajoutée ou défaut retiré à +3 DR : nom et compatibilité choisis par le MJ, mutation de l’arme à noter pour la durée.'] },
  'Fool’s Gold': { duration: 'Force Mentale minutes', effects: { type: 'special', specialState: { metalIsGold: true } }, assisted: ['Objet métallique non magique désigné et conséquences de son poids/matière : MJ, aucun profil d’objet complet dans le combat. Retour au métal initial à l’expiration.'] },
  'Forge of Chamon': { duration: 'Force Mentale minutes', effects: { type: 'special', specialState: { itemQualityChanges: 1 } }, assisted: ['Une Qualité d’objet ajoutée ou un Défaut retiré de base, plus une par +2 DR ; objet, Qualité/Défaut et compatibilité à choisir par le MJ, inventaire hors du modèle de combat.'] },
  'Mutable Metal': { effects: { type: 'special', specialState: { malleableMetal: true } }, assisted: ['Objet métallique non magique désigné. Travail complexe : Art/Métier approprié +2 avec accord du MJ ; modification matérielle du projet hors du modèle de combat.'] },
  'Wyssan’s Wildform': { effects: { type: 'stat-modifiers', statModifiers: { M: 1, F: 30, E: 30 }, traits: ['Belliqueux','Morsure (BF+1)','Peur (1)','Frénésie','Magique','Foulée (Forêts)'], specialState: { blockedSkillFamilies: ['language','lore'] } } },
  'Flock of Doom': { target:'ZdE (Bonus de Force Mentale) mètres',effects: { type: 'special', aoe: true, targetRule: { exceptLore: 'beasts' }, conditions: ['Aveuglé'], lockConditions: true, roundEffect: { phase: 'endOfRound', damage: { formula: '7', location: 'HEAD' }, presence: true } }, assisted: ['Nuée dans la zone : +1 Aveuglé maintenu ; déplacement par Action avec Charme Animal +2. Le MJ confirme la présence à chaque fin de Round.'] },
  'Amber Talons': { duration: 'Bonus de Force Mentale Rounds', effects: { type: 'special', weaponBonus: { replaceDamageBonus: 4, unarmedOnly: true, magical: true, removeQualities: ['undamaging'], qualities: ['magical'], hitConditions: ['Hémorragique'], onWoundsOnly: true }, talents: ['Escalade des surfaces abruptes'] } },
  'Beast Master': { duration: 'Bonus de Force Mentale jours', effects: { type: 'special', targetRule: { requiredTrait: 'bestial', allowedSizes: ['small','average','large'] }, specialState: { controlledByCaster: true } }, assisted: ['Suit les ordres simples et défend son maître jusqu’à la mort ; après expiration ne l’attaque pas spontanément. Relations/ordres des PNJ arbitrés par le MJ.'] },
  'Beast Tongue': { duration: 'Force Mentale minutes', effects: { type: 'special', testModifiers: { Dressage: 2, 'Charme Animal': 2 }, specialState: { speakWithAnimals: true, cannotCast: true, cannotDispel: true, beastSpeechOnly: true } }, assisted: ['Seules les créatures Bestiales sont intelligibles ; elles ne sont pas contraintes de répondre. Langues civilisées impossibles, communication par gestes.'] },
  'Hunter’s Hide': { duration: 'Bonus de Force Mentale Rounds', effects: { type: 'stat-modifiers', statModifiers: { E: 20 }, traits: ['Vision dans le noir','Peur (1)'], talents: ['Sens aiguisé (Odorat)'] } },
  'The Amber Spear': { target: '1 (maximum)', effects: { type: 'magic-missile', missile: { damage: 8, chosenLocation: true, ignoreNaturalArmor: true }, conditions: ['Hémorragique'], facts: [{ key: 'location', label: 'Localisation choisie (Lance d’Ambre)', type: 'select', options: [['HEAD','Tête'],['BODY','Corps'],['RIGHTARM','Bras droit'],['LEFTARM','Bras gauche'],['RIGHTLEG','Jambe droite'],['LEFTLEG','Jambe gauche']] },{key:'naturalArmorAp',label:'PA de cuir, fourrure ou peau ignorés sur la localisation',type:'number',min:0,max:99}] }, assisted:['Le MJ déclare les PA de cuir, fourrure ou peau de la localisation choisie ; la simple valeur d’armure du participant ne donne pas leur matériau. Les PA restants, dont le métal et les couches magiques, sont conservés.'] },
  'Lifebloom': { duration: 'Instantané', effects: { type: 'special', specialState: { lifebloom: true } }, assisted: ['Rivière, puits, culture ou animal domestique choisi par le MJ : eau rendue, purification, maturité ou maladies guéries. Aucune guérison de Blessures ; données agricoles et maladies absentes du modèle de combat.'] },
  'Barkskin': { effects: { type: 'stat-modifiers', statModifiers: { E: 20, Ag: -10, Dex: -10 } } },
  'Earthblood': { effects: { type: 'special', aoe: true, facts: [{ key: 'directEarth', label: 'Lanceur en contact direct avec la terre', type: 'boolean', expected: true }], roundEffect: { phase: 'startOfRound', healing: 'BFM', presence: true, directEarth: true, livingOnly: true } } },
  'Earthpool': { range:'Force Mentale mètres',effects: { type: 'special', specialState: { underground: true }, roundEffect: { phase: 'startOfRound', once: true, emerge: true } }, assisted: ['Destination dans la portée FM, eau possible, roche solide impossible. Le MJ désigne la créature sous l’émergence : À Terre, repoussée de 1 mètre dans une direction à fournir.'] },
  'Forest of Thorns': { effects: { type: 'special', facts: [{ key: 'patchEarth', label: 'La zone est une parcelle de terre', type: 'boolean', expected: true }], specialState: { forestOfThorns: true }, triggered: { event: 'traversing', test: { skill: 'Athlétisme', stat: 'Ag', modifierSl: -2 }, conditions: ['Hémorragique','Enchevêtré'], entangleStrength: 'FM', exceptLore: 'life' } }, assisted: ['Les végétaux restent après le sort mais perdent leur magie ; le MJ désigne chaque traversée à pied.'] },
  'Phâ’s Protection': { effects: { type: 'special', aoe: true, specialState: { corruptionImmune: true, hostileEntryBlocked: true }, hostileConditions: ['Brisé'], lockConditions: true }, assisted: ['Démons, Morts-vivants et mutants : entrée interdite, Brisé tant qu’ils restent dans la zone. Le MJ déclare les mutations et la sortie de zone.'] },
  'Banishment': { effects: { type: 'special', aoe: true, banishUnstable: true }, assisted: ['Seuls Démons/Morts-vivants avec E < FM du lanceur : Instable ajouté, ou 0 B si déjà Instable.'] },
  'Healing Light': { effects: { type: 'healing', healing: { amountFormula: 'BI' }, removeConditions: ['Empoisonné'], specialState: { purified: true } }, assisted: ['Poisons et intoxicants purgés ; facultativement Focalisation Hysh −3 pour retirer 1 Corruption acquise dans la dernière heure. Historique/compteur permanent de Corruption : fiche et décision MJ.'] },
  'Net of Amyntok': { duration: 'Bonus d’Intelligence Rounds', effects: { type: 'special', targetRule: { exceptTrait: 'bestial' }, movementSet: 0, conditions: ['Sonné'], lockConditions: 'until-recovery', specialState: { recoveryStat: 'Int' } } },
  'Purple Pall of Shyish': { effects: { type: 'armor', apFormula: 'BFM', traits: ['Peur (1)'] } },
  'Sanctify': { effects: { type: 'special', specialState: { undeadBoundary: true } }, assisted: ['Cercle infranchissable dans les deux sens pour les Morts-vivants ; géométrie et passage arbitrés par le MJ. Aucun bonus de Calme ou Résistance.'] },
  'Swift Passing': { effects: { type: 'special', killAtZero: true }, assisted: ['Mort à 0 B seulement, impossibilité d’animation en Mort-vivant ; statut permanent de la fiche à confirmer par le MJ.'] },
  'Choking Shadows': { effects: { type: 'condition', conditions: ['Exténué'], specialState: { cannotSpeak: true, suffocating: true }, roundEffect: { phase: 'endOfRound', suffocation: true } } },
  'Doppelganger': { effects: { type: 'special', facts: [{ key: 'familiar', label: 'Humanoïde familier validé par le MJ', type: 'boolean', expected: true }], specialState: { disguise: true, detection: { skill: 'Intuition', stat: 'I', modifierSl: -1, requiresSecondSight: true } } }, assisted: ['Identité imitée et manières : MJ ; Seconde vue seulement, Intuition −1 opposée au Test d’incantation, gagne strictement pour déceler le déguisement.'] },
  'Illusion': { effects: { type: 'special', specialState: { illusion: true, detection: { skill: 'Intuition', stat: 'I', modifierSl: -1, requiresSecondSight: true } } }, assisted: ['Image choisie par le MJ. Détection via Seconde vue + Intuition −1 opposée ; n’annule pas l’illusion. Animation pour un Round : Action et Focalisation Ulgu −2.'] },
  'Mindslip': { effects: { type: 'special', specialState: { memoryOfCasterHidden: true } }, assisted: ['À l’expiration, le lanceur peut demander Int +2 opposé au Test d’incantation ; échec : oubli permanent jusqu’à dissipation. Choix et souvenir concernés : MJ.'] },
  'Mystifying Miasma': { effects: { type: 'condition', targetRule: { exceptLore: 'shadow' }, conditions: ['Aveuglé','Assourdi','Exténué'], lockConditions: true, specialState: { moveTest: { skill: 'Perception', stat: 'I', modifierSl: 0, failConditions: ['À Terre'] } } } },
  'Shadowsteed': { target:'1 (maximum)',effects: { type: 'summon',maxTargets:1, summonProfile: 'horse', summonNightTraits: ['Vision dans le noir','Éthéré','Peur 1','Magique','Insensible à la douleur','Protection 9+'], facts: [{key:'sunlight',label:'Destrier exposé au soleil',type:'boolean'},{key:'minutesToDawn',label:'Minutes avant la prochaine aube',type:'number',min:1,max:1440}], specialState: { shadowsteed: true } }, assisted: ['Cheval V5 p. 327, infatigable, sans nourriture. Équitation +2 pour Ombres, −2 sinon : le MJ désigne le cavalier et son Test. Changement d’exposition au soleil : traits à actualiser par le MJ car l’éclairage n’est pas enregistré. À l’aube saisie, disparition automatique ; chute du cavalier à résoudre selon sa hauteur réelle, absente du combat.'] },
  'Shroud of Invisibility': { effects: { type: 'special', specialState: { invisible: true, detection: { skill: 'Perception', stat: 'I', modifierSl: 0, requiresSecondSight: true }, endsOnAttackOrNoise: true } }, assisted: ['Seconde vue + Perception opposée remarque une présence sans sa position exacte. Le MJ signale le bruit fort ou l’attaque pour mettre fin à la couche ; autres sens restent possibles. Aucun bonus universel de Discrétion ni malus de tir inventé.'] },
};

// Arcanes et mineurs : V5 pp. 240–245, traits pp. 357–363 et armes p. 301, relus le 12 octobre.
const ARCANE_PETTY_V5 = {
 'Aethyric Arms': {effects:{type:'special',conjureWeapon:true,facts:[{key:'weaponKey',label:'Arme aethyrique : modèle (V5 p. 301)',type:'select',options:Object.entries(ARCANE_WEAPON_PROFILES).map(([key,p])=>[key,p.name])},{key:'weaponSkillScore',label:'Arme aethyrique : valeur du Corps à corps utilisé (si absent de la fiche)',type:'number',min:0,max:300,optionalFromWeaponSkill:true}]},assisted:['Arme à une ou deux mains selon p. 301 ; valeur de compétence déclarée par le joueur. Lance sans Charge, lance et épée bâtarde à une main : adaptations de profil à confirmer pour l’attaque. La fiche permanente reste intacte.']},
 'Aethyric Armour': {effects:{type:'armor',apModifiers:{all:1}}},
 'Arrow Shield': {effects:{type:'special',ward:1,wardFilter:{all:['ranged','organicProjectile','external']},aoe:true},assisted:['Le MJ déclare les occupants de la zone et la provenance des projectiles ; métal seul et sort sans matière organique passent.']},
 'Breath': {range:'Spécial',effects:{type:'special',breath:{rangeBase:20,rangeBonus:'BFM',radius:'BInitiative',variants:{metal:{damage:4,inventoryDamage:1},beasts:{damage:2,conditions:['Exténué'],cold:true},light:{damage:2,conditions:['Exténué'],cold:true},heavens:{damage:2,conditions:['Sonné'],ignoreMetalAp:true},fire:{damage:5,conditions:['Enflammé']},death:{damage:2,conditions:['Empoisonné']},life:{damage:2,conditions:['Empoisonné']},shadow:{damage:0,smoke:true}}}},assisted:['Cible principale à 20+BFM mètres, voisins dans BI ; distances et visibilité déclarées par le MJ. Acide : armes/armures endommagées de 1, reçu à reporter sur la fiche. Froid : frappe en dernier et défense adverse +1 tant qu’Exténué demeure. Fumée : zone opaque et suffocation BFM Rounds.']},
 'Bridge': {range:'Force Mentale mètres',target:'Spécial',treatment:'narrative',effects:{type:'narrative',receiptFormulas:{longueur:'BFM',largeur:'BFM'},specialState:{assistedReminder:'Pont magique, dimensions maximales déclarées.'}},assisted:['Maximum BFM×BFM mètres ; +BFM à la longueur ou largeur par +2 DR dépensés. Implantation et franchissement sont joués par le MJ, faute de positions.']},
 'Chain Attack': {effects:{type:'magic-missile',missile:{damage:4},chainAttack:true,conditionalMJFacts:true},assisted:['Ordre choisi par le MJ ; chaque rebond doit être la cible la plus proche dans BFM mètres. Le seuil lit les Blessures réellement causées après Protection ; maximum BFM rebonds, +1 par +2 DR dépensés.']},
 'Corrosive Blood': {duration:'Bonus d’Endurance Rounds ou heures',effects:{type:'special',durationByFact:{fact:'corrosiveMode',values:{rounds:'Bonus d’Endurance Rounds',hours:'Bonus d’Endurance heures'}},corrosiveBlood:true,facts:[{key:'corrosiveMode',label:'Sang corrosif : effet choisi',type:'select',options:[['rounds','Sang corrosif pendant BE Rounds'],['hours','Parasites éliminés et maladies purgées pendant BE heures']]}]},assisted:['V5 p. 357 : après Blessures, les engagés subissent le même d10 de dégâts, avec BE/PA. Le MJ désigne les engagés, renseigne le dé et les localisations via la clause active ; aucun tirage automatique. Mode heures : parasites/maladies hors données du combat, reçu pour la fiche.']},
 'Dark Vision': {effects:{type:'traits',traits:['Vision dans le noir']}},
 'Distracting': {effects:{type:'traits',traits:['Perturbant'],engagedEnemyTestModifiers:{'Tous les Tests':-2},engagedEnemyLivingOnly:true,secondaryLabel:'Créatures vivantes dans BE mètres (déclarées par le MJ)'},assisted:['V5 p. 358 : −2 DR à tous les Tests des vivants dans BE mètres, une fois seulement. Le MJ signale sortie/entrée de la zone.']},
 'Dome': {effects:{type:'ward',ward:6,wardFilter:{any:['magical','ranged'],all:['external']},aoe:true}},
 'Drop': {effects:{type:'special',dropHeldObject:true,secondaryTest:{actor:'target',mandatory:true,skill:'Dextérité',stat:'Dex',modifierSl:0,rollField:'resistanceRoll'},facts:[{key:'objectId',label:'Chute : objet tenu',type:'object',perTarget:true},{key:'objectHeld',label:'Chute : objet actuellement tenu',type:'boolean',expected:true,perTarget:true}]},assisted:['Objet lâché sur échec de Dex +0 ; retrait de main et récupération de l’objet à jouer, sans modification de la fiche. −1 DR par palier propre de +2 DR.']},
 'Entangle': {range:'Bonus de Force Mentale mètres',duration:'Bonus de Force Mentale Rounds',effects:{type:'condition',conditions:['Enchevêtré'],entangleStrength:'FM',expireConditions:true}},
 'Fearsome': {effects:{type:'traits',traits:['Peur (1)']},assisted:['Tests étendus de Psychologie des témoins : procédure Peur p. 183, personnes exposées désignées par le MJ.']},
 'Flight': {effects:{type:'special',flyRating:true,facts:[{key:'flying',label:'Envol : actuellement en vol',type:'boolean'}],specialState:{flightAvailable:true}},assisted:['V5 p. 358 : déplacement jusqu’à Athlétisme mètres ; obstacles ignorés, Charge possible. En vol : −2 DR aux tirs, cibles volantes à une bande de portée plus loin ; position, hauteur et chute sont déclarées par le MJ.']},
 'Magic Shield': {effects:{type:'special',dispelBonusSlFormula:'BFM'}},
 'Move Object': {effects:{type:'special',receiptFormulas:{dimensionMax:'1 + DR',force:'FM',distance:'BFM'},receiptOvercast:{distance:{id:'distance',perFormula:'BFM'}},facts:[{key:'objectId',label:'Déplacement : objet désigné',type:'object',perTarget:true},{key:'objectSentient',label:'Déplacement : objet conscient',type:'boolean',expected:false},{key:'objectDimension',label:'Déplacement : plus grande dimension (m)',type:'number',min:0,max:999,integer:false}],specialState:{objectMovement:true}},assisted:['Dimension maximale 1+DR final mètres, déplacement BFM mètres ; Force effective FM. Obstruction : FM/Force opposées via la clause active. Destination physique jouée par le MJ ; +BFM de déplacement par +2 DR.']},
 'Mundane Aura': {effects:{type:'special',specialState:{magicAuraHidden:true,cannotCastOther:true,endsOnEvents:['channelling']}},assisted:['Toutes les auras du corps et possessions masquées ; la tentative effective de Focalisation met fin à la couche, même ratée.']},
 'Push': {target:'ZdE (Bonus de Force Mentale) mètres maximum',effects:{type:'special',aoeMaximum:true,excludeCaster:true,rolledDamage:{sides:10,ignoreAp:true},conditions:['À Terre'],collisionConditions:['À Terre'],receiptFormulas:{repousse:'BFM'},receiptOvercast:{repousse:{id:'push',perFormula:'BFM'}}},assisted:['Zone de rayon BFM au maximum ; chaque cible prend son d10 moins BE, puis À Terre. Collision avec une créature de taille égale ou inférieure : À Terre sans dégâts ; les collisions physiques sont désignées par le MJ. +BFM de distance par +2 DR.']},
 'Teleport': {range:'Vous',effects:{type:'special',receiptFormulas:{distanceMax:'BFM + DR'},specialState:{teleport:true}},assisted:['Destination dans BFM+DR final mètres, obstacles ignorés ; déplacement joué par le MJ, sans coordonnées dans le combat.']},
 'Terrifying': {effects:{type:'traits',traits:['Terreur (1)']},assisted:['Psychologie et Brisé des témoins : procédure Terreur p. 184 ; les personnes exposées sont désignées par le MJ.']},
 'Ward': {effects:{type:'ward',ward:7}},
 'Animal Friend': {effects:{type:'special',targetRule:{requiredTrait:'bestial'},animalFriend:true,facts:[{key:'casterSize',label:'Amitié : Taille du lanceur (1 à 7)',type:'number',min:1,max:7},{key:'targetSize',label:'Amitié : Taille de l’animal (1 à 7)',type:'number',min:1,max:7,perTarget:true}],specialState:{animalTrust:true}},assisted:['Bestial et strictement plus petit ; confiance/amitié, pas d’ordre forcé ni de bonus de Dressage inventé. Le comportement est joué par le MJ.']},
 'Bearings': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'Le lanceur sait où est le nord.'}}},
 'Careful Step': {effects:{type:'special',specialState:{organicGroundUnharmed:true}},assisted:['Pistage adverse −3 DR en terrain rural ; terrain et poursuivant sont hors données spatiales du combat. Aucun bonus personnel de Pistage.']},
 'Conserve': {target:'Spécial',treatment:'narrative',effects:{type:'narrative',receiptFormulas:{rationJoursMax:'1',conservationJours:'BFM'},specialState:{assistedReminder:'Rations conservées, facteurs externes restent possibles.'}}},
 'Dart': {effects:{type:'magic-missile',missile:{damage:0}}},
 'Dazzle': {effects:{type:'condition',conditions:['Aveuglé'],roundEffect:{phase:'startOfRound',conditions:['Aveuglé']}}},
 'Drain': {effects:{type:'magic-missile',missile:{damage:0,ignoreAp:true},casterHealing:1}},
 'Eavesdrop': {effects:{type:'special',specialState:{distantHearing:true}},assisted:['Écoute de la voix à distance comme à côté de la cible ; aucun +2 Perception. Ce qui est dit est joué par le MJ.']},
 'Gust': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'Rafale brève : bougie, porte ou papiers ; aucun dégât ni état.'}}},
 'Light': {effects:{type:'special',specialState:{illumination:'torche',controlTest:{actor:'caster',skill:'Force Mentale',stat:'FM',modifierSl:2,options:[['lanterne','Lanterne'],['bougie','Bougie'],['torche','Torche']],field:'illumination'}}}},
 'Magic Flame': {effects:{type:'special',specialState:{palmFlame:true}},assisted:['Flamme naturelle, chaleur et objets inflammables ; le lanceur n’est pas brûlé. L’objet allumé est désigné par le MJ.']},
 'Marsh Lights': {effects:{type:'special',receiptFormulas:{nombreMax:'BIntelligence'},specialState:{marshLights:true,controlTest:{actor:'caster',skill:'Force Mentale',stat:'FM',modifierSl:2,action:true,lineOfSight:true,options:[['move','Déplacer en ligne droite à l’allure de marche']],field:'lastControl'}}},assisted:['Maximum Bonus d’Intelligence feux ; ligne de vue requise pour le contrôle, une Action, FM +2. Coordonnées et trajectoire à jouer, aucun bonus de combat inventé.']},
 'Murmured Whisper': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'Voix depuis un point dans FM mètres, sans ligne de vue ; audible par tous à portée d’oreille.'}}},
 'Open Lock': {target:'1',treatment:'narrative',effects:{type:'narrative',facts:[{key:'nonMagicalLock',label:'Serrure touchée non magique',type:'boolean',expected:true}],specialState:{assistedReminder:'La serrure non magique touchée s’ouvre.'}}},
 'Produce Small Animal': {treatment:'narrative',effects:{type:'narrative',facts:[{key:'localAnimalAvailable',label:'Petit animal approprié présent localement',type:'boolean'},{key:'animalDescription',label:'Petit animal produit (description locale)',type:'text',requiredWhen:{key:'localAnimalAvailable',value:true}}],specialState:{assistedReminder:'Animal local seulement ; aucun animal ni profil numérique inventé.'}},assisted:['Si aucun animal approprié, aucun animal produit. Tempérament non garanti ; le MJ joue l’animal ou ajoute un profil sourcé séparément.']},
 'Protection from Rain': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'Lanceur et possessions secs sous les précipitations ; pas contre l’eau stagnante.'}}},
 'Purify Water': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'Un récipient : eau et liquides majoritairement aqueux, impuretés non magiques ôtées, alcool éliminé.'}}},
 'Rot': {effects:{type:'special',rotOrganic:true,facts:[{key:'organic',label:'Putréfaction : matière organique (volume d’un poing)',type:'boolean',expected:true},{key:'rotMode',label:'Putréfaction : matière touchée',type:'select',options:[['leather','Cuir d’armure : −1 PA sur une localisation'],['other','Autre matière organique : reçu MJ']]},{key:'rotLocation',label:'Putréfaction : localisation du cuir',type:'select',options:[['HEAD','Tête'],['BODY','Corps'],['RIGHTARM','Bras droit'],['LEFTARM','Bras gauche'],['RIGHTLEG','Jambe droite'],['LEFTLEG','Jambe gauche']],requiredWhen:{key:'rotMode',value:'leather'}}]},assisted:['Nourriture/tissu et volume du poing : MJ. Un PA physique seulement pour le cuir, aucune couche magique détruite. Fiche d’inventaire à confirmer.']},
 'Shock': {effects:{type:'condition',conditions:['Sonné'],conditionDuration:'1 Round',lockConditions:true}},
 'Sleep': {effects:{type:'condition',sleep:true,expireConditions:true,specialState:{endsOnEvents:['noise','jostle']},facts:[{key:'voluntaryTired',label:'Sommeil : cible consentante et assez fatiguée',type:'boolean',perTarget:true}]}},
 'Sly Hands': {effects:{type:'special',facts:[{key:'objectId',label:'En catimini : objet porté sur soi',type:'object',perTarget:true},{key:'objectTiny',label:'En catimini : objet au plus gros comme le poing',type:'boolean',expected:true},{key:'objectOnPerson',label:'En catimini : objet sur la personne',type:'boolean',expected:true}],specialState:{objectToHand:true}},assisted:['Téléportation dans la main ; la position réelle et les mains libres ne sont pas enregistrées. Aucun modificateur d’Escamotage inventé.']},
 'Sounds': {effects:{type:'special',specialState:{sounds:true,controlTest:{actor:'caster',skill:'Force Mentale',stat:'FM',modifierSl:2,options:[['move','Déplacer'],['louder','Augmenter le volume'],['quieter','Diminuer le volume']],field:'lastControl'}}},assisted:['Bruits vagues, aucun message intelligible ; point dans FM mètres, sans ligne de vue, FM +2 pour modifier.']},
 'Spring': {effects:{type:'special',roundEffect:{phase:'endOfRound',quantityPerRound:1,quantityMaxFormula:'BInitiative',unit:'pinte'},specialState:{waterSpring:true}},assisted:['1 pinte par Round, au maximum Bonus d’Initiative pintes ; reçus calculés depuis l’horloge, aucun stock d’eau ni compteur d’inventaire.']},
 'Twitch': {range:'Moitié de la Force Mentale mètres',target:'1',effects:{type:'special',dropHeldObject:true,secondaryTest:{actor:'target',mandatory:true,skill:'Dextérité',stat:'Dex',modifierSl:2,rollField:'resistanceRoll',whenFact:'objectHeld'},facts:[{key:'objectHeld',label:'Secousse : objet tenu par la cible',type:'boolean',perTarget:true}]},assisted:['Mouvement léger d’objet ; objet tenu lâché seulement sur échec de Dex +2. Aucun malus de Dex ni résistance Endurance.']},
 'Warning': {treatment:'narrative',effects:{type:'narrative',specialState:{assistedReminder:'L’objet à 1 mètre révèle immédiatement poison, infection ou piège.'}}}
};


function resolveV5SpellParameters(item) {
  const cName = item.source?.canonical?.name || item.name;
  const override = V5_PARAMETER_OVERRIDES[cName] || V5_PARAMETER_OVERRIDES[item.name] || V5_PARAMETER_OVERRIDES[item.id] || {};

  let cn = override.cn !== undefined ? override.cn : Number(item.source?.values?.cn ?? 0);
  let duration = override.duration || item.source?.values?.duration || 'Instantané';
  let range = override.range || item.source?.values?.range || 'Vous';
  let target = override.target || item.source?.values?.target || 'Vous';

  // Compléter à partir des notes de correction si non spécifié explicitement
  const notes = (item.correctionNotes || []).join(' ');
  if (override.cn === undefined && notes) {
    const niMatch = notes.match(/\bNI\s*(\d+)\b/i);
    if (niMatch) {
      cn = Number(niMatch[1]);
    }
  }
  if (!override.duration && notes) {
    const durMatch = notes.match(/durée\s+([A-Za-zÀ-ÿ0-9’'()\s]+?(?:Rounds?|minutes?|heures?|jours?|Instantané|Tour))/i);
    if (durMatch && durMatch[1].trim()) {
      duration = durMatch[1].trim();
    }
  }
  if (!duration || !String(duration).trim()) {
    duration = item.source?.values?.duration || 'Instantané';
  }
  if (!range || !String(range).trim()) {
    range = 'Vous';
  }
  if (!target || !String(target).trim()) {
    target = 'Vous';
  }

  if(['Aethyric Arms','Aethyric Armour','Arrow Shield','Bridge','Flight'].includes(cName))duration='Bonus de Force Mentale Rounds';
  const units=value=>String(value).replace(/\bmetres\b|(?<!\p{L})m(?!\p{L})/gu,'mètres');
  return { cn, duration, range:units(range), target:units(target) };
}

/**
 * Calcule les options d'overcasting autorisées selon les règles V5.
 */
function buildOvercastOptions(item, domain, params, effConfig = {}, domainVerified = false) {
  if (domain === 'petty' || domain === 'elven-petty') {
    return {
      allowed: false,
      options: [],
      reason: 'Sort mineur (surpuissance interdite en V5)'
    };
  }

  const range = String(params?.range || item.source?.values?.range || '').trim();
  const target = String(params?.target || item.source?.values?.target || '').trim();
  const duration = String(params?.duration || item.source?.values?.duration || '').trim();

  const options = [];

  // 1. Portée (range)
  const isPersonalOrTouch = /^(vous|contact|toucher|touch|personnel|sp[eé]cial|zde|zone|aoe|ligne de vue|vortex)/i.test(range);
  if (!isPersonalOrTouch && !effConfig.vortex) {
    options.push('range');
  }

  // 2. Durée (duration)
  // Le lot 1 vérifie les durées « Spécial » des Domaines ; les autres familles gardent leur contrat de départ.
  const isInstantOrSpecial = (domainVerified ? /^(instantan|sp[eé]cial)/i : /^(instantan|special)/i).test(duration) || Boolean(effConfig.summonProfile);
  if (!isInstantOrSpecial) {
    options.push('duration');
  }

  // 3. Zone d'effet (aoe)
  const hasAoe = /zde|zone|aoe/i.test(target) || Boolean(effConfig.aoe);
  if (hasAoe && !effConfig.aoeMaximum) {
    options.push('aoe');
  }

  // 4. Dégâts (damage)
  // V5 p. 236 : seule l'amélioration des dégâts d'un projectile magique existe ; les formules de dégâts propres au sort sont exclues.
  const hasDamage = Object.values(effConfig.factModes?.values || {}).some(v=>v.missile) || effConfig.type === 'magic-missile' || Boolean(effConfig.missile) || Boolean(effConfig.damage?.magicMissile) || Boolean(effConfig.roundEffect?.damage?.magicMissile || effConfig.roundEffect?.magicMissile) || effConfig.vortex?.missile!==undefined;
  if (hasDamage) {
    options.push('damage');
  }

  // 5. Cibles (targets)
  const isPersonalOnly = /^(vous)$/i.test(target);
  // Kadon : une seule cible, l'autre cible est une option payée à part (+4 DR, option spéciale).
  // WoM pp. 20, 23 : portée Vous = le lanceur seul ; cible « Spécial » ou « 1 (max) » non extensible.
  const targetsLocked = /^(sp[eé]cial)/i.test(target) || /\(max/i.test(target) || /^vous/i.test(range);
  if (!isPersonalOnly && !hasAoe && !targetsLocked && effConfig.special !== 'transformation-of-kadon') {
    options.push('targets');
  }

  // 6. Option spéciale de surpuissance (ex: Main de Gloire +3/+6/+8 DR, Apothéose +3/+6/+10 DR, Destruction des Arcanes +8 DR,
  // trait optionnel de Forme bestiale +2 DR, trait optionnel ou autre cible de Kadon +4 DR)
  if (['hand-of-glory', 'apotheose', 'arcane-unforgiving', 'beast-form', 'transformation-of-kadon'].includes(effConfig.special) || effConfig.overcastFortunePer2Sl) {
    options.push('special');
  }

  return {
    allowed: true,
    options
  };
}

/**
 * Normalise le traitement (treatment)
 */
function normalizeTreatment(item) {
  if (Array.isArray(item.scopes) && item.scopes.includes('mjInput')) {
    return 'mjInput';
  }
  if (item.treatment === 'Rappel narratif' || (Array.isArray(item.scopes) && item.scopes.includes('narrative') && !item.scopes.includes('engine'))) {
    return 'narrative';
  }
  return 'engine';
}

/**
 * Extrait les rappels (reminders)
 */
function extractReminders(item) {
  const notes = Array.isArray(item.correctionNotes) ? item.correctionNotes : [];
  const plan = item.effectPlan || '';
  const isFicheFollowUp = (item.scopes || []).includes('fiche') || plan.includes('fiche') || plan.includes('suivi') || notes.some(n => n.includes('fiche') || n.includes('suivi'));
  if (isFicheFollowUp || notes.length > 0) {
    return notes.join(' ') || plan;
  }
  return null;
}

// Construction de la collection des contrats (277 identités du catalogue relu)

// WoM pp. 89, 111–112, 124–125, 134–149 : paramètres et clauses relus, adaptation des modificateurs en DR V5.
const womFact=(key,label,type='boolean',extra={})=>({key,label,type,...extra});
const womSpec=(page,cn,range,target,duration,effects,assisted=[],treatment='engine')=>({page,cn,range,target,duration,effects,assisted,treatment});
const womFM='Force Mentale mètres',womBFM='Bonus de Force Mentale Rounds';
const WOM_SOURCE={
 'Sang Bouillonnant':womSpec(134,5,'Contact','1','1 Round',{type:'special',secondaryTest:{actor:'target',mandatory:true,skill:'Résistance',stat:'E',modifierSl:-1,rollField:'resistanceRoll'},conditions:['Aveuglé','Aveuglé'],roundEffect:{phase:'startOfTurn',damage:{formula:'10 + DR',ignoreAp:true}},specialState:{deathBurst:{missile:1,radius:2}}},['Mort provoquée par le sort : explosion sur les destinataires déclarés à 2 mètres.']),
 'Epées Sanguines':womSpec(137,6,womFM,'Vous','Bonus de Force Mentale minutes',{type:'summon',summon:{name:'Épée Sanguine',ws:60,damage:8,fly:20,count:1,max:6,indestructible:true,noMomentum:true,rangeFormula:'FM',requiresAction:true,maxPerTarget:1},specialState:{summonedAttack:true},optionRules:{swords:{summonCountPerStep:1}}},['Direction : une Action à partir du Round suivant, portée et ligne de vue déclarées ; une épée maximum par cible. Défense normale.']),
 'Blizzard enflammé de Ygethmor':womSpec(137,12,womFM,'ZdE Force Mentale mètres',womBFM,{type:'special',roundEffect:{phase:'endOfRound',presence:true,cover:true,damage:{formula:'8 + DR'},test:{skill:'Athlétisme',stat:'Ag',modifierSl:0},failConditions:['À Terre'],ignitionPercent:25},specialState:{assistedReminder:'Couverture solide protège. Chaque objet/terrain inflammable : d100 ≤25 enflamme, à reporter sur le terrain.'}},['Présence/couverture solide et objets/terrain déclarés par le MJ.']),
 'Transe d’Ambre':womSpec(146,4,'Initiative mètres','1','Bonus de Force Mentale minutes',{type:'special',secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:-2,rollField:'resistanceRoll',whenFact:'unwilling'},movementSet:0,durationMode:{fact:'durationMode',values:{normal:'Bonus de Force Mentale minutes'},longMode:'hibernation',quantityFact:'daysUntilSeason',unit:'jours',willingOnly:true},facts:[womFact('unwilling','Transe : cible non consentante','boolean',{perTarget:true}),womFact('durationMode','Transe : durée choisie','select',{options:[['normal','Transe ordinaire'],['hibernation','Hibernation jusqu’au solstice/équinoxe']]}),womFact('daysUntilSeason','Transe : jours jusqu’au terme de la saison','number',{min:1,requiredWhen:{key:'durationMode',value:'hibernation'}})],immunities:{damage:[{filter:null,label:'Transe d’Ambre : statue insensible aux dégâts'}]},specialState:{amberTrance:true,cannotMove:true,endsOnIncomingAttack:true,assistedReminder:'Maladies/poisons suspendus ; soins admis. Une cible consentante peut hiberner jusqu’au solstice/équinoxe (saison de trois mois) ; durée réelle à déclarer, aucun souvenir.'}},['Consentement déclaré ; hibernation et calendrier de fiche : MJ, fin saisonnière.']),
 'Éveil du Bois':womSpec(146,8,womFM,'ZdE Force Mentale mètres','Instantané',{type:'magic-missile',missile:{damage:4},secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:2,rollField:'resistanceRoll',conditionsOnly:true},failConditions:['Enchevêtré','Hémorragique'],entangledStrength:30},['Forêt et occupants réels déclarés ; dégâts toujours, états seulement sur Esquive ratée.']),
 'Malédiction d’Anraheir':womSpec(147,5,womFM,'ZdE Bonus de Force Mentale mètres',womBFM,{type:'special',targetRule:{enemiesOnly:true},statModifiers:{M:-2,CC:-20,CT:-20,Ag:-20},secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:0,rollField:'resistanceRoll',whenFact:'mount',conditionsOnly:true},mountFlee:true,specialState:{zoneModifiers:{inside:{M:-2,CC:-20,CT:-20,Ag:-20},outside:{M:-1,CC:-10,CT:-10,Ag:-10}},mountTest:{skill:'Calme',stat:'FM',modifierSl:0}},facts:[womFact('mount','Anraheir : cible montée','boolean',{perTarget:true})]},['Sortie/rentrée dans la zone déclarée. Monture : Calme +0 ou fuite ; Cavalier : Chevaucher +0 pour calmer, événements spatiaux déclarés.']),
 'Yeux de la Meute':womSpec(147,3,'Contact','1','Force Mentale minutes',{type:'narrative',specialState:{assistedReminder:'Perspective propre ou du lanceur, alternance libre sans limite de portée ; ligne de vue utilisable, aucune incantation par le corps du lanceur.'}},['Vision et destinations ne sont pas des coordonnées du combat.'],'narrative'),
 "Suivi de l'Odeur":womSpec(148,4,'Vous','Vous','Initiative minutes',{type:'test-modifiers',testModifiers:{'Pistage (Odorat)':2,'Perception (Odorat)':2,'Seconde vue (Odorat)':2},specialState:{assistedReminder:'Odorat seulement, y compris Seconde vue ; corruption/mutation des plantes, animaux et excréments perceptible.'}}),
 'Lunes du Chasseur':womSpec(148,8,'Vous','ZdE Force Mentale mètres',womBFM,{type:'stat-modifiers',statModifiers:{M:1,F:10,E:10},targetRule:{alliesOnly:true}}),
 'Le Bœuf Reste Debout':womSpec(149,5,'Vous','ZdE Force Mentale mètres',womBFM,{type:'special',special:'ox-stands',targetRule:{alliesOnly:true},removeBrokenAmount:'DR + 1',fearTerrorImmunity:true}),
 'Ver Grouillant':womSpec(149,4,womFM,'1',womBFM,{type:'condition',conditions:['Enchevêtré'],entangledStrength:50,expireConditions:true,specialState:{wormGrapple:{strength:50,actions:['entangle','leather']}}},['Aucune Blessure de lutte ; seul le cuir réellement porté est corrodé après victoire. Sacs et vêtements : reçu de fiche. Se libérer termine le sort.']),
 'Escalier en Spirale':womSpec(89,6,'Vous','Vous','Bonus de Force Mentale minutes',{type:'special',apModifiers:{all:3},receiptFormulas:{height:'FM'},receiptOvercast:{height:{id:'height',perFormula:'FM',max:200}},specialState:{assistedReminder:'Escalier tangible seulement pour le lanceur et les autres mages de Jade connaissant ce sort qui réussissent Savoir (Magie) +0 ; hauteur ajoutée à la distance des tirs.'}},['Hauteur et admission sur escalier : reçus spatiaux ; pas de positions automatiques.']),
 'Transmogrification Exaltée de Colchis':womSpec(89,6,womFM,'ZdE Force Mentale mètres','Bonus de Force Mentale minutes',{type:'special',removeConditions:['Enflammé'],immunities:{damage:[{filter:{any:['fire']},label:'Colchis : matière initialement affectée dans la zone'}]},specialState:{endsOnEvents:['leave-zone'],assistedReminder:'Feux existants éteints. Objets/participants initialement affectés : non inflammables et immunisés au feu tant que dans la zone. Torches nouvelles peuvent entrer.'}},['Terrain et objets de fiche : reçu MJ ; sortir retire la couche protectrice.']),
 'Apothéose Verdoyante':womSpec(89,16,'Ligne de vue','ZdE Bonus de Force Mentale mètres','Instantané',{type:'resurrection',special:'verdant-apotheosis',aoe:true},['Mort <60 secondes, tête présente ; 1 B par DR final avant surpuissance, plafond Bmax (MJ). Corruption modérée : reçu de Test ; Critiques/membres perdus préservés.']),
 'L’Étreinte d’Iyrtu':womSpec(124,4,'Vous','Vous',womBFM,{type:'special',strengthPerSl:10,grapplingFloor:true,specialState:{grappleFloor:true,assistedReminder:'Attaque d’empoignade : un Test raté compte +0 DR ; utiliser le reçu pour l’opposition réelle, sans inventer de Blessures.'}}),
 'Les Enfants Sauvages de Zandox':womSpec(125,5,'Spécial','Vous',womBFM,{type:'summon',summon:{name:'Chien Sauvage de Zandox',requiresStrengthBonus:true,count:2,ws:50,damage:8,indestructible:true,noMomentum:true,invisible:true,rangeFormula:'4',requiresAction:false,maxPerTarget:2},specialState:{summonedAttack:true,assistedReminder:'Perception −2 permet seulement d’apercevoir les chiens ; aucune attaque contre eux.'}}),
 'Cor du Andar':womSpec(111,5,'ZdE Sociabilité mètres','Vous','Force Mentale minutes',{type:'special',aoe:true,attitudeModifiers:{allies:{Calme:2,Commandement:2},enemies:{Calme:-2,Commandement:-2},neutral:{}},specialState:{assistedReminder:'Ennemi : Test immédiat de Peur (1). Aucun état Brisé/Peur ancien retiré.'}},['Alliés, ennemis, neutres réellement déclarés ; Peur (1) ennemie calculée.']),
 'Visage mutable':womSpec(112,4,'Contact','1','Bonus de Force Mentale heures',{type:'special',facts:[womFact('unwilling','Visage : cible non consentante','boolean',{perTarget:true}),womFact('mode','Visage : apparence choisie','select',{options:[['attractive','Sociabilité +10'],['ugly','Sociabilité −10'],['dead','Apparence morte'],['unknown','Méconnaissable']]})],opposedTest:{casterStat:'FM',targetStat:'FM',targetSkill:'Force Mentale',whenFact:'unwilling',resistOnLoss:true,casterWinsTies:true},statModes:{fact:'mode',values:{attractive:{Soc:10},ugly:{Soc:-10},dead:{M:0},unknown:{}}},stateModes:{fact:'mode',values:{dead:{cannotMove:true,cannotSpeak:true,appearsDead:true},unknown:{unrecognisable:true,assistedReminder:'Retrouver connaissance : le proche voulu teste FM, sans fin automatique du sort.'}}}},['Apparence réelle choisie par MJ, sens préservés dans le mode mort. Reconnaissance FM des proches déclarés.'])
};

WOM_SOURCE['Corps de Feu']=womSpec(134,5,'Vous','Vous','Bonus d’Endurance minutes',{type:'special',specialState:{bodyFire:{grappleFormula:'8 + DR',bloodMissile:3,castingSl:null},assistedReminder:'Habits/équipement immunisés au feu, pas le corps. Chaque empoignade : 8 + DR ; saisir Calme −2 du saisissant pour maintenir. Votre lutte : +1 Enflammé et 8 + DR par Round. Après Blessures de mêlée confirmées, Esquive +0 ou projectile +3 sans PA.'}},['Empoignades réelles et Blessures de mêlée déclarées ; aucune immunité au feu ni bonus F/E.']);
Object.assign(WOM_SOURCE,{
 'Tempête Magmatique':womSpec(136,13,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',womBFM,{type:'special',vortex:{missile:12,conditions:['Enflammé','Enflammé'],fire:true,miniCount:0,miniMax:3},optionRules:{mini:{miniPerStep:1}}},['WoM p. 137 : mouvement ≤8 mètres, mini-vortex de zone BFM, d10 et 2d10 propres, un seul déplacement puis dispersion ; occupants et trajectoires déclarés.']),
 'Orage de Thorsen':womSpec(101,11,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',womBFM,{type:'special',vortex:{missile:8,throw:true}},['WoM p. 100 : projection BFM en direction aléatoire, collision 7 Dégâts, À Terre après arrêt ; positions/obstacles déclarés.']),
 'Cendres et Poussière':womSpec(122,9,'Vortex aléatoire','ZdE 2 × Bonus de Force Mentale mètres',womBFM,{type:'special',vortex:{damage:8,ignoreAp:true,suffocation:true},optionRules:{sun:{sun:true}}},['Suffocation uniquement dans le nuage. Soleil Violet +4 DR : sphère de 1 mètre, Peur (2), Calme +0 ou mort si contact déclaré ; obstacles désintégrés, faits spatiaux MJ.'])
});
// Lot 5A : WoM pp. 74–77, 98–101, 134–137, 147–149. Valeurs explicites ; contexte spatial et fiches en reçus MJ.
const cf=womFact;
const CATALOGUE_EFFECTS={
 'Tête Brûlante':{type:'magic-missile',missile:{damage:4},secondaryTest:{actor:'target',mandatory:true,skill:'Esquive',stat:'Ag',modifierSl:0,rollField:'dodgeRoll',damageOnSuccess:0},conditions:['Enflammé'],fearOnWounds:1,facts:[cf('pathDeclared','Tête : trajectoire rectiligne et occupants confirmés','boolean',{expected:true})]},
 'Flamme Captivante':{type:'condition',secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:0,rollField:'resistanceRoll'},conditions:['Sonné','Sonné','Sonné'],expireConditions:true,specialState:{endsOnIncomingAttack:true},facts:[cf('observersDeclared','Flamme : observateurs aléatoires confirmés','boolean',{expected:true})]},
 'Colérique':{type:'special',exclusiveOptionGroups:[['animosity','hatred']],facts:[cf('ireSubject','Colérique : personne nommée ou désignée','text'),cf('friend','Colérique : cible amie de cette personne','boolean',{perTarget:true})],secondaryTest:{actor:'target',mandatory:true,skill:'Calme',stat:'FM',modifierSl:2,rollField:'resistanceRoll',whenFact:'friend'},traits:['Préjugé (personne déclarée)'],optionRules:{animosity:{traits:['Animosité (personne déclarée)'],duration:'Bonus de Force Mentale jours'},hatred:{traits:['Haine (personne déclarée)'],duration:'Bonus de Force Mentale semaines'}}},
 'Tempête de Flammes':{type:'magic-missile',missile:{damage:8},conditions:['Enflammé','Enflammé','Enflammé','À Terre'],durationOverride:'Instantané',facts:[cf('minutesToDawn','Tempête : minutes avant le prochain lever du soleil','number',{min:1})],receiptFormulas:{diametre:2,hauteur:2},receiptOvercast:{diametre:{id:'size',perFormula:'1'},hauteur:{id:'size',perFormula:'2'}}},
 'Forge de Tarnus':{type:'special',testModifiers:{'Métier (Forgeron)':1},facts:[cf('sourceFire','Forge : forge éteinte désignée','boolean',{expected:true})]},
 'Ignition':{type:'condition',conditions:['Enflammé','Enflammé'],facts:[cf('catalogueMode','Ignition : application','select',{options:[['normal','Enflammer'],['spread','Répartir trois nouveaux Enflammé à 2 mètres']]})],factModes:{fact:'catalogueMode',values:{spread:{type:'special',conditions:[],receiptFormulas:{nouveauxEnflamme:3,rayon:2}}}}},
 'Flamme Inextinguible':{type:'special',exclusiveOptionGroups:[['days','weeks','months']],facts:[cf('catalogueMode','Flamme : sens du sort','select',{options:[['normal','Rendre inextinguible'],['extinguish','Éteindre']]})],durationOverride:'Bonus de Force Mentale heures',factsCalendar:true,optionRules:{days:{duration:'Bonus de Force Mentale jours'},weeks:{duration:'Bonus de Force Mentale semaines'},months:{durationFact:{quantityFact:'monthsDays',unit:'jours'}}}},
 'Flamme Attisée':{type:'special',receiptTargetConditional:{fact:'flammable',when:false,values:{degatsFeuBonus:0,enflammeSupplementaire:0}},facts:[cf('flammable','Flamme Attisée : matière déjà inflammable','boolean',{perTarget:true})],receiptFormulas:{degatsFeuBonus:'DR',enflammeSupplementaire:1}},
 'Esprit du Foyer':{type:'summon',casterSelfDamage:6,selfHarm:{minusBe:true,clause:'WoM p. 136 : mains dans le feu, 6 dégâts moins BE.'},summon:{name:'Esprit du Foyer',wsFormula:'FM',damage:6,requiresStrengthBonus:true,move:3,count:1,indestructible:true,noMomentum:true,rangeFormula:'12',requiresAction:false,maxPerTarget:1,hitConditions:['Enflammé']},facts:[cf('sourceFire','Foyer : mains plongées dans un feu de camp','boolean',{expected:true})]},
 'Goût de Feu':{type:'special',facts:[cf('catalogueMode','Goût de Feu : effet choisi','select',{options:[['normal','Plat épicé : Résistance +4 pour éviter les séquelles'],['alcohol','Une cruche d’un quart de gallon en alcool'],['oil','Un flacon d’une pinte en huile']]})]},
 'Chaleur Desséchante':{type:'special',targetRule:{enemiesOnly:true},receiptFormulas:{degatsFeuBonus:'DR'},facts:[cf('action','Chaleur : course, charge ou fuite déclarée','select',{options:[['none','Aucune'],['run','Courir'],['charge','Charger'],['flee','Fuir']]})],factModes:{fact:'action',values:{run:{conditions:['Exténué']},charge:{conditions:['Exténué']},flee:{conditions:['Exténué']}}}},
 'Arc de T’Essla':{type:'magic-missile',missile:{damage:10},conditions:['Aveuglé']},
 'Polir et Exalter':{type:'special',facts:[cf('glassLens','Polir : lentille ou vitre enchantable','boolean')],optionRules:{astronomy:{requiredFact:'glassLens',testModifiers:{'Savoir (Astronomie)':2}},secondSight:{requiredFact:'glassLens',testModifiers:{'Perception (Seconde vue visuelle)':2}}}},
 'Projection Spirituelle':{type:'special',specialState:{cannotCast:true,cannotSpeak:true}},
 'Arche de Saphir':{type:'special',receiptFormulas:{largeur:4,hauteur:3}},
 'Malédiction du Destin':{type:'test-modifiers',testModifiers:{'Tous les Tests':-1},optionRules:{doom:{receiptOnly:true,rangeFormula:'1609.344'}}},
 'Divination':{type:'special',facts:[cf('catalogueMode','Divination : effet choisi','select',{options:[['normal','Moment propice, Intelligence +0 secret MJ'],['locate','Objet déjà vu, direction sans distance'],['die','Prochain dé précisément désigné : ±10']]})]},
 'Ennemi Anticipé':{type:'special',specialState:{cannotBeSurprised:true},receiptFormulas:{alerteRounds:'BInitiative'}},
 'Prémonition Fantastique':{type:'special',excludeCaster:true,targetRule:{alliesOnly:true},factModes:{fact:'catalogueMode',values:{reverse:{targetRule:{enemiesOnly:true}}}},facts:[cf('catalogueMode','Prémonition : formulation','select',{options:[['normal','Alliés : relance du premier échec magique'],['reverse','Ennemis : deux jets magiques, garder le pire']]})]},
 'Destin Illuminé':{type:'narrative',receiptFormulas:{questions:1},receiptOvercast:{questions:{id:'questions',perFormula:'1'}}},
 'Lentille du Ciel':{type:'test-modifiers',testModifiers:{'Perception (Longue distance)':2},receiptFormulas:{visionMiles:3,navigationProchainTest:2}},
 'Que les Quatre Vents Soufflent !':{type:'condition',conditions:['À Terre'],damage:{formula:'7',raw:7},damageWhenTargetFact:'collision',facts:[cf('collision','Quatre Vents : collision avec obstacle ou créature','boolean',{perTarget:true})],receiptFormulas:{groupes:4,projection:'BFM'},receiptOvercast:{projection:{id:'push',perFormula:'BFM'}}},
 'Mistral de la Stratosphère':{type:'damage',damage:{formula:'12',raw:12,ignoreAp:true},secondaryTest:{actor:'target',mandatory:true,skill:'Résistance',stat:'E',modifierSl:-2,rollField:'resistanceRoll',outcomeOnly:true},receiptFormulas:{gelPoucesParRound:1,recuperationCaracsParHeure:10}},
 'Miroir Mystique':{type:'narrative',facts:[cf('reflection','Miroir : surface réfléchissante dans la ligne de vue','boolean',{expected:true}),cf('knownTarget','Miroir : nom connu ou cible déjà rencontrée','boolean',{expected:true})]},
 'Éclat Stellaire':{type:'special',receiptFormulas:{rayon:'FM'}},
 'Tempête de Shemtek':{type:'magic-missile',missile:{damage:6},facts:[cf('catalogueMode','Shemtek : formulation','select',{options:[['normal','2×BI éclairs, lanceur Sonné, témoins Peur1'],['safe','BI éclairs, zone2×BFM, sans Sonné/Peur']]})],casterConditions:['Sonné'],receiptFormulas:{eclairs:'2 * BInitiative'},factModes:{fact:'catalogueMode',values:{safe:{targetMaximumFormula:'BInitiative',casterConditions:[],receiptFormulas:{eclairs:'BInitiative',rayon:'2 * BFM'}}}}},
 'Écaille d’acier':{type:'ward',ward:9},
 'Inscription':{type:'special',facts:[cf('catalogueMode','Inscription : utilisation','select',{options:[['normal','Inscrire mots/images'],['acid','Projectile acide contre armure métallique']]})],durationOverride:'Instantané',factModes:{fact:'catalogueMode',values:{acid:{type:'magic-missile',missile:{damage:2}}}},receiptFormulas:{motsParRound:12,delaiCorrosionRounds:10,corrosionPA:1}},
 'Métal restauré':{type:'special',facts:[cf('catalogueMode','Métal restauré : application','select',{options:[['normal','Réparer : au moins trois quarts de l’objet'],['sinter','Souder deux objets, Peu fiable et Encombrant']]})]},
 'Armure d’étain':{type:'armor',metalApReduction:2,facts:['head','body','arms','legs'].map(k=>cf('metalAp_'+k,'Armure : PA métalliques '+({head:'tête',body:'corps',arms:'bras',legs:'jambes'}[k]),'number',{perTarget:true,min:0}))},
 'Franchir l’inconnu':{type:'special',receiptFormulas:{details:1},receiptOvercast:{details:{id:'details',perFormula:'1'}}},
 'Malédiction de rouille':{type:'special',facts:[cf('objectMagical','Rouille : objet magique','boolean',{expected:false}),cf('objectEncumbrance','Rouille : Encombrement de l’objet','number',{min:0})],receiptFormulas:{encombrementMax:1},receiptOvercast:{encombrementMax:{id:'enc',perFormula:'1'}}},
 'Défaut de Forme':{type:'special',facts:[cf('objectId','Défaut : arme désignée','object'),cf('objectMetal','Défaut : arme au moins partiellement métallique','boolean',{expected:true}),cf('objectMagical','Défaut : arme magique','boolean')],receiptFormulas:{attaqueDR:-1,defenseContreLenteDR:2,multiplicateurRecharge:2}},
 'Globe doré de Gehenna':{type:'special',assistedVortex:true,receiptFormulas:{zone:'2 * BFM'},facts:[cf('pathDeclared','Gehenna : trajet du vortex et cibles confirmés','boolean',{expected:true})]},
 'Cage dorée':{type:'special',receiptFormulas:{barreDemiPouce:0.5,ecartPouces:6,forceEvasionDR:-2}},
 'Toucher doré':{type:'special',secondaryTest:{actor:'target',mandatory:true,skill:'Force Mentale',stat:'FM',modifierSl:0,rollField:'resistanceRoll'},facts:[cf('durationDie','Toucher : d10 secret du MJ','number',{min:1,max:10})],durationFactFormula:{fact:'durationDie',formula:'FM',unit:'minutes'},receiptFormulas:{bonusEnduranceStatue:10}},
 'Blindage d’oracier':{type:'special',receiptFormulas:{surfacePA:4,corruptionNiveauxRetires:2,dissipationDR:1}},
 'Nœud défait':{type:'test-modifiers',testModifiers:{'Savoir (Déduction)':2},receiptFormulas:{indices:1},receiptOvercast:{indices:{id:'hints',perFormula:'1'}}},
 'Blindage de météorite':{type:'ward',ward:4},
 'Réfraction prismatique de Habermas':{type:'test-modifiers',testModifiers:{Focalisation:-1,'Langue (Magick)':-1},receiptFormulas:{fluideProchaineIncantationDR:1,fluideEvaporationRounds:2}},
 'Boussole d’Argent de Puchta':{type:'special',receiptFormulas:{navigationMagiqueDR:2}},
 'Réplique de Levorg':{type:'special',facts:[cf('durationDie','Levorg : d10 secret de durée','number',{min:1,max:10})],durationFactFormula:{fact:'durationDie',formula:'1',unit:'heures'},receiptFormulas:{encombrementMax:4},receiptOvercast:{encombrementMax:{id:'enc',perFormula:'1'}}},
 'Essais et Erreurs':{type:'special',targetRule:{alliesOnly:true},facts:[cf('skill','Essais : compétence choisie','text')],receiptFormulas:{prochainTestDR:2}},
 'Bête Indomptée':{type:'special',receiptFormulas:{chevaucherDR:-2},optionRules:{human:{receiptOnly:true,receiptFormulas:{resistanceFMDR:-1,comportementDe:10}}}},
 'Régiment Monstrueux de Merciw':{type:'stat-modifiers',statModifiers:{F:30,E:30},statCaps:{F:100,E:100},targetRule:{alliesOnly:true},excludeCaster:true},
 'Pulvérisation Musquée':{type:'special',facts:[cf('catalogueMode','Musc : application','select',{options:[['normal','Cible marquée : localisation+2DR'],['territory','TerritoireBFM : animaux Calme+2']]})],receiptFormulas:{dureeJours:1,localisationDR:2,territoire:'BFM',calmeDR:2},receiptOvercast:{dureeJours:{id:'days',perFormula:'1'}}},
 'Passage Rapide':{type:'stat-modifiers',statModifiers:{M:1},talents:['Escalade','Foulée (terrain choisi)'],testModifiers:{'Éviter Enchevêtré':1}},
 'Invocation de Monture':{type:'special',assistedSummon:true,facts:[cf('nativeAnimal','Monture : animal local non monstrueux choisi par le MJ','text')],receiptFormulas:{heures:'BFM'}},
 'Transformation de Kadon':{type:'transformation',special:'transformation-of-kadon',facts:[cf('unwilling','Kadon : cible non consentante','boolean',{perTarget:true,optionalForSelf:true})],opposedTest:{casterStat:'FM',targetStat:'FM',targetSkill:'Force Mentale',whenFact:'unwilling',resistOnLoss:true,casterWinsTies:true}},
 'Capuche Vengeresse':{type:'special',traits:['Déviation si dégâts réduits à 0'],damageReductionFormula:'BFM',damageReductionFilter:{not:['magical']},damageReductionCalmTest:true},
 'Manteau d’Hiver':{type:'stat-modifiers',statModifiers:{Ag:-10,Soc:-10},receiptFormulas:{critiqueRecuModificateur:-10}}
};

WOM_SOURCE['Lames Azurées']=womSpec(98,6,'Vous','Vous',womBFM,SPELL_EFFECTS_CONFIG['Lames Azurées'],['Trois frappes de 8, non esquivables et non parables, chaque Tour adversaire engagé. Très Longue ou Massive : hors portée ; Longue : simultanée ; courte : après frappes. Allonges et adversaires déclarés.']);
const CATALOGUE_SOURCE={
"Tête Brûlante":womSpec(134,6,"Force Mentale mètres","Spécial","Instantané",CATALOGUE_EFFECTS["Tête Brûlante"],["Ligne droite jusqu’à FM, occupants déclarés. Esquive +0 : projectile +0, sinon +4 ; toujours 1 Enflammé. Peur (1) du lanceur seulement après au moins 1 Blessure. La trajectoire et les occupants sont déclarés par le MJ."]),
"Flamme Captivante":womSpec(134,3,"Moitié de la Force Mentale mètres","1 feu","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Flamme Captivante"],["Torche : un observateur aléatoire. +2 DR, feu moyen : deux ; +4 DR, grand feu : tous. Calme +0 ou 3 Sonné ; cible oblivieuse au reste, toute attaque retire les Sonné de ce sort. Le tirage et le nombre des observateurs restent MJ."]),
"Colérique":womSpec(135,2,"Moitié de l’Initiative mètres","1","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Colérique"],["Préjugé BFM heures contre une personne nommée ou pointée ; amis : Calme +2 pour résister. +4 DR : Animosité BFM jours ; +8 DR : Haine BFM semaines. La résistance psychologique ultérieure reste MJ ; aucun malus général de Calme ou Sociabilité."]),
"Tempête de Flammes":womSpec(135,8,"Force Mentale mètres","Spécial","Spécial",CATALOGUE_EFFECTS["Tempête de Flammes"],["Pilier de 2 mètres de diamètre et hauteur ; +2 DR : diamètre +1 mètre et hauteur +2 mètres. Projectile +8, 3 Enflammé, projeté hors zone, À Terre. Zone jusqu’à dissipation ou prochaine aube, entrée réservée aux immunisés au feu magique. Terrain, projection, admission et disparition à l’aube : reçus MJ, pas de couche spatiale persistante."]),
"Forge de Tarnus":womSpec(136,6,"Contact","1 forge","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Forge de Tarnus"],["Forge éteinte touchée ; Métier (Forgeron) +1 DR à cette forge, y compris fabrication d’objets magiques. Le destinataire du bonus est le forgeron déclaré par le MJ, pas un bonus à tous les métiers."]),
"Ignition":womSpec(136,3,"Force Mentale mètres","1","Instantané",CATALOGUE_EFFECTS["Ignition"],["Objet ou personne : 2 Enflammé. Si la cible est déjà Enflammé, on peut répartir 3 nouveaux États entre les autres à 2 mètres. La répartition reste un reçu MJ, sans trois États inventés par destinataire."]),
"Flamme Inextinguible":womSpec(136,3,"Moitié de l’Initiative mètres","1 feu","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Flamme Inextinguible"],["Feu normal jusqu’à la taille d’un feu de camp ; BFM heures. +2/+4/+6 DR : jours/semaines/mois. Aucun combustible consommé ; morceaux séparés restent inextinguibles. Formule inverse : éteint un feu de même taille. Aucun autre sort ni dissipation ne peut annuler. Le feu de terrain et cette interdiction restent MJ, sans couche dissipable prétendant représenter le feu."]),
"Flamme Attisée":womSpec(136,2,"Force Mentale mètres","ZdE Bonus de Force Mentale mètres","1 Round",CATALOGUE_EFFECTS["Flamme Attisée"],["Matière non inflammable, même eau ou pierre, devient inflammable. Matière déjà inflammable : +DR final aux dégâts de feu et 1 Enflammé supplémentaire à chaque attribution. Déclencheurs et matière de terrain : reçus MJ, aucune Blessure au lancement."]),
"Esprit du Foyer":womSpec(136,4,"Contact","Spécial","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Esprit du Foyer"],["Mains plongées dans un feu : 6 dégâts moins BE. Auxiliaire M3, CC=FM du lanceur, attaque +6, Peur (1), rayon 12 mètres du feu ; directions verbales. Immobile si autre sort ou conversation. Seulement mouvement et attaque, pas d’Élan. Dégâts infligés ajoutent 1 Enflammé. Indestructible sauf au moins une pinte d’eau ; conversation, distance au feu, Peur et eau : MJ."]),
"Goût de Feu":womSpec(137,2,"Bonus de Force Mentale mètres","1 pot, cruche ou flacon","Instantané",CATALOGUE_EFFECTS["Goût de Feu"],["Plat épicé : Résistance +4 pour éviter les séquelles digestives ; cruche d’un quart de gallon transformée en alcool ; flacon d’une pinte transformé en huile inflammable. Unités exactes du livre ; aucun bonus à tous les Tests de Résistance. Contenants, aliments et Test digestif : MJ."]),
"Chaleur Desséchante":womSpec(137,6,"ZdE Force Mentale mètres","Vous","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Chaleur Desséchante"],["Ennemis dans zone FM : 1 Exténué par Round avec course, charge ou fuite. Retirer armure et vêtements retire un État ainsi gagné. Tout feu, même une bougie, ajoute 1 Enflammé et +DR final de dégâts. Événements des Rounds suivants, vêtements, feu et sortie de zone : reçus MJ ; aucun malus aux alliés."]),
"Arc de T’Essla":womSpec(101,7,"Force Mentale mètres","1","Instantané",CATALOGUE_EFFECTS["Arc de T’Essla"],["Projectile +10 et un Aveuglé."]),
"Polir et Exalter":womSpec(100,1,"Contact","1 objet","Bonus d’Initiative minutes",CATALOGUE_EFFECTS["Polir et Exalter"],["Nettoie un objet de verre. Pour lentille ou vitre : +2 DR Astronomie +2 ; +4 DR Perception visuelle avec Seconde vue +2. Aucun bonus sans payer la surpuissance ; utilisateur de la vitre déclaré par le MJ."]),
"Projection Spirituelle":womSpec(100,7,"Vous","Vous","Bonus d’Endurance heures",CATALOGUE_EFFECTS["Projection Spirituelle"],["Corps endormi, esprit invisible, déplacement normal ; voit et entend mais ne parle ni ne lance de sort ; traverse la matière, ne manipule rien. Retour tardif : Test contre Exposition modérée à la Corruption. Corps, visibilité, matière, retour et Corruption : reçus MJ ; blocage d’incantation appliqué."]),
"Arche de Saphir":womSpec(100,6,"Moitié de la Force Mentale mètres","Spécial","1 Round",CATALOGUE_EFFECTS["Arche de Saphir"],["Arche 4 mètres de large, 3 de haut, jusqu’à fin du prochain Round. Traversants en limbes jusqu’au prochain lancement, sans passage du temps perçu. Mort du lanceur : expulsion à l’origine, 1 Sonné et À Terre. Traversants, limbes, origine et mort : reçus MJ, aucun participant supprimé."]),
"Malédiction du Destin":womSpec(99,8,"Moitié de la Force Mentale mètres","1","1 jour",CATALOGUE_EFFECTS["Malédiction du Destin"],["Tous Tests −1 pendant 1 jour, une seule malédiction sur une cible, ligne de vue. +6 DR : portée 1 mile, perte définitive de 1 Destin ; sans Destin, prochain Critique reçu =100 pendant la durée. Destin, Critique futur, unicité et ligne de vue : reçus MJ."]),
"Divination":womSpec(99,3,"Vous","Vous","Instantané",CATALOGUE_EFFECTS["Divination"],["Moment propice : Intelligence +0 secret MJ pour la précision. Objet perdu déjà vu : direction seule. Un dé futur précisément désigné ±10, une seule application active. Dé secret, futur événement et consommation : reçus MJ ; aucun +1 DR à tous les jets."]),
"Ennemi Anticipé":womSpec(99,4,"Vous","Vous","Bonus de Force Mentale minutes",CATALOGUE_EFFECTS["Ennemi Anticipé"],["Ne peut être Surpris. Avertissement du MJ BI Rounds avant le danger ; peut fuir ou préparer. Avertissement et immunité événementielle restent MJ ; aucun Surpris déjà présent retiré au lancement."]),
"Prémonition Fantastique":womSpec(99,7,"ZdE Force Mentale mètres","Vous","1 Round",CATALOGUE_EFFECTS["Prémonition Fantastique"],["Un Round : alliés mages, hors lanceur, relancent leur premier échec à chaque Focalisation, lancer et dissipation. Inverse : ennemis font deux jets et gardent le pire. Premier échec par Test, relances et destinataires : reçus MJ ; aucun dé implicite."]),
"Destin Illuminé":womSpec(99,5,"Moitié de l’Intelligence mètres ou Contact","1","Instantané",CATALOGUE_EFFECTS["Destin Illuminé"],["Une question oui/non sur l’intention dans l’heure prochaine ; +2 DR : une question de plus. Au Contact, Fatalité et malédictions/présages actifs, symboles et inverses. Informations secrètes : MJ."]),
"Lentille du Ciel":womSpec(100,3,"Vous","Vous","Bonus d’Initiative minutes",CATALOGUE_EFFECTS["Lentille du Ciel"],["Vision claire jusqu’à 3 miles ; Perception à longue distance +2 DR. Nuages et brouillard ignorés, obscurité conservée. Observation des étoiles : prochain Test de Navigation +2 DR. Contexte stellaire et consommation du prochain Test : reçus MJ."]),
"Que les Quatre Vents Soufflent !":womSpec(100,9,"Force Mentale mètres","4 × ZdE Bonus de Force Mentale mètres","Instantané",CATALOGUE_EFFECTS["Que les Quatre Vents Soufflent !"],["Quatre vortex ou groupes désignés. Projection BFM mètres ; +2 DR : +BFM mètres. Collision avec obstacle ou personnage : 7 dégâts, BE et PA ordinaires, puis arrêt. Tous À Terre à l’arrêt. Trajectoire, quatre groupes et cibles : MJ ; collision déclarée individuellement."]),
"Mistral de la Stratosphère":womSpec(100,7,"Bonus de Force Mentale mètres","ZdE Bonus de Force Mentale mètres","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Mistral de la Stratosphère"],["Direction déclarée ; 12 dégâts sans PA, avec BE, seulement premier Round pour chaque cible. Résistance −2 chaque Round ou premier stade d’Exposition au Froid. Eau : gel 1 pouce par Round ; caractéristiques perdues récupérées à 10 points par heure. Nouvelles directions, récurrence du Test, Exposition et récupération : reçus MJ, pas de dégâts répétés implicitement."]),
"Miroir Mystique":womSpec(100,7,"Force Mentale miles","1 (maximum)","Bonus de Sociabilité Rounds",CATALOGUE_EFFECTS["Miroir Mystique"],["Protection (4) pendant un Round, poids nul et compatible avec armure ordinaire."]),
"Éclat Stellaire":womSpec(101,8,"ZdE Force Mentale mètres","Vous","Bonus de Force Mentale minutes",CATALOGUE_EFFECTS["Éclat Stellaire"],["Zone FM suit le lanceur ; révèle invisibles, créatures cachées et portes ; bannit obscurité normale et magique. Révélation et déplacement spatial : reçus MJ, aucune cible inventée ni état Aveuglé supprimé."]),
"Tempête de Shemtek":womSpec(101,11,"Moitié de la Force Mentale mètres","2 × Bonus d’Initiative ou Bonus d’Initiative","Instantané",CATALOGUE_EFFECTS["Tempête de Shemtek"],["2×BI éclairs distincts devant lanceur, projectile +6 ; lanceur 1 Sonné. Témoins sans Magie des Cieux : Test de Peur (1). Variante sûre : BI éclairs dans zone 2×BFM, ni Sonné ni Peur. Témoins, groupes et nombre des destinataires : MJ ; une frappe par destinataire déclaré, aucune multiplication sur une cible."]),
"Écaille d’acier":womSpec(75,5,"Vous","Vous","Bonus d’Endurance Rounds",CATALOGUE_EFFECTS["Écaille d’acier"],["WoM p. 75 : Écaille d’acier, distinct de Robe scintillante V5 p. 253. Protection 9, chaque sauvegarde réussie améliore de 1, jusqu’à 3. Progression après sauvegarde : reçu MJ, compteur non relié aux coups. La Protection initiale est appliquée."]),
"Inscription":womSpec(76,2,"1 mètre","Spécial","Spécial",CATALOGUE_EFFECTS["Inscription"],["1 Round par douzaine de mots. +2 DR : rune secrète, révélée par le même sort d’un mage de Métal. Acide d’urgence contre armure métallique : projectile +2 ; 1 PA de la localisation détruit seulement après 10 Rounds sans lavage. Objet, rune, matériau, lavage et corrosion différée : reçus MJ ; aucune corrosion immédiate ou sur quatre localisations."]),
"Métal restauré":womSpec(76,4,"Contact","1 objet","Instantané",CATALOGUE_EFFECTS["Métal restauré"],["Répare toute taille si au moins trois quarts de l’objet restent ; pièces manquantes remplacées. Alternative : souder deux métaux ; peut aider Métier sans bonus chiffré prescrit ; armure soudée gagne Peu fiable et Encombrant. Inventaire physique : reçu MJ, aucun PA restauré arbitrairement."]),
"Armure d’étain":womSpec(74,4,"Force Mentale mètres","ZdE Bonus de Force Mentale mètres","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Armure d’étain"],["Protection (4) pendant un Round, poids nul et compatible avec armure ordinaire."]),
"Franchir l’inconnu":womSpec(74,4,"Initiative mètres","1","Instantané",CATALOGUE_EFFECTS["Franchir l’inconnu"],["Propriétés d’un objet comme étudié un jour ; santé d’une créature et plus haute caractéristique physique connues. +2 DR : un détail caché supplémentaire. Objet magique touché : usage temporaire de Détection des Artefacts. Informations, Contact et talent de fiche : reçus MJ."]),
"Malédiction de rouille":womSpec(74,4,"Force Mentale mètres","1 objet d’Encombrement 1","Instantané",CATALOGUE_EFFECTS["Malédiction de rouille"],["Objet métallique non magique, Encombrement jusqu’à 1 ; +2 DR : +1. Ruine permanente. +4 DR : non-métal fragile pendant BFM minutes. Composants mixtes, fixations et bris : MJ ; aucune perte de Blessures inventée."]),
"Défaut de Forme":womSpec(75,2,"Force Mentale mètres","1 arme","Bonus d’Initiative Rounds",CATALOGUE_EFFECTS["Défaut de Forme"],["Arme au moins partiellement métallique : Qualités bénéfiques supprimées, attaque −1 DR. Dangereuse : maladresse sur 8, 9 ou doubles ; Recharge doublée ; Lente : +2 DR aux défenseurs. Arme magique non altérée ; +4 DR neutralise ses enchantements temporairement. Modifications par arme : reçus MJ, aucun malus à toutes les armes."]),
"Globe doré de Gehenna":womSpec(75,13,"Vortex aléatoire","ZdE 2 × Bonus de Force Mentale mètres","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Globe doré de Gehenna"],["Vortex aléatoire zone 2×BFM, Toucher doré sur occupants : FM +0 résiste, durée FM×d10 minutes secret, BE10, Blessure termine statue. Direction, distance, occupants, chaque durée et récurrence du vortex : MJ ; aucun projectile ni profil de statue inventé."]),
"Cage dorée":womSpec(75,9,"Force Mentale mètres","ZdE Bonus de Force Mentale mètres","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Cage dorée"],["Barres d’un demi-pouce, espaces de 6 pouces ; Force −2 pour tordre ou outils adaptés. Minuscules et Petits peuvent passer. Extérieurs ne peuvent entrer ; armes et projectiles passent. Cage perce murs et plafond. Évasion, tailles et terrain : reçus MJ."]),
"Toucher doré":womSpec(75,7,"Contact","Spécial","Spécial",CATALOGUE_EFFECTS["Toucher doré"],["Prochain être vivant touché : FM +0 résiste. Statue, durée FM×d10 minutes secrète ; ne voit, entend ni sent, ne suffoque pas ; BE10, Blessures ordinaires, toute Blessure termine. Profil BE, perception, toucher ultérieur et fin sur Blessure : reçus MJ ; aucune Endurance inventée."]),
"Blindage d’oracier":womSpec(76,10,"Bonus de Force Mentale mètres","ZdE Bonus de Force Mentale mètres","Force Mentale minutes",CATALOGUE_EFFECTS["Blindage d’oracier"],["Surface inerte seulement : PA+4 et immunité aux phénomènes naturels. Derrière cet abri : Corruption abaissée de deux niveaux, Dissipation +1 DR. Surface, abri et occupant : reçus MJ ; aucun bonus permanent au participant."]),
"Nœud défait":womSpec(76,5,"Vous","Vous","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Nœud défait"],["Problème soluble par déduction : un indice MJ ; +2 DR : un indice supplémentaire. Tests de Savoir pertinents +2 DR. Pertinence et contenu de l’indice : MJ."]),
"Blindage de météorite":womSpec(76,7,"Force Mentale mètres","ZdE Bonus de Force Mentale mètres","1 Round",CATALOGUE_EFFECTS["Blindage de météorite"],["Protection (4) pendant un Round, poids nul et compatible avec armure ordinaire."]),
"Réfraction prismatique de Habermas":womSpec(77,5,"ZdE Force Mentale mètres","Vous","1 Round",CATALOGUE_EFFECTS["Réfraction prismatique de Habermas"],["Tous présents, y compris lanceur : Focalisation et lancer −1 DR. À expiration, couleurs inoffensives ; choisir un Vent pour un fluide +1 DR à une incantation liée, évaporation après deux Rounds. Destinataires de zone déclarés ; fluide et futur jet : reçus MJ."]),
"Boussole d’Argent de Puchta":womSpec(77,2,"ZdE Force Mentale mètres","1 boussole","Force Mentale minutes",CATALOGUE_EFFECTS["Boussole d’Argent de Puchta"],["WoM p. 53 : vers concentration magique, Navigation +2 DR pour forte/extrême saturation, foyer, tempête ou lieu magique. Priorité : Foyer, Malepierre, Jonction, Objet, Ligne, Mage. Seulement plus puissante source d’un type ; utilisable par tous. Boussole, direction et phénomène : reçus MJ."]),
"Réplique de Levorg":womSpec(77,6,"Vous","Spécial","1d10 heures",CATALOGUE_EFFECTS["Réplique de Levorg"],["Objet inanimé non magique, Encombrement jusqu’à 4 ; +2 DR : +1. 1d10 heures secrètes puis disparition ; facsimilé reconnaissable par artisan. Alternative 1d10 pièces d’or, plus 1d10 par +2 DR, interdite au Collège. Chimie simple : ni nourriture, explosif, ingrédient ni catalyseur. Inventaire, disparition et dés des pièces : reçus MJ."]),
"Essais et Erreurs":womSpec(77,3,"Intelligence mètres","1","Bonus de Force Mentale minutes",CATALOGUE_EFFECTS["Essais et Erreurs"],["Vous ou allié : compétence choisie, prochain Test +2 DR une seule utilisation ; +2 DR : une relance unique de ce Test. Destinataire, consommation du prochain Test et relance : reçus MJ ; aucun bonus à tous les Tests de la durée."]),
"Bête Indomptée":womSpec(147,4,"Contact","1","Instantané",CATALOGUE_EFFECTS["Bête Indomptée"],["Animal domestique fuit ou attaque son ancien maître selon MJ ; Charme Animal dissuade mais ne dompte pas ; cavalier Chevaucher −2 ou projeté. +4 DR : humain résiste FM −1 ; poils et parole perdue ; d10 chaque Round : 1–3 distrait, 4–6 panique direction aléatoire, 7–9 amical, 10 enragé et Peur1 sauf mages Bêtes. Les deux effets jusqu’à dissipation ; comportement et tours spatiaux : reçus MJ."]),
"Régiment Monstrueux de Merciw":womSpec(148,13,"Force Mentale mètres","ZdE Bonus de Force Mentale mètres","Bonus de Force Rounds",CATALOGUE_EFFECTS["Régiment Monstrueux de Merciw"],["Alliés hors lanceur : F et E +30, plafond 100 ; durée BF Rounds. Aucun gain automatique de Bmax ni soin."]),
"Pulvérisation Musquée":womSpec(148,2,"Bonus de Force Mentale mètres","1","Instantané",CATALOGUE_EFFECTS["Pulvérisation Musquée"],["Cible ou objet : odeur, localisation +2 DR. Alternative territoire BFM : animaux sauvages seulement affamés ou menacés et Calme +2 pour entrer ; monstres non affectés. Un jour, plus un jour par +2 DR, non lavable. Localisation, territoire, odeur et durée hors combat : reçus MJ."]),
"Passage Rapide":womSpec(148,4,"Vous","Vous","Bonus de Force Mentale minutes",CATALOGUE_EFFECTS["Passage Rapide"],["M+1 ; Escalade et Foulée d’un terrain. Déjà possédés : un niveau temporaire plus un par +2 DR ; éviter Enchevêtré +1 DR. Terrain, niveau supplémentaire conditionnel et Tests d’Enchevêtrement : reçus MJ."]),
"Invocation de Monture":womSpec(148,6,"Vous","Vous","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Invocation de Monture"],["Animal local ordinaire choisi par MJ (cerf, sanglier, ours), combat mais conserve instinct de préservation. Chevaucher adapté à la valeur réelle de Langue (Magick). Profil complet, monture auxiliaire et compétence remplacée : données MJ, pas de profil inventé."]),
"Transformation de Kadon":womSpec(149,14,"Vous ou Contact","Vous ou 1 (maximum)","Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Transformation de Kadon"],["Monstre Grande ou Énorme choisi par MJ. Conserve Int et FM ; autres caractéristiques, compétences et talents remplacés par profil. Pas d’incantation. +4 DR : un trait optionnel ou autre cible de Contact ; FM opposée si non consentante. Profil, taille, compétences manquantes, cible et dés requis ; profil saisi incomplet interdit."]),
"Capuche Vengeresse":womSpec(149,7,"Vous","Vous","2 × Bonus de Force Mentale Rounds",CATALOGUE_EFFECTS["Capuche Vengeresse"],["Chaque frappe non magique : Calme +0 ; réussite réduit dégâts de BFM +DR du Calme. Si réduits à zéro : tir vers une cible aléatoire à 2 mètres, mêlée renvoyée sur attaquant sans opposition. Redirection et nouvelle cible : reçus MJ ; réduction calculée."]),
"Manteau d’Hiver":womSpec(149,2,"Vous","Vous","Bonus de Force Mentale heures",CATALOGUE_EFFECTS["Manteau d’Hiver"],["Immunité à l’Exposition au Froid ; Critiques reçus −10 sur leur table ; Agilité et Sociabilité −10. Exposition et score final de Critique : reçus MJ."]),
};
// Lot 5B : WoM pp. 62–65, 86–89, 110–113 et 122–125 ; catalogue gelé, clauses de fiche en reçus explicites.
const cbTest=(skill,stat,extra={})=>({actor:'target',mandatory:true,skill,stat,modifierSl:0,rollField:'resistanceRoll',...extra});
const cbMode=(label,options)=>cf('mode',label,'select',{options});
const cbOpposed={casterStat:'FM',targetStat:'FM',targetSkill:'Force Mentale',resistOnLoss:true,casterWinsTies:true};
const cbPit={type:'special',secondaryTest:cbTest('Esquive','Ag',{conditionsOnly:true}),expiryEffect:{inside:true,damage:{formula:'20'},suffocation:true},receiptFormulas:{ecrasementDegats:20},specialState:{pit:true},facts:[cf('patchEarth','Fosse : terrain et occupants déclarés','boolean',{expected:true})]};
Object.assign(CATALOGUE_SOURCE,{
 'Habitants d’en bas':womSpec(86,13,womFM,'ZdE Bonus de Force Mentale mètres','Instantané',{type:'special',targetRule:{enemiesOnly:true},secondaryTest:cbTest('Force','F',{scoreFact:'mountStrength',scoreWhenFact:'useMount'}),facts:[cf('useMount','Habitants : employer la Force de la monture','boolean',{perTarget:true}),cf('mountStrength','Habitants : Force réelle de la monture','number',{perTarget:true,min:1,max:300,requiredWhen:{key:'useMount',value:true}}),cf('delayHoursDie','Habitants : durée secrète sous terre (d10)','number',{min:1,max:10})],receiptFactValues:{heuresPerdues:'delayHoursDie'},specialState:{assistedReminder:'Cible tirée sous terre, invulnérable aux esprits ; retour après le d10 heures indiqué, puis exposition modérée à la Corruption.'}},['Monticules, déplacement hors scène, retour et Corruption : reçus MJ, aucun dégât. La Force de chaque cible ou monture est réellement testée.']),
 'Cri de Guerre du Jardinier':womSpec(87,9,womFM,'ZdE Force Mentale mètres','Instantané',{type:'damage',damage:{formula:'10'},conditions:['Hémorragique'],facts:[cf('patchEarth','Jardinier : parcelle de terre et occupants déclarés','boolean',{expected:true})],receiptFormulas:{degatsInitiaux:10,seuilMouvement:0.5},specialState:{assistedReminder:'Forêt permanente jusqu’à destruction. Traversée au-delà de la moitié de M : Agilité +0 ou un Hémorragique ; chaque traversée future doit être déclarée.'}},['Forêt et traversées futures : terrain absent du combat ; dégâts initiaux et Hémorragique exécutés, pas de durée arbitraire du terrain.']),
 'Almanach':womSpec(86,4,'Vous','Vous','1 jour',{type:'narrative',receiptFormulas:{anneesPrevues:1},exclusiveOptionGroups:[['week','day']]},['Un jour d’observation libre avant résultat. Prévision annuelle sans date ; +2 DR : semaine, +4 DR : jour. Informations et calendrier : MJ.']),
 'Chair de Pierre':womSpec(87,9,'Bonus de Force Mentale mètres','1','Force Mentale minutes',{type:'special',facts:[cf('unwilling','Pierre : cible non consentante','boolean',{perTarget:true})],opposedTest:{...cbOpposed,whenFact:'unwilling'},statModifiers:{F:30,E:30},apModifiers:{all:4},movementMultiplier:0.5,specialState:{cannotSpeak:true,needNotBreathe:true}},['FM opposée si réticence ; F/E +30, PA+4, M/2 ; pas de soin ni Bmax supplémentaire. Parole et respiration sont indiquées dans la couche.']),
 'Geyser':womSpec(87,8,womFM,'ZdE Bonus de Force Mentale mètres','Instantané',{type:'magic-missile',missile:{damage:4},conditions:['À Terre'],facts:[cf('direction','Geyser : direction choisie de la projection','number',{min:1,max:8})],receiptFormulas:{projection:'BFM'},optionRules:{stun:{conditions:['Sonné'],chosenTargets:true}}},['Projection BFM et eau restante : reçus spatiaux. +2 DR : un Sonné sur une seule cible choisie pour chaque palier, pas sur toute la zone.']),
 'Chant vivifiant':womSpec(87,6,'2 × Bonus de Sociabilité mètres','ZdE Bonus de Sociabilité mètres',womBFM,{type:'healing',healing:{amountFormula:'DR'},testModifierFormulas:{'Tous les Tests':'DR'},targetRule:{requiredFact:'plantCreature'},facts:[cf('plantCreature','Chant : créature végétale admissible','boolean',{perTarget:true}),cf('dormant','Chant : créature dormante','boolean',{perTarget:true})],targetFactModes:{fact:'dormant',values:{true:{specialState:{cannotActUntilNextRound:true},receiptFormulas:{eveilRounds:1}},false:{receiptFormulas:{eveilRounds:0}}}}},['Créature végétale réelle déclarée, aucun profil inventé ni contrôle. Dormante : un Round d’éveil avant action ; soins et +DR à tous les Tests utilisent le total Test+réserve.']),
 'Cercueil de Jade':womSpec(87,6,womFM,'1','Bonus de Force Mentale heures',{type:'special',restoreCorpse:{maxAgeSeconds:3600},facts:[cf('dead','Cercueil : mort constatée','boolean',{perTarget:true,expected:true}),cf('corpseAgeSeconds','Cercueil : secondes depuis la mort','number',{perTarget:true,min:0,max:3600})],specialState:{cannotSpeak:true,controlledByCaster:true,corpseServant:true}},['Réanime le participant existant à Bmax, conserve profil non magique, aucun Mort-vivant ni serviteur synthétique. Commandements simples et absence de mémoire : MJ ; revient à l’état de cadavre à expiration.']),
 'Chute des feuilles':womSpec(88,6,'Vous','Vous','Bonus de Force Mentale minutes',{type:'special',rangedOpponentPenaltySl:-2,damageReduction:3,damageReductionFilter:{any:['blunt','fall','crush']},talents:['Contorsionniste']},['Chaque type de coup doit être déclaré ; réduction seulement chute, écrasement ou arme contondante. Talent temporaire de fiche.']),
 'Traque des lignes telluriques':womSpec(88,5,'Bonus d’Initiative miles','Vous','Bonus de Force Mentale heures',{type:'test-modifiers',testModifiers:{'Navigation (Lignes telluriques)':2}},['Carte détaillée, puissance globale et nombre de pierres ; pas de couleur identifiable à distance. Carte et navigation pertinente : MJ, bonus +2 DR exécuté.']),
 'Murmure de la Nature':womSpec(88,8,'Vous','Vous','Bonus de Sociabilité minutes',{type:'narrative',facts:[cf('riverOrTree','Murmure : Contact avec rivière ou arbre','boolean',{expected:true})],receiptFormulas:{memoireRiviereHeures:24,reponseArbreMinutes:5,porteeMemoireMiles:1}},['Télépathie de Contact ; rivière : souvenir de 24h et un mile dans chaque sens ; arbre : années, au moins cinq minutes par réponse. Aucun bonus de sympathie, pas de Dryade animée.']),
 'Sentier de Paranoth':womSpec(88,4,'ZdE Bonus de Force Mentale mètres','Vous','Force Mentale minutes',{type:'special',talents:['Foulée (Forêts)'],specialState:{endsOnEvents:['cross-path','harm-tree'],endsWholeCastOnEvents:true},receiptFormulas:{niveauSiDejaConnu:1},receiptOvercast:{niveauSiDejaConnu:{id:'levels',perFormula:1}},optionRules:{untraceable:{flags:{untraceable:true}}}},['Groupe déclaré ; niveau de Foulée déjà possédé : +1 puis +1 par +2 DR, reçu de fiche ; +4 DR : aucune trace. Fin sur chemin croisé ou arbre vivant blessé, événements MJ.']),
 'Croissance Vitale':womSpec(89,7,'Bonus de Force Mentale mètres','1','Instantané',{type:'narrative',exclusiveOptionGroups:[['double','triple','quadruple']],receiptFormulas:{multipleHauteur:1,concentrationRounds:0},optionRules:{double:{receiptFormulas:{multipleHauteur:2,concentrationRounds:1}},triple:{receiptFormulas:{multipleHauteur:3,concentrationRounds:2}},quadruple:{receiptFormulas:{multipleHauteur:4,concentrationRounds:3}}}},['Plante ou arbre : taille naturelle maximale ; doubles/triples/quadruples payés +2/+4/+6 DR et 1/2/3 Rounds de concentration supplémentaires. Hauteur naturelle et terrain : MJ.']),
 'Forme de Bois':womSpec(89,8,'Contact','1','Bonus de Force Mentale heures',{type:'special',facts:[cf('unwilling','Bois : cible non consentante','boolean',{perTarget:true})],secondaryTest:cbTest('Force Mentale','FM',{modifierSl:2,whenFact:'unwilling'}),movementSet:0,specialState:{cannotMove:true,cannotSpeak:true,oakTree:true}},['Chêne : voit et entend ; blessures par hache, feu ou ce qui blesse un arbre. FM+2 sur cible réticente. Résistance matérielle de l’arbre et apparence : MJ ; aucun F/E/PA de profil inventé.']),
 'Mains de Karkora':womSpec(64,8,womFM,'ZdE Bonus de Force Mentale mètres',womBFM,{type:'special',secondaryTest:cbTest('Esquive','Ag'),facts:[cf('grappleMode','Mains : choix au lancement','select',{options:[['damage','Empoigner'],['suffocate','Tirer sous terre et suffoquer']]})],specialState:{grappleStrength:60},specialStateFormulas:{grappleStrength:'FM'},factModes:{fact:'grappleMode',values:{suffocate:{specialState:{grappleStrength:60,suffocating:true},roundEffect:{phase:'endOfRound',suffocation:true}}}}},['Empoignade F=FM ; dégâts de lutte ultérieurs demandent l’opposition réelle, aucun dé implicite. Mode suffocation déclaré dès le lancement ; tirage sous terre et suffocation exécutés, libération par MJ.']),
 'Crevasse':womSpec(62,8,womFM,'Spécial',womBFM,{...cbPit,receiptFormulas:{largeur:3,longueur:3,profondeur:3,ecrasementDegats:20},receiptOvercast:{longueur:{id:'size',perFormula:1},profondeur:{id:'size',perFormula:1,max:10}},facts:[...cbPit.facts,cf('automaticFall','Crevasse : cheval ou véhicule, chute automatique','boolean',{perTarget:true})],secondaryTest:{...cbPit.secondaryTest,skipWhenFact:'automaticFall'}},['Esquive +0 ; échec marginal permet de saisir le bord, choix MJ. Chevaux/véhicules tombent sans Test. Fermeture réelle demande présence de chaque cible, applique 20 dégâts, Protection et suffocation. Effondrement du terrain : MJ.']),
 "Piège d'Abulla":womSpec(62,5,'Initiative mètres','1',womBFM,{type:'condition',expireConditions:true,conditions:['Enchevêtré','Enchevêtré'],entangleStrength:'FM',receiptFormulas:{hauteur:2},receiptOvercast:{hauteur:{id:'height',perFormula:2,max:10}},optionRules:{entangle:{conditionPerStep:'Enchevêtré'}},specialState:{snare:true}},['Enchevêtré2 F=FM ; +1 DR : un Enchevêtré ou +2m de hauteur (max10). Round suivant : 5m au-dessus et 2m devant le lanceur. Trajectoire et dégâts de chute à hauteur réelle : MJ, pas de Blessure au lancement.']),
 'Assaut de pierre':womSpec(62,12,womFM,'Spécial','Instantané',{type:'damage',damage:{formula:20},secondaryTest:cbTest('Esquive','Ag',{damageOnSuccess:10,rollField:'dodgeRoll'}),receiptFormulas:{diametre:20,hauteur:5}},['Esquive +0 réduit 20 à10 dégâts, BE/PA et localisation aléatoire ; colline permanente, terrain MJ.']),
 'Éclat éblouissant':womSpec(63,5,womFM,'ZdE Bonus de Force Mentale mètres','Instantané',{type:'condition',conditions:['Aveuglé'],conditionExceptLore:'light',daemonConditions:['Sonné']},['Chaque Démon prend un Sonné, même s’il est exempt du seul Aveuglé par Magie Lumière.']),
 'Volonté inébranlable':womSpec(63,4,'Contact','1','Bonus de Force Mentale heures',{type:'test-modifiers',testModifiers:{'Résister à Charme/Intimidation':2},facts:[cbMode('Volonté : effet choisi',[['normal','Résister à Charme et Intimidation'],['truth','Charme du lanceur parlant vrai']])],factModes:{fact:'mode',values:{truth:{selfTargetsOnly:true,testModifiers:{'Charme (Vérité)':2}}}}},['Variante Charme+2 réservée au lanceur et à la vérité ; aucun cumul des deux formulations. Pertinence du Test et vérité : MJ.']),
 'Ériger l’édifice':womSpec(63,9,'Bonus de Force Mentale mètres','Spécial','Spécial',{type:'narrative',receiptFormulas:{longueur:5,hauteur:1,epaisseurPouces:6,effondrementJours:'BFM + DR',ouverturesPasMetres:2,concentrationRounds:0},receiptOvercast:{longueur:{id:'length',perFormula:5},hauteur:{id:'height',perFormula:1},epaisseurPouces:{id:'height',perFormula:6},concentrationRounds:{ids:['length','height'],perFormula:1}}},['Couverture dure, un passage par2m ; +2 DR et un Round : +5m longueur ou +1m hauteur/+6pouces épaisseur. Courbe +2 DR. Effondre BFM+DR jours sauf conseil Ingénierie/Métier Tailleur de pierre ; ni sous-sol, toiture ni plancher. Terrain/construction : MJ.']),
 'Yeux de Volans':womSpec(63,6,'Vous','Vous',womBFM,{type:'test-modifiers',testModifiers:{'Perception (Seconde vue)':2,'Perception (Vue normale)':-2}},['+20 du supplément transposé en +2DR ; corruption des espèces civilisées seulement, ni plantes ni animaux, mutation couverte non forcément visible. Données de fiche : MJ.']),
 'Illuminer l’édifice':womSpec(64,4,'Contact','1 (maximum)','Bonus de Force Mentale heures',{type:'special',receiptFormulas:{degatsEntree:'DR'},triggered:{event:'enter-building',test:{skill:'Force Mentale',stat:'FM',modifierSl:0},requiredAnyTrait:['daemon','demon','mort-vivant','undead'],damageOnTestSuccess:{formula:'DR',ignoreAp:true,ignoreBe:true}},exclusiveOptionGroups:[['manor','castle']]},['Édifice lumineux, pas de Blessure à l’édifice ni aux vivants. Démon/Mort-vivant : FM+0 pour entrer ; réussite inflige DR final sans BE/PA. Entrée et bâtiment : MJ, interaction dédiée.']),
 'Lumière de pureté':womSpec(64,6,'Spécial','1 (maximum)','Spécial',{type:'special',testModifierFormulas:{'Dissipation (Magie Noire/Chaos)':'DR'},talents:['Résistance (Maladies)'],facts:[cf('lightRange','Pureté : rayon réel de la source (mètres, maximum un mile)','number',{min:1,max:1609.344,integer:false}),cf('lightHours','Pureté : durée réelle de la source (heures, maximum24)','number',{min:0.01,max:24,integer:false})],durationFact:{quantityFact:'lightHours',unit:'heures'}},['Source et occupants réels déclarés ; rayon≤1mile, durée≤1jour. Dissipation DR final contre magie noire/Chaos seulement ; aucun bonus universel.']),
 'Bibliothécaire instantané de Meissner':womSpec(64,2,'ZdE Intelligence mètres','Vous','Instantané',{type:'narrative',facts:[cf('requestedBook','Bibliothécaire : titre ou thème recherché','text'),cf('topicWords','Bibliothécaire : nombre de mots du thème (0 si titre)','number',{min:0,max:10})],receiptFormulas:{progressionRecherche:'1 + DR',livresLumineuxRounds:'BFM + DR'}},['Recherche étendue : progression1+DR, pas bonus+2 à chaque Test. Livre brille BFM+DR Rounds. MJ statue sur répétitions dans bibliothèques complexes ; lecture ultérieure nécessaire.']),
 'Orbe de Hysh':womSpec(64,5,womFM,'1',womBFM,{type:'narrative',facts:[cf('objectId','Orbe : objet réel','text'),cf('objectEncumbrance','Orbe : encombrement réel','number',{min:0,integer:false})],receiptFormulas:{encombrementMax:'BFM + DR',vitesse:'BFM',corruptionNiveauxRetires:1}},['Manipulation d’un seul objet, poids≤BFM+DR, vitesseBFM ; Influences malignes contenues, exposition à Corruption abaissée d’un niveau. Inventaire, emplacement, objet et exposition : MJ.']),
 'Compréhension parfaite':womSpec(65,5,'Vous','Vous','Bonus de Force Mentale minutes',{type:'narrative',specialState:{understandLanguages:true}},['Comprend seulement, sans pouvoir parler les langues inconnues. Codes et messages brouillés inclus ; Langue Sombre exclue, anciennes langues au jugement MJ.']),
 'Percer le Voile':womSpec(65,4,'Vous','Vous','Bonus de Force Mentale minutes',{type:'special',specialState:{seeThroughObscurity:true},triggered:{event:'see-magic',testActor:'caster',test:{skill:'Force Mentale',stat:'FM',modifierSl:0},opposedTest:{skill:'Force Mentale',stat:'FM'},testOnly:true},facts:[cf('mode','Voile : obscurité','select',{options:[['normal','Naturelle'],['magic','Magique, invisibilité ou illusion']]})],factModes:{fact:'mode',values:{magic:{specialState:{seeThroughObscurity:true,assistedReminder:'FM opposée contre chaque auteur réel pour voir à travers obscurité magique, invisibilité et illusions ; réussites indépendantes, pas de dissipation.'}}}}},['Vue naturelle comme en plein jour ; FM opposée de chaque obstacle magique assistée, auteur et effet à déclarer. La vue claire ne dissipe rien.']),
 'Cape chatoyante':womSpec(65,9,'Vous','Vous','Bonus de Force Mentale minutes',{type:'special',damageCapToSlOnly:true,specialState:{cannotHide:true},immunities:{damage:[{filter:{not:['magical','melee','ranged']},label:'Cape : autres dégâts non magiques'}]}},['Blessures des attaques ordinaires égales aux seuls DR, sans BE ni PA ; autres dégâts non magiques annulés. Attaques magiques inchangées. Impossible de se cacher ; pas simple−3DR de Discrétion.']),
 'Dérèglement temporel':womSpec(65,11,'Vous','ZdE Force Mentale mètres','Instantané',{type:'special',aoe:true,targetRule:{alliesOnly:true},receiptFormulas:{actionsBonus:1,mouvementsBonus:0}},['Chaque allié une Action, aucun déplacement supplémentaire ; ordre Initiative, puis initiative normale après lanceur. Initiative et Action supplémentaire : reçus MJ, pas de compteur dédié.']),
 'Acceptation du Destin':womSpec(122,6,'ZdE 2 × Bonus de Force Mentale mètres','Vous',womBFM,{type:'special',targetRule:{alliesOnly:true},specialState:{fearImmune:true,terrorAsFear:true},facts:[cbMode('Acceptation : formulation',[['normal','Alliés : Peur immunisée, Terreur comme Peur'],['enemies','Ennemis : Calme ou fuite interdite']])],factModes:{fact:'mode',values:{enemies:{targetRule:{enemiesOnly:true},specialState:{cannotFlee:true},secondaryTest:cbTest('Calme','FM')}}}},['Psychologies causées par chagrin supprimées définitivement, à reporter par le MJ ; autres Peur/Brisé préexistants conservés. Variante ennemie : Calme+0 ou ne peut fuir.']),
 'Amarante':womSpec(122,7,'Vous','Vous','Bonus de Force Mentale minutes',{type:'special',talents:['Résistance (Poison)','Résistance (Maladies)','Résistance (Chaos)'],receiptFormulas:{critiqueRecuModificateur:-10,niveauSupplementaireSiConnu:0},receiptOvercast:{niveauSupplementaireSiConnu:{id:'levels',perFormula:1}}},['Critiques reçus−10 ; chaque talent déjà connu reçoit un niveau par+2DR, reçu de fiche conditionnel ; pas de niveaux fictifs pour les talents nouveaux.']),
 'Âme Emprisonnée':womSpec(122,12,'Contact','1','Spécial',{type:'special',durationOverride:'Spécial',conditions:['Inconscient'],lockConditions:true,expireConditions:true,facts:[cf('soulVessel','Âme : récipient déclaré','text')],specialState:{coma:true,cannotMove:true,cannotSpeak:true,assistedReminder:'Jusqu’à ouverture correcte près du corps par mage Améthyste/prêtre de Morr ; réveil puis Corruption modérée. Ouverture erronée/lointaine : mort et Fantôme. Alimentation et réceptacle : MJ.'}},['Coma indéfini, aucune durée arbitraire saisie. Libération, alimentation, mort et Fantôme : reçus MJ ; ingrédients entièrement exclus.']),
 'Contrainte des Esprits':womSpec(123,6,'Bonus de Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Jusqu’au lever du soleil',{type:'special',assistedSummon:true,targetRule:{requiredAllTraits:[['mort-vivant','undead'],['ethere','ethereal']]},opposedTest:cbOpposed,specialState:{controlledByCaster:true},facts:[cbMode('Esprits : application',[['normal','Commander aux esprits existants'],['summon','Invoquer des Fantômes sans contrôle']]),cf('minutesToDawn','Esprits : minutes jusqu’à l’aube','number',{min:1,max:1440})],durationFact:{quantityFact:'minutesToDawn',unit:'minutes'},factModes:{fact:'mode',values:{summon:{targetRule:{},opposedTest:null,specialState:{assistedReminder:'Fantômes invoqués non contrôlés ; commander exige un second lancement.'},receiptFormulas:{fantomes:'DR'}}}}},['Commande FM opposée sur Mort-vivant ET Éthéré ; pas de mise au repos. Invocation DR final Fantômes : profil V5 à saisir par MJ, reçu chiffré sans monstre à12B inventé. Fin à l’aube déclarée.']),
 'Labyrinthe de Cristal':womSpec(123,13,womFM,'ZdE Bonus de Force Mentale mètres','Instantané',{type:'special',targetRule:{enemiesOnly:true},durationOverride:'Spécial',movementSet:0,specialState:{cannotMove:true,cannotAct:true,crystalMaze:true},immunities:{damage:[{filter:null,label:'Labyrinthe : hors du monde matériel'}]},roundEffect:{phase:'endOfTurn',after:1,table:{sides:10,outcomes:[{min:1,max:3,end:true,label:'Retour au point de disparition'},{min:4,max:6,label:'Confus, nouveau dé au prochain Tour'},{min:7,max:9,end:true,hoursDie:true,label:'Perdu d10 heures puis retour et Corruption modérée'},{min:10,max:10,permanent:true,label:'Perdu définitivement au Royaume de Tzeentch'}]}}},['Chaque cible : d10 à sa fin de Tour suivante ; sorties, d10 heures, exposition modérée et perte définitive sont explicitement journalisés. Géométrie, départ et retour hors scène : MJ.']),
 'Délivrance de la Mort':womSpec(123,5,'Moitié de l’Initiative mètres','1','3 Rounds',{type:'special',targetRule:{requiredAllTraits:[['mort-vivant','undead'],['ethere','ethereal']]},roundEffect:{phase:'endOfTurn',test:{skill:'Calme',stat:'FM',modifierSl:0},failConditions:['Sonné'],releaseAtStunned:3}},['Trois Rounds : Calme+0 chaque Round, Sonné sur échec ; trois Sonné total libèrent l’esprit. Ni résurrection ni dégâts ; existence hors scène après repos : MJ.']),
 'Destin de Bjuna':womSpec(123,8,'Moitié de la Force Mentale mètres','ZdE Bonus de Force Mentale mètres','Bonus de Sociabilité Rounds',{type:'special',roundEffect:{phase:'endOfTurn',test:{skill:'Calme',stat:'FM',modifierSl:0},failConditions:['Sonné'],damageOnlyOnTestFailure:true,damage:{formula:'BF + 6',targetFormula:true,ignoreAp:true},headOrBody:true},optionRules:{suffocate:{chosenTargets:true,secondaryTest:cbTest('Force Mentale','FM'),immediateSuffocation:true}}},['Chaque Round Calme+0 ; échec : Sonné et BF propre+6 sans PA, BE conservé, tête/corps50%. +2DR : une cible choisie teste FM+0, échec suffocation immédiate et continue.']),
 'Flétrissement des Membres':womSpec(124,5,womFM,'1','Bonus de Force Mentale minutes ou jours',{type:'special',facts:[cbMode('Flétrissement : application',[['normal','Membre désigné'],['grave','Tombe protégée pendant un an']]),cf('limb','Flétrissement : membre déclaré','select',{options:[['leftArm','Bras gauche'],['rightArm','Bras droit'],['leftLeg','Jambe gauche'],['rightLeg','Jambe droite']]})],durationOverride:'Bonus de Force Mentale minutes',specialStateFactValues:{disabledLimb:'limb'},factModes:{fact:'mode',values:{grave:{durationOverride:'Spécial',specialStateFactValues:{},receiptFormulas:{protectionAns:1,maledictionJours:'BFM'}}}}},['Membre traité comme amputé, sans Critique permanent. Tombe : premier profanateur de l’année, membre aléatoire, malédictionBFMjours ; déclenchement futur et d’un membre réel : MJ.']),
 'Révélation de Shyish':womSpec(124,4,'ZdE Bonus de Force Mentale mètres','Vous','Bonus d’Initiative minutes',{type:'narrative',receiptFormulas:{moisReveles:'1 + DR',questions:0},receiptOvercast:{questions:{id:'questions',perFormula:1}}},['Mort de chaque espèce et dates, sans noms ni causes ; horizon1+DRmois. Personne morte connue : une question par+2DR répondable en coups. Informations : MJ.']),
 'Vitesse de Lykos':womSpec(124,3,'Moitié de l’Initiative mètres','1','1 Round',{type:'special',receiptFormulas:{deplacementProchainRound:100,actionEnMourant:1},specialState:{actionBeforeDeath:true}},['Prochain Round100m et une Action normale, obstacles conservés ; si mort pendant le sort, une Action immédiate avant mort. Distance et Action de mort : reçus MJ, aucun M+4 inventé.']),
 'Goût de la Mort':womSpec(125,7,'Moitié de la Force Mentale mètres','1 + ZdE Spécial','Instantané',{type:'special',targetRule:{enemiesOnly:true,exceptAnyTrait:['daemon','demon','mort-vivant','undead','construct']},primarySecondaryTests:{primary:{...cbTest('Calme','FM'),conditionsOnly:true},others:{...cbTest('Calme','FM',{modifierSl:2}),conditionsOnly:true}},primaryConditions:['Inconscient'],splashConditions:['Sonné'],followupTest:{skill:'Calme',stat:'FM',modifierSl:4,rollField:'despairRoll',conditions:['Exténué'],state:{despair:true}},receiptFormulas:{rayonSecondaires:'BInitiative',desespoirJours:7}},['Primaire : exposition mineure à Corruption puis Calme+0/Inconscient. Voisins BI : Calme+2/Sonné. Tout échec : Calme+4 ou Exténué et Désespoir, Exténué chaque réveil pendant une semaine (MJ, aucun dé implicite).']),
 'Télépathie':womSpec(125,1,'100 mètres','1','Instantané',{type:'special',secondaryTest:cbTest('Intuition','I',{outcomeOnly:true}),facts:[cbMode('Télépathie : application',[['normal','Message'],['read','Lire pensées de mage Améthyste']])],factModes:{fact:'mode',values:{read:{secondaryTest:cbTest('Intelligence','Int',{outcomeOnly:true}),specialState:{assistedReminder:'Lecture d’un mage Améthyste : Intelligence+0 remarque ; si détecté, FM opposée peut bloquer. Message sans limite par Âme Emprisonnée : hors périmètre ingrédients.'}}}}},['Messages compris après Intuition+0. Pensées seulement mage Améthyste ; détection Intelligence puis FM opposée assistée, sans vol de mémoire permanent.']),
 'Marée des Âges':womSpec(125,3,'Bonus de Force Mentale mètres','1','Instantané',{type:'special',facts:[cbMode('Marée : cible',[['normal','Objet non magique'],['living','Créature vivante, +4DR']]),cf('objectEncumbrance','Marée : encombrement de l’objet','number',{min:0,integer:false,requiredWhen:{key:'mode',value:'normal'}}),cf('objectMagical','Marée : objet non magique','boolean',{expected:false,requiredWhen:{key:'mode',value:'normal'}}),cf('objectDurable','Marée : objet Durable','boolean',{requiredWhen:{key:'mode',value:'normal'}})],receiptFormulas:{encombrementMax:2},receiptOvercast:{encombrementMax:{id:'enc',perFormula:1}},factModes:{fact:'mode',values:{living:{receiptFormulas:{},targetRule:{exceptAnyTrait:['daemon','demon','mort-vivant','undead','vegetal','plant','construct']},requiresSpecificOption:'living',secondaryTest:cbTest('Calme','FM',{modifierSl:2}),permanentStatDice:{F:'damageF',E:'damageE'}}}}},['Objet Durable perd toutes ses Qualités, autres objets en poussière ; inventaireMJ. Vivant +4DR : Calme+2 ou F/E−d10 séparés et permanents ; immunités Démon/Mort-vivant/végétal.']),
 'Danse du Désespoir':womSpec(110,13,'ZdE Force Mentale mètres','Vous',womBFM,{type:'special',targetRule:{enemiesOnly:true},secondaryTest:cbTest('Force Mentale','FM'),conditionsOnExpiry:['Exténué'],specialState:{danceRequired:true},triggered:{event:'dance',test:{skill:'Athlétisme',stat:'Ag',modifierSl:-2},alternativeTest:{skill:'Représentation (Danse)',stat:'Ag',modifierSl:0},testOnly:true}},['Ennemis seulement. FM+0 résiste ; avant mouvement/Action : Athlétisme−2 ou Représentation Danse+0. Exténué uniquement à la fin de la couche ; demande d’action réelle via interaction MJ.']),
 'Égarer':womSpec(110,5,womFM,'1',womBFM,{type:'special',secondaryTest:cbTest('Force Mentale','FM'),facts:[cf('behaviourRoll','Égarer : comportement pour toute la durée (d10)','number',{min:1,max:10})],factTable:{fact:'behaviourRoll',outcomes:[{min:1,max:2,state:{actionRequiresWillpower:true},label:'FM+0 avant Action'},{min:3,max:4,state:{randomMove:true},label:'Action normale, direction aléatoire'},{min:5,max:6,state:{chargeNearest:true},label:'Charge et attaque du plus proche'},{min:7,max:8,state:{onlyStandAndDodge:true},label:'Immobile, Esquive seule'},{min:9,max:10,conditions:['À Terre'],state:{helpless:true},label:'À Terre et Sans défense'}]},expireConditions:true},['Un seul d10 de comportement pour la durée, pas automatiquement À Terre pour tous les résultats. Directions, plus proche, charges et Tests futurs : MJ.']),
 'Horreurs Noires':womSpec(110,6,womFM,'ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale heures',{type:'narrative',receiptFormulas:{peur:1},receiptOvercast:{peur:{id:'fear',perFormula:1,max:4}}},['Ombre hantée Peur1 jusqu’à4, sans attaque. La Peur appartient à l’ombre, jamais à ses victimes ; terrain et cibles futures : MJ.']),
 'Pont d’Ombres':womSpec(110,6,womFM,'ZdE Bonus de Force Mentale mètres','1 Round',{type:'special',facts:[cf('unwilling','Pont : cible consentante','boolean',{perTarget:true,expected:false}),cf('pathDeclared','Pont : ligne de vue et trajet sans matière solide','boolean',{expected:true}),cf('distance','Pont : distance depuis le départ','number'),cf('obstacleHeight','Pont : hauteur d’obstacle','number')],receiptFormulas:{distanceMax:'FM',hauteurObstacleMax:'FM'},factLimits:{distance:'FM',obstacleHeight:'FM'},specialState:{}},['Groupe arrive seulement à expiration (un Round) ; destination/vol réel : MJ, pas de téléportation instantanée.']),
 'Poches Profondes':womSpec(111,5,'Contact','Spécial','Bonus de Force Mentale heures',{type:'narrative',facts:[cf('objectId','Poches : objet ou conteneur unique','text'),cf('objectEncumbrance','Poches : encombrement réel','number',{min:0,integer:false})],receiptFormulas:{encombrementMax:1},receiptOvercast:{encombrementMax:{id:'enc',perFormula:1}}},['Objet invisible et sans poids, impossible à Perception ; récupérer coûte une Action. Objet non récupéré à expiration perdu. Inventaire et sortie : MJ ; Encombrement1+palier.']),
 'Grande Illusion':womSpec(111,14,womFM,'ZdE Bonus d’Initiative mètres','Force Mentale minutes',{type:'narrative',facts:[cf('illusionDescription','Grande Illusion : description complète','text')],specialState:{}},['Cinq sens, mouvements ; vraie pour croyant seulement ; Seconde vue Intuition−1 révèle sa nature sans terminer ni dissiper. Description, croyance et consequences spatiales : MJ.']),
 'Ailes Grises':womSpec(111,6,womFM,'1 (maximum)','Instantané',{type:'special',facts:[cf('unwilling','Ailes : cible non consentante','boolean',{perTarget:true})],secondaryTest:cbTest('Esquive','Ag',{modifierSl:4,whenFact:'unwilling',rollField:'dodgeRoll'}),receiptFormulas:{teleportation:100},receiptOvercast:{teleportation:{id:'distance',perFormula:100}}},['Distance depuis départ, +100m par+2DR ; traverse matière solide, sans ligne de vue requise. Destination : MJ ; Esquive+4 réelle si non consentante.']),
 'Silence':womSpec(111,3,womFM,'1 avec ZdE Bonus de Force Mentale mètres','Bonus de Force Mentale minutes',{type:'special',facts:[cf('unwilling','Silence : cible consentante','boolean',{perTarget:true,expected:false}),cf('mode','Silence : formulation','select',{options:[['normal','Aucun son ne sort'],['in','Aucun son n’entre'],['all','Aucun son dans la zone']]})],specialState:{silenceMode:'out'},factModes:{fact:'mode',values:{in:{specialState:{silenceMode:'in'}},all:{specialState:{silenceMode:'all'}}}}},['Hush Ulgu du supplément selon arbitrage ; aura suit cible/objet, non consentant interdit. Trois modes distincts, aucun surcoût ni règle du Silence Arcane importé.']),
 'Gouffre de Tarnus':womSpec(112,8,womFM,'ZdE Bonus de Force Mentale mètres',womBFM,{...cbPit,receiptFormulas:{diametre:'BFM',profondeur:'BFM',ecrasementDegats:20}},['Diamètre/profondeurBFM ; Esquive+0, échec marginal permet bord (MJ). Fermeture réelle demande occupants restants, 20 dégâts, Protection puis suffocation. Aucun écrasement au lancement.']),
 'Illusion rétroactive de Ribauld':womSpec(112,11,womFM,'Spécial','Instantané',{type:'narrative',facts:[cf('mjAdmissible','Ribauld : objet≤maison, non célèbre, emplacement plausible, hors sol','boolean',{expected:true})],receiptFormulas:{teleportation:'FM'}},['Déplace terrain et occupants ; ni colline, lieu célèbre, objet supérieur à maison ni emplacement impossible. Admission et positions MJ.']),
 'Bosquet d’ombres':womSpec(112,5,womFM,'ZdE Initiative mètres','Bonus de Force Mentale heures',{type:'narrative',facts:[cf('light','Bosquet : lumière réelle présente','boolean',{expected:true})],receiptFormulas:{attaqueContreReveleDR:-1}},['Ombres des invisibles et possesseurs visibles ; −1DR aux attaquants des révélés, pas au participant destinataire. Ne fonctionne pas en obscurité totale ; position et attaquants déclarésMJ.']),
 'Substance d’Ombre':womSpec(113,9,'Contact','1','Spécial',{type:'special',durationOverride:'Spécial',facts:[cf('sourceShadow','Substance : cible entièrement dans une ombre','boolean',{expected:true}),cf('visibleLight','Substance : source lumineuse visible masquée par un objet','boolean',{expected:true}),cf('totalDarkness','Substance : obscurité totale','boolean',{expected:false})],immunities:{damage:[{filter:{not:['magical']},label:'Substance : attaques matérielles'}]},specialState:{invisible:true,immaterial:true,endsOnEvents:['leave-shadow']}},['Peut attaquer/toucher les corps matériels ; attaques magiques normales. Toute partie hors ombre termine ; obscurité totale insuffisante. Position, poussée et toucher : MJ, immunité aux dégâts matérielle exécutée.']),
 'Traître de Tarn':womSpec(113,12,womFM,'1','Force Mentale minutes',{type:'special',facts:[cbMode('Traître : relation initiale',[['normal','Ennemi'],['neutral','Neutre'],['ally','Allié']])],opposedTest:cbOpposed,specialState:{controlledByCaster:true},factModes:{fact:'mode',values:{neutral:{opposedTest:null,specialState:{},receiptFormulas:{sociabiliteDuLanceurContreNeutreDR:2}},ally:{opposedTest:null,specialState:{},receiptFormulas:{aucunEffet:1}}}},triggered:{event:'former-ally',test:{skill:'Calme',stat:'FM',modifierSl:0},endsOnSuccess:true}},['Ennemi FM opposée ; ordres suicidaires refusés ; chaque attaque d’ancien allié permet Calme+0 pour rompre. Neutre : bonus+2DR du lanceur seulement contre lui. Alliés sans effet, relations et ordres MJ.']),
 'Ombre Vagabonde':womSpec(113,4,'Vous','Vous','Bonus de Force Mentale minutes',{type:'narrative',assistedSummon:true,receiptFormulas:{mouvement:'M',distanceMaxLumiere:48,peur:1},specialState:{shadowSensor:true}},['Action pour diriger, sinon immobile. Vue/ouïe/odorat depuis ombre, aucun sort ni attaque ; détruite au soleil direct ou à>48m de source lumineuse. Géométrie et capteur : reçus MJ, aucune créature à1B inventée.'])
});
// Retours Lot5A, WoM pp.74,100–101 : textes propres au mode, faits sans calcul facultatifs.
CATALOGUE_SOURCE['Miroir Mystique'].assisted=['Communication par miroir ou eau calme dans FM miles avec personne connue ou nommée ; chacun voit/entend l’autre. Échoue si aucune surface réfléchissante dans le regard du destinataire. Communication et surfaces : MJ, aucun bonus de Protection.'];
CATALOGUE_SOURCE['Armure d’étain'].assisted=['Armures métalliques réellement portées : −2 PA par localisation, minimum zéro, pendant BFM Rounds ; PA non métalliques conservés. Matériau de chaque localisation à déclarer.'];
CATALOGUE_EFFECTS['Tempête de Shemtek'].reminderModes={fact:'catalogueMode',values:{safe:['Variante sûre : BI éclairs dans une zone2×BFM, projectile+6 ; sans Sonné du lanceur ni Peur des témoins. Cibles et emplacement : MJ.']}};
const optionalCatalogueFacts={'Substance d’Ombre':['sourceShadow','visibleLight','totalDarkness'],'Silence':['unwilling'],'Illusion rétroactive de Ribauld':['mjAdmissible'],'Bosquet d’ombres':['light'],'Âme Emprisonnée':['soulVessel'],'Marée des Âges':['objectMagical','objectDurable'],'Pont d’Ombres':['unwilling','pathDeclared'],'Lumière de pureté':['lightRange'],'Tête Brûlante':['pathDeclared'],'Flamme Captivante':['observersDeclared'],'Murmure de la Nature':['riverOrTree'],'Geyser':['direction'],'Cri de Guerre du Jardinier':['patchEarth'],'Crevasse':['patchEarth'],'Gouffre de Tarnus':['patchEarth'],'Bibliothécaire instantané de Meissner':['requestedBook','topicWords'],'Grande Illusion':['illusionDescription'],'Poches Profondes':['objectId'],'Orbe de Hysh':['objectId'],'Tempête de Flammes':['minutesToDawn'],'Colérique':['ireSubject'],'Forge de Tarnus':['sourceFire'],'Miroir Mystique':['reflection','knownTarget'],'Essais et Erreurs':['skill']};
for(const [name,keys] of Object.entries(optionalCatalogueFacts))for(const field of CATALOGUE_SOURCE[name].effects.facts || [])if(keys.includes(field.key))field.optional=true;
for(const field of CATALOGUE_EFFECTS['Polir et Exalter'].facts || [])if(field.key==='glassLens')field.optional=true;
const contracts = [];
const usedSpecificOvercast = new Set();

for (const item of audit.items) {
  let dInfo = DOMAIN_MAP[item.type] || { domain: 'arcane', wind: null };
  if (item.type === 'Magie Elfique Arcanique') {
    dInfo = { domain: 'elven-arcane', wind: extractElvenWinds(item.name) };
  }

  const isJadeVariant = item.row === 127 || item.id === 'spell-audit-44d3e9b3a2c7a6e5cef2';
  if (isJadeVariant) {
    dInfo = { domain: 'life', wind: 'Ghyran' };
  }

  const cName = item.source?.canonical?.name || item.name;
  const domainVerified = item.source?.edition === 'V5 local, correspondance contrôlée' && ['beasts','heavens','fire','light','metal','death','shadow','life'].includes(dInfo.domain);
  const domainConfig = CATALOGUE_SOURCE[item.name] || WOM_SOURCE[item.name] || ELVEN_SPELL_CONFIG[cName] || (domainVerified ? DOMAIN_V5[cName] : item.source?.edition === 'V5 local, correspondance contrôlée' ? ARCANE_PETTY_V5[cName] : null);
  const v5Params = { ...resolveV5SpellParameters(item), ...Object.fromEntries(Object.entries(domainConfig || {}).filter(([key]) => ['cn','range','target','duration'].includes(key))) };

  const overrideConfig = V5_PARAMETER_OVERRIDES[cName]?.effects || V5_PARAMETER_OVERRIDES[item.name]?.effects || V5_PARAMETER_OVERRIDES[item.id]?.effects;
  const effConfig = structuredClone(domainConfig?.effects || overrideConfig || SPELL_EFFECTS_CONFIG[cName] || SPELL_EFFECTS_CONFIG[item.name] || SPELL_EFFECTS_CONFIG[item.id]);
  if(['Serrure ouverte','Créer un petit animal','En catimini','Enchantement Végétal (Ghyran & Chamon)','Flèche Bénie','Révéler la Magie','Malédiction de rouille','Flamme Attisée','Pont d’Ombres','Poches Profondes','Orbe de Hysh'].includes(item.name))for(const fact of effConfig?.facts || [])if(!(fact.owner==='caster'||fact.type==='select'))fact.optional=true;
  if(effConfig?.restoreCorpse)for(const fact of effConfig.facts || [])if(fact.key==='corpseAgeSeconds')delete fact.max;
  if(effConfig && /^zde|zone|aoe/i.test(v5Params.range))effConfig.aoe=true;
  if (!effConfig) {
    throw new Error(`Sort non configuré explicitement : row ${item.row} - ${item.name} (${cName})`);
  }
  if(effConfig.factsCalendar)(effConfig.facts ??=[]).push(cf('monthsDays','Flamme : jours des BFM mois calendaires (MJ)','number',{min:1,requiredIfOvercast:'months'}));
  delete effConfig.factsCalendar;
  for(const fact of effConfig.facts || [])if(fact.type==='select')fact.owner='caster';
  for(const [id,rule] of Object.entries(effConfig.optionRules || {}))if(rule.chosenTargets)(effConfig.facts ??=[]).push({key:'optionTargets_'+id,label:'Option '+id+' : destinataires, un par palier',type:'targets',requiredIfOvercast:id});
  for(const [option,rule] of Object.entries(effConfig.optionRules || {}))if(rule.test)(effConfig.facts ??= []).push({key:'optionRoll_'+option,label:'Option '+option+' : '+rule.test.skill+' (d100, '+rule.test.modifierSl+' DR)',type:'number',min:1,max:100,requiredIfOvercast:option});
  const overcast = buildOvercastOptions(item, dInfo.domain, v5Params, effConfig, domainVerified || Boolean(domainConfig));
  const specificOptions = OVERCAST_SPECIFIC[item.name];
  if (specificOptions && overcast.allowed) {
    usedSpecificOvercast.add(item.name);
    overcast.specific = structuredClone(specificOptions).map(option=>{const rule=effConfig.optionRules?.[option.id];return rule && !rule.targetTest && !rule.dispelBonusPerStep && !rule.receiptOnly && option.kind==='reminder'?{...option,kind:'contract-rule'}:option;});
    if (!overcast.options.includes('special')) overcast.options.push('special');
  }
  const treatment = effConfig.type==='narrative'?'narrative':domainConfig?.treatment || normalizeTreatment(item);
  if(effConfig.durationFactFormula && !overcast.options.includes('duration'))overcast.options.push('duration');
  if(item.name==='Esprit du Foyer')effConfig.summon.destroyedByWater='Détruit par une pinte d’eau ou plus.';
  const reminders = readableReminder([catalogueDescriptions.get(catalogueNameKey(item.name)) ?? extractReminders(item) ?? '',SOURCE_REMINDER_OVERRIDES[item.name]].filter(Boolean).join(' '));
  const sharedWith = sharedWithMap.get(item.id) || null;

  const isBookV5 = item.source?.edition === 'V5 local, correspondance contrôlée';
  const isElf = item.source?.edition === 'Supplément elfe, adaptation V5 requise';
  const isWom = item.source?.edition === 'Winds of Magic contrôlé, adaptation V5 requise';
  const isCatalogue = item.source?.edition === 'Catalogue relu ; adaptation des règles générales V5';
  const ficheFollowUp = (item.scopes || []).includes('fiche');

  const planLower = (item.effectPlan || '').toLowerCase();
  const notesLower = (item.correctionNotes || []).join(' ').toLowerCase();
  const isVortex = Boolean(effConfig.vortex) || effConfig.type === 'vortex' || planLower.includes('vortex') || notesLower.includes('vortex');
  const isAuxiliary = effConfig.type === 'summon' || planLower.includes('auxiliaire') || planLower.includes('invocation') || notesLower.includes('auxiliaire');

  const contract = {
    id: item.id,
    row: item.row,
    name: item.name,
    canonicalName: cName,
    page: isJadeVariant ? 245 : domainConfig?.page ?? item.source?.canonical?.page ?? 240,
    ...(dInfo.domain==='elven-arcane'?{attributePolicy:'first-wind-default'}:{}),
    domain: dInfo.domain,
    wind: dInfo.wind,
    type: item.type,
    cn: v5Params.cn,
    range: v5Params.range,
    target: v5Params.target,
    duration: v5Params.duration,
    sourceFingerprint: item.source?.fingerprint,
    treatment,
    overcast,
    // `overcastFortunePer2Sl` ne sert qu'à construire les options de surpuissance : il n'est pas écrit dans le contrat.
    effects: Object.fromEntries(Object.entries(effConfig).filter(([key]) => key !== 'overcastFortunePer2Sl')),
    reminders: readableReminder([reminders, ...(domainConfig?.assisted || [])].filter(Boolean).join(' ')) || null,
    ...(domainConfig ? {assistedClauses: (domainConfig.assisted || []).map(readableReminder)} : {}),
    sharedWith,
    edition: item.source?.edition,
    isBookV5,
    isElf,
    isWom,
    isJadeVariant,
    isCatalogue,
    ficheFollowUp,
    isVortex,
    isAuxiliary
  };

  readableEffectLabels(contract.effects);
  for(const option of contract.overcast.specific || [])option.label=readableReminder(option.label);
  contracts.push(contract);
}

const unmatchedSpecific = Object.keys(OVERCAST_SPECIFIC).filter(name => !usedSpecificOvercast.has(name));
if (unmatchedSpecific.length) throw new Error(`Options de surpuissance propres sans contrat : ${unmatchedSpecific.join(', ')}`);
console.log(`Génération terminée : ${contracts.length} contrats au total.`);
console.log(`- V5 Livre de base : ${contracts.filter(c => c.isBookV5).length}`);
console.log(`- Supplément Elfe : ${contracts.filter(c => c.isElf).length}`);
console.log(`- Winds of Magic : ${contracts.filter(c => c.isWom).length}`);
console.log(`- Variante Jade : ${contracts.filter(c => c.isJadeVariant).length}`);
console.log(`- Catalogue général : ${contracts.filter(c => c.isCatalogue).length}`);
console.log(`- Suivi Fiche : ${contracts.filter(c => c.ficheFollowUp).length}`);
console.log(`- Vortex : ${contracts.filter(c => c.isVortex).length}`);
console.log(`- Auxiliaires / Invocations : ${contracts.filter(c => c.isAuxiliary).length}`);

// Vérification de couverture et cohérence
const narrativeMismatches = contracts.filter(c => c.treatment !== 'narrative' && c.effects?.type === 'narrative');
console.log(`- Mismatches narrative / engine/mjInput : ${narrativeMismatches.length}`);

// Sauvegarde dans js/data/v5-spell-contracts.json
fs.writeFileSync('js/data/v5-spell-contracts.json', JSON.stringify(contracts, null, 2), 'utf8');
console.log('Fichier js/data/v5-spell-contracts.json écrit avec succès.');

// Import dynamique du moteur pour vérifier l'exécution réelle de chaque contrat
const {
  previewSpellExecution,
  applySpellExecution,
  getContractChoiceOptions,
  IMPLEMENTED_SPECIAL_HANDLERS
} = await import('../js/core/v5-spell-contracts.js');
const { parseSpellDuration } = await import('../js/core/v5-magic-effects.js');
const { SPECIFIC_OVERCAST_KINDS } = await import('../js/core/v5-magic-overcast-options.js');
const { REMINDER_FLAGS, MARKER_ONLY_SPECIAL_STATES, reminderFlagTexts } = await import('../js/core/v5-magic-reminder-flags.js');
const {normalizeArmorLocations} = await import('../js/core/equipment.js');

// Comparaison de l'état produit, sans journal, métadonnées de couches ni reçus MJ.
function measuredSpellState(draft){return draft.combat.participants.map(p=>{
 const v=p.extensions?.v5 || {},special={...v.specialStates};for(const key of MARKER_ONLY_SPECIAL_STATES)delete special[key];delete special.reminderFlags;
 const mechanical={...v,specialStates:special};for(const key of ['spellEffects','baseCaracs','baseArmor','baseTraits','suppressedEffectIds','suppressedSpellIds','appliedSpellExecutions'])delete mechanical[key];if(p.id==='probe-caster')delete mechanical.channelling;
 const compact=value=>Array.isArray(value)?value.map(compact):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,compact(v)]).filter(([,v])=>v!==undefined&&v!==null&&v!==false&&v!==0&&!(typeof v==='object'&&Object.keys(v).length===0)).sort(([a],[b])=>a.localeCompare(b))):value;
 return {id:p.id,hp:p.hp,maxHp:p.maxHp,caracs:p.caracs,armor:normalizeArmorLocations(p.armor),traits:p.traits||[],states:(p.states||[]).map(s=>typeof s==='string'?{name:s,level:1}:{name:s.name||s.label||s.key,level:s.level||1}).sort((a,b)=>String(a.name).localeCompare(String(b.name))),actions:p.actions||[],mechanical:compact(mechanical),fortune:p.fortune,fate:p.fate,temporaryFortune:getV5Fortune(draft,p).temporary,temporaryFate:getV5Fate(draft,p).temporary};
});}

// La sonde fournit tous les faits et dés que le moteur exige (même jeu que le test des contrats) : sans eux
// l'aperçu serait bloqué (« dice-required », durée MJ…) et un contrat réalisé serait compté « restant à réaliser ».
const probeCaster = {
  id: 'probe-caster',
  name: 'Probe Caster',actions:[{id:'blade',type:'attack',attr:'CC',base:50,damage:3,note:'Arme déclarée de la sonde'}],
  camp: 'pj',
  kind: 'PJ',
  hp: 9,
  maxHp: 15,
  fortune: 2,
  fate: 2,
  caracs: { CC: 50, CT: 50, F: 40, E: 40, I: 50, Ag: 50, Dex: 50, Int: 60, FM: 60, Soc: 50, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 90 }],
  armor: { head: 2, body: 2, arms: 2, legs: 2 },
  states: ['Frénésie', 'Peur', 'Sonné', 'Aveuglé', 'Assourdi', 'Brisé'],
  traits: [],
  extensions: { v5: { channelling: { sl: 4, wind: 'Aqshy' }, spellEffects: [] } }
};
const probeAlly = { ...structuredClone(probeCaster), id: 'probe-ally', name: 'Probe Ally' };
const probeEnemy = { ...structuredClone(probeCaster), id: 'probe-enemy', name: 'Probe Enemy', camp: 'ennemi', kind: 'PNJ' };
const probeDaemon = { ...structuredClone(probeEnemy), id: 'probe-daemon', name: 'Probe Daemon', traits: ['Démoniaque'], caracs: { ...probeEnemy.caracs, E: 40 } };
const probeCorpse = { ...structuredClone(probeAlly), id: 'probe-corpse', name: 'Probe Corpse', hp: 0, dead: true, roundsDead: 2 };

function probeTargetsFor(c) {
  const isSelf = /^vous$/i.test((c.target || '').trim());
  const isAllyOnly = Boolean(c.effects?.targetRule?.alliesOnly || c.effects?.alliesOnly)
    || ['hand-of-glory', 'shield-of-saphery', 'acceptance-of-fate', 'time-amok', 'merciw-monstrous-regiment', 'twist-of-fate', 'hunters-moons', 'timewarp', 'monstrous-regiment', 'ox-stands'].includes(c.effects?.special)
    || ['Main de Gloire', 'Bouclier de Saphery', 'Ironie du Destin', 'Lunes du Chasseur', 'Dérèglement temporel', 'Régiment Monstrueux de Merciw', 'Le Bœuf Reste Debout'].includes(c.name);
  if (c.effects?.excludeCaster || c.effects?.special === 'merciw-monstrous-regiment') return [probeAlly];
  if (isSelf || c.effects?.special === 'transformation-of-kadon') return [probeCaster];
  if (isAllyOnly) return [probeAlly];
  if (c.effects?.special === 'daemonbane' || c.effects?.targetRule?.requiredAnyTrait) return [probeDaemon];
  if(c.effects?.targetRule?.requiredAllTraits)return [{...probeEnemy,traits:c.effects.targetRule.requiredAllTraits.map(group=>group[0])}];
  if(c.effects?.targetRule?.requiredTrait)return [{...probeEnemy,traits:[c.effects.targetRule.requiredTrait]}];
  if (c.effects?.special === 'verdant-apotheosis' || c.effects?.killAtZero) return [probeCorpse];
  return [probeEnemy];
}

// Faits et dés que la sonde fournit pour exécuter un contrat (couverture et options de surpuissance propres).
function probeInputFor(c, targets) {
  const specialTag = c.effects?.special || c.effects?.mjInput?.special || null;
  const choices = getContractChoiceOptions(c);
  return {
    attributeActive: false, chosenLore:c.domain==='arcane'?'fire':undefined, ctRoll:25, damageRoll:7,
    fellowshipRoll: 20,
    enduranceRoll: 20,
    locationRoll: 34, targetTests: { 'probe-corpse': { deathDelaySec: 30 }, [targets[0].id]:{friend:false,objectHeld:true,objectId:'blade',unwilling:false,mount:false,inside:true,throwDirection:4,collision:false,sunTouched:false,deathDelaySec:30,distance:10,dodgeRoll:95,resistanceRoll:95,voluntaryTired:false} }, monsterProfile: { name: 'Sonde',size:'large', M: 6, hp: 20, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: [] }, beastKey: 'wolf', chosenStats: ['CC'], roll3d10: 15, directionRoll:4, direction: 'N', willpowerSuccess: true, distanceRoll: 10,
    ...(specialTag === 'arcane-unforgiving' ? { arcaneTargets: { [targets[0].id]: { magicItemPresent: false } } } : {}),
    ...(choices.length > 0 ? { mjChoice: choices[0] } : {}),
    // Durée non lisible (Spécial, dés, unités multiples…) : donnée MJ saisie par la sonde
    ...(parseSpellDuration(c.duration, { caster: probeCaster, target: targets[0] }).kind === 'unknown' ? { mjDuration: { amount: 5, unit: 'minutes' } } : {})
  };
}

// Génération de la Matrice des 277 contrats de sorts V5 (docs/lot3/LOT3_MATRICE_CONTRATS_V5.md)
async function computeCoverageCategory(c) {
  const type=c.effects?.type,tag=c.effects?.special || c.effects?.mjInput?.special;
  if(!type || ['unimplemented','engine-effect','mj-assisted'].includes(type) || tag && !IMPLEMENTED_SPECIAL_HANDLERS.has(tag))return 'Contrat restant à réaliser';
  const measured=async(p,options,targets)=>{
    const participants=Array.from(new Map([probeCaster,probeEnemy,probeAlly,probeDaemon,...targets].map(t=>[t.id,structuredClone(t)])).values());
    const draft={localRevision:0,combat:{round:1,participants},extensions:{v5:{}}};
    const control=structuredClone(draft);
    applySpellExecution(control,{...c,name:'Sonde témoin',canonicalName:'Probe',isVortex:false,isAuxiliary:false,range:'Force Mentale mètres',target:'Spécial',treatment:'narrative',effects:{type:'narrative',aoe:c.effects.aoe,targetRule:c.effects.targetRule}},{...options,actorId:probeCaster.id,targetIds:targets.map(t=>t.id),allowUnchecked:true});
    const before=JSON.stringify(measuredSpellState(control));
    applySpellExecution(draft,c,{...options,actorId:probeCaster.id,targetIds:targets.map(t=>t.id),allowUnchecked:true,preview:p});
    if(JSON.stringify(measuredSpellState(draft))!==before)return true;
    for(const owner of draft.combat.participants)for(const effect of owner.extensions?.v5?.spellEffects || [])if(effect.triggered){
      for(const target of draft.combat.participants){const interaction=previewSpellInteraction(draft,{effectId:effect.id,targetId:target.id,kind:'trigger',roll:25,locationRoll:34,wardRoll:1});
        if(interaction.ready && JSON.stringify(measuredSpellState(interaction.state))!==JSON.stringify(measuredSpellState(draft)))return true;}
    }
    if(draft.combat.participants.some(t=>(t.extensions?.v5?.spellEffects || []).some(e=>e.roundEffect || e.expiryEffect)))return measurePeriodicSpellOutcome(draft,control,measuredSpellState);
    return false;
  };
  const choiceFacts=(c.effects.facts || []).filter(f=>f.owner==='caster' && f.type==='select' && !f.perTarget && !f.requiredIfOvercast);
  const choices=choiceFacts.reduce((cases,f)=>cases.flatMap(value=>f.options.map(([key])=>({...value,[f.key]:key}))),[{}]);
  let blocked=false,ready=false;
  for(const targets of [probeTargetsFor(c),[probeEnemy],[probeAlly],[probeCaster],[probeDaemon]])for(const facts of choices){
    const base=probeInputFor(c,targets),answers=Object.fromEntries([...targets,probeEnemy].map(t=>[t.id,{roll:95,resistanceRoll:95,dodgeRoll:95,wardRoll:1,despairRoll:95}]));
    const options={...base,sl:Math.max(6,c.cn+2),totalCastingSl:c.cn+6,mjChoice:undefined,monsterProfile:undefined,mjDuration:undefined,willpowerSuccess:undefined,domainFacts:facts,targetTests:answers,directionRoll:4,participants:[probeCaster,probeEnemy,probeAlly],secondaryTargets:{engaged:[probeEnemy.id],attacker:[probeEnemy.id]}};
    const p=previewSpellExecution(probeCaster,c,targets,options);
    if(p.ready){ready=true;if(await measured(p,options,targets))return c.ficheFollowUp?'Contrat à effet calculable + Rappel (Suivi fiche)':c.assistedClauses?.length?'Contrat à effet calculable + Rappel':'Contrat à effet calculable';}
    else if(p.status==='mj-fact-required' || !['invalid-target-admissibility','invalid-target-count','invalid-option'].includes(p.status) && !/cible.*(?:maximum|introuvable)|cette formulation/i.test(p.error || ''))blocked=true;
  }
  if(blocked)return 'Contrat nécessitant des données MJ';
  return c.ficheFollowUp?'Rappel (Suivi fiche)':'Rappel';
}

// Une option « calculée » l'est seulement si l'exécution du sort l'applique ; sinon elle est rétrogradée en rappel.
function probeSpecificOption(c, option) {
  if (!SPECIFIC_OVERCAST_KINDS.includes(option.kind)) return false;
  const targets=probeTargetsFor(c),need=c.cn+option.cost+1,base=probeInputFor(c,targets),domainFacts={...base.domainFacts,mode:'attractive',opposedActorRoll:25},targetTests=structuredClone(base.targetTests);
  for(const f of c.effects.facts || []){
    const value=f.type==='targets'?targets.map(t=>t.id):f.type==='boolean'?f.expected ?? true:f.type==='select'?f.options[0][0]:f.type==='number'?Math.max(f.min ?? 1,1):f.type==='object'?'blade':'Objet déclaré de la sonde';
    if(f.perTarget)for(const t of targets)(targetTests[t.id] ??={})[f.key]=value;else domainFacts[f.key]=value;
  }
  const mode=Object.entries(c.effects.factModes?.values || {}).find(([,effects])=>effects.requiresSpecificOption===option.id);
  if(mode){domainFacts[c.effects.factModes.fact]=mode[0];for(const field of Object.values(mode[1].permanentStatDice || {}))for(const t of targets)targetTests[t.id][field]=5;}
  for(const t of targets){targetTests[t.id].optionResistanceRoll=95;targetTests[t.id].roll=95;}
  const p=previewSpellExecution(probeCaster,c,targets,{...base,sl:need,totalCastingSl:need,domainFacts,targetTests,overcastSpecific:{[option.id]:1},burnoutRoll:50,resistanceRoll:95});
  return p.ready===true && p.overcastSpecific?.[0]?.applied===true;
}

const coverage=new Map();for(const c of contracts)coverage.set(c.id,await computeCoverageCategory(c));
const catCounts = {
  calculated: contracts.filter(c => coverage.get(c.id).startsWith('Contrat à effet calculable')).length,
  mjWired: contracts.filter(c => coverage.get(c.id).startsWith('Contrat nécessitant des données MJ')).length,
  reminder: contracts.filter(c => coverage.get(c.id).startsWith('Rappel')).length,
  remaining: contracts.filter(c => coverage.get(c.id) === 'Contrat restant à réaliser').length
};

const matrixRows = [
  '# Matrice de couverture des 277 contrats de sorts V5\n\n',
  'Date : 14 octobre 2026. Référence : `docs/lot3/LOT3_AUDIT_SORTS.json`, `docs/lot3/LOT3_CADRAGE_MAGIE.md`.\n\n',
  '> Classement par état réellement appliqué, comparé à un lancement témoin sans effets. Le lancement fournit dés et choix mais aucun fait de scène obligatoire ; une précondition absente garde le classement données MJ. Les effets périodiques sont ensuite mesurés sur deux Rounds de vraies fins de Tour, avec dés et présences explicitement déclarés dans la sonde. Les couches, coûts et reçus seuls ne sont pas des effets calculables. Ces nombres ne certifient pas toutes les clauses. Ingrédients exclus.\n\n',
  '## Synthèse de couverture\n\n',
  `- **Contrat à effet calculable** : ${catCounts.calculated}\n`,
  `- **Contrat nécessitant des données MJ** : ${catCounts.mjWired}\n`,
  `- **Rappel** : ${catCounts.reminder}\n`,
  `- **Contrat restant à réaliser** : ${catCounts.remaining}\n\n`,
  '| # | Nom FR | Nom Canonique V5 | Domaine / Famille | NI V5 | Portée | Cible | Durée | Statut Couverture | Typage Effet | Empreinte Source |\n',
  '|---|---|---|---|---|---|---|---|---|---|---|\n'
];

for (const c of contracts) {
  const statusLabel = coverage.get(c.id);
  const effectType = c.effects?.type || 'narrative';
  const fpShort = (c.sourceFingerprint || '').slice(0, 15) + '...';

  matrixRows.push(`| ${c.row} | ${c.name} | ${c.canonicalName} | ${c.domain}${c.wind ? ` (${c.wind})` : ''} | ${c.cn} | ${c.range} | ${c.target} | ${c.duration} | ${statusLabel} | ${effectType} | \`${fpShort}\` |\n`);
}

const specificRows = [];
for (const c of contracts) for (const option of c.overcast?.specific || []) {
  const calculated = probeSpecificOption(c, option);
  specificRows.push({ calculated, row: `| ${c.name} | ${option.label} | ${option.cost} DR${option.repeat ? ' par palier' : ''} | ${calculated ? 'Calculée (exécutée par la sonde)' : 'Rappel chiffré (non calculée)'} |\n` });
}
matrixRows.push(
  '\n## Options de surpuissance propres aux sorts\n\n',
  `Options « +N DR » et « pour chaque +N DR » des descriptions (V5 p. 236 : « Spells may have additional options in their descriptions »). ${specificRows.filter(r => r.calculated).length} calculées, ${specificRows.filter(r => !r.calculated).length} rappelées au MJ avec leur valeur chiffrée ; aucune n'est « calculée » sans exécution.\n\n`,
  '| Sort | Option | Coût | Statut |\n',
  '|---|---|---|---|\n',
  ...specificRows.map(r => r.row)
);
const reminderRows = contracts.map(c => ({ c, texts: reminderFlagTexts(c, probeCaster) })).filter(r => r.texts.length);
matrixRows.push(
  '\n## Clauses rappelées à l\'exécution\n\n',
  `Drapeaux d'effet que le moteur ne calcule pas : le rappel est joint à l'aperçu du sort (${Object.keys(REMINDER_FLAGS).length} drapeaux, ${reminderRows.length} contrats). Un drapeau qui n'est ni lu ni listé ici fait échouer le test « tout drapeau écrit est lu ».\n\n`,
  '| Sort | Rappel |\n',
  '|---|---|\n',
  ...reminderRows.flatMap(({ c, texts }) => texts.map(text => `| ${c.name} | ${text} |\n`))
);

fs.writeFileSync('docs/lot3/LOT3_MATRICE_CONTRATS_V5.md', matrixRows.join(''), 'utf8');
console.log('Matrice docs/lot3/LOT3_MATRICE_CONTRATS_V5.md générée avec succès.');


