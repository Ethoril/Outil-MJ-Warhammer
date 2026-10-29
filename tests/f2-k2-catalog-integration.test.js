import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { createV5CorruptionPanel } from '../js/ui/v5-corruption-panel.js';
import {
  V5_CORRUPTION_MUTATION_CATALOG,
  resolveCorruptionMutationSelection
} from '../js/core/v5-corruption-mutation-catalog.js';

const clone = structuredClone;
const RESISTANCE = 'skill-52_e9_73_69_74_61_6e_63_65-base';
const participant = { id: 'hero', name: 'Hero', zone: 'active', hp: 10, maxHp: 10, states: [], species: 'Human',
  caracs: { E: 30, FM: 30 }, skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [], extensions: { v5: { corruptionPoints: 0 } } };
const envelope = (subject = participant) => ({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [clone(subject)] }, log: [], diceLines: [] });
function persistenceFixture() {
  let saved = null;
  return { persistence: { async load() { return saved && clone(saved); }, async saveAtomic({ state }) { saved = clone(state); return { ok: true }; } } };
}
async function makeStore(subject = participant) {
  const disk = persistenceFixture();
  const store = createStore({ storage: null, persistence: disk.persistence });
  await store.ready; await store.loadFromJSON(envelope(subject));
  return { store, disk };
}

test('K2 catalogue selection validates L06 d100, L17 d10, L23 column bands, and printed renvoi tables', () => {
  const l06 = resolveCorruptionMutationSelection({ tableId: 'L06-corruption-physical', entryId: 'L06-PHY-20', result: 100 });
  assert.equal(l06.selection.min, 96); assert.equal(l06.selection.max, 100); assert.equal(l06.source.pdfPage, 189);
  const l17 = resolveCorruptionMutationSelection({ tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-10', result: 10 });
  assert.equal(l17.selection.min, 10); assert.equal(l17.source.pagePdf, 58);
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-10', result: 9 }), /ne correspond pas/);
  const l23 = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-physical');
  const row = l23.entries.find(entry => Object.values(entry.selection.ranges).some(value => value === '01-03'));
  const column = Object.entries(row.selection.ranges).find(([, value]) => value === '01-03')[0];
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: l23.id, entryId: row.id, result: 4, column }), /ne correspond pas/);
  const resolved = resolveCorruptionMutationSelection({ tableId: l23.id, entryId: row.id, result: 2, column });
  assert.equal(resolved.selection.ranges[column], '01-03');
  assert.equal(resolved.source.livre, 'L23 — Enemy in Shadows Companion');
  const beastHeadTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-beast-head');
  const beastHead = resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: beastHeadTable.entries[0].id, result: 1, column: 'any' });
  assert.equal(beastHead.tableRenvoiFrom, 'l23-physical:Beast Head');
  assert.equal(beastHead.referenceF2, 'F-L23-0202');
  assert.equal(beastHead.effects.length, 0, 'no effect is derived or applied from the paraphrase');
  const snake = beastHeadTable.entries.find(entry => entry.label === 'Snake');
  assert.equal(resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 0, column: 'any' }).entryId, snake.id, 'printed 00 is represented as zero in L23 d100 columns');
  assert.equal(resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 99, column: 'any' }).entryId, snake.id, 'cyclic 96–00 range includes 99');
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: beastHeadTable.id, entryId: snake.id, result: 95, column: 'any' }), /ne correspond pas/);
  const fixationTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-fixations');
  const parentTable = V5_CORRUPTION_MUTATION_CATALOG.find(table => table.id === 'l23-mental');
  const parentEntry = parentTable.entries.find(entry => fixationTable.selection.renvoiDepuis.includes(entry.label));
  assert.throws(() => resolveCorruptionMutationSelection({ tableId: fixationTable.id, entryId: fixationTable.entries[0].id, result: 2 }), /Choisissez explicitement/);
  const fixation = resolveCorruptionMutationSelection({ tableId: fixationTable.id, entryId: fixationTable.entries[0].id, result: 2, renvoiParentEntryId: parentEntry.id });
  assert.equal(fixation.renvoiParent.entryId, parentEntry.id);
  assert.equal(fixation.domain, 'mental', 'the selected parent entry determines the referenced mental table context');
});

