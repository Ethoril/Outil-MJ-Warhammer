import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getAllDivineContracts, getDivineContract } from '../js/core/v5-divine-store.js';
import { magicWeaponNature } from '../js/core/v5-magic-combat.js';
import { buildDivineForm, toEngineInput, emptyDivineForm } from '../js/ui/v5-divine-form-model.js';

// P5 T1 — Bénédiction de Droiture (p.221) : « L'arme de la cible est considérée comme Magique ».
// Arbitrage MJ (19 oct.) : sur UNE arme désignée par le MJ, celle de la CIBLE de la bénédiction (pas du prêtre).
// Critère d'acceptation écrit avant l'implémentation (doit échouer avant).
const clone = value => structuredClone(value);
const DROITURE = ['myrmidia', 'morr', 'sigmar', 'verena'].map(cult => `divine:blessing:${cult}:righteousness`);
const sword = { id: 'sword-attack', note: 'Épée', type: 'attack', attr: 'CC', base: 40, damage: 4, qualities: [], extensions: { fiche: { equipmentId: 'sword' } } };
const dagger = { id: 'dagger-attack', note: 'Dague', type: 'attack', attr: 'CC', base: 40, damage: 2, qualities: [], extensions: { fiche: { equipmentId: 'dagger' } } };
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Myrmidia' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const allyEquipment = [{ id: 'sword', name: 'Épée', kind: 'weapon', category: 'melee' }, { id: 'dagger', name: 'Dague', kind: 'weapon', category: 'melee' }];
async function fixture() {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [
    actor('priest'), actor('ally', { initiative: 30, actions: [sword, dagger], equipment: allyEquipment })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const expiry = { phase: 'endOfTurn', round: 7, actorId: 'priest' };
const input = (more = {}) => ({ actorId: 'priest', targetIds: ['ally'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0 }, expiry,
  facts: { targets: { ally: { withinRange: true } } }, ...more });

test('Droiture : les quatre contrats portent un bonus d’arme Magique sur une arme désignée de la cible', () => {
  for (const id of DROITURE) {
    const contract = getDivineContract(id);
    assert.ok(contract, id);
    assert.notEqual(contract.status, 'manual', id);
    assert.equal(contract.effects.length, 1, id);
    const [effect] = contract.effects;
    assert.equal(effect.type, 'weapon-bonus', id);
    assert.equal(effect.magical, true, id);
    assert.equal(effect.designatedWeapon, true, id);
    assert.equal(effect.weaponOwner, 'target', id);
  }
});

test('Droiture : sans arme désignée, l’aperçu demande l’arme de la cible (libellé « cible »)', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(DROITURE[0], input());
  assert.equal(preview.ready, false);
  const need = preview.needsInput.find(row => row.field === 'facts.weapon.equipmentId');
  assert.ok(need, JSON.stringify(preview.needsInput));
  assert.match(need.label, /cible/i);
  assert.doesNotMatch(need.label, /prêtre/i);
});

test('Droiture : seule l’arme désignée de la cible devient Magique, puis l’effet expire ; Undo le retire', async () => {
  const store = await fixture();
  const preview = store.previewDivineExecution(DROITURE[0], input({ facts: { weapon: { equipmentId: 'sword' }, targets: { ally: { withinRange: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(DROITURE[0], { preview });
  assert.equal(result.ready, true, result.error);
  assert.equal(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'épée désignée Magique');
  assert.notEqual(magicWeaponNature(person(store, 'ally'), dagger).magical, true, 'la dague reste non magique');
  assert.notEqual(magicWeaponNature(person(store, 'priest'), sword).magical, true, 'le prêtre ne reçoit rien');
  await store.undo();
  assert.notEqual(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'Undo retire le bonus');
  await store.redo();
  assert.equal(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'Redo le rétablit');
  for (let i = 0; i < 14; i++) await store.nextTurn();
  assert.notEqual(magicWeaponNature(person(store, 'ally'), sword).magical, true, 'expiré après 6 Rounds');
});

test('Droiture : le formulaire propose les armes de la CIBLE et produit une entrée que le moteur accepte', async () => {
  const store = await fixture();
  const contract = getDivineContract(DROITURE[0]);
  const priest = person(store, 'priest'), ally = person(store, 'ally');
  const form = buildDivineForm(contract, { actor: priest, targets: [ally] });
  const field = form.effectFields.find(row => row.id === 'weapon');
  assert.ok(field, 'champ arme présent');
  assert.match(field.label, /cible/i);
  const values = (field.options || []).map(option => Array.isArray(option) ? option[0] : option.value ?? option.id);
  assert.ok(values.includes('sword') && values.includes('dagger'), JSON.stringify(field.options));
  const draft = { ...emptyDivineForm(), weaponId: 'sword', facts: { ally: { withinRange: true } } };
  const engineInput = toEngineInput(draft, { targetIds: ['ally'], contract, actor: priest });
  assert.equal(engineInput.facts.weapon.equipmentId, 'sword');
});

test('Non-régression : Marteau ardent et Lance de Myrmidia demandent toujours l’arme du prêtre', () => {
  const contracts = getAllDivineContracts().filter(row => row.type === 'miracle' && row.effects?.some(effect => effect.type === 'weapon-bonus' && effect.designatedWeapon === true));
  assert.ok(contracts.length >= 2);
  for (const contract of contracts) assert.notEqual(contract.effects.find(effect => effect.type === 'weapon-bonus').weaponOwner, 'target', contract.name);
});
