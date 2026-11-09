// Q6 · T5 (docs/specs/tests-secondaires-agregateur/) : Tests hors combat par le calcul commun (`previewV5SecondaryTest`).
// - Corruption (exposition et seuil) : Test subi (V5 p. 187 « a Test to resist … Corruption », p. 188 « hold off your
//   corruption ») : États comptés, Inconscient ne bloque pas (CA21), question d'État en attente (CA8) ;
// - poursuite (L06 p. 158) : Test actif, Inconscient bloque (CA14), mouvement et fuite sont donnés par la poursuite ;
// - extraction de projectile (Guérison) et déploiement de rune Cadai (Savoir (Magie)) : Tests actifs, Inconscient bloque.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { resolveV5PursuitStep } from '../../../js/core/v5-broken-escape.js';

const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';
const CALM = 'skill-43_61_6c_6d_65-base';
const STUNNED = { key: 'sonne', name: 'Sonné', level: 1 };
const UNCONSCIOUS = { key: 'inconscient', name: 'Inconscient', level: 1 };
const PRONE = { key: 'aterre', name: 'À terre', level: 1 };
const BLIND = { key: 'aveugle', name: 'Aveuglé', level: 1 };

const memory = () => { let saved = null; return { async load() { return saved && structuredClone(saved); }, async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; } }; };
const person = (id, { states = [], skills = [], v5 = {}, caracs = {} } = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', zone: 'active', hp: 12, maxHp: 12, size: 'average', species: 'Human',
  caracs: { CC: 40, CT: 40, F: 30, E: 30, I: 40, Ag: 40, Dex: 40, Int: 50, FM: 30, Soc: 30, M: 4, ...caracs },
  skills: [{ id: RESISTANCE, name: 'Résistance', carac: 'E', status: 'resolved', total: 50 }, { id: CALM, name: 'Calme', carac: 'FM', status: 'resolved', total: 50 }, ...skills],
  talents: [], states, equipment: [], traits: [], armor: {}, extensions: { v5 } });
async function storeWith(participants, { session = true } = {}) {
  const store = createStore({ storage: null, persistence: memory() });
  await store.ready;
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { combatId: 'c', turnIndex: 1 } },
    combat: { round: 1, currentActorId: participants[0].id, order: participants.map(row => row.id), participants } });
  if (session) await store.startTalentSession();
  return store;
}
const exposure = (store, id, extra = {}) => store.previewCorruptionExposure(id, { baseRevision: store.getCorruptionStatus(id).baseRevision,
  influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 35, declaredSources: 'Artefact souillé', ...extra });

// --- Corruption ---------------------------------------------------------------------------------------------------------

test('Corruption (exposition) : Sonné compté par le calcul commun', async () => {
  const witness = exposure(await storeWith([person('hero', { v5: { corruptionPoints: 0 } })]), 'hero');
  const stunned = exposure(await storeWith([person('hero', { states: [STUNNED], v5: { corruptionPoints: 0 } })]), 'hero');
  assert.equal(witness.status, 'ready');
  assert.equal(stunned.status, 'ready');
  assert.equal(stunned.test.sl, witness.test.sl - 1, 'Sonné : −1 DR');
  assert.ok(stunned.test.detail.some(line => /État/.test(line)), 'le détail montre la pénalité d’État');
});

test('Corruption (exposition) : Test subi, un Inconscient le fait (CA21)', async () => {
  const preview = exposure(await storeWith([person('hero', { states: [UNCONSCIOUS], v5: { corruptionPoints: 0 } })]), 'hero');
  assert.equal(preview.status, 'ready');
});

test('Corruption (exposition) : une question d’État attend la réponse du MJ (CA8), puis la réponse est gardée jusqu’à l’application', async () => {
  const store = await storeWith([person('hero', { states: [PRONE], v5: { corruptionPoints: 0 } })]);
  const pending = exposure(store, 'hero');
  assert.equal(pending.status, 'needs-input');
  assert.deepEqual(pending.needsInput.map(row => row.field), ['involvesMovement']);
  assert.deepEqual(pending.missing, ['involvesMovement']);
  const ready = exposure(store, 'hero', { conditionContext: { involvesMovement: false } });
  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.input.conditionContext, { involvesMovement: false });
  assert.equal((await store.applyCorruptionExposure('hero', ready)).status, 'applied');
});

