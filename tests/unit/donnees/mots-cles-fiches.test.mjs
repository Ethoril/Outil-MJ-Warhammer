// Mots-clés des fiches : types (Haine, Animosité, Préjugé, Sans peur) en donnée unique de l'outil, et générateur
// tools/build-fiche-keywords.mjs qui écrit référentiel et types dans le dépôt des fiches, avec un en-tête généré.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FICHE_KEYWORD_TYPES } from '../../../js/data/fiche-keyword-types.js';
import { BASE_KEYWORDS } from '../../../js/data/creature-keywords.js';
import { FICHES_FICHIERS, enTete, generate, synchroniser } from '../../../tools/build-fiche-keywords.mjs';

const lire = chemin => readFileSync(new URL(`../../../${chemin}`, import.meta.url), 'utf8');
const depotVide = () => { const dossier = mkdtempSync(join(tmpdir(), 'fiches-mots-cles-')); mkdirSync(join(dossier, 'js/data'), { recursive: true }); return dossier; };
const sha = texte => createHash('sha256').update(texte).digest('hex');

test('les types sont une donnée unique, figée, de l’outil', () => {
  assert.deepEqual(FICHE_KEYWORD_TYPES, { haine: 'Haine', animosite: 'Animosité', prejuge: 'Préjugé', 'sans-peur': 'Sans peur' });
  assert.ok(Object.isFrozen(FICHE_KEYWORD_TYPES));
  assert.ok(!/^\s*import[\s{(]/m.test(lire('js/data/fiche-keyword-types.js')), 'copié tel quel côté fiches : aucun import');
});

test('generate : référentiel et types, corps identiques aux sources, en-tête avec commit et empreinte du corps', () => {
  const fichiers = generate({ commit: 'abc1234' });
  assert.deepEqual(fichiers.map(f => f.copie), [FICHES_FICHIERS.referentiel, FICHES_FICHIERS.types]);
  for (const f of fichiers) {
    const source = lire(f.source);
    assert.equal(f.text, `${enTete(f.source, 'abc1234', source)}${source}`);
    const [ligne1, ligne2, ...reste] = f.text.split('\n');
    assert.match(ligne1, /^\/\/ Fichier généré par node tools\/build-fiche-keywords\.mjs depuis l'outil MJ \(commit abc1234\) : ne pas modifier à la main\.$/);
    assert.equal(ligne2, `// Source : ${f.source} · sha256 du corps : ${sha(reste.join('\n'))}`);
    assert.ok(!f.text.includes('\r'));
  }
  assert.ok(BASE_KEYWORDS.length > 0);
});

test('synchroniser : écrit, puis --check passe ; un autre commit seul n’est pas une dérive', () => {
  const depot = depotVide();
  try {
    assert.equal(synchroniser({ depot, check: true, commit: 'aaaaaaa' }).ok, false, 'absent : écart');
    assert.equal(existsSync(join(depot, FICHES_FICHIERS.types)), false, 'check n’écrit rien');
    assert.equal(synchroniser({ depot, commit: 'aaaaaaa' }).ok, true);
    assert.equal(synchroniser({ depot, check: true, commit: 'aaaaaaa' }).ok, true);
    assert.equal(synchroniser({ depot, check: true, commit: 'bbbbbbb' }).ok, true, 'le commit change à chaque modification de l’outil : pas une dérive');
    assert.match(readFileSync(join(depot, FICHES_FICHIERS.types), 'utf8'), /\(commit aaaaaaa\)/);
  } finally { rmSync(depot, { recursive: true, force: true }); }
});

test('synchroniser --check : corps modifié à la main, ou en-tête absent, signalé', () => {
  const depot = depotVide();
  try {
    synchroniser({ depot, commit: 'aaaaaaa' });
    const cible = join(depot, FICHES_FICHIERS.types);
    const bon = readFileSync(cible, 'utf8');
    writeFileSync(cible, bon.replace("'Haine'", "'Haïne'"));
    const modifie = synchroniser({ depot, check: true, commit: 'aaaaaaa' });
    assert.equal(modifie.ok, false);
    assert.match(modifie.lignes.join('\n'), /différente.*mots-cles-types\.js/);
    writeFileSync(cible, bon.split('\n').slice(2).join('\n'));
    assert.equal(synchroniser({ depot, check: true, commit: 'aaaaaaa' }).ok, false, 'sans en-tête');
    assert.equal(synchroniser({ depot, commit: 'aaaaaaa' }).ok, true, 'sans --check : réécrit');
    assert.equal(synchroniser({ depot, check: true, commit: 'aaaaaaa' }).ok, true);
  } finally { rmSync(depot, { recursive: true, force: true }); }
});

test('synchroniser : dépôt introuvable → échec explicite', () => {
  const resultat = synchroniser({ depot: join(tmpdir(), 'depot-fiches-inexistant-xyz'), check: true, commit: 'aaaaaaa' });
  assert.equal(resultat.ok, false);
  assert.match(resultat.lignes.join('\n'), /introuvable/);
});
