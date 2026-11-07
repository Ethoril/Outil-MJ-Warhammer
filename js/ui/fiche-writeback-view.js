// Chantier H : écran « Envoyer aux fiches » (fin de séance). Aperçu des différences durables par fiche, cases à cocher,
// envoi fiche par fiche, conflits avec choix du MJ, « Annuler le dernier envoi ». Aucune logique de règle ici :
// le plan, les commandes et les mises à jour viennent de core/fiche-writeback.js, via `api` (Store) et `source` (réseau).
import { buildFicheCommand, buildUndoCommands, ficheConflictOf, ficheValueForKey, ficheKeyDuplicated, writebackErrorMessage } from '../core/fiche-writeback.js';

const FIELD_LABELS = Object.freeze({
  destin: 'Destin', fortune: 'Fortune', peche: 'Péché', corruption: 'Corruption',
  cc: 'Capacité de Combat', ct: 'Capacité de Tir', f: 'Force', e: 'Endurance', i: 'Initiative', ag: 'Agilité',
  dex: 'Dextérité', int: 'Intelligence', fm: 'Force Mentale', soc: 'Sociabilité'
});
const MANUAL_REASONS = Object.freeze({
  'base-unknown': 'Base absente ou illisible sur la fiche',
  'loss-exceeds-base': 'perte supérieure à la Base : les Avances ne sont jamais touchées',
  'value-out-of-range': 'valeur hors du format de la fiche (4 chiffres)',
  'absent-before-send': 'champ absent de la fiche avant l’envoi',
  'collection-absent': 'la fiche n’a pas encore cette liste',
  'no-fiche-id': 'ligne sans identifiant de fiche sûr (jamais rapprochée par son nom)',
  'id-too-long': 'identifiant trop long pour la fiche',
  'duplicate-id': 'identifiant en double sur la fiche : rapprochement impossible',
  'fiche-rows-without-id': 'la fiche a des lignes sans identifiant : vérifier lesquelles sont concernées',
  'carac-not-on-fiche': 'caractéristique absente de la fiche (Mouvement…)',
  'basic-skill': 'Prière rangée parmi les compétences de base de la fiche : mettre ses Avances à zéro sur la fiche'
});
const NOTES = Object.freeze({
  'fiche-changed-tool-unchanged': 'la fiche a changé, l’outil n’a pas bougé : non cochée',
  'fortune-anchor-unknown': 'valeur de départ de la Fortune inconnue dans l’outil : vérifier avant d’envoyer'
});
// Ligne de fiche (talent, objet, entrée de suivi) : son nom ; absente : « — ».
const shown = value => value === null || value === undefined || value === '' ? '—'
  : typeof value === 'object' ? `« ${value.nom || value.name || value.libelle || value.id || '?'} »` : String(value);
const fieldLabel = (key, op = null) => {
  const [kind, name, collection] = String(key).split(':');
  if (kind === 'carac') return `${FIELD_LABELS[name] || name} (Base)`;
  if (kind === 'counter') return FIELD_LABELS[name] || name;
  if (kind === 'skill-adv' || (kind === 'manual' && op === 'skill-adv')) return 'Prière (Avances)';
  if (kind === 'row') return name === 'talentsAcq' ? 'Talent' : 'Objet';
  if (kind === 'suivi') return 'Suivi du MJ';
  if (kind === 'manual' && op === 'carac') return 'Caractéristique';
  if (kind === 'manual') return /:talents?[-:]/.test(key) ? 'Talent' : /:objet:/.test(key) ? 'Objet' : 'Ligne';
  return FIELD_LABELS[name] || collection || name;
};
const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;
const dateText = date => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

/**
 * `source` : { getUser, signIn, fetchAll, sendCommand } (core/fiche-source.js).
 * `api` : { plan(), applySuccess(charId, response, rows, { sessionId }), applyChoice(charId, key, choice, ficheValue) } (Store).
 */
