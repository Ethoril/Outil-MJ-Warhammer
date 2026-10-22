# Conception — Runes naines (lot D20, aucun code)

Sources : inventaire `docs/lot3/LOT4_TRADITIONS_SUPPLEMENTS.json` (90 runes : 82 de base + 8 du complément du 21/10 ; 28 règles de système, dont D0b-SYS-05 à 14 et 26 ; questions D0b-Q10 à Q13), pages déjà relevées (livres L15, L16, L20, L22, L25). Cette note n'ajoute **aucune** lecture de PDF : elle organise l'inventaire et propose le modèle. Arbitrages applicables : Avantage V4 → **Élan** V5, ±10 → ±1 DR, ±20 → ±2 DR, seuils de gravure **jamais inventés** (« Rune de relique » sans seuil publié : D0b-Q13).

## 1. Ce que dit le système (inventaire, sans valeurs de profil)

| Règle | Id | Contenu résumé |
|---|---|---|
| Apprentissage | SYS-05 | un achat apprend une rune admissible ; la rune de maître est distincte et enseigne aussi les trois runes de Destinée ; listes limitées selon la spécialisation du Forgerune |
| Gravure permanente | SYS-06 | objet physique, outils, atelier ; **un Test prolongé par semaine** (ou par activité), difficulté 0 pour une rune ordinaire, −2 DR pour une rune de maître (V4 −20) ; seuil de DR propre à chaque rune ; objet ensuite magique |
| Règle des trois et cumul | SYS-07 | au plus trois runes par objet ; répétitions ordinaires possibles ; sur un même objet les répétitions se cumulent ; sur des objets différents seul le meilleur ensemble compte |
| Forme | SYS-08 | matériaux durables, supports adaptés ; pas d'autre objet magique sauf magie runique naine ; dérogations à la difficulté du MJ |
| Fierté et Jalousie | SYS-09 | à 100 mètres, seul le plus ancien objet de même combinaison de runes fonctionne ; une seule rune de maître par objet, et seule la plus ancienne instance d'une même rune de maître fonctionne à proximité |
| Défauts runiques | SYS-10 | choix de +5 DR de progression contre un défaut ; à la première activation, extinction, destruction, dégradation ou coût de Chance |
| Supports de protection | SYS-11 | installation commune, portée de base de 6 mètres pour les alliés nains ; extension laissée au MJ |
| Runes de Destinée | SYS-12 | uniquement sur l'Enclume du Destin ; **une Action** de Maîtrise des runes −2 DR au lieu de la gravure prolongée ; effet dissipable comme un sort |
| Cultes ancestraux | SYS-13 | listes propres à chaque culte (pp. 134-140), à ne pas assimiler à toute liste de Forgerune |
| Circonstances favorables | SYS-14 | événement de temps mort 92-94 : inversion des Tests de gravure de l'activité en cours |
| Gromril | SYS-26 | armes et armures de gromril Incassables ; l'armure de gromril annule les Blessures Critiques reçues, sauf à 0 Blessure |

## 2. Les 90 runes, par famille (identifiants D0b-R-001 à D0b-R-090)

