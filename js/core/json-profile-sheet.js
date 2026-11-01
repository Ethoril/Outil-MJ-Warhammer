/**
 * Import JSON de profils : tout ce qu'une fiche porte (compétences, talents, sorts, prières, équipement, Destin…).
 * Les noms sont validés contre les référentiels de l'outil (avec le nom le plus proche en cas de faute), puis le tout
 * passe par la voie des fiches : `ficheSnapshot` puis `planProfileSync`, comme une fiche synchronisée. Module pur.
 */
import registry from '../data/v5-divine-contracts.json' with { type: 'json' };
import { CREATURE_TRAIT_NAMES } from '../data/creature-trait-names.js';
import { cloneValue, uid } from './models.js';
import { getReferenceCatalogue, resolveTalent, resolveSkill } from './reference-catalog.js';
import { ficheSnapshot, ficheFingerprint, planProfileSync, FICHE_BASIC_SKILLS } from './fiche-sync.js';
import { parseSizeTrait } from './creature-size.js';

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** Clé de comparaison d'un nom : minuscules, sans accents ni ponctuation, « œ » = « oe ». */
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, ' ').trim();
/** Clé stricte des sorts, prières et objets : la casse, les espaces et l'apostrophe typographique sont sans effet, les accents comptent. */
const strict = value => String(value ?? '').normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');

/** Distance d'édition entre deux textes. */
function distance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, at) => at);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
/** Nom du référentiel le plus proche (accents, casse et ponctuation ignorés), ou null quand rien ne ressemble. */
export function closestName(value, names) {
  const wanted = fold(value);
  if (!wanted) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const name of names) {
    const current = distance(wanted, fold(name));
    if (current < bestDistance) { best = name; bestDistance = current; }
  }
  return best !== null && bestDistance <= Math.max(2, Math.floor(wanted.length * 0.3)) ? best : null;
}
const unknownMessage = (what, value, names) => {
  const near = closestName(value, names);
  return `${what} : « ${value} »${near ? ` — vouliez-vous « ${near} » ?` : ''}`;
};

const TALENT_KEYS = { name: ['nom', 'name'], specialization: ['specialisation', 'specialization', 'specialite', 'spe'], rank: ['rang', 'rank'] };
const SKILL_KEYS = { name: ['nom', 'name'], advances: ['avances', 'advances'] };
const NAMED_KEYS = { name: ['nom', 'name'] };
const ITEM_KEYS = { name: ['nom', 'name'], category: ['categorie', 'category'] };
const TRAIT_KEYS = { name: ['nom', 'name'], value: ['valeur', 'value', 'rating', 'x'] };
const BASIC_SKILLS = new Set(FICHE_BASIC_SKILLS.map(skill => skill.name));
const CARAC_LOWER = { CC: 'cc', CT: 'ct', F: 'f', E: 'e', I: 'i', Ag: 'ag', Dex: 'dex', Int: 'int', FM: 'fm', Soc: 'soc' };
const SIZE_WORDS_SHOWN = 'Petite, Moyenne, Grande, Énorme, Monstrueuse';

/** Noms français des référentiels (talents, compétences, sorts, prières, objets), lus à chaque analyse pour suivre le référentiel chargé. */
function referentials() {
  const catalogue = getReferenceCatalogue();
  const contracts = registry.contracts.filter(contract => contract.catalogueName);
  return {
    catalogue,
    talents: catalogue.talents.map(entry => entry.nom),
    skills: catalogue.skills.map(entry => entry.nom),
    spells: new Map(catalogue.magic.spells.map(spell => [strict(spell.nom), spell.nom])),
    prayers: new Map(contracts.map(contract => [strict(contract.catalogueName), contract.catalogueName])),
    traits: new Set(CREATURE_TRAIT_NAMES.map(fold))
  };
}

/** Un élément de liste : texte « Nom » ou objet ; les alias de clés sont lus par `readRecord`. */
function readItem(item, table, tools, field, errors) {
  if (typeof item === 'string') return item.trim() ? { name: item.trim() } : null;
  if (!isRecord(item)) { errors.push({ field, reason: 'texte-attendu', value: tools.shown(item) }); return null; }
  const { values, unknown } = tools.readRecord(item, table);
  unknown.forEach(key => errors.push({ field: `${field} · ${key}`, reason: 'champ-inconnu', value: '' }));
  if (typeof values.name !== 'string' || !values.name.trim()) { errors.push({ field, reason: 'champ-manquant', value: tools.shown(item), message: `${field} : « nom » manquant dans ${tools.shown(item)}.` }); return null; }
  return { ...values, name: values.name.trim() };
}

function collect(value, field, errors, tools, build) {
  if (!Array.isArray(value)) { errors.push({ field, reason: 'liste-attendue', value: tools.shown(value) }); return []; }
  return value.flatMap(item => build(item) ?? []);
}

