// Q6 · T11 (docs/specs/tests-secondaires-agregateur/spec.md, S6) : suites de la vague 2, décisions du MJ du 09/11.
// CA21 résistances des cibles en Tests subis ; CA23 Test actif d'un lanceur Inconscient raté d'office en fin de Tour ; CA24 cible
// Surprise sans Esquive du Souffle ; CA25 lanceur Aveuglé sans Test de CT du Souffle ; alignement des oppositions au fil des tours
// (la cible qui résiste est défenseur) ; CA26 Sonné déclencheur compté dans Chevaucher ; CA27 « Test d'Endurance » = Résistance ;
// CA28 source de Filet Inconsciente ; CA29 question de séquelle sans réponse en magie.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { roundSpellEffects, previewSpellInteraction, randomVortexStep } from '../../../js/core/v5-magic-turn.js';
import { previewLoreAttribute } from '../../../js/core/v5-magic-attributes.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';
import { previewResolution } from '../../../js/core/resolution.js';
import { createStore } from '../../../js/core/store.js';
import { V5_RIDE_SKILL_ID } from '../../../js/core/v5-mounted-combat.js';
import { encounter } from '../../helpers/lot3-domain-fixture.js';
import { input } from '../../helpers/lot3-wom-fixture.js';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';

const state = (key, name, level = 1) => ({ id: 'st-' + key, key, name, level });
const OUT = state('inconscient', 'Inconscient');
const person = (id, states = [], extra = {}) => ({ id, name: id === 'c' ? 'Lanceur' : 'Cible', camp: id === 'c' ? 'allie' : 'ennemi', hp: 12, maxHp: 12,
  caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40 }, skills: [], talents: [], states, extensions: { v5: {} }, ...extra });
const withLayers = (target, layers) => ({ ...target, extensions: { v5: { spellEffects: layers } } });
const roundLayer = (id, roundEffect) => ({ id, spellId: 'sp-' + id, spellName: 'Sort ' + id, casterId: 'c', castExecutionId: 'x-' + id, appliedAtRound: 1, expiresAtRound: 9, roundEffect });

describe('CA21 : résistances des cibles au fil des tours, Tests subis', () => {
  test('Test de Round d’un sort : la cible Inconsciente le fait, avec ses malus d’États', () => {
    const target = withLayers(person('t', [OUT]), [roundLayer('e1', { phase: 'endOfRound', test: { skill: 'Calme', stat: 'FM', modifierSl: 0 }, failConditions: ['Sonné'] })]);
    const out = roundSpellEffects([person('c'), target], 'endOfRound', 2, { t: { 'spell:e1:roundTest': 35 } });
    assert.deepEqual(out.requests, []);
    assert.match(out.logs.map(row => row.text).join(' | '), /Calme 1 DR, réussi/);
  });
  test('Calme contre la mort (Soleil Violet) : la cible Inconsciente le fait', () => {
    const effect = { id: 'v1', spellId: 'ash', spellName: 'Cendres et Poussière', casterId: 'c', castExecutionId: 'x', appliedAtRound: 1, expiresAtRound: 9,
      roundEffect: { vortex: { damage: 0, ignoreAp: true, sun: true } } };
    const out = randomVortexStep([person('c'), person('t', [OUT])], person('c'), effect, { inputs: { t: { SunTouched: true, Calm: 35 } }, initial: { direction: 'N', distance: 4, targets: ['t'] }, round: 2 });
    assert.equal(out.ready, true, JSON.stringify(out.requests));
    assert.ok(out.participants.find(p => p.id === 't').hp > 0);
  });
  test('Auditeur hostile (Voix de fer) : la Perception subie est faite même Inconscient', () => {
    const caster = person('c'), target = person('t', [OUT]);
    caster.extensions.v5.spellEffects = [{ id: 'iv', spellId: 'iron', spellName: 'Voix de fer', casterId: 'c', appliedAtRound: 1, specialState: { ironVoice: true } }];
    const out = previewSpellInteraction({ combat: { round: 2, participants: [caster, target] }, localRevision: 1 }, { effectId: 'iv', targetId: 't', kind: 'iron-listener', roll: 15 });
    assert.equal(out.ready, true, out.error);
  });
});

