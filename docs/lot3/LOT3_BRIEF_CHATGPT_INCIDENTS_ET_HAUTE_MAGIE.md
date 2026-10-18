# Brief pour ChatGPT — incidents et Focalisation (phase 3), Haute Magie et talents (phase 5)

11 octobre 2026. Chantier de code. Mêmes règles générales que [le brief précédent](LOT3_BRIEF_CHATGPT_DISSIPATION_ET_FICHES.md) (lis sa section « Contexte » et « Règles ») ; seules les listes de fichiers changent.

## Contexte supplémentaire

- Ton chantier dissipation est en cours de raccordement par un agent Claude (X-01/D-03 dans `v5-spell-contracts.js`, interface de dissipation, tests hérités). La Forme bestiale et Kadon ont été refaits sur les profils du livre (`js/data/v5-transformation-bestiary.js`).
- Plan : [LOT3_PLAN_CORRECTION_CLAUDE.md](LOT3_PLAN_CORRECTION_CLAUDE.md), phases 3 et 5. Décisions : [LOT3_CADRAGE_MAGIE.md](LOT3_CADRAGE_MAGIE.md) (« Arbitrages du 10 octobre » : D-05, D-06, D-07, D-09, D-10, D-17, D-20, D-22 ; Forme bestiale révisée le 11 octobre). Les numéros de ligne du plan ont bougé : relis le code actuel.
- Vérification de source obligatoire : lis la page avant de coder chaque règle et cite-la dans le test. Ta fiche W-05 affirmait que les mini-vortex de Tempête Magmatique étaient absents de Winds of Magic p. 136 ; ils y sont. Ne t'appuie pas sur le plan ou sur l'audit sans relire la page.

## Fichiers

- **Autorisés** : `js/core/v5-magic-miscasts.js`, `js/core/v5-magic-channelling.js`, `js/core/v5-magic-talents.js`, `js/core/v5-magic-high.js`, `js/core/v5-magic-arcane-unforgiving.js`, `js/core/v5-roll.js` (seulement pour L-13), `js/data/v5-magic-talent-coverage.json` (H-07, H-08), le test existant `tests/lot3-v5-finalization.test.js` (seulement la correction H-01 du test des runes sur Carreau), et de nouveaux fichiers `tests/lot3-v5-incidents-*.test.js` et `tests/lot3-v5-high-*.test.js`.
- **Interdits** (agent Claude en cours, ou fichiers partagés) : `js/core/v5-spell-contracts.js`, `js/core/v5-magic-dispel.js`, `js/core/v5-magic-arbitrations.js`, `js/core/v5-magic-effects.js`, `js/core/v5-magic-casting.js`, `js/core/store.js`, `js/core/v5-resources.js`, tout `js/ui/*`, `tools/build-v5-spell-contracts.mjs`, `js/data/v5-spell-contracts.json`, `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`, `sw.js`. Si une correction en exige un, ne le touche pas : décris le changement exact dans ton rapport.

## Phase 3 — incidents et Focalisation

Déjà faits par Claude : L-01, L-02, L-12 (Contre-réaction, D-08), dés explicites partout, identifiants d'incident uniques, Clairvoyance chaotique via le registre de Chance (avec reçu MJ pour `corruptionPerFortuneSpent`). Ne régresse pas.

