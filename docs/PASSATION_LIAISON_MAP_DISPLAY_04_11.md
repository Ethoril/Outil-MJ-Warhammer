# Passation — liaison Outil MJ ↔ RPG Map Display (04/11/2026)

Pour la session du compte Pro qui reprend le chantier. **Lire d'abord** `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` (contrat v1, validé par le MJ). Il porte toutes les décisions, et chaque réponse du MJ y est intégrée. Ne rien re-demander de ce qui y figure.

## Contexte

- Deux dépôts :
  - `E:\Outil MJ Warhammer` (ce dépôt) ;
  - `E:\rpg-map-display`, VTT du MJ. Il a son propre `CLAUDE.md`, très normatif, à lire avant d'y toucher : manifeste fermé, `pnpm run verify`, tests validés par mutation (`/muter`).
- La copie du contrat dans Map Display est `docs/CONTRAT-LIAISON-OUTIL-MJ.md`. Elle est identique et doit le rester : toute modification se reporte dans les deux copies.
- Le MJ a autorisé, via le contrat, les amendements de Map Display listés au §11 du contrat. Le reste suit la règle de Map Display : se signale, ne s'improvise pas.
- Mode développement (mémoire du 04/11) : **pas de push en production**, tests ciblés, recette sur un serveur local.
- Branche courante de l'outil MJ : `dev/recette-plateau-04-11`. Elle contient des modifications **non commitées qui ne viennent pas de ce chantier** : montures, store, workspace-view, version. **Ne pas les mélanger.** Travailler dans un worktree dédié, par exemple `tmp/liaison-map-worktree` sur une branche `feat/liaison-map-display`, et ne commiter que ses propres fichiers.
- Map Display se synchronise entre le Mac et le PC par git seulement. Avant d'y travailler : `git fetch`, puis lire les deux sens.

## Repères de code (cartographie du 04/11)

### Outil MJ

| Sujet | Où |
|---|---|
| Participant | `js/core/encounters.js:35-62` (`cloneParticipant`) |
| Camps | `encounters.js:9-33` (`participantCamp`) |
| Lancement d'une rencontre | `launchEncounter` (`encounters.js:120`) |
| PV | `hp` et `maxHp` (`maxHp` peut être `null` pour un PJ persistant) |
| États | `{ key, name, level }`, normalisés par `js/core/effects.js:41` |
| Mort | `extensions.v5.dead` |
| Taille | `js/core/creature-size.js` (`creatureSizeOf(p).key` : small, average, large, enormous, monstrous) |
| Mouvement | Champ `movement` ; Traits dans `js/core/creature-movement.js` (`planMovement`) |
| Sens | `js/core/creature-senses.js` (`senseTraits`, `carriesSense`) |
| Montures | `js/core/mounts.js` (`mountedStateForMap`, `linkedMountOf`, `ownMountIdOf`) |
| Engagements | `js/core/engagements.js` (`listEngagements`, `meleeGroups`) |
| Événements | `js/ui/bus.js`. Le store émet `'combat'` sans payload (`store.js:269-278`) ; abonnements dans `js/main.js:1815` |

### Map Display

| Sujet | Où |
|---|---|
| `Token` | `js/core/types.js:160-200` |
| Fabrique de pion | `createToken` (`js/core/schema.js:572`) |
| Validation | `assertValidCampaign` |
| Liste blanche des patchs | `ALLOWED_TOKEN_PATCH_KEYS` (`js/state/store.js:1752`) |
| Mutations | `setTokenMounted` (`store.js:1846`), `addToken`, `reserveToken` (`store.js:1918`) |
| Marqueurs | `STATUS_MARKER_IDS` (`js/core/constants.js:273`), avec libellés, catégories et icônes `assets/icons/status/` |
| Source de vision | `kind === 'pc'` dans `js/render/layers/fogLayer.js:112,338` et `js/app/gm.js:486,546` |
| Monté | ×2 dans `js/state/selection.js:30-42` (`MOUNTED_SPEED_MULTIPLIER`) |
| Republication vers la tablette | Modèle : `js/ui/gm/panel.js:2540-2562` (`store` + `transport.publish`). Réducteur des joueurs : `js/app/networkEvents.js` |
| Piège RTDB | Ni `null`, ni tableau vide, ni objet vide (déjà cassé en prod, voir `tests/transport.test.mjs`) |

## Lot 1 (socle), découpé

