// COMP-ZONESNON-06 (13/11) : un seul chargeur de bestiaire pour toute l'application ; un livre n'est chargé qu'une fois
// pour plusieurs demandeurs, et un échec réseau reste remonté à chacun (puis une nouvelle demande réessaie).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const calls = [];
let failNext = 0;
const files = {
  './js/data/bestiary/index.json': { books: [{ book: 'L06', file: 'L06.json', edition: 'V5' }, { book: 'L02', file: 'L02.json' }] },
  './js/data/bestiary/L06.json': { profiles: [{ id: 'L06-zombie', name: 'Zombie' }] },
  './js/data/bestiary/L02.json': { profiles: [{ id: 'L02-horse', name: 'Horse' }] }
};
globalThis.fetch = async path => {
  calls.push(path);
  if (failNext > 0) { failNext--; return { ok: false, status: 503 }; }
  return { ok: true, json: async () => structuredClone(files[path]) };
};

const { sharedBestiaryLoader } = await import('../../../js/core/bestiary-loader.js');

test('une seule instance : chaque appel rend le même chargeur', () => {
  assert.equal(sharedBestiaryLoader(), sharedBestiaryLoader());
});

test('deux demandeurs du même livre : un seul téléchargement de l’index et du livre', async () => {
  calls.length = 0;
  const [summons, familiars] = await Promise.all([sharedBestiaryLoader().book('L06'), sharedBestiaryLoader().book('L06')]);
  assert.equal(summons, familiars);
  assert.deepEqual(summons, [{ id: 'L06-zombie', name: 'Zombie', edition: 'V5' }]);
  const again = await sharedBestiaryLoader().load(['L06']);
  assert.deepEqual(again, summons);
  assert.deepEqual(calls, ['./js/data/bestiary/index.json', './js/data/bestiary/L06.json']);
});

test('échec réseau : chaque demandeur reçoit l’erreur, la demande suivante réessaie', async () => {
  calls.length = 0;
  failNext = 1;
  const results = await Promise.allSettled([sharedBestiaryLoader().book('L02'), sharedBestiaryLoader().book('L02')]);
  assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected']);
  assert.match(results[0].reason.message, /L02\.json : 503/);
  assert.deepEqual(await sharedBestiaryLoader().book('L02'), [{ id: 'L02-horse', name: 'Horse' }]);
  assert.deepEqual(calls, ['./js/data/bestiary/L02.json', './js/data/bestiary/L02.json']);
});

test('le code de l’application ne crée aucun autre chargeur que l’instance partagée', () => {
  const offenders = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'data') walk(path); continue; }
      if (!name.endsWith('.js')) continue;
      const text = readFileSync(path, 'utf8');
      if (/createBestiaryLoader\(/.test(text) && !/[\\/]core[\\/]bestiary-(profiles|loader)\.js$/.test(path)) offenders.push(path);
    }
  };
  walk(join(root, 'js'));
  assert.deepEqual(offenders, []);
});
