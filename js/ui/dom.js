export const qs = (s) => document.querySelector(s);
export const qsa = (s) => Array.from(document.querySelectorAll(s));
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
export const on = (el, evt, fn) => { if (el) { el.addEventListener(evt, fn); } };

export const DOM = {
  tabs: qsa('.tab'),
  panels: { reserve: qs('#panel-reserve'), combat: qs('#panel-combat'), workspace: qs('#panel-workspace'), rules: qs('#panel-rules') },
  reserve: { list: qs('#reserve-list'), search: qs('#search-reserve'), form: qs('#form-add'), seed: qs('#seed-reserve'), clear: qs('#clear-reserve') },
  combat: {
    initTracker: qs('#init-tracker'),
    zoneActive: qs('#zone-active'), zoneBench: qs('#zone-bench'),
    pillRound: qs('#pill-round'), pillTurn: qs('#pill-turn'),
    btnImport: qs('#btn-import'), btnExport: qs('#btn-export'),
    btnStart: qs('#btn-start'), btnNextTurn: qs('#btn-next-turn'), btnReset: qs('#btn-reset'), btnEndCombat: qs('#btn-end-combat'), btnD100: qs('#btn-d100'),
    log: qs('#log'), btnClearLog: qs('#btn-clear-log'),
    btnSaveFile: qs('#btn-save-file'), btnLoadFile: qs('#btn-load-file'), fileInput: qs('#file-input'),
    results: qs('#dice-prep-results')
  },
  importModal: { dialog: qs('#dlg-import'), list: qs('#import-list'), confirm: qs('#confirm-import') },
  tplActor: qs('#tpl-actor'),
  btnVersion: qs('#btn-version')
};
