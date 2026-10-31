# Recette utilisateur locale

Cette recette vérifie l’application locale en mode invité. Elle ne déploie rien et n’écrit pas dans Firebase de production.

## Démarrer l’application

Depuis la racine du projet :

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8765/` dans Chrome. `localhost:8765` et `127.0.0.1:8765` sont deux origines distinctes et ne partagent pas leur stockage local. Pour une recette manuelle reproductible, rester sur une seule des deux adresses.

## Parcours fonctionnels

1. Dans **Préparer**, créer un profil complet avec nom, type, groupe, initiative, PV, endurance, armures, caractéristiques et une action préparée ; chaque case d’un jet montre une infobulle d’aide au survol. Recharger la page et vérifier les valeurs. Créer ensuite un profil par **Nouveau profil**, puis **Créer depuis un JSON** : **Insérer un exemple**, **Vérifier le JSON**, relire l’aperçu, **Créer 1 profil**, puis ouvrir **Modifier** et vérifier que toutes les cases sont remplies (format : [IMPORT_PROFILS_JSON.md](IMPORT_PROFILS_JSON.md)).
2. Dans **Bibliothèque**, rechercher un nom, un tag ou le nom d’une action. Ouvrir **Règles et mots-clés** et vérifier que les références, dont `Sonné`, sont visibles. Modifier, dupliquer puis supprimer une fiche de test.
3. Dans **Préparer**, cliquer **Nouvelle rencontre**, ajouter au moins deux profils actifs et cliquer **Lancer la rencontre** (ou fermer la fenêtre : la rencontre reste dans la liste **Rencontres** et se lance par **Lancer**, se rouvre par **Modifier**, se retire par **Supprimer**). Dans **Jouer**, cliquer une ligne de la piste de gauche, avant puis après **Commencer le combat** : ce combattant devient le personnage actif (« Personnage actif », ou « Agit hors tour » quand ce n’est pas son tour, le ▶ restant sur le combattant du tour) et ses actions préparées sont visibles ; **Tour suivant** repart du combattant du tour.
4. Ouvrir une action physique, choisir le type, la cible (puces **Cible** de Résolution) et un jet déterministe (le d100 lancé à la table se tape dans la case, puis Entrée). Pour une attaque, la défense de la cible propose ses jets enregistrés à côté de CC et Ag ; un jet de type Défense est choisi d’office. Prévisualiser le résultat puis cliquer **Appliquer les conséquences**. Vérifier le PV de la cible et l’entrée du journal. Utiliser `Annuler` puis `Rétablir` sur une modification PV et vérifier les deux valeurs.
5. Dans le menu, **Événements structurés** : créer une jauge manuelle. Créer un événement qui l’avance, enregistrer et prévisualiser, appliquer explicitement la conséquence, fermer puis rouvrir le panneau et vérifier la valeur.
6. Dans **Résolution** (comparaison « Et si… »), choisir une attaque, un jet et plusieurs cibles. Cliquer **Comparer les cibles**, puis **Choisir** sur la ligne d’une seule cible. Vérifier que seule cette cible change. Abandonner un aperçu sans appliquer ne modifie aucune fiche.
7. Pour E04, cliquer **Sauvegarder dans un fichier**, charger le fichier local et accepter le remplacement après lecture de l’aperçu. Modifier ensuite un PV, ouvrir **Versions précédentes**, prévisualiser le point `Import remplacé`, confirmer **Restaurer**, recharger et vérifier que les profils et la scène reviennent à l’état du point.
8. Dans **Préparer**, la carte de la rencontre en cours indique **En cours** ; cliquer **Suspendre**, recharger puis cliquer **Reprendre** sur la carte (ou dans le menu ⋯). Vérifier que les participants et leur PV sont conservés. Ajouter un personnage persistant, clôturer avec aperçu, puis vérifier l’archive et le report.
9. Passer hors ligne avec les outils locaux, faire une modification, recharger et revenir en ligne. L’état local doit rester lisible ; une divergence de compte doit présenter une résolution explicite avant publication.
10. Pendant un combat d’essai (dégâts, états, tours, combattant ajouté), cliquer **Recommencer** sur la carte de la rencontre en cours dans **Préparer** (ou **Recommencer le combat** dans le menu ⋯) et confirmer : PV, états, tours et combattants reviennent à la composition de la rencontre, le combat n’est plus commencé. **Annuler** (toast ou ↶) rend l’état d’avant.

## Recette automatisée de référence

Depuis la racine :

```sh
npm test -- --test-concurrency=1
npm run test:browser-all
npm run test:divine
```

`npm test` lance les tests unitaires rangés par domaine dans `tests/unit/`. `npm run test:browser-all` rejoue les parcours navigateur un par un (pour un seul : `node tests/browser-smoke.mjs`, `node tests/browser-workspace.mjs`, etc.). `npm run test:divine` rejoue la recette divine. Quelques parcours échouaient déjà avant la phase R (liste dans `docs/RAPPORT_PHASE_R.md`) : ils ne sont pas nouveaux.

La recette Playwright utilise Chrome local, un serveur loopback temporaire, un profil isolé, Firebase simulé et des service workers bloqués. Elle produit les captures denses suivantes : `/private/tmp/mj-index-play-15-dark-1440.png` et `/private/tmp/mj-index-play-15-dark-900.png`.

## Règles Firebase

Les règles Firebase v1/v2 ont été publiées et relues dans la console de production le `23/09/2026`. Depuis la bascule, v1 est en lecture seule pour son UID propriétaire; v2 autorise lecture et écriture seulement pour son UID propriétaire. Les tests simulateur confirment le refus d’un invité et d’un autre UID ; ils ne constituent pas un test utilisateur réel de synchronisation. Les règles n’ont changé aucune donnée et une sauvegarde serveur a été exportée le `23/09/2026`. La fixture `firebase.database.rules.v2.test.json` reste réservée aux tests. Le site GitHub Pages est distribué depuis la branche `main`.

## Parcours divins (3.17 à 3.21)

Ce parcours guidé permet au MJ de vérifier pas à pas, à la table dans l’onglet **Jouer**, les fonctions divines et transversales livrées entre les versions 3.17 et 3.21.

### 1. Bénédictions

1. **Protection (Test de Calme de l’attaquant, une fois par ennemi)**
   - **Action** : Appliquer la *Bénédiction de Protection* sur un allié. Sélectionner ensuite un ennemi comme acteur et préparer une attaque contre cet allié dans le panneau **Résolution**. Tester d’abord l’option `Échec : autre cible ou Action`, puis choisir `Réussite` et appliquer l’attaque ; enfin, préparer une seconde attaque du même ennemi contre ce même allié, puis une attaque d’un second ennemi.
   - **Résultat attendu** : Lors de la première attaque ennemie, le sélecteur `Bénédiction de Protection : Test de Calme Accessible (+2 DR) de l’attaquant` apparaît (`À saisir`, `Échec : autre cible ou Action`, `Réussite`). Tant que la valeur est `À saisir` ou `Échec`, l’attaque est bloquée comme non applicable. Dès qu’une attaque est appliquée avec `Réussite`, cet ennemi est mémorisé pour le reste de la bénédiction : le sélecteur n’apparaît plus pour lui aux attaques suivantes, mais continue d’apparaître pour tout autre ennemi non encore testé avec succès.
2. **Souffle (Manann, Morr)**
   - **Action** : Placer un combattant dans un vortex à étouffement, lui appliquer la *Bénédiction de Souffle*, puis faire avancer les Rounds. Tester également le cas d’un personnage sans *Souffle* tombé à `0` Blessure dans le nuage pendant un nombre de Rounds égal à son Bonus d’Endurance.
   - **Résultat attendu** : Tant que *Souffle* est actif, l’étouffement du vortex est ignoré à chaque passage de Round (aucune perte de Blessures ni progression du compteur d’asphyxie), tout en laissant la couche du vortex en place pour qu’elle reprenne effet si la bénédiction expire avant la sortie du nuage. Sans *Souffle*, un personnage maintenu à `0` Blessure dans le vortex atteint bien la mort par asphyxie au bout de BE Rounds.
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
   - **Résultat attendu** : Les alliés désignés reçoivent la couche active visible sur leur fiche, qui permet de se désengager sans pénalité ni attaque gratuite pendant la durée.
9. **Larmes de Shallya (retrait de Blessures Critiques et des États liés)**
   - **Action** : Sur un personnage portant au moins une Blessure Critique enregistrée avec ses États associés (ex. `Hémorragique`, `Sonné`), lancer *Larmes de Shallya*, sélectionner la blessure dans `Blessure Critique guérie n° 1/3 (selon les DR)`, et prévisualiser/appliquer avec puis sans la case `Retirer aussi les États liés aux Blessures Critiques guéries`.
   - **Résultat attendu** : La Blessure Critique sélectionnée (et jusqu’à 1 de plus par tranche de `+2 DR`) est retirée du registre de la cible. Lorsque la case `Retirer aussi les États liés aux Blessures Critiques guéries` est cochée, les États issus des critiques guéris sont retirés simultanément et mentionnés dans le reçu ; si elle reste décochée, seule la Blessure Critique est retirée et les États demeurent. `Annuler` restaure le critique et les États retirés.
10. **Faire monter les enjeux (Ranald)**
    - **Action** : Lancer *Faire monter les enjeux* sur une cible, puis résoudre son prochain Test dans **Résolution** (essayer un jet tout juste réussi à `+1 DR`, puis après `Annuler` un jet tout juste échoué à `-1 DR`).
    - **Résultat attendu** : En cas de réussite du Test de la cible, ses DR sont portés à au moins `+6 DR` ; en cas d’échec, ses DR sont portés à au plus `-6 DR`. Ce résultat amplifié s’applique à l’opposition et aux dégâts, consomme la couche à usage unique lors de l’application, et peut être annulé par `Annuler`.
11. **Dévotion de la Guerrière (Myrmidia — mot-clé du référentiel, plus de saisie libre)**
    - **Action** : En présence d’ennemis actifs dans la rencontre, sélectionner *Dévotion de la Guerrière* dans le panneau des prières.
    - **Résultat attendu** : Le groupe `Saisies des effets` propose la liste déroulante `Ennemi visé (mot-clé du référentiel)` : les mots-clés des ennemis actifs en premier (« Humain (présent) »), puis tout le référentiel (espèce, nature, allégeance). Aucun champ de texte libre : un terme absent se fait ajouter par le MJ. Choisir un mot-clé puis appliquer accorde aux destinataires le talent `Sans peur [Ennemi]` spécialisé contre ce mot-clé et ses descendants.

### 3. Registre des Blessures Critiques, invocations et ordre d’Initiative

1. **Registre des Blessures Critiques sur la fiche et bouton « Guérir »**
   - **Action** : Infliger une Blessure Critique (posant au moins un État) à un participant, consulter sa fiche dans **Jouer**, cliquer sur le bouton `Guérir <Nom du critique> de <Participant>`, puis cliquer sur `Annuler`.
   - **Résultat attendu** : La fiche affiche un bloc `Blessures Critiques` détaillant chaque critique actif (`<Nom> (<Localisation>, Round <N>)`). Cliquer sur `Guérir …` retire la Blessure Critique de la fiche et ajoute une entrée au journal tout en laissant intacts les États déjà acquis sur le participant ; cliquer sur `Annuler` remet la Blessure Critique dans le registre de la fiche.
2. **Invocations et capteurs à cible implicite (Destinataires masqués)**
   - **Action** : Ouvrir le formulaire divin et choisir *Hurlement du loup*, *Roi de la Nature*, *Œil de l’aigle* ou *Yeux de chat*.
   - **Résultat attendu** : Le panneau n’affiche aucune case `Destinataire` ni aucun fait de portée à confirmer ; il indique `Cible : le prêtre (cible implicite).`. Après saisie du jet de Prière et des éventuels paramètres d’invocation (position, durée), `Calculer la prière` puis `Appliquer la prière` créent directement l’invocation ou le capteur rattaché au prêtre.
3. **Insertion d’un participant à son rang d’Initiative en cours de Round**
   - **Action** : En combat V5 commencé (par ex. Round 1, pendant le Tour d’un premier combattant d’Initiative `50` alors qu’un combattant d’Initiative `20` n’a pas encore joué), faire entrer un nouveau participant d’Initiative `35` (par ajout manuel à la rencontre, invocation magique ou invocation divine) et passer au Tour suivant ; répéter l’essai avec un participant d’Initiative `60` (rang déjà dépassé dans le Round courant).
   - **Résultat attendu** : Le nouveau participant est inséré à son rang d’Initiative V5 dans la piste d’ordre. Si son rang n’a pas encore été franchi dans le Round (`35` avant `20`), il joue son Tour dès ce Round avant le combattant d’Initiative `20` ; si son rang est déjà dépassé (`60` alors que le Tour courant est à `50`), il est placé en tête de l’ordre mais ne joue qu’au Round suivant. `Annuler` retire le participant et restitue l’ordre ainsi que le combattant actif d’origine.

## Parcours de la 3.22 à la 3.30.0

À faire à la table, dans **Jouer** sauf indication contraire. Chaque parcours a une case à cocher et une ligne « Remarques : » à remplir. Les libellés entre accents graves sont ceux de l’écran. Les distances sont en mètres (1 yard = 1 m, même valeur). Vocabulaire V5 : DR (degrés de réussite), Élan, Round (tous les combattants agissent) et Tour (un seul combattant). Les d100 et d10 se tapent dans les cases, puis Entrée.

### Bestiaire et Traits de créature

- [ ] G-BES-1 · Bibliothèque de bestiaire
  1. Onglet **Bibliothèque**, ouvrir `Bibliothèque de bestiaire`. 2. Taper un nom dans `Nom du profil`, régler `Tous les livres` ou `Tous les mots-clés`. 3. Cliquer **Fiche** : `Caractéristiques`, `Compétences`, `Traits facultatifs` et `Mots-clés` sont lus. 4. Choisir le camp et le nombre, cliquer **Ajouter au combat**, puis **Copier dans la réserve** sur un autre profil.
  Attendu : le combattant arrive en attente (banc) dans Jouer ; la copie est dans la Réserve, groupe Bestiaire. Plus de 900 profils de 23 livres.
  Remarques :

- [ ] G-BES-2 · Taille et dégâts de mêlée
  1. Faire entrer un profil Grand, Énorme ou Monstrueux (un ogre, un géant) contre un humain. 2. Dans **Résolution**, attaque de mêlée, choisir si besoin `Taille de l’auteur`, puis prévisualiser. 3. Répéter avec un tir.
  Attendu : dégâts de mêlée +BF (Grande), +2 BF (Énorme), +3 BF (Monstrueuse) ; rien au tir ; pas de double compte sur un profil imprimé, dont les dégâts incluent déjà la Taille.
  Remarques :

- [ ] G-BES-3 · Surnombre en mêlée
  1. Faire engager quatre combattants contre deux. 2. Dans **Résolution**, ouvrir `Surnombre (mêlée)` et cocher les participants de `Engagés avec la cible, du côté de l’attaquant :` et de `Engagés avec eux, du côté de la cible :`. 3. Prévisualiser, puis cocher `Cible encerclée, sans voie d’échappement (en général 3 attaquants, 2 en espace étroit : +2 DR)`.
  Attendu : un camp qui compte au moins le double d’engagés donne +1 DR à l’attaque de mêlée ; encerclée : +2 DR, non cumulé ; jamais de malus pour le défenseur. Une créature compte 1 (Moyenne), 2 (Grande), 3 (Énorme) ou 4 (Monstrueuse).
  Remarques :

- [ ] G-BES-4 · Régénération et têtes
  1. Faire entrer une créature à Régénération (troll), lui infliger des Blessures dont du feu. 2. Au début d’un Round, saisir le d10 dans la case de `Régénération (début de Round) :` et les Blessures de feu dans la case `feu`. 3. Cliquer **Régénérer**, puis **Annuler**.
  Attendu : les Blessures de feu ne sont pas régénérées ; un critique coché `Feu` ne guérit pas sur un 10 ; **Annuler** rend l’état d’avant. Pour une hydre, `Tête 1` change d’état au clic après un critique à la tête.
  Remarques :

- [ ] G-BES-5 · Nuée, Venin, Peur et Terreur
  1. Nuée : cocher les engagés de `Nuée, engagés :` et cliquer **Fin de Round : 1 Blessure aux engagés**. 2. Venin : sur `Venin, cible blessée :`, cliquer **Empoisonner**. 3. Créature à Peur ou Terreur : choisir la cible dans `Au contact ou à la vue :` (vide : tous les adversaires) et cliquer le bouton Peur ou Terreur.
  Attendu : chaque engagé coché perd 1 Blessure ; la cible blessée devient Empoisonnée ; la cible reçoit la Peur à l’indice imprimé et un Test de Calme est demandé. Chaque geste est annulable.
  Remarques :

- [ ] G-BES-6 · Familier
  1. Sur la carte du mage, choisir `Familier…` et un participant allié. 2. Renseigner `Système de familier` et `Point sacrifié par le maître`. 3. Cliquer **Création de familier**. 4. Basculer `À portée (4 m)` puis `Hors de portée`. 5. Cliquer **Retirer le lien**.
  Attendu : le point sacrifié est débité du maître (**Annuler** le rend) ; hors de portée, les talents de compagnon et le soutien du familier sont suspendus ; le lien est retiré des deux côtés sans rendre le point.
  Remarques :

### Initiative et Tours

- [ ] G-INI-1 · Initiative à l’ouverture
  1. Rencontre avec deux PJ et trois PNJ, cliquer **Commencer le combat**. 2. Dans `Préparer l’initiative`, saisir l’Initiative et le d10 de chaque PJ (les d10 des PNJ sont tirés une fois et gardés). 3. Cliquer **Calculer / actualiser l’ordre**, relire, puis **Confirmer et appliquer**.
  Attendu : score = d10 + Bonus d’Initiative (dizaines de l’Initiative) ; Initiative 45 et d10 de 6 donnent 10. L’ordre suit les scores, le plus haut agit en premier.
  Remarques :

- [ ] G-INI-2 · Égalité et Combat instinctif
  1. Faire deux combattants au même score et à la même Initiative. 2. Dans `Préparer l’initiative`, remplir les cases d100 du Test opposé d’Initiative qui apparaît sous « Égalité » (à trois égaux, utiliser `Choisir un participant` pour fixer l’ordre). 3. Pour un porteur de Combat instinctif, saisir les deux d10 et choisir `Dé choisi`.
  Attendu : le gagnant du Test opposé passe avant ; **Confirmer et appliquer** n’apparaît que quand tout est saisi.
  Remarques :

- [ ] G-INI-3 · Camp surpris
  1. À l’ouverture, régler `Camp surpris (facultatif)` sur le camp des PNJ. 2. Cliquer **Confirmer et appliquer**. 3. Ouvrir la carte d’un PNJ et d’un PJ.
  Attendu : les combattants du camp choisi sont Surpris, l’autre camp non. `Aucun` ne surprend personne.
  Remarques :

- [ ] G-INI-4 · Initiative d’un combattant qui entre ou revient
  1. Combat commencé, faire entrer un renfort (**Faire entrer**). 2. Cliquer **Modifier** sur un combattant en attente, passer `Zone` à `Actif`. 3. Cliquer **Tour suivant**.
  Attendu : le renfort prend son rang d’Initiative ; un rang déjà dépassé attend le Round suivant (voir aussi la section divine, parcours 3.3).
  Remarques :

### Attaque, défense et modificateurs

- [ ] G-ATT-1 · Action défensive
  1. Combattant dont c’est le Tour : dans `Actions du Tour`, choisir `Compétence choisie pour l’Action défensive`, cliquer **Déclarer l’Action défensive**. 2. Faire attaquer ce combattant et regarder sa défense avec cette compétence.
  Attendu : +2 DR sur sa défense, ligne « Action Défensive choisie » dans le détail ; l’Action du Tour est consommée.
  Remarques :

- [ ] G-ATT-2 · Viser
  1. Tireur : choisir l’arme dans le menu de l’arme tenue pour viser, cocher `Je confirme que l’arme est tenue en main`. 2. Cliquer le bouton `Viser` suivi du nom de la cible. 3. Attaquer cette cible au tir, puis une autre.
  Attendu : +1 DR « Visée contre la cible désignée » sur la cible visée seulement.
  Remarques :

- [ ] G-ATT-3 · Circonstances de combat
  1. Attaque de tir : dans `Circonstances de combat · L06 p.166`, choisir `Pluie ou vent (−2 DR)`. 2. Cocher `La cible est à couvert ou À Terre (−1 DR, une seule fois)`. 3. En mêlée, choisir `Hauteur relative` puis `Attaquant plus haut (+1 DR)`. 4. Prévisualiser chaque cas.
  Attendu : chaque ligne apparaît dans le détail des modificateurs avec son DR, et le total s’additionne.
  Remarques :

- [ ] G-ATT-4 · Cible Surprise
  1. Mettre l’état Surpris sur la cible. 2. Attaque de mêlée, puis attaque de tir. 3. Prévisualiser.
  Attendu : +2 DR « Cible Surprise » en mêlée et « Cible Surprise au tir » +2 DR au tir (règle du livre V5 v3).
  Remarques :

- [ ] G-ATT-5 · Tir sur une cible au corps à corps
  1. Tir sur une cible engagée : cocher `La cible est engagée au corps à corps (Désavantage au tir)`. 2. Refaire le tir avec une arme Pistolet, puis sur un adversaire engagé avec le tireur.
  Attendu : Désavantage au tir sur une cible engagée ; sur un adversaire engagé avec le tireur, le calcul refuse l’attaque sauf arme Pistolet.
  Remarques :

- [ ] G-ATT-6 · Deux armes et main secondaire
  1. Combattant à deux armes à une main. 2. Cocher `Attaque avec la main secondaire (−2 DR selon les règles)`. 3. Pour la seconde arme du même Tour, choisir l’attaque dans `Attaque précédente pour l’attaque immédiate de l’autre arme`.
  Attendu : −2 DR à la main secondaire ; la seconde attaque ne dépense pas d’Élan et exige une attaque déjà appliquée ce Tour.
  Remarques :

- [ ] G-ATT-7 · Cible sans défense et option létale
  1. Mettre la cible Inconsciente. 2. Cocher `Cible sans défense : situation vérifiée par le MJ`. 3. Cocher `Activer l’option létale de la table pour cette résolution`, puis la confirmation explicite de la mort.
  Attendu : l’option létale est désactivée par défaut ; sans confirmation explicite, aucune mort n’est appliquée.
  Remarques :

### Armes, mots-clés et Qualités

- [ ] G-ARM-1 · Mots-clés d’armes et d’armures
  1. **Bibliothèque**, onglet `Règles et mots-clés`. 2. Chercher Pointue, Imprécise, Explosion. 3. Attaquer avec une arme Pointue, puis Imprécise.
  Attendu : 55 mots-clés officiels. Pointue : +1 DR sur une réussite seulement ; Imprécise : −1 DR sur tout test et l’emporte sur Pointue ; le détail du résultat les nomme.
  Remarques :

- [ ] G-ARM-2 · Arcs et arbalètes
  1. Tir à l’arc elfique, à l’arc d’Anirain, puis à l’arbalète. 2. Prévisualiser dégâts et portées.
  Attendu : dégâts d’arc fixes sans BF (+9 pour les arcs elfiques) ; portées d’arbalète du livre v3 ; distances en mètres.
  Remarques :

- [ ] G-ARM-3 · Arme à répétition
  1. Tir avec une arme À répétition : cocher `À répétition : tir double (deux tirs sur la même cible à −1 DR, une seule Action)`. 2. Appliquer le premier tir. 3. Sur le second, choisir `Premier tir du tir double (le tir actuel est alors le second, gratuit et sans Élan)`.
  Attendu : −1 DR à chaque tir, une seule Action, second tir gratuit et sans Élan.
  Remarques :

- [ ] G-ARM-4 · Explosion et Dispersion
  1. Tir avec une arme à Explosion : saisir `Explosion : identifiants de toutes les cibles dans le diamètre (virgules)`. 2. Tir à Dispersion : choisir `Dispersion : bande choisie par le MJ`. 3. Prévisualiser.
  Attendu : chaque cible listée est touchée ou défend ; la Dispersion dépend de la bande choisie ; aucune distance n’est suivie par l’outil.
  Remarques :

- [ ] G-ARM-5 · Rechargement
  1. Dans `Rechargement des armes`, régler la capacité puis cliquer **Enregistrer l’arbitrage**, puis **Commencer la recharge**. 2. Saisir le résultat du Test et cliquer **Enregistrer le Test**. 3. Retenter un tir avant la fin de la recharge.
  Attendu : l’arme n’est rechargée qu’une fois le Test enregistré ; le tir avant la fin est signalé.
  Remarques :

- [ ] G-ARM-6 · Maladresses et incident de poudre
  1. Provoquer une maladresse de combat et saisir `Maladresse de combat : résultat du d10 (V5 p. 165)`. 2. Arme à poudre noire : faire 99 ou 100 et saisir `Incident de poudre : premier d10 (V5 p. 165)`. 3. Arme sans poudre : refaire 99.
  Attendu : la table de maladresses s’applique ; l’incident de poudre n’apparaît que pour une arme à poudre.
  Remarques :

- [ ] G-ARM-7 · Qualités d’armes à effet
  1. Arme Taille : choisir `Taille : pièce d’armure ou bouclier frappé`. 2. Arme Entaille : `Entaille : dépenser 1 Élan pour +1 Hémorragique`, choisir `Dépenser 1 Élan`. 3. Filet à crochets : cocher `Cette arme est un filet à crochets (confirmation MJ)`.
  Attendu : la Taille abîme la pièce choisie ; l’Entaille ajoute 1 Hémorragique pour 1 Élan ; le filet donne Enchevêtré.
  Remarques :

### Empoignade et combat monté

- [ ] G-EMP-1 · Prendre une empoignade
  1. Attaque de mêlée à mains nues (Bagarre) : cocher `Déclarer une tentative d’empoignade (Bagarre avant le jet)`. 2. Appliquer le résultat.
  Attendu : attaquant gagnant : la cible devient Enchevêtrée, sans dégâts d’attaque ; défenseur gagnant : « opposition perdue, aucun lien créé ».
  Remarques :

- [ ] G-EMP-2 · Agir dans l’empoignade
  1. Au Tour suivant, dans **Résolution**, choisir `Action d’empoignade — Test opposé de Force`. 2. Essayer `Blesser (BF + DR, sans PA)`, `Immobiliser (Enchevêtré +1, puis +1 par DR au-delà du premier)`, puis `Se dégager`. 3. Si le lien n’existe plus, cliquer **Effacer l’action d’empoignade enregistrée**.
  Attendu : Blesser inflige BF + DR sans PA ; avec 3 DR, Immobiliser monte l’Enchevêtré de 3 ; Se dégager le fait baisser ; la libération retire le lien des deux côtés.
  Remarques :

- [ ] G-MON-1 · Lier cavalier et monture
  1. Cliquer **Modifier** sur le cavalier, section `Combat monté` : cocher `Le personnage est monté`, choisir `Monture active`. 2. Enregistrer. 3. Au démarrage d’un combat, saisir le Test de Chevaucher demandé.
  Attendu : le lien survit aux Actions ; sans monture active choisie, l’enregistrement est refusé (`Choisissez une monture active et gardez le cavalier actif.`).
  Remarques :

- [ ] G-MON-2 · Charge, Esquive et chute
  1. Cavalier : cocher `Charge donnant Élan (distance et conditions vérifiées)`. 2. Faire attaquer le cavalier et le faire défendre avec Esquive. 3. Mettre la monture hors de combat.
  Attendu : l’Esquive montée prend un Désavantage automatique (sauf Cavalier émérite), à la place de l’ancien champ chiffré, sans cumul ; la chute donne mort, KO, À Terre, Surpris ou Sonné selon la table.
  Remarques :

### Critiques, localisations et séquelles

- [ ] G-CRI-1 · Localisation d’un humanoïde
  1. Attaque réussie : saisir un d100. 2. Lire la localisation. 3. Saisir `Localisation du critique (nouveau d100)` pour un critique.
  Attendu : Tête 01–09, Bras G 10–24, Bras D 25–44, Corps 45–79, Jambe G 80–89, Jambe D 90–00, comme sur la silhouette affichée.
  Remarques :

- [ ] G-CRI-2 · Créature non humanoïde
  1. Cible quadrupède ou araignée : régler `Morphologie de la cible (choix du MJ)` sur `Quadrupède`. 2. Pour un coup à une patte, choisir `Côté de patte touché (choix MJ si nécessaire)`. 3. Prévisualiser.
  Attendu : la localisation suit la morphologie ; un appendice sans table propre demande les PA à saisir ; l’humanoïde garde sa table.
  Remarques :

- [ ] G-CRI-3 · Assommer
  1. Cocher `Assommer — déclarer avant le jet et retenir ses coups`. 2. Frapper la cible plusieurs fois.
  Attendu : la cible gagne Sonné ; quand le total de Sonné dépasse son BE, Inconscient est proposé (« Assommer : le total de Sonné dépasse le BE »).
  Remarques :

- [ ] G-CRI-4 · Mort critique et figurants
  1. Infliger plusieurs critiques à un PNJ. 2. Dans le volet `Mort subite des figurants`, cocher `Activer la mort subite des figurants`. 3. À 0 Blessure, cocher `Confirmer que c’est un PNJ secondaire`, puis `Choisir : mort` ou `Choisir : inconscient`. 4. Dans `Décisions du MJ — mort critique`, cliquer **Confirmer la mort** ou **Refuser la mort**.
  Attendu : l’outil propose, le MJ décide ; aucune mort n’est appliquée sans clic ; la règle de table est désactivée par défaut.
  Remarques :

- [ ] G-CRI-5 · Amputation et séquelles
  1. Critique qui coupe un membre. 2. Dans `Chocs d’amputation — Test de Résistance`, saisir le résultat puis cliquer **Enregistrer le choc**. 3. Ouvrir `Séquelles des critiques` et cliquer **Créer le suivi**.
  Attendu : un choc d’amputation est exigé avant le suivi ; la séquelle est enregistrée sur la fiche et ses malus permanents sont lus par la résolution.
  Remarques :

- [ ] G-CRI-6 · Convalescence et soins hors combat
  1. Menu, **Temps de campagne** : avancer de plusieurs jours, voir l’aperçu, cliquer **Confirmer l’avancement**. 2. Pour un critique suivi, choisir `Guérison` avec `Difficulté du soin (DR)` puis **Enregistrer le Test de soin**. 3. Infection : cliquer **Traiter l’infection**.
  Attendu : le calendrier de convalescence avance ; un Test de Résistance par blessure non traitée chaque soir ; un seul Test de Guérison par incident ; un Test raté ne bande pas la blessure.
  Remarques :

- [ ] G-CRI-7 · Chirurgie et fractures
  1. Soigneur avec le Talent Chirurgie : cliquer **Opérer la blessure critique**, puis **Enregistrer le Test de chirurgie**. 2. Fracture : cliquer **Immobiliser la fracture**, puis **Enregistrer le Test d’immobilisation**.
  Attendu : le chirurgien choisit les DR ou le chiffre des unités du d100 (un 0 vaut 0) ; immobiliser est un Test à part ; une maladresse de Guérison inflige 1d10 Blessures sans descendre sous 1.
  Remarques :

### Destin et Chance

- [ ] G-DES-1 · Fortune d’un personnage
  1. Sur la carte du personnage, cliquer le bouton `Fortune : …`. 2. Saisir `Points de Fortune disponibles (permanents)`, cliquer **Initialiser Fortune**. 3. Rouvrir et choisir `Renouvellement normal`.
  Attendu : le solde est conservé entre les rencontres ; **Annuler** restaure aussi la Fortune.
  Remarques :

- [ ] G-DES-2 · Chance avant et après le jet
  1. Avant le jet : cocher `Dépenser 1 Point de Chance pour obtenir Avantage avant le jet`. 2. Sur un échec : cocher `Relancer ce Test avec 1 Point de Chance (Fortune)` et saisir plusieurs d100 dans `Jets successifs de relance (d100, séparés par des virgules)`.
  Attendu : un Point de Chance par relance, les temporaires dépensés avant les permanents ; le résultat nomme le payeur.
  Remarques :

- [ ] G-DES-3 · Dépenser un Point de Destin
  1. Choisir `Dépenser 1 Destin`, puis `Annuler cette attaque (Destin de la cible)` sur une attaque dangereuse. 2. Autre essai : `Survivre et quitter la rencontre (Destin de la cible)`. 3. Troisième essai : `Réussite automatique (Destin de l’acteur)` avec `Localisation de la Blessure Critique (si le jet en inflige une)`.
  Attendu : le solde de Destin baisse de 1 à chaque usage ; la réussite sans jet laisse choisir la localisation du critique.
  Remarques :

- [ ] G-DES-4 · Corriger le Destin à la main
  1. Cliquer le bouton `Destin : …` sur la carte. 2. Saisir `Nouveau solde permanent de Destin` et le motif MJ. 3. Cliquer **Enregistrer Destin**.
  Attendu : le motif est exigé ; si la partie a changé entre-temps, l’outil demande de relire le solde.
  Remarques :

### Corruption et mutations

- [ ] G-COR-1 · Séance et exposition de fin de séance
  1. Ouvrir `Corruption · <nom du personnage>` et cliquer **Démarrer une séance**. 2. Saisir `Sources d’exposition déclarées (une par ligne)`, `Influence corruptrice` et `Durée d’exposition`. 3. Cliquer **Calculer l’exposition**, puis **Enregistrer l’exposition**.
  Attendu : un seul Test de Corruption par personnage et par séance (`Test de Corruption déjà résolu pour cette séance`).
  Remarques :

- [ ] G-COR-2 · Test de seuil et délai secret
  1. Faire dépasser le seuil de Corruption. 2. Saisir `Jet de Résistance (d100)`. 3. En cas d’échec, saisir les trois d10 du délai secret. 4. Cliquer **Calculer le Test de seuil**, puis **Appliquer le résultat du Test**.
  Attendu : seuil = Bonus d’Endurance + Bonus de Force Mentale, doublé par Âme pure ; un échec amène une mutation, avec un délai de 3d10 réservé au MJ.
  Remarques :

- [ ] G-COR-3 · Mutation, absolution, perte
  1. Dans `Mutation à confirmer par le MJ`, choisir un résultat de table de mutation, puis cliquer **Confirmer cette mutation** (ou **Refuser cette mutation**). 2. Dans `Absolution fixée par le MJ`, saisir les points et le motif, cliquer **Appliquer l’absolution**. 3. Limites dépassées : `Perte de personnage à arbitrer`.
  Attendu : aucun effet n’est appliqué sans confirmation ; le catalogue combine trois sources (L06, L17, L23) ; la perte au Chaos exige une décision explicite du MJ.
  Remarques :

- [ ] G-COR-4 · Malepierre
  1. Dans `Exposition quotidienne à la malepierre (Horned Rat p.32)`, saisir `Jour déclaré par le MJ`. 2. Cliquer **Déclarer l’exposition quotidienne**.
  Attendu : l’exposition est déclarée et le Test de seuil immédiat reste en attente jusqu’à saisie.
  Remarques :

### Magie

- [ ] G-MAG-1 · Incantation d’un sort de base
  1. Action de type `Incantation V5`, puis `Sort à lancer` : un sort de la fiche. 2. Saisir le Test d’Incantation. 3. Cliquer **Appliquer le sort**.
  Attendu : « Sort lancé ! Incantation réussie » ou « Échec d’incantation » selon le Test ; maladresse : « Maladresse d’incantation ».
  Remarques :

- [ ] G-MAG-2 · Sorts des suppléments
  1. Choisir dans `Contrats de sorts V5` un sort de supplément (Brise-os, Gloutonneur, Dague de l’Art, Déracinement des montagnes). 2. Lancer, saisir la surpuissance. 3. Lire le rappel du sort.
  Attendu : 123 sorts de suppléments sont au catalogue avec leur Niveau d’Incantation ; les clauses non calculées s’affichent en rappel, sans effet inventé.
  Remarques :

- [ ] G-MAG-3 · Focalisation, pause et interruption
  1. Action `Focalisation V5` : `Accumuler (Focalisation +0 DR)`. 2. Mode `Pause de focalisation (Focalisation Accessible +2 DR)`. 3. Mode `Test d’interruption (Calme Difficile −2 DR)`.
  Attendu : un Test d’interruption raté fait perdre des DR de la réserve ; l’Exténué s’applique à la pause (sauf Œil de la tempête, voir G-DEC-2).
  Remarques :

- [ ] G-MAG-4 · Haute Magie et runes
  1. Lanceur de Haute Magie : action `Incantation V5` avec `Haute Magie (Qhaysh)`. 2. Saisir `Déploiement : jet Savoir (Magie) (+0 DR), 1d100`. 3. Cliquer **Déployer une rune (1 Round)**, puis **Quitter le lieu : effacer les runes**.
  Attendu : le compteur `Runes des Cadai` monte à chaque déploiement et revient à zéro en quittant le lieu.
  Remarques :

- [ ] G-MAG-5 · Dissipation d’un sort persistant
  1. Avoir un sort persistant en cours. 2. Dans `Dissiper un sort persistant`, choisir `Sort persistant à dissiper`, la distance et la visibilité. 3. Saisir les Tests et cliquer **Appliquer la dissipation**.
  Attendu : le dissipateur doit voir le sort ou son point ciblé ; un total négatif échoue, `Recommencer la tentative : repartir de zéro DR` repart de zéro.
  Remarques :

### Décisions du MJ du 31/10

- [ ] G-DEC-1 · Peur (1) par défaut
  1. Faire entrer une créature à Peur sans indice chiffré (Oint druchii, Heomreth, Kurt Helborg). 2. Dans `Au contact ou à la vue :`, cliquer le bouton Peur.
  Attendu : la cible reçoit « Peur (1) », comme dans le livre v3 p.358 ; la valeur reste corrigeable à la main.
  Remarques :

- [ ] G-DEC-2 · Œil de la tempête et pause de Focalisation
  1. Lanceur avec le Talent Œil de la tempête au rang 2 ou plus. 2. Focalisation en mode `Pause de focalisation (Focalisation Accessible +2 DR)`, avec l’état Exténué sur le lanceur.
  Attendu : l’Exténué est ignoré pour la pause comme pour l’incantation et la Focalisation ; une distraction n’interrompt pas la Focalisation.
  Remarques :

- [ ] G-DEC-3 · Grim sans limite par Tour
  1. Faire entrer une créature Grim (libellé Féroce sur la carte). 2. Cocher `Attaque gratuite de Grim : sans perdre l’Élan (il faut en avoir ; sans limite par Tour)`. 3. Répéter dans le même Tour.
  Attendu : autant d’attaques gratuites que la règle en déclenche, sans perdre l’Élan, tant que la créature en a ; sans Élan, refus.
  Remarques :

- [ ] G-DEC-4 · Perturbant et participants neutres
  1. Un Perturbant, un PJ, un allié du Perturbant et un participant neutre. 2. Pour une attaque de chacun, cocher `Un Perturbant est à portée (−2 DR, une seule fois)`.
  Attendu : −2 DR une seule fois, même avec plusieurs sources ; il touche le PJ et le neutre, jamais le camp du Perturbant.
  Remarques :

- [ ] G-DEC-5 · Morsure
  1. Créature avec Morsure et valeur imprimée (par exemple Bite 7). 2. Dans `Attaque naturelle (Trait de créature)`, choisir Morsure. 3. Refaire avec une Morsure sans aucun chiffre.
  Attendu : la valeur imprimée est gardée ; BF + 3 seulement sans aucun chiffre ; la Morsure coûte 1 Élan.
  Remarques :

- [ ] G-DEC-6 · Domaine des Bêtes et Faux de Shyish
  1. Lancer le sort d’attribut du Domaine des Bêtes (Ghur), puis frapper avec la Faux de Shyish un mort-vivant engagé.
  Attendu : le lanceur gagne l’Élan et tous les ennemis vivants actifs perdent le leur, sans liste décochable ni distance suivie ; avec la Faux, le mort-vivant engagé ne gagne pas d’Élan.
  Remarques :

- [ ] G-DEC-7 · Distances en mètres
  1. Relire la fiche d’un profil du bestiaire (citation de la source), une portée d’arme et une zone de sort.
  Attendu : toute distance est en mètres, même valeur qu’en yards (50 yards deviennent 50 m).
  Remarques :

- [ ] G-DEC-8 · Pénitence imposée par le Courroux (libellé clarifié)
  1. Obtenir un résultat 96-100 sur la table du Courroux.
  2. Lire le champ « Pénitence imposée par le Courroux (à définir ; son suivi sur la fiche est facultatif) » et tenter d’appliquer sans le remplir.
  Attendu : l’application est refusée tant que le texte de la pénitence est vide (le moteur exige de savoir quelle pénitence est imposée ; seul son suivi sur la fiche est facultatif, décision B-C20). Le libellé précise que la pénitence est à définir et que seul son suivi est facultatif.
  Remarques :

## Limites connues

- Distances, positions et directions ne sont jamais suivies : le MJ les saisit ou choisit la bande de portée.
- Prothèses, bois de cerf tombé naturellement, pavois porté (Lente, Épuisante) : rappels, pas de mécanisme.
- Parties de navire (Gargantuan, Léviathan noir) : rappels ; l’encombrement est calculé par pièce, sans total de charge.
- Coup mortel du grand félin : seul le plafond (Bonus de CC) est affiché, les chaînes de bonds ne sont pas comptées.
- Classement des sources de Corruption d’une séance, qualification du chirurgien, remise en place d’un membre : déclarés ou confirmés par le MJ, jamais déduits.
- Attribut des Bêtes : tous les ennemis vivants actifs, sans liste décochable.
- La feuille Aides de jeu du MJ fait foi sur les armes, talents et sorts : les valeurs se corrigent d’abord dans la feuille.
- Parcours navigateur déjà en échec avant la phase R : voir `docs/RAPPORT_PHASE_R.md`.
