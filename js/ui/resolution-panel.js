/**
 * Résolution intégrée de Jouer (sans modale). Ce module ne fait que construire
 * le DOM à partir du brouillon tenu par workspace-view : toute saisie remonte
 * par `handlers`, et la vue reste propriétaire de l'état entre deux rendus.
 */
import { formatDamageFormula, damageBreakdown, describeWeaponDamage, inferActionType, previewHpLoss } from '../core/resolution.js';
import { actionHasDamage } from '../core/damage.js';
import { qualityLabel } from '../core/quality-normalization.js';

export const ACTION_TYPES = Object.freeze([
  ['attack', 'Attaque'],
  ['skill', 'Compétence'],
  ['defense', 'Défense / esquive'],
  ['opposition', 'Opposition']
]);
const ROLL_LABELS = Object.freeze({ attack: 'Attaque', skill: 'Compétence', defense: 'Défense', opposition: 'Opposition' });
const MINUS = '−';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(label, className, attrs = {}) {
  const element = node('button', className, label);
  element.type = 'button';
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

/** Nombre sans signe « + », négatif en U+2212 (PV sous zéro). */
export const minusSigned = value => {
  const number = Number(value) || 0;
  return number < 0 ? `${MINUS}${Math.abs(number)}` : String(number);
};

export const signed = value => {
  const number = Number(value) || 0;
  return number < 0 ? `${MINUS}${Math.abs(number)}` : `+${number}`;
};

/** Stable key of an action within the actor's list (dice lines may lack an id). */
export function actionKey(action, index) {
  return action?.id ? String(action.id) : `index-${index}`;
}

const finiteBase = value => (value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null);

/**
 * Choix de défense d'une cible : CC, Ag, ses jets enregistrés à base numérique, puis « Autre ».
 * `actions` est la liste complète de la cible (l'index fait la clé `jet:`).
 */
export function defenseOptions(target, actions = []) {
  const caracs = ['CC', 'Ag'].map(stat => {
    const base = finiteBase(target?.caracs?.[stat]);
    return { value: stat, label: `${stat} · ${base ?? '—'}`, statLabel: stat, group: 'caracs', base };
  });
  const jets = [];
  actions.forEach((action, index) => {
    const raw = finiteBase(action?.base);
    if (raw === null) return;
    const base = raw + (Number(action.mod) || 0);
    const statLabel = action.note || action.name || 'Jet';
    jets.push({ value: `jet:${actionKey(action, index)}`, label: `${statLabel} · ${base}`, statLabel, group: 'jets', base, type: inferActionType(action) });
  });
  return [...caracs, ...jets, { value: 'Autre', label: 'Autre (valeur libre)', statLabel: 'Autre', group: 'autre', base: null }];
}

/** Défense proposée d'office : le premier jet de type défense, sinon la CC. */
export function defaultDefenseValue(options) {
  return options.find(option => option.group === 'jets' && option.type === 'defense')?.value || 'CC';
}

export function actionLabel(action = {}) {
  return `${action.note || action.name || action.attr || 'Action'} · ${action.base ?? '—'}`;
}

function qualityNames(action = {}) {
  return (action.qualities || []).map(quality => qualityLabel(quality)).filter(Boolean);
}

function rubric(text) {
  return node('h4', 'workspace-rubric', text);
}

function chip(label, { pressed = false, key, attrs = {} } = {}) {
  const element = button(label, 'workspace-chip', { 'aria-pressed': String(pressed), 'data-focus-key': key, ...attrs });
  return element;
}

// Champs de jet du critique : clé du brouillon de workspace-view. Saisir ou cocher ne vide jamais l'aperçu.
const CRITICAL_ROLL_KEYS = Object.freeze({ location: 'criticalLocationRoll', effect: 'criticalEffectRoll', second: 'criticalSecondRoll' });

function rollField({ field, label, value, error, handlers, disabled, critical = null }) {
  const wrapper = node('div', 'workspace-roll');
  const id = `workspace-roll-${field}`;
  const caption = node('label', 'workspace-roll-label', label);
  caption.htmlFor = id;
  const row = node('div', 'workspace-roll-row');
  const input = document.createElement('input');
  input.id = id;
  input.className = 'workspace-roll-input num';
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.placeholder = 'Saisir';
  input.title = 'Tapez le d100 lancé à la table (01 à 00), puis Entrée';
  input.maxLength = 3;
  input.value = value;
  input.dataset.rollInput = field;
  input.dataset.focusKey = `roll-${field}`;
  input.disabled = disabled;
  input.setAttribute('aria-describedby', error ? `workspace-roll-hint ${id}-error` : 'workspace-roll-hint');
  if (error) input.setAttribute('aria-invalid', 'true');
  input.addEventListener('input', () => (critical
    ? handlers.criticalInput(CRITICAL_ROLL_KEYS[critical], input.value)
    : handlers.input(field === 'attack' ? 'attackRoll' : 'defenseRoll', input.value)));
  if (critical) input.addEventListener('change', () => handlers.criticalChange());
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handlers.calculate();
  });
  const roll = button('Lancer', 'workspace-secondary', { 'aria-label': `Lancer le d100 : ${label}`, 'data-focus-key': `roll-${field}-dice` });
  roll.disabled = disabled;
  roll.addEventListener('click', () => (critical ? handlers.criticalRoll(CRITICAL_ROLL_KEYS[critical]) : handlers.roll(field)));
  row.append(input, roll);
  wrapper.append(caption, row);
  if (error) {
    const alert = node('p', 'workspace-field-error', error);
    alert.id = `${id}-error`;
    alert.setAttribute('role', 'alert');
    wrapper.appendChild(alert);
  }
  return wrapper;
}

