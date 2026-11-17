/**
 * Traits optionnels des créatures (chantier des Traits optionnels, lot L2) : modèle des coches et règles de choix.
 * Fonctions pures : aucune entrée n'est modifiée, chaque opération rend `{ ok: true, choices }` ou `{ ok: false, error }`.
 * Les coches vivent sur le profil, dans `extensions.v5.optionalChoices` (D14) ; leur absence se lit comme vide, sans réécrire les données.
 * Aucun effet sur les caractéristiques ici (lot L3).
 *
 * Forme des coches : `{ traits: [{ key, name, param, kind, origin }], attacks: [{ name, actions }], armour: [{ name, part, zones }] }`.
 * `origin` : « optional » (Trait facultatif de la fiche) ou « free » (ajouté librement, D3). `key` : `Nom` ou `Nom:paramètre`.
 */
import { cloneValue } from './models.js';
import { attackActions, printedArmour } from './bestiary-profiles.js';
import { parseSizeTrait } from './creature-size.js';
import { catalogueTraitOf } from '../data/creature-trait-catalogue.js';

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
  if (!candidate) return refuse(`Trait « ${key} » non proposé pour ${record?.nameFr || record?.name || 'ce profil'}.`);
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

