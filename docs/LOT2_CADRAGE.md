# Lot 2 Talents et durée des états

Le lot 2 couvre le catalogue complet des talents utiles aux résolutions de l’outil MJ, avec priorité aux talents des PJ actuels. Le moteur commun applique exclusivement les règles V5 publiées dans Aides de jeu, y compris Avantage, Désavantage et Élan (Momentum). Le MJ prend en charge la conversion des talents dans le référentiel source. La durée des états fait partie du même chantier. Magie et prières automatisées restent au lot 3, application mobile au lot 4.

Ce document est un cadrage de développement. L’inventaire classe les 206 talents par famille principale et propose neuf contrats représentatifs. Les clauses restantes sont à détailler ; aucun automatisme applicatif n’est activé.

## Sources et état de départ

Le référentiel local examiné contient 206 identités de talents avec IDs bilingues, sources, limites et spécialisations. Cet instantané précède la conversion des descriptions à la source annoncée par le MJ. Le futur catalogue mécanique doit contenir uniquement des descriptions V5 ; une référence bibliographique à un supplément V4 peut rester conservée comme provenance. Le PDF fourni par le MJ, WFRP5_Core_Rulebook_06_10_26.pdf, est la référence V5 lue pour les règles communes : pages 130–131, 163–169 et 184–187. Les contrats définitifs des talents seront établis depuis les descriptions V5 publiées dans Aides de jeu. Le moteur ne traduit pas les anciennes règles et ne déduit pas la mécanique d’un mot isolé ou de l’édition du livre cité.

Le code courant est celui de F:/OutilMJ/worktrees/fiches-pj-referentiels, version 3.12.3. La résolution est déjà pure, possède un aperçu et une application protégée par révision et identifiant. Le moteur doit étendre ces contrats et traiter les talents de l’attaquant comme ceux du défenseur.

Dur à cuire intervient déjà dans woundsMax à l’import : BE supplémentaire par acquisition historique. Le résumé V5 prévoit un ajout supplémentaire unique. Il faut réconcilier limite d’achat et acquisitions historiques, puis tracer ce bonus sans l’ajouter deux fois.

Décision du MJ : les talents donnant un bonus à une caractéristique déjà intégré à la caractéristique de base de la fiche sont exclus du lot 2. Les totaux source font autorité ; le moteur ne recalcule pas ce bonus et ne demande pas de choix de provenance. Dix talents du premier inventaire sont classés hors périmètre pour cette raison.

La fixture de Caelel contient dix talents : Dur à cuire, Lire/Écrire, Nomade, Sens aiguisé (vue), Vision nocturne, Tireur de précision, Frappe assommante, Discret, Tir précis et Grimpeur. C’est un exemple de recette, pas un inventaire actuel des cinq PJ. Le moteur de priorité doit lire leurs snapshots importés, puis afficher les effets couverts et manquants.

## Règles V5 communes vérifiées

| Sujet | Contrat métier et source |
| --- | --- |
| Difficultés | Modificateurs appliqués aux DR ; ils peuvent changer réussite ou échec. Distinguer +0 et −0 à partir du jet comparé au score, p. 130–131 |
| Avantage | Inversion facultative des chiffres si elle améliore le résultat ; 71 peut devenir 17, p. 130 |
| Désavantage | Inversion obligatoire si elle dégrade le résultat ; 19 devient 91, p. 130 |
| Sources multiples | Convention précisée par le MJ : annulation 1 pour 1. Après annulation, le premier Avantage/Désavantage règle l’inversion ; chaque source restante au-delà de la première ajoute +1/−1 DR |
| Résultats limites | 01–05 réussissent automatiquement et 96–100 échouent automatiquement ; conserver le résultat marginal requis, p. 130 |
| Opposition | Le plus haut DR gagne, même avec un test individuel raté ; égalité en faveur de l’initiateur, p. 131 |
| Localisation | Inversion du jet final, après Avantage/Désavantage, p. 164 |
| Élan (Momentum) | État binaire ; gain en remportant une opposition de Corps à corps en attaque ou défense, et en Chargeant un ennemi. Élan donne Avantage aux Tests de Corps à corps ; précision du MJ et p. 163, 168 |
| Perte d’Élan | Échec en Corps à corps, y compris opposition perdue avec DR positifs ; perte d’au moins une Blessure ; acquisition d’un État ; fin ou pause de combat. La règle du MJ porte sur les Blessures effectivement perdues, pas les dégâts avant protection |
| Attaques supplémentaires | Une seule dépense de Momentum pour une attaque supplémentaire par Tour, même après regagner Momentum, p. 168. Les limites propres à chaque talent se cumulent avec ce contrat |
| Cumuls d’états | Instances d’un même état : pénalités cumulées. États différents : retenir la pénalité la plus élevée applicable, p. 184 |

