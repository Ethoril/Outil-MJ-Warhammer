# Deuxième contrôle des corrections Gemini — 10 octobre 2026

**Validation complète du lot 3 toujours refusée.** Les corrections du lancement sont réelles, mais la couverture annoncée des 277 sorts reste supérieure à ce que le code exécute. Contrôle sans modification du moteur.

## Corrections confirmées

- Les **95 tests ciblés** (`node --test tests/lot3*.test.js`) passent, ainsi que la recette navigateur `tests/browser-magic-v5-smoke.mjs` avec les composants réels du workspace et le Service Worker hors ligne.
- Un Carreau raté sur **99**, malgré une réserve de 15 DR, ne blesse plus la cible. La réserve est consommée et l’incident est traité dans le parcours utilisateur.
- Sur un critique réussi **22**, incident **15 : Distraction**, le parcours du store reprenant les options de l’interface applique maintenant **Surpris**. Une annulation restitue états et réserve. Le précédent blocage de ce parcours est donc corrigé.
- Le générateur exige désormais une configuration explicite et échoue lorsqu’elle manque. L’ancienne déduction d’effets par mots-clés a disparu. Forge de Tarnus possède maintenant des modificateurs de Tests renseignés.
- Le refus des aperçus périmés, Apothéose Verdoyante à 18 B pour 3 DR + réserve 15, et l’expiration de Pensée rapide restent vérifiés.

Ces contrôles ne certifient pas individuellement les 277 contrats. La suite générale n’a pas été relancée lors de ce contrôle.

## P1 — Des paramètres explicites restent sans exécution

Le générateur a remplacé les anciens placeholders par des configurations `special`, mais de nombreux identifiants et champs ne sont lus par aucun traitement. Le garde-fou de `js/core/v5-spell-contracts.js:519` accepte la seule présence d’un identifiant `special` comme preuve d’implémentation.

Un contrôle des 76 contrats de type `special`, avec Test réussi, cibles fournies et attribut de Domaine désactivé pour isoler l’effet propre, trouve **38 aperçus prêts sans aucune action principale** : 17 classés moteur et 21 classés saisie MJ. Ce décompte signale des effets absents ou sans accompagnement ; il ne remplace pas une recette individuelle de tous les autres contrats.

Exemples vérifiés :

- **Drain de Magie** : `dispelAoE: true` et `emptyReserves: true`. L’application annonce la réussite ; la cible conserve ses **7 DR de Focalisation**. Aucune action ne dissipe ou ne vide sa réserve.
- **Le Second Signe d’Amul** : `fortunePoints: 3` est déclaré, mais aucun traitement ne crée les Points de Chance temporaires, leur consommation ou leur expiration. L’aperçu n’a aucune action principale. La matrice l’annonce pourtant « Effet calculé ».
- **Calme** : `removePsychology` et `removeFrenzy` sont déclarés, mais aucun traitement ne demande le Test de Sociabilité prévu ni n’applique son résultat. L’effet principal est vide et la Frénésie reste présente.

La matrice annonce encore **0 contrat restant à réaliser**. Sa classification, dans `tools/build-v5-spell-contracts.mjs:2080`, dépend du typage et du traitement demandé dans l’audit, pas de l’existence d’un traitement exécutable.

**Correction attendue :** raccorder chaque paramètre à son traitement, ses choix, résistances, durée et annulation. D’ici là, marquer les contrats concernés comme restants et refuser une application présentée comme complète. Tester des effets avant/après ; l’absence des anciens noms de placeholders ne suffit pas.

## P1 — Les saisies nécessaires ne sont pas proposées au MJ

`js/core/v5-spell-contracts.js:1029` peut recevoir `mjChoice`/`mjParams`, mais le panneau et le parcours de `js/ui/workspace-view.js:1012` ne recueillent ni ne transmettent ces choix. Le premier choix de la configuration est automatiquement utilisé.

