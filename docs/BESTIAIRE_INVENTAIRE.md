# Inventaire des Traits et des profils de bestiaire

FAIT : 249 entrées (Traits, variantes, capacités), 541 références de profils : 508 profils, 27 gabarits et 6 prétirés. Statuts des règles : engine 0, assisted 7, reminder 80, absent 162. 30 questions ouvertes.

Le transport d’une étiquette ne prouve pas son exécution. Les sept couvertures assistées concernent des attaques structurées, la Taille des transformations ou la reconnaissance de nature pour les filtres. Les autres règles de ces Traits restent limitées dans le JSON. Un talent, un sort ou une qualité d’arme analogue ne remplace pas le raccordement du Trait.

Source L06 V5 pour le socle ; noms français rapprochés de L05 p.338–343, avec source du nom lorsque attestée. Les traductions de travail sont signalées. Les variantes V4 ne remplacent ni V5 ni les arbitrages déjà retenus. Le manifeste comporte 17 livres, aucun L18.

## Traits, variantes et capacités

| ID | Source imprimée | Nom / nom français | Résumé mécanique | Statut | Preuve actuelle |
| --- | --- | --- | --- | --- | --- |
| E0-T-001 | L06 p.356 | Afraid (Target) / Effrayé (cible) | Peur de la cible ; Test étendu, interdiction de gagner Élan et avantage de mêlée de la source jusqu’au seuil. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-002 | L06 p.356 | Amphibious / Amphibie | Compétence Natation, +1 DR à ses Tests et déplacement aquatique au plein Mouvement. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-003 | L06 p.356 | Animosity (Target) / Animosité | Psychologie pour se retenir, sinon opposition sociale ou physique à la cible et +1 DR de Sociabilité contre elle. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-004 | L06 p.356 | Belligerent / Belliqueux | Immunité à Peur tant que la créature possède de l’Élan ; variantes des suppléments distinctes. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-005 | L06 p.356 | Bestial / Bestial | Pas de langage rationnel, défense par Esquive ; feu blessant donne Brisé ; sous moitié des Blessures fuite ou Frénésie selon protection/territoire. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-006 | L06 p.356 | Bite / Morsure | Perdre Élan pour une attaque gratuite ; dégâts du profil incluent déjà le Bonus de Force. | assisted | js/core/v5-magic-combat.js:18, js/core/v5-magic-combat.js:32 |
| E0-T-007 | L06 p.356 | Blessed (Deity) / Béni | Accès aux Bénédictions de la divinité et Prière à Sociabilité+10 ou valeur MJ supérieure ; ne remplace pas les prérequis explicites de fiche. | reminder | js/core/v5-divine-effects-gear.js:14 |
| E0-T-008 | L06 p.357 | Bounce / Bond | Double Mouvement pour Charge, Saut ou Sprint et franchit terrain/créatures intermédiaires. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-009 | L06 p.357 | Breath / Souffle | Attaque gratuite de zone portée 20+BE ; CT ou CT30 si absente, opposition Esquive par cible, immunité à son souffle et attaque magique. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-010 | L06 p.357 | Champion / Champion | Opposition de mêlée défensive gagnée : dégâts comme attaquant. | reminder | js/core/v5-talent-actions.js:14 |
| E0-T-011 | L06 p.357 | Chill Grasp / Étreinte glaciale | Action en perdant Élan ; CC opposée à Esquive/mêlée, puis 1d10+DR Blessures directes, magique. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-012 | L06 p.357 | Cold-blooded / À Sang-froid | Avantage à Calme ; première fin normale de Surpris ignorée. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-013 | L06 p.357 | Constrictor / Constricteur | Toute touche donne Enchevêtré puis permet une empoignade. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-014 | L06 p.357 | Construct / Fabriqué | Pas de caractéristiques mentales ni de Tests associés ; Endurance remplace Volonté si nécessaire, Force pour les Blessures ; attaques magiques et conduite dépendant du contrôle. | assisted | js/core/v5-magic-attributes.js:112 |
| E0-T-015 | L06 p.357 | Corrosive Blood / Sang corrosif | Après blessure reçue, un seul d10 de dégâts partagé entre tous les engagés. | reminder | js/core/v5-spell-contracts.js:2188 |
| E0-T-016 | L06 p.357 | Corruption (Strength) / Corruption | Influence corruptrice de la force précisée ; Tests d’exposition selon ce classement. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-017 | L06 p.357 | Dark Vision / Infravision | Voit l’obscurité comme en plein jour. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-018 | L06 p.357 | Daemonic (Rating) / Démoniaque | Attaques magiques, besoins vitaux absents ; d10 contre seuil annule un coup non magique même critique ; disparaît à zéro Blessure. | assisted | js/core/v5-magic-attributes.js:108, js/core/v5-magic-combat.js:201 |
| E0-T-019 | L06 p.358 | Disease (Type) / Maladie | Porte la maladie indiquée ; contraction selon exposition, atteinte propre décidée MJ. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-020 | L06 p.358 | Distracting / Perturbant | Vivants dans BE yards : −2 DR généraux, une seule fois quelle que soit la multiplicité des sources. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-021 | L06 p.358 | Ethereal / Éthéré | Traverse les solides ; seules attaques magiques peuvent le blesser, ses attaques sont magiques. | assisted | js/core/v5-magic-attributes.js:117 |
| E0-T-022 | L06 p.358 | Fear (Rating) / Peur | Peur surnaturelle, indice un si omis ; texte du Trait demande de dépasser l’indice, contrairement au chapitre Psychologie. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-023 | L06 p.358 | Fly (Rating) / Vol | Mouvement aérien à l’indice, peut charger, doit voler si commence en vol ; portée de tir décalée, tirs propres à −2 DR. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-024 | L06 p.358 | Frenzy / Frénésie | Volonté pour entrer ; immunité Psychologie, attaque gratuite par Round et +1 dégât ; conduite imposée ; fin sur absence d’ennemi, Sonné/Inconscient puis Exténué. | reminder | js/core/v5-talent-actions.js:89, js/core/v5-talent-actions.js:145 |
| E0-T-025 | L06 p.358 | Ghostly Howl / Hurlement fantomatique | Une fois par Tour, perdre Élan pour hurler ; vivants auditeurs dans Force yards : trois Assourdi, d10 Blessures directes et Calme +2 DR ou Brisé, critiques à la tête. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-026 | L06 p.358 | Grim / Féroce (nom V5 à valider) | En fin de Tour sans Élan, la créature en gagne. V5 v3 : elle n’a pas à perdre son Élan pour ses attaques gratuites, mais doit en avoir. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-027 | L06 p.358 | Hatred (Target) / Haine | Psychologie sinon attaque prioritaire du groupe, +1 DR mêlée/tir et immunité à son Intimidation/Peur, pas Terreur. | reminder | js/core/v5-talent-psychology.js:25 |
| E0-T-028 | L06 p.358 | Horns / Cornes | Charge permet une attaque gratuite des cornes à BF+4. | assisted | js/core/v5-magic-combat.js:32 |
| E0-T-029 | L06 p.358 | Hungry / Affamé | Après mort/incapacité d’un vivant ou rencontre de cadavre frais : Calme +2 DR ou repas consommant prochain Mouvement et Action. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-030 | L06 p.358 | Immune to Psychology / Immunité Psychologique | Ignore les règles de Psychologie ; ne garantit pas immunité aux poisons ayant une procédure similaire. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-031 | L06 p.358 | Immunity (Type) / Immunité | Ignore les effets du type de dommage nommé, y compris ceux d’une Blessure critique. | reminder | js/core/v5-magic-combat.js:206 |
| E0-T-032 | L06 p.359 | Infected / Infecté | Victime vivante blessée : Endurance +4 DR ou Plaie Purulente. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-033 | L06 p.359 | Infestation / Parasité | −1 DR pour toucher la créature en mêlée. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-034 | L06 p.359 | Many Heads (Number) / Plusieurs têtes (traduction de travail) | Incapacité/étourdissement mortel de tête seulement après toutes les têtes concernées ; attaques gratuites par tête valide, Perception +2 DR avec au moins deux. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-035 | L06 p.359 | Mark of Chaos (God) / Marque du Chaos | Marque par dieu : talent ou modifications propres, rivalité d’Animosité visible et accès d’apprentissage ; ne pas fusionner les quatre variantes. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-036 | L06 p.359 | Magical / Magique | Les attaques sont magiques et peuvent affecter les créatures sensibles seulement à cette nature. | reminder | js/core/v5-magic-attributes.js:125 |
| E0-T-037 | L06 p.359 | Magic Resistance / Résistance à la Magie | −3 DR aux sorts qui affectent la créature et incompatibilités de talents/compétences magiques. | reminder | js/core/v5-spell-contracts.js:1712 |
| E0-T-038 | L06 p.359 | Mental Corruption / Corruption mentale (traduction de travail) | Un résultat de la table des corruptions mentales. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-039 | L06 p.359 | Miracles (Deity) / Miracles | Peut employer les Miracles de la divinité, Prière Sociabilité+10 ou valeur fixée MJ. | reminder | js/core/v5-divine-effects-gear.js:14 |
| E0-T-040 | L06 p.360 | Mutation / Mutation | Un résultat de la table de corruption physique. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-041 | L06 p.360 | Night Vision / Vision nocturne | Vision naturelle à vingt yards, et lumière utile prolongée d’autant. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-042 | L06 p.360 | Painless / Insensible à la douleur | Ignore pénalités critiques hors amputations, mais conserve les États. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-043 | L06 p.360 | Petrifying Gaze / Regard pétrifiant | Action en perdant Élan ; CT opposée à Initiative, ou Langue Magique du mage ; Sonné selon marge et pétrification à six DR. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-044 | L06 p.360 | Regeneration / Régénération | Début de Round : d10 de soin si Blessures positives, sinon une Blessure sur 8+ ; dix régénère un critique et ses États ; dégâts de feu exclus. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-045 | L06 p.360 | Size / Taille | Cinq catégories V5 ; dégâts, opposition, Peur, engagement et surnombre propres ; profils de PNJ incluent déjà leurs bonus de dégâts. | assisted | js/core/v5-magic-arbitrations.js:102 |
| E0-T-046 | L06 p.361 | Stomp (Size) / Piétinement | Perdre Élan pour attaque gratuite de Bagarre à BF contre plus petit. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-047 | L06 p.361 | Skittish / Nerveux | Magie spectaculaire visible ou bruit violent donne 1 Brisé (v3 p.361) ; entraînement Magie/Guerre apporte ses exceptions. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-048 | L06 p.361 | Spellcaster (Lore) / Lanceur de Sorts | Accès au domaine ; gabarit ou Focalisation Volonté+10 et Langue Magique Intelligence+10, selon adaptation MJ. | reminder | js/core/v5-magic-arbitrations.js:113 |
| E0-T-049 | L06 p.361 | Sprinter / Foulée (alias V5 à valider) | Distance de course multipliée par un et demi. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-050 | L06 p.361 | Stealthy / Furtif | Discrétion rurale à Agilité+10, ajustable MJ ; pas le bonus de DR V4. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-051 | L06 p.361 | Striding Gait (Terrain) / Foulée adaptée (alias à valider) | Ignore pénalités de terrain nommé, +1 DR Athlétisme/Discrétion dans ce terrain. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-052 | L06 p.362 | Stupid / Stupide | Guidé par allié non Stupide, sinon Intelligence +4 DR au début du Round ; échec prive du Mouvement et de l’Action. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-053 | L06 p.362 | Swarm / Nuée | Psychologie et Taille ignorées ; mouvement ignore engagement ; Blessures quintuplées et CC accrue ; Blessure directe aux engagés en fin de Round ; tir facilité de quatre DR. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-054 | L06 p.362 | Tail / Attaque caudale | Perdre Élan pour attaque gratuite à BF+2 ; cible plus petite blessée devient À terre. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-055 | L06 p.362 | Tentacles (Number) / Tentacules | Une attaque gratuite par tentacule à BF ; dégâts peuvent donner Enchevêtré puis empoignade, résolue avec cette attaque gratuite. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-056 | L06 p.362 | Territorial / Territorial | Défend le territoire jusqu’à la mort ; cesse normalement la poursuite à sa frontière. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-057 | L06 p.362 | Terror (Rating) / Terreur | Premier contact : Psychologie ou Brisé égal indice plus chaque DR négatif ; Peur de même indice ensuite, quel que soit le résultat. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-058 | L06 p.362 | Tongue / Langue préhensile | Perdre Élan pour tir gratuit à BF, entrave et attire une cible plus petite ; choix libérer, attaque supplémentaire ou empoignade. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-059 | L06 p.363 | Tracker / Pisteur | Compétence Pistage à Intelligence+10, augmentable MJ. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-060 | L06 p.363 | Trained (Skills) / Dressé | Compétences d’animal dressé : Dompté, Trait, Divertir, Rapporter, Garde, Retour, Magie, Monture, Guerre ; leurs effets sont distincts. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-061 | L06 p.363 | Undead / Mort-vivant | Absence de besoins vitaux, nature reconnue par les sorts et miracles spécifiques. | assisted | js/core/v5-magic-attributes.js:103 |
| E0-T-062 | L06 p.363 | Unstable / Instable | Fin de Round engagé contre Élan adverse sans le sien : deux Blessures ; à zéro, disparition/destruction. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-063 | L06 p.363 | Vampiric / Vampirique | Morsure sur proie admissible soigne autant que les Blessures infligées ; seule méthode de soin. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-064 | L06 p.363 | Venom (Difficulty) / Venin | Blesser donne Empoisonné ; difficulté du Trait gouverne sa récupération. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-065 | L06 p.363 | Vomit / Vomissement | Si commence engagé, consomme Mouvement et Action ; CT +4 DR opposée à Esquive de tous à deux yards, dégâts BE+4, Sonné et dégradation d’objets ; délai douze heures. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-066 | L06 p.363 | Ward (Rating) / Protection (alias à valider) | D10 après coup : atteindre le seuil ignore le coup, même critique ; lecteur existant seulement pour les couches de protection explicitement structurées. | reminder | js/core/v5-magic-combat.js:201 |
| E0-T-067 | L06 p.363 | Wallcrawler / Grimpant | Plein Mouvement sur murs/plafonds et réussite automatique des Tests d’Escalade. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-068 | L06 p.363 | Web (Rating) / Toile | Touche donne un Enchevêtré ayant la Force indiquée. | reminder | js/core/v5-divine-effects-gear.js:202 |
| E0-T-069 | L11 p.135 | Arboreal / Arboricole | Ajoute le Bonus d’Agilité aux DR d’Escalade et de Discrétion. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-070 | L11 p.135 | Armour (Rating) / Armure | PA à toutes localisations, valeur entre parenthèses incluant BE ; ne pas importer deux fois l’Endurance. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-071 | L11 p.135 | Big / Grand | +10 Force/Endurance, −5 Agilité. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-072 | L11 p.135 | Brute / Brutal | −1 Mouvement, −10 Agilité, +10 Force/Endurance. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-073 | L11 p.135 | Clever / Intelligent | +20 Intelligence et +10 Initiative. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-074 | L11 p.135 | Cunning / Rusé | +10 Sociabilité, Intelligence et Initiative. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-075 | L11 p.135 | Die Hard / Increvable | À la mort si corps intact, Endurance étendue de six DR à chaque début de Round pendant BE Rounds ; réussite revient avec une Blessure. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-076 | L11 p.135 | Elite / Élite | +20 CC, CT et Volonté. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-077 | L11 p.135 | Fast / Rapide | +1 Mouvement et +10 Agilité. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-078 | L11 p.136 | Fury / Rage | Un Avantage pour Haine des adversaires proches ; trois pour Frénésie puis perte totale d’Avantage. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-079 | L11 p.136 | Hardy / Coriace | Blessures accrues de BE avant multiplicateur de Taille. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-080 | L11 p.136 | Leader / Meneur | +10 Sociabilité et Volonté. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-081 | L11 p.136 | Prejudice (Target) / Préjugé | Aversion envers la cible, renvoi aux règles sociales du socle V4. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-082 | L11 p.136 | Ranged (Rating) / À distance | Arme à distance dont les dégâts sont l’indice. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-083 | L11 p.136 | Rear / Se cabrer | Mouvement remplacé par Piétinement contre plus petit à BF. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-084 | L11 p.137 | Stride / Foulée | Course multipliée par un et demi. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-085 | L11 p.137 | Swamp-strider / Limicole | Pas de pénalité de déplacement en terrain marécageux. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-086 | L11 p.137 | Tough / Endurant | +10 Endurance et Volonté. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-087 | L11 p.137 | Weapon (Rating) / Arme | Attaque de mêlée aux dégâts indiqués. | reminder | js/data/v5-transformation-bestiary.js:16 |
| E0-T-088 | L11 p.135 | Belligerent — Zoo | Plus d’Avantage que l’adversaire donne immunité à toute Psychologie. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-089 | L11 p.135 | Amphibious — Zoo | Bonus d’Agilité aux DR de Natation, au lieu du +1 DR V5. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-090 | L11 p.136 | Ghostly Howl — Zoo | Coût deux Avantages puis perte totale, portée Initiative et résistance Endurance +20 ; diffère de L06. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-091 | L11 p.136 | Size — Zoo | Dégâts multiplicateurs, Peur/Terreur par écart et Avantage ; conserver la version V5 et les arbitrages Petit séparés. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-092 | L11 p.137 | Unstable — Zoo | Blessures en fin de Round selon écart d’Avantage ; pas les deux Blessures fixes du texte V5. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-093 | L11 p.136 | Magic Resistance — Zoo | Réduit les DR de l’indice indiqué ; ne pas remplacer le −3 DR V5. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-094 | L11 p.135 | Chill Grasp — Zoo | Coût Avantage V4 et choix d’opposition différent ; ne pas réutiliser sans conversion. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-095 | L11 p.137 | Vomit — Zoo | Attaque gratuite à coût d’Avantage, contre budget Mouvement+Action et délai V5. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-096 | L11 p.13 | Spiteful | Haine de ses anciens adversaires. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-097 | L11 p.15 | Snare ‘Em Good | Effet de Pieds Enchevêtrés de Taal sous forme de toiles ; ne vaut pas un nouveau sort de CN. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-098 | L11 p.15 | Borrowed Courage | Le gobelin monté sur une araignée géante ne subit plus Craintif envers les elfes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-099 | L11 p.17 | Strength of the Pack | +10 supplémentaire aux modificateurs de surnombre des grands loups. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-100 | L11 p.17 | His Own Pack | Raukos a une attaque gratuite par Tour et compte comme deux adversaires dans les deux sens du surnombre. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-101 | L11 p.19 | The Bone Hump | Renfort osseux d’Ol’ Gribbleback reflété dans son profil ; ne pas rajouter un bonus non chiffré. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-102 | L11 p.21 | Piercing Cry | En charge, deux Avantages pour cri gratuit ; ennemis dans BE yards : Volonté −20 ou Sonné. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-103 | L11 p.21 | Swiftsense | Les serres du griffon sont Rapides. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-104 | L11 p.23 | Swallow Whole | Critique ou Blessures au moins deux BE sur cible pas plus grande : Force opposée, entraves selon marge ; échec d’évasion fait avaler. Digestion de dix Blessures par Round sans armure ; Volonté puis attaques de petite arme, vingt Blessures cumulées pour sortir. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-105 | L11 p.23 | Burrow | Déplacement souterrain à l’indice, franchissement des obstacles, charge possible ; doit continuer si commence enfoui, portée de tir modifiée. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-106 | L11 p.25 | Too Ornery to Die | Ignore les effets du premier critique du combat. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-107 | L11 p.25 | Harder Than Stone | Armure de Krag-Breaker Impénétrable. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-108 | L11 p.30 | A Fool’s End | Souffle sans armure ; blessé : Volonté −20 ou Stupide pendant BE Rounds. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-109 | L11 p.30 | The Forest is My Shield | En forêt, pas de surnombre et tirs −20 ; certains tirs ratés frappent arbres ou engagés selon MJ. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-110 | L11 p.31 | Stolen Claws | Les griffes de Caledair ignorent toute armure. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-111 | L11 p.32 | A Wyvern’s Spite | Surpris par vouivre : Volonté ou −10 aux Tests et Chance interdite jusqu’à mort de la vouivre ou perte de cinq Blessures. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-112 | L11 p.36 | Damn Lucky Fish | Certains vieux stirpikes nommés possèdent trois points de Chance. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-113 | L11 p.36 | Limber Tail | Attaque de queue chaque Round sans coût d’Avantage. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-114 | L11 p.37 | Shocked Recognition | Reconnaître la personne déformée : Volonté −10 ou Sonné. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-115 | L11 p.41 | Master of the Lash | Chef proche suspend Stupide de rats-ogres et Craintif des rats ; filets en mêlée sans toucher alliés sauf Maladresse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-116 | L11 p.41 | I AM UNSTOPPABLE! | Cavalier skaven immunisé Psychologie ; mort du Bonebreaker donne cinq Brisé au cavalier, un aux skavens proches. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-117 | L11 p.41 | Mouth Full of Razors | Crocs Pénétrants du rat-loup. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-118 | L11 p.41 | In Sigmar’s Name, What Is That THING? | Calme −10 contre Peur/Terreur du spécimen. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-119 | L11 p.45 | Engulf | Une cible pas plus grande peut être engloutie à la touche, entravée selon BF ; BF Blessures directes par Round. Une seule victime, blessée aussi par les coups portés à l’amibe ; mort ou immobilité déclenche la retraite pour digestion. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-120 | L11 p.45 | Jelly from Hell | Blessures ordinaires divisées par deux ; seules feu, froid extrême ou magie peuvent normalement tuer définitivement. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-121 | L11 p.45 | Mostly Mindless | Sans caractéristiques mentales ; immunité Psychologie sauf feu approché donnant Brisé, BF substitué à BFM. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-122 | L11 p.47 | Four-Fold Knowing Gaze | Pas de Surpris, quatre adversaires requis pour surnombre, une inversion de Test de combat par Round. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-123 | L11 p.49 | Full o’ Fish & Worse | Premier vomissement du combat sans dépense d’Avantage. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-124 | L11 p.49 | Rotten Stench | Vivants dans BE yards : −10 général, non cumulatif entre mêmes odeurs. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-125 | L11 p.49 | Copious Vomit | Premier vomissement gratuit et dégâts propres du profil de sorcière troll. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-126 | L11 p.49 | Overwhelming Stench | Première exposition : Volonté ou Sonné, puis effets de puanteur ordinaire. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-127 | L11 p.50 | Hallucinogenic Cloud | Mammifères proches : Endurance −20 ou vision paralysante pendant trois Rounds plus DR négatifs ; réussite protège un jour contre cet individu. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-128 | L11 p.50 | Painless Bite | S’accroche après touche, draine une Blessure directe par Round jusqu’à satiété ; arracher blesse et fait saigner, sel libère. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-129 | L11 p.52 | Endless Coils | Empoigne simultanément jusqu’à cinq cibles plus petites. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-130 | L11 p.54 | Seven Shrewd Glares | Ne peut être Surpris ni en infériorité numérique. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-131 | L11 p.57 | Ruthless Strike | Round de charge du pégase noir : attaques Empaleuses/Pénétrantes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-132 | L11 p.59 | Murder on the Wing | Les attaques de la volée sont Empaleuses/Pénétrantes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-133 | L11 p.61 | Endless Malice | Après proie incapacitable, Volonté ou consomme prochain Mouvement/Action pour la déchirer ; critique à l’inconscient, Peur 2 des témoins. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-134 | L11 p.63 | Lightning from a Clear Sky | Toutes attaques de l’aigle géant Rapides et Pénétrantes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-135 | L11 p.65 | Wicked Claws | Serres de cockatrice portent Venin Difficile. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-136 | L11 p.67 | We See You | Ni Surpris ni infériorité numérique pour la chimère et sa variante. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-137 | L11 p.67 | Mangling Jaws | Morsure de l’Oblast Beast avec Taille et Pénétrante. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-138 | L11 p.70 | Endless Rage | Frénésie permanente du Skin Wolf. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-139 | L11 p.75 | Blazing Body | Dégâts aux engagés à fin de Round ; BE doublé contre attaques non magiques. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-140 | L11 p.75 | Bloodrage | Frénésie et Haine de tout permanentes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-141 | L11 p.76 | Barbed Forelimbs | Touche entrave et permet empoignade ; deux adversaires entravés maximum. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-142 | L11 p.76 | Vibrational Senses | Détecte les corps physiques dans quatre BI yards et empêche Surpris. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-143 | L11 p.76 | Vicious Mandibles | Morsure Empaleuse et Pénétrante. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-144 | L11 p.77 | Flight of Razors | Volée avec règles de Nuée ; dégâts de bec imposent Endurance +20 ou Hémorragique. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-145 | L11 p.79 | Unstoppable Charge | Trois Avantages lors d’une charge de stégadon. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-146 | L11 p.81 | Blood Frenzy | Première Blessure infligée déclenche Frénésie jusqu’à élimination des ennemis détectés. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-147 | L11 p.82 | Disruption | Instable traite son Avantage comme diminué de deux contre ses adversaires, sans perte réelle d’Avantage. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-148 | L11 p.82 | Rahagra’s Gift | Armes naturelles du lion de guerre Rapides et Pénétrantes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-149 | L11 p.85 | Cruel Claws / The Cruellest Claws | Pinces Pénétrantes du léviathan ; la variante nommée ajoute Taille. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-150 | L11 p.85 | Crustacean | Respiration aquatique, Mouvement huit dans l’eau. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-151 | L11 p.86 | Siren’s Song | Auditeurs : Volonté −10 ou attirés sans autre action ; oreilles bouchées facilitent, attaque autorise nouveau Test. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-152 | L11 p.86 | Water Born | Respiration aquatique et Mouvement huit dans l’eau. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-153 | L11 p.88 | Whale Bane | Gueule du Merwyrm porte Venin Difficile. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-154 | L11 p.90 | Rabid Frenzy | Blessure reçue : Frénésie irrépressible et deux Tests de mêlée gratuits par Round. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-155 | L11 p.90 | Razor Scales | Toute attaque par un engagé lui renvoie d10 dégâts, protections normales et minimum une Blessure. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-156 | L11 p.90 | Rock Melter | Morsure Pénétrante et Venin. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-157 | L11 p.91 | Breath of Nightmares | Blessures sans armure ; Terreur 2 résistée par Endurance même si immunisé Peur/Terreur, car poison. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-158 | L11 p.93 | Wight Blade | Arme magique Empaleuse ; critique tire deux gravités et retient la plus haute. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-159 | L11 p.95 | Made-Made Myself | Le pistolet du technomage perd Dangereuse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-160 | L11 p.95 | Shoot-Kill | Canon du prototype perd Imprécise. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-161 | L11 p.95 | Murder-Crush | Masse du prototype à Impact et Assommante. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-162 | L02 p.81 | Companion Trait (Species) / Trait de compagnon | À quatre yards du lanceur lié, donne deux talents selon espèce, ou +1 DR s’ils sont déjà connus ; effets comportementaux et corruption, cumul de familiers autorisé. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-163 | L02 p.81 | Companion — Deception / Compagnon Renard | Donne Baratiner et Intrigant ; comportements et dérives de paranoïa. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-164 | L02 p.81 | Companion — Divination / Compagnon Hibou | Donne Visions divines et Sixième sens ; comportements et obsession des détails. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-165 | L02 p.81 | Companion — Perception / Compagnon Hermine | Donne Œil du chasseur et Filature ; comportements et territorialité accrue. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-166 | L02 p.81 | Companion — Resilience / Compagnon Blaireau | Donne Robuste et Tenace ; comportements et agressivité accrue. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-167 | L02 p.81 | Companion — Stealth / Compagnon Chat | Donne Chat de gouttière et Vagabond ; comportements de discrétion et détachement. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-168 | L02 p.82 | Companion — Transformation / Compagnon Corbeau | Donne Flair et Maître du déguisement ; comportements et jugement moqueur. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-169 | L02 p.82 | Animal Telepathy / Télépathie animale | Communication silencieuse bidirectionnelle avec le lanceur lié, à quatre yards, limitée par l’Intelligence de l’animal. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-170 | L02 p.82 | Messenger / Messager | Livre un message jusqu’à Intelligence miles sans Test d’Intelligence pour les ordres complexes éloignés ; risque de trajet MJ. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-171 | L02 p.82 | Sensory Sharing / Partage sensoriel | Vue, ouïe et odorat empruntés au familier jusqu’au plus petit des deux scores de Volonté en miles ; pas de lancement depuis son corps. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-172 | L02 p.82 | Invisibility — Animal Familiar / Invisibilité du familier animal | Une fois par jour, pendant Volonté heures sans fin anticipée ; Perception −30, caché repérable seulement par Sens magique. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-173 | L07 p.166 | Stationary Attacker | Immunité Psychologie et absence de déplacement ; proie non avertie entrant à portée est engagée et Surprise. Portée selon Taille, détection puis identification requises. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-174 | L07 p.166 | Warm-blooded / Cold-blooded categories | Classement des espèces pour maladies et prédateurs ; peaux-vertes et trolls hors des deux catégories, créatures magiques aussi ; cas limites MJ. Ce n’est pas le Trait À Sang-froid. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-175 | L07 p.167 | Blood Hungry Spore Cloud | Mouvement d’un sang-chaud assez grand à un yard : nuage cinq yards pendant 2d10 Rounds ; Endurance −10 ou Hémorragique, risque de maladie propre. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-176 | L07 p.167 | Entangled Attack — Creeper Vine | N’attaque les sang-chauds avec ses armes qu’après les avoir entravés ; une frappe par Tour jusqu’à libération ou mort. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-177 | L07 p.167 | Impale Attack — Spikethorn | Vise toujours les jambes sans malus de coup ciblé, ignore cuir et gagne Empaleuse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-178 | L07 p.168 | Magical Snack | Manger un Itxi : +1 DR de lancement/canalisation pendant 3d10 Rounds, non cumulatif. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-179 | L07 p.168 | Brain Rot | Critique tête sur sang-chaud par Brainfluke : parasite dans le crâne et maladie Brain Rot. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-180 | L07 p.168 | Posterior Flame / Use as Ammunition | Fireleech stressée : feu de contact 1d10 Rounds ; manipulation selon sang-froid/chaleur, échec de préparation brûle le porteur. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-181 | L07 p.169 | Excruciating Sting | Tant que l’Empoisonné de cette guêpe persiste, Calme −10 au début du Tour ou Sonné. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-182 | L07 p.170 | Odour Attack — Blot Toad | Sang-froids dans 1d10 yards : Endurance ou Nausée 1d10 heures ; sang-chauds exempts. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-183 | L07 p.171 | Venomous Bite — Scalemane | Deux Empoisonné au lieu d’un. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-184 | L07 p.172 | Venomous Bite — Blue-ringed Asp | Empoisonné accompagné d’Hémorragique qui dure jusqu’à résolution du poison. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-185 | L07 p.172 | Boring Attack | Morsures Dévastatrices et Empaleuses. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-186 | L07 p.174 | Cold One Mounts | Dressé Monture ajoute Stupide ; cavalier sang-chaud doit s’enduire de bave toxique, Endurance ou perte de certains sens. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-187 | L07 p.175 | Shooting Spine Attack | Tire des épines seules ou en salve ; régénération des épines sur une journée, pas cadence inventée. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-188 | L07 p.177 | Unstoppable Charge — Stegadon | Trois Avantages en charge. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-189 | L07 p.178 | Lizardman Artillery | Armes de plateforme ; certaines exigent les Vents et ajoutent Enflammé selon DR ; règles d’artillerie distinctes. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-190 | L07 p.179 | Ramming Attack — Pliodon | Collision contre bateaux, indice initial quatorze si en bonne santé. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-191 | L07 p.180 | Blood Frenzy — Carnosaur | Blessure infligée : Frénésie jusqu’à mort des ennemis détectés. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-192 | L07 p.180 | Toxic Bile — Troglodon | Bile à quinze yards donnant Enflammé aux touchés ; cartouche d’attaque à préciser. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-193 | L07 p.181 | Fearsome Roar | Prédateurs énormes/monstrueux : Calme −10 ou quittent la zone ; autres proies : Calme −20 ou fuite. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-194 | L02 p.91 | Easily Confused / Facilement désorienté (traduction de travail) | Changement de situation : Intelligence +40 ou Sonné ; nouveau Test à chaque début de Tour pour récupérer, Résolution possible. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-195 | L04 p.133 | Trained — Hunting Hound / Dressé — chasse canine | Dompté préalable, une heure puis Dressage −10 pour apprendre ; échec impose une journée de repos ; permet aide de chasse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-196 | L04 p.133 | Trained (Dig) / Dressé (Creuser) | Dressage +20 du maître pour creuser à l’endroit commandé. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-197 | L04 p.133 | Trained (Heel) / Dressé (Au pied) | Dressage +20 pour revenir au pied malgré les distractions. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-198 | L04 p.133 | Trained (Hunt) — Hound / Dressé (Chasser) — chien | Dressage +20 ordonne poursuite, mise à mort et rapport ; mêlée à 0 pour résultat de chasse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-199 | L04 p.133 | Trained (Point) / Dressé (Marquer) | Indique de façon fiable un objet ou gibier à odeur distinctive. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-200 | L04 p.133 | Trained (Round) / Dressé (Rabattre) | Dressage à 0 pour guider le gibier sans l’effrayer. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-201 | L04 p.133 | Trained (Track) / Dressé (Pister) | Trait Pisteur utilisé sur commande et odeur donnée. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-202 | L04 p.134 | Trained — Hunting Hawk / Dressé — fauconnerie | Dompté préalable, trois heures puis Dressage −20 ; repos d’un jour après échec ; aide à la chasse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-203 | L04 p.134 | Trained (Hunt) — Hawk / Dressé (Chasser) — faucon | Poursuit, tente de tuer puis rapporte ; mêlée à 0 pour le résultat. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-204 | L04 p.134 | Trained (Circle) / Dressé (Cercler) | Repère une proie ou objet depuis le ciel et tourne pour en indiquer la position. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-205 | L04 p.134 | Trained (Return) / Dressé (Revenir) | Emprise sur animaux opposée à Volonté du rapace pour retour immédiat. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-206 | L07 p.151 | Telepathy / Télépathie | Transmet et lit des pensées ; Calme +20 permet de résister à la lecture. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-207 | L07 p.151 | Chameleon / Caméléon | Perception −4 DR pour le voir, −2 en mouvement ; tirs contre lui −2 DR. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-208 | L07 p.165 | Flammable / Inflammable | Tests pour éviter Enflammé à −20 ; Blessures d’Enflammé doublées. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-209 | L07 p.165 | Grim (Rating) — Lustria / Féroce — variante Lustria | Début de Tour : monte l’Avantage à l’indice, sauf entravé, Surpris ou Inconscient ; variante de groupe fournit l’indice à la réserve adverse. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-210 | L07 p.168 | Aquatic / Aquatique | Étiquette du Brainfluke ; les passages lus ne précisent pas son coefficient de déplacement ni ses limites respiratoires. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-211 | L07 p.125 | Auger and Scryer / Augure slann | Accès à Psychométrie comme compétence de base et exception à l’incompatibilité avec la magie. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-212 | L07 p.125 | Contemplation / Contemplation slann | Perception selon circonstance et DR : éveillé, Stupide, Exténué avec demi-budget ou absence de réaction ; nouveaux stimuli permettent retenter. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-213 | L07 p.125 | Knack for Total Power / Puissance totale slann | Lancement réussi critique aussi sur unité zéro ; relance de perception des Vents en Lustrie. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-214 | L07 p.125 | Master of Magical Mishaps / Maître des incidents | Incident majeur devient mineur, sauf lancement à travers un autre mage. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-215 | L07 p.126 | Emergency Teleportation / Téléportation de secours | À dix Blessures ou critique grave : action gratuite pour lancer Téléportation vers un sanctuaire sûr. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-216 | L07 p.126 | Relic Priest / Prêtre relique | Esprit lié à la momie, destruction du corps détruit l’esprit ; deux lancements possibles si aucun autre emploi ; corps À terre. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-217 | L07 p.126 | Telepathy — Slann Network / Télépathie — réseau slann | Réseau local ou géomantique ; Action ou Mouvement avec Intelligence pour communiquer ou lancer via un prêtre skink qui reçoit les incidents. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-218 | L07 p.126 | Palanquin / Palanquin | Donne Vol 16, Protection 8+ et couvert selon direction du tir. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-219 | L07 p.127 | Slann on the Ground / Slann au sol | Hors palanquin, −3 DR aux lancements et canalisations. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-220 | L09 p.44 | Belligerent — Temple of Spite / Belliqueux — Temple of Spite | Immunité Peur si Élan propre et aucun Élan adverse ; différence avec L06. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-221 | L09 p.46 | Cold-blooded — Temple of Spite / À Sang-froid — Temple of Spite | Inversion des Calme ratés, et maintien de la première occurrence de Surpris ; pas l’Avantage du socle V5. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-222 | L09 p.47 | Many Heads — Temple of Spite / Plusieurs têtes — Temple of Spite | Règle des têtes valides et attaques par tête ; identique au principe du socle V5, renvoi de page interne à vérifier. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-223 | L09 p.49 | Marine Creature / Créature marine | Plein Mouvement aquatique ; hors eau, Mouvement un, −2 DR et besoin d’humidification pour éviter suffocation. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-224 | L09 p.51 | Mark of Slaanesh / Marque de Slaanesh | Sans peur de tout, Étiquette et rivalités visibles ; apprentissage de talents autorisé selon liste. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-225 | L09 p.52 | Coven Sorcerer / Sorcier de couvent | Doit recevoir un gabarit de sorcière, Équitation accrue et accès à plusieurs listes de magie. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-226 | L09 p.52 | Prey of the Dark Prince / Proie du Prince noir | Perd Protection 8+ si engagé par une créature marquée Slaanesh. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-227 | L10 p.68 | Fearless — Crypt Ghast / Sans peur — Crypt Ghast | Le profil liste Sans peur sans spécialisation ; ne pas inventer son groupe d’immunité. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-228 | L13 p.107 | Trained (Shock Cavalry) / Dressé (Cavalerie de choc) | Dressé Guerre préalable ; charge traverse plus petits, Esquive ou dégâts 4+BF, chaque victime ralentit de deux yards ; plus grands bloquent. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-229 | L14 p.83 | Attuned to Magic / Accordé à la magie | Table des Vents modifie Protection et DR du phénix, de faible à forte saturation. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-230 | L14 p.83 | Vulnerable to Cold / Vulnérable au froid | Endurance contre exposition au froid : −4 DR. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-231 | L14 p.83 | Wake of Fire / Sillage de feu | Contact ou mêlée donne Enflammé ; Mouvement plus Action arrose la trajectoire de braises, Esquive ou Enflammé. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-232 | L14 p.83 | Phoenix Reborn / Renaissance du phénix | Lancement spécial à la mort ; après délai, revient avec Blessures aléatoires selon DR. Détails de lancement inventoriés en D0b. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-233 | L14 p.84 | Vulnerable to Heat / Vulnérable à la chaleur | Endurance contre exposition à la chaleur : −4 DR. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-234 | L14 p.84 | Freezing Aura / Aura glaciale | Engagé ou contact proche : Test d’exposition au froid à chaque Tour. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-235 | L14 p.84 | Phoenix Mounts / Monture phénix | Pas de Dressé : coopération volontaire de la créature, cavalier doit résister à sa chaleur ou au froid. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-236 | L16 p.84 | Breath (Brimstone Fire) / Souffle de soufre | Deux Avantages pour souffle gratuit de zone sans armure ; Enflammé, Aveuglé et deux Empoisonné aux perdants, magique. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-237 | L17 p.174 | Ashes to Ashes / Cendres de l’élémentaire | Ennemis engagés : Calme +20 ou −20 en mêlée. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-238 | L17 p.174 | Gift of Fire / Don du feu | Au début du Tour, d10 peut enflammer un objet proche ; poudre portée soumise au même risque, délai pour jeter l’objet. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-239 | L17 p.174 | Mindless Spellcaster / Lanceur sans esprit | Force remplace la caractéristique de lancement pour l’élémentaire de Feu. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-240 | L17 p.175 | Consume Life / Consumer la vie | Après mort d’un adversaire, d10 de soin par dix Blessures de celui-ci, au-delà du maximum possible. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-241 | L17 p.175 | Amethyst Fog / Brume améthyste | Remplace attaque par Endurance −20 des engagés ; Empoisonné par DR négatif, poison magique traversant les immunités ordinaires. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-242 | L17 p.175 | Hourglass of Shyish / Sablier de Shyish | Briser le sablier étend la brume à trente yards ; l’élémentaire subit ensuite 6d10 Blessures, réduites par BE mais pas Protection. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-243 | L17 p.175 | Soundless / Silencieux | +2 DR de Discrétion. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-244 | L17 p.176 | Howl of the Great Beast / Hurlement de la Grande Bête | Un Avantage : cri gratuit, trois Assourdi et Calme −10 ou trois Brisé ; réussite protège pour la rencontre. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-245 | L17 p.176 | Grim (Rating) — Winds of Magic / Féroce — Winds of Magic | Début de Tour : Avantage porté à l’indice ; variante de groupe ajoute l’indice à la réserve adverse. Exceptions de Lustria non répétées ici. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-246 | L17 p.214 | Random Caster / Lanceur aléatoire | Quand attaqué, une fois par Round tire la tradition, puis un sort choisi ou aléatoire ; sources de certains domaines hors corpus. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-247 | L17 p.214 | Spell Syphon / Siphon de sort | Après sort ennemi réussi, Volonté opposée puis d10 : siphon, miroir ou explosion ; Calme −30 du lanceur peut éviter Inconscient et deux Corruption. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-248 | L17 p.217 | Bale Eye / Œil funeste | Seconde vue, +2 DR aux observations aidées, +1 DR lancement/canalisation ; Perception peut arrêter un lancement avec incident en annulant les deux. | absent | js/core/v5-magic-reminder-flags.js:33 |
| E0-T-249 | L11 p.23 | Breath (Slime) / Souffle de bave | Ignore armure ; pendant BE Rounds, chaque action physique exige Agilité +20 ou À terre. | absent | js/core/v5-magic-reminder-flags.js:33 |

