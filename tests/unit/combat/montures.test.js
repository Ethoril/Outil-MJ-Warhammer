import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isMountCandidate, canRide, planMountToggle, mountedStateForMap, mountLabel, linkDeclaredMounts } from '../../../js/core/mounts.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { resolveMountedMount } from '../../../js/core/v5-mounted-combat.js';

// Chantier des montures (04/11/2026) : monture déclarée par le profil, bascule « monté / à pied » du cartouche.
const l06 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const byName = name => l06.find(row => row.name === name);

test('le bestiaire repère les montures par le Trait Dressé (Monture)', () => {
  assert.equal(isMountCandidate(byName('Horse')), true);
  assert.equal(isMountCandidate(byName('Wolf')), false);
  assert.equal(isMountCandidate({ traits: ['Dressé (Monture, Guerre)'] }), true);
  assert.equal(isMountCandidate({ traits: [{ name: 'Trained', param: 'Broken, Fetch' }] }), false);
});

test('bascule : refus explicites, puis mise en selle lue par le combat monté', () => {
  const rider = { id: 'r', name: 'Renaut', zone: 'active', kind: 'PJ', extensions: { v5: { ownMountId: 'h' } } };
  const horse = { id: 'h', name: 'Cheval', zone: 'bench', kind: 'Créature', extensions: { v5: { mountOf: 'r' } } };
  assert.equal(planMountToggle(rider, [rider, horse], { mounted: true }).reason, 'mount-bench');
  assert.equal(planMountToggle(rider, [rider], { mounted: true }).reason, 'mount-missing');
  assert.equal(planMountToggle({ ...rider, extensions: {} }, [rider], { mounted: true }).reason, 'no-mount');
  assert.equal(planMountToggle(rider, [rider, horse], { mounted: false }).reason, 'not-mounted');
  const other = { id: 'o', name: 'Saskia', zone: 'active', extensions: { v5: { mounted: true, mountId: 'h' } } };
  assert.equal(planMountToggle(rider, [rider, { ...horse, zone: 'active' }, other], { mounted: true }).reason, 'mount-taken');
  assert.deepEqual(planMountToggle(rider, [rider, { ...horse, zone: 'active' }], { mounted: true }), { ok: true, mounted: true, mountId: 'h' });
  assert.equal(canRide({ skills: [{ name: 'Chevaucher (Cheval)' }] }), true);
  assert.equal(canRide({ skills: [{ name: 'Athlétisme' }] }), false);
});

test('contrat RPG Map Display : un jeton à la taille de la monture quand monté', () => {
  const rider = { id: 'r', name: 'Renaut', extensions: { v5: { mounted: true, mountId: 'h', ownMountId: 'h' } } };
  const horse = { id: 'h', name: 'Cheval', profileId: 'monture-p', traits: ['Taille (Grande)'] };
  assert.deepEqual(mountedStateForMap([rider, horse]), [{ riderId: 'r', mounted: true, mountId: 'h', mountProfileId: 'monture-p', mountSize: 'large' }]);
  assert.equal(mountLabel(rider, [rider, horse]), 'Monté · Cheval');
  assert.equal(mountLabel({ ...rider, extensions: { v5: { ownMountId: 'h' } } }, [horse]), 'À pied (Cheval)');
});

test('linkDeclaredMounts : la monture du profil prend le camp du cavalier (allié pour un PJ)', () => {
  const rider = { id: 'r', camp: 'pj', extensions: { v5: { declaredMount: { profileId: 'monture-p', name: 'Cheval' } } } };
  const horse = { id: 'h', profileId: 'monture-p', camp: 'ennemi' };
  const [r, h] = linkDeclaredMounts([rider, horse]);
  assert.equal(r.extensions.v5.ownMountId, 'h');
  assert.equal(h.extensions.v5.mountOf, 'r');
  assert.equal(h.camp, 'allie');
  const same = [r, h];
  assert.equal(linkDeclaredMounts(same), same, 'rien ne change une fois liés');
});

