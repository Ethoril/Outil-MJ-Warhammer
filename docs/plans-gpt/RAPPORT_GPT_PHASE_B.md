# Rapport GPT — Phase B Courroux (partiel)

21 octobre 2026, Europe/Paris. **La phase B reste ouverte.** Complément d’inventaire et plan commités, B00 et B02 livrés ; B01 bloqué par la politique des tests existants. B03–B18 et la clôture exhaustive B19 ne sont pas exécutés dans cette session, selon la règle Volume du brief. Ce rapport ne signifie pas « Courroux complet ».

## Checkout et commits

Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-b-worktree`, branche `gpt/phase-b`, départ `30d2b15` de `codex/divin-v5`, départ propre. Main et divin-v5 conservés, aucun stash, push, merge, déploiement ou écriture externe. LF vérifiés. Version applicative, service worker, fichiers d’arbitrage et dépendances inchangés.

Contrôle final : main reste propre à `8a47984`. Le checkout source divin-v5 est propre mais a avancé **pendant la session** à `bf4618f` par des commits Gemini (documentation de vérification/recette et outillage GLM). Ces ajouts concurrents n’ont été ni modifiés ni intégrés ici. Les résultats ci-dessous portent sur la branche GPT issue de `30d2b15`, avec le code livré à `7d2691a` ; refaire les vérifications pertinentes après une future intégration avec la branche source actualisée.

- `ab4beb4` : complément L19–L26, 20 entrées ajoutées aux 69 historiques, soit 89, avec `addedOn: "2026-10-21"`.
- `c7f659a` : plan des 20 lots, avant code ; 75 entrées affectées et 14 exclusions motivées (variantes V4, narration et faux positifs compris).
- `104db28` : B00, sorties générées resynchronisées après l’ajout du corpus.
- `6c495fb` : caractérisation B01 initiale, avant tentative ; quatre tests verts, comportement historique conservé.
- `7d2691a` : B02, exemption des cultes elfes, tests, parcours navigateur et choix d’interprétation.

## État lot par lot

« BLOQUÉ — session » ci-dessous signifie lot non commencé faute de volume dans cette session, **pas** impossibilité technique démontrée. Le plan et le périmètre restent applicables à la reprise.

| Lot | État / commit | Résultat ou raison |
| --- | --- | --- |
| B00 | FAIT — `104db28` | Génération déterministe, corpus complémentaire pris en compte, référence technique verte. |
| B01 | BLOQUÉ — caractérisation `6c495fb` | Q12 correct dans la tentative, mais fixtures indépendantes incompatibles et modification interdite par le brief ; tentative retirée. Voir détail ci-dessous. |
| B02 | FAIT — `7d2691a` | Exemption par culte, attribution refusée, interface, vrais apply, Undo/Redo et persistance ; contrat elfique actuel Mathlann vérifié. |
| B03 | BLOQUÉ — session | Blessures directes et Tests Calme/Résistance non exécutés. |
| B04 | BLOQUÉ — session | États et récupérations conditionnées non exécutés. |
| B05 | BLOQUÉ — session | Interdictions de Prière et Actions imposées non exécutées. |
| B06 | BLOQUÉ — session | Sélection MJ des compétences et malus calendaires non exécutés. |
| B07 | BLOQUÉ — session | Alliés du même camp et réprobation non exécutés. |
| B08 | BLOQUÉ — session | Suspensions des talents, pureté Solkan et seuils Stromfels non exécutés. |
| B09 | BLOQUÉ — session | Limite au prochain renouvellement de Chance non exécutée. |
| B10 | BLOQUÉ — session | Registre de pénitences sur fiche et clôture MJ non exécutés. |
| B11 | BLOQUÉ — session | Confiscation/restitution des possessions non exécutée. |
| B12 | BLOQUÉ — session | Hémorragie quotidienne jusqu’à pénitence non exécutée. |
| B13 | BLOQUÉ — session | Excommunication et rejet définitif non exécutés. |
| B14 | BLOQUÉ — session | Démon et Serviteur divin non exécutés. |
| B15 | BLOQUÉ — session | Jugement dernier, Destin et confirmation du rejet non exécutés. |
| B16 | BLOQUÉ — session | Absolution dédiée et pénitence d’Altdorf non exécutées. |
| B17 | BLOQUÉ — session | Événements, rappels de commandements et attribution sourcée non exécutés. |
| B18 | BLOQUÉ — session | Reliques, récurrences skavens, terre sanctifiée et miracles navals non exécutés. |
| B19 | BLOQUÉ — clôture exhaustive | Vérification technique effectuée sur le code livré ; certification des 89 entrées impossible tant que les lots restants ne sont pas réalisés. |

## B01 : preuve du blocage et travail non livré

**Le comportement humain à zéro Péché reste celui d’avant : unités zéro et maladresse peuvent encore déclencher le Courroux. Le point 2 du brief n’est pas livré.** Aucun correctif Q12 partiel n’est resté dans le moteur.

Les deux nouveaux cas Q12 ont échoué avant correction. La tentative a ensuite fait passer les trois nouveaux tests : cent jets à zéro sans Courroux, vraie application d’une maladresse à zéro sans décrément, seuil/maladresse inchangés à Péché positif. Diff proposé conservé localement : `tmp/gpt-phase-b/b1-attempt.patch` ; source des nouveaux tests : `b1-zero-sin-source.txt` ; caractérisation initiale commitée.

Acceptation ciblée : 28/95, dont **67 échecs de tests existants**. Avec +10/Péché et interdiction de table à zéro, les résultats 01–10 deviennent inaccessibles par une Prière ordinaire. Les fixtures indépendantes acquièrent justement le plafond 06–10 via une maladresse à zéro, puis vérifient des invariants qui doivent rester couverts : expiration, CAS, preuve d’origine, périmètre de sujet, refus de falsification, persistance et Undo.

Emplacements de reprise :

- `tests/divin-v5-wrath-calendar-independent.test.js`, helpers person/impose et leurs cas de plafond ;
- `tests/divin-v5-wrath-lessons-independent.test.js`, coexistence Leçons/plafond ;
- `tests/divin-v5-wrath-browser.mjs`, fixture à zéro et vraie pose du plafond ;
- `tests/divin-v5-control.test.js`, borne 99/100/0 ;
- `tests/divin-v5-engine.test.js`, reçu de maladresse à zéro.

La suite exploratoire complète de la tentative donnait 3245/3316, 71 échecs : 70 attentes existantes et une erreur de préparation (copie du nouveau test conservée sous `.test.js` dans tmp, découverte par Node avec imports relatifs devenus invalides). Cette copie a été renommée `.txt`. Ce passage ne vaut pas validation ; le ciblage 28/95 n’est pas affecté par cette erreur. Après retrait de la tentative, les suites finales redeviennent vertes.

Garde-fous appliqués de `REGLES_COMMUNES_GPT.md` : « Attendu faux [...] lot suivant » et « Tests existants : ne modifier que les assertions qui épinglent le statut, la liste d’effets, un nom ou un décompte ». Il faudrait adapter les **fixtures d’acquisition**, au-delà des seules assertions permises. Aucun test indépendant n’a été affaibli ou modifié. Retour par patch inverse limité aux fichiers du lot, puis retrait des nouveaux tests non commités après sauvegarde de preuve ; aucun reset global d’un autre travail.

Pour débloquer : planifier et autoriser la migration des fixtures vers des sanctions historiques sourcées, en conservant toutes les assertions mécaniques, ou créer d’abord le chemin de relique/MJ source-validé permettant les résultats bas à Péché positif. Q12 est clair ; ne pas changer +10/Péché ni inventer un bonus de test pour obtenir le vert. Reçu local détaillé : `tmp/gpt-phase-b/BLOQUE-B01.md`.

## B02 : comportement livré et limites

L’exemption provient du culte du contrat canonique, jamais de la race ni d’un drapeau client. Mathlann ignore les Péchés hérités et ne réclame aucun total de Péchés manquant ; une maladresse reste un échec de Test et n’ouvre pas la table. Le reçu conserve le culte, Q10 et la source L08 p.99 avec son empreinte. La prière elfique n’efface pas les Péchés du culte humain d’une fiche mixte. L’attribution de Péchés à un culte elfe est refusée ; une fiche mixte demande un culte acquis explicite. Le panneau affiche l’exemption et retire les champs d’attribution pour ce culte ; le chemin humain reste disponible.

Mathlann est le seul culte elfique actuellement doté de contrats de Prière dans le registre ; les noms d’autres cultes elfes sont reconnus sans ouvrir de nouvelles prières. Khaine humain et elfique ne sont pas confondus. Les autres cultes, profils et traditions ne sont pas déclarés intégrés par cette seule reconnaissance. Les sanctions historiques déjà enregistrées ne sont pas effacées.

Tests nouveaux avant code : 1/7 vert, 6 rouges pour les comportements absents. Après code, une attente du nouveau test de persistance a été corrigée pour respecter l’API existante : `saveAtomic` refusé renvoie `ok:false` plutôt qu’une exception ; les assertions de refus et d’absence de mutation sont conservées. Aucun test existant modifié.

Le premier passage complet donnait 3318/3319 : `tests/sw.test.js` signalait le nouveau module non précaché. Le brief interdisant `sw.js`, les fonctions ont été regroupées dans le moteur déjà précaché, et les imports ont été adaptés dans les fichiers autorisés. Le test est resté intact, puis est passé au vert.

## Vérifications et preuves

- Référence initiale : 3300/3307. Cinq échecs de dérivés périmés, un faux échec de chemin externe dû au TEMP à l’intérieur du checkout, un reçu de recette absent dans le worktree neuf. TEMP/TMP corrigés vers `E:/Outil MJ Warhammer/tmp/gpt-phase-b-runtime`, hors checkout et sur le même lecteur.
- B00 : nouveau test rouge d’empreinte, deux générations comparées identiques, `--check` vert ; suite complète 3308/3308, recette 26/26.
- B02 ciblé : `node --test tests/sw.test.js tests/divin-v5-b2-elf-cults.test.js tests/divin-v5-b1-characterization.test.js` : 16/16.
- **Dernière suite complète** : `node --test --test-concurrency=4` : **3319/3319**, zéro échec, 91,178 s. Log : `tmp/gpt-phase-b/b2-suite-final.log`.
- Navigateur nouveau : `node tests/divin-v5-b2-elf-cults-browser.mjs` : quatre contrôles verts, vrais boutons/formulaires, application d’une maladresse elfique, total humain conservé, Annuler/Rétablir, reload IndexedDB natif. Captures 390/1440 px inspectées ; pas de débordement. Pas de téléphone physique testé.
- **Recette finale verte : 26/26 commandes, 3319/3319 tests Node, zéro échec.** Commande exacte : `node tools/run-divine-recipe.mjs`, reçus `tmp/divin/recipe-receipt.json` (copie figée `tmp/gpt-phase-b/final-recipe-receipt.json`) et logs `tmp/divin/final-*.log`. Parcours divins, magie/combat, deux recettes cloud en émulateurs locaux, construction et lecture hors ligne réussis. Cette recette ne contient pas automatiquement le nouveau parcours B02, qui a été exécuté séparément et décrit ci-dessus.
- Contrats : B02 ne change pas de contrat généré ; les deux seules sorties de B00 ont été obtenues par le générateur. Aucun JSON généré édité à la main.
- Sources protégées : manifeste de départ des quatre catalogues créé avant code ; comparaison finale **4/4 inchangés**, sans réinitialiser la référence après modification.
- Assertions de tests existants modifiées dans les commits livrés : **aucune**.
- Choix d’interprétation : B-C01 à B-C04 dans `CHOIX_EXECUTANT_PHASE_B.md`.

## Sources consultées et couverture

Complément d’inventaire L19–L26 : balayage texte livre par livre, puis lecture des pages positives, détails et pages dans `COURROUX_INVENTAIRE.md`. `pdftotext` absent ; pypdf 6.10.0 fourni utilisé sans installation. Tableau gnome L24 imprimé p.90/physique 91 et table L06 p.218–219 vérifiés visuellement par Poppler. L08 p.93–99 relu pour les identités et l’exemption. Divergences V4/V5 prioritaires identifiées dans le plan ; cette lecture n’équivaut pas à leur implantation.

Les 69 statuts B0 restent une photographie historique ; les 20 ajouts portent leur statut avant implantation. Le rapport présent distingue la livraison B02 de cet inventaire initial. Aucun livre entièrement audité, aucun lecteur indépendant revendiqué, aucune couverture exhaustive de l’ensemble du chantier divin ou des 89 entrées annoncée.

## Reprise

Reprendre ce worktree et vérifier branche/HEAD/statut. Lire ce rapport, le plan commité et les choix. Premier lot non commencé : **B03** ; B01 reste une réserve explicite à débloquer avant de déclarer Q12 ou la phase B terminés. La recette verte valide le code livré et ses contrôles nommés, sans fermer les lots restants.
