import { auditHospiceReadings } from '../docs/divin/sources/L01-hospice-readings.mjs';
import { auditCalendarReadings } from '../docs/divin/sources/L06-calendar-readings.mjs';
import { auditIdentities as strictureAuditIdentities } from '../docs/divin/sources/L06-strictures.mjs';
import { cultReadings, cultIdentities } from '../docs/divin/sources/L06-cults.mjs';
import { commonReadings } from '../docs/divin/sources/L06-common-readings.mjs';
import { source as l06 } from '../docs/divin/sources/L06-prayers.mjs';
import { blankPages as blankPageSource } from '../docs/divin/sources/blank-pages.mjs';
import corpus from '../docs/divin/DIVIN_CORPUS_LIVRES.json' with { type: 'json' };

const root = 'C:/Users/arnot/.codex/visualizations/2026/10/17/01a14afb-f993-7171-b422-c21e6f8aa1e2';
const readerNote = 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md';
const principalNote = 'docs/divin/sources/DIVIN_L06_P217_229_CONTROLE_PRINCIPAL.md';
const blankReaderNote = 'docs/divin/sources/DIVIN_26_PAGES_SANS_TEXTE_LECTEUR.md';
const blankPrincipalNote = 'docs/divin/sources/DIVIN_26_PAGES_SANS_TEXTE_CONTROLE_PRINCIPAL.md';
const book = { bookId: 'L06', fileSha256: '53e84b3d484782279df8d09f67cbaeaeCA58977285cff4c9230ebac28bd2d9de' };
const pageReason = new Map([
  [217, 'Candidat religieux : fin du Chaos, prières, accès, Test, restrictions, cumul et Péchés.'],
  [218, 'Candidat religieux : déclenchement du Courroux, hausse par Péché et première partie de la table.'],
  [219, 'Candidat religieux : suite de la table du Courroux, serviteurs, pénitence et absolution.'],
  [220, 'Candidat religieux : format et extensions des prières, abus, manifestations et tableau des cultes.'],
  [221, 'Candidat religieux : dix-neuf bénédictions génériques et noms propres aux cultes.'],
  [222, 'Candidat religieux : extensions des miracles, contact non consenti et miracles de Manann.'],
  [223, 'Candidat religieux : miracles de Manann et de Morr.'],
  [224, 'Candidat religieux : miracles de Myrmidia et de Ranald.'],
  [225, 'Candidat religieux : miracles de Ranald et de Rhya.'],
  [226, 'Candidat religieux : miracles de Rhya, Shallya et Sigmar.'],
  [227, 'Candidat religieux : miracles de Sigmar et de Taal.'],
  [228, 'Candidat religieux : miracles de Taal et d’Ulric.'],
  [229, 'Candidat religieux : miracles de Verena.'],
]);

const readings = [];
for (const [physicalPage, reason] of pageReason) {
  const image = `page-${physicalPage}.png`;
  const principalImage = `v5-${physicalPage}.png`;
  const sourceVisual = `${root}/e1-pdf/${image}`;
  const independentVisual = [218, 219, 220, 221].includes(physicalPage)
    ? `${root}/principal-pdf/${principalImage}`
    : sourceVisual;
  readings.push({
    id: `L06-p${physicalPage}-first`, bookId: book.bookId, fileSha256: book.fileSha256,
    physicalPage, printedPage: physicalPage, reader: '/root/e1_sources', role: 'first',
    classification: 'religious-candidate', reason,
    evidencePath: readerNote, visualEvidencePath: sourceVisual,
  });
  readings.push({
    id: `L06-p${physicalPage}-independent`, bookId: book.bookId, fileSha256: book.fileSha256,
    physicalPage, printedPage: physicalPage, reader: '/root', role: 'independent',
    classification: 'religious-candidate', reason,
    evidencePath: principalNote, visualEvidencePath: independentVisual,
  });
}

