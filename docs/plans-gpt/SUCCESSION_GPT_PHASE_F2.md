# Succession GPT — Phase F2

## ARRÊT demandé par le MJ — 25/10/2026, 22 h 42

Instruction la plus récente : « tu consommes trop, arrête le chantier maintenant en documentant où tu en es et ce qui manque ». **Chantier arrêté; aucune reprise automatique.** Les agents `code_b` et `a_browser` ont été interrompus, `review_b` était terminé. Aucun nouveau test ni correction après cet arrêt; seules les présentes notes sont mises à jour. L'ancien objectif de finir T1 est suspendu par cette instruction. **T1 NON TERMINÉE, B NON LIVRÉ, T2 NON COMMENCÉ.**

### Livré et commité

- C corrigé : `734a3e2`, décisions MJ recopiées en tête de `CHOIX_EXECUTANT_PHASE_F2.md`, revue Luna indépendante; principal **4 723/4 723** et trois parcours navigateur. Limites précises dans le rapport (défenses/parades C non filtrées; Baliste/Catapulte encore contraintes par qualités héritées). Ne pas réutiliser la première livraison C invalidée.
- A : `f135c65`, caractérisations séparées `b25d1ac`; principal après dernier gel **4 757/4 757**, zéro échec/ignoré, `tmp/gpt-phase-f2/a-principal-verified.log`. Navigateur final vert `a-browser-verified.log`, revue indépendante `REVUE_A_LUNA.md`. Combat instinctif, provenance legacy, I historique, égalités, scènes/restart, ordre et Surprise sont inclus. Rapport/succession A : `9c2ba6e`.
- B : **seules les caractérisations sont livrées**, `efcb63e`, principal **6/6** dans `b-principal-characterization.log`. Aucun test de caractérisation ni test hérité modifié. Choix d'exécutant B-VISIBILITE-01 commité `6a2c4c1` (HEAD à l'arrêt) : une seule pénalité météo/lumière, la plus sévère; ce n'est pas une décision MJ. Docs de suivi `af7ad8a`.

### B conservé en cours, NON COMMITÉ et NON GELÉ

Les modifications restent en place, ne pas les effacer/reset/stash. Fichiers suivis modifiés : `docs/VARIABLES_PERSISTANTES_PJ.md`, la présente succession, `js/core/resolution.js`, `store.js`, `v5-combat-rules.js`, `v5-roll.js`, `v5-store-action.js`, `v5-talent-combat.js`, `v5-turn.js`, `js/main.js`, `js/ui/resolution-panel.js`, `workspace-view.js`. Trois fichiers non suivis à conserver : `tests/f2-b-combat-actions.test.js`, `tests/f2-b-combat-modifiers.test.js`, `tests/f2-b-combat-actions.browser.mjs`. Aucun commit de production B. Les notes/repros/journaux sous `tmp/gpt-phase-f2/` sont ignorés par Git et doivent être préservés sur disque.

Raccords présents mais sans acceptation finale : facteurs p.166, paliers DR français, Visée/Défensive avec créneau spécial (sans plafond universel ajouté aux Actions legacy), mouvement déclaré, seconde arme/coût/quota, tir engagé et redirection, cible sans défense et option létale OFF par défaut avec confirmation, dispersion, Croche-pied/opposition/chute et jets/critiques, précision extraordinaire. La présence du code et des tests ne certifie pas toutes leurs clauses. Le registre PJ ajoute le champ de mort canonique `extensions.v5.dead` avec HP0.

Preuves partielles : `b-targeted-current.log` affiche **31/31**, mais ce journal ne certifie pas le dernier état interrompu ni la totalité des 16 règles. Des tests ont encore été ajoutés/modifiés ensuite; **aucune suite complète B ni intégration finale C/A/B exécutée**. Les premiers journaux rouges `f2-b-*-red.log` comprennent des erreurs de construction de fixtures/attendus; ne pas les présenter comme rouge préalable de chaque règle. Le codeur a été invité à distinguer précisément les cas ajoutés avant/après implémentation.

