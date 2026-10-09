# Contrôle indépendant du catalogue 2.4

Contrôle du 9 octobre 2026, séparé du développement, avec 32 tests Node Store dans `tests/lot2-v5-24-control.test.js` et une recette Edge dans `tests/lot2-v5-24-control-browser.mjs`. Les fixtures sont synthétiques ; les routes externes sont bloquées. Aucun PDF ou export de PJ n’est incorporé.

Le contrôle couvre source/identité/rang/spécialité, contextes acteur/défenseur, cumul et refus, choix DR/unités (0 reste 0), Sonné réel, seuil après protection, durabilité, annulation/rechargement, erreur de disque et absence de mutation sur refus. Trois actualisations réelles de source entre aperçu et Appliquer (Orateur, Maître en déguisement, Coup puissant) provoquent un refus sans changement de révision ni journal.

Le catalogue des 206 identités est vérifié par clauses, notamment les talents à traitement mixte, les dix exclusions, Dur à cuire et le lot 3. Les priorités acceptent strictement des PJ réellement importés, dédupliquent les copies, refusent la fusion de talents divergents et écartent les acquisitions non résolues.

Les gestes Edge couvrent Orateur sur ordinateur sombre, Maître en déguisement sur téléphone parchemin, Frappe assommante sur téléphone sombre (Sonné et annulation), Opposition silencieuse hors combat et catalogue/priorités avec puis sans snapshot. Les captures sont dans `tmp/lot2-24-control-ui/`, ignoré. Le contrôleur a vérifié la lisibilité et l’absence de débordement.

Défauts détectés et corrigés pendant le contrôle : le brouillon écrasait le choix DR/unités ; les champs de défense étaient cachés pour Opposition ; l’identité importée de défense était perdue ; un filtre vide faisait disparaître son bouton de retour. Une revue supplémentaire a relevé Résistance classée en mêlée par défaut et le risque d’un critique de combat lors de la neutralisation p. 135 ; les gardes et la recette de succès doubles ont été revérifiées, y compris sur doubles réussis des deux côtés sans mutation de PV/États/Élan.

Verdict : favorable au périmètre éprouvé, après ces corrections. Les 41 contrats sont parfois partiels et les 206 dispositions ne certifient pas tous les effets. Les résultats finaux de la suite complète et des régressions figurent dans [l’avancement](LOT2_AVANCEMENT.md). La livraison 2.5 et un compte cloud réel ne sont pas validés par ce contrôle local.

## Vérification après arbitrages MJ

Deux recettes supplémentaires portent le contrôle à 32/32. 20→0 DR reste une réussite marginale, choix de DR disponible, inversion et défense indépendantes. Les résultats et décisions persistent après application/rechargement/export, annulation/rétablissement. 100 reste un échec. Edge manipule le choix 0 DR, applique et annule le résultat. Petit affiche homebrew MJ conservé et un Momentum pour Piétinement, sans clause automatique ni mutation des PV/Taille. Le contrôle demeure favorable au périmètre éprouvé.
