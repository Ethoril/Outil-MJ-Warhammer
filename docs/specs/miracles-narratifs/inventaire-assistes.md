# Inventaire · 88 clauses `manual` des 60 miracles assistés

Suite du §1-§2 de `spec.md` (décision Q1 du 16/11/2026). Lecture du code seulement : aucun contrat ni test n'est modifié. Rédigé le 17/11/2026 sur `main` (`6b4700f`, générateur `divine-contracts-0.4.0`).

## 0. Méthode et comptes

**Source.** `js/data/v5-divine-contracts.json` (207 contrats), contrats de `type: 'miracle'` et `status: 'assisted'`, clauses `clauses[].mode === 'manual'`. Les fichiers déclarants sont ceux de `docs/divin/sources/miracles/` (le contrat est généré par `tools/build-v5-divine-contracts.mjs`). Les types d'effet sont ceux de `js/core/v5-divine-grammar.js` (`effectTypes`) ; leurs gestionnaires sont dans `js/core/v5-divine-effects-*.js`.

**Recomptage (script en lecture seule sur le JSON) : mes comptes sont ceux du spec.**

| Mesure | Compte |
|---|---:|
| Contrats `assisted` (tous des miracles) | 60 |
| …dont avec au moins une clause `manual` | 50 |
| …dont sans aucune clause `manual` | 10 |
| Clauses `manual` dans ces 60 contrats | **88** |

Les 10 miracles sans clause `manual` : Appel à la fureur, Inspirant, Lance de Myrmidia (LdB V5 p.224), Flambeau de Vertu, N'écoutez point la Sorcière, Feu de l'âme (Sigmar), Cœur d'aurochs, Patte déchirante, Tanglefoot (Taal), Ice Storm (Ulric, PBtT). Ils n'apparaissent pas plus bas.

Pour mémoire, sur les 207 contrats, 181 clauses `manual` sont portées par les contrats `manual` (les 69 prières du spec, plus des clauses de contrats sans `effect`) et 5 par des contrats `implemented` : hors de ce document.

**Lecture des colonnes.** Pour chaque miracle : en-tête (culte, livre et page du contrat, fichier), puis « Déjà appliqué » (ce que le contrat fait par ses clauses `engine`/`assisted`, donc par le moteur), puis une ligne par clause `manual` : identifiant, ce que la clause demande au MJ ou à l'outil (reformulé, jamais recopié), famille. Les valeurs chiffrées citées viennent du contrat ; toutes restent à relire dans le livre avant codage (Q10).

**Abréviations.** LdB = Livre de base V5 ; Archives 3 = Archives of the Empire 3 ; Deft = Deft Steps, Light Fingers ; UiA = Up in Arms ; PBtT = Power Behind the Throne Companion. Les ids de contrat sont `divine:miracle:<id>` ; l'id court est donné entre parenthèses quand il aide.

## 1. Familles utilisées

F1 à F7 sont celles du §2 du spec ; une seule famille nouvelle (F8) est ajoutée.

| Fam. | Sens pour une clause d'un miracle assisté |
|---|---|
| F1 | Modificateur, relance, immunité, drapeau : un type d'effet existant le porte, éventuellement avec un champ ajouté ou une vérification activée |
| F2 | Test imposé à une cible (ou à un allié), le MJ saisit le jet (Q4), l'issue est appliquée par des effets déjà existants ; peut être récurrent (chaque Round, chaque Mouvement, chaque Tour) |
| F3 | Compteur, transfert ou effet récurrent propre au miracle |
| F4 | Soins, purges, maladies, poisons, Corruption, Péché |
| F5 | Zone, temps ou magie suspendus, exclusion de types d'action dans une zone |
| F6 | Effet de monde, d'information, de jugement du MJ ou de fin manuelle : rappel enrichi, sans calcul (Q2) |
| F7 | Bénédiction Conscience : aucune clause ici |
| **F8 (nouvelle)** | **Clause déjà couverte** par un paramètre du contrat (`params`, durée), une règle de cible (`targetRules`), un garde du moteur ou une saisie MJ existante. Le statut `manual` n'est plus justifié : à requalifier (mode `engine` ou clause supprimée), sans nouvelle brique. Justification : le §2 ne prévoyait que des prières sans effet appliqué ; ici, plusieurs clauses sont des doublons du contrat ou de gardes que le moteur tient déjà (ex. Solkan, `js/core/v5-divine-access.js:69-77`). |

Aucune famille n'est faite pour les clauses sous Q5 (maladies, poisons) : elles vont en F4 et restent en rappel, comme décidé.

## 2. Clauses par miracle

### Myrmidia

