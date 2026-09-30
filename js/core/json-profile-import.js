/** Import local de profils au format JSON (version 1). L'entrée reste inerte : ni HTML, ni code, ni réseau. */
import { canonicalQualityId, isKnownQuality, normalizeQualities } from './quality-normalization.js';
import { canonicalCaracKey, normalizeTags } from './models.js';
import { normalizeDamageFields } from './damage.js';
import { getKeywordBySlug, getKeywordList } from './keywords.js';
import { parseProfileText } from './text-profile-import.js';

const FORMAT_VERSION = 1;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stripAccents = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
// Clés insensibles à la casse, aux accents, aux espaces, tirets et soulignés.
const normKey = value => stripAccents(value).toLocaleLowerCase().replace(/[\s_-]+/g, '');
/** Même contrat que `userError` de ui/messages.js (le cœur n'importe pas l'UI). */
const userError = message => Object.assign(new Error(message), { userFacing: true });
// Valeur fautive citée dans un point à vérifier : le texte tel quel, le reste en JSON.
const shownValue = value => (typeof value === 'string' ? value : JSON.stringify(value) ?? String(value));

const PROFILE_KEYS = {
  name: ['nom', 'name'], kind: ['type', 'kind'], group: ['groupe', 'group'],
  hp: ['pv', 'hp', 'pvmax', 'blessures'], initiative: ['initiative', 'init'],
  caracs: ['caracteristiques', 'caracteristique', 'caracs'], armor: ['armure', 'armor'],
  tags: ['tags', 'motscles'], notes: ['notes'], favorite: ['favori', 'favorite'],
  actions: ['jets', 'actions', 'dicelines']
};
const PROFILE_IGNORED = ['id', 'extensions', 'participantid', 'targetid', 'attr', 'format', 'version', 'profils', 'profiles'];
const ACTION_KEYS = {
  name: ['nom', 'note', 'name', 'label'], type: ['type'], base: ['score', 'base', 'valeur'], mod: ['mod', 'modificateur'],
  damage: ['degats', 'damage'], damageFormula: ['damageformula'], qualities: ['qualites', 'qualities', 'motscles'],
  valuesX: ['x', 'valeurx', 'valuesx', 'valuex', 'xvalues'], capacity: ['capacite', 'capacity', 'munitions']
};
const ACTION_IGNORED = ['id', 'extensions', 'participantid', 'targetid', 'attr'];
const QUALITY_KEYS = { name: ['nom', 'name', 'label', 'id'], rating: ['valeur', 'value', 'rating', 'x'] };
const ARMOR_KEYS = { head: ['tete', 'head'], body: ['corps', 'body'], arms: ['bras', 'arms'], legs: ['jambes', 'legs'] };
const KIND_NAMES = new Map([['pj', 'PJ'], ['pnj', 'PNJ'], ['creature', 'Créature']]);
const ACTION_TYPES = new Map([['attaque', 'attack'], ['attack', 'attack'], ['competence', 'skill'], ['skill', 'skill'], ['defense', 'defense'], ['defence', 'defense'], ['opposition', 'opposition']]);

/** Valeurs d'un objet selon une table { canonique: [alias normalisés] } ; les autres clés sont renvoyées comme inconnues. */
function readRecord(record, table, ignored = []) {
  const values = {};
  const rank = {};
  const unknown = [];
  for (const [key, value] of Object.entries(record)) {
    const norm = normKey(key);
    const target = Object.keys(table).find(name => table[name].includes(norm));
    if (!target) { if (!ignored.includes(norm)) unknown.push(key); continue; }
    // Deux alias du même champ : le premier de la table l'emporte (« nom » avant « id »).
    const position = table[target].indexOf(norm);
    if (!(target in rank) || position < rank[target]) { values[target] = value; rank[target] = position; }
  }
  return { values, unknown };
}