const corpusBooks = new Map(corpus.books.map(row => [row.id, row]));
const principalPages = new Map([
  ...['L01:93', 'L01:94', 'L03:43', 'L05:2', 'L06:8', 'L07:6', 'L11:8', 'L11:96', 'L12:7'].map(key => [key, 'dependency']),
  ...['L06:9', 'L06:12', 'L06:13', 'L07:106', 'L07:116', 'L14:22'].map(key => [key, 'religious-candidate']),
  ...['L05:3', 'L06:16', 'L06:18', 'L06:379', 'L07:5', 'L07:164', 'L07:224', 'L11:55', 'L11:71', 'L13:4', 'L17:4'].map(key => [key, 'out-of-scope']),
]);
const principalPrintedPages = new Map([['L07:106', 106], ['L11:55', 55], ['L11:71', 71]]);
for (const page of blankPageSource) {
  const key = `${page.bookId}:${page.physicalPage}`;
  const bookMeta = corpusBooks.get(page.bookId);
  if (!bookMeta) throw new Error(`Blank-page source references unknown book ${page.bookId}`);
  const principalClassification = principalPages.get(key);
  if (!principalClassification) throw new Error(`Missing principal disposition for no-text page ${key}`);
  if (!['religious-candidate', 'dependency', 'out-of-scope'].includes(page.auditClassification)) throw new Error(`Missing explicit first-reader auditClassification for ${key}`);
  if (page.printedPage === null && !page.printedPageReason) throw new Error(`Missing first-reader printedPageReason for ${key}`);
  const principalPrintedPage = principalPrintedPages.get(key) ?? null;
  const visualEvidencePath = `${root}/e1-blank-pages/${page.visualEvidence}`;
  const roleReasons = {
    dependency: 'Repère de lieu ou de contexte à relier aux sources connexes; aucune mécanique déduite de la seule illustration.',
    'religious-candidate': 'Contenu religieux ou cultuel visible à confronter au chapitre; aucune mécanique déduite de la seule page.',
    'out-of-scope': 'Illustration, page blanche ou paratexte sans règle divine identifiable sur cette page.',
  };
  const reason = `${page.visible} ${page.uncertainty}`;
  readings.push({
    id: `${page.bookId}-p${page.physicalPage}-first-visual`, bookId: page.bookId, fileSha256: bookMeta.sha256,
    physicalPage: page.physicalPage, printedPage: page.printedPage, printedPageReason: page.printedPageReason,
    reader: '/root/e1_sources', role: 'first', classification: page.auditClassification,
    reason, evidencePath: blankReaderNote, visualEvidencePath,
  });
  readings.push({
    id: `${page.bookId}-p${page.physicalPage}-independent-visual`, bookId: page.bookId, fileSha256: bookMeta.sha256,
    physicalPage: page.physicalPage, printedPage: principalPrintedPage,
    printedPageReason: principalPrintedPage === null ? 'Numéro imprimé non confirmé comme visible lors de la lecture indépendante.' : null,
    reader: '/root', role: 'independent',
    classification: principalClassification, reason: roleReasons[principalClassification],
    evidencePath: blankPrincipalNote, visualEvidencePath,
  });
}

readings.push(...commonReadings, ...cultReadings, ...auditCalendarReadings, ...auditHospiceReadings);

