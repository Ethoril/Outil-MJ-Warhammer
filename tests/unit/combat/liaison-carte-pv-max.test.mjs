import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenStatesOf, mapMaxHpOf, offScenePjParticipants } from '../../../js/core/map-link-state.js';

// Audit côté carte du 08/11 (A3) : PV max envoyés à la carte.
const pj = (patch = {}) => ({ id: 'a', kind: 'PJ', persistentCharacterId: 'c1', profileId: 'prof', name: 'Renaut', hp: 9, maxHp: 15, states: [], movement: 4, extensions: { v5: {} }, ...patch });

test('A3 — le maximum de PV du participant l’emporte sur celui du profil ; à défaut, la fiche puis le profil', () => {
  const profile = { id: 'prof', maxHp: 12, ficheSnapshot: { woundsMax: 12 } };
  const states = tokenStatesOf([pj()], { maxHpOf: participant => mapMaxHpOf(participant, profile) });
  assert.deepEqual(states['pj:c1'].hp, { current: 9, max: 15 }, 'maximum modifié en jeu (15) conservé');
  assert.equal(mapMaxHpOf(pj({ maxHp: null }), profile), 12, 'participant sans maximum : celui de la fiche');
  assert.equal(mapMaxHpOf(pj({ maxHp: 0 }), { maxHp: 11 }), 11, 'sans fiche : celui du profil');
  // PJ hors scène : son maximum vient du personnage persistant (synchronisé avec la fiche), sinon du profil.
  const [offScene] = offScenePjParticipants([{ id: 'c1', profileId: 'prof', name: 'Renaut', hp: 7, maxHp: 13 }], [], () => profile);
  assert.equal(tokenStatesOf([offScene], { maxHpOf: p => mapMaxHpOf(p, profile) })['pj:c1'].hp.max, 13);
});
