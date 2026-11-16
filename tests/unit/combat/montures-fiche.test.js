import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync, planMountSync } from '../../../js/core/fiche-sync.js';
import { buildMountProfile, canRide, mountLabel } from '../../../js/core/mounts.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { montureFicheDe } from '../../../js/data/montures-fiches.js';
import { createStore } from '../../../js/core/store.js';
import { planFicheWriteback } from '../../../js/core/fiche-writeback.js';
import { mountLineOf } from '../../../js/ui/fiche-sync-view.js';

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
  // Le MJ redéclare dans l'outil : la fiche, toujours à null sans changement, n'y touche pas, mais l'aperçu avertit (comme un désaccord).
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Tonnerre' });
  const keep = planMountSync(fiche(null), profileOf(store));
  assert.deepEqual([keep.kind, keep.key, keep.toolName, keep.declared], ['disagree', null, 'Tonnerre', undefined]);
  assert.match(mountLineOf(keep), /n’en déclare aucune.*Tonnerre/);
  await sync(store, fiche(null));
  assert.equal(declared(store).name, 'Tonnerre');
  assert.ok(profileOf(store, 'monture-pj'));
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

test('CA10 : la monture ne part pas dans « Envoyer aux fiches » : aucun plan d’envoi ne porte de ligne de monture', () => {
  const snapshot = fiche(horse('Tonnerre'), { destin: '3', fortune: '2' });
  // Profil dont la monture a changé depuis la lecture (déclaration de l'outil différente) et dont le Destin diffère : le plan d'envoi n'est pas vide.
  const profile = { id: 'pj', name: 'Caelel', kind: 'PJ', caracs: {}, hp: 10, maxHp: 12, ficheSnapshot: structuredClone(snapshot),
    extensions: { ficheId: 'caelel', v5: { fate: 5, declaredMount: { profileId: 'monture-pj', name: 'Foudre', bestiaryId: SPIDER } } } };
  const plan = planFicheWriteback({ schemaVersion: 3, reserve: [profile], persistentCharacters: [], combat: { participants: [] }, activeScene: null, suspendedScenes: [], log: [], extensions: { v5: {} } });
  assert.ok(plan.fiches.length > 0 && plan.fiches[0].rows.length > 0, 'le plan contient bien d’autres lignes');
  assert.equal(/monture|mount/i.test(JSON.stringify(plan)), false);
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

test('Précision 2 : même espèce, fiche inchangée : le nom donné dans l’outil est gardé, sans avertissement', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Brutus' });
  const same = fiche(horse('Tonnerre'));
  assert.equal(planProfileSync(same, profileOf(store), { library: store.listProfiles() }).mount.kind, 'none');
  await sync(store, same);
  assert.equal(declared(store).name, 'Brutus');
  assert.equal(profileOf(store, 'monture-pj').name, 'Brutus');
  await sync(store, fiche(horse('Foudre')));
  assert.equal(declared(store).name, 'Foudre');
  assert.equal(profileOf(store, 'monture-pj').name, 'Foudre');
});

test('Précision 3 : déclaration alors que monture-<id> existe : même espèce réutilisée telle quelle, autre espèce remplacée', async () => {
  const store = await table({ inCombat: true });
  await sync(store, fiche(horse('Tonnerre')));
  await store.updateProfile('monture-pj', { hp: 3, tokenLibraryImage: 'maps/tokens/cheval.png', extensions: { ...profileOf(store, 'monture-pj').extensions, retouche: 'MJ' } });
  await sync(store, fiche(null));
  assert.equal(declared(store), undefined);
  const again = fiche(horse('Foudre'));
  const plan = planProfileSync(again, profileOf(store), { library: store.listProfiles() });
  assert.deepEqual([plan.mount.kind, plan.mount.build], ['redeclare', false]);
  assert.match(mountLineOf(plan.mount), /de nouveau déclarée/);
  // Sans modèle fourni : rien n'est reconstruit.
  await store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot: again, links: {}, convert: {} }]);
  const mount = profileOf(store, 'monture-pj');
  assert.deepEqual([mount.name, mount.hp, mount.tokenLibraryImage, mount.extensions.retouche], ['Foudre', 3, 'maps/tokens/cheval.png', 'MJ']);
  assert.deepEqual(declared(store), { profileId: 'monture-pj', name: 'Foudre', bestiaryId: HORSE });
  assert.ok(store.listParticipants().some(row => row.profileId === 'monture-pj'), 'la monture rejoint le combat');
  // Autre espèce : remplacée.
  await sync(store, fiche(null));
  await sync(store, fiche(spider('Toile')), SPIDER);
  const replaced = profileOf(store, 'monture-pj');
  assert.deepEqual([replaced.name, replaced.extensions.v5.bestiary.id, replaced.tokenLibraryImage], ['Toile', SPIDER, undefined]);
});

