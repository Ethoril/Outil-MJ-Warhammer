# Passation vers un nouveau chat

État local du 9 octobre 2026 après le catalogue utile 2.4, première vague. La livraison 2.5 et la publication restent ultérieures.

## Message à copier

```text
Reprends le chantier V5 de l’Outil MJ Warhammer depuis la branche LOCALE codex/lot2-talents-v5 et le worktree lot2-combat-v5. Retrouve-le par git worktree list depuis E:\Outil MJ Warhammer. Conserve cet état local et les modifications ; ne repars pas du distant antérieur.

Lis docs/lot2/REPRISE_AGENT.md, LOT2_RACCORDEMENT_2_4.md, LOT2_CONTROLE_2_4.md, ECARTS_LIVRE_V5_AIDES_DE_JEU.md, LOT2_AVANCEMENT.md, LOT2_ETAPES.md et CHOIX_POUR_LA_REPRISE.md, puis cadrage/contrats.

2.1/2.2, cinq contrats 2.3, 35 contrats de Tests et Frappe assommante sont raccordés localement : 41 contrats parfois partiels. Les 206 talents affichent un traitement par clause. Dur à cuire non doublé, dix bonus de caractéristiques exclus, magie/prières lot 3. Priorité aux snapshots PJ réellement importés ; pas de preuve d’état en ligne par un vieux snapshot. Riposte/Frappe réactive et les autres clauses manuelles demandent encore incrément moteur, contrat et recette.

Décisions VALIDÉES : pénalités mixtes DR/Désavantage au choix du MJ ; Battement supprime toutes les conséquences du critique attaquant remplacé, conserve le critique défensif indépendant ; Fortune dans l’outil par personnage entre rencontres, initialisée explicitement, annulable sans écrire à la fiche. Frappe assommante silencieuse suit livre p135, hors combat et cible ignorante : Test Corps à corps/Résistance avec Avantage, sans Coup ciblé, conséquences manuelles. Ne pas redemander ces choix.

Le MJ demande un document des écarts livre/Aides de jeu pour correction future ; audit disponible, pas de modification du Google Sheet autorisée par cette seule préparation. Livre personnel : Y:\Ressources JDR\Warhammer 4\Règles\Livre de base V5 EN v2.pdf. Aucun PDF/export privé dans Git/ZIP. Travailler avec développement et contrôle indépendants par sous-agents, explicitement autorisés.

Poursuis les vagues 2.4 restantes ; toute nouvelle mécanique requiert sa recette avant activation. 2.5 séparée. Ne pousse, fusionne dans main ni déploie sans instruction explicite.
```

## Reprise pratique et limites

Dépôt principal `E:\Outil MJ Warhammer` propre, worktree `C:\Users\arnot\.codex\worktrees\lot2-combat-v5\Outil MJ Warhammer`. Branche `codex/lot2-talents-v5` incluant `6871764` (2.1/2.2), `a1af528` (arbitrages), `09df6c2` (2.3) et le commit contenant cette passation. Vérifier état/log avant de travailler et préserver toute modification. Pour changer de machine, transférer aussi l’état Git local ; le ZIP contient uniquement documentation/maquette.

La version applicative reste 3.12.3 ; la version mécanique de l’aperçu 2.4 est `v5-combat-2026-10-09.24`. Node/npm et dépendances disponibles. Le shell ordinaire échouait avant exécution ; l’escalade des commandes locales autorisées fonctionnait. Exécuter les recettes Edge séparément, avec fixtures synthétiques et captures/logs ignorés dans `tmp/`. [Avancement](LOT2_AVANCEMENT.md) donne commandes/résultats. Le cloud n’a été contrôlé que localement (sérialisation/enveloppes), sans compte réel.

Le contrôle antérieur des cinq snapshots privés des 5/7 octobre, 52 acquisitions et 36 IDs, reste daté. La priorité actuelle est calculée depuis ce qui est effectivement importé. Aucun nom ou ID privé n’est dans le code de priorité. Les quotas de séance non raccordés restent manuels.
