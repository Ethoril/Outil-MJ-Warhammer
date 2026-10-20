import test from 'node:test';
import assert from 'node:assert/strict';
import { getDivineContract, getAllDivineContracts } from '../js/core/v5-divine-store.js';
import { encounter } from './helpers/lot3-domain-fixture.js';

// P5 — N’écoutez point la Sorcière (Sigmar, V5 p.226) : « tout sort visant quiconque ou n’importe quel endroit de la zone subit
// -2 DR à son Test d’Incantation ». Modèle assisté : le MJ désigne les participants dans la zone (comme Sur un Terrain Mortel) ;
// un sort visant au moins l’un d’eux subit -2 DR une seule fois. Critère d’acceptation écrit avant l’implémentation.
const HEED = 'divine:miracle:sigmar:heed-not-the-witch';
const priest = { id: 'priest', name: 'priest', kind: 'PJ', camp: 'ennemi', zone: 'active', initiative: 40, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Sigmar' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Sigmar' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } } };
async function fixture() {
  const { store } = await encounter({});
  const state = JSON.parse(store.getFullJSON());
  const foe2 = { ...structuredClone(state.combat.participants.find(p => p.id === 'foe')), id: 'foe2', name: 'foe2' };
  state.combat.participants.push(structuredClone(priest), foe2); state.combat.order = ['priest', 'mage', 'foe', 'foe2']; state.combat.currentActorId = 'priest';
  await store.loadFromJSON(state);
  return store;
}
async function invoke(store, zone) {
  const preview = store.previewDivineExecution(HEED, { actorId: 'priest', targetIds: zone, roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: Object.fromEntries(zone.map(id => [id, { withinRange: true, withinArea: true }])) }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  assert.equal(preview.ready, true, `${preview.error} ${JSON.stringify(preview.needsInput)}`);
  const result = await store.applyDivineExecution(HEED, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const castSl = (store, targetIds) => {
  const preview = store.previewSpellExecution('Carreau', { actorId: 'mage', targetIds, roll: 25, miscastRoll: 15 });
  assert.equal(preview.valid, true, preview.error);
  return preview.castingPreview.testSl;
};

test('N’écoutez point la Sorcière : le contrat n’est plus manuel', () => {
  assert.notEqual(getDivineContract(HEED).status, 'manual');
});

test('N’écoutez point la Sorcière : -2 DR au lancement d’un sort visant un participant de la zone, pas hors zone ; fin et Undo', async () => {
  const store = await fixture();
  const base = castSl(store, ['foe']);
  assert.equal(castSl(store, ['foe2']), base);
  const result = await invoke(store, ['priest', 'foe']);
  assert.equal(castSl(store, ['foe']), base - 2, 'cible dans la zone');
  assert.equal(castSl(store, ['foe2']), base, 'cible hors zone');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'fin' });
  assert.equal(castSl(store, ['foe']), base, 'fin de prière');
  await store.undo();
  assert.equal(castSl(store, ['foe']), base - 2, 'Undo rétablit la prière');
  await store.undo();
  assert.equal(castSl(store, ['foe']), base, 'Undo annule l’invocation');
});
