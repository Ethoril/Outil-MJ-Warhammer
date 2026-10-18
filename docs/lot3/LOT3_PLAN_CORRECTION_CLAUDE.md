# Lot 3 — plan de correction après relecture Claude

10 octobre 2026. Base : branche codex/lot2-talents-v5, HEAD fb0f280, application 3.14.0, travail non commité. Ce plan reprend toutes les anomalies confirmées par la relecture du 10/10 (six relectures parallèles avec sondes Node), les points à arbitrer, et ce qui reste à vérifier. Rapport détaillé : [LOT3_RELECTURE_CLAUDE.md](LOT3_RELECTURE_CLAUDE.md).

## Règles de conduite

- **Ordre imposé** : phase 0 (décisions) et phase 1 (tests) d'abord, puis le socle (phase 2), qui conditionne tout le reste. Les phases 3 à 9 peuvent ensuite avancer en parallèle par domaine ; la phase 10 clôt.
- **Test rouge d'abord** : chaque item reçoit une sonde qui échoue avant correction, passant par le chemin réel (moteur de combat `createCombatEngine`, gestionnaires de `workspace-view.js`), pas seulement par `Store`.
- **Contrats générés** : toute correction de contrat se fait dans `tools/build-v5-spell-contracts.mjs`, puis régénération ; jamais d'édition manuelle de `js/data/v5-spell-contracts.json`. Vérifier que la génération reste reproductible octet à octet.
- **Contraintes inchangées** : aucun push, fusion, déploiement ; aucun changement du catalogue public ni des fiches sans accord du MJ (seule exception accordée : D-21) ; PDF jamais intégrés ; fixtures synthétiques, cloud local.
- **Règle d'honnêteté** : une clause qu'on ne corrige pas maintenant est rétrogradée en « rappel » ou « donnée MJ » dans la matrice, jamais laissée « calculable ».
- Identifiants : `D-` décision, `T-` tests, `S-` socle, `L-` lancement/incidents, `X-` dissipation, `H-` Haute Magie/talents, `A-` arbitrages, `V-` contrats livre V5, `W-` contrats hors livre, `U-` interface/intégration, `C-` couverture/clôture.

---

## Phase 0 — Décisions du MJ (tranchées le 10 octobre 2026)

Consignées dans LOT3_CADRAGE_MAGIE.md, section « Arbitrages du 10 octobre (relecture) ».

| Id | Question | Décision |
| --- | --- | --- |
| D-01 | DR du lanceur opposé au dissipateur | DR du Test seul ; la réserve s'ajoute ensuite au DR net |
| D-02 | Égalité au Test opposé de dissipation | Le lanceur gagne |
| D-03 | Sort de Haute Magie dissipé : épuisement ? | Non |
| D-04 | Talent Haute Magie et plafond BI + BFM | Plafond conservé (comportement actuel) |
| D-05 | Runes des Cadai par lancer | Une rune par jet (Test, épuisement, Corruption) |
| D-06 | Cumul de la Bénédiction de Lileath | Lu sur le talent du lanceur |
| D-07 | Résistance à la Magie contre Puissance totale | NI ignoré ; la Résistance retire 3 DR aux effets seulement |
| D-08 | Contre-réaction (96+) | Le lanceur n'est pas une cible ; sans cible à portée, la tête explose |
| D-09 | Plancher +5 DR sur critique et gain de Focalisation | Non appliqué : le gain critique utilise les DR réels du jet (DR + 2 × BFM) |
| D-10 | « Focalisation (Aqshy) » sur une fiche | Reconnue pour le Vent correspondant |
| D-11 | Durée d'un Round | 10 secondes (6 Rounds par minute), documenté dans Règles |
| D-12 | Expiration des effets en Rounds | À la fin du tour de l'auteur |
| D-13 | Protection réussie | N'annule que les dégâts |
| D-14 | Blessures directes d'attribut (Vie, Lumière) | Ignorent PA, BE et Protection |
| D-15 | Bmax divisées par le Fléau des Démons | Restaurées en fin de rencontre, par action du MJ |
| D-16 | Blessures en Forme bestiale | B pleines de la bête (comportement actuel conservé) |
| D-17 | Seconde vue en zone saturée | Rappel MJ |
| D-18 | Distance ou visibilité non saisies en dissipation | Bloquer |
| D-19 | Méditations de talents | Non dissipables, exclues de la liste |
| D-20 | Armure non portée | Exclue de la pénalité magique |
| D-21 | Silence (Arcane, p. 245) et Coruscating Arc (Cieux, p. 249) | Ajoutés maintenant au catalogue public (voir W-19) ; **D-21 annulé le 11 octobre (doublons : Silence d’Ulgu déjà au catalogue ; Coruscating Arc = version V5 de l’Arc de T’Essla)** |
| D-22 | La Fortune est Capricieuse, « double = maladresse » | Tests magiques et dissipation seulement |

