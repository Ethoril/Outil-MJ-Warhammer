import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createV5CorruptionPanel } from '../js/ui/v5-corruption-panel.js';
import { buildParticipantFromBestiary } from '../js/core/bestiary-profiles.js';
import l11 from '../js/data/bestiary/L11.json' with { type: 'json' };

const clone = structuredClone;
const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';
const participant = (id, v5 = {}) => ({
  id, name: id, zone: 'active', hp: 12, maxHp: 12, states: [], species: 'Human',
  caracs: { E: 30, FM: 30 }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [],
  extensions: { v5 }
});
const envelope = participants => ({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants }, log: [], diceLines: [] });
function persistenceFixture() {
  let saved = null;
  return {
    persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } },
    read() { return saved && clone(saved); }
  };
}
async function fixture(participants) {
  const disk = persistenceFixture();
  const store = createStore({ storage: null, persistence: disk.persistence });
  await store.ready;
  await store.loadFromJSON(envelope(participants));
  await store.startTalentSession();
  return { store, disk };
}

test('F2-K1 Store: exposure uses authoritative skill/threshold, persists through undo/redo/reload', async () => {
  const { store, disk } = await fixture([participant('hero', { corruptionPoints: 2 })]);
  const before = store.getCorruptionStatus('hero');
  assert.equal(before.threshold, 6);
  const firstSessionId = before.corruptionSessionId;
  const preview = store.previewCorruptionExposure('hero', {
    baseRevision: before.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 70, declaredSources: 'Chaos-tainted artefact'
  });
  assert.equal(preview.status, 'ready');
  assert.equal(preview.gainedPoints, 2);
  const applied = await store.applyCorruptionExposure('hero', preview);
  assert.equal(applied.status, 'applied');
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  assert.equal(store.getCorruptionStatus('hero').sessionExposure.sessionId, firstSessionId);
  assert.throws(() => store.previewCorruptionExposure('hero', {
    baseRevision: store.getCorruptionStatus('hero').baseRevision, influence: 'major', exposure: 'prolonged', skillId: RESISTANCE, roll: 70, declaredSources: 'Mutant lair'
  }), /déjà été résolu/);
  assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
  await store.undo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 2);
  await store.redo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  const reloaded = createStore({ storage: null, persistence: disk.persistence });
  await reloaded.ready;
  assert.equal(reloaded.getCorruptionStatus('hero').corruptionPoints, 4);
  assert.equal(reloaded.getCorruptionStatus('hero').sessionExposure.declaredSources, 'Chaos-tainted artefact');
  assert.equal(reloaded.getCorruptionStatus('hero').sessionExposure.sessionId, firstSessionId);
  assert.equal(reloaded.getCorruptionStatus('hero').mutations.length, 0);
  await reloaded.startTalentSession();
  const nextSession = reloaded.getCorruptionStatus('hero');
  assert.notEqual(nextSession.corruptionSessionId, firstSessionId);
  assert.equal(nextSession.sessionExposure, null);
  assert.equal(reloaded.previewCorruptionExposure('hero', {
    baseRevision: nextSession.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Later session, profane artefact'
  }).status, 'ready', 'new explicit session allows its own single Test without deleting history');
});

