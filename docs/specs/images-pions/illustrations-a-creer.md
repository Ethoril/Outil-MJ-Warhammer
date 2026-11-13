# Illustrations à créer

Fichier généré, ne pas modifier à la main. Régénérer après l’ajout d’images ou un changement du classement : `node tools/build-token-images.mjs` puis `node tools/list-missing-token-images.mjs`.

Sources : le bestiaire (`js/data/bestiary/`), la table des images (`js/data/token-images.js`, depuis `tools/token-images.csv`) et le classement relu par le MJ (`tools/token-images-categories.csv`). Une créature présente dans plusieurs livres n’y figure qu’une fois. Le nom de fichier proposé, déposé dans `rpg-map-display/maps/tokens/`, est celui que l’appariement exact retrouvera (nom français sans accents). Les gabarits (Soldat, Tirailleur…) ne sont pas des créatures et n’y figurent pas.

## Récapitulatif

| Dossier | Illustrations | Profils couverts |
| --- | ---: | ---: |
| `bestiaire` | 55 | 55 |
| `ennemis/demons` | 5 | 5 |
| `ennemis/elfes-noirs` | 14 | 15 |
| `ennemis/gobelins` | 15 | 15 |
| `ennemis/hommes-betes` | 4 | 4 |
| `ennemis/hommes-lezards` | 26 | 27 |
| `ennemis/morts-vivants` | 24 | 26 |
| `ennemis/ogres` | 2 | 2 |
| `ennemis/orcs` | 6 | 6 |
| `ennemis/reprouves` | 8 | 9 |
| `ennemis/skavens` | 19 | 21 |
| `ennemis/vampires` | 1 | 1 |
| `monstres` | 56 | 61 |
| `peuples/elfes` | 3 | 3 |
| `peuples/gnomes` | 1 | 1 |
| `peuples/halflings` | 2 | 2 |
| `peuples/humains` | 76 | 78 |
| `peuples/nains` | 2 | 3 |
| Individus nommés (`pnj/<livre>`, `pj`) | 457 | 458 |
| `bestiaire/forme-bestiale` | 0 | — |
| `monstres/transformation-kadon` | 9 | — |
| **Total** | **785** | **792** |

## Créatures génériques

### `bestiaire` (55)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `bestiaire/amibes.webp` | Amibes | Amoebae | L26 p.85 | 1 |  |
| `bestiaire/ane-ou-mule.webp` | Âne ou mule | Donkey or Mule | L23 p.22 | 1 |  |
| `bestiaire/anguilles-du-reik.webp` | Anguilles du Reik | Reik Eels | L26 p.86 | 1 |  |
| `bestiaire/araignee-des-falaises.webp` | Araignée des falaises | Cliff Spider | L22 p.73 | 1 |  |
| `bestiaire/aspic-a-anneaux-bleus.webp` | Aspic à anneaux bleus | Blue-Ringed Asp | L07 p.172 | 1 |  |
| `bestiaire/asticot-de-sang.webp` | Asticot de sang | Bloodmaggot | L07 p.169 | 1 |  |
| `bestiaire/cervelle-douve.webp` | Cervelle-douve | Brainfluke | L07 p.168 | 1 |  |
| `bestiaire/chameleoleech.webp` | Chameleoleech | Chameleoleech | L11 p.50 | 1 |  |
| `bestiaire/chassipede.webp` | Chassipède | Huntipede | L07 p.169 | 1 |  |
| `bestiaire/chat.webp` | Chat | Cat | L02 p.77 | 1 |  |
| `bestiaire/chat-des-montagnes.webp` | Chat des montagnes | Mountain Cat | L22 p.73 | 1 |  |
| `bestiaire/chauve-souris-de-sang.webp` | Chauve-souris de sang | Blood Bat | L07 p.173 | 1 |  |
| `bestiaire/cheval-de-guerre.webp` | Cheval de guerre | Warhorse | L27 p.117 | 1 |  |
| `bestiaire/cheval-de-guerre-leger.webp` | Cheval de guerre léger | Light Warhorse | L23 p.24 | 1 |  |
| `bestiaire/cheval-de-trait.webp` | Cheval de trait | Draught Horse | L23 p.23 | 1 |  |
| `bestiaire/cheval-de-trait-lourd.webp` | Cheval de trait lourd | Heavy Draught Horse | L23 p.23 | 1 |  |
| `bestiaire/crapaud-tache-d-encre.webp` | Crapaud tache-d’encre | Blot Toad | L07 p.170 | 1 |  |
| `bestiaire/culchan.webp` | Culchan | Culchan | L07 p.173 | 1 |  |
| `bestiaire/daggerfish.webp` | Daggerfish | Daggerfish | L25 p.141 | 1 |  |
| `bestiaire/epine-a-empaler.webp` | Épine-à-empaler | Impaling Spikethorn | L07 p.167 | 1 | plante de Lustrie |
| `bestiaire/familier-de-combat.webp` | Familier de combat | Combat Familiar | L17 p.182 | 1 | familier : forme animale au choix |
| `bestiaire/familier-de-puissance.webp` | Familier de puissance | Power Familiar | L17 p.182 | 1 | familier : forme animale au choix |
| `bestiaire/familier-de-sorts.webp` | Familier de sorts | Spell Familiar | L17 p.182 | 1 | familier : forme animale au choix |
| `bestiaire/fen-worm.webp` | Fen Worm | Fen Worm | L11 p.52 | 1 |  |
| `bestiaire/fourmi-charognarde.webp` | Fourmi charognarde | Carrion Ant | L07 p.169 | 1 |  |
| `bestiaire/grand-loup.webp` | Grand loup | Great Wolf | L11 p.17 | 1 |  |
| `bestiaire/grand-taurus.webp` | Grand Taurus | Great Taurus | L11 p.75 | 1 |  |
| `bestiaire/grands-felins.webp` | Grands félins | Great Cats | L23 p.87 | 1 |  |
| `bestiaire/guepe-de-sang.webp` | Guêpe de sang | Bloodwasp | L07 p.169 | 1 |  |
| `bestiaire/gymmcrabs.webp` | Gymmcrabs | Gymmcrabs | L25 p.141 | 1 |  |
| `bestiaire/hermine.webp` | Hermine | Stoat | L02 p.78 | 1 |  |
| `bestiaire/hyenadon.webp` | Hyénadon | Hyenadon | L07 p.171 | 1 |  |
| `bestiaire/jaguar.webp` | Jaguar | Jaguar | L07 p.173 | 1 |  |
| `bestiaire/larve-itxi.webp` | Larve itxi | Itxi Grub | L07 p.168 | 1 |  |
| `bestiaire/latch-eel.webp` | Latch Eel | Latch Eel | L25 p.141 | 1 |  |
| `bestiaire/lezard-piranha.webp` | Lézard piranha | Piranha Lizard | L07 p.171 | 1 |  |
| `bestiaire/liane-rampante-agrippeuse.webp` | Liane rampante agrippeuse | Grasping Creeper Vine | L07 p.167 | 1 | plante de Lustrie |
| `bestiaire/lion-blanc.webp` | Lion blanc | White Lion | L14 p.81 | 1 |  |
| `bestiaire/lion-de-guerre-de-chrace.webp` | Lion de guerre de Chrace | War Lion of Chrace | L11 p.82 | 1 |  |
| `bestiaire/lurkerfish.webp` | Lurkerfish | Lurkerfish | L25 p.140 | 1 |  |
| `bestiaire/nightraven-flock.webp` | Nightraven Flock | Nightraven Flock | L11 p.59 | 1 |  |
| `bestiaire/nuage-de-spores-assoiffe-de-sang.webp` | Nuage de spores assoiffé de sang | Blood Hungry Spore Cloud | L07 p.167 | 1 | plante de Lustrie |
| `bestiaire/pliodon.webp` | Pliodon | Pliodon | L07 p.179 | 1 |  |
| `bestiaire/python-des-marais-d-amaxon.webp` | Python des marais d’Amaxon | Amaxon Swamp Python | L07 p.172 | 1 |  |
| `bestiaire/rainette-lustrienne.webp` | Rainette lustrienne | Lustrian Treefrog | L07 p.170 | 1 |  |
| `bestiaire/razorbill.webp` | Razorbill | Razorbill | L11 p.77 | 1 |  |
| `bestiaire/reptilion-a-criniere-d-ecailles.webp` | Reptilion à crinière d’écailles | Scalemane Reptilion | L07 p.171 | 1 |  |
| `bestiaire/sangsue-de-feu.webp` | Sangsue de feu | Fireleech | L07 p.168 | 1 |  |
| `bestiaire/serpent-foreur.webp` | Serpent foreur | Borer Snake | L07 p.172 | 1 |  |
| `bestiaire/serpents-de-sotek.webp` | Serpents de Sotek | Serpents of Sotek | L07 p.57 | 1 |  |
| `bestiaire/stirpike.webp` | Stirpike | Stirpike | L11 p.36 | 1 |  |
| `bestiaire/stirpikes.webp` | Stirpikes | Stirpikes | L26 p.88 | 1 |  |
| `bestiaire/tiguana.webp` | Tiguana | Tiguana | L07 p.171 | 1 |  |
| `bestiaire/tortue-happeuse-carnivore.webp` | Tortue happeuse carnivore | Carnivorous Snapper | L23 p.99 | 1 |  |
| `bestiaire/viperine.webp` | Vipérine | Vypervine | L07 p.167 | 1 | plante de Lustrie |

### `ennemis/demons` (5)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/demons/changelin-de-tzeentch.webp` | Changelin de Tzeentch | Changeling of Tzeentch | L18 p.85 | 1 |  |
| `ennemis/demons/changeling-de-tzeentch.webp` | Changeling de Tzeentch | Changeling of Tzeentch | L21 p.56 | 1 |  |
| `ennemis/demons/disque-bibliotheque-de-tzeentch.webp` | Disque-bibliothèque de Tzeentch | Library Disc of Tzeentch | L17 p.213 | 1 |  |
| `ennemis/demons/furie-du-chaos.webp` | Furie du Chaos | Chaos Fury | L23 p.84 | 1 |  |
| `ennemis/demons/horreur-bleue.webp` | Horreur bleue | Blue Horror | L23 p.85 | 1 |  |

### `ennemis/elfes-noirs` (14)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/elfes-noirs/destrier-noir.webp` | Destrier noir | Dark Steed | L09 p.45 | 1 |  |
| `ennemis/elfes-noirs/dragon-de-l-enfer.webp` | Dragon de l’Enfer | Helldrake | L09 p.49 | 1 |  |
| `ennemis/elfes-noirs/dragon-de-l-enfer-juvenile.webp` | Dragon de l’Enfer juvénile | Juvenile Helldrake | L09 p.49 | 1 |  |
| `ennemis/elfes-noirs/elfe-noir.webp` | Elfe noir | Dark Elf | L09 p.44 | 1 |  |
| `ennemis/elfes-noirs/elfe-noir-de-basse-naissance-citadin.webp` | Elfe noir de basse naissance (citadin) | Dark Elf City Lowborn | L09 p.44 | 1 |  |
| `ennemis/elfes-noirs/elfe-noir-de-basse-naissance-des-terres-sauvages.webp` | Elfe noir de basse naissance (des terres sauvages) | Dark Elf Wilderness Lowborn | L09 p.44 | 1 |  |
| `ennemis/elfes-noirs/elfe-noir-de-haute-naissance.webp` | Elfe noir de haute naissance | Dark Elf Highborn | L09 p.44 | 1 |  |
| `ennemis/elfes-noirs/harpie.webp` | Harpie | Harpy | L09 p.48 | 1 |  |
| `ennemis/elfes-noirs/kharibdyss.webp` | Kharibdyss | Kharibdyss | L09 p.46, L25 p.144 | 2 |  |
| `ennemis/elfes-noirs/oint-druchii.webp` | Oint druchii | Druchii Anointed | L09 p.51 | 1 |  |
| `ennemis/elfes-noirs/pegase-noir.webp` | Pégase noir | Dark Pegasus | L09 p.45 | 1 |  |
| `ennemis/elfes-noirs/pegases-noirs.webp` | Pégases noirs | Dark Pegasi | L11 p.57 | 1 |  |
| `ennemis/elfes-noirs/sang-froid-naggarothi.webp` | Sang-froid naggarothi | Naggarothi Cold One | L09 p.46 | 1 |  |
| `ennemis/elfes-noirs/sorcier-du-feu-maudit.webp` | Sorcier du feu maudit | Doomfire Warlock | L09 p.52 | 1 |  |

### `ennemis/gobelins` (15)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/gobelins/de-base-gnoblar.webp` | De base Gnoblar | Basic Gnoblar | L12 p.9 | 1 |  |
| `ennemis/gobelins/de-base-gobelin-des-forets.webp` | De base gobelin des forêts | Basic Forest Goblin | L12 p.9 | 1 |  |
| `ennemis/gobelins/de-base-gobelin-nocturne.webp` | De base gobelin nocturne | Basic Night Goblin | L12 p.9 | 1 |  |
| `ennemis/gobelins/de-base-hobgobelin.webp` | De base hobgobelin | Basic Hobgoblin | L12 p.12 | 1 |  |
| `ennemis/gobelins/de-base-snotling.webp` | De base Snotling | Basic Snotling | L12 p.13 | 1 |  |
| `ennemis/gobelins/geant-squig.webp` | Géant Squig | Giant Squig | L12 p.19 | 1 |  |
| `ennemis/gobelins/gobelin-des-forets.webp` | Gobelin des forêts | Forest Goblin | L11 p.15 | 1 |  |
| `ennemis/gobelins/gobelin-nocturne-chef.webp` | Gobelin nocturne chef | Night Goblin Chief | L12 p.16 | 1 |  |
| `ennemis/gobelins/gobelin-nocturne-squig-des-cavernes-swarm.webp` | Gobelin nocturne squig des cavernes Swarm | Night Goblin Cave Squig Swarm | L11 p.27 | 1 |  |
| `ennemis/gobelins/gobelins-nocturnes.webp` | Gobelins nocturnes | Night Goblins | L11 p.28 | 1 |  |
| `ennemis/gobelins/hopping-squig.webp` | Hopping Squig | Hopping Squig | L12 p.19 | 1 |  |
| `ennemis/gobelins/les-plongeurs-funestes.webp` | Les Plongeurs funestes | The Doom Divers | L21 p.32 | 1 | plongeurs funestes gobelins (Doom Divers) |
| `ennemis/gobelins/snotling.webp` | Snotling | Snotling | L06 p.338 | 1 |  |
| `ennemis/gobelins/squig-des-cavernes.webp` | Squig des cavernes | Cave Squig | L06 p.329 | 1 |  |
| `ennemis/gobelins/squigs-colossaux.webp` | Squigs colossaux | Colossal Squigs | L21 p.63 | 1 |  |

### `ennemis/hommes-betes` (4)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/hommes-betes/homme-bete-du-chaos.webp` | Homme-bête du Chaos | Chaos Beastman | L21 p.84 | 1 |  |
| `ennemis/hommes-betes/hommes-betes-de-khorne.webp` | Hommes-bêtes de Khorne | Khornate Beastmen | L23 p.105 | 1 |  |
| `ennemis/hommes-betes/minotaure.webp` | Minotaure | Minotaur | L06 p.346 | 1 |  |
| `ennemis/hommes-betes/razorgor.webp` | Razorgor | Razorgor | L11 p.19 | 1 |  |

### `ennemis/hommes-lezards` (26)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/hommes-lezards/arcanadon.webp` | Arcanadon | Arcanadon | L07 p.178 | 1 |  |
| `ennemis/hommes-lezards/bastiladon.webp` | Bastiladon | Bastiladon | L07 p.178 | 1 |  |
| `ennemis/hommes-lezards/carnosaur.webp` | Carnosaur | Carnosaur | L11 p.81 | 1 |  |
| `ennemis/hommes-lezards/carnosaure.webp` | Carnosaure | Carnosaur | L07 p.180 | 1 |  |
| `ennemis/hommes-lezards/coatl.webp` | Coatl | Coatl | L07 p.153 | 1 |  |
| `ennemis/hommes-lezards/cornu-one.webp` | Cornu One | Horned One | L11 p.80 | 1 |  |
| `ennemis/hommes-lezards/garde-du-temple-saurus.webp` | Garde du temple saurus | Saurus Temple Guard | L07 p.145 | 1 |  |
| `ennemis/hommes-lezards/kroxigor.webp` | Kroxigor | Kroxigor | L07 p.148 | 1 |  |
| `ennemis/hommes-lezards/razordon.webp` | Razordon | Razordon | L07 p.175 | 1 |  |
| `ennemis/hommes-lezards/rejeton-saurus-difforme.webp` | Rejeton saurus difforme | Malformed Saurus Spawn | L07 p.58 | 1 |  |
| `ennemis/hommes-lezards/ripperdactyle.webp` | Ripperdactyle | Ripperdactyl | L07 p.176 | 1 |  |
| `ennemis/hommes-lezards/salamandre.webp` | Salamandre | Salamander | L07 p.175 | 1 |  |
| `ennemis/hommes-lezards/sang-froid-monture-saurienne.webp` | Sang-froid (monture saurienne) | Cold One | L07 p.174 | 1 |  |
| `ennemis/hommes-lezards/saurien-terrifiant.webp` | Saurien terrifiant | Dread Saurian | L07 p.181 | 1 |  |
| `ennemis/hommes-lezards/saurus.webp` | Saurus | Saurus | L07 p.143 | 1 |  |
| `ennemis/hommes-lezards/skink.webp` | Skink | Skink | L07 p.136 | 1 |  |
| `ennemis/hommes-lezards/skink-cameleon.webp` | Skink caméléon | Chameleon Skink | L07 p.142 | 1 |  |
| `ennemis/hommes-lezards/slann-de-la-cinquieme-generation.webp` | Slann de la cinquième génération | Slann of the Fifth Generation | L07 p.123 | 1 |  |
| `ennemis/hommes-lezards/slann-de-la-deuxieme-generation.webp` | Slann de la deuxième génération | Slann of the Second Generation | L07 p.124 | 1 |  |
| `ennemis/hommes-lezards/slann-de-la-premiere-generation.webp` | Slann de la première génération | Slann of the First Generation | L07 p.124 | 1 |  |
| `ennemis/hommes-lezards/slann-de-la-quatrieme-generation.webp` | Slann de la quatrième génération | Slann of the Fourth Generation | L07 p.123 | 1 |  |
| `ennemis/hommes-lezards/slann-de-la-troisieme-generation.webp` | Slann de la troisième génération | Slann of the Third Generation | L07 p.124 | 1 |  |
| `ennemis/hommes-lezards/stegadon.webp` | Stégadon | Stegadon | L07 p.177, L11 p.79 | 2 |  |
| `ennemis/hommes-lezards/terradon.webp` | Terradon | Terradon | L07 p.176 | 1 |  |
| `ennemis/hommes-lezards/troglodon.webp` | Troglodon | Troglodon | L07 p.180 | 1 |  |
| `ennemis/hommes-lezards/unicorne-saurien.webp` | Unicorne saurien | Horned One | L07 p.175 | 1 |  |

