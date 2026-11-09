import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { encounter, inputFor } from '../../helpers/lot3-domain-fixture.js';
import { input as womInput } from '../../helpers/lot3-wom-fixture.js';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import { previewSpellInteraction } from '../../../js/core/v5-magic-turn.js';

const memoryPersistence = () => { let state; return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: value }) { state = structuredClone(value); return { ok: true }; } }; };
const fighter = (id, camp) => ({ id, name: id, kind: camp === 'pj' ? 'PJ' : 'PNJ', camp, zone: 'active', hp: 10, maxHp: 10,
  caracs: { CC: 40, Ag: 40 }, skills: [], talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }], states: [], extensions: { v5: {} } });

test('préparation : statut lisible pour un cavalier pas encore entré dans la scène active', async () => {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.startTalentSession();
  assert.equal(store.getObstinateStatus('rider', fighter('rider', 'pj')).available, true);
});

test('Obstiné : application atomique du désengagement, annulation et nouvelle séance', async () => {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: null, order: [], participants: [fighter('a', 'pj'), fighter('b', 'ennemi')] }, log: [], diceLines: [], extensions: { v5: {} } });
  await store.startTalentSession();
  await store.engageParticipants('a', 'b');
  const input = { actorRoll: 30, opponentRoll: 30, context: { preRollTalent: 'strong-minded' } };
  assert.equal(store.getObstinateStatus('a').available, true);
  assert.equal(store.previewDisengage('a', input).status, 'ready');
  assert.equal(store.getObstinateStatus('a').available, true, 'un aperçu ne consomme rien');
  await store.applyDisengage('a', input);
  assert.equal(store.getObstinateStatus('a').available, false);
  await store.undo();
  assert.equal(store.getObstinateStatus('a').available, true, 'annuler rend le quota');
  await store.redo();
  assert.equal(store.getObstinateStatus('a').available, false);
  await store.startTalentSession();
  assert.equal(store.getObstinateStatus('a').available, true);
});

