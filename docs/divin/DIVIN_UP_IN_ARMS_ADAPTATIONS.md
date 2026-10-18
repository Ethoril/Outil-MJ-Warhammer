# Up in Arms p.79 : préparation de l'adaptation V5 des neuf miracles de Myrmidia

18 octobre 2026. Document de préparation pour DIV-01 (voir `DIVIN_DECISIONS_MJ.md`). **Statut : décisions prises, contrats raccordés.** Le MJ a tranché les 13 sélecteurs de la dernière section (option recommandée chaque fois) ; les neuf contrats ne sont plus `blocked` : `docs/divin/sources/miracles/myrmidia-up-in-arms.mjs` les remplace dans le générateur (mêmes ids `divine:miracle:<nom>` et même entrée de catalogue) : Commander la Légion, Effrayer l'Ennemi et Compétence Martiale `assisted`, les six autres `manual` avec clauses et rappels. Dévotion de la Guerrière est `manual` et non `assisted` comme prévu en §3.7 : le moteur ne sait pas fixer un ennemi précis par lancement, et Intrépide sans spécialisation vaudrait « Tout » (option C écartée). Les sections 1 à 6 ci-dessous restent le texte de préparation d'origine ; un contrôle indépendant des valeurs relues sur la page 79 reste à faire avant tout passage en « validé ».

## 1. Sources et méthode

- **V4** : Up in Arms (EN, WFRP 4e), page imprimée 79 = page PDF 79, SHA-256 `0671b27d0e947c7c5387fd4b30cda0512f9182dc811cc0275a18acc96af5fa07` (`DIVIN_CORPUS_LIVRES.json`, L13). Texte extrait par `pdftotext` puis recoupé sur l'image rendue de la page. Métadonnées du PDF : créé le 22 mars 2022.
- **V5** : « Livre de base V5 EN v2.pdf ». Pour ce livre, page imprimée = page PDF (vérifié sur les pages 130, 163, 184, 224). Les pages citées ci-dessous sont des pages imprimées.
- **Rappel V4 côté français** : « Livre de base FR.pdf » (V4), page imprimée = page PDF − 2.
- **Catalogue local** : `js/data/reference-source-csv/Miracles.csv` (colonnes Portée, Cible, Durée, Effet).
- Aucune citation de plus de 15 mots : les textes sont reformulés. Les unités suivent DIV-03 : 36 yards source = 36 mètres de jeu, sans conversion 0,9144, et jamais de passage implicite d'une caractéristique entière à son Bonus.

### Lecture de « Sur un Terrain Mortel » (vérifiée sur l'image p.79)

Le texte n'est pas illisible : les trois lignes d'en-tête sont au pied de la 1re colonne et la description est en tête de la 2e colonne (coupure de colonne). L'anomalie est dans les paramètres : Portée « Self », Cible « You », puis la ligne **Durée contient « Allies within AoE (Willpower yards) »**. Aucune durée n'est imprimée. La cible attendue (alliés dans la zone) a donc glissé dans la ligne Durée, et le paramètre durée manque. La valeur du catalogue (« Bonus de Force Mentale en Rounds ») n'est attestée par aucune ligne de la page ; elle ressemble à celle d'En Bon Ordre juste au-dessus.

### Écarts constatés entre le catalogue et la page 79 (hors adaptation V5)

| Miracle | Page 79 | Catalogue |
| --- | --- | --- |
| En Bon Ordre | Cible : zone de **Willpower** yards (caractéristique entière) | Zone en **Bonus** de Force Mentale |
| Connaître son Ennemi | Portée : **Willpower** yards (entière) | **Bonus** de Volonté |
| Sur un Terrain Mortel | Cible « You », zone dans la ligne Durée, durée absente | Cible : zone en Bonus de Volonté ; durée Bonus de Force Mentale en Rounds |
| Tous | « Willpower » | mélange « Volonté » et « Force Mentale » (clé moteur `FM`) |

## 2. Rappels des règles V5 utilisées

