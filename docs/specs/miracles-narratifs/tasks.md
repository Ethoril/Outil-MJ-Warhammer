# Tâches · Miracles et bénédictions narratifs

Spec : [spec.md](spec.md) · Inventaire : [inventaire-assistes.md](inventaire-assistes.md) · Plan : [plan.md](plan.md). Douze lots, **strictement séquentiels** (ils partagent la grammaire, le registre des gestionnaires, le générateur et le JSON régénéré), dans cet ordre : L0, L10, L1, L2, L3, L4, L6, L5, L7, L8, L9, L11. Branche `main`, ne pas en changer.

| Lot | But | Modèle | Après |
|---|---|---|---|
| L0 | Garde-fou d'inventaire (CA2) | Sonnet | — |
| L10 | Requalification des clauses déjà tenues (F8), Q11, Q13 | Sonnet | L0 |
| L1 | F1 : modificateurs de Test | Sonnet | L10 |
| L2 | F1 : immunités, relances, drapeaux, bonus d'arme | Sonnet | L1 |
| L3 | **Brique F2** « Test imposé à la cible » | **Opus** | L2 |
| L4 | F5 : zones | Sonnet | L3 |
| L6 | F3 : compteurs | Sonnet | L4 |
| L5 | Stase et magie suspendue | **Opus** | L6 |
| L7 | Transferts de Dégâts | **Opus** | L5 |
| L8 | ~~Corruption (Unblemished Innocence)~~ : **lot vide** (hors combat, rappel) | — | L7 |
| L9 | Rappel enrichi F6 et F7 | Sonnet | L8 |
| L11 | Désengagement et perte d'Élan | **Opus** | L9 |

## Règles communes (ce bloc est collé en tête de chaque prompt)

- Lire d'abord `CLAUDE.md` (racine), la spec en entier (§6 et §7 : Q1 à Q17 tranchées), l'inventaire des assistés, puis le plan (« Points à vérifier tranchés », « Architecture », « Valeurs à relire »).
- **Avant de coder (Q10)** : relire dans le livre les seules valeurs chiffrées listées pour le lot dans le plan ; reporter au rapport, pour chacune, « valeur du contrat → valeur lue, livre, page ». Valeur introuvable ou différente : ne pas la coder, la clause reste en rappel, le dire au rapport (CA1). Texte extrait des livres, si besoin : `docs/divin/sources/` (lectures déjà faites) et `tmp/` (non versionné). Ne jamais recopier le texte d'un livre (vingt mots au plus de paraphrase, noms, chiffres, page).
- Contrats : modifier la **source** (`docs/divin/sources/miracles/*.mjs`, ou `tools/build-v5-divine-contracts.mjs` pour le livre de base), régénérer par `node tools/build-v5-divine-contracts.mjs`, jamais `js/data/v5-divine-contracts.json` à la main. Un contrat garde son champ `source`. Un type d'effet neuf : sa ligne dans `js/core/v5-divine-grammar.js`, son module `js/core/v5-divine-effects-<famille>.js`, son enregistrement dans `js/core/v5-divine-effect-handlers.js`, un test qui prouve qu'un type inconnu est refusé par le générateur (CA3).
- Garde-fou : tout lot qui change le statut d'un contrat, le mode ou la famille d'une clause met à jour `tests/fixtures/miracles-narratifs-familles.json` dans le même commit.
- Le test d'un lot est écrit **avant** son code et échoue d'abord. Tests ciblés, **un fichier par commande** : `node --test tests/unit/<dossier>/<fichier>.test.js` ; jamais `node --test tests/unit/<dossier>` (échoue sous Node 24) ; tout test navigateur sous `timeout 120`. Jamais la suite complète (lancée une fois à la fusion). Tout nouveau test unitaire va dans `tests/unit/`.
- **Non-régression (CA7)** : les tests existants ne sont jamais modifiés. Un test existant qui échoue : s'arrêter et expliquer.
- Le moteur ne tire aucun dé : le MJ saisit le jet de la cible (Q4). Tout effet s'annule en un seul ↶ et se rejoue par ↷.
- Un agent ne modifie aucun fichier hors de sa liste « Fichiers autorisés » : s'il en faut un autre, il le signale au rapport et s'arrête sur ce point. Tout nouveau module de `js/` va au précache de `sw.js`. Tout appel au Store depuis `js/ui/` est tolérant (`Store.methode?.()`) ; un lot qui touche `js/ui/` lance `node tools/run-browser-journeys.mjs --socle`.
- Interdits : modifier la spec ou l'inventaire ; pousser ; `git stash` ; `git add -A` ou `git add .` ; changer une règle métier pour faire passer un test ; reformater du code sans rapport ; ajouter une dépendance ; modifier `tests/fixtures/store-golden.json` ; envoyer quoi que ce soit sur le réseau. Interface et messages en français. Yards = mètres, même valeur. Une absence de champ facultatif se lit comme vide au point de lecture, sans réécrire les données.
- Commandes simples, une à la fois (les enchaînements `&&`, `|`, `;` peuvent être refusés).
- Commit local, fichiers nommés un par un, message en français suffixé « (Claude) », terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Rapport final, en français et court : relecture Q10 (valeur, livre, page), fichiers modifiés (une ligne chacun), sortie de chaque commande « fini quand », hash du commit, ce qui n'a pas pu être vérifié.
- Si bloqué : s'arrêter et expliquer, ne pas improviser.

