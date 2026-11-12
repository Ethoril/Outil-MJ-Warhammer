# Outil MJ — Warhammer (v3.46.0)

Application web progressive (PWA) qui assiste le Maître de Jeu de **Warhammer Fantasy 4e**, avec le combat et la magie **V5**. Un seul utilisateur (le MJ, francophone) ; HTML5 et modules ES natifs, sans bundler ; hors ligne grâce au service worker. En ligne : <https://ethoril.github.io/Outil-MJ-Warhammer/> (GitHub Pages, branche `main`).

Règles de travail, commandes de test et procédure de publication : [CLAUDE.md](CLAUDE.md). Historique des versions et des chantiers : [docs/SUIVI_EVOLUTION.md](docs/SUIVI_EVOLUTION.md). Documents périmés : `docs/archives/`.

## Les quatre espaces

Onglets de la barre du haut (raccourcis `1` à `4`).

| Espace | Rôle |
|---|---|
| **Préparer** (1) | Réserve de profils (PNJ, PJ, créatures), création, import JSON ([format](docs/IMPORT_PROFILS_JSON.md)) ou texte ([format](docs/IMPORT_PROFILS_TEXTE.md)), composition des rencontres, liaison avec les fiches des PJ. |
| **Jouer** (2) | Combat V5 : initiative, tour courant, résolution des Tests (moteur d’effets unifié, détail des modificateurs), dégâts, critiques, États, magie, prières et miracles, engagements et plateau des mêlées, montures, journal, annulation/rétablissement. Barre du haut : Temps de campagne, Événements, Rappels, « Terminer le combat », « Envoyer aux fiches ». |
| **Campagne** (3) | Temps de campagne, synthèse des suivis des personnages (blessures, critiques, maladies, séquelles, convalescence), soins des participants de la rencontre et des personnages suivis hors rencontre. |
| **Bibliothèque** (4) | Règles consultables, bestiaire, références (armes, armures, mots-clés, talents, sorts, prières). |

Transversal : thème clair/sombre, historique structuré, synchronisation multi-appareils optionnelle (Firebase Realtime Database, connexion Google), sauvegardes et points de restauration (IndexedDB).

## Liaisons externes

- **Fiches des PJ** (dépôt `ennemi-interieur-wfrp4`, Firestore) : l’outil lit les fiches (`js/core/fiche-source.js`, `js/core/fiche-sync.js`, `js/ui/fiche-sync-view.js`) et réécrit en fin de séance les valeurs durables via « Envoyer aux fiches » (`js/core/fiche-writeback.js`, `js/ui/fiche-writeback-view.js`) : aperçu à cocher, conflits tranchés par le MJ, annulation du dernier envoi. Registre des variables : [docs/VARIABLES_PERSISTANTES_PJ.md](docs/VARIABLES_PERSISTANTES_PJ.md) ; guide : [docs/GUIDE_FICHES_PJ_ET_REPRISE_V3.md](docs/GUIDE_FICHES_PJ_ET_REPRISE_V3.md).
- **RPG Map Display** (dépôt `rpg-map-display`) : l’outil pilote les pions de la carte (image, PV, états, taille, portées, montures, morts) et reçoit les retours (posé / à poser, engagements, Course). Code : `js/core/map-link*.js`, `js/ui/map-link-*.js`. Contrat versionné, copie identique dans les deux dépôts : [docs/CONTRAT_LIAISON_MAP_DISPLAY.md](docs/CONTRAT_LIAISON_MAP_DISPLAY.md). Serveur local de liaison : `tools/serve-liaison.mjs`.
- **Données communes aux trois dépôts** : espèces (Taille, Mouvement, formule des Blessures, seuil de mutation) et constantes de la liaison carte (canal, version, délais). Source unique : [js/data/donnees-communes.js](js/data/donnees-communes.js), à ne modifier qu’ici. Copies : `js/core/donnees-communes.js` (Map Display) et `js/data/donnees-communes.js` (fiches).
  - `node tools/recopier-donnees-communes.mjs` réécrit les deux copies (LF) ; à lancer après chaque modification de la source, puis commiter la copie dans chaque dépôt.
  - `node tools/recopier-donnees-communes.mjs --check` n’écrit rien et échoue si une copie manque ou a dérivé.
  - Dépôts ailleurs que sur `E:` (ou worktrees) : `--carte <dossier> --fiches <dossier>`, ou variables `DONNEES_COMMUNES_CARTE` / `DONNEES_COMMUNES_FICHES`. Garde-fou : `tests/unit/donnees/donnees-communes.test.mjs`.