test('Corruption (exposition) au Calme : Test de Calme, Caractéristique FM (Sonné compté)', async () => {
  const witness = exposure(await storeWith([person('hero', { v5: { corruptionPoints: 0 } })]), 'hero', { skillId: CALM });
  const stunned = exposure(await storeWith([person('hero', { states: [STUNNED], v5: { corruptionPoints: 0 } })]), 'hero', { skillId: CALM });
  assert.equal(stunned.test.sl, witness.test.sl - 1);
});

test('Corruption (seuil) : Sonné compté, Inconscient ne bloque pas', async () => {
  const pending = { pendingCorruptionTest: { id: 'p', status: 'pending' }, corruptionPoints: 9 };
  const input = store => ({ baseRevision: store.getCorruptionStatus('hero').baseRevision, roll: 45 });
  const witnessStore = await storeWith([person('hero', { v5: pending })]);
  const stunnedStore = await storeWith([person('hero', { states: [STUNNED], v5: pending })]);
  const out = await storeWith([person('hero', { states: [UNCONSCIOUS], v5: pending })]);
  const witness = witnessStore.previewCorruptionThresholdTest('hero', input(witnessStore));
  const stunned = stunnedStore.previewCorruptionThresholdTest('hero', input(stunnedStore));
  assert.equal(witness.status, 'ready');
  assert.equal(stunned.test.sl, witness.test.sl - 1);
  assert.equal(out.previewCorruptionThresholdTest('hero', input(out)).status, 'ready');
});

test('Corruption (seuil) : une question d’État rend needs-input avec son champ', async () => {
  const store = await storeWith([person('hero', { states: [PRONE], v5: { pendingCorruptionTest: { id: 'p', status: 'pending' }, corruptionPoints: 9 } })]);
  const preview = store.previewCorruptionThresholdTest('hero', { baseRevision: store.getCorruptionStatus('hero').baseRevision, roll: 45 });
  assert.equal(preview.status, 'needs-input');
  assert.deepEqual(preview.missing, ['involvesMovement']);
});

// --- Poursuite ----------------------------------------------------------------------------------------------------------

const runner = (id, states = []) => person(id, { states, skills: [{ id: 'athl', name: 'Athlétisme', carac: 'Ag', status: 'resolved', total: 50 }] });
const pursue = (quarry, pursuer, extra = {}) => resolveV5PursuitStep({ quarry, pursuer, initialDistance: 5, quarryRoll: 25, pursuerRoll: 25, ...extra });

test('poursuite : Sonné compté pour la proie comme pour le poursuivant', () => {
  const witness = pursue(runner('q'), runner('p'));
  const quarry = pursue(runner('q', [STUNNED]), runner('p'));
  const pursuer = pursue(runner('q'), runner('p', [STUNNED]));
  assert.equal(witness.ready, true);
  assert.equal(quarry.quarryTest.sl, witness.quarryTest.sl - 1);
  assert.equal(pursuer.pursuerTest.sl, witness.pursuerTest.sl - 1);
});

test('poursuite : Test actif, un Inconscient ne peut pas le tenter (CA14)', () => {
  const out = pursue(runner('q', [UNCONSCIOUS]), runner('p'));
  assert.equal(out.ready, false);
  assert.match(out.error, /Inconscient/);
});

test('poursuite : mouvement donné (À terre compté sans question), la vue reste une question au MJ (CA8)', () => {
  const prone = pursue(runner('q', [PRONE]), runner('p'));
  assert.equal(prone.ready, true, 'À terre : la poursuite implique un mouvement, pas de question');
  assert.equal(prone.quarryTest.roll, 52, 'Désavantage d’À terre : 25 inversé en 52');
  const blind = pursue(runner('q'), runner('p', [BLIND]));
  assert.equal(blind.ready, false);
  assert.deepEqual(blind.needsInput.map(row => row.field), ['pursuerContext.reliesOnSight']);
  assert.equal(pursue(runner('q'), runner('p', [BLIND]), { pursuerContext: { reliesOnSight: false } }).ready, true);
});

// --- Extraction de projectile -------------------------------------------------------------------------------------------

const HEAL = { id: 'heal', name: 'Guérison', carac: 'Int', status: 'resolved', total: 50 };
const impaled = states => person('hero', { states, skills: [HEAL], v5: { lodgedProjectiles: [{ id: 'arrow', removal: 'heal-test' }] } });
const extract = async (states, extra = {}) => (await storeWith([impaled(states)], { session: false }))
  .previewV5ProjectileExtraction({ participantId: 'hero', projectileId: 'arrow', method: 'heal-test', skillId: 'heal', roll: 35, ...extra });

