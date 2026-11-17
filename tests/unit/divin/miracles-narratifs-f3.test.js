import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { effectTypes } from '../../../js/core/v5-divine-grammar.js';
import { createDivineApi } from '../../../js/core/store/api-divine.js';
import { getV5Fortune, setV5Fortune } from '../../../js/core/v5-resources.js';
import { counterLayerLabel } from '../../../js/core/v5-divine-effects-counters.js';
import { previewV5TalentTestModifiers } from '../../../js/core/v5-talent-tests.js';

// L6 (F3, compteurs) : Revirement de fortune (Archives 3 p.47), Forcer la main du hasard (Deft Steps p.19), Vaincre les impies (LdB V5 p.227,
// case « a tué un ennemi visé »). Le moteur ne tire aucun dé : le MJ saisit les jets ; chaque commande est un seul ↶.
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const TWIST = idOf('Revirement de fortune'), FORCE = idOf('Forcer la main du hasard'), VANQUISH = idOf('Vaincre les impies');
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', cult), actor('ally', cult, { initiative: 30 }), actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ' })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 1, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input({ expiry: undefined, ...more }));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions?.v5?.divineEffects || [];
const counterOf = (store, id = 'priest') => layers(store, id).find(row => row.type === 'miracle-counter' && row.counter);
const flagOf = (store, id) => layers(store, id).find(row => row.type === 'miracle-counter' && row.flag);
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;
const api = store => createDivineApi({ api: store, currentEnvelope: () => JSON.parse(store.getFullJSON()), divineAuthority: 'MJ' });
const end = async (store, layer) => { const ended = await store.endDivinePrayer(layer.executionId, { reason: 'fin', baseRevision: store.getLocalRevision() }); assert.notEqual(ended?.ok, false, ended?.error); };
const haine = (participant, enemyGroup) => previewV5TalentTestModifiers(participant, { action: { type: 'attack', attr: 'CC', name: 'Épée' }, settings: { context: { enemyGroup } }, kind: 'melee' }).slModifiers
  .filter(row => /talent-hatred/.test(row.id)).reduce((sum, row) => sum + row.amount, 0);

describe('L6 — statuts, clauses et grammaire', () => {
  test('Revirement, Forcer la main et Vaincre les impies : clauses calculées, rappels restants nommés', () => {
    assert.equal(getDivineContract(TWIST).status, 'assisted');
    assert.equal(getDivineContract(FORCE).status, 'assisted');
    for (const id of ['borrow-fortune', 'contest']) assert.equal(modeOf(TWIST, id), 'engine', id);
    for (const id of ['backfire', 'restore']) assert.equal(modeOf(TWIST, id), 'manual', id);
    for (const id of ['base-bonus', 'push-your-luck', 'bust']) assert.equal(modeOf(FORCE, id), 'engine', id);
    assert.equal(modeOf(VANQUISH, 'hatred-kill'), 'engine');
    for (const name of ['A Suitable Sucker', 'One Almighty Lie', 'Wilderness Way']) assert.equal(getAllDivineContracts().find(row => row.canonicalName === name).status, 'manual', name);
  });
  test('le générateur refuse un type inconnu et un compteur ou une case mal formés', () => {
    assert.ok(effectTypes.has('miracle-counter'));
    const valid = { type: 'miracle-counter', appliesTo: 'caster', label: 'X', counter: { key: 'x', label: 'X', initial: 1 } };
    assert.equal(validateEffect(valid), null);
    assert.match(validateEffect({ ...valid, type: 'miracle-counter-inconnu' }), /non pris en charge/);
    assert.match(validateEffect({ ...valid, counter: { key: 'x', label: 'X', initial: -1 } }), /initial/);
    assert.match(validateEffect({ ...valid, flag: { key: 'x', label: 'X', grantTalents: [{ id: 'talent-hatred' }] } }), /exactement une forme/);
    assert.match(validateEffect({ ...valid, push: { threshold: 0, step: 1 } }), /push/);
    assert.match(validateEffect({ ...valid, borrow: { characteristic: 'Soc' } }), /borrow/);
    assert.match(validateEffect({ type: 'miracle-counter', label: 'X', flag: { key: 'x', label: 'X', grantTalents: [] } }), /grantTalents/);
  });
});

