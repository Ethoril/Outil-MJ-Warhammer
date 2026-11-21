import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { listEngagements } from '../../../js/core/engagements.js';
import { mountLabel, mountedStateForMap, linkDeclaredMounts, linkedMountOf } from '../../../js/core/mounts.js';
import { tokenStatesOf } from '../../../js/core/map-link-state.js';

// Lot C du 21/11/2026 : retirer un participant en cours de rencontre (cascade), PJ « sans monture » pour la rencontre.

const person = (id, extra = {}) => ({
  id, name: id, kind: 'PNJ', camp: 'ennemi', zone: 'active', initiative: 50, hp: 12, maxHp: 12,
  caracs: { CC: 40, CT: 30, F: 30, E: 30, I: 40, Ag: 40, Dex: 30, Int: 30, FM: 30, Soc: 30, M: 4 },
  skills: [], talents: [], equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: {} }, ...extra
});
const v5 = (row, patch) => ({ ...row, extensions: { ...(row.extensions || {}), v5: { ...(row.extensions?.v5 || {}), ...patch } } });
const DECLARED = { profileId: 'monture-pj', name: 'Tonnerre', bestiaryId: null };

async function scene(participants, { current = participants[0].id, order = participants.filter(row => row.zone === 'active').map(row => row.id) } = {}) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } },
    combat: { round: 1, currentActorId: current, order, participants } });
  return store;
}
const byId = (store, id) => store.listParticipants().find(row => row.id === id);
const ids = store => store.listParticipants().map(row => row.id).sort();

// Cavalier monté sur sa monture liée, un ennemi engagé avec lui.
const mountedPair = () => [
  v5(person('rider', { kind: 'PJ', camp: 'pj', initiative: 60 }), { mounted: true, mountId: 'horse', ownMountId: 'horse', declaredMount: DECLARED }),
  v5(person('horse', { kind: 'Créature', camp: 'allie', initiative: 30 }), { mountOf: 'rider' }),
  person('orc', { initiative: 40 })
];

test('retirer un cavalier avec sa monture : les deux sortent, ordre et tour passent au suivant, engagements purgés', async () => {
  const store = await scene(mountedPair(), { current: 'rider', order: ['rider', 'orc', 'horse'] });
  await store.engageParticipants('orc', 'rider');
  assert.equal(listEngagements({ participants: store.listParticipants() }).length, 1);
  await store.removeParticipant('rider', { withMount: true });
  assert.deepEqual(ids(store), ['orc']);
  assert.deepEqual(store.getCombat().order, ['orc']);
  assert.equal(store.getCombat().currentActorId, 'orc', 'le tour du retiré passe au suivant');
  assert.equal(listEngagements({ participants: store.listParticipants() }).length, 0);
  assert.deepEqual(byId(store, 'orc').extensions.v5.engagements || {}, {});
  assert.match(JSON.parse(store.getFullJSON()).log[0].text, /Combat: retiré rider et horse/);
  await store.undo();
  assert.deepEqual(ids(store), ['horse', 'orc', 'rider'], 'annulable en un seul ↶');
  assert.equal(byId(store, 'rider').extensions.v5.mountId, 'horse');
});

test('retirer un cavalier sans sa monture : la monture reste, déliée, et n’est plus la monture de personne', async () => {
  const store = await scene(mountedPair(), { current: 'orc', order: ['rider', 'orc', 'horse'] });
  await store.removeParticipant('rider');
  assert.deepEqual(ids(store), ['horse', 'orc']);
  assert.equal(byId(store, 'horse').extensions.v5.mountOf, undefined);
  assert.deepEqual(store.getCombat().order, ['orc', 'horse']);
  assert.equal(store.getCombat().currentActorId, 'orc', 'le tour d’un autre ne bouge pas');
  // Sur la carte : le pion fusionné du cavalier part, celui de la monture reste seul.
  const states = tokenStatesOf(store.listParticipants());
  assert.equal(states['p:rider'], undefined);
  assert.notEqual(states['p:horse'].mounted, true);
  assert.equal(states['p:horse'].rider ?? null, null);
});

