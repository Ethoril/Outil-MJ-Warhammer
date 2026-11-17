# Spec · Miracles et bénédictions narratifs

Cadrage du 16/11/2026, sur `e981ef5` (prod 3.48.1). Aucun code. Le MJ a décidé le 15/11/2026 de traiter ce lot (« classement des restes »). Les questions de règle restent ouvertes : voir la dernière section.

**Pourquoi.** Des prières n'ont dans l'outil qu'un rappel : le MJ lance le Test de Prière, le moteur affiche le texte, mais n'applique aucun effet, ne pose aucune durée suivie et ne propose aucune cible. Le MJ veut réduire ce rappel là où un effet peut être appliqué ou suivi, sans inventer de règle.

## 1. Inventaire exact

**Source de vérité.** Un effet « narratif » n'est pas marqué par un champ `narrative` (cette notion n'existe que pour les clauses des bénédictions du livre de base, `kind: 'narrative'`, `tools/build-divine-clauses.mjs:60`). Le rappel est le **statut de contrat `manual`** dans `js/data/v5-divine-contracts.json` (207 contrats, généré par `tools/build-v5-divine-contracts.mjs` depuis `docs/divin/sources/miracles/*.mjs`). Le moteur le traite ainsi : `js/core/v5-divine-engine.js:560` ajoute le rappel « Prière résolue; effet laissé au rappel MJ selon le contrat source », `:637` renvoie le statut `reminder`, `:695` pose une couche `manual-prayer-reminder` quand la durée est calendaire.

**Répartition des 207 contrats par statut** (comptée sur le JSON) :

| Type | implemented | assisted | manual |
|---|---:|---:|---:|
| Miracles | 8 | 60 | **60** |
| Bénédictions | 69 | 0 | **9** |
| Talent (Béni) | 1 | 0 | 0 |

**Compte réel du lot : 69 prières en simple rappel** (60 miracles + 9 bénédictions). Le « soixantaine » du MJ correspond aux 60 miracles ; les 9 bénédictions s'y ajoutent. Par livre : Livre de base V5 : 23 miracles + 8 bénédictions ; Deft Steps, Light Fingers : 21 miracles ; Archives of the Empire 3 : 11 miracles + 1 bénédiction ; Up in Arms : 2 ; Lustria : 2 ; Power Behind the Throne : 1.

**À part : 60 miracles « assistés »** (effet structuré appliqué, clauses restantes en rappel). 50 d'entre eux gardent 88 clauses `mode: 'manual'` ; 10 n'en gardent aucune. Ils ne font pas partie des 69 (voir Q1).

Convention du tableau : `Fam.` = famille du §2. Fichier déclarant : sous `docs/divin/sources/miracles/` pour les miracles ; les bénédictions viennent du générateur (`tools/build-v5-divine-contracts.mjs`, lignes de bénédictions sans `effect`). Les effets sont la formulation du contrat dans le dépôt (`labels.effect`), abrégée ; toute valeur chiffrée est à confirmer dans le livre avant codage (CA1).

### 1.1 Bénédictions (9)

| Contrat | Livre (p.) | Effet | Fam. |
|---|---|---|---|
| Conscience : Myrmidia, Ranald, Rhya, Shallya, Taal, Verena (6 contrats) | LdB V5 221 | Pour rompre un commandement, Test de Calme Accessible (+2 DR) ; échec : honte et Action non effectuée | F7 |
| Conscience : Solkan | Archives of the Empire 3, 55 | Idem, plus deux clauses propres au culte | F7 |
| Récupération : Rhya, Shallya (2 contrats) | LdB V5 221 | Réduit d'un jour la durée d'une maladie ; une tentative par maladie et par personne | F4 |

Déclaration des 9 : `tools/build-v5-divine-contracts.mjs`, lignes de bénédictions sans `effect` (Solkan : à vérifier, probablement `docs/divin/sources/miracles/solkan.mjs`).

### 1.2 Miracles (60)

