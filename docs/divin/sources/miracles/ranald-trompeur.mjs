// Miracles de Ranald, aspect Trompeur — Deft Steps, Light Fingers p.24 (imprimée = physique). Transcription vérifiée au PDF ; texte reformulé.
// Miracles du livre de base réutilisés par le Trickster-Priest, non retranscrits : Cat's Eyes, Ranald's Grace, Rich Man Poor Man Beggar Man Thief, Stay Lucky, You Ain't Seen Me Right.
export const cult = 'Ranald';
export const aspect = 'Deceiver';
export const source = { bookId: 'DeftSteps', document: 'Deft Steps Light Fingers.pdf', fileSha256: 'aea5d0c2d5b998386cc4b4563fa60bc85c355327b29270f4e6cd58ed1325f89d', edition: 'WFRP 4e édition, Cubicle 7, mise à jour du 23 janvier 2025' };

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Le pigeon idéal', canonicalName: 'A Suitable Sucker', printedPage: 24,
    summary: 'Quand il repère une victime, le prêtre prie Ranald de lui désigner le gogo parfait. Pendant la durée, il peut relancer tout résultat sur la table Contenu de la bourse (p.28) et sur la table Travers de la victime (p.29) ; s’il relance, le second résultat s’applique.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'purse-table', text: 'Résultat de la table Contenu de la bourse (p.28) : relancé ou conservé ?' },
      { id: 'quirk-table', text: 'Résultat de la table Travers de la victime (p.29) : relancé ou conservé ?' }
    ],
    clauses: [
      { id: 'reroll-purse', mode: 'manual', text: 'Le prêtre peut relancer tout résultat de la table Contenu de la bourse (p.28).' },
      { id: 'reroll-quirk', mode: 'manual', text: 'Le prêtre peut relancer tout résultat de la table Travers de la victime (p.29).' },
      { id: 'second-stands', mode: 'manual', text: 'En cas de relance, le second résultat s’applique.' }
    ],
    sourceDelta: 'Même miracle que « A Suitable Stooge », nom imprimé dans la section Ranald le Donneur (Dealer, p.24). Les tables des p.28-29 sont celles du chapitre Voleur de ce supplément, non transcrites ici . Le livre ne dit pas si une même table peut être relancée plusieurs fois : lecture MJ, une seule relance par résultat (le second résultat s’applique).'
  },
  {
    name: 'Embobiner', canonicalName: 'Bamboozle', printedPage: 24,
    summary: 'Le prêtre pose une énigme sur le libre arbitre dans un monde régi par les dieux : il abuse une créature de taille Moyenne ou plus petite, qui obéit sauf si elle réussit un Test de Calme Hard (-20). Le prêtre décide de ce qu’elle fait au Round suivant, tant qu’elle ne se nuit pas directement (indirectement est une autre affaire). Les créatures de Trait Démoniaque ou Mort-vivant ne peuvent pas être embobinées.',
    params: { range: { kind: 'fixed', value: 24, unit: 'yards' }, targets: one, duration: { kind: 'fixed', value: 1, unit: 'rounds' } },
    status: 'manual', effect: null,
    targetRules: ['taille Moyenne ou inférieure', 'ni Démoniaque ni Mort-vivant'],
    needsInput: [
      { id: 'target', text: 'Quelle créature est ciblée : de taille Moyenne ou moins, ni Démoniaque ni Mort-vivant ?' },
      { id: 'cool-test', text: 'La cible réussit-elle son Test de Calme Hard (-20) ?' },
      { id: 'order', text: 'Quel ordre le prêtre donne-t-il pour le Round suivant (sans nuire directement à la cible) ?' }
    ],
    clauses: [
      { id: 'cool-resist', mode: 'manual', text: 'La cible obéit sauf si elle réussit un Test de Calme Hard (-20).' },
      { id: 'next-round', mode: 'manual', text: 'Le prêtre détermine l’action de la cible au Round suivant, sans qu’elle se nuise directement.' },
      { id: 'immune-types', mode: 'manual', text: 'Les créatures Démoniaques ou Mort-vivantes sont immunisées.' }
    ],
    sourceDelta: 'Difficulté imprimée en pourcentage de la 4e édition (Hard -20), non convertie en DR ; le palier est conservé en anglais. Durée imprimée « 1 Round (maximum) » : encodée 1 Round fixe, le « maximum » étant laissé au MJ.'
  },
  {
    name: 'Un mensonge presque divin', canonicalName: 'One Almighty Lie', printedPage: 24,
    summary: 'Le prêtre respire à fond, croise les doigts et énonce le mensonge le plus énorme qu’il puisse imaginer : personne n’inventerait un tel culot. Il joue le mensonge, puis fait le Test de Prière. S’il réussit, il lance 1d10 et ajoute ses DR : le total est le nombre de DR ajoutés à son Test de Charme. Le MJ peut accorder des DR de plus si le mensonge est particulièrement divertissant (mais pas plausible).',
    params: { range: self, targets: self, duration: { kind: 'instant' } },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'lie', text: 'Quel mensonge est joué (à jouer avant le Test de Prière) ?' },
      { id: 'success-levels', text: 'DR du Test de Prière réussi (à ajouter au jet de 1d10).' },
      { id: 'd10', text: 'Résultat du jet de 1d10 ajouté aux DR.' },
      { id: 'gm-bonus', text: 'DR supplémentaires accordés par le MJ si le mensonge est divertissant.' }
    ],
    clauses: [
      { id: 'charm-bonus', mode: 'manual', text: 'Bonus au Test de Charme : 1d10 + DR du Test de Prière.' },
      { id: 'gm-reward', mode: 'manual', text: 'Le MJ peut ajouter des DR si le mensonge est particulièrement divertissant.' }
    ],
    sourceDelta: 'Le livre dit « the +SL to add to your Charm Test » : le Test de Charme visé n’est pas précisé davantage (celui qui suit le Test de Prière, lu comme le prochain Test de Charme du prêtre).'
  },
  {
    name: 'Malice de Ranald', canonicalName: "Ranald's Mischief", printedPage: 24,
    summary: 'Le prêtre singe et moque un adversaire pour rééquilibrer un affrontement : deux de ses Caractéristiques sont temporairement égalées à celles de l’adversaire, pour un Test opposé avec lui. Deux jets de 1d10 désignent les Caractéristiques touchées (relancer les doublons) : 1-2 CC, 3-4 I, 5-6 Int, 7-8 Soc, 9-0 au choix.',
    params: { range: { kind: 'fixed', value: 12, unit: 'yards' }, targets: one, duration: soc('characteristic-bonus', 'rounds') },
    status: 'assisted', effect: null,
    effects: [{ type: 'characteristic-match', count: 2, appliesTo: 'caster' }],
    targetRules: [],
    needsInput: [
      { id: 'opposed-test', text: 'Dans quel Test opposé avec l’adversaire désigné l’égalisation est-elle rappelée ?' }
    ],
    clauses: [
      { id: 'two-characteristics', mode: 'engine', text: 'Deux Caractéristiques du prêtre sont égalées à celles de l’adversaire désigné (valeurs figées au lancement, couche retirée à la fin de la prière).' },
      { id: 'table-roll', mode: 'manual', text: 'Table 1d10 : 1-2 CC, 3-4 I, 5-6 Int, 7-8 Soc, 9-0 une Caractéristique au choix ; relancer les doublons. Le MJ saisit les deux Caractéristiques tirées.' }
    ],
    sourceDelta: 'La table imprimée utilise WS, I, Int, Fel (4e édition) : traduits CC, I, Int, Soc pour la V5. Le livre dit « pour un Test opposé avec cet adversaire » sans préciser si l’égalisation vaut pour tous les Tests opposés pendant la durée : lecture MJ, tous les Tests opposés avec lui pendant la durée. Automatisée par l’effet characteristic-match : valeurs figées au lancement ; « pour un Test opposé avec lui » reste un rappel MJ.'
  },
  {
    name: 'Visage oublié', canonicalName: 'Unremembered Face', printedPage: 24,
    summary: 'Le prêtre prie Ranald d’embrumer la mémoire de ceux qu’il croise : toute créature qu’il rencontre doit réussir un Test de Calme Hard (-20) pour retenir plus de deux faits sur son apparence. Le prêtre choisit ce dont ils se souviennent ; beaucoup portent un vêtement distinctif facile à retirer ou à cacher.',
    params: { range: self, targets: self, duration: soc('characteristic-bonus', 'hours') },
    status: 'manual', effect: null,
    targetRules: ['prêtre uniquement'],
    needsInput: [
      { id: 'witnesses', text: 'Quelles créatures croisent le prêtre et font le Test de Calme Hard (-20) ?' },
      { id: 'remembered', text: 'Quels (au plus deux) faits sur son apparence le prêtre laisse-t-il retenir ?' }
    ],
    clauses: [
      { id: 'cool-test', mode: 'manual', text: 'Chaque créature rencontrée doit réussir un Test de Calme Hard (-20) pour retenir plus de deux faits sur l’apparence du prêtre.' },
      { id: 'priest-chooses', mode: 'manual', text: 'Le prêtre choisit ce que les créatures retiennent.' }
    ],
    sourceDelta: 'Difficulté Hard (-20) imprimée en pourcentage (4e édition), non convertie en DR. Le livre ne dit pas si le Test se refait pour une créature déjà rencontrée ni si la relance après échec est possible : lecture MJ, un seul Test par créature et par invocation.'
  }
];