Le noyau actuel modifie surtout le seuil et cumule des malus de noms d’états. L’adoption V5 exige donc une réconciliation des jets et des pénalités, avant d’y raccorder les talents. Les nouvelles résolutions utilisent un seul système V5. Les comptes rendus historiques conservent leurs valeurs et leur source ; la reprise d’anciennes actions doit faire l’objet d’une migration explicite vers le contrat V5 actif, sans exécuter un second système de règles.

Le livre décrit aussi des critiques défensifs, des critiques indépendants du gagnant de l’opposition et des Blessures courantes bornées à zéro, p. 164–165. Ces divergences avec le comportement historique doivent apparaître dans la matrice de compatibilité : activer quelques talents V5 ne vaut pas conformité complète de tout le combat à la V5.

## Architecture extensible

| Composant | Responsabilité |
| --- | --- |
| Registre de contrats | IDs de talents, clauses, source, version de règle et exemples validés |
| Contexte commun | Acteur, défenseur, compétence, spécialité, équipement, scène, jet et choix |
| Évaluateur pur | Évaluer conditions et rangs ; produire modifications, questions et opérations proposées |
| Opérations communes | Bonus de DR, Avantage, inversion, qualité, protection, état, ressource, réaction et échéance |
| Effets actifs | Origine, cible, cumul, durée et usages consommés |
| Application de partie | Valider la révision, appliquer une seule fois, journaliser et permettre l’annulation |

Le calcul central ne contient pas une branche par nom de talent. Un talent est un assemblage de clauses déclaratives. Chaque clause indique événement, rôle du porteur, conditions, données nécessaires, rang ou spécialité, opération, cible, priorité, cumul, choix, coût, quota et échéance. Le texte descriptif n’est jamais exécuté ni interprété automatiquement comme une formule.

Les conditions ont trois résultats : applicable, non applicable, donnée manquante. Une main, une visée, un terrain ou un rang inconnus ne deviennent pas une valeur zéro ou un refus silencieux. L’interface demande seulement les éléments pertinents et distingue choix du joueur et arbitrage du MJ.

Une version de règle mécanique est indépendante du catalogue descriptif. L’historique conserve source, version, contexte, jet initial, jet final, choix et modifications. Un refresh du catalogue ne réécrit pas les résolutions passées.

## Familles de talents à couvrir

| Famille | Exemples et dépendances |
| --- | --- |
| Autres valeurs dérivées | Dur à cuire, Véloce, tailles et capacités dérivées ; contrats distincts des bonus de caractéristiques déjà intégrés à la fiche |
| Jets conditionnels | Nomade, Grimpeur, Savant, Attirant ; compétence, spécialité, contexte, Avantage et choix |
| Dégâts | Tir précis, Coup puissant, Charge berserk ; distance ou mêlée, visée, charge et Avantage effectivement utilisé |
| Qualités et protections | Frappe assommante, Artilleur, Arts martiaux, Tir sûr ; groupe d’arme, qualités et pièces |
| États | Endurci, Mâchoires d’acier, Persévérant, Cœur vaillant, Inlassable ; acquisition, quota et pénalité |
| Actions et réactions | Riposte, Assaut féroce, Frappe réactive, Désarmer ; événement déclencheur, cible, résultat, coût et fréquence |
| Effets temporaires | Battement, Distraire, Fortification liquide ; auteur, cible, cumul et échéance |

