import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract, previewSpellExecution } from '../js/core/v5-spell-contracts.js';
import { getArcaneWornArmor } from '../js/core/v5-magic-arcane-unforgiving.js';
import { applySpellEffects, expireSpellEffects, resolveMagicMissile } from '../js/core/v5-magic-effects.js';
import { calculateMagicArmorPenalty } from '../js/core/v5-magic-channelling.js';
import { locationProtection } from '../js/core/equipment.js';

const spell = getSpellContract('Destruction des Arcanes');
const actor = {
  id: 'mage', name: 'Mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 30, maxHp: 30,
  caracs: { Int: 60, FM: 50, Dex: 40, E: 30, I: 40 },
  skills: [{ name: 'Langue (Magick)', total: 70 }, { name: 'Focalisation (Haute Magie)', total: 70 }],
  states: []
};
const target = {
  id: 'enemy', name: 'Chevalier', profileId: 'source-enemy', kind: 'PNJ', camp: 'ennemi', zone: 'active',
  hp: 30, maxHp: 30, caracs: { E: 30 }, states: [], armor: { head: 3, body: 3, arms: 3, legs: 3 }
};
const defaults = { burnoutRoll:50, sl: 9, attributeActive: false, arcaneTargets: { enemy: { magicItemPresent: false } } };
const preview = options => previewSpellExecution(actor, spell, [target], { ...defaults, ...options });
const armorItem = (id, layer, ap) => ({ id, baseId: id, catalogVersion: 'fixture', kind: 'armour',
  name: id, category: 'Armure', damage: '', reach: '', range: '', notes: '', source: '', custom: true,
  ap, layer, locations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], keywords: [] });
async function makeStore(a = actor, t = target) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1,
    currentActorId: a.id, order: [a.id, t.id], participants: [a, t] }, diceLines: [], log: [] });
  return store;
}

test('Arcanes : base NI 9, dégâts au Corps sans PA détruit gratuit ni mutation de l’aperçu', () => {
  const before = structuredClone([actor, target]);
  const p = preview(); assert.equal(p.ready, true, p.error);
  const r = p.targetResults[0];
  assert.equal(r.arcaneUnforgiving.rawDamage, 9);
  assert.equal(r.woundsLost, 6); assert.equal(r.finalHp, 24);
  assert.equal(r.arcaneUnforgiving.destroyedAp, 0);
  assert.equal(r.temporaryEffect?.apModifiers, undefined);
  assert.equal(p.ficheFollowUpReceipt, null);
  assert.deepEqual([actor, target], before);
});

test('Arcanes : choix d’armure obligatoires, indépendants du palier à +8 DR', () => {
  const base = { sl: 12, arcaneOptions: { armorPoints: 3 },
    arcaneTargets: { enemy: { magicItemPresent: false, armorDamageLocations: ['body', 'leftArm', 'rightLeg'] } } };
  const p = preview(base); assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.overcast.totalSpent, 3);
  assert.equal(p.targetResults[0].woundsLost, 6, 'Dégâts calculés avant les PA détruits');
  assert.deepEqual(p.targetResults[0].arcaneUnforgiving.damageByLocation, { body: 1, leftArm: 1, rightLeg: 1 });
  assert.equal(p.ficheFollowUpReceipt.requiresConfirmation, true);
  assert.equal(preview({ sl: 12, arcaneOptions: { armorPoints: 3 } }).ready, false);
  assert.equal(preview({ ...base, arcaneTargets: { enemy: { magicItemPresent: false, armorDamageLocations: ['body', 'body', 'body', 'body'] } }, sl: 13, arcaneOptions: { armorPoints: 4 } }).ready, false);
  assert.equal(preview({ ...base, arcaneTargets: { enemy: { magicItemPresent: false, armorDamageLocations: ['body', 'leftArm', 'arms'] } } }).ready, false);
  const full = preview({ sl: 17, arcaneOptions: { enhancedDamage: true } });
  assert.equal(full.ready, true, full.error);
  assert.equal(full.targetResults[0].arcaneUnforgiving.rawDamage, 18);
  assert.equal(full.targetResults[0].woundsLost, 15);
  assert.equal(full.targetResults[0].arcaneUnforgiving.destroyedAp, 0);
  assert.equal(full.castingPreview.overcast.totalSpent, 8);
});

