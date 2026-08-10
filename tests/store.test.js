import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { Profile, Participant } from '../js/core/models.js';

function createMockStorage(initialData = {}) {
  const store = new Map(Object.entries(initialData));
  let throwOnSet = false;
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) {
      if (throwOnSet) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    setThrowOnSet(val) { throwOnSet = val; },
    _map: store
  };
}

function createMockBus() {
  const events = [];
  return {
    emit(event, payload) { events.push({ event, payload }); },
    events,
    clear() { events.length = 0; }
  };
}

test('Store — Migration du tour (A-02) [9 cas]', () => {
  // 1. turnIndex: 1 sur [p1, p2, p3] -> p2
  const storage1 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: 1, order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage1 }).getCombat().currentActorId, 'p2');

  // 2. Sentinelle -1 -> null
  const storage2 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: -1, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage2 }).getCombat().currentActorId, null);

  // 3. Index hors bornes -> null
  const storage3 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, turnIndex: 99, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage3 }).getCombat().currentActorId, null);

  // 4. currentActorId honoré
  const storage4 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'p3', order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage4 }).getCombat().currentActorId, 'p3');

  // 5. ID fantôme -> null
  const storage5 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'pGhost', order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage5 }).getCombat().currentActorId, null);

  // 6. Clé absente -> null
  const storage6 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, order: ['p1'], participants: [{ id: 'p1', name: 'A', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage6 }).getCombat().currentActorId, null);

  // 7. currentActorId prime sur turnIndex
  const storage7 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'p3', turnIndex: 0, order: ['p1', 'p2', 'p3'], participants: [{ id: 'p1', name: 'A', hp: 10 }, { id: 'p2', name: 'B', hp: 10 }, { id: 'p3', name: 'C', hp: 10 }] })
  });
  assert.equal(createStore({ storage: storage7 }).getCombat().currentActorId, 'p3');

  // 8. ID filtré de l'ordre -> null
  const storage8 = createMockStorage({
    'wfrp.combat.v1': JSON.stringify({ round: 1, currentActorId: 'pDeleted', order: ['pDeleted'], participants: [] })
  });
  assert.equal(createStore({ storage: storage8 }).getCombat().currentActorId, null);

  // 9. Vérification sur applyDataToState
  let syncCB = null;
  const mockSync = { dbRef: 'ref', onValue(ref, cb) { syncCB = cb; } };
  const storeSync = createStore({ storage: createMockStorage(), sync: mockSync });
  syncCB({ val: () => ({ combat: { round: 1, turnIndex: 1, order: ['p1', 'p2'], participants: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] } }) });
  assert.equal(storeSync.getCombat().currentActorId, 'p2');
});

test('Store & Combat — Avancement du tour (A-05, A-06)', () => {
  const bus = createMockBus();
  const store = createStore({ storage: createMockStorage(), bus });
  const combatEngine = createCombatEngine(store);

  // Ajouter participants
  store.addParticipant(new Participant({ id: 'active1', name: 'A1', initiative: 50, zone: 'active' }));
  store.addParticipant(new Participant({ id: 'active2', name: 'A2', initiative: 30, zone: 'active' }));
  store.addParticipant(new Participant({ id: 'bench1', name: 'B1', initiative: 99, zone: 'bench' })); // banc à init 99

  // Démarrer combat -> round 1, tour au plus haut init actif (active1: 50)
  combatEngine.start();
  assert.equal(store.getCombat().round, 1);
  assert.equal(store.getCombat().currentActorId, 'active1');

  // Banc à 99 ignoré
  assert.notEqual(store.getCombat().currentActorId, 'bench1');

  // Retirer l'acteur courant -> tour se réinitialise sans planter
  store.removeParticipant('active1');
  assert.equal(store.getCombat().currentActorId, null);
});

