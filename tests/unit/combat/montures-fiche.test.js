import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, planMountSync } from '../../../js/core/fiche-sync.js';
import { buildMountProfile, canRide, mountLabel } from '../../../js/core/mounts.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { montureFicheDe } from '../../../js/data/montures-fiches.js';
import { createStore } from '../../../js/core/store.js';

// Monture déclarée sur la fiche en ligne (chantier du 16/11/2026) : lue à « Mettre à jour les PJ », selon les décisions du MJ.
// Convention : champ `monture` absent = rien ne change ; `null` = retrait explicite.
const l06 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const HORSE = 'E0-P-077', SPIDER = 'E0-P-076';
// Un seul profil type par clé : les identifiants des actions sont tirés au hasard à chaque construction.
const templates = new Map();
const template = key => { if (!templates.has(key)) templates.set(key, buildReserveProfileFromBestiary(key, { library: l06, nameFr: true })); return templates.get(key); };
const fiche = (monture, extra = {}) => ficheSnapshot('caelel', { ...fixture, ...(monture === undefined ? {} : { monture }), ...extra });
const horse = nom => ({ espece: HORSE, ...(nom === undefined ? {} : { nom }) });
const spider = nom => ({ espece: SPIDER, ...(nom === undefined ? {} : { nom }) });

async function table({ inCombat = false } = {}) {
  const store = createStore({ storage: null });
  await store.ready;
  await store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  if (inCombat) await store.addProfilesToCombat(['pj'], { zone: 'active' });
  return store;
}
const mountsOf = (store, key = HORSE) => ({ template: template(key), bestiaryId: key });
const sync = (store, snapshot, key = HORSE) => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {}, mountTemplate: template(key) }]);
const profileOf = (store, id = 'pj') => store.listProfiles().find(row => row.id === id);
const declared = store => profileOf(store).extensions?.v5?.declaredMount;

test('CA1/CA2 : une fiche sans champ monture laisse le profil, sa monture et ses liens inchangés, sans avertissement', async () => {
  const store = await table({ inCombat: true });
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Tonnerre' });
  const links = () => JSON.stringify([declared(store), profileOf(store, 'monture-pj'), store.listParticipants().map(row => { const { ownMountId, mountOf, declaredMount } = row.extensions?.v5 || {}; return { ownMountId, mountOf, declaredMount, camp: row.camp, zone: row.zone }; })]);
  const before = links();
  const snapshot = fiche();
  assert.equal(Object.hasOwn(snapshot, 'mount'), false);
  assert.equal(snapshot.warnings.some(row => row.code === 'mount-invalid'), false);
  assert.equal(planProfileSync(snapshot, profileOf(store)).mount.kind, 'none');
  await sync(store, snapshot);
  assert.equal(links(), before);
  assert.equal(declared(store).name, 'Tonnerre');
});

test('CA3 : clé inconnue ou forme invalide : avertissement mount-invalid, profil intact', async () => {
  const store = await table();
  for (const monture of [{ espece: 'cle-du-futur', nom: 'X' }, { espece: 12 }, 'cheval', { espece: HORSE, nom: 5 }]) {
    const snapshot = fiche(monture);
    assert.equal(Object.hasOwn(snapshot, 'mount'), false);
    assert.equal(snapshot.warnings.filter(row => row.code === 'mount-invalid').length, 1);
    assert.equal(planProfileSync(snapshot, profileOf(store)).warnings.some(row => row.code === 'mount-invalid'), true);
    await sync(store, snapshot);
    assert.equal(declared(store), undefined);
    assert.equal(profileOf(store, 'monture-pj'), undefined);
  }
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Tonnerre' });
  await sync(store, fiche({ espece: 'cle-du-futur' }));
  assert.equal(declared(store).name, 'Tonnerre');
});