**Commandes communes de non-régression** (citées « socle divin » dans les briefs) :
- `node --test tests/unit/divin/moteur-et-store.test.js`
- `node --test tests/unit/divin/catalogue-et-miracles.test.js`
- `node --test tests/unit/divin/audit-et-sources.test.js`
- `node --test tests/unit/divin/effets-socle-et-formulaire.test.js`
- `node --test tests/unit/divin/miracles-narratifs-inventaire.test.js`
- `node --test tests/unit/magie/couches-divines-invalides.test.mjs`
- `node --test tests/unit/refactor/store-golden.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`
- `node tools/build-v5-divine-contracts.mjs --check`

## L0 — Garde-fou d'inventaire
*Modèle conseillé : Sonnet. Après : rien. Aucun code de production.*

**But.** Verrouiller l'état de départ (CA2, deux niveaux de l'inventaire §5) : compte des contrats `manual` et famille de chacun ; compte des clauses `manual` des assistés et famille de chacune.

**Contexte.** Lire : `js/data/v5-divine-contracts.json` (structure : `type`, `status`, `clauses[].mode`, `clauses[].id`), spec §1-§2 (69 prières, familles), inventaire §2-§5 (88 clauses, clé `<id du contrat>#<id de clause>`). Modèle de test qui lit le JSON : `tests/unit/divin/catalogue-et-miracles.test.js`.

**Fichiers autorisés.** `tests/fixtures/miracles-narratifs-familles.json` (nouveau), `tests/unit/divin/miracles-narratifs-inventaire.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-inventaire.test.js` : (a) 69 contrats `manual` (60 miracles, 9 bénédictions), chacun présent dans la table avec sa famille, comptes F1 11, F2 6, F3 7, F4 4, F5 6, F6 28, F7 7 ; (b) 60 contrats `assisted`, tous `type: 'miracle'`, 50 avec au moins une clause `manual`, 88 clauses `manual`, chacune dans la table, comptes F1 11, F2 5, F3 3, F4 1, F5 1, F6 48, F8 19 ; (c) un contrat ou une clause absent de la table, ou présent dans la table mais plus `manual`, fait échouer le test avec un message français qui le nomme.

**À livrer.** La table en donnée (`{ contracts: { id: famille }, clauses: { "id#clause": famille } }`), construite depuis les tableaux de la spec et de l'inventaire (ids réels du JSON, vérifiés).

**Critères couverts.** CA2.

**Interdits spécifiques.** Aucun fichier de `js/` ni de `tools/`.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-inventaire.test.js`
- `node --test tests/unit/divin/catalogue-et-miracles.test.js`

## L10 — Requalification des clauses déjà tenues (F8), Q11, Q13
*Modèle conseillé : Sonnet. Après : L0.*

**But.** Passer en `mode: 'engine'` les clauses que le moteur tient déjà, en prouvant pour chacune la garde ou le paramètre qui la tient.

**Contexte.** Lire le plan (« Points à vérifier tranchés »). Clauses (inventaire §3, détail F8, plus deux reclassées) : `eagle-intangible` (générateur l. 52-53), `line-of-sight` (règle `seesPriest`, `v5-divine-grammar.js:36`), `area` et `duration` (En bon ordre), `duration-unattested` (Sur un terrain mortel, Q13), `free-attack` (`v5-divine-effects-gear.js:68-77`, `resolution/input.js:72`), `myrmidians`, `allies`, `table-roll`, les huit clauses de pureté de Solkan (`withCultRule`, générateur l. 128-134 ; garde `v5-divine-access.js:69-77`), `end` (Chaînes de vérité), `end` (Épée de justice), `weapon-restriction` et `sword-only` (A10, `v5-divine-effects-gear.js:131-133`, `classConfirmed`). Q11 : `priest-counted` (Vaincre les impies, `sigmar.mjs`) : ajouter au contrat un second effet identique `appliesTo: 'caster'` (le prêtre gagne la Haine même non désigné, `v5-divine-engine.js:669-671`), puis requalifier la clause. Q13 : la durée Bonus de Volonté en Rounds reste ; la clause devient `engine` et le contrat porte l'étiquette « durée non attestée par le livre » dans un champ que L9 affichera (`labels.durationNote`, absent = rien).

**Fichiers autorisés.** `tools/build-v5-divine-contracts.mjs`, `docs/divin/sources/miracles/{myrmidia-up-in-arms,ranald-trompeur,sigmar,solkan,verena,ulric}.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/divin/miracles-narratifs-requalification.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-requalification.test.js` : pour chaque clause requalifiée, le comportement qui la tient (aigle avec le Trait Intangible ; cible qui ne voit pas le prêtre refusée ; durée issue de `params.duration` ; prêtre Solkan avec Péché ou Corruption > 0 refusé, Corruption inconnue refusée ; arme hors classe non bloquante et reçu « classe d'arme non confirmée » ; prêtre de Vaincre les impies porteur de la Haine sans être désigné) ; le rappel de pureté de Solkan reste affiché une fois au résultat ; la clause n'apparaît plus dans `reminders`.

**À livrer.** 22 clauses en `engine` ; table du garde-fou : clauses `manual` des assistés 88 → 66, F1 11 → 9, F6 48 → 47, F8 → 0.

**Critères couverts.** CA1, CA2, CA3, CA7 ; Q11, Q13.

**Interdits spécifiques.** Pas de nouveau type d'effet, pas de code de `js/core/`. Si une clause n'est pas réellement tenue par le moteur, la laisser `manual` et le dire.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-requalification.test.js`
- socle divin
- `node --test tests/unit/divin/acces.test.js`
- `node --test tests/unit/divin/invocations.test.js`
- `node --test tests/unit/divin/effets-equipement-tests.test.js`

