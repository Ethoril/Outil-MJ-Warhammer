import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { getSpellContract, previewSpellExecution } from '../../../js/core/v5-spell-contracts.js';
import { getArcaneWornArmor } from '../../../js/core/v5-magic-arcane-unforgiving.js';
import { applySpellEffects, expireSpellEffects, resolveMagicMissile, resolveHitLocationAndAP } from '../../../js/core/v5-magic-effects.js';
import { calculateMagicArmorPenalty } from '../../../js/core/v5-magic-channelling.js';
import { locationProtection } from '../../../js/core/equipment.js';
import { BEAST_PROFILES, KADON_PROFILES, applyBeastForm, creatureWounds, transformationOvercastCost, optionalTransformationTraits, previewVerdantApotheosis, previewBeastForm, transformationTraitsError } from '../../../js/core/v5-magic-arbitrations.js';
import { beastFormActions, magicGrantedActions, transformationRestrictions } from '../../../js/core/v5-magic-combat.js';
import { isTargetUndead, isTargetWearingMetalArmor } from '../../../js/core/v5-magic-attributes.js';
import { processCombatTurnSpells } from '../../../js/core/v5-magic-turn.js';
import { declaredAnswers } from '../../helpers/lot3-declared-answers.js';
import { armorMaterial } from '../../../js/core/v5-armor-material.js';
import { sanitizeParticipant } from '../../../js/core/sanitize.js';
import { sameSharedState } from '../../../js/core/sync-protocol.js';
import { encounter, cast, inputFor, endTurn } from '../../helpers/lot3-domain-fixture.js';

describe('Arcanes — Châtiment impitoyable', () => {
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
});

describe('Transformations', () => {
/**
 * Forme bestiale (Bêtes du Reikland, Livre de base pp. 325-327) et Transformation de Kadon (monstres pp. 328-335),
 * puis retours de vérification de la livraison 2c (relèvement, Main de Gloire, Faux de Shyish).
 */

const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ id: 'skill-bagarre', name: 'Corps à corps (Bagarre)', carac: 'cc', total: 45, status: 'resolved' }, { id: 'skill-dex', name: 'Art', carac: 'dex', total: 42, status: 'resolved' },
    { id: 'skill-ag', name: 'Esquive', carac: 'ag', total: 47, status: 'resolved' }, { name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }],
  talents: [{ id: 'talent-strike-mighty-blow', name: 'Coup puissant', rank: 1, status: 'resolved' }], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 20 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const ARMOUR = { id: 'jack', kind: 'armour', name: 'Veste de cuir', layer: 'flexible', locations: ['body'], ap: 1, keywords: [] };

// ---------------------------------------------------------------------------------------------------------------------
// Données : transcription du livre et formule des Blessures
// ---------------------------------------------------------------------------------------------------------------------
test('Bêtes du Reikland — valeurs clés des six animaux (pp. 325-327), « – » représenté par null', () => {
  const key = name => { const p = BEAST_PROFILES[name]; return [p.M, p.caracs.F, p.caracs.E, p.caracs.Ag, p.caracs.Dex, p.size, p.armor?.ap ?? 0, p.page]; };
  assert.deepEqual(Object.keys(BEAST_PROFILES), ['boar', 'dog', 'giant-rat', 'giant-spider', 'horse', 'wolf']);
  assert.deepEqual(key('boar'), [7, 35, 40, 35, null, 'average', 1, 325]);
  assert.deepEqual(key('dog'), [6, 20, 20, 30, null, 'small', 0, 325]);
  assert.deepEqual(key('giant-rat'), [6, 20, 20, 35, 10, 'small', 0, 326]);
  assert.deepEqual(key('giant-spider'), [6, 15, 25, 35, 30, 'small', 1, 326]);
  assert.deepEqual(key('horse'), [8, 45, 35, 30, null, 'large', 0, 327]);
  assert.deepEqual(key('wolf'), [9, 35, 30, 30, null, 'average', 0, 327]);
  assert.equal(BEAST_PROFILES.boar.caracs.CT, null);
  assert.equal(BEAST_PROFILES.horse.attacks[0].qualities[0], 'assommante');
  assert.equal(BEAST_PROFILES.boar.attacks[1].free, 'charge');
  assert.equal(BEAST_PROFILES['giant-spider'].traits.includes('Toile 40'), true);
});

test('Formule de Blessures V5 (p. 361) : retrouve les Blessures du livre pour chaque bête et chaque monstre', () => {
  for (const [key, profile] of [...Object.entries(BEAST_PROFILES), ...Object.entries(KADON_PROFILES)]) {
    const caracs = { ...profile.caracs, FM: profile.caracs.FM ?? profile.caracs.E };
    assert.equal(creatureWounds({ caracs, size: profile.size }).wounds, profile.wounds, `${key} : Blessures du livre`);
  }
  const caracs = { F: 35, E: 30, FM: 45 };
  assert.equal(creatureWounds({ caracs, size: 'average' }).wounds, 13);
  assert.equal(creatureWounds({ caracs, size: 'large' }).wounds, 26);
  assert.equal(creatureWounds({ caracs, size: 'enormous' }).wounds, 52);
  assert.equal(creatureWounds({ caracs, size: 'small' }).wounds, 6, 'Petite : 2 × BE');
  assert.equal(creatureWounds({ caracs, size: 'average', hardy: 1 }).wounds, 16, 'Dur à cuire ajoute le BE une fois de plus');
  assert.throws(() => creatureWounds({ caracs: { F: 35, E: 30 }, size: 'average' }), /Force Mentale/);
});

// ---------------------------------------------------------------------------------------------------------------------
// Forme bestiale
// ---------------------------------------------------------------------------------------------------------------------
test('Forme bestiale — chaque animal remplace M, F, E, Ag et Dex ; Dex « – » devient absente ; Blessures par la formule V5 avec la FM du lanceur', () => {
  const caster = wizard();
  for (const [key, profile] of Object.entries(BEAST_PROFILES)) {
    const { participant } = applyBeastForm(caster, profile, { round: 1, durationMinutes: 30 });
    assert.deepEqual(['M', 'F', 'E', 'Ag'].map(k => participant.caracs[k]), [profile.M, profile.caracs.F, profile.caracs.E, profile.caracs.Ag], key);
    assert.equal(Object.hasOwn(participant.caracs, 'Dex'), profile.caracs.Dex !== null, `${key} : Dex`);
    if (profile.caracs.Dex !== null) assert.equal(participant.caracs.Dex, profile.caracs.Dex);
    for (const k of ['CC', 'CT', 'I', 'Int', 'FM', 'Soc']) assert.equal(participant.caracs[k], caster.caracs[k], `${key} : ${k} du lanceur`);
    // BFM 4 du lanceur (FM 45) à la place de celui de l'animal
    const expected = creatureWounds({ caracs: { F: profile.caracs.F, E: profile.caracs.E, FM: 45 }, size: profile.size }).wounds;
    assert.equal(participant.hp, expected, `${key} : Blessures`);
    assert.equal(participant.maxHp, expected);
    assert.deepEqual(participant.extensions.v5.beastForm.absentCaracs, profile.caracs.Dex === null ? ['Dex'] : []);
  }
});

