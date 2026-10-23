import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTrappings, readSpells } from '../tools/lib/bestiary-profile.mjs';
import { pageBlocks } from '../tools/lib/bestiary-blocks.mjs';

const profiles = JSON.parse(readFileSync('js/data/bestiary/L14.json', 'utf8')).profiles;
const byId = id => profiles.find(profile => profile.id === id);
const SEA_WARDENS = [472, 473, 474, 475, 476, 477, 479, 480, 482, 484, 485, 486].map(n => `E0-P-${n}`);

test('Q5 : les 12 profils des Sea Wardens ont attaques, compétences et talents', () => {
  for (const id of SEA_WARDENS) {
    const profile = byId(id);
    assert.ok(profile.attacks?.length, `${id} attaques`);
    assert.ok(profile.skills?.length >= 14, `${id} compétences`);
    assert.ok(profile.talents?.length >= 9, `${id} talents`);
  }
});

test('Q5 : Prince Dalroth (L14 p.45) est complet', () => {
  const dalroth = byId('E0-P-476');
  assert.deepEqual(dalroth.attacks.map(({ name, damage }) => `${name} +${damage}`), ['Elf Bow +8', 'Blade of Darting Steel +8']);
  assert.equal(dalroth.skills.length, 30);
  assert.equal(dalroth.talents.length, 12);
  assert.equal(dalroth.skills.find(skill => skill.name === 'Melee (Fencing)').value, 88);
  assert.equal(dalroth.skills.find(skill => skill.name === 'Intuition').value, 86);
  assert.ok(dalroth.talents.some(talent => talent.name === 'Warrior Born'));
  assert.equal(dalroth.trappings[0], 'Blade of Darting Steel');
  assert.equal(dalroth.stats.CC, 73);
});

test('Q5 : la ligne « Obsession » et l\'état Yenlui ne coupent plus le bloc (Dalloran)', () => {
  const dalloran = byId('E0-P-472');
  assert.ok(dalloran.skills.length >= 30);
  assert.ok(dalloran.talents.some(talent => talent.name === 'Wealthy'));
  assert.ok(dalloran.trappings.includes('Shield'));
});

test('Q5 : fin de mot sur la gouttière et listes de Lores (Revna, Torrelain)', () => {
  assert.ok(byId('E0-P-485').trappings.includes('Sling with Stone Bullets'));
  const torrelain = byId('E0-P-480');
  assert.ok(torrelain.trappings.includes('Sultry Clothing'));
  assert.deepEqual(torrelain.spells['Lore of Shadows'], ['Doppelganger', 'Illusion', 'Mindslip', 'Shadowstep']);
});

test('Q5 : la phrase d\'introduction de l\'équipement n\'est pas un objet', () => {
  const { items } = readTrappings('Whilst Dalroth could equip himself with any assets available from the palace, he can be expected to have the following items to hand: Blade of Darting Steel, Lance');
  assert.deepEqual(items, ['Blade of Darting Steel', 'Lance']);
  assert.deepEqual(readTrappings('Sword, Shield').items, ['Sword', 'Shield']);
});

test('Q5 : un texte avant le premier intitulé de sorts reste une liste simple', () => {
  const spells = readSpells({ Spells: 'Petty: Bearings, Dazzle Lore of Light: Pierce the Veil' });
  assert.deepEqual(spells.spells, ['Petty: Bearings', 'Dazzle']);
  assert.deepEqual(spells['Lore of Light'], ['Pierce the Veil']);
});

test('Q5 : un bloc dont la richesse suit un blanc garde son corps', () => {
  const page = [
    ' PRINCE TEST -- NOBLE',
    ' M WS BS S T I Ag Dex Int WP Fel W',
    '  5 73 41 31 31 76 42 55 34 40 42 13',
    '',
    'Gold 3',
    'Traits: Weapon (Sword) +7',
    '',
    'Yenlui State: Dark (-1 SL to Toughness)',
    '',
    'Skills: Cool 50, Dodge 52',
    '',
    'Talents: Luck, Noble Blood'
  ].join('\n');
  const [block] = pageBlocks(page);
  assert.match(block.body, /^Gold 3 Traits: Weapon \(Sword\) \+7 Yenlui State/);
  assert.match(block.body, /Skills: Cool 50, Dodge 52 Talents: Luck, Noble Blood$/);
});