### `ennemis/morts-vivants` (24)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/morts-vivants/banshee.webp` | Banshee | Tomb Banshee | L06 p.342 | 1 |  |
| `ennemis/morts-vivants/bone-hydra.webp` | Bone Hydra | Bone Hydra | L25 p.146 | 1 |  |
| `ennemis/morts-vivants/carrion-oiseaux-morts-vivants.webp` | Carrion (oiseaux morts-vivants) | Carrion | L26 p.118 | 1 |  |
| `ennemis/morts-vivants/cauchemar-aile.webp` | Cauchemar ailé | Winged Nightmare | L21 p.118 | 1 |  |
| `ennemis/morts-vivants/champion-zombie.webp` | Champion zombie | Zombie Champion | L18 p.117 | 1 |  |
| `ennemis/morts-vivants/champions-squelettes-sans-tete.webp` | Champions squelettes sans tête | Headless Skeleton Champions | L18 p.119 | 1 |  |
| `ennemis/morts-vivants/charogne.webp` | Charogne | Carrion | L22 p.120 | 1 |  |
| `ennemis/morts-vivants/colosse-necrofex.webp` | Colosse nécrofex | Necrofex Colossus | L21 p.64 | 1 |  |
| `ennemis/morts-vivants/cranes-volants-de-la-mort.webp` | Crânes volants de la mort | Flying Death Skulls | L18 p.117, L21 p.118, L22 p.120 | 3 |  |
| `ennemis/morts-vivants/cranes-volants-de-la-mort-version-renforcee.webp` | Crânes volants de la mort (version renforcée) | Flying Death-Ier Skulls | L18 p.117 | 1 |  |
| `ennemis/morts-vivants/fantome.webp` | Fantôme | Ghost | L06 p.341 | 1 |  |
| `ennemis/morts-vivants/ghast-des-cryptes.webp` | Ghast des cryptes | Crypt Ghast | L10 p.68 | 1 |  |
| `ennemis/morts-vivants/homme-rapiece.webp` | Homme rapiécé | Patchwork Man | L10 p.74 | 1 |  |
| `ennemis/morts-vivants/horreur-des-cryptes.webp` | Horreur des cryptes | Crypt Horror | L10 p.68 | 1 |  |
| `ennemis/morts-vivants/liche-pestilentielle.webp` | Liche pestilentielle | Pestilential Liche-Thing | L19 p.157 | 1 |  |
| `ennemis/morts-vivants/loup-funeste.webp` | Loup funeste | Dire Wolf | L06 p.341 | 1 |  |
| `ennemis/morts-vivants/mournguls.webp` | Mournguls | Mournguls | L21 p.61 | 1 |  |
| `ennemis/morts-vivants/restless-fantome.webp` | Restless fantôme | Restless Ghost | L24 p.34 | 1 |  |
| `ennemis/morts-vivants/sorciere-squelette.webp` | Sorcière squelette | Skeletal Witch | L10 p.51 | 1 |  |
| `ennemis/morts-vivants/spectre.webp` | Spectre | Spectre | L19 p.117 | 1 |  |
| `ennemis/morts-vivants/spectre-de-cairn.webp` | Spectre de cairn | Cairn Wraith | L06 p.342 | 1 |  |
| `ennemis/morts-vivants/spectres-de-sorciere.webp` | Spectres de sorcière | Hexwraiths | L21 p.118 | 1 |  |
| `ennemis/morts-vivants/squelettes-sans-tete.webp` | Squelettes sans tête | Headless Skeletons | L18 p.119 | 1 |  |
| `ennemis/morts-vivants/terreur-abyssale.webp` | Terreur abyssale | Abyssal Terror | L22 p.120 | 1 |  |

### `ennemis/ogres` (2)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/ogres/goinfre-ogre.webp` | Goinfre ogre | Ogre Gorger | L16 p.83 | 1 |  |
| `ennemis/ogres/mournfang.webp` | Mournfang | Mournfang | L12 p.19 | 1 |  |

### `ennemis/orcs` (6)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/orcs/chamane-orque-sauvage.webp` | Chamane orque sauvage | Savage Orc Shaman | L07 p.182 | 1 |  |
| `ennemis/orcs/chef-orque-sauvage.webp` | Chef orque sauvage | Savage Orc Chief | L07 p.182 | 1 |  |
| `ennemis/orcs/de-base-noir-orc.webp` | De base noir Orc | Basic Black Orc | L12 p.11 | 1 |  |
| `ennemis/orcs/de-base-sauvage-orc.webp` | De base sauvage Orc | Basic Savage Orc | L12 p.10 | 1 |  |
| `ennemis/orcs/idole-renegate-de-gork-ou-mork.webp` | Idole renégate de Gork (ou Mork) | Rogue Idol of Gork (or Mork) | L16 p.86 | 1 |  |
| `ennemis/orcs/orque-sauvage.webp` | Orque sauvage | Savage Orc | L07 p.182 | 1 |  |

### `ennemis/reprouves` (8)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/reprouves/croc-jaune-cultistes.webp` | Croc-Jaune cultistes | Yellow Fang Cultists | L18 p.97 | 2 |  |
| `ennemis/reprouves/cultiste-novice-des-crocs-jaunes.webp` | Cultiste novice des Crocs-Jaunes | Yellow Fang Junior Cultist | L22 p.62 | 1 |  |
| `ennemis/reprouves/cultists-de-jade-sceptre-or-2.webp` | Cultists de Jade Sceptre (Or 2) | Cultists of the Jade Sceptre (Gold 2) | L24 p.66 | 1 |  |
| `ennemis/reprouves/enfant-de-chaos.webp` | Enfant de Chaos | Child of Chaos | L21 p.20 | 1 |  |
| `ennemis/reprouves/miliciens-khorne-cultistes-argent-1.webp` | Miliciens — Khorne cultistes (Argent 1) | Watchmen — Khorne Cultists (Silver 1) | L24 p.35 | 1 |  |
| `ennemis/reprouves/nurgle-cultists-sorcier-argent-3.webp` | Nurgle Cultists & sorcier (Argent 3) | Nurgle Cultists & Sorcerer (Silver 3) | L24 p.52 | 1 |  |
| `ennemis/reprouves/roi-de-la-peste.webp` | Roi de la Peste | Blightking | L22 p.77 | 1 |  |
| `ennemis/reprouves/wayward-moon-cultiste.webp` | Wayward Moon cultiste | Wayward Moon Cultist | L11 p.70 | 1 |  |

### `ennemis/skavens` (19)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/skavens/briseur-d-os-rat-ogre.webp` | Briseur d’os, rat-ogre | Rat Ogre Bonebreaker | L22 p.52 | 1 |  |
| `ennemis/skavens/clan-moulder-packmaster.webp` | Clan Moulder Packmaster | Clan Moulder Packmaster | L11 p.41 | 1 |  |
| `ennemis/skavens/clan-moulder-unique-experiment.webp` | Clan Moulder Unique Experiment | Clan Moulder Unique Experiment | L11 p.41 | 1 |  |
| `ennemis/skavens/clan-skryre-prototype.webp` | Clan Skryre ‘prototype’ | Clan Skryre ‘prototype’ | L11 p.95 | 1 |  |
| `ennemis/skavens/clan-skryre-warlock-engineer.webp` | Clan Skryre Warlock Engineer | Clan Skryre Warlock Engineer | L11 p.95 | 1 |  |
| `ennemis/skavens/gardes-du-palanquin.webp` | Gardes du palanquin | Palanquin Guards | L22 p.14 | 1 |  |
| `ennemis/skavens/globadiers-de-vent-empoisonne-laches.webp` | Globadiers de vent empoisonné lâches | Turntail Poisoned Wind Globadiers | L22 p.31 | 1 |  |
| `ennemis/skavens/grand-rat-de-la-verole.webp` | Grand rat de la vérole | Great Pox Rat | L22 p.50 | 1 |  |
| `ennemis/skavens/gris-voyant-skaven.webp` | Gris voyant skaven | Skaven Grey Seer | L18 p.97 | 2 |  |
| `ennemis/skavens/horreur-de-couvee.webp` | Horreur de couvée | Brood Horror | L22 p.51 | 1 |  |
| `ennemis/skavens/infiltrateur-du-clan-eshin.webp` | Infiltrateur du clan Eshin | Clan Eshin Infiltrator | L22 p.18 | 1 |  |
| `ennemis/skavens/loup-rat.webp` | Loup Rat | Wolf Rat | L11 p.41 | 1 |  |
| `ennemis/skavens/maitre-de-meute.webp` | Maître de meute | Packmaster | L22 p.28 | 1 |  |
| `ennemis/skavens/rat-de-la-peste.webp` | Rat de la peste | Plague Rat | L16 p.90, L22 p.50 | 2 |  |
| `ennemis/skavens/rat-loup.webp` | Rat-loup | Wolf Rat | L22 p.50 | 1 |  |
| `ennemis/skavens/rat-ogre.webp` | Rat-ogre | Rat Ogre | L06 p.352 | 1 |  |
| `ennemis/skavens/rat-ogre-bonebreaker.webp` | Rat Ogre Bonebreaker | Rat Ogre Bonebreaker | L11 p.41 | 1 |  |
| `ennemis/skavens/skaven-d-elite-des-vermines-de-la-mort.webp` | Skaven d’élite des Vermines de la mort | Deathvermin Stormvermin | L22 p.22 | 1 |  |
| `ennemis/skavens/vermine-de-choc.webp` | Vermine de choc | Stormvermin | L06 p.352 | 1 |  |

### `ennemis/vampires` (1)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `ennemis/vampires/varghulf.webp` | Varghulf | Varghulf | L06 p.344 | 1 |  |

### `monstres` (56)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `monstres/aigle-geant.webp` | Aigle géant | Great Eagle | L11 p.63, L14 p.82, L22 p.73 | 3 |  |
| `monstres/amoebae.webp` | Amoebae | Amoebae | L11 p.45 | 1 |  |
| `monstres/amphisbaena.webp` | Amphisbaena | Amphisbaena | L11 p.47 | 1 |  |
| `monstres/arachnarok-araignee.webp` | Arachnarok araignée | Arachnarok Spider | L11 p.13 | 1 |  |
| `monstres/bete-des-marais.webp` | Bête des marais | Fenbeast | L06 p.331, L17 p.179 | 2 |  |
| `monstres/carcasse-de-mouton.webp` | Carcasse de mouton | Sheep Carcass | L21 p.25 | 1 |  |
| `monstres/carcasse-de-porc.webp` | Carcasse de porc | Pig Carcass | L21 p.25 | 1 |  |
| `monstres/carcasse-de-vache.webp` | Carcasse de vache | Cow Carcass | L21 p.25 | 1 |  |
| `monstres/carrosse-anime.webp` | Carrosse animé | Animated Coach | L21 p.24 | 1 |  |
| `monstres/chimera.webp` | Chimera | Chimera | L11 p.67 | 1 |  |
| `monstres/cockatrice.webp` | Cockatrice | Cockatrice | L11 p.65 | 1 |  |
| `monstres/creatures-magiques-elementaire-incarne-de-mort.webp` | Créatures magiques — Élémentaire incarné de mort | Magical Creatures — Incarnate Elemental of Death | L17 p.175 | 1 |  |
| `monstres/de-base-commun-troll.webp` | De base commun troll | Basic Common Troll | L12 p.15 | 1 |  |
| `monstres/demigriffon.webp` | Demigriffon | Demigryph | L06 p.329 | 1 |  |
| `monstres/dragon-de-magma.webp` | Dragon de magma | Magma Dragon | L16 p.84 | 1 |  |
| `monstres/dragon-de-tessons.webp` | Dragon de tessons | Shard Dragon | L11 p.90 | 1 |  |
| `monstres/dragon-des-mers.webp` | Dragon des mers | Sea Dragon | L09 p.50 | 1 |  |
| `monstres/dragons-des-forets.webp` | Dragons des forêts | Forest Dragons | L11 p.30 | 1 |  |
| `monstres/dread-maw.webp` | Dread Maw | Dread Maw | L11 p.23 | 1 |  |
| `monstres/elementaire-de-mer.webp` | Élémentaire de mer | Sea Elemental | L25 p.142 | 1 |  |
| `monstres/elementaire-incarne-de-betes.webp` | Élémentaire incarné de bêtes | Incarnate Elemental of Beasts | L17 p.176 | 1 |  |
| `monstres/elementaire-incarne-de-feu.webp` | Élémentaire incarné de feu | Incarnate Elemental of Fire | L17 p.174 | 1 |  |
| `monstres/ettins-maudits.webp` | Ettins maudits | Curs'd Ettins | L21 p.62 | 1 |  |
| `monstres/gargantuan.webp` | Gargantuan | Gargantuan | L25 p.143 | 1 |  |
| `monstres/geant-loup.webp` | Géant loup | Giant Wolf | L12 p.19 | 1 |  |
| `monstres/golem-construct.webp` | Golem (construct) | Construct | L17 p.30 | 1 |  |
| `monstres/kraken.webp` | Kraken | Kraken | L14 p.82 | 1 |  |
| `monstres/leech-wyrm.webp` | Leech Wyrm | Leech Wyrm | L25 p.146 | 1 |  |
| `monstres/les-betes-de-la-ferme.webp` | Les bêtes de la ferme | The Farmyard Beasts | L23 p.106 | 1 |  |
| `monstres/leviathan.webp` | Léviathan | Leviathan | L11 p.85 | 1 |  |
| `monstres/leviathan-a-orbes.webp` | Léviathan à orbes | Orb Leviathan | L25 p.147 | 1 |  |
| `monstres/leviathan-noir.webp` | Léviathan noir | Black Leviathan | L25 p.147 | 1 |  |
| `monstres/manticore.webp` | Manticore | Manticore | L06 p.333 | 1 |  |
| `monstres/merwyrm.webp` | Merwyrm | Merwyrm | L11 p.88, L25 p.145 | 2 |  |
| `monstres/mobilier-anime-grand.webp` | Mobilier animé, grand | Animated Furniture, Large | L21 p.24 | 1 |  |
| `monstres/mobilier-anime-moyen.webp` | Mobilier animé, moyen | Animated Furniture, Medium | L21 p.24 | 1 |  |
| `monstres/mobilier-anime-petit.webp` | Mobilier animé, petit | Animated Furniture, Small | L21 p.24 | 1 |  |
| `monstres/monture-demigriffon.webp` | Monture demigriffon | Demigryph Mount | L13 p.109 | 1 |  |
| `monstres/naiades.webp` | Naïades | Naiads | L26 p.88 | 1 |  |
| `monstres/pegase.webp` | Pégase | Pegasus | L06 p.334 | 1 |  |
| `monstres/phenix-coeur-de-givre.webp` | Phénix cœur-de-givre | Frostheart Phoenix | L14 p.84 | 1 |  |
| `monstres/phenix-fleche-de-flamme.webp` | Phénix flèche-de-flamme | Flamespyre Phoenix | L14 p.83 | 1 |  |
| `monstres/pieuvre-des-tourbieres.webp` | Pieuvre des tourbières | Bog Octopus | L06 p.328 | 1 |  |
| `monstres/preyton.webp` | Preyton | Preyton | L11 p.61 | 1 |  |
| `monstres/purple-skullback-araignee.webp` | Purple Skullback araignée | Purple Skullback Spider | L12 p.99 | 1 |  |
| `monstres/roc-plume-vive.webp` | Roc plume-vive | Swiftfeather Roc | L07 p.89, L14 p.47 | 2 |  |
| `monstres/sangsues-geantes.webp` | Sangsues géantes | Giant Leeches | L26 p.86 | 1 |  |
| `monstres/siren.webp` | Siren | Siren | L11 p.86 | 1 |  |
| `monstres/skin-loup.webp` | Skin loup | Skin Wolf | L11 p.70 | 1 |  |
| `monstres/syreen.webp` | Syreen | Syreen | L25 p.145 | 1 |  |
| `monstres/things-from-dead-wood.webp` | Things From Dead Wood | Things From the Dead Wood | L11 p.37 | 1 |  |
| `monstres/triton.webp` | Triton | Triton | L25 p.149 | 1 |  |
| `monstres/troll.webp` | Troll | Troll | L06 p.335 | 1 |  |
| `monstres/troll-des-rivieres-megere.webp` | Troll des rivières mégère | River Troll Hag | L11 p.49 | 1 |  |
| `monstres/ver-aveugle-pale.webp` | Ver aveugle pâle | Pallid Blindwyrm | L07 p.169 | 1 |  |
| `monstres/wyvern.webp` | Wyvern | Wyvern | L11 p.32 | 1 |  |

### `peuples/elfes` (3)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `peuples/elfes/elfe-haut-et-sylvain.webp` | Elfe (haut et sylvain) | High Elf or Wood Elf | L06 p.320 | 1 |  |
| `peuples/elfes/rejeton-de-mathlann.webp` | Rejeton de Mathlann | Scion of Mathlann | L14 p.31 | 1 |  |
| `peuples/elfes/rejeton-de-mathlann-sentinelle.webp` | Rejeton de Mathlann — Sentinelle | Scion of Mathlann Sentinel | L14 p.31 | 1 |  |

### `peuples/gnomes` (1)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `peuples/gnomes/gnome.webp` | Gnome | Gnome | L06 p.323 | 1 |  |

### `peuples/halflings` (2)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `peuples/halflings/halfling.webp` | Halfling | Halfling | L06 p.319 | 1 |  |
| `peuples/halflings/halfling-voleur.webp` | Halfling voleur | Halfling Thief | L06 p.322 | 1 |  |

