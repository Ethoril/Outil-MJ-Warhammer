import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { ficheSnapshot } from '../js/core/fiche-sync.js';
import { previewDivineExecution, applyDivineExecution } from '../js/core/v5-divine-engine.js';
import { endStoreDivinePrayer, getDivineContract, previewStoreDivine, validateDivineSources } from '../js/core/v5-divine-store.js';
import { getReferenceCatalogue, refreshReferences } from '../js/core/reference-catalog.js';

const contract = id => getDivineContract(id);
const battleId = 'divine:blessing:myrmidia:battle';
const shieldId = 'divine:miracle:bouclier-de-myrmidia';
const sunId = 'divine:miracle:soleil-flamboyant';
const fingerprint = registry.sourceFingerprint;

test('fiche réelle issue de ficheSnapshot établit Pray, Invocation, miracle appris et durée de Bouclier', () => {
  const shield = contract(shieldId);
  const snapshot = ficheSnapshot('priest-real-shape', { nom: 'Prêtre', race: 'humain', carac: { soc: { base: 80 } },
    skillsAdvanced: [{ nom: 'Prière', adv: 0 }], talentsAcq: [{ nom: 'Invocation (Myrmidia)' }],
    prieres: [{ nom: shield.catalogueName }] });
  const priest = { ...snapshot, id: 'priest-real-shape', zone: 'active', extensions: { v5: { divine: { sin: 0 } } } };
  const preview = previewDivineExecution(priest, shield, [priest], { canSpeak: true, roll: 23, sourceFingerprint: fingerprint,
    round: 1, expiry: { phase: 'endOfRound', round: 8 }, facts: { targets: { [priest.id]: { withinRange: true, ally: true } } } });
  assert.equal(preview.ready, true, preview.error);
  assert.equal(preview.preview.resolvedParams.duration.value, 8);
});

test('les jets hors d100 et les extensions au-delà des DR sont rejetés; le Péché V5 n’a pas de maximum', () => {
  const actor = { id: 'priest', skills: [{ name: 'Prière', status: 'resolved', total: 50 }],
    talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    caracs: { Soc: 60 }, extensions: { v5: { divine: { sin: 1000 } } } };
  const battle = contract(battleId);
  const base = { canSpeak: true, sourceFingerprint: fingerprint, round: 1, targetIds: ['priest'],
    facts: { targets: { priest: { withinRange: true } } } };
  const invalidRoll = previewDivineExecution(actor, battle, [actor], { ...base, roll: 101 });
  assert.equal(invalidRoll.ready, false);
  assert.equal(invalidRoll.status, 'invalid');
  const overBudget = previewDivineExecution(actor, battle, [actor], { ...base, roll: 23, choices: { range: 2 } });
  assert.equal(overBudget.ready, false);
  assert.match(overBudget.error, /paliers/);
  const highSin = previewDivineExecution(actor, battle, [actor], { ...base, roll: 99, wrathRoll: 1,
    wrathConsequences: 'Résolution MJ', choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: { phase: 'endOfRound', round: 6 } });
  assert.equal(highSin.ready, true, highSin.error);
  assert.equal(highSin.preview.wrath.modifiedRoll, 10001);
  assert.equal(highSin.preview.wrath.outcome.id, 'wrath:151-plus');
});

test('DIV-05 bloque le même bonus stat divin+magique et le cumul PA au calcul Store', () => {
  const priest = { id: 'priest', zone: 'active', skills: [{ name: 'Prière', status: 'resolved', total: 60 }],
    caracs: { Soc: 60 }, talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    extensions: { v5: { divine: { sin: 0 } } } };
  const ally = { id: 'ally', zone: 'active', caracs: { Soc: 60 }, extensions: { v5: { spellEffects: [{ id: 'magic-stat', statModifiers: { CC: 5 } }], divine: {} } } };
  const battleState = { localRevision: 1, combat: { round: 1, participants: [priest, ally] } };
  const battle = previewStoreDivine(battleState, battleId, { actorId: 'priest', targetIds: ['ally'], canSpeak: true,
    roll: 23, choices: { range: 0, targets: 0, duration: 0 }, expiry: { phase: 'endOfRound', round: 6 },
    facts: { targets: { ally: { withinRange: true } } } });
  assert.equal(battle.ready, false);
  assert.match(battle.error, /DIV-05/);

  const invoker = { ...priest, talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
    prayers: [{ name: contract(shieldId).catalogueName }] };
  const armoredAlly = { ...ally, extensions: { v5: { spellEffects: [{ id: 'magic-ap', apModifiers: { all: 2 } }] } } };
  const shield = previewStoreDivine({ localRevision: 1, combat: { round: 1, participants: [invoker, armoredAlly] } }, shieldId,
    { actorId: 'priest', targetIds: ['ally'], canSpeak: true, roll: 23, choices: { range: 0, targets: 0, duration: 0 },
      expiry: { phase: 'endOfRound', round: 6 }, facts: { targets: { ally: { withinRange: true, ally: true } } } });
  assert.equal(shield.ready, false);
  assert.match(shield.error, /DIV-05/);
});

