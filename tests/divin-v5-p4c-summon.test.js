import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, sweepDivineSummons } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { effectHandlers, validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';
import { DIVINE_SUMMON_ENABLED, setDivineSummonEnabled } from '../js/core/v5-divine-effects-summon.js';
import { SUMMON_BEAST_KEYS, buildBeastSummonProfile } from '../js/data/divine-summon-profiles.js';
import { effectTypes } from '../js/core/v5-divine-grammar.js';
import { applyOperation, sameSharedState } from '../js/core/sync-protocol.js';
import { normalizeRemoteDocument } from '../js/core/sync-session.js';

// P4c B1 : invocations divines (couche `summon-creature` sur le prêtre + participant ordinaire créé dans la même commande).
// Contrats synthétiques : aucun miracle livré n'invoque encore (B2).
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const MASK = idOf('Masque mortuaire');
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
let serial = 0;
function synthetic(effects, extra = {}, rounds = 6) {
  const id = `divine:miracle:morr:test-summon-${++serial}`;
  const contract = { ...clone(base), id, name: `Essai invocation ${serial}`, catalogueName: `Essai invocation ${serial}`, canonicalName: `Test summon ${serial}`, status: 'assisted',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'fixed', value: rounds, unit: 'rounds' } },
    effects: effects.map(effect => ({ appliesTo: 'caster', duration: { value: rounds, unit: 'rounds' }, ...effect })), targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [], ...extra };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const WOLF = synthetic([{ type: 'summon-creature', kind: 'creature', profile: 'wolf' }]);
const SENSOR = synthetic([{ type: 'summon-creature', kind: 'sensor', name: 'Œil de Morr', traits: ['Invisible', 'Vol (120)'] }]);
const BEAST = synthetic([{ type: 'summon-creature', kind: 'creature', choice: 'beast', requiresPosition: true }]);
const MANUAL = synthetic([{ type: 'summon-creature', kind: 'creature', profile: 'wolf' }], { status: 'manual' });
const SHORT = synthetic([{ type: 'summon-creature', kind: 'creature', profile: 'wolf' }], {}, 2);
const HOWL = synthetic([{ type: 'summon-creature', kind: 'creature', profile: 'wolf', overrides: { caracs: { CC: 45, FM: 35 }, size: 'large', traits: ['Magique', 'Frénésie'], recomputeWounds: true } }]);

const actor = (id, initiative, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: ['Vigilant'], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture({ priest = {}, ally = {}, foe = {}, round = 1, current = 'priest' } = {}) {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round, currentActorId: current, order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', 60, priest), actor('ally', 30, ally), actor('foe', 20, { camp: 'ennemi', ...foe })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return { store, engine: createCombatEngine(store) };
}
const expiry = (round = 6) => ({ phase: 'endOfTurn', round, actorId: 'priest' });
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: expiry(), ...more });
async function cast(store, contractId, more, expected = true) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, expected, preview.error);
  if (!expected) return preview;
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const wolves = store => store.listParticipants().filter(row => row.extensions?.v5?.divineSummon);
const layersOf = store => (person(store, 'priest')?.extensions?.v5?.divineEffects || []).filter(layer => layer.type === 'summon-creature');
const walk = async (store, engine, count) => { const seq = []; for (let i = 0; i < count; i++) { const r = await engine.nextTurn(); assert.equal(r?.status, 'applied', JSON.stringify(r)); const c = store.getCombat(); seq.push(`${c.round}:${c.currentActorId}`); } return seq; };
// Parcourt les Tours jusqu'à ce que le Round `round` commence ; renvoie la suite « round:acteur ».
const until = async (store, engine, round, limit = 80) => { const seq = []; for (let i = 0; i < limit && store.getCombat().round < round; i++) seq.push((await walk(store, engine, 1))[0]); return seq; };
const hasNoNull = value => { if (value === null) return false; if (Array.isArray(value)) return value.every(hasNoNull); if (value && typeof value === 'object') return Object.values(value).every(hasNoNull); return true; };

test('registre : summon-creature est dans la grammaire, a un gestionnaire et refuse un contrat mal formé', () => {
  assert.ok(effectTypes.has('summon-creature')); assert.ok(effectHandlers['summon-creature']);
  assert.equal(DIVINE_SUMMON_ENABLED, true);
  assert.match(validateEffect({ type: 'summon-creature', kind: 'creature', profile: 'wolf' }), /appliesTo/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'targets', kind: 'creature', profile: 'wolf' }), /appliesTo/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'golem', profile: 'wolf' }), /kind/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature' }), /profile ou choice/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf', choice: 'beast' }), /pas les deux/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'dragon' }), /profile doit être/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf', overrides: { size: 'huge' } }), /size/);
  assert.match(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'sensor' }), /name/);
  assert.equal(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf', duration: { value: 6, unit: 'rounds' } }), null);
  assert.equal(validateEffect({ type: 'summon-creature', casterOnly: true, kind: 'creature', choice: 'beast' }), null);
  assert.equal(validateEffect({ type: 'summon-creature', appliesTo: 'caster', kind: 'sensor', name: 'Œil' }), null);
});