#### 4. Œil de l'aigle (Eagle's Eye) — LdB V5 p.224 — `docs/divin/sources/L06-prayers.mjs` (déclaration à confirmer au plan ; trouvé aussi dans `tools/build-v5-divine-contracts.mjs`)
Déjà appliqué : création de l'aigle comme capteur (`summon-creature/sensor`), sans participant au combat, avec Perception, Sens aiguisé, Vol, Intangible et Invulnérable en Traits ; disparition à l'échéance, à la fin de la prière ou à la mort du prêtre.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `eagle-control` | Le MJ suit les ordres de déplacement donnés à l'aigle par le prêtre | F6 |
| `eagle-sight` | Rappel : le prêtre voit par l'aigle, perd ses propres sens et reste vulnérable | F6 |
| `eagle-intangible` | L'aigle ne peut rien affecter physiquement | F8 (Trait « Intangible » déjà posé par `summon-eagle`) |

#### 5. Commander la Légion (Command the Legion) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : +1 DR aux Tests de Commandement du prêtre ; durée 1 Round (+1 par +2 DR).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `relevant-order` | Le MJ écarte les Tests de Commandement sans rapport avec un combat ou une stratégie en cours | F6 |
| `line-of-sight` | L'allié qui reçoit l'ordre doit voir le prêtre | F8 (règle de cible `seesPriest` existante dans `targetRuleFactFields`) |

#### 6. Effrayer l'ennemi (Dismay Foe) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : le prêtre gagne le Trait Terreur (1), simple étiquette ; durée 1 Round (+1 par +2 DR).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `terror-test` | Chaque ennemi qui voit le prêtre au lancement fait une fois le Test de Calme de la Terreur ; échec : États Brisé selon l'indice et les DR négatifs, plus la Peur | F2 (multi-cibles, issue = Brisé + Peur) |

#### 7. En bon ordre (In Good Order) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : drapeau `orderlyDisengage` posé sur les alliés désignés (le moteur de combat ne le lit pas encore).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `flee-exemption` | Quand un allié fuit, les adversaires Engagés ne gagnent ni Élan ni attaque gratuite | F1 (le drapeau existe ; le brancher dans le Désengagement touche un moteur partagé, voir Q17) |
| `broken-from-fleeing` | Le fuyard gagne quand même son État Brisé par ennemi Engagé ; seul le Désengagement est allégé | F6 |
| `area` | Zone centrée sur le prêtre, rayon = Bonus de Volonté en mètres | F8 (paramètre de portée/zone du contrat) |
| `duration` | Durée = Bonus de Volonté en Rounds | F8 (`params.duration`, déjà `characteristic-bonus` FM) |

#### 8. Sur un terrain mortel (On Deadly Ground) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : immunité à l'acquisition de l'État Brisé pour les alliés de la zone ; les Brisé déjà acquis restent.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `duration-unattested` | La durée (Bonus de Volonté en Rounds) n'est pas attestée par la page 79 du livre ; le contrat la suppose | F8 (valeur déjà portée par `params.duration`) ; la valeur est un choix de règle : **Q13** |

#### 9. Attaque rapide (Quick Strike) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : effet `free-attack` (Test d'Initiative +0 DR au début de chaque Round, une tentative par Round, attaque saisie dans le panneau d'attaque) ; durée 3 Rounds (+3 par +2 DR).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `free-attack` | Sur réussite : une attaque de Mêlée opposée, arme de la main principale, sans Action ni Mouvement ; l'Élan joue normalement | F8 (c'est la description du `free-attack` que le gestionnaire de `v5-divine-effects-gear.js:70` porte déjà ; à confirmer en lisant `v5-store-action.js`) |

#### 10. Dévotion de la Guerrière (Shieldmaiden's Devotion) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : Talent Sans peur [ennemi saisi au lancement] pour chaque Myrmidien désigné ; durée 4 Rounds, portée 36 m (par tranche de +2 DR, ×2 de la valeur initiale).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `myrmidians` | Cible « voir le texte » : tous les Myrmidiens à 36 m ou moins, sans plafond ; le MJ désigne | F8 (règles de cible `within-range` et `non-Myrmidian` existantes ; désignation MJ déjà la voie normale) |
| `fear-only` | Le Talent protège de la Peur du groupe visé, pas de sa Terreur ni de l'Intimidation | F6 |

#### 11. Compétence martiale (Skill of Combat) — UiA p.79 — `myrmidia-up-in-arms.mjs`
Déjà appliqué : +10 en Capacité de Combat et en Capacité de Tir pour chaque allié désigné ; durée 4 Rounds.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `allies` | Cible « voir le texte » : tous les alliés à 24 m ou moins, sans plafond ; le MJ désigne | F8 (règles `ally` et `within-range`) |

### Handrich

#### 12. Ruissellement (Trickle Down) — Archives 3 p.47 — `handrich.mjs`
Déjà appliqué : +1 DR aux Tests de Charme du prêtre par DR du Test de Prière ; extensions par +2 DR.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `charm-condition` | Le bonus ne vaut que pour un Test de Charme réussi devant des personnes de Statut inférieur ; le MJ écarte les autres | F6 |
| `beneficiary` | Le texte ne dit pas clairement qui reçoit le bonus ; le contrat lit « le prêtre seul » | F6 ; lecture à confirmer : **Q12** |
| `after-test` | Le miracle peut être invoqué après un Test réussi pour en améliorer le résultat | F6 (rappel de séquence : la Prière se lance après le Test de Charme) |
| `profit-sin` | +1 Péché si l'invocation ne rapporte aucun profit au prêtre (jugement du MJ) | F6 (Q9 : rappel du Péché, attribué à la main) |

