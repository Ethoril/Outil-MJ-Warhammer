# Calculs des Traits de créature (second chantier des Traits)

Cadrage du 17/11/2026, étape 1 du skill `cadrer-feature`. Périmètre : le tri [tri.md](tri.md) (sections 2A, 2B, 2C) et les quatre décisions du MJ du 17/11. Les règles ont été relues dans les livres, les fonctions citées ont été vérifiées dans le code (lecture seule). Rien n'est recopié des livres : nom, page, valeurs chiffrées, paraphrase courte. Texte extrait de travail : `tmp/reprise-team/traits-calculs-spec/` et `tmp/reprise-team/traits-d13/` (non versionnés).

## Pourquoi

La 3.51.0 permet de cocher des Traits optionnels, mais la plupart des Traits ne sont encore que des rappels en texte. Le MJ a trié ceux qui se calculent. Pour la plupart, le calcul existe déjà dans un module pur (`planStateOnWound`, `planPsychology`…) et il manque l'appelant. Cette spec dit, Trait par Trait, ce que la règle exige, ce que le code fait, où brancher, et ce qui se fait d'office ou par bouton.

## Livres relus

| Sigle | Livre | Pages utiles |
|---|---|---|
| LB-V5 | Livre de base V5 EN v3 (L06), « Creature Traits » | pp. 356-363 (liste), p. 364 (conversion : l'Avantage des livres V4 se lit Élan) |
| LB-FR | Livre de base français V4 (L05) | pp. 338-343 |
| L11 | The Imperial Zoo, table récapitulative | pp. 135-137 ; Disruption p. 82 |
| L07 | Lustria, « New Trait: Flammable » | p. 165 |
| L22 | The Horned Rat Companion, profils Skavens (Shield) | p. 14 (selon le catalogue, note de profil relue, page imprimée à reconfirmer) |
| L13 | Up in Arms, qualité d'arme Shield | pour comparaison seulement |

Règle d'édition retenue par le code (et conservée) : un livre V5 s'applique tel quel ; un livre V4 est lu avec la conversion de LB-V5 p. 364 (Avantage = Élan), sauf mention contraire dans la colonne « écart ».

## Constats qui corrigent le tri

À lire avant la table, car ils changent le travail.

1. **« D'office comme Venin » : Venin n'est pas d'office.** Venin, Nuée, Peur et Terreur sont des boutons de la fiche (`js/ui/creature-states-block.js`, `Store.applyCreatureVenom`, `applySwarmEndOfRound`, `applyCreaturePsychology` dans `js/core/store.js` ~4001-4066). Aucun crochet « à la blessure » n'appelle `planStateOnWound`. Le d'office de la décision Q1 demande donc de **créer** les crochets (voir D5), pas de copier un existant.
2. **`planPsychology` n'est appelée que pour Peur et Terreur** (`js/core/store.js:4012`). Tous les autres Traits de psychologie ne sont que des rappels. « Féroce déjà calculé » est inexact : `planPsychology('grim')` existe, aucun appelant ; seule une case « attaque gratuite » existe dans `js/ui/resolution-panel.js:2452`.
3. **L'Élan du moteur est un booléen** (`extensions.v5.hasMomentum`), alors que `planUnstableEndOfRound` attend des nombres (`enemyMomentum`, `ownMomentum`, `Number.isFinite`). Un adaptateur est nécessaire.
4. **Deux effets prévus par les plans n'ont pas d'état dans le moteur** : « Plaie purulente » (Infecté) et « Disparition » (Instable). Les états du moteur sont ceux de `V5_CONDITION_KEYS` (`js/core/v5-effects.js:15`).
5. **Le moteur ne sait pas l'engagement ni la rencontre sans l'aide du MJ**, sauf les engagements durables du plateau (`js/core/engagements.js`, `engagedWith`), déjà utilisés pour pré-cocher les engagés de la Nuée.
6. **Disruption** est bien déclarée « covered, par T3 Instable » (`js/data/creature-abilities.js`, E0-T-147), mais `planUnstableEndOfRound` n'en fait qu'un rappel (`js/core/creature-states.js:141`). **Creature Weapons** (E0-T-288) : l'expression `V4_NATURAL` (`js/core/creature-combat.js:46`) lit les noms d'attaque « Claws +6 », mais rien ne lit le Trait lui-même.
7. **Le catalogue se trompe sur Shield** : il écrit que l'astérisque de « Shield 2* » n'a pas de note imprimée. Elle existe dans L22 (profils des clans Skavens) : le bouclier y est porté dans le dos, sans le bénéfice habituel, avec 2 PA contre les attaques venant de derrière.

## Table des Traits

Légende : « d'office » = le moteur connaît le déclencheur, l'effet se pose seul, annulable par ↶ (décision D1) ; quand un dé ou un Test est nécessaire, le moteur **demande** le résultat au MJ (toute transition de Tour passe déjà par des dés saisis : `previewV5Turn`, `js/core/v5-turn.js`, mécanisme `needsInput`/`requests`). « bouton » = action de la fiche, comme Venin.

### 2A. Brancher un calcul qui existe

| Trait | Règle (paraphrase, page) | Fonction existante | Branchement | Écart règle / code |
|---|---|---|---|---|
| Sang corrosif | À chaque blessure du porteur, un seul d10 de dégâts pour tous ceux qui lui sont engagés (LB-V5 p. 357 ; LB-FR p. 341 ajoute : réduit par BE et PA, minimum 1). | `planStateOnWound(…, 'corrosive')` — `js/core/creature-states.js:74` | **D'office à la blessure** : le d10 est demandé une fois ; les engagés viennent du plateau. | LB-V5 dit seulement « Damage » ; le plan ne réduit pas par BE/PA. Question 1. |
| Infecté | Si le porteur fait perdre des Blessures à un vivant, Test d'Endurance Facile (+4 DR) ou Plaie purulente (LB-V5 p. 359). | `planStateOnWound(…, 'infected')` — `creature-states.js:74` ; `living` option | **D'office à la blessure infligée** : Test demandé à la victime (jamais pour un Mort-vivant ni une Fabrication). | Pas d'état « Plaie purulente » dans le moteur : un échec saisi produit une ligne de journal et un rappel (D7). Le Souillé ne gère que le Désavantage des Tests d'Endurance (`v5-test-context.js:151`). |
| Parasité | Tous les adversaires ont −1 DR pour toucher le porteur en mêlée (LB-V5 p. 359 ; V4 : −10). | `planStateOnWound(…, 'infestation')` — `creature-states.js:74`, rend `targetedModifier { mêlée, −1 }` | **D'office, modificateur de Test** dans l'aperçu d'attaque de mêlée contre le porteur (pas un événement). | `stateReminders` le laisse en rappel pur aujourd'hui. Aucun modificateur n'est lu. |
| Instable | Fin de Round engagé avec un adversaire qui a l'Élan alors que le porteur n'en a pas : 2 Blessures ; à zéro, il disparaît (LB-V5 p. 363). | `planUnstableEndOfRound` — `creature-states.js:125` | **D'office en fin de Round** (phase `endOfRound` de `previewV5Turn`, `js/core/v5-turn.js:118-126`), comme la Nuée mais sans bouton. | Adaptateur booléen → nombre (constat 3). « Disparition » sans état : à 0 Blessure, passer par la décision de mort existante (`pendingStateDeath`, `decideStateDeath`, cause `unstable`). Profil L11 : LB-FR p. 340 et L11 p. 137 comptent l'écart d'Avantage, pas 2 fixes ; le plan laisse déjà ce cas en rappel. |
| Increvable | À la mort, corps intact : Test d'Endurance Intermédiaire demandant 6 DR, retenté à chaque début de Round pendant BE Rounds ; réussite : retour à 1 Blessure (LB-FR p. 339 ; L11 p. 135). Absent de LB-V5. | `planDieHard` — `creature-states.js:146` | **D'office à la mort confirmée** si le MJ coche « corps intact » dans la décision de mort ; puis demande d'Endurance à chaque début de Round pendant BE Rounds. | Le plan dit « Endurance étendue de six DR à chaque début de Round » : cumul sur les Rounds ou 6 DR par Round ? Question 2. Les Blessures Critiques non mortelles « soignables » restent en rappel. |
| Stupide | Guidé par un allié non Stupide proche, rien ; sinon Test d'Intelligence Facile (+4 DR) au début de chaque Round, sinon il perd Mouvement et Action (LB-V5 p. 362). | `planPsychology(…, 'stupid')` — `creature-psychology.js:163` | **D'office en début de Round** (Q1) : demande du Test pour chaque porteur actif ; la proximité d'un allié non Stupide est une case demandée si un tel allié est en jeu, sinon le Test est certain. Exemptés : Nuée, Immunité psychologique. | « Perd Mouvement et Action » n'a pas de mécanisme dans le moteur : marqueur « tour perdu » à concevoir au plan (D8). Le Test n'est exécuté nulle part aujourd'hui. |
| Bestial | Ni langage ni raison ; défense par l'Esquive seule ; Brisé s'il est blessé par le feu ; sous la moitié des Blessures, il fuit, sauf s'il protège ses petits, est acculé ou Territorial : Frénésie (LB-V5 p. 356). | `planPsychology(…, 'bestial')` — `creature-psychology.js:132` | **D'office** (a) défense limitée à l'Esquive dans le plan de défense de `resolution.js` ; (b) **à la blessure** qui passe sous la moitié : ligne de journal « fuite » ou « Frénésie », sans état posé ; « protège ses petits / acculé » = case de la fiche. Le Brisé par le feu reste en rappel. | Rien de ces trois points n'est lu aujourd'hui (aucune occurrence de Bestial dans `resolution*.js`). |
| Affamé | Si le porteur tue ou met hors de combat un vivant, ou croise un cadavre frais : Test de Calme Accessible (+2 DR) sinon repas, il perd son prochain Mouvement et Action (LB-V5 p. 358 ; V4 : Volonté). | `planPsychology(…, 'hungry')` — `creature-psychology.js:160` | **D'office** quand le porteur met un vivant à 0 Blessure (le moteur connaît `receipt.kill`) : Test demandé. **Bouton** pour « cadavre frais ». | Même « tour perdu » que Stupide (D8). |
| Effrayé | Le porteur a Peur (2) de la cible nommée ; Test de Psychologie étendu (LB-V5 p. 356). | `planPsychology(…, 'afraid')` — `creature-psychology.js:102` | **Bouton « Rencontre »** (le moteur ne connaît pas la rencontre) : le MJ choisit la cible parmi celles qui portent le mot-clé nommé ; pose la Peur (2) par `previewGenericFearEncounter`. | Texte V4 : « Peur 0 » (L11 p. 135, LB-FR p. 339) ; V5 : Peur (2). Le code suit V5 et le livre V5 prime. |
| Animosité | Rencontre de la cible nommée : Test de Psychologie ; en cas d'échec, il l'attaque (socialement ou physiquement), +1 DR de Sociabilité contre elle (LB-V5 p. 356). | `planPsychology(…, 'animosity')` — `creature-psychology.js:123` | **Bouton « Rencontre »**, même bloc qu'Effrayé : Test de Calme demandé ; échec : journal + rappel. | Le +1 DR de Sociabilité « pour s'opposer ou dénigrer » n'est pas un Test que le moteur sait reconnaître : il reste en rappel (D9). Le Test du plan est un Calme, le livre dit « Psychologie ». |
| Frénésie | Test de Volonté pour entrer ; immunité à la Psychologie, attaque gratuite par Round, +1 dégât ; fin sans ennemi en vue, Sonné ou Inconscient, puis Fatigué (LB-V5 p. 358). | `planPsychology(…, 'frenzy')` — `creature-psychology.js:155` ; effets de l'état déjà lus dans `resolution.js:622`, `v5-combat-rules.js:335` | **Bouton « Entrer en Frénésie »** (le choix de la créature, jamais d'office). | L'action « Entrer en Frénésie » n'existe que pour le Talent (`js/core/v5-talent-actions.js:32`) : l'étendre au Trait (précédent : l'emprunt de talent de `v5-talent-actions.js:58-59`). |
| Rage (Fury) | V4 : dépenser tous les Avantages (minimum 1) pour Haine des adversaires en mêlée, ou (minimum 3) pour Frénésie, puis perdre l'Avantage (L11 p. 136 ; LB-FR p. 341). Absent de LB-V5 ; conversion p. 364. | `planPsychology(…, 'fury')` — `creature-psychology.js:176` | **D'office dès que le porteur gagne l'Élan** (lecture littérale du MJ du 04/11) : l'état Frénésie est posé et l'Élan perdu. Hook : `planMomentum` de `resolution.js:1416` (avant faux, après vrai). | Le Trait V4 est un choix (« peut dépenser ») ; la lecture du MJ du 04/11 le rend automatique. Les seuils 1 et 3 valent l'Élan (un seul). La Haine seule n'est plus proposée. |
| Vampirique | Une Morsure réussie sur une proie adéquate soigne autant de Blessures que la proie en perd ; seul soin possible (LB-V5 p. 363). | `planVampiricHeal` — `creature-states.js:99` | **Bouton** (la proie admissible reste au MJ, tri) : Blessures infligées pré-remplies depuis le dernier résultat du porteur, Morsure et proie à cocher. | Aucun écart. Le plafond de Blessures du porteur n'est pas dans le plan : à ajouter. |
| Béni, Miracles | Accès aux Bénédictions ou aux Miracles du dieu ; Compétence Prière à Sociabilité +10 (ou plus, au choix du MJ) (LB-V5 pp. 356 et 359). | `planCreatureMagic(…, 'blessed' / 'miracles')` — `js/core/creature-magic-traits.js:104`, ré-exporté par `creature-magic.js:7` | **D'office** : la base de Prière d'un porteur sans compétence Prière = Soc + 10 (comme `creatureCastingBases` le fait pour Focalisation, lu par `v5-magic-channelling.js:182` et `v5-magic-casting.js`). | Rien ne lit `prayerBase` : le moteur de prières (`v5-divine-engine.js:502`, `v5-divine-store.js:1068`) prend la compétence du lanceur. À coordonner avec le chantier des miracles narratifs (je n'ai pu lire que le tri). |
| Champion | Si le porteur gagne l'Opposition en défense de mêlée, il blesse comme l'attaquant (LB-V5 p. 357). | `planCreatureMagic(…, 'champion')` ; chemin de la Riposte : `resolution.js:1017-1035` | **D'office** sur l'Opposition de mêlée gagnée : même chemin que la Riposte du Talent (dégâts du défenseur calculés dans le résultat). | **La Riposte du Talent est limitée à une par Round** (`resolution.js:1019-1022`) ; Champion n'a pas cette limite dans le livre. Ne pas réutiliser le quota. |

### 2B. Petits ajouts

| Trait | Règle (paraphrase, page) | Fonction existante | Branchement | Écart règle / code |
|---|---|---|---|---|
| Insensible à la douleur | Les pénalités non dues à une amputation, issues des Blessures Critiques, sont ignorées ; les États restent (LB-V5 p. 360 ; LB-FR p. 340 ; L11 p. 136). | Rappel dans `js/core/creature-natures.js:103`. Précédent : le Talent Maîtrise du corps ignore déjà les pénalités critiques (`v5-combat-rules.js:410-412`, modificateurs `critical-wounds` et `source.kind === 'critical'`). | **D'office dans le calcul des Tests** : étendre `ignoreCritical` au Trait, hors Test étendu. | Le moteur distingue bien les deux : la table `js/data/v5-crits.js` (`LASTING_OUTCOMES`, ~l. 94-170) étiquette `kind: 'amputation'` (et `amputation: true` pour la perte fonctionnelle des jambes) contre `injury`, `test`… Les lignes de séquelles (`sequelaEffectRows`, `js/core/v5-sequela-effects.js:60`) n'emportent pas aujourd'hui cet étiquetage : à vérifier au plan. Un modificateur `source.kind === 'critical'` ne doit pas effacer la pénalité d'un **État** (à tester, CA17). |
| Bond | Charge, Saut ou Sprint : Mouvement doublé et terrain et créatures franchis (LB-V5 p. 357). | `planMovement(…, 'bounce')` — `js/core/creature-movement.js:76` | Le double ne vaut que pour ces trois actions. Affichage : voir Question 3. | LB-V5 : Charge, Saut, Sprint ; L11 p. 135 : « Charge ou Course ». `rangeCellsOf` (`map-link-state.js:57`) dit expressément que Bond ne change pas Marche ni Course ; ses `speedCells` sont aussi lues par la poursuite (`v5-pursuit.js:35`) : **ne pas les doubler**. |
| Dressé (Guerre) | +10 CC, ignore Craintif pour les bruits forts (LB-V5 p. 363). Le +10 CC est livré en 3.51.0. | `planMountedFall` — `js/core/v5-mounted-combat.js:151` ; `TRAINED_EFFECTS` dans `creature-magic-traits.js:36` | Demander la **cause** de l'événement de monture surprise ou enchevêtrée quand elle porte Craintif ; si la cause est « bruit fort » et que la monture est Dressé (Guerre), pas de Test de Chevaucher. | Le plan ne connaît pas la cause. Appelants : `resolution.js:1259`, `store.js:2152, 5350, 5372, 5400`. Craintif : LB-V5 p. 361 donne +1 Brisé, les livres V4 +3 ; le code n'applique que +1. |
| Dressé (Magie) | Ignore Craintif face à la magie (LB-V5 p. 363). | idem | Même question de cause : « magie » → pas de Test si Dressé (Magie). | Même écart. Chaque dressage ne couvre que sa cause. |
| Se cabrer (Rear) | La créature plus grande remplace son déplacement par un Piétinement contre un plus petit, dégâts BF+0 (L11 p. 136 ; LB-FR p. 341). Aucun Trait équivalent en LB-V5 (Piétinement : p. 361). | `planNaturalAttack(…, 'stomp')` — `js/core/creature-combat.js:98`, règle `stomp` l. 19 | **Bouton / action « Se cabrer »** : même calcul que le Piétinement, mais le coût est le **déplacement**, pas l'Élan, et l'attaque n'est pas gratuite. | La règle `stomp` coûte l'Élan et se joue en attaque gratuite ; il faut une option `via: 'rear'`. Le registre de ressources du Tour ne connaît peut-être pas de coût « déplacement » : à vérifier (`v5-store-action.js:137`). |
| Bouclier (Shield n) | Trait V4 de profil : un bouclier de valeur n. Lu comme l'option Bouclier du livre de base V5 : +n PA et +1 DR en opposition par Esquive ou Mêlée (catalogue, E0-T-287, L22 p. 14). La qualité d'arme de L13 (« Shield (Rating) ») n'ajoute que des PA, et à partir de 2 permet d'opposer un tir vu. | Pas de fonction. Brique existante : le bouclier d'équipement dans `js/core/equipment.js` (`context.shieldId`, `shieldAp`, l. 542-600). | **D'office** : un bouclier virtuel de valeur n pour le porteur (protection de la zone touchée, +1 DR en opposition). | Écart de lecture entre L22 (V4) et la qualité L13 ; le code garde la lecture déjà posée au catalogue. **Cas L22 « * »** : bouclier dans le dos, aucun bénéfice habituel, 2 PA contre les attaques venues de derrière : rappel seul (pas de direction d'attaque dans le moteur). |
| Inflammable | Tests pour éviter de gagner Enflammé à −20 (V4 ; −2 DR en V5, comme Parasité −10 → −1 DR) ; Blessures d'Enflammé doublées (L07 p. 165). | Dégâts d'Enflammé : `js/core/v5-effects.js:349-355` (1d10 + niveau − 1 − BE − PA). Tests d'Enflammé : `v5-effects.js:213`. | **D'office** : ×2 sur la perte calculée à chaque fin de Round ; −2 DR au Test pour éviter l'état (point d'accroche à localiser dans `v5-test-context.js`). | « −20 » du tri : en DR du moteur c'est −2. Le livre vise les Tests pour éviter d'acquérir l'état ; le Test de retrait (Athlétisme) n'est pas cité. Question 4. |

### 2C. Nettoyage

| Trait | Règle | Code | Branchement | Écart |
|---|---|---|---|---|
| Disruption (E0-T-147, L11 p. 82) | En présence d'un porteur, les Instables comptent leur Avantage à deux de moins, sans le perdre. | Déclarée `covered` (« T3 Instable ») dans `js/data/creature-abilities.js` ; `creature-states.js:141` ne produit qu'un rappel. | Passer à `status: 'reminder'` avec un `motif`, comme E0-T-148. Aucun calcul. | Déclaration plus forte que le code. |
| Creature Weapons (E0-T-288, L22 p. 73) | Les attaques « Claws +6 », « Beak +8 »… portent leurs dégâts imprimés. | `V4_NATURAL`, `creature-combat.js:46`, lit ces **noms d'attaque** ; le Trait lui-même n'est lu par rien. | Passer à `reminder` : les attaques imprimées sont des actions ordinaires. | Déclaration `covered` par « T2 Armes naturelles V4 » vraie pour les noms d'attaque, fausse pour le Trait. |

## Décisions

### Décisions du MJ (17/11/2026, reprises de [tri.md](tri.md) section 4)

| N° | Sujet | Décision |
|---|---|---|
| D1 | Psychologie (Q1) | D'office quand le moteur connaît le déclencheur (Stupide en début de Round, Bestial sous la moitié des PV…), avec ↶ ; bouton sinon. |
| D2 | Insensible à la douleur (Q2) | À calculer. |
| D3 | Traits rares à règle propre (Q3) | Restent en rappel. |
| D4 | Traits de terrain (Q4) | Restent en rappel. |
| D13 | « D'office » (révise D6, 17/11) | La demande du Test ou du d10 s'ouvre d'elle-même au bon moment, **avec un bouton qui tire le dé** (comme les autres jets de l'outil) en plus de la saisie d'un résultat ; un seul ↶ annule. |
| D14 | Sang corrosif (question 1) | Dégâts réduits par BE et PA, minimum 1. |
| D15 | Increvable (question 2, corrigée par le MJ après relecture de la règle) | Test étendu : un Test de Résistance (+0) au début de chaque Round, les DR s'additionnent ; la créature revient à 1 Blessure dès que le total atteint 6 DR, au plus en BE Rounds. |
| D16 | Bond (question 3) | Pastille sur la fiche **et** portée de Bond envoyée à la carte : touche aussi le dépôt de la carte (`E:/rpg-map-display`), qui doit accepter le champ (contrat de liaison à étendre, carte tolérante à son absence). |
| D18 | Increvable, Round échoué (après L1) | Un échec ajoute 0 DR au total ; il ne le fait jamais baisser. |
| D19 | Sang corrosif, PA (après L1) | Pour chaque engagé, l'outil tire lui-même la localisation (d100, table des localisations habituelle de l'outil), sans jet manuel, et soustrait les PA de cette zone ; minimum 1. |
| D17 | Inflammable (question 4, non posée) | Recommandation de Claude retenue par défaut : −2 DR sur les seuls Tests pour éviter Enflammé, pas sur le retrait par Athlétisme. |

