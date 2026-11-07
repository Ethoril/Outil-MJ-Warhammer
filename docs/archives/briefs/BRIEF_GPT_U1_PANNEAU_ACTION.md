# Brief U1 — refonte du panneau d'action de l'onglet Jouer (pour ChatGPT / Codex)

Tu refonds la mise en page du panneau « Résolution » de l'onglet **Jouer** de l'« Outil MJ Warhammer », d'après une maquette validée par le MJ. Le contenu du panneau est complet et juste ; c'est son organisation qui est trop chargée pour la table. **C'est une refonte de présentation : aucun calcul, aucune règle, aucune donnée enregistrée ne change.**

Lis d'abord (ces documents ne sont pas commités : lis-les dans `E:/Outil MJ Warhammer/docs/`, pas dans ton worktree) :
- la maquette validée : `docs/maquettes/U1_maquette_D.html` (ouvre-la dans un navigateur ; les valeurs et textes de règles qu'elle montre sont des exemples, pas des spécifications) ;
- le cahier des charges : `docs/CDC_CORRECTIONS_RECETTE_G.md`, section U1 ;
- ton brief précédent `docs/BRIEF_GPT_CORRECTIONS_RECETTE_G.md`, section 1 : **toutes ses règles de travail s'appliquent ici** (worktree, un test qui échoue d'abord, aucun push, aucune règle de jeu changée, aucun test plié, style du code, vocabulaire V5, rapport final) ;
- ton rapport `docs/RAPPORT_GPT_RECETTE_G.md` et la fonction `applicationBlockingReasons` (`js/ui/resolution-panel.js`, ≈ :39) que tu as écrite pour C1 : U1 s'appuie dessus.

Base : `main` en 3.32.0 (38e07ad). Worktree : `git worktree add -b codex/u1-panneau-action tmp/u1-worktree main`, puis `npm ci`.

## 1. L'existant (à relire, lignes indicatives)

- Écran Jouer : `js/ui/workspace-view.js`. Grille à 3 colonnes `.workspace-play-grid` (`js/ui/workspace.css:98`) : piste des tours à gauche (`renderTrack`, ≈ :456), centre (`renderCenter`, ≈ :1684), panneau latéral droit Règles / Profils / Journal (`js/ui/side-panel.js`, repliable, classe `is-side-collapsed`).
- Au centre, dans l'ordre : fiches acteur et cible (`.workspace-duel`), puis panneaux conditionnels (fuite d'un Brisé, **prières** `createDivinePanel` ≈ :1772, **Corruption** `createV5CorruptionPanel` ≈ :1774, suites de combat), cartes conditionnelles (pavois, rechargement, mort critique…), et enfin le panneau **Résolution** (`renderResolutionPanel`, appelé ≈ :1790).
- `renderResolutionPanel` (`js/ui/resolution-panel.js`, ≈ :102 à 2860) construit tout impérativement, dans cet ordre : « Action » (puces d'action, sélecteur « Type » à 8 valeurs), « Cible », « Actions du Tour » (déplacement, viser, croche-pied, action défensive), champs propres à l'arme, zone « Test V5 » (`div.workspace-v5-context` : Nature du Test, Modificateur V5 (DR), Avantage/Désavantage, Fortune, activation de talent, défense, contexte des talents, assistance magique, armes spéciales, Destin…), `details` « Pénalités de situation en DR », `details` « Circonstances des Tests » (surnombre, circonstances de la défense, circonstances de combat L06 p.166, issue létale), jets (`div.workspace-resolution-rolls`), Calculer / Comparer, zone `live` (résultat, critiques), bouton Appliquer + raisons de blocage. Magie : `js/ui/resolution-panel/magic.js` remplace la zone « Test V5 » pour Focalisation, Incantation, Dissipation.
- Sous-modules : `js/ui/resolution-panel/dom.js` (helpers `node`, `button`, `chip`, `rubric`), `critical.js` (`rollField` : case d100 + bouton « Lancer », qui appelle `handlers.roll(field)` défini dans `workspace-view.js` ≈ :1121), `result.js`, `magic.js`.
- Thème : variables dans `MJ.css` (`:root` ≈ :47, sombre ≈ :95, `data-theme`), polices Grenze Gotisch / Alegreya / Alegreya Sans déjà embarquées. La maquette n'emploie que ces couleurs et polices : utilise les variables existantes, n'ajoute pas de couleur en dur.

## 2. La cible (maquette D)

Le panneau Résolution devient trois étapes numérotées, un pied d'application et un tiroir.

**Étape 1 · Action et cible.** Puces d'action de la fiche, puis puces de cible (groupes Adversaires / Alliés comme aujourd'hui). Le sélecteur « Type » à 8 valeurs disparaît de la vue principale : Attaque, Test, Compétence, Défense, Opposition restent accessibles par les puces d'action et une puce « Test… » ; **Focalisation, Incantation, Dissipation, Prière et Corruption** sont regroupés derrière une seule puce « Sort, prière, Corruption… » qui ouvre un petit menu. Choisir Focalisation/Incantation/Dissipation règle le type comme le sélecteur aujourd'hui ; choisir Prière ou Corruption ouvre et fait défiler jusqu'au panneau divin ou de Corruption existant (voir §3, lot U1-4). « Actions du Tour » (déplacer, viser, croche-pied, action défensive) : une puce « Actions du Tour… » dans cette étape, qui déplie le bloc existant.