### Manann

#### 13. Visage de l'homme noyé (Drowned Man's Face) — LdB V5 p.222 — `manann.mjs`
Déjà appliqué : État Fatigué pendant la durée, puis Étourdi 1 Round à la fin ; extensions par +2 DR.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `drowning` | La cible se noie pendant la durée (règles de noyade, p.169), démons et morts-vivants compris | F6 (aucune règle de noyade dans `js/` : pas de moteur à brancher) |

#### 14. Mer déchaînée (Sea Legs) — LdB V5 p.223 — `manann.mjs`
Déjà appliqué : États Aveuglé, Assourdi, Fatigué ; État À terre sur échec (le test n'est pas encore demandé par l'outil).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `athletics` | Pour utiliser son Mouvement, la cible tente un Test d'Athlétisme Accessible (+2 DR) | F2 (récurrent, à chaque Mouvement ; issue À terre déjà décrite par le contrat) |

### Morr

#### 15. Masque mortuaire (Death Mask) — LdB V5 p.223 — `morr.mjs`
Déjà appliqué : le prêtre gagne la Peur (2) pendant la durée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `undead-not-immune` | Les morts-vivants ne sont pas immunisés contre cette Peur | F6 |

#### 16. Main de Morr (Stay Morr's Hand) — LdB V5 p.223 — `morr.mjs`
Déjà appliqué : État Inconscient pendant la durée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `no-deterioration` | La cible ne se détériore pas : maladie et poisons suspendus, Blessures Critiques ignorées | F6 (Q5 : maladies et poisons sans registre, donc rappel) |
| `end-healing` | Le miracle cesse si des soins appropriés sont prodigués | F6 |
| `end-last-rites` | Le prêtre peut y mettre fin par les derniers rites (environ 1 minute) : âme au portail, cadavre protégé | F6 |

### Ranald

#### 17. La pression retombe (The Heat Is Off) — Deft p.18 — `ranald-nuit.mjs`
Déjà appliqué : −3 DR aux Tests de Sociabilité du prêtre pendant la durée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `disinterest` | Les gens se désintéressent du prêtre, se souviennent mal de lui ; les autorités détournent les yeux | F6 |
| `watch-minus-3` | Le score de présence du guet baisse de 3 | F6 |
| `ends-on-crime` | Une nouvelle tentative de crime met fin au miracle | F6 (fin manuelle) |

#### 18. Moment de clarté (Moment of Clarity) — Deft p.25 — `ranald-protecteur.mjs`
Déjà appliqué : Trait Immunité à la Psychologie pendant la durée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `running-effects` | Le MJ décide si un effet de Psychologie déjà actif (Peur, Terreur, Animosité…) cesse au lancement | F6 |

#### 19. Tous ensemble (Rally Round) — Deft p.25 — `ranald-protecteur.mjs`
Déjà appliqué : +2 DR aux Tests d'Endurance et de Calme des alliés, +1 DR par tranche de 10 personnes (taille saisie par le MJ).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `status-exclusion` | Les personnages de Statut Argent ou Or ne sont pas affectés | F6 |

#### 20. Malice de Ranald (Ranald's Mischief) — Deft p.24 — `ranald-trompeur.mjs`
Déjà appliqué : deux Caractéristiques du prêtre prennent celles de l'adversaire dans les Tests opposés contre lui (`characteristic-match`).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `table-roll` | Tirer sur une table 1d10 les deux Caractéristiques (doublons relancés) ; le MJ saisit le résultat | F8 (la saisie MJ des deux Caractéristiques est l'entrée existante du gestionnaire ; un bouton de tirage serait un confort, hors brique) |

#### 21. Yeux de chat (Cat's Eyes) — LdB V5 p.224 — `ranald.mjs`
Déjà appliqué : création du chat comme capteur ; disparition à l'échéance ou à la mort du prêtre.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `control-and-senses` | Le prêtre dirige le chat et perçoit tout ce que ce dernier perçoit, avec des sens de chat | F6 |
| `no-own-senses` | Rappel : plus de sens propres (Vision nocturne, etc.) pendant la durée, donc vulnérable | F6 |

#### 22. Que la chance persiste (Cheat the Odds) — LdB V5 p.224 — `ranald.mjs`
Déjà appliqué : +1 point de Chance temporaire (+1 par +2 DR), interdiction de réinvoquer avant 0 point.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `session-end` | Les points durent jusqu'à la fin de la session ; le MJ termine la prière à ce moment, sans échéance automatique | F6 (durée de session, fin manuelle) |

