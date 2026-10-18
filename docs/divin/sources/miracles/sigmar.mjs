// Miracles de Sigmar, Livre de base V5 EN v2, p.226-227 imprimées. Valeurs vérifiées sur le PDF.
export const cult = 'Sigmar';

const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const area = { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' };
const rounds = soc('characteristic-bonus', 'rounds');
const foes = 'orques, gobelins, morts-vivants et serviteurs des Puissances de la Ruine';

export const miracles = [
  {
    name: 'Flambeau de Vertu', canonicalName: 'Beacon of Righteous Virtue', printedPage: 226,
    summary: 'Tous les alliés qui vous voient retirent aussitôt tous leurs États Brisé et gagnent le talent Intrépide (Tout) tant que le miracle dure et que vous restez dans leur ligne de vue. Vous causez la Peur aux orques et aux gobelins.',
    params: { range: { kind: 'self' }, targets: { kind: 'special' }, duration: rounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'remove-condition', key: 'Broken', amount: 'all', duration: { unit: 'instant' } }, { type: 'special-state', fearImmune: true }, { type: 'grant-trait', traits: ['Peur (1)'], casterOnly: true }],
    targetRules: ['ally', 'seesPriest'],
    needsInput: [{ id: 'allies-in-sight', text: 'Alliés qui vous voient, et suivi de la ligne de vue pendant la durée.' }, { id: 'broken-conditions', text: 'États Brisé à retirer chez chaque allié.' }, { id: 'greenskins', text: 'Orques et gobelins affectés par la Peur.' }],
    clauses: [
      { id: 'remove-broken', mode: 'engine', text: 'Les alliés qui vous voient retirent immédiatement tous leurs États Brisé.' },
      { id: 'fearless', mode: 'assisted', text: 'Ils gagnent le talent Fearless (Everything) tant que le miracle dure et que le prêtre reste dans leur ligne de vue.' },
      { id: 'fear-greenskins', mode: 'assisted', text: 'Le prêtre cause la Peur chez les orques et les gobelins.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ],
    sourceDelta: 'Le livre ne précise pas si le prêtre est compté parmi les alliés, ni la portée de la ligne de vue; portée et cible imprimées : Vous / Vous.'
  },
  {
    name: 'N’écoutez point la Sorcière', canonicalName: 'Heed Not the Witch', printedPage: 226,
    summary: 'Tout sort visant quiconque ou n’importe quel endroit de la zone subit -2 DR à son Test d’Incantation, en plus des autres pénalités.',
    params: { range: { kind: 'self' }, targets: area, duration: rounds },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'spell-target', text: 'Le sort lancé vise-t-il quelqu’un ou un lieu dans la zone ?' }, { id: 'casting-test', text: 'Test d’Incantation concerné (à pénaliser de -2 DR).' }],
    clauses: [
      { id: 'casting-penalty', mode: 'manual', text: 'Les Tests d’Incantation de sorts visant une personne ou un lieu de la zone subissent -2 DR, cumulé avec les autres pénalités.' },
      { id: 'area', mode: 'assisted', text: 'Zone centrée sur vous, de rayon égal au Bonus de Sociabilité en yards.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ],
    sourceDelta: 'Le livre ne précise pas si un sort lancé depuis l’intérieur de la zone vers l’extérieur est pénalisé.'
  },
  {
    name: 'Marteau ardent de Sigmar', canonicalName: "Sigmar's Fiery Hammer", printedPage: 227,
    summary: 'Si vous maniez un marteau de guerre, il compte comme Magique, inflige +Bonus de Sociabilité Dégâts, et toute cible frappée reçoit +1 État Enflammé.',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: rounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'weapon-bonus', magical: true, damageFrom: 'Soc', hitConditions: ['Enflammé'], designatedWeapon: true, weaponClass: 'marteau de guerre' }],
    targetRules: [],
    needsInput: [{ id: 'warhammer', text: 'Le prêtre manie-t-il un marteau de guerre ?' }, { id: 'hits', text: 'Cibles frappées par le marteau pendant la durée (pour l’État Enflammé).' }],
    clauses: [
      { id: 'weapon-restriction', mode: 'manual', text: 'Seul un marteau de guerre manié par le prêtre est concerné.' },
      { id: 'magical', mode: 'engine', text: 'L’arme compte comme Magique.' },
      { id: 'damage-bonus', mode: 'engine', text: 'L’arme inflige +Bonus de Sociabilité Dégâts.' },
      { id: 'ablaze-on-hit', mode: 'engine', text: 'Toute cible frappée reçoit +1 État Enflammé (Ablaze).' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ]
  },
  {
    name: 'Feu de l’âme', canonicalName: 'Soulfire', printedPage: 227,
    summary: 'Un feu sacré jaillit de votre corps : toutes les cibles de la zone subissent 1d10 Blessures sans TB ni PA. Celles qui ont le Trait Démon ou Mort-vivant reçoivent aussi un État Enflammé. Pour chaque DR, +1 Blessure infligée aux ' + foes + '.',
    params: { range: { kind: 'self' }, targets: area, duration: { kind: 'instant' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, conditionalBonus: { when: 'foe', perSuccessLevel: 1 }, conditions: [{ key: 'Ablaze', level: 1, when: 'daemonOrUndead' }] }],
    targetRules: [],
    needsInput: [{ id: 'damage-roll', text: 'Jet de 1d10 (par cible ou commun, source muette).' }, { id: 'targets-in-area', text: 'Créatures dans la zone, y compris alliés (source muette sur l’exclusion).' }, { id: 'creature-types', text: 'Traits Démon / Mort-vivant et statut orque, gobelin, mort-vivant ou serviteur du Chaos de chaque cible.' }],
    clauses: [
      { id: 'area-damage', mode: 'engine', text: 'Toutes les cibles de la zone subissent 1d10 Blessures ignorant le BE et les PA (dégâts directs non gérés par le moteur).' },
      { id: 'ablaze-daemon-undead', mode: 'engine', text: 'Les cibles ayant le Trait Daemon ou Undead gagnent aussi un État Enflammé.' },
      { id: 'sl-extra', mode: 'engine', text: 'Pour chaque DR, +1 Blessure supplémentaire à tout orque, gobelin, mort-vivant ou serviteur des Puissances de la Ruine.' },
      { id: 'area', mode: 'assisted', text: 'Zone centrée sur vous, de rayon égal au Bonus de Sociabilité en yards.' }
    ],
    sourceDelta: 'Le gain est « par SL » imprimé, alors que la règle générale des miracles compte par tranche de +2 DR pour portée, cibles et durée; traité comme gain de dégâts distinct, explicitement écrit. Non précisé : les alliés dans la zone sont-ils touchés.'
  },
  {
    name: 'Comète à Deux Queues', canonicalName: 'Twin-tailed Comet', printedPage: 227,
    summary: 'Une comète s’abat sur une zone en ligne de vue et à portée contenant ceux que Sigmar juge ennemis. Tout dans la zone, sauf créatures invalides, subit 1d10 + DR Blessures sans TB ni PA et reçoit un État Enflammé. La zone doit être en extérieur. Si Sigmar ne trouve aucun ennemi, il vous frappe vous-même.',
    params: { range: soc('characteristic', 'yards'), targets: area, duration: { kind: 'instant' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }] },
      { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }], appliesTo: 'caster',
        casterWhen: { field: 'foe', label: 'ennemi de Sigmar (fait MJ)', value: true, match: 'none' } }],
    targetRules: [],
    needsInput: [{ id: 'target-area', text: 'Zone visée, en ligne de vue et à portée.' }, { id: 'outdoors', text: 'La zone est-elle en extérieur ?' }, { id: 'sigmar-foes', text: 'Ennemis de Sigmar présents dans la zone (arbitrage MJ); sinon le prêtre est frappé.' }, { id: 'invalid-creatures', text: 'Créatures invalides exclues (notion non définie par la source).' }, { id: 'damage-roll', text: 'Jet de 1d10 + DR.' }],
    clauses: [
      { id: 'targeting', mode: 'manual', text: 'Zone visible et à portée (Bonus de Sociabilité en yards au maximum pour la zone) contenant des ennemis aux yeux de Sigmar.' },
      { id: 'outdoors-only', mode: 'manual', text: 'La zone ciblée doit être en extérieur.' },
      { id: 'area-damage', mode: 'engine', text: 'Tout ce qui est dans la zone, sauf créatures invalides, subit 1d10 + DR Blessures ignorant BE et PA.' },
      { id: 'ablaze', mode: 'engine', text: 'Chaque créature touchée reçoit un État Enflammé.' },
      { id: 'backfire', mode: 'engine', text: 'Sans ennemi à frapper (aucune cible désignée n’est un ennemi de Sigmar, fait MJ par cible), Sigmar frappe le prêtre à la place : mêmes dégâts et même État Enflammé sur lui.' }
    ],
    sourceDelta: 'Ambigu : « invalid creatures » n’est défini nulle part dans le passage; le « SL » ajouté aux dégâts est le DR du jet de prière; la zone « maximum » est lue comme un rayon plafonné au Bonus de Sociabilité en yards.'
  },
  {
    name: 'Vaincre les impies', canonicalName: 'Vanquish the Unrighteous', printedPage: 227,
    summary: 'Les alliés choisis gagnent la Haine (Hatred, p.184) envers ' + foes + '. Après avoir tué un tel ennemi, la Haine accorde +2 DR aux Tests de combat au lieu de +1.',
    params: { range: { kind: 'self' }, targets: area, duration: rounds },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'allies', text: 'Alliés choisis dans la zone.' }, { id: 'enemy-categories', text: 'Ennemis relevant des catégories visées (orques, gobelins, morts-vivants, associés au Chaos).' }, { id: 'kills', text: 'Ennemi de ces catégories tué par un allié (déclenche le bonus de +2 DR).' }],
    clauses: [
      { id: 'hatred', mode: 'manual', text: 'Les alliés gagnent la Haine envers orques, gobelins, morts-vivants et alliés du Chaos (règle de Haine, p.184).' },
      { id: 'hatred-kill', mode: 'manual', text: 'Après avoir tué un tel ennemi, la Haine donne +2 DR aux Tests de combat au lieu de +1.' },
      { id: 'area', mode: 'assisted', text: 'Zone centrée sur vous, de rayon égal au Bonus de Sociabilité en yards.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ],
    sourceDelta: 'Le livre dit « alliés choisis » dans le texte mais la cible imprimée est la zone entière; le prêtre est-il compté n’est pas précisé.'
  }
];
