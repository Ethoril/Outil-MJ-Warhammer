// Chantier H, T6 : contrat client `outil-mj` et plan de différences du lot A (compteurs, caractéristiques).
// La « fonction » est simulée ici au plus près du contrat (docs/specs/chantier-h-ecriture-fiches/plan.md §1).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ficheSnapshot, ficheFingerprint } from '../../../js/core/fiche-sync.js';
import { createFicheSource } from '../../../js/core/fiche-source.js';
import { projectV5Resources } from '../../../js/core/v5-resources.js';
import { sequelaTestRules } from '../../../js/core/v5-sequela-effects.js';
import {
  planFicheWriteback, buildFicheCommand, buildUndoCommands, applyWritebackSuccess, applyConflictChoice,
  ficheConflictOf, ficheValueForKey, writebackErrorMessage
} from '../../../js/core/fiche-writeback.js';

const clone = value => structuredClone(value);
import { createFakeFunction } from '../../helpers/fake-fiche-function.mjs';

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

// ---------- T8 : lots B (Prière, talents, équipement) et C (suivi du MJ) ----------
const RELIC = { id: 'eq-relic', baseId: 'relic', kind: 'trapping', name: 'Relique de Sigmar', notes: 'bénie' };
const FICHE_B = () => ({ ...WREN(),
  skillsAdvanced: [{ id: 'sa-priere', nom: 'Prière', carac: 'soc', adv: 10 }],
  talentsAcq: [{ id: 't-beni', nom: 'Béni (Sigmar)' }, { id: 't-inv', nom: 'Invocation (Sigmar)' }, { id: 't-autre', nom: 'Chanceux' }],
  equipment: [clone(RELIC)],
  suiviMj: [{ id: 'manuel-1', categorie: 'maladie', libelle: 'Saisie à la main sur la fiche', detail: '' }] });
const copiesOf = (state, charId = 'wren') => [...state.reserve, ...state.combat.participants].filter(row => row.extensions.ficheId === charId);
function rejectWren(state, { kind = 'permanent', acquisitions } = {}) {
  for (const subject of copiesOf(state)) {
    subject.skills = [{ id: 'skill-priere', storageKey: 'sa-priere', name: 'Prière', advances: 0, total: 3 }];
    subject.extensions.v5.divineRejections = [{ id: 'wrath-rejection:x1', kind, cult: 'Sigmar', stage: 0, lossConfirmedBy: 'MJ',
      wrathProof: { roll: 147, sinAtTest: 9 },
      ...(kind === 'permanent' ? { prayLoss: { skillId: 'skill-priere', advances: 10, scoreBefore: 13, scoreAfter: 3 },
        removedTalents: [{ id: 'talent-beni', name: 'Béni', specialty: 'Sigmar', acquisitions: acquisitions || [{ id: 't-beni', nom: 'Béni (Sigmar)' }] },
          { id: 'talent-invocation', name: 'Invocation', specialty: 'Sigmar', acquisitions: [{ id: 't-inv', nom: 'Invocation (Sigmar)' }] }] } : {}) }];
  }
  return state;
}
function confiscate(state, status = 'held') {
  for (const subject of copiesOf(state)) subject.extensions.v5.divineConfiscations = [{ id: 'wrath-confiscation:x2', type: 'wrath-confiscation', cult: 'Sigmar',
    items: [{ itemId: 'eq-relic', label: 'Relique', magical: true, status, equipment: clone(RELIC), actions: [] }], retainedArmor: {}, wrathProof: { roll: 112 } }];
  return state;
}
const rowsOfPlan = (plan, charId = 'wren') => plan.fiches.find(fiche => fiche.charId === charId)?.rows || [];

