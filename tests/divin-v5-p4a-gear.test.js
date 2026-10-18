import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createGameClock } from '../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts, finalizeDivineState } from '../js/core/v5-divine-store.js';
import registry from '../js/data/v5-divine-contracts.json' with { type: 'json' };
import { effectHandlers, validateEffect, effectNeeds } from '../js/core/v5-divine-effect-handlers.js';
import { projectDivineGear } from '../js/core/v5-divine-effects-gear.js';
import { resolveV5ConditionTestContext } from '../js/core/v5-test-context.js';
import { magicWeaponBonus, magicWeaponHitConditions, magicWeaponNature, magicGrantedActions } from '../js/core/v5-magic-combat.js';
import { acquiredV5Talents } from '../js/core/v5-talents.js';
import { getReferenceCatalogue } from '../js/core/reference-catalog.js';

// P4a T4 : Traits, États spéciaux, actions, Talents, bonus d'arme et modificateurs de Test des miracles divins.
const clone = value => structuredClone(value);
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.name === name).id;
const MASK = idOf('Masque mortuaire'), GRACE = idOf('Grâce de Ranald'), ANCHORITE = idOf('Endurance de l’anachorète'), BEACON = idOf('Flambeau de Vertu'),
  HAMMER = idOf('Marteau ardent de Sigmar'), INSTINCTS = idOf('Instincts animaux'), STAG = idOf('Bondissant comme un cerf'), TOOTH = idOf('Dent et griffe'),
  WINTER = idOf("Morsure de l'hiver"),OWL = idOf('Sagesse de la chouette'), SWORD = idOf('Épée de justice');
const { schemaVersion: _s, sourceFingerprint: _f, ...base } = getDivineContract(MASK);
const registered = [];
// Contrat d'essai pour les types sans miracle livré (test-modifier) : copie d'un contrat canonique, seuls paramètres et effets changent.
function synthetic(key, effects) {
  const id = `divine:miracle:morr:test-gear-${key}`;
  const contract = { ...clone(base), id, name: `Essai ${key}`, catalogueName: `Essai ${key}`, canonicalName: `Test gear ${key}`, status: 'assisted',
    params: { range: { kind: 'self' }, targets: { kind: 'self' }, duration: { kind: 'fixed', value: 6, unit: 'rounds' } },
    effects: effects.map(effect => ({ ...effect, duration: { value: 6, unit: 'rounds' } })), targetRules: [],
    clauses: [{ id: 'effect', mode: 'engine', text: 'Effet moteur.', sourceRef: 'test' }], needsInput: [] };
  registry.contracts.push(contract); registered.push(id);
  return id;
}
after(() => { registry.contracts = registry.contracts.filter(row => !registered.includes(row.id)); });
const MODIFIER = synthetic('modifier', [{ type: 'test-modifier', modifiers: { 'Tous les Tests': 1 } }]);

