# Rapport GPT — liaison Map Display, lot 4 : cause de mort

Base `1fe91ac`, worktree `tmp/lot4-cause-worktree`, branche `codex/liaison-lot4-cause-mort`. Aucun changement dans Map Display ni de règle de mort. Ce lot est **partiel** : les limites ci-dessous empêchent d'annoncer les six causes couvertes.

## Changements

- `js/core/map-link-state.js` : `deathCause` est transmis uniquement si `extensions.v5.dead === true`, sinon `null`. `js/core/map-link.js` utilise la valeur ou `blood` par défaut ; commentaire mis à jour.
- `js/core/resolution.js` : mort directe et retour du crâne à l'état inerte à la suite d'une attaque : `blood`, faute de nature élémentaire fiable attachée à ces décisions.
- `js/core/v5-critical-aftermath.js` : mort critique immédiate ou différée et mort subite : `blood` par défaut.
- `js/core/v5-divine-effects-damage.js` : destruction par effet divin : `magic`.
- `js/core/v5-magic-effects.js` : mort à l'expiration ou dissipation d'un effet : `magic`.
- `js/core/v5-magic-turn.js` : Sang Bouillonnant et son explosion après décès confirmé : `fire` (sort du domaine du feu) ; Soleil Violet et étouffement de sort : `magic`.
- `js/core/v5-spell-contracts.js` : transmission de la cause de la victime du vortex ; mort de sort directe : `fire` si le champ structuré `contract.domain` vaut `fire`, sinon `magic`.
- À chaque point modifié, une cause existante est préservée lorsque le marqueur V5 était déjà vrai. Après résurrection (`dead` faux), une nouvelle mort reçoit sa nouvelle cause.
- Tests modifiés : `tests/unit/combat/jets-et-defense.test.js`, `liaison-carte-canal.test.js`, nouveau `liaison-cause-mort.test.js`, `tests/unit/creatures/morphologie-et-capacites-bestiaire.test.js`, `tests/unit/divin/effets-degats-conditions.test.js`, `tests/unit/magie/contrats-domaines.test.js` et `contrats-elfiques-et-vents.test.js`.

## Critiques et données

Aucun identifiant V5 retenu pour `decapitation` ni `dismemberment` : les lignes mortelles V5 ont un texte réduit à « Mort instantanée. ». `HEAD` : « Crâne fracassé », `ARM` : « Démembrement brutal », `BODY` : « Corps déchiré », `LEG` : « Bassin fracassé ». Les intitulés ne précisent pas explicitement la section de la tête ou l'arrachement/la section d'un membre. La table historique `js/data/crits.js` a les noms « Décapitation » et « Démembrement », mais ce n'est pas la table V5 utilisée par `createCriticalAftermathRecord` et son texte ne fournit pas non plus la précision demandée. Aucun rapprochement entre tables n'est inventé. Ces cas restent `blood` ; arbitrage MJ possible.

## Limites à trancher

- `advanceV5Effects` calcule les dégâts d'Enflammé, Hémorragique et Empoisonné et renvoie un reçu `death` ; `v5-turn.js` affiche « décès : vérifier le personnage » mais ne marque pas `extensions.v5.dead`. Même le critique de feu mortel ne fait que proposer le décès. Modifier cela changerait le mécanisme actuel de confirmation ; aucune cause `fire` ou `poison` ne peut donc être enregistrée à un passage à mort V5 qui n'existe pas sur ces chemins.
- L'Incident Cataclysme dans `v5-magic-miscasts.js` pose `participant.dead = true`, pas `extensions.v5.dead`. La liaison ne considère que ce dernier. Le transformer en mort V5 modifierait le comportement demandé inchangé : l'Incident n'émet donc pas `fx.death` avec cette implémentation. Une décision sur l'unification des marqueurs et la confirmation des décès d'état est nécessaire.
- Poison et maladie sans point de mort V5 identifié ne sont pas étiquetés. Les morts de sources non identifiées restent `blood` côté liaison ; les morts déjà enregistrées avant ce lot n'ont pas de cause et gardent également ce repli. Aucun texte libre n'est analysé pour identifier le feu.
- Les deux mutations et tests couvrent les chemins cités ci-dessous, pas toutes les combinaisons de sorts et d'états.

## Vérifications

- Premier test écrit avant correctif : le faux canal attendait `fire`, échouait sur `undefined` ; après correction il vérifie aussi `fx.death` et `null` vivant.
- Les tests ciblés vérifient notamment mort directe, attaque sur une cible déjà morte, retour du crâne, critique confirmé, effet divin, expiration, étouffement magique, Mort rapide, Soleil Violet et Sang Bouillonnant.
- Mutations temporaires restaurées : suppression de la garde de non-écrasement dans la résolution → test d'attaque sur mort rouge (`blood` reçu au lieu de `poison`) ; remplacement de `magic` par `blood` à l'expiration → test rouge. Tests ciblés verts après restauration.
- `npm ci` : réussi, 3 paquets, 0 vulnérabilité. Premier essai refusé par les permissions du cache npm ; nouvelle exécution autorisée réussie.
- `node --test --test-concurrency=4 "tests/unit/combat/*.test.js" "tests/unit/stockage/*.test.js"` : 1 517/1 517 réussis.
- `node --test --test-concurrency=4 "tests/unit/magie/*.test.js" "tests/unit/divin/*.test.js" "tests/unit/sequelles/*.test.js" "tests/unit/creatures/*.test.js"` : 3 461/3 463 réussis ; deux échecs d'audit divin ci-dessous.
- `node --test --test-concurrency=4` : 5 682/5 684 réussis. Les deux mêmes échecs figuraient déjà au rapport lot 2 : E2 attend un chemin relatif commençant par `..` sous Windows ; E0 dépend de `tmp/divin/recipe-receipt.json`, absent dans ce worktree. Pas de parcours navigateur touché.
- `git diff --check` : voir contrôle final avant commit.
