/**
 * Cases de valeurs relues sur l'IMAGE de la page (pdftoppm) pour les lignes que le texte extrait ne permet pas d'aligner (gabarits
 * à cases vides, tiret illisible). Clé : « livre:page physique:rang du bloc sur la page ». Notation : `Clé=valeur` pour chaque case
 * remplie (M WS BS S T I Ag Dex Int WP Fel W), `-` pour un tiret imprimé ; toute autre case est vide (aucun modificateur).
 */
const COLUMNS = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'];
const row = text => ({
  cells: COLUMNS.map(column => {
    const found = new RegExp(`(?:^|\\s)${column}=(\\S+)`).exec(text);
    return found ? found[1] : null;
  })
});

export const CELL_OVERRIDES = Object.freeze({
  // Temple of Spite (L09) : gabarits de Druchii, pages 53 à 56.
  'L09:53:0': row('WS=+25 BS=+20 S=+10 I=+20 Ag=+10 WP=+15 Fel=+20'),
  'L09:53:1': row('WS=+10 BS=+10 S=+5 I=+5 Ag=+10 WP=+10'),
  'L09:53:2': row('WS=+20 BS=+20 S=+10 I=+20 Ag=+20 WP=+15 Fel=+20'),
  'L09:53:3': row('WS=+15 BS=+10 S=+15 I=+20 Ag=+10 WP=+15'),
  'L09:54:0': row('WS=+10 BS=+5 S=+5 I=+10 Ag=+10 WP=+10'),
  'L09:54:1': row('WS=+10 BS=+20 S=+10 I=+15 Ag=+20 WP=+15 Fel=+10'),
  'L09:54:2': row('BS=+15 I=+10 Ag=+15 WP=+10'),
  'L09:54:3': row('WS=+30 BS=+20 S=+10 I=+20 Ag=+20 Dex=+10 Int=+20 WP=+20 Fel=+10'),
  'L09:55:0': row('WS=+5 I=+20 Ag=+10 Dex=+10 Int=+30 WP=+30 Fel=+20'),
  'L09:55:1': row('I=+10 Int=+15 WP=+15 Fel=+10'),
  'L09:55:2': row('WS=+10 S=+10 I=+10 Ag=+10 WP=+10'),
  'L09:56:0': row('WS=+20 S=+10 I=+20 Ag=+20 Int=+10 WP=+20 Fel=+10'),
  'L09:56:1': row('WS=+10 BS=+5 I=+10 Ag=+5 Dex=+5 Int=+10 Fel=+15'),
  'L09:56:2': row('WS=+5 BS=+10 I=+5 Ag=+5 Int=+5 WP=+5'),
  'L09:56:3': row('WS=+5 S=+5 T=+5 I=+15 Ag=+10 Dex=+5 Int=+5 Fel=+15'),
  // Temple of Spite (L09) p. 50 : Sea Dragon, M = 10 (le « 1 » était perdu par l'extraction).
  'L09:50:0': row('M=10 WS=70 BS=60 S=70 T=80 I=60 Ag=25 Dex=10 Int=55 WP=60 Fel=25 W=232'),
  // Sylvania (L10) : trois PNJ dont la ligne de valeurs est mal alignée par l'extraction.
  'L10:81:0': row('M=4 WS=37 BS=42 S=29 T=36 I=34 Ag=25 Dex=26 Int=25 WP=36 Fel=35 W=11'),
  'L10:91:0': row('M=4 WS=31 BS=24 S=38 T=37 I=32 Ag=37 Dex=26 Int=38 WP=31 Fel=32 W=12'),
  'L10:93:0': row('M=4 WS=46 BS=22 S=46 T=47 I=36 Ag=36 Dex=32 Int=27 WP=26 Fel=40 W=16'),
  // Tribes and Tribulations (L12) : gabarits des Orques, Gobelins et Trolls.
  'L12:16:0': row('WS=+5 S=+5 T=+5 I=+10 WP=+5'),
  'L12:16:1': row('BS=+5 I=+10 Ag=+10 WP=+5'),
  'L12:16:3': row('WS=+10 S=+10 T=+10 I=+20 Ag=+10 WP=+15'),
  'L12:17:0': row('WS=+25 BS=+10 S=+15 T=+15 I=+25 Ag=+20 Int=+10 WP=+25 Fel=+10'),
  'L12:17:1': row('T=+5 I=+15 Dex=+10 Int=+15 WP=+15'),
  'L12:17:2': row('WS=+10 S=+5 T=+15 I=+20 Ag=+15 Dex=+20 Int=+35 WP=+30 Fel=+10'),
  'L12:17:3': row('WS=+35 BS=+10 S=+25 T=+30 I=+30 Ag=+25 Int=+15 WP=+35 Fel=+15'),
  'L12:88:0': row('I=+5'),
  'L12:88:1': row('WS=+10 S=+5 I=+5 WP=+10'),
  'L12:88:2': row('WS=-10 T=+10 I=+5 WP=+10'),
  'L12:88:3': row('T=+5'),
  'L12:89:0': row('M=-1 WS=+10 S=+10 T=+10 I=-5 WP=+5'),
  'L12:89:1': row('M=+1 WS=+10 I=+10 Ag=+5 Int=-5 WP=-10'),
  'L12:89:2': row('S=+10 T=+10 I=+5 Int=+30 WP=+20'),
  'L12:89:3': row('M=-1 S=+5 T=+5 I=-3 Ag=-5'),
  // The Horned Rat Companion (L22) : le rat à deux têtes (BS, Dex et Fel absents).
  'L22:14:1': row('M=5 WS=35 BS=- S=40 T=35 I=25 Ag=25 Dex=- Int=17 WP=15 Fel=- W=11')
});

/**
 * Entrées que l'inventaire E0 classe « profile » alors que le livre imprime des modificateurs (cases vides, aucune Blessures) : ce sont
 * des gabarits. Le genre de la fiche est corrigé, le genre de l'inventaire est conservé dans `inventoryKind` (voir E-D16).
 */
export const TEMPLATE_IDS = Object.freeze(new Set([
  'E0-P-326', 'E0-P-327', 'E0-P-328', 'E0-P-329', 'E0-P-330', 'E0-P-331', 'E0-P-332', 'E0-P-333', 'E0-P-334', 'E0-P-335', 'E0-P-336', 'E0-P-337', 'E0-P-338', 'E0-P-339', 'E0-P-340',
  // Tribes and Tribulations (L12) : la Mégère troll des rivières (p. 89) est une variante en modificateurs, comme le Troll massif (E-D18)
  'E0-P-449',
  // Middenheim (L19) : l'Enfant d'Ulric (p. 116) n'a pas de profil propre, il imprime les modificateurs de sa forme hybride (E-D25)
  'E0-P-598'
]));

/** Profils dont le livre n'imprime aucune Blessures (pas de colonne W) : `wounds: null` et `woundsAbsent: true` (E-D23). */
export const WOUNDS_ABSENT_IDS = Object.freeze(new Set(['E0-P-515']));

/**
 * Noms que l'inventaire E0 a lus de travers (phrase du texte d'ambiance prise pour un titre) : le titre imprimé du bloc est rétabli (E-D18).
 */
