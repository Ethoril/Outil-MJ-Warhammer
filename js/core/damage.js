export const PLANCHER_TOUCHE = 1;      // une touche réussie inflige toujours au moins ceci
export const FACTEUR_INOFFENSIVE = 2;  // multiplicateur de PA de la qualité Inoffensive

export function computeDamage({ weaponDamage = 0, sl = 0, targetToughnessBonus = 0, targetArmour = 0, qualities = [] } = {}) {
  const isInoffensive = Array.isArray(qualities) && qualities.some(q => q && q.id === 'inoffensive');
  const paEffectif = (Number(targetArmour) || 0) * (isInoffensive ? FACTEUR_INOFFENSIVE : 1);
  const be = Number(targetToughnessBonus) || 0;
  const absorption = be + paEffectif;
  const dmgBase = Number(weaponDamage) || 0;
  const net = dmgBase + Number(sl) - absorption;

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
    weaponDamage: dmgBase,
    sl: Number(sl) || 0,
    be,
    targetArmour: Number(targetArmour) || 0,
    paEffectif,
    absorption,
    net,
    finalDamage,
    isInoffensive,
    isPlancher
  };
}