## Profils par livre

`count` compte les noms de Traits de base transcrits, sans les valeurs, sous-types, options ni talents séparés. Zéro signifie aucune liste distincte extraite/retenue, pas absence de toutes capacités. Les capacités particulières renvoient aux entrées de règles par `abilityRefs`. Les profils ci-dessous sont un index de sources ; ils ne sont pas importés dans le moteur.

### L01 — 15 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 14 | ISROGDAL THE URGENT — OGRE PROTAGONIST, FORMER PUGILIST (SILVER 1) | profile | Armour, Weapon | 2 |
| 14 | UGRIK THE LOST — OGRE OUTLAW (BRASS 2) | profile | Armour, Weapon | 2 |
| 26 | Nazzaalta Talltale — Ogre Stevedore | profile |  | 0 |
| 26 | Artur Hammerfoot — Ogre Artisan | profile |  | 0 |
| 34 | Rhinox | profile | Armour, Bestial, Fear, Fury, Hardy, Horns, Painless, Size, Stride, Weapon | 10 |
| 74 | MARGARET VON ASCHENDORF — ABBESS (SHALLYA) (SILVER 2) | profile |  | 0 |
| 75 | CLEMENTINE CLAUSEWITZ — NUN (SHALLYA) (BRASS 4) | profile |  | 0 |
| 75 | MARIE DUVALLIER — NUN (SHALLYA), FORMER PHYSICIAN (BRASS 4) | profile |  | 0 |
| 75 | ANNA-LISE LEVERTSKE — NUN, FORMER APOTHECARY (BRASS 4) | profile |  | 0 |
| 76 | TYPICAL SISTER — NUN (SHALLYA) (BRASS 4) | profile |  | 0 |
| 76 | HANNA BRATSCH — ATTENDANT, FORMER SERGEANT (BRASS 3*) | profile | Armour, Weapon | 2 |
| 77 | ERZBET WEGENER — PATIENT (BRASS 0) | profile | Immunity to Psychology | 1 |
| 78 | ADALMANN VON HOPFBERG — NOBLE LORD (GOLD 7) | profile |  | 0 |
| 79 | ISABELLA — SEER (BRASS 4) | profile | Fear, Frenzy, Fury, Immunity to Psychology | 4 |
| 80 | RICHTER KLESS — PROFESSOR (GOLD 1) | profile | Mental Corruption | 1 |

### L02 — 12 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 30 | GRAFINA GRISELDA — HUMAN MAGNATE | profile | Weapon | 1 |
| 76 | BADGER | profile | Animal Telepathy, Armour, Belligerent, Bestial, Companion Trait, Hardy, Night Vision, Size, Skittish, Trained, Weapon | 11 |
| 77 | CROW | profile | Animal Telepathy, Bestial, Companion Trait, Flight, Size, Skittish, Trained, Weapon | 8 |
| 77 | FOX | profile | Animal Telepathy, Bestial, Companion Trait, Night Vision, Size, Skittish, Stride, Tracker, Trained, Weapon | 10 |
| 77 | CAT | profile | Animal Telepathy, Bestial, Companion Trait, Night Vision, Size, Skittish, Stealthy, Stride, Trained, Weapon | 10 |
| 77 | OWL | profile | Animal Telepathy, Bestial, Companion Trait, Night Vision, Flight, Size, Skittish, Stealthy, Trained, Weapon | 10 |
| 78 | STOAT | profile | Animal Telepathy, Bestial, Bite, Companion Trait, Night Vision, Size, Skittish, Stealthy, Trained, Weapon | 10 |
| 90 | LORD ADALBERT KNOPP-INZEL — HUMAN FIRST — KNIGHT (AND SPY) | profile | Armour, Easily Confused, Weapon | 3 |
| 92 | BROTHER SAMHEL — HUMAN PRIEST OF MORR | profile | Weapon | 1 |
| 93 | ELLA TERENZ — HUMAN CON ARTIST | profile | Weapon | 1 |
| 94 | LEONARD — HUMAN SQUIRE | profile | Armour, Weapon | 2 |
| 94 | RIDREK BLACKHELM — DWARF ENTERTAINER — (AND SPY) | profile | Weapon | 1 |

### L03 — 13 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 23 | MISODOCTAKLEIDIST ‘DOC’ ASHFIELD — SOLDIER (SILVER 3) | profile | Ranged, Weapon | 2 |
| 24 | THOMASINA ‘TINA’ BRAMBLEDOWN — BARGESWAIN (SILVER 3) | profile | Weapon | 1 |
| 27 | LUITPOLDSTRASSE ‘LOUIS’ LOSTPOCKETS — MASTER BEGGAR (BRASS 4) | profile | Weapon | 1 |
| 28 | BELLIQUOTIOUS ‘BELLA’ LOWHAVEN IV — RACKETEER (BRASS 5) | profile | Weapon | 1 |
| 29 | SUFFONSIFICATION ‘SUFFY’ RUMSTER LVI — APPRENTICE ARTISAN (BRASS 2) | profile | Weapon | 1 |
| 30 | SPOONDRIFT ‘SPOONY’ SKELFSIDER – GRAVE — ROBBER (BRASS 3) | profile | Weapon | 1 |
| 31 | THELONIUS HARDCASTLE MONKENBRIDGE — THORNCOBBLE XII – SCION (GOLD 1) | profile | Weapon | 1 |
| 56 | ALRIK SKAGSSON – INQUISITOR (SILVER 5) | profile | Armour, Ranged, Weapon | 3 |
| 56 | KARSTIN LARGSDOTTIR – AGENT (GOLD 1) | profile | Weapon | 1 |
| 57 | THYK HURGARSSON – FELLOW (SILVER 5) | profile | Armour, Weapon | 2 |
| 62 | VOLUND SLIVERSCAR — CHARTERED ENGINEER (GOLD 2) | profile | Armour, Ranged, Weapon | 3 |
| 63 | GURNIKSSON HAMMERBACK – MINER FOREMAN | profile | Armour, Weapon | 2 |
| 63 | RAGNI THORISSON – OFFICER (GOLD 1) | profile | Armour, Weapon | 2 |

### L04 — 22 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 34 | BLACK GUARD OF MORR (KNIGHT) | profile | Armour, Weapon | 2 |
| 47 | FENCE | profile | Weapon | 1 |
| 47 | FORGER | profile | Weapon | 1 |
| 48 | RACKETEER | profile | Armour, Weapon | 2 |
| 48 | BAWD | profile | Weapon | 1 |
| 49 | CHARLATAN | profile | Weapon | 1 |
| 49 | SAFE HOUSE OWNER (TOWNSMAN) | profile | Weapon | 1 |
| 55 | AUGUST STERNWACHTER | profile | Weapon | 1 |
| 64 | ALBRECHT ‘THE FISH’ — GANG BOSS | profile | Armour, Ranged, Weapon | 3 |
| 65 | GUNNA VON SPERREN — SMUGGLER KING | profile | Ranged, Weapon | 2 |
| 83 | FATHER PEDRAGAR, PRIEST OF TAAL | profile | Ranged, Ward, Weapon | 3 |
| 93 | WATCHMAN | profile | Armour, Weapon | 2 |
| 93 | WATCH SERGEANT | profile | Armour, Weapon | 2 |
| 103 | OUTLAW | profile | Armour, Ranged, Weapon | 3 |
| 103 | OUTLAW CHIEF | profile | Armour, Ranged, Weapon | 3 |
| 108 | A TYPICAL BOUNTY HUNTER | profile | Armour, Ranged, Weapon | 3 |
| 111 | BRUNNER | profile | Armour, Ranged, Weapon | 3 |
| 133 | HOCHLAND LOCKHUND | profile | Bestial, Night Vision, Skittish, Size, Stride, Tracker, Weapon | 7 |
| 133 | NORDLANDER BAMSE | profile | Bestial, Night Vision, Skittish, Size, Stride, Tracker, Weapon | 7 |
| 133 | GROOTSCHER MARSH HOUND | profile | Bestial, Night Vision, Skittish, Size, Stride, Tracker, Weapon | 7 |
| 134 | DOVE HAWK | profile | Bestial, Fly, Night Vision, Size, Skittish, Weapon | 6 |
| 134 | ARABYAN REDHAWK | profile | Bestial, Fly, Night Vision, Size, Skittish, Weapon | 6 |

