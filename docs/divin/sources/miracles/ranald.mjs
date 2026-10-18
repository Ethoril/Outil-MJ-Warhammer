// Miracles de Ranald — Livre de base V5 EN v2, pages imprimées 224-225.
export const cult = 'Ranald';

export const miracles = [
 {
  name: 'Invitation', canonicalName: 'An Invitation', printedPage: 224,
  summary: 'Une énigme de Ranald défait un moyen de fermeture d’une porte, fenêtre ou trappe ciblée : une serrure s’ouvre, un loquet se lève, une corde se dénoue. +1 moyen de fermeture par +2 DR.',
  params: { range: { kind: 'fixed', value: 1, unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: ['porte, fenêtre ou trappe'],
  needsInput: [
   { id: 'opening', text: 'Quelle porte, fenêtre ou trappe est ciblée ?' },
   { id: 'fastenings', text: 'Quels moyens de fermeture sont présents et lesquels sont défaits (1 + 1 par +2 DR) ?' }
  ],
  clauses: [
   { id: 'undo-fastening', mode: 'manual', text: 'Un moyen de fermeture de l’ouverture ciblée est défait.' },
   { id: 'sl-fastening', mode: 'assisted', text: 'Par tranche de +2 DR : un moyen de fermeture supplémentaire est défait sur la même ouverture.' }
  ]
 },
 {
  name: 'Yeux de chat', canonicalName: "Cat's Eyes", printedPage: 224,
  summary: 'Ranald envoie un Serviteur divin en forme de chat, aux capacités d’un chat normal et invulnérable. Pendant la durée, le prêtre perçoit tout ce que perçoit le chat et dirige ses mouvements ; ses sens sont ceux du chat, il perd l’usage de ses propres Talents sensoriels (Vision nocturne, etc.) et ne perçoit rien par ses propres sens, ce qui le laisse vulnérable.',
  params: { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'self' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'manual', effect: null,
  targetRules: ['prêtre uniquement'],
  needsInput: [
   { id: 'cat-position', text: 'Où apparaît le chat et jusqu’où le prêtre peut-il le diriger (portée Sociabilité yards) ?' },
   { id: 'perception', text: 'Ce que le chat perçoit, communiqué au joueur par le MJ.' },
   { id: 'priest-vulnerable', text: 'Le prêtre ne perçoit rien par ses propres sens pendant la durée.' }
  ],
  clauses: [
   { id: 'cat-servant', mode: 'manual', text: 'Un chat Serviteur divin apparaît ; il a les capacités d’un chat normal et ne peut subir aucun dommage.' },
   { id: 'control-and-senses', mode: 'manual', text: 'Le prêtre dirige le chat et perçoit tout ce qu’il perçoit.' },
   { id: 'no-own-senses', mode: 'manual', text: 'Le prêtre n’a pas accès à ses propres Talents sensoriels (Vision nocturne, etc.) et ne perçoit rien par ses propres sens pendant la durée.' }
  ],
  sourceDelta: 'Aucun profil chiffré du chat dans le livre (contrairement à l’aigle de Myrmidia). miracles.json ajoute « vulnérable » en clause : cela renvoie au prêtre, non au chat (le chat est invulnérable).'
 },
 {
  name: 'Que la chance persiste', canonicalName: 'Cheat the Odds', printedPage: 224,
  summary: 'Le prêtre gagne +1 point de Fortune, conservé jusqu’à la fin de la session ; +1 point par +2 DR. Il ne peut pas réinvoquer ce miracle tant qu’il n’est pas retombé à 0 point de Fortune.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'special', label: 'Until session end' } },
  status: 'manual', effect: null,
  targetRules: ['prêtre uniquement'],
  needsInput: [
   { id: 'fortune-zero', text: 'Le prêtre est-il à 0 point de Fortune (réinvocation) ?' },
   { id: 'success-levels', text: 'Nombre de DR obtenus (points de Fortune gagnés : 1 + 1 par +2 DR).' }
  ],
  clauses: [
   { id: 'fortune-gain', mode: 'manual', text: 'Le prêtre gagne +1 point de Fortune, qui dure jusqu’à la fin de la session.' },
   { id: 'sl-fortune', mode: 'assisted', text: 'Par tranche de +2 DR : +1 point de Fortune supplémentaire.' },
   { id: 'reinvoke-lock', mode: 'manual', text: 'Interdit de réinvoquer ce miracle avant d’atteindre 0 point de Fortune.' }
  ],
  sourceDelta: 'Le livre ne dit pas si les points gagnés dépassent le maximum de Fortune du personnage, ni s’ils se perdent à la fin de la session s’ils n’ont pas été dépensés (lecture : ils persistent jusqu’à la fin de la session).'
 },
 {
  name: 'Grâce de Ranald', canonicalName: "Ranald's Grace", printedPage: 225,
  summary: 'La cible gagne +10 en Agilité, +10 en Discrétion (Stealth) et le Talent Chute féline (Catfall) +1 pendant la durée.',
  params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'assisted',
  effect: null,
  effects: [
   { type: 'characteristic-modifier', characteristic: 'Ag', value: 10 },
   { type: 'grant-talent', talents: [{ id: 'talent-catfall', name: 'Chute féline', rank: 1 }] }
  ],
  targetRules: [],
  needsInput: [
   { id: 'target', text: 'Quelle créature est touchée ?' },
   { id: 'catfall-stack', text: 'La cible possède-t-elle déjà Chute féline (cumul des niveaux) ?' }
  ],
  clauses: [
   { id: 'agility', mode: 'assisted', text: '+10 en Agilité pendant la durée (modificateur de caractéristique, appliquable par le moteur).' },
   { id: 'stealth', mode: 'manual', text: '+10 en Discrétion (compétence) pendant la durée, en plus du +10 d’Agilité.' },
   { id: 'catfall', mode: 'engine', text: 'La cible gagne +1 niveau du Talent Chute féline (Catfall) pendant la durée.' }
  ],
  sourceDelta: 'Le +10 en Discrétion est distinct du +10 en Agilité (compétence vs caractéristique) ; le moteur n’a pas de modificateur de compétence ni d’octroi temporaire de Talent, donc miracle manuel malgré la partie Agilité automatisable.'
 },
 {
  name: 'Riche, pauvre, mendiant, voleur', canonicalName: "Trickster's Glamour", printedPage: 225,
  summary: 'Pour chaque cible affectée, le prêtre choisit une illusion parmi cinq : bourse qui paraît vide, bourse qui paraît pleine, tenue qui paraît modeste, tenue qui paraît riche, ou un unique objet de valeur devenu imperceptible. +1 effet supplémentaire par +2 DR, sur l’une de ses cibles.',
  params: { range: { kind: 'fixed', value: 1, unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'minutes' } },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'targets', text: 'Quelles cibles sont affectées (1 + extension par +2 DR) ?' },
   { id: 'choices', text: 'Quelle illusion est choisie pour chaque cible (bourse vide, bourse pleine, tenue modeste, tenue riche, objet imperceptible) ?' },
   { id: 'item', text: 'Si « objet imperceptible » : quel objet de valeur est caché ?' }
  ],
  clauses: [
   { id: 'purse-empty', mode: 'manual', text: 'Option : la bourse de la cible paraît vide.' },
   { id: 'purse-full', mode: 'manual', text: 'Option : la bourse de la cible paraît pleine.' },
   { id: 'attire-cheap', mode: 'manual', text: 'Option : la tenue de la cible paraît modeste et banale.' },
   { id: 'attire-rich', mode: 'manual', text: 'Option : la tenue de la cible paraît riche et finement travaillée.' },
   { id: 'item-hidden', mode: 'manual', text: 'Option : un unique objet de valeur est impossible à percevoir.' },
   { id: 'sl-extra-effect', mode: 'assisted', text: 'Par tranche de +2 DR : un effet supplémentaire sur l’une des cibles du prêtre.' }
  ],
  sourceDelta: 'La cible est imprimée « 1 » mais le texte parle de « chaque cible affectée » : le nombre de cibles repose sur l’extension générique par +2 DR (cibles) ; le +2 DR propre au miracle ajoute un effet sur l’une des cibles.'
 },
 {
  name: 'Vous ne m’avez pas vu, n’est-ce pas ?', canonicalName: 'You Saw Nothing', printedPage: 225,
  summary: 'La cible passe inaperçue, sans qu’on la remarque, tant qu’elle ne fait rien pour attirer l’attention (toucher, attaquer, appeler quelqu’un, lancer un sort, faire du bruit). Le prêtre ne peut invoquer le miracle que si personne ne le regarde directement.',
  params: { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'manual', effect: null,
  targetRules: ['personne ne regarde directement le prêtre au lancement'],
  needsInput: [
   { id: 'unobserved', text: 'Personne ne regarde-t-il directement le prêtre à l’invocation ?' },
   { id: 'attention', text: 'La cible a-t-elle fait quelque chose qui attire l’attention (fin de l’effet) ?' }
  ],
  clauses: [
   { id: 'unnoticed', mode: 'manual', text: 'La cible peut passer inaperçue pendant la durée.' },
   { id: 'broken-by-action', mode: 'manual', text: 'Le miracle cesse d’agir si la cible attire l’attention (toucher, attaquer, appeler quelqu’un, lancer un sort, bruit fort).' },
   { id: 'cast-condition', mode: 'manual', text: 'Invocable seulement si personne ne regarde directement le prêtre.' }
  ],
  sourceDelta: 'La liste des actions qui attirent l’attention est donnée « par exemple » dans le livre : elle n’est pas exhaustive, le MJ tranche pour les autres actions.'
 }
];
