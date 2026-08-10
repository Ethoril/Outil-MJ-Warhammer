import { APP_VERSION } from './version.js';
import { Bus } from './ui/bus.js';
import { DOM, qs, on } from './ui/dom.js';
import { createStore } from './core/store.js';
import { initFirebaseSync } from './core/sync.js';
import { createCombatEngine } from './core/combat.js';
import { d100 } from './core/dice.js';
import { initReserveUI } from './ui/reserve.js';
import { initImportModalUI } from './ui/import-modal.js';
import { initCardUI } from './ui/card.js';
import { initCombatViewUI } from './ui/combat-view.js';
import { runDiceLine } from './ui/dice-line.js';
import { renderReferenceTables } from './ui/rules-view.js';
import { renderLog, initLogViewUI } from './ui/log-view.js';
import { showToast } from './ui/toast.js';
import { initKeyboardShortcuts } from './ui/keyboard.js';

// Init Store & Engine
export const Store = createStore({
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
  sync: null, // Sera injecté lors de la connexion Firebase
  bus: Bus
});

initFirebaseSync((syncHandle) => Store.attachSync(syncHandle));

export const Combat = createCombatEngine(Store);

// Version (Lot 10.6 : v3.5 court dans le bouton, titre complet au survol)
if (DOM.btnVersion) {
  DOM.btnVersion.textContent = `v${APP_VERSION}`;
  DOM.btnVersion.title = `Version ${APP_VERSION} - WFRP 4e Outil MJ`;
  DOM.btnVersion.addEventListener('click', () => {
    Store.log(`ℹ️ Application en version ${APP_VERSION}`);
    showToast(`Version ${APP_VERSION} active`, 'info');
  });
}

// Navigation par onglets
function switchTab(tabName) {
  DOM.tabs.forEach(x => {
    const active = x.dataset.tab === tabName;
    x.classList.toggle('is-active', active);
    x.setAttribute('aria-selected', active);
  });
  Object.entries(DOM.panels).forEach(([key, panel]) => {
    if (panel) panel.classList.toggle('is-active', key === tabName);
  });
}

DOM.tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// Init Sub-modules UI
const reserveUI = initReserveUI(Store);
const importModalUI = initImportModalUI(Store);
const cardUI = initCardUI(Store, Combat);
const combatViewUI = initCombatViewUI(Store, Combat, cardUI, (id) => runDiceLine(id, Store));

initLogViewUI(Store);
initKeyboardShortcuts(Store, Combat, switchTab);

// Boutons de combat globaux
on(DOM.combat.btnImport, 'click', () => {
  const fi = qs('#import-filter'); if (fi) fi.value = '';
  importModalUI.renderImportModal();
  DOM.importModal.dialog.showModal();
});
on(qs('#import-filter'), 'input', () => importModalUI.renderImportModal());
on(DOM.importModal.confirm, 'click', (e) => {
  e.preventDefault();
  const ids = Array.from(DOM.importModal.list.querySelectorAll('input[type=checkbox]:checked')).map(ch => ch.value);
  Store.importFromReserve(ids);
  DOM.importModal.dialog.close();
  showToast(`${ids.length} profil(s) importé(s) en combat`, 'success');
});
on(DOM.combat.btnExport, 'click', () => {
  if (confirm('Appliquer PV aux profils correspondants ?')) {
    Store.exportToReserve();
    showToast('Profils de la réserve mis à jour', 'success');
  }
});
on(DOM.combat.btnSaveFile, 'click', () => {
  const json = Store.getFullJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wfrp-save-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Fichier de sauvegarde téléchargé', 'success');
});
on(DOM.combat.btnLoadFile, 'click', () => { if (DOM.combat.fileInput) DOM.combat.fileInput.click(); });
on(DOM.combat.fileInput, 'change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      Store.loadFromJSON(ev.target.result);
      showToast('📂 Sauvegarde chargée avec succès', 'success', { label: 'Annuler', onClick: () => Store.undo() });
    } catch (err) {
      showToast('Erreur de chargement: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
on(DOM.combat.btnStart, 'click', () => Combat.start());
on(DOM.combat.btnNextTurn, 'click', () => Combat.nextTurn());
on(DOM.combat.btnReset, 'click', () => { DOM.combat.results.replaceChildren(); });
if (DOM.combat.btnEndCombat) {
  on(DOM.combat.btnEndCombat, 'click', () => {
    if (confirm('Retirer tous les combattants et remettre le round à zéro ?')) {
      Store.resetCombat();
      showToast('Combat réinitialisé', 'warning', { label: 'Annuler', onClick: () => Store.undo() });
    }
  });
}
on(DOM.combat.btnD100, 'click', () => {
  const roll = d100();
  Store.log({ kind: 'roll', text: `🎲 Jet de d100 simple → ${roll}`, detail: { Jet: roll } });
  showToast(`🎲 d100 = ${roll}`, 'info');
});

// Abonnements Bus
Bus.on('reserve', reserveUI.renderReserve);
Bus.on('combat', combatViewUI.renderCombat);
Bus.on('combat:update', ({ id, patch }) => {
  if (!cardUI.updateCardUI(id, patch)) {
    combatViewUI.renderCombat();
  }
});
Bus.on('log', () => renderLog(Store));

// Rendu initial
reserveUI.renderReserve();
combatViewUI.renderCombat();
renderReferenceTables();
renderLog(Store);