### L05 — 58 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 311 | Humain | profile | Arme, Préjugé | 2 |
| 311 | Nain | profile | Animosité, Arme, Haine, Préjugé, Résistance à la Magie, Vision nocturne | 6 |
| 311 | Halfling | profile | Arme, Taille, Vision nocturne | 3 |
| 311 | Elfe (haut et sylvain) | profile | Animosité, Arme, Préjugé, Vision nocturne | 4 |
| 312 | Ogre | profile | Affamé, Arme, Armure, Préjugé, Taille, Vision nocturne | 6 |
| 313 | Pol Dankels — Sorcier humain | profile | Arme, Coriace, Intelligent, Lanceur de Sorts, Préjugé, Rusé | 6 |
| 313 | Bella la Noire — Bandit humain | profile | À distance, Animosité, Arboricole, Arme, Armure, Brutal, Endurant, Préjugé | 8 |
| 314 | Cheval | profile | Arme, Bestial, Foulée, Nerveux, Taille | 5 |
| 314 | Araignée géante | profile | Arme, Bestial, Grimpant, Taille, Toile, Vision nocturne | 6 |
| 315 | Ours | profile | Arme, Armure, Bestial, Foulée, Morsure, Nerveux, Taille, Vision nocturne | 8 |
| 315 | Loup | profile | Arme, Armure, Bestial, Foulée, Nerveux, Pisteur, Vision nocturne | 7 |
| 315 | Chien | profile | Arme, Bestial, Foulée, Nerveux, Taille, Vision nocturne | 6 |
| 316 | Sanglier | profile | Arme, Armure, Bestial, Cornes, Foulée, Nerveux, Vision nocturne | 7 |
| 316 | Rat géant | profile | Arme, Bestial, Foulée, Infecté, Nerveux, Vision nocturne, Taille | 7 |
| 316 | Pigeon | profile | Arme, Bestial, Nerveux, Taille, Vol | 5 |
| 317 | Basilic | profile | À Sang-froid, Arme, Armure, Attaque caudale, Bestial, Foulée, Immunité, Infecté, Morsure, Regard pétrifiant, Taille, Venin, Vision nocturne | 13 |
| 317 | Serpent | profile | À Sang-froid, Arme, Armure, Bestial, Rapide, Taille | 6 |
| 318 | Demigriffon | profile | Arme, Armure, Bestial, Foulée, Morsure, Taille, Vision nocturne | 7 |
| 318 | Bête des marais | profile | Arme, Fabriqué, Increvable, Infecté, Infravision, Instable, Limicole, Regeneration, Stupide, Taille | 10 |
| 319 | Fimir | profile | À Sang-froid, Arme, Armure, Limicole, Taille, Vision nocturne | 6 |
| 319 | Dragon | profile | Arme, Armure, Attaque caudale, Morsure, Souffle, Taille, Vision nocturne, Vol | 8 |
| 320 | Griffon | profile | Arme, Armure, Bestial, Morsure, Taille, Vision nocturne, Vol | 7 |
| 320 | Géant | profile | Arme, Armure, Coriace, Foulée, Taille, Vision nocturne | 6 |
| 321 | Hydre | profile | Arme, Armure, Bestial, Constricteur, Foulée, Furtif, Pisteur, Regeneration, Taille, Souffle, Vision nocturne | 11 |
| 321 | Hippogriffe | profile | Animosité, Arme, Belliqueux, Bestial, Foulée, Morsure, Taille, Territorial, Vision nocturne, Vol | 10 |
| 322 | Manticore | profile | Arme, Armure, Attaque caudale, Bestial, Morsure, Taille, Territorial, Venin, Vol | 9 |
| 322 | Jabberslythe | profile | Arme, Armure, Attaque caudale, Bestial, Bond, Infecté, Langue préhensile, Morsure, Perturbant, Sang corrosif, Taille, Venin, Vision nocturne | 13 |
| 323 | Squig des cavernes | profile | Arme, Bestial, Bond, Infecté, Vision nocturne | 5 |
| 323 | Pieuvre des tourbières | profile | Amphibie, Bestial, Constricteur, Furtif, Limicole, Taille, Tentacules | 7 |
| 323 | Pégase | profile | Arme, Foulée, Taille, Vol | 4 |
| 324 | Troll | profile | Arme, Armure, Coriace, Increvable, Infecté, Morsure, Regeneration, Stupide, Taille, Vomissement | 10 |
| 325 | Orc | profile | Animosité, Arme, Armure, Belliqueux, Increvable, Infecté, Vision nocturne | 7 |
| 325 | Vouivre | profile | Arme, Armure, Bestial, Taille, Venin, Vol | 6 |
| 326 | Snotling | profile | Arme, Bestial, Infecté, Taille, Vision nocturne | 5 |
| 326 | Gobelin | profile | Animosité, Arme, Armure, Craintif, Infecté, Vision nocturne | 6 |
| 327 | Chauve-souris vampire (Varghulf) | profile | Affamé, Arme, Armure, Bestial, Haine, Infravision, Morsure, Mort-vivant, Peur, Regeneration, Taille, Terreur, Vampirique | 13 |
| 327 | Banshee | profile | Arme, Éthéré, Hurlement fantomatique, Infravision, Instable, Mort-vivant, Terreur | 7 |
| 328 | Loup funeste | profile | Arme, Armure, Fabriqué, Foulée, Infravision, Instable, Mort-vivant, Peur, Pisteur, Taille | 10 |
| 328 | Goule de crypte | profile | Arme, Infecté, Morsure, Vision nocturne | 4 |
| 328 | Fantôme | profile | Arme, Éthéré, Infravision, Instable, Mort-vivant, Peur | 6 |
| 329 | Squelette | profile | Arme, Armure, Fabriqué, Infravision, Insensible à la douleur, Instable, Mort-vivant, Peur | 8 |
| 329 | Spectre de cairn | profile | Arme, Éthéré, Étreinte glaciale, Infravision, Instable, Mort-vivant, Terreur | 7 |
| 330 | Zombie | profile | Arme, Fabriqué, Infravision, Insensible à la douleur, Instable, Mort-vivant, Peur | 7 |
| 330 | Vampire | profile | Arme, Morsure, Mort-vivant, Vampirique, Vision nocturne | 5 |
| 331 | Chamane-bray | profile | Arboricole, Arme, Cornes, Corruption, Lanceur de Sorts, Rage, Vision nocturne | 7 |
| 332 | Ungor | profile | Arboricole, Arme, Vision nocturne | 3 |
| 332 | Minotaure | profile | Affamé, Arme, Cornes, Taille, Vision nocturne | 5 |
| 332 | Gor | profile | Arboricole, Arme, Armure, Cornes, Rage, Vision nocturne | 6 |
| 333 | Cultiste | profile | Arme | 1 |
| 333 | Mutant | profile | Arme, Corruption, Mutation | 3 |
| 334 | Guerrier du Chaos | profile | Arme, Armure, Champion, Corruption | 4 |
| 335 | Démonette de Slaanesh | profile | Arme, Champion, Corruption, Démoniaque, Instable, Perturbant, Peur, Vision nocturne | 8 |
| 335 | Sanguinaire de Khorne | profile | Arme, Armure, Champion, Cornes, Corruption, Démoniaque, Frénésie, Insensible à la douleur, Instable, Peur | 10 |
| 336 | Slenderthigh Whiptongue — Prince démon de Slaanesh | profile | Arme, Armure, Champion, Cornes, Corruption, Démoniaque, Instable, Lanceur de Sorts, Perturbant, Taille, Terreur, Vision nocturne | 12 |
| 336 | Fr’hough Mournbreath — Prince démon de Nurgle | profile | Arme, Armure, Cornes, Corruption, Démoniaque, Infecté, Infravision, Instable, Lanceur de Sorts, Maladie, Parasité, Souffle, Taille, Terreur | 14 |
| 337 | Vermine de choc | profile | Arme, Armure, Infecté, Vision nocturne | 4 |
| 337 | Rat ogre | profile | Arme, Armure, Infecté, Stupide, Taille, Vision nocturne | 6 |
| 337 | Guerrier des clans | profile | Arme, Armure, Infecté, Vision nocturne | 4 |

### L06 — 60 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 319 | HUMAN | profile |  | 0 |
| 319 | HALFLING | profile | Night Vision | 1 |
| 320 | DWARF | profile | Hatred, Magic Resistance, Night Vision | 3 |
| 320 | HIGH ELF OR WOOD ELF | profile | Night Vision | 1 |
| 321 | HUMAN WATCHMAN | profile |  | 0 |
| 321 | HUMAN MERCHANT | profile |  | 0 |
| 322 | HUMAN THUG | profile |  | 0 |
| 322 | HALFLING THIEF | profile |  | 0 |
| 323 | GNOME | profile | Hatred, Night Vision | 2 |
| 324 | OGRE | profile | Fear, Hungry, Size | 3 |
| 325 | BOAR | profile | Bestial, Skittish, Horns | 3 |
| 325 | DOG | profile | Bestial, Night Vision, Size, Skittish, Tracker, Bite | 6 |
| 326 | GIANT RAT | profile | Bestial, Infected, Night Vision, Size, Skittish, Bite | 6 |
| 326 | GIANT SPIDER | profile | Bestial, Night Vision, Size, Wallcrawler, Web, Bite | 6 |
| 327 | HORSE | profile | Bestial, Size, Skittish | 3 |
| 327 | WOLF | profile | Bestial, Night Vision, Skittish, Bite | 4 |
| 328 | BOG OCTOPUS | profile | Amphibious, Bestial, Night Vision, Size, Striding Gait, Venom, Tentacles | 7 |
| 329 | CAVE SQUIG | profile | Bestial, Bounce, Infected, Night Vision | 4 |
| 329 | DEMIGRYPH | profile | Bestial, Night Vision, Size, Bite | 4 |
| 330 | DRAGON | profile | Fly, Night Vision, Size, Bite, Tail, Breath | 6 |
| 331 | FENBEAST | profile | Construct, Dark Vision, Infected, Regeneration, Size, Stupid | 6 |
| 332 | GIANT | profile | Size | 1 |
| 332 | GRIFFON | profile | Fly, Night Vision, Size, Bite | 4 |
| 333 | MANTICORE | profile | Bestial, Fly, Size, Territorial, Venom, Bite, Tail | 7 |
| 334 | PEGASUS | profile | Fly, Size | 2 |
| 335 | TROLL | profile | Infected, Regeneration, Size, Stupid, Bite, Vomit | 6 |
| 336 | GOBLIN | profile | Afraid, Animosity, Infected, Night Vision | 4 |
| 337 | ORC | profile | Animosity, Belligerent, Infected, Night Vision | 4 |
| 338 | CRYPT GHOUL | profile | Infected, Night Vision, Bite | 3 |
| 338 | SNOTLING | profile | Bestial, Infected, Night Vision, Size | 4 |
| 339 | SKELETON | profile | Construct, Dark Vision, Fear, Painless, Undead, Unstable | 6 |
| 340 | ZOMBIE | profile | Construct, Dark Vision, Fear, Infected, Painless, Undead, Unstable, Bite | 8 |
| 341 | DIRE WOLF | profile | Construct, Dark Vision, Fear, Hungry, Infected, Undead, Unstable, Bite | 8 |
| 341 | GHOST | profile | Dark Vision, Ethereal, Fear, Painless, Undead, Unstable | 6 |
| 342 | CAIRN WRAITH | profile | Champion, Dark Vision, Ethereal, Painless, Terror, Undead, Unstable, Chill Grasp | 8 |
| 342 | TOMB BANSHEE | profile | Dark Vision, Ethereal, Painless, Terror, Undead, Unstable, Ghostly Howl | 7 |
| 343 | VAMPIRE | profile | Night Vision, Undead, Vampiric, Bite | 4 |
| 344 | VARGHULF | profile | Bestial, Dark Vision, Hatred, Bite | 4 |
| 345 | GOR | profile | Night Vision, Striding Gait, Horns | 3 |
| 345 | UNGOR | profile | Night Vision, Striding Gait | 2 |
| 346 | MINOTAUR | profile | Hungry, Night Vision, Size, Striding Gait, Horns | 5 |
| 347 | CULTIST | profile |  | 0 |
| 347 | MUTANT | profile | Corruption, Mutation | 2 |
| 348 | CHAOS WARRIOR | profile | Champion, Corruption | 2 |
| 349 | BLOODLETTER OF KHORNE | profile | Champion, Corruption, Daemonic, Dark Vision, Fear, Frenzy, Hatred, Mark of Chaos, Painless, Unstable, Horns | 11 |
| 350 | DAEMONETTE OF SLAANESH | profile | Champion, Corruption, Daemonic, Dark Vision, Fear, Hatred, Mark of Chaos, Painless, Unstable | 9 |
| 351 | CLANRAT | profile | Infected, Night Vision, Striding Gait | 3 |
| 352 | STORMVERMIN | profile | Infected, Night Vision, Striding Gait | 3 |
| 352 | RAT OGRE | profile | Bestial, Infected, Night Vision, Size, Stupid | 5 |
| 353 | SOLDIER | template |  | 0 |
| 353 | SKIRMISHER | template |  | 0 |
| 353 | ELITE | template |  | 0 |
| 353 | LEADER | template |  | 0 |
| 353 | COMMANDER | template |  | 0 |
| 354 | SPELLCASTER | template |  | 0 |
| 354 | SPELLCASTER LORD | template |  | 0 |
| 354 | SKRAKK - BESTIGOR (ELITE) | profile | Night Vision, Striding Gait, Horns | 3 |
| 355 | UNGRAKK - GOR BEASTLORD (COMMANDER) | profile | Night Vision, Striding Gait, Horns | 3 |
| 355 | SWILEGRAKK - BRAY SHAMAN (SPELLCASTER) | profile | Night Vision, Striding Gait, Horns | 3 |
| 356 | GUZGOG - UNGOR SKIRMISHER | profile | Night Vision, Striding Gait | 2 |

### L07 — 68 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 42 | ADELLA OF THE THOUSAND MOUTHS | profile | Armour, Distracting, Weapon | 3 |
| 44 | SOREN HOARDER — VITKI | profile | Spellcaster, Weapon | 2 |
| 57 | SERPENTS OF SOTEK | profile | Armour, Bestial, Cold-blooded, Size, Swarm, Venom, Weapon | 7 |
| 58 | MALFORMED SAURUS SPAWN | profile | Armour, Bestial, Cold-blooded, Disease, Infected, Weapon | 6 |
| 61 | UTHL’KRITCHNAAK — EXALTED HERALD OF NURGLE | profile | Armour, Corruption, Corrosive Blood, Daemonic, Disease, Distracting, Fear, Horns, Grim, Infected, Night Vision, Regenerate, Size, Spellcaster, Territorial, Unstable, Vomit, Weapon | 18 |
| 62 | LORD SKROLK — SKAVEN PLAGUELORD | profile | Corruption, Dark Vision, Die Hard, Disease, Frenzy, Infected, Painless, Spellcaster, Weapon | 9 |
| 67 | BLACK JENS — GHOUL CHANCELLOR | profile | Bite, Fear, Hungry, Infected, Night Vision, Weapon | 6 |
| 73 | LUTHOR HARKON — VAMPIRE ARCH-GRAND — COMMODORE AND SELF-DECLARED EMPEROR | profile | Bite, Corruption, Die Hard, Fear, Frenzy, Night Vision, Ranged, Undead, Vampiric, Wallcrawler, Weapon | 11 |
| 75 | THE BRINE WIFE — SYREEN AND WITCH | profile | Amphibious, Corruption, Dark Vision, Ethereal, Fury, Spellcaster, Terror, Undead, Unstable, Weapon | 10 |
| 87 | LORD FINRIAN | profile | Armour, Hatred, Prejudice, Weapon | 4 |
| 89 | SWIFTFEATHER ROC | profile | Bestial, Bite, Flight, Night Vision, Size, Weapon | 6 |
| 90 | LOKHIR FELLHEART | profile | Armour, Hatred, Regeneration, Terror, Weapon | 5 |
| 113 | TZKU’TA | profile | Amphibious, Arboreal, Armour, Cold-blooded, Leader, Night Vision, Size, Spellcaster, Weapon | 9 |
| 123 | SLANN OF THE FIFTH GENERATION | profile | Cold-blooded, Size, Spellcaster, Weapon | 4 |
| 123 | SLANN OF THE FOURTH GENERATION | profile | Cold-blooded, Size, Spellcaster, Weapon | 4 |
| 124 | SLANN OF THE SECOND GENERATION | profile | Cold-blooded, Size, Spellcaster, Weapon | 4 |
| 124 | SLANN OF THE FIRST GENERATION | profile | Cold-blooded, Ethereal, Flammable, Size, Spellcaster | 5 |
| 124 | SLANN OF THE THIRD GENERATION | profile | Cold-blooded, Size, Spellcaster, Weapon | 4 |
| 136 | SKINK | profile | Amphibious, Arboreal, Armour, Cold-blooded, Night Vision, Size, Weapon | 7 |
| 141 | ANOMOQ — SKINK PRIEST OF SOTEK | profile | Amphibious, Arboreal, Armour, Bite, Cold-blooded, Hatred, Night Vision, Size, Spellcaster, Venom, Weapon | 11 |
| 142 | CHAMELEON SKINK | profile | Acute Sense, Amphibious, Arboreal, Armour, Chameleon, Cold-blooded, Night Vision, Size, Stealthy | 9 |
| 143 | SAURUS | profile | Armour, Bite, Cold-blooded, Night Vision, Tail Attack, Weapon | 6 |
| 145 | SAURUS TEMPLE GUARD | profile | Armour, Bite, Cold-blooded, Night Vision, Tail Attack, Weapon | 6 |
| 147 | CROTAZ’L, SCAR VETERAN | profile | Armour, Belligerent, Bite, Cold-blooded, Die Hard, Night Vision, Tail Attack, Weapon | 8 |
| 148 | KROXIGOR | profile | Amphibious, Armour, Bite, Cold-blooded, Grim, Night Vision, Size, Stupid, Tail Attack, Weapon | 10 |
| 153 | COATL | profile | Arboreal, Armour, Bite, Cold-blooded, Flight, Grim, Magical, Night Vision, Size, Spellcaster, Telepathy, Territorial, Terror, Ward | 14 |
| 155 | TLAT’L THE ENIGMA, COATL PROTECTOR | profile | Arboreal, Armour, Bite, Cold-blooded, Flight, Grim, Size, Spellcaster, Stealthy, Telepathy, Territorial, Terror, Ward | 13 |
| 167 | BLOOD HUNGRY SPORE CLOUD | profile | Disease, Size, Stationary Attacker | 3 |
| 167 | IMPALING SPIKETHORN | profile | Flammable, Painless, Size, Stationary Attacker, Weapon | 5 |
| 167 | VYPERVINE | profile | Flammable, Painless, Size, Stationary Attacker, Venom, Weapon | 6 |
| 167 | GRASPING CREEPER VINE | profile | Constrictor, Flammable, Painless, Size, Stationary Attacker, Weapon | 6 |
| 168 | ITXI GRUB | profile | Bestial, Cold-blooded, Magical, Size, Wallcrawler, Weapon | 6 |
| 168 | FIRELEECH | profile | Amphibious, Bestial, Cold-blooded, Painless, Size, Swamp-strider, Weapon | 7 |
| 168 | BRAINFLUKE | profile | Aquatic, Bestial, Cold-blooded, Size, Weapon | 5 |
| 169 | PALLID BLINDWYRM | profile | Bestial, Cold-blooded, Infected, Size, Stationary Attacker, Weapon | 6 |
| 169 | CARRION ANT | profile | Arboreal, Bestial, Cold-blooded, Size, Venom, Bite, Weapon | 7 |
| 169 | BLOODWASP | profile | Arboreal, Bestial, Cold-blooded, Flight, Painless, Size, Venom, Weapon | 8 |
| 169 | HUNTIPEDE | profile | Arboreal, Armour, Bestial, Cold-blooded, Painless, Size, Stealthy, Venom, Wallcrawler, Bite, Weapon | 11 |
| 169 | BLOODMAGGOT | profile | Arboreal, Bestial, Cold-blooded, Painless, Size, Wallcrawler, Weapon | 7 |
| 170 | LUSTRIAN TREEFROG | profile | Amphibious, Arboreal, Bestial, Bounce, Cold-blooded, Size, Venom, Wallcrawler, Weapon | 9 |
| 170 | BLOT TOAD | profile | Amphibious, Arboreal, Bestial, Bounce, Cold-blooded, Distracting, Size, Swamp-strider, Weapon | 9 |
| 171 | PIRANHA LIZARD | profile | Amphibious, Bestial, Cold-blooded, Size, Stealthy, Swamp-strider, Tracker, Tail Attack, Weapon | 9 |
| 171 | SCALEMANE REPTILION | profile | Armour, Bestial, Cold-blooded, Hungry, Size, Stealthy, Tracker, Venom, Tail Attack, Weapon | 10 |
| 171 | HYENADON | profile | Arboreal, Bestial, Cold-blooded, Frenzy, Infected, Size, Tracker, Armour, Tail Attack, Weapon | 10 |
| 171 | TIGUANA | profile | Arboreal, Bestial, Cold-blooded, Night Vision, Size, Skittish, Tracker, Wallcrawler, Tongue Attack, Weapon | 10 |
| 172 | BLUE-RINGED ASP | profile | Arboreal, Bestial, Cold-blooded, Size, Tracker, Venom, Weapon | 7 |
| 172 | BORER SNAKE | profile | Arboreal, Bestial, Cold-blooded, Hungry, Size, Stealthy, Weapon | 7 |
| 172 | AMAXON SWAMP PYTHON | profile | Amphibious, Armour, Bestial, Cold-blooded, Constrictor, Fear, Grim, Size, Tracker, Weapon | 10 |
| 173 | GIANT BAT | profile | Bestial, Dark Vision, Size, Tracker, Weapon | 5 |
| 173 | BLOOD BAT | profile | Bestial, Dark Vision, Disease, Flight, Size, Stealthy, Tracker, Wallcrawler, Weapon | 9 |
| 173 | CULCHAN | profile | Bestial, Fear, Grim, Size, Stride, Tracker, Bite, Weapon | 8 |
| 173 | JAGUAR | profile | Armour, Bestial, Grim, Night Vision, Size, Stride, Stealthy, Tracker, Bite, Weapon | 10 |
| 174 | COLD ONE | profile | Armour, Bestial, Cold-blooded, Size, Stride, Bite, Weapon | 7 |
| 175 | HORNED ONE | profile | Armour, Bestial, Cold-blooded, Grim, Size, Stride, Territorial, Tracker, Bite, Horns, Weapon | 11 |
| 175 | RAZORDON | profile | Armour, Bestial, Cold-blooded, Grim, Size, Swamp-strider, Bite, Ranged, Weapon | 9 |
| 175 | SALAMANDER | profile | Amphibious, Armour, Bestial, Breath, Cold-blooded, Grim, Size, Swamp-strider, Bite, Weapon | 10 |
| 176 | RIPPERDACTYL | profile | Acute Sense, Bestial, Cold-blooded, Fear, Flight, Hatred, Size, Tail Attack, Weapon | 9 |
| 176 | TERRADON | profile | Acute Sense, Bestial, Cold-blooded, Fear, Flight, Size, Bite, Claws, Weapon | 9 |
| 177 | STEGADON | profile | Armour, Bestial, Cold-blooded, Grim, Immunity to Psychology, Night Vision, Painless, Size, Swamp-strider, Bite, Horns, Tail Attack, Weapon | 13 |
| 178 | ARCANADON | profile | Arboreal, Armour, Bestial, Cold-blooded, Grim, Immunity to Psychology, Night Vision, Painless, Size, Swamp-strider, Bite, Weapon | 12 |
| 178 | BASTILADON | profile | Armour, Bestial, Cold-blooded, Grim, Immunity to Psychology, Night Vision, Painless, Size, Bite, Tail Attack, Weapon | 11 |
| 179 | PLIODON | profile | Amphibious, Armour, Bestial, Cold-blooded, Grim, Immunity to Psychology, Night Vision, Painless, Size, Bite, Tail Attack, Weapon | 12 |
| 180 | CARNOSAUR | profile | Armour, Belligerent, Bestial, Cold-blooded, Grim, Night Vision, Size, Stride, Bite, Tail Attack, Weapon | 11 |
| 180 | TROGLODON | profile | Acute Sense, Armour, Bestial, Fear, Grim, Immunity to Psychology, Painless, Size, Tracker, Venom, Bite, Weapon | 12 |
| 181 | DREAD SAURIAN | profile | Armour, Belligerent, Bestial, Cold-blooded, Fear, Grim, Hungry, Night Vision, Painless, Size, Stride, Tracker, Bite, Tail Attack, Weapon | 15 |
| 182 | SAVAGE ORC | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 9 |
| 182 | SAVAGE ORC SHAMAN | profile | Animosity, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 8 |
| 182 | SAVAGE ORC CHIEF | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 9 |

### L08 — 0 références

Aucun bloc de profil standard repéré ; voir E0-Q28.

