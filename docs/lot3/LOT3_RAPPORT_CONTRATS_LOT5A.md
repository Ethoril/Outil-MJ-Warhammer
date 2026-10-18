# Lot 5A — catalogue Feu, Cieux, Métal et Bêtes

13 octobre 2026 — livraison locale dans codex/lot2-talents-v5, worktree lot2-combat-v5. Aucun commit, push, déploiement ou changement de feuille publique.

**55 identités relues contre Winds of Magic : 17 conformes dans les scénarios, 21 nécessitant des données MJ, 17 rappels. Aucune anomalie ni identité non vérifiée dans ce lot.** Avant : 2 conformes, 2 données MJ, 2 rappels, 8 anomalies et 41 non vérifiées. Les clauses assistées ne sont pas annoncées automatiques. Sources : pp. 74–77, 98–101, 134–137 et 147–149, plus p. 53 pour la boussole ; aucun recours à « source : catalogue ».

| Domaine | Identités | Conformes | Données MJ | Rappels |
| --- | ---: | ---: | ---: | ---: |
| Feu | 13 | 2 | 8 | 3 |
| Cieux | 17 | 7 | 4 | 6 |
| Métal | 17 | 4 | 7 | 6 |
| Bêtes | 8 | 4 | 2 | 2 |
| Total | 55 | 17 | 21 | 17 |

## Corrections et portée réelle

Les 17 conformes sont Corps de Feu, Ignition, Arc de T’Essla, Projection Spirituelle, Lames Azurées, Malédiction du Destin, Lentille du Ciel, Mistral, Tempête de Shemtek, Écaille d’acier, Nœud défait, Blindage de météorite, Réfraction de Habermas, Régiment de Merciw, Passage Rapide, Capuche Vengeresse et Manteau d’Hiver. Leur ligne de [suivi](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) détaille ce qui est exécuté et assisté.

Corrections : paramètres de chaque page, variantes payées de Colérique et Polir, Esquive de Tête Brûlante, seuls Sonné liés à Flamme Captivante, collision déclarée des Quatre Vents, Sonné du lanceur de Shemtek, seuls PA métalliques d’Armure d’étain, plafond de Merciw calculé depuis la base, et deux FM de Kadon sur une autre cible. Kadon exige une Taille Grande/Énorme explicite ; égalité opposée au lanceur initiateur. Choix, dés et faits manquants bloquent.

Inscription propose écrit/acide et rappelle la corrosion différée après dix Rounds sans lavage, sans retirer immédiatement quatre PA. Les bonus de prochain Test, objets, limbes, cages et pétrification incomplètement représentée deviennent des reçus chiffrés. Aucun profil de monture ni BF d’élémentaire inventé. Semaines de sept jours ; mois calendaires déclarés en jours par le MJ.

Progression 9→3 d’Écaille après sauvegarde, BE10 et fin sur Blessure de Toucher doré, vortex pétrifiant de Gehenna, attaques déviées de Capuche, fluide de Habermas, jets futurs et inventaire : explicitement assistés. Mistral exécute les dégâts initiaux ; réorientation, Exposition récurrente et récupération horaire restent MJ. Tempête de Flammes exécute les dégâts ; admission, projection et disparition du terrain à l’aube restent MJ. Un statut conforme ne certifie pas ces clauses automatiques.

[Fiches](LOT3_FICHES_CORRECTION_CONTRATS.md), suivi MD/JSON et [55 reçus](LOT3_PREUVES_CONTRATS_LOT5A.json) réconciliés par tools/build-lot3-contract-evidence.mjs, qui appelle le générateur de preuves catalogue.

## Retours des lots 3 et 4

Les deux retours sont traités : actions MJ, exclusions et destinataires secondaires sans valeur appliquée ne suffisent plus au classement calculable. Protections, Traits numériques et interactions réellement exécutées restent calculables. Les sondes respectent les alliés et distinguent choix du lanceur et faits de scène.

