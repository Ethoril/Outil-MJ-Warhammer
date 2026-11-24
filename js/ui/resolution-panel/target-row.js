// LOT G11 · ligne « Cible » de la résolution : avec beaucoup de combattants actifs, seules les cibles
// prioritaires restent en puces — la cible choisie, puis les adversaires engagés avec l'acteur, puis les
// alliés engagés — et les autres passent dans le menu « Autres cibles (…) ». La ligne ne défile ainsi
// jamais en largeur, même à vingt combattants (recette j-vingt).

const SHOWN_WHEN_MANY = 4;

/**
 * @param {object} args
 * @param {Array<object>} args.adversaries participants du camp opposé (ordre d'origine)
 * @param {Array<object>} args.allies participants du même camp (ordre d'origine)
 * @param {string|null} args.targetId id de la cible choisie (peut être null ou l'acteur lui-même)
 * @param {string|null} args.actorId id de l'acteur (hors du périmètre : jamais en puce ni caché)
 * @param {Array<string>} [args.engagedIds] ids engagés en mêlée avec l'acteur
 * @param {number} [args.max=8] au-delà de ce nombre de cibles, on passe en sous-ensemble prioritaire
 * @returns {{ shown: Array<{ participant: object, group: 'Adversaires'|'Alliés' }>, hidden: Array<object> }}
 */
export function targetRowModel({ adversaries = [], allies = [], targetId = null, actorId = null, engagedIds = [], max = 8 } = {}) {
  const pool = [
    ...adversaries.map(participant => ({ participant, group: 'Adversaires' })),
    ...allies.map(participant => ({ participant, group: 'Alliés' }))
  ].filter(entry => entry.participant.id !== actorId);
  if (pool.length <= max) return { shown: pool, hidden: [] };
  const engaged = new Set(engagedIds);
  const byId = new Map(pool.map(entry => [entry.participant.id, entry]));
  const priority = [];
  const chosen = targetId != null ? byId.get(targetId) : null;
  if (chosen) priority.push(chosen);
  for (const entry of pool) if (entry.group === 'Adversaires' && engaged.has(entry.participant.id) && !priority.includes(entry)) priority.push(entry);
  for (const entry of pool) if (entry.group === 'Alliés' && engaged.has(entry.participant.id) && !priority.includes(entry)) priority.push(entry);
  const shown = priority.slice(0, SHOWN_WHEN_MANY);
  const shownIds = new Set(shown.map(entry => entry.participant.id));
  const hidden = pool.filter(entry => !shownIds.has(entry.participant.id)).map(entry => entry.participant);
  return { shown, hidden };
}
