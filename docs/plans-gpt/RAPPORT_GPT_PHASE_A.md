# Rapport GPT — phase A et inventaires

Date : 21 octobre 2026. Travail local sur `gpt/phase-a`, depuis `codex/divin-v5` à `a61459d`, dans `E:\Outil MJ Warhammer\tmp\gpt-phase-a-worktree`.

Les dix lots demandés sont intégrés dans cette branche. Les trois inventaires documentent les règles repérées, leur couverture actuelle et les questions ouvertes ; ils n’implantent pas les phases suivantes.

| Lot | Résultat | Comportement ou livrable |
| --- | --- | --- |
| A3 | **FAIT** (`e3edb07`) | Destinataires masqués pour les prières à cible implicite ; indication du prêtre comme cible. |
| A4 | **FAIT** (`a57b64f`) | Dévotion de la Guerrière : noms des ennemis présents et saisie libre, conservés dans la spécialisation. |
| A5 | **FAIT** (`6469f13`) | Morsure du Loup contribue au bonus des critiques de sorts directs et de vortex. |
| A6 | **FAIT** (`03ba5cf`) | Indice d’inversion affiché seulement si l’inversion ferait réussir le Test échoué ; aperçu sans consommation. |
| A7 | **FAIT** (`79b0d48`) | Faire monter les enjeux porte le prochain Test à au moins +6 DR en réussite ou au plus −6 en échec ; opposition et dégâts utilisent ce résultat, consommation à l’application, annulation possible. |
| A8 | **FAIT** (`f7a4850`) | Rappel d’Attaque Rapide au début du Round, une fois par porteur encore actif. |
| A9 | **FAIT** (`939bc82`) | Les critiques enregistrent les identifiants des États acquis ; les soins de Shallya proposent leur retrait et le détaillent dans le reçu, avec annulation. |
| A10 | **FAIT** (`d56b98f`) | Chance offre aussi la relance lorsque le Test propre réussit mais perd l’opposition. Caractérisation préalable : `eedb60b`. |
| A11 | **FAIT** (`47f1113`) | Registre des Blessures Critiques sur la fiche, commande publique « Guérir », États conservés, persistance et annulation. |
| A12 | **FAIT** (`f6daf2e`) | Ajout manuel et invocations magique/divine placés au rang d’Initiative V5 ; un rang déjà passé attend le Round suivant. Égalités, moteur legacy, ordre manuel explicite, persistance et annulation vérifiés. Caractérisation préalable : `a61c5ef`. |
| C0 | **FAIT** (`299069d`, complément `0e73014`) | [JSON](../COURAGE_BRISE_INVENTAIRE.json) et [rapport](../COURAGE_BRISE_INVENTAIRE.md) : 200 clauses, 20 questions ouvertes. |
| D0b | **FAIT** (`8f6f494`, correction de sous-total `89eb204`) | [JSON](../lot3/LOT4_TRADITIONS_SUPPLEMENTS.json) et [rapport](../lot3/LOT4_TRADITIONS_SUPPLEMENTS.md) : 144 sorts ou rituels manquants, 82 runes, 17 règles de système, 21 questions ouvertes. |
| E0 | **FAIT** (`8766eed`) | [JSON](../BESTIAIRE_INVENTAIRE.json) et [rapport](../BESTIAIRE_INVENTAIRE.md) : 249 règles et 541 références (508 profils, 27 gabarits, 6 prétirés), 30 questions ouvertes. |

## Validation exécutée