| Miracle (culte) | Livre (p.) | Effet en une ligne | Fichier | Fam. |
|---|---|---|---|---|
| Connaître son Ennemi (Myrmidia) | Up in Arms 79 | Le MJ révèle profil, Traits, compétences, Talents d'un ennemi | `myrmidia-up-in-arms.mjs` | F6 |
| Vindicte vengeresse (Myrmidia) | Up in Arms 79 | Charge et attaque forcées de l'ennemi impénitent le plus proche ; relance de chaque Test de Mêlée | `myrmidia-up-in-arms.mjs` | F1 |
| A Deal's a Deal (Handrich) | Archives 3, 47 | +2 DR au Test de Marchandage, +1 par +2 DR | `handrich.mjs` | F1 |
| Carry My Burdens (Handrich) | Archives 3, 47 | Une créature non monstrueuse devient bête de somme jusqu'à la fin du voyage | `handrich.mjs` | F6 |
| Supply and Demand (Handrich) | Archives 3, 47 | Stock apparent augmenté ou diminué 1 h ; Disponibilité décalée d'un niveau | `handrich.mjs` | F6 |
| Twist of Fortune (Handrich) | Archives 3, 47 | Dépenser 1 point de Chance de la cible, contesté par Sociabilité | `handrich.mjs` | F3 |
| Shake on It (Handrich) | Archives 3, 47 | La cible ne peut agir contre l'accord ; Test de Calme Moyen (+20) pour le contester | `handrich.mjs` | F2 |
| Becalm (Manann) | LdB V5 222 | Navire encalminé ; zone de calme de Sociabilité mètres autour | `manann.mjs` | F5 |
| Fair Winds (Manann) | LdB V5 222 | Navire à vitesse maximale ; +1 DR aux Tests de Navigation pour le piloter | `manann.mjs` | F1 |
| Manalt's Bounty (Manann) | LdB V5 222 | Pêche de quoi nourrir 1 personne (2 en mer), +1 par +2 DR | `manann.mjs` | F6 |
| Waterwalk (Manann) | LdB V5 223 | Marche sur une eau libre d'au moins 10 m de large | `manann.mjs` | F6 |
| Waterlungs (Mathlann) | Lustria 81 | Respiration sous l'eau ; Suffocation et Noyade à l'air libre | `mathlann.mjs` | F1 |
| Cloak of Mathlann (Mathlann) | Lustria 81 | Navire et équipage invisibles, sillage visible (Perception +0) | `mathlann.mjs` | F6 |
| Dooming (Morr) | LdB V5 223 | Vision du Destin ; une fois par personnage ; Talent Condamné achetable | `morr.mjs` | F6 |
| Last Rites (Morr) | LdB V5 223 | Âme libérée, cadavre protégé de la Nécromancie ; un ennemi Construct + Mort-vivant ciblé est détruit | `morr.mjs` | F6 |
| Portal's Threshold (Morr) | LdB V5 223 | Ligne de 8 m maximum ; les Morts-vivants testent Calme Intermédiaire pour franchir | `morr.mjs` | F5 |
| Crisis of Confidence (Ranald) | Deft Steps 19 | Un adversaire sur le point d'un Test volontaire de Sociabilité renonce ; sinon −20 | `ranald-joueur.mjs` | F1 |
| Force the Hand of Chance (Ranald) | Deft Steps 19 | +1 DR à un Test, +1 DR par jet de 1d10 ≤ 6 consécutif ; un 7+ fait tout perdre | `ranald-joueur.mjs` | F3 |
| Perfect Empathy (Ranald) | Deft Steps 19 | Comprend langue, intentions et pensées de l'interlocuteur | `ranald-joueur.mjs` | F6 |
| The Gamemaster (Ranald) | Deft Steps 19 | Connaît règles et stratégies d'un jeu ; +4 DR aux Tests si le jeu repose sur l'habileté mentale | `ranald-joueur.mjs` | F1 |
| Distant Sounds (Ranald) | Deft Steps 18 | Entend un son ou une conversation à portée, murmure à la cible | `ranald-nuit.mjs` | F6 |
| Long Reach (Ranald) | Deft Steps 18 | Bras invisibles : saisir, soulever (≤ 2 Enc), Escamotage à distance | `ranald-nuit.mjs` | F6 |
| Lose the Loot (Ranald) | Deft Steps 18 | Repère le receleur et l'accueil probable pour un butin | `ranald-nuit.mjs` | F6 |
| Silence Reigns (Ranald) | Deft Steps 18 | Les gens de la zone n'entendent que le bruit de fond | `ranald-nuit.mjs` | F5 |
| Poor Man's Face (Ranald) | Deft Steps 18 | Objets de valeur cachés ; 1 % par heure que le dieu se les approprie | `ranald-nuit.mjs` | F6 |
| Talk Your Way Out (Ranald) | Deft Steps 18 | +8 DR unique à un Test de Charme pour échapper à une arrestation en flagrant délit | `ranald-nuit.mjs` | F1 |
| Back at You (Ranald) | Deft Steps 25 | Les Blessures du plus fort s'ajoutent à celles qu'il reçoit du plus faible à sa prochaine attaque | `ranald-protecteur.mjs` | F3 |
| Class War (Ranald) | Deft Steps 25 | Malédiction de malchance sur une cible de rang Or ; jours = rang Or + DR | `ranald-protecteur.mjs` | F6 |
| Free Your Mind (Ranald) | Deft Steps 25 | Résiste automatiquement aux Tests de Charme/Commandement d'un personnage de Statut supérieur | `ranald-protecteur.mjs` | F1 |
| Under My Protection (Ranald) | Deft Steps 25 | Cauchemars ; Test de Calme +0 chaque matin, échec = Exténué ; durée en mois | `ranald-protecteur.mjs` | F2 |
| A Suitable Sucker (Ranald) | Deft Steps 24 | Relance des résultats des tables Contenu de la bourse et Travers | `ranald-trompeur.mjs` | F3 |
| Bamboozle (Ranald) | Deft Steps 24 | Créature de Taille Moyenne ou moins obéit 1 Round sauf Calme Hard (−20) | `ranald-trompeur.mjs` | F2 |
| One Almighty Lie (Ranald) | Deft Steps 24 | 1d10 + DR ajoutés à un Test de Charme | `ranald-trompeur.mjs` | F3 |
| Unremembered Face (Ranald) | Deft Steps 24 | Calme Hard (−20) pour retenir plus de deux faits sur l'apparence | `ranald-trompeur.mjs` | F2 |
| An Invitation (Ranald) | LdB V5 224 | Défait un moyen de fermeture (serrure, loquet, corde) ; +1 par +2 DR | `ranald.mjs` | F6 |
| Trickster's Glamour (Ranald) | LdB V5 225 | Une illusion parmi cinq par cible (bourse, tenue, objet caché) | `ranald.mjs` | F6 |
| You Saw Nothing (Ranald) | LdB V5 225 | Cible inaperçue tant qu'elle n'attire pas l'attention | `ranald.mjs` | F6 |
| Rhya's Abundance (Rhya) | Archives 3, 74 | Vivres touchés doublés et purifiés, un contenant par round | `rhya-archives3.mjs` | F6 |
| Rhya's Dominion (Rhya) | Archives 3, 74 | Un esprit de la nature apparaît et accomplit une tâche littérale | `rhya-archives3.mjs` | F6 |
| Rhya's Flock (Rhya) | Archives 3, 74 | Un troupeau domestique se soumet, ses sens servent d'yeux et d'oreilles | `rhya-archives3.mjs` | F6 |
| Rhya's Taming (Rhya) | Archives 3, 74 | Animal sauvage docile jusqu'au coucher du soleil (Charme animal +20) | `rhya-archives3.mjs` | F6 |
| Rhya's Children (Rhya) | LdB V5 225 | Perçoit les créatures vivantes de la zone, en extérieur | `rhya.mjs` | F6 |
| Rhya's Harvest (Rhya) | LdB V5 225 | Fruits et légumes poussent, de quoi nourrir 1 personne par round | `rhya.mjs` | F6 |
| Rhya's Shelter (Rhya) | LdB V5 225 | Abri naturel parfait pour une nuit, introuvable ensuite | `rhya.mjs` | F6 |
| Rhya's Union (Rhya) | LdB V5 226 | Le couple conçoit un enfant si c'est biologiquement possible | `rhya.mjs` | F6 |
| Balm to a Wounded Mind (Shallya) | LdB V5 226 | Traits psychologiques supprimés pendant la durée, puis sommeil ; Calme +0 si non consentante | `shallya.mjs` | F2 |
| Bitter Catharsis (Shallya) | LdB V5 226 | Purge poison et maladie de la cible ; le prêtre subit 1d10 − BSoc Blessures par guérison | `shallya.mjs` | F4 |
| Martyr (Shallya) | LdB V5 226 | Tous les Dégâts de la cible sont subis par le prêtre | `shallya.mjs` | F3 |
| Unblemished Innocence (Shallya) | LdB V5 226 | La cible perd 1 Point de Corruption de la dernière session, +1 par +2 DR | `shallya.mjs` | F4 |
| Light of Stasis (Solkan) | Archives 3, 55 | Cibles figées en stase ; tout ce que le temps affecte est suspendu | `solkan.mjs` | F5 |
| Still the Winds (Solkan) | Archives 3, 55 | Dans la zone : magie dissipée, Incantation et Canalisation échouent | `solkan.mjs` | F5 |
| Nature's Repast (Taal) | Deft Steps 88 | Nourriture glanée plus nourrissante : quatre jours sans Test d'Endurance de famine | `taal-deft.mjs` | F6 |
| Pax of Taal (Taal) | Deft Steps 88 | Les créatures de Trait Bestial de la zone s'apaisent et n'attaquent pas | `taal-deft.mjs` | F5 |
| Wilderness Way (Taal) | Deft Steps 88 | DR du Test de Prière notés pour relancer des Défis de voyage | `taal-deft.mjs` | F3 |
| Lord of the Hunt (Taal) | LdB V5 227 | Piste d'une proie impossible à perdre par un moyen non surnaturel ; +1 DR aux tests concernant la proie | `taal.mjs` | F1 |
| Hoarfrost Thews (Ulric) | PBtT Companion 50 | Immunité au froid, quelle qu'en soit la source | `ulric-pbtt.mjs` | F1 |
| Pelt of the Winter Wolf (Ulric) | LdB V5 228 | Aucune pénalité mécanique due au froid ou au climat hivernal | `ulric.mjs` | F1 |
| As Verena Is My Witness (Verena) | LdB V5 229 | Tant que le prêtre dit la vérité, on le croit sincère | `verena.mjs` | F6 |
| Blind Justice (Verena) | LdB V5 229 | Tests de Perception/Intuition pour percer illusions et mensonges | `verena.mjs` | F6 |
| Truth Will Out (Verena) | LdB V5 229 | Question unique ; réponse véridique sauf Calme Accessible (+2 DR) opposé | `verena.mjs` | F2 |

