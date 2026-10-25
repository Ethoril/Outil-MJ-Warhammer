# Rapport GPT - Phase F2

Date : 25/10/2026. Worktree : `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, base `d737c5acc47e012039eb3bbf669c8a4df1c34eff` (main, version 3.26.0).

Au dernier contrôle, main a avancé extérieurement à `8ed9099` ; par rapport à la base F2, seuls `tests/browser-index.mjs` et `tests/browser-workspace.mjs` diffèrent. Ces changements n'ont pas été intégrés ici et ne sont pas revendiqués dans les résultats F2. Le code de production de base reste le même ; aucune fusion/rebase de ce worktree n'a été faite.

## Périmètre et état

**Reprise du 25/10 après contre-vérification Claude : C n'est pas livrable dans l'état `1034dc9`.** Le rapport `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_F2-C.md` invalide le verdict favorable précédent : six régressions bloquantes et décisions MJ nouvelles, dont l'extension aux armes conjurées. Les résultats historiques ci-dessous prouvent seulement les vérifications alors effectuées. Correction en cours selon `BRIEF_F2_C_CORRECTIONS_CLAUDE.md`, décisions MJ recopiées et commitées `bbe726b`; caractérisations Store avant correction `5e60fdd`. Nouvelle revue Luna requise avant A puis B. La demande directe du MJ autorise cet enchaînement et impose l'arrêt à la fin de T1.

Le brief F2 autorise les commits locaux et impose un arrêt à la fin de chaque tranche. La tranche autorisée en premier est T1 : C, A, B. Aucune fusion ni publication n'est autorisée. Les 194 règles du JSON restent la liste de référence ; le complément d'exécution du plan décrit les clauses déjà couvertes et les clauses restantes sans changer les décisions du MJ.

| Étape / lot | État | Preuve |
|---|---|---|
| Préparation | FAIT | Worktree neuf depuis main ; aucun changement hérité ; réglages LF ; `npm ci` : 3 paquets, audit npm sans vulnérabilité signalée. |
| Repérage des 194 règles | FAIT, documentaire, `7c576e2` | Audits Luna séparés T1, T2 et T3 ; corrections après revue du principal et contrôle croisé Luna. 45 + 69 + 80 identifiants, sans omission ni doublon. Section Exécution ajoutée au plan sans changer son texte initial. |
| F2-C | CORRIGÉ ET REVÉRIFIÉ LOCALEMENT | `734a3e2`, remplace le verdict initial invalidé par Claude; décisions MJ appliquées, nouvelle revue Luna et validation principale. Limites exactes ci-dessous. |
| F2-A | FAIT `f135c65` | Initialisation et surprise, vrais parcours, revue Luna, 4 757/4 757 et navigateur verts. |
| F2-B | ARRÊT DEMANDÉ PAR LE MJ — NON LIVRÉ | Caractérisations `efcb63e` (6/6); code/tests/UI B conservés non commités, sans gel, revue complète ni suite globale finale. Voir succession, section arrêt du 25/10 à 22 h 42. |
| F2-D | EN ATTENTE T2 | Fin de T1, contre-vérification Claude et feu vert MJ requis avant T2. |
| F2-E | EN ATTENTE T2 | Après D ; aucun code commencé. |
| F2-N | EN ATTENTE T2 | Aucun code commencé. |
| F2-I | EN ATTENTE T2 | Aucun code commencé. |
| F2-L | EN ATTENTE T3 | Fin de T2 et feu vert ; aucun code commencé. |
| F2-G | EN ATTENTE T3 | Aucun code commencé. |
| F2-M | EN ATTENTE T3 | Aucun code commencé. |
| F2-K | EN ATTENTE T3 | K1 puis K2 ; conception du format K2 à soumettre en fin de T2. |
| F2-F | EN ATTENTE T4 | Fin de T3 et feu vert ; dépend notamment de D et K. |
| F2-H | EN ATTENTE T4 | Aucun code commencé. |
| F2-J | EN ATTENTE T4 | Conception des séquelles à soumettre en fin de T3 ; J1/J2 non commencés. |

## Correction C après Claude — état courant

Code `734a3e2`, caractérisations préalables `5e60fdd` intactes. Les sept décisions du MJ sont recopiées en tête du fichier de choix (`bbe726b`). Les six défauts bloquants Claude sont corrigés : delta CC/CT appliqué une seule fois; ancien lien de mauvaise spécialité résolu par voie licite/repli CC; Siège/Embarquée et alias accessibles aux compétences réelles; score manuel conservé puis effets appliqués; meilleures voies entraînées prises par défaut, y compris spécialité exacte présente à zéro; état monté durable et mains de bâtarde selon catalogue/checkbox. Les armes conjurées comprennent le générateur aethyrique et la Faux de Shyish; les anciennes instances récupèrent leurs données par lien vers la couche/contrat. Le score imposé des Poings de Gork reste prioritaire.

- Principal, code gelé final : `node --test --test-concurrency=4` **4 723/4 723**, zéro échec/ignoré, 107 862 ms; `tmp/gpt-phase-f2/c-claude-principal-verified.log`.
- Acceptation dédiée du codeur : **93/93**, `c-claude-targeted-legal-fallback.log`; remplacement final de la fixture Parade par la vraie compétence Bouclier du catalogue : régressions **14/14**, `c-claude-regressions-real-parade.log`.
- Principal : trois runners navigateur verts après dernier gel, journaux `c-claude-principal-verified-ui.log`, `c-claude-principal-verified-workspace.log`, `c-claude-principal-verified-state.log`. Vraie page index/main : monté/mains, édition concurrente préservée, Undo/Redo/reload, Canon Nain appliqué avec perte de PV puis annulation. Baliste : choix MJ générique et reçu de maîtrise contrôlés, sans application certifiée.
- Nouvelle Luna indépendante à contexte neuf : sources relues, contre-exemples du rapport et de la prérevue rejoués; suites ciblées finales **41/41**. Aucun bloquant vérifié après gel 3; `tmp/gpt-phase-f2/REVUE_C_CORRECTIONS_LUNA.md`.
- Revue du principal : diff de production lu, garde des onze fichiers protégés, texte initial du plan identique octet pour octet, LF, aucune création de module runtime et `git diff --check` verts (`tmp/gpt-phase-f2/check-boundaries.mjs`).

Les deux premières suites principales de correction ont passé 4 722/4 722, avant deux derniers contre-exemples (CC nulle au générateur, voie entraînée masquée par spécialité à zéro). Elles ne prouvent pas le code final. Les journaux distincts sont conservés; le reçu final est `c-claude-principal-verified.log`.

Assertions antérieures F2 modifiées : `tests/f2-c-weapon-skills.test.js` (1) Escrime zéro avec Base entraînée attend désormais le score réel de Base, conformément au défaut Claude n°5, en conservant retrait des Qualités et Défauts; (2) monté absent attend démonté et absence de question récurrente, conformément à la décision MJ. Le nom du premier test et le runner UI reflètent ces comportements. Aucun test de caractérisation pré-code ni test antérieur au chantier F2 n'a été modifié. Les tests nouveaux couvrent application Store, Undo/reload et les vraies générations de sorts; les premiers rouges utiles de la correction sont distingués des erreurs de fixture/import, jamais présentés comme preuve de chaque clause.

Limites actuelles : le contrôle C filtre les attaques, pas les défenses/parades (limite mineure permise à consigner par Claude). Une catégorie générique sans association source reste un choix de compétence MJ, pas un mapping canonique certifié. Baliste/Catapulte peuvent rester bloquées par `precise`/`percutante`, qualités V4 déjà non validées dans la base, hors C; aucun contournement ni moteur de qualité ajouté. Ingénierie personnalisée sans portée/provenance demande sa nature au MJ. Une conjurée dépourvue de toute provenance exploitable réclame les données MJ; elle n'est pas déclarée maîtrisée à partir de son nom. Recette complète de phase non exécutée; **T1 reste à terminer par A puis B**.

## Livraison A — état courant

Production `f135c65`, caractérisations préalables `b25d1ac` intactes. Initiative de combat distincte de l'I historique, d10 PNJ capturé une fois, saisie PJ, BI ajouté une fois; Combat instinctif conserve deux d10 et le choix explicite, préparation legacy reprise avec provenance puis consommée. I modifiée après préparation : nouvelle paire requise, champ historique restauré; I inconnue demandée au MJ. Les égalités utilisent le vrai pipeline de Tests V5, les effets d'État et de magie, puis le choix du vainqueur; tournoi n−1 pour 3+ selon A-EGALITES-01. Surprise par camp et service canonique. Lancement/restart préparés sans mutation puis une commande annulable; reprise/reload conservent les jets. Ordre automatique résolu conservé avec renforts, retour manuel→auto et Souffle froid.

- Principal après gel final : `node --test --test-concurrency=4`, **4 757/4 757**, zéro échec/ignoré, 140 174 ms; `tmp/gpt-phase-f2/a-principal-verified.log`.
- Acceptation dédiée codeur : **148/148**; revue indépendante Luna, sources PDF et repros ciblés : aucun défaut restant vérifié, `tmp/gpt-phase-f2/REVUE_A_LUNA.md`.
- Vrai index/main : `node tests/f2-a-initiative-surprise.browser.mjs`, sortie **0** après gel, `tmp/gpt-phase-f2/a-browser-verified.log`; bandeau/N, rencontre par deux routes, restart/reprise, égalités 2/3 et preuves, Undo/Redo/reload, retour automatique, PJ/PNJ Combat instinctif.
- Principal : diff complet de production relu, frontières/LF/diff-check verts; aucun test hérité ni caractérisation pré-code modifié. Les deux nouveaux fichiers sont les acceptations Node et le runner navigateur.

La première suite A a échoué sur un test hérité de reprise de scène (clés A false/null ajoutées à une scène ancienne); code corrigé sans modifier le test. La passe 4 755/4 755 précède les derniers raccords Combat instinctif et n'est pas la preuve finale. Le reçu courant est 4 757/4 757 ci-dessus. Limites précises : ancien `#btn-start` masqué testé par clic DOM sur son listener; démarrage visible testé par bandeau/N. Aucun exemple source concret d'Avantage au Test d'I trouvé pour éprouver de bout en bout la branche générique d'inversion; Fatigue et modificateur magique d'I réellement testés. Données d'initiative transitoires du combat, aucune nouvelle valeur durable de fiche PJ. **T1 reste ouverte jusqu'à B; T2 non commencé.**

