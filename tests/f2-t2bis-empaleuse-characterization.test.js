import test from 'node:test';
import assert from 'node:assert/strict';
import { previewResolution, applyResolution } from '../js/core/resolution.js';

const participant = (id, extra = {}) => ({
  id, name: id, kind: id === 'shooter' ? 'PJ' : 'PNJ', camp: id === 'shooter' ? 'pj' : 'foe',
  hp: 20, maxHp: 20, caracs: { CT: 60, E: 30 }, skills: [], states: [], equipment: [],
  armor: {}, extensions: { v5: {} }, ...extra,
});

function criticalRangedAttack({ weaponId, category, name, resolutionId }) {
  const shooter = participant('shooter', { equipment: [{ id: weaponId, kind: 'weapon', name, category,
    damage: '+4', keywords: [{ id: 'empaleuse' }] }] });
  const target = participant('target');
  const preview = previewResolution({
    resolutionId, actor: shooter, target, baseRevision: 0, round: 1, roll: 11,
    criticalRolls: { location: 2, effect: 80 },
    action: { id: 'ranged-attack', type: 'attack', attr: 'CT', base: 60, damage: 4,
      qualities: [{ id: 'empaleuse' }], extensions: { fiche: { equipmentId: weaponId } } },
    v5: { kind: 'ranged' }, attackContext: { ranged: true },
  });
  return { preview, shooter, target };
}

test('F2-T2 bis characterization — untracked bow/crossbow projectiles lodge from the weapon profile', () => {
  for (const [category, name] of [['Arc', 'Arc de test'], ['Arbalète', 'Arbalète de test']]) {
    const { preview, shooter, target } = criticalRangedAttack({
      weaponId: `weapon-${category}`, category, name, resolutionId: `impale-${category}`,
    });
    assert.deepEqual(preview.unresolved, [], `${category}: a critical Impale shot needs no tracked ammunition`);
    assert.equal(preview.projectileLodging?.removal, 'heal-test');
    const applied = applyResolution(preview, { revision: 0, round: 1,
      participants: [shooter, target], appliedResolutionIds: [] });
    assert.equal(applied.status, 'applied');
    assert.equal(applied.state.participants.find(row => row.id === 'target').extensions.v5.lodgedProjectiles.length, 1);
  }
});

test('F2-T2 bis characterization — untracked black-powder projectile requires surgery', () => {
  const { preview, shooter, target } = criticalRangedAttack({
    weaponId: 'pistol', category: 'Poudre noire', name: 'Pistolet de test', resolutionId: 'impale-bullet',
  });
  assert.deepEqual(preview.unresolved, [], 'the weapon profile supplies the generic bullet type');
  assert.equal(preview.projectileLodging?.removal, 'surgery');
  const applied = applyResolution(preview, { revision: 0, round: 1,
    participants: [shooter, target], appliedResolutionIds: [] });
  assert.equal(applied.status, 'applied');
  assert.equal(applied.state.participants.find(row => row.id === 'target').extensions.v5.lodgedProjectiles[0].removal, 'surgery');
});
