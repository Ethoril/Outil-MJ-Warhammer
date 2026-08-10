import { qs, escapeHtml } from './dom.js';
import { RULES } from '../data/rules.js';
import { CRIT_DATA } from '../data/crits.js';
import { MAGIC_DATA } from '../data/magic.js';

export function renderD100Table(data) {
  let html = `<table class="wfrp-table"><thead><tr><th>D100</th><th>Nom</th><th>Effet</th></tr></thead><tbody>`;
  let prevMax = 0;
  data.forEach(row => {
    html += `<tr><td>${prevMax + 1}–${row.max}</td><td><strong>${escapeHtml(row.name)}</strong></td><td>${escapeHtml(row.eff)}</td></tr>`;
    prevMax = row.max;
  });
  html += `</tbody></table>`;
  return html;
}

function extractTextFromBlock(block) {
  let text = (block.title || '') + ' ' + (block.intro || '') + ' ';
  if (block.sections) {
    block.sections.forEach(sec => {
      text += (sec.h4 || '') + ' ' + (sec.p || '') + ' ' + (sec.example || '') + ' ' + (sec.pAfter || '') + ' ';
      if (sec.ul) text += sec.ul.join(' ') + ' ';
      if (sec.ol) text += sec.ol.join(' ') + ' ';
      if (sec.table) text += sec.table.map(r => r.jet + ' ' + r.loc).join(' ') + ' ';
      if (sec.subSections) {
        sec.subSections.forEach(sub => {
          text += (sub.title || '') + ' ' + (sub.p || '') + ' ';
          if (sub.ul) text += sub.ul.join(' ') + ' ';
        });
      }
    });
  }
  return text.toLowerCase();
}

function renderSection(sec) {
  let html = '';
  if (sec.h4) html += `<h4>${escapeHtml(sec.h4)}</h4>`;
  if (sec.p) html += `<p>${escapeHtml(sec.p)}</p>`;
  if (sec.example) html += `<p class="example"><em>${escapeHtml(sec.example)}</em></p>`;

  if (sec.table) {
    html += `<table class="wfrp-table"><thead><tr><th>Jet</th><th>Localisation</th></tr></thead><tbody>`;
    sec.table.forEach(r => {
      html += `<tr><td>${escapeHtml(r.jet)}</td><td>${escapeHtml(r.loc)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  if (sec.ul) {
    html += `<ul>`;
    sec.ul.forEach(item => { html += `<li>${escapeHtml(item)}</li>`; });
    html += `</ul>`;
  }

  if (sec.ol) {
    html += `<ol>`;
    sec.ol.forEach(item => { html += `<li>${escapeHtml(item)}</li>`; });
    html += `</ol>`;
  }

  if (sec.subSections) {
    sec.subSections.forEach(sub => {
      if (sub.title) html += `<strong>${escapeHtml(sub.title)}</strong>`;
      if (sub.p) html += `<p>${escapeHtml(sub.p)}</p>`;
      if (sub.ul) {
        html += `<ul>`;
        sub.ul.forEach(item => { html += `<li>${escapeHtml(item)}</li>`; });
        html += `</ul>`;
      }
    });
  }

  if (sec.pAfter) html += `<p>${escapeHtml(sec.pAfter)}</p>`;
  return html;
}

export function renderReferenceTables(filterTerm = '') {
  const panel = qs('#panel-rules');
  if (!panel) return;

  const term = (filterTerm || '').trim().toLowerCase();

  // Conserver le titre du panneau
  let html = `<h2>Aides de Jeu & Règles</h2>`;

  // Champ de recherche
  html += `
    <div class="card" style="margin-bottom: 16px;">
      <input type="search" id="rules-search" placeholder="🔍 Rechercher dans les règles (ex: Brisé, Localisation, Corruption...)" value="${escapeHtml(filterTerm)}" style="width:100%; padding:8px 12px; font-size:0.95em;">
    </div>
    <div id="rules-list"></div>
  `;

  panel.innerHTML = html;

  const searchInput = qs('#rules-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      updateRulesList(val);
    });
  }

  updateRulesList(term);
}

function updateRulesList(term) {
  const listContainer = qs('#rules-list');
  if (!listContainer) return;

  const cleanTerm = term.trim().toLowerCase();
  let matchCount = 0;
  let html = '';

  RULES.forEach(block => {
    const fullText = extractTextFromBlock(block);
    const matches = !cleanTerm || fullText.includes(cleanTerm);

    if (matches) {
      matchCount++;
      const isOpen = Boolean(cleanTerm);

      html += `<div class="card rule-block">`;
      html += `<details ${isOpen ? 'open' : ''}>`;
      html += `<summary>${escapeHtml(block.title)}</summary>`;
      html += `<div class="rule-content">`;

      if (block.intro) html += `<p>${escapeHtml(block.intro)}</p>`;

      if (block.sections) {
        block.sections.forEach(sec => {
          html += renderSection(sec);
        });
      }

      if (block.tablesHeader) {
        html += `<h3 style="margin-top:30px; border-top:2px solid #5a1d1d; padding-top:10px;">${escapeHtml(block.tablesHeader)}</h3>`;
        html += `<p class="muted">Générés automatiquement par le système :</p>`;
      }

      if (block.nestedTables) {
        block.nestedTables.forEach(nt => {
          let tableHtml = '';
          if (nt.type === 'crit' && CRIT_DATA[nt.key]) {
            tableHtml = renderD100Table(CRIT_DATA[nt.key]);
          } else if (nt.type === 'magic' && MAGIC_DATA[nt.key]) {
            tableHtml = renderD100Table(MAGIC_DATA[nt.key]);
          }
          html += `<details class="nested-details" ${isOpen ? 'open' : ''}>`;
          html += `<summary>${escapeHtml(nt.title)}</summary>`;
          html += `<div id="${escapeHtml(nt.id)}">${tableHtml}</div>`;
          html += `</details>`;
        });
      }

      html += `</div></details></div>`;
    }
  });

  if (matchCount === 0) {
    html = `<p class="muted" style="padding: 16px; text-align: center;">Aucun résultat pour « ${escapeHtml(cleanTerm)} ».</p>`;
  }

  listContainer.innerHTML = html;
}