### Choix de Claude, à confirmer

| N° | Sujet | Choix |
|---|---|---|
| D5 | Où se branche le d'office | Trois collecteurs, pas un crochet par Trait. (a) **À la blessure** : un lot « effets de Traits » dans le résultat de résolution, sur le modèle de `mountedFallPlans` (`resolution.js:1233-1262`), appliqué par le commit comme les chutes de monture. (b) **Fin et début de Round** : phases `endOfRound` et `startOfRound` de `previewV5Turn`, avec demande de dés par `requests`. (c) **Boutons** de la fiche pour tout déclencheur inconnu du moteur. |
| D6 | « D'office » veut dire « demandé d'office » | Le moteur ne tire aucun dé : il pose la demande du Test ou du d10 sans que le MJ ouvre quoi que ce soit, puis applique le résultat saisi. Un seul ↶ annule la demande appliquée. |
| D7 | Infecté, échec du Test | Pas d'état « Plaie purulente » ajouté au moteur : ligne de journal et rappel. |
| D8 | « Perd son Mouvement et son Action » (Stupide, Affamé) | Un marqueur « tour perdu » sur le participant pour son prochain Tour, affiché sur la carte de la fiche et levé à la fin du Tour. Mécanisme à concevoir au plan : le registre d'Actions du Tour (`system:turn-action`) est le candidat. |
| D9 | Animosité, Effrayé | Boutons dans un même bloc « Rencontre » ; Animosité ne calcule pas le +1 DR social. |
| D10 | Mort d'un Instable | Passe par la décision de mort existante (cause `unstable`), jamais de suppression automatique. |
| D11 | Cumul avec les Traits cochés (3.51.0) | Un Trait coché agit comme imprimé (D9 de la 3.51.0) : chaque calcul ci-dessus lit `participant.traits` comme avant. |
| D12 | Rien ne change pour un participant sans ces Traits | Contrôlé par les tests existants et CA24. |

