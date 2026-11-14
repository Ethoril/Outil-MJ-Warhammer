// Règle de conversion WJDR V2 → V5 (tools/lib/bestiary-v2.mjs, docs/specs/images-pions/conversion-v2-v5.md), sur des profils témoins
// imprimés : un démon, un démon majeur, un mort-vivant, un PNJ humanoïde, une créature volante, et une monture de L27 (règle du 11/11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { convertStats, v2Movement, v2Value, woundsV5, meleeDamage, weaponAttack, naturalAttack, traitOf, skillOf } from '../../../tools/lib/bestiary-v2.mjs';

const v2 = values => values.map(v2Value);

test('démon (Portepestes, Tome de la Corruption p. 243) : Dex = Ag, I = Ag, CT 0 absente, Blessures V5 de Taille Moyenne', () => {
  const stats = convertStats(v2(['45%', '0%', '41%', '47%', '40%', '30%', '44%', '11%']), { M: 4 });
  assert.deepEqual(stats, { M: 4, CC: 45, CT: null, F: 41, E: 47, I: 40, Ag: 40, Dex: 40, Int: 30, FM: 44, Soc: 11 });
  assert.equal(woundsV5(stats, 'average'), 4 + 2 * 4 + 4);
  assert.deepEqual(weaponAttack('arme à une main', { stats, size: 'average' }), { name: 'Hand Weapon', value: 45, damage: 8 });
  assert.equal(traitOf('Effrayant'), 'Fear');
  assert.equal(traitOf('Instabilité'), 'Unstable');
  assert.equal(traitOf('Aura démoniaque'), null, 'pas d’homonyme sûr : règle spéciale');
});

test('démon majeur (Grand Immonde, p. 262) : Taille Monstrueuse, Blessures × 8, dégâts de mêlée + 2 × BF', () => {
  const stats = convertStats(v2(['84%', '0%', '65%', '68%', '43%', '89%', '89%', '45%']), { M: 4 });
  assert.equal(woundsV5(stats, 'monstrous'), (6 + 2 * 6 + 8) * 8);
  assert.equal(meleeDamage(stats.F, 4, 'monstrous'), 6 + 4 + 12);
  assert.equal(meleeDamage(stats.F, 4, 'large'), 6 + 4 + 6);
});

test('mort-vivant (Zombies momifiés, Seigneur liche p. 102) : « — » et 0 % deviennent absents', () => {
  const stats = convertStats(v2(['25%', '0%', '35%', '35%', '10%', '—', '—', '—']), { M: 4 });
  assert.deepEqual([stats.CT, stats.Int, stats.FM, stats.Soc, stats.Dex], [null, null, null, null, 10]);
  assert.equal(woundsV5(stats, 'average'), 3 + 2 * 3 + 0);
});

test('PNJ humanoïde (Marie la Sanguinaire, p. 23) : compétences homonymes sur la caractéristique V5 + bonus V2, les autres écartées', () => {
  const stats = convertStats(v2(['48%', '28%', '51%', '45%', '53%', '50%', '56%', '41%']), { M: 4 });
  assert.deepEqual(skillOf('Perception +10%', stats), { name: 'Perception', nameFr: 'Perception', value: 63 });
  assert.deepEqual(skillOf('Langue (tiléen)', stats), { name: 'Language (tiléen)', nameFr: 'Langue (tiléen)', value: 50 });
  assert.equal(skillOf('Charisme', stats), null);
  assert.deepEqual(weaponAttack('arme à une main (couperet de boucher)', { stats, size: 'average' }), { name: 'Hand Weapon', value: 48, damage: 9 });
  assert.deepEqual(weaponAttack('deux javelines', { stats, size: 'average' }), { name: 'Javelin', value: 28, damage: 8, rangeYards: 15 });
  assert.equal(weaponAttack('bouclier', { stats, size: 'average' }), null);
});

test('créature volante (Disques de Tzeentch, p. 246) : M au sol et Vol entre parenthèses ; arme naturelle en BF + n', () => {
  assert.deepEqual(v2Movement('1 (15)'), { M: 1, fly: 15 });
  assert.deepEqual(v2Movement('4'), { M: 4, fly: null });
  const stats = convertStats(v2(['35%', '0%', '51%', '56%', '44%', '44%', '58%', '0%']), { M: 1 });
  assert.equal(stats.Soc, null, 'Soc 0 → 10 réservé aux animaux');
  assert.deepEqual(naturalAttack('Bite', { stats, size: 'large', naturalBonus: 3 }), { name: 'Bite', value: 35, damage: 5 + 3 + 5 });
});

test('monture de L27 (Cheval de guerre, règle du 11/11) : Dex absente, I = 15, Soc 0 → 10, inchangé', () => {
  const stats = convertStats([30, 0, 40, 40, 30, 10, 10, 0], { M: 8, animal: true, horse: true });
  assert.deepEqual(stats, { M: 8, CC: 30, CT: null, F: 40, E: 40, I: 15, Ag: 30, Dex: null, Int: 10, FM: 10, Soc: 10 });
  assert.equal(woundsV5(stats, 'large'), (4 + 8 + 1) * 2);
});