test('Forme bestiale — Dur à cuire du lanceur entre dans la formule, ses talents et compétences restent', () => {
  const hardy = wizard('mage', { talents: [{ id: 'talent-hardy', name: 'Dur à cuire', rank: 1, status: 'resolved' }] });
  const { participant } = applyBeastForm(hardy, BEAST_PROFILES.wolf, { round: 1, durationMinutes: 30 });
  assert.equal(participant.hp, 3 + 3 * 3 + 4, 'BF 3 + (2 + 1) × BE 3 + BFM 4');
  assert.deepEqual(participant.talents.map(t => t.name), ['Coup puissant', 'Dur à cuire'].filter(n => hardy.talents.some(t => t.name === n)));
  assert.equal(participant.skills.find(s => s.name === 'Esquive').total, 47 - 40 + 30, 'compétence sur Ag recalculée sur l’Ag du loup');
  assert.equal(participant.skills.find(s => s.name === 'Art').total, null, 'compétence sur Dex : inutilisable sans Dex');
  assert.equal(participant.skills.find(s => s.name === 'Corps à corps (Bagarre)').total, 45);
});

test('Forme bestiale — trait optionnel à +2 DR : payé exactement, refusé hors liste, jamais Taille (Énorme) ni Nuée', async () => {
  assert.equal(transformationOvercastCost({ kind: 'beast', traits: 2 }), 4);
  assert.ok(!optionalTransformationTraits(BEAST_PROFILES['giant-rat']).includes('Nuée'));
  assert.ok(!optionalTransformationTraits(BEAST_PROFILES['giant-spider']).includes('Nuée'));
  const store = await combat(wizard('mage', { extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } } }));
  const base = { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 12, beastKey: 'wolf', attributeActive: false };
  const free = store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Frénésie'] });
  assert.equal(free.ready, true, free.error);
  assert.equal(free.castingPreview.overcast.totalSpent, 2, 'dépense spéciale déduite : 2 DR par trait');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Frénésie'], overcastChoices: { special: 4 } }).ready, false, 'dépense différente du coût');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, overcastChoices: { special: 2 } }).ready, false, '2 DR sans trait choisi');
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Nuée'] }).ready, false);
  assert.equal(store.previewSpellExecution('Forme bestiale', { ...base, beastTraits: ['Venin (Moyen)'] }).ready, false, 'trait d’un autre animal');
  await store.applySpellExecution('Forme bestiale', { ...base, beastTraits: ['Taille (Grande)'] });
  const mage = person(store, 'mage');
  assert.ok(mage.traits.includes('Taille (Grande)'));
  assert.equal(mage.hp, 26, 'Taille Grande : (BF 3 + 2 × BE 3 + BFM 4) × 2');
  assert.deepEqual(mage.extensions.v5.beastForm.optionalTraits, ['Taille (Grande)']);
});

test('Forme bestiale — équipement lâché : ni PA d’armure ni armes, peau de l’animal seule, tout revient au retour', async () => {
  const caster = wizard('mage', { equipment: [ARMOUR], armor: { head: 0, body: 1, arms: 0, legs: 0 }, armorLocations: { head: 0, body: 1, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 },
    actions: [{ id: 'sword', note: 'Épée', type: 'attack', attr: 'CC', base: 45, damageFormula: 'BF+4', extensions: { fiche: { equipmentId: 'sword' } } }] });
  const store = await combat(caster, wizard('enemy', { camp: 'ennemi' }));
  assert.equal(locationProtection(person(store, 'mage'), { location: { key: 'BODY' } }).ap, 1);
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'boar', attributeActive: false });
  let mage = person(store, 'mage');
  assert.deepEqual(mage.equipment, []);
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1, 'Peau +1 PA du Sanglier, pas la veste');
  assert.equal(locationProtection(mage, { location: { key: 'HEAD' } }).ap, 1, 'la peau protège toutes les localisations');
  assert.equal(mage.extensions.v5.beastForm.equipmentDropped, true);
  const wolf = await combat(caster);
  await wolf.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  assert.equal(locationProtection(person(wolf, 'mage'), { location: { key: 'BODY' } }).ap, 0, 'Loup : aucune armure standard, la veste est lâchée');
  await store.revertBeastForm('mage');
  mage = person(store, 'mage');
  assert.deepEqual(mage.equipment.map(item => item.id), ['jack']);
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1);
  assert.equal(mage.skills.find(s => s.name === 'Art').total, 42, 'compétences retrouvées');
  assert.equal(mage.caracs.Dex, 40);
});

