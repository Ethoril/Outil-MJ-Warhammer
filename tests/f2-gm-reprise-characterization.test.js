import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCreatureHitLocation, deriveHitMorphology } from '../js/core/v5-hit-morphology.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planMountedAttack, planMountedDodge } from '../js/core/v5-mounted-combat.js';
import { previewResolution } from '../js/core/resolution.js';
import { readFileSync as readSource } from 'node:fs';

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

test('F2-M reprise — une ancienne monture sans mountId ne bloque pas l’attaque de cavalerie', () => {
  const rider = { id: 'rider', extensions: { v5: { mounted: true } } };
  const plan = planMountedAttack({ actor: rider, target: { id: 'target' }, weapon: { category: 'Cavalerie' } });
  assert.equal(plan.active, true);
  assert.deepEqual(plan.unresolved, []);
  assert.deepEqual(plan.advantageSources, []);
});

test('F2-M reprise — une défense brute d’Ag contre un cavalier reçoit le Désavantage', () => {
  const attacker = { id: 'attacker', states: [] };
  const rider = { id: 'rider', name: 'Cavalier', extensions: { v5: { mounted: true, mountId: 'horse' } }, states: [] };
  const mount = { id: 'horse', name: 'Cheval', zone: 'active', kind: 'Créature', size: 'large', states: [] };
  const preview = previewResolution({
    actor: attacker, target: rider,
    action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 41,
    defense: { attr: 'Ag', base: 55, roll: 75 },
    v5: { kind: 'melee' }, v5State: { participants: [attacker, rider, mount] }
  });
  assert.ok(preview.defenderTest.advantage.disadvantage.some(row => row.id === 'mounted:dodge'));
});

test('F2-M contre-vérification — Surpris et Sonné produisent chacun un plan de chute', () => {
  const source = readSource(new URL('../js/core/resolution.js', import.meta.url), 'utf8');
  assert.match(source, /const eventsForConditions\s*=\s*\(keys\)\s*=>/);
  assert.match(source, /eventsForConditions\(nextConditionKeys\)/);
  assert.match(source, /eventsForConditions\(actorConditionKeys\)/);
});

test('F2-G contre-vérification — changer de cible efface aussi le côté de patte choisi', () => {
  const source = readSource(new URL('../js/ui/workspace-view.js', import.meta.url), 'utf8');
  const reset = source.slice(source.indexOf("if ('targetId' in patch)"), source.indexOf('draft.fortuneReroll=false'));
  assert.match(reset, /'spiderLegSide'/);
});

test('F2-G contre-vérification — les victimes secondaires araignées saisissent leur côté de patte', () => {
  const source = readSource(new URL('../js/ui/resolution-panel.js', import.meta.url), 'utf8');
  const secondary = source.slice(source.indexOf('const secondaryHitMorphology='), source.indexOf("if(type==='test'&&action?.attr==='F'", source.indexOf('const secondaryHitMorphology=')));
  assert.match(secondary, /spiderLegSidesById/);
  assert.match(secondary, /Araignée/);
});
