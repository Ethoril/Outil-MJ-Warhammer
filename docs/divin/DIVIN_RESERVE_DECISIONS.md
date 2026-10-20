# Réserve de décisions — à confirmer ou amender par le MJ

18 octobre 2026 (nuit). Décisions prises par l'agent pendant que le MJ dormait, avec autorisation de poursuivre les chantiers. Chacune est appliquée en local (non publiée) et sera présentée en sélecteur : confirmer ou amender. Aucune publication n'a été faite depuis la 3.16.1.

## Invocations divines (P4c)

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R1 | Fin manuelle de la prière pendant le Tour de la créature : la créature, si elle est l'acteur courant, finit son Tour puis est retirée à la commande suivante (même règle que l'expiration). Sinon retrait immédiat. | Retrait immédiat avec passage de main au successeur de l'ordre effectif. | Le retrait immédiat dépend de `removeFromCombat`, partagé et non modifiable ; il rejouait un Tour dans deux cas reproduits par le contrôleur indépendant. |
| R2 | `restartCombat` sans scène conserve la créature divine et la couche du prêtre (comportement existant des participants et couches). | Vider les invocations divines au « Recommencer ». | Cohérent avec les autres couches divines ; changer exigerait une exception dans `store.js`. |
| R3 | Un prêtre à 0 Blessure ou mis au banc garde ses créatures ; seul son retrait du combat les balaie. | Les retirer dès 0 Blessure. | Le MJ gère la mort ; aucune règle source ne fixe le sort des invocations. |
| R4 | Le défaut de Tour des invocations MAGIQUES (une invocation prochain acteur qui expire fait rejouer le lanceur et sauter un combattant) n'est PAS corrigé ; il est documenté. | Le corriger dans `removeExpiredSummons` (fichier partagé). | Hors périmètre, fichier à haut risque ; à décider à part. |
| R5 | Deux créatures de même profil sont numérotées (« Loup 1 », « Loup 2 »). Position saisie limitée à 200 caractères. | Laisser les noms identiques. | Lisibilité à la table ; protection de l'historique. |
| R6 | Pour Hurlement du loup et Roi de la Nature, le MJ doit cocher le prêtre comme cible et confirmer « à portée » (exigence du moteur pour les portées chiffrées). | Lever cette exigence dans le moteur (correctif séparé). | Inutile mais sans risque ; corriger touche la validation des cibles. |

## Up in Arms (contrôle indépendant)

Un lecteur distinct a relu la page 79 : les 9 contrats sont conformes aux valeurs (aucun écart de portée, cible, durée, valeur ni page). Notes retenues :

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R7 | Décision 1 (Commander la Légion = +1 DR) consignée dans DIVIN_DECISIONS_MJ.md, qui l'avait omise (tableau malformé corrigé). | — | Traçabilité : la réponse du MJ était appliquée mais non écrite. |
| R8 | Le Talent « Fearless » reste nommé « Intrépide (Ennemi) » dans les contrats de miracle (cohérent avec Miracles.csv et Sigmar), alors que le catalogue des Talents écrit « Sans peur [Ennemi] ». | Aligner sur « Sans peur ». | Le nom des miracles suit la feuille Miracles ; à harmoniser seulement si vous reportez le nom dans la feuille. |
| R9 | La clause « ni de l'Intimidation » de Sans peur reste une inférence signalée (le texte V5 dit « immune to fear » ; l'Intimidation est citée par Haine p.184). | Retirer la mention. | Lecture raisonnable mais non littérale ; reste en rappel MJ, sans effet automatique. |
| R10 | Vindicte Vengeresse : la clause « s'il est déjà Engagé il ne peut pas charger » est trop restrictive (V5 p.163 permet de se désengager puis de charger) ; à reformuler. | Garder telle quelle. | Fidélité à V5 p.163. |

## Lot de finition (Dévotion de la Guerrière, Yeux de chat, Vindicte)

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R11 | Dévotion de la Guerrière passe « assisté » : l'ennemi visé est saisi par le MJ au lancement en texte libre (1 à 60 caractères, refusé au-delà), le talent Intrépide est posé avec cette spécialisation sur les Myrmidiens à portée désignés par le MJ (sans plafond). | Liste fermée d'ennemis ; chaque bénéficiaire choisit le sien (écarté par vous, Q9). | Texte libre : le livre dit « individu ou espèce » sans liste. |
| R12 | Yeux de chat passe « assisté » : capteur « Chat » hors de l'ordre d'initiative, trait Invulnérable seulement (le livre ne donne ni profil chiffré ni « intangible » pour le chat). Le prêtre perçoit par les sens du chat : rappel MJ. | Rester en rappel. | Même mécanique que l'Œil de l'aigle, sans risque supplémentaire. |
| R13 | Vindicte Vengeresse : la clause de charge est reformulée d'après V5 p.163 (un prêtre Engagé peut se Désengager puis charger). | Ancienne clause (inexacte). | Fidélité à la règle V5. |

## Qualité de la recette

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R14 | Le parcours navigateur `divin-v5-e5-browser-independent.mjs` lisait l'état juste après le clic sur Annuler/Rétablir, sans attendre : il échouait sous charge machine, y compris sur la version publiée 3.16.1 (test seul en cause, pas le code). Des attentes explicites ont été ajoutées (test uniquement). | Laisser la course. | Un test instable masque les vraies régressions. |