export const NAME_FIXES = Object.freeze({
  'E0-P-438': 'Matthogg — Ogre Bruiser',
  // Middenheim (L19) : tirets longs lus à la place des umlauts (E-D25)
  'E0-P-585': 'Emmille Münzstätter — Human Artisan (Silver 1)',
  // Altdorf (L20) : titre de section collé au nom, parenthèse doublée, umlaut lu comme un tiret long (E-D26)
  'E0-P-613': 'Thyrus Gormann — Wizard Lord (Gold 2)',
  'E0-P-632': 'Freya Husslhaus — Human Priest (Silver 1)',
  'E0-P-651': 'Count Jäger',
  // Empire in Ruins Companion (L21) : titres sans nom, virgules orphelines, umlauts lus comme des tirets longs, titre de section collé (E-D27)
  'E0-P-658': 'Father Gregor Braun — High Priest (Gold 1)',
  'E0-P-660': 'Wolf-Born Fernand Wagner — High Priest (Gold 1)',
  'E0-P-665': 'Flamers of Tzeentch',
  'E0-P-666': 'Agitator — Brass 2',
  'E0-P-668': 'Animated Furniture, Large',
  'E0-P-679': 'Colonel Reikhardt Sievers — Officer (Gold 1)',
  'E0-P-680': 'Father Eduard von Tunz — Human Priest (Silver 2)',
  'E0-P-681': 'Flag Sergeant Borys Zielin — Human Scout (Silver 1)',
  'E0-P-682': 'Bengt Livmatz — Human Artisan (Silver 1)',
  'E0-P-684': 'Renia Grünewald — Human Envoy (Silver 2)',
  'E0-P-686': 'Sebastian, Esmer, Jozef — Human Sergeants (Silver 1)',
  'E0-P-688': 'Wolfgang Holswig-Aberauer, the Champion in Shadows',
  'E0-P-690': 'Mournguls',
  'E0-P-691': 'Curs\'d Ettins',
  'E0-P-692': 'Colossal Squigs',
  'E0-P-693': 'Necrofex Colossus',
  'E0-P-709': 'Etelka Herzen — Human Wizard Lord (Gold 2)',
  'E0-P-710': 'Ernst Heidlemann — Human Wizard\'s Apprentice (Silver 3)',
  'E0-P-711': 'Hans Gräber — Level 1 Monk, Level 4 Wizard (Necromancer)',
  'E0-P-715': 'The Gravelord\'s Zombies',
  // Death on the Reik Companion (L26) : caractères accentués perdus (graphies de l'index p.122), guillemets des surnoms, « Typical » collé au nom, profil sans titre (E-D32)
  'E0-P-927': 'Gertrud Schützenberger — Human River Recruit (Silver 1)',
  'E0-P-930': '\'Wet\' Wilgryn Augenlos — Human Shipsword Master (Gold 1)',
  'E0-P-935': 'Roland \'The Horse\' Bruckesel — Human Guard (Silver 2)',
  'E0-P-936': 'Edgar \'The Pike\' Ebrecht — Human Pit Fighter (Brass 4)',
  'E0-P-940': 'Eusapia Balacañon — Human Master Wizard (Gold 1)',
  'E0-P-946': 'Altgräfin Emelia Luneburg — Human Magnate (Gold 5)',
  'E0-P-951': 'Agrin \'The Blood of the Flagellant Is Sigmar\'s Own\' Losburg — Human Zealot (Brass 0)',
  'E0-P-955': 'Boris Landsmaan — Typical Human Pirate (Boat-Hand)',
  'E0-P-984': 'Carrion',
  // Sea of Claws (L25) : « ö » lu comme un tiret, en-tête de page collé, titres des équipages perdus (lus sur la page 127), apostrophe en majuscule (E-D31)
  'E0-P-895': 'Ludolf Köhler — Imperial Sea Lord (Gold 3)',
  'E0-P-897': 'Skaldor \'Reaver\' Lotharksson — Dwarf Ship\'s Master (Gold 2)',
  'E0-P-898': 'Olg Blöösalt — Skaeling Captain (Gold 2)',
  'E0-P-899': 'Landsman — Silver 1',
  'E0-P-900': 'Officer — Silver 5',
  'E0-P-901': 'Sailor — Silver 3',
  'E0-P-902': 'Huffer — Silver 1',
  'E0-P-903': 'Seasoned Mercenary — Silver 3',
  'E0-P-904': 'Doktor — Silver 5',
  // Rough Nights & Hard Days (L24) : en-têtes de scénario ou de page collés au nom, apostrophes en majuscule, accents graves, chiffre romain (E-D30)
  'E0-P-823': 'Friedrich von Pfeifraucher — Magnate (Gold 5)',
  'E0-P-825': 'Mho, Larz, and \'Curls\' — Thugs (Brass 3)',
  'E0-P-832': 'Mercinellin \'Seedling\' Thorncobble XIII — Hustler (Brass 1)',
  'E0-P-835': 'Eberhardt von Dammenblatz — Noble Lord (Gold 7)',
  'E0-P-837': 'Kappan\'s Racketeers — Thugs (Brass 3)',
  'E0-P-844': 'Emmanuelle von Liebwitz — Elector Countess (Gold 15)',
  'E0-P-847': 'Palace Guards (Gold 2)',
  'E0-P-859': 'Nurgle Cultists & Sorcerer (Silver 3)',
  'E0-P-861': 'Hubkind\'s Mob (Brass 4)',
  // Enemy in Shadows Companion (L23) : titre coupé, guillemets en accent grave du livre, umlauts lus comme des tirets longs (E-D29)
  'E0-P-759': 'Donkey or Mule',
  'E0-P-768': 'Aleanora \'Al\' Shortbottom — Halfling Toll Keeper (Brass 5)',
  'E0-P-777': 'Delberz Trütte — Human Pedlar (Brass 4)',
  'E0-P-783': 'Albert Pförtner — Human Stevedore (Silver 1)',
  'E0-P-812': '\'Granny\' Haller — Con Artist (Silver 2)',
  // The Horned Rat Companion (L22) : tirets doublés, apostrophe en majuscule (E-D28)
  'E0-P-740': 'Mila Raast — Yellow Fang Senior Cultist',
  'E0-P-747': 'Gimbrin Flintbeard — Dwarf King\'s Ghost'
});

/** Armure imprimée en plusieurs parties sans total : le texte imprimé est conservé en détail, sans PA global (E-D25). */
export const ARMOUR_DETAIL = Object.freeze({
  'E0-P-575': 'Helm 2, Plate 3'
});

/** Équipement dont un objet est suivi d'un mot ou d'une phrase de la colonne voisine : l'objet est coupé après le nom donné (L16 p. 45 : « Restorative Brew Once the preparations… », p. 90 : « Pair of Swords y »). */
export const TRAPPING_TRIMS = Object.freeze({
  'E0-P-502': ['Restorative Brew'],
  'E0-P-512': ['Pair of Swords'],
  // Altdorf (L20) p. 195 : Concern Peony Hayfoot, « Herbs Worth 12/5 » est suivi d'un mot de la colonne voisine (« …all that sort of thing »).
  'E0-P-652': ['Herbs Worth 12/5'],
  // Altdorf (L21) p. 84 : Zurn, « Sword » est suivi du texte de la colonne voisine (« The horde is largely made up… »).
  'E0-P-705': ['Sword']
});

/** Équipement dont le nom imprimé contient des virgules (Helena Bastiat-Hatzburg, Altdorf L20 p. 72) : recollé après le découpage à virgules. */
export const TRAPPING_JOINS = Object.freeze({
  // Sylvania, The Cursed County (L10) p. 9 : le comte Alberich, « The Stirland Runefang, Orc Hewer » est le nom de l'épée, un seul objet.
  'E0-P-364': ['The Stirland Runefang, Orc Hewer'],
  'E0-P-625': ['Notebook of Plans, Schemes, and Dirty Secrets'],
  // Sea Wardens of Cothique (L14) p. 27 : Prince Dalloran, la dernière puce de la liste est une seule phrase à virgules.
  // Power Behind the Throne Companion (L18) p. 60 : Nastassia, « 3 GCs in assorted denominations, but can can lay her hands on 100 GCs within an hour » est un seul objet.
  'E0-P-545': ['3 GCs in assorted denominations, but can can lay her hands on 100 GCs within an hour'],
  // Temple of Spite (L09) p. 126 : Kernethar Grimwitch, le nom d'un faux certificat contient une virgule entre ses apostrophes.
  'E0-P-363': ['Forged Testimonials for \'Malforic Silverblade, Fencing Master\'', 'Traveller\'s Chest with Fine Clothes and Hidden Compartment for Diary'],
  // Power Behind the Throne Companion (L18) p. 97 : Skaven Grey Seer, « As above, plus enough Warpstone… » : l'objet ajouté est un seul nom.
  'E0-P-557': ['enough Warpstone to double the SL of three Casting/Channelling Tests (WFRP 244)'],
  'E0-P-472': ['Vaults containing vast wealth of coin, rare minerals, and magical items'],
  // Tribes and Tribulations (L12) p. 107 : Gorfang, « Ramshackle armour incorporating plate, mail, and scale » est un seul objet.
  'E0-P-455': ['Ramshackle armour incorporating plate, mail, and scale'],
  // Altdorf (L21) p. 78 : Gerta Faernmaus, objet décrit sur trois lignes, sa parenthèse finale n'est pas celle d'un nom.
  'E0-P-706': ['Chaos Armour (cannot be removed) decorated with the skin of a dire wolf'],
  // Enemy in Shadows Companion (L23) p. 111 : « Granny » Haller, « Potions and Charms, all fake (…) » est un seul objet.
  'E0-P-812': ['Potions and Charms, all fake (at the GM\'s discretion, some may have interesting but unplanned effects)'],
  'E0-P-700': ['Book of Pressed Flowers taken from every battlefield she has ever fought on (worth 5 GC to someone interested in botany)']
});

