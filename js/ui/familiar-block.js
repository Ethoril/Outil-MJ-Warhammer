import {
  FAMILIAR_NAMES, FAMILIAR_WINDS, FAMILIAR_WIND_NAMES, FAMILIAR_COSTS, HOMUNCULUS_KINDS, COMPANION_TRAITS,
  familiarLinksOf, familiarOfOf, linkedFamiliars, familiarLinkLabel, familiarCostBalance
} from '../core/familiars.js';

const addSelect = (createElement, block, className, title, rows) => {
  const select = createElement('select');
  select.className = 'tiny ' + className;
  select.title = title;
  for (const [value, text] of rows) {
    const option = createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }
  block.appendChild(select);
  return select;
};
const addNumber = (createElement, block, className, title, placeholder) => {
  const field = createElement('input');
  field.type = 'number';
  field.min = '0';
  field.className = 'tiny ' + className;
  field.title = title;
  field.placeholder = placeholder;
  block.appendChild(field);
  return field;
};

/**
 * Bloc Familier de la carte (B10) : familiers liés du maître, puis « Création de familier » (familier choisi parmi les
 * participants, type, Vent ou espèce, Destin ou Résilience sacrifié, points supplémentaires, solde saisi si inconnu).
 * Affiché pour un PJ ou un maître déjà lié ; `null` pour un familier ou un autre participant.
 */
export function buildFamiliarBlock(createElement, participant, participants = []) {
  if (!participant || familiarOfOf(participant)) return null;
  const links = familiarLinksOf(participant);
  if (participant.kind !== 'PJ' && !links.length) return null;
  const block = createElement('div');
  block.className = 'actor-familiar';
  const label = createElement('span');
  label.textContent = 'Familier :';
  block.appendChild(label);
  let animalDeath = false;
  for (const { link, familiar } of linkedFamiliars(participant, participants)) {
    const row = createElement('span');
    row.className = 'familiar-link';
    row.textContent = familiarLinkLabel(link, familiar);
    block.appendChild(row);
    const unlink = createElement('button');
    unlink.type = 'button';
    unlink.className = 'tiny btn-unlink-familiar';
    unlink.dataset.linkId = link.id;
    unlink.textContent = 'Retirer le lien';
    unlink.title = 'Retire le lien des deux côtés sans rendre le point sacrifié (Annuler la création le rend)';
    block.appendChild(unlink);
    if (link.system !== 'animal' || !familiar) continue;
    // Un animal n'agit (talents de compagnon, soutien) qu'à 4 yards : booléen posé par le MJ.
    const range = createElement('button');
    range.type = 'button';
    range.className = 'tiny btn-familiar-range';
    range.dataset.linkId = link.id;
    range.dataset.inRange = link.inRange === true ? 'true' : 'false';
    range.textContent = link.inRange === true ? 'À portée (4 yards)' : 'Hors de portée';
    range.title = 'Bascule la portée du familier animal : hors de portée, ses talents de compagnon et son soutien sont suspendus';
    block.appendChild(range);
    const death = createElement('button');
    death.type = 'button';
    death.className = 'tiny btn-familiar-death';
    death.dataset.linkId = link.id;
    death.dataset.familiarId = familiar.id;
    death.textContent = 'Mort du familier';
    death.title = 'Test de Calme Difficile du maître ; si « Calme raté » est coché, les deux d10 saisis sont infligés en Blessures directes';
    block.appendChild(death);
    animalDeath = true;
  }
  if (animalDeath) {
    const failed = createElement('input');
    failed.type = 'checkbox';
    failed.className = 'familiar-calm-failed';
    failed.title = 'Le maître a raté le Test de Calme à la mort de son familier';
    block.appendChild(failed);
    const failedLabel = createElement('span');
    failedLabel.textContent = 'Calme raté';
    block.appendChild(failedLabel);
    addNumber(createElement, block, 'familiar-death-d1', 'Premier d10 des dégâts', 'd10');
    addNumber(createElement, block, 'familiar-death-d2', 'Second d10 des dégâts', 'd10');
  }
  const candidates = participants.filter(item => item.id !== participant.id && item.kind !== 'PJ' && !familiarOfOf(item) && !familiarLinksOf(item).length);
  if (!candidates.length) return block;
  addSelect(createElement, block, 'familiar-target', 'Participant qui devient le familier (PNJ allié)', [['', 'Familier…'], ...candidates.map(item => [item.id, item.name || item.id])]);
  addSelect(createElement, block, 'familiar-system', 'Système de familier', [['homunculus', FAMILIAR_NAMES.homunculus], ['animal', FAMILIAR_NAMES.animal]]);
  addSelect(createElement, block, 'familiar-kind', 'Type d’homoncule (un familier animal est toujours de puissance)', HOMUNCULUS_KINDS.map(kind => [kind, FAMILIAR_NAMES[kind]]));
  addSelect(createElement, block, 'familiar-wind', 'Vent de l’homoncule (Imprégné de)', FAMILIAR_WINDS.map(wind => [wind, FAMILIAR_WIND_NAMES[wind]]));
  addSelect(createElement, block, 'familiar-species', 'Espèce du familier animal (Trait de compagnon)', Object.entries(COMPANION_TRAITS).map(([key, trait]) => [key, trait.name]));
  addSelect(createElement, block, 'familiar-resource', 'Point sacrifié par le maître', Object.entries(FAMILIAR_COSTS).map(([key, name]) => [key, name]));
  addNumber(createElement, block, 'familiar-extra', 'Points supplémentaires cédés : chacun donne 1 point à répartir au familier', 'Suppl.');
  const known = Object.keys(FAMILIAR_COSTS).map(key => FAMILIAR_COSTS[key] + ' ' + (familiarCostBalance(participant, key) ?? 'inconnu')).join(', ');
  addNumber(createElement, block, 'familiar-balance', 'Solde actuel de la ressource, à saisir seulement si l’outil ne le connaît pas (' + known + ')', 'Solde');
  const button = createElement('button');
  button.type = 'button';
  button.className = 'tiny btn-create-familiar';
  button.textContent = 'Création de familier';
  button.title = 'Lie le familier, débite le point sacrifié du maître (annulable : Annuler rend le point)';
  block.appendChild(button);
  return block;
}

/** Saisie de la mort d'un familier animal : Calme raté (case) et les deux d10 (null si vides). */
export function readFamiliarDeathInputs(block) {
  const d10 = selector => { const raw = block?.querySelector(selector)?.value ?? ''; return raw === '' ? null : Number(raw); };
  return { calmFailed: block?.querySelector('.familiar-calm-failed')?.checked === true, rolls: [d10('.familiar-death-d1'), d10('.familiar-death-d2')] };
}

/** Lit la saisie du bloc ; le Vent ne vaut que pour un homoncule, l'espèce que pour un animal. */
export function readFamiliarInputs(block) {
  const value = selector => block?.querySelector(selector)?.value ?? '';
  const system = value('.familiar-system');
  const homunculus = system === 'homunculus';
  const extra = value('.familiar-extra'), balance = value('.familiar-balance');
  return {
    familiarId: value('.familiar-target') || null, system,
    kind: homunculus ? value('.familiar-kind') : 'power',
    wind: homunculus ? value('.familiar-wind') || null : null,
    species: homunculus ? null : value('.familiar-species') || null,
    resource: value('.familiar-resource'),
    extraPoints: extra === '' ? 0 : Number(extra),
    balance: balance === '' ? null : Number(balance)
  };
}
