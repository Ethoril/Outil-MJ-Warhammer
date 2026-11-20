import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CREATURE_TRAIT_CATALOGUE } from '../../../js/data/creature-trait-catalogue.js';
import {
  readOptionalChoices, optionalCandidates, toggleOptionalTrait, addFreeTrait, toggleOptionalAttack, toggleOptionalArmour
} from '../../../js/core/optional-traits.js';

const racine = new URL('../../../js/data/bestiary/', import.meta.url);
const tous = readdirSync(racine).filter(nom => /^L\d\d\.json$/.test(nom)).flatMap(nom => JSON.parse(readFileSync(new URL(nom, racine), 'utf8')).profiles);
const profilDuBestiaire = id => tous.find(profil => profil.id === id);

const gele = valeur => { if (valeur && typeof valeur === 'object') { Object.values(valeur).forEach(gele); Object.freeze(valeur); } return valeur; };
const fiche = (extra = {}) => gele({
  id: 'E0-P-999', book: 'L99', page: 1, kind: 'profile', name: 'Bete', stats: { M: 4, CC: 40, CT: 0, F: 40, E: 40, I: 30, Ag: 30, Dex: 10, Int: 10, FM: 30, Soc: 10 },
  wounds: 12, traits: [{ name: 'Night Vision' }], optionalTraits: [], attacks: [{ name: 'Bite', damage: 5 }], ...extra
});
const vide = () => readOptionalChoices(null);

describe('traits optionnels : lecture des coches (D14)', () => {
  test('l absence de coches se lit comme vide, sans erreur', () => {
    for (const source of [null, undefined, {}, { extensions: {} }, { extensions: { v5: {} } }, { extensions: { v5: { optionalChoices: null } } }]) {
      assert.deepEqual(readOptionalChoices(source), { traits: [], attacks: [], armour: [] });
    }
  });
  test('une coche enregistrée est relue ; un champ manquant vaut vide', () => {
    const choices = readOptionalChoices({ extensions: { v5: { optionalChoices: { traits: [{ key: 'Fast', name: 'Fast', origin: 'optional' }] } } } });
    assert.equal(choices.traits.length, 1);
    assert.deepEqual(choices.attacks, []);
  });
});