describe('T8 · Prière et talents (CA18)', () => {
  test('rejet définitif : Avances de Prière à zéro, talents Béni/Invocation retirés, autres talents intacts', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = rejectWren(makeState(fiches));
    const rows = rowsOfPlan(planFicheWriteback(state));
    const prayer = rows.find(row => row.key === 'skill-adv:sa-priere');
    assert.deepEqual(prayer.change, { op: 'skill-adv', id: 'sa-priere', base: 10, value: 0, label: prayer.change.label });
    const beni = rows.find(row => row.key === 'row:talentsAcq:t-beni');
    assert.deepEqual(beni.change, { op: 'row', collection: 'talentsAcq', id: 't-beni', base: { id: 't-beni', nom: 'Béni (Sigmar)' }, value: null, label: beni.change.label });
    assert.ok(rows.find(row => row.key === 'row:talentsAcq:t-inv'));
    assert.ok(!rows.some(row => row.key === 'row:talentsAcq:t-autre'));
    assert.ok(!JSON.stringify(rows).includes('147'), 'aucune preuve de jet du MJ');
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.deepEqual(fn.store.wren.data.talentsAcq.map(row => row.id), ['t-autre']);
    assert.equal(fn.store.wren.data.skillsAdvanced[0].adv, 0);
    assert.deepEqual(rowsOfPlan(planFicheWriteback(state)).filter(row => !row.key.startsWith('suivi:')), [], 'plus rien à envoyer (CA7)');
  });

  test('rejet temporaire : rien ; acquisition sans id de fiche ou collection absente : « à faire à la main », jamais par nom', () => {
    assert.deepEqual(rowsOfPlan(planFicheWriteback(rejectWren(makeState({ wren: { revision: 7, data: FICHE_B() } }), { kind: 'temporary' }))), []);
    const noId = rowsOfPlan(planFicheWriteback(rejectWren(makeState({ wren: { revision: 7, data: FICHE_B() } }), { acquisitions: [{ nom: 'Béni (Sigmar)' }] })));
    const manual = noId.find(row => row.op === 'row' && row.manual);
    assert.equal(manual.reason, 'no-fiche-id'); assert.equal(manual.change, null);
    const data = FICHE_B(); delete data.talentsAcq; delete data.skillsAdvanced;
    const absent = rowsOfPlan(planFicheWriteback(rejectWren(makeState({ wren: { revision: 7, data } }))));
    assert.ok(absent.filter(row => row.op === 'row' || row.op === 'skill-adv').every(row => row.manual && row.reason === 'collection-absent'));
    assert.ok(absent.some(row => row.op === 'skill-adv'));
  });

  test('ligne déjà retirée par le joueur : pas de différence ; ligne modifiée : conflit row:talentsAcq:<id>, puis choix du MJ', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = rejectWren(makeState(fiches));
    const fn = createFakeFunction(fiches);
    fn.edit('wren', data => { data.talentsAcq = data.talentsAcq.filter(row => row.id !== 't-inv'); data.talentsAcq[0].nom = 'Béni (Sigmar) renommé'; });
    const fiche = planFicheWriteback(state).fiches[0];
    const error = await fn.execute(buildFicheCommand('wren', fiche.rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' })).catch(e => e);
    assert.deepEqual(ficheConflictOf(error).fields, ['row:talentsAcq:t-beni']);
    const value = ficheValueForKey(fn.store.wren.data, 'row:talentsAcq:t-beni');
    assert.equal(value.nom, 'Béni (Sigmar) renommé');
    state = applyConflictChoice(state, 'wren', 'row:talentsAcq:t-beni', 'outil', value);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.deepEqual(fn.store.wren.data.talentsAcq.map(row => row.id), ['t-autre']);
    // « Garder la fiche » sur une ligne : la différence ne revient plus tant que l'outil ne change pas.
    const kept = applyConflictChoice(rejectWren(makeState(fiches)), 'wren', 'row:talentsAcq:t-beni', 'fiche', { id: 't-beni', nom: 'Béni (Sigmar)' });
    assert.ok(!rowsOfPlan(planFicheWriteback(kept)).some(row => row.key === 'row:talentsAcq:t-beni'));
    assert.ok(rowsOfPlan(planFicheWriteback(kept)).some(row => row.key === 'row:talentsAcq:t-inv'));
  });
});

