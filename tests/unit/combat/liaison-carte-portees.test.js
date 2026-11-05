import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rangeCellsOf, persistentMaxHpOf } from '../../../js/core/map-link-state.js';
import { ficheSnapshot, planProfileSync } from '../../../js/core/fiche-sync.js';

// Liaison RPG Map Display, morceau L1c : portées effectives (contrat §4), vérifiées contre le livre de base V5.
const humain = (patch = {}) => ({ id: 'p1', kind: 'PNJ', name: 'Garde', hp: 12, maxHp: 12, states: [], movement: 4, ...patch });
const range = patch => rangeCellsOf(humain(patch));

test('états : Enchevêtré, Surpris et Inconscient interdisent le Move (V5 p.186-187)', () => {
  for (const name of ['Enchevêtré', 'Surpris', 'Inconscient']) assert.deepEqual(range({ states: [{ name }] }), { speedCells: 0, runCells: 0 }, name);
  assert.deepEqual(range({ states: [{ name: 'Enchevêtré', level: 0 }] }), { speedCells: 4, runCells: 8 });
});

test('À terre : ramper à la moitié de la Marche, Course comprise (V5 p.186)', () => {
  assert.deepEqual(range({ states: [{ name: 'À Terre' }] }), { speedCells: 2, runCells: 2 });
  assert.deepEqual(range({ movement: 5, states: [{ name: 'À terre' }] }), { speedCells: 2, runCells: 2 });
});

test('Sonné : Mouvement divisé par deux, arrondi au supérieur, une seule fois (V5 p.186)', () => {
  assert.deepEqual(range({ states: [{ name: 'Sonné', level: 1 }] }), { speedCells: 2, runCells: 4 });
  assert.deepEqual(range({ movement: 5, states: [{ name: 'Sonné', level: 3 }] }), { speedCells: 3, runCells: 6 });
  // États différents : la pénalité la plus forte seulement (p.185).
  assert.deepEqual(range({ states: [{ name: 'Sonné' }, { name: 'À terre' }] }), { speedCells: 2, runCells: 2 });
});

test('Brisé, Exténué, Hémorragique ne changent pas les portées', () => {
  assert.deepEqual(range({ states: [{ name: 'Brisé' }, { name: 'Exténué', level: 2 }, { name: 'Hémorragique' }] }), { speedCells: 4, runCells: 8 });
});

test('Foulée : Course ×1,5 (V5 p.361), via planMovement', () => {
  assert.deepEqual(range({ traits: ['Sprinter'] }), { speedCells: 4, runCells: 12 });
  assert.deepEqual(range({ traits: ['Foulée'], states: [{ name: 'Sonné' }] }), { speedCells: 2, runCells: 6 });
});

test('Vol (Rating) : vol en Move jusqu à Rating mètres, soit Rating/2 cases (V5 p.358)', () => {
  assert.deepEqual(range({ traits: ['Fly (80)'] }), { speedCells: 40, runCells: 40 });
  assert.deepEqual(range({ movement: 6, traits: ['Vol (10)'] }), { speedCells: 6, runCells: 12 });
  assert.deepEqual(range({ traits: ['Fly'] }), { speedCells: 4, runCells: 8 }, 'indice absent : rien de plus');
  assert.deepEqual(range({ traits: ['Fly (80)'], states: [{ name: 'À terre' }] }), { speedCells: 2, runCells: 2 });
  assert.deepEqual(range({ traits: ['Fly (80)'], states: [{ name: 'Enchevêtré' }] }), { speedCells: 0, runCells: 0 });
});

test('Bond, Grimpant, Amphibie, Créature marine : portées terrestres inchangées', () => {
  assert.deepEqual(range({ traits: ['Bounce', 'Wallcrawler', 'Amphibious', 'Marine Creature', 'Aquatic'] }), { speedCells: 4, runCells: 8 });
});

test('séquelles : le Mouvement effectif du moteur des séquelles remplace M (V5 p.178)', () => {
  const sequelaEffects = { rows: [], movement: { base: 4, effective: 2 } };
  assert.deepEqual(range({ extensions: { v5: { sequelaEffects } } }), { speedCells: 2, runCells: 4 });
  assert.deepEqual(range({ extensions: { v5: { sequelaEffects } }, states: [{ name: 'Sonné' }] }), { speedCells: 1, runCells: 2 });
});

test('PV max d un PJ persistant : woundsMax de la fiche importée (fixture Caelel), sinon maxHp du profil', () => {
  const fiche = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
  const profile = planProfileSync(ficheSnapshot('caelel', fiche), { id: 'pr', name: 'Caelel', kind: 'PJ', caracs: {}, hp: 5, maxHp: 5, diceLines: [], extensions: {} }, {}).updated;
  assert.equal(profile.ficheSnapshot.woundsMax, 18);
  assert.equal(persistentMaxHpOf(profile), 18);
  assert.equal(persistentMaxHpOf({ maxHp: 11, ficheSnapshot: { woundsMax: null } }), 11, 'import JSON : woundsMax null');
  assert.equal(persistentMaxHpOf({ maxHp: 11, ficheSnapshot: { woundsMax: 14 } }), 14, 'la fiche prime sur un maxHp resté en arrière');
  assert.equal(persistentMaxHpOf({ maxHp: 11 }), 11);
  assert.equal(persistentMaxHpOf(null), null);
});
