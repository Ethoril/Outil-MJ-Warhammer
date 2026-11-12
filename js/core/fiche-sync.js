// Mise à jour des profils PJ depuis les fiches de personnage (autre projet Firebase).
// Module pur : aucune E/S. La lecture des fiches est dans fiche-source.js, l'écriture
// passe par Store.applyFicheSync (une seule commande annulable).
import { cloneValue, normalizeAction, uid } from './models.js';
import { normalizeEquipment, calculateArmor, armourProtection, equipmentQualities, weaponSkillGroupInfo } from './equipment.js';
import { getReferenceCatalogue, resolveSkill, aggregateTalents } from './reference-catalog.js';
import { actionHasDamage, normalizeDamageFields, strengthBonusOf } from './damage.js';
import { rebaseMagicLayers } from './v5-magic-effects.js';
import { especeDe } from '../data/donnees-communes.js';
import { FAMILIAR_SYSTEMS, HOMUNCULUS_KINDS, FAMILIAR_WINDS, COMPANION_TRAITS, FAMILIAR_NAMES } from './familiars.js';

export const FICHE_CHAR_IDS = Object.freeze(['bhelgi', 'caelel', 'elysia', 'hellaya', 'wren']);

/** Profils types du bestiaire pour un familier déclaré par la fiche (L17 homoncules, L02 animaux ; le corbeau prend la Corneille). */
export const FICHE_FAMILIAR_TEMPLATES = Object.freeze({
  homunculus: { book: 'L17', ids: { combat: 'E0-P-528', power: 'E0-P-529', spell: 'E0-P-530' } },
  animal: { book: 'L02', ids: { fox: 'E0-P-141', owl: 'E0-P-143', stoat: 'E0-P-144', badger: 'E0-P-139', cat: 'E0-P-142', raven: 'E0-P-140' } }
});
export const ficheFamiliarTemplate = familiar => {
  const group = FICHE_FAMILIAR_TEMPLATES[familiar?.system];
  const id = group?.ids[familiar.system === 'homunculus' ? familiar.kind : familiar.species];
  return id ? { book: group.book, id } : null;
};
/** Profil de bibliothèque d'un familier de la fiche : identité stable par fiche et par familier. */
export const ficheFamiliarProfileId = (charId, familiarId) => `fiche-familier-${charId}-${familiarId}`;
const FICHE_KEYWORD_TYPES = Object.freeze(['haine', 'animosite', 'prejuge', 'sans-peur']);

/** `familiers` de la fiche (schéma du 04/11/2026), en clés de l'outil ; null si le champ est absent. */
function ficheFamiliars(raw, warnings) {
  if (!Object.hasOwn(raw, 'familiers')) return null;
  if (!Array.isArray(raw.familiers)) { warnings.push({ field: 'familiars', severity: 'warning', code: 'collection-invalid', consequence: 'previous-values-preserved' }); return null; }
  const valid = row => isRecord(row) && typeof row.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(row.id) && FAMILIAR_SYSTEMS.includes(row.systeme)
    && (row.systeme === 'homunculus' ? HOMUNCULUS_KINDS.includes(row.type) && FAMILIAR_WINDS.includes(row.vent) : row.type === 'power' && Object.hasOwn(COMPANION_TRAITS, row.espece))
    && Number.isSafeInteger(row.destinSacrifie) && row.destinSacrifie >= 1 && row.destinSacrifie <= 100;
  return raw.familiers.flatMap(row => {
    if (!valid(row)) { warnings.push({ field: 'familiars', entry: row?.id ?? null, severity: 'warning', code: 'familiar-invalid', message: 'Familier de la fiche illisible : ignoré.' }); return []; }
    const homunculus = row.systeme === 'homunculus';
    const name = typeof row.nom === 'string' && row.nom.trim() ? row.nom.trim().slice(0, 200) : homunculus ? FAMILIAR_NAMES[row.type] : COMPANION_TRAITS[row.espece].name;
    return [{ id: row.id, system: row.systeme, kind: homunculus ? row.type : 'power', wind: homunculus ? row.vent : null, species: homunculus ? null : row.espece, name, fateSacrificed: row.destinSacrifie }];
  });
}
/** `motsCles` de la fiche : `{ id, cible }` d'un type connu ; null si le champ est absent. */
function ficheKeywordTargets(raw) {
  if (!Object.hasOwn(raw, 'motsCles') || !Array.isArray(raw.motsCles)) return null;
  return raw.motsCles.filter(row => isRecord(row) && FICHE_KEYWORD_TYPES.includes(row.id) && typeof row.cible === 'string' && row.cible.trim())
    .map(row => ({ id: row.id, target: row.cible.trim() }));
}

// Clés de la fiche → clés canoniques du profil.
const CARAC_MAP = Object.freeze({ cc: 'CC', ct: 'CT', f: 'F', e: 'E', i: 'I', ag: 'Ag', dex: 'Dex', int: 'Int', fm: 'FM', soc: 'Soc' });

// Table des compétences de base de la fiche (js/fiche.js, BASIC_SKILLS) : `skillsBasic` ne porte que les avances.
export const FICHE_BASIC_SKILLS = Object.freeze([
  ['Art', 'dex'], ['Athlétisme', 'ag'], ['Calme', 'fm'], ['Charme', 'soc'], ['Chevaucher', 'ag'],
  ['Commandement', 'soc'], ["Conduite d'attelage", 'ag'], ['Corps à corps (Base)', 'cc'], ['Discrétion', 'ag'],
  ['Divertissement', 'soc'], ['Emprise sur les animaux', 'fm'], ['Escalade', 'f'], ['Esquive', 'ag'],
  ['Intimidation', 'f'], ['Intuition', 'i'], ['Marchandage', 'soc'], ['Orientation', 'i'], ['Pari', 'int'],
  ['Perception', 'i'], ['Ragot', 'soc'], ['Ramer', 'f'], ['Résistance', 'e'], ["Résistance à l'alcool", 'e'],
  ['Subornation', 'soc'], ['Survie en extérieur', 'int']
].map(([name, carac]) => Object.freeze({ name, carac })));

