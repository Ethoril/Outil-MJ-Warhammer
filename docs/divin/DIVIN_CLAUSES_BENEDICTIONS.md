# E2 — clauses des bénédictions du livre de base V5

Décomposition source uniquement; ne ferme aucun livre ni les lots E1/E2/E7. Les dépendances restent à développer et valider.

Lecture : reviewed. 19 bénédictions; 60 associations; 11 clauses communes et 21 clauses propres. 0 clause validée en exécution.

| Bénédiction | Clauses propres | Décomposition source | Contrats existants à recontrôler |
| --- | ---: | --- | --- |
| Bataille | 1 | independently-reviewed | Aucun |
| Respiration | 2 | independently-reviewed | Aucun |
| Charisme | 1 | independently-reviewed | Aucun |
| Conscience | 1 | independently-reviewed | Aucun |
| Courage | 1 | independently-reviewed | Aucun |
| Finesse | 1 | independently-reviewed | Aucun |
| Fortune | 1 | independently-reviewed | Aucun |
| Grâce | 1 | independently-reviewed | Aucun |
| Robustesse | 1 | independently-reviewed | Aucun |
| Soin | 1 | independently-reviewed | Aucun |
| Puissance | 1 | independently-reviewed | Aucun |
| Protection | 1 | independently-reviewed | Aucun |
| Récupération | 2 | independently-reviewed | Aucun |
| Droiture | 1 | independently-reviewed | Aucun |
| Sauvagerie | 1 | independently-reviewed | Aucun |
| Ténacité | 1 | independently-reviewed | Aucun |
| Chasse | 1 | independently-reviewed | Aucun |
| Sagesse | 1 | independently-reviewed | Aucun |
| Esprit | 1 | independently-reviewed | Aucun |

## Clauses communes

- L06:common:blessing-access : Bless donne accès aux six bénédictions associées au culte du personnage.
- L06:common:blessing-perception : La manifestation d’une bénédiction est imperceptible sans Holy Visions; elle se confond ordinairement avec la bonne fortune. Les miracles s’accompagnent au contraire de signes divins.
- L06:common:cross-invoker-stacking : Les invocations de la même prière par des personnes différentes ne donnent pas des bonus cumulatifs.
- L06:common:one-active-instance : Un personnage ne peut avoir active qu’une instance d’une même bénédiction; il attend la fin de l’instance avant de tenter à nouveau cette prière.
- L06:common:petty-concerns : Des usages multiples dans la scène, sur la même blessure, sur la même cible ou cas similaire peuvent irriter les dieux; le MJ peut attribuer typiquement 1 à 3 Sin Points.
- L06:common:pray-outcome : Réussite: l’effet de la bénédiction se manifeste; échec: paroles prononcées sans effet; Fumble: renvoi à Wrath of the Gods.
- L06:common:pray-test : Tenter une bénédiction avec un Test de Pray Challenging (+0 SL).
- L06:common:sin-and-wrath : Le dé des unités du Test Pray comparé aux Sin Points peut déclencher Wrath même après une réussite; un Fumble déclenche aussi Wrath. Ajouter +10 par Sin Point au jet Wrath, puis retirer un point (minimum 0).
- L06:common:spoken-prayer : Il faut pouvoir intoner la prière, le rite, le chant ou la formule, fermement et avec conviction.
- L06:common:stricture-sin : La violation des strictures du dieu peut faire attribuer un ou plusieurs Péchés selon la gravité, au jugement du MJ.
- L06:common:success-level-benefits : Par tranche de +2 SL choisir +6 yards de portée, +1 cible ou +6 rounds; choix répétable; une durée Instant ne peut pas être étendue.

## Clauses propres

- L06:clause:blessing:battle:ws : La cible gagne +10 en Weapon Skill. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:breath:need-breathe : La cible n’a pas besoin de respirer. Dépendances : "Événements et état respiratoires.".
- L06:clause:blessing:breath:suffocation : La cible ignore les règles de Suffocation. Dépendances : "Règles de Suffocation.".
- L06:clause:blessing:charisma:fel : La cible gagne +10 en Fellowship. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:courage:wp : La cible gagne +10 en Willpower. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:critical:critical-wound : À la prochaine Critical Wound infligée par la cible, lancer deux fois et choisir le meilleur résultat. Dépendances : "Événement critique, générateur de résultats, dés et sélection du meilleur.".
- L06:clause:blessing:disease-duration:duration : La cible peut réduire d’un jour la durée d’une maladie dont elle souffre. Dépendances : "Identité de l’instance de maladie, durée restante, règles de maladie.".
- L06:clause:blessing:finesse:dex : La cible gagne +10 en Dexterity. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:grace:ag : La cible gagne +10 en Agility. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:hardiness:t : La cible gagne +10 en Toughness. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:healing:wound : La cible guérit +1 Wound. Dépendances : "Résolution de Wounds, plafond applicable et persistance.".
- L06:clause:blessing:hunt:bs : La cible gagne +10 en Ballistic Skill. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:magical:weapon-magical : L’arme de la cible compte comme Magical. Dépendances : "Modèle équipement/arme, propriété Magical, résistances et expiration.".
- L06:clause:blessing:might:strength : La cible gagne +10 en Strength. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:one-attempt:quota : Cette prière ne peut être tentée qu’une fois par instance de maladie et par personne atteinte. Dépendances : "Identifiants et cycle de vie des maladies, historique partagé persistant, Undo.".
- L06:clause:blessing:protection:attack-gate : Un ennemi doit réussir Cool Average (+2 SL) pour attaquer la cible; en cas d’échec, il choisit une autre cible ou une autre Action. Dépendances : "Test Cool, identification des ennemis, Actions alternatives et interruption d’attaque.".
- L06:clause:blessing:remove-condition:condition : La cible peut retirer une Condition, sauf Besmirched. Dépendances : "Catalogue des Conditions, alias de Besmirched et règles de retrait.".
- L06:clause:blessing:reroll:next-failed-test : La cible peut relancer son prochain Test échoué; le résultat de la relance doit être conservé. Dépendances : "Moteur Test, garde/consommation de relance, second jet, persistance et Undo.".
- L06:clause:blessing:stricture:cool : Pour enfreindre une règle du dieu qui a lancé la bénédiction, la cible doit réussir Cool Average (+2 SL); sinon honte et action non entreprise. Dépendances : "Tests de Cool, règles propres au culte et interruption d’action.".
- L06:clause:blessing:wisdom:int : La cible gagne +10 en Intelligence. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
- L06:clause:blessing:wit:initiative : La cible gagne +10 en Initiative. Dépendances : "Moteur de Test, cible, effet et expiration à raccorder.".