Premier Vent elfique par défaut, second autorisé, étranger refusé ; attribut et nature de Protection affichés avec le même défaut. Chaîne affiche et journalise son arrêt ; B=BE+1 continue. Source produit des pintes. Assertions indépendantes sur les coûts et valeurs signalés, dont les 3 PV de l’Œil, Tests de Tempête, rayon 2 de Sang et plafonds des invocations.

Sang Bouillonnant fait une frappe pour un Round, deux pour durée doublée. Expiration avant débuts de Tour ; Blizzard garde six frappes et Lames ses Tours adverses. Vortex expiré : aucun dernier déplacement. Étapes principal/mini1/2/3, cibles, localisations et Protections distinctes. Mini-vortex possibles dès le lancer après son premier déplacement ≤8. Zandox reste donnée MJ pour le BF ; Visage calculable au mode choisi, FM explicites si réticence.

## Catalogue et décision restante

Catalogue public conservé. Remplacement final par la V5 déjà décidé ; aucun nouvel accord demandé pour ce remplacement.

| Texte à reporter dans la feuille | Correction |
| --- | --- |
| Flamme Captivante | Seulement les Sonné acquis par ce sort retirés à l’attaque. |
| Esprit du Foyer, Goût de Feu | Pinte/quart de gallon exacts ; Enflammé après dégâts, pas tout coup réussi. |
| Destin Illuminé | Fatalité personnelle distincte des malédictions/présages. |
| Cage dorée | Demi-pouce et six pouces exacts ; métrique approximative comme aide. |
| Essais et Erreurs | Relance du prochain Test désigné, pas Test indépendant supplémentaire. |
| Modificateurs, Chaleur | +20→+2 DR, −10→−1 DR, +10→+1 DR ; Exténué et DR final Test+réserve. |

Écarts de paramètres et structuration des variantes/dés détaillés par sort dans les fiches et le JSON. **Décision du MJ du 13 octobre : Écaille d’acier et Robe scintillante sont deux sorts distincts.** Écaille conserve Winds of Magic p. 75 et sa Protection croissante ; Robe conserve V5 p. 253 et ses +2 PA. Leurs identités et profils restent séparés.

## Comptages et validation

| Matrice des 277 | Après lot 4 | Après lot 5A |
| --- | ---: | ---: |
| Calculables | 205 | 143 |
| Données MJ | 47 | 57 |
| Rappels | 25 | 77 |
| Restants à réaliser | 0 | 0 |

Baisse due au classement corrigé des reçus et aux faits exigés, sans suppression de sorts. Options propres : **36 calculées / 34 assistées**. Le rapport précédent annonçait 29/16, sa matrice disait 28/17 : **Chute, option Dextérité**, passée en rappel car sa sonde omettait l’objet tenu. La sonde fournit maintenant déclaration et objet réel ; rapport et matrice alignés.

**201 tests ciblés : 182 catalogue, 6 retours lot 3, 13 retours lot 4. Suite complète : 1 930/1 930.** Trois recettes navigateur exigées vertes ; recettes WoM et elfiques aussi. Nouvelle recette : **72 gestes**, vrais calcul/application, FM Kadon/Visage, Chaîne aperçu/journal, quatre étapes de vortex et Protections, ordinateur/mobile, aucune erreur de page.

Rouges observés : 58/61 à la première passe, puis non-cumul de Merciw, Flamme Attisée, Polir, semaines de Colérique, consentement/Taille de Kadon. Expiration du retour lot 4 et certains garde-fous corrigés avant leurs tests ciblés : pas de rouge isolé observé pour ces clauses. Anciennes attentes contraires au livre corrigées avec leur page, sans suppression de tests.

Deux générations successives des contrats, matrice, preuves, suivi et fiches identiques ; 277 identités conservées. Catalogue et couverture talents inchangés. **220 identités uniques relues/testées sur les lots 1 à 5A ; 57 uniques hors livraison.** Lot 5B : 58 sorts, dont Cendres et Poussière déjà traité au lot 4. Les 277 contrats ne constituent pas une certification clause par clause.
