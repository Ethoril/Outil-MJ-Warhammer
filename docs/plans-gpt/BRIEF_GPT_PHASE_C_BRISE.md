# Brief GPT — Phase C : Brisé, Peur, Terreur

Lis d’abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md` (règles et démarche complètes). Branche : `gpt/phase-c`.

## Entrées

- Inventaire : `docs/COURAGE_BRISE_INVENTAIRE.json` et `.md` (200 clauses : 7 moteur, 53 assistées, 34 rappels, 106 absentes).
- Arbitrages : `docs/ARBITRAGES_MJ_21_10.md`, section « Brisé, Peur, Terreur ».
- Code existant : `js/core/v5-broken-escape.js`, `js/core/v5-effects.js`, talents Effrayant et Terreur (`grep -rn "frightening\|terror\|fear" js/core`).

## Contenu attendu du plan de lots (au minimum)

1. Vérifier puis aligner : seuil de Peur « atteindre » (DR ≥ indice) ; Terreur = 1 Brisé + 1 par DR négatif au-delà du premier ; Effrayant et Peur générale restent deux mécanismes distincts.
2. Fuite ! : raccorder le Mouvement supplémentaire et son exemption de Brisé à la fuite engagée.
3. Monture Brisée : récupération en fin de Round (V5).
4. Chaque clause « absente » ou « rappel » dotée d’une mécanique V5 : lot d’automatisation ou d’assistance ; versions de suppléments ramenées à V5 (Belliqueux, À Sang-froid, Hurlement spectral, Terreur à deux tailles…).
5. Indices de Peur ou de Terreur non chiffrés par leur source : saisie MJ.
6. Exclus (arbitrage) : moral de masse, séquelles psychologiques, rançonnement, rancunes, drogues ; Exténué en fin de Brisé (règle V4) ; migration de Petit vers la Taille V5.

Fin de phase : recette complète verte, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_C.md`.
