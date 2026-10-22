/**
 * Glossaire anglais → français des compétences imprimées dans les profils : groupes (noms du livre de base FR) et spécialisations
 * courantes. Une spécialisation absente reste en anglais (signalée au rapport), jamais inventée.
 */
export const SKILL_GROUP_FR = Object.freeze({
  'Animal Care': 'Soin aux animaux', 'Animal Training': 'Dressage', Art: 'Art', Athletics: 'Athlétisme', Bribery: 'Subornation',
  Channelling: 'Focalisation', Charm: 'Charme', 'Charm Animal': 'Emprise sur les animaux', Climb: 'Escalade', 'Consume Alcohol': 'Résistance à l’alcool',
  Cool: 'Calme', Dodge: 'Esquive', Drive: 'Conduite d’attelage', Endurance: 'Résistance', Entertain: 'Divertissement', Evaluate: 'Évaluation',
  Gamble: 'Pari', Gossip: 'Ragot', Haggle: 'Marchandage', Heal: 'Guérison', Intimidate: 'Intimidation', Intuition: 'Intuition', Language: 'Langue',
  Leadership: 'Commandement', Lore: 'Savoir', Melee: 'Corps à corps', Navigation: 'Orientation', 'Outdoor Survival': 'Survie en extérieur',
  Perception: 'Perception', Perform: 'Représentation', 'Pick Lock': 'Crochetage', Play: 'Musicien', Pray: 'Prière', Ranged: 'Projectiles',
  Research: 'Recherche', Ride: 'Chevaucher', Row: 'Ramer', Sail: 'Voile', 'Secret Signs': 'Signes secrets', 'Set Trap': 'Piégeage',
  'Sleight of Hand': 'Escamotage', Stealth: 'Discrétion', Swim: 'Natation', Track: 'Pistage', Trade: 'Métier', Hypnotism: 'Hypnotisme',
  Psychometry: 'Psychométrie', Augury: 'Augure', 'Lip Reading': 'Lire sur les lèvres'
});

/** Variantes d'orthographe ou de pluriel rencontrées dans les livres, ramenées au nom de groupe canonique. */
export const SKILL_GROUP_ALIASES = Object.freeze({ Intimidation: 'Intimidate', Athlethics: 'Athletics', Tracking: 'Track', Bribe: 'Bribery', Brawl: 'Melee' });

