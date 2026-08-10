import { DOM, qs, escapeHtml } from './dom.js';
import { groupProfiles } from '../core/models.js';

export function initImportModalUI(Store) {
  function importRow(p) {
    const label = document.createElement('label');
    label.className = 'import-tile';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.value = p.id;
    const span = document.createElement('span');
    span.textContent = p.name;
    label.append(cb, span);
    cb.addEventListener('change', () => label.classList.toggle('selected', cb.checked));
    return label;
  }

  function renderImportModal() {
    const term = (qs('#import-filter')?.value || '').toLowerCase();
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      p.name.toLowerCase().includes(term) || (p.group || '').toLowerCase().includes(term)
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
    DOM.importModal.list.replaceChildren(...children);
  }

  function renderImportGroup(groupName, profiles, collapsed) {
    const details = document.createElement('details');
    details.className = 'import-group';
    if (!collapsed) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'import-group-summary row';

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
      cbs.forEach(cb => cb.checked = !allChecked);
    });

    summary.append(titleSpan, spacer, btnAll);

    const body = document.createElement('div');
    body.className = 'import-group-body';
    body.append(...profiles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(importRow));

    details.append(summary, body);
    return details;
  }

  return { renderImportModal };
}