const JSON_ERRORS = {
  fin: 'le texte s’arrête trop tôt (accolade « } » ou crochet « ] » manquant ?)',
  cle: 'nom de champ entre guillemets doubles attendu',
  'deux-points': '« : » attendu après le nom du champ',
  'virgule-en-trop': 'virgule en trop avant la fermeture',
  'virgule-objet': 'virgule ou « } » attendu (virgule manquante ?)',
  'virgule-liste': 'virgule ou « ] » attendu (virgule manquante ?)',
  controle: 'retour à la ligne ou tabulation dans un texte : écrivez \\n',
  commentaire: 'commentaire « // » non permis en JSON',
  echappement: 'barre oblique inverse « \\ » invalide dans un texte : doublez-la (« \\\\ »)',
  nombre: 'nombre mal écrit (zéro en tête, point ou exposant incomplet ?)',
  espace: 'espace spéciale (insécable ?) : remplacez-la par une espace normale',
  'texte-non-ferme': 'texte entre guillemets jamais fermé',
  'texte-en-trop': 'texte en trop après la fin du JSON'
};
// Espaces qu'un copier-coller depuis une page apporte, et que JSON refuse entre deux éléments.
const SPECIAL_SPACE = /[\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/;

/** Premier écart à la grammaire JSON (position, raison) : JSON.parse ne donne pas toujours la position. */
function locateJsonError(text) {
  let at = 0;
  const stop = reason => { throw Object.assign(new Error(reason), { reason }); };
  const blank = () => { while (at < text.length && ' \t\n\r'.includes(text[at])) at += 1; };
  const string = () => {
    at += 1;
    while (at < text.length) {
      if (text[at] === '"') { at += 1; return; }
      if (text[at] === '\\') {
        // Échappements JSON : \" \\ \/ \b \f \n \r \t et \u suivi de 4 chiffres hexadécimaux (un chemin C:\… n'en est pas).
        const next = text[at + 1];
        if (next === undefined) stop('texte-non-ferme');
        if (next === 'u' ? !/^[0-9a-fA-F]{4}$/.test(text.slice(at + 2, at + 6)) : !'"\\/bfnrt'.includes(next)) stop('echappement');
        at += next === 'u' ? 6 : 2;
        continue;
      }
      if (text[at] < ' ') stop('controle');
      at += 1;
    }
    stop('texte-non-ferme');
  };
  // Objet ou liste : éléments séparés par des virgules, sans virgule finale.
  const members = (close, item) => {
    at += 1; blank();
    if (text[at] === close) { at += 1; return; }
    for (;;) {
      blank();
      if (text[at] === close) stop('virgule-en-trop');
      item(); blank();
      if (text[at] === ',') { at += 1; continue; }
      if (text[at] === close) { at += 1; return; }
      stop(at >= text.length ? 'fin' : close === '}' ? 'virgule-objet' : 'virgule-liste');
    }
  };
  const member = () => {
    if (text[at] === '/') stop('commentaire');
    if (text[at] !== '"') stop(at >= text.length ? 'fin' : 'cle');
    string(); blank();
    if (text[at] !== ':') stop(at >= text.length ? 'fin' : 'deux-points');
    at += 1; value();
  };
  function value() {
    blank();
    if (text[at] === '{') return members('}', member);
    if (text[at] === '[') return members(']', value);
    if (text[at] === '"') return string();
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(at, at + 400));
    // « 012 », « 1. », « 1e », « .5 », « +3 » : un nombre qui déborde de sa forme JSON.
    if (number && /[0-9.eE+-]/.test(text[at + number[0].length] ?? '')) stop('nombre');
    if (number) { at += number[0].length; return; }
    if ('+-.'.includes(text[at] ?? 'x')) stop('nombre');
    const word = ['true', 'false', 'null'].find(item => text.startsWith(item, at));
    if (word) { at += word.length; return; }
    stop(at >= text.length ? 'fin' : text[at] === '/' ? 'commentaire' : 'valeur');
  }
  try { value(); blank(); if (at < text.length) stop('texte-en-trop'); return null; }
  catch (error) { if (error.reason) return { at: Math.min(at, text.length), reason: error.reason }; throw error; }
}