test('Forme bestiale — attaques de l’animal : Bagarre du lanceur, dégâts BF de la Force remplacée + bonus, clauses', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const actions = beastFormActions(person(store, 'mage'));
  assert.deepEqual(actions.map(a => a.note), ['Griffes (Loup)', 'Morsure (Loup) — attaque gratuite en perdant l’Élan']);
  assert.deepEqual(actions.map(a => [a.type, a.attr, a.base, a.damageFormula]), [['attack', 'CC', 45, 'BF+3'], ['attack', 'CC', 45, 'BF+3']]);
  const attack = (action, extra = {}) => store.previewResolution({ actorId: 'mage', targetId: 'enemy', action, roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', ...extra } });
  const claws = attack(actions[0]);
  assert.deepEqual(claws.unresolved || [], [], JSON.stringify(claws.unresolved));
  assert.deepEqual([claws.damage.strengthBonus, claws.damage.weaponDamage], [3, 6], 'BF 3 de la F du loup + 3 de la ligne « 35/+6 »');
  const bitten = attack(actions[1]);
  assert.deepEqual(bitten.unresolved || [], [], 'le lanceur a l’Élan');
  const withoutMomentum = await combat(wizard('mage', { extensions: { v5: { hasMomentum: false, channelling: { type: 'winds', sl: 20 } } } }), wizard('enemy', { camp: 'ennemi' }));
  await withoutMomentum.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const bite = withoutMomentum.previewResolution({ actorId: 'mage', targetId: 'enemy', action: beastFormActions(person(withoutMomentum, 'mage'))[1], roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep' } });
  assert.ok((bite.unresolved || []).some(text => /Élan/.test(text)), 'attaque gratuite sans Élan refusée');
});

test('Forme bestiale — Dex absente : tout Test de Dextérité est refusé ; Cornes du Sanglier seulement en chargeant', async () => {
  const store = await combat(wizard('mage'), wizard('enemy', { camp: 'ennemi' }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'boar', attributeActive: false });
  const dexTest = store.previewResolution({ actorId: 'mage', action: { type: 'skill', attr: 'Dex', base: 40 }, roll: 25, v5: { kind: 'test' } });
  assert.ok((dexTest.unresolved || []).some(text => /Dex absente/.test(text)), JSON.stringify(dexTest.unresolved));
  const agTest = store.previewResolution({ actorId: 'mage', action: { type: 'skill', attr: 'Ag', base: 40 }, roll: 25, v5: { kind: 'test' } });
  assert.deepEqual(agTest.unresolved || [], []);
  const horns = beastFormActions(person(store, 'mage')).find(a => a.id === 'beast-form:horns');
  assert.match(horns.note, /seulement en chargeant/);
  const input = extra => ({ actorId: 'mage', targetId: 'enemy', action: horns, roll: 25, defense: { base: 40, roll: 85, v5: { kind: 'melee', choice: 'keep' } }, v5: { kind: 'melee', choice: 'keep', ...extra } });
  assert.ok((store.previewResolution(input()).unresolved || []).some(text => /charger/.test(text)));
  assert.deepEqual(store.previewResolution(input({ charging: true })).unresolved || [], []);
});

test('Forme bestiale — sous forme animale l’équipement n’offre plus d’action d’arme (liste d’actions du lanceur filtrée)', async () => {
  const sword = { id: 'sword', note: 'Épée', type: 'attack', attr: 'CC', base: 45, damageFormula: 'BF+4', extensions: { fiche: { equipmentId: 'sword' } } };
  const store = await combat(wizard('mage', { actions: [sword] }));
  await store.applySpellExecution('Forme bestiale', { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false });
  const mage = person(store, 'mage');
  assert.ok(mage.actions.some(a => a.id === 'sword'), 'l’action reste dans la fiche (rendue au retour)');
  assert.equal(mage.extensions.v5.beastForm.equipmentDropped, true);
});

// ---------------------------------------------------------------------------------------------------------------------
// Transformation de Kadon
// ---------------------------------------------------------------------------------------------------------------------
const kadonMage = (extra = {}) => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
const kadon = (extra = {}) => ({ actorId: 'mage', targetIds: ['mage'], sl: 20, ...extra });

test('Kadon — contrat : NI 14, Vous ou Contact, Vous ou 1, (Bonus de Force Mentale) Rounds ; options de surpuissance duration et special', () => {
  const contract = getSpellContract('Transformation de Kadon');
  assert.deepEqual([contract.cn, contract.range, contract.target, contract.duration], [14, 'Vous ou Contact', 'Vous ou 1 (maximum)', 'Bonus de Force Mentale Rounds']);
  assert.deepEqual(contract.overcast.options, ['duration', 'special']);
  assert.equal(contract.effects.mjInput, undefined, 'le monstre se choisit dans le sélecteur dédié');
  assert.deepEqual(Object.keys(KADON_PROFILES), ['bog-octopus', 'demigryph', 'dragon', 'fenbeast', 'giant', 'griffon', 'manticore', 'pegasus', 'troll']);
  assert.ok(Object.values(KADON_PROFILES).every(p => ['large', 'enormous'].includes(p.size)), 'Taille Grande ou Énorme seulement');
});

test('Kadon — monstre du livre : caractéristiques, Compétences et Talents remplacés, Blessures du monstre, Int et FM conservées, retour complet', async () => {
  const store = await combat(kadonMage({ equipment: [ARMOUR], armorLocations: { head: 0, body: 1, rightArm: 0, leftArm: 0, rightLeg: 0, leftLeg: 0 } }));
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon()).ready, false, 'monstre à choisir');
  await store.applySpellExecution('Transformation de Kadon', kadon({ monsterKey: 'griffon' }));
  const mage = person(store, 'mage');
  const griffon = KADON_PROFILES.griffon;
  assert.deepEqual(['CC', 'F', 'E', 'I', 'Ag'].map(k => mage.caracs[k]), [50, 50, 50, 45, 60]);
  assert.equal(Object.hasOwn(mage.caracs, 'Dex'), false);
  assert.equal(Object.hasOwn(mage.caracs, 'CT'), false, 'CT « – » du griffon');
  assert.equal(mage.caracs.Int, 52); assert.equal(mage.caracs.FM, 45);
  assert.equal(mage.caracs.M, 6);
  assert.equal(mage.hp, 80, 'Blessures du monstre (p. 332)');
  assert.deepEqual(mage.talents, [], 'Talents du lanceur remplacés');
  assert.deepEqual(mage.skills.map(s => [s.name, s.total]), [['Athlétisme', 65], ['Corps à corps (Bagarre)', 60], ['Perception', 60]]);
  assert.ok(mage.traits.includes('Vol (80)') && mage.traits.includes('Taille (Énorme)'));
  assert.equal(locationProtection(mage, { location: { key: 'BODY' } }).ap, 1, 'Peau +1 PA, pas la veste');
  assert.equal(mage.extensions.v5.beastForm.expiresAtRound, 1 + 4, 'BFM Rounds');
  const attacks = beastFormActions(mage);
  assert.deepEqual(attacks.map(a => [a.note.split(' —')[0], a.base, a.damageFormula]), [['Serres (Griffon)', 60, 'BF+9'], ['Morsure (Griffon)', 60, 'BF+3']], 'ligne du monstre ; +14 − BF 5, +8 − BF 5');
  assert.deepEqual(attacks[0].qualities, [{ id: 'rapide' }]);
  assert.ok(griffon.skills.length > 0);
  await store.expireSpellEffects('mage', { currentRound: 99 });
  const back = person(store, 'mage');
  assert.equal(back.caracs.F, 30); assert.equal(back.caracs.Dex, 40); assert.equal(back.hp, 30);
  assert.deepEqual(back.talents.map(t => t.name), ['Coup puissant']);
  assert.equal(back.skills.length, 5);
  assert.deepEqual(back.equipment.map(item => item.id), ['jack']);
});

test('Kadon — trait optionnel à +4 DR, autre cible au Contact à +4 DR (le lanceur ne se transforme pas)', async () => {
  const store = await combat(kadonMage(), wizard('ally'));
  const withTrait = store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Vision nocturne'] }));
  assert.equal(withTrait.ready, true, withTrait.error);
  assert.equal(withTrait.castingPreview.overcast.totalSpent, 4);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Vision nocturne'], overcastChoices: { special: 2 } })).ready, false);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterKey: 'troll', beastTraits: ['Dressé'] })).ready, false, 'trait hors liste');
  const other = kadon({ monsterKey: 'troll', targetIds: ['ally'],targetTests:{ally:{unwilling:false}} });
  assert.equal(store.previewSpellExecution('Transformation de Kadon', other).ready, false, 'autre cible sans l’option');
  assert.equal(store.previewSpellExecution('Transformation de Kadon', { ...kadon({ monsterKey: 'troll' }), kadonOtherTarget: true }).ready, false, 'option sans autre cible');
  const paid = store.previewSpellExecution('Transformation de Kadon', { ...other, kadonOtherTarget: true });
  assert.equal(paid.ready, true, paid.error);
  assert.equal(paid.castingPreview.overcast.totalSpent, 4);
  await store.applySpellExecution('Transformation de Kadon', { ...other, kadonOtherTarget: true });
  assert.equal(person(store, 'ally').caracs.F, 55, 'l’allié devient troll');
  assert.equal(person(store, 'ally').hp, 30);
  assert.equal(person(store, 'mage').extensions.v5.beastForm, undefined, 'le lanceur reste lui-même');
});

test('Kadon — profil saisi : null, vide ou valeur négative refusés (jamais convertis en 0) ; durée affichée en Rounds', async () => {
  const store = await combat(kadonMage());
  const profile = { name: 'Chimère',size:'large', M: 6, hp: 40, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: ['Vol (60)'] };
  const ok = store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: profile }));
  assert.equal(ok.ready, true, ok.error);
  assert.match(ok.targetResults[0].beastForm.summary, /pendant 4 Rounds/, 'durée en Rounds, pas en minutes');
  for (const bad of [null, '', undefined, -5]) {
    assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, caracs: { ...profile.caracs, F: bad } } })).ready, false, `F = ${bad}`);
  }
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, M: null } })).ready, false);
  assert.equal(store.previewSpellExecution('Transformation de Kadon', kadon({ monsterProfile: { ...profile, hp: -1 } })).ready, false);
});

// ---------------------------------------------------------------------------------------------------------------------
// Retours de vérification de la livraison 2c
// ---------------------------------------------------------------------------------------------------------------------
const lifeMage = (extra = {}) => wizard('mage', { caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 80, FM: 80, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'high', sl: 40 } } }, ...extra });

