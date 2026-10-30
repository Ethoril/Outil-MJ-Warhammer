// Miracles de Rhya, Livre de base V5 EN v2, p.225-226 imprimées. Valeurs vérifiées sur le PDF.
export const cult = 'Rhya';

const touch = { kind: 'touch' };
const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const outdoors = { id: 'outdoors-only', mode: 'manual', text: 'Invocable uniquement en extérieur, hors des agglomérations.' };
const outdoorsNeed = { id: 'outdoors', text: 'Le lieu est-il en extérieur, hors agglomération ?' };

export const miracles = [
  {
    name: 'Enfants de Rhya', canonicalName: "Rhya's Children", printedPage: 225,
    summary: 'Les mains posées sur le sol, vous percevez la présence et le passage de toutes les créatures vivantes dans la zone, tant que le miracle dure. Uniquement en extérieur, hors agglomération.',
    params: { range: { kind: 'self' }, targets: { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' }, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [outdoorsNeed, { id: 'living-creatures', text: 'Créatures vivantes présentes dans la zone et leurs déplacements (information MJ).' }],
    clauses: [
      outdoors,
      { id: 'area', mode: 'assisted', text: 'Zone centrée sur vous, de rayon égal au Bonus de Sociabilité en mètres.' },
      { id: 'sense-living', mode: 'manual', text: 'Le prêtre sent la présence et le passage de toutes les créatures vivantes dans la zone pendant la durée.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ]
  },
  {
    name: 'Récolte de Rhya', canonicalName: "Rhya's Harvest", printedPage: 225,
    summary: 'Des fruits, légumes et champignons comestibles poussent à l’endroit touché; chaque round, la quantité suffit à nourrir une personne. La nature des aliments dépend du lieu.',
    params: { range: touch, targets: { kind: 'special' }, duration: { kind: 'fixed', value: 1, unit: 'rounds' } },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'location', text: 'Lieu touché et type de végétation (détermine les aliments).' }],
    clauses: [
      { id: 'food-per-round', mode: 'manual', text: 'Chaque round de durée, assez de nourriture pousse pour 1 personne; la durée peut croître par DR (miracle-scaling).' },
      { id: 'food-type', mode: 'manual', text: 'Le type de nourriture dépend du lieu (prairie : céréales, bois : fruits et champignons divers).' }
    ]
  },
  {
    name: 'Abri de Rhya', canonicalName: "Rhya's Shelter", printedPage: 225,
    summary: 'Vous découvrez un abri naturel parfait pour camper une nuit, protégé de tout vent et pluie naturels, tant que vous y campez. Il accueille une personne, +1 par tranche de +2 DR. Une fois le camp levé, il est introuvable. Uniquement en extérieur, hors agglomération.',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'special' } },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [outdoorsNeed, { id: 'occupants', text: 'Nombre d’occupants de l’abri (1 + 1 par +2 DR).' }, { id: 'camp-end', text: 'Moment où le camp est levé (fin de l’abri).' }],
    clauses: [
      outdoors,
      { id: 'capacity', mode: 'assisted', text: 'Capacité : 1 personne, +1 par tranche de +2 DR.' },
      { id: 'protection', mode: 'manual', text: 'L’abri est protégé de tout vent et de toute pluie d’origine naturelle.' },
      { id: 'duration', mode: 'manual', text: 'Dure tant que le prêtre reste campé sur place.' },
      { id: 'not-rediscoverable', mode: 'manual', text: 'Après le départ, l’abri ne peut plus être retrouvé.' }
    ]
  },
  {
    name: 'Secours de Rhya', canonicalName: "Rhya's Succour", printedPage: 225,
    summary: 'Chaque cible retire 1 État. Si cela supprime tous les États qu’elle subissait, elle se sent reposée comme après une bonne nuit et gagne +1 DR à ses Tests lors de son prochain Tour.',
    params: { range: soc('characteristic', 'yards'), targets: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'targets' }, duration: { kind: 'instant' } },
    status: 'assisted',
    effects: [{ type: 'remove-condition', chosen: true, amount: 1, onAllRemoved: { testModifiers: { all: 1 } } }],
    targetRules: [],
    needsInput: [{ id: 'condition-choice', text: 'État retiré par chaque cible (choix; aucun critère donné par la source).' }, { id: 'all-removed', text: 'Le retrait supprime-t-il tous les États de la cible ?' }],
    clauses: [
      { id: 'remove-condition', mode: 'engine', text: 'Chaque cible retire 1 État (choisi par le MJ ; un État verrouillé ou à cause persistante n’est pas retirable).' },
      { id: 'rested', mode: 'manual', text: 'Si tous ses États sont retirés, la cible est reposée comme après un bon sommeil.' },
      { id: 'next-turn-bonus', mode: 'engine', text: 'Dans ce cas, +1 DR à tous ses Tests lors de son prochain Tour (en combat ; hors combat, à appliquer à la main).' }
    ]
  },
  {
    name: 'Caresse de Rhya', canonicalName: "Rhya's Touch", printedPage: 225,
    summary: 'Mains posées sur une cible blessée ou malade, vous choisissez : soigner un nombre de Blessures égal au Bonus de Sociabilité, ou guérir 1 maladie naturelle. Par tranche de +2 DR, un effet supplémentaire, identique ou non. L’effet demande au moins 10 minutes; une interruption impose de retenter.',
    params: { range: touch, targets: { kind: 'count', value: 1 }, duration: { kind: 'special' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'wound-heal', value: { formula: 'BSoc' }, duration: { unit: 'instant' } }],
    extensions: [{ everySuccessLevels: 2, choices: [{ range: { addBaseValue: true } }, { targets: { addBaseValue: true } }, { duration: { addBaseValue: true } }], effect: { type: 'wound-heal' }, sourceRef: 'miracle-scaling', repeatable: true, restrictions: { youAndYouCannotIncreaseRangeOrTargets: true, instantDurationCannotIncrease: true } }],
    targetRules: [],
    needsInput: [{ id: 'effect-choice', text: 'Effet choisi pour chaque tranche (soin de Blessures ou maladie naturelle guérie).' }, { id: 'disease', text: 'Maladie visée et caractère naturel (fait MJ).' }, { id: 'uninterrupted', text: 'Les 10 minutes ont-elles été menées sans interruption ?' }],
    clauses: [
      { id: 'heal-wounds', mode: 'engine', text: 'Option : soigner Bonus de Sociabilité Blessures (formule BSoc lue sur le prêtre).' },
      { id: 'cure-disease', mode: 'manual', text: 'Option : guérir 1 maladie naturelle.' },
      { id: 'extra-effects', mode: 'assisted', text: 'Par +2 DR, un effet supplémentaire au choix, le même effet pouvant être répété : chaque extension de soin (choix « effet ») est appliquée ; si un effet est consacré à une maladie, indiquer le nombre de soins retenus (healCount).' },
      { id: 'slow', mode: 'manual', text: 'Effets manifestés après au moins 10 minutes; si interrompu, le miracle doit être retenté.' }
    ],
    sourceDelta: 'Soin exprimé en Bonus de Sociabilité : formule BSoc résolue sur la fiche du prêtre à l’aperçu.'
  },
  {
    name: 'Union de Rhya', canonicalName: "Rhya's Union", printedPage: 226,
    summary: 'Vous bénissez et consacrez l’union de deux âmes : pendant la durée, si c’est biologiquement possible, le couple conçoit un enfant.',
    params: { range: touch, targets: { kind: 'special' }, duration: soc('characteristic-bonus', 'hours') },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'couple', text: 'Les deux personnes concernées.' }, { id: 'biological', text: 'La conception est-elle biologiquement possible ? (fait MJ)' }],
    clauses: [
      { id: 'conception', mode: 'manual', text: 'Pendant la durée, si biologiquement possible, le couple conçoit un enfant.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en heures.' }
    ],
    sourceDelta: 'La cible est « Special » : le livre ne précise pas qu’elle désigne deux personnes autrement que par « deux âmes » dans l’effet.'
  }
];
