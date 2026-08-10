// Cas du PLAN.md §6.9 absents de la première livraison du lot 6.
// Vérifient que la modularisation n'a rien changé au comportement des lots 2 à 5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { Profile, Participant } from '../js/core/models.js';

const mkStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  let boom = false;
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (boom) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    boom: v => { boom = v; },
  };
};
const mkBus = () => { const e = []; return { emit: ev => e.push(ev), events: e, clear: () => (e.length = 0) }; };
const mkSync = () => {
  const s = { cb: null, pushes: [], dbRef: 'ref', onValueCalls: 0 };
  s.onValue = (ref, cb) => { s.onValueCalls++; s.cb = cb; };
  s.set = (ref, data) => { s.pushes.push(data); return Promise.resolve(); };
  s.update = (ref, data) => { s.pushes.push(data); return Promise.resolve(); };
  return s;
};
// depuis le lot 9, reserve/participants/diceLines voyagent en objets indexés par id
const idsDe = obj => Object.keys(obj || {});
const snap = o => ({ val: () => o });
const wait = () => new Promise(r => setTimeout(r, 360));

// ─────────── amorçage : la synchro arrive APRÈS la construction du Store ───────────
// L'authentification Firebase est asynchrone. Si le handle n'est pas rattachable,
// l'application tourne en localStorage seul — sans erreur ni symptôme visible.

test('amorçage — attachSync() branche le listener et pousse l\'état local', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync: null }); // comme main.js
  store.addProfile(new Profile({ id: 'avant', name: 'Avant connexion', hp: 10 }));
  await wait();
  assert.equal(sync.pushes.length, 0, 'rien ne part tant que la synchro n\'est pas attachée');
  assert.equal(sync.cb, null, 'et aucun listener n\'est enregistré');

  store.attachSync(sync);
  await wait();
  assert.ok(sync.cb, 'attachSync doit enregistrer le listener onValue');
  assert.equal(sync.pushes.length, 1, 'et repousser l\'état local vers Firebase');
  assert.ok(idsDe(sync.pushes[0].reserve).includes('avant'),
    'le travail fait avant la connexion doit être poussé');

  // le listener est bien vivant
  sync.cb(snap({ writer: 'autre', timestamp: Date.now() + 60000, reserve: [{ id: 'distant', name: 'D' }] }));
  assert.equal(store.getReserve().has('distant'), true, 'le listener doit appliquer les données distantes');
});

test('amorçage — attachSync() est idempotent', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync: null });
  store.attachSync(sync);
  store.attachSync(sync);
  store.attachSync(null);
  await wait();
  assert.equal(sync.onValueCalls, 1, 'un seul enregistrement de listener');
});

// ─────────────────── D-02 : l'écriture doit rester ciblée ───────────────────
// Store.log() sauvegarde sans rien marquer comme sale, et il est appelé à chaque jet,
// chaque PV, chaque tour. Si un lot vide retombe sur l'instantané complet, le bénéfice
// de l'écriture par chemin est annulé en usage réel.

test('écriture ciblée — un seul participant modifié ne pousse que lui', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.batch(() => {
    for (let i = 0; i < 10; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 }));
    for (let i = 0; i < 5; i++) store.addParticipant(new Participant({ id: `c${i}`, name: `C${i}`, hp: 10 }));
  });
  await wait();
  sync.pushes.length = 0;

  store.updateParticipant('c2', { hp: 7 });
  await wait();
  const cles = Object.keys(sync.pushes[0]);
  assert.ok(cles.includes('combat/participants/c2'), 'le chemin du participant doit être poussé');
  assert.ok(!cles.includes('reserve'), 'la réserve entière ne doit pas repartir');
  assert.ok(!cles.includes('diceLines'), 'les lignes de jet non plus');
});

test('écriture ciblée — une entrée de journal ne pousse pas tout le document', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.batch(() => { for (let i = 0; i < 10; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 })); });
  await wait();
  sync.pushes.length = 0;

  store.log('🎲 un jet de dé');
  await wait();
  const cles = Object.keys(sync.pushes[0]);
  assert.deepEqual(cles.sort(), ['timestamp', 'writer'],
    'le journal n\'étant plus synchronisé, seul l\'horodatage doit partir');
});