## Scénarios et critères d'acceptation

Chaque CA est prouvé par un test unitaire dans `tests/unit/creatures/traits-calculs-*.test.js` (ou `combat/`), sauf mention « parcours ».

**S1. À la blessure.**
- CA0. Toute demande ouverte d'office (D13) offre un bouton qui tire le dé et la saisie d'un résultat ; les deux donnent le même effet pour la même valeur.
- CA1. Un porteur de Sang corrosif blessé : une seule demande de d10 ; ce d10 s'applique à chaque engagé, réduit par son BE et ses PA, minimum 1 (D14) ; sans engagé, rien ; ↶ rétablit les Blessures.
- CA2. Un porteur d'Infecté fait perdre des Blessures à un vivant : le Test d'Endurance +4 DR est demandé à la victime ; une victime Mort-vivant ou Fabrication, aucune demande ; échec saisi : ligne de journal « Plaie purulente », aucun état ajouté.
- CA3. Une attaque de mêlée contre un porteur de Parasité montre −1 DR dans l'aperçu ; un tir, aucun changement.
- CA4. Un porteur de Bestial qui passe sous la moitié de ses Blessures produit une ligne « fuite » ; « Frénésie » s'il est Territorial ou si « protège ses petits » est coché ; une seule fois par franchissement du seuil.
- CA5. Un porteur d'Affamé qui met un vivant à 0 Blessure : le Test de Calme +2 DR est demandé ; échec saisi : marqueur « tour perdu ».

