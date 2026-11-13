/**
 * REGLES-06 : source unique des clés de Caractéristiques (module feuille, sans import). Les modules du moteur en dérivent leurs
 * tables au lieu de les recopier ; `models.js` ré-exporte `CARAC_KEYS`, `EXTRA_CARAC_KEYS` et `canonicalCaracKey`.
 *  - `CARAC_KEYS` : les dix Caractéristiques testables, dans l'ordre de la fiche (le Mouvement ne se teste pas) ;
 *  - `PROFILE_CARAC_KEYS` : celles d'un profil de créature, Mouvement compris ;
 *  - `EXTRA_CARAC_KEYS` : clés secondaires reconnues à l'import (M, A, B, BF) ;
 *  - `CARAC_BY_LOWER` : graphie de la fiche (`cc`, `ag`, `fm`…) → clé canonique ;
 *  - `CARAC_ENGLISH_ALIASES` : abréviations du livre anglais (`ws`, `bs`, `s`, `t`, `wp`, `fel`), lues par les séquelles.
 */
export const CARAC_KEYS = Object.freeze(['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc']);
export const PROFILE_CARAC_KEYS = Object.freeze([...CARAC_KEYS, 'M']);
export const EXTRA_CARAC_KEYS = Object.freeze(['M', 'A', 'B', 'BF']);
export const CARAC_BY_LOWER = Object.freeze(Object.fromEntries(CARAC_KEYS.map(key => [key.toLowerCase(), key])));
export const CARAC_ENGLISH_ALIASES = Object.freeze({ ws: 'CC', bs: 'CT', s: 'F', t: 'E', wp: 'FM', fel: 'Soc' });

const CANONICAL_CARACS = new Set([...CARAC_KEYS, ...EXTRA_CARAC_KEYS]);
const CARAC_ALIASES = new Map([...CARAC_KEYS, ...EXTRA_CARAC_KEYS].map(key => [key.toLowerCase(), key]).concat([['agi', 'Ag']]));

/** Clé canonique d'un libellé (`agi` → `Ag`), ou null si ce n'est pas une Caractéristique. */
export function canonicalCaracKey(key) {
  const raw = String(key ?? '').trim();
  if (CANONICAL_CARACS.has(raw)) return raw;
  return CARAC_ALIASES.get(raw.toLocaleLowerCase()) || null;
}