| Notion V4 | Équivalent V5 (livre de base) |
| --- | --- |
| Bonus de +10 à un Test (difficulté ou bonus) | Le Test se module en **DR** (SL). Le tableau de difficulté V5 p.131 est celui de V4 au pas de +10 = +1 DR (V4 FR p.153 : +60/+40/+20/0/-10/-20/-30 ; V5 : +6/+4/+2/0/-1/-2/-3 DR). Les +10 sur **caractéristique** restent des +10 (Bénédictions de Bataille et de la Chasse p.221 : +10 CC, +10 CT). |
| Avantage (jetons, +10 par jeton, V4 FR p.164) | **Élan** (Momentum) binaire, p.168 : gagné en gagnant un Test de Mêlée opposé, perdu sur échec, Dégâts subis ou État reçu. Il donne **Avantage** (p.130) aux Tests de Mêlée : on peut inverser les chiffres du jet s'il est meilleur ; des Avantages multiples ajoutent +1 DR chacun après le premier. |
| Fuite : l'adversaire gagne +1 Avantage et une attaque gratuite (V4 FR p.165) | p.163 : chaque adversaire Engagé gagne l'Élan, qu'il peut perdre pour **une** attaque de Mêlée gratuite ; le fuyard gagne **1 État Brisé par ennemi Engagé** (ajout V5). Désengagement : perdre son Élan, sinon Test d'Esquive ou d'Acrobaties opposé à la meilleure Mêlée adverse (Désavantage si en infériorité, impossible si encerclé). |
| Brisé | p.185-186 : Mouvement utilisé pour fuir et Action pour Sprinter jusqu'à une cachette, -1 DR aux Tests hors course et dissimulation. Retrait : Test de Calme en fin de Round si non Engagé, ou Round entier caché. |
| Terreur (Indice) | p.184 et p.362 : Test de Psychologie (Calme) à la première rencontre ; échec = autant d'États Brisé que l'indice plus des Brisé liés aux DR négatifs ; la créature cause aussi la Peur de même indice (p.183). **Incohérence interne V5** : p.184 dit « un de plus par DR négatif après le premier », p.362 dit « 1 par DR négatif ». |
| Sans peur (Ennemi) : un Test de Calme Accessible (+20) pour ignorer Intimidation, Peur ou Terreur de l'ennemi (V4 FR p.145) | p.119 : **immunité à la Peur** causée par le groupe d'ennemis choisi. Terreur et Intimidation ne sont pas mentionnées. |
| Charge : +1 Avantage (V4 FR p.165) | p.163 : Mouvement de Charge puis Action = Test de Mêlée ; **Élan** gagné si la cible était au moins à Mouvement yards et dans la Course. |
| Relance | p.133 : dépenser un point de Chance pour relancer un Test, **le nouveau résultat tient** ; on peut payer à nouveau pour relancer encore. Bénédiction de Chance p.221 : relancer le prochain Test raté, le résultat tient. |
| Attaque gratuite hors Tour | Talent Frappe réactive (Reaction Strike) p.124 : mêmes mots que Attaque Rapide mais **quand vous êtes chargé** et au plus une fois par Round. Début de Round : étape 2 de la séquence p.161. Une attaque supplémentaire par Tour en dépensant l'Élan : p.168. |
| Gains par tranche de +2 DR (V4 : selon le miracle) | p.222 : par +2 DR, ajouter la valeur initiale à la portée, aux cibles **ou** à la durée ; Portée et Cible « Vous » : ni portée ni cibles ; durée Instantanée : non prolongeable. |
| Commandement en combat | p.169 : ordres aux PNJ, opposés par le Calme si pas de hiérarchie ou ordre très risqué ; retirer un Brisé à un allié (Action gratuite) ; transférer l'Élan en le perdant (Action gratuite). Le talent Présence imposante p.117 donne Avantage au Commandement. |

Précédents V5 déjà dans le dépôt : Flambeau de Vertu (Sigmar p.226, `sigmar.mjs`) retire les Brisé, donne Intrépide (Tout) tant que le prêtre est vu et cause la Peur ; Masque mortuaire (Morr p.223) donne le Trait Peur (1) ; ce sont les deux voisins les plus proches de Dévotion de la Guerrière, Sur un Terrain Mortel et Effrayer l'Ennemi.

### Grammaire d'effets existante (`js/core/v5-divine-grammar.js`)

`characteristic-modifier`, `armor-bonus`, `condition`, `healing`/`wound-heal`, `grant-trait`, `special-state` (clés seulement `fearImmune`, `terrorAsFear`, `ignoreConditionPenalties`, `cannotRaiseUndead`), `grant-actions`, `grant-talent` (Talents injectables : Sans peur, Coude-à-coude, Menaçant, Frénésie, Haine, etc.), `weapon-bonus`, `test-modifier` (DR entiers par clé de Test, appliqués à tous les Tests de la clé pendant la durée), `direct-damage`, `remove-condition`, `expiry-condition`, `temporary-fortune`. Il n'existe **aucun** effet pour : ne pas pouvoir recevoir un État donné, supprimer l'Élan/l'attaque gratuite de l'adversaire en cas de fuite, relance de Tests, attaque gratuite en début de Round, contrainte de comportement, révélation de profil.

