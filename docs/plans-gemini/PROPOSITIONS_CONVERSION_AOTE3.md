# Propositions de conversion V5 des sorts d'AOTE3 et noms français des sorts sans traduction officielle

21 octobre 2026 — Branche `gemini/lot2`.
Document préparatoire : **toutes les conversions mécaniques V4 → V5 et toutes les traductions de noms ci-dessous sont des propositions soumises à l'arbitrage du MJ**, dans le cadre de [`docs/ARBITRAGES_MJ_21_10.md`](../ARBITRAGES_MJ_21_10.md). Aucun fichier existant n'est modifié.

## Sources et principes directeurs

- **Inventaire de référence** : [`docs/lot3/LOT4_TRADITIONS_BASE.md`](../lot3/LOT4_TRADITIONS_BASE.md) et [`docs/lot3/LOT4_TRADITIONS_BASE.json`](../lot3/LOT4_TRADITIONS_BASE.json).
- **Sources primaires vérifiées** :
  - `L02` (*Archives of the Empire 3.pdf*, V4 EN) : chapitre IV *Minor Gods, Folk Worship & Hedgecraft — The Lore of Hedgecraft*, pages imprimées **60 à 64** (sorts pp. **62 à 64**).
  - `L06` (*Livre de base V5 EN v2.pdf*) : chapitre VIII *Magic — Witch Magic, Dark Magic, Chaos Magic*, pages imprimées **255 à 260**.
  - `L05` (*Livre de base FR.pdf*, V4 FR) : chapitre VIII *Magie — Autres Domaines, Magie noire, Magie du Chaos*, pages imprimées **254 à 257** (pages physiques **256 à 259**).
