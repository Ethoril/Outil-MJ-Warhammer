# Lot 3 — Correction de Destruction des Arcanes

10 octobre 2026. Correction locale par Codex du P1 restant du quatrième contrôle. Branche `codex/lot2-talents-v5` ; aucune publication. Version locale 3.13.1, cache PWA aligné et nouveau module précaché.

## Comportement corrigé

- Base : un dégât par tranche complète de deux PA portés, BE déduit, PA ignorés. Les dégâts sont calculés avant la destruction d’armure. Aucun PA détruit gratuitement.
- Destruction d’armure : 1 DR dépensé par PA ; le MJ renseigne chaque localisation tirée au sort. Localisations manquantes, inconnues ou dépourvues de PA disponibles bloquent l’application.
- Palier +8 DR : un dégât par PA porté ; aucune destruction automatique d’une pièce complète. Les anciens raccourcis `overcast8`, `destroyArmorPiece` et `destroyMagicItem` sont refusés.
- Objet magique : le MJ précise sa présence. Un Test de Focalisation (Haute Magie) réussi détruit l’objet tiré au sort ; l’échec conserve l’objet. Ce Test secondaire ne crédite aucune réserve de Focalisation.
- Choix de l’objet : +3 DR et Test de Dextérité à +2 DR. Une réussite permet le choix ; un échec revient au tirage aléatoire. Les Tests et noms nécessaires doivent être fournis.
- Les trois options ont des coûts indépendants, soumis au surplus disponible et au plafond BI + BFM. La dépense « Spécial » transmise doit correspondre aux options choisies.
- L’interface présente les champs propres au sort et le reçu complet : dégâts, PA avant/après par localisation, Tests, objet détruit et suivi d’inventaire. Les faits et reçus restent séparés pour chaque cible.

## Application et suivi

Les dégâts, la consommation de réserve, les PA détruits et les reçus d’inventaire sont appliqués dans une seule commande annulable. La dégradation physique est conservée après dissipation, expiration et sauvegarde/rechargement. Les attaques suivantes utilisent les PA de la localisation concernée, y compris les bras et jambes distincts ; la pénalité d’armure en Focalisation tient compte de la dégradation.

La fiche et ses objets source ne sont pas réécrits. La destruction d’objet et les changements d’inventaire restent à reporter manuellement, au moyen du reçu affiché et conservé dans `extensions.v5.pendingInventoryChanges`. Le catalogue, le générateur et la matrice restent cohérents : 277 contrats, 31 identités signalées pour un suivi fiche.

## Vérification

- 10 nouveaux tests ciblés : base, coûts, anciens raccourcis, Tests secondaires, validation sans mutation, Undo, persistance, armure portée, projectiles ultérieurs et extension à deux cibles.
- Suite complète `node --test` : 1 033 tests réussis, aucun échec.
- Parcours navigateur Magie : options et tirages réellement saisis dans le DOM, refus du palier non payé, choix/aléatoire selon Dextérité, application et Undo, affichage mobile 390 px, captures contrôlées et rechargement hors ligne.
- Parcours navigateur général : démarrage, profils, rencontre, résolution, Undo/Redo, rechargement et suppression.
- Syntaxe JS et `git diff --check` : OK. Checkout principal inchangé.

Le P1 de Destruction des Arcanes est résolu. Cette recette porte sur cette correction et ses régressions ; elle ne certifie pas individuellement chaque effet des 277 sorts.