## 3. Les neuf miracles

Notation : P = portée, C = cible, D = durée. Les valeurs « catalogue » sont celles du CSV.

### 3.1 Commander la Légion (Command the Legion)

**V4 reformulé.** P : « voir texte » (en pratique la ligne de vue). C : tout allié. D : 1 Round. Le prêtre peut donner un ordre à un allié dans sa ligne de vue ; l'ordre doit servir un combat armé ou une stratégie en cours. Tout Test de Commandement du prêtre qui en découle reçoit un bonus de +10 (valeur exacte : +10, sur le Test et non sur la caractéristique).

**Équivalent V5 et notions changées.**
- Le « +10 au Test » n'existe pas tel quel en V5 ; il se lit +1 DR (tableau p.131, pas de +10 = +1 DR) ou Avantage (p.130), alors que le talent Présence imposante (p.117) donne déjà Avantage au Commandement.
- Le Commandement V5 a des usages de combat propres (p.169) : ordre à un PNJ, retrait de Brisé, transfert d'Élan. Le texte V4 ne dit pas si ces Tests sont « pertinents pour un combat armé ».
- P « voir texte » et C « tout allié » n'ont pas de valeur initiale : le gain par +2 DR de p.222 (« valeur initiale ») ne s'applique qu'à la durée (1 Round de plus par +2 DR).

**Options.**
- A (recommandée) : +1 DR aux Tests de Commandement du prêtre pendant 1 Round (D +1 Round par +2 DR).
- B : Avantage aux Tests de Commandement pendant 1 Round (ne se cumule pas avec Présence imposante autrement que par +1 DR).
- C : +10 en Sociabilité pendant 1 Round, fidèle à la lettre mais bien plus large que « Tests de Commandement » (touche tous les Tests de Sociabilité) : déconseillée.

**Classification probable.** `assisted`. Couvre la partie chiffrable : `test-modifier` `{modifiers:{Commandement:1}}` (clé de compétence « Commandement » déjà utilisée par le moteur), durée 1 Round. Reste manuel : « ordre pertinent pour le combat », l'allié visé, la ligne de vue. Limite connue : le moteur applique le modificateur à **tous** les Tests de Commandement du Round, pas seulement à ceux qui résultent de l'ordre.

### 3.2 Effrayer l'Ennemi (Dismay Foe)

**V4 reformulé.** P : vous. C : vous. D : 1 Round. Le prêtre incarne l'aspect le plus courroucé de Myrmidia et gagne le Trait de Créature Terreur 1.

**Équivalent V5 et notions changées.**
- Terreur V5 (p.184, p.362) : Test de Psychologie des adversaires **à la première rencontre** ; échec = Brisé en nombre égal à l'indice plus DR négatifs ; la créature cause aussi la Peur 1 (p.183). Un adversaire qui a déjà réussi ce Test dans la rencontre n'est plus concerné.
- L'incohérence interne V5 p.184/p.362 sur le calcul des Brisé supplémentaires s'applique telle quelle ; ce n'est pas un écart de l'adaptation.
- Le Brisé V5 (p.185) a des effets plus lourds que le Brisé V4 (fuite forcée avec Sprint) : le miracle est plus fort en V5 pour une durée de 1 Round.
- P et C « Vous » : seule la durée peut croître (+1 Round par +2 DR).

**Options.**
- A (recommandée) : tout ennemi qui voit le prêtre au lancement fait immédiatement son Test de Psychologie (une fois pendant la durée), même si le combat a déjà commencé, comme pour la Peur donnée par Flambeau de Vertu.
- B : seuls les ennemis qui n'ont pas encore rencontré le prêtre dans l'affrontement testent (lecture stricte de « première rencontre ») ; presque inutile en plein combat.

**Classification probable.** `assisted`. Couvre : `grant-trait` `{traits:['Terreur (1)']}` (comme `Peur (1)` de Masque mortuaire, étiquette sans test automatique). Les Tests de Psychologie des ennemis et leurs Brisé restent traités par le MJ ou par les règles de Psychologie existantes ; à vérifier au contrôle que le moteur lit bien un Trait `Terreur`.

### 3.3 En Bon Ordre (In Good Order)

**V4 reformulé.** P : soi-même. C : alliés dans la zone, rayon Willpower yards (caractéristique entière). D : Bonus de Willpower en Rounds. Pendant le miracle, les alliés peuvent rompre le combat sans que l'ennemi y gagne un avantage ni obtienne d'attaque gratuite ; la source renvoie à « Fleeing » p.165 du livre de base V4.

