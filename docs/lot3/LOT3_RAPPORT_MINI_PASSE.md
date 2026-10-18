# Rapport — Mini-passe finale avant livraison `3.15.0`

Date : 18 octobre 2026  
Branche : `codex/lot2-talents-v5`  
Périmètre : clôture des 5 reliquats de `docs/lot3/LOT3_BRIEF_CHATGPT_MINI_PASSE.md`

---

## 1. Statut des 5 points

| Point | Sujet | Statut | Rouge observé avant correction | Couverture de test |
| --- | --- | --- | --- | --- |
| **1** | **Tableaux et trous RTDB (`null` / entrées non-objets)** sur `equipment` (`equipment[].keywords`, `equipment[].locations`), `weapons`, `armours`/`armors`/`armor`, `traits` (`baseTraits`, `temporaryTraits`, `extensions.traits`), `states`, `actions`, `diceLines`, `spells`, `talents` (`acquiredV5TalentCoverage`, `importedPjTalentPriorities`), `skills`, `spellEffects`, `suppressedSpellIds`/`suppressedEffectIds`, `persistentCharacters` sans `armor` | **Fait** | **Oui** (`node --test tests/lot3-v5-reliquats.test.js` : échec sur `states`, `traits`, `actions`/`diceLines`, `spellEffects` et `persistentCharacters`) | `tests/lot3-v5-reliquats.test.js` (2 tests unitaires + Store/persistance) |
| **2** | **Champ UI « Test secondaire de `<cible>` (1d100) »** retiré en doublon de `js/ui/v5-magic-controls.js`, affichage conditionnel aux seuls sorts ayant un test secondaire par cible dans le contrat, y compris `Cor du Andar` (`attitudeModifiers` sur cible hostile → `[data-focus-key="wom-<targetId>-fearRoll"]`) | **Fait** | **Oui** (`node tests/lot3-v5-relecture2-ui-browser.mjs` : échec `Reliquat 2 Peur du Cor sur ennemi` avant correction de `js/ui/v5-spell-options.js`) | `tests/lot3-v5-reliquats.test.js` + `tests/lot3-v5-relecture2-ui-browser.mjs` (bureau/mobile, sombre/parchemin) |
| **3** | **Détection stricte `isTargetDaemon`, `isTargetUndead`, `isTargetConstruct`, `isTargetEthereal` et `hasTargetNatureOrTrait`** sans faux positif par sous-chaîne (« Chasseur de démons », « Démonologue », « Pas un Démon », « Chasseur de morts-vivants », « Chasseur d’Artificiels », « Haine (Éthérés) ») dans `v5-magic-attributes.js`, `v5-magic-effects.js` (`resolveSpellDamage`), `v5-spell-contracts.js` (`targetRule`, `engagedEnemyLivingOnly`, `minor-banishment`) et `v5-magic-turn.js` (`requiredAnyTrait`, `doubleOnTrait`) | **Fait** | **Oui** (`node --test tests/lot3-v5-reliquats.test.js` : `Chasseur de démons` recevait à tort `daemonBonus` et était exclu par `targetRule.exceptAnyTrait` sur `Bannissement Majeur` / `Goût de la Mort`) | `tests/lot3-v5-reliquats.test.js` + `tests/lot3-v5-audit-natures-import.test.js` |
| **4** | **Harmonisation des libellés de difficulté V5** (`Intermédiaire (+0 DR)`, `Accessible (+2 DR)`, `Difficile (−1 DR)` / `(−2 DR)`) dans `Magie` (`Drain de Magie`, `Blizzard enflammé de Ygethmor`, `Bannissement Majeur`, `Pulvérisation Musquée`), `Miracles` (`Attaque Rapide` — libellé uniquement, sans mécanisation), `tools/v5-overcast-specific.mjs`, `js/ui/resolution-panel.js` et `js/core/v5-spell-contracts.js` | **Fait** | **Oui** (`node --test tests/lot3-v5-reliquats.test.js` : échec sur les options `overcast.specific` contenant encore `(+20)`, `(−10)`, `(−20)`) | `tests/lot3-v5-reliquats.test.js` (6 tests dédiés) |
| **5** | **Apothéose (`+10 DR`, HEPG p. 86)** : ajout du rappel `Vous gagnez du Yenlui (Sombre).` dans la description du sort (`Magie!G75`) et dans le contrat généré | **Fait** | **Oui** (vérifié sur la base avant-passe `tmp/lot3/reliquats-2026-10-17-catalogue-before.json` et testé dans `tests/lot3-v5-reliquats.test.js`) | `tests/lot3-v5-reliquats.test.js` |

---

## 2. Versions avant / après du catalogue

