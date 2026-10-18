import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as manann from '../docs/divin/sources/miracles/manann.mjs';
import * as morr from '../docs/divin/sources/miracles/morr.mjs';
import * as ranald from '../docs/divin/sources/miracles/ranald.mjs';
import { paramKinds, paramUnits, effectTypes } from '../js/core/v5-divine-grammar.js';

const modules = { Manann: manann, Morr: morr, Ranald: ranald };
const extraction = JSON.parse(readFileSync(new URL('../docs/divin/sources/extraction-2026-10-18/miracles.json', import.meta.url), 'utf8'));
const extracted = extraction.miracles ?? extraction;
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

for (const [cult, mod] of Object.entries(modules)) {
 test(`${cult} : 6 miracles cohérents avec l’extraction`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.miracles.length, 6);
  const rows = extracted.filter(row => row.culte === cult);
  assert.equal(rows.length, 6);
  for (const m of mod.miracles) {
   const row = rows.find(r => norm(r.nom_fr) === norm(m.name));
   assert.ok(row, `nom_fr absent de l’extraction: ${m.name}`);
   assert.equal(m.printedPage, row.page_imprimee, m.name);
   // Écart d’orthographe imprimée admis seulement s’il est documenté dans sourceDelta.
   if (norm(m.canonicalName) !== norm(row.nom_en)) assert.match(m.sourceDelta ?? '', /Manalt/, `canonicalName divergent non documenté: ${m.name}`);
  }
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, 6);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, 6);
 });

 test(`${cult} : champs obligatoires, params, clauses, effect`, () => {
  for (const m of mod.miracles) {
   for (const key of ['name', 'canonicalName', 'summary']) assert.ok(typeof m[key] === 'string' && m[key].length > 0, `${m.name}.${key}`);
   assert.ok(Number.isInteger(m.printedPage));
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
   // assisted : effets structurés appliqués, clauses manuelles admises en rappels MJ.
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
  }
 });
}