## L1 — F1 : modificateurs de Test
*Modèle conseillé : Sonnet. Après : L10.*

**But.** Passer en `assisted` Talk Your Way Out, The Gamemaster, A Deal's a Deal, Fair Winds, Lord of the Hunt, Crisis of Confidence, et brancher `stealth` (Grâce de Ranald, Q14) et `force-test` (Rage de Rhya), avec le type existant `test-modifier`.

**Contexte.** Lire : `js/core/v5-divine-effects-tests.js` (formes `modifiers`, `fromSuccessLevels`, `durationBonus`), `js/core/effect-engine.js:147-183` (clé `carac:F`), `js/core/v5-test-modifiers.js:153` ; sources `ranald-nuit.mjs`, `ranald-joueur.mjs`, `handrich.mjs`, `manann.mjs`, `taal.mjs`, `ranald.mjs`, `rhya-archives3.mjs`. Q9 : le Péché de profit de Handrich reste un rappel (L9). Q14 : ±10 sur une compétence se lit ±1 DR ; Crisis of Confidence suit la même lecture (−20 → −2 DR), à afficher. La part non branchable (vitesse du navire, renoncement de l'adversaire, condition d'arrestation) reste en clause `manual`.

**Fichiers autorisés.** Les sources citées, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/divin/miracles-narratifs-f1.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-f1.test.js` : pour chaque prière, couche `testModifiers` sur la bonne cible et la bonne clé, valeur avec DR du Test de Prière, durée et expiration (`expireDivineEffects`), la part restée manuelle dans `reminders` (CA4) ; `carac:F` appliquée à un Test de Force et absente d'un Test d'Agilité.

**Critères couverts.** CA1, CA2, CA3, CA4, CA7 ; Q14.

**Interdits spécifiques.** Pas de modification de `js/core/` : si un modificateur ne s'exprime pas avec `test-modifier`, laisser la prière `manual` et l'écrire au rapport.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-f1.test.js`
- socle divin
- `node --test tests/unit/divin/effets-equipement-tests.test.js`
- `node --test tests/unit/moteur/q6-t1-magie-priere.test.js`

## L2 — F1 : immunités, relances, drapeaux, bonus d'arme
*Modèle conseillé : Sonnet. Après : L1.*

