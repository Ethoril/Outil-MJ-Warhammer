#!/usr/bin/env node
// Écrit la version de l’application dans tous ses emplacements.
// Usage : node tools/bump-version.mjs 3.43.0
// Les notes de version (README ligne 3, docs/SUIVI_EVOLUTION.md) restent à rédiger à la main.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

// Chaque règle remplace exactement une occurrence ; une règle qui ne trouve rien fait échouer le script.
export const VERSION_TARGETS = [
  { file: 'js/version.js', pattern: /APP_VERSION = "[^"]+"/, replace: (v) => `APP_VERSION = "${v}"` },
  { file: 'package.json', pattern: /("name": "outil-mj-warhammer",\s*"version": )"[^"]+"/, replace: (v, m1) => `${m1}"${v}"` },
  { file: 'package-lock.json', pattern: /("name": "outil-mj-warhammer",\s*"version": )"[^"]+"/, replace: (v, m1) => `${m1}"${v}"`, count: 2 },
  { file: 'index.html', pattern: /(<button id="btn-version" type="button">)Version [^<]+</, replace: (v, m1) => `${m1}Version ${v}<` },
  { file: 'README.md', pattern: /^# Outil MJ — Warhammer \(v[^)]+\)/m, replace: (v) => `# Outil MJ — Warhammer (v${v})` },
  // Le nom du cache suit la version, sans suffixe : les tests PWA le reconstruisent depuis APP_VERSION.
  { file: 'sw.js', pattern: /const CACHE_NAME = '[^']+';/, replace: (v) => `const CACHE_NAME = 'wfrp-cache-v${v}';` }
];

export function bumpVersion(root, version) {
  if (!VERSION_PATTERN.test(String(version || ''))) {
    throw new Error(`Version invalide : « ${version} » (attendu : X.Y.Z).`);
  }
  const changed = [];
  for (const target of VERSION_TARGETS) {
    const path = join(root, target.file);
    const source = readFileSync(path, 'utf8');
    const expected = target.count || 1;
    const global = new RegExp(target.pattern.source, target.pattern.flags.includes('g') ? target.pattern.flags : `${target.pattern.flags}g`);
    const found = source.match(global) || [];
    if (found.length !== expected) {
      throw new Error(`${target.file} : ${found.length} emplacement(s) de version trouvé(s), ${expected} attendu(s).`);
    }
    const next = source.replace(global, (_match, m1) => target.replace(version, m1));
    if (next !== source) {
      writeFileSync(path, next, 'utf8');
      changed.push(target.file);
    }
  }
  return changed;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const changed = bumpVersion(root, process.argv[2]);
    console.log(changed.length ? `Version ${process.argv[2]} écrite dans : ${changed.join(', ')}` : 'Version déjà à jour.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