const actor = (id, cult = 'Sigmar', extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: cult }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: cult }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: ['Vigilant'], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 } } }, ...extra });
const stateOf = store => { const value = JSON.parse(store.getFullJSON()); delete value.exportedAt; return value; };
const person = (store, id) => store.listParticipants().find(row => row.id === id);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
async function fixture({ cult = 'Sigmar', priest = {}, ally = {} } = {}) {
  const persistence = memory();
  const store = createStore({ persistence, storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: ['priest', 'ally'], participants: [actor('priest', cult, priest), actor('ally', cult, { initiative: 30, ...ally })] },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  store.persistence = persistence;
  return store;
}
const expiry = { phase: 'endOfTurn', round: 6, actorId: 'priest' };
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 }, expiry, ...more });
const touching = (more = {}) => input({ targetIds: ['ally'], facts: { targets: { ally: { withinRange: true } } }, ...more });
async function cast(store, contractId, more, build = input) {
  const preview = store.previewDivineExecution(contractId, build(more));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
const layers = (store, id) => person(store, id).extensions.v5.divineEffects || [];
const toRoundEnd = async store => { for (let i = 0; i < 12; i++) await store.nextTurn(); };
const hammerAction = { id: 'hammer-attack', note: 'Marteau de guerre', type: 'attack', attr: 'CC', base: 40, damage: 4, extensions: { fiche: { equipmentId: 'hammer' } } };
const axeAction = { id: 'axe-attack', note: 'Hache', type: 'attack', attr: 'CC', base: 40, damage: 4, extensions: { fiche: { equipmentId: 'axe' } } };

test('registre : les six types T4 ont un gestionnaire et refusent un contrat mal formé', () => {
  for (const type of ['grant-trait', 'special-state', 'grant-actions', 'grant-talent', 'weapon-bonus', 'test-modifier']) assert.ok(effectHandlers[type], type);
  assert.match(validateEffect({ type: 'grant-trait', traits: [] }), /traits/);
  assert.match(validateEffect({ type: 'special-state', fearImmune: false }), /true/);
  assert.match(validateEffect({ type: 'special-state', invented: true }), /special-state/);
  assert.match(validateEffect({ type: 'grant-actions', actions: [{ id: 'x' }] }), /actions/);
  assert.match(validateEffect({ type: 'grant-talent', talents: [{ id: 'talent-catfall', rank: 0 }] }), /talents/);
  assert.match(validateEffect({ type: 'weapon-bonus' }), /au moins un bonus/);
  assert.match(validateEffect({ type: 'test-modifier', modifiers: { 'Prière (Sigmar)': 1 } }), /ambiguë/);
  assert.match(validateEffect({ type: 'test-modifier', modifiers: { all: 1.5 } }), /entier/);
  assert.equal(validateEffect({ type: 'test-modifier', modifiers: { 'Tous les Tests': 1 } }), null);
  assert.deepEqual(effectNeeds({ type: 'weapon-bonus', magical: true, designatedWeapon: true }, { input: {} }).map(row => row.field), ['facts.weapon.equipmentId']);
  assert.deepEqual(effectNeeds({ type: 'weapon-bonus', magical: true }, { input: {} }), []);
});

test('Masque mortuaire : Peur (1) projeté dans temporaryTraits et l’alias traits, retiré à l’expiration', async () => {
  const store = await fixture({ cult: 'Morr' });
  assert.equal(getDivineContract(MASK).status, 'assisted');
  const result = await cast(store, MASK);
  assert.ok(result.receipt.reminders.some(text => /morts-vivants ne sont pas immunisés/.test(text)), 'l’immunité des morts-vivants reste un rappel');
  let priest = person(store, 'priest');
  assert.deepEqual(priest.traits, ['Vigilant', 'Peur (1)']);
  assert.deepEqual(priest.extensions.v5.temporaryTraits, ['Peur (1)']);
  assert.deepEqual(priest.extensions.v5.baseTraits, ['Vigilant']);
  await toRoundEnd(store);
  priest = person(store, 'priest');
  assert.deepEqual(priest.traits, ['Vigilant']);
  assert.deepEqual(priest.extensions.v5.temporaryTraits, []);
  assert.equal(priest.extensions.v5.divineTraits, undefined);
  assert.equal(layers(store, 'priest').length, 0);
});

test('Masque mortuaire : fin par le MJ, Undo, Redo et rechargement gardent l’alias traits cohérent', async () => {
  const store = await fixture({ cult: 'Morr' });
  const result = await cast(store, MASK);
  const executionId = result.receipt.executionId;
  await store.endDivinePrayer(executionId, { reason: 'Fin décidée par le MJ' });
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant']);
  await store.undo();
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant', 'Peur (1)']);
  await store.redo();
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant']);
  await store.undo();
  const reload = createStore({ persistence: store.persistence, storage: null }); await reload.ready;
  const priest = person(reload, 'priest');
  assert.deepEqual(priest.traits, ['Vigilant', 'Peur (1)']);
  assert.deepEqual(priest.traits, [...new Set([...priest.extensions.v5.baseTraits, ...priest.extensions.v5.temporaryTraits])]);
});

test('Trait divin et trait de sort identiques : cumul refusé (DIV-05) ; un trait différent passe', async () => {
  const store = await fixture({ cult: 'Morr', priest: { extensions: { v5: { divine: { sin: 0 }, spellEffects: [{ id: 'spell-1', spellName: 'Sort', traits: ['Peur (1)'] }] } } } });
  const blocked = store.previewDivineExecution(MASK, input());
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /DIV-05/);
  const other = await fixture({ cult: 'Morr', priest: { extensions: { v5: { divine: { sin: 0 }, spellEffects: [{ id: 'spell-1', spellName: 'Sort', traits: ['Immatériel'] }] } } } });
  assert.equal(other.previewDivineExecution(MASK, input()).ready, true);
});

