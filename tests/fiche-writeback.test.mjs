// Chantier H, T6 : contrat client `outil-mj` et plan de différences du lot A (compteurs, caractéristiques).
// La « fonction » est simulée ici au plus près du contrat (docs/specs/chantier-h-ecriture-fiches/plan.md §1).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ficheSnapshot, ficheFingerprint } from '../js/core/fiche-sync.js';
import { createFicheSource } from '../js/core/fiche-source.js';
import { projectV5Resources } from '../js/core/v5-resources.js';
import { sequelaTestRules } from '../js/core/v5-sequela-effects.js';
import {
  planFicheWriteback, buildFicheCommand, buildUndoCommands, applyWritebackSuccess, applyConflictChoice,
  ficheConflictOf, ficheValueForKey
} from '../js/core/fiche-writeback.js';

const clone = value => structuredClone(value);

// ---------- Fonction simulée (contrat §1) ----------
const COUNTERS = ['fortune', 'destin', 'peche', 'corruption'];
const CARACS = ['cc', 'ct', 'f', 'e', 'i', 'ag', 'dex', 'int', 'fm', 'soc'];
const KEYS = { counter: ['op', 'field', 'base', 'value', 'label'], carac: ['op', 'carac', 'base', 'value', 'label'] };
const callableError = (code, message, details) => Object.assign(new Error(message), { code: `functions/${code}`, details });
function createFakeFunction(fiches, { role = 'mj' } = {}) {
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

// ---------- Partie de test ----------
const WREN = () => ({ nom: 'Wren', race: 'Humain', destin: '3', fortune: '2', peche: '1', corruption: '0', blessuresAct: '4',
  carac: { cc: { base: 31, adv: 5 }, ct: { base: 30, adv: 0 }, f: { base: 30, adv: 0 }, e: { base: 30, adv: 0 }, i: { base: 30, adv: 0 },
    ag: { base: 32, adv: 4 }, dex: { base: 30, adv: 0 }, int: { base: 30, adv: 0 }, fm: { base: 30, adv: 0 }, soc: { base: 3, adv: 5 } },
  talentsAcq: [], equipment: [] });
const ELYSIA = () => ({ nom: 'Elysia', race: 'Humain', destin: '2', fortune: '1', corruption: '', carac: { ag: { base: 30, adv: 0 } } });

function makeState(fiches, { tool = {}, register = null } = {}) {
  const snapshots = Object.fromEntries(Object.entries(fiches).map(([charId, { revision, data }]) => [charId, ficheSnapshot(charId, data, { schemaVersion: 4, revision })]));
  const reserve = Object.entries(snapshots).map(([charId, snapshot]) => ({ id: `prof-${charId}`, name: `Nom ${charId}`, kind: 'PJ',
    caracs: { ...snapshot.caracs }, hp: 10, maxHp: 12, extensions: { ficheId: charId, v5: { fate: snapshot.durables?.fate ?? null, corruptionPoints: snapshot.durables?.corruption ?? null, divine: { sin: snapshot.durables?.sin ?? null } } },
    ficheSnapshot: clone(snapshot) }));
  const participants = reserve.map(profile => ({ ...clone(profile), id: `p-${profile.extensions.ficheId}`, profileId: profile.id, states: ['bleeding'], hp: 3,
    equipment: [{ id: 'eq1', name: 'Épée', damaged: 2 }] }));
  const state = { schemaVersion: 3, reserve, persistentCharacters: [], combat: { participants }, activeScene: null, suspendedScenes: [], log: [],
    extensions: { v5: { characterResources: Object.entries(snapshots).filter(([, s]) => s.resources).map(([charId, s]) => ({ characterId: `fiche:${charId}`, fortune: s.resources.fortune })),
      ...(register ? { aftermathRegister: register } : {}) } } };
  for (const [charId, patch] of Object.entries(tool)) {
    for (const subject of [...state.reserve, ...state.combat.participants].filter(row => row.extensions.ficheId === charId)) {
      if ('fate' in patch) subject.extensions.v5.fate = patch.fate;
      if ('sin' in patch) subject.extensions.v5.divine.sin = patch.sin;
      if ('corruption' in patch) subject.extensions.v5.corruptionPoints = patch.corruption;
    }
    if ('fortune' in patch) state.extensions.v5.characterResources.find(row => row.characterId === `fiche:${charId}`).fortune = patch.fortune;
  }
  return state;
}
const register = sequelae => ({ schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 0 }, receipts: [], incidents: [], sequelae });
const agLoss = (amount, extra = {}) => ({ id: `characteristic-loss:op-${amount}-${extra.carac || 'Ag'}`, participantId: 'p-wren', kind: 'characteristic-loss', label: 'Perte', status: 'permanent',
  carac: 'Ag', requested: amount, applied: amount, split: null, reason: 'Secret du MJ : vengeance de Morr', day: 0, history: [], ...extra });