function outcomePill(label, success, sl) {
  return node('span', `workspace-outcome ${success ? 'is-success' : 'is-failure'}`, `${label} : ${success ? 'Réussite' : 'Échec'} · DR ${signed(sl)}`);
}

const zoneName = location => String(location.name).toLocaleLowerCase();

function criticalEffectLine(part) {
  const base = part.effectRollBase;
  const roll = part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : String(part.effectRoll);
  const line = node('p', 'workspace-result-line workspace-critical-effect');
  line.append(node('span', 'num', `${roll} → `), node('strong', '', `« ${part.effect.name} »`), ` : ${part.effect.eff}`);
  return line;
}

function criticalItemBox(item, handlers, busy) {
  const label = node('label', 'workspace-critical-item');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = item.applied;
  box.disabled = busy;
  box.dataset.focusKey = `critical-item-${item.id}`;
  box.addEventListener('change', () => handlers.criticalToggle(item.id, box.checked));
  label.append(box, node('span', '', item.label));
  return label;
}

// Gravité (d100), effet lu, cases à cocher, rappels : commun au critique et au second critique.
function criticalSeverity(part, crit, { field, label, value, error }, preview, draft, handlers) {
  const nodes = [rollField({ field, label, value, error, handlers, disabled: draft.busy, critical: crit === 'first' ? 'effect' : 'second' })];
  if (part.effect) nodes.push(criticalEffectLine(part));
  const items = preview.critical.items.filter(item => item.crit === crit);
  if (items.length) {
    const list = node('div', 'workspace-critical-items');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', crit === 'first' ? 'Effets du critique' : 'Effets du second critique');
    items.forEach(item => list.appendChild(criticalItemBox(item, handlers, draft.busy)));
    nodes.push(list);
  }
  if (part.parsed?.reminders.length) nodes.push(node('p', 'workspace-formula-notes workspace-muted', `À arbitrer : ${part.parsed.reminders.join(' ; ')}`));
  if (part.parsed?.death) nodes.push(node('p', 'workspace-critical-death', 'Mort instantanée'));
  return nodes;
}

