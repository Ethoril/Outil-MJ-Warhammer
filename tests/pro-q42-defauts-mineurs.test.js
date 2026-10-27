import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { planNaturalAttack } from '../js/core/creature-combat.js';

// Q42 : défauts mineurs. Les points d'interface (rappel du personnage actif, section vide masquée) sont dans pro-q42-interface-browser.mjs.
const clone = value => structuredClone(value);
const lib = book => { const file = JSON.parse(readFileSync(`js/data/bestiary/${book}.json`, 'utf8')); return file.profiles.map(profile => ({ ...profile, edition: file.edition })); };
const L07 = lib('L07'), L14 = lib('L14');

async function fixture(beast, round = 1) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], ...beast, id: 'beast', extensions: { v5: { ...beast.extensions?.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round, order: ['beast', 'hero'], participants: [actor, hero], ...(round ? { currentActorId: 'beast' } : {}) }, log: [], diceLines: [], extensions: { v5: { combatId: 'q42', ...(round ? { turnIndex: 1 } : {}) } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
let seq = 0;
const hit = (store, action, v5 = {}) => store.previewResolution({ resolutionId: `q42-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 10, action: { type: 'attack', base: 60, attr: 'CC', ...action }, v5: { kind: 'melee', ...v5 } });

test('Q42 Recommencer remet à zéro le quota d’attaques gratuites du Round 0 (Kraken : 8 tentacules)', async () => {
  const kraken = buildParticipantFromBestiary('E0-P-488', { library: L14 });
  const store = await fixture(kraken, 0);
  const tentacles = store.getCombat().participants.get('beast').actions.filter(action => /^Tentacles/.test(action.name));
  const run = async () => {
    let done = 0;
    for (const [n, action] of [...tentacles, tentacles[0]].entries()) {
      const preview = store.previewResolution({ resolutionId: `q42-r-${++seq}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone({ ...action, base: 60 }), defense: { base: 10, roll: 99, v5: { kind: 'melee', context: { defenderFumbleRoll: 2 } } }, v5: { kind: 'melee' } });
      if (preview.unresolved?.length || (await store.applyResolution(preview)).status !== 'applied') break;
      done += 1;
    }
    return done;
  };
  assert.equal(await run(), 8);
  await store.restartCombat();
  assert.equal(await run(), 8, 'après Recommencer, le quota du Round 0 est entier');
});

test('Q42 Taille sans Force lisible : le message est relayé', () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const sansForce = { ...stegadon, caracs: { ...stegadon.caracs, F: null } };
  const plan = planNaturalAttack(sansForce, 'bite', { ordinary: true });
  assert.ok(plan.unresolved.some(text => /^Taille : Force requise/.test(text)), JSON.stringify(plan.unresolved));
  const avec = planNaturalAttack(stegadon, 'bite', { ordinary: true });
  assert.ok(!avec.unresolved.some(text => /^Taille/.test(text)));
});

test('Q42 dégâts d’une action personnalisée remplacés par la formule : rappel visible, pas pour une action du bestiaire', async () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: L07 });
  const store = await fixture(stegadon);
  const custom = hit(store, { name: 'Tail', damage: 3 });
  assert.equal(custom.damage.finalDamage, hit(store, { name: 'Fixe', damage: 12 }).damage.finalDamage);
  assert.ok(custom.reminders.some(text => /Dégâts de l’action \(3\) remplacés par la formule V5 du Trait \(12\)/.test(text)), JSON.stringify(custom.reminders));
  const tail = { ...stegadon.actions.find(action => action.name === 'Tail'), base: 60 };
  assert.ok(!hit(store, tail).reminders.some(text => /remplacés par la formule/.test(text)));
});