async function sendAll(fn, state, plan, { sendId = 's1', reason = 'Fin de séance du 06/11 (outil MJ)' } = {}) {
  for (const fiche of plan.fiches) {
    const rows = fiche.rows.filter(row => !row.manual);
    if (!rows.length) continue;
    const command = buildFicheCommand(fiche.charId, rows, { sendId, revision: fiche.revision, reason });
    const response = await fn.execute(command);
    state = applyWritebackSuccess(state, fiche.charId, response, rows, { now: 1 });
  }
  return state;
}
const keys = plan => plan.fiches.flatMap(fiche => fiche.rows.map(row => `${fiche.charId}/${row.key}`)).sort();

describe('T6 · plan de différences (lot A)', () => {
  test('CA2/CA16 : compteurs modifiés en jeu → une ligne par champ, identité de fiche et provenance', () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    const state = makeState(fiches, { tool: { wren: { fate: 2, fortune: 0, sin: 3, corruption: 5 } } });
    const plan = planFicheWriteback(state);
    assert.deepEqual(keys(plan), ['wren/counter:corruption', 'wren/counter:destin', 'wren/counter:fortune', 'wren/counter:peche']);
    const fate = plan.fiches[0].rows.find(row => row.key === 'counter:destin');
    assert.deepEqual(fate.change, { op: 'counter', field: 'destin', base: '3', value: '2', label: fate.change.label });
    assert.equal(fate.ficheValue, '3'); assert.equal(fate.toolValue, '2');
    assert.ok(fate.change.label.length > 0 && fate.change.label.length <= 200);
    assert.equal(plan.fiches[0].charId, 'wren'); assert.equal(plan.fiches[0].revision, 7);
    assert.ok(!JSON.stringify(plan).includes('Nom wren'), 'jamais le nom du profil');
  });

  test('CA3 : un PJ sans différence n’apparaît pas ; aucune différence → plan vide', () => {
    const fiches = { wren: { revision: 7, data: WREN() }, elysia: { revision: 2, data: ELYSIA() } };
    const state = makeState(fiches, { tool: { wren: { fate: 2 } } });
    assert.deepEqual(plan2charIds(planFicheWriteback(state)), ['wren']);
    const quiet = planFicheWriteback(makeState(fiches));
    assert.equal(quiet.empty, true); assert.deepEqual(quiet.fiches, []);
  });

  test('CA5 : Blessures, états, matériel et données réservées n’apparaissent jamais', () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    const state = makeState(fiches, { tool: { wren: { fate: 2 } }, register: register([agLoss(2)]) });
    const plan = planFicheWriteback(state);
    for (const row of plan.fiches.flatMap(fiche => fiche.rows)) assert.ok(['counter', 'carac'].includes(row.op), row.key);
    const text = JSON.stringify(plan);
    for (const forbidden of ['blessuresAct', 'bleeding', 'damaged', 'Secret du MJ', 'Morr', 'Épée']) assert.ok(!text.includes(forbidden), forbidden);
  });

  test('collection ou champ absent ≠ vide : base null pour un compteur absent, caractéristique absente « à faire à la main »', () => {
    const data = WREN(); delete data.peche; delete data.carac.ag;
    const state = makeState({ wren: { revision: 7, data } }, { tool: { wren: { sin: 2 } }, register: register([agLoss(3)]) });
    const rows = planFicheWriteback(state).fiches[0].rows;
    assert.equal(rows.find(row => row.key === 'counter:peche').change.base, null);
    const ag = rows.find(row => row.key === 'carac:ag');
    assert.equal(ag.manual, true); assert.equal(ag.change, null); assert.equal(ag.reason, 'base-unknown');
  });

  test('copies divergentes : priorité au participant du combat, avertissement sur la ligne', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } });
    state.combat.participants[0].extensions.v5.fate = 1;
    state.reserve[0].extensions.v5.fate = 2;
    const row = planFicheWriteback(state).fiches[0].rows.find(item => item.key === 'counter:destin');
    assert.equal(row.change.value, '1');
    assert.equal(row.warning, 'copies-disagree');
  });

  test('sans base connue (fiche jamais relue depuis T6), la fiche est écartée, pas devinée', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } }, { tool: { wren: { fate: 1 } } });
    for (const subject of [...state.reserve, ...state.combat.participants]) delete subject.ficheSnapshot.writebackBase;
    const plan = planFicheWriteback(state);
    assert.deepEqual(plan.fiches, []);
    assert.deepEqual(plan.skipped, [{ charId: 'wren', reason: 'base-unknown' }]);
  });
});

