/**
 * Imperium Maledictum : tables de Maladresse (p. 355) et de Blessures critiques (p. 358-361).
 * Module pur, zéro import. Les textes sont de courtes paraphrases en français ; chaque entrée cite
 * sa page imprimée du Core Book (page du PDF = page imprimée). Aucun texte anglais du livre n'est
 * recopié ici.
 */

// ---------------------------------------------------------------------------
// Table de Maladresse (Fumble Table), jets de 1 à 10, p. 355
// ---------------------------------------------------------------------------

export const TABLE_MALADRESSE = Object.freeze([
  Object.freeze({ min: 1, max: 1, id: 'initiative-bas', nom: 'Initiative rétrogradée',
    resume: 'Retombe en bas de l\'ordre d\'Initiative au prochain round.', effet: 'initiativeBas', page: 355 }),
  Object.freeze({ min: 2, max: 2, id: 'desavantage-tour', nom: 'Désavantage général',
    resume: 'Désavantage à tous les tests jusqu\'à la fin de votre prochain tour.', effet: 'desavantageTour', page: 355 }),
  Object.freeze({ min: 3, max: 3, id: 'lacher-arme', nom: 'Arme lâchée',
    resume: 'Lâche l\'arme utilisée pour attaquer ; on peut la ramasser en action gratuite.', effet: 'lacherArme', page: 355 }),
  Object.freeze({ min: 4, max: 4, id: 'a-terre', nom: 'À terre',
    resume: 'Tombe à terre (état À terre).', effet: 'aTerre', page: 355 }),
  Object.freeze({ min: 5, max: 5, id: 'vitesse-lente', nom: 'Vitesse réduite',
    resume: 'Vitesse réduite à Lente jusqu\'à la fin de la rencontre (ce n\'est pas une blessure critique).', effet: 'vitesseLente', page: 355 }),
  Object.freeze({ min: 6, max: 6, id: 'arme-instable', nom: 'Arme instable',
    resume: 'L\'arme devient Instable (p. 125) jusqu\'à une réparation : test Ardu (-20) de Tech (Ingénierie).', effet: 'armeInstable', page: 355 }),
  Object.freeze({ min: 7, max: 7, id: 'aveugle-ou-assourdi', nom: 'Aveuglé ou assourdi',
    resume: 'Aveuglé ou Assourdi, au choix du MJ selon ce qui convient le mieux à l\'arme.', effet: 'aveugleOuAssourdi', page: 355 }),
  Object.freeze({ min: 8, max: 8, id: 'armure-moins-1', nom: 'Armure endommagée',
    resume: 'Armure d\'une localisation aléatoire réduite de 1 jusqu\'à réparation ; 1 blessure à la place si aucune armure à cet endroit.', effet: 'armureMoins1', page: 355 }),
  Object.freeze({ min: 9, max: 9, id: 'sonne-ou-hemorragique', nom: 'Sonné ou hémorragique',
    resume: 'Sonné ou Hémorragique, au choix du MJ selon ce qui convient le mieux à l\'arme.', effet: 'sonneOuHemorragique', page: 355 }),
  Object.freeze({ min: 10, max: 10, id: 'touche-allie', nom: 'Touche un allié',
    resume: 'Touche un allié aléatoire à portée de l\'arme avec un DR de +0 sur une localisation aléatoire ; soi-même s\'il n\'y a personne en portée.', effet: 'toucheAllie', page: 355 })
]);

// ---------------------------------------------------------------------------
// Tables de Blessures critiques, p. 358-361
// Chaque entrée : { min, max, id, nom, resume, etats: [{ id, niveau? }], blessure,
//                   traitementRequis, mortImmediate, page }
// - `traitementRequis` false = « Aucun traitement requis » (p. 219/356) : ne compte pas comme blessure
//   critique non traitée pour la mort (p. 215).
// - `mortImmediate` true = entrée mortelle du livre.
// ---------------------------------------------------------------------------

