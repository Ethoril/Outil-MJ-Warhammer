# Recette transversale Jouer / Campagne

Recette locale sur `codex/jouer-lot4b`, HEAD `50d3592`, avec modifications non commitées des lots 2 à 4B. Elle ne constitue ni une intégration ni une publication.

## Parcours vérifiés

- `node tests/campaign-crossflow-browser.mjs` : dans la même partie de test et avec le Store réel, un critique est appliqué depuis Jouer, son suivi lié à l'identifiant du critique est ouvert dans Campagne, un soin est effectué, puis retour dans Jouer et rechargement. Les PV soignés et le lien du suivi sont vérifiés après rechargement.
- `node tests/jouer-lot4b-browser.mjs` : dans l'application réelle, calcul d'une attaque sans changement de l'état exporté (hors horodatage), application des dégâts puis annulation. Dans la même partie, passage en Campagne, avance d'une heure, Undo/Redo, retour dans Jouer et rechargement : temps et participants sont conservés. Le maintien d'une saisie et du focus est vérifié après rerendu effectif. Des contrôles de disposition et de contraste utilisent aussi une fixture simulée.
- `node tests/campaign-lot3-browser.mjs` : accès Jouer → Campagne, ouverture et soin de critique, traitement d'une infection injectée dans la fixture, avance de temps de deux jours avec Undo/Redo, cas d'absence et retour entre les espaces.
- `node tests/jouer-lot4a-browser.mjs`, `node tests/browser-index.mjs`, `node tests/f2-j-review-browser.mjs`, `node tests/f2-j2-review-browser.mjs` : passés. Couverture respective de l'interface Jouer, de la navigation dans l'index réel, du parcours de critique/convalescence et de séquelles.
- `node --test tests/unit/lot4/c39-temps-convalescence.test.mjs` : 7/7 tests passés (liaison des horloges, fraction de jour, refus sans avancement partiel et annulation).

## Limites

Ces scénarios ne certifient pas toutes les variantes de combat, de maladie, de magie ou de divin. Ils ne testent pas la synchronisation multi-session, les conflits hors ligne ou un export/import complet. La continuité d'identité entre rencontres et les soins des participants absents restent des sujets distincts ; Campagne et Jouer ne présentent pas exactement les mêmes actions pour ces absents. Aucune donnée de partie réelle n'a été utilisée ni modifiée par ces tests.
