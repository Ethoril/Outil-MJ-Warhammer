/** Effet temporaire à échéance explicite (ARCH-03) : module feuille, sans import. */
export const PHASES = new Set(['startOfTurn','endOfTurn','endOfRound','attackAttempt']);
export const clone = value => structuredClone(value);
export const integer = (value,label,{minimum=0,maximum=Number.MAX_SAFE_INTEGER}={}) => {
  if (!Number.isSafeInteger(value)||value<minimum||value>maximum) throw new TypeError(`${label} invalide`);
  return value;
};
/** A temporary effect keeps its author and target, with an absolute explicit expiry. */
export function createV5TimedEffect(effect,{authorId,targetId,expiry}={}) {
  if(!effect||typeof effect!=='object'||typeof authorId!=='string'||!authorId||typeof targetId!=='string'||!targetId||!expiry||!PHASES.has(expiry.phase))throw new TypeError('Contexte d’échéance incomplet');
  integer(expiry.round,'Round d’échéance');
  if(['startOfTurn','endOfTurn'].includes(expiry.phase)){
    integer(expiry.turn,'Tour d’échéance');
    if(typeof expiry.actorId!=='string'||!expiry.actorId)throw new TypeError('Acteur de l’échéance requis');
  }
  if(expiry.moment!==undefined&&!['beforeEffects','afterEffects'].includes(expiry.moment))throw new TypeError('Instant d’échéance invalide');
  return {...clone(effect),v5Timing:{...(effect.v5Timing||{}),authorId,targetId,expiry:{...clone(expiry),moment:expiry.moment||'afterEffects'}}};
}
