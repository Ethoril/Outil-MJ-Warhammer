# Suivi des lots d’évolution

État consolidé au `23/09/2026`, version `3.6.2`. Les validations applicatives ci-dessous portent sur l’arbre local partagé. Les règles Firebase de production ont été publiées et relues dans la console le `23/09/2026` ; une sauvegarde serveur a été exportée le même jour. Depuis la bascule, v1 est en lecture seule pour son UID propriétaire et v2 limite lecture et écriture à son UID propriétaire. Les règles n’ont pas modifié les données. Le site GitHub Pages est distribué depuis la branche `main`. Aucun test utilisateur réel de synchronisation n’est revendiqué.

| Lot | État | Preuves finales |
|---|---|---|
| E01–E04 | Intégré et validé localement | `npm test -- --test-concurrency=1` : 199/199 ; `tests/e04-idb-browser.mjs` ; import, points de restauration et réhydratation vérifiés dans le navigateur réel. |
| E05 | Intégré et validé sur les adaptateurs locaux | Suites E05 ciblées, `tests/browser-e05.mjs`, `tests/browser-e05-legacy.mjs`, `tests/browser-offline.mjs` : 5/5. |
| E07–E08 | Intégré et validé | Tests de commandes, historique, dégâts et ordre ; smoke réel avec résolution, PV, undo/redo, retrait et rechargement. |
| E09–E10 | Intégré et validé dans la vraie coquille | Navigation Préparer/Jouer/Bibliothèque, profils complets, recherche actions/tags, favoris, règles réelles, sélection et suivi du tour. |
| E11–E17 | Intégré ; parcours navigateur bornés passants | `tests/browser-index.mjs` couvre lancement, suspension/reprise, clôture, personnage persistant, E15, E16 et E04 sur l’index réel. |

## Preuves navigateur finales

Les tests Playwright utilisent Chrome local, un serveur HTTP loopback temporaire, un profil isolé, le module Firebase simulé et les service workers bloqués. Les requêtes externes sont refusées.

- `node tests/browser-index.mjs` — PASS. Navigation réelle, import texte E17, recherche `Attaque`, règles `Sonné`, rencontre, résolution, suspension/reprise, personnage persistant et clôture.
- E15 dans le même test — jauge `horloge-recette` créée à `0/3`, événement structuré prévisualisé, conséquence appliquée explicitement, puis valeur relue à `1/3`.
- E16 dans le même test — comparaison de 14 cibles réelles, application du seul candidat choisi, avec une seule carte de piste modifiée (`Participant de démonstration 03`). Le parcours de simulation périmée par seconde page est également conservé et abandonné sans effet.
- E04 dans le même test — export puis chargement réel d’une sauvegarde, aperçu du point `Import remplacé`, restauration confirmée, rechargement, profils `Garde importé`/`Éclaireur importé` retrouvés et horloge de la galerie absente.
- `node tests/browser-smoke.mjs` — PASS. CRUD de profil via les cartes Bibliothèque, composition et lancement, résolution physique, PV, undo/redo, édition/retrait d’un participant, reload et clôture.
- `node tests/browser-workspace.mjs` — PASS. Navigation, suivi du combattant courant, panneau contextuel, focus/clavier, quinze acteurs et responsive 1440/900.
- `node tests/browser-e05.mjs` et `node tests/browser-e05-legacy.mjs` — PASS.
- `node tests/browser-offline.mjs` — PASS 5/5 ; `tests/sw.test.js` — PASS 8/8.

Captures produites par l’index réel :

- [`mj-index-play-15-dark-1440.png`](/private/tmp/mj-index-play-15-dark-1440.png) — 1440 px, quinze participants, actions et thème sombre.
- [`mj-index-play-15-dark-900.png`](/private/tmp/mj-index-play-15-dark-900.png) — 900 px, même scène ; la largeur du document reste dans la fenêtre.
- [`mj-index-1440.png`](/private/tmp/mj-index-1440.png) et [`mj-index-900.png`](/private/tmp/mj-index-900.png) — vues Préparer aux deux largeurs.

## Historique technique conservé

Les lots ont ajouté une enveloppe v2 migrable, un stockage IndexedDB transactionnel, une file outbox séparée du journal local, un protocole de synchronisation CAS, des commandes persistantes pour l’historique, les dégâts et l’ordre, puis les projections de scène, rappels, événements, jauges, clôture et simulation. Les modules concernés restent dans `js/core/`, avec les vues de séance dans `js/ui/` et les tests ciblés dans `tests/`.

## Limites et périmètre

- Les règles Firebase v1/v2 sont publiées en production : v1 est en lecture seule par UID et v2 autorise lecture/écriture uniquement par UID propriétaire. Les tests simulateur ont confirmé le refus d’un invité, l’accès de son propre UID et le refus d’un autre UID. Les règles n’ont changé aucune donnée ; une sauvegarde serveur a été exportée le `23/09/2026`.
- Aucun test utilisateur réel de synchronisation n’a été effectué. Le commit `a34f301` a été publié et vérifié sur GitHub Pages.
- La comparaison E16 vérifie l’application d’un choix unique et l’effet visible sur une cible ; les détails algorithmiques complémentaires restent couverts par les tests cœur.
- La restauration E04 est exercée par export/chargement réel dans le navigateur local ; elle vérifie l’aperçu, la confirmation, la persistance et le rechargement, sans prétendre valider un incident de production.
