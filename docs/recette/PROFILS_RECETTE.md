# Personnages prêts pour la recette

Mode d'emploi :

1. **Bestiaire** : onglet Bibliothèque, `Bibliothèque de bestiaire`, taper le nom (anglais ou français) et le livre indiqués, **Ajouter au combat** (ou **Copier dans la réserve**).
2. **JSON** : Préparer, Nouveau profil, `Créer depuis un JSON`, coller `docs/recette/profils-recette.json` en entier, **Vérifier le JSON** (aucun point « À vérifier » attendu), **Créer 13 profils**. Groupe « Recette ».
3. **Prêtres, sorciers, Destin, Corruption, talents** : `profils-recette-complets.json` (21 profils) n'est pas importable en entier tant que l'import ne porte pas leurs clés (voir la dernière section) ; il sert de cas d'essai à la correction.
4. Recette sur `http://localhost:8765/` si la partie réelle vit sur `127.0.0.1:8765` (stockages séparés).

## Parcours, combattants, où les trouver

B = bestiaire, J = `profils-recette.json` (utilisable maintenant), C = `profils-recette-complets.json` (après correction de l'import).

| Parcours | Combattants | Où |
|---|---|---|
| G-BASE-1 à 10 | deux PJ, deux ou trois PNJ, un PJ à lier à une fiche de test | J : Recette PJ Alpha, PJ Beta, Milicien 1 à 3 |
| G-DIV-1 | prêtre de Myrmidia, un allié, deux ennemis | C : Prêtre de Myrmidia ; J : PJ Alpha (allié), Milicien 1 et 2 |
| G-DIV-2 | prêtre de Manann ; vortex d'étouffement posé à la main par le MJ | C : Prêtre de Manann |
| G-DIV-3 | prêtre d'Ulric ou de Taal (Bénédiction de Sauvagerie), cible à blesser | C : Prêtre d'Ulric, Prêtre de Taal ; J : Milicien |
| G-DIV-4 | prêtre de Ranald ou de Myrmidia (Bénédiction de Chance) | C : Prêtre de Ranald, Prêtre de Myrmidia ; J : Milicien |
| G-DIV-5, 6, 11 | prêtre d'Ulric (Morsure du loup, Écraser les faibles, Fureur d'Ulric) | C : Prêtre d'Ulric |
| G-DIV-7, 9, 14 | prêtre de Ranald (Fortune généreuse, Malice de Ranald, Faire monter les enjeux) | C : Prêtre de Ranald ; J : Milicien (adversaire) |
| G-DIV-8 | prêtre de Sigmar et un lanceur de sorts | C : Prêtre de Sigmar, Sorcier du Feu |
| G-DIV-10, 12, 15 | prêtre de Myrmidia, alliés, ennemis Humain | C : Prêtre de Myrmidia ; J : PJ Alpha, PJ Beta, Milicien 1 à 3 (mot-clé Humain) |
| G-DIV-13 | prêtre de Shallya, personnage blessé | C : Prêtre de Shallya ; J : Cobaye (critique infligé en séance) |
| G-DIV-16 | n'importe quel participant | J : Cobaye |
| G-DIV-17 | prêtres d'Ulric (Hurlement du loup), de Taal (Roi de la Nature), de Myrmidia (Œil de l'aigle), de Ranald (Yeux de chat) | C : les quatre prêtres |
| G-DIV-18 | Initiative 50, 20, 35, 60 | J : Tireur (50), Lent (20), Milicien (35), Rapide (60) |
| G-BES-1 | tout profil | B : Ogre (L06) |
| G-BES-2 | Grande, Énorme, Monstrueuse contre un humain | B : Ogre L06, Géant L06, Throgg le roi troll L25 ; J : PJ Alpha |
| G-BES-3 | quatre engagés contre deux | J : PJ Alpha, PJ Beta, Milicien 1 à 3, Lutteur ; B : Ogre, Géant (poids 2 et 3) |
| G-BES-4 | Régénération, têtes | B : Troll L06, Troll des rivières L11 (Grim), Hydre de guerre L09 |
| G-BES-5 | Nuée, Venin, Peur, Terreur | B : Serpents de Sotek L07 (Nuée + Venin), Pieuvre des tourbières L06 (Venin), Squelette L06 (Peur 2), Banshee L06 (Terreur 3) |
| G-BES-6 | mage avec Destin, petit animal allié | C : Maître de familier ; B : Chat L02, Chouette L02 |
| G-INI-1 à 4 | deux PJ, trois PNJ, renfort | J : PJ Alpha + Beta (même Initiative 45, égalité), Milicien 1 à 3 ; C : Combat instinctif |
| G-ATT-1, 3, 4, 7 | un attaquant, une cible | J : PJ Alpha, Milicien, Cobaye |
| G-ATT-2, 5 | tireur, cible engagée, arme Pistolet | J : Tireur (Arc long, Pistolet), Armurier |
| G-ATT-6 | deux armes à une main | J : PJ Alpha (Épée + Dague) ; C : Deux armes |
| G-ARM-1, 3, 4, 5, 6, 7 | une arme par Qualité (Pointue, Imprécise, À répétition, Explosion, Dispersion, Recharge, poudre noire, Taille, Entaille, filet) | J : Armurier |
| G-ARM-2 | arc elfique, arc d'Anirain, arbalète | arbalète : J Armurier ; arcs : **non couvert** (armes du catalogue d'équipement) |
| G-EMP-1, 2 | attaque à mains nues | J : Lutteur |
| G-MON-1 | cavalier et monture active | J : Cavalier ; B : Cheval de guerre lourd L23 |
| G-MON-2 | cavalier, Esquive montée, avec et sans Cavalier émérite | J : Cavalier ; C : Cavalier émérite ; B : Cheval de guerre lourd L23 |
| G-CRI-1, 3, 4, 5 | cible humanoïde robuste ; figurant à peu de PV | J : Cobaye, Figurant |
| G-CRI-2 | quadrupède, araignée | B : Cheval L06, Chien L06, Araignée géante L06 |
| G-CRI-6, 7 | blessé, soigneur avec Chirurgie et Guérison | C : Chirurgien ; J : Cobaye |
| G-DES-1 à 4 | Fortune 3, Destin 2, Résilience 1 | C : Fortune et Destin |
| G-COR-1 à 4 | 8 Points de Corruption, seuil 8 ; Âme pure | C : Corrompu, Âme pure |
| G-MAG-1, 3, 5 | lanceur avec sorts de Durée, second lanceur pour dissiper | C : Sorcier du Feu, Mage des Bêtes |
| G-MAG-2 | Brise-os, Gloutonneur, Dague de l'Art, Déracinement des montagnes | C : Sorcier des Suppléments, Haut Mage |
| G-MAG-4 | Haute Magie, runes des Cadai | C : Haut Mage |
| G-DEC-1 | Peur sans indice | B : Oint druchii L09, Heomreth L11 (Peur est un Trait **facultatif**, à activer sur la fiche), Kurt Helborg L20 |
| G-DEC-2 | Œil de la tempête rang 2, Exténué | C : Mage Œil de la tempête |
| G-DEC-3 | Grim | B : Troll des rivières L11 |
| G-DEC-4 | Perturbant, PJ, allié du Perturbant, neutre | B : Oint druchii L09, Crapaud tache-d'encre L07 ; J : PJ Alpha, Milicien |
| G-DEC-5 | Morsure avec et sans chiffre | B : Horreur des cryptes L10 (Morsure +7), Troll L06 (Morsure imprimée sans Trait chiffré) |
| G-DEC-6 | Domaine des Bêtes, Faux de Shyish contre un mort-vivant | C : Mage des Bêtes, Mage de la Mort ; B : Squelette L06 |
| G-DEC-7 | une fiche, une arme, un sort | B : tout profil ; C : Sorcier du Feu |
| G-DEC-8 | prêtre sans Péché | C : Prêtre d'Ulric |