test('CA4 : une fiche avec monture et nom crée monture-<profil>, déclarée, qui entre en combat liée avec le cavalier', async () => {
  const store = await table({ inCombat: true });
  const snapshot = fiche(horse('Tonnerre'));
  assert.deepEqual(snapshot.mount, { key: HORSE, name: 'Tonnerre' });
  assert.equal(planProfileSync(snapshot, profileOf(store)).mount.kind, 'create');
  await sync(store, snapshot);
  assert.deepEqual(declared(store), { profileId: 'monture-pj', name: 'Tonnerre', bestiaryId: HORSE });
  const mount = profileOf(store, 'monture-pj');
  assert.equal(mount.name, 'Tonnerre');
  assert.equal(mount.extensions.v5.bestiary.id, HORSE);
  assert.deepEqual(mount.extensions.mountFor, { profileId: 'pj', bestiaryId: HORSE });
  const people = store.listParticipants();
  const rider = people.find(row => row.profileId === 'pj'), steed = people.find(row => row.profileId === 'monture-pj');
  assert.ok(steed, 'la monture entre dans le combat');
  assert.equal(steed.zone, 'bench');
  assert.equal(steed.camp, 'allie');
  assert.equal(rider.extensions.v5.ownMountId, steed.id);
  assert.equal(steed.extensions.v5.mountOf, rider.id);
  assert.equal(canRide(rider), true);
  assert.equal(mountLabel(rider, people), 'À pied (Tonnerre)');
  assert.equal(people.filter(row => row.profileId === 'monture-pj').length, 1);
});

test('CA4 : sans nom sur la fiche, la monture porte le nom du bestiaire', async () => {
  const store = await table();
  const snapshot = fiche(horse());
  assert.deepEqual(snapshot.mount, { key: HORSE, name: '' });
  await sync(store, snapshot);
  assert.equal(declared(store).name, montureFicheDe(HORSE).libelle);
  assert.equal(profileOf(store, 'monture-pj').name, montureFicheDe(HORSE).libelle);
});

test('CA5 : un changement de nom seul renomme la monture sans la reconstruire (retouches et PV conservés)', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await store.updateProfile('monture-pj', { hp: 3, notes: 'retouche du MJ', extensions: { ...profileOf(store, 'monture-pj').extensions, retouche: 'MJ' } });
  const snapshot = fiche(horse('Foudre'));
  const plan = planProfileSync(snapshot, profileOf(store));
  assert.equal(plan.mount.kind, 'rename');
  assert.equal(plan.mount.toolName, 'Tonnerre');
  await sync(store, snapshot);
  const mount = profileOf(store, 'monture-pj');
  assert.equal(mount.name, 'Foudre');
  assert.equal(declared(store).name, 'Foudre');
  assert.equal(mount.hp, 3);
  assert.equal(mount.notes, 'retouche du MJ');
  assert.equal(mount.extensions.retouche, 'MJ');
  // Sans nom, le nom du bestiaire.
  await sync(store, fiche(horse()));
  assert.equal(profileOf(store, 'monture-pj').name, montureFicheDe(HORSE).libelle);
  assert.equal(profileOf(store, 'monture-pj').hp, 3);
});

test('CA6 : un changement d’espèce sur la fiche remplace le profil monture-<profil>, annoncé avant application', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await store.updateProfile('monture-pj', { hp: 3 });
  const snapshot = fiche(spider('Toile'));
  const plan = planProfileSync(snapshot, profileOf(store));
  assert.deepEqual([plan.mount.kind, plan.mount.toolName, plan.mount.name], ['replace', 'Tonnerre', 'Toile']);
  assert.equal(profileOf(store, 'monture-pj').name, 'Tonnerre', 'rien n’est appliqué par l’aperçu');
  await sync(store, snapshot, SPIDER);
  assert.deepEqual(declared(store), { profileId: 'monture-pj', name: 'Toile', bestiaryId: SPIDER });
  const mount = profileOf(store, 'monture-pj');
  assert.equal(mount.name, 'Toile');
  assert.equal(mount.extensions.v5.bestiary.id, SPIDER);
  assert.notEqual(mount.hp, 3);
  assert.equal(store.listProfiles().filter(row => row.id === 'monture-pj').length, 1);
});

