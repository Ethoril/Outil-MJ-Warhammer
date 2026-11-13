// Chargeur de bestiaire partagé (COMP-ZONESNON-06, 13/11) : une seule instance pour toute l'application, pour que
// l'index et chaque livre ne soient téléchargés et lus qu'une fois, quel que soit l'écran qui les demande (invocations L06,
// familiers des fiches, bibliothèque du bestiaire, montures de la réserve). Un échec n'est pas mémorisé (voir
// createBestiaryLoader) : chaque point d'usage reçoit l'erreur et la signale comme avant, et la demande suivante réessaie.
import { createBestiaryLoader } from './bestiary-profiles.js';

export const fetchBestiaryJson = async path => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} : ${response.status}`);
  return response.json();
};

let shared = null;

/** L'instance unique, créée au premier appel. */
export function sharedBestiaryLoader() {
  if (!shared) shared = createBestiaryLoader(fetchBestiaryJson);
  return shared;
}
