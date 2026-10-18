import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as nuit from '../docs/divin/sources/miracles/ranald-nuit.mjs';
import * as joueur from '../docs/divin/sources/miracles/ranald-joueur.mjs';
import * as trompeur from '../docs/divin/sources/miracles/ranald-trompeur.mjs';
import * as protecteur from '../docs/divin/sources/miracles/ranald-protecteur.mjs';
import * as taalDeft from '../docs/divin/sources/miracles/taal-deft.mjs';
import { paramKinds, paramUnits, effectTypes } from '../js/core/v5-divine-grammar.js';

// [module, culte, aspect imprimé, nombre de miracles, début du libellé d'aspect dans l'inventaire]
const modules = [
 [nuit, 'Ranald', 'Night Prowler', 7, 'Night Prowler'],
 [joueur, 'Ranald', 'Gamester', 6, 'Gamester'],
 [trompeur, 'Ranald', 'Deceiver', 5, 'Deceiver'],
 [protecteur, 'Ranald', 'Protector', 6, 'Protector'],
 [taalDeft, 'Taal', undefined, 8, 'Ranger-Priest']
];
const inventory = JSON.parse(readFileSync(new URL('../docs/divin/sources/extraction-2026-10-18/inventaire_supplements.json', import.meta.url), 'utf8'));
const deftRows = inventory.entries.filter(row => row.book === 'DEFT' && row.type === 'miracle');
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
  case 'special': if (p.label !== undefined) assert.ok(typeof p.label === 'string' && p.label); break;
  case 'self': case 'instant': break;
  default: assert.fail(`kind inconnu: ${p.kind}`);
 }
};

for (const [mod, cult, aspect, count, aspectLabel] of modules) {
 const title = `${cult}${aspect ? ` ${aspect}` : ' (Ranger-Priest)'}`;

 test(`${title} : ${count} miracles cohérents avec l’inventaire`, () => {
  assert.equal(mod.cult, cult);
  assert.equal(mod.aspect, aspect);
  assert.equal(mod.source.bookId, 'DeftSteps');
  assert.equal(mod.source.document, 'Deft Steps Light Fingers.pdf');
  assert.match(mod.source.fileSha256, /^[0-9a-f]{64}$/);
  assert.ok(mod.source.edition);
  assert.equal(mod.miracles.length, count);
  const rows = deftRows.filter(row => row.cult === cult && String(row.aspect).startsWith(aspectLabel));
  assert.equal(rows.length, count);
  for (const m of mod.miracles) {
   const row = rows.find(r => norm(r.name) === norm(m.canonicalName));
   assert.ok(row, `canonicalName absent de l’inventaire: ${m.canonicalName}`);
   assert.equal(m.printedPage, row.pagePrinted, m.name);
  }
  assert.equal(new Set(mod.miracles.map(m => m.name)).size, count);
  assert.equal(new Set(mod.miracles.map(m => m.canonicalName)).size, count);
 });

 test(`${title} : champs obligatoires, params, clauses, effects`, () => {
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
   if (m.sourceDelta !== undefined) assert.ok(typeof m.sourceDelta === 'string' && m.sourceDelta.length > 0, m.name);
   const effects = [...(m.effect ? [m.effect] : []), ...(m.effects ?? [])];
   for (const e of effects) assert.ok(engineEffectTypes.includes(e.type), `${m.name}: type ${e.type}`);
   if (m.status === 'manual') assert.ok(effects.length === 0 && (m.needsInput.length > 0 || m.clauses.some(c => c.mode === 'manual')), m.name);
   if (m.status === 'implemented') assert.ok(effects.length && m.clauses.every(c => c.mode === 'engine'), `${m.name}: implemented exige tout automatisé`);
   if (m.status === 'assisted') assert.ok(effects.length && m.clauses.some(c => c.mode === 'engine'), `${m.name}: assisted exige un effet moteur`);
  }
 });
}

test('Deft : 32 miracles, 24 de Ranald et 8 de Taal, sans doublon entre modules', () => {
 const all = modules.flatMap(([mod]) => mod.miracles);
 assert.equal(all.length, 32);
 assert.equal(modules.filter(([, cult]) => cult === 'Ranald').flatMap(([mod]) => mod.miracles).length, 24);
 assert.equal(new Set(all.map(m => m.canonicalName)).size, 32);
 assert.equal(new Set(all.map(m => m.name)).size, 32);
});