function renderCritical(preview, draft, handlers) {
  const { details, second, secondHint, acharnement } = preview.critical;
  const errors = draft.criticalErrors || {};
  const block = node('div', 'workspace-critical');
  block.setAttribute('role', 'group');
  block.setAttribute('aria-label', 'Coup critique');
  block.appendChild(rubric('Coup critique'));
  if (acharnement) block.appendChild(node('p', 'workspace-formula-notes workspace-muted', `Acharnement : cible à ${minusSigned(preview.input.target?.hp)} PV, gravité +10`));
  block.appendChild(rollField({
    field: 'critical-location', label: 'Localisation du critique (nouveau d100)', value: draft.criticalLocationRoll,
    error: errors.location || '', handlers, disabled: draft.busy, critical: 'location'
  }));
  if (details.location) {
    block.appendChild(node('p', 'workspace-result-line num', `${details.locationRoll} → ${zoneName(details.location)}`));
    block.append(...criticalSeverity(details, 'first', {
      field: 'critical-effect', label: 'Gravité (d100)', value: draft.criticalEffectRoll, error: errors.effect || ''
    }, preview, draft, handlers));
  }
  if (second) {
    const follow = node('div', 'workspace-critical is-second');
    follow.setAttribute('role', 'group');
    follow.setAttribute('aria-label', 'Second critique');
    follow.appendChild(rubric(`Second critique — PV sous zéro · ${zoneName(second.location)} (jet inversé ${second.locationRoll})`));
    follow.append(...criticalSeverity(second, 'second', {
      field: 'critical-second', label: 'Gravité du second critique (d100)', value: draft.criticalSecondRoll, error: errors.secondEffect || ''
    }, preview, draft, handlers));
    block.appendChild(follow);
  } else if (secondHint) {
    block.appendChild(node('p', 'workspace-formula-notes workspace-muted', `Si les dégâts font passer la cible sous 0 PV : second critique au ${zoneName(secondHint.location)} (jet inversé ${secondHint.locationRoll}).`));
  }
  return block;
}

function renderResult(preview, target, draft, handlers) {
  const result = node('div', 'workspace-result');
  const pills = node('div', 'workspace-result-pills');
  const opposed = preview.opposition?.mode === 'opposed' ? preview.opposition : null;
  const pill = outcomePill(ROLL_LABELS[preview.actionType] || 'Jet', preview.success, preview.sl);
  if (preview.slBonus) pill.textContent += ` (${preview.slBonus > 0 ? 'Pointue' : 'Imprécise'} ${signed(preview.slBonus)})`;
  pills.appendChild(pill);
  if (opposed) pills.appendChild(outcomePill('Défense', opposed.defender.success, opposed.defender.sl));
  if (preview.critical?.kind === 'Critique') pills.appendChild(node('span', 'workspace-outcome is-critical', preview.attack ? 'Coup critique' : 'Réussite critique'));
  if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse'));
  result.appendChild(pills);

  if (opposed) {
    result.appendChild(node('p', 'workspace-result-line num', `DR net ${signed(opposed.netSl)} · ${preview.hit ? 'touché' : 'pas de touche'}`));
  } else if (preview.attack && !preview.hit) {
    result.appendChild(node('p', 'workspace-result-line', 'Pas de touche'));
  }
  const criticalAttack = preview.attack && preview.critical?.details;
  // Le critique affiche sa propre localisation dans son bloc.
  if (preview.location && !criticalAttack) {
    result.appendChild(node('p', 'workspace-result-line num', `${preview.location.roll} → ${zoneName(preview.location)}`));
  }
  // Arme « à arbitrer » : sa propre ligne suffit, la localisation n'y changerait rien.
  if (criticalAttack?.needsLocation && target && actionHasDamage(preview.input.action) && preview.weapon?.status !== 'manual') {
    result.appendChild(node('p', 'workspace-result-line workspace-damage-manual', 'Dégâts : lancez d’abord la localisation du critique.'));
  }
  if (preview.damage) {
    const formula = formatDamageFormula(preview.damage);
    const split = formula.lastIndexOf(' = ');
    const line = node('p', 'workspace-formula num');
    if (split < 0) line.textContent = formula;
    else {
      const [total, ...rest] = formula.slice(split + 3).split(' ');
      line.append(formula.slice(0, split + 3), node('strong', 'workspace-formula-total', total), rest.length ? ` ${rest.join(' ')}` : '');
    }
    result.appendChild(line);
    const { notes } = damageBreakdown(preview.damage);
    if (notes.length) result.appendChild(node('p', 'workspace-formula-notes workspace-muted', notes.join(' · ')));
  } else if (preview.weapon?.status === 'manual') {
    const { reason, text } = preview.weapon;
    const name = preview.input?.actor?.name || 'l’attaquant';
    result.appendChild(node('p', 'workspace-result-line workspace-damage-manual', reason === 'force-inconnue'
      ? `Dégâts à arbitrer : ${text} demande la Force de ${name} (F inconnue).`
      : `Dégâts à arbitrer : « ${text} » n’est pas calculable automatiquement.`));
  }
  if (criticalAttack) result.appendChild(renderCritical(preview, draft, handlers));
  if (target && (preview.damage || preview.critical?.application?.extraWounds)) {
    const after = (Number(target.hp) || 0) - previewHpLoss(preview);
    const hp = node('p', 'workspace-result-line num');
    hp.append(node('span', 'combatant-name', target.name), ` : PV ${minusSigned(target.hp)} → `, node('strong', 'workspace-result-hp', minusSigned(after)));
    result.appendChild(hp);
  }
  return result;
}

