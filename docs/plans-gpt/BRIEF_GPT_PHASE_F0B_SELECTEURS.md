# Brief GPT — phase F0b : nettoyer et regrouper les sélecteurs F1 (24/10/2026)

Suite de F0 (`BRIEF_GPT_PHASE_F_AUDIT.md`, clôturée et intégrée dans `codex/divin-v5`, commit de fusion `503948f`). Une contre-vérification indépendante a confirmé la fidélité de l'audit (0 erreur de fond sur 25 entrées, statuts « automatise » réels) mais jugé les **5 337 sélecteurs** impropres à être posés au MJ tels quels. F0b prépare ce que le MJ verra ; **aucune implantation de règle, aucun fichier `js/` modifié**, comme en F0.

## Mise en place

- Nouveau worktree depuis `codex/divin-v5` : `git worktree add -b gpt/phase-f0b "E:/Outil MJ Warhammer/tmp/gpt-phase-f0b-worktree" codex/divin-v5`, `core.autocrlf false`, `core.eol lf`, `npm ci`.
- Règles communes : `docs/plans-gpt/REGLES_COMMUNES_GPT.md`. Commits terminés par « (GPT) », un commit par lot, rapport `docs/plans-gpt/RAPPORT_GPT_PHASE_F0B.md`, choix `CHOIX_EXECUTANT_PHASE_F0B.md`.
- Outil : `tools/audit/build-audit.mjs` (deux générations identiques et `--check` à chaque lot) ; tests `tests/audit-*.test.js` étendus pour chaque nouvelle règle de génération.

## Lots

| Lot | Contenu | Critère d'acceptation |
| --- | --- | --- |
| B1 | **Regroupement par table ou famille** : une seule question pour une table ou une famille de lignes (Humeur ×27, Marque de Vent ×8, Option de progression naine ×10, Mutations, Middenball, Événements, Leviers, Rumeurs, Incidents Waaagh, bandes de DR d'Identification, Encrassement, Précipitations…), avec un « détail par ligne » consultable et trois choix : toute la table, rien, au cas par cas. Les 152 sélecteurs au corps identique sont fusionnés. | Nombre de questions et de familles mesuré ; aucune entrée de l'audit perdue (chaque ligne reste rattachée à sa question). |
| B2 | **Questions qui n'en sont pas** : les 62 lignes de Blessures critiques L06 demandent d'implanter ce que le moteur applique déjà (Blessures, États) : ne demander que la séquelle manquante. Retirer ou marquer « sans mécanique » les sélecteurs vides de sens (« Bouclier magique : aucun pouvoir supplémentaire », « Plume de Phénix de givre », « Mummit +0DR », F-L08-0254 sans mécanique à la page). Humeur L25 : le texte dit « sans nouveau suivi automatique », ne pas proposer « Implanter ». | Liste des sélecteurs retirés ou transformés, avec la raison. |
| B3 | **Statut et renvois** : une entrée couverte ailleurs (`coveredBy`) ne porte plus le statut « absent » mais un statut explicite « couvert ailleurs » (environ 1 240) ; corriger le renvoi faible F-L03-0031 (lentille à Rune de vision lointaine, L03 p.69 → la règle de L03, pas D0b-R-090) ; doublon Witchbrew F-L09-0116 / F-L09-0117 (un seul statut) ; F-L25-0057 Sel sacré : les 50 % de chance du texte. | Décomptes par statut recalculés et publiés dans la synthèse. |
| B4 | **Pages** : un champ `pagePdf` (page physique du PDF) à côté de la page imprimée, pour tous les livres (L23 p.99 = page physique 101 ; L05 décalé de 2…). | Contrôle : la page physique de 30 entrées au hasard contient bien la règle. |
| B5 | **Texte des questions** : mots collés (177 cas : « Résultat01-05 », « àFM yards », « de3DR »…), jargon et abréviations (« Man », « M », « Soc », « NI », « +40 en V4 ») en mots de joueur, identifiant interne cité (F-L17-0282 cite C0-L17-009), faute « excluQ18 » ; conversions V4 → V5 : le résumé garde le texte de la source, la conversion va dans `v5Proposal` (ex. L23 Tirer un tapis : « Difficile (−10) » dans le résumé). Domaines normalisés (≈ 15 au lieu de 107, casse et accents cohérents). | Contrôle automatique : aucun mot collé chiffre-lettre, aucun identifiant interne, aucune abréviation de la liste dans les questions. |
| B6 | **Choix par défaut neutre** : plus de `choix: "Implanter, version complète"` par défaut ; le MJ part d'un choix vide. | Aucun sélecteur avec un choix pré-rempli. |
| B7 | **Ordre de présentation** : trier par valeur pour la table : d'abord L06 (socle V5), puis combat, blessures, compétences, talents, maladies ; puis le reste par domaine. Produire `SELECTEURS_F1_PAQUETS.json` : des paquets de 30 à 50 questions au plus, chacun sur un seul domaine, prêts à être posés au MJ sur une page de sélecteurs (gabarit `docs/plans-gpt/GABARIT_PAGE_SELECTEURS.html`, une page par paquet). | Nombre de paquets et taille ; premier paquet relu : il se lit sans connaître le code. |
| R | Clôture : `--check`, tests audit, suite complète une fois, rapport avec les décomptes avant / après. | Rapport honnête ; aucun fichier `js/` modifié. |

Hors de F0b : décider à la place du MJ, implanter une règle (F2), modifier l'audit F0 hors des corrections listées.
