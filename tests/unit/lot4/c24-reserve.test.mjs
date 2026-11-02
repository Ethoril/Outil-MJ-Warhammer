import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { participantCamp } from '../../../js/core/encounters.js';
import { outnumberSide } from '../../../js/core/outnumbering.js';

// Contre-vérification C24 (Claude) : un PJ ajouté depuis la réserve n'a pas de camp choisi ;
// il doit rester `pj` (surnombre, alliés des prières), seul un Neutre choisi par le MJ prime.
test('C24 — PJ de la réserve : camp pj par défaut, Neutre seulement sur choix explicite du MJ', async () => {
  const store = createStore({ storage: null });
  await store.ready;
  await store.addProfile({ id: 'p1', name: 'Ulrike', kind: 'PJ', initiative: 40, hp: 12, caracs: { I: 40 } });
  await store.addProfile({ id: 'p2', name: 'Konrad', kind: 'PJ', initiative: 35, hp: 12, caracs: { I: 35 } });
  await store.addProfilesToCombat(['p1', 'p2'], { zone: 'bench' });
  const [a, b] = store.listParticipants();
  assert.equal(participantCamp(a), 'pj');
  assert.equal(outnumberSide(a), outnumberSide(b), 'deux PJ de la réserve sont du même côté pour le surnombre');
  await store.updateParticipant(a.id, { camp: 'neutre', extensions: { ...(a.extensions || {}), campExplicit: true } });
  const updated = store.listParticipants().find(row => row.id === a.id);
  assert.equal(participantCamp(updated), 'neutre');
  assert.notEqual(outnumberSide(updated), outnumberSide(b));
});
