# Rapport U1 — panneau d’action de Jouer

**État : implémentation locale terminée.** Le dernier lot est commité avec ce rapport ; la recette navigateur complète présente les trois échecs détaillés ci-dessous.

Base : `main` en `38e07ad` (3.32.0). Branche locale : `codex/u1-panneau-action`, worktree `tmp/u1-worktree`. Aucun push ni publication. La version et `sw.js` n’ont pas été modifiés. Aucun nouveau module sous `js/**`.

## Lots

- U1-1 — `d020268` : trois étapes, pied, étiquettes PJ/PNJ et résolution placée avant les panneaux de prière, Corruption et suites. Les blocs existants sont réorganisés après leur construction ; cela conserve leurs gestionnaires, mais reste plus fragile que des fonctions de rendu indépendantes par étape.
- U1-2 — `661c940` : tiroir, groupes à clés explicites, ouverture par défaut en attaque, repli temporaire du panneau latéral, fermeture et liens vers les champs. Les champs classés sont ajoutés directement à leur groupe ; le bloc historique « Autres réglages » conserve des champs imbriqués dont la séparation exigeait de toucher à leur logique. L’état d’ouverture du tiroir est conservé dans le brouillon.
- U1-3 — `eb02d53` : lancement des dés PNJ/créatures vides, conservation des dés déjà saisis et des dés de PJ, puis calcul ; prise en compte notamment des défenses engagées, critiques, sorts et incidents. Le compteur utilise les défauts déclarés ou les valeurs initiales natives des contrôles, sans reconstruire le panneau ni appeler les gestionnaires pour un rendu de référence. Les tests couvrent les défauts propres à l’action, les valeurs déjà renseignées et un changement de cible.
- U1-4 — `660facd` : menus Test et Sort/Prière/Corruption, actions du Tour dépliables, ouverture des panneaux existants. Le panneau divin conserve son mécanisme d’ouverture ; le panneau Corruption reste ouvert pendant une saisie ou une décision identifiée en attente. Les suites de combat restent ouvertes par prudence : leur état ne permet pas de distinguer de manière fiable toutes les saisies et décisions en cours.
- U1-5 — commit du présent rapport : attente avant calcul, pied avec Appliquer désactivé et liens vers les saisies manquantes, mise à jour pendant la frappe, libellé visible « Effacer », ordre DOM des étapes/pied/tiroir. Le tiroir s’aligne sur le rail réellement affiché ; Échap ne prend pas la priorité sur une fenêtre de dialogue. L’ouverture des actions du Tour est mémorisée dès le clic pour résister à un rendu immédiat. Pour une action physique dont le jet principal est valide, le pied utilise un aperçu du moteur construit avec les mêmes entrées que Calculer et les raisons de `applicationBlockingReasons` ; aucun jet fictif ni commande Store. Avant un jet exploitable, seul le préalable de saisie est indiqué. Pour la magie, les raisons détaillées restent disponibles après Calculer : avant, l’interface demande de calculer plutôt que d’anticiper des règles. Le nom accessible historique du bouton d’annulation est conservé.

## Points à contrôler

- Le résultat « Multiplication d’infortune » (incident mineur 91–95) demande deux nouveaux d100 et la relance de chaque résultat 91–100 : c’est le texte du référentiel existant `js/data/magic.js` et le moteur exige déjà les valeurs finales 1–90. Le lancement groupé applique cette relance ; un test contrôle notamment la séquence 100, 91, 90. La table elle-même va bien jusqu’à 100.
- Un champ de jet secondaire partagé entre plusieurs destinataires de types différents n’est pas attribué automatiquement à un PNJ unique : le renseigner pourrait modifier aussi le jet d’un PJ. Le résultat initial d’un tir déjà effectué et le résultat choisi par Destin restent des faits à saisir, non des dés à inventer.
- Le compteur ne fait plus de second rendu. Les défauts sont déclarés explicitement lorsqu’ils dépendent de l’action, de l’équipement ou du profil ; pour les autres contrôles, il utilise le défaut natif. Les situations rares dont le défaut est calculé ailleurs méritent une contre-vérification ciblée. Après saisie d’un jet principal valide, les changements pertinents relancent un aperçu moteur en lecture seule pour actualiser les blocages : ce coût de calcul est distinct du rendu et peut être sensible sur une rencontre complexe.
- Les captures sont dans `captures/u1-1440-light.png`, `captures/u1-1440-dark.png`, `captures/u1-900-light.png` et `captures/u1-900-dark.png` dans le worktree ; elles ne sont pas commitées.

## Vérifications

- Tests unitaires complets après la correction de prévalidation : **5 511/5 511**. Commande : `node --test --test-concurrency=4`, TEMP/TMP sur le même disque que le worktree pour les liens temporaires Windows ; le fichier local ignoré `tmp/divin/recipe-receipt.json` contient `{}` pour un test préexistant dépendant de cet artefact.
- `npm run test:browser-all` : **104/107** parcours verts lors de la dernière relance, exécutés un par un. `f2-c-state.browser.mjs` a échoué sur deux commandes Rétablir envoyées avant la fin de la première ; après synchronisation du test sur les états attendus, son rejeu ciblé passe. La suite complète n’a pas été relancée après cette seule modification de test. Les deux autres échecs sont `lot2-v5-25-release-browser.mjs` et `lot3-v5-35-release-browser.mjs`, faute de leurs fichiers locaux ignorés `tmp/lot2-25/release-path.json` et `tmp/lot3/release-path.json` respectifs. Aucun résultat de publication n’est revendiqué.
- Parcours ciblés déjà effectués : attaque PNJ contre PJ sous Protection, validation en lecture seule sans tirage ni changement du Store, défense non exigée au tir, défense engagée tirée au sort et lien vers son champ, maintien des valeurs, créature, critique, magie, application, tiroir mobile, Échap, clic extérieur, thèmes et absence de débordement.