test('F2-K1 Store: over-threshold test and mutation confirmation use fresh authoritative facts', async () => {
  const { store } = await fixture([participant('hero', { corruptionPoints: 5 })]);
  const status = store.getCorruptionStatus('hero');
  const exposure = store.previewCorruptionExposure('hero', {
    baseRevision: status.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 90, declaredSources: 'Refined warpstone'
  });
  await store.applyCorruptionExposure('hero', exposure);
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  const pendingStatus = store.getCorruptionStatus('hero');
  const preview = store.previewCorruptionThresholdTest('hero', {
    baseRevision: pendingStatus.baseRevision, roll: 90, mutationDomainRoll: 1, gmChosenDomain: 'physical', manifestationDice: [2, 3, 4]
  });
  assert.equal(preview.status, 'ready');
  assert.equal(preview.outcome.status, 'mutation-pending');
  assert.equal((await store.applyCorruptionThresholdTest('hero', preview)).status, 'applied');
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7, 'points are not removed before GM confirmation');

  const pending = store.getCorruptionStatus('hero');
  assert.equal(pending.pendingMutation.manifestation.days, 9);
  const confirmed = await store.confirmCorruptionMutation('hero', { mutationId: 'L06-P-01', baseRevision: pending.baseRevision });
  assert.equal(confirmed.status, 'confirmed');
  const committed = store.getCorruptionStatus('hero');
  assert.equal(committed.corruptionPoints, 4);
  assert.equal(committed.mutations.length, 1);
  assert.equal(committed.mutations[0].tableRowId, 'L06-P-01');
  await store.undo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  await store.redo();
  assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
});

test('F2-K1 Store: stale previews cannot commit after state changes; threshold is recalculated', async () => {
  const { store } = await fixture([participant('hero', { corruptionPoints: 5 })]);
  const first = store.getCorruptionStatus('hero');
  const preview = store.previewCorruptionExposure('hero', {
    baseRevision: first.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
  });
  await store.setCorruptionPoints('hero', 6, { reason: 'saisie MJ', baseRevision: first.baseRevision });
  assert.equal((await store.applyCorruptionExposure('hero', preview)).status, 'stale');
  const changed = store.getCorruptionStatus('hero');
  assert.equal(changed.corruptionPoints, 6);
  assert.equal(changed.threshold, 6);
  const noGain = store.previewCorruptionExposure('hero', {
    baseRevision: changed.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 1, declaredSources: 'Profane artefact'
  });
  assert.equal(noGain.gainedPoints, 0);
  assert.equal(noGain.thresholdTestRequired, false);
});

test('F2-K1 Store: threshold increase explicitly closes obsolete pending test and unblocks exposure', async () => {
  const { store } = await fixture([participant('hero', {
    corruptionPoints: 7,
    pendingCorruptionTest: { id: 'pending-old', status: 'pending', pointsAtTrigger: 7, thresholdAtTrigger: 6 }
  })]);
  const before = store.getCorruptionStatus('hero');
  assert.equal(before.pendingThresholdTest.id, 'pending-old');
  await store.updateParticipant('hero', { caracs: { E: 40, FM: 40 } });
  const refreshed = store.getCorruptionStatus('hero');
  assert.equal(refreshed.threshold, 8);
  assert.ok(refreshed.pendingThresholdTest, 'pending decision is not silently discarded');
  const resolved = await store.resolveObsoleteCorruptionThresholdTest('hero', { baseRevision: refreshed.baseRevision });
  assert.equal(resolved.status, 'resolved');
  assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
  const status = store.getCorruptionStatus('hero');
  const exposure = store.previewCorruptionExposure('hero', {
    baseRevision: status.baseRevision, influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
  });
  assert.equal(exposure.status, 'ready');
  assert.equal(exposure.thresholdTestRequired, false);
});

