// Q6 · T6 (docs/specs/tests-secondaires-agregateur/) : Tests sur score saisi ou lu (arquebuse à salve, Warp Blade, convalescence)
// et Déterminé passent par le calcul commun (resolveV5TestModifiers) ; CA5, CA8, CA9, CA12.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { resoluteException } from '../../../js/core/v5-talent-replacements.js';
import { createStore } from '../../../js/core/store.js';
import { previewCombatFailure } from '../../../js/core/v5-combat-fumbles.js';
import { previewSupplementalEquipment } from '../../../js/core/v5-supplemental-equipment.js';

const resolute = { id: 'talent-resolute', status: 'resolved', rank: 1 };
const calmId = () => getReferenceCatalogue().skills.find(s => s.nom === 'Calme').id;
const subject = (states = [], extra = {}) => ({ id: 's', name: 'Sujet', caracs: { FM: 40 }, talents: [resolute], skills: [{ id: calmId(), status: 'resolved', total: 45 }], states, ...extra });
const tryCalm = (who, roll, extra = {}) => resoluteException({}, who, { context: { tryResolute: true, resoluteRoll: roll, ...extra } }, 1);

describe('Déterminé : comportement avant le calcul commun (CA9, CA10)', () => {
  test('sans État : Test de Calme sur la compétence de la fiche, réussite = exception', () => {
    const out = tryCalm(subject(), 30);
    assert.deepEqual(out.unresolved, []);
    assert.equal(out.test.score, 45);
    assert.equal(out.test.sl, 1);
    assert.equal(out.exceptions.length, 1);
    assert.equal(out.exceptions[0].reason, 'conditionAcquired');
  });
  test('échec : pas d’exception', () => {
    const out = tryCalm(subject(), 80);
    assert.equal(out.test.success, false);
    assert.deepEqual(out.exceptions, []);
  });
  test('Sonné 2 et Exténué 1 : seule la plus forte pénalité compte (−2 DR)', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'sonne', name: 'Sonné', level: 2 }, { id: 'c2', key: 'extenue', name: 'Exténué', level: 1 }]), 30);
    assert.equal(out.test.details.totalModifier, -2);
    assert.equal(out.test.sl, -1);
    assert.deepEqual(out.exceptions, []);
  });
  test('pas de demande : rien n’est lancé', () => {
    const out = resoluteException({}, subject(), { context: {} }, 1);
    assert.deepEqual(out, { plans: [], unresolved: [], exceptions: [] });
  });
  test('jet manquant : non résolu', () => {
    const out = tryCalm(subject(), undefined);
    assert.ok(out.unresolved.some(row => /Déterminé/.test(row)));
  });
});

describe('Déterminé : calcul commun (F8, CA2, CA5, CA8)', () => {
  test('Clarté d’esprit : Sonné sans pénalité sur ce Test mental (Calme, FM)', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'sonne', name: 'Sonné', level: 2 }], { extensions: { v5: { specialStates: { clarityOfThought: true } } } }), 30);
    assert.equal(out.test.details.totalModifier, 0);
    assert.equal(out.exceptions.length, 1);
  });
  test('Endurance de l’anachorète : aucune pénalité d’État (CA2)', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'empoisonne', name: 'Empoisonné', level: 3 }], { extensions: { v5: { specialStates: { ignoreConditionPenalties: true } } } }), 30);
    assert.equal(out.test.details.totalModifier, 0);
  });
  test('Enchevêtré qui implique un mouvement : compté comme au combat', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'enchevetre', name: 'Enchevêtré', level: 3 }]), 30, { resoluteConditionContext: { involvesMovement: true } });
    assert.equal(out.test.details.totalModifier, -3);
  });
  test('À terre sans précision de mouvement : non résolu, question posée (CA8)', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'aterre', name: 'À terre', level: 1 }]), 30);
    assert.equal(out.test, undefined);
    assert.deepEqual(out.exceptions, []);
    assert.ok(out.unresolved.some(row => /Déterminé/.test(row) && /mouvement/.test(row)));
    assert.deepEqual(out.needsInput.map(row => row.field), ['involvesMovement']);
  });
  test('la réponse du Test principal ne vaut pas pour Calme : seule resoluteConditionContext compte', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'aterre', name: 'À terre', level: 1 }]), 30, { involvesMovement: true, resoluteConditionContext: { involvesMovement: false } });
    assert.equal(out.test.details.totalModifier, 0);
    assert.equal(out.test.success, true);
  });
  test('détail : chaque modificateur avec son montant (CA5)', () => {
    const out = tryCalm(subject([{ id: 'c1', key: 'sonne', name: 'Sonné', level: 2 }]), 30);
    assert.ok(out.detail.some(line => /Plus forte pénalité d’État −2 DR/.test(line)), out.detail.join(' | '));
  });
});

