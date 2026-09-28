import { ENGINES } from '../data/keyword-engines.js';
import { normalizeQualities } from './quality-normalization.js';

export const PLANCHER_TOUCHE = 1;
export const FACTEUR_INOFFENSIVE = 2;

const MINUS = '−';
const MINUS_VARIANTS = /[\u2010-\u2015\u2212\uFE63\uFF0D]/g;
// `BF+4`, `+BF+4`, `BF`, `BF-1` (English `SB+4` too), or a plain integer (`4`, `+9`).
const WEAPON_DAMAGE_PATTERN = /^\+?(?:(?:BF|SB)(?:([+-])(\d+))?|([+-]?\d+))$/;

const finiteNumber = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * Weapon damage as written on a profile. Returns null when nothing is written,
 * `{ kind: 'fixed', bonus }` for a number, `{ kind: 'strength', bonus }` for
 * `BF±n`, and `{ kind: 'unknown' }` for anything else (dice, prose…), which is
 * never turned into a number. `text` is the trimmed original.
 */
export function parseWeaponDamage(value) {
  // NaN counted as 0 before formulas existed (`Number(x) || 0`): still nothing written.
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { kind: 'fixed', bonus: value, text: String(value) } : { kind: 'unknown', text: String(value) };
  }
  const text = String(value).trim();
  if (!text) return null;
  const match = text.replace(MINUS_VARIANTS, '-').replace(/\s+/g, '').toUpperCase().match(WEAPON_DAMAGE_PATTERN);
  if (!match) return { kind: 'unknown', text };
  const [, sign, digits, integer] = match;
  const bonus = integer !== undefined ? Number(integer) : (digits === undefined ? 0 : Number(digits) * (sign === '-' ? -1 : 1));
  if (!Number.isSafeInteger(bonus)) return { kind: 'unknown', text };
  return { kind: integer !== undefined ? 'fixed' : 'strength', bonus, text };
}

/**
 * Canonical `{ damage, damageFormula }` pair of an action. `damage` stays a
 * number; `damageFormula` keeps the original text of a non-numeric expression
 * (null otherwise), and `damage` then holds its constant term (`BF+4` → 4,
 * unknown → 0).
 * - A string `damage` is typed input: it replaces any stored formula.
 * - A stored formula stands while `damage` still equals its constant term; a
 *   different number comes from a writer unaware of formulas (an older version,
 *   a numeric field) and wins.
 */
export function normalizeDamageFields({ damage, damageFormula } = {}) {
  if (typeof damage === 'string') {
    const number = Number(damage);
    if (Number.isFinite(number)) return { damage: number, damageFormula: null };
    const parsed = parseWeaponDamage(damage);
    if (parsed.kind === 'fixed') return { damage: parsed.bonus, damageFormula: null };
    return { damage: parsed.kind === 'strength' ? parsed.bonus : 0, damageFormula: parsed.text };
  }
  const number = Number.isFinite(Number(damage)) ? Number(damage) || 0 : 0;
  const parsed = typeof damageFormula === 'string' ? parseWeaponDamage(damageFormula) : null;
  if (!parsed) return { damage: number, damageFormula: null };
  const constant = parsed.kind === 'unknown' ? 0 : parsed.bonus;
  if (damage !== undefined && damage !== null && number !== constant) return { damage: number, damageFormula: null };
  return { damage: constant, damageFormula: parsed.kind === 'fixed' ? null : parsed.text };
}

/** What an action deals, for evaluation: its formula text, else its number. */
export function actionWeaponDamage(action) {
  const { damage, damageFormula } = normalizeDamageFields(action || {});
  return damageFormula ?? damage;
}

/** An action carries damage when it has a formula or a non-zero amount (normalizeAction stores « none » as 0). */
export function actionHasDamage(action) {
  const { damage, damageFormula } = normalizeDamageFields(action || {});
  return Boolean(damageFormula) || damage !== 0;
}

/** Bonus de Force : ⌊F/10⌋, sinon un `BF` saisi tel quel ; null si inconnu. */
export function strengthBonusOf(caracs) {
  const strength = finiteNumber(caracs?.F);
  if (strength !== null) return Math.floor(strength / 10);
  const bonus = finiteNumber(caracs?.BF);
  return bonus === null ? null : Math.floor(bonus);
}

