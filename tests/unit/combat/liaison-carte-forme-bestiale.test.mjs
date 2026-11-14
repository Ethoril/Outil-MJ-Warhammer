// Liaison carte et Forme bestiale (images des pions, S13 CA40) : prendre ou quitter une forme n'est pas une blessure.
// Recette du 14/11 : un PJ à 14 PV en Loup passe à 13 PV (Blessures de la bête, règle V5) ; la carte recevait fx.wound
// et dessinait une gerbe de sang. Une vraie blessure sous la forme doit toujours saigner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapLink } from '../../../js/core/map-link.js';
import { BEAST_PROFILES, applyBeastForm, revertBeastForm } from '../../../js/core/v5-magic-arbitrations.js';

const mage = (extra = {}) => ({ id: 'mage', name: 'Wren', kind: 'PJ', persistentCharacterId: 'c-wren', camp: 'pj', hp: 14, maxHp: 14,
  zone: 'active', init: 50, fortune: 2, caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { channelling: { type: 'winds', sl: 20 } } }, ...extra });

function linked(participant) {
  const scene = [participant];
  const channel = { sent: [], postMessage(message) { this.sent.push(message); } };
  const link = createMapLink({ channel, getParticipants: () => scene });
  link.refresh();
  const wounds = () => channel.sent.filter(m => m.type === 'fx.wound').map(m => m.payload.hpLost);
  const set = next => { scene[0] = next; link.refresh(); };
  return { scene, set, wounds, channel };
}

test('CA40 : prendre la Forme bestiale (14 → 13 PV, Loup) n’envoie pas de blessure ; le retour non plus', () => {
  const { scene, set, wounds } = linked(mage());
  set(applyBeastForm(scene[0], BEAST_PROFILES.wolf).participant);
  assert.equal(scene[0].hp, 13, 'Blessures du Loup par la formule V5 (règle, inchangée)');
  assert.deepEqual(wounds(), [], 'transformation : pas de gerbe de sang');
  set(revertBeastForm(scene[0]).participant);
  assert.equal(scene[0].hp, 14);
  assert.deepEqual(wounds(), [], 'retour : pas de gerbe');
});

test('CA40 : vraie blessure sous la forme saigne ; le retour qui la reporte ne saigne pas une seconde fois', () => {
  const { scene, set, wounds } = linked(mage());
  set(applyBeastForm(scene[0], BEAST_PROFILES.bear).participant);
  assert.equal(scene[0].hp, 34);
  set({ ...scene[0], hp: 29 });
  assert.deepEqual(wounds(), [5], 'coup reçu en Ours : gerbe');
  set(revertBeastForm(scene[0]).participant);
  assert.equal(scene[0].hp, 9, '14 − 5 : dégâts reportés (règle V5)');
  assert.deepEqual(wounds(), [5], 'retour 29 → 9 : déjà saigné, rien de plus');
  set({ ...scene[0], hp: 7 });
  assert.deepEqual(wounds(), [5, 2], 'après le retour, une blessure saigne de nouveau');
});

test('CA40 : Transformation de Kadon aussi, et une blessure avant la forme reste la seule gerbe', () => {
  const { scene, set, wounds } = linked(mage());
  set({ ...scene[0], hp: 10 });
  assert.deepEqual(wounds(), [4], 'blessure avant la transformation');
  set(applyBeastForm(scene[0], BEAST_PROFILES.dog).participant);
  assert.equal(scene[0].hp, 4, 'Chien : 4 Blessures');
  assert.deepEqual(wounds(), [4], 'aucune gerbe de plus : la tache d’avant n’est ni effacée ni redoublée');
  set(revertBeastForm(scene[0]).participant);
  const kadon = structuredClone(scene[0]);
  set(applyBeastForm(kadon, { ...BEAST_PROFILES.dog, name: 'Monstre saisi' }, { kind: 'kadon', durationRounds: 4 }).participant);
  assert.deepEqual(wounds(), [4], 'Kadon : pas de gerbe à la prise');
});