describe('T8 · équipement retenu par le Courroux (CA19)', () => {
  test('objet retenu → retiré ; rendu → revient à l’identique ; jamais recréé s’il n’a pas été retiré par l’outil', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = confiscate(makeState(fiches));
    const removal = rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'row:equipment:eq-relic');
    assert.deepEqual(removal.change.base, RELIC); assert.equal(removal.change.value, null);
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's1' });
    assert.deepEqual(fn.store.wren.data.equipment, []);
    for (const subject of copiesOf(state)) subject.extensions.v5.divineConfiscations[0].items[0].status = 'returned';
    const restore = rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'row:equipment:eq-relic');
    assert.equal(restore.change.base, null); assert.deepEqual(restore.change.value, RELIC);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's2' });
    assert.deepEqual(fn.store.wren.data.equipment, [RELIC]);
    assert.ok(!rowsOfPlan(planFicheWriteback(state)).some(row => row.key === 'row:equipment:eq-relic'));
    // Rendu sans retrait préalable par l'outil, objet absent de la fiche (vendu par le joueur) : rien.
    const data = FICHE_B(); data.equipment = [];
    assert.ok(!rowsOfPlan(planFicheWriteback(confiscate(makeState({ wren: { revision: 7, data } }), 'returned'))).some(row => row.op === 'row'));
  });
});