## Validation historique de la première livraison (supersédée)

**État final du code `1034dc9` :**

- `node --test --test-concurrency=4` exécuté par le principal : **4 707/4 707**, zéro échec, zéro ignoré, 122 123 ms ; `tmp/gpt-phase-f2/principal-final-tests.log`.
- Acceptation ciblée F2 + fiches et régressions de combat : **218/218**, `tmp/gpt-phase-f2/targeted-final.log`. Les deux fichiers Node F2 comptent 29 tests, dont les deux caractérisations et un contrôle de correspondance documentaire ; ce dernier lit le JSON réel et n'est pas une preuve mécanique.
- `node tests/f2-c-ui.browser.mjs` exécuté par le principal : vert ; formulaire isolé, données manquantes, nature Ingénierie, score vide, nom ASCII, contrôle de protection. Journal : `tmp/gpt-phase-f2/principal-ui.log`.
- `node tests/f2-c-workspace.browser.mjs` exécuté par le principal : vert ; vrai workspace et Store, choix MJ sans skillId (Ingénierie tir, score et augmentations), constructeur `v5Input`, nature reçue par le moteur, retour à un Test générique sans ancien groupe parasite. Journal : `tmp/gpt-phase-f2/principal-workspace.log`.
- Vérificateur indépendant : sources ciblées relues et contre-exemples rejoués, verdict favorable ; vraie fiche importée puis Store aperçu/application d'une lance de cavalerie à pied/une main : profil improvisé, BF+1, Défauts conservés, application réussie et cible de 20 à 12 PV. Aucun fichier modifié par le vérificateur.
- `git diff --check`, fins de ligne LF et garde des fichiers protégés : verts. Texte initial du plan, JSON F2, arbitrages, catalogue et fichiers de version intacts.

