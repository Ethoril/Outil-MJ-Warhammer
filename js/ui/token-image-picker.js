/**
 * Image du pion dans l'outil (chantier « images des pions », docs/specs/images-pions, T5-T6) : vignette de l'image qui partira
 * vers la carte, mention de sa provenance, et sélecteur d'une image de la bibliothèque de Map Display par recherche sur le nom.
 * La liste vient de la table (js/data/token-images.js) : sans la bibliothèque, le sélecteur reste utilisable par les noms et les
 * vignettes disparaissent (jamais d'icône cassée).
 */
import { libraryImageSrc, searchTokenImages, tokenImageLabelOf } from '../core/token-image.js';

const RESULT_LIMIT = 24;

/** Adresse affichable dans l'outil : l'image importée telle quelle, une image de bibliothèque vue depuis l'outil. */
export const tokenImageDisplaySrc = url => (typeof url === 'string' && url.startsWith('data:image/') ? url : libraryImageSrc(url));

/** Une image qui ne charge pas disparaît (CA13) ; `setSrc` la fait revenir pour une autre adresse. */
export function hideOnError(img) {
  img.addEventListener('error', () => { img.hidden = true; img.removeAttribute('src'); });
  return img;
}

/** Vignette ronde de l'image résolue (`{ url }` de tokenImageOf) ; `null` sans image. */
export function tokenThumbnail(resolved, { size = 48, alt = '', className = 'token-thumb' } = {}) {
  const src = tokenImageDisplaySrc(resolved?.url);
  if (!src) return null;
  const img = hideOnError(document.createElement('img'));
  img.className = className; img.alt = alt; img.width = size; img.height = size; img.decoding = 'async'; img.loading = 'lazy';
  img.src = src;
  return img;
}

/** Provenance en clair (CA12) : automatique ou choix du MJ. */
export function tokenImageCaption(resolved) {
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
  const clear = () => { input.value = ''; results.textContent = ''; };
  const render = () => {
    results.textContent = '';
    if (!input.value.trim()) return;
    const found = searchTokenImages(input.value, undefined, { limit: RESULT_LIMIT });
    if (!found.length) { results.append(Object.assign(document.createElement('span'), { className: 'muted', textContent: 'Aucune image.' })); return; }
    for (const row of found) {
      const pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'ghost tiny token-library-pick'; pick.title = row.path; pick.dataset.path = row.path;
      const thumb = tokenThumbnail({ url: row.path }, { size: 32 });
      if (thumb) pick.append(thumb);
      pick.append(Object.assign(document.createElement('span'), { textContent: row.label }));
      pick.addEventListener('click', () => onPick(row));
      results.append(pick);
    }
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') event.preventDefault();
    if (event.key === 'ArrowDown') { const first = results.querySelector('button'); if (first) { event.preventDefault(); first.focus(); } }
  });
  return { element, input, clear, set disabled(value) { input.disabled = Boolean(value); if (value) results.textContent = ''; } };
}
