# Phase F0 — Plan d'audit des règles, sans implantation

Date : 22 octobre 2026. Base figée : `main` à `ad092cd`. Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`.

## Cadre et priorités

Le brief lu est `C:/Users/arnot/.codex/worktrees/divin-v5/Outil MJ Warhammer/docs/plans-gpt/BRIEF_GPT_PHASE_F_AUDIT.md` (absent du main de départ). L'instruction explicite de partir de main prévaut sur l'ancienne base des règles communes. L'ordre livre par livre de F0 prévaut sur leur étape générique de complément préalable L19-L26. Les compléments seront recensés à leur tour, avec `addedOn: "2026-10-21"` pour L19-L26.

Lire les arbitrages du 21/10, les décisions du 22/10, la réserve divine et le plan de fin de projet avant de qualifier une règle. Pas de nouvelle décision MJ. Q18 exclut les sous-systèmes désignés ; aucun ingrédient magique exigé ; Petit V4 local conservé. Aucun changement dans `js/`, dans un test existant, dans les arbitrages ou dans les sources de catalogue. Ni push, ni publication, ni fusion.

## Acceptation commune

- Extraction physique page par page avec `pdftotext -layout -f N -l N`, uniquement dans `tmp/audit/`. Le numéro de `page` est le folio imprimé ; la preuve de lecture donne séparément la page physique et l'empreinte PDF.
- Une entrée par mécanique autonome. Pas d'étiquette globale de couverture pour un chapitre. Les tableaux conservent leurs lignes distinctes si les effets diffèrent. Les pages non lues restent explicitement à faire.
- `automatise` exige un chemin moteur effectif ; `assiste` exige un flux proposé au MJ ; une simple saisie générique ne prouve pas une règle. Un texte affiché vaut `rappel`. Au moindre doute : `absent`, avec limite expliquée et recherches consignées.
- Les domaines déjà inventoriés sont référencés par `coveredBy: fichier#id`, avec vérification de l'identité et de la clause. Un inventaire ancien ne certifie pas à lui seul la couverture actuelle.
- Chaque `absent` ou `rappel` jouable produit un sélecteur de F1 ; cette inscription n'autorise aucune implantation F2.
- Validation des données, de la correspondance exacte registre/sélecteurs, des références locales et des limites de résumé ; puis `node --test --test-concurrency=4` avant chaque commit. Seul E0 externe est toléré, selon le brief. `git ls-files --eol` sans CRLF et `git diff --check`.
- Recette finale : `node tools/run-divine-recipe.mjs`. Conserver tous les reçus dans `tmp/`, avec les échecs réels et leur portée.
- Commits locaux terminés par `(GPT)`, un par livre, ou par gros chapitre de L06. Plan et outillage ont leurs propres commits préparatoires.

## F00 — Traçabilité de l'extraction et contrôle de l'inventaire

Objectif : rendre la provenance et les contrôles reproductibles sans toucher au jeu. Identifiants : aucun, infrastructure d'audit. Fichiers autorisés : nouveaux `tools/audit/*`, nouveaux `tests/audit-*.test.js`, ce plan. Localiser les manifestes `docs/divin/DIVIN_CORPUS_LIVRES*.json` et les inventaires existants. Tests d'abord : page physique indépendante du folio, refus de sortie hors `tmp/audit/`, erreur Poppler propagée, rejet de faux `coveredBy`, sélecteurs manquants/surnuméraires, résumé trop long. Acceptation : `node --test tests/audit-*.test.js` puis suite complète. Risque : faible, outils hors application.

## F06 — Livre de base V5 anglais (L06), gros chapitres successifs

Objectif : audit clause par clause, en commençant par les Tests, puis les applications des compétences, combat, blessures/soins, maladies/poisons, corruption, entre-aventures, compétences/talents/carrières, magie générale, environnement et équipement mécanique. Identifiants : `F-L06-0001` et suivants, stables et jamais renumérotés. Arbitrages : tous ceux qui concernent la clause, règles V5 prioritaires. Chercher les intitulés anglais et français dans `js/core`, `js/data`, `js/ui` et les contrats ; lire les fonctions retenues et leurs lecteurs. Une famille homogène au plus par commit.