Navigateur B partiel : `a-browser-initial.log` à `a-browser-sixth.log`; passages rapportés verts sur Visée/arme tenue/mouvement, Défensive et expiration via Tour suivant visible, tir avec météo/portée et PV réels, létalité OFF puis confirmation/HP0/dead et Undo/reload. Le dernier message du runner reste générique; **ne pas en déduire que les parcours restants sont tous couverts**. Redo utilise le clic DOM d'un bouton masqué : ce n'est pas une interaction visible. Aucun verdict navigateur complet de B.

### Revue indépendante et points encore à fermer

`review_b` a relu visuellement les pages sources et préparé `B-REVIEW-PREP.md`. Sa prérevue a reproduit quatre défauts :

1. Visée survivait à une défense appliquée par son propriétaire : corrigé et revérifié (`repro-aim-defense.mjs`).
2. Défensive disparaissait pendant le Tour adverse : corrigé et revérifié, expiration au prochain début de Tour propriétaire (`repro-defensive-next-turn.mjs`).
3. Attaque Rapide Myrmidia légitime bloquée après Défensive : corrigé et revérifié sur ce cas (`repro-myrmidia-after-defensive.mjs`). **Vérifier encore la généralité des exemptions légitimes**, sans laisser `extraAttack:true` contourner les gardes à lui seul.
4. Tireur d'élite ne supprimait plus le malus synthétique couvert/À Terre (`repro-sharpshooter-cover.mjs`). **Dernier verdict indépendant : défaut encore reproductible.** Le code courant transmet depuis les règles de Talents au helper situationnel et un nouveau test existe, mais cette dernière correction n'a pas été revérifiée indépendamment. Ne pas déclarer ce point fermé sur la seule lecture du diff.

Restent nécessaires avant toute livraison B, seulement si le MJ autorise une reprise :

- Auditer les **16 IDs B** du JSON contre le code et de vraies acceptations; matrice complète demandée au codeur mais non livrée. Distinguer données MJ requises, aide de portée/déviation et mutation mécanique.
- Finaliser/revoir Croche-pied : vraie touche d'arme portant Trip après filtrage C; dépense et opposition atomiques; défaite de l'attaquant sans chute/À Terre; monté/démontage, E30/E20/BE≥6, Armure ignorée, protections existantes. Les tests courants couvrent notamment E20 bloqué sans jet puis réussite Endurance. **Échec Endurance, Échec éclatant, critiques Jambe/supplémentaire, leurs dés requis et applications/reçus restent à contrôler complètement**, avec Undo/reload.
- Vérifier tir engagé sur application Store et vraie cible blessée, aléa capturé une fois, cas sans redirection et données manquantes; seconde arme après raté, autre arme réelle, coût/quota/exemptions; sources d'États expirées/alias; non-double pénalités typed anciennes/nouvelles et Talents.
- Finaliser la preuve UI de toutes les clauses restantes : Engagé, seconde arme, Croche-pied/chute, déviation, précision extraordinaire, aides d'allonge/portée. Pas d'aperçu bloqué qualifié de réussite.
- Nouvelle revue indépendante complète après **gel réel**, corrections puis revérification; lecture du diff intégral par principal; acceptation dédiée du brief + nouveaux tests; **suite complète principale** avec TEMP/TMP runtime F2 hors checkout, puis parcours B et régressions A/C.
- Garde des fichiers protégés/plan original/LF/absence de nouveau module runtime/diff-check à refaire sur l'état final. Ne pas modifier les tests hérités ni les caractérisations pour rendre vert.
- Seulement ensuite : commit production B, rapport final T1 avec hashes/preuves/limites, arrêt fin T1 et attente Claude/MJ. La recette complète de phase reste non exécutée en F2, requise en fin de phase, pas prouvée par le reçu F0 de précondition.

Propriété au moment de l'interruption : `code_b` possédait moteurs/Store/tests Node, `a_browser` main/résolution-panel/workspace-view/runner B, `review_b` lecture seule. Pour une reprise, relire le brief B jusqu'au bout, l'état Git et cette section; ne pas simplement relancer les agents ou leur ancienne instruction GO.

