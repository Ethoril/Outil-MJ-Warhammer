# Mission Gemini — Lot 4B : fiches et résolution dans Jouer

## Mandat et base

Travaille en français dans le seul worktree `E:/Outil MJ Warhammer/tmp/jouer-lot4b-worktree`, branche `codex/jouer-lot4b`, HEAD `50d3592`. Les modifications non commitées présentes au départ comprennent les lots 2 et 3 ainsi que le lot 4A corrigé par Codex : **c'est la base de travail à préserver**. Elle a été copiée et vérifiée fichier par fichier depuis `E:/Outil MJ Warhammer/tmp/jouer-lot4a-worktree`. Le lot 4A n'est pas encore intégré au worktree principal. Ne réinitialise aucun changement hérité et ne déduis pas tes propres modifications d'un simple diff avec HEAD ; compare à ce worktree 4A pour ton rapport. Ne modifie ni le worktree 4A ni le worktree principal.

Le MJ valide la direction de la maquette, apprécie sa palette et ses polices, souhaite une utilisation de toute la largeur et apprécie le fonctionnement actuel de Jouer. Codex contrôle ton travail avant intégration. Les sous-agents sont autorisés si utiles ; tu restes responsable des résultats et évites les écritures concurrentes.

Lire `docs/JOUER_LOT4A_GEMINI.md`, les composants réels et `E:/Outil MJ Warhammer/tmp/maquette-campagne-jouer/LOT_0.md`, `jouer.js`, `jouer.css`. La maquette est une référence visuelle **fictive** : ne copie ni ses données ni ses calculs et n'invente pas de fonctionnalité.

## Objectif et limites

Améliorer l'occupation de l'espace, la hiérarchie, la lisibilité et la cohérence graphique des **fiches du personnage actif et de la cible** et de la **zone de résolution** dans Jouer, en continuité avec la coquille du lot 4A et Campagne. Conserver la pleine largeur, le mode sombre et les interactions opérationnelles.

- Rendre les informations pertinentes et actions existantes faciles à parcourir ; équilibrer fiches, blocs, marges et formulaires sans supprimer ni masquer des commandes utiles. La disposition peut s'adapter aux différentes largeurs, sans imposer un maximum central sur les écrans larges.
- Clarifier visuellement la progression déjà présente : choix d'action et de cible, données et jets, aperçu ou résultat, application et retour. La maquette n'autorise pas à transformer la résolution en un nouveau parcours simplifié ni à changer ses conditions.
- Conserver exactement les scénarios de combat, oppositions, tests, magie et divin existants ; l'état actif/cible, disponibilité des actions, libellés de décision, modificateurs, résultats, refus, avertissements, aperçu périmé, application et annulation restent ceux du produit.
- Préserver les éléments accessibles, sélecteurs et attributs fonctionnels, gestion du clavier, focus et caret, saisies, sections et défilement lors d'un rerendu ; ne jamais exécuter deux commandes pour un geste, ni appliquer automatiquement un aperçu.
- Prévoir cas sans cible, noms et contenus longs, nombreux choix, erreurs/refus, vue 1440/900/520 px et thèmes clair/sombre. Pas de coupure de texte, contrôle ou contenu indispensable. Préserver le volet latéral, ses onglets et son repli, et les autres espaces.
- Ne change ni l'architecture métier ni les règles de personnages absents ; ne reprends pas le lot 4A ou la campagne sous couvert de correction visuelle, sauf régression directement provoquée par ton changement et documentée.

## Périmètre d'écriture

1. `js/ui/workspace.css` : styles des fiches et de la résolution, circonscrits à `#workspace-play` ou à des sélecteurs dont l'usage exclusif Jouer est vérifié ; préserver les composants et styles partagés, y compris le lien Campagne et son survol sombre corrigé.
2. `js/ui/workspace-view.js` et `js/ui/resolution-panel.js` : seulement si un ajustement structurel de présentation est indispensable. Préserver les commandes, calculs, données, conditions, écouteurs, identifiants, attributs `data-*`, clés de focus/scroll et cycle de vie. Expliquer chaque changement JS ; si cela exige une modification métier ou un changement d'interaction, ne le fais pas et documente le besoin.
3. Tests dédiés sous `tests/` strictement nécessaires ; conserver les tests hérités à l'identique sauf correction justifiée et rapportée. Ne jamais supprimer ni assouplir des assertions pour obtenir un résultat vert.
4. `docs/JOUER_LOT4B_GEMINI.md` pour le rapport. `sw.js` seulement si une nouvelle ressource locale est indispensable, avec précache cohérent et justification ; privilégier les ressources existantes.

Ne touche pas à `js/core/`, Store, données, calculs de résolution, règles, catalogues, sauvegardes, migrations, synchronisation, Firebase, `js/ui/side-panel.js`, `js/ui/workspace/plateau.js`, thème global, navigation globale, Campagne, autres espaces ou maquette. Aucun commit, push, merge, déploiement, publication, migration ou opération sur données réelles ; aucun service externe ou police distante. Les sous-agents ne doivent pas dépasser ces limites. Utiliser des fixtures isolées et la rencontre de test autorisée par le MJ.

## Recette et preuves

- Inspecter le rendu **réel** de l'application avec une rencontre représentative : actif + cible, sélection et résolution, sans cible, et état vide si affecté ; inspecter aussi 1440/900/520 et clair/sombre. Expliciter chaque état et largeur effectivement vus. Ne pas présenter un banc simulé comme une recette de bout en bout.
- Tester un parcours réel calcul/aperçu sans mutation, application unique puis Undo, ainsi que maintien d'une saisie et du focus après un rerendu effectif. Vérifier que le rerendu a réellement eu lieu. Les règles du Store et les décisions MJ existantes restent la source de vérité.
- Vérifier les commandes accessibles au clavier, cibles, panneaux ouverts/repliés et cas de refus ou données manquantes pertinents ; utiliser des noms longs et plusieurs combattants. Mesurer les contrastes des éléments changés, états sélectionné et survol inclus, en sombre forcé et sombre système si ces règles sont modifiées. Ne pas prétendre avoir certifié toute l'accessibilité.
- Exécuter au minimum, séquentiellement pour éviter les conflits de ressources : `node tests/jouer-lot4a-browser.mjs`, `node tests/browser-workspace.mjs`, `node tests/browser-index.mjs`, `node tests/campaign-lot3-browser.mjs`, `node tests/f2-j-review-browser.mjs`, `node tests/f2-j2-review-browser.mjs`, `node tests/browser-magic-v5-smoke.mjs`, `node tests/divin-v5-browser.mjs` et `node --test tests/unit/donnees/audit-meta-production.test.js`. Ajouter une recette ciblée si nécessaire pour les changements ; ne pas réécrire les tests pour qu'ils reproduisent eux-mêmes le comportement attendu.
- Exécuter `git diff --check`, comparer les fichiers à la base du worktree 4A, signaler chaque échec et toute vérification non exécutée. Un test vert ne prouve que les cas qu'il exerce, pas toutes les variantes magiques ou divines.

## Remise

Laisser la proposition non commitée dans ce worktree. Dans `docs/JOUER_LOT4B_GEMINI.md`, distinguer modifications propres au 4B et héritage, fournir avant/après, captures ou observations précises, tests exécutés et résultats, limites et éventuelles décisions ouvertes. Ne pas intégrer ni commencer une autre tranche. Codex réalise la revue et décide de la suite avec le MJ.
