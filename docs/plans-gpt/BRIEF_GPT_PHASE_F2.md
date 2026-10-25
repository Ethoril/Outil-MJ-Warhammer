# Brief GPT — phase F2 : implanter les règles retenues par le MJ en F1 (25/10/2026)

Suite de F1 : le MJ a répondu aux 3 349 questions (journal final, 970 fermées en bloc, 2 379 réponses). Après croisement avec le code et les arbitrages, **194 règles** sont à implanter, réparties en **14 lots par moteur**. F2 les code. Claude (orchestrateur) contre-vérifie et publie : **tu ne publies rien**.

## Entrées (dans `docs/plans-gpt/f2/`)

- `PLAN_F2_LOTS.md` : les 14 lots, ordre, moteurs, ce qu'il faut coder, critères d'acceptation, points déjà tranchés. **C'est ton plan de lots** : pas de nouveau plan à écrire, seulement le compléter (voir étape 1).
- `F2_LOTS.json` : par lot, chaque règle avec la question posée, le choix et la note du MJ, et le repérage du code fait le 25/10 à midi (verdict, preuve `fichier:ligne`).
- `ARBITRAGES_F1_25_10.md` : arbitrages du MJ pendant F1. **Ils priment sur le choix brut du journal** (ex. les cinq règles de blessures V4 de L13 restent « Implanter » dans le journal mais sont tranchées « rester en V5 » et absentes du plan).

## Mise en place