/** « JSON illisible, ligne 12, colonne 5 : virgule en trop avant la fermeture. » */
function jsonSyntaxError(text, cause) {
  let found = null;
  // Imbrication extrême (pile dépassée) : le message du navigateur reste le seul repère.
  try { found = locateJsonError(text); } catch { found = null; }
  if (!found) return userError(`JSON illisible : ${String(cause?.message || 'format non reconnu').replace(/\.$/, '')}.`);
  const before = text.slice(0, found.at).split('\n');
  const char = text[found.at] ?? '';
  const detail = SPECIAL_SPACE.test(char) ? JSON_ERRORS.espace
    : found.reason === 'valeur' ? `valeur inattendue « ${char} » (texte sans guillemets doubles ?)` : JSON_ERRORS[found.reason];
  return userError(`JSON illisible, ligne ${before.length}, colonne ${before[before.length - 1].length + 1} : ${detail}.`);
}

function parseInteger(value, field, errors, { min = null } = {}) {
  const raw = typeof value === 'string' ? value.trim() : value;
  // Nombre ou texte seulement : une liste d'un élément (« [12] ») n'est pas un entier.
  const number = typeof raw === 'number' ? raw : typeof raw === 'string' && /^[+-]?\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(number)) { errors.push({ field, reason: 'entier-attendu', value: typeof value === 'object' ? JSON.stringify(value) : String(value) }); return null; }
  if (!Number.isSafeInteger(number)) { errors.push({ field, reason: 'entier-hors-limites', value: String(value) }); return null; }
  if (min !== null && number < min) { errors.push({ field, reason: 'valeur-negative', value: String(value) }); return null; }
  return number;
}

function parseText(value, field, errors) {
  if (typeof value === 'string') return value.trim();
  errors.push({ field, reason: 'texte-attendu', value: typeof value === 'object' ? JSON.stringify(value) : String(value) });
  return '';
}

/** Une qualité : texte (« Recharge 2 », « Percutante ») ou objet { nom, valeur }. Stockée comme le sélecteur : { id, name, rating? }. */
function parseQualities(value, label, errors, unknownQualities) {
  const field = `${label} · qualités`;
  // Un texte « a, b » ou une liste, dont chaque texte peut aussi grouper plusieurs qualités.
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? value : null;
  if (!list) { errors.push({ field, reason: 'liste-attendue', value: shownValue(value) }); return []; }
  const qualities = [];
  // « Recharge 2 » : la valeur finale est l'entier X, retiré avant de canoniser.
  const split = text => { const match = text.trim().match(/^(.*\S)\s+(\d+)$/); return match ? [match[1], Number(match[2])] : [text.trim(), undefined]; };
  for (const item of list.flatMap(entry => typeof entry === 'string' ? entry.split(',') : [entry])) {
    let name = '';
    let rating;
    if (isRecord(item)) {
      const { values } = readRecord(item, QUALITY_KEYS, ['extensions']);
      name = typeof values.name === 'string' ? values.name.trim() : '';
      if (values.rating !== undefined && values.rating !== null) rating = parseInteger(values.rating, field, errors) ?? undefined;
      else [name, rating] = split(name);
    } else if (typeof item === 'string') {
      if (!item.trim()) continue;
      [name, rating] = split(item);
    } else { errors.push({ field, reason: 'texte-attendu', value: shownValue(item) }); continue; }
    if (!name) { errors.push({ field, reason: 'texte-attendu', value: shownValue(item) }); continue; }
    const id = canonicalQualityId(name);
    if (!id || !isKnownQuality(id)) unknownQualities.push({ value: rating !== undefined ? `${name} ${rating}` : name, action: label });
    if (!id) continue;
    const keyword = getKeywordBySlug(id);
    // Valeur X réservée aux mots-clés à X (ou inconnus) ; sans valeur, 1 comme le sélecteur.
    const given = keyword && !keyword.hasRating ? undefined : rating ?? (keyword?.hasRating ? 1 : undefined);
    qualities.push({ id, name: keyword?.name || name, ...(given !== undefined ? { rating: given } : {}) });
  }
  return normalizeQualities(qualities);
}

