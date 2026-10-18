# Inventaire des suppléments : miracles et bénédictions

Les sept PDF existent dans `E:/Projet Warhammer Ennemi Intérieur/tmp/catalogue-bibliotheque/pdfs/`. Tous ont un texte extractible (pdftotext). Pour chacun, la page imprimée est égale à la page physique. Le détail ligne par ligne est dans `inventaire_supplements.json`.

| Livre | Fichier | Pages | Miracles |
|---|---|---|---|
| Archives of the Empire 1 | Archives of the Empire Volume 1.pdf | 96 | 0 |
| Archives of the Empire 2 | Archives of the Empire 2.pdf | 95 | 0 |
| Archives of the Empire 3 | Archives of the Empire 3.pdf | 95 | 18 |
| Deft Steps Light Fingers | Deft Steps Light Fingers.pdf | 144 | 32 (24 de Ranald, 8 de Taal) |
| Up in Arms | Up in arms.pdf | 143 | 9 |
| Power Behind the Throne Companion | WFRP_Power_Behind_the_Throne_Companion.pdf | 128 | 7 |
| Lustria | Lustria EN.pdf | 224 | 2 |

Le PDF « Power Behind the Throne Companion » est absent du manifeste. Il fait 128 pages, et sa somme SHA-256 commence par `df27ea115b6368e5`.

## Comptes par culte

| Culte | Aspect | Miracles | Page |
|---|---|---|---|
| Handrich | | 6 | AotE3 p.47 |
| Solkan | | 6 | AotE3 p.55 |
| Rhya | | 6 | AotE3 p.74 |
| Ranald | Rôdeur de Nuit (Night Prowler) | 7 | Deft p.18 |
| Ranald | Joueur (Gamester) | 6 | Deft p.19 |
| Ranald | Trompeur (Deceiver) | 5 | Deft p.24 |
| Ranald | Protecteur (Protector) | 6 | Deft p.25 |
| Taal | Ranger-Priest | 8 | Deft p.88 |
| Myrmidia | | 9 | UiA p.79 |
| Ulric | | 7 | PBtT p.50 |
| Mathlann | | 2 | Lustria p.81 |

Les comptes de miracles portent sur des noms uniques. L'aspect « Dealer » de Ranald (Deft p.24) n'a ni carrière ni miracle propre.

## Noms de miracles

Les durées, portées et cibles de chaque miracle sont dans le JSON.

- **Handrich (6)** : A Deal's a Deal, Carry My Burdens, Shake On It, Supply and Demand, Trickle Down, Twist of Fortune.
  - Règle spéciale : +1 Sin si l'invocation ne rapporte aucun profit.
  - Bénédictions : Charisma, Fortune, Hardiness, Protection, Wisdom, Wit.
- **Solkan (6)** : Absolute Purity, Fist of Vengeance, Flaming Blade, Fury of the Righteous Sun, Light of Stasis, Still the Winds.
  - Règle spéciale : aucun Sin ni Corruption n'est toléré pour bénédiction ou miracle.
  - Bénédictions : Battle, Conscience, Courage, Hardiness, Might, Tenacity.
- **Rhya (6)** : Rhya's Abundance, Rhya's Demand, Rhya's Dominion, Rhya's Flock, Rhya's Rage, Rhya's Taming.
  - Rhya's Rage ne s'utilise que pour défendre des enfants ou un foyer.
  - Les « aspects » de Rhya (Bringers of Bounty, Daughters of Rhya, Corn Mothers) sont des tendances informelles, sans règle (p.67).
  - Les esprits de la terre (Polevik, Frau Roggen, Herdlord) servent d'exemples pour Rhya's Dominion (p.73).
- **Ranald, Rôdeur de Nuit (7)** : Distant Sounds, Long Reach, Lose the Loot, Silence Reigns, Poor Man's Face, Talk Your Way Out, The Heat Is Off.
- **Ranald, Joueur (6)** : Bountiful Fortune, Crisis of Confidence, Force the Hand of Chance, Perfect Empathy, The Gamemaster, Up the Stakes.
- **Ranald, Trompeur (5)** : A Suitable Sucker, Bamboozle, One Almighty Lie, Ranald's Mischief, Unremembered Face.
- **Ranald, Protecteur (6)** : Back at You, Class War, Free Your Mind, Moment of Clarity, Rally Round, Under My Protection.
- **Taal (8)** : Auroch's Heart, Earthshudder, Nature's Repast, Pax of Taal, Rending Paw, River's Blessing, Wild Wind, Wilderness Way.
- **Myrmidia (9)** : Command the Legion, Dismay Foe, In Good Order, Know Your Enemy, On Deadly Ground, Quick Strike, Shieldmaiden's Devotion, Skill of Combat, Vengeful Wrath.
- **Ulric (7)** : Wolf's Bite, Howl of Battle, Crush the Weak, Frostbite, Heart of the Wolf, Hoarfrost Thews, Ice Storm.
- **Mathlann (2)** : Waterlungs, Cloak of Mathlann.

## Points d'attention

