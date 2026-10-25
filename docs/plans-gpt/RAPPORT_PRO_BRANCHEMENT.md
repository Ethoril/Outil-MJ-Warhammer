# Rapport Pro — branchement des Traits et des familiers

Plan : `PLAN_PRO_BRANCHEMENT.md`. Choix et questions : `CHOIX_EXECUTANT_BRANCHEMENT.md`.

| Lot | État |
| --- | --- |
| B0 | FAIT (inventaire ci-dessous) |
| B1 | FAIT (Taille branchée, voir ci-dessous) |
| B2 | FAIT (Plusieurs têtes branché, voir ci-dessous) |
| B3 | FAIT (Régénération branchée, voir ci-dessous) |
| B4 | FAIT (Psychologie branchée, voir ci-dessous ; question BR-06 au MJ) |
| B4c | FAIT (corrections de la contre-vérification ; question BR-09 au MJ) |
| B5 | FAIT (Sens branchés sauf Sens aiguisé, voir ci-dessous ; question BR-11 au MJ) |
| B6 | FAIT (Déplacement branché, voir ci-dessous ; question BR-12 au MJ) |
| B7 | FAIT (Nuée, Venin, rappels d'états et de natures, voir ci-dessous) |
| B8 | FAIT (Lanceur de sorts ouvert, rappels de magie et de capacités, voir ci-dessous ; BR-14) |
| B8c | FAIT (corrections de B3-B6, réponses du MJ du 24/10 : BR-10, BR-11, BR-12) |
| B9 | FAIT (Slann branché sauf palanquin, voir ci-dessous) |
| B10 | FAIT (création de familier depuis la carte, voir ci-dessous ; question BR-02 au MJ) |
| B10b | FAIT (Destin et Résilience importés des fiches, réponse du MJ à BR-02) |

## B10b — Destin et Résilience lus depuis les fiches (24/10/2026)

- **Branché** : `ficheSnapshot` (`fiche-sync.js`) lit `destin` et `resilience` de la fiche (champs présents dans la fixture `fiche-caelel.json`) dans `durables.fate` et `durables.resilience` (hors `resources`, qui reste la Chance seule) ; `importFicheDurables` les écrit dans `extensions.v5.fate` (canonique, le miroir `fate` n’est pas écrit à l’import) et `extensions.v5.resilience` du profil et de chaque copie (participants, scènes, personnages persistants) par `planProfileSync` et `applyFicheSync`, donc par la synchronisation de l’onglet fiches. Écrit si l’outil n’a pas la valeur ou si la fiche a changé depuis la dernière synchronisation ; une relecture inchangée ne rend pas un point débité.
- Limite : la fiche n’a qu’un `destin` (pas de courant distinct du maximum) ; le débit de l’outil n’est pas réécrit côté fiche (phase H, noté dans `VARIABLES_PERSISTANTES_PJ.md`). Fiche sans l’un des champs : saisie à la main conservée (test).
- Une assertion existante ajustée : `tests/e26-fiche-sync.test.js` attend maintenant `v5: { fate: 1, resilience: 1 }` dans les extensions du profil (la fixture porte `destin` et `resilience`). `fiche-sync.js` : la copie de scène garde la forme de la scène (sans miroir `fate`), pour qu’une resynchronisation inchangée reste sans effet. Suite : 4644 tests, seul échec « recette refuse un cwd externe » (propre au worktree).
- Test : `tests/pro-b10b-destin-resilience-fiches.test.js` (fiche Destin 3, Résilience 2 → création en Résilience débite 1 → Annuler le rend ; resynchronisation ; fiche sans Résilience).

## B10 — Création de familier (24/10/2026)

- **Branché** : `planFamiliarCreation` (nouvelle, `familiars.js`) par `Store.createFamiliar(masterId, familiarId, input)` (`store.js`), commande annulable `create-familiar` : lien posé des deux côtés, **1 Destin ou 1 Résilience** débité du maître, plus un par point supplémentaire cédé (chacun enregistré comme point à répartir, `creation.pointsToDistribute`), familier d’un PJ passé au camp `allie` (PNJ allié), ligne de journal « Création de familier ». Annuler rend le point et retire le lien. Chemin d’interface : bloc « Familier » de la carte d’un PJ (`js/ui/familiar-block.js`, `card.js`) : familier choisi parmi les participants présents, Homoncule (Familier de combat, de puissance, de sort ; Imprégné de Vent) ou Familier animal (espèce), Destin ou Résilience, suppléments, solde saisi si l’outil ne le connaît pas, bouton « Création de familier ». Le bloc liste ensuite les familiers liés avec « Retirer le lien » (`unlinkFamiliar`, branché).
- **Résilience (BR-02)** : absente de la fiche et de l’outil ; nouvelle valeur durable `extensions.v5.resilience` (validée par `sanitize.js`). Le Destin courant n’est pas importé non plus (`destin` de la fiche = maximum) : sans solde connu, la saisie du MJ est exigée, sinon refus avec message. Question au MJ consignée.
- **Branché** : `familiarLinkLabel` (bloc et journal), `familiarCostBalance` (bloc et plan).
- Limites : le débit porte sur le participant du combat (comme les autres commandes de lien), pas sur le personnage persistant ni la fiche (phase H) ; la répartition des points reste au MJ (compteur affiché) ; aucun profil de familier n’est instancié (on lie un participant déjà présent).
- Noms français du §7.2 de la conception appliqués à l’écran et au message de refus d’un type inconnu.
- Test : `tests/pro-b10-creation-familier.test.js` (bloc rendu, création, Destin débité, Annuler le rend ; Résilience saisie ; refus). `sw.js` : nouveau module en cache (version inchangée). Suite : 4640 tests, seul échec « recette refuse un cwd externe » (propre au worktree). Aucune assertion existante modifiée.

## B9 — Slann (24/10/2026)

- **Branché** : `slannTraitReminders` (`slann.js`, via `TRAIT_REMINDERS`) → rappels des capacités slann sur la carte et le Personnage actif ; « Au sol : −3 » quand le Slann a quitté son palanquin ; rappel de Téléportation de secours à 10 Blessures ou moins (sur les Blessures actuelles ; la Blessure Critique grave n'est pas détectée).
- **Branché** : `groundCastModifier` + `slannAboard` par `prepareMagicOptions` (`v5-magic-talents.js`) : −3 SL aux Tests d'incantation et de Focalisation tant que `extensions.v5.slann.aboard` est faux. Chemin d'interface : `Store.setSlannAboard` (commande annulable), bouton du bloc `js/ui/slann-block.js` (`card.js`).
- **Branché** : `mishapSeverity` par `prepareMiscastOptions` → `resolveMiscast` : un incident Majeur devient Mineur (`slannLowered`) pour les profils à Maître des incidents, sauf `viaTelepathy`. Limite : le cas du lancement à travers un autre mage n'a pas de saisie à l'écran, et le Mineur qui déborde vers le Majeur (chaos en cascade) n'est pas touché.
- **Branché** : `totalPowerCritical` dans `previewPreparedCasting` (`v5-magic-casting.js`) : un lancement réussi sur une unité 0 est critique (DR minimal +5), pour les profils à Puissance totale seulement ; le choix de l'effet critique reste celui de l'incantation existante. La relance de perception des Vents en Lustrie reste un rappel.
- **Branché** : `contemplationOutcome` par `Store.applySlannContemplation(id, dr)` (commande annulable) : le MJ saisit les DR du Test de Perception dans le bloc de carte ; Brume de pensée pose deux États Exténué ; Détaché (Stupide) reste un rappel du journal (Stupide n'est pas un État du moteur) ; sans DR saisis, refus.
- **Code testé, non appelé** : `palanquinTraits` (Vol 16 et Protection 8+ ne sont pas posés comme Traits du participant ; couvert selon la direction du tir non appliqué : rappel du palanquin seulement) ; `planEmergencyTeleportation` n'est utilisé que pour son rappel (pas de lancement automatique).
- Test : `tests/pro-b9-slann-branche.test.js` (Slann des 4ᵉ et 2ᵉ générations, L07). `sw.js` : nouveau module en cache (version inchangée).

## B8c — Corrections de B3-B6 et réponses du MJ (24/10/2026)

1. **Vol (BR-12)** : inversé. `movementTestRules` reçoit l’adversaire (`opponent`, passé par `buildCombatTest`) ; −2 DR au tireur quand la cible porte Vol et que « La cible en Vol est en vol » = Oui (`targetAirborne`, `resolution-panel.js`, affichée seulement pour un tir contre un porteur de Vol). Plus rien sur les tirs du volant (la case `airborne` disparaît).
2. **Furtif** : ne s’applique plus qu’à Discrétion (Rurale) (`creature-senses.js`).
3. **Raison d’un refus** : `refusalError` (`messages.js`), utilisée par `observe` (`card.js`) : les refus `{ ok:false, message }` affichent leur message. Preuve : test de la fonction et du câblage dans `card.js` (le dépôt n’a pas de rendu DOM de la carte en test).
4. **Régénération sur un 10** : retire aussi les États (`stateIds`) du critique guéri, dans la même commande annulable (`store.js`, `recoverV5Condition` en `divine-removal`).
5. **Critiques de feu** : faisable, fait. Le bloc de Régénération de la carte affiche une case « Feu : <critique> » par Blessure Critique enregistrée ; les cochées vont dans `fireCriticalIds` (jamais guéries par un 10). Branché : `regeneration-block.js` → `card.js` → `applyRegeneration`.
6. **Perturbant en défense** : case « Un Perturbant est à portée du défenseur » dans les circonstances de la défense (`resolution-panel.js`) ; `senseTestRules` ne frappe que les vivants (`isLiving`, `creature-natures.js` : ni Mort-vivant, Démoniaque, Éthéré ni Artificiel). Prouvé par la défense du Store.
7. **Sonné de tête** : seuls les Sonné issus des critiques à la tête sont retirés (`stunnedCount`, `resolution.js`) ; un second Sonné reste. Une tête désignée inconnue retombe sur la première tête valide (`creature-heads.js`).
8. Plan : lignes B4, B5, B6 précisent ce qui reste en rappel. Choix BR-10, BR-11, BR-12 consignés comme tranchés.
- Test : `tests/pro-b8c-corrections.test.js` (9 tests) ; `pro-b6-…` et `pro-b3-…` mis à jour. Suite : 4632 tests, seul échec « recette refuse un cwd externe » (propre au worktree) après correction du test B3.

## B8 — Magie et capacités (24/10/2026)

- **Branché** : `creatureMagicReminders` et `creatureAbilityReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappels permanents sur la carte et le Personnage actif : Résistance à la Magie, Lanceur de sorts, Béni, Miracles, Champion, Marques du Chaos, Corruption, Mutation, Dressé ; capacités propres du profil (`abilityRefs` du bestiaire : « Nom (lot de Traits) : résumé » si prises en charge, « Rappel — Nom : résumé » sinon).
- **Branché** : `magicActionsFor` / `creatureCastingBases` (`creature-magic.js`), appelée par `actorActions` (`workspace-view.js`, onglet Jouer) : un Lanceur de sorts de bestiaire reçoit Focalisation, Dissipation et Incantation sans sorts ni compétence sur sa fiche ; Focalisation = Volonté+10, Langue magique = Int+10 (valeurs du Trait, sinon FM/Int comme avant). Le panneau d'Incantation propose tous les contrats V5 ; la liste de sorts imprimée du profil reste en consultation (elle n'est pas dans `participant.spells`).
- **Code testé, non appelé** : `planCreatureMagic` pour Béni, Miracles (Prière Soc+10), Champion, Marques (pas d'effet posé), Dressé (ordres), Corruption, Mutation : rappels seulement. Aucune des capacités de `creature-abilities` n'applique d'effet (le module ne le prévoit pas). Les capacités des Slann (E0-T-211…) ne sont pas dans ce jeu de données : B9.
- Test : `tests/pro-b8-magie-capacites-branchees.test.js` (Slann de la 5ᵉ génération L07, Horreur rose L23). Suite : 4623 tests, seul échec « recette refuse un cwd externe » (propre au worktree).

## B7 — États et natures (24/10/2026)

- **Branché** : `stateReminders` et `natureReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappels permanents (Venin, Infecté, Parasité, Maladie, Sang corrosif, Vampirique, Nuée, Instable, Increvable, Scission ; Mort-vivant, Démoniaque, Artificiel, Éthéré, Insensible, Magique, Bouclier) sur la carte et le Personnage actif.
- **Branché** : `planSwarm` par `Store.applySwarmEndOfRound(id, engagedIds)` (`store.js`), commande annulable `swarm-end-of-round` : 1 Blessure directe à chaque engagé coché (le moteur ne suit pas l'engagement, le MJ le désigne). Chemin d'interface : `js/ui/creature-states-block.js` (cases d'engagés, bouton de fin de Round, `card.js`).
- **Branché** : `planStateOnWound` (Venin) par `Store.applyCreatureVenom(sourceId, targetId)`, commande annulable `creature-venom` : Empoisonné posé via `acquireV5Conditions` (immunités respectées), difficulté imprimée requise sinon refus. Même bloc de carte.
- **Déjà branché avant le lot** : Protection/Démoniaque/Éthéré/Immunité (`natureProtection`, `v5-magic-combat.js`, jet de Protection saisi par `wardRoll`), `willpowerBase`, `attacksAreMagical`.
- **Code testé, non appelé** : `planStateOnWound` pour Infecté, Parasité, Maladie, Sang corrosif ; `planVampiricHeal`, `planUnstableEndOfRound`, `planDieHard`, `planSplit`, `planDeathTriggers` (engagement, Élan, mort : rappels seulement, rien d'automatique) ; `planSwarm` : tir −4 DR contre la Nuée et exemptions de Psychologie/Taille non appliqués.
- Test : `tests/pro-b7-etats-branches.test.js` (Serpents de Sotek, L07). Décisions du MJ du 24/10 consignées (BR-06, BR-08, BR-09) et lot B12 ajouté au plan. `sw.js` : nouveau module en cache (version inchangée).

## B6 — Déplacement (24/10/2026)

- **Branché** : `movementReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappel de chaque Trait de déplacement (Vol, Bond, Foulée, Grimpant, Amphibie, Arboricole, Fouissage, Marine…) sur la carte et le Personnage actif.
- **Branché** : `movementTestRules` (nouvelle, `creature-movement.js`, s’appuie sur `planMovement`), appelée par `buildCombatTest` (`v5-combat-rules.js`) : tir d’un porteur de Vol −2 DR quand « le tireur en Vol est en vol » est précisé ; Amphibie +1 DR en Natation (Bonus d’Agilité pour le Zoo) ; Arboricole + Bonus d’Agilité en Escalade et Discrétion ; Créature marine hors de l’eau −2 DR à tous les Tests une fois « dans l’eau » = Non. Chemin d’interface : « Circonstances des Tests » du panneau de résolution (`resolution-panel.js`, listes À préciser/Oui/Non affichées seulement pour un porteur de Vol au tir ou de Créature marine). Sans contexte : rien d’appliqué, le rappel reste.
- **Code testé, non appelé** : `planMovement` pour Bond, Foulée, Foulée adaptée, Grimpant, Limicole, Fouissage, Respiration aquatique, Aquatique (le moteur n’a ni carte ni distances : rappels seulement), Charge du Vol (Élan de Charge déjà géré par la Charge existante).
- Limite (remplacée en B8c) : le MJ a tranché le 24/10 (BR-12) : −2 DR aux tirs **contre** une créature en vol ; voir B8c.
- Test : `tests/pro-b6-deplacement-branche.test.js` (Roc plume-vive et Skink caméléon, L07). Suite : seul échec « recette refuse un cwd externe » (propre au worktree).

## B5 — Sens et discrétion (24/10/2026)

- **Branché** : `senseReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappels permanents Infravision, Vision nocturne, Furtif, Pisteur, Perturbant, Caméléon, Sens vibratoires sur la carte et le Personnage actif.
- **Branché** : `senseTestRules` (nouvelle, `creature-senses.js`), appelée par `buildCombatTest` (`v5-combat-rules.js`) pour tout Test : tir contre un Caméléon −2 DR (aucune saisie) ; Perception pour voir un Caméléon −4 (immobile) ou −2 (qui bouge) une fois la case « La cible Caméléon se déplace » renseignée ; Perturbant −2 DR une seule fois, quel que soit le nombre de sources, une fois la case « Un Perturbant est à portée » cochée ; Furtif (Discrétion) et Pisteur (Pistage) portent le score à Agilité+10 / Intelligence+10 s’il dépasse celui de l’action. Chemin d’interface : « Circonstances des Tests » du panneau de résolution (`resolution-panel.js`, les deux cases n’apparaissent que si la scène contient un porteur). Sans contexte précisé : rien d’appliqué, le rappel de la carte reste.
- **Code testé, non appelé** : `distractingPenalty` (le moteur ne connaît pas les distances), `planSense` pour Infravision, Vision nocturne et Sens vibratoires (effets de vision/Surprise non branchés : rappels seulement).
- **Non branché** : Sens aiguisé / « Acuité sensorielle » (BR-11).
- Test : `tests/pro-b5-sens-branches.test.js` (Skink caméléon L07). Suite : 4615 tests, seul échec « recette refuse un cwd externe » (propre au worktree).

## B4c — Corrections de la contre-vérification de B0-B2 (24/10/2026)

1. **Branché** : les rappels permanents de Traits (`TRAIT_REMINDERS`) ne sont dérivés que pour la transition `participant` (carte et Personnage actif), plus pour « À traiter » (`Store.getReminders`, transitions de tour). `sizeReminders` ne sort plus que pour Grande ou plus. Les rappels statiques `extensions.v5.reminders` (armure, démon) restent inchangés. Règle pour B5 et suivants : un rappel de Trait est permanent (carte) ; seuls les rappels liés à un moment vont dans « À traiter ».
2. **Branché** : clé stable par sens pour les têtes (`manyHeadsReminderItems` : `heads-count`, `heads-free-attacks`, `heads-perception`, `heads-global`, `heads-note`) ; `resolveParticipantReminder` enregistre le texte affiché et un rappel dont le texte change réapparaît (ligne d’état après la chute d’une tête).
3. **Branché** : `applyResolution` (`resolution.js`) appelle `applyHeadCriticals` : un critique à la tête (Sonné → tête étourdie, mort instantanée → tête morte) touche une seule tête (`v5.context.headId`, sinon la première valide), dans la même commande donc annulable. Le Sonné n’est appliqué à la créature que si toutes les têtes sont neutralisées (effet global, degré le moins grave) ; la mort instantanée reste un rappel du livre. Limite : aucune saisie de la tête à l’écran de résolution (la tête se corrige par les boutons de la carte) ; le tableau V5 de la tête n’a pas d’« inconscient ».
4. **Surnombre / Désengagement** : rappel seulement. L’outil ne calcule aucun surnombre ni Désengagement pour un Trait Taille (le Désengagement libre existant est propre au talent) ; écart consigné (BR-08).
5. **Force opposée à un cran** : non modifiée. Le texte de Grande taille (`Talents.csv`, Archives of the Empire 2) dit : victoire automatique à deux catégories d’écart ; à une seule, le plus petit doit obtenir un Critique pour comparer les DR — c’est ce que fait le code. Le texte du Trait Taille de L06 p. 360 n’est pas dans le dépôt : question au MJ (BR-09).
6. Message au lieu d’un saut silencieux : une attaque gratuite d’une créature à Plusieurs têtes sans nombre de têtes (ou registre différent) est refusée avec le message du module. Inventaire B0 complété ci-dessous.
- Test : `tests/pro-b4c-corrections.test.js`.

## B4 — Psychologie (24/10/2026)

- **Branché** : `psychologyReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappel de chaque Trait de Psychologie (Peur, Terreur, Bestial, Animosité, Préjugé, Haine, Frénésie, Stupide, Affamé, Craintif, Belliqueux, Territorial…) sur la carte et le Personnage actif.
- **Branché** : `planPsychology` (Peur, Terreur) et `psychologyTraits` par `Store.applyCreaturePsychology(sourceId, key, { targetId })` (`store.js`), commande annulable `creature-psychology` : pose l'effet en attente (`terror-of-talent`/`fear-of-talent`) sur la cible ou sur chaque adversaire actif ; alliés, Immunité Psychologique et rencontre déjà subie exemptés. Chemin d'interface : bloc de carte `js/ui/psychology-block.js` (cible, bouton par Trait, `card.js`). La cible résout ensuite son Test de Calme par l'action existante « Résoudre la Terreur » (échec : Brisé = indice + DR négatifs après le premier, puis Peur au même indice) ou « surmonter la Peur ».
- Corrections : `isPsychologyImmune` reconnaît désormais « Immunité Psychologique » (le motif exigeait « psychologie ») ; l'action générique s'appelle « Résoudre la Terreur » et les effets qui suivent une Terreur de Trait ne portent plus la mention « de taille ».
- **Code testé, non appelé** : `fearImmunity` ; les branches de `planPsychology` autres que Peur/Terreur (Haine, Animosité, Frénésie, Stupide, Affamé, Féroce…) restent des rappels, sans Test ni modificateur appliqué (l'immunité à la Peur par Haine/Belliqueux passe déjà par le service commun).
- Limite : critère « Dragon » non applicable en V5 (BR-06, question au MJ) ; scénario fait sur le Spectre des cairns (L06, Terreur 3). Indice de Terreur non imprimé : refusé (pas de saisie à l'écran).
- Test : `tests/pro-b4-psychologie-branchee.test.js`. Nouveau module ajouté à la liste de cache de `sw.js` (version inchangée, comme en B2-B3). Suite : 4602 tests, 4600 verts ; échecs : « sw.js — tous les modules mis en cache » (corrigé ensuite, `tests/sw.test.js` vert) et « recette refuse un cwd externe » (propre au worktree). Aucune assertion existante modifiée.

## B3 — Régénération (24/10/2026)

- **Branché** : `regenerationReminders` via `TRAIT_REMINDERS` (`reminders.js`) → rappel du Trait sur la carte et le Personnage actif.
- **Branché** : `hasRegeneration`/`planRegeneration` par `Store.applyRegeneration(id, d10, { fireWounds })` (`store.js`), commande annulable `regeneration` : soin plafonné au maximum (`healV5Wounds`), à 0 Blessure 8+ rend 1, un 10 retire une Blessure Critique du registre, Blessures de feu manquantes déduites. Chemin d'interface : bloc de carte `js/ui/regeneration-block.js` (champs d10 et feu, bouton « Régénérer », `card.js`) ; d10 hors 1-10 refusé. Le dé n'est pas tiré par l'outil.
- Limites : le rappel n'est pas lié au changement de Round (affiché en permanence sur la carte, pas de saisie automatique au `nextTurn`) ; les critiques de feu (`fireCriticalIds`) ne sont pas saisissables à l'écran, le premier critique du registre est guéri sur un 10 ; Empoisonné à 0 Blessure bloque le soin (règle de `healV5Wounds`).
- Test : `tests/pro-b3-regeneration-branchee.test.js` (Hydre de guerre L09).

## B2 — Plusieurs têtes (24/10/2026)

- **Branché** : `manyHeadsReminders` via `TRAIT_REMINDERS` (`reminders.js`) → carte et Personnage actif : têtes valides sur total, attaques gratuites par tête, Perception +2 DR (≥ 2 têtes valides), effet global quand toutes les têtes sont neutralisées. Le rappel est un affichage : le +2 DR de Perception n'est pas appliqué à un Test (voir B5).
- **Branché** : quota d'attaques gratuites (`v5-store-action.js`) : une Morsure/Cornes/Langue gratuite par tête valide et par Tour, pour une attaque naturelle déclarée ou une action gratuite du profil (la Bite de la Hydre de guerre n'est qu'une action, `planManyHeads` lit donc aussi les actions) ; aucune tête valide = refus. L'Élan de la Bite gratuite reste celui du profil.
- **Branché** : `Store.setHeadState` (commande annulable `set-head-state`, registre dans `extensions.v5.heads`) et `applyHeadCritical`/`restoreHead` ; bouton par tête sur la carte (`js/ui/heads-block.js`, clic = valide → étourdie → inconsciente → morte), la Blessure critique ne touche qu'une tête.
- Test : `tests/pro-b2-plusieurs-tetes-branche.test.js` (Hydre de guerre L09). `pro-t9` ajusté (rappel désormais détaillé). Suite : 4590 tests, seul échec restant « recette refuse un cwd externe » (propre au worktree).
- Limite : un rappel « Fait » sur la carte reste masqué même si le nombre de têtes valides change ensuite (identifiant par rang).

## B1 — Taille (24/10/2026)

- **Branché** : `previewLarge` (`js/core/v5-talent-size.js`, appelé par `previewV5CombatPrelude` à chaque résolution) accepte désormais le Trait Taille (Grande ou plus, via `creatureSizeOf`) comme source, au même titre que le talent Grande taille : une seule source de vérité. Effets : −2 DR à la défense en mêlée contre l’attaquant plus grand (`v5-combat-rules.js:148`, inchangé) ; Force opposée gagnée automatiquement à deux crans (`resolveSizeOpposition`). Les rangs saisis à l’écran priment ; sinon rang du Trait, l’autre camp sans Trait étant supposé Moyen. Le bonus de dégâts +BF reste réservé au talent (un profil imprimé l’inclut déjà).
- **Branché** : `sizeReminders` via `deriveReminders` (`js/core/reminders.js`, table `TRAIT_REMINDERS`, accroche commune BR-01) → carte (`card.js:251`) et Personnage actif, par `Store.getParticipantReminders`. Le poids au surnombre y figure en rappel : le moteur ne calcule pas de surnombre.
- **Non appliqué** : « pas de Désengagement » pour une créature à Trait Taille (le Désengagement libre existant est propre au talent) ; aucun texte du livre ne le détermine dans le module, rien d’inventé.
- Tests : `tests/pro-b1-taille-branchee.test.js` (Stegadon L07 contre PJ, via le store). Suite complète : 4583 verts, 1 échec étranger au lot (« la recette refuse un cwd externe », propre au worktree sous `tmp/`).

## B0 — Inventaire des appelants et points d'accroche (24/10/2026)

Méthode : grep des imports et des appels dans `js/` hors des modules eux-mêmes. « Aucun » = aucun appelant hors du module (seuls les tests l'appellent).

### Points d'accroche existants (communs)

- **Traits d'un participant** : `participant.traits[]` (texte « Nom (précision) », posé par `buildParticipantFromBestiary`, `js/core/bestiary-profiles.js:219`) et `participant.extensions.traits` ; tous les modules les lisent déjà par `traitsOf`/`xxxTraits(participant)`.
- **Rappels de participant** : `deriveReminders` (`js/core/reminders.js:84-90`) ne lit que `extensions.v5.reminders` (liste statique posée à la création). Affichés par `buildParticipantReminders` sur la carte (`js/ui/card.js:251`) et le Personnage actif (`js/ui/workspace-view.js:694`) via `Store.getParticipantReminders` (`store.js:3211`, id de transition = `round-N`). **Aucune des fonctions `xxxReminders` ne l'alimente.** Accroche commune à créer en B1 (premier lot qui en a besoin) : dans `deriveReminders`, ajouter les rappels dérivés des Traits du participant (calculés à l'affichage, jamais écrits), ce qui évite toute migration de participant.
- **Début de Round / de Tour** : `Store.nextTurn` (`store.js:1773`) calcule `result.round`/`currentActorId` puis `processCombatTurnSpells` (~1829) ; `getReminders({type:'startTurn'|'endTurn'})` (`store.js:3194`).
- **Résolution d'attaque** : `js/core/resolution.js` (choix de cible, Test, dégâts, `naturalReminders` ligne ~895), action de store `js/core/v5-store-action.js:69`, panneau `js/ui/resolution-panel.js`.
- **Soin / États / Critiques** : `Store.healWounds` (`store.js:1660`), `healCriticalWound` (1642), `acquireV5Conditions`/`healV5Wounds` (`v5-effects.js`), `Store.applyResolution` (2487).
- **Familiers** : commandes `linkFamiliar`/`unlinkFamiliar`/`setFamiliarRange` (`store.js:2251-2278`), suppression d'un participant (1475-1497).
- **Taille existante** : talent Grand/Petit dans `v5-talent-size.js` et `v5-combat-rules.js:148` (pénalité de défense `combatPrelude.large/small`).

### Fonctions par module

Colonne « Appelant » : fichier hors module. « Moment » : instant de jeu où la règle agit.

#### `creature-size.js` (B1)
| Fonction | Appelant | Moment | Accroche / ordre |
| --- | --- | --- | --- |
| `planCreatureSize`, `creatureSizeOf` | `creature-combat.js` seulement (attaques naturelles, branché via resolution) | Test de mêlée, Force opposée, Désengagement, surnombre | `resolution.js` (modificateurs de défense, ~l. 733) et `v5-combat-rules.js:148` : fusion avec la pénalité Grand/Petit |
| `parseSizeTrait`, `SIZE_RANKS` | internes | — | — |
| `sizeReminders` | **aucun** | choix de cible, Désengagement | rappel participant (accroche commune) |

#### `creature-heads.js` (B2)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `planManyHeads`, `createHeadRegistry`, `applyHeadCritical`, `restoreHead`, `manyHeadsTrait`, `hasManyHeads`, `parseManyHeadsTrait`, `HEAD_STATES` | **aucun** | début de Tour (attaques gratuites), Test de Perception, Blessure critique | quota gratuit : `v5-store-action.js` (là où `planNaturalAttack` fixe déjà les quotas) ; critique : `Store.applyResolution` ; registre des têtes : `participant.extensions.v5` |
| `manyHeadsReminders` | **aucun** | idem | accroche commune |

#### `creature-regeneration.js` (B3)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `planRegeneration`, `hasRegeneration`, `parseRegenerationTrait` | **aucun** | début du Tour du porteur (d10 saisi) | `Store.nextTurn` → rappel avec saisie, puis `Store.healWounds`/`healCriticalWound` (annulable via l'historique de commandes) |
| `regenerationReminders` | **aucun** | idem | accroche commune |

#### `creature-psychology.js` (B4)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `planPsychology`, `psychologyTraits`, `parsePsychologyTrait`, `fearImmunity` | **aucun** (le module appelle `v5-talent-psychology.js`, pas l'inverse) | contact ou vue (Peur/Terreur), début de Tour (Frénésie, Affamé…), choix de cible (Animosité, Préjugé) | `resolution.js` (choix de cible) + service Psychologie de `v5-talent-psychology.js` ; États via `acquireV5Conditions` |
| `psychologyReminders` | **aucun** | idem | accroche commune |

#### `creature-senses.js` (B5)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `planSense`, `senseTraits`, `parseSenseTrait`, `distractingPenalty` | **aucun** | Test de Perception/Pistage/Discrétion | modificateurs de Test dans `v5-store-action.js`/`v5-roll.js` quand la compétence est connue ; sinon rappel |
| `senseReminders` | **aucun** | idem | accroche commune |

#### `creature-movement.js` (B6)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `planMovement`, `movementTraits`, `parseMovementTrait` | **aucun** | déplacement, tir contre créature en vol, Charge | affichage carte (`card.js`) et Personnage actif (`workspace-view.js`) ; modificateur de tir dans `resolution.js`/`v5-combat-rules.js` |
| `movementReminders` | **aucun** | idem | accroche commune |

#### `creature-states.js` et `creature-natures.js` (B7)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `natureProtection`, `attacksAreMagical` | `v5-magic-combat.js:120,167` (**branché** pour Protection/Ward magique et attaques magiques) | résolution d'attaque | déjà en place ; Ward : vérifier la saisie du jet |
| `willpowerBase` | `v5-talent-psychology.js:122` (**branché**) | Test de Psychologie | déjà en place |
| `parseNatureTrait` | interne | — | — |
| `natureReminders` | **aucun** | résolution | accroche commune |
| `planStateOnWound`, `planVampiricHeal`, `planDieHard`, `planSplit`, `planDeathTriggers` | **aucun** | dégâts subis/infligés, mort | `Store.applyResolution` (après dégâts) |
| `planSwarm`, `planUnstableEndOfRound` | **aucun** | fin de Round / Tour | `Store.nextTurn` (changement de Round) |
| `stateTraits`, `parseStateTrait`, `stateReminders` | **aucun** | idem | accroche commune |

#### `creature-magic.js` et `creature-abilities.js` (B8)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `magicResistanceReduction` | `v5-spell-contracts.js:1739` (**branché**, Résistance à la Magie) | lancement d'un sort sur la cible | en place |
| `planCreatureMagic`, `creatureMagicTraits`, `parseCreatureMagicTrait` | **aucun** | lancement de sorts/miracles, Corruption | panneau de magie (`v5-magic-controls.js`) : profil lanceur |
| `creatureMagicReminders` | **aucun** | idem | accroche commune |
| `planCreatureAbility`, `abilityDisposition`, `uncoveredAbilityRefs`, `creatureAbilityReminders` | **aucun** (données `js/data/creature-abilities.js` lues par le seul module) | choix de cible / début de Tour selon la capacité | accroche commune, alimentée par le nom du profil de bestiaire |

#### `creature-combat.js` (hors plan : déjà fait)
`planNaturalAttack` (`resolution.js:226,241`, `v5-store-action.js:69`), `inferNaturalAttackKey` (`resolution.js:237`), `naturalCombatTraits`, `naturalAttackNeedsSize` (`resolution-panel.js:1206,1229`) : **branchés**. `planV4NaturalWeapon`, `naturalCombatReminders`, `parseNaturalTrait` : à vérifier en B1 (probablement internes/aucun appelant extérieur).

#### `slann.js` (B9)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `isSlann`, `slannAbilities`, `palanquinTraits`, `groundCastModifier`, `mishapSeverity`, `totalPowerCritical`, `planEmergencyTeleportation`, `contemplationOutcome`, `SLANN_ABILITIES` | **aucun** | lancement de sort (Slann au sol, incidents, Puissance totale), dégâts reçus (Téléportation), action Contemplation | `v5-magic-miscasts.js` (gravité des incidents), `v5-spell-contracts.js` (modificateur de lancement), `Store.applyResolution` (Téléportation) |
| `slannReminders` | **aucun** | idem | accroche commune |

#### `familiars.js` (B10, B11)
| Fonction | Appelant | Moment | Accroche |
| --- | --- | --- | --- |
| `validateFamiliarLink`, `buildFamiliarLink`, `familiarBackLink`, `familiarLinksOf` | `store.js:76,1475,2251-2278` (**branchés** côté store ; interface de création absente, à vérifier en B10) | création/liaison | `Store.linkFamiliar` |
| `familiarSupport` | `v5-combat-rules.js:118` (**branché**) | Test du maître | en place |
| `familiarIgnoresAblaze` | `v5-effects.js:362` (**branché**) | État En feu | en place |
| `companionTalents`, `withCompanionTalents` | **aucun** | Test du familier/maître | `v5-talents.js` (talents acquis) |
| `previewFamiliarCondition`, `previewFamiliarHealing` | **aucun** | `acquireV5Conditions`, `Store.healWounds` | `v5-effects.js` + `store.js:1660` |
| `planFamiliarDeath`, `familiarDeathDamage` | **aucun** | mort du maître ou de l'animal | suppression de participant (`store.js:1475-1497`) |
| `linkedFamiliars`, `senseSharingRange`, `familiarReminders` | **aucun** | affichage, partage de sens | carte et Personnage actif |
| `validateFamiliarLink`… (création par Destin/Résilience) | — | création | B10 : question Résilience à instruire (voir fichier des choix) |
| `familiarOfOf`, `isLinkActive`, `COMPANION_TRAITS`, `SPELL_FAMILIAR_SPELL_CAP`, constantes `FAMILIAR_*`, `HOMUNCULUS_KINDS` | **aucun** (internes au module ou aux tests) | selon B10-B11 | à brancher avec les services ci-dessus |

### Ordre de branchement proposé
1. B1 Taille (crée l'accroche commune des rappels de Traits dans `deriveReminders`, réutilisée ensuite par tous).
2. B3 Régénération, B2 Têtes, B7 États (accrochent `nextTurn` et `applyResolution`).
3. B4 Psychologie, B5 Sens, B6 Déplacement, B8 Magie.
4. B9 Slann, puis B10, B11 Familiers.

### Constat
Les 8 branchements existants (attaques naturelles, Protection/Ward, magie `willpowerBase`, Résistance à la Magie, soutien/feu des familiers, liens de familier dans le store) sont les seuls appelants hors module. Toutes les autres fonctions `plan*` et toutes les fonctions `*Reminders` sont **code testé, non appelé**.
