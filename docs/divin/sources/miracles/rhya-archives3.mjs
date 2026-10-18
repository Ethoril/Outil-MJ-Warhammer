// Miracles de Rhya — Archives of the Empire 3, page imprimée 74 (la Rhya « étendue » n’ajoute pas de bénédiction). Valeurs vérifiées sur le PDF.
export const cult = 'Rhya';

export const source = {
 bookId: 'AotE3',
 document: 'Archives of the Empire 3.pdf',
 fileSha256: '5c86d70ec9368857456877be59e40752cf6f051e7094a9cc9ec748ada9b1a29f',
 edition: 'V4 EN (crédits p.3 : Warhammer Fantasy Roleplay 4th Edition, © Games Workshop 2023)'
};

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const area = { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' };
const rounds = soc('characteristic-bonus', 'rounds');
const delta = 'Texte V4 : Succès (SL) lus comme DR, difficultés V4 conservées telles quelles, sans conversion V5.';
const slExtension = { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : portée, cibles ou durée augmentées de leur valeur initiale (sauf Instantané et Vous).' };

export const miracles = [
 {
  name: 'Abondance de Rhya', canonicalName: "Rhya's Abundance", printedPage: 74,
  summary: 'Le prêtre chante l’été et la splendeur de Rhya pour faire surgir l’abondance et chasser toute souillure : vivres et ingrédients crus qu’il touche gonflent et se dédoublent, la moisissure, la vermine et les insectes disparaissent, et la nourriture vieille redevient fraîche. Il touche un tonneau, une caisse ou un panier par round.',
  params: { range: { kind: 'touch' }, targets: { kind: 'self' }, duration: { kind: 'fixed', value: 1, unit: 'rounds' } },
  status: 'manual', effect: null,
  targetRules: ['withinTouch'],
  needsInput: [
   { id: 'containers', text: 'Quels tonneaux, caisses ou paniers de vivres sont touchés (un par round) ?' }
  ],
  clauses: [
   { id: 'double', mode: 'manual', text: 'Vivres stockés et ingrédients crus touchés gonflent et se dédoublent : tout ce que le prêtre touche est doublé.' },
   { id: 'purify', mode: 'manual', text: 'Moisissure, vermine, insectes et autres sources de pourriture disparaissent ; la vieille nourriture redevient fraîche.' },
   { id: 'one-per-round', mode: 'manual', text: 'Le prêtre touche un tonneau, une caisse ou un panier de nourriture par round.' },
   slExtension
  ],
  sourceDelta: delta + ' La cible imprimée est « You » avec une portée Toucher : portée touch, cible self.'
 },
 {
  name: 'Exigence de Rhya', canonicalName: "Rhya's Demand", printedPage: 74,
  summary: 'Le prêtre chante des harmonies subtiles qui tirent des profondeurs de la terre le ressentiment de ceux qui n’ont pas remercié Rhya. Tout humanoïde à Bonus de Sociabilité yards qui n’a pas fait de sacrifice à Rhya (ou à une divinité ou un esprit de la nature en bons termes avec son culte, comme Isha ou Taal) depuis le dernier équinoxe de printemps perd 1 Blessure (+1 par DR) et gagne un État Fatigué. Si cinq individus ou plus sont touchés, le sol dans la zone devient stérile pendant d10 ans.',
  params: { range: { kind: 'self' }, targets: area, duration: { kind: 'instant' } },
  status: 'assisted', effect: null,
  effects: [{ type: 'condition', key: 'Fatigued', level: 1 }],
  targetRules: [],
  needsInput: [
   { id: 'humanoids', text: 'Humanoïdes présents dans la zone (Bonus de Sociabilité yards).' },
   { id: 'sacrifice', text: 'Pour chaque humanoïde : a-t-il fait un sacrifice à Rhya ou à une puissance de la nature alliée depuis le dernier équinoxe de printemps ?' },
   { id: 'barren-years', text: 'Si cinq individus ou plus sont touchés : jet de d10 années de stérilité.' }
  ],
  clauses: [
   { id: 'fatigued', mode: 'engine', text: 'Chaque humanoïde touché gagne un État Fatigué.' },
   { id: 'who-is-hit', mode: 'manual', text: 'Seuls les humanoïdes sans sacrifice à Rhya (ou à une puissance de la nature alliée) depuis le dernier équinoxe de printemps sont touchés.' },
   { id: 'wounds', mode: 'manual', text: 'Chaque humanoïde touché perd 1 Blessure, +1 par DR obtenu au Test de Prière.' },
   { id: 'barren', mode: 'manual', text: 'Si cinq individus ou plus sont touchés, rien ne pousse plus dans la zone pendant d10 ans.' }
  ],
  sourceDelta: delta + ' La zone est « Area of Effect » sans taille en en-tête ; le texte donne Bonus de Sociabilité yards pour les victimes, puis « Fellowship Yards » (sans Bonus) pour le sol stérile : lu comme la même zone, à confirmer. La perte de 1 Blessure +1 par DR est une perte fixe : le moteur direct-damage exige des dés et ne convient pas.'
 },
 {
  name: 'Domination de Rhya', canonicalName: "Rhya's Dominion", printedPage: 74,
  summary: 'Le prêtre invoque Rhya pour qu’un esprit de la nature apparaisse et lui obéisse. Il doit se concentrer sur un élément naturel où un esprit peut résider (champ cultivé, mare, roncier). Si le miracle réussit, l’esprit accomplit une tâche au nom de Rhya, de façon trop littérale, sans jamais enfreindre les interdits de Rhya : surveiller, harceler les intrus de son domaine ou retrouver un objet perdu à proximité.',
  params: { range: { kind: 'fixed', value: 4, unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'special' } },
  status: 'manual', effect: null,
  targetRules: ['élément naturel pouvant abriter un esprit'],
  needsInput: [
   { id: 'feature', text: 'Quel élément naturel (champ, mare, roncier…) abrite l’esprit, et est-il à moins de 4 yards ?' },
   { id: 'task', text: 'Quelle tâche est demandée à l’esprit (sans enfreindre les interdits de Rhya) ?' },
   { id: 'sun-limit', text: 'Prochain lever ou coucher du soleil (le premier des deux) : fin de la durée.' }
  ],
  clauses: [
   { id: 'summon', mode: 'manual', text: 'Un esprit de la nature apparaît et accomplit une tâche au nom de Rhya.' },
   { id: 'literal', mode: 'manual', text: 'L’esprit interprète les ordres de façon trop littérale ; aucune demande ne peut enfreindre les interdits de Rhya.' },
   { id: 'sun-duration', mode: 'manual', text: 'Durée : jusqu’au lever ou au coucher du soleil, le premier des deux.' },
   slExtension
  ],
  sourceDelta: delta + ' La durée imprimée (jusqu’au lever ou coucher du soleil) est portée comme special : pas de valeur chiffrée.'
 },
 {
  name: 'Troupeau de Rhya', canonicalName: "Rhya's Flock", printedPage: 74,
  summary: 'Le prêtre murmure les secrets du temps où Rhya parcourait la terre en domptant la nature. Un troupeau, une harde ou une meute d’animaux domestiques se soumet à sa volonté et répond aux anciens ordres que ses ancêtres ont entendus. Il perçoit l’humeur des animaux et voit par leurs yeux, peut les calmer ou les agiter, provoquer une débandade, un sommeil ou une attaque, ou s’en servir comme yeux et oreilles (et odorat, goût et toucher), dans les limites de leur comportement naturel.',
  params: { range: soc('characteristic', 'yards'), targets: { kind: 'special' }, duration: rounds },
  status: 'manual', effect: null,
  targetRules: ['animaux domestiques'],
  needsInput: [
   { id: 'flock', text: 'Quel troupeau, quelle harde ou quelle meute est visé, et est-il à portée (Sociabilité yards) ?' },
   { id: 'command', text: 'Quel ordre le prêtre donne-t-il (calmer, agiter, débandade, sommeil, attaque, observer) ?' }
  ],
  clauses: [
   { id: 'submit', mode: 'manual', text: 'Les animaux domestiques du groupe se soumettent au prêtre pendant la durée.' },
   { id: 'senses', mode: 'manual', text: 'Le prêtre perçoit l’humeur des animaux et voit, entend, sent, goûte et touche par eux.' },
   { id: 'commands', mode: 'manual', text: 'Il peut les calmer ou les agiter, les faire charger en débandade, dormir ou attaquer, dans les limites de leur comportement naturel.' },
   slExtension
  ],
  sourceDelta: delta + ' La cible est « Special » : la taille du groupe n’est pas bornée, laissée au MJ.'
 },
 {
  name: 'Apprivoisement de Rhya', canonicalName: "Rhya's Taming", printedPage: 74,
  summary: 'Le prêtre tend une main douce vers une créature sauvage et fredonne des mélodies apaisantes. Sur un Test de Charme animal Moyen (+20) réussi, un animal sauvage non corrompu de Taille Grande ou moins devient docile envers les Humains, les Elfes qui honorent Isha et alliés semblables, et s’adoucit encore par DR obtenu, sans quitter volontairement son territoire naturel. Dure jusqu’au prochain coucher du soleil.',
  params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'special' } },
  status: 'manual', effect: null,
  targetRules: ['withinTouch', 'animal sauvage non corrompu de Taille Grande ou moins'],
  needsInput: [
   { id: 'animal', text: 'Quel animal est la cible : sauvage, non corrompu et de Taille Grande ou moins ?' },
   { id: 'charm-animal-test', text: 'Résultat du Test de Charme animal Moyen (+20) et DR obtenus.' },
   { id: 'sunset', text: 'Prochain coucher du soleil : fin de la durée.' }
  ],
  clauses: [
   { id: 'domesticate', mode: 'manual', text: 'Sur un Test de Charme animal Moyen (+20) réussi, l’animal devient docile envers les Humains, les Elfes honorant Isha et alliés semblables.' },
   { id: 'dr-tameness', mode: 'manual', text: 'Plus il y a de DR, plus l’animal est apprivoisé et docile ; il ne quitte pas volontairement son territoire naturel.' },
   { id: 'sunset-duration', mode: 'manual', text: 'Durée : jusqu’au prochain coucher du soleil.' },
   slExtension
  ],
  sourceDelta: delta + ' La durée imprimée (jusqu’au prochain coucher du soleil) est portée comme special : pas de valeur chiffrée. « Large Size » lu comme la Taille Grande.'
 },
 {
  name: 'Rage de Rhya', canonicalName: "Rhya's Rage", printedPage: 74,
  summary: 'Dans un chant de résolution calme, le prêtre sent la puissance de Rhya déferler en lui, prêt à défendre ceux qui ont besoin de protection. Ce miracle ne peut être invoqué que pour défendre des enfants, ou un foyer ou une ferme occupés par ses habitants. Le prêtre gagne les Traits Immunité à la Psychologie et Impassible, et +2 DR aux Tests de Mêlée, de Force et d’Endurance.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: rounds },
  status: 'assisted', effect: null,
  effects: [{ type: 'grant-trait', traits: ['Impassible'] }, { type: 'special-state', fearImmune: true }, { type: 'test-modifier', modifiers: { 'Corps à corps': 2, 'Résistance': 2 } }],
  targetRules: [],
  needsInput: [
   { id: 'defending', text: 'Le prêtre défend-il des enfants, ou un foyer ou une ferme occupés par ses habitants ? Sinon le miracle ne peut pas être invoqué.' },
   { id: 'force-test', text: 'Tests de Force (caractéristique) faits pendant la durée (+2 DR chacun).' }
  ],
  clauses: [
   { id: 'impassible', mode: 'engine', text: 'Le prêtre gagne le Trait de créature Impassible (Painless) pendant la durée.' },
   { id: 'psychology', mode: 'engine', text: 'Le prêtre est immunisé à la peur pendant la durée (drapeau fearImmune ; les autres Psychologies restent à la charge du MJ).' },
   { id: 'test-bonus', mode: 'engine', text: '+2 DR aux Tests de Mêlée (Corps à corps) et d’Endurance (Résistance) du prêtre pendant la durée.' },
   { id: 'force-test', mode: 'manual', text: '+2 DR aux Tests de Force du prêtre pendant la durée (le moteur ne porte que les modificateurs de compétences).' },
   { id: 'defend-only', mode: 'manual', text: 'Invocable uniquement pour défendre des enfants, ou un foyer ou une ferme occupés par ses habitants.' }
  ],
  sourceDelta: delta + ' « Immunity to Psychology » est mappée sur fearImmune (peur uniquement) ; Painless sur Impassible, comme pour Shallya.'
 }
];
