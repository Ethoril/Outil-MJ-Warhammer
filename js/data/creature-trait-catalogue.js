// Fichier généré par node tools/build-creature-trait-catalogue.mjs : ne pas modifier à la main, régénérer par node tools/build-creature-trait-catalogue.mjs.
// Catalogue des Traits de créature (chantier des Traits optionnels) : un Trait par nom anglais du bestiaire, plus Stubborn (L23 p. 22).
// `param` : none | rating | text | size | trained | hatred (D12). `nameFrSource` : livre et page du nom français, ou « proposition ». Aucun import.
export const CREATURE_TRAIT_CATALOGUE = Object.freeze([
  {
    "name": "Afraid",
    "nameFr": "Effrayé",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-001",
    "summaryFr": "Peur de la cible ; Test étendu, interdiction de gagner Élan et avantage de mêlée de la source jusqu’au seuil.",
    "book": "L06",
    "page": 356,
    "param": "text"
  },
  {
    "name": "Amphibious",
    "nameFr": "Amphibie",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-002",
    "summaryFr": "Compétence Natation, +1 DR à ses Tests et déplacement aquatique au plein Mouvement.",
    "book": "L06",
    "page": 356,
    "param": "none"
  },
  {
    "name": "Analgesic Saliva",
    "nameFr": "Salive analgésique",
    "nameFrSource": "proposition",
    "ref": "E0-T-274",
    "summaryFr": "La morsure ne fait pas mal : la créature s’attache sans réveiller une victime endormie ; l’effet cesse 10 − BE Rounds après qu’elle se détache.",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Animal Telepathy",
    "nameFr": "Télépathie animale",
    "nameFrSource": "proposition",
    "ref": "E0-T-169",
    "summaryFr": "Communication silencieuse bidirectionnelle avec le lanceur lié, à quatre yards, limitée par l’Intelligence de l’animal.",
    "book": "L02",
    "page": 82,
    "param": "none"
  },
  {
    "name": "Animosity",
    "nameFr": "Animosité",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-003",
    "summaryFr": "Psychologie pour se retenir, sinon opposition sociale ou physique à la cible et +1 DR de Sociabilité contre elle.",
    "book": "L06",
    "page": 356,
    "param": "text"
  },
  {
    "name": "Anticoagulant Saliva",
    "nameFr": "Salive anticoagulante",
    "nameFrSource": "proposition",
    "ref": "E0-T-275",
    "summaryFr": "La victime d’une morsure gagne un état Hémorragique.",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Aquatic",
    "nameFr": "Aquatique",
    "nameFrSource": "proposition",
    "ref": "E0-T-210",
    "summaryFr": "Étiquette du Brainfluke ; les passages lus ne précisent pas son coefficient de déplacement ni ses limites respiratoires.",
    "book": "L07",
    "page": 168,
    "param": "none"
  },
  {
    "name": "Arboreal",
    "nameFr": "Arboricole",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-069",
    "summaryFr": "Ajoute le Bonus d’Agilité aux DR d’Escalade et de Discrétion.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Armour",
    "nameFr": "Armure",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-070",
    "summaryFr": "PA à toutes localisations, valeur entre parenthèses incluant BE ; ne pas importer deux fois l’Endurance.",
    "book": "L11",
    "page": 135,
    "param": "rating"
  },
  {
    "name": "Attach and Feed",
    "nameFr": "S’attacher et se nourrir",
    "nameFrSource": "proposition",
    "ref": "E0-T-277",
    "summaryFr": "Une morsure réussie attache la créature : perte automatique d’une Blessure par Round ; à zéro la victime devient Inconsciente. Elle ne lâche qu’une fois repue (son BE en Blessures) ; on l’arrache par Force opposée en infligeant une Blessure ; ce qu’elle craint la fait lâcher.",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Attuned to Magic",
    "nameFr": "Accordé à la magie",
    "nameFrSource": "proposition",
    "ref": "E0-T-229",
    "summaryFr": "Table des Vents modifie Protection et DR du phénix, de faible à forte saturation.",
    "book": "L14",
    "page": 83,
    "param": "none"
  },
  {
    "name": "Bale Eye",
    "nameFr": "Œil funeste",
    "nameFrSource": "proposition",
    "ref": "E0-T-248",
    "summaryFr": "Seconde vue, +2 DR aux observations aidées, +1 DR lancement/canalisation ; Perception peut arrêter un lancement avec incident en annulant les deux.",
    "book": "L17",
    "page": 217,
    "param": "none"
  },
  {
    "name": "Belligerent",
    "nameFr": "Belliqueux",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-004",
    "summaryFr": "Immunité à Peur tant que la créature possède de l’Élan ; variantes des suppléments distinctes.",
    "book": "L06",
    "page": 356,
    "param": "none"
  },
  {
    "name": "Bestial",
    "nameFr": "Bestial",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-005",
    "summaryFr": "Pas de langage rationnel, défense par Esquive ; feu blessant donne Brisé ; sous moitié des Blessures fuite ou Frénésie selon protection/territoire.",
    "book": "L06",
    "page": 356,
    "param": "none"
  },
  {
    "name": "Big",
    "nameFr": "Grand",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-071",
    "summaryFr": "+10 Force/Endurance, −5 Agilité.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Bite",
    "nameFr": "Morsure",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-006",
    "summaryFr": "Perdre Élan pour une attaque gratuite ; dégâts du profil incluent déjà le Bonus de Force.",
    "book": "L06",
    "page": 356,
    "param": "rating"
  },
  {
    "name": "Blessed",
    "nameFr": "Béni",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-007",
    "summaryFr": "Accès aux Bénédictions de la divinité et Prière à Sociabilité+10 ou valeur MJ supérieure ; ne remplace pas les prérequis explicites de fiche.",
    "book": "L06",
    "page": 356,
    "param": "text"
  },
  {
    "name": "Bounce",
    "nameFr": "Bond",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-008",
    "summaryFr": "Double Mouvement pour Charge, Saut ou Sprint et franchit terrain/créatures intermédiaires.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Breath",
    "nameFr": "Souffle",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-009",
    "summaryFr": "Attaque gratuite de zone portée 20+BE ; CT ou CT30 si absente, opposition Esquive par cible, immunité à son souffle et attaque magique.",
    "book": "L06",
    "page": 357,
    "param": "rating"
  },
  {
    "name": "Brute",
    "nameFr": "Brutal",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-072",
    "summaryFr": "−1 Mouvement, −10 Agilité, +10 Force/Endurance.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Burrow",
    "nameFr": "Fouissage",
    "nameFrSource": "proposition",
    "ref": "E0-T-105",
    "summaryFr": "Déplacement souterrain à l’indice, franchissement des obstacles, charge possible ; doit continuer si commence enfoui, portée de tir modifiée.",
    "book": "L11",
    "page": 23,
    "param": "rating"
  },
  {
    "name": "Capricious",
    "nameFr": "Capricieux",
    "nameFrSource": "proposition",
    "ref": "E0-T-281",
    "summaryFr": "Humeur changeante : tout Test de Sociabilité mené avec elle se modifie selon un d10 (1 : −2 DR ; 2-3 : −1 ; 4-7 : aucun ; 8-9 : +1 ; 10 : +2).",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Chameleon",
    "nameFr": "Caméléon",
    "nameFrSource": "proposition",
    "ref": "E0-T-207",
    "summaryFr": "Perception −4 DR pour le voir, −2 en mouvement ; tirs contre lui −2 DR.",
    "book": "L07",
    "page": 151,
    "param": "none"
  },
  {
    "name": "Champion",
    "nameFr": "Champion",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-010",
    "summaryFr": "Opposition de mêlée défensive gagnée : dégâts comme attaquant.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Chill Grasp",
    "nameFr": "Étreinte glaciale",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-011",
    "summaryFr": "Action en perdant Élan ; CC opposée à Esquive/mêlée, puis 1d10+DR Blessures directes, magique.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Clever",
    "nameFr": "Intelligent",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-073",
    "summaryFr": "+20 Intelligence et +10 Initiative.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Cold-blooded",
    "nameFr": "À Sang-froid",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-012",
    "summaryFr": "Avantage à Calme ; première fin normale de Surpris ignorée.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Companion Trait",
    "nameFr": "Trait de compagnon",
    "nameFrSource": "proposition",
    "ref": "E0-T-162",
    "summaryFr": "À quatre yards du lanceur lié, donne deux talents selon espèce, ou +1 DR s’ils sont déjà connus ; effets comportementaux et corruption, cumul de familiers autorisé.",
    "book": "L02",
    "page": 81,
    "param": "text"
  },
  {
    "name": "Constrictor",
    "nameFr": "Constricteur",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-013",
    "summaryFr": "Toute touche donne Enchevêtré puis permet une empoignade.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Construct",
    "nameFr": "Fabriqué",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-014",
    "summaryFr": "Pas de caractéristiques mentales ni de Tests associés ; Endurance remplace Volonté si nécessaire, Force pour les Blessures ; attaques magiques et conduite dépendant du contrôle.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Corrosive Blood",
    "nameFr": "Sang corrosif",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-015",
    "summaryFr": "Après blessure reçue, un seul d10 de dégâts partagé entre tous les engagés.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Corruption",
    "nameFr": "Corruption",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-016",
    "summaryFr": "Influence corruptrice de la force précisée ; Tests d’exposition selon ce classement.",
    "book": "L06",
    "page": 357,
    "param": "rating"
  },
  {
    "name": "Coven Sorcerer",
    "nameFr": "Sorcier de couvent",
    "nameFrSource": "proposition",
    "ref": "E0-T-225",
    "summaryFr": "Doit recevoir un gabarit de sorcière, Équitation accrue et accès à plusieurs listes de magie.",
    "book": "L09",
    "page": 52,
    "param": "none"
  },
  {
    "name": "Creature Weapons",
    "nameFr": "Armes naturelles",
    "nameFrSource": "proposition",
    "ref": "E0-T-288",
    "summaryFr": "Attaques naturelles V4 écrites « Claws +6 », « Beak +8 », « Slam +n », « Tongue Attack +3 » : dégâts imprimés, déjà complets, à traiter comme les autres armes de créature.",
    "book": "L22",
    "page": 73,
    "param": "rating"
  },
  {
    "name": "Creeping",
    "nameFr": "Rampant",
    "nameFrSource": "proposition",
    "ref": "E0-T-278",
    "summaryFr": "Implacable mais lente : la créature ne peut jamais Courir.",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Cunning",
    "nameFr": "Rusé",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-074",
    "summaryFr": "+10 Sociabilité, Intelligence et Initiative.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Daemonic",
    "nameFr": "Démoniaque",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-018",
    "summaryFr": "Attaques magiques, besoins vitaux absents ; d10 contre seuil annule un coup non magique même critique ; disparaît à zéro Blessure.",
    "book": "L06",
    "page": 357,
    "param": "rating"
  },
  {
    "name": "Dark Vision",
    "nameFr": "Infravision",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-017",
    "summaryFr": "Voit l’obscurité comme en plein jour.",
    "book": "L06",
    "page": 357,
    "param": "none"
  },
  {
    "name": "Die Hard",
    "nameFr": "Increvable",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-075",
    "summaryFr": "À la mort si corps intact, Endurance étendue de six DR à chaque début de Round pendant BE Rounds ; réussite revient avec une Blessure.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Disease",
    "nameFr": "Maladie",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-019",
    "summaryFr": "Porte la maladie indiquée ; contraction selon exposition, atteinte propre décidée MJ.",
    "book": "L06",
    "page": 358,
    "param": "text"
  },
  {
    "name": "Disruption",
    "nameFr": "Perturbation",
    "nameFrSource": "proposition",
    "ref": "E0-T-147",
    "summaryFr": "Instable traite son Avantage comme diminué de deux contre ses adversaires, sans perte réelle d’Avantage.",
    "book": "L11",
    "page": 82,
    "param": "none"
  },
  {
    "name": "Distracting",
    "nameFr": "Perturbant",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-020",
    "summaryFr": "Vivants dans BE yards : −2 DR généraux, une seule fois quelle que soit la multiplicité des sources.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Easily Confused",
    "nameFr": "Facilement désorienté",
    "nameFrSource": "proposition",
    "ref": "E0-T-194",
    "summaryFr": "Changement de situation : Intelligence +40 ou Sonné ; nouveau Test à chaque début de Tour pour récupérer, Résolution possible.",
    "book": "L02",
    "page": 91,
    "param": "none"
  },
  {
    "name": "Elite",
    "nameFr": "Élite",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-076",
    "summaryFr": "+20 CC, CT et Volonté.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Engulf",
    "nameFr": "Engloutissement",
    "nameFrSource": "proposition",
    "ref": "E0-T-119",
    "summaryFr": "Une cible pas plus grande peut être engloutie à la touche, entravée selon BF ; BF Blessures directes par Round. Une seule victime, blessée aussi par les coups portés à l’amibe ; mort ou immobilité déclenche la retraite pour digestion.",
    "book": "L11",
    "page": 45,
    "param": "none"
  },
  {
    "name": "Ethereal",
    "nameFr": "Éthéré",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-021",
    "summaryFr": "Traverse les solides ; seules attaques magiques peuvent le blesser, ses attaques sont magiques.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Fast",
    "nameFr": "Rapide",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-077",
    "summaryFr": "+1 Mouvement et +10 Agilité.",
    "book": "L11",
    "page": 135,
    "param": "none"
  },
  {
    "name": "Fear",
    "nameFr": "Peur",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-022",
    "summaryFr": "Peur surnaturelle, indice un si omis ; texte du Trait demande de dépasser l’indice, contrairement au chapitre Psychologie.",
    "book": "L06",
    "page": 358,
    "param": "rating"
  },
  {
    "name": "Fearless",
    "nameFr": "Sans peur",
    "nameFrSource": "proposition",
    "ref": "E0-T-227",
    "summaryFr": "Le profil liste Sans peur sans spécialisation ; ne pas inventer son groupe d’immunité.",
    "book": "L10",
    "page": 68,
    "param": "text"
  },
  {
    "name": "Flammable",
    "nameFr": "Inflammable",
    "nameFrSource": "proposition",
    "ref": "E0-T-208",
    "summaryFr": "−2 DR aux seuls Tests pour éviter Enflammé (pas au retrait par Athlétisme) ; Blessures d’Enflammé doublées.",
    "book": "L07",
    "page": 165,
    "param": "none"
  },
  {
    "name": "Fly",
    "nameFr": "Vol",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-023",
    "summaryFr": "Mouvement aérien à l’indice, peut charger, doit voler si commence en vol ; portée de tir décalée, tirs propres à −2 DR.",
    "book": "L06",
    "page": 358,
    "param": "rating"
  },
  {
    "name": "Formless Horror",
    "nameFr": "Horreur informe",
    "nameFrSource": "proposition",
    "ref": "E0-T-251",
    "summaryFr": "Propre au Changelin : une fois par Round, copie exacte d’une créature typique ou d’un individu étudié BI heures ; il gagne ses Traits et peut utiliser ses caractéristiques à la place des siennes (compétences de l’individu, pas ses souvenirs). Même texte en L21 p.56.",
    "book": "L18",
    "page": 85,
    "param": "none"
  },
  {
    "name": "Freezing Aura",
    "nameFr": "Aura glaciale",
    "nameFrSource": "proposition",
    "ref": "E0-T-234",
    "summaryFr": "Engagé ou contact proche : Test d’exposition au froid à chaque Tour.",
    "book": "L14",
    "page": 84,
    "param": "none"
  },
  {
    "name": "Frenzy",
    "nameFr": "Frénésie",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-024",
    "summaryFr": "Volonté pour entrer ; immunité Psychologie, attaque gratuite par Round et +1 dégât ; conduite imposée ; fin sur absence d’ennemi, Sonné/Inconscient puis Exténué.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Fury",
    "nameFr": "Rage",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-078",
    "summaryFr": "Un Avantage pour Haine des adversaires proches ; trois pour Frénésie puis perte totale d’Avantage.",
    "book": "L11",
    "page": 136,
    "param": "none"
  },
  {
    "name": "Ghostly Howl",
    "nameFr": "Hurlement fantomatique",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-025",
    "summaryFr": "Une fois par Tour, perdre Élan pour hurler ; vivants auditeurs dans Force yards : trois Assourdi, d10 Blessures directes et Calme +2 DR ou Brisé, critiques à la tête.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Grim",
    "nameFr": "Féroce",
    "nameFrSource": "proposition",
    "ref": "E0-T-026",
    "summaryFr": "En fin de Tour sans Élan, la créature en gagne. V5 v3 : elle n’a pas à perdre son Élan pour ses attaques gratuites, mais doit en avoir.",
    "book": "L06",
    "page": 358,
    "param": "rating"
  },
  {
    "name": "Hallucinogen",
    "nameFr": "Hallucinogène",
    "nameFrSource": "proposition",
    "ref": "E0-T-280",
    "summaryFr": "Musc hallucinogène : à deux yards (plus sous le vent), Test de Volonté Facile (+20) sinon un Sonné par niveau d’échec.",
    "book": "L26",
    "page": 90,
    "param": "none"
  },
  {
    "name": "Hardy",
    "nameFr": "Endurant",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-079",
    "summaryFr": "Blessures accrues de BE avant multiplicateur de Taille.",
    "book": "L11",
    "page": 136,
    "param": "none"
  },
  {
    "name": "Hatred",
    "nameFr": "Haine",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-027",
    "summaryFr": "Psychologie sinon attaque prioritaire du groupe, +1 DR mêlée/tir et immunité à son Intimidation/Peur, pas Terreur.",
    "book": "L06",
    "page": 358,
    "param": "hatred"
  },
  {
    "name": "Horns",
    "nameFr": "Cornes",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-028",
    "summaryFr": "Charge permet une attaque gratuite des cornes à BF+4.",
    "book": "L06",
    "page": 358,
    "param": "rating"
  },
  {
    "name": "Hungry",
    "nameFr": "Affamé",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-029",
    "summaryFr": "Après mort/incapacité d’un vivant ou rencontre de cadavre frais : Calme +2 DR ou repas consommant prochain Mouvement et Action.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Immune to Psychology",
    "nameFr": "Immunité Psychologique",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-030",
    "summaryFr": "Ignore les règles de Psychologie ; ne garantit pas immunité aux poisons ayant une procédure similaire.",
    "book": "L06",
    "page": 358,
    "param": "none"
  },
  {
    "name": "Immunity",
    "nameFr": "Immunité",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-031",
    "summaryFr": "Ignore les effets du type de dommage nommé, y compris ceux d’une Blessure critique.",
    "book": "L06",
    "page": 358,
    "param": "text"
  },
  {
    "name": "Infected",
    "nameFr": "Infecté",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-032",
    "summaryFr": "Victime vivante blessée : Endurance +4 DR ou Plaie Purulente.",
    "book": "L06",
    "page": 359,
    "param": "text"
  },
  {
    "name": "Infestation",
    "nameFr": "Parasité",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-033",
    "summaryFr": "−1 DR pour toucher la créature en mêlée.",
    "book": "L06",
    "page": 359,
    "param": "text"
  },
  {
    "name": "Leader",
    "nameFr": "Meneur",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-080",
    "summaryFr": "+10 Sociabilité et Volonté.",
    "book": "L11",
    "page": 136,
    "param": "none"
  },
  {
    "name": "Magic Resistance",
    "nameFr": "Résistance à la Magie",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-037",
    "summaryFr": "−3 DR aux sorts qui affectent la créature et incompatibilités de talents/compétences magiques.",
    "book": "L06",
    "page": 359,
    "param": "rating"
  },
  {
    "name": "Magical",
    "nameFr": "Magique",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-036",
    "summaryFr": "Les attaques sont magiques et peuvent affecter les créatures sensibles seulement à cette nature.",
    "book": "L06",
    "page": 359,
    "param": "none"
  },
  {
    "name": "Many Heads",
    "nameFr": "Plusieurs têtes",
    "nameFrSource": "proposition",
    "ref": "E0-T-034",
    "summaryFr": "Incapacité/étourdissement mortel de tête seulement après toutes les têtes concernées ; attaques gratuites par tête valide, Perception +2 DR avec au moins deux.",
    "book": "L06",
    "page": 359,
    "param": "rating"
  },
  {
    "name": "Marine Creature",
    "nameFr": "Créature marine",
    "nameFrSource": "proposition",
    "ref": "E0-T-272",
    "summaryFr": "Mouvement plein dans l’eau ; hors de l’eau M tombe à 1 et tous ses Tests subissent −2 DR ; doit être régulièrement arrosée sous peine d’asphyxie.",
    "book": "L25",
    "page": 140,
    "param": "none"
  },
  {
    "name": "Mark of Chaos",
    "nameFr": "Marque du Chaos",
    "nameFrSource": "proposition",
    "ref": "E0-T-035",
    "summaryFr": "Marque par dieu : talent ou modifications propres, rivalité d’Animosité visible et accès d’apprentissage ; ne pas fusionner les quatre variantes.",
    "book": "L06",
    "page": 359,
    "param": "text"
  },
  {
    "name": "Mark of Khorne",
    "nameFr": "Marque de Khorne",
    "nameFrSource": "proposition",
    "ref": "E0-T-267",
    "summaryFr": "Marque physique : talent Frénésie, Étiquette (Fidèles de Khorne), Animosité réciproque envers les adorateurs de Slaanesh tant que la marque se voit ; jamais Langue (Magick) ni Focalisation sauf pour dissiper ; talents martiaux achetables comme avancements. Variante de E0-T-035, à ne pas fusionner.",
    "book": "L25",
    "page": 56,
    "param": "none"
  },
  {
    "name": "Mark of Slaanesh",
    "nameFr": "Marque de Slaanesh",
    "nameFrSource": "proposition",
    "ref": "E0-T-224",
    "summaryFr": "Sans peur de tout, Étiquette et rivalités visibles ; apprentissage de talents autorisé selon liste.",
    "book": "L09",
    "page": 51,
    "param": "none"
  },
  {
    "name": "Mental Corruption",
    "nameFr": "Corruption mentale",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-038",
    "summaryFr": "Un résultat de la table des corruptions mentales.",
    "book": "L06",
    "page": 359,
    "param": "text"
  },
  {
    "name": "Messenger",
    "nameFr": "Messager",
    "nameFrSource": "proposition",
    "ref": "E0-T-170",
    "summaryFr": "Livre un message jusqu’à Intelligence miles sans Test d’Intelligence pour les ordres complexes éloignés ; risque de trajet MJ.",
    "book": "L02",
    "page": 82,
    "param": "none"
  },
  {
    "name": "Miracles",
    "nameFr": "Miracles",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-039",
    "summaryFr": "Peut employer les Miracles de la divinité, Prière Sociabilité+10 ou valeur fixée MJ.",
    "book": "L06",
    "page": 359,
    "param": "text"
  },
  {
    "name": "Mutation",
    "nameFr": "Mutation",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-040",
    "summaryFr": "Un résultat de la table de corruption physique.",
    "book": "L06",
    "page": 360,
    "param": "rating"
  },
  {
    "name": "Naiad War-Form",
    "nameFr": "Forme de guerre (Naïade)",
    "nameFrSource": "proposition",
    "ref": "E0-T-282",
    "summaryFr": "Passage gratuit en forme d’eau vive : Peur 2 et Armure 2 ; chaque Round, un aspect différent au choix (Crue : +1 DR Force/Endurance et dégâts à +10 ; Méandre : +2 DR sur CC ; Rapides : Mouvement 10 et +1 DR à l’Esquive ; Eau calme : Immunité Psychologique).",
    "book": "L26",
    "page": 88,
    "param": "none"
  },
  {
    "name": "Night Vision",
    "nameFr": "Vision nocturne",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-041",
    "summaryFr": "Vision naturelle à vingt yards, et lumière utile prolongée d’autant.",
    "book": "L06",
    "page": 360,
    "param": "none"
  },
  {
    "name": "Painless",
    "nameFr": "Insensible à la douleur",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-042",
    "summaryFr": "Ignore pénalités critiques hors amputations, mais conserve les États.",
    "book": "L06",
    "page": 360,
    "param": "none"
  },
  {
    "name": "Petrifying Gaze",
    "nameFr": "Regard pétrifiant",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-043",
    "summaryFr": "Action en perdant Élan ; CT opposée à Initiative, ou Langue Magique du mage ; Sonné selon marge et pétrification à six DR.",
    "book": "L06",
    "page": 360,
    "param": "none"
  },
  {
    "name": "Phoenix Reborn",
    "nameFr": "Renaissance du phénix",
    "nameFrSource": "proposition",
    "ref": "E0-T-232",
    "summaryFr": "Lancement spécial à la mort ; après délai, revient avec Blessures aléatoires selon DR. Détails de lancement inventoriés en D0b.",
    "book": "L14",
    "page": 83,
    "param": "none"
  },
  {
    "name": "Prejudice",
    "nameFr": "Préjugé",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-081",
    "summaryFr": "Aversion envers la cible, renvoi aux règles sociales du socle V4.",
    "book": "L11",
    "page": 136,
    "param": "text"
  },
  {
    "name": "Prey of the Dark Prince",
    "nameFr": "Proie du Prince noir",
    "nameFrSource": "proposition",
    "ref": "E0-T-226",
    "summaryFr": "Perd Protection 8+ si engagé par une créature marquée Slaanesh.",
    "book": "L09",
    "page": 52,
    "param": "none"
  },
  {
    "name": "Random Caster",
    "nameFr": "Lanceur aléatoire",
    "nameFrSource": "proposition",
    "ref": "E0-T-246",
    "summaryFr": "Quand attaqué, une fois par Round tire la tradition, puis un sort choisi ou aléatoire ; sources de certains domaines hors corpus.",
    "book": "L17",
    "page": 214,
    "param": "none"
  },
  {
    "name": "Ranged",
    "nameFr": "À distance",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-082",
    "summaryFr": "Arme à distance dont les dégâts sont l’indice.",
    "book": "L11",
    "page": 136,
    "param": "rating"
  },
  {
    "name": "Rear",
    "nameFr": "Se cabrer",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-083",
    "summaryFr": "Mouvement remplacé par Piétinement contre plus petit à BF.",
    "book": "L11",
    "page": 136,
    "param": "rating"
  },
  {
    "name": "Regeneration",
    "nameFr": "Régénération",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-044",
    "summaryFr": "Début de Round : d10 de soin si Blessures positives, sinon une Blessure sur 8+ ; dix régénère un critique et ses États ; dégâts de feu exclus.",
    "book": "L06",
    "page": 360,
    "param": "none"
  },
  {
    "name": "Shapeshifter",
    "nameFr": "Métamorphe",
    "nameFrSource": "proposition",
    "ref": "E0-T-271",
    "summaryFr": "Passe à volonté à la forme de la créature désignée (un Round entier, sans Mouvement ni Action) ; à la pleine lune, Test de Volonté Facile (+20) au crépuscule sinon transformation ; garde Int, FM et Soc, le reste devient le profil de la créature.",
    "book": "L23",
    "page": 87,
    "param": "text"
  },
  {
    "name": "Shield",
    "nameFr": "Bouclier",
    "nameFrSource": "proposition",
    "ref": "E0-T-287",
    "summaryFr": "Trait V4 de profil (« Shield 2* ») : bouclier de la valeur indiquée ; lu comme l’option Bouclier de L06 p.319 (+n PA et +1 DR en opposition par Esquive ou Mêlée) ; l’astérisque n’a pas de note imprimée dans les passages lus.",
    "book": "L22",
    "page": 14,
    "param": "rating"
  },
  {
    "name": "Size",
    "nameFr": "Taille",
    "nameFrSource": {
      "book": "L05",
      "page": 342
    },
    "ref": "E0-T-045",
    "summaryFr": "Cinq catégories V5 ; dégâts, opposition, Peur, engagement et surnombre propres ; profils de PNJ incluent déjà leurs bonus de dégâts.",
    "book": "L06",
    "page": 360,
    "param": "size"
  },
  {
    "name": "Skittish",
    "nameFr": "Nerveux",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-047",
    "summaryFr": "Magie spectaculaire visible ou bruit violent donne 1 Brisé (v3 p.361) ; entraînement Magie/Guerre apporte ses exceptions.",
    "book": "L06",
    "page": 361,
    "param": "none"
  },
  {
    "name": "Spell Syphon",
    "nameFr": "Siphon de sort",
    "nameFrSource": "proposition",
    "ref": "E0-T-247",
    "summaryFr": "Après sort ennemi réussi, Volonté opposée puis d10 : siphon, miroir ou explosion ; Calme −30 du lanceur peut éviter Inconscient et deux Corruption.",
    "book": "L17",
    "page": 214,
    "param": "none"
  },
  {
    "name": "Spellcaster",
    "nameFr": "Lanceur de Sorts",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-048",
    "summaryFr": "Accès au domaine ; gabarit ou Focalisation Volonté+10 et Langue Magique Intelligence+10, selon adaptation MJ.",
    "book": "L06",
    "page": 361,
    "param": "text"
  },
  {
    "name": "Split",
    "nameFr": "Scission",
    "nameFrSource": "proposition",
    "ref": "E0-T-269",
    "summaryFr": "Sur Blessure Critique ou à zéro Blessure, la créature se scinde en deux Horreurs bleues intactes.",
    "book": "L23",
    "page": 84,
    "param": "none"
  },
  {
    "name": "Sprinter",
    "nameFr": "Foulée (Sprinter)",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-049",
    "summaryFr": "Distance de course multipliée par un et demi.",
    "book": "L06",
    "page": 361,
    "param": "none"
  },
  {
    "name": "Stationary Attacker",
    "nameFr": "Attaquant statique",
    "nameFrSource": "proposition",
    "ref": "E0-T-173",
    "summaryFr": "Immunité Psychologie et absence de déplacement ; proie non avertie entrant à portée est engagée et Surprise. Portée selon Taille, détection puis identification requises.",
    "book": "L07",
    "page": 166,
    "param": "none"
  },
  {
    "name": "Stealthy",
    "nameFr": "Furtif",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-050",
    "summaryFr": "Discrétion rurale à Agilité+10, ajustable MJ ; pas le bonus de DR V4.",
    "book": "L06",
    "page": 361,
    "param": "none"
  },
  {
    "name": "Stride",
    "nameFr": "Foulée",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-084",
    "summaryFr": "Course multipliée par un et demi.",
    "book": "L11",
    "page": 137,
    "param": "none"
  },
  {
    "name": "Striding Gait",
    "nameFr": "Foulée adaptée",
    "nameFrSource": "proposition",
    "ref": "E0-T-051",
    "summaryFr": "Ignore pénalités de terrain nommé, +1 DR Athlétisme/Discrétion dans ce terrain.",
    "book": "L06",
    "page": 361,
    "param": "text"
  },
  {
    "name": "Stubborn",
    "nameFr": "Têtu",
    "nameFrSource": "proposition",
    "ref": null,
    "summaryFr": "Volonté +20 ; mener la bête exige un test opposé (Monte ou Conduite contre Volonté) ; en cas d'échec elle s'arrête net, puis n'avance qu'à la moitié de l'allure de marche.",
    "book": "L23",
    "page": 22,
    "param": "none"
  },
  {
    "name": "Stupid",
    "nameFr": "Stupide",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-052",
    "summaryFr": "Guidé par allié non Stupide, sinon Intelligence +4 DR au début du Round ; échec prive du Mouvement et de l’Action.",
    "book": "L06",
    "page": 362,
    "param": "none"
  },
  {
    "name": "Swamp-strider",
    "nameFr": "Limicole",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-085",
    "summaryFr": "Pas de pénalité de déplacement en terrain marécageux.",
    "book": "L11",
    "page": 137,
    "param": "none"
  },
  {
    "name": "Swarm",
    "nameFr": "Nuée",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-053",
    "summaryFr": "Psychologie et Taille ignorées ; mouvement ignore engagement ; Blessures quintuplées et CC accrue ; Blessure directe aux engagés en fin de Round ; tir facilité de quatre DR.",
    "book": "L06",
    "page": 362,
    "param": "none"
  },
  {
    "name": "Tail",
    "nameFr": "Attaque caudale",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-054",
    "summaryFr": "Perdre Élan pour attaque gratuite à BF+2 ; cible plus petite blessée devient À terre.",
    "book": "L06",
    "page": 362,
    "param": "rating"
  },
  {
    "name": "Telepathy",
    "nameFr": "Télépathie",
    "nameFrSource": "proposition",
    "ref": "E0-T-206",
    "summaryFr": "Transmet et lit des pensées ; Calme +20 permet de résister à la lecture.",
    "book": "L07",
    "page": 151,
    "param": "none"
  },
  {
    "name": "Tentacles",
    "nameFr": "Tentacules",
    "nameFrSource": "proposition",
    "ref": "E0-T-055",
    "summaryFr": "Une attaque gratuite par tentacule à BF ; dégâts peuvent donner Enchevêtré puis empoignade, résolue avec cette attaque gratuite.",
    "book": "L06",
    "page": 362,
    "param": "rating"
  },
  {
    "name": "Territorial",
    "nameFr": "Territorial",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-056",
    "summaryFr": "Défend le territoire jusqu’à la mort ; cesse normalement la poursuite à sa frontière.",
    "book": "L06",
    "page": 362,
    "param": "text"
  },
  {
    "name": "Terror",
    "nameFr": "Terreur",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-057",
    "summaryFr": "Premier contact : Psychologie ou Brisé égal indice plus chaque DR négatif ; Peur de même indice ensuite, quel que soit le résultat.",
    "book": "L06",
    "page": 362,
    "param": "rating"
  },
  {
    "name": "Tongue",
    "nameFr": "Langue préhensile",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-058",
    "summaryFr": "Perdre Élan pour tir gratuit à BF, entrave et attire une cible plus petite ; choix libérer, attaque supplémentaire ou empoignade.",
    "book": "L06",
    "page": 362,
    "param": "rating"
  },
  {
    "name": "Tough",
    "nameFr": "Coriace",
    "nameFrSource": {
      "book": "L05",
      "page": 338
    },
    "ref": "E0-T-086",
    "summaryFr": "+10 Endurance et Volonté.",
    "book": "L11",
    "page": 137,
    "param": "none"
  },
  {
    "name": "Tracker",
    "nameFr": "Pisteur",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-059",
    "summaryFr": "Compétence Pistage à Intelligence+10, augmentable MJ.",
    "book": "L06",
    "page": 363,
    "param": "none"
  },
  {
    "name": "Trained",
    "nameFr": "Dressé",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-060",
    "summaryFr": "Compétences d’animal dressé : Dompté, Trait, Divertir, Rapporter, Garde, Retour, Magie, Monture, Guerre ; leurs effets sont distincts.",
    "book": "L06",
    "page": 363,
    "param": "trained"
  },
  {
    "name": "Tzeentch’s Fire",
    "nameFr": "Feu de Tzeentch",
    "nameFrSource": "proposition",
    "ref": "E0-T-270",
    "summaryFr": "Les Horreurs du même type proches mettent leur pouvoir en commun : l’une lance un sort de Tzeentch par Round (Feu rose ou bleu), +1 DR par autre Horreur, jusqu’à +9 DR.",
    "book": "L23",
    "page": 84,
    "param": "none"
  },
  {
    "name": "Undead",
    "nameFr": "Mort-vivant",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-061",
    "summaryFr": "Absence de besoins vitaux, nature reconnue par les sorts et miracles spécifiques.",
    "book": "L06",
    "page": 363,
    "param": "none"
  },
  {
    "name": "Unstable",
    "nameFr": "Instable",
    "nameFrSource": {
      "book": "L05",
      "page": 340
    },
    "ref": "E0-T-062",
    "summaryFr": "Fin de Round engagé contre Élan adverse sans le sien : deux Blessures ; à zéro, disparition/destruction.",
    "book": "L06",
    "page": 363,
    "param": "none"
  },
  {
    "name": "Vampiric",
    "nameFr": "Vampirique",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-063",
    "summaryFr": "Morsure sur proie admissible soigne autant que les Blessures infligées ; seule méthode de soin.",
    "book": "L06",
    "page": 363,
    "param": "none"
  },
  {
    "name": "Venom",
    "nameFr": "Venin",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-064",
    "summaryFr": "Blesser donne Empoisonné ; difficulté du Trait gouverne sa récupération.",
    "book": "L06",
    "page": 363,
    "param": "rating"
  },
  {
    "name": "Vomit",
    "nameFr": "Vomissement",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-065",
    "summaryFr": "Si commence engagé, consomme Mouvement et Action ; CT +4 DR opposée à Esquive de tous à deux yards, dégâts BE+4, Sonné et dégradation d’objets ; délai douze heures.",
    "book": "L06",
    "page": 363,
    "param": "rating"
  },
  {
    "name": "Vulnerable to Cold",
    "nameFr": "Vulnérable au froid",
    "nameFrSource": "proposition",
    "ref": "E0-T-230",
    "summaryFr": "Endurance contre exposition au froid : −4 DR.",
    "book": "L14",
    "page": 83,
    "param": "none"
  },
  {
    "name": "Wake of Fire",
    "nameFr": "Sillage de feu",
    "nameFrSource": "proposition",
    "ref": "E0-T-231",
    "summaryFr": "Contact ou mêlée donne Enflammé ; Mouvement plus Action arrose la trajectoire de braises, Esquive ou Enflammé.",
    "book": "L14",
    "page": 83,
    "param": "none"
  },
  {
    "name": "Wallcrawler",
    "nameFr": "Grimpant",
    "nameFrSource": {
      "book": "L05",
      "page": 339
    },
    "ref": "E0-T-067",
    "summaryFr": "Plein Mouvement sur murs/plafonds et réussite automatique des Tests d’Escalade.",
    "book": "L06",
    "page": 363,
    "param": "none"
  },
  {
    "name": "Ward",
    "nameFr": "Protection",
    "nameFrSource": {
      "book": "L05",
      "page": 341
    },
    "ref": "E0-T-066",
    "summaryFr": "D10 après coup : atteindre le seuil ignore le coup, même critique ; lecteur existant seulement pour les couches de protection explicitement structurées.",
    "book": "L06",
    "page": 363,
    "param": "rating"
  },
  {
    "name": "Web",
    "nameFr": "Toile",
    "nameFrSource": {
      "book": "L05",
      "page": 343
    },
    "ref": "E0-T-068",
    "summaryFr": "Touche donne un Enchevêtré ayant la Force indiquée.",
    "book": "L06",
    "page": 363,
    "param": "rating"
  }
].map(entry => Object.freeze(entry)));

/** Entrée du catalogue pour un nom (anglais exact, puis anglais ou français sans accent ni casse), ou null. */
export function catalogueTraitOf(name) {
  const text = String(name ?? '').trim();
  if (!text) return null;
  const exact = CREATURE_TRAIT_CATALOGUE.find(entry => entry.name === text);
  if (exact) return exact;
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const key = fold(text);
  return CREATURE_TRAIT_CATALOGUE.find(entry => fold(entry.name) === key || fold(entry.nameFr) === key) || null;
}
