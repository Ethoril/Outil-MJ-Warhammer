import { DOM, qs, qsa, on, escapeHtml } from './dom.js';
import { Profile, groupProfiles } from '../core/models.js';

export function initReserveUI(Store) {
  const formTitle = qs('#form-title');
  const btnSubmit = qs('#btn-submit-form');
  const btnCancel = qs('#btn-cancel-edit');

  function renderReserve() {
    const term = (DOM.reserve.search.value || '').toLowerCase();
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      p.name.toLowerCase().includes(term) || (p.group || '').toLowerCase().includes(term)
    );

    const datalist = qs('#group-suggestions');
    if (datalist) {
      const groups = [...new Set(all.map(p => p.group).filter(Boolean))].sort();
      datalist.replaceChildren(...groups.map(g => { const o = document.createElement('option'); o.value = g; return o; }));
    }

    const { groups, ungrouped } = groupProfiles(filtered);

    const children = [];
    [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, profiles]) => {
      children.push(renderReserveGroup(name, profiles));
    });
    if (ungrouped.length > 0) children.push(renderReserveGroup('Sans groupe', ungrouped));
    if (children.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted'; empty.style.padding = '10px';
      empty.textContent = 'Aucun profil.';
      children.push(empty);
    }
    DOM.reserve.list.replaceChildren(...children);
  }

  function renderReserveGroup(groupName, profiles) {
    const details = document.createElement('details');
    details.open = true;
    details.className = 'reserve-group';
    const summary = document.createElement('summary');
    summary.innerHTML = `${escapeHtml(groupName)} <span class="muted">(${profiles.length})</span>`;
    const body = document.createElement('div');
    body.className = 'reserve-group-body';
    body.append(...profiles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(renderReserveItem));
    details.append(summary, body);
    return details;
  }

  function renderReserveItem(p) {
    const div = document.createElement('div'); div.className = 'item';
    const left = document.createElement('div');
    const right = document.createElement('div'); right.className = 'row';
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> <span class="muted">(${p.kind})</span></div><div class="muted" style="font-size:0.85em;">Init ${p.initiative} • PV ${p.hp}</div>`;
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Éditer'; btnEdit.classList.add('ghost'); btnEdit.addEventListener('click', () => loadProfileIntoForm(p));
    const btnDup = document.createElement('button'); btnDup.textContent = 'Dupliq.'; btnDup.classList.add('ghost'); btnDup.addEventListener('click', () => Store.duplicateProfile(p.id));
    const btnDel = document.createElement('button'); btnDel.textContent = 'Suppr'; btnDel.classList.add('danger', 'ghost'); btnDel.addEventListener('click', () => { Store.removeProfile(p.id); Store.log(`Réserve: supprimé ${p.name}`); });
    right.append(btnEdit, btnDup, btnDel); div.append(left, right); return div;
  }

  function ensureDiceSectionExists() {
    if (qs('#form-dice-lines')) return;
    const sect = document.createElement('div');
    sect.id = 'form-dice-lines'; sect.style.margin = '10px 0'; sect.style.padding = '10px'; sect.style.background = 'rgba(0,0,0,0.05)'; sect.style.borderRadius = '6px';
    sect.innerHTML = `<strong>Jets pré-configurés (Attaques, etc.)</strong><div id="form-dice-list" style="margin-top:6px;"></div><button type="button" class="ghost small" style="margin-top:6px;" id="btn-add-tpl">+ Ajouter un jet</button>`;
    const actions = DOM.reserve.form.querySelector('.actions');
    DOM.reserve.form.insertBefore(sect, actions);
    qs('#btn-add-tpl').addEventListener('click', () => addProfileDiceRow());
  }

  function addProfileDiceRow({ base = '', note = '' } = {}) {
    const row = document.createElement('div'); row.className = 'row'; row.style.marginBottom = '6px';
    row.innerHTML = `<input type="number" placeholder="Score" value="${base}" class="pf-dice-base" style="width:70px;"><input type="text" placeholder="Label (ex: Épée)" value="${escapeHtml(note)}" class="pf-dice-note" style="flex:1;"><button type="button" class="danger tiny btn-remove-dice">×</button>`;
    const btnRemoveDice = row.querySelector('.btn-remove-dice');
    btnRemoveDice.addEventListener('click', () => row.remove());
    qs('#form-dice-list').appendChild(row);
  }

  function loadProfileIntoForm(p) {
    const f = DOM.reserve.form;
    f.querySelector('[name=id]').value = p.id; f.querySelector('[name=name]').value = p.name;
    f.querySelector('[name=kind]').value = p.kind; f.querySelector('[name=initiative]').value = p.initiative; f.querySelector('[name=hp]').value = p.hp;
    f.querySelector('[name=group]').value = p.group || '';
    f.querySelector('[name=armor_head]').value = p.armor?.head || 0; f.querySelector('[name=armor_body]').value = p.armor?.body || 0;
    f.querySelector('[name=armor_arms]').value = p.armor?.arms || 0; f.querySelector('[name=armor_legs]').value = p.armor?.legs || 0;
    const inputE = f.querySelector('[name=E]'); if (inputE) inputE.value = p.caracs?.E || 0;
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { f.querySelector(`[name=${k}]`).value = p.caracs[k] || ''; });

    ensureDiceSectionExists();
    qs('#form-dice-list').innerHTML = '';
    (p.diceLines || []).forEach(dl => addProfileDiceRow(dl));

    formTitle.textContent = "Modifier le profil"; btnSubmit.textContent = "Modifier"; btnCancel.style.display = 'inline-block';
    f.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    DOM.reserve.form.reset();
    DOM.reserve.form.querySelector('[name=id]').value = '';
    DOM.reserve.form.querySelector('[name=kind]').value = 'Créature';
    DOM.reserve.form.querySelector('[name=group]').value = '';
    if (qs('#form-dice-list')) qs('#form-dice-list').innerHTML = '';
    formTitle.textContent = "Nouveau profil"; btnSubmit.textContent = "Ajouter"; btnCancel.style.display = 'none';
  }

  on(btnCancel, 'click', resetForm);

  on(DOM.reserve.form, 'submit', (e) => {
    e.preventDefault(); const fd = new FormData(DOM.reserve.form);
    const caracs = {};
    caracs['E'] = Number(fd.get('E') || 0);
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { const raw = fd.get(k); if (raw !== null && raw !== '') { const v = Number(raw); if (Number.isFinite(v)) caracs[k] = v; } });
    const armor = { head: Number(fd.get('armor_head') || 0), body: Number(fd.get('armor_body') || 0), arms: Number(fd.get('armor_arms') || 0), legs: Number(fd.get('armor_legs') || 0) };

    const diceLines = [];
    if (qs('#form-dice-list')) {
      qsa('#form-dice-list .row').forEach(row => {
        const b = row.querySelector('.pf-dice-base').value; const n = row.querySelector('.pf-dice-note').value;
        if (b) diceLines.push({ base: parseInt(b), note: n });
      });
    }

    const id = fd.get('id');
    const data = { name: fd.get('name'), kind: fd.get('kind'), initiative: Number(fd.get('initiative') || 0), hp: Number(fd.get('hp') || 0), group: (fd.get('group') || '').trim(), caracs, armor, diceLines };
    if (id) { Store.updateProfile(id, data); Store.log(`Réserve: modifié ${data.name}`); } else { Store.addProfile(new Profile(data)); Store.log(`Réserve: ajouté ${data.name}`); }
    resetForm();
  });

  on(DOM.reserve.seed, 'click', () => {
    Store.batch(() => {
      [new Profile({ name: 'Renaut de Volargent', kind: 'PJ', initiative: 41, hp: 14, group: 'PJs', caracs: { CC: 52, Ag: 41, E: 35 }, armor: { head: 2, body: 2, arms: 0, legs: 0 } }),
      new Profile({ name: 'Saskia la Noire', kind: 'PJ', initiative: 52, hp: 12, group: 'PJs', caracs: { CC: 45, Ag: 52, E: 40 } }),
      new Profile({ name: 'Gobelins (2)', kind: 'Créature', initiative: 28, hp: 9, group: 'Gobelins', caracs: { CC: 35, E: 30 }, diceLines: [{ base: 35, note: "Lance" }, { base: 30, note: "Esquive" }] }),
      new Profile({ name: 'Chien de guerre', kind: 'Créature', initiative: 36, hp: 10, group: 'Gobelins', caracs: { CC: 40, E: 30 }, diceLines: [{ base: 40, note: "Morsure" }] })
      ].forEach(p => Store.addProfile(p));
      Store.log('Seed Réserve: 4 profils');
    });
  });

  on(DOM.reserve.clear, 'click', () => {
    const count = Store.listProfiles().length;
    if (count === 0) return;
    if (confirm(`Supprimer les ${count} profil(s) de la Réserve ? Cette action est irréversible.`)) {
      Store.clearReserve();
    }
  });

  on(DOM.reserve.search, 'input', renderReserve);
  ensureDiceSectionExists();
  resetForm();

  return { renderReserve };
}
