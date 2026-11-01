# Rapport GPT — corrections de recette G

Base `7329d8a`, worktree `tmp/recette-g-worktree`, branche `codex/recette-g-corrections`. Travail local ; aucun push, merge, publication, changement de version ou modification du service worker. Aucun nouveau fichier sous `js/**`. Le fichier `docs/RECETTE_UTILISATEUR.md` du dépôt principal n’a pas été touché.

## C1 — explication du bouton Appliquer

Commits `81c86d7`, `309628a`, `919a44f`, `81fd1e7`. Tests `tests/recette-g-application-reasons.test.mjs` et parcours `tests/divin-v5-p5-ui-browser.mjs`.

Les conditions de désactivation sont exposées dans une fonction et les motifs sont affichés sous le bouton et dans son infobulle, pour la magie et les autres actions. Le parcours ciblé vérifie le Test de Calme de Protection, le focus, la saisie et l’appel du bouton actif. Les champs explicitement reliés sont marqués lorsqu’ils bloquent.

Limites : le parcours utilise un harnais de panneau et vérifie l’appel du gestionnaire d’application, pas une application complète dans le Store. La correspondance clic-vers-champ couvre notamment Calme, cible, défense, protection et localisation/critique, mais pas tous les nombreux messages contextuels possibles ; tous les champs requis de ces cas ne sont donc pas encore marqués. Le déplacement des blocs physiques devant magie/divin/Corruption n’a pas été effectué : le panneau impératif les imbrique dans une construction longue et cela dépasse un simple déplacement sûr. La refonte U1 reste séparée.

## C2 — défauts de rencontre et initiative

Commits `7e40744`, `f25c0b0`. Test `tests/recette-g-encounter-defaults.test.mjs` et parcours `tests/f2-a-initiative-surprise.browser.mjs`. Les entrées ajoutées sont actives, PJ dans le camp PJ et PNJ/créatures dans le camp ennemi ; une sélection manuelle est conservée et affichée. Sans actif, le message est présent dans la fenêtre, y compris après calcul, et le camp surpris est désactivé. Les rencontres enregistrées ne sont pas migrées. Le parcours vérifie les deux camps, les défauts, le choix manuel et le cas entièrement en attente.

Limite héritée à examiner : `normalizeCamp('neutre', 'PJ')` interprète un PJ explicitement neutre comme PJ dans plusieurs règles et vues existantes, même si le choix est conservé dans la rencontre. Cette normalisation mécanique n’a pas été modifiée dans ce lot sans décision explicite sur les anciennes parties.

## C3 — ajout pendant une rencontre

Commits `9c885c5`, `2e8c95e`, `e3b8b5a`, `d2eb587`, `b5fe832`, `31d70fe`. Tests dans `tests/unit/stockage/store-commandes-historique.test.js` et parcours `tests/f2-a-initiative-surprise.browser.mjs`.

Décision du MJ pendant ce chantier : demander un jet d’Initiative aux nouveaux combattants actifs pendant un combat commencé. Le dialogue conserve les jets existants, résout les égalités par le mécanisme actuel et enregistre rencontre, combattants et ordre dans une commande annulable. L’annulation du dialogue ne crée pas le renfort ; l’annulation de la commande le retire sans toucher aux PV et au Tour courant. Avant le premier Round, un ajout actif rend l’initialisation incomplète pour demander son jet au calcul suivant. Les retraits laissent les combattants en combat et affichent le message demandé. Le test de référence du store a été actualisé uniquement pour la nouvelle méthode publique `previewEncounterEdit` et son résultat sans scène ; les empreintes antérieures restent inchangées.

## C4 — restauration

Commit `5c57134`. Parcours `tests/browser-index.mjs` et `tests/browser-persistence.mjs`. La confirmation est dans l’application ; une révision devenue obsolète produit une erreur visible et invite à rouvrir l’aperçu. La révision retenue est celle de l’aperçu, le succès offre Annuler, et le parcours après chargement d’un fichier vérifie conflit, restauration puis rechargement. Le clic de confirmation native ne fournissait pas de confirmation intégrée visible dans le parcours initial ; la cause exacte rencontrée sur le navigateur du MJ n’a pas pu être établie indépendamment.

## C5 — événements structurés

Commits `7676c8b`, `9cad50b`. Test `tests/recette-g-scene-alerts.test.mjs`, test store de rechargement dans `tests/unit/stockage/store-commandes-historique.test.js`, parcours `tests/browser-index.mjs`. Les commandes réévaluent les conditions après projection de la scène ; les nouvelles occurrences produisent une proposition visible avec conséquence, Appliquer et Plus tard. Leurs identifiants signalés sont conservés, y compris au rechargement. L’application reste explicite et est journalisée. Les événements sont lisibles, ouvrables, modifiables et supprimables après confirmation.

Limite du parcours : la baisse de PV est réalisée par la commande de modification de participant du Store, pas par une résolution d’attaque complète ; la détection passe néanmoins par le même point après commande. Les scénarios d’égalité d’Initiative et d’événements récurrents combinés méritent une recette à la table.

## C6 — repères V5

Commit `0b23246`. Tests `tests/recette-g-rule-shortcuts.test.mjs` et `tests/browser-references-smoke.mjs`. Les quatre fiches existantes ont des identifiants explicites ; chaque bouton ouvre directement la fiche correspondante. Aucun repère sans fiche n’a été constaté.

## C7 — mots-clés de créature

Commit `72451e6`. Parcours `tests/browser-keywords.mjs`. La datalist du sélecteur propose une option par nom français, ordonnée selon l’arbre ; les alias restent reconnus à la saisie. L’affichage visuel des retraits hiérarchiques dépend de la prise en charge du libellé des options par le navigateur.

## C8 — ancien modificateur

Commit `a9b7eb9`. Test `tests/recette-g-legacy-message.test.mjs`, test d’import existant `tests/unit/referentiel/import-profils-complets.test.js` et parcours `tests/browser-index.mjs`. Les deux éditeurs partagent le message demandé, avec signe et pourcentage ; un JSON avec `mod: -10` le produit et l’exemple V5 n’en produit pas.

## Vérification

La suite `node --test --test-concurrency=4` a passé 5 503/5 503 tests. Le dernier ajustement de la fenêtre imbriquée C3 a été vérifié par le parcours navigateur correspondant. Sur Windows, les tests indépendants de chemins nécessitent un répertoire temporaire extérieur au checkout sur le même disque ; un fichier temporaire `{}` a été créé comme précondition pour le test qui vérifie qu’une exécution externe ne modifie pas son contenu. Il ne constitue pas un reçu de recette divine.

Parcours exécutés individuellement : `divin-v5-p5-ui-browser`, `f2-a-initiative-surprise.browser`, `browser-index`, `browser-persistence`, `browser-references-smoke`, `browser-keywords` : verts. Le parcours C1 a été rejoué après son dernier ajustement ; le parcours principal a été rejoué après les changements d’événements et de restauration. `git diff --check 7329d8a HEAD` : vert avant le présent rapport.
