/** Élan V5 d'un participant (ARCH-03) : module feuille, sans import du cœur des règles. */
import { sourceActive } from './v5-talent-source.js';
export const hasMomentum = actor => actor?.extensions?.v5?.hasMomentum === true;
export const withMomentum = (actor, value) => {
  const frenzy=(actor.states||[]).some(s=>s.key==='frenzy'&&sourceActive(s));
  // Livre de base V5 v3 p.183 : sous la Peur, l'Élan est perdu et ne se regagne pas.
  const restricted=(actor.states||[]).some(s=>sourceActive(s)&&(s.restriction==='noMomentumOrAdvantage'||s.restriction==='cannotGainMomentum'&&!frenzy));
  if(value&&restricted)return withMomentum(actor,false);
  return !value&&actor.extensions?.v5?.hasMomentum===undefined?actor:({...actor,extensions:{...(actor.extensions||{}),v5:{...(actor.extensions?.v5||{}),hasMomentum:Boolean(value)}}});
};