describe('traits optionnels : cases proposées', () => {
  test('profil avec 7 optionnels : 7 cases décochées', () => {
    const record = fiche({ optionalTraits: ['Big', 'Brute', 'Clever', 'Cunning', 'Fast', 'Tough', 'Hardy'].map(name => ({ name })) });
    const cases = optionalCandidates(record, vide());
    assert.equal(cases.length, 7);
    assert.ok(cases.every(item => item.checked === false && item.disabled === false));
  });
  test('profil sans optionnel : aucune case', () => {
    assert.deepEqual(optionalCandidates(fiche(), vide()), []);
    assert.deepEqual(optionalCandidates(null, vide()), []);
  });
  test('Trained (Broken, Mount, War) facultatif : une case par dressage, plus Cavalerie de choc', () => {
    const record = fiche({ optionalTraits: [{ name: 'Trained', param: 'Broken, Mount, War' }] });
    const cases = optionalCandidates(record, vide());
    assert.deepEqual(cases.map(item => item.param), ['Broken', 'Mount', 'War', 'Shock Cavalry']);
    assert.ok(cases.every(item => item.kind === 'trained'));
  });
  test('Cavalerie de choc (Up in Arms p. 107) : grisée tant que Guerre n est pas cochée, puis cochable', () => {
    const record = fiche({ optionalTraits: [{ name: 'Trained', param: 'Broken, Mount, War' }] });
    const choc = choices => optionalCandidates(record, choices).find(item => item.param === 'Shock Cavalry');
    assert.equal(choc(vide()).disabled, true);
    assert.match(choc(vide()).reason, /Guerre/);
    assert.equal(toggleOptionalTrait(record, vide(), 'Trained:Shock Cavalry').ok, false);
    const guerre = toggleOptionalTrait(record, vide(), 'Trained:War');
    assert.equal(choc(guerre.choices).disabled, false);
    const coche = toggleOptionalTrait(record, guerre.choices, 'Trained:Shock Cavalry');
    assert.equal(coche.ok, true);
    assert.equal(choc(coche.choices).checked, true);
    assert.equal(choc(coche.choices).label, 'Dressé (Cavalerie de choc)');
  });
  test('Cavalerie de choc : libre d office quand Guerre est imprimée ; absente sans Monture ou sans Guerre ; pas de doublon', () => {
    const imprime = fiche({ traits: [{ name: 'Trained', param: 'War' }], optionalTraits: [{ name: 'Trained', param: 'Mount' }] });
    assert.equal(optionalCandidates(imprime, vide()).find(item => item.param === 'Shock Cavalry').disabled, false);
    for (const param of ['Broken, War', 'Broken, Mount', 'Guard, Fetch']) {
      const record = fiche({ optionalTraits: [{ name: 'Trained', param }] });
      assert.equal(optionalCandidates(record, vide()).some(item => item.param === 'Shock Cavalry'), false, param);
    }
    const lion = fiche({ optionalTraits: [{ name: 'Trained', param: 'Mount, Shock Cavalry, War' }] });
    assert.equal(optionalCandidates(lion, vide()).filter(item => item.param === 'Shock Cavalry').length, 1);
    const deja = fiche({ traits: [{ name: 'Trained', param: 'Mount, War, Shock Cavalry' }], optionalTraits: [{ name: 'Trained', param: 'Magic' }] });
    assert.equal(optionalCandidates(deja, vide()).some(item => item.param === 'Shock Cavalry'), false);
  });
  test('Cavalerie de choc proposée au Cheval du bestiaire', () => {
    const cheval = tous.find(profil => profil.name === 'Horse' && profil.book === 'L06');
    assert.ok(optionalCandidates(cheval, vide()).some(item => item.param === 'Shock Cavalry'));
  });
  test('un dressage déjà dans les Traits de base est grisé « déjà compté » (D18)', () => {
    const record = fiche({ traits: [{ name: 'Trained', param: 'Broken, Drive' }], optionalTraits: [{ name: 'Trained', param: 'Broken, Mount' }] });
    const cases = optionalCandidates(record, vide());
    assert.equal(cases.find(item => item.param === 'Broken').disabled, true);
    assert.match(cases.find(item => item.param === 'Broken').reason, /déjà compté/);
    assert.equal(cases.find(item => item.param === 'Mount').disabled, false);
  });
  test('un Trait optionnel déjà imprimé en base est grisé', () => {
    const record = fiche({ traits: [{ name: 'Fast' }], optionalTraits: [{ name: 'Fast' }, { name: 'Big' }] });
    const cases = optionalCandidates(record, vide());
    assert.equal(cases.find(item => item.name === 'Fast').disabled, true);
    assert.equal(cases.find(item => item.name === 'Big').disabled, false);
  });
  test('Leader est absent des cases sur une créature Bestial (D17, D26)', () => {
    const bestial = fiche({ traits: [{ name: 'Bestial' }], optionalTraits: [{ name: 'Leader' }, { name: 'Big' }] });
    assert.deepEqual(optionalCandidates(bestial, vide()).map(item => item.name), ['Big']);
    const libre = fiche({ optionalTraits: [{ name: 'Leader' }] });
    assert.deepEqual(optionalCandidates(libre, vide()).map(item => item.name), ['Leader']);
  });
  test('une case par attaque et par pièce d armure optionnelle', () => {
    const record = fiche({
      attacks: [{ name: 'Hand Weapon', damage: 7 }, { name: 'Bow', damage: 7, optional: true, rangeYards: 50 }],
      armour: { toughnessBonus: 3, parts: [{ name: 'Shield', ap: 2, optional: true }, { name: 'Light Armour', ap: 1, optional: true }, { name: 'Hide', ap: 1 }] }
    });
    const cases = optionalCandidates(record, vide());
    assert.deepEqual(cases.map(item => `${item.kind}:${item.name}`), ['attack:Bow', 'armour:Shield', 'armour:Light Armour']);
  });
  test('cas réels : le Géant a 7 cases de Traits ; l âne propose Stubborn ; le Demigryph propose Dressé (Magie)', () => {
    assert.equal(optionalCandidates(profilDuBestiaire('E0-P-084'), vide()).filter(item => item.kind !== 'attack' && item.kind !== 'armour').length, 7);
    assert.deepEqual(optionalCandidates(profilDuBestiaire('E0-P-759'), vide()).map(item => item.name), ['Stubborn']);
    const demi = optionalCandidates(profilDuBestiaire('E0-P-459'), vide());
    assert.deepEqual(demi.map(item => `${item.name}:${item.param}`), ['Trained:Magic']);
  });
});

