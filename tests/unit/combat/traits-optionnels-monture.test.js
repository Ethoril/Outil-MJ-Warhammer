// Traits optionnels et montures (chantier docs/specs/traits-optionnels, lot L5) : « Mettre à jour les PJ » garde les coches de la
// monture à espèce inchangée et l'aperçu annonce leur perte quand l'espèce change (CA23, D8) ; une coche « Dressé (Monture) » rend un
// profil proposable (CA14, D24) ; le cavalier entre en combat avec sa monture cochée (CA22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ficheSnapshot, planProfileSync } from '../../../js/core/fiche-sync.js';
import { isMountCandidate } from '../../../js/core/mounts.js';
import { buildReserveProfileFromBestiary } from '../../../js/core/bestiary-profiles.js';
import { createStore } from '../../../js/core/store.js';
import { readOptionalChoices, toggleOptionalTrait, addFreeTrait } from '../../../js/core/optional-traits.js';
import { mountLineOf } from '../../../js/ui/fiche-sync-view.js';

const l06 = JSON.parse(readFileSync(new URL('../../../js/data/bestiary/L06.json', import.meta.url), 'utf8')).profiles;
const fixture = JSON.parse(readFileSync(new URL('../../fixtures/fiche-caelel.json', import.meta.url), 'utf8'));
const HORSE = 'E0-P-077', SPIDER = 'E0-P-076', WOLF = 'E0-P-078';
const recordOf = key => l06.find(row => row.id === key);
const templates = new Map();
const template = key => { if (!templates.has(key)) templates.set(key, buildReserveProfileFromBestiary(key, { library: l06, nameFr: true })); return templates.get(key); };
const fiche = monture => ficheSnapshot('caelel', { ...fixture, monture });
const horse = nom => ({ espece: HORSE, nom });
const spider = nom => ({ espece: SPIDER, nom });

// Persistance en mémoire, comme en production (js/main.js) : les profils sont rangés sous leur forme canonique.
const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };

async function table() {
  const store = createStore({ persistence: memory(), storage: null });
  await store.ready;
  await store.addProfile({ id: 'pj', name: 'Caelel', kind: 'PJ', caracs: { CC: 40 }, skills: [], talents: [], equipment: [], diceLines: [], extensions: {} });
  return store;
}
const sync = (store, snapshot, key = HORSE) => store.applyFicheSync([{ charId: 'caelel', profileId: 'pj', snapshot, links: {}, convert: {}, mountTemplate: template(key) }]);
const profileOf = (store, id = 'pj') => store.listProfiles().find(row => row.id === id);
const warHorse = () => {
  const result = toggleOptionalTrait(recordOf(HORSE), readOptionalChoices(null), 'Trained:War');
  assert.equal(result.ok, true, result.error);
  return result.choices;
};
const check = (store, id, choices) => store.setProfileOptionalChoices(id, choices, { expectedLocalRevision: store.getLocalRevision() });

test('CA23 : « Mettre à jour les PJ » à espèce inchangée garde les coches de la monture (D8)', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  assert.equal((await check(store, 'monture-pj', warHorse())).ok, true);
  const kept = () => readOptionalChoices(profileOf(store, 'monture-pj')).traits.map(row => row.key);
  // Fiche inchangée, puis renommage : le profil de la monture n'est pas reconstruit.
  for (const snapshot of [fiche(horse('Tonnerre')), fiche(horse('Foudre'))]) {
    const plan = planProfileSync(snapshot, profileOf(store), { library: store.listProfiles() });
    assert.doesNotMatch(mountLineOf(plan.mount, profileOf(store, 'monture-pj')), /Traits optionnels/);
    await sync(store, snapshot);
    assert.deepEqual(kept(), ['Trained:War']);
  }
  assert.equal(profileOf(store, 'monture-pj').name, 'Foudre');
});

test('CA23 : espèce changée, le nouveau profil repart sans coche et l’aperçu le dit', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await check(store, 'monture-pj', warHorse());
  const snapshot = fiche(spider('Toile'));
  const plan = planProfileSync(snapshot, profileOf(store), { library: store.listProfiles() });
  assert.equal(plan.mount.kind, 'replace');
  const line = mountLineOf(plan.mount, profileOf(store, 'monture-pj'));
  assert.match(line, /Tonnerre/);
  assert.match(line, /Traits optionnels.*retirés/);
  // Sans coche, la ligne reste celle d'aujourd'hui.
  assert.equal(mountLineOf(plan.mount, template(HORSE)), mountLineOf(plan.mount));
  await sync(store, snapshot, SPIDER);
  assert.deepEqual(readOptionalChoices(profileOf(store, 'monture-pj')), { traits: [], attacks: [], armour: [] });
});

