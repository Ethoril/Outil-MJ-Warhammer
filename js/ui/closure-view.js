import { exportArchive, previewClosure } from '../core/closure.js';

/** E13 review view: selection is explicit and all writes are delegated. */
export function initClosureView({ mount, scene = null, persistentCharacters = [], callbacks = {} } = {}) {
  if (!mount || typeof mount.replaceChildren !== 'function') throw new TypeError('closure-view nécessite un mount');
  let currentScene = scene;
  let lastPreview = null;
  let error = '';
  const authorities = new Map();
  const selections = new Map();

  function render() {
    mount.replaceChildren();
    const root = document.createElement('section'); root.className = 'closure-view'; root.setAttribute('aria-label', 'Clôturer la séance');
    const title = document.createElement('h2'); title.textContent = `Bilan — ${currentScene?.title || 'Séance'}`; root.appendChild(title);
    if (error) { const alert = document.createElement('p'); alert.className = 'error'; alert.setAttribute('role', 'alert'); alert.textContent = error; root.appendChild(alert); }
    const list = document.createElement('div'); list.className = 'closure-participants';
    const selected = selections;
    (currentScene?.participants || []).forEach(participant => {
      const row = document.createElement('label'); row.style.display = 'block';
      const hasSelection = selected.has(participant.id);
      const selectedCharacterId = hasSelection ? selected.get(participant.id) : (participant.persistentCharacterId || null);
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = Boolean(selectedCharacterId); check.dataset.participantId = participant.id;
      const select = document.createElement('select'); select.setAttribute('aria-label', `Personnage persistant pour ${participant.name}`); select.append(new Option('Ne pas reporter', ''));
      persistentCharacters.forEach(character => select.append(new Option(character.name || character.id, character.id)));
      select.value = selectedCharacterId || '';
      const refresh = () => { if (check.checked && select.value) selected.set(participant.id, select.value); else selected.set(participant.id, null); };
      check.addEventListener('change', () => { lastPreview = null; refresh(); });
      select.addEventListener('change', () => { lastPreview = null; check.checked = Boolean(select.value); refresh(); });
      row.append(check, ` ${participant.name} — PV ${participant.hp}`, document.createTextNode(' → '), select); list.appendChild(row); refresh();
    });
    root.appendChild(list);
    const duplicateGroups = new Map();
    for (const [participantId, characterId] of selected) {
      if (!duplicateGroups.has(characterId)) duplicateGroups.set(characterId, []);
      duplicateGroups.get(characterId).push(participantId);
    }
    for (const [characterId, participantIds] of duplicateGroups) {
      if (participantIds.length < 2) continue;
      const character = persistentCharacters.find(item => item.id === characterId);
      const authorityLabel = document.createElement('label');
      authorityLabel.textContent = `Autorité pour ${character?.name || characterId}`;
      const authority = document.createElement('select');
      authority.setAttribute('aria-label', `Autorité pour ${character?.name || characterId}`);
      participantIds.forEach(participantId => {
        const participant = (currentScene?.participants || []).find(item => item.id === participantId);
        authority.append(new Option(participant?.name || participantId, participantId));
      });
      const saved = authorities.get(characterId);
      authority.value = participantIds.includes(saved) ? saved : participantIds[0];
      authorities.set(characterId, authority.value);
      authority.addEventListener('change', () => { authorities.set(characterId, authority.value); lastPreview = null; });
      authorityLabel.append(' ', authority);
      root.appendChild(authorityLabel);
    }
    const actions = document.createElement('div'); actions.className = 'actions';
    const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.textContent = 'Prévisualiser le report';
    previewButton.addEventListener('click', () => { try { lastPreview = previewClosure(currentScene, { persistentCharacters, selections: Object.fromEntries(selected), authorities: Object.fromEntries(authorities) }); error = ''; callbacks.onPreview?.(lastPreview); render(); } catch (cause) { error = cause.message; render(); } });
    actions.appendChild(previewButton);
    const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = 'Clôturer et archiver';
    apply.disabled = typeof callbacks.onApply !== 'function';
    if (apply.disabled) apply.title = 'Action indisponible';
    apply.addEventListener('click', async () => {
      if (!lastPreview) { error = 'Prévisualisez le report avant de clôturer.'; render(); return; }
      if (typeof callbacks.onApply !== 'function') return;
      apply.disabled = true;
      try { await callbacks.onApply(lastPreview, { selections: Object.fromEntries(selections), authorities: Object.fromEntries(authorities) }); }
      catch (cause) { error = cause?.message || String(cause); apply.disabled = false; render(); }
    });
    actions.appendChild(apply);
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'ghost'; cancel.textContent = 'Annuler'; cancel.addEventListener('click', () => callbacks.onCancel?.()); actions.appendChild(cancel);
    if (lastPreview) {
      const report = document.createElement('pre'); report.className = 'closure-preview'; report.textContent = JSON.stringify(lastPreview, null, 2); root.appendChild(report);
      const markdown = document.createElement('button'); markdown.type = 'button'; markdown.textContent = 'Exporter Markdown'; markdown.addEventListener('click', () => callbacks.onExport?.(exportArchive({ ...lastPreview, title: currentScene?.title }, 'markdown'))); actions.appendChild(markdown);
      const json = document.createElement('button'); json.type = 'button'; json.textContent = 'Exporter JSON'; json.addEventListener('click', () => callbacks.onExport?.(exportArchive({ ...lastPreview, title: currentScene?.title }, 'json'))); actions.appendChild(json);
    }
    root.appendChild(actions); mount.appendChild(root);
  }

  return { render, setScene(next) { currentScene = next; selections.clear(); authorities.clear(); lastPreview = null; error = ''; render(); }, getPreview: () => lastPreview, getOptions: () => ({ selections: Object.fromEntries(selections), authorities: Object.fromEntries(authorities) }) };
}
