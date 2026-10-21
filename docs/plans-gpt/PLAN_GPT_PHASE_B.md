# Plan GPT — Phase B : Courroux des dieux

21 octobre 2026, Europe/Paris. Branche `gpt/phase-b`, worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-b-worktree`, départ `30d2b15` (codex/divin-v5 propre). Brief et REGLES_COMMUNES_GPT.md appliqués ; arbitrages du 21/10 prioritaires. Inventaire complété : 69 + 20 = 89 entrées, commit `ab4beb4`.

## Règles d’exécution

### Reprise du 21 octobre — branche gpt/phase-b2

Départ `29d2221` de codex/divin-v5 (inclut la fusion `6956d61`, la livraison précédente et le complément MJ), worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-b2-worktree`. Le brief BRIEF_GPT_PHASE_B_REPRISE.md et le complément du MJ autorisent expressément la migration des fixtures B01, en conservant leurs assertions mécaniques : cette exception remplace la limitation de fichiers/tests B01 ci-dessous. Un commit de migration, vert avec l’ancien comportement si possible, précède Q12. Fixtures concernées : wrath-calendar-independent, wrath-lessons-independent, wrath-browser, control, engine, données historiques et helper sous tests/fixtures, plus toute autre révélée par la suite. TEMP/TMP : `E:/Outil MJ Warhammer/tmp/gpt-phase-b2-runtime`, hors checkout. Aucun nouveau balayage de corpus nécessaire : le complément de 89 entrées est déjà fusionné.

Q12 confirmé : aucune table à zéro, même sur maladresse ; lignes 01–10 conservées et marquées inaccessibles au registre. Les tests de plafonds hérités utilisent une pose directe de sanctions historiques sourcées, sans recréer un jet à zéro. Les autres déclencheurs utilisent Péché positif/résultat au moins 11. B03 traite les lignes de dégâts accessibles ; 01–05 n’est plus accessible en jeu selon cet arbitrage et garde sa source et son exclusion motivée. Le reste des lots et garde-fous reste inchangé.

Lots dans l’ordre ci-dessous ; tests nouveaux rouges pour la bonne raison avant code, acceptation ciblée puis `node --test --test-concurrency=4` par lot ; changements partagés à risque précédés de caractérisation commitée. Commit local de chaque lot, jamais de push, fusion, version, dépendance ni publication. LF vérifiés avant commit. Générateur utilisé pour toute sortie dérivée, deux régénérations comparées. Fichiers d’arbitrage et docs/PLAN_*.md intouchés.

Les fichiers autorisés sont limités aux emplacements indiqués par lot, à ses nouveaux tests et aux deux documents de suivi de phase. Les listes de fichiers partagés ne permettent pas de changer une règle voisine ; caractérisation préalable obligatoire sur store.js, resolution.js, v5-store-action.js, v5-turn.js, turn-order.js. Un besoin hors périmètre produit un reçu BLOQUE du lot. Un lot interrompu conserve seulement ses preuves et revient à son commit propre précédent, jamais les travaux des autres checkouts.

Tests existants : seules assertions de statut/liste d’effets/nom/décompte directement affectées peuvent évoluer ; chacune sera citée dans le commit et le rapport. B01 doit mettre à jour le statut attendu du Courroux pour le cas explicitement à zéro dans divin-v5-control.test.js ; aucune autre attente mécanique indépendante n’est autorisée à être affaiblie.

