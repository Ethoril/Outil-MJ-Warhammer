# Audit des sorts — cadrage V5

> Mise à jour du 10 octobre 2026 : [finalisation Codex en 3.14.0](LOT3_FINALISATION_MAGIE.md), [recette 3.5](LOT3_RECETTE_3_5.md). Les ingrédients sont exclus. Les nombres 123 / 132 / 22 décrivent le traitement principal des 277 contrats ; ils ne certifient pas chaque clause comme entièrement automatique. Les constats de départ et revues antérieures restent historiques.

Date : 9 octobre 2026.

Les 277 descriptions actives ont été lues intégralement. Les trois intitulés supprimés de la source et sans dépendance de fiche ont été retirés du catalogue local ; aucun contrat historique ni alias n’est prévu. Le tri porte sur les effets, tous les sorts restent soumis à la résolution commune de lancer.

Aucun contrat de sort n’est déclaré implémenté par cet audit. « Moteur proposé » signifie qu’un effet mesurable est identifié ; « Moteur avec choix du MJ » exige une sélection, un résultat, un profil ou une information de terrain ; « Rappel narratif » décrit l’effet après un lancement qui reste mécanique. Les conséquences durables dans les fiches sont signalées séparément.

| Traitement principal des effets | Sorts actifs |
|---|---:|
| Moteur proposé | 123 |
| Moteur avec choix du MJ | 132 |
| Rappel narratif | 22 |

116 correspondances directes au livre V5 ont été contrôlées. Les 30 sorts des trois familles elfiques ont aussi été confrontés à leur supplément. Les profils issus des autres suppléments restent des adaptations : les descriptions du catalogue sont relues, mais une valeur particulière n’est pas présentée comme réécrite en V5 sans source. Les notes de correction détaillées et empreintes sont dans [le fichier JSON](LOT3_AUDIT_SORTS.json).

## Aqshy - Rouge - Domaine du Feu — 24 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 2 | Purification | Moteur avec choix du MJ | États Enflammé de zone, entretien par Action et tests ; purification du lieu arbitrée par le MJ. | Purge p. 249 |
| 3 | Égide d’Aqshy | Moteur proposé | Immunité au feu naturel et aux États Enflammé ; Protection contre le feu magique. | Aqshy’s Aegis p. 248 |
| 4 | Corps de Feu | Moteur proposé | Dégâts réactifs aux prises et blessures, tests de Calme et Esquive ; équipement protégé. | Catalogue relu ; adaptation des règles générales V5 |
| 5 | Sang Bouillonnant | Moteur proposé | Test de Résistance, Aveuglé et dégâts périodiques ; explosion à la mort avec victimes sélectionnées. | Winds of Magic contrôlé, adaptation V5 requise |
| 6 | Tête Brûlante | Moteur avec choix du MJ | Trajectoire, projectiles, Esquive, Enflammé et Peur après perte de Blessures. | Catalogue relu ; adaptation des règles générales V5 |
| 7 | Flamme Captivante | Moteur avec choix du MJ | Sélection des spectateurs, Calme et Sonné ; suppression des seuls états liés au sort si attaqué. | Catalogue relu ; adaptation des règles générales V5 |
| 8 | Cautérisation | Moteur proposé | Soin, retrait Hémorragique et Test de Résistance ; prévention d’infection et cicatrice en rappel. | Cauterise p. 248 |
| 9 | Colérique | Moteur avec choix du MJ | Préjugé, Animosité ou Haine dirigés vers un individu ; résistance et durée selon option. | Catalogue relu ; adaptation des règles générales V5 |
| 10 | Couronne de Flamme | Moteur proposé | Peur, talent temporaire et bonus réservés à Aqshy ; achats supplémentaires choisis. | Crown of Flame p. 248 |
| 11 | Mur de Feu | Moteur avec choix du MJ | Franchissement d’un mur : projectile et Enflammé ; longueur et position renseignées par le MJ. | Firewall p. 248 |
| 12 | Tempête de Flammes | Moteur avec choix du MJ | Dimensions de colonne, dégâts, états et déplacement forcé ; entrée interdite selon immunité. | Catalogue relu ; adaptation des règles générales V5 |
| 13 | Cœurs Enflammés | Moteur proposé | Retrait des états Brisé/Exténué et entrée facultative en Frénésie, selon profil V5. | Flaming Hearts p. 248 |
| 14 | Épée Enflammée de Rhuin | Moteur proposé | Arme temporaire magique, dégâts et qualités ; Enflammé sur frappe ou maladresse du porteur. | Flaming Sword of Rhuin p. 248 |
| 15 | Forge de Tarnus | Moteur proposé | Bonus aux Tests de Métier (Forgeron) liés à une forge ; fabrication permanente dans les fiches. | Catalogue relu ; adaptation des règles générales V5 |
| 16 | Grands Feux d’U’Zhul | Moteur avec choix du MJ | Impact principal, autres victimes et dégâts de zone en fin de Round ; états et PA ignorés. | Great Fires of U’Zhul p. 248 |
| 17 | Ignition | Moteur avec choix du MJ | Enflammé et propagation ; répartition des états entre voisins choisie explicitement. | Catalogue relu ; adaptation des règles générales V5 |
| 18 | Flamme Inextinguible | Moteur avec choix du MJ | Feu inextinguible ou extinction, durées spéciales ; portée des exceptions à dissipation à conserver. | Catalogue relu ; adaptation des règles générales V5 |
| 19 | Flamme Attisée | Moteur proposé | Amplification des dégâts de feu et des états Enflammé ; matériau rendu inflammable en rappel. | Catalogue relu ; adaptation des règles générales V5 |
| 20 | Esprit du Foyer | Moteur avec choix du MJ | Dégâts au lanceur, invocation au profil défini, portée du lien et interruption de l’activité. | Catalogue relu ; adaptation des règles générales V5 |
| 21 | Tempête Magmatique | Moteur avec choix du MJ | Vortex principal et secondaires, trajectoires renseignées, dégâts et états par traversée. | Catalogue relu ; adaptation des règles générales V5 |
| 22 | Epées Sanguines | Moteur avec choix du MJ | Épées animées : profil, attaques et limite d’une épée par victime ; Vol à adapter au trait V5. | Winds of Magic contrôlé, adaptation V5 requise |
| 23 | Goût de Feu | Moteur avec choix du MJ | Création de liquides et Test de Résistance ; quantités et inventaire en suivi manuel. | Catalogue relu ; adaptation des règles générales V5 |
| 24 | Chaleur Desséchante | Moteur proposé | Exténué à la course/charge/fuite et amplification du feu ; retrait de vêtement déclaré. | Catalogue relu ; adaptation des règles générales V5 |
| 25 | Blizzard enflammé de Ygethmor | Moteur avec choix du MJ | Pulses, couvert, Test d’Athlétisme et À Terre ; embrasement du terrain au jet annoncé. | Winds of Magic contrôlé, adaptation V5 requise |

