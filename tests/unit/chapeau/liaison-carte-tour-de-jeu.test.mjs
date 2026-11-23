// Refonte de l'interface, lot E10 (spec S9, CA28-CA32) : liaison « tour de jeu » avec Map Display.
// Depuis le 22/11/2026, `mj.turn { ref }` commande la tablette (seul le PJ du `ref` bouge, `null` : tout est libre) ; la carte
// signale une Course (`map.ran`) et, en version 2 du protocole, l'annulation du mouvement du tour (`map.turnReset { ref }`).
// Store réel, faux canal, Bus branché comme dans `js/main.js` (bloc « Liaison RPG Map Display »).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { createMapLink } from '../../../js/core/map-link.js';
import { createMapLinkProtocol, MAP_LINK_VERSION } from '../../../js/core/map-link-protocol.js';
import { LIAISON_CARTE } from '../../../js/data/donnees-communes.js';
import { createMapTurnFlow } from '../../../js/ui/map-link-feedback.js';
import { publishedDecisions, withdrawDecision } from '../../../js/ui/combat-decisions.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const fighter = (id, initiative, extra = {}) => ({ id, name: id.toUpperCase(), kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative, hp: 10, maxHp: 10,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: initiative, Ag: 40, Dex: 40, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} }, ...extra });
const map = (type, payload = {}, v = MAP_LINK_VERSION) => ({ v, type, seq: 0, at: 0, from: 'map', payload });

function bus() {
  const handlers = new Map();
  return { on(event, fn) { if (!handlers.has(event)) handlers.set(event, []); handlers.get(event).push(fn); }, emit(event, payload) { for (const fn of handlers.get(event) || []) fn(payload); } };
}

