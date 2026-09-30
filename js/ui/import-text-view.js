import { parseProfileText } from '../core/text-profile-import.js';
import { describeWeaponDamage } from '../core/resolution.js';
import { qualityLabel } from '../core/quality-normalization.js';
import { userMessage } from './messages.js';

const REASON_LABELS = {
  'entier-attendu': 'nombre entier attendu',
  'entier-hors-limites': 'nombre trop grand',
  'champ-inconnu': 'champ inconnu',
  'ligne-non-reconnue': 'ligne non reconnue',
  'valeurs-concurrentes': 'valeurs différentes pour le même champ',
  'champ-manquant': 'champ manquant',
  'type-inconnu': 'valeur inconnue',
  'valeur-negative': 'nombre positif ou nul attendu',
  'texte-attendu': 'texte attendu',
  'liste-attendue': 'liste attendue',
  'objet-attendu': 'objet { … } attendu',
  'booleen-attendu': 'vrai ou faux attendu'
};
const FIELD_LABELS = { name: 'Nom', kind: 'Type', group: 'Groupe', hp: 'PV', initiative: 'Initiative', notes: 'Notes', tags: 'Mots-clés', base: 'valeur', mod: 'modificateur', valeurs: 'valeur' };
const MISSING_LABELS = { name: 'nom manquant', hp: 'PV manquants' };
const ARMOR_LABELS = [['head', 'tête'], ['body', 'corps'], ['arms', 'bras'], ['legs', 'jambes']];
// Libellés de l'import texte ; l'option `texts` les remplace (import JSON du formulaire).
const DEFAULT_TEXTS = {
  title: 'Importer des profils depuis du texte',
  help: 'Un bloc par profil ; séparez les blocs par une ligne contenant ---.',
  inputLabel: 'Texte des profils',
  previewLabel: 'Analyser le texte',
  exampleLabel: 'Insérer un exemple',
  importLabel: count => `Importer ${plural(count, 'profil')}`,
  fallback: 'Texte illisible : écrivez un champ par ligne (« Nom: … »), un bloc par profil.',
  stale: 'Texte modifié depuis l’analyse : analysez-le à nouveau avant d’importer.',
  example: ''
};

const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;
const shown = value => value === null || value === undefined || value === '' ? '—' : String(value);

function fieldLabel(field = '') {
  if (field.startsWith('caracs.')) return field.slice(7);
  if (field.startsWith('armor.')) return `armure ${ARMOR_LABELS.find(([key]) => key === field.slice(6))?.[1] || field.slice(6)}`;
  return FIELD_LABELS[field] || field;
}

/** Première ligne de chaque bloc dans le texte saisi : les numéros de ligne affichés sont ceux de la zone de texte. */
function blockOffsets(text, blocks) {
  let cursor = 0;
  return blocks.map(block => {
    const start = Math.max(0, text.indexOf(block.sourceText, cursor));
    cursor = start + block.sourceText.length;
    return text.slice(0, start).split('\n').length - 1;
  });
}

function reviewItems(parsed) {
  const offsets = blockOffsets(parsed.sourceText || '', parsed.blocks);
  return parsed.blocks.flatMap((block, index) => {
    const at = lines => {
      const numbers = [lines].flat().filter(Number.isInteger).map(line => line + offsets[index]);
      return numbers.length ? `${numbers.length > 1 ? 'lignes' : 'ligne'} ${numbers.join(', ')}` : '';
    };
    const who = block.profile.name || `Profil ${index + 1}`;
    const item = (lines, text) => `${who}${at(lines) ? `, ${at(lines)}` : ''} : ${text}`;
    return [
      ...Object.entries(block.fields).filter(([, value]) => value.status === 'missing').map(([field]) => item([], MISSING_LABELS[field] || `${fieldLabel(field)} manquant`)),
      ...block.errors.map(error => item(error.line, `${REASON_LABELS[error.reason] || 'valeur à vérifier'} (${fieldLabel(error.field) || 'texte'}${error.value ? ` « ${error.value} »` : ''})`)),
      ...block.ambiguities.map(ambiguity => item(ambiguity.lines || ambiguity.line, `${REASON_LABELS[ambiguity.reason] || 'valeur ambiguë'} (${fieldLabel(ambiguity.field)})`)),
      ...block.unknownQualities.map(quality => item(quality.line, `qualité inconnue « ${quality.value} » (action ${quality.action})`))
    ];
  });
}

function profilePreview(profile) {
  const card = document.createElement('article'); card.className = 'import-text-profile';
  const name = document.createElement('h3'); name.className = 'combatant-name'; name.textContent = profile.name || 'Sans nom'; card.appendChild(name);
  const list = document.createElement('dl');
  const row = (label, value) => { if (!value) return; const term = document.createElement('dt'); term.textContent = label; const detail = document.createElement('dd'); detail.textContent = value; list.append(term, detail); };
  row('Type', profile.kind);
  row('Groupe', profile.group);
  row('PV', shown(profile.hp));
  row('Init', shown(profile.initiative));
  row('Caractéristiques', Object.entries(profile.caracs || {}).map(([key, value]) => `${key} ${shown(value)}`).join(' · '));
  const armor = profile.armor || {};
  if (Object.values(armor).some(Boolean)) row('Armure', ARMOR_LABELS.map(([key, label]) => `${label} ${shown(armor[key] ?? 0)}`).join(' · '));
  row('Tags', (profile.tags || []).join(', '));
  row('Notes', profile.notes);
  row('Favori', profile.favorite ? 'oui' : '');
  card.appendChild(list);
  if (profile.actions?.length) {
    const actions = document.createElement('ul');
    profile.actions.forEach(action => {
      const item = document.createElement('li');
      item.textContent = [
        `${action.name}${action.base !== undefined ? ` ${shown(action.base)}` : ''}`,
        action.damage !== undefined ? `dégâts ${describeWeaponDamage(action, profile.caracs)}` : '',
        ...(action.qualities || []).map(quality => qualityLabel(quality))
      ].filter(Boolean).join(' · ');
      actions.appendChild(item);
    });
    const caption = document.createElement('dt'); caption.textContent = 'Actions';
    const detail = document.createElement('dd'); detail.appendChild(actions);
    list.append(caption, detail);
  }
  return card;
}

