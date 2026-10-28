import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/core/store.js';
import { openV5FateDialog } from '../js/ui/v5-fate-dialog.js';
import { renderResolutionPanel } from '../js/ui/resolution-panel.js';

const profile = (id, extra = {}) => ({
  id, name: id, kind: 'PJ', camp: 'pj', hp: 20, maxHp: 20, fortune: 3,
  extensions: { v5: { fate: 3 } }, caracs: { CC: 50, Ag: 40, E: 30, FM: 50 },
  skills: [], talents: [], states: [], equipment: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, ...extra
});

async function launched() {
  const store = createStore({ storage: null }); await store.ready;
  await store.addProfile(profile('named-pj'));
  await store.addProfile(profile('anonymous-template', { kind: 'PNJ', camp: 'ennemi' }));
  await store.savePersistentCharacter({ id: 'named-character', name: 'Named PJ', hp: 20, maxHp: 20, extensions: { v5: { fate: 3 } } });
  await store.saveEncounter({ id: 'fate-review', title: 'Reprise Destin', entries: [
    { id: 'named-entry', profileId: 'named-pj', persistentCharacterId: 'named-character', zone: 'active' },
    { id: 'anonymous-entry', profileId: 'anonymous-template', zone: 'active' }
  ] });
  await store.launchEncounter('fate-review');
  const named = store.listParticipants().find(row => row.profileId === 'named-pj');
  const anonymous = store.listParticipants().find(row => row.profileId === 'anonymous-template');
  await store.setFortune(named.id, 3);
  await store.setFortune(anonymous.id, 3);
  return store;
}

test('counter-review: Destiny dialog exposes and submits the V4 permanent Resilience loss control', async () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.style = {}; this.checked = false; this.value = ''; this.isConnected = true; }
    append(...items) { this.children.push(...items); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    focus() {}
    showModal() {}
    close() { this.listeners.close?.(); }
  }
  const body = new Element('body');
  globalThis.document = { activeElement: null, body, createElement: tag => new Element(tag) };
  try {
    let submitted;
    const promise = openV5FateDialog({
      participantName: 'Elyse', fate: { balance: 3, permanent: 3, legacyResilience: true, baseRevision: 7 },
      getCurrentRevision: () => 7, submit: async (amount, options) => { submitted = { amount, options }; return { ok: true }; }
    });
    const dialog = body.children[0], form = dialog.children[0];
    const checkbox = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type === 'checkbox');
    assert.ok(checkbox, 'the UI must render a checkbox for converted V4 profiles');
    checkbox.checked = true;
    const amount = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type === 'number');
    const reason = form.children.flatMap(child => child.children || []).find(child => child.tag === 'input' && child.type !== 'checkbox' && child.type !== 'number');
    amount.value = '1'; reason.value = 'Perte actée par le MJ';
    await form.listeners.submit({ preventDefault() {} });
    await promise;
    assert.equal(submitted.amount, 1);
    assert.equal(submitted.options.permanentResilienceLoss, true);
  } finally { globalThis.document = originalDocument; }
});

test('counter-review: named persistent and anonymous profile copies keep independent Chance and Destin', async () => {
  const store = await launched();
  const before = store.listParticipants();
    const named = before.find(row => row.persistentCharacterId === 'named-character'), anonymous = before.find(row => row.profileId === 'anonymous-template');
  assert.equal(named.persistentCharacterId, 'named-character');
  assert.equal(anonymous.persistentCharacterId, null);
  await store.setFate(named.id, 2, { reason: 'Correction MJ' });
  assert.equal(store.listParticipants().find(row => row.id === named.id).extensions.v5.fate, 2);
  assert.equal(store.listPersistentCharacters().find(row => row.id === 'named-character').extensions.v5.fate, 2);
  assert.equal(store.getProfile('named-pj').extensions.v5.fate, 3, 'the template remains a profile, not the persistent person');
  const anonymousFate = store.previewResolution({ actorId: anonymous.id, action: { type: 'test', attr: 'CC', base: 50 }, roll: 44, v5: { kind: 'test', context: { fateAction: 'automatic-success', fateChosenRoll: 44 } } });
  assert.equal(anonymousFate.ready, true, anonymousFate.unresolved?.join('; '));
  await store.applyResolution(anonymousFate);
  assert.equal(store.listParticipants().find(row => row.id === anonymous.id).extensions.v5.fate, 2);
  assert.equal(store.getProfile('anonymous-template').extensions.v5.fate, 3);
  const spendChance = store.previewResolution({ actorId: anonymous.id, action: { type: 'test', attr: 'CC', base: 50 }, roll: 44, v5: { kind: 'test', fortuneForAdvantage: true } });
  await store.applyResolution(spendChance);
  assert.equal(store.getFortune(anonymous.id).balance, 2);
  assert.equal(store.getProfile('anonymous-template').fortune, 3);
});

test('counter-review UI: Chance → Avantage is locked after a d100 is entered or previewed', () => {
  const originalDocument = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.classList = { add() {}, remove() {}, contains() { return false; } }; this.childNodes = this.children; }
    get lastChild() { return this.children.at(-1); }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); }
    prepend(...items) { this.children.unshift(...items); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  try {
    const actor = { id: 'actor', name: 'MJ', camp: 'pj', kind: 'PJ', zone: 'active', caracs: { CC: 50, E: 30, Ag: 40 }, extensions: { v5: {} } };
    const action = { id: 'test', type: 'test', attr: 'CC', base: 50 };
    const render = draft => renderResolutionPanel({ draft, actor, participants: [actor], actions: [action], actionKey: 'test', type: 'test', target: null, groups: { allies: [], adversaries: [] }, defense: { options: [], option: { value: 'CC', statLabel: 'CC' } }, canCalculate: true, canApply: true, handlers: { select() {}, input() {}, roll() {}, calculate() {}, compare() {}, choose() {}, apply() {}, cancel() {} } });
    for (const draft of [{ attackRoll: '44' }, { attackRoll: '44', preview: { ready: true } }]) {
      const panel = render(draft), inputs = [];
      const visit = item => { if (item?.tag === 'input') inputs.push(item); for (const child of item?.children || []) visit(child); };
      visit(panel);
      const checkbox = inputs.find(input => input.attributes?.['aria-label']?.includes('Avantage avant le jet'));
      assert.ok(checkbox, 'the Chance → Avantage option stays visible with its state');
      assert.equal(checkbox.disabled, true);
    }
  } finally { globalThis.document = originalDocument; delete globalThis.Option; }
});
