# U8 · Plan

## Approche

Ne pas réécrire : **généraliser l'évaluateur des talents**, le seul qui ait déjà événement, rôle, conditions, opération et cumul explicite (`core/talent-contract-v2.js`), et y faire entrer les autres familles par des **adaptateurs** qui produisent des clauses du même format. Le pivot `buildCombatTest` reste le point d'entrée ; il ne lit plus quatre sources hétérogènes mais une liste de clauses déjà cumulées.

Trois temps :
1. **Corriger le cumul existant** (lots L0-L1) : le meilleur bonus / la pire pénalité des sorts se calculent par **Test résolu**, pas par clé. Valeur immédiate, sans attendre le schéma.
2. **Schéma commun et agrégateur** (L2-L5) : un « porteur » ajouté aux clauses, des politiques de cumul nommées d'après les règles du livre, les familles branchées une à une.
3. **Au rythme des suppléments** (L6-L8) : prières migrées type par type, drapeaux de sorts partagés remontés en briques, nouveau contenu écrit directement dans le schéma.

## Modèle de données

Clause commune = clause v2 des talents + un porteur :

```
clause  : { id, event, role, when[], effects[], bearer }
bearer  : { kind: 'talent'|'prayer'|'spell'|'condition'|'trait'|'quality'|'mount'|'situation'|'gm',
            sourceId, layerId?, casterId?, expiry? }
effect  : { op, amount?, key?, target?, stackGroup, stack }
stack   : 'unique' | 'add' | 'max'            (existants)
        + 'bestBonusWorstPenalty'             (R3 sorts : par cible de Test résolue)
        + 'strongest'                          (États : la plus forte pénalité)
```

- `target` : cible de Test **normalisée** avant tout cumul (compétence + spécialité, caractéristique, « tous les Tests », « adverse »), en reprenant la table de `testKeyApplies` (`v5-magic-talents.js:120-131`). C'est ce qui corrige CA1-CA2.
- Les politiques de cumul entre **groupes** (prière contre sort, État contre sort…) sont une table de données, remplie avec les réponses du MJ (Q1-Q5). Une paire absente de la table produit un signalement (CA5), jamais une somme.
- Les couches stockées (`spellEffects`, `divineEffects`, `states`) ne changent pas de format : les adaptateurs les lisent (CA11-CA12). Aucune migration de sauvegarde.

## Fichiers

| Fichier | Rôle | Chaud ? |
|---|---|---|
| `js/core/effect-engine.js` (**nouveau**) | validation des clauses avec porteur, normalisation des cibles, politiques de cumul, `collectTestEffects(actor, ctx)` | non |
| `js/core/talent-contract-v2.js` | délègue validation et cumul à `effect-engine.js` ; garde son API | non |
| `js/core/v5-magic-effects.js`, `v5-magic-talents.js` | L1 : cumul par cible résolue ; puis adaptateur couches → clauses | non (mais lus par toute la magie) |
| `js/core/v5-divine-store.js` | DIV-05 lu depuis la table de politiques | non |
| `js/core/v5-combat-rules.js` | `buildCombatTest` consomme `collectTestEffects` | **tiède** : un seul écrivain par vague |
| adaptateurs : `creature-movement.js`, `creature-senses.js`, `outnumbering.js`, `v5-mounted-combat.js`, `keyword-engines` | exposent des clauses à la place de `{id,label,amount}` | non, parallélisables |
| `js/core/resolution.js` | plafonds de prière, montures en amont : seulement si Q5 l'exige | **chaud** |
| `js/ui/resolution-panel/result.js` | CA6-CA7 (source, « non cumulé ») | non |
| `js/core/store.js`, `js/ui/workspace-view.js` | **non touchés** par le plan | chauds, évités |
| `docs/specs/moteur-effets-unifie/briques.md` | CA10, généré depuis le validateur | — |

## Vérification par critère

| CA | Vérification |
|---|---|
| CA1-CA2 | `tests/unit/moteur/cumul-effets.test.js`, nouveaux cas rouges aujourd'hui (L0) |
| CA3 | même fichier, les 9 cas inchangés |
| CA4-CA5 | `tests/unit/moteur/cumul-familles.test.js` : un test par ligne de la table du MJ ; un cas non arbitré attend un signalement |
| CA6-CA7 | test unitaire du rendu de `result.js` + un parcours navigateur court sous `timeout 120` |
| CA8 | `tests/unit/moteur/supplement-sans-js.test.js` : charge un JSON de test (talent, prière, sort fictifs à briques connues) et vérifie leurs effets ; `git diff --stat -- 'js/**/*.js'` vide pour ce lot |
| CA9 | même fichier : brique inconnue → erreur nommant élément et champ |
| CA10 | `briques.md` régénéré par script ; test qui échoue si une opération du validateur n'y figure pas |
| CA11 | test de rechargement d'une sauvegarde figée (fixture) : mêmes DR avant et après |
| CA12-CA13 | suites ciblées par lot ; suite complète à la fusion de la vague |

## Confrontation aux principes

Pas de `CLAUDE.md` dans le dépôt : principes pris dans le `CLAUDE.md` global et la mémoire du projet.
- **Règles du livre, jamais pliées aux tests** ; questions de règles posées au MJ, jamais inventées → table de politiques remplie par le MJ, signalement par défaut (CA5).
- **Contre-vérification code + règles** avant publication d'un lot délégué → chaque lot finit par un `verifier` code et une relecture des pages citées.
- **Tests ciblés en session, suite complète à la fusion** → commandes d'acceptation limitées au fichier du lot.
- **Méthode la plus économe** → L1 corrige le bug sans attendre le schéma ; migrations mécaniques (prières) déléguées à GLM avec un test par type.
- **« Ne pas implanter » = ne rien retirer** → les formats existants restent lus ; rien n'est supprimé avant migration complète d'une famille.
- **Simplicité** : on étend l'évaluateur existant plutôt que d'en écrire un deuxième ; pas de moteur pour les familles que rien n'oblige à migrer (sorts uniques, psychologie).

## Complexité justifiée

- **Un nouveau module** (`effect-engine.js`) : le cumul inter-familles n'a pas de propriétaire aujourd'hui ; le mettre dans `talent-contract-v2.js` ferait dépendre prières, sorts et États d'un module « talents ». `talent-contract-v2.js` devient une façade.
- **Deux politiques de cumul nouvelles** (`bestBonusWorstPenalty`, `strongest`) : ce sont des règles du livre déjà codées en dur (trois copies dans `v5-magic-effects.js`, une dans `v5-combat-rules.js`) ; elles remplacent du code, n'en ajoutent pas.
- **Chemins hors pivot** (prière, lancement, Dissipation, fuite…) : non branchés par défaut ; on attend Q6 du MJ plutôt que de tout faire passer par l'agrégateur.

## Proposition pour un futur `CLAUDE.md` du projet

Le choix « toute règle de cumul vient du livre ou d'un arbitrage tracé du MJ ; un cas inconnu est signalé, jamais additionné » revient dans DIV-05, B12, et ici. À écrire dans un `CLAUDE.md` du projet si le MJ le souhaite.
