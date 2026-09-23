import test from 'node:test';
import assert from 'node:assert/strict';
import { DiceLine, Profile, cloneValue, normalizeAction } from '../js/core/models.js';
import { sanitizeProfile } from '../js/core/sanitize.js';
import { migrateSnapshot } from '../js/core/migrations.js';

test('E10 modèles — PNJ, tags, notes et actions restent éditables', () => {
  const profile = new Profile({
    id: 'p', name: 'Éclaireur', kind: 'PNJ', group: 'Élite', tags: 'chef, forêt, chef', notes: 'patrouille',
    actions: [{ id: 'a', base: 45, note: 'Arc', valuesX: 3, capacity: 6, qualities: ['Impact', 'Percutante'] }]
  });
  assert.equal(profile.kind, 'PNJ');
  assert.deepEqual(profile.tags, ['chef', 'forêt']);
  assert.equal(profile.actions[0].valuesX, 3);
  assert.equal(profile.actions[0].capacity, 6);
  assert.deepEqual(profile.actions[0].qualities.map(q => q.id), ['percutante']);
  profile.actions[0].qualities[0].rating = 9;
  assert.equal(profile.diceLines[0].qualities[0].rating, 9, 'actions et lignes désignent le même brouillon');
});

test('E10 modèles — duplication profonde des armures, qualités et extensions', () => {
  const source = { armor: { head: 2 }, qualities: [{ id: 'impact', data: { x: 2 } }], extensions: { nested: { ok: true } } };
  const copy = cloneValue(source);
  copy.armor.head = 5; copy.qualities[0].data.x = 8; copy.extensions.nested.ok = false;
  assert.deepEqual(source, { armor: { head: 2 }, qualities: [{ id: 'impact', data: { x: 2 } }], extensions: { nested: { ok: true } } });
  const action = normalizeAction(source);
  assert.notEqual(action.id, undefined);
});

test('E10 sanitation — ancien profil conserve ses actions et accepte le type PNJ', () => {
  const result = sanitizeProfile({ id: 'p', name: 'Garde', kind: 'PNJ', diceLines: [{ base: 40, qualities: [{ id: 'Impact' }] }] });
  assert.equal(result.kind, 'PNJ');
  assert.equal(result.diceLines[0].base, 40);
  assert.equal(result.diceLines[0].qualities[0].id, 'percutante');
});

test('E10 modèles — DiceLine expose valeurs X et capacité sans partager les qualités', () => {
  const qualities = [{ id: 'Explosion', rating: 3 }];
  const line = new DiceLine({ qualities, valuesX: 3, capacity: 2 });
  assert.equal(line.valuesX, 3);
  assert.equal(line.capacity, 2);
  line.qualities[0].rating = 9;
  assert.equal(qualities[0].rating, 3);
});

test('E10 migration — champs profil/action traversent export et réimport', () => {
  const { data } = migrateSnapshot({
    schemaVersion: 2,
    reserve: [{ id: 'p', name: 'PNJ', kind: 'PNJ', tags: ['chef'], notes: 'garde', favorite: true, actions: [{ id: 'a', base: 42, valuesX: 3, capacity: 2, qualities: [{ id: 'Impact' }] }] }],
    combat: { round: 0, participants: [] }, diceLines: [], log: []
  });
  assert.equal(data.reserve[0].kind, 'PNJ');
  assert.deepEqual(data.reserve[0].tags, ['chef']);
  assert.equal(data.reserve[0].actions[0].valuesX, 3);
  assert.equal(data.reserve[0].actions[0].qualities[0].id, 'Impact');
});