- **Ranald, bénédictions** (Deft p.13) : Charisma, Conscience, Finesse, Fortune, Protection, Wit.
- **Ranald, règles de culte** :
  - Le Priest générique peut acheter Bamboozle, Perfect Empathy, Talk Your Way Out et Unremembered Face (p.13).
  - Chaque aspect réutilise des miracles du livre de base (An Invitation, Cat's Eyes, Ranald's Grace, Stay Lucky, You Ain't Seen Me Right, Rich Man Poor Man Beggar Man Thief).
  - La règle « Ranald's Gamble » est à la p.15.
- **« A Suitable Sucker » (Trompeur)** : la section Dealer (p.24) l'appelle « A Suitable Stooge ». Il s'agit du même miracle, avec deux noms dans le livre.
- **« On Deadly Ground » (UiA p.79)** : le texte imprimé est brouillé. La ligne Duration contient « Allies within AoE (Willpower yards) ». La description (pas de Broken pour les alliés) est en tête de la 2e colonne. J'ai vérifié sur l'image de la page : il n'y a pas de dixième miracle.
- **Ulric** : ces sept miracles sont « optionnels, à la discrétion du MJ » (PBtT p.50). Les carrières d'Ulric renvoient au livre de base (aucune carrière de prêtre nouvelle).
- **Mathlann** : les deux miracles sont réservés aux prêtres elfes de Mathlann.
  - Waterlungs : portée Fellowship yards, cible 1, durée Fellowship Bonus heures.
  - Cloak of Mathlann : cible un navire, durée Fellowship minutes.
  - Shroud of Fog (p.81) est un sort de la Lore of Shadows, pas un miracle.
- **Old Faith** (AotE3 p.58) : Bless (Old Faith) donne six bénédictions au choix. Invoke (Old Faith) n'apprend aucun miracle : il donne une bénédiction supplémentaire, achetable au prix XP des miracles. Les dieux perdus (Goederan, Medhe, Naiedhe, Cailledh, Dieu de la Mort) sont du lore sans règle (p.56).

## Nouvelles règles de culte (sans détail)

- **Carrières de prêtre** :
  - AotE3 : Priest of Handrich p.46, Priest of Solkan p.54, Priestess of Rhya p.72.
  - Deft : Thief-Priest p.14, Gambler-Priest p.16, Trickster-Priest p.20, Liberator-Priest p.22, Ranger-Priest (Taal) p.86.
  - UiA : Priest of Myrmidia p.78.
  - AotE2 : Ogre Butcher p.37, culte du Great Maw, hors dieux humains.
- **Temples et ordres** :
  - Holy Temple (AotE3 p.17-18) : bénédiction à la 2e expansion, miracle à la 3e, +20 Pray sur place.
  - Talents de temple par dieu (AotE3 p.18).
  - Talents d'ordres de chevalerie (AotE3 p.20).
- **Monuments de colonie** (Lustria p.212) : Blessing au choix, Pray devient Basic Skill, +20 Pray si la Blessing est déjà connue, plus l'Endeavour « Attuning With the Ancients » (p.216).
- **Sanctuaires et monuments existants** (Lustria p.210) :
  - Godspile / Skeggi : Might.
  - Geomantic Nexus / Citadel of Dusk : Protection.
  - Shrine to Manann / Port Reaver : Tenacity.
  - Shrine to Ranald / Swamp Town : Fortune.
  - Aucun sanctuaire de Mathlann n'existe : Mathlann n'apparaît que p.80, 81 et 91.
- **Autres** :
  - Omens and Portents d'Ulric (PBtT p.49), règle narrative.
  - Rhya : Spirits of the Land, p.73.
  - Khaine (AotE3 p.50-51) : strictures et pénitences, aucun miracle.
  - Remarque sur les points de Sin de Taal (PBtT p.28).

## Écarts avec la liste du MJ

- **Noms attendus non retrouvés** :
  - Ulric : « Engourdissement » n'existe pas sous ce nom. Frostbite correspond le mieux (p.50, l'adversaire ne peut pas agir au tour suivant). Ni Morsure du Loup, ni Hurlement de Bataille, ni Écraser les Faibles, ni Cœur du Loup ne manquent : ce sont Wolf's Bite, Howl of Battle, Crush the Weak et Heart of the Wolf.
  - Rhya « étendu » : seuls les six miracles de la p.74 existent. Il n'y a ni nouvelle bénédiction ni aspect avec règles.
  - Old Faith : aucun miracle ni sanctuaire à règles. Il n'y a que la règle Bless/Invoke et le lore.
  - Mathlann : aucun sanctuaire ni monument de Mathlann dans Lustria.
- **Trouvés mais non attendus** :
  - Les 8 miracles de Taal (Deft p.88).
  - Ulric : Frostbite, Hoarfrost Thews, Ice Storm (en plus des quatre noms de la liste du MJ).
  - Les Monuments de colonie de Lustria (règle Blessing).
  - Les règles du Holy Temple (AotE3).
  - Les talents par dieu dans le temple (AotE3 p.18).
- **Conformes** : Handrich (6), Solkan (6) et Myrmidia (9) correspondent aux comptes annoncés. Ranald a bien 4 aspects, 24 miracles au total.

## Pages sans texte extractible

Aucune page candidate (sommaire, miracles, bénédictions) n'est vide. Les pages à très peu de texte sont des couvertures, des pages illustrées ou des cartes. Je ne les ai pas lues une à une.

| Livre | Pages quasi vides |
|---|---|
| AotE1 | 1, 43, 86, 96 |
| AotE2 | 1, 91, 93, 94 |
| AotE3 | 1, 33 |
| Deft | 1 |
| UiA | 4 |
| PBtT | 1, 126, 127, 128 |
| Lustria | 1, 5, 6, 13, 106, 116, 117, 164, 224 |

La seule vérification visuelle effectuée est la p.79 d'UiA.

## Méthode

- Extraction avec `pdftotext -layout`.
- Comptage par page des mots « miracle », « blessing », « pray », « sin », « sanctuar » et des noms de dieux.
- Lecture intégrale des pages candidates : sommaires, pages de miracles, carrières, règles de culte.
- Recherche texte sur tous les mots-clés, y compris dans AotE1 et AotE2, qui n'ont aucun miracle.
