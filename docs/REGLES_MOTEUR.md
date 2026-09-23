# Contrat du moteur de règles

Ce document décrit l'état observé lors de l'audit préparatoire du 5 septembre 2026, avant
l'exécution du lot E06. Il ne constitue
pas une transcription officielle de WFRP : aucun livre, numéro de page ou exemple fourni par
le MJ n'est disponible ici. Les mentions « convention » viennent de `PLAN.md` ou des données
éditoriales locales ; elles restent à valider quand elles sont présentées comme règles de table.

## Statuts et sources

| Statut | Sens dans ce document |
|---|---|
| **Code actuel** | Calcul exécuté par le symbole cité ; les tests indiqués sont connus dans le dépôt. |
| **Convention du dépôt** | Choix explicitement arrêté dans `PLAN.md` ou dans les tables locales, sans source officielle vérifiable ici. |
| **Incohérence** | Le code et la convention documentée ne donnent pas exactement le même contrat. Aucun changement silencieux de règle. |
| **Manuel / non implémenté** | Le texte est conservé ou rappelé, mais le moteur ne décide pas et ne modifie pas la partie. |
| **À vérifier** | Règle, égalité ou exemple nécessitant une référence précise et une validation du MJ avant automatisation. |

Sources utilisables : les symboles des fichiers `js/`, les tests `tests/`, les tableaux
`js/data/rules.js` et `js/data/crits.js`, et les conventions arrêtées dans `PLAN.md`
(notamment §§6.6, 7.3 et 13.3–13.5). `js/data/rules.js` est une aide éditoriale locale :
son introduction « Livre de base … 4e édition » ne fournit pas de référence contrôlable.

## Jet simple : score, d100 et DR

| Élément | Contrat constaté |
|---|---|
| Jet | `d100()` dans `js/core/dice.js` produit un entier uniforme de 1 à 100. |
| Score de base | `parseInt(DiceLine.base)` dans `js/ui/dice-line.js`; une valeur absente/non numérique devient 0. |
| États pénalisants | `Sonné`, `Aveuglé`, `Exténué`, `Brisé` valent chacun −10 ; le code compte les noms présents, pas les niveaux. |
| Qualité Précise | `applyTargetBonus()` dans `js/core/roll-qualities.js` ajoute +10 après ces malus et borne le score à 0 par le bas. |
| Réussite | `roll <= target` dans `runDiceLine()` ; sinon échec. |
| DR | `SL(target, roll) = floor(target / 10) − floor(roll / 10)` dans `js/core/dice.js`. Le résultat peut être négatif. |

Exemples exécutés par `tests/dice.test.js` : `SL(50,23)=3`, `SL(50,50)=0`,
`SL(50,51)=0`, `SL(50,60)=-1`, `SL(50,100)=-5`. `tests/roll-qualities.test.js`
couvre `45 + Précise = 55`, le bornage d'un score négatif et le dédoublonnage d'une
qualité répétée.

**Limites et arbitrages.** Le code ne pose pas de réussite automatique sur 01, ni d'échec
automatique sur 100 ; il applique seulement la comparaison. Le score n'est pas borné à 100 :
une combinaison de score et bonus pourrait donc rendre 100 réussi. `PLAN.md` présente 100
comme « toujours un échec » dans le commentaire de `getReverseRoll`, mais ne fournit pas de
contrat de score automatique. C'est une incohérence à trancher en E06 avant le moteur E12.
La formule de DR est une convention de table documentée dans le code/tests, sa source officielle
et ses règles de réussite critique restent à vérifier.

## Doubles, critiques et maladresses

| Cas | Code actuel | Tests connus |
|---|---|---|
| Double | `isDouble(n)` est vrai pour 11, 22, …, 99 et pour 100 traité comme `00`; faux pour 10 et 42. | `tests/dice.test.js` (11, 55, 99, 100, 10, 42). |
| Critique normal | `isCriticalRoll()` considère un double critique ; `runDiceLine()` ne l'affiche que si le jet est réussi. | `tests/roll-qualities.test.js` (33, 100). |
| Empaleuse | Avec le moteur `expanded-critical`, tout multiple de 10 ou double est critique sur réussite. | Tests 30/33/37/100/10 dans `tests/roll-qualities.test.js`. |
| Maladresse normale | `isFumbleRoll()` considère un double maladresse ; l'UI ne l'affiche que sur échec. | Tests 99 et jets ordinaires. |
| Dangereuse | Sur un échec non-double, un 9 en dizaine ou unité déclenche une maladresse. | Tests 91, 49, 42 et 100. |
| Acharnement | Dans `runDiceLine()`, une réussite contre une cible à `hp <= 0` devient critique même sans double ; le jet de gravité reçoit +10, plafonné à 100. | Pas de test dédié dans la suite consultée. Convention explicitement arrêtée dans `PLAN.md` §7.5 / `js/data/rules.js`. |

