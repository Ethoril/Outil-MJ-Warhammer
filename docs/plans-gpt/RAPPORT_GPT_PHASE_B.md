# Rapport GPT — Phase B Courroux (partiel)

**Dernière session : session 5 (Claude Pro), 21 octobre 2026 : B14 à B18 et clôture B19 exécutés** (voir la section « Session 5 — Claude Pro » en fin de rapport). Les sections des sessions 1 à 4 conservent leur état historique, notamment le blocage Q12 levé en session 2 et l’arrêt après B13 de la session 4.

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

## Session 4 — gpt/phase-b4, arrêt après B13

Demande du MJ : reprendre à B05 depuis codex/divin-v5 à jour, créer gpt/phase-b4, un commit par lot, continuer jusqu’à moins de 30 % d’usage restant puis mettre ce rapport à jour. Départ propre 08e4362 (3.21.5, sessions 1–3 fusionnées), worktree E:/Outil MJ Warhammer/tmp/gpt-phase-b4-worktree. Jonction node_modules vers le source, TEMP/TMP E:/Outil MJ Warhammer/tmp/gpt-phase-b4-runtime hors checkout. Manifeste des quatre catalogues protégés créé avant code à ce départ. Aucun push, fusion, version ou publication.

**Consigne finale du MJ : « arrête toi à la fin de B13 et fais ton rapport ».** Elle remplace la poursuite jusqu’au seuil d’usage. B13 est le dernier lot exécuté ; aucun travail B14 n’est commencé. Les mentions de recette « à rejouer » ci-dessous décrivent les étapes intermédiaires ; le bilan final en fin de section fait autorité.

| Lot | État / commit | Preuves actuelles |
| --- | --- | --- |
| B00–B04 | ACQUIS | Intégrés au départ 08e4362 ; rapports des sessions précédentes. |
| Préparation B05 | FAIT — 5fcc568 | Plan de reprise et 4 caractérisations des Actions/Tours, avant modifications partagées. |
| B05 | FAIT — 39e85cc | 19 nouveaux tests fonctionnels, suite 3466/3466 ; navigateur 4 contrôles, cloud total 52 (3 nouveaux). |
| B06 | FAIT — 97c1839 | 11 nouveaux tests, suite 3477/3477 ; navigateur 3 contrôles, cloud total 55 (3 nouveaux). |
| B07 | FAIT — cbc552e | 15 nouveaux tests, suite 3492/3492 ; navigateur 3 contrôles, cloud total 58 (3 nouveaux). |
| B08 | FAIT — ab59a17 | 21 nouveaux tests, suite 3516/3516 ; navigateur 4 contrôles, cloud total 61. Six Bénédictions Stromfels autorisées. |
| B09 | FAIT — af31809 | 10 nouveaux tests + 3 caractérisations ; suite 3529/3529 ; navigateur 3 contrôles, cloud total 64. |
| B10 | FAIT — aa62ca0 | 12 nouveaux tests + 3 caractérisations, suite 3544/3544 ; navigateur 4 contrôles, cloud total 67. |
| B11 | FAIT — ee9ef18 | 15 nouveaux tests + 3 caractérisations, suite 3562/3562 ; navigateur 3 contrôles, cloud total 70. |
| B12 | FAIT — ac61364 | 19 nouveaux tests + 3 caractérisations, suite 3584/3584 ; navigateur 4 contrôles, cloud total 73. |
| B13 | FAIT — e6e4b89 | 16 nouveaux tests + 3 caractérisations ; ciblage 19/19, suite 3603/3603, navigateur 4 contrôles, cloud total 76. Correctif mobile B10 final : 8971e14. |
| B14–B18 | À FAIRE | Aucun lot commencé ; ordre et périmètres du plan conservés. |
| B19 | OUVERT | Certification des 89 entrées distincte d’une recette technique verte. |

B05 : interdictions 21–25/31–35/46–50 et obligation 76–80 réellement appliquées, dés et premier Round explicites ; ancre hors combat sans conversion depuis secondes. Fin uniquement sur reçu de vrai Round afterEffects, suspension/reprise conservant la sanction. 76–80 propose un vrai Test de Prière dédié +0 (aucune Bénédiction substituée), respecte l’Action dépensée et exige une décision MJ pour le Tour déclencheur ; autres Actions et fin prématurée refusées. Récupération B04 et Tests génériques identifiés raccordés. B05 utilise des valeurs optionnelles non null pour survivre à RTDB ; régression rouge et cloud réels ont établi ce besoin. Plafond historique et Leçons restent verts. Choix B-C10/B-C11.

