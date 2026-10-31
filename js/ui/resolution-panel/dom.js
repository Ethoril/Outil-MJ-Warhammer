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

