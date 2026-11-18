// Sauvegarde de Warhammer intacte (multi-jeux, lot L2, CA1) : une sauvegarde écrite comme la 3.53.1 (contexte, file d'envoi,
// points de restauration, dans la base `wfrp-persistence-v2`) est relue telle quelle par le Store d'aujourd'hui, et le démarrage
// n'ajoute, ne renomme et ne réécrit ni base, ni table, ni clé, ni enregistrement. Le registre des jeux désigne cette même base.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB, IDBFactory } from 'fake-indexeddb';
import { createPersistence } from '../../../js/core/persistence.js';
import { createStore } from '../../../js/core/store.js';
import { Profile } from '../../../js/core/models.js';
import { JEUX } from '../../../js/core/jeux.js';

const attendre = async (condition, delai = 3000) => {
  const debut = Date.now();
  while (Date.now() - debut < delai) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('condition non atteinte');
};

const demande = requete => new Promise((resolve, reject) => { requete.onsuccess = () => resolve(requete.result); requete.onerror = () => reject(requete.error); });

/** Instantané complet de la factory : bases, version, tables, clés et contenus. */
async function releve(factory) {
  const resultat = {};
  for (const { name } of await factory.databases()) {
    const base = await demande(Object.assign(factory.open(name), {}));
    const tables = {};
    for (const table of base.objectStoreNames) {
      const objet = base.transaction([table], 'readonly').objectStore(table);
      tables[table] = { keyPath: objet.keyPath, cles: await demande(objet.getAllKeys()), lignes: await demande(objet.getAll()) };
    }
    resultat[name] = { version: base.version, tables };
    base.close();
  }
  return structuredClone(resultat);
}

test('CA1 — la base de Warhammer est celle du registre, et une sauvegarde 3.53.1 se relit sans que rien ne bouge', async () => {
  const factory = new IDBFactory();
  const base = JEUX.find(jeu => jeu.id === 'warhammer').base;
  assert.equal(base, 'wfrp-persistence-v2');

  // 1. Sauvegarde « comme la 3.53.1 » : contexte invité (écrit par le Store), file d'envoi et points de restauration.
  const ecriture = createPersistence({ indexedDB: factory, dbName: base, contextId: 'guest' });
  const premier = createStore({ persistence: ecriture, appVersion: '3.53.1' });
  assert.deepEqual(await premier.ready, { ok: true });
  premier.addProfile(new Profile({ id: 'garde', name: 'Garde de Marienburg', hp: 11 }));
  await attendre(async () => (await ecriture.load())?.reserve?.some(profil => profil.id === 'garde'));
  const etat = await ecriture.load();
  await ecriture.saveAtomic({
    state: etat,
    operations: [{ id: 'op-1', sequence: 1, createdAt: 1000, type: 'addProfile', payload: { id: 'garde' } }],
    restore: { id: 'avant-import', createdAt: 2000, reason: 'import', state: etat }
  });
  await ecriture.saveAtomic({ operations: [{ id: 'op-2', sequence: 2, createdAt: 1100, type: 'noop', payload: {} }] });
  ecriture.close();
  await new Promise(resolve => setTimeout(resolve, 20));

  const avant = await releve(factory);
  assert.deepEqual(Object.keys(avant), [base], 'une seule base, celle de Warhammer');
  assert.deepEqual(Object.keys(avant[base].tables).sort(), ['contexts', 'outbox', 'restores']);
  assert.deepEqual(avant[base].tables.contexts.cles, ['guest']);
  assert.deepEqual(avant[base].tables.outbox.cles.sort(), ['guest:op-1', 'guest:op-2']);
  assert.equal(avant[base].tables.restores.cles.length, 1);

  // 2. Démarrage du Store d'aujourd'hui sur cette sauvegarde, sans la moindre écriture de sa part.
  const lecture = createPersistence({ indexedDB: factory, dbName: JEUX.find(jeu => jeu.id === 'warhammer').base, contextId: 'guest' });
  const store = createStore({ persistence: lecture, appVersion: '3.53.1' });
  assert.deepEqual(await store.ready, { ok: true });
  assert.equal(store.getProfile('garde').name, 'Garde de Marienburg');
  assert.equal(store.getProfile('garde').hp, 11);
  assert.deepEqual(await lecture.load(), etat, 'état relu identique');
  assert.deepEqual((await lecture.listOutbox()).map(operation => operation.id), ['op-1', 'op-2'], 'file d’envoi intacte');
  assert.equal((await lecture.listRestorePoints()).length, 1, 'point de restauration intact');
  await new Promise(resolve => setTimeout(resolve, 50));
  lecture.close();
  await new Promise(resolve => setTimeout(resolve, 20));

  // 3. Rien n'a changé : mêmes bases, tables, clés et enregistrements.
  assert.deepEqual(await releve(factory), avant);
});

test('CA1 — le Store de Warhammer, par défaut, n’ouvre aucune autre base que « wfrp-persistence-v2 »', async () => {
  const factory = new IDBFactory();
  const persistence = createPersistence({ indexedDB: factory, contextId: 'guest' });
  const store = createStore({ persistence, appVersion: '3.53.1' });
  assert.deepEqual(await store.ready, { ok: true });
  store.addProfile(new Profile({ id: 'q', name: 'Bête', hp: 7 }));
  await attendre(async () => (await persistence.load())?.reserve?.some(profil => profil.id === 'q'));
  persistence.close();
  assert.deepEqual((await factory.databases()).map(base => base.name), ['wfrp-persistence-v2']);
});
