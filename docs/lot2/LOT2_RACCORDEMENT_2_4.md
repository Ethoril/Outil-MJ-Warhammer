# Catalogue utile 2.4 — première vague locale

État du 9 octobre 2026 sur `codex/lot2-talents-v5`, après le raccordement représentatif 2.3. La version applicative reste 3.12.3. Cet incrément traite les 206 identités du catalogue par clauses et raccorde 41 contrats de talents, dont certains seulement pour une partie de leur description. Il ne certifie pas tous leurs effets et ne constitue pas la recette de livraison 2.5.

## Ce qui est utilisable

Les cinq contrats 2.3 restent actifs. Les nouveaux contrats couvrent 35 talents de Tests et Frappe assommante. Orateur et les contextes prioritaires sont raccordés : compétence canonique, circonstances explicites, Avantage/Désavantage et annulation 1 pour 1. Le libellé libre d’un jet ne peut pas remplacer son identité importée.

Maître en déguisement, Loup de mer et Numismate proposent après réussite un choix entre DR et valeur du dé des unités, pour chaque variante conservée ou inversée. La face 0 vaut 10 (livre p. 6). Aucun nouveau dé n’est lancé ; ce choix ne transforme pas un échec initial en réussite. Les autres clauses des mêmes talents restent visibles en rappels MJ.

Frappe assommante ajoute temporairement Assommante à une arme improvisée : le catalogue d’armes n’est pas modifié. Une touche à la tête qui retire réellement au moins le BE de la cible propose un Sonné. La localisation normale reste distincte de la localisation critique. Mâchoires d’acier réduit les acquisitions regroupées une seule fois avant leurs conséquences ; Battement supprime aussi cette acquisition lorsqu’il remplace la touche. Le critique défensif indépendant de combat reste conservé.

Le Coup ciblé ordinaire applique −2 DR et exige sa localisation explicite (p. 167). Pour la neutralisation silencieuse, la décision du MJ retient la procédure p. 135 : hors combat, cible ignorant le danger, Corps à corps opposé à Résistance, Avantage de Frappe assommante et aucun Coup ciblé. L’outil aide au Test ; les conséquences particulières restent à arbitrer : victoire = BF Blessures et Inconscient, défaite = cible Sonnée et alarme. Les dégâts, critiques et gains d’Élan de combat ne s’y appliquent pas automatiquement. L’incohérence p. 127/p. 135 et le texte proposé sont détaillés dans [l’audit des sources](ECARTS_LIVRE_V5_AIDES_DE_JEU.md).

## Catalogue et PJ réellement importés

Chaque talent affiche les clauses automatiques, assistées par choix, rappels MJ, exclusions ou renvois au lot 3, dans les Règles et les fiches/détails d’action. Une acquisition inconnue ou une description publique modifiée reste à vérifier. Le statut interne `verified` de la couverture signifie seulement correspondance avec le texte épinglé ; il ne certifie jamais toute la mécanique du talent.

Les priorités sont calculées depuis les snapshots de PJ effectivement présents dans réserve, personnages persistants, rencontre active ou scènes suspendues. Les copies sont dédupliquées par identité stable et empreinte. Des snapshots aux talents divergents ne sont pas fusionnés par hypothèse. Aucune lecture du compte en ligne ni liste privée de PJ n’est intégrée au code. Le filtre reste réversible même sans snapshot.

Les cinq snapshots privés locaux des 5 et 7 octobre relus précédemment (52 acquisitions, 36 IDs) restent une preuve datée. Ils ne prouvent pas leur état en ligne du 9 octobre. Les recettes de cet incrément emploient uniquement des représentants synthétiques.

Les dix bonus de caractéristiques déjà intégrés aux fiches sont exclus. Dur à cuire rappelle de vérifier le maximum existant et n’ajoute aucun bonus aux PV importés. Riposte, Frappe réactive et les autres mécaniques sans contrat restent en rappels. Les 25 talents liés à magie/prières sont différés au lot 3. Les quotas de séance et autres effets non raccordés restent explicites, sans compteur supposé.

## Architecture et sécurité d’application

- `js/core/v5-talent-tests.js` et `js/data/v5-test-talent-contracts.json` : contextes et 35 contrats de Tests.
- `js/core/v5-talent-qualities.js` et `js/data/v5-quality-talent-contracts.json` : Frappe assommante, qualité Assommante épinglée et exception p. 135 approuvée.
- `js/core/v5-talent-coverage.js`, `js/data/v5-talent-coverage.json`, `tools/build-v5-talent-coverage.mjs` : catalogue par clauses et priorités locales. Le générateur est une préparation hors ligne ; aucun texte libre n’est interprété comme règle à l’exécution.
- Le schéma v2 ajoute `action.before` (`addQuality/suppressQuality`) et `test.afterRoll` (`chooseSLUnits`). Rang, spécialité, rôle et cumul restent explicites.
- La version mécanique devient `v5-combat-2026-10-09.24` : un ancien aperçu est refusé et doit être recalculé.
- Au clic Appliquer, les origines contractuelles et leurs empreintes sont relues contre la source courante, en plus de la révision Store. Une actualisation entre aperçu et application refuse l’effet sans mutation ni historique.
- Résultat, États, usages et reçu restent dans une commande durable atomique ; annulation et rechargement restaurent l’ensemble. Les aperçus ne consomment rien. Les six nouveaux actifs sont ajoutés au précache du Service Worker.

Le catalogue contient 105 clauses automatiques et 10 assistées, comptées séparément par rôle, 159 rappels, 10 exclusions et 25 renvois au lot 3. Ce décompte de clauses n’est pas un nombre de talents entièrement automatisés.

## Validation et suite

[Le contrôle indépendant 2.4](LOT2_CONTROLE_2_4.md) et [l’avancement](LOT2_AVANCEMENT.md) donnent les commandes et résultats finaux. Les tests de source utilisent réellement le catalogue chargé/actualisé et le Store, et les recettes Edge manipulent les vrais champs, choix et boutons d’application.

Toute nouvelle famille mécanique demande son incrément commun, son contrat validé et sa recette avant activation. La couverture visible des 206 talents permet de poursuivre les vagues 2.4 ; Riposte/Frappe réactive et les clauses encore manuelles ne sont pas activées par cette livraison locale. La recette globale 2.5, le cloud réel et toute publication restent des étapes ultérieures.
