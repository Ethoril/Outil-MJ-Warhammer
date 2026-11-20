import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { locationProtection } from '../../../js/core/equipment.js';
import { removedArmourIds, isArmourWorn, wornEquipment, extensionsWithArmourWorn } from '../../../js/core/armour-worn.js';
import { wornArmourPieces } from '../../../js/core/v5-armor-material.js';
import { displayedArmorLocations } from '../../../js/ui/workspace/helpers.js';

const piece = (id, ap, locations, layer) => ({ id, baseId: id, kind: 'armour', name: id, category: '', damage: '', reach: '', range: '', ap, locations, layer, keywords: [], notes: '', source: '', custom: false });
const pj = (removed) => ({
  id: 'pj', name: 'Aldric', armorLocations: { head: 2, body: 3, rightArm: 1, leftArm: 1, rightLeg: 0, leftLeg: 0 },
  equipment: [piece('casque', 2, ['head'], 'rigid'), piece('jaque', 1, ['body', 'rightArm', 'leftArm'], 'leather'), piece('mailles', 2, ['body'], 'flexible'),
    { id: 'epee', baseId: 'epee', kind: 'weapon', name: 'Épée' }],
  extensions: removed ? { v5: { removedArmour: removed, autre: 1 } } : {}
});

describe('armure ôtée pour la rencontre', () => {
  test('sans liste, tout est porté (absence lue comme vide)', () => {
    for (const source of [null, {}, { extensions: { v5: { removedArmour: 'casque' } } }, pj()]) assert.deepEqual(removedArmourIds(source), []);
    assert.equal(wornEquipment(pj()).length, 4);
    assert.equal(locationProtection(pj(), { location: 'body' }).ap, 3);
  });
  test('une pièce ôtée ne protège plus ses zones ; les autres pièces restent comptées', () => {
    const sans = pj(['mailles']);
    assert.equal(locationProtection(sans, { location: 'body' }).ap, 1);
    assert.equal(locationProtection(sans, { location: 'head' }).ap, 2);
    assert.equal(isArmourWorn(sans, sans.equipment[2]), false);
    assert.deepEqual(wornArmourPieces(sans).map(item => item.id), ['casque', 'jaque']);
  });
  test('toute l armure ôtée : 0 PA partout, sans retomber sur les PA de la fiche', () => {
    const nu = pj(['casque', 'jaque', 'mailles']);
    for (const location of ['head', 'body', 'rightArm']) assert.equal(locationProtection(nu, { location }).ap, 0, location);
    assert.equal(wornEquipment(nu).length, 1, 'l arme reste');
  });
  test('l affichage suit la protection réellement comptée', () => {
    assert.deepEqual(displayedArmorLocations(pj()), pj().armorLocations);
    assert.deepEqual(displayedArmorLocations(pj(['casque'])), { head: 0, body: 3, rightArm: 1, leftArm: 1, rightLeg: 0, leftLeg: 0 });
  });
  test('ôter puis remettre : pur, la liste vide disparaît et les autres extensions restent', () => {
    const avant = Object.freeze(pj());
    const ote = extensionsWithArmourWorn(avant, 'casque', false);
    assert.deepEqual(ote.v5.removedArmour, ['casque']);
    assert.deepEqual(avant.extensions, {});
    const deux = extensionsWithArmourWorn({ ...avant, extensions: ote }, 'casque', false);
    assert.deepEqual(deux.v5.removedArmour, ['casque'], 'pas de doublon');
    const remis = extensionsWithArmourWorn({ extensions: { v5: { removedArmour: ['casque'], autre: 1 }, ficheId: 'x' } }, 'casque', true);
    assert.deepEqual(remis, { v5: { autre: 1 }, ficheId: 'x' });
  });
  test('les objets de la fiche ne sont jamais modifiés', () => {
    const sans = pj(['mailles']);
    const copie = structuredClone(sans.equipment);
    locationProtection(sans, { location: 'body' });
    wornEquipment(sans);
    assert.deepEqual(sans.equipment, copie);
  });
});