## Azyr - Bleu - Domaine des Cieux — 24 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 26 | Arc de T’Essla | Moteur proposé | Projectile électrique +10 et Aveuglé ; T’Essla du supplément distinct de l’Arc à rebonds V5. | Catalogue relu ; adaptation des règles générales V5 |
| 27 | Bouclier céruléen | Moteur proposé | PA conditionnels aux armes métalliques et dégâts au bras de l’attaquant en mêlée. | Cerulean Shield p. 249 |
| 28 | Ironie du Destin | Moteur avec choix du MJ | Réserve partagée de Chance, dépenses atomiques et redistribution du reliquat à l’expiration. | Fate’s Fickle Fingers p. 249 |
| 29 | Le Second Signe d’Amul | Moteur proposé | Points de Chance temporaires avec suivi de consommation et expiration du reliquat. | The Second Portent of Amul p. 250 |
| 30 | Le Troisième Signe d’Amul | Moteur avec choix du MJ + suivi fiche | Point de Destin temporaire ; dépense avec conséquence durable sur le participant. | The Third Portent of Amul p. 250 |
| 31 | Maudit | Moteur proposé | Dépense de Chance pour imposer une relance adverse ; nouveau résultat fourni et journalisé. | Starcrossed p. 249 |
| 32 | Orage de Thorsen | Moteur avec choix du MJ | Vortex, projectiles et projections : liste des victimes et trajectoire arbitrées. | Catalogue relu ; adaptation des règles générales V5 |
| 33 | Polir et Exalter | Moteur proposé | Bonus conditionnels de Savoir (Astronomie) ou Perception avec Seconde vue ; objet support sélectionné. | Catalogue relu ; adaptation des règles générales V5 |
| 34 | Projection Spirituelle | Moteur avec choix du MJ | Projection de l’esprit, corps inactif, interdictions et Corruption au retour tardif. | Catalogue relu ; adaptation des règles générales V5 |
| 35 | Arche de Saphir | Moteur avec choix du MJ | Cibles mises en attente dans l’arche, libération au prochain lancer ou à la mort du lanceur. | Catalogue relu ; adaptation des règles générales V5 |
| 36 | Comète de Cassandora | Moteur avec choix du MJ | Impact différé, test de guidage, déplacement et dégâts de zone avec états. | Comet of Casandora p. 249 |
| 37 | Le Premier Signe d’Amul | Moteur proposé | Chance temporaire et option de surpuissance ; aucune dépense après expiration. | The First Portent of Amul p. 249 |
| 38 | Lames Azurées | Moteur avec choix du MJ | Trois frappes réactives par Tour adverse, localisations tirées et exemption selon longueur d’arme. | Catalogue relu ; adaptation des règles générales V5 |
| 39 | Malédiction du Destin | Moteur avec choix du MJ + suivi fiche | Malus à tous les Tests ; option de Destin permanent ou prochain critique maximal transmise à la fiche. | Catalogue relu ; adaptation des règles générales V5 |
| 40 | Divination | Moteur avec choix du MJ | Deux options de divination en rappels MJ ; troisième option modifie de ±10 un jet futur désigné. | Catalogue relu ; adaptation des règles générales V5 |
| 41 | Ennemi Anticipé | Moteur proposé | Immunité à Surpris ; avertissement anticipé du danger en rappel MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 42 | Prémonition Fantastique | Moteur proposé | Relances magiques des alliés ou désavantage de jets des ennemis selon variante ; durée courte. | Catalogue relu ; adaptation des règles générales V5 |
| 43 | Destin Illuminé | Rappel narratif | Questions sur intentions et destin ; réponses secrètes du MJ, nombre selon surpuissance. | Catalogue relu ; adaptation des règles générales V5 |
| 44 | Lentille du Ciel | Moteur proposé | Bonus de Perception lointaine, ignorance de brouillard et prochain Test d’Orientation. | Catalogue relu ; adaptation des règles générales V5 |
| 45 | Que les Quatre Vents Soufflent ! | Moteur avec choix du MJ | Groupes repoussés et collisions, dégâts fixes et À Terre ; position fournie par le MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 46 | Mistral de la Stratosphère | Moteur avec choix du MJ | Dégâts initiaux, exposition au froid à chaque Round et récupération progressive des pertes temporaires. | Catalogue relu ; adaptation des règles générales V5 |
| 47 | Miroir Mystique | Rappel narratif | Communication à distance par surfaces réfléchissantes ; présence du support et identité vérifiées par le MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 48 | Éclat Stellaire | Moteur avec choix du MJ | Zone mobile de révélation et suppression d’obscurité ; perception et cibles révélées sous contrôle du MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 49 | Tempête de Shemtek | Moteur avec choix du MJ | Plusieurs projectiles, Sonné du lanceur et Peur des témoins ; variante alternative choisie avant lancement. | Catalogue relu ; adaptation des règles générales V5 |

## Chamon - Jaune - Domaine du Métal — 25 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 50 | Écaille d’acier | Moteur avec choix du MJ | Ancienne Protection croissante, possible alias de Robe scintillante ; ne pas activer deux profils incompatibles. | Catalogue relu ; adaptation des règles générales V5 |
| 51 | Plume de plomb | Moteur proposé | Modificateur temporaire de surcharge ; équipement source inchangé. | Feather of Lead p. 253 |
| 52 | Inscription | Moteur avec choix du MJ | Inscription en rappel ; mode acide : projectile et perte différée d’un PA si non lavé. | Catalogue relu ; adaptation des règles générales V5 |
| 53 | Métal restauré | Moteur avec choix du MJ + suivi fiche | Réparation/soudure d’objet, défauts d’armure choisis ; inventaire permanent géré par la fiche. | Catalogue relu ; adaptation des règles générales V5 |
| 54 | Transmutation de Chamon | Moteur avec choix du MJ | Dégâts ignorant BE/PA, états maintenus, PA temporaires et suffocation. | Transmutation of Chamon p. 253 |
| 55 | Armure d’étain | Moteur proposé | Réduction temporaire des PA métalliques par localisation ; aucun PA négatif. | Catalogue relu ; adaptation des règles générales V5 |
| 56 | Franchir l’inconnu | Moteur avec choix du MJ | Informations en rappel ; Détection des artefacts temporaire sur objet touché. | Catalogue relu ; adaptation des règles générales V5 |
| 57 | Creuset de Chamon | Moteur avec choix du MJ + suivi fiche | Destruction d’objet métallique et dégâts au porteur selon PA/BE V5 ; matière première conservée. | Crucible of Chamon p. 253 |
| 58 | Malédiction de rouille | Moteur avec choix du MJ + suivi fiche | Objet détruit ou fragilité temporaire ; portée et encombrement choisis, conséquence d’inventaire manuelle. | Catalogue relu ; adaptation des règles générales V5 |
| 59 | Arme enchantée | Moteur proposé | Arme magique : bonus de dégâts, Incassable et qualité/défaut choisi, restauration à expiration. | Enchant Weapon p. 253 |
| 60 | Défaut de Forme | Moteur proposé | Qualités neutralisées et défauts aggravés ; maladresse, rechargement, défense et enchantement conditionnels. | Catalogue relu ; adaptation des règles générales V5 |
| 61 | Or des fous | Moteur avec choix du MJ | Transformation réelle du métal, charge et efficacité dépendant de l’objet ; restitution à expiration. | Fool’s Gold p. 253 |
| 62 | Forge de Chamon | Moteur avec choix du MJ + suivi fiche | Qualités/défauts d’objet choisis ; avantages mesurables appliqués, modifications d’inventaire confirmées. | Forge of Chamon p. 253 |
| 63 | Globe doré de Gehenna | Moteur avec choix du MJ | Vortex appliquant Toucher doré ; immunités, déplacement et victimes renseignés. | Catalogue relu ; adaptation des règles générales V5 |
| 64 | Cage dorée | Moteur avec choix du MJ | Cage, sortie selon Taille, Force ou outils ; contraintes spatiales en rappel assisté. | Catalogue relu ; adaptation des règles générales V5 |
| 65 | Robe scintillante | Moteur proposé | Profil V5 de Robe scintillante : PA, lumière et Aveuglé sur Résistance ratée des ennemis engagés. | Glittering Robe p. 253 |
| 66 | Toucher doré | Moteur avec choix du MJ | Pétrification, Test de FM, BE remplacé et durée secrète ; fin après Blessures subies. | Catalogue relu ; adaptation des règles générales V5 |
| 67 | Blindage d’oracier | Moteur avec choix du MJ | Protection de surface, PA, couvert contre Corruption et bonus de dissipation ; surface déclarée. | Catalogue relu ; adaptation des règles générales V5 |
| 68 | Nœud défait | Moteur proposé | Bonus de Savoir liés à un problème ; indices supplémentaires en rappels MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 69 | Blindage de météorite | Moteur proposé | Protection temporaire par trait ; ne pas assimiler le seuil à des PA. | Catalogue relu ; adaptation des règles générales V5 |
| 70 | Métal changeant | Moteur avec choix du MJ | Déformation matérielle ; Test d’Art/Métier pour travaux complexes, résultat arbitré par le MJ. | Mutable Metal p. 253 |
| 71 | Réfraction prismatique de Habermas | Moteur proposé | Malus magique de zone puis bonus d’incantation à usage unique lié au Vent choisi. | Catalogue relu ; adaptation des règles générales V5 |
| 72 | Boussole d’Argent de Puchta | Moteur avec choix du MJ | Boussole enchantée : reprendre les effets mesurables de l’objet de référence, orientation assistée. | Catalogue relu ; adaptation des règles générales V5 |
| 73 | Réplique de Levorg | Moteur avec choix du MJ + suivi fiche | Objet conjuré de durée secrète, encombrement et variante monétaire ; aucune écriture d’inventaire automatique. | Catalogue relu ; adaptation des règles générales V5 |
| 74 | Essais et Erreurs | Moteur proposé | Bonus sur le prochain Test de la compétence choisie et relance conditionnelle à usage unique. | Catalogue relu ; adaptation des règles générales V5 |