**S2. Fin et début de Round.**
- CA6. Instable engagé, adversaire avec Élan, porteur sans Élan : 2 Blessures directes en fin de Round, journal ; autres cas, rien ; profil L11 : rappel seul.
- CA7. Instable ramené à 0 Blessure : une décision de mort proposée (cause `unstable`), aucune suppression.
- CA8. Stupide actif, non guidé : au début du Round, demande du Test d'Intelligence +4 DR ; échec : marqueur « tour perdu » ; guidé, Nuée ou Immunité psychologique : aucune demande.
- CA9. Increvable : après confirmation de mort avec « corps intact », demande d'Endurance (+0) à chaque début de Round pendant BE Rounds ; les DR s'additionnent d'un Round à l'autre (Test étendu, D15) ; total de 6 DR atteint : retour à 1 Blessure ; le total cumulé s'affiche et ↶ le rétablit ; sans la case, ou après BE Rounds : aucune demande.

**S3. Défense et riposte.**
- CA10. Le plan de défense d'un défenseur Bestial ne propose que l'Esquive.
- CA11. Champion gagnant l'Opposition de mêlée défensive : dégâts de riposte calculés ; deux ripostes dans le même Round possibles ; Opposition perdue : aucun dégât.
- CA12. Bouclier n : la protection de la zone touchée gagne n PA et l'opposition +1 DR ; un profil L22 « * » n'a que le rappel.