### L09 — 53 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 44 | DARK ELF | profile | Hatred, Night Vision | 2 |
| 44 | DARK ELF HIGHBORN | profile | Hatred, Night Vision | 2 |
| 44 | DARK ELF CITY LOWBORN | profile | Hatred, Night Vision | 2 |
| 44 | DARK ELF WILDERNESS LOWBORN | profile | Belligerent, Hatred, Night Vision, Striding Gait | 4 |
| 45 | DARK STEED | profile | Bestial, Night Vision, Size, Skittish | 4 |
| 45 | DARK PEGASUS | profile | Belligerent, Bestial, Fly, Night Vision, Size, Horns | 6 |
| 46 | NAGGAROTHI COLD ONE | profile | Bestial, Cold-blooded, Night Vision, Size, Bite | 5 |
| 46 | KHARIBDYSS | profile | Amphibious, Belligerent, Bestial, Constrictor, Distracting, Many Heads, Night Vision, Regenerate, Size, Tracker, Venom, Bite, Tail | 13 |
| 47 | WAR HYDRA | profile | Bestial, Constrictor, Many Heads, Night Vision, Regenerate, Size, Striding Gait, Tracker, Bite, Breath | 10 |
| 48 | HARPY | profile | Belligerent, Bestial, Fly, Hungry, Infected, Night Vision, Skittish | 7 |
| 49 | JUVENILE HELLDRAKE | profile | Bestial, Marine Creature, Night Vision, Size, Bite, Tail | 6 |
| 49 | HELLDRAKE | profile | Bestial, Frenzy, Marine Creature, Night Vision, Size, Bite, Tail | 7 |
| 50 | SEA DRAGON | profile | Marine Creature, Night Vision, Size, Bite, Tail, Breath | 6 |
| 51 | DRUCHII ANOINTED | profile | Animosity, Champion, Corruption, Distracting, Fear, Hatred, Mark of Slaanesh | 7 |
| 52 | DOOMFIRE WARLOCK | profile | Afraid, Coven Sorcerer, Hatred, Night Vision, Prey of the Dark Prince, Venom, Ward | 7 |
| 53 | DRUCHII WARRIOR | profile |  | 0 |
| 53 | DRUCHII ELITE WARRIOR | profile |  | 0 |
| 53 | DRUCHII OFFICER | profile |  | 0 |
| 53 | REAVER CAPTAIN | profile |  | 0 |
| 54 | CORSAIR | profile |  | 0 |
| 54 | SCOUT | profile |  | 0 |
| 54 | BLOODSHADE | profile |  | 0 |
| 54 | ASSASSIN | profile |  | 0 |
| 55 | DRUCHII SORCERESS | profile |  | 0 |
| 55 | SUPREME SORCERESS | profile |  | 0 |
| 55 | WITCH ELF | profile |  | 0 |
| 56 | HAG | profile |  | 0 |
| 56 | BEASTMASTER | profile |  | 0 |
| 56 | DRUCHII ENTOURAGE | profile |  | 0 |
| 56 | DRUCHII SERVANT | profile |  | 0 |
| 72 | CAPTAIN VALERION TREMENDROS — DARK ELF HIGHBORN OFFICER | profile | Hatred, Night Vision | 2 |
| 73 | DAMINA HROSKA — DARK ELF CITY LOWBORN ASSASSIN | profile | Hatred, Night Vision | 2 |
| 74 | HERMIZOR OF HOUSE ARGUENTAL — DARK ELF HIGHBORN ENTOURAGE | profile | Hatred, Night Vision | 2 |
| 80 | JARETH BRACKBLOOD — DARK ELF REAVER CAPTAIN | profile | Hatred, Night Vision | 2 |
| 81 | DEMETH SOULBANE — DARK ELF CORSAIR | profile | Hatred, Night Vision | 2 |
| 82 | ZARUGH KELVAIN — DARK ELF SHIP’S CREW | profile | Hatred, Night Vision | 2 |
| 86 | DOCKSIDE THUG | profile |  | 0 |
| 87 | HARZETH DUSKMANTLE — DARK ELF SPYMASTER | profile | Acute Sense, Night Vision | 2 |
| 88 | SELIN EBONSPITE — DARK ELF AGENT | profile | Night Vision | 1 |
| 89 | DALEATHRA BLADEBORN — DARK ELF AGENT | profile | Night Vision | 1 |
| 95 | GREF — DARK ELF WILDERNESS LOWBORN BLOODSHADE | profile | Belligerent, Hatred, Night Vision, Striding Gait | 4 |
| 96 | KALIMEL NIGHTPIERCER — DARK ELF SCOUT | profile | Hatred, Night Vision | 2 |
| 97 | SAMURIL MEURLITH — DARK ELF SUPREME SORCERESS | profile | Hatred, Night Vision | 2 |
| 103 | SCORATH SCALEFLAYER — HIGH BEASTMASTER | profile | Fearless, Hatred, Night Vision | 3 |
| 104 | KELRATHI — DARK ELF BEASTMASTER | profile | Hatred, Night Vision, Venom, Bite | 4 |
| 110 | NYANDRA FILVANIR — DARK ELF CITY LOWBORN REAVER CAPTAIN | profile | Hatred, Night Vision | 2 |
| 111 | ANUIDETHAR VEILTHORN — DARK ELF FACTOR (MERCHANT) | profile | Hatred, Night Vision | 2 |
| 116 | SELTHIRA HEARTRENDER — DARK ELF LOWBORN (CITY) WITCH ELF | profile | Frenzy, Hatred, Night Vision | 3 |
| 117 | HAIDRATH — DARK ELF LOWBORN (WILDERNESS) HAG | profile | Belligerent, Frenzy, Hatred, Night Vision, Striding Gait | 5 |
| 118 | HULRETH — DARK ELF HIGHBORN — DISCIPLE OF KHAINE (WARRIOR PRIEST) | profile | Hatred, Night Vision | 2 |
| 122 | DURIATH HELBANE — THE FLEETMASTER | profile | Hatred, Night Vision | 2 |
| 124 | DEATH HAG KHEITALLA | profile | Frenzy, Hatred, Night Vision | 3 |
| 126 | KERNETHAR GRIMWITCH — FUGITIVE SORCERER | profile |  | 0 |

### L10 — 29 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 9 | COUNT ALBERICH V HAUPT-ANDERSSEN — IMPERIAL ELECTOR, NOBLE MAGNATE | profile | Animosity | 1 |
| 12 | FARGAL KRAGGZIN — DWARF RANGER CAPTAIN | profile | Magic Resistance, Night Vision | 2 |
| 13 | WERTHER VON HORNAU — HUMAN CHANCELLOR | profile |  | 0 |
| 14 | GIANCARLO CACCIATORE — HUMAN MASTER HUNTER | profile | Hatred, Night Vision | 2 |
| 15 | ELSBETH BLATTNER — HUMAN WIZARD | profile |  | 0 |
| 38 | SYLVANIAN DRAKENHUND | profile | Bestial, Night Vision, Skittish, Size, Sprinter, Tracker, Weapon | 7 |
| 50 | FREDERICK VAN HAL | profile | Animosity, Armour, Cold-blooded, Champion, Corruption, Die Hard, Flight, Grim, Ghostly Howl, Night Vision, Weapon, Undead, Terror, Spellcaster | 14 |
| 51 | SKELETAL WITCH | profile | Armour, Night Vision, Size, Spellcaster, Undead, Painless, Weapon | 7 |
| 51 | GRAUG THE TERRIBLE | profile | Armour, Construct, Flight, Hatred, Night Vision, Size, Tail, Territorial, Trained, Undead, Weapon | 11 |
| 68 | CRYPT GHAST | profile | Bite, Fearless, Frenzy, Hungry, Infected, Night Vision, Venom, Weapon | 8 |
| 68 | CRYPT HORROR | profile | Bite, Fear, Frenzy, Infected, Night Vision, Painless, Regeneration, Size, Weapon | 9 |
| 74 | PATCHWORK MAN | profile | Armour, Dark Vision, Die Hard, Frenzy, Hardy, Painless, Sprinter, Undead | 8 |
| 79 | ARLO DUNNE — HUMAN PEASANT | profile |  | 0 |
| 80 | JIMMI GREENLEAF — HALFLING ARTISAN | profile | Acute Sense | 1 |
| 81 | NIELS VORBERREN — HUMAN ROADWARDEN | profile | Night Vision | 1 |
| 82 | SIHASTRUL — HUMAN MYSTIC | profile |  | 0 |
| 83 | GRETCHEN BEIRNE — HUMAN HEDGE WITCH | profile |  | 0 |
| 84 | TREVNA FANE — HUMAN SERVANT | profile | Night Vision | 1 |
| 85 | COUNT PETR VON STOLPE — NOBLE | profile |  | 0 |
| 86 | GABRIELLA VON BUNDEBAD — VAMPIRE GRANDEE | profile | Dark Vision, Fly, Night Vision, Fearless, Regeneration, Undead, Vampiric, Bite | 8 |
| 87 | MATTHIAS PRIMVIK — HUMAN TAX COLLECTOR | profile |  | 0 |
| 88 | FATHER TANTLUS RADU — HUMAN PRIEST | profile |  | 0 |
| 89 | RANOLF QUICKFINGERS — HUMAN PROWLER | profile | Fast, Mutation | 2 |
| 90 | OTTO AND HENDRIK VOGEL — HUMAN CLERK | profile |  | 0 |
| 91 | ERICH FROHLICH — HUMAN VILLAGER | profile | Hardy | 1 |
| 92 | SEIREN WALBURG — HUMAN PRIEST | profile | Miracles | 1 |
| 93 | EMIL HARTWIG — HUMAN FOREMAN | profile |  | 0 |
| 94 | ANDREI VAN HAL — HUMAN SENTRY | profile | Night Vision | 1 |
| 95 | GRIMES — HUMAN GANG BOSS | profile | Fearless | 1 |

### L11 — 68 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 10 | GREAT STAG | profile | Bestial, Night Vision, Size, Stride, Horns, Weapon | 6 |
| 10 | THE RIVER’S SHADOW | profile | Blessed, Dark Vision, Grim, Immunity to Psychology, Magical, Miracles, Size, Stealthy, Stride, Ward, Horns, Weapon | 12 |
| 13 | DRAKWALD MANCATCHER (GIANT SPIDER) | profile | Armour, Arboreal, Bestial, Night Vision, Size, Wallcrawler, Bite, Weapon, Web, Venom | 10 |
| 13 | ARACHNAROK SPIDER | profile | Armour, Arboreal, Dark Vision, Size, Wallcrawler, Bite, Weapon, Web, Venom | 9 |
| 15 | FOREST GOBLIN | profile | Animosity, Arboreal, Armour, Afraid, Night Vision, Ranged, Weapon, Venom | 8 |
| 15 | FOREST GOBLIN SHAMAN | profile | Animosity, Arboreal, Blessed, Fear, Immunity, Miracles, Night Vision, Painless, Venom, Weapon | 10 |
| 17 | GREAT WOLF | profile | Armour, Bestial, Night Vision, Stride, Territorial, Tracker, Trained, Weapon | 8 |
| 17 | RAUKOS | profile | Armour, Night Vision, Size, Stride, Tracker, Weapon | 6 |
| 19 | RAZORGOR | profile | Armour, Bestial, Distracting, Frenzy, Night Vision, Size, Stride, Horns, Weapon | 9 |
| 19 | OL’ GRIBBLEBACK | profile | Armour, Distracting, Frenzy, Hardy, Mutation, Night Vision, Size, Ward, Horns, Weapon | 10 |
| 21 | GRIFFON | profile | Armour, Bestial, Flight, Grim, Night Vision, Size, Bite, Weapon | 8 |
| 23 | DREAD MAW | profile | Armour, Belligerent, Bestial, Burrow, Corruption, Dark Vision, Mutation, Size, Territorial, Bite, Breath, Weapon | 12 |
| 25 | RHINOX | profile | Armour, Belligerent, Bestial, Size, Stride, Horns, Weapon | 7 |
| 25 | KRAG-BREAKER | profile | Armour, Belligerent, Bestial, Grim, Painless, Size, Stride, Horns, Weapon | 9 |
| 27 | NIGHT GOBLIN CAVE SQUIG SWARM | profile | Bestial, Bounce, Dark Vision, Infected, Swarm, Weapon | 6 |
| 28 | NIGHT GOBLINS | profile | Animosity, Afraid, Dark Vision, Hatred, Infected, Ranged, Weapon | 7 |
| 30 | FOREST DRAGONS | profile | Arboreal, Armour, Flight, Grim, Immunity, Night Vision, Size, Stealthy, Bite, Breath, Tail, Weapon | 12 |
| 31 | CALEDAIR, THE SCYTHE OF FIRE | profile | Armour, Flight, Grim, Hardy, Immunity, Immunity to Psychology, Magical, Night Vision, Size, Spellcaster, Bite, Breath, Tail, Weapon | 14 |
| 32 | WYVERN | profile | Armour, Bestial, Flight, Size, Tail, Weapon | 6 |
| 35 | HALAGRUNDSOR THE ‘HORRIBLE’ — GIANT SPY | profile | Animosity, Night Vision, Painless, Size, Stride, Weapon | 6 |
| 36 | STIRPIKE | profile | Amphibious, Armour, Bestial, Cold-blooded, Night Vision, Size, Bite, Tail, Weapon | 9 |
| 37 | THINGS FROM THE DEAD WOOD | profile | Corruption, Night Vision, Fear, Fury, Grim, Hardy, Mental Corruption, Mutation, Stealthy, Weapon | 10 |
| 41 | CLAN MOULDER PACKMASTER | profile | Armour, Night Vision, Infected, Ranged, Weapon | 5 |
| 41 | RAT OGRE BONEBREAKER | profile | Armour, Night Vision, Painless, Size, Stride, Stupid, Infected, Weapon | 8 |
| 41 | WOLF RAT | profile | Armour, Bestial, Night Vision, Skittish, Stride, Tracker, Trained, Weapon | 8 |
| 41 | CLAN MOULDER UNIQUE EXPERIMENT | profile | Armour, Corruption, Dark Vision, Disease, Grim, Immunity to Psychology, Infected, Painless, Regenerate, Size, Terror, Horns, Rear, Weapon | 14 |
| 45 | AMOEBAE | profile | Amphibious, Painless, Regenerate, Swamp-strider, Tentacles, Weapon | 6 |
| 45 | JETSAM THE CLEVER JELLY | profile | Afraid, Amphibious, Painless, Regenerate, Size, Stealthy, Swamp-strider, Tentacles, Weapon, Engulf | 10 |
| 47 | AMPHISBAENA | profile | Armour, Cold-blooded, Dark Vision, Size, Stealthy, Stride, Bite, Venom, Weapon | 9 |
| 49 | RIVER TROLL | profile | Amphibious, Armour, Die Hard, Grim, Infected, Night Vision, Regenerate, Size, Stupid, Swamp-strider, Bite, Vomit, Weapon | 13 |
| 49 | RIVER TROLL HAG | profile | Amphibious, Armour, Dark Vision, Die Hard, Grim, Immunity to Psychology, Infected, Painless, Regenerate, Size, Spellcaster, Swamp-strider, Bite, Vomit, Weapon | 15 |
| 50 | CHAMELEOLEECH | profile | Amphibious, Bestial, Immunity to Psychology, Size, Swamp-strider, Weapon | 6 |
| 52 | FEN WORM | profile | Armour, Bestial, Cold-blooded, Dark Vision, Size, Stealthy, Swamp-strider, Constrictor, Weapon | 9 |
| 54 | THE CORPSE RENDER | profile | Armour, Bestial, Distracting, Grim, Night Vision, Regeneration, Size, Swamp-strider, Territorial, Bite, Constrictor, Weapon | 12 |
| 57 | DARK PEGASI | profile | Belligerent, Bestial, Dark Vision, Flight, Size, Horns, Weapon | 7 |
| 59 | NIGHTRAVEN FLOCK | profile | Afraid, Dark Vision, Fear, Flight, Bite, Swarm, Weapon | 7 |
| 61 | PREYTON | profile | Arboreal, Armour, Bestial, Corruption, Frenzy, Flight, Grim, Night Vision, Painless, Size, Horns, Weapon | 12 |
| 63 | GREAT EAGLE | profile | Armour, Night Vision, Flight, Size, Bite, Weapon | 6 |
| 63 | GREY MOUNTAIN HAWK | profile | Bestial, Flight, Night Vision, Size, Territorial, Bite, Weapon | 7 |
| 63 | HEOMRETH | profile | Arboreal, Armour, Dark Vision, Flight, Size, Stealthy, Weapon | 7 |
| 65 | COCKATRICE | profile | Armour, Bestial, Dark Vision, Flight, Grim, Hardy, Size, Territorial, Bite, Petrifying Gaze, Tail, Weapon, Breath | 13 |
| 67 | CHIMERA | profile | Armour, Bestial, Corruption, Flight, Fury, Grim, Magical, Night Vision, Size, Territorial, Terror, Bite, Breath, Weapon | 14 |
| 67 | THE OBLAST BEAST | profile | Armour, Bestial, Corruption, Flight, Fury, Grim, Magical, Night Vision, Size, Territorial, Terror, Tracker, Bite, Breath, Weapon | 15 |
| 70 | WAYWARD MOON CULTIST | profile | Armour, Mental Corruption, Ranged, Weapon | 4 |
| 70 | SKIN WOLF | profile | Armour, Die Hard, Fear, Grim, Frenzy, Hardy, Magical, Night Vision, Regenerate, Stride, Tracker, Bite, Weapon | 13 |
| 75 | GREAT TAURUS | profile | Bestial, Dark Vision, Flight, Grim, Immunity, Magical, Size, Stride, Territorial, Breath, Horns, Weapon | 12 |
| 76 | TREGARA | profile | Armour, Size, Stealthy, Territorial, Wallcrawler, Bite, Weapon | 7 |
| 77 | RAZORBILL | profile | Bestial, Flight, Hardy, Night Vision, Size, Skittish, Weapon | 7 |
| 79 | STEGADON | profile | Armour, Cold-blooded, Grim, Immunity to Psychology, Night Vision, Painless, Size, Swamp-strider, Bite, Horns, Rear, Tail, Weapon | 13 |
| 80 | HORNED ONE | profile | Armour, Bestial, Cold-blooded, Size, Stride, Territorial, Horns, Weapon | 8 |
| 81 | CARNOSAUR | profile | Armour, Belligerent, Bestial, Cold-blooded, Grim, Night Vision, Size, Stride, Bite, Tail, Weapon | 11 |
| 82 | WILD CAT | profile | Arboreal, Bestial, Disruption, Night Vision, Skittish, Stride, Tracker, Bite, Weapon | 9 |
| 82 | WAR LION OF CHRACE | profile | Armour, Fury, Grim, Night Vision, Size, Stealthy, Stride, Tracker, Bite, Weapon | 10 |
| 85 | LEVIATHAN | profile | Armour, Dark Vision, Fury, Grim, Size, Stride, Bite, Weapon | 8 |
| 85 | IL POTENTE GRANCHIO | profile | Armour, Dark Vision, Grim, Hungry, Immunity to Psychology, Painless, Size, Stride, Bite, Weapon | 10 |
| 86 | SIREN | profile | Amphibious, Dark Vision, Weapon | 3 |
| 88 | MERWYRM | profile | Amphibious, Armour, Dark Vision, Grim, Hungry, Immunity to Psychology, Painless, Regenerate, Size, Bite, Tail, Weapon | 12 |
| 90 | SHARD DRAGON | profile | Armour, Dark Vision, Grim, Size, Stealthy, Wallcrawler, Bite, Weapon | 8 |
| 91 | THE FANTASMA | profile | Armour, Dark Vision, Grim, Size, Stealthy, Wallcrawler, Ward, Bite, Breath, Weapon | 10 |
| 93 | UNDEAD KNIGHT (WIGHT) | profile | Armour, Dark Vision, Fear, Immunity to Psychology, Magical, Painless, Undead, Weapon | 8 |
| 95 | CLAN SKRYRE WARLOCK ENGINEER | profile | Armour, Night Vision, Ranged, Weapon | 4 |
| 95 | CLAN SKRYRE ‘PROTOTYPE’ | profile | Armour, Dark Vision, Grim, Hardy, Painless, Size, Stupid, Ranged, Weapon | 9 |
| 122 | Erich Massenbach | pregenerated-character |  | 0 |
| 124 | Jorunn Gromsdottir | pregenerated-character |  | 0 |
| 126 | Lynathryn Nightsong | pregenerated-character |  | 0 |
| 128 | Theodosius Schreiber | pregenerated-character |  | 0 |
| 130 | Vasya Ghorshkov | pregenerated-character |  | 0 |
| 132 | Kistiane Brockdorf | pregenerated-character |  | 0 |

### L12 — 64 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 9 | BASIC GNOBLAR | profile | Animosity, Infected, Night Vision, Weapon | 4 |
| 9 | BASIC NIGHT GOBLIN | profile | Afraid, Animosity, Armour, Dark Vision, Hatred, Infected, Weapon | 7 |
| 9 | BASIC FOREST GOBLIN | profile | Afraid, Animosity, Arboreal, Armour, Infected, Night Vision, Weapon | 7 |
| 9 | BASIC GOBLIN | profile | Afraid, Animosity, Armour, Infected, Night Vision, Weapon, Claws | 7 |
| 10 | BASIC ORC | profile | Animosity, Armour, Belligerent, Die Hard, Infected, Night Vision, Weapon | 7 |
| 10 | BASIC SAVAGE ORC | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 9 |
| 11 | BASIC BLACK ORC | profile | Armour, Belligerent, Die Hard, Infected, Night Vision, Weapon | 6 |
| 12 | BASIC HOBGOBLIN | profile | Animosity, Armour, Infected, Night Vision, Weapon | 5 |
| 13 | BASIC SNOTLING | profile | Bestial, Dark Vision, Immunity, Infected, Size, Weapon | 6 |
| 14 | BASIC OGRE | profile | Armour, Hungry, Night Vision, Prejudice, Size, Weapon | 6 |
| 15 | BASIC COMMON TROLL | profile | Armour, Bite, Die Hard, Infected, Regenerate, Size, Stupid, Vomit, Weapon | 9 |
| 16 | SOLDIER | template |  | 0 |
| 16 | SKIRMISHER | template |  | 0 |
| 16 | ELITE | template |  | 0 |
| 16 | NIGHT GOBLIN CHIEF | profile | Afraid, Animosity, Armour, Dark Vision, Hatred, Infected, Weapon | 7 |
| 17 | CHIEF | template |  | 0 |
| 17 | WARLORD | template |  | 0 |
| 17 | SHAMAN | template |  | 0 |
| 17 | SHAMAN LORD | template |  | 0 |
| 19 | WAR BOAR | profile | Armour, Bestial, Horns, Size, Stride, Trained, Weapon | 7 |
| 19 | GIANT SPIDER | profile | Armour, Arboreal, Bestial, Night Vision, Size, Trained, Venom, Wallcrawler, Weapon, Web | 10 |
| 19 | HOPPING SQUIG | profile | Bestial, Bounce, Infected, Night Vision, Trained, Weapon | 6 |
| 19 | MOURNFANG | profile | Armour, Bestial, Horns, Size, Stride, Tracker, Trained, Weapon | 8 |
| 19 | GIANT SQUIG | profile | Bestial, Bounce, Infected, Night Vision, Size, Trained, Weapon | 7 |
| 19 | GIANT WOLF | profile | Armour, Bestial, Night Vision, Size, Stride, Tracker, Trained, Weapon | 8 |
| 26 | VISH VENOMBARB – FOREST GOBLIN CHIEF | profile | Afraid, Animosity, Arboreal, Armour, Infected, Night Vision, Ranged, Weapon | 8 |
| 27 | BOGRAT THE BLASTED – FOREST GOBLIN SHAMAN | profile | Afraid, Animosity, Arboreal, Infected, Night Vision, Weapon | 6 |
| 28 | BLACKHEARTED NURD – FOREST GOBLIN ELITE | profile | Afraid, Animosity, Arboreal, Armour, Infected, Night Vision, Weapon | 7 |
| 29 | BUGSHOT – FOREST GOBLIN SKIRMISHER | profile | Afraid, Animosity, Arboreal, Infected, Night Vision, Weapon, Ranged | 7 |
| 36 | BOGGRUB LEGBITER – GOBLIN WARLORD | profile | Afraid, Animosity, Armour, Infected, Night Vision, Weapon | 6 |
| 37 | GUTBUG – GOBLIN CHIEF | profile | Afraid, Animosity, Armour, Infected, Night Vision, Weapon | 6 |
| 38 | RATLICKER – GOBLIN SOLDIER | profile | Afraid, Animosity, Armour, Infected, Night Vision, Weapon | 6 |
| 39 | KARGUN GRIMBARDEN – DWARF ARTILLERIST | profile | Afraid, Armour, Mental Corruption | 3 |
| 48 | HARBOTH SKULLRENDA – ORC WARLORD | profile | Animosity, Armour, Belligerent, Die Hard, Infected, Night Vision, Ranged, Weapon | 8 |
| 49 | YASKIN FORIT – ORC CHIEF | profile | Animosity, Armour, Belligerent, Die Hard, Infected, Night Vision, Ranged, Weapon | 8 |
| 50 | HAGBLAD – ORC SOLDIER | profile | Animosity, Armour, Belligerent, Die Hard, Infected, Night Vision, Weapon | 7 |
| 51 | HOLG STUNTYSTICKER – ORC SKIRMISHER | profile | Animosity, Armour, Belligerent, Die Hard, Infected, Night Vision, Ranged, Weapon | 8 |
| 58 | HIZSSS SNAKESKIN – SAVAGE ORC SHAMAN LORD | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 9 |
| 59 | SLITH SNAKE-WRANGLA – SAVAGE ORC WARLORD | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ward, Weapon | 9 |
| 60 | BRUUG – SAVAGE ORC SKIRMISHER | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ranged, Ward, Weapon | 10 |
| 61 | GARN – SAVAGE ORC SKIRMISHER | profile | Animosity, Armour, Belligerent, Die Hard, Frenzy, Infected, Night Vision, Ranged, Ward, Weapon | 10 |
| 68 | OGLAH KHAN – HOBGOBLIN CHIEF | profile | Animosity, Armour, Infected, Night Vision, Ranged, Weapon | 6 |
| 69 | “ZSCHOKKE” GLAHH – HOBGOBLIN SOLDIER | profile | Animosity, Armour, Infected, Night Vision, Weapon | 5 |
| 70 | GAGLAH GHRAN – HOBGOBLIN ELITE | profile | Animosity, Armour, Infected, Night Vision, Weapon | 5 |
| 71 | HHRAG WOLF-WISPRA – HOBGOBLIN SKIRMISHER | profile | Animosity, Armour, Infected, Night Vision, Ranged, Weapon | 6 |
| 78 | good at something, never chew it for free.’ This makes | profile | Armour, Hungry, Night Vision, Prejudice, Size, Weapon | 6 |
| 79 | RULG DEATHCHEATER – OGRE BUTCHER | profile | Armour, Hungry, Night Vision, Prejudice, Size, Weapon | 6 |
| 80 | YRG BEASTKILLER - OGRE HUNTER | profile | Armour, Hungry, Night Vision, Prejudice, Size, Ranged, Weapon | 7 |
| 81 | SKEL LONGSTRIDER – OGRE IRONGUT | profile | Armour, Hungry, Night Vision, Prejudice, Size, Weapon | 6 |
| 88 | STONE TROLL | template | Armour, Magic Resistance, Night Vision | 3 |
| 88 | RIVER TROLL | template | Amphibious, Distracting, Night Vision, Stealthy, Swamp-strider | 5 |
| 88 | CHAOS TROLL | template | Corruption | 1 |
| 88 | BILE TROLL | template | Corrosive Blood, Corruption, Disease, Distracting | 4 |
| 89 | OLD TROLL | template | Night Vision, Painless, Size | 3 |
| 89 | HUNGRY TROLL | template | Frenzy, Hungry | 2 |
| 89 | HULKING TROLL | template | Painless, Size | 2 |
| 89 | RIVER TROLL HAG | profile | Breath, Size | 2 |
| 92 | CRAGTOOTH – OLD STONE TROLL | profile | Armour, Bite, Die Hard, Infected, Magic Resistance, Night Vision, Regenerate, Size, Stupid, Vomit, Weapon | 11 |
| 93 | GRUA GRIBBLEBACK – RIVER TROLL HAG | profile | Amphibious, Armour, Bite, Breath, Die Hard, Distracting, Infected, Night Vision, Regenerate, Size, Stealthy, Stupid, Swamp-strider, Vomit, Weapon | 15 |
| 99 | PURPLE SKULLBACK SPIDER | profile | Arboreal, Night Vision, Size, Venom, Wallcrawler, Weapon, Bite | 7 |
| 105 | ORC AND GOBLIN NEMESES — SKARSNIK, WARLORD OF EIGHT PEAKS | profile | Afraid, Animosity, Armour, Dark Vision, Hatred, Infected, Night Vision, Weapon | 8 |
| 105 | GOBBLA, BLOATED CAVE SQUIG | profile | Bite, Hungry, Grim, Infected, Dark Vision, Size, Trained, Weapon | 8 |
| 107 | GORFANG, CHIEF OF THE RED FANGS | profile | Animosity, Armour, Belligerent, Champion, Die Hard, Infected, Hatred, Night Vision, Weapon | 9 |
| 108 | SOG’KOG - HULKING CHAOS TROLL | profile | Armour, Bite, Corrosive Blood, Corruption, Die Hard, Horns, Infected, Regenerate, Size, Stupid, Tentacles, Vomit, Weapon | 13 |

