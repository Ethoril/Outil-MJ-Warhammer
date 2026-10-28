import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCreatureHitLocation, deriveHitMorphology } from '../js/core/v5-hit-morphology.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planMountedDodge } from '../js/core/v5-mounted-combat.js';
import { previewResolution } from '../js/core/resolution.js';

const l06 = JSON.parse(readFileSync(new URL('../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;

test('F2-G reprise — le profil réel Araignée géante fournit sa morphologie via le mot-clé', () => {
  const spider = buildParticipantFromBestiary('E0-P-076', { library: l06 });
  assert.equal(deriveHitMorphology(spider), 'spider');
  const result = previewResolution({
    actor: { id: 'attacker', states: [] }, target: spider,
    action: { type: 'attack', base: 90, damage: 4, qualities: [] }, roll: 4, baseRevision: 1
  });
  assert.equal(result.location.key, 'LEG');
});

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