**Étape 2 · Jets.** Les cases d100 de l'action (attaque, défense de la cible, défense engagée…) avec leur bouton « Lancer » existant, et au-dessus de chaque case une étiquette **PJ** ou **PNJ** selon le combattant à qui appartient le jet (PJ = profil de type PJ ; tout le reste = PNJ, couleurs de camp existantes). Le score de défense et son sélecteur restent à côté de la case de défense. Un bouton **« Lancer tous les dés des PNJ »** remplit, par le même mécanisme que « Lancer », toutes les cases d100 **vides** du panneau appartenant à un PNJ ou une créature, sans toucher une case déjà saisie ni un dé de PJ, puis déclenche « Calculer » comme Entrée le ferait. Il est désactivé (avec `title` explicatif) s'il n'y a aucune case PNJ vide. Sous les jets, une ligne de résumé : bouton « Circonstances · N actives » (ouvre le tiroir) suivi d'une phrase listant les circonstances actives et les saisies obligatoires restantes. Entrée dans une case calcule, comme aujourd'hui ; « Calculer » et « Comparer les cibles » restent dans cette étape.

**Étape 3 · Résultat.** La zone `live` actuelle (cartes de choix, pastilles attaque/défense, lignes de résultat, Élan, avertissements, critiques avec leurs d100 et « Lancer », formules). Avant tout calcul : une ligne grisée qui dit ce qu'on attend (« En attente du jet de défense d'Ulrike », ou « Saisissez les jets puis Entrée »).

**Pied.** Bouton Appliquer (libellés dynamiques actuels inchangés) et « Effacer » (le bouton « Annuler » actuel du résultat, renommé pour ne pas le confondre avec ↶) ; à côté, le bloc « À saisir avant d'appliquer » issu de `applicationBlockingReasons`, chaque ligne liée à son champ — si le champ est dans le tiroir fermé, le clic **ouvre le tiroir** puis donne le focus. Le pied reste visible (collant en bas du panneau) quand le panneau défile.

**Tiroir « Circonstances ».** Une colonne à droite, qui prend la place du panneau latéral Règles/Profils/Journal tant qu'il est ouvert (le panneau latéral se replie en rail ; il revient à sa largeur à la fermeture du tiroir). Titre, bouton « Fermer », phrase « Ce qui est coché entre dans le calcul. ». Il contient **tout** le contenu actuel de la zone « Test V5 », des « Pénalités de situation en DR » et des « Circonstances des Tests », avec les mêmes conditions d'apparition, regroupé dans cet ordre :
1. **Obligatoire** : les champs qui bloquent l'application en ce moment (ceux qui portent `data-blocking-field` et figurent dans les raisons), encadrés comme dans la maquette. Ex. sélecteur de la Bénédiction de Protection.
2. **Combat** : Nature du Test, Modificateur V5 (DR), pénalités de situation, circonstances de combat (portée, météo, lumière, couvert, hauteur, terrain, espace exigu, main secondaire…), surnombre.
3. **Défense de <cible>** : nature de la défense, avantages de défense, circonstances de la défense, champs « Défense — ».
4. **Avantage et Fortune** : sources d'Avantage et de Désavantage, Chance, relance, inversion, Destin.
5. **Talents** : activation de talent, compétences de talent, contexte des talents (coup ciblé, localisation…), règles propres au profil, attaque naturelle.
6. **Arme et munitions** : champs propres à l'arme (groupe, spécialité, compétence, munition, protection et bouclier) et armes spéciales (entaille, filet, poudre noire, bombe, gros projectile, tourbillon, tir extraordinaire…).
7. **Magie** (seulement si le type est magique, ou assistance magique en attaque) : contenu actuel de `magic.js` et assistance magique.
8. **Issue létale** et tout bloc restant non classé, plutôt que de le perdre.
Un groupe vide n'est pas affiché. Le tiroir mémorise son état ouvert/fermé dans le brouillon comme « Circonstances des Tests » le fait aujourd'hui (ouvert par défaut en attaque : garde ce comportement). Le compteur « N actives » compte les cases cochées et les valeurs différentes de leur défaut dans le tiroir.

