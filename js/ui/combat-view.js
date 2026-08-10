import { DOM, escapeHtml } from './dom.js';

export function initCombatViewUI(Store, Combat, cardUI, onRunDiceLine) {
  function renderCombat() {
    const combat = Store.getCombat();
    if (DOM.combat.pillRound) DOM.combat.pillRound.textContent = `Round: ${combat.round}`;
    if (DOM.combat.pillTurn) DOM.combat.pillTurn.textContent = `Tour: ${Combat.actorAtTurn()?.name ?? '–'}`;

    DOM.combat.initTracker.innerHTML = '';
    let activeParticipants = Store.listParticipants().filter(p => p.zone === 'active');
    activeParticipants = [...activeParticipants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));

    if (activeParticipants.length === 0) {
      DOM.combat.initTracker.innerHTML = '<span class="muted">Aucun combattant actif...</span>';
    } else {
      activeParticipants.forEach(p => {
        const el = document.createElement('div');
        el.className = 'init-token';
        if (p.color && p.color !== 'default') el.classList.add('color-' + p.color);
        if (Combat.actorAtTurn()?.id === p.id) el.classList.add('current');
        el.innerHTML = `<strong>${escapeHtml(p.name)}</strong><small>${p.initiative}</small>`;
        DOM.combat.initTracker.appendChild(el);
      });
    }

    DOM.combat.zoneActive.innerHTML = '';
    DOM.combat.zoneBench.innerHTML = '';

    let activeCount = 0;

    Store.listParticipants().forEach(p => {
      try {
        const card = cardUI.renderParticipantCard(p);
        if (p.zone === 'active') { DOM.combat.zoneActive.appendChild(card); activeCount++; }
        else DOM.combat.zoneBench.appendChild(card);
      } catch (err) { console.error("Erreur carte:", p.name, err); }
    });

    if (activeCount === 0) DOM.combat.zoneActive.innerHTML = '<div class="placeholder">Glissez les combattants actifs ici...</div>';
  }

  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('drag-over'); }
  function handleDragLeave(e) { this.classList.remove('drag-over'); }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.actor-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function handleDrop(e) {
    e.preventDefault(); this.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain'); if (!id) return;
    const container = this; const targetZone = container.dataset.zone;
    const afterElement = getDragAfterElement(container, e.clientY);
    const beforeId = afterElement ? afterElement.dataset.id : null;
    Store.moveParticipant(id, targetZone, beforeId);
  }

  [DOM.combat.zoneActive, DOM.combat.zoneBench].forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
    zone.addEventListener('click', (e) => cardUI.handleZoneClick(e, onRunDiceLine));
    zone.addEventListener('keydown', cardUI.handleZoneKeyDown);
    zone.addEventListener('mouseleave', cardUI.handleZoneMouseOver);
  });

  return { renderCombat };
}
