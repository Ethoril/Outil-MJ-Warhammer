/**
 * Bibliothèque de profils de bestiaire : liste filtrable (livre, nom, mot-clé avec descendants), fiche en lecture seule,
 * ajout au combat (un ou plusieurs exemplaires) et copie dans la Réserve. Les données se chargent à la demande, livre par livre.
 */
import { BESTIARY_STAT_KEYS, armourDetailNamesZones, bestiarySpellLines, buildParticipantFromBestiary, buildReserveProfileFromBestiary, createBestiaryLoader, filterBestiary, unvaluedSkillNames } from '../core/bestiary-profiles.js';
import { keywordMatches, keywordTree } from '../core/creature-keywords.js';
import { CAMP_LABELS } from '../core/encounters.js';
import { Participant, Profile } from '../core/models.js';

const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const MAX_ROWS = 100;
const KIND_LABELS = { profile: 'Profil', template: 'Gabarit', 'pregenerated-character': 'Prétiré' };
const fetchJson = async path => { const response = await fetch(path); if (!response.ok) throw new Error(`${path} : ${response.status}`); return response.json(); };

const printed = value => (value === null || value === undefined ? '—' : String(value));

/** Fiche lecture seule : valeurs imprimées telles quelles. */
export function renderBestiarySheet(record, referential) {
  const sheet = el('div', null, 'bestiary-sheet');
  sheet.append(el('p', `${record.name}${record.nameFr ? ` — ${record.nameFr}` : ''} · ${record.book} p. ${record.page} · ${KIND_LABELS[record.kind] || record.kind}${record.edition ? ` · ${record.edition}` : ''}`, 'muted'));
  const line = (label, value) => { if (value) sheet.append(el('p', `${label} : ${value}`)); };
  if (record.kind === 'template') {
    line('Modificateurs', Object.entries(record.modifiers || {}).map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`).join(', '));
  } else {
    line('Caractéristiques', BESTIARY_STAT_KEYS.map(key => `${key} ${printed(record.stats?.[key])}`).join(' · '));
    line('Blessures', record.woundsAbsent ? 'non imprimées' : printed(record.wounds));
    const armour = record.armour || {};
    line('Armure', [armour.ap !== undefined ? `PA ${armour.ap}` : '', ...(armour.parts || []).map(part => `${part.name}${part.locations ? ` (${part.locations})` : ''} ${printed(part.ap)}${part.optional ? ' facultatif' : ''}`), armour.detail ? `${armourDetailNamesZones(armour.detail) ? 'zones' : 'détail'} : ${armour.detail}` : '', armour.printedTotal !== undefined ? `total imprimé ${armour.printedTotal}` : ''].filter(Boolean).join(' ; '));
    line('Attaques', (record.attacks || []).map(attack => `${attack.count > 1 ? `${attack.count} × ` : ''}${attack.name}${attack.value !== undefined ? ` ${attack.value}` : ''}, dégâts ${attack.damage}${attack.free ? ' (gratuite)' : ''}${attack.optional ? ' (facultative)' : ''}`).join(' ; '));
    line('Compétences', (record.skills || []).map(skill => `${skill.nameFr || skill.name} ${skill.value}`).join(', '));
    line('Compétences sans valeur imprimée', unvaluedSkillNames(record.unvaluedSkills).join(', '));
    line('Traits', (record.traits || []).map(trait => `${trait.name}${trait.param ?? trait.rating ? ` (${trait.param ?? trait.rating})` : ''}`).join(', '));
    line('Traits facultatifs', (record.optionalTraits || []).map(trait => trait.name).join(', '));
    line('Sorts', bestiarySpellLines(record.spells).join(' ; '));
  }
  line('Mots-clés', (record.keywords || []).map(id => referential.terms.get(id)?.nameFr || id).join(', '));
  return sheet;
}

/**
 * `store` : le Store de l'application. `loader` : injectable pour les tests. Renvoie `{ open, refresh }`.
 */
export function createBestiaryLibrary({ container, store, loader = createBestiaryLoader(fetchJson), notify = () => {} } = {}) {
  if (!container) throw new TypeError('Conteneur de la bibliothèque manquant');
  const bookSelect = el('select'), kindSelect = el('select'), keywordSelect = el('select'), textInput = el('input');
  bookSelect.setAttribute('aria-label', 'Livre'); kindSelect.setAttribute('aria-label', 'Genre'); keywordSelect.setAttribute('aria-label', 'Mot-clé'); textInput.setAttribute('aria-label', 'Nom du profil');
  textInput.placeholder = 'Nom (anglais ou français)…'; textInput.type = 'search';
  kindSelect.append(new Option('Tous les genres', ''), ...Object.entries(KIND_LABELS).map(([value, label]) => new Option(label, value)));
  const status = el('p', 'Chargement…', 'muted'), list = el('div', null, 'list');
  status.setAttribute('role', 'status');
  const filters = el('div', null, 'row'); filters.style.cssText = 'flex-wrap:wrap;gap:6px;';
  filters.append(bookSelect, kindSelect, keywordSelect, textInput);
  container.append(filters, status, list);
  let library = [];
  let books = [];
  let started = false;
  let token = 0;

  const fillKeywords = () => {
    const current = keywordSelect.value;
    keywordSelect.replaceChildren(new Option('Tous les mots-clés', ''), ...keywordTree(store.getKeywordReferential()).map(item => new Option(`${'— '.repeat(item.depth)}${item.nameFr}`, item.id)));
    keywordSelect.value = current;
  };

  async function addToCombat(record, count, camp) {
    for (let index = 1; index <= count; index += 1) {
      const participant = buildParticipantFromBestiary(record.id, { library, camp, zone: 'bench', index: count > 1 ? index : null });
      const result = await store.addParticipant(new Participant(participant));
      if (result === false || result?.ok === false) throw result?.error || new Error('Ajout au combat impossible.');
    }
    notify(`${count > 1 ? `${count} exemplaires de ` : ''}${record.name} ajouté${count > 1 ? 's' : ''} au combat (banc).`);
  }

  async function copyToReserve(record) {
    const result = await store.addProfile(new Profile(buildReserveProfileFromBestiary(record.id, { library, group: 'Bestiaire' })));
    if (result === false || result?.ok === false) throw result?.error || new Error('Copie dans la Réserve impossible.');
    notify(`${record.name} copié dans la Réserve (groupe Bestiaire).`);
  }

  function row(record) {
    const item = el('div', null, 'item'), left = el('div'), right = el('div', null, 'row');
    left.append(el('strong', record.nameFr ? `${record.name} — ${record.nameFr}` : record.name), el('span', ` ${record.book} p. ${record.page} · ${KIND_LABELS[record.kind] || record.kind}`, 'muted'));
    const sheetHolder = el('div'); sheetHolder.hidden = true; sheetHolder.style.width = '100%';
    const sheetButton = el('button', 'Fiche', 'ghost'); sheetButton.type = 'button'; sheetButton.setAttribute('aria-expanded', 'false'); sheetButton.setAttribute('aria-label', `Fiche de ${record.name}`);
    sheetButton.onclick = () => {
      if (!sheetHolder.firstChild) sheetHolder.append(renderBestiarySheet(record, store.getKeywordReferential()));
      sheetHolder.hidden = !sheetHolder.hidden; sheetButton.setAttribute('aria-expanded', String(!sheetHolder.hidden));
    };
    right.append(sheetButton);
    if (record.kind !== 'template') {
      const count = el('input'); count.type = 'number'; count.min = '1'; count.max = '20'; count.value = '1'; count.style.width = '56px'; count.setAttribute('aria-label', `Nombre d’exemplaires de ${record.name}`);
      const camp = el('select'); camp.setAttribute('aria-label', `Camp de ${record.name}`);
      for (const [value, label] of Object.entries(CAMP_LABELS)) camp.append(new Option(label, value));
      camp.value = 'ennemi';
      const combat = el('button', 'Ajouter au combat'); combat.type = 'button';
      const copy = el('button', 'Copier dans la réserve', 'ghost'); copy.type = 'button';
      const guard = action => async () => {
        combat.disabled = copy.disabled = true;
        try { await action(); } catch (error) { notify(error?.message || 'Opération impossible.', 'error'); } finally { combat.disabled = copy.disabled = false; }
      };
      combat.onclick = guard(() => addToCombat(record, Math.min(20, Math.max(1, Math.trunc(Number(count.value)) || 1)), camp.value));
      copy.onclick = guard(() => copyToReserve(record));
      right.append(count, camp, combat, copy);
    }
    item.append(left, right, sheetHolder);
    return item;
  }

  function render() {
    const referential = store.getKeywordReferential();
    const matches = (profile, keyword) => keywordMatches(profile.keywords || [], keyword, referential);
    const found = filterBestiary(library, { keyword: keywordSelect.value || null, text: textInput.value, kinds: kindSelect.value ? [kindSelect.value] : null }, { matches });
    list.replaceChildren(...found.slice(0, MAX_ROWS).map(row));
    status.textContent = found.length === 0 ? 'Aucun profil.' : `${found.length} profil(s)${found.length > MAX_ROWS ? ` — ${MAX_ROWS} premiers affichés, affinez le filtre` : ''}.`;
  }

  async function reload() {
    const mine = ++token;
    status.textContent = 'Chargement…';
    try {
      const wanted = bookSelect.value ? [bookSelect.value] : books.map(book => book.book);
      const loaded = await loader.load(wanted);
      if (mine !== token) return;
      library = loaded;
      render();
    } catch (error) {
      if (mine === token) status.textContent = `Chargement impossible : ${error?.message || error}. Réessayez.`;
    }
  }

  async function open() {
    if (started) return;
    started = true;
    try {
      books = await loader.index();
      bookSelect.replaceChildren(new Option('Tous les livres', ''), ...books.map(book => new Option(`${book.book} — ${book.title}`, book.book)));
      fillKeywords();
      await reload();
    } catch (error) {
      started = false;
      status.textContent = `Chargement impossible : ${error?.message || error}. Réessayez.`;
    }
  }

  bookSelect.onchange = reload;
  kindSelect.onchange = keywordSelect.onchange = textInput.oninput = () => { if (started) render(); };
  return { open, refresh: () => { if (started) { fillKeywords(); render(); } } };
}
