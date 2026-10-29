/**
 * L17 Arcane Marks: eight d10 tables from Winds of Magic, V4 supplement.
 * The source effects are paraphrased in French. Mechanical effects stay
 * assisted because this catalogue does not itself authorize applying them.
 */
const winds = [
  {
    wind: 'Hysh', page: 58, entries: [
      ['Vulnerability to Darkness', 'Dans les zones obscures, Canalisation (Hysh) et Magick subissent −1 DR.'],
      ['Aura of Light', 'Dans un rayon de 20 yards, chaque source lumineuse éclaire +2 yards; les manifestations suivantes renforcent cet effet.'],
      ['Autoluminescent', 'Il émet une lueur douce et voit à 2 yards dans le noir; chaque manifestation ajoute 2 yards. Cette lumière permanente rend ses déplacements presque impossibles à dissimuler, s’atténue pendant son sommeil et ne neutralise pas Vulnerability to Darkness.'],
      ['Stoicism', 'Il doit tenter de résister à la Psychologie même s’il ne le souhaite pas; +2 DR aux tests de Sang-froid contre Psychologie.'],
      ['Enlightened Condescension', 'Son arrogance lui impose −10 à sa Sociabilité initiale.'],
      ['White Eyes', 'Il gagne 3 Aveuglé; après guérison, ses iris sont blancs et il subit −1 DR aux tests de Sociabilité.'],
      ['Bleaching', 'Ses cheveux deviennent blancs sous l’effet du vent.'],
      ['Instant Recall', 'En dépensant Fortune pour relancer un test de rappel (ex. Connaissance), il réussit automatiquement; en test dramatique, un résultat sous +1 DR devient +1 DR.'],
      ['Purging', 'Réussir Endurance Difficile (−2 DR) évite Fièvre pendant 2d10 jours; après, +1 DR pour résister aux maladies.'],
      ['Mark of Hysh', 'Une rune d’Hysh apparaît sur le corps; le texte accorde le talent Suffuse with Hysh.']
    ]
  },
  {
    wind: 'Chamon', page: 70, entries: [
      ['Quicksilver Tears', 'Ses larmes et sa sueur ressemblent au mercure, sans changement pratique notable.'],
      ['Mechanical', 'Sa démarche mécanique fait prendre les animaux pour un objet et les inquiète; Charme des animaux −2 DR.'],
      ['Forge’s Glow', 'Il luit comme du métal chaud sans dégager de chaleur; Discrétion fondée sur la vue −1 DR.'],
      ['Thieves!', 'Il devient paranoïaque à propos du vol et développe un préjugé contre les étrangers.'],
      ['Leaden Tongue', 'Sa voix métallique pénalise de −1 DR les tests impliquant la parole (ex. Ragot, Divertissement/Chant).'],
      ['Feeling A Bit Stiff', 'Le métal s’accumule sur ses articulations; Agilité −5 et Mouvement −1.'],
      ['Shining Orbs', 'Il gagne 3 Aveuglé; après guérison, ses yeux sont dorés et il subit −1 DR aux tests de Sociabilité.'],
      ['Hardness', 'Les dégâts d’armes métalliques ignorent la règle de blessure minimale.'],
      ['Metallic Affinity', 'Il acquiert Numismatique, limitée aux objets métalliques.'],
      ['Mark of Chamon', 'Une rune de Chamon apparaît sur le corps; le texte accorde Suffuse with Chamon.']
    ]
  },
  {
    wind: 'Ghyran', page: 82, entries: [
      ['Rapid Growth', 'Cheveux et ongles poussent à une vitesse alarmante et doivent être taillés chaque jour. Les manifestations suivantes font aussi pousser des plantes; retirées, elles repoussent dans la journée.'],
      ['Barefoot', 'Il ne supporte pas les chaussures; s’il en porte, ses tests d’Agilité subissent −2 DR.'],
      ['Winter’s Nadir', 'Chaque matin d’Ulriczeit et de Vorhexen, Endurance Très Facile (+6 DR) évite Exténué en cas de réussite.'],
      ['Whiff of Ghyran', 'Il dégage une odeur de terre humide, de pousses vertes et d’herbe coupée.'],
      ['Ghyran Face', 'Peau verdâtre et yeux émeraude pénalisent tous les tests fondés sur la Sociabilité (−1 DR).'],
      ['Vulnerability to Fire', 'Les dégâts subis des piles d’État En flammes augmentent de 1.'],
      ['Catalyst', 'Dans 10 yards, incubation et durée des maladies sont doublées; les aliments non conservés se gâtent deux fois plus vite.'],
      ['Aura of Growth', 'Après un séjour prolongé au même endroit, la flore y prospère; +1 DR aux tests de Survie en extérieur pour trouver de la nourriture.'],
      ['Nemophilist', 'Il acquiert le Trait de créature Arboricole.'],
      ['Mark of Ghyran', 'Une rune de Ghyran apparaît sur le corps; le texte accorde Suffuse with Ghyran.']
    ]
  },
  {
    wind: 'Azyr', page: 94, entries: [
      ['Troubling Foresight', 'Sous stress, échouer à un test de Force Mentale de 3 DR ou plus le fait tomber et lui montre un désastre futur.'],
      ['Cerulean Eyes', 'Ses yeux bleu pâle brillent faiblement et inquiètent; tests de Sociabilité −1 DR.'],
      ['Whispery Voice', 'Il ne peut plus crier; en milieu bruyant, l’auditeur doit réussir Perception (Ouïe) Moyenne (+2 DR) pour l’entendre.'],
      ['Insubstantial', 'Il devient un peu transparent, perd 10 % de son poids et −5 en Force.'],
      ['High-minded', 'Distrait et vague en conversation, il gagne +5 Intelligence et −10 Sociabilité.'],
      ['Aura of Tranquility', 'Son aura calme ceux qui l’entourent; Intimidation subit −1 DR en sa présence.'],
      ['Wandering Consciousness', 'Il perd parfois la frontière entre son esprit et le cosmos; Initiative −5.'],
      ['Scentless', 'Il sent l’air frais; les odeurs nauséabondes disparaissent au contact et le pistage olfactif ne peut être plus facile que Difficile (−2 DR).'],
      ['Stargazer', 'Après une nuit sans observer le ciel au moins une heure, tests de Force Mentale et Intelligence deviennent plus difficiles, jusqu’à Très Difficile (−3 DR); retour normal dès reprise.'],
      ['Mark of Azyr', 'Une rune d’Azyr apparaît sur le corps; le texte accorde Suffuse with Azyr.']
    ]
  },
  {
    wind: 'Ulgu', page: 106, entries: [
      ['Vague', 'Hésitant et obscur dans ses propos, il subit −1 DR aux tests de Charme et de Ragot.'],
      ['Mantle of Mist', 'Brumes, brouillard, fumée et vapeurs l’entourent; Discrétion en zone brumeuse +1 DR, en zone très éclairée −1 DR.'],
      ['Vulnerability to Sunlight', 'Au soleil, les tests de Canalisation (Ulgu) et de Magick deviennent d’un degré plus difficiles.'],
      ['Animal Aversion', 'Les chevaux s’énervent, chats fuient et chiens aboient; Soins aux animaux, Dressage, Charme des animaux et Équitation −1 DR.'],
      ['Disturbing Eyes', 'Il gagne ou améliore Vision nocturne; ses yeux sombres pénalisent la Sociabilité de −1 DR.'],
      ['Wilful Shadow', 'Son ombre bouge seule et inquiète; Sociabilité −1 DR et talent Menacing.'],
      ['Cipher', 'Ses traits deviennent génériques et lui confèrent Beneath Notice.'],
      ['Flicker', 'Les flammes vacillent; réussir Force Mentale Difficile (−1 DR) éteint une petite flamme jusqu’à 20 yards (ex. lanterne).'],
      ['Phantasmal', 'En opposant Magick ou Esquive à une attaque, réussir avec doubles accorde Ward (9) et Instable pendant le bonus de Force Mentale en rounds.'],
      ['Mark of Ulgu', 'Une rune d’Ulgu apparaît sur le corps; le texte accorde Suffuse with Ulgu.']
    ]
  },
  {
    wind: 'Shyish', page: 118, entries: [
      ['Skeletal Frame', 'Ses muscles se flétrissent; Force −5.'],
      ['Cataracts', 'Un voile blanc couvre ses yeux sans l’aveugler; regard inquiétant et tests de Sociabilité −1 DR.'],
      ['Cold Dead Hand', 'Son toucher répugne aux non-membres de l’Ordre Améthyste; tests de Sociabilité impliquant contact tactile −1 DR.'],
      ['Curse of Age', 'Toute créature née dans un rayon égal à sa Force Mentale en yards vieillit accélérément et ne vit que les trois quarts de sa durée normale.'],
      ['Voice of the Dead', 'Sa voix devient un murmure rauque impossible à crier; tests d’incantation −1 DR.'],
      ['Grave Stench', 'Son odeur attire les charognards; en nature, si le personnage est à proximité, les échecs remarquables ou fumbles du groupe peuvent attirer des charognards plus gros et agressifs. Sociabilité −1 DR avec ceux qui le sentent.'],
      ['Grim Determination', 'Exténué ne pénalise plus ses tests de Magick et de canalisation.'],
      ['I Hear Dead People', 'En choisissant de se concentrer sur les morts locaux, un Test de Perception Normal (Challenging, +0 DR) permet d’en tirer des indices; un Fumble entraîne une Exposition modérée à la Corruption.'],
      ['Siphon', 'Quand un vivant de Taille Petite ou plus, fatigué par un de ses sorts, meurt, il récupère 1 Blessure sans dépasser son maximum.'],
      ['Mark of Shyish', 'Une rune de Shyish apparaît sur le corps; le texte accorde Suffuse with Shyish.']
    ]
  },
  {
    wind: 'Aqshy', page: 130, entries: [
      ['Fiery Hair', 'Cheveux et sourcils deviennent rouge vif et prennent naturellement une forme de flammes; ils s’embrasent quand il incante ou se met en colère, avec chaleur et lumière réelles, sans le blesser.'],
      ['Whiff of Aqshy', 'Il laisse une odeur de pain brûlé et des filaments de fumée.'],
      ['Red Mist', 'À chaque État Surpris, Sang-froid Moyenne (+2 DR) évite Frénésie en combat ou Animosité (Tout le monde) hors combat.'],
      ['Vulnerable to Cold', 'Tout test effectué sous Exposition au froid devient d’un degré plus difficile.'],
      ['Aquaphobic', 'Sang-froid Moyenne (+2 DR) est requis pour traverser une grande étendue d’eau ou poser le pied sur un bateau.'],
      ['Pyromania', 'Sans contempler un feu une heure par jour, difficulté par défaut des tests de Force Mentale et Intelligence augmente d’un degré, jusqu’à Très Difficile (−3 DR); retour normal dès reprise.'],
      ['Bright Skin', 'Des motifs lumineux sous la peau s’intensifient avec l’émotion; Discrétion fondée sur la vue −1 DR.'],
      ['Feed the Fire', 'À 4 yards d’une pile d’État En flammes (y compris la sienne), les dégâts de cette pile augmentent de 1.'],
      ['Fire Resistant', 'Bonus d’Endurance doublé pour calculer les dégâts du feu, des États En flammes et des souffles.'],
      ['Mark of Aqshy', 'Une rune d’Aqshy apparaît sur le corps; le texte accorde Suffuse with Aqshy.']
    ]
  },
  {
    wind: 'Ghur', page: 142, entries: [
      ['Savage Gaze', 'Il peut opposer Force Mentale aux attaques de mêlée de loups, ours, sangliers et rats; un critique utilise la table des critiques de tête et le nombre de Blessures donne les Brisé infligés à l’animal.'],
      ['Claustrophobia', 'Sang-froid Facile (+4 DR) est requis pour entrer dans un bâtiment ou construction artificielle; échec: 1 Brisé.'],
      ['Restless', 'Il doit bouger, surtout en espace clos; il ne peut perdre Exténué dans les murs d’une grande ville (sauf Middenheim).'],
      ['Dirty', 'La saleté l’attire et il ne parvient jamais à se laver complètement.'],
      ['Hairy', 'Sa pilosité repousse vite; sans vêtement adapté, il ne subit pas de pénalité aux tests d’Endurance contre le Froid, mais paraît disgracieux.'],
      ['Feral', 'Ongles et dents s’allongent; son apparence sauvage impose −1 DR aux tests de Sociabilité.'],
      ['Musk', 'À 5 yards, tests de Sociabilité avec les personnages de statut Or pénalisés de −1 DR.'],
      ['Hunter’s Instincts', '+1 DR avec Survie en extérieur pour chasser ou pêcher.'],
      ['Small Friends', 'Petits animaux inoffensifs apparaissent inopportunément; cela peut survenir quand un membre du groupe fait un fumble de Sociabilité à 20 yards.'],
      ['Mark of Ghur', 'Une rune de Ghur apparaît sur le corps; le texte accorde Suffuse with Ghur.']
    ]
  }
];