B06 : choix des compétences résolues de la fiche, plusieurs en heures / exactement une en jours ; inconnus, vides, doublons et non résolus bloquent. −1 DR via modificateurs génériques, vérifié sur Test, opposition, Prière et récupération ; durée d10 + Péchés avant décrément. Horloge commune, échéance exacte, refus des retraits bruts, persistance et Undo/Redo ; occurrences distinctes, pire malus commun sans cumul inventé. Choix B-C12/B-C13.

B07 : autres participants du même camp proposés ; liste corrigeable/confirmée, vide explicite admis. À Terre canonique sur les confirmés (unicité/immunité), rejet du culte porté par leurs fiches pour d10 + Péchés jours. Toutes les invocations de ce dieu les visant échouent, y compris autre prêtre et cible implicite du prêtre ; les autres dieux/cibles ne changent pas. Le vrai Test conserve sa réussite/DR/risque de Courroux ; résultat d’invocation distinct, zéro effet et reçu/journal/UI explicites. La Prière déclencheuse n’est pas annulée rétroactivement. À Terre se relève normalement sans mettre fin au rejet. Choix B-C14/B-C15.

Source L06 p.218 relue visuellement par l’exécutant, sans lecteur indépendant simulé. Sources et générateur existants réutilisés ; aucun contrat dérivé changé par B05–B07. Acceptations, preuves rouges, suites et reçus sous tmp/gpt-phase-b/b5, b6, b7. Captures 390/1440 px inspectées, pas de débordement ; aucun téléphone physique testé. Trois scénarios cloud nouveaux par lot intégrés au harness historique, qui conserve ses assertions.

Dernière suite complète : node --test --test-concurrency=4, 3492/3492, zéro échec, 96,194 s, tmp/gpt-phase-b/b7/suite-commit.log. Dernier cloud : 58 contrôles, zéro erreur navigateur, tmp/gpt-phase-b/b7/cloud-receipt.json. La recette de départ a passé 26/26 et 3443 tests ; recette finale à rejouer en fin de cette session. Aucun vert intermédiaire ne clôt B19.

Tests existants modifiés en session 4 : divin-v5-store.test.js, cas 21–25 : titre actualisé et fixture remplacée par un d10 explicite et un choix du premier Round ; assertions de ligne canonique et décrément inchangées. divin-v5-cloud-browser.mjs : imports et appels de scénarios B05–B07, aucune assertion historique modifiée. Aucune autre attente mécanique indépendante modifiée.


Complément session 4 : B08 suspend temporairement les accès du culte sans effacer les talents permanents ; Solkan bloque si Péché ou Corruption non nuls/inconnus, avec saisie MJ motivée ; Stromfels refuse Invocation à deux et Béni à cinq Péchés. Les six Bénédictions L25 p.91 reprises de Manann ont été ajoutées au générateur et aux deux sorties internes après autorisation directe. Génération double identique et --check verts. Aucun nouveau Miracle de Stromfels : le seuil Invocation est couvert par le prédicat typé d’accès. L06 p.219, L02 p.55 et L25 p.91 relues en texte et visuellement. Choix B-C16–B-C18. Logs b8/suite-final.log (100,600 s), browser/receipt.json, cloud-receipt.json : 3516 tests, 4 contrôles navigateur, 61 cloud.

B09 : marqueur durable du prochain renouvellement normal de Chance ; une dépense/correction ne le consomme pas. Le renouvellement explicite et motivé donne un point permanent puis consomme les occurrences visant cet événement ; temporaire préservé. Solde inconnu à initialiser, pool normal fourni par le MJ, aucun maximum inventé. Undo/Redo/reload/refus persistance et CAS ; UI ressources centrée et entièrement visible à 390/1440 px. Choix B-C19, L06 p.219 relue visuellement. Caractérisation 42889d6 corrigée par eba4d6d avant tout code : le refus persistance renvoie ok:false, pas une exception. Logs b9/suite.log (99,475 s), browser/receipt.json et cloud-receipt.json : 3529 tests, 3 contrôles navigateur, 64 cloud.

