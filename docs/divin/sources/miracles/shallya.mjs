// Miracles de Shallya, Livre de base V5 EN v2, p.226 imprimée. Valeurs vérifiées sur le PDF.
export const cult = 'Shallya';

const touch = { kind: 'touch' };
const soc = (kind, unit) => ({ kind, characteristic: 'Soc', unit });
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Endurance de l’anachorète', canonicalName: "Anchorite's Endurance", printedPage: 226,
    summary: 'La cible ne ressent plus la douleur, gagne le Trait de créature Impassible (Painless) et ne subit aucune pénalité due aux États, pendant la durée.',
    params: { range: soc('characteristic', 'yards'), targets: one, duration: soc('characteristic-bonus', 'rounds') },
    status: 'implemented',
    effect: null,
    effects: [{ type: 'grant-trait', traits: ['Impassible'] }, { type: 'special-state', ignoreConditionPenalties: true }],
    targetRules: [],
    needsInput: [{ id: 'target', text: 'Cible du miracle.' }, { id: 'condition-penalties', text: 'Pénalités d’États à neutraliser (règle des États, livre p.360).' }],
    clauses: [
      { id: 'painless-trait', mode: 'engine', text: 'La cible gagne le Trait de créature Painless pendant la durée.' },
      { id: 'condition-penalties', mode: 'engine', text: 'La cible ne subit aucune pénalité causée par les États (les États restent présents) ; Inconscient et Surpris gardent leurs restrictions.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ]
  },
  {
    name: 'Baume pour un esprit blessé', canonicalName: 'Balm to a Wounded Mind', printedPage: 226,
    summary: 'Tous les Traits psychologiques de la cible sont supprimés pendant la durée; ensuite elle dort profondément jusqu’au prochain lever du soleil si rien ne la dérange. Une cible non consentante peut résister par un Test de Calme Intermédiaire (+0 DR).',
    params: { range: touch, targets: one, duration: soc('characteristic-bonus', 'minutes') },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'willing', text: 'La cible est-elle consentante ? Sinon, résultat de son Test de Calme.' }, { id: 'psychology-traits', text: 'Traits psychologiques de la cible à suspendre.' }, { id: 'disturbed', text: 'Le sommeil est-il dérangé ? Heure du lever du soleil.' }],
    clauses: [
      { id: 'remove-psychology', mode: 'manual', text: 'Tous les Traits psychologiques sont retirés pendant la durée.' },
      { id: 'sleep', mode: 'manual', text: 'Après la durée, la cible dort profondément jusqu’au lever du soleil, sauf dérangement.' },
      { id: 'resist', mode: 'assisted', text: 'Cible non consentante : Test de Calme Intermédiaire (+0 DR) pour résister au sommeil.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en minutes.' }
    ],
    sourceDelta: 'Le livre imprime « Challenging (+0 SL) » : traduit Intermédiaire (+0 DR). La résistance est écrite comme portant sur le sommeil; elle ne précise pas si elle protège aussi la suppression des Traits.'
  },
  {
    name: 'Amère catharsis', canonicalName: 'Bitter Catharsis', printedPage: 226,
    summary: 'Shallya attire en vous un poison ou une maladie de la cible et la purge entièrement. Par tranche de +2 DR, une maladie ou un poison de plus. Pour chaque poison retiré ou maladie guérie, vous subissez 1d10 moins votre Bonus de Sociabilité en Blessures.',
    params: { range: touch, targets: one, duration: { kind: 'instant' } },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'afflictions', text: 'Poisons et maladies retirés (jusqu’à 1 + 1 par +2 DR).' }, { id: 'damage-roll', text: 'Jet de 1d10 par affliction retirée.' }, { id: 'protection', text: 'Réduction éventuelle des Blessures subies (la source ne dit pas si TB/PA s’appliquent).' }],
    clauses: [
      { id: 'purge', mode: 'manual', text: 'Retire un poison ou une maladie de la cible; +1 par tranche de +2 DR.' },
      { id: 'priest-wounds', mode: 'manual', text: 'Pour chaque poison ou maladie retiré : le prêtre subit 1d10 - Bonus de Sociabilité Blessures (minimum non précisé).' }
    ],
    sourceDelta: 'Non précisé : si les Blessures du prêtre ignorent TB/PA, et si le résultat négatif est ramené à 0.'
  },
  {
    name: 'Martyr', canonicalName: 'Martyr', printedPage: 226,
    summary: 'Tous les Dégâts subis par la cible sont subis par vous à sa place; pour calculer les Blessures, ajoutez votre Bonus de Sociabilité à votre Bonus d’Endurance.',
    params: { range: soc('characteristic', 'yards'), targets: one, duration: soc('characteristic-bonus', 'rounds') },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'target', text: 'Cible protégée.' }, { id: 'damage-events', text: 'Chaque Dégât subi par la cible pendant la durée (à rediriger vers le prêtre).' }],
    clauses: [
      { id: 'damage-transfer', mode: 'manual', text: 'Tout Dégât que subirait la cible est subi par le prêtre (redirection de dégâts non gérée par le moteur).' },
      { id: 'toughness-add', mode: 'manual', text: 'Pour ces Dégâts, le BE du prêtre est augmenté de son Bonus de Sociabilité.' },
      { id: 'duration', mode: 'engine', text: 'Durée : Bonus de Sociabilité en rounds.' }
    ],
    sourceDelta: 'Non précisé : le sort des PA de la cible ou du prêtre dans le calcul, et le cas où le prêtre tombe.'
  },
  {
    name: 'Larmes de Shallya', canonicalName: "Shallya's Tears", printedPage: 226,
    summary: 'Vous priez pendant 10 moins votre Bonus de Sociabilité rounds, puis guérissez 1 Blessure Critique de la cible; +1 Blessure Critique par tranche de +2 DR. Si la prière est interrompue, la cible ne reçoit rien. Ne rattache pas les membres amputés.',
    params: { range: touch, targets: one, duration: { kind: 'special' } },
    status: 'assisted', effect: null,
    effects: [{ type: 'heal-critical', count: 1, perSuccessLevels: { every: 2, add: 1, field: 'count' } }],
    targetRules: [],
    needsInput: [{ id: 'critical-wounds', text: 'Blessures Critiques guéries (1 + 1 par +2 DR) et lesquelles.' }, { id: 'prayer-rounds', text: 'Rounds de prière : 10 - Bonus de Sociabilité.' }, { id: 'uninterrupted', text: 'La prière est-elle restée ininterrompue ?' }],
    clauses: [
      { id: 'prayer-time', mode: 'manual', text: 'Le prêtre prie (10 − Bonus de Sociabilité) Rounds avant l’effet.' },
      { id: 'heal-critical', mode: 'engine', text: 'Guérit 1 Blessure Critique de la cible ; +1 par tranche de +2 DR. La Blessure guérie est retirée du registre ; les États posés par le critique restent.' },
      { id: 'interruption', mode: 'manual', text: 'Prière interrompue : aucun effet pour la cible.' },
      { id: 'no-reattach', mode: 'manual', text: 'Ne rattache pas les membres amputés.' }
    ]
  },
  {
    name: 'Innocence immaculée', canonicalName: 'Unblemished Innocence', printedPage: 226,
    summary: 'La cible perd 1 Point de Corruption acquis durant la dernière session de jeu, +1 par tranche de +2 DR. En cas de Maladresse, vous et la cible gagnez chacun 1d10 Points de Corruption, en plus des autres effets.',
    params: { range: touch, targets: one, duration: { kind: 'instant' } },
    status: 'manual', effect: null, targetRules: [],
    needsInput: [{ id: 'corruption-history', text: 'Points de Corruption acquis lors de la dernière session de jeu par la cible.' }, { id: 'fumble-roll', text: 'En cas de Maladresse : 1d10 Corruption pour le prêtre et pour la cible.' }],
    clauses: [
      { id: 'remove-corruption', mode: 'manual', text: 'La cible perd 1 Point de Corruption gagné lors de la dernière session; +1 par tranche de +2 DR.' },
      { id: 'fumble', mode: 'manual', text: 'Maladresse : le prêtre et la cible gagnent chacun 1d10 Points de Corruption, en plus des autres effets.' }
    ]
  }
];
