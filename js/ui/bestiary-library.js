/**
 * Bibliothèque de profils de bestiaire : navigation par dossiers (classement de js/data/bestiary-folders.js, fil d'Ariane,
 * « À classer » pour un profil non classé), filtres (livre, genre, nom, mot-clé avec descendants) bornés au dossier ouvert,
 * fiche en lecture seule, ajout au combat (un ou plusieurs exemplaires) et copie dans la Réserve. Les données se chargent
 * à la demande, livre par livre.
 */
import { BESTIARY_STAT_KEYS, armourDetailNamesZones, bestiaryDisplayName, bestiarySpellLines, buildParticipantFromBestiary, buildReserveProfileFromBestiary, filterBestiary, unvaluedSkillNames } from '../core/bestiary-profiles.js';
import { UNCLASSIFIED_FOLDER, createFolderIndex, folderLabelPath, folderOfProfile, folderView } from '../core/bestiary-folder-tree.js';
import { sharedBestiaryLoader } from '../core/bestiary-loader.js';
import { keywordMatches, keywordTree } from '../core/creature-keywords.js';
import { CAMP_LABELS } from '../core/encounters.js';
import { Participant, Profile } from '../core/models.js';
import { BESTIARY_FOLDERS } from '../data/bestiary-folders.js';

const el = (tag, text, className = '') => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
const MAX_ROWS = 100;
const KIND_LABELS = { profile: 'Profil', template: 'Gabarit', 'pregenerated-character': 'Prétiré' };
const ROOT_LABEL = 'Tout le bestiaire';
const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;
const SVG = 'http://www.w3.org/2000/svg';

/** Pictogramme de dossier, décoratif. */
function folderIcon() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'bestiary-folder-icon');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', 'M2.5 6.2A1.7 1.7 0 0 1 4.2 4.5h4.9l2.1 2.3h8.6a1.7 1.7 0 0 1 1.7 1.7v9.8a1.7 1.7 0 0 1-1.7 1.7H4.2a1.7 1.7 0 0 1-1.7-1.7z');
  svg.append(path);
  return svg;
}

/** Nom court d'un profil, français d'abord (S13, CA39) : libellés des contrôles et messages. */
const shortName = record => String(record.nameFr ?? '').trim() || record.name;
const printed = value => (value === null || value === undefined ? '—' : String(value));