À faire dans l'ordre, une session neuve par étape (mémoire « Pro : session neuve par lot ») :

- **A. Outil MJ, module pur** `js/core/map-link-state.js` + tests (`tests/unit/...`) :
  - `tokenStateOf(participant, participants)` construit le payload `token.state` du §4 : label, camp, kind, visionSource, sizeCells, speedCells et runCells effectifs, visionDim, hp, health, markers et markerLevels (§5), dead ;
  - `diffTokenStates(prev, next)` donne la liste des `ref` qui ont changé ;
  - pas encore de montures (`rider`) ni d'image.
  - Avancement : voir plus bas.
- **B. Outil MJ, canal** : module de liaison (BroadcastChannel `wfrp-map-link`, enveloppe du §2.2, `mj.hello`, `mj.snapshot` en réponse à `map.hello`, ping toutes les 5 s, `token.add` au lancement d'une rencontre, `token.state` sur `Bus.on('combat')` filtré par le diff, `encounter.end`) et indicateur « carte connectée ». Test avec un faux canal.
- **C. Map Display, schéma** :
  - nouveaux champs de `Token` : `link`, `runCells`, `visionSource`, `markerLevels`, `dead`, `deathCause`, `camp` ;
  - marqueurs `fatigued` et `tainted` (libellés Exténué et Souillé, catégories, icônes) ;
  - `visionSource` remplace `kind === 'pc'` dans la vision, avec la valeur par défaut `kind === 'pc'` ;
  - ×2 monté ignoré si le pion a un `link`.
  - Amendement du manifeste et du CdC §6 et §7 dans le même commit. `pnpm run verify` vert, et mutation des nouveaux tests.
- **D. Map Display, module de liaison** `js/app/mjLink.js` :
  - réception, application par le store, puis `transport.publish` vers la tablette ;
  - `token.add` dans la réserve ;
  - `encounter.end` (garder les PJ, retirer les autres pions liés) ;
  - verrous d'interface sur un pion lié ;
  - `map.hello` et ping.
- **E. Serveur local commun** qui sert les deux dépôts sous `/Outil-MJ-Warhammer/` et `/rpg-map-display/` sur un seul port (même origine, comme GitHub Pages). Plus une entrée dans `.claude/launch.json`.
- **F. Liaison durable des PJ** : `mj.roster` envoyé par l'outil MJ, puis bouton « Lier à un PJ de l'outil MJ » dans le panneau MJ de Map Display.

Les lots 2 à 5 suivent le §13 du contrat.

**Lot 2, côté outil MJ : intégré le 04/11.** GPT a ajouté l'image de pion sur le profil (champ `tokenImage`) : commit `1fe91ac`, intégré par avance rapide dans `dev/recette-plateau-04-11` après contre-vérification. Son rapport : `tmp/lot2-images-worktree/docs/RAPPORT_GPT_LIAISON_LOT2.md`. Reste à faire, côté Map Display : le disque de camp avec initiales pour un pion sans image.

**Lot 4, cause de mort côté outil MJ : intégré le 04/11 (partiel).** Commit GPT `cdd75e4`, avance rapide dans `dev/recette-plateau-04-11` après contre-vérification (diff relu, 741 tests ciblés verts, mutation de la garde « cause seulement si mort » en rouge). Rapport : `docs/RAPPORT_GPT_LIAISON_LOT4.md`. Causes posées : `blood` (attaque, critique, mort subite), `magic` (effet divin, expiration, étouffement, Soleil Violet), `fire` (Sang Bouillonnant, sort du domaine `fire`). Questions au MJ, en attente :
- ~~décapitation et démembrement~~ **tranché par le MJ le 05/11** d'après les lignes mortelles V5 (pp. 173-176) : Démembrement brutal (bras arraché), Corps déchiré (coupé en deux) et Bassin fracassé (jambe sectionnée) → `dismemberment` ; Crâne fracassé → `blood` (tête enfoncée), ou `decapitation` si le MJ clique « Confirmer : décapité » (le livre réserve la décapitation à une arme tranchante, que l'outil ne connaît pas). `criticalDeathCause` dans `v5-critical-aftermath.js`, `deathDecision.decapitated` garde la trace ; non commité ;
- morts par état (Enflammé, Hémorragique, Empoisonné) : `advanceV5Effects` propose le décès sans poser `extensions.v5.dead`, donc ni `fire` ni `poison` ;
- Incident Cataclysme : pose `participant.dead` et non `extensions.v5.dead`, donc pas de `fx.death` sur la carte.

