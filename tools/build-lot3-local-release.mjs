/** Export only the application's explicit precache assets, never local sessions or fixtures. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, realpathSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../js/version.js';

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const worker = readFileSync(resolve(root, 'sw.js'), 'utf8');
assert.ok(worker.includes(`wfrp-cache-v${APP_VERSION}`));
assert.equal(JSON.parse(readFileSync(resolve(root, 'package.json'))).version, APP_VERSION);
assert.equal(JSON.parse(readFileSync(resolve(root, 'package-lock.json'))).version, APP_VERSION);
const declaration = worker.match(/const ASSETS_TO_CACHE = \[([\s\S]*?)\];/);
assert.ok(declaration, 'Explicit precache inventory required');
const files = new Set(['sw.js']);
for (const match of declaration[1].matchAll(/['"]\.\/([^'"]*)['"]/g)) {
  files.add(match[1] || 'index.html');
}
const out = resolve(root, 'tmp/lot3/release', `outil-mj-${APP_VERSION}-${Date.now()}`);
assert.ok(!existsSync(out));
const manifest = [];
for (const file of [...files].sort()) {
  assert.ok(!/(?:^|\/)(?:tests|tools|docs|tmp|sessions|profiles|private|exports?)(?:\/|$)/i.test(file) && !/\.(?:pdf|xlsx|docx)$|\.test\.js$|browser\.mjs$/i.test(file), 'Only public application assets may be exported: '+file);
  const source = realpathSync(resolve(root, file));
  assert.ok(source.startsWith(root + sep), 'Asset must stay in checkout');
  const destination = resolve(out, file);
  assert.ok(destination.startsWith(out + sep), 'Asset must stay in release');
  const bytes = readFileSync(source);
  mkdirSync(dirname(destination), { recursive: true }); copyFileSync(source, destination);
  manifest.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const magicRuleVersion=readFileSync(resolve(root,'js/core/v5-magic-casting.js'),'utf8').match(/V5_MAGIC_CASTING_VERSION = '([^']+)'/)[1];
const ruleVersion = readFileSync(resolve(root, 'js/core/v5-combat-rules.js'), 'utf8').match(/V5_COMBAT_RULE_VERSION = '([^']+)'/)[1];
writeFileSync(resolve(out, 'release-manifest.json'), JSON.stringify({
  appVersion: APP_VERSION, ruleVersion,magicRuleVersion, status: 'local-ready-unpublished',
  content: 'Explicit application precache and service worker; no sessions, tests, books or private exports',
  files: manifest
}, null, 2));
writeFileSync(resolve(root, 'tmp/lot3/release-path.json'), JSON.stringify({ directory: out, files: manifest.length, appVersion: APP_VERSION }, null, 2));
console.log(`${manifest.length} application assets exported: ${out}`);
