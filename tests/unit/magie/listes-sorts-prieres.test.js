import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getAllSpellContracts } from '../../../js/core/v5-spell-contracts.js';
import { getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { spellChoices, prayerChoices, withRow, withoutRow, resolveSpellName, resolvePrayerName, spellRows } from '../../../js/core/magic-lists.js';
import { defaultMagicSpellId } from '../../../js/ui/resolution-panel/magic.js';
import { Participant, Profile } from '../../../js/core/models.js';

const divins = getAllDivineContracts().filter(row => ['blessing', 'miracle'].includes(row.type));
const tousLesSorts = getAllSpellContracts().length;

describe('listes de sorts et prières : catalogue complet sans liste', () => {
  test('sans liste, tout le catalogue reste proposé (rien ne change)', () => {
    for (const actor of [{}, { spells: [] }, { spells: null }, null]) {
      const choix = spellChoices(actor);
      assert.equal(choix.hasList, false);
      assert.equal(choix.own.length + choix.others.length, tousLesSorts);
    }
    assert.equal(prayerChoices({}, divins).contracts.length, divins.length);
  });
});

describe('listes de sorts : la liste fait foi, « Tous » rouvre le catalogue', () => {
  const sorcier = { name: 'Sorcier', spells: [{ nom: 'Purification' }, { nom: 'Corps de Feu' }] };
  test('avec une liste, seuls ses sorts sont proposés', () => {
    const choix = spellChoices(sorcier);
    assert.deepEqual(choix.own.map(row => row.name), ['Purification', 'Corps de Feu']);
    assert.deepEqual(choix.others, []);
    assert.equal(choix.own[0].cn, 10);
  });
  test('« Tous les sorts » ajoute le reste du catalogue, sans doublon', () => {
    const choix = spellChoices(sorcier, { showAll: true });
    assert.equal(choix.own.length + choix.others.length, tousLesSorts);
    assert.ok(!choix.others.some(contract => contract.name === 'Purification'));
  });
  test('le sort par défaut est le premier de la liste', () => {
    assert.equal(defaultMagicSpellId({}, sorcier), spellChoices(sorcier).own[0].id);
  });
});

describe('listes de prières : ses prières et les Bénédictions de ses cultes', () => {
  const pretre = { name: 'Prêtresse', cult: 'Myrmidia', prayers: [{ nom: 'Bouclier de Myrmidia' }] };
  test('le miracle listé et les Bénédictions de Myrmidia, rien d’un autre dieu', () => {
    const { contracts, filtered } = prayerChoices(pretre, divins);
    assert.equal(filtered, true);
    assert.ok(contracts.some(row => row.id === 'divine:miracle:bouclier-de-myrmidia'));
    assert.ok(!contracts.some(row => row.id === 'divine:miracle:appel-a-la-fureur'), 'miracle non listé absent');
    assert.ok(contracts.filter(row => row.type === 'blessing').length > 0);
    assert.ok(contracts.every(row => row.type === 'miracle' || row.deity === 'Myrmidia'));
  });
  test('« Toutes les prières » rouvre le catalogue', () => {
    assert.equal(prayerChoices(pretre, divins, { showAll: true }).contracts.length, divins.length);
  });
  test('une liste sans ligne reconnue n’efface pas le catalogue', () => {
    const choix = prayerChoices({ prayers: [{ nom: 'Prière inventée' }] }, divins);
    assert.equal(choix.contracts.length, divins.length);
    assert.equal(choix.filtered, false);
  });
});

describe('saisie des listes', () => {
  test('ajout sans doublon, retrait, lignes existantes conservées', () => {
    const fiche = [{ nom: 'Purification', source: 'fiche' }];
    assert.equal(withRow(fiche, 'purification').length, 1);
    assert.deepEqual(withRow(fiche, 'Corps de Feu'), [{ nom: 'Purification', source: 'fiche' }, { nom: 'Corps de Feu' }]);
    assert.deepEqual(withoutRow(withRow(fiche, 'Corps de Feu'), 'PURIFICATION'), [{ nom: 'Corps de Feu' }]);
    assert.deepEqual(fiche, [{ nom: 'Purification', source: 'fiche' }], 'pur');
  });
  test('seuls les noms des catalogues sont acceptés', () => {
    assert.equal(resolveSpellName('purification'), 'Purification');
    assert.equal(resolveSpellName('Sort inventé'), null);
    assert.equal(resolvePrayerName('bouclier de myrmidia', divins), 'Bouclier de Myrmidia');
    assert.equal(resolvePrayerName('Prière inventée', divins), null);
  });
  test('la liste du profil passe au participant', () => {
    const profil = new Profile({ name: 'Sorcier', spells: [{ nom: 'Purification' }], prayers: [{ nom: 'Bouclier de Myrmidia' }] });
    const participant = new Participant({ name: profil.name, profileId: profil.id, spells: profil.spells, prayers: profil.prayers });
    assert.deepEqual(spellRows(participant), [{ nom: 'Purification' }]);
    assert.deepEqual(participant.prayers, [{ nom: 'Bouclier de Myrmidia' }]);
  });
});