La suite de référence `node --test --test-concurrency=4`, après préparation des préconditions, est verte : **4 678/4 678 tests**, zéro ignoré, 134 090 ms (`tmp/gpt-phase-f2/baseline-ready-tests.log`). Aucun code modifié au moment de cette référence.

Le premier essai avait 4 669 réussites sur 4 672 tests annoncés, avec trois échecs de préparation : import de dépendance avant la fin de `npm ci`, garde E2 dont le répertoire temporaire doit être extérieur au checkout, test E0 exigeant un reçu préexistant. Correction : dépendances installées, `TEMP`/`TMP` = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime` (extérieur sur E:), copie authentique du reçu F0 depuis `tmp/gpt-phase-f-worktree/tmp/divin/recipe-receipt.json`, SHA-256 source et copie `d9f7e2e4430fc6eef4dce5287b16b03c0b46b9bd674caf53def16faeeabfcfa9`. Cette copie est uniquement une précondition E0 ; **aucune recette F2 exécutée** à ce stade. Aucun test adapté pour résoudre ces échecs.

Assertions de tests existants modifiées : aucune.

Précision de la caractérisation nouvelle F2-C : `f4da4a9` ajoute uniquement `advances: 1` et `basic` aux deux entrées de compétences de la première fixture, sans changer les assertions ni les résultats attendus. La fixture initiale avait omis ce fait et représentait donc des données d'entraînement inconnues. Avant acceptation de cette correction, les deux mêmes tests avec ces seuls ajouts ont été exécutés en important le moteur **main intact** (`../../js/` depuis la racine du worktree F2) : 2/2 verts. Le cas des données réellement inconnues est couvert séparément par les nouveaux tests métier et doit bloquer avec reçu MJ.

La première trace TDD C (`tmp/gpt-phase-f2/f2-c-step2-red.log`) contient 4 tests, dont 3 rouges : l'un reproduit directement les Qualités conservées à tort ; les autres exposent les gardes de lien existantes à raccorder. Les tests des autres règles ont ensuite été ajoutés pendant la construction du lot. Ne pas présenter cette première trace comme la preuve d'un rouge préalable de chacune des 26 clauses.

Les contre-exemples de relecture ont donné lieu aux corrections et tests : gardes de tir/emplacements ouverts, voies manuelles historiques, familles de compétences homonymes, valeurs nulles, Ingénierie mêlée/tir, Hast avec apostrophe, spécialisations personnalisées, Escrime/Base à zéro, défauts de bâtarde non maîtrisée, compétence Cavalerie conservée à pied, qualités source filtrées avant préambule/talents, dégâts improvisés issus du catalogue et raccord du constructeur UI. Le premier passage global pendant la construction avait neuf échecs ; le journal `full-suite.log` a ensuite été remplacé par les passes corrigées et ne sert pas de reçu de cette passe ancienne. Les résultats finaux de référence sont ceux du principal indiqués ci-dessus.

## Portée de la première livraison (historique remplacé par la correction C ci-dessus)

- Les conséquences de maîtrise sont calculées dans le vrai flux d'équipement de fiche et pour les faits MJ explicitement renseignés. Les données nécessaires absentes bloquent avec reçu ; zéro augmentation et donnée absente sont distincts. Les anciennes actions manuelles sans contrat ni faits d'entraînement restent assistées par le MJ, sans maîtrise inventée (C-MANUEL-01).
- **Armes conjurées / attaques matérialisées des sorts : chemin existant conservé.** Le générateur reprend une compétence, un score MJ ou un score fixé par le sort ; il ne vérifie pas les augmentations. Le traitement nouveau de C n'y réapplique pas la garde générale des compétences avancées. C'est une limite réelle du périmètre d'exécution retenu, à relire avec le MJ, pas une preuve que la règle est déjà couverte sur ces attaques. Ni les sorts ni ce chemin ne sont certifiés exhaustifs par cette livraison. Voir C-MATERIALISEES-01 et la succession avant toute extension ; ne pas attribuer cette exclusion à un arbitrage explicite du MJ.
- `suggestSkill` et les aménagements de choix existants sont conservés ; pas de nouveau contrôle de carrière. F-L06-0847 est conservé selon l'arbitrage, pas réimplémenté.
- A et B ne sont pas commencés : **T1 n'est pas livrée**. L'arrêt de session se fait après le code C validé et ses commits, selon la clause de volume des règles communes. La portée matérialisée ci-dessus reste une réserve à lever si la clôture attendue de C doit l'inclure.
- Recette complète `node tools/run-divine-recipe.mjs` : **non exécutée en F2**. La suite Node et les deux parcours ciblés ne remplacent pas cette recette, requise en fin de phase. Aucun feu vert T2 ni contre-vérification Claude de T1 n'est revendiqué.

## Organisation et sources

Le repérage a été confié à trois sous-agents Luna. C a été codé par un Luna puis relu par un autre à contexte neuf, avec corrections renvoyées au codeur jusqu'au verdict favorable dans le périmètre contrôlé. La revue finale du diff et les dernières exécutions ont été faites par le principal. Même organisation à conserver pour les lots suivants.

Les pages PDF de T1 ont été extraites depuis les PDF du corpus dans `tmp/gpt-phase-f2/sources/` pour lecture ciblée. L'extraction seule ne vaut pas contrôle visuel d'un tableau. Les arbitrages du 25/10 priment sur les choix bruts du journal.

Contrôles du repérage : base du plan conservée octet pour octet ; les 194 identifiants du JSON apparaissent exactement une fois dans les tableaux ; `git diff --check` propre ; aucun fichier suivi en CRLF ; aucun changement de code ni des arbitrages ou du JSON de référence. Les pages sources seront relues pour le code puis lors de la vérification indépendante de chaque lot ; ce repérage ne certifie pas une nouvelle lecture exhaustive des PDF.