| Id | Constat | Attendu |
| --- | --- | --- |
| L-03 | Regard maudit (Majeur, 1d10 heures, V5 p. 239) : la durée est copiée comme durée d'État décomptée en Tours ; `unremovable` n'est lu nulle part ; Perception de la Magie de l'observateur n'est pas retirée (`talentsLost` jamais relu, v5-magic-talents.js). | Durée en heures via les effets temporaires d'incident (1 Round = 10 s, D-11) ; état non retirable tant que l'effet dure ; observateur sans Perception de la Magie pendant l'effet. |
| L-04 | Puanteur infernale : trait jamais retiré (type `trait` absent des `miscastEffects`). | Trait ajouté puis retiré à l'expiration. |
| L-05 | Clairvoyance chaotique : le gain de Corruption par point de Chance dépensé n'est qu'un reçu. | Si c'est faisable sans `store.js` ni `v5-resources.js`, l'appliquer ; sinon décrire précisément le raccordement nécessaire. |
| L-06 | Drain de puissance (Majeur) : `v5-magic-talents.js` ne bloque que les effets `restriction` ; un `talent-disabled` actif n'empêche pas d'incanter. | Incantation et Focalisation refusées tant que l'effet est actif (vérifie p. 239 ce qui est désactivé). |
| L-07 | Plateau 91-95 (Multiplication d'infortune, Mineur, p. 238) : `ready:true` sans demander ni appliquer les deux jets supplémentaires. | Demander les deux jets explicites et appliquer les deux résultats, selon la p. 238. |
| L-08 | Pause : la compétence est trouvée par la regex `/résistance/`, qui peut prendre « Résistance à l'alcool » (score 90 au lieu de 20). | Comparaison exacte du nom replié. |
| L-09 | Pause et interruption via `applyChannelling` : journal « Focalisation (undefined) : +undefined DR » ; elles posent `magicAttemptTurn`, ce qui bloque Mage de guerre. | Journal correct ; ne pas compter une pause ou une interruption comme tentative magique. |
| L-10 | Désavantage net avec un choix « keep » indisponible : exception « Choix de jet indisponible » au lieu de l'inversion forcée (channelling ; même défaut en casting, **interdit** : décris le correctif). | Retenir l'option unique quand l'inversion est forcée. |
| L-11 | `Store.previewMiscast` ne vérifie pas les talents (Diction instinctive, Harmonisation). | `store.js` est interdit : rends la vérification disponible côté moteur (fonction pure appelée par l'aperçu d'incident) et décris l'appel à ajouter. |
| L-13 | D-09 : le gain d'une Focalisation critique ne doit pas utiliser le plancher +5 DR du lot 2 (`v5-roll.js`) ; DR réels + 2 × BFM. D-10 : une compétence importée « Focalisation (Vent) » vaut Focalisation pour ce Vent (aujourd'hui repli silencieux sur FM, v5-magic-channelling.js). | Plancher conservé pour tous les autres Tests (le vérifier par un test lot 2 existant). |
| L-14 | D-20 : l'armure non portée (`equipped:false`) entre dans la pénalité magique (`calculateMagicArmorPenalty`). | Exclue, si le champ existe dans le modèle ; sinon dis-le. Si la fonction est dans un fichier interdit, décris le correctif. |

## Phase 5 — Haute Magie et talents

| Id | Constat | Attendu |
| --- | --- | --- |
| H-01 | Runes des Cadai acceptées hors Haute Magie (`v5-magic-talents.js`) : Focalisation des Vents ou sort d'Arcane (Carreau) acceptent une rune. Le test `tests/lot3-v5-finalization.test.js` (cas Carreau) valide ce comportement à tort. | Rune seulement en Focalisation `high` et sur un sort de domaine `high` (HEPG p. 84) ; D-05 : une rune par jet (Test, épuisement, Corruption) ; relance de Corruption liée à un sort de Haute Magie. Corriger le test existant. |
| H-02 | Plafond des runes figé à la première pose, non recalé sur le BFM courant (`v5-magic-high.js`). | Plafond = BFM courant. |
| H-03 | Destruction des Arcanes : le Test de Focalisation contre l'objet magique ignore pénalité d'armure et États (`v5-magic-arcane-unforgiving.js`). Exemple : 3 PA métalliques au corps, jet 58 → +1 DR et réussite ; attendu −2 DR et échec. | Mêmes modificateurs que la Focalisation (HEPG p. 86 ; V5 p. 237). Ne pas toucher à la dégradation physique d'armure déjà validée. |
| H-04 | Œil de la tempête rang 2 neutralise Exténué aussi sur les Tests de pause et d'interruption. | Seulement Focalisation et Incantation. |
| H-05 | D-06 : Bénédiction de Lileath, cumul lu sur le talent de la cible (`v5-magic-effects.js`, **interdit**). | Décrire le correctif exact. |
| H-06 | D-07 : Résistance à la Magie contre Puissance totale (code dans `v5-spell-contracts.js`, **interdit**). | Décrire le correctif exact : NI ignoré, −3 DR aux effets seulement. |
| H-07 | Les 19 talents classés moteur/fiche/rappel (`v5-magic-talent-coverage.json`) : une clause « moteur » doit avoir une sonde exécutée. | Pour chaque clause « moteur », ajoute une sonde dans un nouveau fichier de test ; si la clause n'est pas réellement exécutée, reclasse-la (rappel ou donnée MJ) et dis-le. |
| H-08 | D-17 : Seconde vue en zone saturée = rappel MJ. | Vérifier le classement dans la couverture. |

## Fin

Tes tests verts ; `node --test` complet lancé une fois à la fin (signale les échecs hors de tes fichiers sans les corriger). Rapport court en français : par item ce qui est fait avec la page lue, tests (rouges vus ou non), et la liste exacte des changements à faire dans les fichiers interdits (fichier, fonction, comportement attendu).
