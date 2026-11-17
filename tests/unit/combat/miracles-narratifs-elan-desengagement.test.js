// L11 des miracles narratifs (Q17 et décision « Après L2 » du MJ, spec §8) : moteurs de combat partagés.
// - En bon ordre (Up in Arms p.79 ; Fuite, LdB V5 p.163) : la Fuite d'un allié porteur ne donne ni Élan ni attaque gratuite aux engagés,
//   le Brisé reste dû ; rappel corrigé (le moteur l'applique). Le Désengagement (Test sauté par le moteur) attend l'arbitrage du MJ.
// - Froid de la gelée blanche (LdB V5 p.228) : au début de chaque Round, les présents de la zone, sauf le prêtre, perdent leur Élan.
// - Vindicte vengeresse (Up in Arms p.79) : chaque Test de Mêlée du prêtre peut être relancé gratuitement ; jamais un tir ni un autre Test.
// - Épée de justice (LdB V5 p.229) : l'épée désignée ignore les PA ; Inconscient (Test d'Endurance +2 DR raté) au moins BSoc Rounds.
// - Morsure de l'hiver (LdB V5 p.228) : la cible touchée par la hache désignée perd ses États Hémorragique.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { recoverV5Condition } from '../../../js/core/v5-effects.js';
import { expireDivineEffects } from '../../../js/core/v5-divine-engine.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const ORDER = 'divine:miracle:en-bon-ordre', CHILL = 'divine:miracle:ulric:hoarfrost-s-chill', WRATH = 'divine:miracle:vindicte-vengeresse';
const SWORD = 'divine:miracle:verena:sword-of-justice', BITE = 'divine:miracle:ulric:winter-s-bite';
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;

const swordAction = { id: 'sword-attack', note: 'Épée', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'sword' } } };
const daggerAction = { id: 'dagger-attack', note: 'Dague', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'dagger' } } };
const axeAction = { id: 'axe-attack', note: 'Hache', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'axe' } } };
const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  actions: [swordAction, daggerAction, axeAction], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const enemy = (id, extra = {}) => actor(id, 'Ulric', { kind: 'PNJ', camp: 'ennemi', talents: [], prayers: [], ...extra });

