// L5 des miracles narratifs : Lumière de stase et Apaisez les vents (Archives of the Empire 3, p.55 ; Solkan). Valeurs relues : Lumière de
// stase, portée 4 m, 3 cibles, Bonus de Sociabilité Rounds ; Apaisez les vents, portée et zone Bonus de Sociabilité mètres, même durée.
// Stase : le Tour ne fait avancer, pour le porteur, ni États, ni pertes, ni expirations, ni sorts ; la couche de stase expire normalement.
// Apaisez les vents : zone de L4 (`suppressMagic`) ; Incantation et Focalisation refusées pour un membre, couches de sort suspendues.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createCombatEngine } from '../../../js/core/combat.js';
import { createGameClock } from '../../../js/core/v5-game-time.js';
import { getDivineContract, getAllDivineContracts } from '../../../js/core/v5-divine-store.js';
import { validateEffect } from '../../../js/core/v5-divine-effect-handlers.js';
import { setDivineZoneMembersOnState } from '../../../js/core/v5-divine-effects-zones.js';
import { previewV5Turn } from '../../../js/core/v5-turn.js';
import { previewCasting } from '../../../js/core/v5-magic-casting.js';
import { previewChannelling } from '../../../js/core/v5-magic-channelling.js';
import { unsuppressedSpellEffects } from '../../../js/core/v5-spell-effects-active.js';

const clone = value => structuredClone(value);
const memory = () => { let saved = null; return { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } }; };
const idOf = name => getAllDivineContracts().find(row => row.type === 'miracle' && row.canonicalName === name).id;
const STASIS = idOf('Light of Stasis'), STILL = idOf('Still the Winds');
const modeOf = (id, clauseId) => getDivineContract(id).clauses.find(clause => clause.id === clauseId)?.mode;

// Prêtre de Sociabilité 20 : Bonus 2, donc deux Rounds de durée (échéance fin du Round 2).
const actor = (id, extra = {}) => ({ id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', initiative: 60, hp: 20, maxHp: 30,
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 20, M: 4 },
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Solkan' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Solkan' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })),
  equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, extensions: { v5: { divine: { sin: 0 }, corruptionPoints: 0 } }, ...extra });
// Une autre couche divine sur la cible, échue à la fin du Round 1 : la stase la garde.
const otherLayer = { id: 'other-layer', executionId: 'exec-other', prayerId: 'divine:miracle:autre', casterId: 'ally', type: 'special-state',
  specialState: { fearImmune: true }, expiry: { phase: 'endOfRound', round: 1, moment: 'afterEffects' } };
const burning = () => [{ name: 'Enflammé', level: 1 }, { name: 'Hémorragique', level: 1 }];
const spellLayer = { id: 'spell-force', spellId: 'spell-test', name: 'Force du test', statModifiers: { CC: 10 }, expiresAtRound: 9 };
const wizard = (id, extra = {}) => actor(id, { initiative: 30, caracs: { CC: 50, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 60, FM: 50, Soc: 40, M: 4 },
  skills: [{ name: 'Langue (Magick)', total: 60 }, { name: 'Focalisation', total: 60 }],
  talents: [{ id: 'talent-arcane-magic', status: 'resolved', rank: 1, specialization: 'Feu' }],
  extensions: { v5: { divine: { sin: 0 }, hasMomentum: true, baseCaracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 60, FM: 50, Soc: 40, M: 4 },
    spellEffects: [clone(spellLayer)] } }, ...extra });

async function open(participants) {
  const store = createStore({ persistence: memory(), storage: null }); await store.ready;
  const snapshot = { schemaVersion: 3, reserve: [], combat: { round: 1, currentActorId: 'priest', order: participants.map(row => row.id), participants },
    log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } } };
  snapshot.extensions.v5.gameClock = createGameClock(snapshot);
  await store.loadFromJSON(snapshot);
  return { store, engine: createCombatEngine(store) };
}
const full = store => JSON.parse(store.getFullJSON());
const who = (store, id) => full(store).combat.participants.find(row => row.id === id);
const layersOf = (store, id) => who(store, id).extensions?.v5?.divineEffects || [];
const input = (more = {}) => ({ actorId: 'priest', targetIds: [], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
  expiry: { phase: 'endOfRound', round: 2 }, ...more });
