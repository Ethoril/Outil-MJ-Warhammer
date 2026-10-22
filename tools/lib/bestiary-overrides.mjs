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

/**
 * Corps de bloc relus sur la page quand la mise en page (interligne double) empêche de suivre les lignes d'un bloc. Clé : « livre:page:rang ».
 * Le texte est celui du livre, recopié ligne à ligne.
 */
export const BODY_OVERRIDES = Object.freeze({
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
  // Altdorf (L20) p. 132 : le Brochet de Reikerbahn, la ligne de Compétences est collée aux Corruptions mentales, que le modèle n'accueille pas ; seule la Compétence est rétablie (E-D26).
  'L20:132:0': [
    'Traits: Amphibious, Armour 2, Belligerent, Bite +8, Big, Cold-blooded, Dark Vision, Frenzy, Hatred (Fishermen), Hungry, Size (Large), Tail Attack +7, Territorial',
    'Skills: Melee (Unarmed) 68'
  ]
});