test('Arcanes : toutes les options paient leur coût, surplus et plafond BI+BFM contrôlés', () => {
  for (const legacy of ['overcast8', 'destroyArmorPiece', 'destroyMagicItem']) {
    const p = preview({ [legacy]: true });
    assert.equal(p.ready, false); assert.equal(p.status, 'invalid-arcane-options');
  }
  assert.equal(preview({ sl: 9, arcaneOptions: { enhancedDamage: true } }).ready, false);
  assert.equal(preview({ sl: 20, arcaneOptions: { enhancedDamage: true }, overcastChoices: { special: 1 } }).ready, false);
  assert.equal(preview({ sl: 20, overcastChoices: { special: 8 } }).ready, false);
  assert.equal(preview({ sl: 30, arcaneOptions: { enhancedDamage: true, chooseMagicItem: true, armorPoints: 1 } }).ready, false, '12 DR > BI6 + BFM5');
  const both = preview({ sl: 20, arcaneOptions: { enhancedDamage: true, chooseMagicItem: true } });
  assert.equal(both.ready, true, both.error); assert.equal(both.castingPreview.overcast.totalSpent, 11);
  assert.equal(both.targetResults[0].arcaneUnforgiving.destroyedAp, 0);
  assert.equal(preview({ arcaneOptions: { armorPoints: -1 } }).ready, false);
  assert.equal(preview({ arcaneOptions: { armorPoints: 1.5 } }).ready, false);
});

test('Arcanes : objet aléatoire uniquement après Focalisation réussie, sans alimenter de réserve', () => {
  assert.equal(preview({ arcaneTargets: {} }).ready, false);
  const facts = { magicItemPresent: true };
  assert.equal(preview({ arcaneTargets: { enemy: facts } }).ready, false);
  const fail = preview({ arcaneTargets: { enemy: { ...facts, focalisationRoll: 85 } } });
  assert.equal(fail.ready, true, fail.error);
  assert.equal(fail.targetResults[0].arcaneUnforgiving.destroyedMagicItem, null);
  assert.equal(preview({ arcaneTargets: { enemy: { ...facts, focalisationRoll: 25 } } }).ready, false);
  const pass = preview({ arcaneTargets: { enemy: { ...facts, focalisationRoll: 25, randomMagicItem: 'Anneau' } } });
  assert.equal(pass.ready, true, pass.error);
  assert.deepEqual(pass.targetResults[0].arcaneUnforgiving.destroyedMagicItem, { name: 'Anneau', selection: 'random' });
  assert.equal(pass.targetResults[0].arcaneUnforgiving.focalisationTest.score, 70);
  assert.equal(actor.extensions?.v5?.channelling, undefined);
});

test('Arcanes : +3 DR offre le choix après Dextérité +2 DR ; échec revient au tirage aléatoire', () => {
  const facts = { magicItemPresent: true, focalisationRoll: 25, randomMagicItem: 'Anneau', chosenMagicItem: 'Épée' };
  const options = { sl: 12, arcaneOptions: { chooseMagicItem: true }, arcaneTargets: { enemy: facts } };
  assert.equal(preview(options).ready, false, 'Dextérité obligatoire');
  const pass = preview({ ...options, arcaneTargets: { enemy: { ...facts, dexterityRoll: 55 } } });
  assert.equal(pass.ready, true, pass.error);
  assert.equal(pass.targetResults[0].arcaneUnforgiving.dexterityTest.success, true, '+2 DR rend le jet 55 réussi avec Dex40');
  assert.deepEqual(pass.targetResults[0].arcaneUnforgiving.destroyedMagicItem, { name: 'Épée', selection: 'chosen' });
  const fail = preview({ ...options, arcaneTargets: { enemy: { ...facts, dexterityRoll: 85 } } });
  assert.equal(fail.ready, true, fail.error);
  assert.equal(fail.targetResults[0].arcaneUnforgiving.dexterityTest.success, false);
  assert.deepEqual(fail.targetResults[0].arcaneUnforgiving.destroyedMagicItem, { name: 'Anneau', selection: 'random' });
  const automatic = previewSpellExecution({ ...actor, caracs: { ...actor.caracs, Dex: 150 } }, spell, [target],
    { ...defaults, ...options, arcaneTargets: { enemy: { ...facts, dexterityRoll: 96 } } });
  assert.equal(automatic.ready, true, automatic.error);
  assert.equal(automatic.targetResults[0].arcaneUnforgiving.dexterityTest.success, false, '96 échoue automatiquement');
  assert.equal(preview({ ...options, arcaneTargets: { enemy: { ...facts, dexterityRoll: 25, chosenMagicItem: '' } } }).ready, false);
});

