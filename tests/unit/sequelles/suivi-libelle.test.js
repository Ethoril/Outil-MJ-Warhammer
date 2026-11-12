// T2 · CA2, CA4, CA5 : le nom d'un suivi ne dépend que de ses propres données, jamais de son rang d'affichage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { aftermathRowLabel } from '../../../js/core/aftermath-subjects.js';

const incident = (id, extra = {}) => ({ id, participantId: `parti-${id}`, source: { kind: 'wounds-lost', cause: 'combat' }, injuryDay: 3, status: 'open', ...extra });
const envelope = rows => ({ combat: { participants: [] }, persistentCharacters: [{ id: 'pc', name: 'Hilda' }], extensions: { v5: { aftermathRegister: { incidents: rows } } } });

test('CA2 — le même nom à chaque rendu, quels que soient les autres suivis ouverts, résolus ou archivés', () => {
  const a = incident('a', { ownerLabel: 'Gobelin 2 — Embuscade du pont' });
  const b = incident('b', { ownerLabel: 'Orque — Embuscade du pont' });
  const first = aftermathRowLabel(envelope([a, b]), a);
  assert.equal(first, 'Gobelin 2 — Embuscade du pont');
  assert.equal(aftermathRowLabel(envelope([b, a]), a), first, 'ordre permuté');
  assert.equal(aftermathRowLabel(envelope([{ ...b, status: 'archived' }, a]), a), first, 'autre suivi archivé');
  assert.equal(aftermathRowLabel(envelope([a]), a), first, 'autre suivi disparu');
});

test('CA3 — un suivi rattaché porte le nom actuel de son personnage suivi', () => {
  const row = incident('a', { ownerId: 'pc', ownerLabel: 'Hilda — Embuscade', participantId: 'suivi:pc' });
  const state = envelope([row]);
  assert.equal(aftermathRowLabel(state, row), 'Hilda');
  state.persistentCharacters[0].name = 'Hilda la Rousse';
  assert.equal(aftermathRowLabel(state, row), 'Hilda la Rousse');
});

test('CA4 — un ancien suivi sans nom : repli bâti sur ses seules données, sans réécriture', () => {
  const critical = incident('a', { source: { kind: 'critical', criticalId: 'c1' }, injuryDay: 7 });
  const lost = incident('b', { source: { kind: 'wounds-lost', cause: 'chute' } });
  const frozen = structuredClone([critical, lost]);
  assert.equal(aftermathRowLabel(envelope([critical, lost]), critical), 'Ancien suivi du jour 7 (Blessure Critique)');
  assert.equal(aftermathRowLabel(envelope([lost, critical]), lost), 'Ancien suivi du jour 3 (chute)');
  assert.equal(aftermathRowLabel(envelope([]), { id: 'm', participantId: 'x', label: 'Fièvre', startDay: 2, status: 'active' }), 'Ancien suivi du jour 2 (Fièvre)');
  assert.deepEqual([critical, lost], frozen);
});

test('CA5, CA19 — les textes retirés n’apparaissent plus dans js/', () => {
  const files = [];
  const walk = dir => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(js|mjs|html|css)$/.test(name)) files.push(path); } };
  walk('js');
  for (const banned of ['Suivi hors rencontre', 'Les opérations de soin restent liées aux participants présents', 'Participant absent', 'PARTICIPANT ABSENT']) {
    const hits = files.filter(path => readFileSync(path, 'utf8').includes(banned));
    assert.deepEqual(hits, [], `« ${banned} » encore présent`);
  }
});
