// Miracles de Solkan — Archives of the Empire 3, page imprimée 55. Valeurs vérifiées sur le PDF.
export const cult = 'Solkan';

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
// Règle du culte, p.55 : aucun Péché ni Corruption toléré pour invoquer un miracle ou une bénédiction.
const purity = { id: 'no-sin-corruption', mode: 'manual', text: 'Solkan refuse tout miracle ou toute bénédiction à un prêtre qui a un Point de Péché ou de Corruption.' };
const slExtension = { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : portée, cibles ou durée augmentées de leur valeur initiale (sauf Instantané et Vous).' };

export const miracles = [
 {
  name: 'Pureté absolue', canonicalName: 'Absolute Purity', printedPage: 55,
  summary: 'D’un cri à Solkan, une vague de flammes purificatrices balaie Bonus de Sociabilité mètres autour du prêtre. Tout ce qui a un Trait Mort-vivant, Démon ou Lanceur de sorts, tout Point de Péché ou de Corruption, ou un Talent de Magie Arcane, du Chaos ou Mineure, subit 1d10 Blessures sans TB ni PA, y compris le prêtre, ses alliés et les passants.',
  params: { range: { kind: 'self' }, targets: area, duration: { kind: 'instant' } },
  status: 'assisted', effect: null,
  effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, targetFilter: { traits: ['Mort-vivant', 'Démon', 'Lanceur de sorts'], fact: 'impure', label: 'impure : Péché, Corruption ou Talent de Magie Arcane, du Chaos ou Mineure (fait MJ)' } }],
  targetRules: [],
  needsInput: [
   { id: 'damage-roll', text: 'Jet de 1d10 (par cible ou commun).' },
   { id: 'targets-in-area', text: 'Créatures dans la zone, y compris alliés et passants.' },
   { id: 'impure', text: 'Pour chaque créature : Trait Mort-vivant, Démon ou Lanceur de sorts, Péché, Corruption ou Talent de Magie Arcane, du Chaos ou Mineure ?' }
  ],
  clauses: [
   { id: 'damage', mode: 'engine', text: 'Chaque cible affectée subit 1d10 Blessures, sans Bonus d’Endurance ni PA.' },
   { id: 'who-is-hit', mode: 'assisted', text: 'Seules sont touchées les créatures impures (Traits Mort-vivant, Démon ou Lanceur de sorts lus sur la fiche ; sinon Péché ou Corruption, Talent de Magie Arcane, du Chaos ou Mineure, fait saisi par le MJ) ; le prêtre, ses alliés et les passants le sont aussi s’ils répondent à ces critères.' },
   { id: 'area', mode: 'assisted', text: 'Zone centrée sur le prêtre, de rayon égal à son Bonus de Sociabilité en mètres.' },
   purity
  ],
  sourceDelta: delta + ' Le moteur filtre les cibles : Traits Mort-vivant, Démon ou Lanceur de sorts lus sur la fiche, sinon fait MJ « impure » (Péché, Corruption, Talent de Magie Arcane, du Chaos ou Mineure) ; une cible déclarée non impure est ignorée.'
 },
 {
  name: 'Poing de vengeance', canonicalName: 'Fist of Vengeance', printedPage: 55,
  summary: 'Le prêtre appelle Solkan à frapper ceux qui bravent sa volonté : une déflagration écrase la cible et lui inflige 1d10 + Bonus de Volonté de dégâts, qui ignorent les PA.',
  params: { range: soc('characteristic-bonus', 'yards'), targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
  status: 'assisted', effect: null,
  effects: [{ type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM', ignoreAp: true }],
  targetRules: [],
  needsInput: [
   { id: 'target', text: 'Quelle créature est la cible, et est-elle à portée (Bonus de Sociabilité mètres) ?' },
   { id: 'damage-roll', text: 'Jet de 1d10 ; le Bonus de Volonté du prêtre s’y ajoute.' }
  ],
  clauses: [
   { id: 'damage', mode: 'engine', text: 'La cible subit 1d10 + Bonus de Volonté de dégâts, qui ignorent les Points d’Armure (le Bonus d’Endurance reste déduit, minimum 1).' },
   purity
  ],
  sourceDelta: delta + ' Le texte dit « Damage, ignoring AP » : dégâts ordinaires, non Blessures directes ; le Bonus d’Endurance reste donc déduit. Encodé ordinary-damage : 1d10 + Bonus de Volonté, PA ignorés, Bonus d’Endurance déduit, minimum 1 Blessure ; la Haine sacrée ajoute +2 sur les Blessures réellement perdues.'
 },
 {
  name: 'Lame enflammée', canonicalName: 'Flaming Blade', printedPage: 55,
  summary: 'Solkan confère à l’arme du prêtre sa fureur impitoyable. S’il manie une épée, elle s’embrase d’un feu blanc : elle devient Magique avec +6 Dégâts, et quiconque est frappé gagne +1 État Enflammé.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: rounds },
  status: 'assisted', effect: null,
  effects: [{ type: 'weapon-bonus', magical: true, damage: 6, hitConditions: ['Enflammé'], designatedWeapon: true, weaponClass: 'épée' }],
  targetRules: [],
  needsInput: [
   { id: 'weapon', text: 'Arme maniée par le prêtre : est-ce une épée ?' }
  ],
  clauses: [
   { id: 'magical-damage', mode: 'engine', text: 'L’arme devient Magique et gagne +6 Dégâts pendant la durée.' },
   { id: 'ablaze', mode: 'engine', text: 'Toute créature frappée par la lame gagne +1 État Enflammé.' },
   { id: 'sword-only', mode: 'manual', text: 'Le bonus ne vaut que si le prêtre manie une épée (la classe d’arme n’est pas vérifiée par le moteur).' },
   purity
  ],
  sourceDelta: delta
 },
 {
  name: 'Fureur du soleil vertueux', canonicalName: 'Fury of the Righteous Sun', printedPage: 55,
  summary: 'Le prêtre implore Solkan d’une illumination totale : une lumière aveuglante tombe du soleil. Tout ce qui se trouve à Bonus de Sociabilité mètres reçoit autant d’États Aveuglé que son Bonus de Sociabilité. La lumière brûlante agit aussi comme un projectile magique de Dégâts +2 sur tout ce qu’elle touche.',
  params: { range: soc('characteristic-bonus', 'yards'), targets: area, duration: { kind: 'instant' } },
  status: 'assisted', effect: null,
  effects: [{ type: 'condition', key: 'Blinded', level: 1, strengthFrom: { kind: 'characteristic-bonus', characteristic: 'Soc' } }],
  targetRules: [],
  needsInput: [
   { id: 'area-center', text: 'Point central de la zone dans la portée (Bonus de Sociabilité mètres).' },
   { id: 'targets-in-area', text: 'Créatures présentes dans la zone, alliés compris.' },
   { id: 'missile-damage', text: 'Dégâts du projectile magique (Dégâts +2) contre chaque créature touchée.' }
  ],
  clauses: [
   { id: 'blinded', mode: 'engine', text: 'Chaque créature de la zone gagne un nombre d’États Aveuglé égal au Bonus de Sociabilité du prêtre.' },
   { id: 'missile', mode: 'manual', text: 'La lumière agit comme un projectile magique de Dégâts +2 sur tout ce qu’elle touche.' },
   { id: 'area', mode: 'assisted', text: 'Zone de rayon égal au Bonus de Sociabilité en mètres ; centre à portée Bonus de Sociabilité mètres.' },
   purity
  ],
  sourceDelta: delta + ' « Magic missile with Damage of +2 » : mécanique de projectile magique V4 non convertie (dés, PA, TB non précisés), laissée au MJ. Le livre ne précise pas si la zone est centrée sur le prêtre ou sur un point visé à portée : lue comme un point à portée.'
 },
 {
  name: 'Lumière de stase', canonicalName: 'Light of Stasis', printedPage: 55,
  summary: 'Le prêtre demande aux Dieux de la Loi un répit face au changement. La scène baigne dans une lumière pâle et toutes les cibles sont figées dans une stase temporaire : elles ne peuvent ni agir ni bouger, et tout ce que le temps affecte (objets en chute, projectiles, blessures, États…) est suspendu jusqu’à la fin de la durée.',
  params: { range: { kind: 'fixed', value: 4, unit: 'yards' }, targets: { kind: 'count', value: 3 }, duration: rounds },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'targets', text: 'Quelles 3 cibles sont visées, et sont-elles à moins de 4 m ?' },
   { id: 'time-effects', text: 'Effets du temps en cours à suspendre (saignements, États, projectiles en vol).' }
  ],
  clauses: [
   { id: 'stasis', mode: 'manual', text: 'Les cibles ne peuvent ni agir ni bouger pendant la durée.' },
   { id: 'time-paused', mode: 'manual', text: 'Tout ce qu’affecte le passage du temps (chutes, projectiles, blessures, États…) est suspendu jusqu’à la fin de la durée.' },
   slExtension, purity
  ],
  sourceDelta: delta + ' Le texte ne dit pas si des objets inertes peuvent être comptés parmi les 3 cibles : laissé au MJ.'
 },
 {
  name: 'Apaisez les vents', canonicalName: 'Still the Winds', printedPage: 55,
  summary: 'Le prêtre supplie les Dieux de la Loi de calmer les Vents de Magie. Pendant la durée, dans la zone de Bonus de Sociabilité mètres : toute magie est dissipée, les objets magiques perdent temporairement leurs qualités magiques, et les Tests d’Incantation et de Canalisation échouent automatiquement. La Seconde Vue montre des Vents inertes dans la zone.',
  params: { range: soc('characteristic-bonus', 'yards'), targets: area, duration: rounds },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'area-center', text: 'Point central de la zone dans la portée (Bonus de Sociabilité mètres).' },
   { id: 'magic-in-area', text: 'Sorts, objets magiques et lanceurs présents dans la zone.' }
  ],
  clauses: [
   { id: 'dispel', mode: 'manual', text: 'Toute magie est dissipée dans la zone ; les objets magiques perdent temporairement leurs qualités magiques pendant la durée.' },
   { id: 'auto-fail', mode: 'manual', text: 'Les Tests d’Incantation et de Canalisation échouent automatiquement dans la zone pendant la durée.' },
   { id: 'second-sight', mode: 'manual', text: 'La Seconde Vue révèle que les Vents sont inertes dans la zone.' },
   slExtension, purity
  ],
  sourceDelta: delta + ' « Channelling and Casting Tests » rendus par Canalisation et Incantation (vocabulaire V4) ; l’équivalent V5 n’est pas converti.'
 }
];