const BASE = { Basic: 'Base', Brawling: 'Bagarre', Brawl: 'Bagarre', Polearm: 'Armes d’hast', 'Pole-arm': 'Armes d’hast', 'Pole-Arm': 'Armes d’hast', 'Pole Arm': 'Armes d’hast', Fencing: 'Escrime', 'Two-Handed': 'Deux mains', 'Two-handed': 'Deux mains', 'Two Handed': 'Deux mains', Parry: 'Parade', Cavalry: 'Cavalerie', Flail: 'Fléau' };
export const SKILL_SPEC_FR = Object.freeze({
  Melee: BASE,
  Ranged: { Bow: 'Arc', Crossbow: 'Arbalète', Blackpowder: 'Poudre noire', Entangling: 'Entraves', Throwing: 'Jet', Thrown: 'Jet', Engineering: 'Ingénierie', Sling: 'Fronde', Explosives: 'Explosifs' },
  Entertain: { Storytelling: 'Contes', Acting: 'Acteur', Singing: 'Chant', Comedy: 'Comédie', 'Fortune Telling': 'Voyance', Speeches: 'Discours', Taunt: 'Raillerie', Prophecy: 'Prophétie' },
  Lore: { Warfare: 'Guerre', Local: 'Local', Heraldry: 'Héraldique', Magic: 'Magie', Politics: 'Politique', Theology: 'Théologie', Reikland: 'Reikland', Law: 'Loi', History: 'Histoire', Riverways: 'Voies fluviales', Metallurgy: 'Métallurgie', Chaos: 'Chaos', Science: 'Science', Geology: 'Géologie', 'Dark Magic': 'Magie noire', Skaven: 'Skavens', Medicine: 'Médecine', Dwarfs: 'Nains', Necromancy: 'Nécromancie', Anatomy: 'Anatomie', Beasts: 'Bêtes', Middenheim: 'Middenheim', Altdorf: 'Altdorf', Dragons: 'Dragons', Engineering: 'Ingénierie', Sigmar: 'Sigmar', Torture: 'Torture', Chemistry: 'Chimie', Daemonology: 'Démonologie', Ulric: 'Ulric', Nehekhara: 'Nehekhara', Undead: 'Morts-vivants', Astrology: 'Astrologie', Astronomy: 'Astronomie', Poisons: 'Poison', Herbs: 'Herbes', Giants: 'Géants', Geography: 'Géographie', Taxes: 'Taxes', Runes: 'Runes', Ranald: 'Ranald' },
  Language: { Magick: 'Magick', Classical: 'Classique', Reikspiel: 'Reikspiel', Battle: 'Bataille', 'Battle Tongue': 'Bataille', Guilder: 'Guilde', Khazalid: 'Khazalid', Bretonnian: 'Bretonnien', Tilean: 'Tiléen', Wastelander: 'Wastelander', Estalian: 'Estalien', Norse: 'Norse', Gospodarinyi: 'Gospodar', 'Dark Tongue': 'Sombre / Dark Tongue', Mootish: 'Mootish', Eltharin: 'Eltharin', Cathayan: 'Cathayen', Thief: 'Voleur', 'Thieves’ Tongue': 'Voleur', Grumbarth: 'Grumbarth', Queekish: 'Queekish' },
  Trade: { Cook: 'Cuisinier', Herbalist: 'Herboriste', Apothecary: 'Apothicaire', Engineer: 'Ingénieur', Farrier: 'Maréchal-ferrant', Vintner: 'Vigneron', Mason: 'Maçon', Carpenter: 'Charpentier', Brewer: 'Brasseur', Barber: 'Barbier', Printing: 'Imprimerie', Poisoner: 'Empoisonneur', Smith: 'Forgeron', Blacksmith: 'Forgeron', Goldsmith: 'Orfèvre', Alchemist: 'Alchimiste', Armourer: 'Armurier', Tinker: 'Bricoleur', Explosives: 'Explosifs', Boatbuilding: 'Construction de bateaux' },
  Play: { Lute: 'Luth', Drum: 'Tambour', Fife: 'Fifre', Harpsichord: 'Clavecin', Horn: 'Cor', Bagpipe: 'Cornemuse' },
  Ride: { Horse: 'Cheval', Wolf: 'Loup géant', Pegasus: 'Pégase', Griffon: 'Griffon', Manticore: 'Manticore', Dragon: 'Dragon', Spider: 'Araignée' },
  Stealth: { Urban: 'Urbaine', Rural: 'Rurale', Underground: 'Souterraine' },
  'Secret Signs': { Thief: 'Voleur', Guilder: 'Guilde', Smuggler: 'Contrebandier', Hunter: 'Chasseur', Scout: 'Éclaireur', Skaven: 'Skaven' },
  Art: { Writing: 'Écriture', Calligraphy: 'Calligraphie', Painting: 'Peinture', Engraving: 'Gravure', Cartography: 'Cartographie', Sculpture: 'Sculpture', Poetry: 'Poésie' },
  Perform: { Dance: 'Danse', Dancing: 'Danse' },
  Sail: { Longship: 'Drakkar', Cog: 'Cogue' }
});

/** Compétence anglaise imprimée → français ; `verified` faux quand la spécialisation reste anglaise. */
export function skillNameFr(name) {
  const found = /^([^(]+?)(?:\s*\((.+)\))?$/.exec(name.trim());
  if (!found) return { nameFr: name, verified: false };
  const group = SKILL_GROUP_ALIASES[found[1].trim()] || found[1].trim();
  const groupFr = SKILL_GROUP_FR[group];
  if (!groupFr) return { nameFr: name, verified: false };
  if (!found[2]) return { nameFr: groupFr, verified: true };
  const specialization = found[2].trim();
  const specFr = SKILL_SPEC_FR[group]?.[specialization];
  return specFr ? { nameFr: `${groupFr} (${specFr})`, verified: true } : { nameFr: `${groupFr} (${specialization})`, verified: false };
}

export const SKILL_GROUPS = Object.freeze(new Set([...Object.keys(SKILL_GROUP_FR), ...Object.keys(SKILL_GROUP_ALIASES)]));
