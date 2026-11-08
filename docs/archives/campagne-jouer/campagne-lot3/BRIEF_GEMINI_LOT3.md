# Mission Gemini 3.8 — Lot 3 Campagne, proposition locale à contrôler

## Mandat et environnement

Tu interviens pour Codex, chef d'orchestre, dans ce worktree isolé uniquement : `E:/Outil MJ Warhammer/tmp/campagne-lot3-worktree`, branche locale `codex/campagne-lot3`, HEAD `50d3592`. Les modifications non commitées présentes au départ sont la copie exacte du lot 2 de Codex : elles font partie du point de départ. **Ne les supprime pas et ne tente pas de les reconstituer depuis HEAD.** Lis `docs/CAMPAGNE_LOT2.md` et `tmp/maquette-campagne-jouer/LOT_0.md`, puis les sources et tests réellement concernés.

Le MJ a validé la direction de la maquette et demande les couleurs/polices de celle-ci dans l'interface Campagne. La maquette se trouve dans le dépôt principal : `E:/Outil MJ Warhammer/tmp/maquette-campagne-jouer/` ; ses CSS de référence sont aussi copiés dans ce worktree sous `tmp/maquette-campagne-jouer/`. Ils sont une référence visuelle, pas une source de vérité métier.

**Réponds et écris en français.** Produis un résultat local révisable par Codex ; ne fais aucun commit, push, merge, publication, déploiement, migration de données réelles, appel à un service externe ou modification de configuration globale. N'utilise pas de sous-agents. Ne touche pas au worktree principal ni à d'autres dossiers que celui indiqué. Ne lis pas de secrets ou d'identifiants.

## Objectif et ordre

Le lot 3 déplace progressivement vers Campagne les parcours de convalescence déjà fonctionnels, en gardant leur logique et leurs garde-fous. L'écran doit être utilisable sur toute la largeur et reprendre l'esthétique sobre de la maquette : fond parchemin, texte sombre, titres en Georgia ou serif voisin, interface en sans-serif système, rouge profond, surfaces et contrastes lisibles. Respecter aussi le thème sombre existant, les petites largeurs et la navigation clavier. Ne pas modifier le thème global des autres onglets, ni la disposition de Jouer : celle-ci est prévue au lot 4.

1. Examiner `js/ui/v5-aftermath-panel.js`, `js/ui/campaign-workspace.js`, `js/ui/workspace-view.js`, les tests F2-J/J2 et `docs/CAMPAGNE_LOT2.md`. Identifier les dépendances et le cycle de rendu avant d'éditer.
2. Donner accès depuis Campagne aux commandes existantes : ouverture de suivi, soins de blessure et d'infection, chirurgie, maladies et séquelles, avec leurs étapes et décisions existantes. Privilégier la réutilisation du panneau et des commandes publiques du Store ; aucune réécriture des règles. La vue de synthèse et la sélection doivent rester utiles ; placer les commandes au bon endroit ou sous une section claire sans en masquer l'existence.
3. Permettre l'avance de temps par la commande existante, avec ses tests quotidiens, confirmations de matins, contrôles de révision, motifs et refus ; réutiliser le dialogue existant si un aperçu complet non mutant n'est pas déjà disponible. Ne prétends pas qu'un aperçu exhaustif est disponible. Une avance par convalescence ne doit jamais être appliquée une seconde fois.
4. Réorganiser les formulaires de soins et de suivi selon la maquette : champs proches, largeur proportionnée, aide et résultats compréhensibles. Aucun libellé de code ou ID interne ne doit constituer l'identification principale d'un soin. Garder les éléments essentiels et les commandes pour clavier/lecteur d'écran.
5. Adapter couleurs et polices de Campagne vers la maquette à l'aide de styles circonscrits. Contrôler contraste et `prefers-color-scheme`/thème effectif. Aucun chargement distant de police.

## Périmètre autorisé en écriture

Tu peux modifier uniquement :