## Domaine de Haute Magie — 16 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 75 | Apothéose | Moteur avec choix du MJ + suivi fiche | Soin, Peur, guérison critique assistée et résurrection temporaire ; Yenlui dans la fiche. | Supplément elfe, adaptation V5 requise |
| 76 | Destruction des Arcanes | Moteur avec choix du MJ + suivi fiche | Dégâts proportionnels à l’armure totale, destruction aléatoire ou choisie ; inventaire confirmé. | Supplément elfe, adaptation V5 requise |
| 77 | Coruscation de Finreir | Moteur avec choix du MJ | Vol et PA non cumulatifs ; pivot, faille, portail et bonus environnementaux sous contrôle du MJ. | Supplément elfe, adaptation V5 requise |
| 78 | Malédiction d'Attraction des Flèches | Moteur proposé | Relance des tirs ratés, suppression de bouclier contre les tirs et localisation choisie selon option. | Supplément elfe, adaptation V5 requise |
| 79 | Impasse | Moteur avec choix du MJ + suivi fiche | Neutralisation temporaire de sort, objet ou capacité connue ; restauration de l’effet suspendu. | Supplément elfe, adaptation V5 requise |
| 80 | Drain de Magie | Moteur avec choix du MJ + suivi fiche | Dissipation de zone, vidage de réserve, options d’exemption et blocage magique ; pont avec prières. | Supplément elfe, adaptation V5 requise |
| 81 | Convocation Ardente | Moteur avec choix du MJ | Dégâts périodiques aux victimes initiales, escalade par Round et exemption ; immersion déclarée. | Supplément elfe, adaptation V5 requise |
| 82 | La Fortune est Capricieuse | Moteur proposé | Incidents forcés sur doubles, interdiction du critique magique et priorité sur atténuations. | Supplément elfe, adaptation V5 requise |
| 83 | Glamour de Teclis | Moteur avec choix du MJ | Tests d’Orientation, compteur d’échecs et direction imposée avec Commandement. | Supplément elfe, adaptation V5 requise |
| 84 | Bannissement Majeur | Moteur avec choix du MJ + suivi fiche | Dégâts selon Taille, double pour Instable et dissipations multiples exceptionnelles ; choix de cibles. | Supplément elfe, adaptation V5 requise |
| 85 | Main de Gloire | Moteur proposé + suivi fiche | Modificateurs temporaires de caractéristiques, même 3d10 pour tous ; quatre au choix à +6 DR, Bmax inchangé. | Supplément elfe, adaptation V5 requise |
| 86 | Œil Invisible | Moteur avec choix du MJ | Œil auxiliaire, profil de perception, contrôle et destruction ; corps inactif et Surpris au retour. | Supplément elfe, adaptation V5 requise |
| 87 | Bouclier de Saphery | Moteur proposé | Protection 9+ des alliés améliorée par sort de Haute Magie, sans plancher supplémentaire ; expiration. | Supplément elfe, adaptation V5 requise |
| 88 | Extinction de l'Âme | Moteur proposé + suivi fiche | Projectile de zone avec options de surpuissance ; devenir des âmes en rappel. | Supplément elfe, adaptation V5 requise |
| 89 | empête | Moteur avec choix du MJ | Vortex particulier, dégâts selon vol, pertes temporaires de CC/CT et restrictions de mouvement. | Supplément elfe, adaptation V5 requise |
| 90 | Chemin entre les Mondes | Moteur avec choix du MJ | Éthéré, Mouvement doublé et durée conditionnelle ; voyage entre nexus arbitré par le MJ. | Supplément elfe, adaptation V5 requise |

