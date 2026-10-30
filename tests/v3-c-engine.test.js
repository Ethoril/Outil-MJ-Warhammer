import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellContract, validateSpellTargets } from '../js/core/v5-spell-contracts.js';

// Lot v3-C : talents, magie et créatures du livre de base V5 EN v3.

test('v3 Souffle (p.243) : le lanceur est immunisé à son propre Souffle, il ne peut pas être touché', () => {
  const contract = getSpellContract('Souffle');
  const caster = { id: 'mage', camp: 'pj' }, foe = { id: 'foe', camp: 'ennemi' };
  assert.equal(validateSpellTargets(contract, caster, [foe]).valid, true);
  const own = validateSpellTargets(contract, caster, [foe, caster]);
  assert.equal(own.valid, false);
  assert.equal(own.status, 'invalid-target-admissibility');
});

test('v3 Diction instinctive et Harmonie aethyrique (p.121, p.114) : refusées après un Test raté, appliquées après une réussite', async () => {
  const { resolveMiscast } = await import('../js/core/v5-magic-miscasts.js');
  const failed = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, attunementRank: 1, testSucceeded: false });
  assert.equal(failed.cancelled, false, 'le jet 15 n’est pas réduit de 20 après un Test raté');
  assert.equal(failed.modifier, 0);
  assert.notEqual(failed.choicesRequired, 'attunement', 'pas de second jet après un Test raté');
  const succeeded = resolveMiscast({ severity: 'MINOR', roll: 15, instinctiveDiction: true, testSucceeded: true });
  assert.equal(succeeded.cancelled, true, 'après une réussite, 15 − 20 ≤ 0 : aucun incident');
  const attuned = resolveMiscast({ severity: 'MINOR', roll: 15, attunementRank: 1, testSucceeded: true });
  assert.equal(attuned.choicesRequired, 'attunement', 'après une réussite, second jet demandé');
});

test('v3 Diction instinctive : l’incident d’une maladresse de lancement n’est pas réduit, celui d’un critique réussi l’est', async () => {
  const { previewCasting } = await import('../js/core/v5-magic-casting.js');
  const { previewChannelling } = await import('../js/core/v5-magic-channelling.js');
  const talent = id => ({ id: 'talent-' + id, status: 'resolved', rank: 1 });
  const mage = { id: 'm', name: 'm', caracs: { Int: 50, FM: 50, I: 40, Ag: 40 }, skills: [{ name: 'Langue (Magick)', total: 30 }, { name: 'Focalisation', total: 30 }],
    talents: [talent('instinctive-diction')], states: [], extensions: { v5: { channelling: { type: 'winds', sl: 2 } } } };
  const spell = getSpellContract('Carreau');
  const fumble = previewCasting(mage, spell, { roll: 99, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(fumble.miscast?.cancelled ?? false, false, 'maladresse (Test raté) : jet 15 conservé');
  assert.equal(fumble.miscast?.modifier, 0);
  const critical = previewCasting({ ...mage, skills: [{ name: 'Langue (Magick)', total: 80 }] }, spell, { roll: 11, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(critical.miscast, null, 'critique réussi : 15 − 20 ≤ 0, aucun incident');
  const loss = previewChannelling(mage, { type: 'winds', roll: 99, lossRoll: 1, miscastRoll: 15, instinctiveDiction: true });
  assert.equal(loss.miscast?.modifier, 10, 'Focalisation ratée : seul le +10 par DR perdu s’applique, pas −20');
});