describe('T8 · Suivi du MJ (CA20, CA22, CA23)', () => {
  function withSuivi(state) {
    const register = { schemaVersion: 1, revision: 1, calendar: { schemaVersion: 1, originDay: 0, currentDay: 40 }, receipts: [], incidents: [],
      sequelae: [
        { id: 'loss:foot', participantId: 'p-wren', kind: 'loss', part: 'foot', side: 'left', label: 'Perte : pied', status: 'permanent', history: [] },
        { id: 'bone:arm', participantId: 'p-wren', kind: 'broken-bone', part: 'arm', side: 'right', label: 'Fracture : bras', status: 'permanent', history: [] },
        { id: 'scars:p-wren', participantId: 'p-wren', kind: 'scar-decision', label: 'Cicatrices impressionnantes', status: 'permanent', agreed: true, history: [] },
        { id: 'loss:pending', participantId: 'p-wren', kind: 'loss', part: 'hand', label: 'Perte : main', status: 'needs-facts', history: [] },
        agLoss(2)],
      diseases: [{ id: 'dis-1', participantId: 'p-wren', label: 'Fièvre des marais', startDay: 30, remainingDays: 4, status: 'active', careLog: [{ note: 'Note secrète du MJ' }] },
        { id: 'dis-0', participantId: 'p-wren', label: 'Toux', status: 'cured' }] };
    state.extensions.v5.aftermathRegister = register;
    for (const subject of copiesOf(state)) Object.assign(subject.extensions.v5, {
      divinePenances: [{ id: 'penance:p1', cult: 'Sigmar', text: 'Jeûner trois jours au temple', status: 'open', origin: { kind: 'gm', reason: 'Raison secrète du MJ' } }],
      corruptionMutations: [{ id: 'mut-1', status: 'confirmed', manifestedAt: 1, label: 'Animalistic Legs', summary: 'Jambes animales : le Mouvement augmente de 1.', questionsMJ: ['Question secrète'], manifestation: { note: 'Manifestation secrète' } }],
      pendingCorruptionMutation: { id: 'mut-2', status: 'pending', domain: 'physical', delayDays: 7 },
      pendingCorruptionCharacterLoss: { id: 'corruption-loss:mut-1', status: 'pending' } });
    return state;
  }

  test('CA20 : pénitence, séquelles, cicatrices, maladie, mutation confirmée → entrées outil:<id> ; rien d’autre', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = withSuivi(makeState(fiches));
    const rows = rowsOfPlan(planFicheWriteback(state)).filter(row => row.op === 'suivi');
    const byId = Object.fromEntries(rows.map(row => [row.change.id, row.change.value]));
    assert.deepEqual(Object.keys(byId).sort(), ['outil:bone:arm', 'outil:dis-1', 'outil:loss:foot', 'outil:mut-1', 'outil:penance:p1', 'outil:scars:p-wren']);
    assert.deepEqual(Object.fromEntries(Object.entries(byId).map(([id, entry]) => [id, entry.categorie])), {
      'outil:bone:arm': 'sequelle', 'outil:dis-1': 'maladie', 'outil:loss:foot': 'sequelle', 'outil:mut-1': 'mutation', 'outil:penance:p1': 'penitence', 'outil:scars:p-wren': 'cicatrice' });
    assert.equal(byId['outil:penance:p1'].detail, 'Jeûner trois jours au temple');
    assert.equal(byId['outil:mut-1'].detail, 'Jambes animales : le Mouvement augmente de 1.');
    for (const row of rows) assert.equal(row.change.base, null);
    const commands = JSON.stringify(planFicheWriteback(state));
    for (const secret of ['Raison secrète', 'Note secrète', 'Question secrète', 'Manifestation secrète', 'mut-2', 'delayDays', 'corruption-loss', 'Secret du MJ']) assert.ok(!commands.includes(secret), secret);
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.equal(fn.store.wren.data.suiviMj.length, 7, 'l’entrée saisie à la main reste');
    assert.ok(!rowsOfPlan(planFicheWriteback(state)).some(row => row.op === 'suivi'), 'CA7');
  });

  test('CA22 : pénitence close et maladie guérie disparaissent au prochain envoi (value null) ; annulation les rétablit', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = withSuivi(makeState(fiches));
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's1' });
    for (const subject of copiesOf(state)) subject.extensions.v5.divinePenances[0].status = 'completed';
    state.extensions.v5.aftermathRegister.diseases[0].status = 'cured';
    const rows = rowsOfPlan(planFicheWriteback(state)).filter(row => row.op === 'suivi');
    assert.deepEqual(rows.map(row => [row.change.id, row.change.value]).sort(), [['outil:dis-1', null], ['outil:penance:p1', null]]);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's2' });
    assert.deepEqual(fn.store.wren.data.suiviMj.map(row => row.id).sort(), ['manuel-1', 'outil:bone:arm', 'outil:loss:foot', 'outil:mut-1', 'outil:scars:p-wren']);
    const [undo] = buildUndoCommands(state.extensions.v5.ficheWriteback.lastSend);
    state = applyWritebackSuccess(state, 'wren', await fn.execute(undo.command), undo.rows);
    assert.equal(fn.store.wren.data.suiviMj.length, 7);
  });

  test('base du suivi lue dans writebackBase.suiviMj ; entrée modifiée sur la fiche = conflit suivi:<id>', async () => {
    const fiches = { wren: { revision: 7, data: FICHE_B() } };
    let state = withSuivi(makeState(fiches));
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state), { sendId: 's1' });
    fn.edit('wren', data => { data.suiviMj.find(row => row.id === 'outil:dis-1').detail = 'modifié'; });
    state.extensions.v5.aftermathRegister.diseases[0].status = 'cured';
    const fiche = planFicheWriteback(state).fiches[0];
    const error = await fn.execute(buildFicheCommand('wren', fiche.rows, { sendId: 's2', revision: fiche.revision, reason: 'Fin de séance (outil MJ)' })).catch(e => e);
    assert.deepEqual(ficheConflictOf(error).fields, ['suivi:outil:dis-1']);
    assert.equal(ficheValueForKey(fn.store.wren.data, 'suivi:outil:dis-1').detail, 'modifié');
  });
});

