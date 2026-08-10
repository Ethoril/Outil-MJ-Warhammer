import { ENGINES } from '../data/keyword-engines.js';
import { slugify } from './keywords.js';

export const PLANCHER_TOUCHE = 1;
export const FACTEUR_INOFFENSIVE = 2;

export function computeDamage({ weaponDamage = 0, sl = 0, roll = 0, targetToughnessBonus = 0, targetArmour = 0, qualities = [] } = {}) {
  const normQualities = Array.isArray(qualities)
    ? qualities.map(q => typeof q === 'string' ? { id: slugify(q) } : { ...q, id: slugify(q.id || q.name) })
    : [];

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
