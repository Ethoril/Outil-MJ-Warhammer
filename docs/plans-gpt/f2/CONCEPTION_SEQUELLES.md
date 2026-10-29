# Conception proposée — F2-J : séquelles et soins hors combat

Statut : proposition pour validation du MJ après T3 ; aucun code F2-J n'est autorisé par ce document. Sources de cadrage : `PLAN_F2_LOTS.md` F2-J et exécution T4, `F2_REPERAGE_T3.md`, décisions du MJ dans `CHOIX_EXECUTANT_PHASE_F2.md`. Les détails mécaniques et difficultés devront être confrontés aux pages des sources avant implémentation.

## Identité et données

Conserver `extensions.v5.criticalAftermath[]` comme registre source F2-I : identifiants `id`, `criticalWoundId`, `resolutionId`, participant, table et version, localisation, effets et provenance. Ne pas recréer un critique ni interpréter un rappel libre comme mécanique. Proposer un registre versionné de suivi J par personnage, avec identifiant stable, référence à l'occurrence F2-I et au personnage, type, localisation, provenance, statut, faits et décisions du MJ, étapes, échéances et reçus. Une séquelle indépendante d'un critique doit porter sa propre provenance. Les événements et effets ont des identifiants idempotents ; plusieurs lésions d'un même critique restent distinctes.

Les malus durables d'amputation reportés de T2 sont rattachés à l'amputation effectivement confirmée dans le registre F2-I (y compris les chocs et leurs parties). Ils ne sont pas déduits d'une amputation conditionnelle non confirmée. Les pertes, adaptations, guérisons, modifications de caractéristiques et règles de cumul sont représentées séparément et sourcées ; l'absence d'un fait nécessaire est signalée au MJ, sans valeur supposée. La fermeture du suivi ne supprime pas l'historique ni les effets permanents encore applicables.

## Calendrier de convalescence

Un calendrier dédié, indépendant de `v5-game-time.js` et `v5-campaign-time.js`, conserve une origine explicite, un jour entier courant et une semaine impériale de huit jours. Les dates et durées de chaque étape précisent unité, ancre, échéance et statut. L'avancement est une commande MJ annulable, avec aperçu des échéances et décisions à traiter ; un saut ne doit ni ignorer silencieusement un test quotidien ni inventer son résultat. Les règles d'infection, d'immobilisation, de fracture et de déchirure sont appliquées à partir de leurs sources et des faits saisis. L'horloge de magie ne bouge jamais quand ce calendrier avance, et inversement.

## Interface MJ et opérations

Une vue par personnage présente les critiques liés, lésions, effets actifs, soins déjà consommés, dates et prochaines décisions avec leur provenance. Le MJ peut saisir les faits manquants, résultats de Tests, soins et décisions, consulter un aperçu puis confirmer ; chaque opération fournit un reçu ou un motif de refus. Prévoir Guérison et Soins aux animaux, un soin par incident, fournitures et maladresse, chirurgie, suivi de maladie et infection, ainsi que les étapes de fracture et de déchirure définies par les sources. Les états et malus temporaires gouvernent la clôture ; un soin n'efface pas une séquelle permanente implicitement. Aucune mort n'est appliquée sans confirmation du MJ.

## Migration, persistance et fiche

Les anciennes sauvegardes sans registre J restent lisibles : initialisation vide, puis proposition explicite de reprise des enregistrements F2-I existants, sans double création ni application rétroactive silencieuse. Conserver les données inconnues et les versions ; une migration répétée ne produit pas de doublon. Les commandes, calendrier, reçus et liens doivent survivre à Undo/Redo, sauvegarde et rechargement, retrait ou réimport du participant, sans rapprochement par nom. Les effets durables et pertes de caractéristiques sont documentés dans `docs/VARIABLES_PERSISTANTES_PJ.md` avec identité de fiche, valeur et provenance ; préparer un contrat de retour et la résolution des conflits de réimport, sans écrire vers la fiche avant la phase autorisée.

## Découpage et vérification avant T4

J1 : registre, calendrier, soins et infection ; J2 : séquelles, étapes de guérison et malus permanents. Chaque règle exige sa page source, ses cas limites et une vérification indépendante. Tester notamment jour et semaine de huit jours, saut avec échéances, absence d'avancement de magie, quota de soin, coexistence de lésions, confirmation des amputations conditionnelles, migration répétée, anciennes sauvegardes, Undo/Redo, rechargement et réimport. Les ambiguïtés restent soumises au MJ ; ne pas déclarer couvert un rappel sans chemin mécanique complet.
