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
