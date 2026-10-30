/* Miracles d'Ulric, livre de base V5 EN v2 p.228 (imprimée); Frisson du givre et Jugement du Roi de la neige alignés sur la v3 du 27/10/2026. Transcription vérifiée au PDF; texte reformulé.
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
    summary: 'Votre regard prend un éclat bleu acier et l\'air se refroidit autour de vous. Vous causez la Peur (2) (p.183). Toutes les créatures de la zone, vous excepté, perdent leur Élan au début de chaque Round.',
    params: { range: self, targets: { kind: 'special' }, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'grant-trait', traits: ['Peur (2)'], appliesTo: 'caster' }],
    targetRules: ['all-in-area-except-priest'],
    needsInput: [
      { id: 'area-radius', text: 'Rayon de la zone : le livre indique « Fellowship yards » (Sociabilité entière, non le Bonus); valeur à confirmer par le MJ.' },
      { id: 'area-targets', text: 'Créatures présentes dans la zone (perte d’Élan au début de chaque Round).' }
    ],
    clauses: [
      { id: 'fear', mode: 'engine', text: 'Le prêtre cause la Peur (2) (règle p.183) pendant la durée.' },
      { id: 'momentum-loss', mode: 'manual', text: 'Au début de chaque Round, toutes les créatures de la zone sauf le prêtre perdent leur Élan.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Cible imprimée « AoE (Fellowship yards) » sans « Bonus », contrairement aux autres zones; la grammaire params n\'a pas de zone en caractéristique entière, encodée en special. Peur (2) imprimée en v3 (l’ancien arbitrage Peur (1) du 21/10 ne s’applique plus) ; la perte d’Élan remplace la perte d’Avantage.'
  },
  {
    name: 'Hurlement du loup',
    canonicalName: 'Howl of the Wolf',
    printedPage: 228,
    summary: 'Vous hurlez pour appeler Ulric, qui envoie un loup blanc, Serviteur divin mineur. Il combat vos ennemis pendant la durée puis disparaît en poussant un hurlement spectral. Profil du Loup (p.327), avec Capacité de Combat 45, Volonté 35 et les Traits Morsure +6, Frénésie, Magique et Taille (Grande).',
    params: { range, targets: { kind: 'special' }, duration: felRounds },
    status: 'assisted',
    effects: [{ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf',
      overrides: { caracs: { CC: 45, FM: 35 }, size: 'large', traits: ['Magique', 'Frénésie'], recomputeWounds: true } }],
    targetRules: [],
    needsInput: [
      { id: 'wolf-position', text: 'Position d\'apparition du loup dans la portée (Sociabilité mètres), notée par le MJ.' },
      { id: 'wolf-targets', text: 'Ennemis visés par le loup : le MJ joue le loup et choisit ses cibles.' }
    ],
    clauses: [
      { id: 'summon-wolf', mode: 'engine', text: 'Le moteur crée le loup blanc (Serviteur divin mineur) : participant du camp du prêtre, contrôlé par le MJ, avec le profil du Loup du bestiaire (p.327) et les valeurs du miracle (CC 45, Volonté 35, Morsure +6, Frénésie, Magique, Taille Grande, Blessures par la formule des créatures de Taille Grande).' },
      { id: 'wolf-placement', mode: 'manual', text: 'Le loup apparaît à portée (Sociabilité mètres) : le MJ place la créature.' },
      { id: 'wolf-combat', mode: 'manual', text: 'Le loup combat les ennemis du prêtre pendant la durée ; le MJ le joue (arbitrage MJ : contrôlé par le MJ).' },
      { id: 'end', mode: 'engine', text: 'Le loup disparaît à la fin de la durée (Bonus de Sociabilité rounds), à l\'expiration ou à la fin manuelle de la prière, ou à la mort du prêtre.' }
    ],
    sourceDelta: 'Le texte donne « Willpower 35 » (Volonté) : lu comme la caractéristique FM du moteur. Cible « Special ». Arbitrages MJ : le profil de base vient du bestiaire de Forme bestiale (Loup, p.327), complété par les valeurs de la source ; le loup est contrôlé par le MJ et disparaît à la fin.'
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
    summary: 'Le sang et la moelle de la cible gèlent : elle subit 1d10 Blessures sans Bonus d\'Endurance ni Points d\'Armure et reçoit l\'état Sonné, plus 1 Blessure par DR. Si le MJ juge que la cible n\'est ni faible, ni lâche, ni fourbe, c\'est vous qui subissez l\'effet.',
    params: { range, targets: one, duration: { kind: 'instant' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, requiresFact: { field: 'judgement', onFalse: 'skip', label: 'verdict MJ : cible faible, lâche ou fourbe (sinon la cible est épargnée et le prêtre subit l’effet)' } },
      { type: 'condition', key: 'Stunned', level: 1, when: { fact: 'judgement', label: 'verdict MJ : cible faible, lâche ou fourbe (sinon la cible est épargnée et le prêtre subit l’effet)' } },
      { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, appliesTo: 'caster', casterWhen: { field: 'judgement', label: 'verdict MJ : cible faible, lâche ou fourbe', value: false, match: 'any' } }],
    targetRules: [],
    needsInput: [
      { id: 'target-judgement', text: 'Le MJ juge-t-il la cible faible, lâche ou fourbe ? Sinon le prêtre subit l\'effet.' },
      { id: 'sl', text: 'DR du test de Prière (1 Blessure supplémentaire par DR).' }
    ],
    clauses: [
      { id: 'damage', mode: 'engine', text: '1d10 Blessures ignorant Bonus d\'Endurance et PA, +1 Blessure par DR.' },
      { id: 'stunned', mode: 'engine', text: 'La cible jugée faible, lâche ou fourbe reçoit l\'état Sonné.' },
      { id: 'redirect-stunned', mode: 'manual', text: 'Si le prêtre subit l\'effet à la place de la cible, il reçoit aussi l\'état Sonné : à poser à la main.' },
      { id: 'redirect', mode: 'engine', text: 'Si la cible n\'est ni faible, ni lâche, ni fourbe (verdict MJ), elle est épargnée et le prêtre subit le même effet (même jet de dégâts).' },
      { id: 'haine-sacree', mode: 'engine', text: 'Dégâts de miracle : +2 si le prêtre a le talent Haine sacrée (déclencheur « miracle inflige des Blessures »).' }
    ]
  },
  {
    name: 'Fureur d\'Ulric',
    canonicalName: 'Ulric\'s Fury',
    printedPage: 228,
    summary: 'Un allié peut faire gratuitement un test de Frénésie (p.184) pendant ses Tours. Au lieu de l\'attaque gratuite habituelle, la Frénésie ajoute +1d10 Dégâts au premier coup au corps à corps qu\'il porte lors de son Tour; sur un 10, il relance et ajoute de nouveau, jusqu\'à obtenir moins de 10.',
    params: { range, targets: one, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'grant-talent', talents: [{ id: 'talent-frenzy', rank: 1 }] }, { type: 'frenzy-fury' }],
    targetRules: ['ally'],
    needsInput: [
      { id: 'ally', text: 'Allié ciblé dans la portée (Sociabilité mètres).' }
    ],
    clauses: [
      { id: 'free-frenzy', mode: 'manual', text: 'Test de Frénésie gratuit à chaque Tour de l\'allié pendant la durée (règle p.184).' },
      { id: 'fury', mode: 'engine', text: 'Frénésie accordée ; en Frénésie, +1d10 Dégâts explosifs au premier coup de mêlée touché de chaque Tour, au lieu de l\'attaque gratuite' },
      { id: 'exploding-d10', mode: 'engine', text: 'Sur un 10 au d10, relancer et ajouter, jusqu\'à obtenir moins de 10.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Le texte laisse au MJ le rythme du d10 explosif (premier coup de mêlée touché de chaque Tour) et remplace l\'attaque gratuite de Frénésie ; le moteur injecte Frénésie et saisit le d10 explosif au premier coup touché du Tour.'
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
