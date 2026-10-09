# Passation vers un nouveau chat

Préparée le 9 octobre 2026 après validation des trois arbitrages par le MJ.

## Message à copier dans le nouveau chat

```text
Reprends le chantier V5 de l’Outil MJ Warhammer depuis le dépôt local E:\Outil MJ Warhammer.

Le développement est sur la branche LOCALE codex/lot2-talents-v5. Les nouveaux commits ne sont pas poussés : ne pas repartir uniquement d’origin/codex/lot2-talents-v5, ni remplacer le travail par la version distante. Main et le site public restent inchangés.

Lis d’abord docs/lot2/PASSATION_PROCHAINE_FENETRE.md depuis cette branche locale, puis REPRISE_AGENT.md, LOT2_AVANCEMENT.md, LOT2_CONTROLE.md, CHOIX_POUR_LA_REPRISE.md et LOT2_ETAPE_2_3_SOCLE.md. Depuis main, git show codex/lot2-talents-v5:docs/lot2/PASSATION_PROCHAINE_FENETRE.md permet de lire la passation sans changer de branche. git worktree list permet de retrouver le worktree existant.

Les étapes 2.1/2.2 sont raccordées et validées localement. Le socle pur 2.3 est préparé, mais ses talents, coûts et quotas ne sont pas encore actifs dans l’outil. La prochaine étape est son raccordement Store/résolution/UI, puis la couverture du catalogue utile.

Les trois arbitrages sont VALIDÉS :
1. Le MJ choisit par action entre pénalité de DR et Désavantage.
2. Battement supprime toutes les Blessures et les conséquences du critique ; seuls ses propres effets s’appliquent.
3. Fortune : compteur par personnage dans l’outil, conservé entre rencontres, initialisé depuis la fiche si le solde courant est connu ou par saisie MJ ; dépenses annulables, sans écriture automatique dans la fiche.

Travaille avec des sous-agents de développement et un contrôle indépendant ; tu es chef d’orchestre. Avance avec ces décisions, prépare les autres choix si nécessaire. Ne pousse, ne fusionne dans main et ne déploie rien sans instruction explicite.

Les règles personnelles sont accessibles dans Y:\Ressources JDR\Warhammer 4\Règles ; le livre vérifié est Livre de base V5 EN v2.pdf. Les 206 talents d’Aides de jeu ont déjà été convertis et recapturés en V5.
```

## Code et emplacement

- Dépôt principal : `E:\Outil MJ Warhammer`, branche `main`, propre et inchangée.
- Worktree du chantier : nommé `lot2-combat-v5`, repérable par `git worktree list` depuis le dépôt principal.
- Branche locale : `codex/lot2-talents-v5`. Le commit moteur validé est `6871764`, au-dessus du socle distant `98e2e48`. Les commits locaux suivants consignent les décisions et cette passation.
- Pour un nouveau chat qui exige son propre worktree, le créer depuis la référence **locale** `codex/lot2-talents-v5`, incluant les commits de passation. Vérifier les commits avant de développer. Ne pas réinitialiser le worktree existant et ne pas travailler simultanément dans deux chats sur ses fichiers.

## Résultat acquis

619 tests Node réussis, zéro échec ni test ignoré, avant cette actualisation documentaire. Les recettes `test:lot2-browser`, `test:fiches-browser` et `test:startup` passent. Le démarrage éprouve une mise à jour réelle du cache 3.12.0 → 3.12.3 avec IndexedDB préservée. Le contrôle indépendant compte 183 tests ciblés réussis.

Le combat utilise une chaîne V5 commune : inversion sans nouveau tirage, opposition, localisations et protections, critiques indépendants du gagnant, excédent sans plafond global de gravité, PV bornés à zéro et Élan binaire. Acquisition, récupération, échéances et fin de Round s’appliquent atomiquement avec révision et annulation. Les jets et contextes inconnus suspendent l’application.

Les règles consultables et les tables critiques sont reprises en V5. La magie et les prières restent au lot 3. Supprimer une rencontre purge son journal lié, ses archives et les copies de ces traces dans l’annulation. Les 206 identités et leurs textes source sont actualisés ; 19 descriptions ont changé. Cette source actualisée n’active pas automatiquement les talents.

## Raccordement 2.3 à faire

Le socle est dans `js/core/v5-action-costs.js`, `js/core/talent-contract-v2.js` et `js/data/v5-talent-contracts.json`. Lire les API et les tests avant de les adapter à l’enveloppe Store réelle. Le socle emploie un état autonome avec `revision`/`participants` ; le Store emploie `localRevision`/`combat.participants`. Ne pas mélanger implicitement ces structures.

Les trois contrats purs validés sont Tir précis, Coup puissant et Mâchoires d’acier. Battement reste brouillon : son arbitrage est maintenant fixé, mais ses conséquences doivent encore être implémentées et testées. Les réactions, attaques supplémentaires et le catalogue complet ne sont pas certifiés actifs.

À éprouver en priorité :

1. Coûts payés avant comparaison ; payer Élan pour une attaque supplémentaire retire son Avantage à cette attaque. Résultat, ressources et usages doivent être confirmés dans la même commande durable.
2. Quotas par acteur/Tour/Round/rencontre ; regagner Élan ne permet pas un second paiement pour attaque supplémentaire au même Tour. Une exemption de coût ne supprime pas le quota du talent.
3. Compteur de Fortune par personnage stable, commun aux rencontres, initialisation explicite, annulation et sauvegarde/cloud de l’outil. Ne pas écrire automatiquement dans la fiche source.
4. Battement : suppression complète des Blessures et conséquences du critique remplacé, échéance à la fin du prochain Tour de l’auteur, auteur distinct de cible ; cohérence attaque/défense, aperçu/application et annulation.
5. Talents prioritaires tirés des snapshots réels des PJ, pas uniquement de la fixture Caelel. Dix bonus de caractéristiques déjà inclus dans les fiches sont exclus ; ne pas ajouter Dur à cuire une deuxième fois.

## Conditions pratiques

Node/npm et les dépendances sont déjà installés dans le worktree actuel. Sur cette machine, les commandes shell ordinaires ont échoué au lancement du sandbox ; les exécutions avec `sandbox_permissions: require_escalated` ont fonctionné. Ne pas modifier manuellement les fichiers internes de Git pour contourner une erreur de permission.

Edge est le navigateur de recette. Les données et captures sont synthétiques dans `tmp/`, ignoré par Git. Un essai de démarrage exécuté en parallèle d’autres recettes est resté suspendu ; une exécution isolée a passé tous les contrôles en six secondes. Préférer les recettes navigateur isolées si ce comportement revient.

Le ZIP contient le dossier et la maquette, sans code applicatif, PDF ni donnée de séance. `SHA256SUMS.txt` couvre ses documents ; le code doit être transmis par l’état Git local, puisque les commits ne sont pas encore distants. La première fenêtre s’arrête après cette passation.