Fichiers autorisés : `docs/AUDIT_REGLES.json`, `docs/AUDIT_REGLES.md`, `docs/plans-gpt/SELECTEURS_PHASE_F.json`, `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_F.md`, `docs/plans-gpt/RAPPORT_GPT_PHASE_F.md`, nouveaux fichiers sous `tools/audit/`. Preuves de lecture et d'exécution sous `tmp/audit/` seulement. Cas d'acceptation : chaque entrée possède sa page lue, chaque couverture annoncée possède son symbole et son périmètre, chaque lacune jouable figure exactement une fois dans les sélecteurs. Acceptation commune. Risque : élevé de faux positif de couverture ; l'audit reste statique, sans prétendre avoir rejoué les règles à la table.

## F05 — Noms français (L05)

Objectif : rattacher les noms officiels FR aux identités L06 sans importer les mécaniques V4. Identifiants L06 conservés ; références FR dans les notes/provenances. Chercher les noms correspondants dans les pages FR ciblées. Aucun nouveau doublon de règle. Fichiers autorisés et acceptation : ceux de F06. Risque : divergence d'édition à expliciter. Un commit L05.

## Livres suivants, un lot et un commit par livre

Pour chaque lot : objectif = inventorier les mécaniques propres hors domaines déjà couverts ; identifiants `F-Lxx-0001` et suivants ; rattachements par `coveredBy` aux inventaires existants ; conversion V4 vers V5 proposée uniquement dans `v5Proposal`. Emplacements à rechercher : sommaire et chapitres du PDF du manifeste, `js/core`, `js/data`, contrats et inventaires existants. Fichiers autorisés et acceptation : F06. Risque : élevé pour tableaux et variantes V4 ; jamais d'attribution inventée.

| Ordre | Lot/livre | Priorité de lecture et contrôle |
| --- | --- | --- |
| 1 | F17 / L17 | Magie générale, Vents, Fléau, objets ; renvoyer sorts et familiers existants |
| 2 | F11 / L11 | Capacités hors bestiaire, récolte et usages de composants ; ingrédients en rappel |
| 3 | F13 / L13 | Combat, armes, soins, montures, alternatives d'Avantage et hors-granularité Q18 |
| 4 | F14 / L14 | Navigation et combat naval, compétences et talents propres |
| 5 | F16 / L16 | Combat, fortifications, mécanique naine hors inventaire runique |
| 6 | F18 / L18 | Mécaniques du compagnon hors scénarios/PNJ |
| 7 | F19 / L19 | Middenheim : seules mécaniques jouables autonomes |
| 8 | F20 / L20 | Altdorf : seules mécaniques jouables autonomes |
| 9 | F21 / L21 | Compagnon Empire in Ruins, hors scènes/PNJ |
| 10 | F22 / L22 | Compagnon Horned Rat, hors scènes/PNJ |
| 11 | F23 / L23 | Compagnon Enemy in Shadows, voyage et procédures |
| 12 | F24 / L24 | Rough Nights, mécaniques autonomes hors scènes/PNJ |
| 13 | F25 / L25 | Navigation, navires, environnement marin |
| 14 | F26 / L26 | Navigation fluviale, herbes, procédures |
| 15 | F01 / L01 | Archives 2 : mécaniques propres |
| 16 | F02 / L02 | Archives 3 : mécaniques propres |
| 17 | F03 / L03 | Archives 1 : mécaniques propres |
| 18 | F04 / L04 | Compétences et talents de filous |
| 19 | F07 / L07 | Lustria : environnement et mécaniques propres |
| 20 | F08 / L08 | Hauts Elfes : mécaniques propres |
| 21 | F09 / L09 | Elfes noirs : mécaniques propres |
| 22 | F10 / L10 | Sylvanie : mécaniques propres |
| 23 | F12 / L12 | Tribus : mécaniques propres |
| 24 | F15 / L15 | Nains : mécaniques propres |

## Exclusions et clôture

Chaque lacune jouable est couverte par le lot du livre et son sélecteur, pas par un lot d'implantation. Les sources non acquises, PNJ/scénarios, ambiance, listes sans mécanique et exclusions Q18 ne deviennent pas des tâches d'implantation. Si une règle est dans le registre mais exclue, sa note identifie l'arbitrage.

Le rapport final distingue extraction, lecture, audit statique, exécution des tests et recette navigateur. Une empreinte ne prouve pas une lecture. En cas de dépassement de session, appliquer la règle « Volume » des règles communes : terminer le gros chapitre courant et son commit, laisser un rapport partiel explicite avec tous les lots restants ; ne pas annoncer un livre entier traité sur une lecture partielle.