async function cast(store, contractId, more) {
  const preview = store.previewDivineExecution(contractId, input(more));
  assert.equal(preview.ready, true, JSON.stringify(preview.needsInput) + preview.error);
  const result = await store.applyDivineExecution(contractId, { preview });
  assert.equal(result.ready, true, result.error);
  return result;
}
// Un Round complet : trois Tours (priest → ally → foe → priest).
async function round(engine, inputs) {
  let last;
  for (let i = 0; i < 3; i += 1) last = await engine.nextTurn(i === 2 && inputs ? { inputs } : {});
  return last;
}

describe('L5 — contrats et grammaire', () => {
  test('Lumière de stase et Apaisez les vents passent assisted ; clauses branchées et rappels', () => {
    assert.equal(getDivineContract(STASIS).status, 'assisted');
    assert.deepEqual(getDivineContract(STASIS).effects.map(({ type, stasis }) => ({ type, stasis })), [{ type: 'special-state', stasis: true }]);
    assert.equal(modeOf(STASIS, 'time-paused'), 'engine');
    assert.equal(modeOf(STASIS, 'stasis'), 'manual');
    assert.equal(getDivineContract(STILL).status, 'assisted');
    const zone = getDivineContract(STILL).effects.find(effect => effect.type === 'divine-zone');
    assert.deepEqual([zone.suppressMagic, zone.excludes, zone.radius], [true, [], { characteristic: 'Soc', bonus: true }]);
    assert.equal(modeOf(STILL, 'dispel'), 'engine');
    assert.equal(modeOf(STILL, 'auto-fail'), 'engine');
    assert.equal(modeOf(STILL, 'magic-items'), 'manual');
    assert.equal(modeOf(STILL, 'second-sight'), 'manual');
  });
  test('le générateur refuse un drapeau de stase non vrai, une zone sans exclusion ni magie suspendue, un type inconnu', () => {
    assert.equal(validateEffect({ type: 'special-state', stasis: true }), null);
    assert.match(validateEffect({ type: 'special-state', stasis: 'oui' }), /true/);
    const still = { type: 'divine-zone', appliesTo: 'caster', label: 'Zone', excludes: [], suppressMagic: true };
    assert.equal(validateEffect(still), null);
    assert.match(validateEffect({ ...still, suppressMagic: undefined }), /excludes/);
    assert.match(validateEffect({ ...still, suppressMagic: 'oui' }), /suppressMagic/);
    assert.match(validateEffect({ ...still, radius: { characteristic: 'Soc', bonus: 'oui' } }), /radius/);
    assert.match(validateEffect({ ...still, type: 'divine-stasis' }), /non pris en charge/);
  });
});

