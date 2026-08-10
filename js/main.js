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
import { renderLog } from './ui/log-view.js';

// Init Store & Engine
export const Store = createStore({
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
  sync: null, // Sera injecté lors de la connexion Firebase
  bus: Bus
});

// Le Store démarre sans synchro : l'authentification n'est pas encore résolue.
// Le handle lui est attaché dès la connexion, ce qui enregistre le listener onValue
// et repousse l'état local vers Firebase.
initFirebaseSync((syncHandle) => Store.attachSync(syncHandle));

export const Combat = createCombatEngine(Store);

// Version (Lot 6.3 : journal au clic, plus d'alert)
if (DOM.btnVersion) {
  DOM.btnVersion.textContent = `Version: ${APP_VERSION}`;
  DOM.btnVersion.addEventListener('click', () => {
    Store.log(`ℹ️ Application en version ${APP_VERSION}`);
  });
}

// Navigation par onglets
DOM.tabs.forEach(t => t.addEventListener('click', () => {
  DOM.tabs.forEach(x => x.classList.remove('is-active')); t.classList.add('is-active');
  Object.values(DOM.panels).forEach(p => p.classList.remove('is-active'));
  const targetPanel = DOM.panels[t.dataset.tab];
  if (targetPanel) targetPanel.classList.add('is-active');
}));

// Init Sub-modules UI
const reserveUI = initReserveUI(Store);
const importModalUI = initImportModalUI(Store);
const cardUI = initCardUI(Store, Combat);
const combatViewUI = initCombatViewUI(Store, Combat, cardUI, (id) => runDiceLine(id, Store));

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
});
on(DOM.combat.btnExport, 'click', () => { if (confirm('Appliquer PV aux profils correspondants ?')) Store.exportToReserve(); });
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
});
on(DOM.combat.btnLoadFile, 'click', () => { if (DOM.combat.fileInput) DOM.combat.fileInput.click(); });
on(DOM.combat.fileInput, 'change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => Store.loadFromJSON(ev.target.result);
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
    }
  });
}
on(DOM.combat.btnD100, 'click', () => {
  const roll = d100();
  Store.log(`🎲 Jet de d100 → ${roll}`);
  const res = document.createElement('div');
  res.className = 'dice-result';
  res.innerHTML = `<span class="dice-rollvalue">1d100 = ${roll}</span><span class="badge">Jet simple</span>`;
  DOM.combat.results.prepend(res);
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
