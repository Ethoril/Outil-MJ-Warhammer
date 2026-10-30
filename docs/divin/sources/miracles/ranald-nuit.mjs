/*
 * Miracles de Ranald, aspect Rôdeur de Nuit — Deft Steps, Light Fingers p.18 (imprimée = physique).
 * Transcription vérifiée au PDF (WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025) ; texte reformulé.
 *
 * Règles de culte de Ranald utiles (Deft p.13-15), valables pour les quatre aspects (aucune n'est dans le tableau) :
 * - Bénédictions identiques pour tous les aspects (livre de base p.220) : Charisme, Conscience, Finesse, Fortune, Protection, Esprit.
 * - Un Prêtre générique de Ranald (carrière du livre de base) peut acheter à l'XP : Bamboozle, Perfect Empathy, Talk Your Way Out,
 *   Unremembered Face (p.13).
 * - Chaque carrière d'aspect réutilise des miracles du livre de base, non retranscrits ici : Thief-Priest (Rôdeur de Nuit) : An Invitation,
 *   Cat's Eyes, Ranald's Grace, Stay Lucky, You Ain't Seen Me Right ; Gambler-Priest (Joueur) : Cat's Eyes, Ranald's Grace,
 *   Rich Man Poor Man Beggar Man Thief, Stay Lucky ; Trickster-Priest (Trompeur) : Cat's Eyes, Ranald's Grace, Rich Man Poor Man
 *   Beggar Man Thief, Stay Lucky, You Ain't Seen Me Right ; Liberator-Priest (Protecteur) : An Invitation, Cat's Eyes,
 *   Rich Man Poor Man Beggar Man Thief, Stay Lucky, You Ain't Seen Me Right.
 * - Changer d'aspect : possible dès le niveau Prêtre ; les miracles déjà connus sont conservés (p.13).
 * - « Ranald's Gamble » (p.15) : un prêtre de Ranald peut remplacer l'achat normal d'un miracle par un Test de Prière Difficile (-10) ;
 *   échec : 1 Point de Péché et surcoût de +10 XP par DR négatif au prochain miracle acheté ; réussite : le prochain miracle coûte moitié prix.
 * - Ranald le Donneur (Dealer, p.24) n'a ni carrière ni miracle propre : Prêtre générique avec Haggle et Evaluate au choix, miracles du
 *   livre de base plus A Suitable Stooge (= A Suitable Sucker, aspect Trompeur), Bamboozle, Force the Hand of Chance, Perfect Empathy, Up the Stakes.
 */
