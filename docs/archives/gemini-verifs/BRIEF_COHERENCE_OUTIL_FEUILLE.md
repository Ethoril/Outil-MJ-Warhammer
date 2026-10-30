# Brief — passe de cohérence outil ↔ feuille ↔ fiches, 28/10/2026

Exécutant : Gemini (ou une autre instance). Contre-vérification : Claude. **Lecture seule partout** : le livrable est un rapport.

## But

Trois sources doivent dire la même chose sur les armes, les armures, les mots-clés, les talents, les compétences et les espèces :
1. la feuille Google **« Aides de jeu »** du MJ : **elle fait foi** ;
2. le catalogue du site des fiches (dépôt `E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4`, branche `gemini/armes-v5`) : `js/data/equipment-catalog.json`, `js/data/fiche-catalog.json`, `js/data/skills.json`, `js/data/careers.json` ;
3. l'Outil MJ (dépôt `E:/Outil MJ Warhammer`, branche `gpt/phase-f2`) : `js/data/reference-snapshot.json` (`equipment`, `talents`, `additionalSkills`) et les tables d'espèces de `js/core/fiche-sync.js`.

Tu listes tous les écarts et tu les classes. Tu ne corriges rien.

## Règles de sécurité (impératives)

- **Feuille Google : lecture seule, uniquement par l'export CSV** (`https://docs.google.com/spreadsheets/d/1SCnAJCthdto7ROjovuyDYmz4y9GJBBLfThuYNmYR_Cs/gviz/tq?tqx=out:csv&headers=1&sheet=<onglet>`, comme `tools/refresh-equipment-catalog.mjs` du dépôt des fiches). Jamais d'écriture, jamais d'« Importer » : un import a déjà effacé tout le classeur une fois.
- Dépôts : worktrees détachés à toi, **jamais les worktrees en cours de GPT** (`tmp/gpt-phase-f2-worktree`, `tmp/gpt-especes-worktree`).
  - Outil : `git -C "E:/Outil MJ Warhammer" worktree add --detach "E:/Outil MJ Warhammer/tmp/coherence-outil" gpt/phase-f2`.
  - Fiches : `git -C "E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4" worktree add --detach "E:/Projet Warhammer Ennemi Intérieur/tmp/coherence-fiches" gemini/armes-v5`.
  - Pas de `git stash`, aucun commit.
- Ne lance jamais `generate-reference-catalog.mjs` ni `refresh-equipment-catalog.mjs` sans `--source-dir` vers tes propres CSV téléchargés : ils écrivent dans le dépôt. Le plus simple est d'écrire tes propres scripts de comparaison dans `E:/Outil MJ Warhammer/tmp/gemini-verifs/coherence/`.

## Comparaisons

1. **Armes et armures**, objet par objet :
   - nom, catégorie, groupe, Dégâts, allonge ou portée, mains, PA, localisations, Encombrement, prix, disponibilité ;
   - mots-clés et leurs paramètres (astérisques compris), notes de Discrétion et de Perception.
   
   Signale les objets présents dans une source et absents d'une autre.
2. **Mots-clés** : onglet « Mots Clés Armes et Armures » (identifiant, effet, paramètre, version retenue) contre les mots-clés connus de l'outil (`js/data/keyword-engines.js`, `keywordMechanicalStatus`). Pour chaque mot-clé de la feuille, l'outil a-t-il un moteur ou un statut, et sous le même identifiant ? (Exemple de piège déjà rencontré : Pointue V5 contre Précise V4.)
3. **Talents et compétences** : noms, identifiants, caractéristiques, maximum de rangs, spécialités, entre la feuille (onglets talents et compétences), les fiches et l'outil.
4. **Espèces** : Mouvement et formule des Blessures de chaque espèce dans les fiches et dans l'outil, contre les décisions du MJ du 26/10 :
   - Halfling M 3, Blessures V5 avec BF ;
   - Ogre Blessures ×2 ;
   - Gnome : Petit, M 3, Blessures 2×BE + BFM ;
   - Elfe noir M 5, Elfe des mers M 5, Skink M 6 ;
   - espèce inconnue signalée.
   
   Ces corrections sont en cours dans l'outil (branche `gpt/especes`) : indique si l'écart est couvert par ce lot.
5. **Carrières** : seulement les talents et compétences qu'elles citent et qui n'existeraient pas dans l'outil ou les fiches.

## Écarts connus et voulus (à classer « voulu », pas « défaut »)

- La magie est hors périmètre : trois sorts ont été retirés exprès de l'outil (décision D-21). Ne compare pas la magie.
- Poivrière « À répétition 4* » : l'astérisque est gardé dans l'outil, alors qu'il n'est pas dans le JSON des fiches.
- Javelot Blackbriar : sans Inflige dans l'outil (décision du MJ).
- Objets V4 conservés exprès : Fléchette, Arc elfique, Plastron de cuir bouilli, Cape. Les mots-clés V4 (Perturbante, Lente, Épuisante, Précise, Percutante, Immobilisante, Protectrice) sont gardés pour les anciens exemplaires.
- Les empreintes (hash) des CSV de l'outil sont celles de l'export Google en direct.

Vérifie aussi `E:/Outil MJ Warhammer/tmp/gemini-verifs/VERIFICATION_ARMES_V5.md` : les 24 lignes « à arbitrer » sur les armes de suppléments sont encore ouvertes chez le MJ. Ne les tranche pas, rattache-y tes écarts.

## Livrable

`E:/Outil MJ Warhammer/tmp/gemini-verifs/RAPPORT_COHERENCE_OUTIL_FEUILLE.md` :
- un résumé chiffré par source et par catégorie ;
- un tableau des écarts : objet, champ, valeur dans la feuille, dans les fiches et dans l'outil, classe (« défaut outil », « défaut fiches », « feuille à vérifier par le MJ », « voulu »), et proposition d'action ;
- les commandes et empreintes des CSV utilisés, pour que Claude puisse refaire la comparaison.

Ensuite, arrêt : Claude contre-vérifie et décide avec le MJ des corrections à faire.
