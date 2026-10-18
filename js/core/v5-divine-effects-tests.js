/**
 * Gestionnaires d'effet divins : modificateurs de Test de compétence (`test-modifier`).
 * Forme : `modifiers: {clé: valeur}` et/ou `categories: {carac: valeur}` (catégorie = toutes les compétences du catalogue dont la
 * caractéristique liée est `carac`, Prière exclue). Une valeur est un entier (DR) ou une règle dynamique résolue UNE fois à l'aperçu
 * par `resolve` puis figée : `{fromCharacteristicBonus:'Soc'}` (Bonus du prêtre), `{fromSuccessLevels:true, per?:1, add?:1}`
 * (+add par `per` DR du Test de Prière), `{base:2, perGroup:{size:10, add:1}}` (taille de foule saisie : `input.crowdSize`).
 * `durationBonus: n` ajoute n à la durée issue du paramètre (ex. Bonus de Sociabilité + 3 Rounds ; compté aussi dans chaque extension
 * de durée, la valeur initiale étant Bonus + n). Les couches ne portent que des `testModifiers` entiers par clé de compétence : le
 * non-cumul (meilleur bonus + pire malus par clé) reste celui de calculateEffectiveTestModifiers. L'ancienne forme `{Natation: 4}` reste valide.
 */
import { getReferenceCatalogue } from './reference-catalog.js';