### `peuples/humains` (76)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `peuples/humains/agitateur-bronze-2.webp` | Agitateur — Bronze 2 | Agitator — Brass 2 | L21 p.22 | 1 |  |
| `peuples/humains/altdorfois-meurtrier.webp` | Altdorfois meurtrier | Murderous Altdorfer | L21 p.22 | 1 |  |
| `peuples/humains/ancien-interrogateur.webp` | Ancien interrogateur | Former Interrogator | L22 p.94 | 1 |  |
| `peuples/humains/apprenti-artisan-humain-ancien-serviteur-bronze-2.webp` | Apprenti artisan humain, ancien serviteur (Bronze 2) | Human Apprentice Artisan, Former Servant (Brass 2) | L26 p.107 | 1 |  |
| `peuples/humains/assassins-argent-1.webp` | Assassins (Argent 1) | Assassins (Silver 1) | L24 p.51 | 1 |  |
| `peuples/humains/athlete.webp` | Athlete | Athlete | L19 p.143 | 1 |  |
| `peuples/humains/batelier-humain-argent-2.webp` | Batelier humain (Argent 2) | Human Boatman (Silver 2) | L26 p.106 | 1 |  |
| `peuples/humains/boatmen-argent-2.webp` | Boatmen (Argent 2) | Boatmen (Silver 2) | L24 p.21 | 1 |  |
| `peuples/humains/brute.webp` | Brute | Brute | L19 p.143 | 1 |  |
| `peuples/humains/cannon-et-mortar-students-etudiant-engineers-bronze-4.webp` | Cannon et Mortar Students — Étudiant Engineers (Bronze 4) | Cannon and Mortar Students — Student Engineers (Brass 4) | L24 p.50 | 1 |  |
| `peuples/humains/charlatan.webp` | Charlatan | Charlatan | L04 p.49 | 1 |  |
| `peuples/humains/chasseur-de-primes-type.webp` | Chasseur de primes type | A Typical Bounty Hunter | L04 p.108 | 1 |  |
| `peuples/humains/chef-de-hors-la-loi.webp` | Chef de hors-la-loi | Outlaw Chief | L04 p.103 | 1 |  |
| `peuples/humains/cochers-argent-2.webp` | Cochers (Argent 2) | Coachmen (Silver 2) | L24 p.21 | 1 |  |
| `peuples/humains/commandant-de-la-frontiere-sergent-de-cavalerie-humain-or-1.webp` | Commandant de la frontière — Sergent de cavalerie humain (Or 1) | Frontier Commander — Human Cavalry Sergeant (Gold 1) | L26 p.111 | 1 |  |
| `peuples/humains/courtier-experimente-maitre-marchand-humain-or-1.webp` | Courtier expérimenté — Maître marchand humain (Or 1) | Experienced Broker — Human Master Merchant (Gold 1) | L26 p.109 | 1 |  |
| `peuples/humains/docteur-argent-5.webp` | Docteur (Argent 5) | Doktor — Silver 5 | L13 p.114 | 1 |  |
| `peuples/humains/doktor-argent-5.webp` | Doktor — Argent 5 | Doktor — Silver 5 | L25 p.127 | 1 |  |
| `peuples/humains/duchesse-agee-magnat-humain-or-5.webp` | Duchesse âgée — Magnat humain (Or 5) | Elderly Duchess — Human Magnate (Gold 5) | L26 p.109 | 1 |  |
| `peuples/humains/eclaireur-local-argent-1.webp` | Éclaireur local (Argent 1) | Local Scout — Silver 1 | L13 p.113 | 1 |  |
| `peuples/humains/faiseur-d-affaires-vif-d-esprit-marchand-humain-argent-5.webp` | Faiseur d’affaires vif d’esprit — Marchand humain (Argent 5) | Quick-Witted Dealmaker — Human Merchant (Silver 5) | L26 p.109 | 1 |  |
| `peuples/humains/faussaire.webp` | Faussaire | Forger | L04 p.47 | 1 |  |
| `peuples/humains/fleches-noires-hors-la-loi-bronze-2.webp` | Flèches noires — Hors-la-loi (Bronze 2) | Black Arrows — Outlaws (Brass 2) | L23 p.99 | 1 |  |
| `peuples/humains/garde-noire-de-morr-chevalier.webp` | Garde noire de Morr (chevalier) | Black Guard of Morr (Knight) | L04 p.34 | 1 |  |
| `peuples/humains/gardes.webp` | Gardes | Guards | L21 p.79 | 1 |  |
| `peuples/humains/gardes-du-corps-a-foison-sentinelles-humaines-argent-1.webp` | Gardes du corps à foison — Sentinelles humaines (Argent 1) | Bodyguards Aplenty — Human Sentries (Silver 1) | L23 p.96 | 1 |  |
| `peuples/humains/gardes-du-corps-et-men-at-arms-argent-3.webp` | Gardes du corps et Men-at-Arms (Argent 3) | Bodyguards and Men-at-Arms (Silver 3) | L24 p.18 | 1 |  |
| `peuples/humains/general-de-salon-conseiller-humain-ancien-officier-or-1.webp` | Général de salon — Conseiller humain, ancien officier (Or 1) | Armchair General — Human Counsellor, Former Officer (Gold 1) | L26 p.111 | 1 |  |
| `peuples/humains/handmaids-et-serviteurs-argent-3.webp` | Handmaids et serviteurs (Argent 3) | Handmaids and Servants (Silver 3) | L24 p.18 | 1 |  |
| `peuples/humains/homme-du-guet.webp` | Homme du guet | Watchman | L04 p.93 | 1 |  |
| `peuples/humains/hors-la-loi.webp` | Hors-la-loi | Outlaw | L04 p.103 | 1 |  |
| `peuples/humains/hubkind-s-mob-bronze-4.webp` | Hubkind's Mob (Bronze 4) | Hubkind's Mob (Brass 4) | L24 p.53 | 1 |  |
| `peuples/humains/huffer-argent-1.webp` | Huffer — Argent 1 | Huffer — Silver 1 | L25 p.127 | 1 |  |
| `peuples/humains/humain.webp` | Humain | Human | L06 p.319 | 1 |  |
| `peuples/humains/jeune-loup-rejeton-humain-or-1.webp` | Jeune loup — Rejeton humain (Or 1) | Young Blood — Human Scion (Gold 1) | L26 p.110 | 1 |  |
| `peuples/humains/jeune-noble-or-1.webp` | Jeune noble (Or 1) | Young Noble (Gold 1) | L24 p.53 | 1 |  |
| `peuples/humains/kappan-s-racketeers-voyous-bronze-3.webp` | Kappan's Racketeers — Voyous (Bronze 3) | Kappan's Racketeers — Thugs (Brass 3) | L24 p.33 | 1 |  |
| `peuples/humains/la-sentinelle-de-la-milice-ancien-villageois-argent-1.webp` | La sentinelle de la milice, ancien villageois (Argent 1) | The Militia Sentry, Former Villager (Silver 1) | L18 p.116 | 1 |  |
| `peuples/humains/magistrates-judges-or-2.webp` | Magistrates — Judges (Or 2) | Magistrates — Judges (Gold 2) | L24 p.35 | 1 |  |
| `peuples/humains/maquerelle.webp` | Maquerelle | Bawd | L04 p.48 | 1 |  |
| `peuples/humains/marchand-humain.webp` | Marchand humain | Human Merchant | L06 p.321 | 1 |  |
| `peuples/humains/marin-argent-3.webp` | Marin — Argent 3 | Sailor — Silver 3 | L25 p.127 | 1 |  |
| `peuples/humains/matelot-fluvial-humain-argent-1.webp` | Matelot fluvial humain (Argent 1) | Human Boat-Hand (Silver 1) | L26 p.106 | 1 |  |
| `peuples/humains/mercenaire-aguerri-argent-3.webp` | Mercenaire aguerri (Argent 3) | Seasoned Mercenary — Silver 3 | L13 p.113, L25 p.127 | 2 |  |
| `peuples/humains/milicien-humain.webp` | Milicien humain | Human Watchman | L06 p.321 | 1 |  |
| `peuples/humains/musicians-argent-1.webp` | Musicians (Argent 1) | Musicians (Silver 1) | L24 p.49 | 1 |  |
| `peuples/humains/naufrageur-humain-typique.webp` | Naufrageur humain typique | Typical Human Wrecker | L26 p.80 | 1 |  |
| `peuples/humains/negociant-parvenu-et-odieux-marchand-humain-argent-5.webp` | Négociant parvenu et odieux — Marchand humain (Argent 5) | Self Made, Obnoxious Trader — Human Merchant (Silver 5) | L26 p.108 | 1 |  |
| `peuples/humains/noble-serviteurs-or-2.webp` | Noble serviteurs (Or 2) | Noble Servants (Gold 2) | L24 p.48 | 1 |  |
| `peuples/humains/novice-argent-1.webp` | Novice — Argent 1 | Landsman — Silver 1 | L25 p.127 | 1 |  |
| `peuples/humains/nulner-miliciens-argent-1.webp` | Nulner miliciens (Argent 1) | Nulner Watchmen (Silver 1) | L24 p.53 | 1 |  |
| `peuples/humains/officier-argent-5.webp` | Officier — Argent 5 | Officer — Silver 5 | L25 p.127 | 1 |  |
| `peuples/humains/operagoer-argent-3.webp` | Operagoer (Argent 3) | Operagoer (Silver 3) | L24 p.53 | 1 |  |
| `peuples/humains/palace-gardes-or-2.webp` | Palace gardes (Or 2) | Palace Guards (Gold 2) | L24 p.49 | 1 |  |
| `peuples/humains/performers-argent-1.webp` | Performers (Argent 1) | Performers (Silver 1) | L24 p.49 | 1 |  |
| `peuples/humains/porteur-argent-1.webp` | Porteur (Argent 1) | Porter — Silver 1 | L13 p.114 | 1 |  |
| `peuples/humains/proprietaire-de-planque-citadin.webp` | Propriétaire de planque (citadin) | Safe House Owner (Townsman) | L04 p.49 | 1 |  |
| `peuples/humains/racketteur.webp` | Racketteur | Racketeer | L04 p.48 | 1 |  |
| `peuples/humains/receleur.webp` | Receleur | Fence | L04 p.47 | 1 |  |
| `peuples/humains/scribe-argent-2.webp` | Scribe (Argent 2) | Scribe — Silver 2 | L13 p.114 | 1 |  |
| `peuples/humains/sergent-de-la-garde.webp` | Sergent de la garde | Guard Sergent | L21 p.79 | 1 |  |
| `peuples/humains/sergent-du-guet.webp` | Sergent du guet | Watch Sergeant | L04 p.93 | 1 |  |
| `peuples/humains/sergent-du-guet-argent-1.webp` | Sergent du guet (Argent 1) | Watch Sergeant (Silver 1) | L24 p.53 | 1 |  |
| `peuples/humains/servants-cleaners-et-similar-menials-bronze-3.webp` | Servants, Cleaners, et Similar — Menials (Bronze 3) | Servants, Cleaners, and Similar — Menials (Brass 3) | L24 p.22 | 1 |  |
| `peuples/humains/serviteur-humain-argent-3.webp` | Serviteur humain (Argent 3) | Human Servant (Silver 3) | L26 p.107 | 1 |  |
| `peuples/humains/serviteurs-argent-1.webp` | Serviteurs (Argent 1) | Servants (Silver 1) | L24 p.49 | 1 |  |
| `peuples/humains/soeur-type-soeur-shallya-bronze-4.webp` | Sœur type — Sœur (Shallya) (Bronze 4) | Typical Sister — Nun (Shallya) (Brass 4) | L01 p.76 | 1 |  |
| `peuples/humains/soldat.webp` | Soldat | Soldier | L21 p.42 | 1 |  |
| `peuples/humains/soldat-de-l-avant-garde.webp` | Soldat de l’avant-garde | Vanguard Soldier | L21 p.42 | 1 |  |
| `peuples/humains/sorcier.webp` | Sorcier | Wizard | L18 p.118, L22 p.119 | 2 |  |
| `peuples/humains/stagehands-argent-1.webp` | Stagehands (Argent 1) | Stagehands (Silver 1) | L24 p.49 | 1 |  |
| `peuples/humains/villageois-bronze-4.webp` | Villageois (Bronze 4) | Villager (Brass 4) | L18 p.114 | 1 |  |
| `peuples/humains/villageois-typique-villageois-bronze-3.webp` | Villageois typique — Villageois (Bronze 3) | Typical Villager — Villager (Brass 3) | L18 p.116 | 1 |  |
| `peuples/humains/voyou-des-quais.webp` | Voyou des quais | Dockside Thug | L09 p.86 | 1 |  |
| `peuples/humains/voyou-humain.webp` | Voyou humain | Human Thug | L06 p.322 | 1 |  |
| `peuples/humains/voyous.webp` | Voyous | Thugs | L22 p.95 | 1 |  |

### `peuples/nains` (2)

| Fichier proposé | Nom français | Nom anglais | Livres et pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `peuples/nains/joueur-nain-argent-2.webp` | Joueur nain (Argent 2) | Dwarf Gambler (Silver 2) | L26 p.110 | 1 |  |
| `peuples/nains/nain.webp` | Nain | Dwarf | L06 p.320, L19 p.143 | 2 |  |

## Individus nommés

PNJ de scénario, monstres uniques et PJ prétirés, par livre de première apparition.

### L01 — Archives of the Empire 2 (13)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l01/isrogdal-l-urgent-ogre-protagoniste-ancien-pugiliste-argent-1.webp` | Isrogdal l’Urgent — Ogre protagoniste, ancien pugiliste (Argent 1) | Isrogdal the Urgent — Ogre Protagonist, Former Pugilist (Silver 1) | L01 p.14 | 1 |  |
| `pnj/l01/ugrik-le-perdu-ogre-hors-la-loi-bronze-2.webp` | Ugrik le Perdu — Ogre hors-la-loi (Bronze 2) | Ugrik the Lost — Ogre Outlaw (Brass 2) | L01 p.14 | 1 |  |
| `pnj/l01/artur-hammerfoot-artisan-ogre.webp` | Artur Hammerfoot — Artisan ogre | Artur Hammerfoot — Ogre Artisan | L01 p.26 | 1 |  |
| `pnj/l01/nazzaalta-talltale-docker-ogre.webp` | Nazzaalta Talltale — Docker ogre | Nazzaalta Talltale — Ogre Stevedore | L01 p.26 | 1 |  |
| `pnj/l01/margaret-von-aschendorf-abbesse-shallya-argent-2.webp` | Margaret von Aschendorf — Abbesse (Shallya) (Argent 2) | Margaret von Aschendorf — Abbess (Shallya) (Silver 2) | L01 p.74 | 1 |  |
| `pnj/l01/anna-lise-levertske-soeur-ancienne-apothicaire-bronze-4.webp` | Anna-Lise Levertske — Sœur, ancienne apothicaire (Bronze 4) | Anna-Lise Levertske — Nun, Former Apothecary (Brass 4) | L01 p.75 | 1 |  |
| `pnj/l01/clementine-clausewitz-soeur-shallya-bronze-4.webp` | Clementine Clausewitz — Sœur (Shallya) (Bronze 4) | Clementine Clausewitz — Nun (Shallya) (Brass 4) | L01 p.75 | 1 |  |
| `pnj/l01/marie-duvallier-soeur-shallya-ancienne-medecin-bronze-4.webp` | Marie Duvallier — Sœur (Shallya), ancienne médecin (Bronze 4) | Marie Duvallier — Nun (Shallya), Former Physician (Brass 4) | L01 p.75 | 1 |  |
| `pnj/l01/hanna-bratsch-auxiliaire-ancienne-sergente-bronze-3.webp` | Hanna Bratsch — Auxiliaire, ancienne sergente (Bronze 3*) | Hanna Bratsch — Attendant, Former Sergeant (Brass 3*) | L01 p.76 | 1 |  |
| `pnj/l01/erzbet-wegener-patiente-bronze-0.webp` | Erzbet Wegener — Patiente (Bronze 0) | Erzbet Wegener — Patient (Brass 0) | L01 p.77 | 1 |  |
| `pnj/l01/adalmann-von-hopfberg-seigneur-noble-or-7.webp` | Adalmann von Hopfberg — Seigneur noble (Or 7) | Adalmann von Hopfberg — Noble Lord (Gold 7) | L01 p.78 | 1 |  |
| `pnj/l01/isabella-voyante-bronze-4.webp` | Isabella — Voyante (Bronze 4) | Isabella — Seer (Brass 4) | L01 p.79 | 1 |  |
| `pnj/l01/richter-kless-professeur-or-1.webp` | Richter Kless — Professeur (Or 1) | Richter Kless — Professor (Gold 1) | L01 p.80 | 1 |  |

### L02 — Archives of the Empire 3 (6)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l02/grafina-griselda-magnat-humain.webp` | Grafina Griselda — Magnat humain | Grafina Griselda — Human Magnate | L02 p.30 | 1 |  |
| `pnj/l02/seigneur-adalbert-knopp-inzel-premier-humain-chevalier-et-espion.webp` | Seigneur Adalbert Knopp-Inzel — Premier humain — Chevalier (et espion) | Lord Adalbert Knopp-Inzel — Human First — Knight (and Spy) | L02 p.90 | 1 |  |
| `pnj/l02/frere-samhel-pretre-de-morr-humain.webp` | Frère Samhel — Prêtre de Morr humain | Brother Samhel — Human Priest of Morr | L02 p.92 | 1 |  |
| `pnj/l02/ella-terenz-escroc-humain.webp` | Ella Terenz — Escroc humain | Ella Terenz — Human Con Artist | L02 p.93 | 1 |  |
| `pnj/l02/leonard-ecuyer-humain.webp` | Leonard — Écuyer humain | Leonard — Human Squire | L02 p.94 | 1 |  |
| `pnj/l02/ridrek-blackhelm-artiste-nain-et-espion.webp` | Ridrek Blackhelm — Artiste nain (et espion) | Ridrek Blackhelm — Dwarf Entertainer — (and Spy) | L02 p.94 | 1 |  |

### L03 — Archives of the Empire Volume 1 (13)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l03/misodoctakleidist-doc-ashfield-soldat-argent-3.webp` | Misodoctakleidist ‘doc’ Ashfield — Soldat (Argent 3) | Misodoctakleidist ‘doc’ Ashfield — Soldier (Silver 3) | L03 p.23 | 1 |  |
| `pnj/l03/thomasina-tina-brambledown-maitre-de-barge-argent-3.webp` | Thomasina ‘tina’ Brambledown — Maître de barge (Argent 3) | Thomasina ‘tina’ Brambledown — Bargeswain (Silver 3) | L03 p.24 | 1 |  |
| `pnj/l03/luitpoldstrasse-louis-lostpockets-maitre-mendiant-bronze-4.webp` | Luitpoldstrasse ‘louis’ Lostpockets — Maître mendiant (Bronze 4) | Luitpoldstrasse ‘louis’ Lostpockets — Master Beggar (Brass 4) | L03 p.27 | 1 |  |
| `pnj/l03/belliquotious-bella-lowhaven-iv-racketteur-bronze-5.webp` | Belliquotious ‘bella’ Lowhaven Iv — Racketteur (Bronze 5) | Belliquotious ‘bella’ Lowhaven Iv — Racketeer (Brass 5) | L03 p.28 | 1 |  |
| `pnj/l03/suffonsification-suffy-rumster-lvi-apprenti-artisan-bronze-2.webp` | Suffonsification ‘suffy’ Rumster Lvi — Apprenti artisan (Bronze 2) | Suffonsification ‘suffy’ Rumster Lvi — Apprentice Artisan (Brass 2) | L03 p.29 | 1 |  |
| `pnj/l03/spoondrift-spoony-skelfsider-pilleur-de-tombes-bronze-3.webp` | Spoondrift « spoony » Skelfsider — Pilleur de tombes (Bronze 3) | Spoondrift ‘spoony’ Skelfsider – Grave — Robber (Brass 3) | L03 p.30 | 1 |  |
| `pnj/l03/thelonius-hardcastle-monkenbridge-thorncobble-xii-heritier-or-1.webp` | Thelonius Hardcastle Monkenbridge — Thorncobble XII — Héritier (Or 1) | Thelonius Hardcastle Monkenbridge — Thorncobble Xii – Scion (Gold 1) | L03 p.31 | 1 |  |
| `pnj/l03/alrik-skagsson-inquisiteur-argent-5.webp` | Alrik Skagsson — Inquisiteur (Argent 5) | Alrik Skagsson – Inquisitor (Silver 5) | L03 p.56 | 1 |  |
| `pnj/l03/karstin-largsdottir-agent-or-1.webp` | Karstin Largsdottir – agent (Or 1) | Karstin Largsdottir – Agent (Gold 1) | L03 p.56 | 1 |  |
| `pnj/l03/thyk-hurgarsson-compagnon-de-guilde-argent-5.webp` | Thyk Hurgarsson — Compagnon de guilde (Argent 5) | Thyk Hurgarsson – Fellow (Silver 5) | L03 p.57 | 1 |  |
| `pnj/l03/volund-sliverscar-ingenieur-agree-or-2.webp` | Volund Sliverscar — Ingénieur agréé (Or 2) | Volund Sliverscar — Chartered Engineer (Gold 2) | L03 p.62 | 1 |  |
| `pnj/l03/gurniksson-hammerback-contremaitre-mineur.webp` | Gurniksson Hammerback — Contremaître mineur | Gurniksson Hammerback – Miner Foreman | L03 p.63 | 1 |  |
| `pnj/l03/ragni-thorisson-officier-or-1.webp` | Ragni Thorisson – officier (Or 1) | Ragni Thorisson – Officer (Gold 1) | L03 p.63 | 1 |  |

### L04 — Deft Steps, Light Fingers (5)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l04/august-sternwachter.webp` | August Sternwachter | August Sternwachter | L04 p.55 | 1 |  |
| `pnj/l04/albrecht-the-fish-chef-de-bande.webp` | Albrecht ‘the Fish’ — Chef de bande | Albrecht ‘the Fish’ — Gang Boss | L04 p.64 | 1 |  |
| `pnj/l04/gunna-von-sperren-reine-des-contrebandiers.webp` | Gunna von Sperren — Reine des contrebandiers | Gunna von Sperren — Smuggler King | L04 p.65 | 1 |  |
| `pnj/l04/pere-pedragar-pretre-de-taal.webp` | Père Pedragar, prêtre de Taal | Father Pedragar, Priest of Taal | L04 p.83 | 1 |  |
| `pnj/l04/brunner.webp` | Brunner | Brunner | L04 p.111 | 1 |  |

### L06 — Livre de base V5 (1)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l06/ungrakk-seigneur-bete-gor-commandant.webp` | Ungrakk — Seigneur-bête gor (Commandant) | Ungrakk — Gor Beastlord (Commander) | L06 p.355 | 1 |  |

