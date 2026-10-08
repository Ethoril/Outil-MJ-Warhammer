// Mise à jour des profils PJ depuis les fiches de personnage (autre projet Firebase).
// Module pur : aucune E/S. La lecture des fiches est dans fiche-source.js, l'écriture
// passe par Store.applyFicheSync (une seule commande annulable).
import { cloneValue, normalizeAction, uid } from './models.js';
import { normalizeEquipment, calculateArmor, armourProtection, equipmentQualities } from './equipment.js';
import { getReferenceCatalogue, resolveSkill, aggregateTalents } from './reference-catalog.js';
import { actionHasDamage, normalizeDamageFields, strengthBonusOf } from './damage.js';

export const FICHE_CHAR_IDS = Object.freeze(['bhelgi', 'caelel', 'elysia', 'hellaya', 'wren']);

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

// Les halfelins n'ajoutent pas leur Bonus de Force aux Blessures (clés de la fiche, anciennes sauvegardes comprises).
const RACES_SANS_BF = new Set(['halfelin', 'halfling']);

const number = value => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Minuscules sans accents ni espaces superflus, pour comparer des noms. */
export function normalizeName(value) {
  return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
}

/**
 * Blessures maximum (WFRP4) : BF + 2×BE + BFM, +BE par rang de « Dur à cuire ». Sans BF pour un halfelin.
 * null quand F (hors halfelin), E ou FM manque : le résultat n'est pas calculable.
 */
export function woundsMax({ totals, race, talents = [] }) {
  const sansBF = RACES_SANS_BF.has(String(race || '').toLowerCase());
  if (!['E', 'FM', ...(sansBF ? [] : ['F'])].every(key => Number.isFinite(totals?.[key]))) return null;
  const bonus = key => Math.floor(number(totals?.[key]) / 10);
  const hardy = (Array.isArray(talents) ? talents : []).filter(item => normalizeName(item?.nom) === 'dur a cuire').length;
  const strength = sansBF ? 0 : bonus('F');
  return strength + 2 * bonus('E') + bonus('FM') + hardy * bonus('E');
}

/**
 * Fiche brute (`doc.data`) → ce que l'outil en retient : totaux, initiative, blessures max
 * et compétences utilisables (`name`, `carac`, `total`).
 */
const MOVEMENT = Object.freeze({ humain: 4, 'elfe-sylvain': 5, 'haut-elfe': 5, halfelin: 4, ogre: 6, elfe: 5, halfling: 4, nain: 3 });
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
    const carac = entry?.carac || rawCarac;
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
  const max = coverage.talents !== 'present' ? null : woundsMax({ totals, race, talents: talentsRaw });
  if (coverage.talents !== 'present' && Object.keys(totals).length) warnings.push({ field: 'woundsMax', code: 'talents-unavailable', severity: 'warning', message: 'Talents indisponibles : maximum de Blessures antérieur conservé.', consequence: 'health-preserved' });
  const catalog = getReferenceCatalogue();
  const source = { schemaVersion: metadata.schemaVersion ?? null, revision: metadata.revision ?? null,
    resolverVersion: catalog?.contentVersion ?? catalog?.catalogVersion ?? catalog?.version ?? null };
  const snapshot = { format: 1, charId, name: typeof raw.nom === 'string' ? raw.nom.trim() : '', race,
    source, caracs: totals, initiative: totals.I ?? null, movement: MOVEMENT[race || 'humain'] ?? 4,
    wounds: max, woundsMax: max, skills, talents: coverage.talents === 'present' ? talentResult.items : [],
    equipment: equipmentResult.items, spells, prayers, coverage, warnings };
  source.fingerprint = ficheFingerprint(snapshot);
  return snapshot;
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

