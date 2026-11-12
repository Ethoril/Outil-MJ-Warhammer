/** États verrouillés par un incident magique (ARCH-03) : module feuille, sorti pour casser un cycle d'imports. */
export function isMiscastConditionLocked(participant, state) {
  return (participant?.extensions?.v5?.miscastEffects || []).some(effect => effect.unremovable === true
    && (effect.id === state?.source?.miscastEffectId || (effect.conditionIds || []).includes(state?.id)));
}
