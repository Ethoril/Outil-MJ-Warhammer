// Retour de Forme bestiale (ARCH-03) : module feuille, sorti pour casser un cycle d'imports.
/** Éléments de la fiche que la transformation remplace ou lâche, restitués au retour. */
export const FORM_FIELDS = Object.freeze(['armor', 'armorLocations', 'protection', 'equipment', 'skills', 'talents']);
/**
 * Retour à la forme normale après Forme bestiale.
 * RÈGLE V5 :
 * - Les dégâts subis sous forme de bête restent subis au retour.
 * - Les Coups Critiques subis sous forme de bête sont reportés au retour.
 */
export function revertBeastForm(beastParticipant) {
  if (!beastParticipant?.extensions?.v5?.beastForm) {
    throw new Error('Le participant n’est pas sous Forme bestiale');
  }

  const data = beastParticipant.extensions.v5.beastForm;
  const original = data.originalParticipant;
  if (!original || !original.caracs || typeof original.caracs !== 'object' || Array.isArray(original.caracs)) {
    throw new Error('Forme bestiale invalide : profil d’origine manquant.');
  }
  const next = structuredClone(beastParticipant);

  // Calculer les dégâts subis sous forme de bête
  const currentBeastHp = Number(next.hp) || 0;
  const initialBeastHp = Number(data.initialBeastHp) || 12;
  const woundsLostInBeastForm = Math.max(0, initialBeastHp - currentBeastHp);

  // Restaurer le profil normal
  next.caracs = structuredClone(original.caracs);
  next.baseCaracs = structuredClone(data.originalBaseCaracs || original.baseCaracs);
  next.extensions.v5.baseCaracs = structuredClone(next.baseCaracs);
  next.extensions.v5.baseTraits = structuredClone(data.originalBaseTraits || original.traits);
  next.M = original.M;
  next.caracs.M = original.M ?? original.caracs?.M ?? 4;
  next.movement = next.caracs.M;
  next.traits = structuredClone(original.traits);
  next.maxHp = original.maxHp;

  // Équipement, armure, compétences et talents retrouvés (les formes enregistrées avant ce correctif n'ont rien à rendre).
  if (original.fields) {
    for (const key of FORM_FIELDS) {
      if (Object.hasOwn(original.fields, key)) next[key] = structuredClone(original.fields[key]);
      else delete next[key];
    }
    const savedBase = original.baseArmor || {};
    if (savedBase.extension !== null && savedBase.extension !== undefined) next.extensions.v5.baseArmor = structuredClone(savedBase.extension); else delete next.extensions.v5.baseArmor;
    if (savedBase.flat !== null && savedBase.flat !== undefined) next.baseArmor = structuredClone(savedBase.flat); else delete next.baseArmor;
  }

  // Dégâts subis restent subis
  const finalHp = Math.max(0, original.hp - woundsLostInBeastForm);
  next.hp = Math.min(original.maxHp, finalHp);

  // Critiques subis sous forme de bête sont reportés
  const crits = Array.isArray(data.criticalWoundsSuffered) ? data.criticalWoundsSuffered : [];
  if (crits.length > 0) {
    next.criticals = [...(next.criticals || []), ...crits];
  }

  // Conserver les sources encore actives, jamais un ancien snapshot d'effets expirés.
  // Reprise des anciennes formes : leurs traits de profil avaient aussi été rangés dans temporaryTraits.
  const baseTraits = next.extensions.v5.baseTraits || [];
  const formTraits = new Set(data.formTraits || [...(data.beastProfile?.traits || []), ...(data.optionalTraits || [])]);
  const originalTemporary = new Set(data.originalTemporaryTraits || []);
  const temporary = next.extensions.v5.temporaryTraits || [];
  const activeTraits = (next.extensions.v5.spellEffects || []).filter(effect => !effect.beastFormMarker).flatMap(effect => effect.traits || []);
  const incidentTraits = (next.extensions.v5.miscastEffects || []).flatMap(effect => effect.traitsGained || []);
  next.extensions.v5.temporaryTraits = [...new Set([
    ...temporary.filter(trait => originalTemporary.has(trait) || !formTraits.has(trait) && !baseTraits.includes(trait)),
    ...activeTraits, ...incidentTraits
  ])];
  next.traits = [...new Set([...baseTraits, ...next.extensions.v5.temporaryTraits])];
  delete next.extensions.v5.beastForm;

  return {
    status: 'reverted',
    participant: next,
    woundsCarriedOver: woundsLostInBeastForm,
    criticalsCarriedOver: crits
  };
}
