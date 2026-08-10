# Outil MJ — Warhammer Fantasy Roleplay 4e (v3.5)

Application web progressive (PWA) d'assistance au Maître de Jeu pour **Warhammer Fantasy Roleplay 4e édition**.

🔗 **Application en ligne** : [https://ethoril.github.io/Outil-MJ-Warhammer/](https://ethoril.github.io/Outil-MJ-Warhammer/)

---

## 🎯 Fonctionnalités principales

* **Réserve de profils** : Gestion des PNJ, PJ et Créatures avec caractéristiques, armures et lignes de dés prédéfinies.
* **Gestionnaire de combat interactif** :
  * Suivi d'initiative dynamique par glisser-déplacer.
  * Zones *Active* et *En attente / Réserve tactique*.
  * Moteur de calcul de dégâts WFRP 4e (localisation automatique d100 inverse, déduction Endurance/Armure, plancher à 1, gestion des armes *Inoffensives*, Acharnement automatique et état *À Terre*).
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

**Règle vérifiée en console le 10 août 2026 :**

```json
{
  "rules": {
    "wfrp-sessions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

---

## 🌐 Navigateurs supportés

**Cible unique : Chrome sur macOS.** C'est le seul environnement d'usage et le seul vérifié.
Le projet emploie délibérément des API modernes sans solution de repli (modules ES,
`<dialog>`, `structuredClone`, `:has()`), et aucun test n'a été mené ailleurs.
Autres navigateurs récents : probablement fonctionnels, non garantis.
