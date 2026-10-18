/* Miracles de Mathlann, Lustria (EN, WFRP 4e), p.81 imprimée = physique. Réservés aux prêtres elfes de Mathlann.
   Shroud of Fog (même page) est un sort de la Lore of Shadows, pas un miracle : hors périmètre.
   Texte reformulé, valeurs vérifiées au PDF. */
export const cult = 'Mathlann';
export const source = {
  bookId: 'L07',
  document: 'Lustria EN.pdf',
  fileSha256: '975555bd937144d8e99236be2b38aa8b96bf06ac4072523c30c187e6504a0554',
  edition: 'WFRP 4e (Fourth Edition), Cubicle 7'
};
const range = { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Poumons d\'eau',
    canonicalName: 'Waterlungs',
    printedPage: 81,
    summary: 'Les cibles respirent sous l\'eau, mais à l\'air libre elles subissent Suffocation et Noyade (p.181 du livre de base). Elles se sentent attirées par l\'eau et n\'ont besoin que d\'un seau pour respirer. Vous pouvez affecter une cible supplémentaire par tranche de +2 DR.',
    params: { range, targets: one, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'hours' } },
    status: 'manual',
    effect: null,
    effects: [],
    targetRules: [],
    needsInput: [
      { id: 'elf-priest', text: 'Miracle réservé aux prêtres elfes de Mathlann : le prêtre est-il un Elfe ?' },
      { id: 'extra-targets', text: 'DR du test de Prière : une cible de plus par tranche de +2 DR.' },
      { id: 'suffocation', text: 'Cibles hors de l\'eau : Suffocation et Noyade (règles p.181), à suivre à la main.' }
    ],
    clauses: [
      { id: 'water-breathing', mode: 'manual', text: 'Les cibles respirent sous l\'eau pendant la durée.' },
      { id: 'air-penalty', mode: 'manual', text: 'À l\'air libre, les cibles subissent Suffocation et Noyade (livre de base p.181) ; un seau d\'eau leur suffit pour respirer.' },
      { id: 'extra-targets', mode: 'manual', text: '+1 cible par tranche de +2 DR du test de Prière.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité heures.' }
    ],
    sourceDelta: 'Réservé aux prêtres elfes de Mathlann (restriction non encodée, aucune règle de cible pour la race du prêtre). La page 181 du livre de base est citée par Lustria sans vérification dans ce livre. Aucun effet moteur ne représente la respiration aquatique ni la cible supplémentaire par +2 DR.'
  },
  {
    name: 'Manteau de Mathlann',
    canonicalName: 'Cloak of Mathlann',
    printedPage: 81,
    summary: 'Vous rendez invisible un navire et son équipage. L\'intérieur reste visible à ceux qui sont à bord, et les marins redeviennent visibles en quittant le navire. Le sillage et les remous dans la brume trahissent le navire : Test de Perception Intermédiaire (+0). Il faut +2 DR par mât au-delà du premier. Les Arches Noires et les monstres marins ne peuvent pas être masqués.',
    params: { range, targets: { kind: 'special' }, duration: { kind: 'characteristic', characteristic: 'Soc', unit: 'minutes' } },
    status: 'manual',
    effect: null,
    effects: [],
    targetRules: [],
    needsInput: [
      { id: 'elf-priest', text: 'Miracle réservé aux prêtres elfes de Mathlann : le prêtre est-il un Elfe ?' },
      { id: 'vessel', text: 'Navire ciblé : nombre de mâts (+2 DR par mât au-delà du premier), pas une Arche Noire.' },
      { id: 'wake-test', text: 'Test de Perception Intermédiaire (+0) pour repérer le sillage et les remous.' }
    ],
    clauses: [
      { id: 'invisible-ship', mode: 'manual', text: 'Le navire et son équipage deviennent invisibles ; l\'intérieur reste visible à bord, les marins redeviennent visibles en descendant.' },
      { id: 'wake', mode: 'manual', text: 'Le sillage et les remous restent détectables par un Test de Perception Intermédiaire (+0).' },
      { id: 'masts', mode: 'manual', text: '+2 DR par mât supplémentaire au-delà du premier pour masquer le navire.' },
      { id: 'exclusions', mode: 'manual', text: 'Arches Noires et monstres marins ne peuvent pas être masqués.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Sociabilité minutes (caractéristique entière, non le Bonus).' }
    ],
    sourceDelta: 'Durée imprimée « Fellowship minutes » sans « Bonus » (caractéristique entière). Cible « 1 boat or ship » : encodée en special (pas de cible navire dans la grammaire). Le sens de « +2 SL per extra mast » est lu comme un surcoût de DR au test de Prière. Le Wraith Cylinder Apparatus (p.81) reproduit l\'effet via la Lore of Shadows : hors périmètre divin.'
  }
];