describe('CA23 : Test actif d’un lanceur Inconscient en fin de Tour', () => {
  const comet = casterStates => roundSpellEffects([person('c', casterStates), withLayers(person('t'), [
    roundLayer('g1', { phase: 'endOfRound', guidance: true }),
    roundLayer('e2', { phase: 'endOfRound', test: { skill: 'Calme', stat: 'FM', modifierSl: 0 } })])], 'endOfRound', 2, { t: { 'spell:e2:roundTest': 35 } });
  test('guidage de la Comète raté d’office, motif « Inconscient », sans jet ni question', () => {
    const out = comet([OUT]);
    assert.deepEqual(out.requests.filter(row => row.participantId === 'c'), []);
    const log = out.logs.find(row => row.detail?.autoFailed);
    assert.equal(log?.detail.autoFailed, 'Inconscient');
    assert.match(log.text, /raté d’office \(Inconscient\)/);
  });
  test('le reste de la fin de Tour se poursuit (Test de Round d’un autre sort)', () => {
    assert.match(comet([OUT]).logs.map(row => row.text).join(' | '), /Calme 1 DR, réussi/);
  });
  test('lanceur conscient : la question du guidage reste posée', () => {
    assert.ok(comet([]).requests.some(row => row.participantId === 'c' && /Comète/.test(row.label)));
  });
});

describe('Alignement : la cible qui résiste à une opposition au fil des tours est défenseur', () => {
  // Le lanceur porte « Calme adverse −1 » : la cible qui lui résiste ne le subit pas (comme un défenseur au combat, CA16).
  const trigger = (casterLayer = { 'Calme adverse': -1 }) => {
    const caster = person('c'), target = person('t');
    caster.extensions.v5.spellEffects = [{ id: 'layer', spellId: 'buff', spellName: 'Aura', casterId: 'c', testModifiers: casterLayer }];
    target.extensions.v5.spellEffects = [{ id: 'tr', spellId: 'tr', spellName: 'Emprise', casterId: 'c', appliedAtRound: 1,
      triggered: { testActor: 'caster', test: { skill: 'Calme', stat: 'FM', modifierSl: 0 }, opposedTest: { skill: 'Calme', stat: 'FM' }, conditions: ['Sonné'] } }];
    return previewSpellInteraction({ combat: { round: 2, participants: [caster, target] }, localRevision: 1 }, { effectId: 'tr', targetId: 't', kind: 'trigger', roll: 35, opponentRoll: 35 });
  };
  test('« Calme adverse » du lanceur sans effet sur la cible qui résiste', () => {
    const out = trigger();
    assert.equal(out.ready, true, out.error);
    assert.equal(out.test.opponentSl, 1, 'jet 35 sur 40 : 1 DR, sans le −1 de l’effet adverse');
  });
  test('Déplacement entravé : retenir l’objet reste un Test actif, une cible Inconsciente ne le fait pas (CA14)', () => {
    const caster = person('c'), target = person('t', [OUT]);
    caster.extensions.v5.spellEffects = [{ id: 'm1', spellId: 'mv', spellName: 'Déplacement d’objet', casterId: 'c', appliedAtRound: 1, specialState: { objectMovement: true } }];
    const out = previewSpellInteraction({ combat: { round: 2, participants: [caster, target] }, localRevision: 1 }, { effectId: 'm1', targetId: 't', kind: 'opposed-move', roll: 35, opponentRoll: 35 });
    assert.equal(out.ready, false);
    assert.match(out.error, /Inconscient/);
  });
});

