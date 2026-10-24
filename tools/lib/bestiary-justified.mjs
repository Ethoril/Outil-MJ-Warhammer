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
  // Q34a (L01-L06) : manques propres à Q32, relus sur la page.
  'E0-P-068': {
    skills: 'L06 p.321 : Athletics 40, Cool 40, Dodge 40, Gossip 40, Haggle 35, Intimidate 45, Melee (Basic) 55, Perception 50 sont les compétences du Human Watchman (colonne de gauche) ; le Merchant imprime Animal Care 45… Navigation 45 (Drive 45 coupé en fin de ligne), tous présents.',
    trappings: 'Idem : Copper Badge, Lamp Oil, Lantern and Pole, Leather Jack, Uniform sont l\'équipement du Watchman ; le Merchant imprime Abacus, Canvas Tarpaulin, Cloak, Clothing, Dagger, Hat, Mule and Cart, Pouch, Sling Bag, tous présents.'
  },
  'E0-P-069': {
    trappings: 'Idem : Crowbar et Leather Jerkin sont l\'équipement du Halfling Thief.'
  },
  'E0-P-070': { trappings: 'L06 p.322 : Hand Weapon, Knuckledusters et Leather Jack (avec le numéro de page 322) sont l\'équipement du Human Thug (colonne de gauche) ; le Thief imprime Clothing, Crowbar, Dagger, Hood, Leather Jerkin, Pouch, Sack, Sling Bag, tous présents.' },
  'E0-P-091': { traits: 'L06 p.338 : Melee (Brawling) 35, Stealth 40, Track 40, Swarm et Trained (Broken, Fetch, Guard) sont les compétences et Traits optionnels du Snotling (colonne de gauche) ; le Crypt Ghoul imprime Infected, Night Vision et, en option, Bestial et Venom (Challenging), tous présents.' },
  'E0-P-263': { traits: 'L07 p.142 : Acute Sense (Sight) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil.' },
  'E0-P-298': { attacks: 'L07 p.175 : « Breath +12 (Fire) » est un Souffle (Trait Breath, rating +12, précision Fire), lu par les attaques naturelles du moteur, pas une attaque de la liste.' },
  'E0-P-299': { traits: 'L07 p.176 : Acute Sense (Vision) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
  'E0-P-300': { traits: 'L07 p.176 : Acute Sense (Vision) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
  'E0-P-306': { traits: 'L07 p.180 : Acute Sense (Hearing) est imprimé parmi les Traits ; le catalogue en fait un talent, présent dans les talents du profil (« as Character Talent » retiré).' },
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
  'E0-P-503': { trappingNoise: 'L16 p.51 : « the Severed Head of a Night Goblin she calls `Alfie\' » est un objet imprimé tel quel (minuscule initiale, apostrophe de citation du livre).' },
  // Q27d : L17, L18, L19 relus sur leurs pages.
  'E0-P-515': { attacks: 'L17 p.30 : « not only does Champion +10 », « but magic stops flowing Die Hard +10 », « Horns (SB+3) +5 » sont la table des Traits de construct du rituel (colonne de droite, coût en CN), pas des attaques du profil ; Weapon +8 est présent.' },
  'E0-P-521': { spells: 'L17 p.121 : « Elspeth has memorised all spells from the Lore of Death » est collé à « Trappings: » ; Death\'s Timekeeper, Grimoire, High Quality Elaborate Robes et Magical Licence sont ses objets, présents dans l\'équipement.' },
  'E0-P-525': { attacks: 'L17 p.175 : « benefiting from +2 SL » est la règle Soundless (+2 SL aux Tests de Discrétion) ; Bite +9 et Weapon (Teeth and Horns) +10 sont présents.' },
  'E0-P-543': { trappingNoise: 'L18 p.53 : « a purse containing coins to a value of 2 GC » est un objet imprimé tel quel (minuscule initiale du livre).' },
  'E0-P-545': { trappingNoise: 'L18 p.60 : « 3 GCs in assorted denominations, but can can lay her hands on 100 GCs within an hour » est le dernier objet imprimé de la liste, avec sa coquille (« can can »).' },
  'E0-P-547': { trappingNoise: 'L18 p.66 : « purse containing coins to a value of 6 shillings » est un objet imprimé tel quel.' },
  'E0-P-548': { trappingNoise: 'L18 p.68 : « robes » et « purse containing coins to a value of 2 GC » sont des objets imprimés tels quels (minuscules du livre).' },
  'E0-P-549': { trappingNoise: 'L18 p.71 : « robes » et « purse containing coins to a value of 1 GC » sont des objets imprimés tels quels (minuscules du livre).' },
  'E0-P-550': { trappingNoise: 'L18 p.74 : « Magical Sword (counts as a Hand Weapon but is magical and benefits from the Impale and Damaging Qualities) » et « access to coins to a value of 22 GCs » sont des objets imprimés ; la parenthèse décrit l\'arme.' },
  'E0-P-557': {
    skills: 'L18 p.97 : « Language (Magick 74, Reikspiel) 48 » : la valeur 48 suit la parenthèse (coquille de mise en page) ; Language (Magick) 74 et Language (Reikspiel) 48 sont présents.',
    trappings: 'L18 p.97 : « As above, plus enough Warpstone… » renvoie à l\'équipement du Skaven Grey Seer précédent ; la liste y est reprise et la Warpstone ajoutée.',
    spells: 'L18 p.97 : « As above, plus Chain Attack and Terrifying » : les sorts du Grey Seer précédent sont repris et Chain Attack et Terrifying ajoutés.',
    trappingNoise: 'L18 p.97 : « enough Warpstone to double the SL of three Casting/Channelling Tests (WFRP 244) » est l\'objet imprimé (minuscule initiale du livre).'
  },
  'E0-P-566': { trappingNoise: 'L18 p.117 : « Possessions: Mail coat, helmet, axe » : les objets du mort-vivant sont imprimés en minuscules.' },
  'E0-P-568': { trappingNoise: 'L18 p.117 : « Possessions: Mail coat, helmet, axe » : les objets du mort-vivant sont imprimés en minuscules.' },
  'E0-P-569': { trappingNoise: 'L18 p.118 : « Possessions: dagger, spell ingredients, bedroll, necromantic tomes, purse with 5 GCs 17/6 » : tous les objets sont imprimés en minuscules.' },
  'E0-P-594': { trappingNoise: 'L19 p.110 : « Trappings: Spell ingredients, sword, crutches. » : « sword » et « crutches » sont imprimés en minuscules.' },
  // Q27e : L20 (Altdorf) relu sur ses pages.
  'E0-P-623': { trappingNoise: 'L20 p.67 : « a dozen Calling Cards showing the silhouette of a cat. » est le dernier objet imprimé de la liste (minuscule initiale du livre).' },
  'E0-P-631': { trappingNoise: 'L20 p.94 : « the Magnin Throwing Knife » est un objet imprimé tel quel (minuscule initiale du livre).' },
  'E0-P-637': {
    trappings: 'L20 p.109 : le livre imprime « Trappings: Ranged (Bow) +6 » à la place de la ligne Traits, puis une seconde ligne « Trappings: Fine Clothing… » ; l\'arc est l\'attaque Bow +6 du profil, les objets sont présents.',
    trappingNoise: 'L20 p.109 : « Cathayan Amulet (a recent gift, …) » est un objet imprimé, la parenthèse décrit l\'amulette.'
  },
  'E0-P-649': {
    trappings: 'L20 p.166 : « Trappings: Tattered Clothing, » est suivi de l\'encadré SPELLS du profil ; Tattered Clothing est présent, les sorts sont dans le champ spells.',
    spells: 'L20 p.166 : « Evil Eye Melinda Greyweave » : le titre du texte voisin est collé au dernier sort ; Evil Eye est présent.'
  },
  'E0-P-650': { spells: 'L20 p.167 : « Spells: Chylis knows every Petty Magic and Arcane Spell, plus all those from the Lores of Fire, Heavens, and Life. » est une phrase, gardée telle quelle dans les notes de sorts.' },
  'E0-P-652': { trappings: 'L20 p.195 : « Markus Spiel » est le nom du conseiller du texte voisin (encadré de scénario), pas un objet ; Coarst Clothing (coquille du livre) et Herbs Worth 12/5 sont présents.' },
  'E0-P-657': { spells: 'L20 p.218 : « Ward 0 As part of their pact with Tzeentch » : Ward est présent, la suite est le texte de la colonne voisine.' },
  // Q27f : L21 (Altdorf Companion, Empire in Ruins) relu sur ses pages.
  'E0-P-666': { trappings: 'L21 p.22 : « and with daemonic whispers lurking in their mind » est la note à astérisque du Cool 70* (« While leading a sizable mob… ») ; les quatre objets sont présents.' },
  'E0-P-669': { traits: 'L21 p.24 : « Medium This » est le titre et le début du texte du profil voisin (Animated Furniture, Medium) ; les Traits du Coach sont tous présents.' },
  'E0-P-670': { traits: 'L21 p.24 : « Stride Animated Furniture » et « Small This » sont les titres et textes des profils voisins (Large et Small) ; Stride et les Traits du profil Medium sont présents.' },
  'E0-P-681': { trappings: 'L21 p.40 : « HUMAN PRIEST (SILVER 2) » est le titre du profil voisin (Father von Tunz) ; les huit objets de Zielin sont présents.' },
  'E0-P-699': { trappingNoise: 'L21 p.73 : « two household servants » est un objet imprimé tel quel (minuscule initiale du livre).' },
  'E0-P-700': { trappingNoise: 'L21 p.78 : « Book of Pressed Flowers taken from every battlefield she has ever fought on (worth 5 GC…) » est un seul objet décrit (recollé), « pouch with 23 s 18d » et « armour and weapons (…) » sont imprimés en minuscules ; tous sont présents.' },
  'E0-P-702': { skills: 'L21 p.79 : « he has hired Mentag… RUPRECHT ETZBURGER » est le texte du profil voisin ; les trois compétences du Guard Sergent (Melee Basic 55, Polearm 45, Perception 50) sont présentes.' },
  'E0-P-703': { trappingNoise: 'L21 p.79 : « dagger » est imprimé en minuscules par le livre.' },
  'E0-P-709': { trappings: 'L21 p.85 : « 7 GCs SPELLS Petty: … ERNST HEIDLEMANN » est l\'encadré SPELLS suivi du titre du profil voisin ; les trois objets et les sorts (champ spells) sont présents.' },
  'E0-P-712': { traits: 'L21 p.118 : « Undead Hexwraiths Hexwraiths » est le titre et le texte du profil voisin ; les huit Traits du Winged Nightmare sont présents.' },
  // Q27g : L22 (Le Rat cornu, Companion) relu sur ses pages.
  'E0-P-734': { traits: 'L22 p.50 : « Wolf Rat Long » et « Clan Moulder » sont le titre et le texte du profil voisin (Wolf Rat, « Long ago, Clan Moulder bred… ») ; Armour 2, Bite, Weapon, Size et Trained du Great Pox Rat sont présents.' },
  'E0-P-741': { skills: 'L22 p.71 : « Lore (Mushroom Stews 65 Middle Mountains 53) » : le livre a oublié la virgule entre deux spécialisations ; Lore (Mushroom Stews) 65 et Lore (Middle Mountains) 53 sont présentes.' },
  'E0-P-749': { trappings: 'L22 p.94 : « FORMER INTERROGATOR » est le titre du profil voisin (Paolo Gentile) ; les quatre objets de Claudia Carbonetti sont présents.' },
  'E0-P-751': { traits: 'L22 p.95 : « Britta » et « Ilona » sont le texte du profil voisin (Knud, Britta, Ilona, and Mikhail) ; les cinq Traits de Giuseppe sont présents.' },
  'E0-P-757': { traits: 'L22 p.120 : « Undead FLYING DEATH SKULLS » est le dernier Trait de Carrion suivi du titre du profil voisin ; Undead est présent.' },
  // Q27h : L23 (Enemy in Shadows Companion) relu sur ses pages.
  'E0-P-760': { attacks: 'L23 p.24 : « which increases their WP score by +20 » est la prose de la colonne voisine (trait Stubborn des ânes et mules) ; le Chien a Weapon +5.' },
  'E0-P-769': { trappings: 'L23 p.44 : « Road Captain Though never a particularly clever man… » est le titre et la prose du profil voisin (Heinrich Steele) ; les treize objets de la Sergent routier sont présents.' },
  'E0-P-775': { trappings: 'L23 p.52 : « although people cooperate with bandits more out of fear than love » est la prose de la colonne voisine (Outlaws) ; les sept objets d\'Eberhart sont présents.' },
  'E0-P-777': { trappings: 'L23 p.54 : « bad timing », « or gravely misplaced faith in the Empire\'s justice system » sont la prose de la colonne voisine (Cell Mates) ; les neuf objets de Delberz sont présents.' },
  'E0-P-782': { trappings: 'L23 p.59 : « with a comical stooped posture, bushy brows, clever hands, and a knowing gaze » est la prose de la colonne voisine (Heinrich « The Grouch » Marken) ; les cinq objets sont présents.' },
  'E0-P-784': { trappings: 'L23 p.61 : « if not all » vient de « Most, if not all, lawbreakers… », prose de la colonne voisine ; les six objets d\'Alette sont présents.' },
  'E0-P-807': { attacks: 'L23 p.108 : « Claw +4 » est le Trait du profil voisin (Imperial Beast) ; les Farmyard Beasts ont Bite +3 et Weapon +5.', traits: 'L23 p.108 : « Size (Small) » est le Trait du profil voisin (Imperial Beast) ; les cinq Traits des Farmyard Beasts sont présents.' },
  'E0-P-808': { traits: 'L23 p.108 : « Hatred (Keepers) » et « Venom (Challenging) » sont les Traits du profil voisin (Farmyard Beasts) ; les cinq Traits de l\'Imperial Beast sont présents.' },
  'E0-P-812': { trappingNoise: 'L23 p.111 : « Potions and Charms, all fake (at the GM\'s discretion, some may have interesting but unplanned effects) » est un seul objet imprimé (recollé par TRAPPING_JOINS) ; le contrôle lit sa longue parenthèse comme une phrase.' },
  'E0-P-607': { attacks: 'L19 p.143 : « and go on to score a goal if their total is +25 » est la règle de jeu rapide du match (texte de la colonne voisine) ; le Nain n\'a aucune attaque imprimée.' },
  // Q27i : L25 (Sea of Claws) et L26 (Death on the Reik Companion) relus sur leurs pages.
  'E0-P-903': { trappingNoise: 'L25 p.127 : « either a Halberd or a Crossbow and 10 Bolts » est un objet imprimé tel quel (même ligne que E0-P-461).' },
  'E0-P-918': { skills: 'L25 p.149 : « Lore (Elves) 59, Theology 69, Oceans 99) » : le livre ferme la parenthèse après le premier nom ; Lore (Elves) 59, Lore (Theology) 69 et Lore (Oceans) 99 sont présentes (readSkills).' },
  'E0-P-921': { trappings: 'L25 p.155 : « Wulfrik\'s successes mark him as favoured by the gods. Any Charm, Intimidate… » est la prose « Favoured Champion » de la colonne voisine ; la ligne Trappings imprimée (Bastard Sword, Heavy Armour, Shield, Skull Trophies) est présente.' },
  'E0-P-923': { trappings: 'L26 p.18 : « ONWARD TO MIDDENHEIM After the events of Death on the Reik… » est l\'encadré de la colonne voisine collé à « 5d10 GC » ; les six objets imprimés sont présents.' },
  'E0-P-926': { trappings: 'L26 p.21 : « NO HAPPY ENDINGS With Count Orlok disposed of, and Karl and Hans recovering » est l\'encadré voisin ; les quatre objets du Vampire Noble sont présents.' },
  'E0-P-940': { trappings: 'L26 p.48 : « Careful Step, Dart, Warning, Arcane: Bolt, Dark Vision… The Amber Spear 48 » sont les sorts, Traits et pages de la colonne voisine ; les sept objets de la ligne Trappings imprimée sont présents.' },
  'E0-P-950': { traits: 'L26 p.58 : « Resistance (Chaos) » est imprimé parmi les Traits mais c\'est le talent Resistant (Chaos) du catalogue ; il est présent dans les talents du profil (comme Acute Sense, Q27d).' },
  'E0-P-967': { trappingNoise: 'L26 p.106 : « Trappings: Various, often Hand Weapon (Boat Hook or Dagger), Uniform » est imprimé tel quel.' },
  'E0-P-970': { trappings: 'L26 p.107 : « sociable » vient de « Personality: Garrulous, sociable, perfectionist. » (colonne voisine) ; les quatre objets imprimés sont présents.' },
  'E0-P-973': { trappings: 'L26 p.108 : « Obnoxious Trader Appearance: Middle-aged, overweight… Motivations: Greed » est la description du Purser (colonne voisine) ; les cinq objets de sa ligne Trappings sont présents.' },
  'E0-P-975': { trappings: 'L26 p.109 : « aristocratic » vient de « Appearance: Elderly, aristocratic, well-dressed. » (Experienced Broker, colonne voisine) ; les trois objets imprimés sont présents.' },
  'E0-P-977': { trappingNoise: 'L26 p.109 : « d10 × 30 Gold Crown » est imprimé tel quel en fin de Trappings.' },
  'E0-P-981': { trappings: 'L26 p.111 : « FORMER OFFICER (GOLD 1) » est la fin du titre du profil voisin (Armchair General) ; les six objets imprimés sont présents.' }
});