- Règles communes : `docs/plans-gpt/REGLES_COMMUNES_GPT.md` (garde-fous, tests, LF, commits « (GPT) », interdits). Les fichiers de `docs/plans-gpt/f2/` s'ajoutent aux fichiers d'arbitrage que tu ne modifies pas.
- Worktree depuis `main` (3.26.0, qui contient ce brief ; `codex/divin-v5` est au même point de code), par exception à la règle commune : `git worktree add -b gpt/phase-f2 "E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree" main`, `core.autocrlf false`, `core.eol lf`, `npm ci`.
- Rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_F2.md`, choix `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_F2.md`, blocages `tmp/gpt-phase-f2/BLOQUE-<lot>.md`.

## Règles de fond (rappel du plan)

- **V5 partout** : une règle V4 retenue se convertit (±10 → ±1 DR, Avantage → Élan), conversion consignée. Exception connue : le Petit homebrew V4.
- **« Ne pas implanter » ne retire jamais rien** : aucun lot n'enlève un comportement existant.
- **Aucune distance suivie** : allonges et portées = aides affichées, le MJ choisit la bande.
- **Le catalogue de la feuille du MJ fait foi** sur les profils d'armes en écart avec les livres.
- **La mort reste une décision du MJ** : jamais appliquée sans confirmation.
- Ce que l'outil ne peut pas connaître (terrain, hauteur, infériorité, météo, espace exigu, « monté ») devient un **sélecteur ou une case du MJ**, comme le demandent ses notes.
- Valeurs durables nouvelles (Corruption, mutations, séquelles, pertes de caractéristique) : `docs/VARIABLES_PERSISTANTES_PJ.md`, pour l'écriture future vers la fiche.

## Organisation du travail : sous-agents Luna

- **Chaque lot est codé par un sous-agent Luna**, à partir d'un brief de lot que tu rédiges (règles du lot, extrait du plan, fichiers autorisés, tests attendus, commande d'acceptation).
- **Chaque lot est ensuite vérifié par un autre sous-agent Luna**, à contexte neuf, en lecture seule : conformité au plan et aux arbitrages, bugs réels, règle relue sur la page du PDF. Corrections par un sous-agent codeur, puis nouvelle vérification jusqu'à ce qu'il ne reste rien.
- **Tu fais la vérification finale** de chaque tranche (lecture du diff complet, suite de tests, cohérence entre lots) avant de la déclarer livrée.
- **Claude contre-vérifie ensuite** chaque tranche livrée, puis intègre et publie. Ne fusionne rien dans `codex/divin-v5` ni `main`.

## Démarche

1. **Revérifier le repérage** (un commit, avant tout code). Le repérage date du 25/10 midi ; depuis, la 3.26.0 a branché les Traits de créature et le **surnombre en mêlée** (B12), qui couvre peut-être une partie de la famille « Mêlée » de F2-B. Pour chaque règle de `F2_LOTS.json`, confirmer contre le code actuel : déjà faite, partielle, absente. Une règle déjà faite sort du lot avec sa preuve. Compléter `PLAN_F2_LOTS.md` par lot avec les **fichiers autorisés**, les **cas de test précis** et la **commande d'acceptation** (format des plans précédents), dans une section « Exécution » ajoutée en fin de fichier, sans modifier le reste.
2. **Tranches**, dans l'ordre du plan. **Arrête-toi à la fin de chaque tranche** (commit, rapport partiel) et attends le feu vert du MJ après la contre-vérification de Claude :
   - T1 : F2-C Compétences d'arme, F2-A Initiative et surprise, F2-B Modificateurs et actions.
   - T2 : F2-D Qualités et défauts d'armes, F2-E Maladresses et incidents de poudre, F2-N Empoignade, F2-I Critiques et mort en combat.
   - T3 : F2-L Destin et Chance, F2-G Localisations des créatures, F2-M Combat monté, F2-K Corruption et mutations (K1 moteur, puis K2 tables).
   - T4 : F2-F Armes et objets des suppléments, F2-H Créatures du bestiaire, F2-J Séquelles et soins hors combat (J1, J2).
3. **Par lot** : tests d'abord (ils échouent pour la bonne raison), code, acceptation, suite complète `node --test --test-concurrency=4`, commit `<type>(<domaine>): <résumé> (F2-x, GPT)`. Code partagé à risque (`resolution.js`, `store.js`, `turn-order.js`, `v5-turn.js`, `v5-store-action.js`) : tests de caractérisation commités à part avant le changement.
4. **Conceptions préalables**, commitées et soumises en fin de tranche précédente, avant d'en coder la moindre ligne :
   - F2-J : `docs/plans-gpt/f2/CONCEPTION_SEQUELLES.md`. **Module neuf** (décision du MJ), indépendant de l'horloge de magie (`v5-game-time.js`, `v5-campaign-time.js` intacts) : modèle de données, calendrier de convalescence, interface du MJ, lien avec les séquelles posées par F2-I.
   - F2-K2 : format des tables de mutations (39 lignes L06, 134 lignes L17 **converties en V5**, table étendue L23). Saisie par sous-agents, résumés dans tes mots (pas plus d'une douzaine de mots recopiés par entrée), chaque ligne contrôlée sur la page du PDF.
5. **Fin de phase** : recette complète `node tools/run-divine-recipe.mjs` verte, parcours navigateur des écrans touchés, rapport complet.

## Points d'attention connus

- F2-A : PNJ = d10 tiré par l'outil + Bonus d'Initiative ; PJ = jet saisi par le MJ + Bonus d'Initiative (note du MJ). Case « côté surpris » à l'ouverture du combat.
- F2-C : **garder l'existant** pour le choix de la compétence d'attaque (`suggestSkill`, `js/core/fiche-sync.js`), compléter seulement.
- F2-D : Rechargement compté **en succès, pas en Actions** (note du MJ).
- F2-I : rester en V5 (second critique sur dégâts excédentaires, coagulation au d10).
- F2-K : seuil de Corruption **calculé par l'outil** (BE + BFM, doublé par Âme pure).
- F2-F : Mitrailleuse Ratling et Lance-feu gardent les valeurs du catalogue ; seule leur contamination est à coder (dépend de F2-K).
- Retirés du plan, à ne pas réintroduire : Taille V4 de l'Ogre (F-L01-0054, 0057, 0058), bouclier variante (F-L13-0082), blessures V4 de L13.

Hors de F2 : toute règle absente de `F2_LOTS.json`, les blocs fermés par le MJ (navires, voyage, maladies, économie…), tout changement de version, toute publication.
