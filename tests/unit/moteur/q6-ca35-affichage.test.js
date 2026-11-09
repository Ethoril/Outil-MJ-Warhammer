import test from 'node:test';
import assert from 'node:assert/strict';
import { renderObstinateChoice } from '../../../js/ui/test-questions.js';
import { renderSpellOptions } from '../../../js/ui/v5-spell-options.js';

test('Obstiné indisponible : seul son choix est grisé et le motif est lisible', () => {
  const oldDocument = globalThis.document, oldOption = globalThis.Option;
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; }
    append(...items) { this.children.push(...items); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener() {}
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; this.disabled = false; } };
  try {
    const actor = { id: 'a', talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] };
    const choice = renderObstinateChoice(actor, 'none', () => {}, { status: { available: false, reason: 'Déjà utilisé cette séance.' } });
    const select = choice.children.find(child => child.tagName === 'select');
    assert.equal(select.children[0].disabled, false);
    assert.equal(select.children[1].disabled, true);
    assert.ok(choice.children.some(child => child.textContent === 'Déjà utilisé cette séance.'));
  } finally { globalThis.document = oldDocument; globalThis.Option = oldOption; }
});

test('la résistance et le second Test du sort proposent chacun Obstiné pour la cible', () => {
  const oldDocument = globalThis.document, oldOption = globalThis.Option;
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.append(item); return item; }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener() {}
  }
  globalThis.document = { createElement: tag => new Element(tag) };
  globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
  try {
    const actor = { id: 'mage', talents: [] };
    const target = { id: 'foe', name: 'Orc', talents: [{ id: 'talent-strong-minded', status: 'resolved', rank: 1 }] };
    const contract = { effects: { secondaryTest: { actor: 'target', skill: 'Résistance', rollField: 'resistanceRoll' }, followupTest: { skill: 'Calme', rollField: 'calmRoll', modifierSl: 0 } } };
    const nodes = renderSpellOptions({ actor, participants: [actor, target], contract, targetIds: ['foe'], draft: {}, handlers: {}, getObstinateStatus: () => ({ available: true }) });
    const selectors = nodes.flatMap(node => node.children || []).filter(node => node.tagName === 'select' && node.dataset.focusKey?.startsWith('spell-obstinate-'));
    assert.deepEqual(selectors.map(node => node.dataset.focusKey), ['spell-obstinate-resistance:foe', 'spell-obstinate-followup:foe']);
  } finally { globalThis.document = oldDocument; globalThis.Option = oldOption; }
});
