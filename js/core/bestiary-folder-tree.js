/**
 * Dossiers de la Bibliothèque de bestiaire (chantier images des pions, T14) : fonctions pures sur le classement généré
 * (js/data/bestiary-folders.js). Un profil absent du classement (ajouté après la dernière génération) est rangé dans
 * « À classer », à la racine, au lieu de disparaître.
 */
export const UNCLASSIFIED_FOLDER = 'a-classer';
export const UNCLASSIFIED_LABEL = 'À classer';
export const PATH_SEPARATOR = ' › ';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Index du classement : { folders: Map id → { id, parent, label, children }, folderOf: Map id de profil → dossier }. */
export function createFolderIndex(folders = []) {
  const index = { folders: new Map(), folderOf: new Map() };
  for (const folder of [...folders, { id: UNCLASSIFIED_FOLDER, parent: null, label: UNCLASSIFIED_LABEL, profiles: [] }]) {
    index.folders.set(folder.id, { id: folder.id, parent: folder.parent ?? null, label: folder.label, children: [] });
    for (const id of folder.profiles || []) index.folderOf.set(id, folder.id);
  }
  for (const folder of index.folders.values()) if (folder.parent !== null) index.folders.get(folder.parent)?.children.push(folder.id);
  return index;
}

/** Dossier d'un profil (« À classer » s'il n'est pas classé). */
export const folderOfProfile = (index, profile) => index.folderOf.get(profile?.id) ?? UNCLASSIFIED_FOLDER;

/** Vrai si `folderId` est `scope` ou l'un de ses sous-dossiers ; tout est dans la racine (scope null). */
export const isWithinFolder = (folderId, scope) => scope == null || folderId === scope || String(folderId).startsWith(`${scope}/`);

/** Profils du dossier `scope` et de ses sous-dossiers (tout, depuis la racine). */
export function filterByFolder(index, profiles, scope = null) {
  return profiles.filter(profile => isWithinFolder(folderOfProfile(index, profile), scope));
}

/** Compteurs : Map dossier → nombre de profils de `profiles` dans ce dossier et ses sous-dossiers. */
export function countByFolder(index, profiles) {
  const counts = new Map();
  for (const profile of profiles) {
    for (let id = folderOfProfile(index, profile); id != null; id = index.folders.get(id)?.parent ?? null) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

/** Chemin de la racine au dossier : [{ id, label }] ; vide pour la racine ou un dossier inconnu. */
export function folderPath(index, id) {
  const path = [];
  for (let folder = index.folders.get(id); folder; folder = folder.parent === null ? null : index.folders.get(folder.parent)) path.unshift({ id: folder.id, label: folder.label });
  return path;
}

/** Libellé complet (« Ennemis › Hommes-bêtes »). */
export const folderLabelPath = (index, id) => folderPath(index, id).map(item => item.label).join(PATH_SEPARATOR);

/** Tri d'affichage des profils : nom anglais (affiché en premier), puis nom français, livre et page. */
export function sortProfiles(profiles) {
  return [...profiles].sort((a, b) => collator.compare(a.name || '', b.name || '') || collator.compare(a.nameFr || '', b.nameFr || '')
    || collator.compare(a.book || '', b.book || '') || (a.page || 0) - (b.page || 0));
}

/**
 * Vue d'un dossier pour `profiles` (déjà filtrés par livre, genre, mot-clé et nom) :
 * - `subfolders` : sous-dossiers directs de `scope` (premier niveau à la racine) qui contiennent au moins un profil,
 *   dans l'ordre du classement, avec leur compteur et leur nombre de sous-dossiers non vides ;
 * - `profiles` : à plat (`flat`, recherche ou filtre actif) tous ceux du dossier et de ses sous-dossiers, sinon ceux
 *   rangés directement dans le dossier ; triés ;
 * - `total` : nombre de profils du dossier et de ses sous-dossiers.
 * Un dossier inconnu (classement régénéré entre-temps) se lit comme la racine.
 */
export function folderView(index, profiles, scope = null, { flat = false } = {}) {
  const current = scope != null && index.folders.has(scope) ? scope : null;
  const counts = countByFolder(index, profiles);
  const childIds = current === null ? [...index.folders.values()].filter(folder => folder.parent === null).map(folder => folder.id) : index.folders.get(current).children;
  const subfolders = childIds.filter(id => counts.get(id) > 0).map(id => {
    const folder = index.folders.get(id);
    return { id, label: folder.label, count: counts.get(id), folders: folder.children.filter(child => counts.get(child) > 0).length };
  });
  const inScope = flat ? filterByFolder(index, profiles, current) : profiles.filter(profile => folderOfProfile(index, profile) === current);
  return { scope: current, path: folderPath(index, current), subfolders, profiles: sortProfiles(inScope), total: current === null ? profiles.length : counts.get(current) || 0 };
}
