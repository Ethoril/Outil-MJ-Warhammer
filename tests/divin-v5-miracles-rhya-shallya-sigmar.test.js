import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as rhya from '../docs/divin/sources/miracles/rhya.mjs';
import * as shallya from '../docs/divin/sources/miracles/shallya.mjs';
import * as sigmar from '../docs/divin/sources/miracles/sigmar.mjs';
import { paramKinds, paramUnits, effectTypes } from '../js/core/v5-divine-grammar.js';

const extraction = JSON.parse(readFileSync(new URL('../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const norm = value => String(value).replace(/[’‘]/g, "'").toLowerCase();
const modules = [rhya, shallya, sigmar];
const ENGINE_EFFECT_TYPES = [...effectTypes];
const STATUSES = ['implemented', 'assisted', 'manual', 'blocked'];
const MODES = ['engine', 'assisted', 'manual'];
const UNITS = [...paramUnits];
const CHARACTERISTICS = ['Soc'];

function validParam(param) {
  if (!param || !paramKinds.has(param.kind)) return false;
  switch (param.kind) {
    case 'fixed': return Number.isFinite(param.value) && UNITS.includes(param.unit);
    case 'characteristic':
    case 'characteristic-bonus': return CHARACTERISTICS.includes(param.characteristic) && typeof param.unit === 'string';
    case 'area': return CHARACTERISTICS.includes(param.characteristicBonus ?? param.characteristic) && UNITS.includes(param.unit);
    case 'touch': return Object.keys(param).length === 1;
    case 'count': return Number.isFinite(param.value);
    case 'self': case 'special': case 'instant': return true;
    default: return false;
  }
}

for (const mod of modules) {
  test(`${mod.cult} : 6 miracles cohérents avec l'extraction`, () => {
    assert.equal(mod.miracles.length, 6);
    const expected = extraction.miracles.filter(row => row.culte === mod.cult);
    assert.equal(expected.length, 6);
    for (const row of expected) {
      const found = mod.miracles.find(item => norm(item.canonicalName) === norm(row.nom_en));
      assert.ok(found, `absent : ${row.nom_en}`);
      assert.equal(norm(found.name), norm(row.nom_fr), row.nom_en);
      assert.equal(found.printedPage, row.page_imprimee, row.nom_en);
    }
  });

  test(`${mod.cult} : champs obligatoires, params et effets valides`, () => {
    const names = new Set();
    const canon = new Set();
    for (const miracle of mod.miracles) {
      assert.ok(!names.has(miracle.name), `doublon ${miracle.name}`);
      assert.ok(!canon.has(miracle.canonicalName), `doublon ${miracle.canonicalName}`);
      names.add(miracle.name); canon.add(miracle.canonicalName);
      for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof miracle[key] === 'string' && miracle[key].length > (key === 'summary' ? 30 : 3), `${miracle.name}.${key}`);
      assert.ok(Number.isInteger(miracle.printedPage));
      assert.ok(STATUSES.includes(miracle.status), miracle.name);
      assert.ok(Array.isArray(miracle.targetRules) && Array.isArray(miracle.needsInput) && Array.isArray(miracle.clauses));
      for (const key of ['range', 'targets', 'duration']) assert.ok(validParam(miracle.params?.[key]), `${miracle.name}.params.${key}`);
      if (miracle.effect !== null) assert.ok(ENGINE_EFFECT_TYPES.includes(miracle.effect.type), miracle.name);
      for (const effect of miracle.effects || []) assert.ok(ENGINE_EFFECT_TYPES.includes(effect.type), miracle.name);
      if (miracle.status === 'implemented') assert.ok(miracle.effect || miracle.effects?.length, `${miracle.name} implémenté sans effet`);
      if (miracle.status === 'assisted') assert.ok(miracle.effect || miracle.effects?.length, `${miracle.name} assisté sans effet`);
      if (miracle.status === 'manual') {
        assert.ok(miracle.clauses.length > 0 && miracle.needsInput.length > 0, `${miracle.name} manuel sans clauses/faits`);
        assert.ok(miracle.clauses.some(clause => clause.mode !== 'engine'), `${miracle.name} manuel sans clause non automatisée`);
      }
      const clauseIds = new Set();
      for (const clause of miracle.clauses) {
        assert.ok(clause.id && clause.text && MODES.includes(clause.mode), `${miracle.name} clause ${clause.id}`);
        assert.ok(!clauseIds.has(clause.id), `${miracle.name} clause en double ${clause.id}`);
        clauseIds.add(clause.id);
      }
      const needIds = new Set();
      for (const need of miracle.needsInput) {
        assert.ok(need.id && need.text, `${miracle.name} needsInput`);
        assert.ok(!needIds.has(need.id), `${miracle.name} fait en double ${need.id}`);
        needIds.add(need.id);
      }
    }
  });
}

test('cultes exportés', () => {
  assert.deepEqual(modules.map(mod => mod.cult), ['Rhya', 'Shallya', 'Sigmar']);
});