`isCriticalRoll()` et `isFumbleRoll()` sont des fonctions de classification : elles ne
connaissent pas la réussite/échec et l'appelant leur passe le contexte. Les tables critiques
sont choisies par `getCritEffect(key, roll)` dans `js/core/dice.js` et contiennent 20
seuils par localisation dans `js/data/crits.js`. L'UI affiche le nom et le texte de l'effet ;
elle n'applique pas automatiquement les blessures, états, morts ou tests secondaires décrits
dans ces textes.

Le choix « 100 = double/00 » est une convention explicitement arrêtée dans `PLAN.md` §6.6
et effectivement implémentée. Il ne faut pas en déduire une règle officielle sans source
fournie. La question « critique sur réussite seulement » est appliquée par l'UI, pas par les
helpers purs ; E12 devra conserver ce contrat dans un résultat testable.

## Localisation et table critique

### Touche ordinaire

`getReverseRoll(roll)` inverse les chiffres de l'attaque ; 04 devient 40, 10 devient 01,
et 100 reste 100. `runDiceLine()` utilise ensuite `getLocationName(reverse)`.

| Jet après inversion | Localisation | Clé moteur / armure |
|---:|---|---|
| 01–09 | Tête | `HEAD` / `armor.head` |
| 10–24 | Bras gauche | `ARM` / `armor.arms` |
| 25–44 | Bras droit | `ARM` / `armor.arms` |
| 45–79 | Corps | `BODY` / `armor.body` |
| 80–89 | Jambe gauche | `LEG` / `armor.legs` |
| 90–100 (`90–00` dans le texte) | Jambe droite | `LEG` / `armor.legs` |

Les bornes sont couvertes par `tests/dice.test.js` (9/10, 24/25, 44/45, 79/80, 89/90,
100) ; l'inversion est couverte par 23→32, 04→40, 10→01 et 100→100.
`js/data/rules.js` reprend les mêmes seuils et décrit cette inversion comme une règle de
localisation, mais sans référence précise vérifiable. La convention « bras gauche/droit
retombent sur une seule armure `arms` » est un choix de modèle, pas une localisation
latéralisée.

### Critique

Pour un critique, `runDiceLine()` lance un d100 indépendant de localisation, puis un second
d100 indépendant de gravité (`getCritEffect`). Pour Acharnement, seul le second jet reçoit
+10. Les effets `eff` de `js/data/crits.js` restent du texte à arbitrer ; les tests connus
vérifient seulement la première et la dernière ligne HEAD et une clé absente
(`tests/dice.test.js`). L'effet exact de chaque ligne, sa source et ses tests secondaires
sont donc **à vérifier** avant automatisation.

## Dégâts

`computeDamage()` dans `js/core/damage.js` reçoit : `weaponDamage`, `sl` (DR), `roll`,
`targetToughnessBonus` (BE), `targetArmour` (PA de la localisation) et `qualities`.
Le calcul actuel est :

```text
base = dégâts de l'arme + Pointue(1) + Imprécise(-1)
déUnités = roll % 10, avec 0 → 10
DR_effectif = max(déUnités, DR) si Dévastatrice, sinon DR
bonusPercutante = déUnités si Percutante ou Impact
brut = base + DR_effectif + bonusPercutante
absorption = BE + PA × 2 si Inoffensive, sinon BE + PA
net = brut − absorption
final = net si net > 0 ; 0 si Inoffensive ; sinon 1 (plancher de touche)
```