- `js/ui/campaign-workspace.js` et `js/ui/campaign-workspace.css` ;
- `js/ui/v5-aftermath-panel.js` et, si nécessaire, ses styles dans `js/ui/workspace.css`, avec sélecteurs strictement circonscrits ;
- `js/ui/workspace-view.js` uniquement pour l'assemblage du panneau existant, le lien Campagne ↔ Jouer et le cycle de rendu ;
- éventuellement `js/ui/v5-campaign-time-dialog.js` pour les améliorations de libellé ou d'intégration sans changer la logique métier ;
- les tests dédiés sous `tests/` strictement nécessaires ;
- `docs/CAMPAGNE_LOT3_GEMINI.md` pour tes résultats et limites ;
- `sw.js` seulement si de nouveaux modules ou feuilles CSS sont indispensables, avec précache cohérent.

Ne modifie pas `js/core/`, les schémas, migrations, règles Firebase, catalogues, fiches PJ, `index.html`, fichiers de version, configuration, autres écrans, fichiers de données, outils d'extraction ou la maquette. Si l'objectif nécessite ces changements, arrête cette partie, documente précisément le besoin et laisse le choix à Codex/MJ.

## Invariants impératifs

- Les incidents restent rattachés à leur `participantId`. `persistentCharacterId` est facultatif ; ni le nom, ni `profileId`, ni l'homonymie, ni un exemplaire du même profil ne constituent une preuve d'identité. Aucun rapprochement ni transfert automatique, aucune réécriture ou migration des anciens suivis.
- Les soins hors rencontre ne sont pas prétendus opérationnels : les commandes actuelles cherchent le patient/soigneur dans `combat.participants`. Les absents restent consultables et explicitement signalés ; ne les archive pas automatiquement. Ne change pas le traitement des tests quotidiens des patients absents : c'est une décision métier ouverte.
- Temps : même horloge, jours entiers et fraction conservée ; distinguer échéances Tour réel et temps écoulé. Une opération refusée, un jet absent, une version périmée ou une erreur de persistance ne doivent produire aucun avancement partiel. Préserver Undo/Redo, synchronisation et import/export en ne contournant jamais les commandes Store.
- Aucune réussite, aucun DR, aucune décision MJ ou expiration inventée. Ne pas remplacer les sélections et validations existantes par des valeurs présumées. Respecter toutes les variantes (animal, erreurs, infection, chirurgie, séquelle, soins déjà utilisés, tests conditionnels, matins multiples).
- Préserver les parcours accessibles depuis Jouer au moins par un lien explicite fonctionnel vers Campagne, sans perdre les états de formulaire et sans casser les usages existants. Si cela exige une modification métier ou un choix incertain, garder temporairement les deux accès, connectés à la même source, et signaler la limite. Ne jamais effectuer deux commandes pour un seul geste.
- Focus, saisies, sections ouvertes et position doivent survivre aux rerendus Store ; ne pas perdre une saisie en cours. Pas d'alertes bloquantes inutiles. État vide, longues chaînes et erreurs de lecture doivent rester lisibles.

## Validation attendue

Écris des tests ciblés utiles aux changements effectués, notamment rendu et interaction du nouveau parcours Campagne, accès aux commandes existantes, préservation des saisies/focus et non-duplication, tests quotidiens demandés, état périmé, absent. Lance si possible :

- `node --test tests/unit/lot4/c39-temps-convalescence.test.mjs` ;
- `node tests/campaign-workspace-browser.mjs` ;
- `node tests/f2-j-review-browser.mjs` et `node tests/f2-j2-review-browser.mjs` ;
- `node tests/browser-index.mjs` et `node tests/browser-workspace.mjs` ;
- `node --test tests/unit/donnees/audit-meta-production.test.js` si le précache change.

Si une dépendance manque ou qu'une commande réclame une autorisation, ne contourne pas : indique la commande et le résultat, laisse Codex exécuter. Inspecte le rendu à des largeurs représentatives quand l'environnement l'autorise. Ne dis jamais « tous les tests passent » si tu ne les as pas exécutés.

## Rapport à remettre

Dans `docs/CAMPAGNE_LOT3_GEMINI.md` : fichiers touchés, comportement exact avant/après, tests et résultats, cas non couverts, choix visuels, décisions ouvertes, limites et risques. Signale explicitement toute action qui dépasse la liste autorisée au lieu de l'exécuter. Termine sans commit ; Codex inspectera le diff depuis la copie initiale du lot 2, relancera les tests et contrôlera le rendu.
