import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink, MOUNT_REQUEST_TIMEOUT_MS, MOUNT_NOT_ADJACENT_MESSAGE } from '../../../js/core/map-link.js';
import { tokenStatesOf } from '../../../js/core/map-link-state.js';

// Liaison RPG Map Display, montures (contrat §8, L3-MJ) : pion monté, mount.split, mount.request et ses réponses.
const fakeChannel = () => ({ sent: [], postMessage(message) { if (message.type !== 'mj.roster') this.sent.push(message); }, onmessage: null });
const rider = (patch = {}) => ({ id: 'r', kind: 'PJ', persistentCharacterId: 'c1', name: 'Renaut', hp: 12, maxHp: 12, states: [], movement: 4,
  extensions: { v5: { ownMountId: 'h', ...patch } } });
const horse = (patch = {}) => ({ id: 'h', kind: 'Créature', name: 'Destrier', hp: 20, maxHp: 22, size: 'Grande', movement: 10,
  states: [{ name: 'Sonné', level: 2 }], extensions: { v5: { mountOf: 'r' } }, ...patch });
const map = (type, payload = {}) => ({ v: 1, type, from: 'map', payload });

function setup(initial) {
  let scene = initial;
  const timers = [];
  const channel = fakeChannel();
  const link = createMapLink({ channel, getParticipants: () => scene, imageUrlOf: p => (p.id === 'h' ? 'data:image/webp;base64,AA' : null),
    setTimer: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; }, clearTimer: id => { if (timers[id]) timers[id].cleared = true; } });
  return { link, channel, timers, set: next => { scene = next; } };
}
const connectAndPlace = (t, refs = ['pj:c1', 'p:h']) => { t.link.onMessage(map('map.ping')); refs.forEach(ref => t.link.onMessage(map('map.placed', { ref, levelId: 'L1' }))); };

test('pion monté : rider porte la monture, taille et portées de la monture ; à pied : mounted false, rider null', () => {
  const foot = tokenStatesOf([rider(), horse()]);
  assert.equal(foot['pj:c1'].mounted, false);
  assert.equal(foot['pj:c1'].rider, null);
  assert.equal(foot['pj:c1'].sizeCells, 1);
  const states = tokenStatesOf([rider({ mounted: true, mountId: 'h' }), horse()], { imageUrlOf: p => (p.id === 'h' ? 'img-h' : null) });
  const mounted = states['pj:c1'];
  assert.equal(mounted.ref, 'pj:c1', 'le cavalier garde son ref');
  assert.equal(mounted.mounted, true);
  assert.equal(mounted.sizeCells, states['p:h'].sizeCells);
  assert.equal(mounted.sizeCells, 2, 'Grande = 2 cases');
  assert.equal(mounted.speedCells, states['p:h'].speedCells);
  assert.equal(mounted.runCells, states['p:h'].runCells);
  assert.equal(mounted.label, 'Renaut', 'identité du cavalier conservée');
  assert.equal(mounted.hp.current, 12, 'PV du cavalier sur le pion');
  assert.deepEqual(mounted.rider, { ref: 'p:h', label: 'Destrier', imageUrl: 'img-h', hp: { current: 20, max: 22 }, health: 'wounded', markers: ['stunned'], markerLevels: { stunned: 2 } });
  assert.ok(states['p:h'], 'la monture garde son propre état');
  assert.equal(states['p:h'].mounted, false);
});

test('monture absente de la scène : pas de rider', () => {
  const states = tokenStatesOf([rider({ mounted: true, mountId: 'h' })]);
  assert.equal(states['pj:c1'].mounted, false);
  assert.equal(states['pj:c1'].rider, null);
});

test('démontage (volontaire, chute, monture tuée) : mount.split avant le token.state', () => {
  const t = setup([rider({ mounted: true, mountId: 'h' }), horse()]);
  t.set([rider({ mounted: false }), horse()]);
  t.link.refresh();
  const after = t.channel.sent.slice(1);
  assert.deepEqual(after[0], { ...after[0], type: 'mount.split', payload: { riderRef: 'pj:c1', mountRef: 'p:h' } });
  assert.equal(after[1].type, 'token.state');
  assert.equal(after[1].payload.mounted, false);
  // Monture tuée et cavalier jeté à terre dans le même instantané.
  t.set([rider({ mounted: true, mountId: 'h' }), horse()]);
  t.link.refresh();
  assert.equal(t.channel.sent.filter(m => m.type === 'mount.split').length, 1, 'remonter n’envoie pas de split');
  t.set([rider({ mounted: false }), horse({ hp: 0, extensions: { v5: { mountOf: 'r', dead: true } } })]);
  t.link.refresh();
  assert.equal(t.channel.sent.filter(m => m.type === 'mount.split').length, 2);
  t.link.refresh();
  assert.equal(t.channel.sent.filter(m => m.type === 'mount.split').length, 2, 'rien sans changement');
});

test('remonte, carte connectée et pions posés : mount.request, puis mount.accepted → ok', async () => {
  const t = setup([rider(), horse()]);
  connectAndPlace(t);
  const pending = t.link.requestMount({ rider: rider(), mount: horse() });
  const request = t.channel.sent.at(-1);
  assert.equal(request.type, 'mount.request');
  assert.deepEqual(request.payload, { riderRef: 'pj:c1', mountRef: 'p:h' });
  t.link.onMessage(map('mount.accepted', { riderRef: 'pj:c1', mountRef: 'p:h' }));
  assert.equal((await pending).ok, true);
  assert.equal(t.timers[0].cleared, true, 'le délai est annulé');
});

