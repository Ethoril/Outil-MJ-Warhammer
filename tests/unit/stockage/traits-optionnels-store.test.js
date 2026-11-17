// Traits optionnels dans le Store (chantier docs/specs/traits-optionnels, lot L5) : commande annulable sur le profil de Réserve,
// application à la création des participants, sauvegarde, relecture du compte, export et import JSON (CA3 à CA6, D2, D14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../../../js/core/store.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { readOptionalChoices, toggleOptionalTrait, toggleOptionalArmour, addFreeTrait, applyOptionalChoices } from '../../../js/core/optional-traits.js';
import { locationProtection } from '../../../js/core/equipment.js';
import { exportProfilesJson } from '../../../js/core/json-profile-export.js';
import { parseProfileJson } from '../../../js/core/json-profile-import.js';
import { rtdb } from './rtdb.helper.js';

const l06 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const OGRE = 'E0-P-072';
const record = l06.find(row => row.id === OGRE);
const template = buildReserveProfileFromBestiary(OGRE, { library: l06, nameFr: true });
const l01 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L01.json', import.meta.url), 'utf8')).profiles;
const RHINOX = 'E0-P-127';
// Persistance en mémoire, comme en production (js/main.js) : le Store range alors chaque profil sous sa forme canonique
// (Traits imprimés dans `extensions.traits`, `armorLocations` dérivé de l'armure). Un Store sans persistance garde le profil brut.
const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const persistentStore = async () => { const store = createStore({ persistence: memory(), storage: null }); await store.ready; return store; };

// Pisteur (Trait facultatif de la fiche) et Coriace (ajouté librement : E +10, FM +10).
function ogreChoices() {
  const first = toggleOptionalTrait(record, readOptionalChoices(null), 'Tracker');
  assert.equal(first.ok, true, first.error);
  const second = addFreeTrait(record, first.choices, 'Tough');
  assert.equal(second.ok, true, second.error);
  return second.choices;
}

async function table() {
  const store = await persistentStore();
  await store.addProfile({ id: 'ogre', ...structuredClone(template) });
  await store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  return store;
}
const profileOf = (store, id = 'ogre') => store.listProfiles().find(row => row.id === id);
const ogres = store => store.listParticipants().filter(row => row.profileId === 'ogre');
const lastOgre = store => ogres(store).at(-1);
const traitsOf = participant => (participant.traits || []).map(String);
const set = (store, choices, options) => store.setProfileOptionalChoices('ogre', choices, { expectedLocalRevision: store.getLocalRevision(), ...options });
// Participant comparé sans ce qui change à chaque ajout (identifiant, nom unique, identifiants des lignes).
const shape = (store, participant) => {
  const { id, name, ...rest } = participant;
  const lines = store.getDiceLines?.().filter(line => line.participantId === id).map(({ id: lineId, participantId, ...line }) => line);
  return JSON.parse(JSON.stringify({ ...rest, lines }));
};
// Participant sans coche (Store persistant : le profil est canonique dès son ajout).
async function plainOgre(store) {
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  return shape(store, lastOgre(store));
}

test('CA3 : cocher puis ajouter le profil, le participant porte les Traits ; un participant ajouté avant ne change pas (D2)', async () => {
  const store = await table();
  await store.addProfilesToCombat(['ogre'], { zone: 'active' });
  const before = JSON.stringify(lastOgre(store));
  const result = await set(store, ogreChoices());
  assert.equal(result.ok, true);
  assert.deepEqual(readOptionalChoices(profileOf(store)).traits.map(row => row.key), ['Tracker', 'Tough']);
  assert.equal(JSON.stringify(ogres(store)[0]), before, 'aucune propagation au participant déjà en rencontre');
  await store.addProfilesToCombat(['ogre'], { zone: 'active' });
  const added = lastOgre(store);
  assert.ok(traitsOf(added).includes('Tracker'));
  assert.ok(traitsOf(added).includes('Tough'));
  assert.equal(added.caracs.E, template.caracs.E + 10);
  assert.equal(added.caracs.FM, template.caracs.FM + 10);
  assert.deepEqual(readOptionalChoices(added).traits.map(row => row.key), ['Tracker', 'Tough'], 'les coches suivent le participant (rappels)');
  // Le profil de Réserve garde ses valeurs imprimées.
  assert.equal(profileOf(store).caracs.E, template.caracs.E);
  const line = store.getLog().find(row => /Traits optionnels/.test(row.text));
  assert.ok(line, 'ligne de journal');
  assert.match(line.text, /Ogre : Pisteur, Coriace/);
});