- Tests nouveaux exécutés en échec avant les corrections, puis commandes d’acceptation et suite complète après chaque lot. A10 et A12 possèdent chacun un commit de caractérisation distinct.
- Dernière suite complète : `node --test --test-concurrency=4`, **3 307 tests réussis, 0 échec, 0 ignoré, 0 annulé**, code de sortie 0, durée 85,664 s. Journal local : `tmp/gpt-phase-a/A13-full.log` ; A13 est uniquement l’étiquette technique de cette dernière relance, aucun lot A13 n’a été ajouté.
- Recette A12 : `node tools/run-divine-recipe.mjs`, **26 commandes sur 26 réussies**. Elle comprend une autre suite de 3 307 tests sans échec, les parcours navigateur, les contrôles indépendants inclus dans la recette, les deux recettes Firebase sur émulateurs et les vérifications hors ligne. Reçu : `tmp/divin/recipe-receipt.json` ; journaux `tmp/divin/final-*.log`.
- Contrats A7 modifiés par leur source et leur générateur, régénérés deux fois avec résultats identiques ; contrôle `--check` réussi. Les quatre sources protégées de la recette sont identiques au départ `a61459d`.
- Les premières suites rencontraient seulement l’échec d’environnement E0 autorisé par le brief, faute de reçu initial. La recette a produit ce reçu ; cet échec est absent de la dernière suite. `TEMP` et `TMP` ont été placés sur E: pour respecter le contrôle de parcours entre lecteurs Windows.
- JSON des inventaires, identifiants, décomptes, références de preuves et cohérence des rapports contrôlés. Fins de ligne LF et `git diff --check` vérifiés avant les commits.

## Assertions de tests existants modifiées

Par rapport à `a61459d`, un seul fichier de tests préexistant voit ses attentes remplacées : `tests/divin-v5-p4c-browser.mjs`, pour A3.

- Hurlement du loup et Roi de la Nature : le geste de cocher le prêtre est remplacé par l’assertion qu’aucune case « Destinataire » n’est présente.
- Œil de l’aigle : l’ancien geste conditionnel de cocher le prêtre est remplacé par la même assertion d’absence.
- La vérification que le loup invoqué reste ciblable sélectionne désormais une bénédiction normale de Myrmidia, puis conserve l’attendu d’une case ciblant le loup.

`tests/divin-v5-p5-ui-browser.mjs`, explicitement nommé par A11, reçoit trois contrôles supplémentaires : affichage du registre, guérison via la commande publique en conservant les États, restauration par « Annuler ». Aucune ancienne assertion n’y est remplacée. Le serveur de test reçoit aussi le type MIME HTML nécessaire à l’ouverture de la fiche réelle.

Dans les fichiers ajoutés puis figés par les commits de caractérisation :

- A10, `tests/divin-v5-a10-chance-opposition.test.js` : seul le cas « réussite propre mais opposition perdue » change ses attentes : relance gratuite `false → true`, solde de Fortune `2 → 3`, faveur restante `1 → 0`.
- A12, `tests/divin-v5-a12-char-ordre.test.js` : seules les deux attentes V5 des invocations magique et divine remplacent « N après C » par « N avant C », à leur rang encore à venir. L’ajout manuel était déjà correct dans cette caractérisation ; ses attentes et celles du moteur legacy sont conservées.

Les autres fichiers de tests préexistants, dont `tests/p5-char-fortune-reroll.test.js`, sont inchangés.

## Limites et passation

C0 distingue 7 clauses exécutées par le moteur, 53 assistées, 34 rappels et 106 absentes. E0 distingue 7 couvertures assistées, 80 rappels et 162 absences ; aucun Trait complet n’est déclaré exécuté par le moteur sur la seule présence de son étiquette. D0b recense des entrées à intégrer ultérieurement.

Les 71 questions ouvertes sont conservées dans les inventaires : divergences V4/V5, contradictions entre pages, valeurs ou traductions incertaines, sources absentes et choix d’automatisation. Le manifeste disponible contient 17 ouvrages, L01–L17. La consultation a procédé par repérages et pages ciblées ; elle ne certifie pas la lecture exhaustive des 2 694 pages ni l’absence de toute autre clause. Une recette verte valide ses contrôles nommés, pas les règles encore absentes ou l’exhaustivité des inventaires.

Pour A9, si une même résolution groupe deux critiques sans permettre de séparer les États acquis, ceux-ci sont liés au premier critique, conformément au brief et au commentaire du code. La guérison manuelle A11 retire uniquement le registre ; le retrait lié des États appartient au choix explicite des soins A9.

Aucun lot des phases suivantes n’est implanté. Aucun push, fusion, publication, changement de version ou ajout de dépendance. `main` reste à `10ee863` et `codex/divin-v5` à `a61459d`, tous deux propres lors du contrôle final. Les changements attendent la revue et l’intégration par l’orchestrateur.
