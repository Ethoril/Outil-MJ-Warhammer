import { DOM, qs, qsa, on, escapeHtml } from './dom.js';
import { Profile, groupProfiles, normalizeAction, normalizeTags, cloneValue, normalizeArmorLocations, chooseTokenImage, normalizeTokenColor } from '../core/models.js';
import { normalizeDamageFields } from '../core/damage.js';
import { normalizeSearchText } from '../core/sanitize.js';
import { ACTION_FIELD_HELP, createQualityPicker, preserveEditedV5Modifier, legacyModifierMessage } from './action-editor.js';
import { showToast } from './toast.js';
import { renderFicheDetails } from './fiche-details.js';
import { resolveKeyword } from '../core/reference-catalog.js';
import { contextMessage } from './messages.js';
import { createKeywordPicker } from './keyword-picker.js';
import { exportProfilesJson } from '../core/json-profile-export.js';
import { createBestiaryLoader, buildReserveProfileFromBestiary } from '../core/bestiary-profiles.js';
import { declaredMountOf, isMountCandidate } from '../core/mounts.js';
import { syncTokenColorSelect } from './token-color-options.js';

const fetchJson = async path => { const response = await fetch(path); if (!response.ok) throw new Error(`${path} : ${response.status}`); return response.json(); };

export function initReserveUI(Store, { onSaved = () => {} } = {}) {
  const formTitle = qs('#form-title');
  const btnSubmit = qs('#btn-submit-form');
  const btnCancel = qs('#btn-cancel-edit');
  const btnCopyJson = qs('#btn-copy-profile-json');
  const settle = (operation, label = 'Opération') => Promise.resolve(operation).then(result => { if (result === false || result?.ok === false) throw result?.error || new Error(`${label} impossible.`); return result; }).catch(error => showToast(contextMessage(`${label} impossible`, error, 'réessayez.'), 'error'));

  let tokenImage = null;
  let imageRevision = 0;
  function setTokenImage(value) {
    tokenImage = value || null;
    const preview = DOM.reserve.form.querySelector('#token-image-preview');
    const remove = DOM.reserve.form.querySelector('#token-image-remove');
    if (preview) { preview.hidden = !tokenImage; if (tokenImage) preview.src = tokenImage; else preview.removeAttribute('src'); }
    if (remove) remove.hidden = !tokenImage;
  }

  function ensureProfileFields() {
    const kind = DOM.reserve.form?.querySelector('[name=kind]');
    if (kind && !kind.querySelector('option[value="PNJ"]')) kind.append(new Option('PNJ', 'PNJ'));
    if (DOM.reserve.form?.querySelector('#form-profile-meta')) return;
    const meta = document.createElement('div');
    meta.id = 'form-profile-meta';
    meta.style.cssText = 'display:grid; gap:6px; margin:10px 0;';
    meta.innerHTML = '<div class="row"><img id="token-image-preview" alt="Aperçu du pion" hidden style="width:64px;height:64px;border-radius:50%;object-fit:cover"><button type="button" id="token-image-select">Image du pion…</button><button type="button" id="token-image-remove" hidden>Retirer l’image</button><input id="token-image-file" type="file" accept="image/*" hidden></div><div class="row"><label>Couleur du pion <small class="muted">(cerclage d’un PJ sur la carte)</small><select name="tokenColor" id="token-color"></select></label></div><label>Culte<input name="cult" placeholder="Myrmidia"></label><label>Tags <small class="muted">(séparés par des virgules)</small><input name="tags" placeholder="chef, gobelin, magie"></label><label>Notes<textarea name="notes" rows="2" placeholder="Repères et consignes"></textarea></label><label style="display:flex; gap:6px; align-items:center;"><input type="checkbox" name="favorite"> Profil favori</label><label style="display:flex; gap:6px; align-items:center;"><input type="checkbox" name="propagate"> Mettre à jour les exemplaires en cours (PV max et fiche, sans toucher aux PV actuels ni aux états)</label>';
    const actions = DOM.reserve.form.querySelector('.actions');
    DOM.reserve.form.insertBefore(meta, actions);
    const input = meta.querySelector('#token-image-file');
    syncTokenColorSelect(meta.querySelector('#token-color'), null);
    meta.querySelector('#token-image-select').addEventListener('click', () => input.click());
    meta.querySelector('#token-image-remove').addEventListener('click', () => { imageRevision++; setTokenImage(null); if (btnSubmit) btnSubmit.disabled = false; });
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; input.value = '';
      if (!file) return;
      const revision = ++imageRevision;
      const submit = btnSubmit;
      if (submit) submit.disabled = true;
      try {
        const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
        const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const result = await chooseTokenImage((size, quality) => {
          const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
          canvas.getContext('2d').drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size);
          return canvas.toDataURL('image/webp', quality);
        });
        if (revision !== imageRevision) return;
        if (!result) throw new Error('Image trop volumineuse ou format WebP indisponible.');
        setTokenImage(result);
      } catch (error) { if (revision === imageRevision) showToast('Impossible de préparer cette image. Essayez une autre image.', 'error'); }
      finally { if (revision === imageRevision && submit) submit.disabled = false; }
    });
  }

  // Mots-clés de créature (espèce, nature, allégeance) : sélecteur du référentiel, jamais de texte libre.
  let keywordPicker = null;
  function ensureKeywordPicker() {
    const f = DOM.reserve.form;
    if (!f || keywordPicker) return;
    const section = document.createElement('div');
    section.id = 'form-keywords'; section.style.cssText = 'margin:10px 0;';
    const title = document.createElement('div'); title.textContent = 'Mots-clés de créature (espèce, nature, allégeance)'; title.className = 'muted';
    const holder = document.createElement('div');
    section.append(title, holder);
    f.insertBefore(section, f.querySelector('.actions'));
    keywordPicker = createKeywordPicker({ container: holder, store: Store, subject: {} });
  }

  // Monture du profil : animal du bestiaire (Dressé (Monture) par défaut, tout le bestiaire sur demande), copié en profil de bibliothèque.
  let mountSection = null, mountSubjectId = null, bestiaryProfiles = null;
  const bestiaryLoader = createBestiaryLoader(fetchJson);
  const loadBestiary = () => bestiaryProfiles || (bestiaryProfiles = bestiaryLoader.index()
    .then(books => bestiaryLoader.load(books.map(book => book.book))).then(rows => rows.filter(row => row.kind === 'profile' || !row.kind))
    .catch(error => { bestiaryProfiles = null; throw error; }));
  function ensureMountSection() {
    const f = DOM.reserve.form;
    if (!f || mountSection) return;
    mountSection = document.createElement('div');
    mountSection.id = 'form-mount'; mountSection.style.cssText = 'display:grid; gap:6px; margin:10px 0;';
    const title = document.createElement('div'); title.className = 'muted'; title.textContent = 'Monture (entre en combat avec ce profil, à pied par défaut)';
    const current = document.createElement('div'); current.className = 'row form-mount-current'; current.style.cssText = 'align-items:center; gap:8px;';
    const search = document.createElement('div'); search.className = 'row'; search.style.cssText = 'align-items:center; gap:8px;';
    const text = document.createElement('input'); text.type = 'search'; text.className = 'form-mount-search'; text.placeholder = 'Chercher une monture (cheval, loup, griffon…)';
    text.setAttribute('aria-label', 'Chercher une monture dans le bestiaire');
    const allLabel = document.createElement('label'); allLabel.className = 'muted';
    const all = document.createElement('input'); all.type = 'checkbox'; all.className = 'form-mount-all';
    allLabel.append(all, ' tout le bestiaire');
    search.append(text, allLabel);
    const results = document.createElement('div'); results.className = 'form-mount-results'; results.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px;';
    mountSection.append(title, current, search, results);
    f.insertBefore(mountSection, f.querySelector('.actions'));
    const refresh = () => {
      results.textContent = '';
      if (!mountSubjectId) return;
      const wanted = normalizeSearchText(text.value || '');
      if (!wanted && !all.checked) return;
      loadBestiary().then(rows => {
        results.textContent = '';
        const found = rows.filter(row => (all.checked || isMountCandidate(row)) && (!wanted || [row.name, row.nameFr].some(value => normalizeSearchText(value || '').includes(wanted)))).slice(0, 24);
        if (!found.length) { results.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: all.checked ? 'Aucune créature.' : 'Aucune monture dressée : cochez « tout le bestiaire ».' })); return; }
        for (const row of found) {
          const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'ghost tiny form-mount-pick';
          pick.textContent = `${row.nameFr || row.name} (${row.book} p. ${row.page})`;
          pick.addEventListener('click', () => {
            const template = buildReserveProfileFromBestiary(row.id, { library: rows, nameFr: true });
            const profileId = mountSubjectId;
            settle(Store.setProfileMount(profileId, { template, bestiaryId: row.id, name: template.name }), 'Monture').then(() => { text.value = ''; results.textContent = ''; setMountSubject(Store.getProfile(profileId)); showToast(`Monture : ${template.name}`, 'success'); });
          });
          results.append(pick);
        }
      }).catch(error => showToast(contextMessage('Bestiaire indisponible', error, 'réessayez.'), 'error'));
    };
    on(text, 'input', refresh);
    on(all, 'change', refresh);
  }
  function setMountSubject(profile) {
    ensureMountSection();
    if (!mountSection) return;
    mountSubjectId = profile?.id || null;
    const current = mountSection.querySelector('.form-mount-current');
    current.textContent = '';
    const declared = declaredMountOf(profile);
    current.append(Object.assign(document.createElement('span'), { textContent: !mountSubjectId ? 'Enregistrez le profil pour lui donner une monture.' : declared ? `Monture : ${declared.name}` : 'Aucune monture.' }));
    if (declared) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ghost tiny form-mount-remove'; remove.textContent = 'Retirer la monture';
      remove.addEventListener('click', () => { const profileId = mountSubjectId; settle(Store.setProfileMount(profileId, null), 'Monture').then(() => setMountSubject(Store.getProfile(profileId))); });
      current.append(remove);
    }
    mountSection.querySelector('.form-mount-search').disabled = !mountSubjectId;
    mountSection.querySelector('.form-mount-all').disabled = !mountSubjectId;
    mountSection.querySelector('.form-mount-results').textContent = '';
  }

  function ensureArmorSides() {
    const f = DOM.reserve.form;
    if (!f || f.querySelector('[name=armor_rightArm]')) return;
    const labels = { rightArm: 'Bras droit', leftArm: 'Bras gauche', rightLeg: 'Jambe droite', leftLeg: 'Jambe gauche' };
    const section = document.createElement('div'); section.id = 'form-armor-sides'; section.className = 'row';
    for (const [key, label] of Object.entries(labels)) {
      const wrapper = document.createElement('label'); wrapper.textContent = `PA ${label}`;
      const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.name = `armor_${key}`; input.value = '0'; input.style.width = '75px';
      wrapper.append(input); section.append(wrapper);
    }
    for (const family of ['arms', 'legs']) {
      const input = f.querySelector(`[name=armor_${family}]`);
      const label = input?.closest('label'); if (label) label.hidden = true; else if (input) input.hidden = true;
    }
    f.insertBefore(section, f.querySelector('.actions'));
  }

  function lockSourceFields(profile = null) {
    const f = DOM.reserve.form; const linked = Boolean(profile?.extensions?.ficheId);
    const sourceNames = ['initiative', 'hp', 'E', 'CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc', 'armor_head', 'armor_body', 'armor_arms', 'armor_legs', 'armor_rightArm', 'armor_leftArm', 'armor_rightLeg', 'armor_leftLeg'];
    for (const name of sourceNames) { const input = f.querySelector(`[name=${name}]`); if (input) { input.readOnly = linked; input.title = linked ? 'Valeur provenant de la fiche ; actualisez les PJ pour la modifier.' : ''; } }
    let notice = f.querySelector('#fiche-source-notice');
    if (!notice) { notice = document.createElement('div'); notice.id = 'fiche-source-notice'; notice.className = 'muted'; f.prepend(notice); }
    notice.hidden = !linked;
    notice.textContent = linked ? 'Données de jeu liées à la fiche du PJ. Modifiez les caractéristiques, talents, armes et protections dans sa fiche, puis actualisez les PJ. Les notes et actions locales restent éditables ici.' : '';
  }

  function renderReserve() {
    const term = normalizeSearchText(DOM.reserve.search.value || '');
    const all = Store.listProfiles();
    const filtered = all.filter(p =>
      !term || [p.name, p.group, p.kind, p.notes, ...(p.tags || []), ...(p.skills || []).map(row => row.name), ...(p.talents || []).flatMap(row => [row.name, row.specialty]), ...(p.equipment || []).flatMap(item => [item.name, item.category, ...(item.keywords || []).flatMap(word => [word.id, resolveKeyword(word.id)?.name])]), ...((p.diceLines?.length ? p.diceLines : p.actions) || []).flatMap(line => (line.qualities || []).map(q => q.name || q.id))]
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
    if (p.tokenImage) { const image = document.createElement('img'); image.src = p.tokenImage; image.alt = 'Image du pion'; image.style.cssText = 'width:64px;height:64px;border-radius:50%;object-fit:cover;'; left.prepend(image); }
    const btnEdit = document.createElement('button'); btnEdit.textContent = 'Éditer'; btnEdit.classList.add('ghost'); btnEdit.addEventListener('click', () => loadProfileIntoForm(p));
    const btnDup = document.createElement('button'); btnDup.textContent = 'Dupliq.'; btnDup.classList.add('ghost'); btnDup.addEventListener('click', () => Store.duplicateProfile(p.id));
    const btnFav = document.createElement('button'); btnFav.textContent = p.favorite ? '★' : '☆'; btnFav.title = 'Profil favori'; btnFav.classList.add('ghost'); btnFav.addEventListener('click', () => settle(Store.updateProfile(p.id, { favorite: !p.favorite }), 'Favori'));
    const btnDel = document.createElement('button'); btnDel.textContent = 'Suppr'; btnDel.classList.add('danger', 'ghost'); btnDel.addEventListener('click', () => settle(Promise.resolve(Store.removeProfile(p.id)).then(result => settle(Store.log(`Réserve: supprimé ${p.name}`), 'Journal').then(() => result)), 'Suppression'));
    right.append(btnEdit, btnDup, btnFav, btnDel); div.append(left, right);
    if (p.extensions?.ficheId || p.ficheSnapshot || p.equipment?.length || p.talents?.length || p.extensions?.v5?.bestiary?.spells) { const details = renderFicheDetails(p); details.style.width = '100%'; div.append(details); }
    return div;
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

  function addProfileDiceRow(original = {}) {
    const { base = '', mod = 0, type = '', note = '', damage = '', damageFormula = '', qualities = [], valuesX = null, capacity = null } = original;
    const row = document.createElement('div'); row.className = 'row'; row.style.marginBottom = '6px'; row.style.gap = '4px';
    const currentQualities = Array.isArray(qualities) ? qualities : [];
    // Nom accessible court et infobulle d'aide pour chaque case.
    const help = (label, tip) => `aria-label="${escapeHtml(label)}" title="${escapeHtml(tip)}"`;

    row.innerHTML = `<select class="pf-dice-type" ${help('Type du jet', ACTION_FIELD_HELP.type)}><option value="">Type…</option><option value="attack">Attaque</option><option value="skill">Compétence</option><option value="defense">Défense</option><option value="opposition">Opposition</option></select><input type="number" placeholder="Score" value="${base}" class="pf-dice-base" ${help('Score', ACTION_FIELD_HELP.base)} style="width:60px;"><input type="number" placeholder="DR V5" value="${original.extensions?.v5?.slModifier ?? (mod ? '' : 0)}" class="pf-dice-mod" step="1" ${help('Modificateur V5 (DR)', ACTION_FIELD_HELP.mod)} style="width:52px;"><input type="text" placeholder="Nom (ex : Épée)" value="${escapeHtml(note)}" class="pf-dice-note" ${help('Nom du jet', ACTION_FIELD_HELP.note)} style="flex:1;"><input type="text" placeholder="Dég." ${help('Dégâts', ACTION_FIELD_HELP.damage)} value="${escapeHtml(String(damageFormula || (damage !== undefined && damage !== null ? damage : '')))}" class="pf-dice-damage" style="width:64px;"><span class="pf-dice-quality-picker"></span><button type="button" class="danger tiny btn-remove-dice" ${help('Retirer ce jet', ACTION_FIELD_HELP.remove)}>×</button>`;
    row.querySelector('.pf-dice-type').value = type || '';
    // Anciennes cases X et Cap. (le moteur ne s'en sert pas) : plus affichées, leurs valeurs restent enregistrées.
    row._kept = { valuesX, capacity };
    row._original = cloneValue(original);
    if (mod && original.extensions?.v5?.slModifier == null) { const hint = document.createElement('span'); hint.className = 'muted'; hint.textContent = legacyModifierMessage(mod); row.append(hint); row.querySelector('.pf-dice-mod').addEventListener('input', () => { hint.hidden = row.querySelector('.pf-dice-mod').value !== ''; }); }

    const normalized = normalizeAction({ qualities: currentQualities });
    row._qualities = normalized.qualities;
    const picker = createQualityPicker({ container: row.querySelector('.pf-dice-quality-picker'), qualities: row._qualities, onChange: qualities => { row._qualities = qualities; } });
    row._qualityPicker = picker;

    const btnRemoveDice = row.querySelector('.btn-remove-dice');
    btnRemoveDice.addEventListener('click', () => row.remove());
    if (original.extensions?.fiche?.equipmentId) {
      for (const control of row.querySelectorAll('input,select,button')) if (!control.classList.contains('pf-dice-mod')) control.disabled = true;
      const sourceLabel = document.createElement('span'); sourceLabel.className = 'muted'; sourceLabel.textContent = base === '' ? 'Fiche · liaison requise' : 'Fiche'; row.append(sourceLabel);
    } else if (original.extensions?.ficheSkill) row.querySelector('.pf-dice-base').readOnly = true;
    DOM.reserve.form?.querySelector('#form-dice-list')?.appendChild(row);
  }

  function loadProfileIntoForm(p) {
    ensureProfileFields();
    ensureKeywordPicker();
    keywordPicker.setSubject(p);
    imageRevision++; setTokenImage(p.tokenImage);
    if (btnSubmit) btnSubmit.disabled = false;
    setMountSubject(p);
    ensureArmorSides();
    const f = DOM.reserve.form;
    lockSourceFields(p);
    f.querySelector('[name=id]').value = p.id; f.querySelector('[name=name]').value = p.name;
    f.querySelector('[name=kind]').value = p.kind; f.querySelector('[name=initiative]').value = p.initiative; f.querySelector('[name=hp]').value = p.hp;
    f.querySelector('[name=group]').value = p.group || '';
    f.querySelector('[name=cult]').value = p.cult || '';
    syncTokenColorSelect(f.querySelector('[name=tokenColor]'), p.tokenColor);
    f.querySelector('[name=tags]').value = normalizeTags(p.tags).join(', ');
    f.querySelector('[name=notes]').value = p.notes || '';
    f.querySelector('[name=favorite]').checked = Boolean(p.favorite);
    f.querySelector('[name=propagate]').checked = false;
    const armorLocations = normalizeArmorLocations(p.armorLocations ?? p.armor);
    f.querySelector('[name=armor_head]').value = armorLocations.head; f.querySelector('[name=armor_body]').value = armorLocations.body;
    for (const key of ['rightArm', 'leftArm', 'rightLeg', 'leftLeg']) f.querySelector(`[name=armor_${key}]`).value = armorLocations[key];
    f.querySelector('[name=armor_arms]').value = p.armor?.arms || 0; f.querySelector('[name=armor_legs]').value = p.armor?.legs || 0;
    const inputE = f.querySelector('[name=E]'); if (inputE) inputE.value = p.caracs?.E || 0;
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { f.querySelector(`[name=${k}]`).value = p.caracs[k] || ''; });

    ensureDiceSectionExists();
    f.querySelector('#form-dice-list').innerHTML = '';
    (p.diceLines || p.actions || []).forEach(dl => addProfileDiceRow(dl));

    formTitle.textContent = "Modifier le profil"; btnSubmit.textContent = "Modifier"; btnCancel.style.display = 'inline-block'; if (btnCopyJson) btnCopyJson.style.display = 'inline-block';
    f.scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    ensureProfileFields();
    ensureKeywordPicker();
    keywordPicker.setSubject({});
    imageRevision++; setTokenImage(null);
    if (btnSubmit) btnSubmit.disabled = false;
    setMountSubject(null);
    ensureArmorSides();
    lockSourceFields();
    DOM.reserve.form.reset();
    DOM.reserve.form.querySelector('[name=id]').value = '';
    DOM.reserve.form.querySelector('[name=kind]').value = 'Créature';
    DOM.reserve.form.querySelector('[name=group]').value = '';
    DOM.reserve.form.querySelector('[name=tags]').value = '';
    DOM.reserve.form.querySelector('[name=notes]').value = '';
    DOM.reserve.form.querySelector('[name=favorite]').checked = false;
    DOM.reserve.form.querySelector('[name=propagate]').checked = false;
    const diceList = DOM.reserve.form.querySelector('#form-dice-list'); if (diceList) diceList.innerHTML = '';
    formTitle.textContent = "Nouveau profil"; btnSubmit.textContent = "Ajouter"; btnCancel.style.display = 'none'; if (btnCopyJson) btnCopyJson.style.display = 'none';
  }

  on(btnCancel, 'click', resetForm);

  // Le profil enregistré (pas les cases en cours de saisie) au format de « Créer depuis un JSON ».
  on(btnCopyJson, 'click', async () => {
    const profile = Store.getProfile(DOM.reserve.form.querySelector('[name=id]').value);
    if (!profile) return;
    try { await navigator.clipboard.writeText(exportProfilesJson(profile)); showToast('Profil copié en JSON', 'success'); }
    catch (error) { showToast(contextMessage('Copie impossible', error, 'autorisez l’accès au presse-papiers, puis réessayez.'), 'error'); }
  });

  on(DOM.reserve.form, 'submit', async (e) => {
    e.preventDefault(); const submit = btnSubmit; if (submit) submit.disabled = true; const fd = new FormData(DOM.reserve.form);
    const editorToken = DOM.reserve.form.dataset.editorToken || null;
    // Les caractéristiques que le formulaire n'expose pas (M, A, B, BF…) sont conservées.
    const formCaracs = ['E', 'CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];
    const existingCaracs = fd.get('id') ? Store.getProfile(fd.get('id'))?.caracs || {} : {};
    const caracs = Object.fromEntries(Object.entries(existingCaracs).filter(([k]) => !formCaracs.includes(k)));
    caracs['E'] = Number(fd.get('E') || 0);
    ['CC', 'CT', 'F', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].forEach(k => { const raw = fd.get(k); if (raw !== null && raw !== '') { const v = Number(raw); if (Number.isFinite(v)) caracs[k] = v; } });
    const armorLocations = Object.fromEntries(['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'].map(key => [key, Number(fd.get(`armor_${key}`) || 0)]));
    const armor = { head: armorLocations.head, body: armorLocations.body, arms: armorLocations.rightArm, legs: armorLocations.rightLeg };

    const diceLines = [];
    const diceList = DOM.reserve.form.querySelector('#form-dice-list');
    if (diceList) {
      diceList.querySelectorAll('.row').forEach(row => {
        const b = row.querySelector('.pf-dice-base').value;
        const n = row.querySelector('.pf-dice-note').value;
        // `BF+4` garde son texte ; un nombre reste un nombre.
        const { damage, damageFormula } = normalizeDamageFields({ damage: row.querySelector('.pf-dice-damage')?.value ?? '' });
        if (b || row._original?.id || row._original?.extensions?.fiche) {
          const rawModifier = row.querySelector('.pf-dice-mod')?.value ?? '';
          const v5 = { ...(row._original?.extensions?.v5 || {}) }; delete v5.slModifier;
          if (rawModifier !== '') v5.slModifier = Number(rawModifier);
          diceLines.push({
            ...cloneValue(row._original || {}),
            extensions: { ...(row._original?.extensions || {}), v5 },
            base: b === '' ? '' : parseInt(b),
            mod: rawModifier !== '' ? 0 : row._original?.mod || 0,
            type: row.querySelector('.pf-dice-type')?.value || '',
            note: n,
            damage,
            damageFormula: damageFormula || null,
            qualities: row._qualities || [],
            valuesX: row._kept?.valuesX ?? null,
            capacity: row._kept?.capacity ?? null
          });
        }
      });
    }

    const id = fd.get('id');
    const data = { name: fd.get('name'), kind: fd.get('kind'), initiative: Number(fd.get('initiative') || 0), hp: Number(fd.get('hp') || 0), group: (fd.get('group') || '').trim(), cult: String(fd.get('cult') || '').trim(), tags: normalizeTags(fd.get('tags')), notes: String(fd.get('notes') || ''), favorite: fd.get('favorite') === 'on', caracs, armor, armorLocations, diceLines };
    data.tokenImage = tokenImage;
    const rawColor = String(fd.get('tokenColor') || '').trim();
    data.tokenColor = normalizeTokenColor(rawColor) ?? null;
    if (rawColor && !data.tokenColor) { showToast('Couleur du pion : teinte non reconnue.', 'error'); if (submit) submit.disabled = false; return; }
    const existing = id ? Store.getProfile(id) : null;
    const cults = (existing?.talents || []).filter(row => ['talent-bless', 'talent-invoke'].includes(row.id)).map(row => row.specialization || row.specialty).filter(Boolean);
    if (data.cult && cults.length && !cults.some(cult => normalizeSearchText(cult) === normalizeSearchText(data.cult))) {
      // Signalé sans bloquer : le MJ garde la main sur la fiche, comme à l'import.
      showToast(`Culte différent des talents de culte : ${cults.join(', ')}.`, 'warning');
    }
    if (!data.cult && !existing?.cult) delete data.cult;
    const picked = keywordPicker?.getValue() || { keywords: [], keywordExclusions: [] };
    if (picked.keywords.length || picked.keywordExclusions.length || existing?.keywords || existing?.keywordExclusions) Object.assign(data, picked);
    if (existing?.extensions?.ficheId) {
      for (const key of ['caracs', 'initiative', 'hp', 'maxHp', 'armor', 'armorLocations']) data[key] = cloneValue(existing[key]);
      data.diceLines = data.diceLines.flatMap(action => {
        const live = existing.diceLines.find(row => row.id === action.id);
        if (live?.extensions?.fiche?.equipmentId) return [preserveEditedV5Modifier(cloneValue(live), action)];
        if (action.extensions?.fiche?.equipmentId) return [];
        return [live?.extensions?.ficheSkill ? preserveEditedV5Modifier({ ...action, base: live.base, extensions: { ...action.extensions, ...cloneValue(live.extensions) } }, action) : action];
      });
      for (const live of existing.diceLines) if (live.extensions?.fiche?.equipmentId && !data.diceLines.some(action => action.id === live.id)) data.diceLines.push(cloneValue(live));
    } else data.maxHp = data.hp;
    try {
      const propagate = id && fd.get('propagate') === 'on';
      // The Store owns the profile/participant transaction. This keeps the
      // opt-in propagation atomic and preserves current PV, states and targets.
      const result = id ? Store.updateProfile(id, data, { propagate, expectedLocalRevision: Store.getLocalRevision() }) : Store.addProfile(new Profile(data));
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
    } catch (error) { showToast(contextMessage('Profil non enregistré', error, 'vérifiez le nom et les PV, puis réessayez.'), 'error'); }
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