test('K2 catalog confirmation is attached once to pending K1 mutation and respects its domain', async () => {
  const subject = { ...participant, extensions: { v5: {
    corruptionPoints: 7,
    pendingCorruptionMutation: { id: 'pending-k1', status: 'pending', domain: 'physical', manifestation: { days: 9, visibility: 'gm-only' } }
  } } };
  const { store, disk } = await makeStore(subject);
  let status = store.getCorruptionStatus('hero');
  assert.equal((await store.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: status.baseRevision
  })).status, 'confirmed');
  status = store.getCorruptionStatus('hero');
  assert.equal(status.corruptionPoints, 4, 'K1 deduction occurs once at explicit confirmation');
  assert.equal(status.mutations.length, 1);
  assert.equal(status.mutations[0].entryId, 'L06-PHY-01');
  assert.equal(status.mutations[0].source.pdfPage, 189);
  assert.equal(status.mutations[0].effectsApplied, false);
  await assert.rejects(store.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: status.baseRevision
  }), /ne correspond pas au domaine|Mutation en attente absente/, 'there is no pending K1 action left to double confirm');
  await store.undo(); assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 7);
  await store.redo(); assert.equal(store.getCorruptionStatus('hero').corruptionPoints, 4);
  const reloaded = createStore({ storage: null, persistence: disk.persistence }); await reloaded.ready;
  assert.equal(reloaded.getCorruptionStatus('hero').mutations[0].entryId, 'L06-PHY-01');
  assert.equal(reloaded.getCorruptionStatus('hero').mutations[0].source.pdfPage, 189);

  const mismatchSubject = { ...subject, extensions: { v5: { ...subject.extensions.v5, pendingCorruptionMutation: { ...subject.extensions.v5.pendingCorruptionMutation, domain: 'mental' } } } };
  const { store: mismatch } = await makeStore(mismatchSubject);
  await assert.rejects(mismatch.confirmCorruptionMutation('hero', {
    catalogSelection: { tableId: 'L06-corruption-physical', entryId: 'L06-PHY-01', result: 1 }, baseRevision: mismatch.getCorruptionStatus('hero').baseRevision
  }), /ne correspond pas au domaine/);
  assert.equal(mismatch.getCorruptionStatus('hero').mutations.length, 0);
});

test('K2 untyped L17 selection requires an explicit matching compatibility decision and persists it', async () => {
  const catalogSelection = { tableId: 'l17-marks-hysh', entryId: 'l17-mark-hysh-01', result: 1 };
  for (const domain of ['physical', 'mental']) {
    const subject = { ...participant, extensions: { v5: {
      corruptionPoints: 7,
      pendingCorruptionMutation: { id: `pending-${domain}`, status: 'pending', domain, manifestation: { days: 7 } }
    } } };
    const { store, disk } = await makeStore(subject);
    let status = store.getCorruptionStatus('hero');
    await assert.rejects(store.confirmCorruptionMutation('hero', { catalogSelection, baseRevision: status.baseRevision }), /Choisissez explicitement/);
    await assert.rejects(store.confirmCorruptionMutation('hero', { catalogSelection, compatibilityDomain: domain === 'physical' ? 'mental' : 'physical', baseRevision: status.baseRevision }), /ne correspond pas au domaine/);
    assert.equal(store.getCorruptionStatus('hero').mutations.length, 0, 'missing or mismatched compatibility does not mutate state');
    status = store.getCorruptionStatus('hero');
    assert.equal((await store.confirmCorruptionMutation('hero', { catalogSelection, compatibilityDomain: domain, baseRevision: status.baseRevision })).status, 'confirmed');
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.domain, domain, 'the authoritative K1 domain is preserved');
    assert.equal(mutation.compatibilityDecision.domain, domain);
    assert.equal(mutation.compatibilityDecision.decidedBy, 'gm');
    assert.equal(mutation.tableFamily, 'Marques du Vent Hysh');
    await store.undo();
    assert.equal(store.getCorruptionStatus('hero').mutations.length, 0);
    assert.equal(store.getCorruptionStatus('hero').pendingMutation.domain, domain);
    await store.redo();
    assert.equal(store.getCorruptionStatus('hero').mutations[0].compatibilityDecision.domain, domain);
    const reloaded = createStore({ storage: null, persistence: disk.persistence }); await reloaded.ready;
    const afterReload = reloaded.getCorruptionStatus('hero').mutations[0];
    assert.equal(afterReload.domain, domain);
    assert.equal(afterReload.compatibilityDecision.domain, domain);
    assert.equal(afterReload.tableId, 'l17-marks-hysh');
  }
});