const ruleReferences = Object.freeze({
  Hysh: [ 'F-L17-0080', 'F-L17-0081', 'F-L17-0082', 'F-L17-0088', 'F-L17-0083', 'F-L17-0084', null, 'F-L17-0085', 'F-L17-0086', 'F-L17-0087' ],
  Chamon: [ null, 'F-L17-0090', 'F-L17-0091', 'F-L17-0092', 'F-L17-0093', 'F-L17-0094', 'F-L17-0095', 'F-L17-0096', 'F-L17-0097', 'F-L17-0098' ],
  Ghyran: [ null, 'F-L17-0101', 'F-L17-0102', null, 'F-L17-0103', 'F-L17-0104', 'F-L17-0105', 'F-L17-0106', 'F-L17-0107', 'F-L17-0108' ],
  Azyr: [ 'F-L17-0110', 'F-L17-0111', 'F-L17-0112', 'F-L17-0113', 'F-L17-0114', 'F-L17-0115', 'F-L17-0116', 'F-L17-0117', 'F-L17-0118', 'F-L17-0119' ],
  Ulgu: [ 'F-L17-0121', 'F-L17-0122', 'F-L17-0123', 'F-L17-0124', 'F-L17-0125', 'F-L17-0126', 'F-L17-0127', 'F-L17-0128', 'F-L17-0129', 'F-L17-0130' ],
  Shyish: [ 'F-L17-0132', 'F-L17-0133', 'F-L17-0134', 'F-L17-0135', 'F-L17-0136', 'F-L17-0137', 'F-L17-0138', 'F-L17-0139', 'F-L17-0140', 'F-L17-0141' ],
  Aqshy: [ 'F-L17-0145', null, 'F-L17-0153', 'F-L17-0146', 'F-L17-0147', 'F-L17-0148', 'F-L17-0149', 'F-L17-0150', 'F-L17-0151', 'F-L17-0152' ],
  Ghur: [ 'F-L17-0161', 'F-L17-0162', 'F-L17-0155', null, 'F-L17-0156', 'F-L17-0157', 'F-L17-0158', 'F-L17-0159', null, 'F-L17-0160' ]
});