#### 23. Grâce de Ranald (Ranald's Grace) — LdB V5 p.225 — `ranald.mjs`
Déjà appliqué : +10 Agilité, Talent Chute féline +1 niveau pendant la durée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `stealth` | +10 en Discrétion (compétence) en plus du +10 d'Agilité | F1 (modificateur de Test sur la compétence ; lecture du +10 : **Q14**) |

### Rhya

#### 24. Exigence de Rhya (Rhya's Demand) — Archives 3 p.74 — `rhya-archives3.mjs`
Déjà appliqué : État Fatigué et perte de Blessures fixe (1 + DR) pour chaque humanoïde touché, selon le sacrifice à Rhya.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `barren` | Si cinq individus ou plus sont touchés, rien ne pousse dans la zone pendant d10 ans | F6 |

#### 25. Rage de Rhya (Rhya's Rage) — Archives 3 p.74 — `rhya-archives3.mjs`
Déjà appliqué : Trait Impassible, immunité à la peur (`fearImmune`), +2 DR aux Tests de Mêlée (Corps à corps) et d'Endurance (Résistance).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `force-test` | +2 DR aux Tests de Force du prêtre ; le moteur ne porte aujourd'hui que des modificateurs de compétence | F1 (test de caractéristique : à vérifier dans `v5-divine-effects-tests.js` si `test-modifier` peut viser une caractéristique) |
| `defend-only` | Invocable seulement pour défendre des enfants, un foyer ou une ferme occupés | F6 |

#### 26. Secours de Rhya (Rhya's Succour) — LdB V5 p.225 — `rhya.mjs`
Déjà appliqué : retrait d'un État par cible ; +1 DR à tous ses Tests au prochain Tour si tous ses États sont retirés.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `rested` | Si tous les États sont retirés, la cible est reposée comme après un bon sommeil | F6 |

#### 27. Caresse de Rhya (Rhya's Touch) — LdB V5 p.225 — `rhya.mjs`
Déjà appliqué : soin de Bonus de Sociabilité Blessures, extensions de soin par +2 DR.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `cure-disease` | Option : guérir 1 maladie naturelle | F4 (Q5 : reste en rappel) |
| `slow` | Effets après au moins 10 minutes ; si interrompu, le miracle est à retenter | F6 (durée de préparation suivie) |

### Shallya

#### 28. Larmes de Shallya (Shallya's Tears) — LdB V5 p.226 — `shallya.mjs`
Déjà appliqué : guérison d'une Blessure Critique (+1 par +2 DR), retirée du registre.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `prayer-time` | Le prêtre prie (10 − Bonus de Sociabilité) Rounds avant l'effet | F6 (compte à rebours affiché) |
| `interruption` | Prière interrompue : aucun effet | F6 |
| `no-reattach` | Ne rattache pas les membres amputés | F6 |

### Sigmar

#### 31. Marteau ardent de Sigmar (Sigmar's Fiery Hammer) — LdB V5 p.227 — `sigmar.mjs`
Déjà appliqué : l'arme est Magique, +Bonus de Sociabilité Dégâts, État Enflammé sur toute cible frappée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `weapon-restriction` | Seul un marteau de guerre manié par le prêtre est concerné | F1 (le champ `weaponClass` existe sur `weapon-bonus` ; la vérification n'est pas faite) |

#### 33. Comète à deux queues (Twin-tailed Comet) — LdB V5 p.227 — `sigmar.mjs`
Déjà appliqué : 1d10 + DR Blessures directes dans la zone, Enflammé, retour de flamme sur le prêtre sans ennemi.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `targeting` | Zone visible, à portée, contenant des ennemis aux yeux de Sigmar | F6 |
| `outdoors-only` | La zone ciblée doit être en extérieur | F6 |

#### 34. Vaincre les impies (Vanquish the Unrighteous) — LdB V5 p.227 — `sigmar.mjs`
Déjà appliqué : Haine envers orques, gobelins, morts-vivants et alliés du Chaos pour les alliés de la zone.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `hatred-kill` | Après avoir tué un tel ennemi, la Haine donne +2 DR aux Tests de combat au lieu de +1 | F3 (état « a tué » par participant, propre à ce miracle) |
| `priest-counted` | Le texte ne dit pas si le prêtre compte parmi les alliés | F6 ; lecture à confirmer : **Q11** |

### Solkan (les quatre miracles portent les deux mêmes clauses de pureté)

Fichier : `docs/divin/sources/miracles/solkan.mjs`, Archives 3 p.55. Les deux clauses `no-sin-corruption` et `solkan-purity` disent la même chose (aucun miracle ni bénédiction pour un prêtre qui porte un Péché ou un Point de Corruption). **Le moteur le refuse déjà** : `js/core/v5-divine-access.js:74-77` bloque avec `SOLKAN_PURITY` si le Péché ou la Corruption (`actor.extensions.v5.corruptionPoints`) est supérieur à 0, et exige une valeur connue de Corruption. Les huit clauses sont donc F8 (Q6 : le suivi de Corruption existe).