test('store : la monture déclarée entre avec son cavalier, la bascule est annulable et survit au pied à terre', async () => {
  const { createStore } = await import('../../../js/core/store.js');
  const store = createStore({ storage: null });
  await store.ready;
  await store.addProfile({ id: 'p-renaut', name: 'Renaut', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  const template = buildReserveProfileFromBestiary(byName('Horse').id, { library: l06, nameFr: true });
  const declared = await store.setProfileMount('p-renaut', { template, bestiaryId: byName('Horse').id, name: 'Tonnerre' });
  assert.equal(declared.ok, true);
  const mountProfile = store.listProfiles().find(row => row.id === 'monture-p-renaut');
  assert.equal(mountProfile.name, 'Tonnerre');
  assert.equal(store.listProfiles().find(row => row.id === 'p-renaut').extensions.v5.declaredMount.profileId, 'monture-p-renaut');
  await store.addProfilesToCombat(['p-renaut'], { zone: 'bench' });
  let people = store.listParticipants();
  assert.equal(people.length, 2, 'la monture entre avec son cavalier');
  const riderId = people.find(row => row.profileId === 'p-renaut').id, horseId = people.find(row => row.profileId === 'monture-p-renaut').id;
  assert.equal(people.find(row => row.id === riderId).extensions.v5.ownMountId, horseId);
  assert.equal(people.find(row => row.id === riderId).extensions.v5.mounted, undefined, 'à pied par défaut');
  assert.equal(store.setMounted(riderId, true).reason, 'rider-bench');
  await store.updateParticipant(riderId, { zone: 'active' });
  await store.updateParticipant(horseId, { zone: 'active' });
  const toggled = await store.setMounted(riderId, true);
  assert.equal(toggled.ok, true);
  people = store.listParticipants();
  const resolved = resolveMountedMount(people.find(row => row.id === riderId), people);
  assert.equal(resolved.mount?.id, horseId, 'le combat monté lit la monture');
  await store.undo();
  assert.notEqual(store.listParticipants().find(row => row.id === riderId).extensions.v5.mounted, true, 'Annuler remet à pied');
  await store.setMounted(riderId, true);
  // La monture part au banc : le cavalier tombe à pied, le lien reste pour remonter.
  await store.updateParticipant(horseId, { zone: 'bench' });
  const rider = store.listParticipants().find(row => row.id === riderId);
  assert.equal(rider.extensions.v5.mounted, false);
  assert.equal(rider.extensions.v5.ownMountId, horseId);
});

test('lancer une rencontre : chaque cavalier amène sa monture, une monture composée sert d’abord', async () => {
  const { launchEncounter } = await import('../../../js/core/encounters.js');
  const knight = { id: 'k', name: 'Chevalier', kind: 'PNJ', hp: 15, extensions: { v5: { declaredMount: { profileId: 'monture-k', name: 'Destrier' } } } };
  const horse = { id: 'monture-k', name: 'Destrier', kind: 'Créature', hp: 22, extensions: { mountFor: { profileId: 'k' } } };
  let n = 0;
  const scene = launchEncounter({ id: 'e', title: 'Charge', entries: [{ id: 'a', profileId: 'k', quantity: 3, camp: 'ennemi', zone: 'active' }, { id: 'b', profileId: 'monture-k', quantity: 1, camp: 'ennemi', zone: 'active' }] },
    { profiles: [knight, horse], idFactory: () => `id${++n}` });
  const riders = scene.participants.filter(row => row.profileId === 'k'), horses = scene.participants.filter(row => row.profileId === 'monture-k');
  assert.equal(horses.length, 3, 'une monture par cavalier, la monture composée comprise');
  assert.equal(new Set(riders.map(row => row.extensions.v5.ownMountId)).size, 3);
  assert.ok(horses.every(row => row.camp === 'ennemi' && row.zone === 'active' && row.extensions.v5.mountOf));
  assert.ok(scene.participants.every(row => row.extensions?.v5?.mounted !== true), 'à pied par défaut');
});