test('Arcanes Store : validation avant mutation, réserve consommée une fois, PV/PA/suivi restaurés par Undo', async () => {
  const mage = { ...structuredClone(actor), extensions: { v5: { channelling: { type: 'high', sl: 15 } } } };
  const store = await makeStore(mage);
  const before = store.listParticipants();
  for (const options of [{ overcast8: true }, { destroyArmorPiece: true }, { destroyMagicItem: true },
    { sl: -1, roll: undefined, arcaneOptions: { enhancedDamage: true } }]) {
    await assert.rejects(async () => store.applySpellExecution(spell.id, { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'],
      roll: 25, attributeActive: false, arcaneTargets: { enemy: { magicItemPresent: false } }, ...options }));
    assert.deepEqual(store.listParticipants(), before);
  }
  await assert.rejects(async () => store.applySpellExecution(spell.id, { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'],
    roll: 25, arcaneOptions: { armorPoints: 2 }, attributeActive: false }), /Impossible/);
  assert.deepEqual(store.listParticipants(), before, 'Refus sans consommation ni changement');
  const input = { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'], roll: 25, attributeActive: false, operationId: 'arcane-test-1',
    arcaneOptions: { armorPoints: 2 }, arcaneTargets: { enemy: { magicItemPresent: true, focalisationRoll: 25,
      randomMagicItem: 'Amulette', armorDamageLocations: ['body', 'rightArm'] } } };
  await store.applySpellExecution(spell.id, input);
  const after = store.listParticipants();
  assert.equal(after.find(p => p.id === 'mage').extensions.v5.channelling.sl, 0);
  const knight = after.find(p => p.id === 'enemy');
  assert.equal(knight.hp, 24); assert.equal(knight.armor.body, 2); assert.equal(knight.armor.rightArm, 2);
  assert.deepEqual(knight.extensions.v5.armorDamage, { body: 1, rightArm: 1 });
  assert.equal(knight.extensions.v5.pendingInventoryChanges[0].destroyedMagicItem.name, 'Amulette');
  assert.equal(knight.profileId, before.find(p => p.id === 'enemy').profileId);
  await assert.rejects(async () => store.applySpellExecution(spell.id, input));
  assert.deepEqual(store.listParticipants(), after);
  await store.undo(); assert.deepEqual(store.listParticipants(), before);
});

test('Arcanes : destruction physique persistante à la dissipation et aux sauvegardes, équipement source intact', async () => {
  const knight = { ...structuredClone(target), armorLocations: { head: 3, body: 3, arms: 3, legs: 3 },
    equipment: [armorItem('cuir-test', 'leather', 1), armorItem('plate-test', 'rigid', 2), armorItem('protection-magique', 'bonus', 8)] };
  assert.equal(Object.values(getArcaneWornArmor(knight)).reduce((sum, ap) => sum + ap, 0), 18, 'PA magiques exclus des PA portés');
  const store = await makeStore(actor, knight);
  const gearBefore = structuredClone(store.listParticipants().find(p => p.id === 'enemy').equipment);
  await store.applySpellExecution(spell.id, { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'], sl: 11, attributeActive: false,
    arcaneOptions: { armorPoints: 2 }, arcaneTargets: { enemy: { magicItemPresent: false, armorDamageLocations: ['body', 'body'] } } });
  const damaged = store.listParticipants().find(p => p.id === 'enemy');
  assert.deepEqual(damaged.equipment, gearBefore);
  assert.equal(damaged.armor.body, 1);
  assert.equal(locationProtection(damaged, { location: 'body' }).ap, 9, 'PA portés 3 + bonus8 − destruction2');
  assert.equal(getArcaneWornArmor(damaged).body, 1);
  const buff = applySpellEffects(damaged, { id: 'temporary-armor', spellId: 'test', apModifiers: { all: 2 }, durationRounds: 1 }, { round: 1 }).participant;
  assert.equal(buff.armor.body, 3);
  assert.equal(buff.armor.leftArm, 5, 'Groupes bras correctement développés avant le bonus');
  const expired = expireSpellEffects(buff, { effectId: 'temporary-armor' }).participant;
  assert.equal(expired.armor.body, 1, 'La dissipation ne répare pas l’armure physique');
  const restored = await makeStore(actor, JSON.parse(JSON.stringify(expired)));
  assert.equal(restored.listParticipants().find(p => p.id === 'enemy').armor.body, 1);
  assert.deepEqual(restored.listParticipants().find(p => p.id === 'enemy').extensions.v5.armorDamage, { body: 2 });
});

