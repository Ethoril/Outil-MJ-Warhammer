# Passation — arrêt demandé pendant T4, 28 octobre 2026

## État et consigne de reprise

Arrêt explicite du MJ : ne pas poursuivre automatiquement, ne pas publier. Worktree `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`, branche `gpt/phase-f2`, HEAD `bc2e1c1` au moment de l'arrêt. Vérifier `git status` avant de reprendre. Aucun push, fusion de publication, bump de version ou changement de `sw.js` n'a été réalisé. Les trois agents actifs ont été interrompus. Les modifications non committées ci-dessous doivent être conservées : elles mélangent des travaux F et H, notamment dans les fichiers communs. Ne pas les écraser, ne pas committer tout l'arbre en bloc.

## Reprise après T3

Référentiel, corrections K1/L/G/M et réexamen des 21 règles D repris et documentés dans `docs/plans-gpt/RAPPORT_REPRISE_T3_AVANT_T4.md` et `docs/plans-gpt/f2/REPRISE_T2_BIS_AUDIT.md`. Suite complète à cet état : 5 255/5 256 ; seul `tests/sw.test.js` échouait, faute de précache. Les corrections ont été revues indépendamment après plusieurs itérations. Le parcours navigateur de deux Tests de Chevaucher simultanés a été validé. Les six nouveaux talents sont en attente de vérification, sans effet supposé. L'arme Gantelet à pointes porte Empaleuse dans la source fiches `d8a30dd`, contrairement au texte du brief : la feuille fait foi ; signaler la contradiction au MJ.

## T4-F : en cours, non validé

Commits F jusqu'à `ddf8253`, puis test de contre-revue `bc2e1c1`. Les premières corrections ont reçu une revue défavorable : vrais noms manquants, Lame de malepierre et profils réels. `6c5035d` et suivants ont corrigé une partie ; la contre-revue suivante reste défavorable : Test Warp Blade doit être un vrai Test +2 DR (conversion MJ V4), déclaration quotidienne K1 doit accepter l'attaque Warpstone Shard* du vrai Rat Ogre Bonebreaker, pas seulement un objet d'inventaire ; un critique sans Blessure ne doit pas déclencher l'exposition. L'agent F a ajouté ces corrections dans l'arbre non committé, sans les livrer : tests unitaires annoncés 13/13 et parcours Edge K1 Rat Ogre annoncé vert ; l'UI du Test Warp Blade attendait la libération des fichiers de résolution H. Un test Store du vrai profil Tiger Claws a révélé un problème d'accents / sourceName ; H indique l'avoir corrigé dans son diff, à vérifier ensemble. Ne pas considérer F terminé ni ces résultats comme une contre-vérification.

Limites précédemment relevées : bois tombé antler anti-bris seulement rappel faute de mécanisme général de bris ; Lente/Épuisante V4 du pavois porté non raccordées ; encombrement Léviathan calculé par pièce et affiché, sans agrégat de charge ; défense pavois planté complète à rejouer ; distance et direction saisies MJ. Feuille et profils catalogue ne doivent pas être modifiés. Attention à ne pas confondre Warp Blade Imperial Zoo et Warpstone/Warpforged Horned Rat. +20 % V4 Ratling devient +2 DR selon arbitrage MJ, pas +20 au score.

La suite complète `E:/Outil MJ Warhammer/tmp/f2-t4-f-suite.log` a donné 5 281/5 282, seul `sw.test.js`, mais elle précède les modifications F/H non committées et ne prouve pas les routes réelles manquantes identifiées par la revue.

## T4-H : en cours, non committé, non revu

`c1a800d` caractérise des profils, `3adbee4` ajoute un catalogue/plan H. L'agent H a depuis modifié les fichiers de résolution et de données listés ci-dessous ; il annonçait 15/15 tests ciblés et prévoyait un commit lorsqu'il a été interrompu. Ces résultats n'ont pas été vérifiés par l'exécutant ni par un second Luna. Les exceptions d'armure métallique de la décharge Gargantuan et clauses navales étaient décrites comme rappels ; seules les clauses navales sont explicitement autorisées en rappel. Ne pas annoncer le lot complet. Vérifier les 13 règles/17 sous-clauses, vrais profils, effets appliqués et cas négatifs, y compris Tiger Claws, puis relecture indépendante sur les PDF et navigateur. F attend `resolution.js` et `resolution-panel.js` : coordonner les hunks avant toute correction ou commit.

## T4-J1 : committé, revue défavorable en cours

`a509a5d` module pur, `c6f27b6` caractérisation, `1bdb465` intégration Store/UI. 11/11 tests ciblés annoncés. La revue indépendante a constaté : registre et UI créent des incidents arbitraires sans lien à une occurrence `criticalAftermath`, contrairement à la conception validée ; soins/Tests utilisent des résultats numériques ou booléens saisis librement plutôt que des compétences et jets effectifs ; saut de plusieurs jours bloqué à tort si une infection survient avant la dernière journée, car les Tests suivants deviennent `unexpected-daily-test`. Ces constats doivent être reproduits et corrigés ; revue PDF/UI inachevée. Le lien critique et les malus d'amputation confirmée doivent être garantis au plus tard en J2, sans déduire des événements d'un rappel. `v5-game-time.js` et `v5-campaign-time.js` doivent rester intacts. J2 n'a pas commencé.

## État non committé exact à l'arrêt

Aucun fichier indexé. Modifiés :

- `js/core/bestiary-profiles.js`, `js/core/creature-abilities.js`, `js/core/resolution.js`, `js/core/store.js`
- `js/core/v5-magic-casting.js`, `js/core/v5-magic-channelling.js`, `js/core/v5-momentum.js`, `js/core/v5-supplemental-equipment.js`
- `js/data/f2-h-profile-abilities.js`, `js/ui/resolution-panel.js`, `js/ui/v5-corruption-panel.js`
- `tests/f2-f-review-browser.mjs`, `tests/f2-f-source-name-characterization.test.js`, `tests/f2-h-bestiary-abilities.test.js`

F/H ont édité des fichiers communs. Inspecter `git diff` intégral et coordonner les corrections ; ne pas attribuer tout fichier à un seul lot sans examiner ses hunks. Aucun test complet n'a été exécuté sur cet état non committé.

## Avant fermeture F2

Terminer F, H, J1 et J2 ; pour chaque lot tests de caractérisation séparés avant tout changement de `resolution.js`, `store.js`, `v5-store-action.js` ou `v5-effects.js`, revue indépendante Luna à contexte neuf sur les pages PDF, corrections jusqu'au verdict favorable, revue intégrale par l'exécutant et parcours navigateur. Mettre à jour rapport de tranche, rapport de phase, succession, statut mécanique et liste complète des nouveaux modules. Lancer suite complète avec TEMP/TMP sur E:, `node tools/run-divine-recipe.mjs` et les parcours navigateur de tous les écrans F2. Seul `tests/sw.test.js` peut échouer avant publication : précache et version sont réservés à Claude après contre-vérification et feu vert MJ. La liste observée à l'état F précédent comporte 19 modules T2/T3/F ; ajouter au minimum `js/core/v5-aftermath.js`, `js/ui/v5-aftermath-panel.js`, `js/data/f2-h-profile-abilities.js` et tout module supplémentaire effectivement créé, puis recalculer la liste finale par le test.