export const TABLES_CRITIQUES = Object.freeze({
  // Tête, p. 358, jets de 1 à 15+
  tete: Object.freeze([
    Object.freeze({ min: 1, max: 1, id: 'oeil-au-beurre-noir', nom: 'Œil au beurre noir',
      resume: 'Désavantage aux tests de Perception (Vue) et de Tir pendant 1 heure.',
      etats: [], blessure: null, traitementRequis: false, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 2, max: 2, id: 'coup-etourdissant', nom: 'Coup étourdissant',
      resume: 'Sonné jusqu\'à la fin du prochain tour.',
      etats: [{ id: 'sonne' }], blessure: null, traitementRequis: false, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 3, max: 3, id: 'laceration', nom: 'Lacération',
      resume: 'Hémorragique (mineur) à la joue.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 4, max: 4, id: 'oreille-decoupee', nom: 'Oreille découpée',
      resume: 'Assourdi jusqu\'à la fin du prochain tour et Hémorragique (mineur).',
      etats: [{ id: 'assourdi' }, { id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 5, max: 5, id: 'machoire-deboitee', nom: 'Mâchoire déboîtée',
      resume: 'Sonné jusqu\'à la fin du prochain tour ; Désavantage aux tests de Sociabilité et à tout test qui repose sur la parole. Mâchoire fêlée (os cassé mineur).',
      etats: [{ id: 'sonne' }], blessure: 'os-casse-mineur', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 6, max: 6, id: 'front-ouvert', nom: 'Front ouvert',
      resume: 'Aveuglé et Hémorragique (mineur).',
      etats: [{ id: 'aveugle' }, { id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 7, max: 7, id: 'oeil-grave', nom: 'Œil gravement blessé',
      resume: 'Hémorragique (mineur) et Désavantage à la Perception (Vue) ; si un seul œil, Aveuglé. Orbite brisée (os cassé majeur).',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 8, max: 8, id: 'tympan-grave', nom: 'Tympan gravement atteint',
      resume: 'Assourdi ; si ce résultat tombe une seconde fois, la surdité devient permanente.',
      etats: [{ id: 'assourdi' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 9, max: 9, id: 'bouche-ecrasee', nom: 'Bouche écrasée',
      resume: 'Hémorragique (mineur) ; test de E (Endurance (Douleur)) Intermédiaire ou À terre. Perte de 1d10 dents.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }, { id: 'a-terre' }], blessure: 'amputation-dents', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 10, max: 10, id: 'nez-casse', nom: 'Nez cassé',
      resume: 'Hémorragique (majeur) et Aveuglé jusqu\'à la fin du prochain tour ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné jusqu\'à la fin du prochain tour. Nez brisé (os cassé majeur).',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'aveugle' }, { id: 'sonne' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 11, max: 11, id: 'oreille-arrachee', nom: 'Oreille arrachée',
      resume: 'Assourdi et Hémorragique (majeur) ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné jusqu\'à la fin du prochain tour. Perte de l\'oreille.',
      etats: [{ id: 'assourdi' }, { id: 'hemorragique', niveau: 'majeur' }, { id: 'sonne' }], blessure: 'amputation-oreille', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 12, max: 12, id: 'commotion', nom: 'Commotion cérébrale',
      resume: 'Assourdi et Sonné pendant 1 minute, Hémorragique (mineur) ; Exténué pendant 1d10 jours quoi qu\'il arrive.',
      etats: [{ id: 'assourdi' }, { id: 'sonne' }, { id: 'hemorragique', niveau: 'mineur' }, { id: 'extenue' }], blessure: 'commotion', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 13, max: 13, id: 'oeil-devaste', nom: 'Œil dévasté',
      resume: 'Hémorragique (majeur) et Désavantage à la Perception (Vue) ; si un seul œil, Aveuglé. Perte de l\'œil.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: 'amputation-oeil', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 14, max: 14, id: 'machoire-broyee', nom: 'Mâchoire broyée',
      resume: 'Hémorragique (majeur) ; test de E (Endurance (Douleur)) Intermédiaire : succès → Sonné jusqu\'à la fin du prochain tour, échec → Neutralisé jusqu\'à la fin du prochain tour et À terre. Perte de 1d10 dents, mâchoire brisée (os cassé majeur).',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'sonne' }, { id: 'neutralise' }, { id: 'a-terre' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 358 }),
    Object.freeze({ min: 15, max: 99, id: 'crane-fracture', nom: 'Crâne fracturé',
      resume: 'Le crâne est écrasé ou pulvérisé : mort immédiate.',
      etats: [], blessure: null, traitementRequis: true, mortImmediate: true, page: 358 })
  ]),
  // Bras, p. 359, jets de 1 à 20+
  bras: Object.freeze([
    Object.freeze({ min: 1, max: 1, id: 'poignet-tordu', nom: 'Poignet tordu',
      resume: 'Lâche tout objet tenu en main.',
      etats: [], blessure: null, traitementRequis: false, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 2, max: 2, id: 'bras-engourdi', nom: 'Bras engourdi',
      resume: 'Désavantage à tous les tests utilisant le bras pendant 1 minute.',
      etats: [], blessure: null, traitementRequis: false, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 3, max: 3, id: 'laceration', nom: 'Lacération',
      resume: 'Hémorragique (mineur) au bras.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 4, max: 4, id: 'main-decoupee', nom: 'Main découpée',
      resume: 'Hémorragique (mineur) et lâche l\'objet tenu en main.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 5, max: 5, id: 'epaule-deboitee', nom: 'Épaule déboîtée',
      resume: 'Bras inutilisable ; à chaque début de tour, test de E (Endurance (Douleur)) Intermédiaire ou Sonné jusqu\'au début du prochain tour.',
      etats: [{ id: 'sonne' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 6, max: 6, id: 'doigt-sectionne', nom: 'Doigt sectionné',
      resume: 'Hémorragique (majeur) ; perte d\'un doigt.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: 'amputation-doigt', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 7, max: 7, id: 'fracture-nette', nom: 'Fracture nette',
      resume: 'Bras complètement inutilisable, lâche l\'objet tenu ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné 1 minute. Os cassé (mineur) au bras.',
      etats: [{ id: 'sonne' }], blessure: 'os-casse-mineur', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 8, max: 8, id: 'balafre-profonde', nom: 'Balafre profonde',
      resume: 'Hémorragique (majeur) et Désavantage à tous les tests utilisant le bras.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 9, max: 9, id: 'main-ecrasee', nom: 'Main écrasée',
      resume: 'Hémorragique (majeur), lâche l\'objet tenu ; perte de 1d10-5 doigts (0 = aucun). Main broyée (os cassé majeur), amputation des doigts sinon.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 10, max: 10, id: 'coude-brise', nom: 'Coude brisé',
      resume: 'Bras complètement inutilisable, lâche l\'objet tenu ; test de E (Endurance (Douleur)) Difficile (-10) ou Sonné 1 minute. Os cassé (majeur) au bras.',
      etats: [{ id: 'sonne' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 11, max: 12, id: 'main-fendue', nom: 'Main fendue',
      resume: 'Hémorragique (majeur), lâche l\'objet tenu ; test de E (Endurance (Douleur)) Difficile (-10) ou Sonné 1 minute. Perte d\'un doigt, plus un doigt par minute non traitée ; tous perdus → amputation de la main.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'sonne' }], blessure: 'amputation-doigt', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 13, max: 14, id: 'artere-sectionnee', nom: 'Artère sectionnée',
      resume: 'Hémorragique (majeur), bras complètement inutilisable, lâche l\'objet tenu ; Exténué pendant 1d10 jours (perte de sang).',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'extenue' }], blessure: 'extenue-longue-duree', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 15, max: 16, id: 'main-sectionnee', nom: 'Main sectionnée',
      resume: 'Hémorragique (majeur) et Sonné 1 heure ; perte de la main.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'sonne' }], blessure: 'amputation-main', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 17, max: 19, id: 'bras-ruine', nom: 'Bras ruiné',
      resume: 'Bras complètement inutilisable, lâche l\'objet tenu, Hémorragique (majeur) et Sonné 1 heure ; tout dégât supplémentaire au bras → blessure de démembrement brutal et mort. Amputation (bras) requise.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'sonne' }], blessure: 'amputation-bras', traitementRequis: true, mortImmediate: false, page: 359 }),
    Object.freeze({ min: 20, max: 99, id: 'demembrement', nom: 'Démembrement brutal',
      resume: 'Le bras est complètement arraché : choc et hémorragie massive, mort.',
      etats: [], blessure: null, traitementRequis: true, mortImmediate: true, page: 359 })
  ]),
  // Corps, p. 360, jets de 1 à 18+
  corps: Object.freeze([
    Object.freeze({ min: 1, max: 1, id: 'souffle-coupe', nom: 'Souffle coupé',
      resume: 'Sonné jusqu\'à la fin du prochain tour.',
      etats: [{ id: 'sonne' }], blessure: null, traitementRequis: false, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 2, max: 2, id: 'coup-bas', nom: 'Coup bas',
      resume: 'Test de E (Endurance (Douleur)) Intermédiaire ou À terre.',
      etats: [{ id: 'a-terre' }], blessure: null, traitementRequis: false, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 3, max: 3, id: 'laceration', nom: 'Lacération',
      resume: 'Hémorragique (mineur) au torse.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 4, max: 4, id: 'coup-au-ventre', nom: 'Coup au ventre',
      resume: 'Hémorragique (mineur) et À terre.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }, { id: 'a-terre' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 5, max: 5, id: 'cote-feluree', nom: 'Côte fêlée',
      resume: 'Désavantage aux tests de Force et d\'Agilité, Vitesse réduite d\'un cran. Côte fêlée (os cassé mineur au torse).',
      etats: [], blessure: 'os-casse-mineur', traitementRequis: false, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 6, max: 6, id: 'coup-martele', nom: 'Coup martelé',
      resume: 'Sonné 1 minute et Hémorragique (mineur).',
      etats: [{ id: 'sonne' }, { id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 7, max: 7, id: 'clavicule-cassee', nom: 'Clavicule cassée',
      resume: 'Lâche l\'objet tenu du côté atteint (gauche ou droite au hasard) et Désavantage aux tests utilisant ce bras ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné 1 minute. Clavicule cassée (os cassé mineur, traité comme un bras cassé).',
      etats: [{ id: 'sonne' }], blessure: 'os-casse-mineur', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 8, max: 8, id: 'balafre-profonde', nom: 'Balafre profonde',
      resume: 'Hémorragique (majeur) au bas-ventre et Vitesse réduite d\'un cran.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 9, max: 9, id: 'hanche-fracturee', nom: 'Hanche fracturée',
      resume: 'À terre, Désavantage aux tests de mobilité, Vitesse réduite d\'un cran ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné 1 minute. Hanche fracturée (os cassé mineur, traitée comme une jambe cassée).',
      etats: [{ id: 'a-terre' }, { id: 'sonne' }], blessure: 'os-casse-mineur', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 10, max: 10, id: 'cotes-brisees', nom: 'Côtes brisées',
      resume: 'Désavantage à tous les tests physiques, Vitesse réduite de deux crans (minimum Lente). Os cassé (majeur) au torse.',
      etats: [], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 11, max: 11, id: 'poumon-perce', nom: 'Poumon perforé',
      resume: 'Exténué et Hémorragique (mineur) ; poumon endommagé, partiellement rempli de liquides.',
      etats: [{ id: 'extenue' }, { id: 'hemorragique', niveau: 'mineur' }], blessure: 'poumon-endommage', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 12, max: 13, id: 'artere-sectionnee', nom: 'Artère sectionnée',
      resume: 'Hémorragique (majeur), Exténué pendant 1d10 jours (perte de sang), Désavantage à la mobilité, Vitesse réduite d\'un cran, À terre.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'extenue' }, { id: 'a-terre' }], blessure: 'extenue-longue-duree', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 14, max: 15, id: 'chair-arrachee', nom: 'Chair arrachée',
      resume: 'Hémorragique (majeur), À terre, Sonné 1 heure ; plaie ouverte laissant voir os et organes.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }, { id: 'sonne' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 16, max: 17, id: 'colonne-atteinte', nom: 'Colonne vertébrale atteinte',
      resume: 'Hémorragique (majeur) et À terre ; colonne fendue ou cassée (os cassé majeur au torse).',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 360 }),
    Object.freeze({ min: 18, max: 99, id: 'ecartele', nom: 'Écartelé',
      resume: 'Le corps est déchiré en deux ; les créatures à Courte portée sont aspergées de sang : mort.',
      etats: [], blessure: null, traitementRequis: true, mortImmediate: true, page: 360 })
  ]),
  // Jambe, p. 361, jets de 1 à 20+
  jambe: Object.freeze([
    Object.freeze({ min: 1, max: 1, id: 'cheville-tordue', nom: 'Cheville tordue',
      resume: 'Tombe À terre.',
      etats: [{ id: 'a-terre' }], blessure: null, traitementRequis: false, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 2, max: 2, id: 'jambe-engourdie', nom: 'Jambe engourdie',
      resume: 'Vitesse réduite d\'un cran pendant 1 minute.',
      etats: [], blessure: null, traitementRequis: false, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 3, max: 3, id: 'laceration', nom: 'Lacération',
      resume: 'Hémorragique (mineur) à la jambe.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 4, max: 4, id: 'mollet-decoupe', nom: 'Mollet découpé',
      resume: 'Hémorragique (mineur) et À terre.',
      etats: [{ id: 'hemorragique', niveau: 'mineur' }, { id: 'a-terre' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 5, max: 5, id: 'genou-deboite', nom: 'Genou déboîté',
      resume: 'Désavantage aux tests de mobilité, Vitesse réduite d\'un cran ; à chaque début de tour, test de E (Endurance (Douleur)) Intermédiaire ou Sonné jusqu\'au début du prochain tour.',
      etats: [{ id: 'sonne' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 6, max: 6, id: 'orteil-sectionne', nom: 'Orteil sectionné',
      resume: 'Hémorragique (majeur) ; perte d\'un orteil.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: 'amputation-orteil', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 7, max: 7, id: 'fracture-nette', nom: 'Fracture nette',
      resume: 'Jambe complètement inutilisable, À terre, Désavantage à la mobilité, Vitesse réduite d\'un cran ; test de E (Endurance (Douleur)) Intermédiaire ou Sonné 1 minute. Os cassé (mineur) à la jambe.',
      etats: [{ id: 'a-terre' }, { id: 'sonne' }], blessure: 'os-casse-mineur', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 8, max: 8, id: 'balafre-profonde', nom: 'Balafre profonde',
      resume: 'Hémorragique (majeur) et Désavantage à tous les tests utilisant la jambe (saut, escalade...).',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }], blessure: null, traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 9, max: 9, id: 'pied-broye', nom: 'Pied broyé',
      resume: 'Hémorragique (majeur), À terre, Vitesse réduite d\'un cran ; perte de 1d10-5 orteils (0 = aucun). Pied broyé (os cassé majeur), amputation des orteils sinon.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 10, max: 10, id: 'genou-brise', nom: 'Genou brisé',
      resume: 'Jambe complètement inutilisable, À terre, Vitesse réduite d\'un cran, Désavantage à la mobilité ; test de E (Endurance (Douleur)) Difficile (-10) ou Sonné 1 minute. Os cassé (majeur) à la jambe.',
      etats: [{ id: 'a-terre' }, { id: 'sonne' }], blessure: 'os-casse-majeur', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 11, max: 12, id: 'pied-fendu', nom: 'Pied fendu',
      resume: 'Hémorragique (majeur), À terre ; test de E (Endurance (Douleur)) Difficile (-10) ou Sonné 1 minute. Perte d\'un orteil, plus un orteil par minute non traitée ; tous perdus → amputation du pied.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }, { id: 'sonne' }], blessure: 'amputation-orteil', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 13, max: 14, id: 'artere-sectionnee', nom: 'Artère sectionnée',
      resume: 'Hémorragique (majeur), Exténué pendant 1d10 jours (perte de sang), Désavantage à la mobilité, Vitesse réduite d\'un cran, À terre.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'extenue' }, { id: 'a-terre' }], blessure: 'extenue-longue-duree', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 15, max: 16, id: 'pied-sectionne', nom: 'Pied sectionné',
      resume: 'Hémorragique (majeur), À terre, Sonné 1 heure ; perte du pied.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }, { id: 'sonne' }], blessure: 'amputation-pied', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 17, max: 19, id: 'jambe-ruinee', nom: 'Jambe ruinée',
      resume: 'Jambe complètement inutilisable, À terre, Vitesse réduite d\'un cran, Désavantage à la mobilité, Hémorragique (majeur), Sonné 1 heure ; tout dégât supplémentaire à la jambe → démembrement brutal et mort. Amputation (jambe) requise.',
      etats: [{ id: 'hemorragique', niveau: 'majeur' }, { id: 'a-terre' }, { id: 'sonne' }], blessure: 'amputation-jambe', traitementRequis: true, mortImmediate: false, page: 361 }),
    Object.freeze({ min: 20, max: 99, id: 'demembrement', nom: 'Démembrement brutal',
      resume: 'La jambe est complètement arrachée : choc et hémorragie massive, mort.',
      etats: [], blessure: null, traitementRequis: true, mortImmediate: true, page: 361 })
  ])
});

/** Table de Maladresse pour un jet de 1 à 10 (borné dans 1..10), p. 355. */
export function consulterMaladresse(jet) {
  const n = Number(jet);
  if (!Number.isInteger(n)) throw new RangeError(`Jet de maladresse non entier : ${jet}`);
  const borne = Math.max(1, Math.min(TABLE_MALADRESSE.length, n));
  return TABLE_MALADRESSE.find(e => borne >= e.min && borne <= e.max);
}

const ALIAS_LOCALISATION = Object.freeze({
  'tete': 'tete', 'bras-g': 'bras', 'bras-d': 'bras', 'bras': 'bras',
  'corps': 'corps', 'jambe-g': 'jambe', 'jambe-d': 'jambe', 'jambe': 'jambe'
});

/**
 * Entrée de la table de critiques pour une localisation et un total de sévérité (1d10 + excédent).
 * Accepte `tete`, `bras-g`/`bras-d`/`bras`, `corps`, `jambe-g`/`jambe-d`/`jambe` (p. 211) ; le total
 * est borné au maximum de la table (les entrées « N+ » couvrent jusqu'au bout).
 */
export function consulterCritique(localisation, total) {
  const cle = ALIAS_LOCALISATION[String(localisation ?? '').toLowerCase()];
  const table = cle && TABLES_CRITIQUES[cle];
  if (!table) throw new RangeError(`Localisation inconnue : ${localisation}`);
  const t = Number(total);
  if (!Number.isFinite(t)) throw new RangeError(`Total de sévérité invalide : ${total}`);
  const max = table[table.length - 1].max;
  const borne = Math.max(1, Math.min(max, Math.trunc(t)));
  return table.find(e => borne >= e.min && borne <= e.max);
}
