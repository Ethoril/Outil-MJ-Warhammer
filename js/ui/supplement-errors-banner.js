/**
 * U8 L7 (Q5 du MJ, 06/11) : bandeau des erreurs de chargement des suppléments. Il reste affiché tant que le fichier
 * `js/data/v5-supplements.json` n'est pas corrigé ; il se replie mais ne se ferme pas. Les éléments valides restent chargés.
 */
// Échappement local (même table que dom.js, qui lit le document au chargement : ce module reste testable hors navigateur).
const escapeHtml = value => String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/** HTML du bandeau (vide sans erreur). `errors` : `SUPPLEMENT_ERRORS` du chargeur (`{ message }`). */
export function supplementErrorsHtml(errors = []) {
  if (!Array.isArray(errors) || !errors.length) return '';
  const count = errors.length;
  return `<details class="supplement-errors" open>`
    + `<summary>${count} élément${count > 1 ? 's' : ''} de supplément écarté${count > 1 ? 's' : ''} au chargement : à corriger dans js/data/v5-supplements.json</summary>`
    + `<ul>${errors.map(error => `<li>${escapeHtml(error?.message ?? String(error))}</li>`).join('')}</ul></details>`;
}

/** Affiche le bandeau en tête de `host` (élément) ; ne fait rien sans erreur. Retourne l'élément créé, ou `null`. */
export function mountSupplementErrors(host, errors = []) {
  const html = supplementErrorsHtml(errors);
  if (!html || !host) return null;
  const banner = host.ownerDocument.createElement('div');
  banner.id = 'supplement-errors';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = html;
  host.prepend(banner);
  return banner;
}