## Ghur - Ambre - Domaine de la Bête — 26 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 91 | Forme bestiale | Moteur avec choix du MJ | Profil animal temporaire, traits et Blessures de forme ; pertes et critiques conservés au retour. | Beast Form p. 245 |
| 92 | Incarnation de Wyssan | Moteur proposé | Transformation V5, caractéristiques et traits temporaires ; restrictions de langues et Savoir. | Wyssan’s Wildform p. 246 |
| 93 | Vol du Destin | Moteur avec choix du MJ | Nuée de zone, dégâts fixes à la tête et Aveuglé ; déplacement par Action et Emprise sur les animaux. | Flock of Doom p. 246 |
| 94 | Serres d’Ambre | Moteur proposé | Attaques sans arme modifiées, Hémorragique après Blessures et Escalade temporaire. | Amber Talons p. 245 |
| 95 | Transe d’Ambre | Moteur avec choix du MJ | Transe protectrice, immunité aux dommages et fin sur attaque ; prolongation saisonnière consentie. | Winds of Magic contrôlé, adaptation V5 requise |
| 96 | Éveil du Bois | Moteur avec choix du MJ | Zone forestière, projectile, Esquive, Hémorragique et Enchevêtré avec Force définie. | Winds of Magic contrôlé, adaptation V5 requise |
| 97 | Maître des Bêtes | Moteur avec choix du MJ | Animal dominé, profil conservé et ordres simples ; contrôle délégué au MJ. | Beast Master p. 246 |
| 98 | Langue des Bêtes | Moteur proposé | Bonus d’Emprise/Dressage et interdiction de parler, incanter ou dissiper ; dialogue animal en rappel. | Beast Tongue p. 246 |
| 99 | Bête Indomptée | Moteur avec choix du MJ | Animal rendu sauvage ou comportement humain aléatoire ; résistance et désarçonnement. | Catalogue relu ; adaptation des règles générales V5 |
| 100 | Malédiction d’Anraheir | Moteur proposé | Mouvement et caractéristiques réduits selon présence dans la zone ; montures et sortie conditionnelles. | Winds of Magic contrôlé, adaptation V5 requise |
| 101 | Yeux de la Meute | Rappel narratif | Vision partagée à volonté ; ligne de vue autorisée par le MJ, aucune incantation à travers le corps lié. | Winds of Magic contrôlé, adaptation V5 requise |
| 102 | Nuée Funeste | Moteur avec choix du MJ | Même effet que Vol du Destin ; dégâts fixes de tête et contrôle de zone. | Flock of Doom p. 246 |
| 103 | Suivi de l'Odeur | Moteur proposé | Bonus de Pistage/Perception par odeur ; détection de magie et Corruption en rappels MJ. | Winds of Magic contrôlé, adaptation V5 requise |
| 104 | Peau du Chasseur | Moteur proposé | Endurance et traits temporaires, y compris Dark Vision ; ne pas remplacer par Vision nocturne sans source. | Hunter’s Hide p. 246 |
| 105 | Lunes du Chasseur | Moteur proposé | Bonus temporaires de Mouvement, Force et Endurance des alliés dans la zone. | Winds of Magic contrôlé, adaptation V5 requise |
| 106 | Régiment Monstrueux de Merciw | Moteur proposé | Force/Endurance +30, plafond 100 explicite ; exclusion du lanceur. | Catalogue relu ; adaptation des règles générales V5 |
| 107 | Pulvérisation Musquée | Moteur proposé | Bonus pour retrouver la cible ; territoire, persistance et comportement animal en rappels. | Catalogue relu ; adaptation des règles générales V5 |
| 108 | Passage Rapide | Moteur proposé | Mouvement, talents de terrain et rangs temporaires ; bonus pour éviter Enchevêtré. | Catalogue relu ; adaptation des règles générales V5 |
| 109 | Invocation de Monture | Moteur avec choix du MJ | Monture au profil choisi et substitution de Chevaucher par Langue (Magick) ; autonomie de la bête. | Catalogue relu ; adaptation des règles générales V5 |
| 110 | Lance d'Ambre | Moteur proposé | Lance V5 à une cible maximum, localisation choisie, PA de matières ignorés et Hémorragique. | The Amber Spear p. 246 |
| 111 | Le Bœuf Reste Debout | Moteur proposé | Retrait d’états Brisé et immunité temporaire aux nouveaux Tests de Peur/Terreur. | Winds of Magic contrôlé, adaptation V5 requise |
| 112 | Transformation de Kadon | Moteur avec choix du MJ | Profil monstrueux temporaire, traits optionnels, restrictions et contact opposé sur cible réticente. | Catalogue relu ; adaptation des règles générales V5 |
| 113 | Capuche Vengeresse | Moteur proposé | Réduction des dégâts par Calme et renvoi conditionnel ; nouvelle victime de tir sélectionnée. | Catalogue relu ; adaptation des règles générales V5 |
| 114 | Manteau d’Hiver | Moteur proposé | Immunité au froid, modificateur de gravité critique et pénalités temporaires Agilité/Sociabilité. | Catalogue relu ; adaptation des règles générales V5 |
| 115 | Ver Grouillant | Moteur proposé | Enchevêtré de Force 50, oppositions et corrosion du cuir ; fin si libération. | Winds of Magic contrôlé, adaptation V5 requise |
| 116 | Forme Sauvage de Wyssan | Moteur proposé | Même effet que Incarnation de Wyssan ; retenir un profil V5 canonique. | Wyssan’s Wildform p. 246 |

## Ghyran - Jade - Domaine de la Vie — 26 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 117 | Habitants d’en bas | Moteur avec choix du MJ | Tests de Force, montures, cibles retirées temporairement et Corruption au retour. | Catalogue relu ; adaptation des règles générales V5 |
| 118 | Graisse de la Terre | Rappel narratif | Absence de besoin de nourriture et boisson ; durée en jours. | Fare of the Land p. 250 |
| 119 | Cri de Guerre du Jardinier | Moteur avec choix du MJ | Dégâts initiaux de terrain, Hémorragique et Tests de traversée ; forêt physique persistante. | Catalogue relu ; adaptation des règles générales V5 |
| 120 | Don de Vie | Moteur avec choix du MJ | Fertilité en rappel, guérison de maladies de l’animal assistée ; Instantané en V5. | Lifebloom p. 251 |
| 121 | Almanach | Rappel narratif | Prévisions météo et saisons après une journée ; précision selon surpuissance. | Catalogue relu ; adaptation des règles générales V5 |
| 122 | Écorce | Moteur proposé | BE +2 et Agilité/Dextérité −10 temporaires, restauration selon origine. | Barkskin p. 250 |
| 123 | Sang de la Terre | Moteur avec choix du MJ | Soins au début du Round pour les vivants en contact avec la terre ; contacts renseignés. | Earthblood p. 250 |
| 124 | Eau de la terre | Moteur avec choix du MJ | Disparition et retour au début du Round suivant, projection et À Terre au point d’éruption. | Earthpool p. 250 |
| 125 | Chair de Pierre | Moteur proposé | Forme de pierre : Force/Endurance/PA, demi-Mouvement, résistance et parole/respiration. | Catalogue relu ; adaptation des règles générales V5 |
| 126 | Forêt d’Épines | Moteur avec choix du MJ | Terrain, Athlétisme et états de franchissement ; végétation perd sa magie à l’expiration. | Forest of Thorns p. 251 |
| 127 | Forme bestiale - Jade | Moteur avec choix du MJ + suivi fiche | Doublon homebrew intégral de Forme bestiale V5 ; transformation, Blessures, traits et retour identiques, dans Ghyran avec son attribut. | Homebrew utilisateur : doublon de Forme bestiale V5 dans Ghyran |
| 128 | Geyser | Moteur avec choix du MJ | Projectile de zone, déplacement forcé, À Terre et Sonné acheté ; source d’eau en rappel. | Catalogue relu ; adaptation des règles générales V5 |
| 129 | Chant vivifiant | Moteur avec choix du MJ | Réveil des créatures végétales, soins et bonus de Tests ; profils choisis et absence de contrôle. | Catalogue relu ; adaptation des règles générales V5 |
| 130 | Cercueil de Jade | Moteur avec choix du MJ + suivi fiche | Cadavre animé au profil antérieur, ordres simples et absence de parole ; nature non Mort-vivant. | Catalogue relu ; adaptation des règles générales V5 |
| 131 | Chute des feuilles | Moteur proposé | Malus aux tirs adverses, talent Contorsionniste et réduction de certaines familles de dégâts. | Catalogue relu ; adaptation des règles générales V5 |
| 132 | Traque des lignes telluriques | Moteur proposé | Bonus d’Orientation lié aux lignes telluriques ; carte et informations en rappels MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 133 | Relief du terrain | Rappel narratif | Carte mentale du terrain, délai de communion et portée selon option. | Lie of the Land p. 251 |
| 134 | Floraison de vie | Moteur avec choix du MJ | Même effet que Don de Vie ; soins de maladie assistés, fertilité en rappel. | Lifebloom p. 251 |
| 135 | Murmure de la Nature | Rappel narratif | Dialogue avec esprits naturels ; portée, souvenirs, délai et contrepartie gérés par le MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 136 | Sentier de Paranoth | Moteur proposé | Marcheur (Forêts) et rangs supplémentaires ; absence de traces et fin sur sentier/arbre déclarées. | Catalogue relu ; adaptation des règles générales V5 |
| 137 | Régénération | Moteur proposé + suivi fiche | Trait Régénération temporaire V5 : récupération, critiques et impossibilité de régénérer le feu. | Regenerate p. 251 |
| 138 | Escalier en Spirale | Moteur avec choix du MJ | Déplacement vertical, PA et accès réservé ; hauteur, trajectoire et tests renseignés. | Winds of Magic contrôlé, adaptation V5 requise |
| 139 | Transmogrification Exaltée de Colchis | Moteur proposé | Retrait Enflammé et immunité au feu tant que dans la zone ; sortie explicitement déclarée. | Winds of Magic contrôlé, adaptation V5 requise |
| 140 | Apothéose Verdoyante | Moteur avec choix du MJ + suivi fiche | Résurrection de morts récents avec 1 B par DR final du sort ; Corruption modérée, exclusions critiques/membres/décapitation, victimes choisies par le MJ. | Winds of Magic contrôlé, adaptation V5 requise |
| 141 | Croissance Vitale | Moteur avec choix du MJ | Croissance et Rounds supplémentaires de concentration ; géométrie et terrain sous arbitrage du MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 142 | Forme de Bois | Moteur avec choix du MJ | Forme de chêne, résistance, perception et vulnérabilités ; profil d’objet à renseigner. | Catalogue relu ; adaptation des règles générales V5 |

