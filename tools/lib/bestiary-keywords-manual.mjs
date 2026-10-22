/**
 * Mots-clés ajoutés à la main aux profils dont le nom imprimé ne suffit pas (créatures et PNJ uniques), identifiants du référentiel de
 * `js/data/creature-keywords.js`. Clé : identifiant d'inventaire. Chaque ligne est un choix d'interprétation relu par le MJ (CHOIX_EXECUTANT_PHASE_E.md).
 */
export const KEYWORDS_MANUAL = Object.freeze({
  // The Imperial Zoo (L11)
  'E0-P-002': ['bete'], 'E0-P-008': ['loup'], 'E0-P-010': ['bete', 'chaos'], 'E0-P-014': ['bete'], 'E0-P-018': ['griffon'], 'E0-P-022': ['monstre'],
  'E0-P-026': ['skaven', 'monstre'], 'E0-P-027': ['monstre'], 'E0-P-028': ['monstre'], 'E0-P-029': ['serpent', 'monstre'], 'E0-P-036': ['bete'], 'E0-P-040': ['bete'],
  'E0-P-047': ['bete'], 'E0-P-049': ['monstre'], 'E0-P-054': ['monstre-marin'], 'E0-P-055': ['monstre-marin'], 'E0-P-056': ['monstre-marin'], 'E0-P-057': ['monstre-marin'],
  'E0-P-059': ['fantome'],
  // Archives of the Empire 2 (L01) : PNJ humains du sanatorium et de Mourn
  'E0-P-128': ['humain'], 'E0-P-129': ['humain'], 'E0-P-130': ['humain'], 'E0-P-131': ['humain'], 'E0-P-132': ['humain'], 'E0-P-133': ['humain'],
  'E0-P-134': ['humain'], 'E0-P-135': ['humain'], 'E0-P-136': ['humain'], 'E0-P-137': ['humain'],
  // Archives of the Empire 3 (L02) : les familiers et petits animaux sont des Bêtes
  // Archives of the Empire Volume 1 (L03) : Halflings (M 3, Endurance faible) pp. 23-31 et Nains pp. 56-63 (voir E-D10)
  'E0-P-150': ['halfling'], 'E0-P-151': ['halfling'], 'E0-P-152': ['halfling'], 'E0-P-153': ['halfling'], 'E0-P-154': ['halfling'], 'E0-P-155': ['halfling'], 'E0-P-156': ['halfling'],
  'E0-P-157': ['nain'], 'E0-P-158': ['nain'], 'E0-P-159': ['nain'], 'E0-P-160': ['nain'], 'E0-P-161': ['nain'], 'E0-P-162': ['nain'],
  'E0-P-140': ['bete'], 'E0-P-141': ['bete'], 'E0-P-142': ['bete'], 'E0-P-143': ['bete'], 'E0-P-144': ['bete']
});
