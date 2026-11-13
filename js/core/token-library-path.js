/**
 * Chemin d'une image de la bibliothèque de Map Display (contrat de liaison §6) : règle unique, lue par l'outil (token-image.js)
 * et par le générateur de la table (tools/build-token-images.mjs). Module pur, sans dépendance : le générateur l'importe sans
 * charger la table qu'il produit.
 * `maps/tokens/`, puis seulement lettres ASCII, chiffres, `.`, `_`, `-` et `/` (aucun `%`, `\`, espace ni accent), aucun segment
 * vide, `.`, `..` ou caché (commençant par `.`), aucune suite `..`, extension webp, png, jpg, jpeg ou gif (casse libre),
 * 200 caractères au plus. Même règle, cas pour cas, que `isTokenLibraryPath` de la carte (js/core/schema.js).
 */
const LIBRARY_PATH = /^maps\/tokens\/[A-Za-z0-9._/-]+$/;
const IMAGE_EXTENSION = /\.(?:webp|png|jpe?g|gif)$/i;

/** Le chemin s'il est valide, sinon `undefined`. */
export function normalizeLibraryImage(value) {
  return typeof value === 'string' && value.length <= 200 && LIBRARY_PATH.test(value) && IMAGE_EXTENSION.test(value)
    && !value.includes('..') && value.split('/').every(part => part !== '' && !part.startsWith('.')) ? value : undefined;
}
