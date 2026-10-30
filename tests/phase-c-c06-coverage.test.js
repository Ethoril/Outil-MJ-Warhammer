import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PSYCHOLOGY_SOURCE_IDS } from '../js/core/v5-talent-psychology.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const inventory = JSON.parse(read('../docs/COURAGE_BRISE_INVENTAIRE.json'));
const plan = read('../docs/plans-gpt/PLAN_GPT_PHASE_C.md');

const rows = new Map();
for (const line of plan.split('\n')) {
  const m = line.match(/^\| (C0-L\d+-\d+) \| (\w+) \| (.+) \|$/);
  if (m) rows.set(m[1], { status: m[2], target: m[3].trim() });
}
const lotIds = (lot) => {
  const block = plan.match(new RegExp(`### ${lot} [\\s\\S]*?(?=\\n### |\\n## )`))[0];
  const line = block.split('\n').find((l) => l.startsWith('- Inventaire'));
  return new Set(line.match(/C0-L\d+-\d+/g) || []);
};

test('C06 — les 239 entrées de l’inventaire figurent au plan, avec un lot ou une exclusion motivée', () => {
  assert.equal(inventory.length, 239);
  assert.equal(rows.size, 239);
  const lots = { C01: lotIds('C01'), C02: lotIds('C02'), C03: lotIds('C03'), C04: lotIds('C04'), C05: lotIds('C05') };
  let covered = 0;
  let excluded = 0;
  for (const entry of inventory) {
    const row = rows.get(entry.id);
    assert.ok(row, `${entry.id} absent du tableau de couverture`);
    if (/^C0[1-5]$/.test(row.target)) {
      assert.ok(lots[row.target].has(entry.id), `${entry.id} annoncé en ${row.target} mais absent de son lot`);
      covered++;
    } else {
      assert.match(row.target, /^Exclu par /, `${entry.id} sans lot ni exclusion motivée`);
      assert.ok(row.target.length > 30, `${entry.id} : motif d’exclusion trop court`);
      excluded++;
    }
  }
  assert.equal(covered, 202);
  assert.equal(excluded, 37);
});

test('C06 — chaque clause du lot C05 est raccordée au catalogue de sources', () => {
  const missing = [...lotIds('C05')].filter((id) => !PSYCHOLOGY_SOURCE_IDS.includes(id));
  assert.deepEqual(missing, []);
});

test('C06 — chaque lot C03 et C04 a son fichier de tests et le plan ne mentionne que des identifiants d’inventaire', () => {
  const known = new Set(inventory.map((e) => e.id));
  for (const id of plan.match(/C0-L\d+-\d+/g)) assert.ok(known.has(id), `${id} inconnu de l’inventaire`);
  for (const file of ['c01-fear-terror', 'c02-engaged-flee', 'c03-rally-mount', 'c04-intimidation-traits', 'c05-supplements']) {
    const path = file === 'c02-engaged-flee' ? './unit/combat/initiative-et-tours.test.js' : `./phase-c-${file}.test.js`;
    assert.ok(read(path).length > 0, file);
  }
});