test('écriture ciblée — repli sur l\'instantané complet sans update()', async () => {
  const sync = mkSync();
  delete sync.update; // handle dépourvu d'écriture par chemin
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'seul', name: 'Seul', hp: 10 }));
  await wait();
  const cles = Object.keys(sync.pushes.at(-1));
  assert.ok(cles.includes('reserve'), 'sans update(), on repasse en document complet');
  assert.ok(!cles.some(k => k.includes('/')), 'et jamais de clé à chemin, invalide dans un set()');
});

test('journal — sorti de Firebase, mais conservé dans les fichiers (§9.2)', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.log('entrée locale');

  // le chemin Firebase ne doit plus apporter de journal
  sync.cb(snap({ writer: 'autre', timestamp: Date.now(), reserve: [], log: ['venu du serveur'] }));
  assert.ok(!store.getLog().some(l => l.includes('venu du serveur')),
    'le journal ne doit plus être lu depuis Firebase');
  assert.ok(store.getLog().some(l => l.includes('entrée locale')),
    'et le journal local ne doit pas être écrasé');

  // le chemin fichier, lui, doit le restaurer
  globalThis.alert = () => {};
  store.loadFromJSON(JSON.stringify({
    reserve: [{ id: 'p1', name: 'R', hp: 14 }],
    combat: { round: 1, order: [], participants: [] },
    log: ['[20:00:00] venu du fichier'],
    diceLines: [],
  }));
  assert.ok(store.getLog().some(l => l.includes('venu du fichier')),
    'charger une sauvegarde doit restaurer son journal');
});

// ─────────────────────── A-03 / A-04 : synchronisation ───────────────────────

test('sync — écho de sa propre écriture ignoré (A-03)', async () => {
  const sync = mkSync(), bus = mkBus();
  const store = createStore({ storage: mkStorage(), sync, bus });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  const monId = sync.pushes.at(-1).writer;
  assert.ok(monId, 'le payload doit porter un writer');

  bus.clear();
  sync.cb(snap({ writer: monId, timestamp: Date.now() + 5000, reserve: [{ id: 'echo', name: 'Echo' }] }));
  assert.equal(store.getReserve().has('echo'), false, 'son propre écho ne doit rien appliquer');
  assert.equal(bus.events.length, 0, 'et ne doit provoquer aucun rendu');
});

test('sync — snapshot vide sans effet', () => {
  const sync = mkSync(), bus = mkBus();
  createStore({ storage: mkStorage(), sync, bus });
  bus.clear();
  sync.cb(snap(null));
  assert.equal(bus.events.length, 0);
});

test('sync — client neuf accepte le serveur', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  sync.cb(snap({ writer: 'autre', timestamp: 5000, reserve: [{ id: 'srv', name: 'Serveur' }] }));
  assert.equal(store.getReserve().has('srv'), true);
});

test('sync — serveur plus récent appliqué', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'local', name: 'Local', hp: 10 }));
  await wait();
  sync.cb(snap({ writer: 'autre', timestamp: Date.now() + 60000, reserve: [{ id: 'neuf', name: 'Neuf' }] }));
  assert.equal(store.getReserve().has('neuf'), true);
});

test('sync — horodatage ISO hérité comparé dans les deux sens (A-04)', async () => {
  const s1 = mkSync();
  const st1 = createStore({ storage: mkStorage(), sync: s1 });
  st1.addProfile(new Profile({ id: 'l', name: 'L', hp: 10 }));
  await wait();
  s1.cb(snap({ writer: 'autre', timestamp: '2020-01-01T00:00:00Z', reserve: [{ id: 'vieux', name: 'V' }] }));
  assert.equal(st1.getReserve().has('vieux'), false, 'ISO ancien doit être rejeté');

  const s2 = mkSync();
  const st2 = createStore({ storage: mkStorage(), sync: s2 });
  s2.cb(snap({ writer: 'autre', timestamp: '2099-01-01T00:00:00Z', reserve: [{ id: 'futur', name: 'F' }] }));
  assert.equal(st2.getReserve().has('futur'), true, 'ISO récent doit être appliqué');
});

