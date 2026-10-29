import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createCombatEngine } from '../js/core/combat.js';
import { previewResolution } from '../js/core/resolution.js';
import { aggregateTalents } from '../js/core/reference-catalog.js';
import { getDivineContract } from '../js/core/v5-divine-store.js';
import { buildExpiry } from '../js/ui/v5-divine-form-model.js';

const clone = value => structuredClone(value);
const HOWL = 'divine:miracle:ulric:howl-of-the-wolf';
const person = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: id === 'a' ? 'pj' : 'ennemi', zone: 'active', initiative: 60,
  hp: 40, maxHp: 40, caracs: { CC: 60, CT: 60, F: 40, E: 30, I: 50, Ag: 40, Dex: 40, Int: 60, FM: 60, Soc: 60, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', carac: 'Soc', total: 60, status: 'resolved' },
    { name: 'Langue (Magick)', carac: 'Int', total: 70, status: 'resolved' }],
  talents: [], prayers: [], spells: [{ name: 'Carreau', status: 'resolved' }],
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { hasMomentum: false, divine: { sin: 0 }, magic: { reserve: { type: 'winds', sl: 0 } } } },
  ...extra
});
function memoryPersistence() {
  let saved = null;
  return {
    async load() { return saved && clone(saved); },
    async saveAtomic({ state }) { saved = clone(state); return { ok: true }; },
    read() { return saved && clone(saved); }
  };
}
async function fixture({ actor = person('a'), target = person('b'), order = ['a', 'b'], persistence = memoryPersistence() } = {}) {
  const store = createStore({ persistence, storage: null });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [],
    extensions: { v5: { combatId: 'f2-b-characterization', turnIndex: 1 } },
    combat: { round: 1, currentActorId: 'a', order, participants: [actor, target] } });
  return { store, persistence };
}
const strike = (id, extra = {}) => ({ resolutionId: id, actorId: 'a', targetId: 'b', roll: 25,
  action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, defense: { base: 35, roll: 80, v5: { kind: 'melee' } },
  v5: { kind: 'melee' }, ...extra });
const modifier = (test, id) => test.details.modifiers.find(row => row.id === id)?.amount;

// Characterizes the current actor/defender path before shared combat-test changes.
test('F2-B caractérisation — pénalité main secondaire attaque, Talents et défense monté sont séparés par rôle', () => {
  const actor = person('a'), target = person('b');
  const raw = { actor, target, action: { type: 'attack', attr: 'CC', base: 60, damage: 5 }, roll: 25,
    defense: { base: 35, roll: 80, label: 'Esquive', v5: { kind: 'test', context: { penalties: { mounted: -2 } } } },
    v5: { kind: 'melee', context: { penalties: { offHand: -2 } } } };
  const ordinary = previewResolution(raw);
  assert.equal(modifier(ordinary.test, 'penalty:offHand'), -2);
  assert.equal(modifier(ordinary.defenderTest, 'penalty:offHand'), undefined);
  assert.equal(modifier(ordinary.defenderTest, 'penalty:mounted'), -2, 'une pénalité de défense reste attachée à son Test défensif');

  const ambidextrous = previewResolution({ ...raw, actor: { ...actor, talents: [{ id: 'talent-ambidextrous', status: 'resolved', rank: 1 }] } });
  assert.equal(modifier(ambidextrous.test, 'penalty:offHand'), 0, 'Ambidextre supprime la pénalité de la main secondaire');
  assert.equal(modifier(ambidextrous.defenderTest, 'penalty:mounted'), -2, 'le Talent d’attaque ne supprime pas la pénalité défensive');
});

