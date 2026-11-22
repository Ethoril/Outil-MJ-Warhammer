// Lot G6 (recette du MJ du 22/11, R7) : un échec d'enregistrement à l'application de l'initiative
// (Recommencer, Commencer le round 1) ne doit plus dire « corrigez les données ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextMessage, userError, persistenceFailure, storeFailure } from '../../../js/ui/messages.js';
import { createStore } from '../../../js/core/store.js';

const FALLBACK = 'corrigez les données, puis réessayez.';

test('G6-d — échec d’enregistrement : « Enregistrement local impossible, réessayez »', () => {
  const closing = new Error('Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.');
  assert.equal(contextMessage('Initiative non appliquée', persistenceFailure(closing), FALLBACK), 'Initiative non appliquée : enregistrement local impossible, réessayez.');
  assert.equal(contextMessage('Initiative non appliquée', persistenceFailure(), FALLBACK), 'Initiative non appliquée : enregistrement local impossible, réessayez.');
  // L'erreur brute d'IndexedDB, si elle remonte telle quelle, reçoit le même message.
  const raw = Object.assign(new Error('The database connection is closing.'), { name: 'InvalidStateError' });
  assert.equal(contextMessage('Combat non démarré', raw, FALLBACK), 'Combat non démarré : enregistrement local impossible, réessayez.');
});

test('G6-d — une vraie erreur de données garde son message', () => {
  assert.equal(contextMessage('Initiative non appliquée', userError('La préparation du combat est incomplète.'), FALLBACK), 'Initiative non appliquée : la préparation du combat est incomplète.');
  assert.equal(contextMessage('Initiative non appliquée', new Error('quelque chose d’imprévu'), FALLBACK), `Initiative non appliquée : ${FALLBACK}`);
  assert.equal(storeFailure({ ok: false, status: 'requires-input' }), null);
  assert.equal(storeFailure({ ok: true, status: 'applied' }), null);
});

test('G6-d — store réel dont l’enregistrement échoue : le résultat de l’initiative donne le message de persistance', async () => {
  let failing = false;
  const persistence = { async load() { return null; }, async saveAtomic() { return failing ? { ok: false, error: new Error('The database connection is closing.') } : { ok: true }; } };
  const store = createStore({ persistence, storage: null });
  await store.ready;
  const row = id => ({ id, name: id, kind: 'PNJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', initiative: 40, hp: 10, maxHp: 10, states: [], caracs: { I: 40 }, extensions: { v5: {} } });
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, currentActorId: null, order: ['a', 'b'], orderMode: 'automatic', participants: [row('a'), row('b')] },
    activeScene: null, encounters: [], suspendedScenes: [], persistentCharacters: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  failing = true;
  const preview = store.previewCombatInitialization({ diceById: { a: 3, b: 4 }, startCombat: true });
  const result = await store.applyCombatInitialization(preview);
  assert.equal(result.status, 'persistence-error');
  const error = storeFailure(result);
  assert.ok(error);
  assert.equal(contextMessage('Initiative non appliquée', error, FALLBACK), 'Initiative non appliquée : enregistrement local impossible, réessayez.');
});
