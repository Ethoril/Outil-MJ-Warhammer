# Rapport — phase E (mots-clés, bestiaires, Traits), exécutant : Claude Pro

Branche `pro/phase-e`. Plan : `PLAN_PRO_PHASE_E.md`. Choix d'interprétation : `CHOIX_EXECUTANT_PHASE_E.md`. Rapport **partiel**, tenu à jour à chaque lot (une session peut s'interrompre sur la limite de quota : la reprise se fait au « lot suivant »).

## Lots

| Lot | État | Commit |
|---|---|---|
| E1 complément d'inventaire L18-L26 (443 profils, 39 Traits et capacités) et outils d'extraction | FAIT | 7c124f6 |
| Plan de lots | FAIT | f1cfcc2 |
| K1 référentiel de mots-clés (hiérarchie, alias, garde-fou) | FAIT | 8cea7d7 |
| K2 ajout par le MJ (store : commande annulable, refus des doublons ; interface : boîte d'ajout) | FAIT | caractérisation b8f3f59, store 4176c31, interface 0e8e350 |
| K3 mots-clés portés (profils, participants, PJ, import JSON, sélecteur) | FAIT | 0e8e350 |
| K4 spécialisations à cible (Haine, Sans peur, Haine-Trait, Dévotion de la Guerrière, migration) | FAIT | 59fdf09 |
| K5 effets « contre les X » (natures, contrats, sources de Psychologie) | FAIT | 6969097 |
| D1 à D24 profils de bestiaire (modèle, import livre par livre) | FAIT : D1 à D24 (L06, L11, L01, L02, L03, L04, L07, L09, L10, L12, L13, L14, L16, L17, L18, L19, L20, L21, L22, L23, L24, L25, L26) ; prochain lot : B1 (L26 : E-D32 ; L25 : E-D31 ; L24 : E-D30 ; lecture élargie `setLenient` déjà active, voir E-D22 ; Blessures absentes : E-D23 ; L18 : E-D24 ; L19 : E-D25 ; L20 : E-D26 ; L21 : E-D27 ; L22 : E-D28 ; L23 : E-D29) | voir `git log` |
| B1 constructeur profil → participant (`buildParticipantFromBestiary`, choix E-B1) | FAIT | voir `git log` |
| B2 bibliothèque de profils (UI : filtres livre/genre/mot-clé/nom, fiche lecture seule, ajout au combat ×N, copie en Réserve, chargement paresseux) | FAIT (choix E-B2) | voir `git log` |
| B3 raccordement des sorts d'invocation (Relever les morts, Réanimation, Manifestation de Démon Mineur ; choix E-B3) | FAIT | voir `git log` |
| T1 natures (Éthéré, Démoniaque, Protection, Immunité feu/froid/contondant, Artificiel : Endurance pour Volonté ; rappels) | FAIT (choix E-T1) | voir `git log` |
| T2 à T12, F1-F2, S1, R1 | À FAIRE | |

## Dernière suite complète

`node --test --test-concurrency=4` : tout vert sauf `E0 indépendant — la recette refuse un cwd externe avant de créer un reçu` (lit `tmp/divin/recipe-receipt.json`, produit par `node tools/run-divine-recipe.mjs` : échec antérieur à la phase, à relancer au lot R1).

## Assertions de tests existants modifiées

- B3 : `tests/pro-d5-demonologie.test.js` (Manifestation : le contrat est un `summon.profiles`, plus `assistedSummon`).
- K4 (Dévotion de la Guerrière : la spécialisation est un mot-clé du référentiel, plus de texte libre) : `tests/divin-v5-a1-sans-peur.test.js` (« Gobelins » devient le nom canonique « Gobelin », 2 assertions) ; `tests/divin-v5-a4-devotion.test.js` (test réécrit : suggestions de mots-clés, aucun champ de texte, texte libre refusé, alias résolu) ; `tests/divin-v5-p4c-extras.test.js` (4 assertions : texte saisi, spécialisation posée, liste des refus, type et libellé du champ) ; `tests/divin-v5-a4-devotion-browser.mjs` (parcours navigateur).

## Points d'attention

- `sw.js` : seuls les chemins des nouveaux fichiers sont ajoutés à `ASSETS_TO_CACHE` (le test `tests/sw.test.js` l'exige) ; `CACHE_NAME` n'est pas touché : la version reste à l'orchestrateur (E-K11).
- Le parcours navigateur complet (`tests/browser-smoke.mjs`) s'exécute avec `PLAYWRIGHT_EXECUTABLE_PATH` pointant vers Edge ; il passe avec le sélecteur de mots-clés du formulaire de profil.
