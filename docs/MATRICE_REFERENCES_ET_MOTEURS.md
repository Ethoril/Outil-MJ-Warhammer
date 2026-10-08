# Matrice des références et des moteurs — lot 1

Version de contenu : `references:4de0b18508d550391305158f999f4704ac9ada590796f74b689ab3dc54ee3392`. Référence publique récupérée le 2026-10-08T10:30:43.787Z. Générée par `node tools/generate-reference-matrix.mjs`.

La fiche fait autorité sur chaque exemplaire personnalisé ; Aides de jeu fait autorité sur les définitions. Les exports CSV publics ci-dessous sont les seuls documents distants lus. Aucune donnée Firestore privée de PJ n’a été chargée pour établir cette matrice. Les succès HTTP et la parité des fichiers de référence ne valent pas une recette authentifiée des cinq fiches.

## Sources communes et preuve

| Collection | Source | Statut et portée |
| --- | --- | --- |
| Talents | Aides de jeu / Talents, gid 1096647859 | 206 définitions bilingues, limites, spécialisations ; alias historiques explicites copiés des fiches |
| Mots clés | Aides de jeu / Mots Clés Armes et Armures, gid 1604774011 | 55 identifiants explicites, effets, paramètres, alias, sources et éditions |
| Équipement | Aides de jeu / Armes Corps à Corps, Armes à Distance, Armures | 213 modèles après transformations source des fiches, dont 8 munitions complémentaires |
| Compétences | referentiel-public.json + skills.json publiés par le projet fiches | 299 entrées publiées, formes principales et alias source ; compétences complémentaires Lustria selon moteur source |
| Sorts et miracles | Aides de jeu / Magie gid 0 / Miracles gid 1678905785 | 280 sorts, 15 miracles ; consultation uniquement ; sorts retirés conservés pour historique |
| Fonctions partagées | js/data/shared : copie versionnée des fonctions pures source | Parité assurée par régénération et tests ; production indépendante des chemins du disque du projet source |
| Références complémentaires | Corrections de portée et munitions du générateur équipement source | Provenance textuelle conservée ; tables/livres exacts non relus dans cette livraison |

### Empreintes des exports publics

| Onglet | Export | SHA-256 |
| --- | --- | --- |
| Mots Clés Armes et Armures | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Mots%20Cl%C3%A9s%20Armes%20et%20Armures) | 86192b476f14280c78c2b1b7581314f6e572e1ad97ce2beeba3117339ad6d536 |
| Armes Corps à Corps | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Armes%20Corps%20%C3%A0%20Corps) | 09fbb8508c3e40535667013167b823c89b2d90634857f5b1433c8d8716cfa2d0 |
| Armes à Distance | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Armes%20%C3%A0%20Distance) | 31d2c20450c389e0ddb16571fb610b8510ec522700a10511ad12fc52ba7551a5 |
| Armures | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Armures) | 859659dd6e52b658be3a5c47a43149176454bf2e164218c3f3ceab6eb688d13d |
| Talents | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Talents) | e9ffc83ad41261ffe4e4deb24b8acb757da9ae9c4049be96ee237975cf495cee |
| Magie | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Magie) | 62ef4366c087054ab8d639cf3bfb7a15cda936ef408ef634803b87db6463c013 |
| Miracles | [CSV public](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&sheet=Miracles) | 24110efc17a8a6b9bf6170200a39db08eb5af02ea2729922c1db9bc9288fc19f |

## Contrats de calcul vérifiés

Un moteur n’est actif que si son effet et son édition correspondent au fichier indépendant `js/data/keyword-engine-contracts.json`, audité le 2026-10-08. Ce contrat ne se régénère pas lors d’un rafraîchissement du catalogue. Une définition changée reste consultable ; l’application des dégâts est bloquée avec arbitrage requis. Les paramètres textuels sont conservés ; ils ne sont jamais convertis silencieusement en zéro.

