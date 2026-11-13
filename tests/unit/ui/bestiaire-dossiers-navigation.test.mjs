// Navigation par dossiers de la Bibliothèque de bestiaire (chantier images des pions, T14, CA31-CA33) : filtre par
// dossier et compteurs, fonctions pures de js/core/bestiary-folder-tree.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BESTIARY_FOLDERS } from '../../../js/data/bestiary-folders.js';
import {
  UNCLASSIFIED_FOLDER, countByFolder, createFolderIndex, filterByFolder, folderLabelPath, folderOfProfile, folderPath, folderView, isWithinFolder
} from '../../../js/core/bestiary-folder-tree.js';

const dossiers = [
  { id: 'bestiaire', parent: null, label: 'Bestiaire', profiles: ['E0-P-001', 'E0-P-002'] },
  { id: 'ennemis', parent: null, label: 'Ennemis', profiles: [] },
  { id: 'ennemis/gobelins', parent: 'ennemis', label: 'Gobelins', profiles: ['E0-P-010'] },
  { id: 'ennemis/hommes-betes', parent: 'ennemis', label: 'Hommes-bêtes', profiles: ['E0-P-020', 'E0-P-021'] },
  { id: 'ennemis/vampires', parent: 'ennemis', label: 'Vampires', profiles: ['E0-P-030'] },
  { id: 'gabarits', parent: null, label: 'Gabarits', profiles: ['E0-P-900'] }
];
const p = (id, name, book = 'L06', page = 1, kind = 'profile') => ({ id, name, book, page, kind });
const profils = [
  p('E0-P-002', 'Wolf'), p('E0-P-001', 'Bear'), p('E0-P-010', 'Goblin'), p('E0-P-021', 'Gor'), p('E0-P-020', 'Bestigor', 'L09', 4),
  p('E0-P-030', 'Vampire'), p('E0-P-900', 'Soldat', 'L06', 2, 'template'), p('E0-P-777', 'Nouveau venu', 'L27')
];
const index = createFolderIndex(dossiers);

test('dossier d’un profil ; un profil non classé va dans « À classer »', () => {
  assert.equal(folderOfProfile(index, profils[3]), 'ennemis/hommes-betes');
  assert.equal(folderOfProfile(index, profils[7]), UNCLASSIFIED_FOLDER);
  assert.equal(index.folders.get(UNCLASSIFIED_FOLDER).label, 'À classer');
  assert.equal(index.folders.get(UNCLASSIFIED_FOLDER).parent, null);
});

test('filtre par dossier : le dossier et ses sous-dossiers ; tout depuis la racine ; pas de faux préfixe', () => {
  assert.ok(isWithinFolder('ennemis/gobelins', 'ennemis'));
  assert.ok(!isWithinFolder('ennemis-bis', 'ennemis'));
  assert.ok(isWithinFolder('bestiaire', null));
  assert.deepEqual(filterByFolder(index, profils, 'ennemis').map(x => x.id), ['E0-P-010', 'E0-P-021', 'E0-P-020', 'E0-P-030']);
  assert.deepEqual(filterByFolder(index, profils, 'ennemis/hommes-betes').map(x => x.id), ['E0-P-021', 'E0-P-020']);
  assert.equal(filterByFolder(index, profils, null).length, profils.length);
  assert.deepEqual(filterByFolder(index, profils, UNCLASSIFIED_FOLDER).map(x => x.id), ['E0-P-777']);
});

test('compteurs : chaque dossier compte ses profils et ceux de ses sous-dossiers', () => {
  const compte = countByFolder(index, profils);
  assert.equal(compte.get('ennemis'), 4);
  assert.equal(compte.get('ennemis/hommes-betes'), 2);
  assert.equal(compte.get('bestiaire'), 2);
  assert.equal(compte.get(UNCLASSIFIED_FOLDER), 1);
  assert.equal(compte.get('gabarits'), 1);
});

test('chemin et libellé complet pour le fil d’Ariane', () => {
  assert.deepEqual(folderPath(index, 'ennemis/hommes-betes'), [{ id: 'ennemis', label: 'Ennemis' }, { id: 'ennemis/hommes-betes', label: 'Hommes-bêtes' }]);
  assert.deepEqual(folderPath(index, null), []);
  assert.equal(folderLabelPath(index, 'ennemis/hommes-betes'), 'Ennemis › Hommes-bêtes');
});

test('vue de la racine : dossiers de premier niveau avec compteurs, « À classer » en dernier, aucun profil à plat', () => {
  const vue = folderView(index, profils, null);
  assert.deepEqual(vue.subfolders.map(d => [d.id, d.count, d.folders]), [['bestiaire', 2, 0], ['ennemis', 4, 3], ['gabarits', 1, 0], [UNCLASSIFIED_FOLDER, 1, 0]]);
  assert.deepEqual(vue.profiles, []);
  assert.equal(vue.total, profils.length);
});

test('vue d’un dossier : sous-dossiers avec compteurs, profils rangés directement, triés par nom', () => {
  const ennemis = folderView(index, profils, 'ennemis');
  assert.deepEqual(ennemis.subfolders.map(d => [d.label, d.count]), [['Gobelins', 1], ['Hommes-bêtes', 2], ['Vampires', 1]]);
  assert.deepEqual(ennemis.profiles, []);
  assert.equal(ennemis.total, 4);
  const hb = folderView(index, profils, 'ennemis/hommes-betes');
  assert.deepEqual(hb.profiles.map(x => x.name), ['Bestigor', 'Gor']);
  assert.deepEqual(hb.path.map(x => x.label), ['Ennemis', 'Hommes-bêtes']);
  assert.equal(folderView(index, profils, 'inconnu').scope, null);
});

test('filtre actif : liste à plat sur le dossier et ses sous-dossiers, compteurs qui suivent le filtre, dossiers vides masqués', () => {
  const filtres = profils.filter(x => /^(G|B)/.test(x.name));
  const vue = folderView(index, filtres, 'ennemis', { flat: true });
  assert.deepEqual(vue.profiles.map(x => x.name), ['Bestigor', 'Goblin', 'Gor']);
  assert.deepEqual(vue.subfolders.map(d => [d.label, d.count]), [['Gobelins', 1], ['Hommes-bêtes', 2]]);
  const racine = folderView(index, filtres, null, { flat: true });
  assert.deepEqual(racine.profiles.map(x => x.name), ['Bear', 'Bestigor', 'Goblin', 'Gor']);
  assert.deepEqual(racine.subfolders.map(d => [d.id, d.count, d.folders]), [['bestiaire', 1, 0], ['ennemis', 3, 2]]);
});

test('classement réel : tout dossier généré est dans l’index, chacun sous son parent', () => {
  const reel = createFolderIndex(BESTIARY_FOLDERS);
  for (const dossier of BESTIARY_FOLDERS) {
    assert.ok(reel.folders.has(dossier.id));
    if (dossier.parent) assert.ok(reel.folders.get(dossier.parent).children.includes(dossier.id));
  }
  assert.equal(folderLabelPath(reel, 'ennemis/hommes-betes'), 'Ennemis › Hommes-bêtes');
});