const number = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Minuscules sans accents ni espaces superflus, pour comparer des noms. */
export function normalizeName(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Blessures maximum : BF + 2×BE + BFM, +BE par rang de « Dur à cuire » ; adaptations selon espèce.
 * null quand F (sauf espèces sans BF), E ou FM manque : le résultat n'est pas calculable.
 */
export function woundsMax({ totals, race, talents = [] }) {
  const espece = especeDe(race);
  const sansBF = espece?.sansBonusForce === true;
  if (!['E', 'FM', ...(sansBF ? [] : ['F'])].every(key => Number.isFinite(totals?.[key]))) return null;
  const bonus = key => Math.floor(number(totals?.[key]) / 10);
  const hardy = (Array.isArray(talents) ? talents : []).filter(item => normalizeName(item?.nom) === 'dur a cuire').length;
  const strength = sansBF ? 0 : bonus('F');
  return (strength + 2 * bonus('E') + bonus('FM') + hardy * bonus('E')) * (espece?.multiplicateurBlessures ?? 1);
}

/**
 * Fiche brute (`doc.data`) → ce que l'outil en retient : totaux, initiative, blessures max
 * et compétences utilisables (`name`, `carac`, `total`).
 */
const validNumber = value => value !== null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
const own = (object, key) => Object.hasOwn(object, key);
const stable = value => Array.isArray(value) ? value.map(stable) : isRecord(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
/** Deterministic useful-data identity; excludes retrieval time and object key ordering. */
export function ficheFingerprint(value) {
  const json = JSON.stringify(stable(value));
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) hash = Math.imul(hash ^ json.charCodeAt(i), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export const profileSyncFingerprint = profile => ficheFingerprint(profile);

/** Canonical snapshot. Missing and invalid collections never authorise removals. */
export function ficheSnapshot(charId, fiche, metadata = {}) {
  const raw = isRecord(fiche) ? fiche : {};
  const totals = {};
  const warnings = [];
  for (const [key, canonical] of Object.entries(CARAC_MAP)) {
    const entry = raw.carac?.[key];
    if (!isRecord(entry) || !validNumber(entry.base) || (entry.adv != null && !validNumber(entry.adv))) continue;
    totals[canonical] = Number(entry.base) + number(entry.adv);
  }
  const coverage = {};
  const list = (key, destination) => {
    if (!own(raw, key)) { coverage[destination] = 'absent'; return []; }
    if (!Array.isArray(raw[key]) || raw[key].some(item => !isRecord(item) || typeof item.nom !== 'string')) {
      coverage[destination] = 'invalid'; warnings.push({ field: destination, severity: 'warning', code: 'collection-invalid', consequence: 'previous-values-preserved' }); return [];
    }
    coverage[destination] = 'present'; return cloneValue(raw[key]);
  };
  const skills = [];
  const hasSkills = ['skillsBasic', 'skillsAdvanced', 'basicSpecs'].some(key => own(raw, key));
  const skillsValid = (!own(raw, 'skillsBasic') || isRecord(raw.skillsBasic) && Object.values(raw.skillsBasic).every(validNumber))
    && (!own(raw, 'basicSpecs') || isRecord(raw.basicSpecs) && Object.values(raw.basicSpecs).every(v => typeof v === 'string'))
    && (!own(raw, 'skillsAdvanced') || Array.isArray(raw.skillsAdvanced) && raw.skillsAdvanced.every(row => isRecord(row) && typeof row.nom === 'string' && validNumber(row.adv ?? 0)));
  coverage.skills = !hasSkills ? 'absent' : skillsValid ? 'present' : 'invalid';
  if (!skillsValid) warnings.push({ field: 'skills', severity: 'warning', code: 'collection-invalid', consequence: 'previous-values-preserved' });
  const addSkill = (storageKey, name, advances, rawCarac, basic) => {
    const found = resolveSkill(name, { owned: !basic });
    const entry = found?.entry;
    // La fiche fait foi : la carac déclarée sur la ligne prime sur celle du catalogue (Bhelgi : Projectiles sur Dex).
    const knownCarac = value => Boolean(CARAC_MAP[value] || Object.values(CARAC_MAP).includes(value));
    const carac = knownCarac(rawCarac) ? rawCarac : entry?.carac || rawCarac;
    const canonical = CARAC_MAP[carac] || (Object.values(CARAC_MAP).includes(carac) ? carac : null);
    // An unresolved/open slot is retained for consultation, never usable as an action score.
    const open = /\((au choix|.* ou .*|.*\/.*)\)/i.test(name);
    const status = open ? 'open' : found?.status || 'unresolved';
    const total = canonical && Number.isFinite(totals[canonical]) && !open ? totals[canonical] + number(advances) : null;
    if (basic && total === null && !open) return;
    skills.push({ id: entry?.id || null, storageKey, sourceName: name, name: entry?.nom || name, carac: carac || null,
      advances: number(advances), total, specialty: entry?.specialization || specOf(name), basic, status });
    if (status !== 'resolved') warnings.push({ field: 'skills', entry: storageKey, severity: 'warning', code: `skill-${status}`, consequence: 'manual-binding-required' });
  };
  if (skillsValid) {
    const seen = new Set();
    for (const { name, carac } of FICHE_BASIC_SKILLS) {
      const spec = raw.basicSpecs?.[name];
      const fullName = spec ? `${name} (${spec})` : name;
      addSkill(name, fullName, raw.skillsBasic?.[name] ?? 0, carac, true); seen.add(name);
    }
    for (const [name, advances] of Object.entries(raw.skillsBasic || {})) {
      if (seen.has(name)) continue;
      const found = resolveSkill(name);
      addSkill(name, name, advances, found?.entry?.carac, true);
    }
    for (const [index, item] of (raw.skillsAdvanced || []).entries()) addSkill(item.id || `advanced:${index}`, item.nom.trim(), item.adv ?? 0, item.carac, false);
  }
  const talentsRaw = list('talentsAcq', 'talents');
  const talentResult = aggregateTalents(talentsRaw);
  const equipmentResult = normalizeEquipment(raw.equipment, { present: own(raw, 'equipment') });
  coverage.equipment = equipmentResult.coverage;
  warnings.push(...(equipmentResult.warnings || []), ...(talentResult.warnings || []));
  const spells = list('sorts', 'spells');
  const prayers = list('prieres', 'prayers');
  const race = typeof raw.race === 'string' ? raw.race : '';
  const raceKey = normalizeName(race).replace(/[-_]+/g, ' ');
  const movement = especeDe(raceKey)?.mouvement ?? null;
  if (race && movement === null) warnings.push({ field: 'movement', code: 'unknown-species', severity: 'warning', message: `Espèce « ${race} » inconnue : saisir ou confirmer le Mouvement du profil.`, consequence: 'movement-preserved' });
  else if (own(raw, 'race') && !raceKey) warnings.push({ field: 'movement', code: 'race-missing', severity: 'warning', message: 'Espèce non renseignée sur la fiche : Mouvement du profil conservé.', consequence: 'movement-preserved' });
  const max = coverage.talents !== 'present' ? null : woundsMax({ totals, race, talents: talentsRaw });
  if (coverage.talents !== 'present' && Object.keys(totals).length) warnings.push({ field: 'woundsMax', code: 'talents-unavailable', severity: 'warning', message: 'Talents indisponibles : maximum de Blessures antérieur conservé.', consequence: 'health-preserved' });
  const catalog = getReferenceCatalogue();
  const source = { schemaVersion: metadata.schemaVersion ?? null, revision: metadata.revision ?? null,
    resolverVersion: catalog?.contentVersion ?? catalog?.catalogVersion ?? catalog?.version ?? null };
  const snapshot = { format: 1, charId, name: typeof raw.nom === 'string' ? raw.nom.trim() : '', race,
    source, caracs: totals, initiative: totals.I ?? null, movement,
    wounds: max, woundsMax: max, skills, talents: coverage.talents === 'present' ? talentResult.items : [],
    equipment: equipmentResult.items, spells, prayers, coverage, warnings };
  const familiars = ficheFamiliars(raw, warnings);
  if (familiars) snapshot.familiars = familiars.map(row => ({ ...row, profileId: ficheFamiliarProfileId(charId, row.id) }));
  const keywordTargets = ficheKeywordTargets(raw);
  if (keywordTargets) snapshot.keywordTargets = keywordTargets;
  // `fortune` (ex-`chance`) is the fiche's current resource; `destin` is its maximum.
  // Empty/missing/invalid values do not authorize a resource initialization.
  const count = key => own(raw, key) && ((typeof raw[key] === 'string' && /^\d+$/.test(raw[key])) || typeof raw[key] === 'number') && Number.isSafeInteger(Number(raw[key])) && Number(raw[key]) >= 0 ? Number(raw[key]) : null;
  // Champs V5 de la fiche (04/11/2026) : chaîne de 0 à 4 chiffres, la chaîne vide vaut 0.
  const digits = key => own(raw, key) && (typeof raw[key] === 'string' ? /^\d{0,4}$/.test(raw[key]) : Number.isSafeInteger(raw[key]) && raw[key] >= 0) ? Number(raw[key] || 0) : null;
  // `fortune` remplace `chance` ; une fiche pas encore réécrite n'a que `chance`.
  const fortune = digits('fortune') ?? count('chance');
  if (fortune !== null) snapshot.resources = { fortune };
  // B10b : Destin (et Résilience des anciennes fiches ou des profils JSON) lus à la synchronisation (voir `importFicheDurables`).
  const durables = {};
  if (count('destin') !== null) durables.fate = count('destin');
  if (count('resilience') !== null) durables.resilience = count('resilience');
  if (digits('peche') !== null) durables.sin = digits('peche');
  if (digits('corruption') !== null) durables.corruption = digits('corruption');
  if (Object.keys(durables).length) snapshot.durables = durables;
  source.fingerprint = ficheFingerprint(snapshot);
  // Chantier H : valeurs brutes de la fiche à cette lecture, bases des écritures en retour (fiche-writeback.js).
  // Hors empreinte : ce bloc ne change pas l'identité utile de la fiche.
  snapshot.writebackBase = ficheWritebackBase(raw, metadata);
  return snapshot;
}

const WRITEBACK_FIELDS = Object.freeze(['destin', 'fortune', 'peche', 'corruption']);
const WRITEBACK_ROWS = Object.freeze(['talentsAcq', 'equipment', 'skillsAdvanced']);
const duplicateIds = rows => [...new Set(rows.map(row => row.id).filter((id, index, ids) => ids.indexOf(id) !== index))];
/** Un champ ou une collection absents de la fiche restent absents ici : absent n'est jamais « vide ». Identifiants en double relevés. */
function ficheWritebackBase(raw, metadata = {}) {
  const base = { revision: Number.isSafeInteger(metadata.revision) ? metadata.revision : null, fields: {}, carac: {}, rows: {}, unidentified: {}, duplicates: {} };
  for (const key of WRITEBACK_FIELDS) if (own(raw, key)) base.fields[key] = cloneValue(raw[key]);
  // Même règle que migrerFicheV5 côté fiches (appliquée avant toute comparaison) : `fortune` reprend `chance` s'il manque.
  if (!own(raw, 'fortune') && own(raw, 'chance')) base.fields.fortune = cloneValue(raw.chance);
  if (isRecord(raw.carac)) for (const key of Object.keys(CARAC_MAP)) if (isRecord(raw.carac[key])) base.carac[key] = cloneValue(raw.carac[key]);
  for (const key of WRITEBACK_ROWS) {
    if (!own(raw, key) || !Array.isArray(raw[key])) continue;
    const identified = raw[key].filter(row => isRecord(row) && typeof row.id === 'string' && row.id);
    base.rows[key] = Object.fromEntries(identified.map(row => [row.id, cloneValue(row)]));
    if (identified.length !== raw[key].length) base.unidentified[key] = raw[key].length - identified.length;
    const dups = duplicateIds(identified);
    if (dups.length) base.duplicates[key] = dups;
  }
  if (own(raw, 'suiviMj') && Array.isArray(raw.suiviMj)) {
    base.suiviMj = cloneValue(raw.suiviMj);
    const dups = duplicateIds(raw.suiviMj.filter(row => isRecord(row) && typeof row.id === 'string'));
    if (dups.length) base.duplicates.suiviMj = dups;
  }
  return base;
}

/**
 * B10b : Destin et Résilience de la fiche vers `extensions.v5.fate` (canonique ; le miroir `fate` n'est pas écrit) et `extensions.v5.resilience`.
 * La valeur de la fiche s'écrit quand l'outil n'en a pas encore ou quand la fiche a changé par rapport à une valeur précédente connue ; sinon un point débité dans l'outil (création de familier) n'est pas rendu par une relecture.
 */
function importFicheDurables(subject, snapshot, previousSnapshot) {
  const wanted = snapshot?.durables || {};
  const previous = previousSnapshot?.durables || {};
  const v5 = { ...(subject.extensions?.v5 || {}) };
  // Péché (`divine.sin`) et Corruption (`corruptionPoints`) suivent la même règle que le Destin : l'outil les fait évoluer en séance.
  const paths = { fate: ['fate'], resilience: ['resilience'], corruption: ['corruptionPoints'], sin: ['divine', 'sin'] };
  for (const [key, path] of Object.entries(paths)) {
    if (!Number.isSafeInteger(wanted[key])) continue;
    const known = path.length > 1 ? v5[path[0]]?.[path[1]] : v5[path[0]] ?? (key === 'fate' ? subject.fate : undefined);
    // Sans valeur précédente connue (snapshot antérieur à B10b), la valeur de l'outil n'est pas écrasée ; le snapshot garde celle de la fiche.
    const changed = Number.isSafeInteger(previous[key]) && previous[key] !== wanted[key];
    if (!(known === undefined || known === null || known === '' || changed)) continue;
    if (path.length > 1) v5[path[0]] = { ...(v5[path[0]] || {}), [path[1]]: wanted[key] };
    else v5[path[0]] = wanted[key];
  }
  // Familiers et mots-clés : la fiche fait foi dès qu'elle porte le champ.
  if (Array.isArray(snapshot?.familiars)) v5.declaredFamiliars = cloneValue(snapshot.familiars);
  if (Array.isArray(snapshot?.keywordTargets)) v5.keywordTargets = cloneValue(snapshot.keywordTargets);
  if (!Object.keys(v5).some(key => JSON.stringify(v5[key]) !== JSON.stringify(subject.extensions?.v5?.[key]))) return subject;
  return { ...subject, extensions: { ...(subject.extensions || {}), v5 } };
}

// Premier mot significatif d'un nom : articles, particules et mots de moins de 3 lettres sont écartés.
const STOP_WORDS = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'von', 'van', 'the', 'the']);
const firstWord = value => normalizeName(value).split(/[\s'-]+/).find(word => word.length >= 3 && !STOP_WORDS.has(word)) || '';

/**
 * Profil PJ cible de chaque fiche : lien déjà enregistré (`extensions.ficheId`), puis nom
 * (normalisé) égal, puis premier mot du nom de la fiche ou identifiant du personnage.
 * Un profil ne sert qu'une fois. Renvoie { [charId]: profileId | null }.
 */
export function matchFiches(snapshots, profiles) {
  const pjs = (profiles || []).filter(profile => profile?.kind === 'PJ');
  const taken = new Set();
  const result = {};
  const claim = (snapshot, found) => {
    if (!found || taken.has(found.id) || result[snapshot.charId]) return;
    taken.add(found.id); result[snapshot.charId] = found.id;
  };
  for (const snapshot of snapshots) { const linked = pjs.filter(profile => profile.extensions?.ficheId === snapshot.charId); if (linked.length === 1) claim(snapshot, linked[0]); }
  const unique = (snapshot, test) => {
    const found = pjs.filter(profile => !taken.has(profile.id) && !profile.extensions?.ficheId && test(normalizeName(profile.name)));
    return found.length === 1 ? found[0] : null;
  };
  for (const snapshot of snapshots) {
    if (!result[snapshot.charId]) claim(snapshot, unique(snapshot, name => name && name === normalizeName(snapshot.name)));
  }
  // Du plus sûr au plus large : identifiant ou premier mot égal au nom du profil, puis même premier mot.
  const tests = [
    (name, snapshot) => name === snapshot.charId || (Boolean(firstWord(snapshot.name)) && name === firstWord(snapshot.name)),
    (name, snapshot) => Boolean(firstWord(name)) && firstWord(name) === firstWord(snapshot.name)
  ];
  for (const test of tests) {
    for (const snapshot of snapshots) {
      if (!result[snapshot.charId]) claim(snapshot, unique(snapshot, name => name && test(name, snapshot)));
    }
  }
  for (const snapshot of snapshots) result[snapshot.charId] ??= null;
  return result;
}

const RANGED = /\b(arc|arbalete|fronde|javelot|javeline|lance-pierre|pistolet|arquebuse|fusil|tir|lancer|jet)\b/;
// Sorts, morsures et autres capacités : ce ne sont pas des compétences de la fiche.
const NO_SKILL = /\b(sorts?|morsures?|griffes?|souffles?|prieres?)\b/;
const PARRY = /\b(parade|parer|bouclier)\b/;

const skillNamed = (skills, name) => skills.find(skill => normalizeName(skill.name) === normalizeName(name))?.name || '';
const specOf = name => (String(name).match(/\(([^)]+)\)\s*$/)?.[1] || '');

/** Compétence de la fiche proposée pour une action (nom exact, ou '' si rien ne convient). */
export function suggestSkill(action, skills) {
  const list = Array.isArray(skills) ? skills : [];
  const name = normalizeName(action?.note);
  const type = action?.type || '';
  if (NO_SKILL.test(name)) return '';
  const melee = () => {
    const group = list.filter(skill => normalizeName(skill.name).startsWith('corps a corps'));
    const byName = group.find(skill => specOf(skill.name) && name.includes(normalizeName(specOf(skill.name))) && normalizeName(specOf(skill.name)) !== 'base');
    return byName?.name || skillNamed(list, 'Corps à corps (Base)');
  };
  const ranged = () => {
    const group = list.filter(skill => normalizeName(skill.name).startsWith('projectiles'));
    const bySpec = group.find(skill => specOf(skill.name) && name.includes(normalizeName(specOf(skill.name))));
    return bySpec?.name || (group.length === 1 ? group[0].name : '');
  };
  if (type === 'defense') return PARRY.test(name) ? melee() : skillNamed(list, 'Esquive');
  if (type === 'attack') return RANGED.test(name) ? ranged() : melee();
  if (!name) return '';
  const exact = list.find(skill => normalizeName(skill.name) === name);
  if (exact) return exact.name;
  // Correspondance large : mots entiers d'au moins 4 lettres seulement.
  const contains = (hay, needle) => needle.length >= 4 && new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(hay);
  const loose = list.find(skill => {
    const skillName = normalizeName(skill.name);
    const group = normalizeName(skill.name.replace(/\s*\([^)]*\)\s*$/, ''));
    return contains(name, skillName) || contains(skillName, name) || contains(name, group);
  });
  return loose?.name || '';
}

const bonusFormula = bonus => (bonus === 0 ? 'BF' : `BF${bonus > 0 ? '+' : '-'}${Math.abs(bonus)}`);

/**
 * Plan de mise à jour d'un profil depuis une fiche, sans rien écrire.
 * `choices.links` : { [actionId]: nom de compétence | '' (aucune) } ; sinon le lien enregistré ; une proposition exige confirmation.
 * `choices.convert` : { [actionId]: true } confirme la conversion initiale des dégâts fixes.
 */
export const equipmentActionKey = (charId, equipmentId, role) => `${charId}:${equipmentId}:${role}`;
const equipmentActionId = key => `fiche:${key}`;
const sourceActionKey = action => action?.extensions?.fiche?.equipmentId
  ? equipmentActionKey(action.extensions.fiche.charId, action.extensions.fiche.equipmentId, action.extensions.fiche.role) : null;
const collectionDiff = (old = [], current = [], identity = item => item.id || item.storageKey || item.name) => {
  const previous = new Map((Array.isArray(old) ? old : []).map(row => [identity(row), row]));
  const next = new Map((Array.isArray(current) ? current : []).map(row => [identity(row), row]));
  return {
    added: [...next].filter(([id]) => !previous.has(id)).map(([, row]) => cloneValue(row)),
    changed: [...next].filter(([id, row]) => previous.has(id) && ficheFingerprint(previous.get(id)) !== ficheFingerprint(row)).map(([id, row]) => ({ id, old: cloneValue(previous.get(id)), new: cloneValue(row) })),
    removed: [...previous].filter(([id]) => !next.has(id)).map(([, row]) => cloneValue(row))
  };
};
const findSkill = (skills, key) => {
  if (!key) return null;
  const list = (skills || []).filter(skill => Number.isFinite(skill.total) && !['open', 'ambiguous'].includes(skill.status));
  const byStorage = list.filter(skill => skill.storageKey === key);
  if (byStorage.length === 1) return byStorage[0];
  const candidates = list.filter(skill => skill.id === key || skill.name === key);
  return candidates.length === 1 ? candidates[0] : null;
};
const usableMax = snapshot => Object.hasOwn(snapshot, 'woundsMax') ? snapshot.woundsMax : snapshot.wounds;

/** Health keeps signed wounds suffered. No cap, state transition or guessed old maximum. */
export function planHealthSync(subject, newMax, { template = false } = {}) {
  const oldMax = validNumber(subject.maxHp) ? Number(subject.maxHp) : template && validNumber(subject.hp) ? Number(subject.hp) : null;
  const computable = Number.isFinite(newMax);
  const oldHp = Number(subject.hp) || 0;
  const warning = !computable ? 'new-maximum-unknown' : oldMax === null ? 'old-maximum-unknown' : template && oldHp !== oldMax ? 'reserve-health-normalized' : oldHp > oldMax ? 'hp-above-maximum' : null;
  return { old: oldHp, new: !computable ? oldHp : template ? newMax : oldMax === null ? oldHp : oldHp + newMax - oldMax,
    oldMax, newMax: computable ? newMax : oldMax, computable, warning,
    suffered: oldMax === null ? null : oldMax - oldHp };
}
const maxPatch = (subject, max, options) => {
  const health = planHealthSync(subject, max, options);
  return health.computable ? { hp: health.new, maxHp: health.newMax } : {};
};

// IDs from the V4 catalogue whose V5 source rows moved or merged. Their old
// instances remain playable until the MJ explicitly replaces them.
const MOVED_EQUIPMENT_IDS = new Map([
  ['weapon-armes-corps-a-corps-parade-brise-epee', 'weapon-armes-corps-a-corps-escrime-brise-epee'],
  ['weapon-armes-corps-a-corps-parade-main-gauche', 'weapon-armes-corps-a-corps-escrime-main-gauche'],
  ['weapon-armes-corps-a-corps-parade-cape', 'weapon-armes-corps-a-corps-base-cape'],
  ['weapon-armes-corps-a-corps-parade-filet-druchii', 'weapon-armes-corps-a-corps-base-filet-druchii'],
  ['weapon-armes-corps-a-corps-parade-filet-leste-2m', 'weapon-armes-a-distance-entraves-filet'],
  ['weapon-armes-a-distance-lancer-bolas', 'weapon-armes-a-distance-entraves-bolas'],
  ['weapon-armes-a-distance-poudre-noire-long-fusil-d-hochland-2m', 'weapon-armes-a-distance-ingenierie-long-fusil-d-hochland-2m'],
  ['weapon-armes-a-distance-poudre-noire-mousquet-2m', 'weapon-armes-a-distance-poudre-noire-mousquet-a-meche-2m'],
  ['weapon-armes-a-distance-poudre-noire-pistolet-2', 'weapon-armes-a-distance-poudre-noire-pistolet'],
  ['weapon-armes-corps-a-corps-fleau-fleau-a-grain', 'weapon-armes-corps-a-corps-fleau-fleau-a-grain-2m'],
  ['weapon-armes-a-distance-entraves-fouet', 'weapon-armes-corps-a-corps-fleau-fouet'],
  ['weapon-armes-a-distance-entraves-lasso', 'weapon-armes-a-distance-entraves-lasso-2m'],
  ['shield-armes-corps-a-corps-bouclier-bouclier-haut-elfe', 'shield-armures-bouclier-bouclier-haut-elfe'],
  ['shield-armes-corps-a-corps-bouclier-bouclier', 'shield-armures-bouclier-bouclier'],
  ['shield-armes-corps-a-corps-bouclier-pavois', 'shield-armures-bouclier-pavois-pavise'],
  ['shield-armes-corps-a-corps-bouclier-targe-buckler', 'shield-armures-bouclier-targe-buckler'],
  ['shield-armes-corps-a-corps-bouclier-bouclier-standard', 'shield-armures-bouclier-bouclier'],
  ['shield-armes-corps-a-corps-bouclier-grand-bouclier', 'shield-armures-bouclier-grand-bouclier'],
  ['shield-armes-corps-a-corps-bouclier-pavois-pavise', 'shield-armures-bouclier-pavois-pavise']
]);

function proposeEquipmentSkill(item, role, skills) {
  if(item.kind==='weapon'&&String(item.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='ingenierie'){
    const group=weaponSkillGroupInfo(item.category,item);if(!group)return '';
    const skillName=`${group.kind==='ranged'?'Projectiles':'Corps à corps'} (Ingénierie)`,match=resolveSkill(skillName),found=(match?.entry&&findSkill(skills,match.entry.id))||findSkill(skills,skillName);
    return found?.name||'';
  }
  const ranged = item.kind !== 'shield' && Boolean(String(item.range || '').trim());
  const category = ({ "Arme d'Hast": 'Hast', "Armes d'Hast": 'Hast', 'Deux-Mains': 'Deux mains', 'Bouclier': 'Base', 'Poudre Noire': 'Poudre noire', 'Explosif': 'Explosifs' })[item.category] || String(item.category || '').trim();
  // Category comes from the source object, never a guessed characteristic from a weapon name.
  const candidates = ranged ? [`Projectiles (${category})`] : [`Corps à corps (${category})`];
  if (item.kind === 'shield' || /^(base|basique|armes de base)$/i.test(category)) candidates.push('Corps à corps (Base)');
  for (const name of candidates) {
    const match = resolveSkill(name);
    const found = (match?.entry && findSkill(skills, match.entry.id)) || findSkill(skills, name);
    if (found) return found.name;
  }
  return '';
}

export const FICHE_COUNTER_LABELS = Object.freeze({ fate: 'Destin', fortune: 'Chance', resilience: 'Résilience', sin: 'Péché', corruption: 'Corruption' });
const COUNTER_READERS = Object.freeze({
  fate: subject => subject?.extensions?.v5?.fate ?? subject?.fate,
  fortune: subject => subject?.ficheSnapshot?.resources?.fortune,
  resilience: subject => subject?.extensions?.v5?.resilience,
  sin: subject => subject?.extensions?.v5?.divine?.sin,
  corruption: subject => subject?.extensions?.v5?.corruptionPoints
});
const talentLabel = row => { const name = row?.name || row?.nom || row?.id || '?'; const spec = row?.specialty || row?.specialization; return spec && !normalizeName(name).includes(normalizeName(spec)) ? `${name} (${spec})` : String(name); };
const talentIdentity = row => `${row.id || row.name || row.nom}:${row.specialty || row.specialization || ''}`;
const namedDiff = (old, current, identity, label) => {
  const before = new Map((Array.isArray(old) ? old : []).map(row => [identity(row), row]));
  const after = new Map((Array.isArray(current) ? current : []).map(row => [identity(row), row]));
  return { added: [...after].filter(([id]) => !before.has(id)).map(([, row]) => label(row)), removed: [...before].filter(([id]) => !after.has(id)).map(([, row]) => label(row)) };
};
/** Ce que la synchronisation change nommément sur le profil (ancien profil → profil écrit) : Mouvement, compteurs, talents et objets. */
export function profileSyncDetails(profile, updated) {
  const counters = Object.entries(COUNTER_READERS).map(([key, read]) => ({ key, label: FICHE_COUNTER_LABELS[key], old: read(profile) ?? null, new: read(updated) ?? null }))
    .filter(row => String(row.old) !== String(row.new));
  return {
    movement: String(profile.movement ?? '') !== String(updated.movement ?? '') ? { old: profile.movement ?? null, new: updated.movement ?? null } : null,
    counters,
    talents: namedDiff(profile.talents, updated.talents, talentIdentity, talentLabel),
    equipment: namedDiff(profile.equipment, updated.equipment, row => row.id || row.name, row => String(row.name || row.id || '?'))
  };
}

/** Pure preview and complete candidate. Explicit first bindings/adoptions only. */
export function planProfileSync(snapshot, profile, choices = {}) {
  const { links = {}, convert = {}, equipmentLinks = {}, adoptActions = {} } = choices;
  const sourceCharIds = new Set([snapshot.charId, ...(choices.replaceAssociation === true && profile.extensions?.ficheId ? [profile.extensions.ficheId] : [])]);
  const availableSkills = ['invalid', 'absent'].includes(snapshot.coverage?.skills) ? (profile.skills || []) : snapshot.skills;
  const oldCaracs = profile.caracs || {};
  const caracs = Object.entries(snapshot.caracs).map(([key, value]) => ({ key, old: oldCaracs[key] ?? null, new: value, changed: oldCaracs[key] !== value }));
  const oldBonus = validNumber(oldCaracs.F) ? strengthBonusOf({ F: oldCaracs.F }) : null;
  const updated = cloneValue(profile);
  const allActions = (profile.diceLines || []).map(raw => ({ ...cloneValue(raw), extensions: cloneValue(raw.extensions || {}) }));
  const actions = allActions.filter(action => !sourceActionKey(action)).map(action => {
    const stored = action.extensions?.ficheSkill;
    const proposed = suggestSkill(action, availableSkills.filter(skill => Number.isFinite(skill.total) && skill.status !== 'open'));
    const wanted = own(links, action.id) ? links[action.id] : (typeof stored === 'string' ? stored : '');
    const skill = findSkill(availableSkills, wanted) || null;
    const missing = !own(links, action.id) && stored && !skill ? stored : null;
    const fixed = action.type === 'attack' && !action.damageFormula && actionHasDamage(action) && oldBonus !== null;
    // The initial conversion is explicitly selected too; old independent actions stay independent.
    const enabled = own(convert, action.id) ? convert[action.id] === true : typeof stored === 'string' && stored !== '';
    const damage = fixed ? { from: action.damage, bonus: action.damage - oldBonus, formula: bonusFormula(action.damage - oldBonus), enabled } : null;
    return { id: action.id, name: action.note, type: action.type || '', skill: skill?.name || '', skillId: skill?.id || null,
      missing, stored: typeof stored === 'string' ? stored : null, proposed: !own(links, action.id) && typeof stored !== 'string' ? proposed : '',
      oldBase: action.base, newBase: skill ? skill.total : action.base, baseChanged: Boolean(skill) && String(action.base) !== String(skill.total), damage,
      confirmed: own(links, action.id) || typeof stored === 'string' };
  });
  const byId = new Map(actions.map(action => [action.id, action]));
  updated.diceLines = allActions.map(raw => {
    const planned = byId.get(raw.id);
    if (!planned) return cloneValue(raw);
    const action = cloneValue(raw);
    if (planned.skill) action.base = planned.newBase;
    if (planned.confirmed && !planned.missing) {
      action.extensions.ficheSkill = planned.skill;
      action.extensions.fiche = { ...(action.extensions.fiche || {}), charId: snapshot.charId, role: 'skill', skillId: planned.skillId, skillName: planned.skill, bindingVersion: 1 };
    }
    if (planned.damage?.enabled) Object.assign(action, normalizeDamageFields({ damage: planned.damage.bonus, damageFormula: planned.damage.formula }));
    return action;
  });
  const collections = {};
  for (const key of ['skills', 'talents', 'equipment', 'spells', 'prayers']) {
    const coverage = snapshot.coverage?.[key] ?? 'present';
    collections[key] = { coverage, ...(coverage === 'present' ? collectionDiff(profile[key], snapshot[key], key === 'talents' ? talentIdentity : undefined) : { added: [], changed: [], removed: [] }) };
    if (coverage === 'present') updated[key] = cloneValue(snapshot[key] || []);
  }
  // A catalogue refresh can remove or rename a source row while a profile still
  // owns an older playable instance (including V4 keywords or local edits).
  // Keep those rows verbatim; reconciliation/conversion requires an explicit MJ action.
  const sourceEquipment = cloneValue(snapshot.equipment || []);
  const equipmentModelId = item => item?.baseId || item?.id;
  const currentEquipmentIds = new Set(sourceEquipment.map(item => item.id));
  const incomingById = new Map(sourceEquipment.map(item => [item.id, item]));
  const oldByTargetModel = new Map();
  for (const item of profile.equipment || []) {
    if (currentEquipmentIds.has(item.id)) continue;
    const targetModel = MOVED_EQUIPMENT_IDS.get(equipmentModelId(item));
    if (targetModel) oldByTargetModel.set(targetModel, [...(oldByTargetModel.get(targetModel) || []), item]);
  }
  const incomingByModel = new Map();
  for (const item of sourceEquipment) {
    const modelId = equipmentModelId(item);
    incomingByModel.set(modelId, [...(incomingByModel.get(modelId) || []), item]);
  }
  const retainedEquipmentIds = new Set();
  const equipmentWarnings = [];
  const conflictTargets = new Set();
  const preserveById = new Map();
  for (const oldItem of profile.equipment || []) {
    const incoming = incomingById.get(oldItem.id);
    if (incoming && equipmentModelId(oldItem) !== equipmentModelId(incoming)) {
      preserveById.set(oldItem.id, oldItem);
      retainedEquipmentIds.add(oldItem.id);
      conflictTargets.add(oldItem.id);
      equipmentWarnings.push({ field: 'equipment', code: 'moved-instance-arbitration-required', severity: 'warning',
        message: `« ${oldItem.name || oldItem.id} » (instance ${oldItem.id}, modèle ${equipmentModelId(oldItem)}) devient « ${incoming.name || incoming.id} » (instance ${incoming.id}, modèle ${equipmentModelId(incoming)}). L’identité paraît la même mais le modèle change. Vérifiez ces deux lignes dans la fiche externe, décidez si c’est le même exemplaire ou deux objets différents, corrigez la fiche, puis relisez-la.`,
        consequence: 'previous-values-preserved' });
    }
  }
  for (const [targetModel, oldItems] of oldByTargetModel) {
    const incoming = incomingByModel.get(targetModel) || [];
    if (!incoming.length) continue; // An absent corresponding instance is a deliberate removal.
    conflictTargets.add(targetModel);
    for (const item of oldItems) retainedEquipmentIds.add(item.id);
    equipmentWarnings.push({ field: 'equipment', code: 'moved-instance-arbitration-required', severity: 'warning',
        message: `Ancien(s) : ${oldItems.map(item => `« ${item.name || item.id} » (instance ${item.id})`).join(', ')}. Candidat(s) V5 : ${incoming.map(item => `« ${item.name || item.id} » (instance ${item.id})`).join(', ')}. Les modèles correspondent à ${targetModel}, mais les IDs d’instance diffèrent : l’outil ne peut pas savoir s’il s’agit des mêmes objets. Vérifiez les lignes dans la fiche externe, corrigez-la selon votre décision, puis relisez-la.`,
        consequence: 'previous-values-preserved' });
  }
  const nextEquipment = [];
  for (const item of sourceEquipment) {
    const modelId = equipmentModelId(item);
    if (conflictTargets.has(modelId) || conflictTargets.has(item.id)) continue;
    nextEquipment.push(cloneValue(item));
  }
  for (const oldItem of profile.equipment || []) if (retainedEquipmentIds.has(oldItem.id)) nextEquipment.push(cloneValue(preserveById.get(oldItem.id) || oldItem));
  if (snapshot.coverage?.equipment === 'present') updated.equipment = nextEquipment;
  const equipmentActions = [];
  const removedActions = [];
  if (snapshot.coverage?.equipment === 'present') {
    const currentKeys = new Set();
    const adoptedIds = new Set();
    for (const item of updated.equipment || []) {
      // The old instance is the authoritative playable copy until the MJ replaces
      // it explicitly. Keep its linked actions byte-for-byte and do not rebuild PA.
      if (retainedEquipmentIds.has(item.id)) continue;
      if (!['weapon', 'shield'].includes(item.kind)) continue;
      const offensive = item.damage !== null && item.damage !== undefined && String(item.damage).trim() !== '';
      const roles = item.kind === 'shield' ? (offensive ? ['attack', 'defense'] : ['defense']) : !String(item.range || '').trim() ? ['attack', 'defense'] : ['attack'];
      for (const role of roles) {
        const key = equipmentActionKey(snapshot.charId, item.id, role);
        currentKeys.add(key);
        const previous = allActions.find(action => sourceActionKey(action) === key);
        const requestedAdoption = adoptActions[key];
        const adopted = !previous && requestedAdoption ? updated.diceLines.find(action => action.id === requestedAdoption && !sourceActionKey(action) && !adoptedIds.has(action.id)) : null;
        if (adopted) adoptedIds.add(adopted.id);
        const stored = previous?.extensions?.fiche;
        const wanted = own(equipmentLinks, key) ? equipmentLinks[key] : stored?.skillId || stored?.skillName || '';
        const skill = findSkill(availableSkills, wanted);
        const proposed = proposeEquipmentSkill(item, role, availableSkills);
        const weaponGroup = item.kind === 'weapon' && weaponSkillGroupInfo(item.category,item);
        const fallbackAttr = weaponGroup?.kind === 'ranged' || String(item.range || '').trim() ? 'CT' : 'CC';
        const noSkillException = weaponGroup?.kind==='ranged'&&['arbalete','lancer','sarbacane'].includes(String(item.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
        const fallbackCarac = item.kind === 'weapon' && !wanted && (weaponGroup?.kind==='melee'||noSkillException) ? snapshot.caracs[fallbackAttr] : null;
        const linked = Boolean(skill) || role === 'attack' && item.kind === 'weapon' && !wanted && (weaponGroup?.kind==='melee'||noSkillException);
        const action = normalizeAction({ ...(previous || adopted || {}), id: previous?.id || adopted?.id || equipmentActionId(key),
          note: role === 'defense' ? `Parade — ${item.name}` : item.name, type: role,
          base: skill?.total ?? fallbackCarac ?? '', attr: skill?.carac || (fallbackCarac !== null ? fallbackAttr : 'Custom'),
          ...normalizeDamageFields({ damage: role === 'attack' ? item.damage : 0 }),
          qualities: equipmentQualities(item),
          extensions: { ...(previous?.extensions || adopted?.extensions || {}), fiche: { charId: snapshot.charId, equipmentId: item.id, role,
            skillId: skill?.id || null, skillName: skill?.name || '', bindingVersion: 1,
            syncedWeaponSkillScore: skill?.total ?? null,
            equipmentVersion: item.catalogVersion ?? null, requiresLink: !linked }, equipment: cloneValue(item) } });
        const change = previous ? ficheFingerprint(previous) === ficheFingerprint(action) ? 'unchanged' : 'changed' : adopted ? 'adopted' : 'added';
        equipmentActions.push({ id: action.id, key, equipmentId: item.id, role, name: action.note, skill: skill?.name || '', proposed,
          requiresLink: !skill, change, adoptCandidates: allActions.filter(row => !sourceActionKey(row) && row.type === role).map(row => ({ id: row.id, name: row.note })), action });
      }
    }
    const retiredActions = allActions.filter(action => sourceCharIds.has(action.extensions?.fiche?.charId) && sourceActionKey(action)
      && !currentKeys.has(sourceActionKey(action)) && retainedEquipmentIds.has(action.extensions?.fiche?.equipmentId));
    removedActions.push(...allActions.filter(action => sourceCharIds.has(action.extensions?.fiche?.charId) && sourceActionKey(action)
      && !currentKeys.has(sourceActionKey(action)) && !retainedEquipmentIds.has(action.extensions?.fiche?.equipmentId)).map(action => ({ id: action.id, name: action.note })));
    updated.diceLines = updated.diceLines.filter(action => !(sourceCharIds.has(action.extensions?.fiche?.charId) && sourceActionKey(action)) && !adoptedIds.has(action.id));
    updated.diceLines.push(...retiredActions.map(cloneValue));
    updated.diceLines.push(...equipmentActions.map(row => row.action));
    updated.armorLocations = calculateArmor(updated.equipment);
    updated.protection = armourProtection(updated.equipment);
  }
  updated.caracs = { ...profile.caracs, ...snapshot.caracs };
  if (snapshot.initiative !== null) updated.initiative = snapshot.initiative;
  if (snapshot.movement != null) updated.movement = snapshot.movement;
  if (snapshot.race) updated.race = snapshot.race;
  const health = planHealthSync(profile, usableMax(snapshot), { template: true });
  Object.assign(updated, maxPatch(profile, usableMax(snapshot), { template: true }));
  updated.extensions = { ...(profile.extensions || {}), ficheId: snapshot.charId };
  delete updated.extensions.ficheHealthWarning;
  Object.assign(updated, importFicheDurables(updated, snapshot, profile.ficheSnapshot));
  // Keep latest source status, but each excluded collection retains its previous playable data.
  updated.ficheSnapshot = cloneValue(snapshot);
  const warnings = [...cloneValue(snapshot.warnings || []), ...equipmentWarnings];
  if (health.warning) warnings.push({ field: 'hp', code: health.warning, severity: 'warning', ...(health.warning === 'reserve-health-normalized' ? { message: 'Ancienne réserve avec PV courants : la réserve reprend le maximum de fiche ; les Blessures subies restent conservées dans les participants et personnages persistants déjà enregistrés.' } : {}), consequence: health.warning === 'old-maximum-unknown' ? 'hp-preserved' : 'signed-wounds-preserved' });
  const details = profileSyncDetails(profile, updated);
  return { profileId: profile.id, charId: snapshot.charId, name: profile.name, caracs, details,
    initiative: { old: profile.initiative, new: snapshot.initiative ?? profile.initiative },
    hp: { old: health.old, new: health.new, computable: health.computable }, health, actions, collections,
    equipmentActions, removedActions, protection: { old: profile.armorLocations || null, new: updated.armorLocations || null }, warnings,
    precondition: { profileFingerprint: profileSyncFingerprint(profile), sourceFingerprint: snapshot.source?.fingerprint || null },
    updated, changed: ficheFingerprint(profile) !== ficheFingerprint(updated) };
}

/** Apply all profiles in one immutable draft; every live copy uses its own old maximum once. */
export function applyFicheSync(draft, entries) {
  // Premier import : le profil PJ vierge d'une entrée `newProfile` rejoint la bibliothèque avant la synchronisation.
  const created = (entries || []).filter(entry => entry.newProfile?.id && entry.newProfile.kind === 'PJ' && !(draft.reserve || []).some(row => row.id === entry.newProfile.id));
  if (created.length) draft = { ...draft, reserve: [...(draft.reserve || []), ...created.map(entry => cloneValue(entry.newProfile))] };
  let next = cloneValue(draft);
  const changedNames = [];
  // Preconditions are checked before changing any profile, making a stale multi-PJ batch atomic.
  for (const entry of entries || []) {
    const profile = (draft.reserve || []).find(row => row.id === entry.profileId);
    if (!profile || !entry.snapshot) continue;
    const expected = entry.expectedProfileFingerprint || entry.precondition?.profileFingerprint;
    if (expected && expected !== profileSyncFingerprint(profile)) throw Object.assign(new Error('Le profil a changé depuis l’aperçu : actualisez la synchronisation.'), { code: 'fiche-plan-stale' });
    if (profile.extensions?.ficheId && profile.extensions.ficheId !== entry.snapshot.charId && entry.replaceAssociation !== true) throw Object.assign(new Error('Le remplacement du lien de fiche doit être confirmé.'), { code: 'fiche-association-conflict' });
    const equipmentConflict = planProfileSync(entry.snapshot, profile, entry).warnings.find(warning => warning.code === 'moved-instance-arbitration-required');
    if (equipmentConflict) throw Object.assign(new Error('La synchronisation est suspendue : une correspondance d’équipement déplacé est incertaine. Arbitrez les exemplaires dans la fiche avant de réessayer.'), { code: 'fiche-equipment-arbitration-required' });
  }
  const applied = new Set();
  for (const entry of entries || []) {
    if (applied.has(entry.profileId)) continue;
    applied.add(entry.profileId);
    const index = (next.reserve || []).findIndex(profile => profile.id === entry.profileId);
    if (index < 0 || !entry.snapshot) continue;
    const profile = next.reserve[index];
    const plan = planProfileSync(entry.snapshot, profile, entry);
    const updated = plan.updated;
    next.reserve[index] = updated;
    // Familiers de la fiche : un profil de bibliothèque chacun (profil type du bestiaire fourni par l'appelant, sinon vierge), renommé si la fiche change.
    for (const familiar of entry.snapshot.familiars || []) {
      const at = next.reserve.findIndex(row => row.id === familiar.profileId);
      if (at >= 0) { if (next.reserve[at].name !== familiar.name) next.reserve[at] = { ...next.reserve[at], name: familiar.name }; continue; }
      const template = entry.familiarProfiles?.[familiar.id];
      next.reserve.push({ caracs: {}, skills: [], talents: [], equipment: [], diceLines: [], traits: [], hp: 0, maxHp: 0, kind: 'Créature', ...cloneValue(template || {}),
        id: familiar.profileId, name: familiar.name,
        extensions: { ...cloneValue(template?.extensions || {}), ficheFamiliar: { charId: entry.snapshot.charId, id: familiar.id } } });
    }
    const profileActions = new Map(updated.diceLines.map(action => [action.id, action]));
    const equipmentActions = new Map(updated.diceLines.filter(sourceActionKey).map(action => [sourceActionKey(action), action]));
    const sourceCharIds = new Set([entry.snapshot.charId, ...(entry.replaceAssociation === true && profile.extensions?.ficheId ? [profile.extensions.ficheId] : [])]);
    const syncActions = rawActions => {
      const seen = new Set();
      const result = [];
      for (const raw of rawActions || []) {
        const key = sourceActionKey(raw);
        // Only source-linked actions are removed. Never delete a merely similar local action.
        if (key && sourceCharIds.has(raw.extensions?.fiche?.charId) && !equipmentActions.has(key) && entry.snapshot.coverage?.equipment === 'present') continue;
        const originId = raw.extensions?.profileActionId || raw.id;
        // A historic name/type fallback also needs a confirmed binding on the copy.
        // A same-named improvised action is never evidence of profile origin.
        const binding = raw.extensions?.ficheSkill;
        const skillId = raw.extensions?.fiche?.role === 'skill' ? raw.extensions.fiche.skillId : null;
        const declared = plan.actions.filter(row => row.confirmed && !row.missing && row.type === raw.type && normalizeName(row.name) === normalizeName(raw.note)
          && ((typeof binding === 'string' && binding !== '' && binding === row.skill) || (skillId && skillId === row.skillId)));
        const source = key ? equipmentActions.get(key) : profileActions.get(originId) || (declared.length === 1 ? profileActions.get(declared[0].id) : null);
        if (!source) { result.push(cloneValue(raw)); continue; }
        const syncedKey = sourceActionKey(source);
        if (syncedKey) seen.add(syncedKey);
        // Preserve scene adjustments/target/ammunition/context and independent action IDs.
        const extensions = { ...(raw.extensions || {}), ...cloneValue(source.extensions) };
        if (source.extensions?.v5 || raw.extensions?.v5) {
          extensions.v5 = { ...(source.extensions?.v5 || {}), ...(raw.extensions?.v5 || {}) };
          // A live legacy threshold adjustment is still awaiting the MJ's
          // explicit conversion. A library DR must not silently replace it.
          if (raw.mod && raw.extensions?.v5?.slModifier == null) delete extensions.v5.slModifier;
        }
        const copy = { ...cloneValue(source), ...cloneValue(raw), base: source.base, note: source.note, damage: source.damage,
          qualities: cloneValue(source.qualities), extensions };
        if (source.damageFormula) copy.damageFormula = source.damageFormula; else delete copy.damageFormula;
        result.push(copy);
      }
      for (const [key, source] of equipmentActions) if (!seen.has(key)) result.push(cloneValue(source));
      return result;
    };
    const copyFields = subject => {
      const extensions = { ...(subject.extensions || {}), ficheId: entry.snapshot.charId };
      delete extensions.ficheHealthWarning;
      const output = { ...subject, caracs: { ...subject.caracs, ...entry.snapshot.caracs },
        ...maxPatch(subject, usableMax(entry.snapshot)),
        extensions,
        ficheSnapshot: cloneValue(updated.ficheSnapshot) };
      for (const key of ['skills', 'talents', 'equipment', 'spells', 'prayers']) if (entry.snapshot.coverage?.[key] === 'present') output[key] = cloneValue(updated[key]);
      for (const key of ['initiative', 'movement', 'race']) if (updated[key] != null && (key !== 'movement' || entry.snapshot.movement != null)) output[key] = updated[key];
      if (entry.snapshot.coverage?.equipment === 'present') {
        output.armorLocations = cloneValue(updated.armorLocations); output.protection = cloneValue(updated.protection);
      }
      if (Array.isArray(subject.actions)) output.actions = syncActions(subject.actions);
      // S-05 : la fiche est la nouvelle base ; les couches magiques actives se recalculent dessus (jamais l'inverse).
      const magic = subject.extensions?.v5;
      if (magic?.baseCaracs || magic?.spellEffects?.length || magic?.beastForm) {
        const rebased = rebaseMagicLayers(subject, { caracs: entry.snapshot.caracs, ...(entry.snapshot.movement != null ? { movement: updated.movement } : {}),
          ...(entry.snapshot.coverage?.equipment === 'present' ? { armor: updated.armorLocations } : {}) });
        output.caracs = rebased.caracs;
        output.extensions = { ...output.extensions, v5: rebased.extensions.v5 };
        if (rebased.armor !== undefined) output.armor = rebased.armor;
        for (const key of ['M', 'movement']) if (rebased[key] !== undefined) output[key] = rebased[key];
      }
      if(magic?.beastForm){
        const form=output.extensions.v5.beastForm,original=form.originalParticipant;
        form.deferredFicheSync=true;
        if(original){
          const maximum=usableMax(entry.snapshot);if(maximum!=null){const lost=Math.max(0,original.maxHp-original.hp);original.maxHp=maximum;original.hp=Math.max(0,maximum-lost);}
          original.fields ||= {};
          for(const key of ['skills','talents','equipment'])if(entry.snapshot.coverage?.[key]==='present')original.fields[key]=cloneValue(updated[key]);
          if(entry.snapshot.coverage?.equipment==='present'){
            original.fields.armorLocations=cloneValue(updated.armorLocations);original.fields.protection=cloneValue(updated.protection);original.fields.armor=cloneValue(updated.armorLocations);
            original.baseArmor={extension:cloneValue(updated.armorLocations),flat:cloneValue(updated.armorLocations)};
          }
          if(entry.snapshot.movement!=null)original.M=entry.snapshot.movement;
        }
        for(const key of ['maxHp','hp','skills','talents','equipment','actions','armorLocations','armor','protection','M','movement']){if(subject[key]!==undefined)output[key]=cloneValue(subject[key]);else delete output[key];}
      }
      return importFicheDurables(output, entry.snapshot, subject.ficheSnapshot);
    };
    const touchedIds = new Set();
    if (next.combat) {
      next.combat.participants = (next.combat.participants || []).map(subject => {
        if (subject.profileId !== profile.id) return subject;
        touchedIds.add(subject.id); return copyFields(subject);
      });
    }
    // ActiveScene is a mirror of combat. Copy the already-updated participant to avoid a second delta.
    const combatById = new Map((next.combat?.participants || []).map(item => [item.id, item]));
    // Le miroir `fate` n'existe que sur les participants du combat (modèle) : la copie de scène garde la forme de la scène.
    const sceneCopy = subject => { const copy = cloneValue(combatById.get(subject.id)); if (!own(subject, 'fate')) delete copy.fate; return copy; };
    const syncScene = scene => scene ? { ...scene, participants: (scene.participants || []).map(subject => subject.profileId !== profile.id ? subject : touchedIds.has(subject.id) ? sceneCopy(subject) : copyFields(subject)) } : scene;
    if (next.activeScene) next.activeScene = syncScene(next.activeScene);
    if (Array.isArray(next.suspendedScenes)) next.suspendedScenes = next.suspendedScenes.map(scene => ({ ...scene, participants: (scene.participants || []).map(subject => subject.profileId === profile.id ? copyFields(subject) : subject) }));
    if (Array.isArray(next.diceLines)) {
      const byParticipant = new Map();
      for (const id of touchedIds) byParticipant.set(id, next.diceLines.filter(line => line.participantId === id));
      next.diceLines = next.diceLines.filter(line => !touchedIds.has(line.participantId));
      for (const [id, lines] of byParticipant) next.diceLines.push(...(combatById.get(id)?.extensions?.v5?.beastForm ? lines : syncActions(lines)).map(line => ({ ...line, participantId: id, id: lines.some(old => old.id === line.id) ? line.id : `${id}:${line.id}` })));
    }
    // L'identité fait foi : un homonyme sans lien n'est touché que si le MJ l'a coché dans l'aperçu (`adoptPersistents`).
    const { targets } = persistentSyncTargets(next, profile, entry.snapshot, entry.adoptPersistents);
    next.persistentCharacters = (next.persistentCharacters || []).map(subject => targets.has(subject.id) ? { ...copyFields(subject), profileId: profile.id } : subject);
    if (ficheFingerprint(next) !== ficheFingerprint(draft)) changedNames.push(profile.name);
  }
  if (ficheFingerprint(next) === ficheFingerprint(draft)) return draft;
  next.log = [{ id: uid(), ts: Date.now(), kind: 'management', text: `Fiches PJ mises à jour : ${[...new Set(changedNames)].join(', ')}.` }, ...(next.log || [])].slice(0, 300);
  return next;
}

/**
 * Personnages persistants d'un profil : liés par `profileId`, `extensions.ficheId` ou une rencontre/scène.
 * Sans aucun lien, un homonyme sans lien est seulement proposé (`proposed`) : il n'est ciblé que si son id figure dans `adopt`
 * (premier rattachement d'un persistant créé par son nom dans « Préparer », confirmé par le MJ).
 */
export function persistentSyncTargets(draft, profile, snapshot, adopt = []) {
  const linked = new Set((draft?.encounters || []).flatMap(item => item.entries || []).filter(item => item.profileId === profile.id && item.persistentCharacterId).map(item => item.persistentCharacterId));
  for (const subject of [...(draft?.combat?.participants || []), ...(draft?.activeScene?.participants || []), ...(draft?.suspendedScenes || []).flatMap(scene => scene.participants || [])]) if (subject.profileId === profile.id && subject.persistentCharacterId) linked.add(subject.persistentCharacterId);
  const persistents = draft?.persistentCharacters || [];
  const targets = new Set(persistents.filter(subject => subject.profileId === profile.id || subject.extensions?.ficheId === snapshot.charId || linked.has(subject.id)).map(subject => subject.id));
  const proposed = targets.size ? [] : persistents.filter(subject => !subject.profileId && !subject.extensions?.ficheId && normalizeName(subject.name) && normalizeName(subject.name) === normalizeName(profile.name))
    .map(subject => ({ id: subject.id, name: subject.name }));
  const chosen = new Set(Array.isArray(adopt) ? adopt : []);
  for (const row of proposed) if (chosen.has(row.id)) targets.add(row.id);
  return { targets, proposed };
}

/**
 * Personnages persistants que `applyFicheSync` modifiera pour cette entrée, calculés en l'appliquant sur une copie de `draft`.
 * `blocked` : l'application refuserait (lien de fiche à confirmer, équipement à arbitrer) ; rien ne serait modifié.
 */
export function previewPersistentSync(draft, entry) {
  const profile = (draft?.reserve || []).find(row => row.id === entry.profileId) || (entry.newProfile?.id === entry.profileId ? entry.newProfile : null);
  if (!profile || !entry.snapshot) return { changed: [], proposed: [], blocked: false };
  const { proposed } = persistentSyncTargets(draft, profile, entry.snapshot, []);
  let next;
  try { next = applyFicheSync(draft, [entry]); } catch { return { changed: [], proposed, blocked: true }; }
  const before = new Map((draft.persistentCharacters || []).map(row => [row.id, ficheFingerprint(row)]));
  const changed = (next.persistentCharacters || []).filter(row => before.get(row.id) !== ficheFingerprint(row)).map(row => ({ id: row.id, name: row.name }));
  return { changed, proposed, blocked: false };
}

/** Message lisible pour une erreur de lecture des fiches (Firebase ou réseau). */
export function ficheErrorMessage(error, { online = true } = {}) {
  const code = String(error?.code || '');
  if (code === 'permission-denied' || code === 'firestore/permission-denied') return 'Accès refusé : ce compte Google n’a pas le droit de lire les fiches (ou la vérification App Check a échoué).';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Connexion annulée.';
  if (code === 'auth/popup-blocked') return 'La fenêtre de connexion a été bloquée : autorisez les fenêtres surgissantes, puis réessayez.';
  if (code.startsWith('appCheck/') || code.startsWith('app-check/')) return 'Vérification App Check impossible : rechargez la page, puis réessayez depuis le site publié.';
  if (!online || code === 'unavailable' || code === 'auth/network-request-failed' || code === 'failed-precondition') return 'Fiches injoignables : vérifiez votre connexion, puis réessayez.';
  if (code === 'unauthenticated') return 'Session expirée : reconnectez-vous avec Google.';
  return 'Lecture des fiches impossible : réessayez, ou rechargez la page.';
}