export function initFicheWritebackView({ mount, source, api, now = () => new Date(), callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('fiche-writeback-view nécessite un mount');
  let phase = 'checking';
  let error = '';
  let notice = '';
  let busy = false;
  let plan = null;
  let reason = `Fin de séance du ${dateText(now())} (outil MJ)`;
  let sequence = 0;
  // Une ouverture de l'écran = un « dernier envoi » : l'annulation couvre tous ses envois.
  const sessionId = `v${now().getTime().toString(36)}`;
  const freshSendId = () => `s${now().getTime().toString(36)}${(sequence++).toString(36)}`;
  // Identifiant gardé pour relancer une fiche restée en conflit ou en échec (rejeu sûr) ; neuf après chaque écriture réussie.
  const retrySendIds = new Map();
  const revisionOverrides = new Map(); // charId → révision actuelle connue après un refus sans champ
  const unchecked = new Set(); // `${charId}|${key}` décochées ; tout le reste part
  const seen = new Set(); // lignes déjà présentées (le décochage par défaut ne s'applique qu'une fois)
  const conflicts = new Map(); // clé (charId, ou `undo:<operationId>`) → { charId, fields, values, undo, undoOf, readError, duplicates }
  const undoOverrides = new Map(); // `undo:<operationId>` → lignes d'annulation ajustées après un conflit
  const failures = new Map(); // charId → message

  const online = () => globalThis.navigator?.onLine !== false;
  const fail = (cause, options = {}) => cause instanceof TypeError ? cause.message : writebackErrorMessage(cause, { ...options, online: online() });
  const rowId = (charId, key) => `${charId}|${key}`;
  function refresh() {
    plan = api.plan();
    // Une Base qui remonte, une clôture de suivi ou une Fortune douteuse ne sont jamais pré-cochées.
    for (const fiche of plan.fiches) for (const row of fiche.rows) {
      const id = rowId(fiche.charId, row.key);
      if (seen.has(id)) continue;
      seen.add(id);
      if (row.defaultUnchecked) unchecked.add(id);
    }
  }
  // Une fiche en conflit attend le choix du MJ sur chaque champ ; les autres fiches partent sans elle (CA11).
  const blocked = charId => Boolean(conflicts.get(charId)?.fields.length);
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

  /** Relit les fiches en conflit pour montrer leur valeur actuelle (CA10). Échec de lecture : aucun choix permis. */
  async function readConflicts(entries) {
    if (!entries.length) return;
    let fetched;
    try { fetched = await source.fetchAll(); }
    catch (cause) { for (const entry of entries) entry.readError = fail(cause); return; }
    for (const entry of entries) {
      const data = fetched.find(item => item.charId === entry.charId)?.data;
      if (!data) { entry.readError = 'Fiche illisible : relisez-la avant de choisir.'; continue; }
      entry.readError = '';
      for (const key of [...entry.fields]) {
        // Ligne en double sur la fiche : à faire à la main, la ligne sort de l'envoi plutôt que de bloquer la fiche.
        if (ficheKeyDuplicated(data, key)) {
          entry.fields = entry.fields.filter(field => field !== key);
          entry.duplicates.push(key);
          if (!entry.undo) unchecked.add(rowId(entry.charId, key));
          else undoOverrides.set(entry.key, (undoOverrides.get(entry.key) || []).filter(row => row.key !== key));
          continue;
        }
        try { entry.values[key] = ficheValueForKey(data, key); } catch { entry.values[key] = null; }
      }
    }
  }
  const conflictEntry = (key, charId, conflict, extra = {}) => ({ key, charId, fields: conflict.fields, values: {}, readError: '', duplicates: [], undo: false, ...extra });

  async function sendFiche(fiche, rows) {
    const sendId = retrySendIds.get(fiche.charId) || freshSendId();
    const revision = Math.min(fiche.revision, revisionOverrides.get(fiche.charId) ?? fiche.revision);
    const command = buildFicheCommand(fiche.charId, rows, { sendId, revision, reason });
    retrySendIds.set(fiche.charId, sendId);
    const response = await source.sendCommand(command);
    await api.applySuccess(fiche.charId, response, rows, { sessionId });
    retrySendIds.delete(fiche.charId); revisionOverrides.delete(fiche.charId);
  }

  async function send() {
    if (busy) return;
    busy = true; notice = ''; error = ''; render();
    const pending = [];
    for (const fiche of plan.fiches) {
      const rows = selectedRows(fiche);
      if (!rows.length || blocked(fiche.charId)) continue;
      try {
        try { await sendFiche(fiche, rows); }
        catch (cause) {
          // Refus sans champ (la fiche a une révision plus ancienne que celle lue) : un seul renvoi sur sa révision actuelle.
          const conflict = ficheConflictOf(cause);
          if (!conflict || conflict.fields.length || conflict.revision === null || revisionOverrides.has(fiche.charId)) throw cause;
          revisionOverrides.set(fiche.charId, conflict.revision);
          await sendFiche(fiche, rows);
        }
        conflicts.delete(fiche.charId); failures.delete(fiche.charId);
      } catch (cause) {
        const conflict = ficheConflictOf(cause);
        if (conflict?.fields.length) { const entry = conflictEntry(fiche.charId, fiche.charId, conflict); conflicts.set(fiche.charId, entry); pending.push(entry); failures.delete(fiche.charId); }
        else failures.set(fiche.charId, conflict ? 'La fiche a changé depuis la dernière lecture : relisez-la avec « Mettre à jour les PJ ».' : fail(cause));
      }
    }
    await readConflicts(pending);
    busy = false;
    refresh();
    if (!conflicts.size && !failures.size) notice = 'Envoi terminé.';
    render();
  }

  async function reread(key) {
    const entry = conflicts.get(key);
    if (!entry || busy) return;
    busy = true; render();
    await readConflicts([entry]);
    if (!entry.fields.length) conflicts.delete(key);
    busy = false; refresh(); render();
  }

  async function choose(key, field, choice) {
    const conflict = conflicts.get(key);
    if (!conflict || busy || conflict.readError || !Object.hasOwn(conflict.values, field)) return;
    busy = true; render();
    try {
      if (conflict.undo) {
        // Annulation en conflit (CA14) : « Garder la fiche » retire la ligne de l'annulation, « Imposer » part de la valeur actuelle.
        const rows = undoOverrides.get(key) || [];
        undoOverrides.set(key, rows.flatMap(row => row.key !== field ? [row] : choice === 'fiche' ? [] : [{ ...row, ficheValue: conflict.values[field], change: { ...row.change, base: conflict.values[field] } }]));
      } else await api.applyChoice(conflict.charId, field, choice, conflict.values[field]);
      conflict.fields = conflict.fields.filter(item => item !== field);
      if (!conflict.fields.length) conflicts.delete(key);
      refresh();
    } catch (cause) { error = fail(cause); }
    busy = false; render();
  }

  async function undo() {
    if (busy || !plan.lastSend) return;
    busy = true; notice = ''; error = ''; render();
    const pending = [];
    const stopped = new Set(); // fiches dont une opération plus récente reste à annuler
    try {
      for (const item of buildUndoCommands(plan.lastSend, { reason: 'Annulation du dernier envoi (outil MJ)' })) {
        const key = `undo:${item.command.payload.undoOf}`;
        if (stopped.has(item.charId)) continue;
        if (conflicts.get(key)?.fields.length) { stopped.add(item.charId); continue; }
        const rows = undoOverrides.get(key) || item.rows;
        if (!rows.some(row => row.change)) { undoOverrides.delete(key); continue; }
        const command = undoOverrides.has(key)
          ? buildFicheCommand(item.charId, rows, { sendId: item.command.payload.sendId, revision: item.command.baseRevision, reason: item.command.payload.reason, undoOf: item.command.payload.undoOf })
          : item.command;
        try {
          const response = await source.sendCommand(command);
          await api.applySuccess(item.charId, response, rows, { sessionId });
          undoOverrides.delete(key); conflicts.delete(key); failures.delete(item.charId);
        } catch (cause) {
          const conflict = ficheConflictOf(cause);
          if (conflict?.fields.length) {
            undoOverrides.set(key, rows);
            const entry = conflictEntry(key, item.charId, conflict, { undo: true, undoOf: item.command.payload.undoOf });
            conflicts.set(key, entry); pending.push(entry);
          } else failures.set(item.charId, fail(cause, { undo: true }));
          // Les opérations plus anciennes de cette fiche attendent que la plus récente soit annulée.
          stopped.add(item.charId);
        }
      }
      await readConflicts(pending);
    } catch (cause) { error = fail(cause, { undo: true }); }
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
    label.append(box, ` ${fieldLabel(row.key, row.op)} : ${row.manual && row.ficheValue === null && row.toolValue === null ? 'à reporter' : `${shown(row.ficheValue)} → ${shown(row.toolValue)}`}`);
    item.appendChild(label);
    const details = [row.label, row.manual ? `à faire à la main : ${MANUAL_REASONS[row.reason] || row.reason}` : '', row.note ? NOTES[row.note] || row.note : '',
      row.defaultUnchecked && !row.note ? 'à confirmer : non cochée par défaut' : '',
      row.warning === 'copies-disagree' ? 'les copies du personnage dans l’outil ne concordent pas : valeur du combat retenue' : ''].filter(Boolean);
    if (details.length) item.appendChild(el('div', details.join(' · '), 'muted'));
    return item;
  }
  function conflictBlock(key, conflict) {
    const box = el('div', '', 'fiche-writeback-conflict');
    box.appendChild(el('p', conflict.undo ? 'Annulation refusée : la fiche a changé depuis l’envoi.' : 'Envoi refusé : le joueur a modifié la fiche depuis la dernière lecture. Rien n’a été écrit sur cette fiche.', 'error'));
    if (conflict.readError) {
      box.appendChild(el('p', `Valeur actuelle de la fiche inconnue : ${conflict.readError}`, 'error'));
      box.appendChild(button('Relire la fiche', () => reread(key), { key: `reread:${key}` }));
    }
    for (const field of conflict.duplicates) box.appendChild(el('p', `${fieldLabel(field)} : ligne en double sur la fiche, à faire à la main ; retirée de cet envoi.`, 'muted'));
    const fiche = plan.fiches.find(item => item.charId === conflict.charId);
    const undoRows = undoOverrides.get(key) || [];
    for (const field of conflict.fields) {
      const toolRow = conflict.undo ? undoRows.find(row => row.key === field) : fiche?.rows.find(row => row.key === field);
      const known = !conflict.readError && Object.hasOwn(conflict.values, field);
      const line = el('div', '', 'fiche-writeback-conflict-row'); line.dataset.key = `conflict:${conflict.charId}:${field}`;
      line.appendChild(el('span', `${fieldLabel(field)} : fiche ${known ? shown(conflict.values[field]) : '?'} · outil ${shown(conflict.undo ? toolRow?.change?.value : toolRow?.toolValue)}`));
      line.append(button('Garder la fiche', () => choose(key, field, 'fiche'), { key: `keep:${conflict.charId}:${field}`, disabled: !known }),
        button(conflict.undo ? 'Imposer l’ancienne valeur' : 'Imposer l’outil', () => choose(key, field, 'outil'), { key: `force:${conflict.charId}:${field}`, disabled: !known }));
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
    if (conflicts.has(fiche.charId)) card.appendChild(conflictBlock(fiche.charId, conflicts.get(fiche.charId)));
    if (failures.has(fiche.charId)) card.appendChild(el('p', `Envoi impossible : ${failures.get(fiche.charId)}`, 'error'));
    return card;
  }
  function undoSection() {
    const last = plan.lastSend;
    const ops = fiche => Array.isArray(fiche?.ops) ? fiche.ops : fiche?.operationId ? [fiche] : [];
    const open = last ? Object.entries(last.fiches || {}).filter(([, fiche]) => ops(fiche).some(op => !op.undone)).map(([charId]) => charId) : [];
    const undoConflicts = [...conflicts.entries()].filter(([, conflict]) => conflict.undo);
    if (!open.length && !undoConflicts.length) return null;
    const section = el('section', '', 'fiche-writeback-undo');
    section.appendChild(el('h3', 'Dernier envoi'));
    for (const [key, conflict] of undoConflicts) { const wrap = el('div'); wrap.dataset.fiche = `undo-${conflict.charId}`; wrap.appendChild(el('strong', `Fiche ${conflict.charId}`)); wrap.appendChild(conflictBlock(key, conflict)); section.appendChild(wrap); }
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
      for (const orphan of plan.orphans || []) nodes.push(el('p', orphan.label, 'muted'));
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
