import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue } from '../../../js/core/reference-catalog.js';
import { ficheSnapshot, planProfileSync } from '../../../js/core/fiche-sync.js';

// Fiche de Bhelgi (07/11) : « Projectiles (Lancer) » déclarée sur Dex, 10 avances ; la fiche affiche 68.
// L'outil suit la carac de la ligne, pas celle du catalogue (CT 26 + 10 = 36).
const knife = { ...structuredClone(getReferenceCatalogue().items.find(item => item.id === 'weapon-armes-a-distance-lancer-couteau-de-lancer')), id: 'couteau' };
const bhelgi = {
  carac: { ct: { base: 26, adv: 0 }, dex: { base: 43, adv: 15 } },
  skillsBasic: {},
  skillsAdvanced: [{ id: 'jet', nom: 'Projectiles (Lancer)', carac: 'dex', adv: 10 }],
  equipment: [knife]
};

test('la compétence prend la carac déclarée par la ligne de la fiche', () => {
  const skill = ficheSnapshot('bhelgi', bhelgi).skills.find(row => row.storageKey === 'jet');
  assert.equal(skill.carac, 'dex');
  assert.equal(skill.total, 68);
});

test('l’action du couteau de lancer reprend 68 une fois liée', () => {
  const snapshot = ficheSnapshot('bhelgi', bhelgi);
  const profile = { id: 'p', kind: 'PJ', diceLines: [], equipment: [], skills: [] };
  const [first] = planProfileSync(snapshot, profile).equipmentActions;
  const [linked] = planProfileSync(snapshot, profile, { equipmentLinks: { [first.key]: first.proposed } }).equipmentActions;
  assert.equal(linked.action.base, 68);
});

test('sans carac exploitable sur la ligne, le catalogue reste la référence', () => {
  const skill = ficheSnapshot('bhelgi', { ...bhelgi, skillsAdvanced: [{ id: 'jet', nom: 'Projectiles (Lancer)', adv: 10 }] }).skills.find(row => row.storageKey === 'jet');
  assert.equal(skill.total, 36);
});
