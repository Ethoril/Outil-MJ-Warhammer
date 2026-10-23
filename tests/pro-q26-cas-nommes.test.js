import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listTraits, readTalents, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { buildAttacks } from '../tools/lib/bestiary-record.mjs';
import { repairGlyphs } from '../tools/lib/bestiary-glyphs.mjs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const find = (book, id) => load(book).find(profile => profile.id === id);
const names = list => (list || []).map(item => item.name);

test('Q26 outil : le titre qui suit une attaque imprimée (« Weapon (Claws) +11 Toxic Bile: … ») est une règle spéciale', () => {
  const troglodon = listTraits('Bite +11, Weapon (Claws) +11 Toxic Bile: Troglodons can project an acidic toxic bile', 'v4', new Set(['Bite', 'Weapon']), 'traits');
  assert.deepEqual(troglodon.traits.map(trait => [trait.name, trait.param, trait.rating]), [['Bite', undefined, '+11'], ['Weapon', 'Claws', '+11']]);
  assert.deepEqual(troglodon.specialRules, ['Toxic Bile']);
  const flamers = listTraits('Unstable, Weapon +8 Font of Flame: If, at the beginning of its turn', 'v4', new Set(['Weapon', 'Unstable']), 'traits');
  assert.deepEqual(flamers.specialRules, ['Font of Flame']);
  assert.equal(flamers.traits.at(-1).rating, '+8');
});

test('Q26 outil : astérisque final d\'un talent, « Blowpipe +1 (20) », césure d\'un nom d\'arme', () => {
  assert.deepEqual(readTalents('Berserk Charge 3, Strike Mighty Blow 2*'), [{ name: 'Berserk Charge', rank: 3 }, { name: 'Strike Mighty Blow', rank: 2 }]);
  assert.deepEqual(readTalents('Sixth Sense, Strike to Injure.').map(talent => talent.name), ['Sixth Sense', 'Strike to Injure']);
  assert.deepEqual(readTalents('Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death), Attractive').map(talent => talent.name), ['Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death)', 'Attractive']);
  assert.deepEqual(readTraitItem('Blowpipe +1 (20)'), { name: 'Ranged', param: 'Blowpipe', rating: '+1', printed: 20 });
  assert.equal(readTraitItem('Ranged (Repeater Pistol loaded with Aqshy- Infused Powder) +10 (10)').param, 'Repeater Pistol loaded with Aqshy-Infused Powder');
});

test('Q26 outil : une arme imprimée deux fois (« Horns (Tusks) +10 » et « Weapon (Tusks) +10 ») n\'est qu\'une attaque', () => {
  const twice = buildAttacks({ attacks: [] }, [
    { name: 'Horns', param: 'Tusks', rating: '+10' }, { name: 'Weapon', param: 'Tusks', rating: '+10' },
    { name: 'Horns', rating: '+13' }, { name: 'Weapon', param: 'Curling Horns', rating: '+13' },
    { name: 'Ranged', param: 'Warp Blade', rating: '+7' }, { name: 'Weapon', param: 'Warp Blade', rating: '+10' }
  ]);
  assert.deepEqual(twice.map(attack => [attack.name, attack.damage]), [['Tusks', 10], ['Horns', 13], ['Warp Blade', 7], ['Warp Blade', 10]]);
});

test('Q26 glyphe : « Mòna » prend l\'accent grave lu sur la page 216 de Winds of Magic', () => {
  assert.equal(repairGlyphs('M�na Mimn, M�NA MIMN'), 'Mòna Mimn, MÒNA MIMN');
  assert.ok(JSON.stringify(load('L17')).includes('Mòna\'s Marsh Magic'));
  assert.ok(!JSON.stringify(load('L17')).includes('Mána'));
});

