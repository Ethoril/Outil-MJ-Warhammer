# Plan · Images des pions depuis la bibliothèque de Map Display

Sur `42d6965`. Spec : [spec.md](spec.md). Deux dépôts : l'outil MJ (ici) et `E:/rpg-map-display` (la carte).

## Approche

1. **Une table, dans l'outil.** `js/data/token-images.js` (module généré, figé) liste **toutes** les images de la bibliothèque : chemin, libellé, profils du bestiaire appariés, et pour une forme bestiale la bête et le vent. Elle sert à la fois d'appariement automatique et de liste pour le sélecteur : l'outil ne lit rien sur le réseau pour connaître la bibliothèque.
2. **Résolution à l'envoi.** Un module pur choisit l'image d'un profil : image importée, sinon image choisie, sinon image automatique (par `extensions.v5.bestiary.id`, déjà présent sur les profils copiés du bestiaire), sinon rien. La liaison envoie le chemin relatif `maps/tokens/…` dans `imageUrl` ; la carte l'accepte déjà (`isPersistableAssetUrl`) et ne le compte pas dans le cumul de 512 Kio (seules les `data:` y entrent, `schema.js:1294`).
3. **Forme bestiale par un champ séparé.** `token.state` gagne `formImageUrl` (chemin ou `null`, toujours envoyé). La carte affiche `formImageUrl` s'il existe, sinon `imageUrl`. Rien n'est écrasé : au retour, `null` suffit à retrouver l'image d'avant, y compris celle d'un PJ.
4. **Garde-fou.** La table est recopiée dans la carte par l'outil existant de recopie des données communes ; un test de la carte vérifie que chaque chemin existe sur disque. En CI (checkout git), un fichier non versionné fait échouer `verify`, donc le déploiement.

## Modèle de données et contrats

**Table** (`js/data/token-images.js`, générée depuis `tools/token-images.csv`, triée par chemin) :

```js
export const TOKEN_IMAGES = [{ path: 'maps/tokens/bestiaire/loup.webp', label: 'Loup', group: 'bestiaire',
  profiles: ['L01-…', 'L10-…'], form: null /* ou { beast: 'wolf', wind: 'beasts' | 'jade' } */ }];
```

`beast` = clé de `js/data/v5-transformation-bestiary.js` ; `wind` déduit du suffixe du fichier (`-bete` → `beasts`, `-vie` → `jade`).

**CSV relu par le MJ** (`tools/token-images.csv`, séparateur `;`) : `chemin;libellé;profils (ids séparés par |);noms des profils;livre et page;confiance;note`. Seules les trois premières colonnes sont lues par le générateur ; les autres servent à la relecture.

**Profil de réserve** : champ facultatif `tokenLibraryImage` (chemin relatif commençant par `maps/tokens/`, sans `..`, extension image, ≤ 200 caractères). Absent = aucun choix, lu au point de lecture ; **pas de migration**, le schéma reste en version 4. Exclusif de `tokenImage` à l'enregistrement du formulaire. La monture d'un profil est elle-même un profil (`monture-<id>`) : même champ, même résolution.

**Participant sous Forme bestiale** : `extensions.v5.beastForm.wind` (`'beasts'` | `'jade'`), écrit à la transformation. Absent (transformation en cours avant mise à jour) = `beasts`. `kind: 'kadon'` n'envoie pas d'image de forme (hors périmètre).

**Contrat de liaison** (`docs/CONTRAT_LIAISON_MAP_DISPLAY.md` et sa copie `rpg-map-display/docs/CONTRAT-LIAISON-OUTIL-MJ.md`, à garder identiques) :
- §4/§6 `imageUrl` : `data:` ≤ 24 Kio, **ou chemin relatif sous `maps/tokens/`**, ou `null`. Vaut aussi pour `rider.imageUrl`.
- §4 nouveau champ `formImageUrl: string|null` : chemin relatif sous `maps/tokens/` ; `null` efface. Seul cas où l'outil change l'image d'un PJ. Ajout compatible, version du contrat inchangée (comme `color` et `deathCause`).

## Signatures

```js
// js/core/token-image.js (nouveau, pur)
export function normalizeLibraryImage(value)            // chemin valide ou undefined
export function tokenImageOf(profile, table = TOKEN_IMAGES)   // { url, source: 'imported'|'chosen'|'auto'|null }
export function formImageOf(participant, table = TOKEN_IMAGES) // chemin ou null
export function libraryImageSrc(path)                   // '../rpg-map-display/' + path, pour les vignettes de l'outil
```

## Fichiers

