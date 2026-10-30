import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSizeTrait, creatureSizeOf, planCreatureSize, sizeReminders, SIZE_RANKS } from '../js/core/creature-size.js';

const creature = (traits, extra = {}) => ({ id: 'c', name: 'Créature', traits, hp: 20, maxHp: 20, caracs: { F: 50, E: 40, FM: 30 }, camp: 'monstres', ...extra });

test('T10 lecture du Trait : anglais ou français, rang sur l’échelle à sept crans du moteur', () => {
  assert.deepEqual(parseSizeTrait('Size (Large)'), { key: 'large', rank: 4, label: 'Grande' });
  assert.equal(parseSizeTrait('Taille (Énorme)').key, 'enormous');
  assert.equal(parseSizeTrait('Taille (Monstrueuse)').rank, 6);
  assert.equal(parseSizeTrait('Size (Small)').rank, 2);
  assert.equal(parseSizeTrait('Size (Average) Stride').key, 'average');
  assert.equal(parseSizeTrait('Bite'), null);
  assert.equal(parseSizeTrait('Size (Gigantic)'), null);
  assert.equal(SIZE_RANKS.average, 3);
});

test('T10 taille du participant : Trait, sinon champ du profil, sinon Moyenne supposée', () => {
  assert.equal(creatureSizeOf(creature(['Size (Large)'])).key, 'large');
  assert.equal(creatureSizeOf(creature(['Bite'], { size: 'enormous' })).key, 'enormous');
  const none = creatureSizeOf(creature(['Bite']));
  assert.equal(none.key, 'average');
  assert.equal(none.assumed, true);
});

test('T10 barème de la page 360 : bonus de dégâts en mêlée et poids au surnombre', () => {
  const rows = [['Size (Small)', 'none', 1], ['Size (Average)', 'none', 1], ['Size (Large)', 'bf', 2], ['Size (Enormous)', 'twiceBf', 3], ['Size (Monstrous)', 'thriceBf', 4]];
  for (const [trait, kind, weight] of rows) {
    const plan = planCreatureSize(creature([trait]));
    assert.equal(plan.damage.kind, kind, trait);
    assert.equal(plan.outnumberWeight, weight, trait);
  }
});

test('T10 profil imprimé : dégâts déjà inclus, rien n’est ajouté ; sans profil, le bonus est calculé sur la Force', () => {
  const printed = planCreatureSize(creature(['Size (Monstrous)']));
  assert.equal(printed.damage.included, true);
  assert.equal(printed.damage.bonus, 0);
  const built = planCreatureSize(creature(['Size (Monstrous)']), { printedProfile: false });
  assert.equal(built.damage.bonus, 15, 'Monstrueuse +3 BF (v3)');
  assert.equal(planCreatureSize(creature(['Size (Large)']), { printedProfile: false }).damage.bonus, 5);
  const noForce = planCreatureSize(creature(['Size (Large)'], { caracs: {} }), { printedProfile: false });
  assert.equal(noForce.available, false);
  assert.equal(noForce.unresolved.length, 1);
});

test('T10 écart de Taille avec un adversaire : plus grande créature, écart, Peur de taille à confirmer', () => {
  const plan = planCreatureSize(creature(['Size (Enormous)']), { opponent: creature(['Size (Average)']) });
  assert.equal(plan.versus.gap, 2);
  assert.equal(plan.versus.larger, 'self');
  assert.deepEqual(plan.versus.fearInputs, { actorSize: 5, targetSize: 3, needsAggressive: true });
  const same = planCreatureSize(creature(['Size (Large)']), { opponent: creature(['Size (Large)']) });
  assert.equal(same.versus.larger, null);
  assert.equal(same.versus.fearInputs, null);
  const smaller = planCreatureSize(creature(['Size (Small)']), { opponent: creature(['Size (Large)']) });
  assert.equal(smaller.versus.larger, 'opponent');
  assert.equal(smaller.versus.fearInputs, null);
});

test('T10 Blessures recalculées sur demande (p. 361), jamais pour un profil imprimé', () => {
  const plan = planCreatureSize(creature(['Size (Large)']), { recomputeWounds: true });
  assert.equal(plan.wounds.value, (5 + 8 + 3) * 2);
  assert.equal(planCreatureSize(creature(['Size (Large)'])).wounds, null);
  const small = planCreatureSize(creature(['Size (Small)']), { recomputeWounds: true });
  assert.equal(small.wounds.value, 8);
  const missing = planCreatureSize(creature(['Size (Large)'], { caracs: { F: 50 } }), { recomputeWounds: true });
  assert.equal(missing.available, false);
});

test('T10 Petit : lecture V5 du livre, homebrew local rappelé sans migration', () => {
  const plan = planCreatureSize(creature(['Size (Small)']));
  assert.ok(plan.reminders.some(text => /Petit/.test(text) && /homebrew/i.test(text)));
});

test('T10 reçu et rappels', () => {
  const plan = planCreatureSize(creature(['Size (Large)']));
  assert.equal(plan.receipt.ability, 'Taille');
  assert.equal(plan.receipt.size, 'Grande');
  assert.equal(sizeReminders(creature(['Size (Large)'])).length, 1);
  assert.deepEqual(sizeReminders(creature(['Bite'])), []);
});
