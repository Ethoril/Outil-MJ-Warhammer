import { DOM, qs, escapeHtml } from './dom.js';

export function renderLog(Store, target = DOM.combat.log, { contextual = target !== DOM.combat.log } = {}) {
  let container = contextual ? (target?.querySelector('[data-context-log-list]') || target) : target;
  if (!container) return;

  let kindSelect = contextual ? target.querySelector('[data-context-log-kind]') : qs('#log-filter-kind');
  let actorSelect = contextual ? target.querySelector('[data-context-log-actor]') : qs('#log-filter-actor');
  if (contextual && !kindSelect) {
    target.replaceChildren();
    const filters = document.createElement('div'); filters.className = 'workspace-inline-actions';
    kindSelect = document.createElement('select'); kindSelect.dataset.contextLogKind = 'true'; kindSelect.setAttribute('aria-label', 'Filtrer le journal par type');
    actorSelect = document.createElement('select'); actorSelect.dataset.contextLogActor = 'true'; actorSelect.setAttribute('aria-label', 'Filtrer le journal par combattant');
    const kindLabel = document.createElement('label'); kindLabel.append('Type ', kindSelect);
    const actorLabel = document.createElement('label'); actorLabel.append('Combattant ', actorSelect);
    filters.append(kindLabel, actorLabel);
    const list = document.createElement('div'); list.dataset.contextLogList = 'true';
    target.append(filters, list);
    kindSelect.addEventListener('change', () => renderLog(Store, target, { contextual: true }));
    actorSelect.addEventListener('change', () => renderLog(Store, target, { contextual: true }));
    container = list;
  }
  const kindFilter = kindSelect?.value || '';
  const actorFilter = actorSelect?.value || '';
  const rawLogs = Store.getLog();

  if (contextual && kindSelect) {
    const currentVal = kindSelect.value;
    const kinds = [...new Set(rawLogs.filter(entry => entry && typeof entry === 'object' && entry.kind).map(entry => entry.kind))].sort();
    const labels = { management: 'Gestion', roll: 'Jets', damage: 'Dégâts', state: 'États', legacy: 'Anciennes entrées' };
    kindSelect.innerHTML = '<option value="">Tous les types</option>';
    kinds.forEach(kind => kindSelect.appendChild(new Option(labels[kind] || kind, kind)));
    kindSelect.value = currentVal;
  }

  // Actualisation dynamique des options du filtre par combattant
  if (actorSelect) {
    const currentVal = actorSelect.value;
    const participants = Store.listParticipants();
    const profiles = Store.listProfiles();
    const actorMap = new Map();
    participants.forEach(p => actorMap.set(p.id, p.name));
    profiles.forEach(p => actorMap.set(p.id, p.name));
    // Les noms sont recopiés dans les entrées structurées au moment du jet ou
    // du retrait : une carte retirée doit rester filtrable dans l'historique.
    Store.getLog().forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      if (entry.actorId && entry.actorName) actorMap.set(entry.actorId, entry.actorName);
      if (entry.targetId && entry.targetName) actorMap.set(entry.targetId, entry.targetName);
    });

    actorSelect.innerHTML = `<option value="">Tous les combattants</option>`;
    actorMap.forEach((name, id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      actorSelect.appendChild(opt);
    });
    actorSelect.value = currentVal;
  }

  const frag = document.createDocumentFragment();

  rawLogs.forEach(entry => {
    let isMatch = true;

    if (typeof entry === 'object' && entry !== null) {
      if (kindFilter && entry.kind !== kindFilter) {
        isMatch = false;
      }
      if (actorFilter && entry.actorId !== actorFilter && entry.targetId !== actorFilter) {
        isMatch = false;
      }
    }

    if (!isMatch) return;

    const div = document.createElement('div');
    div.className = 'entry';
    div.style.marginBottom = '6px';
    div.style.fontSize = '0.9em';

    if (typeof entry === 'string') {
      div.textContent = entry;
    } else {
      const timeStr = entry.time ? `[${entry.time}] ` : '';
      let textHtml = `<span class="muted">${escapeHtml(timeStr)}</span>${escapeHtml(entry.text || '')}`;

      if (entry.detail) {
        let detailHtml = '';
        if (typeof entry.detail === 'object') {
          detailHtml = Object.entries(entry.detail)
            .map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`)
            .join(' | ');
        } else {
          detailHtml = escapeHtml(String(entry.detail));
        }
        textHtml += `<details class="log-detail" style="margin-top:2px; font-size:0.85em; opacity:0.9;"><summary style="cursor:pointer; color:var(--info-fg);">Détails du jet</summary><div style="padding:4px 8px; background:rgba(0,0,0,0.25); border-radius:4px; margin-top:2px;">${detailHtml}</div></details>`;
      }

      div.innerHTML = textHtml;
    }

    frag.appendChild(div);
  });

  if (frag.childNodes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'entry muted';
    empty.textContent = 'Aucun événement correspondant.';
    frag.appendChild(empty);
  }

  container.replaceChildren(frag);
}

export function initLogViewUI(Store) {
  const kindSelect = qs('#log-filter-kind');
  const actorSelect = qs('#log-filter-actor');
  const clearBtn = qs('#btn-clear-log');

  if (kindSelect) kindSelect.addEventListener('change', () => renderLog(Store));
  if (actorSelect) actorSelect.addEventListener('change', () => renderLog(Store));
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Effacer tout l\'historique ?')) {
        Store.clearLog();
      }
    });
  }
}
