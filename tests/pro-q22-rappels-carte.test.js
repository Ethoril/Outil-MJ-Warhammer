import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore } from '../js/core/store.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import { buildParticipantReminders } from '../js/core/reminders.js';

const library = ['L18', 'L19', 'L20', 'L21', 'L23'].flatMap(id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles);

function memoryPersistence() {
  let state = null;
  return { async load() { return state && structuredClone(state); }, async saveAtomic({ state: next }) { state = structuredClone(next); return { ok: true }; }, peek() { return state && structuredClone(state); } };
}
function fakeElement(tag) {
  const children = [];
  return { tag, children, dataset: {}, className: '', textContent: '', appendChild(child) { children.push(child); return child; } };
}

// Skree porte aussi le Trait Régénération (rappel de Trait, lot B3) : ces tests ne regardent que le rappel d'armure.
const armourReminders = (store, id) => store.getParticipantReminders(id).filter(item => /armour-unresolved/.test(item.id));

async function combatFromLibrary() {
  const store = createStore({ persistence: memoryPersistence() });
  await store.ready;
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  await store.addParticipant(participant);
  return { store, id: participant.id };
}

test('Q22 : sans scène active, la carte reçoit le rappel d’armure alors que getReminders reste vide', async () => {
  const { store, id } = await combatFromLibrary();
  assert.equal(store.getActiveScene?.() ?? null, null);
  assert.deepEqual(store.getReminders({ id: 'round-0', type: 'endTurn' }), []);
  const reminders = armourReminders(store, id);
  assert.equal(reminders.length, 1);
  assert.match(reminders[0].text, /Armure imprimée/);
});

test('Q22 : résoudre le rappel depuis la carte le retire, aussi après changement de Round', async () => {
  const { store, id } = await combatFromLibrary();
  const [item] = armourReminders(store, id);
  await store.resolveParticipantReminder(id, item.id, 'resolve');
  assert.deepEqual(armourReminders(store, id), []);
  store.getCombat().round = 2;
  assert.deepEqual(armourReminders(store, id), []);
});

test('Q22 : le rappel d’un autre participant ne se retrouve pas sur la carte', async () => {
  const { store } = await combatFromLibrary();
  assert.deepEqual(store.getParticipantReminders('inconnu'), []);
});

test('Q22 : le bloc de carte affiche le texte et deux boutons par rappel, rien sans rappel', async () => {
  const { store, id } = await combatFromLibrary();
  assert.equal(buildParticipantReminders(fakeElement, []), null);
  const block = buildParticipantReminders(fakeElement, armourReminders(store, id));
  const [row] = block.children;
  assert.equal(row.dataset.reminderId, armourReminders(store, id)[0].id);
  assert.match(row.children[0].textContent, /Armure imprimée/);
  assert.deepEqual(row.children.slice(1).map(button => button.dataset.decision), ['resolve', 'ignore']);
});

test('Q22 : branchement — la carte appelle le Store et le clic résout', () => {
  const card = readFileSync('js/ui/card.js', 'utf8');
  assert.match(card, /Store\.getParticipantReminders\?\.\(p\.id\)/);
  assert.match(card, /Store\.resolveParticipantReminder\(id, reminderId/);
  assert.match(readFileSync('js/main.js', 'utf8'), /'participant-reminder': 'Rappel du participant'/);
});
