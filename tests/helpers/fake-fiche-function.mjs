// Fonction `executeFicheCommand` simulée au plus près du contrat `outil-mj` (docs/specs/chantier-h-ecriture-fiches/plan.md §1).
// Partagée par tests/fiche-writeback.test.mjs (Node) et tests/fiche-writeback-browser.mjs (servie au navigateur) : aucune dépendance.
const clone = value => structuredClone(value);
const COUNTERS = ['fortune', 'destin', 'peche', 'corruption'];
const CARACS = ['cc', 'ct', 'f', 'e', 'i', 'ag', 'dex', 'int', 'fm', 'soc'];
const KEYS = { counter: ['op', 'field', 'base', 'value', 'label'], carac: ['op', 'carac', 'base', 'value', 'label'] };
const callableError = (code, message, details) => Object.assign(new Error(message), { code: `functions/${code}`, details });
export function createFakeFunction(fiches, { role = 'mj' } = {}) {
  const store = clone(fiches); // { charId: { revision, data } }
  const receipts = new Map(); // operationId → { hash, response, payload }
  const history = [];
  const calls = [];
  const fail = (message, code = 'invalid-argument', details) => { throw callableError(code, message, details); };
  async function execute(command) {
    calls.push(clone(command));
    if (role !== 'mj') fail('réservé au MJ', 'permission-denied');
    if (Object.keys(command).sort().join() !== 'baseRevision,charId,operationId,payload,type') fail('forme de commande');
    const { charId, operationId, baseRevision, type, payload } = command;
    if (type !== 'outil-mj' || !/^[A-Za-z0-9_-]{1,128}$/.test(operationId) || !Number.isSafeInteger(baseRevision)) fail('commande invalide');
    const allowed = ['reason', 'sendId', 'undoOf', 'changes'];
    if (Object.keys(payload).some(key => !allowed.includes(key))) fail('clé de payload refusée');
    if (typeof payload.reason !== 'string' || payload.reason.trim().length < 3 || payload.reason.length > 1000) fail('motif');
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(payload.sendId) || operationId !== `outilmj-${payload.sendId}-${charId}`) fail('sendId');
    if (!Array.isArray(payload.changes) || payload.changes.length < 1 || payload.changes.length > 40) fail('changes');
    for (const change of payload.changes) {
      const keys = KEYS[change?.op];
      if (!keys || Object.keys(change).some(key => !keys.includes(key))) fail('clé de change refusée');
      if (typeof change.label !== 'string' || !change.label || change.label.length > 200) fail('label');
      if (change.op === 'counter' && (!COUNTERS.includes(change.field) || !(change.base === null || typeof change.base === 'string') || typeof change.value !== 'string')) fail('counter');
      if (change.op === 'carac' && (!CARACS.includes(change.carac) || !Number.isSafeInteger(change.base) || !Number.isSafeInteger(change.value))) fail('carac');
    }
    const hash = JSON.stringify(command);
    if (receipts.has(operationId)) {
      if (receipts.get(operationId).hash !== hash) fail('identifiant déjà utilisé', 'already-exists');
      return clone(receipts.get(operationId).response);
    }
    const fiche = store[charId];
    if (!fiche) fail('fiche absente', 'not-found');
    if (baseRevision > fiche.revision) fail('révision inconnue', 'aborted', { kind: 'conflict', revision: fiche.revision });
    if (payload.undoOf !== undefined) {
      const target = receipts.get(payload.undoOf);
      if (!target || target.charId !== charId) fail('annulation inconnue', 'failed-precondition');
      if (target.payload.undoOf !== undefined) fail('une annulation ne s’annule pas', 'failed-precondition');
    }
    const data = clone(fiche.data);
    const conflicts = [];
    const changes = {};
    for (const change of payload.changes) {
      const key = change.op === 'counter' ? `counter:${change.field}` : `carac:${change.carac}`;
      const current = change.op === 'counter' ? (Object.hasOwn(data, change.field) ? data[change.field] : null) : (data.carac?.[change.carac]?.base ?? null);
      if (current === change.value) continue; // CA12
      if (current !== change.base) { conflicts.push(key); continue; }
      if (change.op === 'counter') data[change.field] = change.value;
      else data.carac[change.carac] = { ...data.carac[change.carac], base: change.value };
      changes[key] = { before: current, after: change.value };
    }
    if (conflicts.length) fail('modifications concurrentes sur le même champ', 'aborted', { kind: 'conflict', fields: conflicts, revision: fiche.revision });
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

