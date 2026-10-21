# Rapport GPT — Phase B Courroux (partiel)

**Dernière session : session 3, 21 octobre 2026, B04.** Voir sa livraison et ses preuves en fin de rapport. B00–B03 acquis ; le lot suivant est B05. B05–B18 et la clôture B19 restent ouverts : la phase B n’est pas complète. Les sections des sessions précédentes conservent leur état historique, notamment le blocage Q12 levé en session 2.

## Session 1 — historique, branche gpt/phase-b

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

## Session 2 — reprise autorisée, branche gpt/phase-b2

Brief `BRIEF_GPT_PHASE_B_REPRISE.md` et complément MJ du 21/10 appliqués. Nouveau worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-b2-worktree`, branche `gpt/phase-b2`, départ propre `29d2221` de `codex/divin-v5` (inclut la fusion `6956d61`, la livraison précédente et les ajouts Gemini). L’ancien worktree GPT est conservé à `895ec40`. TEMP/TMP : `E:/Outil MJ Warhammer/tmp/gpt-phase-b2-runtime`, hors checkout et sur le même lecteur. Manifeste des quatre sources protégées établi à ce départ avant code.

### Livraison et état courant

| Lot | État / commit | Résultat ou suite |
| --- | --- | --- |
| B00 | FAIT — `104db28`, acquis au départ | Sorties et corpus complémentaire déjà fusionnés. |
| B01 | FAIT — migrations `e8a2b7c`/`a75c3d5`, Q12 `5cf5b4f` | Aucun Courroux à zéro, y compris unités zéro et maladresse. Lignes 01–10 sourcées, marquées inaccessibles. |
| B02 | FAIT — `7d2691a`, acquis au départ | Exemption elfique conservée. |
| B03 | FAIT — `69030fd` | Blessures directes, Résistance, Sonné et conversion V5, vrais champs, application et persistance. 01–05 inaccessible sous Q12, aucun parcours de Calme annoncé. |
| B04 | NON COMMENCÉ — prochain lot | États et récupération conditionnée. |
| B05 | NON COMMENCÉ | Interdictions et Actions de Prière. |
| B06 | NON COMMENCÉ | Compétences et malus calendaires. |
| B07 | NON COMMENCÉ | Alliés et réprobation. |
| B08 | NON COMMENCÉ | Talents, Solkan, Stromfels. |
| B09 | NON COMMENCÉ | Renouvellement de Chance. |
| B10 | NON COMMENCÉ | Pénitences et clôture MJ. |
| B11 | NON COMMENCÉ | Possessions. |
| B12 | NON COMMENCÉ | Hémorragie quotidienne. |
| B13 | NON COMMENCÉ | Excommunication et rejet. |
| B14 | NON COMMENCÉ | Démon et Serviteur divin. |
| B15 | NON COMMENCÉ | Jugement dernier et Destin. |
| B16 | NON COMMENCÉ | Absolution et Altdorf. |
| B17 | NON COMMENCÉ | Événements et commandements. |
| B18 | NON COMMENCÉ | Reliques et extensions du corpus. |
| B19 | OUVERT | La recette technique ne vaut pas clôture exhaustive des 89 entrées. |

Arrêt propre après B03 selon la règle Volume et le brief de reprise. Aucun blocage technique nouveau déclaré sur les lots non commencés.

### Migration des fixtures et Q12

Les sanctions historiques de plafond ont été capturées avec le moteur du départ `29d2221`, avant Q12 : `tests/fixtures/divine-wrath-historical.json`. Le helper `divine-wrath-history.mjs` les pose directement par commande Store et les valide avec le codec de production ; il ne fabrique aucun nouveau jet de table à zéro. Les cas réussis et ratés, couches de cibles, preuves et ancres sont conservés. Cette autorisation de migration et le nouveau périmètre B03 sont inscrits au plan avant le correctif Q12.

Fixtures migrées :

- `divin-v5-wrath-calendar-independent.test.js` : pose historique pour les plafonds, débordements et refus de persistance ; prière réelle à Péché positif pour les aperçus périmés et le contrôle exact de l’horloge. Assertions de durée, expiration, CAS, origine, sujets et miroirs, refus de falsification, persistance et Undo conservées.
- `divin-v5-wrath-lessons-independent.test.js` : coexistence Leçons/plafond par sanction historique. Au second déclenchement, nouveau Péché explicite après le décrément, jet 1 + 10 : refus de cumul, absence de mutation et première couche conservés.
- `divin-v5-wrath-browser.mjs` : pose historique via Store, puis mêmes gestes réels des Prières plafonnées et de leur expiration ; assertions et contrôles Undo/Redo/reload conservés. Comparaison pure sans l’horodatage d’export. Ajout d’un parcours Q12 à zéro.
- `divin-v5-control.test.js` : borne 99/100/0 remplacée par 99/90/1, même résultat modifié 100 et mêmes contrôles de ligne imposée par le moteur.
- `divin-v5-engine.test.js` : fixture de maladresse explicitement à un Péché, assertions inchangées.
- `divin-v5-cloud-browser.mjs`, révélé par la recette finale, commit `a75c3d5` : les trois poses 06–10 passent par le même helper historique sourcé avec identifiants distincts et acteur réel hero. Les assertions de plafond effectif, ancre absolue, provenance RTDB, périmètre, sept/huit jours, IndexedDB, Undo/Redo, conflit hors ligne et branche gagnante restent inchangées. Seuls le mécanisme de préparation et ses libellés descriptifs évoluent ; aucune nouvelle table à zéro n’est simulée. Le serveur de test sert aussi les modules .mjs.

La migration précède Q12 dans un commit séparé, vert avec l’ancien comportement : ciblage **121/121**, suite **3321/3321**, navigateur historique et recette **26/26**. La copie figée du reçu est `tmp/gpt-phase-b/fixtures-recipe-receipt.json`.

Q12 : cinq des six nouveaux tests rouges avant code ; ciblage **131/131**, suite **3327/3327** ensuite. Le moteur impose Péché strictement positif pour le seuil et la maladresse ; la maladresse à zéro reste un échec de Prière, applicable sans table, sanction ni décrément. Cent jets à zéro, Péché positif, fausse ligne client, aperçu inerte/périmé, double clic, Undo/Redo et rechargement couverts. Génération déterministe en deux passages. Navigateur `divin-v5-wrath-browser.mjs` : cinq contrôles verts, dont le vrai formulaire Q12 à zéro.

Premier passage de recette après B03 interrompu au cloud : l’ancienne fixture exigeait encore une table 06–10 à zéro, erreur « La ligne canonique6–10 doit être résolue ». Preuve figée `tmp/gpt-phase-b/q12-cloud-red.log` et reçu `session2-recipe-before-cloud-migration.json`. La migration supplémentaire ci-dessus est expressément autorisée par « et toute autre que la suite révèle » du brief de reprise. Après migration, exécution cloud ciblée verte : **45 contrôles**, deux contextes IndexedDB natifs et Auth/RTDB réels sur émulateurs localhost, aucune erreur navigateur. Log `tmp/gpt-phase-b/q12-cloud-migrated.log`. Aucun code produit changé dans ce complément de migration.

### B03 et limites précises

L06 EN V5 v2 p.218 relue visuellement par l’exécutant, sans lecteur indépendant revendiqué. Quatre contrats typés générés : 36–40, 51–55, 71–75, 81–87. Quantités évaluées depuis les Péchés avant décrément ; service de Blessures directes existant, moteur partagé de Tests V5 et acquisition canonique des États réutilisés. Résistance vient de la fiche résolue ou de son score de base E, avec Endurance courante, effets magiques et contexte des États. Difficultés source +2/0/−1/−2 ; à l’échec, un Sonné, plus un par DR négatif pour 81–87. Immunités et conversion au-delà du BE en Inconscient par le moteur V5 conservées ; aucun Inconscient V4 ajouté.

Les dés manquants, hors bornes, compétence ambiguë/non résolue, choix de jet et arbitrage de contexte manquants bloquent. Le texte libre ne remplace aucune donnée. Panneau : dés, choix de Résistance, arbitrage des États et projection PV/États/Momentum avant application. Transaction réelle : prêtre seul, effet primaire réussi sur l’allié conservé, reçu et origine persistants. Même identifiant encore porté par un État refusé après éviction du journal. Les États ne reçoivent pas l’échéance de la Bénédiction ; leur récupération suit les règles V5 communes existantes. B04 traitera ses autres récupérations conditionnées.

Choix **B-C05** : 51–55 emploie « Wounds » sans répéter l’exclusion BE/PA ; lecture en Blessures directes consignée avec raison et alternative pour relecture MJ groupée. **B-C06** : Test passif et acquisition canonique. L’adaptateur reste dans le module Store divin déjà précaché (contrainte B-C04), sans nouveau module runtime imposant une modification interdite du service worker.

Tests B03 : neuf rouges avant code, puis test de collision supplémentaire rouge avant sa garde ; dix nouveaux tests verts. Parcours navigateur rouge avant les champs structurés, puis **trois contrôles verts** : dés obligatoires et aperçu inerte, application réelle de 51–55, Annuler/Rétablir et reload IndexedDB natif. Captures 390/1440 px inspectées, sans débordement horizontal ; pas de téléphone physique testé. Les neuf premiers nouveaux tests ont eu une correction de fixture : remplacement d’un appel inexistant adjustHp par la vraie commande updateParticipant, assertions de péremption et d’état inchangé conservées.

### Vérification finale de session 2

- Ciblage B03 et contrôles voisins : **98/98**. Log `tmp/gpt-phase-b/b3-targeted.log`.
- Suite complète B03 : **3337/3337**, zéro échec, **95,196 s**, log `tmp/gpt-phase-b/b3-suite.log`. Dernière suite complète imposée après migration cloud : `node --test --test-concurrency=4`, **3337/3337**, zéro échec, **95,712 s**, log `tmp/gpt-phase-b/q12-cloud-fixture-suite.log`.
- Deux régénérations comparées identiques, `node tools/build-v5-divine-contracts.mjs --check` vert ; aucun JSON dérivé édité à la main.
- Parcours B03 exécuté séparément : `node tests/divin-v5-b3-damage-browser.mjs`, trois contrôles verts, reçu `tmp/gpt-phase-b/b3-browser/receipt.json`. Ce nouveau script n’est pas ajouté automatiquement aux 26 commandes de la recette existante.
- **Recette finale verte : 26/26 commandes, 3337/3337 tests Node, zéro échec**, terminée le 21/10/2026 à 11:31:05 UTC. Commande `node tools/run-divine-recipe.mjs` ; reçu `tmp/divin/recipe-receipt.json`, copie figée `tmp/gpt-phase-b/session2-final-recipe-receipt.json`, log `tmp/gpt-phase-b/session2-final-recipe.log`. Parcours divins, magie/combat, deux scénarios cloud sur émulateurs localhost, construction et lecture hors ligne verts. Les quatre sources protégées sont identiques au manifeste établi avant code à `29d2221`.
- Fichiers à risque partagés non modifiés : store.js, resolution.js, moteurs de Tour, v5-store-action.js. Pas de version, service worker, dépendance, arbitrage ou catalogue protégé modifié. Aucun push, merge, déploiement ou écriture externe.
- Contrôle final des checkouts : main propre à `29d2221`, ancien worktree gpt/phase-b propre à `895ec40`, conservés. Le source codex/divin-v5 a avancé pendant cette session, observé à `67b3bad` puis `9679989` ; cette avance concurrente n’a pas été intégrée ici. Le second commit ajoute les confirmations MJ de B-C01 à B-C04 : diff lu, compatible avec la livraison, sans confirmation nouvelle de B-C05/B-C06. Les validations portent sur gpt/phase-b2 issu de `29d2221` : les contrôles pertinents seront à rejouer après intégration avec le source actualisé. Le code et les fixtures de cette session aboutissent à `a75c3d5` ; le présent rapport fait l’objet de commits séparés. LF et diff --check verts.

### Assertions de tests existants modifiées en session 2

- `divin-v5-b1-characterization.test.js`, commit `5cf5b4f` : statut, déclenchement et motif des deux cas à zéro (jets 20 et 99), conformément à Q12 ; caractérisation initiale conservée dans `6c495fb`. Cas à Péché positif inchangés.
- `divin-v5-control.test.js`, commit `69030fd` : cas 81–87 sans note MJ, statut `requires-input` remplace `needs-wrath-resolution`, puisque les dés structurés sont désormais requis ; ajout de l’assertion du besoin wrathDamageRoll. Refus d’application, ligne calculée et refus du résultat client conservés.
- Les migrations de fixtures expressément autorisées sont détaillées ci-dessus et dans `e8a2b7c`/`5cf5b4f`/`a75c3d5` ; aucune assertion mécanique indépendante affaiblie pour faire passer Q12.

Reprise : utiliser ce nouveau worktree et relire plan/choix/rapport, vérifier branche, HEAD et état hérité. **Commencer par B04** ; B01 est livré. La recette verte couvre uniquement ses contrôles nommés ; B19 et l’intégration mécanique exhaustive restent ouverts.

## Session 3 — B04 : États et récupération conditionnée

Demande directe du MJ : reprendre B04. Worktree B2 trouvé propre à `d9166f2`. La branche source avait intégré B01–B03 et publié la version 3.21.2 : avance rapide locale de gpt/phase-b2 à `7ab5008`, autorisée par le brief de reprise. Aucune modification des checkouts main/source ni de leurs fichiers. Les changements de version présents à ce départ proviennent de l’intégration de l’orchestrateur, pas de B04. Le même TEMP/TMP hors checkout et le manifeste des quatre catalogues protégés de session 2 sont conservés.

### Périmètre et livraison

Le plan omettait store.js alors que les boutons de retrait manuel utilisent updateParticipant({states}). Le MJ a explicitement autorisé son ajout ciblé dans ce chat, avec caractérisation préalable. **`ca102d4`** : plan ajusté et cinq caractérisations vertes, avant modification des services partagés. Aucun moteur de Tour/résolution ou service worker modifié.

| Lot | État / commit | Livraison ou suite |
| --- | --- | --- |
| B00–B03 | ACQUIS | Intégrés au départ `7ab5008`, preuves des sessions précédentes. |
| B04 | FAIT — `e681603` | Contrats, États et récupération détaillés ci-dessous ; caractérisation préalable `ca102d4`. |
| B05 | NON COMMENCÉ — prochain lot | Interdictions de Prière et Actions en Rounds. |
| B06–B18 | NON COMMENCÉS | Périmètre du plan conservé. |
| B19 | OUVERT | Clôture exhaustive distincte de la recette technique. |

Source : images du tableau L06 EN V5 p.218–219 relues visuellement par l’exécutant. Empreinte du PDF contrôlée : `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`. Aucune nouvelle lecture indépendante revendiquée. Les contrats typés proviennent de `docs/divin/sources/L06-wrath-conditions-readings.mjs` et du générateur ; aucune modification manuelle des sorties JSON.

- **16–20** : À Terre acquis par le service canonique, verrouillé jusqu’à réussite d’une Prière +2. Si À Terre existait, son identifiant est conservé et la cause de Courroux y est ajoutée. Plusieurs causes demandent une sélection explicite ; lever une cause laisse l’État si une autre cause de Courroux subsiste.
- **66–70** : À Terre ordinaire et trois Aveuglé. Seuls les nouveaux Aveuglé sont verrouillés ; les anciennes occurrences restent indépendantes. Prière +0 réussie retire 1 + DR sur l’occurrence choisie, sans toucher aux autres Aveuglé. Pas de retrait spontané de ces trois niveaux en fin de Tour.
- **101–105** : Blessures à zéro, Inconscient canonique. Tout gain effectif d’au moins une Blessure (commande de soins ou éditeur de PV) libère cette cause ; le KO posé par cette seule cause est retiré, un KO préexistant indépendant reste présent. Soins nuls, soins empêchés par Empoisonné et simple déclaration de fin de cause ne libèrent rien.
- **126–130** : Blessures à zéro et un Enflammé canonique ; dégâts et récupération ordinaires du feu conservés.
- **61–65 et 89–95** : règles existantes conservées ; les quinze contrôles indépendants restent verts. Quantités des nouvelles sanctions, décrément et cible unique prêtre vérifiés ; les États ne reçoivent pas l’échéance de la Bénédiction.

Les immunités communes s’appliquent avant les verrous. Momentum suit les acquisitions/pertes de Blessures existantes. Les états et causes portent l’origine et le reçu sourcés ; les identifiants de Courroux encore portés par un état restent refusés après éviction du journal.

### Récupération réelle et protection des clauses

Le panneau dispose d’un parcours spécifique de récupération : capacité à parler, jet d100, choix du jet favorable et arbitrage des États quand nécessaire, projection puis application. Le moteur partagé de Tests V5 calcule le résultat depuis la Prière résolue, la Sociabilité courante, les couches de modificateurs, Leçons et les plafonds historiques. Un résultat saisi « réussite » ou un texte libre ne remplace pas le Test. Le Test est enregistré comme Action selon le mécanisme existant et respecte les gardes Brisé/visibilité/Action dépensée.

À Péché positif, la récupération peut déclencher un nouveau Courroux. La récupération et ses conséquences sont appliquées ensemble une fois toutes les données fournies : branches structurées B01–B04 réutilisées, autres lignes encore assistées selon l’état actuel de la phase. Les dés manquants bloquent la transaction. La preuve de nouvelles Leçons produite ici respecte le validateur commun, sans donner une durée différente à la sanction.

Les retraits génériques, Fortune, échéances et modifications brutes des verrous ne contournent pas une récupération source. Le contrôle intervient dans l’édition ciblée et dans la finalisation des commandes : Recommencer ou une commande générique qui efface un tel État est refusé sans mutation. Une récupération de Prière n’est admise que depuis un aperçu émis, avec état/révision/empreinte concordants ; les clauses restant actives sont conservées. L’ordre des clés JSON, notamment après RTDB, ne change pas le sens de la preuve.

Persistance refusée, aperçu falsifié ou périmé et double clic préservent l’état. Undo/Redo et rechargement restituent niveaux, verrous et reçus ensemble. Les choix de lecture **B-C07 à B-C09** sont consignés dans CHOIX_EXECUTANT_PHASE_B.md pour la relecture MJ groupée.

### Tests et assertions

- Tests nouveaux : cinq caractérisations avant service partagé, puis dix-neuf tests B04, dont les premiers rouges sur les mécanismes manquants. Des régressions rouges ciblées couvrent aussi regain PV par éditeur, préservation des Aveuglé antérieurs et immunités, preuve des nouvelles Leçons, ordre de clés cloud et effacement par Recommencer/commande générique. Logs sous `tmp/gpt-phase-b/b4/`.
- Acceptation ciblée : `node --test tests/divin-v5-b4-states.test.js tests/divin-v5-b4-characterization.test.js tests/divin-v5-wrath-conditions-independent.test.js`, **39/39**.
- Le seul test existant dont les attentes changent est `divin-v5-wrath-calendar-independent.test.js`, cas jet6 avec Péché1, soit 16–20 : ready/status/besoin de note MJ sont remplacés par ready/ready et la projection À Terre1 verrouillée. Le cas78 (88) conserve ses trois attentes de traitement MJ ; Leçons conserve le d10 requis. Aucun contrôle indépendant d’expiration, CAS, preuve, périmètre ou plafond n’est affaibli. Le premier passage complet donnait **3357/3358**, ce seul ancien statut étant rouge ; un passage intermédiaire après adaptation a donné **3359/3359**, avant les derniers contrôles de sérialisation et de commandes génériques.
- Navigateur : `node tests/divin-v5-b4-states-browser.mjs`, **quatre contrôles verts** : acquisition 66–70, retrait manuel refusé et vraie récupération +0, Undo/Redo/reload IndexedDB, soins réels libérant 101–105. Préparation du navigateur corrigée pour confirmer la portée ; preuve rouge contre l’ancienne UI conservée. Une régression rouge vérifie aussi l’activation du bouton de soins à la saisie. Captures 390/1440 px inspectées, sans débordement ; pas de téléphone physique testé. Reçu `tmp/gpt-phase-b/b4/browser/receipt.json`.
- Cloud : quatre nouveaux scénarios B04 ajoutés, sans changer les assertions des 45 contrôles historiques, à `divin-v5-cloud-browser.mjs` via `divin-v5-b4-cloud-scenarios.mjs`. Deux contextes et IndexedDB natifs, Auth/RTDB localhost et vrai CAS REST : acquisition A vers B, Test de récupération par B après sérialisation, reçu et reload A, Undo/Redo, garde du retrait brut et soins du KO B vers A. Passage ciblé **49 contrôles verts**, zéro erreur navigateur ; log `tmp/gpt-phase-b/b4/cloud.log`. La recette finale les rejoue après le dernier garde de finalisation.
- Fixtures nouvelles corrigées sans affaiblissement : aperçu comparé à l’état après le geste de récupération générique à effet nul (qui produit un journal/révision) ; jet54 plutôt que55 pour obtenir +1 DR sans critique ; modificateur de Prière porté par une vraie couche, car l’agrégat manuel est recalculé à la sauvegarde.
- Génération : deux passages comparés identiques, `--check` vert. **Suite complète finale : 3361/3361**, zéro échec, `node --test --test-concurrency=4`, **133,808 s**, log `tmp/gpt-phase-b/b4/suite-final.log`. Le navigateur a été rejoué sur le code final après le dernier garde : quatre contrôles verts, log `tmp/gpt-phase-b/b4/browser-final.log`.
- **Recette finale verte : 26/26 commandes**, dont **3361/3361 tests Node**, les **49 contrôles cloud** (B04 inclus), les invocations cloud et la construction/lecture hors ligne ; terminée le 21/10/2026 à **12:25:54 UTC**. Commande `node tools/run-divine-recipe.mjs`, log `tmp/gpt-phase-b/b4/recipe-final.log`, copie figée du reçu `tmp/gpt-phase-b/b4/recipe-final-receipt.json`. Le reçu cloud final est figé dans `tmp/gpt-phase-b/b4/cloud-final-receipt.json`, zéro erreur navigateur. Le script navigateur B04 est exécuté séparément ; les quatre scénarios cloud B04 sont inclus dans la commande cloud de la recette. Les **quatre catalogues protégés sont inchangés** selon le manifeste établi avant le code, conservé depuis la session 2.
- Contrôle des checkouts : main observé propre à `7ab5008`, source codex/divin-v5 observé propre à `fa8b189`. Ce dernier a avancé pendant la session par l’intégration de C01/C02 et la version 3.21.3 ; cette avance n’est pas fusionnée dans gpt/phase-b2. Les validations B04 portent sur le départ `7ab5008` plus `ca102d4`/`e681603`. L’intégration future avec la phase C devra réconcilier les raccordements de Store et rejouer les contrôles pertinents. Aucun checkout source n’a été modifié par B04. Aucun push, fusion de B04 vers main/source, déploiement, changement de version ou publication ; LF et diff --check verts.

Arrêt après le seul lot demandé, B04. **Prochain lot : B05.** Les autres lots et la certification B19 restent ouverts.
