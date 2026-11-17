# Tâches · Calculs des Traits de créature

Spec : [spec.md](spec.md) · Plan : [plan.md](plan.md) · Tri : [tri.md](tri.md). Tout est séquentiel dans l'outil : deux lots n'écrivent jamais dans les mêmes fichiers en parallèle. **Exception** : le lot de la carte (L7, autre dépôt) peut tourner en parallèle d'un lot de l'outil, une fois L4 commité. Branche locale `traits-calculs` dans l'outil, ne pas en changer ; branche `main` dans `E:/rpg-map-display` pour L7. Huit lots, L1 à L8.

| Lot | But | Modèle | Après |
|---|---|---|---|
| L1 | Moteur pur : demandes, patches, trois collecteurs | Sonnet | — |
| L2 | Branchement du tour, mort, Inflammable | **Opus** | L1 |
| L3 | Branchement de la résolution, Élan, Bouclier | **Opus** | L2 |
| L4 | Petits calculs, Bond (outil), nettoyage 2C | Sonnet | L3 |
| L5 | Méthodes du Store pour les boutons | Sonnet | L4 |
| L6 | Interface | Sonnet | L5 |
| L7 | Carte : champ `bondCells` (autre dépôt) | Sonnet | L4 |
| L8 | Parcours navigateur | Sonnet | L6, L7 |

## Règles communes (chaque brief les reprend ; ce bloc est collé en tête de chaque prompt)