--- | --- | --- | --- |
| D-01 | Test opposé de dissipation : DR du lanceur = Test seul ou Test + réserve ? | Cadrage l. 58 ; V5 p. 237 | [Opposer au DR du Test seul, puis ajouter la réserve au DR net] |
| D-02 | Égalité au Test opposé de dissipation | V5 p. 131 (l'initiateur gagne) | [Le lanceur gagne] |
| D-03 | Sort dissipé : l'épuisement Haute Magie prévu s'applique-t-il ? | HEPG p. 84 | [Non, le sort n'a aucun effet] |
| D-04 | Talent Haute Magie : relève-t-il le plafond BI + BFM ? | « added to the Overcasting SL you can spend » | [Ajoute des DR dépensables sans relever le plafond, comme aujourd'hui] |
| D-05 | Plusieurs runes des Cadai par lancer (Test et épuisement) ? | HEPG p. 84 | [Oui, une rune par jet] |
| D-06 | Bénédiction de Lileath : cumul lu sur le talent du lanceur ou de la cible ? | Exemple de la source | [Lanceur] |
| D-07 | Résistance à la Magie contre Puissance totale | V5 p. 235 | [Puissance totale ignore le NI ; la Résistance retire 3 DR aux effets seulement] |
| D-08 | Contre-réaction (96+) : le lanceur peut-il être sa propre cible ? | V5 p. 239 | [Non : cibles à portée, sinon la tête explose] |
| D-09 | Plancher +5 DR sur critique (lot 2, `v5-roll.js:54`) appliqué au gain de Focalisation ? | Jet 44 → 15 DR | [À trancher, impact fort] |
| D-10 | Focalisation spécialisée (« Focalisation (Aqshy) ») | `channelling.js:142` | [Reconnue pour le Vent correspondant] |
| D-11 | Équivalence Round ↔ temps (expiration en minutes et inversement) | `v5-magic-time.js` | [1 Round = 10 s, documenté dans Règles] |
| D-12 | Horloge des effets en Rounds : tour de l'auteur ou début de Round ? | Arbitrage « horloges auteur/cible » | [Fin du tour de l'auteur] |
| D-13 | Protection réussie : annule-t-elle aussi les effets sans dégâts ? | `spell-contracts` résistance | [Non, seulement les dégâts] |
| D-14 | Blessures directes d'attribut (Vie, Lumière) : passent-elles par Protection et réduction ? | `spell-contracts:2268-2277` | [Non, elles ignorent PA et BE] |
| D-15 | Fléau des Démons : Bmax divisées restaurées quand ? | Arbitrage Fléau | [Fin de rencontre, par action MJ] |
| D-16 | Forme bestiale : recalcul des B (« Recalculate your Wounds ») | V5 p. 245 | [B de la bête au prorata des B actuelles] |
| D-17 | Seconde vue : Désavantage mesurable en zone saturée | V5 p. 236 | [Rappel, fait fourni par le MJ] |
| D-18 | Faits absents favorables (distance de dissipation, visibilité) | `dispel.js:86, 242` | [Bloquer tant que non saisis] |
| D-19 | Dissipation des méditations de talents | Liste de dissipation | [Exclues] |
| D-20 | Armure non portée (`equipped:false`) dans la pénalité magique | `calculateMagicArmorPenalty` | [Exclue, si le champ existe dans le modèle] |
| D-21 | Silence (Arcane, V5 p. 245) et Coruscating Arc (Cieux, p. 249) absents du catalogue public | Contrainte « pas de changement du catalogue » | [Lot ultérieur ; signaler comme hors périmètre] ; **D-21 annulé le 11 octobre (doublons : Silence d’Ulgu déjà au catalogue ; Coruscating Arc = version V5 de l’Arc de T’Essla)** |
| D-22 | La Fortune est Capricieuse : « double = maladresse » limité aux Tests magiques ou à tous les Tests ? | Source : clause de la surpuissance +4 DR | [Tests magiques et dissipation seulement, sauf surpuissance] |

---

## Phase 1 — Filet de tests sur les chemins réels

| Id | Travail |
| --- | --- |
| T-01 | Harnais de test passant par `createCombatEngine(store).nextTurn()` / `start()` (chemin de `main.js` `advanceTurn`) et non par `store.nextTurn()`. Réécrire `tests/browser-magic-v5-smoke.mjs:190` pour utiliser le chemin réel. |
| T-02 | Harnais qui appelle les gestionnaires de `workspace-view.js` (aperçu puis application) avec un brouillon minimal, pour tester les valeurs par défaut de l'interface. |
| T-03 | Corriger `tests/lot3-v5-finalization.test.js:31-36`, qui valide une rune des Cadai sur Carreau (sort d'Arcane) : doit être refusé. |
| T-04 | Test générique « aucun tirage implicite » : pour chaque aperçu (Focalisation, incantation, incident, interruption, dissipation, sort), avec `requireExplicitDice:true` et aucun dé, `ready` doit être `false` et `missing` exhaustif. Interdire `Math.random` dans `js/core/v5-magic-*` (test statique). |
| T-05 | Test « tout drapeau écrit est lu » : script qui liste les clés écrites par `v5-spell-contracts.js`/générateur et vérifie qu'elles ont un consommateur ; liste blanche explicite pour les rappels. |
| T-06 | Test d'invariant d'effets : appliquer, avancer le temps, dissiper, Undo, recharger → caractéristiques, M/movement, PA, Protection reviennent exactement à la base ; avec synchronisation de fiche intercalée. |
| T-07 | Une sonde par anomalie des phases 2 à 9, rouge avant correction. |

---

## Phase 2 — Socle moteur (bloquant)

### S-01 Fin de tour réelle
- Brancher `processCombatTurnSpells` (store.js:199) dans la commande `end-turn-v5` (`combat.js:52-72`), à l'intérieur du même `executeCommand` pour garder un Undo atomique, en tenant compte de D-12.
- Vérifier que `Store.nextTurn`/`setRoundTurn` et le moteur ne traitent jamais deux fois le même tour.
- Couvre : buffs en Rounds, Forme bestiale, Chance temporaire de l'attribut des Cieux, « jusqu'au prochain tour », `advanceMagicConsequences`, verrou Mage de guerre.

### S-02 Écoulement du temps
- `resolution-panel.js:583` : lire `extensions.v5.spellEffects` au lieu de `activeSpellEffects` ; contrôle d'avance en minutes et en heures pour sorts et méditations.
- `v5-magic-effects.js:678-688` : « temps écoulé » expire aussi les effets en Rounds (équivalence D-11) ; diminuer `remainingMinutes` quand des Rounds passent.

### S-03 Dés explicites partout
Supprimer toutes les valeurs par défaut et déclarer chaque dé manquant :
- Interface `workspace-view.js` : `lossRoll || 3` (l. 1006), `miscastRoll || 45` (l. 1080, 1097), `roll3d10 || 18` (l. 1121), `chosenStats` = CC, `beastKey` = loup (l. 1120-1122).
- Focalisation `v5-magic-channelling.js` : `lossRoll` = 1 (l. 267, 495), jet d'incident = jet du Test (l. 273, 499), aperçu d'interruption qui ignore `requireExplicitDice` (l. 530).
- Incidents `v5-magic-miscasts.js` : jet Majeur repris du Mineur (l. 510-522) ; `missingSecondaryDice` (l. 544) limité à la durée — y ajouter dégâts (l. 247, 281, 419), distances (l. 101, 129, 246, 269, 293), Force ×5 (l. 80), jours d'épuisement (l. 197), membre (l. 317).
- Main de Gloire : `?? 15` (`v5-spell-contracts.js:2195`, `v5-magic-arbitrations.js:427`), choix par défaut de caractéristiques (l. 2185-2187).
- Chemin « DR seul » : jet 50 par défaut, donc toujours la Tête (`v5-spell-contracts.js:1291`) → exiger la localisation ou le jet.
- Vortex : clés `vortexDirectionRoll`/`vortexDistanceRoll` envoyées par l'UI (`workspace-view.js:1108`) mais lues `directionRoll`/`distanceRoll` (`v5-spell-contracts.js:512`) → aligner ; supprimer le repli (direction = jet d'incantation, distance = BFM × 2).
- Validation : entiers bornés (1-10, 1-100, 3-30), rejet de NaN, négatifs et fractions (`lossRoll` négatif augmente aujourd'hui la réserve).

### S-04 Lecture des durées
- Réécrire l'interpréteur `v5-magic-effects.js:239-254` : tous les bonus de caractéristique (BFM, BI, BE, BF, BSoc, BInt…), valeurs pleines (« FM minutes »), multiplicateurs (« 2 × »), unités (Rounds, minutes, heures, jours), parenthèses et abréviations.
- Une durée non reconnue devient « donnée MJ » bloquante, jamais un repli silencieux sur le BFM.
- Corriger ou supprimer le champ mort `durationData` du générateur (l. 1925, 1937-1948).
- Transmettre `overcastDurationMultiplier` (`v5-spell-contracts.js:2064, 2674`).

### S-05 Couches d'effets et base de personnage
- `baseCaracs`/`baseArmor` (`v5-magic-effects.js:334-350, 701-710`) : rafraîchis à chaque synchronisation de fiche (`fiche-sync.js:442-444`) et à chaque modification MJ ; recalcul des valeurs effectives à partir de base + couches.
- `expireSpellEffects` recalcule aussi `M`/`movement`, la Protection, les PA et les compétences importées (aucun double comptage).
- Plus aucune écriture directe hors couches (ex. `ext.v5.ward` de Saphery, `participant.fortune`, `participant.fate`).
- Identifiants d'effets uniques (`v5-magic-miscasts.js:693` produit des doublons dans un même Round).

### S-06 Protection qualifiée et immunités
- Remplacer la Protection globale (`v5-magic-combat.js:7-15`, appelée par `resolution.js:542` et `:1583`) par une Protection typée : seuil + filtres (magique, à distance, feu, origine extérieure, projectile organique, métal).
- `resolution.js` transmet la nature de l'attaque.
- Implémenter `immunities` (aujourd'hui jamais lu).
- Cas : Égide d'Aqshy, Dôme, Bouclier anti-flèches, `wardVsMissiles` (`v5-spell-contracts.js:1583, 1781`), Bouclier céruléen (voir V-09).

### S-07 Destinataire des états et des dégâts
- Séparer dans les contrats `targetConditions`, `selfConditions`, `engagedEnemyConditions`, `attackerConditions` ; `v5-spell-contracts.js:1580` ne doit plus appliquer au porteur ce qui vise les autres.
- Cas : Robe scintillante, Pas d'Ombre, Portail d'Ombre, Épée enflammée, Coruscation de Finreir, Lames Azurées, Esprit du Foyer.
- Garde-fou : un sort de cible « Vous » ne peut jamais infliger de dégâts au lanceur sauf clause explicite.

### S-08 Règle du projectile magique et attributs de Vent
- Sorts de type `damage` (`v5-magic-effects.js:993`) : Dégâts = valeur + BFM, sans ajouter les DR sauf clause explicite.
- Transmettre `missile.ignoreAp`/`ignoreBe` à `resolveMagicMissile` (`v5-spell-contracts.js:1409-1422`).
- Métal : PA métalliques de la localisation touchée (`v5-magic-attributes.js:280-299`), aussi pour les sorts de dégâts non projectiles (`v5-spell-contracts.js:1445`) et pour le choix Métal/Cieux des Arcanes elfiques (l. 1420).
- Ombres : ignorer les PA non magiques (`v5-magic-attributes.js:302-316`).
- Vie : retirer Hémorragique et Exténué aux seuls vivants (l. 235-249).
- Arcanes : appliquer l'attribut du Domaine du lanceur (`v5-spell-contracts.js:1288, 1420`). Arcanes elfiques sans choix : premier Vent listé (HEPG p. 81).
- Attributs facultatifs (« may ») : choix par cible au lieu de `attributeActive` global (`v5-magic-attributes.js:203-216, 257-277`, `v5-spell-contracts.js:2779-2786`).
- `weaponBonus` (`v5-magic-combat.js:2-6`) : ne s'applique qu'à l'arme désignée, en remplaçant ses dégâts quand le sort le dit ; jamais au tir.
- Vortex : une seule application des dégâts (section B `v5-spell-contracts.js:1436` ou `resolveVortexTrajectory`, pas les deux).

### S-09 Surpuissance
- Dépenses limitées aux paliers exacts 1, 2, 3, 5, 8, 13, 18, entières (`v5-magic-casting.js:107-164`).
- Portée « Vous » et « Toucher » non extensibles ; cibles « Spécial » et « 1 (max) » non extensibles (WoM p. 20, 23).
- Option « dégâts » réservée aux projectiles (générateur l. 1990).
- Options spécifiques « pour chaque +X DR » (générateur l. 2002) : Effrayant, Terrifiant, Voile Pourpre, Couronne de Flamme, Arme enchantée, Chute, Pont, Déplacement d'objet, Attaques en chaîne, Forge de Chamon, traits de Forme bestiale, et options de Haute Magie (D-04, H-09).
- Grimoire non mémorisé : ajouter le champ (contrat ou fiche) et le transmettre jusqu'à `isOvercastAllowed` (`v5-magic-casting.js:100`).
- `reserveSl` non injectable hors tests (`v5-magic-casting.js:246-248`).
- Chemin `explicitSl` (`v5-spell-contracts.js:1123-1207`) : mêmes garde-fous que `previewCasting` (épuisement, Mage de guerre, États, Cadai).
- Champs de l'interface `max=10` (`resolution-panel.js:452-456`) → permettre 13 et 18.

### S-10 Drapeaux et clés de Test morts
- Clés de Test : correspondance normalisée (spécialités « Discrétion (Urbaine) », « Tous les Tests », « … adverse », « Défense contre Tir », « Compétence choisie ») dans `magicSkillModifiers` (`v5-magic-talents.js:78`).
- Pour chaque drapeau, implémenter un consommateur ou supprimer et rétrograder en rappel : `scytheOfShyishActive`, `immuneToDamageUntilHit`, `halvedMaxHp`, `bonusActions`, `temporaryTalents`, `specialState.incomingRangedBonusSl`, `shooterTestToFire`, `swarmImmunity`, `fireColdDamageReduction`, `freeMultipleDispels`, `testRequired`, `athleticsTestSl`, `maxPerTarget`, `grapplingFloor`, `leadershipBonusSl`, `fearToEnemies`, `cureDisease`, `talentsLost`, `corruptionPerFortuneSpent`, `unremovable`, `opposedTest`, `resistanceModifierSl`, `otherHighSpellsCount`, `IMPLEMENTED_SPECIAL_HANDLERS` (l. 70-109 : firewall, chain-attack, push, glittering-robe, flaming-hearts, forest-of-thorns…).

### S-11 Ressources canoniques
- Fortune : toujours via le registre V5. Exiger un compteur initialisé, comme `activateMindOverBody`. Concerne Défiance (`v5-spell-contracts.js:2607`), récupération d'épuisement (`v5-magic-high.js:199, 254-257`), Clairvoyance chaotique (`v5-magic-miscasts.js:673-677`).
- Destin : écrire dans le champ canonique (`models.js:225`), pas `participant.fate` (`v5-magic-high.js:259`).
- Épuisement temporaire : Chance seulement ; Destin seulement pour le permanent (`v5-magic-high.js:211`).

---

## Phase 3 — Focalisation, lancement, incidents

| Id | Correction | Où |
| --- | --- | --- |
| L-01 | Sorts mineurs sur un double réussi : déduire « mineur » de `contract.domain` (`petty`/`elven-petty`) ou réutiliser `spellForCasting` | `workspace-view.js:1072` ; `v5-spell-contracts.js:877, 1090` |
| L-02 | `applyMiscast` refuse tout aperçu `ready:false`, même si `cancelled:false` | `v5-magic-miscasts.js:730` |
| L-03 | Regard maudit : durée en heures via les effets temporaires d'incident, et non comme durée d'État en Tours ; faire respecter `unremovable` ; retirer Perception de la Magie à l'observateur (`talentsLost`) | `miscasts.js:310, 616-620` ; `v5-magic-talents.js:114-121` |
| L-04 | Puanteur infernale : type `trait` dans `miscastEffects`, retrait à l'expiration | `miscasts.js:681-689` |
| L-05 | Clairvoyance chaotique : Fortune via le registre et Corruption par Fortune dépensée | `miscasts.js:673-677` |
| L-06 | Drain de puissance : un effet `talent-disabled` actif bloque l'incantation | `v5-magic-talents.js:36` |
| L-07 | Plateau 91-95 (Multiplication d'infortune) : demander et appliquer les deux jets | `miscasts.js:210-214` |
| L-08 | Pause : compétence par nom exact replié, pas `/résistance/` | `channelling.js:393` |
| L-09 | Pause et interruption : journal correct, et ne pas poser `magicAttemptTurn` (Mage de guerre) | `channelling.js:332, 353` |
| L-10 | Désavantage net avec un choix « keep » indisponible : retenir l'option unique au lieu de lever une exception | `casting.js:294` ; `channelling.js:245` ; `workspace-view.js:985` |
| L-11 | `Store.previewMiscast` vérifie les talents (Diction instinctive, Harmonisation) | store.js |
| L-12 | Selon D-08 : cibles de la Contre-réaction | `miscasts.js:418-430` |
| L-13 | D-09 : le gain de Focalisation critique ignore le plancher +5 DR du lot 2 (sans toucher aux autres Tests) ; D-10 : « Focalisation (Vent) » reconnue | `v5-roll.js:54` ; `channelling.js:142` |
| L-14 | Selon D-20 : armure non portée | `calculateMagicArmorPenalty` |

## Phase 4 — Dissipation

| Id | Correction | Où |
| --- | --- | --- |
| X-01 | Si le lanceur gagne, le DR de l'incantation devient le DR net ; réévaluer NI, surplus, surpuissance, épuisement (D-01, D-02) | `v5-magic-dispel.js:152-158` ; `v5-spell-contracts.js:2547-2553` |
| X-02 | Dissipation persistante refusée contre Force irrésistible, comme `canDispelCasting` | `dispel.js:239-336` |
| X-03 | Dissipateur sans Langue (Magick) refusé (compétence avancée) | `dispel.js:102` ; `casting.js:189-190` |
| X-04 | Appliquer `prepareMagicOptions`/`enforceMagicTestRestrictions` : Inconscient, Surpris, Sonné, Fortune Capricieuse (double = échec) | `dispel.js:84-148` |
| X-05 | Test étendu V5 p. 266 : réussite au moins +1 DR, échec au moins −1 (±5 sur critique ou maladresse), échec de la tentative si le total passe sous 0 | `dispel.js:306-309` |
| X-06 | Progression indexée par `castExecutionId`, pas par couche | `dispel.js:252, 365` |
| X-07 | Distance et visibilité obligatoires (D-18) ; méditations exclues (D-19) | `dispel.js:86, 242` |

## Phase 5 — Haute Magie et talents

| Id | Correction | Où |
| --- | --- | --- |
| H-01 | Runes des Cadai : uniquement en Focalisation `high` et sur un sort de domaine `high` ; plusieurs runes selon D-05 ; relance de Corruption liée à un sort de Haute Magie | `v5-magic-talents.js:25-35` ; `v5-magic-high.js` |
| H-02 | Plafond des runes recalé sur le BFM courant | `v5-magic-high.js:307` |
| H-03 | Destruction des Arcanes : le Test de Focalisation contre l'objet applique pénalité d'armure et États | `v5-magic-arcane-unforgiving.js:62-63` |
| H-04 | Œil de la tempête rang 2 : neutralise Exténué seulement en Focalisation et en Incantation | `v5-magic-talents.js:45-47` |
| H-05 | Bénédiction de Lileath selon D-06 | `v5-magic-effects.js:380-396` |
| H-06 | Résistance à la Magie et Puissance totale selon D-07 | spell-contracts |
| H-07 | Repasser les 19 talents classés moteur/fiche/rappel : chaque clause « moteur » doit avoir une sonde exécutée ; sinon reclasser | `v5-magic-talent-coverage.json` |
| H-08 | Seconde vue selon D-17 | coverage |
| H-09 | Options de surpuissance de Haute Magie : Apothéose (+3/+6/+10), Saphery (+3/+4, alimentation de `otherHighSpellsCount`), Bannissement Majeur, Convocation, Drain, Glamour, Impasse, Œil, Tempête, Chemin ; Main de Gloire +3/+8 | générateur ; `v5-spell-contracts.js:2239` |

## Phase 6 — Arbitrages annoncés comme livrés

| Id | Arbitrage | Correction |
| --- | --- | --- |
| A-01 | Main de Gloire | Base de M lue dans `movement`/`M` (PJ importé sans `caracs.M` passe aujourd'hui à 2) ; M +2 en couche, restauré à l'expiration (`v5-magic-arbitrations.js:513-520`, `v5-magic-effects.js:66`) ; jet 3d10 et quatre caractéristiques obligatoires ; même jet pour les alliés ; Bmax inchangé. |
| A-02 | Faux de Shyish | Appeler `applyScytheOfShyishRules` ; `buildCombatTest` (`v5-combat-rules.js:118-124`) refuse l'Avantage des Morts-vivants contre le porteur et conserve leur Élan ; drapeau porté par un `spellEffect` qui expire ; créer l'arme (hallebarde Magique BF + BFM + 4). |
| A-03 | Bouclier de Saphery | Seuil dans `temporaryEffect.ward` (pas `ext.v5.ward`, `v5-spell-contracts.js:2739`) ; reçu lisant `automaticSuccess` (l. 2244) ; Protection ≤ 1 automatique. |
| A-04 | Apothéose Verdoyante | Exiger une cible morte et un délai de mort saisi, < 1 minute (`v5-magic-arbitrations.js:208-236`) ; ne jamais blesser une cible vivante ; conférer Peur (1) au lieu de retirer Peur et Terreur ; options de surpuissance (H-09). |
| A-05 | Forme bestiale / Jade | Remplacer M, F, E, Ag et Dex seulement ; ajouter les traits de la créature sauf Bestial et Craintif ; conserver les traits du lanceur (`v5-magic-arbitrations.js:111-119`) ; choix de bête obligatoire (`v5-spell-contracts.js:2145`) ; interdire lancer, dissiper et Focalisation sous forme animale ; B pleines de la bête (D-16), retour avec B et Critiques conservés. Jade : vérifier qu'il reste un doublon conforme. |
| A-06 | Transformation de Kadon | Monstre choisi effectivement appliqué ; Int et FM conservées ; durée BFM Rounds. |
| A-07 | Fléau des Démons | Seuils conformes ; restaurer les Bmax selon D-15. |

## Phase 7 — Contrats du livre V5 (116 sorts)

Les NI sont tous conformes. Corriger dans le générateur, puis sonder chaque sort.

| Id | Sort (page) | Attendu |
| --- | --- | --- |
| V-01 | Bannissement (251) | Aucun dégât. Si E < FM : Démon ou Mort-vivant gagne Instable ; à 0 B s'il l'était déjà |
| V-02 | Vortex d'Âmes (247) | +1 Brisé à tous ; Morts-vivants seulement : +8 + BFM, ignore BE et PA ; une seule application (S-08) |
| V-03 | Vol de Vie (247) | Projectile +6 + BFM, ignore PA ; le lanceur perd Exténué ; soin 1 par 2 B réellement infligées (`v5-spell-contracts.js:1477-1483`) |
| V-04 | Caresse de Laniph (247) | +6 + BFM ; Bmax −1 par 2 B (`v5-magic-effects.js:1038-1040, 1089-1091`) ; +1 DR à la réserve ; cible 1 (max) |
| V-05 | Drain (240) | Ignore PA ; soin de 1 B pour le lanceur, pas la cible |
| V-06 | Choc (242) | 1 Sonné, sans dégâts |
| V-07 | Ironie du Destin (249) | Réserve de Chance commune aux alliés ; aucun malus aux alliés (l. 1602) |
| V-08 | Maudit (249) | Portée Initiative mètres ; le lanceur dépense sa Chance pour forcer une relance (l. 1621) |
| V-09 | Bouclier céruléen (249) | +3 PA contre les armes en métal ; 6 dégâts au bras de l'attaquant |
| V-10 | Filet d'Amyntok (252) | +1 Sonné non retirable, perte du Mouvement, Bestial immunisé |
| V-11 | Transmutation de Chamon (253) | Aveuglé, Assourdi, Sonné, +1 PA, suffocation ; ignore BE et PA |
| V-12 | Forêt d'Épines (251) | Aucun dégât ; Athlétisme (−2) raté : 1 Hémorragique et 1 Enchevêtré (Force = FM) |
| V-13 | Armure aethyrique (242) | +1 PA |
| V-14 | Grands Feux d'U'Zhul (248) | Cible principale +10, 2 Enflammé, À Terre ; autres +5 ; ignore PA ; dégâts en fin de Round |
| V-15 | Comète de Cassandora (249) | +18 + BFM, Enflammé, À Terre |
| V-16 | Mur de Feu (248) | Projectile +4 |
| V-17 | Poussée (245) | 1d10 ignorant PA (dé demandé) ; cible ZdE |
| V-18 | Souffle (243) | BFM + variante de Domaine ; Test de CT et Esquive par victime ; portée spéciale |
| V-19 | Voile Pourpre (247) | +BFM PA ; pas de surpuissance « aoe » ; lanceur seulement |
| V-20 | Écorce (250) | +2 BE, −10 Ag/Dex, sans PA |
| V-21 | Plume de plomb (253) | Surcharge +2 paliers ou aucune surcharge |
| V-22 | Eau de la terre (250) | Pas de soin ; portée FM mètres |
| V-23 | Don de Vie / Floraison de vie (251) | Instantané ; pas de soin ; maladies guéries (`cureDisease`) |
| V-24 | Lumière guérisseuse (252) | Retire poisons et intoxicants |
| V-25 | Lumière aveuglante (251) | Portée Vous ; 3 Aveuglé |
| V-26 | Sommeil (242) | Inconscient seulement si À Terre, sinon À Terre |
| V-27 | Secousse (242) | Portée ½ FM, cible 1, Dextérité (+2) ou objet lâché ; pas de malus général (l. 182, 1556) |
| V-28 | Chute (244) | Dextérité (+0), −1 DR par +2 DR ; pas de Désarmé sans jet (l. 183) |
| V-29 | Enchevêtrement (244) | Portée BFM ; durée BFM Rounds avec expiration ; Force = FM |
| V-30 | Épée enflammée de Rhuin (248) | L'épée a BF + 6, Dévastatrice, Magique ; porteur non enflammé |
| V-31 | Arme enchantée (253) | Portée 1 m, +BFM Dégâts |
| V-32 | Arme aethyrique (242) | Arme Magique choisie (p. 301), pas +3 général |
| V-33 | Serres d'Ambre (245) | Mains nues BF + 4, Hémorragique |
| V-34 | Couronne de Flamme (248) | +1 Seigneur de guerre ; +1 DR en Focalisation et Incantation d'Aqshy |
| V-35 | Protection de Phâ (252) | Entrée interdite, Brisé, pas de Corruption (l. 1697) |
| V-36 | Attaques en chaîne (243) | −1 Dégât à chaque rebond |
| V-37 | Effacement d'esprit (254) | Test d'Int (+2) opposé, à la fin ; pas de Surpris (l. 184, 1825) |
| V-38 | Illusion (254) | Intuition (−1) opposée (l. 187) |
| V-39 | Vol du Destin (246) | Cible ZdE (BFM), aligné sur Nuée Funeste |
| V-40 | Durées | Vision dans le noir : BI Initiative (override générateur l. 1810) ; Sang corrosif : BE ; Langue des Bêtes, Or des fous, Forge de Chamon : FM minutes ; Troisième Signe : Initiative Rounds |
| V-41 | Cœurs Enflammés (248) | Portée Vous ; alliés seulement ; Test de Frénésie ; NI et talents de la description |
| V-42 | Purification (249) | +DR états Enflammé |
| V-43 | Lance d'Ambre (246) | Ignore PA cuir, fourrure, écailles ; Hémorragique ; localisation choisie ; pas de surpuissance « targets » |
| V-44 | Restrictions | Aura ordinaire, Langue des Bêtes, Forme bestiale : pas d'incantation ni de dissipation ; Wyssan : pas de Langue ni de Savoir |
| V-45 | Peau du Chasseur (246) | Retirer Foulée (Forêts) |
| V-46 | Effets inventés | Maître des Bêtes (+4 Dressage, retrait de Peur, Test de FM), Sanctifier (+1 Calme/Résistance), Doppelgänger (+4), Destrier d'Ombre (M + 4 à la cible), Putréfaction (2 PA au lieu de 1) : supprimer |
| V-47 | Perturbant (244) | Trait Perturbant, pas l'état non V5 « Distrait » |
| V-48 | Téléportation (245) | Pas de surpuissance de portée |
| V-49 | Libellés | Pont : unité de portée ; Filet : durée du lanceur, pas « BI de la cible » |
| V-50 | Cautérisation | Test d'Endurance ; Sonné sur échec stupéfiant |
| V-51 | Sang de la Terre | Soin à chaque Round |
| V-52 | Éblouissant | Renouvellement à chaque Round |
| V-53 | Miasme mystifiant | Exclusion Magie des Arcanes (Ombres) |
| V-54 | Descriptions affichées | Aligner le catalogue affiché et les paramètres exécutés (Choc, Vol de Vie, Armure aethyrique, Arme enchantée, Enchevêtrement, Cœurs Enflammés…) ; si le catalogue public ne peut pas changer, afficher le paramètre exécuté à côté de la description |

## Phase 8 — Contrats hors livre (161 : 30 elfiques, 18 WoM, 112 catalogue, Jade)

| Id | Sort (source) | Correction |
| --- | --- | --- |
| W-01 | Coruscation de Finreir (HE p. 86) | Vol (Agilité) et 5 PA non cumulés à l'armure ; aucun projectile (générateur l. 538) |
| W-02 | Lames Azurées (catalogue) | 3 frappes de 8 contre les attaquants engagés désignés (générateur l. 941) |
| W-03 | Bannissement Majeur (HE p. 88) | Démons et Morts-vivants seulement ; projectile BFM + 8, ou + 15 si Taille Grande ou plus ; Instable double avant absorption, plafonné (générateur l. 579, `v5-spell-contracts.js:1441`) |
| W-04 | Bannissement Mineur (HE p. 81) | Test opposé FM contre Calme, renvoi sans dégâts ; portée FM (`v5-spell-contracts.js:1985`) |
| W-05 | Tempête Magmatique, Orage de Thorsen, Cendres et Poussière | Une seule application (S-08) ; Magma 8 + DR, 1 Enflammé ; Thorsen 10 + DR ; Cendres 6 + DR avec armure |
| W-06 | Corps de Feu (WoM p. 134) | Retirer F + 10, E + 10 et l'immunité au feu ; dégâts réactifs (générateur l. 1824) |
| W-07 | Sang Bouillonnant (WoM p. 134) | Test de Résistance consommé ; ignore l'armure ; 2 Aveuglé ; dégâts périodiques ; explosion à la mort (générateur l. 715) |
| W-08 | Voix de Fer (HE p. 82) | +1 DR ; supprimer Soc + 10, Peur (1) et le retrait de Peur/Terreur ; durée Sociabilité minutes (`v5-spell-contracts.js:2221`) |
| W-09 | Bonus inventés | Masque de l'Esprit (−3, sans +2), Alarme Magique, Parler avec un Animal (substitution de compétence, Int minutes), Impasse (neutralisation), Attraction des Flèches (relance), Colérique, Goût de Feu, Silence, Invocation de Monture, Révéler la Magie, Purification du Corps (maladresse, sans Sonné), Calme (ne retire pas Brisé, Terreur, Haine) |
| W-10 | États sans Test ni condition | Flamme Captivante, Goût de la Mort, Égarer (À Terre sur 9-10 seulement), Chaleur Desséchante (en courant), Danse du Désespoir, Délivrance de la Mort, Mains de Karkora, Éveil du Bois (+4 projectile, sans Esquive), Crevasse et Gouffre de Tarnus (fermeture en fin de sort), Illuminer l'édifice |
| W-11 | Valeurs WoM | Malédiction d'Anraheir (M −2, −20 dans la zone, générateur l. 747) ; Étreinte d'Iyrtu (l. 796) ; Destin de Bjuna (BF de la cible) ; Convocation Ardente (projectile BFM + 5, Rounds suivants) ; Tempête (nom « empête », +4 au sol et +5 en vol, Test d'Athlétisme) ; Chant vivifiant (+DR, `v5-spell-contracts.js:1508`) ; Chair de Pierre (Mouvement ÷ 2, l. 1541) ; Ver Grouillant et Inscription (selon le matériau) |
| W-12 | Invocations | Profils propres : Esprit du Foyer (BE retranché), Cercueil de Jade, Contrainte des Esprits, Ombre Vagabonde ; Épées Sanguines (CC 60, 8 Dégâts, Vol (20), indestructibles) |
| W-13 | Extinction de l'Âme | +7 DR : 16 et non 20 ; portée et zone doublées (`v5-spell-contracts.js:1305`) |
| W-14 | La Fortune est Capricieuse | Selon D-22 (`v5-combat-rules.js:213`) |
| W-15 | Cor d'Andar, Chute des feuilles, Capuche Vengeresse | ±2 DR ; pas de Peur ; réduction de dégâts typée avec Test de Calme ; durée 2 × BFM |
| W-16 | Corrections de l'audit non reportées | Blizzard, Éveil, Ver : FM ; Transe : portée Initiative ; Lunes, Colchis : zone FM ; Blizzard : À Terre via `athleticsTestSl` |
| W-17 | Ciblage | Chemin entre les Mondes : alliés seulement ; Acceptation du Destin : ennemis permis |
| W-19 | Silence (V5 p. 245) et Coruscating Arc (V5 p. 249) — D-21 | Ajouter les deux entrées au catalogue public (`reference-snapshot.json` et source du catalogue), recalculer les versions de contenu, créer leurs contrats et les compter dans la matrice (279 identités) ; vérifier le rafraîchissement des caches existants ; **W-19 annulé le 11 octobre (doublons : Silence d’Ulgu déjà au catalogue ; Coruscating Arc = version V5 de l’Arc de T’Essla)** : aucun ajout, 277 identités conservées |
| W-18 | Données | `page: 240` par défaut sur les 161 (générateur l. 2082) ; 43 + 64 rappels aux mots collés ; Merciw : plafond 100 à vérifier |

## Phase 9 — Interface et intégration

| Id | Correction | Où |
| --- | --- | --- |
| U-01 | Boutons secondaires (runes, relance de Corruption, récupération) : `draft.busy` et contrôle de révision | `workspace-view.js:945, 948` ; `v5-magic-controls.js:65-69` |
| U-02 | Ouvrir « Cibles multiples » ou « Talents » ne vide plus l'aperçu | `v5-magic-controls.js:6` ; `resolution-panel.js:543` |
| U-03 | Erreur de récupération d'épuisement affichée | `workspace-view.js:952` |
| U-04 | `applySpellExecution` propage l'échec de sauvegarde (`{ok:false}`) | store.js |
| U-05 | Contrôle de révision sur `applyLoreAttribute`, `applyHandOfGlory`, `applyBeastForm`, `applyDaemonbane`, `applyVerdantApotheosis` | store.js |
| U-06 | Purge bornée de `appliedSpellExecutions` | store.js |
| U-07 | Sanitisation des valeurs venues du cloud : `channelling.sl`, `statModifiers`, `max` des runes | sanitize.js ; migrations.js |
| U-08 | Synchronisation de fiche compatible avec les couches (S-05), y compris sous Forme bestiale | `fiche-sync.js:442-444` |
| U-09 | Section Règles : retirer « prévu au lot 3 » ; documenter D-01 à D-22 | `rules.js:89` |
| U-10 | `index.html:80` affiche 3.12.3 | index.html |

## Phase 10 — Couverture honnête et clôture

| Id | Travail |
| --- | --- |
| C-01 | Recalculer la matrice : un sort n'est « calculable » que si toutes ses clauses mesurables ont une sonde exécutée ; corriger `IMPLEMENTED_SPECIAL_HANDLERS`. |
| C-02 | Suivi exhaustif des 277 identités et des clauses de talents : conforme / anomalie / donnée MJ / rappel / hors périmètre / non vérifié ; « lu » et « exécuté » distingués. |
| C-03 | Contrôles non faits par la relecture : profils du bestiaire (Forme bestiale), portées et aires (non contrôlées par le moteur : décider rappel ou contrôle), Undo de transformation, sorts « Catalogue relu » Cieux/Métal/Lumière confrontés à Winds of Magic, autres suppléments. |
| C-04 | Recette complète : `node --test`, parcours Edge magie/combat/références/démarrage avec vrais gestes (fin de tour par le bandeau et la touche N), 10 scénarios cloud locaux, PWA hors ligne ; nouveaux reçus dans tmp/lot3. |
| C-05 | Version (3.15.0), `sw.js` (cache et nouveaux modules), CHANGELOG ; mise à jour de LOT3_FINALISATION_MAGIE.md et de la recette. |
| C-06 | Seconde relecture indépendante sur l'arbre corrigé, centrée sur les phases 2 et 6. |

## Découpage conseillé en livraisons

1. Phases 0-1, S-01, S-02, S-03, L-01 : l'outil redevient fiable en jeu (expiration, aucun tirage implicite, sorts mineurs).
2. S-04 à S-07, S-11, phase 6 : couches, Protection, destinataires, arbitrages.
3. S-08 à S-10, phases 3, 4, 5 : moteur magique complet.
4. Phases 7 et 8 : contrats, par Domaine (une livraison par Vent, puis elfiques, puis WoM et catalogue).
5. Phases 9 et 10 : interface, couverture, recette.

Chaque livraison se termine par `node --test` vert, la régénération reproductible des contrats et la mise à jour de la matrice.

## Statuts de clôture — 14 octobre 2026

L’historique et les constats d’origine ci-dessus sont conservés. **Fait** signifie traitement livré dans le périmètre et rejoué par la recette actuelle ; les faits MJ, rappels et exclusions gardent leur statut. Les rouges de clôture sont dans tmp/lot3/cloture-regressions-red-final.log ; les rouges historiques ne sont pas réattestés par ce passage. Aucun total de contrats ne vaut certification de chaque clause.

| Item | Statut courant | Preuve / limite |
| --- | --- | --- |
| D-01 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-02 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-03 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-04 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-05 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-06 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-07 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-08 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-09 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-10 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-11 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-12 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-13 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-14 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-15 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-16 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-17 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-18 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-19 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-20 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| D-21 | annulé | Doublons confirmés le 11 octobre ; 277 identités conservées. [Catalogue](LOT3_RAPPORT_CATALOGUE_V5.md). |
| D-22 | fait | [Arbitrages courants](LOT3_CADRAGE_MAGIE.md). |
| T-01 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-02 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-03 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-04 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-05 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-06 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| T-07 | fait | Sondes existantes rejouées ; rouge avant correctifs Aqshy et Test étendu à la clôture. Les traces anciennes restent dans les rapports, sans réattestation. |
| S-01 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-02 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-03 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-04 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-05 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-06 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-07 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-08 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-09 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-10 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| S-11 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| L-01 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-02 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-03 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-04 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-05 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-06 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-07 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-08 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-09 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-10 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-11 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-12 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-13 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| L-14 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| X-01 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-02 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-03 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-04 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-05 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-06 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| X-07 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| H-01 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-02 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-03 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-04 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-05 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-06 | fait | [Preuves D-07](LOT3_PREUVES_CLOTURE.json) : NI ignoré et −3 DR aux effets de la cible résistante. |
| H-07 | fait | [Suivi](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) : 54 clauses, zéro non vérifié, 22 hors périmètre ; trois clauses clôturées. |
| H-08 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| H-09 | fait | [Incidents / Haute Magie](LOT3_RAPPORT_INCIDENTS_ET_HAUTE_MAGIE.md), tests ciblés existants et [recette finale](LOT3_RECETTE_3_15.md). |
| A-01 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-02 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-03 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-04 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-05 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-06 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| A-07 | fait | Sondes Store, socle, arbitrages et fin de Tour dans tests/lot3-*.test.js ; [recette finale](LOT3_RECETTE_3_15.md). |
| V-01 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-02 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-03 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-04 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-05 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-06 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-07 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-08 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-09 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-10 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-11 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-12 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-13 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-14 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-15 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-16 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-17 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-18 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-19 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-20 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-21 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-22 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-23 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-24 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-25 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-26 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-27 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-28 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-29 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-30 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-31 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-32 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-33 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-34 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-35 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-36 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-37 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-38 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-39 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-40 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-41 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-42 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-43 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-44 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-45 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-46 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-47 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-48 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-49 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-50 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-51 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-52 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-53 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| V-54 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-01 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-02 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-03 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-04 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-05 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-06 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-07 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-08 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-09 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-10 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-11 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-12 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-13 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-14 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-15 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-16 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-17 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-18 | fait | [Suivi par identité](LOT3_SUIVI_EXHAUSTIF_MAGIE.md), [fiches historiques](LOT3_FICHES_CORRECTION_CONTRATS.md), rapports et retours des lots 1 à 5B. |
| W-19 | annulé | Silence d’Ulgu et Arc de T’Essla déjà présents ; aucun ajout, 277 identités. [Catalogue](LOT3_RAPPORT_CATALOGUE_V5.md). |
| U-01 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-02 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-03 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-04 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-05 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-06 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-07 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-08 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-09 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| U-10 | fait | [Intégration](LOT3_RAPPORT_INTEGRATION.md) et toutes les recettes UI de la [recette 3.15](LOT3_RECETTE_3_15.md). |
| C-01 | fait | [Matrice](LOT3_MATRICE_CONTRATS_V5.md) et sondes de conséquence ; traitement principal distinct de l’automatisation complète. |
| C-02 | fait | [Suivi courant](LOT3_SUIVI_EXHAUSTIF_MAGIE.md) ; audit initial conservé. |
| C-03 | restant | Bestiaire complet et cas hors catalogue non certifiés. Profils nommés, Undo et sources du catalogue éprouvés ; géométrie conservée comme donnée MJ. |
| C-04 | fait | [Recette complète](LOT3_RECETTE_3_15.md) ; résultats définitifs dans [rapport](LOT3_RAPPORT_CLOTURE.md). |
| C-05 | fait | 3.15.0 / 153 assets ; [journal MJ](LOT3_JOURNAL_3_15_0.md), documents et paquet courant. |
| C-06 | fait | Seconde relecture indépendante reçue le 14 octobre : [26 points et règles](LOT3_RELECTURE_2_CLAUDE.md). Corrections et validation : [rapport R2](LOT3_RAPPORT_CORRECTIONS_RELECTURE_2.md). |

## Précisions du 14 octobre, appliquées le 15 octobre

D-10 : une seule Focalisation pour les huit Vents ; les alias colorés ne créent aucun score propre à un Vent. Valeurs divergentes : anomalie visible au MJ. Qhaysh reste distinct. D-13 : Protection réussie annule dégâts et Critique, autres conséquences conservées. Fléau des Démons : pas de cumul sur une cible déjà affaiblie. Les anciens libellés du tableau historique ci-dessus sont remplacés par ces décisions.

## Reliquats clos le 17 octobre 2026

Les cinq reliquats sont corrigés : équipement vide, champ secondaire, détection stricte des Démons, cinq libellés et Yenlui d’Apothéose. **2231/2231 tests Node, 21 commandes vertes**, cloud local et paquet hors ligne compris. [Rapport et preuves](LOT3_RAPPORT_RELIQUATS_2026_10_17.md). [Delta supplémentaire : 5 cellules Magie et 1 Miracles](LOT3_A_REPORTER_DANS_LA_FEUILLE_RELIQUATS.md) ; [report cumulé actuel](LOT3_A_REPORTER_DANS_LA_FEUILLE_ACTUEL.md). Version 3.15.0, aucune publication.