// Une ligne par cible : « Saskia : touché · 12 dégâts · PV 14 → 2 ».
function comparisonText({ name, hp, preview }) {
  const damage = preview.damage;
  const outcome = preview.hit ? 'touché' : 'pas de touche';
  const manual = preview.hit && preview.weapon?.status === 'manual' ? ' · dégâts à arbitrer' : '';
  const pending = preview.critical?.details?.needsLocation ? ' · coup critique (localisation à lancer)' : '';
  const loss = previewHpLoss(preview);
  return `${name} : ${outcome}${manual}${pending}${damage ? ` · ${loss} dégâts · PV ${minusSigned(hp)} → ${minusSigned((Number(hp) || 0) - loss)}` : ''}`;
}

function renderComparison(entries, handlers, busy) {
  const block = node('div', 'workspace-comparison');
  block.appendChild(rubric('Comparaison des cibles'));
  const list = node('ul', 'workspace-comparison-list');
  entries.forEach(entry => {
    const item = node('li', 'workspace-comparison-item');
    item.dataset.targetId = entry.targetId;
    const choose = button('Choisir', 'workspace-ghost', { 'aria-label': `Choisir ${entry.name}`, 'data-focus-key': `compare-choose-${entry.targetId}` });
    choose.disabled = busy;
    choose.addEventListener('click', () => handlers.choose(entry.targetId));
    item.append(node('span', 'num', comparisonText(entry)), choose);
    list.appendChild(item);
  });
  block.appendChild(list);
  return block;
}

/**
 * @param {object} options
 * @param {object} options.draft brouillon de la vue (jets, défense, aperçu, erreurs)
 * @param {object|null} options.actor participant qui agit
 * @param {Array} options.actions actions de celui qui agit
 * @param {string|null} options.actionKey clé de l'action retenue
 * @param {string|null} options.type type retenu
 * @param {object|null} options.target cible effective
 * @param {{ adversaries: Array, allies: Array }} options.groups cibles possibles
 * @param {{ options: Array, value: string, option: object }|null} options.defense choix de défense de la cible (attaque avec cible)
 * @param {boolean} options.canCalculate
 * @param {boolean} options.canApply
 * @param {object} options.handlers select, input, roll, calculate, compare, choose, apply, cancel
 */