test('needs : Taal exige la bête (liste fermée de six) et la position ; le choix hors liste est refusé', () => {
  const effect = { type: 'summon-creature', appliesTo: 'caster', kind: 'creature', choice: 'beast', requiresPosition: true };
  assert.deepEqual(effectNeeds(effect, { input: {} }).map(row => row.field), ['summon.beastKey', 'summon.position']);
  assert.deepEqual(effectNeeds(effect, { input: { summon: { beastKey: 'dragon', position: 'ici' } } }).map(row => row.field), ['summon.beastKey']);
  assert.deepEqual(effectNeeds(effect, { input: { summon: { beastKey: 'horse', position: '  ' } } }).map(row => row.field), ['summon.position']);
  assert.deepEqual(effectNeeds(effect, { input: { summon: { beastKey: 'horse', position: 'devant le prêtre' } } }), []);
  assert.deepEqual(SUMMON_BEAST_KEYS, ['boar', 'dog', 'giant-rat', 'giant-spider', 'horse', 'wolf']);
  assert.deepEqual(effectNeeds({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf' }, {}), []);
  const fields = effectHandlers['summon-creature'].inputFields(effect, {});
  assert.deepEqual(fields.map(row => row.path), ['summon.beastKey', 'summon.position']);
  assert.equal(fields[0].options.length, 6);
});

test('profil : le loup du bestiaire est compact, sans null ni liste vide, attaques au format de beastFormActions', () => {
  const wolf = buildBeastSummonProfile('wolf');
  assert.equal(wolf.wounds, 10); assert.equal(wolf.initiative, 35); assert.equal(wolf.caracs.M, 9); assert.equal(wolf.caracs.CT, undefined);
  assert.deepEqual(wolf.absentCaracs, ['CT', 'Dex', 'Soc']);
  assert.deepEqual(wolf.attacks.map(row => [row.id, row.value, row.damageBonus, row.free]), [['claws', 35, 3, undefined], ['bite', 35, 3, 'momentum']]);
  assert.ok(hasNoNull(wolf));
  assert.throws(() => buildBeastSummonProfile('dragon'), /hors liste/);
  assert.ok(JSON.stringify(wolf).length < 1200, `profil compact (${JSON.stringify(wolf).length} octets)`);
});

test('profil : Hurlement du loup = bestiaire + valeurs de la source (écart de CC sur Bagarre et attaques, Taille Grande, Blessures par formule)', () => {
  const profile = buildBeastSummonProfile('wolf', { caracs: { CC: 45, FM: 35 }, size: 'large', traits: ['Magique', 'Frénésie'], recomputeWounds: true });
  assert.deepEqual(profile.skills, [['Corps à corps (Bagarre)', 55], ['Perception', 45], ['Pistage', 45]]);
  assert.deepEqual(profile.attacks.map(row => row.value), [55, 55]);
  assert.equal(profile.caracs.CC, 45); assert.equal(profile.caracs.FM, 35);
  assert.deepEqual(profile.traits, ['Bestial', 'Vision nocturne', 'Craintif', 'Taille (Grande)', 'Magique', 'Frénésie']);
  assert.equal(profile.size, 'large');
  assert.equal(profile.wounds, 24); assert.match(profile.woundsFormula, /Taille Grande/);
  // La formule ne remplace le profil que si elle redonne les Blessures de la bête de base : le cheval (22 au livre, 24 par formule) les garde.
  assert.equal(buildBeastSummonProfile('horse', { recomputeWounds: true }).wounds, 22);
  assert.equal(buildBeastSummonProfile('wolf', { wounds: 12 }).wounds, 12);
});

test('création : une seule commande atomique, participant ordinaire lié à sa couche, ordre et acteur courant inchangés', async () => {
  const { store } = await fixture();
  const before = stateOf(store);
  const result = await cast(store, WOLF);
  const after = stateOf(store);
  assert.equal(after.localRevision, before.localRevision + 1, 'une seule révision');
  assert.deepEqual(after.combat.order, before.combat.order, 'combat.order inchangé');
  assert.equal(after.combat.orderMode, before.combat.orderMode);
  assert.equal(after.combat.currentActorId, 'priest');
  const [wolf, ...rest] = wolves(store);
  assert.equal(rest.length, 0);
  const [layer] = layersOf(store);
  assert.equal(wolf.id, `divine-summon:${result.receipt.executionId}:${WOLF}:0`);
  assert.match(wolf.id, /^[A-Za-z0-9:_-]+$/);
  assert.deepEqual(result.receipt.summonedIds, [wolf.id]);
  assert.deepEqual(wolf.extensions.v5.divineSummon, { executionId: result.receipt.executionId, contractId: WOLF, ownerId: 'priest', layerId: layer.id,
    kind: 'creature', profileKey: 'wolf', createdRound: 1, onEnd: 'remove' });
  assert.equal(wolf.camp, 'pj'); assert.equal(wolf.zone, 'active'); assert.equal(wolf.initiative, 35);
  assert.equal(wolf.hp, 10); assert.equal(wolf.maxHp, 10);
  assert.equal(wolf.caracs.M, 9); assert.ok(wolf.traits.includes('Bestial'));
  assert.deepEqual(wolf.actions.map(row => row.note), ['Griffes', 'Morsure — attaque gratuite en perdant l’Élan']);
  assert.equal(wolf.actions[0].damageFormula, 'BF+3'); assert.equal(wolf.actions[0].base, 35);
  assert.equal(layer.summon.profileKey, 'wolf'); assert.equal(layer.summon.kind, 'creature');
  assert.deepEqual(layer.expiry, expiry());
  assert.equal(result.receipt.effectReceipts[0].result.profileKey, 'wolf');
  assert.equal(result.receipt.effectReceipts[0].result.wounds, 10);
});

test('création : champs de l’invocation magique absents (garde-fou), isAuxiliary et casterId migrés dans extensions', async () => {
  const { store } = await fixture();
  await cast(store, WOLF);
  const [wolf] = wolves(store);
  assert.equal(wolf.extensions.v5.summonCastExecutionId, undefined);
  assert.equal(wolf.extensions.v5.summonedUntilRound, undefined);
  assert.equal(wolf.extensions.v5.summonOwnerId, undefined);
  assert.equal(wolf.extensions.v5.summonedBySpellId, undefined);
  assert.equal(wolf.extensions.isAuxiliary, true); assert.equal(wolf.extensions.casterId, 'priest');
  assert.equal(wolf.isAuxiliary, undefined);
  // La couche du prêtre ne porte aucun nombre à la racine propre à l'invocation.
  const [layer] = layersOf(store);
  assert.deepEqual(Object.keys(layer.summon).sort(), ['kind', 'profileKey']);
  // Une commande suivante (finalisation) ne retire pas la créature.
  await store.updateParticipant('ally', { hp: 19 });
  assert.equal(wolves(store).length, 1);
});

test('création : aucun null ni tableau vide significatif dans le lien, la couche et le reçu', async () => {
  const { store } = await fixture();
  const result = await cast(store, WOLF);
  const [wolf] = wolves(store), [layer] = layersOf(store);
  assert.ok(hasNoNull(wolf.extensions.v5.divineSummon)); assert.ok(hasNoNull(layer.summon));
  assert.ok(hasNoNull(result.receipt.effectReceipts)); assert.equal(result.receipt.summonedIds.length, 1);
  for (const key of ['CT', 'Dex', 'Soc']) assert.equal(key in wolf.caracs, false, `${key} absente, jamais null`);
  assert.equal(Object.values(wolf.caracs).some(value => value === null), false);
});

test('duplicate : un deuxième apply du même aperçu ne recrée rien ; la garde d’id protège le moteur', async () => {
  const { store } = await fixture();
  const preview = store.previewDivineExecution(WOLF, input());
  const first = await store.applyDivineExecution(WOLF, { preview });
  assert.equal(first.ready, true);
  const revision = stateOf(store).localRevision;
  await assert.rejects(() => store.applyDivineExecution(WOLF, { preview }));
  assert.equal(stateOf(store).localRevision, revision);
  assert.equal(wolves(store).length, 1);
});

test('moteur pur : duplicate au 2e apply, et un participant déjà présent sous le même id n’est pas recréé', async () => {
  const { applyDivineExecution, previewDivineExecution } = await import('../js/core/v5-divine-engine.js');
  const { store } = await fixture();
  const state = stateOf(store), contract = getDivineContract(WOLF);
  const engineInput = { ...input(), executionId: 'exec-pure-1', round: 1, sourceFingerprint: registry.sourceFingerprint };
  const first = applyDivineExecution(state, contract, engineInput);
  assert.equal(first.ready, true, first.error);
  const id = `divine-summon:exec-pure-1:${WOLF}:0`;
  assert.deepEqual(first.receipt.summonedIds, [id]);
  assert.equal(applyDivineExecution(first.state, contract, engineInput).status, 'duplicate');
  // Même exécution rejouée sur un état qui porte déjà ce participant : pas de doublon.
  const seeded = clone(state);
  seeded.combat.participants.push({ ...clone(first.state.combat.participants.find(row => row.id === id)), name: 'Existant' });
  const again = applyDivineExecution(seeded, contract, engineInput);
  assert.equal(again.ready, true);
  assert.equal(again.state.combat.participants.filter(row => row.id === id).length, 1);
  assert.equal(again.state.combat.participants.find(row => row.id === id).name, 'Existant');
  assert.equal(again.receipt.summonedIds, undefined);
  assert.ok(previewDivineExecution);
});

test('identifiants : seuls [A-Za-z0-9:_-] même avec une exécution aux caractères exotiques', async () => {
  const { applyDivineExecution } = await import('../js/core/v5-divine-engine.js');
  const { store } = await fixture();
  const result = applyDivineExecution(stateOf(store), getDivineContract(WOLF), { ...input(), executionId: 'prière 1/é', round: 1, sourceFingerprint: registry.sourceFingerprint });
  assert.equal(result.ready, true, result.error);
  assert.match(result.receipt.summonedIds[0], /^[A-Za-z0-9:_-]+$/);
  assert.equal(result.state.combat.participants.find(row => row.id === result.receipt.summonedIds[0]).extensions.v5.divineSummon.executionId, 'prière 1/é');
});

test('prière ratée ou contrat manuel : aucune créature', async () => {
  const { store } = await fixture();
  const failed = await cast(store, WOLF, { roll: 99 }, true).catch(() => null);
  assert.equal(wolves(store).length, 0);
  assert.equal(layersOf(store).length, 0);
  if (failed) assert.equal(failed.receipt.summonedIds, undefined);
  const other = await fixture();
  await cast(other.store, MANUAL);
  assert.equal(wolves(other.store).length, 0);
});

test('Taal : la bête choisie et la position sont figées à l’aperçu ; hors liste, l’aperçu est refusé', async () => {
  const { store } = await fixture();
  const blocked = store.previewDivineExecution(BEAST, input());
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.needsInput.map(row => row.field), ['summon.beastKey', 'summon.position']);
  assert.equal(store.previewDivineExecution(BEAST, input({ summon: { beastKey: 'dragon', position: 'ici' } })).ready, false);
  const result = await cast(store, BEAST, { summon: { beastKey: 'horse', position: 'au pied du prêtre' } });
  const [horse] = wolves(store);
  assert.equal(horse.extensions.v5.divineSummon.profileKey, 'horse');
  assert.equal(horse.maxHp, 22); assert.equal(horse.caracs.M, 8);
  assert.equal(horse.notes, 'Position : au pied du prêtre');
  assert.equal(result.receipt.effectReceipts[0].result.name, 'Cheval');
});

test('Hurlement du loup (contrat d’essai) : profil de la source sur le participant', async () => {
  const { store } = await fixture();
  await cast(store, HOWL);
  const [wolf] = wolves(store);
  assert.equal(wolf.maxHp, 24); assert.equal(wolf.caracs.CC, 45); assert.equal(wolf.caracs.FM, 35);
  assert.ok(wolf.traits.includes('Magique') && wolf.traits.includes('Frénésie') && wolf.traits.includes('Taille (Grande)'));
  assert.deepEqual(wolf.actions.map(row => row.base), [55, 55]);
  assert.deepEqual(wolf.skills.map(row => row.total), [55, 45, 45]);
});

test('capteur : participant hors ordre, au banc, sans initiative, sans action, hp et maxHp absents (comme l’Œil Invisible)', async () => {
  const { store } = await fixture();
  const before = stateOf(store);
  await cast(store, SENSOR);
  const [eye] = wolves(store);
  assert.equal(eye.name, 'Œil de Morr'); assert.equal(eye.zone, 'bench');
  assert.deepEqual(eye.traits, ['Invisible', 'Vol (120)']);
  assert.equal(eye.extensions.sensor, true);
  assert.equal(eye.extensions.v5.divineSummon.kind, 'sensor');
  assert.equal(eye.extensions.v5.divineSummon.profileKey, undefined);
  // Après assainissement du Store : initiative 0 (valeur par défaut), actions [] ; hp 0 et maxHp null, comme les Épées Sanguines indestructibles.
  assert.equal(eye.initiative, 0); assert.deepEqual(eye.actions, []);
  assert.equal(eye.hp, 0); assert.equal(eye.maxHp, null);
  assert.deepEqual(stateOf(store).combat.order, before.combat.order);
});

// ---------------------------------------------------------------- cycle de vie
const world = store => { const v = stateOf(store); return { combat: v.combat, diceLines: v.diceLines, extensions: v.extensions }; };
const wolfId = store => wolves(store)[0]?.id;
const endLines = store => stateOf(store).log.filter(entry => String(entry.id).startsWith('divine-summon-end:'));

test('rang : la créature joue exactement comme un participant ajouté à la main (même initiative, même ordre)', async () => {
  const divine = await fixture();
  await cast(divine.store, WOLF);
  const wolf = clone(wolves(divine.store)[0]), id = wolf.id;
  const control = await fixture();
  const plain = clone(wolf); delete plain.extensions.v5.divineSummon;
  await control.store.executeCommand('summon-test', draft => ({ ...draft, combat: { ...draft.combat, participants: [...draft.combat.participants, plain] } }));
  const sequence = async ({ store, engine }) => (await walk(store, engine, 12)).map(row => row.replace(id, 'W'));
  const seen = await sequence(divine);
  assert.deepEqual(seen, await sequence(control));
  assert.ok(seen.includes('1:W') && seen.includes('2:W'), `la créature agit à son rang : ${seen.join(' ')}`);
  assert.ok(seen.indexOf('1:W') < seen.indexOf('1:ally'), 'initiative 35 : après le prêtre (60), avant l’allié (30)');
});

test('expiration à la fin du Tour du prêtre : la créature, prochain acteur, est marquée puis retirée à la commande suivante (aucun Tour faux)', async () => {
  const { store, engine } = await fixture();
  await cast(store, SHORT, { expiry: expiry(2) });
  const id = wolfId(store);
  assert.deepEqual(await until(store, engine, 2), [`1:${id}`, '1:ally', '1:foe', '2:priest']);
  assert.equal(stateOf(store).extensions.v5.gameClock.combat.currentActorId, 'priest');
  const [afterPriest] = await walk(store, engine, 1);          // fin du Tour du prêtre au Round 2 : la couche expire
  assert.equal(afterPriest, `2:${id}`, 'le Round n’avance pas, personne n’est sauté');
  assert.equal(layersOf(store).length, 0);
  assert.equal(wolves(store).length, 1, 'acteur courant : retrait différé');
  assert.equal(wolves(store)[0].extensions.v5.divineSummon.endedPending, true);
  assert.equal(endLines(store).length, 0);
  assert.equal(stateOf(store).extensions.v5.gameClock.combat.currentActorId, id);
  assert.deepEqual(await walk(store, engine, 4), ['2:ally', '2:foe', '3:priest', '3:ally']);
  assert.equal(wolves(store).length, 0);
  assert.deepEqual(stateOf(store).combat.order, ['priest', 'ally', 'foe']);
  assert.equal(endLines(store).length, 1);
});

test('expiration : créature qui n’est pas le prochain acteur retirée aussitôt (order élagué, acteur courant intact)', async () => {
  const { store, engine } = await fixture({ ally: { initiative: 50 } });
  await cast(store, SHORT, { expiry: expiry(2) });
  const id = wolfId(store);
  await until(store, engine, 2);
  const [next] = await walk(store, engine, 1);
  assert.equal(next, '2:ally');
  assert.equal(wolves(store).length, 0);
  assert.deepEqual(stateOf(store).combat.order, ['priest', 'ally', 'foe']);
  assert.equal(endLines(store)[0].id, `divine-summon-end:${stateOf(store).extensions.v5.divineExecutions[0].executionId}:${id}`);
  await store.undo();
  assert.equal(wolves(store).length, 1); assert.equal(layersOf(store).length, 1);
  assert.equal(store.getCombat().currentActorId, 'priest');
});

test('expiration au changement de Round : la créature qui ouvre le Round suivant joue encore une fois puis part ; pas de V5_CLOCK_POSITION_CONFLICT', async () => {
  const { store, engine } = await fixture({ priest: { initiative: 1 } });
  await cast(store, SHORT, { expiry: expiry(2) });
  const id = wolfId(store);
  const seen = await until(store, engine, 3);       // le dernier Tour est celui du prêtre au Round 2 : la créature ouvre le Round 3
  assert.equal(seen.at(-1), `3:${id}`);
  assert.equal(seen.at(-2), '2:priest');
  assert.equal(wolves(store)[0].extensions.v5.divineSummon.endedPending, true);
  assert.deepEqual(await walk(store, engine, 2), ['3:ally', '3:foe']);
  assert.equal(wolves(store).length, 0);
  assert.equal(stateOf(store).extensions.v5.gameClock.combat.round, 3);
});

test('fin manuelle (endDivinePrayer) : créature acteur courant = couche retirée, créature marquée endedPending, retirée à la commande suivante', async () => {
  const { store, engine } = await fixture();
  const result = await cast(store, WOLF);
  const id = wolfId(store);
  await walk(store, engine, 1);
  assert.equal(store.getCombat().currentActorId, id);
  const round = store.getCombat().round, before = world(store);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(layersOf(store).length, 0);
  assert.equal(wolves(store).length, 1); assert.equal(wolves(store)[0].extensions.v5.divineSummon.endedPending, true);
  assert.equal(store.getCombat().currentActorId, id); assert.equal(store.getCombat().round, round);
  assert.equal(endLines(store).length, 0);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), before);
  assert.equal(layersOf(store).length, 1); assert.equal(wolves(store)[0].extensions.v5.divineSummon.endedPending, undefined);
  assert.equal(await store.redo(), true); assert.equal(wolves(store)[0].extensions.v5.divineSummon.endedPending, true);
  assert.deepEqual(await walk(store, engine, 2), ['1:ally', '1:foe']);
  assert.equal(wolves(store).length, 0); assert.deepEqual(stateOf(store).combat.order, ['priest', 'ally', 'foe']);
  assert.equal(endLines(store).length, 1);
});