const need = (field, label) => ({ field, label });
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const caracKeys = new Set(['cc', 'ct', 'f', 'e', 'i', 'ag', 'dex', 'int', 'fm', 'soc']);
// Noms de la source (V4 ou usage de table) -> clé de compétence du catalogue V5.
const keyAliases = new Map([['melee', 'Corps à corps'], ['endurance', 'Résistance']]);
const ambiguousPrayerKey = key => /^(pray|prayer|priere)\s*\(/i.test(fold(key));

function splitKey(key) {
  const match = String(key).match(/^(.*?)\s*\((.*)\)\s*$/);
  return { base: (match ? match[1] : String(key)).trim(), spec: match ? match[2].trim() : null };
}
/** « Mêlée » -> « Corps à corps », « Endurance (x) » -> « Résistance (x) » ; toute autre clé est conservée telle quelle. */
export function normalizeTestKey(key) {
  const { base, spec } = splitKey(key);
  const alias = keyAliases.get(fold(base));
  return alias ? (spec === null ? alias : `${alias} (${spec})`) : String(key).trim();
}

// Les cibles de la table de normalisation doivent exister dans le catalogue (contrôle au chargement).
{
  const groups = new Set(getReferenceCatalogue().skills.map(skill => fold(skill.group || skill.nom)));
  if (groups.size) for (const target of keyAliases.values()) if (!groups.has(fold(target)))
    throw new Error(`Table de clés de Test : « ${target} » est absente du catalogue de compétences.`);
}

/** Clés de compétence de la catégorie `carac` (groupe entier quand sa base est liée à `carac`), Prière exclue. */
export function categoryTestKeys(carac) {
  const wanted = fold(carac);
  const skills = getReferenceCatalogue().skills.filter(skill => fold(skill.carac) === wanted && fold(skill.group || skill.nom) !== 'priere');
  const wholeGroup = new Set(skills.filter(skill => !skill.specialization).map(skill => fold(skill.group || skill.nom)));
  return [...new Set(skills.map(skill => skill.specialization && !wholeGroup.has(fold(skill.group)) ? skill.nom : (skill.group || skill.nom)))];
}

function valueError(label, value) {
  if (Number.isSafeInteger(value)) return null;
  if (!isRecord(value)) return `test-modifier : ${label} doit être un entier (DR) ou une règle dynamique.`;
  const kinds = ['fromCharacteristicBonus', 'fromSuccessLevels', 'perGroup'].filter(kind => value[kind] !== undefined);
  if (kinds.length !== 1) return `test-modifier : ${label} doit déclarer exactement une règle (fromCharacteristicBonus, fromSuccessLevels ou base + perGroup).`;
  if (value.fromCharacteristicBonus !== undefined && !caracKeys.has(fold(value.fromCharacteristicBonus))) return `test-modifier : ${label} : caractéristique inconnue.`;
  if (value.fromSuccessLevels !== undefined) {
    if (value.fromSuccessLevels !== true) return `test-modifier : ${label} : fromSuccessLevels ne peut valoir que true.`;
    if (value.per !== undefined && !(Number.isSafeInteger(value.per) && value.per >= 1)) return `test-modifier : ${label} : per doit être un entier positif.`;
    if (value.add !== undefined && !Number.isSafeInteger(value.add)) return `test-modifier : ${label} : add doit être un entier.`;
  }
  if (value.perGroup !== undefined) {
    if (!isRecord(value.perGroup) || !(Number.isSafeInteger(value.perGroup.size) && value.perGroup.size >= 1) || !Number.isSafeInteger(value.perGroup.add))
      return `test-modifier : ${label} : perGroup doit déclarer size (entier positif) et add (entier).`;
    if (value.base !== undefined && !Number.isSafeInteger(value.base)) return `test-modifier : ${label} : base doit être un entier.`;
  }
  return null;
}
const hasCrowdRule = effect => [effect.modifiers, effect.categories].some(map => isRecord(map) && Object.values(map).some(value => isRecord(value) && value.perGroup));
const hasEntries = effect => [effect.modifiers, effect.categories].some(map => isRecord(map) && Object.keys(map).length);

function structureError(effect) {
  if (effect.modifiers !== undefined && !isRecord(effect.modifiers)) return 'test-modifier : modifiers doit être un objet {clé: DR}.';
  if (effect.categories !== undefined && !isRecord(effect.categories)) return 'test-modifier : categories doit être un objet {carac: DR}.';
  if (!hasEntries(effect)) return 'test-modifier exige modifiers {clé: DR} ou categories {carac: DR}.';
  if (effect.durationBonus !== undefined && !(Number.isSafeInteger(effect.durationBonus) && effect.durationBonus >= 1)) return 'test-modifier : durationBonus doit être un entier positif.';
  for (const [key, value] of Object.entries(effect.modifiers || {})) {
    const problem = valueError(`« ${key} »`, value);
    if (problem) return problem;
    if (ambiguousPrayerKey(key)) return 'test-modifier : clé de Test ambiguë (Prière spécialisée).';
  }
  const seen = new Set();
  for (const key of Object.keys(effect.modifiers || {})) {
    const normalized = fold(normalizeTestKey(key));
    if (seen.has(normalized)) return `test-modifier : clé de Test en double après normalisation (${key}).`;
    seen.add(normalized);
  }
  for (const [carac, value] of Object.entries(effect.categories || {})) {
    if (!caracKeys.has(fold(carac))) return `test-modifier : catégorie inconnue « ${carac} » (attendu : ${[...caracKeys].join(', ')}).`;
    const problem = valueError(`catégorie « ${carac} »`, value);
    if (problem) return problem;
  }
  return null;
}

const bonusOf = (actor, carac) => {
  const caracs = actor?.caracs || {};
  const found = Object.keys(caracs).find(key => fold(key) === fold(carac));
  const score = Number(caracs[found]);
  return found !== undefined && Number.isFinite(score) && score >= 0 && score <= 100 ? Math.floor(score / 10) : null;
};
const crowdSize = input => Number.isSafeInteger(input?.crowdSize) && input.crowdSize >= 0 ? input.crowdSize : null;

/** Valeur entière d'une règle ; `{error, needs}` quand un fait manque. */
function evaluate(value, { actor, prayer, input }) {
  if (Number.isSafeInteger(value)) return value;
  if (value.fromCharacteristicBonus !== undefined) {
    const bonus = bonusOf(actor, value.fromCharacteristicBonus);
    if (bonus === null) return { error: `Le Bonus de ${value.fromCharacteristicBonus} du prêtre est inconnu.`, needs: [need(`actor.caracs.${value.fromCharacteristicBonus}`, `Caractéristique ${value.fromCharacteristicBonus} du prêtre`)] };
    return bonus;
  }
  if (value.fromSuccessLevels === true) return Math.floor(Math.max(0, prayer.sl) / (value.per ?? 1)) * (value.add ?? 1);
  const crowd = crowdSize(input);
  if (crowd === null) return { error: 'La taille de la foule est requise.', needs: [need('crowdSize', 'Nombre de personnes présentes (entier ≥ 0)')] };
  return (value.base ?? 0) + Math.floor(crowd / value.perGroup.size) * value.perGroup.add;
}

/** Table {clé de compétence: entier} d'un effet : catégories, puis clés explicites normalisées (une clé explicite l'emporte). */
function expand(effect, evaluated) {
  const table = {};
  for (const [carac, value] of Object.entries(effect.categories || {})) for (const key of categoryTestKeys(carac)) table[key] = evaluated(value);
  for (const [key, value] of Object.entries(effect.modifiers || {})) table[normalizeTestKey(key)] = evaluated(value);
  return table;
}

export default {
  'test-modifier': {
    validate: structureError,
    needs(effect, { input } = {}) {
      if (structureError(effect)) return [need('contract.effects.modifiers', 'Modificateurs de Test sourcés et sans ambiguïté requis')];
      // Faits propres aux règles dynamiques (effet encore brut : l'effet résolu n'en porte plus).
      return hasCrowdRule(effect) && crowdSize(input) === null ? [need('crowdSize', 'Nombre de personnes présentes (entier ≥ 0)')] : [];
    },
    resolve(effect, context) {
      let failure = null;
      const flat = expand(effect, value => {
        const result = evaluate(value, context);
        if (isRecord(result)) { failure ||= result; return 0; }
        return result;
      });
      if (failure) return failure;
      const resolved = { ...effect, modifiers: flat };
      delete resolved.categories;
      if (resolved.durationBonus !== undefined) {
        const extensions = Number.isSafeInteger(context.input?.choices?.duration) ? context.input.choices.duration : 0;
        if (Number.isSafeInteger(resolved.duration?.value)) resolved.duration = { ...resolved.duration, value: resolved.duration.value + resolved.durationBonus * (1 + extensions) };
        delete resolved.durationBonus;
      }
      return resolved;
    },
    // Un effet non résolu (appel direct) ne pose que ses entiers.
    buildLayer: effect => ({ testModifiers: Object.fromEntries(Object.entries(expand(effect, value => Number.isSafeInteger(value) ? value : null)).filter(([, value]) => value !== null)) }),
    inputFields: effect => hasCrowdRule(effect) ? [{ path: 'crowdSize', label: 'Personnes présentes (foule)', kind: 'number', scope: 'effect', min: 0, source: true,
      help: 'Toute personne présente, alliés ou non : +1 DR par tranche complète de 10 (saisie du MJ, lecture retenue faute de précision du livre).' }] : []
  }
};
