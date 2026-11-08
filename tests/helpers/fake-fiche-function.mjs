// Fonction `executeFicheCommand` simulée au plus près du contrat `outil-mj` (docs/specs/chantier-h-ecriture-fiches/plan.md §1),
// précisé par le serveur T1/T2 (dépôt des fiches, js/fiche/outil-mj.js, branche claude/h-t1-outil-mj-7aa9fa).
// Partagée par tests/unit/stockage/fiche-writeback.test.mjs (Node) et tests/fiche-writeback-browser.mjs (servie au navigateur) : aucune dépendance.
// Écart assumé : l'objet d'équipement est validé en forme seulement (pas contre le référentiel publié).
const clone = value => structuredClone(value);
const COUNTERS = ['fortune', 'destin', 'peche', 'corruption'];
const CARACS = ['cc', 'ct', 'f', 'e', 'i', 'ag', 'dex', 'int', 'fm', 'soc'];
const SUIVI_CATEGORIES = ['penitence', 'sequelle', 'cicatrice', 'maladie', 'mutation'];
const KEYS = {
  counter: ['op', 'field', 'base', 'value', 'label'],
  carac: ['op', 'carac', 'base', 'value', 'label'],
  'skill-adv': ['op', 'id', 'base', 'value', 'label'],
  suivi: ['op', 'id', 'base', 'value', 'label'],
  row: ['op', 'collection', 'id', 'base', 'value', 'label']
};
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]`
  : isRecord(value) ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  : JSON.stringify(value === undefined ? null : value);
const same = (left, right) => stable(left) === stable(right);
const text = (value, max, min = 0) => typeof value === 'string' && value.length >= min && value.length <= max;
const rowId = value => text(value, 200, 1) && value.trim() === value && !/[\u0000-\u001f]/u.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const counterOk = value => typeof value === 'string' && /^\d{0,4}$/.test(value);
const suiviError = entry => {
  if (!isRecord(entry) || Object.keys(entry).some(key => !['id', 'categorie', 'libelle', 'detail', 'depuis'].includes(key))) return 'entrée de suivi invalide';
  if (!rowId(entry.id) || !SUIVI_CATEGORIES.includes(entry.categorie) || !text(entry.libelle, 200, 1) || !text(entry.detail, 1000)) return 'entrée de suivi invalide';
  if (Object.hasOwn(entry, 'depuis') && !text(entry.depuis, 40)) return 'date de suivi invalide';
  return null;
};
const talentError = row => {
  if (!isRecord(row) || Object.keys(row).length > 20 || !text(row.nom, 200, 1) || !row.nom.trim()) return 'ligne de talent invalide';
  return Object.values(row).every(value => ['string', 'number', 'boolean'].includes(typeof value)) ? null : 'ligne de talent invalide';
};
const keyOf = change => change.op === 'counter' ? `counter:${change.field}` : change.op === 'carac' ? `carac:${change.carac}`
  : change.op === 'row' ? `row:${change.collection}:${change.id}` : `${change.op}:${change.id}`;
const rowsOf = (data, change) => {
  const name = change.op === 'skill-adv' ? 'skillsAdvanced' : change.op === 'row' ? change.collection : 'suiviMj';
  return Array.isArray(data[name]) ? data[name] : [];
};
const matching = (data, change) => ['counter', 'carac'].includes(change.op) ? [] : rowsOf(data, change).filter(row => row?.id === change.id);
function currentValue(data, change) {
  if (change.op === 'counter') return Object.hasOwn(data, change.field) ? data[change.field] : null;
  if (change.op === 'carac') return isRecord(data.carac?.[change.carac]) && Object.hasOwn(data.carac[change.carac], 'base') ? data.carac[change.carac].base : null;
  const rows = matching(data, change);
  if (rows.length !== 1) return null;
  return change.op === 'skill-adv' ? (Object.hasOwn(rows[0], 'adv') ? rows[0].adv : null) : rows[0];
}
const upsert = (rows, id, value) => value === null ? rows.filter(row => row?.id !== id)
  : rows.some(row => row?.id === id) ? rows.map(row => row?.id === id ? value : row) : [...rows, value];
function applyChange(data, change) {
  if (change.op === 'counter') data[change.field] = change.value;
  else if (change.op === 'carac') data.carac = { ...data.carac, [change.carac]: { ...data.carac[change.carac], base: change.value } };
  else if (change.op === 'skill-adv') data.skillsAdvanced = data.skillsAdvanced.map(row => row?.id === change.id ? { ...row, adv: change.value } : row);
  else if (change.op === 'row') data[change.collection] = upsert(rowsOf(data, change), change.id, change.value);
  else data.suiviMj = upsert(rowsOf(data, change), change.id, change.value);
}
// Forme minimale d'un objet d'équipement (validateEquipmentItem côté fiches fait davantage).
const equipmentError = row => isRecord(row) && rowId(row.id) && typeof row.kind === 'string' && row.kind && text(row.name, 200, 1) ? null : 'objet d’équipement invalide';
// Comme assertSafeTree : JSON pur, profondeur bornée ; et la taille conservatrice de la fiche (900 KiB).
function safeTreeError(value, depth = 0) {
  if (depth > 32) return 'arbre trop profond';
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? null : 'nombre invalide';
  if (Array.isArray(value)) { for (const item of value) { const error = safeTreeError(item, depth + 1); if (error) return error; } return null; }
  if (isRecord(value)) { for (const [key, item] of Object.entries(value)) { if (key === '__proto__') return 'clé interdite'; const error = safeTreeError(item, depth + 1); if (error) return error; } return null; }
  return 'valeur non sérialisable';
}
const MAX_FICHE_BYTES = 900 * 1024;
// migrerFicheV5 (dépôt des fiches, js/fiche/v5.js) : `fortune` reprend `chance` s'il manque, avant toute comparaison.
const migrerFicheV5 = data => !isRecord(data) || Object.hasOwn(data, 'fortune') || !Object.hasOwn(data, 'chance') ? data : { ...data, fortune: data.chance };
const callableError = (code, message, details) => Object.assign(new Error(message), { code: `functions/${code}`, details });

export function createFakeFunction(fiches, { role = 'mj' } = {}) {
  const store = clone(fiches); // { charId: { revision, data } }
  const receipts = new Map(); // operationId → { hash, response, payload }
  const history = [];
  const calls = [];
  const fail = (message, code = 'invalid-argument', details) => { throw callableError(code, message, details); };
  function validate(change) {
    const keys = KEYS[change?.op];
    if (!keys || Object.keys(change).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(change, key))) fail('clé de change refusée', 'invalid-argument', { kind: 'field-forbidden' });
    if (!text(change.label, 200, 1)) fail('label');
    if (change.op === 'counter' && (!COUNTERS.includes(change.field) || !counterOk(change.value) || (change.base !== null && !counterOk(change.base)))) fail('counter');
    if (change.op === 'carac' && (!CARACS.includes(change.carac) || !count(change.base) || !count(change.value) || change.value > 999)) fail('carac');
    if (change.op === 'skill-adv' && (!rowId(change.id) || !count(change.base) || !count(change.value) || change.value > 999)) fail('skill-adv');
    if (change.op === 'row') {
      if (!['talentsAcq', 'equipment'].includes(change.collection) || !rowId(change.id) || (change.base === null && change.value === null)) fail('row');
      for (const entry of [change.base, change.value]) {
        if (entry === null) continue;
        if (!isRecord(entry) || entry.id !== change.id) fail('identifiant de ligne incohérent');
        if (change.collection === 'talentsAcq' && talentError(entry)) fail(talentError(entry));
        if (change.collection === 'equipment' && equipmentError(entry)) fail(equipmentError(entry));
      }
    }
    if (change.op === 'suivi') {
      if (!rowId(change.id) || (change.base === null && change.value === null)) fail('suivi');
      for (const entry of [change.base, change.value]) {
        if (entry === null) continue;
        if (suiviError(entry)) fail(suiviError(entry));
        if (entry.id !== change.id) fail('identifiant de suivi incohérent');
      }
    }
  }
  async function execute(command) {
    calls.push(clone(command));
    if (role !== 'mj') fail('réservé au MJ', 'permission-denied');
    if (Object.keys(command).sort().join() !== 'baseRevision,charId,operationId,payload,type') fail('forme de commande');
    const { charId, operationId, baseRevision, type, payload } = command;
    if (type !== 'outil-mj' || !/^[A-Za-z0-9_-]{1,128}$/.test(operationId) || !Number.isSafeInteger(baseRevision)) fail('commande invalide');
    const allowed = ['reason', 'sendId', 'undoOf', 'changes'];
    if (!isRecord(payload) || Object.keys(payload).some(key => !allowed.includes(key))) fail('clé de payload refusée');
    if (typeof payload.reason !== 'string' || payload.reason.trim().length < 3 || payload.reason.length > 1000) fail('motif');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(payload.sendId) || operationId !== `outilmj-${payload.sendId}-${charId}`) fail('sendId');
    if (payload.undoOf !== undefined && (typeof payload.undoOf !== 'string' || payload.undoOf === operationId)) fail('undoOf');
    if (!Array.isArray(payload.changes) || payload.changes.length < 1 || payload.changes.length > 40) fail('changes');
    const keys = new Set();
    for (const change of payload.changes) {
      validate(change);
      if (keys.has(keyOf(change))) fail('change en double');
      keys.add(keyOf(change));
    }
    const hash = stable(command);
    if (receipts.has(operationId)) {
      if (receipts.get(operationId).hash !== hash) fail('identifiant déjà utilisé', 'already-exists');
      return clone(receipts.get(operationId).response);
    }
    const fiche = store[charId];
    if (!fiche || !isRecord(fiche.data)) fail('migration de fiche requise', 'failed-precondition', { kind: 'migration-needed' });
    if (baseRevision > fiche.revision) fail('révision inconnue', 'aborted', { kind: 'conflict', revision: fiche.revision });
    if (payload.undoOf !== undefined) {
      const target = receipts.get(payload.undoOf);
      if (!target || target.charId !== charId) fail('annulation inconnue', 'failed-precondition');
      if (target.payload.undoOf !== undefined) fail('une annulation ne s’annule pas', 'failed-precondition');
    }
    const source = migrerFicheV5(fiche.data);
    const conflicts = [];
    const toApply = [];
    for (const change of payload.changes) {
      if (matching(source, change).length > 1) { conflicts.push(keyOf(change)); continue; } // id en double
      const current = currentValue(source, change);
      if (same(current, change.value)) continue; // CA12 (et ligne déjà absente pour un retrait)
      if (same(current, change.base)) toApply.push(change);
      else conflicts.push(keyOf(change));
    }
    if (conflicts.length) fail('la fiche a changé depuis la dernière lecture de l’outil', 'aborted', { kind: 'conflict', fields: conflicts, revision: fiche.revision });
    const data = clone(source);
    const changes = {};
    for (const change of toApply) {
      const before = currentValue(data, change);
      applyChange(data, change);
      changes[keyOf(change)] = { before, after: currentValue(data, change), label: change.label };
    }
    if (safeTreeError(data)) fail(safeTreeError(data));
    if (new TextEncoder().encode(stable(data)).length > MAX_FICHE_BYTES) fail('la fiche dépasse la taille maximale conservatrice', 'resource-exhausted', { kind: 'fiche-too-large' });
    fiche.data = data;
    fiche.revision += 1;
    const response = { operationId, charId, revision: fiche.revision };
    receipts.set(operationId, { hash, response, payload: clone(payload), charId });
    history.push({ operationId, type: 'outil-mj', reason: payload.reason, summary: { kind: 'outil-mj', ...(payload.undoOf ? { undoOf: payload.undoOf } : {}) }, changes });
    return clone(response);
  }
  return { execute, store, history, calls,
    edit(charId, mutate) { mutate(store[charId].data); store[charId].revision += 1; } };
}
