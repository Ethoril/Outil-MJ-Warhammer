// Garde-fou sur la commande de test elle-même.
//
// Le script « test » de package.json a été réécrit quatre fois en énumération explicite
// de fichiers. Chaque fois, un fichier a été oublié : jusqu'à 28 des 63 tests ne
// s'exécutaient plus, et deux fois cela a masqué un test réellement en échec —
// une régression du cache hors ligne, et une migration de journal cassée.
//
// L'énumération ne survit pas à l'ajout d'un fichier. « node --test » découvre seul.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'));

test('package.json — le script de test découvre les fichiers, il ne les énumère pas', () => {
  const cmd = pkg.scripts?.test || '';
  const enumérés = [...cmd.matchAll(/tests\/[\w.-]+\.test\.js/g)].map(m => m[0]);

  assert.deepEqual(enumérés, [],
    'Le script énumère des fichiers de test. Un fichier finira par y manquer — c\'est déjà '
    + 'arrivé quatre fois. Utiliser « node --test », qui les découvre tous. '
    + `Énumérés ici : ${enumérés.join(', ')}`);

  assert.match(cmd, /^node --test\s*$/,
    'Le script doit être exactement « node --test ».');
});

test('package.json — tous les fichiers de tests/ seraient donc exécutés', () => {
  const fichiers = readdirSync(join(racine, 'tests')).filter(f => f.endsWith('.test.js'));
  assert.ok(fichiers.length >= 8,
    `Seuls ${fichiers.length} fichiers de test trouvés — un fichier a-t-il été supprimé ?`);
  // Ce test ne peut pas vérifier qu'ils ont tourné ; il documente le compte attendu
  // pour qu'une disparition silencieuse se remarque.
  console.log(`  ${fichiers.length} fichiers de test : ${fichiers.join(', ')}`);
});
