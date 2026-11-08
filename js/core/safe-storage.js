/**
 * Accès protégé à localStorage (BOOT-05) : un navigateur qui interdit le stockage du site
 * lève une SecurityError dès la lecture de window.localStorage. On renvoie alors null et
 * l’outil démarre en mode dégradé (rien n’est mémorisé dans ce stockage).
 */
export function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