### L07 — Lustria (13)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l07/adella-aux-mille-bouches.webp` | Adella aux Mille Bouches | Adella of the Thousand Mouths | L07 p.42 | 1 |  |
| `pnj/l07/soren-hoarder-vitki.webp` | Soren Hoarder — Vitki | Soren Hoarder — Vitki | L07 p.44 | 1 |  |
| `pnj/l07/uthl-kritchnaak-heraut-exalte-de-nurgle.webp` | Uthl’Kritchnaak — Héraut exalté de Nurgle | Uthl’Kritchnaak — Exalted Herald of Nurgle | L07 p.61 | 1 |  |
| `pnj/l07/seigneur-skrolk-seigneur-de-la-peste-skaven.webp` | Seigneur Skrolk — Seigneur de la peste skaven | Lord Skrolk — Skaven Plaguelord | L07 p.62 | 1 |  |
| `pnj/l07/black-jens-chancelier-goule.webp` | Black Jens — Chancelier goule | Black Jens — Ghoul Chancellor | L07 p.67 | 1 |  |
| `pnj/l07/luthor-harkon-vampire-archi-grand-commodore-et-empereur-autoproclame.webp` | Luthor Harkon — Vampire archi-grand — Commodore et empereur autoproclamé | Luthor Harkon — Vampire Arch-Grand — Commodore and Self-Declared Emperor | L07 p.73 | 1 |  |
| `pnj/l07/l-epouse-de-la-saumure-sirene-et-sorciere.webp` | L’Épouse de la saumure — Sirène et sorcière | The Brine Wife — Syreen and Witch | L07 p.75 | 1 |  |
| `pnj/l07/seigneur-finrian.webp` | Seigneur Finrian | Lord Finrian | L07 p.87 | 1 |  |
| `pnj/l07/lokhir-fellheart.webp` | Lokhir Fellheart | Lokhir Fellheart | L07 p.90 | 1 |  |
| `pnj/l07/tzku-ta.webp` | Tzku’Ta | Tzku’Ta | L07 p.113 | 1 |  |
| `pnj/l07/anomoq-pretre-skink-de-sotek.webp` | Anomoq — Prêtre skink de Sotek | Anomoq — Skink Priest of Sotek | L07 p.141 | 1 |  |
| `pnj/l07/crotaz-l-veteran-balafre.webp` | Crotaz’L, vétéran balafré | Crotaz’L, Scar Veteran | L07 p.147 | 1 |  |
| `pnj/l07/tlat-l-l-enigme-protecteur-coatl.webp` | Tlat’L l’Énigme, protecteur coatl | Tlat’L the Enigma, Coatl Protector | L07 p.155 | 1 |  |

### L09 — Temple of Spite (22)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l09/capitaine-valerion-tremendros-officier-de-haute-naissance.webp` | Capitaine Valerion Tremendros — Officier de haute naissance | Captain Valerion Tremendros — Dark Elf Highborn Officer | L09 p.72 | 1 |  |
| `pnj/l09/damina-hroska-assassine-de-basse-naissance-citadine.webp` | Damina Hroska — Assassine de basse naissance (citadine) | Damina Hroska — Dark Elf City Lowborn Assassin | L09 p.73 | 1 |  |
| `pnj/l09/hermizor-de-la-maison-arguental-suite-de-haute-naissance.webp` | Hermizor de la maison Arguental — Suite de haute naissance | Hermizor of House Arguental — Dark Elf Highborn Entourage | L09 p.74 | 1 |  |
| `pnj/l09/jareth-brackblood-capitaine-pillard.webp` | Jareth Brackblood — Capitaine pillard | Jareth Brackblood — Dark Elf Reaver Captain | L09 p.80 | 1 |  |
| `pnj/l09/demeth-soulbane-corsaire.webp` | Demeth Soulbane — Corsaire | Demeth Soulbane — Dark Elf Corsair | L09 p.81 | 1 |  |
| `pnj/l09/zarugh-kelvain-equipage-de-navire.webp` | Zarugh Kelvain — Équipage de navire | Zarugh Kelvain — Dark Elf Ship’S Crew | L09 p.82 | 1 |  |
| `pnj/l09/harzeth-duskmantle-maitre-espion.webp` | Harzeth Duskmantle — Maître espion | Harzeth Duskmantle — Dark Elf Spymaster | L09 p.87 | 1 |  |
| `pnj/l09/selin-ebonspite-agent.webp` | Selin Ebonspite — Agent | Selin Ebonspite — Dark Elf Agent | L09 p.88 | 1 |  |
| `pnj/l09/daleathra-bladeborn-agente.webp` | Daleathra Bladeborn — Agente | Daleathra Bladeborn — Dark Elf Agent | L09 p.89 | 1 |  |
| `pnj/l09/gref-ombre-sang-de-basse-naissance-des-terres-sauvages.webp` | Gref — Ombre-sang de basse naissance (des terres sauvages) | Gref — Dark Elf Wilderness Lowborn Bloodshade | L09 p.95 | 1 |  |
| `pnj/l09/kalimel-nightpiercer-eclaireur.webp` | Kalimel Nightpiercer — Éclaireur | Kalimel Nightpiercer — Dark Elf Scout | L09 p.96 | 1 |  |
| `pnj/l09/samuril-meurlith-sorciere-supreme.webp` | Samuril Meurlith — Sorcière suprême | Samuril Meurlith — Dark Elf Supreme Sorceress | L09 p.97 | 1 |  |
| `pnj/l09/scorath-scaleflayer-haut-maitre-des-betes.webp` | Scorath Scaleflayer — Haut maître des bêtes | Scorath Scaleflayer — High Beastmaster | L09 p.103 | 1 |  |
| `pnj/l09/kelrathi-maitre-des-betes.webp` | Kelrathi — Maître des bêtes | Kelrathi — Dark Elf Beastmaster | L09 p.104 | 1 |  |
| `pnj/l09/nyandra-filvanir-capitaine-pillard-de-basse-naissance-citadine.webp` | Nyandra Filvanir — Capitaine pillard de basse naissance (citadine) | Nyandra Filvanir — Dark Elf City Lowborn Reaver Captain | L09 p.110 | 1 |  |
| `pnj/l09/anuidethar-veilthorn-facteur-marchand.webp` | Anuidethar Veilthorn — Facteur (marchand) | Anuidethar Veilthorn — Dark Elf Factor (Merchant) | L09 p.111 | 1 |  |
| `pnj/l09/selthira-heartrender-sorciere-elfe-de-basse-naissance-citadine.webp` | Selthira Heartrender — Sorcière-elfe de basse naissance (citadine) | Selthira Heartrender — Dark Elf Lowborn (City) Witch Elf | L09 p.116 | 1 |  |
| `pnj/l09/haidrath-megere-de-basse-naissance-des-terres-sauvages.webp` | Haidrath — Mégère de basse naissance (des terres sauvages) | Haidrath — Dark Elf Lowborn (Wilderness) Hag | L09 p.117 | 1 |  |
| `pnj/l09/hulreth-disciple-de-khaine-de-haute-naissance-pretre-guerrier.webp` | Hulreth — Disciple de Khaine de haute naissance (prêtre guerrier) | Hulreth — Dark Elf Highborn — Disciple of Khaine (Warrior Priest) | L09 p.118 | 1 |  |
| `pnj/l09/duriath-helbane-maitre-de-flotte.webp` | Duriath Helbane — Maître de flotte | Duriath Helbane — the Fleetmaster | L09 p.122 | 1 |  |
| `pnj/l09/kheitalla-megere-de-la-mort.webp` | Kheitalla — Mégère de la mort | Death Hag Kheitalla | L09 p.124 | 1 |  |
| `pnj/l09/kernethar-grimwitch-sorcier-fugitif.webp` | Kernethar Grimwitch — Sorcier fugitif | Kernethar Grimwitch — Fugitive Sorcerer | L09 p.126 | 1 |  |

### L10 — Sylvania, The Cursed County (24)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l10/comte-alberich-v-haupt-anderssen-electeur-imperial-magnat-noble.webp` | Comte Alberich V Haupt-Anderssen — Électeur impérial, magnat noble | Count Alberich V Haupt-Anderssen — Imperial Elector, Noble Magnate | L10 p.9 | 1 |  |
| `pnj/l10/fargal-kraggzin-capitaine-rodeur-nain.webp` | Fargal Kraggzin — Capitaine rôdeur nain | Fargal Kraggzin — Dwarf Ranger Captain | L10 p.12 | 1 |  |
| `pnj/l10/werther-von-hornau-chancelier-humain.webp` | Werther von Hornau — Chancelier humain | Werther von Hornau — Human Chancellor | L10 p.13 | 1 |  |
| `pnj/l10/giancarlo-cacciatore-maitre-chasseur-humain.webp` | Giancarlo Cacciatore — Maître chasseur humain | Giancarlo Cacciatore — Human Master Hunter | L10 p.14 | 1 |  |
| `pnj/l10/elsbeth-blattner-sorciere-humaine.webp` | Elsbeth Blattner — Sorcière humaine | Elsbeth Blattner — Human Wizard | L10 p.15 | 1 |  |
| `pnj/l10/frederick-van-hal.webp` | Frederick van Hal | Frederick van Hal | L10 p.50 | 1 |  |
| `pnj/l10/graug-le-terrible.webp` | Graug le Terrible | Graug the Terrible | L10 p.51 | 1 |  |
| `pnj/l10/arlo-dunne-paysan-humain.webp` | Arlo Dunne — Paysan humain | Arlo Dunne — Human Peasant | L10 p.79 | 1 |  |
| `pnj/l10/jimmi-greenleaf-artisan-halfling.webp` | Jimmi Greenleaf — Artisan halfling | Jimmi Greenleaf — Halfling Artisan | L10 p.80 | 1 |  |
| `pnj/l10/niels-vorberren-patrouilleur-routier-humain.webp` | Niels Vorberren — Patrouilleur routier humain | Niels Vorberren — Human Roadwarden | L10 p.81 | 1 |  |
| `pnj/l10/sihastrul-mystique-humain.webp` | Sihastrul — Mystique humain | Sihastrul — Human Mystic | L10 p.82 | 1 |  |
| `pnj/l10/gretchen-beirne-sorciere-de-haie-humaine.webp` | Gretchen Beirne — Sorcière de haie humaine | Gretchen Beirne — Human Hedge Witch | L10 p.83 | 1 |  |
| `pnj/l10/trevna-fane-serviteur-humain.webp` | Trevna Fane — Serviteur humain | Trevna Fane — Human Servant | L10 p.84 | 1 |  |
| `pnj/l10/comte-petr-von-stolpe-noble.webp` | Comte Petr von Stolpe — Noble | Count Petr von Stolpe — Noble | L10 p.85 | 1 |  |
| `pnj/l10/gabriella-von-bundebad-grande-vampire.webp` | Gabriella von Bundebad — Grande vampire | Gabriella von Bundebad — Vampire Grandee | L10 p.86 | 1 |  |
| `pnj/l10/matthias-primvik-percepteur-humain.webp` | Matthias Primvik — Percepteur humain | Matthias Primvik — Human Tax Collector | L10 p.87 | 1 |  |
| `pnj/l10/pere-tantlus-radu-pretre-humain.webp` | Père Tantlus Radu — Prêtre humain | Father Tantlus Radu — Human Priest | L10 p.88 | 1 |  |
| `pnj/l10/ranolf-quickfingers-rodeur-humain.webp` | Ranolf Quickfingers — Rôdeur humain | Ranolf Quickfingers — Human Prowler | L10 p.89 | 1 |  |
| `pnj/l10/otto-et-hendrik-vogel-clercs-humains.webp` | Otto et Hendrik Vogel — Clercs humains | Otto and Hendrik Vogel — Human Clerk | L10 p.90 | 1 |  |
| `pnj/l10/erich-frohlich-villageois-humain.webp` | Erich Frohlich — Villageois humain | Erich Frohlich — Human Villager | L10 p.91 | 1 |  |
| `pnj/l10/seiren-walburg-pretre-humain.webp` | Seiren Walburg — Prêtre humain | Seiren Walburg — Human Priest | L10 p.92 | 1 |  |
| `pnj/l10/emil-hartwig-contremaitre-humain.webp` | Emil Hartwig — Contremaître humain | Emil Hartwig — Human Foreman | L10 p.93 | 1 |  |
| `pnj/l10/andrei-van-hal-sentinelle-humaine.webp` | Andrei van Hal — Sentinelle humaine | Andrei van Hal — Human Sentry | L10 p.94 | 1 |  |
| `pnj/l10/grimes-chef-de-bande-humain.webp` | Grimes — Chef de bande humain | Grimes — Human Gang Boss | L10 p.95 | 1 |  |

### L11 — The Imperial Zoo (19)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l11/river-s-shadow.webp` | River’S Shadow | The River’S Shadow | L11 p.10 | 1 |  |
| `pnj/l11/raukos.webp` | Raukos | Raukos | L11 p.17 | 1 |  |
| `pnj/l11/ol-gribbleback.webp` | Ol’ Gribbleback | Ol’ Gribbleback | L11 p.19 | 1 |  |
| `pnj/l11/krag-breaker.webp` | Krag-Breaker | Krag-Breaker | L11 p.25 | 1 |  |
| `pnj/l11/caledair-scythe-de-feu.webp` | Caledair, Scythe de feu | Caledair, the Scythe of Fire | L11 p.31 | 1 |  |
| `pnj/l11/halagrundsor-horrible-geant-espion.webp` | Halagrundsor ‘horrible’ — Géant espion | Halagrundsor the ‘horrible’ — Giant Spy | L11 p.35 | 1 |  |
| `pnj/l11/jetsam-clever-jelly.webp` | Jetsam Clever Jelly | Jetsam the Clever Jelly | L11 p.45 | 1 |  |
| `pnj/l11/corpse-render.webp` | Corpse Render | The Corpse Render | L11 p.54 | 1 |  |
| `pnj/l11/heomreth.webp` | Heomreth | Heomreth | L11 p.63 | 1 |  |
| `pnj/l11/oblast-bete.webp` | Oblast bête | The Oblast Beast | L11 p.67 | 1 |  |
| `pnj/l11/tregara.webp` | Tregara | Tregara | L11 p.76 | 1 |  |
| `pnj/l11/il-potente-granchio.webp` | Il Potente Granchio | Il Potente Granchio | L11 p.85 | 1 |  |
| `pnj/l11/fantasma.webp` | Fantasma | The Fantasma | L11 p.91 | 1 |  |
| `pj/erich-massenbach.webp` | Erich Massenbach | Erich Massenbach | L11 p.122 | 1 |  |
| `pj/jorunn-gromsdottir.webp` | Jorunn Gromsdottir | Jorunn Gromsdottir | L11 p.124 | 1 |  |
| `pj/lynathryn-nightsong.webp` | Lynathryn Nightsong | Lynathryn Nightsong | L11 p.126 | 1 |  |
| `pj/theodosius-schreiber.webp` | Theodosius Schreiber | Theodosius Schreiber | L11 p.128 | 1 |  |
| `pj/vasya-ghorshkov.webp` | Vasya Ghorshkov | Vasya Ghorshkov | L11 p.130 | 1 |  |
| `pj/kistiane-brockdorf.webp` | Kistiane Brockdorf | Kistiane Brockdorf | L11 p.132 | 1 |  |

### L12 — Tribes and Tribulations (25)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l12/vish-venombarb-gobelin-des-forets-chief.webp` | Vish Venombarb – gobelin des forêts Chief | Vish Venombarb – Forest Goblin Chief | L12 p.26 | 1 |  |
| `pnj/l12/blackhearted-nurd-gobelin-des-forets-elite.webp` | Blackhearted Nurd – gobelin des forêts Elite | Blackhearted Nurd – Forest Goblin Elite | L12 p.28 | 1 |  |
| `pnj/l12/bugshot-gobelin-des-forets-skirmisher.webp` | Bugshot – gobelin des forêts Skirmisher | Bugshot – Forest Goblin Skirmisher | L12 p.29 | 1 |  |
| `pnj/l12/boggrub-legbiter-goblin-warlord.webp` | Boggrub Legbiter – Goblin Warlord | Boggrub Legbiter – Goblin Warlord | L12 p.36 | 1 |  |
| `pnj/l12/gutbug-goblin-chief.webp` | Gutbug – Goblin Chief | Gutbug – Goblin Chief | L12 p.37 | 1 |  |
| `pnj/l12/kargun-grimbarden-dwarf-artillerist.webp` | Kargun Grimbarden – Dwarf Artillerist | Kargun Grimbarden – Dwarf Artillerist | L12 p.39 | 1 |  |
| `pnj/l12/harboth-skullrenda-orc-warlord.webp` | Harboth Skullrenda – Orc Warlord | Harboth Skullrenda – Orc Warlord | L12 p.48 | 1 |  |
| `pnj/l12/yaskin-forit-orc-chief.webp` | Yaskin Forit – Orc Chief | Yaskin Forit – Orc Chief | L12 p.49 | 1 |  |
| `pnj/l12/hizsss-snakeskin-sauvage-orc-shaman-lord.webp` | Hizsss Snakeskin – sauvage Orc Shaman Lord | Hizsss Snakeskin – Savage Orc Shaman Lord | L12 p.58 | 1 |  |
| `pnj/l12/slith-snake-wrangla-sauvage-orc-warlord.webp` | Slith Snake-Wrangla – sauvage Orc Warlord | Slith Snake-Wrangla – Savage Orc Warlord | L12 p.59 | 1 |  |
| `pnj/l12/bruug-sauvage-orc-skirmisher.webp` | Bruug – sauvage Orc Skirmisher | Bruug – Savage Orc Skirmisher | L12 p.60 | 1 |  |
| `pnj/l12/garn-sauvage-orc-skirmisher.webp` | Garn – sauvage Orc Skirmisher | Garn – Savage Orc Skirmisher | L12 p.61 | 1 |  |
| `pnj/l12/oglah-khan-hobgobelin-chief.webp` | Oglah Khan – hobgobelin Chief | Oglah Khan – Hobgoblin Chief | L12 p.68 | 1 |  |
| `pnj/l12/zschokke-glahh-hobgobelin-soldier.webp` | “zschokke” Glahh – hobgobelin Soldier | “zschokke” Glahh – Hobgoblin Soldier | L12 p.69 | 1 |  |
| `pnj/l12/gaglah-ghran-hobgobelin-elite.webp` | Gaglah Ghran – hobgobelin Elite | Gaglah Ghran – Hobgoblin Elite | L12 p.70 | 1 |  |
| `pnj/l12/hhrag-wolf-wispra-hobgobelin-skirmisher.webp` | Hhrag Wolf-Wispra – hobgobelin Skirmisher | Hhrag Wolf-Wispra – Hobgoblin Skirmisher | L12 p.71 | 1 |  |
| `pnj/l12/rulg-deathcheater-ogre-butcher.webp` | Rulg Deathcheater – Ogre Butcher | Rulg Deathcheater – Ogre Butcher | L12 p.79 | 1 |  |
| `pnj/l12/yrg-beastkiller-chasseur-ogre.webp` | Yrg Beastkiller — Chasseur ogre | Yrg Beastkiller — Ogre Hunter | L12 p.80 | 1 |  |
| `pnj/l12/skel-longstrider-ogre-irongut.webp` | Skel Longstrider – Ogre Irongut | Skel Longstrider – Ogre Irongut | L12 p.81 | 1 |  |
| `pnj/l12/cragtooth-vieux-stone-troll.webp` | Cragtooth – vieux Stone Troll | Cragtooth – Old Stone Troll | L12 p.92 | 1 |  |
| `pnj/l12/grua-gribbleback-troll-des-rivieres-hag.webp` | Grua Gribbleback – troll des rivières Hag | Grua Gribbleback – River Troll Hag | L12 p.93 | 1 |  |
| `pnj/l12/et-goblin-nemeses-orque-skarsnik-warlord-de-eight-peaks.webp` | Et Goblin Nemeses orque — Skarsnik, Warlord de Eight Peaks | Orc and Goblin Nemeses — Skarsnik, Warlord of Eight Peaks | L12 p.105 | 1 |  |
| `pnj/l12/gobbla-bloated-squig-des-cavernes.webp` | Gobbla, Bloated squig des cavernes | Gobbla, Bloated Cave Squig | L12 p.105 | 1 |  |
| `pnj/l12/gorfang-chief-de-rouge-fangs.webp` | Gorfang, Chief de rouge Fangs | Gorfang, Chief of the Red Fangs | L12 p.107 | 1 |  |
| `pnj/l12/sog-kog-massif-chaos-troll.webp` | Sog’Kog — Massif Chaos troll | Sog’Kog — Hulking Chaos Troll | L12 p.108 | 1 |  |