| Cas | Comportement | Vérification |
| --- | --- | --- |
| Couches | Meilleure pièce par couche et par zone ; les pièces écartées restent expliquées ; bonus de même base non multiplié | Cuir 1 + maille 2 + plates 2 = 5 ; six localisations ; parité fonction source |
| Bouclier | Un seul objet choisi ; aucun ajout permanent de PA ; disponibilité + opposition explicites ; indisponibilité de scène prioritaire | Disponible+opposition X2 donne +2 PA ; inconnu bloque ; indisponible donne +0 ; tir requiert ligne de vue et X≥2 |
| Inoffensive | Double PA, pas de minimum de Blessure ; annule Percutante et Dévastatrice ; deux gravités critiques et minimum | Arme3+DR1−PA2×2 = 0 ; dés71/25 donnent gravité25 ; jet alternatif absent bloque application |
| Partielle | Numéro de localisation pair ignore cette seule pièce | Cuir1 + pièce Partielle2 : jet50->1PA ; jet51->3PA |
| Points faibles | Critique Empaleuse ignore cette seule pièce | Cuir1 + plates2 : critique Empaleuse ->1PA, coup normal ->3PA |
| Impénétrable | Critique causé par jet impair ignoré sur pièce protégée | Jet33->critique ignoré ; jet22->critique conservé |
| Munitions | Arme à distance et catégorie compatible requises ; mots clés communs dédoublonnés avec les deux provenances | Arc+flèches Empaleuse active une seule fois ; épée+flèches refusées ; catégorie inconnue exige arbitrage explicite |
| Talents acquis | Rangs par identité + spécialité ; notes et acquisitions conservées ; aucun nouveau effet mécanique | Hardy et Dur à cuire même ID ; Sight traduit Vue via table source ; spécialités distinctes non fusionnées par heuristique |
| Dégâts | BF±n sûr, BF selon Force du moment ; expression non reconnue intacte et manuelle | BF+4 : F39->7 et F40->8 ; code/dés/prose jamais évalués comme JavaScript |
| Actualisation | Les 7 exports forment un ensemble atomique ; cache complet conservé si une feuille échoue | HTTP503 et Talents incomplet refusés ; version identique après récupération identique à autre date |

## Toutes les définitions de mots clés

Les mentions « mécanique partielle » indiquent explicitement les effets restants à gérer manuellement ; elles ne promettent pas une automatisation complète du mot clé. Les mots clés non listés dans les moteurs restent consultables et manuels.

