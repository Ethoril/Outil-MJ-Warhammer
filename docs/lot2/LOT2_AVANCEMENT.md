# Avancement local du 9 octobre 2026

Branche `codex/lot2-talents-v5`, reprise incluant `a1af528`. Main et le site public restent inchangés. Version applicative 3.12.3, sans nouvelle publication.

## État courant

Les étapes 2.1 et 2.2 sont raccordées au combat : chaîne commune V5, choix d’inversion sans nouveau dé, critiques indépendants du gagnant, Élan binaire, acquisitions/récupérations et échéances atomiques. Les horloges appartiennent aux scènes et distinguent auteur/cible. Les données ou jets inconnus suspendent l’application.

Le raccordement représentatif **2.3 est réalisé localement** : cinq contrats actifs, coûts préparés avant calcul, Fortune stable entre rencontres, quotas durables et réaction explicite. [LOT2_RACCORDEMENT_2_3.md](LOT2_RACCORDEMENT_2_3.md) décrit le comportement, les modules, les reçus et les limites. [LOT2_CONTROLE_2_3.md](LOT2_CONTROLE_2_3.md) donne le contrôle indépendant.

Tir précis et Coup puissant ajoutent leurs bonus fixes avec le contexte réel. Mâchoires d’acier réduit la première acquisition Sonné avant ses conséquences. Battement supprime tous les dégâts et le critique qu’il remplace, conserve le critique défensif indépendant et expire au prochain Tour de l’auteur. Assaut féroce prépare une action distincte, liée au résultat source, payée seulement à confirmation. Annulation, rechargement, refus et erreur de disque sont contrôlés.

Fortune est initialisée explicitement depuis Chance courant connu ou saisie MJ, jamais depuis Destin/maximum. Son registre appartient au personnage, avec projection sur toutes les copies. La première association PJ locale univoque préserve le solde dépensé et sa provenance ; remplacement/ambiguïté ne provoquent aucun transfert supposé. Aucune écriture automatique dans la fiche.

## Validation reproductible

```text
npm ci
npm test
npm run test:lot2-browser
npm run test:lot2-23-browser
node tests/lot2-v5-23-control-browser.mjs
npm run test:startup
npm run test:fiches-browser
```

Node/npm et les dépendances étaient déjà installés pour cette reprise. Recette finale : **672/672 tests Node réussis, zéro échec, annulation ou test ignoré**. Les cinq recettes Edge ci-dessus sont réussies, exécutées séparément. Elles couvrent ordinateur/téléphone, sombre/parchemin, coûts, Fortune, quotas, Battement, réaction, annulation, synchronisation de fiches et démarrage. Le cache réel 3.12.0 → 3.12.3 est éprouvé avec IndexedDB préservée. Les 21 tests du contrôleur indépendant 2.3 sont inclus dans la suite Node. `git diff --check` est conforme.

Les scripts navigateur utilisent Edge sur Windows ou `PLAYWRIGHT_EXECUTABLE_PATH`. Données et captures sont synthétiques, dans `tmp/` ignoré. Les tests de rejet disque produisent volontairement une erreur console. Les contrôles cloud sont locaux (enveloppe et sérialisation), sans recette sur un compte distant réel.

## Sources et repères historiques

Le CSV Talents V5 contient 206 IDs conservés et 19 descriptions/empreintes modifiées ; SHA-256 : `935a96f79688a798bb1cc2fc320db78bfe753974fc8263581152ecd1322abd4e`. Source, snapshot applicatif et inventaire portable sont cohérents. Le texte actualisé ne remplace pas un contrat mécanique certifié.

Le commit `6871764` validait 619 tests Node et les trois recettes historiques combat/démarrage/fiches pour 2.1/2.2 et le socle pur 2.3. [LOT2_CONTROLE.md](LOT2_CONTROLE.md) et [LOT2_ETAPE_2_3_SOCLE.md](LOT2_ETAPE_2_3_SOCLE.md) documentent cet état antérieur. Le raccordement courant dépasse leur statut « non raccordé ».

Les règles consultables V5 incluent Tests, Élan, santé, critiques, États, Psychologie et Corruption. La magie et les prières restent au lot 3. Les [trois arbitrages](CHOIX_POUR_LA_REPRISE.md) sont validés et implémentés dans leur portée raccordée.

## Suite du chantier

Catalogue utile **2.4** depuis les snapshots PJ réellement importés, puis recette de livraison **2.5**. Les cinq contrats ne certifient pas tous les talents. Frappe assommante, Orateur, tests contextuels, Riposte/Frappe réactive et autres effets restent à contractualiser ; toute nouvelle famille mécanique exige un incrément testé. Dix bonus de caractéristiques intégrés aux fiches restent exclus ; ne pas ajouter Dur à cuire deux fois.

[La passation](PASSATION_PROCHAINE_FENETRE.md) donne la reprise locale. Aucun push, fusion, déploiement, migration de données privées ni PDF/export privé ajouté au dépôt.