test('retirer la monture : le cavalier tombe à pied, sans monture pour la rencontre, la déclaration ne la ramène pas', async () => {
  const store = await scene(mountedPair(), { current: 'rider', order: ['rider', 'orc', 'horse'] });
  await store.removeParticipant('horse');
  const rider = byId(store, 'rider');
  assert.equal(rider.extensions.v5.mounted, false);
  assert.equal(rider.extensions.v5.ownMountId, undefined);
  assert.equal(rider.extensions.v5.mountAbsent, true);
  assert.deepEqual(rider.extensions.v5.declaredMount, DECLARED, 'la déclaration (fiche) ne change pas');
  assert.equal(store.getCombat().currentActorId, 'rider');
  assert.equal(mountLabel(rider, store.listParticipants()), 'Sans monture');
  assert.deepEqual(mountedStateForMap(store.listParticipants()), []);
});

test('retirer un participant purge ses empoignades et l’Enchevêtré qu’elles portaient, sans toucher aux autres états', async () => {
  const link = { id: 'grapple:r1', resolutionId: 'r1', initiatorId: 'orc', targetId: 'elf', status: 'active' };
  const elf = v5(person('elf', { camp: 'pj', kind: 'PJ', states: [
    { id: 's1', key: 'entangled', name: 'Enchevêtré', level: 1, source: { kind: 'grapple', linkId: link.id } },
    { id: 's2', key: 'bleeding', name: 'Hémorragique', level: 1, source: { kind: 'quality', keywordId: 'entaille', authorId: 'orc' } }
  ] }), { grapples: [link] });
  const orc = v5(person('orc'), { grapples: [link] });
  const store = await scene([elf, orc], { current: 'orc' });
  await store.addDiceLine({ id: 'aimed', participantId: 'elf', type: 'attack', attr: 'CC', base: 40, targetId: 'orc' });
  await store.removeParticipant('orc');
  const after = byId(store, 'elf');
  assert.deepEqual(after.extensions.v5.grapples, []);
  assert.deepEqual(after.states.map(row => row.id), ['s2'], 'l’Hémorragique infligé reste : il ne dépend pas de la présence de l’auteur');
  assert.equal(store.getCombat().currentActorId, 'elf');
  assert.equal(JSON.parse(store.getFullJSON()).diceLines.find(row => row.id === 'aimed').targetId, null, 'la cible qui visait le retiré est vidée');
});

test('retirer un PJ simple : sorti de l’ordre, son tour passe au suivant', async () => {
  const store = await scene([person('a', { kind: 'PJ', camp: 'pj' }), person('b'), person('c')], { current: 'a' });
  await store.removeParticipant('a');
  assert.deepEqual(ids(store), ['b', 'c']);
  assert.equal(store.getCombat().currentActorId, 'b');
});

// ---------------------------------------------------------------- monture absente
async function withDeclaredMount() {
  const store = createStore({ storage: null });
  await store.ready;
  await store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  const template = { name: 'Cheval', kind: 'Créature', caracs: { CC: 25, M: 8 }, hp: 20, maxHp: 20, skills: [], talents: [], traits: [], equipment: [], diceLines: [] };
  await store.setProfileMount('pj', { template, bestiaryId: null, name: 'Tonnerre' });
  return store;
}
const rider = store => store.listParticipants().find(row => row.profileId === 'pj');
const steed = store => store.listParticipants().find(row => row.profileId === 'monture-pj');

test('ajout d’un PJ « sans monture » : sa monture déclarée n’entre pas, le profil et la fiche ne changent pas', async () => {
  const store = await withDeclaredMount();
  await store.addProfilesToCombat(['pj'], { withoutMount: true });
  assert.equal(store.listParticipants().length, 1);
  assert.equal(rider(store).extensions.v5.mountAbsent, true);
  assert.equal(store.listProfiles().find(row => row.id === 'pj').extensions.v5.mountAbsent, undefined, 'réglage de la rencontre seulement');
  assert.equal(mountLabel(rider(store), store.listParticipants()), 'Sans monture');
  // Redéclarer la monture (fiche ou Réserve) ne la fait pas entrer.
  await store.setProfileMount('pj', { template: { name: 'Cheval', caracs: {}, skills: [], talents: [], traits: [], equipment: [], diceLines: [] }, bestiaryId: null, name: 'Tonnerre' });
  assert.equal(steed(store), undefined);
  assert.deepEqual(Object.keys(tokenStatesOf(store.listParticipants())), ['p:' + rider(store).id], 'un seul pion : pas de monture sur la carte');
});

