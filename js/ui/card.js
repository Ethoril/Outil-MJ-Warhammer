import { DOM, escapeHtml } from './dom.js';
import { makeStateBadge } from '../core/sanitize.js';
import { normalizeEffects, normalizeState } from '../core/effects.js';
import { DiceLine } from '../core/models.js';
import { renderMiniDiceLine } from './dice-line.js';
import { showToast } from './toast.js';

export function initCardUI(Store, Combat) {
  const observe = (result, label = 'Modification') => Promise.resolve(result).then(value => { if (value === false || value?.ok === false) throw value?.error || new Error(`${label} impossible.`); return value; }).catch(error => showToast(`${label} impossible : ${error.message}`, 'error'));
  function getP(id) {
    return Store.getCombat().participants.get(id);
  }

  function updateHpBadgeElement(el, hp, maxHp) {
    if (!el) return;
    el.textContent = (maxHp !== undefined && maxHp !== null) ? `PV ${hp} / ${maxHp}` : `PV ${hp}`;
    el.classList.remove('low', 'down');
    if (hp <= 0) {
      el.classList.add('down');
    } else if (maxHp && hp <= maxHp / 4) {
      el.classList.add('low');
    }
  }

  function appendStateEditor(statesDiv, rawState, index, participantId) {
    const state = normalizeState(rawState, index);
    const row = document.createElement('span');
    row.className = 'state-editor';
    row.style.cssText = 'display:inline-flex; align-items:center; gap:2px;';
    row.append(makeStateBadge(state, index));

    const field = (name, value, title, min, max) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = `state-${name}`;
      input.min = String(min);
      input.max = String(max);
      input.value = value === null ? '' : String(value);
      input.placeholder = name === 'level' ? 'Niv.' : '∞';
      input.title = title;
      input.setAttribute('aria-label', title);
      input.style.cssText = 'width:34px; padding:1px 2px; font-size:0.75em;';
      input.addEventListener('change', () => {
        const participant = getP(participantId);
        if (!participant) return;
        const parsed = input.value.trim() === '' ? null : parseInt(input.value, 10);
        const nextValue = name === 'level'
          ? (Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
          : (Number.isFinite(parsed) && parsed > 0 ? parsed : null);
        const nextStates = participant.states.map((entry, entryIndex) => {
          const current = normalizeState(entry, entryIndex);
          return current.id === state.id ? { ...current, [name === 'level' ? 'level' : 'duration']: nextValue } : entry;
        });
        observe(Store.updateParticipant(participantId, { states: normalizeEffects(nextStates) }), 'État');
      });
      return input;
    };

    row.append(field('level', state.level, 'Niveau de l’état', 1, 99));
    row.append(field('duration', state.duration, 'Durée restante (tours)', 1, 99));
    statesDiv.append(row);
  }

  // Les gestes qui modifient une valeur et écrivent une trace forment une
  // seule commande.  Cela évite un journal orphelin si la transaction IDB de
  // la valeur est refusée, et conserve la façade Store historique en secours.
  function commitParticipantChange(id, patch, logEntry = null, type = 'participant-update') {
    if (typeof Store.executeCommand !== 'function') {
      const result = Store.updateParticipant(id, patch);
      if (logEntry) Store.log(logEntry);
      return observe(result, type);
    }
    const result = Store.executeCommand(type, draft => ({
      ...draft,
      combat: {
        ...draft.combat,
        participants: (draft.combat?.participants || []).map(participant => participant.id === id
          ? { ...participant, ...JSON.parse(JSON.stringify(patch)) }
          : participant)
      },
      ...(logEntry ? { log: [JSON.parse(JSON.stringify(logEntry)), ...(draft.log || [])].slice(0, 300) } : {})
    }));
    return observe(result, type);
  }

  function applyHPDelta(id, deltaVal, isAddition, inputEl) {
    const p = getP(id);
    if (!p) return;

    let amount = Math.abs(parseInt(deltaVal));
    if (isNaN(amount) || amount === 0) {
      amount = 1;
    }

    const change = isAddition ? amount : -amount;
    let newHp = p.hp + change;

    if (p.maxHp !== undefined && p.maxHp !== null && newHp > p.maxHp) {
      newHp = p.maxHp;
    }

    const oldHp = p.hp;
    const actualDelta = newHp - oldHp;
    if (actualDelta === 0) {
      if (inputEl) { inputEl.value = ''; inputEl.focus(); }
      return;
    }

    const signStr = actualDelta > 0 ? `+${actualDelta}` : `${actualDelta}`;
    commitParticipantChange(id, { hp: newHp }, { kind: 'damage', actorId: id, actorName: p.name, text: `⚔️ ${p.name} : ${oldHp} → ${newHp} PV (${signStr})` }, 'adjust-hp');

    if (inputEl) {
      inputEl.value = '';
      inputEl.focus();
    }
  }

  function startInlineHPEdit(badgeEl, p) {
    if (badgeEl.querySelector('input')) return;
    badgeEl.textContent = '';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'hp-inline-input';
    input.value = p.hp;
    input.style.width = '60px';
    input.style.fontSize = '0.85em';
    input.style.padding = '1px 3px';
    badgeEl.appendChild(input);
    input.focus();
    input.select();

    let settled = false;

    function commit() {
      if (settled) return;
      settled = true;
      const raw = input.value.trim();
      if (raw !== '') {
        const val = parseInt(raw);
        if (!isNaN(val)) {
          let newHp = val;
          if (p.maxHp !== undefined && p.maxHp !== null && newHp > p.maxHp) {
            newHp = p.maxHp;
          }
          if (newHp !== p.hp) {
            const oldHp = p.hp;
            const delta = newHp - oldHp;
            const signStr = delta > 0 ? `+${delta}` : `${delta}`;
            commitParticipantChange(p.id, { hp: newHp }, { kind: 'damage', actorId: p.id, actorName: p.name, text: `⚔️ ${p.name} : ${oldHp} → ${newHp} PV (${signStr})` }, 'set-hp');
            return;
          }
        }
      }
      updateHpBadgeElement(badgeEl, p.hp, p.maxHp);
    }

    function cancel() {
      if (settled) return;
      settled = true;
      updateHpBadgeElement(badgeEl, p.hp, p.maxHp);
    }

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        commit();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        cancel();
      }
    });

    input.addEventListener('blur', () => {
      commit();
    });
  }

  function updateCardUI(id, changes) {
    const card = document.querySelector(`.actor-card[data-id="${id}"]`);
    if (!card) return false;

    if ('hp' in changes || 'maxHp' in changes) {
      const p = getP(id);
      const hp = 'hp' in changes ? changes.hp : p?.hp;
      const maxHp = 'maxHp' in changes ? changes.maxHp : p?.maxHp;
      const hpBadge = card.querySelector('.hp-badge');
      if (hpBadge) updateHpBadgeElement(hpBadge, hp, maxHp);
    }
    if ('initiative' in changes) {
      const initBadge = card.querySelector('.init-badge');
      if (initBadge) initBadge.textContent = `Init ${changes.initiative}`;
    }
    if ('states' in changes) {
      const statesDiv = card.querySelector('.states');
      if (statesDiv) {
        statesDiv.innerHTML = '';
        changes.states.forEach((s, index) => appendStateEditor(statesDiv, s, index, id));
      }
    }
    if ('color' in changes) {
      card.className = card.className.replace(/\bcolor-\w+/g, '').trim();
      card.classList.add('actor-card');
      if (changes.color && changes.color !== 'default') {
        card.classList.add('color-' + changes.color);
      }
    }
    return true;
  }

  function renderParticipantCard(p) {
    const div = DOM.tplActor.content.cloneNode(true).firstElementChild;
    div.dataset.id = p.id;
    if (Combat.actorAtTurn()?.id === p.id) div.classList.add('turn');

    if (p.color && p.color !== 'default') div.classList.add('color-' + p.color);

    div.querySelector('.name').textContent = p.name;
    div.querySelector('.init-badge').textContent = `Init ${p.initiative}`;
    const hpBadge = div.querySelector('.hp-badge');
    updateHpBadgeElement(hpBadge, p.hp, p.maxHp);

    const statesDiv = div.querySelector('.states');
    p.states.forEach((s, index) => appendStateEditor(statesDiv, s, index, p.id));

    const turnsInput = div.querySelector('.state-turns');
    if (turnsInput && !div.querySelector('.state-add-level')) {
      const levelInput = document.createElement('input');
      levelInput.type = 'number';
      levelInput.className = 'state-add-level';
      levelInput.min = '1';
      levelInput.max = '99';
      levelInput.value = '1';
      levelInput.placeholder = 'Niv.';
      levelInput.title = 'Niveau de l’état';
      levelInput.style.cssText = 'width:40px; padding:2px 3px;';
      turnsInput.parentNode.insertBefore(levelInput, turnsInput);
    }

    const armDiv = div.querySelector('.actor-armor');
    const BE = Math.floor((p.caracs?.E || 0) / 10);
    let armText = `<span style="font-weight:bold; color:var(--heading-color);">🛡️ BE ${BE}</span>`;
    if (p.armor && (p.armor.head || p.armor.body || p.armor.arms || p.armor.legs)) {
      armText += ` | T${p.armor.head} C${p.armor.body} B${p.armor.arms} J${p.armor.legs}`;
    }
    armDiv.innerHTML = armText;

    const diceContainer = div.querySelector('.dice-list');
    const myDice = Store.getDiceLines().filter(dl => dl.participantId === p.id);
    myDice.forEach(dl => { const lineEl = renderMiniDiceLine(dl, p, Store); diceContainer.appendChild(lineEl); });

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move';
      div.classList.add('dragging'); setTimeout(() => div.style.opacity = '0.5', 0);
    });
    div.addEventListener('dragend', () => { div.classList.remove('dragging'); div.style.opacity = '1'; });

    return div;
  }

  function handleZoneClick(e, onRunDiceLine) {
    const card = e.target.closest('.actor-card');
    if (!card) return;

    const id = card.dataset.id;
    const p = getP(id);
    if (!p) return;

    if (e.target.matches('input, select, button')) {
      e.stopPropagation();
    }

    if (e.target.matches('.btn-hp-minus')) {
      e.preventDefault();
      const deltaInput = card.querySelector('.hp-delta');
      applyHPDelta(id, deltaInput?.value, false, deltaInput);
      return;
    }
    if (e.target.matches('.btn-hp-plus')) {
      e.preventDefault();
      const deltaInput = card.querySelector('.hp-delta');
      applyHPDelta(id, deltaInput?.value, true, deltaInput);
      return;
    }

    if (e.target.matches('.hp-badge')) {
      e.preventDefault();
      startInlineHPEdit(e.target, p);
      return;
    }

    if (e.target.matches('.btn-add-state')) {
      e.preventDefault();
      const sel = card.querySelector('.state-select');
      const name = sel?.value; if (!name) return;
      const turnsInput = card.querySelector('.state-turns');
      const turns = turnsInput ? parseInt(turnsInput.value) || null : null;
      const levelInput = card.querySelector('.state-add-level');
      const level = levelInput ? Math.max(1, parseInt(levelInput.value, 10) || 1) : 1;
      const state = normalizeState({ name, level, duration: turns, source: { kind: 'manual' } }, p.states.length);
      observe(Store.updateParticipant(id, { states: normalizeEffects([...p.states, state]) }), 'État');
      if (turnsInput) turnsInput.value = '';
      if (levelInput) levelInput.value = '1';
      if (sel) sel.value = '';
      return;
    }

    if (e.target.matches('.state-badge')) {
      const stateId = e.target.dataset.stateId;
      const nextStates = p.states.filter((state, index) => normalizeState(state, index).id !== stateId);
      observe(Store.updateParticipant(id, { states: normalizeEffects(nextStates) }), 'État');
      return;
    }

    if (e.target.matches('.btn-remove')) {
      e.preventDefault();
      observe(Store.removeParticipant(id), 'Retrait');
      if (typeof Store.executeCommand !== 'function') {
        Store.log({ kind: 'management', actorId: id, actorName: p.name, text: `Combat: retiré ${p.name}` });
      }
      return;
    }

    if (e.target.matches('.btn-color')) {
      e.preventDefault();
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.toggle('hidden');
      return;
    }

    const colorOption = e.target.closest('.color-option');
    if (colorOption) {
      e.preventDefault();
      const c = colorOption.dataset.c;
      if (!c) return;
      observe(Store.updateParticipant(id, { color: c }), 'Couleur');
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.add('hidden');
      return;
    }

  function startInlineInitEdit(badgeEl, p) {
    if (badgeEl.querySelector('input')) return;
    badgeEl.textContent = '';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'hp-inline-input';
    input.value = p.initiative;
    input.style.width = '50px';
    input.style.fontSize = '0.85em';
    input.style.padding = '1px 3px';
    badgeEl.appendChild(input);
    input.focus();
    input.select();

    let settled = false;

    function commit() {
      if (settled) return;
      settled = true;
      const raw = input.value.trim();
      if (raw !== '') {
        const val = parseInt(raw);
        if (!isNaN(val) && val !== p.initiative) {
          commitParticipantChange(p.id, { initiative: val }, { kind: 'management', actorId: p.id, actorName: p.name, text: `⚔️ ${p.name} : Initiative modifiée à ${val}` }, 'set-initiative');
          if (typeof Store.executeCommand !== 'function') Store.rebuildOrder();
          return;
        }
      }
      badgeEl.textContent = `Init ${p.initiative}`;
    }

    function cancel() {
      if (settled) return;
      settled = true;
      badgeEl.textContent = `Init ${p.initiative}`;
    }

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        commit();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        cancel();
      }
    });

    input.addEventListener('blur', () => {
      commit();
    });
  }

    if (e.target.matches('.init-badge')) {
      e.preventDefault();
      startInlineInitEdit(e.target, p);
      return;
    }

    if (e.target.matches('.btn-add-dice')) {
      e.preventDefault();
      observe(Store.addDiceLine(new DiceLine({ participantId: id })), 'Ajout du jet');
      return;
    }

    // A-12 : boutons identifiés par classe dédiée .btn-roll et .btn-del-dice
    if (e.target.matches('.btn-roll')) {
      const diceRow = e.target.closest('.mini-dice-line');
      if (diceRow) {
        const diceId = diceRow.dataset.diceId;
        if (diceId && onRunDiceLine) onRunDiceLine(diceId);
      }
      return;
    }

    if (e.target.matches('.btn-del-dice')) {
      const diceRow = e.target.closest('.mini-dice-line');
      if (diceRow) {
        const diceId = diceRow.dataset.diceId;
        if (diceId) observe(Store.removeDiceLine(diceId), 'Suppression du jet');
      }
      return;
    }
  }

  function handleZoneKeyDown(e) {
    if (e.target.matches('.hp-delta') && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const card = e.target.closest('.actor-card');
      if (!card) return;
      const id = card.dataset.id;
      applyHPDelta(id, e.target.value, false, e.target);
    }
  }

  function handleZoneMouseOver(e) {
    const card = e.target.closest('.actor-card');
    if (!card) {
      document.querySelectorAll('.color-palette:not(.hidden)').forEach(p => p.classList.add('hidden'));
    }
  }

  return {
    renderParticipantCard,
    updateCardUI,
    handleZoneClick,
    handleZoneKeyDown,
    handleZoneMouseOver
  };
}
