import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lire = (chemin) => JSON.parse(readFileSync(resolve(chemin), 'utf8'));
const { contracts: tousContrats } = lire('js/data/v5-divine-contracts.json');
const table = lire('tests/fixtures/miracles-narratifs-familles.json');

const compter = (valeurs) => valeurs.reduce((acc, f) => {
  acc[f] = (acc[f] || 0) + 1;
  return acc;
}, {});

const manuels = tousContrats.filter((c) => c.status === 'manual');
const assistes = tousContrats.filter((c) => c.status === 'assisted');
const clausesManuelles = assistes.flatMap((c) => c.clauses
  .filter((cl) => cl.mode === 'manual')
  .map((cl) => `${c.id}#${cl.id}`));

// Verrou d'inventaire des miracles narratifs (CA2) : tout écart se dit en français.
describe('Inventaire des miracles narratifs : prières en rappel', () => {
  test('65 contrats manual : 56 miracles et 9 bénédictions', () => {
    assert.equal(manuels.length, 65, `Nombre de contrats « manual » : ${manuels.length} au lieu de 65`);
    assert.equal(manuels.filter((c) => c.type === 'miracle').length, 56, 'Il devrait y avoir 56 miracles en rappel');
    assert.equal(manuels.filter((c) => c.type === 'blessing').length, 9, 'Il devrait y avoir 9 bénédictions en rappel');
  });

  test('chaque contrat manual est dans la table, avec sa famille', () => {
    for (const c of manuels) {
      assert.ok(table.contracts[c.id], `Contrat « manual » absent de la table des familles : ${c.id}`);
    }
  });

  test('chaque contrat de la table est toujours manual', () => {
    const ids = new Set(manuels.map((c) => c.id));
    for (const id of Object.keys(table.contracts)) {
      assert.ok(ids.has(id), `Contrat de la table qui n'est plus « manual » (ou disparu) : ${id}`);
    }
  });

  test('comptes par famille : F1 7, F2 6, F3 7, F4 4, F5 6, F6 28, F7 7', () => {
    assert.deepEqual(compter(Object.values(table.contracts)), { F1: 7, F2: 6, F3: 7, F4: 4, F5: 6, F6: 28, F7: 7 });
  });
});

describe('Inventaire des miracles narratifs : clauses des miracles assistés', () => {
  // L10 : 21 clauses requalifiées en engine (88 → 67 ; 50 → 42 contrats portant encore une clause manual).
  // L1 : 4 contrats passent assisted (60 → 64 ; 42 → 46), 8 clauses de rappel nommées (67 → 75).
  test('64 contrats assisted, tous des miracles, 46 avec une clause manual', () => {
    assert.equal(assistes.length, 64, `Nombre de contrats « assisted » : ${assistes.length} au lieu de 64`);
    assert.ok(assistes.every((c) => c.type === 'miracle'), 'Un contrat « assisted » n\'est pas un miracle');
    const avec = assistes.filter((c) => c.clauses.some((cl) => cl.mode === 'manual'));
    assert.equal(avec.length, 46, `Contrats assistés avec clause manuelle : ${avec.length} au lieu de 46`);
  });

  test('75 clauses manual, chacune dans la table', () => {
    assert.equal(clausesManuelles.length, 75, `Clauses « manual » des assistés : ${clausesManuelles.length} au lieu de 75`);
    for (const cle of clausesManuelles) {
      assert.ok(table.clauses[cle], `Clause « manual » absente de la table des familles : ${cle}`);
    }
  });

  test('chaque clause de la table est toujours manual', () => {
    const cles = new Set(clausesManuelles);
    for (const cle of Object.keys(table.clauses)) {
      assert.ok(cles.has(cle), `Clause de la table qui n'est plus « manual » (ou disparue) : ${cle}`);
    }
  });

  test('comptes par famille : F1 12, F2 5, F3 3, F4 1, F5 1, F6 52, F8 1', () => {
    assert.deepEqual(compter(Object.values(table.clauses)), { F1: 12, F2: 5, F3: 3, F4: 1, F5: 1, F6: 52, F8: 1 });
  });
});