Nouvelles exceptions de tests existants B08 expressément autorisées par le MJ : fixtures Solkan de divin-v5-blessings-cults.test.js, divin-v5-p4b-damage-real.test.js et divin-v5-t5-form-model.test.js avec Corruption = 0 explicite ; assertions mécaniques inchangées. Attentes directement affectées : décompte des Bénédictions 72 → 78, page des nouveaux contrats Stromfels = 91. Le harness cloud reçoit les imports/appels B08/B09/B10, ses anciennes assertions restent intactes. Aucune autre assertion mécanique historique modifiée.

Consigne complémentaire du MJ : registre docs/VARIABLES_PERSISTANTES_PJ.md repris depuis codex/divin-v5 (document absent du main indiqué), puis complété rétroactivement dans 9c0247a. B00–B10 sont examinés : Péchés, Corruption, santé, Fortune permanente, couches calendaires, suspension d’accès, prochain renouvellement et pénitences documentés ; variables de combat exclues selon ce registre. Toute variable durable des prochains lots sera ajoutée. Aucun retour vers la fiche n’est réalisé avant la phase H.

B10 terminé : caractérisation 5d2eea7, création/clôture source sur fiche, rôle du contexte Store, clôture idempotente sans retrait de Péché, 96–100 structuré et récupération B04. Exemples des dix cultes L06 p.205–214 et compléments Ulric L19 p.112, pèlerinage L21 p.6, Stromfels L25 p.89 relus et paraphrasés. Choix B-C20–B-C22. Dernière suite complète : 3544/3544, 97,302 s, b10/suite-commit.log ; navigateur final et cloud (67 contrôles) verts. Registre persistant complété. La recette complète de fin de session reste à rejouer.

B11 : retrait des possessions identifiées et des Actions liées, snapshots sourcés, désignation magique et six PA physiques hors équipement confirmés MJ. Une pénitence du même culte restitue un seul objet magique choisi ; inventaire changé, autre objet sur pénitence accomplie, réinjection ou restitution sans clôture attestée refusés. Sources L06 p.219, choix B-C23–B-C25. Caractérisation 81db2a3 ; tests rouges ciblés pour PA intrinsèques, tableaux RTDB omis et lien obligatoire à la pénitence. Suite finale 3562/3562, 99,700 s, b11/suite-final-verified.log ; navigateur et cloud finaux 70 contrôles verts. Un premier log exploratoire découvrait un helper nommé fix-test.mjs dans tmp : helper renommé avant la suite finale citée, aucun test temporaire présent dans ce reçu.

B12 : premier matin futur explicitement fourni, 1 + Péchés avant décrément Hémorragique à chaque matin connu sur vrai reçu de temps ; pas de pose immédiate. Plusieurs matins sautés exigent une confirmation liée au payload/révision/état, une seule acquisition par matin. Pénitence du même culte termine la cause et conserve les États ordinaires acquis ; restitution B11 et arrêt de récurrence vérifiés ensemble. Gardes communs d’identité B09–B12 renforcés après quatre régressions rouges de copie vers un autre personnage. Caractérisation 1051958 ; choix B-C26–B-C29. Dernière suite complète 3584/3584, 98,733 s, b12/suite-final.log ; navigateur 4 contrôles, composant temps historique 6 contrôles et cloud 73 contrôles verts. Captures mobiles/bureau inspectées. Aucun changement de test historique, catalogue protégé, version ou dépendance. Les variables durables B11/B12 figurent dans VARIABLES_PERSISTANTES_PJ.md. Sources PDF L06/L02/L19/L21/L25 revérifiées par SHA-256 contre les données lues, reçu source-hashes-verified.json. La recette complète reste à rejouer en fin de session.

B13 : excommunication 136–140 portée par la fiche, acquisitions conservées mais accès du culte interdits, sans contournement par dérogation MJ. Deux nouvelles pénitences accomplies rendent Béni puis Invocation. Rejet définitif 146–150 confirmé explicitement : retrait réel des talents de ce culte et de toutes les avances Prière communes, avec diminution réelle du total. Talents des autres cultes et autres compétences conservés ; les Prières d’autres cultes utilisent le score commun réduit. Aucune compétence par culte inventée. Avances inconnues demandées au MJ, compétence résolue unique avec identifiant stable requise ; copies divergentes bloquées. Sanction sociale : faits d’appartenance au culte explicites, difficulté et modificateur total au mieux −3 DR, difficulté plus dure conservée, rôle auteur/défenseur et Intimidation sur Force raccordés. Règles critiques et inversion communes préservées. Temporaire terminé après deux pénitences ; permanent persistant. Choix B-C30–B-C32, source L06 p.219 relue visuellement, un seul lecteur/exécutant.

