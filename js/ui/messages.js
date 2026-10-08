/**
 * Messages d'erreur montrés au MJ. Une erreur lancée avec une phrase déjà
 * rédigée passe par `userError` ; toute autre erreur est traduite par
 * `userMessage` : correspondance connue, sinon phrase de repli contextuelle.
 * Le détail technique reste dans la console.
 */

const FILE_INVALID = 'Ce fichier n’est pas une sauvegarde de l’outil MJ.';

// Ordre significatif : la première correspondance l'emporte.
const KNOWN_ERRORS = [
  [error => error?.code === 'SKILL_LINK_REQUIRED', 'Choisissez la compétence de cette arme dans « Mettre à jour les PJ » avant de lancer l’action.'],
  [error => error?.code === 'AMMUNITION_INCOMPATIBLE', 'Cette munition est incompatible avec l’arme choisie.'],
  [error => error?.code === 'AMMUNITION_MANUAL', 'Vérifiez explicitement la compatibilité de cette munition avec l’arme.'],
  [error => ['FICHE_SYNC_STALE','fiche-plan-stale'].includes(error?.code), 'La séance a changé depuis l’aperçu : relisez les fiches avant d’appliquer.'],
  [error => error?.name === 'ResolutionError' && error.code === 'INVALID_ROLL', 'Le jet doit être un nombre de 1 à 100 (00 = 100).'],
  [error => error?.status === 'stale' || error?.code === 'RESOLUTION_STALE' || /périm/i.test(error?.message || ''), 'La partie a changé depuis le calcul : recalculez.'],
  [error => /^Fonction Store indisponible/.test(error?.message || ''), 'Cette action n’est pas disponible dans cette version.'],
  [error => /^Profil introuvable pour l[’']entrée/.test(error?.message || ''), 'Un profil de cette rencontre a été supprimé : retirez-le de la composition.'],
  [error => /Une autre scène est déjà active ou suspendue/.test(error?.message || ''), 'Une rencontre est déjà en cours ou suspendue : supprimez-la ou reprenez-la d’abord.'],
  [error => /^(Scène active requise|Aucune scène active)/.test(error?.message || ''), 'Lancez une rencontre d’abord.'],
  [error => /^Aucun profil à ajouter/.test(error?.message || ''), 'Ce profil n’existe plus dans la bibliothèque.'],
  [error => /^Rencontre d’origine introuvable/.test(error?.message || ''), 'La rencontre d’origine n’existe plus : supprimez le combat associé, puis relancez une rencontre.'],
  [error => /^La rencontre n’a plus aucun combattant/.test(error?.message || ''), 'La rencontre n’a plus aucun combattant : complétez sa composition avant de recommencer.'],
  [error => /^Aucun combat à recommencer/.test(error?.message || ''), 'Aucun combat en cours à recommencer.'],
  [error => error?.name === 'QuotaExceededError' || /QuotaExceeded|IndexedDB indisponible|Persistance non prête/i.test(error?.message || ''), 'Stockage du navigateur plein ou bloqué : exportez une sauvegarde, puis libérez de l’espace.'],
  [error => error?.name === 'MigrationError' && /future/i.test(error.message || ''), 'Cette sauvegarde vient d’une version plus récente de l’outil : mettez l’application à jour.'],
  [error => error?.name === 'MigrationError' || error instanceof SyntaxError, FILE_INVALID]
];

/** Erreur dont le message est déjà rédigé pour le MJ. */
export function userError(message) {
  const error = new Error(message);
  error.userFacing = true;
  return error;
}

/** Phrase à afficher pour `error` ; `fallback` dit ce qui a échoué et quoi faire. */
export function userMessage(error, fallback = 'L’action a échoué : réessayez.') {
  if (error?.userFacing && error.message) return error.message;
  const known = KNOWN_ERRORS.find(([matches]) => matches(error));
  if (known) return known[1];
  console.error(error);
  return fallback;
}

/** Même phrase, précédée d'un contexte (« Rappel non enregistré : … »). */
export function contextMessage(prefix, error, fallback) {
  const message = userMessage(error, fallback);
  return `${prefix} : ${message.charAt(0).toLocaleLowerCase('fr-FR')}${message.slice(1)}`;
}