**Équivalent V5 et notions changées.**
- « Avantage » devient l'**Élan** : en V5 (p.163), un fuyard donne l'Élan à chaque adversaire Engagé, qui peut le perdre pour une attaque de Mêlée gratuite. Le miracle supprime donc le gain d'Élan et l'attaque gratuite.
- **Nouveau en V5** : le fuyard gagne 1 Brisé par ennemi Engagé (p.163). Le texte V4 ne le connaît pas, donc ne dit pas si le miracle l'annule.
- Le Désengagement (p.163) est un autre mécanisme (perdre l'Élan ou Test d'Esquive) ; le texte V4 ne vise que la Fuite.
- La poursuite V5 (p.158-159) n'utilise ni Élan ni attaque gratuite ; la poursuite V4 d'Up in Arms (p.127, attaque gratuite à +20 puis Test de Calme et Brisé si touché) n'a pas d'équivalent à adapter.
- Zone : caractéristique **entière** (écart avec le catalogue, qui met le Bonus). Voir sélecteur 4 : en V5 les zones du livre de base sont en Bonus (Appel à la Fureur, Inspirant p.224) et les portées en caractéristique entière.

**Options.**
- A (recommandée) : Fuite uniquement. Les adversaires Engagés ne gagnent pas l'Élan et n'ont pas l'attaque gratuite ; le fuyard gagne quand même 1 Brisé par ennemi Engagé (p.163).
- B : A, et le fuyard ne gagne pas non plus ces Brisé.
- C : A, et les alliés peuvent aussi se Désengager sans perdre l'Élan ni faire de Test.