/** Combat a, b, c, d (initiative décroissante), liaison branchée sur le Bus comme dans main.js. */
async function table({ current = 'a', round = 1 } = {}) {
  const events = bus();
  const store = createStore({ persistence: memory(), storage: null, bus: events }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round, currentActorId: current, order: ['a', 'b', 'c', 'd'],
    participants: [fighter('a', 50), fighter('b', 40), fighter('c', 30), fighter('d', 20)] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatScopeId: 'scene-e10' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  const sent = [], toasts = [], resets = [], ran = [];
  const link = createMapLink({ channel: { postMessage: message => sent.push(clone(message)), onmessage: null },
    getParticipants: () => store.listParticipants(), getActiveId: () => store.getCombat()?.currentActorId ?? null,
    now: () => 0, setTimer: () => 0, clearTimer: () => {}, onRan: ref => ran.push(ref), onTurnReset: ref => resets.push(ref) });
  for (const event of ['reserve', 'combat', 'combat:update']) events.on(event, link.refresh);
  const flow = createMapTurnFlow({ store, showToast: (message, type, action) => toasts.push({ message, type, action }) });
  for (const event of ['combat', 'combat:update']) events.on(event, flow.onCombatChange);
  link.onMessage(map('map.hello'));
  const turns = () => sent.filter(message => message.type === 'mj.turn').map(message => message.payload.ref);
  return { store, engine: createCombatEngine(store), link, sent, turns, lastTurn: () => turns().at(-1), toasts, flow, resets, ran };
}
async function next(engine) {
  const result = await engine.nextTurn();
  assert.equal(result.status, 'applied', JSON.stringify(result));
}
const runDecisions = () => publishedDecisions().filter(row => row.kind === 'course-carte');
const clearDecisions = () => { for (const row of publishedDecisions()) withdrawDecision(row.id); };
const actions = (store, id) => store.listTurnActions(id).length;
const moveRows = (store, id) => (JSON.parse(store.getFullJSON()).extensions?.v5?.actionLedger?.quotaUsage || [])
  .filter(row => row.actorId === id && row.quotaId === 'system:turn-move' && row.used > 0);

describe('CA28 — mj.turn suit chaque changement de tour', () => {
  test('Tour suivant, changement de round, puis Annuler : le pion actif suit', async () => {
    const t = await table();
    assert.equal(t.lastTurn(), 'p:a', 'instantané de la connexion');
    await next(t.engine);
    assert.equal(t.lastTurn(), 'p:b');
    await next(t.engine); await next(t.engine);
    assert.equal(t.lastTurn(), 'p:d');
    await next(t.engine);
    assert.equal(t.store.getCombat().round, 2);
    assert.equal(t.lastTurn(), 'p:a', 'nouveau round');
    await t.store.undo();
    assert.equal(t.store.getCombat().round, 1);
    assert.equal(t.lastTurn(), 'p:d', 'Annuler le changement de round');
    await t.store.undo();
    assert.equal(t.lastTurn(), 'p:c', 'Annuler Tour suivant');
  });

  test('« Jouer son tour maintenant », la reprise, et Annuler de chacun', async () => {
    const t = await table();
    assert.equal((await t.store.playTurnNow('c')).ok, true);
    assert.equal(t.lastTurn(), 'p:c', 'tour avancé');
    await t.store.undo();
    assert.equal(t.lastTurn(), 'p:a', 'Annuler le tour avancé');
    assert.equal((await t.store.playTurnNow('c')).ok, true);
    assert.equal(t.lastTurn(), 'p:c');
    await next(t.engine);
    assert.equal(t.lastTurn(), 'p:a', 'reprise : celui qui devait jouer');
    await t.store.undo();
    assert.equal(t.lastTurn(), 'p:c', 'Annuler la reprise');
    assert.deepEqual(t.turns(), ['p:a', 'p:c', 'p:a', 'p:c', 'p:a', 'p:c'], 'un message par changement, aucun de trop');
  });

  test('toujours dans l’instantané ; le même ref réannoncé ne change rien dans l’outil', async () => {
    const t = await table({ current: 'b' });
    const before = t.store.getFullJSON();
    t.link.onMessage(map('map.hello'));
    t.link.onMessage(map('map.hello'));
    assert.deepEqual(t.turns(), ['p:b', 'p:b', 'p:b']);
    assert.equal(t.store.getFullJSON(), before, 'aucune écriture');
    t.link.refresh();
    assert.equal(t.turns().length, 3, 'tour inchangé : rien hors instantané');
  });
});

describe('CA29 — mj.turn { ref: null } à la fin d’un combat', () => {
  test('Terminer le combat', async () => {
    const t = await table();
    await t.store.endEncounter();
    assert.equal(t.lastTurn(), null);
  });

  test('retrait du dernier combattant actif', async () => {
    const t = await table();
    for (const id of ['b', 'c', 'd']) await t.store.removeParticipant(id);
    assert.equal(t.lastTurn(), 'p:a', 'il reste a, toujours actif');
    await t.store.removeParticipant('a');
    assert.equal(t.lastTurn(), null);
  });

  test('Recommencer', async () => {
    const t = await table({ current: 'c' });
    await t.store.restartCombat();
    assert.equal(t.store.getCombat().currentActorId, null);
    assert.equal(t.lastTurn(), null);
  });
});

describe('CA30 — map.ran idempotent dans le Tour', () => {
  test('deux map.ran du même combattant avant le clic : une seule question, une seule Action', async () => {
    clearDecisions();
    const t = await table();
    t.flow.onRan('p:a');
    t.flow.onRan('p:a');
    assert.equal(runDecisions().length, 1, 'une seule question dans « À décider »');
    assert.equal(t.toasts.filter(toast => toast.action).length, 1, 'un seul bouton « Action utilisée »');
    assert.match(t.toasts.at(-1).message, /déjà/, 'le second message le dit');
    await runDecisions()[0].onChoose('used');
    assert.equal(actions(t.store, 'a'), 1);
    await t.toasts.find(toast => toast.action).action.onClick();
    assert.equal(actions(t.store, 'a'), 1, 'le second clic ne coûte rien');
    assert.match(t.toasts.at(-1).message, /déjà dépensée/, 'et le dit');
    t.flow.onRan('p:a');
    assert.equal(runDecisions().length, 0, 'Action dépensée : plus de question');
    assert.match(t.toasts.at(-1).message, /déjà dépensée/);
    assert.equal(actions(t.store, 'a'), 1);
  });

  test('une question non tranchée ne survit pas au changement de Tour', async () => {
    clearDecisions();
    const t = await table();
    t.flow.onRan('p:a');
    const toast = t.toasts.find(row => row.action);
    assert.equal(runDecisions().length, 1);
    await next(t.engine);
    assert.equal(runDecisions().length, 0, 'retirée au Tour suivant');
    // Le bouton du toast, resté à l'écran, ne dépense rien dans un autre Tour, même quand le tour revient à a.
    await next(t.engine); await next(t.engine); await next(t.engine);
    assert.equal(t.store.getCombat().currentActorId, 'a');
    await toast.action.onClick();
    assert.equal(actions(t.store, 'a'), 0, 'aucune Action d’un autre Tour dépensée');
    assert.match(t.toasts.at(-1).message, /Tour a changé/);
  });
});

describe('CA31 — map.turnReset : Action rendue, déplacement remis à zéro', () => {
  test('le protocole transmet map.turnReset { ref } au rappel onTurnReset ; sans ref ou d’un autre émetteur, ignoré', async () => {
    const t = await table();
    t.link.onMessage(map('map.turnReset', { ref: 'p:a' }));
    t.link.onMessage(map('map.turnReset', {}));
    t.link.onMessage({ ...map('map.turnReset', { ref: 'p:a' }), from: 'outil-mj' });
    assert.deepEqual(t.resets, ['p:a']);
  });

  test('Course signalée puis dépensée, puis map.turnReset : Action rendue, déplacement à zéro, Annuler rétablit ; un second ne rend rien de plus', async () => {
    clearDecisions();
    const t = await table();
    assert.equal((await t.store.declareV5CombatMovement({ actorId: 'a' })).status !== 'blocked', true);
    t.flow.onRan('p:a');
    await runDecisions()[0].onChoose('used');
    assert.equal(actions(t.store, 'a'), 1);
    assert.equal(t.store.getV5TurnFacts('a').moved, true);
    const result = await t.flow.onTurnReset('p:a');
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.actionRestored, true);
    assert.equal(actions(t.store, 'a'), 0, 'Action rendue');
    assert.equal(t.store.getV5TurnFacts('a').moved, false, 'déplacement du Tour remis à zéro');
    assert.match(t.toasts.at(-1).message, /Action rendue/);
    const again = await t.flow.onTurnReset('p:a');
    assert.equal(again.ok, false, 'idempotent');
    assert.equal(again.reason, 'nothing');
    assert.equal(actions(t.store, 'a'), 0);
    await t.store.undo();
    assert.equal(actions(t.store, 'a'), 1, 'Annuler rétablit l’Action');
    assert.equal(t.store.getV5TurnFacts('a').moved, true, 'et le déplacement');
  });

  test('déplacement du Tour (system:turn-move) remis à zéro', async () => {
    const t = await table();
    // Se cabrer n'existe que pour une créature au Piétinement : on écrit la ligne de quota comme elle (api-trait-buttons.js).
    const state = JSON.parse(t.store.getFullJSON());
    const clock = t.store.getActionClock('a');
    state.extensions.v5.actionLedger = { appliedActions: [], quotaUsage: [{ actorId: 'a', quotaId: 'system:turn-move', scope: 'turn', scopeKey: JSON.stringify([clock.encounterId, clock.turnId]), used: 1 }] };
    await t.store.loadFromJSON(state);
    assert.equal(moveRows(t.store, 'a').length, 1);
    const result = await t.store.resetV5TurnFromMap('a');
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.actionRestored, false);
    assert.equal(moveRows(t.store, 'a').length, 0);
  });

  test('la question de Course encore ouverte est retirée', async () => {
    clearDecisions();
    const t = await table();
    t.flow.onRan('p:a');
    assert.equal(runDecisions().length, 1);
    await t.flow.onTurnReset('p:a');
    assert.equal(runDecisions().length, 0);
    assert.equal(actions(t.store, 'a'), 0, 'rien n’a été dépensé, rien n’est rendu');
  });

  test('ref d’un non-actif, inconnu ou hors combat : rien', async () => {
    const t = await table();
    assert.equal((await t.store.spendV5RunAction('a')).ok, true);
    // getFullJSON horodate l'export (exportedAt) : on compare l'état sans cette date.
    const sansDate = json => { const etat = JSON.parse(json); delete etat.exportedAt; return etat; };
    const before = sansDate(t.store.getFullJSON());
    assert.equal((await t.store.resetV5TurnFromMap('b')).reason, 'not-turn');
    assert.equal(await t.flow.onTurnReset('p:b'), null, 'non-actif : l’outil ne touche à rien');
    assert.equal(await t.flow.onTurnReset('p:inconnu'), null);
    assert.deepEqual(sansDate(t.store.getFullJSON()), before);
    await t.store.endEncounter();
    assert.equal((await t.store.resetV5TurnFromMap('a')).reason, 'not-turn');
    assert.equal(await t.flow.onTurnReset('p:a'), null);
  });

  test('Action dépensée par une attaque (pas par la Course) : non rendue', async () => {
    const t = await table();
    // Une attaque enregistre l'Action du Tour comme toute Action standard (recordV5ActionUsage, identifiant de commande).
    const state = JSON.parse(t.store.getFullJSON());
    const clock = t.store.getActionClock('a');
    state.extensions.v5.standardTurnActions = [{ actorId: 'a', actionId: 'attack:a:1', encounterId: clock.encounterId, round: clock.round, turnId: clock.turnId, kind: 'action' }];
    await t.store.loadFromJSON(state);
    assert.equal(actions(t.store, 'a'), 1);
    const result = await t.store.resetV5TurnFromMap('a');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'nothing');
    assert.equal(actions(t.store, 'a'), 1, 'l’attaque reste dépensée');
  });

  test('Course puis autre Action enregistrée : rien d’autre ne doit l’avoir dépensée depuis', async () => {
    const t = await table();
    const state = JSON.parse(t.store.getFullJSON());
    const clock = t.store.getActionClock('a');
    const row = actionId => ({ actorId: 'a', actionId, encounterId: clock.encounterId, round: clock.round, turnId: clock.turnId, kind: 'action' });
    state.extensions.v5.standardTurnActions = [row(`run:a:${clock.turnId}`), row('attack:a:2')];
    await t.store.loadFromJSON(state);
    const result = await t.store.resetV5TurnFromMap('a');
    assert.equal(result.reason, 'nothing');
    assert.equal(actions(t.store, 'a'), 2);
  });
});

