# Confrontation indépendante — contrats divins V5

> **Correction documentaire du 17 octobre 2026 : les neuf sources ont été retrouvées dans Up in Arms p.79.** Elles demandent une adaptation V4/V5; les contrats restent bloqués, avec leur ancien motif dans le registre. Voir [le complément de sources](DIVIN_COMPLEMENT_SOURCES.md). Les nombres de tests ci-dessous décrivent la recette du code inchangé.

Contrôle réalisé sur le code raccordé au 17 octobre 2026. Cette note distingue les comportements reproduits par tests des constats de lecture; elle ne certifie pas le dépôt entier.

## Verdicts vérifiés

| Sujet | Sondage réel | Résultat |
|---|---|---|
| Forme de fiche | `ficheSnapshot()` avec `carac.soc.base=80`, `skillsAdvanced: Prière`, `talentsAcq: Invocation (Myrmidia)`, `prieres: Bouclier de Myrmidia` | Le moteur résout talent, compétence et prière de la fiche; durée du Bouclier = Bonus de Soc 8 rounds; échéance fin de Round 8 acceptée. |
| Bornes d’entrée | Jet 101, dépense de deux choix d’extension sur un seul palier; Péché 1 000 | Jet 101 rejeté (`invalid`); extensions excédant les DR rejetées; Péché 1 000 accepté, car la règle V5 ne fixe pas de maximum, déclenche le Courroux et renvoie `151+` après le modificateur. |
| Actualisation source | Vrai `refreshReferences()` alimenté par les CSV du dépôt; nom du Bouclier modifié dans l’export Miracle en mémoire | Après succès du rafraîchissement, `validateDivineSources()` refuse le contrat avec « description publique … a changé ». Aucun CSV n’est écrit. Les descriptions Béni/Invocation sont également comparées à leurs pins. |
| Colère p.219, 136–140 | Relecture visuelle de toutes les plages 101–151+ dans `base-219.png` | Les talents Béni et Invocation sont perdus jusqu’à deux pénitences; la première restitue Béni, la seconde Invocation. L’ancien résumé inversait perte/restauration; le générateur, registre et test catalogue sont corrigés et le test exige cet ordre. Les autres résumés 101–151+ restent conformes à cette relecture. |
| Recouvrement DIV-05 | Aperçu Store avec une couche magique +5 CC avant Bataille; puis couche PA magique `all:+2` avant Bouclier | Les deux aperçus sont bloqués avant commit avec le conflit DIV-05. Pas de valeur combinée projetée par ce flux. |
| Cibles explicites | Contrôle de seuil de Péché avec cible fournie au Bouclier | Le contrat ciblé passe avec cible/faits explicites; l’ancienne fixture `targets=[]` a été corrigée avant la suite finale. |
| Clé de caractéristique réelle | `ficheSnapshot()` avec compétence Prière `carac:'soc'` et caracs `{Soc:80}` | La résolution ignore la casse des clés sans masquer les doublons contradictoires; score Prière 90 avec Sociabilité courante 90, base 80, base/snapshot inchangés. |
| Échec / sauvegarde refusée | Tests moteur et Store existants | Prières sans jet et courroux non résolu ne committent pas; test de persistance refusée laisse état/historique inchangés et le même aperçu peut être réappliqué après rétablissement. |

## Retrait manuel : défaut détecté puis corrigé

Le test de non-régression a d’abord échoué et la preuve rouge est conservée dans `tmp/divin/manual-end-red.log` : terminer `sun-a` gardait l’état `sun-a-state` en plus de `sun-b-state`. Le parent a corrigé `endStoreDivinePrayer()` pour supprimer les états portés uniquement par les couches terminées, tout en calculant les ID encore référencés par les couches conservées. La preuve verte `tmp/divin/manual-end-green.log` montre la vérification initiale (crosscheck + Store, 14/14). Le test source-crosscheck impose maintenant que les états deviennent uniquement `sun-b-state`; une sonde additionnelle confirme qu’un état partagé par `sun-a` et `sun-b` survit à la fin de `sun-a`. Ces cas protègent le ciblage par occurrence/source.

Limite de portée : le miracle Soleil flamboyant V5 actuel a une durée Instant et le niveau Aveuglé suit la récupération normale de la Condition; le test de retrait emploie deux couches synthétiques afin de vérifier le nettoyage de futures couches conditionnelles temporaires/manuelles. Il ne prétend pas que le Soleil V5 actuel doive expirer comme un effet à durée.

## Interprétation moteur / projections

- `previewStoreDivine()` recalcule via le contrat canonique, puis `unresolvedCombination()` bloque les bonus de même caractéristique et les couches de PA magiques/divines. `finalizeDivineState()` répète le garde-fou à la transition de combat.
- `refreshEffectLayers()` passe les effets magiques et divins à `calculateEffectiveStats()` et `calculateEffectiveMagicAP()`; le chemin normal d’application est protégé par le refus DIV-05 précédent. Une importation/modification d’état qui injecte directement des couches superposées peut toutefois contourner l’aperçu préalable; la transition finale sera refusée, mais une projection locale appelée hors Store peut calculer sa non-cumulativité habituelle. À garder dans les règles d’import/réparation d’état.
- `applyDivineExecution()` ne crée pas de couche d’effet sur un échec de Prière (`appliedTargets=[]`). Soleil applique Aveuglé selon la récupération normale de la Condition; l’instantanéité de son effet n’est pas remplacée par une échéance de Round. Les marqueurs des prières manuelles temporaires sont suivis en couche avec expiration explicite.

## Source UI et tests

- Le panneau utilise les contrats du registre, contraint visuellement le jet d100 à 1–100 et demande les faits de cible. Ces bornes HTML ne sont pas seules : le moteur valide aussi l’entier et les limites; les DR dépensés sont contrôlés au calcul.
- `tests/divin-v5-source-crosscheck.test.js` couvre six sondes (fiche réelle, bornes, DIV-05 CC et PA, fin ciblée plus état partagé, rafraîchissement de miracle et talent). L’ancienne fixture de Bouclier sans cible a été corrigée; le test moteur couvre désormais aussi les vraies clés de caractéristique `soc`/`Soc`.
- Verdict final du 17 octobre 2026 : exécution unique de `node --test tests/divin-v5-catalogue.test.js tests/divin-v5-source-crosscheck.test.js tests/divin-v5-control.test.js tests/divin-v5-store.test.js tests/divin-v5-engine.test.js`, 49/49. Les échecs antérieurs (contrôle 34/35 et moteur 9/11) décrivaient des fixtures avant correction et ne constituent plus des limites actuelles. `node tools/build-v5-divine-contracts.mjs --check` avait passé deux fois après la génération du fingerprint final. Tests d’intégration navigateur non lancés dans cette passe.

## Complément du contrôle final principal

Après les passes de cette note, la recette complète du 2026-10-17T09:48:50.368Z passe à 2308 tests Node, dont 54 tests divins (catalogue 6, sources 6, moteur 14, contrôle 16, Store 12), et 11 commandes vertes. Les nouvelles preuves couvrent aussi les états partagés à l’expiration, le garde de répertoire du générateur et la liaison de l’aperçu confirmé. Les recettes UI, cloud local et hors ligne sont détaillées dans `DIVIN_RAPPORT.md`; le scénario Soleil en navigateur reste un appel Store, pas une recette complète de formulaire. Le résultat 49/49 ci-dessus décrit la passe historique de l’agent sources.
