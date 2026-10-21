# Brief GPT — Reprise de la phase B (Courroux)

Lis `docs/plans-gpt/REGLES_COMMUNES_GPT.md`, `docs/plans-gpt/BRIEF_GPT_PHASE_B_COURROUX.md`, ton plan commité `docs/plans-gpt/PLAN_GPT_PHASE_B.md` et ton rapport partiel `docs/plans-gpt/RAPPORT_GPT_PHASE_B.md`. Tout reste applicable, avec ces précisions.

## Point de départ

- La branche `codex/divin-v5` contient déjà ton travail (B00, B02, plan, caractérisation B01), fusionné le 21/10 (commit de fusion `6956d61`) avec des ajouts de Gemini (documentation, outillage). Crée une nouvelle branche `gpt/phase-b2` depuis `codex/divin-v5` à jour, dans un nouveau worktree (ou mets ton worktree à jour par fusion de `codex/divin-v5`, sans rebase destructif).

## Déblocage de B01

Lis `docs/ARBITRAGES_MJ_21_10.md`, section « Complément du 21/10 » : le MJ confirme Q12 en connaissance de cause (jamais de table à 0 Péché ; résultats 01-10 inaccessibles, marqués comme tels au registre) et **autorise la migration des fixtures** qui obtenaient un résultat bas par une maladresse à 0 Péché, à condition de conserver toutes leurs assertions mécaniques. Reprends ton patch `tmp/gpt-phase-b/b1-attempt.patch` (dans l’ancien worktree), migre les fixtures listées dans ton rapport (`divin-v5-wrath-calendar-independent`, `divin-v5-wrath-lessons-independent`, `divin-v5-wrath-browser`, `divin-v5-control`, `divin-v5-engine`, et toute autre que la suite révèle), un commit pour la migration des fixtures (suite verte avec l’ancien comportement si possible), puis un commit pour Q12.

## Puis

Lots B03 à B18 dans l’ordre du plan, puis la clôture B19, avec la même démarche (tests d’abord, suite complète, commit par lot). Si la session ne suffit pas, termine proprement le lot en cours, mets à jour le rapport (lots faits, lot suivant) et arrête-toi : une autre session reprendra au lot suivant.

Rapport : mets à jour `docs/plans-gpt/RAPPORT_GPT_PHASE_B.md` (sections par session).