Caractérisation B13 séparée 26b60d3 avant modification de resolution.js ; 16 nouveaux tests fonctionnels et 3 caractérisations, ciblage final **19/19**, b13/target-final.log. Premiers cas rouges avant code et régression rouge spécifique Prière sans identifiant, puis correction. Navigateur B13 : **4 contrôles**, vrais champs et boutons, demande de faits sociaux bloquante puis Test +8 ramené à −3, deux clôtures MJ, perte définitive confirmée, IndexedDB natif et Undo/Redo. Captures 390/1440 px inspectées sans débordement, aucun téléphone physique testé. Cloud : **76 contrôles cumulés**, rejet et pertes A vers B, vraie résolution sociale par B, puis Undo/Redo auteur partagés ; journal de résolution vérifié sur B car il reste local dans le protocole existant. Préparation des nouveaux scénarios corrigée pour ouvrir le détail Péchés, déclencher le change du champ numérique et donner un identifiant stable à la nouvelle fixture Prière. Aucune assertion historique retouchée pour B13. Logs b13/browser-final.log, cloud-final.log et cloud-receipt.json.

Complément rétroactif au registre PJ : B00–B13 examinés, avec acquisitions, avances/total Prière, registre des rejets et progression des pénitences ajoutés. Les snapshots de confiscation, PA physiques connus et curseurs des matins B11/B12 sont recensés aussi. L’écriture vers les fiches reste le travail de phase H ; aucun retour externe effectué ici. Les valeurs de combat transitoires restent exclues conformément au document demandé.

La première recette finale a passé **3603/3603 tests Node**, puis échoué sur l’assertion mobile historique de divin-v5-t5-browser.mjs : les exemples Sigmar de B10 imposaient une largeur intrinsèque de 380 px à un conteneur imbriqué, débordant à 418 px sur une fenêtre de 390 px. Diagnostic conservé dans b13/t5-overflow-red.log. Correctif ciblé du conteneur de pénitences, min-width:0, commit **8971e14** ; aucune assertion du scénario changée. Le même navigateur historique est ensuite passé au vert, session4/t5-penance-width-green.log. La recette interrompue est figée dans session4/recipe-before-width-fix-receipt.json, distincte du reçu final.

### Bilan final de la session 4 — arrêté après B13

Code validé : **e6e4b89 + correctif UI 8971e14**, branche **gpt/phase-b4**, descendante de 08e4362. B05–B13 ont chacun leur commit fonctionnel ; caractérisations des services partagés commités séparément avant code. Les fichiers de rapport et les références de commits du registre sont complétés ensuite, sans changement de code après validation.

- **Suite complète imposée : 3603/3603**, zéro échec, zéro ignoré, `node --test --test-concurrency=4`, **108,747 s**, log `tmp/gpt-phase-b/session4/suite-final-concurrency4.log`.
- **Recette finale : 26/26 commandes vertes**, terminée le **21/10/2026 à 15:48:25 UTC (17:48:25 Europe/Paris)**. Commande `node tools/run-divine-recipe.mjs` ; ses propres **3603/3603 tests Node** passent aussi, 63,417 s pour la suite. Navigateur divin historique, invocations, temps, magie/combat, Auth/RTDB local, construction et lecture hors ligne passent. Reçu figé `tmp/gpt-phase-b/session4/recipe-final-receipt.json`, log `recipe-final.log`, copies des 26 logs `final-*.log` dans ce même dossier.
- **Cloud divin : 76 contrôles**, zéro erreur navigateur, IndexedDB natif et deux contextes, CAS REST sur émulateurs Auth/RTDB localhost. Les scénarios B05–B13 sont inclus dans la recette. Reçu figé `tmp/gpt-phase-b/session4/cloud-final-receipt.json`. Cette preuve porte sur ces émulateurs, aucune publication ni écriture en production.
- **Neuf parcours navigateur B05–B13 rejoués après le dernier correctif : 32 contrôles**, tous verts ; logs `tmp/gpt-phase-b/session4/browser-b5-final.log` à `browser-b13-final.log`. Ces scripts ne figurent pas automatiquement parmi les 26 commandes historiques : ils ont été exécutés séparément. Captures 390/1440 px inspectées ; le scénario mobile historique Sigmar est vert sans retouche de son assertion. Aucun matériel téléphonique testé.
- **Quatre catalogues protégés inchangés**, SHA-256 comparés au manifeste du départ 08e4362 créé avant code, sans réinitialisation de la référence. Générateur, audit et clauses `--check` verts. Synthèse machine `tmp/gpt-phase-b/session4/validation-summary.json` ; LF et `git diff --check` verts. Version 3.21.5, dépendances, service worker, index, README et arbitrages inchangés.

