# Plan · Miracles et bénédictions narratifs

Sur `404476b` (branche `main`). Spec : [spec.md](spec.md) (§6 et §7 : Q1 à Q17 tranchées ; CA1 à CA10). Inventaire des assistés : [inventaire-assistes.md](inventaire-assistes.md). Tâches : [tasks.md](tasks.md).

## Approche

1. **Tout passe par le moteur d'effets divin (CA3, Q8).** Un effet neuf = un type déclaré sur **sa propre ligne** dans `js/core/v5-divine-grammar.js` (`effectTypes`, convention des lignes séparées l. 13-25), un gestionnaire dans **son** module `js/core/v5-divine-effects-<famille>.js`, enregistré dans `js/core/v5-divine-effect-handlers.js` (imports l. 37-41 et fusion des modules), le générateur `tools/build-v5-divine-contracts.mjs` refusant tout type inconnu par `validateEffect` (l. 9 et 258). Le contrat change dans sa source (`docs/divin/sources/miracles/*.mjs`, ou `tools/build-v5-divine-contracts.mjs` pour les miracles et bénédictions du livre de base), jamais dans `js/data/v5-divine-contracts.json` à la main : on régénère, puis `node tools/build-v5-divine-contracts.mjs --check`.
2. **Le MJ saisit, le moteur ne tire aucun dé (Q4, CA5).** Une demande de Test ou de dé suit la forme des formulaires divins (`inputFields`, `factFields`, lus par `js/ui/v5-divine-form-model.js`) au lancement, et la forme `requests` / `inputs[participantId][field]` du tour (`js/core/v5-turn.js`, modèle `runTraits` l. 112-121) pour ce qui revient chaque Round ou chaque Tour.
3. **Un effet = une couche** dans `extensions.v5.divineEffects` : fin d'effet, ↶ et synchro la nettoient sans code de plus (`expireDivineEffects`, `v5-divine-engine.js:779`). Tout bouton hors lancement est une commande du Store (`executeCommand`), un seul ↶.
4. **Requalifier avant de construire.** Les clauses déjà tenues par le moteur passent en `mode: 'engine'` (L10) avant tout autre lot, pour que le garde-fou compte juste.
5. **Le reste est un rappel enrichi (Q2, Q3).** F6 et F7 restent `manual` ; le rappel gagne durée suivie, portée, cible et libellé court sur le participant.

## Points « à vérifier » de l'inventaire, tranchés dans le code