Le fichier LOT2_INVENTAIRE_TALENTS.json conserve toutes les identités, une empreinte de chaque effet source et une famille provisoire. Les talents mixtes pourront comporter plusieurs familles par clause. La famille principale sert au tri : un talent mixte peut aussi contenir une clause mécanique dans une autre famille. Les effets narratifs alimentent des rappels contextuels, les effets de progression restent du ressort des fiches, les effets de lancement magique attendent le lot 3.

## Contrats représentatifs

Tir précis est une clause de dégâts avant protections : tir réussi, +1 Dégât ; +2 avec visée, remplaçant +1. Pour des dégâts initiaux de 8, l’aperçu donne 9 ou 10. Une attaque de mêlée ne déclenche rien. La donnée de visée manquante doit être demandée.

Endurci transforme un événement d’acquisition d’Hémorragique : 3 instances proposées deviennent 2. Il réduit l’acquisition, pas les états déjà présents. La perte d’Élan est évaluée sur les instances effectivement acquises après cette transformation.

Mâchoires d’acier applique une transformation similaire au premier événement Sonné de la rencontre, avec un usage consommé. Une annulation restaure aussi le quota ; une reprise cloud ne recommence pas le premier usage.

Inlassable ne retire pas Exténué : il modifie le niveau utilisé pour ses pénalités. L’exemple du catalogue, rang 2 et quatre instances, laisse une instance pénalisante. Le contrat de pénalité final sera établi depuis la description V5 actualisée dans Aides de jeu. Le moteur applique le nombre d’instances à ignorer ; il n’adapte pas la description V4 de l’ancien instantané.

Battement crée un effet sur la cible jusqu’à la fin du prochain Tour de l’auteur après un choix de renoncer aux dégâts. Le contrat fournit restriction de défense et Avantage aux attaques de mêlée contre elle. Il dépend de la taille, de l’identité de l’auteur et d’une échéance liée à son Tour.

## Ordre de résolution

1. Construire les valeurs effectives et le contexte des deux participants.
2. Identifier restrictions, choix avant jet et coûts proposés.
3. Fixer les sources d’Avantage/Désavantage et les modificateurs de DR.
4. Résoudre les jets, leurs éventuelles inversions, réussite, critiques et modifications après jet.
5. Résoudre l’opposition et conserver séparément résultat individuel et résultat opposé.
6. Déterminer localisation, qualités, protection, dégâts et effets selon chaque phase de contrat.
7. Proposer réactions, acquisitions d’états, Momentum, quotas et effets temporaires.
8. Présenter les explications et appliquer une seule commande validée.

Une réaction propose une action distincte liée à son événement d’origine. Elle ne lance pas automatiquement une chaîne d’attaques. Les quotas de Tour et Round ainsi que les liens d’événements empêchent les boucles et doubles déclenchements.

## Durée et récupération des états

Le niveau, la durée et la méthode de récupération sont trois données distinctes. Un état n’a pas nécessairement un compteur de Tours. Sa cause peut modifier sa récupération normale, p. 184.

| État ou effet | Suivi V5 requis |
| --- | --- |
| Aveuglé | Normalement retirer une instance à la fin du Tour du porteur ; blessures ou poison peuvent prolonger, p. 185 |
| Surpris | Retirer à la fin du Round ou après la première tentative d’attaque ; non cumulable, p. 187 |
| Sonné | Test de Résistance à la fin du Round ; retrait selon réussite et DR, puis éventuel Exténué, p. 186 |
| Assourdi | Test de Résistance chaque minute, soit six Rounds ; pas un retrait automatique par Tour, p. 186 |
| Exténué | Récupération selon cause : souffle, nuit de repos ou fin de circonstance, p. 186 |
| Enflammé | Dégâts en fin de Round ; bonus de niveaux après le premier ; extinction par test, p. 185 |
| Hémorragique | Blessures en fin de Round puis contrôles spécifiques à zéro et inconscience, p. 185 |
| Empoisonné | Pénalité, perte de Blessures, tests et récupération en fin de Round, p. 186 |
| À terre et Inconscient | Non cumulables, fin liée à une action ou à la disparition de la cause, p. 186–187 |
| Battement ou Distraire | Échéance au prochain Tour de l’auteur, différente de celle de la cible |