export const cult = 'Ranald';
export const aspect = 'Night Prowler';
export const source = { bookId: 'DeftSteps', document: 'Deft Steps Light Fingers.pdf', fileSha256: 'aea5d0c2d5b998386cc4b4563fa60bc85c355327b29270f4e6cd58ed1325f89d', edition: 'WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025' };

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Sons lointains', canonicalName: 'Distant Sounds', printedPage: 18,
    summary: 'Le prêtre entend nettement une conversation ou un bruit en provenance de tout endroit à portée (derrière un mur, dans une pièce éloignée), à condition d’avoir une cible précise en tête et de savoir où elle est. Il peut aussi lui murmurer des paroles. Contrairement à Yeux de chat, cela fonctionne à travers des pièces closes.',
    params: { range: soc('characteristic', 'yards'), targets: one, duration: soc('characteristic-bonus', 'minutes') },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Quelle cible précise le prêtre écoute-t-il, et sait-il où elle se trouve (personne vue ou localisée) ?' },
      { id: 'heard', text: 'Ce que le prêtre entend, communiqué au joueur par le MJ.' }
    ],
    clauses: [
      { id: 'listen', mode: 'manual', text: 'Le prêtre entend clairement les échanges ou bruits de la cible à portée, même derrière un mur ou en pièce scellée.' },
      { id: 'whisper', mode: 'manual', text: 'Le prêtre peut aussi murmurer des paroles que la cible entend.' }
    ],
    sourceDelta: 'Portée imprimée « Fellowship yards » (sans « Bonus ») : lue comme la Sociabilité entière, non son Bonus.'
  },
  {
    name: 'Longue portée', canonicalName: 'Long Reach', printedPage: 18,
    summary: 'Des bras invisibles prolongent la portée du prêtre jusqu’à la distance du miracle : il peut saisir ou manipuler ce qu’il atteint, s’agripper à une échelle ou un rebord, soulever un objet d’au plus 2 Enc et faire des Tests d’Escamotage.',
    params: { range: soc('characteristic-bonus', 'yards'), targets: self, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'reach-target', text: 'Quel objet, rebord ou échelle est saisi, à quelle distance (dans la portée) ?' },
      { id: 'weight', text: 'L’objet soulevé pèse-t-il 2 Enc ou moins ?' }
    ],
    clauses: [
      { id: 'extended-reach', mode: 'manual', text: 'La portée de main du prêtre est étendue de la portée du miracle ; il saisit et manipule ce qu’il atteint.' },
      { id: 'lift', mode: 'manual', text: 'Il peut soulever un objet de 2 Enc ou moins.' },
      { id: 'sleight', mode: 'manual', text: 'Il peut effectuer des Tests d’Escamotage à distance.' }
    ]
  },
  {
    name: 'Perdre le butin', canonicalName: 'Lose the Loot', printedPage: 18,
    summary: 'Le prêtre touche ce qu’il a gagné illégalement : il sent à qui et où revendre son butin à bon prix. Dans une grande ville, il pressent où se trouve le receleur le plus proche. L’accueil du receleur est laissé au MJ, mais sans Point de Péché il est au moins disposé à traiter.',
    params: { range: self, targets: { kind: 'area', characteristicBonus: 'Soc', unit: 'miles' }, duration: soc('characteristic-bonus', 'hours') },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'settlement', text: 'Le prêtre est-il dans une grande ville ou cité (intuition du receleur) ?' },
      { id: 'sin', text: 'Le prêtre a-t-il des Points de Péché (accueil du receleur) ?' },
      { id: 'fence', text: 'Où se trouve le receleur le plus proche et comment accueille-t-il le prêtre (décision MJ) ?' }
    ],
    clauses: [
      { id: 'buyer-sense', mode: 'manual', text: 'Le prêtre sent qui et où le butin peut être vendu à un prix correct, dans la zone.' },
      { id: 'fence-intuition', mode: 'manual', text: 'En grande ville, il sait où trouver le receleur le plus proche.' },
      { id: 'fence-attitude', mode: 'manual', text: 'Sans Point de Péché, le receleur est au moins disposé à faire affaire ; le reste est laissé au MJ.' }
    ],
    sourceDelta: 'La zone est un nombre de miles (Bonus de Sociabilité) autour du prêtre : unité miles de la grammaire params.'
  },
  {
    name: 'Le silence règne', canonicalName: 'Silence Reigns', printedPage: 18,
    summary: 'Le prêtre demande à Ranald de tromper l’ouïe d’autrui : toute personne dans la zone n’entend que le bruit de fond habituel, sans percevoir pas, aboiements ni autres sons brusques.',
    params: { range: self, targets: { kind: 'area', characteristicBonus: 'Ag', unit: 'yards' }, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'area', text: 'Quelles créatures sont dans la zone (Bonus d’Agilité mètres autour du prêtre) ?' }
    ],
    clauses: [
      { id: 'masked-sound', mode: 'manual', text: 'Dans la zone, les créatures n’entendent que le bruit de fond normal : les pas, les chiens et les sons soudains passent inaperçus.' }
    ],
    sourceDelta: 'La zone dépend du Bonus d’Agilité (et non de Sociabilité), alors que la durée suit le Bonus de Sociabilité.'
  },
  {
    name: 'Visage de pauvre', canonicalName: "Poor Man's Face", printedPage: 18,
    summary: 'Ranald dissimule les objets de valeur portés par le prêtre : une fouille ne trouve que des babioles sans valeur (miettes, caillou). Ranald garde les valeurs pendant la durée ; pour chaque heure où un objet reste caché, 1 % de chances que le dieu se l’approprie définitivement.',
    params: { range: self, targets: self, duration: { kind: 'special', label: '1 + SL hours' } },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'success-levels', text: 'Nombre de DR obtenus (durée : 1 + DR heures).' },
      { id: 'valuables', text: 'Quels objets de valeur sont cachés ?' },
      { id: 'theft-roll', text: 'Chaque heure : jet de 1 % pour savoir si Ranald garde un objet.' }
    ],
    clauses: [
      { id: 'hidden-valuables', mode: 'manual', text: 'Les valeurs du prêtre sont remplacées, pour toute fouille, par des objets sans valeur.' },
      { id: 'duration-sl', mode: 'manual', text: 'Durée : 1 heure + 1 heure par DR du Test de Prière (le MJ termine la prière à l’échéance).' },
      { id: 'ranald-keeps', mode: 'manual', text: 'Par heure de dissimulation d’un objet : 1 % de chances que Ranald le garde.' }
    ],
    sourceDelta: 'Durée « 1 + SL hours » : encodée en special (la grammaire n’a pas de durée liée aux DR) ; lue comme 1 heure plus les DR du Test de Prière.'
  },
  {
    name: 'Se sortir d’affaire par la parole', canonicalName: 'Talk Your Way Out', printedPage: 18,
    summary: 'Le prêtre peut se tirer des situations les plus compromettantes : il gagne un bonus unique de +8 DR à un Test de Charme tenté pour échapper à une arrestation en flagrant délit.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'minutes') },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'caught', text: 'Le prêtre est-il pris la main dans le sac et tente-t-il de s’en sortir par la parole ?' },
      { id: 'used', text: 'Le bonus unique de +8 DR a-t-il déjà été utilisé pendant la durée ?' }
    ],
    clauses: [
      { id: 'charm-bonus', mode: 'manual', text: '+8 DR, une seule fois, à un Test de Charme pour se sortir d’un flagrant délit.' }
    ],
    sourceDelta: 'Bonus ponctuel (un seul Test) : le test-modifier du moteur s’applique à tous les Tests de la compétence pendant la durée, donc il ne convient pas ; resté manuel.'
  },
  {
    name: 'La pression retombe', canonicalName: 'The Heat Is Off', printedPage: 18,
    summary: 'Après un crime, pendant quelques heures, les gens se désintéressent étrangement du prêtre : les autorités détournent le regard et on se souvient mal de son passage. Avec les règles de patrouille du guet (p.92), on retranche 3 au score de présence du guet. Un nouveau crime met fin au miracle. Tous les Tests de Sociabilité du prêtre subissent -3 DR tant que le miracle dure.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'hours') },
    status: 'assisted',
    effects: [{ type: 'test-modifier', categories: { soc: -3 } }],
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'crime', text: 'Le prêtre vient-il de commettre un crime ? Un nouveau crime a-t-il été tenté pendant la durée (fin du miracle) ?' },
      { id: 'watch', text: 'Score de présence du guet à ajuster (règles de patrouille, p.92 du livre).' }
    ],
    clauses: [
      { id: 'disinterest', mode: 'manual', text: 'Les gens se désintéressent du prêtre et se souviennent mal de sa venue ; les autorités détournent les yeux.' },
      { id: 'watch-minus-3', mode: 'manual', text: 'Règles de patrouille du guet : -3 au score de présence du guet.' },
      { id: 'ends-on-crime', mode: 'manual', text: 'Une nouvelle tentative de crime met fin au miracle.' },
      { id: 'fellowship-penalty', mode: 'engine', text: 'Tous les Tests de Sociabilité du prêtre subissent -3 DR pendant la durée.' }
    ],
    sourceDelta: 'Le malus de -3 DR vise « tous les Tests basés sur Fellowship » : catégorie de Tests résolue en clés de compétences liées à Sociabilité (catalogue), Prière exclue (arbitrage MJ). Le guet et la fin du miracle sur nouveau crime restent des rappels.'
  }
];
