/**
 * Profils de bestiaire (données du jeu, `js/data/bestiary/<livre>.json`) : validation d'un profil et accès par livre.
 * Les valeurs sont celles du livre, imprimées telles quelles : jamais recalculées (BF, Taille et armure compris).
 */
import { activeReferential } from './creature-keywords.js';
import { cloneValue, normalizeAction, uid } from './models.js';
import { getReferenceCatalogue } from './reference-catalog.js';

export const BESTIARY_STAT_KEYS = Object.freeze(['M', 'CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
export const BESTIARY_KINDS = Object.freeze(['profile', 'template', 'pregenerated-character']);

const isInt = value => Number.isSafeInteger(value);
const isText = value => typeof value === 'string' && value.trim() !== '';

/** Liste des écarts d'un profil (vide si le profil est conforme). */
export function validateBestiaryRecord(record, referential = activeReferential()) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['profil absent'];
  if (!/^E0-P-\d{3,}$/.test(record.id || '')) errors.push('identifiant d’inventaire invalide');
  if (!/^L\d\d$/.test(record.book || '')) errors.push('livre invalide');
  if (!isInt(record.page) || record.page < 1) errors.push('page invalide');
  if (!BESTIARY_KINDS.includes(record.kind)) errors.push('genre inconnu');
  if (!isText(record.name)) errors.push('nom absent');
  if (record.kind === 'template') {
    if (!record.modifiers || typeof record.modifiers !== 'object') errors.push('modificateurs du gabarit absents');
    else for (const [key, value] of Object.entries(record.modifiers)) if (![...BESTIARY_STAT_KEYS, 'W'].includes(key) || !isInt(value)) errors.push(`modificateur ${key} invalide`);
  } else {
    if (!record.stats || typeof record.stats !== 'object') errors.push('caractéristiques absentes');
    else for (const key of BESTIARY_STAT_KEYS) {
      const value = record.stats[key];
      if (value === undefined) errors.push(`caractéristique ${key} absente (null attendu pour une case vide)`);
      else if (value !== null && (!isInt(value) || value < 0)) errors.push(`caractéristique ${key} invalide`);
    }
    // Un profil dont le livre n'imprime aucune Blessures (case W absente) le déclare par `woundsAbsent` : jamais 0 ni recalculé.
    const absent = record.woundsAbsent === true && record.wounds === null;
    if (record.kind === 'profile' && !absent && (!isInt(record.wounds) || record.wounds < 1)) errors.push('Blessures invalides');
  }
  for (const attack of record.attacks || []) {
    if (!isText(attack.name)) errors.push('attaque sans nom');
    if (!isInt(attack.damage)) errors.push(`dégâts de ${attack.name} : entier imprimé attendu`);
    if (attack.value !== undefined && !isInt(attack.value)) errors.push(`valeur de ${attack.name} invalide`);
    if (attack.count !== undefined && (!isInt(attack.count) || attack.count < 1)) errors.push(`multiplicateur de ${attack.name} invalide`);
  }
  for (const skill of record.skills || []) if (!isText(skill.name) || !isInt(skill.value)) errors.push(`compétence invalide : ${skill?.name}`);
  for (const trait of [...(record.traits || []), ...(record.optionalTraits || [])]) if (!isText(trait?.name)) errors.push('Trait sans nom');
  for (const keyword of record.keywords || []) if (!referential.terms.has(keyword)) errors.push(`mot-clé inconnu : ${keyword}`);
  const armour = record.armour;
  if (armour) for (const key of ['ap', 'printedTotal', 'toughnessBonus']) if (armour[key] !== undefined && !isInt(armour[key])) errors.push(`armure ${key} invalide`);
  return errors;
}

/** Profils d'un livre : filtre par mot-clé (descendants compris), le MJ pouvant avoir ajouté des termes au référentiel. */
export function filterBestiary(profiles, { keyword = null, text = '', kinds = null } = {}, { matches } = {}) {
  const wanted = String(text || '').trim().toLowerCase();
  return profiles.filter(profile => (!kinds || kinds.includes(profile.kind))
    && (!keyword || matches?.(profile, keyword))
    && (!wanted || [profile.name, profile.nameFr, ...(profile.skills || []).map(skill => skill.name)].some(value => String(value || '').toLowerCase().includes(wanted))));
}

/**
 * Chargement paresseux des données : l'index d'abord, un livre seulement à la demande (jamais deux fois). `fetchJson(chemin)` renvoie le
 * JSON ; un échec n'est pas mémorisé, pour permettre une nouvelle tentative.
 */
export function createBestiaryLoader(fetchJson, base = './js/data/bestiary/') {
  let indexPromise = null;
  const books = new Map();
  const once = (store, key, load) => {
    if (!store.has(key)) store.set(key, load().catch(error => { store.delete(key); throw error; }));
    return store.get(key);
  };
  const loader = {
    async index() {
      if (!indexPromise) indexPromise = Promise.resolve().then(() => fetchJson(`${base}index.json`)).catch(error => { indexPromise = null; throw error; });
      return (await indexPromise).books;
    },
    book(book) {
      return once(books, book, async () => {
        const entry = (await loader.index()).find(item => item.book === book);
        if (!entry) throw new Error(`livre de bestiaire inconnu : ${book}`);
        return (await fetchJson(`${base}${entry.file}`)).profiles;
      });
    },
    /** Profils des livres demandés, concaténés dans l'ordre demandé. */
    async load(bookIds) { return (await Promise.all(bookIds.map(book => loader.book(book)))).flat(); },
    loadedBooks() { return [...books.keys()]; }
  };
  return loader;
}

let summonLibrary = [];
/**
 * Profils disponibles aux sorts d'invocation (résolution synchrone) : l'application y inscrit le livre L06 au démarrage.
 * Pas de pile ni d'historique : la bibliothèque n'est jamais copiée dans les opérations du Store.
 */
export function registerSummonLibrary(profiles) { summonLibrary = Array.isArray(profiles) ? profiles : []; }
export function summonProfileLibrary() { return summonLibrary; }

export const BESTIARY_FREE_ATTACK_KEY = 'freeAttack';

const ARMOUR_ZONES = Object.freeze({ head: /\bhead\b/i, body: /\bbody\b/i, arms: /\barms?\b/i, legs: /\blegs?\b/i });

// Zones nommées par un `detail` (« Headband », « Chest », « Rear Legs » comprises).
const DETAIL_ZONES = Object.freeze({ head: /\b(?:head|headband)\b/i, body: /\b(?:body|chest)\b/i, arms: /\barms?\b/i, legs: /\blegs?\b/i });
// Pièces V4/V5 imprimées dans `detail` → nom français du catalogue d'armures (zones seulement : le PA reste celui du livre).
const CATALOGUE_PIECES = Object.freeze({ 'mail coat': 'Cotte de mailles', 'mail shirt': 'Chemise de mailles', 'leather jack': 'Veste de cuir', helm: 'Heaume', plate: 'Plastron' });
const CATALOGUE_ZONE = Object.freeze({ head: 'head', body: 'body', rightArm: 'arms', leftArm: 'arms', rightLeg: 'legs', leftLeg: 'legs' });

const namedZones = text => Object.keys(DETAIL_ZONES).filter(key => DETAIL_ZONES[key].test(text || ''));

function cataloguePieceZones(name) {
  const french = CATALOGUE_PIECES[name.toLowerCase().replace(/\s+/g, ' ').trim()];
  const item = french && getReferenceCatalogue().items.find(entry => entry.kind === 'armour' && entry.name === french);
  return item ? [...new Set(item.locations.map(id => CATALOGUE_ZONE[id]))] : null;
}

/** Armure décrite seulement par `detail` (« Mail Coat 2 », « Helm 2, Plate 3 », « Body 2 ») : zones du catalogue ou nommées, sinon rappel. */
function detailArmour(detail, zones) {
  const reminders = [];
  for (const piece of String(detail).split(',').map(text => text.trim()).filter(Boolean)) {
    const match = /^(.*?)\s*(\d+)?$/.exec(piece);
    const name = match[1].replace(/\s+only$/i, '').trim(), value = match[2] === undefined ? null : Number(match[2]);
    const targets = cataloguePieceZones(name) || (name && namedZones(name).length ? namedZones(name) : null);
    if (!targets || value === null) { reminders.push(piece); continue; }
    for (const key of targets) zones[key] = Math.max(zones[key], value);
  }
  return reminders;
}

/**
 * Armure imprimée par zone : `ap` d'ensemble (limité aux zones nommées par `detail`), sinon pièces non facultatives (zone nommée, ou partout),
 * sinon `detail` seul (zones du catalogue). Aucun BE ajouté. `reminder` : texte à montrer quand la valeur ou la zone n'est pas déterminable.
 */
function printedArmour(armour, includeOptional) {
  const zones = { head: 0, body: 0, arms: 0, legs: 0 };
  if (!armour) return { zones, reminder: '' };
  if (isInt(armour.ap)) {
    const named = namedZones(armour.detail);
    for (const key of named.length ? named : Object.keys(zones)) zones[key] = armour.ap;
    return { zones, reminder: '' };
  }
  for (const part of armour.parts || []) {
    if ((part.optional && !includeOptional) || !isInt(part.ap)) continue;
    const named = Object.keys(zones).filter(key => ARMOUR_ZONES[key].test(part.locations || ''));
    for (const key of named.length ? named : Object.keys(zones)) zones[key] = Math.max(zones[key], part.ap);
  }
  const printed = Object.values(zones).some(value => value > 0);
  const unresolved = !printed && isText(armour.detail) ? detailArmour(armour.detail, zones) : [];
  return { zones, reminder: unresolved.length ? `Armure imprimée « ${unresolved.join(', ')} » : zones ou PA non déterminés, à régler à la main (PA laissés à 0).` : '' };
}

/** Sorts d'un profil, une ligne par liste (« Petty : A, B », « Lore of Life : C ») ; la prose (« notes ») est gardée telle quelle. */
export function bestiarySpellLines(spells) {
  return Object.entries(spells || {}).filter(([, list]) => Array.isArray(list) && list.length)
    .map(([label, list]) => (label === 'notes' ? list.join(' ') : `${label === 'spells' ? 'Sorts' : label} : ${list.join(', ')}`));
}

const traitText = trait => {
  const detail = trait.param ?? trait.rating;
  return detail === undefined || detail === null || detail === '' ? trait.name : `${trait.name} (${detail})`;
};

/**
 * Une attaque imprimée « 2 Claws », « 8 × Tentacles » (`count`) devient autant d'actions (« Claws 1 », « Claws 2 »…), chacune marquée
 * `multiAttack` ; livre de base V5 (L06) p. 362 : « 8 Tentacles : la créature peut faire 8 attaques gratuites ».
 */
function attackActions(attack) {
  const ranged = isInt(attack.rangeYards);
  const of = isInt(attack.count) && attack.count > 1 ? attack.count : 1;
  return Array.from({ length: of }, (_, position) => {
    const free = attack.free || (of > 1 ? 'all' : null);
    const v5 = { kind: ranged ? 'ranged' : 'melee', ...(free ? { [BESTIARY_FREE_ATTACK_KEY]: free } : {}), ...(of > 1 ? { multiAttack: { group: attack.name, index: position + 1, of } } : {}) };
    return normalizeAction({
      name: of > 1 ? `${attack.name} ${position + 1}` : attack.name, type: 'attack', attr: ranged ? 'CT' : 'CC', base: attack.value ?? '', damage: attack.damage,
      qualities: cloneValue(attack.qualities || []), ...(ranged ? { rangeYards: attack.rangeYards } : {}),
      ...(attack.detail ? { detail: attack.detail } : {}), extensions: { v5 }
    });
  });
}

/**
 * Participant ordinaire d'un profil de bestiaire (valeurs imprimées, jamais recalculées : ni BF, ni Taille, ni armure ajoutés).
 * `options.library` : profils chargés (un livre ou plusieurs) ; `index` : rang d'exemplaire (suffixe du nom) ; `nameFr` : nom français ;
 * `includeOptional` : attaques et pièces d'armure facultatives. Les gabarits ne sont pas des créatures : refus.
 */
export function buildParticipantFromBestiary(id, options = {}) {
  const { library, camp = 'neutre', zone = 'bench', index = null, nameFr = false, includeOptional = false, idFactory = uid } = options;
  if (!Array.isArray(library)) throw new Error('bibliothèque de profils requise');
  const record = library.find(profile => profile.id === id);
  if (!record) throw new Error(`profil de bestiaire inconnu : ${id}`);
  if (record.kind === 'template') throw new Error('un gabarit n’est pas une créature : l’appliquer à un profil');
  const errors = validateBestiaryRecord(record);
  if (errors.length) throw new Error(`profil de bestiaire incohérent (${id}) : ${errors.join(' ; ')}`);
  const base = nameFr && record.nameFr ? record.nameFr : record.name;
  const wounds = isInt(record.wounds) ? record.wounds : null;
  const traits = (record.traits || []).filter(trait => isText(trait?.name));
  const { zones: armor, reminder: armourReminder } = printedArmour(record.armour, includeOptional);
  return {
    id: idFactory(), name: index === null ? base : `${base} ${index}`, kind: 'Créature', camp, zone,
    initiative: record.stats.I ?? 0, hp: wounds, maxHp: wounds,
    caracs: Object.fromEntries(Object.entries(record.stats).filter(([, value]) => value !== null)),
    armor,
    actions: (record.attacks || []).filter(attack => includeOptional || !attack.optional).flatMap(attackActions),
    skills: (record.skills || []).map(skill => ({ name: skill.nameFr || skill.name, total: skill.value })),
    traits: traits.map(traitText), keywords: [...(record.keywords || [])], tags: [], notes: armourReminder,
    extensions: { v5: { bestiary: {
      id: record.id, book: record.book, page: record.page, name: record.name, edition: record.edition ?? null,
      armour: cloneValue(record.armour || {}), traitRefs: Object.fromEntries(traits.filter(trait => trait.ref).map(trait => [trait.name, trait.ref])),
      optionalTraits: (record.optionalTraits || []).map(traitText), abilityRefs: [...(record.abilities || [])], ...(record.woundsAbsent ? { woundsAbsent: true } : {}),
      // Sorts imprimés, par liste (« Petty », « Lore of X »…) : consultation seulement, ils ne sont pas dans `participant.spells` (qui ouvre la Focalisation et le choix de sort).
      ...(record.spells ? { spells: cloneValue(record.spells) } : {})
    } } }
  };
}

/** Champs d'un profil de Réserve (à passer à `new Profile`) copiés d'un profil de bestiaire : mêmes valeurs imprimées que le participant. */
export function buildReserveProfileFromBestiary(id, options = {}) {
  const participant = buildParticipantFromBestiary(id, options);
  return {
    name: participant.name, kind: 'Créature', initiative: participant.initiative, hp: participant.hp ?? 0, maxHp: participant.maxHp ?? 0,
    caracs: participant.caracs, armor: participant.armor, diceLines: participant.actions, skills: participant.skills,
    traits: participant.traits, keywords: participant.keywords, group: options.group ?? '', extensions: participant.extensions
  };
}
