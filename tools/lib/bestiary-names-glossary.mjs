/**
 * Proposition de nom français pour un profil sans équivalent dans le livre de base FR : traduction mot à mot des intitulés de métier,
 * d'espèce et de créature, les noms propres restant tels quels. Toujours marquée « proposition » (relue par le MJ en sélecteurs groupés).
 */
const SPECIES = { human: 'humain', dwarf: 'nain', halfling: 'halfling', elf: 'elfe', ogre: 'ogre', skaven: 'skaven', gnome: 'gnome', orc: 'orque', goblin: 'gobelin', 'dark elf': 'elfe noir', 'high elf': 'haut elfe', 'wood elf': 'elfe sylvain', slann: 'slann', saurus: 'saurus', skink: 'skink', 'wizard': 'sorcier' };
const PHRASES = {
  'honour guard': 'garde d’honneur', 'master wizard': 'maître sorcier', 'high priest': 'grand prêtre', 'high priestess': 'grande prêtresse', 'village elder': 'ancien du village',
  'town councillor': 'conseiller municipal', 'con artist': 'escroc', 'gang boss': 'chef de bande', 'rat catcher': 'ratier', 'watch captain': 'capitaine du guet', 'watch sergeant': 'sergent du guet',
  'shipsword master': 'maître d’armes de navire', 'pirate captain': 'capitaine pirate', 'river trolls': 'trolls des rivières', 'river troll': 'troll des rivières', 'giant rat': 'rat géant', 'giant spider': 'araignée géante',
  'night goblin': 'gobelin nocturne', 'night goblins': 'gobelins nocturnes', 'forest goblin': 'gobelin des forêts', 'cave squig': 'squig des cavernes', 'dire wolf': 'loup funeste', 'great wolf': 'grand loup',
  'great eagle': 'aigle géant', 'war lion': 'lion de guerre', 'wild cat': 'chat sauvage', 'great stag': 'grand cerf', 'dark pegasi': 'pégases noirs', 'sea dragon': 'dragon des mers', 'shard dragon': 'dragon de tessons',
  'forest dragons': 'dragons des forêts', 'clan skryre': 'clan Skryre', 'clan moulder': 'clan Moulder', 'clan eshin': 'clan Eshin', 'clan mors': 'clan Mors', 'yellow fang': 'Croc-Jaune', 'cold one': 'sang-froid',
  'master merchant': 'maître marchand', 'grand vizier': 'grand vizir', 'flying death skulls': 'crânes volants de la mort', 'zombie champion': 'champion zombie', 'headless skeletons': 'squelettes sans tête'
};
const WORDS = {
  the: '', of: 'de', and: 'et', former: 'ancien', master: 'maître', lord: 'seigneur', noble: 'noble', magnate: 'magnat', priest: 'prêtre', priestess: 'prêtresse', captain: 'capitaine', artisan: 'artisan',
  wizard: 'sorcier', witch: 'sorcière', sergeant: 'sergent', chief: 'chef', merchant: 'marchand', soldier: 'soldat', officer: 'officier', savage: 'sauvage', outlaw: 'hors-la-loi', hunter: 'chasseur',
  shaman: 'chamane', river: 'rivière', cultist: 'cultiste', cultists: 'cultistes', scion: 'rejeton', lowborn: 'bas-né', warlord: 'seigneur de guerre', giant: 'géant', hag: 'mégère', brother: 'frère', guard: 'garde',
  villager: 'villageois', skirmisher: 'tirailleur', champion: 'champion', night: 'nocturne', cat: 'chat', typical: 'typique', professor: 'professeur', black: 'noir', charlatan: 'charlatan', gang: 'bande',
  boss: 'chef', father: 'père', vampire: 'vampire', prince: 'prince', scout: 'éclaireur', imperial: 'impérial', hobgoblin: 'hobgobelin', slayer: 'tueur', clanrat: 'guerrier des clans', spider: 'araignée',
  moulder: 'Moulder', grey: 'gris', dragon: 'dragon', knight: 'chevalier', warlock: 'sorcier-guerrier', engineer: 'ingénieur', nun: 'nonne', attendant: 'serviteur', seer: 'voyant', artist: 'artiste',
  entertainer: 'artiste', bargeswain: 'maître de barge', racketeer: 'racketteur', apprentice: 'apprenti', agent: 'agent', fence: 'receleur', watch: 'guet', warrior: 'guerrier', elite: 'élite', assassin: 'assassin',
  servant: 'serviteur', servants: 'serviteurs', spymaster: 'maître espion', count: 'comte', horror: 'horreur', old: 'vieux', horse: 'cheval', plague: 'peste', elemental: 'élémentaire', flying: 'volant', skulls: 'crânes',
  dog: 'chien', boat: 'bateau', pilot: 'pilote', spy: 'espion', eagle: 'aigle', war: 'guerre', leviathan: 'léviathan', stevedore: 'docker', foreman: 'contremaître', king: 'roi', bounty: 'prime', zombie: 'zombie',
  chancellor: 'chancelier', arch: 'archi', grand: 'grand', city: 'ville', sea: 'mer', reaver: 'pillard', sorceress: 'sorcière', beastmaster: 'maître des bêtes', sorcerer: 'sorcier', red: 'rouge', heavy: 'lourd',
  warhorse: 'cheval de guerre', white: 'blanc', keeper: 'gardien', incarnate: 'incarné', familiar: 'familier', envoy: 'envoyé', pedlar: 'colporteur', burglar: 'cambrioleur', shipsword: 'maître d’armes', animated: 'animé',
  carcass: 'carcasse', guards: 'gardes', crown: 'couronne', ghost: 'fantôme', thief: 'voleur', thugs: 'voyous', brigand: 'brigand', hand: 'main', boatman: 'batelier', troll: 'troll', wolf: 'loup', great: 'grand',
  forest: 'forêt', death: 'mort', highborn: 'haut-né', basic: 'de base', common: 'commun', carrion: 'charognard', beast: 'bête', beasts: 'bêtes', physician: 'médecin', apothecary: 'apothicaire', beggar: 'mendiant',
  grave: 'tombe', bawd: 'maquerelle', house: 'maison', monk: 'moine', monks: 'moines', procurer: 'procureur', advisor: 'conseiller', changeling: 'changelin', village: 'village', headless: 'sans tête', honour: 'honneur',
  child: 'enfant', baron: 'baron', detective: 'détective', burgomeister: 'bourgmestre', furniture: 'meuble', leader: 'meneur', vanguard: 'avant-garde', pit: 'fosse', duellist: 'duelliste', beastman: 'homme-bête',
  commander: 'commandant', turntail: 'lâche', gutter: 'caniveau', runner: 'coureur', draught: 'de trait', toll: 'péage', road: 'route', bodyguards: 'gardes du corps', coachmen: 'cochers', barrister: 'avocat',
  watchmen: 'miliciens', spies: 'espions', student: 'étudiant', young: 'jeune', guildmaster: 'maître de guilde', trader: 'négociant', wrecker: 'naufrageur', pirate: 'pirate', sailor: 'marin', landsman: 'novice',
  mercenary: 'mercenaire', seasoned: 'aguerri', townswoman: 'citadine', townsman: 'citadin', sentry: 'sentinelle', veteran: 'vétéran', second: 'second', first: 'premier', herald: 'héraut', hungry: 'affamé', snake: 'serpent',
  bat: 'chauve-souris', cold: 'froid', wilderness: 'étendue sauvage', supreme: 'suprême', entourage: 'suite', elector: 'électeur', crypt: 'crypte', good: 'bon', stone: 'pierre', hulking: 'massif', riding: 'de selle',
  arms: 'armes', bright: 'vif', rogue: 'voyou', salt: 'sel', phoenix: 'phénix', daemon: 'démon', who: '', self: 'auto', half: 'demi', hal: 'Hal', mountain: 'montagne', hawk: 'faucon', horned: 'cornu', lion: 'lion', fire: 'feu'
};

