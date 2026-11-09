# Passation du 09/11/2026 : suite du rapport d'analyse du 08/11 et du chantier Q6

Pour l'agent qui reprend. Lis d'abord `CLAUDE.md` (règles de travail), puis ce document. Le rapport d'origine est `docs/RAPPORT_ANALYSE_08_11_2026.md`, et son annexe `docs/RAPPORT_ANALYSE_08_11_2026_ANNEXE.md` (400 Ko) donne la preuve et la piste de chaque constat : ne la lis pas en entier, cherche-y l'identifiant (`#### REGLES-05`, par exemple).

## 1. État des dépôts au 09/11 au soir

| Dépôt | En production | En local, non poussé |
|---|---|---|
| Outil MJ (`E:\Outil MJ Warhammer`, `main`) | 3.44.0 + correctif de CI `8119571` (GitHub Pages ; CI GitHub verte) | ~35 commits : chantier Q6 (T0 à T8, T10, T11, décisions CA13 à CA34), libellés « Chance » (`d4f75d3`), cette passation |
| Fiches (`E:\Projet Warhammer Ennemi Intérieur\ennemi-interieur-wfrp4`, `master`) | `616caf5`, qui contient `6d6fa3d` (libellés « Chance ») | rien |
| Map Display (`E:\rpg-map-display`, `main`) | `6a7ccdf`, avec MAP-02 et MAP-06 (`e107c1f`) et l'amendement du contrat §10 | rien |

L'arbre de l'outil est propre, sauf `tests/helpers/lot3-elven-fixture.js`, qui ne diffère que par les fins de ligne : ne pas le commiter. La suite unitaire complète était verte au dernier passage (6 035 `.js` + 148 `.mjs`, après T10).

**Publication** : rien de ce qui est en local n'est publié. Une publication se fait par `node tools/bump-version.mjs X.Y.Z` (prochaine : 3.45.0), une note dans `docs/SUIVI_EVOLUTION.md`, un commit, puis un push sur `main`, et **seulement après le feu vert du MJ**. Vérifier ensuite la version servie (`js/version.js` en ligne) et la CI.

## 2. Chantier Q6 : les Tests secondaires passent par l'agrégateur

Cadrage, décisions et tâches : `docs/specs/tests-secondaires-agregateur/` (`spec.md` : critères CA1 à CA34 ; `tasks.md` : T0 à T11 ; `inventaire.md` ; `plan.md`). Le calcul commun est dans `js/core/v5-test-modifiers.js` (`resolveV5TestModifiers`, `finalizeV5TestModifiers`, `previewV5SecondaryTest`) : son en-tête explique ce qui est commun, ce qui reste propre au combat et comment les questions (`needsInput`) remontent à l'écran.

**Fait** : T0 à T8, T10, T11, toutes les décisions CA13 à CA34. Chaque lot a ses tests dans `tests/unit/moteur/q6-*.test.js` et ses parcours `tests/q6-t10-*-browser.mjs`.

**Reste à faire, dans cet ordre :**

1. **CA35, compteur unique d'Obstiné** (décision du MJ, pas encore inscrite dans `spec.md`) : un seul usage « une fois par séance » du talent Obstiné (`talent-strong-minded`, V5 p. 127), quel que soit l'écran. Une fois utilisé, le choix est grisé partout avec son motif, jusqu'à la séance suivante. Le compteur existe déjà au combat (`extensions.v5.actionLedger.quotaUsage`, `quotaId: 'talent:strong-minded'`, remis à zéro par « Commencer une nouvelle séance »). L'usage ne se décompte qu'à l'application du Test, et l'annulation par l'historique le rend.
   Un début de travail, ni testé ni commité, a été mis de côté : `docs/passation/q6-ca35-obstine-wip.patch` (modification de `js/core/store.js`) et `docs/passation/q6-ca35-v5-obstinate.js.txt` (nouveau module `js/core/v5-obstinate.js`). On peut le reprendre (`git apply`, puis renommer le `.txt` en `js/core/v5-obstinate.js`) ou repartir de zéro. **Un nouveau module doit être ajouté au précache de `sw.js`**, sinon `tests/unit/donnees/audit-meta-production.test.js` échoue.
