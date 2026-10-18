/* Miracles d'Ulric, livre de base V5 EN v2 p.228 (imprimée). Transcription vérifiée au PDF; texte reformulé.
   Distincts des 7 miracles optionnels d'Ulric de Power Behind the Throne Companion (hors périmètre). */
export const cult = 'Ulric';
const soc = { characteristic: 'Soc' };
const range = { kind: 'characteristic', ...soc, unit: 'yards' };
const felHours = { kind: 'characteristic-bonus', ...soc, unit: 'hours' };
const felRounds = { kind: 'characteristic-bonus', ...soc, unit: 'rounds' };
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Frisson du givre',
    canonicalName: 'Hoarfrost\'s Chill',
    printedPage: 228,
    summary: 'Votre regard prend un éclat bleu acier et l\'air se refroidit autour de vous. Vous causez la Peur (p.183). Toutes les créatures de la zone, vous excepté, perdent leur Avantage au début de chaque Round.',
    params: { range: self, targets: { kind: 'special' }, duration: felRounds },
    status: 'manual',
    effect: null,
    targetRules: ['all-in-area-except-priest'],
    needsInput: [
      { id: 'area-radius', text: 'Rayon de la zone : le livre indique « Fellowship yards » (Sociabilité entière, non le Bonus); valeur à confirmer par le MJ.' },
      { id: 'area-targets', text: 'Créatures présentes dans la zone.' },
      { id: 'fear-level', text: 'Niveau de Peur causé (p.183) : non précisé par le miracle.' }
    ],
    clauses: [
      { id: 'fear', mode: 'manual', text: 'Le prêtre cause la Peur (règle p.183) pendant la durée.' },
      { id: 'advantage-loss', mode: 'assisted', text: 'Au début de chaque Round, toutes les créatures de la zone sauf le prêtre perdent leur Avantage.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Cible imprimée « AoE (Fellowship yards) » sans « Bonus », contrairement aux autres zones; la grammaire params n\'a pas de zone en caractéristique entière, encodée en special. Niveau de Peur non précisé.'
  },
  {
    name: 'Hurlement du loup',
    canonicalName: 'Howl of the Wolf',
    printedPage: 228,
    summary: 'Vous hurlez pour appeler Ulric, qui envoie un loup blanc, Serviteur divin mineur. Il combat vos ennemis pendant la durée puis disparaît en poussant un hurlement spectral. Profil du Loup (p.327), avec Capacité de Combat 45, Volonté 35 et les Traits Morsure +6, Frénésie, Magique et Taille (Grande).',
    params: { range, targets: { kind: 'special' }, duration: felRounds },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'wolf-position', text: 'Position d\'apparition du loup dans la portée (Sociabilité yards).' },
      { id: 'wolf-actor', text: 'Qui joue le loup, initiative et cibles ennemies visées.' },
      { id: 'wolf-profile', text: 'Profil de base du Loup p.327 à relever puis modifier (CC 45, Volonté 35).' }
    ],
    clauses: [
      { id: 'summon-wolf', mode: 'manual', text: 'Invocation d\'un loup blanc (Serviteur divin mineur) à portée.' },
      { id: 'wolf-stats', mode: 'manual', text: 'Profil Loup (p.327) avec CC 45, Volonté 35, Morsure +6, Frénésie, Magique, Taille (Grande).' },
      { id: 'wolf-combat', mode: 'manual', text: 'Le loup combat les ennemis du prêtre pendant la durée.' },
      { id: 'end', mode: 'manual', text: 'Le loup disparaît à la fin de la durée (Bonus de Sociabilité rounds).' }
    ],
    sourceDelta: 'Le texte donne « Willpower 35 » (Volonté) : clé de caractéristique du moteur à confirmer. Cible « Special ».'
  },
  {
    name: 'Peau de loup d\'hiver',
    canonicalName: 'Pelt of the Winter Wolf',
    printedPage: 228,
    summary: 'La cible touchée ressent toujours la douleur et l\'inconfort du froid, mais ne subit aucune pénalité mécanique due au froid ou au climat hivernal.',
    params: { range: { kind: 'special' }, targets: one, duration: felHours },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'range-touch', text: 'Portée « Toucher » : contact avec la cible à confirmer par le MJ.' },
      { id: 'cold-penalties', text: 'Pénalités mécaniques de froid supprimées (États, tests, dégâts), décision MJ selon la situation.' }
    ],
    clauses: [
      { id: 'cold-immunity', mode: 'manual', text: 'Aucune pénalité mécanique de froid ou de temps hivernal pour la cible, qui en ressent toutefois l\'inconfort.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité heures.' }
    ],
    sourceDelta: 'Portée imprimée « Touch » : encodée en special (pas de contact dans la grammaire).'
  },
  {
    name: 'Jugement du Roi de la neige',
    canonicalName: 'The Snow King\'s Judgement',
    printedPage: 228,
    summary: 'Le sang et la moelle de la cible gèlent : elle subit 1d10 Blessures sans Bonus d\'Endurance ni Points d\'Armure, plus 1 Blessure par DR. Si le MJ juge que la cible n\'est ni faible, ni lâche, ni fourbe, c\'est vous qui subissez l\'effet.',
    params: { range, targets: one, duration: { kind: 'instant' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, requiresFact: { field: 'judgement', label: 'verdict MJ : cible faible, lâche ou fourbe (sinon le prêtre subit l’effet : à résoudre à la main)' } }],
    targetRules: [],
    needsInput: [
      { id: 'target-judgement', text: 'Le MJ juge-t-il la cible faible, lâche ou fourbe ? Sinon le prêtre subit l\'effet.' },
      { id: 'sl', text: 'DR du test de Prière (1 Blessure supplémentaire par DR).' }
    ],
    clauses: [
      { id: 'damage', mode: 'engine', text: '1d10 Blessures ignorant Bonus d\'Endurance et PA, +1 Blessure par DR.' },
      { id: 'redirect', mode: 'manual', text: 'Si la cible n\'est ni faible, ni lâche, ni fourbe (décision MJ), le prêtre subit le même effet.' },
      { id: 'haine-sacree', mode: 'engine', text: 'Dégâts de miracle : +2 si le prêtre a le talent Haine sacrée (déclencheur « miracle inflige des Blessures »).' }
    ]
  },
  {
    name: 'Fureur d\'Ulric',
    canonicalName: 'Ulric\'s Fury',
    printedPage: 228,
    summary: 'Un allié peut faire gratuitement un test de Frénésie (p.184) pendant ses Tours. Au lieu de l\'attaque gratuite habituelle, la Frénésie ajoute +1d10 Dégâts au premier coup au corps à corps qu\'il porte lors de son Tour; sur un 10, il relance et ajoute de nouveau, jusqu\'à obtenir moins de 10.',
    params: { range, targets: one, duration: felRounds },
    status: 'manual',
    effect: null,
    targetRules: ['ally'],
    needsInput: [
      { id: 'ally', text: 'Allié ciblé dans la portée (Sociabilité yards).' },
      { id: 'frenzy-test', text: 'Résultat du test de Frénésie gratuit à chaque Tour (règle p.184).' },
      { id: 'first-hit', text: 'Premier coup au corps à corps porté pendant le Tour : touche confirmée.' }
    ],
    clauses: [
      { id: 'free-frenzy', mode: 'manual', text: 'Test de Frénésie gratuit à chaque Tour de l\'allié pendant la durée (règle p.184).' },
      { id: 'replaces-free-attack', mode: 'manual', text: 'La Frénésie ne donne pas l\'attaque gratuite habituelle : elle ajoute +1d10 Dégâts au premier coup de mêlée du Tour.' },
      { id: 'exploding-d10', mode: 'assisted', text: 'Sur un 10 au d10, relancer et ajouter, jusqu\'à obtenir moins de 10.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Le texte ne dit pas si le d10 explosif s\'applique à chaque Tour ni si le test de Frénésie suit l\'état de Frénésie habituel (durée/fin) : à trancher par le MJ.'
  },
  {
    name: 'Morsure de l\'hiver',
    canonicalName: 'Winter\'s Bite',
    printedPage: 228,
    summary: 'Si vous maniez une hache, elle devient Magique et inflige +DR Dégâts; toute cible touchée gagne l\'État Fatigué. Les cibles touchées perdent leurs États Hémorragique (le sang gèle), et votre hache ne peut pas en causer.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'weapon-bonus', magical: true, value: 0, perSuccessLevels: { every: 1, add: 1, field: 'value' }, hitConditions: ['Exténué'], designatedWeapon: true, weaponClass: 'hache' }],
    targetRules: ['wielding-axe'],
    needsInput: [
      { id: 'axe', text: 'Le prêtre manie-t-il une hache ?' },
      { id: 'sl', text: 'DR retenu pour « +SL Damage » : DR du test de Prière présumé (non précisé par le texte).' },
      { id: 'targets-struck', text: 'Cibles touchées par la hache à chaque coup.' }
    ],
    clauses: [
      { id: 'magical', mode: 'engine', text: 'La hache brandie est considérée comme Magique.' },
      { id: 'damage-plus-sl', mode: 'engine', text: '+DR Dégâts avec la hache.' },
      { id: 'fatigued', mode: 'engine', text: 'Toute cible touchée gagne un État Fatigué.' },
      { id: 'remove-bleeding', mode: 'manual', text: 'Toute cible touchée perd ses États Hémorragique.' },
      { id: 'no-bleeding', mode: 'manual', text: 'La hache ne peut causer aucun État Hémorragique.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: '« +SL Damage » : SL du test de Prière présumé, non précisé; Fatigué : un seul État par coup.'
  }
];
