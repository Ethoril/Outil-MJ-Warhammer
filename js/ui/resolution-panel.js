import { inferV5Kind, hasMomentum } from '../core/v5-combat-rules.js';
import { EXCLUDED_BASE_CHARACTERISTIC_TALENTS } from '../core/talent-contracts.js';
import { hasV5Talent, V5_TALENT_IDS } from '../core/v5-talents.js';
import { ammunitionCompatibility, equipmentAttackContext } from '../core/equipment.js';
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
    const base = raw;
    const statLabel = action.note || action.name || 'Jet';
    jets.push({ value: `jet:${actionKey(action, index)}`, label: `${statLabel} · ${base}`, statLabel, group: 'jets', base, mod: action.mod || 0, v5: { ...(action.extensions?.v5 || {}), kind: action.extensions?.v5?.kind || (inferActionType(action) === 'skill' || (action.attr && action.attr !== 'CC') || /esquive|dodge/i.test(statLabel) ? 'test' : 'melee') }, qualities: action.qualities || [], type: inferActionType(action) });
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
const CRITICAL_ROLL_KEYS = Object.freeze({ location: 'criticalLocationRoll', effect: 'criticalEffectRoll', second: 'criticalSecondRoll', effectAlternative: 'criticalEffectAlternativeRoll', secondEffectAlternative: 'criticalSecondAlternativeRoll', defenderLocation: 'defenderCriticalLocationRoll', defenderEffect: 'defenderCriticalEffectRoll', defenderEffectAlternative: 'defenderCriticalEffectAlternativeRoll' });

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
  const choice = part.effectRollCandidates?.length === 2 ? `min(${part.effectRollCandidates.join(', ')}) = ` : '';
  const roll = choice + (part.bonus ? `${base} + ${part.bonus} = ${part.effectRoll}` : String(part.effectRoll));
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

function renderCritical(preview, draft, handlers, defending = false) {
  const critical = defending ? preview.defenderCritical : preview.critical;
  const { details, second } = critical;
  const errors = draft.criticalErrors || {};
  const block = node('div', 'workspace-critical');
  const title = defending ? 'Critique défensif sur l’attaquant' : 'Blessures critiques sur la cible';
  block.setAttribute('role', 'group'); block.setAttribute('aria-label', title);
  block.appendChild(rubric(title));
  const appendPart = (part, kind, label) => {
    if (!part) return;
    block.appendChild(rubric(label));
    if (kind === 'first') block.appendChild(rollField({ field: defending ? 'defender-critical-location' : 'critical-location',
      label: 'Localisation du critique (nouveau d100)', value: defending ? draft.defenderCriticalLocationRoll : draft.criticalLocationRoll,
      error: errors[defending ? 'defenderLocation' : 'location'] || '', handlers, disabled: draft.busy,
      critical: defending ? 'defenderLocation' : 'location' }));
    if (!part.location) return;
    block.appendChild(node('p', 'workspace-result-line', `${part.locationRoll} → ${part.location.name}`));
    block.appendChild(rollField({ field: defending ? 'defender-critical-effect' : kind === 'first' ? 'critical-effect' : 'critical-second',
      label: part.bonus ? `Gravité (d100 + ${part.bonus})` : 'Gravité (d100)',
      value: defending ? draft.defenderCriticalEffectRoll : kind === 'first' ? draft.criticalEffectRoll : draft.criticalSecondRoll,
      error: errors[defending ? 'defenderEffect' : kind === 'first' ? 'effect' : 'secondEffect'] || '', handlers, disabled: draft.busy,
      critical: defending ? 'defenderEffect' : kind === 'first' ? 'effect' : 'second' }));
    if (part.needsAlternative || part.effectAlternativeRoll != null) block.appendChild(rollField({
      field: defending ? 'defender-critical-effect-alternative' : kind === 'first' ? 'critical-effect-alternative' : 'critical-second-alternative',
      label: 'Inoffensive : deuxième gravité (retenir le minimum)',
      value: defending ? draft.defenderCriticalEffectAlternativeRoll : kind === 'first' ? draft.criticalEffectAlternativeRoll : draft.criticalSecondAlternativeRoll,
      error: errors[defending ? 'defenderEffectAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative'] || '', handlers, disabled: draft.busy,
      critical: defending ? 'defenderEffectAlternative' : kind === 'first' ? 'effectAlternative' : 'secondEffectAlternative' }));
    if (part.effect) block.appendChild(criticalEffectLine(part));
    for (const item of critical.items.filter(item => item.crit === kind)) block.appendChild(criticalItemBox(
      { ...item, id: defending ? `defender:${item.id}` : item.id }, handlers, draft.busy));
    if (part.parsed?.reminders.length) block.appendChild(node('p', 'workspace-muted', `À traiter : ${part.parsed.reminders.join(' ; ')}`));
    if (part.parsed?.death) block.appendChild(node('p', 'workspace-critical-death', 'Mort instantanée — décision du MJ à enregistrer.'));
  };
  appendPart(details, 'first', defending ? 'Critique de la défense' : 'Critique du jet');
  appendPart(second, 'second', `Critique d’excédent : ${critical.excessWounds} Blessures au-delà de 0`);
  return block;
}

