// Miracles de Manann — Livre de base V5 EN v2, pages imprimées 222-223.
export const cult = 'Manann';

export const miracles = [
 {
  name: 'Encalminé', canonicalName: 'Becalm', printedPage: 222,
  summary: 'Le vent déserte les voiles d’un navire en vue : il est totalement encalminé. Une zone de calme de Sociabilité yards de rayon l’entoure malgré la tempête ; si une autre propulsion (rames) est utilisée, la zone suit le navire. +2 DR : portée, cibles ou durée augmentées de leur valeur initiale.',
  params: { range: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'miles' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 1, unit: 'hours' } },
  status: 'manual', effect: null,
  targetRules: ['navire à voile', 'en ligne de vue du prêtre'],
  needsInput: [
   { id: 'vessel', text: 'Quel navire est la cible, et est-il en ligne de vue ?' },
   { id: 'range-check', text: 'Le navire est-il à moins de Bonus de Sociabilité miles ?' },
   { id: 'propulsion', text: 'Le navire avance-t-il à la rame ou autrement (la zone le suit) ?' }
  ],
  clauses: [
   { id: 'becalmed', mode: 'manual', text: 'Le navire cible est totalement encalminé pendant 1 heure.' },
   { id: 'calm-zone', mode: 'manual', text: 'Zone de calme de Sociabilité yards autour du navire, malgré tempête et mer agitée ; elle suit le navire s’il avance par une autre propulsion.' },
   { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : ajouter portée, cibles ou durée égales à la valeur initiale.' }
  ],
  sourceDelta: 'Portée en miles : unité absente de la grammaire params (yards/rounds/minutes/hours), unit \'miles\' utilisée, à valider côté générateur. La zone est imprimée « Fellowship yards » (sans « Bonus », contrairement à la portée) : lue comme la Sociabilité entière, non son Bonus.'
 },
 {
  name: 'Visage de l’homme noyé', canonicalName: "Drowned Man's Face", printedPage: 222,
  summary: 'La cible se noie sur place : ses poumons se remplissent d’eau salée pendant la durée. Elle subit Fatigué et les règles de noyade (p.169), même démon ou mort-vivant. À la fin du miracle, elle subit Étourdi pendant 1 Round.',
  params: { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'manual', effect: null,
  targetRules: ['démons et morts-vivants affectés'],
  needsInput: [
   { id: 'target', text: 'Quelle créature est la cible, et est-elle à portée ?' },
   { id: 'drowning-rules', text: 'Résolution de la noyade selon les règles de la p.169, tour par tour.' }
  ],
  clauses: [
   { id: 'fatigued', mode: 'assisted', text: 'La cible gagne l’État Fatigué pendant la durée.' },
   { id: 'drowning', mode: 'manual', text: 'La cible se noie pendant la durée (règles p.169), y compris démons et morts-vivants.' },
   { id: 'stunned-end', mode: 'assisted', text: 'À la fin du miracle, la cible gagne Étourdi pendant 1 Round.' },
   { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : portée, cibles ou durée augmentées de leur valeur initiale.' }
  ]
 },
 {
  name: 'Vents favorables', canonicalName: 'Fair Winds', printedPage: 222,
  summary: 'Le navire cible file à sa vitesse maximale quels que soient vent, marée et courant ; tous les Tests de Navigation (Sail) pour le piloter gagnent +1 DR.',
  params: { range: { kind: 'characteristic-bonus', characteristic: 'I', unit: 'miles' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'fixed', value: 1, unit: 'hours' } },
  status: 'manual', effect: null,
  targetRules: ['navire à voile', 'en ligne de vue du prêtre'],
  needsInput: [
   { id: 'vessel', text: 'Quel navire est la cible, et est-il en ligne de vue et à portée (Bonus d’Initiative miles) ?' },
   { id: 'top-speed', text: 'Vitesse maximale du navire et trajet suivi.' }
  ],
  clauses: [
   { id: 'top-speed', mode: 'manual', text: 'Le navire se déplace à vitesse maximale sans tenir compte de vent, marée ni courant.' },
   { id: 'sail-sl', mode: 'manual', text: 'Les Tests de Navigation (Sail) pour contrôler le navire gagnent +1 DR pendant la durée.' },
   { id: 'sl-extension', mode: 'assisted', text: 'Par tranche de +2 DR : portée, cibles ou durée augmentées de leur valeur initiale.' }
  ],
  sourceDelta: 'Portée en Bonus d’Initiative miles (unité miles hors grammaire params, voir Encalminé).'
 },
 {
  name: 'Générosité de Manann', canonicalName: "Manalt's Bounty", printedPage: 222,
  summary: 'En plongeant la main dans l’eau, le prêtre pêche de quoi nourrir 1 personne (2 en mer) ; +1 personne par +2 DR.',
  params: { range: { kind: 'special' }, targets: { kind: 'special' }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: [],
  needsInput: [
   { id: 'water-body', text: 'Le prêtre puise-t-il dans la mer ou dans une autre étendue d’eau ?' },
   { id: 'success-levels', text: 'Nombre de DR obtenus (nombre de personnes nourries).' }
  ],
  clauses: [
   { id: 'feed', mode: 'manual', text: 'Poisson pour nourrir 1 personne ; 2 personnes si le prêtre puise dans la mer.' },
   { id: 'sl-feed', mode: 'assisted', text: 'Par tranche de +2 DR : une personne nourrie de plus.' }
  ],
  sourceDelta: 'Le livre imprime « Manalt’s Bounty » (probable coquille) alors que miracles.json donne « Manann’s Bounty » ; nom imprimé conservé comme canonicalName.'
 },
 {
  name: 'Mer déchaînée', canonicalName: 'Sea Legs', printedPage: 223,
  summary: 'La cible est trempée d’eau salée et tangue comme sur un pont de tempête : elle gagne un Aveuglé, un Assourdi et un Fatigué, et doit réussir un Test d’Athlétisme Accessible (+2 DR) pour utiliser son Mouvement ; en cas d’échec elle gagne aussi À terre.',
  params: { range: { kind: 'characteristic', characteristic: 'Soc', unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'assisted',
  effects: [
   { type: 'condition', key: 'Blinded', level: 1 },
   { type: 'condition', key: 'Deafened', level: 1 },
   { type: 'condition', key: 'Fatigued', level: 1 }
  ],
  targetRules: [],
  needsInput: [
   { id: 'target', text: 'Quelle créature est la cible, et est-elle à portée ?' },
   { id: 'athletics-roll', text: 'Résultat du Test d’Athlétisme Accessible (+2 DR) de la cible lorsqu’elle veut se déplacer.' }
  ],
  clauses: [
   { id: 'blinded', mode: 'engine', text: 'La cible gagne 1 État Aveuglé.' },
   { id: 'deafened', mode: 'engine', text: 'La cible gagne 1 État Assourdi.' },
   { id: 'fatigued', mode: 'engine', text: 'La cible gagne 1 État Fatigué.' },
   { id: 'athletics', mode: 'manual', text: 'Pour utiliser son Mouvement, la cible tente un Test d’Athlétisme Accessible (+2 DR).' },
   { id: 'prone', mode: 'assisted', text: 'En cas d’échec au Test, la cible gagne aussi l’État À terre.' }
  ]
 },
 {
  name: 'Marcher sur les eaux', canonicalName: 'Waterwalk', printedPage: 223,
  summary: 'Le prêtre traverse l’eau libre comme un sol solide, uniquement sur une étendue d’au moins 10 yards de large ; une étendue plus petite est trop éloignée du domaine de Manann.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'minutes' } },
  status: 'manual', effect: null,
  targetRules: ['étendue d’eau d’au moins 10 yards de large'],
  needsInput: [
   { id: 'water-width', text: 'L’étendue d’eau fait-elle au moins 10 yards de large ?' }
  ],
  clauses: [
   { id: 'walk', mode: 'manual', text: 'Le prêtre se déplace sur l’eau comme sur un sol ferme pendant la durée.' },
   { id: 'min-width', mode: 'manual', text: 'Ne fonctionne que sur une étendue d’au moins 10 yards de large.' }
  ]
 }
];
