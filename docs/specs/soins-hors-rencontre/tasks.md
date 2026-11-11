# Tâches · Soins hors rencontre

Chaque tâche est un lot en **fenêtre secondaire**, dans un worktree dédié. Le test vient avant le code et échoue aujourd'hui. Tests ciblés par lot, suite complète à la fusion ; tout test navigateur sous `timeout 120` ; jamais de `git stash` ; rien n'est poussé sans le feu vert du MJ. Ne jamais toucher `js/data/bestiary/`.

`[P]` = parallélisable avec la tâche citée (aucun fichier commun). Les lots T3 à T8 touchent `js/core/store.js` ou `js/core/store/api-aftermath.js` : ils se suivent, jamais deux à la fois.

## Lot A · Nom stable (publiable seul)

- [ ] **T1 · Nom et propriétaire enregistrés à l'ouverture d'un suivi**
  - Objectif : chaque blessure, maladie ou séquelle ouverte reçoit `ownerLabel` (« nom — rencontre ») et, s'il existe, `ownerId` ; le registre accepte ces champs et les garde.
  - Fichiers : `js/core/v5-aftermath.js`, `js/core/v5-sequelae.js`, `js/core/store/api-aftermath.js`, `tests/unit/sequelles/suivi-nom-proprietaire.test.js` (nouveau).
  - Critères : CA1.
  - Acceptation : `node --test tests/unit/sequelles/suivi-nom-proprietaire.test.js`.

- [ ] **T2 · Libellé stable dans Campagne** — après : T1
  - Objectif : `aftermathRowLabel` remplace « Suivi hors rencontre N » ; libellé de repli pour un ancien suivi sans nom.
  - Fichiers : `js/core/aftermath-subjects.js` (nouveau, cette seule fonction), `js/ui/campaign-workspace.js`, `tests/unit/sequelles/suivi-libelle.test.js` (nouveau).
  - Critères : CA2, CA4, CA5.
  - Acceptation : `node --test tests/unit/sequelles/suivi-libelle.test.js` ; `grep -rn "Suivi hors rencontre" js/` ne rend rien.

## Lot B · Le personnage suivi

- [ ] **T3 · Sujet d'un suivi et personnages suivis** — après : T2
  - Objectif : `aftermathSubjectOf` et `followedCharacters`, purs ; la projection de Map Display passe par la même fonction, son comportement inchangé.
  - Fichiers : `js/core/aftermath-subjects.js`, `js/core/map-link-state.js`, `tests/unit/sequelles/suivi-sujet.test.js` (nouveau).
  - Critères : CA3, CA12, CA38, CA40, CA41.
  - Acceptation : `node --test tests/unit/sequelles/suivi-sujet.test.js` puis `node --test tests/unit/combat/liaison-carte-canal.test.js` (couvre `offScenePjParticipants`).

- [ ] **T4 · Fin de combat : reporter, garder ou archiver** — après : T3
  - Objectif : `previewEncounterEnd` et `endEncounter` ; PV, États et Blessures Critiques reportés ; PJ à fiche suivi d'office ; les autres au choix du MJ ; même règle au retrait d'un participant ; statut archivé pour maladies et séquelles ; scène suspendue sans question.
  - Fichiers : `js/core/aftermath-subjects.js`, `js/core/v5-aftermath.js`, `js/core/v5-sequelae.js`, `js/core/store.js`, `tests/unit/sequelles/fin-de-combat.test.js` (nouveau).
  - Critères : CA6 à CA13 (hors fenêtre), CA39.
  - Acceptation : `node --test tests/unit/sequelles/fin-de-combat.test.js`.

- [ ] **T5 · Retour en rencontre** — après : T4
  - Objectif : au lancement, un PJ à fiche prend son personnage suivi sans choix dans Préparer ; un seul exemplaire par ligne porte le personnage ; les Blessures Critiques reviennent sur le participant.
  - Fichiers : `js/core/encounters.js`, `js/core/store.js` (appels de `launchEncounter`), `tests/unit/sequelles/retour-en-rencontre.test.js` (nouveau).
  - Critères : CA24 à CA27.
  - Acceptation : `node --test tests/unit/sequelles/retour-en-rencontre.test.js`.

## Lot C · Soigner hors rencontre

- [ ] **T6 · Commandes de soin sur le sujet résolu** — après : T4
  - Objectif : toutes les commandes de `api-aftermath.js` lisent et écrivent le sujet du suivi ; ouverture d'une maladie et d'un suivi de Blessures perdues pour un personnage suivi.
  - Préalable : figer les reçus de 3.45.1 sur un jeu de cas (test de parité), avant toute modification.
  - Fichiers : `js/core/store/api-aftermath.js`, `js/core/store.js` (`aftermathHealerOf`, `withHealingFumble`, `absentAftermathSubjects`), `tests/unit/sequelles/soins-hors-rencontre.test.js` (nouveau), `tests/unit/sequelles/soins-parite.test.js` (nouveau).
  - Critères : CA15 à CA18, CA32, CA33, CA42.
  - Acceptation : `node --test tests/unit/sequelles/soins-hors-rencontre.test.js` puis `node --test tests/unit/sequelles/soins-parite.test.js`.

