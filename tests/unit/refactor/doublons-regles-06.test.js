// REGLES-06 : caractérisation des clés de Caractéristiques lues par les modules du moteur (ensembles avec ou sans M, alias reconnus).
// Écrit avant la centralisation ; doit passer avant et après.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CARAC_KEYS, EXTRA_CARAC_KEYS, canonicalCaracKey, normalizeCaracs } from '../../../js/core/models.js';
import { actionCharacteristic } from '../../../js/core/v5-combat-rules.js';
import { resolveV5ConditionTestContext } from '../../../js/core/v5-test-context.js';
import { normalizeCarac } from '../../../js/core/v5-sequela-effects.js';
import { STANDARD_CARACS } from '../../../js/core/v5-magic-effects.js';
import { BESTIARY_STAT_KEYS } from '../../../js/core/bestiary-profiles.js';

const TEN = ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'];

test('REGLES-06 tables exportées : ordre et contenu', () => {
  assert.deepEqual([...CARAC_KEYS], TEN);
  assert.deepEqual([...EXTRA_CARAC_KEYS], ['M', 'A', 'B', 'BF']);
  assert.deepEqual([...STANDARD_CARACS], [...TEN, 'M']);
  assert.deepEqual([...BESTIARY_STAT_KEYS], ['M', ...TEN]);
  assert.ok(Object.isFrozen(CARAC_KEYS) && Object.isFrozen(STANDARD_CARACS) && Object.isFrozen(BESTIARY_STAT_KEYS));
});

test('REGLES-06 alias canoniques (import, chargement)', () => {
  assert.equal(canonicalCaracKey('agi'), 'Ag'); assert.equal(canonicalCaracKey(' AG '), 'Ag'); assert.equal(canonicalCaracKey('BF'), 'BF');
  assert.equal(canonicalCaracKey('ws'), null); assert.equal(canonicalCaracKey('Mouvement'), null);
  assert.deepEqual(normalizeCaracs({ agi: 30, Ag: 31, ws: 5, fm: '40' }), { Ag: 31, ws: 5, FM: 40 });
});

test('REGLES-06 Test de combat : dix Caractéristiques, sans M', () => {
  for (const key of TEN) assert.equal(actionCharacteristic({ attr: key }), key);
  for (const key of ['M', 'cc', 'Agi', 'BF', undefined]) assert.equal(actionCharacteristic({ attr: key }), null);
});

test('REGLES-06 contexte de Test du divin : dix Caractéristiques et M', () => {
  const asks = characteristic => resolveV5ConditionTestContext({ states: [] }, { characteristic }).needsInput.some(row => row.field === 'characteristic');
  for (const key of [...TEN, 'M']) assert.equal(asks(key), false, key);
  for (const key of ['cc', 'BF', 'Agi']) assert.equal(asks(key), true, key);
});

test('REGLES-06 séquelles : alias français et anglais, sans « agi »', () => {
  const expected = { cc: 'CC', ws: 'CC', CT: 'CT', bs: 'CT', f: 'F', s: 'F', E: 'E', t: 'E', i: 'I', ag: 'Ag', DEX: 'Dex', int: 'Int', fm: 'FM', WP: 'FM', soc: 'Soc', fel: 'Soc' };
  for (const [raw, key] of Object.entries(expected)) assert.equal(normalizeCarac(raw), key, raw);
  assert.equal(normalizeCarac('agi'), 'agi'); assert.equal(normalizeCarac('M'), 'M'); assert.equal(normalizeCarac(''), null);
});

test('REGLES-06 source unique : aucune liste complète recopiée hors de carac-keys.js, sous-ensembles inclus dans la source', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { PROFILE_CARAC_KEYS } = await import('../../../js/core/carac-keys.js');
  const root = path.resolve(import.meta.dirname, '../../../js/core');
  const full = /'CC',\s*'CT',\s*'F',\s*'E',\s*'I',\s*'Ag',\s*'Dex',\s*'Int',\s*'FM',\s*'Soc'|cc:\s*'CC',\s*(ws:\s*'CC',\s*)?ct:\s*'CT'/;
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
  const offenders = walk(root).filter(file => path.basename(file) !== 'carac-keys.js' && full.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(offenders.map(file => path.relative(root, file)), []);
  const arb = await import('../../../js/core/v5-magic-arbitrations.js');
  for (const subset of [arb.KADON_REPLACED_CARACS, arb.BEAST_FORM_REPLACED_CARACS, arb.HAND_OF_GLORY_ELIGIBLE_STATS])
    for (const key of subset) assert.ok(PROFILE_CARAC_KEYS.includes(key), key);
});
