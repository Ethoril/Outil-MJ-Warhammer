import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { normalizeBlockText, printedRanges } from '../tools/lib/bestiary-completeness.mjs';
import { readTraitItem } from '../tools/lib/bestiary-profile.mjs';

const BOOKS = ['L01', 'L02', 'L03', 'L04', 'L07', 'L11', 'L12', 'L13', 'L14', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L25', 'L26'];
const library = BOOKS.flatMap(id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles);
const byId = id => library.find(profile => profile.id === id);

// Q41 : « Ranged (Bow) +7 (50) » (V4) : le nombre entre parenthèses est la portée en yards.

test('Q41 lecture : portée après les dégâts, avant les dégâts, astérisque', () => {
  assert.deepEqual(readTraitItem('Ranged (Bow) +7 (50)'), { name: 'Ranged', rating: '+7', param: 'Bow', printed: 50 });
  assert.equal(readTraitItem('Ranged (Dwarf Crossbow) (80) +10 (Damaging, Impale, Reload 1)').printed, 80);
  assert.equal(readTraitItem('Ranged (Longbow) +10* (100)').printed, 100);
});

test('Q41 L04 E0-P-176 et L03 E0-P-157 : portée sur le profil et sur le participant (action à distance, CT)', () => {
  const bow = byId('E0-P-176').attacks.find(attack => attack.name === 'Bow');
  assert.equal(bow.rangeYards, 50);
  const outlaw = buildParticipantFromBestiary('E0-P-176', { library });
  const action = outlaw.actions.find(item => item.name === 'Bow');
  assert.equal(action.rangeYards, 50);
  assert.equal(action.attr, 'CT');
  assert.equal(outlaw.actions.find(item => item.name === 'Dagger').rangeYards ?? null, null);
  assert.equal(byId('E0-P-157').attacks.find(attack => attack.name === 'Pistol').rangeYards, 20);
  assert.equal(buildParticipantFromBestiary('E0-P-157', { library }).actions.find(item => item.name === 'Pistol').rangeYards, 20);
});

test('Q41 L11 E0-P-044 : « Longbow +10* (100) » avec astérisque', () => {
  assert.equal(byId('E0-P-044').attacks.find(attack => attack.name === 'Longbow').rangeYards, 100);
});

test('Q41 : toute arme à distance dont la portée est imprimée la garde (la ligne du livre fait foi, 39 sans portée imprimée)', () => {
  const ranged = library.flatMap(profile => (profile.attacks || []).filter(attack => attack.trait === 'Ranged').map(attack => ({ profile, attack })));
  const withRange = ranged.filter(item => item.attack.rangeYards > 0);
  assert.ok(withRange.length >= 80, `portées gardées : ${withRange.length}`);
  assert.ok(withRange.every(item => Number.isInteger(item.attack.rangeYards)));
});

test('Q41 contrôle : printedRanges lit les trois formes imprimées', () => {
  const block = normalizeBlockText('Traits: Armour (Leather) 1, Ranged (Bow) +7 (50), Ranged (Dwarf Crossbow) (80) +10 (Impale), Ranged (Longbow) +10* (100), Weapon (Sword) +8 Skills: Dodge 40');
  assert.deepEqual(printedRanges(block).map(item => [item.name, item.range]), [['Bow', 50], ['Dwarf Crossbow', 80], ['Longbow', 100]]);
});

// Faux DOM minimal : assez pour lire le texte rendu.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; }
  set textContent(value) { this.text = String(value); }
  get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(' '); }
  append(...nodes) { this.children.push(...nodes); }
}

test('Q41 Points de Destin imprimés (Brunner L04 p.111, Gotrek L16 p.79) gardés et affichés sur la fiche', async () => {
  assert.equal(byId('E0-P-179').fatePoints, 2);
  assert.equal(byId('E0-P-504').fatePoints, 3);
  assert.equal(byId('E0-P-176').fatePoints, undefined);
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../js/ui/bestiary-library.js');
    const text = renderBestiarySheet(byId('E0-P-179'), { terms: new Map() }).textContent;
    assert.match(text, /Points de Destin imprimés : 2/);
    assert.match(text, /portée 10 yards/);
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