**Ordre du centre.** Le panneau Résolution passe **avant** les panneaux prières, Corruption et suites de combat (décision du MJ : les actions physiques d'abord). Ces panneaux restent fonctionnels tels quels, chacun dans un `details` replié par défaut, sauf s'il porte une saisie en cours ou une décision en attente (à déterminer par ce qu'ils exposent déjà ; dans le doute, ouvert).

**Petits écrans** (≤ 900 px de large) : le tiroir devient un panneau superposé à droite, plein hauteur, avec fond assombri et fermeture par Échap ou clic dehors ; les étapes s'empilent sans défilement horizontal.

## 3. Découpage en lots (un commit par lot, tests verts à chaque lot)

- **U1-1 · Squelette en trois étapes et pied.** Réorganiser `renderResolutionPanel` en conteneurs d'étape (fonctions de rendu par étape plutôt qu'un seul flux, sans changer la logique des champs). Pied collant. Étiquettes PJ/PNJ sur les jets. Panneau Résolution avant prières/Corruption. Sans tiroir encore : la zone Test V5 et les Circonstances restent provisoirement dans l'étape 2, repliées.
- **U1-2 · Tiroir.** Déplacer le contenu dans le tiroir selon les 8 groupes, résumé et compteur, liens du pied qui ouvrent le tiroir, panneau latéral replié pendant l'ouverture, comportement ≤ 900 px.
- **U1-3 · « Lancer tous les dés des PNJ ».**
- **U1-4 · Menu « Sort, prière, Corruption… » et panneaux divin / Corruption en `details`.**
- **U1-5 · Finitions** : textes d'attente de l'étape 3, focus clavier visible, ordre de tabulation (étape 1 → 2 → 3 → pied → tiroir), `aria-expanded`/`aria-controls` sur le bouton du tiroir, thème sombre vérifié.

Si un lot révèle qu'un bloc ne peut pas être déplacé sans toucher à sa logique (état partagé, ordre de calcul), ne force pas : laisse-le à sa place, dans l'étape 2 sous un `details` « Autres réglages », et note-le au rapport.

## 4. Contraintes de non-régression

- **Aucun changement de comportement** : mêmes champs, mêmes conditions d'apparition, mêmes valeurs par défaut, mêmes calculs, mêmes raisons de blocage. Le brouillon (`draft`) et les commandes du store ne changent pas de forme, sauf l'état ouvert/fermé du tiroir.
- **Libellés et sélecteurs stables** : garde les libellés exacts, `aria-label`, `data-focus-key`, `data-roll-input`, `data-blocking-field` et noms accessibles des boutons. ≈ 100 parcours navigateur s'appuient dessus (divin, magie lot3, lot2 combat, workspace, index…). Quand une structure change vraiment (un `details` devenu tiroir, par exemple), adapte le parcours de façon minimale (ouvrir le tiroir avant d'agir) **sans retirer aucune assertion**, et liste chaque adaptation au rapport.
- La conservation du focus et du défilement entre deux rendus (mécanisme `data-focus-key`) doit continuer à marcher : saisir un d100, Entrée, le focus revient où il faut.
- Pas de nouvelle dépendance ; un nouveau fichier `js/**` est permis (ex. `js/ui/resolution-panel/drawer.js`), à signaler au rapport pour le cache du service worker.

## 5. Tests et preuve

- Unitaires (sous `tests/unit/combat/`) : choix des cases visées par « Lancer tous les dés des PNJ » (vides, PNJ seulement) ; classement d'un champ dans son groupe du tiroir ; compteur de circonstances actives.
- Parcours navigateur nouveau `tests/u1-panneau-action-browser.mjs` : attaque d'un PNJ contre un PJ béni par Protection → trois étapes visibles dans l'ordre ; « Lancer tous les dés des PNJ » remplit l'attaque et pas la défense du PJ ; le pied liste la défense et le Test de Calme ; clic sur le Test de Calme ouvre le tiroir sur le groupe Obligatoire ; saisie → Appliquer actif → appliquer ; tiroir fermé puis rouvert garde ses valeurs ; à 900 px le tiroir est superposé et se ferme par Échap. Captures 1440 et 900 px, clair et sombre, dans `tmp/u1-worktree/captures/` (non commitées) et citées au rapport.
- Fin : `node --test --test-concurrency=4` vert, **`npm run test:browser-all` à 104/106** (seuls `lot2-v5-25-release-browser.mjs` et `lot3-v5-35-release-browser.mjs` échouent, faute de fichier `tmp/` : déjà le cas avant). ChatGPT n'avait pas relancé tous les parcours au chantier précédent et un parcours cassé lui avait échappé : **cette fois, la suite complète des parcours est obligatoire avant le rapport.**
- Rapport `docs/RAPPORT_GPT_U1.md` (dans la branche) : par lot, commit, ce qui a été fait, blocs laissés en place et pourquoi, parcours adaptés (fichier, ligne, nature), nouveaux fichiers `js/**`, captures.

## 6. Hors périmètre

- Les fiches acteur et cible (`.workspace-duel`), la piste des tours, le bandeau de Round : inchangés (la maquette les simplifie, ce n'est pas demandé ici).
- Le contenu des panneaux prières, Corruption et suites de combat : seulement leur position et leur repli.
- Un « Lancer » pour le Test de Calme de la Bénédiction de Protection (visible sur la maquette) : le sélecteur reste un choix du MJ ; ne pas inventer de jet.
- Publication, version, service worker, push : Claude s'en charge après contre-vérification.
