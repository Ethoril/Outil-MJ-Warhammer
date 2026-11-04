import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenStateOf, tokenStatesOf, diffTokenStates, healthOf, markersOf, rangeCellsOf, visionDimOf, mapRefOf } from '../../../js/core/map-link-state.js';

// Liaison RPG Map Display, contrat v1 §4-§5 (lot 1, étape A).
const humain = (patch = {}) => ({ id: 'p1', kind: 'PNJ', name: 'Garde 2', hp: 12, maxHp: 12, states: [], movement: 4, camp: 'ennemi', ...patch });

test('un humain marche 4 cases et court 8 cases (1 case = 2 m) ; Enchevêtré le fige', () => {
  assert.deepEqual(rangeCellsOf(humain()), { speedCells: 4, runCells: 8 });
  assert.deepEqual(rangeCellsOf(humain({ movement: null, caracs: { M: 3 } })), { speedCells: 3, runCells: 6 });
  assert.deepEqual(rangeCellsOf(humain({ states: [{ name: 'Enchevêtré', level: 1 }] })), { speedCells: 0, runCells: 0 });
  assert.deepEqual(rangeCellsOf(humain({ movement: null })), { speedCells: null, runCells: null });
});

test('santé : indemne au max, mal en point au dernier quart ou à 0, blessé sinon', () => {
  assert.equal(healthOf(12, 12), 'unharmed');
  assert.equal(healthOf(11, 12), 'wounded');
  assert.equal(healthOf(4, 12), 'wounded');
  assert.equal(healthOf(3, 12), 'critical');
  assert.equal(healthOf(0, 12), 'critical');
});

test('états → marqueurs, niveaux dès 2, états maison et Blessé ignorés', () => {
  const { markers, markerLevels } = markersOf(humain({ states: [
    { name: 'Sonné', level: 3 }, { name: 'À Terre' }, { name: 'Exténué', level: 1 }, { name: 'Souillé', level: 2 },
    { name: 'Blessé' }, { name: 'Bénédiction de Sigmar', level: 2 }, { name: 'Hémorragique', level: 0 }
  ] }));
  assert.deepEqual(markers.sort(), ['fatigued', 'prone', 'stunned', 'tainted']);
  assert.deepEqual(markerLevels, { stunned: 3, tainted: 2 });
});

test('vision : 1 case par défaut, 10 avec Vision nocturne, 20 avec Vision dans le noir', () => {
  assert.equal(visionDimOf(humain()), 1);
  assert.equal(visionDimOf(humain({ traits: ['Night Vision'] })), 10);
  assert.equal(visionDimOf(humain({ traits: ['Dark Vision'] })), 20);
});

test('PJ : ref durable, pc et source de vision ; sa monture est pc sans vision ; taille Grande = 2 cases', () => {
  const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 10, maxHp: 14, states: [], movement: 4 };
  const cheval = { id: 'b', kind: 'Créature', name: 'Cheval', hp: 20, maxHp: 20, states: [], movement: 7, traits: ['Size (Large)'], extensions: { v5: { mountOf: 'a' } } };
  const scene = [pj, cheval];
  const sPj = tokenStateOf(pj, scene);
  assert.equal(sPj.ref, 'pj:c9');
  assert.equal(sPj.kind, 'pc');
  assert.equal(sPj.visionSource, true);
  assert.equal(sPj.imageUrl, null);
  const sCheval = tokenStateOf(cheval, scene);
  assert.equal(sCheval.ref, 'p:b');
  assert.equal(sCheval.kind, 'pc');
  assert.equal(sCheval.visionSource, false);
  assert.equal(sCheval.sizeCells, 2);
  assert.equal(tokenStateOf(humain(), [humain()]).kind, 'npc');
});

test('PV : maxHp résolu par l’appelant pour un PJ persistant, jamais null ; mort lue dans extensions.v5', () => {
  const pj = { id: 'a', kind: 'PJ', persistentCharacterId: 'c9', name: 'Ulrika', hp: 6, maxHp: null, states: [] };
  assert.deepEqual(tokenStateOf(pj, [pj], { maxHp: 14 }).hp, { current: 6, max: 14 });
  assert.deepEqual(tokenStateOf(pj, [pj]).hp, { current: 6, max: 6 });
  assert.equal(tokenStateOf(humain({ hp: 0, extensions: { v5: { dead: true } } }), []).dead, true);
});

test('diff : seuls les pions changés, apparus ou disparus', () => {
  const a = humain();
  const b = humain({ id: 'p2', name: 'Garde 3' });
  const before = tokenStatesOf([a, b]);
  const after = tokenStatesOf([{ ...a, hp: 5 }, humain({ id: 'p3' })]);
  assert.deepEqual(diffTokenStates(before, after).sort(), ['p:p1', 'p:p2', 'p:p3']);
  assert.deepEqual(diffTokenStates(before, tokenStatesOf([a, b])), []);
  assert.equal(mapRefOf(a), 'p:p1');
});