## Constats de la relecture finale (3.17.0)

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R15 | Ordre périmé en mode automatique : une créature divine invoquée en cours de Round est ajoutée à la fin de l'ordre stocké et joue en fin de Round (moteur V5), à son rang d'initiative avec le chemin legacy. Identique à un participant ajouté à la main (vérifié sur la version publiée) : documenté, non corrigé. | Réordonner à l'invocation (touche aux moteurs de Tour partagés). | Ce n'est pas une régression ; le corriger changerait aussi l'ajout manuel de participants. |
| R16 | Titre du README corrigé (« v3.13.0 » périmé depuis la 3.13). | — | Cohérence. |

## Correctifs P4d (cible implicite, Tour des invocations magiques)

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R17 | Cible implicite du prêtre pour les invocations (Hurlement du loup, Roi de la Nature, Œil de l'aigle, Yeux de chat), portée par un drapeau `implicitTarget` du gestionnaire d'effet (pas par `appliesTo` seul ni par un nom). Commander la Légion, Trickle Down, Hoarfrost's Chill et les autres contrats « du prêtre » ne changent pas. Les cases « Destinataires » restent affichées, facultatives et annotées. | Règle sur `appliesTo` seul (aurait changé d'autres miracles) ; masquer les cases. | Zéro changement pour les autres contrats (vérifié par tests écrits avant le correctif). |
| R18 | Défaut de Tour des invocations magiques corrigé par report du retrait : une invocation magique orpheline qui est l'acteur courant (sans être le premier de l'ordre) reste jusqu'à la commande suivante. Elle garde donc un Tour « à vide » que le MJ termine. Si elle est le premier de l'ordre, l'ancien comportement (correct) est conservé. | Réassigner au successeur de l'ordre effectif (sauterait son traitement de début de Tour et toucherait les moteurs de Tour partagés). | Même principe que les créatures divines ; fuzz 12 000 pas sans violation. Un seul test de caractérisation modifié (celui qui épinglait le défaut). |
| R19 | Résiduel non corrigé : la fin ANTICIPÉE d'un sort d'invocation déclarée pendant le Tour de l'invocation fait encore rejouer le lanceur (retrait immédiat vers le premier de l'ordre), comportement épinglé par le test C9 de la caractérisation. | Reporter aussi ce retrait (modifier le test C9). | Hors du défaut demandé ; à décider. |

## Constats du contrôle indépendant des correctifs P4d (3.17.1)

Verdict du contrôleur : publiable, sous condition de bump de version (fait). Résiduels documentés, non corrigés :

| # | Constat | Décision prise | Alternative |
| --- | --- | --- | --- |
| R20 | Toute interaction de sort appliquée (pas seulement la fin anticipée) pendant le Tour d'une invocation magique orpheline retire l'invocation et fait rejouer le premier de l'ordre (retrait immédiat de `previewSpellInteraction`). Comportement identique à celui d'avant, non aggravé. | Documenté, non corrigé (épinglé par le test C9). | Reporter aussi ce retrait (retirer `{deferCurrent:false}` et modifier C9). |
| R21 | Deux gestes manuels sur une invocation orpheline courante sortent de la règle : la déplacer avant le lanceur dans l'ordre (retrait immédiat), ou la mettre au banc (le Tour suivant tombe sur le premier de l'ordre). Comportement générique de tout acteur courant. | Documenté. | — |
| R22 | Des cibles superflues passées à Hurlement du loup / Roi de la Nature donnent le même état qu'aucune cible, sauf `divineEffects: []` sur la cible superflue (sans couche). Œil de l'aigle et Yeux de chat refusent toujours une autre cible que le prêtre. | Documenté. | Refuser les cibles superflues. |
| R23 | Le libellé « aucune case à cocher » s'affiche au-dessus de cases « Destinataires » facultatives restées visibles (cosmétique). | Documenté. | Masquer les cases (casserait le parcours navigateur existant). |

## Bénédiction de Souffle (19 octobre, soir)

| # | Décision prise | Alternative | Pourquoi |
| --- | --- | --- | --- |
| R24 | Souffle automatisé pour Manann ET Morr (même effet de bibliothèque) : drapeau `doesNotBreathe`, l'étouffement d'un vortex ne retire plus de Blessures pendant la durée ; la couche d'étouffement reste posée, inerte, et reprend à l'expiration si la cible est encore dans le nuage. Noyade, fumée, gaz : rappel MJ. | Retirer la couche d'étouffement à la bénédiction. | Fidèle au texte (« n'a pas besoin de respirer », pour la durée) ; aucun autre lecteur d'étouffement dans le moteur. |
| R25 | Défaut préexistant trouvé, CORRIGÉ le 20/10 (GLM, tâche T12) : la mort par asphyxie (E/10 Rounds à 0 Blessure dans un vortex à étouffement) est inatteignable, `roundSpellEffects` saute les cibles à 0 Blessure avant le compteur `suffocationZeroRounds` (v5-magic-turn.js). | Le corriger (moteur des sorts au Tour, partagé). | Hors périmètre ; à décider. |