| Miracle | Déjà appliqué | Clauses manuelles | Fam. |
|---|---|---|:-:|
| 35. Pureté absolue (Absolute Purity) | 1d10 Blessures sans BE ni PA aux créatures impures de la zone, rayon = BSoc | `no-sin-corruption`, `solkan-purity` | F8 ×2 |
| 36. Poing de vengeance (Fist of Vengeance) | 1d10 + BVol Dégâts, PA ignorés, BE retenu (minimum 1) | `no-sin-corruption`, `solkan-purity` | F8 ×2 |
| 37. Lame enflammée (Flaming Blade) | Arme Magique, +6 Dégâts, Enflammé sur toute créature frappée | `no-sin-corruption`, `solkan-purity` (F8 ×2) ; `sword-only` : seule une épée est concernée | F8 ×2 ; **F1** (`weaponClass`, même brique que `weapon-restriction`) |
| 38. Fureur du soleil vertueux (Fury of the Righteous Sun) | Aveuglé en nombre égal au BSoc, zone de rayon BSoc, centre à portée BSoc | `no-sin-corruption`, `solkan-purity` (F8 ×2) ; `missile` : la lumière agit comme un projectile magique de Dégâts +2 | F8 ×2 ; **F1** (effet de dégâts ordinaires existant, comme Ice Storm ; nature des Dégâts : **Q16**) |

### Taal

#### 40. Tremblement de terre (Earthshudder) — Deft p.88 — `taal-deft.mjs`
Déjà appliqué : Test d'Athlétisme Difficile (−10) de chaque cible de la zone, À terre sur échec.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `structure-damage` | Chaque structure artificielle de la zone subit 1d10 + DR de dégâts ; pas les éléments naturels | F6 (une structure n'est pas un participant) |

#### 42. Bénédiction de la rivière (River's Blessing) — Deft p.88 — `taal-deft.mjs`
Déjà appliqué : +4 DR à tous les Tests de Natation du prêtre.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `water-speed` | Dans l'eau, le prêtre se déplace à son Mouvement complet, non à la moitié | F6 |
| `salt-water` | Aucun effet en eau salée ; le MJ vérifie la nature de l'eau | F6 |

#### 43. Vent sauvage (Wild Wind) — Deft p.88 — `taal-deft.mjs`
Déjà appliqué : −2 DR aux Tests de Capacité de Combat et d'Agilité des cibles de la zone ; premier Round : Test d'Endurance Difficile (−10), À terre sur échec.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `priest-unaffected` | Le prêtre n'est pas affecté par le vent | F6 (le MJ ne le désigne pas comme cible) |
| `prone-each-round` | Chaque Round suivant, chaque cible refait le Test d'Endurance Difficile (−10), À terre sur échec | F2 (récurrent, même issue que le premier Round) |
| `no-ranged` | Aucune attaque à distance dans la zone, sauf armes à poudre ou d'artillerie, qui peuvent seules viser les cibles dans la zone | F5 (exclusion d'un type d'attaque dans une zone, comme Pax of Taal) |

#### 44. Instincts animaux (Animal Instincts) — LdB V5 p.227 — `taal.mjs`
Déjà appliqué : Sens aiguisé +1 pour le sens choisi (Talent temporaire) ; fin après BSoc heures.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `rest-awakening` | En repos, la cible se réveille si une menace approche à moins de Perception mètres | F6 |

#### 45. Roi des bêtes (King of the Wild) — LdB V5 p.227 — `taal.mjs`
Déjà appliqué : création de l'animal choisi (liste de six bêtes du bestiaire), camp du prêtre ; fin à l'échéance (BSoc minutes, horloge de campagne).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `animal-placement` | L'animal apparaît à portée (Sociabilité mètres) ; le MJ le place | F6 |
| `obedience` | L'animal agit selon les désirs du prêtre ; le MJ le joue | F6 |

#### 46. Cerf bondissant (Leaping Stag) — LdB V5 p.227 — `taal.mjs`
Déjà appliqué : Mouvement +1, Jambes solides +1 (temporaire).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `auto-leap` | Les Tests d'Athlétisme pour sauter réussissent automatiquement | F6 (réussite automatique : pas un modificateur) |

#### 48. Dent et griffe (Tooth and Claw) — LdB V5 p.228 — `taal.mjs`
Déjà appliqué : Trait Morsure (Bonus de Force + 3), attaques de mêlée Magiques.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `unarmed-damaging` | Les attaques à mains nues cessent d'être Inoffensives pendant la durée | F1 (drapeau de qualité sur l'attaque ; à brancher sur `weapon-bonus` ou sur les actions accordées) |

### Ulric

#### 49. Hurlement de bataille (Howl of Battle) — PBtT p.50 — `ulric-pbtt.mjs`
Déjà appliqué : Talent Charge berserk posé comme étiquette ; fin après BSoc Rounds. Ce Talent ne figure pas dans `injectableTalentIds` (`v5-divine-effects-gear.js:15`) : le moteur n'en lit aucun effet.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `stack-beyond-max` | Un prêtre qui a déjà le Talent le gagne en plus, au-delà du maximum | F6 |
| `talent-effect` | Le bonus de Dégâts du Talent à la charge n'est pas injecté ; le MJ l'applique | F6 |

