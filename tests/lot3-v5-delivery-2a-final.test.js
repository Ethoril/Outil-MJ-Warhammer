/**
 * Derniers retours de la livraison 2a : boîte Fortune, Chance portée par un autre participant, API de consommation
 * en persistance, base d'armure, Mouvement (Chemin entre les Mondes, Chair de Pierre), Destin temporaire, affichage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { commitV5Resources, getV5Fortune, formatV5Balance } from '../js/core/v5-resources.js';
import { fortuneDialogState } from '../js/ui/v5-fortune-dialog.js';
import { getArcaneWornArmor, previewArcaneUnforgiving } from '../js/core/v5-magic-arcane-unforgiving.js';
import { locationProtection } from '../js/core/equipment.js';

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
const world = (...people) => ({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
async function combat(...people) {
  const store = createStore(); await store.ready; await store.loadFromJSON(world(...people)); return store;
}
function memory() {
  let state = null;
  return { load: async () => state && structuredClone(state), saveAtomic: async ({ state: next }) => { state = structuredClone(next); return { ok: true }; } };
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const signe = (store, name = 'Le Second Signe d’Amul', roll = 15) => store.applySpellExecution(name, { actorId: 'mage', targetIds: ['mage'], roll, attributeActive: false });

test('Boîte Fortune — préremplit et édite le Permanent, le temporaire est seulement annoncé', async () => {
  const store = await combat(wizard());
  await store.setFortune('mage', 3);
  await signe(store);
  const fortune = store.getFortune('mage');
  assert.deepEqual([fortune.permanent, fortune.temporary, fortune.balance], [3, 3, 6]);
  const state = fortuneDialogState(fortune);
  assert.equal(state.amount, 3, 'valeur préremplie = permanent');
  assert.match(state.summary, /Solde courant : 6 \(dont 3 temporaires\)/);
  await store.setFortune('mage', state.amount); // valider sans changer
  assert.deepEqual([store.getFortune('mage').permanent, store.getFortune('mage').balance], [3, 6]);
  await store.expireSpellEffects('mage', { currentRound: 10 });
  assert.equal(store.getFortune('mage').balance, 3, 'après expiration : 3, pas 5');
  assert.equal(fortuneDialogState({ balance: null, permanent: null, temporary: 0 }).amount, '');
  assert.equal(fortuneDialogState({ balance: 3, permanent: 3, temporary: 0 }).summary, 'Solde courant : 3.');
});

test('Affichage — « N (dont T temporaire) » seulement quand T > 0', () => {
  assert.equal(formatV5Balance({ balance: 5, temporary: 0 }), '5');
  assert.equal(formatV5Balance({ balance: 5, temporary: 1 }), '5 (dont 1 temporaire)');
  assert.equal(formatV5Balance({ balance: 5, temporary: 3 }), '5 (dont 3 temporaires)');
  assert.equal(formatV5Balance({ balance: null, temporary: 0 }), '?');
});

const twin = (id, extra = {}) => ({ id, name: id, kind: 'PJ', hp: 10, maxHp: 10, zone: 'active', extensions: { ficheId: 'x', ...(extra.extensions || {}) }, ...extra, });
test('Chance temporaire — portée par un autre participant du même personnage : lue et consommée sur le porteur', () => {
  const a = twin('a'), b = twin('b', { extensions: { ficheId: 'x', v5: { spellEffects: [{ id: 'e', remainingTempFortune: 3 }] } } });
  const input = { localRevision: 1, reserve: [], persistentCharacters: [], combat: { participants: [a, b] }, log: [], diceLines: [],
    extensions: { v5: { characterResources: [{ characterId: 'fiche:x', fortune: 2, initializedFrom: 'mj' }] } } };
  assert.deepEqual([getV5Fortune(input, a).permanent, getV5Fortune(input, a).temporary, getV5Fortune(input, a).balance], [2, 3, 5]);
  const spent = structuredClone(a); spent.extensions.v5 = { resources: { fortune: 4 } };
  const out = commitV5Resources(input, [spent, b]);
  const after = getV5Fortune(out, out.combat.participants[0]);
  assert.deepEqual([after.permanent, after.temporary, after.balance], [2, 2, 4], 'la dépense est débitée sur le porteur');
  assert.equal(out.combat.participants[1].extensions.v5.spellEffects[0].remainingTempFortune, 2);
  // dépense au-delà du temporaire : temporaire à 0 puis permanent
  const more = structuredClone(a); more.extensions.v5 = { resources: { fortune: 1 } };
  const out2 = commitV5Resources(input, [more, b]);
  const after2 = getV5Fortune(out2, out2.combat.participants[0]);
  assert.deepEqual([after2.permanent, after2.temporary], [1, 0]);
});

test('Chance/Destin temporaires — l’API de consommation retourne le vrai compte en persistance', async () => {
  const persistence = memory(), store = createStore({ persistence }); await store.ready;
  await store.loadFromJSON(world(wizard('mage', { extensions: { v5: { hasMomentum: true, fate: 1, channelling: { type: 'winds', sl: 30 } } } })));
  await store.setFortune('mage', 2);
  await signe(store);
  const result = store.consumeTemporaryFortune('mage', 2);
  assert.equal(typeof result.then, 'function', 'promesse chaînée');
  assert.equal((await result).consumed, 2);
  assert.equal(store.getFortune('mage').temporary, 1);
  const ext = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...ext, v5: { ...ext.v5, channelling: { type: 'winds', sl: 30 } } } });
  await signe(store, 'Le Troisième Signe d’Amul', 14);
  assert.equal(store.getFate('mage').temporary, 1);
  assert.equal((await store.consumeTemporaryFate('mage', 1)).consumed, 1);
  assert.equal(store.getFate('mage').temporary, 0);
});

test('Base d’armure — armorLocations est la source : buff, Arcanes et expiration lisent la même base', async () => {
  const locs = { head: 3, body: 3, leftArm: 3, rightArm: 3, leftLeg: 3, rightLeg: 3 };
  const store = await combat(wizard('mage', { armorLocations: locs }));
  await store.applySpellExecution('Armure aethyrique', { actorId: 'mage', targetIds: ['mage'], roll: 25 });
  const buffed = person(store, 'mage');
  assert.equal(buffed.armor.body, 4, 'V5 p. 242 : base 3 + buff 1');
  assert.equal(locationProtection(buffed, { location: 'body' }).ap, 4);
  assert.equal(getArcaneWornArmor(buffed).body, 3, 'PA portés = 3, buff exclu');
  const preview = previewArcaneUnforgiving(wizard('mage'), buffed, { armorPoints: 1 }, { magicItemPresent: false, armorDamageLocations: ['body'] });
  assert.notEqual(preview.status, 'invalid-arcane-armor', preview.error);
  await store.expireSpellEffects('mage', { currentRound: 99 });
  assert.equal(person(store, 'mage').armor.body, 3, 'expiration : retour à 3, pas 0');
});

const high = (extra = {}) => wizard('mage', { ...extra, extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 30 } } } });
test('Mouvement — Chemin entre les Mondes lit le Mouvement connu, Chair de Pierre le réduit de moitié', async () => {
  const noMovement = high(); delete noMovement.caracs.M;
  const blocked = (await combat(noMovement)).previewSpellExecution('Chemin entre les Mondes', { actorId: 'mage', targetIds: ['mage'], roll: 5 });
  assert.equal(blocked.ready, false); assert.deepEqual(blocked.missing, ['movement'], 'jamais 4 par défaut');

  const sheet = high({ movement: 5 }); delete sheet.caracs.M;
  const store = await combat(sheet);
  await store.applySpellExecution('Chemin entre les Mondes', { actorId: 'mage', targetIds: ['mage'], roll: 5 });
  assert.equal(person(store, 'mage').caracs.M, 10, 'Mouvement de fiche 5 × 2');

  const stone = await combat(wizard('mage', { caracs: { ...wizard().caracs, M: 5 } }));
  await stone.applySpellExecution('Chair de Pierre', { actorId: 'mage', targetIds: ['mage'], roll: 25, targetTests:{mage:{unwilling:false}} }); // WoM p.87
  assert.equal(person(stone, 'mage').caracs.M, 2, '5 ÷ 2 arrondi à l’inférieur');
  const none = wizard(); delete none.caracs.M;
  assert.equal((await combat(none)).previewSpellExecution('Chair de Pierre', { actorId: 'mage', targetIds: ['mage'], roll: 25 }).ready, false);
});

test('Destin temporaire — dépensé en premier pour annuler un épuisement permanent', async () => {
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, fate: 0, channelling: { type: 'winds', sl: 30 } } } }));
  await signe(store, 'Le Troisième Signe d’Amul', 14);
  const ext = person(store, 'mage').extensions;
  await store.updateParticipant('mage', { extensions: { ...ext, v5: { ...ext.v5, burnout: { active: true, permanent: true } } } });
  assert.deepEqual([store.getFate('mage').permanent, store.getFate('mage').temporary], [0, 1]);
  const recovery = store.previewBurnoutRecovery({ actorId: 'mage' });
  assert.equal(recovery.possible, true, recovery.reason);
  await store.applyBurnoutRecovery(recovery, { actorId: 'mage' });
  assert.deepEqual([store.getFate('mage').permanent, store.getFate('mage').temporary], [0, 0], 'le point temporaire est payé, le permanent reste 0');
  assert.equal(person(store, 'mage').extensions.v5.burnout, null);
});
