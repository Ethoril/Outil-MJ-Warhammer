// Moteurs de mots-clés agissant sur le jet (palier 1 du §13.4).
// Ces trois-là étaient déclarés dans ENGINES mais consommés nulle part : le jet
// n'en tenait aucun compte, ils se réduisaient à des pastilles informatives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTargetBonus, isCriticalRoll, isFumbleRoll, activeEngines } from '../js/core/roll-qualities.js';
import { isDouble } from '../js/core/dice.js';

test('Précise — +10 au score cible', () => {
  assert.equal(applyTargetBonus(45, [{ id: 'precise' }]).target, 55);
  assert.equal(applyTargetBonus(45, [{ id: 'precise' }]).bonus, 10);
  assert.equal(applyTargetBonus(45, []).target, 45, 'sans la qualité, score inchangé');
  assert.equal(applyTargetBonus(45, []).bonus, 0);
});

test('Précise — jamais de score négatif, et libellé accentué toléré', () => {
  assert.equal(applyTargetBonus(0, [{ id: 'Précise' }]).target, 10, 'slug dérivé du libellé');
  assert.equal(applyTargetBonus(-5, []).target, 0, 'borné à zéro');
});

test('Précise — ne s\'applique pas deux fois si le mot-clé est répété', () => {
  const r = applyTargetBonus(45, [{ id: 'precise' }, { id: 'precise' }]);
  assert.equal(r.target, 55, 'dédoublonné par slug');
});

test('Empaleuse — critique élargi aux multiples de 10, sur réussite', () => {
  // sans la qualité : seul le double est critique
  assert.equal(isCriticalRoll(30, isDouble(30), []).critique, false);
  assert.equal(isCriticalRoll(33, isDouble(33), []).critique, true, '33 est un double');

  // avec la qualité : 30 devient critique
  const r = isCriticalRoll(30, isDouble(30), [{ id: 'empaleuse' }]);
  assert.equal(r.critique, true);
  assert.equal(r.élargi, true, 'signalé comme dû au mot-clé');

  // un double reste un critique normal, pas « élargi »
  assert.equal(isCriticalRoll(33, isDouble(33), [{ id: 'empaleuse' }]).élargi, false);

  // un jet quelconque reste non critique
  assert.equal(isCriticalRoll(37, isDouble(37), [{ id: 'empaleuse' }]).critique, false);
});

test('Empaleuse — 100 reste un double (décision §6.6) et 10 est un multiple de 10', () => {
  assert.equal(isCriticalRoll(100, isDouble(100), []).critique, true, '00 compte comme double');
  assert.equal(isCriticalRoll(10, isDouble(10), [{ id: 'empaleuse' }]).critique, true);
});

test('Dangereuse — maladresse sur tout jet raté comportant un 9', () => {
  // sans la qualité : seul le double
  assert.equal(isFumbleRoll(91, isDouble(91), []).maladresse, false);
  assert.equal(isFumbleRoll(99, isDouble(99), []).maladresse, true, '99 est un double');

  // avec la qualité : le 9 en dizaine suffit
  const dizaine = isFumbleRoll(91, isDouble(91), [{ id: 'dangereuse' }]);
  assert.equal(dizaine.maladresse, true);
  assert.equal(dizaine.élargi, true);

  // le 9 en unité aussi
  assert.equal(isFumbleRoll(49, isDouble(49), [{ id: 'dangereuse' }]).maladresse, true);

  // aucun 9 : pas de maladresse
  assert.equal(isFumbleRoll(42, isDouble(42), [{ id: 'dangereuse' }]).maladresse, false);
});

test('Dangereuse — 100 ne contient pas de 9', () => {
  assert.equal(isFumbleRoll(100, false, [{ id: 'dangereuse' }]).maladresse, false);
});

test('activeEngines — dédoublonne les alias et ignore l\'inconnu', () => {
  // impact est un alias de percutante : un seul moteur doit ressortir
  const e = activeEngines([{ id: 'percutante' }, { id: 'impact' }]);
  const moteurs = new Set(e.map(x => x.engine));
  assert.equal(moteurs.size, 1, 'percutante et impact portent le même moteur');

  assert.deepEqual(activeEngines([{ id: 'nawak' }]), [], 'mot-clé inconnu ignoré');
  assert.deepEqual(activeEngines(null), [], 'entrée invalide tolérée');
  assert.deepEqual(activeEngines(['precise']).map(x => x.id), ['precise'], 'chaîne acceptée');
});
