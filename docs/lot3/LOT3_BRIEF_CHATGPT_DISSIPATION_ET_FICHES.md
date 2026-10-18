# Brief pour ChatGPT — dissipation (phase 4) et fiches de correction des contrats (phases 7-8)

11 octobre 2026. Deux chantiers, à faire dans cet ordre de priorité. Le premier modifie du code ; le second ne produit qu'un document.

## Contexte

- Dossier : `C:\Users\arnot\.codex\worktrees\lot2-combat-v5\Outil MJ Warhammer`, branche `codex/lot2-talents-v5`, application 3.14.0. **Tout le travail est non commité** et de nombreux fichiers sont non suivis.
- Plan de référence : [LOT3_PLAN_CORRECTION_CLAUDE.md](LOT3_PLAN_CORRECTION_CLAUDE.md). Rapport de relecture : [LOT3_RELECTURE_CLAUDE.md](LOT3_RELECTURE_CLAUDE.md). Décisions du MJ : [LOT3_CADRAGE_MAGIE.md](LOT3_CADRAGE_MAGIE.md), sections « Arbitrages confirmés » et « Arbitrages du 10 octobre (relecture) » ; elles priment sur le plan.
- Déjà livré par Claude depuis la relecture (ne pas régresser) : fin de tour réelle qui traite les effets magiques et expiration à la fin du tour de l'auteur (D-12) ; aucun dé implicite (tout dé manquant bloque l'aperçu, `explicitMagicDie`) ; couches d'effets avec base recalculée ; Chance et Destin via le registre V5 (`js/core/v5-resources.js`, temporaire d'abord) ; Protections filtrées par type d'attaque ; destinataires des états ; arbitrages Main de Gloire, Faux de Shyish, Apothéose, Fléau. `node --test` : 1 163 tests verts au dernier passage.
- **Un agent Claude travaille en parallèle dans le même dossier** sur la Forme bestiale et la Transformation de Kadon.

## Règles

