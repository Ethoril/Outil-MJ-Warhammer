# Traits optionnels des créatures et des montures : inventaire pour le cadrage

Inventaire dressé le 17/11/2026 sur `main` (3.50.0), par scripts (non versionnés, `tmp/reprise-team/traits-inventaire/`). Rien n'est recopié des livres : nom, page, paraphrase courte. Sert de base à [spec.md](spec.md) ; la colonne « calculable » est à trier par le MJ (D7).

## Partie 1 — Les 124 noms de Traits du bestiaire

Lecture : « calculé » = une fonction hors rappels lit le Trait et change un calcul ou une action. « rappel » = texte affiché sans calcul (`reminders.js` et les modules `creature-*`). « rien » = ni l'un ni l'autre. Les capacités propres de profil (`creature-abilities.js`, table T12) ne s'affichent que si le profil les liste dans `abilities` : sinon « rien ». « En partie » = calculé pour une part, le reste en rappel. Le tableau porte l'état si le Trait était dans `traits` d'un participant ; les noms seulement optionnels ne sont donc jamais calculés à l'écran aujourd'hui, puisque `optionalTraits` n'est pas copié dans `traits` (voir partie 3). Écart avec la passation : aucun (119 / 77 / 761). Des noms de variante (Stride/Sprinter, Mark of X) sont gardés séparés car les données les nomment ainsi.

- Noms distincts : 124 (base 119, optionnels 77) ; occurrences d'optionnels 761, dont 156 sur des montures.
- Les 124 noms : calculés 48 (dont 6 en partie), rappels 44, rien 32.
- Les 77 noms optionnels : calculés 37 (dont 5 en partie), rappels 26, rien 14.
- Non calculés (rappel ou rien, 76 noms), calculable : oui 7, en partie 26, non 21, à trancher par le MJ 22.

