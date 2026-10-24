import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills, readTraitItem } from '../tools/lib/bestiary-profile.mjs';
import { splitGluedTalent, cleanSkills, canonicalTalentName } from '../tools/lib/bestiary-record.mjs';
import { splitSections as blockSections } from '../tools/lib/bestiary-blocks.mjs';

const load = book => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${book}.json`, import.meta.url), 'utf8')).profiles;
const find = (book, id) => load(book).find(profile => profile.id === id);
const names = list => (list || []).map(item => (typeof item === 'string' ? item : item.name));

test('Q33 outil : une description qui commence par « Talents as if… » n\'ouvre pas la rubrique Talents', () => {
  const sections = blockSections(['Traits', 'Fear: The creature causes Fear.', 'Mark of Slaanesh: may purchase the following', 'Talents as if they were Career Advances: Attractive.', 'Night Vision: See clearly.']).sections;
  assert.equal(sections.Talents, undefined);
  assert.match(sections.Traits, /Night Vision/);
});

test('Q33 outil : « Traits and talents », « Blessings », « Miracles: » sont des rubriques', () => {
  const sections = blockSections(['Skills', 'Dodge 40', 'Traits and talents', 'Combat Reflexes: Initiative.', 'Blessings', 'Breath, Courage', 'Miracles:', 'Dooming, Last Rites']).sections;
  assert.ok(sections['Traits and Talents']);
  assert.equal(sections.Blessings, 'Breath, Courage');
  assert.equal(sections.Miracles, 'Dooming, Last Rites');
});

test('Q33 outil : compétences collées, entre parenthèses, lettre isolée, spécialisation sans valeur', () => {
  assert.deepEqual(readSkills('Language (Arabyan 90, Cathayan 95) Leadership 90, Haggle (45), Track 80 r').map(skill => [skill.name, skill.value]),
    [['Language (Arabyan)', 90], ['Language (Cathayan)', 95], ['Leadership', 90], ['Haggle', 45], ['Track', 80]]);
  const unvalued = readSkills('Language (Bretonnian 90, Elthárin, Magick 95)');
  assert.deepEqual(unvalued.filter(skill => skill.unvalued).map(skill => skill.name), ['Language (Elthárin)']);
  assert.deepEqual(cleanSkills(unvalued).unvalued, ['Language (Elthárin)']);
  assert.equal(cleanSkills(unvalued).kept.length, 2);
});

test('Q33 outil : talents collés après une parenthèse, graphies imprimées', () => {
  assert.deepEqual(splitGluedTalent('Acute Sense (Taste) Attractive'), ['Acute Sense (Taste)', 'Attractive']);
  assert.deepEqual(splitGluedTalent('Fearless (Paupers) Read/Write'), ['Fearless (Paupers)', 'Read/Write']);
  assert.equal(canonicalTalentName('Infighter'), 'In-fighter');
  assert.equal(canonicalTalentName('Cat tongued'), 'Cat-tongued');
});

test('Q33 outil : qualités entre parenthèses derrière un Trait d\'attaque', () => {
  assert.deepEqual(readTraitItem('Tail +9 (Pummel)').qualities, ['Pummel']);
  assert.deepEqual(readTraitItem('Weapon (Obsidian Claws) +10 (Hack, Penetrating)').qualities, ['Hack', 'Penetrating']);
  assert.equal(readTraitItem('Bite +9 (see below)').qualities, undefined);
});

test('Q33 Souffle : War Hydra, Sea Dragon, Dragon (L06) l\'ont comme Trait, Hagdar garde ses qualités', () => {
  const breath = profile => profile.traits.find(trait => trait.name === 'Breath');
  assert.equal(breath(find('L09', 'E0-P-319')).param, 'Fire or Poison');
  assert.equal(breath(find('L09', 'E0-P-323')).param, 'Any One');
  assert.equal(breath(find('L06', 'E0-P-082')).param, 'Any One');
  const hagdar = find('L16', 'E0-P-508');
  assert.equal(breath(hagdar).param, 'Brimstone Fire');
  assert.equal(breath(hagdar).rating, '+17');
  assert.deepEqual(hagdar.attacks.find(attack => attack.name === 'Tail').qualities, ['Pummel']);
  assert.deepEqual(hagdar.attacks.find(attack => attack.name === 'Obsidian Claws').qualities, ['Hack', 'Penetrating']);
});

test('Q33 L09 « Traits and Talents » : Demeth, Valerion, Hulreth, Selthira, Haidrath', () => {
  const demeth = find('L09', 'E0-P-345');
  assert.deepEqual(names(demeth.talents), ['Hatred (High Elves)', 'Night Vision', 'Accurate Shot', 'Combat Reflexes', 'Dual Wielder', 'Old Salt', 'Read/Write', 'Sharpshooter', 'Sniper']);
  assert.deepEqual(names(find('L09', 'E0-P-341').talents), ['Hatred (High Elves, Morandors)', 'Night Vision', 'Combat Aware', 'Combat Reflexes', 'Inspiring', 'Menacing', 'Read/Write', 'Shieldsman', 'War Leader']);
  const hulreth = find('L09', 'E0-P-360');
  assert.ok(names(hulreth.talents).includes('In-fighter'));
  assert.deepEqual(names(hulreth.traits), ['Hatred', 'Night Vision', 'Fearless']);
  assert.ok(names(hulreth.skills).includes('Language (Elthárin)') || hulreth.skills.some(skill => skill.name === 'Language (Elthárin)'));
  assert.ok(names(hulreth.skills).includes('Leadership'));
  assert.ok(names(find('L09', 'E0-P-358').talents).includes('Battle Rage'));
  assert.ok(find('L09', 'E0-P-358').skills.some(skill => skill.name === 'Perform (Dance)' && skill.value === 60));
  assert.ok(names(find('L09', 'E0-P-359').talents).includes('Gifts of Khaine'));
});

test('Q33 L09 : Anointed (Mark of Slaanesh, Night Vision, Ward), Doomfire Warlock (7 Traits, dont Ward 8+), Samuril (Dagger), Scorath', () => {
  const anointed = find('L09', 'E0-P-324');
  for (const name of ['Mark of Slaanesh', 'Night Vision', 'Ward']) assert.ok(names(anointed.traits).includes(name), name);
  assert.deepEqual(names(find('L09', 'E0-P-325').traits), ['Afraid', 'Coven Sorcerer', 'Hatred', 'Night Vision', 'Prey of the Dark Prince', 'Venom', 'Ward']);
  assert.deepEqual(find('L09', 'E0-P-353').attacks.map(attack => [attack.name, attack.value, attack.damage]), [['Dagger', 60, 5]]);
  const scorath = find('L09', 'E0-P-354');
  assert.ok(scorath.skills.some(skill => skill.name === 'Melee (Basic)' && skill.value === 68));
  assert.ok(scorath.skills.some(skill => skill.name === 'Track' && skill.value === 80));
  assert.ok(names(scorath.talents).includes('Trick Riding'));
});

test('Q33 L09 : Damina inflige 1 Bleeding par ses coups, Kernethar garde Language (Elthárin) sans valeur', () => {
  const fan = find('L09', 'E0-P-342').attacks.find(attack => /Fan/.test(attack.name));
  assert.deepEqual(fan.inflicts, [{ condition: 'Bleeding', count: 1 }]);
  assert.deepEqual(find('L09', 'E0-P-363').unvaluedSkills, ['Language (Elthárin)']);
  assert.ok(!find('L09', 'E0-P-363').skills.some(skill => skill.value === null));
});

test('Q33 L10 : Cacciatore, Blattner, Jimmi, Trevna, Seiren, Gabriella, Matthias, Emil', () => {
  assert.ok(names(find('L10', 'E0-P-367').talents).includes('Sharpshooter'));
  assert.match(find('L10', 'E0-P-367').notes.join(' '), /Blessings: Breath/);
  assert.ok(names(find('L10', 'E0-P-368').talents).includes('Read/Write'));
  assert.ok(names(find('L10', 'E0-P-377').talents).includes('Acute Sense (Taste)'));
  assert.ok(names(find('L10', 'E0-P-377').talents).includes('Attractive'));
  assert.equal(names(find('L10', 'E0-P-381').talents).filter(name => name === 'Resistant (Poison)').length, 1);
  const seiren = find('L10', 'E0-P-389');
  assert.equal(names(seiren.talents).filter(name => name === 'Resistant (Poison)').length, 1);
  assert.match(seiren.notes.join(' '), /Miracles: Destroy Undead, Dooming, Last Rites/);
  assert.ok(names(find('L10', 'E0-P-383').talents).includes('Fearless (Paupers)'));
  assert.ok(names(find('L10', 'E0-P-383').talents).includes('Read/Write'));
  const matthias = find('L10', 'E0-P-384');
  assert.ok(matthias.skills.some(skill => skill.name === 'Athletics' && skill.value === 40));
  assert.ok(matthias.skills.some(skill => skill.name === 'Haggle' && skill.value === 45));
  assert.ok(matthias.skills.some(skill => skill.name === 'Pick Lock' && skill.value === 42));
  assert.ok(names(matthias.talents).includes('Break and Enter'));
  assert.ok(matthias.trappings.includes('Mercenary Guards'));
  const emil = find('L10', 'E0-P-390');
  assert.deepEqual(emil.attacks.map(attack => attack.name), ['Boat Hook']);
  assert.deepEqual(names(emil.talents).slice(0, 4), ['Criminal', 'Dealmaker', 'Etiquette (Criminals)', 'Gregarious']);
});

test('Q33 L06 : Thug, Vampire, Varghulf, Fenbeast, Halfling Thief', () => {
  assert.ok(find('L06', 'E0-P-069').trappings.includes('Leather Jack'));
  assert.ok(!find('L06', 'E0-P-069').trappings.some(item => /^2 /.test(item)));
  assert.ok(names(find('L06', 'E0-P-070').talents).includes('Resistant (Chaos)'));
  const vampire = find('L06', 'E0-P-099');
  assert.ok(names(vampire.traits).includes('Night Vision'));
  assert.ok(vampire.skills.some(skill => skill.name === 'Track' && skill.value === 40));
  assert.ok(names(find('L06', 'E0-P-100').traits).includes('Hungry'));
  assert.deepEqual(find('L06', 'E0-P-083').attacks[0].qualities, ['Magical']);
});

test('Q33 césures et parasites : In-fighter, Cat-tongued, Plague Monk, Zurn, Porter', () => {
  assert.ok(names(find('L01', 'E0-P-123').talents).includes('In-fighter'));
  assert.ok(names(find('L14', 'E0-P-485').talents).includes('Cat-tongued'));
  assert.ok(find('L16', 'E0-P-512').trappings.includes('Pair of Swords'));
  assert.ok(find('L21', 'E0-P-705').trappings.includes('Sword'));
  const porter = find('L13', 'E0-P-464');
  assert.ok(porter.skills.some(skill => skill.name === 'Gamble' && skill.value === 36));
  assert.ok(porter.skills.some(skill => skill.name === 'Gossip' && skill.value === 46));
});

test('Q33 justifications abusives retirées : Harkon (Vampiric Gaze, Zweihander), Dread Saurian (Hunger)', () => {
  const harkon = find('L07', 'E0-P-250');
  assert.deepEqual(harkon.specialRules, ['Vampiric Gaze']);
  assert.deepEqual(harkon.attacks.filter(attack => attack.trait === 'Weapon').map(attack => [attack.name, attack.damage]), [['Rapier', 10], ['Zweihander', 11]]);
  assert.ok(find('L07', 'E0-P-307').specialRules.includes('Hunger'));
  const justified = readFileSync(new URL('../tools/lib/bestiary-justified.mjs', import.meta.url), 'utf8');
  assert.ok(!/'E0-P-250'/.test(justified));
  assert.ok(!/'E0-P-307'/.test(justified));
});