test('F2-B caractérisation — aimed existant ne modifie que le Talent Tir précis', () => {
  const actor = person('a', { talents: aggregateTalents([{ nom: 'Tir précis' }]).items });
  const raw = { actor, target: person('b'), action: { type: 'attack', attr: 'CT', base: 60, damage: 5 }, roll: 25,
    v5: { kind: 'ranged', aimed: false } };
  const ordinary = previewResolution(raw), aimed = previewResolution({ ...raw, v5: { kind: 'ranged', aimed: true } });
  assert.equal(ordinary.test.sl, aimed.test.sl, 'aimed ne donne pas encore le +1 DR général de Visée');
  assert.equal(ordinary.damage.talentDamage, 1);
  assert.equal(aimed.damage.talentDamage, 2, 'aimed est actuellement l’entrée du bonus de dégât du Talent');
  const noTalent = previewResolution({ ...raw, actor: person('a') });
  assert.equal(noTalent.damage.finalDamage, previewResolution({ ...raw, actor: person('a'), v5: { kind: 'ranged', aimed: true } }).damage.finalDamage,
    'le drapeau seul ne donne pas de bonus général de Visée');
});

test('F2-B caractérisation — cible sans défense choisit un jet critique et sa localisation', () => {
  const preview = previewResolution({ actor: person('a'), target: person('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
    roll: 11, criticalRolls: { location: 34, effect: 20 }, v5: { kind: 'melee', context: { targetHelpless: true } } });
  assert.deepEqual(preview.unresolved, [], 'l’attaque critique décrite est complète, pas un aperçu bloqué');
  assert.equal(preview.hit, true);
  assert.equal(preview.success, true);
  assert.equal(preview.critical.kind, 'Critique');
  assert.equal(preview.critical.details.locationRoll, 34);
  assert.ok(preview.critical.details.location.name);
  const withoutHelpless = previewResolution({ actor: person('a'), target: person('b'), action: { type: 'attack', attr: 'CC', base: 60, damage: 5 },
    roll: 11, v5: { kind: 'melee' } });
  assert.ok(withoutHelpless.unresolved.some(row => /défense/i.test(row)), 'une attaque mêlée ordinaire attend son opposition');
});

test('F2-B caractérisation — Store paie le coût et quota d’attaque supplémentaire dans le même Tour, Undo/reload les conservent', async () => {
  const persistence = memoryPersistence();
  const { store } = await fixture({ actor: person('a', { extensions: { v5: { hasMomentum: true, divine: { sin: 0 }, magic: { reserve: { type: 'winds', sl: 0 } } } } }), persistence });
  const input = strike('paid-extra', { v5: { kind: 'melee', extraAttack: true } });
  const preview = store.previewResolution(input);
  assert.deepEqual(preview.unresolved, []);
  assert.equal(preview.actionCosts.ready, true);
  assert.deepEqual(preview.actionCosts.paid.map(row => [row.resource, row.amount]), [['momentum', 1]]);
  const applied = await store.applyResolution(preview);
  assert.equal(applied.status, 'applied');
  assert.equal(applied.actionCostReceipt.paid[0].resource, 'momentum');
  const next = store.previewResolution({ ...input, resolutionId: 'paid-extra-second' });
  assert.equal(next.actionCosts.ready, false, 'récupérer l’Élan ne rouvre pas le quota du même Tour');
  assert.ok(next.unresolved.some(row => /Quota/i.test(row)));

  const reloaded = createStore({ persistence, storage: null }); await reloaded.ready;
  assert.equal(reloaded.previewResolution({ ...input, resolutionId: 'paid-extra-after-reload' }).actionCosts.ready, false);
  assert.equal(await reloaded.undo(), true);
  assert.equal(reloaded.previewResolution({ ...input, resolutionId: 'paid-extra-after-undo' }).actionCosts.ready, true);
  assert.equal(reloaded.listParticipants().find(row => row.id === 'a').extensions.v5.hasMomentum, true);

  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'b');
  await store.nextTurn();
  assert.equal(store.getCombat().currentActorId, 'a');
  const renewed = store.previewResolution({ ...input, resolutionId: 'paid-extra-next-turn' });
  assert.equal(renewed.actionCosts.ready, true, 'le quota se renouvelle au prochain Tour réel');
});