- Aucun commit, push, fusion ni déploiement. Aucun `git checkout`, `restore`, `stash`, `clean`, `reset`.
- **Fichiers interdits** tant que l'agent Claude n'a pas fini : `js/core/v5-magic-arbitrations.js`, `js/core/v5-spell-contracts.js`, `js/core/v5-magic-effects.js`, `js/ui/resolution-panel.js`, `js/ui/workspace-view.js`, `js/ui/v5-magic-controls.js`, `tools/build-v5-spell-contracts.mjs`, `js/data/v5-spell-contracts.json`, `docs/lot3/LOT3_MATRICE_CONTRATS_V5.md`, `sw.js`, tout nouveau fichier de données dans `js/data/`. Si une correction exige l'un d'eux, ne le touche pas : décris le changement nécessaire dans ton rapport.
- Fichiers autorisés pour le chantier 1 : `js/core/v5-magic-dispel.js`, `js/core/v5-magic-casting.js` (seulement si nécessaire pour réutiliser les garde-fous de Test), et de nouveaux fichiers de test `tests/lot3-v5-dispel-*.test.js`. Dans `v5-magic-dispel.js`, ne modifie pas les appels à `beastFormRestriction` (Forme bestiale), que l'agent Claude peut toucher.
- Lis `git diff` et l'état actuel des fichiers avant de coder : les numéros de ligne du plan datent d'avant les livraisons et ont bougé.
- ESM, style du code environnant, messages et commentaires en français, commentaires rares.
- Test rouge avant chaque correctif, qui passe par le Store (`store.previewDispel…`/`applyDispel…` ou équivalents réels), pas seulement par la fonction pure.
- Pendant le travail, lance tes propres fichiers de test (`node --test tests/lot3-v5-dispel-*.test.js`). Un échec dans un autre fichier peut venir du travail de l'agent Claude en cours : signale-le, ne le corrige pas.
- Sources PDF (personnelles, ne jamais les copier dans le dépôt) : `E:\Projet Warhammer Ennemi Intérieur\tmp\catalogue-bibliotheque\pdfs\` — `Livre de base V5 EN v2.pdf` (magie pp. 235-255, Tests opposés p. 131, Tests étendus p. 266, compétences avancées pp. 109 et 116), `Supplément Elfe - High elf Players Guide v2.pdf` (pp. 80-89), `Winds Of Magic.pdf`. Ne recopie pas le texte anglais : résumés français courts.

---

## Chantier 1 — Dissipation (phase 4 du plan, X-01 à X-07)

Décisions applicables : **D-01** le dissipateur s'oppose au DR du seul Test d'incantation ; si le lanceur gagne, la réserve s'ajoute au DR net, qui doit atteindre le NI. **D-02** égalité : le lanceur gagne. **D-03** un sort de Haute Magie dissipé ne provoque pas d'épuisement. **D-18** distance et visibilité non saisies : bloquer. **D-19** méditations de talents non dissipables. **D-22** « double = maladresse » de La Fortune est Capricieuse vaut pour la dissipation.

| Id | Constat (relecture du 10/10) | Attendu |
| --- | --- | --- |
| X-01 | Quand le lanceur gagne le Test opposé, son DR n'est pas réduit : Carreau (NI 4), lanceur 5 DR, dissipateur 3 DR → le sort s'applique (cible −6 B). Le Test opposé est en outre comparé au total Test + réserve (Test 1 DR, réserve 10, dissipateur 4 → non dissipé). Zones : `v5-magic-dispel.js` (~l.152-158) et la reprise du résultat dans `v5-spell-contracts.js` (~l.2547-2553, **interdit pour l'instant**). | Côté `v5-magic-dispel.js` : opposer au DR du Test seul ; produire un résultat explicite `{ dispelled, netSl, casterSlAfterDispel }` avec DR net = DR du Test − DR du dissipateur, plus la réserve. Côté `v5-spell-contracts.js` : **ne pas modifier** ; décris précisément dans ton rapport comment ce résultat doit être consommé (réévaluer NI, surplus, surpuissance, épuisement selon D-03). |
| X-02 | La dissipation persistante est acceptée contre un sort lancé en Force irrésistible (`unstoppableForce`), alors que `canDispelCasting` le refuse. | Refus identique, avec message. |
| X-03 | Un dissipateur sans Langue (Magick) dissipe (repli sur Int via `resolveCastingSkill`). Langue est une compétence avancée (V5 pp. 109, 116). | Refus si la compétence est absente. |
| X-04 | Ni `prepareMagicOptions` ni `enforceMagicTestRestrictions` ne sont appelés : Inconscient ou Surpris n'empêchent pas de dissiper, Sonné ne pénalise pas, La Fortune est Capricieuse ne fait pas échouer sur un double. | Mêmes garde-fous et modificateurs que les autres Tests magiques ; double = échec sous La Fortune est Capricieuse (D-22). |
| X-05 | Test étendu de dissipation persistante (V5 p. 266) : réussite à 0 DR → progression 0 ; échec à 0 DR → rien retiré ; total qui passe sous 0 ramené à 0. | Réussite au moins +1 DR, échec au moins −1 DR (±5 sur critique ou maladresse si la règle V5 le prévoit : vérifie p. 266) ; la tentative échoue si le total passe sous 0. |
| X-06 | Progression stockée par couche, pas par lancer : même `castExecutionId` sur deux participants → progression non partagée. | Progression indexée par `castExecutionId`. |
| X-07 | Distance absente = 0, `visible` absent non bloquant ; méditations de talents proposées avec un NI 1 par défaut. | D-18 : bloquer tant que distance et visibilité ne sont pas saisies. D-19 : exclure les méditations de la liste et refuser leur dissipation. |

Également, si c'est dans `v5-magic-dispel.js` : Undo atomique de toute dissipation (vérifie par un test), et message clair à chaque refus.

**Fin du chantier 1** : tes tests verts ; `node --test` complet lancé une fois à la fin (signale tout échec hors de tes fichiers sans le corriger). Rapport en français, court : fichiers modifiés, ce qui est fait par item, choix, tests (rouges vus ou non), et **la description exacte de la modification restant à faire dans `v5-spell-contracts.js` pour X-01**.

---

## Chantier 2 — Fiches de correction des contrats (phases 7 et 8), sans code

But : préparer la correction des contrats de sorts pour qu'elle se fasse ensuite vite et sans relire les livres.

Produis **un seul nouveau fichier** : `docs/lot3/LOT3_FICHES_CORRECTION_CONTRATS.md`. Ne modifie aucun autre fichier.

Pour chaque item V-01 à V-54 et W-01 à W-19 du plan :
1. Lis la clause dans la source (page exacte, vérifie le décalage page imprimée / page PDF).
2. Lis le contrat **actuel** dans `js/data/v5-spell-contracts.json` (lecture seule ; il a changé depuis le plan) et, si besoin, l'exécution dans `js/core/v5-spell-contracts.js` (lecture seule).
3. Classe l'item : **déjà corrigé** (le contrat actuel est conforme : dis-le), **à corriger**, **donnée MJ** (le moteur ne peut pas le calculer : quel fait le MJ doit fournir), ou **décision MJ nécessaire** (la source est ambiguë : formule la question avec deux options).
4. Pour « à corriger » : valeur attendue d'après la source, valeur actuelle (clé JSON exacte), et changement proposé dans le générateur (`tools/build-v5-spell-contracts.mjs`, lecture seule : cite la fonction ou la zone où le contrat est construit, et la clé à changer). Si le moteur ne sait pas exécuter la clause, dis quel mécanisme manque.

Format : un tableau par Domaine (Bêtes, Cieux, Feu, Lumière, Métal, Mort, Ombres, Vie, Arcanes, mineurs, Haute Magie et elfiques, Winds of Magic, catalogue). Colonnes : Id · Sort · Page · Clause · Attendu · Actuel (clé) · Statut · Changement proposé. En tête du fichier : méthode, sources lues, nombre d'items par statut, et liste des items non vérifiés avec la raison.

Points d'attention :
- Plusieurs items ont déjà été corrigés par les livraisons de Claude (par exemple Bouclier céruléen, Coruscation de Finreir, Lames Azurées, Lumière aveuglante, Poussée en partie, Perturbant, Épée enflammée de Rhuin, Vision dans l'obscurité, Chair de Pierre, Capuche Vengeresse, Chute des feuilles). Vérifie-les quand même contre la source et le contrat actuel.
- Apothéose (High Elf Players Guide p. 86) et Apothéose Verdoyante (Winds of Magic p. 89) sont deux sorts distincts ; le plan les confondait.
- W-19 (Silence, V5 p. 245, et Coruscating Arc, V5 p. 249, absents du catalogue) : D-21 décide de les ajouter. Prépare leur fiche complète (NI, portée, cible, durée, effets, surpuissance) pour un futur contrat ; les descriptions seront des résumés français, pas une traduction du texte.

**Fin du chantier 2** : le fichier, plus un court rapport (nombre d'items par statut, liste des décisions MJ à poser).