## Hysh - Blanc - Domaine de la Lumière — 25 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 143 | Mains de Karkora | Moteur avec choix du MJ | Agrippement de zone, Force de source et suffocation facultative déclarée avant lancer. | Catalogue relu ; adaptation des règles générales V5 |
| 144 | Protection de Phâ | Moteur avec choix du MJ | Zone protectrice et interdiction d’entrée, Brisé pour intrus et immunité Corruption. | Phâ’s Protection p. 252 |
| 145 | Crevasse | Moteur avec choix du MJ | Crevasse, Esquive, chute puis ensevelissement ; choix des occupants et dégâts à la fermeture. | Catalogue relu ; adaptation des règles générales V5 |
| 146 | Pensée rapide | Moteur proposé | Intelligence et Initiative +20 temporaires ; même sort que Vitesse de pensée. | Speed of Thought p. 252 |
| 147 | Piège d'Abulla | Moteur avec choix du MJ | Enchevêtré, lévitation, mouvement imposé et chute à la libération. | Catalogue relu ; adaptation des règles générales V5 |
| 148 | Assaut de pierre | Moteur avec choix du MJ | Terrain permanent, dégâts à localisation tirée même après Esquive réussie ; structures assistées. | Catalogue relu ; adaptation des règles générales V5 |
| 149 | Bannissement | Moteur proposé | Comparaison Endurance/FM, gain d’Instable ou réduction à zéro Blessure, sans mort automatique. | Banishment p. 251 |
| 150 | Lumière aveuglante | Moteur avec choix du MJ | Trois Aveuglé aux spectateurs à portée BFM, sauf Magie Lumière ; regard déclaré. | Blinding Light p. 251 |
| 151 | Clarté d’esprit | Moteur proposé | Neutralisation temporaire des seules pénalités mentales, sans guérir durablement leurs causes. | Clarity of Thought p. 251 |
| 152 | Fléau des Démons | Moteur avec choix du MJ | E ≤ Int : bannissement ; Int < E < 2×Int : Bmax divisées par deux ; E ≥ 2×Int : aucun effet principal ; spectateurs aveuglés selon V5. | Daemonbane p. 252 |
| 153 | Éclat éblouissant | Moteur avec choix du MJ | Aveuglé de zone et Sonné des Démons ; ne pas confondre avec Lumière aveuglante V5. | Catalogue relu ; adaptation des règles générales V5 |
| 154 | Volonté inébranlable | Moteur proposé | Bonus ciblés de résistance sociale ou de Charme sous condition de vérité. | Catalogue relu ; adaptation des règles générales V5 |
| 155 | Lumière guérisseuse | Moteur proposé | Soins BI, purification, Focalisation de contrôle pour retirer Corruption récente. | Healing Light p. 252 |
| 156 | Ériger l’édifice | Moteur avec choix du MJ + suivi fiche | Construction et couvert, Rounds supplémentaires, dépendance aux compétences pour stabilité durable. | Catalogue relu ; adaptation des règles générales V5 |
| 157 | Yeux de Volans | Moteur proposé | Perception visuelle −2 DR ou +2 DR pour Seconde vue ; informations sur Corruption en rappels MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 158 | Illuminer l’édifice | Moteur avec choix du MJ | Bâtiment illuminé, test d’entrée des Démons/Morts-vivants et Blessures directes après entrée. | Catalogue relu ; adaptation des règles générales V5 |
| 159 | Lumière de pureté | Moteur proposé | Résistance (Maladie) et bonus de dissipation de magie noire/Chaos dans la lumière ; source lumineuse déclarée. | Catalogue relu ; adaptation des règles générales V5 |
| 160 | Bibliothécaire instantané de Meissner | Moteur proposé | Contribution à une Recherche étendue ; livres trouvés et lumière en rappels. | Catalogue relu ; adaptation des règles générales V5 |
| 161 | Filet d’Amyntok | Moteur proposé | Mouvement interdit, Sonné verrouillé puis récupération par Intelligence ; Bestial immunisé. | Net of Amyntok p. 252 |
| 162 | Orbe de Hysh | Moteur avec choix du MJ | Télékinésie avec poids/vitesse définis et confinement d’influence ; géométrie renseignée. | Catalogue relu ; adaptation des règles générales V5 |
| 163 | Compréhension parfaite | Rappel narratif | Compréhension des langues et messages ; exceptions du MJ et aucune capacité de parler accordée. | Catalogue relu ; adaptation des règles générales V5 |
| 164 | Percer le Voile | Moteur proposé | Ignorance de pénalités de visibilité, Test opposé pour obscurité magique/invisibilité/illusions. | Catalogue relu ; adaptation des règles générales V5 |
| 165 | Cape chatoyante | Moteur proposé | Remplacement des dégâts des attaques ordinaires et immunités par famille ; attaques magiques exclues. | Catalogue relu ; adaptation des règles générales V5 |
| 166 | Vitesse de pensée | Moteur proposé | Même effet que Pensée rapide : Intelligence/Initiative temporaires. | Speed of Thought p. 252 |
| 167 | Dérèglement temporel | Moteur proposé | Actions supplémentaires des alliés dans l’ordre d’Initiative ; aucune action/déplacement des autres camps. | Catalogue relu ; adaptation des règles générales V5 |

## Magie Elfique Arcanique — 8 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 168 | Enchantement Végétal (Ghyran & Chamon) | Moteur avec choix du MJ + suivi fiche | Enchantement permanent de plante et dissipation possible ; objet et contreparties hors fiche combat. | Supplément elfe, adaptation V5 requise |
| 169 | Bannissement Mineur (Hysh & Shyish) | Moteur proposé | Bannissement de certaines entités sur opposition FM/Calme ; exclusions de puissance. | Supplément elfe, adaptation V5 requise |
| 170 | Alarme Magique (Azyr & Ulgu) | Moteur avec choix du MJ | Alarme de zone pour entrées de Taille définie ; réveil, nombre et position connus du MJ. | Supplément elfe, adaptation V5 requise |
| 171 | Masque de l'Esprit (Shyish & Ulgu) | Moteur proposé | Malus d’Intuition et incantations de lecture mentale ciblant le lanceur. | Supplément elfe, adaptation V5 requise |
| 172 | Purification du Corps (Ghyran & Hysh) | Moteur avec choix du MJ + suivi fiche | Maladie/poison retiré après Résistance ; maladresse transfère l’affliction au lanceur. | Supplément elfe, adaptation V5 requise |
| 173 | Parler avec un Animal (Azyr & Ghur) | Moteur proposé | Substitution de Charme à Emprise animale ; traduction avec Langue (Magick), dialogue en rappel. | Supplément elfe, adaptation V5 requise |
| 174 | Voix de Fer (Aqshy & Chamon) | Moteur proposé | Bonus Intimidation/Commandement et test adverse permettant de l’ignorer ; voix en rappel. | Supplément elfe, adaptation V5 requise |
| 175 | Zone de Confort (Aqshy & Ghur) | Moteur proposé | Immunité aux petites nuées et exposition, dégâts feu/froid diminués de 1. | Supplément elfe, adaptation V5 requise |