const contract = name => getAllSpellContracts().find(c => c.name === name);
async function cast(name, patch = {}, { mage = {}, foe = {} } = {}) {
  const { store } = await encounter({ mage, foe });
  const base = input(name);
  return store.previewSpellExecution(contract(name).id, { ...base, ...patch, domainFacts: { ...base.domainFacts, ...(patch.domainFacts || {}) },
    targetTests: { ...base.targetTests, ...(patch.targetTests || {}) } });
}
const receipt = (preview, id = 'foe') => preview.targetResults.find(row => row.targetId === id);

describe('CA21, CA24, CA25 : contrats de sorts', () => {
  test('CA21 : la cible Inconsciente fait le Test de résistance (Goût de la Mort), au lieu de bloquer le sort', async () => {
    const p = await cast('Goût de la Mort', { targetTests: { foe: { roll: 95, despairRoll: 30 } } }, { foe: { states: ['Inconscient'] } });
    assert.equal(p.ready, true, p.error);
    assert.ok(receipt(p).resistanceTest);
  });
  test('CA21 : opposition (Perturber la magie), la cible Inconsciente résiste quand même', async () => {
    const p = await cast('Perturber la magie', { domainFacts: { opposedActorRoll: 25 }, targetTests: { foe: { opponentRoll: 40 } } }, { foe: { states: ['Inconscient'] } });
    assert.equal(p.ready, true, p.error);
    assert.ok(receipt(p).opposedTest.targetTest);
  });
  const breath = { chosenLore: 'metal', ctRoll: 25, targetTests: { foe: { distance: 5, dodgeRoll: 30 } } };
  test('CA24 : une cible Surprise ne peut pas esquiver le Souffle, qui la touche', async () => {
    const p = await cast('Souffle', breath, { foe: { states: ['Surpris'] } });
    assert.equal(p.ready, true, p.error);
    const row = receipt(p);
    assert.equal(row.breath.defended, null);
    assert.equal(row.breath.surprised, true);
    assert.notEqual(row.resisted, true);
    assert.ok(row.actions.some(action => /Surprise : aucune Esquive/.test(action.summary)));
  });
  test('CA24 : sans Surpris, l’Esquive de la cible reste faite', async () => {
    assert.ok(receipt(await cast('Souffle', breath)).breath.defended);
  });
  test('CA25 : un lanceur Aveuglé ne peut pas viser son Souffle, même contre une cible Surprise', async () => {
    const p = await cast('Souffle', breath, { mage: { states: ['Aveuglé'] }, foe: { states: ['Surpris'] } });
    assert.equal(p.ready, false);
    assert.equal(p.status, 'test-blocked');
    assert.match(p.error, /Aveuglé/);
  });
});

// ---- Monture et chutes (fixtures de q6-t4-monture-chutes.test.js) ----
const actor = (id, { mounted = false, mountId, states = [], strength = 40, toughness = 40, ride = null, skills = [] } = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'attacker' ? 'pj' : 'ennemi', zone: 'active', size: 'average', hp: 20, maxHp: 20,
  caracs: { CC: 60, CT: 40, F: strength, E: toughness, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [...(ride === null ? [] : [{ id: V5_RIDE_SKILL_ID, name: 'Chevaucher', total: ride, status: 'resolved' }]), ...skills],
  talents: [], states, equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { mounted, ...(mountId ? { mountId } : {}) } }
});
const horse = (id = 'horse') => ({ id, name: id, kind: 'Créature', zone: 'active', size: 'large', caracs: { F: 50 }, traits: [], states: [] });
const sonneLevels = rows => rows.filter(row => row.key === 'sonne').reduce((n, row) => n + Math.max(1, Number(row.level) || 1), 0);