test('CA4 : décocher retire le Trait des participants ajoutés ensuite ; ↶ et ↷', async () => {
  const store = await table();
  const plain = await plainOgre(store);
  await set(store, ogreChoices());
  await set(store, { traits: [], attacks: [], armour: [] });
  assert.equal(profileOf(store).extensions?.v5?.optionalChoices, undefined, 'tout décoché : le profil revient sans coche');
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  assert.deepEqual(shape(store, lastOgre(store)), plain);
  await store.undo();
  await store.undo();
  assert.deepEqual(readOptionalChoices(profileOf(store)).traits.map(row => row.key), ['Tracker', 'Tough'], '↶ du décochage : la coche revient');
  await store.undo();
  assert.deepEqual(readOptionalChoices(profileOf(store)).traits, [], '↶ de la coche : avant la première coche');
  await store.redo();
  assert.deepEqual(readOptionalChoices(profileOf(store)).traits.map(row => row.key), ['Tracker', 'Tough'], '↷ : la coche revient');
});

test('CA5 : les coches survivent au rechargement (loadFromJSON) et à une relecture du compte (RTDB)', async () => {
  const store = await table();
  await set(store, ogreChoices());
  const saved = JSON.parse(store.getFullJSON());
  // Relecture du compte : la Réserve telle que RTDB la rend (tableaux vides des coches retirés).
  for (const snapshot of [saved, { ...saved, reserve: rtdb(saved.reserve) }]) {
    const reloaded = await persistentStore();
    await reloaded.loadFromJSON(structuredClone(snapshot));
    assert.deepEqual(readOptionalChoices(profileOf(reloaded)).traits.map(row => row.key), ['Tracker', 'Tough']);
    await reloaded.addProfilesToCombat(['ogre'], { zone: 'bench' });
    assert.ok(traitsOf(lastOgre(reloaded)).includes('Tough'));
  }
});

test('CA5 : export puis import JSON du profil : coches identiques ; un JSON ancien sans la clé s’importe sans erreur', async () => {
  const store = await table();
  await set(store, ogreChoices());
  const profile = profileOf(store);
  const text = exportProfilesJson(profile);
  assert.ok(JSON.parse(text).traitsOptionnels, 'clé traitsOptionnels exportée');
  const parsed = parseProfileJson(text);
  assert.deepEqual(parsed.errors, []);
  assert.deepEqual(readOptionalChoices(parsed.profiles[0]), readOptionalChoices(profile));
  // Créé dans la Réserve par le même chemin que « Créer depuis un JSON » : il garde ses coches.
  const target = await persistentStore();
  await target.importParsedProfiles(parsed.profiles);
  assert.deepEqual(readOptionalChoices(target.listProfiles()[0]), readOptionalChoices(profile));
  // Profil sans coche : pas de clé, et un JSON d'avant le chantier se relit sans coche ni erreur.
  const bare = exportProfilesJson(template);
  assert.equal(Object.hasOwn(JSON.parse(bare), 'traitsOptionnels'), false);
  const old = parseProfileJson(bare);
  assert.deepEqual(old.errors, []);
  assert.deepEqual(readOptionalChoices(old.profiles[0]), { traits: [], attacks: [], armour: [] });
  // Sous-clé inconnue (version plus récente) : ignorée sans erreur ; forme invalide : message français.
  const future = parseProfileJson(JSON.stringify({ nom: 'X', pv: 3, traitsOptionnels: { traits: [{ name: 'Tough', key: 'Tough' }], plusTard: true } }));
  assert.deepEqual(future.errors, []);
  assert.deepEqual(readOptionalChoices(future.profiles[0]).traits.map(row => row.name), ['Tough']);
  const wrong = parseProfileJson(JSON.stringify({ nom: 'X', pv: 3, traitsOptionnels: { traits: [{ param: 2 }] } }));
  assert.equal(wrong.errors.length, 1);
  assert.match(wrong.errors[0].message, /Traits optionnels/);
  const notObject = parseProfileJson(JSON.stringify({ nom: 'X', pv: 3, traitsOptionnels: 'Coriace' }));
  assert.match(notObject.errors[0].message, /Traits optionnels/);
});

test('CA6 : un profil sans coche donne le même participant qu’aujourd’hui ; des coches vides aussi', async () => {
  const store = await table();
  assert.equal(Array.isArray(profileOf(store).traits), false, 'profil canonique : Traits imprimés dans extensions.traits');
  const plain = await plainOgre(store);
  // Sans coche, le participant reprend les extensions du profil telles quelles, et ses Traits sont les Traits imprimés.
  assert.deepEqual(plain.extensions, JSON.parse(JSON.stringify(profileOf(store).extensions)));
  assert.deepEqual(plain.traits, profileOf(store).extensions.traits);
  await store.updateProfile('ogre', { extensions: { ...profileOf(store).extensions, v5: { ...profileOf(store).extensions.v5, optionalChoices: { traits: [], attacks: [], armour: [] } } } });
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  const empty = shape(store, lastOgre(store));
  // Seule clé écartée : `extensions.v5.optionalChoices`, les coches vides écrites à la main sur le profil juste au-dessus, que le
  // participant recopie avec le reste des extensions du profil. Tout le reste, extensions comprises, est comparé.
  assert.deepEqual(empty.extensions.v5.optionalChoices, { traits: [], attacks: [], armour: [] });
  delete empty.extensions.v5.optionalChoices;
  assert.deepEqual(empty, plain);
});

