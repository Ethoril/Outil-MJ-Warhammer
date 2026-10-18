# Brief pour ChatGPT — suivi exhaustif des sorts et des clauses magiques (C-02)

11 octobre 2026. **Chantier sans code.** Il produit le livrable demandé par [la passation de relecture](LOT3_PASSATION_RELECTURE_CLAUDE.md) : « un suivi exhaustif des 277 identités et des clauses magiques, avec statut conforme / anomalie / donnée MJ nécessaire / rappel / hors périmètre / non vérifié ; distinguer ce qui a été lu de ce qui a été exécuté et testé ; indiquer exactement ce qui n'a pas pu être vérifié ».

## Règles

- Contexte et règles générales : [ton premier brief](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) (« Contexte » et « Règles »).
- **Un seul fichier créé** : `docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.md` (et, si utile, un `docs/lot3/LOT3_SUIVI_EXHAUSTIF_MAGIE.json` de même contenu). **Aucun autre fichier modifié** : un agent Claude corrige en parallèle des défauts d'interface et de moteur (`js/ui/*`, `js/core/v5-magic-*`, `v5-spell-contracts.js`, `sanitize.js`, `sync-protocol.js`, `v5-resources.js`, générateur, matrice).
- Tu peux **exécuter** du code en lecture (scripts Node dans un dossier temporaire hors du dépôt, ou `node -e`) pour appeler `previewSpellExecution`/`applySpellExecution` sur un Store de test : c'est même attendu pour le statut « exécuté ». Ne lance pas le générateur dans le dépôt (il réécrit la matrice) ; ne lance pas `node --test` en entier pendant que l'agent Claude travaille (résultats instables) — tes scripts ciblés suffisent.
- Sources : PDF personnels dans `E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\` (Livre de base V5 pp. 235-255, bestiaire pp. 325-335 ; High Elf Players Guide pp. 80-89 ; Winds Of Magic). Relis la page avant tout statut « conforme » ou « anomalie » et cite-la. Ne recopie pas le texte anglais.
- Rappel d'exigence : ta fiche W-05 affirmait à tort que les mini-vortex de Tempête Magmatique étaient absents de WoM p. 136. Un statut ne s'appuie jamais sur le plan, l'audit ou une fiche sans relecture de la page.

## Entrées

- Contrats actuels : `js/data/v5-spell-contracts.json` (277 identités), exécution dans `js/core/v5-spell-contracts.js` et modules `js/core/v5-magic-*.js`.
- Catalogue épinglé : `js/data/reference-snapshot.json`.
- [Matrice](LOT3_MATRICE_CONTRATS_V5.md) (123 calculables / 132 données MJ / 22 rappels ; sections « Options de surpuissance propres aux sorts » et « Clauses rappelées à l'exécution »).
- [Fiches de correction](LOT3_FICHES_CORRECTION_CONTRATS.md) (67 « à corriger », W-05 tranché), [plan](LOT3_PLAN_CORRECTION_CLAUDE.md), [décisions du MJ](LOT3_CADRAGE_MAGIE.md) (elles priment), [audit initial](LOT3_AUDIT_SORTS.md).
- Talents magiques : `js/data/v5-magic-talent-coverage.json`, `js/data/v5-magic-talent-sources.json`, `js/data/v5-talent-coverage.json` (les 28 talents réservés au lot 3 ; 9 ont des clauses différées hors périmètre selon la passation).
- Tests existants : `tests/lot3-*.test.js`, `tests/browser-magic-v5-smoke.mjs`, `tests/lot3-v5-magic-2b-ui-browser.mjs`.

## Livrable

### 1. Un tableau par identité (277 lignes)

Colonnes : **Id** (`spell-audit-…`) · **Sort** · **Famille** (Domaine V5, Arcanes, mineurs, Haute Magie, Arcanes elfiques, mineurs elfiques, Winds of Magic, catalogue) · **Source/page** · **Traitement matrice** (calculable / données MJ / rappel) · **Statut** · **Clauses en écart** (renvoi aux Id V-xx/W-xx des fiches quand ils existent) · **Preuve** (« lu » : page + contrat lus ; « exécuté » : aperçu/application lancés par ton script, avec entrées et résultat clé ; « testé » : nom du test existant qui couvre le sort) · **Non vérifié** (ce qui manque et pourquoi).

Statuts : **conforme** (toutes les clauses mesurables exécutées comme la source et les décisions) ; **anomalie** (au moins une clause mesurable fausse ou absente, à renvoyer vers une fiche ; si aucune fiche n'existe, en créer l'identifiant `N-xx` dans ton document avec la même précision que les fiches) ; **donnée MJ nécessaire** (le moteur exécute avec un fait que le MJ fournit : dire lequel) ; **rappel** (clause narrative ou non mesurable, affichée en rappel) ; **hors périmètre** (justifier) ; **non vérifié** (dire pourquoi).

Un sort a un statut global (le pire de ses clauses) ; détaille les clauses quand ce n'est pas trivial.

### 2. Les clauses de talents magiques

Même principe pour chaque clause des talents du lot 3 (registre de couverture) : talent · clause · source/page · classement (moteur / fiche / rappel / différé) · statut · preuve (lu / exécuté / testé) · non vérifié.

### 3. Synthèse en tête du document

Comptes par statut et par famille ; comptes « lu seulement » / « exécuté » / « testé » ; liste des nouvelles anomalies `N-xx` non couvertes par les fiches ; écarts entre la matrice (« calculable ») et ce que tu as réellement observé ; liste exacte de ce qui n'a pas pu être vérifié (sources absentes, profils, portées et aires que le moteur ne contrôle pas, interface non exercée…).

## Méthode conseillée

1. Script d'inventaire qui charge les 277 contrats et la matrice, et prépare les lignes.
2. Script d'exécution : pour chaque sort, un Store de test (inspire-toi de `tests/lot3-v5-magic-34.test.js`, qui applique déjà les 277 contrats avec dés, cibles et faits explicites) ; note les effets produits (dégâts, états, couches, durées, rappels, refus).
3. Relecture par famille, page par page, en comparant à la sortie exécutée.
4. Commence par les 116 sorts du livre V5 (source la plus sûre), puis Haute Magie et elfiques, puis Winds of Magic, puis le catalogue.

## Fin

Le document, plus un rapport court : comptes par statut, nombre de nouvelles anomalies, ce qui n'a pas pu être vérifié, et les éventuelles contradictions trouvées avec les fiches ou la matrice.