function proposeEquipmentSkill(item, role, skills) {
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
    collections[key] = { coverage, ...(coverage === 'present' ? collectionDiff(profile[key], snapshot[key], key === 'talents' ? row => `${row.id || row.name || row.nom}:${row.specialty || row.specialization || ''}` : undefined) : { added: [], changed: [], removed: [] }) };
    if (coverage === 'present') updated[key] = cloneValue(snapshot[key] || []);
  }
  const equipmentActions = [];
  const removedActions = [];
  if (snapshot.coverage?.equipment === 'present') {
    const currentKeys = new Set();
    const adoptedIds = new Set();
    for (const item of snapshot.equipment || []) {
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
        const action = normalizeAction({ ...(previous || adopted || {}), id: previous?.id || adopted?.id || equipmentActionId(key),
          note: role === 'defense' ? `Parade — ${item.name}` : item.name, type: role,
          base: skill?.total ?? '', attr: skill?.carac || 'Custom',
          ...normalizeDamageFields({ damage: role === 'attack' ? item.damage : 0 }),
          qualities: equipmentQualities(item),
          extensions: { ...(previous?.extensions || adopted?.extensions || {}), fiche: { charId: snapshot.charId, equipmentId: item.id, role,
            skillId: skill?.id || null, skillName: skill?.name || '', bindingVersion: 1,
            equipmentVersion: item.catalogVersion ?? null, requiresLink: !skill }, equipment: cloneValue(item) } });
        const change = previous ? ficheFingerprint(previous) === ficheFingerprint(action) ? 'unchanged' : 'changed' : adopted ? 'adopted' : 'added';
        equipmentActions.push({ id: action.id, key, equipmentId: item.id, role, name: action.note, skill: skill?.name || '', proposed,
          requiresLink: !skill, change, adoptCandidates: allActions.filter(row => !sourceActionKey(row) && row.type === role).map(row => ({ id: row.id, name: row.note })), action });
      }
    }
    removedActions.push(...allActions.filter(action => sourceCharIds.has(action.extensions?.fiche?.charId) && sourceActionKey(action) && !currentKeys.has(sourceActionKey(action))).map(action => ({ id: action.id, name: action.note })));
    updated.diceLines = updated.diceLines.filter(action => !(sourceCharIds.has(action.extensions?.fiche?.charId) && sourceActionKey(action)) && !adoptedIds.has(action.id));
    updated.diceLines.push(...equipmentActions.map(row => row.action));
    updated.armorLocations = calculateArmor(snapshot.equipment);
    updated.protection = armourProtection(snapshot.equipment);
  }
  updated.caracs = { ...profile.caracs, ...snapshot.caracs };
  if (snapshot.initiative !== null) updated.initiative = snapshot.initiative;
  if (snapshot.movement != null) updated.movement = snapshot.movement;
  if (snapshot.race) updated.race = snapshot.race;
  const health = planHealthSync(profile, usableMax(snapshot), { template: true });
  Object.assign(updated, maxPatch(profile, usableMax(snapshot), { template: true }));
  updated.extensions = { ...(profile.extensions || {}), ficheId: snapshot.charId };
  // Keep latest source status, but each excluded collection retains its previous playable data.
  updated.ficheSnapshot = cloneValue(snapshot);
  const warnings = cloneValue(snapshot.warnings || []);
  if (health.warning) warnings.push({ field: 'hp', code: health.warning, severity: 'warning', ...(health.warning === 'reserve-health-normalized' ? { message: 'Ancienne réserve avec PV courants : la réserve reprend le maximum de fiche ; les Blessures subies restent conservées dans les participants et personnages persistants déjà enregistrés.' } : {}), consequence: health.warning === 'old-maximum-unknown' ? 'hp-preserved' : 'signed-wounds-preserved' });
  return { profileId: profile.id, charId: snapshot.charId, name: profile.name, caracs,
    initiative: { old: profile.initiative, new: snapshot.initiative ?? profile.initiative },
    hp: { old: health.old, new: health.new, computable: health.computable }, health, actions, collections,
    equipmentActions, removedActions, protection: { old: profile.armorLocations || null, new: updated.armorLocations || null }, warnings,
    precondition: { profileFingerprint: profileSyncFingerprint(profile), sourceFingerprint: snapshot.source?.fingerprint || null },
    updated, changed: ficheFingerprint(profile) !== ficheFingerprint(updated) };
}

