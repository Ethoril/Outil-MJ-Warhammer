import test from 'node:test';
import assert from 'node:assert/strict';
import * as ulricPbtt from '../docs/divin/sources/miracles/ulric-pbtt.mjs';
import * as mathlann from '../docs/divin/sources/miracles/mathlann.mjs';
import { paramKinds, paramUnits, effectTypes } from '../js/core/v5-divine-grammar.js';

const modules = [
 { label: 'Ulric (PBtT)', mod: ulricPbtt, cult: 'Ulric', count: 7, page: 50, book: 'PBTT' },
 { label: 'Mathlann (Lustria)', mod: mathlann, cult: 'Mathlann', count: 2, page: 81, book: 'L07' }
];
const engineEffectTypes = [...effectTypes];
const statuses = ['implemented', 'assisted', 'manual', 'blocked'];
const clauseModes = ['engine', 'assisted', 'manual'];
const norm = s => String(s).replace(/[’']/g, "'").normalize('NFC').toLowerCase();

const validParam = p => {
 assert.equal(typeof p, 'object');
 assert.ok(paramKinds.has(p.kind), `kind inconnu: ${p.kind}`);
 if (p.unit !== undefined) assert.ok(paramUnits.has(p.unit), `unité inconnue: ${p.unit}`);
 switch (p.kind) {
  case 'fixed': assert.ok(Number.isFinite(p.value) && p.value > 0); assert.ok(p.unit); break;
  case 'characteristic':
  case 'characteristic-bonus': assert.ok(typeof p.characteristic === 'string' && p.characteristic); assert.ok(p.unit); break;
  case 'area': assert.ok((typeof p.characteristicBonus === 'string') !== (typeof p.characteristic === 'string')); assert.ok(p.unit); break;
  case 'count': assert.ok(Number.isInteger(p.value) && p.value > 0); break;
  case 'touch': assert.equal(Object.keys(p).length, 1); break;
  case 'self': case 'special': case 'instant': break;
  default: assert.fail(`kind inconnu: ${p.kind}`);
 }
};

for (const { label, mod, cult, count, page, book } of modules) {
 test(`${label} : ${count} miracles, source et pages cohérentes`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.miracles.length, count);
  assert.equal(mod.source.bookId, book);
  assert.match(mod.source.fileSha256, /^[0-9a-f]{64}$/);
  assert.ok(mod.source.document && mod.source.edition);
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, count);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, count);
  for (const m of mod.miracles) {
   assert.equal(m.printedPage, page, m.name);
  }
 });

 test(`${label} : champs obligatoires, params, clauses, effets`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(statuses.includes(m.status), m.name);
   for (const key of ['range', 'targets', 'duration']) validParam(m.params?.[key]);
   assert.ok(Array.isArray(m.targetRules));
   assert.ok(Array.isArray(m.needsInput));
   for (const n of m.needsInput) assert.ok(n.id && n.text, m.name);
   assert.equal(new Set(m.needsInput.map(n => n.id)).size, m.needsInput.length, `doublon needsInput: ${m.name}`);
   assert.ok(Array.isArray(m.clauses) && m.clauses.length > 0, m.name);
   for (const c of m.clauses) { assert.ok(c.id && c.text, m.name); assert.ok(clauseModes.includes(c.mode), `${m.name}.${c.id}`); }
   assert.equal(new Set(m.clauses.map(c => c.id)).size, m.clauses.length, `doublon clauses: ${m.name}`);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(m.needsInput.length > 0 || m.clauses.some(c => c.mode === 'manual'), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
   if (m.status === 'manual') assert.equal(effects.length, 0, `${m.name}: manual sans effet structuré`);
  }
 });
}

test('Ulric (PBtT) : noms distincts des miracles du livre de base', async () => {
 const base = await import('../docs/divin/sources/miracles/ulric.mjs');
 const baseNames = new Set(base.miracles.map(m => norm(m.name)));
 const baseCanon = new Set(base.miracles.map(m => norm(m.canonicalName)));
 for (const m of ulricPbtt.miracles) {
  assert.ok(!baseNames.has(norm(m.name)), `nom FR déjà pris: ${m.name}`);
  assert.ok(!baseCanon.has(norm(m.canonicalName)), `nom EN déjà pris: ${m.canonicalName}`);
 }
});