test('CA23 : monture retirée puis redéclarée d’une autre espèce, l’aperçu dit la perte des coches', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await check(store, 'monture-pj', warHorse());
  // La fiche ne déclare plus de monture : le profil et ses coches restent en bibliothèque.
  const removed = fiche(null);
  assert.equal(planProfileSync(removed, profileOf(store), { library: store.listProfiles() }).mount.kind, 'remove');
  await sync(store, removed);
  assert.deepEqual(readOptionalChoices(profileOf(store, 'monture-pj')).traits.map(row => row.key), ['Trained:War']);
  // Elle déclare ensuite une araignée : le profil `monture-pj` est reconstruit, l'aperçu doit l'annoncer.
  const snapshot = fiche(spider('Toile'));
  const plan = planProfileSync(snapshot, profileOf(store), { library: store.listProfiles() });
  assert.equal(plan.mount.kind, 'create');
  assert.match(mountLineOf(plan.mount, profileOf(store, 'monture-pj')), /Traits optionnels.*retirés/);
  assert.equal(mountLineOf(plan.mount, null), mountLineOf(plan.mount), 'sans profil en place, la ligne reste celle d’aujourd’hui');
  await sync(store, snapshot, SPIDER);
  assert.deepEqual(readOptionalChoices(profileOf(store, 'monture-pj')), { traits: [], attacks: [], armour: [] }, 'le nouveau profil repart sans coche');
});

test('CA22 : le cavalier entre en combat avec sa monture cochée (Dressé (Guerre) : CC +10)', async () => {
  const store = await table();
  await sync(store, fiche(horse('Tonnerre')));
  await check(store, 'monture-pj', warHorse());
  assert.match(store.getLog().find(row => /Traits optionnels/.test(row.text)).text, /Dressé \(Guerre\)/, 'journal au nom français, dressage compris');
  await store.addProfilesToCombat(['pj'], { zone: 'active' });
  const steed = store.listParticipants().find(row => row.profileId === 'monture-pj');
  assert.ok(steed, 'la monture entre avec son cavalier');
  assert.equal(steed.caracs.CC, template(HORSE).caracs.CC + 10);
  assert.ok((steed.traits || []).some(text => /^Trained \(.*War/.test(text)));
});

test('CA14 : une coche « Dressé (Monture) » rend le profil proposable ; D24 : copié avec ses coches', async () => {
  const wolf = template(WOLF);
  assert.equal(isMountCandidate(wolf), false);
  assert.equal(isMountCandidate(recordOf(WOLF)), false);
  const added = addFreeTrait(recordOf(WOLF), readOptionalChoices(null), 'Trained', 'Mount');
  assert.equal(added.ok, true, added.error);
  const checked = { ...wolf, extensions: { ...wolf.extensions, v5: { ...wolf.extensions.v5, optionalChoices: added.choices } } };
  assert.equal(isMountCandidate(checked), true);
  // Un dressage Monture décoché ne compte pas ; un autre dressage coché non plus.
  const war = addFreeTrait(recordOf(WOLF), readOptionalChoices(null), 'Trained', 'War');
  assert.equal(isMountCandidate({ ...wolf, extensions: { ...wolf.extensions, v5: { ...wolf.extensions.v5, optionalChoices: war.choices } } }), false);
  // Recherche de monture d'un PJ : le profil de Réserve coché est copié avec ses coches.
  const store = await table();
  await store.addProfile({ id: 'loup', ...structuredClone(checked) });
  const source = profileOf(store, 'loup');
  await store.setProfileMount('pj', { template: structuredClone(source), bestiaryId: WOLF, name: 'Croc' });
  assert.deepEqual(readOptionalChoices(profileOf(store, 'monture-pj')), readOptionalChoices(source));
  await store.addProfilesToCombat(['pj'], { zone: 'active' });
  const steed = store.listParticipants().find(row => row.profileId === 'monture-pj');
  assert.ok((steed.traits || []).some(text => /^Trained \(.*Mount/.test(text)));
});
