// Le service worker liste à la main les fichiers de la coquille applicative.
// cache.addAll() rejette EN BLOC si un seul chemin est faux : l'installation échoue,
// le worker ne s'active jamais, et il n'y a plus aucun mode hors-ligne — sans erreur
// visible, puisque register() réussit malgré tout.
// Ce test vérifie que la liste et l'arborescence réelle concordent, dans les deux sens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(racine, 'sw.js'), 'utf8');

const listés = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);

// .json compris : le lot 13 ajoutera un instantané de mots-clés sous js/data/,
// qui doit être mis en cache comme le reste de la coquille.
function modulesDuDisque(rel) {
  const abs = join(racine, rel);
  return readdirSync(abs).flatMap(nom => {
    const chemin = join(abs, nom);
    if (statSync(chemin).isDirectory()) return modulesDuDisque(`${rel}/${nom}`);
    return /\.(js|json)$/.test(nom) ? [`${rel}/${nom}`] : [];
  });
}

test('sw.js — tous les fichiers listés existent réellement', () => {
  const absents = listés.filter(f => !existsSync(join(racine, f)));
  assert.deepEqual(absents, [],
    `cache.addAll() rejetterait en bloc et le service worker ne s'activerait pas : ${absents.join(', ')}`);
});

test('sw.js — tous les modules de js/ sont mis en cache', () => {
  const oubliés = modulesDuDisque('js').filter(f => !listés.includes(f));
  assert.deepEqual(oubliés, [],
    `ces modules ne seraient pas disponibles hors ligne à froid : ${oubliés.join(', ')}`);
});

test('sw.js — le cache est versionné et purgé à l\'activation', () => {
  assert.match(sw, /CACHE_NAME\s*=\s*['"][^'"]*\d+\.\d+/, 'le nom du cache doit porter une version');
  assert.match(sw, /caches\.keys\(\)/, 'les anciens caches doivent être énumérés');
  assert.match(sw, /caches\.delete\(/, 'et supprimés à l\'activation');
});

test('sw.js — Firebase et gstatic ne sont jamais servis depuis le cache en priorité', () => {
  // Le §13.2 l'exige : la couche localStorage gère déjà la persistance, un doublon
  // de cache produirait des incohérences pénibles à diagnostiquer.
  const bloc = sw.slice(sw.indexOf("addEventListener('fetch'"));
  const posReseau = bloc.search(/hostname\.includes\(['"]firebase/);
  const posCache = bloc.search(/caches\.match/);
  assert.ok(posReseau > -1, 'un traitement dédié à Firebase doit exister');
  assert.ok(posReseau < posCache, 'et passer avant la stratégie cache-first');
});

test('index.html — la coquille référencée est bien mise en cache', () => {
  const html = readFileSync(join(racine, 'index.html'), 'utf8');
  const locales = [...html.matchAll(/(?:href|src)="(?!https?:|data:|#)([^"]+)"/g)]
    .map(m => m[1].replace(/^\.\//, ''))
    .filter(f => /\.(css|js|svg|webmanifest)$/.test(f));
  const oubliées = locales.filter(f => !listés.includes(f) && f !== 'sw.js');
  assert.deepEqual(oubliées, [], `référencées par index.html mais hors cache : ${oubliées.join(', ')}`);
});