#### 50. Gelure (Frostbite) — PBtT p.50 — `ulric-pbtt.mjs`
Déjà appliqué : 1d10 Blessures directes (sans BE ni PA), +2 avec Haine sacrée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `endurance-test` | Test d'Endurance Intermédiaire (+0) de la cible ; échec : aucune action au prochain Tour sauf défensive | F2 (issue à choisir : l'outil n'a pas d'État « actions défensives seulement » connu ; à vérifier, sinon rappel d'issue) |

#### 51. Cœur du loup (Heart of the Wolf) — PBtT p.50 — `ulric-pbtt.mjs`
Déjà appliqué : retrait des États Brisé des alliés de la zone ; immunité à la Peur ; fin après BSoc Rounds.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `terror-and-skills` | Immunité aussi à la Terreur et aux effets d'Intimidation ou d'Effrayant | F1 (nouveau drapeau dans `specialStateKeys`, voisin de `fearImmune` et `terrorAsFear`) |

#### 53. Froid de la gelée blanche (Hoarfrost's Chill) — LdB V5 p.228 — `ulric.mjs`
Déjà appliqué : le prêtre cause la Peur (2) ; fin après BSoc Rounds.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `momentum-loss` | Au début de chaque Round, toutes les créatures de la zone sauf le prêtre perdent leur Élan | F3 (effet récurrent sur l'Élan, compteur du moteur de combat : voir Q17) |

#### 54. Hurlement du loup (Howl of the Wolf) — LdB V5 p.228 — `ulric.mjs`
Déjà appliqué : création du loup blanc (camp du prêtre, profil du bestiaire) ; fin à l'échéance.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `wolf-placement` | Le loup apparaît à portée (Sociabilité mètres) ; le MJ le place | F6 |
| `wolf-combat` | Le loup combat les ennemis du prêtre ; le MJ le joue | F6 |

#### 55. Jugement du Roi des Neiges (The Snow King's Judgement) — LdB V5 p.228 — `ulric.mjs`
Déjà appliqué : 1d10 + DR Blessures directes ; État Sonné sur la cible jugée faible, lâche ou fourbe ; renvoi de l'effet sur le prêtre sinon ; +2 avec Haine sacrée.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `redirect-stunned` | Quand le prêtre subit l'effet à la place de la cible, il reçoit aussi l'État Sonné, à poser à la main | F3 (branche manquante du renvoi existant, propre à ce miracle) |

#### 56. Fureur d'Ulric (Ulric's Fury) — LdB V5 p.228 — `ulric.mjs`
Déjà appliqué : Frénésie accordée, +1d10 Dégâts explosifs au premier coup de mêlée de chaque Tour ; fin après BSoc Rounds (effet `frenzy-fury`).

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `free-frenzy` | Test de Frénésie gratuit à chaque Tour de l'allié pendant la durée (p.184) | F2 (récurrent, Test de l'allié saisi par le MJ) |

#### 57. Morsure de l'hiver (Winter's Bite) — LdB V5 p.228 — `ulric.mjs`
Déjà appliqué : hache Magique, +DR Dégâts, État Fatigué sur toute cible touchée ; fin après BSoc Rounds.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `remove-bleeding` | Toute cible touchée perd ses États Hémorragique | F1 (`hitConditions` de `weapon-bonus` pose déjà des États ; ajouter un mode « retire ») |
| `no-bleeding` | La hache ne peut causer aucun État Hémorragique | F6 |

### Verena

