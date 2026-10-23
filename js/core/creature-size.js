// Taille (lot T10) : Trait Size (E0-T-045, L06 pp.360-361 ; variante Imperial Zoo E0-T-091 écartée, arbitrages Q04/Q08).
// Module pur : lit la catégorie du participant et rend le barème du livre (bonus de dégâts en mêlée, poids au surnombre,
// écart avec un adversaire, Blessures sur demande). Rien ne s'écrit ; l'échelle à sept crans est celle du moteur (Petite 2 … Monstrueuse 6).
import { creatureWounds } from './v5-magic-arbitrations.js';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const LABEL = 'Taille';
const NAMES = new Set(['size', 'taille']);
export const SIZE_RANKS = Object.freeze({ small: 2, average: 3, large: 4, enormous: 5, monstrous: 6 });
const SIZE_LABELS = Object.freeze({ small: 'Petite', average: 'Moyenne', large: 'Grande', enormous: 'Énorme', monstrous: 'Monstrueuse' });
const SIZE_WORDS = Object.freeze({
  small: 'small', petite: 'small', petit: 'small',
  average: 'average', moyenne: 'average', moyen: 'average',
  large: 'large', grande: 'large', grand: 'large',
  enormous: 'enormous', enorme: 'enormous',
  monstrous: 'monstrous', monstrueuse: 'monstrous', monstrueux: 'monstrous'
});
// Page 360 : modificateur de dégâts en mêlée et nombre de créatures comptées au surnombre.
const SIZE_TABLE = Object.freeze({
  small: { damage: 'none', weight: 1 },
  average: { damage: 'none', weight: 1 },
  large: { damage: 'bf', weight: 2 },
  enormous: { damage: 'bf', weight: 3 },
  monstrous: { damage: 'twiceBf', weight: 4 }
});
const NOTE = 'Taille V5 (p. 360) : bonus de dégâts en mêlée Grande/Énorme +BF, Monstrueuse +2 BF (ni tir, ni attaque gratuite, ni attaque bonus) ; poids au surnombre 1, 1, 2, 3, 4 ; un profil de PNJ imprimé inclut déjà ces dégâts.';
const SMALL_NOTE = 'Petit : lecture V5 du livre (dégâts normaux) ; le Petit homebrew V4 local reste géré à part, sans migration.';

const traitText = trait => (typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '');
const traitListOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
];
const describe = key => ({ key, rank: SIZE_RANKS[key], label: SIZE_LABELS[key] });

/** « Size (Large) » / « Taille (Énorme) » (suite éventuelle ignorée) → `{ key, rank, label }` ; `null` sinon. */
export function parseSizeTrait(trait) {
  const match = /^\s*([^(]+?)\s*\(\s*([^)]*?)\s*\)/.exec(traitText(trait));
  if (!match || !NAMES.has(fold(match[1]))) return null;
  const key = SIZE_WORDS[fold(match[2])];
  return key ? describe(key) : null;
}

/** Taille du participant : Trait, sinon champ `size` (profil), sinon Moyenne supposée (`assumed: true`). */
export function creatureSizeOf(participant) {
  const fromTrait = traitListOf(participant).map(parseSizeTrait).find(Boolean);
  if (fromTrait) return { ...fromTrait, assumed: false };
  const fromField = SIZE_WORDS[fold(participant?.size ?? participant?.profile?.size)];
  if (fromField) return { ...describe(fromField), assumed: false };
  return { ...describe('average'), assumed: true };
}

const hasExplicitSize = participant => !creatureSizeOf(participant).assumed;
const bonusForce = participant => {
  const force = participant?.caracs?.F;
  return force === null || force === undefined || force === '' || !Number.isFinite(Number(force)) ? null : Math.floor(Number(force) / 10);
};

/**
 * Plan de Taille : catégorie, dégâts de mêlée, poids au surnombre, comparaison avec `options.opponent`, Blessures sur demande.
 * Options : `printedProfile` (défaut vrai : dégâts déjà inclus, aucun ajout), `opponent`, `recomputeWounds`.
 */
export function planCreatureSize(participant, options = {}) {
  const size = creatureSizeOf(participant);
  const row = SIZE_TABLE[size.key];
  const printed = options.printedProfile !== false;
  const plan = { key: 'size', label: LABEL, available: false, size, damage: { kind: row.damage, bonus: 0, included: printed }, outnumberWeight: row.weight, versus: null, wounds: null, unresolved: [], reminders: [NOTE] };
  if (size.assumed) plan.reminders.push('Taille : aucune catégorie imprimée, Moyenne supposée.');
  if (size.key === 'small') plan.reminders.push(SMALL_NOTE);

  if (!printed && row.damage !== 'none') {
    const bf = bonusForce(participant);
    if (bf === null) plan.unresolved.push('Taille : Force requise pour le bonus de dégâts.');
    else plan.damage.bonus = row.damage === 'twiceBf' ? 2 * bf : bf;
  }
  if (options.opponent) {
    const other = creatureSizeOf(options.opponent);
    const gap = Math.abs(size.rank - other.rank);
    const larger = gap === 0 ? null : size.rank > other.rank ? 'self' : 'opponent';
    plan.versus = {
      gap,
      larger,
      opponentSize: other.label,
      fearInputs: larger === 'self' ? { actorSize: size.rank, targetSize: other.rank, needsAggressive: true } : null
    };
    if (gap > 0 && (size.assumed || other.assumed)) plan.reminders.push('Taille : une des deux catégories est supposée, à confirmer avant l’écart.');
  }
  if (options.recomputeWounds) {
    try {
      const result = creatureWounds({ caracs: participant?.caracs ?? {}, size: size.key });
      plan.wounds = { value: result.wounds, formula: result.formula };
    } catch (error) {
      plan.unresolved.push(`Taille : ${error.message}.`);
    }
  }
  plan.available = plan.unresolved.length === 0;
  return { ...plan, receipt: { ability: LABEL, size: size.label, damage: plan.damage.kind, outnumberWeight: plan.outnumberWeight, blocked: plan.unresolved.slice() } };
}

/** Rappel de Taille d'un participant dont la catégorie est imprimée (affichage de fiche). */
export function sizeReminders(participant) {
  return hasExplicitSize(participant) ? [`${LABEL} : ${NOTE}`] : [];
}