/**
 * Q34 : manques propres au contrôle Q32 (rubriques décrites, noms chaînés, attaques V5…) relus sur la page.
 * Même forme que JUSTIFIED, mais appliqués après les manques de formatGaps, que JUSTIFIED ne voit pas (QE-Q32-1).
 */
export const JUSTIFIED_Q34 = Object.freeze({
  'E0-P-158': { talents: 'L03 p.56 : Fearless (Witches), Relentless et Resolute sont les talents d\'Alrik Skagsson (colonne de droite) ; Karstin Largsdottir imprime Gregarious, Lip Reading, Magic Resistant, Night Vision, Read/Write, Shadow, Strong-Minded, Sturdy, tous présents.' },
  'E0-P-161': { talents: 'L03 p.63 : Combat Aware et Inspiring sont les talents de Ragni Thorisson (colonne de droite) ; Gurniksson Hammerback imprime Argumentative, Careful Strike, Magic Resistance, Night Vision, Relentless, Resolute, Sturdy, Tunnel Rat.' },
  'E0-P-069': { talents: 'L06 p.322 : Acute Sense (Taste), Catfall, Flee! et Night Vision sont les talents du Halfling Thief (colonne de droite) ; le Thug imprime Briber, Cardsharp, Iron Jaw, Very Strong.' },
  // Q34b (L07-L11), relu page par page sur la mise en page du PDF.
  'E0-P-271': { traits: 'L07 p.167 : « Venom (Difficult) » est le Trait du Vypervine, 4e bloc de la page (E0-P-272, qui l\'a) ; l\'Impaling Spikethorn imprime Flammable, Painless, Size (Average), Stationary Attacker, tous présents.' },
  'E0-P-287': { traits: 'L07 p.171 : le Trait est imprimé « Tongue Attack +3 (5) » (Attack Traits) ; il est présent sous la forme Creature Weapons (Tongue Attack) avec l\'attaque Tongue Attack 3, que le moteur lit comme la Langue (creature-combat.js).' },
  'E0-P-311': { attacks: 'L09 p.44 : « Repeater Handbow and Bolts (40/+6) » est l\'option à distance du Dark Elf City Lowborn (E0-P-313, colonne de droite) ; le Dark Elf imprime Hand Weapon (40/+7) et Repeater Crossbow and Bolts (40/+8), présentes.' },
  'E0-P-312': { traits: 'L09 p.44 : « Belligerent » est le Trait du Dark Elf Wilderness Lowborn (E0-P-314, colonne de droite) ; le Highborn imprime Hatred (High Elves) et Night Vision, présents.' },
  'E0-P-313': { attacks: 'L09 p.44 : « Repeater Crossbow and Bolts (40/+8) » est l\'option du Dark Elf (E0-P-311, colonne de gauche) ; le City Lowborn imprime Hand Weapon (40/+7) et Repeater Handbow and Bolts (40/+6), présentes.' },
  'E0-P-315': { traits: 'L09 p.45 : « Belligerent » est le Trait du Dark Pegasus (colonne de droite) ; le Dark Steed imprime Bestial, Night Vision, Size (Large), Skittish, présents.' },
  'E0-P-318': { traits: 'L09 p.46 : « Cold-blooded » est le Trait du Naggarothi Cold One (colonne de gauche) ; le Kharibdyss imprime Amphibious, Belligerent, Bestial, Constrictor, Distracting, Many Heads 5, Night Vision, Regenerate, Size (Enormous), Tracker, Venom (Difficult), tous présents.' },
  'E0-P-354': { trappings: 'L09 p.103 : « the High Beastmaster leads a procession around the ark » est la prose de l\'encadré « The Creature Parade » sous la liste ; l\'équipement imprimé est Medium Armour, Scourgerunner Chariot, Sea Dragon Cloak, Sword, Whip, tous présents.' },
  'E0-P-364': { skills: 'L10 p.9 : « many goods (Classical) 40 » et « seeking to make a profit… » sont la prose de l\'encadré « Why Visit Sylvania? » (colonne de droite) collée au mot « Language » ; les 13 compétences imprimées du comte sont présentes.' },
  'E0-P-368': { skills: 'L10 p.15 : « Blattner has dedicated herself… » est la prose d\'introduction de la colonne de gauche ; les 8 compétences imprimées (Channelling (Shyish) 50 … Research 50) sont présentes.' },
  'E0-P-373': { traits: 'L10 p.68 : « Painless CRYPT HORROR » est Painless, option du Crypt Ghast (présente dans optionalTraits), collé au titre du profil voisin.' },
  'E0-P-386': { trappings: 'L10 p.89 : « Roleplaying as Ranolf… » est l\'encadré de jeu sous la liste ; l\'équipement imprimé est Crowbar, Leather Jerkin, Sack, Cloth Mask, Leather Gloves, tous présents.' },
  'E0-P-052': { traits: 'L11 p.82 : « Unstable » n\'est pas un Trait du Wild Cat, c\'est un mot du texte de la règle Disruption (« Unstable creatures count their Advantage… ») ; les Traits imprimés (Arboreal, Bestial, Disruption, Night Vision, Skittish, Stride, Tracker) sont présents.' },
  // Q34c (L14-L26), relu page par page sur la mise en page du PDF.
  'E0-P-491': { traits: 'L14 p.84 : « Vulnerable to Heat » est un paragraphe de règle sous le profil (« Vulnerable to Heat: Endurance Tests… »), pas un Trait : la ligne Traits imprimée est Armour 2 (8), Attuned to Magic, Bite +8, Flight 80, Freezing Aura, Magical, Size (Large), Territorial, Ward 8+, Weapon (Claws) +10, tous présents.' },
  'E0-P-515': { traits: 'L17 p.30 : « Corrupting » et « Horns (SB+3) » sont des lignes de la table « Construct Traits » (coût en CN, colonne de droite) ; le Construct imprime Construct, Painless, Size (Large), Stupid, Unstable, Weapon +8, tous présents.' },
  'E0-P-584': { traits: 'L19 p.89 : « fast » est le mot de la prose d\'Emmille Münzstätter (« sudden, fast, and final », colonne de droite) ; Wulfrum Viert n\'imprime aucune ligne Traits.' },
  'E0-P-610': { talents: 'L19 p.152 : « Doomed » et « Menacing » sont dans « Talents: Doomed or Additional Random Talent, Menacing or Warrior Born… » du bloc d\'espèce Humains (Middenlander) sous le profil ; Kat Sperber imprime Ambidextrous, Attractive, Flee!, Orientation, Very Strong, Warrior Born, tous présents.' },
  'E0-P-611': { talents: 'L19 p.153 : « Doomed » et « Stout-hearted » sont dans « Talents: Doomed or Additional Random Talent, Fisherman or Rover, Stout-hearted or Very Resilient… » du bloc d\'espèce Humains (Nordlander) ; Theresia Kleist imprime Fisherman, Resistance (Disease), Strong Legs, Strong Swimmer, Super Numerate, Very Resilient, tous présents.' },
  'E0-P-613': { traits: 'L20 p.21 : « Breath », « Flaming », « Magical » et « Ward » viennent de la liste de sorts (Breath, Flaming Sword of Rhuin…) et de la description du Blazing Ruby (« Ward (7+) Creature Trait for 8 rounds », objet) ; Thyrus Gormann imprime « Traits: Animosity (difficult people), Weapon +9 », présents.' },
  'E0-P-670': { talents: 'L21 p.24 : « Small » est le titre du profil voisin « Animated Furniture, Small » ; le Medium imprime Armour 1, Construct, Immunity to Psychology, Painless, Weapon +5, Stride, sans talents.' },
  'E0-P-807': { traits: 'L23 p.108 : « Size » vient de « about the size of a Halfling » (prose de l\'Imperial Beast, colonne de gauche) ; The Farmyard Beasts impriment Bite +3, Fury, Hatred (Keepers), Night Vision, Venom (Challenging), Weapon +5, tous présents.' },
  'E0-P-808': { talents: 'L23 p.108 : « Hatred » est un Trait des Farmyard Beasts (Hatred (Keepers), profil voisin).', traits: 'Idem : « Venom » est le Trait des Farmyard Beasts (Venom (Challenging)) ; The Imperial Beast imprime Bite +3, Claw +4, Fury, Night Vision, Size (Small), Weapon +5, tous présents.' },
  'E0-P-822': { traits: 'L24 p.20 : « Prejudice (Boors) » est le Trait d\'Ursula Kopfgeld (colonne de droite) ; Josef Aufwiegler imprime seulement « Talents: Weapon (Fist) +3 ».' },
  'E0-P-836': { traits: 'L24 p.34 : « Prejudice (Rivals) » est le Trait d\'Eberhardt von Dammenblatz (colonne de gauche) ; l\'Imperial Viper imprime Armour (Scales) 1, Bestial, Cold-Blooded, Size (Small), Weapon (Fangs) +4, Venom (Hard), tous présents.' }
});
