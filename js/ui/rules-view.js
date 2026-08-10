import { qs } from './dom.js';
import { CRIT_DATA } from '../data/crits.js';
import { MAGIC_DATA } from '../data/magic.js';

export function renderD100Table(data) {
  let html = `<table class="wfrp-table"><thead><tr><th>D100</th><th>Nom</th><th>Effet</th></tr></thead><tbody>`;
  let prevMax = 0;
  data.forEach(row => {
    html += `<tr><td>${prevMax + 1}–${row.max}</td><td><strong>${row.name}</strong></td><td>${row.eff}</td></tr>`;
    prevMax = row.max;
  });
  html += `</tbody></table>`;
  return html;
}

export function renderReferenceTables() {
  if (qs('#table-head-crit')) {
    qs('#table-head-crit').innerHTML = renderD100Table(CRIT_DATA.HEAD);
    qs('#table-arm-crit').innerHTML = renderD100Table(CRIT_DATA.ARM);
    qs('#table-body-crit').innerHTML = renderD100Table(CRIT_DATA.BODY);
    qs('#table-leg-crit').innerHTML = renderD100Table(CRIT_DATA.LEG);
  }
  if (qs('#table-magic-minor')) {
    qs('#table-magic-minor').innerHTML = renderD100Table(MAGIC_DATA.MINOR);
    qs('#table-magic-major').innerHTML = renderD100Table(MAGIC_DATA.MAJOR);
  }
}