**Classification probable.** `manual` (aucun type d'effet existant pour supprimer l'Élan donné à l'adversaire ou l'attaque gratuite ; `special-state` n'a pas de clé adaptée). Partie chiffrable : durée `characteristic-bonus` `FM` en Rounds ; zone `special` si la lecture littérale est retenue, ou `area` `characteristicBonus:'FM'` en yards si le MJ retient le Bonus.

### 3.4 Connaître son Ennemi (Know Your Enemy)

**V4 reformulé.** P : Willpower yards (caractéristique entière). C : 1. D : instantané. Le MJ doit permettre au prêtre de consulter le profil, les Traits, les compétences et les Talents d'un ennemi proche.

**Équivalent V5 et notions changées.**
- Aucune notion V4 absente en V5 (profil, Traits, compétences, Talents existent). Il n'y a pas de Test ni d'Avantage.
- Portée en caractéristique entière (écart avec le catalogue : Bonus). Convention V5 : les portées sont en caractéristique entière (Bouclier de Myrmidia, Œil de l'aigle p.224), donc la lecture littérale est cohérente avec V5 pour une **portée**.
- Durée instantanée : seuls la portée (+WP yards par +2 DR) et le nombre de cibles (+1 par +2 DR) peuvent croître.
- Les sources V5 consultées ne donnent pas de règle sur les informations cachées d'un profil.

**Options.**
- A (recommandée) : le MJ révèle caractéristiques, Traits, compétences et Talents ; il garde la main sur ce qui est secret (identité, malédictions cachées).
- B : A et en plus Blessures actuelles, Chance, équipement visible.
- C : étendue graduée par DR (Succès : Traits ; +2 DR : Talents ; etc.), ce qui n'est écrit nulle part.

**Classification probable.** `manual` (révélation d'information, aucun type d'effet moteur). Chiffrable : portée `characteristic` `FM` en yards (ou Bonus selon sélecteur 4), cible `count` 1, durée `instant`.

### 3.5 Sur un Terrain Mortel (On Deadly Ground)

**V4 reformulé.** P : soi-même. C imprimée : vous (contredit l'effet). La ligne D imprimée contient « alliés dans la zone, Willpower yards » et aucune durée. Description (2e colonne) : les alliés ne reçoivent pas l'État Brisé tant que le miracle est actif, la retraite devenant impensable.

**Équivalent V5 et notions changées.**
- L'État Brisé existe en V5 avec des effets plus lourds (p.185) et deux nouvelles sources d'acquisition : Terreur (p.184, p.362) et Fuite (p.163).
- Cible probable : alliés dans la zone (par comparaison avec En Bon Ordre). Durée : Bonus de Willpower en Rounds (catalogue, par analogie), 4 Rounds (durée des deux autres soutiens de groupe) ou valeur fixée par le MJ. Aucune n'est attestée par la page.
- Le texte ne dit rien de l'État Brisé déjà acquis, ni si le prêtre compte parmi les alliés.
- Précédent V5 : Flambeau de Vertu (Sigmar p.226) **retire** les Brisé existants ; Sur un Terrain Mortel **empêche** d'en recevoir. Ce ne sont pas les mêmes effets.

**Options pour la durée.**
- A (recommandée) : Bonus de Willpower en Rounds, comme En Bon Ordre et le catalogue, marqué « valeur MJ non attestée par la source ».
- B : 4 Rounds fixes.
- C : laisser le contrat `blocked` jusqu'à retrouver un erratum officiel.

**Classification probable.** `manual` : aucun effet existant ne couvre « ne reçoit pas Brisé ». Le plus proche, `special-state`, n'a pas de clé adaptée ; le type serait à créer (drapeau « ne peut recevoir Brisé » respecté par l'acquisition d'États) et ne relève pas de cette préparation. Chiffrable : zone, cible, durée.

### 3.6 Attaque Rapide (Quick Strike)

**V4 reformulé.** P : vous. C : vous. D : 3 Rounds. Au début de chaque Round tant que le miracle est actif, le prêtre peut tenter un Test d'Initiative Intermédiaire (+0, valeur exacte) pour obtenir une attaque gratuite, hors séquence normale, avec l'arme de sa main principale.

**Équivalent V5 et notions changées.**
- Intermédiaire (+0) V4 correspond à Intermédiaire (+0 DR) V5 (p.131) : aucune conversion.
- Début de Round : étape 2 de la séquence p.161, avant les Tours.
- Le texte est celui du talent V4 Frappe réactive ; en V5 ce talent (p.124) ne joue **que lorsqu'on est chargé** et une fois par Round : Attaque Rapide est donc plus large (chaque Round, sans charge).
- V5 fait gagner l'Élan sur un Test de Mêlée **opposé** gagné (p.168) et limite à une attaque supplémentaire par Tour en dépensant l'Élan. Le texte V4 ne dit pas si l'attaque gratuite est opposée (V4 Fuite : non opposée) ni si elle compte dans ces limites.
- P et C « Vous » : seule la durée peut croître (+3 Rounds par +2 DR).

**Options.**
- A (recommandée) : au début de chaque Round (3 Rounds), Test d'Initiative Intermédiaire (+0 DR) ; sur réussite, une attaque de Mêlée gratuite ordinaire, **opposée**, avec l'arme de la main principale, sans Action ni Mouvement, une fois par Round, Élan gagné/perdu selon les règles normales.
- B : même chose mais attaque gratuite **non opposée** (comme la Fuite V4), donc sans gain d'Élan.
- C : A, mais cette attaque exclut l'attaque supplémentaire à l'Élan (p.168) du même Round (plafond de deux attaques par Round au lieu de trois).

**Classification probable.** `manual` aujourd'hui. Le dépôt possède déjà un mécanisme d'attaque gratuite pour des talents (`freeAttackTalent` `reaction-strike` dans `v5-store-action.js` et `v5-talent-attacks.js`) : étendre ce mécanisme à un déclencheur « début de Round tant que le miracle dure » le rendrait `assisted`, mais c'est un développement à part. Chiffrable seulement : durée `fixed` 3 `rounds`, P et C `self`.

### 3.7 Dévotion de la Guerrière (Shieldmaiden's Devotion)

**V4 reformulé.** P : 36 yards (valeur exacte ; 36 mètres de jeu par DIV-03). C : « voir texte », soit tous les Myrmidiens à portée. D : 4 Rounds. Ils gagnent le Talent Intrépide (Ennemi) ; l'ennemi peut être un individu précis ou une espèce.

**Équivalent V5 et notions changées.**
- Sans peur (Ennemi) V4 (FR p.145 ; le catalogue du dépôt le nomme « Intrépide (Ennemi) », le snapshot « Sans peur ») : un Test de Calme Accessible (+20) pour ignorer Intimidation, Peur **ou Terreur**. V5 (p.119) : immunité à la Peur du groupe choisi, **sans** Terreur ni Intimidation. Les alliés perdent donc la protection contre la Terreur de l'ennemi choisi.
- V5 parle de « groupe d'ennemis » (Géants, Squelettes, Trolls) ; « individu précis » n'y figure pas (groupe d'un seul : lecture MJ).
- Cible : « tous les Myrmidiens à portée » (aucun plafond) : p.222 ne donne pas de valeur initiale à doubler ; seules durée (+4 Rounds par +2 DR) et portée (+36) croissent.
- Précédent V5 : Flambeau de Vertu donne Intrépide (Tout).

**Options.**
- A (recommandée) : un seul ennemi (espèce ou individu) choisi par le prêtre au lancement, pour tous les bénéficiaires, 4 Rounds.
- B : chaque Myrmidien bénéficiaire choisit son ennemi.
- C : Intrépide (Tout) pour 4 Rounds, comme Flambeau de Vertu (plus fort que la source, qui impose un ennemi).

**Classification probable.** `assisted`. Couvre : `grant-talent` `{talents:[{id:'talent-fearless', specialization:<ennemi>}]}` (Talent injectable, lu par `v5-talent-psychology.js` avec le contexte de groupe d'ennemi), durée `fixed` 4 `rounds`, portée `fixed` 36 `yards`. Reste manuel ou à fait de cible : qui est « Myrmidien » (la grammaire n'a que le fait `non-Myrmidian`, à inverser ou à compléter), l'ennemi choisi.

### 3.8 Compétence Martiale (Skill of Combat)

**V4 reformulé.** P : 24 yards (24 mètres de jeu). C : « voir texte », tous les alliés à portée. D : 4 Rounds. Chaque allié reçoit +10 en CC et en CT (valeur exacte, sur les caractéristiques).

**Équivalent V5 et notions changées.**
- Le +10 porte sur la **caractéristique** : c'est exactement l'effet V5 des Bénédictions de Bataille (+10 CC) et de la Chasse (+10 CT), p.221 : aucune conversion nécessaire.
- Cumul possible avec ces Bénédictions (jusqu'à +20 CC par exemple) : à traiter selon les règles de cumul établies (DIV-05) ; la p.217 n'interdit le cumul que d'une même prière.
- Cible sans plafond ; seules durée (+4 Rounds par +2 DR) et portée (+24) croissent.

**Options.**
- A (recommandée) : +10 CC et +10 CT, 4 Rounds, comme la source et comme les Bénédictions V5.
- B : +1 DR aux Tests de Mêlée et de Tir (équivalence de pas +10 = +1 DR) ; plus faible sur les jets mais indépendant de la caractéristique.

**Classification probable.** `assisted`, voire `implemented` si la désignation des alliés est entièrement outillée : deux `characteristic-modifier` `{characteristic:'CC', value:10}` et `{characteristic:'CT', value:10}`, durée `fixed` 4 `rounds`, portée `fixed` 24 `yards`, cibles `special`.

### 3.9 Vindicte Vengeresse (Vengeful Wrath)

**V4 reformulé.** P : vous. C : vous. D : 6 Rounds. Le prêtre est empli de l'indignation de Myrmidia : il doit charger et attaquer l'ennemi impénitent le plus proche, et peut relancer tous ses jets de compétence de Mêlée pendant la durée.

**Équivalent V5 et notions changées.**
- Charge V5 (p.163) : Mouvement de Charge puis Test de Mêlée comme Action ; l'Avantage de charge V4 devient l'Élan (cible à Mouvement yards ou plus et dans la Course). Si le prêtre est déjà Engagé, il ne peut pas charger.
- Relance : le texte V4 ne dit pas si le nouveau résultat tient ni combien de fois. V5 : le nouveau résultat tient (p.133, p.221). Les doubles (Critique et Maladresse de Mêlée, p.130) s'appliquent au jet retenu.
- Contrainte de comportement : la Frénésie V5 (p.184) impose aussi d'avancer vers l'ennemi et de l'attaquer, avec Test de Force Mentale pour y entrer, fin sur Étourdi ou Inconscient. Ici aucun Test, et le texte n'écrit pas de condition de fin. Ne pas lui donner les bonus de la Frénésie (immunité à la Psychologie, attaque gratuite, +1 Dégât).
- « Ennemi impénitent » n'est défini nulle part ; la p.207 du livre V5 emploie le mot dans les commandements de Myrmidia (pas de pitié pour les ennemis impénitents de l'Humanité).
- P et C « Vous » : seule la durée peut croître (+6 Rounds par +2 DR).

**Options (relance).**
- A (recommandée) : chaque Test de Mêlée du prêtre peut être relancé une fois, le nouveau résultat tient (convention V5 p.133).
- B : une relance par Round (6 au maximum, plus 6 par +2 DR).
- C : un nombre N de points de Chance temporaires, réservés à la Mêlée, fixé par le MJ (aucune valeur dans la source).

**Classification probable.** `manual`. Types d'effet existants : aucun pour la relance ni la contrainte ; `temporary-fortune` couvre seulement l'option C. Chiffrable : durée `fixed` 6 `rounds`, P et C `self`.

## 4. Errata et version officielle : ce qui a été cherché et ce qui n'est pas trouvé

**Cherché dans les 17 PDF du corpus** (texte extrait de chacun par `pdftotext`, recherche insensible à la casse) :
- les neuf noms anglais : présents **uniquement** dans Up in Arms p.79 ; l'unique autre occurrence littérale est une locution sans rapport (Archives of the Empire 3, « vengeful wrath » d'un Graal) ;
- les neuf noms français du catalogue : absents des 17 livres (une occurrence de « attaque rapide » à la ligne 8667 du texte extrait du livre de base FR est une phrase de règle sans rapport) ;
- le mot « errata » : **0 occurrence** dans les 17 livres ;
- « Miracles of Myrmidia » : livre de base V5 p.224 (six miracles : Soleil flamboyant, Œil de l'aigle, Appel à la Fureur, Inspirant, Bouclier de Myrmidia, Lance de Myrmidia) et Up in Arms p.79 seulement ; aucun autre livre ne contient de liste de miracles de Myrmidia ;
- les livres contenant « Myrmidia » en passant (Archives of the Empire 2 et 3, Deft Steps, Lustria, Power Behind the Throne, Imperial Zoo) : contexte de culte, d'ordres ou de PNJ, aucune version des neuf miracles.

**Cherché dans le dépôt** : les neuf noms (EN et FR), « errata », « erratum » dans `docs/`, `js/`, `tools/`, `tests/`. Résultat : uniquement le catalogue (`Miracles.csv`, snapshot), le générateur, les notes `docs/divin/` et leurs tests de provenance ; aucune adaptation V5 ni errata.

**Non trouvé, dit honnêtement.**
- Aucune version V5 officielle ni adaptation des neuf miracles dans les 17 PDF ni dans le dépôt.
- Aucun errata corrigeant la page 79 (paramètres de Sur un Terrain Mortel) dans les 17 PDF.
- La recherche Web antérieure (`DIVIN_RECHERCHE_ERRATA_UP_IN_ARMS.md`) a repéré une mise à jour PDF d'Up in Arms annoncée par l'éditeur en décembre 2023 (corrections de texte, coquilles, carrières, armes de siège, index) **sans** obtenir le fichier ni confirmer qu'il touche la page 79. La copie locale date de mars 2022 (métadonnées) : elle précède probablement cette mise à jour. Je n'ai pas relancé de recherche Web dans cette passe.
- Conclusion : « non trouvé dans les sources disponibles », pas « inexistant ». La mise à jour 2023 est la piste à fermer en priorité si le MJ peut en fournir le PDF.

## 5. Tableau récapitulatif

| Miracle | Statut actuel | Statut probable | Types d'effet moteur utilisables | Points bloquants avant validation |
| --- | --- | --- | --- | --- |
| Commander la Légion | `blocked` | `assisted` | `test-modifier` (Commandement, DR) | Forme du +10 ; portée des Tests concernés |
| Effrayer l'Ennemi | `blocked` | `assisted` | `grant-trait` (Terreur 1) | Qui teste, et quand |
| En Bon Ordre | `blocked` | `manual` | aucun pour l'effet ; durée seule | Brisé de Fuite ; Désengagement ; zone entière ou Bonus |
| Connaître son Ennemi | `blocked` | `manual` | aucun ; paramètres seuls | Étendue des informations ; portée entière ou Bonus |
| Sur un Terrain Mortel | `blocked` | `manual` | aucun (clé `special-state` à créer) | Durée non attestée ; cible ; Brisé existants ; zone |
| Attaque Rapide | `blocked` | `manual` (`assisted` après développement) | aucun ; mécanisme d'attaque gratuite de talent à étendre | Attaque opposée ou non ; cumul avec l'Élan |
| Dévotion de la Guerrière | `blocked` | `assisted` | `grant-talent` (Intrépide) | Choix de l'ennemi ; perte de la protection contre la Terreur ; fait « Myrmidien » |
| Compétence Martiale | `blocked` | `assisted` (ou `implemented`) | `characteristic-modifier` ×2 | Forme du bonus ; cumul avec les Bénédictions |
| Vindicte Vengeresse | `blocked` | `manual` | aucun (`temporary-fortune` seulement pour l'option C) | Relance ; « impénitent » ; fin de la contrainte |

Aucun miracle n'est `implemented`. Statut réel après raccordement : voir l'en-tête (3 `assisted`, 6 `manual`) ; la colonne « Statut probable » est la prévision d'origine.

## 6. Questions pour le MJ (sélecteurs)

Chaque sélecteur propose 2 ou 3 options ; la recommandation est marquée.

1. **Commander la Légion : forme du +10 au Test.**
   - (a) +1 DR aux Tests de Commandement *(recommandé)*
   - (b) Avantage aux Tests de Commandement
2. **Commander la Légion : quels Tests de Commandement comptent.**
   - (a) Tous ceux du Round où l'ordre concerne un combat armé ; le MJ veille à la pertinence (réalisable par `test-modifier`) *(recommandé)*
   - (b) Uniquement le Test qui émet l'ordre à l'allié désigné (suivi manuel)
3. **Effrayer l'Ennemi : qui doit faire le Test de Psychologie.**
   - (a) Tout ennemi qui voit le prêtre au lancement, une fois pendant la durée *(recommandé)*
   - (b) Seulement les ennemis qui n'ont pas encore rencontré le prêtre dans l'affrontement
4. **Willpower entière ou Bonus pour la portée de Connaître son Ennemi et les zones d'En Bon Ordre et de Sur un Terrain Mortel.**
   - (a) Convention V5 du livre de base : portée en caractéristique entière, zones en Bonus ; écart V4 documenté *(recommandé)*
   - (b) Lecture littérale d'Up in Arms : caractéristique entière partout (par exemple 40 yards de rayon pour une Volonté de 40)
   - (c) Bonus partout, comme le catalogue actuel
5. **En Bon Ordre : étendue de l'exemption.**
   - (a) Fuite seulement : pas d'Élan ni d'attaque gratuite pour l'adversaire, le fuyard gagne quand même ses Brisé *(recommandé)*
   - (b) (a) et pas de Brisé gagnés en fuyant
   - (c) (a) et Désengagement libre (sans Élan ni Test)
6. **Sur un Terrain Mortel : durée (non imprimée).**
   - (a) Bonus de Volonté en Rounds, comme En Bon Ordre et le catalogue, marqué non attesté *(recommandé)*
   - (b) 4 Rounds fixes
   - (c) Garder le contrat bloqué jusqu'à un erratum officiel
7. **Sur un Terrain Mortel : prêtre et Brisé déjà acquis.**
   - (a) Le prêtre est bénéficiaire ; les Brisé déjà acquis restent (seule l'acquisition est empêchée) *(recommandé)*
   - (b) (a) mais les Brisé existants sont aussi retirés au lancement (comme Flambeau de Vertu, hors texte)
   - (c) Le prêtre n'est pas bénéficiaire (seulement les alliés)
8. **Attaque Rapide : nature de l'attaque gratuite.**
   - (a) Attaque de Mêlée ordinaire opposée, une fois par Round, Élan normal *(recommandé)*
   - (b) Attaque non opposée (comme la Fuite V4), sans Élan
   - (c) (a) mais sans attaque supplémentaire à l'Élan le même Round
9. **Dévotion de la Guerrière : choix de l'ennemi.**
   - (a) Un seul ennemi, choisi par le prêtre au lancement, pour tous *(recommandé)*
   - (b) Chaque bénéficiaire choisit le sien
   - (c) Intrépide (Tout), comme Flambeau de Vertu
   (À noter dans tous les cas : en V5, Intrépide ne protège plus de la Terreur.)
10. **Compétence Martiale : forme du bonus.**
    - (a) +10 CC et +10 CT, comme les Bénédictions de Bataille et de la Chasse *(recommandé)*
    - (b) +1 DR aux Tests de Mêlée et de Tir
11. **Vindicte Vengeresse : règle de relance.**
    - (a) Chaque Test de Mêlée relançable une fois, le nouveau résultat tient *(recommandé)*
    - (b) Une relance par Round
    - (c) N points de Chance temporaires réservés à la Mêlée (N fixé par vous)
12. **Vindicte Vengeresse : « ennemi impénitent » et fin de la contrainte.**
    - (a) Le MJ désigne l'ennemi impénitent à chaque scène ; la contrainte s'arrête si aucun n'est en vue ou si le prêtre est Étourdi ou Inconscient *(recommandé)*
    - (b) Tout adversaire hostile compte comme impénitent ; fin seulement à la durée
13. **Connaître son Ennemi : étendue des informations.**
    - (a) Caractéristiques, Traits, compétences, Talents ; secrets gardés par le MJ *(recommandé)*
    - (b) (a) plus Blessures actuelles, Chance et équipement visible
    - (c) Étendue graduée par DR (non écrite dans la source)

**Total : 13 questions.**