## Petite Magie Elfique — 6 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 176 | Flèche Bénie | Moteur proposé | Flèche temporairement magique et dégâts +1 ; consommation d’inventaire non automatisée. | Supplément elfe, adaptation V5 requise |
| 177 | Calme | Moteur proposé | Psychologies et Frénésie retirées après Sociabilité réussie ; préserver les traits qui causent la Peur. | Supplément elfe, adaptation V5 requise |
| 178 | Doigt Vert | Rappel narratif | Croissance naturelle et retour de plantes mortes à la vie le lendemain. | Supplément elfe, adaptation V5 requise |
| 179 | Identifier une Maladie | Rappel narratif | Diagnostic des maladies ; révélation de leurs noms/effets par le MJ. | Supplément elfe, adaptation V5 requise |
| 180 | Enlever la Saleté | Moteur avec choix du MJ | Nettoyage en rappel ; retrait de Souillé à proposer comme conséquence mesurable V5. | Supplément elfe, adaptation V5 requise ; Le nettoyage satisfait la condition de retrait de Souillé en V5 ; prévoir le retrait, sans effacer d’autres états. |
| 181 | Révéler la Magie | Moteur avec choix du MJ | Objets/créatures magiques révélés, sans révéler un mage non enchanté ; portée renseignée. | Supplément elfe, adaptation V5 requise |

## Shyish - Pourpre - Domaine de la Mort — 24 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 182 | La Faux de Shyish | Moteur proposé | Hallebarde magique V5 ; Morts-vivants engagés privés d’Avantage V5 aux Tests contre le porteur. | Scythe of Shyish p. 247 |
| 183 | Acceptation du Destin | Moteur proposé | Immunité Peur, Terreur traitée comme Peur ; variante interdit fuite après Calme raté. | Catalogue relu ; adaptation des règles générales V5 |
| 184 | Amarante | Moteur proposé | Gravité des critiques diminuée et Résistances temporaires avec rangs supplémentaires. | Catalogue relu ; adaptation des règles générales V5 |
| 185 | Âme Emprisonnée | Moteur avec choix du MJ + suivi fiche | Âme emprisonnée, corps inactif, entretien, libération et décès selon circonstances. | Catalogue relu ; adaptation des règles générales V5 |
| 186 | Cendres et Poussière | Moteur avec choix du MJ | Vortex, dégâts/suffocation, option de Soleil et mort sur résistance ratée ; spatial et mortalité assistés. | Catalogue relu ; adaptation des règles générales V5 |
| 187 | Caresse de Laniph | Moteur avec choix du MJ + suivi fiche | Projectile de contact, baisse permanente du Bmax adverse et gain de réserve ; conséquences de fiche séparées. | Caress of Laniph p. 247 |
| 188 | Contrainte des Esprits | Moteur avec choix du MJ + suivi fiche | Contrôle ou invocation d’esprits ; opposition, profils et ordres choisis par le MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 189 | Labyrinthe de Cristal | Moteur avec choix du MJ | Cibles retirées temporairement, table de retours et perte définitive ; aucun effacement automatique. | Catalogue relu ; adaptation des règles générales V5 |
| 190 | Délivrance de la Mort | Moteur proposé | Calme périodique, Sonné et libération après trois états ; nature d’esprit vérifiée. | Catalogue relu ; adaptation des règles générales V5 |
| 191 | Derniers Mots | Rappel narratif | Communication avec une âme récente ; absence de mensonge et réponses libres du MJ. | Dying Words p. 247 |
| 192 | Destin de Bjuna | Moteur proposé | Calme et dégâts par Round avec localisation tirée, état Sonné et suffocation optionnelle. | Catalogue relu ; adaptation des règles générales V5 |
| 193 | L’Étreinte d’Iyrtu | Moteur proposé | Force temporaire selon DR et plancher de résultat aux prises ; passage au système d’agrippement V5. | Winds of Magic contrôlé, adaptation V5 requise |
| 194 | Flétrissement des Membres | Moteur avec choix du MJ + suivi fiche | Membre neutralisé et durée ; variante funéraire déclenchée ultérieurement, conséquence de fiche assistée. | Catalogue relu ; adaptation des règles générales V5 |
| 195 | Voile Pourpre de Shyish | Moteur proposé | PA temporaires et Peur avec surpuissance ; expiration sans perte de PA source. | Purple Pall of Shyish p. 247 |
| 196 | Sanctifier | Moteur avec choix du MJ | Barrière Mort-vivant à l’entrée comme à la sortie, tracé renseigné. | Sanctify p. 247 |
| 197 | Révélation de Shyish | Rappel narratif | Historique des morts et questions binaires ; aucune identité révélée automatiquement. | Catalogue relu ; adaptation des règles générales V5 |
| 198 | Vortex d’Âmes | Moteur proposé | Brisé en zone et projectile spécifique Mort-vivant ignorant BE/PA. | Soul Vortex p. 247 |
| 199 | Vitesse de Lykos | Moteur proposé | Déplacement fixe au prochain Tour et action supplémentaire en cas de mort pendant la durée. | Catalogue relu ; adaptation des règles générales V5 |
| 200 | Vol de Vie | Moteur proposé | Projectile, retrait Exténué du lanceur et soin proportionnel aux Blessures réellement infligées. | Steal Life p. 247 |
| 201 | Mort rapide | Moteur avec choix du MJ + suivi fiche | Mort d’une cible à zéro Blessure, contrôlée par le MJ ; interdiction de résurrection en rappel. | Swift Passing p. 247 |
| 202 | Goût de la Mort | Moteur proposé | Corruption, Calme, Inconscient/Sonné, Exténué et Psychologie avec déclenchement quotidien. | Catalogue relu ; adaptation des règles générales V5 |
| 203 | Télépathie | Moteur avec choix du MJ | Message télépathique en rappel ; lecture superficielle, détection/opposition à l’intrusion assistées. | Catalogue relu ; adaptation des règles générales V5 |
| 204 | Marée des Âges | Moteur avec choix du MJ + suivi fiche | Objet vieilli ou pertes permanentes de Force/Endurance ; inventaire et fiche sous confirmation. | Catalogue relu ; adaptation des règles générales V5 |
| 205 | Les Enfants Sauvages de Zandox | Moteur avec choix du MJ | Deux chiens auxiliaires avec attaques, profils et portée ; invisibilité et absence d’Élan à adapter. | Winds of Magic contrôlé, adaptation V5 requise |