/**
 * Corps de bloc relus sur la page quand la mise en page (interligne double) empêche de suivre les lignes d'un bloc. Clé : « livre:page:rang ».
 * Le texte est celui du livre, recopié ligne à ligne.
 */
// Noms de Traits imprimés que l'inventaire ne connaît pas : gardés dans `specialRules` plutôt que perdus (Urzo, L23 p. 104 : Animalistic Legs).
export const TRAITS_KEPT_AS_RULES = Object.freeze(new Set(['Animalistic Legs', 'Mark of Slaanesh', 'Coven Sorcerer', 'Prey of the Dark Prince', 'Vampiric Gaze', 'Hunger', 'Corrupt']));

// Noms imprimés dans la liste facultative sans équivalent à l'inventaire (River Trolls, L26 p. 89 : « Stealth », qui est une compétence) : gardés dans `optionalSpecialRules`.
export const OPTIONAL_RULES_KEPT = Object.freeze(new Set(['Stealth']));

export const BODY_LINE_FIXES =Object.freeze({
  // Temple of Spite (L09) p. 97 : Samuril Meurlith, « Dagger » mangé par la prose de la colonne voisine (« …taking credit for Dagger (60/+5) with the Fast Quality »).
  'L09:97:0': [['(60/+5) with the Fast Quality', 'Dagger (60/+5) with the Fast Quality']],
  // Sylvania (L10) p. 87 : Matthias Primvik, fragments de la prose voisine (« a », « uty. », « lf, », « t -- the », « ing ») collés aux rubriques.
  'L10:87:0': [['a', ''], ['uty.', ''], ['lf,', ''], ['t -- the', ''], ['ing', ''], ['Intimidate 40, Language (Reikspiel) 65,', 'Intimidate 40, Language (Reikspiel) 65,']],
  // Sylvania (L10) p. 93 : Emil Hartwig, « Boat » mangé par la prose voisine.
  'L10:93:0': [['ook (49/+8)', 'Boat Hook (49/+8)']],
  // Livre de base V5 (L06) p. 322 : Human Thug, « 2 Leather Jack » (le 2 est la fin du numéro de page 322 imprimé en marge).
  'L06:322:1': [['2 Leather Jack, Pouch containing 3d10 Brass Pennies, Sling', 'Leather Jack, Pouch containing 3d10 Brass Pennies, Sling']],
  // Livre de base V5 (L06) p. 344 : Varghulf, le début de « Traits Continued » (colonne de droite, chiffre « 4 » de la page) a mangé le début de Hungry.
  'L06:344:0': [['feast, losing their next Move and Action', 'Hungry: If they incapacitate an opponent or encounter a fresh body, they must pass an Average (+2 SL) Cool Test or feast, losing their next Move and Action']],
  // Livre de base V5 (L06) p. 331 : Fenbeast, lettre « c » de la citation voisine collée à la qualité « Magical ».
  'L06:331:0': [['c', '']]
});