test('sync — horodatage absent ou illisible : appliqué plutôt que bloqué', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  store.addProfile(new Profile({ id: 'l', name: 'L', hp: 10 }));
  await wait();
  sync.cb(snap({ writer: 'autre', reserve: [{ id: 'sansts', name: 'X' }] }));
  assert.equal(store.getReserve().has('sansts'), true);

  const s2 = mkSync();
  const st2 = createStore({ storage: mkStorage(), sync: s2 });
  s2.cb(snap({ writer: 'autre', timestamp: 'pas une date', reserve: [{ id: 'pourri', name: 'Y' }] }));
  assert.equal(st2.getReserve().has('pourri'), true);
});

// ─────────────────────────── A-08 : groupage réel ───────────────────────────

test('batch — un lot de 15 ne produit qu\'UNE sauvegarde Firebase', async () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  await wait();
  sync.pushes.length = 0;
  store.batch(() => { for (let i = 0; i < 15; i++) store.addProfile(new Profile({ name: `P${i}`, hp: 10 })); });
  await wait();
  assert.equal(sync.pushes.length, 1, '15 opérations groupées = 1 seul push');
});

test('batch — événements distincts dédoublonnés', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  bus.clear();
  store.batch(() => {
    store.addProfile(new Profile({ name: 'A', hp: 1 }));
    store.log('x');
    store.addProfile(new Profile({ name: 'B', hp: 1 }));
    store.log('y');
  });
  const sorted = bus.events.slice().sort();
  assert.deepEqual(sorted, [...new Set(sorted)], 'aucun événement en double');
  assert.ok(bus.events.includes('reserve') && bus.events.includes('log'));
});

test('batch — combat:update fusionné en rendu complet', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  store.addParticipant(new Participant({ id: 'p1', name: 'P', hp: 10, zone: 'active' }));
  bus.clear();
  store.batch(() => {
    store.updateParticipant('p1', { hp: 9 });
    store.updateParticipant('p1', { hp: 8 });
  });
  assert.deepEqual(bus.events, ['combat'], 'combat:update doit être fusionné en un seul rendu complet');
});

test('batch — le Store n\'est pas bloqué après une exception', () => {
  const bus = mkBus();
  const store = createStore({ storage: mkStorage(), bus });
  try { store.batch(() => { throw new Error('boum'); }); } catch { /* attendu */ }
  bus.clear();
  store.addProfile(new Profile({ name: 'Après', hp: 10 }));
  assert.equal(bus.events.length, 1, 'une opération hors lot doit émettre immédiatement');
});

// ─────────────────────────── A-07 : quota ───────────────────────────

test('quota — Firebase tenté malgré l\'échec local', async () => {
  const sync = mkSync(), storage = mkStorage();
  const store = createStore({ storage, sync });
  await wait();
  sync.pushes.length = 0;
  storage.boom(true);
  store.addProfile(new Profile({ name: 'Q', hp: 10 }));
  await wait();
  assert.equal(sync.pushes.length, 1, 'le quota local ne doit pas empêcher la synchro distante');
});

test('quota — journal réellement plafonné à 300', () => {
  const store = createStore({ storage: mkStorage() });
  for (let i = 0; i < 340; i++) store.log(`entrée ${i}`);
  assert.equal(store.getLog().length, 300);
});

// ─────────────────────────── E-01 : migration maxHp ───────────────────────────

test('maxHp — profil introuvable : repli sur les PV courants', () => {
  const storage = mkStorage({
    'wfrp.reserve.v1': JSON.stringify([]),
    'wfrp.combat.v1': JSON.stringify({ round: 1, order: ['p'], participants: [{ id: 'p', profileId: 'disparu', name: 'X', hp: 6 }] }),
  });
  assert.equal(createStore({ storage }).getCombat().participants.get('p').maxHp, 6);
});

test('maxHp — migration aussi sur le chemin de synchronisation', () => {
  const sync = mkSync();
  const store = createStore({ storage: mkStorage(), sync });
  sync.cb(snap({
    writer: 'autre', timestamp: Date.now(),
    reserve: [{ id: 'prof', name: 'Guerrier', hp: 15 }],
    combat: { round: 1, order: ['p'], participants: [{ id: 'p', profileId: 'prof', name: 'Guerrier', hp: 4 }] },
  }));
  assert.equal(store.getCombat().participants.get('p').maxHp, 15,
    'le maximum doit venir du profil source, pas des PV courants');
});