**Outil MJ**
- Créés : `js/core/token-image.js`, `js/data/token-images.js` (généré), `tools/token-images.csv`, `tools/build-token-images.mjs` (`--check`), tests `tests/unit/combat/token-image.test.js`, `tests/unit/donnees/token-images.test.mjs`.
- Touchés : `js/main.js` (`imageUrlOf`, option `formImageUrlOf`), `js/core/map-link-state.js` et `js/core/map-link.js` (`formImageUrl`), `js/core/models.js`, `js/core/sanitize.js`, `js/core/migrations.js` (`PROFILE_KEYS`), `js/core/json-profile-export.js`, `js/core/json-profile-import.js`, `js/ui/reserve.js` + `index.html` (sélecteur, vignettes, monture), `js/core/v5-magic-arbitrations.js` et son appelant (`wind`), `tools/recopier-donnees-communes.mjs` (seconde source), `sw.js` si la liste de cache est explicite, contrat, README, `docs/SUIVI_EVOLUTION.md`.

**Map Display**
- Créés : `js/core/token-images.js` (copie), `tests/tokenImages.test.mjs`.
- Touchés : `js/core/schema.js` et `js/core/types.js` (`formImageUrl` sur un pion), `js/app/mjLink.js` (`formImageUrl` détenu par l'outil, `null` significatif), `js/render/layers/tokens.js` et tout autre lecteur de `token.imageUrl` pour l'affichage (vue joueurs, médaillon), tests de liaison existants, copie du contrat.
- Jamais touchés : les fichiers de `maps/tokens/` (images et `catalog.json`).

## Vérification des critères

| CA | Vérification |
|---|---|
| CA1-CA4, CA7-CA9, CA16 | Tests unitaires de `tokenImageOf` et de `tokenStateOf` (`tests/unit/combat/token-image.test.js`, `liaison-images.test.js`). CA2 : profil sans champ nouveau, avec `extensions.v5.bestiary.id` seul. |
| CA5 | Test unitaire côté carte : un `token.state` à chemin relatif donne un pion valide (`validateCampaign`), cumul embarqué inchangé. Recette locale : image > 24 Kio visible. |
| CA6, CA11-CA13 | Test navigateur `tests/liaison-images.browser.mjs` étendu (sous `timeout 120`) : recherche, choix, vignette, bibliothèque absente. |
| CA10 | Tests unitaires : aller-retour `sanitize`, `migrations`, export/import JSON. |
| CA14-CA15 | Tests unitaires de `tokenStatesOf` avec monture (image auto puis choisie dans `rider.imageUrl`). |
| CA17-CA19 | Outil : tests de `formImageOf` (vent, PJ, bête sans image, kadon). Carte : test de `mjLink` (`formImageUrl` posé puis `null`) et du rendu (`formImageUrl ?? imageUrl`). |
| CA20, CA22 | `node tools/build-token-images.mjs --check` ; test de la table : ids existants, un profil dans une seule image, formes sur des clés connues. |
| CA21 | Contrôle manuel : le MJ relit `tools/token-images.csv`. |
| CA23 | `tests/tokenImages.test.mjs` côté carte (table + `catalog.json`) ; `recopier-donnees-communes.mjs --check`. |
| CA24 | Existant côté carte (`tokens.js:242`, `onerror`) : test unitaire ajouté s'il n'y en a pas. |
| CA25 | Test existant d'identité des deux copies du contrat, sinon comparaison ajoutée au test des données communes. |

## Confrontation aux principes

- **Absence = vide** : `tokenLibraryImage` et `beastForm.wind` facultatifs, lus au point de lecture, aucune réécriture des sauvegardes.
- **Seul utilisateur, un seul endroit** : pas de synchronisation de la bibliothèque ; la table est régénérée à la main quand le MJ ajoute des images (`node tools/build-token-images.mjs`).
- **Méthode économe** : appariement par script déterministe ; le jugement (approchés, noms anglais) ne porte que sur le CSV.
- **Publication** : rien n'est poussé avant le feu vert du MJ **et** le versionnement des images. Le travail côté carte reste en commits locaux d'ici là : le test CA23 ferait échouer son déploiement, y compris pour d'autres changements.
- **Bibliothèque du MJ** : lecture seule ; aucun `git add` dans `maps/tokens/`.

## Complexité justifiée

- **Champ `formImageUrl` au contrat** plutôt que réutiliser `imageUrl` : `imageUrl: null` signifie déjà « ne pas toucher » ; restaurer l'image d'un PJ après transformation obligerait la carte à mémoriser l'ancienne. Un champ séparé n'écrase rien.
- **Copie de la table dans la carte** : c'est le seul endroit où l'existence des fichiers peut être vérifiée en CI. Le mécanisme de recopie existe déjà.
- **Module généré `.js`** plutôt que JSON chargé par `fetch` : la table doit être disponible de façon synchrone à l'envoi, et la copie côté carte suit le format de `donnees-communes.js`.
