import test from 'node:test';
import assert from 'node:assert/strict';
import { blockAfter, completenessGaps, normalizeBlockText, printedSkills, printedTalents } from '../tools/lib/bestiary-completeness.mjs';

const CATALOGUE = new Set(['iron will', 'alley cat', 'break and enter', 'master of disguise', 'nose for trouble', 'suffuse with', 'luck', 'fast hands', 'shadow', 'small']);
const JAEGER = normalizeBlockText(' M WS BS S T I Ag Dex Int WP Fel W 5 56 34 33 33 78 78 68 76 66 62 15 Traits: Blessed (Ranald), Dark Vision Skills: Athletics 93, Entertain (Acting 92, Conjuring Tricks 87,Storytelling 92), Language (Thief 96), Melee (Basic 76), Secret Signs (Thief ) 91, Stealth (Urban) 88 Talents: Alley Cat, Break and Enter, Luck 5, Master of Disguise, Nose for Trouble, Shadow Count Jäger Wild-eyed, theatrical, and ostentatiously ragged, old M WS BS S T I Ag Dex Int WP Fel W 4 1 1 1 1 1 1 1 1 1 1 1 Skills: Dodge 40');

test('Q0 : le bloc du profil s’arrête à l’en-tête suivant', () => {
  const block = blockAfter(JAEGER, 0);
  assert.ok(block.includes('Shadow Count'));
  assert.ok(!block.includes('Dodge 40'));
});

test('Q0 : compétences imprimées, avec une ou plusieurs spécialisations', () => {
  const keys = printedSkills(blockAfter(JAEGER, 0)).map(skill => skill.key);
  assert.deepEqual(keys, ['athletics||93', 'entertain|acting|92', 'entertain|conjuringtricks|87', 'entertain|storytelling|92', 'language|thief|96', 'melee|basic|76', 'secretsigns|thief|91', 'stealth|urban|88']);
});

test('Q0 : talents du catalogue imprimés, texte voisin ignoré', () => {
  assert.deepEqual(printedTalents(blockAfter(JAEGER, 0), CATALOGUE), ['alley cat', 'break and enter', 'luck', 'master of disguise', 'nose for trouble', 'shadow']);
});

test('Q0 : manques d’un profil incomplet, et aucun pour un profil complet', () => {
  const block = blockAfter(JAEGER, 0);
  const partial = { skills: [{ name: 'Athletics', value: 93 }, { name: 'Secret Signs (Thief)', value: 91 }], talents: [{ name: 'Alley Cat' }, { name: 'Luck', rank: 5 }, { name: 'Shadow' }] };
  const gaps = completenessGaps(partial, block, CATALOGUE);
  assert.deepEqual(gaps.talents, ['break and enter', 'master of disguise', 'nose for trouble']);
  assert.ok(gaps.skills.includes('Melee (Basic 76)') && gaps.skills.includes('Language (Thief 96)'));
  const full = { skills: printedSkills(block).map(skill => { const [g, s, v] = skill.key.split('|'); return { name: `${g}${s ? ` (${s})` : ''}`, value: Number(v) }; }), talents: ['Alley Cat', 'Break and Enter', 'Luck', 'Master of Disguise', 'Nose for Trouble', 'Shadow'].map(name => ({ name })) };
  assert.deepEqual(completenessGaps(full, block, CATALOGUE), { talents: [], skills: [] });
});

test('Q0 : une césure « Two- handed » est recollée', () => {
  assert.equal(normalizeBlockText('Melee (Two- handed 50)'), 'Melee (Two-handed 50)');
});
