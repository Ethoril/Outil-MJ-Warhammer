import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSpells, canonicalSpellLabel, spellNames } from '../tools/lib/bestiary-profile.mjs';
import { printedSpells, recordSpellKeys } from '../tools/lib/bestiary-completeness.mjs';
import { buildParticipantFromBestiary, buildReserveProfileFromBestiary, bestiarySpellLines } from '../js/core/bestiary-profiles.js';

const load = id => JSON.parse(readFileSync(new URL(`../js/data/bestiary/${id}.json`, import.meta.url), 'utf8')).profiles;
const byId = (profiles, id) => profiles.find(profile => profile.id === id);
const library = ['L07', 'L14', 'L17', 'L19', 'L26'].flatMap(load);

// Faux DOM minimal : assez pour lire le texte rendu.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; }
  set textContent(value) { this.text = String(value); }
  get textContent() { return (this.text ?? '') + this.children.map(child => child.textContent).join(' '); }
  append(...nodes) { this.children.push(...nodes); }
}

test('Q14 outil : intitulés canoniques (Petty, Arcane, Lore of X, Domaine seul)', () => {
  assert.equal(canonicalSpellLabel('Petty Magic Spells'), 'Petty');
  assert.equal(canonicalSpellLabel('Petty Spells'), 'Petty');
  assert.equal(canonicalSpellLabel('Arcane Spells'), 'Arcane');
  assert.equal(canonicalSpellLabel('Arcane Magic and Lore Spells'), 'Arcane and Lore');
  assert.equal(canonicalSpellLabel('Lore of Death Magic'), 'Lore of Death');
  assert.equal(canonicalSpellLabel('Lore of Dark Magic'), 'Lore of Dark Magic');
  assert.equal(canonicalSpellLabel('Lore of Life Spells'), 'Lore of Life');
  assert.equal(canonicalSpellLabel('Witchcraft'), 'Lore of Witchcraft');
});

test('Q14 outil : numéros de page, renvois et césures ne sont pas des sorts', () => {
  assert.deepEqual(spellNames('Bless with Filth (page 109), Creeping Menace, Curse of 110 Crippling Pain, Curse of Ill- Fortune 137.'), ['Bless with Filth', 'Creeping Menace', 'Curse of Crippling Pain', 'Curse of Ill-Fortune']);
  assert.deepEqual(spellNames('Aethyric Armour, Ygethmor\'s Flaming Blizzard (see page 137)'), ['Aethyric Armour', 'Ygethmor\'s Flaming Blizzard']);
});

test('Q14 outil : les listes collées sont séparées, la prose va dans notes, jamais dans une liste', () => {
  const spells = readSpells({ Spells: 'Petty: Dart, Drain Arcane: Blast, Ward Light: Banishment Witchcraft: Blight', Arcane: 'Bolt, Ward Lore of Metal: Enchant Weapon' });
  assert.deepEqual(spells.Petty, ['Dart', 'Drain']);
  assert.deepEqual(spells.Arcane, ['Blast', 'Ward', 'Bolt']);
  assert.deepEqual(spells['Lore of Light'], ['Banishment']);
  assert.deepEqual(spells['Lore of Witchcraft'], ['Blight']);
  assert.deepEqual(spells['Lore of Metal'], ['Enchant Weapon']);
  const prose = readSpells({ Spells: 'Choose up to 3 spells from the Petty Magic list and up to 3 from a suitable magical Lore.' });
  assert.deepEqual(Object.keys(prose), ['notes']);
  // Une phrase du texte voisin qui commence par « Spells » n'est pas une liste (Doomfire Warlock, L09 p. 52).
  assert.deepEqual(readSpells({ Spells: 'from Colour Magic Lores, the Lore of Witchcraft' }), {});
});

test('Q14 L26 : Eusapia (p. 48, intitulé SPELLS centré) a ses trois listes', () => {
  const eusapia = byId(library, 'E0-P-940');
  assert.deepEqual(eusapia.spells, {
    Petty: ['Bearings', 'Careful Step', 'Dart', 'Warning'],
    Arcane: ['Bolt', 'Dark Vision', 'Terrifying', 'Ward'],
    'Lore of Beasts': ['Beast Master', 'Beast Tongue', 'Flock of Doom', 'The Amber Spear']
  });
  assert.ok(!eusapia.trappings.some(item => /Bearings|Petty|SPELLS/.test(item)));
});

test('Q14 L14 : Litharys a Petty et Lore of Heavens', () => {
  const litharys = byId(library, 'E0-P-475');
  assert.equal(litharys.spells.Petty.length, 8);
  assert.ok(litharys.spells['Lore of Heavens'].includes('Divination'));
});

test('Q14 L07 : la Brine Wife a ses listes après un blanc (Witchcraft, Necromancy)', () => {
  const brine = byId(library, 'E0-P-251');
  assert.deepEqual(brine.spells['Lore of Necromancy'], ['Raise Dead', 'Reanimate', 'Vanhel\'s Call']);
  assert.ok(brine.spells['Lore of Witchcraft'].includes('The Evil Eye'));
});

