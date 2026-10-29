# Brief d'exécution F2-C - Compétences d'arme

Worktree exclusif : `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`. Sous-agent codeur Luna. Ce brief n'autorise aucun autre lot.

## Contrat

Lire le brief général F2, les règles communes, le plan avec section Exécution, les arbitrages F1 et les 26 entrées F2-C du JSON. Les décisions du MJ priment. Lire les pages PDF correspondantes ; les extractions ciblées sont dans `tmp/gpt-phase-f2/sources/` et le corpus donne les chemins absolus. L06 p.300 a été rendue et lue par l'exécutant : ambiguïté « Improved Weapons » consignée dans les choix, suivre arme improvisée retenue par le plan. Les résumés utilisent nos propres mots.

Conserver `suggestSkill`, le choix confirmé d'une compétence d'attaque et les résultats des fiches existantes quand aucune règle de maîtrise manquante ne les affecte. Aucun système neuf de carrière. Conserver les armes conjurées, leur calcul et leurs clauses existantes.

Implanter réellement dans la chaîne UI -> résolution -> application : spécialité / augmentations ; sans maîtrise mêlée repli CC et perte des Qualités, Défauts gardés ; tir bloqué hors exceptions ; Ingénierie vers poudre/explosifs sans malus, poudre vers Ingénierie -2 DR ; arbalète/jet CT -1 DR ; sarbacane CT + Dangereuse ; Fléau non maîtrisé Dangereuse ; escrime avec Base sans Qualités ; cavalerie à pied à une/deux mains ; Marteau de cavalerie, sabre selon spécialité, Main gauche sans Parade comme dague sans Défensive, bâtarde à une main Épuisante/Lente ; compétence avancée sans augmentation non testable. Chaque doublon du JSON doit être traçable au même test/implémentation.

Réutiliser métadonnées réelles du catalogue et des équipements. Ne pas déclencher le traitement général des armes sur griffes, morsure, sorts ou attaques abstraites sans donnée de groupe. Si une donnée essentielle manque sur une arme concernée, proposer un champ MJ et bloquer l'effet incomplet avec reçu ; ne pas inventer une spécialité entraînée ni modifier les profils catalogue. Les effets calculés s'appliquent à une copie d'action effective, sans perte des qualités du catalogue ni de la fiche.

## Fichiers autorisés

`js/core/weapon-skill-rules.js` (neuf), `js/core/fiche-sync.js`, `js/core/equipment.js`, `js/core/v5-combat-rules.js`, `js/core/resolution.js`, `js/ui/resolution-panel.js`, `tests/f2-c-*.test.js`, `tests/f2-c-*.mjs`. Rapports intermédiaires et logs sous `tmp/gpt-phase-f2/`. Aucune autre édition sans prévenir l'exécutant pour complément de plan préalable. `sw.js`, catalogue, version, JSON générés et arbitrages intacts. Ne pas modifier le rapport global ni les choix sans demande du principal.

Complément avant code : `tests/sw.test.js:34` impose que chaque module de `js/` soit listé dans le service worker, que les règles communes interdisent de modifier. Pour C, **ne pas créer le module neuf** : exporter les fonctions pures de maîtrise depuis `js/core/equipment.js` existant et les raccorder à la résolution. Ne pas modifier le test du service worker. Cette décision d'organisation ne change aucune règle de jeu.

Extension de périmètre avant édition : `js/core/v5-talent-qualities.js` est autorisé. Ce pipeline restaure des qualités depuis l'équipement et construit les plans de talents ; il doit recevoir l'action effective et son identité improvisée avant la planification. Ne pas remplacer silencieusement les règles de fusion des munitions ni supprimer des talents indépendants de la maîtrise. Test d'intégration requis sur arme improvisée par usage à pied et talent concerné, et sur qualités de munitions.

Seconde extension avant édition : `js/ui/workspace-view.js`, limitée au constructeur `v5Input` et aux imports requis pour utiliser groupe/nature du contexte et équipement réel. Un choix Arc sur une arme de groupe inconnu, ou un brouillon restauré Ingénierie tir sans événement change, ne doit pas afficher Tir tout en envoyant Corps à corps au moteur. Test du raccord formulaire vers constructeur réel requis ; un handler capturé seul ne prouve pas ce raccord.

## Séquence imposée

1. Écrire uniquement `tests/f2-c-characterization.test.js` caractérisant les vrais chemins existants à risque (`resolution.js`), les actions d'armes de fiche et conjurées, la sélection confirmée et l'absence de mutation des entrées. Exécuter ces tests sur le code intact. Prévenir le principal avec résultat et attendre qu'il confirme le commit séparé avant toute édition de production.
2. Écrire les tests nouveaux `tests/f2-c-weapon-skills.test.js` et constater le rouge pour les règles manquantes. Sauver log et comptage ; un import manquant seul ne démontre pas l'échec mécanique : si module neuf, première implémentation minimale/export neutre admise après caractérisation pour montrer les assertions rouges pertinentes.
3. Coder le lot complet, tests verts. Chaque règle a cas positif et hors condition ; score, qualité perdue, défaut conservé/ajouté vérifiés au niveau résolution et pas seulement helper. Ajouter au moins un parcours applicatif d'arme importée, un blocage effectif et un contrôle de l'absence de mutation des sources.
4. Acceptation : `node --test tests/f2-c-weapon-skills.test.js tests/f2-c-characterization.test.js tests/e26-fiche-sync.test.js tests/e27-references-equipment.test.js`. Puis `node --test --test-concurrency=4` avec TEMP/TMP = `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-runtime`, log sous tmp du worktree. Ne pas lancer la suite complète en parallèle d'une autre suite complète.
5. Rendre diff, règles couvertes, tests, limites, liste de fichiers/éventuels choix à consigner. Ne pas commiter le code, le principal le relit et lance la vérification indépendante Luna avant commit de livraison. Ne jamais modifier le moteur pour satisfaire un attendu faux.

Le vérificateur indépendant sera un autre sous-agent à contexte neuf : règles/PDF, diff intégral, bugs réels, chemin UI/mécanique, tests. Toute correction revient au codeur puis repasse en vérification.
