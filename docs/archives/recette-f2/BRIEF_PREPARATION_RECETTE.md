# Brief — préparation de la recette à la table de F2 (phase G), 28/10/2026

Exécutant : une instance distincte (GPT ou Gemini). Contre-vérification : Claude. **Aucune modification de code** : le livrable est un document.

## But

Le MJ fera une recette manuelle de l'Outil MJ après la publication de F2 : il joue des combats d'essai et vérifie que l'outil applique les règles. Prépare-lui un **cahier de recette** à suivre pas à pas : des scénarios courts, chacun avec sa préparation, les clics, le résultat attendu et sa source (règle du livre ou décision du MJ). Le cahier sert aussi à repérer, dès maintenant, ce que l'interface ne permet pas de faire.

## Sources (lecture seule)

- Code : branche `gpt/phase-f2`. Crée ton propre worktree détaché, **jamais celui de GPT** : `git -C "E:/Outil MJ Warhammer" worktree add --detach "E:/Outil MJ Warhammer/tmp/recette-f2-worktree" gpt/phase-f2`. Pas de `git stash`. N'écris rien dans le dépôt.
- Ce qui a été livré : `docs/plans-gpt/RAPPORT_GPT_PHASE_F2.md`, `docs/plans-gpt/f2/PLAN_F2_LOTS.md`, `docs/plans-gpt/f2/F2_LOTS.json` (règles retenues en F1, par lot).
- Décisions du MJ, qui priment : `E:/Outil MJ Warhammer/tmp/f1-reperage/ARBITRAGES_25_10.md` et le haut de `docs/plans-gpt/CHOIX_EXECUTANT_PHASE_F2.md`.
- Contre-vérifications de Claude : `tmp/gpt-phase-f2/CONTRE_VERIFICATION_CLAUDE_*.md` dans `E:/Outil MJ Warhammer/tmp/gpt-phase-f2-worktree`. Elles listent les limites connues : ne les fais pas passer pour des défauts de recette.
- Forme existante à imiter : `docs/RECETTE_UTILISATEUR.md` (parcours numérotés, noms exacts des boutons).
- Données réelles : catalogue `js/data/reference-snapshot.json` (armes, armures, talents), bestiaire `js/data/bestiary/*.json`. Si des fiches de PJ de test existent dans `tests/`, utilise-les ; sinon décris des profils minimaux à créer depuis le JSON (`docs/IMPORT_PROFILS_JSON.md`).
- Livres, pour les références de page : `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/` (L06 V5 fait foi).

## Contenu attendu

Un scénario par groupe de règles, regroupés par lot. Pour **T1** (C compétences d'arme, A initiative et surprise, B modificateurs et actions), **F2-R** (référentiel d'armes et armures V5) et **T2** (D qualités, E maladresses et poudre, N empoignade, I critiques et séquelles), couvrir notamment :

- **Initiative et Round 0** : surprise, ex aequo à 3 (le MJ fixe l'ordre), invocation et ajout direct avant le Round 1 (jet d'Initiative), bouton « + Actif ».
- **Modificateurs** : Surpris (+2 DR en mêlée, +1 au tir), attaquant À Terre (Désavantage et −1 DR), malus cumulés, monté/démonté, Visée, Défensive, Maniement de deux armes.
- **Compétences d'arme** : spécialité exacte prioritaire, maîtrise retirant des Qualités, malus de tir sans entraînement.
- **Équipement et qualités V5** :
  - bouclier : +1 DR, tirs à 2 PA, attaché ;
  - Taille, Inflige, Empaleuse ;
  - recharge (1 + DR positifs) ;
  - filet (Test opposé, échec sans effet) ;
  - Bolas aux jambes seulement ;
  - Discrétion et Heaume ;
  - Tromblon ; Poivrière.
- **Maladresses** : table Oops (d10), incidents de poudre (99-100), accidents propres L13 (hache-fusil, mortier de main), table de Salve.
- **Empoignade** sur trois Tours, avec Annuler, Rétablir et rechargement, retrait d'un participant et « Recommencer ».
- **Critiques** :
  - séquelle enregistrée une seule fois, choc d'amputation, main fendue (« Non » reporté) ;
  - décompte de mort par critiques et refus du MJ ;
  - mort subite des figurants (réglage désactivé par défaut, créatures comprises) ;
  - Assommer.

Pour **T3** (Destin et Chance, localisations des créatures, combat monté, Corruption et mutations) et **T4** (armes de suppléments, bestiaire, séquelles hors combat) : prévois seulement les titres des sections, à compléter quand ces tranches seront livrées.

Chaque scénario donne :
- **Préparation** : profils (noms réels du catalogue), rencontre, réglages.
- **Étapes** : clics et saisies dans l'ordre, avec les jets d100 et d10 imposés pour que le résultat soit déterministe.
- **Attendu** : valeurs chiffrées (PV, DR, états, ordre…) avec leur source (page du livre ou décision du MJ datée).
- **Contrôles de robustesse** quand c'est pertinent : Annuler/Rétablir, rechargement de la page.
- **Durée estimée.**

Ajoute en tête un parcours rapide, d'environ 30 minutes, avec les 10 scénarios les plus importants, puis le parcours complet.

## Répétition à blanc (obligatoire)

Joue chaque scénario du parcours rapide dans l'application locale, en mode invité :
- serveur statique sur ton worktree, comme dans `docs/RECETTE_UTILISATEUR.md` ;
- **jamais Firebase de production** ;
- aucune donnée réelle du MJ.

Note pour chaque scénario « joué conforme », « écart » ou « impossible dans l'interface », avec ce que tu as observé. Un écart n'est pas à corriger : il va dans une section « Écarts constatés pendant la répétition », avec les étapes pour le reproduire.

## Livrables

- `E:/Outil MJ Warhammer/tmp/recette-f2/RECETTE_F2.md` : le cahier (parcours rapide, parcours complet, sections T3 et T4 à compléter, écarts constatés).
- Un court résumé en fin de fichier : nombre de scénarios, durée totale estimée, écarts trouvés.

Ensuite, arrêt : Claude relit le cahier et les écarts avant de le soumettre au MJ.