test('Q14 L17 / L19 : un Lore collé à la liste Arcane en est séparé, « Arcane and Lore » reste une liste', () => {
  const gelt = byId(library, 'E0-P-517');
  assert.ok(!gelt.spells.Arcane.some(name => /Lore of/.test(name)));
  assert.ok(gelt.spells['Lore of Metal'].includes('Crucible of Chamon'));
  const flett = byId(library, 'E0-P-594');
  assert.deepEqual(flett.spells.Petty, ['Drain', 'Produce Small Animal', 'Rot']);
  assert.ok(flett.spells['Arcane and Lore'].includes('Bless with Filth'));
  assert.ok(!flett.talents.some(talent => /Petty Magic Petty Magic/.test(talent.name)));
});

test('Q14 : un sort n\'est jamais un talent ni un objet', () => {
  for (const profile of library) {
    const spellNamesOf = Object.values(profile.spells || {}).flat();
    const talentNames = (profile.talents || []).map(talent => talent.name);
    for (const name of ['Bearings', 'Careful Step', 'Dazzle']) {
      if (spellNamesOf.includes(name)) {
        assert.ok(!talentNames.includes(name), `${profile.id} ${name} talent`);
        assert.ok(!(profile.trappings || []).some(item => item.includes(name)), `${profile.id} ${name} équipement`);
      }
    }
  }
});

test('Q14 participant : les sorts du profil sont dans extensions.v5.bestiary.spells, pas dans participant.spells', () => {
  const participant = buildParticipantFromBestiary('E0-P-940', { library });
  assert.deepEqual(participant.extensions.v5.bestiary.spells.Petty, ['Bearings', 'Careful Step', 'Dart', 'Warning']);
  // participant.spells ouvrirait la Focalisation et le choix de sort avec des noms anglais sans contrat.
  assert.equal(participant.spells, undefined);
  assert.notEqual(participant.extensions.v5.bestiary.spells, byId(library, 'E0-P-940').spells);
  const reserve = buildReserveProfileFromBestiary('E0-P-940', { library });
  assert.deepEqual(reserve.extensions.v5.bestiary.spells['Lore of Beasts'].length, 4);
  assert.equal(buildParticipantFromBestiary('E0-P-475', { library }).extensions.v5.bestiary.spells.Petty.length, 8);
});

test('Q14 régénération : L06 (Dragon, Dog) et L16 (Brokk, Thurma, Nanna) gardent ce que Q13 leur avait fait perdre', () => {
  const core = load('L06');
  const dragon = byId(core, 'E0-P-082');
  assert.deepEqual(dragon.attacks.map(attack => attack.name), ['Claws', 'Bite', 'Tail']);
  assert.equal(dragon.attacks[1].free, 'momentum');
  const dog = byId(core, 'E0-P-074');
  assert.ok(dog.optionalTraits.some(trait => trait.name === 'Trained' && /Drive/.test(trait.param)));
  const dwarfs = load('L16');
  assert.ok(byId(dwarfs, 'E0-P-498').trappings.includes('Crown of Karak Norn'));
  assert.ok(byId(dwarfs, 'E0-P-499').trappings.includes('Bronze belt inscribed with 2 Runes of Warding'));
  assert.ok(byId(dwarfs, 'E0-P-502').trappings.includes('Bandages'));
});

test('Q14 contrôle : le champ spells par liste est lu, la prose de notes n\'est pas un sort', () => {
  const keys = recordSpellKeys({ spells: { Petty: ['Bearings'], 'Lore of Life': ['Barkskin'], spells: ['Dart'], notes: ['Choose up to 3 spells'] } });
  assert.deepEqual([...keys].sort(), ['barkskin', 'bearings', 'dart']);
  assert.deepEqual(printedSpells('Spells Petty: Bearings, Dart Trappings Dagger, Robes').map(spell => spell.label), ['Bearings', 'Dart']);
});

test('Q14 lecture : bestiarySpellLines écrit une ligne par liste', () => {
  assert.deepEqual(bestiarySpellLines({ Petty: ['A', 'B'], 'Lore of Life': ['C'], spells: ['D'], notes: ['Choose up to 3 spells.'], vide: [] }), ['Petty : A, B', 'Lore of Life : C', 'Sorts : D', 'Choose up to 3 spells.']);
  assert.deepEqual(bestiarySpellLines(undefined), []);
});

test('Q14 fiche de la bibliothèque et fiche du participant : les sorts sont affichés', async () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const { renderBestiarySheet } = await import('../js/ui/bestiary-library.js');
    const sheet = renderBestiarySheet(byId(library, 'E0-P-940'), { terms: new Map() });
    assert.match(sheet.textContent, /Sorts : Petty : Bearings, Careful Step, Dart, Warning ; Arcane : Bolt/);
    const { renderFicheDetails } = await import('../js/ui/fiche-details.js');
    const participant = buildParticipantFromBestiary('E0-P-940', { library });
    const details = renderFicheDetails(participant);
    assert.match(details.textContent, /Sorts du profil \(bestiaire\) \(3\)/);
    assert.match(details.textContent, /Lore of Beasts/);
    assert.match(details.textContent, /Beast Master, Beast Tongue, Flock of Doom, The Amber Spear/);
  } finally {
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
});