test('Apothéose Verdoyante — cannotBeRevived refusé ; zone mêlant morts et vivants : vivants ignorés avec un message, morts relevés', async () => {
  const verdant = previewVerdantApotheosis({ corpses: [{ id: 'x', hp: 0, maxHp: 20, timeSinceDeathSec: 10, extensions: { v5: { cannotBeRevived: true } } }], castingSl: 6 });
  assert.equal(verdant.results[0].admissible, false);
  assert.match(verdant.results[0].reason, /plus être ramené/);
  const dead = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, extensions: { v5: { dead: true } }, ...extra });
  const store = await combat(lifeMage(), wizard('alive', { hp: 25 }), dead('dead'), dead('twice', { extensions: { v5: { dead: true, cannotBeRevived: true } } }));
  const options = { actorId: 'mage', targetIds: ['alive', 'dead', 'twice'], sl: 16, targetTests: { dead: { deathDelaySec: 30 }, twice: { deathDelaySec: 30 }, alive: {} } };
  const preview = store.previewSpellExecution('Apothéose Verdoyante', options);
  assert.equal(preview.ready, true, preview.error);
  const lines = preview.targetResults.map(r => [r.targetId, r.verdantApotheosis?.admissible]);
  assert.deepEqual(lines, [['alive', false], ['dead', true], ['twice', false]]);
  assert.ok(preview.targetResults[0].actions.some(a => /ignoré/.test(a.summary)));
  await store.applySpellExecution('Apothéose Verdoyante', options);
  assert.equal(person(store, 'alive').hp, 25, 'le vivant n’est jamais touché');
  assert.ok(person(store, 'dead').hp > 0);
  assert.equal(person(store, 'twice').hp, 0);
  const none = store.previewSpellExecution('Apothéose Verdoyante', { ...options, targetIds: ['alive', 'twice'] });
  assert.equal(none.ready, false, 'aucune cible admissible : refus');
});

test('Apothéose +10 DR — mort constatée déclarée par cible, Inconscient retiré au relèvement, cannotBeRevived refusé', async () => {
  const downed = (id, extra = {}) => wizard(id, { hp: 0, maxHp: 30, states: [{ key: 'inconscient', name: 'Inconscient', level: 1 }], ...extra });
  const store = await combat(lifeMage(), downed('down'), downed('gone', { extensions: { v5: { dead: true, cannotBeRevived: true } } }));
  const options = id => ({ actorId: 'mage', targetIds: [id], sl: 16, apotheoseOptions: { raiseDead: true }, burnoutRoll: 50 });
  assert.equal(store.previewSpellExecution('Apothéose', options('down')).ready, false, 'pas de mort constatée : refusé');
  assert.equal(store.previewSpellExecution('Apothéose', { ...options('gone'), deadTargetIds: ['gone'] }).ready, false, 'cannotBeRevived refusé');
  const declared = { ...options('down'), deadTargetIds: ['down'] };
  assert.equal(store.previewSpellExecution('Apothéose', declared).ready, true);
  await store.applySpellExecution('Apothéose', declared);
  const raised = person(store, 'down');
  assert.equal(raised.hp, 30);
  assert.deepEqual((raised.states || []).map(s => s.key), [], 'Inconscient retiré comme pour Verdant');
});

test('Main de Gloire — la dépense spéciale égale exactement le coût des options choisies', async () => {
  const store = await combat(lifeMage(), wizard('a1'));
  const hog = (extra = {}) => ({ actorId: 'mage', targetIds: ['a1'], sl: 14, roll3d10: 17, burnoutRoll: 50, ...extra });
  const four = ['CC', 'CT', 'F', 'E'];
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, overcastChoices: { special: 6 } })).ready, true);
  const eight = store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, overcastChoices: { special: 8 } }));
  assert.equal(eight.ready, false, '8 DR payés pour l’effet +6 : refusé');
  assert.match(eight.error, /exactement/);
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ chosenStats: ['F'], overcastChoices: { special: 6 } })).ready, false, '6 DR sans les quatre caractéristiques');
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, hogOptions: { removeBroken: true }, overcastChoices: { special: 6 } })).ready, false, '+6 et +3 = 9 DR');
  assert.equal(store.previewSpellExecution('Main de Gloire', hog({ tier: 'overcast6', chosenStats: four, hogOptions: { removeBroken: true }, overcastChoices: { special: 9 } })).ready, true);
});

test('Faux de Shyish — la hallebarde conférée a les qualités du livre et une allonge Longue ; Mort-vivant seulement par trait ou étiquette', async () => {
  const store = await combat(wizard('mage'));
  await store.applySpellExecution('La Faux de Shyish', { actorId: 'mage', targetIds: ['mage'], roll: 25, attributeActive: false });
  const [halberd] = magicGrantedActions(person(store, 'mage'));
  assert.deepEqual(halberd.qualities.map(q => q.id).sort(), ['defensive', 'empaleuse', 'magique', 'taille']);
  assert.equal(halberd.reach, 'Longue');
  assert.equal(halberd.extensions.v5.weaponReach, 'Longue');
  assert.equal(isTargetUndead({ name: 'Chasseur de vampires' }), false);
  assert.equal(isTargetUndead({ name: 'Zombie' }), false, 'le nom ne suffit pas');
  assert.equal(isTargetUndead({ name: 'Garde', tags: ['Mort-vivant'] }), true);
  assert.equal(isTargetUndead({ name: 'Garde', traits: ['Mort-vivant'] }), true);
  assert.equal(isTargetUndead({ isUndead: true }), true);
});
});