/** Fiche lecture seule : valeurs imprimées telles quelles. */
export function renderBestiarySheet(record, referential) {
  const sheet = el('div', null, 'bestiary-sheet');
  sheet.append(el('p', `${bestiaryDisplayName(record)} · ${record.book} p. ${record.page} · ${KIND_LABELS[record.kind] || record.kind}${record.edition ? ` · ${record.edition}` : ''}`, 'muted'));
  const line = (label, value) => { if (value) sheet.append(el('p', `${label} : ${value}`)); };
  if (record.kind === 'template') {
    line('Modificateurs', Object.entries(record.modifiers || {}).map(([key, value]) => `${key} ${value > 0 ? '+' : ''}${value}`).join(', '));
  } else {
    line('Caractéristiques', BESTIARY_STAT_KEYS.map(key => `${key} ${printed(record.stats?.[key])}`).join(' · '));
    line('Blessures', record.woundsAbsent ? 'non imprimées' : printed(record.wounds));
    const armour = record.armour || {};
    line('Points de Destin imprimés', record.fatePoints);
    line('Armure', [armour.ap !== undefined ? `PA ${armour.ap}` : '', ...(armour.parts || []).map(part => `${part.name}${part.locations ? ` (${part.locations})` : ''} ${printed(part.ap)}${part.optional ? ' facultatif' : ''}`), armour.detail ? `${armourDetailNamesZones(armour.detail) ? 'zones' : 'détail'} : ${armour.detail}` : '', armour.printedTotal !== undefined ? `total imprimé ${armour.printedTotal}` : ''].filter(Boolean).join(' ; '));
    line('Attaques', (record.attacks || []).map(attack => `${attack.count > 1 ? `${attack.count} × ` : ''}${attack.name}${attack.value !== undefined ? ` ${attack.value}` : ''}, dégâts ${attack.damage}${attack.rangeYards ? `, portée ${attack.rangeYards} m` : ''}${attack.free ? ' (gratuite)' : ''}${attack.optional ? ' (facultative)' : ''}`).join(' ; '));
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
 * `store` : le Store de l'application. `loader` et `folders` (classement) : injectables pour les tests.
 * Renvoie `{ open, refresh, openFolder }`.
 */
export function createBestiaryLibrary({ container, store, loader = sharedBestiaryLoader(), notify = () => {}, folders = BESTIARY_FOLDERS } = {}) {
  if (!container) throw new TypeError('Conteneur de la bibliothèque manquant');
  const folderIndex = createFolderIndex(folders);
  let currentFolder = null;
  const bookSelect = el('select'), kindSelect = el('select'), keywordSelect = el('select'), textInput = el('input');
  bookSelect.setAttribute('aria-label', 'Livre'); kindSelect.setAttribute('aria-label', 'Genre'); keywordSelect.setAttribute('aria-label', 'Mot-clé'); textInput.setAttribute('aria-label', 'Nom du profil');
  textInput.placeholder = 'Nom (anglais ou français)…'; textInput.type = 'search';
  kindSelect.append(new Option('Tous les genres', ''), ...Object.entries(KIND_LABELS).map(([value, label]) => new Option(label, value)));
  const status = el('p', 'Chargement…', 'muted'), list = el('div', null, 'list bestiary-list');
  status.setAttribute('role', 'status');
  const filters = el('div', null, 'row bestiary-filters'); filters.style.cssText = 'flex-wrap:wrap;gap:6px;';
  filters.append(bookSelect, kindSelect, keywordSelect, textInput);
  const crumbs = el('nav', null, 'bestiary-crumbs'), crumbList = el('ol');
  crumbs.setAttribute('aria-label', 'Fil d’Ariane du bestiaire'); crumbs.append(crumbList); crumbs.hidden = true;
  const folderList = el('ul', null, 'bestiary-folders'); folderList.hidden = true;
  container.append(crumbs, filters, status, folderList, list);
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
    notify(`${count > 1 ? `${count} exemplaires de ` : ''}${shortName(record)} ajouté${count > 1 ? 's' : ''} au combat (banc).`);
  }

  async function copyToReserve(record) {
    const result = await store.addProfile(new Profile(buildReserveProfileFromBestiary(record.id, { library, group: 'Bestiaire' })));
    if (result === false || result?.ok === false) throw result?.error || new Error('Copie dans la Réserve impossible.');
    notify(`${shortName(record)} copié dans la Réserve (groupe Bestiaire).`);
  }

  function row(record, { showFolder = false } = {}) {
    const item = el('div', null, 'item'), left = el('div'), right = el('div', null, 'row');
    left.append(el('strong', bestiaryDisplayName(record)), el('span', ` ${record.book} p. ${record.page} · ${KIND_LABELS[record.kind] || record.kind}`, 'muted'));
    if (showFolder) {
      // Résultat d'une recherche à plat : son dossier, qui s'ouvre d'un clic.
      const folderId = folderOfProfile(folderIndex, record), label = folderLabelPath(folderIndex, folderId);
      const link = el('button', null, 'ghost bestiary-row-folder'); link.type = 'button';
      link.setAttribute('aria-label', `Ouvrir le dossier ${label}`);
      link.append(folderIcon(), el('span', label));
      link.onclick = () => openFolder(folderId);
      const line = el('div', null, 'bestiary-row-folder-line'); line.append(link);
      left.append(line);
    }
    const sheetHolder = el('div'); sheetHolder.hidden = true; sheetHolder.style.width = '100%';
    const sheetButton = el('button', 'Fiche', 'ghost'); sheetButton.type = 'button'; sheetButton.setAttribute('aria-expanded', 'false'); sheetButton.setAttribute('aria-label', `Fiche de ${shortName(record)}`);
    sheetButton.onclick = () => {
      if (!sheetHolder.firstChild) sheetHolder.append(renderBestiarySheet(record, store.getKeywordReferential()));
      sheetHolder.hidden = !sheetHolder.hidden; sheetButton.setAttribute('aria-expanded', String(!sheetHolder.hidden));
    };
    right.append(sheetButton);
    if (record.kind !== 'template') {
      const count = el('input'); count.type = 'number'; count.min = '1'; count.max = '20'; count.value = '1'; count.style.width = '56px'; count.setAttribute('aria-label', `Nombre d’exemplaires de ${shortName(record)}`);
      const camp = el('select'); camp.setAttribute('aria-label', `Camp de ${shortName(record)}`);
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

  function renderCrumbs(view) {
    const items = [{ id: null, label: ROOT_LABEL }, ...view.path];
    crumbList.replaceChildren(...items.map((item, at) => {
      const li = el('li');
      if (at === items.length - 1) {
        const here = el('span', item.label, 'bestiary-crumb-current'); here.setAttribute('aria-current', 'location'); here.tabIndex = -1;
        li.append(here);
      } else {
        const up = el('button', item.label, 'ghost bestiary-crumb'); up.type = 'button';
        up.onclick = () => openFolder(item.id);
        li.append(up);
      }
      return li;
    }));
    crumbs.hidden = false;
  }

  function folderTile(folder) {
    const li = el('li'), button = el('button', null, `bestiary-folder${folder.id === UNCLASSIFIED_FOLDER ? ' is-unclassified' : ''}`);
    button.type = 'button'; button.dataset.folder = folder.id;
    const meta = [plural(folder.count, 'profil'), folder.folders ? plural(folder.folders, 'dossier') : ''].filter(Boolean).join(' · ');
    button.setAttribute('aria-label', `${folder.label}, ${meta}`);
    button.append(folderIcon(), el('span', folder.label, 'bestiary-folder-name'), el('span', meta, 'bestiary-folder-meta'));
    button.onclick = () => openFolder(folder.id);
    li.append(button);
    return li;
  }

  function render() {
    const referential = store.getKeywordReferential();
    const matches = (profile, keyword) => keywordMatches(profile.keywords || [], keyword, referential);
    const found = filterBestiary(library, { keyword: keywordSelect.value || null, text: textInput.value, kinds: kindSelect.value ? [kindSelect.value] : null }, { matches });
    const flat = Boolean(textInput.value.trim() || keywordSelect.value || kindSelect.value || bookSelect.value);
    const view = folderView(folderIndex, found, currentFolder, { flat });
    currentFolder = view.scope;
    renderCrumbs(view);
    const where = view.scope === null ? 'tout le bestiaire' : view.path.map(item => item.label).join(' › ');
    folderList.setAttribute('aria-label', view.scope === null ? 'Dossiers du bestiaire' : `Sous-dossiers de ${where}`);
    folderList.replaceChildren(...view.subfolders.map(folderTile));
    folderList.hidden = view.subfolders.length === 0;
    list.replaceChildren(...view.profiles.slice(0, MAX_ROWS).map(record => row(record, { showFolder: flat })));
    const capped = view.profiles.length > MAX_ROWS ? ` — ${MAX_ROWS} premiers affichés, affinez le filtre` : '';
    const inFolders = view.subfolders.length ? ` dans ${plural(view.subfolders.length, 'dossier')}` : '';
    if (flat) status.textContent = view.total === 0 ? `Aucun profil trouvé dans ${where}.` : `${plural(view.total, 'profil')} trouvé${view.total > 1 ? 's' : ''} dans ${where}${capped}.`;
    else status.textContent = view.total === 0 ? `${view.scope === null ? 'Aucun profil' : `${where} : aucun profil`}.` : `${view.scope === null ? '' : `${where} : `}${plural(view.total, 'profil')}${inFolders}${capped}.`;
  }

  /** Ouvre un dossier (null : la racine) et y place le focus, sur l'élément courant du fil d'Ariane. */
  function openFolder(id) {
    currentFolder = id;
    if (!started || !library.length) return;
    render();
    crumbList.querySelector('[aria-current]')?.focus();
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
  return { open, openFolder, refresh: () => { if (started) { fillKeywords(); render(); } } };
}
