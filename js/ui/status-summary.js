// Libellés et résumé de l'état d'enregistrement (local) et de synchronisation (distant), sans DOM : testables seuls.

export const LOCAL_STATUS_LABELS = Object.freeze({
  loading: 'Local : vérification…',
  saving: 'Local : sauvegarde…',
  unavailable: 'Local : indisponible',
  saved: 'Local : enregistré',
  error: 'Local : erreur de sauvegarde',
  sandbox: 'Local : rencontre test, rien n’est enregistré'
});

export const SYNC_STATUS_LABELS = Object.freeze({
  connecting: 'Connexion…',
  pending: 'En attente d’envoi',
  sending: 'Synchronisation…',
  synced: 'Synchronisé',
  connected: 'Connecté',
  ready: 'Session prête',
  transition: 'Migration de la file…',
  conflict: 'Conflit à résoudre',
  signedOut: 'Mode invité — local uniquement',
  offline: 'Hors ligne — synchronisation suspendue',
  error: 'Erreur distante — nouvelle tentative',
  // BOOT-02 : compte connecté, mais ce navigateur n'offre pas de stockage local (IndexedDB) : rien n'est envoyé.
  noLocalStore: 'Synchronisation indisponible sans stockage local sur ce navigateur',
  // BOOT-09 : le SDK Firebase n'a pas démarré ; ce n'est pas une coupure réseau.
  sdkFailed: 'Connexion au compte indisponible — utilisez « Réessayer la connexion »'
});

const SYNC_BUSY = ['sending', 'pending', 'connecting', 'transition'];
const SYNC_OK = ['synced', 'connected', 'ready'];

/** Résumé affiché dans la barre du haut : `{ label, tone }` (`ok`, `neutral`, `warn`, `danger`). */
export function statusSummary(local, sync) {
  if (local === 'sandbox') return { label: 'Rencontre test : rien n’est enregistré', tone: 'warn' };
  if (sync === 'conflict') return { label: 'Conflit à résoudre', tone: 'danger' };
  if (local === 'error' || local === 'unavailable') return { label: 'Enregistrement local en échec', tone: 'danger' };
  if (sync === 'error') return { label: 'Erreur de synchronisation', tone: 'warn' };
  if (sync === 'noLocalStore') return { label: 'Synchronisation indisponible', tone: 'warn' };
  if (sync === 'sdkFailed') return { label: 'Compte indisponible', tone: 'warn' };
  if (sync === 'offline') return { label: 'Hors ligne', tone: 'warn' };
  if (SYNC_BUSY.includes(sync)) return { label: 'Synchronisation…', tone: 'neutral' };
  if (local === 'saving') return { label: 'Enregistrement…', tone: 'neutral' };
  if (SYNC_OK.includes(sync)) return { label: 'Synchronisé', tone: 'ok' };
  if (sync === 'signedOut' && local === 'saved') return { label: 'Enregistré sur cet appareil', tone: 'ok' };
  return { label: 'Vérification…', tone: 'neutral' };
}
