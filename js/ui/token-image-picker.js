/**
 * Image du pion dans l'outil (chantier « images des pions », docs/specs/images-pions, T5-T6) : vignette de l'image qui partira
 * vers la carte, mention de sa provenance, et sélecteur d'une image de la bibliothèque de Map Display par recherche sur le nom.
 * La liste vient de la table (js/data/token-images.js) : sans la bibliothèque, le sélecteur reste utilisable par les noms et les
 * vignettes disparaissent (jamais d'icône cassée).
 */
import { libraryImageSrc, searchTokenImages, tokenImageLabelOf } from '../core/token-image.js';

// Résultats affichés au plus (la bibliothèque compte des centaines d'images, chaque vignette charge l'image entière) et pause de
// frappe avant de chercher.
const RESULT_LIMIT = 12;
const SEARCH_DELAY_MS = 200;

/** Adresse affichable dans l'outil : l'image importée telle quelle, une image de bibliothèque vue depuis l'outil. */
export const tokenImageDisplaySrc = url => (typeof url === 'string' && url.startsWith('data:image/') ? url : libraryImageSrc(url));

// Une adresse qui n'a pas chargé n'est plus demandée jusqu'au rechargement de la page, qui sert de nouvel essai (une image que le
// MJ ajoute à la bibliothèque apparaît alors) : mémoire de la page, pas du navigateur. Une adresse en cours de chargement n'est pas
// redemandée par une autre vignette (rendus rapprochés) : celle-ci attend l'issue, ou 2 s si la première, paresseuse, ne charge pas.
const missing = new Set();
const loading = new Map(); // adresse → vignettes en attente
const WAIT_MS = 2000;
/** L'adresse a déjà échoué dans cette page. */
export const isMissingImage = src => missing.has(src);

const hide = img => { img.hidden = true; img.removeAttribute('src'); };
function settle(src, ok) {
  const waiting = loading.get(src) || new Set();
  loading.delete(src);
  for (const img of waiting) if (img.dataset.tokenSrc === src) { if (ok) { img.hidden = false; img.src = src; } else hide(img); }
}
function start(img, src) {
  if (!loading.has(src)) loading.set(src, new Set());
  img.hidden = false;
  if (img.getAttribute('src') !== src) img.src = src;
}

/** Suit les chargements d'une image (une fois par élément) : un échec la cache (CA13) et retient l'adresse. */
export function trackImage(img) {
  if (img.dataset.tokenTracked) return img;
  img.dataset.tokenTracked = '1';
  img.addEventListener('load', () => { const src = img.getAttribute('src'); if (src) settle(src, true); });
  img.addEventListener('error', () => { const src = img.getAttribute('src'); if (src) { missing.add(src); settle(src, false); } hide(img); });
  return img;
}

/** Affiche `src` dans une image suivie ; rien (cachée, sans adresse) si `src` est vide ou a déjà échoué. */
export function setImageSrc(img, src) {
  trackImage(img);
  img.dataset.tokenSrc = src || '';
  if (!src || missing.has(src)) { hide(img); return; }
  const waiting = loading.get(src);
  if (!waiting || img.getAttribute('src') === src) { start(img, src); return; }
  hide(img); waiting.add(img);
  setTimeout(() => { if (waiting.delete(img) && img.dataset.tokenSrc === src && !missing.has(src)) start(img, src); }, WAIT_MS);
}

/** Vignette ronde de l'image résolue (`{ url }` de tokenImageOf) ; `null` sans image ou si elle a déjà échoué. */
export function tokenThumbnail(resolved, { size = 48, alt = '', className = 'token-thumb' } = {}) {
  const src = tokenImageDisplaySrc(resolved?.url);
  if (!src || missing.has(src)) return null;
  const img = document.createElement('img');
  img.className = className; img.alt = alt; img.width = size; img.height = size; img.decoding = 'async'; img.loading = 'lazy';
  setImageSrc(img, src);
  return img;
}

/** Provenance en clair (CA12) : automatique ou choix du MJ. */
export function tokenImageCaption(resolved) {
  if (resolved?.source === 'map') return 'Image de la carte (aucune image choisie dans l’outil)';
  if (resolved?.source === 'imported') return 'Image importée (choix du MJ)';
  if (resolved?.source === 'chosen') return `${tokenImageLabelOf(resolved.url)} (bibliothèque, choix du MJ)`;
  if (resolved?.source === 'auto') return `${tokenImageLabelOf(resolved.url)} (bibliothèque, automatique)`;
  return 'Aucune image';
}
/** Mention courte pour une carte de profil. */
export const tokenImageShortCaption = resolved => ({ imported: 'image du MJ', chosen: 'image du MJ', auto: 'image automatique' })[resolved?.source] || '';

/**
 * Recherche dans la bibliothèque : un champ et des boutons, un par image trouvée (vignette et libellé). `onPick(row)` reçoit la
 * ligne de la table. Entrée ne soumet pas le formulaire englobant ; Flèche bas passe aux résultats.
 */
export function createTokenLibraryPicker({ label = 'Chercher une image dans la bibliothèque de la carte', placeholder = 'Bibliothèque : loup, aubergiste…', className = '', onPick = () => {} } = {}) {
  const element = document.createElement('div');
  element.className = `token-library-picker ${className}`.trim();
  const input = document.createElement('input');
  input.type = 'search'; input.className = 'token-library-search'; input.placeholder = placeholder; input.autocomplete = 'off';
  input.setAttribute('aria-label', label);
  const results = document.createElement('div');
  results.className = 'token-library-results'; results.setAttribute('role', 'group'); results.setAttribute('aria-label', 'Images trouvées dans la bibliothèque');
  element.append(input, results);
  // La liste attend une pause de frappe : seules les vignettes des résultats affichés (RESULT_LIMIT au plus) sont demandées.
  let timer = null;
  const clear = () => { clearTimeout(timer); timer = null; input.value = ''; results.textContent = ''; };
  const render = () => {
    clearTimeout(timer); timer = null;
    results.textContent = '';
    if (!input.value.trim()) return;
    const all = searchTokenImages(input.value);
    const found = all.slice(0, RESULT_LIMIT);
    if (!found.length) { results.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: 'Aucune image.' })); return; }
    if (all.length > found.length) results.append(Object.assign(document.createElement('span'), { className: 'muted token-library-more', textContent: `${all.length - found.length} autres : précisez la recherche.` }));
    for (const row of found) {
      const pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'ghost tiny token-library-pick'; pick.title = row.path; pick.dataset.path = row.path;
      const thumb = tokenThumbnail({ url: row.path }, { size: 32 });
      if (thumb) pick.append(thumb);
      pick.append(Object.assign(document.createElement('span'), { textContent: row.label }));
      pick.addEventListener('click', () => onPick(row));
      results.insertBefore(pick, results.querySelector('.token-library-more'));
    }
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, SEARCH_DELAY_MS); });
  input.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === 'ArrowDown') && timer) render();
    if (event.key === 'Enter') event.preventDefault();
    if (event.key === 'ArrowDown') { const first = results.querySelector('button'); if (first) { event.preventDefault(); first.focus(); } }
  });
  return { element, input, clear, set disabled(value) { input.disabled = Boolean(value); if (value) clear(); } };
}
