/**
 * Profils que l'extraction par colonnes ne lit pas (en-tête de tableau coupé, fiche de personnage prétiré, livre en français) :
 * transcrits à la main depuis la page, mêmes champs qu'un bloc extrait. Clé : identifiant d'inventaire.
 */
const empty = { M: null, CC: null, CT: null, F: null, E: null, I: null, Ag: null, Dex: null, Int: null, FM: null, Soc: null, W: null };

/**
 * Livres dont seule une partie des entrées d'inventaire est générée. L05 (Livre de base V4 FR) : ses profils sont les versions V4 de
 * ceux de L06 (V5), qui font foi ; seuls l'Ours et le Pigeon, absents de L06, en sont tirés (T12 des images des pions, 13/11/2026).
 */
export const PARTIAL_BOOKS = Object.freeze({ L05: Object.freeze(['E0-P-194', 'E0-P-199']) });

export const MANUAL_BLOCKS = Object.freeze({
  // Gabarit « Bright Spark » (Up in Arms p. 115) : l'en-tête du tableau est coupé par la mise en page.
  'E0-P-468': {
    key: 'L13:115:manual', book: 'L13', physicalPage: 115, title: 'BRIGHT SPARK',
    stats: { ...empty, I: 10, Int: 10, FM: 5, Soc: 5 },
    skills: [{ name: 'Intuition', value: 10, modifier: true }, { name: 'Lore (Local)', value: 10, modifier: true }, { name: 'Perception', value: 10, modifier: true }],
    trappings: ['Mail Armour', 'Hand Weapon']
  },
  // L05 (V4 FR) : l'extraction ne lit pas les en-têtes français (« M CC CT … B »). Valeurs telles qu'imprimées ; les noms de Traits
  // français sont rendus par le nom anglais de l'inventaire (Arme = Weapon, Armure = Armour, Foulée = Stride, Morsure = Bite,
  // Nerveux = Skittish, Taille = Size, Vision nocturne = Night Vision, Vol = Fly, Affamé = Hungry, Dressé = Trained (Divertir = Entertain,
  // Dompté = Broken, Guerre = War, Revenir au colombier = Home), Infecté = Infected, Parasité = Infestation).
  // Ours, L05 p. 315 (page physique 317) : « Armure (Peau 1) ».
  'E0-P-194': {
    key: 'L05:317:manual', book: 'L05', physicalPage: 317, title: 'OURS',
    stats: { M: 4, CC: 35, CT: null, F: 55, E: 45, I: 20, Ag: 25, Dex: 15, Int: 10, FM: 15, Soc: null, W: 28 },
    traits: [{ name: 'Armour', rating: '1', param: 'Hide' }, { name: 'Bestial' }, { name: 'Stride' }, { name: 'Skittish' }, { name: 'Size', param: 'Large' }, { name: 'Night Vision' }],
    attackTraits: [{ name: 'Weapon', rating: '+8' }, { name: 'Bite', rating: '+9' }],
    optional: [{ name: 'Hungry' }, { name: 'Trained', param: 'Entertain, Broken, War' }, { name: 'Infected' }, { name: 'Infestation' }, { name: 'Size', param: 'Enormous' }, { name: 'Territorial' }]
  },
  // Pigeon, L05 p. 316 (page physique 318) : « Taille (Minuscule) » = Size (Tiny).
  'E0-P-199': {
    key: 'L05:318:manual', book: 'L05', physicalPage: 318, title: 'PIGEON',
    stats: { M: 2, CC: 15, CT: null, F: 5, E: 15, I: 25, Ag: 40, Dex: null, Int: 10, FM: 20, Soc: 10, W: 1 },
    traits: [{ name: 'Bestial' }, { name: 'Skittish' }, { name: 'Size', param: 'Tiny' }, { name: 'Fly', rating: '100' }],
    attackTraits: [{ name: 'Weapon', rating: '+0' }],
    optional: [{ name: 'Trained', param: 'Broken, Home' }, { name: 'Size', param: 'Small' }]
  }
});