const sourceRecord = (formulation, valeur, page) => Object.freeze({
  formulation,
  value: valeur,
  note: `Règle et valeurs relevées directement dans la table PDF p.${page}; paraphrase originale, sans reprise longue du texte.`
});

const sourceValues = Object.freeze({
  'Hysh-1': sourceRecord('In darkness, Hysh Channeling and Magick-language tests are hindered.', '−1 SL to each named test.', 58),
  'Hysh-2': sourceRecord('Nearby light sources shine farther; later manifestations strengthen the effect.', '20-yard radius; +2 yards of light range; repeated manifestations increase it.', 58),
  'Hysh-3': sourceRecord('A soft permanent glow gives night vision; each manifestation extends it. Concealment is extremely difficult; sleep dims it; it does not cancel the darkness weakness.', '2 yards of sight in darkness; +2 yards each manifestation; cannot switch off; nearly impossible to conceal movement.', 58),
  'Hysh-4': sourceRecord('The bearer must resist Psychology when able, even against their own interest; their composure helps against it.', 'Mandatory resistance when possible; +2 SL to Cool against Psychology.', 58),
  'Hysh-5': sourceRecord('The bearer appears arrogant and pretentious because of their perceived knowledge.', '−10 initial Fellowship characteristic.', 58),
  'Hysh-6': sourceRecord('A burst of Hysh blinds the bearer; after recovery their eyes remain white and social interaction is harder.', '3 Blinded Conditions; then −1 SL to Fellowship-based Tests.', 58),
  'Hysh-7': sourceRecord('The wind removes the pigment from the bearer’s hair.', 'Hair becomes completely white; no numeric value.', 58),
  'Hysh-8': sourceRecord('A Fortune reroll to recall information becomes an automatic success; dramatic tests have a success floor.', 'Recall reroll succeeds automatically; dramatic-test minimum +1 SL.', 58),
  'Hysh-9': sourceRecord('Purifying light causes illness unless endured; afterward the bearer resists disease better.', 'Hard (−20) Endurance; Fever Symptom 2d10 days; afterward +1 SL to resist disease.', 58),
  'Hysh-10': sourceRecord('A rune appears on the body and grants the Hysh wind-suffusion talent.', 'Mark of Hysh; gain Suffuse with Hysh.', 58),

  'Chamon-1': sourceRecord('Tears and sweat resemble mercury but otherwise remain unchanged.', 'Mercury appearance; no mechanical numeric value.', 70),
  'Chamon-2': sourceRecord('Animals mistake the stiff, robotic bearer for an object and become wary.', '−2 SL to Charm Animal.', 70),
  'Chamon-3': sourceRecord('The bearer glows like hot metal without heat and is easier to spot by sight.', '−1 SL to sight-based Stealth.', 70),
  'Chamon-4': sourceRecord('The bearer becomes paranoid that everyone intends to steal their money.', 'Gain Prejudice (Strangers).', 70),
  'Chamon-5': sourceRecord('A harsh metallic voice makes speech-related tasks harder.', '−1 SL to tests involving speech.', 70),
  'Chamon-6': sourceRecord('Metal gathers on the joints and impedes movement.', '−5 Agility; −1 Movement.', 70),
  'Chamon-7': sourceRecord('A painful flash blinds the bearer; after recovery their eyes are golden and social tests suffer.', '3 Blinded Conditions; then −1 SL to Fellowship-based Tests.', 70),
  'Chamon-8': sourceRecord('Metal weapons no longer benefit from the minimum-wound rule against the bearer.', 'Damage from metal weapons: 1-Wound minimum rule does not apply.', 70),
  'Chamon-9': sourceRecord('The bearer gains a coin-lore talent usable only for metal objects.', 'Gain Numismatics, restricted to metal objects.', 70),
  'Chamon-10': sourceRecord('A rune appears on the body and grants the Chamon wind-suffusion talent.', 'Mark of Chamon; gain Suffuse with Chamon.', 70),

  'Ghyran-1': sourceRecord('Hair and nails grow alarmingly fast; later manifestations bring plant growth that regrows after removal.', 'Trim each day; further manifestations add plants; removed growth returns within one day.', 82),
  'Ghyran-2': sourceRecord('The bearer cannot abide shoes; wearing them hampers agility.', '−2 SL to Agility-based Tests while wearing footwear.', 82),
  'Ghyran-3': sourceRecord('Cold-season mornings require an endurance check to avoid fatigue.', 'Very Easy (+60) Endurance each morning in Ulriczeit and Vorhexen; failure gives Fatigued.', 82),
  'Ghyran-4': sourceRecord('The bearer smells of damp earth, fresh shoots, and cut grass.', 'Distinctive natural odor; no numeric value.', 82),
  'Ghyran-5': sourceRecord('Green skin and emerald eyes make the bearer less persuasive socially.', '−1 SL to all Fellowship-based Tests.', 82),
  'Ghyran-6': sourceRecord('Fire harms the bearer more severely.', '+1 Damage from Ablaze Conditions.', 82),
  'Ghyran-7': sourceRecord('The bearer accelerates destructive and living processes around them.', 'Within 10 yards, disease incubation and duration double; unpreserved food spoils twice as fast.', 82),
  'Ghyran-8': sourceRecord('Life flourishes around the bearer after they stay in one place; foraging is easier.', '+1 SL to Outdoor Survival Tests to find food.', 82),
  'Ghyran-9': sourceRecord('The bearer gains the creature trait associated with living in trees.', 'Gain Arboreal Creature Trait.', 82),
  'Ghyran-10': sourceRecord('A rune appears on the body and grants the Ghyran wind-suffusion talent.', 'Mark of Ghyran; gain Suffuse with Ghyran.', 82),

  'Azyr-1': sourceRecord('Under stress, a severe failure of will makes the bearer fall and see disturbing future disasters.', 'Stress trigger; failed Willpower Test by 3 SL or more; fall Prone.', 94),
  'Azyr-2': sourceRecord('Pale blue luminous eyes unsettle others.', '−1 SL to Fellowship-based Tests.', 94),
  'Azyr-3': sourceRecord('The bearer cannot shout; noise makes their voice difficult to hear.', 'Average (+20) Perception (Hearing) Test in noisy surroundings.', 94),
  'Azyr-4': sourceRecord('The body becomes faintly transparent and lighter, but weaker.', '−10% weight; −5 Strength.', 94),
  'Azyr-5': sourceRecord('The bearer seems distracted and vague in conversation.', '+5 Intelligence; −10 Fellowship.', 94),
  'Azyr-6': sourceRecord('A peaceful aura calms those nearby and weakens intimidation.', '−1 SL to Intimidate Tests in the bearer’s presence.', 94),
  'Azyr-7': sourceRecord('The bearer sometimes loses their sense of self in the cosmos.', '−5 Initiative.', 94),
  'Azyr-8': sourceRecord('The bearer smells of fresh air; foul odors fade on contact and scent-tracking is constrained.', 'Tracking by smell cannot be easier than Hard (−20).', 94),
  'Azyr-9': sourceRecord('Missing nightly stargazing worsens mental tests until the bearer resumes observation.', 'At least 1 hour per night; one difficulty step worse, maximum Very Hard (−30).', 94),
  'Azyr-10': sourceRecord('A rune appears on the body and grants the Azyr wind-suffusion talent.', 'Mark of Azyr; gain Suffuse with Azyr.', 94),

  'Ulgu-1': sourceRecord('Hesitation and obscurity make the bearer less convincing in conversation.', '−1 SL to Charm and Gossip Tests.', 106),
  'Ulgu-2': sourceRecord('Mist and vapor gather around the bearer; fog helps stealth while bright light hinders it.', '+1 SL Stealth in fog/mist/haze; −1 SL in brightly lit areas.', 106),
  'Ulgu-3': sourceRecord('Sunlight makes handling Ulgu and Magick more difficult.', 'One difficulty step harder for Ulgu Channeling and Magick-language tests in sunshine.', 106),
  'Ulgu-4': sourceRecord('Animals sense the bearer’s aura and react fearfully.', '−1 SL to Animal Care, Animal Training, Charm Animal, and Ride.', 106),
  'Ulgu-5': sourceRecord('Dark swirling eyes confer night vision but hinder social interaction.', 'Gain or advance Night Vision; −1 SL Fellowship-based Tests.', 106),
  'Ulgu-6': sourceRecord('The bearer’s independently moving shadow unsettles people.', '−1 SL to Fellowship-based Tests; gain Menacing.', 106),
  'Ulgu-7': sourceRecord('The bearer becomes less distinctive and harder to recognize.', 'Gain Beneath Notice.', 106),
  'Ulgu-8': sourceRecord('The bearer can extinguish a small distant flame with an effort of will.', 'Difficult (−10) Willpower Test; small flame within 20 yards.', 106),
  'Ulgu-9': sourceRecord('A successful defense with doubles can make the bearer insubstantial and unstable.', 'Oppose with Magick or Dodge; successful doubles; Ward (9) and Unstable for Willpower Bonus Rounds.', 106),
  'Ulgu-10': sourceRecord('A rune appears on the body and grants the Ulgu wind-suffusion talent.', 'Mark of Ulgu; gain Suffuse with Ulgu.', 106),

  'Shyish-1': sourceRecord('The bearer’s muscles wither.', '−5 Strength.', 118),
  'Shyish-2': sourceRecord('A white film covers the eyes; vision remains but the stare unsettles others.', '−1 SL Fellowship-based Tests.', 118),
  'Shyish-3': sourceRecord('The bearer’s touch repels those outside the Amethyst Order.', '−1 SL Fellowship Tests involving tactile contact with non-members.', 118),
  'Shyish-4': sourceRecord('Creatures born near the bearer age faster and live for a shortened span.', 'Within Willpower yards; lifespan no more than three quarters of the normal lifespan.', 118),
  'Shyish-5': sourceRecord('The bearer speaks in a hoarse whisper and finds speech difficult.', 'Impossible to shout; −1 SL Casting Tests.', 118),
  'Shyish-6': sourceRecord('The grave odor attracts carrion birds and may draw larger, more aggressive scavengers.', 'Wilderness Impressive Failures or Fumbles may attract larger, more aggressive scavengers; −1 SL Fellowship Tests with those who smell the bearer.', 118),
  'Shyish-7': sourceRecord('Fatigue no longer impedes the bearer’s magical language and channeling.', 'Fatigued Conditions do not penalize Language (Magick) or Channeling Tests.', 118),
  'Shyish-8': sourceRecord('The bearer can focus on local dead for useful insight; a botched attempt exposes them to corruption.', 'Challenging (+0) Perception; Fumble causes Moderate Exposure to Corruption.', 118),
  'Shyish-9': sourceRecord('A living creature weakened by one of the bearer’s spells can sustain the bearer on death.', 'Living target Size Small or larger, Fatigued by bearer’s spell; gain 1 Wound up to maximum.', 118),
  'Shyish-10': sourceRecord('A rune appears on the body and grants the Shyish wind-suffusion talent.', 'Mark of Shyish; gain Suffuse with Shyish.', 118),

  'Aqshy-1': sourceRecord('Hair and eyebrows become fiery red and flame-shaped; fire erupts when casting or angered without harming the bearer.', 'Hair and eyebrows; real fire, heat, and light; casting or anger trigger; bearer unaffected.', 130),
  'Aqshy-2': sourceRecord('The bearer leaves the scent of burnt toast and trailing smoke.', 'Burnt-toast odor and smoke strands; no numeric value.', 130),
  'Aqshy-3': sourceRecord('Surprise can provoke frenzy in combat or hostility outside combat unless the bearer keeps composure.', 'Average (+20) Cool after each Surprised Condition; failure: Frenzy in combat or Animosity (Everyone) otherwise.', 130),
  'Aqshy-4': sourceRecord('Cold exposure makes tests more difficult for the bearer.', 'Tests while suffering Cold Exposure become one step harder.', 130),
  'Aqshy-5': sourceRecord('The bearer fears substantial water crossings and boats unless they keep composure.', 'Average (+20) Cool to cross significant water or step onto a boat.', 130),
  'Aqshy-6': sourceRecord('Lack of daily fire-gazing worsens mental tests until the bearer sees fire again.', 'Watch a blaze for 1 hour each day; one difficulty step worse, maximum Very Hard (−30).', 130),
  'Aqshy-7': sourceRecord('Tattoo-like symbols glow beneath the skin, more strongly with emotion.', '−1 SL to sight-based Stealth.', 130),
  'Aqshy-8': sourceRecord('A nearby blaze becomes more damaging, including one carried by the bearer.', 'Within 4 yards of an Ablaze Condition stack; +1 Damage.', 130),
  'Aqshy-9': sourceRecord('The bearer withstands fire by drawing on their physical resilience.', 'Double Toughness Bonus for fire damage, including Ablaze and breath attacks.', 130),
  'Aqshy-10': sourceRecord('A rune appears on the body and grants the Aqshy wind-suffusion talent.', 'Mark of Aqshy; gain Suffuse with Aqshy.', 130),

  'Ghur-1': sourceRecord('The bearer can meet melee attacks from certain beasts with willpower; a critical injures the animal’s head.', 'Melee attacks by wolves, bears, boars, or rats; Head Critical Wounds Table; Wounds equal Broken Conditions inflicted.', 142),
  'Ghur-2': sourceRecord('Entering buildings or artificial structures requires an effort of composure.', 'Easy (+40) Cool Test; failure gives 1 Broken Condition.', 142),
  'Ghur-3': sourceRecord('The bearer is restless, especially indoors, and cannot recover fatigue in most large cities.', 'Cannot lose Fatigued within large-city walls, except Middenheim.', 142),
  'Ghur-4': sourceRecord('Dirt gathers on the bearer and they cannot become fully clean.', 'Persistent dirt; no numeric value.', 142),
  'Ghur-5': sourceRecord('Thick body hair protects the bearer from cold when proper clothes are absent.', 'No penalty to Endurance Tests to withstand Cold Exposure for lack of proper clothing.', 142),
  'Ghur-6': sourceRecord('Lengthened nails and pointed teeth make the bearer look unsettlingly wild.', '−1 SL to Fellowship-based Tests.', 142),
  'Ghur-7': sourceRecord('The bearer’s musk makes high-status conversations more difficult nearby.', '−1 SL Fellowship Tests with Gold Status Characters within 5 yards.', 142),
  'Ghur-8': sourceRecord('The bearer’s hunting instincts aid finding game and fish.', '+1 SL Outdoor Survival for hunting and fishing.', 142),
  'Ghur-9': sourceRecord('Small harmless animals gather and interrupt at inconvenient moments.', 'May occur when a party member Fumbles a Fellowship-based Test within 20 yards.', 142),
  'Ghur-10': sourceRecord('A rune appears on the body and grants the Ghur wind-suffusion talent.', 'Mark of Ghur; gain Suffuse with Ghur.', 142)
});