Décompte (84 parcours) : bestiaire seul 10, JSON utilisable maintenant 37, complets (après correction de l'import) 36, non couvert 1 (G-ARM-2, arcs elfique et d'Anirain).
Hypothèses : « vortex à étouffement » (G-DIV-2) et sort persistant à dissiper (G-MAG-5) se posent en séance ; je n'ai pas pu confirmer la Peur de Heomreth sans l'activer.

## Ce que l'import JSON ne porte pas

`parseProfileJson` (`js/core/json-profile-import.js:21` clés lues, `:31` clés ignorées sans avertissement) signale « champ inconnu » pour toute autre clé, et l'import (`store.js:5018 importParsedProfiles`) ne conserve que ce qu'il a lu ; `extensions` n'est gardé que s'il contient `fiche` ou `ficheId` (`json-profile-import.js:331`).

**Déjà accepté, sans être documenté** : les clés **anglaises** `skills`, `talents`, `equipment`, `spells`, `prayers`, `race`, `movement`, `protection`, `ficheSnapshot`, `armorLocations` (`models.js:132`, boucle `json-profile-import.js:324`) sont copiées telles quelles, sans contrôle, dans les formes internes ci-dessous. Vérifié : un prêtre importé ainsi arrive en combat avec ses talents et prières. Le format documenté et les clés françaises n'existent pas pour elles.