- Lire d'abord `CLAUDE.md` (racine), la spec en entier et le plan. Les points « à trancher » du plan sont réputés tranchés selon leur recommandation, sauf si le prompt dit autrement. Texte extrait des livres, si un détail manque : `tmp/reprise-team/traits-calculs-spec/` et `tmp/reprise-team/traits-d13/` (non versionnés).
- Le test d'un lot est écrit **avant** son code et échoue d'abord. Tests ciblés, **un fichier par commande** : `node --test tests/unit/<dossier>/<fichier>.test.js` (ou `.test.mjs`), jamais `node --test tests/unit/<dossier>` (échoue sous Node 24) ; tout test navigateur sous `timeout 120`. Jamais la suite complète (lancée une fois à la fusion). Tout nouveau test unitaire va dans `tests/unit/`.
- Un agent ne modifie aucun fichier hors de sa liste « Fichiers autorisés » : s'il en faut un autre, il le signale dans son rapport et s'arrête sur ce point.
- Tout lot qui touche `js/ui/workspace-view.js` ou un écran partagé appelle le Store de façon tolérante (`Store.methode?.()`) et lance le socle navigateur dans son « fini quand » : `node tools/run-browser-journeys.mjs --socle` (le lanceur borne chaque parcours à 120 s).
- Tout nouveau module de `js/` est ajouté au précache de `sw.js` ; `node --test tests/unit/donnees/audit-meta-production.test.js` doit rester vert. Tout nouveau parcours navigateur est ajouté à `tests/parcours.json`.
- Interdits : modifier la spec ; pousser ; `git stash` ; `git add -A` ou `git add .` (nommer chaque fichier) ; changer une règle métier pour faire passer un test (s'arrêter et expliquer) ; reformater du code sans rapport ; ajouter une dépendance ; modifier `tests/fixtures/store-golden.json` ; recopier du texte d'un livre (noms, chiffres, page, paraphrase de vingt mots au plus). Interface et messages en français. Yards = mètres, même valeur. Une absence de champ facultatif se lit comme vide au point de lecture, sans réécrire les données. N'envoyer rien sur le réseau.
- Une demande de dé ouverte d'office a un bouton qui tire le dé en plus de la saisie (D13) ; le moteur pur, lui, ne tire jamais un dé. Un seul ↶ annule chaque effet.
- Commandes simples, une à la fois (les enchaînements `&&`, `|`, `;` peuvent être refusés).
- Commit local, fichiers nommés un par un, message en français suffixé « (Claude) », terminé par la ligne exacte `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Rapport final, en français et court : fichiers modifiés (une ligne chacun), sortie de chaque commande « fini quand », hash du commit, ce qui n'a pas pu être vérifié.
- Si bloqué : s'arrêter et expliquer, ne pas improviser.

## L1 — Moteur pur : demandes, patches, collecteurs
*Modèle conseillé : Sonnet. Après : rien. Aucun moteur partagé touché.*

**But.** Écrire le module pur `trait-effects.js` : la demande de dé uniforme, les patches annulables, le marqueur « tour perdu », l'adaptateur d'Élan et les calculs des collecteurs de blessure et de Round, sans rien brancher.

**Contexte.** Lire : `js/core/creature-states.js` (`planStateOnWound`, `planUnstableEndOfRound`, `planDieHard`, `planVampiricHeal`), `js/core/creature-psychology.js` (`planPsychology` : `stupid`, `bestial`, `hungry`), `js/core/engagements.js` (`engagedWith`), `js/core/v5-roll.js`, `js/core/v5-test-modifiers.js` (`resolveV5TestModifiers` : valeur d'un Test avec modificateurs, pour `testTarget`), `js/core/v5-turn.js` (comment `requests` et `inputs[participantId][field]` circulent, sans le modifier), `js/core/store.js` ~4001-4066 (modèle des commandes de Trait), `js/core/resolution.js:1233-1262` (modèle `mountedFallPlans`), `js/core/v5-critical-aftermath.js:166` (`decideStateDeath`). Constats 1, 2, 3, 4 et 6 de la spec ; D7, D8, D10, D14, D15.

**Fichiers autorisés.** `js/core/trait-effects.js` (nouveau), `js/core/creature-states.js` et `js/core/creature-psychology.js` (seulement pour accepter une option nouvelle ; anciens appels et anciens tests inchangés), `tests/unit/creatures/traits-calculs-demandes.test.js`, `tests/unit/creatures/traits-calculs-blessure.test.js`, `tests/unit/creatures/traits-calculs-rounds.test.js` (nouveaux), `sw.js` (précache).

**À livrer.** Les signatures du plan, section « Contrats ». (a) `traitRequest` : `{ field, kind, participantId, label, testTarget? }`, le libellé d'une demande de d10 nomme le dé ; deux saisies équivalentes (valeur du dé tirée, résultat saisi) donnent le même patch. (b) `collectWoundTraitEffects` : Sang corrosif (une seule demande de d10, dégâts réduits par BE et PA de chaque engagé, minimum 1, rien sans engagé), Infecté (Test d'Endurance +4 DR demandé à la victime, aucune demande pour Mort-vivant ni Fabrication, échec : ligne de journal « Plaie purulente », aucun état), Bestial (ligne « fuite » ou « Frénésie » une seule fois par franchissement de la moitié des Blessures ; « Frénésie » si Territorial ou si `flags.protectsYoung`/`cornered`), Affamé (porteur qui met un vivant à 0 : Test de Calme +2 DR, échec : patch `lost-turn`). (c) `collectRoundTraitEffects` : `endOfRound` Instable (via `momentumCount` et `planUnstableEndOfRound`, 2 Blessures directes, journal ; profil L11 : rappel seul ; à 0 Blessure : patch `state-death` de cause `unstable`, jamais de suppression, D10), `startOfRound` Stupide (demande du Test d'Intelligence +4 DR, demande `choice` « guidé » seulement si un allié non Stupide est en jeu, exemptés Nuée et Immunité psychologique, échec : `lost-turn`) et Increvable (`advanceDieHard`, DR cumulés, 6 DR ou BE Rounds), `endOfTurn` levée du tour perdu. (d) `markLostTurn`, `liftLostTurn`, `startDieHard`, `applyTraitPatches` (entrées gelées, sortie neuve). Un Trait coché se lit comme un Trait imprimé (D11) : chaque calcul lit `participant.traits`.

**Critères couverts.** CA0 (moteur), CA1, CA2, CA4, CA5, CA6, CA7, CA8, CA9 (calculs purs) ; D1, D7, D8, D10, D11, D13, D14, D15.

**Interdits spécifiques.** Aucune modification de `v5-turn.js`, `resolution.js`, `store.js` ni de `js/ui/`. Aucun dé tiré. Pas d'état « Plaie purulente » ni « Disparition » (hors périmètre).

**Fini quand.**
- `node --test tests/unit/creatures/traits-calculs-demandes.test.js`
- `node --test tests/unit/creatures/traits-calculs-blessure.test.js` (un test par cas des CA1, CA2, CA4, CA5, dont Mort-vivant, sans engagé, seuil franchi deux fois, Territorial)
- `node --test tests/unit/creatures/traits-calculs-rounds.test.js` (CA6 à CA9, dont profil L11, adversaire sans Élan, 6 DR atteints en trois Rounds, BE Rounds écoulés)
- `node --test tests/unit/creatures/capacites-et-combat-naturel.test.js` (reste vert)
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L2 — Tour : début et fin de Round, mort Increvable, Inflammable
*Modèle conseillé : **Opus** (touche `previewV5Turn`, la décision de mort, l'historique et le moteur d'états). Après : L1.*

**But.** Brancher `collectRoundTraitEffects` dans `previewV5Turn`, faire passer la mort d'un Instable par la décision de mort, recueillir la case « corps intact » d'Increvable, et appliquer Inflammable.

**Contexte.** Lire : `js/core/v5-turn.js` en entier (phases `endOfTurn`, `endOfRound`, `startOfRound`, `requests` dédoublonnées par participant et champ), `js/core/v5-critical-aftermath.js` (`decideStateDeath` l. 166, `decideImmediateCriticalDeath`, `decideCriticalDeath`), `js/core/store.js` l. 2718 (`decideStateDeath`) et les décisions de mort voisines, `js/core/store/critical-death.js`, `js/core/v5-effects.js` (l. 213 : Tests d'Enflammé ; l. 349-355 : perte de Blessures d'Enflammé), `js/core/v5-test-context.js` (où se calcule le Test pour éviter un état ; point d'accroche d'Inflammable à localiser), `tests/unit/combat/initiative-et-tours.test.js` et `tests/unit/refactor/store-golden.test.js`. Constats 3, 4 ; D5, D10, D15, D17 ; point 3 du plan.

**Fichiers autorisés.** `js/core/v5-turn.js`, `js/core/v5-critical-aftermath.js`, `js/core/store/critical-death.js`, `js/core/store.js` (câblage des décisions de mort : paramètre facultatif `bodyIntact`, seulement), `js/core/v5-effects.js`, `js/core/v5-test-context.js`, `js/core/trait-effects.js` (corrections), `tests/unit/combat/traits-calculs-tour.test.js` (nouveau).

**À livrer.** (a) `previewV5Turn` appelle le collecteur aux phases `endOfTurn`, `endOfRound` (engagés lus sur le plateau par `engagedWith`) et `startOfRound` ; ses demandes rejoignent `requests` (mêmes dédoublonnage et `kind` que les autres) et ses patches s'appliquent dans le même état résultant, donc dans le même commit et le même ↶. (b) Un Instable à 0 Blessure produit `pendingStateDeath` de cause `unstable` (D10). (c) Les décisions de mort listées au plan (point 3) acceptent `bodyIntact` et, confirmées avec la case, créent `dieHard` ; les autres chemins de mort confirmée sont listés au rapport, non branchés. (d) Inflammable : perte de Blessures d'Enflammé ×2 à chaque fin de Round, −2 DR sur le seul Test pour éviter l'état, pas sur le retrait par Athlétisme (D17). (e) Aucun changement pour un participant sans ces Traits.

**Critères couverts.** CA6, CA7, CA8, CA9, CA22 (intégration) ; CA0 (demandes du tour), CA24, CA25 ; D1, D5, D10, D15, D17.

**Interdits spécifiques.** Ne pas modifier la forme des `requests` existantes ni les `kinds` en place (le bouton de Test est l'affaire de L6). Ne pas toucher `resolution.js` ni `js/ui/`. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/combat/traits-calculs-tour.test.js` (Instable engagé avec Élan adverse sur un Round complet ; Stupide : demande puis tour perdu levé à la fin du Tour du porteur ; Increvable sur trois Rounds avec total affiché, ↶ rétablit, ↷ rejoue ; Inflammable ×2 et −2 DR ; participant sans Trait : état identique)
- `node --test tests/unit/creatures/traits-calculs-rounds.test.js` (reste vert)
- `node --test tests/unit/combat/initiative-et-tours.test.js`
- `node --test tests/unit/refactor/store-golden.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L3 — Résolution : blessure, défense, riposte, Élan, Bouclier
*Modèle conseillé : **Opus** (touche `resolution.js`, les dégâts, l'équipement, le commit d'un résultat et l'historique). Après : L2.*

**But.** Brancher à la résolution les effets à la blessure (`traitPlans`), les modificateurs de défense et d'attaque (Parasité, Bestial, Bouclier), la riposte de Champion et le gain d'Élan de Rage, le tout commité en un seul ↶.

**Contexte.** Lire : `js/core/resolution.js` (l. 1017-1053 la Riposte et son quota, l. 1227-1266 `mountedFallPlans`, l. 1416-1458 `planMomentum`, l. 1696 le résultat) et `js/core/resolution/input.js` ; `js/core/store.js` ~l. 1544 (commit d'un résultat : où `mountedFall` entre dans le journal) et ~l. 2186 ; `js/core/equipment.js` l. 542-600 (`context.shieldId`, `shieldAp`) ; `js/core/creature-magic-traits.js` (`planCreatureMagic` `champion`) ; `js/core/creature-psychology.js` (`planPsychology('fury')`, `bestial`) ; `js/core/sanitize.js` (que `traitPlans` n'est pas éliminé) ; `js/core/trait-effects.js` (L1) ; constats 2, 7 et lignes Parasité, Bestial, Champion, Rage, Bouclier de la table de la spec ; D13, D14.

**Fichiers autorisés.** `js/core/resolution.js`, `js/core/resolution/input.js`, `js/core/store.js` (commit du résultat seulement), `js/core/equipment.js`, `js/core/v5-store-action.js` (seulement si le commit l'exige), `js/core/sanitize.js` (si nécessaire), `js/core/trait-effects.js` (corrections), `tests/unit/combat/traits-calculs-resolution.test.js` (nouveau).

**À livrer.** (a) `resolution.js` appelle `collectWoundTraitEffects` près de `mountedFallPlans` ; l'aperçu porte `traitPlans` et ses `requests` (`needsInput` tant qu'une demande n'a pas sa réponse dans `traitInputs`) ; le commit applique les patches avec l'événement, une seule commande. (b) Parasité : −1 DR sur l'attaque de mêlée contre le porteur dans l'aperçu, rien contre un tir. (c) Bestial défenseur : le plan de défense ne propose que l'Esquive. (d) Champion : opposition de mêlée défensive gagnée, dégâts de riposte calculés **sans** le quota d'une Riposte par Round du Talent ; opposition perdue, rien. (e) Rage : dans `planMomentum`, gain d'Élan du porteur (avant faux, après vrai) pose l'état Frénésie et retire l'Élan ; un seul ↶ rétablit les deux. (f) Bouclier n : bouclier virtuel de n PA sur la zone touchée et +1 DR en opposition par Esquive ou Mêlée ; un profil L22 « * » n'a que le rappel (aucune direction d'attaque dans le moteur). (g) Un participant sans ces Traits produit les mêmes résultats.

**Critères couverts.** CA1, CA2, CA3, CA4, CA5, CA10, CA11, CA12, CA15 (CA0 pour les demandes de l'aperçu), CA24, CA25 ; D1, D13, D14.

**Interdits spécifiques.** Ne pas réutiliser le quota de Riposte pour Champion. Ne pas toucher `v5-turn.js` ni `js/ui/`. Pas de nouvel état moteur. Si le golden master bouge, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/combat/traits-calculs-resolution.test.js` (CA1 à CA5, CA10 à CA12, CA15 ; deux ripostes de Champion dans le même Round ; ↶ puis ↷ d'un résultat à Sang corrosif et d'une Rage)
- `node --test tests/unit/creatures/traits-calculs-blessure.test.js` (reste vert)
- `node --test tests/unit/combat/jets-et-defense.test.js`
- `node --test tests/unit/combat/empoignade-et-monture.test.js`
- `node --test tests/unit/refactor/store-golden.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L4 — Petits calculs, Bond côté outil, nettoyage
*Modèle conseillé : Sonnet. Après : L3.*

**But.** Poser les calculs isolés (Insensible à la douleur, Béni et Miracles, causes de Dressé, Se cabrer en pur, Bond) et passer Disruption et Creature Weapons en rappel.

**Contexte.** Lire : `js/core/v5-combat-rules.js:405-415` (`ignoreCritical`, précédent Maîtrise du corps), `js/data/v5-crits.js` (`LASTING_OUTCOMES`, `kind: 'amputation'`), `js/core/v5-sequela-effects.js:60` (`sequelaEffectRows`), `js/core/creature-natures.js:103` ; `js/core/creature-magic-traits.js:104` (`planCreatureMagic`, `prayerBase`), `js/core/creature-magic.js`, `js/core/v5-magic-channelling.js:182` et `creatureCastingBases` (modèle Focalisation), `js/core/v5-divine-engine.js:502` ; `js/core/v5-mounted-combat.js:151` (`planMountedFall`) et ses appelants ; `js/core/creature-combat.js:19,46,98` (règle `stomp`) ; `js/core/creature-movement.js:76` (`planMovement` `bounce`), `js/core/map-link-state.js:57` (`rangeCellsOf`) ; `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` §4 ; `tools/build-creature-abilities.mjs` (le fichier `js/data/creature-abilities.js` est généré : l'éditer par son générateur, jamais à la main) ; `tools/recopier-donnees-communes.mjs` (le contrat est recopié vers la carte). Lignes Insensible, Béni, Dressé, Se cabrer, Bond et §2C de la spec ; D2, D3, D4, D16.

**Fichiers autorisés.** `js/core/v5-combat-rules.js`, `js/core/v5-sequela-effects.js` (seulement pour étiqueter l'amputation), `js/core/creature-magic-traits.js`, `js/core/creature-magic.js`, `js/core/v5-magic-channelling.js` ou le module de base de Prière strictement nécessaire (à nommer au rapport), `js/core/v5-mounted-combat.js`, `js/core/creature-combat.js`, `js/core/creature-movement.js`, `js/core/map-link-state.js`, `tools/build-creature-abilities.mjs`, `js/data/creature-abilities.js` (régénéré), `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` (champ `bondCells`, optionnel, entier ≥ 0, absent = pas de Bond), `tests/unit/creatures/traits-calculs-petits.test.js` (nouveau).

**À livrer.** (a) Insensible : `ignoreCritical` étendu au Trait hors Test étendu ; pénalités de critique ignorées, celles d'une amputation conservées, la pénalité d'un **État** issu du critique conservée (CA18). (b) Béni et Miracles : base de Prière = Soc + 10 pour un porteur sans compétence Prière (CA17). (c) `planMountedFall(…, { cause })` : monture Craintif, cause « bruit fort » et Dressé (Guerre), ou cause « magie » et Dressé (Magie) : pas de Test de Chevaucher ; sans `cause`, comportement actuel (CA20) ; les appelants sont câblés en L5. (d) `planNaturalAttack(…, 'stomp', { via: 'rear' })` : mêmes dégâts, coût en déplacement, pas d'Élan, refusé contre une cible non plus petite (CA21). (e) `bondCellsOf(participant)` = 2 × Course pour Bond seul ; `tokenStateOf` ajoute `bondCells` seulement pour un porteur de Bond ; `speedCells`, `runCells` et la poursuite inchangés (CA19). (f) Disruption (E0-T-147) et Creature Weapons (E0-T-288) : `status: 'reminder'` avec `motif`, rappel visible par `deriveReminders` (CA23). (g) Lancer la recopie du contrat vers la carte **n'est pas fait ici** : L7 s'en charge.

**Critères couverts.** CA17, CA18, CA19 (outil), CA20 (pur), CA21 (pur), CA23, CA24 ; D2, D3, D4, D16.

**Interdits spécifiques.** Ne pas toucher `resolution.js`, `store.js`, `v5-turn.js`, `js/ui/`. Ne pas doubler `speedCells`. Ne rien écrire dans `E:/rpg-map-display`. Si `js/data/creature-abilities.js` ne se régénère pas proprement, s'arrêter et expliquer.

**Fini quand.**
- `node --test tests/unit/creatures/traits-calculs-petits.test.js`
- `node tools/build-creature-abilities.mjs --check`
- `node --test tests/unit/creatures/capacites-et-combat-naturel.test.js`
- `node --test tests/unit/combat/empoignade-et-monture.test.js`
- `node --test tests/unit/combat/liaison-carte-retours.test.js`
- `node --test tests/unit/magie/lancement-focalisation.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L5 — Store : méthodes des boutons
*Modèle conseillé : Sonnet (ajoute des commandes au Store sans toucher au moteur d'historique ; s'arrête si le golden master bouge). Après : L4.*

**But.** Donner au Store les commandes annulables des boutons de la fiche, et câbler la cause des événements de monture.

**Contexte.** Lire : `js/core/store/api-engagements.js` (modèle d'api), `js/core/store.js` l. 4001-4066 (`applyCreaturePsychology`, `applyCreatureVenom`), l. 2152, 5350, 5372, 5400 (appelants de `planMountedFall`), le câblage des api (~l. 4256) ; `js/core/creature-psychology.js` (`planPsychology` `afraid`, `animosity`, `frenzy`, `hungry`), `previewGenericFearEncounter` (le localiser par recherche) ; `js/core/v5-talent-actions.js:32,58-59` (Entrer en Frénésie du Talent, emprunt de talent) ; `js/core/store/api-v5-combat-actions.js` l. 225 (quota `system:turn-move` pour le déplacement) ; `js/core/creature-states.js` (`planVampiricHeal`) ; `js/core/trait-effects.js` ; D9, D13, D16.

**Fichiers autorisés.** `js/core/store/api-trait-buttons.js` (nouveau), `js/core/store.js` (câblage de l'api et des appelants de `planMountedFall` seulement), `js/core/v5-talent-actions.js` (Entrer en Frénésie pour le Trait), `js/core/creature-psychology.js`, `js/core/trait-effects.js` (corrections), `tests/unit/combat/traits-calculs-boutons.test.js` (nouveau), `sw.js` (précache).

**À livrer.** `applyCreatureEncounter` (Effrayé : Peur (2) venant de la cible choisie ; Animosité : demande du Test de Calme ; cible sans le mot-clé nommé refusée, message français, CA13), `enterTraitFrenzy` (Test de Volonté demandé, réussi : état Frénésie comme le Talent, CA14), `applyVampiricHeal` (soigne de la valeur saisie sur Morsure et proie admissible cochées, plafonnée aux Blessures maximales, sinon refus, CA16), `rearUp` (Se cabrer : applique les dégâts du Piétinement, coût en déplacement par `system:turn-move`, aucun Élan, refusé contre une cible non plus petite, CA21), `markFreshCorpse` (Affamé : Test de Calme demandé, échec : tour perdu), `setCreatureFlag` (« protège ses petits », « acculé » de Bestial). Chaque commande passe par `executeCommand`, journal en français, un seul ↶, rejouable par ↷ (CA25) ; ses demandes de dé suivent la forme de L1 (D13). Les appelants de `planMountedFall` passent la `cause` lue dans le contexte du résultat (CA20).

**Critères couverts.** CA13, CA14, CA16, CA20 (câblage), CA21, CA25, CA24 ; D9, D13.

**Interdits spécifiques.** Aucune modification de `tests/fixtures/store-golden.json` : si une méthode ajoutée le fait bouger (par exemple par l'ordre des clés de l'API), s'arrêter et expliquer. Ne pas toucher `js/ui/`.

**Fini quand.**
- `node --test tests/unit/combat/traits-calculs-boutons.test.js`
- `node --test tests/unit/creatures/branchement-store.test.js`
- `node --test tests/unit/combat/empoignade-et-monture.test.js`
- `node --test tests/unit/refactor/store-golden.test.js`
- `node --test tests/unit/donnees/audit-meta-production.test.js`

## L6 — Interface : boutons, demandes avec bouton de dé, marqueurs
*Modèle conseillé : Sonnet. Après : L5.*

**But.** Montrer tout ce que les lots précédents calculent : bloc « Rencontre », boutons de la fiche, bouton de dé sur chaque demande, marqueur « tour perdu », total d'Increvable, case « corps intact », pastille de Bond.

**Contexte.** Lire : `js/ui/creature-states-block.js` (modèle de bloc et lecture des entrées), `js/ui/v5-effect-dialog.js` l. 150-175 (`kind: 'test'` sans bouton ; `kind: 'd10'/'d100'` avec « Lancer »), `js/ui/dice-buttons.js`, `js/ui/resolution-panel/result.js` l. 154-205 (modèle `mountedRideTestsById`), `js/ui/workspace-view.js` l. 2596-2616 (décisions de mort), `js/ui/card.js`, `js/ui/psychology-block.js` ; `js/core/trait-effects.js` et `api-trait-buttons.js` ; `tests/unit/ui/aria-labelledby.test.mjs` ; `MJ.css`. D8, D9, D13, D15, D16.

**Fichiers autorisés.** `js/ui/v5-effect-dialog.js`, `js/ui/creature-states-block.js`, `js/ui/resolution-panel/result.js`, `js/ui/workspace-view.js`, `js/ui/card.js`, `js/ui/psychology-block.js`, `MJ.css` (classes seulement), `tests/unit/ui/traits-calculs-interface.test.js` (nouveau).

**À livrer.** (a) Le dialogue des effets : pour une demande `kind: 'test'` portant `testTarget`, un bouton « Lancer d100 » tire le dé et en déduit réussite et DR, comme le bouton d'un d10 ; une demande `choice` s'affiche en Oui/Non ; les demandes sans `testTarget` gardent la saisie seule (CA0). (b) Le panneau de résultat affiche `traitPlans` : chaque demande à la blessure avec son bouton de dé et sa saisie, valeurs équivalentes (CA0). (c) Bloc « Rencontre » (Effrayé, Animosité : choix de la cible), boutons « Entrer en Frénésie », Vampirique (Blessures pré-remplies depuis le dernier résultat, Morsure et proie à cocher), « Se cabrer », « Cadavre frais », cases « protège ses petits » et « acculé » (D9). (d) Marqueur « tour perdu » sur la fiche ; total d'Increvable ; case « corps intact » dans la décision de mort. (e) Pastille de Bond : « Bond : Charge, Saut, Sprint à 2 × Course ». Tout appel au Store est tolérant (`Store.methode?.()`).

**Critères couverts.** CA0, CA13, CA14, CA16, CA19 (pastille), CA21, CA9 (affichage du total) ; D8, D9, D13, D15, D16.

**Interdits spécifiques.** Aucune règle de calcul dans `js/ui/`. Ne pas modifier `js/core/`. Pas de style en ligne hors de ce que les fichiers font déjà.

**Fini quand.**
- `node --test tests/unit/ui/traits-calculs-interface.test.js` (bouton de dé du Test et du d10 ; Store sans les méthodes : aucun plantage)
- `node --test tests/unit/ui/aria-labelledby.test.mjs`
- `node --test tests/unit/donnees/audit-meta-production.test.js`
- `node tools/run-browser-journeys.mjs --socle` (tous verts)

## L7 — Carte : champ optionnel `bondCells` (dépôt `E:/rpg-map-display`)
*Modèle conseillé : Sonnet. Après : L4 (le contrat est écrit dans l'outil). Peut tourner en parallèle de L5 ou L6.*

**But.** Faire accepter à la carte le champ optionnel `bondCells` du `token.state`, et la faire tolérer son absence.

**Contexte.** Dépôt `E:/rpg-map-display`, branche `main` ; lire d'abord son `CLAUDE.md` (manifeste fermé : `docs/ARCHITECTURE.md` §1, aucun nouveau fichier ; `// @ts-check` et JSDoc stricts ; la porte de ce dépôt, ses propres tests). Le champ voisin est `runCells` : `js/core/types.js:202`, `js/core/schema.js:380`, `js/app/mjLink.js:37,62`, `js/state/store.js:1784`, tests `tests/liaisonOutilMj.test.mjs` et `tests/courseLiaison.test.mjs`. Le contrat vient de l'outil : `E:/Outil MJ Warhammer/docs/CONTRAT_LIAISON_MAP_DISPLAY.md` (écrit en L4), recopié par `node tools/recopier-donnees-communes.mjs` (lancé depuis l'outil) vers `docs/CONTRAT-LIAISON-OUTIL-MJ.md` de la carte. Le champ est un entier ≥ 0 ; aucun palier de déplacement n'est ajouté à la carte (affichage et budgets inchangés) : D16 demande que le champ soit accepté, stocké et toléré absent.

**Fichiers autorisés.** Dans la carte : `js/core/types.js`, `js/core/schema.js`, `js/app/mjLink.js`, `js/state/store.js` (liste des champs gérés par l'outil, seulement), `docs/CONTRAT-LIAISON-OUTIL-MJ.md` (par la recopie, jamais à la main), le fichier de test de liaison existant ou un test dans `tests/` nommé par le manifeste. Dans l'outil : rien, sauf l'exécution de `node tools/recopier-donnees-communes.mjs`.

**À livrer.** `bondCells` : type, validation (`entier >= 0`, message en français comme `runCells`), lecture dans `mjLink.js`, conservation dans l'état du pion lié ; un `token.state` sans le champ produit exactement l'état d'avant ; un `token.state` avec une valeur invalide est refusé comme pour `runCells`.

**Critères couverts.** CA19 (côté carte) ; D16.

**Interdits spécifiques.** Aucun nouveau fichier dans la carte. Aucun écran, aucune couche de rendu, aucun changement de budget de déplacement. Aucune modification de l'outil. Ne pas pousser. Commit dans la carte : même règle de message et de ligne `Co-Authored-By`, fichiers nommés.

**Fini quand.** (dans `E:/rpg-map-display`)
- `node --test tests/liaisonOutilMj.test.mjs` (cas avec `bondCells`, cas sans, cas invalide)
- `node --test tests/courseLiaison.test.mjs`
- la porte du dépôt telle que son `CLAUDE.md` la nomme (la lancer et recopier la sortie)
- dans l'outil : `node tools/recopier-donnees-communes.mjs --check` (code 0)

## L8 — Parcours navigateur de bout en bout
*Modèle conseillé : Sonnet. Après : L6 et L7.*

**But.** Prouver dans le navigateur une rencontre avec un Instable, un Stupide et un porteur de Sang corrosif qui traverse un Round entier avec les demandes attendues.

**Contexte.** Lire : `tests/monture-fiche-browser.mjs` et `tests/browser-bestiary-library.mjs` (modèles : serveur local, `tests/helpers/browser.mjs`), `tests/parcours.json`, `tools/run-browser-journeys.mjs`, `js/ui/v5-effect-dialog.js` et `js/ui/resolution-panel/result.js` (sélecteurs des demandes et des boutons « Lancer »).

**Fichiers autorisés.** `tests/traits-calculs-browser.mjs` (nouveau), `tests/parcours.json`, `docs/specs/traits-calculs/plan.md` (seulement pour corriger la table de vérification).

**À livrer.** Un parcours : rencontre à trois porteurs et un adversaire avec Élan ; une blessure au porteur de Sang corrosif : demande unique de d10 résolue par le bouton « Lancer », Blessures des engagés réduites ; fin de Round : Instable perd 2 Blessures, journal ; début de Round : demande du Test du Stupide résolue par le bouton « Lancer d100 », marqueur « tour perdu » sur échec ; ↶ rétablit, ↷ rejoue ; rechargement de la page. Classer le parcours dans `tests/parcours.json` (famille « ticket », chantier « traits-calculs »).

**Critères couverts.** CA26, CA0, CA25 (de bout en bout) ; non-régression du socle.

**Interdits spécifiques.** Aucune modification de `js/`. Si le parcours révèle un défaut, le consigner dans le rapport avec la reproduction, sans le corriger.

**Fini quand.**
- `timeout 120 node tests/traits-calculs-browser.mjs`
- `node tools/run-browser-journeys.mjs --socle` (tous verts)
- `node tools/run-browser-journeys.mjs traits-calculs` (le parcours est classé et lancé par le lanceur)

## À la fusion (hors lots)

Une seule fois, suite unitaire complète (`node --test "tests/unit/**/*.test.js"`, puis `node --test "tests/unit/**/*.test.mjs"`), `node tools/build-creature-abilities.mjs --check`, `node tools/recopier-donnees-communes.mjs --check`, et la porte du dépôt de la carte. Le numéro de version et la publication restent au MJ (`node tools/bump-version.mjs`, notes rédigées à la main) ; la carte et l'outil se publient chacun à leur tour, la carte d'abord (elle tolère l'absence du champ, l'outil non l'inverse).
