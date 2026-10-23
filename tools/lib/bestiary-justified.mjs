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
  'E0-P-884': { traits: 'L24 p.84 : « Ernst Maler\'s » est la prose de la colonne voisine.' },
  // Q27b : L01, L02, L04, L06, L07, L10, L11.
  'E0-P-136': { trappings: 'L01 p.79 : « the Seer Princess Wild-eyed… » et « Isabella claims to be… » sont la prose des colonnes voisines ; l\'équipement imprimé (Rich Clothing and Jewellery, Small Collection of Books) est présent.' },
  'E0-P-137': { skills: 'L01 p.80 : « amongst which a handful of words… » est la prose de la colonne voisine, intercalée dans la ligne ; Lore (Chaos) 79, Perception 43 et Research 56 sont présents (BODY_OVERRIDES L01:80:0).' },
  'E0-P-167': { trappings: 'L04 p.48 : Hat, Knuckledusters, Leather Jack, Mail Shirt et Sword sont l\'équipement du Racketeer (colonne voisine) ; le Bawd a le sien complet.' },
  'E0-P-074': { traits: 'L06 p.325 : « Trained (Broken, Fetch, War) » est la note du chien de ratier (« Note: … begins play with the Traits »), pas un Trait du Dog ; ses Traits optionnels sont lus.' },
  'E0-P-250': { traits: 'L07 p.73 : Vampiric Gaze est une capacité propre à ce profil, absente de l\'inventaire des Traits (hors L18-L26) ; sa règle n\'est pas recopiée. Le Trait Vampiric est présent.' },
  'E0-P-263': { traits: 'L07 p.142 : Acute Sense (Sight) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil.' },
  'E0-P-298': { attacks: 'L07 p.175 : « Breath +12 (Fire) » est un Souffle (Trait Breath, rating +12, précision Fire), lu par les attaques naturelles du moteur, pas une attaque de la liste.' },
  'E0-P-299': { traits: 'L07 p.176 : Acute Sense (Vision) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
  'E0-P-300': { traits: 'L07 p.176 : Acute Sense (Vision) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
  'E0-P-306': { traits: 'L07 p.180 : Acute Sense (Hearing) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
  'E0-P-307': { traits: 'L07 p.181 : Hunger est absent de l\'inventaire des Traits (hors L18-L26) ; sa règle n\'est pas recopiée.' },
  'E0-P-368': { spells: 'L10 p.15 : « Rot A city woman » est le dernier sort (Rot) collé à la prose de la colonne voisine ; les six sorts imprimés sont présents.' },
  'E0-P-006': { skills: 'L11 p.15 : le texte « all within the area of effect… Snare \'Em Good » est la description des miracles de la colonne voisine ; Pray 60 est la seule compétence imprimée et elle est présente.' },
  'E0-P-022': { traits: 'L11 p.37 : Mental Corruption est présent avec son paramètre complet « Totally Unhinged + 2 additional » ; le contrôle le lisait coupé au « + ».' },
  'E0-P-398': { attacks: 'L12 p.10 : « Weapon (Choppa) +8 » est le Trait du profil Orc voisin (même page, colonne de gauche) ; le Basic Savage Orc a Weapon (Stone Axe) +7, présent.' },
  'E0-P-407': { trappings: 'L12 p.16 : « harassing enemies with missiles, and keeping lookout. SKIRMISHER » est la prose du gabarit Skirmisher voisin ; l\'équipement du Night Goblin Chief est complet.' },
  'E0-P-413': { traits: 'L12 p.19 : le Trait Web 40 est présent ; « HOPPING SQUIG » est le titre du profil voisin collé à la fin de la ligne.' },
  'E0-P-439': { trappingNoise: 'L12 p.79 : Rulg imprime ses ingrédients de sorts en minuscules (« three lumps of bedrock… », « two potions of spleen and gall… », « six disembodied limbs… ») : ce sont des objets du livre.' },
  'E0-P-453': { trappings: 'L12 p.105 : « BLOATED CAVE SQUIG » est le titre du profil voisin (Gobbla) collé au dernier objet.' },
  'E0-P-459': { traits: 'L13 p.109 : Trained (Broken, Mount, Shock Cavalry, War) est présent depuis la lecture de « Combat Traits: Bite +9, Weapon (Talons) +9 » ; le contrôle garde « Combat » collé à la parenthèse.' },
  'E0-P-461': { trappingNoise: 'L13 p.113 : « either a Halberd or a Crossbow and 10 Bolts » est un objet imprimé tel quel.' },
  'E0-P-495': { skills: 'L16 p.28 : prose de la colonne voisine intercalée dans la ligne de Compétences ; Language (Khazalid) 46 et Ranged (Blackpowder) 42 sont présents.' },
  'E0-P-498': {
    skills: 'L16 p.32 : « Lore (History 78, Metallurgy 68, Politics 73. Warfare 78) » : coquille du livre (point pour virgule) ; les quatre Lore sont présents.',
    trappingNoise: 'L16 p.32 : la liste de cérémonie imprime ses objets en minuscules (« gromril shield », « the Ironpick »…), ce sont des objets du livre.'
  },
  'E0-P-499': {
    trappings: 'L16 p.33 : « Like King Brokk » ouvre la phrase d\'introduction de la liste (« …her ceremonial outfit consists of: ») ; les objets sont présents.',
    trappingNoise: 'L16 p.33 : la liste de cérémonie imprime ses objets en minuscules (« a brynduraz necklace (worth 200,000 GC) »…), ce sont des objets du livre.'
  },
  'E0-P-503': { trappingNoise: 'L16 p.51 : « the Severed Head of a Night Goblin she calls `Alfie\' » est un objet imprimé tel quel (minuscule initiale, apostrophe de citation du livre).' }
});