**Essais d'effets du lot 4 (04/11, à la demande du MJ)**, dans `tmp/effets-sang/`. Images générées avec Magnific (Nano Banana 2.1), vues de dessus :
- `gerbe-1/2` : gerbe de sang ;
- `flaque-1/2` : flaque ;
- `feu-1/2` : calcination ;
- `poison-1/2` : poison ;
- `magie-1/2` : dissipation magique, sur fond noir ;
- `planche-gerbe.png` : planche de 4 images de 512 px pour animer la gerbe ;
- `gerbe-1-detouree.png` : essai de détourage, pour comparer.

`apercu.html`, ouvert via `http://localhost:8770/Outil-MJ-Warhammer/tmp/effets-sang/apercu.html` (serveur `liaison-map`), joue les blessures et les quatre morts sur un pion.

Technique retenue :
- les images sur fond blanc se posent en `mix-blend-mode: multiply` (ou `globalCompositeOperation = 'multiply'` sur Canvas), ce qui évite tout détourage ;
- la magie, sur fond noir, se pose en `screen`.

À faire au lot 4 :
- décapitation et démembrement ;
- choix des images avec le MJ ;
- réduction de leur poids : à compresser en WebP, elles devraient faire environ 30 à 60 Kio chacune (mesure à faire) ;
- inscription au manifeste de Map Display (`assets/`), avec leur provenance.

## Avancement (fin de session du 04/11, quota Team à 93 %)

Étapes **A, B et E faites, non commitées**. Elles sont dans l'arbre principal, sur `dev/recette-plateau-04-11`, au milieu de modifications d'autres chantiers.

Fichiers de ce chantier :

| Fichier | Contenu |
|---|---|
| `js/core/map-link-state.js` (nouveau) | `tokenStateOf`, `tokenStatesOf`, `diffTokenStates`, `healthOf`, `markersOf`, `rangeCellsOf`, `visionDimOf`, `mapRefOf` |
| `js/core/map-link.js` (nouveau) | `createMapLink({ channel, getParticipants, maxHpOf, now, onStatus })` : `mj.hello`, `token.add`, `token.state`, `token.remove` déduits des instantanés, `mj.snapshot` sur `map.hello`, `tick()` (ping et délai de 15 s) |
| `tests/unit/combat/liaison-carte.test.js`, `tests/unit/combat/liaison-carte-canal.test.js` (nouveaux) | 11 tests verts. Deux mutations vérifiées en rouge : taille Grande → 1, garde « PJ jamais retiré » |
| `js/main.js` | Import, puis bloc « Liaison RPG Map Display » juste avant « Abonnements Bus » : `Bus.on('combat')` et `'combat:update'` appellent `refresh`, `setInterval(tick)`, toast de statut |
| `sw.js` | Les deux modules ajoutés au précache, après `mounts.js`. ⚠ `sw.js` était déjà modifié par un autre chantier |
| `tools/serve-liaison.mjs` (nouveau) et entrée `liaison-map` (port 8770) dans `.claude/launch.json` | Serveur commun, même origine |
| `docs/CONTRAT_LIAISON_MAP_DISPLAY.md` et sa copie dans Map Display | §4 : double échelle (2 m par case pour le mouvement et le tir, 1 m par case pour les sorts, prières et talents, la vision restant à 2 m). §7 : `token.remove`. §10 : `map.distance` en cases |

Vérifié :
- l'application démarre (`npm run test:startup` vert) ;
- `audit-meta-production` est vert ;
- dans le navigateur, sur `http://localhost:8770/Outil-MJ-Warhammer/`, un faux `map.hello` posté sur le canal reçoit `mj.snapshot` (0 pion hors combat) ;
- `gm.html` de Map Display se charge sous `/rpg-map-display/` sans erreur console.

**Non vérifié** : un vrai combat dans le navigateur (`token.add` au lancement, puis `token.state` sur des dégâts).

Simplifications à reprendre :
- **Portées** : `rangeCellsOf` ne gère que le Mouvement brut et Enchevêtré = 0. Le contrat demande les portées effectives. Il reste à brancher les Traits (Vol, Bond, Foulée…) de `creature-movement.js`, les autres états qui limitent le déplacement et l'armure, à vérifier contre les règles V5.
- **PV max des PJ** : `maxHpOf` dans `main.js` lit `profile.ficheSnapshot.woundsMax ?? profile.maxHp`. Ce chemin est à confirmer sur un PJ persistant réel.
- **Statut** : un simple toast. L'indicateur durable « carte connectée » reste à faire dans l'interface.