test('remonte refusée (not-adjacent) : ok false et message du contrat', async () => {
  const t = setup([rider(), horse()]);
  connectAndPlace(t);
  const pending = t.link.requestMount({ rider: rider(), mount: horse() });
  t.link.onMessage(map('mount.refused', { riderRef: 'pj:c1', mountRef: 'p:h', reason: 'not-adjacent' }));
  const answer = await pending;
  assert.equal(answer.ok, false);
  assert.equal(answer.reason, 'not-adjacent');
  assert.equal(answer.message, MOUNT_NOT_ADJACENT_MESSAGE);
  assert.equal(MOUNT_NOT_ADJACENT_MESSAGE, 'Rapprochez le cavalier de sa monture sur la carte');
});

test('remonte sans vérification : carte déconnectée, ou un pion non posé, ou carte muette', async () => {
  const off = setup([rider(), horse()]);
  assert.deepEqual(await off.link.requestMount({ rider: rider(), mount: horse() }), { ok: true, checked: false });
  assert.ok(!off.channel.sent.some(m => m.type === 'mount.request'), 'déconnectée : pas de demande');
  const half = setup([rider(), horse()]);
  connectAndPlace(half, ['pj:c1']);
  assert.equal((await half.link.requestMount({ rider: rider(), mount: horse() })).ok, true);
  assert.ok(!half.channel.sent.some(m => m.type === 'mount.request'), 'monture non posée : pas de demande');
  const removed = setup([rider(), horse()]);
  connectAndPlace(removed);
  removed.link.onMessage(map('map.unplaced', { ref: 'p:h', levelId: 'L1' }));
  await removed.link.requestMount({ rider: rider(), mount: horse() });
  assert.ok(!removed.channel.sent.some(m => m.type === 'mount.request'), 'monture retirée du plateau : pas de demande');
  const mute = setup([rider(), horse()]);
  connectAndPlace(mute);
  const pending = mute.link.requestMount({ rider: rider(), mount: horse() });
  assert.equal(mute.timers[0].ms, MOUNT_REQUEST_TIMEOUT_MS);
  mute.timers[0].fn();
  assert.deepEqual(await pending, { ok: true, checked: false });
});

test('réponse d’un autre cavalier ignorée', async () => {
  const t = setup([rider(), horse()]);
  connectAndPlace(t);
  const pending = t.link.requestMount({ rider: rider(), mount: horse() });
  let settled = false;
  pending.then(() => { settled = true; });
  t.link.onMessage(map('mount.refused', { riderRef: 'pj:autre', reason: 'not-adjacent' }));
  await Promise.resolve();
  assert.equal(settled, false);
  t.link.onMessage(map('mount.accepted', { riderRef: 'pj:c1' }));
  assert.equal((await pending).ok, true);
});

// Store : la porte de remonte (`setMountGate`) ne bascule qu'après l'accord ; le démontage ne la consulte pas.
async function storeWithPair() {
  const { createStore } = await import('../../../js/core/store.js');
  const store = createStore({ storage: null });
  await store.addParticipant({ id: 'r', kind: 'PNJ', name: 'Renaut', hp: 12, zone: 'active', skills: [{ name: 'Chevaucher' }] });
  await store.addParticipant({ id: 'h', kind: 'Créature', name: 'Destrier', hp: 20, zone: 'active' });
  return store;
}
const mountedOf = store => store.listParticipants().find(row => row.id === 'r').extensions?.v5?.mounted === true;

test('store : refus de la carte → rien n’est appliqué, message rendu au cartouche', async () => {
  const store = await storeWithPair();
  const asked = [];
  store.setMountGate(pair => { asked.push([pair.rider.id, pair.mount.id]); return Promise.resolve({ ok: false, reason: 'not-adjacent', message: MOUNT_NOT_ADJACENT_MESSAGE }); });
  const result = await store.setMounted('r', true, { mountId: 'h' });
  assert.deepEqual(asked, [['r', 'h']]);
  assert.equal(result.ok, false);
  assert.equal(result.message, MOUNT_NOT_ADJACENT_MESSAGE);
  assert.equal(mountedOf(store), false);
});

test('store : accord de la carte → bascule ; pied à terre sans demande', async () => {
  const store = await storeWithPair();
  let asked = 0;
  store.setMountGate(() => { asked += 1; return Promise.resolve({ ok: true }); });
  assert.equal((await store.setMounted('r', true, { mountId: 'h' })).ok, true);
  assert.equal(mountedOf(store), true);
  assert.equal((await store.setMounted('r', false)).ok, true);
  assert.equal(mountedOf(store), false);
  assert.equal(asked, 1, 'le démontage ne demande rien');
});

test('store : formulaire du participant (setMountedState) soumis à la même porte', async () => {
  const store = await storeWithPair();
  store.setMountGate(() => Promise.resolve({ ok: false, reason: 'not-adjacent', message: MOUNT_NOT_ADJACENT_MESSAGE }));
  await assert.rejects(store.setMountedState('r', { mounted: true, mountId: 'h', baseRevision: store.getLocalRevision() }), { message: MOUNT_NOT_ADJACENT_MESSAGE });
  assert.equal(mountedOf(store), false);
  store.setMountGate(() => Promise.resolve({ ok: true }));
  await store.setMountedState('r', { mounted: true, mountId: 'h', baseRevision: store.getLocalRevision() });
  assert.equal(mountedOf(store), true);
});
