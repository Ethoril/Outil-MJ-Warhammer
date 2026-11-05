# Proposition : un vocabulaire d'effets unique pour talents, prières et sorts

Note du 02/11/2026 (Claude, session d'analyse, aucun code modifié). À reprendre par la session qui corrige la recette G, **après** ses lots en cours.

## Question du MJ

Le code a-t-il codé les effets un à un (talent par talent, sort par sort), ou recensé des micro-interactions primaires (« +X à tel test », « applique tel État »…) pour décrire chaque élément comme une combinaison de briques ? Le but : intégrer facilement les **suppléments à venir** (le MJ confirme que d'autres livres seront ajoutés).

## Constat mesuré (main c3daf3b, 3.34.0)

Le code est hybride. Les couches basses sont partagées : États (`js/core/v5-effects.js`), dégâts, et couches actives (prières et sorts écrivent les mêmes `testModifiers` relus par `v5-magic-effects.js`). Le doublon est dans le vocabulaire du haut.

| | Talents | Prières | Sorts |
|---|---|---|---|
| Données | `js/data/v5-*talent-contracts.json` | `js/data/v5-divine-contracts.json` | `js/data/v5-spell-contracts.json` |
| Éléments | 131 contractualisés (214 dans la couverture) | 207 | 400 (engine 258, mjInput 62, narrative 80) |
| Briques | 35 opérations × 13 événements, évaluateur générique (`talent-contracts.js`, `talent-contract-v2.js`) | 28 types, registre `v5-divine-effect-handlers.js` | 14 types, dont `special` (190) fourre-tout et `narrative` (79) |
| Hors briques | 41 `activateTalent` (renvoi vers du code dédié) ; 56 IDs de talents en dur dans 15 modules `v5-talent-*.js` | 11 `special-state` | `specialState` : 95 drapeaux, dont 76 propres à un seul sort ; 91 sont lus un par un dans `v5-magic-*.js` |

Familles de micro-interactions présentes dans au moins deux moteurs sous des noms différents (8 sur une douzaine) :

- modificateur de test : `modifySL`, `grantAdvantage`, `suppressTestPenalty`… (talents) / `test-modifier` (prières) / `testModifiers` (sorts) ;
- caractéristique : `characteristic-modifier` / `stat-modifiers` ;
- dégâts : `modifyDamage`, `replaceDamage` / `weapon-bonus`, `direct-damage`, `ordinary-damage` / `damage`, `magic-missile`, `weaponBonus` ;
- États : acquisition, retrait, immunité, verrou (trois formes) ;
- armure : `ignoreArmourFlaw` / `armor-bonus` / `armor`, `ward` ;
- soins : `modifyHealing` / `wound-heal`, `heal-critical` / `healing`, `resurrection` ;
- octroi de talent ou de trait : `grant-talent`, `grant-trait` / `traits`, `talents` ;
- invocation : `summon-creature` / `summon`.

Propres aux talents : qualités d'arme, couvert, Élan, critique.

**Différence de fond** : les talents sont évalués à un événement avec conditions (« avant le jet, si en charge, avec telle arme ») et un cumul explicite (`stackGroup`, `add`/`max`). Les couches de prières et de sorts ne portent qu'un modificateur par clé de compétence, sans condition ni groupe de cumul. Faute de mieux, une condition de sort devient un drapeau `specialState` avec son code dédié.

## Gains attendus d'une unification

- **Performances** : aucun. Peu de combattants et d'effets par jet ; le coût est dans l'interface et la synchronisation Firebase.
- **Bugs** : gain à terme, avec une correction par micro-interaction et des cumuls cohérents entre sources. Risque à court terme : la migration touche la prod, et 162 des 216 fichiers de test touchent ces moteurs. Une brique commune cassée casse tout.
- **Maintenance** : gain net avec les suppléments. Un nouvel élément s'écrit en JSON avec des briques connues, ce qui est plus facile à déléguer (GLM, GPT) et à contre-vérifier. Il n'y aurait plus qu'un vocabulaire au lieu de trois (et au lieu de deux schémas de talents v1/v2). Le code sur mesure reste pour les effets réellement uniques (Tourbillon, Terreur, les 76 drapeaux à sort unique).

## Proposition

Pas de refonte en bloc de l'existant. Ordre proposé :

1. **Test de cumul (préalable, petit)**. Écrire un test qui combine, sur le même Test de compétence, un talent, une prière et un sort qui le modifient tous. Le résultat doit respecter les règles de cumul V5 (à confirmer dans le livre de base, pas à déduire du code). Un vrai bug justifie à lui seul le lot 2 ; sinon, le lot 2 se fait au rythme des suppléments.
2. **Schéma d'effet commun** (gros chantier, skill `cadrer-feature`). Reprendre l'évaluateur des talents (événement, rôle, conditions, opération, cumul) et y ajouter un **porteur** : talent permanent, ou couche à durée créée par une prière ou un sort. Les couches existantes restent lisibles pendant la transition.
3. **Nouveau contenu des suppléments** : écrit directement dans le schéma commun. C'est le gain principal.
4. **Migration des prières** : 28 types vers les opérations communes, conversion presque mécanique, déléguable avec un test d'acceptation par type.
5. **Sorts** : on ne migre que ce qu'on touche. On remonte en briques les drapeaux `specialState` réutilisés par plusieurs sorts (19 drapeaux) ; les 76 à sort unique restent du code dédié.

Critère de réussite global : ajouter un talent, une prière ou un sort d'un supplément qui n'utilise que des micro-interactions connues ne demande aucune ligne de JS, seulement du JSON et son test.

## Points à trancher par le MJ

- Lancer le test de cumul (étape 1) dès la fin de la recette G ?
- Ordre de priorité entre ce chantier et le prochain supplément à intégrer.