| ID | Nom | Édition | Source | Effet source | Couverture et limites |
| --- | --- | --- | --- | --- | --- |
| a-enroulement | À Enroulement | V5 | Livre de base V5 EN p.305 | Les Tests de Corps à corps pour s'opposer à une attaque de cette arme subissent -1 DR. | Manuel |
| a-poudre-noire | À Poudre noire | V5 | Livre de base V5 EN p.304 | La cible doit réussir un Test de Calme Accessible (+2 DR) ou subir 1 état Brisé, même si le tir la rate. | Manuel |
| a-repetition | À répétition X | V5 | Livre de base V5 EN p.305 | Contient X tirs ; l'arme se recharge automatiquement après chaque tir. Une fois les X tirs dépensés, il faut la recharger entièrement selon les règles normales. | Manuel |
| assommante | Assommante | V5 | Livre de base V5 EN p.305 | Si une touche à la Tête fait perdre au moins autant de Blessures que le Bonus d'Endurance de la cible, celle-ci subit 1 état Sonné. | Manuel |
| bacle | Bâclé | V5 | Livre de base V5 EN p.299 | Se casse sur tout Test raté utilisant l'objet qui donne un double. Une armure Bâclée est cassée par tout Coup critique subi sur une localisation qu'elle protège. | Manuel |
| carreau-barbele | Carreau barbelé | V5 supplément | Temple of Spite p.58 | Si la cible subit des Dégâts : Test d'Esquive Intermédiaire (+0 DR), sinon elle est ancrée : À Terre et traînée de 1d10 yards vers le tireur pendant son Round. Retirer le carreau : Test Difficile (-2 DR), +1 Blessure. | Manuel |
| croche-pied | Croche-pied | V4 supplément | Up in Arms p.89 | Après avoir touché, vous pouvez dépenser 2 Avantage pour un Test opposé Force contre Athlétisme. Si vous l'emportez, la cible subit l'état À Terre (un cavalier chute d'abord de 2 yards). | Manuel |
| dangereuse | Dangereuse | V5 | Livre de base V5 EN p.305 | Tout Test raté avec un 9 sur le dé des dizaines ou des unités provoque une Maladresse. | Moteur fumble-on-nine |
| defensive | Défensive | V5 | Livre de base V5 EN p.304 | +1 DR aux Tests de Corps à corps pour s'opposer à une attaque. Une seule arme Défensive compte à la fois ; Déséquilibrée l'emporte. | Manuel |
| desequilibree | Déséquilibrée | V5 | Livre de base V5 EN p.305 | -1 DR pour s'opposer à une attaque avec cette arme. | Manuel |
| devastatrice | Dévastatrice | V5 | Livre de base V5 EN p.304 | Sur une touche, les Dégâts utilisent le plus élevé entre le DR et le dé des unités. Inoffensive l'annule. | Moteur best-of-units-or-sl |
| dispersion | Dispersion X | V4 supplément | Up in Arms p.89 | Bout portant : 1 cible, Dégâts +X. Portée courte à longue : la cible plus les X créatures visibles les plus proches, sans deux cibles à plus de X yards l'une de l'autre. Portée extrême : même sélection, Dégâts -X. | Manuel |
| empaleuse | Empaleuse | V5 | Livre de base V5 EN p.304 | Coup critique sur un double ou un multiple de 10 obtenu en réussissant le Test. À distance, le projectile reste fiché : Guérison Intermédiaire (+0 DR) pour une flèche ou un carreau, chirurgien pour une balle ; chaque projectile non retiré empêche de guérir 1 Blessure. | Moteur expanded-critical ; mécanique partielle : projectile fiché et retrait/soins à gérer manuellement |
| enflammee | Enflammée | V4 supplément | The Imperial Zoo p.94 | Pas de règle générale dans les sources : appliquer l'effet décrit dans le profil de l'arme. | Manuel |
| entaille | Entaille X | V4 supplément | Up in Arms p.89 | Si l'attaque inflige des Dégâts critiques, ajoute 1 état Hémorragique au Critique ; vous pouvez dépenser X Avantage pour infliger 1 état Hémorragique supplémentaire. | Manuel |
| epuisante | Épuisante | V4 | Livre de base FR (V4) p.299 | Percutante et Dévastatrice ne s'appliquent que pendant un Round où le porteur a chargé. | Manuel |
| equipage | Équipage X | V4 supplément | Up in Arms p.125 | Nécessite X servants formés au Tir de l'arme ; un seul tire. Manque 1 servant : Rechargement doublé ; manque 2 : l'arme gagne Imprécise ; manque 3 : elle gagne Dangereuse (cumulatif). Défaut déjà présent : -10 au Tir. Les servants peuvent aider au Rechargement ; un incident touche tous les servants. | Manuel |
| explosion | Explosion X | V4 | Livre de base FR (V4) p.298 | Chaque personnage à X mètres ou moins du point touché subit DR + Dégâts de l'arme et les états qu'elle inflige. | Manuel |
| flexible | Flexible | V5 | Livre de base V5 EN p.306 | Peut se porter sous une armure non Flexible ; les deux protections s'appliquent. | Fonction source de calcul des couches ; sans autre moteur |
| immobilisante | Immobilisante | V4 | Livre de base FR (V4) p.298 | Une touche inflige 1 état Empêtré de Force égale à celle du porteur. Tant que dure l'entrave, l'arme ne peut servir à rien d'autre ; le porteur peut y mettre fin à tout moment. | Manuel |
| impenetrable | Impénétrable | V5 | Livre de base V5 EN p.306 | Ignore les Coups critiques causés par un jet pour toucher impair (11, 33…). | Critique ignoré sur jet de toucher impair |
| imprecise | Imprécise | V5 | Livre de base V5 EN p.305 | -1 DR pour attaquer avec cette arme. L'emporte sur Pointue. | Moteur attack-sl-bonus |
| incassable | Incassable | V5 | Livre de base V5 EN p.305 | Ne se casse, ne se corrode et ne s'émousse presque jamais. | Manuel |
| inoffensive | Inoffensive | V5 | Livre de base V5 EN p.305 | Les PA sont doublés contre cette arme ; pas de Blessure minimale automatique ; pour une Blessure critique, lancer deux fois et garder le résultat le plus bas. Annule Percutante et Dévastatrice. | Moteur armour-multiplier ; annulations et doubles jets de gravité couverts |
| laid | Laid | V5 | Livre de base V5 EN p.299 | Attire une attention négative ; les Tests de Sociabilité concernés peuvent subir -1 DR. | Manuel |
| leger | Léger | V5 | Livre de base V5 EN p.298 | Encombrement réduit de 1. | Manuel |
| lente | Lente | V4 | Livre de base FR (V4) p.299 | Frappe toujours en dernier dans le Round ; les adversaires ont +1 DR pour se défendre contre ses attaques. | Manuel |
| magique | Magique | V5 | Livre de base V5 EN p.304 | Peut blesser les créatures immunisées aux attaques non magiques. | Manuel |
| malepierre | Malepierre | V4 supplément | The Imperial Zoo p.94 | Une cible blessée doit faire un Test de Corruption mineure (Moyen +20 pour la Mitrailleuse Ratling ; difficulté non indiquée pour le Jezzail et le Pistolet). | Manuel |
| necessite-une-sous-armure | Nécessite une sous-armure | V4 supplément | Archives of the Empire III p.36 | Ne peut être portée qu'avec une sous-armure (Soft Kit). | Manuel |
| parade | Parade | V5 | Livre de base V5 EN p.304 | En défense, annule la pénalité de -2 DR de la main non directrice. En combat à deux armes, si la première attaque touche, la seconde faite avec l'arme Parade ne peut pas être opposée. | Manuel |
| partielle | Partielle | V5 | Livre de base V5 EN p.306 | Si le numéro de localisation de la touche est pair, les PA de cette armure sont ignorés. | PA de la seule pièce ignorés sur numéro de localisation pair |
| percutante | Percutante | V4 | Livre de base FR (V4) p.298 | Sur une touche, ajoute le dé des unités du jet d'attaque aux Dégâts. Inoffensive l'annule. | Moteur add-units-die |
| perforante | Perforante | V5 | Livre de base V5 EN p.305 | Ignore 2 PA. | Manuel |
| perturbante | Perturbante | V4 | Livre de base FR (V4) p.298 | Au lieu d'infliger des Dégâts, une attaque réussie peut faire reculer la cible d'1 mètre par DR du Test opposé. | Manuel |
| peu-fiable | Peu fiable | V5 | Livre de base V5 EN p.299 | Un Test raté utilisant l'objet subit -1 DR ; les pénalités de port d'armure sont doublées. | Manuel |
| piege-lame | Piège-lame | V5 | Livre de base V5 EN p.305 | Sur un Critique en défense contre une arme à lame, si votre Taille est au moins égale à celle de l'adversaire, vous pouvez piéger la lame au lieu du Critique : l'adversaire la lâche. Avec le Talent Désarmement, perdez votre Momentum pour la saisir de la main libre. Pour la briser : Test de Force Très difficile (-3 DR) + DR du Test de Corps à corps, sauf si elle est Incassable. | Manuel |
| pistolet | Pistolet | V5 | Livre de base V5 EN p.305 | Peut attaquer en mêlée, sans modificateur de portée ; l'attaque peut être opposée comme une attaque de mêlée. | Manuel |
| points-faibles | Points faibles | V5 | Livre de base V5 EN p.306 | Un Critique infligé par une arme Empaleuse ignore les PA de cette armure. | PA de la seule pièce ignorés sur critique Empaleuse |
| pointue | Pointue | V5 | Livre de base V5 EN p.305 | +1 DR à tout Test réussi pour attaquer avec cette arme. Imprécise l'emporte. | Moteur attack-sl-bonus |
| pratique | Pratique | V5 | Livre de base V5 EN p.298 | Un Test raté utilisant l'objet gagne +1 DR ; les pénalités de port d'armure sont réduites d'un niveau (-3 DR → -2 DR). | Manuel |
| precise | Précise | V4 | Livre de base FR (V4) p.298 | +10 à tout Test effectué avec cette arme. | Moteur target-score-bonus |
| protectrice | Protectrice X | V4 | Livre de base FR (V4) p.298 | Quand l'arme sert à s'opposer à une attaque, elle confère X PA à toutes les localisations. Avec X ≥ 2, elle peut aussi s'opposer aux projectiles tirés dans sa ligne de vue. | PA séparés ; bouclier sélectionné, disponible et utilisé pour opposition ; tir : X ≥ 2 + ligne de vue |
| raffine | Raffiné X | V5 | Livre de base V5 EN p.298 | Signe de statut : l'objet est d'autant plus impressionnant que X est élevé. Aucun effet chiffré. | Manuel |
| rapide | Rapide | V5 | Livre de base V5 EN p.304 | +2 en Initiative de combat pour attaquer avec cette arme ; perdu si l'arme sert au combat à deux armes. | Manuel |
| recharge | Recharge X | V4 | Livre de base FR (V4) p.299 | Recharger demande un Test étendu de Projectiles (groupe de l'arme) totalisant X DR ; une interruption remet la progression à zéro. | Manuel |
| renforcee | Renforcée | V4 supplément | Archives of the Empire III p.36 | Une sous-armure renforcée de mailles portée sous des plates leur retire le défaut Points faibles. | Manuel |
| salve | Salve X | V4 supplément | Up in Arms p.123 | Peut tirer jusqu'à X fois sans recharger, chaque tir consomme 1 point. Plusieurs tirs dans le même Tour : -10 cumulatif au Tir après le premier. Chaque Rechargement réussi rend 1 point de Salve. | Manuel |
| siege | Siège | V4 supplément | Archives of the Empire II p.89 | Double les Dégâts contre les structures (murs, tours, portes). | Manuel |
| solide | Solide X | V5 | Livre de base V5 EN p.298 | Absorbe X points de dommages d'objet avant pénalités. Sauvegarde contre la casse instantanée sur 9+ au d10 pour X = 1, seuil réduit de 1 par point supplémentaire (X = 3 : 7+). | Manuel |
| superposable | Superposable | V4 supplément | Archives of the Empire III p.36 | Se porte par-dessus le cuir ou la maille (brigandine, plastron) ; un plastron ainsi porté ne se combine pas avec une sous-armure. | Manuel |
| taille | Taille | V5 | Livre de base V5 EN p.304 | Chaque touche endommage de 1 point la pièce d'armure ou le bouclier frappé, avant d'appliquer les Dégâts. | Manuel |
| visiere | Visière | V4 supplément | Archives of the Empire III p.36 | Ouvrir ou fermer : 1 Action. Fermée : le casque fonctionne selon son profil. Ouverte : il perd ses propriétés de conception, gagne Partielle et donne -10 en Perception. | Manuel |
| volee | Volée X | V4 supplément | Lustria p.89 | Tire X projectiles simultanés, chacun avec son propre jet pour toucher ; Dégâts réduits de 4 en mode Volée. | Manuel |
| volumineux | Volumineux | V5 | Livre de base V5 EN p.299 | +1 Encombrement ; vêtements et armures portés restent à Enc 1. Normalement pas pour les petits objets. | Manuel |

## Aides historiques complémentaires

Les onglets publics du classeur ne contiennent pas de référentiel général des états ni les tables de critiques ou d’incidents magiques locaux. Leur correspondance avec un document du dossier Drive n’a pas été vérifiée. Chaque aide est signalée « source complémentaire et édition à confirmer » dans l’interface ; elle n’est pas attribuée au Sheets. Les moteurs historiques associés conservent leur comportement existant, sous réserve des corrections explicites ci-dessus. Une édition exacte et les exemples métier devront être fournis avant de présenter ces aides comme réconciliées.

| Aide | Fichier | Statut source |
| --- | --- | --- |
| localisation — Localisation des dégâts & Tables Critiques | js/data/rules.js | Aide locale à arbitrer |
| table-head-crit — 💀 Critiques à la Tête | js/data/crits.js | Table locale, référence et édition à confirmer |
| table-arm-crit — 💪 Critiques au Bras | js/data/crits.js | Table locale, référence et édition à confirmer |
| table-body-crit — 👕 Critiques au Corps | js/data/crits.js | Table locale, référence et édition à confirmer |
| table-leg-crit — 🦵 Critiques à la Jambe | js/data/crits.js | Table locale, référence et édition à confirmer |
| sante — Santé, Critiques et Survie | js/data/rules.js | Aide locale à arbitrer |
| magie — La Magie & Lancer un Sort | js/data/rules.js | Aide locale à arbitrer |
| table-magic-minor — ✨ Table Mineure | js/data/magic.js | Table locale, référence et édition à confirmer |
| table-magic-major — 🔥 Table Majeure | js/data/magic.js | Table locale, référence et édition à confirmer |
| psychologie — Psychologie : Peur & Terreur | js/data/rules.js | Aide locale à arbitrer |
| corruption — La Corruption & les Mutations | js/data/rules.js | Aide locale à arbitrer |

| État consultable | Source actuelle | Statut |
| --- | --- | --- |
| Blessé | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| À Terre | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Sonné | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Inconscient | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Aveuglé | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Assourdi | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Exténué | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Hémorragique | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Surpris | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Enchevêtré | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Enflammé | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |
| Brisé | js/data/states.js + moteur historique | Source complémentaire et édition à confirmer |

## Limites de preuve et compléments requis

- Les 206 talents sont consultables ; leur application mécanique nouvelle appartient au lot 2. Dur à cuire conserve l’automatisme dérivé source, sans double application.
- Les sources et surcharges publiées des fiches sont conservées. Le référentiel publié actuel ne contient aucune description locale de talent ; aucun conflit de texte local n’a donc été rencontré.
- Les compétences et alias sont copiés du contrat publié des fiches ; un refresh des feuilles ne remplace pas silencieusement ces identités par une déduction à partir des noms. Leur renouvellement se fait par régénération contrôlée à partir du projet source.
- Les règles particulières des armes signalées par astérisque, les dégâts conditionnels et les effets de mots clés sans moteur restent à arbitrer. Un exemplaire personnalisé prime sur le modèle et sa formule inconnue reste intacte.
- La copie des modèles conserve les corrections textuelles du générateur source. Le catalogue source ne déclare actuellement que Perforante pour le Couteau Bollock alors que sa note cite Empaleuse* et Pointue* : divergence de transformation à corriger dans un lot distinct côté fiches ; l’outil MJ conserve strictement les mots clés effectivement déclarés.
- Le refresh ne change aucun exemplaire, aucun historique de résolution et aucune acquisition. Les versions d’effets actives sont identifiables via le contrat figé ; les références actuelles ont leur propre version fonctionnelle.
- Validation locale : 28 tests dédiés références/équipement ; tests existants de dégâts et résolution ; navigateur réel via Edge (alias, talents, magie consultative, échec réseau honnête, recherche hors ligne et rendu étroit sombre). Recette Firebase/App Check authentifiée des PJ et publication restent distinctes.
