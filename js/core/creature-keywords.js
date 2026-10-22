/**
 * Référentiel unique de mots-clés de créature : résolution (alias, casse, accents, pluriel), hiérarchie (graphe sans cycle),
 * correspondance « la cible porte le mot-clé ou un descendant » et garde-fou contre les doublons et quasi-doublons.
 * Module pur : aucune E/S ; le référentiel de base est figé, les ajouts du MJ (`extensions.v5.keywordReferential`) s'y superposent.
 */
import { BASE_KEYWORDS } from '../data/creature-keywords.js';

const isText = value => typeof value === 'string' && value.trim() !== '';

/** Forme comparable d'un libellé : sans accents, casse, tirets ni apostrophes, pluriel régulier retiré mot à mot. */
export function normalizeKeywordText(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[-_’'`]+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean)
    .map(word => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word)).join(' ');
}

const labelsOf = term => [term.nameFr, term.nameEn, ...(term.aliases || [])].filter(isText);

/** Distance d'édition de Levenshtein (chaînes courtes). */
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Référentiel utilisable : { terms: Map(id → terme), labels: Map(libellé normalisé → id), children: Map(id → [id]) }.
 * Lève une erreur sur un id ou un libellé déjà pris, un parent inconnu ou un cycle ; ne modifie jamais ses entrées.
 */
export function buildReferential(extraTerms = []) {
  const terms = new Map();
  const labels = new Map();
  for (const raw of [...BASE_KEYWORDS, ...extraTerms]) {
    if (!raw || !isText(raw.id) || !isText(raw.nameFr)) throw new TypeError('Mot-clé invalide : id et nom français requis.');
    if (terms.has(raw.id)) throw new Error(`Le mot-clé « ${raw.id} » existe déjà.`);
    const entry = { id: raw.id, nameFr: raw.nameFr, nameEn: raw.nameEn || raw.nameFr, parents: [...(raw.parents || [])], aliases: [...(raw.aliases || [])], ...(raw.addedByMj ? { addedByMj: true } : {}) };
    terms.set(entry.id, entry);
    for (const label of labelsOf(entry)) {
      const key = normalizeKeywordText(label);
      if (labels.has(key) && labels.get(key) !== entry.id) throw new Error(`Le libellé « ${label} » existe déjà (${labels.get(key)}).`);
      labels.set(key, entry.id);
    }
  }
  const children = new Map([...terms.keys()].map(id => [id, []]));
  for (const entry of terms.values()) {
    for (const parent of entry.parents) {
      if (!terms.has(parent)) throw new Error(`Parent inconnu « ${parent} » pour « ${entry.id} ».`);
      children.get(parent).push(entry.id);
    }
  }
  const state = new Map();
  const visit = id => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'open') throw new Error(`Hiérarchie de mots-clés : cycle autour de « ${id} ».`);
    state.set(id, 'open');
    for (const parent of terms.get(id).parents) visit(parent);
    state.set(id, 'done');
  };
  for (const id of terms.keys()) visit(id);
  return Object.freeze({ terms, labels, children });
}

export const BASE_REFERENTIAL = buildReferential();

// Référentiel « actif » : celui de la partie ouverte (base + ajouts du MJ), posé par le Store ; la base seule tant qu'aucun Store n'en pose.
let active = BASE_REFERENTIAL;
export const activeReferential = () => active;
export function setActiveReferential(referential) { active = referential || BASE_REFERENTIAL; }

/**
 * Référentiel étendu d'une sauvegarde : base figée + termes du MJ (`extensions.v5.keywordReferential.terms`). Un terme qui usurpe un
 * identifiant ou un libellé existant, ou dont un parent manque, est écarté et listé dans `rejected` : la base ne change jamais.
 */
export function referentialFromExtensions(extensions) {
  const raw = extensions?.v5?.keywordReferential?.terms;
  const accepted = [];
  const rejected = [];
  for (const term of Array.isArray(raw) ? raw : []) {
    try {
      buildReferential([...accepted, term]);
      accepted.push(term);
    } catch (error) {
      rejected.push({ id: term?.id ?? null, message: error.message });
    }
  }
  return { referential: accepted.length ? buildReferential(accepted) : BASE_REFERENTIAL, terms: accepted, rejected };
}

/** Terme du référentiel désigné par un texte (nom, nom anglais ou alias), sinon null. */
export function resolveKeyword(text, referential = activeReferential()) {
  const key = normalizeKeywordText(text);
  if (!key) return null;
  const id = referential.labels.get(key);
  return id ? referential.terms.get(id) : null;
}