// Convalescence (CA12, CA8, CA9) : le score de fiche est lu sur la fiche, les modificateurs du testeur s'y ajoutent.
const memoryPersistence = () => { let state = null; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; } }; };
const person = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 5, maxHp: 20, caracs: { E: 30, Int: 50 }, skills: [], talents: [], states: [], extensions: { v5: {} }, ...extra });
const healerSheet = (extra = {}) => person('healer', { hp: 20, skills: [{ id: 'heal', name: 'Guérison', carac: 'Int', total: 60, advances: 10, status: 'resolved' }], ...extra });
async function aftermathStore(participants) {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants }, log: [], diceLines: [], extensions: { v5: {} } });
  return store;
}
const openWound = async store => { const r = await store.registerAftermathIncident({ operationId: 'r', participantId: 'patient', cause: 'combat' }); assert.equal(r.receipt.status, 'applied'); return store.getAftermathState().incidents[0].id; };
const dailyTest = async (store, roll, extra = {}) => { const incidentId = store.getAftermathState().incidents[0].id; return store.advanceAftermathCalendar({ operationId: 'adv-' + roll + JSON.stringify(extra), days: 1, dailyTests: [{ incidentId, day: 0, roll }], ...extra }); };

describe('Convalescence : score de fiche + modificateurs communs (CA12)', () => {
  test('sans État : même Test qu’avant, sans détail (CA9)', async () => {
    const store = await aftermathStore([person('patient')]);
    await openWound(store);
    const out = await dailyTest(store, 30);
    assert.equal(out.receipt.status, 'applied');
    const check = out.receipt.processedDailyChecks[0];
    assert.deepEqual([check.score, check.sl, check.success], [30, 2, true]);
    assert.equal('detail' in check, false);
  });
  test('patient Sonné 2 : Test de Résistance +2 DR −2 DR, détail visible (CA5)', async () => {
    const store = await aftermathStore([person('patient', { states: [{ id: 's1', key: 'sonne', name: 'Sonné', level: 2 }] })]);
    await openWound(store);
    const out = await dailyTest(store, 30);
    const check = out.receipt.processedDailyChecks[0];
    assert.equal(check.score, 30, 'le score reste celui de la fiche');
    assert.equal(check.sl, 0);
    assert.ok(check.detail.some(line => /Plus forte pénalité d’État −2 DR/.test(line)), check.detail.join(' | '));
  });
  test('patient À terre sans précision : séquelle non résolue, question rendue (CA8)', async () => {
    const store = await aftermathStore([person('patient', { states: [{ id: 's1', key: 'aterre', name: 'À terre', level: 1 }] })]);
    await openWound(store);
    const before = store.getAftermathState().revision;
    const out = await dailyTest(store, 30);
    assert.equal(out.receipt.status, 'refused');
    assert.equal(out.receipt.reason, 'condition-input-required');
    assert.deepEqual(out.receipt.needsInput.map(row => row.field), ['involvesMovement']);
    assert.equal(store.getAftermathState().revision, before, 'rien n’est enregistré');
    const answered = await dailyTest(store, 30, { conditionContext: { involvesMovement: false } });
    assert.equal(answered.receipt.status, 'applied');
    assert.equal(answered.receipt.processedDailyChecks[0].sl, 2);
  });
  test('Test après la rencontre (séquelle) d’un patient À terre : question posée aussi (CA8)', async () => {
    const { recordPostEncounterTest } = await import('../../../js/core/v5-sequelae.js');
    const { createAftermathState } = await import('../../../js/core/v5-aftermath.js');
    const state = { ...createAftermathState(), sequelae: [{ id: 'toe', participantId: 'patient', kind: 'post-encounter-test', status: 'open', difficultyDR: 0 }] };
    const tester = person('patient', { states: [{ id: 's1', key: 'aterre', name: 'À terre', level: 1 }] });
    const out = recordPostEncounterTest(state, { operationId: 'p', expectedRevision: 0, sequelaId: 'toe', enduranceScore: 30, roll: 25, tester });
    assert.equal(out.receipt.reason, 'condition-input-required');
    assert.equal(out.state.revision, 0);
    const moving = recordPostEncounterTest(state, { operationId: 'p2', expectedRevision: 0, sequelaId: 'toe', enduranceScore: 30, roll: 25, tester, conditionContext: { involvesMovement: true } });
    assert.equal(moving.receipt.status, 'applied');
    assert.ok(moving.receipt.detail.some(line => /Désavantage : À terre/.test(line)), moving.receipt.detail.join(' | '));
  });
  test('soigneur Exténué 1 : soins d’une maladie à −1 DR', async () => {
    const store = await aftermathStore([person('patient'), healerSheet({ states: [{ id: 'f', key: 'extenue', name: 'Exténué', level: 1 }] })]);
    await store.registerAftermathDisease({ operationId: 'd', participantId: 'patient', label: 'Fièvre des marais', durationDays: 6 });
    const diseaseId = store.getAftermathState().diseases[0].id;
    const care = await store.careForAftermathDisease({ operationId: 'c1', diseaseId, healerId: 'healer', roll: 20, rested: true });
    assert.equal(care.receipt.status, 'applied');
    assert.equal(care.receipt.sl, 3, '6 − 2 − 1 (Exténué)');
    assert.ok(care.receipt.detail.some(line => /−1 DR/.test(line)));
  });
});

