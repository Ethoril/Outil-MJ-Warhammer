// L'index tests/parcours.json classe chaque parcours navigateur : tout fichier tests/*.mjs y figure, dans une famille connue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../../', import.meta.url));
const index = JSON.parse(readFileSync(`${dir}parcours.json`, 'utf8'));
const files = readdirSync(dir).filter(name => name.endsWith('.mjs')).sort();

test('chaque parcours de tests/*.mjs est classé, et chaque entrée de l’index a son fichier', () => {
  assert.deepEqual(files.filter(name => !index.parcours[name]), [], 'parcours à ajouter à tests/parcours.json');
  assert.deepEqual(Object.keys(index.parcours).filter(name => !files.includes(name)), [], 'entrées sans fichier');
});

test('familles connues, doublons rattachés à un parcours existant, socle pris parmi les parcours généraux', () => {
  const families = Object.keys(index.familles);
  for (const [name, entry] of Object.entries(index.parcours)) {
    assert.ok(families.includes(entry.famille), `${name} : famille « ${entry.famille} » inconnue`);
    if (entry.famille === 'doublon') assert.ok(index.parcours[entry.doublonDe], `${name} : doublonDe doit nommer un parcours de l’index`);
    if (entry.socle) assert.equal(entry.famille, 'general', `${name} : le socle se prend parmi les parcours généraux`);
  }
});
