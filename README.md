# Outil MJ — Warhammer Fantasy Roleplay 4e (v3.12.3)

Application web progressive (PWA) d'assistance au Maître de Jeu pour **Warhammer Fantasy Roleplay 4e édition**.

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
  * Moteur de calcul de dégâts WFRP 4e (localisation automatique d100 inverse, déduction Endurance/Armure, plancher à 1, gestion des armes *Inoffensives*, Acharnement automatique et état *À Terre*). *Pointue* (+1 DR sur une attaque réussie) et *Imprécise* (−1 DR) modifient le DR de l'attaque, avant le test opposé et les dégâts.
  * Mots-clés d'armes et d'armures lus dans l'onglet « Mots Clés Armes et Armures » des aides de jeu (noms officiels, 55 entrées), avec copie locale hors ligne.
  * Gestion automatique des états (*Hémorragique*, *Enflammé*, *Surpris*, *Sonné*, *Inconscient*...).
* **Panneau de règles interactif** : Base de données de règles avec moteur de recherche en temps réel et sections auto-dépliables.
* **Confort d'usage & PWA** :
  * Annulation du dernier geste destructif (`⌘Z`), sur un niveau.
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

Le fichier de règles de production versionné est [`firebase.database.rules.json`](firebase.database.rules.json). Les branches v1 et v2 restent lisibles uniquement par le compte propriétaire pour permettre la reprise, mais leurs écritures sont bloquées afin d’éviter qu’un ancien client ne remplace un état plus récent. La version 3.12.3 utilise `wfrp-sessions-v3/$uid/current`, isolé par compte, avec validation du schéma 3, de la révision et des reçus.

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