test('Arcanes : les projectiles suivants absorbent les PA du membre effectivement touché', async () => {
  const store = await makeStore();
  await store.applySpellExecution(spell.id, { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'], sl: 15, attributeActive: false,
    arcaneOptions: { armorPoints: 6 }, arcaneTargets: { enemy: { magicItemPresent: false,
      armorDamageLocations: ['rightArm', 'rightArm', 'rightArm', 'rightLeg', 'rightLeg', 'rightLeg'] } } });
  const damaged = store.listParticipants().find(p => p.id === 'enemy');
  const missile = roll => resolveMagicMissile({ caster: actor, target: damaged, spell: { damage: 4 }, roll });
  assert.equal(missile(12).location, 'Bras Gauche'); assert.equal(missile(12).ap, 3);
  assert.equal(missile(53).location, 'Bras Droit'); assert.equal(missile(53).ap, 0);
  assert.equal(missile(12).finalDamage, 3); assert.equal(missile(53).finalDamage, 6);
  assert.equal(missile(58).location, 'Jambe Gauche'); assert.equal(missile(58).ap, 3);
  assert.equal(missile(59).location, 'Jambe Droite'); assert.equal(missile(59).ap, 0);
  assert.equal(locationProtection(damaged, { location: 'rightArm' }).ap, 0);
});

test('Arcanes : l’armure portée abîmée réduit la pénalité de Focalisation, sans changer les objets source', async () => {
  const knight = { ...structuredClone(target), equipment: [armorItem('plate-test', 'rigid', 3)] };
  assert.equal(calculateMagicArmorPenalty(knight).penalty, -3);
  const store = await makeStore(actor, knight);
  await store.applySpellExecution(spell.id, { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy'], sl: 15, attributeActive: false,
    arcaneOptions: { armorPoints: 6 }, arcaneTargets: { enemy: { magicItemPresent: false,
      armorDamageLocations: ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] } } });
  const damaged = store.listParticipants().find(p => p.id === 'enemy');
  assert.equal(calculateMagicArmorPenalty(damaged).penalty, -2);
  assert.equal(damaged.equipment[0].ap, 3);
  assert.equal(Object.values(getArcaneWornArmor(damaged)).reduce((sum, ap) => sum + ap, 0), 12);
});

test('Arcanes : extension à deux cibles, faits séparés et reçus d’inventaire conservés pour chacune', async () => {
  const other = { ...structuredClone(target), id: 'other', name: 'Second chevalier' };
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1,
    currentActorId: actor.id, order: [actor.id, target.id, other.id], participants: [actor, target, other] }, diceLines: [], log: [] });
  const before = store.listParticipants();
  const input = { actorId: 'mage', burnoutRoll:50, targetIds: ['enemy', 'other'], sl: 13, attributeActive: false,
    arcaneOptions: { armorPoints: 3 }, overcastChoices: { targets: 1 }, arcaneTargets: {
      enemy: { magicItemPresent: false, armorDamageLocations: ['head', 'body', 'leftArm'] },
      other: { magicItemPresent: false, armorDamageLocations: ['rightArm', 'leftLeg', 'rightLeg'] }
    } };
  const p = store.previewSpellExecution(spell.id, input); assert.equal(p.ready, true, p.error);
  assert.equal(p.castingPreview.overcast.totalSpent, 4);
  assert.equal(p.ficheFollowUpReceipt.inventoryChanges.length, 2);
  await store.applySpellExecution(spell.id, input);
  const after = store.listParticipants();
  assert.deepEqual(after.find(p => p.id === 'enemy').extensions.v5.armorDamage, { head: 1, body: 1, leftArm: 1 });
  assert.deepEqual(after.find(p => p.id === 'other').extensions.v5.armorDamage, { rightArm: 1, leftLeg: 1, rightLeg: 1 });
  assert.equal(after.find(p => p.id === 'enemy').extensions.v5.pendingInventoryChanges.length, 1);
  assert.equal(after.find(p => p.id === 'other').extensions.v5.pendingInventoryChanges.length, 1);
  await store.undo(); assert.deepEqual(store.listParticipants(), before);
});