TEMP et TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-b-runtime`, même lecteur mais hors checkout (les tests de preuve hors checkout exigent cette différence). Jonction node_modules vers divin-v5. La première suite exploratoire utilisait à tort un sous-dossier du checkout comme TEMP : un faux échec de garde de chemin ; les six autres échecs de référence sont les dérivés périmés (cinq) et le reçu de recette absent (un). Référence : 3300/3307, log ignoré tmp/gpt-phase-b/baseline-suite.log. B00 corrige les dérivés sans retoucher les attentes ; la recette initialise elle-même son reçu. Un manifeste de sources protégées est créé à partir du départ du worktree, jamais à partir de fichiers modifiés.

La phase est large (20 lots) : si elle dépasse la session, terminer le lot courant, commiter le rapport partiel et nommer exactement le premier lot restant, comme l’autorise la règle Volume. Ne jamais annoncer la phase finie sans B19 vert.

## Lots

### B00 — Resynchroniser les sorties générées du corpus étendu

- Objectif : Resynchroniser les sorties générées du corpus étendu.
- Inventaire : socle/validation transversal.
- Arbitrages : Aucun changement de règle.
- Comportements et tests : Le --check initial rouge devient vert après génération ; deux générations produisent les mêmes octets. Les autres 3307 tests sont relancés avec TEMP/TMP sur E: hors checkout et un reçu préparé par la recette.
- Emplacements et fichiers autorisés : tools/build-v5-divine-contracts.mjs : complementCorpusSha256, sourceFingerprint ; sorties js/data/v5-divine-contracts.json et docs/divin/DIVIN_INVENTAIRE.json seulement.
- Acceptation : `node tools/build-v5-divine-contracts.mjs --check`, puis suite complète.
- Risque : faible.

### B01 — Aucun Courroux de Prière à zéro Péché

- Objectif : Aucun Courroux de Prière à zéro Péché.
- Inventaire : `l06-217-fumble-wrath`, `l06-218-sin-trigger`, `l06-218-wrath-roll-plus10`, `l06-218-sin-decrement`.
- Arbitrages : Q12 prioritaire sur la règle imprimée de maladresse.
- Comportements et tests : Caractériser et commiter le comportement initial à zéro (unités 0 et maladresse), puis tests rouges de la nouvelle règle. À zéro : pas de table, succès/échec conservé, aucune décrémentation. À un ou plusieurs : maladresse et unités <= Péchés inchangées, +10/Péché et décrément post-résolution. Aperçu inerte, application, refus stale/tampering, reload et Undo/Redo.
- Emplacements et fichiers autorisés : js/core/v5-divine-engine.js : sinTrigger, wrathTriggered, wrath.reason ; tools/build-v5-divine-contracts.mjs : commonPrayerRules ; tests/divin-v5-b1-*.test.js, tests/divin-v5-control.test.js (seul statut du cas à zéro). Deux sorties générées si règle commune actualisée.
- Acceptation : `node --test tests/divin-v5-b1-zero-sin.test.js tests/divin-v5-b1-characterization.test.js tests/divin-v5-control.test.js`, puis suite complète.
- Risque : moyen.

### B02 — Exempter les cultes elfes du Péché et du Courroux

- Objectif : Exempter les cultes elfes du Péché et du Courroux.
- Inventaire : `l08-099-elf-priests-exempt`.
- Arbitrages : Q10 : exemption par culte, sans condition de race du personnage.
- Comportements et tests : Contrats canoniques elfes : pas de Courroux, même avec Péchés hérités et maladresse ; le MJ ne peut pas attribuer de Péchés à ce culte. Un Elfe suivant un culte humain conserve la règle humaine. Cul­te du contrat opposé à une saisie client forgée ; culte absent ou pluriel non désambiguïsé bloque un ajustement. Aperçu/application, persistance et annulation.
- Emplacements et fichiers autorisés : Nouveau js/core/v5-divine-cults.js (identités sourcées) ; js/core/v5-divine-engine.js et v5-divine-store.js : readSin/setStoreDivineSin ; js/ui/v5-divine-panel.js : Péchés ; tests/divin-v5-b2-*.test.js et nouveau parcours navigateur.
- Acceptation : `node --test tests/divin-v5-b2-elf-cults.test.js`, puis suite complète.
- Risque : moyen.

### B03 — Blessures directes et Tests de Calme/Résistance

- Objectif : Blessures directes et Tests de Calme/Résistance.
- Inventaire : `l06-218-wrath-01-05`, `l06-218-wrath-36-40`, `l06-218-wrath-51-55`, `l06-218-wrath-71-75`, `l06-218-wrath-81-87`.
- Arbitrages : Q1, Q3 : V5 ; calcul depuis Péchés avant décrément.
- Comportements et tests : 01-05 Calme +2, pas Résistance ; 36-40 : 1+Péchés ; 51-55/71-75 : d10+Péchés ; 81-87 : 2d10+Péchés. Tests partagés +2/0/-1/-2, dés explicitement saisis ; échec 81-87 : 1 Sonné plus un par DR négatif. Dégâts via service existant ; aucune dépendance à un texte libre. Missing dice bloque. Undo/reload/refus persistance.
- Emplacements et fichiers autorisés : js/core/v5-divine-wrath.js nouveau adaptateur ; v5-divine-store.js ; services v5-roll.js et v5-effects.js lus/réutilisés sans modification ; UI v5-divine-panel.js ; tests/divin-v5-b3-*.test.js ; générateur et ses sources si contrats typés nécessaires.
- Acceptation : `node --test tests/divin-v5-b3-damage.test.js`, puis suite complète.
- Risque : élevé.

### B04 — États et récupération conditionnée

Reprise B04 (session 3) : branche gpt/phase-b2 propre à d9166f2 puis avance rapide autorisée vers codex/divin-v5, 7ab5008, qui contient B01–B03 et la version 3.21.2. Aucun fichier hérité modifié. Le MJ autorise explicitement dans ce chat l’ajout ciblé dans store.js pour empêcher les retraits par updateParticipant({states}), après un commit séparé de caractérisation. Ce fichier est ajouté au périmètre B04 pour ce seul garde et son raccordement ; les services de Tour/résolution restent inchangés. Les verrous sont portés par occurrence, y compris si un État unique existait déjà ; Fortune, texte libre et retraits génériques ne les contournent pas. La récupération par Prière utilise le Test V5 partagé, les modificateurs réels, le plafond de Prière et le risque de nouveau Courroux. Les preuves B04 sont séparées sous tmp/gpt-phase-b/b4 ; le manifeste protégé de session 2 est conservé.

- Objectif : États et récupération conditionnée.
- Inventaire : `l06-218-wrath-16-20`, `l06-218-wrath-61-65`, `l06-218-wrath-66-70`, `l06-218-wrath-89-95`, `l06-219-wrath-101-105`, `l06-219-wrath-126-130`.
- Arbitrages : Q2 : trois Aveuglé. États existants 61-65 et 89-95 conservés.
- Comportements et tests : 16-20 À terre, retrait par Prière +2 ; 66-70 À terre et trois Aveuglé, Test +0 retire 1+DR Aveuglé ; 101-105 zéro PV et Inconscient jusqu’à un PV récupéré ; 126-130 zéro PV et Enflammé. Pas de retrait générique contournant la condition source. Acquisition canonique et traçabilité par occurrence.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, v5-divine-store.js, v5-effects.js/recovery (caractérisation committée avant changement si service partagé), v5-divine-panel.js, tests/divin-v5-b4-*.test.js ; générateur et L06-wrath-conditions-readings.mjs.
- Acceptation : `node --test tests/divin-v5-b4-states.test.js tests/divin-v5-wrath-conditions-independent.test.js`, puis suite complète.
- Risque : élevé.

### B05 — Interdictions et Actions de Prière en Rounds

- Objectif : Interdictions et Actions de Prière en Rounds.
- Inventaire : `l06-218-wrath-06-10`, `l06-218-wrath-11-15`, `l06-218-wrath-21-25`, `l06-218-wrath-31-35`, `l06-218-wrath-46-50`, `l06-218-wrath-76-80`.
- Arbitrages : V5 ; décision DIV-TIME-LESSONS-01 conservée pour 11-15 uniquement.
- Comportements et tests : 21-25 d10, 31-35 d10+Péchés, 46-50 2d10+Péchés : Prière bloquée jusqu’à vraie expiration. 76-80 Action imposée d10+Péchés Rounds avec quotas et choix MJ si Action déjà consommée. Hors combat : ancre explicite, jamais de faux Round depuis secondes. Conserver plafond 06-10 et Leçons 11-15.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, v5-divine-prayer-caps.js, v5-divine-store.js ; v5-store-action.js et v5-turn.js seulement après tests de caractérisation commités ; UI ; tests/divin-v5-b5-*.test.js.
- Acceptation : `node --test tests/divin-v5-b5-prayer-bans.test.js tests/divin-v5-wrath-lessons-independent.test.js`, puis suite complète.
- Risque : élevé.

### B06 — Compétences choisies par le MJ et malus calendaires

- Objectif : Compétences choisies par le MJ et malus calendaires.
- Inventaire : `l06-218-wrath-26-30`, `l06-218-wrath-56-60`.
- Arbitrages : Q6 : cases sur les compétences de cette fiche, aucun référentiel par culte.
- Comportements et tests : 26-30 plusieurs compétences -1 DR pour d10+Péchés heures ; 56-60 exactement une, pour d10+Péchés jours. Identifiants inconnus/vides refusés ; aucune sélection inventée ; effet lu par tout Test concerné et expire sur l’horloge commune. Undo et reload.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, v5-divine-store.js, UI v5-divine-panel.js ; services d’effets génériques ; v5-store-action.js/resolution.js seulement après caractérisation séparée ; tests/divin-v5-b6-*.test.js.
- Acceptation : `node --test tests/divin-v5-b6-skills.test.js`, puis suite complète.
- Risque : élevé.

### B07 — Alliés réprouvés du même camp

- Objectif : Alliés réprouvés du même camp.
- Inventaire : `l06-218-wrath-41-45`.
- Arbitrages : Q7 : même camp que le prêtre, liste corrigeable par le MJ.
- Comportements et tests : Proposer les participants du même camp, montrer les cases ; À terre sur les confirmés, toute prière du dieu les visant échoue d10+Péchés jours. Les autres dieux/cibles restent inchangés. Liste vide explicitement confirmée et cible disparue traitées sans invention.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, v5-divine-engine.js : validateTargetRules et succès ; v5-divine-store.js, UI ; tests/divin-v5-b7-*.test.js.
- Acceptation : `node --test tests/divin-v5-b7-allies.test.js`, puis suite complète.
- Risque : élevé.

### B08 — Suspension temporaire des talents et pureté des cultes

- Objectif : Suspension temporaire des talents et pureté des cultes.
- Inventaire : `l06-219-wrath-106-110`, `l06-219-wrath-116-120`, `l02-055-solkan-purity-gate`, `l25-091-stromfels-access`.
- Arbitrages : V5 et supplément ; aucun effacement de l’acquisition permanente pour une suspension.
- Comportements et tests : Béni/Invocation suspendus d10+Péchés ou 2d10+Péchés jours ; expiration rend l’accès. Solkan refuse si Péché ou Corruption ; Stromfels refuse Invocation à 2, Béni à 5. Les grants MJ ne contournent pas une sanction active. Inconnue de Corruption bloque en demande MJ.
- Emplacements et fichiers autorisés : v5-divine-access.js : resolveDivineAccess ; v5-divine-engine.js : accessError ; v5-divine-wrath.js, store et UI ; tests/divin-v5-b8-*.test.js.
- Acceptation : `node --test tests/divin-v5-b8-access.test.js`, puis suite complète.
- Risque : élevé.

### B09 — Chance limitée au prochain renouvellement

- Objectif : Chance limitée au prochain renouvellement.
- Inventaire : `l06-219-wrath-121-125`.
- Arbitrages : Q5 : V5, aucun trait psychologique V4.
- Comportements et tests : Marqueur one-shot : renouvellement normal donne un point, puis marqueur consommé ; pas de consommation sur simple dépense, ni à l’application du Courroux. Undo/reload/restauration et Chance temporaire préservés.
- Emplacements et fichiers autorisés : v5-resources.js (lecture du registre), v5-divine-wrath.js ; store.js si nécessaire avec caractérisation séparée ; UI ressources ; tests/divin-v5-b9-*.test.js.
- Acceptation : `node --test tests/divin-v5-b9-fortune.test.js`, puis suite complète.
- Risque : élevé.

### B10 — Registre de pénitences et clôture MJ

- Objectif : Registre de pénitences et clôture MJ.
- Inventaire : `l06-219-penance-definition`, `l06-219-cult-penances`, `l06-218-wrath-96-100`, `l19-112-ulric-penance`, `l21-006-shrine-pilgrimage`, `l25-089-stromfels-penances`.
- Arbitrages : Q8 : en cours/accomplie sur fiche ; seul le MJ clôture.
- Comportements et tests : Objet sourcé avec identité, texte et état ; créations distinctes, clôture idempotente refusée au joueur ; carte/fiche affiche les deux états. Raccordement aux restitutions dans lots suivants. Exemples par culte en paraphrases ; aucune réduction de Péché sans règle.
- Emplacements et fichiers autorisés : Nouveau v5-divine-penance.js ; store.js commandes après tests de caractérisation ; migration/sanitation nécessaires, UI fiche et panneau divin ; tests/divin-v5-b10-*.test.js et parcours navigateur.
- Acceptation : `node --test tests/divin-v5-b10-penance.test.js && node tests/divin-v5-b10-browser.mjs`, puis suite complète.
- Risque : élevé.

### B11 — Confiscation et restitution des possessions

- Objectif : Confiscation et restitution des possessions.
- Inventaire : `l06-219-wrath-111-115`.
- Arbitrages : Q8 ; un objet magique restitué par pénitence.
- Comportements et tests : Retrait des possessions identifiées, snapshot sans duplication ; clôture MJ restitue exactement l’objet choisi encore retenu. Inventaire changé ou objet déjà rendu : refus explicite. Pas de restitution globale au premier accomplissement.
- Emplacements et fichiers autorisés : v5-divine-penance.js, v5-divine-wrath.js, modèle d’équipement/commandes de fiche après caractérisation si partagé ; UI ; tests/divin-v5-b11-*.test.js.
- Acceptation : `node --test tests/divin-v5-b11-possessions.test.js`, puis suite complète.
- Risque : élevé.

### B12 — Hémorragie quotidienne jusqu’à pénitence

- Objectif : Hémorragie quotidienne jusqu’à pénitence.
- Inventaire : `l06-219-wrath-131-135`.
- Arbitrages : Q8 ; quantité calculée avant décrément.
- Comportements et tests : Chaque matin franchi sur l’horloge : 1+Péchés de l’occurrence, une seule application ; jours sautés traités explicitement, pas d’invention d’une heure de matin. Clôture MJ termine la récurrence ; acquisitions déjà présentes gardées. Rejeu/CAS/Undo.
- Emplacements et fichiers autorisés : v5-divine-penance.js, v5-divine-wrath.js, v5-game-time.js/adapter existant (caractérisation si modification) ; tests/divin-v5-b12-*.test.js.
- Acceptation : `node --test tests/divin-v5-b12-mornings.test.js`, puis suite complète.
- Risque : élevé.

### B13 — Excommunication et rejet définitif

- Objectif : Excommunication et rejet définitif.
- Inventaire : `l06-219-wrath-136-140`, `l06-219-wrath-146-150`.
- Arbitrages : Q8 : première pénitence rend Béni, deuxième Invocation.
- Comportements et tests : 136-140 suspension et compteur lié aux pénitences accomplies ; malus social -3 sans amélioration positive face aux membres confirmés du culte. 146-150 perte durable des talents et avances Prière confirmée par MJ, mutation annulable sans affecter les autres cultes/acquisitions. Faits sociaux saisis.
- Emplacements et fichiers autorisés : v5-divine-penance.js, v5-divine-wrath.js, accès et UI ; résolution sociale partagée après caractérisation ; tests/divin-v5-b13-*.test.js.
- Acceptation : `node --test tests/divin-v5-b13-rejection.test.js`, puis suite complète.
- Risque : élevé.

### B14 — Démon et Serviteur divin en participants

- Objectif : Démon et Serviteur divin en participants.
- Inventaire : `l06-218-wrath-88`, `l06-219-divine-servants`, `l06-219-wrath-141-145`.
- Arbitrages : Q4 : un démon, distance 2d10 ; serviteur à d100.
- Comportements et tests : Profil et position confirmés par MJ, un seul participant créé ; démon hostile attaque la cible la plus proche désignée ; serviteur agit selon décision MJ. Réutiliser invocation et insertion à Initiative phase A, aucune valeur de profil inventée, pas de fausse attaque automatique sans faits.
- Emplacements et fichiers autorisés : v5-divine-effects-summon.js, v5-divine-wrath.js, profils existants lus ; store et UI ; tests/divin-v5-b14-*.test.js.
- Acceptation : `node --test tests/divin-v5-b14-summons.test.js`, puis suite complète.
- Risque : élevé.

### B15 — Jugement dernier, Destin et proposition de rejet

- Objectif : Jugement dernier, Destin et proposition de rejet.
- Inventaire : `l06-219-wrath-151-plus`.
- Arbitrages : Q11 : retour par Destin puis proposition 146-150, confirmation MJ.
- Comportements et tests : Départ enregistré, ressource de Destin canonique débitée une fois si retour ; rejet proposé sans mutation avant confirmation. Refus sans Destin ; Undo/refus persistance/double clic ; pas de résurrection inventée.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, v5-resources.js lu, store.js si commande requise après caractérisation ; UI fiche ; tests/divin-v5-b15-*.test.js.
- Acceptation : `node --test tests/divin-v5-b15-fate.test.js`, puis suite complète.
- Risque : élevé.

### B16 — Absolution dédiée et pénitence d’Altdorf

- Objectif : Absolution dédiée et pénitence d’Altdorf.
- Inventaire : `l06-219-absolution`, `l20-219-penance-endeavour`.
- Arbitrages : Q9 : bouton, Test Prière partagé, réduction motivée, Courroux si échec ; Q12 prioritaire.
- Comportements et tests : Succès retire N confirmé, sans valeur négative ; échec à Péché positif ouvre la table, pas d’effet de bénédiction fictive. Altdorf : +2 DR, retrait 1 ou 2 à +4, Exténué sur échec ordinaire, maladresse Courroux. Aperçu, apply, reload, Undo et parcours navigateur.
- Emplacements et fichiers autorisés : v5-divine-wrath.js ou module absolution dédié, v5-roll.js réutilisé, v5-divine-store.js ; commandes store avec caractérisation séparée ; UI fiche ; tests/divin-v5-b16-*.test.js et navigateur.
- Acceptation : `node --test tests/divin-v5-b16-absolution.test.js && node tests/divin-v5-b16-browser.mjs`, puis suite complète.
- Risque : élevé.

### B17 — Attribution sourcée et retraits de Péchés assistés

- Objectif : Attribution sourcée et retraits de Péchés assistés.
- Inventaire : `l06-217-sin-award`, `l06-218-gm-discretionary`, `l06-217-cult-commandements`, `l06-220-petty-concerns`, `l06-229-shackles-of-truth`, `l06-229-sword-of-justice`, `l01-069-hospice-sin`, `l02-018-temple-event`, `l02-046-handrich-profit-sin`, `l02-047-shake-on-it-break-sin`, `l02-051-khaine-strictures-penances`, `l02-053-solkan-strictures-penances`, `l10-020-shrine-sin-removal`, `l13-070-myrmidia-strictures`, `l18-028-taal-sin-award`, `l18-049-ulric-omens`, `l19-021-ulric-strictures`, `l20-027-cult-strictures`, `l21-007-shining-rock-sin`, `l21-013-shrine-desecration`, `l24-090-gnome-strictures`, `l25-083-manann-strictures`, `l26-119-funeral-sin`.
- Arbitrages : Décisions MJ de faits et motifs ; Q12/Q10 prioritaires.
- Comportements et tests : Attribution/retrait avec motif et source, sans infraction inventée. Hors Prière : Courroux MJ explicite positif seulement. Boutons d’événement exécutent la mécanique après confirmation (1 Péché, retrait 1, retrait total selon source). Commandements/présages/usage répété restent rappels quand narratifs. Exemples Khaine/Solkan sans créer de profils.
- Emplacements et fichiers autorisés : Données sourcées nouvelles en paraphrases ; v5-divine-cults.js, v5-divine-store.js et UI ; tests/divin-v5-b17-*.test.js.
- Acceptation : `node --test tests/divin-v5-b17-sin-events.test.js`, puis suite complète.
- Risque : moyen.

### B18 — Extensions Courroux du complément

- Objectif : Extensions Courroux du complément.
- Inventaire : `l21-007-relic-wrath-modifier`, `l22-039-daily-wrath-tome`, `l22-071-sanctified-ground`, `l25-087-manann-overuse`, `l25-087-blessed-voyage-sin`, `l25-091-stromfels-mood-sin`.
- Arbitrages : Valeurs source, conversion V4 en DR ; Q12 prioritaire, zéro empêche la table quotidienne.
- Comportements et tests : Reliques : bonus Prière et réduction de table exacts, résultat <=0 évite ; livre skaven récurrent jusqu’aux faits MJ ; terre sanctifiée avec seuil MJ et dégâts canoniques ; cycle lunaire/navire explicitement fournis ; miracles navals utilisent Péchés canonique et dés saisis. Toute donnée manquante bloque. Pas de sous-système naval inventé.
- Emplacements et fichiers autorisés : v5-divine-wrath.js, couche/horloge génériques, nouveaux modules de sources et générateur si contrats changés ; v5-divine-store.js et UI ; tests/divin-v5-b18-*.test.js.
- Acceptation : `node --test tests/divin-v5-b18-supplements.test.js`, puis suite complète.
- Risque : élevé.

### B19 — Recette finale et contrôle de couverture

- Objectif : Recette finale et contrôle de couverture.
- Inventaire : socle/validation transversal.
- Arbitrages : Tous les arbitrages Courroux du 21/10.
- Comportements et tests : Vérifier les 89 entrées une par une (réalisée/assistée/rappel/exclue/bloquée avec preuve actuelle), parcours navigateur des lots, puis recette complète verte sans affaiblir les attentes. Rapport donne hashes, tests, choix et manques. Le vert de la recette ne certifie pas le reste du chantier divin.
- Emplacements et fichiers autorisés : docs/plans-gpt/RAPPORT_GPT_PHASE_B.md, CHOIX_EXECUTANT_PHASE_B.md ; inventaire via champs de réalisation séparés (conserver photographie B0) ; tests phase B ; aucun outil de recette modifié pour contourner un échec.
- Acceptation : `node tools/run-divine-recipe.mjs`, puis suite complète.
- Risque : élevé.

## Couverture complète des entrées

Les entrées engine/assisted aussi sont affectées à un lot : une preuve ancienne ne suffit pas à les clore. Les entrées absentes/reminder sont toutes affectées ci-dessous ou explicitement exclues.

| Identifiant | Statut B0 ou complément | Lot ou exclusion motivée |
| --- | --- | --- |
| l06-217-sin-award | assisted | B17 |
| l06-217-fumble-wrath | engine | B01 |
| l06-218-sin-trigger | engine | B01 |
| l06-218-wrath-roll-plus10 | engine | B01 |
| l06-218-sin-decrement | engine | B01 |
| l06-218-gm-discretionary | absent | B17 |
| l06-217-cult-commandements | reminder | B17 |
| l06-220-petty-concerns | reminder | B17 |
| l06-219-absolution | absent | B16 |
| l06-219-penance-definition | absent | B10 |
| l06-219-cult-penances | absent | B10 |
| l06-219-divine-servants | absent | B14 |
| l06-218-wrath-01-05 | assisted | B03 |
| l06-218-wrath-06-10 | engine | B05 |
| l06-218-wrath-11-15 | engine | B05 |
| l06-218-wrath-16-20 | assisted | B04 |
| l06-218-wrath-21-25 | assisted | B05 |
| l06-218-wrath-26-30 | assisted | B06 |
| l06-218-wrath-31-35 | assisted | B05 |
| l06-218-wrath-36-40 | assisted | B03 |
| l06-218-wrath-41-45 | assisted | B07 |
| l06-218-wrath-46-50 | assisted | B05 |
| l06-218-wrath-51-55 | assisted | B03 |
| l06-218-wrath-56-60 | assisted | B06 |
| l06-218-wrath-61-65 | engine | B04 |
| l06-218-wrath-66-70 | assisted | B04 |
| l06-218-wrath-71-75 | assisted | B03 |
| l06-218-wrath-76-80 | assisted | B05 |
| l06-218-wrath-81-87 | assisted | B03 |
| l06-218-wrath-88 | assisted | B14 |
| l06-218-wrath-89-95 | engine | B04 |
| l06-218-wrath-96-100 | assisted | B10 |
| l06-219-wrath-101-105 | assisted | B04 |
| l06-219-wrath-106-110 | assisted | B08 |
| l06-219-wrath-111-115 | assisted | B11 |
| l06-219-wrath-116-120 | assisted | B08 |
| l06-219-wrath-121-125 | assisted | B09 |
| l06-219-wrath-126-130 | assisted | B04 |
| l06-219-wrath-131-135 | assisted | B12 |
| l06-219-wrath-136-140 | assisted | B13 |
| l06-219-wrath-141-145 | assisted | B14 |
| l06-219-wrath-146-150 | assisted | B13 |
| l06-219-wrath-151-plus | assisted | B15 |
| l06-229-shackles-of-truth | reminder | B17 |
| l06-229-sword-of-justice | reminder | B17 |
| l06-195-ranalds-wrath-event | absent | Hors Courroux : événement d’aventure de Chance, aucun Péché ni table (inventaire B0). |
| l05-218-table-v4fr | reminder | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-218-div-notation | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-218-div-01-05 | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-218-div-66-70 | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-218-div-81-87 | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-218-div-88 | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l05-219-div-121-125 | absent | Nomenclature/variante V4 FR : exclue comme règle mécanique selon Q1-5, autorité V5 partout ; conversion de notation traitée dans les lots V5 correspondants. |
| l01-069-hospice-sin | absent | B17 |
| l02-018-temple-event | absent | B17 |
| l02-046-handrich-profit-sin | reminder | B17 |
| l02-047-shake-on-it-break-sin | reminder | B17 |
| l02-051-khaine-strictures-penances | absent | B17 |
| l02-053-solkan-strictures-penances | absent | B17 |
| l02-055-solkan-purity-gate | reminder | B08 |
| l04-018-lose-the-loot | reminder | Attitude narrative du receleur ; conserver le rappel existant, aucune table. |
| l08-099-elf-priests-exempt | absent | B02 |
| l10-020-shrine-sin-removal | absent | B17 |
| l13-070-myrmidia-strictures | absent | B17 |
| l13-079-vindicte-vengeresse | reminder | Miracle traité en phase A ; nom seul sans règle de Péché/Courroux. |
| l17-negative-sweep | absent | Balayage négatif existant, aucun mécanisme identifié. |
| l18-028-taal-sin-award | absent | B17 |
| l18-049-ulric-omens | absent | B17 |
| corpus-negative-sweep | absent | Balayage négatif existant, pas de nouvelle mécanique à inventer. |
| l19-021-ulric-strictures | absent | B17 |
| l19-112-ulric-penance | absent | B10 |
| l20-027-cult-strictures | absent | B17 |
| l20-219-penance-endeavour | absent | B16 |
| l21-006-shrine-pilgrimage | absent | B10 |
| l21-007-relic-wrath-modifier | absent | B18 |
| l21-007-shining-rock-sin | absent | B17 |
| l21-013-shrine-desecration | absent | B17 |
| l22-039-daily-wrath-tome | absent | B18 |
| l22-071-sanctified-ground | absent | B18 |
| l23-064-ranald-npc | absent | Exemple narratif de PNJ, aucune mécanique supplémentaire. |
| l24-090-gnome-strictures | absent | B17 |
| l25-083-manann-strictures | absent | B17 |
| l25-087-manann-overuse | absent | B18 |
| l25-087-blessed-voyage-sin | absent | B18 |
| l25-089-stromfels-penances | absent | B10 |
| l25-091-stromfels-access | absent | B08 |
| l25-091-stromfels-mood-sin | absent | B18 |
| l26-045-secular-code | absent | Faux positif : code séculier. |
| l26-119-funeral-sin | absent | B17 |

## Lecture source et choix

L06 p.218-219 relu visuellement avec Poppler, noms FR selon L05. Divergences 01-05, 66-70, 81-87, 88 et 121-125 résolues par V5 (Q1-5), sans sélecteurs hérités V4. Complément L19-L26 décrit dans COURROUX_INVENTAIRE.md ; livre par livre, lecture ciblée, pas d’attestation d’audit exhaustif. Aucun lecteur indépendant simulé. Les autres choix sont consignés dans CHOIX_EXECUTANT_PHASE_B.md avant leur réalisation ; données/dés/faits absents bloquent.

## Reprise session 4 — gpt/phase-b4

Départ propre 08e4362 de codex/divin-v5 (3.21.5, sessions 1–3 fusionnées), worktree E:/Outil MJ Warhammer/tmp/gpt-phase-b4-worktree. Branche demandée expressément par le MJ. Continuer depuis B05, un commit local par lot, jusqu’à moins de 30 % d’usage restant selon la consigne de cette session ; terminer le lot et le rapport proprement. Aucun push ni publication. Manifeste protégé créé avant code à ce départ ; TEMP/TMP hors checkout sur E:.

B05 : L06 p.218 relue visuellement. Contrairement à 11–15, aucun premier Round implicite n’est imposé : choix explicite du MJ (Round actuel ou suivant), ancre explicite hors combat. Les couches en Rounds attendent uniquement une transition canonique afterEffects et ne portent pas d’échéance générique que retirerait une phase libre. 76–80 exige une Prière comme Action ; la Prière déclencheuse peut compter pour le Tour seulement sur décision MJ explicite, aucune Action supplémentaire. Les Tests génériques de Prière passent par le parcours divin sourcé. Une récupération B04 peut poser les mêmes sanctions. Garde final dans v5-divine-store.js et caractérisation préalable de v5-turn.js/v5-store-action.js ; aucun changement de store.js.

### Complément B08 — session 4, autorisation directe du MJ

Le registre du départ ne contient aucun contrat Stromfels. L25 p.91 relu en texte et visuellement : ses six Bénédictions sont celles de Manann. Le MJ a explicitement autorisé dans ce chat l’ajout ciblé de ces six contrats au générateur et aux sorties internes, sans modifier les quatre catalogues protégés. Ajouter au périmètre B08 tools/build-v5-divine-contracts.mjs et sa source de Bénédictions existante si nécessaire, les sorties js/data/v5-divine-contracts.json et docs/divin/DIVIN_INVENTAIRE.json. Générer deux fois et comparer, --check et parcours navigateur de prières requis. Aucun Miracle de Stromfels nouveau n’est inventé ou ajouté par cette extension.

Corruption canonique observée : extensions.v5.corruptionPoints, champ utilisé par incidents et ressources. Absence reste inconnue : B08 demande une valeur MJ pour Solkan, sans supposer zéro. Les acquisitions permanentes de Béni/Invocation restent intactes ; sanctions calendaires = restrictions d’accès par occurrence.
### Variables persistantes PJ — consigne complémentaire du MJ

Le MJ demande explicitement de prendre en compte docs/VARIABLES_PERSISTANTES_PJ.md, y compris rétroactivement pour les lots B déjà faits. Document trouvé dans le worktree codex/divin-v5 à d50f07e (absent du checkout principal indiqué), lu puis repris comme seul document dans cette branche, sans fusion ni modification du worktree source. Périmètre de chaque lot B étendu à la tenue de ce registre : toute nouvelle valeur durable y est ajoutée avec son chemin, source actuelle sur fiche, commandes et lot. Les variables B00–B09 ont été recensées dans 9c0247a ; la pénitence B10 est documentée à mesure. La phase H d’écriture en retour reste un travail distinct.