describe('Transformations — vérification', () => {
const wizard = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', hp: 30, maxHp: 30, fortune: 2, zone: 'active', init: 50,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 52, FM: 45, Ag: 40, I: 40, Dex: 40, Soc: 31, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }], talents: [], states: [], equipment: [],
  armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 30 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people }, diceLines: [], log: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const person = (store, id) => store.listParticipants().find(p => p.id === id);
const wolf = { actorId: 'mage', targetIds: ['mage'], roll: 25, sl: 8, beastKey: 'wolf', attributeActive: false };
const kadonOther = { actorId: 'c2', targetIds: ['mage'], sl: 20, monsterKey: 'troll', kadonOtherTarget: true,targetTests:{mage:{unwilling:false}} };

test('transformation refusée sur une cible déjà transformée, à l’aperçu et à l’application', async () => {
  const store = await combat(wizard('mage'), wizard('c2'));
  await store.applySpellExecution('Forme bestiale', wolf);
  const before = person(store, 'mage');
  for (const [name, options] of [['Transformation de Kadon', kadonOther]]) {
    const preview = store.previewSpellExecution(name, options);
    assert.equal(preview.ready, false, name);
    assert.match(preview.error, /déjà transformée/, name);
    await assert.rejects(async () => store.applySpellExecution(name, options), /déjà transformée/, name);
  }
  for (const isJade of [false, true]) assert.throws(() => previewBeastForm(before, BEAST_PROFILES.wolf, { isJade }), /déjà transformée/);
  const after = person(store, 'mage');
  assert.equal(after.extensions.v5.beastForm.kind, 'beast');
  assert.deepEqual(after.caracs, before.caracs);
  await store.revertBeastForm('mage');
  assert.equal(person(store, 'mage').caracs.F, 30);
});

test('dissipateur raté : DR négatif compté pour 0 dans le net', async () => {
  const store = await combat(wizard('d'), wizard('c'));
  const preview = store.previewDispelCasting({ testSl: 6, matchingReserve: 0, totalCastingSl: 6, cn: 4 }, { dispellerId: 'd', distance: 10, visible: true, roll: 87 });
  assert.equal(preview.dispelled, false);
  assert.equal(preview.dispellerSl, 0);
  assert.equal(preview.netSl, 6);
  assert.equal(preview.casterSlAfterDispel, 6);
});

test('Dex absente contrôlée quelle que soit la casse', async () => {
  const store = await combat(wizard('mage'));
  await store.applySpellExecution('Forme bestiale', wolf);
  const mage = person(store, 'mage');
  assert.ok(mage.extensions.v5.beastForm.absentCaracs.includes('Dex'));
  for (const attr of ['Dex', 'dex', 'DEX']) assert.equal(transformationRestrictions(mage, { attr }).length, 1, attr);
});

test('Kadon : saisie manuelle exigeant des nombres finis ≥ 0 non vides', async () => {
  const store = await combat(wizard('mage'));
  const profile = { name: 'X',size:'large', M: 6, hp: 40, caracs: { CC: 50, CT: 0, F: 60, E: 60, I: 40, Ag: 40, Dex: 0, Soc: 10 }, traits: [] };
  const run = value => store.previewSpellExecution('Transformation de Kadon', { actorId: 'mage', targetIds: ['mage'], sl: 20, monsterProfile: { ...profile, caracs: { ...profile.caracs, F: value } } });
  for (const bad of ['  ', '', [], [5], true, '12abc', Infinity, 'abc', -1, null]) assert.equal(run(bad).ready, false, JSON.stringify(bad));
  for (const good of [0, 60, '60']) assert.equal(run(good).ready, true, JSON.stringify(good));
});

test('Pieuvre des marais : Taille (Monstrueuse) en option, Énorme exclue de Forme bestiale seulement', () => {
  const octopus = KADON_PROFILES['bog-octopus'];
  assert.ok(octopus.optionalTraits.includes('Taille (Énorme)') && octopus.optionalTraits.includes('Taille (Monstrueuse)'));
  assert.equal(transformationTraitsError(octopus, ['Taille (Monstrueuse)'], 'kadon'), null);
  assert.equal(transformationTraitsError(octopus, ['Taille (Énorme)'], 'kadon'), null);
  assert.ok(optionalTransformationTraits(octopus, 'beast').includes('Taille (Monstrueuse)'));
  assert.ok(!optionalTransformationTraits(octopus, 'beast').includes('Taille (Énorme)'));
});

test('options de Taille mutuellement exclusives', () => {
  const spider = BEAST_PROFILES['giant-spider'];
  assert.equal(transformationTraitsError(spider, ['Taille (Moyenne)'], 'beast'), null);
  assert.match(transformationTraitsError(spider, ['Taille (Moyenne)', 'Taille (Grande)'], 'beast'), /une seule Taille/);
  assert.equal(transformationTraitsError(KADON_PROFILES['bog-octopus'], ['Taille (Énorme)', 'Taille (Monstrueuse)'], 'kadon') !== null, true);
});

test('Kadon sur autre cible : forme et marqueur expirent ensemble à la fin du tour du lanceur', async () => {
  const store = await combat(wizard('c2'), wizard('mage'));
  await store.applySpellExecution('Transformation de Kadon', kadonOther);
  const target = person(store, 'mage');
  const expires = target.extensions.v5.beastForm.expiresAtRound;
  assert.ok(target.extensions.v5.spellEffects.some(e => e.beastFormMarker));
  const others = store.listParticipants().filter(p => p.id !== 'mage');
  // Fin du tour de la cible : rien ne change.
  let result = processCombatTurnSpells([...others, target], expires, 'c2', { actorId: 'mage', round: expires });
  assert.ok(result.find(p => p.id === 'mage').extensions.v5.beastForm);
  assert.ok(result.find(p => p.id === 'mage').extensions.v5.spellEffects.some(e => e.beastFormMarker));
  // Fin du tour du lanceur : les deux ensemble.
  result = processCombatTurnSpells([...others, target], expires, 'mage', { actorId: 'c2', round: expires });
  const ended = result.find(p => p.id === 'mage');
  assert.equal(ended.extensions.v5.beastForm, undefined);
  assert.ok(!(ended.extensions.v5.spellEffects || []).some(e => e.beastFormMarker));
  assert.equal(ended.caracs.F, 30);
});
});

describe('Vérification de la phase 9', () => {
// Retours de la vérification de la phase 9 (intégration) et de la fin du socle (S-08 à S-10).
const talent = (id, rank = 1, specialization = undefined) => ({ id: 'talent-' + id, status: 'resolved', rank, ...(specialization ? { specialization } : {}) });
const wizard = (id = 'mage', extra = {}) => ({ id, name: id, kind: 'PJ', camp: id === 'enemy' ? 'ennemi' : 'pj', zone: 'active', hp: 30, maxHp: 30, fortune: 2,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, Int: 60, FM: 50, Ag: 40, I: 40, Dex: 40, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }],
  talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: true, channelling: { type: 'winds', sl: 10 } } }, ...extra });
async function combat(...people) {
  const store = createStore(); await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: people[0].id, order: people.map(p => p.id), participants: people },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } });
  return store;
}
const piece = (name, category, layer, ap = 2, extra = {}) => ({ id: name + category, kind: 'armour', keywords: [], name, category, layer, ap, locations: ['body'], ...extra });

test('Métal et Cieux : le matériau décide, pas la couche rigide ou flexible', () => {
  assert.equal(armorMaterial(piece('Plastron de cuir', 'Cuir Bouilli', 'rigid')), 'other');
  assert.equal(armorMaterial(piece('Cape de Lion Blanc', 'Cape Haut Elfe', 'rigid')), 'other');
  assert.equal(armorMaterial(piece('Cape de Dragon des Mers', 'Magique et Unique', 'rigid', 3)), 'other');
  assert.equal(armorMaterial(piece('Cotte de mailles', 'Mailles', 'flexible')), 'metal');
  assert.equal(armorMaterial(piece('Plastron', 'Plates', 'rigid')), 'metal');
  assert.equal(armorMaterial(piece('Plastron', 'Gromril (nain)', 'rigid', 3)), 'metal');
  assert.equal(armorMaterial(piece('Plastron', 'Dragon Haut Elfe', 'rigid')), 'metal', 'décision du MJ du 11 octobre : les armures Dragon Haut Elfe comptent comme métal');
  assert.equal(armorMaterial(piece('Heaume ouvert', 'Dragon Haut Elfe', 'rigid')), 'metal');
  assert.equal(armorMaterial(piece('Plastron', 'Maison', 'rigid')), 'unknown', 'matériau non déterminable : jamais présumé');
  assert.equal(armorMaterial(piece('Armure', 'Maison', 'rigid', 2, { material: 'Bronze' })), 'metal');
  assert.equal(armorMaterial(piece('Armure', 'Plates', 'rigid', 2, { material: 'cuir' })), 'other', 'le champ material du MJ prime');
});

