# Choix de l'exécutant — phase D (traditions de magie)

À relire par le MJ en sélecteurs groupés. Format : id, source, question, choix, raison, alternative. Un choix n'est jamais une règle pliée pour un test.

## Socle

- **D-C01** — circuit des sorts. Question : les traditions n'existent pas dans la feuille Magie (miroir public de 277 lignes, non modifiable d'ici). Choix : registre propre `tools/v5-tradition-spell-contracts.mjs`, mêmes contrats générés dans `js/data/v5-spell-contracts.json`, drapeau `isTradition`. Raison : aucune ligne d'audit possible, pas de modification du catalogue public. Alternative : fausses lignes d'audit (écartée : empreinte de feuille inventée).
- **D-C02** — pins « 277 ». Les tests qui comptent exactement 277 contrats sont restreints aux contrats d'audit (`!isTradition`), listés dans le commit D2.
- **D-C03** — surpuissance des sorts de NI 0. Choix : autorisée (ce sont des sorts de Domaine, pas des Sorts Mineurs), comme les autres sorts de Domaine. Alternative : interdite comme le Petit (écartée : le livre ne le dit pas).
- **D-C04** — clés de Test par caractéristique (`carac:soc`) ajoutées à `magicSkillModifiers` pour « tous les Tests de Sociabilité » (Bonne Volonté). Raison : les modificateurs magiques étaient indexés par nom de compétence seulement.

## Magie naturelle (D2, D3)

