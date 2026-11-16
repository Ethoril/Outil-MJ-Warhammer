// Liste des montures proposées sur la fiche (js/data/montures-fiches.js, générée par tools/build-fiche-mounts.mjs) :
// elle égale l'ensemble des montures du bestiaire, recalculé ici avec isMountCandidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MONTURES_FICHES, montureFicheDe } from '../../../js/data/montures-fiches.js';
import { isMountCandidate } from '../../../js/core/mounts.js';

const racine = new URL('../../../', import.meta.url);
const lire = chemin => JSON.parse(readFileSync(new URL(chemin, racine), 'utf8'));
const index = lire('js/data/bestiary/index.json');
const livres = new Map(index.books.map(entry => [entry.book, lire(`js/data/bestiary/${entry.file}`)]));
const attendues = [...livres.values()].flatMap(livre => livre.profiles
  .filter(p => (p.kind === 'profile' || !p.kind) && isMountCandidate(p)).map(p => ({ livre: livre.book, id: p.id })));
const collator = new Intl.Collator('fr', { sensitivity: 'base' });

test('la liste égale les montures du bestiaire, figée', () => {
  assert.ok(attendues.length > 0);
  const norme = rows => rows.map(r => `${r.livre}/${r.id}`).sort();
  assert.deepEqual(norme(MONTURES_FICHES), norme(attendues));
  assert.ok(Object.isFrozen(MONTURES_FICHES) && MONTURES_FICHES.every(Object.isFrozen));
});

test('clés uniques, id = clé, id présent dans son livre, titre de l’index, libellé non vide', () => {
  assert.equal(new Set(MONTURES_FICHES.map(m => m.cle)).size, MONTURES_FICHES.length);
  for (const m of MONTURES_FICHES) {
    assert.equal(m.id, m.cle);
    assert.ok(livres.get(m.livre).profiles.some(p => p.id === m.id), `${m.id} absent de ${m.livre}`);
    assert.equal(m.titreLivre, index.books.find(entry => entry.book === m.livre).title);
    assert.ok(m.libelle.trim().length > 0, `libellé vide pour ${m.id}`);
  }
});

test('libellé : nom français d’abord, sinon nom du livre', () => {
  for (const m of MONTURES_FICHES) {
    const p = livres.get(m.livre).profiles.find(row => row.id === m.id);
    assert.equal(m.libelle, String(p.nameFr ?? '').trim() || String(p.name ?? '').trim());
  }
});

test('ordre : libellé (français, sans accents ni casse), puis livre, puis identifiant', () => {
  for (let i = 1; i < MONTURES_FICHES.length; i += 1) {
    const a = MONTURES_FICHES[i - 1], b = MONTURES_FICHES[i];
    const ordre = collator.compare(a.libelle, b.libelle) || (a.livre < b.livre ? -1 : a.livre > b.livre ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    assert.ok(ordre < 0, `${a.libelle} (${a.id}) doit précéder ${b.libelle} (${b.id})`);
  }
});

test('montureFicheDe rend l’entrée, undefined pour une clé inconnue', () => {
  const premiere = MONTURES_FICHES[0];
  assert.equal(montureFicheDe(premiere.cle), premiere);
  assert.equal(montureFicheDe('inconnue'), undefined);
  assert.equal(montureFicheDe(undefined), undefined);
});

test('le fichier généré n’a aucun import et est en LF', () => {
  const texte = readFileSync(new URL('js/data/montures-fiches.js', racine), 'utf8');
  assert.ok(!/^\s*import[\s{(]/m.test(texte) && !/\bimport\s*\(/.test(texte));
  assert.ok(!texte.includes('\r'));
});