test('Métal et Cieux : le cuir bouilli et les capes ne comptent pas comme métal, les mailles oui, les PA détruits sortent', () => {
  const at = target => resolveHitLocationAndAP(target, 50, { ignoreMetalAp: true });
  const leather = wizard('enemy', { equipment: [piece('Plastron de cuir', 'Cuir Bouilli', 'rigid'), piece('Cape de Lion Blanc', 'Cape Haut Elfe', 'rigid')] });
  assert.equal(at(leather).metalAp, 0);
  assert.equal(isTargetWearingMetalArmor(leather), false);
  const mail = wizard('enemy', { equipment: [piece('Cotte de mailles', 'Mailles', 'flexible'), piece('Plastron de cuir', 'Cuir Bouilli', 'rigid')] });
  assert.equal(at(mail).metalAp, 2);
  assert.equal(isTargetWearingMetalArmor(mail), true);
  const broken = wizard('enemy', { equipment: [piece('Cotte de mailles', 'Mailles', 'flexible')], extensions: { v5: { armorDamage: { body: 1 } } } });
  assert.equal(at(broken).metalAp, 1, 'un PA détruit ne compte plus comme métal');
  const destroyed = wizard('enemy', { equipment: [piece('Cotte de mailles', 'Mailles', 'flexible')], extensions: { v5: { armorDamage: { body: 2 } } } });
  assert.equal(at(destroyed).metalAp, 0);
  const unknown = wizard('enemy', { equipment: [piece('Plastron', 'Maison', 'rigid')] });
  assert.throws(() => at(unknown), /Matériau inconnu pour Plastron/);
  assert.doesNotThrow(() => resolveHitLocationAndAP(unknown, 50, {}), 'sans Cieux ni Métal, aucun besoin du matériau');
});

test('Focalisation de Chamon : le métal est ignoré, pas le cuir bouilli ; un matériau inconnu est signalé et conservé', () => {
  const chamon = equipment => calculateMagicArmorPenalty(wizard('mage', { equipment }), { wind: 'Chamon' });
  assert.equal(chamon([piece('Cotte de mailles', 'Mailles', 'flexible')]).penalty, 0);
  assert.equal(chamon([piece('Plastron de cuir', 'Cuir Bouilli', 'rigid')]).penalty, -2);
  const unknown = chamon([piece('Plastron', 'Maison', 'rigid')]);
  assert.equal(unknown.penalty, -2);
  assert.deepEqual(unknown.unknownMaterials, ['Plastron']);
  const dragon = chamon([piece('Plastron', 'Dragon Haut Elfe', 'rigid')]);
  assert.equal(dragon.penalty, 0, 'Dragon Haut Elfe : métal, ignoré par la Focalisation de Chamon');
  assert.deepEqual(dragon.unknownMaterials, []);
});

test('Drain de puissance : un sort d’Arcane générique suit le Domaine choisi, pas tous les Arcanes', async () => {
  const store = await combat(wizard('mage', { talents: [talent('arcane-magic', 1, 'Feu'), talent('arcane-magic', 1, 'Cieux')] }), wizard('enemy'));
  await store.applyMiscast(store.previewMiscast({ actorId: 'mage', severity: 'MAJOR', roll: 18, secondaryRolls: { duration: 3 }, usedTalent: { id: 'talent-arcane-magic', lore: 'fire' } }), { actorId: 'mage' });
  const generic = getSpellContract('Arme aethyrique');
  assert.equal(generic.domain, 'arcane');
  assert.throws(() => store.previewCasting(generic, { actorId: 'mage', roll: 25, chosenLore: 'fire' }), /Drain de puissance/);
  assert.equal(store.previewCasting(generic, { actorId: 'mage', roll: 25, chosenLore: 'heavens' }).ready, true);
});

test('Surpuissance : une dépense négative est refusée, pas ignorée', async () => {
  const store = await combat(wizard('mage'), wizard('enemy'));
  for (const spell of ['Sang Bouillonnant', 'Arme aethyrique']) {
    const preview = store.previewSpellExecution(getSpellContract(spell).id, { ...declaredAnswers(['enemy']),actorId: 'mage', targetIds: ['enemy'], roll: 5, chosenLore: 'fire', overcastChoices: { damage: -1 } });
    assert.equal(preview.ready, false, spell);
    assert.match(preview.error, /surpuissance invalide pour Dégâts/i);
  }
});

test('Sanitisation : scène suspendue nulle, nom d’armure, caractéristique absente (null) et fortune null', async () => {
  assert.doesNotThrow(() => sameSharedState({ schemaVersion: 3, suspendedScenes: [null] }, { schemaVersion: 3, suspendedScenes: [null] }));
  const store = createStore(); await store.ready;
  await store.loadFromJSON(JSON.stringify({ schemaVersion: 3, reserve: [], combat: { round: 1, participants: [] }, suspendedScenes: [null, { id: 't', participants: [{ id: 'z', name: 'Z' }] }] }));
  assert.deepEqual(store.listSuspendedScenes().map(scene => scene.id), ['t']);
  const form = sanitizeParticipant({ id: 'a', name: 'A', fortune: null, extensions: { v5: { beastForm: { active: true, originalParticipant: { caracs: { FM: 50 }, hp: 10, maxHp: 20, M: 4, traits: [] }, initialBeastHp: 14, armor: { name: 'Peau', ap: 1 },
    caracs: { CC: 30, CT: null, Dex: null, Soc: null } } } } });
  assert.deepEqual(form.extensions.v5.beastForm.armor, { name: 'Peau', ap: 1 });
  assert.deepEqual(form.extensions.v5.beastForm.caracs, { CC: 30, CT: null, Dex: null, Soc: null });
  assert.equal(form.fortune, null);
  assert.equal(sanitizeParticipant({ id: 'b', name: 'B' }).fortune, undefined);
});
});