test('F2-B caractérisation — échéance début du Tour propre après le Tour d’un autre acteur', async () => {
  const actor = person('a', { talents: [{ id: 'talent-martial-arts', status: 'resolved', rank: 2,
    acquisitions: [{}, { qualityId: 'assommante' }] }] });
  const { store } = await fixture({ actor });
  const activation = store.previewResolution({ resolutionId: 'martial-start', actorId: 'a', action: { type: 'skill', base: 0 }, roll: '',
    authorNextTurnEnd: { phase: 'endOfTurn', actorId: 'a', round: 2, turn: 3 },
    v5: { kind: 'test', context: { talentAction: 'martial-arts', beginningOfTurn: true, martialQuality: 'assommante' } } });
  assert.deepEqual(activation.unresolved, []);
  assert.equal((await store.applyResolution(activation)).status, 'applied');
  const active = () => store.listParticipants().find(row => row.id === 'a').states.some(row => row.key === 'martial-arts-quality');
  assert.equal(active(), true);
  const engine = createCombatEngine(store);
  const toB = await engine.nextTurn();
  assert.equal(toB.status, 'applied', JSON.stringify(toB));
  assert.equal(store.getCombat().currentActorId, 'b');
  assert.equal(active(), true, 'le Tour de b ne déclenche pas l’échéance de a');
  const toA = await engine.nextTurn();
  assert.equal(toA.status, 'applied', JSON.stringify(toA));
  assert.equal(store.getCombat().currentActorId, 'a');
  assert.equal(active(), false, 'l’effet expire au début du prochain Tour de son auteur');
});

test('F2-B caractérisation — application Store inscrit les Actions mais ne plafonne pas encore le Tour ordinaire', async () => {
  const contract = getDivineContract(HOWL);
  const prayerActor = person('a', { talents: [{ id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ulric' }],
    prayers: [{ name: contract.catalogueName, status: 'resolved' }],
    skills: [{ name: 'Prière', status: 'resolved', total: 60 }, { name: 'Langue (Magick)', status: 'resolved', total: 200 }] });
  const { store } = await fixture({ actor: prayerActor });
  const first = store.previewResolution(strike('ordinary-attack'));
  assert.deepEqual(first.unresolved, []);
  assert.equal((await store.applyResolution(first)).status, 'applied');
  const envelope = () => JSON.parse(store.getFullJSON());
  const usageAfterAttack = envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a');
  assert.equal(usageAfterAttack.length, 1);
  assert.equal(usageAfterAttack[0].turnId, 'f2-b-characterization:1:a');

  const second = store.previewResolution({ resolutionId: 'ordinary-skill', actorId: 'a', action: { type: 'skill', attr: 'Int', base: 60 }, roll: 25,
    v5: { kind: 'test', context: { isAction: true, involvesMovement: false, requiresSight: false, reliesOnSight: false } } });
  assert.deepEqual(second.unresolved, []);
  assert.equal((await store.applyResolution(second)).status, 'applied', 'une seconde Action ordinaire reste applicable à ce stade');
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 2);

  const spellInput = { actorId: 'a', targetIds: ['b'], roll: 23, miscastRoll: 15, attributeActive: false, locationRoll: 34 };
  const spell = store.previewSpellExecution('Carreau', spellInput);
  assert.equal(spell.valid, true, spell.error);
  await store.applySpellExecution('Carreau', spellInput);
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 3,
    'l’incantation enregistre son créneau à la même horloge du Tour');

  const actor = store.listParticipants().find(row => row.id === 'a');
  const prayerInput = { actorId: 'a', targetIds: [], roll: 45, canSpeak: true,
    choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    expiry: buildExpiry({ contract, actor, choices: {}, round: 1, phase: 'endOfTurn' }) };
  const prayer = store.previewDivineExecution(HOWL, prayerInput);
  assert.equal(prayer.ready, true, JSON.stringify(prayer));
  await store.applyDivineExecution(HOWL, { preview: prayer });
  assert.equal(envelope().extensions.v5.standardTurnActions.filter(row => row.actorId === 'a').length, 4,
    'la Prière enregistre aussi son usage, sans plafond universel courant');
  assert.ok(contract, 'contrat de Prière chargé');
  assert.ok(actor, 'acteur toujours présent après les trois voies d’action');
});
