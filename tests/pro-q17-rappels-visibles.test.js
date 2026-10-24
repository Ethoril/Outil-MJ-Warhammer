import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildParticipantFromBestiary, buildReserveProfileFromBestiary, armourDetailNamesZones } from '../js/core/bestiary-profiles.js';
import { deriveReminders, resolveReminder } from '../js/core/reminders.js';
import { encounter, subject, cast, endTurn } from './helpers/lot3-domain-fixture.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';

const book = id => JSON.parse(readFileSync(`js/data/bestiary/${id}.json`, 'utf8')).profiles;
const library = ['L18', 'L19', 'L20', 'L21', 'L23'].flatMap(book);
const transition = (round = 1) => ({ id: `round-${round}`, type: 'endTurn', actorId: null, round });
const participantTexts = reminders => reminders.filter(item => item.kind === 'participant-reminder').map(item => item.text);

test('Q17 : armure inconnue → rappel de la carte de combat par deriveReminders', () => {
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  const reminders = deriveReminders({ sceneId: 's', participants: [participant] }, transition());
  assert.equal(participantTexts(reminders).length, 1);
  assert.match(participantTexts(reminders)[0], /Armure imprimée/);
  assert.match(participantTexts(reminders)[0], new RegExp(participant.name));
});

// Q31 : le banc n'est plus exclu (« Ajouter au combat » depuis la bibliothèque pose au banc).
test('Q17 : pas de rappel pour une armure déterminée ; le participant au banc garde le sien (Q31)', () => {
  const known = buildParticipantFromBestiary('E0-P-556', { library, zone: 'active' });
  assert.deepEqual(participantTexts(deriveReminders({ sceneId: 's', participants: [known] }, transition())), []);
  const bench = buildParticipantFromBestiary('E0-P-593', { library, zone: 'bench' });
  assert.equal(participantTexts(deriveReminders({ sceneId: 's', participants: [bench] }, transition())).length, 1);
});

test('Q17 : la copie dans la Réserve garde le rappel', () => {
  const profile = buildReserveProfileFromBestiary('E0-P-593', { library });
  assert.equal(profile.extensions.v5.reminders[0].id, 'armour-unresolved');
  const back = { id: 'p1', name: profile.name, zone: 'active', extensions: profile.extensions };
  assert.equal(participantTexts(deriveReminders({ sceneId: 's', participants: [back] }, transition())).length, 1);
});

test('Q17 : un rappel résolu ne revient pas au Round suivant', () => {
  const participant = buildParticipantFromBestiary('E0-P-593', { library, zone: 'active' });
  const snapshot = { sceneId: 's', participants: [participant] };
  const item = deriveReminders(snapshot, transition(1)).find(entry => entry.kind === 'participant-reminder');
  const [choice] = resolveReminder([item], item.id, 'resolve').map(entry => entry.choice);
  assert.deepEqual(participantTexts(deriveReminders(snapshot, transition(2), [choice])), []);
});

test('Q17 : libellé « zones » seulement quand des zones sont nommées', () => {
  assert.equal(armourDetailNamesZones('Arms, Body'), true);
  assert.equal(armourDetailNamesZones('Mail Coat 2'), false);
  assert.match(readFileSync('js/ui/bestiary-library.js', 'utf8'), /armourDetailNamesZones\(armour\.detail\)/);
});

const demonSpell = getSpellContract('Manifestation de Démon Mineur');
async function expired(outcome) {
  const { store, engine } = await encounter({});
  await cast(store, demonSpell, { domainFactsExtra: { daemonKind: 'bloodletter', commandOutcome: outcome } });
  const layer = subject(store, 'mage').extensions.v5.spellEffects.find(e => e.spellId === demonSpell.id);
  const state = JSON.parse(store.getFullJSON());
  state.combat.round = layer.expiresAtRound; state.combat.currentActorId = 'mage';
  await store.loadFromJSON(state); await endTurn(engine);
  return store.listParticipants().find(p => p.extensions?.v5?.summonedBySpellId === demonSpell.id);
}

test('Q17 : démon expiré (le lanceur l’emporte) → rappel « ordre accompli » sur la carte', async () => {
  const demon = await expired('obeys');
  const texts = participantTexts(deriveReminders({ sceneId: 's', participants: [demon] }, transition()));
  assert.equal(texts.length, 1);
  assert.match(texts[0], /Ordre accompli/);
});

test('Q17 : démon expiré (le démon l’emporte) → rappel sans « ordre accompli »', async () => {
  const demon = await expired('attacks');
  const texts = participantTexts(deriveReminders({ sceneId: 's', participants: [demon] }, transition()));
  assert.equal(texts.length, 1);
  assert.doesNotMatch(texts[0], /ordre accompli/i);
  assert.match(texts[0], /hostile au lanceur/);
});