test('fin manuelle : créature acteur courant mais absente de combat.order (setRoundTurn) : la main passe au successeur, pas à order[0]', async () => {
  const { store, engine } = await fixture();
  const result = await cast(store, WOLF);
  const id = wolfId(store);
  assert.deepEqual(stateOf(store).combat.order, ['priest', 'ally', 'foe'], 'l’ordre n’est persisté qu’au premier Tour');
  await store.setRoundTurn(1, id);
  assert.equal(store.getCombat().currentActorId, id);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(store.getCombat().currentActorId, id, 'la main ne revient pas au prêtre');
  const after = world(store);
  assert.equal(await store.undo(), true); assert.equal(layersOf(store).length, 1);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), after);
  assert.deepEqual(await walk(store, engine, 2), ['1:ally', '1:foe']);
  assert.equal(wolves(store).length, 0);
});

test('fin manuelle : créature dernière du Round et courante : le Round avance ensuite, le prêtre ne rejoue pas', async () => {
  const { store, engine } = await fixture({ ally: { initiative: 50 }, foe: { initiative: 40 } });
  const result = await cast(store, WOLF);
  const id = wolfId(store);
  assert.deepEqual(await walk(store, engine, 3), ['1:ally', '1:foe', `1:${id}`]);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  assert.equal(store.getCombat().round, 1); assert.equal(store.getCombat().currentActorId, id);
  assert.deepEqual(await walk(store, engine, 2), ['2:priest', '2:ally']);
  assert.equal(wolves(store).length, 0);
});

