# Plan GLM — fin du chantier divin (20 octobre 2026)

Plan written by the orchestrator (Claude) for a single long GLM 5.3 session. Everything below is binding. Work in the current git worktree (branch `glm/fin-chantier`). Files are LF: never change line endings.

## Global rules

- Steps in order. For EACH step: (1) write the new test file(s) FIRST and run them: they must FAIL for the expected reason; (2) implement; (3) run the step's acceptance command; (4) run the full suite `node --test --test-concurrency=4` (≈3240 tests; one known environmental failure is acceptable ONLY if it is `E0 indépendant — la recette refuse un cwd externe` and only in a fresh worktree); (5) `git add -A && git commit -m "<type>(divin): <French summary> (GLM 5.3)"`. Then next step.
- Allowed files are listed per step. Generated files `js/data/v5-divine-contracts.json` and `docs/divin/DIVIN_INVENTAIRE.json` change ONLY through `node tools/build-v5-divine-contracts.mjs` (then `--check` must pass).
- Existing tests: never edit one, EXCEPT (a) the ones a step explicitly names, and (b) AMENDMENT 20/10 after the first run: any existing assertion that pins the status, the effect list or a status count of the contract the step changes (known: `tests/divin-v5-blessings-cults.test.js`, `tests/divin-v5-catalogue.test.js`, `tests/divin-v5-up-in-arms.test.js`, `tests/divin-v5-e0-independent.test.js`; there may be others): update ONLY that pinned value/list/count for that contract, nothing else, and list each such edit in the commit message.
- NEVER change a game rule or existing behaviour to make a test pass. If an expectation below looks impossible or wrong, or a step needs a file outside its list: write the reason in `tmp/glm-fin-chantier/BLOCKED-<step>.md`, `git checkout -- .` for that step, and go to the next step.
- No new dependency, no reformatting, no `git stash`, no push, edit files one at a time (never parallel edits on one file).
- Code style: match the surrounding code; short French comments only where the existing code has them; generic declarative effects (never a case keyed on a prayer name).
- Fixture models (copy, do not import across test files): `tests/divin-v5-p5-wolf-bite.test.js` (miracle invoked through the real store, `expiry`, `endDivinePrayer`, `undo`), `tests/divin-v5-p5-protection.test.js` (attack previews, `unresolved`), `tests/divin-v5-p5-crush-the-weak.test.js` (quotas per Round), `tests/divin-v5-p5-heed-not-the-witch.test.js` (area miracle, designated participants), `tests/p4c-char-magic.test.js` (magic summons, `destrier` fixture).
- Handler contract: read `js/core/v5-divine-effect-handlers.js` lines 1-35 once (needs / resolve / buildLayer / applyInstant / inputFields / receipt / appliesTo / perSuccessLevels). New effect types are registered in `js/core/v5-divine-grammar.js` `effectTypes`.
- Final message (short): one line per step: DONE (commit hash) or BLOCKED (reason), then the last full-suite summary.

## Step 1 — R19/R20 (DONE, commit 06d1eda): deferred removal of an orphan magic summon after a spell interaction

Today `previewSpellInteraction` ends with `removeExpiredSummons(next,{deferCurrent:false})` (`js/core/v5-magic-turn.js` ~line 218): ending a summoning spell early (or any interaction) during the summon's own Turn removes it immediately and gives the Turn back to `order[0]` (the caster plays again, the next combatant is skipped). GM-approved rule (same as R18): an orphan summon that is the current actor (and not first in order) stays until the next command, then the Turn passes to its normal successor.

- Change: call `removeExpiredSummons(next)` (default deferred) there. Nothing else in that file.
- Test to UPDATE (explicitly allowed): `tests/p4c-char-magic.test.js`, test `C9 invocation retirée alors qu’elle est l’acteur courant (fin anticipée)`: new expectations: right after `applySpellInteraction({kind:'end'})` the horse is still in `combat.order` and still `currentActorId`; after one `endTurn(engine)` the horse is gone from participants and order, and `currentActorId === 'foe'` (its successor), NOT `'mage'`; `undo()` twice restores the horse as current actor. Rename the test title accordingly (French).
- Add one test in the same file: an interaction other than `end` that makes the summon orphan during its Turn behaves the same (if no such interaction exists in the fixture, skip it and note it in the commit message).
- Allowed: `js/core/v5-magic-turn.js`, `tests/p4c-char-magic.test.js`.
- Acceptance: `node --test tests/p4c-char-magic.test.js tests/divin-v5-r25-asphyxie.test.js tests/lot3-v5-magic-33.test.js`.