export const BODY_OVERRIDES = Object.freeze({
  // Temple of Spite (L09) p. 122 : Duriath Helbane, la prose de la colonne voisine mange le début de plusieurs lignes (« dium Armour », « gon Cloak », « Old ation », « er's Crown ») : relu sur la page.
  'L09:122:0': [
    'Attacks',
    'Sword (90/+8)',
    'Repeater Handbow and Bolts: (90/+6) range of 10 yards with the Impale, Pistol, and Repeater 3 Qualities, and the Reload 9 Flaw',
    'Armour',
    'Toughness Bonus: 3',
    'Medium Armour: +3 AP',
    'Sea Dragon Cloak: +2 AP to Body with the Partial Flaw',
    'Skills',
    'Athletics 85, Charm 85, Climb 65, Consume Alcohol 50, Cool 90, Dodge 80, Endurance 45, Gossip 80, Intimidate 65, Intuition 90, Language (Bretonnian 75, Grand Cathayan 70, Reikspiel 85, Norse 75), Leadership 95, Lore (Heraldry 75, Naggaroth 90, Oceans 85, Politics 90), Melee (Basic 90, Fencing 85, Parry 85), Navigation 85, Perception 85, Ranged (Crossbow) 90, Ride (Horse 85, Manticore 75), Row 65, Sail 85, Swim 65',
    'Traits and Talents',
    'Hatred (High Elves): See Hatred in the WFRP Core Rulebook.',
    'Night Vision: See clearly for 20 yards and extend the illumination distance of light sources by 20 yards.',
    'Briber, Carouser, Catfall, Combat Reflexes, Commanding Presence, Coolheaded, Dealmaker, Dual Wielder, Etiquette (Corsairs, Nobles), Furious Assault, In-fighter, Inspiring, Iron Will, Luck, Menacing, Noble Blood, Old Salt, Orientation, Pilot, Public Speaking, Read/Write, Schemer, Seasoned Traveller, Stout-hearted, Strong Swimmer, Suave, War Leader',
    'Trappings',
    'Fleetmaster\'s Crown, Medium Armour, Repeater Handbow with 21 Bolts, Sea Dragon Cloak, Two Swords'
  ],
  // Livre de base V5 (L06) p. 343 : Vampire, le titre de la rubrique « Traits » et ses deux premiers Traits (Night Vision…) étaient lus dans le titre du profil.
  'L06:343:0': [
    'Attacks',
    'Hand Weapon: (55/+9)',
    'Bite: (60/+8) Lose Momentum to make this Free Attack',
    'Armour',
    'Toughness Bonus: 4',
    'Optional Medium Armour: +3 AP',
    'Optional Heavy Armour: +5 AP',
    'Optional Shield: +2 AP and +1 SL when Opposing an attack with Dodge or Melee',
    'Skills',
    'Charm 35, Climb 60, Intuition 50, Melee (Basic) 55, Melee (Brawling) 60, Perception 50, Stealth (Rural) 60, Stealth (Urban) 60, Track 40',
    'Traits',
    'Night Vision: See clearly for 20 yards and extend the illumination distance of light sources by 20 yards',
    'Undead: Not reliant on air, food, water, and other things needed to sustain life, affected by spells, miracles, or other abilities that affect Undead only',
    'Vampiric: Whenever the creature performs a successful Bite attack against an appropriate opponent, they heal as many Wounds as the opponent loses.',
    'Optional Traits',
    'Bestial, Champion, Corruption (Minor), Dark Vision, Distracting, Fear, Fly 40, Frenzy, Hungry, Mental Corruption, Painless, Petrifying Gaze, Regeneration, Spellcaster (Death or Necromancy), Tracker, Wallcrawler'
  ],
  // Temple of Spite (L09) p. 45 : Dark Steed, la colonne de droite (Dark Pegasus, armures des gabarits) s'intercale entre les rubriques ; « Option: » = armure facultative.
  'L09:45:1': [
    'Attacks',
    'Hooves (25/+12) with the Pummel Quality',
    'Armour',
    'Toughness Bonus: 3',
    'Optional Light Armour: +1 AP',
    'Optional Medium Armour: +3 AP',
    'Traits',
    'Bestial: Animal behaviour is simple and predictable, see the WFRP Core Rulebook.',
    'Night Vision: See clearly for 20 yards and extend the illumination distance of light sources by 20 yards.',
    'Size (Large): See the WFRP Core Rulebook for implications of size.',
    'Skittish: Receive +3 Broken Conditions if affected by loud noise or magic.',
    'Optional Traits',
    'Trained (Broken, Drive, Magic, Mount, War)'
  ],
  // Temple of Spite (L09) p. 47 : War Hydra, la prose de la colonne voisine (Gnarlmane, Clar Karond) était lue comme des attaques.
  'L09:47:0': [
    'Attacks',
    'Talons (45/+14)',
    'Bite (45/+8) Lose Momentum to make this free attack',
    'Breath (Fire or Poison): See the WFRP Core Rulebook for details of Breath attacks',
    'Armour',
    'Toughness Bonus: 5',
    'Scales: +2 AP',
    'Skills',
    'Stealth (Rural) 45, Track 25',
    'Traits',
    'Bestial: Animal behaviour is simple and predictable, see the WFRP Core Rulebook.',
    'Constrictor: Successful hits give the target an Entangled Condition.',
    'Many Heads 5: The creature has 5 heads, see page 47 for details.',
    'Night Vision: See clearly for 20 yards and extend the illumination distance of light sources by 20 yards.',
    'Regenerate: Regain 1d10 Wounds at start of each Round.',
    'Size (Enormous): See the WFRP Core Rulebook for implications of size.',
    'Striding Gait (Mountains, Wetlands): Suffer no penalties for moving through mountains or wetland.',
    'Tracker: Add +3 SL to all Track Tests.',
    'Optional Traits',
    'Belligerent, Territorial, Trained (Broken, War), Venom (Difficult)'
  ],
  // Temple of Spite (L09) p. 50 : Sea Dragon, le « 10 » de la Capacité de mouvement était lu « 0 » (voir CELL_OVERRIDES) et la prose voisine mangeait les attaques.
  'L09:50:0': [
    'Attacks',
    'Claws (70/+25)',
    'Bite (70/+10) Lose Momentum to make this free attack',
    'Tail (70/+9) Lose Momentum to make this free attack, smaller opponents take a Prone Condition if wounded',
    'Breath (Any One): See the WFRP Core Rulebook for details of Breath attacks',
    'Armour',
    'Toughness Bonus: 8',
    'Scales: +3 AP',
    'Traits',
    'Marine Creature: The creature\'s profile assumes they are in an aquatic environment and they move their full M in water.',
    'Night Vision: See clearly for 20 yards and extend the illumination distance of light sources by 20 yards.',
    'Size (Monstrous): See the WFRP Core Rulebook for implications of size.',
    'Optional Traits',
    'Trained (Mount)'
  ],
  // Temple of Spite (L09) p. 73 : Damina Hroska, la clause de l'éventail (« hits that do Damage inflict… ») collait au nom de l'attaque suivante, le Bouclier manquait,
  // et « Strike to Injure. » (dernier talent, suivi d'un point) était perdu.
  'L09:73:0': [
    'Attacks',
    'Razor-tipped Grand Cathayan Fan (85/+6) hits that do Damage inflict 1 Bleeding Condition',
    'Repeater Handbow and Bolts: (65/+7) range of 10 yards with the Impale, Pistol, and Repeater 3 Qualities, and the Reload 9 Flaw',
    'Armour',
    'Toughness Bonus: 3',
    'Medium Armour: +3 AP',
    'Shield: +2 AP when Opposing an attack with Dodge or Melee',
    'Skills',
    'Athletics 75, Bribery 60, Charm 65, Climb 55, Dodge 80, Entertain (Acting) 55, Haggle 65, Intuition 85, Lore (Chemistry 85, Herbs 85), Melee (Basic) 85, Ranged (Crossbow) 65, Perception 90, Pick Lock 65, Sleight of Hand 65, Stealth 80, Trade (Poisoner) 85',
    'Traits and Talents',
    'Accurate Shot, Careful Strike, Combat Reflexes, Disarm, Dual Wielder, Enclosed Fighter, Gifts of Khaine (Touch of Khaine), Hatred (High Elves), Master of Disguise, Mimic, Night Vision, Read/Write, Shadow, Sixth Sense, Strike to Injure.',
    'Trappings',
    'Cloak, Fine Clothes, Grand Cathayan Fan, Disguise, Light Armour, Repeater Handbow with 21 Bolts, Vial of Poison (Manbane)'
  ],
  // Temple of Spite (L09) p. 86 : Dockside Thug, l'Armure et les Compétences (sous la ligne d'attaque, colonnes imbriquées) manquaient.
  'L09:86:0': [
    'Attacks',
    'Boat Hook (40/+8)',
    'Armour',
    'Toughness Bonus: 3',
    'Light Armour: +1 AP',
    'Skills',
    'Climb 45, Dodge 35, Melee (Basic) 40, Swim 45'
  ],
  // Temple of Spite (L09) p. 126 : Kernethar Grimwitch, « Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death) » (parenthèse sur deux lignes) et « Soul Pact (Unaligned Daemon) » étaient perdus,
  // l'équipement s'arrêtait à l'apostrophe de « Fencing Master' ».
  'L09:126:0': [
    'Attacks',
    'Dagger (62/+5) with the Fast Quality',
    'Rapier (70/+7) with the Fast and Impale Qualities',
    'Armour',
    'Toughness Bonus: 3',
    'Skills',
    'Channelling (Dhar 90, Ghur 95, Shyish 90), Cool 90, Dodge 75, Entertain (Acting) 46, Intimidate 46, Intuition 88, Language (Bretonnian 90, Elthárin, Magick 95, Reikspiel 80), Leadership 51, Lore (Chemistry 85, Magic 95, Medicine 90), Melee (Basic 62, Fencing 70), Perception 83, Ride (Horse) 60, Stealth (Urban) 65',
    'Traits and Talents',
    'Aethyric Attunement, Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death), Attractive, Hatred (High Elves), Instinctive Diction, Master of Disguise, Mimic, Night Vision, Petty Magic, Read/Write, Second Sight, Sixth Sense, Soul Pact (Unaligned Daemon).',
    'Spells',
    'Petty: Bearings, Careful Step, Drain, Light, Murmured Whisper, Rot, Twitch',
    'Lore of Death: Aethyric Armour, Blast, Soul Vortex, Steal Life, Purple Pall of Shyish, Terrifying',
    'Lore of Beasts: Amber Talons, Beast Form, Bridge, Entangle, Flock of Doom, Mundane Aura',
    'Lore of Dark Magic: Doombolt, Shroud of Despair',
    'Trappings',
    'Dagger, Diary, Forged Testimonials for \'Malforic Silverblade, Fencing Master\', Fine Leather Travelling Clothes and Cloak, Purse with 15 GC, Rapier, Traveller\'s Chest with Fine Clothes and Hidden Compartment for Diary'
  ],
  // Livre de base V5 (L06) p. 321 : Human Watchman et Human Merchant, la fin de l'équipement (« Lunch, Uniform », « 3d10 Shillings ») se perdait à la coupe de ligne (interligne double).
  'L06:321:0': [
    'Attacks',
    'Dagger: (55/+6)',
    'Hand Weapon: (55/+8)',
    'Armour',
    'Toughness Bonus: 3',
    'Leather Jack: +1 AP to Arms and Body',
    'Skills',
    'Athletics 40, Cool 40, Dodge 40, Gossip 40, Haggle 35, Intimidate 45, Melee (Basic) 55, Perception 50, Ranged (Bow) 35',
    'Talents',
    'Acute Sense (Sight): May take Perception Tests to detect normally imperceptible details with the associated sense',
    'Nose for Trouble: Advantage on Intuition Tests, and can usually tell where to gamble, fight, or get stinking drunk',
    'Supportive: Advantage and no penalty on Tests to Charm those of higher Status',
    'Warrior Born: +5 WS already added to profile',
    'Trappings',
    'Cloak, Clothing, Copper Badge, Dagger, Hand Weapon, Lamp Oil, Lantern and Pole, Leather Jack, Hat, Pouch containing 1d10 Silver Shillings, Sling Bag containing Lunch, Uniform'
  ],
  'L06:321:1': [
    'Attacks',
    'Dagger: (35/+5)',
    'Armour',
    'Toughness Bonus: 3',
    'Skills',
    'Animal Care 45, Charm 50, Charm Animal 40, Drive 45, Evaluate 50, Gossip 55, Haggle 55, Intuition 35, Melee (Basic) 35, Navigation 45',
    'Talents',
    'Gregarious: Advantage on Gossip Tests and can usually tell where in a settlement gossip is likely to be exchanged',
    'Strong Back: Adds +1 SL to Opposed Strength Tests, and can carry an additional Encumbrance point',
    'Super Numerate: Advantage on Evaluate Tests, and can keep track of the passage of time accurately while conscious',
    'Suave: +5 Fel already added to profile',
    'Trappings',
    'Abacus, Canvas Tarpaulin, Cloak, Clothing, Dagger, Hat, Mule and Cart containing Wares, Pouch containing 3d10 Shillings, Sling Bag containing Lunch'
  ],
  // Lustria (L07) p. 62 : Lord Skrolk, l'équipement (« Filthy Robes, Liber Bubonicus, Rod of Corruption ») suit la prose de la rubrique Spells et était perdu ; « Luck 7 » garde son rang.
  'L07:62:0': [
    'Traits: Corruption (Moderate), Dark Vision, Die Hard, Disease (Ratte Fever), Frenzy, Infected, Painless, Spellcaster (Petty, Nurgle, Plague), Weapon (Quarterstaff) +9',
    'Skills: Art (Writing) 70, Channelling (Dhar) 95, Cool 95, Dodge 65, Endurance 105, Gamble 105, Gossip 40, Haggle 40, Intimidate 60, Intuition 90, Language (Battle 95, Classical 95, Dark Tongue 105, Magick 105, Reikspiel 100, Tilean 105), Lore (Chaos 95, Magic 95, Medicine 95, Warfare 95), Melee (Polearm) 63, Perception 90, Research 105, Trade (Poisoner) 70',
    'Talents: Aethyric Attunement, Arcane Magic (Nurgle, Plague), Detect Artefact, Flee!, Frightening, Hardy, Luck 7, Petty Magic, Read/Write, Savvy, Sixth Sense, War Wizard',
    'Trappings: Filthy Robes, Liber Bubonicus, Rod of Corruption'
  ],
  // Power Behind the Throne Companion (L18) p. 97 : Skaven Grey Seer (version du Rituel), « As above, plus … » résolu d'après le profil voisin (Skretth, même page).
  'L18:97:3': [
    'Traits: Corruption (Erratic Fantasist), Night Vision, Spellcaster (Horned Rat), Weapon +7',
    'Skills: Channelling 71, Melee (Polearm) 53, Language (Magick 74, Reikspiel) 48',
    'Talents: Aethyric Attunement 2, Hardy 2, Instrinctive Diction 2, War Wizard',
    'Trappings: Grey Robes, Quarterstaff, 4 Doses of Mandrake Snuff, Grimoire, Magic Ring (see box on page 94), enough Warpstone to double the SL of three Casting/Channelling Tests (WFRP 244)',
    'Spells: Aethyric Armour, Bolt, Silence, Chain Attack, Terrifying'
  ],
  // Sylvania (L10) p. 68 : Crypt Ghast, « Infected » et « Night Vision » (la ligne est coupée par le gabarit voisin du Crypt Horror) manquaient ; Traits facultatifs.
  'L10:68:0': [
    'Traits: Bite +7, Fearless, Frenzy, Hungry, Infected, Night Vision, Venom (Hard), Weapon (Claws) +8',
    'Optional Traits: Champion, Painless'
  ],
  // Rough Nights & Hard Days (L24) p. 22 : Allrella, Elphoise et Helga, « (Dagger) +5 » imprime l'arme sans le mot « Weapon » (coquille du livre, comme « Weapons (Spear) +8 »).
  'L24:22:0': [
    'Traits: Prejudice (Warriors), Weapon (Dagger) +5'
  ],
  // Enemy in Shadows Companion (L23) p. 43 : Aleanora « Al » Shortbottom, « Ranged (Crossbow) 60 +9 » (portée avant les dégâts) et « Dagger +5 » (sans « Weapon ») n'étaient pas lus comme attaques.
  'L23:43:0': [
    'Traits: Armour (Leather Jack) 1, Ranged (Crossbow) +9 (60), Weapon (Dagger) +5',
    'Skills: Bribery 49, Consume Alcohol 43, Dodge 43, Gamble 35, Gossip 49, Haggle 52, Melee (Basic) 27, Perception 41, Ranged (Crossbow) 59, Sleight of Hand 51',
    'Talents: Acute Sense (Taste), Embezzle, Marksman, Night Vision, Seasoned Traveller, Small, Resistance (Chaos)',
    'Trappings: Cloak, Clothing, Crossbow with 10 Bolts, Dagger, Leather Jack, 44 brass pennies (with 16 silver shillings and 3 gold crowns secreted away)'
  ],
  // Sea Wardens of Cothique (L14) p. 55 : Fialthra Swiftprow, la liste « Petty Spells » (colonne de droite) commence sur la ligne de l'en-tête :
  // l'extraction en perdait le début et collait « Dirt, Reveal Magic » à la fin des Talents (talent parasite « War Wizard Dirt »).
  'L14:55:0': [
    'Traits: Ranged (Elf Bow) +8 (150) (Accurate, Damaging, Impale, Penetrating, Precise), Weapon (Sword) +7',
    'Skills: Animal Care 86, Athletics 73, Art (Calligraphy 86, Writing 76), Bribery 72, Channelling (Aqshy 101, Azyr 96, Chamon 91, Hysh 91, Ghur 96, Ghyran 106, Qhaysh 86, Shyish 91, Ulgu 96), Charm 82, Cool 91, Dodge 68, Entertain (Singing 77, Speeches 72), Evaluate 88, Gossip 77, Haggle 77, Heal 88, Intimidate 47, Intuition 88, Language (Arabyan 88, Bretonnian 88, Classical 98, Eltharin, Estalian 88, Grumbarth 88, Khazalid 93, Magick 103, Norse 88, Reikspiel 93, Tilean 88, Wastelander 93), Lore (Astrology 98, Bretonnia 88, Cothique 103, Estalia 88, Geography 93, Heraldry 93, History 98, Law 103, Magic 103, Marienburg 93, The Empire 88, Theology 103), Melee (Basic) 71, Navigation 88, Perception 93, Play (Lyre) 81, Pray 77, Ranged (Bow) 47, Research 98, Ride (Horse) 78, Sail (Hawkship) 78, Swim 37',
    'Talents: Acute Sense (Sight), Aethyric Attunement, Arcane Magic (Beasts, Death, Fire, Heavens, Light, Life, Metal, Shadow), Blather, Blessed by Isha, Bookish, Cadai Meditation, Commanding Presence, Coolheaded, Detect Artefact, Etiquette (Nobles), Fast Hands, Hardy, Lileath\'s Blessing 3, High Magic, Iron Will, Magical Sense, Night Vision, Petty Magic, Read/Write, Savant (Law, Magic), Savvy, Second Sight, Sixth Sense, Speedreader, Strong Swimmer, Suave, War Wizard',
    'Petty Spells: Bless Arrow, Calm, Green Finger, Identify Disease, Protection from Rain, Purify Water, Remove Dirt, Reveal Magic',
    'Lore of Beasts: Amber Talons, Beast Master, Beast Tongue, Flock of Doom',
    'Lore of Death: Sanctify, Scythe of Shyish, Soul Vortex, Steal Life',
    'Lore of Fire: Aqshy\'s Aegis, Blast (Fire), Cauterise, Crown of Flame, Firewall, Flaming Sword of Rhuin, Purge',
    'Lore of Heavens: Blast (Heavens), Bolt (Heavens), Cerulean Shield, Comet of Casandora, Starcrossed, The First Portent of Amul',
    'Lore of Metal: Aethyric Armour (Metal), Aethyric Arms (Metal), Enchant Weapon, Fool\'s Gold, Glittering Robe',
    'Lore of Life: Barkskin, Bridge (Life), Earthblood, Earthpool, Flight (Life), Forest of Thorns, Lie of the Land, Lifebloom, Regenerate',
    'Lore of Light: Banishment, Blinding Light, Clarity of Thought, Healing Light, Speed of Thought',
    'Lore of Shadows: Doppelganger, Illusion, Mindslip, Shadowsteed, Shadowstep',
    'High Magic: Coruscation of Finreir, Curse of Arrow Attraction, Deadlock, Drain Magic, Glamour of Teclis, Soul Quench, Tempest',
    'Magic of Hoeth: Arcane Insight, Divine Stylus, Enlightenment, Psychic Sending, The Primary Words',
    'Trappings: Elaborate Staff, Imposing Ledger, Robes of Office'
  ],
  // Archives of the Empire (L01) p. 77 : Erzbet Wegener, les rubriques « Skills » et « Talents » sont de la prose (aucune Compétence ni aucun Talent utilisable
  // dans son état actuel) ; seules les rubriques réelles sont gardées. La première ligne de caractéristiques est son état actuel.
  'L01:77:0': [
    'Traits: Immunity to Psychology',
    'Trappings: Ragged Clothing'
  ],
  // Lords of Stone and Steel (L16) p. 28 : Zylra Kraggsdottir.
  'L16:28:0': [
    'Traits: Armour (Leather Apron) 1 (5), Ranged (Blunderbuss) (12) +8 (Blast 4, Dangerous, Reload 2), Weapon (Dwarf Warhammer) +7 (Pummel)',
    'Skills: Charm 48, Climb 40, Consume Alcohol 58, Cool 48, Drive 41, Dodge 41, Entertain (Storytelling) 43, Gamble 51, Gossip 53, Haggle 48, Language (Khazalid) 46, Melee (Basic) 44, Ranged (Blackpowder) 42, Trade (Brewer) 45',
    'Talents: Gregarious, Magic Resistance, Night Vision, Read/Write, Strong-minded, Sturdy',
    'Trappings: Blunderbuss with powder and ammunition for 10 shots, Cloak, Clothing, Dagger, Hammer, Hat, Leather Apron, Pouch'
  ],
  // Winds of Magic (L17) p. 133 : Sergov Pfeiffer, parenthèse de « Lore » oubliée par le livre, rétablie (E-D23).
  'L17:133:0': [
    'Traits: Weapon (Sword) +7, Weapon (Staff) +7',
    'Skills: Channelling (Aqshy) 50, Charm 44, Cool 45, Dodge 41, Evaluate 58, Gossip 40, Haggle 39, Intimidate 37, Intuition 42, Language (Battle 63, Magick 68, Wastelander 63), Leadership 39, Lore (Magic 58, Reikland 55, Warfare 52), Melee (Basic 45, Polearm 46), Perception 42',
    "Talents: Aethyric Attunement, Arcane Magic (Lore of Fire), Detect Artefact, Doomed (Beseech our divine lord, or be o'errun by the horde), Fast Hands, Petty Magic, Read/Write, Savvy, Second Sight, Sixth Sense",
    'Spells: Lore of Fire: Blast, Comfort, Crown of Flame, Distracting, Fearsome, Firewall',
    'Petty: Dazzle, Dart, Magic Flame, Shock, Sly Hands',
    "Trappings: Grimoire, Magical Licence, Staff, Wizard's Robes"
  ],
  // Winds of Magic (L17) p. 210 : Egrimm van Horstmann, lettres parasites de l'extraction en colonnes (« Lore r », « Corruption y ») retirées (E-D23).
  'L17:210:0': [
    "Traits: Afraid (Snakes), Armour 6 (12), Corruption (Moderate), Distracting, Ward (9+), Weapon (Chaos Runeblade) +10 Skills: Animal Care 87, Athletics 85, Bribery 60, Channelling (Dhar 115, Hysh 95), Charm 55, Consume Alcohol 72, Cool 105, Dodge 80, Endurance 82, Entertain (Acting 65, Singing 65), Evaluate 97, Gossip 60, Intimidate 64, Intuition 98, Language (Classical 97, Dark Tongue 97, Magick 117), Leadership 65, Lore (Altdorf 87, Daemonology 97, Dark Magic 97, Magic 107, Nehekhara 87, Tzeentch 99, Warfare 87), Melee (Basic 82, Polearm 72), Perception 88, Pick Lock 78, Research 97, Ride (Dragon 90, Horse 80), Sleight of Hand 78, Stealth (Rural) 80 Talents: Aethyric Attunement, Animal Affinity, Arcane Lore (Daemonology, Lore of Light), Cat-tongued, Chaos Magic (Tzeentch), Combat Aware, Commanding Presence, Detect Artefact, Doomed (`A skein of fate is woven through your life, winding like a serpent. Understand it or face damnation.'), Fast Hands, Frightening, Impassioned Zeal, Instinctive Diction, Iron Will, Lightning Reflexes, Luck 3, Magical Sense, Menacing, Nimble Fingered, Petty Magic, Read/Write, Savant (Tzeentch), Savvy, Second Sight, Sixth Sense, Strike Mighty Blow, Strong-minded, Tower of Memories, Very Resilient, War Wizard, Wilful Corruption Spells: Petty Magic Spells: Dart, Drain, Eavesdrop, Open Lock, Sounds, Warning Arcane Spells: Bolt, Blast, Corrosive Blood, Distracting, Entangle, Flight, Manifest Lesser Daemon, Octagram, Teleport, Ward Lore of Daemonology Spells: Detect Daemon, Manifest Lesser Daemon, Octagram Lore of Light Spells: Abulla's Snare, Assault of Stone, Banishment, Blinding Light, Driving Intent, Eyes of Volans, Hands of Karkora, Net of Amyntok, Speed of Thought, Time Amok Lore of Tzeentch Spells: Bolt of Change, Boon of Tzeentch, Blue Fire of Tzeentch, Curse of Tzeentch, The Flickering Flames of Fickle Fate, Mindfire, Pink Fire of Tzeentch, Transformation of Tzeentch, Treason of Tzeentch, Tzeentch's Firestorm, Tzeentch's Golden Aura, Sense the Skein, Word of Tzeentch Trappings: Chaos Armour (cannot be removed), Chaos Runeblade (+SB+5, Damaging, Hack, Magical, Penetrating, Unbreakable), The Cloak of Golden Glamour, Grimoire of Dark Magicks, Skull of Katam, Talisman of Tzeentch Mental Corruption: Hollow Heart\r"
  ],
  // Altdorf (L21) p. 22 : Murderous Altdorfer, le Trait est dans la prose (« Ils sont Frenzied ») ; ni Compétence ni Talent, pas d'armure.
  'L21:22:1': [
    'Traits: Frenzy'
  ],
  // Altdorf (L21) p. 42 : Vanguard Soldier, « Sword +7 » passe à la ligne suivante et les lignes « Optional: » (compétences, talents sous l'intitulé « Traits: », équipement) étaient lues comme des Traits facultatifs.
  'L21:42:2': [
    'Traits: Armour (Leather) 1, Ranged (Bow) +6, Sword +7',
    'Skills: Athletics 41, Charm Animal 35, Climb 35, Cool 38, Endurance 44, Gossip 31, Haggle 35, Lore (Ostland) 36, Melee (Basic) 48, Navigation 45, Outdoor Survival 36, Perception 47, Ranged (Bow) 60, Stealth (Rural) 45, Track 44',
    'Talents: Combat Aware, Strider (Highlands)',
    'Trappings: Sword, Bow, Uniform, Grey surcoat, Cloak'
  ],
  // Altdorf (L21) p. 84 : Ulfhednar the Destroyer, colonne de gauche : les rubriques Skills, Talents et Trappings sont séparées des Traits par la note à astérisque.
  'L21:84:2': [
    'Traits: Armoured 5, Clever, Champion, Fast, Mutation (Elastic Arms*), Tough, Weapon +8',
    'Skills: Athletics 80, Charm 35, Consume Alcohol 65, Dodge 70, Endurance 65, Gossip 35, Intimidate 65, Language (Magick) 65, Leadership 35, Melee (Basic) 70, Perception 70, Stealth (Rural) 75',
    'Talents: Furious Assault, Menacing, Strike Mighty Blow',
    'Trappings: Chaos Armour (cannot be removed) decorated with the skin of a dire wolf, Hand Axe'
  ],
  // Le Rat cornu (L22) p. 77 : Blightking, dernier objet « A Thirst for Battle and the Diseased End of All Things » et paragraphe de la colonne (« The Blightkings enjoy… ») collé à la liste ; « Two- Handed » césure du livre.
  'L22:77:0': [
    'Traits: Armoured 6, Shield 2*, Belligerent, Champion, Corruption (Moderate), Disease (Nurgle\'s Rot), Weapon (Sword +10, Great Axe +12)',
    'Talents: Hardy 2, Strike Mighty Blow 2',
    'Skills: Athletics 40, Melee (Basic 80, Two-Handed 80, Parry 80), Perception 60',
    'Trappings: Putrid Great Axe, A Pair of Swords that Occassionaly Laugh, Shield Bearing the Skulls of a Dozen Slain Warriors, Cursed Plate Bedecked with Tributes to Nurgle, A Thirst for Battle and the Diseased End of All Things'
  ],
  // Le Rat cornu (L22) p. 78 : Behram Gundarson, « Tunnel Rat » est imprimé parmi les Traits mais c'est un talent (comme chez Martina Kurtz, p. 103).
  'L22:78:0': [
    'Traits: Animosity (Elves), Hatred (Greenskins, Skaven), Night Vision, Prejudice (Elves), Tough, Weapon (Hand Weapon) +9',
    'Skills: Climb 43, Consume Alcohol 46, Cool 55, Dodge 42, Endurance 52, Intuition 40, Leadership 55, Lore (Skaven) 43, Melee (Basic) 65, Perception 45, Ranged (Crossbow) 35, Track 40',
    'Talents: Enclosed Fighter, Fearless (Everything), Frenzy, Slayer, Strike Mighty Blow, Tunnel Rat',
    'Trappings: Armour, Helmet, Shield, Axe (Hand Weapon), Crossbow and 10 bolts'
  ],
  // Le Rat cornu (L22) p. 103 : Wilhelm Koch, la ligne « Mental Corruption: » (Traits propres de corruption) précédait Trappings et coupait la liste ; gardée comme Trait Mental Corruption.
  'L22:103:1': [
    'Traits: Armour 1, Mental Corruption (Erratic Fantasist, Suspicious Mind), Weapon (Pick) +7',
    'Skills: Cool 32, Endurance 55, Haggle 42, Intuition 44, Lore (Middle Mountains) 42, Melee (Basic 36, Two-Handed 36), Outdoor Survival 42, Perception 44',
    'Talents: Doomed (Lose thyself slowly, piece by piece)',
    'Trappings: Roughspun Robes over Leather Jack, Dagger, Pick'
  ],
  // Enemy in Shadows Companion (L23) p. 49 : Wolmar Rotte, les Trappings suivent la prose de la colonne voisine (« Rotten to the Core ») et étaient perdus.
  'L23:49:0': [
    'Traits: Corruption (Minor), Mutation (Thrill Hunter), Weapon (Fists) +3',
    'Skills: Bribery 54, Consume Alcohol 35, Charm 59, Cool 58, Entertain (Acting) 59, Entertain (Storytelling) 54, Evaluate 50, Gamble 50, Gossip 54, Haggle 54, Intuition 46, Perception 46, Sleight of Hand 54',
    'Talents: Blather, Cardsharp, Criminal, Diceman, Fast Hands, Luck 3',
    'Trappings: Decks of Cards (marked and unmarked), Dice (loaded and unloaded), Forged Documents, 2 Sets of Clothing with Secret Pockets and Pouches, 1 Set of Quality Clothing, 10d10 brass pennies'
  ],
  // Enemy in Shadows Companion (L23) p. 60 : Albert Pförtner, Talents et Trappings imprimés plus bas dans la colonne, après la prose « Labourers ».
  'L23:60:0': [
    'Traits: Armour (Leather Jerkin) 1, Hatred (Rival Gangers), Weapon (Boat Hook) +9',
    'Skills: Athletics 28, Bribery 46, Climb 60, Consume Alcohol 58, Dodge 32, Endurance 58, Gossip 46, Intimidate 60, Perception 51, Melee (Basic) 58, Stealth (Urban) 28',
    'Talents: Criminal, Dirty Fighting 2, Strong Back, Sturdy, Tenacious, Very Strong',
    'Trappings: Leather Gloves, Gang Colours, Guild License, Leather Jerkin, Pipe and Tobacco, Porter Cap, Tools, 1d10 silver shillings'
  ],
  // Enemy in Shadows Companion (L23) p. 102 : Annalisa Kessler, la ligne Trappings est séparée des Talents par le titre « REWARDS ».
  'L23:102:0': [
    'Traits: Armour (Leather Jerkin) 1, Prejudice (The Rich), Ranged (Bow) (60) +7, Weapon (Sword) +8',
    'Skills: Athletics 49, Consume Alcohol 51, Cool 47, Dodge 44, Endurance 51, Gamble 39, Heal 44, Intimidate 50, Intuition 57, Leadership 48, Lore (Local) 44, Melee (Basic) 64, Perception 57, Outdoor Survival 44, Ranged (Bow) 73, Stealth (Rural) 49',
    'Talents: Combat Aware, Marksman, Rapid Reload',
    'Trappings: Black Hood, Bow and 20 Black Arrows, Leather Jerkin, Sword, 8d10 brass pennies'
  ],
  // Enemy in Shadows Companion (L23) p. 104 : Urzo, Animalistic Legs ouvre la liste des Traits (gardé dans specialRules, TRAITS_KEPT_AS_RULES).
  'L23:106:0': [
    'Traits: Animalistic Legs, Armour 3, Frenzy, Horns +9, Size (Large), Weapon (Claws) +4'
  ],
  // Enemy in Shadows Companion (L23) p. 111 : « Granny » Haller, Trappings séparés de la liste des Talents par la prose de la colonne.
  'L23:113:0': [
    'Traits: Weapon (Fists) +2',
    'Skills: Animal Care 42, Bribery 63, Charm 73, Charm Animal 52, Cool 57, Consume Alcohol 52, Dodge 49, Endurance 47, Entertain (Acting) 73, Entertain (Fortune Telling) 68, Entertain (Storytelling) 68, Gamble 37, Gossip 73, Haggle 73, Intuition 64, Lore (Astrology) 42, Outdoor Survival 37, Perception 64, Sleight of Hand 55, Stealth (Rural) 49',
    'Talents: Blather, Cat-tongued, Rover, Seasoned Traveller, Suave, Well-prepared',
    'Trappings: Assorted Powders, Potions and Charms, all fake (at the GM\'s discretion, some may have interesting but unplanned effects), Necklace of Chicken Bones, Ragged Clothes, Trade Tools (Cook), 2d10 silver shillings'
  ],
  // Ennemi Intérieur, Une nuit agitée (L24) p. 19 : Josef Aufwiegler, la ligne imprimée « Talents: Weapon (Fist) +3 » est une arme (coquille du livre, comme « Weapons (Spear) +8 »).
  'L24:20:1': [
    'Traits: Weapon (Fist) +3'
  ],
  // Sea Wardens of Cothique (L14) p. 83 : Flamespyre Phoenix, le Trait « Vulnerable to Cold » passe à la ligne et la ligne « Talents: Acute Sense (Vision) » était perdue.
  'L14:83:0': [
    'Traits: Attuned to Magic, Bite +7, Flight 100, Magical, Phoenix Reborn, Size (Large), Territorial, Vulnerable to Cold, Wake of Fire, Ward 8+, Weapon (Claws) +9',
    'Talents: Acute Sense (Vision)'
  ],
  // Van Hal's Stone (L10) p. 51 : Graug the Terrible, la liste des Traits est entrecoupée par la prose de la colonne voisine.
  'L10:51:1': [
    'Traits',
    'Armour +4 AP All Locations, Construct, Flight (100), Hatred (Dwarfs), Night Vision, Size (Enormous), Tail +9, Territorial, Trained (Mount), Undead, Weapon +10'
  ],
  // Van Hal's Stone (L10) p. 83 : Gretchen Beirne, les étiquettes (colonne de droite) sont réordonnées par l'extraction : relues sur la page.
  'L10:83:0': [
    'Attacks', 'Sickle (28/+6)',
    'Armour', 'Toughness Bonus: 2',
    'Skills', 'Animal Care 47, Channelling (Magick) 43, Cool 47, Intuition 40, Language (Magick) 47, Language (Reikspiel) 72, Lore (Folklore) 47, Lore (Herbs) 47, Outdoor Survival 47, Trade (Herbalist) 44',
    'Traits and Talents', 'Arcane Magic (Hedgecraft), Catfall, Petty Magic, Pure Soul, Second Sight',
    'Spells', 'Petty Magic: Animal Friend, Marsh Lights, Warning Lore of Hedgecraft: Goodwill, Part the Branches, Protective Charm',
    'Trappings', 'Backpack, Hand Weapon (Sickle), 1d10 Lucky Charms, Quarterstaff, Antitoxin Kit, Healing Poultice, Trade Tools (Herbalist)'
  ],
  // Van Hal's Stone (L10) p. 89 : Ranolf Quickfingers, même mise en page.
  'L10:89:0': [
    'Attacks', 'Crowbar (32/+7)',
    'Armour', 'Toughness Bonus: 3',
    'Skills', 'Climb 39, Dodge 33, Evaluate 32, Haggle 35, Intimidate 39, Language (Reikspiel) 60, Melee (Basic) 30, Perception 36, Pick Lock 58, Sleight of Hand 58, Stealth (Urban) 33',
    'Traits and Talents', 'Fast Hands, Flee!, Mutation (Distended Digits), Supportive',
    'Trappings', 'Crowbar, Leather Jerkin, Sack, Cloth Mask, Leather Gloves'
  ],
  // Altdorf (L20) p. 132 : le Brochet de Reikerbahn, la ligne de Compétences est collée aux Corruptions mentales, que le modèle n'accueille pas ; seule la Compétence est rétablie (E-D26).
  'L20:132:0': [
    'Traits: Amphibious, Armour 2, Belligerent, Bite +8, Big, Cold-blooded, Dark Vision, Frenzy, Hatred (Fishermen), Hungry, Size (Large), Tail Attack +7, Territorial',
    'Skills: Melee (Unarmed) 68'
  ],
  // The Great Hospice (L01) p. 80 : Richter Kless, la colonne de gauche (prose) s'intercale dans la ligne de Compétences (« Lore (Chaos) 79 » coupé) et masque Traits, Talents et Équipement.
  'L01:80:0': [
    'Traits: Mental Corruption (Chaotic Dreams)',
    'Skills: Intuition 41, Language (Classical) 47, Language (Dark Tongue of Chaos) 42, Language (Gospodarinyi) 35, Lore (Theology) 45, Lore (Chaos) 79, Perception 43, Research 56',
    'Talents: Bookish, Etiquette (Scholars), Linguistics, Magnum Opus (Liber Chaotica), Read/Write, Savant (Chaos), Savvy, Speedreader, Tower of Memories',
    'Trappings: Ragged Clothes'
  ],
  // L11 p. 15 : Forest Goblin Shaman, « Skills: Pray 60 » est suivi de « Spider-god Blessings: … » (liste de bénédictions, pas de compétences).
  'L11:15:1': [
    'Traits: Animosity (Greenskins), Arboreal, Blessed (Spider-god), Fear 1, Immunity (Poison), Miracles (Spider-god), Night Vision, Painless, Venom, Weapon (Spider-god Staff) +8, Not All There: toxin-induced haze',
    'Skills: Pray 60'
  ],
  // Hirelings (L13) p. 114 : Porter, « Gamble 36 » et « Gossip 46 » étaient perdus (colonne du Scribe voisin, qui a aussi Gamble et Gossip, intercalée).
  'L13:114:2': [
    'Traits: Armour 1, Weapon (Sword) +8',
    'Skills: Athletics 41, Bribery 41, Charm 41, Climb 51, Consume Alcohol 56, Cool 34, Dodge 41, Endurance 56, Entertain (Storytelling) 36, Evaluate 34, Gamble 36, Gossip 46, Haggle 39, Intimidate 46, Melee (Basic) 56, Perception 46, Stealth 36, Swim 51',
    'Talents: Doomed, Strong Back, Sturdy, Suave, Tenacious, Very Resilient, Very Strong',
    'Trappings: Sword, Leather Gloves, Guild License, Leather Jerkin, Pipe and Tobacco, Porter\'s Cap. Cloak, Clothing, Dagger, Pouch, Sling Bag containing a Flask of Spirits'
  ],
  // Dwarfs (L16) p. 31 : Helga Vikramsdottir, deux mots de la prose voisine (« is a ») s'intercalent dans « Secret Signs (Guilder)40 ».
  'L16:31:0': [
    'Traits: Armour 2 (7), Ranged (Dwarf Pistol) (20) +10 (Impale, Penetrating, Pistol, Reload 1), Weapon (Hammer) +8 (Pummel)',
    'Skills: Art (Engraving) 62, Consume Alcohol 54, Cool 57, Endurance 58, Entertain (Storytelling) 31, Evaluate 37, Gossip 30, Haggle 36, Intimidate 42, Intuition 38, Language (Guilder) 42, Leadership 31, Lore (Geology 39, Karak Norn 38, Metallurgy 44), Melee (Basic) 45, Perception 38, Ranged (Blackpowder) 55, Research 36, Secret Signs (Guilder) 40, Trade (Smith) 66',
    'Talents: Artistic, Craftsman (Smith), Etiquette (Guilder), Magic Resistance, Night Vision, Nimble Fingered, Read/Write, Strong Back, Tinker, Very Strong',
    'Trappings: Cloak, Clothing, Dagger, Hammer, Mail Shirt, Pistol, Pouch, Trade Tools (Smith)'
  ],
  // Tribes and Tribulations (L12) p. 108 : Sog'Kog, « Trappings » (« Collection of the heads of his favourite victims, Two-Handed Stone Axe ») était perdu, le numéro de page collé au dernier objet.
  'L12:108:0': [
    'Traits: Armour 2 (7), Bite +8, Corrosive Blood, Corruption (Minor), Die Hard, Horns +8, Infected, Regenerate, Size (Enormous), Stupid, 2 Tentacles +6, Vomit, Weapon (Two-Handed Stone Axe) +12',
    'Trappings: Collection of the heads of his favourite victims, Two-Handed Stone Axe'
  ]
});