/** Apply all profiles in one immutable draft; every live copy uses its own old maximum once. */
export function applyFicheSync(draft, entries) {
  let next = cloneValue(draft);
  const changedNames = [];
  // Preconditions are checked before changing any profile, making a stale multi-PJ batch atomic.
  for (const entry of entries || []) {
    const profile = (draft.reserve || []).find(row => row.id === entry.profileId);
    if (!profile || !entry.snapshot) continue;
    const expected = entry.expectedProfileFingerprint || entry.precondition?.profileFingerprint;
    if (expected && expected !== profileSyncFingerprint(profile)) throw Object.assign(new Error('Le profil a changé depuis l’aperçu : actualisez la synchronisation.'), { code: 'fiche-plan-stale' });
    if (profile.extensions?.ficheId && profile.extensions.ficheId !== entry.snapshot.charId && entry.replaceAssociation !== true) throw Object.assign(new Error('Le remplacement du lien de fiche doit être confirmé.'), { code: 'fiche-association-conflict' });
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
        const copy = { ...cloneValue(source), ...cloneValue(raw), base: source.base, note: source.note, damage: source.damage,
          qualities: cloneValue(source.qualities), extensions: { ...(raw.extensions || {}), ...cloneValue(source.extensions) } };
        if (source.damageFormula) copy.damageFormula = source.damageFormula; else delete copy.damageFormula;
        result.push(copy);
      }
      for (const [key, source] of equipmentActions) if (!seen.has(key)) result.push(cloneValue(source));
      return result;
    };
    const copyFields = subject => {
      const health = planHealthSync(subject, usableMax(entry.snapshot));
      const output = { ...subject, caracs: { ...subject.caracs, ...entry.snapshot.caracs },
        ...maxPatch(subject, usableMax(entry.snapshot)),
        extensions: { ...(subject.extensions || {}), ficheId: entry.snapshot.charId,
          ...(health.warning ? { ficheHealthWarning: health.warning } : {}) },
        ficheSnapshot: cloneValue(updated.ficheSnapshot) };
      for (const key of ['skills', 'talents', 'equipment', 'spells', 'prayers']) if (entry.snapshot.coverage?.[key] === 'present') output[key] = cloneValue(updated[key]);
      for (const key of ['initiative', 'movement', 'race']) if (updated[key] != null) output[key] = updated[key];
      if (entry.snapshot.coverage?.equipment === 'present') {
        output.armorLocations = cloneValue(updated.armorLocations); output.protection = cloneValue(updated.protection);
      }
      if (Array.isArray(subject.actions)) output.actions = syncActions(subject.actions);
      return output;
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
    const syncScene = scene => scene ? { ...scene, participants: (scene.participants || []).map(subject => subject.profileId !== profile.id ? subject : touchedIds.has(subject.id) ? cloneValue(combatById.get(subject.id)) : copyFields(subject)) } : scene;
    if (next.activeScene) next.activeScene = syncScene(next.activeScene);
    if (Array.isArray(next.suspendedScenes)) next.suspendedScenes = next.suspendedScenes.map(scene => ({ ...scene, participants: (scene.participants || []).map(subject => subject.profileId === profile.id ? copyFields(subject) : subject) }));
    if (Array.isArray(next.diceLines)) {
      const byParticipant = new Map();
      for (const id of touchedIds) byParticipant.set(id, next.diceLines.filter(line => line.participantId === id));
      next.diceLines = next.diceLines.filter(line => !touchedIds.has(line.participantId));
      for (const [id, lines] of byParticipant) next.diceLines.push(...syncActions(lines).map(line => ({ ...line, participantId: id, id: lines.some(old => old.id === line.id) ? line.id : `${id}:${line.id}` })));
    }
    const linked = new Set((next.encounters || []).flatMap(item => item.entries || []).filter(item => item.profileId === profile.id && item.persistentCharacterId).map(item => item.persistentCharacterId));
    for (const subject of [...(next.combat?.participants || []), ...(next.activeScene?.participants || []), ...(next.suspendedScenes || []).flatMap(scene => scene.participants || [])]) if (subject.profileId === profile.id && subject.persistentCharacterId) linked.add(subject.persistentCharacterId);
    next.persistentCharacters = (next.persistentCharacters || []).map(subject => {
      const byProfile = subject.profileId === profile.id || subject.extensions?.ficheId === entry.snapshot.charId;
      const named = !linked.size && normalizeName(subject.name) === normalizeName(profile.name);
      return byProfile || linked.has(subject.id) || named ? { ...copyFields(subject), profileId: profile.id } : subject;
    });
    if (ficheFingerprint(next) !== ficheFingerprint(draft)) changedNames.push(profile.name);
  }
  if (ficheFingerprint(next) === ficheFingerprint(draft)) return draft;
  next.log = [{ id: uid(), ts: Date.now(), kind: 'management', text: `Fiches PJ mises à jour : ${[...new Set(changedNames)].join(', ')}.` }, ...(next.log || [])].slice(0, 300);
  return next;
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