// ---------- Contre-vérification T6–T8 (07/11) ----------
const replaceParticipant = (state, charId, newId) => {
  const old = state.combat.participants.find(row => row.extensions.ficheId === charId);
  state.combat.participants = state.combat.participants.filter(row => row !== old).concat([{ ...clone(state.reserve.find(row => row.extensions.ficheId === charId)), id: newId, profileId: old.profileId }]);
  return state;
};

describe('Contre-vérification · séquelles orphelines (C1)', () => {
  test('nouvelle rencontre : ni Base qui remonte ni clôture du suivi pour une séquelle dont le participant a disparu', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { register: register([agLoss(5), { id: 'inj:ear', participantId: 'p-wren', kind: 'loss', part: 'ear', side: 'left', label: 'Perte : oreille', status: 'permanent', history: [] }]) });
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.deepEqual(fn.store.wren.data.suiviMj.map(row => row.id), ['outil:inj:ear']);
    replaceParticipant(state, 'wren', 'p-wren-2');
    assert.deepEqual(planFicheWriteback(state).fiches, [], 'aucune ligne : sources introuvables laissées telles quelles');
  });

  test('participant disparu mais déjà rattaché par un envoi : une nouvelle perte sur l’ancien id reste attribuée à la fiche', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    // Le participant porte déjà une séquelle au registre : il est rattaché à la fiche (ici par l'envoi ; en jeu, dès la commande de convalescence).
    let state = makeState(fiches, { tool: { wren: { fate: 2 } }, register: register([{ id: 'inj:ear', participantId: 'p-wren', kind: 'loss', part: 'ear', side: 'left', label: 'Perte : oreille', status: 'permanent', history: [] }]) });
    state = await sendAll(createFakeFunction(fiches), state, planFicheWriteback(state));
    replaceParticipant(state, 'wren', 'p-wren-2');
    state.extensions.v5.aftermathRegister.sequelae.push(agLoss(3));
    const row = rowsOfPlan(planFicheWriteback(state)).find(item => item.key === 'carac:ag');
    assert.equal(row.change.value, 29);
  });

  test('perte jamais envoyée dont le participant a disparu : signalée « à faire à la main », jamais perdue en silence', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } }, { register: register([agLoss(4, { participantId: 'p-inconnu' })]) });
    const plan = planFicheWriteback(state);
    assert.deepEqual(plan.orphans.map(row => row.sequelaId), ['characteristic-loss:op-4-Ag']);
    assert.ok(!JSON.stringify(plan.orphans).includes('Secret'), 'aucun motif du MJ');
  });

  test('source retrouvée et levée : la Base remonte et le suivi se clôt, lignes non cochées par défaut', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    const bone = { id: 'bone:leg', participantId: 'p-wren', kind: 'broken-bone', part: 'leg', side: 'left', label: 'Fracture : jambe', status: 'permanent', history: [] };
    let state = makeState(fiches, { register: register([bone]) });
    state = await sendAll(createFakeFunction(fiches), state, planFicheWriteback(state));
    state.extensions.v5.aftermathRegister.sequelae[0].status = 'healed';
    const rows = rowsOfPlan(planFicheWriteback(state));
    const ag = rows.find(row => row.key === 'carac:ag');
    assert.ok(ag.change.value > ag.change.base); assert.equal(ag.defaultUnchecked, true);
    const closed = rows.find(row => row.key === 'suivi:outil:bone:leg');
    assert.equal(closed.change.value, null); assert.equal(closed.defaultUnchecked, true);
  });
});