### Étape C, première moitié (faite le 04/11, dans le worktree Map Display)

Emplacement : worktree `E:\rpg-map-display-liaison`, branche `feat/liaison-outil-mj`, créée depuis `origin/main` (`4135c1f`), dépendances installées.

- `js/core/types.js` : champs optionnels `link`, `runCells`, `visionSource`, `markerLevels`, `dead`, `deathCause`, `camp`. Absents sur un pion ordinaire.
- `js/core/schema.js` :
  - `isVisionSource(token)` (`visionSource`, sinon `kind === 'pc'`) et `isLinkedToken(token)` ;
  - validation `linkedTokenErrors`, appelée dans la boucle des pions de la validation de campagne.
- `js/render/layers/fogLayer.js` (2 endroits) et `js/app/gm.js` (`aUnPJ`, `revealAlongMove`) passent par `isVisionSource`.
- `js/state/selection.js` : pas de ×2 monté pour un pion lié.
- `tests/liaisonOutilMj.test.mjs` : 4 tests. Deux mutations vérifiées en rouge (vision, ×2). L'usage de `isVisionSource` dans `fogLayer` n'est pas couvert par un test dédié.
- Documentation : entrée du contrat dans le manifeste des docs (`ARCHITECTURE.md`), paragraphe « Pion lié » au §6 du CdC, juste avant §5.3bis. La copie du contrat est dans `docs/`.
- Résultats : typecheck vert, check-deps vert, 741/744 tests unitaires (0 échec). E2E : voir le commit, ou relancer `pnpm run test:e2e`.

### Suite du 04/11 (commits locaux dans le worktree, **non poussés**)

| Commit | Contenu |
|---|---|
| `6229a8a` | Étape C : champs du pion lié, vision par `isVisionSource`, pas de ×2 monté pour un pion lié, amendements du manifeste et du CdC |
| `ac0da6a` | `store.updateToken` accepte, **sur un pion lié seulement**, `imageUrl`, `runCells`, `visionSource`, `markerLevels`, `dead`, `deathCause`, `camp` (`LINKED_TOKEN_PATCH_KEYS`). `link` et `mounted` restent hors patch |
| `98eee80` | `store.addTokenToReserve(token)` : pion créé directement en réserve. La tablette le reçoit à la pose, par le `token.add` existant |
| `cf7e5af` | `js/app/mjLink.js` (inscrit au manifeste) : `planMjMessage(campaign, message)` traduit un message en opérations (`reserveAdd`, `update` des seuls champs changés, `mounted`, `remove`, `awaitBinding` pour un PJ non lié) ; l'instantané retire les PNJ liés disparus |
| `31850fe` | `executeMjOperations(ops, deps)` : la réserve reste locale au MJ, le plateau est republié par `token.update`, `token.mounted` et `token.delete`. Store : `updateReserveToken` (accepte aussi `mounted`, puisque hors plateau) et `removeFromReserve` |
| `9b7fd61` (e2e : 310 tests réussis) | `startMjLink(...)` dans `mjLink.js` (BroadcastChannel, `map.hello` à l'ouverture et sur `mj.hello`, `map.ping`, délai de 15 s, exécution), branché dans `js/app/gm.js` après le chargement de la campagne (`setInterval(mjLink.tick)`, statut seulement en `console.info`). Typecheck vert, 746 tests unitaires verts, e2e vert |

| `ae6b47d` (e2e : 310 tests réussis) | Verrous d'interface sur un pion lié. Dans le panneau MJ, grisés : nom, type, taille, portée, vision, PV max et courants, santé, marqueurs, et dans la barre de vitalité PV, santé et monture, avec l'indice « Géré par l'outil MJ ». Sur la tablette, le bouton monture de la bande de sélection est grisé. **Pas de test dédié** |
| `53bdf13` (unitaires verts, e2e non relancé) | `store.setTokenLink(tokenId, ref \| null)` et événement réseau `token.link { tokenId, ref? }` (sans `ref`, le pion est délié). Un même `ref` ne lie qu'un pion. Le CdC §7 est amendé |

Reste pour F : un bouton « Lier à un PJ de l'outil MJ » dans la fiche du pion du panneau MJ. Il proposera les `awaiting` que `startMjLink` remonte via `onStatus` (aujourd'hui en console), puis appellera `setTokenLink` et publiera `token.link`. Il faudra ensuite **renvoyer un `map.hello`**, pour que l'outil MJ renvoie l'instantané et que le PJ prenne son état. Côté outil MJ, les PJ hors combat ne sont pas encore émis : `getParticipants` ne lit que la scène. Pistes :
- `Store.listPersistentCharacters()` (`store.js:3804`) donne les personnages persistants (porteurs de `hp`, `maxHp` et `states`, voir `cloneParticipant`, `encounters.js:35`). Leur lien au profil est à confirmer (voir `fiche-sync.js:691`).
- Hors scène, construire pour chacun un pseudo-participant `{ kind: 'PJ', persistentCharacterId, name, hp, maxHp, states, movement, caracs }` à partir du profil.
- En scène, ne pas émettre deux fois le même `pj:` ref.