describe('L6 — Forcer la main du hasard : réserve de DR, jets de 1d10 saisis', () => {
  test('application : +1 DR en réserve sur le prêtre, affichée ; aucun dé tiré', async () => {
    const store = await fixture('Ranald');
    await cast(store, FORCE);
    assert.equal(counterOf(store).counter.value, 1);
    assert.match(counterLayerLabel(counterOf(store)), /Forcer la main du hasard : 1 DR en réserve/);
  });
  test('jet de 6 ou moins : +1 DR ; jet au-dessus du seuil : la réserve tombe à 0, Test initial à −1 DR, plus de jet', async () => {
    const store = await fixture('Ranald');
    await cast(store, FORCE);
    const layer = counterOf(store);
    assert.equal((await api(store).pushDivineCounter('priest', layer.id, 6)).value, 2);
    assert.equal((await api(store).pushDivineCounter('priest', layer.id, 3)).value, 3);
    const busted = await api(store).pushDivineCounter('priest', layer.id, 7);
    assert.deepEqual([busted.ok, busted.bust], [true, true]);
    assert.equal(counterOf(store).counter.value, 0);
    assert.match(counterLayerLabel(counterOf(store)), /−1 DR/);
    assert.match((await api(store).pushDivineCounter('priest', layer.id, 2)).error, /déjà perdue/);
    assert.match((await api(store).pushDivineCounter('priest', layer.id, 11)).error, /1d10/);
  });
  test('dépense : un ↶, refus sous le minimum, ↶ rend la réserve ; ↷ la rejoue', async () => {
    const store = await fixture('Ranald');
    await cast(store, FORCE);
    const layer = counterOf(store);
    await api(store).pushDivineCounter('priest', layer.id, 5);
    assert.equal((await api(store).spendDivineCounter('priest', layer.id, 2)).remaining, 0);
    assert.match((await api(store).spendDivineCounter('priest', layer.id, 1)).error, /impossible/);
    assert.equal(counterOf(store).counter.value, 0);
    await store.undo();
    assert.equal(counterOf(store).counter.value, 2);
    await store.redo();
    assert.equal(counterOf(store).counter.value, 0);
    assert.match(store.getFullJSON(), /2 dépensé\(s\), reste 0/);
  });
  test('↶ de la prière : la couche disparaît ; expiration : elle s’éteint avec la prière', async () => {
    const store = await fixture('Ranald');
    await cast(store, FORCE);
    await store.undo();
    assert.equal(counterOf(store), undefined);
    await cast(store, FORCE);
    await end(store, counterOf(store));
    assert.equal(counterOf(store), undefined);
  });
  test('couche absente : refus en français', async () => {
    const store = await fixture('Ranald');
    assert.match((await api(store).spendDivineCounter('priest', 'inconnue', 1)).error, /introuvable/);
    assert.match((await api(store).setDivineFlag('priest', 'inconnue', true)).error, /introuvable/);
  });
});

describe('L6 — Revirement de fortune : Test opposé saisi, Chance empruntée seulement sur échec', () => {
  const twist = more => ({ targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } }, ...more });
  test('le Test opposé de la cible est demandé ; sans lui, l’aperçu réclame la saisie', async () => {
    const store = await fixture('Handrich');
    const preview = store.previewDivineExecution(TWIST, input(twist({ expiry: undefined })));
    assert.equal(preview.ready, false);
    assert.ok(JSON.stringify(preview.needsInput).includes('counterContests.foe'), JSON.stringify(preview.needsInput));
  });
  test('cible qui échoue : 1 point emprunté (réserve 1, prêteur nommé) ; dépense : sa Chance permanente baisse de 1, en un ↶', async () => {
    const store = await fixture('Handrich');
    await store.executeCommand('chance', draft => setV5Fortune(draft, draft.combat.participants.find(row => row.id === 'foe'), 2));
    await cast(store, TWIST, twist({ counterContests: { foe: 98 } }));
    const layer = counterOf(store);
    assert.deepEqual([layer.counter.value, layer.counter.lender], [1, { id: 'foe', name: 'foe' }]);
    const spent = await api(store).spendDivineCounter('priest', layer.id, 1);
    assert.equal(spent.ok, true);
    assert.equal(getV5Fortune(JSON.parse(store.getFullJSON()), person(store, 'foe')).permanent, 1);
    await store.undo();
    assert.equal(getV5Fortune(JSON.parse(store.getFullJSON()), person(store, 'foe')).permanent, 2);
    assert.equal(counterOf(store).counter.value, 1);
  });
  test('cible qui réussit et dépasse les DR de la Prière : elle garde sa Chance (réserve 0) ; marge de +4 DR : retour de flamme affiché', async () => {
    const keep = await fixture('Handrich');
    await cast(keep, TWIST, twist({ counterContestResult: { foe: 'success' }, counterContestSl: { foe: 3 } }));
    assert.equal(counterOf(keep).counter.value, 0);
    assert.equal(counterOf(keep).counter.lender, undefined);
    assert.match(counterLayerLabel(counterOf(keep)), /garde sa Chance/);
    assert.equal(counterOf(keep).counter.contest.backfire, false);
    const flame = await fixture('Handrich');
    const { preview } = await cast(flame, TWIST, twist({ counterContestResult: { foe: 'success' }, counterContestSl: { foe: 8 } }));
    assert.equal(counterOf(flame).counter.contest.backfire, true);
    assert.match(counterLayerLabel(counterOf(flame)), /peut dépenser un point de Chance du prêtre/);
    assert.equal(preview.preview.effects[0].contest.prayerSl, preview.preview.prayer.sl);
  });
  test('cible qui réussit sans dépasser les DR de la Prière : le point est emprunté', async () => {
    const store = await fixture('Handrich');
    await cast(store, TWIST, twist({ counterContestResult: { foe: 'success' }, counterContestSl: { foe: 0 } }));
    assert.equal(counterOf(store).counter.value, 1);
  });
  test('solde de Chance inconnu : la dépense réussit, un rappel demande de retirer le point à la main', async () => {
    const store = await fixture('Handrich');
    await cast(store, TWIST, twist({ counterContests: { foe: 98 } }));
    const spent = await api(store).spendDivineCounter('priest', counterOf(store).id, 1);
    assert.equal(spent.ok, true);
    assert.match(spent.reminders.join(' '), /retirer 1 point\(s\) de Chance à la main/);
  });
  test('↶ de la prière et expiration : la couche disparaît', async () => {
    const store = await fixture('Handrich');
    await cast(store, TWIST, twist({ counterContests: { foe: 98 } }));
    await store.undo();
    assert.equal(counterOf(store), undefined);
    await cast(store, TWIST, twist({ counterContests: { foe: 98 } }));
    await end(store, counterOf(store));
    assert.equal(counterOf(store), undefined);
  });
});

