# Passation T4 (F2) — 28/10/2026, Claude Team → compte Pro

## Où en est-on

Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`. Rien n'est poussé ni publié ; ne pas toucher à la version ni à `sw.js` sans feu vert du MJ.

GPT s'est arrêté pendant T4, faute de tokens. Son rapport : `docs/plans-gpt/PASSATION_ARRET_T4_28_10.md` dans le worktree (non suivi). Claude a ensuite séparé l'arbre mixte F/H, non committé, en trois commits :

- `6e733b6` fix(f2-f) — corrections de la contre-revue F : Test Warp Blade réel (score + d100, +2 DR) avec champs score/jet dans le panneau à la place du choix Réussite/Échec ; exposition quotidienne K1 depuis l'attaque Warpstone Shard* du Rat Ogre Bonebreaker (L22) ; exposition sur critique seulement si le coup inflige des Blessures ; Tiger Claws trouvé par `sourceName` et noms accentués.
- `00d98bb` test(f2-f) — le parcours navigateur `tests/f2-f-review-browser.mjs` bouclait sur `nextTurn` depuis l'ajout du Bonebreaker. Corrigé, le parcours est vert.
- `7fe358a` feat(f2-h) — tout le travail H de GPT, **non revu**.

Vérifié par Claude : F seul (worktree détaché sur `00d98bb`) donne 39/39 tests F et un parcours navigateur F vert ; l'arbre complet donne 54/54 tests F+H ciblés. Suite complète après `7fe358a` : 5 320/5 322. Le test B1 (comptage des actions de profil) échouait à cause des actions spéciales H ; il est corrigé en `e2b244d`. Reste seulement `tests/sw.test.js` (22 modules hors précache, attendu avant publication).

Gantelet à pointes : le livre (L13 p.94, table Brawling) donne *+SB+3, Impale, Unbalanced*. La feuille (Empaleuse, Déséquilibrée) est juste ; c'est la note de contre-vérification T3 de Claude (« sans Empaleuse ») qui était fausse. Rien à changer.

## Reste à faire, dans l'ordre

1. **Contre-revue F** (Sonnet, contexte neuf, PDF L22/Imperial Zoo/Horned Rat) sur `bc2e1c1..00d98bb` et sur les commits F antérieurs. Les limites F déjà connues sont dans le rapport GPT (bois tombé, pavois porté Lente/Épuisante, agrégat de charge du Léviathan, saisies MJ de distance et de direction). Le parcours navigateur ne couvre pas encore les champs Warp Blade : l'ajouter.
2. **Revue H : les 5 écarts graves sont corrigés par Claude le 28/10** (ea2c9fd E1 armure métal, 3983327 E2 Force 59/45, e273a10 E3 pas de dégâts pour Immersion/Lasso/Crachat, b863357 E4a coût d'Élan, fd9892d E4b Exténué), avec un test par écart ; suite complète 5 326/5 327 (sw.js seul). Les décisions du MJ sont ensuite codées par Claude : dd48280 BF pour BI/BFM (E10), bb4ac77 Tueur de champions une fois par duel avec réarmement MJ (E11), 597c7cf Coup mortel (déclenchement sur toute frappe de mêlée réussie, plafond BCC affiché ; l'attaque suivante reste une nouvelle résolution, le nombre de chaînes n'est pas suivi), 7002cce Suffocation (fin de Round : 1 Blessure, Inconscient à 0, mort proposée après BE Rounds). Écarts moyens corrigés ensuite par Claude : 79aff92 E12 (Grüber reste rattaché au nom, aucun profil au bestiaire ; E0-P-569 est un Sorcier générique, le constat du vérificateur était faux), a8ea554 E8, 549b675 E9, 3bf84ac E5 lasso et E6 (Esquive réelle, pas de jet ni de maladresse), 06290e8 E7 crâne à 0 Blessure, 1a8d6dc E7 soie coupée (méthode de récupération « cut-silk »), et 3861980 E5 décharge (sans jet ni défense, 10 plats). **Restent** les écarts faibles E13 (libellés V4 −10/+20/+10 à passer en DR), E14 (crâne Death-ier E0-P-567), E15-E17, le suivi des chaînes de Coup mortel, Seconde revue H faite le 28/10 : **favorable avec réserves**, M5 corrigé (c158500) ; M1-M4 corrigés ensuite par Claude (25d25d0 M1 immunité de profil lue par isV5ConditionImmune, b158ed1 M2+M3 Suffocation, d424ce8 M4 casterCaracs pour tous les lecteurs magiques ; suite complète 5 343/5 344, sw.js seul) ; faibles corrigés ensuite (a71955a F2+F8 libellés DR et page V5, 5a597c8 F6, d030eec F7, cccefb0 F1, ff25538 F3, 7ac1333 F9, bac6ce3 F10+F5 ; suite complète 5 348/5 349, sw.js seul) ; 6cbd3cb F4 : règle du crâne étendue à E0-P-567 et E0-P-758, transformation appliquée par le Store après confirmation du MJ (décision du 28/10). Tous les écarts H des deux revues sont traités ; reste à tester l'interface H dans un navigateur, puis une dernière revue H rapide avant clôture ; détails à la fin de . Interface H jamais testée dans un navigateur : à faire après M1-M4. 2. **Revue H faite le 28/10, verdict défavorable** : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_T4_H.md` dans le worktree. Corriger E1-E12, appliquer les 5 décisions du MJ du 28/10 (fin du rapport et `tmp/f1-reperage/ARBITRAGES_25_10.md`), puis relancer une revue indépendante. Notes de l'ancienne consigne, pour mémoire : revue H contre les PDF (L11, L18, L22, L23, L25 ; 13 règles et 17 sous-clauses, vrais profils, cas négatifs). Écart déjà connu : la décharge du Gargantuan qui ignore l'armure métallique non magique n'est **pas appliquée** par `resolution.js` (seulement portée par le plan) ; seules les clauses navales ont le droit de rester des rappels. Autres points à contrôler : l'Immersion de l'élémentaire de mer pose Enchevêtré + Suffocation sur tout coup réussi (à confronter à la condition « Grapple réussi ») ; les dégâts imprimés 10/6 de la décharge (BF ajouté ou non) ; le libellé d'immunité codé en dur dans `resolution.js` (« Résistance au feu de l'élémentaire de mer »).
3. **J1** (commits `a509a5d`, `c6f27b6`, `1bdb465`), revue défavorable à reprendre :
   - les incidents doivent naître d'une occurrence `criticalAftermath`, pas être créés arbitrairement ;
   - soins et Tests doivent passer par des compétences et des jets réels, pas par des chiffres ou des booléens libres ;
   - le saut de plusieurs jours est bloqué à tort si une infection survient avant le dernier jour (`unexpected-daily-test`).

   `v5-game-time.js` et `v5-campaign-time.js` restent intacts.
4. **J2** non commencé (séquelles, étapes de guérison, malus permanents ; amputations à confirmer par le MJ ; migration, Undo/Redo, réimport). Conception : `docs/plans-gpt/f2/CONCEPTION_SEQUELLES.md`.
5. **Clôture F2** : rapports de tranche et de phase, liste des nouveaux modules (dont `v5-aftermath.js`, `v5-aftermath-panel.js`, `f2-h-profile-abilities.js`), suite complète (TEMP/TMP sur E:), `node tools/run-divine-recipe.mjs`, parcours navigateur F2, puis contre-vérification finale Claude et feu vert MJ avant version et `sw.js`.

## Ménage

Le worktree temporaire `E:/tmp-f-check`, détaché, contient une jonction `node_modules` vers le worktree GPT. Le supprimer avec `git worktree remove --force E:/tmp-f-check`, après avoir retiré la jonction (`cmd /c rmdir E:\tmp-f-check\node_modules`) pour ne pas effacer le `node_modules` réel.

## État au 29/10 après-midi — F et H clos, reprendre à J1

HEAD `e987056` sur `gpt/phase-f2`, arbre propre. Suite complète 5 355/5 356 (sw.js seul) ; `tests/f2-f-*` et `tests/f2-h-*` 88/88 ; parcours navigateur F et H verts.

- `a87d569` : le parcours H échouait parce que le test cliquait « Héros H » dans la liste des combattants (le héros devenait acteur) ; il cible désormais le groupe « Adversaires ». L'interface n'avait rien.
- Dernière revue H (Sonnet) : favorable avec réserves. Corrigé en `abb8ad2` : M4 complété (interruption de canalisation, BFM de maladresse du Store, effets et surpuissance des sorts, épuisement Haute Magie lisent `casterCaracs`), `castsWithStrength` par `profileId` aussi, Blessures du critique comptées pour le crâne à 0, Suffocation sans effet sous bénédiction de Souffle. Le constat « erreur acteur invalide masquée » était faux (sans acteur la résolution plante de toute façon) : rien changé.
- Contre-revue F (Sonnet, PDF) : favorable avec réserves. Corrigé en `04348a5` : critique d'excédent expose à la malepierre (L22 p.32), Test de la Warp Blade en mêlée seulement (L11 p.94), score de Résistance au-delà de 100 accepté, réponses Warp Blade et `f2h` oubliées après chaque attaque et au changement de cible (la confirmation du crâne ne passe plus à la cible suivante). `e987056` : parcours F avec les champs Warp Blade.
- Restent volontairement ouverts (faibles) : Immersion terminée alors qu'un autre Enchevêtré subsiste (Suffocation gardée, retrait MJ), camouflage des Griffes du tigre toujours enregistré (le livre dit « can »), rappel du Coup mortel sans « jamais la même cible deux fois » ni compteur de chaîne, précache `sw.js` (dont `js/data/f2-h-profile-abilities.js`) à faire avec la version.
- Ménage `E:/tmp-f-check` non fait (commande refusée par le classificateur) : à faire par le MJ, voir « Ménage ».

Suite : J1, J2, puis clôture de F2 (points 3 à 5).

## Arrêt de Claude à 98 % du quota (29/10 matin) — traité, voir ci-dessus

HEAD `2da9a76` sur `gpt/phase-f2`, arbre propre (hors `docs/plans-gpt/PASSATION_ARRET_T4_28_10.md`, non suivi). Tous les écarts des deux revues H sont corrigés et testés : `tests/f2-h-*.test.js` 43/43 ; suite complète 5 349/5 350 à `6cbd3cb` (sw.js seul).

**À reprendre en premier : le parcours navigateur H** `node tests/f2-h-review-browser.mjs` (TEMP/TMP sur E:) échoue. La section « Règles propres au profil » s'affiche avec ses rappels mais **sans aucune case**. Pourtant, une trace temporaire posée juste avant `if (f2hActorId === 'E0-P-910')` (`js/ui/resolution-panel.js`, vers la ligne 1560) a montré `f2hActorId = E0-P-910`, `target = null` et `action = Razor-sharp Teeth`. Pistes :
- le rendu affiché n'est peut-être pas celui de la trace ;
- `action` n'a pas de déclaration locale visible dans `renderResolutionPanel` près du bloc f2h : vérifier qu'il s'agit bien de l'action choisie ;
- dans le test, le clic sur la puce « Décharge électrique » puis sur la cible « Héros H » ne semble pas avoir pris.

Corriger, faire passer le parcours (Gargantuan, crâne, Lasso), puis lancer une dernière revue H rapide. Deux correctifs d'interface sont déjà committés en `2da9a76` : la section reste ouverte d'un rendu à l'autre, et `action?.extensions` est protégé.

Ensuite : contre-revue F (point 1 ci-dessus), J1, J2, puis clôture de F2.
