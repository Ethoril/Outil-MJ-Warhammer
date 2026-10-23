import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CREATURE_ABILITIES } from '../js/data/creature-abilities.js';
import { abilityDisposition, planCreatureAbility, creatureAbilityReminders, uncoveredAbilityRefs } from '../js/core/creature-abilities.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const inventory = JSON.parse(readFileSync(new URL('../docs/BESTIAIRE_INVENTAIRE.json', import.meta.url), 'utf8')).traits;
const book = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const inScope = n => (n >= 96 && n <= 161) || (n >= 173 && n <= 205) || (n >= 250 && n <= 288);
const number = id => Number(id.slice(5));

test('T12 chaque capacité du périmètre a une disposition : prise en charge par un lot, ou rappel motivé', () => {
  const expected = inventory.filter(trait => inScope(number(trait.id))).map(trait => trait.id);
  assert.equal(expected.length, 66 + 33 + 39);
  assert.deepEqual(CREATURE_ABILITIES.map(entry => entry.id).sort(), expected.slice().sort());
  for (const entry of CREATURE_ABILITIES) {
    assert.ok(['covered', 'reminder'].includes(entry.status), entry.id);
    assert.ok(entry.summaryFr.length > 10, entry.id);
    if (entry.status === 'covered') assert.match(entry.by, /^T\d+/, entry.id);
    else assert.ok(entry.motive.length > 20, `${entry.id} : motif manquant`);
  }
});

test('T12 raccordements par famille aux lots précédents', () => {
  const by = id => abilityDisposition(id).by;
  assert.equal(by('E0-T-105'), 'T4 Fouissage');
  assert.equal(by('E0-T-150'), 'T4 Respiration aquatique');
  assert.equal(by('E0-T-142'), 'T5 Sens vibratoires');
  assert.equal(by('E0-T-138'), 'T6 Frénésie');
  assert.equal(by('E0-T-140'), 'T6 Rage');
  assert.equal(by('E0-T-253'), 'T3 Déclencheurs de mort');
  assert.equal(by('E0-T-135'), 'T3 Venin');
  assert.equal(by('E0-T-108'), 'T2 Souffle');
  assert.equal(by('E0-T-195'), 'T7 Dressé');
  assert.equal(by('E0-T-267'), 'T7 Marques du Chaos');
  assert.equal(by('E0-T-287'), 'T1 Bouclier');
  assert.equal(abilityDisposition('E0-T-104').status, 'reminder');
  assert.equal(abilityDisposition('E0-T-001'), null);
});

test('T12 reçu : une capacité en rappel dit pourquoi elle n\'est pas calculée, sans rien écrire', () => {
  const plan = planCreatureAbility('E0-T-104');
  assert.equal(plan.available, false);
  assert.equal(plan.effects.length, 0);
  assert.match(plan.receipt.reminder, /Avaler|englouti|Force opposée|entrave/i);
  assert.ok(plan.receipt.motive.length > 20);
  const covered = planCreatureAbility('E0-T-105');
  assert.equal(covered.available, true);
  assert.equal(covered.receipt.coveredBy, 'T4 Fouissage');
  assert.equal(planCreatureAbility('E0-T-999').available, false);
});

test('T12 profils réels : Drakwald Mancatcher (Spiteful) et Forest Goblin Shaman (Snare \'Em Good)', () => {
  const library = book('L11');
  const spider = buildParticipantFromBestiary('E0-P-003', { library });
  const lines = creatureAbilityReminders(spider);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /T6 Haine/);
  const shaman = buildParticipantFromBestiary('E0-P-006', { library });
  const [line] = creatureAbilityReminders(shaman);
  assert.match(line, /Rappel/);
  assert.deepEqual(uncoveredAbilityRefs(shaman), ['E0-T-097']);
  assert.deepEqual(uncoveredAbilityRefs(spider), []);
});

test('T12 un participant sans capacité propre, ou une référence hors périmètre, ne produit aucun rappel', () => {
  assert.deepEqual(creatureAbilityReminders({ extensions: { v5: { bestiary: { abilityRefs: ['E0-T-001'] } } } }), []);
  assert.deepEqual(creatureAbilityReminders({}), []);
  assert.deepEqual(creatureAbilityReminders(null), []);
});