const cap = text => text.charAt(0).toUpperCase() + text.slice(1);

/** « Human Honour Guard (Silver 3) » → « Garde d’honneur humain (Argent 3) » ; les noms propres sont conservés. */
export function proposeFrenchName(name) {
  const status = /\((Brass|Silver|Gold)\s*(\d+\*?)\)/i.exec(name);
  const statusFr = status ? ` (${{ brass: 'Bronze', silver: 'Argent', gold: 'Or' }[status[1].toLowerCase()]} ${status[2]})` : '';
  const bare = name.replace(/\((Brass|Silver|Gold)\s*\d+\*?\)/i, '').replace(/\s+/g, ' ').trim();
  const parts = bare.split(/\s+—\s+/);
  const translate = text => {
    let words = text.split(/\s+/).filter(Boolean);
    const out = [];
    let species = null;
    const lower = text.toLowerCase();
    for (const [phrase, fr] of Object.entries(PHRASES)) if (lower === phrase) return cap(fr);
    for (let i = 0; i < words.length; i += 1) {
      const two = `${words[i]} ${words[i + 1] || ''}`.toLowerCase().trim();
      const three = `${words[i]} ${words[i + 1] || ''} ${words[i + 2] || ''}`.toLowerCase().trim();
      if (PHRASES[three]) { out.push(PHRASES[three]); i += 2; continue; }
      if (PHRASES[two]) { out.push(PHRASES[two]); i += 1; continue; }
      if (SPECIES[two] && i === 0) { species = SPECIES[two]; i += 1; continue; }
      const word = words[i].toLowerCase();
      if (i === 0 && SPECIES[word] && words.length > 1 && word !== 'wizard') { species = SPECIES[word]; continue; }
      if (Object.hasOwn(WORDS, word) && /^[a-z]/.test(words[i]) || (Object.hasOwn(WORDS, word) && i > 0 && /^[A-Z][a-z]+$/.test(words[i]) && !/^[A-Z]/.test(words[i - 1] || ''))) { if (WORDS[word]) out.push(WORDS[word]); continue; }
      if (Object.hasOwn(WORDS, word) && words.length <= 3) { if (WORDS[word]) out.push(WORDS[word]); continue; }
      out.push(words[i]);
    }
    const base = out.join(' ').replace(/\bde ([aeiouyéèh])/g, 'd’$1').replace(/\s+/g, ' ').trim();
    return cap(species ? `${base} ${species}`.trim() : base);
  };
  const TITLES = { Sergeant: 'Sergent', Captain: 'Capitaine', Brother: 'Frère', Father: 'Père', Count: 'Comte', Baron: 'Baron', Professor: 'Professeur', Prince: 'Prince', Lord: 'Seigneur', Doktor: 'Docteur', Magister: 'Magister', Grand: 'Grand' };
  parts[0] = parts[0].replace(/^(Sergeant|Captain|Brother|Father|Count|Baron|Professor|Prince|Lord|Doktor)\b/, found => TITLES[found]);
  const [first, ...rest] = parts;
  const looksLikeName = /^[A-Z][a-zà-ÿ’'`-]+(?:\s+(?:von|van|de|zu|[A-Z][a-zà-ÿ’'`-]+))+$/.test(first) && rest.length;
  const head = looksLikeName ? first : translate(first);
  return `${[head, ...rest.map(translate)].join(' — ')}${statusFr}`;
}