test('Q26 L09 : Dark Steed, War Hydra, Sea Dragon, Dockside Thug (pages 45, 47, 50, 86)', () => {
  const steed = find('L09', 'E0-P-315');
  assert.deepEqual(steed.armour.parts.map(part => [part.name, part.ap, part.optional]), [['Light Armour', 1, true], ['Medium Armour', 3, true]]);
  assert.deepEqual(names(steed.traits), ['Bestial', 'Night Vision', 'Size', 'Skittish']);
  assert.equal(steed.optionalTraits[0].param, 'Broken, Drive, Magic, Mount, War');
  const hydra = find('L09', 'E0-P-319');
  assert.deepEqual(hydra.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Talons', 45, 14], ['Bite', 45, 8]]);
  assert.equal(hydra.armour.toughnessBonus, 5);
  assert.deepEqual(names(hydra.skills), ['Stealth (Rural)', 'Track']);
  for (const trait of ['Bestial', 'Constrictor', 'Many Heads', 'Night Vision', 'Regeneration', 'Size', 'Striding Gait', 'Tracker']) assert.ok(names(hydra.traits).includes(trait), trait);
  const dragon = find('L09', 'E0-P-323');
  assert.equal(dragon.stats.M, 10);
  assert.deepEqual(dragon.attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Claws', 70, 25], ['Bite', 70, 10], ['Tail', 70, 9]]);
  assert.deepEqual(dragon.armour, { toughnessBonus: 8, parts: [{ name: 'Scales', ap: 3 }] });
  assert.ok(names(dragon.traits).includes('Marine Creature'));
  const thug = find('L09', 'E0-P-347');
  assert.deepEqual(thug.armour.parts, [{ name: 'Light Armour', ap: 1 }]);
  assert.deepEqual(names(thug.skills), ['Climb', 'Dodge', 'Melee (Basic)', 'Swim']);
});

test('Q26 L09 : Damina (attaque parasite, Bouclier, Strike to Injure) et Kernethar (Arcane Magic, Soul Pact, équipement)', () => {
  const damina = find('L09', 'E0-P-342');
  assert.deepEqual(damina.attacks.map(attack => attack.name), ['Razor-tipped Grand Cathayan Fan', 'Repeater Handbow and Bolts']);
  assert.equal(damina.attacks[0].qualities, undefined);
  // Le Bouclier (+2 PA seulement en Opposition avec Esquive ou Corps à corps) est facultatif et conditionnel : jamais ajouté d'office.
  assert.deepEqual(damina.armour.parts.map(part => [part.name, part.ap, part.optional]), [['Medium Armour', 3, undefined], ['Shield', 2, true]]);
  assert.equal(damina.armour.parts[1].condition, 'when Opposing an attack with Dodge or Melee');
  const worn = buildParticipantFromBestiary('E0-P-342', { library: load('L09') });
  assert.deepEqual(worn.armor, { head: 3, body: 3, arms: 3, legs: 3 });
  assert.ok(names(damina.talents).includes('Strike to Injure'));
  const kernethar = find('L09', 'E0-P-363');
  assert.ok(names(kernethar.talents).includes('Arcane Magic (Dark Magic, Lore of Beasts, Lore of Death)'));
  assert.ok(names(kernethar.talents).includes('Soul Pact (Unaligned Daemon)'));
  assert.ok(kernethar.trappings.includes('Forged Testimonials for \'Malforic Silverblade, Fencing Master\''));
  assert.ok(kernethar.trappings.includes('Traveller\'s Chest with Fine Clothes and Hidden Compartment for Diary'));
});

test('Q26 L11 : Forest Goblin (Trick Riding), Krag-Breaker (Strike Mighty Blow 2, une seule attaque de cornes)', () => {
  assert.deepEqual(names(find('L11', 'E0-P-005').talents), ['Trick Riding']);
  const krag = find('L11', 'E0-P-014');
  assert.deepEqual(krag.talents, [{ name: 'Berserk Charge', rank: 3 }, { name: 'Strike Mighty Blow', rank: 2 }]);
  assert.deepEqual(krag.attacks.map(attack => attack.name), ['Horns']);
  assert.deepEqual(find('L11', 'E0-P-009').attacks.map(attack => attack.name), ['Tusks']);
});

test('Q26 L07 : Chameleon Skink (Blowpipe), Troglodon (Claws, Venom, Toxic Bile), Lord Skrolk (équipement)', () => {
  const skink = find('L07', 'E0-P-263');
  assert.deepEqual(skink.attacks.map(attack => [attack.name, attack.ranged]), [['Blowpipe', true]]);
  const troglodon = find('L07', 'E0-P-306');
  assert.deepEqual(troglodon.attacks.map(attack => [attack.name, attack.damage]), [['Bite', 11], ['Claws', 11]]);
  assert.ok(names(troglodon.traits).includes('Venom'));
  assert.deepEqual(troglodon.specialRules, ['Toxic Bile']);
  assert.deepEqual(find('L07', 'E0-P-248').trappings, ['Filthy Robes', 'Liber Bubonicus', 'Rod of Corruption']);
});

test('Q26 L10 L24 L23 : Crypt Ghast, Allrella, Al Shortbottom', () => {
  const ghast = find('L10', 'E0-P-373');
  for (const trait of ['Bite', 'Fearless', 'Frenzy', 'Hungry', 'Infected', 'Night Vision', 'Venom']) assert.ok(names(ghast.traits).includes(trait), trait);
  assert.deepEqual(names(ghast.optionalTraits), ['Champion', 'Painless']);
  assert.deepEqual(find('L24', 'E0-P-827').attacks, [{ name: 'Dagger', damage: 5, trait: 'Weapon' }]);
  const toll = find('L23', 'E0-P-768');
  assert.deepEqual(toll.attacks.map(attack => [attack.name, attack.damage, attack.ranged]), [['Crossbow', 9, true], ['Dagger', 5, undefined]]);
});

test('Q26 L22 L21 L04 : Dricht (Engineering 71), Flamers (Weapon +8), Gunna (Aqshy-Infused)', () => {
  assert.ok(find('L22', 'E0-P-738').skills.some(skill => skill.name === 'Engineering' && skill.value === 71));
  const flamers = find('L21', 'E0-P-665');
  assert.deepEqual(flamers.attacks.map(attack => [attack.name, attack.damage]), [['Weapon', 8]]);
  assert.deepEqual(flamers.specialRules, ['Font of Flame']);
  assert.equal(find('L04', 'E0-P-172').attacks[0].name, 'Repeater Pistol loaded with Aqshy-Infused Powder');
});

test('Q26 L18 L06 : Grey Seer (« As above » résolu), Human Watchman et Merchant (équipement complet)', () => {
  const seer = find('L18', 'E0-P-557');
  assert.ok(!seer.trappings.includes('As above'));
  assert.ok(seer.trappings.includes('4 Doses of Mandrake Snuff') && seer.trappings.includes('enough Warpstone to double the SL of three Casting/Channelling Tests (WFRP 244)'));
  assert.deepEqual(seer.spells.spells, ['Aethyric Armour', 'Bolt', 'Silence', 'Chain Attack', 'Terrifying']);
  assert.deepEqual(names(seer.skills), ['Channelling', 'Melee (Polearm)', 'Language (Magick)', 'Language (Reikspiel)']);
  assert.ok(find('L06', 'E0-P-067').trappings.includes('Sling Bag containing Lunch') && find('L06', 'E0-P-067').trappings.includes('Uniform'));
  assert.ok(find('L06', 'E0-P-068').trappings.includes('Pouch containing 3d10 Shillings'));
});

test('Q26 participant : le Sea Dragon et la War Hydra donnent des actions utilisables, sans texte de la colonne voisine', () => {
  const library = load('L09');
  const dragon = buildParticipantFromBestiary('E0-P-323', { library });
  assert.deepEqual(dragon.actions.map(action => action.name), ['Claws', 'Bite', 'Tail']);
  const hydra = buildParticipantFromBestiary('E0-P-319', { library });
  assert.deepEqual(hydra.actions.map(action => action.name), ['Talons', 'Bite']);
});
