// Miracles de Morr — Livre de base V5 EN v2, page imprimée 223.
export const cult = 'Morr';

export const miracles = [
 {
  name: 'Masque mortuaire', canonicalName: 'Death Mask', printedPage: 223,
  summary: 'Le visage du prêtre devient cadavérique et il gagne le Trait Peur (Fear). Les morts-vivants n’en sont pas immunisés, quels que soient leurs Talents, Traits (Construct compris) ou autres effets.',
  params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'rounds' } },
  status: 'manual', effect: null,
  targetRules: ['prêtre uniquement'],
  needsInput: [
   { id: 'fear-resolution', text: 'Quelles créatures doivent résister à la Peur, et les morts-vivants présents ignorent-ils bien leur immunité ?' }
  ],
  clauses: [
   { id: 'fear', mode: 'manual', text: 'Le prêtre gagne Peur (Fear) pendant la durée.' },
   { id: 'undead-not-immune', mode: 'manual', text: 'Les morts-vivants ne sont pas immunisés contre cette Peur, malgré tout Talent, Trait ou effet.' }
  ]
 },
 {
  name: 'Anéantir les morts-vivants', canonicalName: 'Destroy Undead', printedPage: 223,
  summary: 'Un feu noir jaillit du prêtre en cercle : toute cible dans la zone possédant le Trait Mort-vivant perd 1d10 Blessures, sans Bonus d’Endurance ni PA, plus 1 Blessure par DR. Un mort-vivant détruit ne peut plus, normalement, être relevé par Nécromancie.',
  params: { range: { kind: 'self' }, targets: { kind: 'area', characteristicBonus: 'Soc', unit: 'yards' }, duration: { kind: 'instant' } },
  status: 'assisted',
  effects: [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, targetFilter: 'undead', killAtZeroNoReraise: true }],
  targetRules: ['Trait Mort-vivant (Undead) uniquement', 'zone centrée sur le prêtre'],
  needsInput: [
   { id: 'targets-in-area', text: 'Quelles créatures sont dans la zone et possèdent le Trait Mort-vivant ?' },
   { id: 'damage-roll', text: 'Résultat du 1d10 de Blessures perdues (par cible ou commun, à trancher).' },
   { id: 'destroyed', text: 'Quels morts-vivants tombent à 0 Blessure (détruits, plus relevables par Nécromancie) ?' }
  ],
  clauses: [
   { id: 'wound-loss', mode: 'engine', text: 'Chaque cible Mort-vivant perd 1d10 Blessures sans appliquer Bonus d’Endurance ni PA.' },
   { id: 'sl-wounds', mode: 'engine', text: 'Chaque DR ajoute 1 Blessure perdue.' },
   { id: 'no-reraise', mode: 'engine', text: 'Un mort-vivant détruit ne peut plus être relevé par Nécromancie dans les conditions normales.' }
  ],
  sourceDelta: 'Portée imprimée tronquée (« Yo ») ; lue « You » par cohérence avec la zone centrée sur le prêtre et L06-prayers. Le livre dit « pour chaque SL » (et non « par +2 SL ») : 1 Blessure par DR retenue.'
 },
 {
  name: 'Condamné', canonicalName: 'Dooming', printedPage: 223,
  summary: 'Le prêtre plonge son regard dans celui de la cible et reçoit une vision de son Destin (Doom), presque toujours liée à sa mort. Une seule fois par personnage ; la cible peut ensuite acheter le Talent Condamné (Doomed) avec de l’XP comme s’il figurait dans sa carrière.',
  params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: ['une seule fois par personnage'],
  needsInput: [
   { id: 'once-per-character', text: 'Le miracle a-t-il déjà été exercé sur ce personnage ?' },
   { id: 'doom-vision', text: 'Quelle vision du Destin le MJ révèle-t-il ?' },
   { id: 'doomed-access', text: 'Le Talent Condamné est-il ouvert à l’achat pour ce personnage ?' }
  ],
  clauses: [
   { id: 'vision', mode: 'manual', text: 'Le prêtre reçoit une vision du Destin de la cible, le plus souvent liée à sa mort.' },
   { id: 'once', mode: 'manual', text: 'Ne peut être exercé qu’une fois sur un personnage donné.' },
   { id: 'doomed-talent', mode: 'manual', text: 'Après le miracle, le Talent Condamné s’achète avec de l’XP comme s’il était dans la carrière de la cible.' }
  ],
  sourceDelta: 'Aucune ambiguïté de chiffres. La portée Contact (Touch) est encodée {kind:\'touch\'}.'
 },
 {
  name: 'Rites funéraires', canonicalName: 'Last Rites', printedPage: 223,
  summary: 'Le prêtre chante un requiem sur un cadavre : l’âme franchit le portail vers le royaume de Morr et le cadavre ne peut plus être ciblé par aucun sort de Nécromancie. Un ennemi possédant à la fois les Traits Construct et Mort-vivant ciblé par ce miracle est détruit.',
  params: { range: { kind: 'fixed', value: 1, unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
  status: 'manual', effect: null,
  targetRules: ['cadavre', 'ou ennemi Construct et Mort-vivant'],
  needsInput: [
   { id: 'target-nature', text: 'La cible est-elle un cadavre ordinaire ou un ennemi Construct et Mort-vivant ?' }
  ],
  clauses: [
   { id: 'soul', mode: 'manual', text: 'L’âme du défunt est envoyée par le portail vers le royaume de Morr.' },
   { id: 'necromancy-ward', mode: 'manual', text: 'Le cadavre ne peut plus être ciblé par aucun sort de Nécromancie.' },
   { id: 'destroy-construct-undead', mode: 'manual', text: 'Un ennemi Construct et Mort-vivant ciblé est détruit.' }
  ]
 },
 {
  name: 'Seuil du Portail', canonicalName: "Portal's Threshold", printedPage: 223,
  summary: 'Le prêtre trace au sol une ligne de 8 yards maximum en psalmodiant ; un portail d’ombre indistinct apparaît. Les créatures Mort-vivant doivent réussir un Test de Calme Intermédiaire (+0 DR) pour la franchir ; celles qui sont à la fois Mort-vivant et Construct ne le peuvent pas.',
  params: { range: { kind: 'touch' }, targets: { kind: 'special' }, duration: { kind: 'special', label: 'Until sunrise' } },
  status: 'manual', effect: null,
  targetRules: ['Trait Mort-vivant', 'Mort-vivant et Construct : franchissement impossible'],
  needsInput: [
   { id: 'line', text: 'Tracé et longueur de la ligne (8 yards maximum).' },
   { id: 'sunrise', text: 'Heure du lever du soleil qui met fin au miracle.' },
   { id: 'cool-tests', text: 'Résultat du Test de Calme de chaque Mort-vivant qui tente de franchir la ligne.' }
  ],
  clauses: [
   { id: 'line-length', mode: 'manual', text: 'Ligne tracée au sol de 8 yards au plus.' },
   { id: 'undead-cool', mode: 'manual', text: 'Une créature Mort-vivant réussit un Test de Calme Intermédiaire (+0 DR) pour franchir la ligne.' },
   { id: 'construct-undead-blocked', mode: 'manual', text: 'Une créature à la fois Mort-vivant et Construct ne peut pas franchir la ligne.' },
   { id: 'expiry', mode: 'manual', text: 'Le miracle dure jusqu’au lever du soleil.' }
  ]
 },
 {
  name: 'Main de Morr', canonicalName: "Stay Morr's Hand", printedPage: 223,
  summary: 'Le prêtre touche les yeux d’une personne proche de la mort et demande à Morr de guider l’âme sans la prendre. La cible doit avoir 0 Blessure et être consentante. Pendant la durée, elle gagne Inconscient et ne se détériore plus (maladie, Blessures Critiques, poisons suspendus). Le miracle prend fin si des soins appropriés sont prodigués ou si le prêtre accomplit les derniers rites (environ une minute) ; dans ce cas, à la mort, l’âme passe le portail de Morr et le cadavre ne pourra plus être ciblé par la Nécromancie.',
  params: { range: { kind: 'touch' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'characteristic-bonus', characteristic: 'Soc', unit: 'hours' } },
  status: 'assisted',
  effects: [{ type: 'condition', key: 'Unconscious', level: 1, lockConditions: true }],
  targetRules: ['zeroWounds', 'consenting'],
  needsInput: [
   { id: 'wounds-zero', text: 'La cible est-elle bien à 0 Blessure ?' },
   { id: 'consent', text: 'La cible est-elle consentante ?' },
   { id: 'frozen-afflictions', text: 'Quelles maladies, Blessures Critiques et poisons la cible subit-elle (suspendus pendant la durée) ?' },
   { id: 'end-event', text: 'Des soins appropriés ont-ils été donnés, ou le prêtre accomplit-il les derniers rites ?' }
  ],
  clauses: [
   { id: 'unconscious', mode: 'engine', text: 'La cible gagne l’État Inconscient pendant la durée.' },
   { id: 'no-deterioration', mode: 'manual', text: 'La cible ne se détériore pas : maladie suspendue, Blessures Critiques ignorées, poisons suspendus, et effets similaires.' },
   { id: 'end-healing', mode: 'manual', text: 'Le miracle prend fin si des soins appropriés sont prodigués.' },
   { id: 'end-last-rites', mode: 'manual', text: 'Le prêtre peut y mettre fin par les derniers rites (environ 1 minute) : à la mort, l’âme franchit le portail de Morr et le cadavre est protégé de la Nécromancie.' }
  ],
  sourceDelta: 'Le livre emploie « ignoring Critical Wounds and poisons, and similar » : l’étendue exacte du « et similaire » est laissée à l’arbitrage du MJ. Lecture MJ : Inconscient est verrouillé (non récupérable) tant que le miracle dure ; la suspension des maladies, Blessures Critiques et poisons reste un rappel.'
 }
];