describe('L5 — Lumière de stase', () => {
  test('Enflammé et Hémorragique figés deux Rounds : aucune perte, aucune autre expiration, reprise ensuite', async () => {
    const foe = actor('foe', { initiative: 20, camp: 'ennemi', kind: 'PNJ', states: burning(),
      extensions: { v5: { divine: { sin: 0 }, divineEffects: [clone(otherLayer)] } } });
    const { store, engine } = await open([actor('priest'), actor('ally', { initiative: 30 }), foe]);
    await cast(store, STASIS, { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } } });
    const stasis = layersOf(store, 'foe').find(layer => layer.specialState?.stasis);
    assert.ok(stasis);
    assert.deepEqual(stasis.expiry, { phase: 'endOfRound', round: 2 });
    const statesBefore = clone(who(store, 'foe').states);
    // Round 1 puis Round 2 : aucune demande de jet, aucune Blessure, l'autre couche reste.
    for (const expected of [2, 3]) {
      const done = await round(engine);
      assert.equal(done.status, 'applied', JSON.stringify(done.requests));
      assert.equal(full(store).combat.round, expected);
      assert.equal(who(store, 'foe').hp, 20);
      assert.deepEqual(who(store, 'foe').states, statesBefore);
      assert.ok(layersOf(store, 'foe').some(layer => layer.id === 'other-layer'));
    }
    // La stase a expiré à la fin du Round 2 ; l'autre couche, échue pendant la stase, tombe au passage suivant.
    assert.equal(layersOf(store, 'foe').some(layer => layer.specialState?.stasis), false);
    await engine.nextTurn(); await engine.nextTurn();
    const pending = await engine.nextTurn();
    assert.equal(pending.status, 'requires-input');
    assert.ok(pending.requests.some(row => row.participantId === 'foe' && row.field === 'fireRoll'));
    const resumed = await engine.nextTurn({ inputs: { foe: { fireRoll: 6, bleedingEnduranceTest: { success: true, sl: 1 } } } });
    assert.equal(resumed.status, 'applied', JSON.stringify(resumed.requests));
    assert.ok(who(store, 'foe').hp < 20);
    assert.equal(layersOf(store, 'foe').some(layer => layer.id === 'other-layer'), false);
  });
  test('↶ du lancement : la stase disparaît ; ↶ d’un Tour figé : retour exact', async () => {
    const foe = actor('foe', { initiative: 20, camp: 'ennemi', kind: 'PNJ', states: burning() });
    const { store, engine } = await open([actor('priest'), actor('ally', { initiative: 30 }), foe]);
    await cast(store, STASIS, { targetIds: ['foe'], facts: { targets: { foe: { withinRange: true } } } });
    await engine.nextTurn(); await engine.nextTurn();
    const before = full(store).combat;
    assert.equal((await engine.nextTurn()).status, 'applied');
    await store.undo();
    assert.deepEqual(full(store).combat, before);
    await store.undo(); await store.undo(); await store.undo();
    assert.equal(layersOf(store, 'foe').length, 0);
  });
  test('un participant sans couche de stase avance à l’identique, que la stase touche un autre ou non', () => {
    const base = () => {
      const participants = [actor('priest'), actor('ally', { initiative: 30, states: burning() }), actor('foe', { initiative: 20, camp: 'ennemi', states: burning() })];
      const snapshot = { localRevision: 3, schemaVersion: 3, combat: { round: 1, currentActorId: 'foe', order: participants.map(row => row.id), participants },
        log: [], extensions: { v5: { turnIndex: 1 } } };
      snapshot.extensions.v5.gameClock = createGameClock(snapshot);
      return snapshot;
    };
    const plain = base(), frozen = base();
    frozen.combat.participants[2].extensions.v5.divineEffects = [{ id: 'stasis-layer', executionId: 'exec-stasis', prayerId: STASIS, casterId: 'priest',
      type: 'special-state', specialState: { stasis: true }, expiry: { phase: 'endOfRound', round: 2 } }];
    const inputs = { ally: { fireRoll: 6, bleedingEnduranceTest: { success: true, sl: 1 } }, foe: { fireRoll: 6, bleedingEnduranceTest: { success: true, sl: 1 } } };
    const a = previewV5Turn(plain, { inputs }), b = previewV5Turn(frozen, { inputs });
    assert.equal(a.ready, true); assert.equal(b.ready, true);
    const ally = out => out.state.combat.participants.find(row => row.id === 'ally');
    assert.deepEqual(ally(b), ally(a));
    assert.ok(ally(a).hp < 20);
    const foeOf = out => out.state.combat.participants.find(row => row.id === 'foe');
    assert.equal(foeOf(b).hp, 20);
    assert.ok(foeOf(a).hp < 20);
    assert.equal(b.requests.some(row => row.participantId === 'foe'), false);
  });
});

