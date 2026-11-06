# Tâches · Chantier H — écriture en retour vers les fiches

Chaque tâche est un lot en **fenêtre secondaire**, sur **un seul dépôt**, dans un worktree dédié. Le test vient avant le code et échoue aujourd'hui. Contre-vérification indépendante (code, puis règles) avant toute publication ; tests ciblés par lot, suite complète à la fusion ; rien n'est poussé sans le feu vert du MJ ; jamais de `git stash`.

`F` = dépôt des fiches, `O` = outil MJ. `[P]` = parallélisable avec la tâche citée (dépôts différents, aucun fichier commun).

## Dépôt des fiches

- [ ] **T1 · F · Commande `outil-mj` : compteurs, caractéristiques, Prière, suivi (stockage)**
  - Objectif : la fonction accepte le type `outil-mj` du contrat (`plan.md` §1) pour les changes `counter`, `carac`, `skill-adv` et `suivi`, avec conflit, rejeu, historique et annulation.
  - Fichiers : `js/fiche/outil-mj.js` (nouveau, recopié par `tools/sync-fiche-domain.mjs`), `js/fiche/commands.js` (aiguillage, clés d'export `suiviMj`), `functions/src/fiche/service.mjs`, `functions/src/fiche/handler.mjs` (si `details` à étendre), `functions/test/fiche-outil-mj.test.mjs` (nouveau).
  - Critères : CA6, CA8, CA9, CA10, CA12, CA13–CA14 (côté fiche), CA16, CA17, CA21, CA23.
  - Acceptation : `npm --prefix functions test` (contient le contrôle de recopie du domaine).

- [ ] **T2 · F · Lignes de talents et d'équipement** — après : T1
  - Objectif : changes `row` sur `talentsAcq` et `equipment` (retrait, restitution à l'identique, validation de l'objet par le catalogue), sans effet sur le journal d'XP.
  - Préalable : lever le risque « talents retirés et journal d'XP » (`plan.md` §6) en lisant `xp.js` et `cancel()` ; si le retrait demande une règle d'XP, s'arrêter et poser la question au MJ.
  - Fichiers : `js/fiche/outil-mj.js`, `functions/test/fiche-outil-mj.test.mjs`.
  - Critères : CA18, CA19 (côté fiche), CA10 sur les lignes.
  - Acceptation : `npm --prefix functions test`.

- [ ] **T3 · F · Test de bout en bout sous émulateur** — après : T2
  - Objectif : appeler `executeFicheCommand` sous émulateur (Firestore + Functions, projet `demo-…`, identifiants de prod refusés) : MJ accepté, joueur refusé, conflit, rejeu, annulation.
  - Fichiers : `tools/fiche-outil-mj-emulator.mjs`, `tools/fiche-outil-mj-emulator.test.mjs`, `package.json` (script `test:outil-mj-emulator`).
  - Critères : CA6, CA8, CA10, CA13 de bout en bout.
  - Acceptation : `npm run test:outil-mj-emulator`.

- [ ] **T4 · F · Section « Suivi du MJ » sur la fiche** — après : T1
  - Objectif : afficher `suiviMj` en lecture seule (bureau et mobile), groupé par catégorie ; rien n'est modifiable par le joueur.
  - Fichiers : `js/fiche-bureau/app.js`, vue mobile de la fiche, CSS associée, test de vue `tools/fiche-suivi-mj.test.mjs`.
  - Critères : CA20, CA22 (affichage), CA21 (aucune commande d'édition côté interface).
  - Acceptation : `node --test tools/fiche-suivi-mj.test.mjs` ; contrôle visuel local.

- [ ] **T5 · F · Contre-vérification et publication des fiches** — après : T3, T4
  - Vérificateurs indépendants (code, règles) ; suite complète `npm run check` ; publication et déploiement de la fonction **sur feu vert du MJ**.

## Outil MJ

- [ ] **T6 · O · Contrat client et plan de différences du lot A** `[P]` avec T1–T4
  - Objectif : `sendCommand` dans la source, `writebackBase` dans `ficheSnapshot`, module pur `fiche-writeback.js` pour les compteurs et les caractéristiques (plan, commande, succès, conflit, annulation), testé sur une source simulée qui reproduit le contrat de `plan.md` §1.
  - Fichiers : `vendor/firebase/firebase-functions.js` (+ `LICENSES.md`), `js/core/fiche-source.js`, `js/core/fiche-sync.js` (bloc `writebackBase` seulement), `js/core/fiche-writeback.js` (nouveau), `tests/fiche-writeback.test.mjs` (nouveau), `sw.js` (précache).
  - Critères : CA2, CA3, CA5, CA6, CA7, CA11, CA12, CA15, CA16, CA17 (côté outil).
  - Acceptation : `node --test tests/fiche-writeback.test.mjs` et les tests existants de `fiche-sync`.

- [ ] **T7 · O · Écran « Envoyer aux fiches »** — après : T6
  - Objectif : entrée du menu `⋯`, aperçu à cases, envoi fiche par fiche, conflits avec choix du MJ, « Annuler le dernier envoi », `lastSend` persistant.
  - Fichiers : `js/ui/fiche-writeback-view.js` (nouveau), `js/main.js`, `index.html`, CSS, `tests/fiche-writeback-browser.mjs` (nouveau, source simulée).
  - Critères : CA1–CA4, CA10, CA11, CA13–CA15.
  - Acceptation : test navigateur sur `localhost:8766` sous `timeout 120`.

- [ ] **T8 · O · Lots B et C : Prière, talents, équipement, suivi** — après : T7
  - Objectif : ajouter au plan de différences les changes `skill-adv`, `row` (excommunication, confiscations) et `suivi` (pénitences, séquelles, cicatrices, maladies, mutations confirmées), en filtrant toute donnée réservée au MJ ; lignes sans `id` de fiche sûr = « à faire à la main ».
  - Fichiers : `js/core/fiche-writeback.js`, `js/core/fiche-sync.js` (lecture de `suiviMj` dans le snapshot), `tests/fiche-writeback.test.mjs`.
  - Critères : CA5, CA18, CA19, CA20, CA22, CA23 (côté outil).
  - Acceptation : `node --test tests/fiche-writeback.test.mjs`.

- [ ] **T9 · O · Contre-vérification, recette prod et publication** — après : T5, T8
  - Vérificateurs indépendants ; suite complète à la fusion ; recette CA24 sur `ethoril.github.io` (fiche `test`, ou un PJ réel avec l'accord du MJ) ; publication **sur feu vert du MJ** ; mise à jour de `docs/VARIABLES_PERSISTANTES_PJ.md` (colonne « écrit vers la fiche »).
  - Critères : CA24, puis tous les CA par le `verifier`.
