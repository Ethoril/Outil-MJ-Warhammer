// CA16, CA42 : les reçus de soin d'un participant présent sont ceux de la 3.45.1 (figés avant le chantier dans
// tests/fixtures/soins-parite-3.45.json) ; la même suite d'opérations sur un personnage suivi hors rencontre rend
// les mêmes reçus, les mêmes PV et les mêmes États.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { playCare } from './soins-scenario.helper.js';

const FIXTURE = new URL('../../fixtures/soins-parite-3.45.json', import.meta.url);

test('CA42 — participant présent : reçus identiques à ceux figés en 3.45.1', async () => {
  const { neutral } = await playCare('combat');
  if (process.env.FIGER_PARITE === '1') writeFileSync(FIXTURE, JSON.stringify(neutral, null, 2) + '\n');
  assert.deepEqual(neutral, JSON.parse(readFileSync(FIXTURE, 'utf8')));
});

test('CA16 — personnage suivi hors rencontre : mêmes reçus, mêmes PV, mêmes États', async () => {
  const { neutral } = await playCare('suivi');
  assert.deepEqual(neutral, JSON.parse(readFileSync(FIXTURE, 'utf8')));
});
