# Personnages prêts pour la recette

Mode d'emploi :

1. **Bestiaire** : onglet Bibliothèque, `Bibliothèque de bestiaire`, taper le nom (anglais ou français) et le livre indiqués, **Ajouter au combat** (ou **Copier dans la réserve**).
2. **JSON** : Préparer, Nouveau profil, `Créer depuis un JSON`, coller `docs/recette/profils-recette.json` en entier, **Vérifier le JSON** (aucun point « À vérifier » attendu), **Créer 13 profils**. Groupe « Recette ».
3. **Prêtres, sorciers, Destin, Corruption, talents** : même chemin avec `docs/recette/profils-recette-complets.json` (21 profils : talents et rangs, compétences, sorts, prières, Fortune, Destin, Résilience, Corruption, Péchés). L'aperçu doit afficher ces lignes et aucun point « À vérifier ». **Créer 21 profils**.
   **Arcs (G-ARM-2)** : `docs/recette/profils-recette-arcs.json` (1 profil, l'équipement du catalogue par nom).
4. Recette sur `http://localhost:8765/` si la partie réelle vit sur `127.0.0.1:8765` (stockages séparés).

## Parcours, combattants, où les trouver

B = bestiaire, J = `profils-recette.json` (utilisable maintenant), C = `profils-recette-complets.json` (21 profils, importables), A = `profils-recette-arcs.json`.

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
| G-ARM-2 | arc elfique, arc d'Anirain, arbalète | A : Recette Archer (arc elfique, arc d'Anirain, arbalète du catalogue) ; arbalète : aussi J Armurier |
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

Décompte (84 parcours) : bestiaire seul 10, JSON simple 37, complets 36, arcs (G-ARM-2) 1.
Hypothèses : « vortex à étouffement » (G-DIV-2) et sort persistant à dissiper (G-MAG-5) se posent en séance ; je n'ai pas pu confirmer la Peur de Heomreth sans l'activer.

## Ce que l'import JSON porte (C9, corrigé)

Tout ce qui figurait ici comme « non porté » s'importe maintenant, avec des clés françaises et leurs alias anglais (documentées dans `docs/IMPORT_PROFILS_JSON.md`) : talents et rangs, compétences, Traits et Taille, sorts, prières, Fortune (Chance), Destin, Résilience, Corruption, Péchés, équipement du catalogue par nom. Les données passent par la voie des fiches (`ficheSnapshot` puis synchronisation) ; un nom absent des référentiels est signalé avec le nom le plus proche, une clé inconnue aussi. Le bouton « Copier en JSON » de l'éditeur de profil exporte un profil dans ce format.

Reste hors de l'import : la **monture** (relation entre deux combattants, posée en séance), le **familier** (action de séance), la **Réserve de Canalisation** (`extensions.v5.channelling`) et l'initialisation de la Fortune en séance (G-DES-1, inchangée).
