# Second chantier des Traits : tri de l'inventaire (17/11/2026)

Tri fait par Claude à partir de [../traits-optionnels/inventaire.md](../traits-optionnels/inventaire.md) (colonne « calculable ») et de l'entrée 3.51.0 de `docs/SUIVI_EVOLUTION.md`, sans relecture du code ni des livres. Le MJ a délégué le tri le 17/11 et tranché quatre doutes par sélecteurs le même jour (section 4). Sert d'entrée au cadrage : spec, puis plan et tâches.

## 1. Déjà réglé par la 3.51.0 (hors chantier)

Big, Brute, Clever, Cunning, Elite, Fast, Leader, Tough, Hardy, Dressé (Guerre) pour le bonus de CC, Dressé (Monture), Armour et Ranged (armures et attaques optionnelles cochées).

## 2. À calculer dans ce chantier

**A. Brancher un calcul qui existe déjà** (la fonction de plan existe, aucun appelant). Le gros du chantier, à faible risque.

| Trait | Fonction existante | Branchement retenu |
|---|---|---|
| Sang corrosif | `planStateOnWound('corrosive')` | d'office à la blessure, comme Venin |
| Infecté | `planStateOnWound('infected')` | d'office à la blessure, comme Venin |
| Parasité | `planStateOnWound('infestation')` | d'office à la blessure, comme Venin |
| Instable | `planUnstableEndOfRound` | d'office en fin de Round, comme Nuée |
| Increvable | `planDieHard` | d'office au moment prévu par la règle, ↶ possible |
| Stupide | `planPsychology` | d'office en début de Round (Q1) |
| Bestial | `planPsychology` | d'office : défense par Esquive, fuite sous la moitié des PV (Q1) |
| Affamé, Effrayé, Animosité, Frénésie, Rage | `planPsychology` | d'office si le déclencheur est connu du moteur, sinon bouton (Q1) ; Rage repose sur le gain d'Élan, déjà calculé pour Féroce |
| Vampirique | `planVampiricHeal` | bouton, la proie admissible restant au MJ |
| Béni, Miracles | `planCreatureMagic` (Prière à Soc. +10) | brancher sur le moteur de prières ; à coordonner avec le chantier des miracles narratifs |
| Champion | riposte de talent sur opposition gagnée (`resolution.js`) | même chemin que le talent |

**B. Petits ajouts sur une mécanique existante.**

| Trait | Ce qui existe | À faire |
|---|---|---|
| Insensible à la douleur | application des critiques | ignorer les pénalités des critiques, pas les amputations (Q2) ; le cadrage vérifie que les critiques distinguent les deux |
| Bond | Foulée et Vol lus par `map-link-state` | double Mouvement sur la carte |
| Dressé (Guerre), Dressé (Magie) | Craintif lu par `planMountedFall` | ignorer Craintif face aux bruits forts (Guerre) ou à la magie (Magie) ; demander la cause de la chute |
| Se cabrer (Rear) | Piétinement (`planNaturalAttack`, clé stomp) | action « Se cabrer » qui remplace le déplacement |
| Bouclier | option Bouclier de l'équipement | relier le Trait à cette option ; valeur à relire dans le livre |
| Inflammable | état Enflammé, types de dégâts d'Immunité | −20 au Test et Blessures doublées contre le feu ; règle à relire dans le livre |

**C. Nettoyage.** Disruption et Creature Weapons sont déclarés « couverts » dans `js/data/creature-abilities.js` sans code qui les lise : les déclarer en rappel (Creature Weapons : les attaques imprimées sont déjà des actions ordinaires).

## 3. Restent en rappel (rien à faire)

- Rares, à règle propre (Q3) : Capricieux, Salive anticoagulante, Scission, Attache et se nourrit, Facilement confus, Hallucinogène, Proie du Prince des Ténèbres.
- Terrain (Q4) : Limicole, Foulée adaptée, Grimpant, Fouissage, Aquatique hors de l'eau.
- Narratifs ou tirés par le MJ : Salive analgésique, Télépathie animale, Accordé à la magie, Œil maléfique, Corruption, Sorcière de cercle, Maladie, Moule informe, Engloutissement, Corruption mentale, Messager, Mutation, Marques du Chaos et de Khorne, Forme de guerre naïade, Renaissance du phénix, Préjugé, Lanceur aléatoire, Métamorphe, Siphon de sort, Télépathie, Territorial, Feu de Tzeentch, Sans peur (aucun groupe de spécialisation), Trait de compagnon (géré par les familiers).
- Sans règle d'exposition ni de terrain dans le moteur : Aura glaciale, Vulnérable au froid, Sillage de feu, Rampant, Attaquant immobile, Disruption.
- Têtu (Stubborn) : jets de conduite opposés à définir, rappel.
- Dressé (Choc) : traversée d'un groupe en charge, géométrie absente ; rappel.

## 4. Décisions du MJ (17/11/2026)

- **Q1 Psychologie** : d'office quand le moteur connaît le déclencheur (Stupide en début de Round, Bestial sous la moitié des PV…), avec ↶ ; bouton sinon.
- **Q2 Insensible à la douleur** : à calculer.
- **Q3 Traits rares à règle propre** : restent en rappel.
- **Q4 Traits de terrain** : restent en rappel.

## 5. Avant la spec

- Relire dans les livres (L06 Creature Traits p. 356 et suivantes, L11 pp. 135-137, L13 pp. 106-107) les règles de la section 2, surtout Bouclier, Inflammable, Increvable, Instable, Rage et les déclencheurs de psychologie. Paraphrase seulement, jamais le texte du livre dans le dépôt.
- Vérifier que les fonctions de plan citées existent encore sous ce nom (l'inventaire date de la 3.50.0).
