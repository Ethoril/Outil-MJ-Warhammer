// Miracles de Ranald, aspect Protecteur — Deft Steps, Light Fingers p.25 (imprimée = physique). Transcription vérifiée au PDF ; texte reformulé.
// Miracles du livre de base réutilisés par le Liberator-Priest, non retranscrits : An Invitation, Cat's Eyes, Rich Man Poor Man Beggar Man Thief, Stay Lucky, You Ain't Seen Me Right.
export const cult = 'Ranald';
export const aspect = 'Protector';
export const source = { bookId: 'DeftSteps', document: 'Deft Steps Light Fingers.pdf', fileSha256: 'aea5d0c2d5b998386cc4b4563fa60bc85c355327b29270f4e6cd58ed1325f89d', edition: 'WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025' };

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };
const yards24 = { kind: 'fixed', value: 24, unit: 'yards' };

export const miracles = [
  {
    name: 'Retour à l’envoyeur', canonicalName: 'Back at You', printedPage: 25,
    summary: 'Paume tendue, doigts croisés, le prêtre vise un combat à portée auquel il ne prend pas part. Le participant le plus faible est celui qui est inférieur dans au moins deux des trois Caractéristiques CC, F, E ; le plus fort est supérieur dans au moins deux. Pendant la durée, les Blessures infligées par le plus fort lors d’une attaque peuvent être ajoutées aux Blessures que le plus faible lui inflige lors de sa prochaine attaque qui cause des dégâts.',
    params: { range: yards24, targets: one, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: ['combat auquel le prêtre ne participe pas'],
    needsInput: [
      { id: 'combat', text: 'Quel combat à portée est visé (le prêtre n’y est pas engagé) ?' },
      { id: 'weaker', text: 'Qui est le plus faible et le plus fort (comparaison de CC, F et E : le plus haut dans au moins deux est le plus fort) ?' },
      { id: 'stored-wounds', text: 'Blessures infligées par le plus fort lors d’une attaque (à reporter sur la prochaine attaque du plus faible).' }
    ],
    clauses: [
      { id: 'weaker-stronger', mode: 'manual', text: 'Détermination du plus faible : comparaison de CC, F et E ; le plus haut dans au moins deux Caractéristiques est le plus fort.' },
      { id: 'echo-wounds', mode: 'manual', text: 'Les Blessures infligées par le plus fort en une attaque s’ajoutent à celles que le plus faible lui infligera la prochaine fois qu’il lui causera des dégâts.' }
    ],
    sourceDelta: 'Le livre ne précise pas si le report vaut pour chaque attaque du plus fort pendant la durée (une seule réserve ou une par attaque), ni ce qui se passe en cas d’égalité sur les trois Caractéristiques.'
  },
  {
    name: 'Lutte des classes', canonicalName: 'Class War', printedPage: 25,
    summary: 'Le prêtre attire l’attention de Ranald sur l’injustice de la société et le dieu maudit les privilégiés. Il faut une cible de rang Or : elle subit une malédiction identique à Malédiction de la malchance (livre de base). Elle dure un jour par niveau de Rang Or de la cible, plus un jour par DR du Test de Prière. Si la cible respecte habituellement les préceptes de Ranald, la malédiction est sans effet.',
    params: { range: yards24, targets: one, duration: { kind: 'special', label: 'Gold Standing days + SL' } },
    status: 'manual', effect: null,
    targetRules: ['cible de Statut Or'],
    needsInput: [
      { id: 'target', text: 'La cible est-elle de Statut Or ? Quel est son Rang Or ?' },
      { id: 'success-levels', text: 'DR du Test de Prière (jours supplémentaires).' },
      { id: 'strictures', text: 'La cible suit-elle habituellement les préceptes de Ranald (malédiction sans effet) ?' }
    ],
    clauses: [
      { id: 'ill-fortune-curse', mode: 'manual', text: 'La cible subit les effets de Malédiction de la malchance (livre de base).' },
      { id: 'duration', mode: 'manual', text: 'Durée : un jour par niveau de Rang Or de la cible, plus un jour par DR du Test de Prière (le MJ termine la malédiction).' },
      { id: 'strictures', mode: 'manual', text: 'Si la cible suit habituellement les préceptes de Ranald, la malédiction n’a aucun effet.' }
    ],
    sourceDelta: 'Renvoie à la Curse of Ill-fortune du livre de base 4e (p.255) ; son équivalent dans le livre de base V5 n’est pas vérifié ici, le MJ applique l’effet de la malédiction équivalente. Durée en jours liée au Rang Or + DR : encodée en special. « Gold Tier » (cible) et « Gold Standing » (durée) sont traduits Statut Or / Rang Or.'
  },
  {
    name: 'Libère ton esprit', canonicalName: 'Free Your Mind', printedPage: 25,
    summary: 'Le prêtre implore Ranald pour résister aux ordres de l’autorité : lui-même ou une cible choisie résiste automatiquement aux effets de tout Test de Charme ou de Commandement fait par un personnage de Statut supérieur à celui de la cible, aussi persuasif soit-il.',
    params: { range: yards24, targets: one, duration: soc('characteristic-bonus', 'hours') },
    status: 'manual', effect: null,
    targetRules: [],
    needsInput: [
      { id: 'target', text: 'Qui est protégé : le prêtre ou une cible choisie à portée ?' },
      { id: 'status', text: 'L’auteur du Test de Charme ou de Commandement a-t-il un Statut supérieur à celui de la cible ?' }
    ],
    clauses: [
      { id: 'auto-resist', mode: 'manual', text: 'La cible résiste automatiquement à tout Test de Charme ou de Commandement d’un personnage de Statut supérieur.' }
    ],
    sourceDelta: 'Le livre cite « Charm or Leadership Test » : Charme et Commandement. Le texte ne dit pas si la protection couvre les ordres dont l’effet est déjà en cours à l’invocation : lecture MJ, seuls les Tests faits pendant la durée sont couverts.'
  },
  {
    name: 'Moment de clarté', canonicalName: 'Moment of Clarity', printedPage: 25,
    summary: 'Le prêtre psalmodie une énigme sur le sens de l’existence ; Ranald répond d’un clin d’œil spirituel. Un bref instant, il voit avec une clarté totale l’absurdité de la vie et de tout ce que font les mortels : rien n’importe vraiment, et c’est hilarant. Pendant la durée, il a le Trait Immunité à la Psychologie.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'rounds') },
    status: 'assisted', effect: null,
    effects: [{ type: 'grant-trait', traits: ['Immunité (Psychologie)'] }],
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'psychology', text: 'Quels effets de Psychologie sont en cours ou visent le prêtre pendant la durée (Immunité à la Psychologie, règles du livre) ?' }
    ],
    clauses: [
      { id: 'immunity', mode: 'engine', text: 'Le prêtre gagne le Trait Immunité à la Psychologie pendant la durée.' },
      { id: 'running-effects', mode: 'manual', text: 'Le MJ décide si un effet de Psychologie déjà en cours (Peur, Terreur, Animosité…) cesse d’agir au lancement.' }
    ],
    sourceDelta: 'Trait imprimé « Immunity to Psychology », encodé Immunité (Psychologie), libellé déjà utilisé par les autres contrats du moteur. Le livre ne dit pas si l’immunité retire un effet de Psychologie déjà subi : décision MJ.'
  },
  {
    name: 'Tous ensemble', canonicalName: 'Rally Round', printedPage: 25,
    summary: 'Le prêtre entonne un chant de Ranald et la foule le reprend. Tous les alliés dans la zone gagnent +2 DR aux Tests d’Endurance et de Calme, avec +1 DR de plus par tranche de 10 personnes dans la foule. Le miracle n’affecte pas les personnages de Statut Argent ou Or.',
    params: { range: self, targets: { kind: 'area', characteristic: 'Soc', unit: 'yards' }, duration: soc('characteristic-bonus', 'rounds') },
    status: 'assisted',
    effects: [{ type: 'test-modifier', modifiers: { 'Résistance': { base: 2, perGroup: { size: 10, add: 1 } }, 'Calme': { base: 2, perGroup: { size: 10, add: 1 } } } }],
    targetRules: ['ally', 'ni Statut Argent ni Or'],
    needsInput: [
      { id: 'allies', text: 'Quels alliés sont dans la zone (Sociabilité mètres autour du prêtre) et aucun n’est de Statut Argent ou Or ?' }
    ],
    clauses: [
      { id: 'endurance-cool', mode: 'engine', text: 'Chaque allié affecté gagne +2 DR aux Tests d’Endurance et de Calme.' },
      { id: 'crowd-scaling', mode: 'engine', text: '+1 DR supplémentaire par tranche de 10 personnes dans la foule (taille saisie par le MJ).' },
      { id: 'status-exclusion', mode: 'manual', text: 'Les personnages de Statut Argent ou Or ne sont pas affectés.' }
    ],
    sourceDelta: 'Zone imprimée « Fellowship yards » (sans « Bonus ») : lue comme la Sociabilité entière. Le livre ne précise pas si la foule compte uniquement les alliés ou toute personne présente, ni si le +1 DR par 10 se calcule sur le nombre total ou sur les tranches complètes (lecture : tranches complètes). Lecture retenue (non confirmée par le MJ) : la foule compte toute personne présente, saisie par le MJ (crowdSize), et le bonus vaut 2 + 1 par tranche complète de 10 ; « Endurance » est normalisé en Résistance.'
  },
  {
    name: 'Sous ma protection', canonicalName: 'Under My Protection', printedPage: 25,
    summary: 'Le prêtre attire l’attention de Ranald sur la cruauté des puissants. Il faut une cible qui a menacé ou persécuté une victime choisie (noble tyrannique, racketteur, prêtre sectaire…). Dès son prochain sommeil, Ranald lui inflige des cauchemars terrifiants. Tant que dure le tourment, la cible fait un Test de Calme Challenging (+0) chaque matin ; en cas d’échec, elle subit l’État Exténué. Si elle traite ses victimes avec bonté ou répare, les rêves cessent.',
    params: { range: { kind: 'special' }, targets: one, duration: { kind: 'special', label: 'Fellowship Bonus months' } },
    status: 'manual', effect: null,
    targetRules: ['a menacé ou persécuté une victime choisie'],
    needsInput: [
      { id: 'target', text: 'Qui est la cible, quelle victime a-t-elle menacée ou persécutée, et le prêtre la voit-il (ligne de vue) ?' },
      { id: 'cool-test', text: 'Chaque matin : résultat du Test de Calme Challenging (+0) de la cible.' },
      { id: 'amends', text: 'La cible a-t-elle traité ses victimes avec bonté ou fait amende honorable (fin des rêves) ?' }
    ],
    clauses: [
      { id: 'nightmares', mode: 'manual', text: 'À partir de son prochain sommeil, la cible subit des cauchemars de vengeance (chat noir géant, pies, etc.).' },
      { id: 'morning-cool', mode: 'manual', text: 'Chaque matin, Test de Calme Challenging (+0) ; échec : la cible subit l’État Exténué.' },
      { id: 'amends-end', mode: 'manual', text: 'Les rêves cessent si la cible traite ses victimes avec bonté ou répare ses torts.' },
      { id: 'duration-months', mode: 'manual', text: 'Durée : Bonus de Sociabilité mois ; le MJ termine la prière à l’échéance (aucune échéance automatique).' }
    ],
    sourceDelta: 'Portée « Line of sight » : encodée en special (la grammaire n’a pas de portée « vue »). Durée en mois : l’unité months est absente de la grammaire params (rounds, minutes, hours, days), encodée en special avec libellé ; le moteur ne planifie pas d’échéance. Difficulté « Challenging (+0) » imprimée en pourcentage (4e édition), conservée en anglais, non convertie en DR ; « Fatigued » est traduit Exténué comme dans les autres modules. L’État Exténué en cas d’échec pourrait être posé par un effet condition, mais il dépend d’un Test quotidien hors moteur : clause manuelle.'
  }
];
