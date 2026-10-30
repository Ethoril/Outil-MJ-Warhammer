// Miracles de Myrmidia, Up in Arms p.79 (imprimée = physique), V4 EN. Valeurs relues sur le PDF ; texte reformulé.
// Ces neuf miracles REMPLACENT les contrats bloqués du catalogue (même id, même entrée de catalogue) : voir sourceUpInArmsNine dans le générateur.
// `name` est le nom français du catalogue. Arbitrages du MJ (18 octobre 2026) : docs/divin/DIVIN_DECISIONS_MJ.md et DIVIN_UP_IN_ARMS_ADAPTATIONS.md §6.
export const cult = 'Myrmidia';
export const source = { bookId: 'L13', document: 'Up in arms.pdf', fileSha256: '0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07', edition: 'V4 EN' };

const self = { kind: 'self' };
const special = { kind: 'special' };
const rounds = value => ({ kind: 'fixed', value, unit: 'rounds' });
const willpowerRounds = { kind: 'characteristic-bonus', characteristic: 'FM', unit: 'rounds' };
const willpowerArea = { kind: 'area', characteristicBonus: 'FM', unit: 'yards' };
const v4Unit = 'Page 79 (V4) : yards sources lues comme mètres de jeu, sans conversion (DIV-03).';

export const miracles = [
  {
    name: 'Commander la Légion', canonicalName: 'Command the Legion', printedPage: 79,
    summary: 'Myrmidia porte vos ordres sur le champ de bataille : vous pouvez donner un ordre à un allié dans votre ligne de vue, pourvu qu’il serve un combat armé ou une stratégie en cours. Vos Tests de Commandement gagnent +1 DR pendant le miracle.',
    params: { range: special, targets: special, duration: rounds(1) },
    status: 'assisted',
    effects: [{ type: 'test-modifier', modifiers: { Commandement: 1 }, appliesTo: 'caster' }],
    targetRules: [],
    needsInput: [
      { id: 'ordered-ally', text: 'Quel allié reçoit l’ordre, et est-il dans la ligne de vue du prêtre ?' },
      { id: 'armed-struggle', text: 'L’ordre sert-il bien un combat armé ou une stratégie en cours ?' }
    ],
    clauses: [
      { id: 'leadership-bonus', mode: 'engine', text: 'Les Tests de Commandement du prêtre gagnent +1 DR pendant la durée (le +10 V4 au Test se lit +1 DR, décision MJ).' },
      { id: 'relevant-order', mode: 'manual', text: 'L’ordre doit être pertinent pour un combat armé ou une stratégie en cours ; le moteur applique le bonus à tous les Tests de Commandement du Round, le MJ écarte ceux qui sont sans rapport.' },
      { id: 'line-of-sight', mode: 'manual', text: 'L’allié qui reçoit l’ordre doit être dans la ligne de vue du prêtre.' },
      { id: 'duration', mode: 'engine', text: 'Durée : 1 Round (+1 Round par tranche de +2 DR).' }
    ],
    sourceDelta: 'Portée imprimée « See text » et cible « Any ally » : lues comme la ligne de vue et tout allié (special). Le +10 V4 porte sur le Test : lu +1 DR (pas de +10 = +1 DR du tableau de difficulté V5, p.131), non sur la caractéristique. « Any Leadership Tests you make » : Tests du prêtre lui-même, tous ceux du Round liés à un combat armé (décision MJ) ; le moteur ne distingue pas le Test qui émet l’ordre. Le talent Présence imposante (Avantage au Commandement) reste distinct et cumulable.'
  },
  {
    name: 'Effrayer l’Ennemi', canonicalName: 'Dismay Foe', printedPage: 79,
    summary: 'Vous incarnez Myrmidia sous son aspect le plus courroucé et gagnez le Trait de créature Terreur 1 pendant le miracle.',
    params: { range: self, targets: self, duration: rounds(1) },
    status: 'assisted',
    effects: [{ type: 'grant-trait', traits: ['Terreur (1)'] }],
    targetRules: [],
    needsInput: [
      { id: 'terror-witnesses', text: 'Quels ennemis voient le prêtre au lancement et doivent faire leur Test de Psychologie ?' }
    ],
    clauses: [
      { id: 'terror-trait', mode: 'engine', text: 'Le prêtre gagne le Trait Terreur (1) pendant la durée (étiquette sans Test automatique).' },
      { id: 'terror-test', mode: 'manual', text: 'Tout ennemi qui voit le prêtre au lancement fait une fois pendant la durée le Test de Psychologie (Calme) de la Terreur (p.184, p.362) ; échec : États Brisé selon l’indice et les DR négatifs, plus la Peur de même indice (p.183).' },
      { id: 'duration', mode: 'engine', text: 'Durée : 1 Round (+1 Round par tranche de +2 DR).' }
    ],
    sourceDelta: 'Le Trait est posé comme une étiquette, les Tests de Psychologie des ennemis restent joués par le MJ. Qui teste : tout ennemi qui voit le prêtre au lancement, même en plein combat (décision MJ), une fois pendant la durée. L’incohérence interne V5 p.184 / p.362 sur les Brisé par DR négatif s’applique telle quelle. Portée et cible « Vous » : seule la durée peut croître.'
  },
  {
    name: 'En Bon Ordre', canonicalName: 'In Good Order', printedPage: 79,
    summary: 'Sachant la situation désespérée, vous priez pour que vos troupes ne soient pas disloquées : tant que le miracle dure, les alliés de la zone peuvent rompre le combat sans que l’ennemi gagne l’Élan ni une attaque gratuite en retour.',
    params: { range: self, targets: willpowerArea, duration: willpowerRounds },
    status: 'assisted',
    effects: [{ type: 'special-state', orderlyDisengage: true }],
    targetRules: [],
    needsInput: [
      { id: 'allies-in-area', text: 'Quels alliés sont dans la zone (Bonus de Volonté mètres autour du prêtre) ?' },
      { id: 'fleeing', text: 'Quel allié rompt le combat (Fuite) et combien d’ennemis Engagés a-t-il ?' }
    ],
    clauses: [
      { id: 'orderly-disengage', mode: 'engine', text: 'Les alliés désignés portent « En bon ordre » : Désengagement sans Élan ni attaque gratuite adverse (à appliquer par le MJ, le moteur ne gère pas le Désengagement).' },
      { id: 'flee-exemption', mode: 'manual', text: 'Quand un allié de la zone fuit, les adversaires Engagés ne gagnent pas l’Élan et n’ont pas l’attaque de Mêlée gratuite (p.163).' },
      { id: 'broken-from-fleeing', mode: 'manual', text: 'Le fuyard gagne quand même 1 État Brisé par ennemi Engagé (p.163) ; seul le Désengagement n’est pas concerné.' },
      { id: 'area', mode: 'manual', text: 'Zone centrée sur le prêtre, de rayon égal au Bonus de Volonté en mètres (convention V5 des zones).' },
      { id: 'duration', mode: 'manual', text: 'Durée : Bonus de Volonté en Rounds.' }
    ],
    sourceDelta: 'Aucun type d’effet ne supprime l’Élan ou l’attaque gratuite de l’adversaire : contrat manuel. La zone imprimée est « Willpower yards » (caractéristique entière) : lue en Bonus de Volonté, convention V5 du livre de base pour les zones (écart V4 documenté, décision MJ). L’« avantage » V4 devient l’Élan ; le Brisé de fuite, nouveau en V5, n’est pas annulé (décision MJ). Le Désengagement (p.163) reste hors du texte. ' + v4Unit
  },
  {
    name: 'Connaître son Ennemi', canonicalName: 'Know Your Enemy', printedPage: 79,
    summary: 'Vous appelez Myrmidia pour connaître les forces et faiblesses d’un ennemi proche : le MJ vous laisse consulter ses caractéristiques, ses Traits, ses compétences et ses Talents.',
    params: { range: { kind: 'characteristic', characteristic: 'FM', unit: 'yards' }, targets: { kind: 'count', value: 1 }, duration: { kind: 'instant' } },
    status: 'manual',
    targetRules: [],
    needsInput: [
      { id: 'enemy', text: 'Quel ennemi est visé, dans la portée de Volonté mètres ?' }
    ],
    clauses: [
      { id: 'reveal-profile', mode: 'manual', text: 'Le MJ révèle les caractéristiques, les Traits, les compétences et les Talents de l’ennemi visé.' },
      { id: 'gm-secrets', mode: 'manual', text: 'Le MJ garde la main sur ce qui reste secret (identité, malédictions cachées).' },
      { id: 'range', mode: 'manual', text: 'Portée : Volonté en mètres (caractéristique entière).' }
    ],
    sourceDelta: 'Révélation d’information, sans effet moteur : contrat manuel. Portée imprimée « Willpower yards » conservée en caractéristique entière (convention V5 pour les portées ; le catalogue disait Bonus, décision MJ). Étendue : caractéristiques, Traits, compétences, Talents ; Blessures actuelles, Chance et équipement ne sont pas inclus (décision MJ). ' + v4Unit
  },
  {
    name: 'Sur un Terrain Mortel', canonicalName: 'On Deadly Ground', printedPage: 79,
    summary: 'Vous bannissez l’idée de retraite de l’esprit de vos alliés : tant que le miracle dure, ils ne reçoivent pas l’État Brisé. Vous comptez parmi eux.',
    params: { range: self, targets: willpowerArea, duration: willpowerRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'grant-immunity', conditions: ['Brisé'] }],
    targetRules: [],
    needsInput: [
      { id: 'allies-in-area', text: 'Quels alliés sont dans la zone (Bonus de Volonté mètres autour du prêtre), prêtre compris ?' },
      { id: 'broken-attempts', text: 'Quelle source tente de donner l’État Brisé (Terreur, Fuite, autre) pendant la durée ?' }
    ],
    clauses: [
      { id: 'no-broken', mode: 'engine', text: 'Les alliés de la zone, prêtre compris, ne reçoivent pas l’État Brisé tant que le miracle dure : à écarter à chaque acquisition (Terreur, Fuite, autres sources).' },
      { id: 'existing-broken', mode: 'engine', text: 'Les États Brisé déjà acquis restent : seule l’acquisition est empêchée.' },
      { id: 'duration-unattested', mode: 'manual', text: 'Durée : Bonus de Volonté en Rounds, valeur NON ATTESTÉE par la page 79 (voir l’écart).' }
    ],
    sourceDelta: 'Effet grant-immunity : Brisé refusé à l’acquisition pour les cibles désignées. Page 79 : portée « Self », cible « You », et la ligne Durée contient « Allies within AoE (Willpower yards) » sans aucune durée (la cible a glissé dans la ligne Durée). Durée non attestée, retenue en Bonus de Volonté en Rounds comme En Bon Ordre et le catalogue (décision MJ) ; zone lue en Bonus de Volonté (convention V5 des zones, décision MJ). Le prêtre est bénéficiaire ; les Brisé déjà acquis restent. Aucun erratum trouvé dans les 17 livres du corpus. ' + v4Unit
  },
  {
    name: 'Attaque Rapide', canonicalName: 'Quick Strike', printedPage: 79,
    summary: 'Animé de la puissance de Myrmidia, vous anticipez les mouvements adverses : au début de chaque Round du miracle, vous pouvez tenter un Test d’Initiative Intermédiaire (+0 DR) pour une attaque gratuite hors de la séquence normale, avec l’arme de la main principale.',
    params: { range: self, targets: self, duration: rounds(3) },
    status: 'assisted',
    effects: [{ type: 'free-attack', scope: 'round', test: { attr: 'I', slModifier: 0 }, appliesTo: 'caster' }],
    targetRules: [],
    needsInput: [
      { id: 'initiative-test', text: 'Résultat du Test d’Initiative Intermédiaire (+0 DR) au début de chaque Round.' },
      { id: 'free-attack', text: 'Cible de l’attaque gratuite et résultat du Test de Mêlée opposé.' }
    ],
    clauses: [
      { id: 'round-start-test', mode: 'engine', text: 'Au début de chaque Round du miracle (étape 2 de la séquence, p.161), Test d’Initiative Intermédiaire (+0 DR), une seule tentative par Round ; sur réussite, une attaque gratuite hors de la séquence normale avec l’arme de la main principale (case « Attaque rapide » de l’attaque : Test réussi et arme de main requis, une attaque par Round, sans Élan).' },
      { id: 'free-attack', mode: 'manual', text: 'Sur réussite : une attaque de Mêlée ordinaire opposée, avec l’arme de la main principale, sans Action ni Mouvement ; l’Élan se gagne et se perd normalement (p.168).' },
      { id: 'duration', mode: 'engine', text: 'Durée : 3 Rounds (+3 Rounds par tranche de +2 DR).' }
    ],
    sourceDelta: 'Attaque gratuite hors séquence modélisée sur celle de Frénésie (effet free-attack : Test d’Initiative Intermédiaire (+0 DR) réussi et arme de la main principale saisis dans le panneau d’attaque, une par Round, sans Élan). Intermédiaire (+0) V4 = Intermédiaire (+0 DR) V5 sans conversion. Attaque gratuite : Mêlée ordinaire opposée, une fois par Round, Élan normal (décision MJ) ; elle s’ajoute à l’attaque supplémentaire à l’Élan (p.168), sans l’exclure. Portée et cible « Vous » : seule la durée peut croître.'
  },
  {
    name: 'Dévotion de la Guerrière', canonicalName: 'Shieldmaiden’s Devotion', printedPage: 79,
    summary: 'Vos prières chantées emplissent les fidèles de l’intrépidité des plus braves Guerrières : tous les Myrmidiens à portée gagnent le Talent Sans peur [Ennemi], l’ennemi étant un individu précis ou une espèce, choisi par le prêtre.',
    params: { range: { kind: 'fixed', value: 36, unit: 'yards' }, targets: special, duration: rounds(4) },
    status: 'assisted',
    effects: [{ type: 'grant-talent', talents: [{ id: 'talent-fearless', name: 'Sans peur', rank: 1 }], specializationFrom: 'input' }],
    targetRules: ['ally', 'within-range'],
    needsInput: [
      { id: 'myrmidians', text: 'Quels Myrmidiens sont à portée (36 m) ?' }
    ],
    clauses: [
      { id: 'fearless-enemy', mode: 'engine', text: 'Chaque Myrmidien désigné gagne le Talent Sans peur [Ennemi] contre l’ennemi saisi par le prêtre au lancement, le même pour tous, pendant la durée ; sans ennemi saisi, le lancement est refusé.' },
      { id: 'myrmidians', mode: 'manual', text: 'Cible « See text » : tous les Myrmidiens à portée, sans plafond ; le MJ désigne ceux qui sont à 36 m ou moins.' },
      { id: 'fear-only', mode: 'manual', text: 'En V5 (p.119) le Talent protège de la Peur du groupe choisi, non de sa Terreur ni de l’Intimidation.' },
      { id: 'duration', mode: 'engine', text: 'Durée : 4 Rounds (+4 Rounds par tranche de +2 DR) ; portée 36 m (+36 par tranche).' }
    ],
    sourceDelta: 'Le Talent Sans peur du moteur est posé avec une spécialisation saisie par le prêtre à chaque lancement (grant-talent, specializationFrom input) : sans elle le lancement est refusé, car un Sans peur [Ennemi] sans spécialisation ne s’applique à aucun ennemi (fait manquant talent.specialization, talent-contract-v2). Un seul ennemi choisi par le prêtre au lancement, pour tous (décision MJ). « Individu précis » n’existe pas en V5 (groupe d’ennemis) : lecture MJ, la saisie est un texte libre. Cible « See text » : tous les Myrmidiens à portée, sans plafond (ciblage ally/within-range comme Compétence Martiale). Les alliés perdent la protection V4 contre la Terreur de l’ennemi choisi. ' + v4Unit
  },
  {
    name: 'Compétence Martiale', canonicalName: 'Skill of Combat', printedPage: 79,
    summary: 'Vous incarnez en vos alliés l’habileté de Myrmidia : tous les alliés à portée gagnent +10 en CC et en CT pendant le miracle.',
    params: { range: { kind: 'fixed', value: 24, unit: 'yards' }, targets: special, duration: rounds(4) },
    status: 'assisted',
    effects: [{ type: 'characteristic-modifier', characteristic: 'CC', value: 10 }, { type: 'characteristic-modifier', characteristic: 'CT', value: 10 }],
    targetRules: ['ally', 'within-range'],
    needsInput: [
      { id: 'allies-in-range', text: 'Quels alliés sont à portée (24 m) ?' }
    ],
    clauses: [
      { id: 'weapon-skill', mode: 'engine', text: 'Chaque allié désigné gagne +10 en Capacité de Combat (type characteristic-modifier).' },
      { id: 'ballistic-skill', mode: 'engine', text: 'Chaque allié désigné gagne +10 en Capacité de Tir (type characteristic-modifier).' },
      { id: 'allies', mode: 'manual', text: 'Cible « See text » : tous les alliés à portée, sans plafond ; le MJ désigne ceux qui sont à 24 m ou moins.' },
      { id: 'duration', mode: 'engine', text: 'Durée : 4 Rounds (+4 Rounds par tranche de +2 DR).' }
    ],
    sourceDelta: 'Le +10 porte sur les caractéristiques, comme les Bénédictions de Bataille et de la Chasse (p.221) : aucune conversion (décision MJ : +10 CC et +10 CT, non +1 DR). Cumul avec ces Bénédictions selon les règles de cumul établies (DIV-05) ; la p.217 n’interdit que le cumul d’une même prière. Portée et cible : yards sources lus comme mètres de jeu (DIV-03), tous les alliés à portée.'
  },
  {
    name: 'Vindicte Vengeresse', canonicalName: 'Vengeful Wrath', printedPage: 79,
    summary: 'L’indignation de Myrmidia vous emplit : pendant le miracle, vous devez charger et attaquer l’ennemi impénitent le plus proche, et vous pouvez relancer chaque Test de Mêlée une fois, le nouveau résultat tenant.',
    params: { range: self, targets: self, duration: rounds(6) },
    status: 'manual',
    targetRules: [],
    needsInput: [
      { id: 'unrepentant-enemy', text: 'Quel ennemi le MJ désigne-t-il comme impénitent dans cette scène ?' },
      { id: 'rerolls', text: 'Quels Tests de Mêlée du prêtre sont relancés, et quel est le nouveau résultat ?' }
    ],
    clauses: [
      { id: 'charge-and-attack', mode: 'manual', text: 'Le prêtre doit charger puis attaquer l’ennemi impénitent le plus proche (Charge V5 p.163). On ne charge que si l’on n’est pas déjà Engagé : s’il l’est, il doit d’abord se Désengager (perdre l’Élan pour se déplacer sans pénalité, ou Test d’Esquive/Acrobaties opposé), puis il peut charger, y compris une autre cible.' },
      { id: 'unrepentant', mode: 'manual', text: 'Le MJ désigne l’ennemi impénitent à chaque scène ; la contrainte s’arrête si aucun n’est en vue ou si le prêtre est Étourdi ou Inconscient.' },
      { id: 'melee-reroll', mode: 'manual', text: 'Chaque Test de Mêlée du prêtre peut être relancé une fois ; le nouveau résultat tient (p.133).' },
      { id: 'no-frenzy-bonus', mode: 'manual', text: 'Aucun bonus de Frénésie : ni immunité à la Psychologie, ni attaque gratuite, ni +1 Dégât.' },
      { id: 'duration', mode: 'manual', text: 'Durée : 6 Rounds (+6 Rounds par tranche de +2 DR).' }
    ],
    sourceDelta: 'Aucun type d’effet pour la relance de Tests ni pour la contrainte de comportement : contrat manuel. Relance : une fois par Test de Mêlée, nouveau résultat tenant (décision MJ). « Ennemi impénitent » n’est défini nulle part : désigné par le MJ à chaque scène, contrainte levée si aucun n’est en vue ou si le prêtre est Étourdi ou Inconscient (décision MJ). Portée et cible « Vous » : seule la durée peut croître.'
  }
];
