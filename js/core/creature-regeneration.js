// Régénération des créatures (lot T8) : Trait Regeneration (E0-T-044) et sort Regenerate, qui donne le même Trait.
// Module pur : lit le Trait et le registre des Blessures Critiques du participant, et rend un plan (soin, critique à guérir, points non
// résolus, rappels, reçu) à partir du d10 saisi. Il n'écrit rien : le MJ applique le soin et la guérison du critique.

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const LABEL = 'Régénération';
const NAMES = new Set(['regeneration', 'regenerate']);
const NOTE = 'Début de Round : 1d10 Blessures regagnées ; un 10 guérit une Blessure Critique ; à zéro Blessure, 8 ou plus rend une Blessure ; jamais les Blessures ni les Blessures Critiques causées par le feu.';

/** « Regeneration » → `{ key: 'regeneration', name, detail }` ; `null` si ce n'est pas la Régénération. */
export function parseRegenerationTrait(trait) {
  const text = typeof trait === 'string' ? trait : trait?.name ?? trait?.nom ?? '';
  const match = /^\s*([^(]+?)\s*(?:\(\s*([^)]*)\s*\))?\s*$/.exec(String(text));
  if (!match || !NAMES.has(fold(match[1]))) return null;
  return { key: 'regeneration', name: match[1].trim(), detail: (match[2] ?? '').trim() };
}

const traitsOf = participant => [
  ...(Array.isArray(participant?.traits) ? participant.traits : []),
  ...(Array.isArray(participant?.extensions?.traits) ? participant.extensions.traits : [])
].map(parseRegenerationTrait).filter(Boolean);

/** Vrai si le participant porte le Trait. */
export const hasRegeneration = participant => traitsOf(participant).length > 0;

const isCount = value => Number.isInteger(value) && value >= 0;

/**
 * Plan de Régénération pour un début de Round.
 * `options` : `roll` (d10 saisi, 1 à 10, obligatoire), `fireWounds` (Blessures manquantes causées par le feu, non régénérables),
 * `fireCriticalIds` (critiques causés par le feu, jamais guéris), `criticalId` (critique à guérir sur un 10, sinon le premier admissible).
 */
export function planRegeneration(participant, options = {}) {
  const plan = { key: 'regeneration', label: LABEL, available: false, heal: null, criticalHeal: null, unresolved: [], reminders: [] };
  const finish = () => {
    plan.available = plan.unresolved.length === 0;
    return { ...plan, receipt: { ability: LABEL, heal: plan.heal ? `${plan.heal.amount} Blessure(s)` : null, criticalHeal: plan.criticalHeal?.name ?? plan.criticalHeal?.id ?? null, blocked: plan.unresolved.slice() } };
  };
  if (!hasRegeneration(participant)) {
    plan.unresolved.push(`${LABEL} : Trait absent du participant.`);
    return finish();
  }
  const roll = options.roll;
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) {
    plan.unresolved.push(`${LABEL} : d10 de début de Round à saisir (1 à 10).`);
    plan.reminders.push(NOTE);
    return finish();
  }
  const hp = participant?.hp;
  const maxHp = participant?.maxHp;
  const fire = isCount(options.fireWounds) ? options.fireWounds : 0;
  const fireCriticals = new Set(Array.isArray(options.fireCriticalIds) ? options.fireCriticalIds : []);
  if (!isCount(hp) || !isCount(maxHp)) {
    plan.unresolved.push(`${LABEL} : Blessures actuelles ou maximales inconnues, soin à saisir.`);
  } else if (hp === 0) {
    plan.heal = { amount: roll >= 8 ? Math.min(1, Math.max(0, maxHp - fire)) : 0, roll, cause: `${LABEL} (à zéro Blessure)` };
  } else {
    plan.heal = { amount: Math.max(0, Math.min(roll, maxHp - hp - fire)), roll, cause: LABEL };
  }
  if (roll === 10) {
    const records = Array.isArray(participant?.extensions?.v5?.criticalWounds) ? participant.extensions.v5.criticalWounds : [];
    const eligible = records.filter(record => record?.id && !fireCriticals.has(record.id));
    const chosen = options.criticalId === undefined ? eligible[0] : records.find(record => record?.id === options.criticalId);
    if (options.criticalId !== undefined && !chosen) plan.unresolved.push(`${LABEL} : Blessure Critique « ${options.criticalId} » introuvable dans le registre.`);
    else if (chosen && fireCriticals.has(chosen.id)) plan.unresolved.push(`${LABEL} : une Blessure Critique causée par le feu ne se régénère pas.`);
    else if (chosen) plan.criticalHeal = { id: chosen.id, name: chosen.name ?? null, proposed: options.criticalId === undefined };
    else plan.reminders.push(records.length ? 'Régénération : un 10, mais seules des Blessures Critiques de feu restent, aucune ne guérit.' : 'Régénération : un 10, mais aucune Blessure Critique à guérir.');
  }
  if (fire > 0) plan.reminders.push(`Régénération : ${fire} Blessure(s) de feu ne se régénèrent pas.`);
  plan.reminders.push(NOTE);
  return finish();
}

/** Rappel de Régénération d'un participant, sans doublon (affichage de fiche). */
export function regenerationReminders(participant) {
  return hasRegeneration(participant) ? [`${LABEL} : ${NOTE}`] : [];
}
