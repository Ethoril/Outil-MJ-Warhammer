import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const inventory = JSON.parse(readFileSync(new URL('../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8'));
const added = list => list.filter(entry => entry.addedOn === '2026-10-21');

test('E1 : le complément L18-L26 ajoute ses profils et ses capacités sans toucher aux 541 références existantes', () => {
  assert.equal(inventory.profiles.filter(entry => !entry.addedOn).length, 541);
  assert.equal(added(inventory.profiles).length, 443);
  assert.equal(inventory.traits.filter(entry => !entry.addedOn).length, 249);
  assert.ok(added(inventory.traits).length >= 35);
  const books = new Set(added(inventory.profiles).map(entry => entry.book));
  assert.deepEqual([...books].sort(), ['L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26']);
});

test('E1 : identifiants uniques, capacités rattachées existantes, pages positives', () => {
  const ids = [...inventory.traits, ...inventory.profiles].map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  const traitIds = new Set(inventory.traits.map(entry => entry.id));
  for (const profile of added(inventory.profiles)) {
    assert.ok(profile.page > 0 && profile.physicalPage > 0, profile.id);
    assert.match(profile.blockKey, /^L\d\d:\d+:\d+$/);
    for (const ref of profile.abilityRefs) assert.ok(traitIds.has(ref), `${profile.id} → ${ref}`);
  }
  for (const trait of added(inventory.traits)) assert.ok(trait.summaryFr.length > 20 && trait.currentStatus === 'absent', trait.id);
});

test('E1 : chaque livre du complément a une ligne de couverture et les questions ouvertes sont comptées', () => {
  const coverage = added(inventory.coverage);
  assert.equal(coverage.length, 9);
  assert.equal(coverage.reduce((sum, entry) => sum + entry.profiles, 0), 443);
  assert.equal(inventory.counts.openQuestions, inventory.openQuestions.length);
  assert.equal(added(inventory.openQuestions).length, 4);
});
