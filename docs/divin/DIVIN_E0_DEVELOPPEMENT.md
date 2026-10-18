# Développement E0 — provenance et garde cwd

Le générateur associe les neuf miracles supplémentaires de Myrmidia à leurs titres anglais, à Up in Arms p.79 et au SHA-256 `0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07`. Les compteurs indiquent 15 sources retrouvées (6 V5 et 9 supplément), aucune source manquante, et neuf adaptations V4 vers V5 bloquées.

La recette divine vérifie désormais son cwd avant toute création de dossier ou lecture/écriture. Le test temporaire a échoué avant correctif : le script atteignait la lecture de `package.json` depuis le cwd externe après son initialisation. Après correctif, il confirme le refus et l’absence de `tmp/` dans le dossier temporaire.

Les tests E0, catalogue, contrôle divin et contrôle E0 indépendant réussissent (27/27); aucun test indépendant n’a été modifié. Deux générations sont identiques, `--check` et `git diff --check` passent. La recette complète n’a pas été relancée. La durée de *Sur un Terrain Mortel* reste à examiner. Reçu machine: `tmp/divin/e0-dev-receipt.json`.