describe('CA26 : le Sonné qui déclenche Chevaucher compte dans ce Test', () => {
  test('resolution.js : critique défensif qui étourdit le cavalier attaquant', () => {
    const rider = actor('attacker', { mounted: true, mountId: 'horse' }), defender = actor('target');
    const preview = previewResolution({ actor: rider, target: defender, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 22,
      defense: { base: 50, roll: 33, v5: { kind: 'melee' } }, criticalRolls: { location: 57, effect: 65 }, defenderCriticalRolls: { location: 4, effect: 20 },
      v5: { kind: 'melee', context: { mountedRideScore: 55, mountedRideRoll: 40 } }, v5State: { participants: [rider, defender, horse()] } });
    const stun = sonneLevels(preview.actorConditionApplication);
    assert.ok(stun >= 1, 'le critique donne Sonné');
    const plan = preview.mountedFall.find(row => row.event === 'rider-stunned');
    assert.equal(plan.test.sl, 1 - stun, 'jet 40 sur 55 : 1 DR, moins le Sonné déclencheur');
    assert.ok(plan.test.detail.some(text => /État/.test(text)), plan.test.detail.join(' | '));
  });
  const load = async participants => {
    const store = createStore({ storage: null }); await store.ready;
    await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
      combat: { round: 1, currentActorId: participants[0].id, order: participants.map(row => row.id), participants } });
    return store;
  };
  test('store.js, États acquis : Sonné posé au cavalier, −1 DR sur son Chevaucher', async () => {
    const store = await load([actor('rider', { mounted: true, mountId: 'horse' }), horse()]);
    const out = await store.acquireConditions('rider', ['Sonné'], { mountedRideScore: 55, mountedRideRoll: 40 });
    const fall = out.mountedFall.find(row => row.event === 'rider-stunned');
    assert.equal(fall.test.sl, 0, 'jet 40 sur 55 : 1 DR, −1 du Sonné déclencheur');
  });
  test('store.js, chute d’un sort : le Sonné du sort pèse sur Chevaucher', async () => {
    const { fixture, input: spellInput, contractFor } = await import('../../helpers/lot3-catalogue-fixture.js');
    const { store } = await fixture();
    const saved = JSON.parse(store.getFullJSON());
    const rider = saved.combat.participants.find(row => row.id === 'foe');
    rider.extensions.v5 = { ...(rider.extensions.v5 || {}), mounted: true, mountId: 'horse' };
    saved.combat.participants.push({ id: 'horse', name: 'Horse', kind: 'Créature', camp: 'ennemi', zone: 'active', size: 'large', caracs: { F: 50 }, traits: [], states: [], skills: [], equipment: [] });
    await store.loadFromJSON(saved);
    const preview = store.previewSpellExecution(contractFor('Choc').id, { ...spellInput('Choc', { actorId: 'mage', targetIds: ['foe'], sl: 12 }), mountedRideTests: { foe: { score: 55, roll: 40 } } });
    const fall = preview.mountedFall.find(row => row.event === 'rider-stunned');
    assert.ok(fall?.test, JSON.stringify(preview.needsInput || preview.error));
    assert.ok(fall.test.sl < 1, 'jet 40 sur 55 : 1 DR sans le Sonné ; ' + fall.test.sl);
    assert.ok(fall.test.detail.some(text => /État/.test(text)), fall.test.detail.join(' | '));
  });
});

