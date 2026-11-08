import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { bumpVersion, VERSION_TARGETS } from '../../../tools/bump-version.mjs';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (base, file) => readFileSync(join(base, file), 'utf8');

function versionsIn(base) {
  return {
    app: read(base, 'js/version.js').match(/APP_VERSION = "([^"]+)"/)[1],
    pkg: JSON.parse(read(base, 'package.json')).version,
    lockTop: JSON.parse(read(base, 'package-lock.json')).version,
    lockRoot: JSON.parse(read(base, 'package-lock.json')).packages[''].version,
    html: read(base, 'index.html').match(/id="btn-version" type="button">Version ([^<]+)</)[1],
    readme: read(base, 'README.md').match(/^# Outil MJ — Warhammer \(v([^)]+)\)/m)[1],
    cache: read(base, 'sw.js').match(/const CACHE_NAME = '([^']+)';/)[1]
  };
}

test('HYG-04 — tous les emplacements de version du dépôt sont alignés et le cache suit la version sans suffixe', () => {
  const v = versionsIn(root);
  assert.deepEqual(
    { pkg: v.pkg, lockTop: v.lockTop, lockRoot: v.lockRoot, html: v.html, readme: v.readme, cache: v.cache },
    { pkg: v.app, lockTop: v.app, lockRoot: v.app, html: v.app, readme: v.app, cache: `wfrp-cache-v${v.app}` }
  );
});

test('HYG-04 — bump-version écrit la version partout, sans toucher aux notes ni aux fins de ligne', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bump-version-'));
  try {
    for (const { file } of VERSION_TARGETS) {
      mkdirSync(join(dir, file, '..'), { recursive: true });
      copyFileSync(join(root, file), join(dir, file));
    }
    // Simule un suffixe libre sur le cache, comme celui qui a cassé E03.
    writeFileSync(join(dir, 'sw.js'), read(dir, 'sw.js').replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'wfrp-cache-v1.0.0-essai2';"));
    const readmeBefore = read(dir, 'README.md');
    const changed = bumpVersion(dir, '9.8.7');
    assert.equal(changed.length, VERSION_TARGETS.length);
    const v = versionsIn(dir);
    assert.deepEqual(v, { app: '9.8.7', pkg: '9.8.7', lockTop: '9.8.7', lockRoot: '9.8.7', html: '9.8.7', readme: '9.8.7', cache: 'wfrp-cache-v9.8.7' });
    const readmeAfter = read(dir, 'README.md');
    assert.equal(readmeAfter.split('\n').length, readmeBefore.split('\n').length);
    assert.equal(readmeAfter.includes('\r\n'), readmeBefore.includes('\r\n'));
    assert.equal(readmeAfter.split('\n').slice(1).join('\n'), readmeBefore.split('\n').slice(1).join('\n'), 'seul le titre du README change');
    assert.deepEqual(bumpVersion(dir, '9.8.7'), [], 'relancer avec la même version ne change rien');
    assert.throws(() => bumpVersion(dir, '9.8'), /Version invalide/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