## Sort d'Arcane — 23 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 206 | Arme aethyrique | Moteur proposé | Arme aethyrique du profil V5 avec qualité Magique et expiration. | Aethyric Arms p. 242 |
| 207 | Armure aethyrique | Moteur proposé | PA magiques temporaires toutes localisations ; aucune pénalité d’armure à l’incantation. | Aethyric Armour p. 242 |
| 208 | Attaques en chaine | Moteur avec choix du MJ | Projectile à rebonds, seuil de Blessures, dégâts décroissants et plafond ; prochaine victime renseignée. | Chain Attack p. 243 |
| 209 | Aura ordinaire | Moteur proposé | Aura ordinaire, incantation interdite et fin dès un Test de Focalisation. | Mundane Aura p. 244 |
| 210 | Bouclier anti-flèches | Moteur avec choix du MJ | Bouclier contre projectiles organiques entrant dans la zone ; matériau et franchissement déclarés. | Arrow Shield p. 243 |
| 211 | Chute | Moteur proposé | Objet tenu lâché après Dextérité ratée, résistance aggravée par surpuissance. | Drop p. 244 |
| 212 | Dôme | Moteur avec choix du MJ | Dôme avec Protection contre attaques magiques ou à distance venues de l’extérieur. | Dome p. 244 |
| 213 | Effrayant | Moteur proposé | Trait Peur temporaire et niveaux supplémentaires par surpuissance. | Fearsome p. 244 |
| 214 | Envol | Moteur proposé | Trait Vol V5 avec compétence appropriée ; suivre décollage, atterrissage et expiration. | Flight p. 244 |
| 215 | Pont | Moteur avec choix du MJ | Pont de dimensions définies ; placement et traversées gérés par le MJ. | Bridge p. 243 |
| 216 | Poussée | Moteur avec choix du MJ | Repoussement, dégâts, À Terre et collision avec créature de Taille égale ou inférieure. | Push p. 245 |
| 217 | Protection | Moteur proposé | Protection temporaire V5 7+ et NI6. | Ward p. 245 |
| 218 | Souffle | Moteur avec choix du MJ | Souffle V5 : test CT, Esquive par victime, zone et variantes de Domaine avec dégâts/états. | Breath p. 243 |
| 219 | Téléportation | Moteur avec choix du MJ | Téléportation à distance BFM+DR, destination et obstacles renseignés. | Teleport p. 245 |
| 220 | Terrifiant | Moteur proposé | Trait Terreur temporaire et niveaux supplémentaires selon surpuissance. | Terrifying p. 245 |
| 221 | Enchevêtrement | Moteur proposé | Enchevêtré et Force de lien définie, durée V5 ; opposition de libération. | Entangle p. 244 |
| 222 | Perturbant | Moteur proposé | Trait de créature Distracting temporaire ; appliquer son effet V5 aux adversaires concernés. | Distracting p. 244 |
| 223 | Sang corrosif | Moteur proposé | Trait Sang corrosif temporaire et expulsion d’afflictions ; supprimer le texte copié de Protection. | Corrosive Blood p. 243 |
| 224 | Vision dans l’obscurité | Moteur proposé | Vision dans le noir temporaire avec durée BI ; pas création de compétence permanente. | Dark Vision p. 243 |
| 225 | Bouclier magique | Moteur proposé | Bonus de DR aux dissipations du lanceur, limité au sort actif. | Magic Shield p. 244 |
| 226 | Carreau | Moteur proposé | Projectile magique +4 ; appliquer BFM et absorption selon V5, aucun DR automatique aux dégâts. | Bolt p. 243 |
| 227 | Explosion | Moteur proposé | Projectile magique de zone +3 ; victims sélectionnées, états et attribut du Domaine distincts. | Blast p. 243 |
| 228 | Déplacement d’objet | Moteur avec choix du MJ | Objet déplacé avec limites de poids et dimensions ; tentative sur objet tenu opposée au porteur. | Move Object p. 244 |

## Sort Mineur — 25 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 229 | Alerte | Rappel narratif | Objet empoisonné ou piégé détecté ; résultat révélé par le MJ, aucune information privée lue automatiquement. | Warning p. 242 |
| 230 | Amitié animale | Moteur avec choix du MJ | Animal plus petit et Bestial rendu amical ; comportement arbitré, aucun bonus de Charme inventé. | Animal Friend p. 240 |
| 231 | Bruits | Moteur avec choix du MJ | Création de sons et contrôle par FM ; origine, volume et terrain en rappel. | Sounds p. 242 |
| 232 | Choc | Moteur proposé | Sonné au contact jusqu’à la fin du prochain Tour du lanceur. | Shock p. 242 |
| 233 | Conservation | Rappel narratif | Conservation de vivres, sans protection contre destruction extérieure ; durée BFM jours. | Conserve p. 240 |
| 234 | Coup de vent | Rappel narratif | Rafale utilitaire, extinction de bougie ou déplacement d’objet léger ; aucune attaque inventée. | Gust p. 241 |
| 235 | Créer un petit animal | Moteur avec choix du MJ + suivi fiche | Création d’un petit animal local au profil choisi ; caractère et présence d’une espèce arbitrés. | Produce Small Animal p. 241 |
| 236 | Drain | Moteur proposé | Drain au contact, Blessures réelles et soin plafonné ; règles de contact opposé. | Drain p. 240 |
| 237 | Éblouissant | Moteur proposé | Aveuglé initial et périodique ; états reçus suivent la récupération prévue, expiration ciblée. | Dazzle p. 240 |
| 238 | En catimini | Moteur avec choix du MJ | Petit objet téléporté dans les mains ; dimensions et disponibilité renseignées, effet instantané V5. | Sly Hands p. 242 |
| 239 | Feux follets | Moteur avec choix du MJ | Lumières mobiles contrôlées par Test de FM ; déplacement distinct de Focalisation de réserve. | Marsh Lights p. 241 |
| 240 | Flamme magique | Moteur avec choix du MJ | Flamme naturelle en paume, lanceur protégé ; objets embrasés déclarés par le MJ. | Magic Flame p. 241 |
| 241 | Fléchette | Moteur proposé | Fléchette, projectile magique +0 avec BFM ajouté une seule fois, aucune surpuissance mineure. | Dart p. 240 |
| 242 | Lumière | Moteur avec choix du MJ | Objet lumineux et variation par FM ; rayon et suppression éclairage arbitrés. | Light p. 241 |
| 243 | Pas léger | Moteur proposé | Pistage adverse −3 DR et durée Agilité minutes ; traces en rappel. | Careful Step p. 240 |
| 244 | Protection contre la pluie | Rappel narratif | Protection personnelle contre les précipitations, durée BFM heures ; ne protège pas de l’eau stagnante. | Protection from Rain p. 241 |
| 245 | Purification de l'eau | Rappel narratif | Purification d’eau dans un récipient, poisons et alcool retirés ; quantité et résultat en rappel. | Purify Water p. 241 |
| 246 | Repères | Rappel narratif | Direction du nord en rappel, limité au lanceur. | Bearings p. 240 |
| 247 | Secousse | Moteur proposé | Dextérité +2 DR pour conserver un objet tenu ; lâcher l’objet sur échec. | Twitch p. 242 |
| 248 | Serrure ouverte | Rappel narratif | Serrure non magique touchée déverrouillée ; contexte matériel déclaré par le MJ. | Open Lock p. 241 |
| 249 | Source | Rappel narratif | Eau produite avec quantité définie ; aucune surpuissance mineure. | Spring p. 242 |
| 250 | Sommeil | Moteur proposé | Sommeil au contact selon position : À Terre/Inconscient ; fin au bruit ou à la secousse. | Sleep p. 242 |
| 251 | Murmures | Rappel narratif | Voix projetée sans ligne de vue ; point d’origine et auditeurs déterminés par le MJ. | Murmured Whisper p. 241 |
| 252 | Tendre l'oreille | Moteur avec choix du MJ | Écoute distante, portée Initiative et durée BFM minutes ; contenu des conversations en rappel MJ. | Eavesdrop p. 241 |
| 253 | Putréfaction | Moteur avec choix du MJ + suivi fiche | Corrosion d’un PA de cuir dans la localisation choisie ; dommage d’équipement transmis à la fiche. | Rot p. 242 |

