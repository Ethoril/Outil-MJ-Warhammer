import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';

const weapon = { id: 'bow', kind: 'weapon', name: 'Arc de test', category: 'Arc', damage: '+4',
  keywords: [{ id: 'empaleuse' }] };
const participant = (id, extra = {}) => ({ id, name: id, kind: id === 'shooter' ? 'PJ' : 'PNJ',
  camp: id === 'shooter' ? 'pj' : 'foe', zone: 'active', hp: 20, maxHp: 20,
  caracs: { CT: 60, CC: 40, E: 30, Ag: 30 }, skills: [], states: [], equipment: [], armor: {},
  extensions: { v5: {} }, ...extra });

test('F2-T2 bis — projectile Empaleuse générique persiste, se recharge et s’annule', async () => {
  let saved = null;
  const persistence = {
    load: async () => structuredClone(saved),
    saveAtomic: async ({ state }) => { saved = structuredClone(state); return { ok: true }; },
  };
  const store = createStore({ persistence });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], extensions: { v5: { combatId: 'impale-store' } },
    combat: { round: 1, currentActorId: 'shooter', order: ['shooter', 'target'],
      participants: [participant('shooter', { equipment: [weapon] }), participant('target')] }, diceLines: [], log: [] });
  const input = { resolutionId: 'generic-arrow', actorId: 'shooter', targetId: 'target', round: 1, roll: 11,
    criticalRolls: { location: 2, effect: 80 },
    action: { id: 'ranged-attack', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'empaleuse' }], extensions: { fiche: { equipmentId: weapon.id } } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true } };
  const preview = store.previewResolution(input);
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.projectileLodging.genericProjectile, true);
  assert.equal(preview.projectileLodging.ammunitionType, 'fleche');
  assert.equal((await store.applyResolution(preview)).status, 'applied');

  const lodged = store.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles;
  assert.equal(lodged.length, 1);
  assert.equal(lodged[0].ammunitionId, 'generic:bow:fleche');
  assert.equal(lodged[0].genericProjectile, true);

  const reloaded = createStore({ persistence });
  await reloaded.ready;
  assert.deepEqual(reloaded.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles, lodged);
  await reloaded.undo();
  assert.deepEqual(reloaded.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles || [], []);

  const afterUndoReload = createStore({ persistence });
  await afterUndoReload.ready;
  assert.deepEqual(afterUndoReload.listParticipants().find(row => row.id === 'target').extensions.v5.lodgedProjectiles || [], []);
});