test('Store — Groupage transactionnel batch() [14 cas] (A-08)', () => {
  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, bus });

  // 1. Hors lot: 1 op = 1 save + 1 emit
  bus.clear();
  store.addProfile(new Profile({ name: 'Single', hp: 10 }));
  assert.equal(bus.events.length, 1);

  // 2. Un lot de 15 ops = 1 save et 1 émission
  bus.clear();
  store.batch(() => {
    for (let i = 0; i < 15; i++) {
      store.addProfile(new Profile({ name: `Batch${i}`, hp: 10 }));
    }
  });
  const reserveEvts = bus.events.filter(e => e.event === 'reserve');
  assert.equal(reserveEvts.length, 1);

  // 3. Lots imbriqués
  bus.clear();
  store.batch(() => {
    store.addProfile(new Profile({ name: 'Outer', hp: 10 }));
    store.batch(() => {
      store.addProfile(new Profile({ name: 'Inner', hp: 10 }));
    });
    // Pas encore émis avant la sortie du lot le plus externe
    assert.equal(bus.events.length, 0);
  });
  assert.equal(bus.events.filter(e => e.event === 'reserve').length, 1);

  // 4. Exception dans un lot flush quand même
  bus.clear();
  assert.throws(() => {
    store.batch(() => {
      store.addProfile(new Profile({ name: 'BeforeError', hp: 10 }));
      throw new Error('Test Error inside batch');
    });
  });
  // Flush exécuté dans block finally
  assert.equal(bus.events.filter(e => e.event === 'reserve').length, 1);
});

test('Store — Quota et journal (A-07)', () => {
  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, bus });

  storage.setThrowOnSet(true);

  assert.doesNotThrow(() => {
    store.addProfile(new Profile({ name: 'QuotaTest', hp: 10 }));
  });

  const logs = store.getLog();
  assert.ok(logs.some(l => l.includes('Erreur de sauvegarde locale')));
  assert.ok(logs.length <= 300);
});

test('Store — Synchronisation Firebase (A-03, A-04)', async () => {
  let firebaseListener = null;
  let firebasePushedData = null;

  const mockSync = {
    dbRef: 'ref',
    onValue(ref, cb) { firebaseListener = cb; },
    set(ref, data) {
      firebasePushedData = data;
      return Promise.resolve();
    }
  };

  const storage = createMockStorage();
  const bus = createMockBus();
  const store = createStore({ storage, sync: mockSync, bus });

  store.addProfile(new Profile({ name: 'LocalCurrent', hp: 10 }));
  bus.clear();
  firebasePushedData = null;

  const pastTs = Date.now() - 10000;
  firebaseListener({ val: () => ({ writer: 'other_client', timestamp: pastTs, reserve: [{ id: 'old', name: 'Old' }] }) });

  // Attente du debounce de 300ms
  await new Promise(r => setTimeout(r, 350));

  assert.equal(store.getReserve().has('old'), false); // Non appliqué
  assert.ok(firebasePushedData !== null); // Local repoussé !
});

test('Store — Migration maxHp (E-01)', () => {
  const reserveProfiles = [{ id: 'prof1', name: 'Guerrier', hp: 15 }];
  const legacyParticipants = [
    { id: 'part1', profileId: 'prof1', name: 'Guerrier', hp: 4 },
    { id: 'part2', profileId: null, name: 'Loup', hp: 8 },
    { id: 'part3', profileId: null, name: 'Boss', hp: 5, maxHp: 20 },
    { id: 'part4', profileId: null, name: 'ZeroMax', hp: 0, maxHp: 0 }
  ];

  const storage = createMockStorage({
    'wfrp.reserve.v1': JSON.stringify(reserveProfiles),
    'wfrp.combat.v1': JSON.stringify({ round: 1, order: ['part1', 'part2', 'part3', 'part4'], participants: legacyParticipants })
  });

  const store = createStore({ storage });
  const parts = store.getCombat().participants;

  assert.equal(parts.get('part1').maxHp, 15);
  assert.equal(parts.get('part2').maxHp, 8);
  assert.equal(parts.get('part3').maxHp, 20);
  assert.equal(parts.get('part4').maxHp, 0);
});