test('Grâce de Ranald : Ag +10, étiquette de talent et Chute féline injecté ; Discrétion reste un rappel', async () => {
  const store = await fixture({ cult: 'Ranald' });
  const preview = store.previewDivineExecution(GRACE, touching({ facts: { targets: { ally: { withinTouch: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(GRACE, { preview });
  assert.ok(result.receipt.reminders.some(text => /Discrétion/.test(text)));
  const ally = person(store, 'ally');
  assert.equal(ally.caracs.Ag, 50);
  assert.deepEqual(layers(store, 'ally').find(row => row.grantedTalents).grantedTalents, [{ id: 'talent-catfall', rank: 1, name: 'Chute féline' }]);
  assert.ok(acquiredV5Talents(ally).some(row => row.talentId === 'talent-catfall' && row.rank === 1), 'le talent à contrat mécanique est réellement acquis');
  await toRoundEnd(store);
  const after = person(store, 'ally');
  assert.equal(after.caracs.Ag, 40);
  assert.ok(!acquiredV5Talents(after).some(row => row.talentId === 'talent-catfall'));
  assert.ok(!after.talents.some(row => row.divineEffectId));
});

test('Bondissant comme un cerf : M +1 et Jambes solides le temps de la durée', async () => {
  const store = await fixture({ cult: 'Taal' });
  await cast(store, STAG);
  assert.equal(person(store, 'priest').caracs.M, 5);
  assert.equal(person(store, 'priest').movement, 5);
  assert.ok(acquiredV5Talents(person(store, 'priest')).some(row => row.talentId === 'talent-strong-legs'));
  await toRoundEnd(store);
  assert.equal(person(store, 'priest').caracs.M, 4);
  assert.equal(person(store, 'priest').movement, 4);
  assert.ok(!acquiredV5Talents(person(store, 'priest')).some(row => row.talentId === 'talent-strong-legs'));
});

test('Sagesse de la chouette : Int +20, étiquettes de talents, Menaçant injecté, non-cumul avec un sort (DIV-05)', async () => {
  const store = await fixture({ cult: 'Verena' });
  await cast(store, OWL);
  const priest = person(store, 'priest');
  assert.equal(priest.caracs.Int, 70);
  const labels = layers(store, 'priest').find(row => row.grantedTalents).grantedTalents.map(row => row.id);
  assert.deepEqual(labels, ['talent-acute-sense', 'talent-menacing', 'talent-night-vision']);
  const owned = acquiredV5Talents(priest).map(row => row.talentId);
  assert.ok(owned.includes('talent-menacing'));
  assert.ok(!owned.includes('talent-acute-sense') && !owned.includes('talent-night-vision'), 'seuls les talents à contrat mécanique sont injectés');
  const stacked = await fixture({ cult: 'Verena', priest: { extensions: { v5: { divine: { sin: 0 }, spellEffects: [{ id: 'spell-int', spellName: 'Sort', statModifiers: { Int: 10 } }] } } } });
  const blocked = stacked.previewDivineExecution(OWL, input());
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /DIV-05/);
});

test('un talent déjà possédé au même rang n’est pas dupliqué par l’injection', async () => {
  const store = await fixture({ cult: 'Verena', priest: { talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Verena' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Verena' }, { id: 'talent-menacing', status: 'resolved', rank: 1 }] } });
  await cast(store, OWL);
  assert.equal(person(store, 'priest').talents.filter(row => row.id === 'talent-menacing').length, 1);
  await toRoundEnd(store);
  assert.equal(person(store, 'priest').talents.filter(row => row.id === 'talent-menacing').length, 1, 'le talent propre du personnage survit à la fin de l’effet');
});

test('Instincts animaux : étiquette Sens aiguisé sur une durée en heures, non injecté, retiré au terme', async () => {
  const store = await fixture({ cult: 'Taal' });
  const preview = store.previewDivineExecution(INSTINCTS, touching({ expiry: undefined }));
  assert.equal(preview.ready, true, preview.error);
  await store.applyDivineExecution(INSTINCTS, { preview });
  const [layer] = layers(store, 'ally');
  assert.deepEqual(layer.deadline, { kind: 'campaign-time', atSeconds: 6 * 3600 });
  assert.deepEqual(layer.grantedTalents, [{ id: 'talent-acute-sense', rank: 1, name: 'Sens aiguisé' }]);
  assert.deepEqual(person(store, 'ally').talents.filter(row => row.divineEffectId), []);
  assert.equal((await store.advanceCampaignTime({ seconds: 6 * 3600, reason: 'Fin de la durée' })).status, 'applied');
  assert.equal(layers(store, 'ally').length, 0);
});

test('Marteau ardent : désignation de l’arme requise, bonus posé dans weaponBonuses, lu par le calcul de dégâts, retiré à l’expiration', async () => {
  const store = await fixture({ priest: { actions: [hammerAction, axeAction] } });
  const missing = store.previewDivineExecution(HAMMER, input());
  assert.equal(missing.ready, false);
  assert.ok(missing.needsInput.some(row => row.field === 'facts.weapon.equipmentId'), JSON.stringify(missing.needsInput));
  const preview = store.previewDivineExecution(HAMMER, input({ facts: { weapon: { equipmentId: 'hammer', classConfirmed: true } } }));
  assert.equal(preview.ready, true, preview.error);
  const result = await store.applyDivineExecution(HAMMER, { preview });
  assert.deepEqual(result.receipt.effectReceipts.find(row => row.type === 'weapon-bonus').result, { damage: 6, equipmentId: 'hammer', classConfirmed: true });
  const priest = person(store, 'priest');
  assert.deepEqual(priest.extensions.v5.weaponBonuses, [{ effectId: layers(store, 'priest')[0].id, divineEffectId: layers(store, 'priest')[0].id, spellName: 'Marteau ardent de Sigmar', magical: true,
    damage: 6, hitConditions: ['Enflammé'], weaponClass: 'marteau de guerre', equipmentId: 'hammer', classConfirmed: true }]);
  assert.equal(magicWeaponBonus(priest, hammerAction, false, 0), 6, 'Bonus de Sociabilité ajouté aux dégâts du marteau');
  assert.equal(magicWeaponBonus(priest, axeAction, false, 0), 0, 'seule l’arme désignée est concernée');
  assert.deepEqual(magicWeaponHitConditions(priest, hammerAction, false, 1).map(row => row.name), ['Enflammé']);
  assert.equal(magicWeaponNature(priest, hammerAction, false).magical, true);
  await toRoundEnd(store);
  assert.equal(person(store, 'priest').extensions.v5.weaponBonuses, undefined);
  assert.equal(magicWeaponBonus(person(store, 'priest'), hammerAction, false, 0), 0);
});

test('bonus d’arme divin et magique sur la même arme : cumul refusé (DIV-05)', async () => {
  const spell = { id: 'spell-weapon', spellName: 'Sort', weaponBonus: { damage: 2, equipmentId: 'hammer' } };
  const store = await fixture({ priest: { actions: [hammerAction], extensions: { v5: { divine: { sin: 0 }, spellEffects: [spell] } } } });
  const blocked = store.previewDivineExecution(HAMMER, input({ facts: { weapon: { equipmentId: 'hammer' } } }));
  assert.equal(blocked.ready, false);
  assert.match(blocked.error, /DIV-05/);
  const elsewhere = await fixture({ priest: { actions: [hammerAction], extensions: { v5: { divine: { sin: 0 }, spellEffects: [{ ...spell, weaponBonus: { damage: 2, equipmentId: 'sword' } }] } } } });
  assert.equal(elsewhere.previewDivineExecution(HAMMER, input({ facts: { weapon: { equipmentId: 'hammer' } } })).ready, true);
});

test('Morsure de l’hiver : dégâts +DR sur la hache désignée, Exténué sur touche, Magique', async () => {
  const store = await fixture({ cult: 'Ulric', priest: { actions: [axeAction, hammerAction] } });
  await cast(store, WINTER, { facts: { weapon: { equipmentId: 'axe' } } });
  const priest = person(store, 'priest');
  assert.equal(magicWeaponBonus(priest, axeAction, false, 0), 2, 'DR du test de Prière (roll 45 contre 60)');
  assert.deepEqual(magicWeaponHitConditions(priest, axeAction, false, 1).map(row => row.name), ['Exténué']);
  assert.equal(magicWeaponNature(priest, axeAction, false).magical, true);
  assert.equal(magicWeaponBonus(priest, hammerAction, false, 0), 0);
  assert.ok(getDivineContract(WINTER).clauses.filter(row => row.mode !== 'engine').some(row => /Hémorragique/.test(row.text)), 'Hémorragique reste un rappel');
});

test('Dent et griffe : Morsure et Arme matérialisées, bonus Magique en mêlée seulement, retirés par la fin de prière, Undo', async () => {
  const store = await fixture({ cult: 'Taal', priest: { caracs: { CC: 40, CT: 40, F: 40, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 }, actions: [{ ...hammerAction }] } });
  const result = await cast(store, TOOTH);
  let priest = person(store, 'priest');
  const gained = priest.actions.filter(row => row.extensions?.v5?.divineEffectId);
  assert.deepEqual(gained.map(row => [row.note, row.damageFormula, row.attr, row.type]), [['Morsure', 'BF+3', 'CC', 'attack'], ['Arme', 'BF+4', 'CC', 'attack']]);
  assert.ok(gained.every(row => row.base === 40 && row.id.startsWith('divine-action:')));
  assert.equal(priest.actions.length, 3, 'l’action de fiche est conservée');
  assert.equal(magicWeaponNature(priest, gained[0], false).magical, true);
  assert.deepEqual(magicWeaponNature(priest, gained[0], true), {}, 'aucun bonus Magique au tir');
  assert.equal(magicWeaponNature(priest, hammerAction, false).magical, true, 'toutes les attaques de mêlée sont Magiques');
  await store.endDivinePrayer(result.receipt.executionId, { reason: 'Fin décidée par le MJ' });
  priest = person(store, 'priest');
  assert.deepEqual(priest.actions.map(row => row.id), ['hammer-attack']);
  assert.equal(priest.extensions.v5.weaponBonuses, undefined);
  await store.undo();
  assert.equal(person(store, 'priest').actions.filter(row => row.extensions?.v5?.divineEffectId).length, 2);
  await store.redo();
  assert.equal(person(store, 'priest').actions.length, 1);
  await store.undo();
  const reload = createStore({ persistence: store.persistence, storage: null }); await reload.ready;
  assert.deepEqual(person(reload, 'priest').actions.filter(row => row.extensions?.v5?.divineEffectId).map(row => row.note), ['Morsure', 'Arme']);
});

test('Dent et griffe : la projection ne duplique pas les actions et expire avec la durée', async () => {
  const store = await fixture({ cult: 'Taal' });
  await cast(store, TOOTH);
  const copy = clone(person(store, 'priest'));
  projectDivineGear(copy); projectDivineGear(copy);
  assert.equal(copy.actions.length, 2);
  await toRoundEnd(store);
  assert.deepEqual(person(store, 'priest').actions, []);
  assert.equal(magicGrantedActions(person(store, 'priest')).length, 0);
});

test('Flambeau de Vertu : Peur (1) sur le prêtre seul ; fearImmune réussit un test de Peur mais pas de Terreur', async () => {
  const store = await fixture();
  const beacon = getDivineContract(BEACON);
  assert.equal(beacon.status, 'assisted');
  assert.deepEqual(beacon.effects.map(row => row.type), ['remove-condition', 'special-state', 'grant-trait']);
  await cast(store, BEACON, { targetIds: ['priest'], facts: { targets: { priest: { ally: true, seesPriest: true } } } });
  const priest = person(store, 'priest');
  assert.equal(priest.extensions.v5.specialStates.fearImmune, true);
  assert.deepEqual(priest.traits, ['Vigilant', 'Peur (1)']);
  const calm = getReferenceCatalogue().skills.find(row => row.nom === 'Calme').id;
  const calmTest = kind => ({ resolutionId: 'calm-' + kind, actorId: 'priest', action: { type: 'skill', base: 60, attr: 'FM', extensions: { fiche: { skillId: calm } } },
    roll: 91, v5: { kind: 'test', context: { psychologyKind: kind } } });
  assert.equal(store.previewResolution(calmTest('fear')).success, true, 'la Peur est ignorée');
  assert.equal(store.previewResolution(calmTest('terror')).success, false, 'la Terreur ne l’est pas');
  const control = await fixture();
  assert.equal(control.previewResolution(calmTest('fear')).success, false, 'sans le miracle, le Test échoue');
  await toRoundEnd(store);
  assert.equal(store.previewResolution(calmTest('fear')).success, false);
  assert.deepEqual(person(store, 'priest').traits, ['Vigilant']);
});

test('Endurance de l’anachorète : Impassible et aucun malus d’État tant que dure le miracle, les États restent présents', async () => {
  const states = [{ name: 'Sonné', level: 2 }, { name: 'Exténué', level: 1 }];
  const store = await fixture({ cult: 'Shallya', ally: { states: structuredClone(states) } });
  const attack = { resolutionId: 'hit', actorId: 'ally', targetId: 'priest', action: { type: 'attack', base: 60, attr: 'CC', damage: 4 }, roll: 24,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' } };
  assert.equal(store.previewResolution({ ...attack, resolutionId: 'before' }).score.statePenalty, 2, 'avant le miracle : plus forte pénalité d’État');
  const preview = store.previewDivineExecution(ANCHORITE, touching({ facts: { targets: { ally: { withinRange: true } } } }));
  assert.equal(preview.ready, true, preview.error);
  await store.applyDivineExecution(ANCHORITE, { preview });
  const ally = person(store, 'ally');
  assert.equal(ally.extensions.v5.specialStates.ignoreConditionPenalties, true);
  assert.deepEqual(ally.traits, ['Vigilant', 'Impassible']);
  assert.equal(ally.states.length, 2, 'les États restent présents');
  const resolved = store.previewResolution({ ...attack, resolutionId: 'during' });
  assert.equal(resolved.score.statePenalty, 0);
  assert.ok(!resolved.test.details.modifiers.some(row => row.id === 'conditions'));
  await toRoundEnd(store);
  assert.equal(store.previewResolution({ ...attack, resolutionId: 'after' }).score.statePenalty, 2, 'à l’expiration, les malus reviennent');
  assert.deepEqual(person(store, 'ally').traits, ['Vigilant']);
});

test('ignoreConditionPenalties : contexte de Test d’État, malus et Désavantages ignorés, restrictions gardées', () => {
  const ignoring = states => ({ id: 'a', states, extensions: { v5: { specialStates: { ignoreConditionPenalties: true } } } });
  const plain = states => ({ id: 'a', states });
  const stated = [{ name: 'Sonné', level: 2 }, { name: 'À terre', level: 1 }, { name: 'Aveuglé', level: 1 }, { name: 'Souillé', level: 1 }];
  const base = resolveV5ConditionTestContext(plain(stated), { characteristic: 'Soc', isAction: true, involvesMovement: true, requiresSight: false, reliesOnSight: true });
  assert.ok(base.slModifiers.length || base.needsInput.length, 'sans le miracle, les pénalités s’appliquent ou demandent un arbitrage');
  const result = resolveV5ConditionTestContext(ignoring(stated), { characteristic: 'Soc', isAction: true, requiresSight: false });
  assert.equal(result.ready, true, JSON.stringify(result.needsInput));
  assert.deepEqual(result.slModifiers, []);
  assert.deepEqual(result.disadvantageSources, []);
  assert.equal(result.ignoredPenaltySources[0].id, 'anchorite-endurance:conditions');
  for (const name of ['Inconscient', 'Surpris']) {
    const blocked = resolveV5ConditionTestContext(ignoring([{ name }]), { characteristic: 'Soc', isAction: true });
    assert.equal(blocked.ready, false);
    assert.match(blocked.restrictions.join(' '), new RegExp(name));
  }
  const sight = resolveV5ConditionTestContext(ignoring([{ name: 'Aveuglé', level: 1 }]), { characteristic: 'Soc', isAction: true, requiresSight: true });
  assert.match(sight.restrictions.join(' '), /vue/, 'la vue exigée reste une restriction');
  const control = resolveV5ConditionTestContext(plain([{ name: 'Sonné', level: 2 }]), { characteristic: 'Soc', isAction: true });
  assert.deepEqual(control.slModifiers.map(row => row.amount), [-2], 'sans drapeau, Sonné pénalise toujours');
});

test('Anachorète en combat : restrictions Inconscient et Surpris conservées dans la résolution d’attaque', async () => {
  const store = await fixture({ cult: 'Shallya', ally: { states: [{ name: 'Sonné', level: 2 }, { name: 'À terre', level: 1 }] } });
  const preview = store.previewDivineExecution(ANCHORITE, touching({ facts: { targets: { ally: { withinRange: true } } } }));
  await store.applyDivineExecution(ANCHORITE, { preview });
  const attack = { resolutionId: 'hit', actorId: 'ally', targetId: 'priest', action: { type: 'attack', base: 60, attr: 'CC', damage: 4 }, roll: 24,
    defense: { base: 30, roll: 82, v5: { kind: 'melee' } }, v5: { kind: 'melee' } };
  const resolved = store.previewResolution(attack);
  assert.equal(resolved.score.statePenalty, 0);
  assert.ok(!resolved.test.details.modifiers.some(row => row.id === 'conditions'));
  await store.acquireConditions('ally', [{ name: 'Inconscient', level: 1 }], { resolutionId: 'faint' });
  const faint = store.previewResolution({ ...attack, resolutionId: 'hit-2' });
  assert.ok([...(faint.restrictions || []), ...(faint.unresolved || [])].some(text => /Inconscient/.test(text)), JSON.stringify([faint.restrictions, faint.unresolved]));
});

test('test-modifier : modificateur de Test divin posé sur la couche et lu par le recalcul', async () => {
  const store = await fixture({ cult: 'Morr' });
  await cast(store, MODIFIER);
  const priest = person(store, 'priest');
  assert.deepEqual(layers(store, 'priest')[0].testModifiers, { 'Tous les Tests': 1 });
  assert.equal(priest.extensions.v5.testModifiers['Tous les Tests'], 1);
  await toRoundEnd(store);
  assert.deepEqual(person(store, 'priest').extensions.v5.testModifiers, {});
});

test('garde DIV-05 directe : traits et bonus d’arme identiques refusés, distincts acceptés', () => {
  const state = (divine, spell) => ({ combat: { participants: [{ id: 'p', zone: 'active', extensions: { v5: { divineEffects: [{ id: 'd', ...divine }], spellEffects: [{ id: 's', ...spell }] } } }] } });
  assert.throws(() => finalizeDivineState(state({ traits: ['Peur (1)'] }, { traits: ['Peur (1)'] }), state({ traits: ['Peur (1)'] }, { traits: ['Peur (1)'] })), /Trait divin et magique/);
  assert.doesNotThrow(() => finalizeDivineState(state({ traits: ['Peur (1)'] }, { traits: ['Immatériel'] }), state({ traits: ['Peur (1)'] }, { traits: ['Immatériel'] })));
  const weapon = (divine, spell) => state({ weaponBonus: divine }, { weaponBonus: spell });
  assert.throws(() => finalizeDivineState(weapon({ damage: 3 }, { damage: 1 }), weapon({ damage: 3 }, { damage: 1 })), /bonus d’arme/);
  assert.throws(() => finalizeDivineState(weapon({ damage: 3, equipmentId: 'a' }, { damage: 1 }), weapon({ damage: 3, equipmentId: 'a' }, { damage: 1 })), /bonus d’arme/);
  assert.doesNotThrow(() => finalizeDivineState(weapon({ damage: 3, equipmentId: 'a' }, { damage: 1, equipmentId: 'b' }), weapon({ damage: 3, equipmentId: 'a' }, { damage: 1, equipmentId: 'b' })));
  assert.doesNotThrow(() => finalizeDivineState(weapon({ magical: true }, { magical: true }), weapon({ magical: true }, { magical: true })));
});

test('Épée de justice reste manuelle : aucun effet appliqué', () => {
  assert.equal(getDivineContract(SWORD).status, 'manual');
});

test('statuts P4a T4 : dix miracles assistés', () => {
  for (const id of [MASK, GRACE, ANCHORITE, BEACON, HAMMER, INSTINCTS, STAG, TOOTH, WINTER, OWL]) {
    const contract = getDivineContract(id);
    assert.ok(['assisted', 'implemented'].includes(contract.status), contract.name);
    assert.ok(contract.clauses.some(row => row.mode === 'engine'), contract.name);
  }
});