**S4. Psychologie par boutons et Élan.**
- CA13. « Rencontre » pour Effrayé pose la Peur (2) venant de la cible choisie ; une cible sans le mot-clé nommé est refusée avec un message en français ; Animosité demande le Test de Calme et refuse de même.
- CA14. « Entrer en Frénésie » pour un porteur du Trait Frénésie demande le Test de Volonté et, réussi, pose l'état comme le Talent (+1 dégât déjà lu).
- CA15. Un porteur de Rage qui gagne l'Élan reçoit l'état Frénésie et perd l'Élan ; ↶ rétablit les deux.
- CA16. Vampirique : le bouton soigne le porteur de la valeur saisie sur Morsure et proie admissible cochées, sans dépasser ses Blessures maximales ; sinon refus.

**S5. Magie.**
- CA17. Béni ou Miracles : la base de Prière d'un porteur sans compétence Prière vaut Soc + 10 ; avec la compétence, la valeur de la fiche.

**S6. Petits ajouts.**
- CA18. Insensible à la douleur : un critique reçu pose ses États comme avant ; les pénalités non dues à une amputation sont ignorées ; celles d'une amputation sont conservées ; la pénalité d'un État issu du critique reste appliquée.
- CA19. Bond : `speedCells` et la poursuite sont inchangées ; la pastille de la fiche et la portée de Bond envoyée à la carte (D16) donnent le double pour Charge, Saut et Sprint seulement ; une carte qui ne connaît pas le champ l'ignore.
- CA20. Monture Craintif surprise : cause « bruit fort » et Dressé (Guerre) : aucun Test de Chevaucher ; cause « magie » et Dressé (Magie) : idem ; autre combinaison : Test comme aujourd'hui.
- CA21. « Se cabrer » : action de déplacement qui applique les dégâts du Piétinement, ne consomme pas l'Élan, refusée contre une cible non plus petite.
- CA22. Inflammable : la perte de Blessures d'Enflammé est doublée à chaque fin de Round, et le Test pour éviter l'état prend −2 DR.