## Arborescence

```
index.html, MJ.css, sw.js, manifest.webmanifest, favicon.svg   coquille PWA (le nom du cache de sw.js suit la version)
js/
  main.js, version.js     démarrage ; APP_VERSION (changée seulement par tools/bump-version.mjs)
  core/                   logique métier pure : store (+ store/), combat, résolution (+ resolution/), moteur d’effets
                          (effect-engine.js), magie v5-magic-*, divin v5-divine-*, créatures creature-*, fiches fiche-*,
                          liaison map-link*, synchronisation sync*, persistance
  data/                   données statiques et contrats JSON (talents, sorts, prières, suppléments, bestiaire, mots-clés)
  ui/                     vues et composants (workspace, panneau de résolution, campagne, fiches, carte, dialogues v5-*)
tests/
  unit/<domaine>/         tests unitaires (node --test) : combat, magie, divin, creatures, sequelles, corruption,
                          referentiel, stockage, ui, moteur, donnees, lot4, lot5, refactor
  helpers/, fixtures/     aides et jeux de données communs
  *-browser.mjs, *.browser.mjs   parcours navigateur Playwright (hors npm test)
tools/                    générateurs, audits, bump-version.mjs, run-browser-journeys.mjs, serve-liaison.mjs
data/                     sources locales (mots-clés des armes et armures)
vendor/                   bibliothèques embarquées (Firebase)
docs/                     contrats, specs (docs/specs/), recettes, rapports ; docs/archives/ = documents périmés
.github/workflows/        CI : tests unitaires sur push et PR vers main
```

## Où trouver les contrats

- Liaison Map Display : [docs/CONTRAT_LIAISON_MAP_DISPLAY.md](docs/CONTRAT_LIAISON_MAP_DISPLAY.md).
- Écriture vers les fiches (contrat `outil-mj`) : [docs/specs/chantier-h-ecriture-fiches/plan.md](docs/specs/chantier-h-ecriture-fiches/plan.md).
- Moteur d’effets unifié (cumul, familles, suppléments sans code) : [docs/specs/moteur-effets-unifie/](docs/specs/moteur-effets-unifie/) ; briques générées : `briques.md`.
- Engagements : [docs/specs/engagements/](docs/specs/engagements/).
- Contenu de supplément en JSON : `js/data/v5-supplements.json`, chargé par `js/core/supplement-loader.js`.
- Contrats de talents, sorts et prières : `js/data/v5-*-contracts.json` ; matrice : [docs/MATRICE_REFERENCES_ET_MOTEURS.md](docs/MATRICE_REFERENCES_ET_MOTEURS.md).
- Règles Firebase : `firebase.database.rules.json` (voir plus bas).
- Analyse d’ensemble du 08/11/2026 : [docs/RAPPORT_ANALYSE_08_11_2026.md](docs/RAPPORT_ANALYSE_08_11_2026.md).

### Version des sauvegardes

Chaque sauvegarde (IndexedDB, points de restauration, fichier exporté, repli localStorage via la clé `wfrp.schema.v1`) porte `schemaVersion` (`CURRENT_SCHEMA_VERSION` dans `js/core/migrations.js`), distinct de `appVersion`. Toute lecture passe par `applySchemaMigrations` (via `migrateSnapshot`) : une absence vaut 0, les étapes de `SCHEMA_MIGRATIONS` s’appliquent dans l’ordre, et une version future est refusée sans rien écraser. Pour transformer des sauvegardes existantes :

1. Ajouter à la fin de `SCHEMA_MIGRATIONS` l’étape `{ from: N, to: N + 1, description, migrate(data, { report }) }`. Elle est pure, rend la sauvegarde transformée et note dans `report` ce qu’elle change.
2. Monter `CURRENT_SCHEMA_VERSION` à `N + 1`, et `SYNC_PROTOCOL_VERSION` (`js/core/sync-protocol.js`) avec, qui doit lui rester égal.
3. Ajouter un test de l’étape sur une sauvegarde figée dans `tests/fixtures/`. `tests/unit/stockage/version-sauvegardes.test.js` échoue tant que la chaîne ne couvre pas la version courante.