- **D-C10** — Halãtha's Joy, fin « quand utilisé » (L06 p.255). Choix : le sort s'achève à la première occasion de conception constatée par le MJ ; rappel narratif. Alternative : fin à la tentative ou à la naissance.
- **D-C11** — Mirkride (L06 p.256 contre L02 p.63). Choix : version V5 (aucune action sur le monde matériel) ; la variante V4 qui permet de lancer des sorts est écartée (arbitrage « version V5 »). Fin sur dégât magique : rappel (aucun événement de dégât magique n'est émis).
- **D-C12** — Nepenthe / Panacée : aucun suivi de maladies (le moteur n'en a pas) ; la maladie guérie est choisie par le lanceur, rappel. Panacée soigne le Bonus de **Dextérité du lanceur** (formule `BDex`, ajoutée).
- **D-C13** — Shepherd's Eye : cible protégée ou hors du monde : le MJ décide (rappel).
- **D-C14** — Dague de l'Art. Écart avec Gemini : les Traits visés sont **Éthéré et Corruption (tout degré)**, pas la liste élargie (Mutation, Marque du Chaos, Démoniaque), absente de la source L02 p.62 (« Ethereal or Corrupted »). Deux attaques sont créées (BF+2 et BF+8) au lieu d'une substitution automatique de dégâts (le moteur ne sait pas conditionner les dégâts d'une arme au Trait de la cible). Maintien : Focalisation +0 DR, saisi par le MJ.
- **D-C15** — Borne sinistre, test d'Intuition. Gemini lisait la source à l'envers (« réussite = prise de conscience »). Choix : **lecture littérale** (échec = prise de conscience), en rappel ; le texte imprimé est étrange mais c'est lui. Alternative : inversion proposée par Gemini. Portée et cible « Spécial » (au lieu de « Voir texte », qui n'est pas une valeur lisible par le moteur) ; type de créature = fait choisi par le lanceur (un par apprentissage) ; durée « 1 mois » en saisie MJ.
- **D-C16** — Philtre d'amour : aucune aide chiffrée (le +2 DR « optionnel » de Gemini n'est pas dans la source) ; durée jusqu'à minuit via minutes avant minuit (saisie).
- **D-C17** — Sachet de protection : « +1 SL Calme contre les effets surnaturels » lu comme +1 DR Calme contre tout effet surnaturel (Peur et Terreur incluses), en reçu ; durée « 1 semaine + 1 par DR » en saisie MJ.
- **D-C18** — Pas imperceptible : « Magical Sight » (inexistant) lu comme Seconde vue **et** Sens de la magie ; +2 DR Discrétion contre Démoniaque/Éthéré en reçu (non appliqué en bloc, il dépend de l'observateur) ; Focalisation interdite par un nouvel état `cannotChannel`.
- **D-C19** — L'Expulsion : Test de Volonté fixe +0 DR (non opposé), Blessures directes BFM ; cible non Éthérée/Démoniaque : exemptée par le moteur (comportement standard des clauses de ciblage) ; bannissement de 1d10 ans en rappel.
- **D-C20** — Protection contre le wyrd : liste = Sorcellerie, Nécromancie, Démonologie, Chaos (source) ; l'ajout de Gemini « tout sort de Focalisation (Dhar) » est écarté. Malus rappelé, non appliqué en bloc.
- **D-C21** — noms français : propositions de Gemini retenues (Dague de l'Art, Borne sinistre, Revigorer, Philtre d'amour, Sachet de protection, Pas imperceptible, Marée d'argent, L'Expulsion, Protection contre le wyrd) ; « Joie de Halãtha » et « Œil du berger » conservés.
- **D-C22** — Revigorer : les états Exténué restent comptés, leur pénalité est ignorée ; la lecture de Gemini (retirer un état) est son alternative. L'effet agit aussi sur Clarté d'Esprit (même drapeau, qui l'annonçait déjà sans le lire).

## Démonologie (D5)

- **D-C30** — Destruction de Démon Mineur (L06 p.258). Le +10 à une caractéristique du lanceur n'est pas appliqué par le moteur (les effets de caractéristique visent la cible, ici détruite) : caractéristique choisie en fait, rappel de report sur la fiche. Alternative : effet sur le lanceur (nécessite un nouveau mécanisme).
- **D-C31** — « Taille Moyenne ou inférieure » : lue comme Petite ou Moyenne (`allowedSizes`), taille déduite des Traits comme pour Maître des bêtes ; le MJ vérifie. Le Test d'incantation est représenté par un d100 de Force Mentale du lanceur (même convention que les autres oppositions), Endurance Accessible +4 DR via `targetSlModifier` (ajouté), `destroyOnOpposedWin` (ajouté : Blessures à 0, banc, `destroyed`). Les exemptions de ciblage annulent désormais un bannissement/destruction déjà calculé.
- **D-C32** — Manifestation de Démon Mineur : démon non instancié (profils = phase E), opposition jouée par le MJ ; à la fin de la durée avec ordre inachevé, le démon disparaît (rappel). Alternative : il reste hostile.
- **D-C33** — Octogramme : barrière en rappel (aucune position suivie) ; cible « ZdE Bonus d'Intelligence mètres » (diamètre maximum).

## Nécromancie (D6)

- **D-C40** — Relever les morts / Réanimation (L06 pp.258-259) : profils des Squelettes (p.339) et Zombies (p.340) = phase E. Participants génériques (sans caractéristiques ni Blessures, Trait Mort-vivant, À Terre, nommés Squelette n / Zombie n) créés par `summon.generic` (nouveau) ; nombre = (1 ou BFM) + DR du Test d'incantation + paliers de +2 DR. Raccordement phase E : remplacer `summon.generic` par le profil du bestiaire. Alternative : refuser le lancement tant que les profils n'existent pas.
- **D-C41** — la couche d'invocation (fin à l'aube, événement `caster-down`) est portée par le lanceur, la zone n'est pas suivie ; fin sur mort ou Inconscient du lanceur : événement déclaré par le MJ (lecture la plus simple). Terre nue et cadavres présents : rappel, aucun refus. Les morts-vivants retirés avec la couche (comportement standard des invocations).
- **D-C42** — Crâne hurlant : Test « Psychologie » du livre = Calme +0 DR ; effet « Brisé » seulement si des Blessures sont subies (`failOnlyIfWounded`, ajouté). Obstacles traversés et trajectoire : rappel.
- **D-C43** — L'appel de Vanhel : le gain (Mouvement ou Action gratuite) n'est pas automatisé ; choix commun saisi en fait, nombre de cibles en rappel.

## Domaines du Chaos : socle et Nurgle (D7)

- **D-C50** — attributs des trois Domaines du Chaos (L06 p.259-260) ajoutés à `v5-magic-attributes.js` (caractérisation commitée avant). Pas de Vent unique (`wind: null`). L'attribut est posé comme couche `lore-attribute-<domaine>` sur chaque cible non résistée, pour la durée du sort ; **sort instantané : aucune couche** (« tant que le sort est en effet » n'a pas d'objet), simple rappel dans le reçu. Alternative : couche d'un Round.
- **D-C51** — Nurgle : le moteur ne suit pas les Blessures individuelles ni leur état Suppuré (aucun registre) : la couche `festeringWoundTest` est un marqueur, le MJ joue le Test de Blessure Suppurée (V5 p.180).
- **D-C52** — Miasme de pestilence : Symptôme de Nausée non suivi (aucune maladie dans le moteur) : rappel ; exemptés (dévoués de Nurgle, moines de la peste) reconnus par des **traits** « Dévoué de Nurgle » / « Moine de la peste » posés par le MJ ; « créatures vivantes » = ni Mort-vivant, Démoniaque, Artificiel, Éthéré. Alliés compris (le texte dit « toutes »).
- **D-C53** — Flot de Corruption : Souffle non opposé lu comme projectile magique de formule `BE+DR` (la surpuissance V5 ne remplace pas la formule) ; formules `BE` ajoutées à `resolveSpellDamage`. Pourriture du sang : rappel, test d'Endurance +0 de la cible non automatisé (le seuil « plus que son BE en Blessures » n'est pas calculé).

## Slaanesh (D8)

- **D-C60** — attribut : modificateurs de résistance portés en marqueur `resistanceModifiers` sur la couche ; aucun test de Peur, Terreur, Animosité, Haine ou Corruption du moteur ne les lit encore, le MJ les applique (même statut que les autres marqueurs de suivi).
- **D-C61** — Consentement : échec du Test = « perd Mouvement et Action » rappelé dans le journal (aucun état bloquant l'Action n'existe). De la douleur le plaisir : Trait « Indolore » (nom français retenu par défaut, le livre FR V5 n'étant pas consulté) ; « Impuissante » mappé sur « cible sans défense » (rappel, pas d'état). Fantasmagorie : Trait « Distrayant », alliés de la zone seulement (le lanceur compris).
- **D-C62** — noms français : Consentement (officiel L05 p.257, repris) ; « De la douleur le plaisir » et « Fantasmagorie » proposés par Gemini, retenus (Fantasmagorie plutôt que Phantasmagorie, orthographe usuelle).

## Tzeentch (D9)

- **D-C70** — attribut : Test de Corruption = Endurance +0 DR (le livre admet Endurance ou Calme selon la corruption, physique ou spirituelle ; l'attribut parle d'une transformation magique : lecture physique). d100 saisi par cible (`targetTests.<id>.corruptionRoll`), le lancement est refusé sans lui (`dice-required`). Réussite : +1 Point de Chance temporaire porté par une couche `Spéciale` **sans échéance** (« jusqu'à la fin de la rencontre » : le moteur n'a pas de fin de rencontre pour les couches ; le MJ la retire). Échec : +1 `corruptionPoints`. Toutes les cibles font le Test, résistées ou non exclues par le MJ avant le lancement. Alternative : couche d'un Round.
- **D-C71** — Don de Tzeentch : le sort choisi est un fait `contractSpell` (nouveau type) validé contre les contrats existants ; il n'est pas rendu lançable hors des sorts mémorisés, la fin sur Incantation Imparfaite est un rappel. Interaction avec le verrou elfique : aucune (non automatisé).
- **D-C72** — Transformation de Tzeentch : « Impuissante » = cible sans défense (rappel) ; Point de Corruption sur échec automatisé (`failCorruption`, ajouté à la clause de fin de Round). Trahison de Tzeentch : Animosité (Alliés) en Trait ; absence de transfert d'Avantage et attaque de l'allié sur échec du Calme −2 DR : rappel, Test déclaré sur Critique en attaque.
- **D-C73** — noms : Trahison de Tzeentch (officiel L05 p.257), Don de Tzeentch et Transformation de Tzeentch (Gemini, retenus).

## Grande Gueule, Ogres (D12)

- **D-C80** — noms français (aucun officiel, livre FR Ogres absent) : Brise-os, Gloutonneur, Dévore-cervelle, Goût de la mort, Tripes de troll, La Gueule, Festin des tombés (L01 pp.32-33) ; Brasse-bile, Bouillie de sang, Du cœur au ventre, Brise-dents (L12 p.82). Alternative : noms anglais conservés.
- **D-C81** — conversions V4 → V5 : Dégâts +4 / +8 / +10 inchangés (valeurs de sort) ; +2 Bonus de Force = +20 Force ; −20 → −2 DR (Calme contre Dévore-cervelle), −30 → −3 DR (Infecté/Malade, Festin) ; +20 Endurance/Calme → +2 DR (Brise-dents) ; « Difficult (+20) » (libellé contradictoire dans la source, Gloutonneur et Festin) → Difficile −2 DR (arbitrage Q05) ; « Challenging (+0) » → Intermédiaire +0 DR ; « Easy (+40) » → Accessible +4 DR ; « +20 au jet de Critique » (jet de table, pas un Test) conservé en rappel.
- **D-C82** — attribut (L01 p.32) : 1d10 saisi par sort réussi (`targetTests.<lanceur>.mawRoll`), lancement refusé sans lui ; 10 ou ≥ NI : le lanceur récupère NI Blessures (plafonné à son maximum). Appliqué aussi aux sorts de L12 (« peuvent être appris par les Ogres du Domaine », L12 p.82). Les Boucher d'Ogres utilisent l'Endurance au lieu de l'Intelligence pour Langue (Magick) : règle de personnage, hors contrats.
- **D-C83** — Gloutonneur : refus volontaire (fait optionnel `rejectsGift`) ; sans repas copieux (question posée à la fin du sort) la cible gagne Exténué. Festin des tombés : zone non chiffrée par la source → cibles désignées par le MJ, résistance volontaire (fait optionnel), Calme +0 de fin de sort seulement pour les non-Ogres ayant blessé au corps à corps (question posée) ; Vampirisme conservé comme Trait nommé.
- **D-C84** — La Gueule : première résolution automatique (Esquive, dégâts 8 moins DR ou 10, trois Enchevêtré) ; la persistance de la fosse (Force 60, coups de fin de Tour, Blessure Critique à la disparition) est un rappel, non suivie.
- **D-C85** — sorts de L12 : « Ogres amis » = alliés portant le fait par cible « Ogre allié » (saisi) ; Bouillie de sang : valeur de soin saisie (le Test d'Endurance est joué hors moteur), 0 = échec (Flux sanglant en rappel). Brise-dents : la perte de dents et l'Endurance du Boucher sont des rappels.
- **D-C86** — `tests/helpers/lot3-domain-fixture.js` : le contrôle « fait absent ⇒ lancement refusé » ignore désormais les faits déclarés `optional` (aucune assertion de contrat modifiée).