function renderV5Decisions(preview, draft, handlers) {
  const block = node('div', 'workspace-v5-decisions');
  for (const [role, decision] of Object.entries(preview.decisions || {})) {
    if (!decision.choiceRequired && !decision.forcedInversion) continue;
    const name = role === 'actor' ? preview.input.actor?.name || 'Acteur' : preview.input.target?.name || 'Défenseur';
    const group = node('fieldset', 'workspace-v5-choice-group');
    group.appendChild(node('legend', '', `${name} — ${decision.forcedInversion ? 'inversion obligatoire' : 'choix du joueur'}`));
    const cards = node('div', 'workspace-v5-choice-cards');
    const selected = role === 'actor' ? preview.input.v5.choice : preview.input.defense?.v5.choice;
    for (const option of decision.options) {
      const card = node('label', 'workspace-v5-choice');
      if (option.id === selected) card.classList.add('is-selected');
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `v5-choice-${role}`;
      radio.value = option.id; radio.checked = option.id === selected || !decision.choiceRequired;
      radio.disabled = draft.busy || !decision.choiceRequired; radio.dataset.focusKey = `v5-choice-${role}-${option.id}`;
      radio.addEventListener('change', () => handlers.chooseV5(role, option.id));
      const summary = option.summary;
      const text = node('div', 'workspace-v5-choice-text');
      text.append(node('strong', '', option.label), node('span', '', `${role === 'defender' ? (summary.hit ? 'Touche reçue' : 'Attaque évitée') : (summary.hit ? 'Touché' : 'Pas de touche')} · ${signed(summary.sl)} DR`));
      if (summary.location) text.appendChild(node('span', '', summary.location));
      text.appendChild(node('span', '', summary.woundsLost == null ? 'Blessures à préciser' : `${summary.woundsLost} Blessures ${role === 'defender' ? 'subies par le défenseur' : 'perdues par la cible'}`));
      if (summary.certainty === 'partial') text.appendChild(node('span', 'workspace-muted', 'Conséquences incomplètes : données à préciser.'));
      if (summary.importantEffects.length) text.appendChild(node('span', '', summary.importantEffects.join(' · ')));
      text.appendChild(node('span', 'workspace-muted', 'Coût : aucun'));
      if (decision.recommendation?.optionId === option.id) text.appendChild(node('span', 'workspace-v5-recommendation', `Conseil : ${decision.recommendation.label}`));
      card.append(radio, text); cards.appendChild(card);
    }
    group.appendChild(cards);
    if (decision.equivalentKnownWounds) group.appendChild(node('p', 'workspace-muted', 'Même nombre de Blessures connu : comparez les autres conséquences.'));
    block.appendChild(group);
  }
  return block;
}

