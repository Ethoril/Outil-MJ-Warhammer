// Verrou de régénération du bestiaire (restes du 15/11) : tools/build-bestiary-profiles.mjs --check redonne à l'octet près les
// js/data/bestiary/L*.json publiés (L01-L26, L28) et l'index. Les PDF du corpus sont hors du dépôt : sans eux (CI), le test est sauté ;
// présents, un PDF changé ou une régénération différente le font échouer en nommant le livre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpusBooks } from '../../../tools/lib/bestiary-extract.mjs';
import { resolvePdftotext, PDFTOTEXT_ATTENDU } from '../../../tools/lib/pdftotext-version.mjs';

const racine = fileURLToPath(new URL('../../../', import.meta.url));
const LIVRES = ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L09', 'L10', 'L11', 'L12', 'L13', 'L14', 'L16', 'L17', 'L18', 'L19', 'L20',
  'L21', 'L22', 'L23', 'L24', 'L25', 'L26', 'L28'];

function sourcesAbsentes() {
  const outil = resolvePdftotext();
  const absentes = outil.ok ? [] : [outil.raison === 'version' ? `pdftotext en version autre que ${PDFTOTEXT_ATTENDU} (${outil.message})` : 'pdftotext (Poppler)'];
  const livres = new Map(corpusBooks().map(livre => [livre.id, livre]));
  for (const id of LIVRES) if (!livres.has(id) || !existsSync(livres.get(id).path)) absentes.push(`${id} (${livres.get(id)?.path ?? 'hors manifeste'})`);
  return absentes;
}

test('la régénération du bestiaire redonne les fichiers publiés (L01-L26, L28, index)', t => {
  const absentes = sourcesAbsentes();
  if (absentes.length) { t.skip(`sources du corpus absentes, contrôle impossible ici : ${absentes.join(', ')}`); return; }
  const run = spawnSync(process.execPath, [join(racine, 'tools/build-bestiary-profiles.mjs'), '--check', ...LIVRES], { cwd: racine, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 600000 });
  assert.equal(run.status, 0, `${run.stderr}`.trim().split('\n').slice(-5).join('\n'));
  assert.match(run.stdout, /Régénération identique aux fichiers publiés/);
});
