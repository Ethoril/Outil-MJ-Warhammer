export const RULES = [
  {
    id: 'localisation',
    title: 'Localisation des dégâts & Tables Critiques',
    intro: 'D\'après le Livre de base de Warhammer Fantasy le Jeu de Rôle (4e édition) :',
    sections: [
      {
        h4: '1. La Règle de base : Inverser les dés',
        p: 'Pour déterminer où un coup atterrit après un Test de Corps à corps ou de Projectiles réussi, vous devez simplement inverser le résultat des dés de votre jet d\'attaque.',
        example: 'Exemple : Si vous réussissez votre attaque avec un jet de 23, vous inversez les chiffres pour obtenir 32. Si vous obtenez 04, la localisation est 40. Si vous obtenez 10 (le 10 comptant pour 0 sur le dé des unités), l\'inverse est 01.'
      },
      {
        h4: '2. Le Tableau de Localisation',
        table: [
          { jet: '01 – 09', loc: 'Tête' },
          { jet: '10 – 24', loc: 'Bras gauche (ou bras secondaire)' },
          { jet: '25 – 44', loc: 'Bras droit (ou bras principal)' },
          { jet: '45 – 79', loc: 'Corps' },
          { jet: '80 – 89', loc: 'Jambe gauche' },
          { jet: '90 – 00', loc: 'Jambe droite' }
        ]
      },
      {
        h4: '3. Exception pour les Coups Critiques',
        p: 'Si votre jet d\'attaque est un Coup Critique (un succès sur un double, par exemple 11, 22, 33...), la procédure change. Vous n\'inversez pas le jet d\'attaque. À la place :',
        ul: [
          'Vous lancez un nouveau 1d100 pour déterminer la localisation (en consultant le tableau ci-dessus).',
          'Vous lancez un second 1d100 pour déterminer la gravité de la blessure sur le Tableau des Critiques correspondant à cette localisation (voir ci-dessous).'
        ]
      },
      {
        h4: '4. Cas particuliers',
        ul: [
          'Créatures non-humanoïdes : Pour les quadrupèdes, on remplace généralement les bras par les pattes avant et les jambes par les pattes arrière.',
          'Viser : Il est possible de viser une localisation précise, mais cela impose un malus de -20 au test d\'attaque.'
        ]
      }
    ],
    tablesHeader: 'Tableaux des Coups Critiques',
    nestedTables: [
      { id: 'table-head-crit', title: '💀 Critiques à la Tête', type: 'crit', key: 'HEAD' },
      { id: 'table-arm-crit', title: '💪 Critiques au Bras', type: 'crit', key: 'ARM' },
      { id: 'table-body-crit', title: '👕 Critiques au Corps', type: 'crit', key: 'BODY' },
      { id: 'table-leg-crit', title: '🦵 Critiques à la Jambe', type: 'crit', key: 'LEG' }
    ]
  },
  {
    id: 'sante',
    title: 'Santé, Critiques et Survie',
    sections: [
      {
        h4: '1. Les Blessures et l\'État de Santé',
        ul: [
          'Subir des Dégâts : Dégâts de l\'arme + DR – (Bonus d\'Endurance + Points d\'Armure) = Blessures perdues.',
          'Tomber à 0 Blessures : Vous gagnez l\'État À Terre. Si non soigné en un nombre de Rounds égal au Bonus d\'Endurance, vous gagnez l\'État Inconscient.',
          'Le Symptôme « Blessé » : Désigne un symptôme spécifique de maladie (plaie infectée). Empêche la récupération de B tant que non traité.'
        ]
      },
      {
        h4: '2. Les Coups Critiques',
        p: 'Quand subit-on un Critique ?',
        ol: [
          'Le Double : L\'attaquant réussit son Test avec un double. (Note : La victime subit le Critique ET les dégâts normaux.)',
          'L\'Acharnement (0 PV) : Si la cible est réduite à 0 Blessures, tout coup porté inflige automatiquement un Critique.'
        ],
        pAfter: 'Résolution : Lancer 1d100 pour la localisation, puis 1d100 pour la gravité (+10 si cible à 0 PV).'
      },
      {
        h4: '3. La Mort',
        ol: [
          'Résultat Mortel : Le jet sur le tableau des Critiques indique « Mort ».',
          'Accumulation : Si Inconscient à 0 B et que le nombre de Critiques actifs > Bonus d\'Endurance, mort à la fin du Round.'
        ]
      },
      {
        h4: '4. Comment Éviter ou Atténuer',
        ul: [
          'Déviation Critique (Sacrifice d\'Armure) : Sacrifier 1 Point d\'Armure pour ignorer le Critique (mais subir les dégâts).',
          'Points de Destin/Résilience : Survivre in extremis ou choisir le résultat d\'un dé.'
        ]
      }
    ]
  },
  {
    id: 'magie',
    title: 'La Magie & Lancer un Sort',
    intro: 'Pour réussir un sort, il faut obtenir un SR (Seuil de Réussite) supérieur ou égal au NI (Niveau d\'Incantation) du sort.',
    sections: [
      {
        h4: '1. Test de Focalisation (Channeling)',
        ul: [
          'Un test réussi permet d\'accumuler des succès (Bonus FM + SR obtenus) utilisables pour le prochain test de Langue Magik.',
          'Peut être fait en Test étendu sur plusieurs rounds jusqu\'à accumuler assez de succès pour lancer le sort à difficulté 0.'
        ],
        example: 'Exemple : Pour un sort NI 8. Si tu as 52 en FM et 62 en Focalisation. Tu lances 48. SR = 2 (62 vs 48) + Bonus FM (5) = 7 succès accumulés. Il te manque 1 succès pour le NI 8.'
      },
      {
        h4: '2. Test de Langue Magik (Lancement)',
        ul: [
          'Vous devez réussir un test de Langue Magik avec assez de SR pour combler ce qu\'il manque au NI du sort.',
          'Si succès excédentaires en Focalisation : Chaque succès "de trop" donne un bonus de +10 au test de Langue Magik.'
        ]
      },
      {
        h4: 'Cas Spéciaux',
        ul: [
          'Interruption : Si interrompu pendant une Focalisation étendue, faire un Test de Calme Difficile (-20). Si échec : perte de succès et jet sur Incantations Imparfaites Mineures.',
          'Réussite Critique : (Focalisation ou Langue Magik) Effet positif + jet sur table Mineure.',
          'Maladresse (Focalisation) : Jet sur table Majeure.',
          'Maladresse (Langue Magik) : Echec + Jet sur table Mineure.',
          'Magie Sombre : Un dé sur un 8 (dizaine ou unité) = Jet sur table Mineure.'
        ]
      }
    ],
    tablesHeader: 'Tableaux des Incantations Imparfaites',
    nestedTables: [
      { id: 'table-magic-minor', title: '✨ Table Mineure', type: 'magic', key: 'MINOR' },
      { id: 'table-magic-major', title: '🔥 Table Majeure', type: 'magic', key: 'MAJOR' }
    ]
  },
  {
    id: 'psychologie',
    title: 'Psychologie : Peur & Terreur',
    intro: 'La Peur est un Trait Psychologique représentant une aversion extrême. Les créatures possèdent un Indice de Peur (ex: Peur 2).',
    sections: [
      {
        h4: '1. Surmonter la Peur',
        p: 'Pour vaincre sa peur, le personnage doit réussir un Test Étendu de Calme.',
        ul: [
          'Objectif : Cumuler un nombre de DR (Degrés de Réussite) ≥ Indice de Peur.',
          'Quand : À la fin de chaque Round (avant ou après le jet de récupération de l\'état Brisé).',
          'Succès : Une fois le total atteint, vous n\'êtes plus sujet à la Peur pour le reste de la rencontre.'
        ]
      },
      {
        h4: '2. Les Effets (Tant qu\'on a Peur)',
        p: 'Tant que le total de DR requis n\'est pas atteint, vous subissez :',
        ul: [
          'Malus d\'action : -1 DR à tous les Tests liés à la source de la peur (attaque, interaction...).',
          'Mouvement restreint : Impossible de se rapprocher volontairement. Pour forcer sa volonté afin d\'approcher : Test de Calme Intermédiaire (+0) requis.',
          'Risque de panique : Si la source approche, Test de Calme Intermédiaire (+0) immédiat. En cas d\'échec : gain de l\'État Brisé.'
        ]
      },
      {
        h4: '3. La Terreur (Terror)',
        p: 'Une forme plus intense de la Peur.',
        ul: [
          'À la vue de la créature : Test de Calme immédiat.',
          'Échec : Gagnez un nombre d\'États Brisé égal à (Indice Terreur + DR d\'échec).',
          'Ensuite : La créature cause la Peur (avec un indice égal à son indice de Terreur) pour le reste du combat.'
        ],
        example: 'Rappel sur l\'État Brisé : Vous devez fuir et vous cacher. Vous subissez -10 à tous les Tests qui ne servent pas à fuir. Vous ne pouvez tenter de retirer cet état qu\'à la fin du Round (Test de Calme) si vous n\'êtes pas engagé au corps à corps.'
      }
    ]
  },
  {
    id: 'corruption',
    title: 'La Corruption & les Mutations',
    sections: [
      {
        h4: '1. Gagner de la Corruption',
        p: 'On accumule de la Corruption par exposition ou choix volontaire.',
        subSections: [
          {
            title: 'A. Les Influences Corruptrices',
            p: 'Test de Résistance (Physique) ou Calme (Spirituel) requis face au Chaos.',
            ul: [
              'Exposition Mineure (Ex: voir un démon mineur) : Échec = +1 Corruption.',
              'Exposition Modérée (Ex: malepierre, plusieurs démons) : Échec = +2 Cor. | Succès minime (0-1 DR) = +1 Cor.',
              'Exposition Majeure (Ex: Démon Majeur, pacte) : Échec = +3 Cor. | Succès minime (0-1 DR) = +2 Cor. | Succès (2-3 DR) = +1 Cor. | Succès Impressionnant (4+ DR) = 0.'
            ]
          },
          {
            title: 'B. Les Sombres Pactes',
            p: 'Si vous ratez un test, vous pouvez accepter volontairement +1 Point de Corruption pour réussir le jet ou le relancer. (Choix du joueur).'
          }
        ]
      },
      {
        h4: '2. Le Seuil & la Mutation',
        example: 'Seuil de Corruption Max = Bonus d\'Endurance (BE) + Bonus de Force Mentale (BFM).',
        p: 'Si votre total dépasse ce seuil, faites immédiatement un Test de Résistance (+0).',
        ul: [
          'Succès : Vous résistez pour l\'instant (test à refaire au prochain gain de corruption).',
          'Échec : Mutation ! Vous perdez un nombre de points de Corruption égal à votre BFM et subissez une mutation.'
        ]
      },
      {
        h4: '3. Déterminer la Mutation',
        ol: [
          'Le Type : Lancez 1d100. Humains : 01-50 Corps, 51-00 Esprit. Elfes : Tendance aux mutations mentales.',
          'L\'Effet : Lancez sur le Tableau de Corruption Physique ou Mentale correspondant.'
        ]
      },
      {
        h4: '4. Perdre de la Corruption',
        ul: [
          'Absolution : Actes héroïques, purification, pèlerinage (difficile, à la discrétion du MJ).',
          'Sombres Murmures : Le MJ propose de retirer 1 Point si vous commettez un acte vil suggéré par les Dieux Sombres.'
        ]
      },
      {
        h4: '5. La Fin du Personnage',
        p: 'Si le nombre de mutations dépasse votre BE (pour le physique) ou votre BFM (pour le mental), le personnage sombre définitivement et devient un PNJ (Enfant du Chaos).'
      }
    ]
  }
];
