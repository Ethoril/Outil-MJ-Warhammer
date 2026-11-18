// Modules communs du chapeau (multi-jeux, lot L2, plan §2) : la liste est déclarée ici, et la fermeture d'imports
// (statiques, réexports et `import()` dynamiques) de chacun reste dans la liste. C'est ce test qui tient lieu de déplacement physique des fichiers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Plan §2 (tableau « Périmètre du chapeau »), plus le sélecteur de jeu ajouté par le lot L2. */
const MODULES_COMMUNS = Object.freeze([
  'js/core/persistence.js', 'js/core/safe-storage.js', 'js/core/commands.js', 'js/core/history.js',
  'js/core/participant-camp.js', 'js/core/token-library-path.js', 'js/core/bestiary-folder-tree.js',
  'js/core/scene-events.js', 'js/core/auth-errors.js',
  'js/ui/bus.js', 'js/ui/dom.js', 'js/ui/toast.js', 'js/ui/messages.js', 'js/ui/status-summary.js', 'js/ui/map-link-indicator.js',
  'js/ui/theme.js', 'js/ui/side-panel.js',
  'js/data/donnees-communes.js',
  'js/core/map-link-protocol.js', 'js/core/jeux.js', 'js/ui/selecteur-jeu.js'
]);

function fermeture(entree) {
  const vus = new Set(), file = [join(ROOT, entree)];
  while (file.length) {
    const fichier = file.pop();
    const source = readFileSync(fichier, 'utf8');
    const specifieurs = [...source.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g)]
      .map(m => m[1] ?? m[2] ?? m[3]).filter(spec => spec.startsWith('.'));
    for (const spec of specifieurs) {
      const cible = resolve(dirname(fichier), spec);
      assert.ok(existsSync(cible), `import introuvable : ${spec} dans ${relative(ROOT, fichier)}`);
      const cle = relative(ROOT, cible).replaceAll('\\', '/');
      if (!vus.has(cle)) { vus.add(cle); file.push(cible); }
    }
  }
  return [...vus].sort();
}

test('la liste des modules communs : fichiers existants, sans doublon, figée', () => {
  assert.ok(Object.isFrozen(MODULES_COMMUNS));
  assert.equal(new Set(MODULES_COMMUNS).size, MODULES_COMMUNS.length);
  for (const chemin of MODULES_COMMUNS) assert.ok(existsSync(join(ROOT, chemin)), `${chemin} existe`);
});

for (const module of MODULES_COMMUNS) {
  test(`fermeture d’imports de ${module} : reste dans la liste des modules communs`, () => {
    const dehors = fermeture(module).filter(chemin => !MODULES_COMMUNS.includes(chemin));
    assert.deepEqual(dehors, [], `${module} importe hors du chapeau : ${dehors.join(', ')}`);
  });
}

test('le registre des jeux et le sélecteur ne chargent aucune règle d’un jeu', () => {
  assert.deepEqual(fermeture('js/core/jeux.js'), []);
  assert.deepEqual(fermeture('js/ui/selecteur-jeu.js'), ['js/core/jeux.js']);
});
