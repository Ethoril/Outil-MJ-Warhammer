# Outil MJ — Warhammer (v3.21.4)

Application web progressive (PWA) d’assistance au Maître de Jeu pour **Warhammer**, avec combat **V5** et fiches importées. Version 3.21.4 : prières, bénédictions et miracles V5 (livre de base et suppléments), dont Protection, Souffle, Morsure du Loup, Écraser les faibles, Fortune généreuse, N’écoutez point la Sorcière, Malice de Ranald, Attaque Rapide, Fureur d’Ulric, En Bon Ordre et Larmes de Shallya (registre des Blessures Critiques), en plus des talents et de la magie.

Le [rapport de recette du lot 2](docs/lot2/LOT2_RECETTE_2_5.md) décrit le périmètre livré, les contrôles et les limites. Les effets narratifs restent des rappels, les valeurs de progression appartiennent aux fiches et la magie/les prières automatisées restent au lot 3.

📋 **Plan d’évolution** : [fonctionnement, interface et fonctionnalités](PLAN_EVOLUTION.md) — programme par étapes, critères de validation et migrations ; écran destiné aux joueurs hors périmètre.

🔗 **Application en ligne** : [https://ethoril.github.io/Outil-MJ-Warhammer/](https://ethoril.github.io/Outil-MJ-Warhammer/)

---

## 🎯 Fonctionnalités principales

* **Réserve de profils** : Gestion des PNJ, PJ et Créatures avec caractéristiques, armures et lignes de dés prédéfinies. Création par le formulaire « Nouveau profil », par import JSON ([format](docs/IMPORT_PROFILS_JSON.md)) ou par import texte ([format](docs/IMPORT_PROFILS_TEXTE.md)).
* **Gestionnaire de combat interactif** :
  * Suppression directe des rencontres et de leur combat actif ou suspendu, annulable, sans clôture ni archivage.
  * Bouton « Retirer du combat » pour les PNJ à 0 PV ou moins ; les PJ restent en jeu.
  * Suivi d'initiative dynamique par glisser-déplacer.
  * Zones *Active* et *En attente / Réserve tactique*.
  * Moteur de combat V5 : opposition, Élan binaire, choix d’inversion sans relance, localisation, critiques indépendants du vainqueur, dégâts et États. Les qualités et talents raccordés exposent leurs contributions et les choix nécessaires avant application.
  * 206 talents classés : 131 contrats moteur, 19 purement narratifs, 18 entièrement traités dans les fiches, 10 bonus de caractéristiques exclus et 28 réservés au lot 3. Fortune et usages de talents sont persistants, atomiques et annulables.
  * Mots-clés d'armes et d'armures lus dans l'onglet « Mots Clés Armes et Armures » des aides de jeu (noms officiels, 55 entrées), avec copie locale hors ligne.
  * Gestion automatique des états (*Hémorragique*, *Enflammé*, *Surpris*, *Sonné*, *Inconscient*...).
* **Panneau de règles interactif** : Base de données de règles avec moteur de recherche en temps réel et sections auto-dépliables.
* **Confort d'usage & PWA** :
  * Annulation et rétablissement des commandes locales, conservés après rechargement ; une modification externe du combat ferme l’historique applicable.
  * Raccourcis clavier globaux (`N` / `Espace` tour suivant, `D` sélection des dés, `1`/`2`/`3` navigation).
  * Thème sombre / clair / système mémorisé.
  * Historique d'événements structuré avec filtrage par type et combattant.
  * Mode hors-ligne complet grâce au Service Worker et démarrage dégradé sur `localStorage`.
  * Synchronisation multi-appareils optionnelle via Firebase Realtime Database.

---

## 📁 Arborescence du projet

```
Outil-MJ-Warhammer/
├── assets/                  # Ressources statiques (images, textures, icônes)
│   └── images/old-paper.svg # Texture de fond parchemin
├── js/                      # Architecture modulaire ES
│   ├── core/                # Logique métier pure (Store, Combat, Dice, Damage, States, Models, Sync)
│   ├── data/                # Bases de données statiques (Règles WFRP 4e)
│   ├── ui/                  # Composants et vues d'interface utilisateurs (Card, Reserve, Combat, Log, Keyboard, Toast, Theme, Rules)
│   └── version.js           # Constante de version de l'application
├── tests/                   # Suite de tests unitaires (node --test)
│   ├── damage.test.js
│   ├── dice.test.js
│   ├── rules.test.js
│   ├── states.test.js
│   ├── store.test.js
│   └── ux.test.js
├── index.html               # Coquille HTML5 avec sémantique ARIA
├── MJ.css                   # Design system avec jetons CSS et mode sombre
├── favicon.svg              # Icône de l'application
├── manifest.webmanifest     # Manifeste PWA
├── sw.js                    # Service Worker (stratégie Cache-First)
└── package.json
```

---

## 🚀 Lancement en local

L'application est construite en HTML5 / ES Modules natifs sans bundler complexe.

### 1. Démarrer un serveur HTTP local
Vous pouvez utiliser n'importe quel serveur HTTP statique (par exemple `npx serve`, `python3 -m http.server`, ou l'extension Live Server de VSCode) :

