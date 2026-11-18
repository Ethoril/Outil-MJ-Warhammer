// Garde-fou (décision du MJ du 06/11) : aucune boîte native `confirm`, `alert` ou `prompt` dans js/.
// Le navigateur intégré de l'app les refuse sans les afficher : l'action correspondante serait impossible.
// Remplacer par un toast (avec « Annuler » si l'action est annulable par ↶) ou par `confirmInTool` (ui/encounter-end-dialog.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const JS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../js');

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Retire commentaires et chaînes (gabarits compris) pour ne garder que le code.
function codeOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, '""');
}

test('aucune boîte native confirm/alert/prompt dans js/', () => {
  const found = [];
  for (const file of listJsFiles(JS_DIR)) {
    const code = codeOnly(fs.readFileSync(file, 'utf8'));
    // `obj.confirm(` n'est pas une boîte native ; `window.confirm(` ou `confirm(` seul l'est.
    for (const match of code.matchAll(/(?<![\w$.])(?:window\.|globalThis\.)?(confirm|alert|prompt)\s*\(/g)) {
      const line = code.slice(0, match.index).split('\n').length;
      found.push(`${path.relative(JS_DIR, file).replace(/\\/g, '/')}:${line} ${match[1]}(`);
    }
  }
  assert.deepEqual(found, [], `boîtes natives interdites : ${found.join(', ')}`);
});