function parseAction(raw, number, errors, unknownQualities) {
  if (!isRecord(raw)) { errors.push({ field: `jet ${number}`, reason: 'objet-attendu', value: '' }); return null; }
  const { values, unknown } = readRecord(raw, ACTION_KEYS, ACTION_IGNORED);
  const nameErrors = [];
  const name = values.name === undefined ? '' : parseText(values.name, `jet ${number}`, nameErrors);
  const label = `jet ${number}${name ? ` (${name})` : ''}`;
  errors.push(...nameErrors.map(error => ({ ...error, field: `${label} · nom` })));
  if (!name) { if (!nameErrors.length) errors.push({ field: `${label} · nom`, reason: 'champ-manquant', value: '' }); }
  unknown.forEach(key => errors.push({ field: `${label} · ${key}`, reason: 'champ-inconnu', value: '' }));
  const action = { name: name || `Jet ${number}`, note: name || `Jet ${number}`, type: '' };
  if (values.type !== undefined && values.type !== null && values.type !== '') {
    const type = ACTION_TYPES.get(normKey(values.type));
    if (type) action.type = type;
    else errors.push({ field: `${label} · type`, reason: 'type-inconnu', value: shownValue(values.type) });
  }
  if (values.base === undefined || values.base === null) { errors.push({ field: `${label} · score`, reason: 'champ-manquant', value: '' }); action.base = null; }
  else action.base = parseInteger(values.base, `${label} · score`, errors);
  action.mod = values.mod === undefined || values.mod === null ? 0 : parseInteger(values.mod, `${label} · modificateur`, errors) ?? 0;
  // `degats` : entier ou formule (`BF+4`, `1d10`) ; une sauvegarde peut donner la formule à part (`damageFormula`).
  const formula = typeof values.damageFormula === 'string' && values.damageFormula.trim() ? values.damageFormula : null;
  const damage = values.damage;
  const given = damage !== undefined && damage !== null && damage !== '';
  const decimal = (typeof damage === 'number' && !Number.isInteger(damage)) || (typeof damage === 'string' && /^\s*[+-]?\d*[.,]\d+\s*$/.test(damage));
  if (formula || given) {
    if (decimal) errors.push({ field: `${label} · dégâts`, reason: 'entier-attendu', value: shownValue(damage) });
    else if (given && typeof damage !== 'number' && typeof damage !== 'string') errors.push({ field: `${label} · dégâts`, reason: 'texte-attendu', value: shownValue(damage) });
    else {
      // Même règle que le modèle : un nombre différent du terme constant de la formule l'emporte.
      const fields = normalizeDamageFields(formula ? { damage: given ? damage : undefined, damageFormula: formula } : { damage });
      action.damage = fields.damage;
      if (fields.damageFormula) action.damageFormula = fields.damageFormula;
    }
  }
  action.qualities = values.qualities === undefined || values.qualities === null ? [] : parseQualities(values.qualities, label, errors, unknownQualities);
  const optional = (value, what) => value === undefined || value === null || value === '' ? null : parseInteger(value, `${label} · ${what}`, errors);
  action.valuesX = optional(values.valuesX, 'x');
  action.capacity = optional(values.capacity, 'capacité');
  return action;
}

function parseCaracs(value, errors) {
  const caracs = {};
  if (value === undefined || value === null) return caracs;
  if (!isRecord(value)) { errors.push({ field: 'caractéristiques', reason: 'objet-attendu', value: '' }); return caracs; }
  for (const [key, raw] of Object.entries(value)) {
    const canonical = canonicalCaracKey(key);
    if (!canonical) { errors.push({ field: `caractéristique ${key}`, reason: 'champ-inconnu', value: '' }); continue; }
    const number = parseInteger(raw, `caracs.${canonical}`, errors);
    if (number !== null) caracs[canonical] = number;
  }
  return caracs;
}