## Uglu - Gris - Domaine de l'Ombre — 25 sorts

| Ligne Magie | Sort | Traitement proposé | Effets à traiter | Source V5 / contrôle |
|---:|---|---|---|---|
| 254 | Danse du Désespoir | Moteur proposé | Tests de FM, Athlétisme/Représentation et interdiction d’agir/bouger ; Exténué à l’expiration. | Catalogue relu ; adaptation des règles générales V5 |
| 255 | Portail d’Ombre | Moteur proposé | Téléportation et Surpris des seuls ennemis engagés au départ ; doublon Pas d’Ombre. | Shadowstep p. 255 |
| 256 | Égarer | Moteur proposé | FM puis table de comportement ; restrictions, À Terre et Sans défense selon résultat fourni. | Catalogue relu ; adaptation des règles générales V5 |
| 257 | Horreurs Noires | Moteur proposé | Peur de zone, valeur plafonnée et ombre magique ; apparition en rappel. | Catalogue relu ; adaptation des règles générales V5 |
| 258 | Pont d’Ombres | Moteur avec choix du MJ | Groupe volontaire transporté, trajectoire visible et arrivée différée ; pas traversée de solide. | Catalogue relu ; adaptation des règles générales V5 |
| 259 | Ombres Étrangleuses | Moteur proposé | Exténué, parole interdite et suffocation temporaire ; sortie/respiration suivies. | Choking Shadows p. 254 |
| 260 | Poches Profondes | Moteur avec choix du MJ + suivi fiche | Objet sans poids en dimension de poche, récupération par Action et perte à expiration. | Catalogue relu ; adaptation des règles générales V5 |
| 261 | Doppelgänger | Moteur proposé | Apparence trompeuse et opposition d’Intuition pour Seconde vue ; comportement en rappel. | Doppelganger p. 254 |
| 262 | Grande Illusion | Moteur avec choix du MJ | Illusion multisensorielle, actions d’observateurs et interactions matérielles sous arbitrage du MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 263 | Ailes Grises | Moteur avec choix du MJ | Téléportation sans ligne de vue et résistance par Esquive sur cible réticente. | Catalogue relu ; adaptation des règles générales V5 |
| 264 | Cor du Andar | Moteur proposé | Bonus/malus de Calme/Commandement selon camp et Peur immédiate des ennemis. | Winds of Magic contrôlé, adaptation V5 requise |
| 265 | Silence | Moteur avec choix du MJ | Silence de zone en trois variantes du supplément ; distinct du sort Arcane V5 absent du catalogue. | Catalogue relu ; adaptation des règles générales V5 ; Deux sorts distincts portent le nom Silence ; le variant du supplément ne doit pas être écrasé par l’Arcane V5. |
| 266 | Illusion | Moteur avec choix du MJ | Illusion de zone, Intuition opposée et animation par Focalisation de contrôle sans gain de réserve. | Illusion p. 254 |
| 267 | Effacement d’esprit | Moteur avec choix du MJ + suivi fiche | Perte de mémoire temporaire ou permanente après opposition ; conséquence narrative majeure confirmée. | Mindslip p. 254 |
| 268 | Visage mutable | Moteur proposé | Modification temporaire de Sociabilité/apparence, forme de mort et résistance ; reconnaissance assistée. | Winds of Magic contrôlé, adaptation V5 requise |
| 269 | Miasme mystifiant | Moteur proposé | Aveuglé/Assourdi/Exténué maintenus et Perception au mouvement ; fin sans Sonné supplémentaire V4. | Mystifying Miasma p. 254 |
| 270 | Gouffre de Tarnus | Moteur avec choix du MJ | Gouffre, Esquive, chute, fermeture et suffocation des occupants renseignés. | Catalogue relu ; adaptation des règles générales V5 |
| 271 | Illusion rétroactive de Ribauld | Rappel narratif | Terrain déplacé par illusion rétroactive, occupants emportés ; choix et faisabilité arbitrés par le MJ. | Catalogue relu ; adaptation des règles générales V5 |
| 272 | Bosquet d’ombres | Moteur proposé | Visibilité des ombres et pénalité de −1 DR contre cibles révélées ; besoin de lumière déclaré. | Catalogue relu ; adaptation des règles générales V5 |
| 273 | Destrier d’Ombre | Moteur avec choix du MJ | Monture au profil V5, traits conditionnés au soleil, Chevaucher modifié et chute à disparition. | Shadowsteed p. 255 |
| 274 | Pas d’Ombre | Moteur proposé | Même effet que Portail d’Ombre ; un profil canonique, Surpris au départ seulement. | Shadowstep p. 255 |
| 275 | Linceul d’Invisibilité | Moteur proposé | Invisibilité, Perception opposée avec Seconde vue et fin au bruit/attaque. | Shroud of Invisibility p. 255 |
| 276 | Substance d’Ombre | Moteur proposé | Immunité physique conditionnée à l’ombre, magie reçue normalement ; sortie de l’ombre déclarée. | Catalogue relu ; adaptation des règles générales V5 |
| 277 | Traître de Tarn | Moteur proposé | Allégeance temporaire, opposition initiale, Calme sur attaque d’allié et refus d’ordre suicidaire. | Catalogue relu ; adaptation des règles générales V5 |
| 278 | Ombre Vagabonde | Moteur avec choix du MJ | Ombre auxiliaire, contrôle par Action, perception distante, Peur et conditions de destruction. | Catalogue relu ; adaptation des règles générales V5 |

## Doublons et variantes

- Lignes 92 / 116 : Même sort, profils V4 à remplacer par Wyssan V5.
- Lignes 93 / 102 : Même sort Flock of Doom ; dégâts fixes à la tête.
- Lignes 120 / 134 : Même sort Lifebloom.
- Lignes 146 / 166 : Même sort Speed of Thought.
- Lignes 255 / 274 : Même sort Shadowstep.
- Lignes 50 / 65 : Alias proposé, nom Écaille d’acier non confirmé.
- Lignes 91 / 127 : Doublon homebrew confirmé : même profil intégral que Forme bestiale V5, mais Vent Ghyran et attribut du Domaine de la Vie.

## Talents réservés au lot 3

Les 28 talents ci-dessous ne sont pas tous des talents de lancer de sorts : prières, runes et effets elfiques demandent des phases distinctes. Leurs clauses déjà classées au lot 2 restent la source du raccordement.

- Assistant animal
- Assistant magique
- Bénédiction de Lileath
- Béni
- Béni par Isha
- Danse des épées
- Défiance magique
- Diction instinctive
- Dons de Khaine
- Haine sacrée
- Harmonisation aethyrique
- Haute Magie
- Imprégné
- Invocation
- L’esprit sur le corps
- Mage de guerre
- Magie des Arcanes
- Magie des runes
- Magie des Runes de Maître
- Magie du Chaos
- Magie mineure
- Méditation Cadai
- Œil de la tempête
- Pacte de l’âme
- Perception de la Magie
- Résistance à la Magie
- Sanctuaire de l’esprit
- Sorcier !