| Point | Constat | Décision |
|---|---|---|
| Fichier déclarant d'Œil de l'aigle | `tools/build-v5-divine-contracts.mjs:52-53` (table `sourceSix` des miracles de Myrmidia du livre de base). `docs/divin/sources/L06-prayers.mjs:61` n'en porte que le résumé de lecture | L10 édite le générateur, l. 53 |
| Déclaration de Conscience (Solkan) | `tools/build-v5-divine-contracts.mjs:163-167` (`supplementBlessingCults`, `withCultRule`), pas `solkan.mjs` | Inchangé (F7, rappel) |
| Clauses de pureté de Solkan | Ajoutées à **chaque** contrat Solkan par `withCultRule` (l. 128-134), qui pose aussi `contract.reminders` ; refus déjà tenu par `js/core/v5-divine-access.js:69-77` | L10 passe la clause en `engine` dans `withCultRule` ; le rappel reste affiché une fois par `contract.reminders` (`v5-divine-engine.js:562`) |
| `test-modifier` sur une caractéristique (`force-test`) | Oui sans champ neuf : une clé `carac:F` est conservée par `normalizeTestKey` (`v5-divine-effects-tests.js:26-30`), portée par la couche, et lue par `targetAppliesToTest` (`effect-engine.js:157,177`) pour tout Test dont le contexte porte `carac` (`v5-test-modifiers.js:153`) | L1 : `modifiers: { 'carac:F': 2 }`. Elle vaut aussi pour les compétences liées à F : à confirmer en relisant la page (Q10) |
| `free-attack` (Attaque rapide) | Gestionnaire `v5-divine-effects-gear.js:68-77` ; lu par `resolution/input.js:72` et `store.js:4304` (`divine-free-attack`) | F8, L10 |
| Classe d'arme (`weapon-restriction`, `sword-only`) | `weaponClass` posé sur les quatre contrats ; arbitrage **A10** (`v5-divine-effects-gear.js:131`) : la classe est demandée, jamais bloquante ; la case `classConfirmed` existe (`v5-divine-form-model.js:313`, rappel « classe d'arme non confirmée » l. 385) | Reclassées **F1 → F8**, L10 (A10 tient : pas de blocage) |
| En bon ordre (`flee-exemption`) | **Déjà branché** : `engagements.js:238` (Désengagement), `v5-broken-escape.js:59-66` (Fuite : ni Élan ni attaque gratuite), `api-engagements.js:97`, `plateau.js:65` | L11 réduit à des tests et à la requalification ; `broken-from-fleeing` (Brisé dû, `v5-broken-escape.js:57-58`) passe **F6 → F8** avec elle. Le rappel `reminders.js:28` (« à appliquer par le MJ ») devient faux : corrigé en L11 |
| Élan au début du Round (`momentum-loss`) | Pas de lecture divine ; point d'accroche : `previewV5Turn`, phase `startOfRound` (`v5-turn.js:142-143`), modèle `runTraits` | L11 |
| Issue « actions défensives seulement » (Gelure) | Pas d'État dédié ; le marqueur non bloquant « tour perdu » existe (`trait-effects.js:121-127`, `markLostTurn`/`liftLostTurn`) | L3 réutilise ce marqueur, cause `divine-defensive-only`, libellé « hors actions défensives » |
| Corruption (Q6, Unblemished Innocence) | Commande `applyCorruptionAbsolution(id, { amount, reason })` (`store.js:2630-2654`), fonction pure importée de `v5-corruption.js` (`store.js:10`), recopie `updateCorruptionCopies` (`store.js:801`). Aucun historique par session | L8 s'y branche ; le MJ saisit les points gagnés à la dernière session (plafond) |
| Le froid, fait du moteur ? (Hoarfrost Thews, Pelt) | Seulement comme étiquette d'attaque (`attackNature`, `v5-magic-combat.js:97-108`) filtrée par le Trait Immunité (`creature-natures.js:44,64-69`) ; aucune pénalité de climat | Hoarfrost : `grant-trait` « Immunité (Froid) » (L2), climat en rappel. **Pelt : F1 → F6** (rien à brancher) |
| Free Your Mind | Aucun Statut comparé dans le moteur de Test (Statut lu seulement par `v5-sequelae.js`) | **F1 → F6** (rappel enrichi, L9) |
| Cœur du loup (`terror-and-skills`) | Le drapeau `fearTerrorImmunity` est déjà lu par `resolution.js:477` (sorts) mais absent de `specialStateKeys` (`v5-divine-effects-gear.js:13`) | L2 l'ajoute à la liste ; Intimidation et Effrayant restent rappel |
| Couche de rappel des prières `manual` | `manual-prayer-reminder` posée pour toute durée non instantanée (`v5-divine-engine.js:676-698`) ; aucun affichage dédié ; `deriveReminders` ne lit que `orderlyDisengage` (`reminders.js:28`) | L9 enrichit cette couche et l'affiche |

**Reclassements du plan** (le garde-fou L0 part de l'état de la spec ; chaque lot met à jour la table qu'il change) : Pelt et Free Your Mind F1 → F6 (L2) ; `weapon-restriction`, `sword-only` F1 → F8 (L10) ; `priest-counted` F6 → requalifiée `engine` par Q11 (L10) ; `broken-from-fleeing` F6 → F8 (L11).

## Architecture : briques nouvelles