### L13 — 15 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 29 | KNIGHTS OF THE EMPIRE — DESTRIER — HEAVY WARHORSE | profile | Big, Size, Skittish, Stride, Trained, Weapon | 6 |
| 29 | RIDING HORSE | profile | Size, Skittish, Stride, Trained, Weapon | 5 |
| 109 | DEMIGRYPH MOUNT | profile | Armour, Belligerent, Bestial, Night Vision, Size, Stride, Trained, Weapon | 8 |
| 113 | LOCAL SCOUT — SILVER 1 | profile | Armour, Ranged, Weapon | 3 |
| 113 | SEASONED MERCENARY — SILVER 3 | profile | Armour, Ranged, Weapon | 3 |
| 114 | UP IN ARMS — LAWYER — SILVER 3 | profile | Weapon | 1 |
| 114 | SCRIBE — SILVER 2 | profile | Weapon | 1 |
| 114 | PORTER — SILVER 1 | profile | Armour, Weapon | 2 |
| 114 | DOKTOR — SILVER 5 | profile | Weapon | 1 |
| 115 | VETERAN OF ADVENTURES | template |  | 0 |
| 115 | INFIRM | template |  | 0 |
| 115 | BRIGHT SPARK | template |  | 0 |
| 115 | REFORMED ROGUE | template |  | 0 |
| 115 | OLD SALT | template |  | 0 |
| 115 | DIAMOND IN THE ROUGH | template |  | 0 |

### L14 — 20 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 27 | PRINCE DALLORAN OF COTHIQUE — COTHIQUI NOBLE LORD | profile | Armour, Weapon | 2 |
| 31 | SCION OF MATHLANN | profile | Animosity, Armour, Weapon | 3 |
| 31 | SCION OF MATHLANN SENTINEL | profile | Animosity, Armour, Weapon | 3 |
| 39 | PRINCESS LITHARYS OF ELISIA — COTHIQUI ADMIRAL | profile | Armour, Ranged, Weapon | 3 |
| 45 | PRINCE DALROTH — COTHIQUI NOBLE | profile | Ranged, Weapon | 2 |
| 45 | PRINCE DANNOR — COTHIQUI NOBLE | profile | Prejudice, Ranged, Weapon | 3 |
| 47 | SWIFTFEATHER ROC | profile | Bestial, Bite, Flight, Night Vision, Size, Weapon | 6 |
| 49 | ILLORAHIN SEABROW — COTHIQUI MERCHANT ADVENTURER | profile | Ranged, Weapon | 2 |
| 51 | TORRELAIN MOONROSE — COTHIQUI RINGLEADER | profile | Weapon | 1 |
| 55 | High Receiver Fialthra Swiftprow — Cothiqui Judge | profile | Ranged, Weapon | 2 |
| 57 | HERWIG ALGNAR — HUMAN MASTER MERCHANT | profile | Prejudice, Weapon | 2 |
| 63 | CEYLUII — SHRIKE | profile | Animosity, Arboreal, Fast, Flight, Fury, Magical, Size, Tracker, Venom, Wallcrawler, Weapon | 11 |
| 67 | CIREON FLEETCREST — COTHIQUI TASTE MAKER | profile | Prejudice, Weapon | 2 |
| 69 | REVNA THARVIG — NORSCAN SPY | profile | Armour, Ranged, Weapon | 3 |
| 74 | SHADOWBLADE — DARK ELF ASSASSIN | profile | Armour, Ranged, Weapon | 3 |
| 81 | WHITE LION | profile | Armour, Bestial, Bite, Fury, Grim, Night Vision, Size, Skittish, Stealthy, Stride, Tracker, Weapon | 12 |
| 82 | KRAKEN | profile | Cold-blooded, Constrictor, Dark Vision, Grim, Hungry, Marine Creature, Size, Stealthy, Tentacles, Weapon | 10 |
| 82 | GREAT EAGLE | profile | Bite, Flight, Size, Skittish, Territorial, Weapon | 6 |
| 83 | FLAMESPYRE PHOENIX | profile | Attuned to Magic, Bite, Flight, Magical, Phoenix Reborn, Size, Territorial, Vulnerable to Cold, Wake of Fire, Ward, Weapon | 11 |
| 84 | FROSTHEART PHOENIX | profile | Armour, Attuned to Magic, Bite, Flight, Freezing Aura, Magical, Size, Territorial, Ward, Weapon | 10 |

### L15 — 0 références

Aucun bloc de profil standard repéré ; voir E0-Q28.

### L16 — 23 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 7 | THORGRIM GRUDGEBEARER — DWARF — KARAK LORD | profile | Armour, Weapon | 2 |
| 11 | KAZADOR THUNDERHORN — DWARF KARAK LORD | profile | Armour, Ranged, Weapon | 3 |
| 13 | UNGRIM IRONFIST — DWARF KARAK LORD | profile | Armour, Weapon | 2 |
| 28 | ZYLRA KRAGGSDOTTIR — DWARF TOWNSWOMAN | profile | Armour, Ranged, Weapon | 3 |
| 30 | KAZGAR ROGNISSON — DWARF GATE KEEPER | profile | Armour, Weapon | 2 |
| 31 | HELGA VIKRAMSDOTTIR — DWARF ARTISAN | profile | Armour, Ranged, Weapon | 3 |
| 32 | KING BROKK IRONPICK — DWARF KARAK LORD | profile | Armour, Weapon | 2 |
| 33 | QUEEN THURMA — DWARF KARAK LADY | profile | Weapon | 1 |
| 41 | BRADNI BRONZEBEARD — DWARF ARTISAN — (ARMOURER) | profile | Weapon | 1 |
| 43 | BARAGOR GUTTRISSON — DWARF FORGEMASTER | profile | Armour, Weapon | 2 |
| 45 | NANNA LOGANSDOTTIR — DWARF — HEARTHMISTRESS | profile | Armour, Ranged, Weapon | 3 |
| 51 | KATRIN THORMSDOTTIR — DWARF — DAEMON SLAYER | profile | Ranged, Weapon | 2 |
| 79 | GOTREK GURNISSON — DWARF DAEMON SLAYER | profile | Weapon | 1 |
| 81 | FELIX JAEGER — HUMAN OUTLAW | profile | Armour, Weapon | 2 |
| 83 | OGRE GORGER | profile | Bite, Dark Vision, Hardy, Hungry, Immunity to Psychology, Infected, Infestation, Size, Tracker, Weapon | 10 |
| 84 | MAGMA DRAGON | profile | Armour, Bite, Breath, Flight, Grim, Immunity, Night Vision, Size, Tail, Weapon | 10 |
| 84 | HAGDAR, SCOURGE OF THE DARK LANDS | profile | Armour, Bite, Breath, Daemonic, Flight, Grim, Immunity, Magical, Night Vision, Size, Tail, Weapon | 12 |
| 86 | ROGUE IDOL OF GORK (OR MORK) | profile | Armour, Construct, Die Hard, Infected, Painless, Size, Stupid, Unstable, Weapon | 9 |
| 90 | HESH THE CONTAMINATOR — BRINGER — OF THE WORD | profile | Disease, Frenzy, Infected, Night Vision, Weapon | 5 |
| 90 | CLAN MORBIDUS CLANRAT | profile | Armour, Disease, Infected, Night Vision, Weapon | 5 |
| 90 | PLAGUE MONK | profile | Disease, Frenzy, Infected, Night Vision, Weapon | 5 |
| 90 | PLAGUE RAT | profile | Disease, Infected, Night Vision, Size, Skittish, Stride, Trained, Weapon | 8 |
| 93 | WARLORD BLISTROX BLYTE | profile | Armour, Disease, Infected, Night Vision, Weapon | 5 |

### L17 — 21 références

| Page imprimée | Profil ou gabarit | Type | Traits utilisés (noms) | Nombre |
| --- | --- | --- | --- | --- |
| 30 | CONSTRUCT | profile | Construct, Painless, Size, Stupid, Unstable, Weapon, Corruption, Horns | 8 |
| 61 | ASHAMIRA DIB — HIEROPHANT (SILVER 3) | profile | Weapon | 1 |
| 73 | BALTHASAR GELT — ALCHEMIST LORD (GOLD 4) | profile | Weapon | 1 |
| 85 | TOCHTER GRUNFELD — HUMAN WIZARD LORD (GOLD 2) | profile | Weapon | 1 |
| 97 | RAPHAEL JULEVNO — GRAND ASTROMANCER (GOLD 1) | profile | Weapon | 1 |
| 109 | IMMANUEL-FERRAND HOLSWIG-SCHLIESTEIN — HUMAN SPYMASTER (GOLD 4) | profile | Weapon | 1 |
| 121 | ELSPETH VON DRAKEN — HUMAN WIZARD LORD (GOLD 2) | profile | Ethereal, Immunity to Psychology, Weapon | 3 |
| 133 | SERGOV PFEIFFER — HUMAN BRIGHT WIZARD (SILVER 3) | profile | Weapon | 1 |
| 145 | GREGOR MARTAK — HUMAN SHAMAN LORD (GOLD 2) | profile | Armour, Weapon | 2 |
| 174 | INCARNATE ELEMENTAL OF FIRE | profile | Construct, Grim, Immune, Size, Spellcaster, Stride, Terror, Unstable, Ward, Weapon | 10 |
| 175 | MAGICAL CREATURES — INCARNATE ELEMENTAL OF DEATH | profile | Bite, Constrictor, Construct, Grim, Immune, Size, Stride, Terror, Unstable, Ward, Weapon | 11 |
| 176 | INCARNATE ELEMENTAL OF BEASTS | profile | Armour, Construct, Grim, Horns, Immune, Size, Stride, Terror, Unstable, Ward, Weapon | 11 |
| 179 | FENBEAST | profile | Construct, Dark Vision, Die Hard, Infected, Regenerate, Size, Stupid, Swamp-strider, Unstable, Weapon | 10 |
| 182 | COMBAT FAMILIAR | profile | Weapon, Magical | 2 |
| 182 | POWER FAMILIAR | profile | Weapon, Magical | 2 |
| 182 | SPELL FAMILIAR | profile | Weapon, Magical | 2 |
| 210 | EGRIMM VAN HORSTMANN | profile | Afraid, Armour, Corruption, Distracting, Ward, Weapon | 6 |
| 213 | XIRAT’P – THE ONE WHO READS | profile | Corruption, Daemonic, Distracting, Fear, Immunity to Psychology, Random Caster, Size, Unstable, Weapon | 9 |
| 213 | P’TARIX – THE ONE WHO WRITES | profile | Corruption, Daemonic, Distracting, Fear, Immunity to Psychology, Mutation, Size, Spell Syphon, Unstable, Weapon | 10 |
| 213 | LIBRARY DISC OF TZEENTCH | profile | Armour, Corruption, Daemonic, Distracting, Fear, Flight, Immunity to Psychology, Large, Unstable, Weapon | 10 |
| 216 | MÒNA MIMN — FIMIR MATRIARCH | profile | Armour, Bale Eye, Cold-blooded, Grim, Night Vision, Size, Swamp-strider, Weapon | 8 |

## Couverture et méthode

Repérages lexicaux par livre, puis pages ciblées avec pdftotext -layout ; -raw a servi en complément pour séparer les colonnes. Les tableaux ambigus restent ouverts. Les noms et listes de Traits ont été rapprochés des cartouches, sans transcription de caractéristiques. Les pages de profils ne sont pas une déclaration de lecture exhaustive de tous les paragraphes.

- L01 : 15 références ; pages physiques des profils 14, 26, 34, 74, 75, 76, 77, 78, 79, 80 ; règles imprimées aucune nouvelle règle isolée.
- L02 : 12 références ; pages physiques des profils 30, 76, 77, 78, 90, 92, 93, 94 ; règles imprimées 81, 82, 91.
- L03 : 13 références ; pages physiques des profils 23, 24, 27, 28, 29, 30, 31, 56, 57, 62, 63 ; règles imprimées aucune nouvelle règle isolée.
- L04 : 22 références ; pages physiques des profils 34, 47, 48, 49, 55, 64, 65, 83, 93, 103, 108, 111, 133, 134 ; règles imprimées 133, 134.
- L05 : 58 références ; pages physiques des profils 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339 ; règles imprimées aucune nouvelle règle isolée.
- L06 : 60 références ; pages physiques des profils 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356 ; règles imprimées 356, 357, 358, 359, 360, 361, 362, 363.
- L07 : 68 références ; pages physiques des profils 42, 44, 57, 58, 61, 62, 67, 73, 75, 87, 89, 90, 113, 123, 124, 136, 141, 142, 143, 145, 147, 148, 153, 155, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182 ; règles imprimées 125, 126, 127, 151, 165, 166, 167, 168, 169, 170, 171, 172, 174, 175, 177, 178, 179, 180, 181.
- L08 : 0 références ; pages physiques des profils aucune repérée ; règles imprimées aucune nouvelle règle isolée.
- L09 : 53 références ; pages physiques des profils 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 72, 73, 74, 80, 81, 82, 86, 87, 88, 89, 95, 96, 97, 103, 104, 110, 111, 116, 117, 118, 122, 124, 126 ; règles imprimées 44, 46, 47, 49, 51, 52.
- L10 : 29 références ; pages physiques des profils 9, 12, 13, 14, 15, 38, 50, 51, 68, 74, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95 ; règles imprimées 68.
- L11 : 68 références ; pages physiques des profils 10, 13, 15, 17, 19, 21, 23, 25, 27, 28, 30, 31, 32, 35, 36, 37, 41, 45, 47, 49, 50, 52, 54, 57, 59, 61, 63, 65, 67, 70, 75, 76, 77, 79, 80, 81, 82, 85, 86, 88, 90, 91, 93, 95, 122, 124, 126, 128, 130, 132, 135, 136, 137 ; règles imprimées 13, 15, 17, 19, 21, 23, 25, 30, 31, 32, 36, 37, 41, 45, 47, 49, 50, 52, 54, 57, 59, 61, 63, 65, 67, 70, 75, 76, 77, 79, 81, 82, 85, 86, 88, 90, 91, 93, 95, 135, 136, 137.
- L12 : 64 références ; pages physiques des profils 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 26, 27, 28, 29, 36, 37, 38, 39, 48, 49, 50, 51, 58, 59, 60, 61, 68, 69, 70, 71, 78, 79, 80, 81, 88, 89, 92, 93, 99, 105, 107, 108 ; règles imprimées aucune nouvelle règle isolée.
- L13 : 15 références ; pages physiques des profils 29, 109, 113, 114, 115 ; règles imprimées 107.
- L14 : 20 références ; pages physiques des profils 27, 31, 39, 45, 47, 49, 51, 55, 57, 63, 67, 69, 74, 81, 82, 83, 84 ; règles imprimées 83, 84.
- L15 : 0 références ; pages physiques des profils aucune repérée ; règles imprimées aucune nouvelle règle isolée.
- L16 : 23 références ; pages physiques des profils 7, 11, 13, 28, 30, 31, 32, 33, 41, 43, 45, 51, 79, 81, 83, 84, 86, 90, 93 ; règles imprimées 84.
- L17 : 21 références ; pages physiques des profils 30, 61, 73, 85, 97, 109, 121, 133, 145, 174, 175, 176, 179, 182, 210, 213, 216 ; règles imprimées 174, 175, 176, 214, 217.

Les PNJ seulement nommés sans bloc de profil, les carrières et les créatures seulement évoquées ne sont pas comptés. Les sources extérieures renvoyées par les livres ne sont pas inventées. Aucun contrôle indépendant de toutes les pages du corpus n’est revendiqué.

## openQuestions

- **E0-Q01** : Le manifeste contient 17 livres L01–L17 et aucun L18. Toute nouvelle source rouvre ce repérage.
- **E0-Q02** : Noms français : L05 p.338–343 sert de référence, avec deux pages physiques de décalage. Effrayé/Craintif, Grimpant/Grimpeur, Foulée/Sprinter/Striding Gait doivent être rapprochés explicitement. Plusieurs têtes et Féroce n’ont pas de nom L05 attesté.
- **E0-Q03** : Taille : cinq catégories en L06 p.360–361, sept dans plusieurs suppléments V4. Garder l’arbitrage Petit local ; ne pas migrer fiches ou profils par simple traduction.
- **E0-Q04** : Les tableaux de Taille et Blessures L06 p.360–361 sont désalignés à l’extraction. Vérifier visuellement les associations avant de générer un nouveau calcul générique.
- **E0-Q05** : Belliqueux : L06 protège de Peur avec Élan, L09 exige aussi absence d’Élan adverse, L11 compare l’Avantage et protège de toute Psychologie. Choisir la version par source.
- **E0-Q06** : À Sang-froid : Avantage au Calme en L06 p.357, inversion des échecs en L09 p.46. Ne pas appliquer cumulativement.
- **E0-Q07** : Féroce : L06 p.358 agit en fin de Tour sur Élan ; L07 p.165 et L17 p.176 agissent au début sur Avantage avec exclusions d’États différentes.
- **E0-Q08** : Une attaque structurée de transformation ou un talent homonyme ne prouve pas que le Trait libre est lu. Il faut décider et tester le raccordement Trait → actions, Tests et acquisition d’États.
- **E0-Q09** : Résistance à la Magie, Champion, Frénésie, Haine, Béni et Miracles disposent de chemins par talents ; l’étiquette seule ne démontre pas ces prérequis. Conserver ce distinguo.
- **E0-Q10** : Les lecteurs reconnaissent certaines natures pour filtrer les sorts. Cela n’automatise pas les besoins vitaux, le remplacement de Volonté des Fabriqués ou l’immunité physique des Éthérés. Fabriqué et Artificiel demandent aussi un alias explicite.
- **E0-Q11** : Démoniaque et Protection : coup entier/critique ou dégâts seuls, exceptions magiques et ordre d’application doivent être raccordés au service commun. Un seuil posé en texte ne suffit pas.
- **E0-Q12** : Régénération : choisir le critique guéri sur dix, lier ses États, conserver blessures de feu et amputations ; le registre A9/A11 est disponible mais ne réalise pas ce Trait.
- **E0-Q13** : Plusieurs têtes : registre par tête valide et effets de critique limités à une tête avant neutralisation globale ; ne pas confondre avec de simples attaques multiples.
- **E0-Q14** : Souffle V5 gratuit ne précise pas le coût d’Élan ici ; versions Zoo/Soufre emploient Avantage. Vomissement V5 consomme Mouvement+Action et attend douze heures, contrairement au Zoo.
- **E0-Q15** : Taille des PNJ : les dégâts imprimés contiennent déjà leurs modificateurs. Une importation ne doit pas rajouter une seconde fois BF, Taille ou armure.
- **E0-Q16** : Les catégories sang-chaud/sang-froid de L07 p.166 ne sont pas le Trait À Sang-froid ; les cas limites relèvent du MJ, notamment morts-vivants et mutations.
- **E0-Q17** : Aquatic du Brainfluke est indiqué sans formule détaillée dans le passage lu. Ne pas le remplacer arbitrairement par Amphibie ou Créature marine.
- **E0-Q18** : Dompté est le sens de Trained (Broken), jamais l’État Brisé. Les nouvelles formations de chasse et Cavalerie de choc ont leurs prérequis et Tests propres.
- **E0-Q19** : L07 p.151 : associations des Marques des Anciens décalées dans le tableau extrait. Les règles Télépathie/Caméléon sont lisibles ; le tableau de pontes exige un contrôle visuel avant génération.
- **E0-Q20** : Slann : réseau géomantique, prêtre-relais, incidents transférés, palanquin et deux Actions du prêtre relique constituent des capacités particulières, pas des autorisations à généraliser aux autres mages.
- **E0-Q21** : Familiers : animal (L02) et homoncule (L17) suivent deux systèmes distincts de Traits, soins, Corruption et portée. Leur présence dans une fiche n’en automatise pas le lien spirituel.
- **E0-Q22** : Les fiches prétirées du Zoo ont des incohérences d’intitulés, par exemple Lynathryn/Kirsten et certains métiers. Les grands titres sont retenus ; aucune caractéristique n’a été corrigée.
- **E0-Q23** : Les profils L09/L10 mêlent parfois Traits et talents ; les listes ci-présentes retiennent les noms de Traits reconnus et signalent les limites. Compléter les paramètres et talents au futur importeur, sans recopier les blocs complets.
- **E0-Q24** : Le Crypt Ghast L10 p.68 porte Sans peur sans spécialisation. Le groupe protégé doit être fourni avant d’utiliser le talent V5.
- **E0-Q25** : Les armes nommées, Claws et Blowpipe dans certains profils sont des attaques, pas forcément de nouveaux Traits génériques. Les conserver dans un futur modèle d’actions typées.
- **E0-Q26** : Capacités de profils : coûts d’Avantage, portée, visibilité, cible et autorisations MJ doivent être saisis avant application ; pas de déduction de géométrie ou de consentement d’une monture.
- **E0-Q27** : Les 541 références incluent 27 gabarits et 6 prétirés, distingués par kind. Elles ne représentent ni 541 espèces ni 541 profils importés et jouables.
- **E0-Q28** : Aucun bloc standard de profil n’a été repéré dans L08 ou L15 ; des noms, carrières, exemples et renvois y existent. Ce résultat lexical n’est pas un inventaire exhaustif de tous les PNJ mentionnés.
- **E0-Q29** : Les qualités d’équipement analogues déjà calculées par le moteur ne prouvent pas les capacités particulières du Zoo ; leur raccordement au profil reste un chantier distinct.
- **E0-Q30** : Peur/Terreur et fuite : réutiliser les questions C0, notamment seuil, DR négatifs, immunités et fuite engagée. Les exceptions de poison restent séparées.

