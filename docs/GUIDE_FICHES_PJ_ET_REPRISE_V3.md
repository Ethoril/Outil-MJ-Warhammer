# Fiches PJ : usage, actualisation et reprise v3

## Connexion et navigateurs

Sur téléphone Android, utiliser **Chrome** pour se connecter avec Google et synchroniser la séance. La connexion et la récupération des données entre ordinateur et téléphone ont été confirmées par le MJ en production le 8 octobre 2026, avec la version 3.12.3.

Brave n'est pas pris en charge pour la connexion Google et la synchronisation. Sur Brave Android, la fenêtre Google se ferme avec `auth/popup-closed-by-user`, y compris après désactivation des protections du site. Le MJ accepte cette limitation et la clôture de l'investigation Brave. Ne pas effacer les données locales pour contourner cet échec.

Utiliser le même compte Google sur les deux appareils pour reprendre les données de la séance. La connexion au projet des fiches reste distincte de celle de la séance MJ.

## Synchroniser les PJ

Dans la bibliothèque, ouvrir « Mettre à jour les PJ », se connecter avec le compte Google MJ autorisé dans le projet des fiches, puis attendre la lecture. L'application Firebase des fiches est distincte de celle de la séance MJ. Les lectures demandent les données serveur ; une fiche absente ou inaccessible est signalée sans vider son profil.

Associer chaque fiche à un seul profil PJ. L'aperçu distingue les ajouts, changements, retraits et collections absentes ou invalides. Une collection explicitement vide autorise le retrait de ses anciennes entrées source. Une collection absente ou structurellement invalide conserve les données précédentes. Les données d'un exemplaire personnalisé restent celles déclarées par la fiche.

Pour chaque arme ou parade, choisir explicitement une compétence acquise. Une suggestion ne vaut pas confirmation. Une arme non liée reste consultable mais son action ne peut pas être lancée. Pour remplacer une ancienne action locale, choisir cette action dans « Rapprochement explicite ». Sans ce choix, elle reste indépendante. Ses réglages de scène sont conservés après adoption. La conversion des anciens dégâts fixes en BF + bonus demande également confirmation.

Appliquer le lot une seule fois. La source et la séance sont revérifiées avant l'application ; un aperçu périmé doit être relu. L'opération est atomique et annulable. Les profils, combattants actifs, scènes suspendues et personnages persistants suivent leurs liens d'identité. Les archives restent historiques. Les états, tours, notes et réglages de scène sont conservés.

Le profil de réserve d’un PJ lié reste un modèle à pleine santé (`hp = maxHp`). La santé courante appartient au personnage persistant et aux participants. Pour ces états de séance, lorsque le maximum est connu, les blessures subies restent identiques : 8/14 devient 10/16 ; 4/10 devient −2/4 si le maximum passe à 4. Les PV négatifs ne sont pas plafonnés et aucun effet de seuil n'est déclenché par la synchronisation. Les maxima inconnus sont signalés. Une nouvelle synchronisation identique ne répète pas cet ajustement.

L’export de fin de combat conserve ce maximum dans la réserve et reporte la santé sur le personnage persistant lié. Sans lien unique, ou si plusieurs copies ont des santés différentes, il affiche un avertissement et conserve le personnage persistant précédent ; aucun personnage n’est créé implicitement.

Les compétences, talents, armes, armures, sorts et prières se consultent dans les profils et sur les combattants. Les valeurs liées à la fiche se modifient dans la fiche source. Notes, groupes et actions locales restent modifiables dans l'outil MJ. Les effets automatiques de talents et la durée des états appartiennent au lot 2 ; l’automatisation de la magie et des prières est prévue au lot 3. L’application mobile dédiée passe au lot 4, après stabilisation des lots précédents. La magie et les prières restent consultatives dans la version actuelle.

## Protections et résolution

Les PA sont affichés séparément pour la tête, le corps, chaque bras et chaque jambe. Les couches et les conditions suivent les fonctions partagées avec les fiches. Le bouclier reste distinct de l'armure portée.

Dans une attaque, ouvrir « Protection et bouclier » pour préciser le bouclier utilisé, sa disponibilité, l'opposition, la distance et la visibilité lorsque ces informations sont nécessaires. Une condition manquante ou une définition dont l'édition n'est pas couverte suspend l'application automatique. Les PA retenus après arbitrage peuvent être saisis explicitement. Une munition déclarée ne s'ajoute qu'à une arme à distance compatible ; les paramètres des mots clés sont conservés.

Les effets calculés et les éléments à arbitrer sont expliqués dans l'aperçu. Inoffensive exige deux jets de gravité lorsque son effet s'applique. Le calcul affiche le résultat retenu avant toute application.

