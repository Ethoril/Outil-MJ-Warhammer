# Suivi du développement Fiches PJ et référentiels

Développement autorisé le 8 octobre 2026. Base Git : 3bc07ed880561831334f6d96dc9755a6afe6e47d, version 3.11.1. Branche de travail : codex/fiches-pj-referentiels. Worktree : F:\OutilMJ\worktrees\fiches-pj-referentiels.

Le cahier des charges version 1.3 et ses 40 cas de recette font foi. Le lot 1 est livré et réceptionné en production après les correctifs jusqu’à 3.12.3 et les confirmations du MJ (récupération des fiches, connexion et reprise sur Chrome Android) ; le lot 2 des effets de talents et de la durée des états est préparé mais attend sa sélection détaillée. Le lot 3 prévoit une application mobile pour les séances, à lancer après stabilisation et validation des lots précédents. La magie reste consultative. La version 3.12.0 a ensuite été publiée sur demande explicite ; GitHub Pages et les règles Firebase v3 ont été contrôlés après déploiement.

## Lots et responsabilités

| Sous-lot | Responsable | Livrable | État |
|---|---|---|---|
| 1.0 Sources et contrats | Référentiels + contrôle | Sources, matrice des divergences, contrats purs | Intégré, contrôlé localement |
| 1.1 Référentiels | Sous-agent references_equipment | Paquet versionné, alias, cache et génération | Intégré, contrôlé localement |
| 1.2 Modèles et migration | Sous-agent fiche_core + chef d'orchestre cloud | Champs conservés, schéma v3 et reprise v2 | Intégré, contrôlé localement |
| 1.3 Synchronisation PJ | fiche_core + chef d'orchestre source/UI | Aperçu, liens confirmés, idempotence et santé | Intégré, contrôlé localement |
| 1.4 Combat et protections | references_equipment + chef d'orchestre UI | Six zones, couches, conditions et choix de contexte | Intégré, contrôlé localement |
| 1.5 Aides et harmonisation | references_equipment + chef d'orchestre UI | Consultation objets/talents et définitions communes | Intégré, contrôlé localement |
| 1.6 Recette | Sous-agent indépendant controle | Baseline, tests adversariaux, revue et limites | Recette locale et 37 contrôles Auth/RTDB sous émulateurs passés ; récupération des fiches et reprise sur téléphone Chrome confirmées par le MJ en production ; limitation Brave acceptée |
| 2 Talents mécaniques et durée des états | À cadrer ultérieurement | Cahier détaillé des talents et de la durée des états, puis moteurs | Préparé, pas lancé |
| 3 Application mobile de séance | À définir après stabilisation | Cadrage mobile, prototype des parcours de séance, application et recette sur appareils réels | Planifié et différé ; lancement après validation des lots précédents |

## Frontières de fichiers

references_equipment possède les modules de référence/équipement/calcul, les instantanés et les scripts de génération. fiche_core possède le snapshot, plans et application, les modèles, sanitize, migrations, Store, rencontres et importeurs. Le chef d'orchestre possède les adaptateurs réseau, interfaces, protocole cloud, règles et PWA. Le contrôleur possède ses tests indépendants et le rapport de recette.

Tout chevauchement doit être convenu avant modification. Les sous-agents ne publient et ne poussent rien ; le chef d'orchestre intègre et décide des suites sur la base des contrôles.

## Décisions à préserver

- Synchronisation à la demande, aperçu et application unique annulable.
- Fiches sources faisant autorité ; contexte de scène et actions locales préservés.
- Reprise des anciennes actions par liaison explicitement confirmée.
- PV courants ajustés par delta de maximum pour conserver les Blessures subies ; états et tours inchangés.
- Six localisations et protections conditionnelles assistées ; bouclier séparé.
- Migration et multiappareils inclus au lot 1 ; clients anciens isolés des écritures v3.

## Preuves attendues

Rapport baseline et suites finales ; références/éditions identifiées ; tests du noyau, roundtrips et cloud ; parcours navigateur réel local ; recette d'accès Firebase publique/authentifiée distincte des simulations. Les accès réels aux fiches des PJ ne sont pas prouvés par les tests locaux. Le contrôle indépendant classe les écarts bloquants et les limitations de recette restantes.

