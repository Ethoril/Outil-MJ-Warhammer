# Brief pour ChatGPT — clôture du lot 3 (magie) : version 3.15.0, talents restants, recette finale

14 octobre 2026. Chantier de clôture. Les lots de contrats 1 à 5b et le catalogue V5 sont livrés et vérifiés (`node --test` 2 166/2 166). Règles générales de [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) : aucun commit, push, fusion ni déploiement ; aucune commande git destructive ; personne d'autre n'écrit dans le dépôt pendant ce chantier. Après ta livraison, Claude fera une seconde relecture indépendante complète sur une copie.

## 0. Alignement sur la feuille Google (vérifié par Claude le 14 octobre, 11 h 10)

Le MJ a reporté le classeur. Feuille publique téléchargée (gviz) : **onglet Magie identique octet pour octet** au miroir `js/data/reference-source-csv/Magie.csv`. **Onglet Talents : deux lignes diffèrent du miroir** :

- **Bénédiction de Lileath** : la feuille commence par `+1 DR par acquisition…`, le miroir et le snapshot par `=+1 DR…` (le `=` était un artefact). Aligner le miroir, le snapshot, `js/data/v5-magic-talent-sources.json`, `js/data/v5-talent-coverage.json` et les empreintes de description sur la feuille (sans `=`), en vérifiant que l'automatisme du talent reste actif après une actualisation.
- **Petit (Small)** : le MJ a modifié ce talent dans la feuille après le 9 octobre (texte du miroir : « …minimum ×1), et ses coups réussis déclenchent les Frappes Mortelles même si vous survivez… » ; texte de la feuille : « …minimum ×1). Il peut quitter le combat sans désengagement. En Force opposée, avec un écart… »). **Suppression voulue par le MJ (confirmé le 14 octobre)** : la clause « et ses coups réussis déclenchent les Frappes Mortelles même si vous survivez » est retirée. Reprendre le texte de la feuille dans le miroir et le snapshot, et **retirer aussi cette règle du moteur** si le lot 2 l'exécute (contrat du talent, déclenchement des Frappes Mortelles par un adversaire plus grand, tests), avec empreinte recalculée ; le dire dans le rapport.

Après alignement : une actualisation depuis la feuille réelle doit donner exactement la version du snapshot (test avec la réponse distante simulée par les CSV téléchargés), et les quatre autres cellules du miroir qui commencent par `=` sont à contrôler de la même façon.

## 1. Trois clauses de talents encore « non vérifiées »

Dans le [suivi](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) : **Imprégné** (magic:2), **L'esprit sur le corps** (magic:2), **Résistance à la Magie** (magic:2), chacune avec son scénario manquant indiqué. Relis la source (High Elf Players Guide pour Imprégné et L'esprit sur le corps ; Livre de base V5 pour Résistance à la Magie, et la décision D-07 du [cadrage](LOT3_CADRAGE_MAGIE.md) contre Puissance totale), exécute le scénario par le Store (et la vraie fin de tour si une durée intervient), corrige si besoin, et donne à chaque clause son statut final avec preuve. Test rouge avant correction quand il y a correction.

## 2. Outil de couverture des talents

`tools/build-v5-talent-coverage.mjs` est désaligné : le lancer réécrit `js/data/v5-talent-coverage.json` avec un contenu différent de l'état validé (il a fallu le restaurer le 11 octobre). Or la recette de livraison ([LOT3_RECETTE_3_5.md](LOT3_RECETTE_3_5.md)) le lance. Recale l'outil pour qu'il régénère exactement l'état actuel (descriptions corrigées de Lileath comprises), avec deux générations identiques, puis garde-le dans la recette.

## 3. Version 3.15.0

- `js/version.js`, `package.json`, `package-lock.json`, `index.html` (bouton Version), `sw.js` (`CACHE_NAME` = `wfrp-cache-v3.15.0`) ; vérifier que tous les modules et données ajoutés pendant le lot 3 sont dans le précache (le test « tous les modules de js/ sont mis en cache » doit passer) et que le paquet de livraison ne contient ni test, ni PDF, ni donnée privée.
- Si l'application affiche des notes de version ou une aide « nouveautés », y résumer les changements du lot 3 pour un MJ (sinon ne rien créer).
- Un journal des changements du lot 3, court et lisible par le MJ : `docs/lot3/LOT3_JOURNAL_3_15_0.md` (magie V5 : Focalisation, incantation, incidents, dissipation, Haute Magie, attributs, Protections, transformations, 277 contrats, catalogue V5 ; décisions du MJ ; limites connues et clauses assistées).

## 4. Documents de reprise

Mettre à jour, sans réécrire l'historique : [LOT3_FINALISATION_MAGIE.md](LOT3_FINALISATION_MAGIE.md) (bilan actuel), [LOT3_RECETTE_3_5.md](LOT3_RECETTE_3_5.md) → nouvelle recette `LOT3_RECETTE_3_15.md` avec toutes les commandes actuelles (toutes les recettes navigateur lot 3, cloud local, couverture talents, paquet de livraison), [LOT3_PASSATION_RELECTURE_CLAUDE.md](LOT3_PASSATION_RELECTURE_CLAUDE.md) (nouvel état : où reprendre, HEAD, version, périmètre restant), et [LOT3_PLAN_CORRECTION_CLAUDE.md](LOT3_PLAN_CORRECTION_CLAUDE.md) (statut de chaque item : fait / annulé / restant, avec renvoi). Le `README.md` si la version ou les commandes y figurent.

## 5. Recette finale

Rejouer toute la recette de `LOT3_RECETTE_3_15.md` : `node --test` ; toutes les recettes navigateur (`browser-smoke`, `browser-startup`, `browser-references-smoke`, `browser-magic-v5-smoke`, `lot2-combat-v5-browser`, et toutes les `tests/lot3-*-browser.mjs`) ; le cloud local avec émulateurs (`tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs`) ; la génération du paquet (`tools/build-lot3-local-release.mjs`) et `tests/lot3-v5-35-release-browser.mjs` (ordinateur et téléphone, hors ligne) ; deux générations identiques des contrats, preuves et couverture ; `git diff --check`. Reçus dans `tmp/lot3/` (jamais de sauvegarde de tests dans `tmp/` qui serait découverte par `node --test`).

## Livrable

Rapport court `docs/lot3/LOT3_RAPPORT_CLOTURE.md` : statut des trois clauses, version, fichiers de documentation mis à jour, résultat de chaque commande de la recette, limites restantes (clauses assistées, hors périmètre : miracles, runes de maître, Chaos, etc.), et rappel que **la feuille Google doit être à jour avant la livraison** (le MJ la met à jour avec `Magie_V5.xlsx`).