La liste historique locale inclut Blessé comme aide ; il faut distinguer cette aide d’une Condition V5. Le registre commun doit aussi examiner Besmirched et Poisoned, absents de la liste locale.

Chaque occurrence conserve origine et échéance. L’affichage peut totaliser les niveaux sans fusionner des échéances différentes. Le cumul de bonus est déclaré par clause : addition, meilleur bonus, remplacement, prolongation ou occurrences indépendantes. Un rang ne multiplie rien par défaut.

L’horloge de combat identifie rencontre, Round, acteur et occurrence de Tour. Un événement stable est traité une seule fois. Une fermeture de l’application ne fait pas passer le temps de fiction ; une scène suspendue ne continue pas ses compteurs. Les durées historiques numériques gardent leur convention de fin de Tour du porteur jusqu’à migration explicite.

## Extension et cohérence des données

Pour ajouter un talent courant : résoudre son ID, déclarer ses clauses avec les opérations existantes, fixer contexte et cumul, fournir des exemples et activer le contrat validé. L’interface génère les choix et explications depuis ce contrat. Un mécanisme réellement nouveau, par exemple une aura ou une attaque multiple, nécessite une nouvelle opération commune et ses tests.

Les acquisitions des fiches restent source d’autorité. Les effets de partie, échéances et usages sont conservés pendant une synchronisation PJ. Un changement du texte d’Aides de jeu ne suffit pas à activer une règle : son empreinte doit correspondre au contrat validé. Le changement reste consultable et nécessite un nouveau contrat explicite. La disparition d’un talent demande une politique explicite pour ses effets actifs. Une modification de maximum conserve les Blessures subies selon le contrat existant, avec réconciliation explicite du modèle de santé V5.

## Source V5 et contrats mécaniques

Le MJ convertit les talents dans Aides de jeu. Le moteur attend leurs effets V5 définitifs et conserve leurs identifiants, rangs, spécialités et provenance. Il ne comporte aucun convertisseur V4 et aucun compteur d’Avantage de combat V4. La bibliographie peut citer V4 tandis que la description publiée est adaptée à la V5 : c’est le contrat de l’effet publié qui identifie sa mécanique.

Le statut du catalogue doit distinguer : description disponible ; description V5 contractualisée ; contexte incomplet ; choix requis ; clause appliquée ; clause écartée. Un talent mixte possède plusieurs clauses indépendantes ; sa couverture ne se réduit pas à un booléen « automatisé ».

## Modéliser choix coûts et limites

| Opération commune | Contrat nécessaire | Exemple de fonction d’un talent |
| --- | --- | --- |
| Accorder ou perdre Élan | Événement, porteur et motif | Gain, dépense ou perte d’Élan |
| Empêcher une perte d’Élan | Événement et motif précis auquel l’exception s’applique | Conservation d’Élan conditionnelle |
| Transférer Élan | Donneur, bénéficiaire admissible, coût et application atomique | Don d’Élan à un allié |
| Accorder une attaque | Déclencheur, arme, cible, choix, coût, échéance de l’occasion et quota | Attaque supplémentaire ou réaction |
| Modifier un coût | Action et coût précis concernés | Attaque secondaire sans coût d’Élan |
| Remplacer un résultat | Résultat abandonné et résultat choisi | Renoncer aux dégâts pour une manœuvre |

Une exemption de coût et une limite d’usage sont indépendantes. « Cette attaque ne coûte pas d’Élan » ne signifie pas qu’elle devient répétable à volonté. Inversement, la limite générale d’une dépense d’Élan pour une attaque supplémentaire par Tour ne devient pas une limite universelle de toutes les attaques gratuites. Le contrat de chaque action indique les limites applicables et leur provenance.

