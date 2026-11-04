// Bouton « Lancer » pour toute saisie de dé (recette du MJ du 04/11/2026) : chaque champ dont le libellé nomme un dé
// (« d100 », « d10 », « 2d10 »…) reçoit un bouton qui tire le dé et le saisit comme le ferait le clavier. Un libellé à
// plusieurs dés possibles (« 1d10 ou 2d10 ») reçoit un bouton par dé. Les champs déjà équipés et les listes de valeurs sont laissés tels quels.

const DICE = /\b(\d*)d(100|20|10|6|5)\b/gi;

/** Dés distincts nommés par `text`, dans l'ordre : `[{ count, sides, text }]`. */
export function diceFormulasOf(text) {
  const seen = new Map();
  for (const match of String(text || '').matchAll(DICE)) {
    const count = Number(match[1] || 1), sides = Number(match[2]);
    if (count < 1 || count > 10) continue;
    const key = `${count > 1 ? count : ''}d${sides}`;
    if (!seen.has(key)) seen.set(key, { count, sides, text: key });
  }
  return [...seen.values()];
}

export function rollFormula({ count, sides }, random = Math.random) {
  let total = 0;
  for (let index = 0; index < count; index += 1) total += Math.floor(random() * sides) + 1;
  return total;
}

const labelOf = (input, root) => input.getAttribute('aria-label') || input.closest('label')?.textContent
  || (input.id && root.querySelector?.(`label[for="${CSS.escape(input.id)}"]`)?.textContent) || input.placeholder || '';

/** Ajoute les boutons manquants sous `root` ; sans effet sur un champ déjà équipé. */
export function addRollButtons(root) {
  for (const input of root?.querySelectorAll?.('input') || []) {
    if (input.dataset.rollButton || !['number', 'text'].includes(input.type)) continue;
    const label = labelOf(input, root).trim();
    // Listes de jets (« séparés par des virgules », « ex. 10,4 ») : plusieurs valeurs, pas un seul tirage.
    if (/virgule|ex\.\s*\d/i.test(label)) continue;
    const formulas = diceFormulasOf(label);
    if (!formulas.length) continue;
    const host = input.closest('.workspace-roll-row') || input.parentElement;
    // Un bouton « Lancer » propre au champ existe déjà (ceux ajoutés ici pour un champ voisin ne comptent pas).
    if ([...(host?.querySelectorAll('button') || [])].some(button => !button.classList.contains('workspace-roll-button') && /^Lancer/i.test(button.textContent.trim()))) continue;
    input.dataset.rollButton = formulas.map(row => row.text).join(' ');
    let anchor = input;
    for (const formula of formulas) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'workspace-secondary workspace-roll-button';
      button.textContent = formulas.length > 1 ? `Lancer ${formula.text}` : 'Lancer';
      button.disabled = input.disabled;
      // Nom court : le libellé du champ n'y est pas repris, pour qu'une recherche par libellé ne trouve que le champ.
      button.setAttribute('aria-label', `Lancer (${formula.text})`);
      button.title = label;
      button.addEventListener('click', () => {
        input.value = String(rollFormula(formula));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      anchor.insertAdjacentElement('afterend', button);
      anchor = button;
    }
  }
}