function parseTalents(value, ref, errors, tools) {
  const merged = new Map();
  for (const row of collect(value, 'talents', errors, tools, item => {
    const read = readItem(item, TALENT_KEYS, tools, 'talents', errors);
    if (!read) return null;
    let rank = 1;
    if (read.rank !== undefined && read.rank !== null) {
      const parsed = tools.parseInteger(read.rank, `talents · ${read.name} · rang`, errors, { min: 1 });
      if (parsed !== null) rank = parsed;
    }
    // « Béni (Ulric) » ou { nom: "Béni", specialisation: "Ulric" } : même talent.
    const spec = typeof read.specialization === 'string' ? read.specialization.trim() : '';
    return [{ base: read.name, spec, rank }];
  })) {
    const full = row.spec ? `${row.base.replace(/\s*\([^)]*\)\s*$/, '')} (${row.spec})` : row.base;
    const found = resolveTalent(full);
    if (found.status !== 'resolved') {
      errors.push({ field: 'talents', reason: 'talent-inconnu', value: row.base, message: `${unknownMessage('Talent inconnu', row.base, ref.talents)}` });
    } else if (found.open) {
      errors.push({ field: 'talents', reason: 'specialisation-manquante', value: row.base, message: `Talent « ${found.entry.nom} » : précisez la spécialisation ({ "nom": "${found.entry.nom}", "specialisation": "…" }).` });
    }
    const nom = found.status === 'resolved' && found.entry ? (found.specialization ? `${found.entry.nom} (${found.specialization})` : found.entry.nom) : full;
    const key = fold(nom);
    merged.set(key, { nom, rank: (merged.get(key)?.rank ?? 0) + row.rank });
  }
  return [...merged.values()].flatMap(row => Array.from({ length: row.rank }, () => ({ nom: row.nom })));
}

function parseSkills(value, ref, errors, tools) {
  const basic = {};
  const advanced = [];
  const seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    const read = readItem(item, SKILL_KEYS, tools, 'compétences', errors);
    if (!read) continue;
    let advances = 0;
    if (read.advances !== undefined && read.advances !== null) advances = tools.parseInteger(read.advances, `compétences · ${read.name} · avances`, errors, { min: 0 }) ?? 0;
    const found = resolveSkill(read.name, { owned: true });
    if (found.status === 'unknown') errors.push({ field: 'compétences', reason: 'competence-inconnue', value: read.name, message: unknownMessage('Compétence inconnue', read.name, ref.skills) });
    const nom = found.entry && found.status === 'resolved' ? found.entry.nom : read.name;
    if (seen.has(fold(nom))) { errors.push({ field: 'compétences', reason: 'doublon', value: nom, message: `Compétence en double : « ${nom} ».` }); continue; }
    seen.add(fold(nom));
    if (BASIC_SKILLS.has(nom)) basic[nom] = advances; else advanced.push({ nom, adv: advances });
  }
  if (!Array.isArray(value)) errors.push({ field: 'compétences', reason: 'liste-attendue', value: tools.shown(value) });
  return { basic, advanced };
}

/** Sorts et prières : { nom } du référentiel, au nom canonique ; un nom inconnu est signalé et conservé tel quel. */
function parseNames(value, field, label, index, errors, tools) {
  const names = [...index.values()];
  const result = [];
  for (const row of collect(value, field, errors, tools, item => { const read = readItem(item, NAMED_KEYS, tools, field, errors); return read ? [read] : null; })) {
    const canonical = index.get(strict(row.name));
    if (!canonical) errors.push({ field, reason: field === 'sorts' ? 'sort-inconnu' : 'priere-inconnue', value: row.name, message: unknownMessage(label, row.name, names) });
    if (result.some(entry => strict(entry.nom) === strict(canonical ?? row.name))) { errors.push({ field, reason: 'doublon', value: row.name, message: `${field === 'sorts' ? 'Sort' : 'Prière'} en double : « ${row.name} ».` }); continue; }
    result.push({ nom: canonical ?? row.name });
  }
  return result;
}