test('Un lancer de sort consomme le quota partagé', async () => {
  const { store } = await encounter({ mage: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  const contract = getAllSpellContracts().find(row => row.name === 'Carreau');
  const input = inputFor(contract, { sl: undefined, roll: 25, conditionContext: { preRollTalent: 'strong-minded' } });
  const preview = store.previewSpellExecution(contract.id, input);
  assert.equal(preview.ready, true, preview.error);
  await store.applySpellExecution(contract.id, input);
  assert.equal(store.getObstinateStatus('mage').available, false);
  await store.undo();
  assert.equal(store.getObstinateStatus('mage').available, true);
});

test('La relance d’un tir représente un seul Test pour le quota', () => {
  const caster = fighter('a', 'pj');
  const target = fighter('b', 'ennemi');
  target.caracs.CT = 50;
  target.actions = [{ id: 'bow', type: 'attack', attr: 'CT', base: 50, label: 'Tir' }];
  target.extensions.v5.spellEffects = [{ id: 'fx', casterId: 'a', spellName: 'Sort', specialState: { missileMissReroll: true } }];
  const preview = previewSpellInteraction({ localRevision: 1, combat: { round: 1, participants: [caster, target] } },
    { effectId: 'fx', targetId: 'b', kind: 'missile-reroll', actionId: 'bow', missileDeclared: true, missConfirmed: true, originalRoll: 80, roll: 30, testContexts: { b: { preRollTalent: 'strong-minded' } } });
  assert.equal(preview.ready, true, preview.error);
  assert.deepEqual(preview.performedTests, [{ participantId: 'b', preRollTalent: 'strong-minded' }]);
});

test('Une cible qui esquive le Souffle consomme son quota', async () => {
  const { store } = await encounter({ foe: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  const contract = getAllSpellContracts().find(row => row.name === 'Souffle');
  const input = inputFor(contract, { chosenLore: 'metal', ctRoll: 25, targetTests: { foe: { distance: 5, dodgeRoll: 20, conditionContext: { preRollTalent: 'strong-minded' } } } });
  const preview = store.previewSpellExecution(contract.id, input);
  assert.equal(preview.ready, true, preview.error);
  await store.applySpellExecution(contract.id, input);
  assert.equal(store.getObstinateStatus('foe').available, false);
});

test('Souffle : choix indépendants pour le lancer et le Test de CT', async () => {
  for (const chosen of ['cast', 'shot']) {
    const { store } = await encounter({ mage: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
    await store.startTalentSession();
    const contract = getAllSpellContracts().find(row => row.name === 'Souffle');
    const input = inputFor(contract, { sl: undefined, roll: 25, chosenLore: 'metal', ctRoll: 25,
      conditionContext: chosen === 'cast' ? { preRollTalent: 'strong-minded' } : {},
      testTalents: chosen === 'shot' ? { 'breath:shot': 'strong-minded' } : {},
      targetTests: { foe: { distance: 5, dodgeRoll: 50 } } });
    const preview = store.previewSpellExecution(contract.id, input);
    assert.equal(preview.ready, true, preview.error);
    assert.equal(preview.performedTests.find(row => row.testKey === 'breath:shot').preRollTalent, chosen === 'shot' ? 'strong-minded' : undefined);
    await store.applySpellExecution(contract.id, input);
    assert.equal(store.getObstinateStatus('mage').available, false, chosen);
  }
});

test('Attribut de Tzeentch : le Test de Corruption utilise le quota de la cible', async () => {
  const { store } = await encounter({ foe: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  const contract = getAllSpellContracts().find(row => row.name === 'Transformation de Tzeentch');
  const input = womInput('Transformation de Tzeentch');
  input.attributeActive = true;
  input.targetTests.foe.corruptionRoll = 40;
  input.targetTests.foe.corruptionContext = { preRollTalent: 'strong-minded' };
  const preview = store.previewSpellExecution(contract.id, input);
  assert.equal(preview.ready, true, preview.error);
  await store.applySpellExecution(contract.id, input);
  assert.equal(store.getObstinateStatus('foe').available, false);
});

test('Arcanes impitoyables : la Focalisation consomme le quota et Annuler le rend', async () => {
  const { store } = await encounter({ mage: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }],
    skills: [{ name: 'Langue (Magick)', total: 90 }, { name: 'Focalisation (Haute Magie)', total: 90 }],
    extensions: { v5: { channelling: { type: 'high', sl: 6 } } } } });
  await store.startTalentSession();
  const contract = getAllSpellContracts().find(row => row.name === 'Destruction des Arcanes');
  const input = inputFor(contract, { attributeActive: false, arcaneTargets: { foe: { magicItemPresent: true, focalisationRoll: 25,
    randomMagicItem: 'Anneau', armorDamageLocations: [], focalisationConditionContext: { preRollTalent: 'strong-minded' } } } });
  const preview = store.previewSpellExecution(contract.id, input);
  assert.equal(preview.ready, true, preview.error);
  assert.ok(preview.performedTests.some(row => row.testKey === 'arcane:focalisation:foe' && row.preRollTalent === 'strong-minded'));
  assert.equal((await store.applySpellExecution(contract.id, input)).success, true);
  assert.equal(store.getObstinateStatus('mage').available, false);
  await store.undo();
  assert.equal(store.getObstinateStatus('mage').available, true);
});

test('Obstiné consommé par le Test de seuil de Corruption, puis refusé au désengagement', async () => {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  const hero = fighter('a', 'pj');
  hero.caracs.E = 40; hero.caracs.FM = 40;
  hero.extensions.v5 = { corruptionPoints: 9, pendingCorruptionTest: { id: 'p', status: 'pending' } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: null, order: [], participants: [hero, fighter('b', 'ennemi')] }, log: [], diceLines: [], extensions: { v5: {} } });
  await store.startTalentSession();
  const preview = store.previewCorruptionThresholdTest('a', { roll: 20, manualScore: 40, manualScoreReason: 'score MJ', conditionContext: { preRollTalent: 'strong-minded' } });
  assert.equal(preview.status, 'ready');
  assert.equal((await store.applyCorruptionThresholdTest('a', preview)).status, 'applied');
  assert.equal(store.getObstinateStatus('a').available, false);
  await store.engageParticipants('a', 'b');
  await assert.rejects(() => Promise.resolve(store.applyDisengage('a', { actorRoll: 20, opponentRoll: 30, context: { preRollTalent: 'strong-minded' } })), /déjà utilisé/);
});

test('Convalescence : deux Tests du même patient ne peuvent consommer deux fois le talent', async () => {
  const store = createStore({ storage: null, persistence: memoryPersistence() });
  await store.ready;
  const hero = { ...fighter('a', 'pj'), hp: 5, maxHp: 10 };
  hero.caracs.E = 40;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: [], participants: [hero] }, log: [], diceLines: [], extensions: { v5: {} } });
  await store.startTalentSession();
  await store.registerAftermathIncident({ operationId: 'r', participantId: 'a', cause: 'combat' });
  const incidentId = store.getAftermathState().incidents[0].id;
  await assert.rejects(() => store.advanceAftermathCalendar({ operationId: 'adv', days: 2, dailyTests: [{ incidentId, day: 0, roll: 10 }, { incidentId, day: 1, roll: 10 }], conditionContext: { obstinateTesterIds: ['a'] } }), /déjà utilisé/);
  assert.equal(store.getObstinateStatus('a').available, true, 'refus atomique, aucun usage perdu');
});

test('Warp Blade : le Test secondaire de la cible consomme le quota', async () => {
  const { store } = await encounter({ foe: { talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] } });
  await store.startTalentSession();
  const actor = store.listParticipants().find(row => row.id === 'mage');
  const target = store.listParticipants().find(row => row.id === 'foe');
  const preview = store.previewResolution({ actor, target, action: { type: 'attack', name: 'Warp Blade', base: 80, damage: 10, qualities: [] },
    defense: { base: 40, roll: 90, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', context: { warpBladeEnduranceTest: { score: 40, roll: 61, conditionContext: { preRollTalent: 'strong-minded' } } } }, roll: 31, round: 1, resolutionId: 'warp-ca35' });
  assert.ok(preview.supplementalEquipment?.enduranceTest, JSON.stringify(preview.unresolved));
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied', JSON.stringify(applied));
  assert.equal(store.getObstinateStatus('foe').available, false);
  await store.undo();
  assert.equal(store.getObstinateStatus('foe').available, true);
  const cancelled = store.previewResolution({ actor, target, action: { type: 'attack', name: 'Warp Blade', base: 80, damage: 10, qualities: [] },
    defense: { base: 40, roll: 90, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', context: { fateAction: 'cancel-attack', warpBladeEnduranceTest: { score: 40, roll: 61, conditionContext: { preRollTalent: 'strong-minded' } } } }, roll: 31, round: 1, resolutionId: 'warp-cancelled' });
  assert.equal(cancelled.hit, false);
  assert.equal((cancelled.secondaryObstinateTests || []).some(row => row.participantId === 'foe' && row.preRollTalent === 'strong-minded'), false, 'l’attaque annulée ne fait pas subir le Test');
});
