# Reprise du lot 2 sur une autre machine

Dossier du 8 octobre, actualisé le 9 octobre 2026 après raccordement représentatif 2.3. Il contient cadrage, inventaire, état courant, validation et maquette approuvée.

## Reprendre le code local

La branche **`codex/lot2-talents-v5`** contient `a1af528` et le commit de raccordement contenant ce dossier. Les nouveaux commits ne sont pas poussés. Sur la machine du chantier, retrouver le worktree `lot2-combat-v5` depuis le dépôt principal :

```text
git worktree list
git show codex/lot2-talents-v5:docs/lot2/PASSATION_PROCHAINE_FENETRE.md
```

Conserver les modifications existantes et reprendre la référence locale ; ne pas la remplacer par `origin` ni réinitialiser. Pour changer de machine, transférer aussi l’état Git local ou attendre une publication explicitement autorisée. Un clone distant récupère seulement la dernière version publiée. Le ZIP documentaire ne contient pas le code.

Les références historiques sont le socle initial `7477421e937d73ba4d3cf81b1c8582c0c8315544`, puis le moteur 2.1/2.2 `6871764`. La version applicative reste 3.12.3. Main et le site public sont inchangés par cette reprise.

Node.js/npm sont nécessaires ; `npm ci` reconstruit les dépendances. [Les commandes de validation](LOT2_AVANCEMENT.md) couvrent 672 tests Node et cinq recettes Edge réussis. Les données/captures sont synthétiques ; aucun runtime, node_modules ni export privé n’est nécessaire au transfert.

## Lire dans cet ordre

1. [Passation prête à copier](PASSATION_PROCHAINE_FENETRE.md) et [REPRISE_AGENT.md](REPRISE_AGENT.md).
2. [Raccordement 2.3](LOT2_RACCORDEMENT_2_3.md) et [contrôle indépendant 2.3](LOT2_CONTROLE_2_3.md).
3. [Avancement](LOT2_AVANCEMENT.md) et [découpage](LOT2_ETAPES.md) : prochaine étape 2.4.
4. [Trois arbitrages validés](CHOIX_POUR_LA_REPRISE.md), [cadrage](LOT2_CADRAGE.md) et [contrats moteur](LOT2_CONTRATS_MOTEUR.md).
5. [Inventaire des 206 talents](LOT2_INVENTAIRE_TALENTS.md), [JSON](LOT2_INVENTAIRE_TALENTS.json) et [sources/transfert](SOURCES_ET_TRANSFERT.md).
6. Repères historiques : [premier incrément](LOT2_DEMARRAGE.md), [contrôle 2.1/2.2](LOT2_CONTROLE.md), [socle pur 2.3](LOT2_ETAPE_2_3_SOCLE.md).

La [maquette autonome](maquette-choix-avantage.html) utilise un scénario fictif. Le [ZIP](lot2-preparation.zip) conserve documentation et maquette hors ligne ; [SHA256SUMS.txt](SHA256SUMS.txt) vérifie les fichiers, [TRANSMISSION.json](TRANSMISSION.json) indique les références. Le ZIP ne contient ni code applicatif, PDF ou données privées.

## Publication

[Le dossier déjà publié](https://ethoril.github.io/Outil-MJ-Warhammer/docs/lot2/) décrit un état antérieur. La reprise locale raccorde cinq talents et les ressources/usages, sans publier ce dossier ou le moteur. Firebase reste inchangé. Le livre personnel PDF se transfère séparément.

Ne pas pousser, fusionner dans main ou déployer sans instruction explicite du MJ. Le catalogue utile 2.4 et la recette de livraison 2.5 restent à faire.