L’occasion d’utiliser un talent est distincte de son activation. L’aperçu peut proposer une réaction après une touche sans consommer de ressource. Le choix validé consomme simultanément Élan, quota et effet ; une annulation les restaure ensemble. Décliner l’occasion ne consomme pas le talent.

Une conservation d’Élan doit préciser quels motifs de perte elle neutralise. Le moteur conserve les motifs séparément jusqu’à l’application : opposition, Blessures, acquisition d’État ou fin de combat. La définition V5 du talent fixe la portée de son exception ; le moteur ne transforme pas cette exception en immunité générale.

Pour une transmission, le donneur doit avoir Élan et la cible doit remplir les conditions du talent. Comme Élan est binaire, un bénéficiaire le possédant déjà n’en accumule pas un second. Le choix et le détail de la transaction restent dans l’aperçu.

## Recette de cumul précisée par le MJ

On calcule le solde après annulation : nombre d’Avantages moins nombre de Désavantages. Un solde positif donne inversion favorable facultative et +(solde−1) DR. Un solde négatif donne inversion défavorable obligatoire et −(|solde|−1) DR. Un solde nul ne donne ni inversion ni DR de cette mécanique. Un double demeure identique ; les DR issus des sources supplémentaires restent applicables.

| Sources | Résultat attendu |
| --- | --- |
| 3 Avantages, 1 Désavantage | 2 Avantages restants : inversion favorable facultative et +1 DR |
| 1 Avantage, 3 Désavantages | 2 Désavantages restants : inversion défavorable obligatoire et −1 DR |
| 2 Avantages, 2 Désavantages | Aucun effet de cette mécanique |
| 3 Avantages, jet 44 | Jet 44 conservé, +2 DR |
| Charge puis jet | Gain d’Élan au déclencheur de Charge ; son effet est disponible pour le jet concerné |
| Attaque ou défense gagnant l’opposition | Gain d’Élan ; distinguer résultat individuel et victoire opposée |
| Dégâts entièrement absorbés sans Blessure perdue | Pas de perte d’Élan au motif « Blessure perdue » |
| Acquisition totalement empêchée d’un État | Pas de perte d’Élan au motif « État acquis » |

Ces lignes ont été reprises dans les tests du noyau V5. Le raccordement à la résolution applicative, aux états et au Store reste à réaliser ; les tests de ces fonctions pures ne constituent pas une recette du combat complet.

## Interface de décision en combat

L’interface privilégie les conséquences de l’action. Elle montre par défaut la réussite ou la touche, la localisation, les Blessures effectivement infligées, les effets importants et le coût des choix. Les calculs, règles appliquées et sources sont accessibles dans un détail replié. Le journal conserve une entrée compacte par action avec accès au compte rendu complet.

Pour un Avantage facultatif, présenter côte à côte « Conserver 42 » et « Inverser en 24 », avec leurs DR, localisation et Blessures après les protections. La recommandation annonce son critère, par exemple « Plus de Blessures » ; elle ne décide pas à la place du joueur. Un meilleur jet peut toucher une zone mieux protégée et faire moins de dégâts.

Exemple fictif sans opposition : tir 70, jet 42, arme 6, BE de la cible 3. Conserver 42 donne +3 DR, bras gauche à 1 PA, donc 5 Blessures. Inverser en 24 donne +5 DR, bras droit à 5 PA, donc 3 Blessures. L’option conservant le jet est signalée pour ses Blessures supérieures ; l’autre pour ses DR supérieurs. Tous les chiffres détaillés restent repliés.

Les deux options passent par le même calcul pur que l’action finalement appliquée. Aucun second calcul de dégâts propre à l’interface. La comparaison ne relance pas de dés et ne révèle pas de résultats aléatoires non encore tirés. Si une protection, une défense ou un résultat nécessaire manque, l’option affiche son incertitude et aucune recommandation définitive sur les Blessures n’est produite.

