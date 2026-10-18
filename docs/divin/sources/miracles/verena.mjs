/* Miracles de Verena, livre de base V5 EN v2 p.229 (imprimée). Transcription vérifiée au PDF; texte reformulé. */
export const cult = 'Verena';
const soc = { characteristic: 'Soc' };
const felBonusYards = { kind: 'characteristic-bonus', ...soc, unit: 'yards' };
const felRounds = { kind: 'characteristic-bonus', ...soc, unit: 'rounds' };
const self = { kind: 'self' };
const one = { kind: 'count', value: 1 };

export const miracles = [
  {
    name: 'Verena est mon témoin',
    canonicalName: 'As Verena Is My Witness',
    printedPage: 229,
    summary: 'Tant que vous ne dites que la vérité, tous ceux qui vous écoutent croient que vous êtes sincère. Cela ne les oblige pas à approuver vos conclusions.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'truthful', text: 'Les propos tenus sont-ils entièrement vrais selon le MJ ?' },
      { id: 'listeners', text: 'Auditeurs concernés (tous ceux qui écoutent).' }
    ],
    clauses: [
      { id: 'believed-sincere', mode: 'manual', text: 'Pendant la durée, si le prêtre ne dit que la vérité, tous les auditeurs le croient sincère.' },
      { id: 'no-agreement', mode: 'manual', text: 'Les auditeurs ne sont pas tenus d\'adhérer aux conclusions du prêtre.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ]
  },
  {
    name: 'Justice aveugle',
    canonicalName: 'Blind Justice',
    printedPage: 229,
    summary: 'Vous pouvez faire un test de Perception Intermédiaire (+0 DR) pour percer les sorts et miracles d\'illusion ou de diversion, et un test d\'Intuition Accessible (+2 DR) pour savoir si un interlocuteur ment. Le second ne révèle que ce que la personne sait être faux : une erreur sincère passe inaperçue.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'illusion', text: 'Sort ou miracle d\'illusion ou de diversion à percer.' },
      { id: 'speaker', text: 'Interlocuteur dont on teste la sincérité.' },
      { id: 'tests', text: 'Résultats des tests de Perception (Intermédiaire, +0 DR) et d\'Intuition (Accessible, +2 DR).' }
    ],
    clauses: [
      { id: 'perception-test', mode: 'assisted', text: 'Test de Perception Intermédiaire (+0 DR) pour voir à travers sorts et miracles d\'illusion ou de diversion.' },
      { id: 'intuition-test', mode: 'assisted', text: 'Test d\'Intuition Accessible (+2 DR) pour déterminer si un interlocuteur ment.' },
      { id: 'sincere-error', mode: 'manual', text: 'Le test ne détecte que le mensonge conscient : une erreur de bonne foi n\'est pas signalée.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Le livre écrit « Challenging (+0 SL) » pour Perception : rendu « Intermédiaire (+0 DR) » selon la correspondance de difficulté de la prière (extraction : Intermédiaire).'
  },
  {
    name: 'Entraves à la vérité',
    canonicalName: 'Shackles of Truth',
    printedPage: 229,
    summary: 'Vous demandez à Verena de juger un criminel présumé. Si la cible a commis un crime et affirme le contraire, elle gagne l\'État Entravé (Entangled), impossible à retirer pendant la durée. Si votre accusation était fausse, Verena vous reproche votre manque de sagesse : vous lancez immédiatement sur la table Colère des dieux.',
    params: { range: felBonusYards, targets: one, duration: felRounds },
    status: 'assisted',
    effects: [{ type: 'condition', key: 'Entangled', level: 1, lockConditions: true }],
    targetRules: ['criminal', 'denies-crime'],
    needsInput: [
      { id: 'crime', text: 'La cible a-t-elle commis un crime (décision MJ) ?' },
      { id: 'denial', text: 'La cible nie-t-elle ce crime ?' },
      { id: 'false-accusation', text: 'L\'accusation était-elle fausse ? Si oui : jet sur la table Colère des dieux.' }
    ],
    clauses: [
      { id: 'entangled', mode: 'engine', text: 'Si la cible a commis le crime et le nie, elle gagne l\'État Entangled impossible à retirer pendant la durée.' },
      { id: 'false-accusation-wrath', mode: 'manual', text: 'Accusation fausse : jet immédiat sur la table Colère des dieux (règle de colère, p.218-219).' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Niveau (Force) de l\'État Entangled non précisé : 1 présumé, à confirmer.'
  },
  {
    name: 'Épée de justice',
    canonicalName: 'Sword of Justice',
    printedPage: 229,
    summary: 'Si vous maniez une épée, elle ignore les Points d\'Armure et devient Magique. Un adversaire frappé qui est un criminel (selon le MJ) doit réussir un test d\'Endurance Accessible (+2 DR) ou gagner l\'État Inconscient, pour au moins Bonus de Sociabilité rounds. Chaque crime commis contre un adversaire inconscient vous vaut +1 Point de Péché.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [{ type: 'weapon-bonus', magical: true, designatedWeapon: true, weaponClass: 'épée' }],
    targetRules: ['wielding-sword'],
    needsInput: [
      { id: 'sword', text: 'Le prêtre manie-t-il une épée ?' },
      { id: 'criminal', text: 'L\'adversaire frappé est-il un criminel (décision MJ) ?' },
      { id: 'endurance', text: 'Résultat du test d\'Endurance Accessible (+2 DR) de la cible.' },
      { id: 'crime-on-unconscious', text: 'Nombre de crimes commis sur un adversaire rendu inconscient (Points de Péché).' }
    ],
    clauses: [
      { id: 'ignore-ap', mode: 'manual', text: 'L\'épée ignore les Points d\'Armure.' },
      { id: 'magical', mode: 'engine', text: 'L\'épée est Magique.' },
      { id: 'endurance-test', mode: 'assisted', text: 'Adversaire criminel frappé : test d\'Endurance Accessible (+2 DR), échec : État Inconscient.' },
      { id: 'unconscious-duration', mode: 'manual', text: 'L\'État Inconscient dure au moins Bonus de Sociabilité rounds (Bonus du prêtre présumé).' },
      { id: 'sin', mode: 'manual', text: '+1 Point de Péché pour le prêtre par crime commis sur un adversaire inconscient.' },
      { id: 'end', mode: 'manual', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: '« Fellowship Bonus Rounds » pour l\'Inconscient : Bonus de Sociabilité du prêtre présumé, non précisé. « Unconscious » peut prolonger au-delà de la durée du miracle. L\'État Inconscient reste au rappel MJ : la cible du miracle est le prêtre seul (portée et cible « vous »), l\'adversaire frappé n\'est pas un participant adressable par le moteur.'
  },
  {
    name: 'La Vérité éclatera',
    canonicalName: 'Truth Will Out',
    printedPage: 229,
    summary: 'Vous posez une question unique à la cible, qui répond aussitôt de manière véridique et complète. Elle résiste par un test de Calme Accessible (+2 DR) opposé à votre DR; si elle gagne, elle peut refuser de répondre. À +2 DR elle peut taire une information mineure, à +4 DR une information importante, à +6 DR mentir franchement. Vous savez si elle a résisté avec succès, sans connaître son mensonge ni en avoir de preuve.',
    params: { range: felBonusYards, targets: one, duration: { kind: 'instant' } },
    status: 'manual',
    effect: null,
    targetRules: [],
    needsInput: [
      { id: 'question', text: 'Question posée à la cible.' },
      { id: 'cool-opposed', text: 'Résultat du test de Calme Accessible (+2 DR) de la cible, opposé au DR du prêtre.' },
      { id: 'resist-tier', text: 'Paliers de DR de la cible (+2 mineur, +4 important, +6 mensonge).' }
    ],
    clauses: [
      { id: 'truthful-answer', mode: 'manual', text: 'La cible répond de façon véridique et complète à une question unique, sauf résistance réussie.' },
      { id: 'opposed-cool', mode: 'assisted', text: 'La cible résiste par un test de Calme Accessible (+2 DR) opposé au DR du prêtre; en cas de victoire elle peut refuser de répondre.' },
      { id: 'sl-tiers', mode: 'manual', text: 'Avec +2 DR elle taira une information mineure, +4 DR une information importante, +6 DR elle peut mentir.' },
      { id: 'priest-knowledge', mode: 'manual', text: 'Le prêtre sait que la résistance a réussi, sans connaître le mensonge ni en avoir la preuve.' }
    ],
    sourceDelta: 'Les paliers +2/+4/+6 sont lus comme le DR obtenu par la cible; le texte ne précise pas explicitement s\'il s\'agit de l\'écart du test opposé ou de son DR propre.'
  },
  {
    name: 'Sagesse de la chouette',
    canonicalName: 'Wisdom of the Owl',
    printedPage: 229,
    summary: 'Vous gagnez +20 en Intelligence et pouvez demander au MJ l\'issue la plus probable d\'une de vos décisions immédiates, compte tenu des faits connus. Vos pupilles se dilatent et votre regard devient perçant : vous gagnez les talents Sens aiguisé (Vue) à +1, Menaçant et Vision nocturne.',
    params: { range: self, targets: self, duration: felRounds },
    status: 'assisted',
    effect: null,
    effects: [
      { type: 'characteristic-modifier', characteristic: 'Int', value: 20 },
      { type: 'grant-talent', talents: [{ id: 'talent-acute-sense', name: 'Sens aiguisé', specialization: 'Vue', rank: 1 }, { id: 'talent-menacing', name: 'Menaçant', rank: 1 }, { id: 'talent-night-vision', name: 'Vision nocturne', rank: 1 }] }
    ],
    targetRules: [],
    needsInput: [
      { id: 'decision', text: 'Décision immédiate soumise au MJ pour connaître l\'issue la plus probable (une seule).' }
    ],
    clauses: [
      { id: 'int-plus-20', mode: 'engine', text: 'Intelligence +20 pendant la durée (type characteristic-modifier).' },
      { id: 'likely-outcome', mode: 'manual', text: 'Question au MJ sur l\'issue la plus probable d\'une décision immédiate, avec les faits connus du personnage.' },
      { id: 'acute-sense-sight', mode: 'assisted', text: 'Talent Sens aiguisé (Vue) +1 temporaire.' },
      { id: 'menacing', mode: 'engine', text: 'Talent Menaçant temporaire.' },
      { id: 'night-vision', mode: 'assisted', text: 'Talent Vision nocturne temporaire.' },
      { id: 'end', mode: 'engine', text: 'Fin des effets après Bonus de Sociabilité rounds.' }
    ],
    sourceDelta: 'Seul +20 Int est un effet moteur; les trois talents temporaires et la question au MJ ne le sont pas, donc statut manual. « effects » transmet le modificateur pour le jour où les talents temporaires seront gérés.'
  }
];