describe('Caractérisation — magie P4c', () => {
// Caractérisation (aucune correction) : invocations MAGIQUES auxiliaires, comportement de production 3.16.1.
// Chaque test épingle ce que le code fait AUJOURD'HUI ; un « DÉFAUT EXISTANT » signalé en commentaire n'est pas corrigé ici.

const DAWN = c => ({ domainFacts: { ...inputFor(c).domainFacts, minutesToDawn: 1 } });
const json = store => JSON.parse(store.getFullJSON());
const auxOf = store => store.listParticipants().filter(p => p.extensions?.isAuxiliary);
const layersOf = (store, spellId) => store.listParticipants().flatMap(p => (p.extensions?.v5?.spellEffects || []).filter(e => e.spellId === spellId).map(e => ({ ...e, holderId: p.id })));
const jumpTo = async (store, round, currentActorId) => {
  const state = json(store); state.combat.round = round; state.combat.currentActorId = currentActorId; await store.loadFromJSON(state);
};
async function destrier(extras = {}) {
  const env = await encounter(extras), c = getSpellContract('Destrier d’Ombre');
  await cast(env.store, c, DAWN(c));
  return { ...env, c, horse: auxOf(env.store)[0] };
}

// ---------- C1 : création ----------
test('C1 Destrier d’Ombre : une seule commande atomique, ordre et acteur courant inchangés', async () => {
  const { store } = await encounter(), c = getSpellContract('Destrier d’Ombre');
  const before = json(store);
  await cast(store, c, DAWN(c));
  const after = json(store);
  assert.equal(after.localRevision, before.localRevision + 1, 'cast = une révision');
  assert.deepEqual(after.combat.order, ['mage', 'foe'], 'l’invocation n’entre pas dans combat.order à la création');
  assert.equal(after.combat.orderMode, before.combat.orderMode);
  assert.equal(after.combat.orderMode, 'automatic');
  assert.equal(after.combat.currentActorId, 'mage');
  assert.equal(after.combat.participants.length, 3);
});

test('C1 Destrier d’Ombre : champs auxiliaires dans extensions / extensions.v5, id et couche liée', async () => {
  const { store, c, horse } = await destrier();
  assert.match(horse.id, new RegExp('^aux-' + c.id + '-'));
  assert.equal(horse.isAuxiliary, undefined, 'isAuxiliary migre de la racine vers extensions');
  assert.equal(horse.casterId, undefined);
  assert.equal(horse.extensions.casterId, 'mage');
  assert.equal(horse.extensions.noMomentum, false);
  assert.equal(horse.extensions.appliedAtRound, 1);
  assert.equal(horse.camp, 'pj');
  assert.equal(horse.maxHp, 22);
  assert.equal(horse.caracs.M, 8);
  const v5 = horse.extensions.v5, [layer] = layersOf(store, c.id);
  assert.equal(v5.summonedBySpellId, c.id);
  assert.equal(v5.summonOwnerId, 'foe', 'propriétaire = cible du sort, pas le lanceur');
  assert.equal(layer.holderId, 'foe');
  assert.equal(v5.summonCastExecutionId, layer.castExecutionId, 'l’invocation et sa couche partagent l’exécution');
  assert.equal(v5.summonedUntilRound, 7);
  assert.equal(layer.expiresAtRound, 7);
});

test('C1 Épées Sanguines : une épée indestructible, hp 0 maxHp null, propriétaire = lanceur', async () => {
  const { store } = await encounter(), c = getSpellContract('Epées Sanguines');
  const rev = json(store).localRevision;
  await cast(store, c);
  assert.equal(json(store).localRevision, rev + 1);
  const [sword, ...rest] = auxOf(store);
  assert.equal(rest.length, 0);
  assert.equal(sword.name, 'Épée Sanguine 1');
  assert.match(sword.id, new RegExp('^aux-' + c.id + '-'));
  assert.equal(sword.extensions.ws, 60); assert.equal(sword.extensions.damage, 8);
  assert.equal(sword.extensions.noMomentum, true); assert.equal(sword.extensions.casterId, 'mage');
  assert.equal(sword.extensions.v5.indestructible, true);
  assert.equal(sword.extensions.v5.summonOwnerId, 'mage');
  assert.equal(sword.extensions.v5.summonAttack.fly, 20);
  assert.equal(sword.hp, 0); assert.equal(sword.maxHp, null, 'état actuel : hp 0 / maxHp null (indestructible)');
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  const [layer] = layersOf(store, c.id);
  assert.equal(layer.holderId, 'mage'); assert.equal(layer.expiresAtRound, 37);
  assert.equal(sword.extensions.v5.summonCastExecutionId, layer.castExecutionId);
});

test('C1 Enfants Sauvages de Zandox : deux chiens aux ids distincts dans une seule commande', async () => {
  const { store } = await encounter(), c = getSpellContract('Les Enfants Sauvages de Zandox');
  const rev = json(store).localRevision;
  await cast(store, c);
  assert.equal(json(store).localRevision, rev + 1);
  const dogs = auxOf(store);
  assert.equal(dogs.length, 2);
  assert.notEqual(dogs[0].id, dogs[1].id);
  assert.deepEqual(dogs.map(d => d.name).sort(), ['Chien Sauvage de Zandox 1', 'Chien Sauvage de Zandox 2']);
  for (const d of dogs) {
    assert.equal(d.extensions.invisible, true); assert.ok(d.extensions.traits.includes('Invisible'));
    assert.equal(d.extensions.v5.summonOwnerId, 'mage');
  }
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  assert.equal(layersOf(store, c.id).length, 1, 'une seule couche pour les deux chiens');
});

test('C1 Œil Invisible : capteur lié à son propriétaire, sans summonedUntilRound', async () => {
  const { store } = await encounter(), c = getSpellContract('Œil Invisible');
  await cast(store, c);
  const [eye, ...rest] = auxOf(store);
  assert.equal(rest.length, 0);
  assert.match(eye.id, /^aux-invisible-eye-\d+$/);
  assert.equal(eye.maxHp, 3); assert.equal(eye.hp, 3);
  assert.equal(eye.extensions.sensor, true);
  assert.equal(eye.extensions.v5.eyeOwner, 'mage');
  assert.equal(eye.extensions.v5.summonOwnerId, 'foe');
  assert.equal(eye.extensions.v5.summonedUntilRound, undefined);
  assert.ok(eye.extensions.v5.summonCastExecutionId);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
});

test('C1 le premier changement de Tour insère l’invocation dans combat.order selon l’initiative', async () => {
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  const combat = json(store).combat;
  assert.deepEqual(combat.order, ['mage', horse.id, 'foe']);
  assert.equal(combat.currentActorId, horse.id, 'la monture (I 15) joue juste après le lanceur (I 60)');
  assert.equal(combat.orderMode, 'automatic');
});

// ---------- C2 : expiration, fin anticipée, Undo/Redo, rechargement ----------
test('C2 Destrier : à l’échéance de la couche (fin du Tour du lanceur) la monture et la couche disparaissent ensemble ; Undo/Redo les lient', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.ok(!json(store).combat.order.includes(horse.id));
  await store.undo();
  assert.equal(auxOf(store).length, 1, 'Undo : monture');
  assert.equal(layersOf(store, c.id).length, 1, 'Undo : couche');
  await store.redo();
  assert.equal(auxOf(store).length, 0, 'Redo : monture retirée');
  assert.equal(layersOf(store, c.id).length, 0, 'Redo : couche retirée');
});

test('C2 Destrier : tant que la couche tient (fin du round 6, début du round 7) la monture reste', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 6, 'mage'); await endTurn(engine);
  assert.ok(auxOf(store).some(a => a.id === horse.id));
  await jumpTo(store, 7, 'mage');
  assert.equal(layersOf(store, c.id).length, 1);
  assert.ok(auxOf(store).some(a => a.id === horse.id));
});

test('C2 Enfants Sauvages : les deux chiens expirent avec leur couche au round 7', async () => {
  const { store, engine } = await encounter(), c = getSpellContract('Les Enfants Sauvages de Zandox');
  await cast(store, c);
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  await store.undo();
  assert.equal(auxOf(store).length, 2);
});

test('C2 Épées Sanguines : expire au round 37 (Bonus de FM minutes)', async () => {
  const { store, engine } = await encounter(), c = getSpellContract('Epées Sanguines');
  await cast(store, c);
  await jumpTo(store, 36, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 1, 'toujours là au round 36');
  await jumpTo(store, 37, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
});

test('C2 fin anticipée du sort : l’invocation part avec la couche, Undo puis Redo', async () => {
  const { store, c, horse } = await destrier();
  const [layer] = layersOf(store, c.id), order = json(store).combat.order;
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(json(store).combat.order, order);
  await store.undo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
  await store.redo();
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
});

test('C2 Undo de la création retire l’invocation et sa couche ; Redo les rend avec le même id', async () => {
  const { store, c, horse } = await destrier();
  await store.undo();
  assert.equal(auxOf(store).length, 0); assert.equal(layersOf(store, c.id).length, 0);
  await store.redo();
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
});

test('C2 rechargement getFullJSON puis loadFromJSON : invocation et couche conservées, expiration toujours effective', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await endTurn(engine);
  const snapshot = json(store);
  await store.loadFromJSON(snapshot);
  const reloaded = auxOf(store);
  assert.deepEqual(reloaded.map(a => a.id), [horse.id]);
  assert.equal(reloaded[0].extensions.v5.summonCastExecutionId, layersOf(store, c.id)[0].castExecutionId);
  assert.deepEqual(json(store).combat.order, snapshot.combat.order);
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  assert.equal(auxOf(store).length, 0);
});