Étapes réelles à ce jour : 3 → 4 (soins hors rencontre : les anciens suivis sans participant sont rattachés au personnage du PJ ou archivés ; test `tests/unit/stockage/migration-suivis.test.js`). Un document de synchronisation écrit dans un schéma plus ancien est relu par la même chaîne (`normalizeRemoteDocument`), et la règle Firebase doit accepter le nouveau numéro.

La lecture ne réécrit rien : la sauvegarde garde son ancien numéro jusqu’à la prochaine écriture, et l’étape se rejoue à chaque ouverture d’ici là. Elle doit donc rendre le même résultat si on la rejoue sur la même entrée. Une fois réécrite, la sauvegarde porte le nouveau numéro et ne repasse plus par l’étape.

## Lancement en local

Aucune étape de build : servir le dossier avec n’importe quel serveur statique, puis ouvrir l’adresse affichée.

```bash
python -m http.server 8080
```

## Tests

Node 24. Suite complète, une seule fois à la fin du travail :

```bash
node --test "tests/unit/**/*.test.js"
node --test "tests/unit/**/*.test.mjs"
```

`npm test` enchaîne les deux. Ne jamais cibler un dossier (`node --test tests/unit/<dossier>` échoue sous Node 24) : cibler un fichier, par exemple `node --test tests/unit/combat/degats-et-armures.test.js`. Les parcours navigateur (Playwright, Chrome local) se lancent à part sous `timeout 120` : `npm run test:browser-all` ou le script `test:*` voulu de `package.json`.

## Version et publication

`node tools/bump-version.mjs X.Y.Z` écrit la version partout (dont le nom du cache). Les notes de version se rédigent dans `docs/SUIVI_EVOLUTION.md`. La publication est un push sur `main`, après le feu vert du MJ.

## 🔒 Sécurité Firebase (Vérification §12.3)

La configuration Firebase (`firebaseConfig`) dans `js/core/sync.js` est **publicly accessible** par conception client.

La sécurité est assurée par les **Firebase Security Rules** sur Realtime Database.

Le fichier de règles de production versionné est [`firebase.database.rules.json`](firebase.database.rules.json). Les branches v1 et v2 restent lisibles uniquement par le compte propriétaire pour permettre la reprise, mais leurs écritures sont bloquées afin d’éviter qu’un ancien client ne remplace un état plus récent. La version 3.13.0 utilise `wfrp-sessions-v3/$uid/current`, isolé par compte, avec validation du schéma (3 ou 4 depuis le chantier « soins hors rencontre »), de la révision et des reçus. Toute montée de `CURRENT_SCHEMA_VERSION` exige de déployer ces règles avant de publier l’outil.

Pour déployer uniquement ces règles sur le projet Firebase configuré :

```bash
npx firebase-tools deploy --only database --project outil-mj-warhammer
```

Cette commande publie les règles de Realtime Database; elle n'écrit ni ne migre les données. Vérifier ensuite dans Firebase Console que la version active correspond à `firebase.database.rules.json`. La fixture `firebase.database.rules.v2.test.json` est réservée aux tests et n'est pas la source de déploiement.

La première connexion v3 reprend la séance v2 si aucune racine v3 n’existe, sans modifier la source v2. Une racine v3 existante est conservée. Les anciennes données v1 restent accessibles au propriétaire pour une récupération explicite ; voir le [guide de reprise](docs/GUIDE_FICHES_PJ_ET_REPRISE_V3.md).

---

## 🌐 Navigateurs supportés

Pour la connexion Google et la synchronisation sur téléphone Android, utiliser **Chrome**. Le MJ a confirmé en production la connexion et la récupération des données de son compte sur le téléphone après usage sur ordinateur (8 octobre 2026, version 3.12.3).

**Brave n'est pas pris en charge pour la connexion Google et la synchronisation.** L'échec a été constaté sur Brave Android : la fenêtre de connexion se ferme avec `auth/popup-closed-by-user`, même avec les protections du site désactivées. Cette limitation est acceptée ; aucun correctif spécifique Brave n'est planifié. L'ouverture du formulaire Google sous Brave Windows a été vérifiée, sans validation d'une connexion complète.

Les contrôles navigateur automatisés utilisent Edge sur Windows. Le projet utilise des API modernes (modules ES, `<dialog>`, `structuredClone`, `:has()`). Les autres environnements ne sont pas garantis. Voir le [guide de connexion et de reprise](docs/GUIDE_FICHES_PJ_ET_REPRISE_V3.md) et la [recette du lot 1](docs/RECETTE_FICHES_PJ.md).
