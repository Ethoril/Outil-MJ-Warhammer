import { DOM, qs, escapeHtml } from './dom.js';
import { groupProfiles } from '../core/models.js';
import { normalizeSearchText } from '../core/sanitize.js';

export function initImportModalUI(Store) {
  const selectedIds = new Set();
  const selectedAt = new Map();

  function importRow(p) {
    const label = document.createElement('label');
    label.className = 'import-tile';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = p.id; cb.checked = selectedIds.has(p.id);
    const span = document.createElement('span');
    span.textContent = p.name;
    label.append(cb, span);
    label.classList.toggle('selected', cb.checked);
    cb.addEventListener('click', event => event.stopPropagation());
    cb.addEventListener('change', () => {
      // Chromium peut produire un second changement lors du clic sur une
      // tuile label dans une <dialog>; ne transforme pas ce rebond immédiat en
      // désélection. Un clic utilisateur ultérieur reste libre.
      if (!cb.checked && selectedIds.has(p.id) && Date.now() - (selectedAt.get(p.id) || 0) < 1000) {
        cb.checked = true;
        return;
      }
      if (cb.checked) selectedIds.add(p.id); else selectedIds.delete(p.id);
      if (cb.checked) selectedAt.set(p.id, Date.now()); else selectedAt.delete(p.id);
      label.classList.toggle('selected', cb.checked);
    });
    return label;
  }

  function renderImportModal() {
    const term = normalizeSearchText(qs('#import-filter')?.value || '');
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      !term || [p.name, p.group, p.kind, p.notes, ...(p.tags || []), ...((p.diceLines?.length ? p.diceLines : p.actions) || []).flatMap(line => (line.qualities || []).map(q => q.name || q.id))]
        .some(value => normalizeSearchText(value).includes(term))
    );

    const { groups, ungrouped } = groupProfiles(filtered);

    const children = [];
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, profiles]) => {
      children.push(renderImportGroup(name, profiles, true));
    });
    if (ungrouped.length > 0) children.push(renderImportGroup('Sans groupe', ungrouped, false));
    if (children.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted'; empty.style.padding = '8px';
      empty.textContent = 'Aucun profil trouvé.';
      children.push(empty);
    }
    const visibleIds = new Set(filtered.map(profile => profile.id));
    const preserved = [...selectedIds].filter(id => !visibleIds.has(id));
    const hiddenSelections = preserved.map(id => {
      const input = document.createElement('input');
      input.type = 'checkbox'; input.value = id; input.checked = true; input.hidden = true; input.dataset.preservedSelection = 'true';
      return input;
    });
    DOM.importModal.list.replaceChildren(...children, ...hiddenSelections);
  }

  function renderImportGroup(groupName, profiles, collapsed) {
    const details = document.createElement('details');
    details.className = 'import-group';
    if (!collapsed) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'import-group-summary row';
    summary.addEventListener('click', event => {
      event.preventDefault();
      details.open = !details.open;
    });

    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = `${escapeHtml(groupName)} <span class="muted">(${profiles.length})</span>`;

    const spacer = document.createElement('div'); spacer.className = 'spacer';

    const btnAll = document.createElement('button');
    btnAll.type = 'button'; btnAll.className = 'ghost small';
    btnAll.textContent = 'Tout';
    btnAll.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cbs = [...body.querySelectorAll('input[type=checkbox]')];
      const allChecked = cbs.every(cb => cb.checked);
      cbs.forEach(cb => {
        cb.checked = !allChecked;
        if (cb.checked) selectedIds.add(cb.value); else selectedIds.delete(cb.value);
        cb.closest('label')?.classList.toggle('selected', cb.checked);
      });
    });

    summary.append(titleSpan, spacer);

    const body = document.createElement('div');
    body.className = 'import-group-body';
    body.append(btnAll, ...profiles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(importRow));

    details.append(summary, body);
    return details;
  }

  return { renderImportModal, clearSelection: () => selectedIds.clear(), getSelectedIds: () => [...selectedIds] };
}
