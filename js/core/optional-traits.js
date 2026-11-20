/**
 * Traits optionnels des créatures (chantier des Traits optionnels, lot L2) : modèle des coches et règles de choix.
 * Fonctions pures : aucune entrée n'est modifiée, chaque opération rend `{ ok: true, choices }` ou `{ ok: false, error }`.
 * Les coches vivent sur le profil, dans `extensions.v5.optionalChoices` (D14) ; leur absence se lit comme vide, sans réécrire les données.
 * Effets des coches (lot L3) : `applyOptionalChoices`, en fin de fichier.
 *
 * Forme des coches : `{ traits: [{ key, name, param, kind, origin }], attacks: [{ name, actions }], armour: [{ name, part, zones }] }`.
 * `origin` : « optional » (Trait facultatif de la fiche) ou « free » (ajouté librement, D3). `key` : `Nom` ou `Nom:paramètre`.
 */
import { cloneValue, normalizeArmorLocations } from './models.js';
import { attackActions, printedArmour } from './bestiary-profiles.js';
import { parseSizeTrait } from './creature-size.js';
import { catalogueTraitOf } from '../data/creature-trait-catalogue.js';
import { OPTIONAL_TRAIT_MODIFIERS, OPTIONAL_TRAINED_MODIFIERS, OPTIONAL_TRAIT_MODELS } from '../data/optional-trait-modifiers.js';
import { creatureWounds, hardyRank } from './v5-magic-arbitrations.js';
import { creatureSizeOf } from './creature-size.js';
import { resolveSkill, resolveTalent } from './reference-catalog.js';
import { canonicalCaracKey } from './carac-keys.js';

const isText = value => typeof value === 'string' && value.trim() !== '';
const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const ok = choices => ({ ok: true, choices });
const refuse = error => ({ ok: false, error });

const EMPTY = () => ({ traits: [], attacks: [], armour: [] });
const asList = value => (Array.isArray(value) ? value.filter(item => item && typeof item === 'object').map(cloneValue) : []);

/** Coches d'un profil ou d'un participant ; toute absence vaut vide (D14). */
export function readOptionalChoices(source) {
  const stored = source?.extensions?.v5?.optionalChoices;
  if (!stored || typeof stored !== 'object') return EMPTY();
  return { traits: asList(stored.traits), attacks: asList(stored.attacks), armour: asList(stored.armour) };
}

// Dressages : nom français affiché ; un nom absent de la table s'affiche tel quel.
const TRAINED_FR = Object.freeze({
  broken: 'Brisé', drive: 'Conduite', mount: 'Monture', war: 'Guerre', magic: 'Magie', 'shock cavalry': 'Cavalerie de choc', guard: 'Garder',
  fetch: 'Rapporter', entertain: 'Divertissement', return: 'Retour', hunt: 'Chasser', dig: 'Creuser', heel: 'Au pied', herd: 'Rabattre'
});
const trainedLabel = name => TRAINED_FR[fold(name)] || name;
const dressages = param => String(param ?? '').split(/\s*(?:,|\bor\b|\band\b)\s*/i).map(part => part.trim()).filter(Boolean);

const detailOf = trait => {
  const detail = trait?.param ?? trait?.rating;
  return detail === undefined || detail === null ? '' : String(detail).trim();
};
const keyOf = (name, detail) => (detail ? `${name}:${detail}` : name);
const sameKey = (a, b) => fold(a) === fold(b);
const isTrained = name => fold(name) === 'trained';
const isSize = name => fold(name) === 'size';
const isLeader = name => fold(name) === 'leader';

const baseTraits = record => (Array.isArray(record?.traits) ? record.traits.filter(trait => isText(trait?.name)) : []);
const hasBestial = (record, choices) => baseTraits(record).some(trait => fold(trait.name) === 'bestial') || choices.traits.some(item => fold(item.name) === 'bestial');

/** Vrai quand ce Trait (ou ce dressage) est déjà imprimé parmi les Traits de base du profil (D18). */
function inBase(record, name, detail) {
  return baseTraits(record).some(trait => {
    if (fold(trait.name) !== fold(name)) return false;
    if (isTrained(name)) return dressages(detailOf(trait)).some(item => fold(item) === fold(detail));
    return fold(detailOf(trait)) === fold(detail);
  });
}

const checkedHas = (choices, key) => choices.traits.some(item => sameKey(item.key, key));
const checkedSize = choices => choices.traits.find(item => isSize(item.name));

