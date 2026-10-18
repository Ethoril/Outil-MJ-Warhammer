const fileSha256 = '925cf38a31ffa3561c63df3a9a1c2e2c18034ff0ed1e1d90571965a068434c5e';
const visualRoot = 'C:/Users/arnot/.codex/visualizations/2026/10/18/01a14da8-877d-7ea0-a2d5-38e6a9590721';
const firstEvidencePath = 'docs/divin/sources/DIVIN_L01_GRAND_HOSPICE_68_81_LECTURE.md';
const independentEvidencePath = 'docs/divin/sources/DIVIN_L01_GRAND_HOSPICE_CONTROLE_PRINCIPAL.md';

// Paraphrases et classements des deux lectures conservés séparément.
const pages = [
  [68, 'The Great Hospice — ouverture', 'religious-candidate', 'religious-candidate',
    'Ordre guérisseur des Sœurs de Shallya, rôle hospitalier et site de Frederheim; aucune nouvelle prière.',
    'Présentation de l’ordre de Shallya et du Grand Hospice, sans effet mécanique propre au lieu.'],
  [69, 'The Great Hospice — histoire et visiteurs', 'religious-candidate', 'religious-candidate',
    'Fondation liée au postulant de Shallya Eberhardt; conduite des visiteurs et sanctions possibles avec renvoi au Courroux.',
    'Histoire shallyane et règles locales : armes consignées, violence interdite, respect du personnel; graves violations susceptibles de Péchés/Courroux selon le MJ, sans tarif universel.'],
  [70, 'A Sanctum of Shallyan Sanity at Frederheim', 'religious-candidate', 'dependency',
    'Carte nommée du sanctuaire de Shallya et du Grand Hospice; candidat topographique, aucun pouvoir.',
    'Accueil, jardins et bâtiments; plan nommé du sanctuaire de Shallya nécessaire au contexte, sans règle divine nouvelle.'],
  [71, 'The Hospice Buildings — pièces et accès', 'dependency', 'dependency',
    'Serrures, accès et distribution des pièces, sans nouvelle règle divine ni talent spécifique.',
    'Serrures, salle, accueil, trésorerie et biens des patients; aucun effet divin nouveau défini.'],
  [72, 'The Hospice Buildings — réfectoire et bibliothèque', 'dependency', 'religious-candidate',
    'Lecture des écritures de Shallya au réfectoire : contexte communautaire sans procédure chiffrée.',
    'Lecture des écritures de Shallya aux repas, bibliothèque théologique et chambres de la grande prêtresse; pratique religieuse candidate.'],
  [73, 'The Hospice Buildings — chapelle et plans', 'religious-candidate', 'religious-candidate',
    'Chapelle de Shallya, rites d’adoration à l’aube et au crépuscule; plan détaillé des bâtiments.',
    'Chapelle Q, rites à l’aube/crépuscule, carte détaillée annotée et infirmerie; aucun bonus chiffré aux rites.'],
  [74, 'Margaret von Aschendorf', 'religious-candidate', 'religious-candidate',
    'Abbesse de Shallya; profil avec Invoke (Shallya) et Holy Visions, valeurs V4 non adaptées.',
    'Margaret possède Invocation de Shallya et Visions sacrées; aucune liste de miracles acquis ni Béni dans ce bloc.'],
  [75, 'Clementine, Marie et Anna-Lise', 'religious-candidate', 'religious-candidate',
    'Clementine possède Bless et Invoke de Shallya; Marie possède Invoke; les talents d’Anna-Lise ne comprennent pas Invoke.',
    'Acquisitions individuelles : Clementine a Béni et Invocation, Marie Invocation, Anna-Lise ni Béni ni Invocation dans les listes imprimées. Aucun accès universel déduit de la profession.'],
  [76, 'Typical Sister et personnels laïcs', 'dependency', 'religious-candidate',
    'Profil générique, Pray, Etiquette (Shallyans), Stone Soup et auxiliaires non ordonnés; dévotion distincte de l’accès.',
    'Religieuse type sans Béni/Invocation listés, talents et dépendances; personnels laïcs non ordonnés. La fonction ne confère pas automatiquement l’accès divin.'],
  [77, 'Patients — Erzbet et Rainer', 'dependency', 'religious-candidate',
    'Patients et pistes d’aventure; hypothèse de fantôme et aide par soin/magie sans règle divine nommée.',
    'Fantôme d’Erzbet hypothétique avec chronologie conditionnelle; immunité psychologique, talents de rétablissement et recherche aux frontières du Chaos à inventorier.'],
  [78, 'Admiral Heller', 'out-of-scope', 'out-of-scope',
    'Personnage et intrigue de l’amiral sans culte, pouvoir, rite, relique ni prérequis divin explicite.',
    'Amiral, rivalité, drogues et pénalités de mémoire; aucune mécanique divine ou pouvoir religieux établi ici.'],
  [79, 'Isabella, Seer Princess', 'religious-candidate', 'religious-candidate',
    'Holy Visions et talents de prophétie/seconde vue; aucun patron divin ou culte établi.',
    'Visions sacrées, autres talents sensoriels et prophéties incertaines; quatre traits réservés à l’état enragé. Affiliation divine non prouvée.'],
  [80, 'Richter Kless et Liber Chaotica', 'religious-candidate', 'religious-candidate',
    'Théologien, visions alléguées des dieux et commande du Liber Chaotica par le culte de Sigmar; aucune capacité divine décrite.',
    'Liber Chaotica commandité par Sigmar, corruption mentale et cauchemars de Kless; préserver la difficulté imprimée Hard (-30) sans conversion silencieuse en V5.'],
  [81, 'The Liber Chaotica — étude et accès de Kless', 'religious-candidate', 'religious-candidate',
    'Annotations d’un prêtre de Sigmar, répurgateurs et cultistes; recherche et corruption, sans miracle ajouté.',
    'Étude du Liber Chaotica et écoutes de Kless : Tests, corruption, avances gratuites et fréquence. Mécaniques V4 à adapter, pas d’effet divin exécuté par ce relevé.'],
];

