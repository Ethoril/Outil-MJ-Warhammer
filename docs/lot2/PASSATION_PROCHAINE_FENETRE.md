# Passation vers un nouveau chat

> État courant du 10 octobre : application locale **3.14.0**, magie finalisée et [recette 3.5](../lot3/LOT3_RECETTE_3_5.md). Lire d’abord [le bilan complet](../lot3/LOT3_FINALISATION_MAGIE.md). Le tri exclusif ci-dessous et ses 28 talents « lot 3 » décrivent le lot 2 historique. La couverture actuelle compte 285 clauses automatiques, 122 assistées, 63 rappels, 41 fiches, 10 exclusions et 9 clauses différées à un autre périmètre. Ingrédients exclus ; miracles inventoriés seulement. Worktree / branche / HEAD inchangés, aucune publication.

État local du 9 octobre 2026 : [tri des 206 talents](LOT2_TRI_TALENTS.md), 131 contrats ; 2.4/2.5 terminés localement ; 3.13.0 prête à publier sur autorisation.

## Message à copier

```text
Reprends le chantier V5 de l’Outil MJ Warhammer dans le worktree LOCAL lot2-combat-v5, branche codex/lot2-talents-v5. Retrouve-le par git worktree list depuis E:\Outil MJ Warhammer. HEAD fb0f280 et incrément courant non commité : conserver tous les changements/nouveaux fichiers, ne pas repartir du distant. Main 08ce45d inchangé. Aucun push/merge/déploiement sans instruction explicite.

Lis d’abord docs/lot3/LOT3_FINALISATION_MAGIE.md et LOT3_RECETTE_3_5.md, puis docs/lot2/REPRISE_AGENT.md, LOT2_TRI_TALENTS.md, LOT2_TRI_TALENTS.json, LOT2_AVANCEMENT.md, CHOIX_POUR_LA_REPRISE.md et LOT2_ETAPES.md ; les anciens rapports 2.3/2.4 et mots-clés sont historiques. Version application courante 3.14.0 (le paquet et la recette 3.13.0 sont historiques), mécanique v5-combat-2026-10-09.24.6.

206 identités triées par clause : 131 talents raccordés (382 clauses), 19 purement narratifs, 18 entièrement fiches, 10 bonus de caractéristiques exclus, 28 lot 3. Des talents moteur gardent aussi des clauses narratives/de fiche. La neutralisation silencieuse p135 est volontairement assistée avec conséquences manuelles approuvées.

Petit est raccordé et éprouvé selon les réponses explicites du MJ : multiplication des Dégâts avant BE/PA et suppression intégrale des Frappes Mortelles. Piétinement à 1 Élan, rapports de Taille dans les deux sens, Force opposée et Peur/Terreur V5. Aucune migration de Taille/Blessures. 2.4 et 2.5 sont terminés localement dans le périmètre convenu. La version 3.13.0 est prête à publier sur autorisation ; voir [la recette et livraison](LOT2_RECETTE_2_5.md).

Décisions maintenues : Matraqueur ajoute Sonné au seuil Assommante V5 et abandonne le vieux bonus Force ; Commandant d’Équipage exige une Action réussie et ne remplace que le prochain tir à équipage. Narrative = rappel, progression et valeurs dérivées = fiches, aucun bonus de caractéristiques ni Dur à cuire doublé. Unités littérales 0=0, Élan binaire, choix d’inversion sans relance ; coûts ordinaires avant jet, attraper/repousser après résultat ; critiques indépendants du vainqueur, ressources/quotas/effets atomiques et annulables. Battement remplace tout le critique attaquant. Pénalités mixtes au choix MJ, Fortune stable par personnage. Sources et acquisitions revalidées à Apply.

Tests : npm test ; npm run test:lot2-25-browser ; npm run test:lot2-25-cloud ; npm run test:lot2-talents-browser ; npm run test:lot2-24-browser ; npm run test:lot2-23-browser ; npm run test:startup ; npm run test:fiches-browser ; npm run test:references-browser. Generateurs : node tools/build-v5-talent-classification.mjs puis node tools/build-v5-talent-coverage.mjs. git diff --check et modules SW. Fixtures synthétiques, réseau externe bloqué, logs/captures dans tmp ignoré. Conserver toute limite de la recette dans le rapport.

Sources : texte public épinglé ; audit existant des 166 talents du livre V5 ; les 39 suppléments ne sont pas tous vérifiés dans leur ouvrage. PDF local personnel sous E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\Livre de base V5 EN v2.pdf. Aucun PDF/export privé dans Git/ZIP et aucune preuve d’état PJ en ligne par les anciens snapshots.
```
