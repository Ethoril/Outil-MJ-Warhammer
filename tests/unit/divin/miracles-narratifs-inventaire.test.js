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
  test('68 contrats manual : 59 miracles et 9 bénédictions', () => {
    assert.equal(manuels.length, 68, `Nombre de contrats « manual » : ${manuels.length} au lieu de 68`);
    assert.equal(manuels.filter((c) => c.type === 'miracle').length, 59, 'Il devrait y avoir 59 miracles en rappel');
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

  test('comptes par famille : F1 10, F2 6, F3 7, F4 4, F5 6, F6 28, F7 7', () => {
    assert.deepEqual(compter(Object.values(table.contracts)), { F1: 10, F2: 6, F3: 7, F4: 4, F5: 6, F6: 28, F7: 7 });
  });
});

describe('Inventaire des miracles narratifs : clauses des miracles assistés', () => {
  // L10 : 21 clauses requalifiées en engine (88 → 67 ; 50 → 42 contrats portant encore une clause manual).
  // L1c : seule Rage de Rhya est branchée (force-test) : 67 → 66 clauses manual ; Grâce de Ranald et A Deal's a Deal restent en rappel.
  // L2 : Muscles givrés passe assisted (69 → 68 manual, 60 → 61 assisted) ; missile, unarmed-damaging, terror-and-skills requalifiées,
  // plus deux rappels F6 (climate, intimidation) : 66 → 65 clauses manual, 42 → 41 contrats portant encore une clause manual.
  test('61 contrats assisted, tous des miracles, 41 avec une clause manual', () => {
    assert.equal(assistes.length, 61, `Nombre de contrats « assisted » : ${assistes.length} au lieu de 61`);
    assert.ok(assistes.every((c) => c.type === 'miracle'), 'Un contrat « assisted » n\'est pas un miracle');
    const avec = assistes.filter((c) => c.clauses.some((cl) => cl.mode === 'manual'));
    assert.equal(avec.length, 41, `Contrats assistés avec clause manuelle : ${avec.length} au lieu de 41`);
  });

  test('65 clauses manual, chacune dans la table', () => {
    assert.equal(clausesManuelles.length, 65, `Clauses « manual » des assistés : ${clausesManuelles.length} au lieu de 65`);
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

  test('comptes par famille : F1 5, F2 5, F3 3, F4 1, F5 1, F6 49, F8 1', () => {
    assert.deepEqual(compter(Object.values(table.clauses)), { F1: 5, F2: 5, F3: 3, F4: 1, F5: 1, F6: 49, F8: 1 });
  });
});
