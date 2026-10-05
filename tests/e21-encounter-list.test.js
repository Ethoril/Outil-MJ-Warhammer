import test from 'node:test';
import assert from 'node:assert/strict';
import { ENCOUNTER_STATUS_LABELS, encounterDisplayStatus, encounterSummary, sortEncountersForDisplay } from '../js/core/encounters.js';

const entry = (profileId, quantity = 1) => ({ id: `${profileId}-${quantity}`, profileId, quantity });
const profiles = [{ id: 'gob', name: 'Gobelin' }, { id: 'chef', name: 'Chef gobelin' }];

test('libellés de statut', () => {
  assert.deepEqual({ ...ENCOUNTER_STATUS_LABELS }, { active: 'En cours', suspended: 'Suspendue', prepared: 'Préparée' });
});

test('statut affiché : déduit des scènes vivantes', () => {
  const activeScene = { id: 's1', status: 'active', encounterId: 'a' };
  const suspendedScenes = [{ id: 's2', status: 'suspended', encounterId: 'b' }];
  const scenes = { activeScene, suspendedScenes };
  assert.deepEqual(encounterDisplayStatus({ id: 'a', status: 'prepared' }, scenes), { key: 'active', label: 'En cours', sceneId: 's1' });
  assert.deepEqual(encounterDisplayStatus({ id: 'b', status: 'active' }, scenes), { key: 'suspended', label: 'Suspendue', sceneId: 's2' });
  assert.deepEqual(encounterDisplayStatus({ id: 'c', status: 'closed' }, scenes), { key: 'prepared', label: 'Préparée', sceneId: null });
  assert.deepEqual(encounterDisplayStatus({ id: 'd', status: 'prepared' }, scenes), { key: 'prepared', label: 'Préparée', sceneId: null });
});

test('statut affiché : un status « active » périmé sans scène redevient préparée', () => {
  assert.equal(encounterDisplayStatus({ id: 'a', status: 'active' }).key, 'prepared');
  assert.equal(encounterDisplayStatus({ id: 'a', status: 'suspended' }, { activeScene: { id: 's', status: 'suspended', encounterId: 'a' } }).key, 'prepared');
  assert.equal(encounterDisplayStatus({ id: 'a' }, { suspendedScenes: null }).key, 'prepared');
});

test('résumé : total, regroupement par profil, pas de ×1', () => {
  assert.deepEqual(encounterSummary({ entries: [entry('gob', 3), entry('chef')] }, profiles), { count: 4, text: 'Gobelin ×3, Chef gobelin' });
  assert.deepEqual(encounterSummary({ entries: [entry('gob', 2), entry('chef'), { id: 'x', profileId: 'gob', quantity: 1 }] }, profiles), { count: 4, text: 'Gobelin ×3, Chef gobelin' });
});

test('résumé : profil supprimé, liste vide', () => {
  assert.deepEqual(encounterSummary({ entries: [entry('perdu', 2)] }, profiles), { count: 2, text: 'Profil supprimé ×2' });
  assert.deepEqual(encounterSummary({ entries: [] }, profiles), { count: 0, text: '' });
  assert.deepEqual(encounterSummary({}), { count: 0, text: '' });
});

test('tri : en cours, suspendues, préparées, clôturées, ordre stable', () => {
  const list = [
    { id: 'p1', status: 'prepared' }, { id: 'c1', status: 'closed' }, { id: 's1', status: 'prepared' },
    { id: 'a1', status: 'prepared' }, { id: 'p2', status: 'active' }, { id: 'c2', status: 'closed' }
  ];
  const scenes = { activeScene: { id: 'x', status: 'active', encounterId: 'a1' }, suspendedScenes: [{ id: 'y', encounterId: 's1' }] };
  const sorted = sortEncountersForDisplay(list, scenes);
  assert.deepEqual(sorted.map(item => item.id), ['a1', 's1', 'p1', 'c1', 'p2', 'c2']);
  assert.notEqual(sorted, list);
  assert.deepEqual(list.map(item => item.id), ['p1', 'c1', 's1', 'a1', 'p2', 'c2']);
  assert.deepEqual(sortEncountersForDisplay([]), []);
});
