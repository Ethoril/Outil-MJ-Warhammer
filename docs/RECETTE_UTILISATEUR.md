# Recette utilisateur locale

Cette recette vérifie l’application locale en mode invité. Elle ne déploie rien et n’écrit pas dans Firebase de production.

## Démarrer l’application

Depuis la racine du projet :

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8765/` dans Chrome. `localhost:8765` et `127.0.0.1:8765` sont deux origines distinctes et ne partagent pas leur stockage local. Pour une recette manuelle reproductible, rester sur une seule des deux adresses.

## Parcours fonctionnels

1. Dans **Préparer**, créer un profil complet avec nom, type, groupe, initiative, PV, endurance, armures, caractéristiques et une action préparée ; chaque case d’un jet montre une infobulle d’aide au survol. Recharger la page et vérifier les valeurs. Créer ensuite un profil par **Nouveau profil → Créer depuis un JSON** : **Insérer un exemple**, **Vérifier le JSON**, relire l’aperçu, **Créer 1 profil**, puis ouvrir **Modifier** et vérifier que toutes les cases sont remplies (format : [IMPORT_PROFILS_JSON.md](IMPORT_PROFILS_JSON.md)).
2. Dans **Bibliothèque**, rechercher un nom, un tag ou le nom d’une action. Ouvrir **Règles et mots-clés** et vérifier que les références, dont `Sonné`, sont visibles. Modifier, dupliquer puis supprimer une fiche de test.
3. Dans **Préparer**, cliquer **Nouvelle rencontre**, ajouter au moins deux profils actifs et cliquer **Lancer la rencontre** (ou fermer la fenêtre : la rencontre reste dans la liste **Rencontres** et se lance par **Lancer**, se rouvre par **Modifier**, se retire par **Supprimer**). Dans **Jouer**, cliquer une ligne de la piste de gauche, avant puis après **Commencer le combat** : ce combattant devient le personnage actif (« Personnage actif », ou « Agit hors tour » quand ce n’est pas son tour, le ▶ restant sur le combattant du tour) et ses actions préparées sont visibles ; **Tour suivant** repart du combattant du tour.
4. Ouvrir une action physique, choisir le type, la cible (puces **Cible** de Résolution) et un jet déterministe (le d100 lancé à la table se tape dans la case, puis Entrée). Pour une attaque, la défense de la cible propose ses jets enregistrés à côté de CC et Ag ; un jet de type Défense est choisi d’office. Prévisualiser le résultat puis cliquer **Appliquer les conséquences**. Vérifier le PV de la cible et l’entrée du journal. Utiliser `Annuler` puis `Rétablir` sur une modification PV et vérifier les deux valeurs.
5. Dans **Événements**, créer une jauge manuelle. Créer un événement qui l’avance, enregistrer et prévisualiser, appliquer explicitement la conséquence, fermer puis rouvrir le panneau et vérifier la valeur.
6. Dans **Et si…**, choisir une action, un jet et plusieurs cibles. Cliquer **Comparer toutes les cibles**, puis **Choisir ce résultat** sur une seule cible. Vérifier que seule cette cible change. Abandonner un aperçu sans appliquer ne modifie aucune fiche.
7. Pour E04, cliquer **Sauvegarder**, charger le fichier local et accepter le remplacement après lecture de l’aperçu. Modifier ensuite un PV, ouvrir **Restaurations**, prévisualiser le point `Import remplacé`, confirmer **Restaurer**, recharger et vérifier que les profils et la scène reviennent à l’état du point.
8. Dans **Préparer**, la carte de la rencontre en cours indique **En cours** ; cliquer **Suspendre**, recharger puis cliquer **Reprendre** sur la carte (ou dans le menu ⋯). Vérifier que les participants et leur PV sont conservés. Ajouter un personnage persistant, clôturer avec aperçu, puis vérifier l’archive et le report.
9. Passer hors ligne avec les outils locaux, faire une modification, recharger et revenir en ligne. L’état local doit rester lisible ; une divergence de compte doit présenter une résolution explicite avant publication.
10. Pendant un combat d’essai (dégâts, états, tours, combattant ajouté), cliquer **Recommencer** sur la carte de la rencontre en cours dans **Préparer** (ou **Recommencer le combat** dans le menu ⋯) et confirmer : PV, états, tours et combattants reviennent à la composition de la rencontre, le combat n’est plus commencé. **Annuler** (toast ou ↶) rend l’état d’avant.

## Recette automatisée de référence

Depuis la racine :

```sh
npm test -- --test-concurrency=1
node tests/browser-index.mjs
node tests/browser-smoke.mjs
node tests/browser-workspace.mjs
node tests/browser-e05.mjs
node tests/browser-e05-legacy.mjs
node tests/browser-offline.mjs
```

La recette Playwright utilise Chrome local, un serveur loopback temporaire, un profil isolé, Firebase simulé et des service workers bloqués. Elle produit les captures denses suivantes : `/private/tmp/mj-index-play-15-dark-1440.png` et `/private/tmp/mj-index-play-15-dark-900.png`.

## Limites

Les règles Firebase v1/v2 ont été publiées et relues dans la console de production le `23/09/2026`. Depuis la bascule, v1 est en lecture seule pour son UID propriétaire; v2 autorise lecture et écriture seulement pour son UID propriétaire. Les tests simulateur confirment le refus d’un invité et d’un autre UID ; ils ne constituent pas un test utilisateur réel de synchronisation. Les règles n’ont changé aucune donnée et une sauvegarde serveur a été exportée le `23/09/2026`. La fixture `firebase.database.rules.v2.test.json` reste réservée aux tests. Le site GitHub Pages est distribué depuis la branche `main`.

## Parcours divins (3.17 à 3.21)

Ce parcours guidé permet au MJ de vérifier pas à pas, à la table dans l’onglet **Jouer**, les fonctions divines et transversales livrées entre les versions 3.17 et 3.21.

### 1. Bénédictions

1. **Protection (Test de Calme de l’attaquant, une fois par ennemi)**
   - **Action** : Appliquer la *Bénédiction de Protection* sur un allié. Sélectionner ensuite un ennemi comme acteur et préparer une attaque contre cet allié dans le panneau **Résolution**. Tester d’abord l’option `Échec : autre cible ou Action`, puis choisir `Réussite` et appliquer l’attaque ; enfin, préparer une seconde attaque du même ennemi contre ce même allié, puis une attaque d’un second ennemi.
   - **Résultat attendu** : Lors de la première attaque ennemie, le sélecteur `Bénédiction de Protection : Test de Calme Accessible (+2 DR) de l’attaquant` apparaît (`À saisir`, `Échec : autre cible ou Action`, `Réussite`). Tant que la valeur est `À saisir` ou `Échec`, l’attaque est bloquée comme non applicable. Dès qu’une attaque est appliquée avec `Réussite`, cet ennemi est mémorisé pour le reste de la bénédiction : le sélecteur n’apparaît plus pour lui aux attaques suivantes, mais continue d’apparaître pour tout autre ennemi non encore testé avec succès.
2. **Souffle (Manann, Morr)**
   - **Action** : Placer un combattant dans un vortex à étouffement, lui appliquer la *Bénédiction de Souffle*, puis faire avancer les Rounds. Tester également le cas d’un personnage sans *Souffle* tombé à `0` Blessure dans le nuage pendant un nombre de Rounds égal à son Bonus d’Endurance.
   - **Résultat attendu** : Tant que *Souffle* est actif (`doesNotBreathe`), l’étouffement du vortex est ignoré à chaque passage de Round (aucune perte de Blessures ni progression du compteur d’asphyxie), tout en laissant la couche du vortex en place pour qu’elle reprenne effet si la bénédiction expire avant la sortie du nuage. Sans *Souffle*, un personnage maintenu à `0` Blessure dans le vortex atteint bien la mort par asphyxie au bout de BE Rounds.
3. **Sauvagerie**
   - **Action** : Appliquer la *Bénédiction de Sauvagerie* à un combattant, puis lui faire infliger une Blessure Critique (via une attaque principale, un second critique, une riposte/défense, une cible secondaire de Tourbillon ou un sort offensif).
   - **Résultat attendu** : Le talent injecté *Frappe blessante* permet de choisir la gravité parmi deux jets de critique, et la couche de *Sauvagerie* est consommée et retirée dès ce premier critique infligé.
4. **Chance (échec propre et opposition perdue)**
   - **Action** : Appliquer la *Bénédiction de Chance* à un personnage. Dans **Résolution**, saisir un jet d’échec, cocher `Relancer ce Test avec 1 Point de Chance (Fortune)` et renseigner `Nouveau jet de relance (Chance, d100)`. Répéter l’essai sur un Test opposé où le jet propre de l’acteur est réussi (inférieur ou égal au seuil) mais battu aux DR par le défenseur.
   - **Résultat attendu** : Dans les deux situations (Test propre raté ou Test propre réussi mais perdant l’opposition), la relance est gratuite : la faveur de *Chance* est consommée à l’application sans diminuer le solde de Points de Chance (Fortune) de la fiche.

### 2. Miracles

1. **Morsure du Loup (Ulric)**
   - **Action** : Lancer *Morsure du Loup* sur le prêtre, puis infliger une Blessure Critique d’abord avec une attaque de combat (principale, riposte, défense ou Tourbillon), et ensuite avec un sort offensif ou un vortex.
   - **Résultat attendu** : En combat, le jet de gravité du critique est automatiquement majoré de `+20`. Lors d’un critique d’incantation (sort direct ou vortex), le reçu affiche explicitement `(+20 à la gravité : Morsure du Loup)` à côté de la sévérité saisie.
2. **Écraser les faibles (Ulric)**
   - **Action** : Lancer *Écraser les faibles*, rater une attaque (mêlée ou tir), cocher `Relancer ce Test avec 1 Point de Chance (Fortune)` et saisir le nouveau jet ; recommencer au Round suivant. Tester aussi lorsque le personnage porte simultanément la *Bénédiction de Chance*.
   - **Résultat attendu** : Une attaque ratée par Round bénéficie d’une relance gratuite sans dépenser de Point de Chance, et le droit à relance se recharge au début du Round suivant. Si *Chance* est également active, la relance par Round d’*Écraser les faibles* est consommée en priorité afin d’épargner la relance unique de *Chance*.
3. **Fortune généreuse (Ranald — case et indice d’inversion)**
   - **Action** : Lancer *Fortune généreuse* sur un personnage. Dans **Résolution**, saisir un jet d’échec dont l’inversion est inférieure ou égale au seuil (par ex. `82` sous un score de `50`) sans cocher la case d’inversion ; cocher ensuite `Inverser les dés de ce Test (Fortune généreuse : 82 devient 28)` et appliquer.
   - **Résultat attendu** : Tant que la case n’est pas cochée, l’aperçu affiche sous la case l’indication `L’inversion (28) réussirait ce Test.` sans consommer la faveur. Lorsque la case est cochée et la résolution appliquée, le jet inversé (`28`) est utilisé et la faveur d’inversion à usage unique est consommée.
4. **N’écoutez point la Sorcière (Sigmar)**
   - **Action** : Lancer *N’écoutez point la Sorcière* en cochant les participants situés dans la zone du prêtre, puis faire lancer un sort par un lanceur de sorts en visant au moins l’un de ces participants.
   - **Résultat attendu** : Le Test d’Incantation du sort subit automatiquement un malus de `-2 DR` (appliqué une seule fois par lancement, même si plusieurs cibles du sort sont dans la zone).
5. **Malice de Ranald (Tests opposés seulement)**
   - **Action** : Lancer *Malice de Ranald* en ciblant un adversaire unique et en sélectionnant deux Caractéristiques distinctes dans `Première Caractéristique égalée (d10 : 1-2 CC, 3-4 I, 5-6 Int, 7-8 Soc, 9-0 au choix)` et `Seconde Caractéristique égalée (doublon : relancer)`. Observer la fiche du prêtre, effectuer un Test non opposé, puis effectuer un Test opposé contre cet adversaire sur l’une des Caractéristiques choisies.
   - **Résultat attendu** : La fiche du prêtre et ses Tests simples (ou opposés à un autre ennemi) conservent ses Caractéristiques normales ; lors d’un Test opposé contre l’adversaire désigné impliquant l’une des deux Caractéristiques retenues, le seuil du prêtre utilise la valeur courante de l’adversaire (même si elle est inférieure).
6. **Attaque Rapide (Myrmidia — rappel de début de Round et attaque hors séquence)**
   - **Action** : Lancer *Attaque Rapide* sur le prêtre, passer au Round suivant, puis ouvrir **Résolution** pour une attaque et cocher `Attaque rapide (Myrmidia) : attaque gratuite hors séquence`.
   - **Résultat attendu** : Au début du Round, le rappel `Attaque Rapide disponible pour <Nom> (Test d'Initiative +0, main principale).` s’affiche. Dans **Résolution**, cocher la case fait apparaître le sélecteur `Test d’Initiative (+0 DR) de l’Attaque rapide` et la case `Attaque rapide : arme de la main principale` ; l’attaque gratuite hors séquence (une par Round, sans dépenser d’Élan) n’est validée que si le Test d’Initiative est sur `Réussite` et la main principale cochée.
7. **Fureur d’Ulric**
   - **Action** : Lancer *Fureur d’Ulric*, faire entrer le personnage en Frénésie, tenter d’utiliser l’attaque gratuite de Frénésie, puis résoudre son premier coup de mêlée touché du Tour en remplissant le champ `Fureur d’Ulric : d10 de dégâts (ex. 10,4)`.
   - **Résultat attendu** : Le talent *Frénésie* est accordé pour la durée, mais l’attaque gratuite de Frénésie est bloquée avec le message `Fureur d'Ulric : la Frénésie ajoute 1d10 Dégâts au premier coup au lieu de l'attaque gratuite.`. Sur le premier coup de mêlée touché du Tour, les dés explosifs saisis (ex. `10,4` pour `+14`) s’ajoutent aux dégâts une seule fois pour ce Tour.
8. **En Bon Ordre (Myrmidia)**
   - **Action** : Lancer *En Bon Ordre* sur les alliés choisis.
   - **Résultat attendu** : Les alliés désignés reçoivent la couche active portant le drapeau `orderlyDisengage`, visible sur leur fiche pour assister le désengagement sans pénalité ni attaque gratuite pendant la durée.
9. **Larmes de Shallya (retrait de Blessures Critiques et des États liés)**
   - **Action** : Sur un personnage portant au moins une Blessure Critique enregistrée avec ses États associés (ex. `Hémorragique`, `Sonné`), lancer *Larmes de Shallya*, sélectionner la blessure dans `Blessure Critique guérie n° 1/3 (selon les DR)`, et prévisualiser/appliquer avec puis sans la case `Retirer aussi les États liés aux Blessures Critiques guéries`.
   - **Résultat attendu** : La Blessure Critique sélectionnée (et jusqu’à 1 de plus par tranche de `+2 DR`) est retirée du registre de la cible. Lorsque la case `Retirer aussi les États liés aux Blessures Critiques guéries` est cochée, les États issus des critiques guéris sont retirés simultanément et mentionnés dans le reçu ; si elle reste décochée, seule la Blessure Critique est retirée et les États demeurent. `Annuler` restaure le critique et les États retirés.
10. **Faire monter les enjeux (Ranald)**
    - **Action** : Lancer *Faire monter les enjeux* sur une cible, puis résoudre son prochain Test dans **Résolution** (essayer un jet tout juste réussi à `+1 DR`, puis après `Annuler` un jet tout juste échoué à `-1 DR`).
    - **Résultat attendu** : En cas de réussite du Test de la cible, ses DR sont portés à au moins `+6 DR` ; en cas d’échec, ses DR sont portés à au plus `-6 DR`. Ce résultat amplifié s’applique à l’opposition et aux dégâts, consomme la couche à usage unique lors de l’application, et peut être annulé par `Annuler`.
11. **Dévotion de la Guerrière (Myrmidia — liste d’ennemis présents et saisie libre)**
    - **Action** : En présence d’ennemis actifs dans la rencontre, sélectionner *Dévotion de la Guerrière* dans le panneau des prières.
    - **Résultat attendu** : Le groupe `Saisies des effets` propose la liste déroulante `Ennemi présent` peuplée avec les noms des ennemis actifs (plus `Autre (saisie libre)`) ainsi que le champ `Ennemi visé (espèce ou individu)`. Choisir un nom de la liste ou saisir un texte libre (jusqu’à 60 caractères) puis appliquer accorde aux destinataires le talent `Sans peur [Ennemi]` spécialisé contre cet ennemi.

### 3. Registre des Blessures Critiques, invocations et ordre d’Initiative

1. **Registre des Blessures Critiques sur la fiche et bouton « Guérir »**
   - **Action** : Infliger une Blessure Critique (posant au moins un État) à un participant, consulter sa fiche dans **Jouer**, cliquer sur le bouton `Guérir <Nom du critique> de <Participant>`, puis cliquer sur `Annuler`.
   - **Résultat attendu** : La fiche affiche le bloc `.workspace-critical-wounds` détaillant chaque critique actif (`<Nom> (<Localisation>, Round <N>)`). Cliquer sur `Guérir …` retire la Blessure Critique de la fiche et ajoute une entrée au journal tout en laissant intacts les États déjà acquis sur le participant ; cliquer sur `Annuler` remet la Blessure Critique dans le registre de la fiche.
2. **Invocations et capteurs à cible implicite (Destinataires masqués)**
   - **Action** : Ouvrir le formulaire divin et choisir *Hurlement du loup*, *Roi de la Nature*, *Œil de l’aigle* ou *Yeux de chat*.
   - **Résultat attendu** : Le panneau n’affiche aucune case `Destinataire` ni aucun fait de portée à confirmer ; il indique `Cible : le prêtre (cible implicite).`. Après saisie du jet de Prière et des éventuels paramètres d’invocation (position, durée), `Calculer la prière` puis `Appliquer la prière` créent directement l’invocation ou le capteur rattaché au prêtre.
3. **Insertion d’un participant à son rang d’Initiative en cours de Round**
   - **Action** : En combat V5 commencé (par ex. Round 1, pendant le Tour d’un premier combattant d’Initiative `50` alors qu’un combattant d’Initiative `20` n’a pas encore joué), faire entrer un nouveau participant d’Initiative `35` (par ajout manuel à la rencontre, invocation magique ou invocation divine) et passer au Tour suivant ; répéter l’essai avec un participant d’Initiative `60` (rang déjà dépassé dans le Round courant).
   - **Résultat attendu** : Le nouveau participant est inséré à son rang d’Initiative V5 dans la piste d’ordre. Si son rang n’a pas encore été franchi dans le Round (`35` avant `20`), il joue son Tour dès ce Round avant le combattant d’Initiative `20` ; si son rang est déjà dépassé (`60` alors que le Tour courant est à `50`), il est placé en tête de l’ordre mais ne joue qu’au Round suivant. `Annuler` retire le participant et restitue l’ordre ainsi que le combattant actif d’origine.