2. **CA36, Obstiné proposé partout** : aussi au Test de Chevaucher, au recul d'arquebuse, à la Warp Blade, à Déterminé, aux résistances des cibles de sorts et aux Tests de fin de Tour (`preRollTalent: 'strong-minded'`).
3. **Petit défaut d'écran** : dans le panneau de magie, une question des Tests du sort disparaît une fois répondue, et le MJ ne peut plus revenir sur sa réponse.
4. **T9, fusion** : suite complète une fois ; parcours navigateur des zones touchées (`tests/q6-t10-magie-browser.mjs`, `tests/q6-t10-ecrans-browser.mjs`, `tests/engagements-plateau-browser.mjs`, `tests/fiches-pj-browser.mjs`, `tests/browser-smoke.mjs`, `tests/browser-startup.mjs`), chacun sous `timeout 120` ; relecture complète de la spec par un vérificateur indépendant (code + pages du livre citées) ; CA11 : recharger une sauvegarde d'avant le chantier et vérifier qu'elle donne les mêmes résultats sans État. Puis cocher T9 et proposer la release 3.45.0 au MJ.

**Limites connues, à signaler au MJ, pas à corriger sans lui** : la poursuite n'est appelée par aucun écran (CA32 n'est vérifié qu'en unitaire) ; si le guidage de la Comète rate d'office, la zone finale est laissée au MJ ; en convalescence, un saut de plusieurs jours applique une seule réponse d'État à tous les jours.

## 3. Rapport d'analyse du 08/11 : où en est chaque constat

### Fait (en production ou en local)
- **Livraison de `babe2ba`** : BOOT-01, CAMP-01, CAMP-02, HYG-01, HYG-02, COMP-ARBITRAG-01, COMP-ZONESNON-01, COMP-DEPLOIEM-01, TESTS-01 (release 3.43.0, nom du cache = version, `tools/bump-version.mjs`).
- **Interface** : CAMP-03, COMP-ACCESSIB-01 et 02 (touche 3 = Campagne, raccourcis inactifs avec Ctrl, Alt et ⌘), CAMP-11 (quatre onglets à 390 px), aria-labelledby orphelins (partie de COMP-ACCESSIB-08).
- **Moteur** : REGLES-01 (chantier Q6, voir §2), REGLES-04, BOOT-05.
- **Liaisons** : FICHES-03 (Skink Petit), FICHES-04 et COMP-LIAISONS-03 (fiche réinitialisée), COMP-LIAISONS-05 (plus de rattachement par le nom ; aperçu nommé), MAP-02, MAP-03, MAP-06, COMP-LIAISONS-08 et 09, A3, A5 et A6 de l'audit Map Display, contrat §10 précisé.
- **Hygiène et tests** : ARCH-04, TESTS-06, COMP-ARBITRAG-04 (`npm test` borné à `tests/unit`), TESTS-02 (workflow GitHub `.github/workflows/tests.yml`), HYG-03, ARCH-12, TESTS-04, REGLES-09 en partie, BOOT-08 (README réécrit ; documents périmés dans `docs/archives/`), HYG-04, HYG-05, HYG-06, MAP-05, HYG-07, TESTS-08, HYG-09, HYG-10 (`CLAUDE.md`), HYG-13, FICHES-07, REGLES-13 (commandes de test corrigées), MAP-07 (checkout de Map Display à jour). TESTS-05 en partie : les audits divins sont sautés quand les captures locales manquent.
- **Hors rapport, demandé par le MJ** : « Chance » au lieu de « Fortune » à l'affichage, dans les deux dépôts (inventaire : `docs/RENOMMAGE_CHANCE_FORTUNE.md`).

### Décidé par le MJ : ne pas faire
- FICHES-02 et COMP-LIAISONS-02 (plafond de 40 changements par fiche) : cas irréaliste, on garde le blocage actuel.
- ARCH-01, ARCH-02, ARCH-11 (découpage des monolithes) : à faire seulement quand un supplément l'imposera.
- REGLES-14 (questions de la phase R) : phase close le 07/11.