/** Objets du catalogue par nom (« Arbalète (2M) »), avec la catégorie pour départager (« Plastron ») ; un objet complet { id, kind, … } passe tel quel. */
function parseEquipment(value, ref, errors, tools) {
  const items = ref.catalogue.items;
  const byName = new Map();
  for (const item of items) byName.set(strict(item.name), [...(byName.get(strict(item.name)) || []), item]);
  const taken = new Map();
  const out = [];
  const place = item => {
    const count = (taken.get(item.baseId) || 0) + 1;
    taken.set(item.baseId, count);
    out.push(cloneValue(count === 1 ? item : { ...item, id: `${item.baseId}:${count}` }));
  };
  for (const item of Array.isArray(value) ? value : []) {
    if (isRecord(item) && typeof item.id === 'string') { out.push(cloneValue(item)); continue; }
    const read = readItem(item, ITEM_KEYS, tools, 'équipement', errors);
    if (!read) continue;
    const matches = byName.get(strict(read.name)) || [];
    const narrowed = typeof read.category === 'string' && read.category.trim() ? matches.filter(match => fold(match.category) === fold(read.category)) : matches;
    if (!matches.length) errors.push({ field: 'équipement', reason: 'objet-inconnu', value: read.name, message: `${unknownMessage('Objet inconnu', read.name, items.map(entry => entry.name))}${closestName(read.name, items.map(entry => entry.name)) ? '' : ' (catalogue d’équipement) ; non ajouté'}` });
    else if (!narrowed.length) errors.push({ field: 'équipement', reason: 'objet-inconnu', value: read.name, message: `Objet inconnu dans la catégorie « ${read.category} » : « ${read.name} » existe en ${[...new Set(matches.map(match => match.category))].join(', ')}.` });
    else if (narrowed.length > 1) errors.push({ field: 'équipement', reason: 'objet-ambigu', value: read.name, message: `Objet ambigu : « ${read.name} » existe en ${[...new Set(narrowed.map(match => match.category))].join(', ')} — ajoutez { "nom": "${read.name}", "categorie": "…" }.` });
    else place(narrowed[0]);
  }
  if (!Array.isArray(value)) errors.push({ field: 'équipement', reason: 'liste-attendue', value: tools.shown(value) });
  return out;
}