test('extraction de projectile : Sonné compté sur le Test de Guérison', async () => {
  const witness = await extract([]);
  const stunned = await extract([STUNNED]);
  assert.equal(witness.ready, true);
  assert.equal(stunned.after.removalReceipt.test.sl, witness.after.removalReceipt.test.sl - 1);
});

test('extraction de projectile : Inconscient bloque, une question d’État attend sa réponse', async () => {
  const out = await extract([UNCONSCIOUS]);
  assert.equal(out.ready, false);
  assert.match(out.error, /Inconscient/);
  const prone = await extract([PRONE]);
  assert.equal(prone.ready, false);
  assert.deepEqual(prone.needsInput.map(row => row.field), ['involvesMovement']);
  assert.equal((await extract([PRONE], { conditionContext: { involvesMovement: false } })).ready, true);
});

// --- Déploiement de rune Cadai ------------------------------------------------------------------------------------------

const LORE = { id: 'lore', name: 'Savoir (Magie)', carac: 'Int', status: 'resolved', total: 50 };
const scribe = states => person('mage', { states, skills: [LORE], v5: { cadaiRunes: { deployed: 0, max: 3 } } });
async function deploy(states, extra = {}) {
  const store = await storeWith([scribe(states)], { session: false });
  const result = await store.deployCadaiRune({ actorId: 'mage', conditionsConfirmed: true, roll: 45, ...extra });
  const line = (store.getLog() || []).find(row => /Déploiement Cadai/.test(row.text));
  return { store, result, line };
}

test('déploiement de rune Cadai : Sonné compté (45 contre 50 : +1 DR, Sonné +0 DR)', async () => {
  const witness = await deploy([]);
  const stunned = await deploy([STUNNED]);
  assert.match(witness.line.text, /jet 45 ; 1 DR/);
  assert.match(stunned.line.text, /jet 45 ; 0 DR/);
});

test('déploiement de rune Cadai : Inconscient bloque, une question d’État aussi tant qu’elle n’a pas de réponse', async () => {
  await assert.rejects(async () => { const { result } = await deploy([UNCONSCIOUS]); if (result?.ok === false) throw new Error(result.error); }, /Inconscient/);
  await assert.rejects(async () => { const { result } = await deploy([PRONE]); if (result?.ok === false) throw new Error(result.error); }, /mouvement/);
  const answered = await deploy([PRONE], { conditionContext: { involvesMovement: false } });
  assert.match(answered.line.text, /Déploiement Cadai/);
});

// --- Retours de la contre-vérification ---------------------------------------------------------------------------------

const SURPRISED = { key: 'surpris', name: 'Surpris', level: 1 };
const BROKEN = { key: 'brise', name: 'Brisé', level: 1 };

test('poursuite et rune Cadai : Tests d’action, un Surpris ne les tente pas ce Round (CA14)', async () => {
  const out = pursue(runner('q'), runner('p', [SURPRISED]));
  assert.equal(out.ready, false);
  assert.match(out.error, /Surpris/);
  await assert.rejects(async () => { const { result } = await deploy([SURPRISED]); if (result?.ok === false) throw new Error(result.error); }, /Surpris/);
});

test('poursuite : la proie Brisée fuit (pas de pénalité), le poursuivant Brisé pose la question de la fuite au MJ', () => {
  const witness = pursue(runner('q'), runner('p'));
  const quarry = pursue(runner('q', [BROKEN]), runner('p'));
  assert.equal(quarry.quarryTest.sl, witness.quarryTest.sl, 'Brisé : pas de pénalité sur un Test pour fuir');
  const pursuer = pursue(runner('q'), runner('p', [BROKEN]));
  assert.equal(pursuer.ready, false);
  assert.deepEqual(pursuer.needsInput.map(row => row.field), ['pursuerContext.runningOrHiding']);
  const answered = pursue(runner('q'), runner('p', [BROKEN]), { pursuerContext: { runningOrHiding: false } });
  assert.equal(answered.pursuerTest.sl, witness.pursuerTest.sl - 1);
});

test('Corruption (seuil) : la réponse du MJ est gardée jusqu’à l’application', async () => {
  const store = await storeWith([person('hero', { states: [PRONE], v5: { pendingCorruptionTest: { id: 'p', status: 'pending' }, corruptionPoints: 9 } })]);
  const preview = store.previewCorruptionThresholdTest('hero', { baseRevision: store.getCorruptionStatus('hero').baseRevision, roll: 45, conditionContext: { involvesMovement: false } });
  assert.equal(preview.status, 'ready');
  assert.equal((await store.applyCorruptionThresholdTest('hero', preview)).status, 'applied');
});