## Livraison locale et suite

Les deux sous-agents de développement ont livré et gelé leurs modules. Le contrôleur indépendant a vérifié les invariants et détecté des défauts corrigés avant intégration finale. Le chef d'orchestre a raccordé les interfaces, les lectures et la migration cloud, puis unifié les boutons historiques d'attaque vers la résolution de Jouer.

La suite finale passe 397 tests, contre 320 en baseline. Les 37 contrôles HTTP des règles de production passent sous émulateurs Auth/RTDB isolés. Les parcours navigateur et les captures de bureau/mobile sont consignés dans le rapport de recette. Le service worker réel est vérifié à l’installation, au rechargement hors ligne et à la mise à jour explicite ; deux contextes navigateur avec IndexedDB natif couvrent la reprise et les conflits via un transport HTTP simulé. Le démarrage hors ligne du contexte MJ est vérifié avec identité persistée simulée. Les tests du protocole et des accès simulés ne prouvent pas l'accès réel aux fiches Firebase.

Le lot 2 reste à spécifier talent par talent : déclencheur, rang/spécialité, durée, cumul, cible, priorité, effets persistants et validation par exemples source. Aucun moteur supplémentaire de talent n'a été lancé dans le lot 1. La récupération réelle des fiches et la reprise sur téléphone Chrome ont ensuite été confirmées par le MJ après publication ; ces confirmations sont consignées ci-dessous, séparément des contrôles simulés. Les règles v3 sont éprouvées sous émulateur ; un JDK 21 portable et Firebase CLI isolés permettent de reproduire cette recette sans installation globale.

## Lot 3 différé : application mobile de séance

L’application mobile sera créée lorsque le reste de l’outil sera terminé, fiable et validé en séance. Elle reprendra les mêmes données et moteurs métier, avec une interface pensée pour la consultation et la conduite du combat sur téléphone. Les plateformes, la technologie, la distribution et les exigences hors ligne seront définies dans son cahier détaillé ; aucun développement mobile n’est lancé à ce stade.

## Correctif de démarrage 3.12.1

Après la publication 3.12.0, un navigateur utilisateur a signalé `ERR_BLOCKED_BY_CLIENT` sur `js/ui/log-view.js`. Cette dépendance statique empêchait l’évaluation de `main.js` et la liaison des boutons Google. Le module du journal est renommé `journal-view.js` pour éviter ce blocage de chemin ; ses imports et le précache sont actualisés.

L’écran initial indique désormais le chargement de l’espace. Le point d’entrée capture les erreurs du graphe de modules et propose un réessai explicite ; un démarrage prolongé propose également ce réessai. Aucun stockage local, compte, règle Firebase ni contenu de séance n’est supprimé ou changé par ce correctif.

La suite du projet passe 397 tests. La reproduction ciblée du blocage et la recette PWA passent sous Edge avec IndexedDB natif ; l’identité Auth du segment hors ligne est simulée. Le module renommé conserve exactement le contenu de l’ancien module. Le contrôle indépendant vérifie aussi un autre import bloqué, le message visible, le réessai et l’identité complète de l’état local avant/après. Le remplacement d’un worker déjà en attente exige de fermer tous les anciens onglets contrôlés et de laisser son activation se terminer avant réouverture.

## Correctif de reprise cloud 3.12.2

La connexion Google réussissait mais la reprise de la session v2 échouait avec « Enveloppe de sauvegarde incomplète ». Le défaut a été reproduit sur la copie v2 sauvegardée avant le déploiement : son état contient le combat, les lignes de dés, les extensions et schemaVersion=2, mais la réserve vide n’est pas matérialisée dans le document RTDB.

La migration cloud reconstruit uniquement `reserve: []` si le champ est absent, avant d’appeler la migration stricte existante. Un champ présent mais invalide reste rejeté ; un combat absent ou invalide n’est pas réparé implicitement. Les imports de fichiers gardent leur validation stricte. La source v2 et sa révision sont préservées ; une racine v3 existante n’est jamais remplacée. Aucune modification d’Auth ni des règles Firebase n’est incluse.