Liste consolidée des tests historiques modifiés dans cette session : `divin-v5-store.test.js` (titre et préparation 21–25 : d10/choix du premier Round à la place de la note libre, assertions mécaniques conservées) ; `divin-v5-blessings-cults.test.js` (Corruption Solkan = 0 autorisée, nombre 72 → 78 et source Stromfels p.91) ; `divin-v5-p4b-damage-real.test.js` et `divin-v5-t5-form-model.test.js` (seule Corruption Solkan = 0 explicite autorisée). `divin-v5-cloud-browser.mjs` reçoit les imports/appels des scénarios nouveaux, sans modification des assertions historiques. Aucun autre fichier de test historique modifié ; aucune assertion mécanique indépendante affaiblie. Le correctif mobile fait passer le test T5 existant intact.

Checkouts de référence observés propres : main **7ab5008**, codex/divin-v5 **d50f07e**. Le source a avancé pendant la session depuis 08e4362 ; cette avance concurrente n’a pas été fusionnée. Aucun changement effectué dans ces checkouts. Une intégration future devra réconcilier les services partagés et rejouer les contrôles pertinents. Aucun push, merge, déploiement, publication ou changement de version.

**Arrêt demandé après B13. Prochain lot : B14.** B14–B18 ne sont pas exécutés et B19 reste ouvert : une recette technique verte ne certifie pas à elle seule toutes les clauses des 89 entrées. Les choix B-C30–B-C32 restent documentés pour la relecture MJ groupée, notamment la perte des avances communes de Prière et la fin de la sanction sociale après la deuxième pénitence temporaire.

## Session 5 — Claude Pro : B14 à B18 et clôture B19

21 octobre 2026. Branche `pro/phase-b5` (worktree dédié), départ `1d11eb0` (3.21.6). Aucun push, aucune publication, aucun changement de version, de dépendance, de service worker ni d'arbitrage. `npm ci` lancé une fois (node_modules absent). Manifeste des quatre catalogues protégés créé depuis `1d11eb0` (`git show`), puis comparaison finale par la recette : inchangés.

| Lot | État / commit | Preuves |
| --- | --- | --- |
| B14 | FAIT — `e11ec42` (caractérisations `a91608b`, `a07b67c`) | 13 tests + 4 caractérisations ; navigateur 3 contrôles |
| B15 | FAIT — `7e1529c` | 11 tests ; navigateur 3 contrôles |
| B16 | FAIT — `1e6b3fd` | 11 tests ; navigateur 3 contrôles |
| B17 | FAIT — `575d4d0` | 10 tests ; navigateur 3 contrôles |
| B18 | FAIT — `6084194` | 19 tests (2 fichiers) ; navigateur 4 contrôles |
| B19 | FAIT — commit de clôture (réalisation des 89 entrées, test de couverture, correctif UI) | recette 26/26, suite complète verte |

**B14** : démon (88) et Serviteur divin (141–145) créés comme **un seul participant** confirmé par le MJ (profil, distance, position, cible ou camp et conduite) ; aucune valeur de profil inventée, aucune Action créée ; entrée dans l'ordre d'Initiative par le mécanisme commun, y compris depuis une récupération B04 (une ligne dans `store.js`, caractérisée à part). Choix B-C33 à B-C36.