describe('Contre-vérification · cicatrices, pertes hors fiche, lignes sans id (C3, C5, 13)', () => {
  test('cicatrice de duel : seulement si l’incident est clos, une seule par personnage', () => {
    const scar = (id, incidentId) => ({ id, participantId: 'p-wren', incidentId, kind: 'scar', label: 'Cicatrice de duel', status: 'permanent', history: [] });
    const reg = register([scar('scar:1', 'inc-open'), scar('scar:2', 'inc-closed'), scar('scar:3', 'inc-closed-2')]);
    reg.incidents = [{ id: 'inc-open', status: 'open' }, { id: 'inc-closed', status: 'closed' }, { id: 'inc-closed-2', status: 'closed' }];
    const ids = rowsOfPlan(planFicheWriteback(makeState({ wren: { revision: 7, data: WREN() } }, { register: reg }))).filter(row => row.op === 'suivi').map(row => row.change.id);
    assert.deepEqual(ids, ['outil:scar:2']);
  });

  test('perte sur une caractéristique absente de la fiche (M) et talent sans acquisitions : « à faire à la main » avec motif', () => {
    const state = makeState({ wren: { revision: 7, data: FICHE_B() } }, { register: register([agLoss(2, { carac: 'M', id: 'characteristic-loss:m' })]) });
    for (const subject of copiesOf(state)) subject.extensions.v5.divineRejections = [{ id: 'rej', kind: 'permanent', cult: 'Sigmar', lossConfirmedBy: 'MJ', removedTalents: [{ id: 'talent-beni', name: 'Béni' }] }];
    const rows = rowsOfPlan(planFicheWriteback(state));
    assert.equal(rows.find(row => row.key === 'manual:carac:M').reason, 'carac-not-on-fiche');
    assert.equal(rows.find(row => row.op === 'row' && row.manual).reason, 'no-fiche-id');
  });

  test('lignes de fiche sans id ou à id en double : « à faire à la main », jamais un conflit insoluble', () => {
    const data = FICHE_B(); data.talentsAcq.push({ nom: 'Béni (Sigmar)' }); data.equipment.push(clone(RELIC));
    const state = confiscate(rejectWren(makeState({ wren: { revision: 7, data } })));
    const rows = rowsOfPlan(planFicheWriteback(state));
    assert.ok(rows.some(row => row.manual && row.reason === 'fiche-rows-without-id' && row.op === 'row'));
    const relic = rows.find(row => row.key === 'row:equipment:eq-relic');
    assert.equal(relic.manual, true); assert.equal(relic.reason, 'duplicate-id');
  });

  test('Prière rangée parmi les compétences de base de la fiche : motif explicite', () => {
    const state = rejectWren(makeState({ wren: { revision: 7, data: FICHE_B() } }));
    for (const subject of copiesOf(state)) subject.skills = [{ id: 'skill-priere', storageKey: 'Prière', name: 'Prière', basic: true, advances: 0 }];
    assert.equal(rowsOfPlan(planFicheWriteback(state)).find(row => row.op === 'skill-adv').reason, 'basic-skill');
  });
});

