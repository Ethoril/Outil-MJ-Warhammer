import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { effectHandlers, validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { previewMagicProtection, magicWeaponQualities } from '../../../js/core/v5-magic-combat.js';

// L2 (tri du MJ du 17/11/2026, spec §8) : Hoarfrost Thews (Muscles givrés, PBtT p.50), Cœur du loup (PBtT p.50), Dent et griffe
// (LdB p.228), Fureur du soleil vertueux (Archives 3 p.55, Q16). Restent en rappel, faute d'un point d'accroche hors des fichiers
// autorisés (resolution.js, damage.js, store-action.js) : Vindicte vengeresse, ignore-ap, unconscious-duration, remove-bleeding.
const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const HOARFROST = idOf('Muscles givrés'), HEART = idOf('Cœur du loup'), TOOTH = idOf('Dent et griffe'), FURY = idOf('Fureur du soleil vertueux');
const VENGEFUL = idOf('Vindicte Vengeresse'), SWORD = idOf('Épée de justice'), BITE = idOf('Morsure de l\'hiver');

const actor = (id, cult, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const person = (store, id) => store.listParticipants().find(row => row.id === id);
async function fixture(cult, foe = {}) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally', 'foe'],
    participants: [actor('priest', cult, { extensions: { v5: { divine: { sin: 0 }, corruptionPoints: 0 } } }), actor('ally', cult, { initiative: 30 }), actor('foe', cult, { initiative: 20, camp: 'ennemi', kind: 'PNJ', ...foe })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return store;
}
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return { preview, result };
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const manual = id => getDivineContract(id).clauses.filter(clause => clause.mode === 'manual').map(clause => clause.id);
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;

describe('L2 — statuts et clauses', () => {
  test('Muscles givrés (Hoarfrost Thews) devient assistée, le climat reste un rappel', () => {
    const contract = getDivineContract(HOARFROST);
    assert.equal(contract.status, 'assisted');
    assert.equal(contract.effects.length, 1);
    assert.equal(contract.effects[0].type, 'grant-trait');
    assert.deepEqual(contract.effects[0].traits, ['Immunité (Froid)']);
    assert.equal(modeOf(HOARFROST, 'cold-immunity'), 'engine');
    assert.ok(manual(HOARFROST).includes('climate'));
  });

  test('clauses requalifiées : terror-and-skills, unarmed-damaging, missile ; l’Intimidation reste en rappel', () => {
    assert.equal(modeOf(HEART, 'terror-and-skills'), 'engine');
    assert.ok(manual(HEART).includes('intimidation'));
    assert.equal(modeOf(TOOTH, 'unarmed-damaging'), 'engine');
    assert.equal(modeOf(FURY, 'missile'), 'engine');
  });

  test('restent en rappel : Vindicte, ignore-ap, unconscious-duration, remove-bleeding (points d’accroche hors lot)', () => {
    assert.equal(getDivineContract(VENGEFUL).status, 'manual');
    assert.equal(modeOf(SWORD, 'ignore-ap'), 'manual');
    assert.equal(modeOf(SWORD, 'unconscious-duration'), 'manual');
    assert.equal(modeOf(BITE, 'remove-bleeding'), 'manual');
  });
});

describe('L2 — Muscles givrés : Immunité (Froid)', () => {
  test('le porteur ignore une attaque de froid, pas une attaque de feu, et les autres ne sont pas protégés', async () => {
    const store = await fixture('Ulric');
    await cast(store, HOARFROST);
    assert.ok(person(store, 'priest').traits.includes('Immunité (Froid)'));
    const cold = { cold: true, ranged: false, magical: false }, fire = { fire: true, ranged: false, magical: false };
    assert.equal(previewMagicProtection(person(store, 'priest'), 10, { nature: cold }).amount, 0);
    assert.equal(previewMagicProtection(person(store, 'priest'), 10, { nature: fire }).amount, 10);
    assert.equal(previewMagicProtection(person(store, 'foe'), 10, { nature: cold }).amount, 10);
    assert.equal(previewMagicProtection(person(store, 'ally'), 10, { nature: cold }).amount, 10);
  });

  test('la couche porte son échéance calendaire (Bonus de Sociabilité heures), et ↶ retire le Trait, ↷ le rend', async () => {
    const store = await fixture('Ulric');
    await cast(store, HOARFROST);
    const layer = layers(store, 'priest').find(row => row.traits);
    assert.equal(layer.deadline?.kind, 'campaign-time');
    assert.equal(layer.deadline.atSeconds - layer.clockAnchor.campaignSeconds, 6 * 3600);
    await store.undo();
    assert.ok(!person(store, 'priest').traits.includes('Immunité (Froid)'));
    assert.deepEqual(layers(store, 'priest'), []);
    await store.redo();
    assert.ok(person(store, 'priest').traits.includes('Immunité (Froid)'));
  });
});

describe('L2 — Cœur du loup : Terreur ignorée', () => {
  test('« fearTerrorImmunity » est un drapeau d’état spécial valide', () => {
    assert.equal(validateEffect({ type: 'special-state', fearTerrorImmunity: true }), null);
    assert.match(validateEffect({ type: 'special-state', fearTerrorImmunity: false }), /true/);
    assert.deepEqual(effectHandlers['special-state'].buildLayer({ type: 'special-state', fearTerrorImmunity: true }), { specialState: { fearTerrorImmunity: true } });
  });

  test('l’allié reçoit l’immunité à la Peur et à la Terreur, pas l’ennemi ; ↶ l’annule', async () => {
    const store = await fixture('Ulric');
    await cast(store, HEART, { targetIds: ['ally'], facts: { targets: { ally: { ally: true, withinRange: true } } } });
    assert.equal(person(store, 'ally').extensions.v5.specialStates?.fearTerrorImmunity, true);
    assert.equal(person(store, 'ally').extensions.v5.specialStates?.fearImmune, true);
    assert.notEqual(person(store, 'foe').extensions.v5.specialStates?.fearTerrorImmunity, true);
    await store.undo();
    assert.notEqual(person(store, 'ally').extensions.v5.specialStates?.fearTerrorImmunity, true);
    await store.redo();
    assert.equal(person(store, 'ally').extensions.v5.specialStates?.fearTerrorImmunity, true);
  });
});

describe('L2 — Dent et griffe : mains nues plus Inoffensives', () => {
  const unarmed = () => ({ id: 'unarmed', type: 'attack', note: 'Mains nues', qualities: [{ id: 'inoffensive' }] });
  const sword = () => ({ id: 'sword', type: 'attack', note: 'Épée', qualities: [{ id: 'inoffensive' }] });
  const ids = qualities => qualities.map(row => row.id);

  test('sans la prière, les mains nues restent Inoffensives (CA7)', async () => {
    const store = await fixture('Taal');
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'priest'), unarmed(), false)), ['inoffensive']);
  });

  test('sous Dent et griffe, les mains nues perdent Inoffensive, une arme qui la porte la garde', async () => {
    const store = await fixture('Taal');
    await cast(store, TOOTH);
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'priest'), unarmed(), false)), []);
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'priest'), sword(), false)), ['inoffensive']);
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'ally'), unarmed(), false)), ['inoffensive']);
  });

  test('le champ removeQualities est lu et validé ; absent, rien ne change', () => {
    assert.equal(validateEffect({ type: 'weapon-bonus', unarmedOnly: true, removeQualities: ['undamaging'] }), null);
    assert.match(validateEffect({ type: 'weapon-bonus', removeQualities: 'undamaging' }), /removeQualities/);
    const built = effectHandlers['weapon-bonus'].buildLayer({ type: 'weapon-bonus', magical: true }, { contract: { name: 'X' } });
    assert.equal('removeQualities' in built.weaponBonus, false);
  });

  test('↶ rend l’Inoffensive, ↷ la retire de nouveau', async () => {
    const store = await fixture('Taal');
    await cast(store, TOOTH);
    await store.undo();
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'priest'), unarmed(), false)), ['inoffensive']);
    await store.redo();
    assert.deepEqual(ids(magicWeaponQualities(person(store, 'priest'), unarmed(), false)), []);
  });
});