test('C2 second filtre (fin de processCombatTurnSpells) : une invocation sans summonCastExecutionId disparaît quand round >= summonedUntilRound', async () => {
  const { store, engine } = await encounter();
  const state = json(store);
  state.combat.participants.push({ id: 'legacy', name: 'legacy', kind: 'Créature', camp: 'pj', zone: 'active', hp: 5, maxHp: 5, initiative: 30, caracs: { M: 4 }, extensions: { isAuxiliary: true, v5: { summonedUntilRound: 2 } } });
  await store.loadFromJSON(state);
  await endTurn(engine);                                       // mage -> legacy, round 1
  assert.ok(auxOf(store).some(a => a.id === 'legacy'));
  await endTurn(engine); await endTurn(engine);                 // legacy -> foe -> round 2 : filtre
  assert.equal(store.getCombat().round, 2);
  assert.equal(auxOf(store).length, 0);
  const combat = json(store).combat;
  assert.ok(!combat.order.includes('legacy'));
  assert.equal(combat.currentActorId, 'mage');
});

test('C2 la couche expire au passage au round 8 si le lanceur n’a pas fini son Tour d’échéance : la monture part avec elle', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 25 } });
  await jumpTo(store, 7, 'foe'); await endTurn(engine);  // la monture entre dans l’ordre et joue (round 7)
  assert.ok(auxOf(store).some(a => a.id === horse.id));
  await endTurn(engine);                                  // fin du Tour de la monture : round 8
  assert.equal(store.getCombat().round, 8);
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  assert.equal(json(store).combat.currentActorId, 'mage');
});

// ---------- C3 / C9 : acteur courant ou suivant qui expire ----------
test('C3 monture prochain acteur lors de l’expiration : gardée courante (orpheline), retirée à la commande suivante, sans Tour rejoué ni sauté', async () => {
  // DÉFAUT CORRIGÉ (chantier p4d-r4) : auparavant removeExpiredSummons retirait la monture courante et reposait currentActorId sur
  // order[0] = le lanceur, qui rejouait dans le même Round pendant que foe sautait son Tour. Désormais l'invocation orpheline qui est
  // l'acteur courant (hors tête d'ordre) reste jusqu'à la commande suivante, comme sweepDivineSummons côté divin.
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);                                  // la monture entre dans l'ordre, courante
  assert.equal(json(store).combat.currentActorId, horse.id);
  await endTurn(engine); await endTurn(engine);            // foe puis round 2, mage
  await jumpTo(store, 7, 'mage');
  const before = json(store);
  assert.deepEqual(before.combat.order, ['mage', horse.id, 'foe']);
  await endTurn(engine);                                  // ne doit pas rejeter
  const after = json(store);
  assert.equal(after.localRevision, before.localRevision + 1);
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id], 'orpheline mais acteur courant : retirée au Tour suivant');
  assert.deepEqual(after.combat.order, ['mage', horse.id, 'foe']);
  assert.equal(after.combat.round, 7);
  assert.equal(after.combat.currentActorId, horse.id, 'le successeur du lanceur est bien la monture : le lanceur ne rejoue pas');
  assert.equal(after.extensions.v5.gameClock.combat.currentActorId, horse.id);
  assert.equal(after.extensions.v5.gameClock.combat.round, 7);
  assert.equal(after.extensions.v5.turnIndex, before.extensions.v5.turnIndex + 1);
  await endTurn(engine);
  assert.equal(json(store).combat.currentActorId, 'foe', 'foe joue son Tour du round 7');
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(json(store).combat.order, ['mage', 'foe']);
  await store.undo(); await store.undo();
  assert.equal(json(store).combat.currentActorId, 'mage');
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
});

test('C3 le Tour suivant après cette expiration fonctionne (pas de rejet V5_CLOCK_POSITION_CONFLICT)', async () => {
  const { store, engine, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine); await endTurn(engine); await endTurn(engine);
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(combat.currentActorId, 'foe');
  assert.equal(combat.round, 7);
  assert.ok(!combat.order.includes(horse.id));
  await endTurn(engine);
  assert.equal(json(store).combat.round, 8);
  assert.equal(json(store).combat.currentActorId, 'mage');
});

test('C3 monture première de l’ordre au Round d’échéance+1 : retirée, le premier acteur restant prend la main', async () => {
  // Le lanceur (I 1) joue en dernier ; la monture ouvrirait le round 8 mais expire à la fin du Tour du lanceur (round 7).
  const { store, engine, horse } = await destrier({ mage: { initiative: 1 }, foe: { initiative: 5 } });
  await endTurn(engine);
  assert.deepEqual(json(store).combat.order, [horse.id, 'foe', 'mage']);
  await jumpTo(store, 7, 'mage');
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(combat.order, ['foe', 'mage']);
  assert.equal(combat.round, 8);
  assert.equal(combat.currentActorId, 'foe');
});

test('C3 monture acteur courant après l’échéance (round 8) : sa fin de Tour l’expire et passe la main à foe', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  await jumpTo(store, 8, horse.id);                       // couche encore présente (7), round > 7
  assert.equal(layersOf(store, c.id).length, 1);
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.equal(layersOf(store, c.id).length, 0);
  assert.deepEqual(combat.order, ['mage', 'foe']);
  assert.equal(combat.currentActorId, 'foe');
  assert.equal(combat.round, 8);
});

test('C3 monture courante au round 7 : son propre Tour ne l’expire pas (la couche expire au Tour du lanceur)', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  await jumpTo(store, 7, horse.id);
  await endTurn(engine);
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.equal(layersOf(store, c.id).length, 1);
  assert.equal(json(store).combat.currentActorId, 'foe');
});

test('C9 chiens sans initiative : jamais dans combat.order ; expiration sans effet sur l’ordre ni l’acteur courant', async () => {
  // Observé : les chiens (initiative absente) ne sont pas insérés dans combat.order par le changement de Tour.
  const { store, engine } = await encounter({ foe: { initiative: 5 } }), c = getSpellContract('Les Enfants Sauvages de Zandox');
  await cast(store, c);
  await endTurn(engine);
  const dogIds = auxOf(store).map(a => a.id);
  assert.equal(dogIds.length, 2);
  for (const id of dogIds) assert.ok(!json(store).combat.order.includes(id));
  await jumpTo(store, 7, 'mage'); await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0);
  assert.deepEqual(combat.order, ['mage', 'foe']);
  assert.ok(combat.order.includes(combat.currentActorId));
});

test('C9 invocation retirée alors qu’elle est l’acteur courant (fin anticipée) : gardée jusqu’à la commande suivante, puis Tour de son successeur', async () => {
  const { store, engine, c, horse } = await destrier({ foe: { initiative: 5 } });
  await endTurn(engine);
  assert.equal(json(store).combat.currentActorId, horse.id);
  const [layer] = layersOf(store, c.id);
  await store.applySpellInteraction({ effectId: layer.id, targetId: 'foe', kind: 'end' });
  const kept = json(store).combat;
  assert.ok(kept.order.includes(horse.id), 'l’invocation orpheline reste dans l’ordre');
  assert.equal(kept.currentActorId, horse.id, 'elle reste l’acteur courant, sans Tour rendu au lanceur');
  await endTurn(engine);
  const combat = json(store).combat;
  assert.equal(auxOf(store).length, 0, 'retirée à la commande suivante');
  assert.ok(!combat.order.includes(horse.id));
  assert.equal(combat.currentActorId, 'foe', 'son successeur joue, pas le lanceur');
  await store.undo(); await store.undo();
  const undone = json(store).combat;
  assert.deepEqual(auxOf(store).map(a => a.id), [horse.id]);
  assert.ok(undone.order.includes(horse.id));
  assert.equal(undone.currentActorId, horse.id);
});
});