La suite passe 404 tests, dont sept nouveaux contrôles anonymes de cette structure cloud, des champs conservés, du rejet avant écriture et de l’initialisation unique v3. La recette de cache utilise désormais la version applicative courante pour rester reproductible après les correctifs.

Le contrôle indépendant passe sur la copie privée de la sauvegarde v2 : ses 12 lignes de dés et ses extensions sont conservées, la source reste intacte. Le test permanent `tests/cloud-sparse-v2-emulator.mjs` confirme avec Auth/RTDB locaux la suppression des listes vides, l’initialisation v3 unique, sa relecture et son adoption par le vrai Store/session, avec journal local préservé. Ce test Node utilise fake-indexeddb ; le contrôle navigateur séparé utilise IndexedDB natif et vérifie la mise à jour vers 3.12.2. Aucun test n’écrit dans la base de production et les règles restent identiques.

## Recette réelle et diagnostic de connexion 3.12.3

Le MJ confirme que la récupération des fiches fonctionne. Lors du premier essai multiappareils, sous Brave Android, la fenêtre Google reste blanche puis se ferme, suivie du message générique de connexion. La désactivation temporaire des protections Brave pour le site ne change pas le résultat. Brave Windows neuf, avec et sans émulation de présentation Android, atteint le formulaire Google ; cette émulation ne vaut pas une preuve sur Android physique.

La version 3.12.3 corrige le diagnostic : chaque échec de connexion affiche un message spécifique et son code Firebase assaini, sans inclure les données d’erreur privées. L’appel au SDK conserve le geste du clic et couvre aussi l’indisponibilité initiale et les erreurs synchrones. Aucun changement de méthode de connexion, de règle Firebase ni de stockage n’est inclus. La publication du diagnostic ne corrige pas le blocage Brave ; le résultat de la recette réelle et la décision de compatibilité figurent ci-dessous.

406 tests passent ; huit scénarios navigateur exercent la vraie branche applicative avec SDK simulé, messages/code, geste du clic et absence de rejet non traité. Le nouveau helper est inclus dans le précache. La redirection naïve n’est pas retenue : l’hébergement GitHub Pages est distinct de l’authDomain Firebase et les contraintes de stockage tiers doivent être prises en compte (documentation officielle Firebase : https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Réception du lot 1 et compatibilité navigateur — 8 octobre 2026

La publication 3.12.3 (commit `39fc071807d25cd649cbc8a26df5197e6eaccd57`) est terminée ; le contenu HTTP publié, le diagnostic d'erreur et le cache ont été vérifiés sans écriture dans les données de production.

Le MJ confirme que la connexion Google fonctionne sur le même téléphone Android dans Chrome et qu'il a récupéré ses données : la reprise entre ordinateur et téléphone est validée par cette recette utilisateur. La récupération des fiches était déjà confirmée. Ces observations de production complètent les tests locaux ; elles ne prétendent pas ajouter une recette physique exhaustive de tous les conflits et usages hors ligne.

Sur Brave Android, l'erreur réelle est `auth/popup-closed-by-user` : la fenêtre se ferme avant la fin de la connexion, malgré la désactivation des protections du site. La cause précise n'est pas établie. Brave n'est pas pris en charge pour la connexion Google et la synchronisation ; Chrome est le navigateur retenu sur Android. Le MJ accepte de documenter cette limitation et de passer à la suite. L'investigation Brave est close, sans nouveau changement d'authentification.

**Lot 1 clôturé avec cette limite de compatibilité acceptée.** Le lot 2 des effets de talents reste à cadrer et n'est pas lancé. Le lot 3 de l'application mobile demeure différé jusqu'à la stabilisation des lots précédents ; la magie reste consultative au lot 1.

## Ajout de périmètre au lot 2 — 8 octobre 2026

À la demande du MJ, la durée des états est ajoutée au lot 2, en complément des effets de talents. Le cadrage devra définir le suivi de la durée restante, le décompte, l’expiration, les cumuls ou prolongations et la conservation à la reprise entre appareils. Les modalités seront spécifiées avant développement ; aucun moteur nouveau n’est lancé par cet ajout documentaire.