Les noms en anglais sont les `canonicalName`/ids du contrat ; le nom français de l'interface est dans `catalogueName`.

## 2. Classement par famille d'effet

Classement de travail, fondé sur le texte de contrat cité ci-dessus et sur les types d'effet réellement présents dans `js/core/v5-divine-grammar.js` (`effectTypes`) : `test-modifier`, `characteristic-modifier`, `grant-immunity`, `special-state`, `free-reroll`, `wound-heal`, `remove-condition`, `summon-creature`, etc. Le moteur sait donc déjà appliquer un modificateur de Test, une immunité, une relance, un État. Il ne sait pas : proposer un Test de résistance à la cible, tenir un compteur propre à un miracle, intercepter des Dégâts, suspendre le temps d'une zone, suivre maladies, poisons ou Corruption. Chaque classement est une **proposition** ; une valeur de règle marquée « à vérifier dans le livre » n'est pas figée.

| Fam. | Nom | Nombre | Statut | Contenu |
|---|---|---:|---|---|
| F1 | Modificateur, relance ou immunité | 11 | Le moteur sait déjà (en tout ou partie) | Vindicte vengeresse, A Deal's a Deal, Fair Winds, Waterlungs, Crisis of Confidence, The Gamemaster, Talk Your Way Out, Free Your Mind, Lord of the Hunt, Hoarfrost Thews, Pelt of the Winter Wolf |
| F2 | Test imposé à la cible, issue appliquée | 6 | Mécanisme nouveau (un seul, générique) | Shake on It, Under My Protection, Bamboozle, Unremembered Face, Balm to a Wounded Mind, Truth Will Out |
| F3 | Compteur, relance ou transfert propre au miracle | 7 | Mécanisme nouveau (au cas par cas) | Twist of Fortune, Force the Hand of Chance, Back at You, A Suitable Sucker, One Almighty Lie, Martyr, Wilderness Way |
| F4 | Soins, purges, maladies, Corruption | 4 | Mécanisme nouveau (dépend d'un registre) | Bitter Catharsis, Unblemished Innocence, Récupération (Rhya), Récupération (Shallya) |
| F5 | Zone, temps ou magie suspendus | 6 | Mécanisme nouveau | Becalm, Portal's Threshold, Silence Reigns, Light of Stasis, Still the Winds, Pax of Taal |
| F6 | Effet de monde, d'information ou d'illusion | 28 | **Resterait un rappel** (à confirmer, Q2) | Connaître son Ennemi, Carry My Burdens, Supply and Demand, Manalt's Bounty, Waterwalk, Cloak of Mathlann, Dooming, Last Rites, Perfect Empathy, Distant Sounds, Long Reach, Lose the Loot, Poor Man's Face, Class War, An Invitation, Trickster's Glamour, You Saw Nothing, Rhya's Abundance/Dominion/Flock/Taming/Children/Harvest/Shelter/Union, Nature's Repast, As Verena Is My Witness, Blind Justice |
| F7 | Bénédiction Conscience (Test de Calme pour enfreindre) | 7 | Rappel décidé en R33 (Q3) | Conscience × 7 cultes |
| | **Total** | **69** | | 11 + 6 + 7 + 4 + 6 + 28 + 7 |

**Lecture.** 11 prières peuvent être branchées sur des briques existantes ; 23 (F2 à F5) demandent un mécanisme nouveau ; 35 (F6 + F7) resteraient un rappel, sauf décision contraire. Au sein de F1, plusieurs miracles n'ont qu'une partie branchable (le reste de l'effet demeure en rappel) : Fair Winds (+1 DR mais pas la vitesse du navire), Waterlungs (drapeau de souffle existant, R24 de `docs/divin/DIVIN_RESERVE_DECISIONS.md`, mais pas Noyade ni Suffocation à l'air), Vindicte (relance, mais charge forcée), Hoarfrost Thews et Pelt (le froid est-il un fait du moteur ? **à vérifier dans le code**), Lord of the Hunt.

## 3. Quoi, pourquoi, périmètre

**Quoi.** Pour chaque famille hors rappel (F1 à F5), brancher ce qui peut l'être sur le moteur d'effets, avec le MJ qui saisit les faits et les jets (principe de `docs/divin/DIVIN_ARBITRAGES.md:29` : les décisions narratives passent par l'interface MJ, une clause mécanique n'est pas fermée par un simple rappel). Pour F6 et F7, rendre le rappel plus utile sans l'automatiser (voir Q2, Q3).

**Pourquoi.** Réduire la part du jeu que le MJ doit tenir de tête, sans dévier du texte des livres.

**Dans le périmètre**
1. Les 69 contrats `manual`.
2. Un garde-fou qui verrouille l'inventaire (compte et famille de chaque contrat).
3. Les briques nouvelles nécessaires à F2, F3, F5, et à F4 si Q5 le permet, branchées sur le moteur d'effets, pas sur un code parallèle.
4. Tests unitaires par famille.

**Hors périmètre**
- Les 60 miracles assistés et leurs 88 clauses résiduelles (Q1).
- Toute modification d'une règle ou d'une valeur d'un livre.
- Un registre complet des maladies, poisons ou de la Corruption (Q5, Q6) sans décision du MJ.
- Réimplanter les contrats déjà `implemented`.
- Refonte U8 du moteur d'effets unifié (`docs/specs/moteur-effets-unifie/`) : les nouveaux effets s'écrivent dans le vocabulaire existant ; s'ils entrent dans le schéma commun plus tard, la migration est mécanique (Q8).

## 4. Critères d'acceptation (testables)

- **CA1** Pour chaque prière retirée du rappel, la valeur chiffrée du contrat est confirmée dans le livre cité (page indiquée au §1) ou marquée « à vérifier dans le livre », et le contrat garde son champ `source`.
- **CA2** Un test d'inventaire échoue si le nombre de contrats `manual` ou la famille d'un contrat change sans mise à jour de la table du §2 (état de départ : 60 miracles + 9 bénédictions = 69 ; F1 11, F2 6, F3 7, F4 4, F5 6, F6 28, F7 7).
- **CA3** Une prière passée de `manual` à `assisted` ou `implemented` applique ses effets via les types déclarés dans `v5-divine-grammar.js` (ou un type ajouté à ce fichier avec son gestionnaire), et la validation du générateur la refuse si un type est inconnu.
- **CA4** Pour chaque prière de F1 : un test unitaire vérifie le modificateur ou l'immunité sur la cible, sur la durée, avec expiration, et la part restée en rappel apparaît dans `reminders`.
- **CA5** Pour F2 : le MJ saisit le jet de la cible (pas de jet tiré par l'outil, sauf décision Q4) ; un test couvre réussite et échec de la cible et l'issue appliquée dans chaque cas.
- **CA6** Pour F3, F4 et F5 : un test par prière couvre l'application, l'annulation (Undo) et l'expiration, et l'état s'affiche sur le participant concerné.
- **CA7** Aucun contrat `implemented` ou `assisted` existant ne change de comportement : les tests unitaires divins actuels passent sans modification.
- **CA8** Une prière que le MJ choisit de garder en rappel (F6, F7) reste `manual` et son rappel s'affiche au résultat, comme aujourd'hui.
- **CA9** Un contrat dont une clause dépend d'une décision ouverte (Q5, Q6, Q7) n'est pas modifié tant que la question est ouverte.
- **CA10** Suite unitaire complète verte (`node --test` sur les `.js` puis les `.mjs`) à la fusion.

## 5. Découpage proposé en lots

Chaque lot est vérifiable par tests unitaires ; il peut s'arrêter après n'importe quel lot.

| Lot | Contenu | Prières | Dépend de |
|---|---|---:|---|
| L0 | Garde-fou d'inventaire (CA2) ; table famille → contrat en donnée | 0 | — |
| L1 | F1, modificateurs de Test : Talk Your Way Out, The Gamemaster, A Deal's a Deal, Fair Winds, Lord of the Hunt, Crisis of Confidence | 6 | L0 |
| L2 | F1, immunités, relances, drapeaux : Hoarfrost Thews, Pelt of the Winter Wolf, Free Your Mind, Waterlungs, Vindicte vengeresse | 5 | L0 |
| L3 | F2 : brique « Test imposé à la cible » + les 6 prières | 6 | Q4 |
| L4 | F5 : zones et exclusions de types (Becalm, Portal's Threshold, Silence Reigns, Pax of Taal) | 4 | L0 |
| L5 | F5 : Light of Stasis et Still the Winds (temps et magie suspendus) | 2 | Q7 |
| L6 | F3, compteurs et relances : Twist of Fortune, Force the Hand of Chance, A Suitable Sucker, One Almighty Lie, Wilderness Way | 5 | L0, Q9 |
| L7 | F3, transferts de Dégâts : Martyr, Back at You | 2 | Q7 (touche le moteur de dégâts) |
| L8 | F4 : Bitter Catharsis, Unblemished Innocence, Récupération ×2 | 4 | Q5, Q6 |
| L9 | F6 et F7 : rappel structuré (durée, portée, libellé), selon Q2 et Q3 | 35 | Q2, Q3 |

Ordre recommandé : L0, L1, L2, L3, L4, puis L6, puis les lots à question (L5, L7, L8, L9).

## 6. Décisions du MJ (16/11/2026)

- **Q1. Miracles « assistés » (60 miracles, 88 clauses résiduelles) : inclus dans le chantier**, famille par famille. Cela modifie le périmètre du §3 (ils n'en sont plus exclus), le garde-fou CA2 et le découpage du §5 : l'inventaire et le classement des 88 clauses restent à faire avant le plan, et les lots à compléter.
- **Q2. Effets de monde (F6, 28) :** rappel enrichi, sans calcul (durée suivie, portée et cible affichées, libellé court sur le participant).
- **Q3. Conscience × 7 (F7) :** le rappel est gardé, la décision R33 tient.
- **Q4. Test imposé à la cible (F2) :** le MJ saisit le jet de la cible.
- **Q5. Maladies et poisons :** pas de registre ; Récupération (Rhya), Récupération (Shallya) et Bitter Catharsis restent en rappel. Le lot L8 se réduit à Unblemished Innocence.
- **Q6. Corruption :** le MJ indique que l'outil suit déjà la Corruption. Constaté dans le code le 16/11/2026 : le champ `corruption` fait partie de l'envoi aux fiches (`js/ui/fiche-writeback-view.js`). Unblemished Innocence se branche donc sur ce suivi existant, sans nouveau compteur ; le point d'accroche exact est à repérer au plan.
- **Q7. Martyr, Light of Stasis, Still the Winds :** oui, on touche aux moteurs partagés, en lots isolés et en dernier (L5, L7), chacun avec ses tests de non-régression.
- **Q9. Péché de profit (Handrich) :** rappel du Péché au résultat, attribué à la main par le MJ.
- **Q10. Valeurs chiffrées :** relecture ciblée, dans le livre, des seules valeurs chiffrées du lot, avant de coder.

Choix technique de Claude, hors décision du MJ :
- **Q8. Moteur d'effets unifié :** ne pas attendre ; les effets neufs s'écrivent dans les types de `v5-divine-grammar.js`.

Inventaire des 88 clauses des miracles assistés : `inventaire-assistes.md` (17/11/2026 ; familles F1 à F8, lots L10 et L11 ajoutés).

## 7. Décisions du MJ (17/11/2026), sur l'inventaire des miracles assistés

- **Q11. Vaincre les impies :** le prêtre compte parmi les alliés qui gagnent la Haine.
- **Q12. Ruissellement :** le bonus de Charme va au prêtre seul (lecture affichée dans le rappel).
- **Q13. Sur un terrain mortel :** durée Bonus de Volonté en Rounds, affichée « durée non attestée par le livre ».
- **Q14. Grâce de Ranald :** le +10 en Discrétion se lit +1 DR (comme Commander la Légion) ; le +10 d'Agilité reste un modificateur de caractéristique.
- **Q15. Épée de justice :** le Péché suit Q9 (rappel au résultat, attribué à la main).
- **Q16. Fureur du soleil vertueux :** Dégâts +2 ordinaires (réduits par BE et PA), après relecture de la page (Q10).
- **Q17. Désengagement (En bon ordre) et Élan en début de Round (Froid de la gelée blanche) :** branchés, en lot isolé tout à la fin (L11), avec tests de non-régression.

Plus aucune question ouverte : reste `plan.md` et `tasks.md`.