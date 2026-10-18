import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as taal from '../docs/divin/sources/miracles/taal.mjs';
import * as ulric from '../docs/divin/sources/miracles/ulric.mjs';
import * as verena from '../docs/divin/sources/miracles/verena.mjs';

const extraction = JSON.parse(readFileSync(new URL('../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const modules = [['Taal', taal], ['Ulric', ulric], ['Verena', verena]];
const engineEffectTypes = new Set(['characteristic-modifier', 'armor-bonus', 'condition', 'healing', 'wound-heal']);
const statuses = new Set(['implemented', 'manual', 'blocked']);
const modes = new Set(['engine', 'assisted', 'manual']);
const units = new Set(['yards', 'rounds', 'minutes', 'hours']);

const validParam = p => {
  if (!p || typeof p !== 'object') return false;
  switch (p.kind) {
    case 'fixed': return Number.isFinite(p.value) && units.has(p.unit);
    case 'characteristic':
    case 'characteristic-bonus': return typeof p.characteristic === 'string' && units.has(p.unit);
    case 'area': return typeof p.characteristicBonus === 'string' && units.has(p.unit);
    case 'count': return Number.isFinite(p.value);
    case 'self': case 'special': case 'instant': return true;
    default: return false;
  }
};

for (const [name, mod] of modules) {
  test(`${name} : 6 miracles cohérents avec l'extraction`, () => {
    assert.equal(mod.cult, name);
    assert.equal(mod.miracles.length, 6);
    const expected = extraction.miracles.filter(row => row.culte === name);
    assert.equal(expected.length, 6);
    const names = new Set();
    for (const m of mod.miracles) {
      assert.ok(!names.has(m.canonicalName), `doublon ${m.canonicalName}`);
      names.add(m.canonicalName);
      const row = expected.find(r => r.nom_en === m.canonicalName);
      assert.ok(row, `absent de l'extraction : ${m.canonicalName}`);
      assert.equal(m.printedPage, row.page_imprimee);
    }
  });

  test(`${name} : champs obligatoires et grammaire`, () => {
    for (const m of mod.miracles) {
      for (const field of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[field] === 'string' && m[field].length > 0, `${m.canonicalName}.${field}`);
      assert.ok(Number.isInteger(m.printedPage));
      assert.ok(statuses.has(m.status), m.canonicalName);
      for (const key of ['range', 'targets', 'duration']) assert.ok(validParam(m.params?.[key]), `${m.canonicalName}.params.${key}`);
      assert.ok(Array.isArray(m.targetRules));
      assert.ok(Array.isArray(m.needsInput));
      for (const n of m.needsInput) assert.ok(n.id && n.text);
      assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0);
      const ids = new Set();
      for (const c of m.clauses) {
        assert.ok(c.id && c.text && modes.has(c.mode), `${m.canonicalName} clause ${c.id}`);
        assert.ok(!ids.has(c.id), `clause dupliquée ${c.id}`);
        ids.add(c.id);
      }
      if (m.effect !== null) assert.ok(engineEffectTypes.has(m.effect.type));
      for (const e of m.effects ?? []) assert.ok(engineEffectTypes.has(e.type));
      if (m.status === 'implemented') assert.ok(m.effect !== null && m.needsInput.length === 0 && m.clauses.every(c => c.mode === 'engine'));
      if (m.status === 'manual') assert.ok(m.needsInput.length > 0 || m.clauses.some(c => c.mode !== 'engine'));
    }
  });
}

test('pas de doublon de nom entre les trois cultes', () => {
  const all = modules.flatMap(([, mod]) => mod.miracles);
  assert.equal(new Set(all.map(m => m.name)).size, 18);
  assert.equal(new Set(all.map(m => m.canonicalName)).size, 18);
});