describe('L2 — Fureur du soleil vertueux : projectile Dégâts +2 (Q16)', () => {
  const missile = getDivineContract(FURY).effects.find(effect => effect.type === 'ordinary-damage');
  test('le contrat porte un effet de dégâts ordinaires fixes de 2, BE et PA applicables', () => {
    assert.ok(missile);
    assert.equal(missile.fixed, 2);
    assert.notEqual(missile.ignoreAp, true);
    assert.notEqual(missile.ignoreBe, true);
  });

  test('Dégâts +2 réduits par le Bonus d’Endurance de la cible ; Aveuglé toujours posé', async () => {
    const store = await fixture('Solkan', { caracs: { CC: 40, CT: 40, F: 30, E: 0, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 } });
    await cast(store, FURY, { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } }, locationChoices: { foe: 'body' } });
    assert.equal(person(store, 'foe').hp, 18, 'BE 0 : 2 Dégâts');
    assert.ok(person(store, 'foe').states.some(row => /aveugl|blind/i.test(`${row.key} ${row.name}`)));
  });

  test('un BE de 1 ramène les Dégâts à 1 ; ↶ rend les PV', async () => {
    const store = await fixture('Solkan', { caracs: { CC: 40, CT: 40, F: 30, E: 10, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 } });
    await cast(store, FURY, { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } }, locationChoices: { foe: 'body' } });
    assert.equal(person(store, 'foe').hp, 19, 'BE 1 : 1 Dégât');
    await store.undo();
    assert.equal(person(store, 'foe').hp, 20);
  });
});
