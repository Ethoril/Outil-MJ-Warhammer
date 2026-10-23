/**
 * Mots-clés ajoutés à la main aux profils dont le nom imprimé ne suffit pas (créatures et PNJ uniques), identifiants du référentiel de
 * `js/data/creature-keywords.js`. Clé : identifiant d'inventaire. Chaque ligne est un choix d'interprétation relu par le MJ (CHOIX_EXECUTANT_PHASE_E.md).
 */
export const KEYWORDS_MANUAL = Object.freeze({
  // The Imperial Zoo (L11)
  'E0-P-002': ['bete'], 'E0-P-008': ['loup'], 'E0-P-010': ['bete', 'chaos'], 'E0-P-014': ['bete'], 'E0-P-018': ['griffon'], 'E0-P-022': ['monstre'],
  'E0-P-026': ['skaven', 'monstre'], 'E0-P-027': ['monstre'], 'E0-P-028': ['monstre'], 'E0-P-029': ['serpent', 'monstre'], 'E0-P-036': ['bete'], 'E0-P-040': ['bete'],
  'E0-P-047': ['bete'], 'E0-P-049': ['monstre'], 'E0-P-054': ['monstre-marin'], 'E0-P-055': ['monstre-marin'], 'E0-P-056': ['monstre-marin'], 'E0-P-057': ['monstre-marin'],
  'E0-P-059': ['fantome'],
  // Archives of the Empire 2 (L01) : PNJ humains du sanatorium et de Mourn
  'E0-P-128': ['humain'], 'E0-P-129': ['humain'], 'E0-P-130': ['humain'], 'E0-P-131': ['humain'], 'E0-P-132': ['humain'], 'E0-P-133': ['humain'],
  'E0-P-134': ['humain'], 'E0-P-135': ['humain'], 'E0-P-136': ['humain'], 'E0-P-137': ['humain'],
  // Archives of the Empire 3 (L02) : les familiers et petits animaux sont des Bêtes
  // Archives of the Empire Volume 1 (L03) : Halflings (M 3, Endurance faible) pp. 23-31 et Nains pp. 56-63 (voir E-D10)
  'E0-P-150': ['halfling'], 'E0-P-151': ['halfling'], 'E0-P-152': ['halfling'], 'E0-P-153': ['halfling'], 'E0-P-154': ['halfling'], 'E0-P-155': ['halfling'], 'E0-P-156': ['halfling'],
  'E0-P-157': ['nain'], 'E0-P-158': ['nain'], 'E0-P-159': ['nain'], 'E0-P-160': ['nain'], 'E0-P-161': ['nain'], 'E0-P-162': ['nain'],
  // Lustria (L07) : espèces lues sur le texte du livre (E-D14)
  'E0-P-243': ['norse'], 'E0-P-244': ['norse'], 'E0-P-247': ['demon-de-nurgle'], 'E0-P-252': ['haut-elfe'], 'E0-P-253': ['oiseau-geant'], 'E0-P-254': ['elfe-noir'],
  'E0-P-255': ['slann'], 'E0-P-266': ['saurus'], 'E0-P-267': ['homme-lezard'], 'E0-P-268': ['serpent', 'monstre'], 'E0-P-269': ['serpent', 'monstre'],
  'E0-P-291': ['-geant'], 'E0-P-299': ['bete'], 'E0-P-300': ['bete'], 'E0-P-306': ['bete'], 'E0-P-307': ['monstre'],
  // Temple of Spite (L09) : Elfes noirs (druchii) ; montures et monstres ; le sang-froid naggarothi n'est qu'une monture (E-D16)
  'E0-P-315': ['cheval'], 'E0-P-317': ['-elfe-noir'], 'E0-P-318': ['monstre'], 'E0-P-320': ['monstre'], 'E0-P-321': ['-bete', 'monstre'], 'E0-P-322': ['-bete', 'monstre'],
  'E0-P-325': ['elfe-noir'], 'E0-P-329': ['elfe-noir'], 'E0-P-330': ['elfe-noir'], 'E0-P-331': ['elfe-noir'], 'E0-P-332': ['elfe-noir'], 'E0-P-333': ['elfe-noir'],
  'E0-P-335': ['elfe-noir'], 'E0-P-336': ['-sorciere', '-elfe', 'elfe-noir'], 'E0-P-337': ['elfe-noir'], 'E0-P-338': ['elfe-noir'],
  'E0-P-354': ['elfe-noir'], 'E0-P-358': ['-sorciere'], 'E0-P-361': ['elfe-noir'], 'E0-P-362': ['elfe-noir'], 'E0-P-363': ['elfe-noir'],
  // Sylvania (L10) : morts-vivants et goules du comté maudit ; Graug est un dragon zombie squelettique (E-D17)
  'E0-P-370': ['fantome'], 'E0-P-371': ['squelette'], 'E0-P-372': ['dragon', 'zombie'], 'E0-P-373': ['goule'], 'E0-P-374': ['goule'], 'E0-P-375': ['mort-vivant'],
  // Tribes and Tribulations (L12) : Matthogg est un Ogre, Gorfang un Orque ; Gnoblars et Hobgobelins sans mot-clé du référentiel (E-D18)
  'E0-P-438': ['ogre'], 'E0-P-455': ['orque'],
  // Lords of Stone and Steel (L16) : « Daemon Slayer » est une carrière, pas un Démon ; « Outlaw » aussi ; Hagdar est un dragon, Hesh et Blistrox des Skavens (E-D21)
  'E0-P-503': ['-demon'], 'E0-P-504': ['-demon'], 'E0-P-505': ['-hors-la-loi'], 'E0-P-508': ['dragon'], 'E0-P-510': ['skaven'], 'E0-P-514': ['skaven'],
  // Middenheim (L19) : Skaven nommés par le texte, Élémentaire d'Ambre, Liche (Trait imprimé Undead), Middenheimers/Nordlandais humains (E-D25)
  'E0-P-592': ['skaven'], 'E0-P-593': ['skaven'], 'E0-P-594': ['skaven'], 'E0-P-597': ['elementaire'], 'E0-P-612': ['mort-vivant'],
  'E0-P-608': ['humain'], 'E0-P-609': ['humain'], 'E0-P-610': ['humain'], 'E0-P-611': ['humain'],
  // Death on the Reik Companion (L26) : « The Horse » est un surnom, « Giant » une taille ; les Carrion sont des oiseaux morts-vivants (Trait imprimé Undead) (E-D32)
  'E0-P-935': ['-cheval'], 'E0-P-960': ['-geant'], 'E0-P-984': ['mort-vivant'],
  // Sea of Claws (L25) : Syreen (Trait imprimé Undead), Gargantuan et Merwyrm (Trait imprimé Marine Creature) (E-D31)
  'E0-P-912': ['mort-vivant'], 'E0-P-910': ['monstre-marin'], 'E0-P-913': ['monstre-marin'],
  // Enemy in Shadows Companion (L23) : Âne/mule sans terme propre, chevaux de guerre en Cheval, Furie du Chaos Démon (Trait imprimé Daemonic) (E-D29)
  'E0-P-765': ['cheval'], 'E0-P-766': ['cheval'], 'E0-P-788': ['demon'],
  // The Horned Rat Companion (L22) : Skaven (Traits Infected + Night Vision), Undead, Construct imprimés ; le Rat-loup n'est pas un loup (E-D28)
  'E0-P-716': ['skaven'], 'E0-P-718': ['skaven'], 'E0-P-719': ['skaven'], 'E0-P-722': ['skaven'], 'E0-P-724': ['skaven'], 'E0-P-727': ['skaven'],
  'E0-P-728': ['skaven'], 'E0-P-731': ['skaven'], 'E0-P-733': ['-loup'],
  'E0-P-756': ['mort-vivant'], 'E0-P-757': ['mort-vivant'], 'E0-P-758': ['mort-vivant', 'artificiel'],
  // Empire in Ruins Companion (L21) : Traits imprimés Daemonic, Undead, Construct ; « Wolf-Born » est un titre, pas un loup (E-D27)
  'E0-P-665': ['demon'], 'E0-P-689': ['demon'], 'E0-P-660': ['-loup'],
  'E0-P-693': ['mort-vivant'], 'E0-P-695': ['mort-vivant'], 'E0-P-712': ['mort-vivant'], 'E0-P-713': ['mort-vivant'], 'E0-P-714': ['mort-vivant'], 'E0-P-715': ['mort-vivant'],
  'E0-P-668': ['artificiel'], 'E0-P-669': ['artificiel'], 'E0-P-670': ['artificiel'], 'E0-P-671': ['artificiel'],
  'E0-P-672': ['artificiel'], 'E0-P-673': ['artificiel'], 'E0-P-674': ['artificiel'],
  // Power Behind the Throne Companion (L18) : les Crânes volants portent le Trait imprimé Undead (E-D24)
  'E0-P-565': ['mort-vivant'], 'E0-P-567': ['mort-vivant'],
  // Winds of Magic (L17) : Xirat'P, P'Tarix et le Disque portent le Trait imprimé Daemonic 8+ (E-D23)
  'E0-P-532': ['demon'], 'E0-P-533': ['demon'], 'E0-P-534': ['demon'],
  // Sea Wardens of Cothique (L14) : les Cothiqui sont des Hauts elfes ; le Kraken est un monstre marin ; Spites et Phénix sans mot-clé du référentiel (E-D20)
  'E0-P-472': ['haut-elfe'], 'E0-P-475': ['haut-elfe'], 'E0-P-476': ['haut-elfe'], 'E0-P-477': ['haut-elfe'], 'E0-P-479': ['haut-elfe'],
  'E0-P-480': ['haut-elfe'], 'E0-P-481': ['haut-elfe'], 'E0-P-484': ['haut-elfe'], 'E0-P-488': ['monstre-marin'],
  // Deft Steps, Light Fingers (L04) : PNJ nommés humains ; le surnom « the Fish » n'est pas un poisson ; chiens et rapaces sont des Bêtes
  'E0-P-170': ['humain'], 'E0-P-171': ['humain', '-poisson'], 'E0-P-172': ['humain'], 'E0-P-173': ['humain'], 'E0-P-179': ['humain'],
  'E0-P-181': ['bete'], 'E0-P-182': ['bete'], 'E0-P-183': ['bete'],
  'E0-P-140': ['bete'], 'E0-P-141': ['bete'], 'E0-P-142': ['bete'], 'E0-P-143': ['bete'], 'E0-P-144': ['bete']
});
