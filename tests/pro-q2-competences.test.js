import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSkills } from '../tools/lib/bestiary-profile.mjs';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const skill = (profile, name) => profile.skills?.find(entry => entry.name === name);

test('Q2 : une compétence à une seule spécialisation garde sa valeur', () => {
  assert.deepEqual(readSkills('Melee (Basic 76)').map(({ name, value }) => ({ name, value })), [{ name: 'Melee (Basic)', value: 76 }]);
  assert.deepEqual(readSkills('Entertain (Taunt) 27, Dodge +10').map(({ name, value }) => ({ name, value })), [{ name: 'Entertain (Taunt)', value: 27 }, { name: 'Dodge', value: 10 }]);
});

test('Q2 : les césures « Two- handed » et « Pole- arm » sont recollées', () => {
  const found = readSkills('Melee (Basic 65, Two- handed 50, Pole- arm 40)').map(({ name, value }) => `${name} ${value}`);
  assert.deepEqual(found, ['Melee (Basic) 65', 'Melee (Two-handed) 50', 'Melee (Polearm) 40']);
  assert.deepEqual(readSkills('Mêlée (Armes d’hast 40)').map(({ name }) => name), ['Mêlée (Armes d’hast)']);
});

test('Q2 : Count Jäger et le Combat Familiar ont leurs compétences', () => {
  const jager = book('L20').find(profile => profile.name === 'Count Jäger');
  assert.equal(skill(jager, 'Language (Thief)')?.value, 96);
  assert.equal(skill(jager, 'Melee (Basic)')?.value, 76);
  const familiar = book('L17').find(profile => profile.name === 'Combat Familiar');
  assert.equal(skill(familiar, 'Melee (Two-handed)')?.value, 50);
});
