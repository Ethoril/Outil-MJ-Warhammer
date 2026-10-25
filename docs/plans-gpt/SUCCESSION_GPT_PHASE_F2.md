# Succession GPT - Phase F2

## Instruction courante du MJ — reprise après Claude

Le rapport ignoré `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md` a invalidé le verdict de livraison C ci-dessous. Historique conservé, **ne pas le prendre pour une validation actuelle**. Les décisions MJ sont recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md` (`bbe726b`) et les caractérisations Store précédant les corrections sont commitées `5e60fdd`. Corriger selon `BRIEF_F2_C_CORRECTIONS_CLAUDE.md`, revérifier avec une Luna indépendante, puis A et B selon leurs briefs, et arrêter à la fin de T1. L'exclusion des armes conjurées est refusée par MJ et doit disparaître du code, sauf score imposé par le sort. Ne pas demander une approbation intermédiaire déjà fournie par cette instruction directe. La contre-vérification Claude de T1 reste requise avant T2; aucune publication.

## Reprise obligatoire

- Travailler dans `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, jamais dans main. Base `d737c5a` (3.26.0). Le checkout était neuf et propre au début ; aucun héritage sale.
- Main a avancé extérieurement à `8ed9099` pendant la session : seules deux recettes navigateur (`tests/browser-index.mjs`, `tests/browser-workspace.mjs`) diffèrent de la base. Aucune intégration de ces changements ici ; ne pas supposer que les résultats F2 valident ces deux scripts plus récents. Vérifier à la reprise, ne pas fusionner automatiquement.
- Lire `BRIEF_GPT_PHASE_F2.md`, règles communes, arbitrages F1, plan section Exécution, rapport et choix F2. Le JSON de référence et les arbitrages restent intacts ; seul l'appendice Exécution du plan est modifiable.
- T1 = C puis A puis B. Arrêt obligatoire à la fin de T1 après commits/rapport, attente contre-vérification Claude et feu vert MJ. Ni T2 ni fusion/publication/version.
- Chaque lot est codé par un Luna puis relu par un autre Luna à contexte neuf et lecture seule. Principal : revue intégrale du diff et validation finale. Les cinq moteurs partagés à risque exigent caractérisation committée avant changement.

## État documentaire et commits

- `7c576e2` : audit actuel des 194 règles (45 + 69 + 80, sans doublons/omissions), appendice Exécution, rapport, choix, brief C. Le plan initial est conservé intégralement.
- `e6517a5` : caractérisation C avant code, 2/2 verts sur moteur intact.
- `f4da4a9` : uniquement faits d'entraînement explicites ajoutés à la fixture de caractérisation nouvelle ; attentes inchangées, fixture corrigée vérifiée aussi sur main intact, 2/2.
- `652bb7f` : périmètre de l'adaptateur de qualités autorisé avant édition ; brief A préparé, pas exécuté.
- `1faafd6` : raccord `workspace-view.v5Input` autorisé avant édition.
- `1034dc9` : code C pour contrats de fiche / faits MJ, tests et runners navigateur. Les caractérisations restent dans leurs commits séparés.

## État de fin de session

Code C committé `1034dc9`, relu et testé dans son périmètre de contrats de fiche et faits MJ. **A/B non commencés ; T1 non livrée.** L'arrêt de session suit la clause de volume des règles communes, après commit et rapport partiel. Aucun feu vert T2 revendiqué.

Les défauts confirmés de la relecture C ont été corrigés et rejoués : famille ET spécialité, données nulles, Ingénierie mêlée/tir, Hast avec apostrophes, spécialisations avancées personnalisées, Escrime/Base zéro, défauts bâtarde sans maîtrise, Cavalerie confirmée à pied et Deux mains facultatif, fusion des qualités avant filtrage/préambule/talents, profil improvisé issu du catalogue et raccord du vrai constructeur UI. Ne pas reprendre ces corrections comme tâches encore ouvertes sans nouveau repro.

**Réserve précise de portée : attaques matérialisées des sorts.** Le chemin existant est conservé ; son générateur ne contrôle pas les augmentations et le nouveau traitement C ne s'y applique pas. La règle générale des compétences avancées sans augmentation n'est donc pas certifiée sur ce chemin. C-MATERIALISEES-01 est un choix de périmètre de l'exécutant, pas un arbitrage explicite du MJ : le lire avant de qualifier C d'exhaustif ou de fermer T1. Une extension nécessite un brief précis, les métadonnées du vrai générateur, les règles des sorts (certains imposent leur score), des tests rouges puis code/relecture Luna. Ne pas masquer la réserve par un reçu narratif ni modifier les sorts sans ce cadrage préalable.

Actions manuelles historiques sans contrat ni faits d'entraînement : restent assistées MJ selon C-MANUEL-01. Les données de fiche absentes et les faits explicites zéro sont contrôlés. Les armes conjurées ne sont pas présentées comme déjà contrôlées par cette disposition.

## Environnement et preuves

- `npm ci` fait, aucun changement package/lock/version. TEMP/TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime` : extérieur au checkout, sur E:.
- Référence avant code : 4 678/4 678 verts (`tmp/gpt-phase-f2/baseline-ready-tests.log`).
- Validation finale principale sur code figé : **4 707/4 707**, zéro échec/ignoré, `tmp/gpt-phase-f2/principal-final-tests.log` (122 123 ms). Acceptation ciblée : **218/218**, `tmp/gpt-phase-f2/targeted-final.log`.
- Principal : deux runners navigateur verts, `tests/f2-c-ui.browser.mjs` et `tests/f2-c-workspace.browser.mjs` ; journaux `principal-ui.log` et `principal-workspace.log` dans `tmp/gpt-phase-f2/`. Le second utilise le vrai workspace, constructeur d'entrée et aperçu moteur ; le premier isole le formulaire.
- Relecture Luna indépendante favorable sur périmètre contrôlé, sources relues ; preuve Store séparée d'une vraie fiche importée puis lance improvisée à pied appliquée, cible 20 → 12 PV. La réserve matérialisée ci-dessus demeure explicite.
- Le test E0 exige un reçu préexistant : copie authentique du reçu F0, SHA-256 détaillé au rapport. Cette copie ne prouve **aucune recette F2**. Recette F2 non exécutée à ce stade.
- Pas de nouveau JS/JSON sous `js/` en T1 : `tests/sw.test.js` impose le précache et `sw.js` est interdit. Fonctions pures dans modules existants autorisés. Contrainte des tranches suivantes documentée dans le plan.
- Python PDF : `C:/Users/arnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`, pypdf disponible ; `pdftoppm` disponible. Sources T1 ciblées extraites dans `tmp/gpt-phase-f2/sources/`. L06 p.166, p.300 et p.131 rendues et vues par principal ; les pages C relues par le vérificateur depuis les vrais PDF.
- Conflit L06 p.300 « Improved » / p.166 « Improvised » : p.166 confirme le plan. Voir choix. Écarts tableaux/États À Terre et Surpris de B consignés, B non codé.

## Prochaines actions

Vérifier branche, HEAD, statut et rapport à la reprise. Lire d'abord la réserve C-MATERIALISEES-01 : décider explicitement de sa portée avant de certifier C complet. La suite T1 autorisée reste A selon `BRIEF_F2_A_EXECUTION.md`, puis B ; ne pas commencer T2 ni déclarer T1 livrée. Aucun nouveau plan général à créer. Pour A, nouvelle caractérisation séparée des moteurs partagés avant code, nouveau codeur Luna et autre vérificateur Luna à contexte neuf.