| Trait (données) | FR affiché | base | opt. | opt. monture | état | preuve | calculable |
|---|---|--:|--:|--:|---|---|---|
| Afraid | Effrayé | 28 | 2 | 0 | rappel | creature-psychology.js::psychologyReminders : texte seul | en partie : planPsychology('afraid') existe (Peur 2 de la cible), aucun bouton ne l'appelle |
| Amphibious | Amphibie | 34 | 4 | 0 | calculé | creature-movement.js::movementTestRules : +1 DR en Natation | - |
| Analgesic Saliva | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | non : effet de scène (victime endormie), rien à calculer |
| Animal Telepathy | - | 6 | 0 | 0 | rien | aucun | non : communication avec le lanceur lié, narratif |
| Animosity | Animosité | 68 | 2 | 0 | rappel | creature-psychology.js::psychologyReminders : texte seul | en partie : planPsychology gère cible, Calme et +1 DR Soc., sans branchement aux Tests |
| Anticoagulant Saliva | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | oui : l'état Hémorragique existe, reste le déclencheur « morsure réussie » |
| Aquatic | Aquatique | 4 | 0 | 0 | rappel | creature-movement.js::movementReminders : texte seul | en partie : la question « dans l'eau » existe pour Créature marine ; limites de terre non imprimées |
| Arboreal | Arboricole | 35 | 15 | 5 | calculé | creature-movement.js::movementTestRules : +BA aux DR d'Escalade et Discrétion | - |
| Armour | - | 0 | 3 | 1 | rien | aucun (le PA vient du champ armour du profil, pas du Trait) | en partie : les pièces d'armure optionnelles existent déjà (includeOptional), le Trait n'y est pas relié |
| Attach and Feed | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | MJ : une Blessure perdue par Round, attache et détache à définir |
| Attuned to Magic | - | 2 | 0 | 0 | rien | aucun | non : table des Vents propre au phénix |
| Bale Eye | - | 1 | 0 | 0 | rien | aucun | non : seconde vue et arrêt de lancement au choix de scène |
| Belligerent | Belliqueux | 43 | 17 | 5 | calculé | v5-talent-psychology.js::isPsychologyImmune : immunité à la Peur tant qu'il a l'Élan | - |
| Bestial | Bestial | 142 | 11 | 1 | rappel | creature-psychology.js::psychologyReminders : texte seul | en partie : planPsychology fixe défense par Esquive et fuite sous la moitié des PV, non branché |
| Big | - | 2 | 4 | 0 | rien | aucun | MJ : +10 F/E −5 Ag chiffrés ; savoir si le profil imprimé les inclut déjà |
| Bite | Morsure | 114 | 3 | 0 | calculé | creature-combat.js::planNaturalAttack : attaque gratuite contre l'Élan, BF+3 | - |
| Blessed | Béni | 8 | 4 | 0 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | en partie : Prière à Soc.+10 calculée par planCreatureMagic, non branchée |
| Bounce | Bond | 10 | 0 | 0 | rappel | creature-movement.js::movementReminders : texte seul | en partie : double Mouvement ; map-link-state lit déjà Foulée et Vol |
| Breath | Souffle | 17 | 3 | 1 | calculé | creature-combat.js::planNaturalAttack : souffle de zone, CT, Esquive | - |
| Brute | - | 4 | 3 | 0 | rien | aucun | MJ : −1 M −10 Ag +10 F/E chiffrés ; inclusion dans l'imprimé à confirmer |
| Burrow | Fouissage | 1 | 0 | 0 | rappel | creature-movement.js::movementReminders : texte seul | MJ : déplacement souterrain, le plateau n'a pas de sous-sol |
| Capricious | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | oui : un d10 donne un modificateur de Sociabilité, clauses modifySL existantes |
| Chameleon | Caméléon | 1 | 0 | 0 | calculé | creature-senses.js::senseTestRules : −4/−2 pour le voir, −2 au tir | - |
| Champion | Champion | 23 | 19 | 6 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | en partie : une riposte de talent sur opposition gagnée existe (resolution.js, oppositionWon) |
| Chill Grasp | Étreinte glaciale | 3 | 2 | 0 | calculé | creature-combat.js::planNaturalAttack : CC opposée, 1d10+DR direct | - |
| Clever | - | 11 | 7 | 3 | rien | aucun | MJ : +20 Int +10 Init. chiffrés ; inclusion dans l'imprimé à confirmer |
| Cold-blooded | À Sang-froid | 64 | 1 | 0 | calculé (en partie) | v5-talent-psychology.js::cold-blooded : Avantage aux Tests de Calme (reste en rappel) | - |
| Companion Trait | - | 6 | 0 | 0 | rien | aucun (familiars.js::companionTalents lit l'espèce de la fiche, pas ce Trait) | en partie : la mécanique de compagnon existe côté familiers |
| Constrictor | Constricteur | 10 | 3 | 0 | calculé | creature-combat.js::planNaturalAttack : toute touche donne Enchevêtré | - |
| Construct | Artificiel | 33 | 0 | 0 | calculé | creature-natures.js::attacksAreMagical : attaques magiques, Endurance pour Volonté | - |
| Corrosive Blood | Sang corrosif | 4 | 8 | 2 | rappel | creature-states.js::stateReminders : texte seul | oui : planStateOnWound('corrosive') existe (d10 partagé), non branché |
| Corruption | Corruption | 54 | 18 | 1 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | non : exposition à la corruption jouée par le MJ |
| Coven Sorcerer | - | 1 | 0 | 0 | rien | aucun | non : gabarit de sorcière et listes de magie |
| Creature Weapons | - | 17 | 3 | 0 | rien | aucun (déclaré couvert T2, mais aucun analyseur ne le reconnaît) | oui : les attaques imprimées sont déjà des actions ordinaires |
| Creeping | - | 2 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | MJ : interdire l'action Courir, le moteur ne le sait pas |
| Cunning | - | 8 | 2 | 0 | rien | aucun | MJ : +10 Soc./Int./Init. chiffrés ; inclusion dans l'imprimé à confirmer |
| Daemonic | Démoniaque | 15 | 0 | 0 | calculé | creature-natures.js::natureProtection : d10 au seuil, attaques magiques | - |
| Dark Vision | Infravision | 78 | 7 | 2 | calculé | map-link-state.js::visionDimOf : vision de 20 cases sur la carte | - |
| Die Hard | Increvable | 37 | 8 | 0 | rappel | creature-states.js::stateReminders : texte seul | en partie : planDieHard existe (Endurance étendue), non branché |
| Disease | Maladie | 21 | 15 | 1 | rappel | creature-states.js::stateReminders : texte seul | MJ : atteinte propre décidée par le MJ |
| Disruption | - | 1 | 0 | 0 | rien | aucun (déclaré couvert T3, planUnstableEndOfRound non branché) | MJ : Avantage traité comme diminué de deux, sans support dans le moteur |
| Distracting | Perturbant | 27 | 11 | 0 | calculé | creature-senses.js::senseTestRules : −2 DR aux vivants à portée | - |
| Easily Confused | - | 1 | 0 | 0 | rien | aucun (capacité absente de abilities du profil) | en partie : Int. +40 sinon Sonné, Test et état existent ; déclencheur au MJ |
| Elite | - | 5 | 3 | 3 | rien | aucun | MJ : +20 CC/CT/Volonté chiffrés ; inclusion dans l'imprimé à confirmer |
| Engulf | - | 3 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities (2 profils sur 3) | non : engloutissement (entrave, BF direct, une victime), règle propre |
| Ethereal | Éthéré | 17 | 0 | 0 | calculé | creature-natures.js::natureProtection : seules les attaques magiques blessent | - |
| Fast | - | 9 | 4 | 0 | rien | aucun | MJ : +1 M +10 Ag chiffrés ; inclusion dans l'imprimé à confirmer |
| Fear | Peur | 99 | 5 | 0 | calculé | store.js::psychologyTraits : bouton Peur, états par cible | - |
| Fearless | - | 6 | 1 | 0 | rien | aucun (seul le talent Sans peur est lu : v5-talent-psychology.js) | MJ : le profil ne donne aucun groupe de spécialisation |
| Flammable | - | 4 | 0 | 0 | rien | aucun | en partie : l'état Enflammé existe ; −20 au Test et Blessures doublées demandent un point d'accroche |
| Fly | Vol | 67 | 6 | 0 | calculé | creature-movement.js::movementTestRules : −2 DR au tir en vol, vol sur la carte | - |
| Formless Horror | - | 2 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities (1 sur 2) | non : copie d'une autre créature, trop ouvert |
| Freezing Aura | - | 1 | 0 | 0 | rien | aucun | MJ : Test d'exposition au froid chaque Tour, pas de règle d'exposition dans le moteur |
| Frenzy | Frénésie | 49 | 33 | 6 | rappel | creature-psychology.js::psychologyReminders : texte seul (l'état Frénésie, lui, donne +1 dégât) | en partie : planPsychology fixe Volonté, immunité, +1 dégât ; entrée en Frénésie à la main |
| Fury | Rage | 26 | 6 | 0 | rappel | creature-psychology.js::psychologyReminders : texte seul | MJ : repose sur le gain d'Élan, plan existant non branché |
| Ghostly Howl | Hurlement fantomatique | 1 | 0 | 0 | calculé | creature-combat.js::planNaturalAttack : coût d'Élan, zone, Calme | - |
| Grim | Féroce | 62 | 12 | 3 | calculé | v5-store-action.js::psychologyTraits : gain d'Élan en fin de Tour | - |
| Hallucinogen | - | 0 | 1 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | en partie : Volonté Facile puis Sonné ; zone et sens du vent au MJ |
| Hardy | - | 31 | 11 | 5 | rien | aucun (creatureWounds accepte hardy mais le lit du talent) | en partie : le calcul des Blessures a déjà un paramètre hardy |
| Hatred | Haine | 64 | 7 | 1 | calculé (en partie) | v5-talent-psychology.js::traitTargetMatches : immunité à la Peur de la cible (reste en rappel) | - |
| Horns | Cornes | 29 | 6 | 3 | calculé | creature-combat.js::planNaturalAttack : attaque gratuite en charge, BF+4 | - |
| Hungry | Affamé | 38 | 26 | 1 | rappel | creature-psychology.js::psychologyReminders : texte seul | en partie : Calme +2 DR calculé par planPsychology si le déclencheur est saisi |
| Immune to Psychology | Immunité Psychologique | 37 | 5 | 2 | calculé | v5-talent-psychology.js::isPsychologyImmune : ignore la Psychologie | - |
| Immunity | Immunité | 16 | 2 | 0 | calculé | creature-natures.js::natureProtection : types de dégâts filtrables, autres en rappel | - |
| Infected | Infecté | 113 | 40 | 3 | rappel | creature-states.js::stateReminders : texte seul | oui : planStateOnWound('infected') existe (Endurance +4, Plaie Purulente), non branché |
| Infestation | Parasité | 2 | 19 | 1 | rappel | creature-states.js::stateReminders : texte seul | oui : planStateOnWound('infestation') existe (−1 DR pour toucher), non branché |
| Leader | - | 4 | 0 | 0 | rien | aucun | MJ : +10 Soc./Volonté chiffrés ; inclusion dans l'imprimé à confirmer |
| Magic Resistance | Résistance à la Magie | 11 | 4 | 0 | calculé | creature-magic-traits.js::magicResistanceReduction : −3 DR aux sorts subis | - |
| Magical | Magique | 21 | 13 | 2 | calculé (en partie) | creature-natures.js::attacksAreMagical : attaques magiques (reste en rappel) | - |
| Many Heads | Plusieurs têtes | 2 | 0 | 0 | calculé | creature-heads.js::planManyHeads : registre des têtes, attaques gratuites | - |
| Marine Creature | Créature marine | 14 | 0 | 0 | calculé | creature-movement.js::movementTestRules : −2 DR hors de l'eau | - |
| Mark of Chaos | Marque du Chaos | 2 | 3 | 0 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | non : effets propres à chaque dieu, ne pas fusionner |
| Mark of Khorne | Marque de Khorne | 1 | 0 | 0 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | non : talent, Étiquette et rivalités propres au dieu |
| Mark of Slaanesh | Marque de Slaanesh | 1 | 0 | 0 | calculé (en partie) | v5-talent-psychology.js::isPsychologyImmune : sans peur de tout (reste en rappel) | - |
| Mental Corruption | Corruption mentale | 6 | 8 | 0 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | non : table tirée par le MJ |
| Messenger | - | 0 | 6 | 0 | rien | aucun | non : livraison de message, narratif |
| Miracles | Miracles | 7 | 1 | 0 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | en partie : Prière à Soc.+10 calculée par planCreatureMagic, non branchée |
| Mutation | Mutation | 17 | 26 | 4 | rappel | creature-magic-traits.js::creatureMagicReminders : texte seul | non : table tirée par le MJ |
| Naiad War-Form | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | MJ : aspect différent chaque Round, au choix |
| Night Vision | Vision nocturne | 325 | 2 | 0 | calculé | map-link-state.js::visionDimOf : vision de 10 cases sur la carte | - |
| Painless | Insensible à la douleur | 62 | 25 | 3 | rappel | creature-natures.js::natureReminders : texte seul | MJ : ignorer les pénalités des critiques, hors amputations |
| Petrifying Gaze | Regard pétrifiant | 1 | 2 | 0 | calculé | creature-combat.js::planNaturalAttack : CT opposée à l'Initiative | - |
| Phoenix Reborn | - | 1 | 0 | 0 | rien | aucun | non : lancement spécial à la mort |
| Prejudice | Préjugé | 109 | 0 | 0 | rappel | creature-psychology.js::psychologyReminders : texte seul | non : aversion sans effet de règle propre |
| Prey of the Dark Prince | - | 1 | 0 | 0 | rien | aucun | en partie : perd Protection 8+ si engagé par un marqué ; natureProtection et engagements existent |
| Random Caster | - | 1 | 0 | 0 | rien | aucun | non : tirage de tradition et de sort à chaque attaque |
| Ranged | - | 0 | 3 | 0 | rien | aucun | oui : c'est une attaque à distance, déjà portée par les attaques optionnelles (includeOptional) |
| Rear | - | 5 | 3 | 3 | rien | aucun | en partie : le Piétinement existe (planNaturalAttack, clé stomp), à relier au Mouvement |
| Regeneration | Régénération | 34 | 10 | 0 | calculé | creature-regeneration.js::planRegeneration : bouton de la fiche, d10 de soin | - |
| Shapeshifter | - | 1 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | non : changement de forme libre, pleine lune |
| Shield | Bouclier | 7 | 0 | 0 | rappel | creature-natures.js::natureReminders : texte seul | en partie : l'option Bouclier existe côté équipement |
| Size | Taille | 343 | 53 | 11 | calculé | creature-size.js::creatureSizeOf : surnombre, allonge, écarts de Taille | - |
| Skittish | Craintif | 55 | 3 | 0 | calculé | v5-mounted-combat.js::planMountedFall : +4 au Test de chute d'un cavalier | - |
| Spell Syphon | - | 1 | 0 | 0 | rien | aucun | non : jet opposé puis siphon, miroir ou explosion |
| Spellcaster | Lanceur de sorts | 46 | 14 | 1 | calculé | creature-magic-traits.js::creatureCastingBases : Focalisation et Langue magique de départ | - |
| Split | Scission | 1 | 0 | 0 | rappel | creature-states.js::stateReminders : texte seul | en partie : planSplit existe ; création de deux Horreurs bleues à relier |
| Sprinter | Foulée | 2 | 0 | 0 | calculé | map-link-state.js::planMovement : course ×1,5 sur la carte | - |
| Stationary Attacker | - | 5 | 0 | 0 | rien | aucun (capacité absente de abilities ; contrat C0-L07-004 non relié au Trait) | en partie : immunité à la Psychologie existe, pas l'interdiction de bouger |
| Stealthy | Furtif | 40 | 22 | 6 | calculé | creature-senses.js::senseTestRules : Discrétion rurale à Ag+10 | - |
| Stride | Foulée | 69 | 1 | 0 | calculé | map-link-state.js::planMovement : course ×1,5 sur la carte | - |
| Striding Gait | Foulée adaptée | 14 | 5 | 1 | rappel | creature-movement.js::movementReminders : texte seul | MJ : suppose un terrain nommé, absent du moteur |
| Stupid | Stupide | 19 | 5 | 4 | rappel | creature-psychology.js::psychologyReminders : texte seul | en partie : Int. +4 DR en début de Round calculé par planPsychology, non branché |
| Swamp-strider | Limicole | 22 | 9 | 3 | rappel | creature-movement.js::movementReminders : texte seul | MJ : suppose un terrain marécageux, absent du moteur |
| Swarm | Nuée | 6 | 16 | 1 | calculé | store.js::planSwarm : perte de Blessure des engagés en fin de Round, immunité Psychologie | - |
| Tail | Attaque caudale | 37 | 3 | 2 | calculé | creature-combat.js::planNaturalAttack : attaque gratuite BF+2, cible à terre | - |
| Telepathy | - | 2 | 0 | 0 | rien | aucun | non : lecture de pensées, narratif |
| Tentacles | Tentacules | 4 | 3 | 0 | calculé | creature-combat.js::planNaturalAttack : une attaque gratuite par tentacule | - |
| Territorial | Territorial | 25 | 43 | 8 | rappel | creature-psychology.js::psychologyReminders : texte seul | non : comportement de scène |
| Terror | Terreur | 38 | 1 | 0 | calculé | store.js::psychologyTraits : bouton Terreur, états par cible | - |
| Tongue | Langue préhensile | 0 | 1 | 1 | calculé | creature-combat.js::planNaturalAttack : tir gratuit, entrave, attire | - |
| Tough | - | 11 | 5 | 3 | rien | aucun | MJ : +10 E/Volonté chiffrés ; inclusion dans l'imprimé à confirmer |
| Tracker | Pisteur | 42 | 15 | 4 | calculé | creature-senses.js::senseTestRules : Pistage à Int.+10 | - |
| Trained | Dressé | 44 | 66 | 40 | calculé (en partie) | mounts.js::isMountCandidate : repère la monture ; compétences en rappel | en partie : planCreatureMagic décrit les effets (Guerre +10 CC, ignore Craintif) sans les appliquer |
| Tzeentch’s Fire | - | 2 | 0 | 0 | rappel | creature-abilities.js::creatureAbilityReminders : si le profil la liste dans abilities | non : sort partagé entre Horreurs, +DR par voisine |
| Undead | Mort-vivant | 58 | 1 | 0 | calculé (en partie) | creature-keywords.js::TRAIT_KEYWORDS : vaut le mot-clé mort-vivant (filtres, sorts) | - |
| Unstable | Instable | 69 | 2 | 0 | rappel | creature-states.js::stateReminders : texte seul | en partie : planUnstableEndOfRound existe (deux Blessures), non branché |
| Vampiric | Vampirique | 7 | 0 | 0 | rappel | creature-states.js::stateReminders : texte seul | en partie : planVampiricHeal existe ; proie admissible au MJ |
| Venom | Venin | 28 | 14 | 3 | calculé | store.js::planStateOnWound : blesser donne Empoisonné | - |
| Vomit | Vomissement | 10 | 0 | 0 | calculé | creature-combat.js::planNaturalAttack : CT +4 DR, dégâts BE+4 | - |
| Vulnerable to Cold | - | 1 | 0 | 0 | rien | aucun | MJ : −4 DR en Endurance contre le froid, sans règle d'exposition |
| Wake of Fire | - | 1 | 0 | 0 | rien | aucun | en partie : l'état Enflammé existe ; traînée de braises au MJ |
| Wallcrawler | Grimpant | 18 | 5 | 0 | rappel | creature-movement.js::movementReminders : texte seul | MJ : murs et plafonds, absents du plateau |
| Ward | Protection | 27 | 6 | 0 | calculé | creature-natures.js::natureProtection : d10 au seuil annule le coup | - |
| Web | Toile | 4 | 0 | 0 | calculé | creature-combat.js::planNaturalAttack : touche donne Enchevêtré de Force indiquée | - |

## Partie 2 — L13 (Up in Arms) et L23 (Enemy in Shadows Companion)

### Où et de quelle nature

| Livre, page, section | Nature |
|---|---|
| L13 p.29, chapitre III « Knights of the Empire », encart Chevaux | Fiche du Destrier (Heavy Warhorse) avec une ligne « Optional » de six Traits : liste fixe de Traits du bestiaire général, sans coût, sans tirage, sans condition. Le Cheval de selle de la même page n'en a pas. |
| L13 pp.106-107, chapitre IX « Mounted Combat », section Training | Règle de dressage : une monture reçoit des Traits Trained (War), Trained (Magic) et le nouveau Trained (Shock Cavalry) par l'Endeavour Dressage d'animaux. Un Test de Dressage d'animaux de difficulté Challenging (+0) révèle les dressages. Condition : Shock Cavalry exige déjà Trained (War). Aucun coût chiffré. |
| L13 pp.108-109, section Exotic Mounts | Le Demigryph adulte dressé porte Mount, War, Magic et Shock Cavalry ; la fiche « monture » (p.109) n'a pas de ligne Optional. Condition de lien : seul celui qui l'a dompté peut le monter. |
| L23 pp.22-24, chapitre 4 « Mounts and Vehicles », Draught Animals and Mounts | Trois fiches avec ligne « Optional » : Heavy Draught Horse (Trained (Mount)), Light et Heavy Warhorse (mêmes six Traits que L13). Deux Traits cités dans le texte seulement : Stubborn (ânes, mules, p.22) et Fast (pur-sang estaliens et arabes, p.23). Une phrase (p.24) dit que les bêtes chères et très dressées ont des Traits en plus. |

Aucun des deux livres ne tire de Traits au hasard, ne donne de coût par Trait, ni de règle générale « une monture peut recevoir n'importe quel Trait optionnel du bestiaire » : ce sont des listes par fiche (L13 p.29, L23 pp.23-24), plus des règles de dressage (L13). Les six Traits sont définis hors de ces livres (L06 p.357 pour Champion, L11 pp.135-137 pour les autres, selon `docs/BESTIAIRE_INVENTAIRE.md`).

### Traits cités : L13 six Traits optionnels de fiche et trois dressages ; L23 sept Traits optionnels de fiche et deux Traits du texte

| Trait | Livre, page | Paraphrase | Dans les données | Calculé | Calculable |
|---|---|---|---|---|---|
| Champion | L13 p.29 ; L23 p.24 | Le défenseur qui gagne l'opposition de mêlée blesse comme un attaquant. | oui, optionnel de E0-P-457, 765, 766 | rappel | en partie : riposte de talent existante (`resolution.js`) |
| Clever | L13 p.29 ; L23 p.24 | Bonus d'Intelligence et d'Initiative. | oui, optionnel des mêmes | rien | MJ : modificateurs de caractéristiques, inclusion dans l'imprimé à confirmer |
| Elite | L13 p.29 ; L23 p.24 | Gros bonus de CC, CT et Volonté. | oui, idem | rien | MJ : idem |
| Hardy | L13 p.29 ; L23 p.24 | Blessures en plus, selon l'Endurance. | oui, idem | rien | en partie : `creatureWounds` a un paramètre hardy |
| Rear | L13 p.29 ; L23 p.24 | La bête se cabre et piétine un plus petit au lieu de se déplacer. | oui, idem | rien | en partie : Piétinement existant (`planNaturalAttack`, clé stomp) |
| Tough | L13 p.29 ; L23 p.24 | Bonus d'Endurance et de Volonté. | oui, idem | rien | MJ : modificateurs de caractéristiques |
| Trained (Mount) | L23 p.23 (optionnel du Heavy Draught Horse) | Rend la bête montable. | oui, optionnel de E0-P-763 | calculé en partie : `isMountCandidate` | oui |
| Trained (War) | L13 pp.106-107 | +10 CC, ignore Craintif face aux bruits forts. | oui, dans le paramètre de Trained de la plupart des chevaux | rappel (`planCreatureMagic` décrit l'effet, non branché) | en partie : bonus chiffré, exception Craintif à brancher |
| Trained (Magic) | L13 p.107 | Ignore Craintif face à la magie. | non pour le Demigryph (E0-P-459 n'a pas Magic) ; oui ailleurs | rappel | en partie : idem |
| Trained (Shock Cavalry) | L13 p.107 | En charge, traverse les plus petits (Esquive ou 4+BF dégâts), perd 2 m de Mouvement par créature. | oui, dans E0-P-459 | rien (mot inconnu de `TRAINED_SKILLS`) | MJ : charge et engagements existent, la traversée d'un groupe est de la géométrie |
| Stubborn | L23 p.22 | Volonté +20 et jets opposés pour mener la bête ; refus possible. | non (absent des 124 noms) | rien | MJ : +20 chiffré, jets de conduite opposés à définir |
| Fast | L23 p.23 | Pur-sang estaliens et arabes : plus rapides. | oui comme Trait (9 base, 4 optionnels, aucun sur une monture) | rien | MJ : +1 Mouvement +10 Agilité, inclusion à confirmer |

### Profils de montures de L13 et L23 dans le bestiaire

Les six Traits optionnels de L13 p.29 et de L23 p.24 sont déjà dans `optionalTraits` des trois profils concernés, Trained (Mount) aussi pour E0-P-763 : rien ne manque pour les listes « Optional ». Manquent : Stubborn (aucun profil ne le porte, ni l'âne ni la mule E0-P-759) ; Trained (Magic) du Demigryph adulte (E0-P-459) ; Fast des pur-sang (pas de profil). Défaut de données : le Heavy Draught Horse E0-P-763 a `Trained` sans liste, le livre imprime « Trained, (Broken, Drive) » avec une virgule parasite.

### Autres livres (recherche bornée, repérage seulement)

Même genre « ligne Optional avec Trained sur une monture » : L01 Archives of the Empire 2 p.34 (Rhinox : Trained (Broken, Mount, War), Tracker) ; L07 Lustria p.174 (Cold One : Trained (Broken, Guard, Mount, War) et cinq autres), p.176 (Ripperdactyl, Terradon : Trained (Mount, War)) ; L09 Temple of Spite p.46 (Cold One naggarothi : Trained (Broken, Mount, War), et Stupide remplaçant Bestial une fois dressé). Sans être des montures : L11 p.25 Rhinox (Trained (Drive)), L04 pp.133-134 chiens et faucons (listes de dressages), L26 p.118 Carrion (Trained (War), trop petit pour porter un humain). Ces cinq profils de montures sont déjà dans `montures-fiches.js`. Pas d'autre section du même genre repérée dans les 31 PDF (recherche de « Optional » avec Trained, Champion, Clever, Elite, Hardy, Rear, Tough, Fast, Brute) ; la lecture de chaque page n'a pas été faite.

## Partie 3 — Faits utiles au cadrage

**`includeOptional` (attaques et armures optionnelles).**
- Où : paramètre de `buildParticipantFromBestiary` (`js/core/bestiary-profiles.js:235`, défaut false), relayé par `buildReserveProfileFromBestiary`. Il filtre les attaques marquées `optional` (l.277) et les pièces d'armure marquées `optional` (`printedArmour`, l.163).
- Écran : aucun. Aucun appelant de l'interface ne le passe (`bestiary-library.js`, `reserve.js`, `main.js`, `v5-spell-contracts.js`). Seuls l'emploient deux tests (`import-profils.test.js:463` et `:525`) et `tools/list-v5-natural-gaps.mjs`. La fiche de la bibliothèque affiche seulement « Traits facultatifs » en texte (`bestiary-library.js:54`).
- Stockage : aucun. Le participant n'a ni drapeau ni liste de ce qui a été inclus ; les attaques deviennent des `actions`, l'armure des zones `armor`.
- Moment : à la construction du participant ou du profil de réserve. Par défaut les optionnels sont écartés sans trace. Volume : 11 attaques optionnelles (11 profils), 80 pièces d'armure optionnelles (36 profils), contre 200 profils avec Traits optionnels dont 45 montures.

**Profil de monture.**
- `buildReserveProfileFromBestiary(id)` passe par `buildParticipantFromBestiary` : `traits` imprimés en textes « Nom (param) », `extensions.v5.bestiary.optionalTraits` en textes, rien d'optionnel dans `traits`.
- `buildMountProfile(riderProfileId, { template, bestiaryId, name })` (`js/core/mounts.js:26`) fait un profil `monture-<profil>` : il étale `template` (donc `traits` et `extensions` tels quels, `optionalTraits` en texte inclus), fixe l'id et le nom, ajoute `extensions.mountFor`. Il ne lit ni ne transforme `optionalTraits`.
- Seul lecteur d'`optionalTraits` côté monture : `isMountCandidate` (`mounts.js:37`), qui cherche Trained avec Mount, dans `traits` ou `optionalTraits` du profil de bibliothèque ; il décide seulement si la créature est proposée comme monture.
- Monté, le moteur lit la Taille, la BF et Craintif (`v5-mounted-combat.js`, `planMountedFall`), rien d'autre des Traits.

**Ce que la fiche d'un PJ déclare.**
- Champ `monture: { espece, nom }` ; `espece` est une clé de `MONTURES_FICHES` (68 montures, `cle` = identifiant du profil, p. ex. E0-P-766) ; `nom` facultatif. Aucun champ de Traits.
- Entrée : `ficheMount` (`js/core/fiche-sync.js:46-57`) : champ absent = rien ne change ; `null` = retrait ; forme illisible ou clé inconnue = avertissement, monture du profil conservée.
- Puis `main.js` (callback `mountProfile`) construit le profil type via `buildReserveProfileFromBestiary(row.id, …)`, et `fiche-sync.js:722` appelle `buildMountProfile`. Le profil `monture-<profil>` entre en Réserve et se lie au PJ par `declaredMount` / `linkDeclaredMounts`. Un profil déjà présent n'est pas reconstruit : seul son nom suit la fiche.

**Précédent `previewBeastForm` (`js/ui/v5-spell-options.js`).**
- Le contrat de sort ouvre une case à cocher par Trait optionnel du profil de la bête (`traitChoices`, l.397-420) ; liste via `optionalTransformationTraits` (`v5-magic-arbitrations.js:52`), qui exclut Taille (Énorme) et Nuée pour la Forme bestiale.
- Contrainte : coût de 2 DR de surpuissance par Trait (4 pour Kadon), nombre limité par les DR disponibles ; une seule Taille à la fois (`traitSize`). Validation : `transformationTraitsError`.
- Stockage : liste de noms dans le brouillon (`draft.magicBeastTraits`), remise à zéro au changement d'animal. Application : `previewBeastForm` ajoute les noms choisis à `traits` de la forme (`formTraits`, `traits`) ; la Taille choisie remplace celle du profil et recalcule les Blessures. Les Traits choisis sont donc lus ensuite par les modules `creature-*` comme des Traits ordinaires.

## Ce que je n'ai pas pu établir

- « Calculé » s'appuie sur les appelants repérés par recherche de texte, pas sur l'exécution : un Trait lu seulement par un chemin que je n'ai pas trouvé serait classé trop bas. Les 22 « à trancher par le MJ » sont des cas où la règle ou le moteur ne permettent pas de conclure.
- Pour les modificateurs de caractéristiques (Big, Brute, Clever, Cunning, Elite, Fast, Leader, Tough) : le profil imprimé inclut-il déjà l'effet quand le Trait est en `traits` ? Non vérifié contre les livres.
- Les définitions des Traits viennent de `docs/BESTIAIRE_INVENTAIRE.md` (paraphrases du dépôt), pas d'une relecture des PDF de L06 et L11.
- Fast et Stubborn : seule la mention dans le texte de L23 est établie ; je n'ai pas cherché s'ils figurent dans d'autres profils de chevaux ou de bêtes de somme.
- Recherche dans les autres PDF limitée à un motif (ligne « Optional » avec les Traits ci-dessus, et mots-clés de montures) ; des sections formulées autrement ont pu m'échapper. Les pages de L13 et L23 sont les numéros imprimés, déduits des pieds de page du texte extrait.
