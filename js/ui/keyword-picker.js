/**
 * Sélecteur de mots-clés de créature (référentiel unique, jamais de texte libre) et boîte d'ajout réservée au MJ.
 * Le sélecteur écrit des identifiants ; un texte tapé se résout par nom ou alias, sinon on propose le formulaire d'ajout, qui refuse
 * doublons et quasi-doublons en désignant le terme existant.
 */
import { describeKeyword, keywordTree, participantKeywords, resolveKeyword } from '../core/creature-keywords.js';

const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
let listCounter = 0;

/** Boîte d'ajout d'un terme (MJ) : renvoie le terme ajouté, ou le terme existant choisi à sa place, ou null. */
export function openKeywordAddDialog({ store, name = '' } = {}) {
  return new Promise(resolve => {
    const opener = document.activeElement, dialog = el('dialog', null, 'tool-sheet v5-effect-dialog'), form = el('form');
    Object.assign(dialog.style, { inset: '0', margin: 'auto', transform: 'none', width: 'min(560px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)', overflow: 'auto', display: 'block' });
    const heading = el('h2', 'Ajouter un mot-clé au référentiel'); heading.id = 'keyword-add-title'; dialog.setAttribute('aria-labelledby', heading.id);
    const hint = el('p', 'Le référentiel est figé : un ajout ne peut être ni renommé ni retiré. Un terme déjà connu (casse, accents, pluriel, alias, orthographe proche) est refusé.', 'workspace-muted');
    const field = (label, control) => { const wrapper = el('label', label); wrapper.append(control); return wrapper; };
    const nameFr = el('input'); nameFr.name = 'nameFr'; nameFr.required = true; nameFr.value = name; nameFr.setAttribute('aria-label', 'Nom du mot-clé');
    const nameEn = el('input'); nameEn.name = 'nameEn'; nameEn.setAttribute('aria-label', 'Nom anglais');
    const aliases = el('input'); aliases.name = 'aliases'; aliases.setAttribute('aria-label', 'Alias séparés par des virgules');
    const parents = el('select'); parents.multiple = true; parents.size = 6; parents.name = 'parents'; parents.setAttribute('aria-label', 'Parents du mot-clé');
    const referential = store.getKeywordReferential();
    for (const item of keywordTree(referential)) parents.append(new Option(`${'— '.repeat(item.depth)}${item.nameFr}`, item.id));
    const error = el('p', '', 'v5-effect-error'); error.setAttribute('role', 'alert'); error.hidden = true;
    const reuse = el('button', '', 'ghost'); reuse.type = 'button'; reuse.hidden = true;
    const controls = el('div', null, 'row'), confirm = el('button', 'Ajouter le mot-clé'), cancel = el('button', 'Annuler', 'ghost'); confirm.type = 'submit'; cancel.type = 'button'; controls.append(confirm, cancel);
    form.append(heading, hint, field('Nom', nameFr), field('Nom anglais (facultatif)', nameEn), field('Alias (facultatif, séparés par des virgules)', aliases), field('Parents (facultatif, plusieurs possibles)', parents), error, reuse, controls);
    dialog.append(form); document.body.append(dialog);
    let outcome = null;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const result = await store.addCreatureKeyword({ nameFr: nameFr.value, nameEn: nameEn.value, aliases: aliases.value.split(',').map(item => item.trim()).filter(Boolean), parents: [...parents.selectedOptions].map(option => option.value) });
      if (result?.ok) { outcome = { term: result.term, added: true }; dialog.close(); return; }
      error.textContent = result?.message || 'Le mot-clé n’a pas été ajouté.'; error.hidden = false;
      if (result?.existing) { reuse.textContent = `Utiliser « ${result.existing.nameFr} »`; reuse.hidden = false; reuse.onclick = () => { outcome = { term: result.existing, added: false }; dialog.close(); }; } else reuse.hidden = true;
    });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); if (opener?.isConnected) opener.focus(); resolve(outcome); }, { once: true });
    dialog.showModal(); nameFr.focus();
  });
}

/**
 * Sélecteur dans un conteneur : puces des mots-clés posés, puces des mots-clés déduits (retirables par exclusion), champ de saisie
 * relié à la liste du référentiel. `onChange({ keywords, keywordExclusions })` à chaque modification.
 */