## Step 2 — En Bon Ordre (Myrmidia, `divine:miracle:en-bon-ordre`, Up in Arms p.79)

Rule: while active, allies in the zone may disengage without the enemy gaining Momentum (Élan) or a free attack. The engine has no disengage action, so this is ASSISTED: designated allies (GM designation, like Sur un Terrain Mortel) carry a flag shown to the GM.

- Add `'orderlyDisengage'` to `specialStateKeys` in `js/core/v5-divine-effects-gear.js` (~line 12).
- Source entry `docs/divin/sources/miracles/myrmidia-up-in-arms.mjs` line ~52: `status: 'assisted'`, `effects: [{ type: 'special-state', orderlyDisengage: true }]`, engine clause text in French: "Les alliés désignés portent « En bon ordre » : Désengagement sans Élan ni attaque gratuite adverse (à appliquer par le MJ, le moteur ne gère pas le Désengagement)." Model: the Sur un Terrain Mortel entry at line ~86 of the same file.
- Test `tests/divin-v5-p5-en-bon-ordre.test.js`: contract not manual; invoked on two designated allies → both have `extensions.v5.specialStates.orderlyDisengage === true`, a non-designated participant does not; `endDivinePrayer` removes it; `undo` restores it.
- Allowed: those two source files + new test + generated files + count tests.
- Acceptance: `node tools/build-v5-divine-contracts.mjs --check && node --test tests/divin-v5-p5-en-bon-ordre.test.js tests/divin-v5-p5-terrain.test.js tests/divin-v5-p4c-contracts.test.js tests/divin-v5-t5-form-model.test.js`.

## Step 3 — Attaque Rapide (Myrmidia, `divine:miracle:attaque-rapide`, Up in Arms p.79)

Rule: for 3 Rounds, at the start of each Round the priest may take an Initiative Test (+0) for a free attack outside the normal sequence with the main-hand weapon. Model: the Frenzy free attack (`js/core/v5-store-action.js` lines ~63-66 `freeAttackTalent==='frenzy'`; `js/core/v5-talent-attacks.js` `previewAttackPrelude`; UI checkbox `js/ui/resolution-panel.js` ~line 1354).

- New generic effect `special-state`? NO: add a new effect type `free-attack` in `js/core/v5-divine-effects-gear.js` handlers: validate `{ scope: 'round', test: { attr: 'I', slModifier: 0 } }` shape; buildLayer => `({ freeAttack: { scope, test } })`; `appliesTo: 'caster'` and `implicitTarget: true` like Wolf's Bite (check how Wolf's Bite's handler / entry handles self-target).
- `v5-store-action.js`: when `context.freeAttackTalent === 'divine-free-attack'`: the actor must carry a `freeAttack` layer, else `throw new TypeError('Attaque rapide non disponible.')`; set `v5.extraAttack = true`; push quota `{ id: 'divine:free-attack', scope: 'round', maximum: 1 }`; exempt every momentum cost with `sourceId: 'divine-free-attack'` (same as Frenzy).
- `previewAttackPrelude` (v5-talent-attacks.js): when `c.freeAttackTalent === 'divine-free-attack'`: `c.freeAttackTest` must be `{ success: true }` else push unresolved `Attaque rapide : Test d’Initiative Intermédiaire (+0 DR) réussi requis.`; if `c.mainHand !== true` push unresolved `Attaque rapide : arme de la main principale requise.`
- UI (`resolution-panel.js`, next to the Frenzy checkbox, attack type only, only when the actor carries a `freeAttack` layer): checkbox "Attaque rapide (Myrmidia) : attaque gratuite hors séquence" setting `freeAttackTalent` to `'divine-free-attack'`/`'none'` exactly like the Frenzy checkbox does, plus a select "Test d’Initiative (+0 DR) de l’Attaque rapide" (À saisir / Échec / Réussite) writing `v5Context.freeAttackTest = { success }` (copy the Protection select pattern ~line 1167), and a checkbox for `mainHand` if the Frenzy/Reaction-strike UI does not already expose one (search `mainHand` in that file first).
- Source entry line ~105: `status: 'assisted'`, effect as above, clauses in French; reminder "au début de chaque Round".
- Tests `tests/divin-v5-p5-attaque-rapide.test.js` (model: `tests/lot2-v5-remaining-talents.test.js` for frenzy free attack + `divin-v5-p5-crush-the-weak.test.js`): with the miracle, an attack with `freeAttackTalent:'divine-free-attack'`, `freeAttackTest:{success:true}`, `mainHand:true` applies and costs no Momentum; a second one in the same Round is refused by the quota; next Round allowed again; missing/failed Initiative Test → unresolved and not applicable; without the miracle → throws / refused; `undo` restores the quota. Extend `tests/divin-v5-p5-ui-browser.mjs` with: checkbox present only when the actor has the layer.
- Allowed: `js/core/v5-divine-effects-gear.js`, `js/core/v5-divine-grammar.js`, `js/core/v5-store-action.js`, `js/core/v5-talent-attacks.js`, `js/ui/resolution-panel.js`, the source file, new test, `tests/divin-v5-p5-ui-browser.mjs`, generated files, count tests.
- Acceptance: `node tools/build-v5-divine-contracts.mjs --check && node --test tests/divin-v5-p5-attaque-rapide.test.js tests/lot2-v5-remaining-talents.test.js tests/divin-v5-p5-interactions.test.js && node tests/divin-v5-p5-ui-browser.mjs`.

