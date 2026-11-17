import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { deriveReminders } from '../../../js/core/reminders.js';
import { CREATURE_TRAIT_CATALOGUE } from '../../../js/data/creature-trait-catalogue.js';
import { catalogueReminders, TRAITS_APPLIED_BY_TOOL } from '../../../js/core/optional-traits.js';

const PARAMS = { none: '', rating: '3', text: 'test', size: 'Large', trained: 'War', hatred: 'Elves' };
const texteDe = entree => (entree.param === 'none' ? entree.name : `${entree.name} (${PARAMS[entree.param]})`);
const participant = (traits, extra = {}) => ({ id: 'p1', name: 'Bete', kind: 'Créature', traits, extensions: {}, ...extra });
const rappels = person => deriveReminders({ participants: [person] }, { type: 'participant', id: 'participant:p1' });
const duCatalogue = rows => rows.filter(row => row.effectId.includes(':trait-catalogue-'));

describe('rappels des Traits : aucun nom sans affichage (CA8)', () => {
  test('le catalogue compte les 124 noms du bestiaire plus Stubborn', () => {
    assert.equal(CREATURE_TRAIT_CATALOGUE.length, 125);
  });
  for (const entree of CREATURE_TRAIT_CATALOGUE) {
    const appliqueParLOutil = TRAITS_APPLIED_BY_TOOL.includes(entree.name);
    test(`${entree.name} : ${appliqueParLOutil ? 'appliqué par l outil, aucun rappel permanent' : 'au moins un rappel, sans doublon'}`, () => {
      const lignes = rappels(participant([texteDe(entree)]));
      if (appliqueParLOutil) { assert.equal(lignes.length, 0); return; }
      assert.ok(lignes.length >= 1, `aucun rappel pour ${texteDe(entree)}`);
      const textes = lignes.map(ligne => ligne.text);
      assert.equal(new Set(textes).size, textes.length, 'rappel en double');
      assert.equal(new Set(lignes.map(ligne => ligne.id)).size, lignes.length, 'identifiant en double');
    });
  }
});

describe('rappels des Traits : pas de duplication avec les autres modules', () => {
  test('un Trait déjà affiché par un module n a pas de ligne de catalogue', () => {
    for (const trait of ['Afraid (Elves)', 'Night Vision', 'Fly', 'Daemonic (8+)', 'Frenzy', 'Undead']) {
      assert.deepEqual(duCatalogue(rappels(participant([trait]))), [], trait);
    }
  });
  test('un Trait sans autre affichage a une ligne « Nom français : texte »', () => {
    const lignes = duCatalogue(rappels(participant(['Tough'])));
    assert.equal(lignes.length, 1);
    assert.match(lignes[0].text, /Bete : Coriace : /);
  });
  test('catalogueReminders est pur : le participant n est pas modifié', () => {
    const person = participant(['Tough', 'Trained (War)']);
    const avant = JSON.stringify(person);
    catalogueReminders(person, []);
    assert.equal(JSON.stringify(person), avant);
  });
  test('deux Traits identiques ne donnent qu une ligne', () => {
    assert.equal(duCatalogue(rappels(participant(['Tough', 'Tough']))).length, 1);
  });
});

describe('rappels des Traits : Dressé (CA15, CA16)', () => {
  const lignesDe = trait => duCatalogue(rappels(participant([trait]))).map(ligne => ligne.text);
  test('Dressé (War) rappelle l exception à Craintif pour les bruits', () => {
    const lignes = lignesDe('Trained (War)');
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /Dressé \(Guerre\)/);
    assert.match(lignes[0], /Craintif/);
  });
  test('Dressé (Magic) rappelle l exception à Craintif pour la magie', () => {
    const lignes = lignesDe('Trained (Magic)');
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /Dressé \(Magie\)/);
    assert.match(lignes[0], /Craintif/);
    assert.match(lignes[0], /magie/);
  });
  test('Dressé (Shock Cavalry) rappelle la Cavalerie de choc', () => {
    const lignes = lignesDe('Trained (Shock Cavalry)');
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /Cavalerie de choc/);
  });
  test('plusieurs dressages : une ligne par dressage sans autre affichage', () => {
    const lignes = lignesDe('Trained (War, Magic, Shock Cavalry)');
    assert.equal(lignes.length, 3);
  });
  test('la forme française (Dressé (Guerre)) est reconnue comme l anglaise', () => {
    const lignes = lignesDe('Dressé (Guerre)');
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /Craintif/);
  });
});

describe('rappels des Traits : « modifie le profil »', () => {
  const coches = traits => ({ extensions: { v5: { optionalChoices: { traits, attacks: [], armour: [] } } } });
  const coche = (name, param = '') => ({ key: param ? `${name}:${param}` : name, name, param, kind: 'trait', origin: 'optional' });
  test('un Trait de D5 coché ajoute la ligne « modifie le profil »', () => {
    const lignes = duCatalogue(rappels(participant(['Tough'], coches([coche('Tough')])))).map(ligne => ligne.text);
    assert.ok(lignes.some(texte => /modifie le profil : .*E \+10.*FM \+10/.test(texte)), lignes.join(' | '));
  });
  test('le même Trait imprimé en base (sans coche) n ajoute pas cette ligne', () => {
    const lignes = duCatalogue(rappels(participant(['Tough']))).map(ligne => ligne.text);
    assert.ok(!lignes.some(texte => /modifie le profil/.test(texte)));
  });
  test('Endurant coché : Blessures', () => {
    const lignes = duCatalogue(rappels(participant(['Hardy'], coches([coche('Hardy')])))).map(ligne => ligne.text);
    assert.ok(lignes.some(texte => /modifie le profil : .*Blessures/.test(texte)), lignes.join(' | '));
  });
  test('Elite coché : modèle V5 nommé', () => {
    const lignes = duCatalogue(rappels(participant(['Elite'], coches([coche('Elite')])))).map(ligne => ligne.text);
    assert.ok(lignes.some(texte => /modifie le profil : .*Élite \(modèle V5\)/.test(texte)), lignes.join(' | '));
  });
  test('Dressé (War) coché : CC +10', () => {
    const lignes = duCatalogue(rappels(participant(['Trained (War)'], coches([coche('Trained', 'War')])))).map(ligne => ligne.text);
    assert.ok(lignes.some(texte => /modifie le profil : .*CC \+10/.test(texte)), lignes.join(' | '));
  });
});