describe('Contre-vérification · compteurs (3, C2, 10) et mutations (11)', () => {
  test('fiche sans `fortune` mais avec `chance` : même règle que migrerFicheV5, pas de conflit', async () => {
    const data = WREN(); delete data.fortune; data.chance = '2';
    const fiches = { wren: { revision: 7, data } };
    let state = makeState(fiches, { tool: { wren: { fortune: 0 } } });
    state.extensions.v5.ficheWriteback = { fortuneAnchor: { wren: { fiche: 2, tool: 2 } } };
    assert.equal(state.reserve[0].ficheSnapshot.writebackBase.fields.fortune, '2');
    assert.equal(ficheValueForKey(data, 'counter:fortune'), '2');
    const fn = createFakeFunction(fiches);
    state = await sendAll(fn, state, planFicheWriteback(state));
    assert.equal(fn.store.wren.data.fortune, '0');
  });

  test('C2 : Fortune envoyée seulement si le registre a bougé depuis sa dernière lecture ; sinon ligne non cochée', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } }, { tool: { wren: { fortune: 0 } } });
    const unknown = rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'counter:fortune');
    assert.equal(unknown.defaultUnchecked, true); assert.equal(unknown.note, 'fortune-anchor-unknown');
    state.extensions.v5.ficheWriteback = { fortuneAnchor: { wren: { fiche: 1, tool: 0 } } };
    const still = rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'counter:fortune');
    assert.equal(still.defaultUnchecked, true); assert.equal(still.note, 'fiche-changed-tool-unchanged');
    state.extensions.v5.ficheWriteback = { fortuneAnchor: { wren: { fiche: 2, tool: 1 } } };
    assert.ok(!rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'counter:fortune').defaultUnchecked);
  });

  test('C2 : un registre initialisé depuis la fiche mémorise la valeur lue', async () => {
    const { setV5Fortune } = await import('../../../js/core/v5-resources.js');
    const state = makeState({ wren: { revision: 7, data: WREN() } });
    state.extensions.v5.characterResources = [];
    const next = setV5Fortune(state, state.combat.participants[0], 2, { source: 'fiche' });
    const entry = next.extensions.v5.characterResources.find(row => row.characterId === 'fiche:wren');
    assert.deepEqual([entry.ficheAnchor, entry.toolAnchor], [2, 2]);
  });

  test('Péché et Corruption absents de la fiche valent 0 : pas de ligne « — → 0 »', () => {
    const data = WREN(); delete data.peche; delete data.corruption;
    const state = makeState({ wren: { revision: 7, data } }, { tool: { wren: { sin: 0, corruption: 0 } } });
    assert.deepEqual(rowsOfPlan(planFicheWriteback(state)).filter(row => ['counter:peche', 'counter:corruption'].includes(row.key)), []);
  });

  test('mutation confirmée sans résumé : effet visible pris au catalogue, jamais la manifestation', () => {
    const state = makeState({ wren: { revision: 7, data: WREN() } });
    for (const subject of copiesOf(state)) subject.extensions.v5.corruptionMutations = [{ id: 'mut-9', tableRowId: 'L06-PHY-01', entryId: 'L06-PHY-01', status: 'confirmed', manifestedAt: 1, description: 'L06-PHY-01', manifestation: { text: 'Manifestation secrète' } }];
    const entry = rowsOfPlan(planFicheWriteback(state)).find(row => row.key === 'suivi:outil:mut-9').change.value;
    assert.equal(entry.detail, 'Jambes animales : le Mouvement augmente de 1.');
    assert.ok(!JSON.stringify(entry).includes('secrète'));
  });
});

