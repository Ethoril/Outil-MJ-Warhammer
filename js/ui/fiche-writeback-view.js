// Chantier H : écran « Envoyer aux fiches » (fin de séance). Aperçu des différences durables par fiche, cases à cocher,
// envoi fiche par fiche, conflits avec choix du MJ, « Annuler le dernier envoi ». Aucune logique de règle ici :
// le plan, les commandes et les mises à jour viennent de core/fiche-writeback.js, via `api` (Store) et `source` (réseau).
import { buildFicheCommand, buildUndoCommands, ficheConflictOf, ficheValueForKey } from '../core/fiche-writeback.js';
import { ficheErrorMessage } from '../core/fiche-sync.js';

const FIELD_LABELS = Object.freeze({
  destin: 'Destin', fortune: 'Fortune', peche: 'Péché', corruption: 'Corruption',
  cc: 'Capacité de Combat', ct: 'Capacité de Tir', f: 'Force', e: 'Endurance', i: 'Initiative', ag: 'Agilité',
  dex: 'Dextérité', int: 'Intelligence', fm: 'Force Mentale', soc: 'Sociabilité'
});
const MANUAL_REASONS = Object.freeze({
  'base-unknown': 'Base absente ou illisible sur la fiche',
  'loss-exceeds-base': 'perte supérieure à la Base : les Avances ne sont jamais touchées',
  'value-out-of-range': 'valeur hors du format de la fiche (4 chiffres)',
  'absent-before-send': 'champ absent de la fiche avant l’envoi'
});
const shown = value => (value === null || value === undefined || value === '' ? '—' : String(value));
const fieldLabel = key => {
  const [op, name] = String(key).split(':');
  return op === 'carac' ? `${FIELD_LABELS[name] || name} (Base)` : FIELD_LABELS[name] || name;
};
const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;
const dateText = date => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * `source` : { getUser, signIn, fetchAll, sendCommand } (core/fiche-source.js).
 * `api` : { plan(), applySuccess(charId, response, rows), applyChoice(charId, key, choice, ficheValue) } (Store).
 */