## Actualiser les aides de jeu

La bibliothèque des règles indique la source, la version utile, la date de collecte et le statut du cache. L'actualisation charge les feuilles nécessaires comme un ensemble : un échec conserve entièrement le dernier ensemble valide. Le changement de date seul ne change pas la version utile. Les définitions restent consultables hors ligne après installation du cache de l'application.

Source commune : [Aides de jeu](https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/edit). Voir la matrice des références pour distinguer les feuilles effectivement disponibles des règles et tables locales dont la source commune reste à préciser.

Pour reconstruire le paquet depuis le projet des fiches :

```powershell
node tools/generate-reference-catalog.mjs --source-dir="F:\Outil WRPGv4\ennemi-interieur-wfrp4"
node tools/refresh-reference-catalog.mjs
node --test
```

Pour reproduire la collecte depuis les CSV versionnés :

```powershell
node tools/refresh-reference-catalog.mjs --csv-dir=js/data/reference-source-csv
```

Inspecter le manifeste et la différence de contenu après régénération. Un nouveau texte d'effet n'autorise pas automatiquement son moteur : adapter son contrat d'édition et ses tests avant de le déclarer couvert. Le cache du service worker doit inclure tous les modules et données ajoutés.

## Reproduire la recette locale

```powershell
npm test
npm run test:browser
npm run test:fiches-browser
npm run test:references-browser
npm run test:pwa-sessions
$env:LOT1_BROWSER_FINAL="1"
node --test tests/lot1-final-control.test.js
Remove-Item Env:LOT1_BROWSER_FINAL
.\tests\run-firebase-v3-emulators.ps1
```

Sur ce poste, les scripts navigateur historiques utilisent `PLAYWRIGHT_EXECUTABLE_PATH` pour choisir Edge. Le dernier script teste un vrai service worker et deux contextes navigateur avec IndexedDB natif ; son transport HTTP simule le protocole de synchronisation. Il vérifie également le démarrage à froid hors ligne d’un contexte MJ, avec identité Auth persistée simulée. Une identité reconnue par Firebase permet de restaurer son contexte local hors ligne ; une nouvelle connexion Google demande du réseau. Le lanceur Firebase utilise les émulateurs Auth et RTDB locaux avec un projet `demo-`, les règles de production et un JDK 21 portable. Ses prérequis isolés et ses limites figurent dans le rapport de recette. Aucun de ces tests ne se connecte à une séance cloud réelle.

## Préparer la publication

La version 3.12.3 est publiée, avec schéma et protocole 3. Le lot 1 est réceptionné : récupération des fiches et reprise sur Chrome Android confirmées par le MJ, avec la limitation Brave documentée. La procédure ci-dessous décrit la bascule initiale et reste la référence pour les publications suivantes.

1. Exporter une sauvegarde de la séance depuis la version actuelle et conserver une copie du document cloud v2 avant bascule.
2. Exécuter la suite unitaire, le smoke navigateur, la recette dédiée fiches et les règles RTDB v3 sous émulateur. Les tests simulés ne remplacent pas une lecture avec le compte MJ et App Check.
3. Valider la lecture réelle des fiches sur l'origine publiée, la reprise de deux appareils, les refus d'accès et le fonctionnement hors ligne. Consigner les résultats dans le rapport de recette.
4. Déployer les règles RTDB v3 validées puis publier le commit applicatif validé depuis la branche isolée. Les règles rendent v1/v2 accessibles en lecture au propriétaire et bloquent leurs écritures ; elles limitent v3 au propriétaire avec schéma 3 et révisions valides.
5. Vérifier la fin du déploiement, la version HTTP, l'activation du service worker et la reprise effective d'une séance.

La première connexion v3 lit v2 si aucune racine v3 n'existe, migre son état puis initialise v3 par transaction. Une racine v3 déjà créée, y compris par un autre appareil, gagne la course et n'est jamais remplacée. Les opérations v2 en attente ne sont pas rejouées dans v3 : l'état local est conservé pour un choix explicite. Aucune écriture de migration ne modifie la racine v2.

## Retour et récupération

Conserver le worktree et les sauvegardes de la bascule pour inspection. La production utilise désormais le schéma v3 ; changer de checkout local ne revient pas sur cette migration distante.

Après création de données v3, revenir à un client v2 peut masquer les nouvelles données et n'est pas un retour sûr. Préférer une version corrigée capable de lire le schéma 3. Une restauration historique doit être explicite, depuis une sauvegarde validée, après export de l'état v3 courant ; ne jamais écraser le namespace v3 pour contourner une erreur de migration. Restaurer les règles et l'application comme un ensemble validé, sans rendre les chemins accessibles publiquement.