// Arquebuse à salve (CA12, CA8, CA5) : le tireur fait le Test de Résistance (+2 DR) sur son score de fiche nu.
const shooter = (states = [], extra = {}) => ({ id: 'shooter', name: 'Tireur', hp: 12, caracs: { E: 30 }, armor: { arms: 0, body: 0 }, states, equipment: [], extensions: { v5: {} }, ...extra });
const stock = { confirmed: true, projectiles: 1, powderCharges: 1 };
const recoil = (actor, context = {}) => previewCombatFailure({ normalized: { actor, action: { type: 'attack', note: 'Arquebuse à salve' }, resolutionId: 'volley' }, context: { firing: true, crewCount: 2, recoilTestBase: 40, recoilTestRoll: 35, blackpowderStockInitial: stock, ...context } });
const recoilEffect = out => out.effects.find(row => row.type === 'volley-recoil');

describe('Arquebuse à salve : recul sur score de fiche + modificateurs communs', () => {
  test('sans État : même résultat qu’avant (CA9)', () => {
    const out = recoil(shooter());
    assert.deepEqual([recoilEffect(out).sl, recoilEffect(out).success], [3, true]);
  });
  test('tireur Empoisonné 2 : −2 DR ajoutés au score saisi, détail visible', () => {
    const effect = recoilEffect(recoil(shooter([{ id: 'p', key: 'empoisonne', name: 'Empoisonné', level: 2 }])));
    assert.equal(effect.sl, 1);
    assert.ok(effect.detail.some(line => /Plus forte pénalité d’État −2 DR/.test(line)), effect.detail.join(' | '));
    assert.ok(effect.detail.some(line => /Résistance \(\+2 DR\) \+2 DR/.test(line)));
  });
  test('tireur Enchevêtré sans précision de mouvement : recul non résolu, question posée (CA8)', () => {
    const out = recoil(shooter([{ id: 'e', key: 'enchevetre', name: 'Enchevêtré', level: 1 }]));
    assert.equal(recoilEffect(out), undefined);
    assert.ok(out.unresolved.some(row => /Arquebuse à salve, Test de Résistance : .*mouvement/.test(row)), out.unresolved.join(' | '));
    const answered = recoil(shooter([{ id: 'e', key: 'enchevetre', name: 'Enchevêtré', level: 1 }]), { involvesMovement: true, recoilTestContext: { involvesMovement: false } });
    assert.equal(recoilEffect(answered).sl, 3, 'la réponse propre au recul compte, pas celle du tir');
  });
});

// Warp Blade (CA12, CA8, CA5) : la cible fait le Test de Résistance (+2 DR) sur son score de fiche nu.
const warp = (target, test = {}) => previewSupplementalEquipment({ item: { id: 'w', name: 'Warp Blade' }, actor: { id: 'a', states: [] }, target, hit: true, melee: true, damage: { finalDamage: 2 }, context: { warpBladeEnduranceTest: { score: 40, roll: 45, ...test } } });
const victim = (states = [], extra = {}) => ({ id: 'victim', name: 'Victime', caracs: { E: 40 }, states, extensions: { v5: {} }, ...extra });

describe('Warp Blade : Test de la cible sur score de fiche + modificateurs communs', () => {
  test('sans État : même résultat qu’avant (CA9)', () => {
    const out = warp(victim());
    assert.deepEqual([out.enduranceTest.sl, out.enduranceTest.success], [2, true]);
    assert.equal(out.effects.some(row => row.state === 'Sonné'), false);
  });
  test('cible Sonnée 3 : −3 DR, échec, Sonné appliqué, détail visible', () => {
    const out = warp(victim([{ id: 's', key: 'sonne', name: 'Sonné', level: 3 }]));
    assert.equal(out.enduranceTest.sl, -1);
    assert.ok(out.effects.some(row => row.state === 'Sonné' && row.participantId === 'victim'));
    assert.ok(out.enduranceDetail.some(line => /Plus forte pénalité d’État −3 DR/.test(line)));
    assert.ok(out.reminders.some(line => /Plus forte pénalité d’État −3 DR/.test(line)), out.reminders.join(' | '));
  });
  test('cible À terre sans précision : non résolu, question posée (CA8)', () => {
    const out = warp(victim([{ id: 't', key: 'aterre', name: 'À terre', level: 1 }]));
    assert.equal(out.enduranceTest, null);
    assert.ok(out.unresolved.some(row => /Warp Blade, Test de Résistance de la cible : .*mouvement/.test(row)), out.unresolved.join(' | '));
    const answered = warp(victim([{ id: 't', key: 'aterre', name: 'À terre', level: 1 }]), { conditionContext: { involvesMovement: false } });
    assert.equal(answered.enduranceTest.sl, 2);
  });
  test('Endurance de l’anachorète de la cible : aucune pénalité d’État (CA2)', () => {
    const out = warp(victim([{ id: 's', key: 'sonne', name: 'Sonné', level: 3 }], { extensions: { v5: { specialStates: { ignoreConditionPenalties: true } } } }));
    assert.equal(out.enduranceTest.sl, 2);
  });
});