const unresolved = reason => ({ status: 'unresolved', reason });
const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sourceRef = (printedPage, section) => ({ ...book, physicalPage: printedPage, printedPage, section });
const identities = [
  ...strictureAuditIdentities,
  ...cultIdentities,
  ...l06.blessings.map(row => ({
    id: `L06:blessing:${slug(row.name)}`, bookId: book.bookId, canonicalName: row.name,
    frenchName: unresolved('Alias français à relier à une source et une décision de catalogue.'),
    aliases: unresolved('L’index d’alias n’a pas encore été établi.'),
    tradition: unresolved('La bénédiction générique est associée à plusieurs cultes.'),
    actorKinds: unresolved('Les restrictions d’accès PJ, PNJ et créatures restent à établir.'),
    category: 'blessing', sourceRefs: [sourceRef(221, `Blessing ${row.name}`)],
    status: 'source-read', recordCompleteness: 'partial-e1',
    unresolvedFields: ['frenchName', 'aliases', 'tradition', 'actorKinds', 'clause-decomposition', 'development', 'execution'],
  })),
  ...l06.miracles.map(row => ({
    id: `L06:miracle:${slug(row.cult)}:${slug(row.name)}`, bookId: book.bookId, canonicalName: row.name,
    frenchName: unresolved('Alias français à relier à une source et une décision de catalogue.'),
    aliases: unresolved('L’index d’alias n’a pas encore été établi.'),
    tradition: row.cult,
    actorKinds: unresolved('Les restrictions d’accès PJ, PNJ et créatures restent à établir.'),
    category: 'miracle', sourceRefs: [sourceRef(row.sourcePage, `Miracle ${row.name}`)],
    status: 'source-read', recordCompleteness: 'partial-e1',
    unresolvedFields: ['frenchName', 'aliases', 'actorKinds', 'clause-decomposition', 'development', 'execution'],
  })),
];

const associations = Object.entries(l06.blessingsByCult).flatMap(([cult, names]) => names.map(name => ({
  id: `L06:association:${slug(cult)}:${slug(name)}`,
  cult,
  identityId: `L06:blessing:${slug(name)}`,
  sourceRef: sourceRef(220, `Blessings of ${cult}`),
})));

// E1 source summaries are leads for later clause decomposition, not complete or independently checked clauses.
const clauses = [];
const anomalies = [
  ['tenacity-duration-note', 'Le résumé global du relevé de prières omettait Ténacité parmi les trois prières Instant; le relevé auteur corrigé nomme Soin, Récupération et Ténacité.', 221, 'resolved', 'docs/divin/sources/DIVIN_L06_P217_229_LECTEUR.md'],
  ['fury-frenzy-trait', 'Frénésie de l’Appel à la Fureur renvoie au Trait de Créature; le lien avec la psychologie de PJ reste à contrôler.', 224],
  ['eagles-eye-profile', 'Le résumé runtime reprend maintenant le profil et l’usage sensoriel de l’Aigle vérifiés; E7/E8 et le raccordement mécanique restent à faire.', 224, 'resolved', 'docs/divin/DIVIN_OEIL_AIGLE_CONTROLE_INDEPENDANT.md'],
  ['destroy-undead-range-typo', 'La portée imprimée de Destroy Undead porte « Yo »; le corps décrit une zone autour du prêtre.', 223],
  ['comet-invalid-creatures', 'La catégorie « invalid creatures » de Twin-tailed Comet n’est pas définie dans la page relue.', 227],
  ['manann-miles-units', 'Les portées de Manann en miles demandent une décision distincte de la conversion yards vers mètres.', 222],
  ['recuperation-attempt-identity', 'Récupération limite l’usage à une tentative par maladie et personne; l’identité durable de l’instance reste à concevoir.', 221],
  ['touch-and-tenacity', 'Séparer les prières Touch/Instant Soin et Récupération de Ténacité, qui n’exige pas de contact.', 221],
  ['wrath-table-extended-ranges', 'Les plages du Courroux au-delà de 100 sont imprimées; les conséquences et Tests secondaires restent à décomposer.', 219],
  ['delayed-miracle-consequences', 'Plusieurs miracles dépendent d’événements ultérieurs, d’une interruption ou d’une échéance réelle.', 222],
].map(([id, summaryFr, printedPage, status = 'open', evidencePath = principalNote]) => ({
  id, status, summaryFr, sourceRefs: [sourceRef(printedPage, 'L06 p.217-229 principal control notes')],
  evidencePath,
}));

export const auditEvidence = Object.freeze({
  schemaVersion: 1,
  readings: Object.freeze(readings.map(row => Object.freeze(row))),
  identities: Object.freeze(identities.map(row => Object.freeze(row))),
  associations: Object.freeze(associations.map(row => Object.freeze(row))),
  clauses: Object.freeze(clauses),
  decisions: Object.freeze([]),
  anomalies: Object.freeze(anomalies.map(row => Object.freeze(row))),
});
