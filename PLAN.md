# Plan de refonte — Outil MJ Warhammer

> Document de travail. Établi à partir de l'audit du commit `24d7056` (v3.5).
> Destiné à être exécuté **lot par lot**, dans l'ordre.

---

## 0. Cadre de travail

### Contexte d'exécution cible

L'outil tourne **exclusivement sur Chrome / macOS**, en usage mono-utilisateur.
Conséquences, à appliquer partout :

- Pas de compatibilité navigateur à assurer. Les API modernes sont disponibles sans réserve :
  modules ES, `<dialog>`, `structuredClone`, `:has()`, imbrication CSS, `Array.prototype.at`,
  champs privés de classe, `AbortController`. **Ne pas ajouter de polyfill, de préfixe vendeur
  ni de solution de repli.**
- Pas de support tactile à prévoir. Le glisser-déposer HTML5 reste le seul mécanisme de
  déplacement des cartes.
- Les raccourcis clavier utilisent la convention macOS (`⌘` / `metaKey`, pas `ctrlKey`).
- Le message « essayez CTRL+F5 » du bouton version est faux sur Mac ; il disparaît de toute
  façon au lot 6.

### Contraintes permanentes

| Règle | Détail |
|---|---|
| **Aucune dépendance d'exécution** | Rien à installer pour faire tourner l'app. Firebase reste chargé depuis `gstatic` (jusqu'au lot 12). Pas de framework, pas de bundler, pas d'étape de build. |
| **Le site reste servi statiquement** | GitHub Pages sert le dépôt tel quel. Tout fichier référencé doit exister à la racine du dépôt ou dans un sous-dossier. |
| **Langue de l'interface : français** | Tout libellé, message, `title`, `placeholder` et texte de journal est en français. Les identifiants, noms de fonctions, de variables et de fichiers restent en anglais. |
| **Identité visuelle préservée** | Le thème parchemin (Cinzel / Lora, `--bg: #f5e5c7`, rouge `#8a0707`) est un choix assumé. Ne pas le remplacer. Le lot 11 ajoute un thème sombre **à côté**, pas à la place. |
| **Pas de refactor opportuniste** | Chaque lot ne touche que ce qu'il déclare toucher. Une amélioration repérée hors périmètre se signale dans le compte rendu, elle ne se code pas. |

### ⚠ Deux règles acquises, valables pour tous les lots suivants

Issues des lots 3 et 4. Les enfreindre ne produit **aucune erreur visible** — c'est ce qui les
rend dangereuses.

**1. Dans le Store, on émet avec `emitBus()`, jamais avec `Bus.emit()`.**
C'est ce qui permet à `batch()` de regrouper les rendus. Une nouvelle méthode du Store qui
appellerait `Bus.emit()` directement casserait le groupage en silence. Seule exception : le
gestionnaire `onValue`, asynchrone, qui ne peut jamais s'exécuter pendant un lot — JavaScript
étant mono-thread et `batch()` synchrone.

**2. Dans l'initialiseur du Store, on référence `api`, jamais `Store`.**
La constante `Store` n'est assignée qu'à la sortie de son propre IIFE. Y faire référence depuis
l'intérieur ne fonctionne que grâce à l'asynchronisme du callback : c'est une zone morte
temporelle déguisée, exactement le défaut que `A-11` visait à supprimer.

### Protocole de livraison

1. Gemini traite **un seul lot à la fois**, dans l'ordre.
2. Gemini **ne commite pas, ne pousse pas, ne crée pas de branche**. Le travail est laissé
   dans l'arbre de travail (`git status` doit montrer les modifications non indexées).
3. À la fin d'un lot, Gemini produit un **compte rendu court** :
   - fichiers touchés,
   - constats traités (par identifiant, ex. `A-02`),
   - écarts par rapport au plan et leur justification,
   - ce qui n'a pas pu être fait.
4. La relecture, la correction, le commit **et la poussée** sont assurés séparément, lot par
   lot. **Le lot suivant ne démarre qu'une fois le lot courant poussé sur `origin/main`.**
   Chaque lot donne donc exactement un commit sur GitHub — pas de gros bloc accumulé.

### Recette

Chaque lot porte ses propres critères de recette, à vérifier à la livraison. La **recette
manuelle de fin de projet** est rassemblée à part dans [`TESTS.md`](TESTS.md) : 147
vérifications numérotées, organisées selon un usage naturel de l'outil plutôt que par lot, avec
un jeu d'essai aux valeurs choisies pour que les calculs de dégâts tombent juste.

`tests/fixtures/ancien-format.json` est le **seul témoin** d'une sauvegarde antérieure au lot 2
(tour stocké en `turnIndex`). Il sert à vérifier la migration du §2.1 une fois qu'il n'existera
plus aucune sauvegarde réelle à cet ancien format. **Ne jamais le régénérer avec
l'application** : elle y écrirait `currentActorId` et le témoin perdrait tout objet.

### Notation des constats

Les identifiants (`A-01`, `E-02`…) renvoient à l'audit. Chaque lot les liste explicitement.
Les numéros de ligne cités valent pour le commit `24d7056` et **dérivent dès le premier lot** :
toujours localiser par nom de symbole, jamais par numéro de ligne.

### Hors périmètre (constats écartés)

| Constat | Raison |
|---|---|
| `E-03` — alternative tactile au glisser-déposer | Pas d'usage tablette. Le drag & drop souris fonctionne. |
| `E-09` — formulaire en colonnes sous 600 px | Pas d'usage mobile. Un point de rupture à ~900 px pour laptop 13″ est prévu au lot 11, ça suffit. |

---

## Lot 1 — Classes CSS fantômes

**Constats :** `B-01`, `B-02`, `B-03`, `B-04`
**Fichier :** `MJ.css` uniquement
**Ampleur :** une quinzaine de lignes. Aucune logique modifiée.

### Problème

Quatre classes sont utilisées dans `index.html` et `MJ.js` mais ne sont définies nulle part.
Elles ne produisent aucune erreur — seulement un rendu silencieusement faux.

### À faire

1. **`.actions`** — définir comme conteneur flex. Le `<div class="actions">` du formulaire de
   profil contient un `.spacer { flex: 1 }` qui ne peut pas fonctionner hors contexte flex ;
   la rangée « Ajouter / Annuler / Exemple / Vider » est actuellement cassée.
   ```css
   .actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
   ```

2. **`.muted`** — brancher la variable `--muted`, qui existe déjà mais n'est jamais utilisée
   par une classe. Une quinzaine d'occurrences dans le HTML et le JS.
   ```css
   .muted { color: var(--muted); }
   ```
   Vérifier ensuite que `.muted` en descendant de `label` (déjà en `color: var(--muted)`)
   ne crée pas de conflit de spécificité.

3. **`button.danger`** — les actions destructives (« Suppr » d'un profil, « Vider » la réserve)
   portent `class="danger ghost"` et ressortent exactement comme « Éditer ». Seul
   `.action-btn.danger` est stylé aujourd'hui.
   ```css
   button.danger { color: #b33a3a; border-color: #b33a3a; }
   button.danger:hover { background: #b33a3a; color: #fff; border-color: #b33a3a; }
   ```
   Attention à l'ordre de déclaration : `button.ghost` met `border-color: transparent`,
   `button.danger` doit gagner. Placer la règle après.

4. **`.badge.good` / `.badge.bad`** — le badge « Critique » / « Maladresse » du résultat de jet
   (`MJ.js`, fonction `runDiceLine`) s'affiche en badge neutre. C'est l'information la plus
   spectaculaire de l'application.
   ```css
   .badge.good { background: #3a7a44; color: #fff; border-color: #2c5c34; }
   .badge.bad  { background: #b33a3a; color: #fff; border-color: #8a0707; }
   ```

5. **`.full-width`** — utilisée sur le bouton « + Ajouter un jet » de la carte de combattant.
   ```css
   .full-width { width: 100%; }
   ```

### Recette

- Panneau Réserve : les quatre boutons du formulaire sont sur une seule ligne, « Exemple » et
  « Vider » poussés à droite par le spacer.
- « Suppr » et « Vider » sont visiblement rouges.
- Les compteurs de groupes `(3)`, le texte « Glissez-déposez les cartes… » et « Aucun profil »
  sont visiblement plus pâles que le texte courant.
- Provoquer un double réussi sur un jet : le badge « Critique » est vert. Un double raté :
  le badge « Maladresse » est rouge.

---

## Lot 2 — Bugs du moteur de combat

**Constats :** `A-02`, `A-05`, `A-06`, `A-10`
**Fichiers :** `MJ.js`, `index.html`
**Ampleur :** moyenne. Touche à la représentation du tour courant — migration de données requise.

### 2.1 — `A-02` : remplacer `turnIndex` par `currentActorId`

**Problème.** `combat.turnIndex` est un *index* dans le tableau `combat.order`. Le
glisser-déposer réécrit `order` sans ajuster l'index : le tour bascule silencieusement sur un
autre combattant. Le bug est partiellement masqué par le fait que « Tour suivant » recalcule un
ordre d'initiative indépendant de `order` — ce qui crée une seconde source de vérité.

**À faire.**

- Remplacer `combat.turnIndex` (nombre) par `combat.currentActorId` (chaîne ou `null`) partout :
  `applyDataToState`, `load`, `save`, `getFullJSON`, `setRoundTurn`, `resetCombat`,
  `Combat.actorAtTurn`, `Combat.start`, le gestionnaire de « Tour suivant ».
- `actorAtTurn()` devient `combat.participants.get(combat.currentActorId) ?? null`.
- **Migration obligatoire.** Les sauvegardes existantes (localStorage, Firebase, fichiers JSON)
  ne contiennent que `turnIndex`. Dans `applyDataToState` et `load` : si `currentActorId` est
  absent et que `turnIndex` est un entier ≥ 0, dériver `currentActorId = order[turnIndex]`.
  Continuer à **lire** `turnIndex` indéfiniment ; ne plus jamais l'écrire.
- Supprimer le second ordre de tour : « Tour suivant » ne doit plus recalculer un tri
  d'initiative local. Voir 2.3.

### 2.2 — `A-05` : « Démarrer » peut donner le tour à un combattant du banc

**Problème.** `Combat.start()` pose `turnIndex = 0`, or `order` mélange zone active et banc.

**À faire.** `start()` doit :
- construire la liste des participants en `zone === 'active'`, triés par initiative
  décroissante puis par nom (même critère que `setOrderByInitiative`) ;
- si la liste est vide, ne rien faire et journaliser « Aucun combattant en zone active » ;
- sinon poser `round = 1` (si `round === 0`) et `currentActorId` = premier de la liste.

Corriger aussi l'entorse d'encapsulation relevée en `C-07` : `start()` écrit actuellement
`st.round` et `st.turnIndex` directement sur l'objet rendu par `getState()` avant d'appeler
`setRoundTurn`. Passer uniquement par `Store.setRoundTurn(round, actorId)`.

### 2.3 — `A-06` : le réordonnancement ne s'affiche pas immédiatement

**Problème.** `handleDrop` appelle `updateParticipant` (qui déclenche le rendu) *avant*
`setOrder` (qui n'en déclenche aucun). L'affichage se reconstruit avec l'ancien ordre ; le
nouveau n'apparaît qu'au rendu suivant — le plus souvent l'écho Firebase 300 ms plus tard, ce
qui rend le comportement erratique.

**À faire.**

- Ajouter au Store une opération atomique unique :
  ```js
  moveParticipant(id, zone, beforeId /* string | null */)
  ```
  qui met à jour la zone, recalcule `combat.order`, appelle `save()` **une fois** et émet
  `Bus.emit('combat')` **une fois**.
- `handleDrop` n'appelle plus que `Store.moveParticipant(...)`.
- L'ordre global reste la concaténation `[...actifs, ...banc]`.

**Point d'attention.** L'ordre du tour doit désormais découler de l'initiative, pas de `order`.
`order` ne sert plus qu'à l'affichage. Le gestionnaire « Tour suivant » calcule la liste des
actifs triés par initiative, trouve la position de `currentActorId`, avance d'un cran, et
incrémente le round au bouclage. Si `currentActorId` ne figure plus dans la liste (combattant
retiré ou envoyé au banc pendant son tour), reprendre au premier de la liste sans incrémenter
le round.

### 2.4 — `A-10` : aucun moyen de terminer un combat

**Problème.** `Store.resetCombat()` existe et fait exactement ce qu'il faut, mais aucun bouton
ne l'appelle. « Nettoyer Piste » se contente d'effacer le flux de résultats de dés.

**À faire.**

- Renommer le bouton `#btn-reset` en **« Effacer les jets »** — c'est ce qu'il fait réellement.
  Retirer sa `confirm()` (l'action est anodine et réversible d'un nouveau jet).
- Ajouter un bouton **« Terminer le combat »** dans le même groupe, câblé sur
  `Store.resetCombat()`, sous `confirm()` (« Retirer tous les combattants et remettre le round
  à zéro ? »). Le styler en `danger`.
- `resetCombat()` doit journaliser l'événement et remettre `currentActorId` à `null`.

### Recette

- Démarrer un combat avec des combattants au banc placés en tête de liste : le tour s'ouvre sur
  le premier **actif** par initiative.
- Pendant le tour de quelqu'un, réordonner les cartes par glisser-déposer : l'ordre affiché
  change **immédiatement**, et le liseré « tour en cours » reste sur le même combattant.
- Déplacer le combattant dont c'est le tour vers le banc, puis « Tour suivant » : pas de
  plantage, le tour repart proprement.
- Charger un fichier JSON sauvegardé avant ce lot : le tour courant est correctement restauré.
- « Terminer le combat » vide les deux zones, remet Round à 0 et Tour à `–`.

---

## Lot 3 — Bugs de synchronisation Firebase

**Constats :** `A-01`, `A-03`, `A-04`, `A-11`
**Fichiers :** `MJ.js`
**Ampleur :** moyenne. C'est le lot le plus délicat des correctifs ; le tester avec deux onglets.

### 3.1 — `A-03` : le champ de saisie perd le focus pendant la frappe

**Problème.** Taper une note sur un jet déclenche `save()`, qui écrit vers Firebase après
300 ms. Firebase renvoie la donnée **à ce même client** via `onValue`, qui appelle
`applyDataToState` puis `Bus.emit('combat')` — et `renderCombat()` reconstruit tout le DOM à
coups de `innerHTML = ''`. Le champ dans lequel on écrivait n'existe plus.

**À faire.** Identifier et ignorer son propre écho.

- Générer un identifiant de client au démarrage : `const CLIENT_ID = crypto.randomUUID()`.
  Il vit le temps de l'onglet, il n'est pas persisté.
- Ajouter `writer: CLIENT_ID` au payload envoyé à Firebase (à côté du `timestamp` existant).
- Dans le gestionnaire `onValue` : si `data.writer === CLIENT_ID`, **sortir immédiatement**.
  C'est notre propre écriture qui nous revient.

### 3.2 — `A-04` : dernière écriture gagne, sans arbitrage

**Problème.** Le payload contient un `timestamp` qui n'est jamais relu ni comparé. Deux onglets
ouverts se battent ; surtout, après un moment de travail sans réseau, la version serveur — plus
ancienne — écrase le travail local sans un mot.

**À faire.**

- Passer `timestamp` en millisecondes (`Date.now()`) plutôt qu'en chaîne ISO. Conserver la
  lecture des anciennes valeurs ISO via `Date.parse()` en repli.
- Maintenir en mémoire `lastAppliedTimestamp`, et le persister dans `localStorage`
  (clé `wfrp.sync.ts.v1`) à chaque `save()`.
- Dans `onValue`, après le filtre de 3.1 :
  - si `data.timestamp < lastAppliedTimestamp` → **ne pas appliquer**. Journaliser
    `⚠️ Données serveur plus anciennes que l'état local — ignorées` et **repousser l'état local
    vers Firebase** pour réaligner le serveur.
  - sinon → appliquer et mettre `lastAppliedTimestamp` à jour.

### 3.3 — `A-01` : « Vider la Réserve » ne vide rien

**Problème.** Le bouton supprime la clé `localStorage` puis recharge la page. Mais Firebase
détient toujours la réserve : au rechargement, `onValue` la restaure intégralement. La fonction
est inopérante dès qu'on est connecté, c'est-à-dire toujours.

**À faire.**

- Ajouter `Store.clearReserve()` : vide la `Map`, appelle `save()` (ce qui pousse l'état vide
  vers Firebase), émet `Bus.emit('reserve')`, journalise.
- Le bouton appelle cette méthode. **Supprimer le `location.reload()`** et le
  `localStorage.removeItem` direct.
- Renforcer la confirmation : indiquer le nombre de profils qui vont disparaître
  (« Supprimer les 23 profils de la Réserve ? Cette action est irréversible. »).

### 3.4 — `A-11` : le listener est branché avant l'initialisation de l'état

**Problème.** `SYNC.onValue(...)` s'exécute avant les déclarations `let reserve = new Map()` /
`let combat = {...}`. Ça ne casse que parce que Firebase répond de façon asynchrone : c'est une
zone morte temporelle qui n'attend qu'un cache chaud pour lever un `ReferenceError`.

**À faire.** Déplacer l'enregistrement du listener **après** les déclarations d'état et après
l'appel à `load()`, en fin d'IIFE du Store. Les fonctions `applyDataToState` et `save` étant des
déclarations hoistées, aucun autre ajustement n'est nécessaire.

### 3.5 — Nettoyage induit

Le gestionnaire `onValue` réécrit aujourd'hui manuellement les quatre clés `localStorage` après
`applyDataToState`, en dupliquant le corps de `save()`. Remplacer par un appel à une fonction
`persistLocal()` extraite de `save()`, utilisée par les deux chemins.

> **Fait.** Le lot 4 étant passé avant le lot 3, `persistLocal()` a été extrait du `try/catch`
> de `save()` — la garde de lot restant dans `save()`, et la construction de `rObj`/`cObj` étant
> partagée avec le payload Firebase. Appelé depuis `onValue`, `persistLocal()` s'exécute
> inconditionnellement, sans passer par la garde de lot.

### Recette

- Ouvrir deux onglets sur l'app. Taper une longue note dans un champ de jet **sans faire de
  pause** ni après : le curseur ne saute jamais, le texte n'est jamais tronqué.
- Dans l'onglet A, modifier des PV. L'onglet B se met à jour en moins d'une seconde.
- Vider la réserve depuis l'onglet A : elle se vide dans les deux onglets, et reste vide après
  un rechargement complet (⌘R).
- Couper le réseau (DevTools → Network → Offline), modifier plusieurs choses, rétablir le
  réseau : le travail local n'est pas écrasé, et le serveur se réaligne.

---

## Lot 4 — Robustesse et performance du Store

**Constats :** `A-07`, `A-08`, `A-09`
**Fichier :** `MJ.js`
**Ampleur :** faible à moyenne. Aucun changement visible à l'écran, sauf la vitesse d'import.

### 4.1 — `A-07` : le journal grandit sans plafond, et chaque frappe le resérialise

**Problème.** Chaque `save()` re-sérialise l'intégralité du journal, de la réserve et des
participants vers `localStorage` **et** vers Firebase. Après une longue campagne, ce coût domine
chaque interaction. Aucun `try/catch` n'entoure `setItem` : le jour où le quota de 5 Mo est
atteint, la sauvegarde lève une exception et s'interrompt sans que rien ne le signale.

**À faire.**

- Plafonner le journal à **300 entrées** : dans `Store.log()`, après le `unshift`, tronquer
  (`if (log.length > 300) log.length = 300`).
- Entourer chaque écriture `localStorage` d'un `try/catch`. En cas d'échec (`QuotaExceededError`
  ou autre) : journaliser en console **et** afficher un avertissement visible dans l'interface
  (une ligne dans le journal suffit à ce stade ; le lot 10 apportera les toasts).
- Ne pas toucher au débounce de 300 ms, il est correct.

### 4.2 — `A-08` : l'import déclenche un rendu complet par élément

**Problème.** `importFromReserve` appelle `addParticipant` puis `addDiceLine` ligne par ligne.
Chacun enchaîne `rebuildOrder()`, `save()` et un rendu complet. Importer 10 profils portant
3 jets chacun, c'est une quarantaine de reconstructions du DOM et autant d'écritures disque.

**À faire.**

- Ajouter au Store un mode transactionnel :
  ```js
  Store.batch(fn)  // exécute fn(), en suspendant save() et Bus.emit(); les rejoue une fois à la fin
  ```
  Implémentation : un compteur de profondeur + un `Set` des événements à émettre. `save()` et
  `Bus.emit` internes vérifient le compteur ; à `0`, ils s'exécutent normalement.
- Envelopper `importFromReserve` dans `Store.batch(...)`.
- Passer en revue les autres boucles appelant des méthodes du Store (le bouton « Exemple » de la
  Réserve appelle `addProfile` quatre fois) et les envelopper aussi.

### 4.3 — `A-09` : modifier un profil ne propage pas l'initiative

**Problème.** `updateProfile` recopie vers les participants en combat le nom, le type, les
caractéristiques et l'armure — mais pas l'initiative.

**À faire.**

- Ajouter `initiative` à la liste des champs propagés.
- **Ne pas** propager `hp` : les PV d'un participant sont sa valeur courante en combat, pas son
  maximum. Ajouter un commentaire explicite à cet endroit pour que le choix ne se reperde pas.
  (Le lot 5 introduira un `maxHp` distinct, qui lui sera propagé.)

### Recette

- Importer une quinzaine de profils d'un coup : l'opération est instantanée, sans clignotement.
- Générer 400 lignes de journal (jets répétés), recharger : les 300 dernières sont là, l'app
  démarre sans lenteur.
- Modifier l'initiative d'un profil déjà en combat : la carte et le suivi d'initiative se mettent
  à jour ; les PV courants du participant ne bougent pas.

---

## Lot 5 — Saisie rapide des points de vie

**Constat :** `E-01`
**Fichiers :** `index.html` (template `#tpl-actor`), `MJ.js`, `MJ.css`
**Ampleur :** faible. Meilleur rapport effort/bénéfice de tout le plan.

### Problème

Retirer des PV est le geste le plus fréquent de toute la séance, et c'est aussi le plus lent :
les boutons `−PV` / `+PV` avancent par pas de un. Neuf dégâts, neuf clics.

### À faire

1. **Remplacer la paire de boutons** dans `#tpl-actor` par un groupe compact :
   ```
   [ − ] [  ] [ + ]
   ```
   - un `<input type="number" class="hp-delta" placeholder="1">` étroit (~44 px),
   - un bouton `−` et un bouton `+` de part et d'autre.

2. **Comportement.**
   - `−` retire la valeur du champ, ou **1** si le champ est vide.
   - `+` ajoute la valeur du champ, ou **1** si le champ est vide.
   - `Entrée` dans le champ **retire** la valeur (le cas courant est de subir des dégâts).
   - Après application, le champ se vide et **garde le focus** (enchaînement rapide).
   - Une valeur négative saisie est traitée en valeur absolue ; le bouton décide du signe.

3. **Introduire `maxHp` sur `Participant`.**
   - Alimenté depuis `Profile.hp` à l'import.
   - Propagé par `updateProfile` (contrairement à `hp`, cf. 4.3).
   - Migration : à la lecture d'un participant sans `maxHp`, retomber sur le `hp` du profil
     source s'il existe, sinon sur le `hp` courant du participant.
   - Le badge devient **`PV 8 / 12`**. Ajouter une classe `.hp-badge.low` (rouge) quand
     `hp <= maxHp / 4`, et `.hp-badge.down` (fond sombre) quand `hp <= 0`.

4. **Édition directe des PV.** Clic sur le badge PV → édition en ligne de la valeur absolue
   (un `<input>` qui remplace le badge, validé par `Entrée`, annulé par `Échap`). Même
   traitement que l'initiative au lot 10 — mutualiser le helper dès maintenant si c'est naturel,
   sinon le faire au lot 10.

5. **Journalisation.** Une entrée par variation, au format
   `⚔️ Saskia la Noire : 12 → 4 PV (−8)`.

6. **Bornes.** Les PV peuvent descendre sous zéro (utile au MJ pour mesurer un dépassement).
   Ne pas borner à 0. Borner en haut à `maxHp` si `maxHp` est défini.

### Attention

Le rendu de la carte passe par `updateCardUI` pour les mises à jour ciblées. Ce chemin gère
déjà `hp` ; il faut y ajouter `maxHp` et les classes d'état du badge, sinon le format `8 / 12`
ne se rafraîchira pas correctement.

### Recette

- Saisir `8`, `Entrée` : les PV chutent de 8, le champ est vide et toujours actif, on peut
  enchaîner `3`, `Entrée`.
- Champ vide + `−` : retire 1.
- Le badge affiche `PV 4 / 12`, passe au rouge sous 3, et se distingue nettement à 0 ou moins.
- Recharger : `maxHp` est bien persisté et restauré.

---

## Lot 6 — Modularisation ES et outillage de test

**Constats :** `C-01`, `C-02`, `C-04`, `C-05`, `C-06`, `C-07`, `A-12`, `A-13`, `A-14`, `D-04`
**Fichiers :** tous
**Ampleur :** la plus grosse du plan en volume de déplacement, mais **à comportement constant**.

> **Règle d'or de ce lot : aucun changement de comportement.** C'est un déplacement de code plus
> l'ajout de tests. Toute correction de logique repérée en route se signale, elle ne se code pas
> — sauf les trois points explicitement listés en 6.5.

### 6.1 — Arborescence cible

```
index.html
MJ.css
js/
  main.js              point d'entrée (chargé en <script type="module">)
  version.js           APP_VERSION, source unique
  data/
    crits.js           CRIT_DATA
    magic.js           MAGIC_DATA
    states.js          liste des états + leurs effets automatiques
  core/
    dice.js            d100, isDouble, SL, getReverseRoll, getLocationName, getCritEffect
    models.js          Profile, Participant, DiceLine
    sanitize.js        sanitizeArray, sanitizeProfile, sanitizeParticipant, parseState
    store.js           état, persistance locale, batch
    sync.js            Firebase (init, onValue, push, arbitrage timestamp)
    combat.js          moteur de tour et d'initiative, decrementStates
  ui/
    bus.js             EventBus
    dom.js             qs, qsa, on, escapeHtml, refs DOM
    reserve.js         panneau Réserve + formulaire de profil
    combat-view.js     zones, suivi d'initiative, bandeau de contrôle
    card.js            rendu d'une carte de combattant + délégation d'événements
    dice-line.js       rendu et exécution d'une ligne de jet
    import-modal.js    modale d'import
    rules-view.js      génération des tables de référence
    log-view.js        journal
tests/
  dice.test.js
  states.test.js
package.json           { "type": "module", "scripts": { "test": "node --test tests/" } }
.gitignore
```

`MJ.js` disparaît. `MJ.css` reste un fichier unique (139 lignes ; le découpage n'a pas encore de
justification — le refaire si le fichier dépasse ~400 lignes).

### 6.2 — Chargement (`C-04`)

**Problème.** Firebase est initialisé dans un module inline de `index.html` qui pose ses
fonctions sur `window.__WFRP_FIREBASE__`, puis injecte dynamiquement
`<script src="MJ.js?v=18">`. Ce détour existe uniquement parce que `MJ.js` n'est pas un module.

**À faire.**

- `index.html` charge un seul `<script type="module" src="js/main.js"></script>`.
- `js/core/sync.js` importe le SDK Firebase directement depuis `gstatic` et exporte une
  fonction `awaitAuth()` qui résout sur l'utilisateur connecté.
- `js/main.js` attend l'authentification, puis initialise le Store et l'interface.
- **Supprimer** `window.__WFRP_FIREBASE__`, `window.loginWithGoogle` et `window.logoutUser` :
  les gestionnaires se branchent par `addEventListener` depuis `main.js`, plus par `onclick`
  dans le HTML.
- Conserver l'écran de connexion et sa logique d'affichage à l'identique.

### 6.3 — Version unique (`C-05`, `D-04`)

**Problème.** `APP_VERSION = "3.5"` dans `MJ.js`, `?v=18` dans `index.html` — deux compteurs
désynchronisés, le second à incrémenter à la main à chaque déploiement.

**À faire.**

- `js/version.js` exporte `APP_VERSION`, seule source.
- Supprimer le paramètre `?v=` : les modules ES sont revalidés correctement par Chrome, et le
  lot 12 mettra en place un service worker qui gère le cache proprement.
- Le bouton version affiche le numéro et, au clic, une simple ligne de journal — supprimer
  l'`alert()` et le conseil « CTRL+F5 » (faux sur Mac).

### 6.4 — Suppression des duplications (`C-06`)

- `renderReserve` et `renderImportModal` contiennent le même bloc de regroupement par groupe,
  au caractère près. Extraire `groupProfiles(profiles) → Map<string, Profile[]>` dans
  `core/models.js` ou un `ui/grouping.js`.
- `makeCritTable` et `makeMagicTable` sont strictement identiques. Une seule fonction
  `renderD100Table(rows)` dans `ui/rules-view.js`.

### 6.5 — Les trois corrections autorisées dans ce lot

Ces trois-là sont trop liées au déplacement pour être différées.

- **`A-12` — boutons de dé identifiés par leur texte.** La délégation teste
  `e.target.textContent === '🎲'` et `=== '×'`. Remplacer par des classes dédiées
  `.btn-roll` et `.btn-del-dice`, posées à la construction de la ligne.
- **`A-14` — code mort.** Supprimer `clampInt`, `opt`, `badge`, `Bus.off` et
  `listParticipantsRaw`, qui ne sont appelés nulle part.
- **`C-07` — `getState()` rend les `Map` internes modifiables.** Une fois `Combat.start()`
  corrigé au lot 2, plus rien ne mute l'état hors du Store. Scinder l'accès en lectures
  explicites (`getCombat()`, `getReserve()`, `getDiceLines()`, `getLog()`) et retirer
  `getState()`. Ne pas figer les objets (`Object.freeze` coûterait cher au rendu) — la
  discipline d'accès suffit.

### 6.6 — `A-13` : deux approximations sur les règles de dés

**Décisions arrêtées par le MJ.** À coder telles quelles.

| Point | Comportement actuel | Comportement attendu |
|---|---|---|
| `getReverseRoll(100)` | `"100".padStart(2,'0')` reste `"100"` → inversé `"001"` → 1 → « Tête » | Traiter 100 comme `00` : l'inversion vaut 100 → « Jambe droite ». Peu atteignable (100 est toujours un échec) mais faux en l'état. |
| `isDouble(100)` | `false` (garde `n <= 99`) | **`true` — le « 00 » compte comme un double.** |

Couvrir les deux par un test, pour que le choix reste visible et modifiable en une ligne.

### 6.7 — Tests (`C-02`)

**Zéro dépendance.** Le lanceur de tests intégré à Node (`node --test`) suffit ; il n'y a
`npm install` à faire nulle part. Le `package.json` ne sert qu'à déclarer `"type": "module"` et
le script `test`.

Couvrir **uniquement les fonctions pures** — ne pas chercher à tester le DOM ni Firebase :

- `tests/dice.test.js` — `SL` (cas nominal, égalité, roll 100), `isDouble` (11, 55, 99, 100, 10),
  `getReverseRoll` (23→32, 4→40, 10→1, 100→100), `getLocationName` (bornes 9/10, 24/25, 44/45,
  79/80, 89/90, 100), `getCritEffect` (première ligne, dernière ligne, valeur hors table).
- `tests/states.test.js` — `parseState` (avec et sans durée, durée invalide), et la logique de
  `decrementStates` extraite en fonction pure : dégâts d'Hémorragique, dégâts d'Enflammé
  (`1d10 + niveaux − BE − armure la plus faible`, plancher à 0), dissipation de « Surpris »,
  décrémentation des durées, expiration, passage à Inconscient quand les PV atteignent 0.

  Pour rendre `decrementStates` testable, en extraire une fonction pure
  `computeEndOfTurn(participant, roll)` qui prend le jet en paramètre plutôt que d'appeler
  `d100()` — et laisser l'appelant fournir le hasard.

### 6.8 — `.gitignore`

Le dépôt n'en a pas. Contenu minimal, contexte macOS :

```
.DS_Store
node_modules/
*.log
.vscode/
.idea/
```

### Recette

- `npm test` (ou `node --test tests/`) passe intégralement, sans installation préalable.
- L'application démarre, se connecte, et **toutes** les fonctions du lot 1 à 5 se comportent
  exactement comme avant. Passer en revue : création de profil, import, glisser-déposer, tour
  suivant, jet de dé, critique, sauvegarde fichier, chargement fichier, journal.
- La console est vide de toute erreur au démarrage.
- `window.__WFRP_FIREBASE__` est `undefined` dans la console.
- Un fichier JSON sauvegardé avant ce lot se recharge correctement.

---

## Lot 7 — Calcul des dégâts

**Constat :** `E-02`
**Fichiers :** `js/core/damage.js` (nouveau), `js/core/models.js`, `js/ui/dice-line.js`,
`js/ui/card.js`, `index.html`, `MJ.css`, `tests/damage.test.js`
**Ampleur :** la plus grosse en valeur ajoutée. Repose sur le lot 6.

### Problème

Le jet donne la réussite, les DR, la localisation touchée et le tableau de critique — puis
l'outil rend la main. Il manque la dernière étape, qui est justement la plus fastidieuse à
faire de tête. Or **toutes les données sont déjà là** : l'armure est stockée par localisation
sur chaque participant, l'Endurance sert déjà à afficher le BE sur la carte, et la localisation
touchée est calculée à chaque réussite.

Les champs `targetType`, `targetValue`, `targetAttr` et `opponentRoll` de `DiceLine` sont les
vestiges d'une première tentative et ne sont plus lus nulle part.

### 7.1 — Modèle

Sur `DiceLine` :
- **supprimer** `targetType`, `targetValue`, `targetAttr`, `opponentRoll` (avec migration
  silencieuse : les ignorer à la lecture) ;
- **ajouter** `damage` (nombre, dégâts de base de l'arme), `targetId` (identifiant du
  participant visé, ou `null`) et `qualities` (tableau de chaînes).

`targetId` est persisté : au cours d'un round, on attaque souvent la même cible. Le nettoyer
quand le participant visé est retiré du combat.

**`qualities`** porte les qualités et défauts d'arme. Le MJ dispose d'une base d'une trentaine
de mots-clés (voir **lot 13**) ; certains prennent une valeur numérique (Explosion X,
Taille X, Recharge X…). La forme doit donc être définitive **dès maintenant**, pour ne pas
imposer une migration entre le lot 7 et le lot 13 :

```js
qualities: [ { id: 'inoffensive' }, { id: 'explosion', rating: 3 } ]
```

- `id` : slug stable, minuscules sans accent (`inoffensive`, `penetrante`, `poudre-noire`).
- `rating` : facultatif, uniquement pour les mots-clés qui prennent un X.

**Ne pas** réutiliser l'encodage par `|` employé pour la durée des états (`"Sonné|3"`) : c'est
un raccourci hérité qu'il ne faut pas propager à un nouveau champ.

**Une seule qualité est honorée au calcul du lot 7 : `inoffensive`.** Les autres `id` sont
**conservés à la lecture et à l'écriture mais ignorés au calcul**. Le lot 13 apporte la table
complète et branche les suivants.

### 7.2 — Interface de la ligne de jet

La ligne passe de 4 à 6 contrôles. Rester compact — la carte fait 300 px de large ;
si nécessaire, passer la ligne sur deux rangées.

| Contrôle | Rôle |
|---|---|
| `Score` | existant — compétence totale |
| `Note` | existant — libellé (« Épée », « Morsure ») |
| `Dég.` | **nouveau** — dégâts de base de l'arme, numérique étroit |
| `Cible` | **nouveau** — `<select>` des participants en zone active, hors soi-même. Option vide = « aucune cible » |
| `Inof.` | **nouveau** — bascule compacte pour la qualité `inoffensive`, allumée quand active, `title` explicatif |
| `🎲` | existant |
| `×` | existant |

La bascule `Inof.` est un bouton à deux états, pas une case à cocher : à cette taille, une case
avec son libellé mange trop de place. Prévoir un état visuel actif net (fond accentué), pas
seulement une nuance de bordure.

### 7.3 — Formule

**Décisions arrêtées par le MJ.** Une touche réussie inflige **au moins 1 blessure**, même si
l'Endurance et l'armure absorbent tout.

**Inoffensive a deux effets, cumulatifs :**
1. les points d'armure de la localisation touchée sont **doublés** ;
2. le **plancher de 1 tombe à 0** — c'est la seule qualité qui autorise une touche à ne rien
   infliger du tout.

```
paEffectif = PA_localisation × (Inoffensive ? FACTEUR_INOFFENSIVE : 1)
absorption = BE_cible + paEffectif
net        = dégâtsArme + DR − absorption

dégâts = net > 0 ? net : (Inoffensive ? 0 : PLANCHER_TOUCHE)
```

- `DR` : les degrés de réussite du jet, déjà calculés (`SL`). Peut être négatif sur une
  réussite marginale — ne pas le borner, c'est le plancher final qui protège.
- `BE_cible` : `Math.floor(cible.caracs.E / 10)`, déjà calculé pour l'affichage de la carte.
- `PA_localisation` : le point d'armure correspondant à la localisation touchée —
  `head` / `body` / `arms` / `legs`. La table de localisation distingue bras gauche et droit,
  jambe gauche et droite ; les deux retombent respectivement sur `arms` et `legs`.

**Deux constantes nommées, commentées, en tête de `core/damage.js`** — ce sont des règles de
table, donc les points du code les plus susceptibles d'être ajustés. Ne pas les noyer dans un
`Math.max` en ligne :

```js
export const PLANCHER_TOUCHE = 1;      // une touche réussie inflige toujours au moins ceci
export const FACTEUR_INOFFENSIVE = 2;  // multiplicateur de PA de la qualité Inoffensive
```

Confirmé par le MJ : Inoffensive porte bien les deux effets. La base de mots-clés
(`data/mots-cles-armes.tsv`) a été mise à jour en conséquence.

Le calcul n'a lieu que si : le jet est **réussi**, une **cible** est sélectionnée, et
`damage` est renseigné. Sinon, le résultat s'affiche comme aujourd'hui, sans bloc dégâts.

### 7.4 — Affichage et application

Dans le bloc de résultat, sous la ligne existante, ajouter :

```
Dégâts  6 + DR 2 − (BE 3 + PA 2) = 3        [ Appliquer −3 PV à Gorbag ]
```

Quand le plancher s'applique, ou quand une qualité modifie l'absorption, le dire explicitement
plutôt que d'afficher un total qui ne découle pas visiblement du calcul :

```
Dégâts  4 + DR 1 − (BE 3 + PA 4) = −2 → 1 minimum       [ Appliquer −1 PV à Gorbag ]
Dégâts  6 + DR 2 − (BE 3 + PA 2×2) = 1  Inoffensive     [ Appliquer −1 PV à Gorbag ]
```

- Le détail du calcul est **toujours visible** : le MJ doit pouvoir arbitrer, pas subir.
- **Ne jamais appliquer automatiquement.** Un bouton, un clic. Le MJ peut vouloir ignorer,
  ajuster, ou tenir compte d'une règle que l'outil ne connaît pas.
- Le bouton se désactive après usage (éviter la double application sur un résultat qui reste
  affiché dans le flux).
- L'application passe par le même chemin que le lot 5, donc journalisée de la même façon.

### 7.5 — Automatismes de règles

À inclure :

- **Acharnement.** Si la cible est déjà à 0 PV ou moins, toute touche réussie inflige
  automatiquement un critique — même sans double. Le signaler explicitement dans le résultat
  (« Acharnement : cible à 0 PV »).
- **Gravité majorée.** Le jet sur la table de critique reçoit **+10** si la cible est à 0 PV
  ou moins.
- **Passage à Terre.** Quand l'application des dégâts fait tomber la cible à 0 PV ou moins et
  qu'elle n'a pas déjà l'état, ajouter automatiquement **« À Terre »** — le même mécanisme que
  celui qui ajoute déjà « Inconscient » en fin de tour.

À **ne pas** inclure (hors périmètre, à la main du MJ) : la déviation critique par sacrifice
d'armure, les points de Destin et de Résilience, les armes à qualité spéciale
(Percutante, Pénétrante…).

### 7.6 — Aller-retour avec les modèles de la Réserve

**Piège à ne pas manquer.** Les jets pré-configurés d'un profil ne portent aujourd'hui que
`base` et `note`, et `importFromReserve` ne recopie que ces deux champs. Si on ajoute `damage`
et `qualities` sans toucher à ce chemin, ils seront systématiquement perdus à l'import — le
MJ configurerait ses armes dans la Réserve pour rien.

**À faire :**
- ajouter les colonnes `Dég.` et la bascule `Inof.` aux lignes de jet du **formulaire de
  profil** (`addProfileDiceRow`), au même titre que `Score` et `Label` ;
- les collecter à la soumission du formulaire ;
- les recopier dans `importFromReserve` ;
- `targetId` n'est **pas** un attribut de profil : il reste vide à l'import.

### 7.7 — Tests

`tests/damage.test.js`, sur une fonction pure
`computeDamage({ weaponDamage, sl, targetToughnessBonus, targetArmour, qualities })` :

- cas nominal ;
- absorption totale → **1** (plancher) ;
- absorption exactement égale au brut (net = 0) → 1 ;
- `inoffensive` → les PA comptent double, et le plancher s'applique toujours ;
- `inoffensive` sur une cible sans armure → aucun effet (2 × 0 = 0) ;
- DR négatif sur une réussite marginale ;
- qualité inconnue dans `qualities` → ignorée, résultat identique à `qualities: []` ;
- qualité avec `rating` inconnue → ignorée sans plantage ;
- localisation bras gauche et bras droit → même valeur d'armure ;
- cible sans caractéristique `E` → BE de 0, pas de plantage ;
- cible sans armure définie → PA de 0, pas de plantage.

### Recette

- Configurer une créature avec `E 35` (BE 3) et `Corps 2`. L'attaquer avec un jet à 6 de dégâts
  réussi avec 2 DR touchant le corps : le bloc affiche `6 + 2 − (3 + 2) = 3`.
- Cliquer « Appliquer » : les PV de la cible baissent de 3, le journal l'enregistre, le bouton
  se grise.
- Même créature, armure `Corps 6` : le bloc affiche le calcul négatif puis `→ 1 minimum`, et
  applique bien 1 PV.
- Activer `Inof.` sur la même ligne (armure `Corps 2` de nouveau) : le bloc affiche `PA 2×2`
  et le total baisse de 2 par rapport au même jet sans la qualité.
- Configurer un jet avec dégâts et `Inof.` sur un profil de la **Réserve**, l'importer en
  combat : les deux réglages sont bien arrivés sur la carte.
- Amener une cible à 0 PV, la frapper à nouveau : le critique se déclenche sans double, le jet
  de gravité est bien majoré de 10, et l'état « À Terre » apparaît.
- Retirer du combat un participant sélectionné comme cible : les lignes de jet qui le visaient
  reviennent à « aucune cible » sans erreur.

---

## Lot 8 — Panneau Règles en données

**Constat :** `C-03`
**Fichiers :** `js/data/rules.js` (nouveau), `js/ui/rules-view.js`, `index.html`
**Ampleur :** moyenne, mais sans risque — c'est du contenu.

### Problème

Le panneau « Règles » est 215 lignes de texte statique écrit à la main dans `index.html`, alors
que les tables de critiques et de magie du même panneau sont générées depuis `CRIT_DATA` et
`MAGIC_DATA`. Deux régimes pour le même contenu.

### À faire

1. Sortir les cinq blocs de règles (Localisation & critiques, Santé & survie, Magie,
   Peur & Terreur, Corruption & mutations) dans `js/data/rules.js`, sous une structure du type :
   ```js
   export const RULES = [
     { id: 'localisation', title: 'Localisation des dégâts & Tables Critiques',
       sections: [ { heading: '…', blocks: [ {type:'p', text:'…'}, {type:'ul', items:[…]},
                                             {type:'example', text:'…'}, {type:'table', ref:'CRIT_HEAD'} ] } ] },
     …
   ]
   ```
   Le format exact est laissé au jugement, à deux conditions : **aucune perte de contenu**, et
   le HTML reste généré, jamais stocké dans les données (le rendu échappe systématiquement).

2. `js/ui/rules-view.js` génère l'intégralité du panneau depuis `RULES`, y compris les tables
   d100 déjà générées aujourd'hui.

3. `index.html` ne conserve que `<section id="panel-rules" class="panel"></section>`.

4. **Ajouter un champ de recherche** en tête du panneau, filtrant les blocs sur leur contenu
   textuel et dépliant automatiquement les `<details>` qui contiennent une correspondance.
   C'est le vrai gain du passage en données : le panneau devient consultable en séance.

### Recette

- Comparer visuellement le panneau Règles avant/après : contenu strictement identique,
  même mise en forme, mêmes tables.
- Chercher « Brisé » : les blocs Peur & Terreur et Santé remontent, dépliés.
- Chercher une chaîne absente : message « Aucun résultat » clair.
- Vérifier qu'un titre contenant `<` ou `&` ne casse pas le rendu (échappement).

---

## Lot 9 — Synchronisation par chemin

**Constat :** `D-02`
**Fichiers :** `js/core/sync.js`, `js/core/store.js`
**Ampleur :** moyenne. Repose sur les lots 3 et 6.

### Problème

`save()` envoie systématiquement l'objet complet à Firebase : réserve, combat, journal, lignes
de dés. Realtime Database est justement conçu pour l'écriture par chemin.

### 9.1 — Écriture ciblée

- Remplacer le `set()` global par des mises à jour ciblées via `update()` sur des chemins :
  ```
  wfrp-sessions/{uid}/current/reserve/{profileId}
  wfrp-sessions/{uid}/current/combat/participants/{participantId}
  wfrp-sessions/{uid}/current/combat/meta        (round, currentActorId, order)
  wfrp-sessions/{uid}/current/diceLines/{lineId}
  ```
  (plus de nœud `log` — voir 9.2)
- Le Store accumule un ensemble de chemins « sales » entre deux flushs (le débounce de 300 ms
  reste), et n'envoie que ceux-là. Le mode `batch()` du lot 4 est le point d'accroche naturel.
- Une suppression écrit `null` sur le chemin concerné.
- Côté réception, remplacer l'unique `onValue` sur la racine par des écoutes par branche, ou
  conserver l'écoute racine mais n'appliquer qu'un diff. **Le plus simple d'abord** : garder
  l'écoute racine et le filtre `writer` du lot 3, et ne gagner que sur l'écriture. Ne passer aux
  écoutes granulaires que si le bénéfice se mesure.

### 9.2 — Le journal sort de la synchronisation

**Décision arrêtée.** Le journal n'est plus poussé vers Firebase ni lu depuis Firebase. Il
reste intégralement dans `localStorage`, plafonné à 300 entrées (lot 4).

Pourquoi : c'est de loin le poste le plus lourd du payload, écrit en bloc à chaque frappe, et
c'est le seul dont la valeur ne justifie pas le coût. Ce n'est pas de l'état partagé — c'est un
historique narratif, sur un poste unique. Le supprimer du chemin d'écriture chaud est
l'essentiel du gain de ce lot, et ça simplifie franchement le reste.

Ce qu'il faut faire pour que ça ne se retourne pas contre nous :

- **Retirer `log` de la lecture aussi.** `applyDataToState` lit aujourd'hui `data.log` ; s'il
  continue de le lire alors qu'on ne l'écrit plus, la première synchronisation écrasera le
  journal local par la version serveur périmée. Le journal local devient autoritaire, point.
- **Le garder dans l'export JSON.** « 💾 Sauvegarder » et « 📂 Charger » continuent de porter
  le journal — c'est le chemin de sauvegarde durable et de transfert entre machines. Cette
  décision ne concerne que Firebase.
- **Purger l'ancien nœud** `wfrp-sessions/{uid}/current/log` côté serveur au premier flush,
  pour ne pas laisser traîner un vestige que quelqu'un relira dans six mois.

Si un jour l'historique doit vraiment suivre entre machines, ça se rajoutera comme une branche
séparée, écrite par lots et jamais dans le chemin chaud. Ce n'est pas le besoin aujourd'hui.

### Recette

- Onglet DevTools → Network, filtre WebSocket. Modifier un seul PV : la trame envoyée ne
  contient que ce participant, pas la réserve entière.
- Les deux onglets restent synchronisés à l'identique.
- Supprimer un participant dans un onglet : il disparaît dans l'autre.
- Aucune régression sur les scénarios de recette des lots 2, 3 et 5.

---

## Lot 10 — Confort d'usage

**Constats :** `E-04`, `E-07`, `E-10`, `E-11`, `E-12`, `E-13`
**Fichiers :** `js/ui/*`, `index.html`, `MJ.css`
**Ampleur :** moyenne, très visible.

### 10.1 — `E-04` : annuler

**Problème.** Supprimer un participant, vider la réserve, charger un fichier : tout est
définitif et immédiat. En séance, on clique vite.

**À faire.** Un annuler à un seul niveau suffit — pas d'historique complet.
- Avant chaque action destructive, capturer un instantané de l'état complet
  (`structuredClone` sur la forme sérialisée).
- Exposer `Store.undo()` qui restaure l'instantané et le consomme.
- Actions couvertes : suppression d'un participant, suppression d'un profil, vidage de la
  réserve, fin de combat, chargement d'un fichier, suppression d'une ligne de jet.
- Déclenché depuis le toast (10.2) et par `⌘Z`.

### 10.2 — `E-07` : sortir de `prompt()` / `alert()` / `confirm()`

**Problème.** Modifier une initiative ouvre une boîte native bloquante ; le chargement d'un
fichier annonce sa réussite par `alert()`.

**À faire.**
- Un module `js/ui/toast.js` : messages empilés en bas à droite, disparition après ~5 s,
  variantes `info` / `succès` / `avertissement` / `erreur`, et **action optionnelle**
  (« Annuler »), qui sert de support à 10.1.
- Remplacer tous les `alert()` par des toasts.
- Remplacer le `prompt()` d'initiative par l'édition en ligne introduite au lot 5 pour les PV
  — mutualiser le helper.
- **Conserver `confirm()`** pour les actions destructives : c'est un garde-fou volontaire, et
  l'annuler de 10.1 ne le remplace pas.

### 10.3 — `E-10` : raccourcis clavier (macOS)

Actifs uniquement quand le focus n'est **pas** dans un champ de saisie.

| Touche | Action |
|---|---|
| `N` ou `Espace` | Tour suivant |
| `D` | Lancer un d100 |
| `⌘Z` | Annuler |
| `Échap` | Fermer la palette de couleurs / la modale / annuler une édition en ligne |
| `1` `2` `3` | Basculer sur Réserve / Combat / Règles |

Ajouter un discret rappel des raccourcis, replié, en bas du panneau Combat.

### 10.4 — `E-11` : un seul historique

**Problème.** Le flux de résultats de dés et le journal disent presque la même chose. Le flux
est riche mais volatil et sans plafond ; le journal est persistant mais replié par défaut, en
texte brut, non filtrable, et empilé dans l'ordre inverse.

**À faire.**
- Fusionner en un historique unique, persistant, plafonné (lot 4), affiché en panneau latéral
  ou en zone dédiée sous les cartes.
- Chaque entrée est un **objet** (`{ ts, kind, actorId, targetId, text, detail }`), pas une
  chaîne — c'est ce qui rend le filtrage possible. Prévoir la migration des entrées existantes,
  qui sont des chaînes : les accepter telles quelles, avec `kind: 'legacy'`.
- Filtres : par combattant, et par type (jets / dégâts / états / gestion).
- Les résultats de jets riches (détail du critique, calcul des dégâts) deviennent des entrées
  dépliables, ce qui supprime le besoin du flux séparé.

### 10.5 — `E-12` : rendre le code couleur lisible

**Problème.** La palette porte une vraie sémantique — Ennemi, Allié, Magie, Chaos, Boss — mais
elle n'existe que dans les attributs `title` des pastilles.

**À faire.** Afficher le libellé à côté de chaque pastille dans la palette ouverte, et ajouter
une légende compacte dans l'en-tête du panneau Combat.

### 10.6 — `E-13` : nettoyer la barre supérieure

**Problème.** Le bouton version affiche « Version: 3.5 - Effets d'états automatiques » en
toutes lettres. `#user-info` est en `position: fixed` en haut à droite, sans coordination avec
la topbar en `position: sticky` — chevauchement probable sur écran étroit.

**À faire.**
- Le bouton version n'affiche que `v3.5`, le libellé complet passe en `title`.
- Intégrer `#user-info` **dans** la topbar (avatar + prénom + menu déconnexion), et supprimer
  le `position: fixed`.

### Recette

- Supprimer un participant, cliquer « Annuler » dans le toast : il revient à l'identique,
  au même endroit, avec ses états et ses lignes de jet.
- `⌘Z` produit le même effet.
- Modifier une initiative sans qu'aucune boîte native n'apparaisse.
- Appuyer sur `N` en boucle : les tours s'enchaînent. Le faire avec le focus dans un champ
  de note : la lettre « n » s'écrit, aucun tour ne passe.
- Filtrer l'historique sur un combattant : seules ses entrées restent.
- Réduire la fenêtre à 900 px : rien ne se chevauche dans la barre supérieure.

---

## Lot 11 — Thème sombre, contraste, accessibilité

**Constats :** `E-05`, `E-06`, `E-08`
**Fichiers :** `MJ.css`, `index.html`, `js/ui/*`
**Ampleur :** faible à moyenne.

### 11.1 — `E-06` : contraste des badges d'état (à faire en premier)

**Problème.** `.badge.warn` pose du blanc sur `#b36e3a`, soit un rapport de **4,07:1** — sous
le seuil WCAG AA de 4,5:1. Or c'est précisément ce badge qui porte les états (Sonné,
Hémorragique, Aveuglé…), en `0.8em`, c'est-à-dire l'information la plus consultée d'une carte.

**À faire.** Assombrir le fond jusqu'à repasser 4,5:1 — `#9c5a28` environ. Vérifier au
contrast checker plutôt qu'à l'œil. Profiter du passage pour contrôler les autres paires
(`--muted` sur `--panel`, `.badge` sur `.actor-card`, les cinq couleurs de carte).

### 11.2 — `E-05` : thème sombre

**Problème.** Le fond parchemin clair est superbe et dans le ton, mais une table de jeu de rôle
se joue souvent en lumière basse.

**À faire.**
- Tous les tokens sont déjà centralisés dans `:root` — c'est le travail préparatoire le plus
  coûteux, et il est fait. Il reste des couleurs en dur dans les règles (`#5a1d1d`, `#8a0707`,
  `#b33a3a`, `#fff`, `#ccc`…) : **les remonter en tokens d'abord**, c'est le vrai chantier.
- Définir un second jeu de valeurs sous `:root[data-theme="dark"]`, plus
  `@media (prefers-color-scheme: dark)` pour l'état « système ».
- Le thème sombre n'est **pas** une inversion : conserver la chaleur du parchemin en la
  transposant (encre claire sur cuir sombre plutôt que gris neutre), et remonter la
  luminosité du rouge d'accent pour qu'il tienne sur fond sombre.
- Bascule : un bouton dans la topbar, choix mémorisé en `localStorage`, trois états
  (clair / sombre / système).
- La texture de fond `old-paper.png` doit être atténuée ou remplacée en sombre.

### 11.3 — `E-08` : onglets réellement accessibles

**Problème.** Le balisage annonce `role="tablist"` et `aria-selected`, mais le gestionnaire de
clic ne met jamais `aria-selected` à jour ; les boutons n'ont pas `role="tab"` ; et les
`aria-labelledby="tab-reserve"` des panneaux pointent vers des `id` qui n'existent nulle part.
L'intention est là, le câblage manque.

**À faire.**
- Donner un `id` à chaque bouton d'onglet, cohérent avec les `aria-labelledby` existants.
- Ajouter `role="tab"` et `aria-controls` sur les boutons, `role="tabpanel"` sur les panneaux.
- Mettre `aria-selected` à jour au changement d'onglet.
- Navigation clavier : flèches gauche/droite entre onglets, `tabindex="-1"` sur les onglets
  inactifs (motif ARIA standard).
- Ajouter un état `:focus-visible` net sur tous les éléments interactifs — actuellement absent
  du CSS, ce qui rend la navigation clavier invisible.

### 11.4 — Point de rupture laptop

Ajouter une media query à ~900 px : les `.grid-2` du panneau Réserve passent en une colonne
(formulaire au-dessus de la liste). Le cas 600 px reste hors périmètre.

### Recette

- Vérifier au contrast checker : tous les couples texte/fond passent AA.
- Basculer en sombre : aucune zone illisible, aucune couleur en dur oubliée. Parcourir les
  trois panneaux, la modale d'import, la palette de couleurs, les toasts et les tables de règles.
- Régler macOS en mode sombre, thème sur « système » : l'app suit.
- Naviguer l'app entière au clavier : le focus est toujours visible, les onglets répondent aux
  flèches.

---

## Lot 12 — Hors-ligne et finition de déploiement

**Constats :** `D-01`, `D-03`, `D-05`
**Fichiers :** `sw.js` (nouveau), `manifest.webmanifest` (nouveau), `assets/` (nouveau),
`index.html`, `MJ.css`, `README.md`
**Ampleur :** moyenne.

### 12.1 — `D-01` : rendre l'application utilisable sans réseau

**Problème.** Polices depuis Google Fonts, texture de fond depuis `transparenttextures.com`,
SDK Firebase depuis `gstatic` : sans réseau, l'application ne démarre pas — l'écran de
connexion reste bloqué. Et le pire moment pour perdre le wifi, c'est en pleine partie.

**À faire.**

1. **Héberger les ressources dans le dépôt.**
   - Cinzel (400, 700) et Lora (400, 400 italique) en `.woff2` dans `assets/fonts/`,
     déclarés en `@font-face` avec `font-display: swap`. Chrome sur Mac : `woff2` seul suffit,
     pas de format de repli.
   - La texture `old-paper.png` dans `assets/`. Vérifier sa licence avant de la vendorer ;
     si elle n'est pas redistribuable, la remplacer par un motif CSS ou un bruit généré.
   - Le SDK Firebase peut rester sur `gstatic` : sans réseau il n'y a de toute façon rien à
     synchroniser. Mais l'application doit **démarrer et fonctionner en local** malgré son
     échec de chargement — c'est le point 3.

2. **Service worker** (`sw.js`), stratégie *cache-first* sur la coquille applicative
   (`index.html`, `MJ.css`, `js/**`, `assets/**`), *network-first* sur le reste.
   Versionner le cache par `APP_VERSION` (`js/version.js`, lot 6) et purger les anciens à
   l'activation — c'est ce qui remplace définitivement le `?v=18` manuel.

3. **Démarrage dégradé.** Si Firebase est injoignable, l'application doit s'ouvrir directement
   sur les données de `localStorage`, avec un bandeau explicite
   (« Hors ligne — modifications enregistrées localement, synchronisation à la reconnexion »).
   Aujourd'hui l'écran de connexion bloque tout. Vérifier que la synchronisation reprend et
   que l'arbitrage par timestamp du lot 3 protège bien le travail local.

### 12.2 — `D-03` : favicon, manifest, `theme-color`

- Un favicon (SVG suffit sur Chrome) — les armes croisées de l'en-tête feraient l'affaire.
- `manifest.webmanifest` : nom, nom court, icônes 192 et 512, `display: standalone`,
  couleurs de thème et de fond.
- `<meta name="theme-color">`, avec les deux variantes clair/sombre via `media`.

### 12.3 — `D-05` : vérifier les Security Rules

Le `README` détaille exactement la bonne règle, ce qui est rare et bien vu. Reste que rien ne
prouve qu'elle est en place côté console Firebase.

**À faire.** Vérification manuelle dans la console (hors périmètre de Gemini), puis noter dans
le `README` la date de la dernière vérification.

### 12.4 — Mise à jour du README

Le `README` fait 21 lignes et ne parle que de Firebase. Après douze lots, il doit décrire :
l'arborescence, comment lancer en local, comment lancer les tests, comment déployer, et le
navigateur cible.

### Recette

- DevTools → Network → Offline, puis recharger : l'application démarre, affiche les données
  locales et le bandeau hors-ligne. Les polices et la texture s'affichent normalement.
- Rétablir le réseau : la synchronisation repart, rien n'est perdu ni écrasé.
- Onglet Application → Manifest : aucune erreur, icônes présentes.
- Déployer, puis recharger sans vider le cache : la nouvelle version est bien servie.

---

## Lot 13 — Mots-clés d'armes et d'armures

**Constat :** nouveau (hors audit initial)
**Fichiers :** `js/core/keywords.js`, `js/data/keywords-fallback.json`,
`js/data/keyword-engines.js`, `js/core/damage.js`, `js/ui/dice-line.js`, `js/ui/rules-view.js`
**Ampleur :** moyenne. **Non prioritaire** — à traiter après le lot 7 dont il étend le moteur.

### Objectif

Le MJ maintient une base d'une trentaine de mots-clés d'armes dans Google Sheets, à laquelle
s'ajouteront ceux d'armures. Il faut que l'outil les connaisse, les affiche, en applique
mécaniquement ceux qui peuvent l'être — et que la base reste modifiable **sans toucher au
code ni redéployer**.

### 13.1 — Oui, le Sheet est lisible directement

Vérifié sur pièce. L'endpoint `gviz` de Google Sheets renvoie du CSV en `fetch()` direct,
sans clé API, sans proxy CORS, sans authentification. Le seul prérequis est que le classeur
soit partagé « tous les utilisateurs disposant du lien peuvent consulter ».

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={ONGLET_URLENCODE}
```

Le dépôt voisin **`Ethoril/ennemi-interieur-wfrp4`** utilise déjà exactement ce mécanisme
(`js/sheets.js`), sur le **même classeur** et le **même onglet** :

| | |
|---|---|
| `SHEET_ID` | `1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs` |
| Onglet | `Mots Clés Armes et Armures` → `Mots%20Cl%C3%A9s%20Armes%20et%20Armures` |
| Colonnes | `Mot Clé`, `Effet` |

**Reprendre le code éprouvé plutôt que le réécrire.** `js/sheets.js` et son `parseCSV` de
`js/utils.js` sont déjà en production sur ce classeur ; ils gèrent notamment deux pièges réels
constatés sur cet onglet : les **colonnes vides de remplissage** (le CSV en renvoie 13 pour
2 colonnes utiles) et les **retours à la ligne dans les cellules fusionnées**. Ne pas
redécouvrir ces cas.

### 13.2 — Architecture : trois couches, jamais de point de rupture

Le lot 12 promet une application qui démarre et fonctionne sans réseau. Un `fetch` bloquant
vers Google casserait cette promesse — et le pire moment pour perdre la table des mots-clés,
c'est en plein combat. D'où trois couches, résolues dans cet ordre :

| Couche | Rôle | Toujours disponible |
|---|---|---|
| 1. `js/data/keywords-fallback.json` | Instantané versionné dans le dépôt | **Oui**, par construction |
| 2. `localStorage` (`wfrp.keywords.v1`) | Dernier téléchargement réussi | Après la première session en ligne |
| 3. `fetch` du Sheet | Rafraîchissement | Seulement en ligne |

Comportement au démarrage — *stale-while-revalidate* :

1. Résoudre immédiatement et **sans attendre le réseau** : cache `localStorage` s'il existe,
   sinon l'instantané du dépôt. L'application est utilisable dès cet instant.
2. Lancer le `fetch` **en arrière-plan**, sans bloquer quoi que ce soit.
3. En cas de succès : écrire le cache, remplacer la table en mémoire, rafraîchir les vues
   concernées.
4. En cas d'échec : ne rien casser, ne pas alerter. Un simple indicateur discret.

Afficher dans le panneau Règles la provenance et la fraîcheur :
« Mots-clés : Google Sheets, mis à jour le 10/08/2026 » ou « Mots-clés : instantané local
(hors ligne) », plus un bouton **« Recharger depuis le Sheet »** pour forcer le
rafraîchissement en séance.

Le service worker du lot 12 doit traiter l'URL `docs.google.com` en *network-first* et ne
**jamais** la servir depuis son cache : la couche 2 gère déjà la persistance, et un doublon de
cache produirait des incohérences pénibles à diagnostiquer.

### 13.3 — Le contrat de données : le Sheet dit le texte, le dépôt dit la mécanique

C'est le point structurant du lot.

- **Le Sheet est autoritaire sur le libellé et le texte de l'effet.** Le MJ écrit de la prose,
  jamais du technique. Aucune colonne à ajouter, aucune convention à respecter.
- **Le dépôt est autoritaire sur le branchement mécanique.** `js/data/keyword-engines.js`
  associe un slug à une fonction de calcul et à ses paramètres.
- **La jonction se fait sur un slug** dérivé du libellé : minuscules, accents retirés,
  ponctuation et espaces en tirets, suffixe ` X` retiré et converti en `rating: true`.
  `Poudre Noire` → `poudre-noire`, `Explosion X` → `explosion` + `rating`.

```js
// js/data/keyword-engines.js — maintenu à la main, jamais généré
export const ENGINES = {
  inoffensive:  { tier: 1, engine: 'armour-multiplier', params: { factor: 2, noMinimum: true } },
  percutante:   { tier: 1, engine: 'add-units-die', aliases: ['impact'] },
  devastatrice: { tier: 1, engine: 'best-of-units-or-sl' },
  penetrante:   { tier: 2, engine: 'armour-pierce', aliases: ['perforante'] },
  // …
};
```

Trois conséquences à respecter scrupuleusement :

- **Un mot-clé présent dans le Sheet mais absent de `ENGINES` reste pleinement utile** : il
  s'affiche, il est sélectionnable sur une ligne de jet, son texte apparaît en infobulle et
  dans le résultat. Il n'est simplement pas calculé. **C'est le cas majoritaire et c'est
  normal.** Ne jamais masquer ni rejeter un mot-clé inconnu.
- **Un slug présent dans `ENGINES` mais absent du Sheet** signale une désynchronisation :
  journaliser un avertissement en console, sans casser.
- **Ne jamais faire dépendre le calcul du texte de l'effet.** Le texte est de la prose destinée
  à un humain ; il changera. Le slug est le contrat.

### 13.4 — Ce qui est automatisable, et ce qui ne l'est pas

Les 31 mots-clés ne sont pas du même ordre de difficulté. Trois paliers.

**Palier 1 — se branche dans la formule du lot 7, aucune extension de modèle.**

| Mot-clé | X | Branchement |
|---|---|---|
| Inoffensive | | PA × 2, et plancher de touche ramené à 0 |
| Percutante *(= Impact)* | | ajoute le dé d'unités du jet d'attaque aux dégâts |
| Dévastatrice | | dégâts = `max(dé d'unités, DR)` au lieu du DR |
| Pointue | | +1 DR |
| Imprécise | | −1 DR |
| Précise | | +10 au score cible du jet |
| Empaleuse | | critique élargi : tout multiple de 10 ou tout double, sur réussite |
| Dangereuse | | maladresse si un test raté contient un 9 (dizaine ou unité) |

**Palier 2 — demande une petite extension de modèle, à chiffrer avant de s'engager.**

| Mot-clé | X | Ce qui manque aujourd'hui |
|---|---|---|
| Pénétrante *(= Perforante)* | | un indicateur **métallique / non métallique** par localisation d'armure |
| Taille X *(= Tranche)* | ✓ | la **dégradation des PA** de la cible à chaque touche |
| Entrave *(= Immobilisante)* | | un état **porteur d'une valeur de Force** (les états ne portent qu'une durée) |
| Assommante | | un helper de **jet opposé**, déclenché sur touche à la tête |
| Poudre Noire | | un jet de Calme +20 déclenché **même sur un échec** de l'attaque |
| Epuisante | | un indicateur **« charge »** sur le jet, qui conditionne Percutante et Dévastatrice |

**Palier 3 — informatif seulement : le sous-système n'existe pas dans l'outil.**

| Mot-clés | Sous-système absent |
|---|---|
| A enroulement, Défensive, Déséquilibrée, Lent, Rapide, Protectrice X, Piège-lame | **aucun jet de défense** — l'outil ne modélise que l'attaquant |
| Croche-Pied | aucun système d'**Avantage** |
| Explosion X | aucun **positionnement** ni distance |
| Recharge X, Répétition X | aucun suivi de **munitions** |
| Perturbante | arbitrage MJ, pas de règle déterministe |
| Pistolet | purement descriptif |

Ces treize-là **s'affichent et ne se calculent pas**, et c'est très bien : le MJ a le texte sous
les yeux au moment du jet, ce qui est déjà l'essentiel du service.

### 13.5 — Doublons à arbitrer (côté Sheet, pas côté code)

Quatre paires portent un texte d'effet rigoureusement identique :

| Paire | Canonique proposé | Motif |
|---|---|---|
| Percutante / Impact | **Percutante** | c'est le nom que le Sheet emploie lui-même dans l'effet d'`Epuisante` |
| Pénétrante / Perforante | **Pénétrante** | à confirmer par le MJ, aucun indice interne |
| Entrave / Immobilisante | **Entrave** | à confirmer par le MJ, aucun indice interne |
| Taille X / Tranche | **Taille X** | `Tranche` n'a pas le `X` dans son libellé alors que son effet le mentionne |

**Ce n'est pas bloquant.** Le mécanisme d'`aliases` fait pointer les deux slugs vers le même
moteur, donc le code fonctionne quel que soit l'arbitrage. Le nettoyage se fait dans le Sheet,
quand le MJ le décide.

Signalé au passage, à corriger à la source quand l'occasion se présente : `Epuisante` sans
accent, « recharchées » pour « rechargées », « entraine » pour « entraîne », et des apostrophes
mélangées (droites `'` et courbes `’`) selon les lignes. Le slug et la recherche doivent donc
**normaliser accents et apostrophes** plutôt que compter sur une saisie propre.

### 13.6 — Portée armes / armures

L'onglet s'appelle déjà « Mots Clés Armes et Armures » mais ne contient à ce jour que les
31 mots-clés d'armes. Quand ceux d'armures arriveront, ils seront vraisemblablement ajoutés
**au même onglet**, sans colonne distinctive.

**Ne pas demander au MJ d'ajouter une colonne « Portée ».** Porter l'information dans
`ENGINES` (`scope: 'weapon' | 'armour' | 'both'`), et pour les mots-clés non annotés, les
proposer partout. Un mot-clé mal rangé est un désagrément mineur ; une contrainte de structure
imposée au Sheet est une source permanente de friction.

### 13.7 — Interface

- **Sur la ligne de jet** : la bascule `Inof.` du lot 7 devient un sélecteur multiple compact
  (un bouton « Mots-clés » ouvrant une liste cochable, avec champ de saisie du `X` quand le
  mot-clé en prend un). Les mots-clés actifs s'affichent en pastilles sous la ligne.
- **Dans le résultat de jet** : les mots-clés ayant modifié le calcul apparaissent dans le
  détail (`PA 2×2 Inoffensive`). Ceux du palier 3 s'affichent en rappel textuel, pour que le MJ
  arbitre sans consulter autre chose.
- **Dans le panneau Règles** : un bloc « Mots-clés » listant tout, avec recherche — c'est la
  même mécanique de filtre que le lot 8, à mutualiser.
- **Sur le profil de la Réserve** : mêmes contrôles que sur la ligne de jet, avec le même
  aller-retour à l'import que celui verrouillé en §7.6.

### 13.8 — Périmètre de ce lot

Livrer **le palier 1 en entier, plus toute l'infrastructure**. Le palier 2 fera l'objet d'un lot
ultérieur, chiffré à ce moment-là ; le palier 3 n'est pas destiné à être codé.

Autrement dit, ce lot doit rendre l'ajout d'un mot-clé du palier 2 aussi simple que : écrire son
moteur, l'inscrire dans `ENGINES`. Si ce n'est pas le cas à la fin du lot, l'abstraction est
mauvaise.

### Recette

- Couper le réseau, vider `localStorage`, charger l'application : les mots-clés sont là
  (instantané du dépôt), le panneau Règles indique « hors ligne », rien ne bloque au démarrage.
- Rétablir le réseau, recharger : la table se met à jour, la date de fraîcheur avance.
- Modifier une ligne dans le Sheet, cliquer « Recharger depuis le Sheet » : le changement
  apparaît sans redéploiement.
- Ajouter dans le Sheet un mot-clé inventé : il apparaît dans la liste, sélectionnable, son
  texte s'affiche, il n'est pas calculé, aucune erreur en console.
- Retirer `inoffensive` du Sheet sans toucher à `ENGINES` : avertissement en console,
  application intacte.
- Jet réussi avec Percutante : le dé d'unités est bien ajouté, et le détail du calcul le montre.
- Sélectionner `Impact` plutôt que `Percutante` : résultat identique (alias).
- Jet avec un mot-clé du palier 3 : son texte apparaît en rappel, aucun calcul n'est tenté.

---

## Récapitulatif

| Lot | Objet | Constats | Dépend de |
|---|---|---|---|
| 1 | Classes CSS fantômes | `B-01` → `B-04` | — |
| 2 | Bugs du moteur de combat | `A-02` `A-05` `A-06` `A-10` | — |
| 3 | Bugs de synchronisation | `A-01` `A-03` `A-04` `A-11` | — |
| 4 | Robustesse du Store | `A-07` `A-08` `A-09` | 3 |
| 5 | Saisie rapide des PV | `E-01` | 4 |
| 6 | Modularisation ES + tests | `C-01` `C-02` `C-04` `C-05` `C-06` `C-07` `A-12` `A-13` `A-14` `D-04` | 1–5 |
| 7 | Calcul des dégâts | `E-02` | 6 |
| 8 | Règles en données | `C-03` | 6 |
| 9 | Synchronisation par chemin | `D-02` | 6, 4 |
| 10 | Confort d'usage | `E-04` `E-07` `E-10` `E-11` `E-12` `E-13` | 6 |
| 11 | Thème sombre & accessibilité | `E-05` `E-06` `E-08` | 6 |
| 12 | Hors-ligne & déploiement | `D-01` `D-03` `D-05` | 6 |
| 13 | Mots-clés d'armes et d'armures | — *(nouveau)* | 7, 12 |

**Écartés :** `E-03` (tactile), `E-09` (mobile) — sans objet sur Chrome/macOS.

**Avancement : lots 1 à 4 faits et poussés** (dans l'ordre 1, 2, 4, 3). Prochain : **lot 5**.

Les lots 1, 2 et 3 sont indépendants entre eux et peuvent être traités dans n'importe quel
ordre. À partir du lot 6, la chaîne est strictement séquentielle. Les lots 7 à 12 sont
indépendants entre eux une fois le 6 acquis, à l'exception du 9 qui gagne à passer après le 4.

Le **lot 13** est explicitement **non prioritaire** : il étend le moteur du lot 7 et s'appuie sur
le service worker du lot 12. Il peut passer avant le 12 si l'envie prend, au prix d'un
`fetch` sans filet hors-ligne le temps que le 12 arrive.

---

## Décisions arrêtées

Plus rien en attente. Ces trois points sont tranchés et intégrés au plan.

| # | Question | Décision | Où |
|---|---|---|---|
| 1 | Le « 00 » (100) compte-t-il comme un double ? | **Oui.** | §6.6 |
| 2 | Une touche dont Endurance et armure absorbent tout inflige-t-elle 0 ou 1 blessure ? | **1 minimum.** Inoffensive fait exception et a **deux** effets : PA doublés **et** plancher à 0. | §7.1, §7.3 |
| 3 | Le journal reste-t-il synchronisé sur Firebase ? | **Non** — purement local et plafonné, mais conservé dans l'export JSON. | §9.2 |
| 4 | Peut-on lire la base de mots-clés directement depuis Google Drive ? | **Oui**, vérifié : `gviz/tq?tqx=out:csv` en `fetch()` direct, sans clé ni proxy. Mécanisme déjà en production dans `ennemi-interieur-wfrp4`. | §13.1 |

Décidé par le MJ pour 1 et 2 ; 3 tranché en interne (§9.2) ; 4 vérifié sur pièce.

**Reste à arbitrer, sans urgence :** les quatre paires de doublons du §13.5. Non bloquant — le
mécanisme d'alias fonctionne quel que soit le choix, et le nettoyage se fait dans le Sheet.
