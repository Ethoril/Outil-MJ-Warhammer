export const MINUS = '−';

export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(label, className, attrs = {}) {
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

export function rubric(text) {
  return node('h4', 'workspace-rubric', text);
}

export function chip(label, { pressed = false, key, attrs = {} } = {}) {
  const element = button(label, 'workspace-chip', { 'aria-pressed': String(pressed), 'data-focus-key': key, ...attrs });
  return element;
}

export function outcomePill(label, success, sl) {
  return node('span', `workspace-outcome ${success ? 'is-success' : 'is-failure'}`, `${label} : ${success ? 'Réussite' : 'Échec'} · DR ${signed(sl)}`);
}


const FIELD_GROUPS = Object.freeze({
  'v5-kind': 'combat',
  'attack-nature': 'combat',
  'protection-calm': 'combat',
  'context:involvesMovement': 'combat',
  'context:runningOrHiding': 'combat',
  'context:reliesOnSight': 'combat',
  'context:requiresSight': 'combat',
  'context:usesFellowship': 'combat',
  'context:isAction': 'combat',
  'context:targetMoving': 'combat',
  'context:distractingInRange': 'combat',
  'context:airborne': 'combat',
  'context:inWater': 'combat',
  'context:rangedOppositionAllowed': 'combat',
  'context:pointBlank': 'combat',
  'context:targetHelpless': 'combat',
  'context:surrounded': 'combat',
  'context:targetEngaged': 'combat',
  'context:engagedWithShooter': 'combat',
  'context:difficultTerrain': 'combat',
  'context:narrowSpace': 'combat',
  'context:entanglementTest': 'weapon',
  'context:springLoaded': 'weapon',
  'context:explosionOpposed': 'weapon',
  'context:blackpowderBrokenTest': 'weapon',
  'context:repeaterDoubleShot': 'weapon',
  'choice:shotRange': 'combat',
  'choice:weather': 'combat',
  'choice:lighting': 'combat',
  'choice:height': 'combat',
  'choice:scatterDirectionRoll': 'weapon',
  'choice:weaponReachBand': 'weapon',
  penalties: 'combat',
  v5SlModifier: 'combat',
  'defense-kind': 'defense',
  defenseSlModifier: 'defense',
  defenseAdvantages: 'defense',
  defenseDisadvantages: 'defense',
  v5Advantages: 'fortune',
  v5Disadvantages: 'fortune',
  fortuneReroll: 'fortune',
  fortuneForAdvantage: 'fortune',
  reverseDice: 'fortune',
  fortuneRerollRolls: 'fortune',
  extraAttack: 'talents',
  aimed: 'talents',
  beatBlade: 'talents',
  'natural-attack': 'talents',
  'profile-rules': 'talents',
  lethal: 'lethal',
  'talent-fields': 'talents',
  ammunition: 'weapon',
  'magic-context': 'magic'
});

/** Classe un champ par sa clé explicite, jamais par son libellé traduit. */
export function circumstanceGroup(field, required = false) {
  return required ? 'required' : FIELD_GROUPS[field] || 'other';
}

/** Une case cochée et une valeur distincte de sa valeur par défaut comptent chacune une fois. */
export function countActiveCircumstances(controls) {
  return controls.reduce((count, control) => {
    if (control.type === 'checkbox' || control.type === 'radio') return count + Number(Boolean(control.checked));
    return count + Number(String(control.value ?? '') !== String(control.defaultValue ?? ''));
  }, 0);
}

/** Une clé stable relie un champ rendu à son équivalent dans le brouillon initial. */
export function circumstanceControls(root) {
  const occurrences = new Map();
  return [...root.querySelectorAll('input, select, textarea')]
    .filter(element => !['hidden', 'button', 'submit'].includes(element.type))
    .map(element => {
      const label = element.getAttribute('aria-label') || [...(element.closest('label')?.childNodes || [])]
        .filter(child => child.nodeType === 3).map(child => child.textContent).join(' ').trim();
      const stem = `${element.tagName}:${element.type}:${element.dataset.focusKey || label || element.name || element.id}`;
      const index = occurrences.get(stem) || 0;
      occurrences.set(stem, index + 1);
      const value = element.type === 'select-multiple'
        ? JSON.stringify([...element.selectedOptions].map(option => option.value)) : element.value;
      const defaultValue = element.dataset.defaultValue ?? (element.type === 'select-multiple' ? '[]' : element.tagName === 'SELECT' ? element.options?.[0]?.value ?? '' : element.defaultValue ?? '');
      return { element, key: `${stem}:${index}`, label: label || 'Réglage', type: element.type, value, defaultValue, checked: element.checked };
    });
}

/** Jets disponibles dont le combattant est un PNJ et qui ne sont pas déjà saisis. */
export function emptyNpcRolls(rolls) {
  return rolls.filter(roll => roll.owner === 'PNJ' && !roll.disabled && String(roll.value ?? '').trim() === '');
}

/** Multiplication d’infortune : relancer les résultats de 91 à 100. */
export function rollMisfortuneDie(die) {
  let value;
  do { value = die(); } while (value >= 91);
  return value;
}

/** Plages des incidents dont la distance utilise un d100, selon la table active. */
export function isMiscastDistanceD100(table, max) {
  return table === 'MINOR' && (max === 40 || max === 55) || table === 'MAJOR' && max === 35;
}