function parseArmor(value, errors) {
  const armor = { head: 0, body: 0, arms: 0, legs: 0 };
  if (value === undefined || value === null) return armor;
  if (!isRecord(value)) {
    const number = parseInteger(value, 'armure', errors, { min: 0 });
    return number === null ? armor : { head: number, body: number, arms: number, legs: number };
  }
  const { values, unknown } = readRecord(value, ARMOR_KEYS);
  unknown.forEach(key => errors.push({ field: `armure ${key}`, reason: 'champ-inconnu', value: '' }));
  for (const zone of Object.keys(values)) armor[zone] = parseInteger(values[zone], `armor.${zone}`, errors, { min: 0 }) ?? 0;
  return armor;
}

function parseProfile(raw, index) {
  const errors = [];
  const unknownQualities = [];
  const { values, unknown } = readRecord(raw, PROFILE_KEYS, PROFILE_IGNORED);
  unknown.forEach(key => errors.push({ field: key, reason: 'champ-inconnu', value: '' }));
  const caracs = parseCaracs(values.caracs, errors);

  const name = values.name === undefined || values.name === null ? '' : parseText(values.name, 'name', errors);
  let hp = null;
  if (values.hp !== undefined && values.hp !== null) hp = parseInteger(values.hp, 'hp', errors);
  else if (caracs.B !== undefined) hp = caracs.B;
  let initiative = caracs.I ?? 30;
  if (values.initiative !== undefined && values.initiative !== null) initiative = parseInteger(values.initiative, 'initiative', errors) ?? initiative;

  let kind = 'Créature';
  if (values.kind !== undefined && values.kind !== null && values.kind !== '') {
    const known = KIND_NAMES.get(normKey(values.kind));
    if (known) kind = known;
    else errors.push({ field: 'kind', reason: 'type-inconnu', value: shownValue(values.kind) });
  }
  const group = values.group === undefined || values.group === null ? '' : parseText(values.group, 'group', errors);
  let tags = [];
  if (Array.isArray(values.tags) || typeof values.tags === 'string') {
    if (Array.isArray(values.tags) && values.tags.some(tag => typeof tag !== 'string')) errors.push({ field: 'tags', reason: 'texte-attendu', value: JSON.stringify(values.tags) });
    tags = normalizeTags(values.tags);
  } else if (values.tags !== undefined && values.tags !== null) errors.push({ field: 'tags', reason: 'liste-attendue', value: JSON.stringify(values.tags) });
  let notes = '';
  if (Array.isArray(values.notes) && values.notes.every(line => typeof line === 'string')) notes = values.notes.join('\n');
  else if (values.notes !== undefined && values.notes !== null) notes = typeof values.notes === 'string' ? values.notes : (errors.push({ field: 'notes', reason: 'texte-attendu', value: JSON.stringify(values.notes) }), '');
  let favorite = false;
  if (typeof values.favorite === 'boolean') favorite = values.favorite;
  else if (values.favorite !== undefined && values.favorite !== null) errors.push({ field: 'favori', reason: 'booleen-attendu', value: JSON.stringify(values.favorite) });

  const actions = [];
  if (Array.isArray(values.actions)) values.actions.forEach((item, at) => { const action = parseAction(item, at + 1, errors, unknownQualities); if (action) actions.push(action); });
  else if (values.actions !== undefined && values.actions !== null) errors.push({ field: 'jets', reason: 'liste-attendue', value: '' });

  const fields = {
    name: name ? { status: 'found', value: name, lines: [] } : { status: 'missing', value: null, lines: [] },
    hp: hp !== null || (values.hp !== undefined && values.hp !== null) ? { status: 'found', value: hp, lines: [] } : { status: 'missing', value: null, lines: [] }
  };
  const profile = { name: name || null, kind, group, hp, initiative, caracs, armor: parseArmor(values.armor, errors), tags, notes, favorite, actions };
  const blocking = fields.name.status !== 'found' || fields.hp.status !== 'found' || errors.length > 0;
  return { index, profile, fields, errors, ambiguities: [], unknownQualities, blocking, sourceText: JSON.stringify(raw, null, 2) };
}

