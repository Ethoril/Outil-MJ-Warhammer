# Retours de vérification du lot 2 (Arcanes, mineurs) — à traiter en premier dans le lot 3

12 octobre 2026. Vérification Claude sur une copie : `node --test` 1 551/1 551, six recettes navigateur vertes, générations et preuves reproductibles, matrice 109/144/24 confirmée, catalogue inchangé. **Aucune erreur de règle sur les 48 sorts** (NI, portée, cible, durée et valeurs conformes aux pp. 240-245 ; tableau p. 301 exact). Retours du lot 1 résolus, sauf le classement « données MJ » et le Linceul (ci-dessous).

## Défauts confirmés

1. **D1 (moyenne) — dés de Protection multiples impossibles à taper au clavier** : `js/ui/v5-spell-options.js:157` (et `:145` pour Sang corrosif) redessine le champ à chaque frappe depuis la valeur analysée et supprime l'espace : « 1 5 » devient « 15 » (Mur de Feu à 2 Protections, vraie `workspace-view`). Garder la chaîne brute dans le brouillon, n'analyser qu'au calcul. La recette passe parce qu'elle utilise `fill` : ajoute un geste au clavier (`type`/`press`).
2. **D2 (moyenne à basse) — Arme aethyrique en double dans les actions** : après application, « Lance aethyrique · 55 » et « Lance aethyrique · 50 » (la seconde au score de CC). `js/core/v5-magic-effects.js:656` copie l'action dans `participant.actions` et `js/core/v5-magic-combat.js:8` (`magicGrantedActions`) la projette de nouveau. Une seule action, au bon score. Afficher aussi le profil p. 301 choisi dans l'aperçu et l'avertissement « lance sans Charge / à une main ».
3. **D3 (moyenne) — classement « données MJ » encore injustifié** : `computeCoverageCategory` (`tools/build-v5-spell-contracts.mjs` ~l.2347) classe en données MJ sur la seule déclaration `treatment === 'mjInput'` / `effects.mjInput`. Avec seulement les dés, l'aperçu est déjà prêt pour Bouclier anti-flèches, Dôme, Téléportation, Tendre l'oreille, Lumière, Flamme magique, Feux follets, Bruits, et Attaques en chaîne à une cible ; au lot 1, 23 des 34 « données MJ » se calculent sans fait. **Règle** : « données MJ » seulement si l'aperçu est bloqué tant qu'un fait manque ; calcule la catégorie à partir d'une sonde (aperçu sans faits → bloqué ?), pas d'une déclaration. Supprime les cases de pure confirmation qui ne conditionnent aucun calcul (Poussée `collisionDeclared`, Perturbant `nearbyDeclared`). Arme aethyrique : lire le score de Corps à corps sur la fiche du lanceur au lieu de l'exiger en saisie (saisie seulement s'il manque). Recalcule la matrice et signale les nouveaux comptages.
4. **D4 (basse à moyenne) — Linceul d'Invisibilité** : l'effet ne prend fin que sur un sort à dégâts ou un projectile (`js/core/store.js:2602`) ; la page dit « attacking someone » : Choc, Éblouissant, Enchevêtrement, Sommeil, Chute et toute action offensive contre quelqu'un doivent aussi y mettre fin.
5. **Poussée** : surpuissance « zone » offerte alors que la zone est « maximum » : la retirer. UI : la cible par défaut est le lanceur (invalide) ; la liste des collisions propose la cible repoussée elle-même : corriger les deux.
6. **Souffle froid** : la clause « frappe en dernier » est mesurable (`js/core/turn-order.js`, `initiativeOrder`) : l'appliquer si l'ordre du Round suivant le permet, sinon garder le rappel en l'expliquant. Le « +1 DR à la défense adverse » est calculé : le rapport doit le dire.
7. **Chaîne** : afficher pourquoi un rebond n'a pas lieu (Blessures ≤ BE précédent, distance, limite).

## Tests trop lâches (mutations restées vertes)

Les tests restent verts si l'on change : le seuil d'égalité de la Chaîne (Blessures = BE), la limite BFM de rebonds, le +1 DR de défense du Souffle froid, la quantité de Source (regex `/pinte.*2|2.*pinte/`), la distance limite d'un rebond. Ajoute des assertions exactes pour chacun.

## À noter, sans correction de règle

- **Souffle** : un Test de CT raté touche si l'Esquive est pire (égalité au tireur). C'est la règle des Tests opposés V5 (p. 131) : conforme ; ajoute un test qui le documente.
- **Rapport** : le tableau des contradictions du catalogue omet Conservation (cible 1 → Spécial), Pas léger (FM minutes → Agilité minutes), Protection contre la pluie (BE heures → BFM heures) : à ajouter (ils seront repris à la fin des lots).
- **Pré-existant (D7)** : après Undo d'un sort à couche puis rechargement, le miroir `extensions.spellEffects` diffère entre l'état vivant et l'état rechargé (reproduit avec un `applySpellEffects` générique). À corriger si c'est dans ton périmètre de fichiers ; sinon décris le correctif.
