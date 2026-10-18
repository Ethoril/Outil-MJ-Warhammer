/* Miracles de Taal, livre de base V5 EN v2 p.227-228 (imprimées). Transcription vérifiée au PDF; texte reformulé. */
export const cult = 'Taal';
const soc = { characteristic: 'Soc' };
const range = { kind: 'characteristic', ...soc, unit: 'yards' };
const felHours = { kind: 'characteristic-bonus', ...soc, unit: 'hours' };
const felMinutes = { kind: 'characteristic-bonus', ...soc, unit: 'minutes' };
const felRounds = { kind: 'characteristic-bonus', ...soc, unit: 'rounds' };
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Instincts animaux',
    canonicalName: 'Animal Instincts',
    printedPage: 227,
    summary: 'Pendant la durée, la cible touchée gagne le talent Sens aiguisé (un sens au choix) à +1. Si elle se repose, elle se réveille d\'elle-même dès qu\'une menace s\'approche à moins de sa valeur de Perception en yards.',
    params: { range: { kind: 'special' }, targets: one, duration: felHours },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'grant-talent', talents: [{ id: 'talent-acute-sense', name: 'Sens aiguisé', rank: 1 }] }],
    targetRules: [],
    needsInput: [
      { id: 'range-touch', text: 'Portée « Toucher » : contact avec la cible à confirmer par le MJ.' },
      { id: 'acute-sense', text: 'Sens choisi pour Sens aiguisé (un seul).' },
      { id: 'threat', text: 'Ce qui compte comme une menace approchant à moins de Perception yards (décision MJ).' }
    ],
    clauses: [
      { id: 'acute-sense-plus-1', mode: 'assisted', text: 'La cible gagne +1 au talent Sens aiguisé pour le sens choisi (talent temporaire).' },
      { id: 'rest-awakening', mode: 'manual', text: 'En repos, la cible se réveille automatiquement si une menace entre à moins de Perception yards.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets au terme de la durée (Bonus de Sociabilité heures).' }
    ],
    sourceDelta: 'Portée imprimée « Touch » : la grammaire params n\'a pas de contact, encodée en special.'
  },
  {
    name: 'Roi de la Nature',
    canonicalName: 'King of the Wild',
    printedPage: 227,
    summary: 'Taal répond à votre prière en envoyant un animal sauvage adapté à l\'environnement; il agit selon vos souhaits pendant la durée. Des exemples d\'animaux se trouvent aux pages 325-327.',
    params: { range, targets: one, duration: felMinutes },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'environment', text: 'Environnement et animal sauvage adapté (profil p.325-327) choisi avec le MJ.' },
      { id: 'animal-position', text: 'Position d\'apparition de l\'animal dans la portée.' },
      { id: 'animal-control', text: 'Qui joue l\'animal et comment ses actions sont ordonnées.' }
    ],
    clauses: [
      { id: 'summon-animal', mode: 'manual', text: 'Invocation d\'un animal sauvage adapté au lieu, à portée (Sociabilité yards).' },
      { id: 'obedience', mode: 'manual', text: 'L\'animal agit selon les désirs du prêtre pendant toute la durée.' },
      { id: 'end', mode: 'manual', text: 'Durée de Bonus de Sociabilité minutes; le livre ne dit pas ce que devient l\'animal ensuite.' }
    ],
    sourceDelta: 'Le livre ne dit pas ce qu\'il advient de l\'animal à la fin de la durée.'
  },
  {
    name: 'Bondissant comme un cerf',
    canonicalName: 'Leaping Stag',
    printedPage: 227,
    summary: 'Vous gagnez +1 Mouvement et le talent Jambes solides à +1, et réussissez automatiquement tous les tests d\'Athlétisme faits pour sauter.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [
      { type: 'characteristic-modifier', characteristic: 'M', value: 1 },
      { type: 'grant-talent', talents: [{ id: 'talent-strong-legs', name: 'Jambes solides', rank: 1 }] }
    ],
    targetRules: [],
    needsInput: [
      { id: 'leap-test', text: 'Quels tests d\'Athlétisme sont des sauts (réussite automatique) : décision MJ.' }
    ],
    clauses: [
      { id: 'movement-plus-1', mode: 'engine', text: 'Caractéristique Mouvement +1 pendant la durée.' },
      { id: 'strong-legs-plus-1', mode: 'engine', text: 'Talent Jambes solides +1 (temporaire).' },
      { id: 'auto-leap', mode: 'manual', text: 'Les tests d\'Athlétisme pour sauter réussissent automatiquement.' }
    ]
  },
  {
    name: 'Seigneur de la Chasse',
    canonicalName: 'Lord of the Hunt',
    printedPage: 227,
    summary: 'Vous traquez une proie (animal déjà vu ou individu connu, dans la limite fixée par le MJ). Vous ne pouvez perdre sa piste que par un moyen surnaturel, mais la piste s\'arrête si elle entre dans une agglomération. Vous gagnez +1 DR à tous les tests concernant la proie.',
    params: { range: self, targets: self, duration: felHours },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'quarry', text: 'Proie désignée (animal vu ou individu connu) et limite de connaissance validée par le MJ.' },
      { id: 'supernatural', text: 'Un moyen surnaturel brouille-t-il la piste ?' },
      { id: 'settlement', text: 'La proie est-elle entrée dans une agglomération (piste terminée) ?' },
      { id: 'quarry-tests', text: 'Tests concernés par la proie (+1 DR), décision MJ.' }
    ],
    clauses: [
      { id: 'track-lock', mode: 'manual', text: 'La piste de la proie ne se perd que par moyen surnaturel.' },
      { id: 'settlement-end', mode: 'manual', text: 'Si la proie entre dans une agglomération, la piste s\'arrête là.' },
      { id: 'quarry-sl', mode: 'manual', text: '+1 DR à tous les tests concernant la proie.' }
    ]
  },
  {
    name: 'Enchevêtrement',
    canonicalName: 'Tanglefoot',
    printedPage: 228,
    summary: 'Racines, lianes et plantes grimpantes saisissent toutes les cibles de la zone : chacune gagne l\'État Entravé (Entangled) avec une Force égale à votre Sociabilité.',
    params: { range, targets: { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' }, duration: { kind: 'instant' } },
    status: 'assisted',
    effects: [{ type: 'condition', key: 'Entangled', level: 1, strengthFrom: { kind: 'characteristic', characteristic: 'Soc', target: 'source' } }],
    targetRules: [],
    needsInput: [
      { id: 'area-center', text: 'Point central de la zone dans la portée (Sociabilité yards).' },
      { id: 'area-targets', text: 'Créatures présentes dans la zone (rayon Bonus de Sociabilité yards).' }
    ],
    clauses: [
      { id: 'entangled', mode: 'engine', text: 'Chaque cible de la zone gagne l\'État Entangled avec une Force égale à la Sociabilité du prêtre (valeur entière, pas le Bonus).' },
      { id: 'instant', mode: 'engine', text: 'Durée instantanée : l\'État est posé une fois; sa durée ensuite relève des règles de l\'État.' }
    ],
    sourceDelta: 'État dont la Force vaut la caractéristique Sociabilité entière : l’État est posé au niveau 1 et la Force est portée par sa source (source.strength), avec rappel du Test de Force opposé.'
  },
  {
    name: 'Dent et griffe',
    canonicalName: 'Tooth and Claw',
    printedPage: 228,
    summary: 'Vous gagnez les Traits de créature Morsure (Bonus de Force + 3) et Arme (Bonus de Force + 4); vos attaques sont Magiques.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [
      { type: 'grant-actions', actions: [{ id: 'bite', name: 'Morsure', damageFormula: 'BF+3' }, { id: 'weapon', name: 'Arme', damageFormula: 'BF+4' }] },
      { type: 'weapon-bonus', magical: true }
    ],
    targetRules: [],
    needsInput: [],
    clauses: [
      { id: 'bite', mode: 'engine', text: 'Trait Morsure (Bonus de Force + 3) pendant la durée.' },
      { id: 'weapon', mode: 'engine', text: 'Trait Arme (Bonus de Force + 4) pendant la durée.' },
      { id: 'magical', mode: 'engine', text: 'Les attaques de mêlée du prêtre sont Magiques (arbitrage MJ : toutes les attaques de mêlée, pas le tir).' }
    ],
    sourceDelta: 'Le texte imprimé dit « Their attacks are Magical » : portée exacte (attaques de ces Traits ou toutes) ambiguë.'
  }
];
