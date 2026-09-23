import { qs, escapeHtml } from './dom.js';
import { normalizeSearchText } from '../core/sanitize.js';
import { RULES } from '../data/rules.js';
import { CRIT_DATA } from '../data/crits.js';
import { MAGIC_DATA } from '../data/magic.js';
import { fetchKeywords, getKeywordList, getKeywordsStatus } from '../core/keywords.js';
import { showToast } from './toast.js';

const FAVORITES_KEY = 'wfrp.rules.favorites.v1';
function readRuleFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter(item => typeof item === 'string') : []);
  } catch { return new Set(); }
}
function writeRuleFavorites(favorites) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch { /* stockage facultatif */ }
}
function favoriteKey(value) { return normalizeSearchText(value).replace(/[^a-z0-9]+/g, '-'); }

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
  return normalizeSearchText(text);
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

export function renderReferenceTables(filterTerm = '', target = null) {
  const panel = qs('#panel-rules');
  const root = target || panel;
  if (!root) return;

  const term = normalizeSearchText(filterTerm || '').trim();

  let html = `<h2>Aides de Jeu & Règles</h2>`;

  html += `
    <div class="card" style="margin-bottom: 16px;">
      <input type="search" id="rules-search" placeholder="🔍 Rechercher dans les règles et mots-clés (ex: Percutante, Brisé, Localisation...)" value="${escapeHtml(filterTerm)}" style="width:100%; padding:8px 12px; font-size:0.95em;">
    </div>
    <div id="rules-list"></div>
  `;

  root.innerHTML = html;

  const searchInput = root.querySelector('#rules-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      updateRulesList(val, root);
    });
  }

  updateRulesList(term, root);
}

function updateRulesList(term, root = qs('#panel-rules')) {
  const listContainer = root?.querySelector('#rules-list');
  if (!listContainer) return;

  const cleanTerm = normalizeSearchText(term).trim();
  const favorites = readRuleFavorites();
  let matchCount = 0;
  let html = '';

  // 1. BLOC MOTS-CLÉS D'ARMES ET D'ARMURES (§13.2, §13.7)
  const keywords = getKeywordList();
  const status = getKeywordsStatus();
  const matchedKeywords = keywords.filter(k => !cleanTerm || normalizeSearchText(`${k.name} ${k.effect}`).includes(cleanTerm));

  if (matchedKeywords.length > 0) {
    matchCount += matchedKeywords.length;
    const isOpen = Boolean(cleanTerm);
    const statusText = status.updatedAt ? `${status.source} (mis à jour le ${status.updatedAt})` : `${status.source}`;

    html += `<div class="card rule-block">`;
    html += `<details ${isOpen ? 'open' : ''}>`;
    html += `<summary class="row" style="justify-content:space-between;"><span>🗡️ Mots-clés d'armes et d'armures (${matchedKeywords.length})</span></summary>`;
    html += `<div class="rule-content">`;
    html += `<div class="row" style="margin-bottom:12px; font-size:0.85em; background:rgba(0,0,0,0.05); padding:6px 10px; border-radius:6px;">`;
    html += `<span class="muted">Provenance : <strong>${escapeHtml(statusText)}</strong></span>`;
    html += `<div class="spacer"></div>`;
    html += `<button id="btn-reload-keywords" class="ghost small">🔄 Recharger depuis le Sheet</button>`;
    html += `</div>`;

    html += `<table class="wfrp-table"><thead><tr><th style="width:25%;">Mot-clé</th><th>Effet</th></tr></thead><tbody>`;
    matchedKeywords.forEach(k => {
      const key = `keyword:${favoriteKey(k.slug || k.name)}`;
      html += `<tr><td><button type="button" class="rule-favorite ghost" data-favorite-key="${escapeHtml(key)}" aria-label="Favori">${favorites.has(key) ? '★' : '☆'}</button> <strong>${escapeHtml(k.name)}</strong></td><td>${escapeHtml(k.effect)}</td></tr>`;
    });
    html += `</tbody></table></div></details></div>`;
  }

  // 2. BLOCS DE RÈGLES CLASSIQUES
  RULES.forEach(block => {
    const fullText = extractTextFromBlock(block);
    const matches = !cleanTerm || fullText.includes(cleanTerm);

    if (matches) {
      matchCount++;
      const isOpen = Boolean(cleanTerm);

      html += `<div class="card rule-block">`;
      html += `<details ${isOpen ? 'open' : ''}>`;
      const key = `rule:${favoriteKey(block.title)}`;
      html += `<summary class="row"><span>${escapeHtml(block.title)}</span><button type="button" class="rule-favorite ghost" data-favorite-key="${escapeHtml(key)}" aria-label="Favori">${favorites.has(key) ? '★' : '☆'}</button></summary>`;
      html += `<div class="rule-content">`;

      if (block.intro) html += `<p>${escapeHtml(block.intro)}</p>`;

      if (block.sections) {
        block.sections.forEach(sec => {
          html += renderSection(sec);
        });
      }

      if (block.tablesHeader) {
        html += `<h3 style="margin-top:30px; border-top:2px solid var(--border); padding-top:10px;">${escapeHtml(block.tablesHeader)}</h3>`;
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

  listContainer.querySelectorAll('.rule-favorite').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const key = button.dataset.favoriteKey;
      if (!key) return;
      const next = readRuleFavorites();
      if (next.has(key)) next.delete(key); else next.add(key);
      writeRuleFavorites(next);
      button.textContent = next.has(key) ? '★' : '☆';
    });
  });

  const btnReload = root?.querySelector('#btn-reload-keywords');
  if (btnReload) {
    btnReload.addEventListener('click', async () => {
      btnReload.disabled = true;
      btnReload.textContent = '⏳ Chargement...';
      try {
        await fetchKeywords(true);
        showToast('Mots-clés mis à jour depuis Google Sheets', 'success');
        updateRulesList(term, root);
      } catch (err) {
        showToast('Erreur lors du chargement des mots-clés: ' + err.message, 'error');
        btnReload.disabled = false;
        btnReload.textContent = '🔄 Recharger depuis le Sheet';
      }
    });
  }
}