## Step 4 — Fureur d’Ulric (`divine:miracle:ulric:ulric-s-fury`, Livre de base V5 p.228)

Rule: an ally may take a free Frenzy Test during their Turns; instead of the usual Frenzy free attack, Frenzy adds +1d10 Damage to the FIRST melee hit they land in each of their Turns; on a 10, roll again and add, until a result below 10.

- Effects (source `docs/divin/sources/miracles/ulric.mjs` line ~95): `[{ type: 'grant-talent', talents: [{ id: 'talent-frenzy', rank: 1 }] }, { type: 'frenzy-fury' }]`, `status: 'assisted'`. `talent-frenzy` is already injectable (gear.js line ~14). Check that the first effect makes the action "Entrer en Frénésie" available (v5-talent-actions.js ~line 33).
- New effect type `frenzy-fury` (gear.js): buildLayer => `({ frenzyFury: { lastTurnId: null } })`.
- `v5-store-action.js`: if `context.freeAttackTalent === 'frenzy'` and the actor carries a `frenzyFury` layer → `throw new TypeError('Fureur d’Ulric : la Frénésie ajoute 1d10 Dégâts au premier coup au lieu de l’attaque gratuite.')`.
- `js/core/resolution.js` near `frenzyDamage` (~line 517): when the actor is in Frenzy (same test as `frenzyDamage`), the attack is melee, the actor carries a `frenzyFury` layer whose `lastTurnId !== normalized.v5Clock?.turnId`, and the attack hits (damage is computed): read `context.ulricFuryDice` — must be an array of integers 1-10 where every element except the last is 10 and the last is < 10; missing/invalid → unresolved `Fureur d’Ulric : saisir le d10 de dégâts (relancer et ajouter sur 10).`; valid → add the sum to the damage bonus (same channel as `frenzyDamage`, with an origin label). At apply (next to the Protection `passedAttackerIds` block), set the layer's `frenzyFury.lastTurnId` to the turn id used. If `v5Clock.turnId` is not available there, STOP the step (BLOCKED) rather than inventing a turn identity.
- UI: number input(s) are optional; at minimum a text field "Fureur d’Ulric : d10 de dégâts (ex. 10,4)" writing `v5Context.ulricFuryDice` as an array, shown only when the actor carries the layer and is in Frenzy (attack type).
- Tests `tests/divin-v5-p5-fureur-ulric.test.js`: ally gets the talent and the layer; the frenzy free attack is refused; first melee hit in frenzy with dice `[10, 4]` adds 14 damage vs the same attack without the miracle; a second hit in the same Turn adds nothing and asks nothing; next Turn asks again; invalid sequences `[4,10]`, `[11]`, `[]` are unresolved; not in Frenzy → nothing asked; `endDivinePrayer` removes talent and layer; `undo` restores `lastTurnId`.
- Allowed: gear.js, grammar.js, v5-store-action.js, resolution.js, resolution-panel.js, workspace-view.js (only if needed to pass the context field), the source file, new test, generated files, count tests.
- Acceptance: `node tools/build-v5-divine-contracts.mjs --check && node --test tests/divin-v5-p5-fureur-ulric.test.js tests/lot2-v5-remaining-talents.test.js tests/divin-v5-p5-wolf-bite.test.js tests/divin-v5-p5-protection.test.js`.

## Step 5 — Registry of Critical Wounds (prerequisite of Step 6)

Today an attack critical becomes States + extra Wounds at apply time and leaves no record; spell criticals are recorded in `participant.extensions.v5.criticalWounds` WITHOUT an id (`js/core/v5-spell-contracts.js` ~lines 3438 and 3479). Make every critical wound a record with a stable id in `extensions.v5.criticalWounds`.

