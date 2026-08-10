import fallbackData from '../data/keywords-fallback.json' with { type: 'json' };
import { ENGINES } from '../data/keyword-engines.js';

const STORAGE_KEY = 'wfrp.keywords.v1';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Mots%20Cl%C3%A9s%20Armes%20et%20Armures';

let keywordsList = [];
let keywordsStatus = { source: 'local', updatedAt: null, error: null };

export function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+x\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(col => {
      return col.replace(/^"|"$/g, '').trim();
    });

    if (cols.length >= 2 && cols[0]) {
      const rawName = cols[0];
      const effect = cols[1] || '';
      const hasRating = /\bx\b/i.test(rawName);
      const slug = slugify(rawName);

      results.push({
        name: rawName,
        slug,
        hasRating,
        effect
      });
    }
  }

  return results;
}

export function loadInitialKeywords() {
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          keywordsList = parsed.data;
          keywordsStatus = { source: 'localStorage', updatedAt: parsed.updatedAt, error: null };
          return keywordsList;
        }
      } catch (e) {
        console.warn('[Keywords] Cache localStorage corrompu:', e);
      }
    }
  }

  keywordsList = fallbackData;
  keywordsStatus = { source: 'instantané local (dépôt)', updatedAt: null, error: null };
  return keywordsList;
}

export async function fetchKeywords(forceRefresh = false) {
  if (!keywordsList.length) {
    loadInitialKeywords();
  }

  if (typeof fetch === 'undefined') return keywordsList;

  try {
    const res = await fetch(SHEET_URL, { cache: forceRefresh ? 'reload' : 'default' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseCSV(text);

    if (parsed.length > 0) {
      keywordsList = parsed;
      const now = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      keywordsStatus = { source: 'Google Sheets', updatedAt: now, error: null };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: parsed, updatedAt: now }));
      }
      console.log(`[Keywords] ${parsed.length} mot(s)-clé(s) mis à jour depuis Google Sheets`);
    }
  } catch (err) {
    console.warn('[Keywords] Échec du rafraîchissement depuis Google Sheets (utilisation du cache local):', err.message);
    keywordsStatus.error = err.message;
  }

  return keywordsList;
}

export function getKeywordList() {
  if (!keywordsList.length) loadInitialKeywords();
  return keywordsList;
}

export function getKeywordBySlug(slug) {
  const norm = slugify(slug);
  return getKeywordList().find(k => k.slug === norm || slugify(k.name) === norm) || null;
}

export function getKeywordsStatus() {
  return keywordsStatus;
}