describe('L5 — Apaisez les vents', () => {
  const zoneOf = store => layersOf(store, 'priest').find(layer => layer.type === 'divine-zone');
  const members = (store, ids) => store.executeCommand('v5-divine-zone-members', draft => setDivineZoneMembersOnState(draft, 'priest', zoneOf(store).id, ids).state);
  const spell = { name: 'Dard', cn: 0, isPetty: true, type: 'petty' };
  async function fixture() {
    return open([actor('priest'), wizard('mage'), wizard('other', { initiative: 20 })]);
  }
  test('zone posée sur le prêtre : rayon = Bonus de Sociabilité, magie suspendue, aucun membre', async () => {
    const { store } = await fixture();
    await cast(store, STILL);
    const zone = zoneOf(store).zone;
    assert.deepEqual([zone.radius, zone.members, zone.suppressMagic], [2, [], true]);
  });
  test('Incantation et Focalisation refusées pour un membre, acceptées hors zone', async () => {
    const { store } = await fixture();
    await cast(store, STILL);
    await members(store, ['mage']);
    const castIn = previewCasting(who(store, 'mage'), spell, { roll: 20 });
    assert.equal(castIn.ready, false);
    assert.match(castIn.error, /Apaisez les vents/);
    const channelIn = previewChannelling(who(store, 'mage'), { type: 'winds', roll: 20 });
    assert.equal(channelIn.ready, false);
    assert.match(channelIn.error, /Apaisez les vents/);
    const castOut = previewCasting(who(store, 'other'), spell, { roll: 20 });
    assert.doesNotMatch(String(castOut.error || ''), /Apaisez les vents/);
    const channelOut = previewChannelling(who(store, 'other'), { type: 'winds', roll: 20 });
    assert.doesNotMatch(String(channelOut.error || ''), /Apaisez les vents/);
  });
  test('couche de sort suspendue pour un membre, rétablie à la sortie ; un seul ↶', async () => {
    const { store } = await fixture();
    await cast(store, STILL);
    assert.equal(who(store, 'mage').caracs.CC, 50);
    await members(store, ['mage']);
    assert.deepEqual(unsuppressedSpellEffects(who(store, 'mage').extensions.v5.spellEffects), []);
    assert.equal(who(store, 'mage').caracs.CC, 40);
    assert.equal(who(store, 'other').caracs.CC, 50);
    await members(store, []);
    assert.equal(unsuppressedSpellEffects(who(store, 'mage').extensions.v5.spellEffects).length, 1);
    assert.equal(who(store, 'mage').caracs.CC, 50);
    assert.equal(who(store, 'mage').extensions.v5.stilledMagic, undefined);
    await store.undo();
    assert.equal(who(store, 'mage').caracs.CC, 40);
    assert.match(previewCasting(who(store, 'mage'), spell, { roll: 20 }).error, /Apaisez les vents/);
  });
  test('expiration de la prière au Tour : couches de sort rétablies, lancement de nouveau permis', async () => {
    const { store, engine } = await fixture();
    await cast(store, STILL);
    await members(store, ['mage']);
    await round(engine);
    assert.equal(who(store, 'mage').caracs.CC, 40);
    await round(engine);
    assert.equal(zoneOf(store), undefined);
    assert.equal(who(store, 'mage').caracs.CC, 50);
    assert.equal(who(store, 'mage').extensions.v5.stilledMagic, undefined);
    assert.doesNotMatch(String(previewCasting(who(store, 'mage'), spell, { roll: 20 }).error || ''), /Apaisez les vents/);
  });
  test('prière terminée à la main par le MJ : magie rétablie tout de suite, sans attendre le Tour', async () => {
    const { store } = await fixture();
    await cast(store, STILL);
    await members(store, ['mage']);
    assert.equal(who(store, 'mage').caracs.CC, 40);
    await store.endDivinePrayer(zoneOf(store).executionId, { reason: 'fin' });
    assert.equal(who(store, 'mage').caracs.CC, 50);
    assert.equal(who(store, 'mage').extensions.v5.stilledMagic, undefined);
    assert.doesNotMatch(String(previewCasting(who(store, 'mage'), spell, { roll: 20 }).error || ''), /Apaisez les vents/);
  });
});
