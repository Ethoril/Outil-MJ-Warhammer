# Lustria : monuments et sanctuaires de colonie (notes de règles)

Source : Lustria EN (WFRP 4e, SHA-256 975555bd937144d8e99236be2b38aa8b96bf06ac4072523c30c187e6504a0554), pages imprimées = physiques 210, 212 et 216. Texte reformulé, valeurs relues au PDF le 2026-10-18. Aucun code : notes pour une intégration ultérieure.

## Mécanique

**Contexte (p.210).** Ces règles remplacent les Événements et Endeavours de downtime du livre de base uniquement quand les personnages passent leur downtime dans une colonie du Nouveau Monde (Skeggi, Citadelle du Crépuscule, camp de base créé par eux), sauf avis contraire du MJ.

**Monument (p.212).** Structure de colonie qui exige 150 Bois et un Approvisionnement en nourriture (un Monument consomme une Ferme, comme Ports, Venues et Capitols, p.210). À la construction, on choisit une Bénédiction parmi celles du livre de base (le texte renvoie à la p.221 de WFRP).

Un personnage qui passe une période de downtime dans une colonie dotée d'un Monument peut, pendant toute l'aventure suivante :
- faire des Tests de Prière pour activer la Bénédiction du Monument ;
- utiliser Prière comme compétence de base ;
- activer cette Bénédiction même sans le talent Bénédiction et même si sa Lore divine exclut cette Bénédiction ;
- s'il connaît déjà la Bénédiction, obtenir +20 à ces Tests de Prière.

**Endeavour « Attuning With the Ancients » (p.216).** Réservée aux colonies ayant un Monument. Après une semaine de pèlerinage, le personnage choisit un Monument de la colonie : pendant l'aventure suivante, il peut inverser les chiffres de tout jet de Prière fait pour activer la Bénédiction de ce Monument (dizaines et unités).

Rappel (p.216) : le downtime en Lustria reste soumis à « With Great Power... » et « Elf Improvement », qui réduisent le nombre d'Endeavours.

## Monuments existants (p.210)

| Colonie | Monument | Bénédiction |
|---|---|---|
| Skeggi | Godspile | Puissance (Might) |
| Citadelle du Crépuscule | Nexus géomantique | Protection |
| Port Reaver | Sanctuaire de Manann | Ténacité (Tenacity) |
| Swamp Town | Sanctuaire de Ranald | Fortune |

Aucun monument ni sanctuaire de Mathlann n'existe dans Lustria (Mathlann n'apparaît que p.80, 81 et 91). Pas de sanctuaire d'Ulric non plus dans ces pages.

## Ce qui est automatisable plus tard

- **Données statiques** : la table colonie / Monument / Bénédiction et la structure « Monument » (coût 150 Bois, Ferme requise).
- **État de campagne** : « personnage ayant passé son downtime dans une colonie avec Monument », portée « durée de l'aventure suivante » et monument choisi. Ce n'est pas un état de combat : il faut un drapeau de fiche ou de campagne posé par le MJ au moment du downtime.
- **Accès à la Bénédiction** : Prière traitée comme compétence de base, Bénédiction activable hors talent et hors Lore. Dépend de la couche d'accès (`v5-divine-access.js`) : à vérifier si elle admet une source d'accès temporaire par lieu.
- **+20 conditionnel** : bonus si le personnage connaît déjà la Bénédiction, calculable une fois l'accès modélisé.
- **Attuning** : inversion des chiffres du d100 de Prière. Faisable en assisté (le moteur calcule la valeur inversée, le joueur choisit laquelle garder) ; réversion à confirmer : le texte dit « reverse », sans préciser si c'est au choix du joueur après coup (lecture retenue : au choix).

## Ce qui reste manuel ou hors moteur

- Construction, Bois, Fermes, Ports, Venues, Capitols, importations et exportations (p.210-212, 216) : gestion de colonie, pas de lien avec le moteur divin.
- Choix de la Bénédiction du Monument d'une colonie créée par les joueurs : décision MJ.
- Statut du personnage vis-à-vis de la Lore divine (exclusions de Bénédiction) : à lire sur la fiche, non automatisé tel quel.

## Ambiguïtés relevées

- La Bénédiction du Monument « choisie parmi la p.221 de WFRP » : liste des Bénédictions du livre de base, à rapprocher du catalogue existant (la numérotation de page du livre de base V5 EN v2 peut différer).
- L'inversion de Attuning ne précise pas si elle s'applique aux Tests d'autres personnages ni si elle est optionnelle (lecture retenue : le personnage seulement, optionnelle).
- Le texte ne dit pas quel Monument sert si plusieurs existent dans la colonie hors Endeavour : l'avantage joue pour « la Bénédiction du Monument » ; en cas de plusieurs Monuments, toutes leurs Bénédictions sont vraisemblablement activables, lecture à confirmer par le MJ.
