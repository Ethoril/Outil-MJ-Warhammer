// Miracles de Taal (Ranger-Priest) — Deft Steps, Light Fingers p.88 (imprimée = physique). Transcription vérifiée au PDF ; texte reformulé.
// Source distincte du livre de base (taal.mjs, p.227-228) : mêmes cultes, miracles supplémentaires propres à la carrière Ranger-Priest.
export const cult = 'Taal';
export const source = { bookId: 'DeftSteps', document: 'Deft Steps Light Fingers.pdf', fileSha256: 'aea5d0c2d5b998386cc4b4563fa60bc85c355327b29270f4e6cd58ed1325f89d', edition: 'WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025' };

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };
const area = (unit = 'yards') => ({ kind: 'area', characteristicBonus: 'Soc', unit });

export const miracles = [
  {
    name: 'Cœur d’aurochs', canonicalName: "Auroch's Heart", printedPage: 88,
    summary: 'Le prêtre prie Taal d’emplir un personnage de la constitution d’un bœuf sauvage : la cible gagne +Bonus de Sociabilité DR à tous les Tests d’Endurance jusqu’à la fin du miracle.',
    params: { range: { kind: 'touch' }, targets: one, duration: { kind: 'special', label: 'Fellowship Bonus + 3 Rounds' } },
    status: 'manual', effect: null,
    targetRules: ['withinTouch'],
    needsInput: [
      { id: 'target', text: 'Quelle créature est touchée ?' },
      { id: 'bonus', text: 'Bonus de Sociabilité du prêtre (DR ajoutés aux Tests d’Endurance de la cible).' }
    ],
    clauses: [
      { id: 'toughness-bonus', mode: 'manual', text: 'La cible gagne +Bonus de Sociabilité du prêtre en DR à ses Tests d’Endurance jusqu’à la fin du miracle.' },
      { id: 'duration', mode: 'manual', text: 'Durée : Bonus de Sociabilité + 3 Rounds ; le MJ termine la prière à l’échéance.' }
    ],
    sourceDelta: 'Le bonus est « +Fellowship Bonus » en DR : valeur dépendant du prêtre, non fixe, donc non couvrable par un test-modifier (entier fixe). « Toughness Tests » : lu comme les Tests d’Endurance (compétence), le livre ne dit pas si cela inclut les Tests de caractéristique d’Endurance. Durée « Fellowship Bonus + 3 Rounds » encodée en special.'
  },
  {
    name: 'Tremblement de terre', canonicalName: 'Earthshudder', printedPage: 88,
    summary: 'Le prêtre invoque Taal trois fois et lève les bras : le Seigneur de la Nature fait gronder le tonnerre et trembler le sol. Chaque cible à moins de Bonus de Sociabilité yards d’un point visé doit réussir un Test d’Athlétisme Difficult (-10) ou gagne l’État À terre. Les structures artificielles dans la zone subissent 1d10 + DR dégâts.',
    params: { range: soc('characteristic', 'yards'), targets: area(), duration: { kind: 'instant' } },
    status: 'assisted',
    effects: [{ type: 'condition', key: 'Prone', level: 1, when: { fact: 'athleticsFailed', label: 'a échoué à son Test d’Athlétisme Difficult (-10 en V4, -1 DR en V5)' } }],
    targetRules: [],
    needsInput: [
      { id: 'point', text: 'Quel point de la portée est visé (centre de la zone, Bonus de Sociabilité yards) ?' },
      { id: 'targets', text: 'Quelles créatures sont dans la zone et quel est le résultat de leur Test d’Athlétisme Difficult (-10) ?' },
      { id: 'structures', text: 'Quelles structures artificielles sont dans la zone (1d10 + DR dégâts chacune) ?' }
    ],
    clauses: [
      { id: 'athletics-test', mode: 'engine', text: 'Chaque cible dans la zone fait un Test d’Athlétisme Difficult (-10) ; échec : elle gagne l’État À terre.' },
      { id: 'structure-damage', mode: 'manual', text: 'Chaque structure artificielle dans la zone subit 1d10 + DR dégâts (les éléments naturels ne sont pas touchés).' }
    ],
    sourceDelta: 'Portée imprimée « Fellowship yards » (sans « Bonus ») : lue comme la Sociabilité entière ; zone en Bonus de Sociabilité yards. Le Test d’Athlétisme de chaque cible reste joué hors moteur : le MJ saisit son résultat (fait par cible) et le moteur pose À terre en cas d’échec. Difficulté Difficult (-10) imprimée en pourcentage (4e édition), affichée -1 DR (conversion par défaut, non confirmée). Le livre ne dit pas si « SL » est le DR du Test de Prière (lu ainsi).'
  },
  {
    name: 'Festin de la nature', canonicalName: "Nature's Repast", printedPage: 88,
    summary: 'Le prêtre remercie Taal de ses dons. Nourriture glanée ou chassée en pleine nature, touchée, devient plus nourrissante : quiconque la mange peut passer quatre jours sans Test d’Endurance de famine. Le miracle affecte jusqu’à six repas individuels et n’augmente pas la quantité de nourriture : il n’y a pas plus de bouches nourries, c’est la nourriture qui est plus consistante.',
    params: { range: { kind: 'touch' }, targets: { kind: 'special' }, duration: { kind: 'special', label: 'Permanent' } },
    status: 'manual', effect: null,
    targetRules: ['withinTouch', 'nourriture glanée ou chassée dans la nature'],
    needsInput: [
      { id: 'food', text: 'Quels repas touchés (six au plus), de nourriture glanée ou chassée dans la nature ?' }
    ],
    clauses: [
      { id: 'sustaining', mode: 'manual', text: 'Chaque repas affecté permet à qui le mange de passer quatre jours sans Test d’Endurance de famine.' },
      { id: 'six-meals', mode: 'manual', text: 'Jusqu’à six repas individuels sont affectés ; la quantité de nourriture n’augmente pas.' }
    ],
    sourceDelta: 'Durée permanente (encodée en special) : l’effet est lié à la nourriture et non au prêtre. Le livre ne dit pas si les quatre jours sans Test valent par repas ou une fois pour tous les repas mangés.'
  },
  {
    name: 'Paix de Taal', canonicalName: 'Pax of Taal', printedPage: 88,
    summary: 'Le prêtre murmure une prière animale à Taal : toutes les bêtes dans la zone fixent les yeux sur lui. Toute créature de Trait Bestial dans la zone s’apaise et n’attaque personne, ni proie ni congénère. Sans effet sur les créatures corrompues par le Chaos. Si un personnage attaque les animaux, l’effet sur eux cesse.',
    params: { range: self, targets: { kind: 'area', characteristic: 'Soc', unit: 'yards' }, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: ['Trait Bestial', 'ni mutant ni Chaos'],
    needsInput: [
      { id: 'beasts', text: 'Quelles créatures de Trait Bestial sont dans la zone (Sociabilité yards autour du prêtre), aucune souillée par le Chaos ?' },
      { id: 'attack', text: 'Un personnage a-t-il attaqué les animaux (fin de l’effet sur eux) ?' }
    ],
    clauses: [
      { id: 'calm', mode: 'manual', text: 'Les créatures de Trait Bestial dans la zone sont calmes et n’attaquent personne, proie ou congénère.' },
      { id: 'chaos-immune', mode: 'manual', text: 'Les créatures déformées par le Chaos ne sont pas affectées.' },
      { id: 'broken-by-attack', mode: 'manual', text: 'Si un personnage attaque les animaux, l’effet sur eux est brisé.' }
    ],
    sourceDelta: 'Zone imprimée « Fellowship yards » (sans « Bonus ») : lue comme la Sociabilité entière. « Twisted by Chaos » : le livre ne définit pas la liste des créatures touchées (mutants, bêtes du Chaos…), le MJ tranche.'
  },
  {
    name: 'Patte déchirante', canonicalName: 'Rending Paw', printedPage: 88,
    summary: 'Le prêtre rugit un défi avec la férocité du Seigneur de la Nature en pleine fureur : lui ou un allié reçoit une force surprenante. La cible gagne +20 en Force jusqu’à la fin du miracle.',
    params: { range: soc('characteristic-bonus', 'yards'), targets: one, duration: soc('characteristic-bonus', 'rounds') },
    status: 'assisted', effect: null,
    effects: [{ type: 'characteristic-modifier', characteristic: 'F', value: 20 }],
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Qui est la cible : le prêtre ou un allié à portée ?' }
    ],
    clauses: [
      { id: 'strength-plus-20', mode: 'engine', text: 'Force +20 pendant la durée (modificateur de caractéristique).' }
    ],
    sourceDelta: 'Le livre précise « you or an ally » : la cible peut être le prêtre. Valeur « +20 » imprimée en points de caractéristique, reprise telle quelle en modificateur de F.'
  },
  {
    name: 'Bénédiction de la rivière', canonicalName: "River's Blessing", printedPage: 88,
    summary: 'Le prêtre implore Taal, Seigneur des Rivières, de lui accorder un passage sûr : pendant la durée, il gagne +4 DR à tous ses Tests de Natation, et sa vitesse dans l’eau est son Mouvement complet au lieu de la moitié. Sans effet en eau salée.',
    params: { range: self, targets: self, duration: soc('characteristic', 'rounds') },
    status: 'assisted', effect: null,
    effects: [{ type: 'test-modifier', modifiers: { 'Natation': 4 } }],
    targetRules: ['prêtre uniquement', 'eau douce'],
    needsInput: [
      { id: 'freshwater', text: 'Le prêtre est-il dans l’eau douce (aucun effet en eau salée) ?' },
      { id: 'movement', text: 'Mouvement du prêtre dans l’eau (pleine valeur au lieu de la moitié).' }
    ],
    clauses: [
      { id: 'swim-bonus', mode: 'engine', text: '+4 DR à tous les Tests de Natation du prêtre pendant la durée.' },
      { id: 'water-speed', mode: 'manual', text: 'En se déplaçant dans l’eau, la vitesse du prêtre est son Mouvement complet, non la moitié.' },
      { id: 'salt-water', mode: 'manual', text: 'Aucun effet en eau salée : le MJ vérifie la nature de l’eau (le bonus de Natation reste appliqué par le moteur).' }
    ],
    sourceDelta: 'Durée imprimée « Fellowship Rounds » (sans « Bonus », contrairement aux autres durées) : lue telle quelle comme la Sociabilité entière en Rounds, probable coquille pour « Fellowship Bonus » mais non corrigée. Eau salée : le moteur ne distingue pas la nature de l’eau, le test-modifier reste actif et le MJ ne doit pas le laisser jouer.'
  },
  {
    name: 'Vent sauvage', canonicalName: 'Wild Wind', printedPage: 88,
    summary: 'Le prêtre appelle le Seigneur de la Nature, qui lève un vent déchaîné en tourbillon. Le prêtre n’est pas affecté ; toutes les cibles de la zone sont malmenées par des vents irrésistibles : leurs Tests de Capacité de Combat ou d’Agilité subissent -2 DR, et chaque Round elles doivent réussir un Test d’Endurance Difficult (-10) pour éviter l’État À terre. Aucune attaque à distance n’est possible dans la zone ; seules les armes à poudre ou d’artillerie peuvent viser une cible dans la zone.',
    params: { range: self, targets: { kind: 'special' }, duration: soc('characteristic-bonus', 'rounds') },
    status: 'assisted',
    effects: [{ type: 'condition', key: 'Prone', level: 1, when: { fact: 'toughnessFailed', label: 'a échoué à son Test d’Endurance Difficult (-10 en V4, -1 DR en V5) du premier Round' } }],
    targetRules: ['prêtre non affecté'],
    needsInput: [
      { id: 'area', text: 'Taille de la zone : le livre l’indique « X » sans valeur ; décision MJ.' },
      { id: 'toughness', text: 'Chaque Round : résultat du Test d’Endurance Difficult (-10) de chaque cible dans la zone.' },
      { id: 'ranged', text: 'Attaques à distance tentées dans la zone (interdites sauf armes à poudre ou d’artillerie) ?' }
    ],
    clauses: [
      { id: 'priest-unaffected', mode: 'manual', text: 'Le prêtre n’est pas affecté par le vent.' },
      { id: 'test-penalty', mode: 'manual', text: 'Les Tests de Capacité de Combat et d’Agilité des cibles dans la zone subissent -2 DR.' },
      { id: 'prone-first-round', mode: 'engine', text: 'Premier Round : chaque cible fait un Test d’Endurance Difficult (-10) ; échec : elle gagne l’État À terre (résultat saisi par le MJ).' },
      { id: 'prone-each-round', mode: 'manual', text: 'Chaque Round suivant, chaque cible refait un Test d’Endurance Difficult (-10) ; échec : elle gagne l’État À terre.' },
      { id: 'no-ranged', mode: 'manual', text: 'Aucune attaque à distance n’est possible dans la zone, sauf armes à poudre ou d’artillerie ; ces armes peuvent seules viser les cibles dans la zone.' }
    ],
    sourceDelta: 'Zone imprimée « AoE (X) » : la taille n’est pas donnée dans le livre (sans doute oubli d’impression) ; encodée en special avec besoin MJ. « Any Weapon Skill or Agility Tests » : lu comme tous les Tests de CC ou d’Agilité (compétences ou caractéristique). Difficulté Difficult (-10) imprimée en pourcentage (4e édition), non convertie en DR.'
  },
  {
    name: 'Voie de la nature', canonicalName: 'Wilderness Way', printedPage: 88,
    summary: 'Les yeux fermés, le prêtre fait de la main gauche le signe du cerf de Taal en attendant que le Seigneur de la Nature guide ses pas. Il peut l’accomplir avant que le groupe entame une période de voyage (Chapitre 7, Pathfinding, p.112). Il note les DR du Test de Prière : ils servent à relancer les résultats de tout Défi de Planification, de Voyage ou de Camp de la période de voyage suivante. Si le voyage est interrompu par une rencontre, les relances restantes sont perdues, mais le miracle peut être retenté avant l’étape suivante.',
    params: { range: self, targets: self, duration: { kind: 'special', label: 'See text' } },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'success-levels', text: 'DR du Test de Prière (nombre de relances disponibles).' },
      { id: 'endeavours', text: 'Quels Défis de Planification, de Voyage ou de Camp de la période de voyage sont relancés ?' },
      { id: 'interrupted', text: 'Le voyage a-t-il été interrompu par une rencontre (relances restantes perdues) ?' }
    ],
    clauses: [
      { id: 'record-sl', mode: 'manual', text: 'Les DR du Test de Prière sont notés et servent de relances pour les Défis de Planification, de Voyage et de Camp de la période de voyage suivante.' },
      { id: 'encounter-resets', mode: 'manual', text: 'Une rencontre qui interrompt le voyage fait perdre les relances restantes ; le miracle peut être retenté avant l’étape suivante.' }
    ],
    sourceDelta: 'Durée « See text » : la période de voyage suivante ; encodée en special. « Endeavour » traduit par Défi, comme les règles de voyage du livre (Chapitre 7, p.112). Le livre ne précise pas quel résultat s’applique après une relance ni qui choisit les Défis relancés.'
  }
];