Les constantes `PLANCHER_TOUCHE = 1` et `FACTEUR_INOFFENSIVE = 2` sont nommées dans le
code conformément à la convention arrêtée dans `PLAN.md` §7.3. Exemples couverts par
`tests/damage.test.js` : 6 + 2 − (3 + 2) = 3 ; 4 + 1 − (3 + 4) = −2 → 1 ; égalité
brute/absorption → 1 ; Inoffensive PA 2→4 et, avec 4 − (3+4) = −3, 0 ; DR −1 conservé ;
cible sans E/armure tolérée. `tests/keywords.test.js` ajoute roll 35 (dé d'unités 5),
Percutante et Dévastatrice.

Dans l'interface, le calcul ne s'affiche que sur une réussite avec une cible sélectionnée et
une ligne possédant `damage` (le modèle donne actuellement 0 par défaut, donc le test de
présence est presque toujours vrai). Le bouton d'application soustrait les PV, écrit au journal
et ajoute `À Terre` si les PV passent à 0 ou moins. Il ne déclenche pas les effets du tableau
critique et ne fusionne pas encore la mutation dégâts + états en une commande atomique.

La formule et le plancher sont des conventions explicitement arrêtées ; leur référence
officielle n'est pas fournie. `BE = floor(caracs.E / 10)` et la réduction des bras/jambes
sur `arms`/`legs` sont des conventions de modèle observées dans `runDiceLine()`, à valider
si une table distingue autrement ces valeurs.

## Qualités et aliases

Le contrat de données des lignes est `qualities: [{ id, rating? }]` dans `DiceLine`
(`js/core/models.js`). Les chaînes historiques sont normalisées par slug dans les moteurs.
Le registre mécanique réel de `js/data/keyword-engines.js` est :

| ID / alias présent dans le code | Effet exécuté | Couverture |
|---|---|---|
| `inoffensive` | PA ×2 et suppression du plancher | `tests/damage.test.js`, `tests/keywords.test.js` |
| `percutante`, `impact` | dé d'unités ajouté aux dégâts | `tests/keywords.test.js` |
| `devastatrice` | `max(déUnités, DR)` | `tests/keywords.test.js` |
| `pointue`, `imprecise` | dégâts bruts +1/−1 | `tests/keywords.test.js` |
| `precise` | score cible +10 | `tests/roll-qualities.test.js` |
| `empaleuse` | critique aux multiples de 10 sur réussite | `tests/roll-qualities.test.js` |
| `dangereuse` | maladresse sur échec contenant un 9 | `tests/roll-qualities.test.js` |

Le fallback `js/data/keywords-fallback.json` contient 31 libellés éditoriaux. Les autres
mots-clés sont lisibles et sélectionnables, mais non calculés. Le texte du Sheet/fallback est
donc un rappel humain, jamais une source de logique. Les textes signalent notamment les paires
Percutante/Impact, Pénétrante/Perforante et Entrave/Immobilisante, mais seuls les aliases
codés ci-dessus sont effectifs.

**Incohérence à traiter en E06.** `activeEngines()` dédoublonne les slugs identiques, mais
`impact` et `percutante` restent deux entrées du registre qui portent le même moteur ;
`computeDamage()` ne dédoublonne pas les qualités avant d'appliquer les modifications
`Pointue`/`Imprécise`. Les tests prouvent seulement qu'Impact et Percutante donnent un
même moteur, pas que toute combinaison répétée est canoniquement réduite. E06 doit définir la
canonicalisation et les aliases ; E12 doit tester l'effet une seule fois.

## États, niveaux et durées

Les noms actuellement proposés sont `Blessé`, `À Terre`, `Sonné`, `Inconscient`, `Aveuglé`,
`Assourdi`, `Exténué`, `Hémorragique`, `Surpris`, `Enchevêtré`, `Enflammé` et `Brisé`
(`js/data/states.js`). Dans le modèle, un état est encore une chaîne : `Nom` ou `Nom|N`,
analysée par `parseState()` dans `js/core/sanitize.js`. Une durée invalide ou 0 devient
`null`; une chaîne sans durée est persistante pour ce helper. Plusieurs niveaux sont
représentés par plusieurs occurrences, et non par un champ `level`.

| Calcul de fin de tour | Entrées | Exemple/test connu | Limite |
|---|---|---|---|
| Hémorragique | chaque occurrence du nom, PV courants | 2 occurrences, 10 PV → −2 et 8 (`tests/states.test.js`) | Le nombre d'occurrences sert de niveau, même si les durées diffèrent. |
| Enflammé | occurrences, `d10Roll`, `floor(E/10)`, plus petite PA | E=35, PA min=1, 2 niveaux, jet 5 → 3 dégâts (`tests/states.test.js`) | `createCombatEngine` tire via un d100 puis modulo 10 ; le calcul est déterministe une fois le jet fourni, mais la formule et le cumul restent à valider. |
| Surpris | nom exact | disparaît en fin de tour (`tests/states.test.js`) | Pas de source/échéance séparée. |
| Durée finie | `Nom|N` | `Sonné|2` → `Sonné|1`, `Aveuglé|1` expire (`tests/states.test.js`) | Moment d'expiration et cumul de niveaux n'ont pas de contrat officiel. |
| Inconscient périodique | PV après dégâts périodiques ≤0 | ajouté si absent (`tests/states.test.js`) | `À Terre` n'est pas ajouté par cette fonction ; le chemin d'application des dégâts UI le fait séparément. |

`computeEndOfTurn(p, d10Roll)` dans `js/core/combat.js` retourne un nouvel état calculé
(`hpDelta`, `newHp`, `nextStates`, `logs`) ; il ne mutile pas `p`. En revanche, le moteur
applique ensuite des patches séparés au Store. La migration E06 demandée par
`PLAN_EVOLUTION.md` doit conserver exactement les données historiques avant de séparer
niveau, durée, source et échéance. La matrice de cumul, le moment de décrémentation et la
portée persistante/temporaire sont **à vérifier** ; ne pas inventer une règle à partir du seul
libellé du tableau critique.

## Tests opposés, égalités et Avantages

Le parcours actuel est un test simple : une ligne possède un score, un d100 est tiré, le
résultat est comparé et un DR est calculé. Aucun moteur d'opposition, résultat de défense,
égalité, choix de gagnant/perdant ou conservation d'un second jet n'est présent dans
`js/core/`. Les anciens champs d'opposition mentionnés dans le plan historique ne font pas
partie du modèle actuel. Les occurrences « test opposé » de `js/data/rules.js` et du fallback
sont du texte éditorial.

Il n'existe pas non plus de donnée ou calcul d'Avantage dans `Profile`, `Participant`,
`DiceLine` ou le Store. Les qualités `Croche-Pied`, `Défensive`, `Déséquilibrée`,
`Lent`, `Rapide`, `Protectrice`, `Piège-lame` et autres effets dépendant d'une défense
restent des rappels manuels. `PLAN_EVOLUTION.md` demande explicitement de ne choisir aucun
bonus d'Avantage automatique avant convention individuelle/groupe et validation.

E12 devra donc accepter deux entrées équivalentes (dé virtuel ou résultat saisi 1–100, avec
`00` converti en 100), préserver le test simple et proposer la défense/résolution manuelle
tant que E06 n'a pas validé une règle d'opposition. Les cas minimaux à verrouiller sont :
victoire, défaite, égalité, cible absente, 00/01/100, et changement de cible sans relancer un
jet déjà saisi. Aucun exemple chiffré d'opposition ou d'Avantage n'est fourni dans le dépôt :
ils restent **à vérifier**.

## Matrice de capacité et plan de tests

| Capacité | Mode E06/E12 | Décision actuelle | Test à ajouter ou maintenir |
|---|---|---|---|
| d100, score, DR, malus d'états | **Automatique** | Fonctions pures et test simple conservés | `tests/dice.test.js` + résultat identique jet saisi/tiré dans E12 |
| Double/100, Empaleuse, Dangereuse | **Automatique borné** | Automatiser selon helpers ; vérifier réussite/échec dans le résultat | 00, 01, 10, 99, 100, doublons et limites de score |
| Localisation ordinaire | **Automatique** | Inversion puis table existante | Toutes bornes + 100 ; exemples validés par le MJ |
| Localisation/gravité critique | **Automatique + rappel** | Deux jets séparés ; Acharnement +10 | Critique normal, Acharnement, tables bornes ; effets non appliqués automatiquement |
| Dégâts et Inoffensive | **Automatique + validation MJ** | Formule et bouton d'application | `tests/damage.test.js`, qualité inconnue, DR négatif, 0 PV, application unique |
| Qualités sans moteur | **Rappel** | Afficher libellé/texte, ne pas calculer | Mot-clé inconnu lisible et sans mutation |
| Aliases de qualités | **Automatique après canonisation E06** | Seul `impact` est relié effectivement | Paires et répétitions appliquées une seule fois |
| États périodiques | **Automatique borné** | Fin de tour pure sur chaînes historiques | niveaux multiples, durées distinctes, expiration et migration atomique |
| États critiques et effets secondaires | **Rappel / manuel** | Le texte critique est affiché | Aucun effet narratif automatique sans contrat |
| Test opposé et égalité | **Manuel** | Aucun calcul actuel | E12 : saisir les deux résultats et arbitrer selon contrat E06 |
| Avantages et défense | **Manuel** | Aucune donnée ni bonus par défaut | Ne pas activer avant choix de convention et tests de groupe/individuel |

Les tests E06 doivent porter sur des fonctions déterministes, migrations et exemples chiffrés.
Les tests E12 doivent vérifier que le même résultat saisi et tiré produit le même objet de
résolution, que le jet enregistré n'est pas relancé par annulation, et qu'un cas manuel reste
explicitement manuel. Toute source officielle ou exemple du MJ ajouté ultérieurement doit être
référencé ici avant d'élargir la colonne Automatique.
