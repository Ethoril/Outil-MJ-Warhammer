# Constat — images des pions : plafond de 24 Kio et bibliothèque de Map Display

12/11/2026. Constat seul, pas de cadrage : il servira d'entrée au cadrage (Fable). Rien n'a été modifié dans le code.

## Demande du MJ

1. Relier les images de la bibliothèque de pions (`rpg-map-display/maps/tokens/`) aux profils du bestiaire de l'outil.
2. Se libérer du plafond de 24 Kio par image, jugé trop bas.

## État actuel

### Côté outil MJ

- L'image d'un pion est un champ `tokenImage` du **profil** de la réserve : une `data:image/webp|jpeg;base64,…` d'au plus `TOKEN_IMAGE_LIMIT = 24576` caractères ([js/core/models.js:170](../js/core/models.js)). `chooseTokenImage` réduit l'image importée par paliers (256/192/128 px, qualité 0,85 → 0,45) jusqu'à tenir.
- Validation aussi à la relecture d'une sauvegarde ([js/core/sanitize.js:176](../js/core/sanitize.js)). Tests : `tests/unit/combat/liaison-images.test.js`, `tests/liaison-images.browser.mjs`.
- Envoi à la carte : `imageUrlOf: participant => profil.tokenImage` ([js/main.js:1864](../js/main.js)), puis `tokenStateOf` ([js/core/map-link-state.js:115](../js/core/map-link-state.js)) : `imageUrl: null` pour un PJ (Map Display garde son image).
- Les profils du **bestiaire** (`js/data/bestiary/L*.json`, 933 profils) sont des données statiques sans champ image. Une image n'existe qu'une fois le profil copié en réserve et l'image importée à la main.

### Côté Map Display

- Le plafond vient de là : `TOKEN_IMAGE_MAX_BYTES = 24 Kio` ([rpg-map-display/js/core/schema.js:825](../../rpg-map-display/js/core/schema.js)), plus `TOKEN_IMAGE_TOTAL_MAX_BYTES = 512 Kio` cumulés par campagne. Raison : une image `data:` voyage dans les événements et se stocke dans le document Firestore de la campagne (1 Mio max). Voir `docs/CONVENTIONS.md` (« Ne jamais transmettre d'image », exception unique `token.imageUrl`) et `docs/CHANTIER-V-OUTIL-PREPARATION-V2.md` §V-03.
- Le contrat de liaison écrit `imageUrl: data: ≤ 24 Kio ou null` ([CONTRAT-LIAISON-OUTIL-MJ.md:89](../../rpg-map-display/docs/CONTRAT-LIAISON-OUTIL-MJ.md), §6).
- **Mais le code accepte déjà une URL** : le schéma d'un pion admet « URL relative, URL HTTPS ou image embarquée bornée » (`isTokenImageUrl`, schema.js ~1156), et `mjLink.js` recopie `imageUrl` sans filtrer le format (`OWNED_KEYS`). Non testé de bout en bout depuis l'outil.
- La bibliothèque de pions (`maps/tokens/<slug>.webp`, catalogue `maps/tokens/catalog.json`) est référencée **par URL** ; son plafond prévu est ~256 Kio, distinct des 24 Kio (CHANTIER-V §V-03, décision n°3).

## Conclusion

- **Élever le plafond de 24 Kio n'est pas le bon levier.** Avec 512 Kio cumulés par campagne, 24 Kio donnent au plus 21 images distinctes ; 64 Kio n'en donneraient que 8. Toucher au cumul, c'est rapprocher le document Firestore de sa limite de 1 Mio.
- **La voie naturelle : envoyer un chemin** (`maps/tokens/bestiaire/loup.webp`) au lieu des octets. Ni plafond de 24 Kio ni coût Firestore, et les fichiers sont déjà dans le dépôt de la carte.
- L'image embarquée resterait utile pour un PNJ ponctuel sans fichier dans le dépôt.

## Inventaire de la bibliothèque (12/11)

120 images `.webp` dans `rpg-map-display/maps/tokens/`, **non suivies par git** (seul `catalog.json` l'est ; voir mémoire « bibliothèque d'images des pions » : travail en cours du MJ avec Gemini, ne rien commiter ni déplacer sans demande). 98 dépassent 24 Kio.

| Dossier | Nombre | Contenu |
|---|---|---|
| `bestiaire/` | 28 | animaux et montures |
| `bestiaire/forme-bestiale/` | 18 | paires `<bête>-bete` / `<bête>-vie` (formes de transformation) |
| `destriers/` | 7 | destriers nommés (Bohémond, Bretonnie, Empire, Kislev) |
| `ennemis/<famille>/` | 39 | démons, gobelins, hommes-bêtes, morts-vivants, ogres, orcs, réprouvés, rois des tombes, skavens, vampires, vampires pirates |
| `monstres/` | 5 | dragon, géant, griffon, hydre de guerre, troll des rivières |
| `pj/` | 6 | PJ (doublons des fichiers de la racine) |
| racine | 17 | PJ, PNJ de campagne (« fils d'Ulric », Erich, Franz…), quelques créatures (gor, ungor, goblin, hydre…) |

Appariement par nom de fichier normalisé contre `nameFr` / `name` des profils (avant « — » ou « ( ») :

- **26 exacts** : araignée géante, blaireau, chat sauvage, chauve-souris géante, chien, chouette, corbeau, coursier elfique, destrier, grand cerf, loup, loup blanc, poney, rat géant, renard, sanglier, squelette, guerrier du Chaos, gobelin, gor, ungor, dragon, géant, griffon, hydre de guerre, troll des rivières. Plusieurs ont 2 profils (deux livres) : il faudra choisir ou lier les deux.
- **21 approchés**, à valider par le MJ. Justes en apparence : cheval-selle → Cheval de selle, destrier-chaos → Destrier du Chaos, drakenhund → Drakenhund sylvanien, demonette-slaanesh, sanguinaire-khorne, gobelin-chamane → Gobelin des forêts chamane, goule → Goule de crypte, zombi → Zombie, hydre → Hydre de guerre. Faux : ours → Coursier elfique, orc-guerrier → Guerrier du Chaos, faucon → trois faucons différents.
- **73 sans correspondance** : PJ, PNJ, destriers nommés (pas des profils du bestiaire) ; formes bestiales et pigeon/vipère/bœuf ; créatures au nom différent dans les livres (buveur de sang, grand immonde, portepeste, nurglings, horreur, incendiaire, skavens, ogres, vampires, rois des tombes…), à rattraper à la main ou via les noms anglais.

Méthode d'appariement : script jetable (normalisation NFD, minuscules, tirets ; exact puis « tous les mots de plus de 3 lettres contenus »). À refaire de façon déterministe dans le chantier, avec une table validée par le MJ.

## Questions ouvertes pour le cadrage

1. Où vit la table « profil du bestiaire → image » : dans l'outil (données versionnées) ou dans `catalog.json` de Map Display ?
2. Comment l'outil connaît-il la liste des images disponibles (lecture du catalogue publié, copie figée, saisie) ?
3. Le profil de réserve porte-t-il un nouveau champ chemin à côté de `tokenImage`, et lequel l'emporte ?
4. Formes bestiales : une image par forme, choisie selon l'état de transformation ?
5. Amendement du contrat de liaison §6 (URL relative admise) et test de bout en bout côté Map Display.
6. Les images restent non suivies par git tant que le MJ ne les a pas versionnées : un chemin vers un fichier absent de GitHub Pages donnera une image cassée en production.