test('fin manuelle de sun-a retire son seul état Aveuglé et préserve sun-b', () => {
  const state = { combat: { participants: [{ id: 'target', states: [
    { id: 'sun-a-state', key: 'aveugle', level: 1, divineExecutionId: 'sun-a' },
    { id: 'sun-b-state', key: 'aveugle', level: 1, divineExecutionId: 'sun-b' }
  ], extensions: { v5: { divineEffects: [
    { id: 'sun-a-layer', executionId: 'sun-a', conditionStateIds: ['sun-a-state'] },
    { id: 'sun-b-layer', executionId: 'sun-b', conditionStateIds: ['sun-b-state'] }
  ] } } }] }, extensions: { v5: { divineExecutions: [] } } };
  const result = endStoreDivinePrayer(state, 'sun-a', { reason: 'Contrôle de suppression ciblée' });
  const target = result.combat.participants[0];
  assert.deepEqual(target.extensions.v5.divineEffects.map(row => row.executionId), ['sun-b']);
  assert.deepEqual(target.states.map(row => row.id), ['sun-b-state']);
});

test('fin manuelle préserve un état commun encore référencé par une autre couche', () => {
  const state = { combat: { participants: [{ id: 'target', states: [
    { id: 'shared-state', key: 'aveugle', level: 1 }
  ], extensions: { v5: { divineEffects: [
    { id: 'sun-a-layer', executionId: 'sun-a', conditionStateIds: ['shared-state'] },
    { id: 'sun-b-layer', executionId: 'sun-b', conditionStateIds: ['shared-state'] }
  ] } } }] }, extensions: { v5: { divineExecutions: [] } } };
  const result = endStoreDivinePrayer(state, 'sun-a', { reason: 'État partagé' });
  const target = result.combat.participants[0];
  assert.deepEqual(target.extensions.v5.divineEffects.map(row => row.executionId), ['sun-b']);
  assert.deepEqual(target.states.map(row => row.id), ['shared-state']);
});

test('des sources de miracle et talent périmées sont bloquées après un rafraîchissement réel', async () => {
  const shield = contract(shieldId);
  const battle = contract(battleId);
  assert.equal(validateDivineSources(shield), null);
  assert.equal(validateDivineSources(battle), null);
  const current = getReferenceCatalogue().magic.miracles.find(row => row.nom === shield.catalogueEntry.nom);
  const pinnedBless = registry.sourceTalentDescriptions['talent-bless'];
  assert.ok(current);
  const sheetNames = ['Mots Clés Armes et Armures', 'Armes Corps à Corps', 'Armes à Distance', 'Armures', 'Talents', 'Magie', 'Miracles'];
  const refreshed = await refreshReferences({ storage: null, forceRefresh: true, fetchImpl: async url => {
    const sheet = new URL(url).searchParams.get('sheet');
    assert.ok(sheetNames.includes(sheet), sheet);
    let csv = await readFile(resolve('js/data/reference-source-csv', `${sheet}.csv`), 'utf8');
    if (sheet === 'Miracles') csv = csv.replace(current.nom, `${current.nom} actualisé`);
    if (sheet === 'Talents') {
      assert.ok(csv.includes(pinnedBless), 'la source de talent épinglée doit exister dans le CSV local de fixture');
      csv = csv.replace(pinnedBless, 'Description de Béni modifiée pour la sonde');
    }
    return { ok: true, text: async () => csv };
  } });
  assert.equal(refreshed.ok, true, refreshed.status.error);
  assert.equal(validateDivineSources(shield)?.includes('description publique'), true);
  assert.equal(validateDivineSources(battle)?.includes('source du talent divin a changé'), true);
});
