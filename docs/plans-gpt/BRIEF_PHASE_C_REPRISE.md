# Brief — Reprise de la phase C (Brisé, Peur, Terreur)

Valable pour tout exécutant (Gemini, GPT, Claude Pro). Lis `docs/plans-gpt/REGLES_COMMUNES_GPT.md`, `docs/plans-gpt/BRIEF_GPT_PHASE_C_BRISE.md` et le plan commité `docs/plans-gpt/PLAN_GPT_PHASE_C.md` : tout reste applicable.

## Point de départ

- Faits et fusionnés dans `codex/divin-v5` le 21/10 (commit de fusion `77b8fb0`) : complément d’inventaire L18-L26 (`9f2292d`), plan (`3a09ccf`), C01 socle Peur et Terreur (`4d17ad5`), caractérisation de `store.js` (`4646c2b`), C02 fuite engagée, Fuite ! et poursuite V5 (`9f17d9f`).
- Crée une branche neuve depuis `codex/divin-v5` à jour (`gemini/phase-c2`, `gpt/phase-c2` ou `pro/phase-c2` selon l’exécutant), dans un nouveau worktree sur le lecteur E: (`E:\Outil MJ Warhammer\tmp\<exécutant>-phase-c2-worktree`).

## À faire

Lots **C03, C04, C05, puis C06** (clôture), dans l’ordre du plan :

1. **C03** : ralliement personnel, Round entier caché, ralliement d’alliés par Commandement (`previewLeadershipRallyAllies`, C0-L06-018 : Action gratuite si le meneur n’est pas Brisé, budget `1 + max(0, DR − 1)` réparti entre alliés), monture Brisée en fin de Round (C0-L13-005, arbitrage Q16 : méthode `ride` de `recoverV5Condition` en fin de Round ou hors combat, non engagée, cavalier en selle et non Brisé), Curse of the Harsh Mistress (C0-L25-005), Master and Commander / Crew Commander (C0-L25-003), Delicious Excruciation (C0-L18-002).
2. **C04** : Intimidation en combat (C0-L06-019, C0-L04-004), Belliqueux (Q09), À Sang-froid (Q20), Hurlement spectral (Q10), Immunité à la Psychologie / Nuée, Craintif + Dressage (Magie, Guerre), Bestial / Territorial, Cavalier accompli — version V5 partout.
3. **C05** : Poisoned Whispers (Q12 : BFM Rounds, Test quotidien en rappel), Fellstave (Q14 : vérifier la formulation sur la source sans inverser la réussite), conversions V4 → V5 (Q17), runes, objets et capacités de suppléments retenus.
4. **C06** : test de couverture `tests/phase-c-c06-coverage.test.js`, `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_C.md`, recette complète `node tools/run-divine-recipe.mjs`, suite complète, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_C.md` (sections par session ; reprends le bilan de la session 1 d’après ce brief et `git log`).

## Rappels techniques (session 1)

- **Ne crée aucun nouveau fichier sous `js/`** : `tests/sw.test.js` exige que tout module de `js/` figure dans `sw.js`, dont la modification est interdite. Ajoute le code aux modules existants.
- Avant `node --test` ou la recette : `TEMP` et `TMP` sur le lecteur E:, hors du worktree (ex. `E:\Outil MJ Warhammer\tmp\<exécutant>-phase-c2-runtime`), sinon faux échecs E0/E2.
- Fins de ligne LF vérifiées avant chaque commit ; message de commit terminé par la mention de l’exécutant.
- Si la session approche de sa limite : termine le lot en cours (commit), mets le rapport à jour (lots faits, lot suivant), arrête-toi.