test('fin manuelle en ordre manuel (nextTurn de l’engine et legacy store.nextTurn) : la créature courante dernière du Round ne fait pas rejouer le prêtre', async () => {
  for (const mode of ['engine', 'legacy']) {
    const { store, engine } = await fixture();
    await store.setOrderMode('manual');
    const result = await cast(store, WOLF);
    const id = wolfId(store);
    if (mode === 'engine') await walk(store, engine, 3); else for (let i = 0; i < 3; i++) await store.nextTurn();
    assert.equal(store.getCombat().currentActorId, id, mode);
    const round = store.getCombat().round;
    await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
    assert.equal(store.getCombat().currentActorId, id, mode); assert.equal(store.getCombat().round, round, mode);
    assert.equal(wolves(store).length, 1, mode);
    if (mode === 'engine') await walk(store, engine, 1); else await store.nextTurn();
    assert.equal(wolves(store).length, 0, mode);
    assert.equal(store.getCombat().round, round + 1, mode);
    assert.equal(store.getCombat().currentActorId, 'priest', mode);
  }
});

test('fin manuelle : créature qui n’est pas l’acteur courant = retrait immédiat, acteur courant intact ; Undo/Redo', async () => {
  const { store } = await fixture();
  const result = await cast(store, WOLF);
  const before = world(store);
  assert.equal(store.getCombat().currentActorId, 'priest');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  const after = world(store);
  assert.equal(wolves(store).length, 0); assert.equal(layersOf(store).length, 0);
  assert.equal(store.getCombat().currentActorId, 'priest');
  assert.equal(endLines(store).length, 1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), before); assert.equal(wolves(store).length, 1);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), after);
});