test('ajout ordinaire : la monture déclarée entre toujours avec le PJ', async () => {
  const store = await withDeclaredMount();
  await store.addProfilesToCombat(['pj']);
  assert.ok(steed(store));
  assert.equal(rider(store).extensions.v5.mountAbsent, undefined);
});

test('en combat : « sans monture » retire la monture liée (et le cavalier monté descend), « avec sa monture » la fait revenir en attente, liée', async () => {
  const store = await withDeclaredMount();
  await store.addProfilesToCombat(['pj'], { zone: 'active' });
  await store.updateParticipant(steed(store).id, { zone: 'active' });
  assert.equal((await store.setMounted(rider(store).id, true)).ok, true);
  const receipt = await store.setMountAbsent(rider(store).id, true);
  assert.equal(receipt.ok, true);
  assert.equal(steed(store), undefined);
  assert.equal(rider(store).extensions.v5.mounted, false);
  assert.equal(rider(store).extensions.v5.mountAbsent, true);
  assert.equal(linkedMountOf(rider(store), store.listParticipants()), null);
  const people = store.listParticipants();
  assert.equal(linkDeclaredMounts(people), people, 'aucun nouveau lien');
  const back = await store.setMountAbsent(rider(store).id, false);
  assert.equal(back.ok, true);
  assert.ok(steed(store));
  assert.equal(steed(store).zone, 'bench');
  assert.equal(rider(store).extensions.v5.ownMountId, steed(store).id);
  assert.equal(rider(store).extensions.v5.mountAbsent, undefined);
  await store.undo();
  assert.equal(steed(store), undefined, 'annulable');
});

test('« sans monture » refusé sans monture déclarée', async () => {
  const store = await scene([person('a'), person('b')]);
  assert.equal((await store.setMountAbsent('a', true)).reason, 'no-declared-mount');
});

// ---------------------------------------------------------------- liaison carte (contrat §7)
const fakeChannel = () => ({ sent: [], postMessage(message) { if (!['mj.roster', 'mj.engagements'].includes(message.type)) this.sent.push(message); }, onmessage: null });

test('liaison carte : retirer un cavalier monté avec sa monture envoie mount.split puis token.remove des deux pions ; un PJ lié garde le sien', async () => {
  const { createMapLink } = await import('../../../js/core/map-link.js');
  const store = await scene([...mountedPair(), person('ulrika', { kind: 'PJ', camp: 'pj', persistentCharacterId: 'c9' })], { current: 'orc' });
  const channel = fakeChannel();
  const link = createMapLink({ channel, getParticipants: () => store.listParticipants(), now: () => 1000 });
  link.refresh();
  channel.sent.length = 0;
  await store.removeParticipant('rider', { withMount: true });
  link.refresh();
  assert.deepEqual(channel.sent.map(m => [m.type, m.payload.ref ?? m.payload.riderRef]).sort(), [['token.remove', 'p:horse'], ['token.remove', 'p:rider']]);
  channel.sent.length = 0;
  await store.removeParticipant('ulrika');
  link.refresh();
  assert.deepEqual(channel.sent.map(m => m.type), [], 'contrat §7 : un ref PJ (pj:…) n’est jamais retiré de la carte');
});

test('liaison carte : « sans monture » en combat retire le pion de la monture', async () => {
  const { createMapLink } = await import('../../../js/core/map-link.js');
  const store = await withDeclaredMount();
  await store.addProfilesToCombat(['pj'], { zone: 'active' });
  const channel = fakeChannel();
  const link = createMapLink({ channel, getParticipants: () => store.listParticipants(), now: () => 1000 });
  link.refresh();
  const horseRef = 'p:' + steed(store).id;
  channel.sent.length = 0;
  await store.setMountAbsent(rider(store).id, true);
  link.refresh();
  assert.deepEqual(channel.sent.filter(m => m.type === 'token.remove').map(m => m.payload.ref), [horseRef]);
});
