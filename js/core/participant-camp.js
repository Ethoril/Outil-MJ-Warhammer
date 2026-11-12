/** Camp d'un participant (ARCH-03) : module feuille, sorti pour casser un cycle d'imports. */
const CAMP_ALIASES = new Map([
  ['pj', 'pj'], ['pjs', 'pj'], ['joueur', 'pj'], ['joueurs', 'pj'],
  ['allie', 'allie'], ['allies', 'allie'],
  ['ennemi', 'ennemi'], ['ennemis', 'ennemi'], ['hostile', 'ennemi'], ['adversaire', 'ennemi']
]);

/** Canonical camp (`pj`, `allie`, `ennemi`, `neutre`) from free text; a PJ without a camp, or with the default « neutre », is `pj`, unless the MJ chose Neutre (`explicitNeutral`). */
export function normalizeCamp(value, kind, explicitNeutral = false) {
  const text = typeof value === 'string'
    ? value.trim().toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    : '';
  const camp = CAMP_ALIASES.get(text) || 'neutre';
  if (camp === 'neutre' && (!text || (text === 'neutre' && !explicitNeutral)) && kind === 'PJ') return 'pj';
  return camp;
}

/** Camp of a participant: a PJ stays `pj` unless the MJ explicitly set Neutre (`extensions.campExplicit`). */
export function participantCamp(participant) {
  return normalizeCamp(participant?.camp, participant?.kind, participant?.extensions?.campExplicit === true);
}