- [ ] **T7 · Soigneurs : personnages suivis et soigneur extérieur** — après : T6
  - Objectif : le soigneur peut être un personnage suivi hors rencontre ou un soigneur extérieur saisi (nom, score, Bonus d'Intelligence, talent Chirurgie).
  - Préalable : relire V5 p. 170 à 178 ; si une règle borne qui peut soigner (soi-même, distance, matériel), s'arrêter et poser la question au MJ.
  - Fichiers : `js/core/store/api-aftermath.js`, `js/core/store.js`, `js/core/v5-aftermath.js` (identifiant du soigneur extérieur), `tests/unit/sequelles/soigneurs.test.js` (nouveau).
  - Critères : CA20 à CA23 (hors écran).
  - Acceptation : `node --test tests/unit/sequelles/soigneurs.test.js`.

- [ ] **T8 · Le temps avance pour les personnages suivis** — après : T6
  - Objectif : aperçu et avance du temps demandent les Tests quotidiens des personnages suivis, avec leur score ; seuls les suivis sans sujet restent « absents ».
  - Fichiers : `js/core/store.js` (`syncAftermathToClock`), `js/core/store/api-aftermath.js` (`previewAftermathAdvance`, `advanceAftermathCalendar`), `tests/unit/sequelles/temps-suivis.test.js` (nouveau).
  - Critères : CA28 à CA30.
  - Acceptation : `node --test tests/unit/sequelles/temps-suivis.test.js`.

- [ ] **T9 · « Envoyer aux fiches » : attribution par propriétaire** — `[P]` avec T7 et T8 ; après : T4
  - Objectif : les lignes du registre d'un PJ se comptent par propriétaire en plus de la trace `owners` ; aperçu d'envoi identique.
  - Fichiers : `js/core/fiche-writeback.js`, `tests/unit/` (test existant du chantier H à étendre).
  - Critères : CA36 (partie hors migration).
  - Acceptation : le test unitaire du chantier H étendu, nommé dans le lot.

## Lot D · Écrans

- [ ] **T10 · Campagne : liste, détail, soins, nouveau suivi** — après : T7, T8
  - Objectif : Campagne liste participants et personnages suivis, ouvre toutes les opérations hors rencontre, propose les trois sortes de soigneur ; les messages d'absence disparaissent.
  - Fichiers : `js/ui/campaign-workspace.js`, `js/ui/v5-aftermath-panel.js`, `js/ui/campaign-workspace.css`, `tests/campagne-soins-hors-rencontre-browser.mjs` (nouveau).
  - Critères : CA14, CA15, CA19, CA20, CA22, CA31.
  - Acceptation : `timeout 120 node tests/campagne-soins-hors-rencontre-browser.mjs`.

- [ ] **T11 · Fenêtre « Garder ou archiver » et suppression d'un personnage** — `[P]` avec T10 ; après : T4
  - Objectif : « Terminer le combat » et le retrait d'un participant ouvrent la fenêtre quand il le faut, toast « Annuler » conservé ; supprimer un personnage suivi avec suivis ouverts demande confirmation.
  - Fichiers : `js/main.js`, `js/ui/encounter-end-dialog.js` (nouveau), `js/ui/prepare-view.js`, `tests/fin-de-combat-browser.mjs` (nouveau).
  - Critères : CA8, CA9, CA10, CA11, CA39.
  - Acceptation : `timeout 120 node tests/fin-de-combat-browser.mjs`.

## Lot E · Sauvegardes existantes

- [ ] **T12 · Rattacher les PJ à fiche, archiver les autres anciens suivis** — **bloquée par ARCH-10** ; après : T9
  - Objectif : étape de version idempotente, rejouée zéro fois ; une ligne de journal.
  - Fichiers : ceux que le chantier ARCH-10 désignera pour ses étapes, `tests/fixtures/` (sauvegardes figées), un test unitaire.
  - Critères : CA34 à CA37.
  - Acceptation : à fixer avec la forme retenue par ARCH-10.

## Clôture

- [ ] **T13 · Contre-vérification, documents, version** — après : T10, T11
  - Objectif : `verifier` sur `spec.md` et `plan.md` (code, puis règles) ; README, `docs/SUIVI_EVOLUTION.md`, note d'obsolescence en tête de `docs/CAMPAGNE_LOT2.md` ; suite complète ; version par `node tools/bump-version.mjs` au feu vert du MJ.
  - Acceptation : `node --test "tests/unit/**/*.test.js"` puis `node --test "tests/unit/**/*.test.mjs"`.
