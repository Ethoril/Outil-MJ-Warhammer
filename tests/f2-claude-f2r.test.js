import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWeaponSkillRules, weaponHandsForParticipant } from '../js/core/equipment.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

// Corrections Claude après la contre-vérification de F2-R (27/10/2026) : exemplaires anciens du catalogue V4.
const legacy = (id, name, category, extra = {}) => ({ id: 'inst-' + id, baseId: id, kind: 'weapon', name, category, keywords: [], ...extra });

test('un exemplaire ancien dont le modèle a quitté le catalogue garde ses mains d’origine', () => {
  const catalogue = getReferenceCatalogue();
  for (const id of ['weapon-armes-corps-a-corps-parade-main-gauche', 'weapon-armes-corps-a-corps-parade-filet-leste-2m', 'weapon-armes-a-distance-entraves-lasso'])
    assert.equal(catalogue.items.some(row => row.id === id), false, 'modèle retiré : ' + id);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-corps-a-corps-parade-main-gauche', 'Main gauche', 'Parade')), 1);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-corps-a-corps-parade-filet-leste-2m', 'Filet lesté (2M)', 'Parade')), 2);
  assert.equal(weaponHandsForParticipant(legacy('weapon-armes-a-distance-entraves-lasso', 'Lasso', 'Entraves', { range: 'BF × 2' })), 1);
});

test('une ancienne action de groupe Parade sans lien explicite reste résolue', () => {
  const item = legacy('weapon-armes-corps-a-corps-parade-brise-epee', 'Brise-épée', 'Parade', { keywords: [{ id: 'defensive', parameter: '' }] });
  const base = { id: 'skill-base', name: 'Corps à corps (Base)', group: 'Corps à corps', specialization: 'Base', basic: true, carac: 'CC', total: 69, advances: 5, status: 'resolved' };
  const actor = { id: 'hero', kind: 'PJ', caracs: { CC: 54 }, extensions: { v5: { baseCaracs: { CC: 54 } } }, skills: [base], equipment: [item], states: [], ficheSnapshot: { skills: [base], coverage: { skills: 'present' } } };
  const action = { id: 'attack', type: 'attack', note: item.name, attr: 'CC', base: 54, damage: 3, qualities: [{ id: 'defensive', parameter: '' }],
    extensions: { fiche: { equipmentId: item.id, bindingVersion: 1 }, equipment: item, v5: { kind: 'test' } } };
  const result = applyWeaponSkillRules(actor, action, { weapon: item });
  assert.ok(!result.unresolved?.some(text => /Groupe d’arme manquant/.test(text)), 'plus de « Groupe d’arme manquant » à chaque jet');
});