function labelOf(name, detail, nameFr) {
  const label = nameFr || name;
  if (isTrained(name) && detail) return `${label} (${trainedLabel(detail)})`;
  return detail ? `${label} (${detail})` : label;
}

/** Libellé français d'un Trait coché (nom du catalogue, dressage traduit) : « Coriace », « Dressé (Guerre) », « Peur (2) ». */
export function optionalTraitLabel(name, param = '') {
  return labelOf(name, String(param ?? '').trim(), catalogueTraitOf(name)?.nameFr);
}

/** Entrées de Traits facultatifs d'une fiche : un Trait par ligne, un dressage par ligne pour « Trained ». */
function optionalTraitEntries(record) {
  const out = [];
  for (const trait of Array.isArray(record?.optionalTraits) ? record.optionalTraits : []) {
    const entry = typeof trait === 'string' ? { name: trait } : trait;
    if (!isText(entry?.name)) continue;
    const detail = detailOf(entry);
    if (isTrained(entry.name) && detail) for (const dressage of dressages(detail)) out.push({ name: entry.name, detail: dressage, kind: 'trained' });
    else out.push({ name: entry.name, detail, kind: isSize(entry.name) ? 'size' : 'trait' });
  }
  return out;
}

/**
 * Cavalerie de choc (Up in Arms p. 107) : dressage ajouté après les autres livres, que leurs profils ne listent donc pas. Proposé à toute
 * monture qui peut être Dressée (Monture) et (Guerre), imprimé ou facultatif ; grisé tant que Dressé (Guerre) n'est ni imprimé ni coché.
 */
function shockCavalryCase(record, state, cases) {
  const offered = detail => inBase(record, 'Trained', detail) || cases.some(item => item.kind === 'trained' && fold(item.param) === fold(detail));
  if (offered('Shock Cavalry') || !offered('Mount') || !offered('War')) return null;
  const key = keyOf('Trained', 'Shock Cavalry');
  const checked = checkedHas(state, key);
  const warOn = inBase(record, 'Trained', 'War') || state.traits.some(item => isTrained(item.name) && fold(item.param) === 'war');
  const reason = checked || warOn ? '' : 'exige Dressé (Guerre) : le cocher d’abord.';
  const nameFr = catalogueTraitOf('Trained')?.nameFr || 'Trained';
  return { key, kind: 'trained', name: 'Trained', nameFr, param: 'Shock Cavalry', label: labelOf('Trained', 'Shock Cavalry', nameFr), checked, disabled: Boolean(reason), reason, origin: 'optional' };
}

/**
 * Cases du panneau d'un profil, dans l'ordre : Traits facultatifs (un dressage par case), attaques, pièces d'armure facultatives, puis
 * les Traits ajoutés librement (cochés). Chaque case : `{ key, kind, name, nameFr, param, label, checked, disabled, reason, origin }`.
 * Leader est absent sur une créature Bestial (D17, D26) ; une case « déjà compté » est grisée (D18) ; une seule Taille cochée (D11).
 */
export function optionalCandidates(record, choices = EMPTY()) {
  const state = choices?.traits ? choices : readOptionalChoices(choices);
  const cases = [];
  const sizeChecked = checkedSize(state);
  for (const entry of optionalTraitEntries(record)) {
    if (isLeader(entry.name) && hasBestial(record, state)) continue;
    const key = keyOf(entry.name, entry.detail);
    const nameFr = catalogueTraitOf(entry.name)?.nameFr || entry.name;
    const checked = checkedHas(state, key);
    let reason = '';
    if (!checked) {
      if (inBase(record, entry.name, entry.detail)) reason = 'déjà compté';
      else if (entry.kind === 'size' && sizeChecked) reason = 'Une seule Taille peut être choisie.';
    }
    cases.push({ key, kind: entry.kind, name: entry.name, nameFr, param: entry.detail, label: labelOf(entry.name, entry.detail, nameFr), checked, disabled: Boolean(reason), reason, origin: 'optional' });
  }
  const shock = shockCavalryCase(record, state, cases);
  if (shock) cases.push(shock);
  for (const attack of (record?.attacks || []).filter(item => item?.optional && isText(item.name))) {
    cases.push({ key: `attack:${attack.name}`, kind: 'attack', name: attack.name, nameFr: attack.nameFr || attack.name, param: '', label: attack.nameFr || attack.name, checked: state.attacks.some(item => item.name === attack.name), disabled: false, reason: '', origin: 'optional' });
  }
  for (const part of (record?.armour?.parts || []).filter(item => item?.optional && isText(item.name))) {
    cases.push({ key: `armour:${part.name}`, kind: 'armour', name: part.name, nameFr: part.name, param: '', label: part.name, checked: state.armour.some(item => item.name === part.name), disabled: false, reason: '', origin: 'optional' });
  }
  for (const item of state.traits.filter(trait => trait.origin === 'free')) {
    const nameFr = catalogueTraitOf(item.name)?.nameFr || item.name;
    cases.push({ key: item.key, kind: item.kind || 'trait', name: item.name, nameFr, param: item.param || '', label: labelOf(item.name, item.param || '', nameFr), checked: true, disabled: false, reason: '', origin: 'free' });
  }
  return cases;
}