## Instruction courante et frontière

Le MJ demande : corriger C selon `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md` et ses décisions, les recopier comme décisions MJ, revérifier avec Luna, puis A et B et arrêt fin T1. Les décisions sont recopiées dans `CHOIX_EXECUTANT_PHASE_F2.md`; l'exclusion des armes conjurées est refusée. L'instruction directe autorise A/B après la nouvelle revue Luna; aucune nouvelle approbation intermédiaire n'est requise. **Ne pas commencer T2**, ni fusionner/publier/versionner.

Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, base `d737c5a` (3.26.0). Main avait avancé extérieurement à `8ed9099` (deux recettes navigateur); aucun rebase/merge/cherry-pick ici. Vérifier état avant reprise, ne pas intégrer main automatiquement. Lire brief général, règles communes, arbitrages F1, appendice Exécution du plan, rapport/choix et briefs de lot. JSON/arbitrages/catalogue/version restent intacts.

## État actuel

- C initial `1034dc9`/rapport `e985233` a été invalidé par Claude. Ne pas reprendre ses anciennes déclarations comme validation actuelle.
- Décisions MJ et cadrage correction : `bbe726b`; caractérisations Store avant production : `5e60fdd`, conservées intactes.
- **C corrigé : `734a3e2`**, nouvelle revue indépendante Luna sans bloquant vérifié après gel 3. Toutes les corrections du rapport sont raccordées; détails et limites au rapport actuel. Canon réellement appliqué en navigateur; Baliste maîtrise seulement, application encore bloquée par une qualité héritée.
- Principal sur C final : **4 723/4 723**, `tmp/gpt-phase-f2/c-claude-principal-verified.log`; trois runners navigateur verts `f2-c-ui.browser.mjs`, `f2-c-workspace.browser.mjs`, `f2-c-state.browser.mjs`, journaux `c-claude-principal-verified-*.log`. Revue Luna : `REVUE_C_CORRECTIONS_LUNA.md` ignoré dans tmp.
- Deux assertions du fichier de tests F2-C reflètent désormais les corrections demandées (Base entraînée disponible et monté absent=démonté); tous les tests de caractérisation pré-code et tous les tests antérieurs à F2 sont intacts. Ne pas corriger un test en supprimant une règle.
- **A livré `f135c65`**, caractérisations pré-code `b25d1ac` intactes. Revue indépendante Luna terminée : `tmp/gpt-phase-f2/REVUE_A_LUNA.md`. Principal après gel final : **4 757/4 757**, `a-principal-verified.log`, et navigateur `a-browser-verified.log` sortie0. Les passes précédentes ne prouvent pas les derniers raccords Combat instinctif. Aucun test hérité modifié. Lire le rapport pour les limites DOM/inversion et le brief jusqu'au bout pour les choix A.
- **B : production en cours**, Luna `code_b` a reçu GO après caractérisations séparées `efcb63e`, principal **6/6** (`b-principal-characterization.log`). Ces tests restent intacts. Brief `BRIEF_F2_B_EXECUTION.md` et préparation personnelle `tmp/gpt-phase-f2/PREPARATION_B_IMPLEMENTATION_LUNA.md` prêts; les errata du Croche-pied priment. Pas de suite complète parallèle. `review_b`, autre Luna à contexte neuf, a relu les sources et préparé `B-REVIEW-PREP.md`; attend GO après gel. `a_browser` a préparé `PREPARATION_B_BROWSER.md`; propriétaire futur exclusif de `tests/f2-b-combat-actions.browser.mjs`, aucun runner créé avant GO. Après gel : revue indépendante, navigateur réel et suite principale, corrections jusqu'au verdict, commit/rapport puis arrêt fin T1.

