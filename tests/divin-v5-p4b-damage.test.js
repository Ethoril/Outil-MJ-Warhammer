import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { effectHandlers, validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';

// P4b T2 : dégâts ordinaires (BE et PA), Blessures fixes, filtres de cible, effet miroir sur le prêtre, Haine sacrée.
const clone = value => structuredClone(value);
const ANNIHILATE = 'divine:miracle:morr:destroy-undead';
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(ANNIHILATE);
const registered = [];
// Contrat d'essai : copie d'Anéantir les morts-vivants (instantané, zone), seuls les effets changent.
function synthetic(key, effects) {
  const id = `divine:miracle:morr:test-damage-${key}`;
  registry.contracts.push({ ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test damage ${key}`, status: 'assisted',
    effects, targetRules: [], clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] });
  registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });

const ORDINARY = synthetic('ordinary', [{ type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM', ignoreAp: true }]);
const FIXED_ORDINARY = synthetic('fixed-ordinary', [{ type: 'ordinary-damage', fixed: 10 }]);
const MINIMUM = synthetic('minimum', [{ type: 'ordinary-damage', fixed: 1 }]);
const PER_LEVEL = synthetic('per-level', [{ type: 'direct-damage', fixed: 1, perSuccessLevel: 1, requiresFact: { field: 'humanoid', label: 'humanoïde touché (fait MJ)' } }]);
const FILTERED = synthetic('filtered', [{ type: 'direct-damage', dice: { count: 1, sides: 10 }, targetFilter: { traits: ['Mort-vivant', 'Démon'], fact: 'impure', label: 'impure (fait MJ)' } }]);
const JUDGED = synthetic('judged', [
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, requiresFact: { field: 'judgement', onFalse: 'skip', label: 'verdict MJ' } },
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, appliesTo: 'caster', casterWhen: { field: 'judgement', label: 'verdict MJ', value: false, match: 'any' } }]);
const BACKFIRE = synthetic('backfire', [
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }] },
  { type: 'direct-damage', dice: { count: 1, sides: 10 }, perSuccessLevel: 1, conditions: [{ key: 'Ablaze', level: 1, when: 'always' }], appliesTo: 'caster',
    casterWhen: { field: 'foe', label: 'ennemi (fait MJ)', value: true, match: 'none' } }]);

const person = (store, id) => store.listParticipants().find(row => row.id === id);
const stateOf = store => JSON.parse(store.getFullJSON());
const cultTalents = [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }];
const fighter = (id, extra = {}) => ({ id, name: id, kind: 'PNJ', camp: 'pnj', zone: 'active', initiative: 20, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 40, M: 4 },
  equipment: [], traits: [], states: [], talents: [], armor: { head: 3, body: 3, arms: 3, legs: 3 }, extensions: { v5: {} }, ...extra });
const priest = (extra = {}) => fighter('priest', { kind: 'PJ', camp: 'pj', initiative: 60, caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }], talents: cultTalents,
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture(others, priestExtra = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', ...others.map(row => row.id)], participants: [priest(priestExtra), ...others] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
// Jet de prière 45 contre Prière 60 : 2 DR.
const input = (ids, more = {}, factMore = {}) => ({ actorId: 'priest', targetIds: ids, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  facts: { targets: Object.fromEntries(ids.map(id => [id, { withinRange: true, ...(factMore[id] || {}) }])) }, ...more });
async function cast(store, id, request) {
  const preview = store.previewDivineExecution(id, request);
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(id, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const needsOf = (store, id, request) => store.previewDivineExecution(id, request).needsInput.map(row => row.field);
const talents = [...cultTalents, { id: 'talent-holy-hatred', status: 'resolved', rank: 1 }];

test('registre : ordinary-damage est déclaré et refuse un contrat mal formé', () => {
  assert.ok(effectHandlers['ordinary-damage']);
  assert.match(validateEffect({ type: 'ordinary-damage' }), /dice.*fixed/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 0 }), /fixed/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 5, bonusFrom: 'Vol' }), /bonusFrom/);
  assert.match(validateEffect({ type: 'ordinary-damage', fixed: 5, ignoreAp: 'oui' }), /booléens/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 5, ignoreAp: true }), /ordinary-damage/);
  assert.match(validateEffect({ type: 'direct-damage', dice: { count: 1, sides: 10 }, targetFilter: { fact: 'x' } }), /targetFilter/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 1, requiresFact: { field: 'a', label: 'b', onFalse: 'ignore' } }), /requiresFact/);
  assert.match(validateEffect({ type: 'direct-damage', fixed: 1, casterWhen: { field: 'a', label: 'b', value: true, match: 'any' } }), /casterWhen/);
  assert.equal(validateEffect({ type: 'direct-damage', fixed: 1, appliesTo: 'caster', casterWhen: { field: 'a', label: 'b', value: true, match: 'none' } }), null);
  assert.equal(validateEffect({ type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM', ignoreAp: true }), null);
  assert.equal(validateEffect({ type: 'direct-damage', fixed: 1, perSuccessLevel: 1 }), null);
});

test('1d10 + Bonus de Volonté : PA ignorés, Bonus d’Endurance déduit', async () => {
  const store = await fixture([fighter('foe')]);
  const request = input(['foe'], { damageRoll: 6 });
  assert.deepEqual(needsOf(store, ORDINARY, input(['foe'])), ['damageRoll'], 'aucune localisation exigée : les PA sont ignorés');
  const { preview, result } = await cast(store, ORDINARY, request);
  assert.equal(preview.preview.effects[0].bonus, 5, 'Bonus de Volonté figé dans l’aperçu');
  assert.equal(person(store, 'foe').hp, 20 - (6 + 5 - 3), 'BE 3 déduit, PA 3 ignorés');
  const row = result.receipt.effectReceipts[0];
  assert.deepEqual([row.type, row.result.rawDamage, row.result.be, row.result.ap, row.result.woundsLost], ['ordinary-damage', 11, 3, 0, 8]);
  assert.match(row.log, /foe perd 8 Blessure\(s\) \(1d10 = 6, \+5 \(caractéristique\), BE 3, PA 0\)/);
  assert.equal(person(store, 'priest').hp, 20, 'le prêtre n’est pas touché');
});

test('dégâts ordinaires : minimum 1, Blessures perdues bornées par les Blessures restantes', async () => {
  const minimum = await fixture([fighter('foe', { armor: { head: 9, body: 9, arms: 9, legs: 9 } })]);
  await cast(minimum, MINIMUM, input(['foe'], { locationChoices: { foe: 'body' } }));
  assert.equal(person(minimum, 'foe').hp, 19, '1 − BE 3 − PA 9 : minimum 1');
  const low = await fixture([fighter('foe', { hp: 2 })]);
  const { result } = await cast(low, ORDINARY, input(['foe'], { damageRoll: 10 }));
  const row = result.receipt.effectReceipts[0].result;
  assert.deepEqual([row.wounds, row.woundsLost, row.hpAfter], [12, 2, 0], 'dégâts ≠ Blessures réellement perdues');
});

test('localisation : d100 propre à chaque cible (inversé) ou choix du MJ, PA de la Localisation déduits', async () => {
  const store = await fixture([fighter('a', { armor: { head: 1, body: 5, arms: 2, legs: 4 } }), fighter('b', { armor: { head: 1, body: 5, arms: 2, legs: 4 } }), fighter('c', { armor: { head: 1, body: 5, arms: 2, legs: 4 } })]);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a', 'b'])), ['locationRolls.a', 'locationRolls.b']);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a', 'b'], { locationRolls: { a: 10 }, locationChoices: { b: 'bogus' } })), ['locationRolls.b']);
  assert.deepEqual(needsOf(store, FIXED_ORDINARY, input(['a'], { locationRolls: { a: 101 } })), ['locationRolls.a']);
  const { result } = await cast(store, FIXED_ORDINARY, input(['a', 'b', 'c'], { locationRolls: { a: 10, b: 45 }, locationChoices: { c: 'leg' } }));
  const hp = id => person(store, id).hp;
  assert.equal(hp('a'), 20 - (10 - 3 - 1), 'd100 10 inversé en 01 : Tête, PA 1');
  assert.equal(hp('b'), 20 - (10 - 3 - 5), 'd100 45 inversé en 54 : Corps, PA 5');
  assert.equal(hp('c'), 20 - (10 - 3 - 4), 'choix MJ : Jambe, PA 4');
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.result.ap), [1, 5, 4]);
});

test('Haine sacrée : +2 sur les Blessures réellement perdues, après BE et PA, jamais sur une cible déjà à 0', async () => {
  const plain = await fixture([fighter('foe')]);
  await cast(plain, ORDINARY, input(['foe'], { damageRoll: 6 }));
  assert.equal(person(plain, 'foe').hp, 12);
  const hateful = await fixture([fighter('foe'), fighter('dead', { hp: 0 })], { talents });
  const { result } = await cast(hateful, ORDINARY, input(['foe', 'dead'], { damageRoll: 6 }));
  assert.equal(person(hateful, 'foe').hp, 10, '(6 + 5 − BE 3) + 2');
  assert.equal(result.receipt.effectReceipts[0].result.bonuses.holyHatred, 2);
  const [, dead] = result.receipt.effectReceipts;
  assert.deepEqual([dead.result.woundsLost, dead.result.bonuses.holyHatred], [0, 0], 'aucune Blessure perdue : pas de bonus');
  const armoured = await fixture([fighter('foe', { armor: { head: 9, body: 9, arms: 9, legs: 9 } })], { talents });
  await cast(armoured, MINIMUM, input(['foe'], { locationChoices: { foe: 'body' } }));
  assert.equal(person(armoured, 'foe').hp, 20 - 1 - 2, 'minimum 1 perdue, puis +2');
});

test('direct-damage à valeur fixe : 1 Blessure + 1 par DR, sans dé, sur les cibles dont le fait MJ est vrai', async () => {
  const store = await fixture([fighter('human'), fighter('beast')]);
  assert.deepEqual(needsOf(store, PER_LEVEL, input(['human'])), ['facts.targets.human.humanoid'], 'aucun jet de dégâts demandé');
  assert.deepEqual(needsOf(store, PER_LEVEL, input(['human', 'beast'], {}, { human: { humanoid: true }, beast: { humanoid: false } })), ['facts.targets.beast.humanoid'], 'faux sans onFalse : bloque');
  const { result } = await cast(store, PER_LEVEL, input(['human'], {}, { human: { humanoid: true } }));
  assert.equal(person(store, 'human').hp, 20 - 3, '1 + 2 DR, sans BE ni PA');
  const row = result.receipt.effectReceipts[0];
  assert.deepEqual([row.result.die, row.result.DR, row.result.woundsLost], [null, 2, 3]);
  assert.match(row.log, /1 fixe|2 DR/);
});

test('targetFilter : traits lus sur la fiche, sinon fait MJ ; fait faux : cible ignorée ; absent : aperçu bloqué', async () => {
  const store = await fixture([fighter('ghoul', { traits: ['Mort-vivant'] }), fighter('sinner'), fighter('innocent'), fighter('fiend', { traits: ['Démon'] })]);
  assert.deepEqual(needsOf(store, FILTERED, input(['ghoul', 'sinner'], { damageRoll: 5 })), ['facts.targets.sinner.impure']);
  assert.deepEqual(needsOf(store, FILTERED, input(['innocent'], { damageRoll: 5 }, { innocent: { impure: undefined } })), ['facts.targets.innocent.impure']);
  assert.deepEqual(needsOf(store, FILTERED, input(['innocent'], {}, { innocent: { impure: false } })), [], 'cible ignorée : aucun jet requis');
  const { result } = await cast(store, FILTERED, input(['ghoul', 'sinner', 'innocent', 'fiend'], { damageRoll: 5 }, { sinner: { impure: true }, innocent: { impure: false } }));
  assert.deepEqual(['ghoul', 'sinner', 'innocent', 'fiend'].map(id => person(store, id).hp), [15, 15, 20, 15]);
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.targetId), ['ghoul', 'sinner', 'fiend']);
});

test('effet miroir : verdict MJ vrai frappe la cible, faux l’épargne et frappe le prêtre (même jet), absent bloque', async () => {
  const store = await fixture([fighter('target')]);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], { damageRoll: 4 })).sort(), ['facts.targets.target.judgement', 'facts.targets.target.judgement']);
  const kept = await fixture([fighter('target')]);
  const { result: spared } = await cast(kept, JUDGED, input(['target'], { damageRoll: 4 }, { target: { judgement: false } }));
  assert.equal(person(kept, 'target').hp, 20);
  assert.equal(person(kept, 'priest').hp, 20 - 6, '4 + 2 DR sur le prêtre, sans BE ni PA');
  assert.deepEqual(spared.receipt.effectReceipts.map(row => [row.targetId, row.result.mirror === true]), [['priest', true]]);
  assert.match(spared.receipt.effectReceipts[0].log, /retour sur le prêtre/);
  const judged = await fixture([fighter('target')]);
  const { result } = await cast(judged, JUDGED, input(['target'], { damageRoll: 4 }, { target: { judgement: true } }));
  assert.equal(person(judged, 'target').hp, 20 - 6);
  assert.equal(person(judged, 'priest').hp, 20, 'miroir non appliqué sans fait « faux »');
  assert.deepEqual(result.receipt.effectReceipts.map(row => row.targetId), ['target']);
});

test('effet miroir : le jet du prêtre est exigé seulement quand le miroir joue ; le prêtre déjà désigné n’est pas frappé deux fois', async () => {
  const store = await fixture([fighter('target')]);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], {}, { target: { judgement: true } })), ['damageRoll']);
  assert.deepEqual(needsOf(store, JUDGED, input(['target'], { damageRoll: 4, damageRolls: { priest: 99 } }, { target: { judgement: false } })), ['damageRolls.priest']);
  const self = await fixture([fighter('target')]);
  await cast(self, JUDGED, input(['target', 'priest'], { damageRoll: 4 }, { target: { judgement: false }, priest: { judgement: true } }));
  assert.equal(person(self, 'priest').hp, 20 - 6, 'frappé une seule fois, comme cible');
});

test('Comète : sans aucun ennemi désigné Sigmar frappe le prêtre (dégâts et Enflammé), un ennemi suffit à l’en préserver', async () => {
  const none = await fixture([fighter('a'), fighter('b')]);
  assert.deepEqual(needsOf(none, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: true } })), ['facts.targets.b.foe']);
  const { result } = await cast(none, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: false }, b: { foe: false } }));
  assert.deepEqual([person(none, 'a').hp, person(none, 'b').hp, person(none, 'priest').hp], [11, 11, 11], 'zone frappée comme prévu, prêtre aussi');
  assert.deepEqual(person(none, 'priest').states.map(row => row.key), ['enflamme']);
  assert.equal(result.receipt.effectReceipts.filter(row => row.result.mirror).length, 1);
  const some = await fixture([fighter('a'), fighter('b')]);
  await cast(some, BACKFIRE, input(['a', 'b'], { damageRoll: 7 }, { a: { foe: true }, b: { foe: false } }));
  assert.equal(person(some, 'priest').hp, 20);
  assert.deepEqual(person(some, 'priest').states, []);
  assert.equal(person(some, 'a').hp, 11);
});

test('Undo et Redo restituent Blessures et États d’un effet miroir', async () => {
  const store = await fixture([fighter('a')]);
  const before = stateOf(store);
  await cast(store, BACKFIRE, input(['a'], { damageRoll: 7 }, { a: { foe: false } }));
  assert.equal(person(store, 'priest').hp, 11);
  await store.undo();
  assert.equal(person(store, 'priest').hp, 20);
  assert.deepEqual(stateOf(store).combat.participants, before.combat.participants);
  await store.redo();
  assert.equal(person(store, 'priest').hp, 11);
  assert.deepEqual(person(store, 'priest').states.map(row => row.key), ['enflamme']);
});

test('la valeur ordinaire exige la caractéristique du prêtre et le formulaire reçoit ses champs de saisie', () => {
  const effect = { type: 'ordinary-damage', dice: { count: 1, sides: 10 }, bonusFrom: 'FM' };
  const handler = effectHandlers['ordinary-damage'];
  assert.equal(handler.resolve(clone(effect), { actor: { caracs: { FM: 57 } } }).bonus, 5);
  assert.match(handler.resolve(clone(effect), { actor: { caracs: {} } }).error, /FM/);
  assert.deepEqual(handler.inputFields(effect).map(row => `${row.path}:${row.scope}`), ['damageRoll:effect', 'damageRolls:target', 'locationRolls:target', 'locationChoices:target']);
  assert.deepEqual(handler.inputFields({ ...effect, ignoreAp: true }).map(row => row.path), ['damageRoll', 'damageRolls']);
  assert.deepEqual(handler.inputFields({ type: 'ordinary-damage', fixed: 5, ignoreAp: true }), []);
  assert.deepEqual(effectHandlers['direct-damage'].factFields({ type: 'direct-damage', fixed: 1, requiresFact: { field: 'humanoid', label: 'humanoïde (fait MJ)' } }).map(row => row.field), ['humanoid']);
  assert.deepEqual(effectNeeds({ type: 'ordinary-damage', fixed: 5 }, { targets: [fighter('t')], input: {} }).map(row => row.field), ['locationRolls.t']);
});