### L13 — Up in Arms (1)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l13/up-in-arms-avocat-argent-3.webp` | Up in Arms — Avocat (Argent 3) | Up in Arms — Lawyer — Silver 3 | L13 p.114 | 1 |  |

### L14 — Sea Wardens of Cothique (12)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l14/prince-dalloran-de-cothique-seigneur-noble-cothiqui.webp` | Prince Dalloran de Cothique — Seigneur noble cothiqui | Prince Dalloran of Cothique — Cothiqui Noble Lord | L14 p.27 | 1 |  |
| `pnj/l14/princesse-litharys-d-elisia-amirale-cothiquie.webp` | Princesse Litharys d’Elisia — Amirale cothiquie | Princess Litharys of Elisia — Cothiqui Admiral | L14 p.39 | 1 |  |
| `pnj/l14/prince-dalroth-noble-cothiqui.webp` | Prince Dalroth — Noble cothiqui | Prince Dalroth — Cothiqui Noble | L14 p.45 | 1 |  |
| `pnj/l14/prince-dannor-noble-cothiqui.webp` | Prince Dannor — Noble cothiqui | Prince Dannor — Cothiqui Noble | L14 p.45 | 1 |  |
| `pnj/l14/illorahin-seabrow-marchand-aventurier-cothiqui.webp` | Illorahin Seabrow — Marchand aventurier cothiqui | Illorahin Seabrow — Cothiqui Merchant Adventurer | L14 p.49 | 1 |  |
| `pnj/l14/torrelain-moonrose-meneur-cothiqui.webp` | Torrelain Moonrose — Meneur cothiqui | Torrelain Moonrose — Cothiqui Ringleader | L14 p.51 | 1 |  |
| `pnj/l14/haute-receveuse-fialthra-swiftprow-juge-cothiquie.webp` | Haute Receveuse Fialthra Swiftprow — Juge cothiquie | High Receiver Fialthra Swiftprow — Cothiqui Judge | L14 p.55 | 1 |  |
| `pnj/l14/herwig-algnar-maitre-marchand-humain.webp` | Herwig Algnar — Maître marchand humain | Herwig Algnar — Human Master Merchant | L14 p.57 | 1 |  |
| `pnj/l14/ceyluii-pie-grieche.webp` | Ceyluii — Pie-grièche | Ceyluii — Shrike | L14 p.63 | 1 |  |
| `pnj/l14/cireon-fleetcrest-faiseur-de-gouts-cothiqui.webp` | Cireon Fleetcrest — Faiseur de goûts cothiqui | Cireon Fleetcrest — Cothiqui Taste Maker | L14 p.67 | 1 |  |
| `pnj/l14/revna-tharvig-norscan-espion.webp` | Revna Tharvig — Norscan espion | Revna Tharvig — Norscan Spy | L14 p.69 | 1 |  |
| `pnj/l14/shadowblade-assassin-elfe-noir.webp` | Shadowblade — Assassin elfe noir | Shadowblade — Dark Elf Assassin | L14 p.74 | 1 |  |

### L16 — Lords of Stone and Steel (17)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l16/thorgrim-grudgebearer-nain-seigneur-de-karak.webp` | Thorgrim Grudgebearer — Nain — Seigneur de Karak | Thorgrim Grudgebearer — Dwarf — Karak Lord | L16 p.7 | 1 |  |
| `pnj/l16/kazador-thunderhorn-seigneur-de-karak-nain.webp` | Kazador Thunderhorn — Seigneur de Karak nain | Kazador Thunderhorn — Dwarf Karak Lord | L16 p.11 | 1 |  |
| `pnj/l16/ungrim-ironfist-seigneur-de-karak-nain.webp` | Ungrim Ironfist — Seigneur de Karak nain | Ungrim Ironfist — Dwarf Karak Lord | L16 p.13 | 1 |  |
| `pnj/l16/zylra-kraggsdottir-citadine-naine.webp` | Zylra Kraggsdottir — Citadine naine | Zylra Kraggsdottir — Dwarf Townswoman | L16 p.28 | 1 |  |
| `pnj/l16/kazgar-rognisson-gardien-de-porte-nain.webp` | Kazgar Rognisson — Gardien de porte nain | Kazgar Rognisson — Dwarf Gate Keeper | L16 p.30 | 1 |  |
| `pnj/l16/helga-vikramsdottir-artisane-naine.webp` | Helga Vikramsdottir — Artisane naine | Helga Vikramsdottir — Dwarf Artisan | L16 p.31 | 1 |  |
| `pnj/l16/roi-brokk-ironpick-seigneur-de-karak-nain.webp` | Roi Brokk Ironpick — Seigneur de Karak nain | King Brokk Ironpick — Dwarf Karak Lord | L16 p.32 | 1 |  |
| `pnj/l16/reine-thurma-dame-de-karak-naine.webp` | Reine Thurma — Dame de Karak naine | Queen Thurma — Dwarf Karak Lady | L16 p.33 | 1 |  |
| `pnj/l16/bradni-bronzebeard-artisan-nain-armurier.webp` | Bradni Bronzebeard — Artisan nain (armurier) | Bradni Bronzebeard — Dwarf Artisan — (Armourer) | L16 p.41 | 1 |  |
| `pnj/l16/baragor-guttrisson-maitre-forgeron-nain.webp` | Baragor Guttrisson — Maître-forgeron nain | Baragor Guttrisson — Dwarf Forgemaster | L16 p.43 | 1 |  |
| `pnj/l16/nanna-logansdottir-naine-maitresse-du-foyer.webp` | Nanna Logansdottir — Naine — Maîtresse du foyer | Nanna Logansdottir — Dwarf — Hearthmistress | L16 p.45 | 1 |  |
| `pnj/l16/katrin-thormsdottir-naine-tueuse-de-demons.webp` | Katrin Thormsdottir — Naine — Tueuse de démons | Katrin Thormsdottir — Dwarf — Daemon Slayer | L16 p.51 | 1 |  |
| `pnj/l16/gotrek-gurnisson-tueur-de-demons-nain.webp` | Gotrek Gurnisson — Tueur de démons nain | Gotrek Gurnisson — Dwarf Daemon Slayer | L16 p.79 | 1 |  |
| `pnj/l16/felix-jaeger-hors-la-loi-humain.webp` | Felix Jaeger — Hors-la-loi humain | Felix Jaeger — Human Outlaw | L16 p.81 | 1 |  |
| `pnj/l16/hagdar-fleau-des-terres-sombres.webp` | Hagdar, Fléau des Terres sombres | Hagdar, Scourge of the Dark Lands | L16 p.84 | 1 |  |
| `pnj/l16/hesh-le-contaminateur-porteur-de-la-parole.webp` | Hesh le Contaminateur — Porteur de la Parole | Hesh the Contaminator — Bringer — of the Word | L16 p.90 | 1 |  |
| `pnj/l16/seigneur-de-guerre-blistrox-blyte.webp` | Seigneur de guerre Blistrox Blyte | Warlord Blistrox Blyte | L16 p.93 | 1 |  |

### L17 — Winds of Magic (12)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l17/ashamira-dib-hierophante-argent-3.webp` | Ashamira Dib — Hiérophante (Argent 3) | Ashamira Dib — Hierophant (Silver 3) | L17 p.61 | 1 |  |
| `pnj/l17/balthasar-gelt-seigneur-alchimiste-or-4.webp` | Balthasar Gelt — Seigneur alchimiste (Or 4) | Balthasar Gelt — Alchemist Lord (Gold 4) | L17 p.73 | 1 |  |
| `pnj/l17/tochter-grunfeld-seigneur-sorcier-humain-or-2.webp` | Tochter Grunfeld — Seigneur sorcier humain (Or 2) | Tochter Grunfeld — Human Wizard Lord (Gold 2) | L17 p.85 | 1 |  |
| `pnj/l17/raphael-julevno-grand-astromancien-or-1.webp` | Raphael Julevno — Grand astromancien (Or 1) | Raphael Julevno — Grand Astromancer (Gold 1) | L17 p.97 | 1 |  |
| `pnj/l17/immanuel-ferrand-holswig-schliestein-maitre-espion-humain-or-4.webp` | Immanuel-Ferrand Holswig-Schliestein — Maître espion humain (Or 4) | Immanuel-Ferrand Holswig-Schliestein — Human Spymaster (Gold 4) | L17 p.109 | 1 |  |
| `pnj/l17/elspeth-von-draken-seigneur-sorcier-humain-or-2.webp` | Elspeth von Draken — Seigneur sorcier humain (Or 2) | Elspeth von Draken — Human Wizard Lord (Gold 2) | L17 p.121 | 1 |  |
| `pnj/l17/sergov-pfeiffer-sorcier-ardent-humain-argent-3.webp` | Sergov Pfeiffer — Sorcier ardent humain (Argent 3) | Sergov Pfeiffer — Human Bright Wizard (Silver 3) | L17 p.133 | 1 |  |
| `pnj/l17/gregor-martak-seigneur-chamane-humain-or-2.webp` | Gregor Martak — Seigneur chamane humain (Or 2) | Gregor Martak — Human Shaman Lord (Gold 2) | L17 p.145 | 1 |  |
| `pnj/l17/egrimm-van-horstmann.webp` | Egrimm van Horstmann | Egrimm van Horstmann | L17 p.210 | 1 |  |
| `pnj/l17/p-tarix-celui-qui-ecrit.webp` | P’Tarix — Celui qui écrit | P’Tarix – the One Who Writes | L17 p.213 | 1 |  |
| `pnj/l17/xirat-p-celui-qui-lit.webp` | Xirat’P — Celui qui lit | Xirat’P – the One Who Reads | L17 p.213 | 1 |  |
| `pnj/l17/mona-mimn-matriarche-fimir.webp` | Mòna Mimn — Matriarche fimir | Mòna Mimn — Fimir Matriarch | L17 p.216 | 1 |  |

### L18 — Power Behind the Throne Companion (14)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l18/sascha-rothbert-procureur-humain-argent-1.webp` | Sascha Rothbert — Procureur humain (Argent 1) | Sascha Rothbert — Human Procurer (Silver 1) | L18 p.53 | 1 |  |
| `pnj/l18/hausmeister-breugal-gouverneur-humain-ancien-conseiller-or-3.webp` | Hausmeister Breugal — Gouverneur humain, ancien conseiller (Or 3) | Hausmeister Breugal — Human Governor, Former Advisor (Gold 3) | L18 p.56 | 1 |  |
| `pnj/l18/nastassia-maitre-espion-humain-or-4.webp` | Nastassia — Maître espion humain (Or 4) | Nastassia — Human Spymaster (Gold 4) | L18 p.60 | 1 |  |
| `pnj/l18/alfric-half-nose-anvilbreaker-receleur-nain-argent-2.webp` | Alfric `Half-Nose' Anvilbreaker — Receleur nain (Argent 2) | Alfric `Half-Nose' Anvilbreaker — Dwarf Fence (Silver 2) | L18 p.63, L19 p.39 | 2 |  |
| `pnj/l18/thognar-aide-nain-argent-2.webp` | Thognar — Aide nain (Argent 2) | Thognar — Dwarf Aide (Silver 2) | L18 p.66 | 1 |  |
| `pnj/l18/edel-mueller-grande-pretresse-humain-or-1.webp` | Edel Mueller — Grande prêtresse humain (Or 1) | Edel Mueller — Human High Priestess (Gold 1) | L18 p.68 | 1 |  |
| `pnj/l18/isolde-begegnen-grande-pretresse-humain-or-1.webp` | Isolde Begegnen — Grande prêtresse humain (Or 1) | Isolde Begegnen — Human High Priestess (Gold 1) | L18 p.71 | 1 |  |
| `pnj/l18/brunhilde-klaglich-maitre-espion-humain-or-4.webp` | Brunhilde Klaglich — Maître espion humain (Or 4) | Brunhilde Klaglich — Human Spymaster (Gold 4) | L18 p.74 | 1 |  |
| `pnj/l18/peter-tavelli-croc-jaune-cultiste-bronze-4.webp` | Peter Tavelli — Croc-Jaune cultiste (Bronze 4) | Peter Tavelli — Yellow Fang Cultist (Brass 4) | L18 p.96 | 1 |  |
| `pnj/l18/tigrati-head-parvisch-cultiste-bronze-2.webp` | Tigrati `Head' Parvisch — Cultiste (Bronze 2) | Tigrati `Head' Parvisch — Cultist (Brass 2) | L18 p.96 | 1 |  |
| `pnj/l18/henri-phillippe-rocheteau-doyen-de-village-humain-ancien-marchand-argent-5.webp` | Henri-Phillippe Rocheteau — Doyen de village humain, ancien marchand (Argent 5) | Henri-Phillippe Rocheteau — Human Village Elder, Former Merchant (Silver 5) | L18 p.114 | 1 |  |
| `pnj/l18/isolde-gudhoffen-villageois-bronze-3.webp` | Isolde Gudhoffen — Villageois (Bronze 3) | Isolde Gudhoffen — Villager (Brass 3) | L18 p.115 | 1 |  |
| `pnj/l18/parzival-tristan-aschaffenberg-noble-ancien-soldat-argent-5.webp` | Parzival Tristan Aschaffenberg — Noble, ancien soldat (Argent 5*) | Parzival Tristan Aschaffenberg Noble, Former Soldier (Silver 5*) | L18 p.115 | 1 |  |
| `pnj/l18/wuder-lechart-idiot-du-village-bronze-0.webp` | Wuder Lechart — Idiot du village (Bronze 0) | Wuder Lechart — Village Fool (Brass 0) | L18 p.116 | 1 |  |

### L19 — Middenheim: City of the White Wolf (33)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l19/sergent-wereburga-krotpreffer-garde-d-honneur-humain-argent-3.webp` | Sergent Wereburga Krotpreffer — Garde d’honneur humain (Argent 3) | Sergeant Wereburga Krotpreffer — Human Honour Guard (Silver 3) | L19 p.32 | 1 |  |
| `pnj/l19/sergent-wolfgard-hohmann-garde-d-honneur-humain-argent-3.webp` | Sergent Wolfgard Hohmann — Garde d’honneur humain (Argent 3) | Sergeant Wolfgard Hohmann — Human Honour Guard (Silver 3) | L19 p.32 | 1 |  |
| `pnj/l19/capitaine-moritz-valgeir-chevalier-humain-ancien-sergent-argent-5.webp` | Capitaine Moritz Valgeir — Chevalier humain, ancien sergent (Argent 5) | Captain Moritz Valgeir — Human Knight, Former Sergeant (Silver 5) | L19 p.52 | 1 |  |
| `pnj/l19/wulfric-tore-marchand-humain-argent-5.webp` | Wulfric Tore — Marchand humain (Argent 5) | Wulfric Tore — Human Merchant (Silver 5) | L19 p.52 | 1 |  |
| `pnj/l19/mote-yarrow-le-fetchling.webp` | Mote Yarrow le Fetchling | Mote Yarrow the Fetchling | L19 p.67 | 1 |  |
| `pnj/l19/yanni-weber-maitre-sorcier-humain-or-1.webp` | Yanni Weber — Maître sorcier humain (Or 1) | Yanni Weber — Human Master Wizard (Gold 1) | L19 p.67 | 1 |  |
| `pnj/l19/marta-gerbenshreiber-huissier-humain-argent-5.webp` | Marta Gerbenshreiber — Huissier humain (Argent 5) | Marta Gerbenshreiber — Human Bailiff (Silver 5) | L19 p.72 | 1 |  |
| `pnj/l19/stefan-hochen-docteur-humain-argent-5.webp` | Stefan Hochen — Docteur humain (Argent 5) | Stefan Hochen — Human Doktor (Silver 5) | L19 p.72 | 1 |  |
| `pnj/l19/johen-sorciere-humaine-bronze-2.webp` | Johen — Sorcière humaine (Bronze 2) | Johen — Human Witch (Brass 2) | L19 p.78 | 1 |  |
| `pnj/l19/waldtraud-blass-maitre-apothicaire-humain-ancien-apprenti-artisan-argent-3.webp` | Waldtraud Blass — Maître apothicaire humain, ancien apprenti artisan (Argent 3) | Waldtraud Blass — Human Master Apothecary, Former Apprentice Artisan (Silver 3) | L19 p.78 | 1 |  |
| `pnj/l19/ritta-escroc-humain-argent-2.webp` | Ritta — Escroc humain (Argent 2) | Ritta — Human Con Artist (Silver 2) | L19 p.85 | 1 |  |
| `pnj/l19/emmille-munzstatter-artisan-humain-argent-1.webp` | Emmille Münzstätter — Artisan humain (Argent 1) | Emmille Münzstätter — Human Artisan (Silver 1) | L19 p.89 | 1 |  |
| `pnj/l19/wulfrum-viert-intendant-humain-or-1.webp` | Wulfrum Viert — Intendant humain (Or 1) | Wulfrum Viert — Human Steward (Gold 1) | L19 p.89 | 1 |  |
| `pnj/l19/agna-lottrisdottir-envoye-nain-argent-4.webp` | Agna Lottrisdottir — Envoyé nain (Argent 4) | Agna Lottrisdottir — Dwarf Envoy (Silver 4) | L19 p.95 | 1 |  |
| `pnj/l19/helmut-beckenbauer-chef-de-bande-humain-argent-3.webp` | Helmut Beckenbauer — Chef de bande humain (Argent 3) | Helmut Beckenbauer — Human Gang Boss (Silver 3) | L19 p.95 | 1 |  |
| `pnj/l19/frere-bengt-pretre-humain-argent-1.webp` | Frère Bengt — Prêtre humain (Argent 1) | Brother Bengt — Human Priest (Silver 1) | L19 p.100 | 1 |  |
| `pnj/l19/walpurga-wurklich-agitateur-humain-bronze-2.webp` | Walpurga Wurklich — Agitateur humain (Bronze 2) | Walpurga Wurklich — Human Agitator (Brass 2) | L19 p.100 | 1 |  |
| `pnj/l19/andrea-bruhn-conseiller-municipal-humain-argent-5.webp` | Andrea Bruhn — Conseiller municipal humain (Argent 5) | Andrea Bruhn — Human Town Councillor (Silver 5) | L19 p.106 | 1 |  |
| `pnj/l19/grand-vizir-bhar-necromancien-argent-3.webp` | Grand Vizir Bhar — Nécromancien (Argent 3) | Grand Vizier Bhar — Necromancer (Silver 3) | L19 p.106 | 1 |  |
| `pnj/l19/chatelain-chef-de-guerre-gnawretch-skrray.webp` | Châtelain-chef de guerre Gnawretch Skrray | Castellan-Warlord Gnawretch Skrray | L19 p.109 | 1 |  |
| `pnj/l19/archi-prelat-kanker-flett.webp` | Archi-prélat Kanker Flett | Arch-Prelate Kanker Flett | L19 p.110 | 1 |  |
| `pnj/l19/maitre-mouleur-skree.webp` | Maître-mouleur Skree | Master-Moulder Skree | L19 p.110 | 1 |  |
| `pnj/l19/jacopo-schmidt-procureur-humain-argent-1.webp` | Jacopo Schmidt — Procureur humain (Argent 1) | Jacopo Schmidt — Human Procurer (Silver 1) | L19 p.114 | 1 |  |
| `pnj/l19/traudl-bauer-penitent-humain-bronze-0.webp` | Traudl Bauer — Pénitent humain (Bronze 0) | Traudl Bauer — Human Penitent (Brass 0) | L19 p.114 | 1 |  |
| `pnj/l19/le-peaussier-sanglant.webp` | Le Peaussier sanglant | The Bloody Hidesman | L19 p.115 | 1 |  |
| `pnj/l19/beate-moser.webp` | Beate Moser | Beate Moser | L19 p.141 | 1 |  |
| `pnj/l19/magister-hugo-greendale.webp` | `Magister' Hugo Greendale | `Magister' Hugo Greendale | L19 p.141 | 1 |  |
| `pnj/l19/brigitte-schleigel.webp` | Brigitte Schleigel | Brigitte Schleigel | L19 p.142 | 1 |  |
| `pnj/l19/vieux-otto.webp` | Vieux Otto | Old Otto | L19 p.142 | 1 |  |
| `pnj/l19/gerdon-salzwed-receleur-de-middenheim-argent-2.webp` | Gerdon Salzwed — Receleur de Middenheim (Argent 2) | Gerdon Salzwed — Middenheimer Fence (Silver 2) | L19 p.150 | 1 |  |
| `pnj/l19/hasso-schroeter-artiste-de-middenheim-bronze-5.webp` | Hasso Schroeter — Artiste de Middenheim (Bronze 5) | Hasso Schroeter Middenheimer Entertainer (Brass 5) | L19 p.151 | 1 |  |
| `pnj/l19/kat-sperber-colporteur-du-middenland-bronze-4.webp` | Kat Sperber — Colporteur du Middenland (Bronze 4) | Kat Sperber — Middenlander Pedlar (Brass 4) | L19 p.152 | 1 |  |
| `pnj/l19/theresia-kleist-marin-du-nordland-argent-3.webp` | Theresia Kleist — Marin du Nordland (Argent 3) | Theresia Kleist Nordlander Seawoman (Silver 3) | L19 p.153 | 1 |  |