**Tri du MJ (17/11, `tri-combat.md`).** Waterlungs reste un rappel (le MJ l'a tranché) : rien à brancher, plus de `mathlann.mjs` dans ce lot. Hoarfrost Thews : calculé (confirmé par le MJ).

**But.** Brancher Hoarfrost Thews, Vindicte vengeresse, et les clauses `ignore-ap`, `unconscious-duration`, `unarmed-damaging`, `remove-bleeding`, `terror-and-skills`, `missile` ; reclasser Pelt of the Winter Wolf et Free Your Mind en F6 (table seulement ; ce sont des rappels).

**Contexte.** Lire : `js/core/v5-divine-effects-gear.js` (`specialStateKeys` l. 13, `weapon-bonus` l. 123-170, `grant-trait`), `js/core/v5-magic-combat.js:50-78` (lecture des bonus d'arme : `unarmedOnly`, `hitConditions`), `js/core/damage.js:122` (`computeDamage`, `targetArmour`), `js/core/creature-natures.js:44-69` (Immunité (Froid)), `js/core/resolution.js:476-480` (`fearTerrorImmunity`), `js/core/v5-divine-effects-conditions.js` (`free-reroll` l. 209-230, `expiry-condition` l. 109-125), `js/core/v5-divine-effects-damage.js` (`ordinary-damage`), sources `ulric-pbtt.mjs`, `ulric.mjs`, `myrmidia-up-in-arms.mjs`, `verena.mjs`, `taal.mjs`, `solkan.mjs`. Décisions : Hoarfrost = `grant-trait` « Immunité (Froid) », climat en rappel ; Vindicte = `free-reroll` avec un champ neuf de portée (Tests de Mêlée, sans limite pendant la durée), charge forcée en rappel ; `terror-and-skills` = ajouter `fearTerrorImmunity` à `specialStateKeys` ; `ignore-ap`, `remove-bleeding` (retrait d'États au coup), `unarmed-damaging` (qualité Inoffensif levée) : champs facultatifs neufs de `weapon-bonus`, absents = comportement actuel ; `unconscious-duration` : durée minimale sur l'État posé par le Test d'Épée de justice ; `missile` (Q16) : `ordinary-damage` Dégâts +2, BE et PA appliqués.

**Fichiers autorisés.** `js/core/v5-divine-effects-gear.js`, `js/core/v5-divine-effects-conditions.js`, `js/core/v5-magic-combat.js` (lecture des champs neufs seulement), `js/core/v5-divine-grammar.js` (si un type change de ligne, aucun nouveau type attendu), les sources citées, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/divin/miracles-narratifs-f1.test.js`.

**Tests à écrire d'abord.** Dans `miracles-narratifs-f1.test.js` : attaque étiquetée froid annulée sur le porteur de Hoarfrost, pas sur un autre ; relance de Vindicte sur un Test de Mêlée, refusée sur un Test de Tir ; dégâts de l'Épée de justice sans PA ; Hémorragique retiré par la hache, pas posé ; attaque à mains nues non Inoffensive sous Dent et griffe, Inoffensive sans ; Terreur ignorée sous Cœur du loup ; Fureur du soleil vertueux : Dégâts réduits par BE et PA ; expiration de chaque couche ; une arme sans ces champs donne les mêmes dégâts qu'avant (CA7).

**Critères couverts.** CA1, CA2, CA3, CA4, CA7 ; Q16.

**Interdits spécifiques.** Ne pas toucher `resolution.js`, `damage.js`, `v5-turn.js`, `store.js`, `js/ui/`. Si un champ exige un changement dans `resolution.js` ou `damage.js`, laisser la clause `manual` et l'écrire au rapport.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-f1.test.js`
- socle divin
- `node --test tests/unit/divin/effets-equipement-tests.test.js`
- `node --test tests/unit/divin/effets-degats-conditions.test.js`
- `node --test tests/unit/combat/degats-et-armures.test.js`
- `node --test tests/unit/combat/jets-et-defense.test.js`

## L3 — Brique F2 « Test imposé à la cible »
*Modèle conseillé : **Opus** (brique générique réutilisée par L4, L5, L11 ; touche `previewV5Turn`). Après : L2.*

**Tri du MJ (17/11, `tri-combat.md`).** Bamboozle et Balm to a Wounded Mind : calculés (confirmés par le MJ). Shake on It, Under My Protection, Unremembered Face et Truth Will Out sont hors combat : ils restent des rappels. Conséquences : plus de récurrence `morning` ni de bouton « Test du matin » ; `when: 'manual'` et `resolveDivineImposedTest` restent (Portal's Threshold, L4, est confirmé) ; `handrich.mjs` et `ranald-protecteur.mjs` sortent du lot.

**But.** Créer le type `imposed-test` et le collecteur des effets divins récurrents ; brancher Bamboozle, Balm to a Wounded Mind, et les clauses `terror-test`, `athletics`, `prone-each-round`, `endurance-test`, `free-frenzy`.

**Contexte.** Lire : le registre `js/core/v5-divine-effect-handlers.js` (l. 1-45 : contrat d'un gestionnaire, `inputFields`, `factFields`), `js/core/v5-divine-effects-conditions.js` (issues existantes), `js/core/v5-turn.js:112-160` (modèle `runTraits`, `requests`, dédoublonnage), `js/core/trait-effects.js:121-130` (`markLostTurn`, `liftLostTurn`), `js/core/store/api-divine.js` (commandes divines), `js/ui/v5-divine-form-model.js`, `js/ui/v5-effect-dialog.js`, `js/ui/v5-divine-panel.js`, `js/core/v5-test-modifiers.js` (calcul d'un Test à partir d'un d100 saisi). Forme : `{ type: 'imposed-test', test: { skill, slModifier }, subjects: 'targets'|'enemies'|'allies', when: 'cast'|'round'|'turn'|'move'|'manual', opposedBy?: { skill }, onFailure: [effets existants], onSuccess?: [...], marker?: { cause, label } }`. Saisie : d100 de la cible (réussite et DR calculés depuis son score) ou réussite + DR saisis. `when: 'cast'` : champ du formulaire de lancement ; `round` / `turn` / `move` : demande du tour via `collectDivineRecurringEffects` (`js/core/v5-divine-recurring.js`), appelé par `previewV5Turn` au début du Round ou du Tour du porteur, patches appliqués dans le même état (un commit, un ↶) ; `manual` : bouton du panneau divin, commande `resolveDivineImposedTest(participantId, layerId, input)`. Gelure : issue = marqueur « tour perdu » de cause `divine-defensive-only`, libellé « hors actions défensives ». Effrayer l'ennemi : multi-cibles, issue Brisé (indice et DR négatifs) puis Peur.

**Fichiers autorisés.** `js/core/v5-divine-effects-imposed.js` (nouveau), `js/core/v5-divine-recurring.js` (nouveau), `js/core/v5-divine-grammar.js`, `js/core/v5-divine-effect-handlers.js`, `js/core/v5-turn.js` (un appel et ses demandes, seulement), `js/core/store/api-divine.js`, `js/ui/v5-divine-panel.js`, `js/ui/v5-effect-dialog.js` (si un `kind` manque), les sources `ranald-trompeur.mjs`, `shallya.mjs`, `verena.mjs`, `myrmidia-up-in-arms.mjs`, `manann.mjs`, `taal-deft.mjs`, `ulric-pbtt.mjs`, `ulric.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `sw.js`, `tests/unit/divin/miracles-narratifs-f2.test.js`, `tests/unit/combat/miracles-narratifs-tour.test.js`, `tests/unit/ui/miracles-narratifs-interface.test.js` (nouveaux).

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-f2.test.js` : pour chaque prière et clause, réussite et échec de la cible et l'issue appliquée dans chaque cas (CA5) ; Test non saisi : aperçu `needs-input` nommant la cible ; aucun dé tiré par le moteur ; type inconnu refusé par le générateur. `tests/unit/combat/miracles-narratifs-tour.test.js` : Vent sauvage demande le Test à chaque début de Round, À terre sur échec, un seul ↶ ; Fureur d'Ulric demande le Test de Frénésie au Tour de l'allié ; Gelure : marqueur posé puis levé à la fin du Tour suivant ; participant sans couche : état identique. `tests/unit/ui/miracles-narratifs-interface.test.js` : bouton de Test imposé `manual` (prévu pour Portal's Threshold, L4), Store sans la méthode : aucun plantage.

**Critères couverts.** CA1, CA2, CA3, CA5, CA6 (↶), CA7 ; Q4.

**Interdits spécifiques.** Ne pas toucher `resolution.js` ni `store.js`. Ne pas modifier la forme des `requests` existantes. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-f2.test.js`
- `node --test tests/unit/combat/miracles-narratifs-tour.test.js`
- `node --test tests/unit/ui/miracles-narratifs-interface.test.js`
- socle divin
- `node --test tests/unit/divin/etats-et-contexte.test.js`
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `node --test tests/unit/combat/traits-calculs-tour.test.js`
- `node tools/run-browser-journeys.mjs --socle`

## L4 — F5 : zones
*Modèle conseillé : Sonnet. Après : L3.*

**Tri du MJ (17/11, `tri-combat.md`).** Portal's Threshold : calculé (confirmé par le MJ). Becalm et Silence Reigns sont hors combat : ils restent des rappels, sans zone à libellé seul ; `manann.mjs` et `ranald-nuit.mjs` sortent du lot.

**But.** Créer le type `divine-zone` et brancher Portal's Threshold, Pax of Taal, et la clause `no-ranged` (Vent sauvage).

**Contexte.** Lire : plan (« Architecture », F5), `js/core/v5-divine-effects-imposed.js` (L3 : le franchissement de Portal's Threshold est un `imposed-test` `when: 'manual'`), `js/core/reminders.js:28` et `deriveReminders`, `js/ui/resolution-panel/result.js`, `js/core/v5-magic-combat.js:97` (`attackNature`, armes à poudre). Forme : couche du prêtre `{ zone: { radius, members: [], excludes: ['ranged-attack'|'attack'], exceptions: ['gunpowder','artillery'], affects?: { trait | keyword } , label } }` ; présence désignée par le MJ (`setDivineZoneMembers(casterId, layerId, ids)`), jamais lue sur la carte. Lecteurs purs `divineZoneOf(participant, participants)` et `divineZoneAttackWarnings({ attacker, target, action, participants })` : un avertissement en français dans le panneau de résultat, que le MJ peut passer outre ; aucun refus.
**Fichiers autorisés.** `js/core/v5-divine-effects-zones.js` (nouveau), `js/core/v5-divine-grammar.js`, `js/core/v5-divine-effect-handlers.js`, `js/core/store/api-divine.js`, `js/core/reminders.js`, `js/ui/resolution-panel/result.js`, `js/ui/v5-divine-panel.js`, les sources `morr.mjs`, `taal-deft.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `sw.js`, `tests/unit/divin/miracles-narratifs-f5.test.js` (nouveau), `tests/unit/ui/miracles-narratifs-interface.test.js`.

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-f5.test.js` : pour chaque prière, application (couche et membres), ↶, expiration, affichage sur le participant (CA6) ; Pax of Taal : attaque d'un porteur de Bestial membre avertie, d'un autre non ; Vent sauvage : tir dans la zone averti, arme à poudre non ; membres modifiés en un ↶.

**Critères couverts.** CA1, CA2, CA3, CA6, CA7.

**Interdits spécifiques.** Ne pas toucher `resolution.js`, `v5-turn.js`, `store.js`, la carte. Aucun refus d'action.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-f5.test.js`
- `node --test tests/unit/ui/miracles-narratifs-interface.test.js`
- socle divin
- `node tools/run-browser-journeys.mjs --socle`

## L6 — F3 : compteurs
*Modèle conseillé : Sonnet. Après : L4.*

**Tri du MJ (17/11, `tri-combat.md`).** Twist of Fortune et Force the Hand of Chance : calculés (confirmés par le MJ, le type `miracle-counter` reste donc utile). A Suitable Sucker, One Almighty Lie et Wilderness Way sont hors combat : ils restent des rappels ; `ranald-trompeur.mjs` et `taal-deft.mjs` sortent du lot.

**But.** Créer le type `miracle-counter` et brancher Twist of Fortune, Force the Hand of Chance, et la clause `hatred-kill` (Vaincre les impies).

**Contexte.** Lire : plan (« Architecture », F3), `js/core/v5-divine-effects-conditions.js` (`temporary-fortune`, `free-reroll` et leur consommation), `js/core/v5-divine-effects-imposed.js` (Twist of Fortune : Sociabilité opposée par `imposed-test`), `js/core/v5-divine-effects-gear.js:15` (`talent-hatred` injecté), la lecture du Talent Haine dans le calcul d'un Test de combat (à localiser par recherche de `talent-hatred`), `js/core/store/api-divine.js`. Forme : couche `{ counter: { key, label, value, min: 0 } }`, valeur initiale entière, `fromSuccessLevels` ou saisie du MJ (jets de 1d10 de Force the Hand of Chance : saisis) ; commande `spendDivineCounter(participantId, layerId, amount)` : un ↶, journal en français, refus sous `min`. Le bonus dépensé se reporte par le MJ dans le Test (affiché, pas injecté). `hatred-kill` : case « a tué un ennemi visé » sur le porteur, bonus de Haine porté à la valeur relue (Q10).

**Fichiers autorisés.** `js/core/v5-divine-effects-counters.js` (nouveau), `js/core/v5-divine-grammar.js`, `js/core/v5-divine-effect-handlers.js`, `js/core/store/api-divine.js`, le module qui lit le Talent Haine (à nommer au rapport, lecture du bonus seulement), `js/ui/v5-divine-panel.js`, les sources `handrich.mjs`, `ranald-joueur.mjs`, `sigmar.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `sw.js`, `tests/unit/divin/miracles-narratifs-f3.test.js` (nouveau), `tests/unit/ui/miracles-narratifs-interface.test.js`.

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-f3.test.js` : pour chaque prière, application, dépense, ↶ de la dépense, expiration, affichage (CA6) ; Force the Hand of Chance : une saisie au-dessus du seuil remet le compteur à 0 ; Twist of Fortune : point de Chance de la cible retiré seulement sur échec du Test opposé ; Haine : +1 avant, valeur relue après la case.

**Critères couverts.** CA1, CA2, CA3, CA6, CA7 ; Q9 (aucun Péché automatique).

**Interdits spécifiques.** Ne pas toucher `resolution.js`, `v5-turn.js`, `store.js`. Aucun dé tiré.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-f3.test.js`
- `node --test tests/unit/ui/miracles-narratifs-interface.test.js`
- socle divin
- `node --test tests/unit/divin/peche-destin-possessions.test.js`
- `node --test tests/unit/combat/jets-et-defense.test.js`
- `node tools/run-browser-journeys.mjs --socle`

## L5 — Stase et magie suspendue
*Modèle conseillé : **Opus** (moteurs partagés : tour, États, expiration, lancement de sorts, Q7). Après : L6.*

**But.** Brancher Light of Stasis (temps suspendu pour les cibles) et Still the Winds (zone où la magie est dissipée et où Incantation et Canalisation échouent).

**Contexte.** Lire : `js/core/v5-turn.js` (phases, `runPhase`, ordre l. 112-160), `js/core/v5-effects.js` (pertes de fin de Round, l. 349-400), `js/core/v5-divine-engine.js:779-809` (`expireDivineEffects`), `js/core/v5-magic-turn.js`, `js/core/v5-magic-casting.js:272` (`previewCasting`), `js/core/v5-magic-channelling.js`, `js/core/v5-spell-effects-active.js` (`unsuppressedSpellEffects` : suppression existante), `js/core/v5-divine-effects-zones.js` (L4), `js/core/v5-divine-effects-gear.js:13`. Light of Stasis : drapeau `stasis` dans `specialStateKeys` ; pour son porteur, le tour ne fait avancer ni États, ni pertes, ni expirations, ni sorts ; la couche de stase elle-même expire normalement. Still the Winds : zone de L4 avec `suppressMagic: true` ; lancement et canalisation refusés pour un membre (message français), couches de sort des membres suspendues par le mécanisme de suppression existant, rétablies à la sortie ou à l'expiration.

**Fichiers autorisés.** `js/core/v5-turn.js`, `js/core/v5-effects.js`, `js/core/v5-divine-engine.js` (expiration seulement), `js/core/v5-magic-turn.js`, `js/core/v5-magic-casting.js`, `js/core/v5-magic-channelling.js`, `js/core/v5-spell-effects-active.js`, `js/core/v5-divine-effects-gear.js`, `js/core/v5-divine-effects-zones.js`, `docs/divin/sources/miracles/solkan.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/divin/miracles-narratifs-stase.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-stase.test.js` : stase sur un Enflammé et Hémorragique pendant deux Rounds : aucune perte, aucune expiration d'autre couche, reprise à la fin ; ↶ ; Still the Winds : lancement refusé pour un membre, accepté hors zone ; couche de sort suspendue puis rétablie ; participant sans couche : état identique au tour près.

**Critères couverts.** CA1, CA2, CA3, CA6, CA7 ; Q7.

**Interdits spécifiques.** Ne pas toucher `resolution.js` ni `store.js`. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-stase.test.js`
- socle divin
- `node --test tests/unit/divin/temps-et-calendrier.test.js`
- `node --test tests/unit/divin/etats-et-contexte.test.js`
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `node --test tests/unit/magie/lancement-focalisation.test.js`
- `node --test tests/unit/magie/incidents-dissipation-haute-magie.test.js`
- `node --test tests/unit/combat/miracles-narratifs-tour.test.js`

## L7 — Transferts de Dégâts
*Modèle conseillé : **Opus** (moteur de dégâts et commit du résultat, Q7). Après : L5.*

**But.** Brancher Martyr (les Dégâts de la cible sont subis par le prêtre), Back at You et la clause `redirect-stunned` (Jugement du Roi des Neiges : le prêtre qui subit le renvoi reçoit aussi Sonné).

**Contexte.** Lire : `js/core/resolution.js` (calcul et application des Blessures du défenseur, aperçu puis résultat), le commit d'un résultat dans `js/core/store.js` (où les Blessures du défenseur sont écrites ; modèle traits-calculs L3), `js/core/damage.js:122`, `js/core/v5-divine-effects-damage.js` (renvoi existant, `strike` l. 174), `js/core/v5-divine-effects-gear.js:13`. Martyr : couche `damageTransfer: { toId }` sur la cible ; les Blessures calculées pour la cible sont portées au prêtre dans la même commande, la cible n'en perd aucune, journal des deux. Back at You : couche sur le plus faible, valeur saisie par le MJ, ajoutée une fois à sa prochaine attaque contre le plus fort puis consommée. `redirect-stunned` : branche interne au gestionnaire de dégâts.

**Fichiers autorisés.** `js/core/resolution.js`, `js/core/store.js` (commit du résultat seulement), `js/core/v5-divine-effects-damage.js`, `js/core/v5-divine-effects-gear.js`, `js/core/v5-divine-grammar.js`, `js/core/v5-divine-effect-handlers.js`, `js/core/sanitize.js` (si un champ est éliminé), sources `shallya.mjs`, `ranald-protecteur.mjs`, `ulric.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/combat/miracles-narratifs-transferts.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/combat/miracles-narratifs-transferts.test.js` : Martyr : coup sur la cible, Blessures au prêtre, cible intacte, ↶ et ↷, expiration ; prêtre à 0 Blessure : décision de mort habituelle ; Back at You : bonus appliqué une fois puis consommé ; Jugement renvoyé : prêtre Sonné ; résultat sans couche : identique (CA7).

**Critères couverts.** CA1, CA2, CA3, CA6, CA7 ; Q7.

**Interdits spécifiques.** Ne pas toucher `v5-turn.js` ni `js/ui/`. Pas de nouvel État. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/combat/miracles-narratifs-transferts.test.js`
- socle divin
- `node --test tests/unit/divin/effets-degats-conditions.test.js`
- `node --test tests/unit/combat/degats-et-armures.test.js`
- `node --test tests/unit/combat/jets-et-defense.test.js`
- `node --test tests/unit/combat/traits-calculs-resolution.test.js`

## L8 — Corruption : Unblemished Innocence (lot vide)
*Lot vide : rien à faire. Après : L7.*

**Tri du MJ (17/11, `tri-combat.md`).** Unblemished Innocence est hors combat (absolution de Corruption, effet de campagne) : la prière reste un rappel, sans calcul. Récupération (Rhya, Shallya) et Bitter Catharsis restent aussi des rappels (Q5). Aucun type `corruption-absolution`, aucun fichier à modifier, aucun test. Le lot est marqué vide ; Q6 (point d'accroche de la Corruption) n'a plus d'objet pour ce chantier. L9 suit directement L7.

## L9 — Rappel enrichi F6 et F7
*Modèle conseillé : Sonnet. Après : L8 (vide, donc L7).*

**Tri du MJ (17/11, `tri-combat.md`).** Les prières et clauses hors combat gardent le rappel actuel au résultat : aucune couche affichée, aucun libellé, aucun test (liste dans `tri-combat.md` §1 et §2 : Conscience × 7, Récupération × 2, Ruissellement, La pression retombe, Chaînes de vérité, etc.). Le MJ a confirmé comme rappels Waterlungs, Free Your Mind, Grâce de Ranald (clause `stealth`) et A Deal's a Deal ; A Deal's a Deal est hors combat (aucun enrichissement), les trois autres sont classés combat. Les autres « à confirmer » (Bitter Catharsis, Connaître son Ennemi, Rhya's Dominion, Rhya's Taming, clauses ÀC) restent des rappels, enrichis ici.

**But.** Rendre utile le rappel des seules prières « combat » restées `manual` (Last Rites, Connaître son Ennemi, Rhya's Dominion, Rhya's Taming, Bitter Catharsis, Free Your Mind, Waterlungs) et des 29 clauses « combat » restantes des assistés (dont `stealth` de Grâce de Ranald) : durée suivie, portée et cible affichées, libellé court sur le participant (Q2), sans calcul. Conscience × 7 (Q3) reste inchangée, sans enrichissement.

**Contexte.** Lire : `js/core/v5-divine-engine.js:561-567` (rappels du résultat) et `:676-698` (couche `manual-prayer-reminder`), `js/core/reminders.js` (`divineStateReminders` l. 28, `deriveReminders` l. 85-120), `js/ui/v5-divine-panel.js`, `js/ui/v5-divine-form-model.js`, `tools/build-v5-divine-contracts.mjs` (clauses). Ajouts : champ facultatif `shortLabel` d'une clause (60 caractères au plus) dans les sources ; la couche de rappel porte `reminder: { label, range, targets, durationNote? }` (portée et cibles résolues, `labels.durationNote` de L10) ; `deriveReminders` liste les couches de rappel actives du participant ; le panneau divin montre le libellé et l'échéance. Lectures affichées : Q13 (« durée non attestée par le livre »), Péché à attribuer à la main pour Q15 (Épée de justice, clause `sin`). Q9, Q12 et le lien vers la table de Courroux (Chaînes de vérité) sont retirés : Ruissellement, Handrich et Chaînes de vérité sont hors combat. Prière instantanée : rappel au résultat seulement (CA8, comme aujourd'hui).

**Fichiers autorisés.** `js/core/v5-divine-engine.js` (couche de rappel seulement), `js/core/reminders.js`, `tools/build-v5-divine-contracts.mjs`, les sources de `docs/divin/sources/miracles/`, `js/data/v5-divine-contracts.json` (régénéré), `js/ui/v5-divine-panel.js`, `js/ui/v5-divine-form-model.js`, `MJ.css` (classes seulement), `tests/unit/divin/miracles-narratifs-rappels.test.js` (nouveau), `tests/unit/ui/miracles-narratifs-interface.test.js`.

**Tests à écrire d'abord.** `tests/unit/divin/miracles-narratifs-rappels.test.js` : chaque prière restée `manual` garde son statut et son rappel au résultat (CA8) ; prière à durée : couche avec libellé, portée, cible, échéance, puis expiration ; rappel listé par `deriveReminders` ; contrat sans `shortLabel` : libellé de repli ; Conscience × 7 inchangée (Q3) ; `tests/unit/divin/moteur-et-store.test.js:1378` reste vert (la couche ne porte ni modificateur ni Trait).

**Critères couverts.** CA2, CA7, CA8 ; Q2, Q3, Q13, Q15.

**Interdits spécifiques.** Aucun effet calculé ; aucun statut changé.

**Fini quand.**
- `node --test tests/unit/divin/miracles-narratifs-rappels.test.js`
- `node --test tests/unit/ui/miracles-narratifs-interface.test.js`
- socle divin
- `node --test tests/unit/divin/temps-et-calendrier.test.js`
- `node --test tests/unit/divin/prieres-benedictions.test.js`
- `node tools/run-browser-journeys.mjs --socle`

## L11 — Désengagement et perte d'Élan
*Modèle conseillé : **Opus** (moteurs de combat partagés, Q17). Après : L9.*

**But.** (a) En bon ordre : prouver par des tests que le Désengagement et la Fuite lisent déjà `orderlyDisengage`, requalifier `flee-exemption` et `broken-from-fleeing` en `engine`, corriger le rappel devenu faux. (b) Froid de la gelée blanche : au début de chaque Round, les membres de la zone, sauf le prêtre, perdent leur Élan.

**Contexte.** Lire : `js/core/engagements.js:222-260` (`previewDisengage`, l. 238), `js/core/v5-broken-escape.js:43-77` (l. 57-66), `js/core/store/api-engagements.js:97`, `js/ui/workspace/plateau.js:65`, `js/core/reminders.js:28` (texte « à appliquer par le MJ »), `js/core/v5-turn.js:131-144` (début de Round), `js/core/v5-divine-recurring.js` (L3), `js/core/v5-divine-effects-zones.js` (L4), `js/core/trait-effects.js` (`momentumCount`). Relecture Q10 : si le livre exige encore le Test de Désengagement sous En bon ordre, `engagements.js:238` est faux : s'arrêter et le signaler au MJ, ne pas corriger seul.

**Fichiers autorisés.** `js/core/reminders.js`, `js/core/v5-divine-recurring.js`, `js/core/v5-turn.js` (l'appel du collecteur au début du Round, seulement), `js/core/v5-divine-effects-zones.js`, sources `myrmidia-up-in-arms.mjs`, `ulric.mjs`, `js/data/v5-divine-contracts.json` (régénéré), `tests/fixtures/miracles-narratifs-familles.json`, `tests/unit/combat/miracles-narratifs-elan-desengagement.test.js` (nouveau).

**Tests à écrire d'abord.** `tests/unit/combat/miracles-narratifs-elan-desengagement.test.js` : Désengagement d'un allié En bon ordre ; Fuite engagée : aucun Élan ni attaque gratuite adverse, Brisé toujours dû ; rappel corrigé ; Froid de la gelée blanche : membres avec Élan le perdent au début du Round, prêtre et non-membres le gardent, journal, un ↶ ; sans couche : Round identique.

**Critères couverts.** CA1, CA2, CA6, CA7 ; Q17.

**Interdits spécifiques.** Ne pas modifier `engagements.js` ni `v5-broken-escape.js` (sauf feu vert du MJ après relecture). Ne pas toucher `resolution.js`, `store.js`. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/combat/miracles-narratifs-elan-desengagement.test.js`
- `node --test tests/unit/combat/engagements.test.js`
- `node --test tests/unit/combat/engagements-store.test.js`
- `node --test tests/unit/moteur/q6-t2-desengagement.test.js`
- `node --test tests/unit/divin/brise-et-fuite.test.js`
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `node --test tests/unit/combat/miracles-narratifs-tour.test.js`
- socle divin

## À la fusion (hors lots)

Une seule fois : `node --test "tests/unit/**/*.test.js"`, puis `node --test "tests/unit/**/*.test.mjs"` (CA10), `node tools/build-v5-divine-contracts.mjs --check`, `node tools/run-browser-journeys.mjs --socle`. Version et publication restent au MJ (`node tools/bump-version.mjs`, notes rédigées à la main).