const source = (wind, page, row) => Object.freeze({
  livre: 'L17 — Winds of Magic', pageImprimee: page, pagePdf: page,
  referenceF2: ruleReferences[wind]?.[row - 1] ?? null,
  referenceFamilleF2: 'F-L17-0078',
  noteReference: ruleReferences[wind]?.[row - 1]
    ? 'Référence individuelle issue de l’audit; F-L17-0078 est gardé en contexte comme famille, mais renvoie aussi à Difficulté de Hysh.'
    : 'Aucune référence individuelle dans l’audit; F-L17-0078 est gardé comme contexte de famille, mais renvoie aussi à Difficulté de Hysh.',
  emplacement: `Arcane Marks of ${wind}, résultat d10 ${row}`
});

const v5Decision = (wind, row, name, summary) => {
  const sourceRule = sourceValues[`${wind}-${row}`] ?? null;
  const skillChange = summary.includes(' DR');
  const notes = [];
  if (skillChange) notes.push('Les modificateurs de Test exprimés en SL dans la source V4 deviennent le même nombre de DR V5.');
  if (/\+\d+ DR|−\d+ DR/u.test(summary)) notes.push('Proposition de conversion des modificateurs de Test en DR V5; le MJ confirme avant application.');
  if (!notes.length) notes.push('Aucun modificateur de Test à convertir dans cette entrée; caractéristiques, durées, portées et effets descriptifs restent tels qu’imprimés.');
  if (/−\d+ %|−\d+ à|Force −|Intelligence et −|Sociabilité initiale|Sociabilité\./u.test(summary)) {
    notes.push('Les variations de caractéristiques et de poids ne sont pas des modificateurs de Test: leurs valeurs imprimées restent inchangées.');
  }
  return Object.freeze({
    editionSource: 'V4',
    formulationSource: sourceRule?.formulation ?? null,
    valeurSource: sourceRule?.value ?? null,
    noteValeurSource: sourceRule?.note ?? 'Valeur source non isolée dans cette ligne; consulter la page PDF indiquée. Aucune valeur V4 n’est reconstruite depuis le résumé V5.',
    captureSourceStatut: sourceRule ? 'capturée-depuis-pdf' : 'incomplet-à-relever-sur-pdf',
    valeurV5: summary,
    justification: notes.join(' '),
    statut: 'assiste'
  });
};