/** Traits de créature : « Nom » ou « Nom (valeur) » ; la Taille se vérifie, un nom inconnu du référentiel est signalé et conservé. */
function parseTraits(value, size, ref, errors, tools) {
  const traits = [];
  const add = text => { if (!traits.includes(text)) traits.push(text); };
  for (const item of Array.isArray(value) ? value : []) {
    let text = '';
    if (typeof item === 'string') text = item.trim();
    else if (isRecord(item)) {
      const { values } = tools.readRecord(item, TRAIT_KEYS);
      text = typeof values.name === 'string' ? `${values.name.trim()}${values.value !== undefined && values.value !== null && values.value !== '' ? ` (${values.value})` : ''}` : '';
    }
    if (!text) { errors.push({ field: 'traits', reason: 'texte-attendu', value: tools.shown(item) }); continue; }
    const name = text.replace(/\s*\(.*$/, '').trim();
    if (!ref.traits.has(fold(name))) errors.push({ field: 'traits', reason: 'trait-inconnu', value: text, message: unknownMessage('Trait inconnu', name, CREATURE_TRAIT_NAMES) });
    else if (fold(name) === 'taille' && !parseSizeTrait(text)) errors.push({ field: 'traits', reason: 'taille-inconnue', value: text, message: `Taille inconnue : « ${text} » (attendu : ${SIZE_WORDS_SHOWN}).` });
    add(text);
  }
  if (!Array.isArray(value) && value !== undefined) errors.push({ field: 'traits', reason: 'liste-attendue', value: tools.shown(value) });
  if (size !== undefined && size !== null && size !== '') {
    const text = `Taille (${String(size).trim()})`;
    if (!parseSizeTrait(text)) errors.push({ field: 'taille', reason: 'taille-inconnue', value: String(size), message: `Taille inconnue : « ${size} » (attendu : ${SIZE_WORDS_SHOWN}).` });
    else if (!traits.some(trait => parseSizeTrait(trait))) add(text);
  }
  return traits;
}

/**
 * Une liste écrite à la française (`competences`, `sorts`, `prieres`, `equipement`) est validée et passe par la fiche ; sous sa clé anglaise
 * (`skills`, `spells`, `prayers`, `equipment`) elle reste la forme interne des sauvegardes, reprise telle quelle. `talents` s'écrit des deux
 * façons : textes et objets { nom, … } sont français, les objets internes { id, name, rank, … } sont repris tels quels.
 */
const frenchTalents = (list, tools) => Array.isArray(list) && list.length > 0
  && list.every(item => typeof item === 'string' || (isRecord(item) && Object.keys(item).some(key => ['nom', 'specialisation', 'rang'].includes(tools.normKey(key)))));

/**
 * Données de fiche d'un profil JSON. `input` : valeurs lues (clés canoniques `skills`, `talents`, `traits`, `size`, `spells`, `prayers`,
 * `equipment`, `fortune`, `fate`, `resilience`, `corruption`, `sin`). `spelled` : listes écrites sous leur clé française. Rend null quand
 * rien de tout cela n'est écrit à la forme française.
 */
export function buildProfileSheet(input, { caracs, name, hp, hasArmor, spelled }, errors, tools) {
  const lists = ['skills', 'talents', 'spells', 'prayers', 'equipment'];
  const french = lists.filter(key => input[key] !== undefined && (key === 'talents' ? frenchTalents(input[key], tools) : spelled[key]));
  const numbers = ['fortune', 'fate', 'resilience', 'corruption', 'sin'].filter(key => input[key] !== undefined && input[key] !== null);
  const traitsGiven = input.traits !== undefined || (input.size !== undefined && input.size !== null && input.size !== '');
  if (!french.length && !numbers.length && !traitsGiven) return null;
  const ref = referentials();
  const result = { fields: {}, actions: [], v5: {}, traits: null };
  const count = key => (input[key] === undefined || input[key] === null ? null : tools.parseInteger(input[key], key, errors, { min: 0 }));
  const fortune = count('fortune');
  const fate = count('fate');
  const resilience = count('resilience');
  const corruption = count('corruption');
  const sin = count('sin');
  if (traitsGiven) result.traits = parseTraits(input.traits, input.size, ref, errors, tools);
  if (corruption !== null) result.v5.corruptionPoints = corruption;
  if (sin !== null) result.v5.divine = { sin };
  const needsSnapshot = french.length || fortune !== null || fate !== null || resilience !== null;
  if (!needsSnapshot) return result;
  // Une liste non écrite à la forme française (ou brute) n'est pas touchée : couverture « absente » de la fiche.
  const fiche = { nom: name, race: '', carac: Object.fromEntries(Object.entries(CARAC_LOWER).filter(([key]) => Number.isFinite(caracs[key])).map(([key, lower]) => [lower, { base: caracs[key], adv: 0 }])) };
  const at = key => french.includes(key);
  if (at('skills')) { const skills = parseSkills(input.skills, ref, errors, tools); fiche.skillsBasic = skills.basic; fiche.skillsAdvanced = skills.advanced; }
  if (at('talents')) fiche.talentsAcq = parseTalents(input.talents, ref, errors, tools);
  if (at('spells')) fiche.sorts = parseNames(input.spells, 'sorts', 'Sort inconnu', ref.spells, errors, tools);
  if (at('prayers')) fiche.prieres = parseNames(input.prayers, 'prières', 'Prière inconnue', ref.prayers, errors, tools);
  if (at('equipment')) fiche.equipment = parseEquipment(input.equipment, ref, errors, tools);
  if (fortune !== null) fiche.chance = String(fortune);
  if (fate !== null) fiche.destin = String(fate);
  if (resilience !== null) fiche.resilience = String(resilience);
  const snapshot = ficheSnapshot(`json-${uid()}`, fiche);
  // Le profil JSON reste la source de ses PV, de son Initiative et de son Mouvement : la fiche virtuelle n'y touche pas.
  Object.assign(snapshot, { initiative: null, wounds: null, woundsMax: null, movement: null });
  delete snapshot.source.fingerprint;
  snapshot.source.fingerprint = ficheFingerprint(snapshot);
  const base = { id: 'json-import', name, kind: 'PJ', caracs, initiative: 30, hp, maxHp: hp, diceLines: [], extensions: {} };
  let plan = planProfileSync(snapshot, base, {});
  // Une arme sans lien reçoit la compétence que la fiche proposerait, comme une première synchronisation confirmée.
  const links = Object.fromEntries(plan.equipmentActions.filter(row => row.proposed).map(row => [row.key, row.proposed]));
  if (Object.keys(links).length) plan = planProfileSync(snapshot, base, { equipmentLinks: links });
  const updated = plan.updated;
  for (const key of lists) if (snapshot.coverage?.[key] === 'present') result.fields[key] = cloneValue(updated[key]);
  result.fields.ficheSnapshot = cloneValue(updated.ficheSnapshot);
  if (snapshot.coverage?.equipment === 'present') {
    result.actions = cloneValue(updated.diceLines).map(line => ({ ...line, name: line.note }));
    // Un `armure` écrit dans le JSON l'emporte ; sinon les pièces d'armure du catalogue donnent les Points d'Armure.
    if (!hasArmor && (updated.equipment || []).some(item => ['armour', 'shield'].includes(item.kind))) {
      result.fields.armorLocations = cloneValue(updated.armorLocations);
      result.fields.protection = cloneValue(updated.protection);
      result.armor = { head: updated.armorLocations.head, body: updated.armorLocations.body, arms: Math.max(updated.armorLocations.rightArm, updated.armorLocations.leftArm), legs: Math.max(updated.armorLocations.rightLeg, updated.armorLocations.leftLeg) };
    }
  }
  for (const key of ['fate', 'resilience']) if (updated.extensions?.v5?.[key] !== undefined) result.v5[key] = updated.extensions.v5[key];
  return result;
}