test('Loups numérotés : deux créatures divines de même profil -> « Loup », « Loup 2 », « Loup 3 » ; identifiants inchangés', async () => {
  const { store } = await fixture();
  const names = () => wolves(store).map(row => row.name);
  await cast(store, WOLF);
  assert.deepEqual(names(), ['Loup']);
  await cast(store, SHORT, { expiry: expiry(2) });
  await cast(store, HOWL);
  assert.deepEqual(names().sort(), ['Loup', 'Loup 2', 'Loup 3']);
  assert.ok(wolves(store).every(row => row.id.startsWith('divine-summon:')));
});

test('position d’apparition : au-delà de 200 caractères, le besoin est refusé clairement', () => {
  const effect = { type: 'summon-creature', appliesTo: 'caster', kind: 'creature', choice: 'beast', requiresPosition: true };
  const needs = position => effectNeeds(effect, { input: { summon: { beastKey: 'wolf', position } } });
  assert.deepEqual(needs('a'.repeat(200)), []);
  assert.equal(needs('a'.repeat(201))[0].field, 'summon.position'); assert.match(needs('a'.repeat(201))[0].label, /trop longue/);
  assert.match(effectHandlers['summon-creature'].resolve(effect, { input: { summon: { beastKey: 'wolf', position: 'a'.repeat(201) } } }).error, /trop longue/);
});

