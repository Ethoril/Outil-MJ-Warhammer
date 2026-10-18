# Brief pour ChatGPT — remplacement des descriptions du catalogue par la V5

13 octobre 2026. Chantier de données, après les lots de contrats 1 à 5b. Décision du MJ du 12 octobre (voir [cadrage](LOT3_CADRAGE_MAGIE.md), « Descriptions du catalogue ») : les descriptions contredites par les contrats corrigés sont remplacées par la version V5, avec la liste à reporter dans la feuille Google.

Rappel : **Écaille d'acier et Robe scintillante restent deux sorts distincts** (décision du 13 octobre) ; ne repose plus la question.

## Contexte et règles

- Règles générales de [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md). **Traite d'abord les [retours de vérification du lot 5b](LOT3_RETOURS_VERIFICATION_LOT5B.md)** (dont `node --test` rouge à cause d'une sauvegarde dans `tmp/`, classement, textes compressés), puis le catalogue.
- Sources des écarts : les tableaux « catalogue en contradiction » des rapports `LOT3_RAPPORT_CONTRATS_LOT1.md` à `LOT3_RAPPORT_CONTRATS_LOT5B.md`, les fiches, et les contrats actuels (`js/data/v5-spell-contracts.json`). Relis la page source pour chaque description réécrite.
- **Méthode du catalogue** : relis comment le snapshot est versionné et rafraîchi (`js/core/reference-catalog.js`, `js/data/reference-snapshot.json`, miroir `js/data/reference-source-csv/Magie.csv` avec son `publicCsvSha256`, champ `localRevision`) et comment la correction de Lileath a été faite le 11 octobre (même méthode : snapshot, miroir CSV, versions de contenu recalculées, `localRevision` mis à jour pour remplacer les caches anciens). Ne lance pas `tools/build-v5-talent-coverage.mjs`.
- **Rédaction** : résumés français fidèles au livre et au contrat (NI, portée, cible, durée, effet), dans le style des descriptions existantes ; jamais une traduction intégrale du texte anglais. Les valeurs doivent être exactement celles du contrat exécuté (DR V5, unités, durées).
- Si une description est déjà exacte, ne la touche pas. Si un champ structuré (NI, portée, cible, durée) du catalogue diffère du contrat, corrige-le aussi.
- Les noms de sorts ne changent pas (ils servent de clés), sauf décision explicite du MJ.

## Livrables

1. `js/data/reference-snapshot.json` et `js/data/reference-source-csv/Magie.csv` mis à jour, versions recalculées ; les tests du catalogue (`node --test`, `node tests/browser-references-smoke.mjs`) verts, dont « refresh depuis la source publique garde la même version ».
2. Un test qui compare, pour chaque sort, les champs NI/portée/cible/durée du catalogue à ceux du contrat (tolérance documentée pour les formulations), afin qu'un écart futur soit détecté.
3. **`docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_MAGIE.md`** : pour chaque sort modifié, le nom (clé de ligne) et le texte exact de chaque cellule changée de l'onglet Magie, prêt à coller (colonnes Nom · Type · NI · Portée · Cible · Durée · Description), avec la mise en garde sur les cellules qui commencent par `=` ou `+` (apostrophe devant dans Google Sheets). Trie par Domaine.
4. Mise à jour des fiches (« catalogue corrigé le … ») et un court rapport `docs/lot3/LOT3_RAPPORT_CATALOGUE_V5.md` : nombre de sorts modifiés par Domaine, champs touchés, versions avant/après, tests.

Fin : `node --test` complet vert, `browser-references-smoke`, `browser-magic-v5-smoke` et les recettes lot 3 verts.