/** Coche ou décoche un Trait (ou un dressage) de la liste ; un Trait ajouté librement se retire en le décochant. */
export function toggleOptionalTrait(record, choices, key) {
  const state = choices?.traits ? choices : readOptionalChoices(choices);
  const candidate = optionalCandidates(record, state).find(item => item.key === key && item.kind !== 'attack' && item.kind !== 'armour');
  if (!candidate) {
    const [name, ...detail] = String(key ?? '').split(':');
    return refuse(`Trait « ${optionalTraitLabel(name, detail.join(':'))} » non proposé pour ${record?.nameFr || record?.name || 'ce profil'}.`);
  }
  if (candidate.checked) return ok({ ...state, traits: state.traits.filter(item => !sameKey(item.key, key)) });
  if (candidate.disabled) return refuse(`« ${candidate.label} » : ${candidate.reason}`);
  const entry = { key, name: candidate.name, param: candidate.param, kind: candidate.kind, origin: 'optional' };
  return ok({ ...state, traits: [...state.traits, entry] });
}

const PARAM_REQUIRED = Object.freeze({
  rating: 'une valeur (l’indice du Trait, par exemple 2)',
  size: 'une Taille (Petite, Moyenne, Grande, Énorme ou Monstrueuse)',
  trained: 'un dressage (Guerre, Monture, Magie…)',
  hatred: 'la cible de la Haine (par exemple les Elfes)'
});

/**
 * Ajoute un Trait du catalogue (D3) : `rating`, `size`, `trained` et `hatred` exigent un paramètre (D12). Refus du doublon, sauf paramètre
 * différent (CA19) ; une seule Taille ; Leader refusé sur une créature Bestial (D17).
 */
export function addFreeTrait(record, choices, name, param = '') {
  const state = choices?.traits ? choices : readOptionalChoices(choices);
  const entry = catalogueTraitOf(name);
  if (!entry) return refuse(`Trait « ${String(name ?? '').trim()} » absent du catalogue.`);
  const label = entry.nameFr || entry.name;
  let detail = String(param ?? '').trim();
  if (PARAM_REQUIRED[entry.param] && !detail) return refuse(`« ${label} » demande ${PARAM_REQUIRED[entry.param]} : l’ajout est refusé sans valeur.`);
  if (entry.param === 'none') detail = '';
  if (entry.param === 'size') {
    const size = parseSizeTrait(`Size (${detail})`);
    if (!size) return refuse(`Taille « ${detail} » inconnue : Petite, Moyenne, Grande, Énorme ou Monstrueuse.`);
  }
  if (entry.param === 'trained' && dressages(detail).length !== 1) return refuse('Un seul dressage à la fois : « Dressé » s’ajoute dressage par dressage.');
  if (isLeader(entry.name) && hasBestial(record, state)) return refuse(`« ${label} » est refusé sur une créature Bestial (Livre de base, p. 340).`);
  const key = keyOf(entry.name, detail);
  if (inBase(record, entry.name, detail) || checkedHas(state, key)) return refuse(`« ${labelOf(entry.name, detail, entry.nameFr)} » est déjà sur ce profil.`);
  if (entry.param === 'size' && checkedSize(state)) return refuse('Une seule Taille peut être choisie : décocher l’autre Taille d’abord.');
  const added = { key, name: entry.name, param: detail, kind: entry.param === 'trained' ? 'trained' : entry.param === 'size' ? 'size' : 'trait', origin: 'free' };
  return ok({ ...state, traits: [...state.traits, added] });
}

