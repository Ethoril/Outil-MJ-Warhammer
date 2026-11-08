# Suivi des lots d’évolution

État consolidé au `23/09/2026`, version `3.6.3`. Les validations applicatives ci-dessous portent sur l’arbre local partagé. Les règles Firebase de production ont été publiées et relues dans la console le `23/09/2026` ; une sauvegarde serveur a été exportée le même jour. Depuis la bascule, v1 est en lecture seule pour son UID propriétaire et v2 limite lecture et écriture à son UID propriétaire. Les règles n’ont pas modifié les données. Le site GitHub Pages est distribué depuis la branche `main`. Aujourd’hui (`23/09/2026`), l’import de la sauvegarde de production vers le compte v2 a été vérifié : le statut est resté « Synchronisé » après rechargement et l’export Firebase v2 affiche la révision 2 avec 26 profils, 4 participants et 12 lignes. Aucun test multi-clients n’est revendiqué.

| Lot | État | Preuves finales |
|---|---|---|
| E01–E04 | Intégré et validé localement | `npm test -- --test-concurrency=1` : 199/199 ; `tests/e04-idb-browser.mjs` ; import, points de restauration et réhydratation vérifiés dans le navigateur réel. |
| E05 | Intégré et validé sur les adaptateurs locaux | Suites E05 ciblées, `tests/browser-e05.mjs`, `tests/browser-e05-legacy.mjs`, `tests/browser-offline.mjs` : 5/5. |
| E07–E08 | Intégré et validé | Tests de commandes, historique, dégâts et ordre ; smoke réel avec résolution, PV, undo/redo, retrait et rechargement. |
| E09–E10 | Intégré et validé dans la vraie coquille | Navigation Préparer/Jouer/Bibliothèque, profils complets, recherche actions/tags, favoris, règles réelles, sélection et suivi du tour. |
| E11–E17 | Intégré ; parcours navigateur bornés passants | `tests/browser-index.mjs` couvre lancement, suspension/reprise, clôture, personnage persistant, E15, E16 et E04 sur l’index réel. |

## 3.43.0 — espace Campagne (08/11/2026)

- Nouvel onglet Campagne, troisième entre Jouer et Bibliothèque (raccourci « 3 », Bibliothèque sur « 4 ») : temps de campagne, synthèse des suivis par personnage (blessures, critiques, maladies, séquelles, convalescence) et soins contextuels au personnage sélectionné. « Suites de combat » dans Jouer renvoie vers Campagne ; Jouer passe en pleine largeur avec rail latéral repliable.
- Limite connue : les soins et tests de convalescence ne visent que les participants de la rencontre en cours. Un suivi rattaché à un participant absent est affiché sous « Suivi hors rencontre » et peut seulement être archivé ; la continuité des soins entre rencontres demande d’abord un contrat d’identité (voir `docs/CAMPAGNE_LOT2.md`).
- Le contenu avait été déployé le 07/11 (`babe2ba`) sans changement de version, avec un cache suffixé à la main ; la 3.43.0 rétablit la règle « nom du cache = `wfrp-cache-v<version>` » et ajoute `node tools/bump-version.mjs X.Y.Z`, qui écrit la version dans ses sept emplacements (les notes restent à rédiger).

- Correctifs du lot A (08/11/2026, `git log 50d3592..5db1628`, publiés avec la 3.43.0) : touche 3 pour Campagne et 4 pour Bibliothèque, raccourcis inactifs avec Ctrl/Alt/⌘ ; quatre onglets sur une ligne à 390 px ; `aria-labelledby` orphelins de `index.html` corrigés ; une entrée invalide de `divineEffects` ne bloque plus le recalcul des couches de magie ; un `localStorage` interdit ne fait plus échouer `main.js` ; une fiche réinitialisée (tombstone) n’est plus lue comme disponible ; liaison Map Display : une monture fusionnée n’est plus « À poser » et la distance vers elle est mesurée, les PV max du participant l’emportent sur ceux du profil, les indicateurs « posé » sont vidés à chaque instantané et à la déconnexion, l’instantané envoie toujours `mj.engagements` même vide (contrat §10 précisé) ; `safe-storage.js` dans le précache du service worker ; `npm test` borné à `tests/unit`.

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
- L’import réel de sauvegarde vers le compte v2 a été confirmé aujourd’hui par un rechargement à l’état « Synchronisé » et un export Firebase v2 à révision 2 (26 profils, 4 participants, 12 lignes) ; aucun test multi-clients n’a été réalisé. Le commit `a34f301` a été publié et vérifié sur GitHub Pages.
- La comparaison E16 vérifie l’application d’un choix unique et l’effet visible sur une cible ; les détails algorithmiques complémentaires restent couverts par les tests cœur.
- La restauration E04 est exercée par export/chargement réel dans le navigateur local ; elle vérifie l’aperçu, la confirmation, la persistance et le rechargement, sans prétendre valider un incident de production.

## Historique des versions 3.33.0 à 3.43.0 (repris du README le 08/11/2026)