test('Précision 4 : renommage alors que le profil monture-<id> a disparu : il est recréé depuis le bestiaire', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await store.removeProfile('monture-pj');
  assert.equal(profileOf(store, 'monture-pj'), undefined);
  const snapshot = fiche(horse('Foudre'));
  const plan = planProfileSync(snapshot, profileOf(store), { library: store.listProfiles() });
  assert.deepEqual([plan.mount.kind, plan.mount.build], ['rename', true]);
  await sync(store, snapshot);
  const mount = profileOf(store, 'monture-pj');
  assert.equal(mount.name, 'Foudre');
  assert.equal(mount.extensions.v5.bestiary.id, HORSE);
});

test('Précision 5 : une lecture invalide garde la monture retenue par le snapshot ; une fiche inchangée ne l’emporte pas ensuite', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await store.setProfileMount('pj', { ...mountsOf(store), name: 'Brutus' });
  await sync(store, fiche({ espece: 'cle-du-futur' }));
  assert.deepEqual(profileOf(store).ficheSnapshot.mount, { key: HORSE, name: 'Tonnerre' });
  const same = fiche(horse('Tonnerre'));
  assert.equal(planProfileSync(same, profileOf(store), { library: store.listProfiles() }).mount.kind, 'none');
  await sync(store, same);
  assert.equal(declared(store).name, 'Brutus');
  // Sans le champ, ni empreinte ni snapshot ne changent.
  const bare = ficheSnapshot('caelel', fixture);
  assert.equal(bare.source.fingerprint, fiche().source.fingerprint);
  assert.equal(Object.hasOwn(bare, 'mount'), false);
  await sync(store, bare);
  assert.equal(Object.hasOwn(profileOf(store).ficheSnapshot, 'mount'), false);
});

test('Lignes d’aperçu : chaque cas nomme la monture concernée', () => {
  const rider = (declaredMount, previous) => ({ id: 'pj', extensions: { v5: declaredMount ? { declaredMount } : {} }, ficheSnapshot: previous });
  const tonnerre = { profileId: 'monture-pj', name: 'Tonnerre', bestiaryId: HORSE };
  const line = (snapshot, profile, library) => mountLineOf(planMountSync(snapshot, profile, library));
  assert.match(line(fiche(horse('Tonnerre')), rider(null, fiche()), []), /Tonnerre/);
  assert.match(line(fiche(horse('Foudre')), rider(null, fiche(null)), [{ id: 'monture-pj', extensions: { mountFor: { bestiaryId: HORSE } } }]), /Foudre.*de nouveau déclarée/);
  const renamed = line(fiche(horse('Foudre')), rider(tonnerre, fiche(horse('Tonnerre'))), []);
  assert.ok(renamed.includes('Tonnerre') && renamed.includes('Foudre'));
  const replaced = line(fiche(spider('Toile')), rider(tonnerre, fiche(horse('Tonnerre'))), []);
  assert.ok(replaced.includes('Tonnerre') && replaced.includes('Toile'));
  assert.match(line(fiche(null), rider(tonnerre, fiche(horse('Tonnerre')))), /Tonnerre.*retirée/);
  const disagree = line(fiche(spider('Toile')), rider(tonnerre, fiche(spider('Toile'))), []);
  assert.ok(disagree.includes('Tonnerre') && disagree.includes('Toile'));
  assert.match(line(fiche(null), rider(tonnerre, fiche(null))), /n’en déclare aucune.*Tonnerre/);
  // Clé inconnue : l'avertissement de la lecture cite la clé.
  assert.match(fiche({ espece: 'cle-du-futur' }).warnings.find(row => row.code === 'mount-invalid').message, /cle-du-futur/);
  assert.equal(mountLineOf({ kind: 'none' }), '');
});