### Reste à traiter (à soumettre au MJ par petits lots ; lire la fiche de l'annexe avant chaque correctif)
- **Liaison fiches** : FICHES-01 et COMP-LIAISONS-01 (compteur stocké en nombre sur la fiche → conflit permanent ; piste : envoyer `base` avec son type d'origine) ; FICHES-06 et COMP-LIAISONS-04 (race vide : Mouvement 4 sur la fiche, inchangé dans l'outil) ; FICHES-05 et COMP-LIAISONS-06 (aucun test de dérive entre les tables d'espèces des deux dépôts) ; COMP-LIAISONS-07 (`ficheHealthWarning` écrit mais jamais lu) ; COMP-LIAISONS-10 (aucun test croisé des constantes de liaison et des deux copies du contrat).
- **Liaison Map Display** : MAP-04 (contrat : `campaignName` de `map.hello` ni envoyé ni lu, nom `RiderOverlay`) ; MAP-01 est sans doute réglé depuis la mise à jour du checkout, à vérifier.
- **Démarrage et persistance** : BOOT-02, BOOT-03 (statut « ready » après une lecture distante en échec, abonnement RTDB sans rappel d'erreur), BOOT-04 (handle IndexedDB fermé par `versionchange`), BOOT-06 (pas de repli de navigation hors ligne avec paramètre d'URL), BOOT-07 (manifeste PWA minimal), BOOT-09.
- **Moteur de règles** : REGLES-05 (Taille lue par une regex dans `v5-spell-contracts.js` au lieu de `creatureSizeOf`), REGLES-02 et 03 (cumul écrit en plusieurs copies), REGLES-06, 07 et 11 (tables dupliquées : caractéristiques, espèces, qualités d'armes comparées par chaîne), REGLES-10 et 12 (drapeaux et code morts).
- **Architecture** : ARCH-03 (cycle d'imports, 25 modules depuis Q6), ARCH-06, ARCH-07 et CAMP-04 (`JSON.parse(getFullJSON())` dans les rendus), ARCH-08 (code mort), ARCH-09 (utilitaires recopiés), ARCH-10 (schéma de sauvegarde figé à 3), ARCH-13.
- **Campagne** : CAMP-05 (paramètres de dialogue inutilisés), CAMP-06 et 07 (troisième palette CSS, doublons), CAMP-08, COMP-ARBITRAG-03 (test de release sur un artefact local périmé), CAMP-09 (documents de lot périmés), CAMP-10 (soins hors rencontre), CAMP-12.
- **Import et export** : COMP-ZONESNON-02 (le dialogue d'import ne dit pas que l'horloge et les suivis sont remplacés), 03 (import de texte vide), 04 (`keywords-fallback.json` inutilisé et périmé), 05 (empreinte sha256 du CSV des mots-clés fausse depuis Barrakul), 06, 07 (l'export embarque l'historique d'annulation).
- **Accessibilité** : COMP-ACCESSIB-03 (focus perdu après « Avancer le temps »), 04 (`aria-modal`), 05 (cibles tactiles < 44 px), 06 (contraste 2,83:1 en thème sombre), 08 (Home/End sur les onglets), 09 (⌘Z annoncé sous Windows), 10 (aucun test automatique).
- **Tests et outillage** : TESTS-03, TESTS-07 (helper de serveur statique), TESTS-09 (classement des parcours), TESTS-10 (temporisations fixes), TESTS-11, TESTS-05 pour le reste, COMP-ARBITRAG-02 (`browser-startup` dépend de `.git`), COMP-DEPLOIEM-03 (journaux d'émulateur), COMP-DEPLOIEM-06, fins de ligne (CRLF dans l'arbre, pas de `.gitattributes`), HYG-08 (`tmp/a-effacer-07-11` : c'est au MJ de le jeter), HYG-12 (dépendances).

## 4. Règles à respecter (extrait de `CLAUDE.md` et des consignes du MJ)

- Interface et messages en français. Yards = mètres, sans conversion.
- Les règles du livre ne se plient jamais aux tests. Une question de règles se pose au MJ, avec une recommandation ; elle ne se tranche pas seule.
- Pour chaque correctif, un test qui échoue avant et passe après. Tests ciblés pendant le travail, suite complète une seule fois à la fin : `node --test "tests/unit/**/*.test.js"` puis `node --test "tests/unit/**/*.test.mjs"`. Tout test navigateur sous `timeout 120`. Jamais `node --test` nu.
- Contre-vérification par une relecture indépendante (code + pages du livre) avant de proposer une publication.
- Commits locaux, chemins nommés explicitement, pas de `git stash`. Aucun push sans le feu vert du MJ. Une seule branche sur GitHub.
- Tout nouveau module de `js/` va dans le précache de `sw.js`.
