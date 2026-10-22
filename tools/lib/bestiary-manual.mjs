/**
 * Profils que l'extraction par colonnes ne lit pas (en-tête de tableau coupé, fiche de personnage prétiré) : transcrits à la main
 * depuis la page, mêmes champs qu'un bloc extrait. Clé : identifiant d'inventaire.
 */
const empty = { M: null, CC: null, CT: null, F: null, E: null, I: null, Ag: null, Dex: null, Int: null, FM: null, Soc: null, W: null };

export const MANUAL_BLOCKS = Object.freeze({
  // Gabarit « Bright Spark » (Up in Arms p. 115) : l'en-tête du tableau est coupé par la mise en page.
  'E0-P-468': {
    key: 'L13:115:manual', book: 'L13', physicalPage: 115, title: 'BRIGHT SPARK',
    stats: { ...empty, I: 10, Int: 10, FM: 5, Soc: 5 },
    skills: [{ name: 'Intuition', value: 10, modifier: true }, { name: 'Lore (Local)', value: 10, modifier: true }, { name: 'Perception', value: 10, modifier: true }],
    trappings: ['Mail Armour', 'Hand Weapon']
  }
});