- **Principes d'arbitrage appliqués (`docs/ARBITRAGES_MJ_21_10.md`)** :
  1. **Domaine** : rattaché sous le nom officiel français **`Domaine de la Magie naturelle`** (`L05` p. 254).
  2. **Aucun ingrédient exigé (principe transversal)** : les objets ou préparations matérielles exigés dans `L02` (bâtonnet taillé, pieu gravé, coupe, bourse cousue dans la peau d'un petit animal) deviennent des **rappels narratifs** et ne bloquent jamais l'incantation dans le moteur.
  3. **Équivalences mécaniques V4 → V5** : bonus/malus de `±10` → `±1 DR` (`±20` → `±2 DR`) ; difficultés V4 recalées sur l'échelle V5 (`Challenging +0` → Intermédiaire `+0 DR`, `Average +20` → Accessible `+2 DR`, `Hard -20` → Difficile `-2 DR`) ; *Avantage* V4 → *Élan* (`Momentum`) ou *Avantage* V5 selon le contexte ; alignement sur les États et Traits de créature du socle V5 (`L06` pp. 166–168 et 356–363).

---

## 1. Propositions de conversion V5 des 9 sorts du Domaine de la Magie naturelle (`AOTE3` / `L02` pp. 62–64)

### Tableau récapitulatif des 9 sorts AOTE3

| # | Sort (`L02`) | Nom FR proposé | NI | Portée | Cible | Durée | Clauses V4 à convertir / adapter en V5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Dagger of the Art** (p. 62) | **Dague de l'Art** | 4 | Vous | Vous | `(BFM) Rounds` | Support matériel en rappel ; dégâts `BF + 8` sur Traits `Éthéré` / `Corruption` ; maintien par Test de `Focalisation` (`+0 DR`)/Round. |
| 2 | **Fellstave** (p. 62) | **Borne sinistre** | 9 | Voir texte | Voir texte (`ZdE 100 m`) | `1 mois` | Pieu en rappel ; spécialisation d'espèce à l'apprentissage ; Test de `Calme` (`+0 DR`) à `100 m` sinon `Brisé` ; Test d'`Intuition` (`+0 DR`) après récupération. |
| 3 | **Invigorate** (p. 63) | **Revigorer** | 2 | Toucher | 1 | `(BFM) Rounds` | Suspension temporaire des pénalités de l'État `Exténué` (`-1 DR`/niveau en V5) pendant la durée sans purger le compteur. |
| 4 | **Lovelock** (p. 63) | **Philtre d'amour** | 10 | Toucher | Voir texte (1 buveur) | `Jusqu'à minuit` | Coupe en rappel ; effet narratif d'engouement jusqu'à minuit (option : `+2 DR` aux Tests de Sociabilité de la personne aimée). |
| 5 | **Protection Pouch** (p. 63) | **Sachet de protection** | 5 | Toucher | Voir texte (1 porteur) | `1 sem. + 1 sem./DR` | Sachet en rappel ; `+1 DR` en `Calme` (Psychologie) contre Peur/Terreur surnaturelles ; `+1 DR` en `Résistance` contre maladies et `Empoisonné`. |
| 6 | **Sightstep** (p. 64) | **Pas imperceptible** | 7 | Vous | Vous | `(BFM) minutes` | Masque l'aura face à `Seconde vue` et `Sens de la magie` ; `+2 DR` en `Discrétion` contre `Démoniaque`/`Éthéré` ; verrouille incantation, focalisation et dissipation. |
| 7 | **Silvertide** (p. 64) | **Marée d'argent** | 4 | Vous | Vous | `1d10 heures` | Gain narratif/monétaire de `1d10` sous de cuivre (`brass pennies`) au terme de la durée. |
| 8 | **The Ousting** (p. 64) | **L'Expulsion** | 8 | `(BFM) m` | 1 (`Éthéré` ou `Démoniaque`) | `1d10 ans` | Test de `Force Mentale` / `Calme` (`+0 DR`) de la cible sinon `(BFM)` Blessures directes ; si `≤ 0` Blessure, bannissement pour `1d10 ans`. |
| 9 | **Wyrd Ward** (p. 64) | **Protection contre le wyrd** | 4 | Toucher | 1 | `(BFM) heures` | Test opposé de `Force Mentale` ; si victoire du lanceur, `-2 DR` à `Langue (Magick)` et `Focalisation` sur Sorcellerie, Nécromancie, Démonologie et Chaos. |

---

### 1.1. `Dagger of the Art` (`L02` p. 62) — **Dague de l'Art**

- **Paramètres** : **NI** : `4` | **Portée** : `Vous` | **Cible** : `Vous` | **Durée** : `(Bonus de Force Mentale) Rounds`
- **Effet résumé** : Le lanceur saisit une brindille ou un bâtonnet d'une vingtaine de centimètres qui se change en une dague dotée de l'Atout *Magique* ; elle inflige `BF + 8` Dégâts aux créatures *Éthérées* ou *Corrompues* et peut être maintenue au-delà de sa durée initiale par un Test de *Focalisation* par Round.
- **Proposition de conversion V5 clause par clause** :
  1. **Support matériel (bâtonnet de moins de 8 pouces)** :
     - *Proposition retenue* : simple **rappel narratif** (aucune vérification bloquante d'inventaire, conformément au principe transversal sans ingrédient).
     - *Alternative* : exiger la présence d'une arme improvisée ou d'une dague sur la fiche.
  2. **Arme générée (dague avec la qualité `Magical`)** :
     - *Proposition retenue* : crée une attaque temporaire de mêlée de profil **Dague** (`Dégâts BF + 2`, `L06` p. 291) portant la qualité d'arme **`Magique`** (`Magical`, permettant de blesser les créatures *Éthérées* et d'ignorer la sauvegarde *Démoniaque* selon `L06` pp. 357–358).
  3. **Dégâts majorés (`SB + 8`) contre les ennemis ayant le Trait `Ethereal` ou `Corrupted`** :
     - *Raison du problème* : dans le bestiaire V5 (`L06` pp. 357–360), `Ethereal` correspond à **`Éthéré`** (`E0-T-021`), mais il n'existe pas de Trait nommé littéralement `Corrupted` : le Trait s'intitule **`Corruption (Degré)`** (`E0-T-016`), entouré de `Corruption mentale` (`E0-T-038`), `Mutation` (`E0-T-040`), `Marque du Chaos` (`E0-T-035`) et `Démoniaque` (`E0-T-018`).
     - *Proposition retenue* : remplacer les Dégâts `BF + 2` de la dague par **`BF + 8`** dès que la cible possède l'un des Traits **`Éthéré`**, **`Corruption (Degré)`**, **`Corruption mentale`**, **`Mutation`**, **`Marque du Chaos`** ou **`Démoniaque`**.
     - *Alternative* : restreindre strictement le bonus `BF + 8` aux deux seuls Traits **`Éthéré`** et **`Corruption (Degré)`**.
  4. **Prolongation après la durée initiale (« Challenging (+0) Channelling Test each round thereafter »)** :
     - *Raison du problème* : `Challenging (+0)` devient **Intermédiaire (`+0 DR`)** en V5 ; par ailleurs, la Magie naturelle ne possède pas de Vent de Couleur dédié (`L06` p. 255).
     - *Proposition retenue* : à partir de la fin de `(BFM) Rounds`, permettre de prolonger le sort d'un Round supplémentaire en réussissant un **Test de `Focalisation` Intermédiaire (`+0 DR`)** gratuit au début du tour du lanceur (sans consommer son Action).
     - *Alternative A* : utiliser un Test de **`Langue (Magick)` Intermédiaire (`+0 DR`)** (puisque l'incantation V5 repose sur `Langue (Magick)`).
     - *Alternative B* : exiger l'Action du tour pour effectuer le Test de maintien, sur le modèle du maintien actif de certains sorts V5.

---

### 1.2. `Fellstave` (`L02` p. 62) — **Borne sinistre**

- **Paramètres** : **NI** : `9` | **Portée** : `Voir texte (rayon de 100 mètres autour du pieu)` | **Cible** : `Voir texte (créatures du type choisi à l'apprentissage)` | **Durée** : `1 mois`
- **Effet résumé** : Le lanceur plante en terre un pieu de bois gravé de signes conjuratoires qui repousse pendant un mois un type de créatures choisi lors de l'apprentissage du sort : toute créature de ce type approchant à moins de cent mètres doit réussir un Test de Calme ou subir l'État *Brisé*.
- **Proposition de conversion V5 clause par clause** :
  1. **Ciblage par type de créature choisi à l'apprentissage** :
     - *Proposition retenue* : conserver la liste d'espèces/catégories de `L02` p. 62 (**Hommes-bêtes** [incluant Minotaures et Centigors, hors Skavens], **Démons**, **Orques et Gobelins**, **Ogres**, **Fimirs**, **Trolls**, **Morts-vivants**, ou autre catégorie validée par le MJ) sous forme de spécialisation du sort (`Borne sinistre (Morts-vivants)`, etc.), ré-apprenable au coût standard en PX pour chaque nouveau type.
     - *Alternative* : permettre de choisir le type de créature au moment de l'incantation (plus souple en jeu, mais s'écarte de la restriction d'apprentissage de `L02`).
  2. **Préparation du pieu (bois d'au moins 3 pieds sur 4 pouces)** :
     - *Proposition retenue* : **rappel narratif** (principe transversal sans ingrédient obligatoire).
  3. **Test de répulsion à 100 yards (« Challenging (+0) Cool Test or receive a Broken Condition »)** :
     - *Proposition retenue* : convertir `100 yards` en **`100 mètres`** et `Challenging (+0) Cool Test` en **Test de Calme (Psychologie) Intermédiaire (`+0 DR`)** (conformément à *Horreur hantante* `L06` p. 257 et *Crâne hurlant* `L06` p. 259). En cas d'échec, la créature subit **`1` État `Brisé`** (`Broken`).
     - *Alternative* : infliger `1` État `Brisé` + `1` par `DR` négatif au-delà du premier (par symétrie avec l'arbitrage `C0-Q02` sur la Terreur V5), ou respecter l'immunité à la Psychologie si la créature possède `Immunité Psychologique` (ex. Morts-vivants décérébrés), **sauf** si l'on précise que *Borne sinistre* contourne `Immunité Psychologique` pour le type choisi (indispensable pour que l'option `Morts-vivants` prévue par `L02` p. 62 ait un effet sur des Squelettes ou Zombies). **Nous recommandons de préciser que cet effet magique contourne `Immunité Psychologique` pour la catégorie ciblée.**
  4. **Prise de conscience après récupération (« Challenging (+0) Intuition Test »)** :
     - *Raison du problème* : le texte imprimé de `L02` p. 62 contient une inversion manifeste (« *Creatures who recover from Broken Conditions must make a Challenging (+0) Intuition Test. If they fail, they realise that the Fellstave caused them to experience a magically induced panic* »).
     - *Proposition retenue* : **Test d'Intuition Intermédiaire (`+0 DR`)** en rappel MJ après retrait de l'État `Brisé` ; sur une **réussite** (correction logique de la coquille de `L02`), la créature identifie le pieu comme la source de sa panique.
     - *Alternative* : conserver la lecture littérale de `L02` (prise de conscience sur un échec du Test d'Intuition).

---

### 1.3. `Invigorate` (`L02` p. 63) — **Revigorer**

- **Paramètres** : **NI** : `2` | **Portée** : `Toucher` | **Cible** : `1` | **Durée** : `(Bonus de Force Mentale) Rounds`
- **Effet résumé** : Le sort redonne du tonus au corps de la cible touchée, qui ignore tous les effets de ses États *Exténué* pendant toute la durée du sort.
- **Proposition de conversion V5 clause par clause** :
  1. **Effet sur l'État `Fatigued` (`Exténué`)** :
     - *Raison* : en V4, chaque État `Exténué` infligeait `-10` à tous les Tests ; en V5 (`L06` p. 166), chaque État `Exténué` inflige **`-1 DR` à tous les Tests**. Par ailleurs, le Domaine de la Sorcellerie en V5 possède *Make Hale* (*Bonne santé*, `L06` p. 257, NI 4, Instantané) qui **retire définitivement** `1 Exténué` et `1 Sonné`, tandis qu'*Invigorate* (NI 2, durée `BFM Rounds`) se contente de les **faire ignorer** pendant la durée.
     - *Proposition retenue* : poser une couche temporaire de `(BFM) Rounds` qui **neutralise la pénalité de `-1 DR` par État `Exténué`** sur la cible tant que le sort est actif, sans effacer le compteur d'`Exténué` (qui redevient actif à la fin du sort).
     - *Alternative* : retirer immédiatement `1` État `Exténué` (`+1` par `+2 DR`) pour éviter d'avoir à distinguer « `Exténué` présent mais ignoré » et « `Exténué` retiré », au prix d'un chevauchement partiel avec *Make Hale*.

---

### 1.4. `Lovelock` (`L02` p. 63) — **Philtre d'amour**

- **Paramètres** : **NI** : `10` | **Portée** : `Toucher` | **Cible** : `Voir texte (1 coupe / 1 buveur)` | **Durée** : `Jusqu'à minuit`
- **Effet résumé** : En psalmodiant au-dessus d'une coupe, le lanceur y laisse tomber de ses lèvres quelques gouttes de miel enchanté ; la personne qui boit ce philtre tombe amoureuse jusqu'à minuit du premier individu qu'elle pourrait juger attirant.
- **Proposition de conversion V5 clause par clause** :
  1. **Récipient requis (coupe ou gobelet)** :
     - *Proposition retenue* : **rappel narratif** (principe transversal sans ingrédient requis, identique au traitement de *Nepenthe* `L06` p. 256).
  2. **Durée (`Until midnight`)** :
     - *Proposition retenue* : conserver **`Jusqu'à minuit`** (expiration gérée comme les durées calendaires V5 telles que *Jusqu'au lever du soleil* de *Raise Dead* `L06` p. 258).
     - *Alternative* : distinguer la durée de conservation du philtre avant ingestion — par exemple `(Bonus de Force Mentale) heures` comme *Nepenthe* (`L06` p. 256) — et la durée de l'effet amoureux (`Jusqu'à minuit`).
  3. **Effet mécanique et narratif de l'état amoureux** :
     - *Proposition retenue* : `L02` p. 63 ne prévoyant ni jet de résistance ni modificateur chiffré, enregistrer l'effet comme **état/rappel narratif** sur la cible (« *Sous l'effet de Philtre d'amour envers [Personne] jusqu'à minuit* »), en proposant à titre d'aide optionnelle au MJ un bonus de **`+2 DR` aux Tests de Sociabilité** (Charme, Ragots, Subornation) effectués par l'être aimé envers la cible.
     - *Alternative* : accorder à la cible un **Test de Calme (Psychologie) opposé au Test d'Incantation** si l'attirance forcée la pousse à agir contre ses intérêts vitaux.

---

### 1.5. `Protection Pouch` (`L02` p. 63) — **Sachet de protection**

- **Paramètres** : **NI** : `5` | **Portée** : `Toucher` | **Cible** : `Voir texte (1 porteur du sachet)` | **Durée** : `1 semaine + 1 semaine par DR`
- **Effet résumé** : Le lanceur fait éclore à ses pieds des herbes pourpres qu'il glisse dans un petit sachet en peau animale ; porté autour du cou, ce talisman confère `+1 DR` aux Tests de Calme contre les peurs surnaturelles et `+1 DR` aux Tests de Résistance contre les maladies et les poisons.
- **Proposition de conversion V5 clause par clause** :
  1. **Confection du sachet (peau de chauve-souris ou de musaraigne et herbes)** :
     - *Proposition retenue* : **rappel narratif** (principe transversal sans ingrédient requis). Le sort génère un effet d'objet porté transférable à un personnage, sur le modèle de *Charme protecteur* (`Protective Charm`, `L06` p. 256).
  2. **Durée (`1 week + 1 week per SL`)** :
     - *Proposition retenue* : conserver **`1 semaine + 1 semaine par DR`** obtenu au Test d'Incantation (formule déjà rédigée en `SL`/`DR`).
     - *Alternative* : normaliser sur **`(Bonus de Force Mentale) jours`** pour l'aligner sur *Charme protecteur* (`L06` p. 256).
  3. **Bonus psychologique (`+1 SL to any Cool Tests to resist supernatural effects, including Fear and Terror caused by Undead and Daemons`)** :
     - *Proposition retenue* : **`+1 DR` aux Tests de Calme (Psychologie)** effectués pour résister à la **Peur**, à la **Terreur** ou aux effets psychologiques d'origine surnaturelle (en particulier face aux créatures portant le Trait *Mort-vivant*, *Démoniaque* ou *Éthéré*).
     - *Alternative* : étendre le `+1 DR` à tous les Tests de `Calme` contre la Peur et la Terreur quelle qu'en soit la source (plus simple à automatiser dans le moteur de courage C0).
  4. **Bonus sanitaire (`+1 SL to Endurance Tests made to resist contracting diseases or suffering from Poisoned Conditions`)** :
     - *Proposition retenue* : **`+1 DR` aux Tests de Résistance (`Endurance`)** visant à éviter de contracter une **Maladie** (`L06` p. 179) ou à résister / mettre fin à un État **`Empoisonné`** (`L06` p. 167, 186).

---

### 1.6. `Sightstep` (`L02` p. 64) — **Pas imperceptible**

- **Paramètres** : **NI** : `7` | **Portée** : `Vous` | **Cible** : `Vous` | **Durée** : `(Bonus de Force Mentale) minutes`
- **Effet résumé** : Par une brève invocation, le lanceur voile sa nature magique aux sens aethyriques et gagne `+2 DR` aux Tests de Discrétion pour se dissimuler aux démons, esprits et créatures éthérées, mais ne peut ni lancer de sort, ni dissiper, ni focaliser tant que l'effet dure.
- **Proposition de conversion V5 clause par clause** :
  1. **Occultation de l'aura magique (« Those with the Magical Sight Talent notice nothing strange about you »)** :
     - *Raison du problème* : le Talent *Magical Sight* nommé dans `L02` p. 64 n'existe sous ce nom ni en V4 (`L05`) ni en V5 (`L06` pp. 140, 143) ; les deux Talents officiels de détection magique sont **`Seconde vue`** (`Second Sight`) et **`Sens de la magie`** (`Magical Sense`), également visés par le sort *Aura ordinaire* (`Mundane Aura`, `L06` p. 254 / `js/data/v5-spell-contracts.json:12979`).
     - *Proposition retenue* : rendre l'aura du lanceur indétectable aux Talents **`Seconde vue`** (`Second Sight`) et **`Sens de la magie`** (`Magical Sense`) pendant la durée.
     - *Alternative* : demander un Test opposé de `Perception` ou d'`Intuition` contre le Test d'Incantation (sur le modèle de *Shroud of Invisibility*, `L06` p. 255).
  2. **Bonus de furtivité (`+2 SL to any Stealth Tests to hide from Daemons, spirits, and ethereal creatures`)** :
     - *Proposition retenue* : **`+2 DR` aux Tests de Discrétion (`Stealth`)** effectués contre toute créature possédant le Trait **`Démoniaque`** ou **`Éthéré`** (en V5 `L06` p. 358, les esprits sont couverts par le Trait *Éthéré*).
  3. **Restriction d'activité magique (« You may not cast magic yourself while the spell is in effect, and may not dispel or channel »)** :
     - *Proposition retenue* : tant que la couche *Pas imperceptible* est active, **interdire l'incantation (`Langue (Magick)`), la `Focalisation` (`Channelling`) et la Dissipation** ; le lanceur peut toutefois mettre fin volontairement à *Pas imperceptible* à son tour s'il souhaite recommencer à lancer des sorts.
     - *Alternative* : faire simplement expirer *Pas imperceptible* dès que le lanceur tente un Test de `Langue (Magick)` ou de `Focalisation`.

---

### 1.7. `Silvertide` (`L02` p. 64) — **Marée d'argent**

- **Paramètres** : **NI** : `4` | **Portée** : `Vous` | **Cible** : `Vous` | **Durée** : `1d10 heures`
- **Effet résumé** : Le lanceur prononce un charme de bonne fortune qui lui fait découvrir au fil des heures des pièces égarées sur le chemin, dans les ourlets ou sous les meubles, pour un total de `1d10` sous de cuivre à la fin du sort.
- **Proposition de conversion V5 clause par clause** :
  1. **Durée (`1d10 hours`) et gain (`1d10 pennies`)** :
     - *Proposition retenue* : conserver la durée de **`1d10 heures`** et le gain final de **`1d10` sous de cuivre** (`brass pennies`, traduits par « sous de cuivre » dans `L05` p. 288 et `L05` p. 254), restitués en rappel ou en crédit de bourse à l'expiration.
     - *Alternative* : convertir la durée en **`(Bonus de Force Mentale) heures`** (pour éviter un jet de dé de durée) et/ou ajouter `+1 sou de cuivre par +2 DR` obtenu au Test d'Incantation.

---

### 1.8. `The Ousting` (`L02` p. 64) — **L'Expulsion**

- **Paramètres** : **NI** : `8` | **Portée** : `(Bonus de Force Mentale) mètres` | **Cible** : `1 (créature Éthérée ou Démoniaque)` | **Durée** : `1d10 ans`
- **Effet résumé** : Par des paroles de bannissement, le lanceur somme une créature *Éthérée* ou *Démoniaque* à portée de quitter le monde matériel ; si elle rate un Test de Force Mentale Intermédiaire (`+0 DR`), elle subit autant de Blessures que le Bonus de Force Mentale du lanceur et, si cela la réduit à `0` Blessure ou moins, est bannie pour `1d10` ans.
- **Proposition de conversion V5 clause par clause** :
  1. **Condition de ciblage (`Ethereal or Daemonic Trait within range`)** :
     - *Proposition retenue* : 1 cible à portée de **`(Bonus de Force Mentale) mètres`** possédant le Trait **`Éthéré`** (`E0-T-021`) ou **`Démoniaque`** (`E0-T-018`).
  2. **Test de résistance (« pass a Challenging (+0) Willpower Test or suffer Wounds equal to your Willpower Bonus »)** :
     - *Raison du choix* : en V4 (`L02` p. 64), le test est un jet fixe de `Willpower` à `+0` ; en V5, les sorts comparables (*Destroy Lesser Daemon* `L06` p. 258, *Bannissement* `L06` pp. 247, 253) utilisent tantôt un Test opposé, tantôt un Test fixe.
     - *Proposition retenue (fidèle au texte `L02` converti en V5)* : la cible effectue un **Test de Force Mentale (ou de `Calme`) Intermédiaire (`+0 DR`)**. En cas d'échec, elle perd immédiatement **`(Bonus de Force Mentale du lanceur)` Blessures directes** (non réduites par le Bonus d'Endurance ni par les PA, et ignorant la sauvegarde *Démoniaque* car la source est magique, cf. `L06` p. 357).
     - *Alternative (harmonisation avec les bannissements V5 de `L06`)* : remplacer le Test fixe par un **Test opposé de `Calme` (`Cool`) de la cible contre le Test d'Incantation**.
  3. **Bannissement à `0` Blessure ou moins (`banished for 1d10 years`)** :
     - *Proposition retenue* : si les Blessures infligées amènent la cible à **`0` Blessure ou moins**, elle est immédiatement retirée du monde matériel et ne peut y revenir pendant **`1d10 ans`** (rappel narratif de campagne au-delà de la destruction immédiate déjà prévue par `Instable`/`Démoniaque` en V5).

---

### 1.9. `Wyrd Ward` (`L02` p. 64) — **Protection contre le wyrd**

- **Paramètres** : **NI** : `4` | **Portée** : `Toucher` | **Cible** : `1` | **Durée** : `(Bonus de Force Mentale) heures`
- **Effet résumé** : En saisissant un sorcier pratiquant le Dhar, le lanceur prononce une malédiction qui entrave son lien aux énergies corrompues : s'il remporte un Test opposé de Force Mentale, la cible subit `-2 DR` à tous ses Tests d'incantation et de focalisation dans les Domaines de la Sorcellerie, de la Nécromancie, de la Démonologie et du Chaos pendant la durée.
- **Proposition de conversion V5 clause par clause** :
  1. **Résolution du Test opposé (« Opposed Willpower Test with the target »)** :
     - *Proposition retenue* : après réussite du Test d'Incantation, résoudre un **Test opposé de Force Mentale (ou `Calme`)** entre le lanceur et la cible ; l'effet ne s'applique que si le lanceur remporte cette opposition.
     - *Alternative* : fusionner l'incantation et l'opposition en opposant directement le `Calme` (`Cool`) de la cible au Test d'Incantation (`Langue (Magick)`) du lanceur (évite un second jet de dés).
  2. **Malus de `-2 SL` sur `Language (Magick)` et `Channelling` pour les traditions sombres** :
     - *Proposition retenue* : la valeur étant déjà exprimée en `SL` (`DR`), appliquer un malus de **`-2 DR` à tous les Tests de `Langue (Magick)` et de `Focalisation`** effectués par la cible pour lancer ou préparer un sort appartenant aux Domaines suivants : **`Sorcellerie`** (`witchcraft`), **`Nécromancie`** (`necromancy`), **`Démonologie`** (`daemonology`), **`Nurgle`**, **`Slaanesh`** et **`Tzeentch`** (ainsi que tout sort utilisant `Focalisation (Dhar)`).

---

## 2. Propositions pour les 19 noms français de sorts sans traduction officielle dans `L05`

Les 19 sorts ci-dessous se répartissent en :
- **4 sorts du livre de base V5 (`L06` pp. 255–257)** ajoutés en V5 et absents du livre de base V4 FR (`L05` pp. 254–256) ;
- **6 sorts des Domaines du Chaos (`L06` pp. 259–260)** ajoutés en V5 (`L05` p. 257 ne contenait qu'un seul sort par Domaine du Chaos : *Flot de Corruption*, *Consentement* et *Trahison de Tzeentch*) ;
- **9 sorts complémentaires de la Magie naturelle (`L02` / *AOTE3* pp. 62–64)** jamais traduits en français.

| # | Domaine (`Source`) | Nom anglais | Nom français proposé | Alternatives | Raison (cohérence avec les noms officiels voisins) |
| --- | --- | --- | --- | --- | --- |
| 1 | Magie naturelle (`L06` p. 255) | **Halétha’s Joy** *(noté Halãtha's Joy dans LOT4)* | **Joie de Halétha** *(ou Joie de Halãtha)* | *Bénédiction de Halétha*, *Allégresse de Halétha* | Calqué sur le patron possessif des sorts nommés en VF (*L'appel de Vanhel* `L05` p. 256, *Protection de Phâ* `L05` p. 250). La graphie `Halétha` est celle imprimée dans `L06` p. 255 et `L02` p. 60. |
| 2 | Magie naturelle (`L06` p. 256) | **Shepherd’s Eye** | **Œil du berger** | *Regard du berger*, *Miroir du pâtre* | Fait écho à *Mauvais œil* (`The Evil Eye`, `L05` p. 255) dans le domaine voisin de la Sorcellerie tout en gardant le registre pastoral de la Magie naturelle. |
| 3 | Sorcellerie (`L06` p. 257) | **Glamour** | **Glamour** | *Charme d'apparence*, *Illusion d'âge* | Conserve le terme déjà employé dans le catalogue existant pour *Glamour de Teclis* (`js/data/v5-spell-contracts.json:5107`). *Charme d'apparence* est l'alternative francisée. |
| 4 | Sorcellerie (`L06` p. 257) | **Make Hale** | **Bonne santé** | *Remettre sur pied*, *Ragaillardir* | Forme nominale sobre faisant pendant à *Bonne Volonté* (`Goodwill`, `L05` p. 254) et s'opposant à *Dégradation* (`Blight`, `L05` p. 255) et *Malédiction de douleur paralysante* (`L05` p. 255). |
| 5 | Chaos — Nurgle (`L06` p. 259) | **Festering Inflammation** | **Inflammation suppurée** | *Inflammation purulente*, *Plaie suppurante* | S'aligne directement sur la traduction de `Festering Wound` (*Blessure Suppurée* dans `LOT4_TRADITIONS_BASE` / *Blessure Purulente* dans `L05` p. 186) que le sort inflige. |
| 6 | Chaos — Nurgle (`L06` p. 259) | **Miasma of Pestilence** | **Miasme de pestilence** | *Miasme pestilentiel*, *Brume de pestilence* | Calqué sur le patron de *Miasme mystifiant* (`Mystifying Miasma`, `L05` p. 253 / `v5-spell-contracts.json:16309`) et cohérent avec le registre médical infectieux de *Flot de Corruption* (`L05` p. 257). |
| 7 | Chaos — Slaanesh (`L06` p. 260) | **From Pain, Pleasure** | **De la douleur, le plaisir** | *Du supplice naît l'extase*, *Plaisir dans la douleur* | Conserve le rythme binaire de la devise de Slaanesh (« *Prince du Plaisir et de la Souffrance* », `L05` p. 257) à côté de *Consentement* (`Acquiescence`, `L05` p. 257). |
| 8 | Chaos — Slaanesh (`L06` p. 260) | **Phantasmagoria** | **Fantasmagorie** *(ou Phantasmagorie)* | *Visions fantasmagoriques*, *Cortège d'illusions* | Nom d'un seul mot comme *Consentement* (`Acquiescence`, `L05` p. 257). `Fantasmagorie` (avec `F-`) est l'orthographe française normative ; `Phantasmagorie` (proposé dans `LOT4`) garde la graphie anglaise. |
| 9 | Chaos — Tzeentch (`L06` p. 260) | **Boon of Tzeentch** | **Don de Tzeentch** | *Faveur de Tzeentch*, *Bénédiction de Tzeentch* | Suit exactement le patron `[Substantif] de Tzeentch` du sort officiel *Trahison de Tzeentch* (`Treason of Tzeentch`, `L05` p. 257) et le modèle de *Don de Vie* (`v5-spell-contracts.json:7488`). |
| 10 | Chaos — Tzeentch (`L06` p. 260) | **Transformation of Tzeentch** | **Transformation de Tzeentch** | *Métamorphose de Tzeentch*, *Transmutation de Tzeentch* | Même patron `[Substantif] de Tzeentch` que *Trahison de Tzeentch* (`L05` p. 257) et *Transformation de Kadon* (`L05` p. 246). |
| 11 | Magie naturelle (`L02` p. 62) | **Dagger of the Art** | **Dague de l'Art** | *Dague de la Haie*, *Rameau-dague* | Traduction fidèle qui respecte le terme « l'Art » par lequel les sorciers de village désignent leur tradition, à proximité d'*Arme enchantée* (`v5-spell-contracts.json:3580`). |
| 12 | Magie naturelle (`L02` p. 62) | **Fellstave** | **Borne sinistre** | *Pieu conjuratoire*, *Bâton d'effroi* | Rend la fonction de borne territoriale plantée en terre (`stave`) et l'effet d'effroi (`fell`) qui brise le moral des intrus. |
| 13 | Magie naturelle (`L02` p. 63) | **Invigorate** | **Revigorer** | *Regain de vigueur*, *Tonifier* | Verbe à l'infinitif cohérent avec les intitulés verbaux officiels du même Domaine dans `L05` pp. 254–255 (*Chevaucher l'Obscurité*, *Séparer les branches*). |
| 14 | Magie naturelle (`L02` p. 63) | **Lovelock** | **Philtre d'amour** | *Nœud d'amour*, *Lien des cœurs* | S'intègre aux noms de potions du Domaine dans `L05` p. 254 (*Nepenthès*, *Panacée*) en reprenant le mot « philtre » employé dans le texte de `L05` p. 254 et `L02` p. 63. |
| 15 | Magie naturelle (`L02` p. 63) | **Protection Pouch** | **Sachet de protection** | *Bourse protectrice*, *Sachet conjuratoire* | Formé en parallèle direct avec *Charme protecteur* (`Protective Charm`, `L05` p. 254) du même Domaine. |
| 16 | Magie naturelle (`L02` p. 64) | **Sightstep** | **Pas imperceptible** | *Pas voilé*, *Marche hors de vue* | Traduit le composé anglais (`Sight` + `step`) dans le registre discret et rustique du Domaine, en écho à *Chevaucher l'Obscurité* (`L05` p. 254). |
| 17 | Magie naturelle (`L02` p. 64) | **Silvertide** | **Marée d'argent** | *Aubaine des sous perdus*, *Flux d'argent* | Traduction directe de l'image poétique du composé anglais, faisant pendant à *L'Or du Fou* (`Fool's Gold`, `L05` p. 248 / `v5-spell-contracts.json:3723`). |
| 18 | Magie naturelle (`L02` p. 64) | **The Ousting** | **L'Expulsion** | *Le Renvoi*, *Bannissement de la Haie* | Conserve l'article défini de l'anglais (*The Ousting*), sur le modèle de *L'appel de Vanhel* (`L05` p. 256), tout en se distinguant de *Bannissement Mineur/Majeur* (`L05` p. 250). |
| 19 | Magie naturelle (`L02` p. 64) | **Wyrd Ward** | **Protection contre le wyrd** | *Garde contre le maléfice*, *Entrave du Dhar* | Reprend le terme « Protection » de *Charme protecteur* (`L05` p. 254) et de *Protection de Phâ* (`L05` p. 250) en conservant la couleur folklorique de *wyrd*. |