| Élément | Où l'outil le stocke | Exemple de valeur | Clé française proposée | Parcours |
|---|---|---|---|---|
| Talents et rangs | `talents[]` du profil et du participant (`models.js:132`) : `{ id, status:'resolved', rank, specialization }` ; rang = acquisitions répétées (`reference-catalog.js:83` `aggregateTalents`) | `{ "id":"talent-eye-of-the-storm", "status":"resolved", "rank":2 }` ; `{ "id":"talent-bless", "specialization":"Ulric", "rank":1 }` | `talents: [{ nom, specialisation, rang }]` | DIV 1-15, 17 ; INI-2 ; ATT-6 ; MON-2 ; CRI-7 ; COR-2 ; MAG ; DEC-2 |
| Compétences | `skills[]` (`models.js:132`) : `{ id, name, carac, total, advances, status }`, `total` = caractéristique + avances | `{ "id":"skill-50_72_69_e8_72_65-base", "name":"Prière", "total":80, "status":"resolved" }` | `competences: [{ nom, avances }]` (total calculé par `ficheSnapshot`, `fiche-sync.js:67`) | DIV, MAG, CRI-6, 7, MON |
| Sorts | `spells[]` : `{ nom }` du catalogue de Magie (`v5-spell-contracts.js:932` lit `s.nom`) | `{ "nom":"Brise-os" }` | `sorts: ["Brise-os"]` | MAG, DEC-6, DIV-8 |
| Prières et miracles | `prayers[]` : `{ nom }` = `catalogueName` du contrat (`v5-divine-access.js:93`, fonction `resolveDivineAccess` à `:83`) | `{ "nom":"Morsure du loup" }` | `prieres: ["Morsure du loup"]` | DIV 1-15, 17 ; DEC-8 |
| Trait de créature (Taille, Grim, Peur…) | `traits[]` de la fiche (`models.js:194` profil, `:227` participant) ; la Taille est lue par `creature-size.js:39` (`parseSizeTrait`) | `"Taille (Grande)"`, `"Grim"`, `"Peur (2)"` | `traits: ["Taille (Grande)"]` | BES-2, 3 ; DEC-1, 3, 5 pour des créatures sur mesure |
| Fortune (Chance) | `extensions.v5.fortune` ; miroir `fortune` (`models.js:243`) ; initialisée depuis la fiche par `snapshot.resources` (`fiche-sync.js:142`) | `3` | `fortune: 3` | DES-1, 2 |
| Destin | `extensions.v5.fate` canonique (`v5-resources.js:149-151`, `models.js:257`) ; importé de la fiche par `fiche-sync.js:145` | `2` | `destin: 2` | DES-3, 4 ; BES-6 |
| Résilience | `extensions.v5.resilience` (`fiche-sync.js:146`) | `1` | `resilience: 1` | DES, BES-6 |
| Corruption | `extensions.v5.corruptionPoints` (`v5-resources.js:213`) | `8` | `corruption: 8` | COR-1 à 4 |
| Péchés (cultes) | `extensions.v5.divine.sin` (`v5-divine-access.js:72`) | `0` | `peches: 0` | DEC-8, DIV |
| Réserve de Canalisation | `extensions.v5.channelling` ; miroir `channelling` (`models.js:271`) | `{ "type":"winds", "sl":2 }` | `canalisation: { type, sl }` | MAG-3 (optionnel) |
| Équipement du catalogue (armes, armures, boucliers) | `equipment[]` (`models.js:132`) : objets du catalogue d'équipement (`reference-catalog.js`), qui donnent aussi les PA par zone (`armorLocations`) | `{ "id":"weapon-…", "kind":"weapon", "name":"…" }` | `equipement: ["Arbalète (2M)"]` (par nom du catalogue) | ARM-2 (arcs), ATT-2, ARM-1 à 7 avec les vraies armes |
| Monture | `extensions.v5.mounted` et `extensions.v5.mountId` du **participant** (`store.js:5023` `setMountedState`) : ne se décrit pas sur un profil, il désigne un autre participant | `{ "mounted":true, "mountId":"<id du participant>" }` | non applicable au profil ; éventuellement `monture: "Cheval de guerre lourd"` appliqué à l'entrée en combat | MON-1, 2 |
| Familier | `extensions.v5.familiarLinks[]` (maître) et `familiarOf` (familier) (`familiars.js:4`) | `{ "system":"animal", … }` | à garder en action de séance | BES-6 |
| Mots-clés, armure, jets, Qualités des jets | déjà portés (`keywords`, `armure`, `jets`) | — | — | — |

Les clés françaises sont des propositions ; `profils-recette-complets.json` les emploie toutes (21 profils : 7 prêtres, 7 lanceurs de sorts, 7 PJ à talents ou ressources). Le script de vérification (`E:/tmp-node/check-profils-recette.mjs`) les traduit par le chemin de la synchronisation des fiches (`ficheSnapshot`, `applyFicheSync`) et contrôle dans un Store neuf que chaque prière est accessible par la fiche et que les talents, sorts, Fortune et Destin arrivent sur le participant : c'est le résultat que l'import corrigé devra produire.
