import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const categories = ['blessing', 'miracle', 'talent', 'rite', 'ritual', 'rune', 'artifact', 'gift', 'pact', 'innate-power', 'common-rule', 'stricture'];
const classifications = ['religious-candidate', 'dependency', 'out-of-scope', 'visual-pending'];
const sourceStatuses = ['to-explore', 'read', 'independently-checked', 'v5-explicit', 'v4-adaptation-required', 'adaptation-decided', 'open-contradiction'];
const developmentStatuses = ['not-started', 'developed', 'wired', 'correcting', 'integrated'];
const verificationStatuses = ['not-run', 'runtime-exercised', 'developer-tested', 'independently-tested', 'principal-validated'];
const executionModes = ['automatic', 'mj-fact-then-executed', 'narrative-reminder', 'material-confirmation', 'blocked'];
const record = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
};
const string = (value, label) => {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
};
const keys = (value, allowed, required, label) => {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${label} has unsupported field: ${key}`);
  for (const key of required) if (!(key in value)) throw new Error(`${label} is missing field: ${key}`);
};
const unresolved = (value, label) => {
  record(value, label);
  keys(value, ['status', 'reason'], ['status', 'reason'], label);
  if (value.status !== 'unresolved') throw new Error(`${label}.status must be unresolved`);
  string(value.reason, `${label}.reason`);
};
const listOfStrings = (value, label, { nonEmpty = false } = {}) => {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) throw new Error(`${label} must be ${nonEmpty ? 'a non-empty' : 'an'} array`);
  value.forEach((item, index) => string(item, `${label}[${index}]`));
};
const sha256 = (value, label) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${label} must be a 64-character SHA-256`);
};
const resolveEvidenceFile = (path, root, label) => {
  string(path, label);
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path);
  let bytes;
  try { bytes = readFileSync(absolute); }
  catch { throw new Error(`${label} must reference a readable file: ${path}`); }
  if (bytes.length === 0) throw new Error(`${label} must reference a non-empty file: ${path}`);
  return { absolute, bytes };
};
const validateTextEvidence = (path, root, label) => {
  const { bytes } = resolveEvidenceFile(path, root, label);
  const text = bytes.toString('utf8');
  if (text.trim().length === 0 || text.includes('\uFFFD')) throw new Error(`${label} must contain readable UTF-8 notes`);
};
const validateImageEvidence = (path, root, label) => {
  const { bytes } = resolveEvidenceFile(path, root, label);
  const extension = path.toLowerCase().split(/[?#]/, 1)[0];
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!((extension.endsWith('.png') && png) || ((extension.endsWith('.jpg') || extension.endsWith('.jpeg')) && jpeg))) {
    throw new Error(`${label} must reference a readable PNG or JPEG image with a matching file signature`);
  }
};
const refKey = ref => `${ref.bookId}:${ref.physicalPage}`;

function validateManifest(corpus) {
  record(corpus, 'corpus');
  if (corpus.schemaVersion !== 1) throw new Error('Unsupported corpus schemaVersion');
  if (!Number.isInteger(corpus.count) || corpus.count <= 0) throw new Error('Corpus count must be a positive integer');
  if (!Array.isArray(corpus.books) || corpus.books.length !== corpus.count) throw new Error('Corpus book count does not match its manifest');
  const books = new Map();
  let pages = 0;
  for (const [index, raw] of corpus.books.entries()) {
    const book = record(raw, `corpus.books[${index}]`);
    string(book.id, `corpus.books[${index}].id`);
    string(book.file, `corpus.books[${index}].file`);
    sha256(book.sha256, `corpus.books[${index}].sha256`);
    if (!Number.isInteger(book.physicalPages) || book.physicalPages <= 0) throw new Error(`Invalid physical page count for ${book.id}`);
    if (books.has(book.id)) throw new Error(`Duplicate corpus book id: ${book.id}`);
    if (!Array.isArray(book.pagesWithoutExtractedText)) throw new Error(`Missing pagesWithoutExtractedText for ${book.id}`);
    const noText = new Set();
    for (const page of book.pagesWithoutExtractedText) {
      if (!Number.isInteger(page) || page < 1 || page > book.physicalPages || noText.has(page)) throw new Error(`Invalid non-text page list for ${book.id}`);
      noText.add(page);
    }
    pages += book.physicalPages;
    books.set(book.id, { ...book, noText });
  }
  if (pages !== corpus.physicalPages) throw new Error(`Corpus physicalPages total does not match manifest: ${pages} !== ${corpus.physicalPages}`);
  const noTextTotal = [...books.values()].reduce((sum, book) => sum + book.noText.size, 0);
  if (!Number.isInteger(corpus.pagesWithoutExtractedText) || corpus.pagesWithoutExtractedText !== noTextTotal) throw new Error(`Corpus pagesWithoutExtractedText total does not match manifest: ${noTextTotal} !== ${corpus.pagesWithoutExtractedText}`);
  return { books, totalPages: pages };
}

function validateSourceRef(raw, books, readingsByPage, label) {
  const ref = record(raw, label);
  keys(ref, ['bookId', 'fileSha256', 'physicalPage', 'printedPage', 'section'], ['bookId', 'fileSha256', 'physicalPage', 'printedPage', 'section'], label);
  const book = books.get(string(ref.bookId, `${label}.bookId`));
  if (!book) throw new Error(`${label} references unknown book ${ref.bookId}`);
  if (String(ref.fileSha256).toLowerCase() !== book.sha256.toLowerCase()) throw new Error(`${label} hash differs from the corpus manifest`);
  if (!Number.isInteger(ref.physicalPage) || ref.physicalPage < 1 || ref.physicalPage > book.physicalPages) throw new Error(`${label}.physicalPage is outside the book`);
  if (ref.printedPage !== null && !Number.isInteger(ref.printedPage)) throw new Error(`${label}.printedPage must be an integer or null`);
  string(ref.section, `${label}.section`);
  const pageReadings = readingsByPage.get(`${book.id}:${ref.physicalPage}`);
  if (!pageReadings || !Object.values(pageReadings).some(reading => reading.classification !== 'visual-pending')) throw new Error(`${label} points to a page without an effective reading`);
  const statedPages = Object.values(pageReadings).filter(reading => reading.classification !== 'visual-pending' && reading.printedPage !== null).map(reading => reading.printedPage);
  if (ref.printedPage !== null && statedPages.some(page => page !== ref.printedPage)) throw new Error(`${label}.printedPage contradicts the page reading`);
  return ref;
}

function validateReading(raw, books, root) {
  const row = record(raw, 'reading');
  keys(row, ['id', 'bookId', 'fileSha256', 'physicalPage', 'printedPage', 'printedPageReason', 'reader', 'role', 'classification', 'reason', 'evidencePath', 'visualEvidencePath'], ['id', 'bookId', 'fileSha256', 'physicalPage', 'printedPage', 'reader', 'role', 'classification', 'reason', 'evidencePath', 'visualEvidencePath'], 'reading');
  string(row.id, 'reading.id');
  const book = books.get(string(row.bookId, 'reading.bookId'));
  if (!book) throw new Error(`Reading ${row.id} references unknown book ${row.bookId}`);
  if (String(row.fileSha256).toLowerCase() !== book.sha256.toLowerCase()) throw new Error(`Reading ${row.id} hash differs from corpus manifest`);
  if (!Number.isInteger(row.physicalPage) || row.physicalPage < 1 || row.physicalPage > book.physicalPages) throw new Error(`Reading ${row.id} page is outside ${book.id}`);
  if (row.printedPage !== null && !Number.isInteger(row.printedPage)) throw new Error(`Reading ${row.id} printedPage must be integer or null`);
  if (row.printedPageReason !== undefined && row.printedPageReason !== null) string(row.printedPageReason, `Reading ${row.id} printedPageReason`);
  string(row.reader, `Reading ${row.id} reader`);
  if (!['first', 'independent'].includes(row.role)) throw new Error(`Reading ${row.id} has invalid role`);
  if (!classifications.includes(row.classification)) throw new Error(`Reading ${row.id} has invalid classification`);
  string(row.reason, `Reading ${row.id} reason`);
  validateTextEvidence(row.evidencePath, root, `Reading ${row.id} evidencePath`);
  const requiresVisual = book.noText.has(row.physicalPage) && row.classification !== 'visual-pending';
  if (requiresVisual && !row.visualEvidencePath) throw new Error(`Reading ${row.id} requires visual evidence for a page without extracted text`);
  if (row.visualEvidencePath !== null) validateImageEvidence(row.visualEvidencePath, root, `Reading ${row.id} visualEvidencePath`);
  return row;
}

function validateIdentity(raw, books, readingsByPage) {
  const identity = record(raw, 'identity');
  const allowed = ['id', 'bookId', 'canonicalName', 'frenchName', 'aliases', 'tradition', 'actorKinds', 'category', 'sourceRefs', 'status', 'recordCompleteness', 'unresolvedFields'];
  keys(identity, allowed, ['id', 'bookId', 'canonicalName', 'frenchName', 'aliases', 'tradition', 'actorKinds', 'category', 'sourceRefs', 'status', 'recordCompleteness', 'unresolvedFields'], 'identity');
  string(identity.id, 'identity.id');
  if (!books.has(string(identity.bookId, `identity ${identity.id} bookId`))) throw new Error(`Identity ${identity.id} references unknown book`);
  string(identity.canonicalName, `identity ${identity.id} canonicalName`);
  for (const field of ['frenchName', 'aliases', 'tradition', 'actorKinds']) {
    if (identity[field] && typeof identity[field] === 'object' && !Array.isArray(identity[field])) unresolved(identity[field], `identity ${identity.id} ${field}`);
    else if (field === 'aliases') listOfStrings(identity[field], `identity ${identity.id} aliases`);
    else if (field === 'actorKinds') listOfStrings(identity[field], `identity ${identity.id} actorKinds`, { nonEmpty: true });
    else string(identity[field], `identity ${identity.id} ${field}`);
  }
  if (!categories.includes(identity.category)) throw new Error(`Identity ${identity.id} has invalid category`);
  if (!Array.isArray(identity.sourceRefs) || identity.sourceRefs.length === 0) throw new Error(`Identity ${identity.id} needs at least one sourceRef`);
  identity.sourceRefs.forEach((ref, index) => validateSourceRef(ref, books, readingsByPage, `identity ${identity.id} sourceRefs[${index}]`));
  if (identity.status !== 'source-read') throw new Error(`Identity ${identity.id} has invalid status for partial-e1 E1 record; expected source-read`);
  if (identity.recordCompleteness !== 'partial-e1') throw new Error(`Identity ${identity.id} must be explicitly marked partial-e1 in this tranche`);
  listOfStrings(identity.unresolvedFields, `identity ${identity.id} unresolvedFields`, { nonEmpty: true });
  return identity;
}

function validateAssociation(raw, books, identities, readingsByPage) {
  const association = record(raw, 'association');
  keys(association, ['id', 'cult', 'identityId', 'sourceRef'], ['id', 'cult', 'identityId', 'sourceRef'], 'association');
  string(association.id, 'association.id');
  string(association.cult, `association ${association.id} cult`);
  const identityId = string(association.identityId, `association ${association.id} identityId`);
  if (!identities.has(identityId)) throw new Error(`Association ${association.id} references unknown identity`);
  if (identities.get(identityId).category !== 'blessing') throw new Error(`Association ${association.id} must reference a blessing identity`);
  validateSourceRef(association.sourceRef, books, readingsByPage, `association ${association.id} sourceRef`);
  return association;
}

function validateClause(raw, books, identities, readingsByPage, root) {
  const clause = record(raw, 'clause');
  const allFields = ['id', 'identityId', 'kind', 'summaryFr', 'sourceRefs', 'sourceStatus', 'developmentStatus', 'verificationStatus', 'executionMode', 'trigger', 'acquisition', 'costs', 'usage', 'test', 'targets', 'facts', 'opposition', 'outcome', 'duration', 'stacking', 'recovery', 'failure', 'adaptation', 'contractId', 'integrationPoints', 'proofs', 'readers', 'developer', 'verifier', 'principalVerdict', 'mechanical', 'recordCompleteness', 'unresolvedFields'];
  keys(clause, allFields, ['id', 'identityId', 'kind', 'summaryFr', 'sourceRefs', 'sourceStatus', 'developmentStatus', 'verificationStatus', 'executionMode'], 'clause');
  string(clause.id, 'clause.id');
  if (!identities.has(string(clause.identityId, `clause ${clause.id} identityId`))) throw new Error(`Clause ${clause.id} references unknown identity`);
  if (!['mechanical', 'narrative'].includes(clause.kind)) throw new Error(`Clause ${clause.id} has invalid kind; expected mechanical or narrative`);
  if (clause.kind === 'mechanical' && clause.executionMode === 'narrative-reminder') throw new Error(`Mechanical clause ${clause.id} cannot use narrative-reminder`);
  if (clause.mechanical !== undefined && (typeof clause.mechanical !== 'boolean' || clause.mechanical !== (clause.kind === 'mechanical'))) throw new Error(`Clause ${clause.id} mechanical flag must match its kind`);
  if (typeof clause.summaryFr === 'string') string(clause.summaryFr, `clause ${clause.id} summaryFr`);
  else unresolved(clause.summaryFr, `clause ${clause.id} summaryFr`);
  if (!Array.isArray(clause.sourceRefs) || clause.sourceRefs.length === 0) throw new Error(`Clause ${clause.id} needs sourceRefs`);
  clause.sourceRefs.forEach((ref, index) => validateSourceRef(ref, books, readingsByPage, `clause ${clause.id} sourceRefs[${index}]`));
  if (!sourceStatuses.includes(clause.sourceStatus)) throw new Error(`Clause ${clause.id} has invalid sourceStatus`);
  if (!developmentStatuses.includes(clause.developmentStatus)) throw new Error(`Clause ${clause.id} has invalid developmentStatus`);
  if (!verificationStatuses.includes(clause.verificationStatus)) throw new Error(`Clause ${clause.id} has invalid verificationStatus`);
  if (!executionModes.includes(clause.executionMode)) throw new Error(`Clause ${clause.id} has invalid executionMode`);
  if (clause.mechanical && clause.executionMode === 'narrative-reminder') throw new Error(`Mechanical clause ${clause.id} cannot use narrative-reminder`);
  if (clause.verificationStatus === 'independently-tested') {
    string(clause.developer, `clause ${clause.id} developer`);
    string(clause.verifier, `clause ${clause.id} verifier`);
    if (clause.developer === clause.verifier) throw new Error(`Clause ${clause.id} author cannot independently verify their own work`);
  }
  if (clause.verificationStatus === 'principal-validated') {
    const verdict = record(clause.principalVerdict, `clause ${clause.id} principalVerdict`);
    keys(verdict, ['reviewer', 'evidencePath', 'reason'], ['reviewer', 'evidencePath', 'reason'], `clause ${clause.id} principalVerdict`);
    string(verdict.reviewer, `clause ${clause.id} principal reviewer`);
    string(clause.developer, `clause ${clause.id} developer`);
    if (verdict.reviewer === clause.developer) throw new Error(`Clause ${clause.id} author cannot issue the principal verdict`);
    string(verdict.reason, `clause ${clause.id} verdict reason`);
    validateTextEvidence(verdict.evidencePath, root, `clause ${clause.id} principal evidencePath`);
  } else if (clause.principalVerdict !== undefined) throw new Error(`Clause ${clause.id} cannot carry a principal verdict without principal-validated status`);
  if (clause.developmentStatus === 'integrated') {
    string(clause.contractId, `clause ${clause.id} contractId`);
    listOfStrings(clause.integrationPoints, `clause ${clause.id} integrationPoints`, { nonEmpty: true });
    listOfStrings(clause.proofs, `clause ${clause.id} proofs`, { nonEmpty: true });
    string(clause.developer, `clause ${clause.id} developer`);
    string(clause.verifier, `clause ${clause.id} verifier`);
    if (clause.developer === clause.verifier) throw new Error(`Integrated clause ${clause.id} needs a distinct verifier`);
  }
  if (clause.developmentStatus === 'integrated') throw new Error(`Clause ${clause.id} partial-e1 record cannot claim integrated development`);
  if (clause.developmentStatus !== 'not-started') throw new Error(`Clause ${clause.id} partial-e1 record cannot claim E2 development`);
  if (clause.verificationStatus !== 'not-run') throw new Error(`Clause ${clause.id} partial-e1 record cannot claim E2 verification`);
  for (const field of ['contractId', 'integrationPoints', 'proofs', 'readers', 'developer', 'verifier', 'principalVerdict']) {
    if (clause[field] !== undefined) throw new Error(`Clause ${clause.id} cannot claim ${field} in the E1 tranche`);
  }
  if (clause.recordCompleteness !== 'partial-e1') throw new Error(`Clause ${clause.id} must be explicitly marked partial-e1 in this tranche`);
  listOfStrings(clause.unresolvedFields, `clause ${clause.id} unresolvedFields`, { nonEmpty: true });
  return clause;
}

function validateAnomaly(raw, books, readingsByPage, root) {
  const anomaly = record(raw, 'anomaly');
  keys(anomaly, ['id', 'status', 'summaryFr', 'sourceRefs', 'evidencePath'], ['id', 'status', 'summaryFr', 'sourceRefs', 'evidencePath'], 'anomaly');
  string(anomaly.id, 'anomaly.id');
  if (!['open', 'resolved'].includes(anomaly.status)) throw new Error(`Anomaly ${anomaly.id} has invalid status`);
  string(anomaly.summaryFr, `anomaly ${anomaly.id} summaryFr`);
  if (!Array.isArray(anomaly.sourceRefs) || anomaly.sourceRefs.length === 0) throw new Error(`Anomaly ${anomaly.id} needs sourceRefs`);
  anomaly.sourceRefs.forEach((ref, index) => validateSourceRef(ref, books, readingsByPage, `anomaly ${anomaly.id} sourceRefs[${index}]`));
  validateTextEvidence(anomaly.evidencePath, root, `anomaly ${anomaly.id} evidencePath`);
  return anomaly;
}

function validateDecision(raw, books, readingsByPage, root) {
  const decision = record(raw, 'decision');
  keys(decision, ['id', 'status', 'question', 'options', 'selected', 'reason', 'sourceRefs', 'evidencePath'], ['id', 'status', 'question', 'sourceRefs'], 'decision');
  string(decision.id, 'decision.id');
  if (!['open', 'resolved'].includes(decision.status)) throw new Error(`Decision ${decision.id} has invalid status`);
  string(decision.question, `decision ${decision.id} question`);
  if (decision.options !== undefined) listOfStrings(decision.options, `decision ${decision.id} options`, { nonEmpty: true });
  if (decision.status === 'resolved') {
    string(decision.selected, `decision ${decision.id} selected`);
    string(decision.reason, `decision ${decision.id} reason`);
    validateTextEvidence(decision.evidencePath, root, `decision ${decision.id} evidencePath`);
  }
  if (!Array.isArray(decision.sourceRefs) || decision.sourceRefs.length === 0) throw new Error(`Decision ${decision.id} needs sourceRefs`);
  decision.sourceRefs.forEach((ref, index) => validateSourceRef(ref, books, readingsByPage, `decision ${decision.id} sourceRefs[${index}]`));
  return decision;
}

export function buildDivineAudit(corpus, evidence, { root } = {}) {
  if (typeof root !== 'string' || root.trim().length === 0) throw new Error('root must be an absolute checkout path');
  if (!isAbsolute(root)) throw new Error('root must be an absolute checkout path');
  const checkoutRoot = resolve(root);
  const { books, totalPages } = validateManifest(corpus);
  record(evidence, 'auditEvidence');
  keys(evidence, ['schemaVersion', 'readings', 'identities', 'associations', 'clauses', 'decisions', 'anomalies'], ['schemaVersion', 'readings', 'identities', 'associations', 'clauses', 'decisions', 'anomalies'], 'auditEvidence');
  if (evidence.schemaVersion !== 1) throw new Error('Unsupported auditEvidence schemaVersion');
  for (const field of ['readings', 'identities', 'associations', 'clauses', 'decisions', 'anomalies']) if (!Array.isArray(evidence[field])) throw new Error(`auditEvidence.${field} must be an array`);

  const readings = evidence.readings.map(row => validateReading(row, books, checkoutRoot));
  const readingIds = new Set();
  const readingsByPage = new Map();
  for (const reading of readings) {
    if (readingIds.has(reading.id)) throw new Error(`Duplicate reading id: ${reading.id}`);
    readingIds.add(reading.id);
    const key = refKey(reading);
    const pageReadings = readingsByPage.get(key) ?? {};
    if (pageReadings[reading.role]) throw new Error(`Duplicate reading for ${key} role ${reading.role}`);
    pageReadings[reading.role] = reading;
    readingsByPage.set(key, pageReadings);
  }
  for (const [key, pageReadings] of readingsByPage) {
    const first = pageReadings.first;
    const independent = pageReadings.independent;
    if (first && independent && first.reader === independent.reader) throw new Error(`First and independent readers must differ for ${key}`);
  }

  const pages = [];
  for (const book of [...books.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    for (let physicalPage = 1; physicalPage <= book.physicalPages; physicalPage++) {
      const row = readingsByPage.get(`${book.id}:${physicalPage}`) ?? {};
      const firstReading = row.first ?? { status: 'not-explored' };
      const independentReading = row.independent ?? { status: 'not-explored' };
      const firstEffective = firstReading.id && firstReading.classification !== 'visual-pending';
      const independentEffective = independentReading.id && independentReading.classification !== 'visual-pending';
      const classificationAgreed = Boolean(firstEffective && independentEffective && firstReading.classification === independentReading.classification);
      const printedPageAgreed = Boolean(firstEffective && independentEffective && firstReading.printedPage === independentReading.printedPage);
      const disagreement = Boolean(firstEffective && independentEffective && (!classificationAgreed || !printedPageAgreed));
      let status = 'not-explored';
      if (disagreement) status = 'disagreement';
      else if ((firstReading.classification === 'visual-pending') || (independentReading.classification === 'visual-pending')) status = 'visual-pending';
      else if (classificationAgreed) status = 'double-classified';
      else if (firstEffective) status = 'first-only';
      else if (independentEffective) status = 'independent-only';
      const printedPage = firstEffective ? firstReading.printedPage : independentEffective ? independentReading.printedPage : null;
      const printedPageReason = firstEffective
        ? firstReading.printedPageReason ?? (firstReading.printedPage === null ? 'Folio non confirmé par cette lecture.' : null)
        : independentEffective ? independentReading.printedPageReason ?? (independentReading.printedPage === null ? 'Folio non confirmé par cette lecture.' : null) : 'Aucun folio confirmé.';
      pages.push({
        bookId: book.id, file: book.file, fileSha256: book.sha256, physicalPage,
        textExtracted: !book.noText.has(physicalPage), printedPage, printedPageReason,
        firstReading, independentReading, status, classificationAgreed, printedPageAgreed,
        verified: status === 'double-classified' && classificationAgreed && printedPageAgreed,
      });
    }
  }

  const identityIds = new Set();
  const identities = evidence.identities.map(raw => {
    const identity = validateIdentity(raw, books, readingsByPage);
    if (identityIds.has(identity.id)) throw new Error(`Duplicate identity id: ${identity.id}`);
    identityIds.add(identity.id);
    return identity;
  });
  const identitiesById = new Map(identities.map(identity => [identity.id, identity]));
  const associationIds = new Set();
  const associationPairs = new Set();
  const associations = evidence.associations.map(raw => {
    const association = validateAssociation(raw, books, identitiesById, readingsByPage);
    if (associationIds.has(association.id)) throw new Error(`Duplicate association id: ${association.id}`);
    associationIds.add(association.id);
    const pair = `${association.cult}\u0000${association.identityId}`;
    if (associationPairs.has(pair)) throw new Error(`Duplicate cult/identity association: ${association.cult}/${association.identityId}`);
    associationPairs.add(pair);
    return association;
  });
  const clauseIds = new Set();
  const clauses = evidence.clauses.map(raw => {
    const clause = validateClause(raw, books, identityIds, readingsByPage, checkoutRoot);
    if (clauseIds.has(clause.id)) throw new Error(`Duplicate clause id: ${clause.id}`);
    clauseIds.add(clause.id);
    return clause;
  });
  const anomalies = evidence.anomalies.map(row => validateAnomaly(row, books, readingsByPage, checkoutRoot));
  const anomalyIds = new Set();
  for (const anomaly of anomalies) {
    if (anomalyIds.has(anomaly.id)) throw new Error(`Duplicate anomaly id: ${anomaly.id}`);
    anomalyIds.add(anomaly.id);
  }
  const decisions = evidence.decisions.map(row => validateDecision(row, books, readingsByPage, checkoutRoot));
  const decisionIds = new Set();
  for (const decision of decisions) {
    if (decisionIds.has(decision.id)) throw new Error(`Duplicate decision id: ${decision.id}`);
    decisionIds.add(decision.id);
  }

  const identitiesByCategory = Object.fromEntries(categories.map(category => [category, 0]));
  for (const identity of identities) identitiesByCategory[identity.category]++;
  const count = predicate => pages.filter(predicate).length;
  const booksFullyDoubleClassified = [...books.values()].filter(book => {
    const bookPages = pages.filter(page => page.bookId === book.id);
    return bookPages.length === book.physicalPages && bookPages.every(page => page.verified);
  }).length;
  const booksClosed = [...books.values()].filter(book => {
    const bookPages = pages.filter(page => page.bookId === book.id);
    const unresolvedAnomaly = anomalies.some(anomaly => anomaly.status === 'open' && anomaly.sourceRefs.some(ref => ref.bookId === book.id));
    const unresolvedContradiction = clauses.some(clause => clause.sourceStatus === 'open-contradiction' && clause.sourceRefs.some(ref => ref.bookId === book.id));
    const hasPartialIdentity = identities.some(identity => identity.bookId === book.id && identity.recordCompleteness === 'partial-e1');
    const hasPartialClause = clauses.some(clause => clause.recordCompleteness === 'partial-e1' && clause.sourceRefs.some(ref => ref.bookId === book.id));
    const inventoryDecomposed = clauses.length > 0 && clauses.every(clause => clause.recordCompleteness !== 'partial-e1') && !hasPartialIdentity;
    return bookPages.length === book.physicalPages && bookPages.every(page => page.verified) && !unresolvedAnomaly && !unresolvedContradiction && !hasPartialIdentity && !hasPartialClause && inventoryDecomposed;
  }).length;
  const summary = {
    schemaVersion: 1, corpusBooks: books.size, totalPhysicalPages: totalPages,
    pagesNotExplored: count(page => page.firstReading.status === 'not-explored' && page.independentReading.status === 'not-explored'),
    pagesFirstRead: count(page => page.firstReading.id && page.firstReading.classification !== 'visual-pending'),
    pagesIndependentlyRead: count(page => page.independentReading.id && page.independentReading.classification !== 'visual-pending'),
    pagesDoubleClassified: count(page => page.firstReading.id && page.independentReading.id && page.firstReading.classification !== 'visual-pending' && page.independentReading.classification !== 'visual-pending'),
    pagesDoubleClassifiedSameClassification: count(page => page.firstReading.id && page.independentReading.id && page.firstReading.classification !== 'visual-pending' && page.independentReading.classification !== 'visual-pending' && page.classificationAgreed),
    pagesDoubleClassifiedSamePrintedPage: count(page => page.firstReading.id && page.independentReading.id && page.firstReading.classification !== 'visual-pending' && page.independentReading.classification !== 'visual-pending' && page.printedPageAgreed),
    pagesWithClassificationDisagreement: count(page => page.firstReading.id && page.independentReading.id && page.firstReading.classification !== 'visual-pending' && page.independentReading.classification !== 'visual-pending' && !page.classificationAgreed),
    pagesWithPrintedPageDisagreement: count(page => page.firstReading.id && page.independentReading.id && page.firstReading.classification !== 'visual-pending' && page.independentReading.classification !== 'visual-pending' && !page.printedPageAgreed),
    pagesVisualPending: count(page => page.status === 'visual-pending'),
    pagesWithoutExtractedText: [...books.values()].reduce((sum, book) => sum + book.noText.size, 0),
    pagesWithoutExtractedTextVisuallyReadByFirst: count(page => !page.textExtracted && page.firstReading.id && page.firstReading.classification !== 'visual-pending' && page.firstReading.visualEvidencePath),
    pagesWithoutExtractedTextVisuallyReadByIndependent: count(page => !page.textExtracted && page.independentReading.id && page.independentReading.classification !== 'visual-pending' && page.independentReading.visualEvidencePath),
    pagesWithoutExtractedTextVisuallyReadByBoth: count(page => !page.textExtracted && page.firstReading.id && page.firstReading.classification !== 'visual-pending' && page.firstReading.visualEvidencePath && page.independentReading.id && page.independentReading.classification !== 'visual-pending' && page.independentReading.visualEvidencePath),
    pagesWithoutExtractedTextVisuallyCovered: count(page => !page.textExtracted && page.verified && page.firstReading.visualEvidencePath && page.independentReading.visualEvidencePath),
    booksFullyDoubleClassified,
    booksClosed,
    identities: identities.length, identitiesByCategory,
    identitiesPartialE1: identities.filter(identity => identity.recordCompleteness === 'partial-e1').length,
    associations: associations.length,
    clauses: clauses.length,
    clauseInventoryCompleteness: clauses.length === 0 ? 'not-yet-decomposed' : 'partial-e1',
    clausesBySourceStatus: Object.fromEntries(sourceStatuses.map(status => [status, clauses.filter(clause => clause.sourceStatus === status).length])),
    clausesByDevelopmentStatus: Object.fromEntries(developmentStatuses.map(status => [status, clauses.filter(clause => clause.developmentStatus === status).length])),
    clausesByVerificationStatus: Object.fromEntries(verificationStatuses.map(status => [status, clauses.filter(clause => clause.verificationStatus === status).length])),
    mechanicallyIntegratedClauses: clauses.filter(clause => clause.developmentStatus === 'integrated' && clause.contractId && Array.isArray(clause.integrationPoints) && clause.integrationPoints.length > 0 && Array.isArray(clause.proofs) && clause.proofs.length > 0 && ['independently-tested', 'principal-validated'].includes(clause.verificationStatus)).length,
    anomaliesOpen: anomalies.filter(anomaly => anomaly.status === 'open').length,
    decisions: decisions.length,
  };
  return { pages, clauses, identities, associations, decisions, anomalies, summary, summaryMarkdown: renderSummary(summary) };
}

function renderSummary(summary) {
  const counts = Object.entries(summary.identitiesByCategory).filter(([, count]) => count > 0).map(([category, count]) => `- ${category}: ${count}`).join('\n') || '- Aucune identité recensée';
  return `# Synthèse de l’audit divin\n\n` +
    `Le manifeste contient ${summary.corpusBooks} livres et ${summary.totalPhysicalPages} pages physiques. La disposition de lecture couvre exactement ce manifeste; une ligne créée ne vaut pas lecture.\n\n` +
    `## Pages\n\n- Non explorées par les deux rôles: ${summary.pagesNotExplored}\n- Première lecture effective: ${summary.pagesFirstRead}\n- Lecture indépendante effective: ${summary.pagesIndependentlyRead}\n- Doublement classifiées: ${summary.pagesDoubleClassified}\n- Doublement classifiées avec même classement: ${summary.pagesDoubleClassifiedSameClassification}\n- Doublement classifiées avec même folio imprimé: ${summary.pagesDoubleClassifiedSamePrintedPage}\n- Désaccords de classement ouverts: ${summary.pagesWithClassificationDisagreement}\n- Désaccords de folio imprimé ouverts: ${summary.pagesWithPrintedPageDisagreement}\n- En attente de vérification visuelle: ${summary.pagesVisualPending}\n- Sans texte extrait: ${summary.pagesWithoutExtractedText}\n- Pages sans texte vues visuellement par le premier lecteur: ${summary.pagesWithoutExtractedTextVisuallyReadByFirst}\n- Pages sans texte vues visuellement par le second lecteur: ${summary.pagesWithoutExtractedTextVisuallyReadByIndependent}\n- Pages sans texte vues par les deux lecteurs: ${summary.pagesWithoutExtractedTextVisuallyReadByBoth}\n- Parmi elles, pages dont classement et folio concordent: ${summary.pagesWithoutExtractedTextVisuallyCovered}\n- Livres entièrement doublement classifiés: ${summary.booksFullyDoubleClassified}\n- Livres fermés (pages, inventaire et clauses complets): ${summary.booksClosed}\n\n` +
    `## Identités et clauses\n\n${counts}\n\n- Identités explicitement partielles E1: ${summary.identitiesPartialE1}\n- Associations culte/bénédiction: ${summary.associations}\n- Clauses détaillées: ${summary.clauses}\n- État de décomposition des clauses: ${summary.clauseInventoryCompleteness}\n- Clauses prouvées mécaniquement intégrées: ${summary.mechanicallyIntegratedClauses}\n- Anomalies ouvertes: ${summary.anomaliesOpen}\n- Décisions consignées: ${summary.decisions}\n\n` +
    `Les synthèses E1 et les identités partielles ne certifient pas une décomposition complète en clauses ni un contrat exécutable. Aucune clôture globale n’est inférée de ces comptes.\n`;
}

function sameDirectory(left, right) {
  return process.platform === 'win32' ? left.toLocaleLowerCase() === right.toLocaleLowerCase() : left === right;
}

async function runCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const root = resolve(dirname(scriptPath), '..');
  const workingDirectory = resolve(process.cwd());
  if (!sameDirectory(root, workingDirectory)) throw new Error(`Refusing to read or write outside the audit checkout. Run from project root: ${root} (cwd: ${workingDirectory})`);
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.filter(arg => arg === '--check').length > 1) throw new Error('Usage: node tools/build-divine-audit.mjs [--check]');
  const [corpusModule, evidenceModule] = await Promise.all([
    import('../docs/divin/DIVIN_CORPUS_LIVRES.json', { with: { type: 'json' } }),
    import('./divine-audit-data.mjs'),
  ]);
  const result = buildDivineAudit(corpusModule.default, evidenceModule.auditEvidence, { root });
  const expected = [
    ['docs/divin/DIVIN_AUDIT_PAGES.json', JSON.stringify({ schemaVersion: 1, pages: result.pages }, null, 2) + '\n'],
    ['docs/divin/DIVIN_AUDIT_CLAUSES.json', JSON.stringify({ schemaVersion: 1, identities: result.identities, associations: result.associations, clauses: result.clauses, decisions: result.decisions, anomalies: result.anomalies }, null, 2) + '\n'],
    ['docs/divin/DIVIN_AUDIT_SYNTHESE.md', result.summaryMarkdown],
  ];
  if (args.includes('--check')) {
    for (const [relativePath, text] of expected) {
      let actual;
      try { actual = readFileSync(resolve(root, relativePath), 'utf8'); }
      catch { throw new Error(`Generated audit output is missing or unreadable: ${relativePath}`); }
      if (actual !== text) throw new Error(`Generated audit output is stale: ${relativePath}`);
    }
    console.log('Divine audit pages, clauses and summary are current.');
    return;
  }
  for (const [relativePath, text] of expected) writeFileSync(resolve(root, relativePath), text);
  console.log(JSON.stringify(result.summary));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runCli();