**B15** : 151+ enregistre le départ ; retour par commande MJ (Point de Destin temporaire d'abord, puis permanent, débité une seule fois, refus sans Destin) ; rejet 146–150 seulement proposé puis confirmé ou refusé par le MJ, avec garde contre les retraits et copies génériques ; `v5-divine-access.js` accepte la preuve d'un rejet issu d'un jugement. B-C37 à B-C40.

**B16** : absolution (L06) et pénitence d'Altdorf (L20, +2 DR, 1 ou 2 Péchés retirés, Exténué sur échec, Courroux sur maladresse) par le moteur de Test de récupération B04 ; aucune Action consommée ; refus à zéro Péché. B-C41 à B-C45.

**B17** : catalogue de douze événements sourcés (attribution, retrait, remise à zéro) avec confirmation et fait MJ, onze rappels (commandements, présages, strictures), et « Courroux décidé par le MJ » (Péché positif, sans Test de Prière). B-C46 à B-C49.

**B18** : reliques (+1 à +3 DR, réduction du jet de Courroux, résultat ≤ 0 évité), suivi quotidien du livre skaven perdu, terre sanctifiée à seuil MJ, faits navals de Manann et Stromfels sans sous-système naval. B-C50 à B-C54.

**B19** : `docs/divin/COURROUX_REALISATION.json` classe les 89 entrées (43 automatisées, 21 assistées, 11 rappels, 14 exclues motivées) avec lot, commit et preuve ; `tests/divin-v5-b19-coverage.test.js` en vérifie la complétude. La photographie B0 de l'inventaire est inchangée.

### Vérifications finales

- **Suite complète** : `node --test --test-concurrency=4`, **3674/3674**, zéro échec, 100 s (log `tmp/gpt-phase-b/b14/suite-final.log`). Les lots précédents avaient un seul échec connu : `E0 … cwd externe`, dû au reçu de recette absent d'un worktree neuf, résolu par la recette.
- **Recette** : `node tools/run-divine-recipe.mjs`, **26/26 commandes vertes** (log `tmp/gpt-phase-b/b14/recipe4.log`). Trois premiers passages interrompus, tous corrigés : (1) un test historique à Store simulé sans les nouvelles méthodes → le panneau les appelle désormais de façon optionnelle ; (2) un sélecteur historique ambigu avec mes blocs imbriqués → déplacés hors du `<details>` des Péchés ; (3) manifeste de sources protégées absent, créé comme décrit.
- Navigateur : `divin-v5-b14/b15/b16/b17/b18-browser.mjs` exécutés séparément (vrais champs, 1440 et 390 px sans débordement, IndexedDB natif, Annuler/Rétablir). Ils ne font pas partie des 26 commandes ; le parcours cloud n'a pas reçu de scénarios B14–B18 (non demandé par les acceptations, à ajouter si le MJ le souhaite).
- Contrats générés : aucun changement (le générateur et `--check` restent verts).
- Registre `docs/VARIABLES_PERSISTANTES_PJ.md` complété pour B15 (jugements, Destin), B16 (retrait de Péchés), B17 (événements), B18 (reliques, suivi quotidien, terres, faits navals). B14 : participant de combat, pas de variable durable.

### Assertions de tests existants modifiées (B14)

Statut de la ligne 88 (la note MJ ne suffit plus, profil, distance, position et cible requis) : `divin-v5-control.test.js` (cas 78), `divin-v5-e4-runtime-independent.test.js`, `divin-v5-store.test.js`, `divin-v5-wrath-calendar-independent.test.js` (statut `requires-input` au lieu de `needs-wrath-resolution`), `divin-v5-browser.mjs` et `divin-v5-e3-e4-form-independent.mjs` (champs d'apparition ; ce dernier vérifie en plus la création du démon). Aucune autre assertion existante modifiée ; B15 à B19 : aucune.

### Choix d'interprétation et limites

Choix B-C33 à B-C54 dans `CHOIX_EXECUTANT_PHASE_B.md`, pour relecture groupée du MJ. Limites assumées :

- Le profil du démon et du serviteur est saisi par le MJ (le Bestiaire, phase E, n'est pas importé).
- Le Courroux décidé par le MJ refuse les lignes 6–10 et 11–15 (elles exigent la preuve d'un vrai Test de Prière).
- Un Courroux réduit par une relique dont le résultat serait positif mais sans jet 1–100 équivalent est refusé (le MJ tranche).
- Le Courroux quotidien du livre skaven exige un culte connu du registre (aucun culte skaven).
- Les sources L01, L02, L10, L13, L18, L19, L20, L24, L26 ont été exploitées via leurs résumés d'inventaire et pages indiquées ; seules L06, L20, L21, L22 et L25 ont été relues en texte pour cette session. Un seul exécutant, aucun lecteur indépendant.
- Aucun téléphone physique testé.

**Phase B : tous les lots B00 à B19 sont exécutés.** Ce vert certifie les contrôles nommés ci-dessus, pas le reste du chantier divin.