test('CA7 : désaccord. La fiche gagne si son champ a changé ; sinon l’outil garde la sienne et l’aperçu montre les deux valeurs', async () => {
  const store = await table();
  await sync(store, fiche(spider('Toile')), SPIDER);
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Tonnerre' });
  const unchanged = fiche(spider('Toile'));
  const plan = planProfileSync(unchanged, profileOf(store));
  assert.deepEqual([plan.mount.kind, plan.mount.toolName, plan.mount.name, plan.mount.label, plan.mount.toolLabel], ['disagree', 'Tonnerre', 'Toile', montureFicheDe(SPIDER).libelle, montureFicheDe(HORSE).libelle]);
  assert.equal(plan.updated.extensions.v5.declaredMount.name, 'Tonnerre');
  await sync(store, unchanged, SPIDER);
  assert.deepEqual(declared(store), { profileId: 'monture-pj', name: 'Tonnerre', bestiaryId: HORSE });
  assert.equal(profileOf(store, 'monture-pj').name, 'Tonnerre');
  // Le champ de la fiche change : la fiche l'emporte.
  const changed = fiche(spider('Toile 2'));
  assert.equal(planProfileSync(changed, profileOf(store)).mount.kind, 'replace');
  await sync(store, changed, SPIDER);
  assert.deepEqual(declared(store), { profileId: 'monture-pj', name: 'Toile 2', bestiaryId: SPIDER });
});

test('CA8 : monture: null retire la monture après changement du champ, annoncé dans l’aperçu ; absent ou inchangé, rien', async () => {
  const store = await table({ inCombat: true });
  await sync(store, fiche(horse('Tonnerre')));
  const snapshot = fiche(null);
  assert.equal(snapshot.mount, null);
  const plan = planProfileSync(snapshot, profileOf(store));
  assert.deepEqual([plan.mount.kind, plan.mount.toolName], ['remove', 'Tonnerre']);
  assert.ok(declared(store), 'rien n’est retiré par l’aperçu');
  await sync(store, snapshot);
  assert.equal(declared(store), undefined);
  assert.ok(profileOf(store, 'monture-pj'), 'le profil de la monture reste en bibliothèque');
  assert.equal(store.listParticipants().find(row => row.profileId === 'pj').extensions.v5.declaredMount, undefined);
  // Le MJ redéclare dans l'outil : la fiche, toujours à null sans changement, n'y touche pas.
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Tonnerre' });
  assert.equal(planMountSync(fiche(null), profileOf(store)).kind, 'none');
  await sync(store, fiche(null));
  assert.equal(declared(store).name, 'Tonnerre');
  // Rien à retirer : profil sans monture.
  assert.equal(planMountSync(fiche(null), { id: 'x', extensions: {} }).kind, 'none');
});

test('CA9 : Annuler restaure la monture précédente', async () => {
  const store = await table({ inCombat: true });
  await sync(store, fiche(horse('Tonnerre')));
  const before = JSON.stringify([profileOf(store), profileOf(store, 'monture-pj'), store.listParticipants()]);
  await sync(store, fiche(spider('Toile')), SPIDER);
  assert.equal(declared(store).name, 'Toile');
  await store.undo();
  assert.equal(JSON.stringify([profileOf(store), profileOf(store, 'monture-pj'), store.listParticipants()]), before);
  await sync(store, fiche(null));
  assert.equal(declared(store), undefined);
  await store.undo();
  assert.equal(declared(store).name, 'Tonnerre');
});

test('CA10 : la monture ne part pas dans « Envoyer aux fiches » : WRITEBACK_FIELDS inchangé', () => {
  const source = readFileSync(new URL('../../../js/core/fiche-sync.js', import.meta.url), 'utf8');
  assert.match(source, /const WRITEBACK_FIELDS = Object\.freeze\(\['destin', 'fortune', 'peche', 'corruption'\]\);/);
  const base = fiche(horse('Tonnerre'), { destin: '3', fortune: '2' }).writebackBase;
  assert.ok(Object.keys(base.fields).every(key => ['destin', 'fortune', 'peche', 'corruption'].includes(key)));
  assert.equal(JSON.stringify(base).includes('monture'), false);
});

test('CA11 : le profil monture-<id> construit par la fiche égale celui de setProfileMount', async () => {
  const viaTool = await table();
  await viaTool.setProfileMount('pj', { ...mountsOf(viaTool), name: 'Tonnerre' });
  const viaFiche = await table();
  await sync(viaFiche, fiche(horse('Tonnerre')));
  assert.deepEqual(profileOf(viaFiche, 'monture-pj'), profileOf(viaTool, 'monture-pj'));
  assert.deepEqual(declared(viaFiche), declared(viaTool));
  assert.deepEqual(buildMountProfile('pj', { ...mountsOf(viaTool), name: 'Tonnerre' }).declared, declared(viaTool));
});
