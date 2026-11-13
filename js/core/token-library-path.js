/**
 * Chemin d'une image de la bibliothèque de Map Display (contrat de liaison §6) : règle unique, lue par l'outil (token-image.js)
 * et par le générateur de la table (tools/build-token-images.mjs). Module pur, sans dépendance : le générateur l'importe sans
 * charger la table qu'il produit.
 * `maps/tokens/`, puis seulement lettres ASCII, chiffres, `.`, `_`, `-` et `/` (aucun `%`, `\`, espace ni accent), aucun segment
 * vide, `.` ou `..`, extension webp, png, jpg, jpeg ou gif, 200 caractères au plus.
 */
const LIBRARY_PATH = /^maps\/tokens\/[A-Za-z0-9._/-]+\.(?:webp|png|jpe?g|gif)$/i;

/** Le chemin s'il est valide, sinon `undefined`. */
export function normalizeLibraryImage(value) {
  return typeof value === 'string' && value.length <= 200 && LIBRARY_PATH.test(value)
    && !value.split('/').some(part => part === '' || part === '.' || part === '..') ? value : undefined;
}