function renderResult(preview, target, draft, handlers) {
  const result = node('div', 'workspace-result');
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Aperçu provisoire : les joueurs doivent confirmer leurs choix.'));
  result.appendChild(renderV5Decisions(preview, draft, handlers));
  const pills = node('div', 'workspace-result-pills');
  pills.appendChild(outcomePill(ROLL_LABELS[preview.actionType] || 'Jet', preview.success, preview.sl));
  if (preview.opposition?.mode === 'opposed') pills.appendChild(outcomePill('Défense', preview.opposition.defender.success, preview.opposition.defender.sl));
  if (preview.fumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse de l’attaquant'));
  if (preview.defenderFumble) pills.appendChild(node('span', 'workspace-outcome is-critical', 'Maladresse du défenseur'));
  result.appendChild(pills);
  if (preview.attack) result.appendChild(node('p', 'workspace-result-line', `${preview.hit ? 'Touché' : 'Pas de touche'}${preview.location ? ` · ${preview.location.name}` : ''}`));
  if (target && preview.damage) result.appendChild(node('p', 'workspace-result-line', `${target.name} : ${previewHpLoss(preview)} Blessures proposées · PV ${target.hp} → ${Math.max(0, Number(target.hp) - previewHpLoss(preview))}`));
  if (preview.actionCosts?.paid?.length) result.appendChild(node('p', 'workspace-result-line',
    'Coût proposé avant le jet : ' + preview.actionCosts.paid.map(cost => cost.resource === 'momentum' ? '1 Élan' : cost.amount + ' ' + cost.resource).join(', ')));
  if (preview.damageReplacedByTalent) result.appendChild(node('p', 'workspace-result-line', 'Battement : 0 Blessure ; toutes les conséquences du critique remplacé sont supprimées. Esquive reste possible.'));
  const reductions = (preview.talentPlans || []).flatMap(plan => plan.proposals || []).filter(proposal => proposal.op === 'reduceConditionAcquisition');
  if (reductions.length) result.appendChild(node('p', 'workspace-result-line', 'Mâchoires d’acier : un Sonné évité, premier usage de cette rencontre.'));
  for (const change of preview.momentum || []) {
    const name = change.participantId === preview.input.actor?.id ? preview.input.actor.name : target?.name;
    result.appendChild(node('p', 'workspace-result-line', `${name || 'Combattant'} : Élan ${change.before ? 'oui' : 'non'} → ${change.after ? 'oui' : 'non'}`));
  }
  for (const warning of preview.unresolved || []) result.appendChild(node('p', 'workspace-field-error', warning));
  if (preview.choiceRequired) result.appendChild(node('p', 'workspace-muted', 'Choisissez chaque inversion facultative avant de confirmer.'));
  if (preview.weapon?.status === 'manual') result.appendChild(node('p', 'workspace-field-error', `Dégâts à arbitrer : ${preview.weapon.text}.`));
  if (preview.protection?.manual?.length) result.appendChild(node('p', 'workspace-field-error', 'Protection à préciser : renseignez les PA après arbitrage.'));
  if (preview.mechanicalWarnings?.length) result.appendChild(node('p', 'workspace-field-error', `Effets non validés V5 : ${preview.mechanicalWarnings.map(item => item.keywordId).join(', ')}.`));
  if (preview.critical?.details || preview.critical?.second) result.appendChild(renderCritical(preview, draft, handlers));
  if (preview.defenderCritical) result.appendChild(renderCritical(preview, draft, handlers, true));
  const calculations = node('details', 'workspace-v5-calculations');
  calculations.appendChild(node('summary', '', 'Détail des calculs et règles'));
  for (const [name, test] of [['Attaque / Test', preview.test], ['Défense', preview.defenderTest]]) {
    if (!test) continue;
    calculations.appendChild(node('p', 'workspace-formula-notes', `${name} : jet initial ${test.initialRoll}, jet final ${test.roll} · score ${test.score} · DR de base ${signed(test.details.baseSl)} · modificateurs ${signed(test.details.totalModifier)} · ${test.advantage.advantage.length} Avantage(s), ${test.advantage.disadvantage.length} Désavantage(s)`));
    for (const modifier of test.details.modifiers) calculations.appendChild(node('p', 'workspace-formula-notes', `${modifier.label} : ${signed(modifier.amount)} DR`));
    if (test.zeroOutcome) calculations.appendChild(node('p', 'workspace-formula-notes', test.success ? 'Réussite marginale (+0 DR)' : 'Échec marginal (−0 DR)'));
  }
  if (preview.opposition?.mode === 'opposed') calculations.appendChild(node('p', 'workspace-formula-notes', `DR net ${signed(preview.opposition.netSl)}${preview.opposition.tie ? ' · égalité : l’initiateur gagne' : ''}`));
  if (preview.damage) calculations.appendChild(node('p', 'workspace-formula num', formatDamageFormula(preview.damage)));
  if (preview.protection) calculations.appendChild(node('p', 'workspace-formula-notes', `Protection retenue : ${preview.protection.ap ?? 'inconnue'} PA`));
  calculations.appendChild(node('p', 'workspace-muted', `Règle : ${preview.ruleVersion}`));
  const covered = new Set(Object.values(V5_TALENT_IDS));
  const excluded = new Set(EXCLUDED_BASE_CHARACTERISTIC_TALENTS);
  const acquired = preview.input.actor?.talents || [];
  const uncovered = acquired.filter(row => !excluded.has(row.id) && (!covered.has(row.id) || row.status !== 'resolved'));
  if (uncovered.length) calculations.appendChild(node('p', 'workspace-muted', 'Autres talents à arbitrer par le MJ : ' + uncovered.map(row => row.name || row.nom || row.id).join(', ')));
  if (acquired.some(row => excluded.has(row.id))) calculations.appendChild(node('p', 'workspace-muted', 'Les bonus permanents de caractéristiques sont déjà compris dans la fiche.'));
  const disabled = new Map((preview.talentPlans || []).flatMap(plan => plan.trace || [])
    .filter(row => ['sourceChanged','sourceUnavailable','draft'].includes(row.status)).map(row => [row.talentId, row.status]));
  for (const [id, status] of disabled) {
    const talent = [...acquired, ...(preview.input.target?.talents || [])].find(row => row.id === id);
    calculations.appendChild(node('p', 'workspace-field-error', (talent?.name || id) + ' : ' +
      (status === 'sourceChanged' ? 'description modifiée' : status === 'sourceUnavailable' ? 'source indisponible' : 'règle encore en préparation') + ' ; effet à arbitrer par le MJ.'));
  }
  result.appendChild(calculations);
  return result;
}

// Une ligne par cible : « Saskia : touché · 12 dégâts · PV 14 → 2 ».
function comparisonText({ name, hp, preview }) {
  const damage = preview.damage;
  const outcome = preview.hit ? 'touché' : 'pas de touche';
  const manual = preview.hit && preview.weapon?.status === 'manual' ? ' · dégâts à arbitrer' : '';
  const pending = preview.critical?.details?.needsLocation ? ' · coup critique (localisation à lancer)' : '';
  const loss = previewHpLoss(preview);
  return `${name} : ${outcome}${manual}${pending}${damage ? ` · ${loss} dégâts · PV ${minusSigned(hp)} → ${minusSigned(Math.max(0, (Number(hp) || 0) - loss))}` : ''}`;
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

  if(action.extensions?.fiche?.requiresLink) section.appendChild(node('p','workspace-field-error','Compétence à choisir dans « Mettre à jour les PJ » avant de lancer cette action.'));
  if(type === 'attack') {
    const ammo=action.extensions?.equipment?.range ? (actor.equipment||[]).filter(row=>row.kind==='ammunition' && ammunitionCompatibility(action.extensions.equipment,row).status !== 'incompatible') : [];
    if(ammo.length) { const label=node('label','workspace-type','Munition');const select=document.createElement('select');select.setAttribute('aria-label','Munition');select.append(new Option('Aucune munition ajoutée',''));ammo.forEach(row=>select.append(new Option(row.name,row.id)));select.value=draft.ammunitionId||'';select.addEventListener('change',()=>handlers.select({ammunitionId:select.value,ammunitionArbitrated:false}));label.append(select);section.append(label); }
    const selectedAmmo = ammo.find(row=>row.id===draft.ammunitionId);
    if(selectedAmmo && ammunitionCompatibility(action.extensions.equipment,selectedAmmo).status==='manual') { const label=node('label','workspace-type');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=draft.ammunitionArbitrated===true;checkbox.addEventListener('change',()=>handlers.select({ammunitionArbitrated:checkbox.checked}));label.append(checkbox,'Compatibilité de cette munition vérifiée par le MJ');section.append(label); }
    if(target) {
      const context=draft.protectionContext||{};const block=node('details','workspace-defense');block.append(node('summary','','Protection et bouclier pour cette attaque'));
      const shields=(target.equipment||[]).filter(row=>row.kind==='shield');
      if(shields.length){const label=node('label','workspace-type','Bouclier');const select=document.createElement('select');select.setAttribute('aria-label','Bouclier utilisé');select.append(new Option('Aucun',''));shields.forEach(row=>select.append(new Option(row.name,row.id)));select.value=context.shieldId||'';select.addEventListener('change',()=>handlers.select({protectionContext:{...context,shieldId:select.value}}));label.append(select);block.append(label);}
      for(const [key,text] of [['shieldAvailable','Bouclier disponible ce tour'],['opposedWithShield','Défense opposée avec ce bouclier'],['ranged','Attaque à distance'],['lineOfSight','Attaquant visible']]) {
        const label=node('label','workspace-type',text);const choice=document.createElement('select');choice.setAttribute('aria-label',text);
        const inferred=key === 'ranged' && action.extensions?.equipment ? equipmentAttackContext(action.extensions.equipment)?.ranged : undefined;
        const value=typeof inferred==='boolean'?inferred:context[key];choice.append(new Option('À préciser',''),new Option('Oui','true'),new Option('Non','false'));choice.value=typeof value==='boolean'?String(value):'';choice.disabled=typeof inferred==='boolean';
        choice.addEventListener('change',()=>handlers.select({protectionContext:{...context,[key]:choice.value===''?undefined:choice.value==='true'}}));label.append(choice);block.append(label);
      }
      const manual=node('label','workspace-type','PA retenus après arbitrage (facultatif)');const input=document.createElement('input');input.type='number';input.min='0';input.setAttribute('aria-label','PA retenus après arbitrage');input.value=context.manualAp ?? '';input.addEventListener('change',()=>handlers.select({protectionContext:{...context,manualAp:input.value===''?undefined:Number(input.value)}}));manual.append(input);block.append(manual);section.append(block);
    }
  }
  const v5 = node('div', 'workspace-v5-context');
  v5.appendChild(rubric('Test V5'));
  const numberField = (key, label, value, minimum = null) => {
    const caption = node('label', 'workspace-type', label); const input = document.createElement('input');
    input.type = 'number'; input.step = '1'; if (minimum != null) { input.min = String(minimum); input.max = '100'; }
    input.value = value ?? ''; input.setAttribute('aria-label', label); input.dataset.focusKey = key;
    input.addEventListener('change', () => handlers.select({ [key]: input.value === '' ? null : Number(input.value) }));
    caption.appendChild(input); v5.appendChild(caption);
  };
  const kindLabel = node('label', 'workspace-type', 'Nature du Test'); const kind = document.createElement('select');
  for (const [value, label] of [['melee','Corps à corps'],['ranged','Tir'],['test','Autre Test']]) kind.appendChild(new Option(label,value));
  kind.value = draft.v5Kind || inferV5Kind({ ...action, type }, equipmentAttackContext(action.extensions?.equipment));
  kind.setAttribute('aria-label','Nature du Test'); kind.dataset.focusKey='v5-kind'; kind.addEventListener('change', () => handlers.select({ v5Kind: kind.value }));
  kindLabel.appendChild(kind); v5.appendChild(kindLabel);
  numberField('v5SlModifier', 'Modificateur V5 (DR)', draft.v5SlModifier ?? action.extensions?.v5?.slModifier ?? (action.mod ? null : 0));
  if (action.mod && draft.v5SlModifier == null && action.extensions?.v5?.slModifier == null) v5.appendChild(node('p','workspace-field-error',`Ancien modificateur de seuil ${signed(action.mod)} : saisissez les DR V5 retenus.`));
  numberField('v5Advantages','Sources supplémentaires d’Avantage',draft.v5Advantages || 0,0);
  numberField('v5Disadvantages','Sources de Désavantage',draft.v5Disadvantages || 0,0);
  if (kind.value === 'melee' && type === 'attack') {
    const charge = node('label','workspace-type'); const check = document.createElement('input'); check.type='checkbox'; check.checked=draft.charging === true;
    check.addEventListener('change',()=>handlers.select({charging:check.checked})); charge.append(check,'Charge donnant Élan (distance et conditions vérifiées)'); v5.appendChild(charge);
  }
  const talentToggle = (key, text, checked) => {
    const label = node('label', 'workspace-type'); const check = document.createElement('input');
    check.type = 'checkbox'; check.checked = checked === true; check.setAttribute('aria-label', text);
    check.dataset.focusKey = key; check.addEventListener('change', () => handlers.select({ [key]: check.checked }));
    label.append(check, text); v5.appendChild(label);
  };
  if (type === 'attack') {
    if (draft.reactionId) {
      v5.appendChild(node('p', 'workspace-muted', 'Assaut féroce : nouvelle attaque avec la même arme contre le même adversaire. Coût : 1 Élan ; une fois par Round et un seul paiement d’attaque supplémentaire par Tour.'));
      const cancel = button('Quitter la préparation d’Assaut féroce', 'workspace-ghost');
      cancel.addEventListener('click', () => handlers.select({ reactionId: null, extraAttack: false })); v5.appendChild(cancel);
    } else talentToggle('extraAttack', 'Attaque supplémentaire : payer 1 Élan (une fois par Tour)', draft.extraAttack);
    if (kind.value === 'ranged' && hasV5Talent(actor, V5_TALENT_IDS.accurateShot))
      talentToggle('aimed', 'Visée effectuée : Tir précis donne +2 Dégâts', draft.aimed);
    if (kind.value === 'melee' && hasV5Talent(actor, V5_TALENT_IDS.beatBlade)) {
      talentToggle('beatBlade', 'Battement : remplacer toutes les Blessures et conséquences du critique', draft.beatBlade);
      if (draft.beatBlade) {
        for (const [key, labelText] of [['actorSize','Taille de l’auteur'],['targetSize','Taille de la cible']]) {
          const label = node('label', 'workspace-type', labelText); const select = document.createElement('select');
          select.appendChild(new Option('À préciser', ''));
          for (const [value, text] of [[0,'Minuscule'],[1,'Très petite'],[2,'Petite'],[3,'Moyenne'],[4,'Grande'],[5,'Énorme'],[6,'Monstrueuse']])
            select.appendChild(new Option(text, String(value)));
          select.value = draft[key] == null ? '' : String(draft[key]); select.setAttribute('aria-label', labelText); select.dataset.focusKey = key;
          select.addEventListener('change', () => handlers.select({ [key]: select.value === '' ? null : Number(select.value) }));
          label.appendChild(select); v5.appendChild(label);
        }
        v5.appendChild(node('p', 'workspace-muted', 'Jusqu’à la fin du prochain Tour de l’auteur : la cible ne peut opposer Corps à corps ; Esquive reste possible et les attaques de mêlée contre elle ont Avantage.'));
      }
    }
  }
  if (type === 'attack' && target) {
    const label=node('label','workspace-type','Nature de la défense'); const select=document.createElement('select');
    select.append(new Option('Corps à corps','melee'),new Option('Esquive / autre Test','test'));
    select.value=draft.defenseKind || defense.option.v5?.kind || (defense.option.value === 'Ag' || /esquive|dodge/i.test(defense.option.statLabel) ? 'test' : 'melee'); select.dataset.focusKey='defense-kind'; select.setAttribute('aria-label','Nature de la défense');
    select.addEventListener('change',()=>handlers.select({defenseKind:select.value})); label.appendChild(select); v5.appendChild(label);
    numberField('defenseSlModifier','Modificateur V5 de défense (DR)',draft.defenseSlModifier ?? defense.option.v5?.slModifier ?? (defense.option.mod ? null : 0));
    numberField('defenseAdvantages','Avantages supplémentaires de défense',draft.defenseAdvantages || 0,0);
    numberField('defenseDisadvantages','Désavantages de défense',draft.defenseDisadvantages || 0,0);
  }
  const contextField = (container, role, key, label) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext';
    const current = draft[contextKey] || {};
    const caption = node('label', 'workspace-type', label); const select = document.createElement('select');
    select.setAttribute('aria-label', `${label}${role === 'defender' ? ' (défense)' : ''}`); select.dataset.focusKey = `${role}-${key}`;
    select.append(new Option('À préciser', ''), new Option('Oui', 'true'), new Option('Non', 'false'));
    select.value = typeof current[key] === 'boolean' ? String(current[key]) : '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, [key]: select.value === '' ? undefined : select.value === 'true' } }));
    caption.appendChild(select); container.appendChild(caption);
  };
  const conditionModeField = (container, role) => {
    const contextKey = role === 'actor' ? 'v5Context' : 'defenseContext'; const current = draft[contextKey] || {};
    const label = node('label', 'workspace-type', 'Pénalité retenue entre États mixtes'); const select = document.createElement('select');
    select.setAttribute('aria-label', `Pénalité retenue entre États mixtes${role === 'defender' ? ' (défense)' : ''}`); select.dataset.focusKey = `${role}-condition-penalty-mode`;
    select.append(new Option('À préciser si nécessaire', ''), new Option('Pénalité en DR', 'sl'), new Option('Désavantage', 'disadvantage'));
    select.value = current.conditionPenaltyMode || '';
    select.addEventListener('change', () => handlers.select({ [contextKey]: { ...current, conditionPenaltyMode: select.value || undefined } }));
    label.appendChild(select); container.appendChild(label);
  };
  const contextual = node('details', 'workspace-v5-context-details'); contextual.appendChild(node('summary', '', 'Circonstances des Tests'));
  const fields = node('div', 'workspace-v5-context');
  for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité']]) contextField(fields, 'actor', key, label);
  conditionModeField(fields, 'actor');
  if (kind.value === 'ranged' && target) { contextField(fields, 'actor', 'rangedOppositionAllowed', 'Tir opposé : exception vérifiée par le MJ'); contextField(fields, 'actor', 'pointBlank', 'Tir à bout portant'); }
  if (type === 'attack' && target) contextField(fields, 'actor', 'targetHelpless', 'Cible sans défense : situation vérifiée par le MJ');
  if (type === 'attack' && target) {
    fields.appendChild(rubric('Circonstances de la défense'));
    for (const [key, label] of [['involvesMovement','Le Test implique un mouvement'],['runningOrHiding','Le Test sert à fuir ou se cacher'],['reliesOnSight','Le Test est réalisable sans voir mais repose sur la vue'],['requiresSight','Le Test est impossible sans voir'],['usesFellowship','Le Test utilise la Sociabilité']]) contextField(fields, 'defender', key, label);
    conditionModeField(fields, 'defender');
  }
  contextual.appendChild(fields); v5.appendChild(contextual);
  section.appendChild(v5);
  // Jets
  const rolls = node('div', 'workspace-resolution-rolls');
  const attr = action.attr && action.attr !== 'Custom' ? `${action.attr} ` : '';
  const mod = Number(action.mod) || 0;
  rolls.appendChild(rollField({
    field: 'attack',
    label: `${ROLL_LABELS[type] || 'Jet'} (${attr}${action.base ?? '—'})`,
    value: draft.attackRoll,
    error: draft.error?.field === 'attack' ? draft.error.message : '',
    handlers,
    disabled: draft.busy
  }));
  if (type === 'attack' && target) {
    const defenseBlock = node('div', 'workspace-defense');
    const legend = node('p', 'workspace-roll-label');
    legend.append('Défense de ', node('span', 'combatant-name', target.name), kind.value === 'melee' ? ' (requise en mêlée)' : ' (selon les circonstances)');
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
  calculate.disabled = draft.busy || !canCalculate || action.extensions?.fiche?.requiresLink;
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
    const needsLocation = Boolean(preview.critical?.details?.needsLocation || preview.defenderCritical?.details?.needsLocation);
    const invalidCritical = Object.keys(draft.criticalErrors || {}).length > 0;
    const effects = preview.critical?.application;
    const manual = preview.weapon?.status === 'manual';
    const label = needsLocation && target ? (manual ? `Appliquer le critique à ${target.name}` : `Appliquer les dégâts à ${target.name}`)
      : preview.damage && target ? `Appliquer ${previewHpLoss(preview)} dégâts à ${target.name}`
        : target && effects && (effects.extraWounds || effects.states.length) ? `Appliquer le critique à ${target.name}`
          : manual ? 'Enregistrer sans dégâts' : 'Enregistrer le résultat';
    const primary = button(label, 'workspace-primary', { 'data-focus-key': 'apply' });
    primary.disabled = preview.choiceRequired || preview.unresolved?.length > 0 || preview.critical?.details?.pending || preview.critical?.second?.pending || preview.defenderCritical?.details?.pending || preview.defenderCritical?.details?.needsAlternative || draft.busy || !canApply || needsTarget || needsLocation || invalidCritical || preview.critical?.details?.needsAlternative || preview.critical?.second?.needsAlternative || Boolean(preview.protection?.manual?.length || preview.mechanicalWarnings?.length);
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
