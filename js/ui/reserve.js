import { DOM, qs, qsa, on, escapeHtml } from './dom.js';
import { Profile, groupProfiles, normalizeAction, normalizeTags } from '../core/models.js';
import { normalizeSearchText } from '../core/sanitize.js';
import { createQualityPicker } from './action-editor.js';
import { showToast } from './toast.js';

export function initReserveUI(Store, { onSaved = () => {} } = {}) {
  const formTitle = qs('#form-title');
  const btnSubmit = qs('#btn-submit-form');
  const btnCancel = qs('#btn-cancel-edit');
  const settle = (operation, label = 'Opération') => Promise.resolve(operation).then(result => { if (result === false || result?.ok === false) throw result?.error || new Error(`${label} impossible.`); return result; }).catch(error => showToast(`${label} impossible : ${error.message}`, 'error'));

  function ensureProfileFields() {
    const kind = DOM.reserve.form?.querySelector('[name=kind]');
    if (kind && !kind.querySelector('option[value="PNJ"]')) kind.append(new Option('PNJ', 'PNJ'));
    if (qs('#form-profile-meta')) return;
    const meta = document.createElement('div');
    meta.id = 'form-profile-meta';
    meta.style.cssText = 'display:grid; gap:6px; margin:10px 0;';
    meta.innerHTML = '<label>Tags <small class="muted">(séparés par des virgules)</small><input name="tags" placeholder="chef, gobelin, magie"></label><label>Notes<textarea name="notes" rows="2" placeholder="Repères et consignes"></textarea></label><label style="display:flex; gap:6px; align-items:center;"><input type="checkbox" name="favorite"> Profil favori</label><label style="display:flex; gap:6px; align-items:center;"><input type="checkbox" name="propagate"> Mettre à jour les exemplaires en cours (PV max et fiche, sans toucher aux PV actuels ni aux états)</label>';
    const actions = DOM.reserve.form.querySelector('.actions');
    DOM.reserve.form.insertBefore(meta, actions);
  }

  function renderReserve() {
    const term = normalizeSearchText(DOM.reserve.search.value || '');
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      !term || [p.name, p.group, p.kind, p.notes, ...(p.tags || []), ...((p.diceLines?.length ? p.diceLines : p.actions) || []).flatMap(line => (line.qualities || []).map(q => q.name || q.id))]
        .some(value => normalizeSearchText(value).includes(term))
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
    const tags = normalizeTags(p.tags);
    left.innerHTML = `<div><strong>${escapeHtml(p.name)}</strong> <span class="muted">(${escapeHtml(p.kind)})</span>${p.favorite ? ' ⭐' : ''}</div><div class="muted" style="font-size:0.85em;">Init ${p.initiative} • PV ${p.hp}${tags.length ? ` • ${escapeHtml(tags.join(', '))}` : ''}</div>`;
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Éditer'; btnEdit.classList.add('ghost'); btnEdit.addEventListener('click', () => loadProfileIntoForm(p));
    const btnDup = document.createElement('button'); btnDup.textContent = 'Dupliq.'; btnDup.classList.add('ghost'); btnDup.addEventListener('click', () => Store.duplicateProfile(p.id));
    const btnFav = document.createElement('button'); btnFav.textContent = p.favorite ? '★' : '☆'; btnFav.title = 'Profil favori'; btnFav.classList.add('ghost'); btnFav.addEventListener('click', () => settle(Store.updateProfile(p.id, { favorite: !p.favorite }), 'Favori'));
    const btnDel = document.createElement('button'); btnDel.textContent = 'Suppr'; btnDel.classList.add('danger', 'ghost'); btnDel.addEventListener('click', () => settle(Promise.resolve(Store.removeProfile(p.id)).then(result => settle(Store.log(`Réserve: supprimé ${p.name}`), 'Journal').then(() => result)), 'Suppression'));
    right.append(btnEdit, btnDup, btnFav, btnDel); div.append(left, right); return div;
  }

  function ensureDiceSectionExists() {
    if (DOM.reserve.form?.querySelector('#form-dice-lines')) return;
    const sect = document.createElement('div');
    sect.id = 'form-dice-lines'; sect.style.margin = '10px 0'; sect.style.padding = '10px'; sect.style.background = 'rgba(0,0,0,0.05)'; sect.style.borderRadius = '6px';
    sect.innerHTML = `<strong>Jets pré-configurés (Attaques, etc.)</strong><div id="form-dice-list" style="margin-top:6px;"></div><button type="button" class="ghost small" style="margin-top:6px;" id="btn-add-tpl">+ Ajouter un jet</button>`;
    const actions = DOM.reserve.form.querySelector('.actions');
    DOM.reserve.form.insertBefore(sect, actions);
    sect.querySelector('#btn-add-tpl').addEventListener('click', () => addProfileDiceRow());
  }

  function addProfileDiceRow({ base = '', mod = 0, type = '', note = '', damage = '', qualities = [], valuesX = null, capacity = null } = {}) {
    const row = document.createElement('div'); row.className = 'row'; row.style.marginBottom = '6px'; row.style.gap = '4px';
    const currentQualities = Array.isArray(qualities) ? qualities : [];

    row.innerHTML = `<select class="pf-dice-type" title="Type d'action"><option value="">Type…</option><option value="attack">Attaque</option><option value="skill">Compétence</option><option value="defense">Défense</option><option value="opposition">Opposition</option></select><input type="number" placeholder="Score" value="${base}" class="pf-dice-base" style="width:60px;"><input type="number" placeholder="Mod." value="${mod ?? 0}" class="pf-dice-mod" style="width:52px;"><input type="text" placeholder="Label (ex: Épée)" value="${escapeHtml(note)}" class="pf-dice-note" style="flex:1;"><input type="number" placeholder="Dég." value="${damage !== undefined && damage !== null ? damage : ''}" class="pf-dice-damage" style="width:50px;"><input type="number" placeholder="X" value="${valuesX ?? ''}" class="pf-dice-x" style="width:42px;"><input type="number" placeholder="Cap." value="${capacity ?? ''}" class="pf-dice-capacity" style="width:48px;"><span class="pf-dice-quality-picker"></span><button type="button" class="danger tiny btn-remove-dice">×</button>`;
    row.querySelector('.pf-dice-type').value = type || '';

    const normalized = normalizeAction({ qualities: currentQualities });
    row._qualities = normalized.qualities;
    const picker = createQualityPicker({ container: row.querySelector('.pf-dice-quality-picker'), qualities: row._qualities, onChange: qualities => { row._qualities = qualities; } });
    row._qualityPicker = picker;

    const btnRemoveDice = row.querySelector('.btn-remove-dice');
    btnRemoveDice.addEventListener('click', () => row.remove());
    DOM.reserve.form?.querySelector('#form-dice-list')?.appendChild(row);
  }

  function loadProfileIntoForm(p) {
    ensureProfileFields();
    const f = DOM.reserve.form;
    f.querySelector('[name=id]').value = p.id; f.querySelector('[name=name]').value = p.name;
    f.querySelector('[name=kind]').value = p.kind; f.querySelector('[name=initiative]').value = p.initiative; f.querySelector('[name=hp]').value = p.hp;
    f.querySelector('[name=group]').value = p.group || '';
    f.querySelector('[name=tags]').value = normalizeTags(p.tags).join(', ');
    f.querySelector('[name=notes]').value = p.notes || '';
    f.querySelector('[name=favorite]').checked = Boolean(p.favorite);
    f.querySelector('[name=propagate]').checked = false;
    f.querySelector('[name=armor_head]').value = p.armor?.head || 0; f.querySelector('[name=armor_body]').value = p.armor?.body || 0;
    f.querySelector('[name=armor_arms]').value = p.armor?.arms || 0; f.querySelector('[name=armor_legs]').value = p.armor?.legs || 0;
    const inputE = f.querySelector('[name=E]'); if (inputE) inputE.value = p.caracs?.E || 0;
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { f.querySelector(`[name=${k}]`).value = p.caracs[k] || ''; });

    ensureDiceSectionExists();
    f.querySelector('#form-dice-list').innerHTML = '';
    (p.diceLines || p.actions || []).forEach(dl => addProfileDiceRow(dl));

    formTitle.textContent = "Modifier le profil"; btnSubmit.textContent = "Modifier"; btnCancel.style.display = 'inline-block';
    f.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    ensureProfileFields();
    DOM.reserve.form.reset();
    DOM.reserve.form.querySelector('[name=id]').value = '';
    DOM.reserve.form.querySelector('[name=kind]').value = 'Créature';
    DOM.reserve.form.querySelector('[name=group]').value = '';
    DOM.reserve.form.querySelector('[name=tags]').value = '';
    DOM.reserve.form.querySelector('[name=notes]').value = '';
    DOM.reserve.form.querySelector('[name=favorite]').checked = false;
    DOM.reserve.form.querySelector('[name=propagate]').checked = false;
    if (qs('#form-dice-list')) qs('#form-dice-list').innerHTML = '';
    formTitle.textContent = "Nouveau profil"; btnSubmit.textContent = "Ajouter"; btnCancel.style.display = 'none';
  }

  on(btnCancel, 'click', resetForm);

  on(DOM.reserve.form, 'submit', async (e) => {
    e.preventDefault(); const submit = btnSubmit; if (submit) submit.disabled = true; const fd = new FormData(DOM.reserve.form);
    const editorToken = DOM.reserve.form.dataset.editorToken || null;
    const caracs = {};
    caracs['E'] = Number(fd.get('E') || 0);
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { const raw = fd.get(k); if (raw !== null && raw !== '') { const v = Number(raw); if (Number.isFinite(v)) caracs[k] = v; } });
    const armor = { head: Number(fd.get('armor_head') || 0), body: Number(fd.get('armor_body') || 0), arms: Number(fd.get('armor_arms') || 0), legs: Number(fd.get('armor_legs') || 0) };

    const diceLines = [];
    const diceList = DOM.reserve.form.querySelector('#form-dice-list');
    if (diceList) {
      diceList.querySelectorAll('.row').forEach(row => {
        const b = row.querySelector('.pf-dice-base').value;
        const n = row.querySelector('.pf-dice-note').value;
        const d = row.querySelector('.pf-dice-damage')?.value;
        if (b) {
          diceLines.push({
            base: parseInt(b),
            mod: Number(row.querySelector('.pf-dice-mod')?.value) || 0,
            type: row.querySelector('.pf-dice-type')?.value || '',
            note: n,
            damage: d !== undefined && d !== '' ? Number(d) : 0,
            qualities: row._qualities || [],
            valuesX: row.querySelector('.pf-dice-x')?.value || null,
            capacity: row.querySelector('.pf-dice-capacity')?.value || null
          });
        }
      });
    }

    const id = fd.get('id');
    const data = { name: fd.get('name'), kind: fd.get('kind'), initiative: Number(fd.get('initiative') || 0), hp: Number(fd.get('hp') || 0), group: (fd.get('group') || '').trim(), tags: normalizeTags(fd.get('tags')), notes: String(fd.get('notes') || ''), favorite: fd.get('favorite') === 'on', caracs, armor, diceLines };
    try {
      const propagate = id && fd.get('propagate') === 'on';
      // The Store owns the profile/participant transaction. This keeps the
      // opt-in propagation atomic and preserves current PV, states and targets.
      const result = id ? Store.updateProfile(id, data, { propagate }) : Store.addProfile(new Profile(data));
      const persisted = await result;
      if (persisted?.ok === false) throw persisted.error || new Error('Sauvegarde du profil impossible.');
      const logged = Store.log(`Réserve: ${id ? 'modifié' : 'ajouté'} ${data.name}`);
      if (logged === false) throw new Error('Journal local indisponible.');
      const logResult = await logged;
      if (logResult?.ok === false) throw logResult.error || new Error('Journal local indisponible.');
      // The form can be moved to a newly opened editor while this async save
      // is finishing. Never reset that newer editor's draft.
      if (!editorToken || DOM.reserve.form.dataset.editorToken === editorToken) resetForm();
      onSaved({ id: id || null, name: data.name, mode: id ? 'update' : 'create', editorToken });
    } catch (error) { showToast(`Profil non enregistré : ${error.message}`, 'error'); }
    finally { if (submit) submit.disabled = false; }
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
  ensureProfileFields();
  ensureDiceSectionExists();
  resetForm();

  return { renderReserve, resetForm, loadProfileIntoForm };
}
