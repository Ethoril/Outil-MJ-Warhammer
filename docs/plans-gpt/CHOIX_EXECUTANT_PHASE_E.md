# Choix de l'exécutant, phase E (Claude Pro)

Format : id, source, question, choix, raison, alternative. Relecture du MJ en sélecteurs groupés.

## Mots-clés de créature (demande du MJ du 22/10)

- **E-K01** — Nom du module. Question : `js/core/keywords.js` existe (mots-clés d'armes). Choix : `js/core/creature-keywords.js` et `js/data/creature-keywords.js`, vocabulaire « mots-clés de créature ». Raison : éviter toute confusion avec les qualités d'armes. Alternative : renommer l'existant (rejeté, code partagé).
- **E-K02** — Trolls. Source : L12 p.15 (« les Trolls ne sont pas apparentés aux Orques et Gobelins »). Choix : `troll` est un enfant de `monstre`, **pas** de `peaux-vertes` (une Haine des Peaux-vertes ne s'applique donc pas aux trolls). Alternative : Troll enfant de Peaux-vertes (rejeté : contredit le livre).
- **E-K03** — Squigs. Choix : parents `peaux-vertes` et `bete`. Raison : bêtes des Peaux-vertes, soumises à leur Haine ; le MJ corrige au cas par cas. Alternative : `bete` seul.
- **E-K04** — Fantômes. Choix : `fantome` a pour parents `mort-vivant` et `etheree` (les fantômes portent le Trait Éthéré). Alternative : un seul parent.
- **E-K05** — Pluriel et variantes. Choix : un mot de plus de trois lettres finissant par « s » (sauf « ss ») perd son « s » à la comparaison ; casse, accents, tirets, apostrophes ignorés ; les pluriels irréguliers (elves, dwarves, chevaux) sont des alias explicites. Raison : règle simple et prévisible, la même pour le terme saisi et le référentiel (« Chaos » reste comparable à lui-même).
- **E-K06** — Quasi-doublons. Choix : distance d'édition ≤ 2 pour un libellé d'au moins 7 lettres, ≤ 1 de 4 à 6 lettres, égalité exacte sous 4 lettres ; comparaison avec tous les noms et alias. Raison : « Zombi » est refusé au profit de « Zombie », « Orc » ne bloque rien d'inutile. Alternative : seuils relatifs (rejeté, moins lisibles pour le MJ).
- **E-K07** — Correspondance. Choix : **à sens unique** (la cible porte le mot-clé visé ou un descendant) ; un effet visant « Orque » ne touche pas un Gobelin, un effet visant « Peaux-vertes » touche les deux. Raison : demande du MJ.
- **E-K08** — Termes relationnels (Étranger, Sigmarite). Choix : présents dans la base pour que Préjugé et Animosité ne soient jamais en texte libre, mais jamais déduits d'une espèce : seul le MJ les assigne à une créature. Alternative : les exclure (rejeté : « Préjugé (Étrangers) » est très fréquent dans les livres).
- **E-K09** — Peuples humains. Choix : Norse, Kislévite, Bretonnien, Arabyen sont des enfants de `humain` ; les provinces de l'Empire ne sont pas des mots-clés de base (ajout possible par le MJ). Alternative : tout lister (rejeté : le référentiel se veut compact).
- **E-K10** — « Vivant ». Choix : terme présent (cible d'effets « contre les vivants ») mais **dérivé** : jamais écrit sur un profil, déduit de l'absence de Mort-vivant, Démon, Artificiel, Éthéré (même règle que `hasLivingMagicNature`). Raison : un seul calcul de la nature vivante.
- **E-K11** — Précache du service worker. Constat : `tests/sw.test.js` exige que tout fichier `js/**/*.js|json` figure dans `ASSETS_TO_CACHE` de `sw.js`. Choix : j'ajoute **seulement les chemins** des nouveaux fichiers à cette liste ; `CACHE_NAME` (la version) reste intacte et revient à l'orchestrateur à la publication. Raison : sans cela la suite échoue à chaque nouveau module. Alternative : laisser le test rouge (rejeté).

## Migration des spécialisations en texte libre (K4)

- **E-K12** — Périmètre. Constat : le catalogue de talents traduit 98 spécialisations (`specializationTranslations`). Choix, cas par cas, après passage de `specializationMigrationReport` : (1) **résolues telles quelles** par nom ou alias : Animaux (Bête), Monstres, Morts-vivants, Rats, Skaven, hommes-bêtes, Elfes noirs, Lanceurs de sorts, Tout (joker) ; (2) **ajoutées au référentiel** comme termes de base parce que les livres les emploient comme cibles de Haine, Animosité, Préjugé ou Sans peur : Hors-la-loi, Criminels (Naufrageurs en enfant), Intrus (alias Intruders), Hérétiques, Sorcières (enfant de Lanceur de sorts), Miliciens (Patrouilleurs fluviaux et routiers en enfants), Soldats (Cavalerie, Mercenaires en enfants), Nobles, Serviteurs, Guilde, Érudits, Fidèles/Cultistes, Grandes bêtes, Monstres marins ; (3) **hors périmètre** (jamais des mots-clés de créature) : terrains, métiers, sens, runes, formes d'art, « au choix » et les menaces Maladie/Poison du talent Résistance (Menace), qui restent en texte.
- **E-K13** — « Associés au Chaos ». Source : spécialisation de Haine accordée par une prière et utilisée dans les tests existants. Choix : alias de `chaos` (donc tous ses descendants : Khorne…, Mutants, Hommes-bêtes). Raison : lecture la plus simple. Alternative : terme distinct (rejeté : doublon sémantique).
- **E-K14** — Texte non résoluble. Choix : jamais deviné ; la spécialisation en texte libre déjà présente sur une fiche (importée) garde l'égalité de texte comme avant (comportement inchangé) et figure dans le rapport de migration « à migrer » ; seule la **saisie de nouvelles** spécialisations (Dévotion de la Guerrière) passe obligatoirement par le référentiel, le nom canonique étant conservé (« Gobelins » devient « Gobelin »).
- **E-K15** — Priorité de la correction du MJ. Choix : une saisie explicite `enemyGroup` (contexte du Test) l'emporte sur les mots-clés déduits de l'adversaire, dans les deux sens (retirer ou forcer l'effet) ; la correction durable passe par `keywordExclusions` ou `keywords` du participant. Un adversaire sans aucun mot-clé connu laisse la question au MJ comme avant (fait manquant `enemyGroup`).
- **E-K16** — Haine comme Trait. Choix : le Trait Haine (cible) donne l'immunité à la Peur et à l'Intimidation du groupe (E0-T-027), pas à la Terreur ; elle s'ajoute à celle du talent. Animosité et Préjugé : seul le ciblage (`traitTargets`) est livré ici ; leurs effets sont au lot T6.
- **E-K17** — Banshee et Spectre de cairn. Choix : alias de `fantome` (mort-vivant et éthéré) dans le référentiel. Raison : leurs profils portent Mort-vivant et Éthéré ; lecture la plus simple. Alternative : termes distincts (le MJ peut en ajouter).

## Bestiaire : données et import (lots D)

- **E-D01** — Un fichier par livre (`js/data/bestiary/<livre>.json`) plus `index.json`, au lieu d'un fichier unique. Raison : un lot, un commit par livre ; chargement paresseux ; reprise possible après interruption. Les chemins sont ajoutés au précache de `sw.js` (E-K11).
- **E-D02** — Lecture des PDF : extraction par colonnes du texte « layout » (`tools/lib/bestiary-blocks.mjs`), chiffres lus par ordre ou, pour les cases vides, relus sur l'**image** de la page (`tools/lib/bestiary-overrides.mjs`, gabarits de L09 et L12, quelques lignes de L10 et L22). Contrôle indépendant systématique : `tools/verify-bestiary-stats.mjs` relit le texte brut et exige la suite des douze valeurs de chaque profil sur la bonne page.
- **E-D03** — Noms français : « L05 p.n » quand le livre de base FR donne le profil (Sanglier, Rat géant, Loup funeste…), sinon « proposition » (relue en sélecteurs groupés). L05 sert de source de noms seulement : ses profils V4 figurant déjà dans L06, aucun n'est importé séparément (V5 l'emporte). Propositions de L06 : Milicien humain (Human Watchman), Marchand humain, Voyou humain, Halfling voleur, gabarits Soldat, Tirailleur, Élite, Meneur, Commandant, Lanceur de sorts, Seigneur lanceur de sorts, et les quatre profils de la harde d'Ungrakk (Skrakk — Bestigor (Élite), Ungrakk — Seigneur-bête gor (Commandant), Swilegrakk — Chamane-bray (Lanceur de sorts), Guzgog — Tirailleur ungor).
- **E-D04** — Attaques V4 « Weapon (X) +n » et Traits d'attaque naturelle : conservés comme attaques à dégâts imprimés (déjà totaux), **sans valeur d'attaque** ; le score employé est fixé au lot B1 (CC du profil, ou la compétence de Corps à corps imprimée quand il n'y en a qu'une). Les attaques naturelles (Bite, Horns, Tail…) restent aussi des Traits.
- **E-D05** — Texte voisin écarté : les compétences hors liste (noms et valeur chiffrée requis), les Traits dont le nom contient du texte courant sont écartés ; les écarts de chaque livre sont écrits dans `tmp/divin/bestiary-ecarts-<livre>.json` (non commité) et relus avant le commit du lot.
- **E-D06** — Mots-clés des profils : n-grammes du nom imprimé résolus par alias (le plus long d'abord), plus Bestial (Bête) et la Marque du Chaos ; spécificité maximale ; les natures Mort-vivant, Démoniaque, Artificiel et Éthéré ne sont pas écrites (déduites des Traits à l'exécution).

## The Imperial Zoo (D3)

- **E-D07** — Mots-clés manuels (`tools/lib/bestiary-keywords-manual.mjs`) : quand le nom imprimé ne se résout pas par alias (créatures nommées, hybrides), le mot-clé est fixé à la main par identifiant et ajouté à ceux du nom ; jamais de mot-clé inventé hors référentiel.
- **E-D08** — Prétirés (E0-P-536 à 541) : caractéristiques *actuelles* de la fiche, Blessures = dernier nombre du cadre WOUNDS. Compétences gardées seulement si la ligne se recoupe (caractéristique + progression = total) : drapeau `skillsPartial`. Nom du formulaire différent du titre : `identity.titleMismatch`, aucune correction.
- **E-D09** — Noms français sans source L05 : propositions mécaniques par glossaire (`bestiary-names-glossary.mjs`), marquées `nameFrSource: "proposition"`, à relire par le MJ.

## Archives of the Empire (D4 à D6)

- **E-D10** — Espèce des PNJ sans mention dans le nom : lue sur le contexte du livre (Mouvement 3 et Endurance : Halflings pp. 23-31 et Nains pp. 56-63 de L03 ; PNJ humains de L01 et L02), fixée à la main dans `bestiary-keywords-manual.mjs`. Relue par le MJ au besoin.
- **E-D11** — Vérificateur : le texte brut écrit une case vide « -- » ; le contrôle l'assimile au tiret unique (sinon le Rhinox de L01 restait faussement en écart).
- **E-D12** — Noms français des PNJ des Archives : traduction des seuls intitulés de métier (Nun → Sœur, Squire → Écuyer…), noms propres conservés ; tous marqués « proposition ».
- **E-D13** — L04 : seuls les PNJ nommés reçoivent « humain » (les archétypes de métier restent sans espèce) ; une entrée « -mot-clé » du fichier de mots-clés manuels retire un mot-clé lu à tort (le surnom « the Fish » d'Albrecht ne donne pas « poisson »). Limite connue : sur le Chien des marais de Grootscher, « Size (Average) Stride » est collé en une ligne et le Trait Taille n'est pas relevé (Taille moyenne, valeur par défaut).

## Lustria (D8)

- **E-D14** — L07 : espèces des PNJ lues sur le texte du livre (Adella et Soren : Norses ; Finrian : Haut Elfe ; Lokhir : Elfe noir ; Tzku'Ta : Slann ; Crotaz'L : Saurus) ; Kroxigor sous « homme-lézard » faute de terme propre ; pas de mot-clé « géant » pour la chauve-souris géante. Noms français : tous proposés à la main (le glossaire mécanique donnait « Sang-froid » pour Cold One, « Cornu One »…), à relire.
- **E-D15** — Coupures de ligne : « Cold- blooded », « Swamp- strider » sont recollés avant la recherche du Trait. Traits écartés faute d'entrée d'inventaire (relevés dans les écarts, non inventés) : Vampiric Gaze, Corrupting, Breath +12 de la Salamandre, Weapons, Hunger.

## Temple of Spite (D9)

- **E-D16** — L09 : 15 entrées (E0-P-326 à 340, archétypes de carrière p. 53-56) classées « profil » par l'inventaire E0 mais imprimées en modificateurs (cases vides, pas de Blessures) : fiche de genre « gabarit », genre d'inventaire gardé dans `inventoryKind` ; le test de cohérence compare à `inventoryKind` et compte les genres des fiches. Espèce « elfe-noir » posée à la main sur les archétypes, les Druchii nommés sans mention (Scaleflayer, Helbane, Kheitalla, Grimwitch) ; Sorcière-elfe de Khaine : ni « sorcière » ni « elfe » seul. Montures : le sang-froid naggarothi n'est pas un Elfe noir ; Dragons de l'Enfer en Monstres. Le Voyou des quais (E0-P-347) reste sans espèce (non précisée). Noms français tous proposés, à relire.

## Sylvania (D10)

- **E-D17** — L10 : 29 profils, aucun gabarit ni prétiré. Mots-clés posés à la main : Frederick van Hal en Fantôme (Fly, Hurlement fantomatique), Sorcière squelette en Squelette, Graug en Dragon et Zombie (« skeletal Zombie Dragon » dans le texte, p. 51), Ghast et Horreur des cryptes en Goule, Homme rapiécé en Mort-vivant. Talents et compétences en liste mixte non retenus par le lecteur (relevés dans les écarts, comme pour les livres précédents). Noms français tous proposés, à relire.

## Tribes and Tribulations (D11)

- **E-D18** — L12 : 64 fiches, 49 profils et 15 gabarits (le plan en annonçait 14). La Mégère troll des rivières (E0-P-449, p. 89), classée « profil » par l'inventaire, est imprimée en modificateurs (F+10, E+10, I+5, Int+30, FM+20, aucune Blessures) : fiche « gabarit », genre d'inventaire gardé dans `inventoryKind` (comme E-D16). E0-P-438 : l'inventaire a pris une phrase du texte pour le titre ; titre rétabli « Matthogg — Ogre Bruiser » (`NAME_FIXES`), mot-clé Ogre ; Gorfang en Orque. Gnoblars et Hobgobelins sans mot-clé : le référentiel n'a pas ces espèces (à arbitrer par le MJ). Noms français tous proposés, à relire.

## Up in Arms (D12)

- **E-D19** — L13 : 15 fiches (9 profils, 6 gabarits), comme annoncé. Valeurs du Destrier, du Cheval de selle et du Demigryph relues sur le texte (p. 29, 109). Chevaux en Cheval, Demigryph en Bête, Mercenaire aguerri en Mercenaire ; les autres PNJ (Éclaireur, Avocat, Scribe, Porteur, Docteur) sans mot-clé : aucune espèce n'est imprimée dans le bloc. Noms français tous proposés (le générateur automatique donnait des intitulés bancals), à relire.

## Sea Wardens of Cothique (D13)

- **E-D20** — L14 : 20 profils, comme annoncé. Les Cothiqui (noms en « Cothiqui ») reçoivent le mot-clé Haut elfe (Cothique est une colonie asur), le Kraken Monstre marin ; Rejetons de Mathlann, Spites (Pie-grièche), Phénix et PNJ sans espèce imprimée restent sans mot-clé (le référentiel n’a pas ces espèces, à arbitrer par le MJ). Ceyluii a bien 1 Blessure imprimée (taille minuscule). Le Kraken imprime « 8 × Tentacles +9 » : la ligne (multiplicité et dégâts) est écartée par l’extraction, le trait Tentacles n’est pas porté (voir tmp/divin/bestiary-ecarts-L14.json), à traiter avec le modèle d’attaques multiples. Noms français tous proposés, à relire.