**S7. Nettoyage et non-régression.**
- CA23. Disruption et Creature Weapons sont `status: 'reminder'` avec `motif` ; leur rappel s'affiche sur la fiche.
- CA24. Un participant sans aucun de ces Traits produit les mêmes résultats qu'avant (tests unitaires existants, golden master du Store inchangé).
- CA25. Chaque effet d'office s'annule en un seul ↶ et se rejoue par ↷.
- CA26. Parcours navigateur : une rencontre avec un Instable, un Stupide et un porteur de Sang corrosif traverse un Round entier avec les demandes attendues (parcours, `timeout 120`).

## Questions pour le MJ

Tranchées le 17/11/2026 : voir D13 à D17. D6 est remplacée par D13.

1. **Sang corrosif : réduit par BE et PA ?** LB-FR dit oui (minimum 1) ; LB-V5 écrit « Damage » sans préciser, et le plan actuel n'applique aucune réduction. *Recommandation : réduire par BE et PA, minimum 1* (le mot « Damage » du livre V5 se réduit par BE et PA partout ailleurs).
2. **Increvable : 6 DR cumulés ou 6 DR par Round ?** LB-FR p. 339 dit qu'un Test « nécessitant un DR de 6 » se retente chaque Round. *Recommandation : Test étendu, les DR s'additionnent d'un Round à l'autre jusqu'à 6, avant la fin des BE Rounds* (c'est le sens d'un Test étendu en V5).
3. **Bond sur la carte.** La carte ne connaît ni Charge, ni Saut, ni Sprint : seulement Marche et Course. Ajouter un champ optionnel (« portée de Bond ») au `token.state` demande que la carte ignore les champs inconnus. *Recommandation : une pastille sur la fiche du porteur (« Bond : Charge, Saut, Sprint à 2 × Course ») sans toucher à la carte ; le champ de carte seulement si le MJ le demande.*
4. **Inflammable et le retrait de l'état.** Le livre vise les Tests pour éviter de gagner Enflammé. *Recommandation : −2 DR sur ces seuls Tests, pas sur le retrait par Athlétisme.*