/** Un profil, une liste de profils, ou { profils: [ … ] } (enveloppe facultative avec format et version). */
export function parseProfileJson(text) {
  if (typeof text !== 'string') throw new TypeError('Le JSON du profil doit être une chaîne');
  // BOM (U+FEFF) d'un fichier « UTF-8 avec BOM » ou espaces insécables collés autour du JSON : JSON.parse
  // les refuse. Ils deviennent des espaces simples, sans décaler les lignes et colonnes des messages.
  const source = text.replace(/^\s+|\s+$/g, blank => blank.replace(/[^\r\n]/g, ' '));
  let data;
  try { data = JSON.parse(source); } catch (cause) { throw jsonSyntaxError(source, cause); }
  let list = data;
  if (isRecord(data)) {
    const envelope = Object.entries(data).reduce((found, [key, value]) => ({ ...found, [normKey(key)]: found[normKey(key)] ?? value }), {});
    if (envelope.version !== undefined && !(Number(envelope.version) <= FORMAT_VERSION)) throw userError(`Version de format inconnue : ${JSON.stringify(envelope.version)}.`);
    const wrapper = ['profils', 'profiles'].find(key => Object.hasOwn(envelope, key));
    if (wrapper) {
      if (!Array.isArray(envelope[wrapper])) throw userError('« profils » doit être une liste de profils.');
      list = envelope[wrapper];
    } else list = [data];
  }
  if (!Array.isArray(list)) throw userError('Un profil { … } ou une liste de profils est attendu.');
  if (!list.length) throw userError('Aucun profil trouvé dans le JSON.');
  getKeywordList();
  const blocks = list.map((item, index) => {
    if (!isRecord(item)) throw userError(`Profil n°${index + 1} : un objet { … } est attendu.`);
    return parseProfile(item, index);
  });
  return {
    status: blocks.some(item => item.blocking || item.ambiguities.length || item.unknownQualities.length) ? 'needs-review' : 'ready',
    profiles: blocks.map(item => item.profile), blocks, sourceText: text,
    ambiguities: [],
    unknownQualities: blocks.flatMap(item => item.unknownQualities),
    errors: blocks.flatMap(item => item.errors.map(value => ({ ...value, block: item.index })))
  };
}

/** JSON si le texte commence par `{`, ou par `[` suivi d'un objet ; sinon format texte (« Nom: … », en-tête « [Profil] » compris). */
export function parseProfileInput(text) {
  const source = String(text ?? '');
  return /^\ufeff?\s*(?:\{|\[\s*[{\]])/.test(source) ? parseProfileJson(source) : parseProfileText(source);
}

export const PROFILE_JSON_EXAMPLE = JSON.stringify({
  format: 'outil-mj-profil',
  version: 1,
  nom: 'Garde du pont',
  type: 'PNJ',
  groupe: 'Milice de Bögenhafen',
  pv: 12,
  initiative: 35,
  caracteristiques: { CC: 45, CT: 35, F: 35, E: 35, I: 35, Ag: 38, Dex: 30, Int: 28, FM: 32, Soc: 25 },
  armure: { tete: 1, corps: 2, bras: 1, jambes: 0 },
  tags: ['humain', 'milice'],
  notes: 'Patrouille le pont de nuit.\nSonne l’alarme à la première blessure.',
  favori: true,
  jets: [
    { nom: 'Hallebarde', type: 'attaque', score: 45, mod: 0, degats: 'BF+4', qualites: ['Percutante'] },
    { nom: 'Arbalète', type: 'attaque', score: 35, mod: -10, degats: 9, qualites: ['Recharge 1'] },
    { nom: 'Esquive', type: 'défense', score: 38 },
    { nom: 'Intimidation', type: 'compétence', score: 25, mod: 10 }
  ]
}, null, 2);