const plan2charIds = plan => plan.fiches.map(fiche => fiche.charId).sort();

describe('T6 · caractéristiques (CA17, Q8, A1)', () => {
  test('perte permanente → Base seulement, total sans tenir compte de split ; Avances intactes', async () => {
    const loss = agLoss(5, { split: { appliedToBase: 3, appliedToAdvances: 2, base: 29, advances: 2 } });
    const fiches = { wren: { revision: 7, data: WREN() } };
    const state = makeState(fiches, { register: register([loss]) });
    const row = planFicheWriteback(state).fiches[0].rows.find(item => item.key === 'carac:ag');
    assert.deepEqual(row.change, { op: 'carac', carac: 'ag', base: 32, value: 27, label: row.change.label });
    assert.ok(!row.change.label.includes('Morr'), 'aucun motif MJ dans le label');
    const fn = createFakeFunction(fiches);
    await sendAll(fn, state, planFicheWriteback(state));
    assert.deepEqual(fn.store.wren.data.carac.ag, { base: 27, adv: 4 });
  });

  test('pertes permanentes déduites (dents → Soc) comptées ; perte supérieure à la Base → « à faire à la main »', () => {
    const teeth = { id: 'loss:teeth', participantId: 'p-wren', kind: 'loss', part: 'teeth', count: 8, status: 'permanent', history: [] };
    const state = makeState({ wren: { revision: 7, data: WREN() } }, { register: register([teeth]) });
    const soc = planFicheWriteback(state).fiches[0].rows.find(item => item.key === 'carac:soc');
    assert.equal(soc.manual, true); assert.equal(soc.reason, 'loss-exceeds-base'); assert.equal(soc.change, null);
    assert.equal(soc.toolValue, -1);
  });

  test('succès : « déjà reporté » = total ; double envoi ne baisse pas la Base deux fois ; CA7', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { register: register([agLoss(5)]) });
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.equal(state.extensions.v5.ficheWriteback.caracReported.wren.ag, 5);
    assert.equal(fn.store.wren.data.carac.ag.base, 27);
    assert.deepEqual(planFicheWriteback(state).fiches, [], 'plus rien à envoyer');
    // Relecture de la fiche (« Mettre à jour les PJ ») : la base lue est 27, la cible ne redescend pas.
    const reread = ficheSnapshot('wren', fn.store.wren.data, { schemaVersion: 4, revision: fn.store.wren.revision });
    for (const subject of [...state.reserve, ...state.combat.participants]) subject.ficheSnapshot = clone(reread);
    assert.deepEqual(planFicheWriteback(state).fiches, []);
    assert.equal(fn.store.wren.data.carac.ag.base, 27);
    // Le snapshot de l'outil porte les nouvelles valeurs : la synchronisation n'y voit pas un changement venu de la fiche.
    const profile = state.reserve[0];
    assert.equal(profile.ficheSnapshot.writebackBase.carac.ag.base, 27);
    assert.equal(profile.ficheSnapshot.caracs.Ag, 31);
    assert.equal(profile.caracs.Ag, 31, 'la perte est désormais portée par les caractéristiques');
  });

  test('A2 : la séquelle n’applique plus que la part non reportée (pas de double comptage)', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { register: register([agLoss(5)]) });
    const before = projectV5Resources(state, state.combat.participants)[0];
    assert.equal(sequelaTestRules({ actor: before, carac: 'Ag' }).scoreDelta, -5);
    state = await sendAll(createFakeFunction(fiches), state, planFicheWriteback(state));
    const after = projectV5Resources(state, state.combat.participants)[0];
    assert.equal(sequelaTestRules({ actor: after, carac: 'Ag' }).scoreDelta, 0);
    assert.equal(after.caracs.Ag, 31);
    const row = after.extensions.v5.sequelaEffects.rows.find(item => item.type === 'char');
    assert.match(row.label, /reportée sur la fiche/);
    assert.equal(state.extensions.v5.aftermathRegister.sequelae[0].applied, 5, 'séquelle intacte');
  });

  test('CA12 : la fiche porte déjà la valeur voulue → pas de conflit, rien d’écrit deux fois', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2 } }, register: register([agLoss(5)]) });
    const fn = createFakeFunction(fiches);
    fn.edit('wren', data => { data.carac.ag.base = 27; data.destin = '2'; });
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.deepEqual(fn.history[0].changes, {});
    assert.equal(state.extensions.v5.ficheWriteback.caracReported.wren.ag, 5);
  });
});

