import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCreatureHitLocation } from '../js/core/v5-hit-morphology.js';
import { planMountedDodge } from '../js/core/v5-mounted-combat.js';

test('F2-G reprise — les pattes d’araignée utilisent la localisation des jambes', () => {
  const location = resolveCreatureHitLocation({
    roll: 50,
    morphology: 'araignee',
    baseLocation: { roll: 50, key: 'BODY', name: 'Corps', side: null }
  });
  assert.equal(location.key, 'LEG');
  assert.equal(location.name, 'Pattes');
});

test('F2-M reprise — Esquive montée est défavorisée sauf Trick Rider', () => {
  const mounted = { extensions: { v5: { mounted: true } }, talents: [] };
  const trickRider = { ...mounted, talents: [{ id: 'talent-trick-rider', status: 'resolved' }] };
  assert.deepEqual(planMountedDodge(mounted).disadvantageSources.map(row => row.id), ['mounted:dodge']);
  assert.deepEqual(planMountedDodge(trickRider).disadvantageSources, []);
});
