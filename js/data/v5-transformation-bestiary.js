/**
 * Bestiaire des transformations V5 : Forme bestiale (Bêtes du Reikland, Livre de base pp. 325-327) et
 * Transformation de Kadon (monstres de Taille Grande ou Énorme, pp. 328-335).
 * Valeurs transcrites des profils du livre. Une caractéristique « – » du livre vaut `null` (absente, jamais 0).
 * `armor` : armure standard de la créature (jamais l'armure optionnelle). `attacks[].damage` : bonus de la ligne du
 * bestiaire (« 35/+6 » → valeur 35, dégâts +6) ; `free` : 'momentum' (attaque gratuite en perdant l'Élan) ou
 * 'charge' (attaque gratuite seulement en chargeant). `wounds` : Blessures du profil du livre.
 */

const attack = (id, name, value, damage, extra = {}) => ({ id, name, value, damage, free: null, qualities: [], note: '', ...extra });

export const REIKLAND_BEASTS = Object.freeze({
  boar: {
    name: 'Sanglier', page: 325, M: 7, wounds: 12, size: 'average',
    caracs: { CC: 35, CT: null, F: 35, E: 40, I: 35, Ag: 35, Dex: null, Int: 10, FM: 10, Soc: null },
    armor: { name: 'Peau', ap: 1 },
    skills: [['Corps à corps (Bagarre)', 40], ['Perception', 40], ['Discrétion (Rurale)', 40]],
    traits: ['Bestial', 'Craintif'],
    optionalTraits: ['Belliqueux', 'Frénésie', 'Infecté', 'Taille (Grande)', 'Territorial', 'Dressé (Brisé, Magie, Monture, Guerre)'],
    attacks: [
      attack('hooves-tusks', 'Sabots et défenses', 40, 6),
      attack('horns', 'Cornes (défenses)', 40, 7, { free: 'charge' })
    ]
  },
  dog: {
    name: 'Chien', page: 325, M: 6, wounds: 4, size: 'small',
    caracs: { CC: 25, CT: null, F: 20, E: 20, I: 35, Ag: 30, Dex: null, Int: 15, FM: 10, Soc: 15 },
    armor: null,
    skills: [['Esquive', 35], ['Perception', 40], ['Pistage', 45]],
    traits: ['Bestial', 'Vision nocturne', 'Taille (Petite)', 'Craintif', 'Pisteur'],
    optionalTraits: ['Frénésie', 'Infecté', 'Taille (Moyenne)', 'Territorial', 'Dressé (Brisé, Conduite, Divertir, Rapporter, Garde, Magie, Guerre)'],
    attacks: [
      attack('claws', 'Griffes', 25, 5),
      attack('bite', 'Morsure', 25, 5, { free: 'momentum' })
    ]
  },
  'giant-rat': {
    name: 'Rat géant', page: 326, M: 6, wounds: 4, size: 'small',
    caracs: { CC: 20, CT: null, F: 20, E: 20, I: 35, Ag: 35, Dex: 10, Int: 15, FM: 15, Soc: null },
    armor: null,
    skills: [['Corps à corps (Bagarre)', 30], ['Perception', 45], ['Discrétion', 40]],
    traits: ['Bestial', 'Infecté', 'Vision nocturne', 'Taille (Petite)', 'Craintif'],
    optionalTraits: ['Maladie (Peste noire, Fièvre de Ratte)', 'Taille (Moyenne)', 'Nuée', 'Dressé (Guerre)'],
    attacks: [
      attack('claws', 'Griffes', 30, 4),
      attack('bite', 'Morsure', 30, 5, { free: 'momentum' })
    ]
  },
  'giant-spider': {
    name: 'Araignée géante', page: 326, M: 6, wounds: 4, size: 'small',
    caracs: { CC: 35, CT: null, F: 15, E: 25, I: 10, Ag: 35, Dex: 30, Int: 5, FM: 25, Soc: null },
    armor: { name: 'Carapace chitineuse', ap: 1 },
    skills: [['Esquive', 40], ['Corps à corps (Bagarre)', 40], ['Discrétion', 40]],
    traits: ['Bestial', 'Vision nocturne', 'Taille (Petite)', 'Grimpeur', 'Toile 40'],
    // « Taille (Petite à Grande) » du livre : une option par Taille atteignable au-dessus de la Taille de base.
    optionalTraits: ['Taille (Moyenne)', 'Taille (Grande)', 'Foulée (Forêts)', 'Nuée', 'Dressé (Brisé, Garde, Magie, Monture, Guerre)', 'Venin (Moyen)'],
    attacks: [
      attack('fangs', 'Crocs', 40, 3),
      attack('bite', 'Morsure', 40, 4, { free: 'momentum' })
    ]
  },
  horse: {
    name: 'Cheval', page: 327, M: 8, wounds: 22, size: 'large',
    caracs: { CC: 25, CT: null, F: 45, E: 35, I: 15, Ag: 30, Dex: null, Int: 10, FM: 10, Soc: 10 },
    armor: null,
    skills: [['Athlétisme', 40], ['Résistance', 40]],
    traits: ['Bestial', 'Taille (Grande)', 'Craintif'],
    optionalTraits: ['Dressé (Brisé, Conduite, Divertir, Magie, Monture, Guerre)'],
    attacks: [
      attack('hooves', 'Sabots', 25, 12, { qualities: ['assommante'] })
    ]
  },
  wolf: {
    name: 'Loup', page: 327, M: 9, wounds: 10, size: 'average',
    caracs: { CC: 25, CT: null, F: 35, E: 30, I: 35, Ag: 30, Dex: null, Int: 15, FM: 15, Soc: null },
    armor: null,
    skills: [['Corps à corps (Bagarre)', 35], ['Perception', 45], ['Pistage', 45]],
    traits: ['Bestial', 'Vision nocturne', 'Craintif'],
    optionalTraits: ['Frénésie', 'Infecté', 'Taille (Grande)', 'Territorial', 'Dressé (Brisé, Conduite, Rapporter, Garde, Magie, Guerre)'],
    attacks: [
      attack('claws', 'Griffes', 35, 6),
      attack('bite', 'Morsure', 35, 6, { free: 'momentum' })
    ]
  }
});

