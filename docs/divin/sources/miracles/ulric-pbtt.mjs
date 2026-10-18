/* Miracles optionnels d'Ulric, Power Behind the Throne Companion (WFRP 4e, Cubicle 7), p.50 imprimée = physique.
   « Optionnels, à la discrétion du MJ » : à n'activer que sur décision du MJ. Texte reformulé, valeurs vérifiées au PDF. */
export const cult = 'Ulric';
export const source = {
  bookId: 'PBTT',
  document: 'WFRP_Power_Behind_the_Throne_Companion.pdf',
  fileSha256: 'df27ea115b6368e5185492a64ebf34691aa99ed9f5e7b0fcdfc33120bcb49427',
  edition: 'WFRP 4e (Fourth Edition), Cubicle 7'
};
const soc = { characteristic: 'Soc' };
const range = { kind: 'characteristic', ...soc, unit: 'yards' };
const area = { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' };
const felRounds = { kind: 'characteristic-bonus', ...soc, unit: 'rounds' };
const felHours = { kind: 'characteristic-bonus', ...soc, unit: 'hours' };
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Morsure du loup',
    canonicalName: 'Wolf\'s Bite',
    printedPage: 50,
    summary: 'Votre prière rugie vous octroie la sauvagerie d\'Ulric : vous ajoutez +20 au jet de gravité de toute Blessure Critique que vous infligez pendant la durée.',
    params: { range: self, targets: one, duration: felRounds },
    status: 'manual',
    effect: null,
    effects: [],
    targetRules: [],
    needsInput: [
      { id: 'critical-rolls', text: 'Blessures Critiques infligées par le prêtre pendant la durée : +20 à ajouter au jet de gravité (d100) à la main.' }
    ],
    clauses: [
      { id: 'crit-bonus', mode: 'manual', text: '+20 au jet de gravité de chaque Blessure Critique infligée par le prêtre.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Portée imprimée « Touch (You) » avec cible « 1 » : lu comme le prêtre lui-même (encodé self / 1). Le moteur n\'a aucun effet sur les jets de Blessure Critique (test-modifier ne porte que sur les Tests), d\'où manual.'
  },
  {
    name: 'Hurlement de bataille',
    canonicalName: 'Howl of Battle',
    printedPage: 50,
    summary: 'L\'esprit d\'Ulric vous emplit et libère votre soif de sang : vous gagnez le talent Charge berserk. Si vous l\'avez déjà, vous le gagnez une seconde fois, en ignorant au besoin le maximum habituel.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'grant-talent', talents: [{ id: 'talent-berserk-charge', name: 'Charge berserk', rank: 1 }] }],
    targetRules: [],
    needsInput: [
      { id: 'already-known', text: 'Le prêtre a-t-il déjà Charge berserk ? Le rang supplémentaire (au-delà du maximum) est à appliquer à la main.' }
    ],
    clauses: [
      { id: 'grant-talent', mode: 'engine', text: 'Le prêtre gagne le talent Charge berserk (étiquette posée sur la fiche pendant la durée).' },
      { id: 'stack-beyond-max', mode: 'manual', text: 'S\'il possède déjà le talent, il le gagne en plus, au-delà du maximum normal.' },
      { id: 'talent-effect', mode: 'manual', text: 'Le bonus de dégâts du talent à la charge n\'est pas injecté par le moteur : le MJ l\'applique.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Charge berserk n\'est pas dans la liste des talents injectés par le moteur (étiquette seulement). Le rang gagné « en plus » dépend du rang déjà détenu, que le contrat ne lit pas : encodé au rang 1, empilement et maximum laissés au MJ.'
  },
  {
    name: 'Écraser les faibles',
    canonicalName: 'Crush the Weak',
    printedPage: 50,
    summary: 'Vous êtes empli du mépris d\'Ulric pour les faibles et les lâches. Une fois par Round, vous pouvez relancer une attaque ratée.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'manual',
    effect: null,
    effects: [],
    targetRules: [],
    needsInput: [
      { id: 'reroll', text: 'Attaque ratée à relancer, une fois par Round (le moteur ne gère pas les relances).' }
    ],
    clauses: [
      { id: 'reroll', mode: 'manual', text: 'Une fois par Round, relancer une attaque ratée.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Le texte ne précise pas si la relance vaut pour toute attaque (mêlée et distance) ni si le second jet est définitif : lecture MJ.'
  },
  {
    name: 'Engourdissement',
    canonicalName: 'Frostbite',
    printedPage: 50,
    summary: 'La fureur glaciale d\'Ulric gèle le corps et le sang de votre ennemi. Un adversaire à portée perd 1d10 Blessures, sans Bonus d\'Endurance ni Points d\'Armure. Il doit en outre réussir un Test d\'Endurance Intermédiaire (+0) ou ne pas pouvoir agir à son prochain Tour, hors actions défensives comme Esquive ou Mêlée pour éviter une attaque.',
    params: { range, targets: one, duration: { kind: 'special' } },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 } }],
    targetRules: [],
    needsInput: [
      { id: 'endurance-test', text: 'Résultat du Test d\'Endurance Intermédiaire (+0) de la cible : échec = aucune action à son prochain Tour, hors actions défensives.' }
    ],
    clauses: [
      { id: 'damage', mode: 'engine', text: '1d10 Blessures ignorant Bonus d\'Endurance et PA (pas de bonus au DR, le texte n\'en donne pas).' },
      { id: 'haine-sacree', mode: 'engine', text: 'Dégâts de miracle : +2 si le prêtre a le talent Haine sacrée (traitement commun des Blessures directes du moteur).' },
      { id: 'endurance-test', mode: 'manual', text: 'Test d\'Endurance Intermédiaire (+0) de la cible ; en cas d\'échec, aucune action au prochain Tour sauf défensive.' }
    ],
    sourceDelta: 'Durée imprimée « Special (see below) » : la perte d\'action ne dure que le prochain Tour de la cible, encodée en special. Le texte ne dit pas si la Haine sacrée s\'applique : le moteur l\'ajoute aux Blessures directes comme pour les miracles du livre de base.'
  },
  {
    name: 'Cœur du loup',
    canonicalName: 'Heart of the Wolf',
    printedPage: 50,
    summary: 'Vos alliés sont inspirés par l\'esprit martial d\'Ulric. Tout allié dans la zone perd automatiquement tous ses États Brisé. Pendant la durée, ils sont immunisés contre la Peur, la Terreur et les effets de compétences et talents tels qu\'Intimidation ou Effrayant.',
    params: { range: self, targets: area, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [
      { type: 'remove-condition', key: 'Broken', amount: 'all', duration: { unit: 'instant' } },
      { type: 'special-state', fearImmune: true }
    ],
    targetRules: ['ally'],
    needsInput: [
      { id: 'allies-in-area', text: 'Alliés présents dans la zone (Bonus de Sociabilité yards).' },
      { id: 'broken-conditions', text: 'États Brisé à retirer chez chaque allié.' }
    ],
    clauses: [
      { id: 'remove-broken', mode: 'engine', text: 'Les alliés dans la zone perdent tous leurs États Brisé.' },
      { id: 'fear-immunity', mode: 'engine', text: 'Immunité à la Peur pendant la durée.' },
      { id: 'terror-and-skills', mode: 'manual', text: 'Immunité à la Terreur et aux effets d\'Intimidation ou d\'Effrayant : rappel MJ.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'L\'état spécial fearImmune du moteur couvre la Peur ; la Terreur et les effets d\'Intimidation/Effrayant ne sont pas confirmés couverts, d\'où le rappel manuel. Le prêtre n\'est pas dit compté parmi les alliés.'
  },
  {
    name: 'Muscles givrés',
    canonicalName: 'Hoarfrost Thews',
    printedPage: 50,
    summary: 'Ulric refroidit votre corps et le givre se forme sur votre chair. Vous devenez immunisé au froid, quelle qu\'en soit la source.',
    params: { range: self, targets: self, duration: felHours },
    status: 'manual',
    effect: null,
    effects: [],
    targetRules: [],
    needsInput: [
      { id: 'cold-sources', text: 'Sources de froid ignorées (États, Tests, dégâts) : décision MJ selon la situation.' }
    ],
    clauses: [
      { id: 'cold-immunity', mode: 'manual', text: 'Immunité au froid de toute source pour le prêtre.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité heures.' }
    ],
    sourceDelta: 'Nom français « Muscles givrés » : « thews » (muscles, force) n\'a pas de forme établie dans le glossaire du dépôt. Aucun état spécial d\'immunité au froid n\'existe dans le moteur.'
  },
  {
    name: 'Tempête de glace',
    canonicalName: 'Ice Storm',
    printedPage: 50,
    summary: 'Ulric envoie une violente tempête d\'éclats de glace sur vos ennemis. Toute personne touchée subit une attaque de Dégâts +5 et doit réussir un Test de Volonté Intermédiaire (+0) ou gagner un État Étourdi.',
    params: { range, targets: area, duration: { kind: 'instant' } },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'ordinary-damage', fixed: 5 }],
    targetRules: [],
    needsInput: [
      { id: 'area-targets', text: 'Créatures dans la zone (Bonus de Sociabilité yards), alliés compris : « anyone affected ».' },
      { id: 'location', text: 'Localisation de la touche de chaque cible (d100, ou localisation choisie par le MJ) : les PA de la Localisation s\'appliquent.' },
      { id: 'willpower-test', text: 'Test de Volonté Intermédiaire (+0) de chaque cible ; échec = un État Étourdi.' }
    ],
    clauses: [
      { id: 'damage', mode: 'engine', text: 'Chaque cible subit une touche de Dégâts +5 (dégâts ordinaires, réduits par BE et PA, minimum 1).' },
      { id: 'stunned', mode: 'manual', text: 'Test de Volonté Intermédiaire (+0) ; en cas d\'échec, un État Étourdi.' }
    ],
    sourceDelta: 'La touche « Damage +5 » est un coup d\'arme ordinaire, pas des Blessures directes : il est donc encodé ordinary-damage fixe : 5 dégâts réduits par le Bonus d\'Endurance et les PA de la Localisation (d100 ou choix MJ), minimum 1 ; « Dégâts +5 » est lu comme 5 dégâts fixes, sans Bonus de Force ajouté (lecture à confirmer). L\'Étourdi sur Volonté ratée reste au rappel MJ.'
  }
];