- **Goût de Feu** propose plat épicé, alcool ou huile dans le contrat. Le test vert fournit directement `mjChoice` au store ; le panneau ne permet pas au MJ de faire ce choix. Sans donnée, l’option plat épicé est sélectionnée automatiquement.
- **Main de Gloire** transmet toujours `chosenStats: ['CC', 'CT', 'F', 'E']` (`workspace-view.js:1027`). La décision utilisateur « quatre au choix parmi CC, CT, F, E, I, Ag » n’est pas accessible : Initiative et Agilité ne peuvent pas être choisies.
- Les résistances, dés secondaires d’incident et paramètres de trajectoire requis par d’autres contrats ne disposent pas d’un flux de saisie correspondant. Un reçu `activeMjEffects` ne constitue pas à lui seul une saisie raccordée.

**Correction attendue :** afficher les champs requis par le contrat sélectionné, demander les informations manquantes et transmettre les décisions dans l’aperçu puis la commande. Ajouter une recette DOM pour Goût de Feu et Main de Gloire incluant Initiative/Agilité, et pour les jets secondaires.

## P2 — Un incident transmis peut être remplacé silencieusement

Le parcours courant de l’interface transmet aussi `miscastRoll` et fonctionne. En revanche, transmettre uniquement le résultat complet `castingPreview`/`castResult` avec son incident résolu ne conserve pas cet incident : `v5-spell-contracts.js:660` recalcule avec `options.miscastRoll` sans reprendre les dés du résultat transmis.

Reproduction via le store : critique 22, résultat transmis **Distraction, incident 15**, mais sans dupliquer `miscastRoll` dans les options. L’application remplace l’incident par **Délié** et n’ajoute pas Surpris. Avec `miscastRoll: 15`, Surpris est correctement appliqué.

**Correction attendue :** reprendre tous les dés nécessaires du résultat transmis pour le recalcul, ou refuser explicitement un résultat incomplet/incohérent. Ne pas changer silencieusement un incident annoncé.

## Recette à compléter

Rejouer les trois cas ci-dessus, puis vérifier une sélection de contrats `special` avec leurs effets propres, sans se contenter des attributs de Domaine. Corriger la matrice en fonction des traitements réellement disponibles. La recette navigateur et les 95 tests sont verts mais ne démontrent pas ces effets et choix.

Preuves supplémentaires : `review-gemini-third-probes.mjs` et `gemini-third-probes.jsonl` dans le dossier temporaire de contrôle Codex. Le rapport précédent reste conservé. Aucun code de Gemini corrigé, aucun push ni déploiement.

## Complément — Cibles multiples et zones mêlant les camps

La sélection multiple est présente dans `js/ui/resolution-panel.js:433` : toutes les personnes fournies au panneau sont proposées, sans filtre de camp. `workspace-view.js:987` transmet tous les identifiants sélectionnés et `v5-spell-contracts.js:829` traite chaque cible. Un contrôle via le store avec un allié (`camp: pj`) et un adversaire (`camp: ennemi`) confirme que tous deux reçoivent les dégâts dans la même commande. Les personnes comprises dans une zone restent désignées par le MJ ; aucune position ne permet au moteur de déterminer automatiquement cette zone.

**P1 supplémentaire : le nombre de cibles et leur admissibilité ne sont pas validés selon le contrat.** Carreau possède `target: 1`. Lui fournir les deux personnes ci-dessus, sans dépense de surpuissance, donne pourtant un aperçu prêt puis blesse les deux de 30 à 24 B. Le bonus de cibles de surpuissance est affiché, mais ne sert pas à borner la sélection. Le panneau propose les mêmes cases pour tous les sorts.

Attendu : conserver la possibilité de sélectionner ensemble alliés et adversaires lorsque le sort affecte toutes les personnes dans la zone ; contrôler séparément le nombre de cibles autorisé, les exclusions et les restrictions propres au sort. Refuser un Carreau à deux cibles sans extension valide. Ne pas filtrer globalement les alliés des sorts de zone. Tester une zone mixte, les sorts réservés aux alliés, une cible unique et son extension par surpuissance.

Preuve : `review-magic-multi-target.mjs` dans le dossier temporaire de contrôle Codex. Aucun changement du moteur.
