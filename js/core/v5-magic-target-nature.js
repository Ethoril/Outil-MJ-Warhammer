/** Nature de la cible (Mort-vivant, Démon, Artificiel, Éthéré) (ARCH-03) : module feuille, sorti pour casser un cycle d'imports. */
import { keywordMatches, participantKeywords, resolveKeyword } from './creature-keywords.js';
export const fold = str => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
/** Désignations de nature : jamais le nom du personnage ni une sous-chaîne d'un rôle. */
function natureLabels(participant) {
  return [
    ...(Array.isArray(participant?.traits) ? participant.traits : []),
    ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : []),
    ...(Array.isArray(participant?.tags) ? participant.tags : []),
    participant?.category || '',
    participant?.species || ''
  ].map(value => fold(typeof value === 'string' ? value : value?.name || value?.nom || value?.id || '').replace(/\s+/g, ' '));
}

// Les parenthèses (valeur du trait, précision de la nature) ne changent pas la désignation.
const UNDEAD_NATURE = /^(?:morts?[- ]?vivants?|undead(?: creatures?)?)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const DAEMON_NATURE = /^(?:demons?|daemons?|demoniaques?|daemonic|sanguinaire)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const CONSTRUCT_NATURE = /^(?:artificiels?|artificielles?|creatures? artificielles?|constructs?|automates?|automata)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;
const ETHEREAL_NATURE = /^(?:etheres?|etherees?|ethereal(?: creatures?)?)(?:\s*\([^)]*\)|\s+\d+\+?)?$/;

/** Le participant porte ce mot-clé de nature ou un descendant (Squelette est un Mort-vivant) : jamais le nom ni un rôle. */
const carriesKeyword = (participant, id) => keywordMatches(participantKeywords(participant).ids, id);

/** Mort-vivant explicite : une haine ou un rôle « Chasseur de morts-vivants » ne suffit pas. */
export function isTargetUndead(participant) {
  return participant?.isUndead === true || natureLabels(participant).some(label => UNDEAD_NATURE.test(label)) || carriesKeyword(participant, 'mort-vivant');
}

/** Démon explicite, y compris les désignations françaises et anglaises déjà admises. */
export function isTargetDaemon(participant) {
  return participant?.isDaemon === true || natureLabels(participant).some(label => DAEMON_NATURE.test(label)) || carriesKeyword(participant, 'demon');
}

/** Artificiel / Construct explicite. */
export function isTargetConstruct(participant) {
  return participant?.isConstruct === true || natureLabels(participant).some(label => CONSTRUCT_NATURE.test(label)) || carriesKeyword(participant, 'artificiel');
}

/** Éthéré explicite. */
export function isTargetEthereal(participant) {
  return participant?.isEthereal === true || natureLabels(participant).some(label => ETHEREAL_NATURE.test(label)) || carriesKeyword(participant, 'etheree');
}

/** Vérifie un trait ou une nature exacte sans faux positif sur une sous-chaîne (ex: « Chasseur de démons »). */
export function hasTargetNatureOrTrait(participant, traitKey) {
  const key = fold(traitKey);
  if (!key) return false;
  if (key === 'demon' || key === 'daemon' || key === 'demoniaque' || key === 'daemonic') return isTargetDaemon(participant);
  if (key === 'mort-vivant' || key === 'mort vivant' || key === 'undead') return isTargetUndead(participant);
  if (key === 'construct' || key === 'artificiel' || key === 'artificielle' || key === 'automate') return isTargetConstruct(participant);
  if (key === 'ethere' || key === 'etheree' || key === 'ethereal') return isTargetEthereal(participant);
  // Un mot-clé du référentiel (nom, alias, ancêtre) : « contre les Peaux-vertes » vise un Orque.
  const keyword = resolveKeyword(traitKey);
  if (keyword && carriesKeyword(participant, keyword.id)) return true;
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?(?:\\s*\\([^)]*\\)|\\s+\\d+\\+?)?$`);
  return natureLabels(participant).some(label => pattern.test(label));
}

/** Nature vivante commune (V5 p.250). Les Blessures et le décès restent propres à chaque effet. */
export function hasLivingMagicNature(participant) {
  return !isTargetUndead(participant) && !isTargetDaemon(participant)
    && !isTargetConstruct(participant) && !isTargetEthereal(participant);
}
