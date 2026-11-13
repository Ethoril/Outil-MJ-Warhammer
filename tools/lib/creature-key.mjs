// Clé de créature du chantier images des pions : nom français normalisé du profil (à défaut, nom anglais). Les profils de
// même clé, tous livres confondus, sont une seule créature ; les gabarits (Soldat, Tirailleur…) n'en sont pas.
// Partagé par tools/list-missing-token-images.mjs et tools/build-bestiary-folders.mjs.
import { slug } from '../build-token-images.mjs';

/** Vrai pour un profil qui représente une créature (tout sauf un gabarit). */
export const isCreature = profile => profile?.kind !== 'template';

/** Clé de créature d'un profil (« Rat géant » → rat-geant). */
export const creatureKey = profile => slug(profile.nameFr || profile.name);
