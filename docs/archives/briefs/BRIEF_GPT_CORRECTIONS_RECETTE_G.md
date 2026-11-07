# Brief — corrections fonctionnelles de la recette G (pour ChatGPT / Codex)

Tu corriges huit défauts relevés par le MJ pendant la recette à la table de l'« Outil MJ Warhammer » (application web en JavaScript sans framework, d'aide au meneur de jeu pour Warhammer Fantasy Roleplay, 5e édition). Le cahier des charges complet est `docs/CDC_CORRECTIONS_RECETTE_G.md` ; ce brief y ajoute la localisation dans le code et la méthode. Les chemins `fichier:ligne` sont indicatifs (état au commit 7329d8a, version 3.31.0) : relis toujours avant de modifier.

## 1. Règles du travail

- **Branche** : crée un worktree neuf depuis `main` : `git worktree add -b codex/recette-g-corrections tmp/recette-g-worktree main`, puis `npm ci` dedans. Ne travaille pas dans `E:/Outil MJ Warhammer` lui-même (le MJ y garde des notes non commitées dans `docs/RECETTE_UTILISATEUR.md` : ne jamais toucher ce fichier). Jamais de `git stash`, jamais de réécriture d'historique (`rebase`, `reset --hard`, `push --force`), jamais de push : Claude contre-vérifie et publie.
- **Une correction = un commit**, dans l'ordre C1 → C8. Pour chacune : d'abord un test qui **échoue** sur l'état actuel et décrit le comportement attendu, puis le correctif, puis le test passe. Message de commit en anglais, préfixe conventionnel (`fix(resolution): …`), suffixe « (GPT) ».
- **Aucune règle de jeu ne change.** Tu changes l'affichage, les valeurs par défaut, les branchements entre écrans ; jamais un calcul de dégâts, de DR, de critique ou de bénédiction. Si une correction semble demander un changement de règle, arrête-toi et écris la question dans `tmp/recette-g-worktree/QUESTIONS_GPT.md`.
- **Ne plie jamais un test existant pour le faire passer.** Si un test existant casse, c'est soit ton correctif qui est faux, soit le test qui décrivait l'ancien comportement voulu par le CDC : dans ce second cas seulement, adapte-le et dis-le dans le commit.
- **Style** : code existant = modules ES, une instruction par ligne, noms en anglais, libellés d'écran en français. Lis le fichier voisin et imite sa densité de commentaires. Pas de nouvelle dépendance.
- **Vocabulaire V5 à l'écran** : DR (degrés de réussite), Élan, Round (tous les combattants agissent), Tour (un seul combattant). Distances en mètres.
- **Fin de travail** : `node --test --test-concurrency=4` vert (≈ 5 500 tests) et les parcours navigateur que tu as touchés verts. Les parcours navigateur se lancent un par un (`node tests/<parcours>.mjs`) ; sous Windows, définis `PLAYWRIGHT_EXECUTABLE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"`. Quelques parcours échouaient déjà avant (liste dans `docs/RAPPORT_PHASE_R.md`) : ne les compte pas comme régressions, mais ne les aggrave pas.
- **Compte rendu final** dans `tmp/recette-g-worktree/RAPPORT_GPT.md` : par correction, le commit, le test ajouté, ce qui a été fait, ce qui reste ou ce qui est incertain. Un nouveau fichier `js/**` doit être signalé (il faudra l'ajouter au cache du service worker à la publication).

## 2. Les corrections

### C1 · Bouton « Appliquer » désactivé sans explication — bloquant

Le MJ voit « Appliquer 11 dégâts à Garde du pont » grisé avec un curseur d'interdiction, sans savoir ce qui manque.

- **Où** : `js/ui/resolution-panel.js:2771-2796`. `primary.disabled` (≈ :2785) est un OU de plus de quinze conditions : `preview.choiceRequired`, `preview.unresolved?.length`, critiques `pending` / `needsAlternative` / `needsLocation`, `invalidCritical`, `needsTarget`, `missingProtection` (≈ :2783), `mechanicalWarnings.length`, `draft.busy`, `!canApply` (fourni par `js/ui/workspace-view.js:1802`). Trois cas seulement posent un `title`. La branche magie (≈ :2764) n'en pose aucun.
- **Les raisons existent déjà** : `preview.unresolved` est un tableau de phrases construit dans `js/core/resolution.js` (≈ :690-730 ; Bénédiction de Protection en :702-710, « saisir le Test de Calme Accessible (+2 DR) de l'attaquant »). Il n'est affiché qu'au milieu du bloc résultat (`js/ui/resolution-panel/result.js:200-207`), loin du bouton.
- **À faire** :
  1. Une fonction pure (dans `js/ui/resolution-panel/` ou `js/core/`) qui, à partir de `preview`, `draft` et `canApply`, renvoie la liste des raisons de blocage **en clair**, une par condition, y compris celles qui n'ont pas de texte aujourd'hui (`missingProtection`, `mechanicalWarnings` → leur texte, `needsAlternative`, `pending`, `draft.busy` → « Calcul en cours », `!canApply` → la raison exacte côté `workspace-view`). Le bouton est désactivé si et seulement si cette liste n'est pas vide (même logique qu'aujourd'hui, rien de plus, rien de moins : vérifie-le par un test d'équivalence sur les cas existants).
  2. Sous le bouton désactivé : un bloc « À saisir avant d'appliquer : » avec cette liste ; même texte dans le `title` du bouton. Branches magique et non magique.
  3. Quand une raison correspond à un champ (sélecteur de Protection `resolution-panel.js:642-660`, localisation, cible, jet), un clic sur la ligne fait défiler jusqu'au champ et lui donne le focus. Les champs bloquants portent une marque « obligatoire » visible (astérisque + `aria-required`) ; aucune autre marque sur les champs facultatifs.
  4. **Ordre** : le panneau est rendu impérativement dans `renderResolutionPanel` (`resolution-panel.js:102-2800`) : action, cible, blocs contextuels (magie, protection, divin social, assistance magique, règles du profil), « Nature du Test », « Circonstances des Tests », « Pénalités de situation en DR », jets, Calculer / Comparer, résultat. Correctif minimal seulement : pour une attaque physique, les jets, la défense et les dégâts doivent venir avant les blocs magie / divin / Corruption. Si ce réordonnancement demande plus qu'un déplacement de blocs, ne le fais pas et note-le au rapport : la refonte complète du panneau (U1) est un chantier séparé, sur maquettes.
- **Tests** : unitaire de la fonction de raisons ; parcours navigateur (étendre `tests/divin-v5-p5-ui-browser.mjs`) : Bénédiction de Protection sur la cible, attaque d'un ennemi → bouton grisé + « Test de Calme… » listé sous le bouton → clic sur la ligne amène au sélecteur → `Réussite` → bouton actif → appliquer réussit.

### C2 · Rencontre : statut, camp et initiative

Avec un PJ et un PNJ ajoutés « En attente », le sélecteur de camp surpris ne propose que « Aucun », l'ordre calculé est vide et « Calculer / actualiser l'ordre » ne fait rien de visible.

- **Où** : `js/ui/prepare-view.js:64-72` (à l'ajout : `zone` = `'bench'` « En attente », camp déduit du type via `KIND_CAMPS`) ; replis du modèle `js/core/encounters.js:44-45, 71-72, 93`. Initiative : `js/main.js:389-392` (actifs seulement ; le toast « Aucun combattant actif » n'existe que si `startCombat`), bouton en :454 → `recalculate()` :494 → `Store.previewCombatInitialization` (`js/core/store.js:2578`). Camp surpris : `js/main.js:446-450`, options tirées des seuls actifs.
- **À faire** (décision du MJ du 01/11) :
  1. À l'ajout dans une rencontre : **toute entrée est Active** par défaut ; PJ → camp des PJ ; PNJ et créatures → camp ennemi. Le MJ change les exceptions à la main ; un choix manuel n'est jamais écrasé. Les rencontres déjà enregistrées ne sont pas migrées.
  2. Fenêtre d'initiative sans aucun combattant actif : message visible dans la fenêtre « Aucun combattant actif : passez-les en Actif dans la rencontre » (pas seulement un toast), y compris après « Calculer / actualiser l'ordre ».
  3. Le sélecteur de camp surpris liste les camps présents parmi les actifs (comportement actuel, correct une fois le point 1 fait) ; s'il n'y a aucun actif, il est désactivé avec le même message.
- **Tests** : unitaire des défauts (`encounters` / prepare-view) ; navigateur en étendant `tests/f2-a-initiative-surprise.browser.mjs` : rencontre neuve 1 PJ + 1 PNJ → ordre calculé à 2 lignes, camp surpris propose les deux camps ; tout passé en attente → message.

### C3 · Combattants ajoutés à une rencontre en cours invisibles

« Modifier » la rencontre en cours pour ajouter des personnages enregistre bien, mais ils n'apparaissent pas dans la piste en revenant au combat (seulement après « Recommencer »).

- **Où** : « Modifier » → `openPrepareView(id)` (`js/main.js:768`) → `persistEncounter` (:759-766) → `Store.saveEncounter` (`js/core/store.js:3316-3319`), qui ne remplace que l'entrée dans `encounters` : `activeScene` et `combat` restent tels quels. Seuls `launchEncounter` (`js/core/encounters.js:114-153`), `restartCombat` (store.js:3603-3657) et `previewCombatRestart` (:2565) construisent les participants depuis les entrées.
- **Mécanisme à réutiliser** (ne pas en écrire un autre) : `addProfilesToCombat(ids, { zone })` (store.js:3028, déjà utilisé par `main.js:1546` et `:1561`), qui s'appuie sur `insertParticipantsByInitiative` / `insertReinforcement` (`js/core/turn-order.js:198, 222`) pour insérer à son rang d'Initiative quand le combat est commencé.
- **À faire** : à l'enregistrement d'une rencontre qui est la rencontre en cours, comparer ses entrées aux participants du combat et ajouter les nouvelles par ce mécanisme (combat commencé : insertion à leur rang ; non commencé : ils entrent à l'ordre au prochain calcul). Les participants déjà en combat gardent leurs PV, états et Tours. Les **retraits** d'entrées ne retirent personne du combat en cours : affiche un message « Retiré de la rencontre, toujours présent dans le combat en cours » plutôt que de supprimer (une suppression perdrait l'état ; à décider plus tard par le MJ). Une seule commande annulable (le ↶ du store) pour l'ensemble.
- **Tests** : unitaire (store) ; navigateur (étendre `tests/browser-index.mjs` ou `tests/f2-a-initiative-surprise.browser.mjs`) : combat commencé, Modifier → ajouter un PNJ → retour → visible dans la piste à son rang, sans Recommencer ; Annuler le retire.

### C4 · « Restaurer » une version précédente sans effet

Sauvegarde fichier, chargement, versions précédentes et aperçu fonctionnent ; « Restaurer » ne fait rien.

- **Où** : `js/main.js:1047-1092` `openRestoresView`. Le bouton est désactivé tant qu'on n'a pas cliqué « Voir le contenu » (:1075) ; puis `window.confirm(...)` (:1078) ; puis `restorePoint(id, { expectedRevision, expectedPointRevision })` (:1081), un résultat `'stale'` lève une erreur affichée dans `details` (:1082). Moteur : `js/core/store.js:5068-5106` (`'stale'` si la révision locale a changé depuis l'aperçu, :5075, ou si celle du point diffère, :5079).
- **Pistes, à vérifier par reproduction** : (a) `window.confirm` bloqué ou supprimé par le navigateur → rien ne se passe ; (b) révision `'stale'` après une sauvegarde ou un chargement de fichier (la révision locale bouge entre l'aperçu et le clic) → erreur affichée dans un `<details>` replié, donc invisible ; (c) bouton resté désactivé.
- **À faire** : reproduire d'abord le scénario exact du MJ : sauvegarder dans un fichier, charger ce fichier, ouvrir les versions précédentes, aperçu, Restaurer. Corriger la cause. Remplacer `window.confirm` par la boîte de confirmation de l'application si elle existe (cherche comment les autres actions destructives confirment). Toute issue autre que le succès affiche un message visible et compréhensible (« Les données ont changé depuis l'aperçu : rouvrez l'aperçu puis restaurez »). Succès : toast de confirmation, état remplacé, survit au rechargement, Annuler possible (point « restore-before » existant, :5090-5098).
- **Tests** : `tests/browser-persistence.mjs` ne couvre pas Restaurer ; `tests/browser-index.mjs:586-620` couvre aperçu → Restaurer → rechargement, mais pas le passage par un fichier. Ajoute le scénario fichier → chargement → versions → Restaurer, plus le cas `'stale'` (message visible).

### C5 · Événements structurés

Un événement créé ne réagit pas quand sa condition est remplie ; il ne peut plus être rouvert pour être relu ou modifié.

- **Où** : `js/core/scene-events.js:69-78` `evaluateSceneEvent` (types `roundAtLeast`, `hpBelow`, `participantDown`, `previousResolved`, `manual`, :45), `proposeSceneEvent` :81, `occurrenceId` :63-66. L'évaluation n'a lieu **qu'à l'affichage** : `js/main.js:1128-1175` `renderWorkspaceOverview` (« À traiter » de Jouer, :1152-1171) et l'écran « Événements structurés » (`main.js:1184-1291`). Aucun abonnement au Bus ni appel depuis le store sur changement de PV ou de Round. `hpBelow` lit `scene.participants[…].hp` dans `activeScene`, projection de `combat` (store.js:459) : vérifie qu'elle est à jour au moment de l'évaluation. Store : `saveSceneEvent` :4936, `deleteSceneEvent` :4941, `previewSceneEvent` :4956, `applySceneEvent` :4961 (exige `confirmed: true`).
- **À faire** (décision du MJ du 01/11 : l'outil **propose**, le MJ applique ; jamais automatique) :
  1. Réévaluer les événements après toute commande du store qui change les PV, les états, le Round ou la résolution d'un autre événement (un point unique après `executeCommand`, plutôt que des appels dispersés). Un événement qui devient vrai émet une alerte visible dans Jouer (« Condition remplie : <libellé lisible> ») avec l'aperçu de la conséquence et un bouton « Appliquer » ; « Plus tard » la laisse dans « À traiter ». Une même occurrence n'alerte qu'une fois.
  2. Dans l'écran « Événements structurés », chaque ligne a un libellé lisible (`readableSceneEvent` / `sceneEventParts`, `main.js:619-629`) au lieu de `id · statut`, et des boutons Ouvrir (relecture), Modifier (même formulaire que la création, prérempli, enregistré par `saveSceneEvent`) et Supprimer (confirmation, `deleteSceneEvent`).
- **Tests** : unitaire de détection (une baisse de PV sous le seuil rend l'événement proposé ; une seconde baisse ne réalerte pas) ; navigateur en étendant `tests/browser-index.mjs:388-433` : création → condition remplie par un dégât → alerte → Appliquer → entrée au journal ; réouverture → modification → enregistrée.

### C6 · Repères V5 : ouvrir la règle cliquée

Dans « Règles et mots-clés », les boutons des repères V5 (Jets, Élan, Critiques, États…) lancent une recherche de mots au lieu d'afficher la règle.

- **Où** : `js/ui/rules-view.js:141` génère les boutons `data-rule-filter` ; `:253` le clic recopie le libellé dans `.rules-search` et appelle `updateRulesList`. Trouve comment une fiche de règle s'ouvre depuis la liste.
- **À faire** : chaque bouton porte l'identifiant de sa fiche (table explicite libellé → id de fiche, vérifiée par un test) et l'ouvre directement. Si un repère n'a pas de fiche correspondante, signale-le au rapport au lieu d'en inventer une.
- **Tests** : unitaire « chaque repère pointe vers une fiche existante » ; navigateur (`tests/browser-references-smoke.mjs` ou `tests/browser-keywords.mjs`) : chaque bouton ouvre une fiche dont le titre correspond.

### C7 · Doublons dans la liste des mots-clés de créature

Le MJ voit beaucoup de doublons dans la liste des mots-clés de créature (parcours G-BASE-1 : création de profil et import JSON).

- **Où** : référentiel `js/data/creature-keywords.js` (`BASE_KEYWORDS`, :10) et `js/core/creature-keywords.js:36-50` `buildReferential` (libellés uniques garantis). Cause probable : `js/ui/keyword-picker.js:73` construit la `datalist` par `flatMap(term => [term.nameFr, ...term.aliases])`, sans dédoublonnage, donc chaque alias est une option et un même terme revient plusieurs fois. Utilisé par `js/ui/reserve.js:33-43, 171-172`.
- **À faire** : vérifie d'abord dans l'application quelle liste montre les doublons (le sélecteur de mots-clés de l'éditeur de profil ; sinon la liste « Règles et mots-clés »). Une option par mot-clé (le nom français) ; les alias restent reconnus à la saisie mais ne créent pas d'options ; spécialisations regroupées sous leur parent si le composant le permet sans refonte.
- **Tests** : « aucun libellé en double dans la liste proposée » ; un alias tapé est toujours résolu vers son mot-clé.

### C8 · Message « Ancien seuil »

Un profil importé affiche « Ancien seuil −10 : DR à confirmer », incompréhensible. L'exemple d'import est déjà corrigé en 3.31.0 ; reste le message.

- **Où** : deux textes à harmoniser, `js/ui/action-editor.js:121` (« Ancien seuil … : DR à préciser ») et `js/ui/reserve.js:153` (« … : DR à confirmer », celui que voit le MJ).
- **À faire** : un seul message, partagé : « Modificateur de l'ancienne version (−10 %) : indiquez le modificateur en DR ».
- **Tests** : un JSON avec l'ancien champ `mod` produit ce message ; l'exemple « Insérer un exemple » n'en produit aucun.

## 3. Hors périmètre

- Refonte complète du panneau d'action (U1) : maquettes en cours, ne rien anticiper au-delà du correctif C1.
- Hors ligne et synchronisation (G-BASE-9).
- Monture, familier et Réserve de Canalisation dans l'import JSON.
- Publication : version, service worker, push. Claude s'en charge après contre-vérification.