## Parcours adaptés

Les adaptations ouvrent ou ferment explicitement les nouveaux panneaux et menus et conservent les vérifications de comportement. Dans `browser-index.mjs`, l’ancien contrôle d’absence d’Appliquer après un aperçu périmé est remplacé par deux contrôles : le bouton est présent, désactivé et porte le libellé générique ; la vérification qu’aucune conséquence n’est appliquée est conservée. Dans `lot2-combat-v5-browser.mjs`, deux contrôles d’absence d’Appliquer après erreur ou aperçu périmé deviennent des contrôles de désactivation, les messages et l’absence de conséquence restant vérifiés. Dans le parcours divin Brisé/Fuite/Sprint, l’attente de disparition d’Effacer devient une vérification de disparition du refus et de désactivation d’Appliquer ; les contrôles d’absence de mutation restent présents. Les tests U1 ajoutent des assertions de comportement. Le numéro indique un point d’entrée de l’adaptation ; un même fichier peut contenir plusieurs gestes.
- `tests/browser-index.mjs:275` — vérification du rail, fermeture Échap et adaptation du contrôle d’aperçu périmé au bouton désormais toujours présent.
- `tests/browser-magic-v5-smoke.mjs:224` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/browser-smoke.mjs:277` — ouverture du menu Test.
- `tests/divin-v5-b13-browser.mjs:30` — ouverture ou fermeture du tiroir.
- `tests/divin-v5-brise-flee-sprint-browser-independent.mjs:28` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/divin-v5-p5-ui-browser.mjs:94` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-a-initiative-surprise.browser.mjs:173` — attente du contrôle de la nouvelle fenêtre avant la vérification inchangée des camps.
- `tests/f2-b-combat-actions.browser.mjs:48` — ouverture ou fermeture du tiroir, ouverture des actions du Tour.
- `tests/f2-b-two-weapons.browser.mjs:23` — ouverture ou fermeture du tiroir.
- `tests/f2-c-state.browser.mjs:44` — synchronisation des deux Rétablir sur leurs états attendus et ouverture ou fermeture du tiroir.
- `tests/f2-c-ui.browser.mjs:17` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-c-workspace.browser.mjs:28` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/f2-d-ui.browser.mjs:20` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-f-review-browser.mjs:37` — ouverture ou fermeture du tiroir et ouverture de Corruption pour les deux personnages.
- `tests/f2-gm-counterreview-browser.mjs:43` — ouverture du menu Test.
- `tests/f2-h-review-browser.mjs:33` — ouverture ou fermeture du tiroir.
- `tests/f2-i-complete.browser.mjs:38` — ouverture ou fermeture du tiroir.
- `tests/f2-j-review-browser.mjs:32` — ouverture ou fermeture du tiroir.
- `tests/f2-j2-review-browser.mjs:42` — ouverture ou fermeture du tiroir.
- `tests/f2-l-destin-counterreview-browser.mjs:35` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-l-fortune-advantage-order-browser.mjs:28` — ouverture ou fermeture du tiroir.
- `tests/f2-n-grappling.browser.mjs:61` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/f2-t2bis-assommer.browser.mjs:20` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-t2bis-d-complete.browser.mjs:39` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/f2-t2bis-empaleuse.browser.mjs:25` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-t2bis-net-escape-ui-repro.browser.mjs:23` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/f2-t2bis-salvo-incident-ui.browser.mjs:20` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-t2bis-shield-attachment.browser.mjs:22` — sélecteurs ou ouverture de section adaptés.
- `tests/f2-t3-browser.mjs:44` — ouverture du menu Test, ouverture de Corruption.
- `tests/fiches-pj-browser.mjs:192` — ouverture ou fermeture du tiroir.
- `tests/helpers/u1-drawer.mjs:2` — aides de navigation des parcours.
- `tests/lot2-combat-v5-browser.mjs:78` — ouverture ou fermeture du tiroir et contrôle d’Appliquer désactivé après erreur ou aperçu périmé.
- `tests/lot2-v5-23-browser.mjs:78` — ouverture ou fermeture du tiroir.
- `tests/lot2-v5-23-control-browser.mjs:78` — ouverture ou fermeture du tiroir.
- `tests/lot2-v5-24-control-browser.mjs:78` — ouverture ou fermeture du tiroir.
- `tests/lot2-v5-keyword-control-browser.mjs:78` — ouverture ou fermeture du tiroir.
- `tests/lot2-v5-remaining-talents-browser.mjs:78` — ouverture ou fermeture du tiroir.
- `tests/lot3-v5-arcanes-mineurs-ui-browser.mjs:17` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-catalogue-5b-ui-browser.mjs:15` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-catalogue-ui-browser.mjs:15` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-cloture-ui-browser.mjs:17` — ouverture ou fermeture du tiroir.
- `tests/lot3-v5-domaines-ui-browser.mjs:17` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-elfiques-ui-browser.mjs:15` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-magic-2b-ui-browser.mjs:106` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/lot3-v5-wom-ui-browser.mjs:13` — ouverture ou fermeture du tiroir, ouverture du menu magique.
- `tests/u1-panneau-action-browser.mjs:51` — nouveau parcours U1.
- `tests/unit/combat/u1-drawer.test.js:1` — tests unitaires U1.
- `tests/unit/combat/u1-npc-rolls.test.js:1` — tests unitaires U1.
- `tests/v3-b-combat-browser.mjs:60` — ouverture ou fermeture du tiroir, ouverture du menu Test.
- `tests/v3-c-browser.mjs:89` — ouverture ou fermeture du tiroir, ouverture du menu Test.

