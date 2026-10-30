// Miracles de Handrich — Archives of the Empire 3, page imprimée 47. Valeurs vérifiées sur le PDF.
export const cult = 'Handrich';

export const source = {
 bookId: 'AotE3',
 document: 'Archives of the Empire 3.pdf',
 fileSha256: '5c86d70ec9368857456877be59e40752cf6f051e7094a9cc9ec748ada9b1a29f',
 edition: 'V4 EN (crédits p.3 : Warhammer Fantasy Roleplay 4th Edition, © Games Workshop 2023)'
};

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const delta = 'Texte V4 : Succès (SL) lus comme DR, difficultés V4 conservées telles quelles, sans conversion V5.';
// Règle du culte, p.47 : invocable après un Test réussi ; pas de profit = +1 Péché.
const profit = { id: 'profit-sin', mode: 'manual', text: 'Si l’invocation ne rapporte aucun profit au prêtre (jugement du MJ), il gagne +1 Point de Péché.' };
const afterTest = { id: 'after-test', mode: 'manual', text: 'Peut être invoqué après un Test réussi pour en améliorer le résultat.' };
const slExtension = { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : portée, cibles ou durée augmentées de leur valeur initiale (sauf Instantané et Vous).' };

export const miracles = [
 {
  name: 'Un marché est un marché', canonicalName: "A Deal's a Deal", printedPage: 47,
  summary: 'Après un Test de Marchandage réussi, le prêtre remercie Handrich avant de sceller l’accord d’une poignée de main : +2 DR au Test de Marchandage, plus 1 par tranche de +2 DR du Test de Prière. Le partenaire garde une bonne impression du prêtre.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'haggle-result', text: 'Résultat du Test de Marchandage réussi auquel ajouter les DR.' },
   { id: 'pray-dr', text: 'DR du Test de Prière (1 DR de plus au Marchandage par tranche de +2).' }
  ],
  clauses: [
   { id: 'haggle-bonus', mode: 'manual', text: '+2 DR au Test de Marchandage, +1 par tranche de +2 DR obtenue au Test de Prière.' },
   { id: 'impression', mode: 'manual', text: 'La personne avec qui le prêtre marchande garde une bonne impression de lui.' },
   afterTest, profit
  ],
  sourceDelta: delta
 },
 {
  name: 'Portez mes fardeaux', canonicalName: 'Carry My Burdens', printedPage: 47,
  summary: 'Sur un Test de Dressage (Animal Training) réussi, une créature non monstrueuse (au jugement du MJ), même sauvage ou agressive, devient la bête de somme du prêtre jusqu’à la fin du voyage : elle ne porte que la charge, sans attaquer ni obéir à d’autres ordres, puis retrouve son état sauvage. Une seule créature à la fois.',
  params: { range: { kind: 'fixed', value: 1, unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'special' } },
  status: 'manual', effect: null,
  targetRules: ['créature non monstrueuse (jugement du MJ)'],
  needsInput: [
   { id: 'creature', text: 'Quelle créature est la cible, et est-elle non monstrueuse selon le MJ ?' },
   { id: 'training-test', text: 'Résultat du Test de Dressage (Animal Training).' },
   { id: 'journey-end', text: 'Fin du voyage : moment où la créature redevient sauvage.' }
  ],
  clauses: [
   { id: 'pack-animal', mode: 'manual', text: 'Si le Test de Dressage réussit, la créature sert de bête de somme au prêtre, qu’elle fût sauvage ou agressive ; elle n’attaque pas et ne suit aucun autre ordre.' },
   { id: 'reversion', mode: 'manual', text: 'À la fin du voyage, la créature retrouve son état sauvage antérieur.' },
   { id: 'one-creature', mode: 'manual', text: 'Le miracle ne vaut que pour une créature à la fois.' },
   afterTest, profit
  ],
  sourceDelta: delta + ' La durée imprimée (jusqu’à la fin du voyage) est portée comme special : pas de valeur chiffrée.'
 },
 {
  name: 'L’offre et la demande', canonicalName: 'Supply and Demand', printedPage: 47,
  summary: 'Après avoir repéré par un Test de Commérage Difficile (−10) un lieu qui veut acheter ou vendre certaines marchandises, le prêtre fait paraître le stock disponible augmenter ou diminuer pendant 1 heure. Cela ne touche pas ses propres biens. Il peut décaler la Disponibilité d’un objet d’un niveau (Common devient Scarce, Exotic devient Rare, etc.) pour modifier le Ratio de marchandage.',
  params: { range: soc('characteristic', 'yards'), targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 1, unit: 'hours' } },
  status: 'manual', effect: null,
  targetRules: ['lot de marchandises en ligne de vue', 'hors des biens du prêtre'],
  needsInput: [
   { id: 'gossip-test', text: 'Résultat du Test de Commérage Difficile (−10) ayant repéré le lieu acheteur ou vendeur.' },
   { id: 'goods', text: 'Quel lot de marchandises est visé, et est-il en ligne de vue et à portée (Sociabilité mètres) ?' },
   { id: 'direction', text: 'Disponibilité augmentée ou diminuée d’un niveau ?' }
  ],
  clauses: [
   { id: 'availability', mode: 'manual', text: 'La Disponibilité du lot change d’un niveau, ce qui modifie le Ratio de marchandage (règles de marchandage du livre de base).' },
   { id: 'own-goods', mode: 'manual', text: 'Les marchandises du prêtre ne sont pas affectées.' },
   { id: 'prerequisite', mode: 'manual', text: 'Exige d’avoir réussi un Test de Commérage Difficile (−10) pour repérer le lieu qui veut acheter ou vendre.' },
   slExtension, afterTest, profit
  ],
  sourceDelta: delta + ' « Difficult (−10) » est un niveau V4. Le signe de la difficulté est illisible à l’extraction texte (caractère de remplacement) : lu comme −10, valeur standard de Difficile en V4.'
 },
 {
  name: 'Ruissellement', canonicalName: 'Trickle Down', printedPage: 47,
  summary: 'D’une pièce d’or et de la promesse d’une richesse à venir, le prêtre fait goûter la générosité de Handrich à ceux qu’il veut se concilier. Un Test de Charme réussi devant des gens de Statut inférieur gagne +1 DR par DR du Test de Prière.',
  params: { range: soc('characteristic', 'yards'), targets: { kind: 'self' }, duration: soc('characteristic-bonus', 'rounds') },
  status: 'assisted',
  effects: [{ type: 'test-modifier', modifiers: { 'Charme': { fromSuccessLevels: true } }, appliesTo: 'caster' }],
  targetRules: ['Statut inférieur à celui du prêtre'],
  needsInput: [
   { id: 'targets', text: 'Quelles personnes sont visées (Bonus de Sociabilité personnes) et sont-elles de Statut inférieur ?' },
   { id: 'charm-test', text: 'Résultat du Test de Charme tenté pendant la durée.' }
  ],
  clauses: [
   { id: 'charm-bonus', mode: 'engine', text: 'Les Tests de Charme du prêtre gagnent +1 DR par DR du Test de Prière du miracle (valeur figée à l’aperçu).' },
   { id: 'charm-condition', mode: 'manual', text: 'Le bonus ne vaut que pour un Test de Charme réussi devant des personnes de Statut inférieur : le MJ écarte les autres Tests de Charme.' },
   { id: 'beneficiary', mode: 'manual', text: 'Le texte ne dit pas clairement qui reçoit le bonus : lu comme le prêtre seul (les personnes visées sont les témoins) ; doute à confirmer par le MJ.' },
   slExtension, afterTest, profit
  ],
  sourceDelta: delta + ' Cible imprimée « Fellowship Bonus targets » : lue comme les témoins, le bénéficiaire du bonus étant le prêtre seul (lecture non confirmée par le MJ) ; encodée self.'
 },
 {
  name: 'Revirement de fortune', canonicalName: 'Twist of Fortune', printedPage: 47,
  summary: 'Le prêtre peut dépenser 1 point de Chance de la cible comme si c’était le sien. La cible peut s’y opposer par un Test de Sociabilité Intermédiaire (+0) contre les DR du prêtre ; si elle le dépasse de +4 DR, elle peut dépenser un point de Chance du prêtre à son tour. La Chance perdue doit être dépensée avant la fin de la session ; à la session suivante, elle revient à son propriétaire.',
  params: { range: soc('characteristic', 'yards'), targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'target', text: 'Quelle créature est la cible, et a-t-elle un point de Chance ?' },
   { id: 'contest', text: 'Résultat du Test de Sociabilité Intermédiaire (+0) de la cible contre les DR du prêtre.' },
   { id: 'session-end', text: 'La Chance dépensée doit l’être avant la fin de la session ; restitution au début de la suivante.' }
  ],
  clauses: [
   { id: 'borrow-fortune', mode: 'manual', text: 'Le prêtre dépense 1 point de Chance de la cible comme le sien (transfert de Chance depuis la cible, non couvert par le moteur).' },
   { id: 'contest', mode: 'manual', text: 'La cible peut contester par un Test de Sociabilité Intermédiaire (+0) contre les DR du prêtre ; si elle gagne, elle garde son point.' },
   { id: 'backfire', mode: 'manual', text: 'Si la cible dépasse les DR du prêtre de +4 DR, elle peut dépenser un point de Chance du prêtre comme le sien.' },
   { id: 'restore', mode: 'manual', text: 'La Chance perdue doit être dépensée avant la fin de la session ; elle revient à son propriétaire d’origine au début de la session suivante.' },
   afterTest, profit
  ],
  sourceDelta: delta + ' L’effet temporary-fortune du moteur ajoute de la Chance temporaire au prêtre mais ne prélève rien sur la cible : non utilisé.'
 },
 {
  name: 'Tope là', canonicalName: 'Shake On It', printedPage: 47,
  summary: 'Le prêtre demande à Handrich de témoigner d’un accord scellé d’une poignée de main. Pendant la durée au moins, la cible ne peut agir contre l’accord ; pour contester une part, elle réussit un Test de Calme Moyen (+20) contre les DR du prêtre et peut alors refuser une action dictée par l’accord, avec une action contraire de plus par tranche de +2 DR. Le prêtre sait si l’accord est rompu ; s’il rompt lui-même les termes pendant le miracle, il gagne +1 Péché.',
  params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: soc('characteristic-bonus', 'rounds') },
  status: 'manual', effect: null,
  targetRules: ['withinTouch'],
  needsInput: [
   { id: 'target', text: 'Quelle créature est la cible, et est-elle à portée de contact ?' },
   { id: 'deal', text: 'Termes de l’accord scellé.' },
   { id: 'cool-test', text: 'Résultat du Test de Calme Moyen (+20) de la cible si elle conteste, contre les DR du prêtre.' }
  ],
  clauses: [
   { id: 'bound', mode: 'manual', text: 'La cible ne peut agir à l’encontre de l’accord pendant au moins la durée du miracle.' },
   { id: 'contest', mode: 'manual', text: 'Pour contester : Test de Calme Moyen (+20) contre les DR du prêtre ; en cas de réussite elle peut refuser une action dictée par l’accord, et gagne une action contraire par tranche de +2 DR supplémentaire.' },
   { id: 'awareness', mode: 'manual', text: 'Le prêtre sait si la cible rompt l’accord.' },
   { id: 'own-break-sin', mode: 'manual', text: 'Le prêtre gagne +1 Point de Péché s’il rompt les termes de l’accord pendant la durée du miracle.' },
   slExtension, afterTest, profit
  ],
  sourceDelta: delta
 }
];
