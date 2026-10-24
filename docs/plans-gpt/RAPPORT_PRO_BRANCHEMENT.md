# Rapport Pro — branchement des Traits et des familiers

Plan : `PLAN_PRO_BRANCHEMENT.md`. Choix et questions : `CHOIX_EXECUTANT_BRANCHEMENT.md`.

| Lot | État |
| --- | --- |
| B0 | FAIT (inventaire ci-dessous) |
| B1 | FAIT (Taille branchée, voir ci-dessous) |

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

### Ordre de branchement proposé
1. B1 Taille (crée l'accroche commune des rappels de Traits dans `deriveReminders`, réutilisée ensuite par tous).
2. B3 Régénération, B2 Têtes, B7 États (accrochent `nextTurn` et `applyResolution`).
3. B4 Psychologie, B5 Sens, B6 Déplacement, B8 Magie.
4. B9 Slann, puis B10, B11 Familiers.

### Constat
Les 8 branchements existants (attaques naturelles, Protection/Ward, magie `willpowerBase`, Résistance à la Magie, soutien/feu des familiers, liens de familier dans le store) sont les seuls appelants hors module. Toutes les autres fonctions `plan*` et toutes les fonctions `*Reminders` sont **code testé, non appelé**.
