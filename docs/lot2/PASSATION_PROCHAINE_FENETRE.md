# Passation vers un nouveau chat

Actualisée le 9 octobre 2026 après raccordement représentatif 2.3 et contrôle indépendant. Les trois arbitrages restent validés.

## Message à copier

```text
Reprends le chantier V5 de l’Outil MJ Warhammer depuis la branche LOCALE codex/lot2-talents-v5, incluant a1af528 et le commit de raccordement 2.3 qui contient cette passation. Ne repars pas uniquement d’origin/codex/lot2-talents-v5 : les nouveaux commits sont locaux.

Retrouve le worktree lot2-combat-v5 par git worktree list depuis E:\Outil MJ Warhammer. Lis docs/lot2/PASSATION_PROCHAINE_FENETRE.md, REPRISE_AGENT.md, LOT2_RACCORDEMENT_2_3.md, LOT2_CONTROLE_2_3.md, LOT2_AVANCEMENT.md, LOT2_ETAPES.md et CHOIX_POUR_LA_REPRISE.md, puis le cadrage et les contrats.

2.1/2.2 et cinq contrats représentatifs 2.3 sont raccordés localement : Tir précis, Coup puissant, Mâchoires d’acier, Battement, Assaut féroce. Coûts avant calcul, Fortune par personnage, quotas et réactions durables sont actifs. Prochaine étape : catalogue utile 2.4 ; ajouter une opération moteur et une recette lorsqu’une nouvelle famille le demande. Le catalogue des 206 talents et la livraison 2.5 ne sont pas encore certifiés.

Arbitrages VALIDÉS : le MJ choisit DR/Désavantage par action ; Battement supprime toutes les Blessures et conséquences du critique remplacé ; Fortune appartient à l’outil par personnage entre rencontres, initialisée explicitement, annulable et sans écriture dans la fiche. Ne redemande pas ces choix.

Travaille avec des sous-agents de développement et un contrôle indépendant ; tu es chef d’orchestre. Prépare les autres choix si nécessaire. Ne pousse, ne fusionne dans main et ne déploie rien sans instruction explicite.

Règles personnelles : Y:\Ressources JDR\Warhammer 4\Règles, Livre de base V5 EN v2.pdf. Les 206 descriptions publiques sont actualisées V5. Les priorités viennent des snapshots PJ importés ; aucun PDF ni export privé dans Git.
```

## État Git à reprendre

- Dépôt principal : `E:\Outil MJ Warhammer`, main propre et inchangée.
- Worktree : `C:\Users\arnot\.codex\worktrees\lot2-combat-v5\Outil MJ Warhammer`.
- Branche : `codex/lot2-talents-v5`, contenant le moteur 2.1/2.2 `6871764`, les décisions/passation `a1af528` et le commit contenant les présents rapports 2.3. Vérifier `git log` et l’ascendance avant de développer.
- Depuis main, `git show codex/lot2-talents-v5:docs/lot2/PASSATION_PROCHAINE_FENETRE.md` lit la passation sans changer de branche.
- Si un nouveau worktree est nécessaire, partir de cette référence locale. Conserver le travail existant ; ne pas réinitialiser ni faire travailler deux chats simultanément sur ses fichiers.

## Validation et limites

**672 tests Node réussis**, zéro échec/test ignoré. Recettes Edge isolées réussies : `test:lot2-browser`, `test:lot2-23-browser`, `tests/lot2-v5-23-control-browser.mjs`, `test:startup`, `test:fiches-browser`. Le contrôle indépendant 2.3 compte 21 tests Store inclus dans la suite Node. Le démarrage éprouve le cache 3.12.0 → 3.12.3 avec IndexedDB préservée.

[LOT2_RACCORDEMENT_2_3.md](LOT2_RACCORDEMENT_2_3.md) donne mécanismes, API, validation et suite ; [LOT2_CONTROLE_2_3.md](LOT2_CONTROLE_2_3.md) consigne le verdict indépendant. Les fichiers de socle et rapports antérieurs conservent leur valeur historique ; leur statut « non raccordé » a été dépassé par cet incrément.

La Fortune est commune aux copies/rencontres et survit aux suppressions. Première association PJ locale explicite et univoque : solde/provenance conservés, opération annulable. Remplacement/ambiguïté ne transfèrent pas un solde par hypothèse. Les réactions sont explicites et vérifient action, cible, origine, talent et empreinte. Coûts et quotas sont durables ; purger une rencontre les supprime aussi des copies d’annulation.

La priorité PJ est étayée par cinq snapshots privés locaux des 5/7 octobre (52 acquisitions, 36 IDs), pas par une lecture en ligne du 9 octobre. Frappe assommante, Orateur et talents contextuels restent à contractualiser, comme Riposte/Frappe réactive et les autres clauses utiles. Les dix bonus de caractéristiques intégrés sont exclus ; Dur à cuire ne doit pas être ajouté deux fois. Magie/prières : lot 3. La sérialisation cloud est éprouvée localement, sans recette sur un compte cloud réel.

## Conditions pratiques

Node/npm et dépendances sont installés. Sur cette machine, le lancement ordinaire du sandbox shell a échoué avant exécution ; `sandbox_permissions: require_escalated` a permis les commandes locales autorisées. Ne pas contourner une permission en modifiant les internes Git.

Edge sert aux recettes synthétiques. Exécuter les recettes navigateur séparément : une ancienne exécution concurrente du démarrage s’était suspendue. Captures et logs sont dans `tmp/`, ignoré par Git. La version applicative reste 3.12.3 ; une future livraison aura sa propre validation et publication autorisée.

Le ZIP contient seulement documentation et maquette, sans code, PDF ou données privées. `SHA256SUMS.txt` couvre ses documents. Transférer aussi l’état Git local pour changer de machine : le distant et le ZIP seuls ne contiennent pas les nouveaux modules.
