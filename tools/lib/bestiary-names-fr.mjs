/**
 * Noms français des profils : « L05 p.n » quand le livre de base FR (V4) donne le nom du même profil, sinon « proposition » de l'exécutant
 * (consignée dans CHOIX_EXECUTANT_PHASE_E.md pour relecture du MJ). Clé : identifiant d'inventaire.
 */
const l05 = (page, name) => ({ nameFr: name, source: `L05 p.${page + 0}` });
const proposal = name => ({ nameFr: name, source: 'proposition' });

export const NAMES_FR = Object.freeze({
  // Livre de base V5 (L06)
  'E0-P-063': l05(311, 'Humain'), 'E0-P-064': l05(311, 'Halfling'), 'E0-P-065': l05(311, 'Nain'), 'E0-P-066': l05(311, 'Elfe (haut et sylvain)'),
  'E0-P-067': proposal('Milicien humain'), 'E0-P-068': proposal('Marchand humain'), 'E0-P-069': proposal('Voyou humain'), 'E0-P-070': proposal('Halfling voleur'),
  'E0-P-071': proposal('Gnome'), 'E0-P-072': l05(312, 'Ogre'), 'E0-P-073': l05(316, 'Sanglier'), 'E0-P-074': l05(315, 'Chien'), 'E0-P-075': l05(316, 'Rat géant'),
  'E0-P-076': l05(314, 'Araignée géante'), 'E0-P-077': l05(314, 'Cheval'), 'E0-P-078': l05(315, 'Loup'), 'E0-P-079': l05(323, 'Pieuvre des tourbières'),
  'E0-P-080': l05(323, 'Squig des cavernes'), 'E0-P-081': l05(318, 'Demigriffon'), 'E0-P-082': l05(319, 'Dragon'), 'E0-P-083': l05(318, 'Bête des marais'),
  'E0-P-084': l05(320, 'Géant'), 'E0-P-085': l05(320, 'Griffon'), 'E0-P-086': l05(322, 'Manticore'), 'E0-P-087': l05(323, 'Pégase'), 'E0-P-088': l05(324, 'Troll'),
  'E0-P-089': l05(326, 'Gobelin'), 'E0-P-090': l05(325, 'Orc'), 'E0-P-091': l05(328, 'Goule de crypte'), 'E0-P-092': l05(326, 'Snotling'), 'E0-P-093': l05(329, 'Squelette'),
  'E0-P-094': l05(330, 'Zombie'), 'E0-P-095': l05(328, 'Loup funeste'), 'E0-P-096': l05(328, 'Fantôme'), 'E0-P-097': l05(329, 'Spectre de cairn'), 'E0-P-098': l05(327, 'Banshee'),
  'E0-P-099': l05(330, 'Vampire'), 'E0-P-100': l05(327, 'Varghulf'), 'E0-P-101': l05(332, 'Gor'), 'E0-P-102': l05(332, 'Ungor'), 'E0-P-103': l05(332, 'Minotaure'),
  'E0-P-104': l05(333, 'Cultiste'), 'E0-P-105': l05(333, 'Mutant'), 'E0-P-106': l05(334, 'Guerrier du Chaos'), 'E0-P-107': l05(335, 'Sanguinaire de Khorne'),
  'E0-P-108': l05(335, 'Démonette de Slaanesh'), 'E0-P-109': l05(337, 'Guerrier des clans'), 'E0-P-110': l05(337, 'Vermine de choc'), 'E0-P-111': l05(337, 'Rat-ogre'),
  'E0-P-112': proposal('Soldat'), 'E0-P-113': proposal('Tirailleur'), 'E0-P-114': proposal('Élite'), 'E0-P-115': proposal('Meneur'), 'E0-P-116': proposal('Commandant'),
  'E0-P-117': proposal('Lanceur de sorts'), 'E0-P-118': proposal('Seigneur lanceur de sorts'),
  'E0-P-119': proposal('Skrakk — Bestigor (Élite)'), 'E0-P-120': proposal('Ungrakk — Seigneur-bête gor (Commandant)'),
  'E0-P-121': proposal('Swilegrakk — Chamane-bray (Lanceur de sorts)'), 'E0-P-122': proposal('Guzgog — Tirailleur ungor'),
  // Archives of the Empire 2 (L01)
  'E0-P-123': proposal('Isrogdal l’Urgent — Ogre protagoniste, ancien pugiliste (Argent 1)'), 'E0-P-124': proposal('Ugrik le Perdu — Ogre hors-la-loi (Bronze 2)'),
  'E0-P-128': proposal('Margaret von Aschendorf — Abbesse (Shallya) (Argent 2)'), 'E0-P-129': proposal('Clementine Clausewitz — Sœur (Shallya) (Bronze 4)'),
  'E0-P-130': proposal('Marie Duvallier — Sœur (Shallya), ancienne médecin (Bronze 4)'), 'E0-P-131': proposal('Anna-Lise Levertske — Sœur, ancienne apothicaire (Bronze 4)'),
  'E0-P-132': proposal('Sœur type — Sœur (Shallya) (Bronze 4)'), 'E0-P-133': proposal('Hanna Bratsch — Auxiliaire, ancienne sergente (Bronze 3*)'),
  'E0-P-134': proposal('Erzbet Wegener — Patiente (Bronze 0)'), 'E0-P-135': proposal('Adalmann von Hopfberg — Seigneur noble (Or 7)'),
  // Lustria (L07)
  'E0-P-243': proposal('Adella aux Mille Bouches'), 'E0-P-244': proposal('Soren Hoarder — Vitki'), 'E0-P-245': proposal('Serpents de Sotek'),
  'E0-P-246': proposal('Rejeton saurus difforme'), 'E0-P-247': proposal('Uthl’Kritchnaak — Héraut exalté de Nurgle'), 'E0-P-248': proposal('Seigneur Skrolk — Seigneur de la peste skaven'),
  'E0-P-249': proposal('Black Jens — Chancelier goule'), 'E0-P-250': proposal('Luthor Harkon — Vampire archi-grand — Commodore et empereur autoproclamé'),
  'E0-P-251': proposal('L’Épouse de la saumure — Sirène et sorcière'), 'E0-P-252': proposal('Seigneur Finrian'), 'E0-P-253': proposal('Roc plume-vive'),
  'E0-P-256': proposal('Slann de la cinquième génération'), 'E0-P-257': proposal('Slann de la quatrième génération'), 'E0-P-258': proposal('Slann de la deuxième génération'),
  'E0-P-259': proposal('Slann de la première génération'), 'E0-P-260': proposal('Slann de la troisième génération'), 'E0-P-262': proposal('Anomoq — Prêtre skink de Sotek'),
  'E0-P-263': proposal('Skink caméléon'), 'E0-P-265': proposal('Garde du temple saurus'), 'E0-P-266': proposal('Crotaz’L, vétéran balafré'), 'E0-P-269': proposal('Tlat’L l’Énigme, protecteur coatl'),
  'E0-P-270': proposal('Nuage de spores assoiffé de sang'), 'E0-P-271': proposal('Épine-à-empaler'), 'E0-P-272': proposal('Vipérine'), 'E0-P-273': proposal('Liane rampante agrippeuse'),
  'E0-P-274': proposal('Larve itxi'), 'E0-P-275': proposal('Sangsue de feu'), 'E0-P-276': proposal('Cervelle-douve'), 'E0-P-277': proposal('Ver aveugle pâle'),
  'E0-P-278': proposal('Fourmi charognarde'), 'E0-P-279': proposal('Guêpe de sang'), 'E0-P-280': proposal('Chassipède'), 'E0-P-281': proposal('Asticot de sang'),
  'E0-P-282': proposal('Rainette lustrienne'), 'E0-P-283': proposal('Crapaud tache-d’encre'), 'E0-P-284': proposal('Lézard piranha'), 'E0-P-285': proposal('Reptilion à crinière d’écailles'),
  'E0-P-286': proposal('Hyénadon'), 'E0-P-288': proposal('Aspic à anneaux bleus'), 'E0-P-289': proposal('Serpent foreur'), 'E0-P-290': proposal('Python des marais d’Amaxon'),
  'E0-P-291': proposal('Chauve-souris géante'), 'E0-P-292': proposal('Chauve-souris de sang'), 'E0-P-295': proposal('Sang-froid (monture saurienne)'), 'E0-P-296': proposal('Unicorne saurien'),
  'E0-P-297': proposal('Razordon'), 'E0-P-298': proposal('Salamandre'), 'E0-P-299': proposal('Ripperdactyle'), 'E0-P-300': proposal('Terradon'), 'E0-P-301': proposal('Stégadon'),
  'E0-P-302': proposal('Arcanadon'), 'E0-P-303': proposal('Bastiladon'), 'E0-P-304': proposal('Pliodon'), 'E0-P-305': proposal('Carnosaure'), 'E0-P-306': proposal('Troglodon'),
  'E0-P-307': proposal('Saurien terrifiant'), 'E0-P-308': proposal('Orque sauvage'), 'E0-P-309': proposal('Chamane orque sauvage'), 'E0-P-310': proposal('Chef orque sauvage'),
  // Temple of Spite (L09)
  'E0-P-311': proposal('Elfe noir'), 'E0-P-312': proposal('Elfe noir de haute naissance'), 'E0-P-313': proposal('Elfe noir de basse naissance (citadin)'),
  'E0-P-314': proposal('Elfe noir de basse naissance (des terres sauvages)'), 'E0-P-315': proposal('Destrier noir'), 'E0-P-316': proposal('Pégase noir'),
  'E0-P-317': proposal('Sang-froid naggarothi'), 'E0-P-318': proposal('Kharibdyss'), 'E0-P-319': proposal('Hydre de guerre'), 'E0-P-320': proposal('Harpie'),
  'E0-P-321': proposal('Dragon de l’Enfer juvénile'), 'E0-P-322': proposal('Dragon de l’Enfer'), 'E0-P-323': proposal('Dragon des mers'),
  'E0-P-324': proposal('Oint druchii'), 'E0-P-325': proposal('Sorcier du feu maudit'), 'E0-P-326': proposal('Guerrier druchii'), 'E0-P-327': proposal('Guerrier d’élite druchii'),
  'E0-P-328': proposal('Officier druchii'), 'E0-P-329': proposal('Capitaine pillard'), 'E0-P-330': proposal('Corsaire'), 'E0-P-331': proposal('Éclaireur'),
  'E0-P-332': proposal('Ombre-sang'), 'E0-P-333': proposal('Assassin'), 'E0-P-334': proposal('Sorcière druchii'), 'E0-P-335': proposal('Sorcière suprême'),
  'E0-P-336': proposal('Sorcière-elfe de Khaine'), 'E0-P-337': proposal('Mégère'), 'E0-P-338': proposal('Maître des bêtes'), 'E0-P-339': proposal('Suite druchii'),
  'E0-P-340': proposal('Serviteur druchii'),
  'E0-P-341': proposal('Capitaine Valerion Tremendros — Officier de haute naissance'), 'E0-P-342': proposal('Damina Hroska — Assassine de basse naissance (citadine)'),
  'E0-P-343': proposal('Hermizor de la maison Arguental — Suite de haute naissance'), 'E0-P-344': proposal('Jareth Brackblood — Capitaine pillard'),
  'E0-P-345': proposal('Demeth Soulbane — Corsaire'), 'E0-P-346': proposal('Zarugh Kelvain — Équipage de navire'), 'E0-P-347': proposal('Voyou des quais'),
  'E0-P-348': proposal('Harzeth Duskmantle — Maître espion'), 'E0-P-349': proposal('Selin Ebonspite — Agent'), 'E0-P-350': proposal('Daleathra Bladeborn — Agente'),
  'E0-P-351': proposal('Gref — Ombre-sang de basse naissance (des terres sauvages)'), 'E0-P-352': proposal('Kalimel Nightpiercer — Éclaireur'),
  'E0-P-353': proposal('Samuril Meurlith — Sorcière suprême'), 'E0-P-354': proposal('Scorath Scaleflayer — Haut maître des bêtes'), 'E0-P-355': proposal('Kelrathi — Maître des bêtes'),
  'E0-P-356': proposal('Nyandra Filvanir — Capitaine pillard de basse naissance (citadine)'), 'E0-P-357': proposal('Anuidethar Veilthorn — Facteur (marchand)'),
  'E0-P-358': proposal('Selthira Heartrender — Sorcière-elfe de basse naissance (citadine)'), 'E0-P-359': proposal('Haidrath — Mégère de basse naissance (des terres sauvages)'),
  'E0-P-360': proposal('Hulreth — Disciple de Khaine de haute naissance (prêtre guerrier)'), 'E0-P-361': proposal('Duriath Helbane — Maître de flotte'),
  'E0-P-362': proposal('Kheitalla — Mégère de la mort'), 'E0-P-363': proposal('Kernethar Grimwitch — Sorcier fugitif'),
  // Deft Steps, Light Fingers (L04)
  'E0-P-163': proposal('Garde noire de Morr (chevalier)'), 'E0-P-164': proposal('Receleur'), 'E0-P-165': proposal('Faussaire'), 'E0-P-169': proposal('Propriétaire de planque (citadin)'),
  'E0-P-170': proposal('August Sternwachter'), 'E0-P-172': proposal('Gunna von Sperren — Reine des contrebandiers'), 'E0-P-173': proposal('Père Pedragar, prêtre de Taal'),
  'E0-P-174': proposal('Homme du guet'), 'E0-P-177': proposal('Chef de hors-la-loi'), 'E0-P-178': proposal('Chasseur de primes type'), 'E0-P-180': proposal('Lockhund du Hochland'),
  'E0-P-181': proposal('Bamse du Nordland'), 'E0-P-182': proposal('Chien des marais de Grootscher'), 'E0-P-183': proposal('Faucon-colombe'), 'E0-P-184': proposal('Faucon rouge d’Arabie'),
  // Archives of the Empire Volume 1 (L03)
  'E0-P-155': proposal('Spoondrift « spoony » Skelfsider — Pilleur de tombes (Bronze 3)'), 'E0-P-156': proposal('Thelonius Hardcastle Monkenbridge — Thorncobble XII — Héritier (Or 1)'),
  'E0-P-157': proposal('Alrik Skagsson — Inquisiteur (Argent 5)'), 'E0-P-159': proposal('Thyk Hurgarsson — Compagnon de guilde (Argent 5)'),
  'E0-P-160': proposal('Volund Sliverscar — Ingénieur agréé (Or 2)'), 'E0-P-161': proposal('Gurniksson Hammerback — Contremaître mineur'),
  // Archives of the Empire 3 (L02)
  'E0-P-139': proposal('Blaireau'), 'E0-P-140': proposal('Corbeau'), 'E0-P-141': proposal('Renard'), 'E0-P-143': proposal('Chouette'), 'E0-P-144': proposal('Hermine'),
  'E0-P-145': proposal('Seigneur Adalbert Knopp-Inzel — Premier humain — Chevalier (et espion)'), 'E0-P-146': proposal('Frère Samhel — Prêtre de Morr humain'),
  'E0-P-148': proposal('Leonard — Écuyer humain'), 'E0-P-149': proposal('Ridrek Blackhelm — Artiste nain (et espion)'),
  'E0-P-136': proposal('Isabella — Voyante (Bronze 4)'), 'E0-P-137': proposal('Richter Kless — Professeur (Or 1)')
});
