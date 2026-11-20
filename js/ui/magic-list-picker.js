/**
 * Éditeur des sorts et prières d'un PNJ : deux listes de puces, chacune avec un champ relié au catalogue (sorts V5, prières divines).
 * Un texte inconnu est refusé, jamais ajouté tel quel : le combat ne saurait pas le lancer. `getValue()` rend `{ spells, prayers }`
 * en lignes `{ nom }`, les lignes déjà présentes restant telles quelles.
 */
import { getAllSpellContracts } from '../core/v5-spell-contracts.js';
import { getAllDivineContracts } from '../core/v5-divine-store.js';
import { divineContractName, prayerRows, resolvePrayerName, resolveSpellName, spellRows, withRow, withoutRow } from '../core/magic-lists.js';

const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const rowName = row => (typeof row === 'string' ? row : row?.nom ?? row?.name ?? '');
let listCounter = 0;

export function createMagicListPicker({ container, subject = {}, onChange = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur des sorts et prières manquant');
  const divine = getAllDivineContracts().filter(row => ['blessing', 'miracle'].includes(row.type));
  let spells = spellRows(subject), prayers = prayerRows(subject);
  const emit = () => onChange({ spells: [...spells], prayers: [...prayers] });

  function section(title, placeholder, options, resolve, read, write, unknown) {
    const box = el('div', null, 'magic-list'), chips = el('div', null, 'keyword-chips'), input = el('input'), datalist = el('datalist'), message = el('p', '', 'workspace-muted');
    datalist.id = `magic-list-${listCounter += 1}`; input.setAttribute('list', datalist.id); input.placeholder = placeholder; input.setAttribute('aria-label', placeholder);
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;'; message.hidden = true;
    datalist.append(...options.map(([value, label]) => new Option(label, value)));
    box.append(el('div', title, 'muted'), chips, input, datalist, message);
    const render = () => chips.replaceChildren(...read().map(row => {
      const name = rowName(row), chip = el('span', null, 'keyword-chip');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border:1px solid var(--border);border-radius:10px;font-size:0.85em;';
      const remove = el('button', '×', 'tiny'); remove.type = 'button'; remove.setAttribute('aria-label', `Retirer ${name}`);
      remove.onclick = () => { write(withoutRow(read(), name)); render(); emit(); };
      chip.append(el('span', name), remove);
      return chip;
    }));
    const add = text => {
      const name = resolve(text);
      if (!name) { message.textContent = unknown(text); message.hidden = false; return; }
      message.hidden = true; input.value = '';
      write(withRow(read(), name)); render(); emit();
    };
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && input.value.trim()) { event.preventDefault(); add(input.value); } });
    input.addEventListener('change', () => { if (input.value.trim()) add(input.value); });
    render();
    return { box, render };
  }

  const spellSection = section('Sorts', 'Ajouter un sort…',
    getAllSpellContracts().map(contract => [contract.name, `${contract.name} · NI ${contract.cn} (${contract.domain})`]),
    resolveSpellName, () => spells, next => { spells = next; }, text => `« ${text} » n’est pas un sort du catalogue V5.`);
  const prayerSection = section('Bénédictions et miracles', 'Ajouter une bénédiction ou un miracle…',
    divine.map(contract => [divineContractName(contract), `${contract.name} · ${contract.type === 'blessing' ? 'Bénédiction' : 'Miracle'}${contract.deity ? ` (${contract.deity})` : ''}`]),
    text => resolvePrayerName(text, divine), () => prayers, next => { prayers = next; }, text => `« ${text} » n’est pas une prière du catalogue divin.`);
  container.append(spellSection.box, prayerSection.box);

  return {
    getValue: () => ({ spells: [...spells], prayers: [...prayers] }),
    setSubject(next) { subject = next || {}; spells = spellRows(subject); prayers = prayerRows(subject); spellSection.render(); prayerSection.render(); }
  };
}
