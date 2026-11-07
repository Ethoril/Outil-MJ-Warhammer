# Brief — liaison RPG Map Display, lot 2 : image de pion sur le profil (pour ChatGPT / Codex)

Tu ajoutes à l'« Outil MJ Warhammer » une **image de pion sur les profils** de PNJ et de créatures. Cette image est envoyée à RPG Map Display, le VTT du MJ, ouvert dans un autre onglet. Tâche de taille moyenne, côté outil MJ seulement : **tu ne touches pas au dépôt `rpg-map-display`**.

## Lis d'abord

Lis ces documents dans `E:/Outil MJ Warhammer/docs/` :
- `CONTRAT_LIAISON_MAP_DISPLAY.md` : le contrat de liaison validé par le MJ. Sections utiles : §4 (`token.state`, champ `imageUrl`), §6 (images) et §1 (qui écrit quoi).
- `BRIEF_GPT_CORRECTIONS_RECETTE_G.md`, section 1 : **toutes ses règles de travail s'appliquent** :
  - travailler dans un worktree ;
  - écrire d'abord un test qui échoue ;
  - aucun push ;
  - ne changer aucune règle de jeu et ne plier aucun test ;
  - respecter le style du code et le vocabulaire V5 ;
  - rendre un rapport final.
- `PASSATION_LIAISON_MAP_DISPLAY_04_11.md` : l'état du chantier.

**Base** : commit `778cdba` de la branche `dev/recette-plateau-04-11`. Ce commit contient le code de liaison que tu complètes.

```bash
git worktree add -b codex/liaison-lot2-images tmp/lot2-images-worktree 778cdba
```

Lance ensuite `npm ci` dans le worktree.

## 1. L'existant

| Fichier | Rôle |
|---|---|
| `js/core/map-link-state.js` | `tokenStateOf(participant, participants, { maxHp })` construit le payload `token.state`. **`imageUrl` y vaut toujours `null`** : c'est ce que tu remplaces |
| `js/core/map-link.js` | `createMapLink` émet `token.add` et `token.state` à chaque changement de l'instantané, avec un diff en JSON. Tu n'as rien à y changer, sauf si ton test le justifie |
| `js/main.js` | Bloc « Liaison RPG Map Display », juste avant « Abonnements Bus ». Câble `createMapLink` avec `getParticipants: () => Store.listParticipants()` et `maxHpOf` (qui lit le profil par `Store.getProfile(participant.profileId)`). L'image se lit au même endroit, par le profil |
| `js/core/models.js` | Profils : la classe et `FICHE_DATA_FIELDS` (≈ :132) |
| `js/core/sanitize.js` | Normalisation. **Vérifie qu'un nouveau champ survit au nettoyage, à la persistance locale (IndexedDB et localStorage) et à la synchronisation Firestore.** Un champ inconnu peut y être retiré sans bruit |
| `js/ui/reserve.js` | Fiches et édition des profils de la réserve |
| `js/core/encounters.js:35` | `cloneParticipant` : un participant garde `profileId`. Le plus simple est que l'image reste sur le profil et ne soit **pas** copiée dans chaque participant |

## 2. La cible

1. **Champ de profil `tokenImage`** (`string` ou absent) : une image `data:image/webp;base64,...` ou `data:image/jpeg;base64,...` d'**au plus 24 Kio** (24 576 octets pour la chaîne entière). Au-delà, ou sous une autre forme, le champ est refusé à la normalisation.
   - Pas de `blob:`, pas d'URL distante.
   - Le champ doit survivre à l'export et à l'import JSON d'un profil (`js/core/json-profile-export.js`) et à la duplication d'un profil.
2. **Import dans l'éditeur de profil** (`reserve.js`) :
   - bouton « Image du pion… », qui ouvre un sélecteur de fichier image ;
   - recadrage **carré centré**, puis réduction à 256×256 px, puis encodage en WebP, en baissant la qualité par paliers (0,85, 0,75, 0,65, 0,55, 0,45) jusqu'à passer sous 24 Kio ; à défaut, réessayer en 192×192, puis en 128×128 ;
   - si rien ne passe, message clair et aucun changement ;
   - aperçu rond de 64 px dans la fiche, et bouton « Retirer l'image ».
   - Le MJ ne voit aucun réglage technique.
3. **Envoi** : `tokenStateOf` reçoit l'image en option (`{ maxHp, imageUrl }`), sur le modèle de `maxHp` ; `tokenStatesOf` la résout par `options.imageUrlOf?.(participant)`. Les règles :
   - **PJ** : toujours `imageUrl: null`, même si son profil porte une image (contrat §6 : le pion d'un PJ garde l'image choisie dans Map Display).
   - **Tous les autres participants** : l'image de leur profil, ou `null` s'il n'en a pas. Un participant improvisé, sans profil, envoie `null`.
   - Câblage dans `main.js` : `imageUrlOf: participant => Store.getProfile(participant.profileId)?.tokenImage ?? null`.
4. **Copies d'un même profil** : trois Gobelins issus du même profil envoient la même image. Rien de plus à faire.

## 3. Tests attendus (`node --test`)

Écris d'abord un test qui échoue. Ensuite :
- **Unitaires de l'état** : ajoute-les à `tests/unit/combat/liaison-carte.test.js` ou crée un fichier voisin.
  - Un PNJ dont le profil a une image : `imageUrl` porte cette image.
  - Un PJ dont le profil a une image : `null`.
  - Un participant sans profil : `null`.
  - Changer l'image d'un profil produit un `token.state` pour chaque participant de ce profil (via `createMapLink`, avec le faux canal de `liaison-carte-canal.test.js`).
- **Normalisation** :
  - une image `data:` valide de moins de 24 Kio est conservée ;
  - une image trop lourde, une URL `https:`, un `blob:` ou un nombre sont refusés ;
  - le champ survit à l'aller-retour export/import JSON.
- **Réduction d'image** : la logique de choix des paliers (taille, puis qualité) doit être une **fonction pure**, testée avec un encodeur factice qui rend des tailles imposées. Le canvas n'est que l'encodeur réel, injecté.
- **Suites de non-régression** : `node --test "tests/unit/combat/*.test.js"` (1 288 tests au départ) et `node --test "tests/unit/stockage/*.test.js"` doivent rester vertes.
- **Mutation** : pour au moins deux règles (la limite des 24 Kio et le cas PJ), casse le code, constate que le test passe au rouge, remets le code, et note-le dans ton rapport.

## 4. Hors périmètre

- Le dépôt `rpg-map-display`, et son disque de camp avec initiales (lot 2, côté carte).
- Les montures et le médaillon du cavalier (lot 3).
- Les effets de sang (lot 4).
- Une image sur les fiches PJ Firestore (décision du MJ : non).
- L'import en masse pour le bestiaire.
- Aucune modification de `sw.js` sans nécessité. Si tu crées un module, ajoute-le au précache de `sw.js` comme ses voisins, et dis-le dans le rapport : `sw.js` porte des changements non commités d'un autre chantier, qu'il faudra fusionner à la main.

## 5. Rapport final

Rédige `docs/RAPPORT_GPT_LIAISON_LOT2.md` dans ton worktree :
- les fichiers modifiés ;
- les tests ajoutés ;
- les mutations faites ;
- les commandes lancées et leurs résultats ;
- tout écart avec ce brief, et pourquoi.

Commite dans ta branche, sans pousser.
