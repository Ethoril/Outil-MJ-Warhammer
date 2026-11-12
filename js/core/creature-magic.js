// Magie des créatures (lot T7) : Résistance à la Magie, Lanceur de sorts, Béni, Miracles, Champion, Marques du Chaos, Corruption,
// Corruption mentale, Mutation, Dressé.
// Module pur : lit les Traits (texte « Nom (précision) », noms anglais ou français) et rend un plan (tests, modificateurs, effets,
// points non résolus, rappels, reçu) sans rien écrire. Seule la Résistance à la Magie est lue par un service (sorts) ; le reste est assisté.

import { creatureCastingBases } from './creature-magic-traits.js';
export { parseCreatureMagicTrait, creatureMagicTraits, magicResistanceReduction, planCreatureMagic, creatureMagicReminders, creatureCastingBases } from './creature-magic-traits.js';
import { resolveCastingSkill } from './v5-magic-casting.js';
import { resolveChannellingSkill } from './v5-magic-channelling.js';

/**
 * Actions de magie V5 (Focalisation, Dissipation, Incantation) d'un participant ; vide s'il n'est pas lanceur.
 * `allow.channel` / `allow.cast` : false quand une forme animale les interdit. Un Lanceur de sorts de bestiaire est lanceur d'office ;
 * la base affichée est celle que le Test emploie vraiment : la compétence imprimée si elle existe, sinon la base du Trait
 * (Focalisation Volonté+10, Langue magique Intelligence+10).
 */
export function magicActionsFor(participant, allow = {}) {
  const casting = creatureCastingBases(participant);
  const isMagicUser = Boolean(
    casting
    || (participant?.spells && participant.spells.length > 0)
    || (participant?.skills || []).some(s => /focalisation|channelling|magick/i.test(s.name || s.nom || ''))
    || participant?.extensions?.v5?.channelling
    || participant?.extensions?.v5?.magic
  );
  if (!isMagicUser) return [];
  const FM = resolveChannellingSkill(participant).score || 50;
  const tongue = resolveCastingSkill(participant).score || Number(participant.caracs?.Int) || 50;
  return [
    ...(allow.channel !== false ? [{ id: 'v5-magic:channelling', note: 'Focalisation V5', type: 'channelling', attr: 'FM', base: FM, mod: 0, qualities: [] }] : []),
    { id: 'v5-magic:dispel', note: 'Dissipation persistante V5', type: 'dispel', attr: 'Int', base: tongue, mod: 0, qualities: [] },
    ...(allow.cast !== false ? [{ id: 'v5-magic:cast', note: 'Incantation V5', type: 'cast', attr: 'Int', base: tongue, mod: 0, qualities: [] }] : [])
  ];
}
