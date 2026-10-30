# Rapport — lot cohérence fiches, 28 octobre 2026

Branche `gpt/coherence-fiches`, worktree `E:/Projet Warhammer Ennemi Intérieur/tmp/gpt-coherence-fiches`, créée depuis `gemini/armes-v5` à `d9d62a57dbc51e889a4c829669f3abfad788756b`. Deux commits locaux :

- `0c3d3eb` — retrait des sept identités non achetables, alias de talents et rapprochements des compétences ;
- `fbddfaa` — correction d'Acteur après relecture de la liste V5 et recalcul de l'identité technique du catalogue.

Le worktree est propre. Aucun push, fusion, déploiement, changement de version applicative ou écriture dans Google Sheets. La source du snapshot talents est le CSV local déjà téléchargé ; ses 207 entrées ont été vérifiées identiques avant d'ajouter les alias. Les 6 talents V4 à ajouter, les munitions, équipements et contenus des sorts et miracles n'ont pas été modifiés.

## Résultats

- `Bon sens` et `Vivant` retirés du référentiel publié. Aucun de ces deux libellés n'est cité comme talent dans les carrières ou les fixtures examinées. « Vivant » reste bien sûr une valeur d'état de PNJ, hors talents.
- `Compagnon`, `Invisibilité`, `Messager`, `Partage sensoriel` et `Télépathie animale` retirés des talents achetables ; Archives of the Empire 3 p. 81–82 les présente comme traits de familiers. Aucun n'est cité comme talent par les carrières actuelles ; « Messager » reste un nom et un titre de carrière. Les données et traitements de traits n'ont pas été supprimés.
- `Béni d'Isha` → `Béni par Isha`, `Maniement de 2 armes` → `Maniement de deux armes`, `Imprégné par le (Vent)` → `Imprégné [Vent]`. Le dernier reste un choix ouvert, et une spécialité concrète comme Aqshy est conservée. Winds of Magic p. 186 décrit bien `Suffuse With (Wind)` ; il est distinct de `Suffused with Magic`, effet général du supplément Enemy in Shadows Companion p. 79.
- `Corps à corps (Arme d'hast)` : CC, de base, Livre de base V5 p. 112. La cible plurielle du regroupement avait à tort `basic: false` : elle est corrigée à `true`.
- `Métier (Calligraphe)`, `Métier (Cartographe)`, `Métier (Graveur)` : Dex, avancées, Trade p. 114 ; les trois redirections vers Art (base, p. 111) sont retirées. Art (Gravure) reste une compétence distincte de base.
- `Représentation (Acteur)` : la V5 classe explicitement Acting dans Entertain, Soc, base, p. 111 et précise la distinction avec Perform, Ag, avancée, p. 113. La ligne `skills.json` est corrigée en Soc/base ; son alias vers `Divertissement (Acteur)` est conservé. Aucune question de règle n'est restée ouverte pour ces cas.

## Production et validation

`referentiel-public.json` provient de `tools/catalogue-build-snapshot.mjs` et de la graine conservée `E:/Projet Warhammer Ennemi Intérieur/outputs/audit-fiches-drive-2026-10-07/published-catalogue.json` : exclusions et correction de la cible Arme d'hast sont appliquées par le générateur. `talents-sheet-snapshot.json` a été reconstruit à partir du CSV local inchangé et de `talent-legacy-aliases.json` ; le script de reconstruction locale utilisé est `E:/Outil MJ Warhammer/tmp/gemini-verifs/coherence/refresh-talents-local.mjs`. Les copies Functions sont synchronisées par `tools/sync-fiche-domain.mjs`.

La modification de `skills.json` nécessite une nouvelle empreinte `catalogVersion` dans `fiche-catalog.json`, dont le calcul inclut les compétences. `tools/recalculer-fiche-catalog.mjs` la régénère localement sans requête réseau et sans changer les tableaux de sorts ou de miracles ; ses copies sont synchronisées.

- `npm run check` : réussi, 1 050 tests (42 + 101 + 309 + 598), aucun échec.
- `node tools/sync-fiche-domain.mjs --check`, `node tools/sync-enquetes-domain.mjs --check`, `node tools/build-enquetes-vendor.mjs --check`, `node tools/mobile-fixture.mjs --check`, `node tools/recalculer-fiche-catalog.mjs --check` : réussis.
- Régénération du référentiel avec la graine locale : comparaison des empreintes identique avant la dernière correction Acteur ; la dernière génération a été suivie par la suite complète et la vérification des copies. `git diff --check` : réussi.
- Tests ajoutés : `tools/catalogue-coherence.test.mjs` (alias, exclusion et achat, compétences et groupes). Test existant modifié : `tools/fiche-engine.test.mjs`, trois attentes de correspondance Métier → Art remplacées parce que les groupes sont distincts ; l'alias Acteur → Divertissement reste testé.
- Les dépendances déjà installées dans le checkout principal sont accessibles depuis le worktree par deux jonctions `node_modules` locales ignorées par Git ; aucun fichier de ce checkout n'a été modifié.

Arrêt pour contre-vérification de Claude et répercussion ultérieure dans l'Outil MJ.
