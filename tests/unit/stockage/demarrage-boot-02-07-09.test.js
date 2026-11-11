import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../../../js/core/store.js';
import { Participant } from '../../../js/core/models.js';
import { statusSummary, SYNC_STATUS_LABELS } from '../../../js/ui/status-summary.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
};
const wait = ms => new Promise(done => setTimeout(done, ms));

test('BOOT-02 — sans stockage local, la synchronisation du compte ne s’attache pas et le dit', async () => {
  const statuses = [], calls = [];
  const store = createStore({ storage: storage(), onSyncStatus: status => statuses.push(status) });
  // Poignée du protocole v3, telle que sync.js la fournit après la connexion Google.
  store.attachSync({
    dbRef: {}, contextId: 'account:u1',
    update: (...args) => { calls.push(['update', args]); return Promise.resolve(); },
    set: (...args) => { calls.push(['set', args]); return Promise.resolve(); },
    onValue: () => { calls.push(['onValue']); return () => {}; },
    createSession: () => { calls.push(['createSession']); return { open: async () => ({}) }; }
  });
  store.addParticipant(new Participant({ id: 'a', name: 'Aline', zone: 'active' }));
  await wait(450);
  assert.deepEqual(calls, [], 'aucune écriture ni écoute distante sans stockage local');
  assert.equal(statuses.at(-1), 'noLocalStore');
});

test('BOOT-02 et BOOT-09 — le résumé d’état nomme les deux cas au lieu de « Hors ligne »', () => {
  assert.deepEqual(statusSummary('unavailable', 'noLocalStore'), { label: 'Enregistrement local en échec', tone: 'danger' });
  assert.deepEqual(statusSummary('saved', 'noLocalStore'), { label: 'Synchronisation indisponible', tone: 'warn' });
  assert.deepEqual(statusSummary('saved', 'sdkFailed'), { label: 'Compte indisponible', tone: 'warn' });
  assert.deepEqual(statusSummary('saved', 'offline'), { label: 'Hors ligne', tone: 'warn' });
  assert.deepEqual(statusSummary('saved', 'synced'), { label: 'Synchronisé', tone: 'ok' });
  assert.match(SYNC_STATUS_LABELS.noLocalStore, /sans stockage local/);
  assert.match(SYNC_STATUS_LABELS.sdkFailed, /réessayer/i);
});

test('BOOT-09 — un échec d’initialisation de Firebase laisse l’adaptateur relançable, avec un bouton', () => {
  const sync = read('js/core/sync.js'), main = read('js/main.js'), html = read('index.html');
  assert.match(sync, /export const firebaseReady = \(\) => Boolean\(auth\)/);
  assert.match(sync, /onStatus\('sdkFailed'\)/);
  assert.match(main, /remoteAdapterLoaded = firebaseReady\(\)/);
  assert.match(html, /<button id="btn-sync-retry"[^>]*hidden[^>]*>Réessayer la connexion<\/button>/);
  assert.match(main, /#btn-sync-retry/);
});

const pngSize = path => {
  const bytes = readFileSync(resolve(root, path));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${path} est un PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

test('BOOT-07 — manifeste : icônes PNG dédiées, masquable séparée, id et scope, icône Apple', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.id, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.lang, 'fr');
  const icons = manifest.icons;
  assert.ok(icons.every(icon => !/\s/.test(icon.purpose || 'any')), 'aucune icône ne cumule « any maskable »');
  for (const [size, purpose] of [[192, 'any'], [512, 'any'], [512, 'maskable']]) {
    const icon = icons.find(row => row.type === 'image/png' && row.sizes === `${size}x${size}` && (row.purpose || 'any') === purpose);
    assert.ok(icon, `PNG ${size} ${purpose} déclaré`);
    assert.deepEqual(pngSize(icon.src), [size, size]);
  }
  const html = read('index.html');
  const apple = /<link rel="apple-touch-icon" href="([^"]+)"/.exec(html);
  assert.ok(apple, 'apple-touch-icon déclaré');
  assert.deepEqual(pngSize(apple[1]), [180, 180]);
  const sw = read('sw.js');
  for (const icon of [...icons.map(row => row.src), apple[1]]) {
    assert.ok(existsSync(resolve(root, icon)));
    assert.ok(sw.includes(`'./${icon}'`), `${icon} dans le précache`);
  }
});
