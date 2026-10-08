# Reprise du lot 2 sur une autre machine

Dossier préparé le **8 octobre 2026**. Il rassemble le cadrage, l’inventaire, l’état du premier incrément, le découpage convenu et la maquette approuvée par le MJ.

## Récupérer le code commencé

La branche **`codex/lot2-talents-v5`** porte le chantier. Son socle initial est le commit **`7477421e937d73ba4d3cf81b1c8582c0c8315544`**, depuis **`28657e39477bbcbfeb0de826b3f1d05e525bb386`**, version applicative 3.12.3. La branche contient ensuite ce dossier de transmission.

Pour une nouvelle installation :

```sh
git clone --branch codex/lot2-talents-v5 https://github.com/Ethoril/Outil-MJ-Warhammer.git
cd Outil-MJ-Warhammer
npm ci
npm test
```

Pour un dépôt déjà présent et propre :

```sh
git fetch origin
git switch --track origin/codex/lot2-talents-v5
```

Si la branche existe déjà, la sélectionner puis vérifier son suivi distant. Si le dépôt contient des modifications, les conserver et créer un worktree isolé depuis la branche distante. Ne pas réinitialiser le travail local.

Node.js et npm sont nécessaires. `npm ci` reconstruit les dépendances ; aucun chemin de runtime ni dossier node_modules de la machine d’origine n’est requis. La dernière recette du socle a exécuté **468 tests tous réussis**, dont **62 nouveaux**. La maquette a été testée dans Edge à 800 et 360 px.

**Ne pas reprendre uniquement depuis `main`** : `main` reçoit le dossier de consultation ; les quatre modules de moteur et leurs tests restent sur la branche de chantier.

## Lire dans cet ordre

1. [REPRISE_AGENT.md](REPRISE_AGENT.md) : contexte et consigne à donner à l’agent.
2. [LOT2_ETAPES.md](LOT2_ETAPES.md) : six étapes, prochaine étape 2.1.
3. [LOT2_CADRAGE.md](LOT2_CADRAGE.md) : périmètre, règles, architecture et décisions.
4. [LOT2_DEMARRAGE.md](LOT2_DEMARRAGE.md) : incrément réalisé et limites.
5. [LOT2_CONTRATS_MOTEUR.md](LOT2_CONTRATS_MOTEUR.md) : schéma exécutable.
6. [LOT2_INVENTAIRE_TALENTS.md](LOT2_INVENTAIRE_TALENTS.md) et [JSON](LOT2_INVENTAIRE_TALENTS.json) : 206 identités et neuf exemples préparatoires.
7. [SOURCES_ET_TRANSFERT.md](SOURCES_ET_TRANSFERT.md) : sources et éléments à actualiser.

La [maquette autonome](maquette-choix-avantage.html) s’ouvre directement ou depuis un serveur statique. Son fragment éditable est `maquette-choix-avantage.fragment.html`. Son scénario est fictif, sans donnée de séance.

Le [ZIP du dossier](lot2-preparation.zip) conserve les documents et la maquette hors ligne. **Il ne contient pas le code de l’application**, à récupérer depuis la branche Git. `SHA256SUMS.txt` vérifie les fichiers ; `TRANSMISSION.json` indique les versions de référence.

## Publication

Consultation : https://ethoril.github.io/Outil-MJ-Warhammer/docs/lot2/

Seul `docs/lot2/` est publié sur main. Cette transmission ne raccorde pas le moteur au combat et ne modifie pas Firebase. Le livre PDF personnel doit être transféré séparément. Les fichiers temporaires et la conversation d’origine ne sont pas nécessaires à la reprise.