Application web progressive (PWA) d’assistance au Maître de Jeu pour **Warhammer**, avec combat **V5** et fiches importées.

**Version 3.43.0** : nouvel espace Campagne (troisième onglet, entre Jouer et Bibliothèque) qui rassemble le temps de campagne, la synthèse des suivis des personnages (blessures, critiques, maladies, séquelles, convalescence) et les soins contextuels au personnage sélectionné ; « Suites de combat » dans Jouer renvoie vers Campagne ; Jouer réorganisé en pleine largeur avec rail latéral repliable. Limites : les soins et tests de convalescence ne s’appliquent qu’aux participants de la rencontre en cours ; un suivi rattaché à un participant absent est seulement affiché (« Suivi hors rencontre ») et peut être archivé, sans soin possible hors rencontre.

**Version 3.42.5** : une arme ou une armure sans mots-clés ne bloque plus le calcul d’une attaque ni l’import de l’inventaire d’une fiche ; une erreur imprévue du calcul affiche son détail.

**Version 3.42.4** : égalités d’Initiative simplifiées (à deux, les deux d100 demandés ensemble et le vainqueur agit en premier, ou le MJ choisit directement qui commence ; le Test d’I ne demande plus de compétence pour Vagabond ou Grimpeur) ; une rencontre nommée « test » n’enregistre rien, n’envoie rien aux fiches et revient à l’état d’avant à sa fin.

**Version 3.42.3** : la caractéristique déclarée sur chaque ligne de compétence de la fiche fait foi (une compétence rattachée à la Dextérité sur la fiche garde la Dextérité).

**Version 3.42.2** : un PJ Ogre (Taille Grande par son espèce) reçoit +BF aux dégâts de mêlée normaux (V5 p. 360).

**Version 3.42.1** : les PJ prennent la Taille de leur espèce lue sur la fiche (Halfelin et Gnome Petits, Ogre Grand), sauf Trait ou Taille explicite ; le talent Petit voit l’écart de Taille.

**Version 3.42.0** : « Envoyer aux fiches » (menu ⋯) réécrit en fin de séance les valeurs durables des PJ sur leurs fiches (Destin, Fortune, Péché, Corruption, pertes de caractéristique sur la Base, Prière, talents retirés par un rejet définitif, objets retenus ou rendus par le Courroux, Suivi du MJ : pénitences, séquelles permanentes, cicatrices, maladies, mutations manifestées), avec aperçu à cocher, conflits tranchés par le MJ et « Annuler le dernier envoi » ; marque « Manifestée » sur les mutations confirmées.

**Version 3.41.0** : liaison avec RPG Map Display (l’outil pilote les pions de la carte : image, PV, états, taille, portées effectives, montures fusionnées en un pion, morts et leurs effets ; retours de la carte : posé / à poser, engagements suggérés au contact, distance préremplie, Course signalée) et voyant de liaison dans la barre du haut ; moteur d’effets unifié pour tous les Tests (États, talents, sorts et prières, surnombre, qualités, montures) avec détail des modificateurs, source, montant et effets écartés barrés ; questions d’États en magie modifiables ; contenu de supplément chargé sans code (js/data/v5-supplements.json) ; mot-clé Barrakul ; couleur du pion au profil ; fiche en onglets compacts ; Circonstances en onglet du panneau latéral ; barre de PV avec aperçu des dégâts ; Temps de campagne, Événements et Rappels dans la barre du haut, avec « Terminer le combat » (filet : « Annuler ») ; armes des profils L12 en français ; barre du haut sans débordement à 390 px.

**Version 3.40.0** : montures déclarées dans le profil (animal du bestiaire dressé comme monture), qui entrent en combat avec leur cavalier, et pastille « À pied / Monté » sur le jeton et la fiche, lue par les règles du combat monté ; champs V5 des fiches lus (Fortune, Péché, Corruption, familiers devenus profils du bestiaire, mots-clés de Haine et Sans peur) ; premier import d’une fiche qui crée le profil PJ ; Peur et Terreur alignées sur la V5 ; Fureur selon le livre de base (p. 364) ; rappels limités à ce que l’outil n’applique pas ; plein écran, tiroir des circonstances dans sa colonne, bouton « Lancer » sur chaque saisie de dés.

**Version 3.39.0** : plateau des mêlées à la place de la piste (engagements durables par paire, créés par l’attaque de mêlée et expirés après un Round sans attaque ; barre d’actions qui annonce les conséquences : Attaquer, Charger, Se désengager, Fuir, Tirer, Viser) ; surnombre et tir dans la mêlée déduits du plateau, forçables par le MJ ; circonstances de scène réglées une fois pour la rencontre, positions durables, « À régler maintenant » en tête du tiroir.

**Version 3.38.0** : Malice de Ranald sur les jets de profil et actions manuelles (CC par défaut en mêlée, sinon Caractéristique demandée) ; cavalier désarçonné à la mort confirmée de sa monture ; En Bon Ordre visible sur la fiche de l’allié ; sorts sur « Endurance » appliqués aux Tests de Résistance ; texte de Fortune selon la liaison à une fiche.

