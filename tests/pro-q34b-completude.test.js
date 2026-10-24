import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JUSTIFIED_Q34 } from '../tools/lib/bestiary-justified.mjs';

const profile = (book, id) => JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')).profiles.find(item => item.id === id);

test('Q34b : le comte Alberich (L10 p.9) garde l\'épée « The Stirland Runefang, Orc Hewer » en un objet et ses titres entiers', () => {
  const trappings = profile('L10', 'E0-P-364').trappings;
  assert.ok(trappings.includes('The Stirland Runefang, Orc Hewer'));
  assert.ok(trappings.includes('Wardenship of the River Stir') && trappings.includes('Royal Garb (Best Quality)'));
  assert.ok(!trappings.includes('Orc Hewer') && !trappings.includes('Wardenship of the'));
});

test('Q34b : le Drakenhund (L10 p.38) a ses Traits facultatifs et le Talent Sixth Sense à part', () => {
  const drakenhund = profile('L10', 'E0-P-369');
  assert.ok(drakenhund.optionalTraits.some(trait => trait.name === 'Trained' && /Heel/.test(trait.param)));
  assert.deepEqual(drakenhund.optionalTalents, [{ name: 'Sixth Sense' }]);
  assert.ok(!drakenhund.optionalTraits.some(trait => trait.name === 'Sixth Sense'));
});

test('Q34b : « Optional » seul sur sa ligne ouvre les Traits facultatifs (Crypt Ghast p.68, Patchwork Man p.74)', () => {
  assert.deepEqual(profile('L10', 'E0-P-373').optionalTraits.map(trait => trait.name), ['Champion', 'Painless']);
  assert.deepEqual(profile('L10', 'E0-P-371').optionalTraits.map(trait => trait.name), ['Champion', 'Hatred', 'Spellcaster', 'Fear']);
  const patchwork = profile('L10', 'E0-P-375').optionalTraits.map(trait => trait.name);
  assert.ok(patchwork.includes('Infestation') && patchwork.includes('Stealthy'));
});

test('Q34b : Mancatcher (L11 p.13) garde Venom, la règle Spiteful et son Trait Dressé sans la prose voisine', () => {
  const spider = profile('L11', 'E0-P-003');
  assert.ok(spider.traits.some(trait => trait.name === 'Venom'));
  assert.deepEqual(spider.specialRules, ['Spiteful']);
  assert.deepEqual(spider.optionalTraits.find(trait => trait.name === 'Trained').param, 'Broken, Guard, Magic, Mount, War');
});

test('Q34b : les listes Trained (Griffon L11, Roc L07) sont complètes', () => {
  assert.equal(profile('L07', 'E0-P-253').optionalTraits.find(trait => trait.name === 'Trained').param, 'Broken, Drive, Magic, War');
  assert.ok(profile('L11', 'E0-P-011').optionalTraits.some(trait => trait.name === 'Trained'));
});

test('Q34b : les justifications citent la page du livre', () => {
  for (const id of ['E0-P-271', 'E0-P-287', 'E0-P-311', 'E0-P-312', 'E0-P-313', 'E0-P-315', 'E0-P-318', 'E0-P-354', 'E0-P-364', 'E0-P-368', 'E0-P-373', 'E0-P-386', 'E0-P-052']) {
    const reason = Object.values(JUSTIFIED_Q34[id]).join(' ');
    assert.match(reason, /L(?:07|09|10|11) p\.\d+/, id);
  }
});

test('Q34b : Venom Spiteful (L11 p.13) : le tiret de la règle ne coupe pas les Traits des autres profils', () => {
  const wolf = profile('L11', 'E0-P-052');
  assert.ok(wolf.traits.some(trait => trait.name === 'Disruption'));
  assert.ok(!wolf.traits.some(trait => trait.name === 'Unstable'));
});