describe('T6 · commande, rejeu et annulation (CA6, CA15)', () => {
  test('buildFicheCommand : forme exacte du contrat, opération déterministe, lignes manuelles exclues', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } }, { tool: { wren: { fate: 2 } } });
    const rows = planFicheWriteback(state).fiches[0].rows;
    const command = buildFicheCommand('wren', rows, { sendId: 's1', revision: 7, reason: 'Fin de séance du 06/11 (outil MJ)' });
    assert.deepEqual(Object.keys(command).sort(), ['baseRevision', 'charId', 'operationId', 'payload', 'type']);
    assert.equal(command.operationId, 'outilmj-s1-wren'); assert.equal(command.type, 'outil-mj'); assert.equal(command.baseRevision, 7);
    assert.deepEqual(Object.keys(command.payload).sort(), ['changes', 'reason', 'sendId']);
    assert.throws(() => buildFicheCommand('wren', rows, { sendId: 's 1', revision: 7, reason: 'Fin de séance' }));
    assert.throws(() => buildFicheCommand('wren', rows, { sendId: 's1', revision: 7, reason: 'x' }));
    assert.throws(() => buildFicheCommand('wren', [{ ...rows[0], manual: true, change: null }], { sendId: 's1', revision: 7, reason: 'Fin de séance' }));
  });

  test('CA6 : un renvoi de la même opération est rejoué, pas réappliqué', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    const state = makeState(fiches, { tool: { wren: { fortune: 3 } } });
    const fn = createFakeFunction(fiches);
    const rows = planFicheWriteback(state).fiches[0].rows;
    const command = buildFicheCommand('wren', rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' });
    const first = await fn.execute(command);
    const again = await fn.execute(buildFicheCommand('wren', rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' }));
    assert.deepEqual(again, first); assert.equal(fn.store.wren.revision, 8); assert.equal(fn.history.length, 1);
  });

  test('annulation : seules les fiches écrites, valeurs d’avant rétablies, « déjà reporté » rétabli, pas d’annulation d’annulation', async () => {
    const fiches = { wren: { revision: 7, data: WREN() }, elysia: { revision: 2, data: ELYSIA() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2 }, elysia: { fate: 1 } }, register: register([agLoss(5)]) });
    const fn = createFakeFunction(fiches);
    fn.edit('elysia', data => { data.destin = '4'; }); // Elysia reste en conflit : pas écrite.
    const plan = planFicheWriteback(state);
    for (const fiche of plan.fiches) {
      const command = buildFicheCommand(fiche.charId, fiche.rows, { sendId: 's1', revision: fiche.revision, reason: 'Fin de séance (outil MJ)' });
      try { state = applyWritebackSuccess(state, fiche.charId, await fn.execute(command), fiche.rows, { now: 1 }); }
      catch (error) { assert.ok(ficheConflictOf(error)); }
    }
    const lastSend = state.extensions.v5.ficheWriteback.lastSend;
    assert.deepEqual(Object.keys(lastSend.fiches), ['wren']);
    const undo = buildUndoCommands(lastSend, { reason: 'Annulation du dernier envoi (outil MJ)' });
    assert.deepEqual(undo.map(item => item.charId), ['wren']);
    const [{ command, rows }] = undo;
    assert.equal(command.payload.undoOf, 'outilmj-s1-wren'); assert.equal(command.baseRevision, 8);
    assert.deepEqual(command.payload.changes.find(change => change.op === 'counter'), { op: 'counter', field: 'destin', base: '2', value: '3', label: command.payload.changes.find(change => change.op === 'counter').label });
    const fateBefore = state.combat.participants[0].extensions.v5.fate;
    state = applyWritebackSuccess(state, 'wren', await fn.execute(command), rows, { now: 2 });
    assert.equal(fn.store.wren.data.destin, '3'); assert.equal(fn.store.wren.data.carac.ag.base, 32);
    assert.equal(state.extensions.v5.ficheWriteback.caracReported.wren.ag, 0);
    assert.equal(state.combat.participants[0].extensions.v5.fate, fateBefore, 'l’annulation ne touche pas l’état de jeu de l’outil');
    assert.equal(state.extensions.v5.ficheWriteback.lastSend.sendId, 's1', 'l’annulation ne devient pas le dernier envoi');
    assert.deepEqual(buildUndoCommands(state.extensions.v5.ficheWriteback.lastSend), [], 'déjà annulé');
    assert.throws(() => buildUndoCommands({ ...lastSend, undoOf: 'x' }), /annulation/i);
    // La fonction simulée refuse aussi d'annuler une annulation.
    await assert.rejects(fn.execute(buildFicheCommand('wren', rows.map(row => ({ ...row, change: { ...row.change, base: row.change.value, value: row.change.base } })), { sendId: 'z', revision: 9, reason: 'Annuler l’annulation', undoOf: command.operationId })));
  });

  test('CA15 : un nouvel envoi remplace le dernier envoi', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2 } } });
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's1' });
    state.combat.participants[0].extensions.v5.fate = 1;
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's2' });
    assert.equal(state.extensions.v5.ficheWriteback.lastSend.sendId, 's2');
    assert.equal(buildUndoCommands(state.extensions.v5.ficheWriteback.lastSend)[0].command.payload.undoOf, 'outilmj-s2-wren');
  });
});

