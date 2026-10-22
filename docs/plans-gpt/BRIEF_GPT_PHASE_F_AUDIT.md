# Brief GPT — Phase F0 : audit des règles du corpus (sans implantation)

Lis d'abord `docs/plans-gpt/REGLES_COMMUNES_GPT.md` (préparation du worktree, LF, garde-fous), `docs/ARBITRAGES_MJ_21_10.md`, `docs/DECISIONS_MJ_CHOIX_EXECUTANTS_22_10.md` et la section « Phase F » de `docs/PLAN_FIN_DE_PROJET.md`. Worktree dédié depuis `main`, branche `gpt/phase-f`. Commits terminés par « (GPT) ». **Aucun fichier de `js/` ni de `tests/` existant n'est modifié** : cette phase ne produit que des données et des documents (et, si utile, des outils d'extraction sous `tools/audit/` avec leurs tests sous `tests/audit-*.test.js`).

## But

Recenser **règle par règle** les mécaniques de jeu des 26 livres du corpus (`docs/divin/DIVIN_CORPUS_LIVRES.json` L01-L17, `DIVIN_CORPUS_LIVRES_COMPLEMENT.json` L18-L26 ; livres ignorés : voir les règles communes) et dire pour chacune si l'outil la couvre, pour que le MJ choisisse ensuite en sélecteurs : implanter / ne pas implanter, version complète / adaptée.

## Périmètre

- Une **règle** = une mécanique jouable à la table avec un effet déterminé (test, modificateur, état, dégâts, ressource, durée, table, procédure, option de règle). Pas le texte d'ambiance, pas les PNJ et scénarios, pas les listes d'équipement sans mécanique propre.
- **Déjà inventorié** : Courroux (`docs/divin/COURROUX_INVENTAIRE.json`), Brisé/Peur/Terreur (`docs/COURAGE_BRISE_INVENTAIRE.json`), traditions et sorts (`docs/lot3/LOT4_TRADITIONS_*.json`), bestiaires et Traits de créature (`docs/BESTIAIRE_INVENTAIRE.json`, phase E en cours), prières et miracles (`docs/divin/`). Ne refais pas ces domaines : référence leurs entrées (`coveredBy: "<fichier>#<id>"`) quand une règle en relève, et ne recense que ce qui y manque.
- Domaines attendus en priorité : combat (manœuvres, attaques spéciales, armes et qualités, armures, montures, véhicules, combat naval), Blessures critiques et soins, maladies et poisons, compétences et leurs tests particuliers, talents (effets mécaniques), carrières (mécaniques seulement), corruption et mutations, Destin/Résilience/Chance, voyage et environnement (froid, chute, noyade, faim…), entre-aventures (Endeavours), magie générale hors sorts (incantation, Fléau, Vents, objets magiques), argent et statut seulement si une mécanique en dépend.

## Méthode

1. **Extraction** : `pdftotext -layout` page par page (outil de ton choix, sous `tools/audit/`), sortie sous `tmp/audit/` (non commitée). Ne lis jamais un livre entier dans ton contexte : travaille par chapitre, par recherche ciblée.
2. **Un commit par livre** (ou par gros chapitre du livre de base L06), dans cet ordre : L06, L05 (FR, noms seulement : rattache les noms français aux entrées de L06), L17, L11, L13, L14, L16, L18-L26, puis les autres.
3. **Couverture** : pour chaque règle, cherche dans le dépôt (`js/core`, `js/data`, contrats) si elle est implantée. Statut : `automatise` (le moteur l'applique), `assiste` (l'outil propose, le MJ confirme), `rappel` (texte affiché seulement), `absent`, `hors-granularite` (exclue par un arbitrage, ex. Q18 : moral de masse, rançonnement…). Cite le fichier ou la fonction qui fait foi ; en cas de doute, `absent` avec une note.
4. **Conversion V4 → V5** des règles venant de suppléments V4 : proposer la version V5 (±10 → ±1 DR, Avantage → Élan…) dans le champ `v5Proposal`, jamais l'implanter.

## Livrables

- `docs/AUDIT_REGLES.json` : tableau d'entrées `{ id: "F-L06-0001", book, page, chapter, title, titleFr, summary (≤ 300 caractères, en français, sans citation longue), mechanic (test|modifier|state|damage|resource|duration|table|procedure|option), status, coveredBy, toolRef, v5Proposal, notes }`.
- `docs/AUDIT_REGLES.md` : synthèse par livre et par domaine (comptes par statut), puis la liste des `absent` et `rappel` regroupés par domaine.
- `docs/plans-gpt/SELECTEURS_PHASE_F.json` : une entrée par règle `absent` ou `rappel` jugée jouable, **au format de la page de sélecteurs** (`docs/plans-gpt/GABARIT_PAGE_SELECTEURS.html`, voir `docs/plans-gpt/CHOIX_EXECUTANTS_22_10.json` pour le modèle) : `{ id, phase: "<domaine>", lot: "<livre>", source: "Lxx p.N", question: "Implanter « <règle> » ? (résumé en mots de joueur)", choix: "Implanter, version complète", alternatives: ["Implanter, version adaptée (préciser)", "Ne pas implanter"], statut: "ouvert" }`. Questions en mots de joueur, sans identifiant de code.
- `docs/plans-gpt/RAPPORT_GPT_PHASE_F.md` : livres faits (hash), décomptes, difficultés de lecture (tableaux désalignés, pages illisibles), choix d'interprétation.

## Garde-fous propres à F0

- **Ne rien implanter**, même une règle évidente. Ne modifier aucun arbitrage.
- Pas de citation longue des livres (droits d'auteur) : résumés courts, en français, avec la page.
- Si un tableau ou une page est illisible en texte, le signaler (`notes: "vérification visuelle requise"`), ne pas deviner.
- Suite complète verte avant chaque commit (seul échec toléré dans un worktree neuf : « E0 indépendant — la recette refuse un cwd externe »).