## Validation et limites

Champs, références de code, identités et décomptes vérifiés. Aucun bloc complet de caractéristiques recopié ; aucun changement de code, de catalogue ou de test. La recette verte de phase A valide ses contrôles nommés, pas les Traits absents ni l’exhaustivité du corpus.

## Complément du 21/10/2026 (livres L18 à L26)

AJOUT : 443 références de profils et 39 Traits ou capacités, tous marqués `addedOn: "2026-10-21"`. L18 (Power Behind the Throne Companion) était déjà autorisé (arbitrage Q05), sans avoir été inventorié ici ; L19 à L26 ont été ajoutés au corpus le 21/10. Les noms de profils sont déduits du titre imprimé (provisoires, relus à l’import) ; les noms de Traits V4 sont rapprochés des Traits V5 par une table d’alias (`tools/lib/bestiary-complement-data.mjs`), sans changer leur règle.

### Traits et capacités ajoutés

| ID | Source | Nom / nom français | Genre | Résumé |
| --- | --- | --- | --- | --- |
| E0-T-250 | L21 p.21 | Breath (Warpfire) / Souffle (Feu du Warp, traduction de travail) | variant | Souffle ordinaire ; qui rate l’esquive fait un Test d’Endurance Intermédiaire (+0 DR) et, réussi ou non, subit une exposition modérée à la Corruption. |
| E0-T-251 | L18 p.85 | Formless Horror / Horreur informe (traduction de travail) | profile-ability | Propre au Changelin : une fois par Round, copie exacte d’une créature typique ou d’un individu étudié BI heures ; il gagne ses Traits et peut utiliser ses caractéristiques à la place des siennes (compétences de l’individu, pas ses souvenirs). Même texte en L21 p.56. |
| E0-T-252 | L21 p.21 | Font of Flame / — | profile-ability | Flamer de Tzeentch sans assez d’Élan pour son Souffle : un d10, de 8 à 10 il peut tout de même souffler. Termes V4 convertis en V5 au lot de l’implantation (±10 → ±1 DR, Avantage → Élan). |
| E0-T-253 | L21 p.63 | Messy Demise / — | profile-ability | À la mort d’un Squig colossal, tout engagé à trois yards fait un Test d’Esquive Intermédiaire (+0 DR) sinon 2d10 Blessures réduites par Endurance et armure, minimum une. |
| E0-T-254 | L21 p.62 | Hammer Hand / — | profile-ability | Le bras massif de l’Ettin maudit ajoute +30 au jet de gravité de toutes ses Blessures Critiques (table V4 en pourcentage : lecture V5 à fixer au lot). |
| E0-T-255 | L21 p.64 | Suffused with Death / — | profile-ability | Dans les 80 yards du colosse, les sorts de la Mort et de la Nécromancie gagnent +1 DR ; ceux de Ghyran, Hysh et Azyr subissent −10 (−1 DR en V5). |
| E0-T-256 | L21 p.64 | Garden of Corpses / — | profile-ability | Le colosse vaincu libère 3d10 zombies qui attaquent tout être vivant proche. |
| E0-T-257 | L19 p.117 | Paralysing Chill / Froid paralysant (traduction de travail) | profile-ability | Le Spectre ne fait aucun dégât ; un coup au but inflige un état Sonné par DR de marge. |
| E0-T-258 | L19 p.115 | Manifestation of Ghur / — | profile-ability | Les sorts du Domaine des Bêtes ne nuisent pas à l’Élémentaire incarné ; les effets qui blessent davantage Démons et Morts-vivants le touchent comme eux, sauf ceux de ce Domaine. |
| E0-T-259 | L19 p.115 | Eternal Guardian / — | profile-ability | L’Élémentaire gardien tué se reconstitue en d10 jours, sauf précautions adaptées (dressage, drainage magique, corruption de la source). |
| E0-T-260 | L19 p.115 | Howl of the Great Beast / — | profile-ability | À son Tour, pour un Élan, hurlement en attaque gratuite : vivants à Initiative yards, trois Assourdi et Test de Calme Difficile sinon trois Brisé ; qui réussit une fois n’y est plus soumis durant la rencontre. Termes V4 convertis en V5 au lot de l’implantation (±10 → ±1 DR, Avantage → Élan). |
| E0-T-261 | L19 p.116 | Shapeshift / Changement de forme (Enfant d’Ulric) | profile-ability | L’Enfant d’Ulric passe d’une forme à l’autre en dépensant deux actions. |
| E0-T-262 | L19 p.109 | Stinging Tail / — | profile-ability | Gnawretch : attaque de queue gratuite pour un Élan ; qui subit des dégâts devient Empoisonné. |
| E0-T-263 | L19 p.109 | Prosthetic Hand / — | profile-ability | Gnawretch porte toujours un couteau à la main gauche et ne peut employer d’arme à deux mains. |
| E0-T-264 | L18 p.117 | Flaming / — | profile-ability | Une morsure de crâne volant qui inflige au moins une Blessure inflige aussi un état Enflammé. |
| E0-T-265 | L18 p.119 | Headless / Sans tête (traduction de travail) | profile-ability | Un coup à la tête devient un coup au corps si l’attaque réussit avec 2 DR ou plus, sinon un échec. |
| E0-T-266 | L22 p.14 | Warp-Cursed Blades / — | profile-ability | Les épées des gardes de Skrittar comptent comme armes de poing et possèdent en plus les qualités Dévastatrice et Empaleuse. |
| E0-T-267 | L25 p.56 | Mark of Khorne / Marque de Khorne | trait-or-variant | Marque physique : talent Frénésie, Étiquette (Fidèles de Khorne), Animosité réciproque envers les adorateurs de Slaanesh tant que la marque se voit ; jamais Langue (Magick) ni Focalisation sauf pour dissiper ; talents martiaux achetables comme avancements. Variante de E0-T-035, à ne pas fusionner. |
| E0-T-268 | L23 p.82 | Mark of Tzeentch / Marque de Tzeentch | trait-or-variant | Marque physique : 1d10/3 Mutations (arrondi au supérieur) alternées mentales et physiques (colonne Tzeentch), Étiquette (Fidèles de Tzeentch), Animosité réciproque envers les adorateurs de Nurgle tant que la marque se voit ; talents de magie achetables comme avancements. Variante de E0-T-035. |
| E0-T-269 | L23 p.84 | Split / Scission (traduction de travail) | trait | Sur Blessure Critique ou à zéro Blessure, la créature se scinde en deux Horreurs bleues intactes. |
| E0-T-270 | L23 p.84 | Tzeentch’s Fire / Feu de Tzeentch (traduction de travail) | trait | Les Horreurs du même type proches mettent leur pouvoir en commun : l’une lance un sort de Tzeentch par Round (Feu rose ou bleu), +1 DR par autre Horreur, jusqu’à +9 DR. |
| E0-T-271 | L23 p.87 | Shapeshifter (Creature) / Métamorphe (créature) | trait | Passe à volonté à la forme de la créature désignée (un Round entier, sans Mouvement ni Action) ; à la pleine lune, Test de Volonté Facile (+20) au crépuscule sinon transformation ; garde Int, FM et Soc, le reste devient le profil de la créature. |
| E0-T-272 | L25 p.140 | Marine Creature / Créature marine (traduction de travail) | trait | Mouvement plein dans l’eau ; hors de l’eau M tombe à 1 et tous ses Tests subissent −2 DR ; doit être régulièrement arrosée sous peine d’asphyxie. |
| E0-T-273 | L25 p.140 | Grim (Rating) — Sea of Claws / Féroce — Sea of Claws | variant | Début de Tour sans l’indice en Élan : la réserve monte à l’indice, sauf Enchevêtré, Surpris ou Inconscient ; avec les règles de groupe de Up in Arms, la créature fournit l’indice à la réserve adverse. Même texte que E0-T-209 (Lustria). |
| E0-T-274 | L26 p.90 | Analgesic Saliva / Salive analgésique (traduction de travail) | trait | La morsure ne fait pas mal : la créature s’attache sans réveiller une victime endormie ; l’effet cesse 10 − BE Rounds après qu’elle se détache. |
| E0-T-275 | L26 p.90 | Anticoagulant Saliva / Salive anticoagulante (traduction de travail) | trait | La victime d’une morsure gagne un état Hémorragique. |
| E0-T-276 | L26 p.90 | Aquatic — Death on the Reik / Aquatique — Death on the Reik | variant | Respire sous l’eau et se déplace à pleine vitesse dans l’eau, mais ne peut pas se déplacer sur terre. Précise la mention sans règle de L07 (E0-T-210). |
| E0-T-277 | L26 p.90 | Attach and Feed / S’attacher et se nourrir (traduction de travail) | trait | Une morsure réussie attache la créature : perte automatique d’une Blessure par Round ; à zéro la victime devient Inconsciente. Elle ne lâche qu’une fois repue (son BE en Blessures) ; on l’arrache par Force opposée en infligeant une Blessure ; ce qu’elle craint la fait lâcher. |
| E0-T-278 | L26 p.90 | Creeping / Rampant (traduction de travail) | trait | Implacable mais lente : la créature ne peut jamais Courir. |
| E0-T-279 | L26 p.90 | Engulf — Death on the Reik / Engloutir — Death on the Reik | variant | Toute attaque réussie d’une créature assez grande engloutit la victime (même sans dégâts) : un Enchevêtré de la Force de la créature, un de plus à chaque début de Round et une Blessure automatique ; trop petite, elle immobilise seulement la localisation touchée. Variante de E0-T-119. |
| E0-T-280 | L26 p.90 | Hallucinogen / Hallucinogène | trait | Musc hallucinogène : à deux yards (plus sous le vent), Test de Volonté Facile (+20) sinon un Sonné par niveau d’échec. |
| E0-T-281 | L26 p.90 | Capricious / Capricieux (traduction de travail) | trait | Humeur changeante : tout Test de Sociabilité mené avec elle se modifie selon un d10 (1 : −2 DR ; 2-3 : −1 ; 4-7 : aucun ; 8-9 : +1 ; 10 : +2). |
| E0-T-282 | L26 p.88 | Naiad War-Form / Forme de guerre (Naïade) | profile-ability | Passage gratuit en forme d’eau vive : Peur 2 et Armure 2 ; chaque Round, un aspect différent au choix (Crue : +1 DR Force/Endurance et dégâts à +10 ; Méandre : +2 DR sur CC ; Rapides : Mouvement 10 et +1 DR à l’Esquive ; Eau calme : Immunité Psychologique). |
| E0-T-283 | L25 p.149 | Lord of the Deeps / — | profile-ability | Triton : Charme animal et Affinité avec les animaux ne valent que pour les créatures marines, mais sans les empêchements habituels (belliqueuse, territoriale, dressée, blessée) ; seules les créatures dominées par magie ne lui obéissent pas. |
| E0-T-284 | L25 p.149 | Favoured of Manann / — | profile-ability | Triton : lien avec Manann laissé au MJ ; il répond mal à un navire dont l’Humeur de Manann est négative et peut honorer un navire à 50 ou plus. |
| E0-T-285 | L25 p.149 | Miracles as Spells / Miracles lancés comme des sorts | profile-ability | Triton lance comme des sorts de NI 1 des miracles de Manann (Becalm, Fair Winds, Sea Curse, Rip Tides) et de Stromfels (Raging Seas) et peut les surpuissanter comme des sorts. |
| E0-T-286 | L24 p.66 | Unstable Reformation / — | profile-ability | Si Inta-Dapesht « meurt » à cause d’Instable, il se reforme après 8 heures avec toutes ses Blessures. |
| E0-T-287 | L22 p.14 | Shield (Rating) / Bouclier (valeur) | trait-V4 | Trait V4 de profil (« Shield 2* ») : bouclier de la valeur indiquée ; lu comme l’option Bouclier de L06 p.319 (+n PA et +1 DR en opposition par Esquive ou Mêlée) ; l’astérisque n’a pas de note imprimée dans les passages lus. |
| E0-T-288 | L22 p.73 | Creature Weapons (Claws, Beak, Slam, Tongue) / Armes naturelles V4 (Griffes, Bec, Coup, Langue) | trait-V4 | Attaques naturelles V4 écrites « Claws +6 », « Beak +8 », « Slam +n », « Tongue Attack +3 » : dégâts imprimés, déjà complets, à traiter comme les autres armes de créature. |

### Profils ajoutés

