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
  'E0-P-136': proposal('Isabella — Voyante (Bronze 4)'), 'E0-P-137': proposal('Richter Kless — Professeur (Or 1)')
});
