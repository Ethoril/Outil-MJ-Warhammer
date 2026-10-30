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
          'Vous lancez un second 1d100 pour déterminer la gravité de la blessure sur le Tableau des Critiques correspondant à cette localisation (voir ci-dessous).',
          'Cette nouvelle localisation sert aussi aux dégâts normaux de l\'attaque : c\'est l\'armure de cette zone qui compte.',
          'Si l\'attaque critique fait passer la cible sous zéro Point de Vie, elle subit un second critique, à la localisation du jet d\'attaque inversé (voir ci-dessus), avec son propre 1d100 de gravité.'
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
    "id": "magie",
    "title": "Magie V5 & règles de la table",
    "intro": "Magie raccordée dans l’outil : choisissez le lanceur, le sort ou la Focalisation, les cibles et les faits connus du MJ ; saisissez les jets, calculez l’aperçu puis appliquez-le. Un dé ou un fait requis manquant bloque l’application. Un aperçu périmé doit être recalculé. L’application, ses coûts et ses conséquences peuvent être annulés par Undo. Livre de base V5 EN v2, pp. 235–239, suppléments elfiques et arbitrages de la table confirmés jusqu’au 14 octobre 2026. DR : Degrés de Réussite ; NI : Niveau d’Incantation ; BFM : Bonus de Force Mentale ; BI : Bonus d’Intelligence.",
    "sections": [
      {
        "h4": "1. Focalisation : règles homebrew",
        "ul": [
          "Une seule Compétence de Focalisation et une réserve commune pour les huit Vents. La Haute Magie utilise sa propre Compétence et sa réserve.",
          "Une seule réserve peut être remplie à la fois. Commencer à Focaliser les huit Vents efface une réserve de Haute Magie, et inversement.",
          "Focaliser utilise une Action et un Test de Focalisation (+0 DR). Chaque réussite ajoute DR + BFM à la réserve ; les réussites de plusieurs Tours se cumulent.",
          "Sur un double réussi, le gain est DR réels + 2 × BFM : aucun plancher de +5 DR de critique ne s’ajoute à la réserve. Ce critique de Focalisation ne provoque pas, à lui seul, d’incantation imparfaite.",
          "Une compétence importée « Focalisation (Vent coloré) » vaut la compétence unique pour les huit Vents. Si plusieurs valeurs diffèrent, une anomalie de fiche est affichée au MJ ; la valeur générique prime, ou à défaut la première valeur importée est commune à tous les Vents. Seule la Focalisation (Haute Magie / Qhaysh) reste distincte. Les Domaines connus restent requis, sans redistribution automatique des avances ou PX.",
          "La Compétence commune ne rend pas les Vents identiques : le Vent utilisé reste nécessaire pour les bonus du lieu, les attributs de Domaine et les exceptions d’armure."
        ],
        "example": "Avec BFM 5, une Focalisation réussie à 2 DR ajoute 7 DR à la réserve. Une réussite critique à 5 DR ajoute 15 DR."
      },
      {
        "h4": "2. Incantation avec Langue (Magick)",
        "ul": [
          "Effectuez un Test de Langue (Magick) (+0 DR). Le Test doit réussir ; une réserve ne transforme pas un Test raté ou une maladresse en réussite.",
          "Ajoutez la réserve appropriée aux DR du Test réussi. Le total doit atteindre le NI du sort. Toute tentative effective vide la réserve, réussie ou ratée ; préparer, consulter ou annuler un aperçu ne la consomme pas.",
          "L’excédent au-delà du NI peut servir à la surpuissance. Il ne donne aucun bonus supplémentaire de +10 au Test.",
          "Projectile magique : dégâts indiqués par le sort + BFM, puis réduction par BE et PA sauf exception du sort. Les DR ne s’ajoutent pas automatiquement aux dégâts. Inversez le jet d’incantation pour la localisation.",
          "Sort de contact sur une cible réticente : après l’incantation réussie, opposez Corps à corps (Bagarre) ou Escamotage à la défense. Pour un projectile de contact, inversez ce jet de contact pour la localisation. Le contact n’ajoute aucun dégât d’arme."
        ],
        "example": "Une réserve de 7 DR et un lancer réussi à 3 DR donnent 10 DR. Pour NI 8, il reste 2 DR de surpuissance, sans modifier une seconde fois le Test."
      },
      {
        "h4": "3. Surpuissance V5",
        "p": "Dépensez au maximum BI + BFM DR parmi l’excédent disponible. Répartissez cette dépense entre les améliorations choisies ; un même DR ne paie pas plusieurs améliorations. Les options propres au sort restent distinctes.",
        "ul": [
          "Aucune surpuissance pour les sorts mineurs ou les sorts non mémorisés lancés depuis un grimoire.",
          "Une portée « Vous » reste limitée au lanceur ; « Contact » ne peut être étendu. Une durée Instantanée ou Spéciale ne peut être prolongée. Une zone absente ne peut être créée.",
          "Coûts et effets de la table ci-dessous : chaque colonne décrit le palier obtenu pour la dépense choisie, pas plusieurs achats cumulés de ce palier."
        ],
        "table": [
          {
            "jet": "1 DR",
            "loc": "+1 cible ; +1 dégâts ; portée ×2"
          },
          {
            "jet": "2 DR",
            "loc": "+1 cible ; +2 dégâts ; portée ×2 ; durée ×2"
          },
          {
            "jet": "3 DR",
            "loc": "+1 cible ; +3 dégâts ; portée ×2 ; zone ×2 ; durée ×2"
          },
          {
            "jet": "5 DR",
            "loc": "+2 cibles ; +4 dégâts ; portée ×3 ; zone ×2 ; durée ×2"
          },
          {
            "jet": "8 DR",
            "loc": "+2 cibles ; +5 dégâts ; portée ×3 ; zone ×2 ; durée ×3"
          },
          {
            "jet": "13 DR",
            "loc": "+2 cibles ; +6 dégâts ; portée ×3 ; zone ×2 ; durée ×3"
          },
          {
            "jet": "18 DR ou plus",
            "loc": "+3 cibles ; +7 dégâts ; portée ×4 ; zone ×3 ; durée ×3"
          }
        ],
        "tableHeaders": [
          "Dépense par amélioration",
          "Palier obtenu"
        ]
      },
      {
        "h4": "4. Interruptions et incantations imparfaites V5",
        "ul": [
          "Pause de Focalisation : à chaque Tour, un Test de Résistance Accessible (+2 DR) conserve la réserve ; un échec la fait perdre.",
          "Dégâts ou État subi pendant la Focalisation : Test de Calme Difficile (−2 DR). Échec : perdez 1d10 DR de réserve et faites un jet Mineur avec +10 par DR effectivement perdu.",
          "Maladresse de Focalisation : perdez 1d10 DR de réserve, puis jet Mineur avec +10 par DR effectivement perdu. Une réserve ne descend pas sous zéro.",
          "Maladresse d’incantation : jet Mineur. Les DR de réserve ne permettent pas d’éviter la maladresse.",
          "Double réussi en incantation : jet Mineur et choix d’un effet critique — Blessure Critique si le sort cause des dégâts ; Puissance totale, qui lance le sort et ajoute le chiffre des dizaines aux DR disponibles pour la surpuissance ; Force irrésistible, qui interdit sa dissipation. Les sorts mineurs ne produisent ni cet effet critique ni ce jet Mineur sur un double réussi.",
          "Influence corruptrice : tout jet Mineur normalement déclenché devient un jet Majeur. Le lanceur ne compte pas comme sa propre influence corruptrice.",
          "Règle de table : les ingrédients ne sont pas utilisés et ne réduisent jamais les incantations imparfaites. Les runes des Cadai conservent leurs règles propres.",
          "Diction instinctive : peut réduire de 20 un résultat Mineur ; sous 01, aucun effet. Aucun effet sur la table Majeure. Harmonisation aethyrique demande ses jets et son choix explicites ; une interdiction d’atténuation reste prioritaire.",
          "La Fortune est Capricieuse : un double provoque une maladresse aux Tests magiques et à la dissipation seulement.",
          "Contre-réaction, résultat Majeur 96 et plus : le lanceur ne peut jamais être sa propre cible. Sans cible admissible à portée, sa tête explose ; désignez les cibles admissibles dans l’aperçu.",
          "Si un résultat Mineur modifié dépasse 100, son excédent est ajouté au jet Majeur. La dernière entrée de la table Majeure couvre 96 et plus."
        ]
      },
      {
        "h4": "5. Effets, armure et dissipation",
        "ul": [
          "Les bonus et pénalités provenant de plusieurs sorts ne se cumulent pas : gardez le meilleur bonus et le pire malus pour chaque effet. Bénédiction de Lileath : le cumul autorisé dépend du talent du lanceur. Chaque Protection ainsi admise fait son propre d10 ; une seule réussite annule les dégâts.",
          "Les effets temporaires modifient le participant dans l’outil et expirent selon le sort ; ils ne réécrivent pas la fiche source. Un État reçu suit sa récupération normale sauf si le sort précise une durée ou une suppression.",
          "Armure portée : −1 DR par PA de la localisation la plus protégée aux Tests de Focalisation et d’incantation. L’armure non portée ne compte pas. Exceptions : métal pour Chamon, cuir pour Ghur. Les PA donnés par les sorts et l’armure naturelle n’imposent pas cette pénalité.",
          "Dissipation pendant le lancer : une réaction par Round, avec Langue (Magick) connue, à portée FM mètres. Saisissez distance et visibilité ; leur absence bloque la dissipation. Opposez les DR du dissipateur aux seuls DR du Test d’incantation ; l’égalité revient au lanceur. Un dissipateur à DR négatifs compte pour 0 DR et n’augmente jamais les DR du lanceur. Si le lanceur gagne, ajoutez sa réserve aux DR nets, puis vérifiez le NI et recalculez l’excédent et la surpuissance.",
          "Dissipation d’un sort persistant : Action et Test étendu de Langue (Magick) (+0 DR), objectif égal au NI du sort. Dissiper son propre sort donne +1 DR.",
          "Une durée plus courte se déclare lors du lancer. Une fois actif, le sort ne peut être arrêté avant terme que par dissipation, sauf exception explicite. Force irrésistible interdit la dissipation ; les méditations de talents ne sont pas dissipables.",
          "1 Round = 10 secondes. Un effet exprimé en Rounds expire à la fin du tour de son auteur. L’expiration retire ses couches temporaires sans restaurer un ancien état complet ni guérir les Blessures reçues depuis.",
          "Une Protection réussie annule les dégâts et le Coup Critique associé (trait Ward, V5 p. 363) ; les autres conséquences du sort restent évaluées. Les Blessures directes des attributs de Vie et de Lumière ignorent PA, BE et Protection.",
          "Résistance à la Magie face à Puissance totale : le NI reste ignoré, mais la Résistance retire 3 DR aux effets sur la cible.",
          "Seconde vue en zone saturée : le Désavantage reste un rappel MJ. Le MJ renseigne aussi les cibles des zones, les traversées et les collisions ; le vortex propose direction et distance, puis utilise les cibles réellement traversées."
        ]
      },
      {
        "h4": "6. Haute Magie : supplément elfe adapté",
        "ul": [
          "Lancement et surpuissance suivent les règles V5 et les options du sort. Le talent Haute Magie ne relève pas le plafond BI + BFM. Un seul attribut parmi les huit Domaines, ou aucun, peut être retenu sous arbitrage du MJ. Les sorts elfiques arcaniques gardent leurs deux Vents requis et le choix d’un seul attribut ; leur apprentissage relève de la fiche.",
          "Épuisement magique : après un lancement non dissipé, si les DR dépensés en surpuissance dépassent le BFM, le risque en pourcentage est égal à cet excédent. Un d100 égal ou inférieur à ce risque bloque les incantations pendant autant de jours que le résultat ; un double rend le blocage permanent. Un Point de Chance annule le blocage temporaire, un Point de Destin le permanent. Un sort dissipé ne provoque pas d’épuisement. La Force Mentale du lanceur et le compteur requis doivent être renseignés ; le compteur doit être suffisant.",
          "Runes des Cadai : Lire/Écrire, matériel approprié et Savoir (Magie) (+0 DR) ; une rune prend 1 Round à déployer, maximum BFM runes. Visible et à portée de bras, une rune paie la relance d’un seul jet distinct de Focalisation, incantation, incident, Corruption ou épuisement ; plusieurs jets demandent plusieurs runes. La relance de Corruption se rattache à une exécution réelle de Haute Magie de ce lanceur, une fois par jet identifié. Après départ et retour, il faut les déployer à nouveau.",
          "Une Marque de la magie causée par un incident de Haute Magie devient 1d10 jours d’épuisement magique. Les conditions d’apprentissage, achats et Yenlui relèvent des fiches.",
          "Main de Gloire, option à +6 DR : augmentez quatre caractéristiques au choix parmi CC, CT, Force, Endurance, Initiative et Agilité, avec le même jet de 3d10, et Mouvement +2. Les Blessures maximales restent inchangées malgré le bonus d’Endurance.",
          "Bouclier de Saphery : Protection 9+ améliorée par les autres sorts de Haute Magie, sans plancher supplémentaire ; un seuil calculé de 1 ou moins réussit automatiquement sur 1d10."
        ]
      },
      {
        "h4": "7. Arbitrages de sorts de la table",
        "ul": [
          "Forme bestiale — Jade : doublon homebrew intégral de Forme bestiale V5 du Domaine des Bêtes, rattaché au Vent Ghyran avec l’attribut du Domaine de la Vie.",
          "Apothéose Verdoyante (Winds of Magic, p. 89) : les morts admissibles reviennent avec 1 Blessure par DR final du sort, dans la limite de leurs Blessures maximales. Le total comprend les DR du Test réussi et la réserve consommée, avant dépense de surpuissance. Le sort ne guérit pas les Blessures Critiques, ne rend pas les membres perdus et ne sauve pas un corps décapité.",
          "Fléau des Démons : Endurance ≤ Intelligence du lanceur, bannissement ; Intelligence < Endurance < 2 × Intelligence, Blessures maximales divisées par deux pour le reste de la rencontre ; Endurance ≥ 2 × Intelligence, aucun effet principal. Les effets secondaires V5 restent applicables. La réduction ne se cumule pas sur un Démon déjà affaibli. L’Endurance réelle de la cible est requise. Les Bmax divisées sont restaurées en fin de rencontre par action du MJ.",
          "Faux de Shyish (V5 v3, p. 247) : les Morts-vivants engagés avec le porteur ne gagnent pas d’Élan. L’Élan déjà acquis et l’Avantage V5 ne sont pas touchés.",
          "Forme bestiale : choisissez Sanglier, Chien, Rat géant, Araignée géante, Cheval ou Loup, des Bêtes du Reikland (V5 pp. 325–327). Mouvement, Force, Endurance, Agilité et Dex remplacés ; une Dex « – » interdit les Tests de Dex. Les Blessures sont recalculées par la formule V5 avec les nouvelles F et E, la FM du lanceur et la Taille de l’animal.",
          "Forme bestiale : traits standard de l’animal sauf Bestial et Craintif ; un trait optionnel par +2 DR, sauf Taille (Énorme) et Nuée. Taille optionnelle ne change que le multiplicateur des Blessures : aucun ajustement de F, E ou Ag de la p. 361. Transformation de Kadon garde les Blessures du monstre.",
          "Sous forme animale, les attaques de l’animal utilisent Corps à corps (Bagarre) du lanceur, à défaut sa CC. L’équipement est lâché pendant la transformation (Winds of Magic) ; seule la peau de l’animal protège. Parler, lancer des sorts, dissiper et Focaliser sont interdits. Les Blessures et Critiques subis sont suivis au retour.",
          "Catalogue : Silence Arcane (V5 p. 245) et Coruscating Arc des Cieux (V5 p. 249) sont ajoutés au catalogue public. Silence Arcane reste distinct de Silence Ulgu / Hush ; Coruscating Arc reste distinct de T’Essla’s Arc."
        ]
      }
    ],
    "tablesHeader": "Incantations imparfaites — tables V5",
    "nestedTables": [
      {
        "id": "table-magic-minor",
        "title": "✨ Table Mineure V5",
        "type": "magic",
        "key": "MINOR",
        "source": "Livre de base V5 EN v2, p. 238"
      },
      {
        "id": "table-magic-major",
        "title": "🔥 Table Majeure V5",
        "type": "magic",
        "key": "MAJOR",
        "source": "Livre de base V5 EN v2, p. 239"
      }
    ],
    "source": "Livre de base V5 EN v2, pp. 235–255 et 325–327 ; Haute Magie : High Elf Player’s Guide v2, pp. 83–89 ; arbitrages de la table des 9, 10 et 11 octobre 2026 ; Apothéose Verdoyante : Winds of Magic, p. 89",
    "tablesIntro": "Lancez 1d100 et appliquez les modificateurs de l’incident. Les distances en mètres et miles reprennent les unités du livre source."
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