- Record shape: `{ id, source: 'attack' | 'spell', location, name, effectRoll, round, resolutionId | executionId, authorId }` (spell records keep their existing fields and gain `id` = `${executionId or castExecutionId}:crit:${targetId}` and `source: 'spell'`; if the execution id variable has another name there, use it).
- `js/core/resolution.js` apply function (search `const criticalEffects = preview.critical?.application`): for the main target, append one record per critical present in `preview.critical` (`details` and `second`, skipping `pending` ones), id `${resolutionId}:crit:${targetId}:${index}`, name = the critical effect's display name (inspect the object returned by `getV5CriticalEffect`), location = location name. Same for `preview.defenderCritical` on the attacker, and for each `preview.secondaryTargets[*].critical.second` on that secondary participant (they are applied from `row.participant`: add the record to the clone that is written).
- Tests `tests/divin-v5-crit-registry.test.js`: one record after a critical hit (fields above), two after a first+second critical, a defender critical recorded on the attacker, a whirlwind secondary critical recorded on the secondary target (copy the D1 fixture of `tests/divin-v5-p5-sauvagerie-consume.test.js`), a spell critical record has an id; `undo` removes the record; NO record when there is no critical; all existing tests unchanged.
- Allowed: resolution.js, v5-spell-contracts.js, new test.
- Acceptance: `node --test tests/divin-v5-crit-registry.test.js tests/divin-v5-p5-sauvagerie-consume.test.js tests/divin-v5-p5-sauvagerie-spell.test.js tests/p5-char-critical-injure.test.js tests/lot3-v5-magic-33.test.js`.

## Step 6 — Larmes de Shallya (`divine:miracle:shallya:shallya-s-tears`, source line ~64 of `docs/divin/sources/miracles/shallya.mjs`)

Rule: after praying (10 − Fellowship Bonus) Rounds, heal 1 Critical Wound of the target, +1 per +2 SL; interrupted prayer → nothing; amputated limbs are not reattached.

- New effect type `heal-critical` (handlers file of your choice among the divine effect modules; keep it next to `remove-condition` in `v5-divine-effects-conditions.js` if it fits): `{ count: 1, perSuccessLevels: { every: 2, add: 1, field: 'count' } }` (format used by Ranald's temporary-fortune, `ranald.mjs` line 46). Instant (no layer).
  - inputFields: three `select` fields, scope 'target', paths `criticalHeals.first`, `.second`, `.third`, labels "Blessure Critique guérie n° 1/2/3 (selon les DR)", options = the target's `extensions.v5.criticalWounds` as `[id, "<name> (<location>, Round <round>)"]` plus `['', 'Aucune']`.
  - needs: if the target has at least one critical wound, at least one chosen; chosen ids must exist and be distinct; more chosen than `count` → need with a French label.
  - applyInstant: remove the chosen records; States are NOT removed; receipt line lists healed wounds and the reminders "Prière de (10 − Bonus de Sociabilité) Rounds avant l’effet ; interrompue, aucun effet." and "Ne rattache pas les membres amputés."
- Source entry: `status: 'assisted'`, effect as above, clauses in French.
- Tests `tests/divin-v5-p5-larmes-shallya.test.js`: target with two critical wounds (create them through real critical hits, using Step 5); 2 SL → count 2 heals both; 0-1 SL → choosing two is refused; ids that do not exist are refused; no critical wound → no input needed and nothing happens; `undo` restores the records; States from the criticals remain.
- Allowed: the effect module chosen, grammar.js, the source file, new test, generated files, count tests.
- Acceptance: `node tools/build-v5-divine-contracts.mjs --check && node --test tests/divin-v5-p5-larmes-shallya.test.js tests/divin-v5-crit-registry.test.js tests/divin-v5-t5-form-model.test.js tests/divin-v5-p4c-contracts.test.js`.

## Step 7 — Protection UI polish

In `js/ui/resolution-panel.js` (search `Bénédiction de Protection : résultat du Test de Calme`), do not show the select when the attacker id is already in the layer's `attackDeterrent.passedAttackerIds`. Extend `tests/divin-v5-p5-ui-browser.mjs` with that case.
- Allowed: resolution-panel.js, the browser test.
- Acceptance: `node tests/divin-v5-p5-ui-browser.mjs`.

## End

Run `node --test --test-concurrency=4` and `node tools/build-v5-divine-contracts.mjs --check` one last time, then write the final message.