Coordination B courante : après confirmation de fichiers intacts par `code_b`, GO donné à `a_browser` pour coder exclusivement `js/ui/resolution-panel.js`, `js/ui/workspace-view.js`, `js/main.js` si nécessaire, et le futur runner B. `code_b` garde les moteurs/Store et tous les tests Node, n'édite pas ces fichiers UI. Ils se transmettent directement les API/faits. Le principal relit et valide tout, `review_b` reste indépendant et attend le gel. B-VISIBILITE-01 (`6a2c4c1`) retient une seule pénalité, la plus sévère, sur la ligne graduée météo/lumière; choix d'exécutant à relire, pas décision MJ.

## Conditions A/B à conserver

Chaque lot est codé par Luna puis vérifié par une autre Luna à contexte neuf (lecture seule, vrai PDF); principal lit diff et valide suite complète avant livraison. Caractérisations séparées avant modifications de Store/résolution/Tour. Aucun nouveau JS/JSON sous js : précache exigerait sw.js interdit.

A : d10 PNJ capturé une fois; PJ saisi, BI ajouté une fois, I historique séparée du score de combat. Égalité score puis I; opposition réelle et choix du gagnant. Trois ex aequo ou plus : tournoi éliminatoire explicite n−1 oppositions, ordre déclaré avant jets, gagnant final choisit la permutation (choix d'exécutant A-EGALITES-01, pas décision MJ). Vraies routes main : bouton start direct, advanceTurn au Round 0/raccourcis, deux callbacks rencontre, recommencer. Reprendre ne relance rien. Commande finale unique annulable et garde de révision. Renfort sans jet : insertion existante, jamais comparer I40 à score4–15; manuel/invocations/tours déjà passés préservés. Vrai navigateur index/main, pas uniquement montage avec callbacks de test.

B : décisions MJ Surpris +2 mêlée/+1 tir et À Terre attaquant = Désavantage ET −1 DR. Malus C additifs. Viser et Défensive consomment réellement l'Action et expirent/invalident dans les vrais flux; rangement initiative n'est pas mouvement spatial, déclaration MJ de mouvement requise. Deuxième arme après attaque même ratée, autre arme une main, coût/quota atomique et Talents conservés. Tir en mêlée : aléa seulement si inversion force l'échec d'une touche potentielle, candidats MJ incluent cible initiale/alliés, vraie conséquence sur cible retenue. Sans défense : résultat critique choisi permis, mort confirmée et option létale par défaut désactivée. Croche-pied : choix d'exécutant 2 Avantages V4→1 Élan, opposition F/Athlétisme après touche; monté lu sur donnée C, démontage/chute2yards puis À Terre. L06p169 : perte max(0,6−BE), Armure ignorée; si perte>BE, Endurance et critiques éventuelles par moteur existant, aucun dé manquant deviné. Ne pas substituer un rappel à la mutation ni inventer un moteur général hors périmètre.

## Environnement et preuves

`npm ci` déjà fait, Node24.22.1. TEMP/TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime`, extérieur checkout sur E. `tmp/divin/recipe-receipt.json` copie authentique du reçu F0 pour précondition E0 uniquement (SHA-256 `d9f7e2e4430fc6eef4dce5287b16b03c0b46b9bd674caf53def16faeeabfcfa9`), aucune recette F2 prouvée par cette copie. La recette complète est requise en fin de phase; la suite Node/browser ne la remplace pas.

PDF hors dépôt via `docs/divin/DIVIN_CORPUS_LIVRES.json`. Python pypdf : `C:/Users/arnot/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`; `pdftoppm` disponible. L06 `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v2.pdf`; L13 Up in arms.pdf, L07 Lustria EN.pdf dans le même dossier. Ne pas conclure PDF indisponible parce qu'il n'est pas dans Git. Lire les vraies pages et regarder les tableaux ambigus.

Contrôle frontières réutilisable ignoré : `node tmp/gpt-phase-f2/check-boundaries.mjs` (plan original identique, onze fichiers protégés, LF, pas de nouveau module runtime, diff-check). Git writes nécessitent l'escalade sandbox, autorisée pour les commits locaux; pas de stash/reset destructif. Conserver les changements hérités et ne jamais copier les tests dans tmp.