Les décisions sont proposées au moment prévu par la règle : avant le jet ou après son résultat. Le panneau regroupe les choix liés à une même action, indique les coûts et limites avant confirmation, et ne repose pas sur une succession de fenêtres. Une confirmation porte sur le résultat retenu et le plan complet ; modifier un choix invalide puis recalcule l’aperçu.

Les choix de talents utilisent des cartes de conséquences générées depuis le contrat : conserver les dégâts ou désarmer, garder Élan ou déclencher une attaque, bénéficier d’un déplacement ou rester engagé. Les seuls champs visibles sont ceux nécessaires à la décision courante. Les raisons d’indisponibilité restent courtes et explicites.

La recette UI doit couvrir un meilleur DR donnant moins de Blessures, deux résultats équivalents, un double inchangé, des données incomplètes, une inversion obligatoire, plusieurs choix liés, navigation au clavier, mobile étroit et ouverture du détail de calcul. Les cases obligatoires, coûts et limitations ne peuvent pas être cachés dans le détail replié.

## Démarrage avant actualisation des talents

Le chantier est autorisé par le MJ le 8 octobre 2026. La conversion à la source ne bloque pas le noyau V5, les durées, la persistance ni l’interface de décision. Les talents déjà décrits en V5 servent aux premiers contrats. Un talent en attente de conversion n’est activé qu’après publication de sa description V5 et validation de son contrat.

Le premier développement se déroule dans un worktree isolé, branche codex/lot2-talents-v5, depuis 28657e39477bbcbfeb0de826b3f1d05e525bb386. Le premier incrément comprend des fonctions pures de jets, Élan, comparaison d’options et évaluation de clauses déclaratives, avant raccordement à l’application. La maquette de décision est un exemple interactif, indépendant des données de séance.

## Recette et séquence de développement

La recette couvre personnages sans talents, rangs et spécialités, attaque et défense, choix absents, sources multiples, critiques, 01/05/96/00, quotas, annulation, échéances de l’auteur, fin de Round, récupération, exports et reprise cloud. Le rejeu d’un même événement ne consomme ni usage ni durée une seconde fois. Les résolutions historiques gardent leur règle.

Le développement suit six étapes : contrats et priorités PJ ; noyau V5 et opérations communes ; événements, états et durées ; catalogue utile ; interface et persistance ; recette métier et navigateur. La matrice finale distingue effets automatiques, effets assistés avec choix et rappels manuels.

Le cadrage est finalisé et le premier incrément est développé dans le worktree isolé. Les 468 tests Node passent, dont 62 nouveaux ; la maquette de choix a été vérifiée dans Edge sur bureau et écran étroit. Le registre d’inventaire reste un document de travail, distinct du schéma exécutable de contrats. La contractualisation détaillée des talents, l’inventaire live des PJ, les durées et le raccordement applicatif restent à réaliser. Les nouveaux modules sont déclarés dans le cache hors ligne, mais ne sont pas encore utilisés par le combat. Aucune donnée Firebase et aucun déploiement n’ont été modifiés. Voir LOT2_DEMARRAGE.md pour le périmètre précis de cet incrément.

## Répartition du premier inventaire

| Famille principale | Talents |
| --- | ---: |
| jets et contextes | 63 |
| hors perimetre bonus caracteristique fiche | 10 |
| aides contextuelles | 19 |
| progression ou hors resolution | 14 |
| degats et qualites | 17 |
| actions reactions et effets actifs | 40 |
| lot3 magie et prieres | 25 |
| valeurs permanentes | 6 |
| etats et recuperation | 12 |

Neuf contrats sont proposés dans le JSON : Tir précis, Coup puissant, Charge berserk, Artilleur, Endurci, Mâchoires d’acier, Inlassable, Nomade et Battement. Ils explicitent conditions, opération, cumul et exemples ; Mâchoires d’acier ajoute un quota, Battement une échéance liée à l’auteur. Ils restent des propositions de données, sans évaluateur implémenté à ce stade.