// Version 3 depuis le lot G4 (point d'impact, contrat §10.1, 23/11/2026) : map.turnReset y reste inchangé.
describe('CA32 — version de la liaison (2, puis 3 depuis G4)', () => {
  test('LIAISON_CARTE.version vaut 3, mj.hello part en version 3', () => {
    assert.equal(LIAISON_CARTE.version, 3);
    assert.equal(MAP_LINK_VERSION, 3);
    const sent = [];
    createMapLinkProtocol({ channel: { postMessage: message => sent.push(message), onmessage: null },
      projection: { tokenStates: () => ({}), refOf: participant => `p:${participant.id}` }, getParticipants: () => [] });
    assert.deepEqual([sent[0].type, sent[0].v], ['mj.hello', 3]);
  });

  test('map.hello en version courante : connecté ; en version 1 : version différente, rien d’échangé', () => {
    const sent = [], statuses = [], resets = [];
    const link = createMapLinkProtocol({ channel: { postMessage: message => sent.push(message), onmessage: null },
      projection: { tokenStates: () => ({}), refOf: participant => `p:${participant.id}` }, getParticipants: () => [], onStatus: status => statuses.push(status),
      onTurnReset: ref => resets.push(ref) });
    link.onMessage(map('map.hello', {}, 1));
    link.onMessage(map('map.turnReset', { ref: 'p:a' }, 1));
    assert.equal(link.status(), 'version-mismatch');
    assert.equal(sent.filter(message => message.type === 'mj.snapshot').length, 0, 'pas d’instantané');
    assert.deepEqual(resets, [], 'map.turnReset d’une version 1 ignoré');
    link.onMessage(map('map.hello'));
    assert.equal(link.status(), 'connected');
    assert.equal(sent.filter(message => message.type === 'mj.snapshot').length, 1);
    assert.deepEqual(statuses, ['version-mismatch', 'connected']);
  });
});