| Brique | Où | Accroches |
|---|---|---|
| **F2 · Test imposé à la cible** | Type `imposed-test`, module neuf `js/core/v5-divine-effects-imposed.js` ; collecteur pur `collectDivineRecurringEffects` dans `js/core/v5-divine-recurring.js` | Au lancement : `inputFields` (`imposedTests.<cibleId>` : d100 saisi, ou réussite + DR saisis) ; issue appliquée par les gestionnaires existants (`condition`, `remove-condition`, `special-state`) ou par le marqueur `markLostTurn`. Récurrence `round` / `turn` / `move` : `previewV5Turn` appelle le collecteur (comme `runTraits`), demandes dans `requests`, patches dans le même état. Récurrence `manual` / `morning` : commande `resolveDivineImposedTest` dans `js/core/store/api-divine.js` |
| **F3 · Compteurs** | Type `miracle-counter`, module neuf `js/core/v5-divine-effects-counters.js` | Couche `{ counter: { key, label, value, min } }` ; commande `spendDivineCounter(participantId, layerId, amount)` (api-divine, un ↶) ; valeur initiale par règle (`fromSuccessLevels`, saisie) |
| **F5 · Zones** | Type `divine-zone`, module neuf `js/core/v5-divine-effects-zones.js` | Couche sur le prêtre `{ zone: { radius, members[], excludes[], exceptions[], affects } }` ; le MJ désigne les présents (`setDivineZoneMembers`, aucune géométrie de carte) ; lecteurs purs `divineZoneOf`, `divineZoneAttackWarnings` (avertissement, jamais un refus) |
| **F6 · Rappel enrichi** | `v5-divine-engine.js:676-698` (couche `manual-prayer-reminder`) ; champ facultatif `shortLabel` des clauses dans le générateur | La couche porte `reminder: { label, range, targets, durationNote? }` ; `reminders.js` (`divineStateReminders`, l. 28) lit les couches actives ; fiche et panneau divin les affichent. Absence de `shortLabel` = libellé tiré du nom du contrat |
| Moteurs partagés (L5, L7, L11) | `v5-turn.js`, `v5-effects.js`, `v5-magic-casting.js:272`, `v5-magic-channelling.js`, `v5-spell-effects-active.js` (`unsuppressedSpellEffects`), `resolution.js`, `v5-divine-effects-damage.js`, commit du résultat dans `store.js` | Un lot chacun, en dernier, avec tests de non-régression |

**Interface.** Formulaire de lancement : rien à coder pour les champs déclarés par `inputFields`/`factFields` (lus par `v5-divine-form-model.js`) ; boutons hors lancement et affichages : `js/ui/v5-divine-panel.js`, `js/ui/resolution-panel/result.js` (avertissements de zone), `js/ui/v5-effect-dialog.js` (demandes du tour). Tout appel au Store est tolérant (`Store.methode?.()`). Les modules neufs vont au précache de `sw.js`.

## Ordre des lots

L0 → **L10** → L1 → L2 → L3 → L4 → L6 → L5 → L7 → L8 → L9 → **L11**. Séquentiel : deux lots n'écrivent jamais en parallèle dans `v5-divine-grammar.js`, `v5-divine-effect-handlers.js`, le générateur ou le JSON régénéré. L3, L4, L6 créent chacun leur module ; L5 dépend de la zone de L4 (Still the Winds), L11 aussi (Froid de la gelée blanche). L9 vient après les lots de calcul : il habille ce qui reste `manual`.

