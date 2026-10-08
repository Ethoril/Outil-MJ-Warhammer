/** Public diagnostic only: never display Firebase messages, customData, emails or credentials. */
export function googleAuthErrorCode(error) {
  const code = error?.code;
  return typeof code === 'string' && /^auth\/[a-z0-9-]{1,64}$/.test(code) ? code : 'auth/unknown';
}

export function googleAuthErrorMessage(error, { online = true } = {}) {
  const code = googleAuthErrorCode(error);
  const messages = {
    'auth/popup-blocked': 'La fenêtre Google a été bloquée. Autorisez les fenêtres surgissantes pour ce site, puis réessayez.',
    'auth/popup-closed-by-user': 'La fenêtre Google s’est fermée avant la fin de la connexion. Vérifiez les blocages du navigateur, puis réessayez.',
    'auth/cancelled-popup-request': 'Une autre tentative a remplacé cette connexion. Réessayez une seule fois et attendez la réponse de Google.',
    'auth/web-storage-unsupported': 'Le navigateur ne permet pas le stockage nécessaire à la connexion Google. Vérifiez ses réglages de cookies et de stockage pour ce site.',
    'auth/network-request-failed': 'Une requête de connexion Google a échoué. Vérifiez le réseau et les éventuels blocages du navigateur, puis réessayez.',
    'auth/unauthorized-domain': 'Ce domaine n’est pas autorisé pour la connexion Google. Signalez ce code au responsable de l’outil.',
    'auth/operation-not-supported-in-this-environment': 'Cet environnement ne permet pas cette connexion Google. Ouvrez le site dans un onglet normal du navigateur, puis réessayez.',
    'auth/operation-not-allowed': 'La connexion Google n’est pas activée pour cette application. Signalez ce code au responsable de l’outil.',
    'auth/internal-error': 'La connexion Google n’a pas pu terminer son initialisation. Vérifiez les blocages du navigateur, puis réessayez.',
    'auth/not-initialized': 'La connexion Google n’est pas encore disponible. Rechargez l’outil, puis réessayez.',
    'auth/too-many-requests': 'Trop de tentatives de connexion ont été effectuées. Patientez avant de réessayer.'
  };
  const message = messages[code] || (!online
    ? 'Le navigateur se déclare hors ligne. Reconnectez-le, puis réessayez la connexion Google.'
    : 'La connexion Google a échoué. Réessayez et communiquez ce code si le problème persiste.');
  return `${message}\nCode : ${code}`;
}