export const hospiceReadings = pages.flatMap(([physicalPage, section, firstClass, independentClass, firstReason, independentReason]) =>
  [['first', '/root/e1_strictures_dev', firstClass, firstReason, firstEvidencePath],
    ['independent', '/root', independentClass, independentReason, independentEvidencePath]]
    .map(([role, reader, classification, reason, evidencePath]) => ({
      id: `L01-p${physicalPage}-${role}-hospice`, bookId: 'L01', fileSha256,
      physicalPage, printedPage: [68, 70].includes(physicalPage) ? null : physicalPage,
      ...([68, 70].includes(physicalPage) ? { printedPageReason: 'Aucun folio imprimé visible sur le rendu complet; numéro imprimé non établi.' } : {}),
      section, reader, role, classification, reason, evidencePath,
      visualEvidencePath: `${visualRoot}/L01-great-hospice-${physicalPage}.png`,
    })),
);

const auditReadingFields = [
  'id', 'bookId', 'fileSha256', 'physicalPage', 'printedPage', 'printedPageReason',
  'reader', 'role', 'classification', 'reason', 'evidencePath', 'visualEvidencePath',
];
export const auditHospiceReadings = hospiceReadings.map(reading =>
  Object.fromEntries(auditReadingFields.map(field => [field, reading[field]])),
);

// Contrôle éditorial ciblé, distinct d’une lecture E1 de la page entière.
export const editionEvidence = {
  bookId: 'L01', fileSha256, edition: 'V4', physicalPage: 3, printedPage: 3,
  kind: 'targeted-editorial-metadata', evidencePath: firstEvidencePath,
  visualEvidencePath: `${visualRoot}/L01-editorial-credits-03.png`,
};
export const mapAttribution = {
  maps: [{ physicalPage: 93, correspondingPhysicalPage: 70 }, { physicalPage: 94, correspondingPhysicalPage: 73 }],
  status: 'direct-visual-correspondence', classificationResolution: 'not-resolved',
};
