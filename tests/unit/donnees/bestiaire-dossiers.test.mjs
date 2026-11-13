// Classement de tout le bestiaire en dossiers (chantier images des pions, T13, CA33) : js/data/bestiary-folders.js,
// généré par tools/build-bestiary-folders.mjs depuis le bestiaire et tools/token-images-categories.csv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BESTIARY_FOLDERS } from '../../../js/data/bestiary-folders.js';
import { buildFolders, TEMPLATES_FOLDER } from '../../../tools/build-bestiary-folders.mjs';
import { loadBestiary } from '../../../tools/list-missing-token-images.mjs';
import { creatureKey } from '../../../tools/lib/creature-key.mjs';

const racine = fileURLToPath(new URL('../../../', import.meta.url));
const lancer = args => spawnSync(process.execPath, [join(racine, 'tools/build-bestiary-folders.mjs'), ...args], { cwd: racine, encoding: 'utf8' });
const livres = loadBestiary(racine);
const profils = livres.flatMap(livre => livre.profiles);
const dossierDe = new Map();
const doublons = [];
for (const dossier of BESTIARY_FOLDERS) for (const id of dossier.profiles) { if (dossierDe.has(id)) doublons.push(id); dossierDe.set(id, dossier.id); }
const parId = new Map(BESTIARY_FOLDERS.map(dossier => [dossier.id, dossier]));

test('chaque profil du bestiaire est dans un dossier et un seul ; aucun id inconnu', () => {
  assert.deepEqual(doublons, []);
  const sansDossier = profils.filter(p => !dossierDe.has(p.id)).map(p => `${p.id} ${p.name}`);
  assert.deepEqual(sansDossier, [], 'profils sans dossier : regarder git log (profils ajoutés par une autre session ?) puis relancer le générateur');
  const ids = new Set(profils.map(p => p.id));
  assert.deepEqual([...dossierDe.keys()].filter(id => !ids.has(id)), []);
});

test('tout dossier a un libellé, un parent existant, et les parents précèdent leurs enfants', () => {
  const vus = new Set();
  for (const dossier of BESTIARY_FOLDERS) {
    assert.match(dossier.id, /^[a-z0-9-]+(\/[a-z0-9-]+)*$/);
    assert.ok(typeof dossier.label === 'string' && dossier.label.trim(), `libellé manquant : ${dossier.id}`);
    const parent = dossier.id.includes('/') ? dossier.id.slice(0, dossier.id.lastIndexOf('/')) : null;
    assert.equal(dossier.parent, parent);
    if (parent) assert.ok(vus.has(parent), `parent absent ou placé après : ${dossier.id}`);
    vus.add(dossier.id);
  }
  assert.equal(parId.get('ennemis/hommes-betes').label, 'Hommes-bêtes');
  assert.equal(parId.get('ennemis').label, 'Ennemis');
  assert.equal(parId.get('pnj').label, 'PNJ nommés');
  assert.equal(parId.get('pnj/l01').label, `L01 — ${livres.find(l => l.book === 'L01').title}`);
  assert.deepEqual(BESTIARY_FOLDERS.filter(d => !d.parent).map(d => d.id), ['bestiaire', 'monstres', 'ennemis', 'peuples', 'pnj', 'pj', TEMPLATES_FOLDER]);
});

test('aucun dossier vide ; les dossiers sont ceux du classement relu par le MJ', () => {
  const avecProfils = new Set(BESTIARY_FOLDERS.filter(d => d.profiles.length).map(d => d.id));
  for (const dossier of BESTIARY_FOLDERS) assert.ok([...avecProfils].some(id => id === dossier.id || id.startsWith(`${dossier.id}/`)), `dossier vide : ${dossier.id}`);
});

test('les gabarits sont tous dans « Gabarits », et seulement eux, même quand leur clé est celle d’un profil', () => {
  const gabarits = profils.filter(p => p.kind === 'template');
  assert.ok(gabarits.length > 0);
  assert.equal(parId.get(TEMPLATES_FOLDER).label, 'Gabarits');
  assert.deepEqual([...parId.get(TEMPLATES_FOLDER).profiles].sort(), gabarits.map(p => p.id).sort());
  const clesGabarits = new Set(gabarits.map(creatureKey));
  const homonymes = profils.filter(p => p.kind !== 'template' && clesGabarits.has(creatureKey(p)));
  assert.ok(homonymes.length > 0, 'cas des clés partagées (soldat…) attendu au bestiaire');
  for (const p of homonymes) assert.notEqual(dossierDe.get(p.id), TEMPLATES_FOLDER, p.id);
});

test('générateur : une créature non classée ou un dossier sans libellé font échouer', () => {
  const livre = { book: 'L06', title: 'Livre de base V5', profiles: [{ id: 'E0-P-001', kind: 'profile', name: 'Wolf', nameFr: 'Loup' }] };
  assert.throws(() => buildFolders({ books: [livre], categories: new Map() }), /loup/);
  assert.throws(() => buildFolders({ books: [livre], categories: new Map([['loup', { folder: 'inconnu/sous' }]]) }), /libellé/);
  const ok = buildFolders({ books: [livre], categories: new Map([['loup', { folder: 'bestiaire' }]]) });
  assert.deepEqual(ok, [{ id: 'bestiaire', parent: null, label: 'Bestiaire', profiles: ['E0-P-001'] }]);
});

test('module à jour (--check vert) ; --check rouge sans rien écrire sur un fichier dérivé ; LF', () => {
  const vert = lancer(['--check']);
  assert.equal(vert.status, 0, vert.stderr);
  const texte = readFileSync(join(racine, 'js/data/bestiary-folders.js'), 'utf8');
  assert.ok(!texte.includes('\r'));
  assert.match(texte, /ne pas modifier à la main/);
  const sortie = join(mkdtempSync(join(tmpdir(), 'dossiers-')), 'bestiary-folders.js');
  writeFileSync(sortie, 'dérivé\n');
  const rouge = lancer(['--check', '--out', sortie]);
  assert.equal(rouge.status, 1);
  assert.equal(readFileSync(sortie, 'utf8'), 'dérivé\n');
});