### L20 — Altdorf: Crown of the Empire (44)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l20/thyrus-gormann-seigneur-sorcier-or-2.webp` | Thyrus Gormann — Seigneur sorcier (Or 2) | Thyrus Gormann — Wizard Lord (Gold 2) | L20 p.21 | 1 |  |
| `pnj/l20/andreas-brohne-chef-de-bande-humain-argent-3.webp` | Andreas Brohne — Chef de bande humain (Argent 3) | Andreas Brohne — Human Gang Boss (Silver 3) | L20 p.32 | 1 |  |
| `pnj/l20/breem-racketteur-humain-bronze-5.webp` | Breem — Racketteur humain (Bronze 5) | Breem — Human Racketeer (Brass 5) | L20 p.32 | 1 |  |
| `pnj/l20/willi-pick-maitre-des-docks-argent-5.webp` | Willi Pick — Maître des docks (Argent 5) | Willi Pick — Dock Master (Silver 5) | L20 p.36 | 1 |  |
| `pnj/l20/balthus-pamphletaire-humain-bronze-1.webp` | Balthus — Pamphlétaire humain (Bronze 1) | Balthus — Human Pamphleteer (Brass 1) | L20 p.37 | 1 |  |
| `pnj/l20/seymour-taungar-troubadour-humain-argent-3.webp` | Seymour Taungar — Troubadour humain (Argent 3) | Seymour Taungar — Human Troubadour (Silver 3) | L20 p.59 | 1 |  |
| `pnj/l20/rosanna-ophuls-maitre-enqueteur-argent-3.webp` | Rosanna Ophuls — Maître enquêteur (Argent 3) | Rosanna Ophuls Master Investigator (Silver 3) | L20 p.60 | 1 |  |
| `pnj/l20/svenrina-la-grise-hallovadottir-maitre-artiste-nain-argent-5.webp` | Svenrina « la Grise » Hallovadottir — Maître artiste nain (Argent 5) | Svenrina `the Grey' Hallovadottir — Dwarf Master Artist (Silver 5) | L20 p.62 | 1 |  |
| `pnj/l20/gravin-luciana-von-eckstein-magnat-humain-or-5.webp` | Gravin Luciana von Eckstein — Magnat humain (Or 5) | Gravin Luciana von Eckstein — Human Magnate (Gold 5) | L20 p.65 | 1 |  |
| `pnj/l20/deanne-l-isanore-artiste-humain-bronze-5.webp` | Deanne L'Isanore — Artiste humain (Bronze 5) | Deanne L'Isanore — Human Entertainer (Brass 5) | L20 p.67 | 1 |  |
| `pnj/l20/le-chat-cambrioleur-d-une-finesse-surnaturelle.webp` | Le Chat — Cambrioleur d’une finesse surnaturelle | Preternaturally Fine Burglar | L20 p.67 | 1 |  |
| `pnj/l20/baron-ewald-von-laue-noble-humain-or-3.webp` | Baron Ewald von Laue — Noble humain (Or 3) | Baron Ewald von Laue — Human Noble (Gold 3) | L20 p.71 | 1 |  |
| `pnj/l20/helena-bastiat-hatzburg-maitresse-des-rejouissances-conseiller-humain-argent-4.webp` | Helena Bastiat-Hatzburg, Maîtresse des réjouissances — Conseiller humain (Argent 4) | Helena Bastiat-Hatzburg, Mistress of Revels — Human Advisor (Silver 4) | L20 p.72 | 1 |  |
| `pnj/l20/kurt-helborg-chevalier-du-cercle-interieur-or-4.webp` | Kurt Helborg — Chevalier du Cercle intérieur (Or 4) | Kurt Helborg Knight of the Inner Circle (Gold 4) | L20 p.78 | 1 |  |
| `pnj/l20/reik-rivermarshal-sigfreda-marham-von-sieblich-maitre-d-armes-de-navire-humain-or-1.webp` | Reik Rivermarshal Sigfreda Marham von Sieblich — Maître d’armes de navire humain (Or 1) | Reik Rivermarshal Sigfreda Marham von Sieblich — Human Shipsword Master (Gold 1) | L20 p.82 | 1 |  |
| `pnj/l20/seigneur-tyrkel-von-hargenfels-lieutenant-de-la-premiere-flotte-imperiale-maitre-d-equipage-humain-argent-5.webp` | Seigneur Tyrkel von Hargenfels, lieutenant de la Première flotte impériale — Maître d’équipage humain (Argent 5) | Lord Tyrkel von Hargenfels, Imperial First Fleet Lieutenant — Human Boatswain (Silver 5) | L20 p.86 | 1 |  |
| `pnj/l20/lothar-von-liebnitz-sergent-humain-argent-5.webp` | Lothar von Liebnitz — Sergent humain (Argent 5) | Lothar von Liebnitz — Human Sergeant (Silver 5) | L20 p.90 | 1 |  |
| `pnj/l20/reinholdt-waffenkammer-officier-humain-or-1.webp` | Reinholdt Waffenkammer — Officier humain (Or 1) | Reinholdt Waffenkammer — Human Officer (Gold 1) | L20 p.90 | 1 |  |
| `pnj/l20/harald-kleindeinst-capitaine-du-guet-or-1.webp` | Harald Kleindeinst — Capitaine du guet (Or 1) | Harald Kleindeinst Watch Captain (Gold 1) | L20 p.94 | 1 |  |
| `pnj/l20/freya-husslhaus-pretre-humain-argent-1.webp` | Freya Husslhaus — Prêtre humain (Argent 1) | Freya Husslhaus — Human Priest (Silver 1) | L20 p.101 | 1 |  |
| `pnj/l20/zavant-konniger-detective-argent-5.webp` | Zavant Konniger — Détective (Argent 5) | Zavant Konniger — Detective (Silver 5) | L20 p.102 | 1 |  |
| `pnj/l20/l-abomination-du-stirland.webp` | L’Abomination du Stirland | The Stirland Abomination | L20 p.104 | 1 |  |
| `pnj/l20/le-gibberbete-du-drakwald.webp` | Le Gibberbête du Drakwald | The Drakwald Gibberbeast | L20 p.105 | 1 |  |
| `pnj/l20/gretchen-schwanz-ratier-humain-argent-1.webp` | Gretchen Schwanz — Ratier humain (Argent 1) | Gretchen Schwanz — Human Rat Catcher (Silver 1) | L20 p.109 | 1 |  |
| `pnj/l20/thomas-fabhber-marchand-humain-argent-5.webp` | Thomas Fabhber — Marchand humain (Argent 5) | Thomas Fabhber — Human Merchant (Silver 5) | L20 p.109 | 1 |  |
| `pnj/l20/maren-mauer-colporteur-humain-bronze-4.webp` | Maren Mauer — Colporteur humain (Bronze 4) | Maren Mauer — Human Pedlar (Brass 4) | L20 p.126 | 1 |  |
| `pnj/l20/genarro-gastoli-soldat-humain-argent-3.webp` | Genarro Gastoli — Soldat humain (Argent 3) | Genarro Gastoli — Human Soldier (Silver 3) | L20 p.127 | 1 |  |
| `pnj/l20/hattie-adler.webp` | Hattie Adler | Hattie Adler | L20 p.132 | 1 |  |
| `pnj/l20/le-brochet-de-reikerbahn.webp` | Le Brochet de Reikerbahn | The Reikerbahn Pike | L20 p.132 | 1 |  |
| `pnj/l20/gustav-zasle-cambrioleur-humain-argent-3.webp` | Gustav Zasle — Cambrioleur humain (Argent 3) | Gustav Zasle — Human Cat Burglar (Silver 3) | L20 p.136 | 1 |  |
| `pnj/l20/honoria-kohle-chef-du-crime-humain-argent-5.webp` | Honoria Kohle — Chef du crime humain (Argent 5) | Honoria Kohle — Human Crime Lord (Silver 5) | L20 p.137 | 1 |  |
| `pnj/l20/kazran-dernsson-maitre-armurier-argent-3.webp` | Kazran Dernsson — Maître armurier (Argent 3) | Kazran Dernsson Master Gunsmith (Silver 3) | L20 p.149 | 1 |  |
| `pnj/l20/lunn-yorrisson-ingenieur-argent-2.webp` | Lunn Yorrisson — Ingénieur (Argent 2) | Lunn Yorrisson — Engineer (Silver 2) | L20 p.149 | 1 |  |
| `pnj/l20/zofia-miska-maitre-sorcier-humain-or-1.webp` | Zofia Miska — Maître sorcier humain (Or 1) | Zofia Miska — Human Master Wizard (Gold 1) | L20 p.158 | 1 |  |
| `pnj/l20/frederich-le-vieux-weirde-professeur-or-1.webp` | Frederich « le Vieux » Weirde — Professeur (Or 1) | Frederich `Old' Weirde — Professor (Gold 1) | L20 p.162 | 1 |  |
| `pnj/l20/chancelier-eberhardt-von-festschrift-professeur-or-1.webp` | Chancelier Eberhardt von Festschrift — Professeur (Or 1) | Chancellor Eberhardt von Festschrift Professor (Gold 1) | L20 p.163 | 1 |  |
| `pnj/l20/melinda-greyweave-sorciere-elfe-bronze-2.webp` | Melinda Greyweave — Sorcière elfe (Bronze 2) | Melinda Greyweave — Elf Witch (Brass 2) | L20 p.166 | 1 |  |
| `pnj/l20/orth-vii-chylis-lightbringer-maitre-sorcier-elfe-or-1.webp` | Orth Vii Chylis Lightbringer — Maître sorcier elfe (Or 1) | Orth Vii Chylis Lightbringer — Elf Master Wizard (Gold 1) | L20 p.167 | 1 |  |
| `pnj/l20/comte-jager.webp` | Comte Jäger | Count Jäger | L20 p.173 | 1 |  |
| `pnj/l20/peony-hayfoot-espion-argent-3.webp` | Peony Hayfoot — Espion (Argent 3) | Concern Peony Hayfoot — Spy (Silver 3) | L20 p.195 | 1 |  |
| `pnj/l20/bourgmestre-chard-demagogue-bronze-5.webp` | Bourgmestre Chard — Démagogue (Bronze 5) | Burgomeister Chard — Demagogue (Brass 5) | L20 p.197 | 1 |  |
| `pnj/l20/bombardier-sorcier-skrreth-ffley-sorcier-technicien-du-clan-skryre.webp` | Bombardier sorcier Skrreth Ffley — Sorcier-technicien du clan Skryre | Warlock Bombardier Skrreth Ffley Clan Skryre Warlock | L20 p.204 | 1 |  |
| `pnj/l20/chef-de-guerre-brruxx-chittirr-chef-du-clan-mors.webp` | Chef de guerre Brruxx Chittirr — Chef du clan Mors | Warchief Brruxx Chittirr Clan Mors Chieftain | L20 p.204 | 1 |  |
| `pnj/l20/katarina-briesach-champion-du-chaos-mutant.webp` | Katarina Briesach — Champion du Chaos mutant | Katarina Briesach Mutant Chaos Champion | L20 p.216 | 1 |  |

### L21 — Empire in Ruins Companion (26)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l21/pere-gregor-braun-grand-pretre-or-1.webp` | Père Gregor Braun — Grand prêtre (Or 1) | Father Gregor Braun — High Priest (Gold 1) | L21 p.10 | 1 |  |
| `pnj/l21/silvie-unterfaut-pretre-de-sigmar-argent-1.webp` | Silvie Unterfaut — Prêtre de Sigmar (Argent 1) | Silvie Unterfaut — Sigmarite Priest (Silver 1) | L21 p.10 | 1 |  |
| `pnj/l21/fernand-wagner-ne-du-loup-grand-pretre-or-1.webp` | Fernand Wagner, Né-du-Loup — Grand prêtre (Or 1) | Wolf-Born Fernand Wagner — High Priest (Gold 1) | L21 p.11 | 1 |  |
| `pnj/l21/manfred-ulricson-pretre-d-ulric-argent-1.webp` | Manfred Ulricson — Prêtre d’Ulric (Argent 1) | Manfred Ulricson — Ulrican Priest (Silver 1) | L21 p.11 | 1 |  |
| `pnj/l21/frere-martin-et-frere-rolf-moines-humains-nuns-bronze-4.webp` | Frère Martin et frère Rolf — Moines humains (Nuns) (Bronze 4) | Brother Martin and Brother Rolf — Human Monks (Nuns) (Brass 4) | L21 p.12 | 1 |  |
| `pnj/l21/le-vacarme-vert.webp` | Le Vacarme vert | The Green Racket | L21 p.32 | 1 |  |
| `pnj/l21/olgog-gristlefang.webp` | Olgog Gristlefang | Olgog Gristlefang | L21 p.32 | 1 |  |
| `pnj/l21/gitface.webp` | Gitface | Gitface | L21 p.33 | 1 |  |
| `pnj/l21/colonel-reikhardt-sievers-officier-or-1.webp` | Colonel Reikhardt Sievers — Officier (Or 1) | Colonel Reikhardt Sievers — Officer (Gold 1) | L21 p.39 | 1 |  |
| `pnj/l21/pere-eduard-von-tunz-pretre-humain-argent-2.webp` | Père Eduard von Tunz — Prêtre humain (Argent 2) | Father Eduard von Tunz — Human Priest (Silver 2) | L21 p.40 | 1 |  |
| `pnj/l21/sergent-porte-drapeau-borys-zielin-eclaireur-humain-argent-1.webp` | Sergent porte-drapeau Borys Zielin — Éclaireur humain (Argent 1) | Flag Sergeant Borys Zielin — Human Scout (Silver 1) | L21 p.40 | 1 |  |
| `pnj/l21/bengt-livmatz-artisan-humain-argent-1.webp` | Bengt Livmatz — Artisan humain (Argent 1) | Bengt Livmatz — Human Artisan (Silver 1) | L21 p.41 | 1 |  |
| `pnj/l21/renia-grunewald-envoyee-humaine-argent-2.webp` | Renia Grünewald — Envoyée humaine (Argent 2) | Renia Grünewald — Human Envoy (Silver 2) | L21 p.41 | 1 |  |
| `pnj/l21/sergent-eclaireur-alicja-bohun-chef-de-l-avant-garde.webp` | Sergent éclaireur Alicja Bohun, chef de l’avant-garde | Scout Sergeant Alicja Bohun, Leader of the Vanguard | L21 p.41 | 1 |  |
| `pnj/l21/sebastian-esmer-jozef-sergents-humains-argent-1.webp` | Sebastian, Esmer, Jozef — Sergents humains (Argent 1) | Sebastian, Esmer, Jozef — Human Sergeants (Silver 1) | L21 p.42 | 1 |  |
| `pnj/l21/wolfgang-holswig-aberauer-le-champion-de-l-ombre.webp` | Wolfgang Holswig-Aberauer, le Champion de l’ombre | Wolfgang Holswig-Aberauer, the Champion in Shadows | L21 p.53 | 1 |  |
| `pnj/l21/gregor-smiesdorf-deserteur-bronze-0.webp` | Gregor Smiesdorf — Déserteur (Bronze 0) | Gregor Smiesdorf — Deserter (Brass 0) | L21 p.65 | 1 |  |
| `pnj/l21/sadikur-de-numas.webp` | Sadikur de Numas | Sadikur of Numas | L21 p.68 | 1 |  |
| `pnj/l21/mentag-l-invaincu-champion-de-la-fosse-argent-5.webp` | Mentag l’Invaincu — Champion de la fosse (Argent 5) | Mentag the Undefeated — Pit Champion (Silver 5) | L21 p.71 | 1 |  |
| `pnj/l21/toddy-shufflefoot-charlatan-bronze-5.webp` | Toddy Shufflefoot — Charlatan (Bronze 5) | Toddy Shufflefoot — Charlatan (Brass 5) | L21 p.72 | 1 |  |
| `pnj/l21/erwin-von-oberholtzer-noble-or-3.webp` | Erwin von Oberholtzer — Noble (Or 3) | Erwin von Oberholtzer — Noble (Gold 3) | L21 p.73 | 1 |  |
| `pnj/l21/gerta-faernmaus-duelliste-argent-5.webp` | Gerta Faernmaus — Duelliste (Argent 5) | Gerta Faernmaus — Duellist (Silver 5) | L21 p.78 | 1 |  |
| `pnj/l21/ruprecht-etzburger-senechal-or-1.webp` | Ruprecht Etzburger — Sénéchal (Or 1) | Ruprecht Etzburger — Seneschal (Gold 1) | L21 p.79 | 1 |  |
| `pnj/l21/ernst-heidlemann-apprenti-sorcier-humain-argent-3.webp` | Ernst Heidlemann — Apprenti sorcier humain (Argent 3) | Ernst Heidlemann — Human Wizard's Apprentice (Silver 3) | L21 p.85 | 1 |  |
| `pnj/l21/etelka-herzen-seigneur-sorcier-humain-or-2.webp` | Etelka Herzen — Seigneur sorcier humain (Or 2) | Etelka Herzen — Human Wizard Lord (Gold 2) | L21 p.85 | 1 |  |
| `pnj/l21/hans-graber-moine-de-niveau-1-sorcier-de-niveau-4-necromancien.webp` | Hans Gräber — Moine de niveau 1, sorcier de niveau 4 (Nécromancien) | Hans Gräber — Level 1 Monk, Level 4 Wizard (Necromancer) | L21 p.117 | 1 |  |