test('Undo/Redo en chaîne (prière, Tour, fin de prière) : état identique à chaque étape', async () => {
  const { store, engine } = await fixture();
  const s0 = world(store);
  const result = await cast(store, WOLF); const s1 = world(store);
  await walk(store, engine, 1); const s2 = world(store);
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' }); const s3 = world(store);
  assert.notDeepEqual(s1, s2); assert.notDeepEqual(s2, s3);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.undo(), true); assert.deepEqual(world(store), s0);
  assert.equal(wolves(store).length, 0);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s1);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s2);
  assert.equal(await store.redo(), true); assert.deepEqual(world(store), s3);
  assert.equal(await store.redo(), false);
});

test('mort du prêtre retiré du combat : la créature part dans la même commande ; une annulation ramène les deux', async () => {
  const { store } = await fixture();
  await cast(store, WOLF);
  const before = world(store);
  await store.removeParticipant('priest');
  assert.equal(wolves(store).length, 0);
  assert.deepEqual(stateOf(store).combat.order, ['ally', 'foe']);
  assert.equal(endLines(store).length, 1);
  await store.undo();
  assert.deepEqual(world(store), before);
  assert.equal(wolves(store).length, 1);
});

test('mort du prêtre alors que la créature est l’acteur courant : retrait différé jusqu’à la fin de son Tour, jamais de Tour rejoué', async () => {
  const { store, engine } = await fixture();
  await cast(store, WOLF);
  const id = wolfId(store);
  await walk(store, engine, 1);
  await store.removeParticipant('priest');
  assert.equal(wolves(store).length, 1);
  assert.equal(store.getCombat().currentActorId, id);
  assert.deepEqual(await walk(store, engine, 2), ['1:ally', '1:foe']);
  assert.equal(wolves(store).length, 0);
});

test('export puis import JSON : créature, lien et couche conservés, l’expiration reste effective', async () => {
  const { store } = await fixture();
  await cast(store, SHORT, { expiry: expiry(2) });
  const snapshot = JSON.parse(store.getFullJSON());
  const reloaded = await fixture();
  await reloaded.store.loadFromJSON(snapshot);
  assert.deepEqual(wolves(reloaded.store).map(row => row.id), wolves(store).map(row => row.id));
  assert.deepEqual(wolves(reloaded.store)[0].extensions.v5.divineSummon, wolves(store)[0].extensions.v5.divineSummon);
  assert.equal(layersOf(reloaded.store).length, 1);
  assert.deepEqual(stateOf(reloaded.store).combat, stateOf(store).combat);
  const id = wolfId(reloaded.store);
  await until(reloaded.store, reloaded.engine, 2);
  assert.deepEqual(await walk(reloaded.store, reloaded.engine, 2), [`2:${id}`, '2:ally']);
  assert.equal(wolves(reloaded.store).length, 0);
});

test('rechargement depuis la persistance : la créature et sa couche reviennent identiques', async () => {
  const { store } = await fixture();
  await cast(store, WOLF);
  const reload = createStore({ persistence: store.persistence, storage: null }); await reload.ready;
  assert.deepEqual(stateOf(reload).combat, stateOf(store).combat);
  assert.equal(wolves(reload).length, 1);
});

test('suspension de scène : la créature part et revient avec la scène, sans être prise pour une orpheline', async () => {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const fiche = { skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
    talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Morr' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Morr' }],
    prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })) };
  await store.addProfile({ id: 'pretre', name: 'Prêtre', hp: 20, initiative: 60, caracs: { CC: 40, E: 30, F: 30, I: 40, Ag: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, extensions: { v5: { divine: { sin: 0 } } }, ...fiche });
  await store.addProfile({ id: 'garde', name: 'Garde', hp: 12, initiative: 30 });
  await store.saveEncounter({ id: 'rencontre', title: 'Cour', entries: [
    { id: 'e1', profileId: 'pretre', quantity: 1, zone: 'active' }, { id: 'e2', profileId: 'garde', quantity: 1, zone: 'active' }] });
  await store.launchEncounter('rencontre');
  const priestId = store.listParticipants().find(row => row.profileId === 'pretre').id;
  await store.setRoundTurn(1, priestId);
  const preview = store.previewDivineExecution(WOLF, { ...input(), actorId: priestId, expiry: { ...expiry(), actorId: priestId } });
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(WOLF, { preview });
  assert.equal(result.ready, true, result.error);
  await store.updateParticipant(priestId, { hp: 19 });                       // force la synchronisation scène <- combat
  const id = wolfId(store);
  assert.ok(store.getActiveScene().participants.some(row => row.id === id), 'la scène suit la créature');
  await store.suspendActiveScene();
  assert.equal(store.getActiveScene(), null);
  const [suspended] = store.listSuspendedScenes();
  assert.ok(suspended.participants.some(row => row.id === id), 'la créature part avec la scène');
  assert.equal(wolves(store).length, 0, 'plus de combat : plus de participants');
  await store.resumeScene(suspended.id);
  assert.equal(wolves(store).length, 1);
  assert.equal(wolfId(store), id);
  assert.equal(person(store, priestId).extensions.v5.divineEffects.filter(entry => entry.type === 'summon-creature').length, 1);
});

