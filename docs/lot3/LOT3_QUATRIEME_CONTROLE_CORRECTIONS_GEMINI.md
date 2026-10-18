# Quatrième contrôle des corrections Gemini — 10 octobre 2026

> Mise à jour du 10 octobre : le P1 ci-dessous est corrigé. Voir [la correction de Destruction des Arcanes](LOT3_CORRECTION_DESTRUCTION_ARCANES.md). Les constats de cette revue sont conservés comme historique.

**Les corrections principales sont confirmées. Un blocage reste sur Destruction des Arcanes.** Aucun code du moteur modifié pendant ce contrôle.

## Vérifications exécutées

- Suite complète `node --test` : **1 023 / 1 023**, zéro échec.
- `tests/browser-magic-v5-smoke.mjs` : **OK**, avec sélection du palier de Main de Gloire, refus d’une surpuissance insuffisante, Focalisation de Haute Magie dans l’interface et application du palier payé. Les tests utilisent le workspace en fixture et le Service Worker hors ligne. Le smoke Combat annoncé par Gemini n’a pas été rejoué pendant ce contrôle.
- `git diff --check` : aucune erreur ; checkout principal inchangé.
- Les sondes indépendantes de la revue précédente sont rejouées : Main de Gloire ne donne plus gratuitement quatre caractéristiques ; Calme attend son Test secondaire ; Carreau ne reçoit plus une résistance FM arbitraire ; les camps restent correctement classifiés malgré `type: PJ/PNJ` ; l’incident Distraction transmis est conservé.
- Le Bœuf Reste Debout retire maintenant Brisé, préserve À Terre/Sonné et fournit le trait d’immunité Peur/Terreur attendu.
- La Fortune temporaire est raccordée au parcours normal du store. Contrôle supplémentaire avec **2 points permanents** : gain de 3 temporaires → **5** ; relance normale → **4** ; annulation → **5** ; nouvelle relance puis expiration → **2**. Le solde permanent est préservé.
- Carreau refuse deux cibles sans extension, les accepte avec la surpuissance correspondante ; Tête Brûlante conserve la sélection mixte allié/adversaire.

Cette recette confirme les corrections contrôlées ; elle ne certifie pas chaque effet des 277 sorts.

## P1 restant — Destruction des Arcanes ne respecte pas encore ses options

Référence contrôlée : `js/data/reference-snapshot.json:18157`, description courante du sort. Le profil de base inflige des dégâts correspondant à la moitié des PA portés, réduit par le BE et ignorant les PA. La destruction d’un PA demande **+1 DR par PA**, à localisation aléatoire. Le palier **+8 DR** augmente les dégâts à un par PA porté. La destruction d’objet magique exige un Test de Focalisation réussi, et le choix de l’objet comporte sa propre option et son Test de Dextérité.

Le traitement de `js/core/v5-spell-contracts.js:1593` a corrigé l’ancien effet « dégâts magiques ×2 », mais trois erreurs subsistent :

1. **Un PA est détruit gratuitement.** `destroyedAp = 1 + floor(overcastSpent / 2)` donne 1 sans dépense et ne suit pas le coût de 1 DR par PA. Sans localisation fournie, le moteur choisit toujours `body`. L’interface ne recueille pas de résultat ou choix d’armure correspondant.
2. **Le palier +8 DR contourne la validation.** `options.overcast8 === true` active les dégâts améliorés même si aucun DR n’est disponible ou dépensé. Avec `destroyArmorPiece: true`, cette même option supprime aussi toute l’armure du Corps, alors que le palier +8 décrit l’amélioration des dégâts.
3. **La destruction d’objet magique n’est pas raccordée aux Tests requis.** Le booléen `destroyMagicItem` est exploité avec ce palier, sans preuve du Test de Focalisation et, pour un objet choisi, du Test de Dextérité. Les champs nécessaires ne sont pas disponibles dans le parcours du panneau.

### Reproductions via le store

Cible : **30 B, E30, 3 PA Tête/Corps/Bras/Jambes**, soit **18 PA** sur les six localisations. NI9, résultat final **9 DR**, aucune réserve ou dépense de surpuissance.

- Application normale : dégâts corrects **9 − BE3 = 6**, cible **30 → 24 B** ; mais le Corps passe aussi de **3 → 2 PA**. Attendu : les PA restent à 3 sans option de destruction payée.
- Même résultat avec `overcast8: true, destroyArmorPiece: true` : aperçu prêt, **0 DR disponible et 0 dépensé** ; cible **30 → 15 B**, Corps **3 → 0 PA**. Attendu : refuser le palier +8 non payé et ne pas lui associer gratuitement une destruction d’armure.

### Correction et recette attendues

Déclarer séparément les options du sort, valider chaque dépense puis déduire les effets depuis ces dépenses. Aucun booléen ne doit contourner le budget. Ne pas détruire de PA au profil de base ; recueillir et enregistrer les faits nécessaires à la localisation aléatoire et à la destruction d’objet magique. Le reçu de confirmation d’inventaire ne remplace pas ces conditions.

Tester : profil de base à NI exact ; 3 DR payés donnant 3 PA détruits selon la règle ; palier +8 refusé avec budget insuffisant et accepté avec budget suffisant ; Test de Focalisation raté/réussi pour l’objet magique ; option de choix avec son Test ; annulation complète. Mettre à jour le contrat et la matrice en conséquence.

## Preuves et périmètre

Scripts et résultats dans `C:\Users\arnot\.codex\visualizations\2026\10\09\01a1203a-1fd5-7db0-93c2-afd3e97e1dc6` : `review-gemini-fourth-probes.mjs`, `gemini-fifth-probes.jsonl`, `review-gemini-fifth-functional.mjs`, `gemini-fifth-functional.jsonl`, `gemini-fifth-full-tests.txt`, `gemini-fifth-browser.txt`.

Les rapports précédents sont conservés. Aucun push, commit ni déploiement effectué par Codex.
