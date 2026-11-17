import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CREATURE_TRAIT_CATALOGUE, catalogueTraitOf } from '../../../js/data/creature-trait-catalogue.js';
import { OPTIONAL_TRAIT_MODIFIERS, OPTIONAL_TRAINED_MODIFIERS, OPTIONAL_TRAIT_MODELS } from '../../../js/data/optional-trait-modifiers.js';

const racine = new URL('../../../', import.meta.url);
const lire = chemin => JSON.parse(readFileSync(new URL(chemin, racine), 'utf8'));
const livre = code => lire(`js/data/bestiary/${code}.json`);
const profil = (code, id) => livre(code).profiles.find(item => item.id === id);

describe('traits optionnels : corrections D15', () => {
  test('Stubborn est un Trait facultatif de l\'âne et de la mule', () => {
    const ane = profil('L23', 'E0-P-759');
    assert.ok(ane.optionalTraits.some(trait => trait.name === 'Stubborn'));
    assert.ok(!ane.traits.some(trait => trait.name === 'Stubborn'), 'facultatif, pas de base');
  });
  test('le Demigryph propose Dressé (Magie) en facultatif', () => {
    const demigryph = profil('L13', 'E0-P-459');
    assert.ok(demigryph.optionalTraits.some(trait => trait.name === 'Trained' && trait.param === 'Magic'));
    assert.equal(demigryph.traits.find(trait => trait.name === 'Trained').param, 'Broken, Mount, Shock Cavalry, War');
  });
  test('le Cheval de trait lourd a la liste de dressages « Broken, Drive » sans virgule parasite', () => {
    const cheval = profil('L23', 'E0-P-763');
    assert.equal(cheval.traits.find(trait => trait.name === 'Trained').param, 'Broken, Drive');
    assert.deepEqual(cheval.optionalTraits.map(trait => `${trait.name} ${trait.param}`), ['Trained Mount']);
  });
});

