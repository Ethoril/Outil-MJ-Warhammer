import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { buildHeadsBlock, nextHeadState } from '../js/ui/heads-block.js';

// B2 : Plusieurs têtes sur la Hydre de guerre (L09, E0-P-319, « Many Heads 5 », Bite gratuite).
const clone = value => structuredClone(value);
const library = JSON.parse(readFileSync('js/data/bestiary/L09.json', 'utf8')).profiles;

async function table() {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library, zone: 'active' });
  const hero = { id: 'hero', name: 'hero', kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 40, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } };
  const actor = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'beast', order: ['beast', 'hero'], participants: [actor, hero] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b2' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const bite = store => store.getCombat().participants.get('beast').actions.find(action => action.name === 'Bite');
const input = (action, n) => ({ resolutionId: `b2-${n}`, actorId: 'beast', targetId: 'hero', roll: 5, action: clone(action), defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' } });
async function bitesUntilRefused(store) {
  let done = 0;
  for (let n = 0; n < 9; n += 1) {
    let preview;
    try { preview = store.previewResolution(input(bite(store), n)); } catch { break; }
    if (preview.unresolved?.length) break;
    const result = await store.applyResolution(preview);
    if (result.status !== 'applied') break;
    done += 1;
  }
  return done;
}

test('B2 : le rappel de la Hydre dit 5 têtes valides, les attaques gratuites et la Perception +2 DR', async () => {
  const store = await table();
  const text = store.getParticipantReminders('beast').map(item => item.text).join('\n');
  assert.match(text, /5 tête\(s\) valide\(s\) sur 5/);
  assert.match(text, /Morsure ×5/);
  assert.match(text, /Perception : \+2 DR/);
});

test('B2 : une Morsure gratuite par tête valide et par Tour, la suivante est refusée', async () => {
  const store = await table();
  assert.equal(await bitesUntilRefused(store), 5);
});

test('B2 : deux têtes neutralisées par Blessure critique réduisent le quota à trois et le rappel suit', async () => {
  const store = await table();
  await store.setHeadState('beast', 'head-1', 'dead');
  await store.setHeadState('beast', 'head-2', 'stunned');
  assert.equal(await bitesUntilRefused(store), 3);
  const text = store.getParticipantReminders('beast').map(item => item.text).join('\n');
  assert.match(text, /3 tête\(s\) valide\(s\) sur 5/);
});

test('B2 : la Blessure critique ne vaut pour la créature qu’une fois toutes les têtes neutralisées (degré le moins grave)', async () => {
  const store = await table();
  for (const [head, state] of [['head-1', 'dead'], ['head-2', 'dead'], ['head-3', 'unconscious'], ['head-4', 'dead']]) await store.setHeadState('beast', head, state);
  assert.ok(!store.getParticipantReminders('beast').some(item => /Toutes les têtes sont neutralisées/.test(item.text)));
  await store.setHeadState('beast', 'head-5', 'stunned');
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /Toutes les têtes sont neutralisées : la créature est étourdie/);
  assert.equal(await bitesUntilRefused(store), 0, 'aucune tête valide : aucune Morsure');
});

test('B2 : l’état d’une tête est annulable et un participant sans le Trait est refusé', async () => {
  const store = await table();
  await store.setHeadState('beast', 'head-1', 'dead');
  await store.undo();
  assert.match(store.getParticipantReminders('beast').map(item => item.text).join('\n'), /5 tête\(s\) valide\(s\) sur 5/);
  assert.equal((await store.setHeadState('hero', 'head-1', 'dead')).ok, false);
});

test('B2 : la carte de la Hydre affiche un bouton par tête, le clic passe à l’état suivant', async () => {
  const store = await table();
  const make = tag => { const node = { tag, children: [], dataset: {}, className: '', textContent: '', appendChild(child) { this.children.push(child); return child; } }; return node; };
  const block = buildHeadsBlock(make, store.getCombat().participants.get('beast'));
  assert.equal(block.children.length, 5);
  assert.equal(block.children[0].textContent, 'Tête 1 : valide');
  assert.equal(nextHeadState('healthy'), 'stunned');
  assert.equal(nextHeadState('dead'), 'healthy');
  assert.equal(buildHeadsBlock(make, store.getCombat().participants.get('hero')), null);
});
