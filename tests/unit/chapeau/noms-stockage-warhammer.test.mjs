// Noms de stockage de Warhammer figés (multi-jeux, lot L2, CA18) : toute modification d'un de ces noms fait échouer le test.
// Un nom changé = des sauvegardes de production orphelines (base IndexedDB, clés localStorage, chemins Firebase, type de commande des fiches).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PERSISTENCE_DB } from '../../../js/core/persistence.js';
import { CURRENT_SCHEMA_VERSION, LEGACY_SCHEMA_KEY } from '../../../js/core/migrations.js';
import { WRITEBACK_COMMAND_TYPE } from '../../../js/core/fiche-writeback.js';
import { KEY } from '../../../js/core/store.js';
import { JEUX } from '../../../js/core/jeux.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const lire = chemin => readFileSync(join(ROOT, chemin), 'utf8');

test('CA18 — base IndexedDB, schéma et type de commande des fiches', () => {
  assert.equal(DEFAULT_PERSISTENCE_DB, 'wfrp-persistence-v2');
  assert.equal(CURRENT_SCHEMA_VERSION, 4);
  assert.equal(WRITEBACK_COMMAND_TYPE, 'outil-mj');
});

test('CA18 — les trois chemins Firebase de sync.js (courant, précédent, historique)', () => {
  const source = lire('js/core/sync.js');
  assert.ok(source.includes('`wfrp-sessions-v3/${user.uid}/current`'), 'chemin courant');
  assert.ok(source.includes('`wfrp-sessions-v2/${user.uid}/current`'), 'chemin précédent');
  assert.ok(source.includes('`wfrp-sessions/${user.uid}/current`'), 'chemin historique');
});

test('CA18 — clés localStorage « wfrp.* » du Store', () => {
  assert.deepEqual({ ...KEY }, {
    SCHEMA: 'wfrp.schema.v1', EXTENSIONS: 'wfrp.extensions.v1', RESERVE: 'wfrp.reserve.v1',
    COMBAT: 'wfrp.combat.v1', LOG: 'wfrp.log.v1', DICE: 'wfrp.dice.v1', TS: 'wfrp.sync.ts.v1'
  });
  assert.equal(LEGACY_SCHEMA_KEY, 'wfrp.schema.v1');
});

/** Tous les fichiers .js de js/ hors js/data/ (les données portent des textes, pas des clés de stockage). */
function sources(dossier = join(ROOT, 'js')) {
  return readdirSync(dossier).flatMap(nom => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === 'data' ? [] : sources(chemin);
    return nom.endsWith('.js') ? [chemin] : [];
  });
}

test('CA18 — aucune autre clé « wfrp.* » dans le code : la liste est exactement celle d’aujourd’hui', () => {
  const trouvees = new Set();
  for (const fichier of sources()) {
    for (const m of readFileSync(fichier, 'utf8').matchAll(/['"`](wfrp\.[A-Za-z0-9._-]+)['"`]/g)) trouvees.add(m[1]);
  }
  assert.deepEqual([...trouvees].sort(), [
    'wfrp.combat.v1', 'wfrp.dice.v1', 'wfrp.extensions.v1', 'wfrp.log.v1', 'wfrp.references.v1', 'wfrp.reserve.v1',
    'wfrp.rules.favorites.v1', 'wfrp.schema.v1', 'wfrp.sidePanel', 'wfrp.sync.ts.v1', 'wfrp.theme'
  ], `fichiers scannés : ${sources().map(f => relative(ROOT, f)).length}`);
});

test('CA18 — thème et panneau latéral gardent leurs clés « wfrp.* » (préférences de l’outil, partagées par les jeux)', () => {
  assert.ok(lire('js/ui/theme.js').includes("const SAVED_KEY = 'wfrp.theme'"));
  assert.ok(lire('js/ui/side-panel.js').includes("const STORAGE_KEY = 'wfrp.sidePanel'"));
});

test('CA18 — l’entrée « warhammer » du registre reprend la même base et le même préfixe', () => {
  const warhammer = JEUX.find(jeu => jeu.id === 'warhammer');
  assert.equal(warhammer.base, DEFAULT_PERSISTENCE_DB);
  assert.ok(Object.values(KEY).every(cle => cle.startsWith(warhammer.prefixe)), 'toutes les clés du Store commencent par le préfixe');
});