// ---------------------------------------------------------------- balayage pur
const link = more => ({ executionId: 'e1', contractId: 'c1', ownerId: 'P', layerId: 'e1:P:c1:summon-creature', kind: 'creature', profileKey: 'wolf', createdRound: 1, onEnd: 'remove', ...more });
const layer = more => ({ id: 'e1:P:c1:summon-creature', type: 'summon-creature', executionId: 'e1', ...more });
const row = (id, v5 = {}, more = {}) => ({ id, name: id, zone: 'active', camp: 'pj', extensions: { v5 }, ...more });
const roster = ({ withLayer = false } = {}) => [row('A'), row('P', withLayer ? { divineEffects: [layer()] } : {}), row('W', { divineSummon: link() })];

test('sweepDivineSummons : retire dans le combat, la scène active et les scènes suspendues quand le prêtre a perdu sa couche', () => {
  const state = { combat: { round: 2, currentActorId: 'A', order: ['A', 'W', 'P'], participants: roster() }, activeScene: { participants: roster() },
    suspendedScenes: [{ id: 's1', participants: roster() }, { id: 's2', participants: roster({ withLayer: true }) }],
    diceLines: [{ id: 'own', participantId: 'W' }, { id: 'aimed', participantId: 'A', targetId: 'W' }], log: [{ id: 'old' }] };
  const result = sweepDivineSummons(state);
  assert.equal(result, state, 'modifié en place');
  assert.deepEqual(state.combat.participants.map(r => r.id), ['A', 'P']);
  assert.deepEqual(state.combat.order, ['A', 'P']);
  assert.equal(state.combat.currentActorId, 'A');
  assert.deepEqual(state.activeScene.participants.map(r => r.id), ['A', 'P']);
  assert.deepEqual(state.suspendedScenes[0].participants.map(r => r.id), ['A', 'P']);
  assert.deepEqual(state.suspendedScenes[1].participants.map(r => r.id), ['A', 'P', 'W'], 'couche présente : conservée');
  assert.deepEqual(state.diceLines, [{ id: 'aimed', participantId: 'A', targetId: null }]);
  assert.deepEqual(state.log.map(r => r.id), ['divine-summon-end:e1:W', 'old']);
  const once = clone(state);
  sweepDivineSummons(state);
  assert.deepEqual(state, once, 'idempotent : rien de plus au second passage, aucune ligne de journal en double');
});

test('sweepDivineSummons : propriétaire absent de la liste, couche d’une autre exécution ou d’un autre type = orpheline', () => {
  for (const participants of [[row('A'), row('W', { divineSummon: link() })],
    [row('P', { divineEffects: [layer({ executionId: 'e2' })] }), row('W', { divineSummon: link() })],
    [row('P', { divineEffects: [layer({ type: 'condition' })] }), row('W', { divineSummon: link() })],
    [row('P', { divineEffects: [layer({ id: 'autre' })] }), row('W', { divineSummon: link() })]]) {
    const state = { combat: { round: 1, currentActorId: null, order: [], participants: clone(participants) } };
    sweepDivineSummons(state);
    assert.deepEqual(state.combat.participants.map(r => r.id), participants.filter(r => r.id !== 'W').map(r => r.id));
  }
});

test('sweepDivineSummons : l’acteur courant est marqué (endedPending) puis retiré à la commande suivante', () => {
  const state = { combat: { round: 2, currentActorId: 'W', order: ['A', 'W', 'B'], participants: [...roster(), row('B')] },
    activeScene: { participants: [...roster(), row('B')] }, log: [] };
  sweepDivineSummons(state);
  assert.deepEqual(state.combat.participants.map(r => r.id), ['A', 'P', 'W', 'B']);
  assert.equal(state.combat.participants.find(r => r.id === 'W').extensions.v5.divineSummon.endedPending, true);
  assert.equal(state.combat.currentActorId, 'W');
  assert.ok(state.activeScene.participants.some(r => r.id === 'W'), 'la scène garde la copie tant que le combat la garde');
  assert.deepEqual(state.log, []);
  state.combat.currentActorId = 'B';
  sweepDivineSummons(state);
  assert.deepEqual(state.combat.participants.map(r => r.id), ['A', 'P', 'B']);
  assert.deepEqual(state.combat.order, ['A', 'B']);
  assert.deepEqual(state.activeScene.participants.map(r => r.id), ['A', 'P', 'B']);
});

test('sweepDivineSummons : un état sans invocation divine reste identique (invocations magiques comprises)', () => {
  const magic = row('X', { summonCastExecutionId: 'cast1', summonOwnerId: 'P', summonedBySpellId: 's' });
  const state = { combat: { round: 3, currentActorId: 'A', order: ['A', 'X'], participants: [row('A', { divineEffects: [layer()] }), magic] }, log: [{ id: 'l' }], diceLines: [] };
  const before = clone(state);
  assert.equal(sweepDivineSummons(state), state);
  assert.deepEqual(state, before);
  assert.deepEqual(sweepDivineSummons({}), {});
});