describe('Contre-vérification · envois successifs, erreurs, historique (2, 5, 6)', () => {
  test('une même vue cumule ses envois dans lastSend ; l’annulation les défait tous, du plus récent au plus ancien', async () => {
    const fiches = { wren: { revision: 7, data: WREN() } };
    let state = makeState(fiches, { tool: { wren: { fate: 2 } } });
    const fn = createFakeFunction(fiches);
    const send = async sendId => {
      const fiche = planFicheWriteback(state).fiches[0];
      const command = buildFicheCommand('wren', fiche.rows, { sendId, revision: fiche.revision, reason: 'Fin de séance (outil MJ)' });
      state = applyWritebackSuccess(state, 'wren', await fn.execute(command), fiche.rows, { sessionId: 'vue-1' });
    };
    await send('s1');
    for (const subject of copiesOf(state)) subject.extensions.v5.fate = 1;
    await send('s2');
    assert.equal(fn.store.wren.data.destin, '1');
    const undo = buildUndoCommands(state.extensions.v5.ficheWriteback.lastSend);
    assert.deepEqual(undo.map(item => item.command.payload.undoOf), ['outilmj-s2-wren', 'outilmj-s1-wren']);
    for (const item of undo) state = applyWritebackSuccess(state, item.charId, await fn.execute(item.command), item.rows);
    assert.equal(fn.store.wren.data.destin, '3');
    assert.deepEqual(buildUndoCommands(state.extensions.v5.ficheWriteback.lastSend), []);
  });

  test('messages d’erreur propres à l’écriture, préfixe functions/ normalisé', () => {
    const error = (code, details) => Object.assign(new Error('x'), { code, details });
    assert.match(writebackErrorMessage(error('functions/permission-denied')), /MJ/);
    assert.match(writebackErrorMessage(error('functions/already-exists')), /déjà/);
    assert.match(writebackErrorMessage(error('functions/invalid-argument')), /refusé/);
    assert.match(writebackErrorMessage(error('functions/failed-precondition', { kind: 'migration-needed' })), /migr/);
    assert.match(writebackErrorMessage(error('functions/failed-precondition'), { undo: true }), /annulation/i);
    assert.match(writebackErrorMessage(error('functions/unavailable')), /injoignables/);
  });

  test('les commandes d’envoi ne sont pas annulables par l’historique de l’outil (pas de double comptage)', async () => {
    const { createStore } = await import('../../../js/core/store.js');
    let saved = null;
    const store = createStore({ storage: null, persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } } });
    await store.ready;
    const fiches = { wren: { revision: 7, data: WREN() } };
    const base = makeState(fiches, { register: register([agLoss(5)]) });
    await store.loadFromJSON({ ...base, combat: { round: 0, currentActorId: null, order: [], participants: base.combat.participants.map(row => ({ ...row, camp: 'pj', zone: 'active', skills: [], talents: [] })) }, diceLines: [] });
    const plan = store.planFicheWriteback();
    const fiche = plan.fiches[0];
    const response = await createFakeFunction(fiches).execute(buildFicheCommand('wren', fiche.rows, { sendId: 's1', revision: 7, reason: 'Fin de séance (outil MJ)' }));
    await store.applyFicheWritebackSuccess('wren', response, fiche.rows);
    const reported = () => JSON.parse(store.getFullJSON()).extensions.v5.ficheWriteback.caracReported.wren.ag;
    assert.equal(reported(), 5);
    await store.undo?.();
    assert.equal(reported(), 5);
  });
});

describe('Mutation manifestée seulement (décision du MJ du 07/11)', () => {
  const withMutation = (state, extra) => {
    for (const subject of copiesOf(state)) subject.extensions.v5.corruptionMutations = [{ id: 'mut-m', status: 'confirmed', label: 'Animalistic Legs', summary: 'Jambes animales.', manifestation: { days: 9 }, ...extra }];
    return state;
  };
  test('confirmée mais pas manifestée : aucune ligne, pas même « à faire à la main »', () => {
    const rows = rowsOfPlan(planFicheWriteback(withMutation(makeState({ wren: { revision: 7, data: WREN() } }), {})));
    assert.deepEqual(rows.filter(row => row.op === 'suivi' || String(row.key).includes('mut-m')), []);
  });
  test('confirmée et manifestée : entrée de suivi, sans le délai', () => {
    const row = rowsOfPlan(planFicheWriteback(withMutation(makeState({ wren: { revision: 7, data: WREN() } }), { manifestedAt: 5 }))).find(item => item.key === 'suivi:outil:mut-m');
    assert.equal(row.change.value.categorie, 'mutation');
    assert.ok(!JSON.stringify(row).includes('days'));
  });
  test('déjà envoyée puis redevenue non manifestée (annulation de la marque) : pas de retrait proposé', () => {
    const data = WREN(); data.suiviMj = [{ id: 'outil:mut-m', categorie: 'mutation', libelle: 'Animalistic Legs', detail: 'Jambes animales.' }];
    const rows = rowsOfPlan(planFicheWriteback(withMutation(makeState({ wren: { revision: 7, data } }), {})));
    assert.deepEqual(rows.filter(row => row.op === 'suivi'), []);
  });
});
