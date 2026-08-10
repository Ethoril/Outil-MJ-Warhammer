import { DOM, qs, escapeHtml } from './dom.js';

export function renderLog(Store) {
  const container = DOM.combat.log;
  if (!container) return;

  const kindFilter = qs('#log-filter-kind')?.value || '';
  const actorFilter = qs('#log-filter-actor')?.value || '';

  // Actualisation dynamique des options du filtre par combattant
  const actorSelect = qs('#log-filter-actor');
  if (actorSelect) {
    const currentVal = actorSelect.value;
    const participants = Store.listParticipants();
    const profiles = Store.listProfiles();
    const actorMap = new Map();
    participants.forEach(p => actorMap.set(p.id, p.name));
    profiles.forEach(p => actorMap.set(p.id, p.name));

    actorSelect.innerHTML = `<option value="">Tous les combattants</option>`;
    actorMap.forEach((name, id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = name;
      actorSelect.appendChild(opt);
    });
    actorSelect.value = currentVal;
  }

  const rawLogs = Store.getLog();
  const frag = document.createDocumentFragment();

  rawLogs.forEach(entry => {
    let isMatch = true;

    if (typeof entry === 'object' && entry !== null) {
      if (kindFilter && entry.kind !== kindFilter && entry.kind !== 'legacy') {
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
        textHtml += `<details class="log-detail" style="margin-top:2px; font-size:0.85em; opacity:0.9;"><summary style="cursor:pointer; color:#d4a574;">Détails du jet</summary><div style="padding:4px 8px; background:rgba(0,0,0,0.25); border-radius:4px; margin-top:2px;">${detailHtml}</div></details>`;
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