**Version 3.37.0** : corrections de la recette des parcours partiels (dé secondaire d’incident lancé pour les PNJ ; Souffle jusqu’à son dernier Round ; commandes de Régénération, têtes, Nuée et Venin dans l’Espace de séance ; payeur nommé dans la ligne de coût ; PA à saisir pour un appendice sans table propre ; motifs de refus lisibles).

**Version 3.36.0** : corrections de la recette 3.35.0 (tir double d’Arbalète à répétition enchaîné ; état d’arme lisible ; cibles d’Explosion et de Dispersion cochées par leur nom ; raison du rechargement affichée ; Larmes de Shallya sur le critique choisi ; reçu du lanceur ; boutons de perte au Chaos actifs ; créatures invoquées en cours de Round avec leur Initiative et leur rang ; aperçu de la pause de Focalisation avec les vrais DR).

**Version 3.35.0** : corrections de la recette manuelle 3.34.0 (renfort en cours de Round avec jet d’Initiative à son rang ; tir dans la mêlée dévié vers un autre engagé, touché d’office ; Larmes de Shallya ; empoignade et Tests de Force ; armes non reliées à l’inventaire en saisie manuelle ; Peur/Terreur et création de familier de retour dans Jouer ; un seul temps pour la campagne et la convalescence ; PA par membre, événements, Corruption et camp Neutre corrigés ; journal groupé par Tour ; attaques du bestiaire avec leur score).

**Version 3.34.0** : corrections de la recette du panneau d'action (grandes rencontres : prière, sort, critique, PV et Tour suivant ne sont plus refusés ; vraie cause affichée quand un résultat n'est pas appliqué ; jet d'incident avec « Lancer » ; attaque ratée gagnant le Test opposé expliquée ; « Ignorer » une Bénédiction de Protection pour une action ; confirmations Oui / Non en un clic ; prière simplifiée avec culte du profil ; lignes « À saisir » menant à leur champ).

**Version 3.33.1** : la mise à jour télécharge à nouveau tous les fichiers au lieu de reprendre d'anciennes copies du navigateur (l'outil ne démarrait plus après la 3.33.0 derrière un serveur local).

**Version 3.33.0** : panneau d'action refondu en trois étapes (action et cible, jets, résultat), pied « Appliquer » avec la liste des saisies manquantes, tiroir « Circonstances » regroupé par thèmes avec compteur, étiquettes PJ/PNJ et bouton « Lancer tous les dés des PNJ », menu « Sort, prière, Corruption… ».

## Anciennes notes de chantier V5 (magie, prières), reprises du README

### Clôture locale V5 : magie 3.15.0

Le chantier courant conserve 277 contrats et un catalogue aligné sur la feuille publique du 14 octobre. Les trois clauses de talents restantes ont des preuves Store/UI ; les effets assistés et familles différées restent explicites. [Bilan](docs/lot3/LOT3_FINALISATION_MAGIE.md), [rapport](docs/lot3/LOT3_RAPPORT_CLOTURE.md), [recette complète](docs/lot3/LOT3_RECETTE_3_15.md), [nouveautés MJ](docs/lot3/LOT3_JOURNAL_3_15_0.md). Génération reproductible : node tools/check-lot3-generation.mjs ; les commandes de recette nécessitent Edge Windows. Paquet courant 3.15.0 dans tmp/lot3/release-path.json, aucune publication.

### Historique du chantier V5 : magie 3.14.0

La finalisation locale et le périmètre restant sont consignés dans [le bilan de magie](docs/lot3/LOT3_FINALISATION_MAGIE.md), avec [la recette 3.5](docs/lot3/LOT3_RECETTE_3_5.md). Les ingrédients sont exclus ; les 15 miracles sont seulement inventoriés. Le paquet de travail reste local et non publié.

### Prières, bénédictions et miracles V5 (3.16.0)

72 bénédictions (12 cultes) et 128 miracles (livre de base V5 et suppléments Archives of the Empire 3, Deft Steps Light Fingers, Power Behind the Throne Companion, Lustria, Up in Arms) sont déclarés par contrat sourcé dans le panneau « Prières divines » de Jouer. 52 miracles appliquent automatiquement leurs effets chiffrables (statuts « assisté » et « implémenté ») ; le reste s'affiche avec ses clauses et ses rappels MJ. Les 9 miracles de Myrmidia d'Up in Arms (V4, p.79) sont raccordés après arbitrage du MJ : 3 assistés (Commander la Légion, Effrayer l'Ennemi, Compétence Martiale), 6 manuels avec clauses et rappels ([adaptations](docs/divin/DIVIN_UP_IN_ARMS_ADAPTATIONS.md)). Cadrage : [docs/divin/PRIERES_CADRAGE_RESSERRE.md](docs/divin/PRIERES_CADRAGE_RESSERRE.md). Régénération des contrats : `node tools/build-v5-divine-contracts.mjs` puis `--check`.