/** Le mot-clé et tous ses ancêtres (un mot-clé inconnu ne donne que lui-même). */
export function keywordAncestors(id, referential = activeReferential()) {
  const found = new Set();
  const walk = current => {
    if (found.has(current)) return;
    found.add(current);
    for (const parent of referential.terms.get(current)?.parents || []) walk(parent);
  };
  walk(id);
  return found;
}

/** Le mot-clé et tous ses descendants. */
export function keywordDescendants(id, referential = activeReferential()) {
  const found = new Set();
  const walk = current => {
    if (found.has(current)) return;
    found.add(current);
    for (const child of referential.children.get(current) || []) walk(child);
  };
  walk(id);
  return found;
}

/** Ensemble des mots-clés portés avec leurs ancêtres. */
export function expandKeywords(ids, referential = activeReferential()) {
  const found = new Set();
  for (const id of ids || []) for (const ancestor of keywordAncestors(id, referential)) found.add(ancestor);
  return found;
}

/** Vrai quand la cible porte `targetId` ou un descendant : « contre les Peaux-vertes » vise un Orque, jamais l'inverse. */
export function keywordMatches(carriedIds, targetId, referential = activeReferential()) {
  if (!isText(targetId)) return false;
  return expandKeywords(carriedIds, referential).has(targetId);
}

/**
 * Garde-fou d'ajout : `{ ok: true, term }` pour un terme réellement nouveau, sinon `{ ok: false, reason, existing, message }` avec le
 * terme existant à utiliser. Raisons : nom-vide, identique (même libellé à la casse, aux accents, au pluriel et aux tirets près),
 * alias (un alias proposé désigne déjà un terme), proche (distance d'édition ≤ 2, ≤ 1 pour un libellé de moins de 7 lettres, exact sous
 * 4 lettres), parent-inconnu.
 */
export function proposeNewKeyword({ nameFr, nameEn, aliases = [], parents = [], id } = {}, referential = activeReferential()) {
  if (!isText(nameFr)) return { ok: false, reason: 'nom-vide', existing: null, message: 'Le nom du mot-clé est requis.' };
  for (const parent of parents) if (!referential.terms.has(parent)) return { ok: false, reason: 'parent-inconnu', existing: null, message: `Parent inconnu : ${parent}.` };
  const proposed = [nameFr, nameEn, ...aliases].filter(isText);
  const known = [...referential.labels.keys()];
  for (const [index, label] of proposed.entries()) {
    const key = normalizeKeywordText(label);
    const hit = referential.labels.get(key);
    if (hit) {
      const existing = referential.terms.get(hit);
      const reason = index < (isText(nameEn) ? 2 : 1) ? 'identique' : 'alias';
      return { ok: false, reason, existing, message: `« ${label} » existe déjà : utiliser « ${existing.nameFr} ».` };
    }
    for (const other of known) {
      const shortest = Math.min(key.length, other.length);
      const limit = shortest < 4 ? 0 : shortest < 7 ? 1 : 2;
      if (limit && Math.abs(key.length - other.length) <= limit && editDistance(key, other) <= limit) {
        const existing = referential.terms.get(referential.labels.get(other));
        return { ok: false, reason: 'proche', existing, message: `« ${label} » est trop proche de « ${existing.nameFr} » : utiliser le terme existant.` };
      }
    }
  }
  const slug = normalizeKeywordText(id || nameFr).replace(/ /g, '-');
  if (referential.terms.has(slug)) return { ok: false, reason: 'identique', existing: referential.terms.get(slug), message: `L'identifiant « ${slug} » existe déjà.` };
  return { ok: true, term: { id: slug, nameFr: nameFr.trim(), nameEn: isText(nameEn) ? nameEn.trim() : nameFr.trim(), parents: [...parents], aliases: aliases.filter(isText).map(alias => alias.trim()), addedByMj: true } };
}