/**
 * Weapon damage of one attack: `{ status: 'resolved', value, … }`, or
 * `{ status: 'manual', reason }` when the engine must not compute it — an
 * unknown expression, or `BF` without the attacker's Strength. Nothing written
 * counts as 0, as before.
 */
export function evaluateWeaponDamage(value, strengthBonus = null) {
  const parsed = parseWeaponDamage(value);
  if (!parsed) return { status: 'resolved', kind: 'fixed', text: '', bonus: 0, value: 0 };
  if (parsed.kind === 'fixed') return { status: 'resolved', kind: 'fixed', text: parsed.text, bonus: parsed.bonus, value: parsed.bonus };
  if (parsed.kind === 'unknown') return { status: 'manual', kind: 'unknown', text: parsed.text, reason: 'expression-non-reconnue' };
  if (!Number.isFinite(strengthBonus)) return { status: 'manual', kind: 'strength', text: parsed.text, bonus: parsed.bonus, reason: 'force-inconnue' };
  return { status: 'resolved', kind: 'strength', text: parsed.text, bonus: parsed.bonus, strengthBonus, value: strengthBonus + parsed.bonus };
}

const signedMinus = value => (value < 0 ? `${MINUS}${Math.abs(value)}` : String(value));

/** Short label of an evaluation: `4`, `BF+4 = 7`, `BF+4 : F inconnue`, `1d10 : à arbitrer`. */
export function formatWeaponDamage(evaluation) {
  if (!evaluation) return '';
  if (evaluation.kind === 'fixed') return signedMinus(evaluation.value);
  if (evaluation.status === 'resolved') return `${evaluation.text} = ${signedMinus(evaluation.value)}`;
  return `${evaluation.text} : ${evaluation.reason === 'force-inconnue' ? 'F inconnue' : 'à arbitrer'}`;
}

/** Label of an action's damage for an attacker's characteristics (see formatWeaponDamage). */
export function describeWeaponDamage(action, caracs) {
  return formatWeaponDamage(evaluateWeaponDamage(actionWeaponDamage(action), strengthBonusOf(caracs)));
}

/**
 * `weaponDamage` is a number or an expression (`BF+4`); `strengthBonus` is the
 * attacker's, needed by `BF`. Returns null when the weapon damage cannot be
 * computed automatically (see evaluateWeaponDamage).
 */
export function computeDamage({ weaponDamage = 0, strengthBonus = null, sl = 0, roll = 0, targetToughnessBonus = 0, targetArmour = 0, qualities = [] } = {}) {
  const weapon = evaluateWeaponDamage(weaponDamage, strengthBonus);
  if (weapon.status !== 'resolved') return null;
  const normQualities = normalizeQualities(qualities);

  const activeEngines = [];
  normQualities.forEach(q => {
    const engineDef = ENGINES[q.id];
    if (engineDef) {
      activeEngines.push({ quality: q, engine: engineDef });
    }
  });

  // 1. Modificateurs de dégâts bruts (Pointue: +1, Imprécise: -1)
  let baseDamage = weapon.value;
  activeEngines.forEach(ae => {
    if (ae.engine.engine === 'modify-damage' && ae.engine.params?.bonus) {
      baseDamage += ae.engine.params.bonus;
    }
  });

  // 2. Percutante / Impact : ajoute le dé d'unités du jet
  const unitsDie = Number(roll) > 0 ? (Number(roll) % 10 || 10) : 0;
  const isPercutante = activeEngines.some(ae => ae.engine.engine === 'add-units-die');
  const bonusPercutante = isPercutante ? unitsDie : 0;

  // 3. Dévastatrice : utilise max(unitsDie, SL) pour les SL de dégâts
  const isDevastatrice = activeEngines.some(ae => ae.engine.engine === 'best-of-units-or-sl');
  let effectiveSL = Number(sl) || 0;
  if (isDevastatrice && unitsDie > effectiveSL) {
    effectiveSL = unitsDie;
  }

  // 4. Inoffensive : PA x 2, pas de plancher
  const isInoffensive = activeEngines.some(ae => ae.quality.id === 'inoffensive');
  const paEffectif = (Number(targetArmour) || 0) * (isInoffensive ? FACTEUR_INOFFENSIVE : 1);
  const be = Number(targetToughnessBonus) || 0;
  const absorption = be + paEffectif;

  const totalRaw = baseDamage + effectiveSL + bonusPercutante;
  const net = totalRaw - absorption;

  let finalDamage = net;
  let isPlancher = false;

  if (net > 0) {
    finalDamage = net;
  } else if (isInoffensive) {
    finalDamage = 0;
  } else {
    finalDamage = PLANCHER_TOUCHE;
    isPlancher = true;
  }

  return {
    weaponDamage: baseDamage,
    // Part of weaponDamage that is the attacker's Strength Bonus (`BF+4`).
    ...(weapon.kind === 'strength' ? { strengthBonus: weapon.strengthBonus } : {}),
    sl: effectiveSL,
    bonusPercutante,
    be,
    targetArmour: Number(targetArmour) || 0,
    paEffectif,
    absorption,
    net,
    finalDamage,
    isInoffensive,
    isPlancher,
    activeQualities: normQualities
  };
}