const PRONE = 'les adversaires plus petits gagnent À Terre s’ils sont blessés';

/** Monstres de Taille Grande ou Énorme du chapitre « Bêtes monstrueuses du Reikland » (Livre de base pp. 328-335). */
export const KADON_MONSTERS = Object.freeze({
  'bog-octopus': {
    name: 'Pieuvre des marais', page: 328, M: 3, wounds: 56, size: 'large',
    caracs: { CC: 35, CT: null, F: 80, E: 75, I: 15, Ag: 55, Dex: null, Int: 5, FM: 65, Soc: null },
    armor: null,
    skills: [['Escalade', 65], ['Corps à corps (Bagarre)', 40], ['Discrétion (Rurale)', 65], ['Natation', 90]],
    traits: ['Amphibie', 'Bestial', 'Vision nocturne', 'Taille (Grande)', 'Foulée (Marais)', 'Venin (Difficile)'],
    optionalTraits: ['Taille (Énorme)', 'Taille (Monstrueuse)', 'Territorial'],
    attacks: [
      attack('tentacles', '8 tentacules', 40, 8, { count: 8, free: 'all', note: '8 attaques gratuites ; un adversaire blessé gagne Enchevêtré' })
    ]
  },
  demigryph: {
    name: 'Demi-griffon', page: 329, M: 7, wounds: 30, size: 'large',
    caracs: { CC: 45, CT: null, F: 55, E: 40, I: 30, Ag: 45, Dex: null, Int: 15, FM: 25, Soc: null },
    armor: { name: 'Peau', ap: 1 },
    skills: [['Athlétisme', 55], ['Résistance', 45], ['Corps à corps (Bagarre)', 50]],
    traits: ['Bestial', 'Vision nocturne', 'Taille (Grande)'],
    optionalTraits: ['Dressé (Brisé, Conduite, Garde, Monture, Guerre)'],
    attacks: [
      attack('claws', 'Griffes', 50, 14),
      attack('bite', 'Morsure', 50, 8, { free: 'momentum', qualities: ['perforante'] })
    ]
  },
  dragon: {
    name: 'Dragon', page: 330, M: 6, wounds: 104, size: 'enormous',
    caracs: { CC: 65, CT: 60, F: 65, E: 65, I: 60, Ag: 25, Dex: 15, Int: 45, FM: 85, Soc: 25 },
    armor: { name: 'Écailles', ap: 3 },
    skills: [['Corps à corps (Bagarre)', 70], ['Perception', 70], ['Pistage', 70]],
    traits: ['Vol (80)', 'Vision nocturne', 'Taille (Énorme)'],
    optionalTraits: ['Immunité (au choix)', 'Infestation', 'Magique', 'Corruption mentale', 'Mutation', 'Taille (Monstrueuse)', 'Lanceur de sorts (variés)', 'Furtif', 'Foulée (Marais, Forêts)', 'Mort-vivant', 'Venin (Difficile)'],
    attacks: [
      attack('claws', 'Griffes', 70, 16),
      attack('bite', 'Morsure', 70, 9, { free: 'momentum', qualities: ['perforante'] }),
      attack('tail', 'Queue', 70, 8, { free: 'momentum', note: PRONE }),
      { id: 'breath', name: 'Souffle (au choix)', value: null, damage: null, free: null, qualities: [], note: 'Voir le livre de base p. 357 : souffle non modélisé, à jouer à la main' }
    ]
  },
  fenbeast: {
    name: 'Bête des fanges', page: 331, M: 5, wounds: 40, size: 'large',
    caracs: { CC: 35, CT: null, F: 50, E: 55, I: 10, Ag: 15, Dex: 10, Int: 10, FM: null, Soc: null },
    armor: null,
    skills: [['Résistance', 65], ['Corps à corps (Bagarre)', 40]],
    traits: ['Artificiel', 'Vision dans le noir', 'Infecté', 'Régénération', 'Taille (Grande)', 'Stupide'],
    optionalTraits: ['Frénésie', 'Affamé', 'Infestation', 'Territorial'],
    attacks: [
      attack('fists', 'Poings', 40, 14, { qualities: ['magique'] })
    ]
  },
  giant: {
    name: 'Géant', page: 332, M: 6, wounds: 72, size: 'enormous',
    caracs: { CC: 30, CT: 30, F: 65, E: 55, I: 30, Ag: 20, Dex: 15, Int: 15, FM: 25, Soc: 15 },
    armor: { name: 'Armure de fortune', ap: 1 },
    skills: [['Résistance à l’alcool', 60], ['Corps à corps (Base)', 35]],
    traits: ['Taille (Énorme)'],
    optionalTraits: ['Affamé', 'Infecté', 'Infestation', 'Vision nocturne', 'Taille (Monstrueuse)', 'Stupide'],
    attacks: [
      attack('hand-weapon', 'Arme à une main', 35, 16)
    ]
  },
  griffon: {
    name: 'Griffon', page: 332, M: 6, wounds: 80, size: 'enormous',
    caracs: { CC: 50, CT: null, F: 50, E: 50, I: 45, Ag: 60, Dex: null, Int: 20, FM: 50, Soc: 15 },
    armor: { name: 'Peau', ap: 1 },
    skills: [['Athlétisme', 65], ['Corps à corps (Bagarre)', 60], ['Perception', 60]],
    traits: ['Vol (80)', 'Vision nocturne', 'Taille (Énorme)'],
    optionalTraits: ['Bestial', 'Immunité (Psychologie)', 'Territorial', 'Dressé (Brisé, Garde, Magie, Monture, Guerre)'],
    attacks: [
      attack('talons', 'Serres', 60, 14, { qualities: ['rapide'] }),
      attack('bite', 'Morsure', 60, 8, { free: 'momentum', qualities: ['perforante'] })
    ]
  },
  manticore: {
    name: 'Manticore', page: 333, M: 6, wounds: 72, size: 'enormous',
    caracs: { CC: 55, CT: null, F: 55, E: 55, I: 50, Ag: 65, Dex: null, Int: 10, FM: 35, Soc: null },
    armor: { name: 'Peau', ap: 1 },
    skills: [['Corps à corps (Bagarre)', 60], ['Pistage', 55]],
    traits: ['Bestial', 'Vol (80)', 'Taille (Énorme)', 'Territorial', 'Venin (Difficile)'],
    optionalTraits: ['Haine (Prédateurs)', 'Mutation', 'Dressé (Brisé, Magie, Monture)'],
    attacks: [
      attack('claws', 'Griffes', 60, 14),
      attack('bite', 'Morsure', 60, 8, { free: 'momentum' }),
      attack('tail', 'Queue', 60, 7, { free: 'momentum', note: PRONE })
    ]
  },
  pegasus: {
    name: 'Pégase', page: 334, M: 8, wounds: 28, size: 'large',
    caracs: { CC: 35, CT: null, F: 45, E: 40, I: 30, Ag: 45, Dex: null, Int: 20, FM: 25, Soc: null },
    armor: null,
    skills: [['Athlétisme', 55], ['Résistance', 45], ['Corps à corps (Bagarre)', 40]],
    traits: ['Vol (100)', 'Taille (Grande)'],
    optionalTraits: [],
    attacks: [
      attack('hooves', 'Sabots', 40, 12, { qualities: ['assommante'] })
    ]
  },
  troll: {
    name: 'Troll', page: 335, M: 6, wounds: 30, size: 'large',
    caracs: { CC: 30, CT: 15, F: 55, E: 45, I: 10, Ag: 15, Dex: 15, Int: 10, FM: 20, Soc: 5 },
    armor: { name: 'Écailles', ap: 2 },
    skills: [['Corps à corps (Bagarre)', 40], ['Corps à corps (Base)', 45], ['Résistance', 55]],
    traits: ['Infecté', 'Régénération', 'Taille (Grande)', 'Stupide'],
    optionalTraits: ['Amphibie', 'Bestial', 'Corruption (Mineure)', 'Frénésie', 'Affamé', 'Infestation', 'Résistance magique 2', 'Mutation', 'Vision nocturne', 'Insensible à la douleur', 'Furtif', 'Foulée (Montagnes, Souterrains, Marais)'],
    attacks: [
      attack('hand-weapon', 'Arme à une main', 45, 14),
      attack('bite', 'Morsure', 40, 8, { free: 'momentum' }),
      attack('vomit', 'Vomi', 55, 8, { note: 'Début de tour au contact, renonce au Mouvement et à l’Action ; tous les adversaires à 2 mètres s’opposent par Esquive Intermédiaire (+0 DR) ; blessé : Sonné et 1 dégât aux armes et armures ; réutilisable après 12 heures' })
    ]
  }
});

/** Descriptions courtes des traits dont le nom seul ne dit pas l'effet. */
export const TRANSFORMATION_TRAIT_NOTES = Object.freeze({
  'Pisteur': 'Compétence Pistage à Int +10.',
  'Grimpeur': 'Mouvement normal sur les surfaces adaptées, Escalade réussie automatiquement.',
  'Toile 40': 'Touché : 1 état Enchevêtré, Force 40.',
  'Infecté': 'Adversaire blessé : Test d’Endurance Facile (+4 DR) ou Plaie infectée.',
  'Vision nocturne': 'Voit à 20 mètres, éclairage prolongé de 20 mètres.',
  'Craintif': '+3 états Brisé au bruit ou à la magie.',
  'Venin (Difficile)': 'Adversaire blessé : Test d’Endurance Difficile (-1 DR) ou Empoisonné.',
  'Régénération': 'Regagne 1d10 Blessures par round ; un 10 soigne une Blessure Critique ; pas contre le feu.',
  'Stupide': 'Test d’Intelligence Facile (+4 DR) avant d’agir, sauf si dirigé.',
  'Artificiel': 'Ne teste jamais Int, FM ni Soc ; Endurance pour la FM.'
});