describe('traits optionnels : catalogue des Traits', () => {
  const noms = new Set();
  for (const fichier of readdirSync(new URL('js/data/bestiary/', racine)).filter(nom => /^L\d+\.json$/.test(nom))) {
    for (const fiche of livre(fichier.replace('.json', '')).profiles) for (const trait of [...(fiche.traits || []), ...(fiche.optionalTraits || [])]) noms.add(trait.name);
  }
  test('les 124 noms du bestiaire (avant D15) et Stubborn sont au catalogue', () => {
    noms.add('Stubborn');
    assert.equal(noms.size, 125);
    for (const nom of noms) assert.ok(catalogueTraitOf(nom), `Trait absent du catalogue : ${nom}`);
    assert.equal(CREATURE_TRAIT_CATALOGUE.length, noms.size);
  });
  test('chaque entrée a un nom français, un texte, un livre, une page et une nature de paramètre valide', () => {
    const natures = new Set(['none', 'rating', 'text', 'size', 'trained', 'hatred']);
    for (const entree of CREATURE_TRAIT_CATALOGUE) {
      assert.ok(entree.nameFr && entree.summaryFr && entree.book && Number.isInteger(entree.page), entree.name);
      assert.ok(natures.has(entree.param), `${entree.name} : ${entree.param}`);
    }
    assert.equal(catalogueTraitOf('Size').param, 'size');
    assert.equal(catalogueTraitOf('Trained').param, 'trained');
    assert.equal(catalogueTraitOf('Hatred').param, 'hatred');
    assert.equal(catalogueTraitOf('Fear').param, 'rating');
  });
  test('Stubborn : texte rédigé, nom français proposé ; recherche par nom français', () => {
    const entree = catalogueTraitOf('stubborn');
    assert.equal(entree.nameFrSource, 'proposition');
    assert.equal(entree.ref, null);
    assert.equal(catalogueTraitOf('coriace').name, 'Tough');
    assert.equal(catalogueTraitOf('Endurant').name, 'Hardy');
    assert.equal(catalogueTraitOf('inconnu'), null);
  });
  test('le fichier généré n\'importe rien', () => {
    const texte = readFileSync(new URL('js/data/creature-trait-catalogue.js', racine), 'utf8');
    assert.doesNotMatch(texte, /^\s*import\s/m);
    assert.doesNotMatch(texte, /\bimport\(/);
  });
});

describe('traits optionnels : table des modificateurs', () => {
  test('valeurs de valeurs-traits.md (L11 et Livre de base français)', () => {
    const attendu = {
      Big: { F: 10, E: 10, Ag: -5 }, Brute: { M: -1, Ag: -10, F: 10, E: 10 }, Clever: { Int: 20, I: 10 }, Cunning: { Soc: 10, Int: 10, I: 10 },
      Fast: { M: 1, Ag: 10 }, Tough: { E: 10, FM: 10 }, Hardy: {}
    };
    assert.deepEqual(Object.keys(OPTIONAL_TRAIT_MODIFIERS).sort(), Object.keys(attendu).sort());
    for (const [nom, stats] of Object.entries(attendu)) assert.deepEqual({ ...OPTIONAL_TRAIT_MODIFIERS[nom].stats }, stats, nom);
    assert.equal(OPTIONAL_TRAIT_MODIFIERS.Hardy.wounds.rule, 'hardy');
    assert.deepEqual({ ...OPTIONAL_TRAINED_MODIFIERS.War.stats }, { CC: 10 });
  });
  test('noms français du Livre de base français, source et page sur chaque ligne', () => {
    const noms = { Big: 'Grand', Brute: 'Brutal', Clever: 'Intelligent', Cunning: 'Rusé', Fast: 'Rapide', Tough: 'Coriace', Hardy: 'Endurant' };
    for (const [nom, fr] of Object.entries(noms)) assert.equal(OPTIONAL_TRAIT_MODIFIERS[nom].nameFr, fr);
    assert.equal(OPTIONAL_TRAIT_MODELS.Elite.nameFr, 'Élite');
    assert.equal(OPTIONAL_TRAIT_MODELS.Leader.nameFr, 'Meneur');
    assert.equal(OPTIONAL_TRAINED_MODIFIERS.War.nameFr, 'Guerre');
    for (const ligne of [...Object.values(OPTIONAL_TRAIT_MODIFIERS), ...Object.values(OPTIONAL_TRAINED_MODIFIERS), ...Object.values(OPTIONAL_TRAIT_MODELS)]) {
      assert.ok(ligne.source.book && Number.isInteger(ligne.source.page));
    }
    assert.equal(catalogueTraitOf('Hardy').nameFr, 'Endurant');
    assert.equal(catalogueTraitOf('Tough').nameFr, 'Coriace');
  });
  test('modèles Elite et Leader égaux aux gabarits E0-P-114 et E0-P-115 de L06.json', () => {
    const l06 = livre('L06');
    for (const modele of Object.values(OPTIONAL_TRAIT_MODELS)) {
      const gabarit = l06.profiles.find(item => item.id === modele.templateId);
      assert.deepEqual({ ...modele.stats }, gabarit.modifiers, modele.label);
      assert.deepEqual(modele.skills.map(item => [item.name, item.value]), gabarit.skills.map(item => [item.name, item.value]), `${modele.label} : compétences`);
      assert.deepEqual(modele.talents.map(item => item.name), gabarit.talents.map(item => item.name), `${modele.label} : Talents`);
    }
    assert.deepEqual({ ...OPTIONAL_TRAIT_MODELS.Elite.stats }, { CC: 15, F: 15, E: 15, I: 15, FM: 15 });
    assert.deepEqual({ ...OPTIONAL_TRAIT_MODELS.Leader.stats }, { CC: 20, CT: 20, F: 20, E: 20, I: 20, Ag: 20, FM: 20, Soc: 10 });
    assert.equal(OPTIONAL_TRAIT_MODELS.Leader.blockedByTrait, 'Bestial');
  });
  test('table gelée, sans import', () => {
    assert.ok(Object.isFrozen(OPTIONAL_TRAIT_MODIFIERS) && Object.isFrozen(OPTIONAL_TRAIT_MODIFIERS.Big.stats));
    assert.ok(Object.isFrozen(OPTIONAL_TRAIT_MODELS.Leader.skills[0]));
    const texte = readFileSync(new URL('js/data/optional-trait-modifiers.js', racine), 'utf8');
    assert.doesNotMatch(texte, /^\s*import\s/m);
  });
});
