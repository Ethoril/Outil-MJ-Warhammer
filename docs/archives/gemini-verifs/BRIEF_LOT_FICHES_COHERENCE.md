# Brief — petit lot « cohérence » du dépôt des fiches, 28/10/2026

Exécutant : GPT (instance distincte). Contre-vérification : Claude. Dépôt `E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4` (site des fiches de personnages).

## Mise en place

- Worktree dédié : `git -C "E:/Projet Warhammer Ennemi Intérieur/ennemi-interieur-wfrp4" worktree add "E:/Projet Warhammer Ennemi Intérieur/tmp/gpt-coherence-fiches" -b gpt/coherence-fiches gemini/armes-v5`. Fins de ligne LF.
- Jamais le checkout principal, ni la branche `gemini/armes-v5` directement. Pas de `git stash`.
- Commits locaux seulement : ni fusion, ni push, ni déploiement, ni changement de version.
- La feuille Google « Aides de jeu » fait foi. Tu ne l'écris jamais ; ne lance aucun script de rafraîchissement qui la lit sans `--source-dir` vers des CSV locaux.
- Source des constats : `E:/Outil MJ Warhammer/tmp/gemini-verifs/RAPPORT_COHERENCE_OUTIL_FEUILLE.md` (sections « Écarts détaillés générés » et « Analyse des 16 libellés publiés non résolus »), avec ses fichiers `coherence/audit-details.json` et `coherence/verification-independante.json`.
- Décisions du MJ : fin de `E:/Outil MJ Warhammer/tmp/f1-reperage/ARBITRAGES_25_10.md`.

Avant tout changement, identifie comment chaque fichier de données est produit : `js/catalogue/referentiel-public.json`, `js/catalogue/talents-sheet-snapshot.json`, `js/data/skills.json`, résolveurs de `js/catalogue/` et de `js/fiche/`. S'il est généré, modifie la source et régénère ; ne l'édite jamais à la main. Lance les `--check` existants.

## À faire

1. **Retirer « Bon sens » et « Vivant »** du référentiel des talents publiés : aucune source retrouvée, décision du MJ. Vérifie d'abord qu'aucune carrière, espèce ni fiche de test ne les cite ; signale-le si c'est le cas, sans rien inventer.
2. **Raccorder trois alias de talents** vers les entrées existantes de la feuille, dans le mécanisme d'alias existant :
   - « Béni d'Isha » → « Béni par Isha » ;
   - « Maniement de 2 armes » → « Maniement de deux armes » ;
   - « Imprégné par le (Vent) » → « Imprégné [Vent] ».
   
   Vérifie la troisième sur le livre avant de la raccorder.
3. **Cinq traits de créature rangés parmi les talents** : Compagnon, Invisibilité, Messager, Partage sensoriel, Télépathie animale (Archives of the Empire 3 p.81-82, traits de familiers). Ils ne doivent plus apparaître comme talents achetables. S'ils servent aux familiers, garde-les comme traits. Ne casse pas les familiers déjà gérés : cherche-les dans les fiches et dans le code avant de toucher quoi que ce soit.
4. **Six compétences où `skills.json` contredit le référentiel publié** :
   - Corps à corps (Arme d'hast) : compétence de base ou avancée ?
   - Métier (Calligraphe), Métier (Cartographe), Métier (Graveur) : de base ou avancées ?
   - Représentation (Acteur) : caractéristique Ag ou Soc, de base ou avancée ?
   
   Tranche chaque cas **sur le Livre de base V5** (L06, chapitre des compétences ; PDF `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/Livre de base V5 EN v2.pdf`). Corrige la source fautive et cite la page. Si le livre ne tranche pas, ne change rien et pose la question.
5. **Ne touche pas** aux talents V4 à ajouter (Corruption contrôlée, etc.) : le MJ les ajoute à sa feuille par CSV, puis le référentiel sera régénéré. Ne touche pas non plus aux munitions, à l'équipement ni à la magie.

## Acceptation

- Un test par point : alias résolus, traits absents de la liste des talents achetables, Bon sens et Vivant absents, valeurs des six compétences.
- Tests existants verts ; seuls peuvent changer ceux qui épinglaient les anciennes valeurs, listés dans le commit avec leur raison.
- Générateurs en `--check` verts.
- Si un fichier est copié dans `functions/src/data/`, la copie reste identique (`node tools/sync-fiche-domain.mjs --check`).

## Fin

Rapport court : `E:/Outil MJ Warhammer/tmp/gemini-verifs/RAPPORT_LOT_FICHES_COHERENCE.md`, avec les commits, les tests, les pages du livre citées et les questions éventuelles. Puis arrêt : Claude contre-vérifie et répercute ensuite ces changements dans l'outil, qui reprend le référentiel des fiches.
