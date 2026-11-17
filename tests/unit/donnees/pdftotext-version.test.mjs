// Détection de la version de pdftotext : le bestiaire publié vient de la 4.00 (Git for Windows), pas de Poppler 25.x.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePdftotextVersion, resolvePdftotext, PDFTOTEXT_ATTENDU } from '../../../tools/lib/pdftotext-version.mjs';

const GIT = 'C:/Program Files/Git/mingw64/bin/pdftotext.exe';
const sortie = version => ({ stderr: `pdftotext version ${version}\nCopyright 2005-2025 The Poppler Developers\n`, stdout: '' });
// Faux exécuteur : une table chemin -> version (absent de la table = introuvable).
const faux = table => chemin => table[chemin] ? sortie(table[chemin]) : { error: new Error('ENOENT'), stderr: '', stdout: '' };

test('parsePdftotextVersion lit la version dans la sortie de -v', () => {
  assert.equal(parsePdftotextVersion('pdftotext version 4.00\nCopyright'), '4.00');
  assert.equal(parsePdftotextVersion('pdftotext version 25.07.0\n'), '25.07.0');
  assert.equal(parsePdftotextVersion('n’importe quoi'), null);
  assert.equal(PDFTOTEXT_ATTENDU, '4.00');
});

test('resolvePdftotext prend le pdftotext de Git (4.00) même si Poppler 25.07 est en tête du PATH', () => {
  const r = resolvePdftotext({ env: {}, exists: () => true, runner: faux({ [GIT]: '4.00', pdftotext: '25.07.0' }) });
  assert.equal(r.ok, true);
  assert.equal(r.path, GIT);
});

test('resolvePdftotext : la variable PDFTOTEXT prime', () => {
  const r = resolvePdftotext({ env: { PDFTOTEXT: 'D:/x/pdftotext.exe' }, exists: () => true, runner: faux({ 'D:/x/pdftotext.exe': '4.00', [GIT]: '4.00' }) });
  assert.equal(r.path, 'D:/x/pdftotext.exe');
});

test('resolvePdftotext : sans Git, retombe sur le PATH si c’est la 4.00', () => {
  const r = resolvePdftotext({ env: {}, exists: () => false, runner: faux({ pdftotext: '4.00' }) });
  assert.equal(r.ok, true);
  assert.equal(r.path, 'pdftotext');
});

test('resolvePdftotext : autre version sans la 4.00 -> refus motivé en français', () => {
  const r = resolvePdftotext({ env: {}, exists: () => false, runner: faux({ pdftotext: '25.07.0' }) });
  assert.equal(r.ok, false);
  assert.equal(r.raison, 'version');
  assert.match(r.message, /4\.00/);
  assert.match(r.message, /25\.07\.0/);
});

test('resolvePdftotext : aucun pdftotext -> absent', () => {
  const r = resolvePdftotext({ env: {}, exists: () => false, runner: faux({}) });
  assert.equal(r.ok, false);
  assert.equal(r.raison, 'absent');
});

test('resolvePdftotext : PDFTOTEXT pointe une mauvaise version -> refus, sans repli silencieux', () => {
  const r = resolvePdftotext({ env: { PDFTOTEXT: 'P' }, exists: () => true, runner: faux({ P: '25.07.0', [GIT]: '4.00' }) });
  assert.equal(r.ok, false);
  assert.equal(r.raison, 'version');
});