| ID | Source | Nom | Traits reconnus | Capacités |
| --- | --- | --- | --- | --- |
| E0-P-542 | L18 p.31 | Golthog — Ogre Soldier (Silver 3) | Armour, Night Vision, Prejudice, Size, Weapon | — |
| E0-P-543 | L18 p.53 | Sascha Rothbert — Human Procurer (Silver 1) | Weapon | — |
| E0-P-544 | L18 p.56 | Hausmeister Breugal — Human Governor, Former Advisor (Gold 3) | Prejudice, Weapon | — |
| E0-P-545 | L18 p.60 | Nastassia — Human Spymaster (Gold 4) | Armour, Weapon | — |
| E0-P-546 | L18 p.63 | Alfric `Half-Nose' Anvilbreaker — Dwarf Fence (Silver 2) | Animosity, Hatred, Prejudice, Weapon | — |
| E0-P-547 | L18 p.66 | Thognar — Dwarf Aide (Silver 2) | — | — |
| E0-P-548 | L18 p.68 | Edel Mueller — Human High Priestess (Gold 1) | — | — |
| E0-P-549 | L18 p.71 | Isolde Begegnen — Human High Priestess (Gold 1) | — | — |
| E0-P-550 | L18 p.74 | Brunhilde Klaglich — Human Spymaster (Gold 4) | Armour, Weapon | — |
| E0-P-551 | L18 p.85 | Changeling of Tzeentch | Corruption, Daemonic, Dark Vision, Distracting, Fear, Formless Horror, Spellcaster, Unstable, Weapon | E0-T-251 |
| E0-P-552 | L18 p.96 | Peter Tavelli — Yellow Fang Cultist (Brass 4) | Prejudice, Ranged, Weapon | — |
| E0-P-553 | L18 p.96 | Tigrati `Head' Parvisch — Cultist (Brass 2) | Infestation, Weapon | — |
| E0-P-554 | L18 p.97 | Yellow Fang Cultists | Armour, Weapon | — |
| E0-P-555 | L18 p.97 | Skaven Grey Seer | Corruption, Night Vision, Spellcaster, Weapon | — |
| E0-P-556 | L18 p.97 | Yellow Fang Cultists | Armour, Weapon | — |
| E0-P-557 | L18 p.97 | Skaven Grey Seer | Corruption, Night Vision, Spellcaster, Weapon | — |
| E0-P-558 | L18 p.114 | Henri-Phillippe Rocheteau — Human Village Elder, Former Merchant (Silver 5) | — | — |
| E0-P-559 | L18 p.114 | Villager (Brass 4) | — | — |
| E0-P-560 | L18 p.115 | Parzival Tristan Aschaffenberg Noble, Former Soldier (Silver 5*) | — | — |
| E0-P-561 | L18 p.115 | Isolde Gudhoffen — Villager (Brass 3) | — | — |
| E0-P-562 | L18 p.116 | The Militia Sentry, Former Villager (Silver 1) | — | — |
| E0-P-563 | L18 p.116 | Typical Villager — Villager (Brass 3) | Prejudice | — |
| E0-P-564 | L18 p.116 | Wuder Lechart — Village Fool (Brass 0) | Corruption, Immunity, Tough | — |
| E0-P-565 | L18 p.117 | Flying Death Skulls | Bite, Construct, Fear, Fly, Infected, Night Vision, Size, Undead, Weapon | — |
| E0-P-566 | L18 p.117 | Zombie | Armour, Construct, Dark Vision, Fear, Painless, Territorial, Undead, Unstable | — |
| E0-P-567 | L18 p.117 | Flying Death-Ier Skulls | Bite, Construct, Fear, Fly, Night Vision, Size, Undead | E0-T-264 |
| E0-P-568 | L18 p.117 | Zombie Champion | Armour, Construct, Dark Vision, Fear, Hardy, Painless, Shield, Territorial, Undead, Weapon | — |
| E0-P-569 | L18 p.118 | Wizard | Clever, Prejudice, Stealthy, Weapon | — |
| E0-P-570 | L18 p.119 | Headless Skeleton Champions | Armour, Construct, Dark Vision, Fear, Painless, Undead, Unstable, Weapon | E0-T-265 |
| E0-P-571 | L18 p.119 | Headless Skeletons | Armour, Construct, Dark Vision, Fear, Painless, Undead, Unstable | E0-T-265 |
| E0-P-572 | L19 p.32 | Sergeant Wolfgard Hohmann — Human Honour Guard (Silver 3) | Armour, Weapon | — |
| E0-P-573 | L19 p.32 | Sergeant Wereburga Krotpreffer — Human Honour Guard (Silver 3) | Animosity, Armour, Prejudice, Weapon | — |
| E0-P-574 | L19 p.39 | Alfric `Half-Nose' Anvilbreaker — Dwarf Fence (Silver 2) | Animosity, Hatred, Prejudice, Weapon | — |
| E0-P-575 | L19 p.52 | Captain Moritz Valgeir — Human Knight, Former Sergeant (Silver 5) | Armour, Weapon | — |
| E0-P-576 | L19 p.52 | Wulfric Tore — Human Merchant (Silver 5) | — | — |
| E0-P-577 | L19 p.67 | Mote Yarrow the Fetchling | Ethereal, Prejudice | — |
| E0-P-578 | L19 p.67 | Yanni Weber — Human Master Wizard (Gold 1) | Weapon | — |
| E0-P-579 | L19 p.72 | Stefan Hochen — Human Doktor (Silver 5) | — | — |
| E0-P-580 | L19 p.72 | Marta Gerbenshreiber — Human Bailiff (Silver 5) | Armour, Prejudice, Weapon | — |
| E0-P-581 | L19 p.78 | Waldtraud Blass — Human Master Apothecary, Former Apprentice Artisan (Silver 3) | — | — |
| E0-P-582 | L19 p.78 | Johen — Human Witch (Brass 2) | — | — |
| E0-P-583 | L19 p.85 | Ritta — Human Con Artist (Silver 2) | — | — |
| E0-P-584 | L19 p.89 | Wulfrum Viert — Human Steward (Gold 1) | — | — |
| E0-P-585 | L19 p.89 | Emmille M—nzst—tter — Human Artisan (Silver 1) | Prejudice | — |
| E0-P-586 | L19 p.95 | Agna Lottrisdottir — Dwarf Envoy (Silver 4) | Animosity, Armour, Hatred, Prejudice, Weapon | — |
| E0-P-587 | L19 p.95 | Helmut Beckenbauer — Human Gang Boss (Silver 3) | Armour, Prejudice, Weapon | — |
| E0-P-588 | L19 p.100 | Brother Bengt — Human Priest (Silver 1) | Prejudice | — |
| E0-P-589 | L19 p.100 | Walpurga Wurklich — Human Agitator (Brass 2) | Animosity, Prejudice | — |
| E0-P-590 | L19 p.106 | Grand Vizier Bhar - Necromancer (Silver 3) | — | — |
| E0-P-591 | L19 p.106 | Andrea Bruhn — Human Town Councillor (Silver 5) | Prejudice | — |
| E0-P-592 | L19 p.109 | Castellan-Warlord Gnawretch Skrray | Armour, Infected, Mutation, Tail | E0-T-262, E0-T-263 |
| E0-P-593 | L19 p.110 | Master-Moulder Skree | Armour, Bite, Die Hard, Infected, Regeneration | — |
| E0-P-594 | L19 p.110 | Arch-Prelate Kanker Flett | Corruption, Disease, Infected | — |
| E0-P-595 | L19 p.114 | Jacopo Schmidt — Human Procurer (Silver 1) | — | — |
| E0-P-596 | L19 p.114 | Traudl Bauer — Human Penitent (Brass 0) | Animosity, Hatred, Prejudice, Weapon | — |
| E0-P-597 | L19 p.115 | The Bloody Hidesman | Armour, Construct, Horns, Size, Stride, Territorial, Terror, Unstable | E0-T-258, E0-T-259, E0-T-260 |
| E0-P-598 | L19 p.116 | Child of Ulric | Armour, Bite, Fear, Night Vision, Tracker | E0-T-261 |
| E0-P-599 | L19 p.117 | Spectre | Dark Vision, Ethereal, Fear, Undead, Unstable | E0-T-257 |
| E0-P-600 | L19 p.117 | White Wolf | Armour, Bite, Night Vision, Size, Stride, Tracker | — |
| E0-P-601 | L19 p.141 | `Magister' Hugo Greendale | — | — |
| E0-P-602 | L19 p.141 | Beate Moser | — | — |
| E0-P-603 | L19 p.142 | Old Otto | — | — |
| E0-P-604 | L19 p.142 | Brigitte Schleigel | Afraid, Prejudice | — |
| E0-P-605 | L19 p.143 | Brute | Armour | — |
| E0-P-606 | L19 p.143 | Athlete | Armour | — |
| E0-P-607 | L19 p.143 | Dwarf | Armour | — |
| E0-P-608 | L19 p.150 | Gerdon Salzwed — Middenheimer Fence (Silver 2) | — | — |
| E0-P-609 | L19 p.151 | Hasso Schroeter Middenheimer Entertainer (Brass 5) | — | — |
| E0-P-610 | L19 p.152 | Kat Sperber — Middenlander Pedlar (Brass 4) | — | — |
| E0-P-611 | L19 p.153 | Theresia Kleist Nordlander Seawoman (Silver 3) | — | — |
| E0-P-612 | L19 p.157 | Pestilential Liche-Thing | Corruption, Die Hard, Ethereal, Hatred, Infected, Regeneration, Terror | — |
| E0-P-613 | L20 p.21 | Altdorf — Governance of Altdorf Thyrus Gormann — Wizard Lord (Gold 2) | Animosity, Weapon | — |
| E0-P-614 | L20 p.32 | Andreas Brohne — Human Gang Boss (Silver 3) | Weapon | — |
| E0-P-615 | L20 p.32 | Breem — Human Racketeer (Brass 5) | Armour, Weapon | — |
| E0-P-616 | L20 p.36 | Willi Pick — Dock Master (Silver 5) | Armour, Weapon | — |
| E0-P-617 | L20 p.37 | Balthus — Human Pamphleteer (Brass 1) | Armour, Weapon | — |
| E0-P-618 | L20 p.59 | Seymour Taungar — Human Troubadour (Silver 3) | — | — |
| E0-P-619 | L20 p.60 | Rosanna Ophuls Master Investigator (Silver 3) | — | — |
| E0-P-620 | L20 p.62 | Svenrina `the Grey' Hallovadottir — Dwarf Master Artist (Silver 5) | Armour, Weapon | — |
| E0-P-621 | L20 p.65 | Gravin Luciana von Eckstein — Human Magnate (Gold 5) | — | — |
| E0-P-622 | L20 p.67 | Deanne L'Isanore — Human Entertainer (Brass 5) | — | — |
| E0-P-623 | L20 p.67 | Preternaturally Fine Burglar | — | — |
| E0-P-624 | L20 p.71 | Baron Ewald von Laue — Human Noble (Gold 3) | Weapon | — |
| E0-P-625 | L20 p.72 | Helena Bastiat-Hatzburg, Mistress of Revels — Human Advisor (Silver 4) | — | — |
| E0-P-626 | L20 p.78 | Kurt Helborg Knight of the Inner Circle (Gold 4) | Armour, Fear, Weapon | — |
| E0-P-627 | L20 p.82 | Reik Rivermarshal Sigfreda Marham von Sieblich — Human Shipsword Master (Gold 1) | Armour, Shield, Weapon | — |
| E0-P-628 | L20 p.86 | Lord Tyrkel von Hargenfels, Imperial First Fleet Lieutenant — Human Boatswain (Silver 5) | Armour, Weapon | — |
| E0-P-629 | L20 p.90 | Reinholdt Waffenkammer — Human Officer (Gold 1) | Armour, Weapon | — |
| E0-P-630 | L20 p.90 | Lothar von Liebnitz — Human Sergeant (Silver 5) | Armour, Ranged, Weapon | — |
| E0-P-631 | L20 p.94 | Harald Kleindeinst Watch Captain (Gold 1) | Armour, Ranged, Weapon | — |
| E0-P-632 | L20 p.101 | Freya Husslhaus — Human Priest (Silver 1)) | — | — |
| E0-P-633 | L20 p.102 | Zavant Konniger — Detective (Silver 5) | Armour, Weapon | — |
| E0-P-634 | L20 p.104 | The Stirland Abomination | Belligerent, Bestial, Die Hard, Fury, Horns, Size, Weapon | — |
| E0-P-635 | L20 p.105 | The Drakwald Gibberbeast | Armour, Corruption, Night Vision, Size, Spellcaster, Weapon | — |
| E0-P-636 | L20 p.109 | Gretchen Schwanz — Human Rat Catcher (Silver 1) | Armour, Ranged, Weapon | — |
| E0-P-637 | L20 p.109 | Thomas Fabhber — Human Merchant (Silver 5) | — | — |
| E0-P-638 | L20 p.126 | Maren Mauer — Human Pedlar (Brass 4) | — | — |
| E0-P-639 | L20 p.127 | Genarro Gastoli — Human Soldier (Silver 3) | Armour, Ranged, Weapon | — |
| E0-P-640 | L20 p.132 | The Reikerbahn Pike | Amphibious, Armour, Belligerent, Big, Bite, Cold-blooded, Dark Vision, Frenzy, Hatred, Hungry, Size, Tail, Territorial | — |
| E0-P-641 | L20 p.132 | Hattie Adler | Armour, Belligerent, Bounce, Distracting, Fast, Hungry, Infected, Night Vision, Stealthy | — |
| E0-P-642 | L20 p.136 | Gustav Zasle — Human Cat Burglar (Silver 3) | Armour | — |
| E0-P-643 | L20 p.137 | Honoria Kohle — Human Crime Lord (Silver 5) | Armour, Ranged, Weapon | — |
| E0-P-644 | L20 p.149 | Lunn Yorrisson — Engineer (Silver 2) | Armour, Ranged, Weapon | — |
| E0-P-645 | L20 p.149 | Kazran Dernsson Master Gunsmith (Silver 3) | Armour, Ranged | — |
| E0-P-646 | L20 p.158 | Zofia Miska — Human Master Wizard (Gold 1) | — | — |
| E0-P-647 | L20 p.162 | Frederich `Old' Weirde — Professor (Gold 1) | — | — |
| E0-P-648 | L20 p.163 | Chancellor Eberhardt von Festschrift Professor (Gold 1) | — | — |
| E0-P-649 | L20 p.166 | Melinda Greyweave — Elf Witch (Brass 2) | — | — |
| E0-P-650 | L20 p.167 | Orth Vii Chylis Lightbringer — Elf Master Wizard (Gold 1) | — | — |
| E0-P-651 | L20 p.173 | Count J—ger | Blessed, Dark Vision, Magic Resistance, Miracles, Stealthy, Ward | — |
| E0-P-652 | L20 p.195 | Concern Peony Hayfoot — Spy (Silver 3) | — | — |
| E0-P-653 | L20 p.197 | Burgomeister Chard — Demagogue (Brass 5) | — | — |
| E0-P-654 | L20 p.204 | Warlock Bombardier Skrreth Ffley Clan Skryre Warlock | Armour, Infected, Night Vision, Ranged, Skittish, Weapon | — |
| E0-P-655 | L20 p.204 | Warchief Brruxx Chittirr Clan Mors Chieftain | Armour, Infected, Night Vision, Skittish, Weapon | — |
| E0-P-656 | L20 p.216 | Katarina Briesach Mutant Chaos Champion | Armour, Champion, Corruption, Distracting, Mutation, Ranged, Weapon | — |
| E0-P-657 | L20 p.218 | Human Cultist | — | — |
| E0-P-658 | L21 p.10 | Father Gregor Braun High Priest (Gold 1) | Blessed, Miracles, Weapon | — |
| E0-P-659 | L21 p.10 | Silvie Unterfaut - Sigmarite Priest (Silver 1) | Prejudice, Weapon | — |
| E0-P-660 | L21 p.11 | Wolf-Born Fernand Wagner High Priest (Gold 1) | Blessed, Miracles, Weapon | — |
| E0-P-661 | L21 p.11 | Manfred Ulricson - Ulrican Priest (Silver 1) | Prejudice, Weapon | — |
| E0-P-662 | L21 p.12 | Brother Martin and Brother Rolf — Human Monks (Nuns) (Brass 4) | Prejudice, Weapon | — |
| E0-P-663 | L21 p.14 | The White Wolf of Shining Rock | Armour, Bite, Blessed, Die Hard, Night Vision, Size, Stealthy, Stride, Tracker, Weapon | — |
| E0-P-664 | L21 p.20 | Child of Chaos | Corruption | — |
| E0-P-665 | L21 p.21 | Profil sans titre (L21 p. 21) | Armour, Breath, Corruption, Daemonic, Distracting, Fear, Night Vision, Unstable | E0-T-250, E0-T-252 |
| E0-P-666 | L21 p.22 | Brass | Armour, Weapon | — |
| E0-P-667 | L21 p.22 | Murderous Altdorfer | — | — |
| E0-P-668 | L21 p.24 | Large | Armour, Construct, Immune to Psychology, Painless, Size, Weapon | — |
| E0-P-669 | L21 p.24 | Animated Coach | Armour, Construct, Immune to Psychology, Painless, Size, Weapon | — |
| E0-P-670 | L21 p.24 | Animated Furniture, Medium | Armour, Construct, Immune to Psychology, Painless, Stride, Weapon | — |
| E0-P-671 | L21 p.24 | Animated Furniture, Small | Armour, Construct, Immune to Psychology, Painless, Stride, Weapon | — |
| E0-P-672 | L21 p.25 | Cow Carcass | Construct, Corruption, Die Hard, Immune to Psychology, Immunity, Infected, Magical, Regeneration, Stride, Unstable | — |
| E0-P-673 | L21 p.25 | Pig Carcass | Construct, Corruption, Die Hard, Immune to Psychology, Immunity, Infected, Magical, Regeneration, Size, Stride, Unstable | — |
| E0-P-674 | L21 p.25 | Sheep Carcass | Construct, Corruption, Die Hard, Immune to Psychology, Immunity, Infected, Magical, Regeneration, Size, Stride, Unstable | — |
| E0-P-675 | L21 p.32 | Olgog Gristlefang | Belligerent, Hungry, Immune to Psychology, Night Vision, Size, Weapon | — |
| E0-P-676 | L21 p.32 | The Green Racket | Afraid, Animosity, Infected, Night Vision, Weapon | — |
| E0-P-677 | L21 p.32 | The Doom Divers | Animosity, Night Vision, Weapon | — |
| E0-P-678 | L21 p.33 | Gitface | Animosity, Night Vision, Ranged, Size, Stealthy, Weapon | — |
| E0-P-679 | L21 p.39 | Colonel Reikhardt Sievers Officer (Gold 1) | Armour, Ranged, Weapon | — |
| E0-P-680 | L21 p.40 | Father Eduard von Tunz, — Human Priest (Silver 2) | Armour, Weapon | — |
| E0-P-681 | L21 p.40 | Flag Sergeant Borys Zielin, — Human Scout (Silver 1) | Armour, Ranged, Weapon | — |
| E0-P-682 | L21 p.41 | Bengt Livmatz, — Human Artisan (Silver 1) | Armour, Ranged | — |
| E0-P-683 | L21 p.41 | Scout Sergeant Alicja Bohun, Leader of the Vanguard | Armour, Ranged | — |
| E0-P-684 | L21 p.41 | Renia Gr—newald, — Human Envoy (Silver 2) | — | — |
| E0-P-685 | L21 p.42 | Soldier | Armour, Ranged, Weapon | — |
| E0-P-686 | L21 p.42 | Sebastian, Esmer, Jozef, — Human Sergeants (Silver 1) | Armour, Ranged, Weapon | — |
| E0-P-687 | L21 p.42 | Vanguard Soldier | Armour, Ranged, Striding Gait | — |
| E0-P-688 | L21 p.53 | Wolfgang Holswig-Aberauer the Champion in Shadows | Armour, Distracting, Fear, Regeneration, Tail, Weapon | — |
| E0-P-689 | L21 p.56 | Changeling of Tzeentch | Corruption, Daemonic, Dark Vision, Distracting, Fear, Formless Horror, Spellcaster, Unstable, Weapon | — |
| E0-P-690 | L21 p.61 | Profil sans titre (L21 p. 61) | Armour, Bite, Champion, Chill Grasp, Dark Vision, Immune to Psychology, Immunity, Magical, Size, Stealthy, Terror, Vampiric, Ward, Weapon | — |
| E0-P-691 | L21 p.62 | Profil sans titre (L21 p. 62) | Armour, Dark Vision, Distracting, Hatred, Regeneration, Spellcaster, Terror, Weapon | E0-T-254 |
| E0-P-692 | L21 p.63 | Profil sans titre (L21 p. 63) | Bestial, Bounce, Night Vision, Size | E0-T-253 |
| E0-P-693 | L21 p.64 | Profil sans titre (L21 p. 64) | Construct, Dark Vision, Distracting, Magical, Size, Spellcaster, Terror, Undead | E0-T-255, E0-T-256 |
| E0-P-694 | L21 p.65 | Gregor Smiesdorf - Deserter (Brass 0) | Armour, Ranged, Weapon | — |
| E0-P-695 | L21 p.68 | Sadikur of Numas | Armour, Champion, Dark Vision, Fear, Undead, Weapon | — |
| E0-P-696 | L21 p.71 | Mentag the Undefeated — Pit Champion (Silver 5) | Armour, Belligerent, Champion, Night Vision, Prejudice, Ranged, Size, Weapon | — |
| E0-P-697 | L21 p.71 | Savage the Dog — Good Dog (Brass 0) | Night Vision, Size, Skittish, Trained, Weapon | — |
| E0-P-698 | L21 p.72 | Toddy Shufflefoot — Charlatan (Brass 5) | Night Vision, Ranged, Size, Weapon | — |
| E0-P-699 | L21 p.73 | Erwin von Oberholtzer — Noble (Gold 3) | Weapon | — |
| E0-P-700 | L21 p.78 | Gerta Faernmaus — Duellist (Silver 5) | Armour, Weapon | — |
| E0-P-701 | L21 p.79 | Guards | Armour, Weapon | — |
| E0-P-702 | L21 p.79 | Guard Sergent | Armour, Weapon | — |
| E0-P-703 | L21 p.79 | Ruprecht Etzburger — Seneschal (Gold 1) | Weapon | — |
| E0-P-704 | L21 p.84 | Chaos Beastman | Armour, Belligerent, Fury, Horns, Hungry, Night Vision, Size, Weapon | — |
| E0-P-705 | L21 p.84 | Zurn the Bloody Crown — Chaos Warrior | Armour, Bite, Champion, Clever, Mutation, Tough | — |
| E0-P-706 | L21 p.84 | Ulfhednar the Destroyer — Chaos Warrior | Armour, Champion, Clever, Fast, Mutation, Tough, Weapon | — |
| E0-P-707 | L21 p.84 | Gors of the Red Crown | Arboreal, Armour, Fury, Horns, Night Vision, Weapon | — |
| E0-P-708 | L21 p.84 | Ungors of the Red Crown | Arboreal, Armour, Night Vision, Ranged, Weapon | — |
| E0-P-709 | L21 p.85 | The Siege of Diesdorf Etelka Herzen — Human Wizard Lord (Gold 2) | Corruption, Spellcaster, Weapon | — |
| E0-P-710 | L21 p.85 | Ernst Heidlemann — Human Wizard'S Apprentice (Silver 3) | Weapon | — |
| E0-P-711 | L21 p.117 | Hans Gr—ber Level 1 Monk, Level 4 Wizard (Necromancer) | Clever, Prejudice, Stealthy | — |
| E0-P-712 | L21 p.118 | Winged Nightmare | Armour, Bestial, Bite, Fear, Fly, Size, Trained, Undead | — |
| E0-P-713 | L21 p.118 | Flying Death Skulls | Bite, Construct, Fear, Fly, Infected, Night Vision, Size, Undead, Unstable | — |
| E0-P-714 | L21 p.118 | Hexwraiths | Champion, Chill Grasp, Dark Vision, Ethereal, Magical, Terror, Undead, Unstable, Weapon | — |
| E0-P-715 | L21 p.118 | The Gravelord'S Zombies | Construct, Dark Vision, Fear, Painless, Undead, Unstable, Weapon | — |
| E0-P-716 | L22 p.14 | Grey Seer Skrittar, Herald of the Council of Thirteen | Infected, Night Vision, Weapon | — |
| E0-P-717 | L22 p.14 | The Rat | Bestial, Brute, Infected, Night Vision, Size, Skittish, Stride, Weapon | — |
| E0-P-718 | L22 p.14 | Palanquin Guards | Armour, Champion, Infected, Night Vision, Weapon | E0-T-266 |
| E0-P-719 | L22 p.17 | Gristl Twitchslice | Armour, Infected, Night Vision, Shield, Weapon | — |
| E0-P-720 | L22 p.18 | Treecherik Clanrat | Armour, Infected, Night Vision, Shield, Weapon | — |
| E0-P-721 | L22 p.18 | Clan Eshin Infiltrator | Armour, Infected, Night Vision, Ranged, Stealthy, Weapon | — |
| E0-P-722 | L22 p.20 | Scrak Fangsnapper | Armour, Infected, Night Vision, Weapon | — |
| E0-P-723 | L22 p.20 | Clan Mors Clanrat | Armour, Infected, Night Vision, Weapon | — |
| E0-P-724 | L22 p.22 | Klik Rustclaw — Deathvermin Commander | Armour, Night Vision, Shield, Weapon | — |
| E0-P-725 | L22 p.22 | Deathvermin Stormvermin | Armour, Night Vision, Shield, Weapon | — |
| E0-P-726 | L22 p.25 | Diseased Clanrat | Armour, Disease, Infected, Night Vision, Weapon | — |
| E0-P-727 | L22 p.25 | Blightskab — Plague Priest | Disease, Infected, Night Vision, Weapon | — |
| E0-P-728 | L22 p.28 | Master Moulder Wrakrennch | Armour, Infected, Night Vision, Weapon | — |
| E0-P-729 | L22 p.28 | The Hellbeast of Seep-Gore | Armour, Corrosive Blood, Die Hard, Fear, Infected, Night Vision, Size, Stupid, Trained, Weapon | — |
| E0-P-730 | L22 p.28 | Packmaster | Armour, Infected, Night Vision, Weapon | — |
| E0-P-731 | L22 p.31 | Turntail Poisoned Wind Globadiers | Armour, Night Vision, Ranged, Weapon | — |
| E0-P-732 | L22 p.31 | Turntail Clanrat | Armour, Night Vision, Ranged, Weapon | — |
| E0-P-733 | L22 p.50 | Wolf Rat | Bestial, Bite, Disease, Frenzy, Hungry, Infected, Night Vision, Skittish, Stride, Territorial, Tracker, Trained | — |
| E0-P-734 | L22 p.50 | Great Pox Rat | Armour, Bite, Size, Trained, Weapon | — |
| E0-P-735 | L22 p.50 | Plague Rat | Bestial, Big, Bite, Brute, Corruption, Die Hard, Disease, Frenzy, Hungry, Infected, Infestation, Night Vision, Size, Skittish, Stealthy, Stride | — |
| E0-P-736 | L22 p.51 | Brood Horror | Bite, Corrosive Blood, Disease, Hungry, Infected, Regeneration, Size, Tail, Trained, Weapon | — |
| E0-P-737 | L22 p.52 | Rat Ogre Bonebreaker | Armour, Fear, Night Vision, Painless, Size, Stupid, Trained, Weapon | — |
| E0-P-738 | L22 p.54 | Dricht Skuttlespite Clan Eshin Gutter Runner | Armour, Night Vision, Ranged, Stealthy, Tail, Weapon | — |
| E0-P-739 | L22 p.62 | Yellow Fang Junior Cultist | Armour, Ranged, Weapon | — |
| E0-P-740 | L22 p.63 | Mila Raast-- Yellow Fang Senior Cultist | Weapon | — |
| E0-P-741 | L22 p.71 | Ingrid Sasslewort | Hardy, Weapon | — |
| E0-P-742 | L22 p.73 | Great Eagle | Clever, Fearless, Size, Territorial | — |
| E0-P-743 | L22 p.73 | Mountain Cat | Arboreal, Bestial, Bite, Night Vision, Size, Skittish, Stealthy, Stride, Territorial, Tracker | — |
| E0-P-744 | L22 p.73 | Cliff Spider | Armour, Bestial, Bite, Night Vision, Size, Skittish, Stride, Venom, Wallcrawler | — |
| E0-P-745 | L22 p.77 | Blightking | Armour, Belligerent, Champion, Corruption, Disease, Shield, Weapon | — |
| E0-P-746 | L22 p.78 | Behram Gundarson — Slayer (Brass 5) | Animosity, Hatred, Night Vision, Prejudice, Tough, Weapon | — |
| E0-P-747 | L22 p.79 | Gimbrin Flintbeard — Dwarf King'S Ghost | Dark Vision, Ethereal, Fear, Hatred, Prejudice, Territorial, Undead, Unstable, Weapon | — |
| E0-P-748 | L22 p.93 | Alphonse Hercules de Gasgoigne — Detective, Former Thief (Silver 3) | Armour, Size, Weapon | — |
| E0-P-749 | L22 p.94 | Claudia Carbonetti — Gang Boss (Silver 3) | Armour, Ranged, Weapon | — |
| E0-P-750 | L22 p.94 | Former Interrogator | Armour, Ranged, Weapon | — |
| E0-P-751 | L22 p.95 | Giuseppe the Dog — Tilean Manhound | Armour, Bestial, Bite, Frenzy, Night Vision, Stride | — |
| E0-P-752 | L22 p.95 | Thugs | Armour, Weapon | — |
| E0-P-753 | L22 p.103 | Martina Kurtz — Mine Foreman (Silver 5) | Armour, Weapon | — |
| E0-P-754 | L22 p.103 | Wilhelm Koch — Prospector (Brass 2) | Armour, Weapon | — |
| E0-P-755 | L22 p.119 | Wizard | Clever, Prejudice, Stealthy | — |
| E0-P-756 | L22 p.120 | Abyssal Terror | Armour, Bite, Fear, Fly, Size, Trained, Undead, Weapon | — |
| E0-P-757 | L22 p.120 | Carrion | Fear, Fly, Night Vision, Size, Trained, Undead | — |
| E0-P-758 | L22 p.120 | Flying Death Skulls | Bite, Construct, Fear, Fly, Infected, Night Vision, Size, Undead, Unstable | — |
| E0-P-759 | L23 p.22 | Or Mule | Skittish, Stride, Trained, Weapon | — |
| E0-P-760 | L23 p.22 | Dog | Skittish, Stride, Trained, Weapon | — |
| E0-P-761 | L23 p.23 | Draught Horse | Size, Skittish, Stride, Trained, Weapon | — |
| E0-P-762 | L23 p.23 | Ox | Bestial, Size, Skittish, Stride, Trained, Weapon | — |
| E0-P-763 | L23 p.23 | Heavy Draught Horse | Brute, Size, Skittish, Stride, Trained, Weapon | — |
| E0-P-764 | L23 p.23 | Riding Horse | Size, Skittish, Stride, Trained, Weapon | — |
| E0-P-765 | L23 p.24 | Light Warhorse | Champion, Clever, Elite, Hardy, Rear, Size, Skittish, Stride, Tough, Trained, Weapon | — |
| E0-P-766 | L23 p.24 | Heavy Warhorse | Champion, Clever, Elite, Hardy, Rear, Size, Skittish, Stride, Tough, Trained, Weapon | — |
| E0-P-767 | L23 p.40 | Johann Hindersson — Human Toll Keeper (Brass 5) | Armour, Ranged, Weapon | — |
| E0-P-768 | L23 p.41 | Aleanora `Al' Shortbottom — Halfling Toll Keeper (Brass 5) | Armour | — |
| E0-P-769 | L23 p.42 | Charlotte-Samantha Maiers — Human Road Sergeant (Silver 4) | Armour, Ranged, Weapon | — |
| E0-P-770 | L23 p.42 | Heinrich Steele — Human Road Captain (Gold 1) | Armour, Ranged, Weapon | — |
| E0-P-771 | L23 p.44 | Anke Dorflinger — Human Bounty Hunter (Silver 3) | Armour, Ranged, Weapon | — |
| E0-P-772 | L23 p.46 | Pandora Lostpocket — Halfling Entertainer (Brass 5) | Ranged, Weapon | — |
| E0-P-773 | L23 p.47 | Wolmar Rotte — Human Charlatan (Brass 5) | Corruption, Mutation, Weapon | — |
| E0-P-774 | L23 p.48 | Maria Braund — Human Outlaw (Brass 2) | Armour, Ranged, Weapon | — |
| E0-P-775 | L23 p.50 | Eberhart von Durbheim — Human Noble (Gold 3) | Weapon | — |
| E0-P-776 | L23 p.51 | Rembrandt Haube — Human Outlaw (Brass 2) | Armour, Ranged, Weapon | — |
| E0-P-777 | L23 p.52 | Delberz Tr—tte — Human Pedlar (Brass 4) | Prejudice, Weapon | — |
| E0-P-778 | L23 p.53 | Wilhelm Kind — Human Brigand (Brass 1) | Armour, Weapon | — |
| E0-P-779 | L23 p.54 | Brokur Zindrisson — Dwarf Artisan (Silver 1) | Armour, Weapon | — |
| E0-P-780 | L23 p.55 | Pompai Ricolma — Human Bawd (Brass 3) | Weapon | — |
| E0-P-781 | L23 p.56 | Sonny Rags — Human Beggar (Brass 2) | Weapon | — |
| E0-P-782 | L23 p.57 | Heinrich Marken — Human Charlatan (Brass 5) | Prejudice, Weapon | — |
| E0-P-783 | L23 p.58 | Albert Pf—rtner — Human Stevedore (Silver 1) | Armour, Hatred, Weapon | — |
| E0-P-784 | L23 p.59 | Alette Zimmermann — Human Thief (Brass 3) | Animosity, Weapon | — |
| E0-P-785 | L23 p.60 | Keiti Ouala — Human Merchant (Silver 5) | Weapon | — |
| E0-P-786 | L23 p.62 | Konrad Brecht — Human Racketeer (Brass 5) | Armour, Hungry, Weapon | — |
| E0-P-787 | L23 p.63 | Reynald Verstand — Human Attendant (Silver 5) | Afraid, Animosity, Weapon | — |
| E0-P-788 | L23 p.84 | Chaos Fury | Afraid, Bite, Brute, Clever, Corruption, Daemonic, Fast, Fear, Fly, Horns, Mutation, Size, Skittish, Unstable, Weapon | — |
| E0-P-789 | L23 p.85 | Pink Horror | Corruption, Daemonic, Distracting, Fear, Mutation, Size, Spellcaster, Split, Unstable, Weapon | E0-T-269, E0-T-270 |
| E0-P-790 | L23 p.85 | Blue Horror | Corruption, Daemonic, Distracting, Fear, Mutation, Spellcaster, Unstable, Weapon | E0-T-270 |
| E0-P-791 | L23 p.86 | Emmaretta — Hunter (Brass 4) | Night Vision, Prejudice, Ranged, Shapeshifter, Weapon | E0-T-271 |
| E0-P-792 | L23 p.87 | Great Cats | — | — |
| E0-P-793 | L23 p.88 | Johann the Ghost | — | — |
| E0-P-794 | L23 p.92 | Kasper Lauengram — Human Brigand (Brass 1) | Prejudice, Ranged, Weapon | — |
| E0-P-795 | L23 p.93 | Wolfgang Kellerman — Human Outlaw Chief (Brass 4) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-796 | L23 p.93 | Bruno — Human Brigand (Silver 2) | Armour, Prejudice, Weapon | — |
| E0-P-797 | L23 p.95 | Amadeus von Drakensberg — Human Magnate (Gold 5) | Weapon | — |
| E0-P-798 | L23 p.96 | Bodyguards Aplenty — Human Sentries (Silver 1) | Armour, Weapon | — |
| E0-P-799 | L23 p.98 | Sleeves — Halfling Menial (Silver 1) | Size, Weapon | — |
| E0-P-800 | L23 p.99 | Black Arrows — Outlaws (Brass 2) | Armour, Ranged, Weapon | — |
| E0-P-801 | L23 p.99 | Carnivorous Snapper | Armour, Bite, Cold-blooded, Hardy, Hungry, Tail, Weapon | — |
| E0-P-802 | L23 p.100 | Annalisa Kessler — Outlaw Chief (Brass 4) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-803 | L23 p.104 | Urzo | Armour, Frenzy, Horns, Size, Weapon | — |
| E0-P-804 | L23 p.105 | Khornate Beastmen | Afraid, Armour, Bite, Frenzy, Fury, Horns, Night Vision, Weapon | — |
| E0-P-805 | L23 p.105 | Rassark - Uncommonly Rat-Like — Beastman | Infected | — |
| E0-P-806 | L23 p.105 | The Twins | Bite, Frenzy, Fury, Hardy, Night Vision, Size, Weapon | — |
| E0-P-807 | L23 p.106 | The Farmyard Beasts | — | — |
| E0-P-808 | L23 p.106 | The Imperial Beast | Bite, Fury, Night Vision, Size, Weapon | — |
| E0-P-809 | L23 p.109 | Wolfgang Hollseher — Wizard (Gold 2) | Weapon | — |
| E0-P-810 | L23 p.110 | Magnus Bugman — Loremaster (Gold 2) | Animosity, Hatred, Magic Resistance, Night Vision, Weapon | — |
| E0-P-811 | L23 p.110 | Benbow — Coachman (Silver 2) | Armour, Ranged, Weapon | — |
| E0-P-812 | L23 p.111 | Granny' Haller — Con Artist (Silver 2) | Weapon | — |
| E0-P-813 | L23 p.112 | Big Anders, Little Anders, Bertoldo, Ivan, Magda, and Mikhail — Coachmen (Silver 1) | Ranged, Weapon | — |
| E0-P-814 | L24 p.17 | Maria-Ulrike von Liebwitz — Noble Lord (Gold 7) | Prejudice, Weapon | — |
| E0-P-815 | L24 p.17 | Bruno Franke — Judicial Champion (Gold 3) | Armour, Weapon | — |
| E0-P-816 | L24 p.17 | Gustaf Rechtshandler — Barrister (Gold 1) | Prejudice, Weapon | — |
| E0-P-817 | L24 p.18 | Bodyguards and Men-at-Arms (Silver 3) | Armour, Prejudice, Tough, Weapon | — |
| E0-P-818 | L24 p.18 | Dominique Herveaux — Assassin (Gold 1) | Weapon | — |
| E0-P-819 | L24 p.18 | Handmaids and Servants (Silver 3) | Weapon | — |
| E0-P-820 | L24 p.18 | Gunni, Bart, and Hans-Frederick — Smugglers (Brass 3) | Weapon | — |
| E0-P-821 | L24 p.19 | Ursula Kopfgeld — Master Bounty Hunter (Silver 5) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-822 | L24 p.19 | Josef Aufwiegler — Rabble Rouser (Brass 3) | — | — |
| E0-P-823 | L24 p.20 | Warhammer Fantasy Rolepl Ay Friedrich von Pfeifraucher — Magnate (Gold 5) | Weapon | — |
| E0-P-824 | L24 p.20 | Hanna Lastkahn — Townswoman (Silver 2) | Weapon | — |
| E0-P-825 | L24 p.20 | Mho, Larz, and `Curls' — Thugs (Brass 3) | Armour, Prejudice, Weapon | — |
| E0-P-826 | L24 p.20 | Thomas Prahmhandler — Master Merchant (Gold 1) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-827 | L24 p.21 | Allrella, Elphoise, and Helga — Slaanesh Cultists (Silver 1) | — | — |
| E0-P-828 | L24 p.21 | Coachmen (Silver 2) | Prejudice, Ranged, Weapon | — |
| E0-P-829 | L24 p.21 | Glimbrin Oddsocks — Master Thief (Brass 5) | Hatred, Prejudice, Weapon | — |
| E0-P-830 | L24 p.21 | Boatmen (Silver 2) | Armour, Prejudice, Weapon | — |
| E0-P-831 | L24 p.22 | Hans Orf — Townsman (Silver 2) | Prejudice, Weapon | — |
| E0-P-832 | L24 p.22 | Mercinellin `Seedling' Thorncobble Xiii — Hustler (Brass 1) | Weapon | — |
| E0-P-833 | L24 p.22 | Servants, Cleaners, and Similar — Menials (Brass 3) | Weapon | — |
| E0-P-834 | L24 p.22 | Ol' Bess — Artisan (Silver 1) | Prejudice, Weapon | — |
| E0-P-835 | L24 p.33 | A Day at the Trials Eberhardt von Dammenblatz — Noble Lord (Gold 7) | Prejudice, Weapon | — |
| E0-P-836 | L24 p.33 | Imperial Viper | Armour, Bestial, Cold-blooded, Size, Venom, Weapon | — |
| E0-P-837 | L24 p.33 | Kappan'S Racketeers — Thugs (Brass 3) | Armour, Tough, Weapon | — |
| E0-P-838 | L24 p.34 | Restless Ghost | Dark Vision, Ethereal, Fear, Fury, Hatred, Undead, Unstable, Weapon | — |
| E0-P-839 | L24 p.34 | Matthias Hubkind — Witch Hunter (Silver 3) | Armour, Hatred, Prejudice, Ranged, Weapon | — |
| E0-P-840 | L24 p.35 | Watchmen — Khorne Cultists (Silver 1) | Armour, Elite, Frenzy, Fury, Hardy, Weapon | — |
| E0-P-841 | L24 p.35 | Magistrates — Judges (Gold 2) | Prejudice, Weapon | — |
| E0-P-842 | L24 p.35 | Petra Steinmetz — High Priestess (Gold 1) | Blessed, Miracles, Weapon | — |
| E0-P-843 | L24 p.35 | Bloodletters | Armour, Champion, Corruption, Daemonic, Fear, Frenzy, Horns, Painless, Unstable, Weapon | — |
| E0-P-844 | L24 p.48 | Warhammer Fantasy Rolepl Ay Emmanuelle von Liebwitz — Elector Countess (Gold 15) | — | — |
| E0-P-845 | L24 p.48 | Brecht Kavenner — Slaanesh Cultist and Barrister (Gold 3) | Clever, Corruption, Cunning, Hardy, Hatred, Leader, Magic Resistance, Mutation | — |
| E0-P-846 | L24 p.48 | Noble Servants (Gold 2) | Cunning, Weapon | — |
| E0-P-847 | L24 p.49 | A Night at the Opera Palace Guards (Gold 2) | Armour, Elite, Hardy, Tough, Weapon | — |
| E0-P-848 | L24 p.49 | Performers (Silver 1) | Weapon | — |
| E0-P-849 | L24 p.49 | Stagehands (Silver 1) | Weapon | — |
| E0-P-850 | L24 p.49 | Servants (Silver 1) | Weapon | — |
| E0-P-851 | L24 p.49 | Musicians (Silver 1) | Weapon | — |
| E0-P-852 | L24 p.49 | Brocks and Reiner — Spies (Silver 3) | Ranged, Weapon | — |
| E0-P-853 | L24 p.50 | Erwin Pakker — Professor (Gold 1) | Prejudice, Weapon | — |
| E0-P-854 | L24 p.50 | Edvard Lowenhertz — Wyrd (Brass 3) | Armour, Clever, Corruption, Cunning, Fast, Fury, Hatred, Spellcaster, Weapon | — |
| E0-P-855 | L24 p.50 | Cannon and Mortar Students — Student Engineers (Brass 4) | Ranged, Weapon | — |
| E0-P-856 | L24 p.50 | Edwina Lowenhertz — Witch (Brass 2) | Clever, Cunning, Fast, Hatred, Spellcaster, Weapon | — |
| E0-P-857 | L24 p.51 | Assassins (Silver 1) | Armour, Cunning, Fast, Hardy, Hatred, Prejudice, Weapon | — |
| E0-P-858 | L24 p.51 | Detlef Sierck — Genius (Gold 3) | — | — |
| E0-P-859 | L24 p.52 | Nurgle Cultists S Sorcerer (Silver 3) | Corruption, Hardy, Infected, Weapon | — |
| E0-P-860 | L24 p.52 | Martyn Ruchen — Chaos Cult Leader and Chaos Sorcerer (Silver 3) | Corruption, Cunning, Disease, Hardy, Hatred, Infected, Magic Resistance, Mutation | — |
| E0-P-861 | L24 p.53 | Hubkind'S Mob (Brass 4) | Armour, Fury, Hardy, Prejudice, Weapon | — |
| E0-P-862 | L24 p.53 | Watch Sergeant (Silver 1) | — | — |
| E0-P-863 | L24 p.53 | Operagoer (Silver 3) | Weapon | — |
| E0-P-864 | L24 p.53 | Nulner Watchmen (Silver 1) | Armour, Hardy, Prejudice, Weapon | — |
| E0-P-865 | L24 p.53 | Young Noble (Gold 1) | Prejudice, Weapon | — |
| E0-P-866 | L24 p.64 | Wilhelm von Saponatheim — Noble Lord (Gold 7) | Prejudice, Weapon | — |
| E0-P-867 | L24 p.65 | Inta-Dapesht | Chill Grasp, Dark Vision, Ethereal, Frenzy, Hardy, Magical, Painless, Terror, Unstable | E0-T-286 |
| E0-P-868 | L24 p.65 | Nastassia von Saponatheim — Scion (Gold 1) | Weapon | — |
| E0-P-869 | L24 p.65 | Joachim Bitterfeld — Artisan (Silver 1) | Weapon | — |
| E0-P-870 | L24 p.66 | Cultists of the Jade Sceptre (Gold 2) | Corruption, Spellcaster | — |
| E0-P-871 | L24 p.66 | Manfred von Saponatheim — Prisoner (Brass 0) | Afraid, Animosity, Brute, Frenzy, Hardy, Hatred, Immune to Psychology, Stupid | — |
| E0-P-872 | L24 p.67 | Taggees — Spies (Gold 2) | Bounce, Champion, Cunning, Distracting, Elite, Fast, Tough, Weapon | — |
| E0-P-873 | L24 p.67 | Clothilde Telland — Noble (Gold 4) | Weapon | — |
| E0-P-874 | L24 p.67 | Josef von Angendorf — Cat Burglar (Gold 2) | Clever, Cunning, Elite, Fast, Leader, Weapon | — |
| E0-P-875 | L24 p.80 | Erich von Holzenauer — Noble (Gold 2) | Prejudice, Weapon | — |
| E0-P-876 | L24 p.80 | Siegfried von Saponatheim — Noble (Gold 2) | Prejudice, Weapon | — |
| E0-P-877 | L24 p.81 | Rickard Aschaffenberg — Magnate (Gold 3) | Hardy, Weapon | — |
| E0-P-878 | L24 p.81 | Heinrich von Bruner — Magnate (Gold 3) | Corruption, Prejudice, Weapon | — |
| E0-P-879 | L24 p.81 | Maximilian Aschaffenburg — Scion (Gold 1) | Animosity, Weapon | — |
| E0-P-880 | L24 p.81 | Galina Hohengolfrid — Noble (Gold 2) | Weapon | — |
| E0-P-881 | L24 p.82 | Jean-Luc de Cadent — Agent (Gold 1) | Armour, Prejudice, Weapon | — |
| E0-P-882 | L24 p.82 | Heinrich von Falkenhayn — Noble (Gold 2) | Weapon | — |
| E0-P-883 | L24 p.82 | Florian Pfeifraucher — Noble (Gold 2) | Weapon | — |
| E0-P-884 | L24 p.83 | Otto Krupp — Guildmaster (Gold 1) | Armour, Weapon | — |
| E0-P-885 | L24 p.83 | Borgan Foambeard — Guildmaster (Gold 1) | Animosity, Armour, Weapon | — |
| E0-P-886 | L24 p.83 | Ernst Maler — Burgomeister (Gold 1) | Weapon | — |
| E0-P-887 | L24 p.84 | Lorith Silverleaf — Envoy (Silver 4) | Prejudice, Weapon | — |
| E0-P-888 | L24 p.84 | Gunther Emming — High Priest (Gold 1) | Prejudice, Weapon | — |
| E0-P-889 | L24 p.84 | Heinrich Gutenberg — High Priest (Gold 1) | Prejudice, Weapon | — |
| E0-P-890 | L24 p.84 | Celestine Hoch — Priestess (Silver 1) | Prejudice, Weapon | — |
| E0-P-891 | L24 p.85 | Erwin Blucher — Officer (Gold 1) | Weapon | — |
| E0-P-892 | L24 p.85 | Jendrik von Dabernick — Officer (Gold 1) | Armour, Weapon | — |
| E0-P-893 | L24 p.85 | Andrea Pfeffer — Watch Captain (Gold 1) | Hardy, Weapon | — |
| E0-P-894 | L24 p.85 | Skaven Gutter Runner | Armour, Bite, Champion, Disease, Infected, Night Vision, Ranged, Stealthy, Tail, Tracker, Weapon | — |
| E0-P-895 | L25 p.22 | Ludolf K—hler Imperial Sea Lord (Gold 3) | Armour, Ranged, Weapon | — |
| E0-P-896 | L25 p.39 | Throgg Troll King | Armour, Bite, Brute, Clever, Die Hard, Regeneration, Size, Terror, Vomit, Weapon | — |
| E0-P-897 | L25 p.47 | Kraka Ravnsvake Vi Skaldor `Reaver' Lotharksson — Dwarf Runes Ship'S Master (Gold 2) | Armour, Ranged, Weapon | — |
| E0-P-898 | L25 p.55 | The Skaeling Coast Vii Olg Bl——salt Skaeling Captain (Gold 2) | Armour, Mark of Khorne, Mutation, Weapon | E0-T-267 |
| E0-P-899 | L25 p.127 | Landsman — Silver | Weapon | — |
| E0-P-900 | L25 p.127 | Officer — Silver | Weapon | — |
| E0-P-901 | L25 p.127 | Sailor — Silver | Armour, Weapon | — |
| E0-P-902 | L25 p.127 | Silver | Armour, Weapon | — |
| E0-P-903 | L25 p.127 | Seasoned Mercenary — Silver | Armour, Ranged, Weapon | — |
| E0-P-904 | L25 p.127 | Silver | Weapon | — |
| E0-P-905 | L25 p.140 | Lurkerfish | Amphibious, Bestial, Dark Vision, Distracting, Grim, Hungry, Size, Swarm, Weapon | — |
| E0-P-906 | L25 p.141 | Gymmcrabs | Amphibious, Armour, Bestial, Dark Vision, Size, Swarm, Weapon | — |
| E0-P-907 | L25 p.141 | Daggerfish | Bestial, Bounce, Hungry, Marine Creature, Ranged, Size, Swarm, Weapon | E0-T-272 |
| E0-P-908 | L25 p.141 | Latch Eel | Bestial, Bite, Cold-blooded, Dark Vision, Hungry, Marine Creature, Size, Swarm, Weapon | E0-T-272 |
| E0-P-909 | L25 p.142 | Sea Elemental | Construct, Grim, Marine Creature, Night Vision, Rear, Size, Spellcaster, Terror, Unstable, Ward, Weapon | E0-T-272 |
| E0-P-910 | L25 p.143 | Gargantuan | Armour, Cold-blooded, Constrictor, Dark Vision, Grim, Hungry, Marine Creature, Rear, Regeneration, Size, Weapon | E0-T-272 |
| E0-P-911 | L25 p.144 | Kharibdyss | Amphibious, Armour, Belligerent, Bestial, Bite, Constrictor, Dark Vision, Distracting, Grim, Hungry, Regeneration, Size, Stealthy, Tail, Territorial, Venom, Weapon | — |
| E0-P-912 | L25 p.145 | Syreen | Amphibious, Dark Vision, Ethereal, Fury, Terror, Undead, Unstable, Weapon | — |
| E0-P-913 | L25 p.145 | Merwyrm | Amphibious, Armour, Bite, Dark Vision, Grim, Hungry, Immune to Psychology, Infected, Marine Creature, Painless, Regeneration, Size, Tail, Weapon | E0-T-272 |
| E0-P-914 | L25 p.146 | Bone Hydra | Armour, Bite, Breath, Construct, Corruption, Dark Vision, Fear, Grim, Marine Creature, Painless, Size, Undead, Unstable, Weapon | E0-T-272 |
| E0-P-915 | L25 p.146 | Leech Wyrm | Armour, Bestial, Bite, Cold-blooded, Construct, Corruption, Dark Vision, Grim, Marine Creature, Painless, Size, Tail, Vomit, Weapon | E0-T-272 |
| E0-P-916 | L25 p.147 | Black Leviathan | Armour, Bestial, Dark Vision, Grim, Hungry, Marine Creature, Size, Tail, Weapon | E0-T-272 |
| E0-P-917 | L25 p.147 | Orb Leviathan | Armour, Bestial, Dark Vision, Distracting, Grim, Hungry, Marine Creature, Size, Weapon | E0-T-272 |
| E0-P-918 | L25 p.149 | Triton | Animosity, Armour, Blessed, Champion, Grim, Hardy, Magical, Marine Creature, Rear, Size, Tail | E0-T-272, E0-T-283, E0-T-284, E0-T-285 |
| E0-P-919 | L25 p.151 | Jaego Roth Privateer Captain | Armour, Hatred, Ranged | — |
| E0-P-920 | L25 p.152 | Long Drong Slayer Captain of the Slayer Pirates | Ranged, Weapon | — |
| E0-P-921 | L25 p.155 | Wulfrik Sarl Champion | Armour, Champion, Corruption, Weapon | — |
| E0-P-922 | L25 p.156 | Vrisk Ironscratch Arch-Sealord of Clan Skurvy | Armour, Infected, Night Vision, Ranged, Weapon | — |
| E0-P-923 | L26 p.18 | Count Otto Boormann — Human Noble, Former Diplomat (Gold 3) | Prejudice, Weapon | — |
| E0-P-924 | L26 p.20 | Bernhardt Dampfer — Human Bargeswain (Silver 3) | Armour, Ranged, Weapon | — |
| E0-P-925 | L26 p.21 | Reiner and Karl Dampfer and Hans Vollrat — Human Boat-Hands (Silver 1) | Armour, Ranged, Weapon | — |
| E0-P-926 | L26 p.21 | Vampire Noble | Bite, Champion, Night Vision, Undead, Vampiric, Wallcrawler | — |
| E0-P-927 | L26 p.35 | Gertrud Sch—tzenberger — Human River Recruit (Silver 1) | Armour, Weapon | — |
| E0-P-928 | L26 p.36 | August Hauser — Human Riverwarden (Silver 2) | Armour, Ranged, Weapon | — |
| E0-P-929 | L26 p.36 | Adalia Eisen — Human Shipsword (Silver 4) | Ranged, Weapon | — |
| E0-P-930 | L26 p.37 | Wet' Wilgryn Augenlos — Human Shipsword Master (Gold 1) | Armour, Ranged, Weapon | — |
| E0-P-931 | L26 p.38 | Grugor Lustig — Human Charlatan (Brass 3) | Weapon | — |
| E0-P-932 | L26 p.40 | Hans and Hannes — Human Grave Robbers (Brass 2) | Armour, Weapon | — |
| E0-P-933 | L26 p.41 | Klaus Jager — Human Hunter (Brass 2) | Ranged, Weapon | — |
| E0-P-934 | L26 p.42 | Baron Sigismund von der Bahr — Human Noble (Gold 3) | Weapon | — |
| E0-P-935 | L26 p.43 | Roland `the Horse' Bruckesel — Human Guard (Silver 2) | Armour, Weapon | — |
| E0-P-936 | L26 p.44 | Edgar `the Pike' Ebrecht — Human Pit Fighter (Brass 4) | Weapon | — |
| E0-P-937 | L26 p.45 | Hilma Bootschlecht — Human Stevedore (Brass 3) | Weapon | — |
| E0-P-938 | L26 p.46 | Sigfrida Junker — Adventurous Human Noble, Aspiring Duellist (Gold 1) | Ranged, Weapon | — |
| E0-P-939 | L26 p.47 | Avaloi Winesong — High Elf Artisan (Silver 1) | Prejudice, Weapon | — |
| E0-P-940 | L26 p.48 | Eusapia Balaca—on — Human Master Wizard (Gold 1) | Animosity, Weapon | — |
| E0-P-941 | L26 p.49 | Johanna Schnee — Human Physician (Silver 3) | Afraid, Weapon | — |
| E0-P-942 | L26 p.51 | Elias Answell — Human Trader and Bargeswain (Silver 2) | Armour, Weapon | — |
| E0-P-943 | L26 p.51 | Mia Answell — Human Boat-Hand (Silver 1) | Weapon | — |
| E0-P-944 | L26 p.52 | Sofia Fischer — Human Greenfish (Brass 2) | — | — |
| E0-P-945 | L26 p.53 | Uwe Wasserhund — Human Scion (Gold 1) | Weapon | — |
| E0-P-946 | L26 p.54 | Altgr—fin Emelia Luneburg — Human Magnate (Gold 5) | Ranged | — |
| E0-P-947 | L26 p.55 | Simone L'Escalier — Human Busker (Brass 3) | — | — |
| E0-P-948 | L26 p.56 | Sigrund Dopplewasser — Human Swindler (Brass 3) | — | — |
| E0-P-949 | L26 p.57 | Sven Stoutbeard — Dwarf Dwarven Engineer (Silver 2) | Ranged | — |
| E0-P-950 | L26 p.58 | Bella Hornwhistler — Halfling Student (Silver 1) | Weapon | — |
| E0-P-951 | L26 p.59 | Agrin `the Blood of the Flagellant Is Sigmar'S Own' Losburg — Human Zealot (Brass 0) | Weapon | — |
| E0-P-952 | L26 p.60 | Krazold Ironhand — Dwarf Riverguide (Brass 4) | Weapon | — |
| E0-P-953 | L26 p.80 | Typical Human Wrecker | Prejudice, Weapon | — |
| E0-P-954 | L26 p.81 | Dederick Ritter — Human Wrecker Captain | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-955 | L26 p.82 | Boris Landsmaan Typical — Human Pirate (Boat-Hand) | Prejudice, Weapon | — |
| E0-P-956 | L26 p.83 | Reginhard Vieth — Human Pirate Captain (Shipsword Master, Gold 1) | Mutation, Ranged, Weapon | — |
| E0-P-957 | L26 p.84 | Sophie van Haagen — Human Merchant (Silver 5) | Weapon | — |
| E0-P-958 | L26 p.85 | Amoebae | Amphibious, Bestial, Corrosive Blood, Creeping, Dark Vision, Die Hard, Engulf, Hungry, Immune to Psychology, Painless, Regeneration, Size, Swamp-strider, Wallcrawler | E0-T-278 |
| E0-P-959 | L26 p.86 | Reik Eels | Aquatic, Bestial, Bite, Cold-blooded, Constrictor, Hungry, Night Vision, Size, Swamp-strider, Weapon | — |
| E0-P-960 | L26 p.86 | Giant Leeches | Afraid, Analgesic Saliva, Anticoagulant Saliva, Aquatic, Attach and Feed, Bestial, Bite, Creeping, Die Hard, Distracting, Hallucinogen, Hungry, Immune to Psychology, Size, Stealthy, Weapon | E0-T-274, E0-T-275, E0-T-277, E0-T-278, E0-T-280 |
| E0-P-961 | L26 p.88 | Naiads | Amphibious, Capricious, Chill Grasp, Cunning, Magical, Naiad War-Form, Night Vision, Weapon | E0-T-281, E0-T-282 |
| E0-P-962 | L26 p.88 | Stirpikes | Animosity, Aquatic, Belligerent, Bestial, Bite, Cold-blooded, Frenzy, Hardy, Hatred, Hungry, Immune to Psychology, Night Vision, Size, Stride, Tough | — |
| E0-P-963 | L26 p.89 | River Trolls | Amphibious, Armour, Belligerent, Bestial, Big, Bite, Brute, Die Hard, Distracting, Frenzy, Hardy, Hungry, Infected, Infestation, Magic Resistance, Mutation, Night Vision, Painless, Regeneration, Size, Stupid, Swamp-strider, Territorial, Tough, Vomit, Weapon | — |
| E0-P-964 | L26 p.104 | Captain Regina Willendorf — Human Barge Master, Former Huffer and Attendant (Gold 1) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-965 | L26 p.105 | Second Pilot Reiner Petersen — Human Pilot, Former Boatman (Silver 3) | Prejudice, Weapon | — |
| E0-P-966 | L26 p.105 | First Pilot Ella Greendale — Halfling Master Pilot, Former Boatman (Silver 5) | Night Vision, Size, Weapon | — |
| E0-P-967 | L26 p.106 | Human Boatman (Silver 2) | Prejudice, Weapon | — |
| E0-P-968 | L26 p.106 | Bosun Hans Sauber — Human Bargeswain, Former Sergeant (Silver 3) | Armour, Prejudice, Ranged, Weapon | — |
| E0-P-969 | L26 p.106 | Human Boat-Hand (Silver 1) | Prejudice, Weapon | — |
| E0-P-970 | L26 p.107 | Human Apprentice Artisan, Former Servant (Brass 2) | Night Vision, Weapon | — |
| E0-P-971 | L26 p.107 | Human Servant (Silver 3) | Prejudice, Weapon | — |
| E0-P-972 | L26 p.107 | Chief Cook Maximillian `Max' Berryhill — Halfling Master Artisan (Silver 3) | Night Vision, Size, Weapon | — |
| E0-P-973 | L26 p.108 | Purser Eberhardt Kleingeld — Human Attendant, Former Boat-Hand (Silver 5) | Prejudice, Weapon | — |
| E0-P-974 | L26 p.108 | Self Made, Obnoxious Trader — Human Merchant (Silver 5) | Prejudice, Weapon | — |
| E0-P-975 | L26 p.109 | Quick-Witted Dealmaker — Human Merchant (Silver 5) | Prejudice, Weapon | — |
| E0-P-976 | L26 p.109 | Elderly Duchess — Human Magnate (Gold 5) | Prejudice, Weapon | — |
| E0-P-977 | L26 p.109 | Experienced Broker — Human Master Merchant (Gold 1) | — | — |
| E0-P-978 | L26 p.110 | Young Blood — Human Scion (Gold 1) | Weapon | — |
| E0-P-979 | L26 p.110 | Dwarf Gambler (Silver 2) | Weapon | — |
| E0-P-980 | L26 p.111 | Armchair General — Human Counsellor, Former Officer (Gold 1) | — | — |
| E0-P-981 | L26 p.111 | Frontier Commander — Human Cavalry Sergeant (Gold 1) | Armour, Prejudice, Weapon | — |
| E0-P-982 | L26 p.116 | Father Marcus — Human Professor, Former Abbot (Gold 1) | Prejudice, Weapon | — |
| E0-P-983 | L26 p.116 | Brother Martin and Brother Rolf — Human Monks (Nuns) (Brass 4) | Prejudice, Weapon | — |
| E0-P-984 | L26 p.118 | Profil sans titre (L26 p. 118) | Fast, Fear, Fly, Hungry, Immune to Psychology, Night Vision, Painless, Size, Territorial, Unstable, Weapon | — |
