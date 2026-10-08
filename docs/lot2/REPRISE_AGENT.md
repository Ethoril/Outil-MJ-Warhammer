# Consigne de reprise pour l’agent

À copier dans la nouvelle conversation après ouverture du dépôt :

> Reprends le lot 2 de l’Outil MJ Warhammer depuis la branche `codex/lot2-talents-v5`. Lis `docs/lot2/README.md`, `LOT2_ETAPES.md`, `LOT2_CADRAGE.md`, `LOT2_DEMARRAGE.md` et `LOT2_CONTRATS_MOTEUR.md`. Le cadrage et le début du chantier sont autorisés. Le socle initial est `7477421e937d73ba4d3cf81b1c8582c0c8315544`, base `28657e39477bbcbfeb0de826b3f1d05e525bb386`, version 3.12.3. Les fonctions nouvelles sont testées mais ne sont pas raccordées au combat. La prochaine étape est 2.1 : résolution V5 réelle et interface de comparaison. La maquette `maquette-choix-avantage.html` est approuvée. Continue dans un checkout isolé, préserve les autres lots et ne déploie aucune fonctionnalité inachevée.

## Décisions du MJ

- Catalogue utile complet, PJ actuels prioritaires. Lire les snapshots réels : la fixture Caelel ne prouve pas les talents des cinq PJ actuels.
- Système jouable unique V5 ; aucun compteur d’Avantage V4 ni convertisseur automatique. Le MJ convertit les descriptions dans Aides de jeu ailleurs. Une bibliographie V4 peut rester ; la description mécanique doit être V5 et son contrat validé.
- Dix talents de bonus de caractéristiques déjà compris dans les fiches sont exclus. Les autres valeurs dérivées ne sont pas exclues par défaut ; ne pas ajouter deux fois Dur à cuire à l’import.
- Annulation Avantage/Désavantage **1 pour 1**. Solde : inversion, puis +1/−1 DR par source supplémentaire au-delà de la première. Doubles inchangés, DR supplémentaires conservés.
- Élan binaire : gain sur victoire opposée en mêlée ou Charge ; Avantage en Corps à corps. Perte sur échec/opposition perdue, Blessures effectivement perdues, État effectivement acquis, pause ou fin de combat.
- Une seule dépense d’Élan pour une attaque supplémentaire par Tour. Exemption de coût distincte du quota du talent. Conservation d’Élan limitée aux motifs déclarés.
- Choix laissés au joueur. Comparer touche, DR, localisation, Blessures, effets et coût. Recommandation avec critère explicite ; aucune recommandation définitive sur données inconnues.
- Calculs repliés, détail accessible, journal compact. Même résolveur pur pour les deux options et l’action finale, sans nouveau tirage lors de la comparaison.
- Résultat, coût, quota et échéance dans une seule commande, avec révision, prévention des doubles applications et annulation complète.
- Magie/prières automatisées au lot 3 ; application mobile au lot 4. Le panneau reste lisible sur écran étroit.

## État réel

Quatre modules `js/core/` : `v5-roll.js`, `v5-momentum.js`, `v5-decision.js`, `talent-contracts.js`. Deux fichiers de tests lot2, 62 tests nouveaux ; suite complète 468 réussis lors du premier incrément. Modules déclarés au cache, sans raccordement au combat.

Schéma déclaratif 1 : sept opérations. Coûts, quotas, choix et échéances sont encore rejetés explicitement. L’inventaire de 206 identités et neuf exemples n’est pas un registre activé. Les tests utilisent des contrats synthétiques.

## Reprise

Vérifier branche, état Git et instructions locales ; installer les dépendances et rejouer les tests. Conserver le travail des autres lots. Lire le PDF personnel après transfert. Les divergences de critiques défensifs, critiques indépendants du gagnant et borne de santé sont à réconcilier : le socle ne certifie pas tout le combat V5.

L’historique garde ses calculs et leur version. Les nouvelles actions utilisent un seul système. Toute migration doit être explicite, testée, avec sauvegarde et reprise. Ne pas activer un talent depuis une description ancienne en attente de conversion.