const MODIFIER_LABELS = { pointue: 'Pointue', imprecise: 'Imprécise' };

/** Readable terms of a computeDamage result, for the UI (`8 arme + 4 DR … = 12`, `BF 3 + 4 arme …`). */
export function damageBreakdown(damage) {
  if (!damage || typeof damage !== 'object') return { terms: [], total: 0, notes: [] };
  const engines = normalizeQualities(damage.activeQualities || [])
    .map(quality => ({ quality, engine: ENGINES[quality.id] }))
    .filter(item => item.engine);
  const has = engine => engines.some(item => item.engine.engine === engine);
  const terms = [];
  const notes = [];
  const add = (value, label, extra = {}) => {
    const number = Number(value) || 0;
    terms.push({ sign: number < 0 ? MINUS : '+', value: Math.abs(number), label, ...extra });
  };
  const subtract = (value, label) => {
    const number = Number(value) || 0;
    terms.push({ sign: number < 0 ? '+' : MINUS, value: Math.abs(number), label });
  };

  // `BF+4` : le BF de l'attaquant se lit « BF 3 », puis la part propre à l'arme.
  const strengthBonus = Number.isFinite(damage.strengthBonus) ? damage.strengthBonus : null;
  if (strengthBonus !== null) add(strengthBonus, 'BF', { labelFirst: true });
  add((Number(damage.weaponDamage) || 0) - (strengthBonus ?? 0), 'arme');
  // Pointue / Imprécise are already folded into the weapon damage by computeDamage.
  engines.filter(item => item.engine.engine === 'modify-damage' && item.engine.params?.bonus).forEach(item => {
    const bonus = item.engine.params.bonus;
    notes.push(`${MODIFIER_LABELS[item.quality.id] || item.quality.id} ${bonus > 0 ? '+' : MINUS}${Math.abs(bonus)} inclus dans l’arme`);
  });
  const devastatrice = has('best-of-units-or-sl');
  add(damage.sl, devastatrice ? 'DR (Dévastatrice)' : 'DR');
  if (devastatrice) notes.push('Dévastatrice : meilleur du DR et du dé des unités');
  if (has('add-units-die')) add(damage.bonusPercutante, 'Percutante');
  subtract(damage.be, 'BE');
  subtract(damage.paEffectif, damage.isInoffensive ? `PA (×${FACTEUR_INOFFENSIVE})` : 'PA');
  if (damage.isInoffensive) notes.push(`Inoffensive : PA ×${FACTEUR_INOFFENSIVE}, pas de minimum`);
  if (damage.isPlancher) notes.push(`minimum ${PLANCHER_TOUCHE}`);
  return { terms, total: Number(damage.finalDamage) || 0, notes };
}

/** One-line formula; subtractions use U+2212 and a floored result says so. */
export function formatDamageFormula(damage) {
  const { terms, total } = damageBreakdown(damage);
  if (!terms.length) return '';
  const body = terms.map((term, index) => {
    const text = term.labelFirst ? `${term.label} ${term.value}` : `${term.value} ${term.label}`;
    if (index === 0) return term.sign === MINUS ? `${MINUS}${text}` : text;
    return `${term.sign} ${text}`;
  }).join(' ');
  // Inoffensive : un net négatif est ramené à 0, sans le minimum habituel.
  const sum = terms.reduce((acc, term) => acc + (term.sign === MINUS ? -term.value : term.value), 0);
  const note = damage.isPlancher ? ` (minimum ${PLANCHER_TOUCHE})` : (damage.isInoffensive && sum < total ? ' (pas de minimum)' : '');
  return `${body} = ${total}${note}`;
}
