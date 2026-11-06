// U8 L6 : détail des modificateurs d'un Test, chacun avec sa source et son montant ; un effet écarté par la règle de cumul reste
// visible, barré, avec « non cumulé » et la règle qui l'écarte (décision du MJ Q9). Affichage seul : aucun calcul ici.
import { node, signed } from './dom.js';
import { STACK_POLICIES } from '../../core/effect-engine.js';

// Famille d'un modificateur retenu, lue sur son identifiant (les lignes écartées portent déjà `source`).
const SOURCE_BY_ID = [[/^(conditions?|magic-condition)/, 'État'], [/^talent/, 'Talent'], [/^(spell|slann)/, 'Sort'], [/^(prayer|divine)/, 'Prière'],
  [/^mounted/, 'Monture'], [/^outnumber/, 'Surnombre'], [/^(trait|sense|movement)/, 'Trait'], [/^(quality|defensive|desequilibree)/, 'Qualité']];
export function modifierSource(modifier) {
  if (modifier.source && typeof modifier.source === 'string') return modifier.source;
  return SOURCE_BY_ID.find(([pattern]) => pattern.test(String(modifier.id || '')))?.[1] ?? null;
}

// La source entre parenthèses, sauf si le libellé la porte déjà (« Surnombre (2 contre 1) »).
const withSource = (label, source) => source && !String(label).startsWith(source) ? `${label} (${source})` : `${label}`;

/** Lignes d'affichage : `{ text, struck, note? }`. `dropped` : `[{ label, amount, rule, source }]` (effets écartés). */
export function modifierLines(modifiers = [], dropped = []) {
  const lines = modifiers.map(modifier => {
    const source = modifierSource(modifier);
    return { text: `${withSource(modifier.label, source)} : ${signed(modifier.amount)} DR`, struck: false };
  });
  for (const row of dropped) {
    const policy = STACK_POLICIES[row.rule];
    lines.push({ text: `${withSource(row.label, row.source)} : ${signed(row.amount)} DR`, struck: true,
      note: `non cumulé · règle : ${policy ? policy.label : row.rule}` });
  }
  return lines;
}

export function renderModifierLines(modifiers, dropped) {
  return modifierLines(modifiers, dropped).map(line => {
    const row = node('p', 'workspace-formula-notes' + (line.struck ? ' is-dropped' : ''));
    if (line.struck) {
      const struck = node('s', '', line.text);
      row.append(struck, node('span', 'workspace-muted', ` — ${line.note}`));
    } else row.textContent = line.text;
    return row;
  });
}