```bash
npx serve .
# Ou
python3 -m http.server 8080
```
Ouvrez ensuite `http://localhost:8080` dans votre navigateur.

---

## 🧪 Exécution des tests

Les tests sont écrits sans dépendances tierces en utilisant le test runner natif de Node.js (v20+ / v24) :

```bash
npm test
```
`node --test` découvre lui-même les fichiers de `tests/` : ne pas les énumérer à la main,
la liste a déjà été oubliée trois fois, masquant jusqu'à vingt tests dont un en échec.

Pour ne rejouer qu'un fichier :
```bash
node --test tests/damage.test.js
```

---

## 🔒 Sécurité Firebase (Vérification §12.3)

La configuration Firebase (`firebaseConfig`) dans `js/core/sync.js` est **publicly accessible** par conception client.

La sécurité est assurée par les **Firebase Security Rules** sur Realtime Database.

Le fichier de règles de production versionné est [`firebase.database.rules.json`](firebase.database.rules.json). Les branches v1 et v2 restent lisibles uniquement par le compte propriétaire pour permettre la reprise, mais leurs écritures sont bloquées afin d’éviter qu’un ancien client ne remplace un état plus récent. La version 3.13.0 utilise `wfrp-sessions-v3/$uid/current`, isolé par compte, avec validation du schéma 3, de la révision et des reçus.

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

## Clôture locale V5 : magie 3.15.0

Le chantier courant conserve 277 contrats et un catalogue aligné sur la feuille publique du 14 octobre. Les trois clauses de talents restantes ont des preuves Store/UI ; les effets assistés et familles différées restent explicites. [Bilan](docs/lot3/LOT3_FINALISATION_MAGIE.md), [rapport](docs/lot3/LOT3_RAPPORT_CLOTURE.md), [recette complète](docs/lot3/LOT3_RECETTE_3_15.md), [nouveautés MJ](docs/lot3/LOT3_JOURNAL_3_15_0.md). Génération reproductible : node tools/check-lot3-generation.mjs ; les commandes de recette nécessitent Edge Windows. Paquet courant 3.15.0 dans tmp/lot3/release-path.json, aucune publication.

## Historique du chantier V5 : magie 3.14.0

La finalisation locale et le périmètre restant sont consignés dans [le bilan de magie](docs/lot3/LOT3_FINALISATION_MAGIE.md), avec [la recette 3.5](docs/lot3/LOT3_RECETTE_3_5.md). Les ingrédients sont exclus ; les 15 miracles sont seulement inventoriés. Le paquet de travail reste local et non publié.

## Prières, bénédictions et miracles V5 (3.16.0)

72 bénédictions (12 cultes) et 128 miracles (livre de base V5 et suppléments Archives of the Empire 3, Deft Steps Light Fingers, Power Behind the Throne Companion, Lustria, Up in Arms) sont déclarés par contrat sourcé dans le panneau « Prières divines » de Jouer. 52 miracles appliquent automatiquement leurs effets chiffrables (statuts « assisté » et « implémenté ») ; le reste s'affiche avec ses clauses et ses rappels MJ. Les 9 miracles de Myrmidia d'Up in Arms (V4, p.79) sont raccordés après arbitrage du MJ : 3 assistés (Commander la Légion, Effrayer l'Ennemi, Compétence Martiale), 6 manuels avec clauses et rappels ([adaptations](docs/divin/DIVIN_UP_IN_ARMS_ADAPTATIONS.md)). Cadrage : [docs/divin/PRIERES_CADRAGE_RESSERRE.md](docs/divin/PRIERES_CADRAGE_RESSERRE.md). Régénération des contrats : `node tools/build-v5-divine-contracts.mjs` puis `--check`.
