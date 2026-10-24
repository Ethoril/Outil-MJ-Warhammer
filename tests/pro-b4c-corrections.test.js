import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { deriveReminders } from '../js/core/reminders.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { sizeReminders } from '../js/core/creature-size.js';

// B4c : corrections de la contre-vérification de B0-B2 (rappels permanents hors « À traiter », clé stable des têtes, critique à une tête).
const clone = value => structuredClone(value);
const profiles = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const l07 = profiles('L07'), l09 = profiles('L09');
const human = (id, name) => ({ id, name, kind: 'PNJ', camp: 'pj', zone: 'active', initiative: 30, hp: 400, maxHp: 400, caracs: { CC: 70, CT: 40, F: 40, E: 40, I: 40, Ag: 40, Dex: 40, Int: 40, FM: 40, Soc: 40, M: 4 }, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: {} } });

async function table(extra = []) {
  let saved = null;
  const store = createStore({ persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }, storage: null });
  await store.ready;
  const beast = buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' });
  const hydra = { ...beast, id: 'beast', camp: 'ennemi', zone: 'active', hp: 100, maxHp: 100, states: [], equipment: [], extensions: { v5: { ...beast.extensions.v5, hasMomentum: true } } };
  const hero = { ...human('hero', 'Héros'), extensions: { v5: { hasMomentum: true } } };
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'hero', order: ['hero', 'beast'], participants: [hydra, hero, ...extra] }, log: [], diceLines: [], extensions: { v5: { turnIndex: 1, combatId: 'b4c' } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const texts = (store, id) => store.getParticipantReminders(id).map(item => item.text).join('\n');

test('B4c : « À traiter » d’une scène active ne porte aucune ligne permanente de Trait', () => {
  const stegadon = buildParticipantFromBestiary('E0-P-301', { library: l07, zone: 'active' });
  const hydra = buildParticipantFromBestiary('E0-P-319', { library: l09, zone: 'active' });
  const participants = [stegadon, hydra, human('h1', 'Un'), human('h2', 'Deux')];
  const scene = deriveReminders({ sceneId: 's', participants }, { id: 'round-1', type: 'endTurn', actorId: 'h1', round: 1 }, []);
  assert.deepEqual(scene.filter(item => item.kind === 'participant-reminder' && /Taille|Plusieurs têtes|tête/.test(item.text)), []);
  const card = deriveReminders({ sceneId: 's', participants: [stegadon, hydra] }, { id: 'round-1', type: 'participant', round: 1 }, []);
  assert.ok(card.some(item => /Taille/.test(item.text)), 'la carte garde le rappel de Taille');
  assert.ok(card.some(item => /tête\(s\) valide/.test(item.text)), 'la carte garde le rappel des têtes');
});

test('B4c : pas de rappel de Taille pour une créature de Taille Moyenne ou Petite', () => {
  assert.deepEqual(sizeReminders({ traits: ['Size (Average)'] }), []);
  assert.deepEqual(sizeReminders({ traits: ['Taille (Petite)'] }), []);
  assert.equal(sizeReminders({ traits: ['Size (Large)'] }).length, 1);
});

test('B4c : « Fait » sur la ligne d’état des têtes ne masque que cette ligne, qui revient quand une tête tombe', async () => {
  const store = await table();
  const count = () => store.getParticipantReminders('beast').find(item => /tête\(s\) valide/.test(item.text));
  const perception = () => store.getParticipantReminders('beast').find(item => /Perception : \+2 DR/.test(item.text));
  assert.match(count().text, /5 tête\(s\) valide\(s\) sur 5/);
  await store.resolveParticipantReminder('beast', count().id, 'resolve');
  assert.equal(count(), undefined, 'ligne d’état masquée');
  assert.ok(perception(), 'la ligne de Perception reste affichée');
  await store.setHeadState('beast', 'head-1', 'dead');
  assert.match(count().text, /4 tête\(s\) valide\(s\) sur 5/, 'la ligne revient avec le nouveau nombre');
});

const hit = (n, extra = {}) => ({ resolutionId: `b4c-${n}`, actorId: 'hero', targetId: 'beast', roll: 11, action: { type: 'attack', base: 70, attr: 'CC', damage: 5 }, defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' }, criticalRolls: { location: 5, effect: 20 }, ...extra });
const heads = store => store.getCombat().participants.get('beast').extensions.v5.heads;

test('B4c : un critique à la tête (Sonné) étourdit une seule tête de l’Hydre, sans Sonné pour la créature, annulable', async () => {
  const store = await table();
  const preview = store.previewResolution(hit(1));
  assert.equal(preview.critical?.details?.location?.key, 'HEAD');
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.deepEqual(heads(store).map(head => head.state), ['stunned', 'healthy', 'healthy', 'healthy', 'healthy']);
  assert.ok(!store.getCombat().participants.get('beast').states.some(state => state.key === 'sonne'), 'la créature n’est pas Sonnée');
  assert.match(texts(store, 'beast'), /4 tête\(s\) valide\(s\) sur 5/);
  await store.undo();
  const after = store.getCombat().participants.get('beast').extensions?.v5?.heads;
  assert.ok(!after || after.every(head => head.state === 'healthy'));
});

test('B4c : la tête désignée prend le critique, et quand toutes sont neutralisées le Sonné s’applique à la créature', async () => {
  const store = await table();
  for (const head of ['head-1', 'head-2', 'head-3', 'head-4']) await store.setHeadState('beast', head, 'stunned');
  const preview = store.previewResolution(hit(2, { v5: { kind: 'melee', context: { headId: 'head-5' } } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(heads(store).every(head => head.state === 'stunned'));
  assert.ok(store.getCombat().participants.get('beast').states.some(state => state.key === 'sonne'), 'toutes les têtes neutralisées : Sonné');
});

test('B4c : une créature sans Plusieurs têtes garde le Sonné du critique à la tête', async () => {
  const store = await table();
  const preview = store.previewResolution(hit(3, { actorId: 'beast', targetId: 'hero', action: { type: 'attack', base: 70, attr: 'CC', damage: 5 } }));
  const result = await store.applyResolution(preview);
  assert.notEqual(result.status, 'manual', result.reason);
  assert.ok(store.getCombat().participants.get('hero').states.some(state => state.key === 'sonne'));
});

test('B4c : un Trait Plusieurs têtes sans nombre fait refuser l’attaque gratuite avec un message', async () => {
  const store = await table();
  const beast = store.getCombat().participants.get('beast');
  beast.traits = beast.traits.map(trait => (/Many Heads/i.test(trait) ? 'Many Heads' : trait));
  await assert.rejects(async () => {
    const bite = beast.actions.find(action => action.name === 'Bite');
    await store.applyResolution(store.previewResolution({ resolutionId: 'b4c-x', actorId: 'beast', targetId: 'hero', roll: 5, action: clone(bite), defense: { base: 10, roll: 99, v5: { kind: 'melee' } }, v5: { kind: 'melee' } }));
  }, /têtes/);
});