### L22 — The Horned Rat Companion (16)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l22/le-rat.webp` | Le Rat | The Rat | L22 p.14 | 1 |  |
| `pnj/l22/voyant-gris-skrittar-heraut-du-conseil-des-treize.webp` | Voyant gris Skrittar, héraut du Conseil des Treize | Grey Seer Skrittar, Herald of the Council of Thirteen | L22 p.14 | 1 |  |
| `pnj/l22/gristl-twitchslice.webp` | Gristl Twitchslice | Gristl Twitchslice | L22 p.17 | 1 |  |
| `pnj/l22/scrak-fangsnapper.webp` | Scrak Fangsnapper | Scrak Fangsnapper | L22 p.20 | 1 |  |
| `pnj/l22/klik-rustclaw-commandant-des-vermines-de-la-mort.webp` | Klik Rustclaw — Commandant des Vermines de la mort | Klik Rustclaw — Deathvermin Commander | L22 p.22 | 1 |  |
| `pnj/l22/blightskab-pretre-de-la-peste.webp` | Blightskab — Prêtre de la peste | Blightskab — Plague Priest | L22 p.25 | 1 |  |
| `pnj/l22/la-bete-infernale-de-seep-gore.webp` | La Bête infernale de Seep-Gore | The Hellbeast of Seep-Gore | L22 p.28 | 1 |  |
| `pnj/l22/maitre-modeleur-wrakrennch.webp` | Maître modeleur Wrakrennch | Master Moulder Wrakrennch | L22 p.28 | 1 |  |
| `pnj/l22/mila-raast-cultiste-senior-des-crocs-jaunes.webp` | Mila Raast — Cultiste senior des Crocs-Jaunes | Mila Raast — Yellow Fang Senior Cultist | L22 p.63 | 1 |  |
| `pnj/l22/ingrid-sasslewort.webp` | Ingrid Sasslewort | Ingrid Sasslewort | L22 p.71 | 1 |  |
| `pnj/l22/behram-gundarson-tueur-bronze-5.webp` | Behram Gundarson — Tueur (Bronze 5) | Behram Gundarson — Slayer (Brass 5) | L22 p.78 | 1 |  |
| `pnj/l22/gimbrin-flintbeard-fantome-du-roi-nain.webp` | Gimbrin Flintbeard — Fantôme du roi nain | Gimbrin Flintbeard — Dwarf King's Ghost | L22 p.79 | 1 |  |
| `pnj/l22/alphonse-hercules-de-gasgoigne-detective-ancien-voleur-argent-3.webp` | Alphonse Hercules de Gasgoigne — Détective, ancien voleur (Argent 3) | Alphonse Hercules de Gasgoigne — Detective, Former Thief (Silver 3) | L22 p.93 | 1 |  |
| `pnj/l22/claudia-carbonetti-chef-de-bande-argent-3.webp` | Claudia Carbonetti — Chef de bande (Argent 3) | Claudia Carbonetti — Gang Boss (Silver 3) | L22 p.94 | 1 |  |
| `pnj/l22/martina-kurtz-contremaitre-de-mine-argent-5.webp` | Martina Kurtz — Contremaître de mine (Argent 5) | Martina Kurtz — Mine Foreman (Silver 5) | L22 p.103 | 1 |  |
| `pnj/l22/wilhelm-koch-prospecteur-bronze-2.webp` | Wilhelm Koch — Prospecteur (Bronze 2) | Wilhelm Koch — Prospector (Brass 2) | L22 p.103 | 1 |  |

### L23 — Enemy in Shadows Companion (38)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l23/johann-hindersson-percepteur-de-peage-humain-bronze-5.webp` | Johann Hindersson — Percepteur de péage humain (Bronze 5) | Johann Hindersson — Human Toll Keeper (Brass 5) | L23 p.40 | 1 |  |
| `pnj/l23/aleanora-al-shortbottom-percepteuse-de-peage-halfling-bronze-5.webp` | Aleanora « Al » Shortbottom — Percepteuse de péage halfling (Bronze 5) | Aleanora 'Al' Shortbottom — Halfling Toll Keeper (Brass 5) | L23 p.41 | 1 |  |
| `pnj/l23/charlotte-samantha-maiers-sergent-routier-humain-argent-4.webp` | Charlotte-Samantha Maiers — Sergent routier humain (Argent 4) | Charlotte-Samantha Maiers — Human Road Sergeant (Silver 4) | L23 p.42 | 1 |  |
| `pnj/l23/heinrich-steele-capitaine-routier-humain-or-1.webp` | Heinrich Steele — Capitaine routier humain (Or 1) | Heinrich Steele — Human Road Captain (Gold 1) | L23 p.42 | 1 |  |
| `pnj/l23/anke-dorflinger-chasseuse-de-primes-humaine-argent-3.webp` | Anke Dorflinger — Chasseuse de primes humaine (Argent 3) | Anke Dorflinger — Human Bounty Hunter (Silver 3) | L23 p.44 | 1 |  |
| `pnj/l23/pandora-lostpocket-artiste-halfling-bronze-5.webp` | Pandora Lostpocket — Artiste halfling (Bronze 5) | Pandora Lostpocket — Halfling Entertainer (Brass 5) | L23 p.46 | 1 |  |
| `pnj/l23/wolmar-rotte-charlatan-humain-bronze-5.webp` | Wolmar Rotte — Charlatan humain (Bronze 5) | Wolmar Rotte — Human Charlatan (Brass 5) | L23 p.47 | 1 |  |
| `pnj/l23/maria-braund-hors-la-loi-humain-bronze-2.webp` | Maria Braund — Hors-la-loi humain (Bronze 2) | Maria Braund — Human Outlaw (Brass 2) | L23 p.48 | 1 |  |
| `pnj/l23/eberhart-von-durbheim-noble-humain-or-3.webp` | Eberhart von Durbheim — Noble humain (Or 3) | Eberhart von Durbheim — Human Noble (Gold 3) | L23 p.50 | 1 |  |
| `pnj/l23/rembrandt-haube-hors-la-loi-humain-bronze-2.webp` | Rembrandt Haube — Hors-la-loi humain (Bronze 2) | Rembrandt Haube — Human Outlaw (Brass 2) | L23 p.51 | 1 |  |
| `pnj/l23/delberz-trutte-colporteur-humain-bronze-4.webp` | Delberz Trütte — Colporteur humain (Bronze 4) | Delberz Trütte — Human Pedlar (Brass 4) | L23 p.52 | 1 |  |
| `pnj/l23/wilhelm-kind-brigand-humain-bronze-1.webp` | Wilhelm Kind — Brigand humain (Bronze 1) | Wilhelm Kind — Human Brigand (Brass 1) | L23 p.53 | 1 |  |
| `pnj/l23/brokur-zindrisson-artisan-nain-argent-1.webp` | Brokur Zindrisson — Artisan nain (Argent 1) | Brokur Zindrisson — Dwarf Artisan (Silver 1) | L23 p.54 | 1 |  |
| `pnj/l23/pompai-ricolma-entremetteuse-humaine-bronze-3.webp` | Pompai Ricolma — Entremetteuse humaine (Bronze 3) | Pompai Ricolma — Human Bawd (Brass 3) | L23 p.55 | 1 |  |
| `pnj/l23/sonny-rags-mendiant-humain-bronze-2.webp` | Sonny Rags — Mendiant humain (Bronze 2) | Sonny Rags — Human Beggar (Brass 2) | L23 p.56 | 1 |  |
| `pnj/l23/heinrich-marken-charlatan-humain-bronze-5.webp` | Heinrich Marken — Charlatan humain (Bronze 5) | Heinrich Marken — Human Charlatan (Brass 5) | L23 p.57 | 1 |  |
| `pnj/l23/albert-pfortner-docker-humain-argent-1.webp` | Albert Pförtner — Docker humain (Argent 1) | Albert Pförtner — Human Stevedore (Silver 1) | L23 p.58 | 1 |  |
| `pnj/l23/alette-zimmermann-voleuse-humaine-bronze-3.webp` | Alette Zimmermann — Voleuse humaine (Bronze 3) | Alette Zimmermann — Human Thief (Brass 3) | L23 p.59 | 1 |  |
| `pnj/l23/keiti-ouala-marchande-humaine-argent-5.webp` | Keiti Ouala — Marchande humaine (Argent 5) | Keiti Ouala — Human Merchant (Silver 5) | L23 p.60 | 1 |  |
| `pnj/l23/konrad-brecht-racketteur-humain-bronze-5.webp` | Konrad Brecht — Racketteur humain (Bronze 5) | Konrad Brecht — Human Racketeer (Brass 5) | L23 p.62 | 1 |  |
| `pnj/l23/reynald-verstand-serviteur-humain-argent-5.webp` | Reynald Verstand — Serviteur humain (Argent 5) | Reynald Verstand — Human Attendant (Silver 5) | L23 p.63 | 1 |  |
| `pnj/l23/emmaretta-chasseuse-bronze-4.webp` | Emmaretta — Chasseuse (Bronze 4) | Emmaretta — Hunter (Brass 4) | L23 p.86 | 1 |  |
| `pnj/l23/johann-le-fantome.webp` | Johann le Fantôme | Johann the Ghost | L23 p.88 | 1 |  |
| `pnj/l23/kasper-lauengram-brigand-humain-bronze-1.webp` | Kasper Lauengram — Brigand humain (Bronze 1) | Kasper Lauengram — Human Brigand (Brass 1) | L23 p.92 | 1 |  |
| `pnj/l23/bruno-brigand-humain-argent-2.webp` | Bruno — Brigand humain (Argent 2) | Bruno — Human Brigand (Silver 2) | L23 p.93 | 1 |  |
| `pnj/l23/wolfgang-kellerman-chef-hors-la-loi-humain-bronze-4.webp` | Wolfgang Kellerman — Chef hors-la-loi humain (Bronze 4) | Wolfgang Kellerman — Human Outlaw Chief (Brass 4) | L23 p.93 | 1 |  |
| `pnj/l23/amadeus-von-drakensberg-magnat-humain-or-5.webp` | Amadeus von Drakensberg — Magnat humain (Or 5) | Amadeus von Drakensberg — Human Magnate (Gold 5) | L23 p.95 | 1 |  |
| `pnj/l23/sleeves-subalterne-halfling-argent-1.webp` | Sleeves — Subalterne halfling (Argent 1) | Sleeves — Halfling Menial (Silver 1) | L23 p.98 | 1 |  |
| `pnj/l23/annalisa-kessler-chef-hors-la-loi-bronze-4.webp` | Annalisa Kessler — Chef hors-la-loi (Bronze 4) | Annalisa Kessler — Outlaw Chief (Brass 4) | L23 p.100 | 1 |  |
| `pnj/l23/urzo.webp` | Urzo | Urzo | L23 p.104 | 1 |  |
| `pnj/l23/les-jumeaux.webp` | Les Jumeaux | The Twins | L23 p.105 | 1 |  |
| `pnj/l23/rassark-etrangement-rat-homme-bete.webp` | Rassark — Étrangement rat — Homme-bête | Rassark — Uncommonly Rat-Like — Beastman | L23 p.105 | 1 |  |
| `pnj/l23/la-bete-imperiale.webp` | La Bête impériale | The Imperial Beast | L23 p.106 | 1 |  |
| `pnj/l23/wolfgang-hollseher-sorcier-or-2.webp` | Wolfgang Hollseher — Sorcier (Or 2) | Wolfgang Hollseher — Wizard (Gold 2) | L23 p.109 | 1 |  |
| `pnj/l23/benbow-cocher-argent-2.webp` | Benbow — Cocher (Argent 2) | Benbow — Coachman (Silver 2) | L23 p.110 | 1 |  |
| `pnj/l23/magnus-bugman-maitre-de-savoir-or-2.webp` | Magnus Bugman — Maître de savoir (Or 2) | Magnus Bugman — Loremaster (Gold 2) | L23 p.110 | 1 |  |
| `pnj/l23/mamie-haller-escroc-argent-2.webp` | « Mamie » Haller — Escroc (Argent 2) | 'Granny' Haller — Con Artist (Silver 2) | L23 p.111 | 1 |  |
| `pnj/l23/big-anders-little-anders-bertoldo-ivan-magda-et-mikhail-cochers-argent-1.webp` | Big Anders, Little Anders, Bertoldo, Ivan, Magda et Mikhail — Cochers (Argent 1) | Big Anders, Little Anders, Bertoldo, Ivan, Magda, and Mikhail — Coachmen (Silver 1) | L23 p.112 | 1 |  |

### L24 — Rough Nights & Hard Days (54)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l24/bruno-franke-judicial-champion-or-3.webp` | Bruno Franke — Judicial champion (Or 3) | Bruno Franke — Judicial Champion (Gold 3) | L24 p.17 | 1 |  |
| `pnj/l24/gustaf-rechtshandler-avocat-or-1.webp` | Gustaf Rechtshandler — Avocat (Or 1) | Gustaf Rechtshandler — Barrister (Gold 1) | L24 p.17 | 1 |  |
| `pnj/l24/maria-ulrike-von-liebwitz-noble-seigneur-or-7.webp` | Maria-Ulrike von Liebwitz — Noble seigneur (Or 7) | Maria-Ulrike von Liebwitz — Noble Lord (Gold 7) | L24 p.17 | 1 |  |
| `pnj/l24/dominique-herveaux-assassin-or-1.webp` | Dominique Herveaux — Assassin (Or 1) | Dominique Herveaux — Assassin (Gold 1) | L24 p.18 | 1 |  |
| `pnj/l24/gunni-bart-et-hans-frederick-smugglers-bronze-3.webp` | Gunni, Bart, et Hans-Frederick — Smugglers (Bronze 3) | Gunni, Bart, and Hans-Frederick — Smugglers (Brass 3) | L24 p.18 | 1 |  |
| `pnj/l24/josef-aufwiegler-rabble-rouser-bronze-3.webp` | Josef Aufwiegler — Rabble Rouser (Bronze 3) | Josef Aufwiegler — Rabble Rouser (Brass 3) | L24 p.19 | 1 |  |
| `pnj/l24/ursula-kopfgeld-maitre-prime-chasseur-argent-5.webp` | Ursula Kopfgeld — Maître prime chasseur (Argent 5) | Ursula Kopfgeld — Master Bounty Hunter (Silver 5) | L24 p.19 | 1 |  |
| `pnj/l24/friedrich-von-pfeifraucher-magnat-or-5.webp` | Friedrich von Pfeifraucher — Magnat (Or 5) | Friedrich von Pfeifraucher — Magnate (Gold 5) | L24 p.20 | 1 |  |
| `pnj/l24/hanna-lastkahn-citadine-argent-2.webp` | Hanna Lastkahn — Citadine (Argent 2) | Hanna Lastkahn — Townswoman (Silver 2) | L24 p.20 | 1 |  |
| `pnj/l24/mho-larz-et-curls-voyous-bronze-3.webp` | Mho, Larz, et 'Curls' — Voyous (Bronze 3) | Mho, Larz, and 'Curls' — Thugs (Brass 3) | L24 p.20 | 1 |  |
| `pnj/l24/thomas-prahmhandler-maitre-marchand-or-1.webp` | Thomas Prahmhandler — Maître marchand (Or 1) | Thomas Prahmhandler — Master Merchant (Gold 1) | L24 p.20 | 1 |  |
| `pnj/l24/allrella-elphoise-et-helga-slaanesh-cultistes-argent-1.webp` | Allrella, Elphoise, et Helga — Slaanesh cultistes (Argent 1) | Allrella, Elphoise, and Helga — Slaanesh Cultists (Silver 1) | L24 p.21 | 1 |  |
| `pnj/l24/glimbrin-oddsocks-maitre-voleur-bronze-5.webp` | Glimbrin Oddsocks — Maître voleur (Bronze 5) | Glimbrin Oddsocks — Master Thief (Brass 5) | L24 p.21 | 1 |  |
| `pnj/l24/hans-orf-citadin-argent-2.webp` | Hans Orf — Citadin (Argent 2) | Hans Orf — Townsman (Silver 2) | L24 p.22 | 1 |  |
| `pnj/l24/mercinellin-seedling-thorncobble-xiii-hustler-bronze-1.webp` | Mercinellin 'Seedling' Thorncobble XIII — Hustler (Bronze 1) | Mercinellin 'Seedling' Thorncobble XIII — Hustler (Brass 1) | L24 p.22 | 1 |  |
| `pnj/l24/ol-bess-artisan-argent-1.webp` | Ol' Bess — Artisan (Argent 1) | Ol' Bess — Artisan (Silver 1) | L24 p.22 | 1 |  |
| `pnj/l24/eberhardt-von-dammenblatz-noble-seigneur-or-7.webp` | Eberhardt von Dammenblatz — Noble seigneur (Or 7) | Eberhardt von Dammenblatz — Noble Lord (Gold 7) | L24 p.33 | 1 |  |
| `pnj/l24/matthias-hubkind-sorciere-chasseur-argent-3.webp` | Matthias Hubkind — Sorcière chasseur (Argent 3) | Matthias Hubkind — Witch Hunter (Silver 3) | L24 p.34 | 1 |  |
| `pnj/l24/petra-steinmetz-grande-pretresse-or-1.webp` | Petra Steinmetz — Grande prêtresse (Or 1) | Petra Steinmetz — High Priestess (Gold 1) | L24 p.35 | 1 |  |
| `pnj/l24/brecht-kavenner-slaanesh-cultist-et-avocat-or-3.webp` | Brecht Kavenner — Slaanesh Cultist et avocat (Or 3) | Brecht Kavenner — Slaanesh Cultist and Barrister (Gold 3) | L24 p.48 | 1 |  |
| `pnj/l24/emmanuelle-von-liebwitz-electeur-countess-or-15.webp` | Emmanuelle von Liebwitz — Électeur Countess (Or 15) | Emmanuelle von Liebwitz — Elector Countess (Gold 15) | L24 p.48 | 1 |  |
| `pnj/l24/brocks-et-reiner-espions-argent-3.webp` | Brocks et Reiner — Espions (Argent 3) | Brocks and Reiner — Spies (Silver 3) | L24 p.49 | 1 |  |
| `pnj/l24/edvard-lowenhertz-wyrd-bronze-3.webp` | Edvard Lowenhertz — Wyrd (Bronze 3) | Edvard Lowenhertz — Wyrd (Brass 3) | L24 p.50 | 1 |  |
| `pnj/l24/edwina-lowenhertz-sorciere-bronze-2.webp` | Edwina Lowenhertz — Sorcière (Bronze 2) | Edwina Lowenhertz — Witch (Brass 2) | L24 p.50 | 1 |  |
| `pnj/l24/erwin-pakker-professeur-or-1.webp` | Erwin Pakker — Professeur (Or 1) | Erwin Pakker — Professor (Gold 1) | L24 p.50 | 1 |  |
| `pnj/l24/detlef-sierck-genius-or-3.webp` | Detlef Sierck — Genius (Or 3) | Detlef Sierck — Genius (Gold 3) | L24 p.51 | 1 |  |
| `pnj/l24/martyn-ruchen-chaos-cult-leader-et-chaos-sorcerer-argent-3.webp` | Martyn Ruchen — Chaos Cult Leader et Chaos Sorcerer (Argent 3) | Martyn Ruchen — Chaos Cult Leader and Chaos Sorcerer (Silver 3) | L24 p.52 | 1 |  |
| `pnj/l24/wilhelm-von-saponatheim-noble-seigneur-or-7.webp` | Wilhelm von Saponatheim — Noble seigneur (Or 7) | Wilhelm von Saponatheim — Noble Lord (Gold 7) | L24 p.64 | 1 |  |
| `pnj/l24/inta-dapesht.webp` | Inta-Dapesht | Inta-Dapesht | L24 p.65 | 1 |  |
| `pnj/l24/joachim-bitterfeld-artisan-argent-1.webp` | Joachim Bitterfeld — Artisan (Argent 1) | Joachim Bitterfeld — Artisan (Silver 1) | L24 p.65 | 1 |  |
| `pnj/l24/nastassia-von-saponatheim-rejeton-or-1.webp` | Nastassia von Saponatheim — Rejeton (Or 1) | Nastassia von Saponatheim — Scion (Gold 1) | L24 p.65 | 1 |  |
| `pnj/l24/manfred-von-saponatheim-prisoner-bronze-0.webp` | Manfred von Saponatheim — Prisoner (Bronze 0) | Manfred von Saponatheim — Prisoner (Brass 0) | L24 p.66 | 1 |  |
| `pnj/l24/clothilde-telland-noble-or-4.webp` | Clothilde Telland — Noble (Or 4) | Clothilde Telland — Noble (Gold 4) | L24 p.67 | 1 |  |
| `pnj/l24/josef-von-angendorf-chat-cambrioleur-or-2.webp` | Josef von Angendorf — Chat cambrioleur (Or 2) | Josef von Angendorf — Cat Burglar (Gold 2) | L24 p.67 | 1 |  |
| `pnj/l24/taggees-espions-or-2.webp` | Taggees — Espions (Or 2) | Taggees — Spies (Gold 2) | L24 p.67 | 1 |  |
| `pnj/l24/erich-von-holzenauer-noble-or-2.webp` | Erich von Holzenauer — Noble (Or 2) | Erich von Holzenauer — Noble (Gold 2) | L24 p.80 | 1 |  |
| `pnj/l24/siegfried-von-saponatheim-noble-or-2.webp` | Siegfried von Saponatheim — Noble (Or 2) | Siegfried von Saponatheim — Noble (Gold 2) | L24 p.80 | 1 |  |
| `pnj/l24/galina-hohengolfrid-noble-or-2.webp` | Galina Hohengolfrid — Noble (Or 2) | Galina Hohengolfrid — Noble (Gold 2) | L24 p.81 | 1 |  |
| `pnj/l24/heinrich-von-bruner-magnat-or-3.webp` | Heinrich von Bruner — Magnat (Or 3) | Heinrich von Bruner — Magnate (Gold 3) | L24 p.81 | 1 |  |
| `pnj/l24/maximilian-aschaffenburg-rejeton-or-1.webp` | Maximilian Aschaffenburg — Rejeton (Or 1) | Maximilian Aschaffenburg — Scion (Gold 1) | L24 p.81 | 1 |  |
| `pnj/l24/rickard-aschaffenberg-magnat-or-3.webp` | Rickard Aschaffenberg — Magnat (Or 3) | Rickard Aschaffenberg — Magnate (Gold 3) | L24 p.81 | 1 |  |
| `pnj/l24/florian-pfeifraucher-noble-or-2.webp` | Florian Pfeifraucher — Noble (Or 2) | Florian Pfeifraucher — Noble (Gold 2) | L24 p.82 | 1 |  |
| `pnj/l24/heinrich-von-falkenhayn-noble-or-2.webp` | Heinrich von Falkenhayn — Noble (Or 2) | Heinrich von Falkenhayn — Noble (Gold 2) | L24 p.82 | 1 |  |
| `pnj/l24/jean-luc-de-cadent-agent-or-1.webp` | Jean-Luc de Cadent — Agent (Or 1) | Jean-Luc de Cadent — Agent (Gold 1) | L24 p.82 | 1 |  |
| `pnj/l24/borgan-foambeard-maitre-de-guilde-or-1.webp` | Borgan Foambeard — Maître de guilde (Or 1) | Borgan Foambeard — Guildmaster (Gold 1) | L24 p.83 | 1 |  |
| `pnj/l24/ernst-maler-bourgmestre-or-1.webp` | Ernst Maler — Bourgmestre (Or 1) | Ernst Maler — Burgomeister (Gold 1) | L24 p.83 | 1 |  |
| `pnj/l24/otto-krupp-maitre-de-guilde-or-1.webp` | Otto Krupp — Maître de guilde (Or 1) | Otto Krupp — Guildmaster (Gold 1) | L24 p.83 | 1 |  |
| `pnj/l24/celestine-hoch-pretresse-argent-1.webp` | Celestine Hoch — Prêtresse (Argent 1) | Celestine Hoch — Priestess (Silver 1) | L24 p.84 | 1 |  |
| `pnj/l24/gunther-emming-grand-pretre-or-1.webp` | Gunther Emming — Grand prêtre (Or 1) | Gunther Emming — High Priest (Gold 1) | L24 p.84 | 1 |  |
| `pnj/l24/heinrich-gutenberg-grand-pretre-or-1.webp` | Heinrich Gutenberg — Grand prêtre (Or 1) | Heinrich Gutenberg — High Priest (Gold 1) | L24 p.84 | 1 |  |
| `pnj/l24/lorith-silverleaf-envoye-argent-4.webp` | Lorith Silverleaf — Envoyé (Argent 4) | Lorith Silverleaf — Envoy (Silver 4) | L24 p.84 | 1 |  |
| `pnj/l24/andrea-pfeffer-capitaine-du-guet-or-1.webp` | Andrea Pfeffer — Capitaine du guet (Or 1) | Andrea Pfeffer — Watch Captain (Gold 1) | L24 p.85 | 1 |  |
| `pnj/l24/erwin-blucher-officier-or-1.webp` | Erwin Blucher — Officier (Or 1) | Erwin Blucher — Officer (Gold 1) | L24 p.85 | 1 |  |
| `pnj/l24/jendrik-von-dabernick-officier-or-1.webp` | Jendrik von Dabernick — Officier (Or 1) | Jendrik von Dabernick — Officer (Gold 1) | L24 p.85 | 1 |  |