#### 58. Chaînes de vérité (Shackles of Truth) — LdB V5 p.229 — `verena.mjs`
Déjà appliqué : État Entangled impossible à retirer pendant la durée, si la cible a commis le crime et le nie.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `false-accusation-wrath` | Accusation fausse : jet immédiat sur la table de Courroux (p.218-219) | F6 (le jugement « fausse » est celui du MJ ; la table de Courroux existe déjà dans `wrathTable`, un lien peut figurer au rappel) |
| `end` | Fin des effets après BSoc Rounds | F8 (`params.duration` = BSoc Rounds, durée de l'effet `condition`) |

#### 59. Épée de justice (Sword of Justice) — LdB V5 p.229 — `verena.mjs`
Déjà appliqué : épée Magique ; Test d'Endurance Accessible (+2 DR) d'un adversaire criminel frappé, Inconscient sur échec.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `ignore-ap` | L'épée ignore les Points d'Armure | F1 (champ à ajouter à `weapon-bonus`) |
| `unconscious-duration` | L'État Inconscient dure au moins BSoc Rounds | F1 (durée minimale sur une condition déjà posée par le contrat) |
| `sin` | +1 Péché par crime commis sur un adversaire inconscient | F6 (rappel, attribué à la main comme Q9) ; **Q15** |
| `end` | Fin des effets après BSoc Rounds | F8 (`params.duration`) |

#### 60. Sagesse de la chouette (Wisdom of the Owl) — LdB V5 p.229 — `verena.mjs`
Déjà appliqué : Intelligence +20, Sens aiguisé (Vue), Menaçant et Vision nocturne temporaires ; fin après BSoc Rounds.

| Clause | Ce qu'elle demande | Fam. |
|---|---|:-:|
| `likely-outcome` | Le prêtre demande au MJ l'issue la plus probable d'une décision immédiate, d'après ce que le personnage sait | F6 |

## 3. Totaux par famille

| Fam. | Clauses | Miracles concernés | Statut |
|---|---:|---:|---|
| F1 | 11 | 10 | Branchables sur des types existants (certains avec champ ajouté ou vérification activée) |
| F2 | 5 | 5 | Brique « Test imposé à la cible » du lot L3, plus récurrence |
| F3 | 3 | 3 | Au cas par cas |
| F4 | 1 | 1 | Reste en rappel (Q5) |
| F5 | 1 | 1 | Exclusion d'attaque à distance en zone |
| F6 | 48 | 32 | Rappel enrichi (Q2) |
| F7 | 0 | 0 | — |
| F8 | 19 | 14 | Requalification de statut, sans brique |
| **Total** | **88** | 50 | 11 + 5 + 3 + 1 + 1 + 48 + 0 + 19 |

Le nombre de miracles par famille ne s'additionne pas (un miracle peut porter plusieurs familles).

**Détail F1 (11)** : `flee-exemption` (En bon ordre), `stealth` (Grâce de Ranald), `force-test` (Rage de Rhya), `weapon-restriction` (Marteau ardent), `sword-only` (Lame enflammée), `missile` (Fureur du soleil vertueux), `unarmed-damaging` (Dent et griffe), `terror-and-skills` (Cœur du loup), `remove-bleeding` (Morsure de l'hiver), `ignore-ap` et `unconscious-duration` (Épée de justice).
**Détail F2 (5)** : `terror-test` (Effrayer l'ennemi), `athletics` (Mer déchaînée), `prone-each-round` (Vent sauvage), `endurance-test` (Gelure), `free-frenzy` (Fureur d'Ulric).
**Détail F3 (3)** : `hatred-kill` (Vaincre les impies), `momentum-loss` (Froid de la gelée blanche), `redirect-stunned` (Jugement du Roi des Neiges).
**Détail F8 (19)** : `eagle-intangible`, `line-of-sight` (Commander), `area` et `duration` (En bon ordre), `duration-unattested` (Sur un terrain mortel, Q13), `free-attack` (Attaque rapide), `myrmidians`, `allies` (Compétence martiale), `table-roll` (Malice de Ranald), les huit clauses de pureté de Solkan, `end` (Chaînes de vérité), `end` (Épée de justice).

## 4. Rattachement aux lots du §5 du spec

Aucune clause n'invalide L0 à L9 ; elles s'y ajoutent. Les lots du spec gardent leur numéro ; les lots nouveaux commencent à L10.

| Lot | Contenu ajouté pour les assistés | Clauses | Dépend de |
|---|---|---:|---|
| L0 | Le garde-fou compte aussi les clauses `manual` des assistés (voir §5) | 0 | — |
| **L10 (nouveau)** | F8 : requalifier le statut des 19 clauses couvertes (mode `engine` ou suppression), avec test que le moteur applique bien chaque garde ou paramètre cité (Solkan : `v5-divine-access.js` ; durées ; règles de cible). À faire tôt : réduit le bruit avant les autres lots | 19 | L0 ; Q13 pour `duration-unattested` |
| L1 (élargi) | F1 sur un type existant, sans champ nouveau : `stealth`, `force-test` (si `test-modifier` vise une caractéristique) | 2 | L0 ; Q14 |
| L2 (élargi) | F1 drapeaux et champs de `weapon-bonus` ou de `special-state` : `weapon-restriction`, `sword-only`, `ignore-ap`, `unarmed-damaging`, `remove-bleeding`, `unconscious-duration`, `terror-and-skills`, `missile` | 8 | L0 ; Q16 pour `missile` |
| L3 (élargi) | F2 : les 6 prières du spec plus `terror-test`, `athletics`, `prone-each-round`, `endurance-test`, `free-frenzy`. La brique accepte la récurrence (par Round, par Mouvement, par Tour) | 5 | Q4 (décidé) |
| L4 (élargi) | F5 : ajoute `no-ranged` (Vent sauvage) à l'exclusion de types d'attaque de Pax of Taal | 1 | L0 |
| L6 (élargi) | F3 : `hatred-kill` (état « a tué » par participant) | 1 | L0 |
| L7 (élargi) | F3 : `redirect-stunned` (même renvoi que Martyr côté Dégâts, mais interne à ce miracle) | 1 | Q7 (décidé) |
| **L11 (nouveau)** | Moteurs de combat partagés : `flee-exemption` (Désengagement, drapeau `orderlyDisengage`) et `momentum-loss` (Élan au début de chaque Round) ; lot isolé, en dernier, avec tests de non-régression | 2 | Q17 |
| L8 | F4 : `cure-disease` reste en rappel (Q5) ; aucune charge | 0 | Q5 (décidé) |
| L9 (élargi) | F6 : rappel structuré (durée suivie, portée et cible affichées, libellé court) des 48 clauses des assistés, avec les 35 prières du spec | 48 | Q2 (décidé) ; Q11, Q12, Q15 pour trois clauses |

Ordre recommandé : L0, L10, L1, L2, L3, L4, L6, puis L5, L7, L11, L9. Chaque lot reste arrêtable seul.

## 5. Garde-fou CA2 : état de départ proposé

Remplacer la phrase de CA2 du spec par deux niveaux.

1. **Prières en rappel (inchangé)** : 69 contrats `manual` (60 miracles + 9 bénédictions) ; F1 11, F2 6, F3 7, F4 4, F5 6, F6 28, F7 7.
2. **Clauses des miracles assistés (nouveau)** : 60 contrats `assisted` (tous `type: 'miracle'`), dont 50 portent au moins une clause `manual` et 10 aucune ; **88 clauses `manual`** ; F1 11, F2 5, F3 3, F4 1, F5 1, F6 48, F7 0, F8 19.
3. Le test échoue si ce compte, ou la famille d'une clause (clé `<id du contrat>#<id de clause>`), change sans mise à jour de la table. La table famille → clause vit en donnée (L0), à côté de celle des contrats ; ce document en est la source de départ (88 lignes).
4. Après L10, la ligne F8 passe à 0 et les clauses requalifiées sortent du décompte `manual` (total 69) : le test doit être mis à jour dans le même lot.
5. CA9 s'applique : une clause qui dépend d'une question ouverte (Q11 à Q17, plus Q5, Q6, Q7) n'est pas modifiée tant que la question est ouverte. Sont concernées : `priest-counted` (Q11), `beneficiary` (Q12), `duration-unattested` (Q13), `stealth` (Q14), `sin` (Q15), `missile` (Q16), `flee-exemption` et `momentum-loss` (Q17).

## 6. Questions pour le MJ

Seulement les choix de règle. La numérotation continue celle du §6 du spec (Q1 à Q10 décidées ; Q8 est un choix technique).

- **Q11. Vaincre les impies : le prêtre compte-t-il parmi les alliés qui gagnent la Haine ?** Le contrat ne tranche pas (`priest-counted`). *Recommandation :* oui, puisque la zone est centrée sur lui et que le miracle sert à combattre ; à confirmer en relisant p.227 (Q10). Sans réponse, la clause reste un rappel.
- **Q12. Ruissellement : le bonus de Charme va-t-il au prêtre seul ?** Le texte est ambigu ; le contrat lit « le prêtre seul », les témoins étant les personnes visées. *Recommandation :* garder cette lecture et l'afficher dans le rappel.
- **Q13. Sur un terrain mortel : durée.** Le livre (p.79) n'atteste pas de durée ; le contrat suppose Bonus de Volonté en Rounds. *Recommandation :* garder Bonus de Volonté en Rounds (même valeur que En bon ordre, même livre), affichée comme « durée non attestée par le livre ».
- **Q14. Grâce de Ranald : un +10 sur une compétence se lit-il +1 DR ?** Précédent : Commander la Légion lit le +10 au Test comme +1 DR (décision du MJ). *Recommandation :* étendre la même lecture à Discrétion, en laissant le +10 d'Agilité en modificateur de caractéristique.
- **Q15. Épée de justice : le Péché de +1 par crime sur adversaire inconscient suit-il Q9 ?** *Recommandation :* oui, rappel du Péché au résultat, attribué à la main par le MJ (le score de Péché existe déjà dans `extensions.v5.divine.sin`, une attribution automatique reste possible plus tard).
- **Q16. Fureur du soleil vertueux : la lumière inflige-t-elle de vrais Dégâts (+2) ?** Le contrat n'applique que l'Aveuglement ; la clause décrit un projectile magique de Dégâts +2. *Recommandation :* appliquer des dégâts ordinaires (réduits par BE et PA, comme Ice Storm : Dégâts +5), sous réserve de relire p.55 ; sinon garder le rappel.
- **Q17. Peut-on toucher deux moteurs de combat partagés ?** Le Désengagement (En bon ordre) et l'Élan en début de Round (Froid de la gelée blanche). Q7 n'autorise que Martyr, Light of Stasis et Still the Winds. *Recommandation :* oui, en lot isolé tout à la fin (L11) avec tests de non-régression ; sinon ces deux clauses restent un rappel.

Pas de question pour : les huit clauses Solkan (déjà tenues par `v5-divine-access.js`), la requalification F8, le tirage de `table-roll` (confort technique), l'issue « actions défensives seulement » de Gelure (choix de représentation, tranché au plan).