| Lot | Contenu | Modèle |
|---|---|---|
| L0 | Garde-fou d'inventaire (CA2, deux niveaux) | Sonnet |
| L10 | Requalification F8 (19 + 2 classes d'arme), Q11, Q13 | Sonnet |
| L1 | F1, modificateurs de Test (6 prières + `stealth`, `force-test`) | Sonnet |
| L2 | F1, immunités, relances, drapeaux, champs de `weapon-bonus`, `missile` | Sonnet |
| L3 | **Brique F2** + 6 prières + 5 clauses récurrentes | **Opus** |
| L4 | F5 zones (4 prières + `no-ranged`) | Sonnet |
| L6 | F3 compteurs (5 prières + `hatred-kill`) | Sonnet |
| L5 | Light of Stasis, Still the Winds | **Opus** |
| L7 | Martyr, Back at You, `redirect-stunned` | **Opus** |
| L8 | Unblemished Innocence | Sonnet |
| L9 | Rappel enrichi F6/F7 (prières et clauses) | Sonnet |
| L11 | Désengagement (vérification) et perte d'Élan | **Opus** |

## Risques

- **CA7 contre Q1.** Requalifier une clause d'un contrat assisté retire son texte des rappels du résultat (`v5-divine-engine.js:566-567`). Lecture retenue : les couches, reçus et effets appliqués des contrats existants ne changent pas ; un test existant qui échoue est un point d'arrêt à remonter au MJ, jamais un test à réécrire.
- **`withCultRule` touche tous les contrats Solkan**, y compris bénédictions et prières `manual` : le rappel de pureté doit rester visible (par `contract.reminders`).
- **Golden master du Store** (`tests/fixtures/store-golden.json`) : toute commande ajoutée dans `api-divine.js` peut le faire bouger ; le lot s'arrête alors.
- **Tour (`previewV5Turn`)** : L3, L5 et L11 y ajoutent un appel ; ordre des phases à respecter (sorts de fin de Round avant expiration divine, l. 132-136).
- **Zones sans géométrie** : la présence est désignée par le MJ ; ne pas lire la carte.
- **Valeurs du livre** : aucune valeur codée sans relecture (Q10) ; une valeur introuvable reste « à vérifier dans le livre » et la clause reste en rappel (CA1).
- **Taille de `store.js`** (plus de 6 000 lignes) : commandes neuves dans `js/core/store/api-divine.js`, pas dans `store.js`, sauf L7 (commit du résultat) et L8 (recopie de Corruption).

## Non-régression (CA7)

Chaque lot qui touche le moteur divin rejoue, sans les modifier, les seize fichiers de `tests/unit/divin/` concernés par son « fini quand », plus `tests/unit/magie/couches-divines-invalides.test.mjs`, `tests/unit/lot5/c54-divin.test.mjs`, `tests/unit/refactor/store-golden.test.js` et `tests/unit/donnees/audit-meta-production.test.js`. Lots à moteur partagé, en plus : L3, L5, L11 `tests/unit/combat/initiative-et-tours.test.js` ; L5 `tests/unit/magie/lancement-focalisation.test.js`, `tests/unit/magie/incidents-dissipation-haute-magie.test.js` ; L7 `tests/unit/combat/degats-et-armures.test.js`, `tests/unit/combat/jets-et-defense.test.js`, `tests/unit/divin/effets-degats-conditions.test.js` ; L11 `tests/unit/combat/engagements.test.js`, `tests/unit/combat/engagements-store.test.js`, `tests/unit/moteur/q6-t2-desengagement.test.js`, `tests/unit/divin/brise-et-fuite.test.js`. Suite complète une seule fois, à la fusion (CA10).

## Vérification des critères

| CA | Vérification |
|---|---|
| CA1 | Liste Q10 du lot relue et reportée au rapport (valeur, livre, page) ; champ `source` inchangé (`tests/unit/divin/audit-et-sources.test.js`) |
| CA2 | `tests/unit/divin/miracles-narratifs-inventaire.test.js` + table `tests/fixtures/miracles-narratifs-familles.json` (L0, mise à jour par chaque lot) |
| CA3 | `--check` du générateur ; un test par type neuf : contrat au type inconnu refusé |
| CA4 | `miracles-narratifs-f1.test.js` (L1, L2) |
| CA5 | `miracles-narratifs-f2.test.js` (L3) |
| CA6 | `-f3`, `-f5`, `-stase`, `-transferts`, `-corruption` (L4 à L8) : application, ↶, expiration, affichage |
| CA7 | « Non-régression » ci-dessus |
| CA8, CA9 | `miracles-narratifs-rappels.test.js` (L9) ; CA9 sans objet (plus de question ouverte) |
| CA10 | Fusion |

## Valeurs à relire dans le livre avant de coder (Q10)

Liste par lot : valeur telle que le contrat la porte aujourd'hui, à confirmer ou corriger dans le livre cité. Abréviations : LdB = Livre de base V5 ; Archives 3 ; Deft = Deft Steps, Light Fingers ; UiA = Up in Arms ; PBtT = Power Behind the Throne Companion. Le texte extrait des livres sert à relire ; rien n'en est recopié.

- **L0** : aucune.
- **L10** : Sur un terrain mortel, durée Bonus de Volonté en Rounds, absente du livre (UiA 79, Q13) ; En bon ordre, rayon et durée Bonus de Volonté (UiA 79) ; Attaque rapide, Test d'Initiative +0 DR (UiA 79) ; Dévotion de la Guerrière 36 m, Compétence martiale 24 m (UiA 79) ; Malice de Ranald, table 1d10 (Deft 24) ; Chaînes de vérité et Épée de justice, fin après BSoc Rounds (LdB 229) ; Vaincre les impies, zone et prêtre compté (LdB 227, Q11) ; classes d'arme : marteau de guerre (LdB 227), épée (Archives 3, 55 ; LdB 229) ; pureté de Solkan (Archives 3, 55).
- **L1** : Talk Your Way Out +8 DR (Deft 18) ; The Gamemaster +4 DR (Deft 19) ; A Deal's a Deal +2 DR, +1 par +2 DR (Archives 3, 47) ; Fair Winds +1 DR Navigation (LdB 222) ; Lord of the Hunt +1 DR (LdB 227) ; Crisis of Confidence −20, lu −2 DR par la lecture de Q14 (Deft 19) ; Grâce de Ranald, Discrétion +10 lu +1 DR (LdB 225, Q14) ; Rage de Rhya, Force +2 DR et étendue « Tests de Force » (Archives 3, 74).
- **L2** : Hoarfrost Thews (PBtT 50) ; Waterlungs (Lustria 81) ; Vindicte vengeresse, relance de chaque Test de Mêlée (UiA 79) ; Épée de justice, PA ignorés et Inconscient au moins BSoc Rounds (LdB 229) ; Dent et griffe, mains nues non Inoffensives (LdB 228) ; Morsure de l'hiver, Hémorragique retiré (LdB 228) ; Cœur du loup, Terreur (PBtT 50) ; Fureur du soleil vertueux, Dégâts +2 et calcul des DR (Archives 3, 55, Q16).
- **L3** : Shake on It, Calme Moyen (+20) (Archives 3, 47) ; Under My Protection, Calme +0 chaque matin, Exténué, durée en mois (Deft 25) ; Bamboozle, Calme −20, 1 Round, Taille Moyenne ou moins (Deft 24) ; Unremembered Face, Calme −20, deux faits (Deft 24) ; Balm to a Wounded Mind, Calme +0 si non consentante (LdB 226) ; Truth Will Out, Calme +2 DR opposé (LdB 229) ; Effrayer l'ennemi, Terreur (1) (UiA 79) ; Mer déchaînée, Athlétisme +2 DR (LdB 223) ; Vent sauvage, Endurance −10 chaque Round (Deft 88) ; Gelure, Endurance +0 (PBtT 50) ; Fureur d'Ulric, Test de Frénésie gratuit (LdB 228, règle p.184).
- **L4** : Becalm, rayon Sociabilité mètres (LdB 222) ; Portal's Threshold, ligne de 8 m, Calme Intermédiaire (LdB 223) ; Silence Reigns, zone (Deft 18) ; Pax of Taal, zone et Trait Bestial (Deft 88) ; Vent sauvage, armes à poudre et d'artillerie exceptées (Deft 88).
- **L6** : Twist of Fortune, 1 point de Chance, Sociabilité opposée (Archives 3, 47) ; Force the Hand of Chance, +1 DR, seuil 6 sur 1d10 (Deft 19) ; A Suitable Sucker, relances (Deft 24) ; One Almighty Lie, 1d10 + DR (Deft 24) ; Wilderness Way, DR en réserve de relances (Deft 88) ; Vaincre les impies, +2 DR au lieu de +1 après avoir tué (LdB 227).
- **L5** : Light of Stasis et Still the Winds, cibles, zone, durée, ce qui est suspendu (Archives 3, 55).
- **L7** : Martyr (LdB 226) ; Back at You (Deft 25) ; Jugement du Roi des Neiges, renvoi et Sonné (LdB 228).
- **L8** : Unblemished Innocence, 1 point, +1 par +2 DR, points de la dernière session (LdB 226).
- **L9** : seulement les durées et portées affichées par le rappel, lues dans `params` du contrat, page du §1.2 de la spec ou de l'inventaire ; Sur un terrain mortel affiché « durée non attestée par le livre » (Q13).
- **L11** : En bon ordre, Test de Désengagement encore dû ou non (le moteur le saute, `engagements.js:238`) (UiA 79) ; Froid de la gelée blanche, zone, perte d'Élan au début de chaque Round, prêtre exclu (LdB 228).