## Points techniques utiles au plan

- Tout nouveau module de `js/` va au précache de `sw.js` ; `node --test tests/unit/donnees/audit-meta-production.test.js` doit rester vert.
- Tout nouveau parcours navigateur (CA26) s'ajoute à `tests/parcours.json` et se lance sous `timeout 120`.
- Nouvelles méthodes du Store pour les boutons (Rencontre, Entrer en Frénésie, Se cabrer, Vampirique) : si l'API du Store change, le golden master `tests/fixtures/store-golden.json` doit être régénéré et relu ; la 3.51.0 s'est interdit de le toucher, ce chantier ne le peut peut-être pas.
- Dans `js/ui/workspace-view.js` (et `js/ui/card.js`), les nouveaux boutons appellent `Store.methode?.()` de façon tolérante, comme la 3.51.0.
- Nouveaux crochets : le résultat de résolution reçoit un nouveau champ (`traitPlans`) : son schéma est lu par le panneau (`js/ui/resolution-panel.js`) et par `fiche-writeback`/journal ; vérifier que `sanitize.js` ne l'élimine pas.
- `js/data/creature-abilities.js` est générée ou figée ? Contrôler avant de l'éditer à la main (E0-T-147 et E0-T-288).
- Dès qu'une fonction de plan change de signature (Élan booléen, `cause`, `via: 'rear'`), garder les tests existants de `creature-states`, `creature-psychology`, `v5-mounted-combat`, `creature-combat` verts.
- Version et notes de version : `node tools/bump-version.mjs X.Y.Z` seulement à la publication, après le feu vert du MJ.