describe('traits optionnels : cocher', () => {
  test('cocher puis décocher revient à l état de départ', () => {
    const record = fiche({ optionalTraits: [{ name: 'Big' }] });
    const coche = toggleOptionalTrait(record, vide(), 'Big');
    assert.equal(coche.ok, true);
    assert.equal(optionalCandidates(record, coche.choices)[0].checked, true);
    const decoche = toggleOptionalTrait(record, coche.choices, 'Big');
    assert.deepEqual(decoche.choices, vide());
  });
  test('deux Tailles ne peuvent pas être cochées ensemble (D11)', () => {
    const record = fiche({ optionalTraits: [{ name: 'Size', param: 'Large' }, { name: 'Size', param: 'Enormous' }] });
    const premiere = toggleOptionalTrait(record, vide(), 'Size:Large');
    assert.equal(premiere.ok, true);
    const seconde = toggleOptionalTrait(record, premiere.choices, 'Size:Enormous');
    assert.equal(seconde.ok, false);
    assert.match(seconde.error, /Taille/);
  });
  test('cocher une case grisée ou inconnue est refusé', () => {
    const record = fiche({ traits: [{ name: 'Fast' }], optionalTraits: [{ name: 'Fast' }] });
    assert.equal(toggleOptionalTrait(record, vide(), 'Fast').ok, false);
    assert.equal(toggleOptionalTrait(record, vide(), 'Nope').ok, false);
  });
  test('un dressage Monture coché est conservé comme coche de dressage', () => {
    const record = fiche({ optionalTraits: [{ name: 'Trained', param: 'Mount' }] });
    const { ok, choices } = toggleOptionalTrait(record, vide(), 'Trained:Mount');
    assert.equal(ok, true);
    assert.deepEqual(choices.traits.map(item => item.key), ['Trained:Mount']);
  });
  test('Cavalerie de choc se coche', () => {
    const record = fiche({ optionalTraits: [{ name: 'Trained', param: 'Shock Cavalry' }] });
    assert.equal(toggleOptionalTrait(record, vide(), 'Trained:Shock Cavalry').ok, true);
  });
  test('entrées gelées : aucune mutation', () => {
    const record = fiche({ optionalTraits: [{ name: 'Big' }] });
    const choices = gele(vide());
    assert.doesNotThrow(() => toggleOptionalTrait(record, choices, 'Big'));
    assert.doesNotThrow(() => addFreeTrait(record, choices, 'Fast'));
    assert.doesNotThrow(() => optionalCandidates(record, choices));
  });
});

