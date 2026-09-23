# Recette utilisateur locale

Cette recette vérifie l’application locale en mode invité. Elle ne déploie rien et n’écrit pas dans Firebase de production.

## Démarrer l’application

Depuis la racine du projet :

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Ouvrir `http://127.0.0.1:8765/` dans Chrome. `localhost:8765` et `127.0.0.1:8765` sont deux origines distinctes et ne partagent pas leur stockage local. Pour une recette manuelle reproductible, rester sur une seule des deux adresses.

## Parcours fonctionnels

1. Dans **Préparer**, créer un profil complet avec nom, type, groupe, initiative, PV, endurance, armures, caractéristiques et une action préparée. Recharger la page et vérifier les valeurs.
2. Dans **Bibliothèque**, rechercher un nom, un tag ou le nom d’une action. Ouvrir **Règles et mots-clés** et vérifier que les références, dont `Sonné`, sont visibles. Modifier, dupliquer puis supprimer une fiche de test.
3. Dans **Préparer**, ouvrir **Lancer la rencontre**, ajouter au moins deux profils actifs et lancer. Dans **Jouer**, cliquer **Démarrer**, sélectionner un acteur et vérifier que ses actions préparées sont visibles.
4. Ouvrir une action physique, choisir le type, la cible et un jet déterministe, prévisualiser le résultat puis cliquer **Appliquer les conséquences**. Vérifier le PV de la cible et l’entrée du journal. Utiliser `Annuler` puis `Rétablir` sur une modification PV et vérifier les deux valeurs.
5. Dans **Événements**, créer une jauge manuelle. Créer un événement qui l’avance, enregistrer et prévisualiser, appliquer explicitement la conséquence, fermer puis rouvrir le panneau et vérifier la valeur.
6. Dans **Et si…**, choisir une action, un jet et plusieurs cibles. Cliquer **Comparer toutes les cibles**, puis **Choisir ce résultat** sur une seule cible. Vérifier que seule cette cible change. Abandonner un aperçu sans appliquer ne modifie aucune fiche.
7. Pour E04, cliquer **Sauvegarder**, charger le fichier local et accepter le remplacement après lecture de l’aperçu. Modifier ensuite un PV, ouvrir **Restaurations**, prévisualiser le point `Import remplacé`, confirmer **Restaurer**, recharger et vérifier que les profils et la scène reviennent à l’état du point.
8. Dans **Préparer**, suspendre une scène active, recharger puis cliquer **Reprendre**. Vérifier que les participants et leur PV sont conservés. Ajouter un personnage persistant, clôturer avec aperçu, puis vérifier l’archive et le report.
9. Passer hors ligne avec les outils locaux, faire une modification, recharger et revenir en ligne. L’état local doit rester lisible ; une divergence de compte doit présenter une résolution explicite avant publication.

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