export function renderResolutionPanel({ draft, actor, actions, actionKey: selectedKey, type, target, groups, defense, canCalculate, canApply, handlers }) {
  const section = node('section', 'workspace-resolution workspace-card');
  section.setAttribute('aria-labelledby', 'workspace-resolution-title');
  const title = node('h3', 'workspace-rubric', 'Résolution');
  title.id = 'workspace-resolution-title';
  section.appendChild(title);

  if (!actor) {
    section.appendChild(node('p', 'workspace-muted', 'Aucun combattant en jeu : faites entrer un combattant pour résoudre une action.'));
    return section;
  }

  // Action
  const actionBlock = node('div', 'workspace-resolution-row');
  actionBlock.appendChild(rubric('Action'));
  const actionChips = node('div', 'workspace-chip-list');
  if (!actions.length) actionChips.appendChild(node('p', 'workspace-muted', 'Aucune action préparée : ajoutez-en une avec « Modifier ».'));
  actions.forEach((action, index) => {
    const key = actionKey(action, index);
    const qualities = qualityNames(action);
    const item = chip('', { pressed: key === selectedKey, key: `action-${key}`, attrs: { 'data-action-key': key } });
    item.append(node('span', '', actionLabel(action)));
    if (actionHasDamage(action)) item.append(node('span', 'workspace-chip-note', ` · dégâts ${describeWeaponDamage(action, actor.caracs)}`));
    if (qualities.length) item.append(node('span', 'workspace-chip-note', ` · ${qualities.join(', ')}`));
    item.addEventListener('click', () => handlers.select({ actionKey: key }));
    actionChips.appendChild(item);
  });
  actionBlock.appendChild(actionChips);
  if (actions.length) {
    const typeLabel = node('label', 'workspace-type');
    typeLabel.append('Type');
    const select = document.createElement('select');
    select.dataset.focusKey = 'action-type';
    select.setAttribute('aria-label', 'Type d’action');
    ACTION_TYPES.forEach(([value, label]) => select.appendChild(new Option(label, value)));
    select.value = type || 'skill';
    select.addEventListener('change', () => handlers.select({ type: select.value }));
    typeLabel.appendChild(select);
    actionBlock.appendChild(typeLabel);
  }
  section.appendChild(actionBlock);

  // Cible
  const targetBlock = node('div', 'workspace-resolution-row');
  targetBlock.appendChild(rubric('Cible'));
  const targetChips = node('div', 'workspace-chip-list');
  [['Adversaires', groups.adversaries], ['Alliés', groups.allies]].forEach(([label, list]) => {
    if (!list.length) return;
    const group = node('div', 'workspace-chip-group');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    group.appendChild(node('span', 'workspace-chip-group-label', label));
    list.forEach(participant => {
      const item = chip(participant.name, { pressed: participant.id === target?.id, key: `target-${participant.id}` });
      item.classList.add('combatant-name');
      item.addEventListener('click', () => handlers.select({ targetId: participant.id }));
      group.appendChild(item);
    });
    targetChips.appendChild(group);
  });
  const none = chip('Aucune cible', { pressed: !target, key: 'target-none' });
  none.addEventListener('click', () => handlers.select({ targetId: 'none' }));
  targetChips.appendChild(none);
  targetBlock.appendChild(targetChips);
  section.appendChild(targetBlock);

  if (!actions.length) return section;
  const action = actions.find((item, index) => actionKey(item, index) === selectedKey) || actions[0];

  // Jets
  const rolls = node('div', 'workspace-resolution-rolls');
  const attr = action.attr && action.attr !== 'Custom' ? `${action.attr} ` : '';
  const mod = Number(action.mod) || 0;
  rolls.appendChild(rollField({
    field: 'attack',
    label: `${ROLL_LABELS[type] || 'Jet'} (${attr}${action.base ?? '—'}${mod ? ` ${signed(mod)}` : ''})`,
    value: draft.attackRoll,
    error: draft.error?.field === 'attack' ? draft.error.message : '',
    handlers,
    disabled: draft.busy
  }));
  if (type === 'attack' && target) {
    const defenseBlock = node('div', 'workspace-defense');
    const legend = node('p', 'workspace-roll-label');
    legend.append('Défense de ', node('span', 'combatant-name', target.name), ' (facultative)');
    defenseBlock.appendChild(legend);
    const row = node('div', 'workspace-roll-row');
    const stat = document.createElement('select');
    stat.setAttribute('aria-label', `Défense de ${target.name} : caractéristique ou jet`);
    stat.dataset.focusKey = 'defense-stat';
    const groupOf = (label, group) => {
      const items = defense.options.filter(option => option.group === group);
      if (!items.length) return;
      const optgroup = document.createElement('optgroup');
      optgroup.label = label;
      items.forEach(option => optgroup.appendChild(new Option(option.label, option.value)));
      stat.appendChild(optgroup);
    };
    groupOf('Caractéristiques', 'caracs');
    groupOf('Jets enregistrés', 'jets');
    defense.options.filter(option => option.group === 'autre').forEach(option => stat.appendChild(new Option(option.label, option.value)));
    stat.value = defense.value;
    stat.disabled = draft.busy;
    stat.addEventListener('change', () => handlers.select({ defenseStat: stat.value, defenseBase: null }));
    const base = document.createElement('input');
    base.type = 'number';
    base.className = 'workspace-defense-base';
    base.setAttribute('aria-label', `Valeur de défense de ${target.name}`);
    base.dataset.focusKey = 'defense-base';
    base.value = draft.defenseBase ?? '';
    base.disabled = draft.busy;
    base.addEventListener('input', () => handlers.input('defenseBase', base.value));
    row.append(stat, base);
    defenseBlock.appendChild(row);
    defenseBlock.appendChild(rollField({
      field: 'defense',
      label: `Jet de défense (${defense.option.value === 'Autre' ? 'valeur' : defense.option.statLabel} ${draft.defenseBase || '—'})`,
      value: draft.defenseRoll,
      error: draft.error?.field === 'defense' ? draft.error.message : '',
      handlers,
      disabled: draft.busy
    }));
    rolls.appendChild(defenseBlock);
  }
  section.append(rolls, node('p', 'workspace-roll-hint', 'Dés lancés à la table : tapez le résultat dans la case, puis Entrée.'));
  section.lastChild.id = 'workspace-roll-hint';

  const commands = node('div', 'workspace-inline-actions workspace-resolution-commands');
  const calculate = button('Calculer', 'workspace-secondary', { 'data-focus-key': 'calculate' });
  calculate.disabled = draft.busy || !canCalculate;
  if (!canCalculate) calculate.title = 'Action indisponible';
  calculate.addEventListener('click', () => handlers.calculate());
  commands.appendChild(calculate);
  // « Et si… » : mêmes jets sur chaque cible possible, sans rien appliquer.
  if (type === 'attack' && groups.adversaries.length + groups.allies.length > 1) {
    const compare = button('Comparer les cibles', 'workspace-secondary', { 'data-focus-key': 'compare' });
    compare.disabled = draft.busy || !canCalculate;
    compare.addEventListener('click', () => handlers.compare());
    commands.appendChild(compare);
  }
  section.appendChild(commands);

  const live = node('div', 'workspace-result-live');
  live.setAttribute('aria-live', 'polite');
  if (draft.error?.field === 'apply' || draft.error?.field === 'general') {
    const alert = node('p', 'workspace-field-error', draft.error.message);
    alert.setAttribute('role', 'alert');
    live.appendChild(alert);
  }
  if (draft.comparison) live.appendChild(renderComparison(draft.comparison, handlers, draft.busy));
  const preview = draft.preview;
  if (preview) {
    live.appendChild(renderResult(preview, target, draft, handlers));
    const apply = node('div', 'workspace-inline-actions workspace-resolution-commands');
    const needsTarget = preview.attack && !preview.targetId;
    const needsLocation = Boolean(preview.attack && preview.critical?.details?.needsLocation);
    const invalidCritical = Object.keys(draft.criticalErrors || {}).length > 0;
    const effects = preview.critical?.application;
    const manual = preview.weapon?.status === 'manual';
    const label = needsLocation && target ? (manual ? `Appliquer le critique à ${target.name}` : `Appliquer les dégâts à ${target.name}`)
      : preview.damage && target ? `Appliquer ${previewHpLoss(preview)} dégâts à ${target.name}`
        : target && effects && (effects.extraWounds || effects.states.length) ? `Appliquer le critique à ${target.name}`
          : manual ? 'Enregistrer sans dégâts' : 'Enregistrer le résultat';
    const primary = button(label, 'workspace-primary', { 'data-focus-key': 'apply' });
    primary.disabled = draft.busy || !canApply || needsTarget || needsLocation || invalidCritical;
    if (needsTarget) primary.title = 'Choisissez une cible pour appliquer une attaque';
    else if (needsLocation) primary.title = 'Lancez d’abord la localisation du critique';
    else if (invalidCritical) primary.title = 'Corrigez le jet de critique';
    primary.addEventListener('click', () => handlers.apply());
    const cancel = button('Annuler', 'workspace-ghost', { 'data-focus-key': 'cancel-preview', 'aria-label': 'Annuler le résultat calculé' });
    cancel.disabled = draft.busy;
    cancel.addEventListener('click', () => handlers.cancel());
    apply.append(primary, cancel);
    if (needsTarget) apply.appendChild(node('span', 'workspace-muted', 'Choisissez une cible pour appliquer une attaque.'));
    live.appendChild(apply);
  }
  section.appendChild(live);
  return section;
}
