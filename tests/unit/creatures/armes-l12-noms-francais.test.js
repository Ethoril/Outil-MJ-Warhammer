import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { WEAPON_NAMES_FR } from '../../../js/data/weapon-names-fr.js';

const l12 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L12.json', import.meta.url), 'utf8')).profiles;
const names = id => buildParticipantFromBestiary(id, { library: l12 }).actions.map(action => action.name);
const withAttack = name => l12.find(profile => (profile.attacks || []).some(attack => attack.name === name));

test('L12 : Sword et Bow s’affichent Épée et Arc, sans changer valeur ni dégâts', () => {
  const sword = withAttack('Sword'), bow = withAttack('Bow');
  assert.ok(names(sword.id).includes('Épée'));
  assert.ok(names(bow.id).includes('Arc'));
  const action = buildParticipantFromBestiary(sword.id, { library: l12 }).actions.find(a => a.name === 'Épée');
  const printed = sword.attacks.find(a => a.name === 'Sword');
  assert.equal(action.damage, printed.damage);
  assert.equal(action.extensions.v5.sourceName, 'Sword');
});

test('L12 : inventaire des armes anglaises sans traduction (informatif)', () => {
  const missing = new Set();
  for (const profile of l12) for (const attack of profile.attacks || []) if (!attack.nameFr && !Object.hasOwn(WEAPON_NAMES_FR, attack.name.toLowerCase())) missing.add(attack.name);
  console.log('Sans traduction :', [...missing].join(' | '));
  assert.ok(missing.size > 0);
});