test('K2 UI confirms the table line as part of the pending K1 mutation', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-ui', status: 'pending', domain: 'physical', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    assert.ok(button); assert.ok(resultField);
    resultField.value = '1'; resultField.listeners.input();
    await button.click();
    const status = store.getCorruptionStatus('hero');
    assert.equal(status.corruptionPoints, 4); assert.equal(status.mutations.length, 1);
    assert.equal(status.mutations[0].entryId, 'L06-PHY-01'); assert.equal(status.mutations[0].effectsApplied, false);
  } finally { globalThis.document = originalDocument; }
});

test('K2 UI exposes the printed L23 Fixations renvoi and persists its selected mental parent', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-fixation', status: 'pending', domain: 'mental', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const findControl = (rendered, label) => rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent === label)?.children[1];
    let rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    let table = findControl(rendered, 'Table source');
    table.value = 'l23-fixations'; await table.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const parent = findControl(rendered, 'Ligne parente du renvoi');
    assert.ok(parent, 'Fixations requires one of its printed parent rows');
    assert.equal(findControl(rendered, 'Compatibilité décidée par le MJ'), undefined, 'the explicit parent row resolves the mental domain');
    parent.value = 'l23-mutations mentales-12'; await parent.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    const button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    resultField.value = '2'; resultField.listeners.input(); await button.click();
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.domain, 'mental'); assert.equal(mutation.tableId, 'l23-fixations');
    assert.equal(mutation.renvoiParent.tableId, 'l23-mental');
    assert.equal(mutation.renvoiParent.entryId, 'l23-mutations mentales-12');
  } finally { globalThis.document = originalDocument; }
});

test('K2 UI leaves L17 compatibility blank and requires the MJ to choose it', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.textContent = ''; }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    async click() { return this.disabled ? undefined : this.listeners.click?.(); }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const subject = { ...participant, extensions: { v5: { corruptionPoints: 7,
      pendingCorruptionMutation: { id: 'pending-k1-l17-ui', status: 'pending', domain: 'physical', manifestation: { days: 8 } } } } };
    const { store } = await makeStore(subject);
    const panel = createV5CorruptionPanel({ Store: store });
    const findControl = (rendered, label) => rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent === label)?.children[1];
    let rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const table = findControl(rendered, 'Table source'); table.value = 'l17-marks-hysh'; await table.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    let decision = findControl(rendered, 'Compatibilité décidée par le MJ');
    assert.equal(decision.value, '', 'no compatibility default is supplied');
    let button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    assert.equal(button.disabled, true, 'confirmation is blocked until compatibility is chosen');
    decision.value = 'physical'; await decision.listeners.change();
    rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
    const resultField = rendered.children.find(child => child.tag === 'label' && child.children[0]?.textContent?.startsWith('Résultat imprimé'))?.children[1];
    button = rendered.children.find(child => child.tag === 'button' && child.textContent === 'Confirmer la mutation en attente avec cette entrée');
    resultField.value = '1'; resultField.listeners.input(); await button.click();
    const mutation = store.getCorruptionStatus('hero').mutations[0];
    assert.equal(mutation.compatibilityDecision.domain, 'physical');
    assert.equal(mutation.domain, 'physical');
    assert.equal(mutation.tableFamily, 'Marques du Vent Hysh');
  } finally { globalThis.document = originalDocument; }
});