describe('T6 · conflits (CA10–CA11)', () => {
  test('conflit : refus en bloc, clés du contrat, puis « Garder la fiche » sur un compteur', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2, sin: 4 } } });
    const fn = createFakeFunction(fiches);
    fn.edit('wren', data => { data.destin = '5'; });
    const fiche = planFicheWriteback(state).fiches[0];
    const error = await fn.execute(buildFicheCommand('wren', fiche.rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' })).catch(e => e);
    assert.deepEqual(ficheConflictOf(error), { fields: ['counter:destin'], revision: 8 });
    assert.equal(fn.store.wren.data.peche, '1', 'rien écrit');
    const ficheValue = ficheValueForKey(fn.store.wren.data, 'counter:destin');
    assert.equal(ficheValue, '5');
    state = applyConflictChoice(state, 'wren', 'counter:destin', 'fiche', ficheValue);
    assert.ok([...state.reserve, ...state.combat.participants].every(row => row.extensions.v5.fate === 5));
    const rows = planFicheWriteback(state).fiches[0].rows;
    assert.deepEqual(rows.map(row => row.key), ['counter:peche']);
    state = await sendAll(fn, state, { fiches: [{ charId: 'wren', revision: 7, rows }] });
    assert.equal(fn.store.wren.data.peche, '4'); assert.equal(fn.store.wren.data.destin, '5');
  });

  test('« Imposer l’outil » : la base devient la valeur actuelle de la fiche, le renvoi passe', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2 } } });
    const fn = createFakeFunction(fiches);
    fn.edit('wren', data => { data.destin = '5'; });
    state = applyConflictChoice(state, 'wren', 'counter:destin', 'outil', '5');
    const fiche = planFicheWriteback(state).fiches[0];
    assert.equal(fiche.rows[0].change.base, '5');
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.equal(fn.store.wren.data.destin, '2');
    assert.equal(state.combat.participants[0].extensions.v5.fate, 2);
  });

  test('Q10 : « Garder la fiche » sur une perte ne touche pas la séquelle ; la différence ne revient plus', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { register: register([agLoss(5)]) });
    const fn = createFakeFunction(fiches);
    fn.edit('wren', data => { data.carac.ag.base = 30; }); // le joueur a corrigé autrement
    const fiche = planFicheWriteback(state).fiches[0];
    const error = await fn.execute(buildFicheCommand('wren', fiche.rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' })).catch(e => e);
    assert.deepEqual(ficheConflictOf(error).fields, ['carac:ag']);
    const registerBefore = clone(state.extensions.v5.aftermathRegister);
    state = applyConflictChoice(state, 'wren', 'carac:ag', 'fiche', ficheValueForKey(fn.store.wren.data, 'carac:ag'));
    assert.deepEqual(state.extensions.v5.aftermathRegister, registerBefore);
    assert.equal(state.extensions.v5.ficheWriteback.caracReported.wren.ag, 5);
    assert.deepEqual(planFicheWriteback(state).fiches, []);
    assert.equal(state.reserve[0].caracs.Ag, 34, 'l’outil s’aligne sur la Base de la fiche');
  });
});

