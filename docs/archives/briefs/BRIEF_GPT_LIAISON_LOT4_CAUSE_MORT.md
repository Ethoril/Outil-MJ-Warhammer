# Brief — liaison RPG Map Display, lot 4 (outil MJ) : cause de la mort (pour ChatGPT / Codex)

Quand un participant meurt, l'« Outil MJ Warhammer » envoie déjà `fx.death { ref, cause }` à RPG Map Display. Mais `cause` vaut toujours `'blood'`. Tu fais en sorte que l'outil **enregistre la vraie cause au moment de la mort**, et que la liaison l'envoie. La carte joue une animation différente selon la cause. Tâche de taille moyenne, côté outil MJ seulement : **tu ne touches pas au dépôt `rpg-map-display`**.

## Lis d'abord

Lis ces documents dans `E:/Outil MJ Warhammer/docs/` :
- `CONTRAT_LIAISON_MAP_DISPLAY.md` §9.2 : les six causes et leur origine.
- `BRIEF_GPT_CORRECTIONS_RECETTE_G.md`, section 1 : **toutes ses règles de travail s'appliquent**. En particulier : **aucune règle de jeu ne change**. Tu ajoutes une étiquette à une mort qui arrive déjà ; tu ne changes ni quand ni comment on meurt.
- Ton rapport précédent, `tmp/lot2-images-worktree/docs/RAPPORT_GPT_LIAISON_LOT2.md`.

**Base** : `1fe91ac` (branche `dev/recette-plateau-04-11`).

```bash
git worktree add -b codex/liaison-lot4-cause-mort tmp/lot4-cause-worktree 1fe91ac
```

Lance ensuite `npm ci` dans le worktree.

## 1. La cible

**Champ** : `participant.extensions.v5.deathCause`, à l'une de ces valeurs :

| Valeur | Cause |
|---|---|
| `'blood'` | arme, coup ou critique ordinaire, Hémorragique ; **valeur par défaut** |
| `'fire'` | Enflammé, sort ou dégâts de feu |
| `'magic'` | sort ou effet magique sans élément identifié, fin d'un effet qui tue, Incident, effet divin |
| `'poison'` | Empoisonné, poison, maladie |
| `'decapitation'` | critique mortel qui tranche la tête |
| `'dismemberment'` | critique mortel qui arrache ou tranche un membre |

**Quand l'écrire** : au moment exact où le code pose déjà `extensions.v5.dead = true`, avec la cause connue à cet endroit. Points repérés, à compléter par ta propre recherche : `grep -n "dead: *true\|\.dead = true"` dans `js/core` et `js/core/store`.

| Endroit | Ce qui s'y passe |
|---|---|
| `js/core/resolution.js` ≈ :1801, :1806, :2243 | mort par résolution d'attaque, issue létale |
| `js/core/v5-critical-aftermath.js` ≈ :146, :167, :204 | suites de critiques |
| `js/core/v5-divine-effects-damage.js` ≈ :236 | effet divin |
| `js/core/v5-magic-effects.js` ≈ :827 | effet qui tue à son expiration |
| `js/core/v5-magic-miscasts.js` ≈ :786 | Incident |
| États qui retirent des PV en fin de tour (Enflammé, Empoisonné, Hémorragique) | à localiser. Si un état fait tomber à 0 PV et que la mort s'ensuit, c'est sa cause |

**Règles** :
- Une mort déjà marquée garde sa cause. Ne pas l'écraser si `dead` était déjà vrai.
- `deathCause` ne se lit que si `dead === true` (règle du contrat). Pas besoin de l'effacer à la résurrection.
- **Décapitation et démembrement** : seulement pour des critiques dont le texte de la table dit explicitement que la tête est tranchée ou qu'un membre est arraché ou tranché, dans les données de critiques (`js/core/criticals.js` et les JSON qu'il charge). **N'invente rien** : liste dans ton rapport les identifiants de critiques retenus, avec la citation courte qui justifie chaque choix. Le MJ arbitrera. Dans le doute, la cause est `'blood'`.
- **Feu** : si les dégâts mortels viennent d'un sort, `'fire'` seulement si le sort est identifiable comme du feu par une donnée existante (mot-clé, élément, nom de domaine). Sinon `'magic'`. Ne parse pas de texte libre au hasard ; dis dans le rapport sur quoi tu t'appuies.

**Envoi** : dans `js/core/map-link-state.js`, `tokenStateOf` ajoute `deathCause`.
- C'est la valeur de `extensions.v5.deathCause` si `dead` est vrai, `null` sinon.
- Dans `js/core/map-link.js`, `effectsOf` l'utilise déjà (`next.deathCause || 'blood'`). Vérifie-le par un test.

## 2. Tests attendus (`node --test`)

Écris d'abord un test qui échoue. Ensuite :
- **Une mort par chemin modifié** : au moins un test par endroit du tableau, qui vérifie `dead` (inchangé) et `deathCause`, avec la cause attendue. Réutilise les jeux de données des tests existants de ces modules (`tests/unit/...`).
- **Pas d'écrasement** : un participant déjà mort, frappé de nouveau, garde sa première cause.
- **Liaison** : `token.state` porte `deathCause` quand le participant est mort, et `fx.death` porte la bonne cause. Utilise le faux canal de `tests/unit/combat/liaison-carte-canal.test.js`.
- **Non-régression** : `node --test "tests/unit/combat/*.test.js" "tests/unit/stockage/*.test.js"` doit rester vert (environ 1 540 tests au départ). Ajoute les suites des modules touchés (`magie`, `divin`…) et donne leurs comptes.
- **Mutation** : sur au moins deux règles (le non-écrasement et une cause précise), casse le code, constate que le test passe au rouge, remets le code, et note-le dans le rapport.

## 3. Hors périmètre

- Le dépôt `rpg-map-display` et les animations elles-mêmes.
- La blessure d'une monture (`fx.wound` avec `target: 'mount'`, lot 3).
- Toute modification des règles de mort, des tables de critiques ou des dégâts.
- `sw.js`, sauf si tu crées un module (dans ce cas, ajoute-le au précache et signale-le).

## 4. Rapport final

Rédige `docs/RAPPORT_GPT_LIAISON_LOT4.md` dans ton worktree :
- les fichiers modifiés ;
- pour chaque endroit de mort, la cause retenue et pourquoi ;
- la liste des critiques de décapitation et de démembrement, avec leurs citations ;
- les cas restés à `'blood'` faute de donnée fiable ;
- les tests et les mutations faits ;
- les commandes lancées et leurs résultats.

Commite dans ta branche, sans pousser.