Chaque commit a été contrôlé par des mutations qui font échouer les tests : vision, ×2, verrou des pions liés, `changedOnly`, nettoyage à l'instantané, réserve non republiée, `token.delete` publié.

**Non vérifié en navigateur** : la vue MJ exige une connexion Google, que l'agent ne peut pas faire. Deux options :
- un test Playwright avec le harnais e2e (`tests/browserTestTransport.mjs`) ;
- une recette par le MJ : serveur `liaison-map-worktree`, port 8771 (dans `.claude/launch.json` de l'outil MJ). Ouvrir les deux onglets sur `http://localhost:8771/`, lancer une rencontre et vérifier que les pions arrivent en réserve.

À noter pour D :
- `startMjLink` n'empêche encore personne de modifier un pion lié dans l'interface. Il reste les **verrous d'interface** (panneau MJ et tablette) et un **indicateur visible** « outil MJ connecté », avec la liste des PJ en attente de liaison (`awaiting`).
- Ressusciter un pion (`dead: false`) laisse `deathCause` en place. **Règle retenue : `deathCause` ne se lit que si `dead === true`.** L'effacer ne servirait à rien, puisque RTDB ne transmet ni `null` ni `undefined` : la tablette garderait l'ancienne valeur.
- La réserve n'est pas republiée vers la tablette (choix assumé). Un pion lié retiré de la réserve n'émet donc aucun événement.

### Reste de l'étape C

- Marqueurs `fatigued` et `tainted` : constantes (`STATUS_MARKER_IDS`, libellés, catégories), icônes avec leur source dans `assets/icons/status/SOURCES.md` (voir `scripts/install-status-icons.mjs`), puis le chiffre de niveau sur le badge (`js/render/statusBadges.js`).
- Ajouter les nouveaux champs à `ALLOWED_TOKEN_PATCH_KEYS` (`js/state/store.js:1752`) et rendre `imageUrl` modifiable pour un pion lié. Cela peut se faire avec D.

**Prochaine étape : fin de C, puis D.** Ensuite, recette avec les deux onglets ouverts sur le port 8770.

Avant de commencer :
1. Décider avec le MJ où commiter ces fichiers : une branche dédiée, ou un commit local « (Claude) » des seuls fichiers de ce chantier. Pour `main.js` et `sw.js`, ne commiter que nos hunks (`git add -p` n'est pas interactif ici : préparer un patch).
2. Dans Map Display, faire `git fetch` puis lire les deux sens. **État au 04/11** : le dépôt est sur la branche `autonome/2026-08`, avec **3 commits non poussés**. HEAD = `4135c1f` = `origin/main`. La copie du contrat n'y est pas suivie (`??`). **Décision du MJ (04/11)** : travailler dans un **worktree dédié créé depuis `origin/main`** (par exemple `E:\rpg-map-display-liaison`, branche `feat/liaison-outil-mj`). **Ne pas toucher à `autonome/2026-08`** ni à son checkout. Y recopier `docs/CONTRAT-LIAISON-OUTIL-MJ.md`.
3. Repères pour l'étape C : `normalizeToken` (`js/core/schema.js:322`), `createToken` (`schema.js:572`), validation de `mounted` (`schema.js:1138`), validation de `speedCells` (`schema.js:1101`). Les icônes `fatigued` et `tainted` exigent une source déclarée dans `assets/icons/status/SOURCES.md`.