describe('T6 · source réseau', () => {
  test('sendCommand : callable executeFicheCommand en europe-west1, renvoie data', async () => {
    const seen = {};
    const source = createFicheSource({
      loadSdk: async () => ({ instance: { name: 'fiches' } }),
      loadFunctions: async () => ({
        getFunctions(instance, region) { seen.instance = instance; seen.region = region; return { region }; },
        httpsCallable(functions, name) { seen.name = name; return async data => { seen.data = data; return { data: { operationId: data.operationId, charId: data.charId, revision: 8 } }; }; }
      })
    });
    const command = { charId: 'wren', operationId: 'outilmj-s1-wren', baseRevision: 7, type: 'outil-mj', payload: { reason: 'Fin', sendId: 's1', changes: [] } };
    assert.deepEqual(await source.sendCommand(command), { operationId: 'outilmj-s1-wren', charId: 'wren', revision: 8 });
    assert.deepEqual([seen.region, seen.name, seen.instance.name], ['europe-west1', 'executeFicheCommand', 'fiches']);
    assert.deepEqual(seen.data, command);
    await assert.rejects(source.sendCommand({ ...command, charId: 'inconnu' }));
  });

  test('ficheSnapshot : bloc writebackBase (valeurs brutes, révision), absent ≠ vide', () => {
    const data = WREN(); delete data.corruption; data.talentsAcq = [{ id: 't1', nom: 'Chanceux' }, { nom: 'Sans id' }];
    const snapshot = ficheSnapshot('wren', data, { schemaVersion: 4, revision: 7 });
    assert.equal(snapshot.writebackBase.revision, 7);
    assert.deepEqual(snapshot.writebackBase.fields, { destin: '3', fortune: '2', peche: '1' });
    assert.deepEqual(snapshot.writebackBase.carac.ag, { base: 32, adv: 4 });
    assert.deepEqual(Object.keys(snapshot.writebackBase.rows.talentsAcq), ['t1']);
    assert.equal(snapshot.writebackBase.unidentified.talentsAcq, 1);
    assert.ok(!Object.hasOwn(snapshot.writebackBase.rows, 'skillsAdvanced'), 'collection absente');
    assert.ok(!Object.hasOwn(snapshot.writebackBase, 'suiviMj'));
    // L'identité utile de la fiche (empreinte) ne dépend pas de ce bloc.
    const copy = clone(snapshot); delete copy.writebackBase; delete copy.source.fingerprint;
    assert.equal(ficheFingerprint(copy), snapshot.source.fingerprint);
  });
});