- **Livres** : L15 (73 runes, pp. 125-140 environ), L16 (9, runes de reliques), L22 (2), L20 (2), L25 (4 variantes de Sea of Claws p. 47).
- **Types** (dénombrés dans l'inventaire) : arme 10 ; arme de maître 7 ; armure 6 ; armure de maître 3 ; talisman 9 ; talisman de maître 5 ; protection 11 ; protection de maître 5 ; ingénierie 8 ; ingénierie de maître 4 ; Destinée 3 ; funéraire 3 ; reliques (armure 1, armure de maître 1, arme de maître 2, talisman de maître 1) ; arme maître spécialisée 1 ; installation 2 ; variantes (arme 3, armure de maître 1, arme de maître 1, talisman 2) ; rune seulement mentionnée 1.
- **Mécaniques** (94 étiquettes distinctes dans `mechanics`) regroupées en **huit familles de moteur** :
  1. *Bonus d'attaque et de dégâts* : damage, attackBonus, criticalSeverity, autoCritical, ignoreAP, ignoreArmor, weaponQuality, charge, rangedAttack, twoWeapons, salvoException, reload (arme).
  2. *Défense et protection* : armor, armorFormula, armorQuality, damageReduction, damageCap, defenseBonus, defensePenalty, immunity, magicResistance, resistance, minimumWoundException, unequipCritical, healing, fumbleCancel.
  3. *États, psychologie, Peur, Haine* : fear, grudge, psychology, ablaze, prideException.
  4. *Caractéristiques et Tests* : statModifier, maxWounds, skillBonus, initiative, testOverride, testPenalty, coolOverride, size, reverseDice (8 runes : à arbitrer, D0b-Q10), reverseCritical.
  5. *Magie et dissipation* : dispel, spellLock, castingPenalty, castingCN, reaction, retaliation, unstable.
  6. *Zone et installation* : zone, zoneDamage, detection, vision, light, invisibility, cover, burial, crew, selfDestruct, durationScale, periodicWounds (protection, ingénierie, installations).
  7. *Chance, Destin, durée* : fortune, tiers, quota, sessionQuota, campaignTime, endeavour, battleStart.
  8. *Reçus du MJ* : informationMJ, triggerMJ, resourceMJ, factsMJ, movementMJ, accessMJ, narrativeMJ, commandWord, species, exception.
- **Statut** : 82 « absent » (aucun raccordement du système de gravure), 8 « variante » (complément du 21/10, à rattacher aux runes de base sans doublon : D0b-Q11).

## 3. Conversion V5

- Les valeurs chiffrées sont lues **telles qu'imprimées** dans l'inventaire (`effectSummaryFr`, `slRequired`) et converties une seule fois : ±10/±20 → ±1/±2 DR (modificateurs de Test), pourcentages V4 de dégâts ou de Chance non convertis sans arbitrage (D0b-Q10), Avantage → Élan (octroi binaire, jamais cumulé : précédent des sorts d'orques, `grantMomentum`).
- `slRequired` (seuil de DR de la gravure) devient `drRequired` ; **jamais de seuil pour les runes sans valeur publiée** (reliques L16, Rune de Light/Opening/Hiding, D0b-Q13) : champ `drRequired: null`, état « à arbitrer » affiché.
- « Dés inversés » (8 runes) : lecture à arbitrer avec le moteur d'inversion des dés (`getReverseRoll`) avant tout code.
- Rune de Retribution (arme, protection, funéraire : trois barèmes) : trois entrées distinctes, jamais fusionnées (D0b-Q12). Rune de Force/Impact, Clear Sight/Seeing, Truth/Disclosure, Far Sight/Farseeing : une seule identité, nom V5 retenu, ancien nom en alias (D0b-Q11).

## 4. Modèle de données proposé

1. `data/runes/*.json` (fichier de données du jeu, une entrée par rune) : `{ id, name, nameFr, aliases, book, page, type, tier: 'ordinary'|'master'|'fate'|'relic'|'variant', slots: ['weapon'|'armour'|'talisman'|'engineering'|'protection'|'funerary'|'installation'], drRequired, effectSummaryFr, mechanics, engine: {...}|null, mjReceipt: '…'|null, cults: [...] }`. `engine` reste **nul** tant que la mécanique n'a pas de service ; jamais une valeur devinée.
2. Objet runique : `item.runes = [{ runeId, engravedAt, drProgress, flaw: null|{kind, status} }]`, au plus 3 (règle des trois), une seule `tier: 'master'`.
3. Gravure : `RuneEngraving { itemId, runeId, weeks, drProgress, difficulty (0 ou −2 DR), flawChosen }` — Tests prolongés saisis par le MJ (jets explicites), Annuler/Rétablir, reçu CAS, une seule gravure active par objet ; fin = rune gravée et objet marqué magique.
4. Fierté et Jalousie : lue à l'activation par une saisie « autre objet à moins de 100 mètres » (portée jamais suivie) ; la plus ancienne gravure gagne (`engravedAt`).
5. Service d'activation : lit `engine` et réutilise les services existants (`weaponBonus`, `apModifiers`, `damageReduction`, `immunities`, `testModifiers`, `grantMomentum`, Natures de la phase E) ; les mécaniques sans service vont en rappel chiffré.

## 5. Interactions avec l'équipement et les talents

- **Équipement** : armes, armures et boucliers de `equipment.js` (matériaux, `armorMaterial`, Qualités) ; un objet à runes est magique ; gromril = Incassable (Qualité existante) ; armure de gromril : suppression des Critiques reçus (règle SYS-26 : à brancher sur le registre des Blessures Critiques, hors exception à 0 Blessure).
- **Talents** : Maîtrise des runes (Action de Destinée), talents nains existants à vérifier contre les 8 « exceptions » de l'inventaire (`prideException`, `exception`) ; aucun doublon de bonus (règle de non-cumul V5 des caractéristiques, `statModifiers`).
- **Magie** : `dispel`, `spellLock`, `castingPenalty` sur le service de dissipation et de Fiasco existants.

## 6. Cas de test (futur lot de code)

1. Gravure : trois runes max (quatrième refusée) ; une seule rune de maître ; répétitions cumulées sur le même objet, meilleur ensemble seulement sur des objets différents ; difficulté −2 DR pour une rune de maître ; Annuler/Rétablir/rechargement.
2. Seuils : `drRequired` lu tel quel ; rune sans seuil publié refusée avec message « à arbitrer » (jamais de seuil inventé).
3. Destinée : seulement sur l'Enclume du Destin (fait de scène), une Action, effet dissipable.
4. Fierté et Jalousie : deux objets de même combinaison à moins de 100 mètres (saisie) : seul le plus ancien agit.
5. Défaut runique : +5 DR de progression contre un défaut, résolution de la première activation par jet explicite.
6. Mécaniques : une rune par famille de moteur (dégâts +1, critique +20, ignore 2 PA, Enflammé, Peur, immunité, protection de zone 6 mètres, Élan) ; mécaniques sans service : reçu chiffré et jamais d'effet silencieux.
7. Alias et variantes : les 8 variantes du 21/10 rattachées sans doublon ; Rune of Retribution en trois entrées.

## 7. Questions ouvertes (à arbitrer par le MJ)

- D0b-Q10 : adaptation des pourcentages V4 et des « dés inversés » (8 runes) au moteur V5 ; liste exacte des runes concernées.
- D0b-Q11, Q12, Q13 : alias et variantes, trois Retribution, runes de reliques sans seuil.
- Accès par culte (SYS-13, pp. 134-140) : les listes de chaque culte n'ont pas été relevées ici.
- Le moteur doit-il gérer l'artisanat de gravure (semaines, ateliers) ou seulement le résultat saisi ?
