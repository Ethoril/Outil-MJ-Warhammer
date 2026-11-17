// Table figée des modificateurs de Traits optionnels (chantier des Traits optionnels, lot L1 : D5, D6, D16, D19, D20, D21).
// Valeurs relues dans les livres (docs/specs/traits-optionnels/valeurs-traits.md), rien n'est recopié : nom, page, chiffres. Aucun import.
// `stats` : écart ajouté à la caractéristique du profil (clés de l'outil : M, CC, CT, F, E, I, Ag, Dex, Int, FM, Soc ; FM = Volonté).
// `source` : livre et page des chiffres ; `nameFrSource` : livre et page du nom français (Livre de base français, L05).
// Elite et Leader : D19 applique le modèle du même nom du Livre de base V5 (L06 p. 353), jamais les valeurs du Trait V4
// (Elite +20 CC/CT/FM, Leader +10 Soc/FM : L11 p. 135-136, non utilisées). D20 : le « Leader » est le modèle Lieutenant de la v3 (E0-P-115).

const freezeDeep = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
};

/** Traits à modificateurs de caractéristiques ou de Blessures, par nom anglais du Trait. */
export const OPTIONAL_TRAIT_MODIFIERS = freezeDeep({
  Big: { nameFr: 'Grand', stats: { F: 10, E: 10, Ag: -5 }, source: { book: 'L11', page: 135 }, nameFrSource: { book: 'L05', page: 339 } },
  Brute: { nameFr: 'Brutal', stats: { M: -1, Ag: -10, F: 10, E: 10 }, source: { book: 'L11', page: 135 }, nameFrSource: { book: 'L05', page: 338 } },
  Clever: { nameFr: 'Intelligent', stats: { Int: 20, I: 10 }, source: { book: 'L11', page: 135 }, nameFrSource: { book: 'L05', page: 340 } },
  Cunning: { nameFr: 'Rusé', stats: { Soc: 10, Int: 10, I: 10 }, source: { book: 'L11', page: 135 }, nameFrSource: { book: 'L05', page: 341 } },
  Fast: { nameFr: 'Rapide', stats: { M: 1, Ag: 10 }, source: { book: 'L11', page: 135 }, nameFrSource: { book: 'L05', page: 341 } },
  Tough: { nameFr: 'Coriace', stats: { E: 10, FM: 10 }, source: { book: 'L11', page: 137 }, nameFrSource: { book: 'L05', page: 338 } },
  // D16 : Blessures imprimées + (formule avec Hardy − formule sans), selon la Taille ; aucune caractéristique modifiée.
  Hardy: { nameFr: 'Endurant', stats: {}, wounds: { rule: 'hardy', bonus: 'BE', beforeSizeMultiplier: true }, source: { book: 'L11', page: 136 }, nameFrSource: { book: 'L05', page: 339 } }
});

/** Dressages qui modifient le profil (D6), par nom anglais du dressage. « Guerre » : +10 en CC seulement. */
export const OPTIONAL_TRAINED_MODIFIERS = freezeDeep({
  War: { nameFr: 'Guerre', stats: { CC: 10 }, source: { book: 'L11', page: 137 }, nameFrSource: { book: 'L05', page: 339 } }
});

/**
 * Modèles du Livre de base V5 appliqués par Elite et Leader (D19). `templateId` : gabarit de js/data/bestiary/L06.json.
 * Compétences : `value` s'ajoute aux avances (D21) ; `kind: 'melee-two'` désigne « Corps à corps (deux) » (les deux Corps à corps les plus hauts
 * du profil, à défaut Corps à corps (Base)). Talents : `key` = clé du référentiel de l'outil.
 */
export const OPTIONAL_TRAIT_MODELS = freezeDeep({
  Elite: {
    nameFr: 'Élite', label: 'Élite (modèle V5)', templateId: 'E0-P-114', source: { book: 'L06', page: 353 },
    stats: { CC: 15, F: 15, E: 15, I: 15, FM: 15 },
    skills: [
      { name: 'Cool', nameFr: 'Calme', value: 15 },
      { name: 'Dodge', nameFr: 'Esquive', value: 15 },
      { name: 'Intimidate', nameFr: 'Intimidation', value: 10 },
      { name: 'Leadership', nameFr: 'Commandement', value: 5 },
      { name: 'Melee (Any Two)', nameFr: 'Corps à corps (deux)', value: 15, kind: 'melee-two' },
      { name: 'Perception', nameFr: 'Perception', value: 15 }
    ],
    talents: [
      { name: 'Combat Aware', nameFr: 'Vigilance', key: 'talent-combat-aware' },
      { name: 'Combat Reflexes', nameFr: 'Combat instinctif', key: 'talent-combat-reflexes' },
      { name: 'Resolute', nameFr: 'Déterminé', key: 'talent-resolute' }
    ]
  },
  // D20 : modèle « Lieutenant » de la v3 (la v2 nommait ce modèle « Leader », avec +15 et Soc +5 : non retenu). D17 et D26 : jamais sur une créature Bestial.
  Leader: {
    nameFr: 'Meneur', label: 'Meneur (Lieutenant V5)', templateId: 'E0-P-115', source: { book: 'L06', page: 353 }, blockedByTrait: 'Bestial',
    stats: { CC: 20, CT: 20, F: 20, E: 20, I: 20, Ag: 20, FM: 20, Soc: 10 },
    skills: [
      { name: 'Cool', nameFr: 'Calme', value: 15 },
      { name: 'Dodge', nameFr: 'Esquive', value: 15 },
      { name: 'Intimidate', nameFr: 'Intimidation', value: 15 },
      { name: 'Leadership', nameFr: 'Commandement', value: 15 },
      { name: 'Lore (Warfare)', nameFr: 'Savoir (Guerre)', value: 10 },
      { name: 'Melee (Any Two)', nameFr: 'Corps à corps (deux)', value: 15, kind: 'melee-two' },
      { name: 'Perception', nameFr: 'Perception', value: 15 }
    ],
    talents: [
      { name: 'Combat Aware', nameFr: 'Vigilance', key: 'talent-combat-aware' },
      { name: 'Combat Reflexes', nameFr: 'Combat instinctif', key: 'talent-combat-reflexes' },
      { name: 'Furious Assault', nameFr: 'Assaut féroce', key: 'talent-furious-assault' },
      { name: 'Inspiring', nameFr: 'Exaltant', key: 'talent-inspiring' },
      { name: 'Resolute', nameFr: 'Déterminé', key: 'talent-resolute' },
      { name: 'War Leader', nameFr: 'Seigneur de guerre', key: 'talent-war-leader' }
    ]
  }
});