describe('L6 — Vaincre les impies : Haine +1 avant, +2 après la case « a tué un ennemi visé »', () => {
  const vanquish = more => ({ targetIds: ['ally'], expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
  test('application : une case non cochée sur l’allié et sur le prêtre ; Haine +1 contre les orques', async () => {
    const store = await fixture('Sigmar');
    await cast(store, VANQUISH, vanquish());
    assert.equal(flagOf(store, 'ally').flag.set, false);
    assert.equal(flagOf(store, 'priest').flag.set, false);
    assert.equal(haine(person(store, 'ally'), 'Orques'), 1);
    assert.equal(haine(person(store, 'priest'), 'Orques'), 1);
  });
  test('case cochée sur l’allié : +2 DR contre un groupe visé, rien contre un autre ; décochée : +1 ; chaque coche est un ↶', async () => {
    const store = await fixture('Sigmar');
    await cast(store, VANQUISH, vanquish());
    const layer = flagOf(store, 'ally');
    assert.equal((await api(store).setDivineFlag('ally', layer.id, true)).value, true);
    assert.equal(haine(person(store, 'ally'), 'Orques'), 2);
    assert.equal(haine(person(store, 'ally'), 'Gobelins'), 2);
    assert.equal(haine(person(store, 'priest'), 'Orques'), 1);
    assert.equal(haine(person(store, 'ally'), 'Elfes'), 0);
    assert.match(counterLayerLabel(flagOf(store, 'ally')), /A tué un ennemi visé : oui/);
    await store.undo();
    assert.equal(haine(person(store, 'ally'), 'Orques'), 1);
    await store.redo();
    assert.equal(haine(person(store, 'ally'), 'Orques'), 2);
    await api(store).setDivineFlag('ally', layer.id, false);
    assert.equal(haine(person(store, 'ally'), 'Orques'), 1);
  });
  test('le prêtre (Q11) a sa case ; refus d’une valeur non booléenne', async () => {
    const store = await fixture('Sigmar');
    await cast(store, VANQUISH, vanquish());
    await api(store).setDivineFlag('priest', flagOf(store, 'priest').id, true);
    assert.equal(haine(person(store, 'priest'), 'Morts-vivants'), 2);
    assert.match((await api(store).setDivineFlag('priest', flagOf(store, 'priest').id, 'oui')).error, /oui ou non/);
  });
  test('↶ de la prière et expiration : cases et Haine disparaissent', async () => {
    const store = await fixture('Sigmar');
    await cast(store, VANQUISH, vanquish());
    await api(store).setDivineFlag('ally', flagOf(store, 'ally').id, true);
    await end(store, flagOf(store, 'ally'));
    assert.equal(flagOf(store, 'ally'), undefined);
    assert.equal(haine(person(store, 'ally'), 'Orques'), 0);
  });
});
