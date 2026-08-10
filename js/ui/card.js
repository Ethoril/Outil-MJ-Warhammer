import { DOM, escapeHtml } from './dom.js';
import { makeStateBadge, parseState } from '../core/sanitize.js';
import { DiceLine } from '../core/models.js';
import { renderMiniDiceLine } from './dice-line.js';

export function initCardUI(Store, Combat) {
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
    Store.updateParticipant(id, { hp: newHp });
    Store.log(`⚔️ ${p.name} : ${oldHp} → ${newHp} PV (${signStr})`);

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
            Store.updateParticipant(p.id, { hp: newHp });
            Store.log(`⚔️ ${p.name} : ${oldHp} → ${newHp} PV (${signStr})`);
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
        changes.states.forEach(s => statesDiv.append(makeStateBadge(s)));
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
    p.states.forEach(s => statesDiv.append(makeStateBadge(s)));

    const armDiv = div.querySelector('.actor-armor');
    const BE = Math.floor((p.caracs?.E || 0) / 10);
    let armText = `<span style="font-weight:bold; color:#5a1d1d;">🛡️ BE ${BE}</span>`;
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
      const encoded = turns ? `${name}|${turns}` : name;
      if (!p.states.some(s => parseState(s).name === name)) {
        Store.updateParticipant(id, { states: [...p.states, encoded] });
        if (turnsInput) turnsInput.value = '';
      }
      if (sel) sel.value = '';
      return;
    }

    if (e.target.matches('.state-badge')) {
      const raw = e.target.dataset.raw;
      Store.updateParticipant(id, { states: p.states.filter(s => s !== raw) });
      return;
    }

    if (e.target.matches('.btn-remove')) {
      e.preventDefault();
      Store.removeParticipant(id);
      Store.log(`Combat: retiré ${p.name}`);
      return;
    }

    if (e.target.matches('.btn-color')) {
      e.preventDefault();
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.toggle('hidden');
      return;
    }

    if (e.target.matches('.color-swatch')) {
      e.preventDefault();
      const c = e.target.dataset.c;
      Store.updateParticipant(id, { color: c });
      const palette = card.querySelector('.color-palette');
      if (palette) palette.classList.add('hidden');
      return;
    }

    if (e.target.matches('.init-badge')) {
      const v = prompt('Nouvelle Initiative ?', p.initiative);
      if (v !== null && !isNaN(v)) Store.updateParticipant(id, { initiative: Number(v) });
      return;
    }

    if (e.target.matches('.btn-add-dice')) {
      e.preventDefault();
      Store.addDiceLine(new DiceLine({ participantId: id }));
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
        if (diceId) Store.removeDiceLine(diceId);
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