describe('CA27 : un « Test d’Endurance » est un Test de Résistance', () => {
  test('chute après Croche-pied monté : score de la compétence Résistance, pas E', () => {
    const attacker = actor('attacker'), target = actor('rider', { mounted: true, toughness: 20, skills: [{ name: 'Résistance', total: 50 }] });
    const preview = previewResolution({ actor: attacker, target, roll: 25, action: { type: 'test', attr: 'F', base: 40 },
      defense: { base: 30, roll: 80, v5: { kind: 'test', choice: 'keep' } }, v5: { kind: 'test', context: { trip: true, tripFallEnduranceRoll: 10 } } });
    assert.equal(preview.tripFall.enduranceTest.sl, 4, 'jet 10 sur Résistance 50 : 5 − 1 = 4 DR (E 20 donnerait 1)');
    assert.equal(preview.tripFall.toughnessBonus, 2, 'le Bonus d’Endurance reste celui de E');
  });
  test('sans la compétence, la caractéristique E', () => {
    const attacker = actor('attacker'), target = actor('rider', { mounted: true, toughness: 20 });
    const preview = previewResolution({ actor: attacker, target, roll: 25, action: { type: 'test', attr: 'F', base: 40 },
      defense: { base: 30, roll: 80, v5: { kind: 'test', choice: 'keep' } }, v5: { kind: 'test', context: { trip: true, tripFallEnduranceRoll: 10 } } });
    assert.equal(preview.tripFall.enduranceTest.sl, 1);
  });
  test('Corruption de Tzeentch : la compétence Résistance de la cible', () => {
    const target = person('t', [], { skills: [{ name: 'Résistance', total: 60 }] });
    const out = previewLoreAttribute({ lore: 'tzeentch', caster: person('c'), targets: [target], spell: { duration: '3 Rounds' }, options: { attributeRolls: { t: { corruptionRoll: 55 } } } });
    assert.equal(out.targetEffects.get('t').test.success, true, '55 sur Résistance 60 (E 40 : raté)');
  });
});

describe('CA28 : une source de Filet Inconsciente lâche prise', () => {
  const escape = (holderStates, context = {}) => {
    const holder = actor('holder', { strength: 40, states: holderStates });
    const victim = actor('victim', { strength: 30, states: [{ id: 'net', key: 'enchevetre', name: 'Empêtré', level: 1, strength: 40,
      source: { kind: 'quality', entanglementKind: 'wielder', authorId: 'holder', escapeStrength: 40 } }] });
    return previewResolution({ actor: victim, roll: 95, action: { type: 'test', attr: 'F', base: 30, label: 'Force' },
      v5: { kind: 'test', context: { netEscapeConditionId: 'net', involvesMovement: false, ...context } }, v5State: { participants: [holder, victim] } });
  };
  test('échappée réussie d’office, sans d100 ni Test opposé de la source', () => {
    const preview = escape([OUT]);
    assert.equal(preview.netEscape?.freed, true, JSON.stringify(preview.unresolved));
    assert.equal(preview.netEscape.sourceLetGo, 'Inconscient');
    assert.equal(preview.netEscape.after, null);
    assert.equal(preview.unresolved.some(text => /Filet/.test(text)), false, preview.unresolved.join(' | '));
  });
  test('source consciente : Test opposé comme avant (jet 95 raté, cible retenue)', () => {
    assert.equal(escape([], { netEscapeOpponentRoll: 20 }).netEscape.freed, false);
  });
});

describe('CA29 : en magie, une question de séquelle sans réponse empêche le jet', () => {
  const HEAD = { id: 'sq-loc', type: 'loc-dr', loc: 'head', amount: -1, label: 'Tête : −1 DR' };
  const mage = person('m', [], { extensions: { v5: { sequelaEffects: { rows: [HEAD] } } } });
  for (const kind of ['casting', 'channelling', 'dispel', 'pause', 'interruption']) {
    test(kind + ' : jet refusé tant que la question n’a pas de réponse', () => {
      assert.throws(() => prepareMagicOptions(mage, kind, { roll: 25 }), error => /Séquelle/.test(error.message) && error.needsInput?.[0]?.field === 'sequelaUses:head');
      assert.doesNotThrow(() => prepareMagicOptions(mage, kind, { roll: 25, conditionContext: { 'sequelaUses:head': true } }));
    });
  }
  test('sans d100, l’aperçu rend la question (champ de réponse)', () => {
    assert.deepEqual(prepareMagicOptions(mage, 'casting', {}).sequelaNeedRows.map(row => row.field), ['sequelaUses:head']);
  });
  test('une question d’État reste sans effet bloquant en magie (règle inchangée)', () => {
    assert.doesNotThrow(() => prepareMagicOptions(person('m', [state('aterre', 'À Terre')]), 'casting', { roll: 25 }));
  });
});