describe('traits optionnels : ajout libre (D3, D12, CA17 à CA19)', () => {
  test('ajout d un Trait sans paramètre', () => {
    const { ok, choices } = addFreeTrait(fiche(), vide(), 'Fast');
    assert.equal(ok, true);
    assert.equal(choices.traits[0].origin, 'free');
    assert.equal(choices.traits[0].name, 'Fast');
  });
  test('ajout par nom français', () => {
    assert.equal(addFreeTrait(fiche(), vide(), 'Rapide').ok, true);
  });
  test('Fear sans valeur est refusé avec un message français sans valeur', () => {
    const resultat = addFreeTrait(fiche(), vide(), 'Fear');
    assert.equal(resultat.ok, false);
    assert.match(resultat.error, /valeur/i);
    assert.match(resultat.error, /Peur/);
  });
  test('Fear avec valeur est accepté', () => {
    const resultat = addFreeTrait(fiche(), vide(), 'Fear', '2');
    assert.equal(resultat.ok, true);
    assert.equal(resultat.choices.traits[0].param, '2');
  });
  test('Taille, Dressé et Haine exigent un paramètre ; une Taille inconnue est refusée', () => {
    for (const name of ['Size', 'Trained', 'Hatred']) assert.equal(addFreeTrait(fiche(), vide(), name).ok, false, name);
    assert.equal(addFreeTrait(fiche(), vide(), 'Size', 'Gigantesque').ok, false);
    assert.equal(addFreeTrait(fiche(), vide(), 'Size', 'Large').ok, true);
    assert.equal(addFreeTrait(fiche(), vide(), 'Hatred', 'Elves').ok, true);
    assert.equal(addFreeTrait(fiche(), vide(), 'Trained', 'War').ok, true);
  });
  test('doublon refusé, paramètre différent accepté (CA19)', () => {
    const premiere = addFreeTrait(fiche(), vide(), 'Fear', '2');
    assert.equal(addFreeTrait(fiche(), premiere.choices, 'Fear', '2').ok, false);
    assert.equal(addFreeTrait(fiche(), premiere.choices, 'Fear', '3').ok, true);
    assert.equal(addFreeTrait(fiche(), vide(), 'Night Vision').ok, false, 'déjà en base');
  });
  test('un Trait déjà coché n est pas ajouté en double', () => {
    const record = fiche({ optionalTraits: [{ name: 'Big' }] });
    const { choices } = toggleOptionalTrait(record, vide(), 'Big');
    assert.equal(addFreeTrait(record, choices, 'Big').ok, false);
  });
  test('une seule Taille parmi les coches et les ajouts', () => {
    const premiere = addFreeTrait(fiche(), vide(), 'Size', 'Large');
    assert.equal(addFreeTrait(fiche(), premiere.choices, 'Size', 'Enormous').ok, false);
  });
  test('Leader refusé à l ajout sur une créature Bestial, accepté sinon', () => {
    const bestial = fiche({ traits: [{ name: 'Bestial' }] });
    const refus = addFreeTrait(bestial, vide(), 'Leader');
    assert.equal(refus.ok, false);
    assert.match(refus.error, /Bestial/);
    assert.equal(addFreeTrait(fiche(), vide(), 'Leader').ok, true);
  });
  test('sans fiche de bestiaire (D25), l ajout fonctionne', () => {
    assert.equal(addFreeTrait(null, vide(), 'Fast').ok, true);
  });
  test('nom inconnu refusé', () => {
    assert.equal(addFreeTrait(fiche(), vide(), 'Inexistant').ok, false);
  });
  test('un Trait ajouté se retire en le décochant', () => {
    const { choices } = addFreeTrait(fiche(), vide(), 'Fast');
    const retire = toggleOptionalTrait(fiche(), choices, choices.traits[0].key);
    assert.deepEqual(retire.choices, vide());
  });
  test('chaque nom du catalogue est ajoutable (avec paramètre au besoin) sur une fiche sans Trait', () => {
    const exemples = { rating: '2', text: 'Elfes', size: 'Large', trained: 'War', hatred: 'Elves' };
    for (const entree of CREATURE_TRAIT_CATALOGUE) {
      const resultat = addFreeTrait(fiche({ traits: [] }), vide(), entree.name, exemples[entree.param]);
      assert.equal(resultat.ok, true, `${entree.name} : ${resultat.error}`);
    }
    // Seul refus de principe : Leader sur une créature Bestial.
    assert.equal(addFreeTrait(fiche({ traits: [{ name: 'Bestial' }] }), vide(), 'Leader').ok, false);
  });
});

describe('traits optionnels : attaques et armure (D4)', () => {
  const record = fiche({
    attacks: [{ name: 'Hand Weapon', value: 35, damage: 7 }, { name: 'Bow and Arrows', value: 35, damage: 7, optional: true, rangeYards: 50, qualities: ['Impale'] }],
    armour: { toughnessBonus: 3, parts: [{ name: 'Light Armour', ap: 1, optional: true }, { name: 'Shield', ap: 2, optional: true, slBonus: 1 }] }
  });
  test('l attaque cochée garde un instantané de l action', () => {
    const { ok, choices } = toggleOptionalAttack(record, vide(), 'Bow and Arrows');
    assert.equal(ok, true);
    assert.equal(choices.attacks.length, 1);
    const action = choices.attacks[0].actions[0];
    assert.equal(action.name, 'Bow and Arrows');
    assert.equal(action.attr, 'CT');
    assert.equal(action.damage, 7);
    assert.equal(action.rangeYards, 50);
    assert.equal(optionalCandidates(record, choices).find(item => item.key === 'attack:Bow and Arrows').checked, true);
    assert.deepEqual(toggleOptionalAttack(record, choices, 'Bow and Arrows').choices, vide());
  });
  test('la pièce cochée garde un instantané de la pièce et de ses zones', () => {
    const { ok, choices } = toggleOptionalArmour(record, vide(), 'Light Armour');
    assert.equal(ok, true);
    assert.equal(choices.armour[0].part.ap, 1);
    assert.deepEqual(choices.armour[0].zones, { head: 1, body: 1, arms: 1, legs: 1 });
    assert.deepEqual(toggleOptionalArmour(record, choices, 'Light Armour').choices, vide());
  });
  test('une attaque ou une pièce non optionnelle ou inconnue est refusée', () => {
    assert.equal(toggleOptionalAttack(record, vide(), 'Hand Weapon').ok, false);
    assert.equal(toggleOptionalArmour(record, vide(), 'Plate').ok, false);
    assert.equal(toggleOptionalAttack(null, vide(), 'Bow').ok, false);
  });
});
