import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planNaturalAttack, inferNaturalAttackKey } from '../js/core/creature-combat.js';

// Q35, décisions (3) et (4) du MJ du 24/10 : livres V4 = formule V5 du Trait + bonus de Taille V5 (Livre de base p.360 : Grande/Énorme +BF,
// Monstrueuse +2 BF, mêlée seulement : ni tir, ni attaque gratuite, ni attaque bonus) ; livre V5 : chiffre imprimé gardé (Taille incluse).
const clone = value => structuredClone(value);
// Comme le chargeur de l'outil : l'édition du livre est recopiée sur chaque profil.
const lib = book => { const file = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')); return file.profiles.map(profile => ({ ...profile, edition: file.edition })); };
const L06 = lib('L06'), L07 = lib('L07'), L11 = lib('L11');

async function fixture(beast) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { camp: 'ennemi', zone: 'active', states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'q35' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
let seq = 0;
const hit = (store, action, v5 = {}) => store.previewResolution({ resolutionId: `q35-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...v5 } });
const fixed = (store, damage) => hit(store, { name: 'Fixed', damage }).damage.finalDamage;
const attack = (participant, name) => ({ ...participant.actions.find(action => action.name === name), base: 60 });

test('Q35 Stégadon L07 : Queue 12 (BF 5 + 2 + Énorme +5), Morsure 9 + 5', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  assert.equal(hit(store, attack(stegadon, 'Tail')).damage.finalDamage, fixed(store, 12));
  assert.equal(hit(store, attack(stegadon, 'Bite')).damage.finalDamage, fixed(store, 14), 'Bite +9 = Valeur 9 (livre V4), Taille +5');
  assert.equal(hit(store, attack(stegadon, 'Trampling Feet')).damage.finalDamage, fixed(store, 10), 'arme : dégâts imprimés');
});

test('Q35 Wyverne L11 : Queue 14 ; Ripperdactyl L07 : Queue 8', async () => {
  const wyvern = buildParticipantFromBestiary('E0-P-019', { library: L11 });
  const wyvernStore = await fixture(wyvern);
  assert.equal(hit(wyvernStore, attack(wyvern, 'Tail')).damage.finalDamage, fixed(wyvernStore, 14), 'BF 6 + 2 + 6');
  const ripper = buildParticipantFromBestiary('E0-P-299', { library: L07 });
  const ripperStore = await fixture(ripper);
  assert.equal(hit(ripperStore, attack(ripper, 'Tail')).damage.finalDamage, fixed(ripperStore, 8), 'BF 3 + 2 + Grande +3');
});

test('Q35 Chien L06 (livre V5) : le chiffre imprimé est gardé, Taille comprise', async () => {
  const dog = buildParticipantFromBestiary('E0-P-074', { library: L06 });
  assert.equal(inferNaturalAttackKey(dog, { name: 'Bite' }), null);
  const store = await fixture(dog);
  assert.equal(hit(store, attack(dog, 'Bite')).damage.finalDamage, fixed(store, 5));
});

test('Q35 le bonus de Taille ne vaut ni pour le tir, ni pour l’attaque bonus, ni pour la tentacule gratuite', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const tail = attack(stegadon, 'Tail');
  assert.equal(hit(store, tail, { kind: 'ranged' }).damage.finalDamage, fixed(store, 7), 'tir : BF+2 sans Taille');
  assert.equal(hit(store, tail, { extraAttack: true }).damage.finalDamage, fixed(store, 7), 'attaque bonus : sans Taille');
  assert.equal(planNaturalAttack(stegadon, 'tail').sizeBonus, 0, 'attaque naturelle choisie (bonus d’Élan) : sans Taille');
  assert.equal(planNaturalAttack(stegadon, 'tail', { ordinary: true }).sizeBonus, 5);
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: lib('L14') });
  assert.equal(planNaturalAttack(kraken, 'tentacles', { ordinary: true }).sizeBonus, 0, 'Tentacules : attaque gratuite');
});

test('Q35 Morsure sans Trait (livre V4) : le chiffre imprimé est la Valeur, la Taille s’y ajoute ; Taille Moyenne : inchangé', async () => {
  const large = { name: 'beast', kind: 'PNJ', caracs: { CC: 60, F: 40, E: 30, I: 40, M: 4 }, traits: ['Size (Large)'], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
  const store = await fixture(large);
  assert.equal(hit(store, { name: 'Bite', damage: 6 }).damage.finalDamage, fixed(store, 10), '6 imprimé + BF 4');
  assert.equal(hit(store, { name: 'Tail', damage: 1 }).damage.finalDamage, fixed(store, 10), 'sans Trait : BF 4 + 2 + Taille 4');
  const average = await fixture({ ...large, traits: [] });
  assert.equal(hit(average, { name: 'Bite', damage: 6 }).damage.finalDamage, fixed(average, 6));
});

test('Q35 L09 et L10 sont des livres V5 (« 5th Edition », Games Workshop 2026) : chiffre imprimé gardé, écarts listés pour le MJ', async () => {
  const index = JSON.parse(readFileSync('js/data/bestiary/index.json', 'utf8')).books;
  for (const book of ['L06', 'L09', 'L10']) assert.equal(index.find(item => item.book === book).edition, 'V5');
  const crypt = buildParticipantFromBestiary('E0-P-374', { library: lib('L10') });
  assert.equal(inferNaturalAttackKey(crypt, { name: 'Bite' }), null);
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['tools/list-v5-natural-gaps.mjs', 'tmp/divin/ecarts-q35-test.json']);
  const { gaps } = JSON.parse(readFileSync('tmp/divin/ecarts-q35-test.json', 'utf8'));
  assert.ok(gaps.some(gap => gap.id === 'E0-P-322' && gap.attack === 'Tail' && gap.printed === 8 && gap.formulaPlusSize === 20));
});

test('Q35 Cornes en attaque ordinaire : la Charge du Trait est demandée', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const horns = attack(stegadon, 'Horns');
  assert.ok(hit(store, horns).unresolved.some(text => /Charge/.test(text)));
  assert.ok(!hit(store, horns, { charging: true }).unresolved.some(text => /Charge est requise/.test(text)));
});
