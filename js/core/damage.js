import { ENGINES } from '../data/keyword-engines.js';
import { normalizeQualities } from './quality-normalization.js';

export const PLANCHER_TOUCHE = 1;
export const FACTEUR_INOFFENSIVE = 2;

export function computeDamage({ weaponDamage = 0, sl = 0, roll = 0, targetToughnessBonus = 0, targetArmour = 0, qualities = [] } = {}) {
  const normQualities = normalizeQualities(qualities);

  const activeEngines = [];
  normQualities.forEach(q => {
    const engineDef = ENGINES[q.id];
    if (engineDef) {
      activeEngines.push({ quality: q, engine: engineDef });
    }
  });

  // 1. Modificateurs de dégâts bruts (Pointue: +1, Imprécise: -1)
  let baseDamage = Number(weaponDamage) || 0;
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

const MINUS = '−';

const MODIFIER_LABELS = { pointue: 'Pointue', imprecise: 'Imprécise' };

/** Readable terms of a computeDamage result, for the UI (`8 arme + 4 DR … = 12`). */
export function damageBreakdown(damage) {
  if (!damage || typeof damage !== 'object') return { terms: [], total: 0, notes: [] };
  const engines = normalizeQualities(damage.activeQualities || [])
    .map(quality => ({ quality, engine: ENGINES[quality.id] }))
    .filter(item => item.engine);
  const has = engine => engines.some(item => item.engine.engine === engine);
  const terms = [];
  const notes = [];
  const add = (value, label) => {
    const number = Number(value) || 0;
    terms.push({ sign: number < 0 ? MINUS : '+', value: Math.abs(number), label });
  };
  const subtract = (value, label) => {
    const number = Number(value) || 0;
    terms.push({ sign: number < 0 ? '+' : MINUS, value: Math.abs(number), label });
  };

  add(damage.weaponDamage, 'arme');
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
    const text = `${term.value} ${term.label}`;
    if (index === 0) return term.sign === MINUS ? `${MINUS}${text}` : text;
    return `${term.sign} ${text}`;
  }).join(' ');
  // Inoffensive : un net négatif est ramené à 0, sans le minimum habituel.
  const sum = terms.reduce((acc, term) => acc + (term.sign === MINUS ? -term.value : term.value), 0);
  const note = damage.isPlancher ? ` (minimum ${PLANCHER_TOUCHE})` : (damage.isInoffensive && sum < total ? ' (pas de minimum)' : '');
  return `${body} = ${total}${note}`;
}
