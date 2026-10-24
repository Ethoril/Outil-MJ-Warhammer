# Choix de l'exécutant — branchement des Traits et des familiers

| Id | Source | Question | Choix | Raison | Alternative |
| --- | --- | --- | --- | --- | --- |
| BR-01 | B0 | Où brancher les rappels de Traits ? | Rappels calculés à l'affichage dans `deriveReminders` (`js/core/reminders.js`) à partir des Traits du participant, sans rien écrire dans le participant. | Aucun participant ancien à migrer ; réutilise l'affichage carte et Personnage actif existant. | Écrire les rappels dans `extensions.v5.reminders` à la création (statique, périmé si les Traits changent). |
| BR-02 | B10 | La Résilience existe-t-elle côté fiche (`fiche-sync`, `VARIABLES_PERSISTANTES_PJ.md`) ? | À instruire en B10. | Pas encore vérifié. | — |
| BR-03 | B1 | Comment un Trait Taille agit-il en défense et en Force opposée ? | Comme le talent Grande taille (−2 DR, victoire auto à deux crans), seulement pour Grande et plus ; adversaire sans Trait supposé Moyen ; « pas de Désengagement » non appliqué faute de texte déterminant ; surnombre en rappel. | Une seule source de vérité avec `v5-talent-size.js`. | Créer un second calcul dans `creature-size.js`. |
