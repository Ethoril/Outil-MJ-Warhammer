/**
 * Manques du contrôle de complétude (verify-bestiary-stats.mjs) reconnus comme faux positifs, relus sur la page du livre.
 * Clé : identifiant de profil, puis catégorie du contrôle ; la valeur est la raison (jamais un simple « ok »).
 * Une entrée ne vaut que pour sa catégorie : un manque réel dans une autre catégorie du même profil reste signalé.
 */
export const JUSTIFIED = Object.freeze({
  // Sea Wardens of Cothique (L14) p. 82 : deux profils côte à côte, « Acute Sense (Vision) » est un talent du Grand Aigle voisin.
  'E0-P-488': { talents: 'Talent du Grand Aigle, profil voisin (L14 p.82).' },
  // Rough Nights & Hard Days (L24) : l'équipement imprimé de ces profils est une liste de phrases du livre, gardée telle quelle.
  'E0-P-814': { trappingNoise: 'L24 p.18 : « many Bodyguards (…), the Duchy of Ambosstein, … anything else you feel she requires » sont des objets imprimés de la liste d\'équipement.' },
  'E0-P-818': { trappingNoise: 'L24 p.19 : « Poisoned Dagger (the first Wound it causes inflicts the effects of Heartkill…) » est un objet imprimé, la parenthèse décrit son poison.' },
  'E0-P-822': {
    talents: 'L24 p.20 : le bloc lu est celui d\'Ursula Kopfgeld (colonne voisine) ; Josef Aufwiegler n\'imprime que « Talents: Weapon (Fist) +3 », coquille pour une arme.',
    attacks: 'Idem : Épée et Arbalète sont à Ursula Kopfgeld ; Josef a bien son attaque Fist.',
    traits: 'Idem : Prejudice (Boors) est à Ursula Kopfgeld.',
    trappings: 'Idem : équipement d\'Ursula Kopfgeld.'
  },
  'E0-P-832': { skills: 'L24 p.23 : « Sing 75 » n\'est pas une compétence du jeu (le profil a déjà Entertain (Singing) 52) ; coquille du livre, non reprise.' },
  'E0-P-835': { trappingNoise: 'L24 p.34 : « a large retinue of staff » est un objet imprimé.' },
  'E0-P-836': {
    talents: 'L24 p.34 : le bloc lu est celui d\'Eberhardt von Dammenblatz (colonne de gauche) ; l\'Imperial Viper n\'imprime que des Traits.',
    skills: 'Idem : Compétences d\'Eberhardt von Dammenblatz (E0-P-835, complet).',
    attacks: 'Idem : Main Gauche et Rapière sont à E0-P-835.',
    traits: 'Idem : Prejudice (Rivals) est à E0-P-835.',
    trappings: 'Idem : équipement d\'E0-P-835.'
  },
  'E0-P-841': { trappings: 'L24 p.36 : « Daemons of Khorne » est la prose de la colonne voisine, collée au dernier objet (Wig) par le contrôle.' },
  'E0-P-845': { traits: 'L24 p.49 : le Trait est présent (Mutation, Cosmetic: Extra mouth on stomach) ; le contrôle le lisait coupé à la fin de ligne.' },
  'E0-P-848': { traits: 'L24 p.50 : « Musicians » et « Performers » sont les titres des blocs voisins, pas des Traits.' },
  'E0-P-860': { trappingNoise: 'L24 p.53 : « Many beautiful, blistering boils » est l\'équipement imprimé (humour du livre).' },
  'E0-P-871': { traits: 'L24 p.67 : Afraid et Animosity sont présents avec leur paramètre complet ; le contrôle les lisait coupés à la fin de ligne.' },
  'E0-P-884': { traits: 'L24 p.84 : « Ernst Maler\'s » est la prose de la colonne voisine.' }
});
