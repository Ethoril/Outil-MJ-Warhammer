import test from 'node:test';
import {declaredAnswers} from './helpers/lot3-declared-answers.js';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { getSpellContract } from '../js/core/v5-spell-contracts.js';
import { resolveHitLocationAndAP } from '../js/core/v5-magic-effects.js';
import { isTargetWearingMetalArmor } from '../js/core/v5-magic-attributes.js';
import { calculateMagicArmorPenalty } from '../js/core/v5-magic-channelling.js';
import { armorMaterial } from '../js/core/v5-armor-material.js';
import { sanitizeParticipant } from '../js/core/sanitize.js';
import { sameSharedState } from '../js/core/sync-protocol.js';

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