### L25 — Sea of Claws (8)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l25/ludolf-kohler-seigneur-de-la-mer-imperial-or-3.webp` | Ludolf Köhler — Seigneur de la mer impérial (Or 3) | Ludolf Köhler — Imperial Sea Lord (Gold 3) | L25 p.22 | 1 |  |
| `pnj/l25/throgg-roi-troll.webp` | Throgg, roi troll | Throgg Troll King | L25 p.39 | 1 |  |
| `pnj/l25/skaldor-reaver-lotharksson-maitre-de-navire-nain-or-2.webp` | Skaldor « Reaver » Lotharksson — Maître de navire nain (Or 2) | Skaldor 'Reaver' Lotharksson — Dwarf Ship's Master (Gold 2) | L25 p.47 | 1 |  |
| `pnj/l25/olg-bloosalt-capitaine-skaeling-or-2.webp` | Olg Blöösalt — Capitaine skaeling (Or 2) | Olg Blöösalt — Skaeling Captain (Gold 2) | L25 p.55 | 1 |  |
| `pnj/l25/jaego-roth-capitaine-corsaire.webp` | Jaego Roth — Capitaine corsaire | Jaego Roth Privateer Captain | L25 p.151 | 1 |  |
| `pnj/l25/long-drong-capitaine-tueur-chef-des-pirates-tueurs.webp` | Long Drong — Capitaine tueur, chef des pirates tueurs | Long Drong Slayer Captain of the Slayer Pirates | L25 p.152 | 1 |  |
| `pnj/l25/wulfrik-champion-sarl.webp` | Wulfrik — Champion sarl | Wulfrik Sarl Champion | L25 p.155 | 1 |  |
| `pnj/l25/vrisk-ironscratch-archi-seigneur-des-mers-du-clan-skurvy.webp` | Vrisk Ironscratch — Archi-seigneur des mers du clan Skurvy | Vrisk Ironscratch Arch-Sealord of Clan Skurvy | L25 p.156 | 1 |  |

### L26 — Death on the Reik Companion (41)

| Fichier proposé | Nom français | Nom anglais | Pages | Profils | Note |
| --- | --- | --- | --- | ---: | --- |
| `pnj/l26/comte-otto-boormann-noble-ancien-diplomate-or-3.webp` | Comte Otto Boormann — Noble, ancien diplomate (Or 3) | Count Otto Boormann — Human Noble, Former Diplomat (Gold 3) | L26 p.18 | 1 |  |
| `pnj/l26/bernhardt-dampfer-maitre-de-barge-humain-argent-3.webp` | Bernhardt Dampfer — Maître de barge humain (Argent 3) | Bernhardt Dampfer — Human Bargeswain (Silver 3) | L26 p.20 | 1 |  |
| `pnj/l26/reiner-et-karl-dampfer-et-hans-vollrat-matelots-fluviaux-argent-1.webp` | Reiner et Karl Dampfer et Hans Vollrat — Matelots fluviaux (Argent 1) | Reiner and Karl Dampfer and Hans Vollrat — Human Boat-Hands (Silver 1) | L26 p.21 | 1 |  |
| `pnj/l26/gertrud-schutzenberger-recrue-fluviale-humaine-argent-1.webp` | Gertrud Schützenberger — Recrue fluviale humaine (Argent 1) | Gertrud Schützenberger — Human River Recruit (Silver 1) | L26 p.35 | 1 |  |
| `pnj/l26/adalia-eisen-maitre-d-armes-humain-argent-4.webp` | Adalia Eisen — Maître d’armes humain (Argent 4) | Adalia Eisen — Human Shipsword (Silver 4) | L26 p.36 | 1 |  |
| `pnj/l26/august-hauser-patrouilleur-fluvial-humain-argent-2.webp` | August Hauser — Patrouilleur fluvial humain (Argent 2) | August Hauser — Human Riverwarden (Silver 2) | L26 p.36 | 1 |  |
| `pnj/l26/wet-wilgryn-augenlos-maitre-d-armes-de-navire-humain-or-1.webp` | « Wet » Wilgryn Augenlos — Maître d’armes de navire humain (Or 1) | 'Wet' Wilgryn Augenlos — Human Shipsword Master (Gold 1) | L26 p.37 | 1 |  |
| `pnj/l26/grugor-lustig-charlatan-humain-bronze-3.webp` | Grugor Lustig — Charlatan humain (Bronze 3) | Grugor Lustig — Human Charlatan (Brass 3) | L26 p.38 | 1 |  |
| `pnj/l26/hans-et-hannes-pilleurs-de-tombes-humains-bronze-2.webp` | Hans et Hannes — Pilleurs de tombes humains (Bronze 2) | Hans and Hannes — Human Grave Robbers (Brass 2) | L26 p.40 | 1 |  |
| `pnj/l26/klaus-jager-chasseur-humain-bronze-2.webp` | Klaus Jager — Chasseur humain (Bronze 2) | Klaus Jager — Human Hunter (Brass 2) | L26 p.41 | 1 |  |
| `pnj/l26/baron-sigismund-von-der-bahr-noble-humain-or-3.webp` | Baron Sigismund von der Bahr — Noble humain (Or 3) | Baron Sigismund von der Bahr — Human Noble (Gold 3) | L26 p.42 | 1 |  |
| `pnj/l26/roland-le-cheval-bruckesel-garde-humain-argent-2.webp` | Roland « le Cheval » Bruckesel — Garde humain (Argent 2) | Roland 'The Horse' Bruckesel — Human Guard (Silver 2) | L26 p.43 | 1 |  |
| `pnj/l26/edgar-la-pique-ebrecht-combattant-de-fosse-humain-bronze-4.webp` | Edgar « la Pique » Ebrecht — Combattant de fosse humain (Bronze 4) | Edgar 'The Pike' Ebrecht — Human Pit Fighter (Brass 4) | L26 p.44 | 1 |  |
| `pnj/l26/hilma-bootschlecht-docker-humain-bronze-3.webp` | Hilma Bootschlecht — Docker humain (Bronze 3) | Hilma Bootschlecht — Human Stevedore (Brass 3) | L26 p.45 | 1 |  |
| `pnj/l26/sigfrida-junker-noble-humaine-aventureuse-aspirante-duelliste-or-1.webp` | Sigfrida Junker — Noble humaine aventureuse, aspirante duelliste (Or 1) | Sigfrida Junker — Adventurous Human Noble, Aspiring Duellist (Gold 1) | L26 p.46 | 1 |  |
| `pnj/l26/avaloi-winesong-artisan-haut-elfe-argent-1.webp` | Avaloi Winesong — Artisan haut elfe (Argent 1) | Avaloi Winesong — High Elf Artisan (Silver 1) | L26 p.47 | 1 |  |
| `pnj/l26/eusapia-balacanon-maitre-sorcier-humain-or-1.webp` | Eusapia Balacañon — Maître sorcier humain (Or 1) | Eusapia Balacañon — Human Master Wizard (Gold 1) | L26 p.48 | 1 |  |
| `pnj/l26/johanna-schnee-medecin-humain-argent-3.webp` | Johanna Schnee — Médecin humain (Argent 3) | Johanna Schnee — Human Physician (Silver 3) | L26 p.49 | 1 |  |
| `pnj/l26/elias-answell-negociant-et-maitre-de-barge-humain-argent-2.webp` | Elias Answell — Négociant et maître de barge humain (Argent 2) | Elias Answell — Human Trader and Bargeswain (Silver 2) | L26 p.51 | 1 |  |
| `pnj/l26/mia-answell-matelot-fluvial-humain-argent-1.webp` | Mia Answell — Matelot fluvial humain (Argent 1) | Mia Answell — Human Boat-Hand (Silver 1) | L26 p.51 | 1 |  |
| `pnj/l26/sofia-fischer-novice-humaine-bronze-2.webp` | Sofia Fischer — Novice humaine (Bronze 2) | Sofia Fischer — Human Greenfish (Brass 2) | L26 p.52 | 1 |  |
| `pnj/l26/uwe-wasserhund-rejeton-humain-or-1.webp` | Uwe Wasserhund — Rejeton humain (Or 1) | Uwe Wasserhund — Human Scion (Gold 1) | L26 p.53 | 1 |  |
| `pnj/l26/altgrafin-emelia-luneburg-magnat-humain-or-5.webp` | Altgräfin Emelia Luneburg — Magnat humain (Or 5) | Altgräfin Emelia Luneburg — Human Magnate (Gold 5) | L26 p.54 | 1 |  |
| `pnj/l26/simone-l-escalier-saltimbanque-humaine-bronze-3.webp` | Simone L’Escalier — Saltimbanque humaine (Bronze 3) | Simone L'Escalier — Human Busker (Brass 3) | L26 p.55 | 1 |  |
| `pnj/l26/sigrund-dopplewasser-escroc-humain-bronze-3.webp` | Sigrund Dopplewasser — Escroc humain (Bronze 3) | Sigrund Dopplewasser — Human Swindler (Brass 3) | L26 p.56 | 1 |  |
| `pnj/l26/sven-stoutbeard-ingenieur-nain-argent-2.webp` | Sven Stoutbeard — Ingénieur nain (Argent 2) | Sven Stoutbeard — Dwarf Dwarven Engineer (Silver 2) | L26 p.57 | 1 |  |
| `pnj/l26/bella-hornwhistler-etudiante-halfling-argent-1.webp` | Bella Hornwhistler — Étudiante halfling (Argent 1) | Bella Hornwhistler — Halfling Student (Silver 1) | L26 p.58 | 1 |  |
| `pnj/l26/agrin-le-sang-du-flagellant-est-celui-de-sigmar-losburg-zelote-humain-bronze-0.webp` | Agrin « Le sang du flagellant est celui de Sigmar » Losburg — Zélote humain (Bronze 0) | Agrin 'The Blood of the Flagellant Is Sigmar's Own' Losburg — Human Zealot (Brass 0) | L26 p.59 | 1 |  |
| `pnj/l26/krazold-ironhand-guide-fluvial-nain-bronze-4.webp` | Krazold Ironhand — Guide fluvial nain (Bronze 4) | Krazold Ironhand — Dwarf Riverguide (Brass 4) | L26 p.60 | 1 |  |
| `pnj/l26/dederick-ritter-capitaine-de-naufrageurs-humain.webp` | Dederick Ritter — Capitaine de naufrageurs humain | Dederick Ritter — Human Wrecker Captain | L26 p.81 | 1 |  |
| `pnj/l26/boris-landsmaan-pirate-humain-typique-matelot-fluvial.webp` | Boris Landsmaan — Pirate humain typique (matelot fluvial) | Boris Landsmaan — Typical Human Pirate (Boat-Hand) | L26 p.82 | 1 |  |
| `pnj/l26/reginhard-vieth-capitaine-pirate-humain-maitre-d-armes-de-navire-or-1.webp` | Reginhard Vieth — Capitaine pirate humain (Maître d’armes de navire, Or 1) | Reginhard Vieth — Human Pirate Captain (Shipsword Master, Gold 1) | L26 p.83 | 1 |  |
| `pnj/l26/sophie-van-haagen-marchand-humain-argent-5.webp` | Sophie van Haagen — Marchand humain (Argent 5) | Sophie van Haagen — Human Merchant (Silver 5) | L26 p.84 | 1 |  |
| `pnj/l26/capitaine-regina-willendorf-maitre-de-barge-humain-ancien-huffer-et-prepose-or-1.webp` | Capitaine Regina Willendorf — Maître de barge humain, ancien Huffer et préposé (Or 1) | Captain Regina Willendorf — Human Barge Master, Former Huffer and Attendant (Gold 1) | L26 p.104 | 1 |  |
| `pnj/l26/premier-pilote-ella-greendale-maitre-pilote-halfling-ancienne-bateliere-argent-5.webp` | Premier pilote Ella Greendale — Maître pilote halfling, ancienne batelière (Argent 5) | First Pilot Ella Greendale — Halfling Master Pilot, Former Boatman (Silver 5) | L26 p.105 | 1 |  |
| `pnj/l26/second-pilote-reiner-petersen-pilote-humain-ancien-batelier-argent-3.webp` | Second pilote Reiner Petersen — Pilote humain, ancien batelier (Argent 3) | Second Pilot Reiner Petersen — Human Pilot, Former Boatman (Silver 3) | L26 p.105 | 1 |  |
| `pnj/l26/maitre-d-equipage-hans-sauber-maitre-de-barge-humain-ancien-sergent-argent-3.webp` | Maître d’équipage Hans Sauber — Maître de barge humain, ancien sergent (Argent 3) | Bosun Hans Sauber — Human Bargeswain, Former Sergeant (Silver 3) | L26 p.106 | 1 |  |
| `pnj/l26/chef-cuisinier-maximillian-max-berryhill-maitre-artisan-halfling-argent-3.webp` | Chef cuisinier Maximillian « Max » Berryhill — Maître artisan halfling (Argent 3) | Chief Cook Maximillian `Max' Berryhill — Halfling Master Artisan (Silver 3) | L26 p.107 | 1 |  |
| `pnj/l26/commissaire-de-bord-eberhardt-kleingeld-prepose-humain-ancien-matelot-fluvial-argent-5.webp` | Commissaire de bord Eberhardt Kleingeld — Préposé humain, ancien matelot fluvial (Argent 5) | Purser Eberhardt Kleingeld — Human Attendant, Former Boat-Hand (Silver 5) | L26 p.108 | 1 |  |
| `pnj/l26/frere-martin-et-frere-rolf-moines-ou-nonnes-humains-bronze-4.webp` | Frère Martin et frère Rolf — Moines (ou nonnes) humains (Bronze 4) | Brother Martin and Brother Rolf — Human Monks (Nuns) (Brass 4) | L26 p.116 | 1 |  |
| `pnj/l26/pere-marcus-professeur-humain-ancien-abbe-or-1.webp` | Père Marcus — Professeur humain, ancien abbé (Or 1) | Father Marcus — Human Professor, Former Abbot (Gold 1) | L26 p.116 | 1 |  |

## `bestiaire/forme-bestiale`

Bêtes de la Forme bestiale (Livre de base pp. 325-327) sans image dans l’une des deux variantes : `-bete` pour le Vent des Bêtes, `-vie` pour le Vent de Jade.

Aucune : chaque bête a ses deux images.

## `monstres/transformation-kadon`

Monstres de la Transformation de Kadon (Livre de base pp. 328-335) sans image dédiée. Le pion ne change pas sous cette transformation tant que ces images n’existent pas (hors périmètre du chantier).

| Fichier proposé | Monstre | Clé | Page |
| --- | --- | --- | ---: |
| `monstres/transformation-kadon/pieuvre-des-marais.webp` | Pieuvre des marais | bog-octopus | 328 |
| `monstres/transformation-kadon/demi-griffon.webp` | Demi-griffon | demigryph | 329 |
| `monstres/transformation-kadon/dragon.webp` | Dragon | dragon | 330 |
| `monstres/transformation-kadon/bete-des-fanges.webp` | Bête des fanges | fenbeast | 331 |
| `monstres/transformation-kadon/geant.webp` | Géant | giant | 332 |
| `monstres/transformation-kadon/griffon.webp` | Griffon | griffon | 332 |
| `monstres/transformation-kadon/manticore.webp` | Manticore | manticore | 333 |
| `monstres/transformation-kadon/pegase.webp` | Pégase | pegasus | 334 |
| `monstres/transformation-kadon/troll.webp` | Troll | troll | 335 |