## Hors périmètre

- **Rares, à règle propre (D3)** : Capricieux, Salive anticoagulante, Scission, Attache et se nourrit, Facilement confus, Hallucinogène, Proie du Prince des Ténèbres.
- **Terrain (D4)** : Limicole, Foulée adaptée, Grimpant, Fouissage, Aquatique hors de l'eau.
- **Narratifs ou tirés par le MJ** : Salive analgésique, Télépathie animale, Accordé à la magie, Œil maléfique, Corruption, Sorcière de cercle, Maladie, Moule informe, Engloutissement, Corruption mentale, Messager, Mutation, Marques du Chaos et de Khorne, Forme de guerre naïade, Renaissance du phénix, Préjugé, Lanceur aléatoire, Métamorphe, Siphon de sort, Télépathie, Territorial, Feu de Tzeentch, Sans peur, Trait de compagnon.
- **Sans règle d'exposition ni de terrain dans le moteur** : Aura glaciale, Vulnérable au froid, Sillage de feu, Rampant, Attaquant immobile. (Disruption passe en rappel déclaré, section 2C.)
- **Têtu (Stubborn)** : jets de conduite opposés à définir, rappel.
- **Dressé (Choc)** : traversée d'un groupe en charge, géométrie absente, rappel.
- **Nouveaux états du moteur** (Plaie purulente, Disparition) et le Brisé par le feu de Bestial.
- Cocher ou décocher un Trait sur un participant en cours de rencontre (comme en 3.51.0).