/** E17 local text import: review is required before the caller receives profiles. `hosted` : la fenêtre porte déjà le titre. */
export function initTextImportView({ mount, hosted = false, parser = parseProfileText, texts = {}, callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('import-text-view nécessite un mount');
  const label = { ...DEFAULT_TEXTS, ...texts };
  let parsed = null;
  let draft = '';
  let confirmed = false;
  let error = '';

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'import-text-view'; root.setAttribute('aria-label', label.title);
    if (!hosted) { const title = document.createElement('h2'); title.textContent = label.title; root.appendChild(title); }
    const help = document.createElement('p'); help.textContent = label.help; root.appendChild(help);
    if (error) { const alert = document.createElement('p'); alert.className = 'error'; alert.setAttribute('role', 'alert'); alert.textContent = error; root.appendChild(alert); }
    // Texte modifié après l'analyse : l'aperçu ne correspond plus, l'import attend une nouvelle analyse.
    let refresh = () => {};
    const input = document.createElement('textarea'); input.setAttribute('aria-label', label.inputLabel); input.rows = 12; input.value = draft; input.addEventListener('input', () => { draft = input.value; refresh(); }); root.appendChild(input);
    if (label.example) {
      const exampleButton = document.createElement('button'); exampleButton.type = 'button'; exampleButton.className = 'ghost'; exampleButton.textContent = label.exampleLabel;
      exampleButton.addEventListener('click', () => { draft = label.example; input.value = draft; input.focus(); refresh(); });
      root.appendChild(exampleButton);
    }
    const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.textContent = label.previewLabel;
    previewButton.addEventListener('click', () => {
      draft = input.value;
      try { parsed = parser(draft); confirmed = false; error = ''; render(); callbacks.onPreview?.(parsed); }
      // Un texte illisible retire l'ancien aperçu : rien d'autre que ce texte ne peut être importé.
      catch (cause) { parsed = null; error = userMessage(cause, label.fallback); render(); }
    });
    root.appendChild(previewButton);
    if (parsed) {
      const count = parsed.profiles.length;
      const summary = document.createElement('p'); summary.textContent = `${plural(count, 'profil')} · ${parsed.status === 'ready' ? (count > 1 ? 'prêts' : 'prêt') : 'à vérifier'}`; root.appendChild(summary);
      parsed.profiles.forEach(profile => root.appendChild(profilePreview(profile)));
      const review = reviewItems(parsed);
      if (review.length) {
        const caption = document.createElement('strong'); caption.textContent = 'À vérifier'; root.appendChild(caption);
        const list = document.createElement('ul'); list.className = 'import-text-review';
        review.forEach(text => { const item = document.createElement('li'); item.textContent = text; list.appendChild(item); });
        root.appendChild(list);
      }
      const confirmation = document.createElement('label');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = confirmed; check.addEventListener('change', () => { confirmed = check.checked; refresh(); });
      confirmation.append(check, ' Je confirme les champs absents ou ambigus affichés ci-dessus'); root.appendChild(confirmation);
      const staleNote = document.createElement('p'); staleNote.className = 'muted'; staleNote.setAttribute('role', 'status'); root.appendChild(staleNote);
      const importButton = document.createElement('button'); importButton.type = 'button'; importButton.textContent = label.importLabel(count);
      let importing = false;
      refresh = () => {
        const fresh = draft === parsed.sourceText;
        // Texte posé à chaque changement : la zone `status` l'annonce aux lecteurs d'écran.
        staleNote.textContent = fresh ? '' : label.stale;
        staleNote.hidden = fresh;
        importButton.disabled = importing || !fresh || (parsed.status !== 'ready' && !confirmed);
      };
      refresh();
      importButton.addEventListener('click', async () => {
        if (importButton.disabled) return;
        // Un seul import à la fois : ni la case de confirmation ni la saisie ne réactivent le bouton entre-temps.
        importing = true; refresh();
        try { await callbacks.onImport?.(parsed, { confirmed }); }
        catch (cause) { error = userMessage(cause, 'Profils non importés : réessayez, ou exportez une sauvegarde si le problème persiste.'); render(); }
        finally { importing = false; if (importButton.isConnected) refresh(); }
      });
      root.appendChild(importButton);
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'ghost'; cancel.textContent = 'Annuler'; cancel.addEventListener('click', () => callbacks.onCancel?.()); root.appendChild(cancel);
    }
    mount.appendChild(root);
  }

  return {
    render, getPreview: () => parsed,
    clear() { parsed = null; draft = ''; confirmed = false; error = ''; render(); },
    // Aperçu retiré, texte saisi conservé (pour le corriger).
    resetPreview() { parsed = null; confirmed = false; error = ''; render(); }
  };
}