export function initFicheWritebackView({ mount, source, api, now = () => new Date(), callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('fiche-writeback-view nécessite un mount');
  let phase = 'checking';
  let error = '';
  let notice = '';
  let busy = false;
  let plan = null;
  let reason = `Fin de séance du ${dateText(now())} (outil MJ)`;
  let sendId = null; // garde le même identifiant pour les renvois après conflit : un refus n'enregistre aucun reçu
  const unchecked = new Set(); // `${charId}|${key}` décochées par le MJ ; tout le reste part
  const conflicts = new Map(); // charId → { fields, values: { key: valeur de la fiche }, undo: bool }
  const undoOverrides = new Map(); // charId → lignes d'annulation ajustées après un conflit
  const failures = new Map(); // charId → message

  const fail = cause => ficheErrorMessage(cause, { online: globalThis.navigator?.onLine !== false });
  const refresh = () => { plan = api.plan(); };
  const rowId = (charId, key) => `${charId}|${key}`;
  // Une fiche en conflit attend le choix du MJ sur chaque champ ; les autres fiches partent sans elle (CA11).
  const blocked = charId => Boolean(conflicts.get(charId) && !conflicts.get(charId).undo && conflicts.get(charId).fields.length);
  const selectedRows = fiche => fiche.rows.filter(row => !row.manual && row.change && !unchecked.has(rowId(fiche.charId, row.key)));

  async function start() {
    phase = 'checking'; render();
    try {
      const user = await source.getUser();
      if (!user) { phase = 'signin'; render(); return; }
      show();
    } catch (cause) { error = fail(cause); phase = 'signin'; render(); }
  }
  async function signIn() {
    error = ''; phase = 'checking'; render();
    try { await source.signIn(); show(); }
    catch (cause) { error = fail(cause); phase = 'signin'; render(); }
  }
  function show() { refresh(); phase = 'preview'; render(); }

  /** Relit les fiches en conflit pour montrer leur valeur actuelle (CA10). */
  async function readConflicts(entries) {
    if (!entries.length) return;
    const fetched = await source.fetchAll();
    for (const [charId, conflict] of entries) {
      const data = fetched.find(item => item.charId === charId)?.data;
      for (const key of conflict.fields) {
        try { conflict.values[key] = data ? ficheValueForKey(data, key) : null; } catch { conflict.values[key] = null; }
      }
    }
  }

  async function send() {
    if (busy) return;
    busy = true; notice = ''; error = ''; render();
    sendId ||= `s${now().getTime().toString(36)}`;
    const pending = [];
    for (const fiche of plan.fiches) {
      const rows = selectedRows(fiche);
      if (!rows.length || blocked(fiche.charId)) continue;
      try {
        const command = buildFicheCommand(fiche.charId, rows, { sendId, revision: fiche.revision, reason });
        const response = await source.sendCommand(command);
        await api.applySuccess(fiche.charId, response, rows);
        conflicts.delete(fiche.charId); failures.delete(fiche.charId);
      } catch (cause) {
        const conflict = ficheConflictOf(cause);
        if (conflict) { const entry = { fields: conflict.fields, values: {}, undo: false }; conflicts.set(fiche.charId, entry); pending.push([fiche.charId, entry]); }
        else failures.set(fiche.charId, cause instanceof TypeError ? cause.message : fail(cause));
      }
    }
    try { await readConflicts(pending); } catch (cause) { error = fail(cause); }
    busy = false;
    refresh();
    if (!conflicts.size && !failures.size) notice = 'Envoi terminé.';
    render();
  }

  async function choose(charId, key, choice) {
    const conflict = conflicts.get(charId);
    if (!conflict || busy) return;
    busy = true; render();
    try {
      if (conflict.undo) {
        // Annulation en conflit (CA14) : « Garder la fiche » retire la ligne de l'annulation, « Imposer » part de la valeur actuelle.
        const rows = undoOverrides.get(charId) || [];
        const next = rows.flatMap(row => row.key !== key ? [row] : choice === 'fiche' ? [] : [{ ...row, ficheValue: conflict.values[key], change: { ...row.change, base: conflict.values[key] } }]);
        undoOverrides.set(charId, next);
      } else await api.applyChoice(charId, key, choice, conflict.values[key]);
      conflict.fields = conflict.fields.filter(field => field !== key);
      if (!conflict.fields.length) conflicts.delete(charId);
      refresh();
    } catch (cause) { error = cause instanceof TypeError ? cause.message : fail(cause); }
    busy = false; render();
  }

  async function undo() {
    if (busy || !plan.lastSend) return;
    busy = true; notice = ''; error = ''; render();
    const pending = [];
    try {
      for (const item of buildUndoCommands(plan.lastSend, { reason: 'Annulation du dernier envoi (outil MJ)' })) {
        const rows = undoOverrides.get(item.charId) || item.rows;
        if (!rows.some(row => row.change)) continue;
        const command = undoOverrides.has(item.charId)
          ? buildFicheCommand(item.charId, rows, { sendId: item.command.payload.sendId, revision: item.command.baseRevision, reason: item.command.payload.reason, undoOf: item.command.payload.undoOf })
          : item.command;
        try {
          const response = await source.sendCommand(command);
          await api.applySuccess(item.charId, response, rows);
          undoOverrides.delete(item.charId); conflicts.delete(item.charId); failures.delete(item.charId);
        } catch (cause) {
          const conflict = ficheConflictOf(cause);
          if (conflict) { undoOverrides.set(item.charId, rows); const entry = { fields: conflict.fields, values: {}, undo: true }; conflicts.set(item.charId, entry); pending.push([item.charId, entry]); }
          else failures.set(item.charId, fail(cause));
        }
      }
      await readConflicts(pending);
    } catch (cause) { error = cause instanceof TypeError ? cause.message : fail(cause); }
    busy = false;
    refresh();
    if (!conflicts.size && !failures.size) notice = 'Dernier envoi annulé.';
    render();
  }

  // ---------- Rendu ----------
  const el = (tag, text = '', className = '') => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
  function button(text, handler, { key = null, primary = false, disabled = false } = {}) {
    const node = el('button', text, primary ? 'primary' : '');
    node.type = 'button'; node.disabled = disabled || busy;
    if (key) node.dataset.key = key;
    node.addEventListener('click', handler);
    return node;
  }
  function rowLine(fiche, row) {
    const item = el('li', '', 'fiche-writeback-row');
    const label = el('label');
    const box = document.createElement('input'); box.type = 'checkbox'; box.dataset.key = `row:${fiche.charId}:${row.key}`;
    if (row.manual) { box.disabled = true; box.checked = false; item.classList.add('is-manual'); }
    else {
      box.checked = !unchecked.has(rowId(fiche.charId, row.key));
      box.addEventListener('change', () => { if (box.checked) unchecked.delete(rowId(fiche.charId, row.key)); else unchecked.add(rowId(fiche.charId, row.key)); render(); });
    }
    label.append(box, ` ${fieldLabel(row.key)} : ${shown(row.ficheValue)} → ${shown(row.toolValue)}`);
    item.appendChild(label);
    const details = [row.label, row.manual ? `à faire à la main : ${MANUAL_REASONS[row.reason] || row.reason}` : '', row.warning === 'copies-disagree' ? 'les copies du personnage dans l’outil ne concordent pas : valeur du combat retenue' : ''].filter(Boolean);
    if (details.length) item.appendChild(el('div', details.join(' · '), 'muted'));
    return item;
  }
  function conflictBlock(charId, conflict) {
    const box = el('div', '', 'fiche-writeback-conflict');
    box.appendChild(el('p', conflict.undo ? 'Annulation refusée : la fiche a changé depuis l’envoi.' : 'Envoi refusé : le joueur a modifié la fiche depuis la dernière lecture. Rien n’a été écrit sur cette fiche.', 'error'));
    const fiche = plan.fiches.find(item => item.charId === charId);
    const undoRows = undoOverrides.get(charId) || [];
    for (const key of conflict.fields) {
      const toolRow = conflict.undo ? undoRows.find(row => row.key === key) : fiche?.rows.find(row => row.key === key);
      const line = el('div', '', 'fiche-writeback-conflict-row'); line.dataset.key = `conflict:${charId}:${key}`;
      line.appendChild(el('span', `${fieldLabel(key)} : fiche ${shown(conflict.values[key])} · outil ${shown(conflict.undo ? toolRow?.change?.value : toolRow?.toolValue)}`));
      line.append(button('Garder la fiche', () => choose(charId, key, 'fiche'), { key: `keep:${charId}:${key}` }),
        button(conflict.undo ? 'Imposer l’ancienne valeur' : 'Imposer l’outil', () => choose(charId, key, 'outil'), { key: `force:${charId}:${key}` }));
      box.appendChild(line);
    }
    return box;
  }
  function ficheCard(fiche) {
    const card = el('article', '', 'card fiche-writeback-entry'); card.dataset.fiche = fiche.charId;
    const head = el('h3', '', 'combatant-name');
    const sendable = fiche.rows.filter(row => !row.manual && row.change);
    if (sendable.length) {
      const all = document.createElement('input'); all.type = 'checkbox'; all.dataset.key = `fiche:${fiche.charId}`;
      const picked = sendable.filter(row => !unchecked.has(rowId(fiche.charId, row.key))).length;
      all.checked = picked === sendable.length; all.indeterminate = picked > 0 && picked < sendable.length;
      all.addEventListener('change', () => { for (const row of sendable) { if (all.checked) unchecked.delete(rowId(fiche.charId, row.key)); else unchecked.add(rowId(fiche.charId, row.key)); } render(); });
      const label = el('label'); label.append(all, ` Fiche ${fiche.charId}`); head.appendChild(label);
    } else head.textContent = `Fiche ${fiche.charId}`;
    card.appendChild(head);
    card.appendChild(el('p', `Révision lue : ${shown(fiche.revision)}`, 'muted'));
    const list = el('ul', '', 'fiche-writeback-rows');
    fiche.rows.forEach(row => list.appendChild(rowLine(fiche, row)));
    card.appendChild(list);
    if (conflicts.has(fiche.charId) && !conflicts.get(fiche.charId).undo) card.appendChild(conflictBlock(fiche.charId, conflicts.get(fiche.charId)));
    if (failures.has(fiche.charId)) card.appendChild(el('p', `Envoi impossible : ${failures.get(fiche.charId)}`, 'error'));
    return card;
  }
  function undoSection() {
    const last = plan.lastSend;
    const open = last ? Object.entries(last.fiches || {}).filter(([, fiche]) => !fiche.undone).map(([charId]) => charId) : [];
    if (!open.length && ![...conflicts.values()].some(conflict => conflict.undo)) return null;
    const section = el('section', '', 'fiche-writeback-undo');
    section.appendChild(el('h3', 'Dernier envoi'));
    for (const [charId, conflict] of conflicts) if (conflict.undo) { const wrap = el('div'); wrap.dataset.fiche = `undo-${charId}`; wrap.appendChild(el('strong', `Fiche ${charId}`)); wrap.appendChild(conflictBlock(charId, conflict)); section.appendChild(wrap); }
    if (open.length) {
      section.appendChild(el('p', 'Rétablit sur chaque fiche écrite les valeurs d’avant l’envoi ; l’état de l’outil ne change pas.', 'muted'));
      section.appendChild(button(`Annuler le dernier envoi (${open.join(', ')})`, undo, { key: 'undo' }));
    }
    return section;
  }

  function render() {
    const nodes = [];
    if (phase === 'checking') nodes.push(el('p', 'Connexion aux fiches…', 'muted'));
    else if (phase === 'signin') {
      nodes.push(el('p', 'Connectez-vous avec le compte Google du MJ pour écrire sur les fiches des PJ.'));
      if (error) nodes.push(el('p', error, 'error'));
      nodes.push(button('Se connecter avec Google', signIn, { primary: true, key: 'signin' }));
    } else {
      if (error) nodes.push(el('p', error, 'error'));
      if (notice) nodes.push(el('p', notice, 'success'));
      for (const skipped of plan.skipped || []) nodes.push(el('p', `Fiche ${skipped.charId} : jamais relue depuis cette version. Lancez d’abord « Mettre à jour les PJ ».`, 'muted'));
      if (plan.empty) nodes.push(el('p', 'Aucune différence durable : rien à envoyer aux fiches.', 'muted'));
      else {
        const reasonInput = document.createElement('input'); reasonInput.type = 'text'; reasonInput.value = reason; reasonInput.maxLength = 1000; reasonInput.dataset.key = 'reason';
        reasonInput.addEventListener('change', () => { reason = reasonInput.value; });
        const label = el('label', 'Motif (visible par les joueurs) '); label.appendChild(reasonInput);
        nodes.push(label);
        plan.fiches.forEach(fiche => nodes.push(ficheCard(fiche)));
        const count = plan.fiches.filter(fiche => selectedRows(fiche).length && !blocked(fiche.charId)).length;
        nodes.push(button(count ? `Envoyer (${plural(count, 'fiche')})` : 'Rien à envoyer', send, { primary: true, key: 'send', disabled: !count }));
      }
      const section = undoSection();
      if (section) nodes.push(section);
      if (callbacks.onClose) nodes.push(button('Fermer', () => callbacks.onClose(), { key: 'close' }));
    }
    mount.replaceChildren(...nodes);
  }

  return { start, render };
}
