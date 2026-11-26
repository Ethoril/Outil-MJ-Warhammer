/**
 * Registre des jeux de l'Outil MJ (chapeau multi-jeux, lot L2). Module pur, sans import.
 *
 * Un jeu = une entrée ici + une page. Les noms de stockage de chaque jeu sont déclarés à cet unique endroit :
 * - Warhammer garde ceux d'avant le chapeau (base `wfrp-persistence-v2`, clés `wfrp.*`) : aucune donnée n'est renommée ni migrée ;
 *   un test (tests/unit/chapeau/noms-stockage-warhammer.test.mjs) les fige ;
 * - chaque nouveau jeu reçoit une base préfixée `outil-mj-` (la carte et l'outil partagent l'origine) et son propre préfixe de clés.
 * `publie: false` : le jeu est dans le registre mais n'apparaît pas dans le sélecteur.
 */
export const JEUX = Object.freeze([
  Object.freeze({ id: 'warhammer', nom: 'Warhammer', page: './index.html', base: 'wfrp-persistence-v2', prefixe: 'wfrp.', publie: true }),
  Object.freeze({ id: 'cthulhu', nom: 'L’Appel de Cthulhu', page: './cthulhu/', base: 'outil-mj-cthulhu-v1', prefixe: 'cthulhu.', publie: true }),
  Object.freeze({ id: 'imperium', nom: 'Imperium Maledictum', page: './imperium/', base: 'outil-mj-imperium-v1', prefixe: 'imperium.', publie: true })
]);

/** Les jeux qui apparaissent dans le sélecteur. */
export function jeuxPublies() {
  return JEUX.filter(jeu => jeu.publie);
}

/** Dossier d'un jeu sous la racine de l'outil : '' pour Warhammer (à la racine), 'cthulhu' pour './cthulhu/'. */
function dossierDuJeu(jeu) {
  return jeu.page.replace(/^\.\//, '').replace(/index\.html$/, '').replace(/\/$/, '');
}

/** Segments du chemin d'une adresse sans le fichier final, et nom de ce fichier (`null` si l'adresse finit par « / »). */
function lireAdresse(adresse) {
  if (typeof adresse !== 'string' || !adresse.trim()) return null;
  let url;
  try { url = new URL(adresse); } catch { return null; }
  const segments = url.pathname.split('/').filter(Boolean);
  const fichier = url.pathname.endsWith('/') ? null : segments.pop();
  if (fichier && fichier !== 'index.html') return null;
  return { url, segments };
}

/** Le jeu auquel appartient la page d'une adresse (`null` si l'adresse est inutilisable). */
export function jeuDeLaPage(adresse) {
  const lue = lireAdresse(adresse);
  if (!lue) return null;
  const dernier = lue.segments.at(-1);
  return JEUX.find(jeu => dossierDuJeu(jeu) && dossierDuJeu(jeu) === dernier)
    ?? JEUX.find(jeu => dossierDuJeu(jeu) === '') ?? null;
}

/** Adresse de la page d'un jeu, depuis l'adresse de la page courante (`null` si le jeu est inconnu ou l'adresse inutilisable). */
export function adresseDuJeu(id, adresseCourante) {
  const cible = JEUX.find(jeu => jeu.id === id);
  const courant = jeuDeLaPage(adresseCourante);
  const lue = lireAdresse(adresseCourante);
  if (!cible || !courant || !lue) return null;
  const segments = dossierDuJeu(courant) ? lue.segments.slice(0, -1) : lue.segments;
  const racine = `${lue.url.origin}/${segments.map(segment => `${segment}/`).join('')}`;
  return new URL(cible.page, racine).href;
}
