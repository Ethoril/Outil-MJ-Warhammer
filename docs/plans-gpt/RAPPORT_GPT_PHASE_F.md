# Rapport GPT — Phase F0 (audit repris, en cours)

22 octobre 2026. Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f-worktree`, branche `gpt/phase-f`, base `main` à `ad092cd` (3.24.0). Aucun fichier de jeu ou test existant modifié. Aucune publication, aucun push ni fusion.

## Lots

| Lot | État | Commit / portée |
| --- | --- | --- |
| Plan | FAIT | `3149286` ; plan avant outillage |
| F00 | FAIT | `ae76525` ; extraction unitaire et vérification des données, nouveaux tests uniquement |
| F06-Tests | FAIT | `f4483bb` ; L06 p.129-133, 265-266 ; F-L06-0001 à 0046 |
| F06-Combat | FAIT | `65be80b` ; L06 p.161-169 ; F-L06-0047 à 0171 ; 125 règles supplémentaires |
| F06-Usages | FAIT, `f904938` | L06 p.134-159 ; F-L06-0172 à 0293 ; 122 entrées ; suite 4 050/4 050 (`tmp/audit/F06-usages-full.log`, 113,573 s) |
| F06-Santé/États/Corruption | FAIT, commit du présent lot | L06 p.170-189 ; F-L06-0294 à 0539 ; quatre tables critiques, séquelles, maladies, États, mutations ; suite 4 051/4 051 (`tmp/audit/F06-health-full.log`, 109,816 s) |
| F06-Entre-aventures | Audité, validation avant commit | L06 p.190-201 ; F-L06-0540 à 0626 ; 87 règles et événements mécaniques ; coûts XP vérifiés visuellement p.191 |
| Reste de L06 | À FAIRE | Compétences/talents, création/carrières, applications des compétences, blessures/soins, maladies/poisons, États hors inventaires existants, corruption, entre-aventures, magie générale, équipement, environnement et appendices à partir de p.364 |
| F05, F17, F11, F13, F14, F16, F18-F26, F01-F04, F07-F10, F12, F15 | À FAIRE | Tous les autres livres, dans l'ordre du plan ; aucun déclaré lu |

## Source lue

Reprise explicitement demandée par le MJ jusqu'au bout des 26 livres. Les paragraphes de l'arrêt précédent ci-dessous constituent l'état de départ, pas une nouvelle limite de cette reprise. L06 p.134-160 a été extrait page par page ; p.134-159 lu, p.160 illustration. Les tableaux p.137 ont été vérifiés visuellement. La neutralisation silencieuse possède un vrai formulaire, mais ses conséquences ne sont qu'un rappel ; les exemples de résultat purement narratifs ne créent pas de nouvelles règles.

L06 p.170-189 lu ; p.189 vérifiée visuellement car l'extraction désalignait les deux tables de mutations. Les lignes de critiques pp.173-176 sont rattachées individuellement aux données existantes après lecture source : application des Blessures/États immédiats séparée des séquelles affichées en rappel. Deux modificateurs de seuil résiduels (-10 aux Tests) de la table V5 sont signalés, avec proposition -1 DR, sans correction de la source ni implantation.

Les renvois purs vers des domaines déjà inventoriés peuvent porter `selectorEligible:false`, avec `selectorExclusionReason` obligatoire : ils restent au registre et dans les comptes, mais ne reposent pas au MJ une décision déjà portée par C0/E0/D0. Un nouveau test d'outillage a d'abord échoué sur cette exclusion, puis huit contrôles d'audit sont devenus verts. Aucun test hérité modifié.

L06 p.190-201 lu. Les événements régionaux et personnels à effet déterminé sont détaillés, les rencontres purement narratives restent hors inventaire. La table XP p.191 a été rendue et vérifiée malgré les substitutions de polices de Poppler. L'extracteur a rencontré une page sans texte dans les appendices : il enregistre désormais `textEmpty:true` et une vérification visuelle requise, sans certifier la lecture ni interrompre les pages suivantes ; nouveau test rouge puis vert (neuf tests d'audit au total).

L06 — `Livre de base V5 EN v2.pdf`, 379 pages physiques. SHA-256 recalculé : `53e84b3d484782279df8d09f67cbaeaeca58977285cff4c9230ebac28bd2d9de`, identique au manifeste. Sommaire repéré aux pages physiques 1-6. Pages 129-133, 265-266 lues pour le lot Tests ; pages 161-169 lues pour Combat ; folios imprimés égaux aux numéros physiques pour ces pages. Passage « Surprised » p.187 consulté pour lever une divergence, sans audit du reste de cette page. Page 267 repérée lors d'un premier extrait, mais XP et voyage non audités. Ni le sommaire ni le hash ne certifient une lecture exhaustive.

Extraction reproductible : `node tools/audit/extract-pages.mjs --book L06 --pages 129-133,265-266`. Textes et reçus par page dans `tmp/audit/L06/`. Ces reçus marquent volontairement `read:false` : l'extraction seule ne constitue pas une lecture. La lecture humaine/modèle est attestée dans ce rapport, avec son périmètre exact.

## Décomptes et limites

Le registre, la synthèse et les sélecteurs sont produits dans les chemins demandés. `node tools/audit/build-audit.mjs --check` vérifie leur correspondance exacte, les références locales et les limites de résumé. Les statuts sont des constats statiques de la base figée, pas une recette exhaustive des mécaniques.

État recensé : **171 règles**, dont **34 automatisées, 16 assistées, 0 rappel, 121 absentes, 0 hors-granularité**. **121 sélecteurs ouverts** correspondent exactement aux absences recensées. Les catégories à zéro ne signifient pas absence de ces cas dans le reste du corpus.

Par domaine : Tests 34 ; Destin et Chance 12 ; Combat 118 ; Voyage et environnement 7. Le manifeste complet décrit **26 livres et 3 968 pages physiques**, contre 17 et 2 694 pour le manifeste initial. Aucun livre n'est déclaré intégralement terminé ; seul L06 est commencé.

Cinq renvois évitent de refaire les inventaires antérieurs : C0-L06-013, C0-L06-014, C0-L06-018, C0-L06-019 et E0-T-060. Leur présence ne fige pas leur ancien statut : le raccordement runtime est examiné séparément.

Les noms FR sont provisoires avant L05. Les conversions V4 ne sont pas encore abordées : seules des règles V5 de L06 ont été recensées, donc `v5Proposal:null`.

## Difficultés et choix

- L06 p.131 : extraction désalignée des tableaux Difficulté et Issues ; les deux tableaux ont été vérifiés visuellement sur le rendu `tmp/audit/L06-p131.png`. Aucun seuil deviné.
- Encodage de l'ancien premier extrait : certains signes typographiques étaient mal restitués. Extraction unitaire refaite explicitement avec `-enc UTF-8` ; source visuelle prioritaire pour le tableau.
- Un champ générique de DR ou d'Avantage ne suffit pas à couvrir la règle qui devrait le déclencher. Les tâches étendues de magie ne prouvent pas un suivi générique des tâches.
- L06 p.165 et 166 : tableaux Oops, incidents et modificateurs vérifiés visuellement (`tmp/audit/L06-combat-165.png`, `L06-combat-166.png`). Chaque conséquence distincte de maladresse et d'incident a sa propre entrée.
- Surpris : contradiction interne constatée entre le tableau p.166 (+1 DR) et l'État p.187 (+2 DR). Le moteur suit +2 ; aucune correction ni nouvel arbitrage.
- Ralliement, Intimidation et dressage Guerre : fonctions spécialisées présentes, mais aucun appel dans js/ hors de leur définition repéré. Statut prudent `absent`, avec référence à l'inventaire existant. Les tests de ces fonctions ne prouvent pas un parcours utilisateur.
- Tous les choix sont consignés dans `CHOIX_EXECUTANT_PHASE_F.md` (F-C01 à F-C10).

## Vérifications exécutées

- Base : premier essai avec TEMP à l'intérieur du checkout, 4 041/4 043 ; E2 échouait car son chemin « extérieur » restait dans le checkout, E0 faute de reçu initial. Aucun test modifié.
- TEMP/TMP corrigés vers `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime` (même lecteur, hors worktree) : 4 042/4 043 ; seul E0 neuf admis par le brief.
- F00 : rouge attesté (`tmp/audit/F00-red.log`, import de l'outil inexistant), puis 7/7 tests ciblés ; suite complète 4 050/4 050 après démarrage réel de la recette, reçu E0 désormais existant (`tmp/audit/F00-full.log`).
- F06-Tests : suite complète 4 050/4 050, zéro échec (`tmp/audit/F06-tests-full.log`, 112,669 s).
- F06-Combat : suite complète 4 050/4 050, zéro échec (`tmp/audit/F06-combat-full.log`, 106,305 s). Génération de la synthèse et des sélecteurs répétée à empreintes identiques ; `--check` vert.
- Dernière suite complète avant le commit du rapport : **4 050/4 050**, zéro échec, zéro ignoré (`tmp/audit/final-full.log`, 108,582 s). Contrôles de périmètre, références Git et empreintes des trois livrables de données conservés dans `tmp/audit/final-integrity.json`.
- Recette complète : **26/26 commandes vertes**, dont la suite Node et les parcours navigateur/cloud locaux. Reçus réels dans `tmp/divin/recipe-receipt.json` et `tmp/audit/recipe-F00.log` ; toutes les sources protégées inchangées. Recette achevée le 22/10 à 21 h 28 (Europe/Paris).
- Fins de ligne LF ; `git diff --check` vert.

Assertions de tests existants modifiées : **aucune**. Nouveaux tests : `tests/audit-phase-f.test.js` (sept contrôles d'outillage).

Le brief F0 provient du worktree demandé, à `b1ab6c5` ; son SHA-256 est `9c97672e69c7d41825d3d9364945add0101fd411ea2b175a261f0c8c48c6aff9`. Il n'existait pas encore dans `main` à `ad092cd`. Il a été lu à son emplacement d'origine ; aucun document de consigne n'a été copié ou modifié pour résoudre cette différence de branches.

## Reprise

L'audit des 26 livres n'est pas terminé. Ne pas prendre les 171 règles recensées pour une couverture du corpus. Terminer chaque gros chapitre restant de L06 et son commit, puis L05 et les livres suivants dans l'ordre du plan. Continuer à renvoyer vers les inventaires déjà existants sans les recopier. Toute fin de session suit la clause « Volume » des règles communes et doit laisser un état partiel explicite.

Arrêt après deux gros chapitres propres et commités, conformément à la règle commune : « si la phase dépasse ce qui tient dans ta session, termine le lot en cours proprement (commit), écris le rapport partiel (lots faits, lots restants) et arrête-toi ». Ce n'est ni une clôture de F0, ni un blocage technique. Le volume restant est le reste de L06 et les 25 autres livres ; le complément L19-L26 reste donc intégralement à faire, y compris les conversions V4 et le marquage `addedOn`.

Reprise conseillée : applications des compétences L06 p.134-160, puis blessures et soins à partir de p.170. Vérifier les chapitres encore manquants de L06 avant L05. Dernier identifiant alloué : `F-L06-0171` ; poursuivre à `F-L06-0172` sans renuméroter. Les appendices annoncés au sommaire (Avantage/Élan, difficulté, Résilience/Détermination, etc.) restent à lire : leur seule présence au sommaire ne vaut aucune qualification de couverture.

Commandes de contrôle : `node tools/audit/build-audit.mjs --check`, puis `node --test --test-concurrency=4` avec TEMP/TMP sur `E:/Outil MJ Warhammer/tmp/gpt-phase-f-runtime`. Les données sources sont directement dans `docs/AUDIT_REGLES.json` ; le générateur produit uniquement la synthèse et les sélecteurs. Il a été relancé deux fois avec sorties identiques.

Intégrité constatée après `65be80b` : `main` toujours à `ad092cdf78a747d08f1b1a0fd8acf27a97d6caf8`, `codex/divin-v5` toujours à `b1ab6c512acb6f919a00ef9d6b85fa1769b33c2b`. Diff de `js/` vide ; aucun test hérité modifié. Seuls un nouveau test d'audit, deux nouveaux outils et les documents/données de F0 sont ajoutés ou changés. Le présent rapport est le seul document de clôture modifié après le commit Combat.