test('F2-K1 UI: changed threshold offers an explicit no-roll close action', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const { store } = await fixture([participant('hero', {
      corruptionPoints: 7,
      pendingCorruptionTest: { id: 'pending-old', status: 'pending', pointsAtTrigger: 7, thresholdAtTrigger: 6 }
    })]);
    await store.updateParticipant('hero', { caracs: { E: 40, FM: 40 } });
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const action = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Clore le Test de seuil devenu inutile');
    assert.ok(action, 'the UI exposes an explicit close action without asking for a d100');
    await action.click();
    assert.equal(store.getCorruptionStatus('hero').pendingThresholdTest, null);
    assert.equal(store.previewCorruptionExposure('hero', {
      baseRevision: store.getCorruptionStatus('hero').baseRevision,
      influence: 'minor', exposure: 'exposure', skillId: RESISTANCE, roll: 70, declaredSources: 'Profane artefact'
    }).status, 'ready');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('F2-K1 UI: the MJ opens an explicit session before recording end-of-session exposures', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const disk = persistenceFixture();
    const store = createStore({ storage: null, persistence: disk.persistence });
    await store.ready;
    await store.loadFromJSON(envelope([participant('hero', { corruptionPoints: 1 })]));
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const action = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Démarrer une séance');
    assert.ok(action);
    await action.click();
    assert.ok(store.getCorruptionStatus('hero').corruptionSessionId);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('F2-K1 production bestiary profiles: canonical skill/talent IDs and elven species reach the threshold rules', async () => {
  const library = l11.profiles;
  const erich = buildParticipantFromBestiary('E0-P-536', { library, zone: 'active', idFactory: () => 'erich' });
  const lynathryn = buildParticipantFromBestiary('E0-P-538', { library, zone: 'active', idFactory: () => 'lynathryn' });

  assert.equal(erich.identity.species, 'Human');
  assert.equal(erich.species, 'Human');
  assert.equal(erich.skills.find(skill => skill.sourceName === 'Endurance').id, RESISTANCE);
  assert.equal(erich.talents.find(talent => talent.sourceName === 'Pure Soul').id, 'talent-pure-soul');
  assert.equal(erich.talents.find(talent => talent.sourceName === 'Pure Soul').status, 'resolved');
  const { store, disk } = await fixture([erich]);
  assert.equal(store.getCorruptionStatus('erich').threshold, 12, 'E38/FM30 plus Pure Soul doubles 6 to 12');
  const erichReloaded = createStore({ storage: null, persistence: disk.persistence });
  await erichReloaded.ready;
  assert.equal(erichReloaded.getCorruptionStatus('erich').threshold, 12, 'catalogue talent and characteristics survive reload');

  assert.equal(lynathryn.identity.species, 'Wood Elf');
  assert.equal(lynathryn.species, 'Wood Elf');
  assert.equal(lynathryn.skills.find(skill => skill.sourceName === 'Endurance').id, RESISTANCE);
  assert.equal(lynathryn.skills.find(skill => skill.sourceName === 'Endurance').total, 45);
  const elfFixture = await fixture([{ ...lynathryn, extensions: { ...lynathryn.extensions, v5: { ...lynathryn.extensions.v5, corruptionPoints: 5 } } }]);
  const status = elfFixture.store.getCorruptionStatus('lynathryn');
  const exposure = elfFixture.store.previewCorruptionExposure('lynathryn', {
    baseRevision: status.baseRevision, influence: 'moderate', exposure: 'prolonged', skillId: RESISTANCE, roll: 99, declaredSources: 'Chaos-tainted artefact'
  });
  assert.equal(exposure.test.scoreInfo.scoreSource, 'resolved-skill');
  await elfFixture.store.applyCorruptionExposure('lynathryn', exposure);
  const updated = elfFixture.store.getCorruptionStatus('lynathryn');
  assert.equal(updated.species, 'Wood Elf', 'species is hydrated from the preserved bestiary identity');
  const mutation = elfFixture.store.previewCorruptionThresholdTest('lynathryn', {
    baseRevision: updated.baseRevision, roll: 99, mutationDomainRoll: 1, manifestationDice: [1, 1, 1]
  });
  assert.equal(mutation.status, 'ready');
  assert.equal(mutation.outcome.mutation.domain, 'mental', 'Wood Elf uses Elf table: no physical mutation result');
  const lynathrynReloaded = createStore({ storage: null, persistence: elfFixture.disk.persistence });
  await lynathrynReloaded.ready;
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').species, 'Wood Elf');
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').threshold, 6);
  assert.equal(lynathrynReloaded.getCorruptionStatus('lynathryn').sessionExposure.declaredSources, 'Chaos-tainted artefact');
});