export const V5_L17_ARCANE_MARKS = Object.freeze(winds.map(({ wind, page, entries }) => Object.freeze({
  id: `l17-marks-${wind.toLowerCase()}`,
  famille: `Marques du Vent ${wind}`,
  editionSource: 'V4',
  source: Object.freeze({ livre: 'L17 — Winds of Magic', pageImprimee: page, pagePdf: page, referenceFamilleF2: 'F-L17-0078', noteReference: 'La référence F-L17-0078 est une famille ambiguë également employée pour Difficulté de Hysh; chaque ligne garde sa référence individuelle lorsqu’elle existe.' }),
  selection: Object.freeze({ type: 'd10', faces: 10 }),
  entrees: Object.freeze(entries.map(([name, resume], index) => {
    const row = index + 1;
    return Object.freeze({
      id: `l17-mark-${wind.toLowerCase()}-${String(row).padStart(2, '0')}`,
      selection: Object.freeze({ min: row, max: row }),
      nom: name,
      resume,
      source: source(wind, page, row),
      conversion: v5Decision(wind, row, name, resume),
      effets: Object.freeze([]),
      statutMecanique: 'assiste',
      questionsMJ: Object.freeze([`Confirmer l’application V5 de « ${name} » avec ses déclencheurs, limites et valeurs paraphrasés : ${resume}`]),
      verification: Object.freeze({ controleur: 'review_l17_final', date: '2026-10-28', pagePdf: page, statut: 'relue-indépendamment', observations: 'Ligne contrôlée dans la table complète; corrections ciblées finales comprises.' })
    });
  }))
}))) ;

export const V5_L17_ARCANE_MARKS_COUNT = V5_L17_ARCANE_MARKS.reduce((sum, table) => sum + table.entrees.length, 0);
export const V5_L17_SOURCE_INCOMPLETE_IDS = Object.freeze(V5_L17_ARCANE_MARKS.flatMap(table => table.entrees
  .filter(entry => entry.conversion.captureSourceStatut !== 'capturée-depuis-pdf')
  .map(entry => entry.id)));
