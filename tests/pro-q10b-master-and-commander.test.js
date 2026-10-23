import test from 'node:test';
import assert from 'node:assert/strict';
import { getReferenceCatalogue, resolveTalent } from '../js/core/reference-catalog.js';
import { v5TalentCoverage } from '../js/core/v5-talent-coverage.js';
import { leadershipRallySlModifiers, MASTER_AND_COMMANDER_TALENT } from '../js/core/v5-effects.js';

// Sea of Claws (V4) p. 63 : le MJ l'a ajouté à la feuille Drive (« Maître à bord (Master and Commander) »).
const ID = 'talent-master-and-commander';
const captain = (rank, extra = {}) => ({ id: 'cap', talents: [{ id: ID, status: 'resolved', rank, ...extra }] });

test('Q10b — Maître à bord est au catalogue importé, reconnu par son id sous ses deux noms', () => {
  const entry = getReferenceCatalogue().talents.find(row => row.id === ID);
  assert.equal(entry.nom, 'Maître à bord');
  assert.equal(entry.englishName, 'Master and Commander');
  assert.equal(entry.limitText, 'Bonus de Sociabilité');
  assert.match(entry.source, /Sea of Claws.*63/);
  for (const name of ['Master and Commander', 'Maître à bord']) {
    const resolved = resolveTalent(name);
    assert.equal(resolved.status, 'resolved');
    assert.equal(resolved.entry.id, ID);
  }
  assert.equal(MASTER_AND_COMMANDER_TALENT.nom, entry.nom);
});

test('Q10b — contrat « verified » du talent comme les autres identités', () => {
  const coverage = v5TalentCoverage(ID);
  assert.equal(coverage.status, 'verified');
  assert.ok(coverage.clauses.length > 0);
});

test('Q10b — +1 DR de Commandement par niveau, à bord seulement, sur une ligne résolue par id', () => {
  assert.equal(leadershipRallySlModifiers({ participant: captain(3), onBoardVessel: true }).modifiers[0].amount, 3);
  assert.deepEqual(leadershipRallySlModifiers({ participant: captain(3), onBoardVessel: false }).modifiers, []);
  assert.equal(leadershipRallySlModifiers({ participant: captain(2) }).needsInput.length, 1);
});

test('Q10b — plus de repli par nom : une ligne non résolue ne donne aucun bonus', () => {
  const byName = { id: 'cap', talents: [{ nom: 'Master and Commander', rank: 2 }] };
  assert.deepEqual(leadershipRallySlModifiers({ participant: byName, onBoardVessel: true }), { modifiers: [], needsInput: [] });
});