async function open(cult, { momentum = false, foe = {} } = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const elan = row => (momentum ? { ...row, extensions: { v5: { ...row.extensions.v5, hasMomentum: true } } } : row);
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe', 'other'],
    participants: [elan(actor('priest', cult)), elan(actor('ally', cult, { initiative: 40 })), elan(enemy('foe', { initiative: 30, ...foe })), elan(enemy('other', { initiative: 20 }))] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const layers = (store, id) => who(store, id).extensions?.v5?.divineEffects || [];
const momentum = (store, id) => who(store, id).extensions?.v5?.hasMomentum === true;
const keys = (store, id) => (who(store, id).states || []).map(row => row.key);
async function cast(store, contractId, more = {}) {
  const preview = store.previewDivineExecution(contractId, { actorId: 'priest', targetIds: [], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const toRound = async (engine, store, round) => { while (full(store).combat.round < round) assert.equal((await engine.nextTurn()).status, 'applied'); };
// Attaque de CC 40 ; la défense (82) échoue. `roll` 88 rate, 24 touche ; 47 contre une défense de 10 perd l’opposition.
const attack = (store, action, { id = 'a', roll = 24, defenseRoll = 82, reroll, kind = 'melee' } = {}) => store.previewResolution({ resolutionId: id, actorId: 'priest', targetId: 'foe', roll,
  action: clone(action), defense: { base: 30, roll: defenseRoll, v5: { kind: 'melee' } }, v5: { kind, ...(reroll ? { fortuneReroll: true, fortuneRerollRoll: reroll } : {}) } });
const paidFortune = preview => (preview.actionCosts?.paid || []).some(cost => cost.resource === 'fortune');

describe('L11 — En bon ordre : Fuite engagée et rappel', () => {
  test('flee-exemption et broken-from-fleeing sont tenues par le moteur', () => {
    assert.equal(modeOf(ORDER, 'flee-exemption'), 'engine');
    assert.equal(modeOf(ORDER, 'broken-from-fleeing'), 'engine');
  });

  test('Fuite d’un allié En bon ordre : aucun Élan ni attaque gratuite pour les engagés, Brisé toujours dû ; un ↶', async () => {
    const { store } = await open('Myrmidia');
    await cast(store, ORDER, { targetIds: ['ally'], expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
    await store.engageParticipants('ally', 'foe');
    await store.engageParticipants('ally', 'other');
    await store.applyFlee('ally');
    assert.equal(momentum(store, 'foe'), false, 'pas d’Élan pour l’engagé');
    assert.equal(momentum(store, 'other'), false, 'pas d’Élan pour l’engagé');
    assert.equal(who(store, 'ally').states.find(row => row.key === 'brise').level, 2, 'un Brisé par ennemi engagé');
    assert.match(full(store).log[0].text, /En Bon Ordre : pas d’Élan ni d’attaque gratuite/);
    await store.undo();
    assert.deepEqual(keys(store, 'ally'), []);
  });

  test('sans la prière : la même Fuite donne l’Élan aux engagés (comportement inchangé)', async () => {
    const { store } = await open('Myrmidia');
    await store.engageParticipants('ally', 'foe');
    await store.applyFlee('ally');
    assert.equal(momentum(store, 'foe'), true);
    assert.equal(who(store, 'ally').states.find(row => row.key === 'brise').level, 1);
  });

  test('le rappel du porteur dit ce que fait le moteur, plus « à appliquer par le MJ »', async () => {
    const { store } = await open('Myrmidia');
    await cast(store, ORDER, { targetIds: ['ally'], expiry: { phase: 'endOfTurn', round: 5, actorId: 'priest' }, facts: { targets: { ally: { withinRange: true } } } });
    const text = JSON.stringify(store.getParticipantReminders('ally'));
    assert.match(text, /En Bon Ordre/);
    assert.match(text, /Fuite/);
    assert.match(text, /Brisé/);
    assert.doesNotMatch(text, /à appliquer par le MJ/);
  });
});

describe('L11 — Froid de la gelée blanche : perte d’Élan au début de chaque Round', () => {
  const chillTargets = { targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } } };
  test('contrat : zone du prêtre qui fait perdre l’Élan, clause momentum-loss tenue par le moteur', () => {
    const zone = getDivineContract(CHILL).effects.find(effect => effect.type === 'divine-zone');
    assert.ok(zone, 'effet de zone');
    assert.equal(zone.momentumLoss, true);
    assert.deepEqual(zone.radius, { characteristic: 'Soc' }, 'Sociabilité mètres, Caractéristique entière (p.228)');
    assert.equal(modeOf(CHILL, 'momentum-loss'), 'engine');
    assert.equal(validateEffect({ ...zone, momentumLoss: 'oui' }) !== null, true, 'drapeau non booléen refusé');
  });

  test('présents avec Élan : le perdent au début du Round ; prêtre et absents le gardent ; journal ; un ↶', async () => {
    const { store, engine } = await open('Ulric', { momentum: true });
    await cast(store, CHILL, chillTargets);
    const zone = layers(store, 'priest').find(layer => layer.type === 'divine-zone');
    assert.equal(zone.zone.radius, 60, 'Sociabilité 60 : 60 m');
    await store.setDivineZoneMembers('priest', zone.id, ['priest', 'ally', 'foe']);
    await toRound(engine, store, 2);
    assert.equal(momentum(store, 'ally'), false);
    assert.equal(momentum(store, 'foe'), false);
    assert.equal(momentum(store, 'priest'), true, 'le prêtre est excepté');
    assert.equal(momentum(store, 'other'), true, 'hors de la zone');
    assert.ok(full(store).log.some(row => /Froid de la gelée blanche/.test(row.text) && /perd l’Élan/.test(row.text)), JSON.stringify(full(store).log.slice(0, 5)));
    await store.undo();
    assert.equal(full(store).combat.round, 1);
    assert.equal(momentum(store, 'ally'), true);
    assert.equal(momentum(store, 'foe'), true);
  });

  test('sans couche, ou zone sans présent : le Round suivant ne touche à aucun Élan', async () => {
    const plain = await open('Ulric', { momentum: true });
    await toRound(plain.engine, plain.store, 2);
    for (const id of ['priest', 'ally', 'foe', 'other']) assert.equal(momentum(plain.store, id), true, id);
    const empty = await open('Ulric', { momentum: true });
    await cast(empty.store, CHILL, chillTargets);
    await toRound(empty.engine, empty.store, 2);
    for (const id of ['priest', 'ally', 'foe', 'other']) assert.equal(momentum(empty.store, id), true, id);
  });
});

describe('L11 — Vindicte vengeresse : relance des Tests de Mêlée', () => {
  test('contrat assisté : relance gratuite de chaque Test de Mêlée, clause melee-reroll tenue par le moteur', () => {
    const contract = getDivineContract(WRATH);
    assert.equal(contract.status, 'assisted');
    assert.deepEqual(contract.effects.map(effect => [effect.type, effect.meleeOnly, effect.everyTest]), [['free-reroll', true, true]]);
    assert.equal(modeOf(WRATH, 'melee-reroll'), 'engine');
    assert.equal(modeOf(WRATH, 'charge-and-attack'), 'manual');
    assert.notEqual(validateEffect({ type: 'free-reroll', meleeOnly: 'oui' }), null);
  });

  test('chaque attaque de mêlée relancée gratuitement, plusieurs fois par Round ; tir et autre Test payants ; un ↶', async () => {
    const { store } = await open('Myrmidia');
    await store.setFortune('priest', 3);
    await cast(store, WRATH, { targetIds: ['priest'], facts: { targets: { priest: { withinRange: true } } } });
    const first = attack(store, swordAction, { roll: 88, reroll: 24 });
    assert.equal(first.fortuneReroll?.free, true, 'première relance gratuite');
    assert.equal(paidFortune(first), false);
    assert.equal((await store.applyResolution(first)).status, 'applied');
    const second = attack(store, swordAction, { id: 'b', roll: 88, reroll: 24 });
    assert.equal(second.fortuneReroll?.free, true, 'deuxième Test de Mêlée du même Round : gratuit aussi');
    assert.equal((await store.applyResolution(second)).status, 'applied');
    assert.equal(store.getFortune('priest').balance, 3, 'aucun Point de Chance dépensé');
    const shot = attack(store, { id: 'bow', note: 'Arc', type: 'attack', attr: 'CT', base: 40, damage: 3 }, { id: 'c', roll: 88, reroll: 24, kind: 'ranged' });
    assert.equal(shot.fortuneReroll?.free, undefined, 'tir : relance payante');
    assert.ok(paidFortune(shot));
    const calm = store.previewResolution({ actorId: 'priest', action: { name: 'Calme', type: 'test', attr: 'FM', base: 50 }, roll: '88', v5: { kind: 'test', fortuneReroll: true, fortuneRerollRoll: 12 } });
    assert.equal(calm.fortuneReroll?.free, undefined, 'Test hors Mêlée : relance payante');
    await store.undo(); await store.undo();
    assert.equal(store.getFortune('priest').balance, 3);
  });

  test('sans la prière : la relance d’une attaque de mêlée reste payante (comportement inchangé)', async () => {
    const { store } = await open('Myrmidia');
    await store.setFortune('priest', 3);
    const plain = attack(store, swordAction, { roll: 88, reroll: 24 });
    assert.equal(plain.fortuneReroll?.free, undefined);
    assert.ok(paidFortune(plain));
  });
});

describe('L11 — Épée de justice : PA ignorés, Inconscient au moins BSoc Rounds', () => {
  const armour = { armor: { head: 2, body: 2, arms: 2, legs: 2 } };
  test('contrat : ignore-ap et unconscious-duration tenues par le moteur ; le Test d’Endurance reste saisi par le MJ', () => {
    const contract = getDivineContract(SWORD);
    assert.equal(contract.effects.find(effect => effect.type === 'weapon-bonus').ignoreArmour, true);
    const imposed = contract.effects.find(effect => effect.type === 'imposed-test');
    assert.deepEqual([imposed.test, imposed.subjects, imposed.when], [{ skill: 'resistance', slModifier: 2 }, 'enemies', 'manual']);
    assert.equal(modeOf(SWORD, 'ignore-ap'), 'engine');
    assert.equal(modeOf(SWORD, 'unconscious-duration'), 'engine');
    assert.equal(modeOf(SWORD, 'endurance-test'), 'assisted');
    assert.equal(modeOf(SWORD, 'sin'), 'manual');
  });

  test('l’épée désignée ignore les PA ; une autre arme et l’épée sans prière les subissent', async () => {
    const { store } = await open('Verena', { foe: armour });
    assert.equal(attack(store, swordAction).damage.paEffectif, 2, 'sans prière : PA comptés');
    await cast(store, SWORD, { facts: { weapon: { equipmentId: 'sword', classConfirmed: true } } });
    const hit = attack(store, swordAction);
    assert.equal(hit.damage.paEffectif, 0);
    assert.equal(hit.damage.finalDamage, attack(store, daggerAction).damage.finalDamage + 2);
    assert.ok(hit.damage.armourIgnored, 'PA ignorés signalés au détail des Dégâts');
    assert.equal(attack(store, daggerAction).damage.paEffectif, 2, 'autre arme : PA comptés');
  });

  test('Test d’Endurance raté : Inconscient verrouillé BSoc Rounds, puis récupérable ; réussite : rien ; allié refusé ; un ↶', async () => {
    const { store } = await open('Verena');
    await cast(store, SWORD, { facts: { weapon: { equipmentId: 'sword', classConfirmed: true } } });
    const layer = layers(store, 'priest').find(row => row.imposedTest);
    assert.ok(layer, 'bouton de Test imposé sur le prêtre');
    assert.equal((await store.resolveDivineImposedTest('ally', layer.id, { success: false, sl: -1 })).ok, false, 'un allié n’est pas un adversaire');
    assert.equal((await store.resolveDivineImposedTest('other', layer.id, { success: true, sl: 1 })).ok, true);
    assert.deepEqual(keys(store, 'other'), []);
    assert.equal((await store.resolveDivineImposedTest('foe', layer.id, { success: false, sl: -1 })).ok, true);
    const foe = who(store, 'foe');
    assert.deepEqual(keys(store, 'foe'), ['inconscient']);
    const lock = foe.extensions.v5.divineEffects.find(row => row.lockedStateIds);
    assert.deepEqual(lock.expiry, { phase: 'endOfRound', round: 6, moment: 'afterEffects' }, 'Bonus de Sociabilité du prêtre (6) Rounds');
    assert.equal(recoverV5Condition(foe, 'inconscient', { method: 'divine-removal' }).removed.length, 0, 'verrouillé');
    assert.match(JSON.stringify(store.getParticipantReminders('foe')), /Inconscient/);
    const after = expireDivineEffects(foe, { phase: 'endOfRound', round: 6, moment: 'afterEffects' }).participant;
    assert.deepEqual(after.states.map(row => row.key), ['inconscient'], 'au moins : l’État reste');
    assert.equal(recoverV5Condition(after, 'inconscient', { method: 'divine-removal' }).removed.length, 1, 'verrou levé');
    await store.undo();
    assert.deepEqual(keys(store, 'foe'), []);
  });
});

describe('L11 — Morsure de l’hiver : Hémorragique retiré au coup', () => {
  const bleeding = { states: [{ id: 'bleed-1', key: 'hemorragique', name: 'Hémorragique', level: 2 }] };
  test('contrat : remove-bleeding tenue par le moteur, no-bleeding reste un rappel', () => {
    assert.deepEqual(getDivineContract(BITE).effects.find(effect => effect.type === 'weapon-bonus').hitRemoveConditions, ['Hémorragique']);
    assert.equal(modeOf(BITE, 'remove-bleeding'), 'engine');
    assert.equal(modeOf(BITE, 'no-bleeding'), 'manual');
  });

  test('la hache désignée qui touche retire les Hémorragique ; une autre arme, un échec ou l’absence de prière non ; un ↶', async () => {
    const plain = await open('Ulric', { foe: bleeding });
    assert.equal((await plain.store.applyResolution(attack(plain.store, axeAction))).status, 'applied');
    assert.ok(keys(plain.store, 'foe').includes('hemorragique'), 'sans prière : inchangé');
    const blessed = async () => { const { store } = await open('Ulric', { foe: bleeding }); await cast(store, BITE, { facts: { weapon: { equipmentId: 'axe' } } }); return store; };
    const missed = await blessed();
    assert.equal((await missed.applyResolution(attack(missed, axeAction, { roll: 47, defenseRoll: 10 }))).status, 'applied');
    assert.ok(keys(missed, 'foe').includes('hemorragique'), 'attaque ratée : inchangé');
    const other = await blessed();
    assert.equal((await other.applyResolution(attack(other, daggerAction))).status, 'applied');
    assert.ok(keys(other, 'foe').includes('hemorragique'), 'autre arme : inchangé');
    const store = await blessed();
    assert.equal((await store.applyResolution(attack(store, axeAction))).status, 'applied');
    assert.ok(!keys(store, 'foe').includes('hemorragique'), 'hache qui touche : Hémorragique retiré');
    assert.ok(keys(store, 'foe').includes('extenue'), 'Exténué toujours infligé');
    await store.undo();
    assert.ok(keys(store, 'foe').includes('hemorragique'));
  });
});