| Champ | Avant mini-passe (R2 du 14/10) | Après mini-passe |
| --- | --- | --- |
| `localRevision` | `2026-10-14-catalogue-v5-relecture-2` | `2026-10-17-catalogue-v5-reliquats` |
| `contentVersion` | `references:91baffb889130b513c59df546f8c81ff9bf003fbc1ec47e1e23877959d4f7573` | `references:3755f725aedded0b38face136e08c2214af15e9c299412702185c67740ff56ac` |
| `magic.catalogVersion` | `sha256:2ebb39e1fd936c250a8f3a90b99bf5c3afdad337d987b4bc7a7d54256eb2638f` | `sha256:267a5ba2a20c19f5b5ae6b5576f8932ca9e88393fd5df6a718fe9448e6f8077c` |
| `Magie.csv` (`sha256`) | `f1db35feb621b9cb1c4f95a70a34a2fe65ebea49719349abc5ad8f65ee0d6f1d` | `8aca1ccac29f4f0a56388efdef7db700896f29e66857fad50fdc3829bd283db5` |
| `Miracles.csv` (`sha256`) | `6137f5e1db89d7da78e1b6dfdc029fbefbb4ff4b6691e5b4f69168bf6fdbe183` | `6bf08ed826679ff6d481765101d7df09d3bea4dab006952f55f4bf19089c43c6` |

Classeurs mis à jour :
- `C:\Users\arnot\.codex\visualizations\2026\10\13\01a13662-2a3d-7f30-b363-a6104eddf4a2\excel-magic\outputs\01a13662-2a3d-7f30-b363-a6104eddf4a2\Magie_V5.xlsx` (1946 cellules vérifiées par `verify-magic-excel.py`)
- `C:\Users\arnot\.codex\visualizations\2026\10\13\01a13662-2a3d-7f30-b363-a6104eddf4a2\excel-magic\outputs\01a13662-2a3d-7f30-b363-a6104eddf4a2\Miracles_V5.xlsx` et `docs/lot3/Miracles_V5_cellules.json`

---

## 3. Nombre de cellules à reporter par onglet

Fichier unique de report : [`docs/lot3/LOT3_A_REPORTER_DANS_LA_FEUILLE_FINAL.md`](LOT3_A_REPORTER_DANS_LA_FEUILLE_FINAL.md)

| Onglet Google Sheets | Nombre de cellules à reporter (cumulé depuis le report du 14 octobre) | Détail |
| --- | ---: | --- |
| **`Magie`** | **25** | 21 cellules de la seconde relecture + 5 cellules de la mini-passe (`G25`, `G75`, `G80`, `G84`, `G107`), avec `G75` (`Apothéose`) consolidée |
| **`Miracles`** | **1** | `E13` (`Attaque Rapide` — `Test d'Initiative Intermédiaire (+0 DR)`) |
| **Total** | **26** | Aucun report automatique dans Google Sheets effectué |

---

## 4. Résultat des commandes de vérification

| Commande | Résultat |
| --- | --- |
| `node --test` | **PASS** — `2256 pass, 0 fail` |
| `node tools/check-lot3-generation.mjs` | **PASS** — `Deux générations identiques : 13 fichiers, 277 contrats.` |
| `node tests/browser-magic-v5-smoke.mjs` | **PASS** — `Tests navigateur Lot 3 Magie V5 (UI réelle + Captures + Offline SW) : OK` |
| `node tests/lot3-v5-magic-2b-ui-browser.mjs` | **PASS** — `Lot 3 Magie V5 2b UI : recettes existantes et phase 9 réussies.` |
| `node tests/lot3-v5-relecture2-ui-browser.mjs` | **PASS** — `R2 UI : quatre configurations bureau/téléphone sombre/parchemin vertes.` |
| `node tests/lot3-v5-relecture2-history-browser.mjs` | **PASS** — `Historique R2 : vrai index.html, IndexedDB, rechargement, clic Annuler et raccourci refusé vérifiés sur deux largeurs.` |
| `node tests/lot2-combat-v5-browser.mjs` | **PASS** — `Lot 2.1/2.2 UI: desktop + phone ... passed.` |
| `node tests/browser-references-smoke.mjs` | **PASS** — `Aides navigateur : alias/talents/magie/source locale/échec honnête/hors ligne/recherche/mobile sans erreur OK` |
| `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run-lot2-v5-25-emulators.ps1 -TestScript tests/lot3-v5-35-cloud-browser.mjs` | **PASS** — `PASS — recette 3.5 magie cloud, native IDB et historique (code 0)` |
| `node tools/build-lot3-local-release.mjs` & `node tests/lot3-v5-35-release-browser.mjs` | **PASS** — `PASS — exported 3.15.0, 153 hashes, desktop/mobile startup, real offline PWA and native IDB` |
| `git diff --check` | **PASS** — `0 erreur` |