/** Termes en arbre (chaque terme sous son premier parent) avec leur profondeur : { id, nameFr, depth, parents } — pour un sélecteur. */
export function keywordTree(referential = activeReferential()) {
  const out = [];
  const seen = new Set();
  const walk = (id, depth) => {
    if (seen.has(id)) return;
    seen.add(id);
    const entry = referential.terms.get(id);
    out.push({ id, nameFr: entry.nameFr, depth, parents: [...entry.parents] });
    for (const child of [...(referential.children.get(id) || [])].filter(candidate => referential.terms.get(candidate).parents[0] === id).sort((a, b) => referential.terms.get(a).nameFr.localeCompare(referential.terms.get(b).nameFr, 'fr'))) walk(child, depth + 1);
  };
  for (const entry of [...referential.terms.values()].filter(item => !item.parents.length).sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr'))) walk(entry.id, 0);
  return out;
}

/** « Démon de Nurgle (Démon, Chaos, Nurgle) » : le nom et ses parents directs. */
export function describeKeyword(id, referential = activeReferential()) {
  const entry = referential.terms.get(id);
  if (!entry) return String(id);
  return entry.parents.length ? `${entry.nameFr} (${entry.parents.map(parent => referential.terms.get(parent)?.nameFr || parent).join(', ')})` : entry.nameFr;
}

// Traits de nature qui valent un mot-clé (comparés sans parenthèses ni valeur : « Démoniaque (9+) » = Démoniaque).
const TRAIT_KEYWORDS = new Map([
  ['undead', 'mort-vivant'], ['mort vivant', 'mort-vivant'], ['daemonic', 'demon'], ['demoniaque', 'demon'],
  ['construct', 'artificiel'], ['artificiel', 'artificiel'], ['ethereal', 'etheree'], ['ethere', 'etheree']
].map(([label, id]) => [normalizeKeywordText(label), id]));
const FLAG_KEYWORDS = Object.freeze({ isUndead: 'mort-vivant', isDaemon: 'demon', isConstruct: 'artificiel', isEthereal: 'etheree' });
const traitLabel = trait => normalizeKeywordText(String(typeof trait === 'string' ? trait : trait?.name || trait?.nom || trait?.id || '').replace(/\s*\(.*\)\s*$/, '').replace(/\s+\d+\+?$/, ''));

/**
 * Mots-clés effectifs d'un profil, participant ou PJ : ceux que le MJ a posés (`keywords`), plus ceux que l'on déduit d'office de la
 * race, des Traits de nature, des indicateurs de nature et des anciens tags résolubles ; moins `keywordExclusions` (correction du MJ).
 * Retourne { ids, explicit, derived: [{ id, from }], excluded, unknown } ; `unknown` : textes ou identifiants que le référentiel ne connaît pas.
 */
export function participantKeywords(subject, referential = activeReferential()) {
  const explicit = [];
  const derived = [];
  const unknown = [];
  const excluded = new Set((subject?.keywordExclusions || []).filter(isText));
  const addExplicit = id => { if (id && !explicit.includes(id)) explicit.push(id); };
  const addDerived = (id, from) => { if (id && !derived.some(entry => entry.id === id)) derived.push({ id, from }); };
  for (const raw of subject?.keywords || []) {
    const id = referential.terms.has(raw) ? raw : resolveKeyword(raw, referential)?.id;
    if (id) addExplicit(id); else if (isText(raw)) unknown.push(raw);
  }
  const fromText = (text, from) => { const found = resolveKeyword(text, referential); if (found) addDerived(found.id, from); return Boolean(found); };
  if (isText(subject?.race)) fromText(subject.race, 'race');
  if (isText(subject?.species)) fromText(subject.species, 'race');
  for (const trait of [...(Array.isArray(subject?.traits) ? subject.traits : []), ...(Array.isArray(subject?.extensions?.traits) ? subject.extensions.traits : [])]) {
    addDerived(TRAIT_KEYWORDS.get(traitLabel(trait)), 'trait');
  }
  for (const [flag, id] of Object.entries(FLAG_KEYWORDS)) if (subject?.[flag] === true) addDerived(id, 'flag');
  for (const tag of subject?.tags || []) if (isText(tag) && !fromText(tag, 'tag')) unknown.push(tag);
  const ids = [];
  for (const id of [...explicit, ...derived.map(entry => entry.id)]) if (!excluded.has(id) && !ids.includes(id)) ids.push(id);
  return { ids, explicit, derived: derived.filter(entry => !excluded.has(entry.id)), excluded: [...excluded], unknown: [...new Set(unknown)] };
}

const WILDCARDS = new Set(['tout', 'tous', 'everything', 'all'].map(normalizeKeywordText));
/** Valeur de contexte « l'ennemi est connu par ses mots-clés » : le contrat de talent lit alors `context.enemyKeywords`. */
export const ENEMY_FROM_KEYWORDS = '\u0000mots-cles-de-l-ennemi';

/**
 * Une spécialisation à cible (Haine, Sans peur, Rancune…) vise-t-elle l'ennemi ? La saisie explicite du MJ (`enemyGroup`) prime, résolue
 * par alias et par hiérarchie ; sinon on lit les mots-clés de l'ennemi (`enemyKeywords`). Un joker (Tout) vise tout ; un texte que le
 * référentiel ne résout pas ne vaut que par égalité de texte, jamais par déduction.
 */
export function specializationMatches(specialization, { enemyGroup, enemyKeywords } = {}, referential = activeReferential()) {
  if (!isText(specialization)) return false;
  if (WILDCARDS.has(normalizeKeywordText(specialization))) return true;
  const wanted = resolveKeyword(specialization, referential);
  if (enemyGroup !== undefined && enemyGroup !== null) {
    if (enemyGroup === specialization) return true;
    if (WILDCARDS.has(normalizeKeywordText(enemyGroup))) return false;
    const given = resolveKeyword(enemyGroup, referential);
    return Boolean(wanted && given && keywordMatches([given.id], wanted.id, referential));
  }
  return Boolean(wanted && Array.isArray(enemyKeywords) && keywordMatches(enemyKeywords, wanted.id, referential));
}

/** Variante pour un contrat de talent : `actual` vaut ENEMY_FROM_KEYWORDS quand seul l'ennemi est connu par ses mots-clés. */
export function contextMatchesSpecialization(specialization, actual, context, referential = activeReferential()) {
  return specializationMatches(specialization, { enemyGroup: actual === ENEMY_FROM_KEYWORDS ? undefined : actual, enemyKeywords: context?.enemyKeywords }, referential);
}

/**
 * Cibles d'un Trait à cible (Haine, Animosité, Préjugé…) : « Haine (Peaux-vertes) », { name: 'Animosity', param: 'Elves' } ou
 * { name: 'Prejudice (Strangers)' }. `names` : noms du Trait, sans accents, en minuscules (« hatred », « haine »). Chaque cible vaut
 * { raw, keywordId } (résolue), { raw, wildcard: true } (Tout) ou { raw } (texte non résoluble, jamais deviné).
 */
export function traitTargets(subject, names, referential = activeReferential()) {
  const wanted = new Set(names.map(normalizeKeywordText));
  const rows = [...(Array.isArray(subject?.traits) ? subject.traits : []), ...(Array.isArray(subject?.extensions?.traits) ? subject.extensions.traits : [])];
  const targets = [];
  for (const trait of rows) {
    const text = typeof trait === 'string' ? trait : String(trait?.name || trait?.nom || '');
    const inline = /^(.*?)\s*\((.*)\)\s*$/.exec(text);
    const name = normalizeKeywordText(inline ? inline[1] : text);
    if (!wanted.has(name)) continue;
    const param = typeof trait === 'object' && trait?.param != null ? String(trait.param) : inline ? inline[2] : '';
    for (const raw of param.split(/[,;]/).map(item => item.trim()).filter(Boolean)) {
      if (WILDCARDS.has(normalizeKeywordText(raw))) { targets.push({ raw, wildcard: true }); continue; }
      const found = resolveKeyword(raw, referential);
      targets.push(found ? { raw, keywordId: found.id } : { raw });
    }
  }
  return targets;
}

/** Le Trait à cible vise-t-il cet ennemi (mots-clés du participant, déduits compris) ? */
export function traitTargetMatches(subject, names, enemy, referential = activeReferential()) {
  const enemyKeywords = participantKeywords(enemy, referential).ids;
  return traitTargets(subject, names, referential).some(target => target.wildcard || (target.keywordId && keywordMatches(enemyKeywords, target.keywordId, referential)));
}

/** Rapport de migration des spécialisations en texte libre : résolu (mot-clé), joker, ou à migrer (laissé tel quel, comparé par texte). */
export function specializationMigrationReport(rows, referential = activeReferential()) {
  return (rows || []).flatMap(row => {
    const specialization = row?.specialization || row?.specialty;
    if (!isText(specialization)) return [];
    const talentId = row.talentId || row.id || null;
    if (WILDCARDS.has(normalizeKeywordText(specialization))) return [{ talentId, specialization, status: 'joker' }];
    const found = resolveKeyword(specialization, referential);
    return [{ talentId, specialization, status: found ? 'resolu' : 'a-migrer', ...(found ? { keywordId: found.id } : {}) }];
  });
}