/** Coche ou décoche une attaque facultative ; l'instantané des actions est construit depuis l'enregistrement du bestiaire. */
export function toggleOptionalAttack(record, choices, name) {
  const state = choices?.traits ? choices : readOptionalChoices(choices);
  const attack = (record?.attacks || []).find(item => item?.optional && item.name === name);
  if (!attack) return refuse(`Attaque facultative « ${name} » absente de ce profil.`);
  if (state.attacks.some(item => item.name === name)) return ok({ ...state, attacks: state.attacks.filter(item => item.name !== name) });
  const actions = attackActions(attack, record.stats || {}, record.book === 'L12');
  return ok({ ...state, attacks: [...state.attacks, { name, actions }] });
}

/** Coche ou décoche une pièce d'armure facultative ; l'instantané garde la pièce et les PA par zone. */
export function toggleOptionalArmour(record, choices, name) {
  const state = choices?.traits ? choices : readOptionalChoices(choices);
  const part = (record?.armour?.parts || []).find(item => item?.optional && item.name === name);
  if (!part) return refuse(`Pièce d’armure facultative « ${name} » absente de ce profil.`);
  if (state.armour.some(item => item.name === name)) return ok({ ...state, armour: state.armour.filter(item => item.name !== name) });
  const { zones } = printedArmour({ parts: [cloneValue(part)] }, true);
  return ok({ ...state, armour: [...state.armour, { name, part: cloneValue(part), zones }] });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Lot L3 : effets des Traits cochés (D5, D6, D9, D10, D11, D16, D19 à D23). Pur : le profil d'entrée n'est jamais modifié.
// ---------------------------------------------------------------------------------------------------------------------------------

const lookupFold = table => Object.fromEntries(Object.entries(table).map(([name, row]) => [fold(name), { name, ...row }]));
const MODIFIERS = lookupFold(OPTIONAL_TRAIT_MODIFIERS);
const TRAINED = lookupFold(OPTIONAL_TRAINED_MODIFIERS);
const MODELS = lookupFold(OPTIONAL_TRAIT_MODELS);

const ARMOUR_LABELS = Object.freeze({ head: 'tête', body: 'corps', arms: 'bras', legs: 'jambes' });
const ARMOUR_LOCATIONS_OF = Object.freeze({ head: ['head'], body: ['body'], arms: ['rightArm', 'leftArm'], legs: ['rightLeg', 'leftLeg'] });
// Nom affiché d'un Trait : français du catalogue, sinon le nom tel quel ; Dressé suivi de son dressage en français.
const frenchName = (name, param = '') => optionalTraitLabel(name, isTrained(name) ? param : '');
const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const textOfTrait = trait => (typeof trait === 'string' ? trait : trait?.name ?? '');
const splitTrait = text => {
  const match = /^\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*$/.exec(String(text ?? ''));
  return match ? { name: match[1], detail: (match[2] ?? '').trim() } : { name: String(text ?? ''), detail: '' };
};
const traitLabel = (name, param) => (param ? `${name} (${param})` : name);

/** Vrai quand le Trait (nom anglais ou français) figure déjà dans les Traits imprimés du profil ; pour Trained, quand le dressage y est. */
function printedTrait(traits, name, param) {
  const french = catalogueTraitOf(name)?.nameFr;
  return traits.some(text => {
    const found = splitTrait(textOfTrait(text));
    if (![fold(name), french && fold(french)].includes(fold(found.name))) return false;
    if (isTrained(name)) return dressages(found.detail).some(item => fold(item) === fold(param) || fold(trainedLabel(item)) === fold(trainedLabel(param)));
    return !param || fold(found.detail) === fold(param);
  });
}

const woundsOf = (caracs, size, hardy) => creatureWounds({ caracs, size, hardy }).wounds;

/**
 * Profil effectif d'un profil de Réserve à coches : `{ profile, changes, notes }`.
 * `changes` : `{ field, printed, effective, source }` pour chaque champ modifié (valeur imprimée et valeur modifiée) ; `notes` : points à
 * signaler (caractéristique absente, Trait sans effet). Sans coche, le profil d'entrée est rendu tel quel (CA6). Les Traits de D5 déjà
 * imprimés n'ont aucun effet (D10) ; Elite et Leader appliquent le modèle V5 à la place du Trait V4 (D19).
 * Les Traits imprimés se lisent dans `traits`, sinon dans `extensions.traits` (forme canonique d'un profil rangé par le Store) : l'aperçu
 * du panneau et le participant créé partent ainsi des mêmes Traits.
 */
export function applyOptionalChoices(stored) {
  const choices = readOptionalChoices(stored);
  if (!stored || !(choices.traits.length || choices.attacks.length || choices.armour.length)) return { profile: stored, changes: [], notes: [] };
  const profile = !Array.isArray(stored.traits) && Array.isArray(stored.extensions?.traits) ? { ...stored, traits: stored.extensions.traits } : stored;
  const out = cloneValue(profile);
  const changes = [];
  const notes = [];
  const printedTraits = Array.isArray(profile.traits) ? profile.traits : [];
  const printedCaracs = profile.caracs && typeof profile.caracs === 'object' ? profile.caracs : {};
  out.caracs = cloneValue(printedCaracs);

  // 1. Traits cochés : texte ajouté, écarts de caractéristiques, Blessures, modèles.
  const delta = {};
  const sources = {};
  const addDelta = (key, value, source) => {
    if (!isNumber(printedCaracs[key])) { notes.push(`${source} : ${key} absente du profil (case vide), écart non appliqué.`); return; }
    delta[key] = (delta[key] || 0) + value;
    (sources[key] ||= []).push(source);
  };
  const added = [];
  const newDressages = [];
  const models = [];
  let hardyAdded = false;
  let sizeChoice = null;
  for (const item of choices.traits) {
    const name = String(item.name ?? '');
    const param = String(item.param ?? '').trim();
    if (!name) continue;
    const key = fold(name);
    if (key === 'size') { if (param && !sizeChoice) sizeChoice = param; continue; }
    if (isTrained(name)) {
      if (!param || printedTrait(printedTraits, name, param) || newDressages.some(entry => fold(entry) === fold(param))) continue;
      newDressages.push(param);
      const war = TRAINED[fold(param)] || Object.values(TRAINED).find(row => fold(row.nameFr) === fold(param));
      if (war) for (const [carac, value] of Object.entries(war.stats)) addDelta(carac, value, frenchName(name, war.name));
      continue;
    }
    if (printedTrait(printedTraits, name, param)) continue;
    if (MODELS[key]) {
      const model = MODELS[key];
      if (model.blockedByTrait && (printedTrait(printedTraits, model.blockedByTrait, '') || choices.traits.some(other => fold(other.name) === fold(model.blockedByTrait)))) {
        notes.push(`${model.nameFr} : refusé sur une créature ${model.blockedByTrait}, sans effet.`);
        continue;
      }
      models.push({ ...model, source: frenchName(name) });
      for (const [carac, value] of Object.entries(model.stats)) addDelta(carac, value, frenchName(name));
      added.push(traitLabel(name, param));
      continue;
    }
    if (MODIFIERS[key]) {
      const row = MODIFIERS[key];
      for (const [carac, value] of Object.entries(row.stats || {})) addDelta(carac, value, frenchName(name));
      if (row.wounds?.rule === 'hardy') hardyAdded = true;
    }
    added.push(traitLabel(name, param));
  }

  // Caractéristiques effectives.
  for (const key of Object.keys(printedCaracs)) {
    if (!delta[key]) continue;
    const effective = Math.max(0, printedCaracs[key] + delta[key]);
    if (effective === printedCaracs[key]) continue;
    out.caracs[key] = effective;
    changes.push({ field: key, printed: printedCaracs[key], effective, source: sources[key].join(', ') });
  }
  const gain = key => (isNumber(out.caracs[key]) && isNumber(printedCaracs[key]) ? out.caracs[key] - printedCaracs[key] : 0);
  const sourceOf = key => (sources[key] || []).join(', ');

  // Traits du participant : texte au format imprimé (D9), Dressé fusionné en un seul texte, une seule Taille.
  const traits = printedTraits.map(trait => (typeof trait === 'string' ? trait : cloneValue(trait)));
  if (sizeChoice) {
    const sizeText = `Size (${sizeChoice})`;
    const at = traits.findIndex(text => isSize(splitTrait(textOfTrait(text)).name));
    if (at >= 0) traits[at] = sizeText; else traits.push(sizeText);
  }
  traits.push(...added);
  if (newDressages.length) {
    const at = traits.findIndex(text => isTrained(splitTrait(textOfTrait(text)).name));
    if (at >= 0) traits[at] = `Trained (${[...dressages(splitTrait(textOfTrait(traits[at])).detail), ...newDressages].join(', ')})`;
    else traits.push(`Trained (${newDressages.join(', ')})`);
  }
  out.traits = traits;

  // 2. Initiative, Taille, Blessures.
  if (gain('I')) {
    const printed = isNumber(profile.initiative) ? profile.initiative : printedCaracs.I;
    out.initiative = printed + gain('I');
    changes.push({ field: 'Initiative', printed, effective: out.initiative, source: sourceOf('I') });
  }
  const sizeBefore = creatureSizeOf(profile);
  const sizeAfter = creatureSizeOf({ ...out, size: sizeChoice ? undefined : profile.size });
  const sizeChanged = sizeBefore.key !== sizeAfter.key;
  if (sizeChanged) changes.push({ field: 'Taille', printed: sizeBefore.label, effective: sizeAfter.label, source: frenchName('Size') });
  if (hardyAdded || sizeChanged || ['F', 'E', 'FM'].some(key => gain(key))) {
    const hardyBase = (printedTrait(printedTraits, 'Hardy', '') ? 1 : 0) + hardyRank(profile);
    const why = [hardyAdded && frenchName('Hardy'), sizeChanged && frenchName('Size'),...['F', 'E', 'FM'].filter(key => gain(key)).map(sourceOf)].filter(Boolean).join(', ');
    try {
      const gap = woundsOf(out.caracs, sizeAfter.key, hardyBase + (hardyAdded ? 1 : 0)) - woundsOf(printedCaracs, sizeBefore.key, hardyBase);
      if (isNumber(profile.maxHp) && gap) {
        out.maxHp = Math.max(1, profile.maxHp + gap);
        if (isNumber(profile.hp)) out.hp = Math.max(1, profile.hp + gap);
        changes.push({ field: 'Blessures', printed: profile.maxHp, effective: out.maxHp, source: [...new Set(why.split(', '))].join(', ') });
      }
    } catch {
      notes.push('Blessures inchangées : Force, Endurance et Force Mentale sont toutes nécessaires pour les recalculer.');
    }
  }

  // 3. Compétences : suivent les caractéristiques (D22) ; les modèles ajoutent leur bonus (D21).
  const skillSources = new Map();
  const noteSkill = (skill, source) => skillSources.set(skill, [...(skillSources.get(skill) || []), source]);
  const originals = Array.isArray(out.skills) ? out.skills : [];
  const printedTotals = new Map(originals.map(skill => [skill, skill.total]));
  for (const skill of originals) {
    const carac = canonicalCaracKey(skill.carac);
    if (carac && isNumber(skill.total) && gain(carac)) { skill.total += gain(carac); noteSkill(skill, sourceOf(carac)); }
  }
  const skills = [...originals];
  const heldBy = (id, name) => skills.find(skill => (id && skill.id === id) || fold(skill.name) === fold(name));
  for (const model of models) {
    for (const row of model.skills) {
      const targets = [];
      if (row.kind === 'melee-two') {
        const melee = skills.filter(skill => fold(skill.group) === 'corps a corps' && isNumber(skill.total)).sort((a, b) => b.total - a.total).slice(0, 2);
        if (melee.length) targets.push(...melee.map(skill => ({ held: skill })));
        else targets.push({ lookup: 'Corps à corps (Base)' });
      } else {
        const held = heldBy(resolveSkill(row.nameFr).entry?.id, row.nameFr);
        targets.push(held ? { held } : { lookup: row.nameFr });
      }
      for (const target of targets) {
        if (target.held) {
          if (isNumber(target.held.total)) { target.held.total += row.value; noteSkill(target.held, model.source); }
          continue;
        }
        const resolved = resolveSkill(target.lookup);
        const entry = resolved.status === 'resolved' ? resolved.entry : null;
        const carac = entry ? canonicalCaracKey(entry.carac) : null;
        if (!entry || !carac || !isNumber(out.caracs[carac])) { notes.push(`${model.source} : compétence ${target.lookup} non ajoutée (${carac || 'caractéristique'} absente du profil).`); continue; }
        const fresh = { name: entry.nom, sourceName: row.name, total: out.caracs[carac] + row.value, id: entry.id, group: entry.group, carac: entry.carac, status: 'resolved' };
        skills.push(fresh);
        noteSkill(fresh, model.source);
      }
    }
  }
  if (skills.length !== originals.length || skillSources.size) out.skills = skills;
  for (const [skill, list] of skillSources) changes.push({ field: `Compétence : ${skill.name}`, printed: printedTotals.has(skill) ? printedTotals.get(skill) : null, effective: skill.total, source: [...new Set(list)].join(', ') });

  // 4. Talents des modèles.
  const talents = Array.isArray(out.talents) ? out.talents : [];
  for (const model of models) {
    for (const row of model.talents) {
      const resolved = resolveTalent(row.nameFr);
      const entry = resolved.status === 'resolved' ? resolved.entry : null;
      const id = entry?.id || row.key;
      if (talents.some(talent => talent.id === id || fold(talent.name) === fold(entry?.nom || row.nameFr))) continue;
      talents.push({ name: entry?.nom || row.nameFr, sourceName: row.nameFr, rank: 1, id, status: entry ? 'resolved' : 'unresolved' });
      changes.push({ field: `Talent : ${entry?.nom || row.nameFr}`, printed: null, effective: 'ajouté', source: model.source });
    }
  }
  if (talents.length) out.talents = talents;

  // 5. Attaques : cochées ajoutées, puis base (CC, CT) et dégâts de mêlée suivent les écarts (D22).
  const lines = Array.isArray(out.diceLines) ? out.diceLines : [];
  for (const item of choices.attacks) {
    (Array.isArray(item.actions) ? item.actions : []).forEach((action, index) => {
      const copy = cloneValue(action);
      if (!copy.id) copy.id = `optional-attack:${item.name}:${index + 1}`;
      lines.push(copy);
    });
  }
  const bonusForce = gain('F') ? Math.floor(out.caracs.F / 10) - Math.floor(printedCaracs.F / 10) : 0;
  for (const line of lines) {
    const carac = line.attr === 'CC' || line.attr === 'CT' ? line.attr : null;
    if (carac && isNumber(line.base) && gain(carac)) {
      changes.push({ field: `Attaque : ${line.name} (base)`, printed: line.base, effective: line.base + gain(carac), source: sourceOf(carac) });
      line.base += gain(carac);
    }
    const melee = line.extensions?.v5?.kind === 'melee' || (!line.extensions?.v5?.kind && line.attr === 'CC');
    if (melee && bonusForce) {
      if (line.damageFormula) notes.push(`Attaque ${line.name} : formule de dégâts « ${line.damageFormula} » non recalculée, à ajuster (BF ${bonusForce > 0 ? '+' : ''}${bonusForce}).`);
      else if (isNumber(line.damage)) {
        changes.push({ field: `Attaque : ${line.name} (dégâts)`, printed: line.damage, effective: line.damage + bonusForce, source: sourceOf('F') });
        line.damage += bonusForce;
      }
    }
  }
  if (lines.length) out.diceLines = lines;

  // 6. Armure : maximum par zone, comme l'armure imprimée. Le combat lit `armorLocations` d'abord (equipment.js, locationProtection) :
  // les six localisations suivent la pièce cochée (bras et jambes des deux côtés), en partant des PA par localisation du profil.
  if (choices.armour.length) {
    out.armor = { ...(out.armor || {}) };
    const locations = normalizeArmorLocations(profile.armorLocations ?? profile.armor);
    for (const piece of choices.armour) {
      for (const zone of Object.keys(ARMOUR_LABELS)) {
        const value = piece.zones?.[zone];
        if (!isNumber(value)) continue;
        for (const id of ARMOUR_LOCATIONS_OF[zone]) locations[id] = Math.max(locations[id], value);
        if (value > (out.armor[zone] || 0)) {
          changes.push({ field: `Armure (${ARMOUR_LABELS[zone]})`, printed: out.armor[zone] || 0, effective: value, source: piece.name });
          out.armor[zone] = value;
        }
      }
    }
    out.armorLocations = locations;
  }
  return { profile: out, changes, notes };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Lot L4 : rappels des Traits qu'aucun autre module n'affiche (D7, CA8, CA15, CA16, CA25). Calculés à l'affichage, jamais écrits.
// ---------------------------------------------------------------------------------------------------------------------------------

// Dressages dont l'effet est rappelé en plus de la ligne générale de « Dressé » (déjà affichée par creature-magic-traits.js).
const TRAINED_NOTES = Object.freeze({
  war: 'ignore Craintif face aux bruits forts (pas face à la magie) ; +10 en CC (seulement CC) quand le dressage est coché.',
  magic: 'ignore Craintif face à la magie.',
  'shock cavalry': 'en charge, traverse les plus petits (Esquive ou 4+BF dégâts) et perd 2 m de Mouvement par créature traversée ; exige Dressé (Guerre).'
});
const trainedKey = detail => {
  const found = Object.entries(TRAINED_FR).find(([, french]) => fold(french) === fold(detail));
  return found ? found[0] : fold(detail);
};
const slug = value => fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const statsText = stats => Object.entries(stats || {}).map(([carac, value]) => `${carac} ${value > 0 ? '+' : ''}${value}`).join(', ');

/** Rappel « modifie le profil » d'un Trait coché, ou null. */
function profileChangeText(item) {
  const name = String(item.name ?? '');
  const param = String(item.param ?? '').trim();
  const key = fold(name);
  if (isSize(name)) return param ? 'Taille et Blessures recalculées selon la Taille choisie' : null;
  if (isTrained(name)) {
    const war = TRAINED[trainedKey(param)];
    return war ? `${statsText(war.stats)}` : null;
  }
  if (MODELS[key]) return `${statsText(MODELS[key].stats)}, compétences et talents du modèle ${MODELS[key].label}`;
  const row = MODIFIERS[key];
  if (!row) return null;
  const parts = [statsText(row.stats), row.wounds?.rule === 'hardy' ? 'Blessures + BE (appliqué avant le multiplicateur de Taille)' : ''].filter(Boolean);
  return parts.join(', ') || null;
}

// Traits appliqués par l'outil lui-même (bouton ou calcul) : leur rappel permanent a été retiré exprès (tests B1 à B6 de branchement-store),
// la ligne de catalogue ne le ramène pas. Seuls noms dans ce cas ; tout autre Trait sans autre affichage reçoit sa ligne.
export const TRAITS_APPLIED_BY_TOOL = Object.freeze(['Size', 'Regeneration', 'Terror', 'Chameleon', 'Stealthy', 'Amphibious']);

/**
 * Rappels de Traits d'un participant : `{ key, text }`. `others` : fonctions participant → textes des autres modules de rappel ; un Trait
 * qu'une d'elles affiche déjà (essai sur un participant qui ne porte que lui) n'a pas de ligne de catalogue. « Dressé » garde sa ligne
 * générale (module de magie des créatures) et reçoit seulement la ligne de son dressage (Guerre, Magie, Cavalerie de choc). Pur.
 */
export function catalogueReminders(participant, others = []) {
  const out = [];
  const seen = new Set();
  const push = (key, text) => { if (!seen.has(key)) { seen.add(key); out.push({ key, text }); } };
  const shown = text => others.some(fn => { try { return fn({ id: participant?.id, name: participant?.name, traits: [text], extensions: {} }).length > 0; } catch { return false; } });
  const sources = [...(Array.isArray(participant?.traits) ? participant.traits : []), ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])];
  for (const source of sources) {
    const { name, detail: written } = splitTrait(textOfTrait(source));
    const detail = written || detailOf(source);
    const entry = catalogueTraitOf(name);
    if (!entry || !isText(name)) continue;
    if (isTrained(entry.name)) {
      for (const dressage of dressages(detail)) {
        const note = TRAINED_NOTES[trainedKey(dressage)];
        if (note) push(`${slug(entry.name)}-${slug(trainedKey(dressage))}`, `${labelOf(entry.name, dressage, entry.nameFr)} : ${note}`);
      }
      continue;
    }
    if (!isText(entry.summaryFr) || TRAITS_APPLIED_BY_TOOL.includes(entry.name) || shown(traitLabel(entry.name, detail))) continue;
    push(`${slug(entry.name)}-${slug(detail)}`, `${labelOf(entry.name, detail, entry.nameFr)} : ${entry.summaryFr}`);
  }
  for (const item of readOptionalChoices(participant).traits) {
    const text = profileChangeText(item);
    if (!text) continue;
    const entry = catalogueTraitOf(item.name);
    push(`modifie-${slug(item.key || item.name)}`, `${labelOf(entry?.name || item.name, String(item.param ?? '').trim(), entry?.nameFr)} : modifie le profil : ${text}.`);
  }
  return out;
}