export function createKeywordPicker({ container, store, subject = {}, onChange = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur de mots-clés manquant');
  let keywords = [...(subject.keywords || [])];
  let exclusions = [...(subject.keywordExclusions || [])];
  const listId = `keyword-list-${listCounter += 1}`;
  const chips = el('div', null, 'keyword-chips'), input = el('input'), datalist = el('datalist'), message = el('p', '', 'workspace-muted'), propose = el('button', 'Ajouter ce terme au référentiel (MJ)', 'ghost tiny');
  datalist.id = listId; input.setAttribute('list', listId); input.placeholder = 'Ajouter un mot-clé (espèce, nature, allégeance)…'; input.setAttribute('aria-label', 'Ajouter un mot-clé');
  propose.type = 'button'; propose.hidden = true; message.hidden = true; chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;';
  container.append(chips, input, datalist, message, propose);
  const referential = () => store.getKeywordReferential();
  const emit = () => onChange({ keywords: [...keywords], keywordExclusions: [...exclusions] });
  const chip = (label, { derived = false, title = '', onRemove, removeLabel = 'Retirer' } = {}) => {
    const node = el('span', null, `keyword-chip${derived ? ' keyword-derived' : ''}`);
    node.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:1px 6px;border:1px solid var(--border);border-radius:10px;font-size:0.85em;${derived ? 'font-style:italic;' : ''}`;
    node.title = title; node.append(el('span', label));
    const button = el('button', '×', 'tiny'); button.type = 'button'; button.setAttribute('aria-label', `${removeLabel} ${label}`); button.onclick = onRemove; node.append(button);
    return node;
  };
  const render = () => {
    const ref = referential();
    chips.replaceChildren();
    const state = participantKeywords({ ...subject, keywords, keywordExclusions: exclusions }, ref);
    for (const id of state.explicit.filter(item => !exclusions.includes(item))) chips.append(chip(ref.terms.get(id).nameFr, { title: describeKeyword(id, ref), onRemove: () => { keywords = keywords.filter(item => item !== id && resolveKeyword(item, ref)?.id !== id); render(); emit(); } }));
    for (const entry of state.derived.filter(item => !state.explicit.includes(item.id))) chips.append(chip(ref.terms.get(entry.id).nameFr, { derived: true, title: `Déduit (${{ race: 'race', trait: 'Trait de nature', tag: 'ancien tag', flag: 'nature' }[entry.from]}) : ${describeKeyword(entry.id, ref)}`, removeLabel: 'Écarter le mot-clé déduit', onRemove: () => { exclusions = [...exclusions, entry.id]; render(); emit(); } }));
    for (const id of exclusions) if (ref.terms.has(id)) { const restore = el('button', `Rétablir ${ref.terms.get(id).nameFr}`, 'ghost tiny'); restore.type = 'button'; restore.onclick = () => { exclusions = exclusions.filter(item => item !== id); render(); emit(); }; chips.append(restore); }
    datalist.replaceChildren(...[...ref.terms.values()].flatMap(term => [term.nameFr, ...term.aliases]).map(label => new Option(label)));
  };
  const add = text => {
    const ref = referential(), found = resolveKeyword(text, ref);
    if (!found) { message.textContent = `« ${text} » n’est pas dans le référentiel : choisissez un terme existant ou demandez son ajout.`; message.hidden = false; propose.hidden = false; return; }
    message.hidden = true; propose.hidden = true; input.value = '';
    if (!keywords.includes(found.id)) keywords = [...keywords, found.id];
    exclusions = exclusions.filter(item => item !== found.id);
    render(); emit();
  };
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && input.value.trim()) { event.preventDefault(); add(input.value); } });
  input.addEventListener('change', () => { if (input.value.trim()) add(input.value); });
  propose.onclick = async () => {
    const result = await openKeywordAddDialog({ store, name: input.value });
    if (result?.term) { input.value = ''; message.hidden = true; propose.hidden = true; if (!keywords.includes(result.term.id)) keywords = [...keywords, result.term.id]; render(); emit(); }
  };
  render();
  return { getValue: () => ({ keywords: [...keywords], keywordExclusions: [...exclusions] }), setSubject(next) { subject = next || {}; keywords = [...(subject.keywords || [])]; exclusions = [...(subject.keywordExclusions || [])]; render(); }, render };
}