test('CA21 : une pièce d’armure cochée protège en combat (PA lus par locationProtection)', async () => {
  const store = await table();
  const printed = await plainOgre(store);
  const before = lastOgre(store);
  assert.equal(locationProtection(before, { location: 'head' }).ap, 0);
  let choices = readOptionalChoices(null);
  for (const name of ['Helmet', 'Gut Plate']) { const result = toggleOptionalArmour(record, choices, name); assert.equal(result.ok, true, result.error); choices = result.choices; }
  assert.equal((await set(store, choices)).ok, true);
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  const armed = lastOgre(store);
  assert.equal(locationProtection(armed, { location: 'head' }).ap, 2, 'Casque : 2 PA à la tête');
  assert.equal(locationProtection(armed, { location: 'body' }).ap, 2, 'Plastron : 2 PA au corps');
  assert.equal(locationProtection(armed, { location: 'leftArm' }).ap, locationProtection(before, { location: 'leftArm' }).ap, 'bras inchangés');
  // Décoché : rien ne change par rapport à aujourd'hui.
  await set(store, { traits: [], attacks: [], armour: [] });
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  assert.deepEqual(shape(store, lastOgre(store)), printed);
});

test('D10 : l’aperçu du profil rangé par le Store et le participant concordent (Rhinox, Endurant imprimé, coche Endurant importée)', async () => {
  const store = await persistentStore();
  await store.addProfile({ id: 'rhinox', ...structuredClone(buildReserveProfileFromBestiary(RHINOX, { library: l01, nameFr: true })) });
  const stored = store.getProfile('rhinox');
  assert.equal(Array.isArray(stored.traits), false, 'profil canonique : Traits imprimés dans extensions.traits');
  // Coche Endurant arrivée par un import JSON (le panneau la grise) : déjà imprimé, sans effet (D10) ; Coriace s'applique.
  const choices = { traits: [{ key: 'Hardy', name: 'Hardy', param: '', kind: 'trait', origin: 'free' }, { key: 'Tough', name: 'Tough', param: '', kind: 'trait', origin: 'free' }], attacks: [], armour: [] };
  assert.equal((await store.setProfileOptionalChoices('rhinox', choices, { expectedLocalRevision: store.getLocalRevision() })).ok, true);
  const preview = applyOptionalChoices(store.getProfile('rhinox'));
  await store.addProfilesToCombat(['rhinox'], { zone: 'bench' });
  const participant = store.listParticipants().find(row => row.profileId === 'rhinox');
  assert.equal(participant.caracs.E, stored.caracs.E + 10, 'Coriace (non imprimé) s’applique');
  const wounds = preview.changes.find(change => change.field === 'Blessures');
  assert.ok(wounds, 'Blessures modifiées par Coriace');
  assert.equal(wounds.effective, participant.maxHp, 'Blessures de l’aperçu = Blessures du participant');
  for (const change of preview.changes.filter(row => ['CC', 'CT', 'F', 'E', 'I', 'Ag', 'Dex', 'Int', 'FM', 'Soc'].includes(row.field))) assert.equal(participant.caracs[change.field], change.effective, change.field);
});

test('refus : révision périmée, profil inconnu, PJ ; une coche invalide est refusée sans commande', async () => {
  const store = await table();
  const revision = store.getLocalRevision();
  await store.addProfilesToCombat(['ogre'], { zone: 'bench' });
  assert.throws(() => store.setProfileOptionalChoices('ogre', ogreChoices(), { expectedLocalRevision: revision }), error => error.code === 'LOCAL_EDIT_STALE');
  assert.deepEqual(readOptionalChoices(profileOf(store)).traits, []);
  const unknown = store.setProfileOptionalChoices('absent', ogreChoices());
  assert.deepEqual([unknown.ok, unknown.reason], [false, 'unknown-profile']);
  assert.match(unknown.message, /introuvable/);
  const pj = store.setProfileOptionalChoices('pj', ogreChoices());
  assert.deepEqual([pj.ok, pj.reason], [false, 'pj']);
  assert.match(pj.message, /PJ/);
  const history = store.getFullJSON().length;
  const invalid = store.setProfileOptionalChoices('ogre', 'Coriace');
  assert.deepEqual([invalid.ok, invalid.reason], [false, 'invalid-choices']);
  assert.equal(store.getFullJSON().length, history);
});