test('sweepDivineSummons : un divineSummon d’une autre forme (sans propriétaire ni couche) n’est jamais balayé', () => {
  const state = { combat: { round: 1, currentActorId: 'A', order: ['A', 'S'], participants: [row('A'), row('S', { divineSummon: { sourceId: 'priest', executionId: 'exec-1', expiresAtRound: 5 } })] } };
  const before = clone(state);
  sweepDivineSummons(state);
  assert.deepEqual(state, before);
});

test('état sans invocation : une prière ordinaire ne crée rien, n’ajoute aucun reçu summonedIds ni ligne de fin', async () => {
  const { store, engine } = await fixture();
  const result = await cast(store, MASK, { expiry: expiry(6) });
  assert.equal(result.receipt.summonedIds, undefined);
  assert.equal(wolves(store).length, 0);
  assert.equal(store.listParticipants().length, 3);
  await walk(store, engine, 6);
  assert.equal(endLines(store).length, 0);
  assert.equal(store.listParticipants().length, 3);
});

test('interrupteur : désactivé, l’aperçu renvoie « jouer à la main », rien n’est créé et le balayage reste actif', async () => {
  const { store } = await fixture();
  const first = await cast(store, WOLF);
  assert.equal(wolves(store).length, 1);
  setDivineSummonEnabled(false);
  try {
    const refused = store.previewDivineExecution(SHORT, input({ expiry: expiry(2) }));
    assert.equal(refused.ready, false);
    assert.match(refused.error, /désactivée/); assert.match(refused.error, /à la main/);
    assert.equal(effectNeeds({ type: 'summon-creature', appliesTo: 'caster', kind: 'creature', profile: 'wolf' }, {})[0].field, 'contract.effects.summon');
    assert.deepEqual(effectHandlers['summon-creature'].createParticipants({ kind: 'sensor', name: 'Œil' }, { contract: { id: 'x' }, executionId: 'e', index: 0, actorId: 'priest', layer: { id: 'l' } }), []);
    await store.endDivinePrayer(first.receipt.executionId, { reason: 'Fin décidée par le MJ' });
    assert.equal(wolves(store).length, 0, 'le balayage ne dépend pas de l’interrupteur');
  } finally { setDivineSummonEnabled(true); }
  assert.equal(store.previewDivineExecution(SHORT, input({ expiry: expiry(2) })).ready, true);
});

// Décodeur RTDB simulé : null, objets vides et tableaux vides disparaissent ; un tableau devient une map indexée.
function rtdb(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return value;
  const out = {};
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item]) : Object.entries(value);
  for (const [key, child] of entries) { const kept = rtdb(child); if (kept !== undefined) out[key] = kept; }
  return Object.keys(out).length ? out : undefined;
}
function asArrays(value) {
  if (!value || typeof value !== 'object') return value;
  const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, asArrays(v)]));
  const keys = Object.keys(out);
  return keys.length && keys.every((k, i) => k === String(i)) ? keys.map(k => out[k]) : out;
}

test('copie RTDB sans null ni tableaux vides : la créature, son lien et la couche restent comparables et intacts', async () => {
  const { store } = await fixture();
  await cast(store, WOLF);
  const original = stateOf(store); delete original.log;
  const document = applyOperation(null, { deviceId: 'dev-a', sequence: 1, baseRevision: 0, state: original }).document;
  const decoded = normalizeRemoteDocument(asArrays(rtdb(document)));
  assert.equal(sameSharedState(decoded.state, document.state), true);
  assert.equal(sameSharedState(document.state, decoded.state), true);
  const wolf = wolves(store)[0], remote = decoded.state.combat.participants.find(r => r.id === wolf.id);
  assert.deepEqual(remote.extensions.v5.divineSummon, wolf.extensions.v5.divineSummon);
  assert.deepEqual(remote.caracs, wolf.caracs);
  assert.deepEqual(remote.skills, wolf.skills);
  assert.deepEqual(remote.actions.map(a => a.note), wolf.actions.map(a => a.note));
  const remoteLayer = decoded.state.combat.participants.find(r => r.id === 'priest').extensions.v5.divineEffects.find(entry => entry.type === 'summon-creature');
  assert.equal(remoteLayer.summon.profileKey, 'wolf');
});

test('capteur : la copie RTDB reste comparable (hp 0, maxHp null et actions [] disparaissent sans effet)', async () => {
  const { store } = await fixture();
  await cast(store, SENSOR);
  const original = stateOf(store); delete original.log;
  const document = applyOperation(null, { deviceId: 'dev-a', sequence: 1, baseRevision: 0, state: original }).document;
  const decoded = normalizeRemoteDocument(asArrays(rtdb(document)));
  assert.equal(sameSharedState(decoded.state, document.state), true);
  assert.equal(decoded.state.combat.participants.find(r => r.id === wolfId(store)).extensions.v5.divineSummon.kind, 'sensor');
});

test('poids : la créature, son lien, sa couche et le reçu restent compacts (limite d’historique de 2 Mo)', async () => {
  const { store } = await fixture();
  const result = await cast(store, HOWL);
  const [wolf] = wolves(store), size = value => JSON.stringify(value).length;
  console.log('poids', size(wolf), size(wolf.extensions.v5.divineSummon), size(layersOf(store)[0]), size(result.receipt));
  assert.ok(size(wolf) < 6000, `créature : ${size(wolf)} octets`);
  assert.ok(size(wolf.extensions.v5.divineSummon) < 300);
  assert.ok(size(layersOf(store)[0]) < 2500, `couche : ${size(layersOf(store)[0])} octets`);
  assert.ok(size(result.receipt.effectReceipts) < 600);
});
