// Miracles de Ranald, aspect Joueur — Deft Steps, Light Fingers p.19 (imprimée = physique). Transcription vérifiée au PDF ; texte reformulé.
// Miracles du livre de base réutilisés par le Gambler-Priest, non retranscrits : Cat's Eyes, Ranald's Grace, Rich Man Poor Man Beggar Man Thief, Stay Lucky.
export const cult = 'Ranald';
export const aspect = 'Gamester';
export const source = { bookId: 'DeftSteps', document: 'Deft Steps Light Fingers.pdf', fileSha256: 'aea5d0c2d5b998386cc4b4563fa60bc85c355327b29270f4e6cd58ed1325f89d', edition: 'WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025' };

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };
const felBonusYards = soc('characteristic-bonus', 'yards');

export const miracles = [
  {
    name: 'Fortune généreuse', canonicalName: 'Bountiful Fortune', printedPage: 19,
    summary: 'D’un geste des doigts croisés, le prêtre accorde à plusieurs compagnons le droit d’inverser l’ordre des dés de pourcentage au prochain Test qu’ils feront (82 devient 28). Cette faveur est perdue si elle n’est pas utilisée dans la durée.',
    params: { range: felBonusYards, targets: soc('characteristic-bonus', 'allies'), duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: ['ally'],
    needsInput: [
      { id: 'allies', text: 'Quels compagnons sont désignés (Bonus de Sociabilité alliés, à portée) ?' },
      { id: 'used', text: 'Chaque allié a-t-il utilisé son inversion sur son prochain Test avant la fin de la durée ?' }
    ],
    clauses: [
      { id: 'reverse-dice', mode: 'manual', text: 'Chaque allié désigné peut inverser les dés de pourcentage de son prochain Test (une fois).' },
      { id: 'boon-expires', mode: 'manual', text: 'La faveur non utilisée dans la durée est perdue.' }
    ]
  },
  {
    name: 'Crise de confiance', canonicalName: 'Crisis of Confidence', printedPage: 19,
    summary: 'Le prêtre siffle un air guilleret qui sape la confiance d’un adversaire sur le point de faire un Test volontaire de Sociabilité : celui-ci prend peur du risque et renonce à ce qu’il avait prévu. S’il doit tout de même faire le Test, il subit -20.',
    params: { range: felBonusYards, targets: one, duration: { kind: 'instant' } },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Quelle cible est sur le point de faire un Test de Sociabilité volontaire ?' },
      { id: 'forced', text: 'La cible doit-elle faire le Test malgré tout (malus de -20) ?' }
    ],
    clauses: [
      { id: 'back-down', mode: 'manual', text: 'La cible renonce à son Test volontaire de Sociabilité.' },
      { id: 'forced-penalty', mode: 'manual', text: 'Si elle doit le faire quand même : -20 à ce Test.' }
    ],
    sourceDelta: 'Le livre vise un Test « Fellowship-based » (basé sur la Sociabilité) : la liste exacte des compétences concernées n’est pas donnée, le MJ tranche. Le malus est de -20 (points de pourcentage), non des DR.'
  },
  {
    name: 'Forcer la main du hasard', canonicalName: 'Force the Hand of Chance', printedPage: 19,
    summary: 'Le prêtre demande à Ranald de rejuger une épreuve difficile : +1 DR à un Test précis, auquel s’ajoute +1 DR supplémentaire à chaque jet de 1d10 de 6 ou moins, tant que les jets réussissent. Un 7 ou plus fait perdre tous les DR accumulés et impose le Test initial à -1 DR.',
    params: { range: self, targets: self, duration: { kind: 'instant' } },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'test', text: 'Quel Test précis est amélioré ?' },
      { id: 'rolls', text: 'Résultats successifs des jets de 1d10 (6 ou moins : +1 DR de plus ; 7 ou plus : tout perdu et -1 DR au Test).' }
    ],
    clauses: [
      { id: 'base-bonus', mode: 'manual', text: '+1 DR au Test choisi.' },
      { id: 'push-your-luck', mode: 'manual', text: 'Jet de 1d10 : 6 ou moins ajoute +1 DR et permet de rejouer ; on peut continuer tant que les jets réussissent.' },
      { id: 'bust', mode: 'manual', text: 'Un jet de 7 ou plus fait perdre tous les DR accumulés et le Test initial se fait à -1 DR.' }
    ],
    sourceDelta: 'Le livre ne précise pas si le prêtre doit annoncer le Test avant de lancer ni s’il peut s’arrêter avant le premier jet : lecture MJ (le prêtre choisit quand s’arrêter).'
  },
  {
    name: 'Empathie parfaite', canonicalName: 'Perfect Empathy', printedPage: 19,
    summary: 'Tel un chat qui se glisse dans l’ombre, le prêtre se glisse dans l’esprit de son interlocuteur : il comprend parfaitement sa langue, ses intentions et ce qu’il a en tête. Ce qu’il en fait relève de lui.',
    params: { range: felBonusYards, targets: one, duration: soc('characteristic-bonus', 'minutes') },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Quelle personne parle avec le prêtre et est à portée ?' },
      { id: 'insight', text: 'Ce que le prêtre comprend du sens, des intentions et des pensées de la cible (MJ).' }
    ],
    clauses: [
      { id: 'understand', mode: 'manual', text: 'Le prêtre comprend le sens, les intentions et ce que pense la cible, quelle que soit sa langue.' }
    ]
  },
  {
    name: 'Le Maître du jeu', canonicalName: 'The Gamemaster', printedPage: 19,
    summary: 'Le prêtre invoque Ranald, maître de tous les jeux : devant une partie, un sport ou un passe-temps, il en connaît aussitôt les règles et les meilleures stratégies. Si le jeu repose sur l’habileté mentale (non sur le seul hasard ou la force physique), ses Tests pour y jouer sont à +4 DR. À la fin, il oublie tout sauf les règles.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'hours') },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'game', text: 'Quel jeu est observé, et repose-t-il sur l’habileté mentale (+4 DR) ou sur le hasard / la force physique (pas de bonus) ?' }
    ],
    clauses: [
      { id: 'rules-known', mode: 'manual', text: 'Le prêtre connaît les règles et les meilleures stratégies du jeu observé.' },
      { id: 'skill-bonus', mode: 'manual', text: '+4 DR aux Tests du prêtre pour jouer à un jeu d’habileté mentale.' },
      { id: 'forget', mode: 'manual', text: 'À la fin du miracle, le prêtre oublie tout sauf les règles.' }
    ],
    sourceDelta: 'Le bonus ne vaut que pour une catégorie de jeux décidée par le MJ et pour des Tests de compétence non nommés : test-modifier par clé de compétence inadapté ; manuel.'
  },
  {
    name: 'Faire monter les enjeux', canonicalName: 'Up the Stakes', printedPage: 19,
    summary: 'Le prêtre prie Ranald d’amplifier les effets de sa chance : le Test de la cible est fait normalement, mais une réussite devient automatiquement un Succès Retentissant et un échec un Échec Cuisant.',
    params: { range: felBonusYards, targets: one, duration: { kind: 'fixed', value: 1, unit: 'rounds' } },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Qui fait le Test amplifié (le texte parle du prêtre : « Take any Test as normal ») ?' },
      { id: 'test', text: 'Quel Test est fait pendant le Round et quel est son résultat (réussite : Succès Retentissant ; échec : Échec Cuisant) ?' }
    ],
    clauses: [
      { id: 'astounding', mode: 'manual', text: 'Une réussite devient automatiquement un Succès Retentissant.' },
      { id: 'impressive-failure', mode: 'manual', text: 'Un échec devient automatiquement un Échec Cuisant.' }
    ],
    sourceDelta: 'Cible imprimée « 1 » mais le texte dit « tout Test que vous faites » : ambigu entre le prêtre et la cible désignée. Les noms français « Succès Retentissant » (Astounding Success) et « Échec Cuisant » (Impressive Failure) sont des traductions retenues faute de repère dans les modules existants.'
  }
];
