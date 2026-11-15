# Illustrations à créer

Fichier généré, ne pas modifier à la main. Régénérer après l’ajout d’images ou un changement du classement : `node tools/build-token-images.mjs` puis `node tools/list-missing-token-images.mjs`.

Sources : le bestiaire (`js/data/bestiary/`), la table des images (`js/data/token-images.js`, depuis `tools/token-images.csv`) et le classement relu par le MJ (`tools/token-images-categories.csv`). Une créature présente dans plusieurs livres n’y figure qu’une fois. Le nom de fichier proposé, déposé dans `rpg-map-display/maps/tokens/`, est celui que l’appariement exact retrouvera (nom français sans accents). Les gabarits (Soldat, Tirailleur…) ne sont pas des créatures et n’y figurent pas.

## Récapitulatif

| Dossier | Illustrations | Profils couverts |
| --- | ---: | ---: |
| `bestiaire` | 1 | 1 |
| `ennemis/vampires` | 2 | 2 |
| Individus nommés (`pnj/<livre>`, `pj`) | 0 | 0 |
| `bestiaire/forme-bestiale` | 0 | — |
| `monstres/transformation-kadon` | 9 | — |
| **Total** | **12** | **3** |

## Créatures génériques

### `bestiaire` (1)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `bestiaire/gris-montagne-faucon.webp` | Gris montagne faucon | Grey Mountain Hawk | L11 p.63 | 1 | image à créer (faucon.webp ne le couvre plus, décision du MJ du 15/11) |

### `ennemis/vampires` (2)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/vampires/vampire.webp` | Vampire | Vampire | L06 p.343 | 1 | image à créer (von Carstein ou vampire générique, décision du MJ du 15/11) |
| `ennemis/vampires/vampire-noble.webp` | Vampire noble | Vampire Noble | L26 p.21 | 1 | image à créer (von Carstein ou vampire générique, décision du MJ du 15/11) |

## Individus nommés

PNJ de scénario, monstres uniques et PJ prétirés, par livre de première apparition.

## `bestiaire/forme-bestiale`

Bêtes de la Forme bestiale (Livre de base pp. 325-327) sans image dans l’une des deux variantes : `-bete` pour le Vent des Bêtes, `-vie` pour le Vent de Jade.

Aucune : chaque bête a ses deux images.

## `monstres/transformation-kadon`

Monstres de la Transformation de Kadon (Livre de base pp. 328-335) sans image dédiée. Le pion ne change pas sous cette transformation tant que ces images n’existent pas (hors périmètre du chantier).

| Fichier proposé | Monstre | Clé | Page |
| --- | --- | --- | ---: |
| `monstres/transformation-kadon/pieuvre-des-marais.webp` | Pieuvre des marais | bog-octopus | 328 |
| `monstres/transformation-kadon/demi-griffon.webp` | Demi-griffon | demigryph | 329 |
| `monstres/transformation-kadon/dragon.webp` | Dragon | dragon | 330 |
| `monstres/transformation-kadon/bete-des-fanges.webp` | Bête des fanges | fenbeast | 331 |
| `monstres/transformation-kadon/geant.webp` | Géant | giant | 332 |
| `monstres/transformation-kadon/griffon.webp` | Griffon | griffon | 332 |
| `monstres/transformation-kadon/manticore.webp` | Manticore | manticore | 333 |
| `monstres/transformation-kadon/pegase.webp` | Pégase | pegasus | 334 |
| `monstres/transformation-kadon/troll.webp` | Troll | troll | 335 |
