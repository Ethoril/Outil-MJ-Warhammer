// U8 Q19 : le panneau pose les questions d'États de la magie (conditionNeeds) et renvoie la réponse du MJ ; sans réponse, comportement d'avant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionQuestions, renderConditionQuestions } from '../../../js/ui/resolution-panel/condition-questions.js';
import { prepareMagicOptions } from '../../../js/core/v5-magic-talents.js';

const mage = states => ({ id: 'mage', name: 'mage', kind: 'PJ', camp: 'pj', zone: 'active', hp: 10, maxHp: 10,
  caracs: { CC: 30, CT: 30, F: 30, E: 30, I: 30, Ag: 30, Dex: 30, Int: 40, FM: 40, Soc: 30, M: 4 }, states, talents: [], skills: [], equipment: [], traits: [], extensions: { v5: { specialStates: {} } } });
const penalty = prepared => prepared.slModifiers.find(row => row.id === 'magic-condition-penalty')?.amount ?? 0;

function fakeDom() {
  const el = tag => ({ tag, className: '', textContent: '', dataset: {}, children: [], listeners: {}, value: '', options: [],
    setAttribute() {}, append(...c) { for (const x of c) if (x.isOption) this.options.push(x); else this.children.push(x); },
    appendChild(c) { this.children.push(c); }, addEventListener(type, fn) { this.listeners[type] = fn; } });
  globalThis.document = { createElement: el };
  globalThis.Option = function (text, value) { return { isOption: true, text, value }; };
}
const cleanDom = () => { delete globalThis.document; delete globalThis.Option; };

test('sans réponse : Brisé est une question et ne pèse pas ; la question s’affiche', () => {
  const prepared = prepareMagicOptions(mage([{ key: 'brise', name: 'Brisé', level: 2 }]), 'casting', { conditionContext: {} });
  assert.equal(penalty(prepared), 0);
  assert.deepEqual(conditionQuestions(prepared.conditionNeeds).map(q => q.field), ['runningOrHiding']);
  fakeDom();
  try {
    assert.equal(renderConditionQuestions({ conditionNeeds: [] }, {}, {}), null);
    const box = renderConditionQuestions({ conditionNeeds: prepared.conditionNeeds }, {}, {});
    assert.equal(box.children.length, 1);
    assert.equal(box.children[0].children[0].options.length, 3);
  } finally { cleanDom(); }
});

test('avec réponse : le choix du MJ part dans magicConditionContext, le Test se recalcule, la pénalité s’applique', () => {
  fakeDom();
  try {
    const calls = [];
    const handlers = { select: patch => calls.push(['select', patch]), calculate: () => calls.push(['calculate']) };
    const box = renderConditionQuestions({ conditionNeeds: ['Préciser si le Test sert à fuir ou se cacher.'] }, { magicConditionContext: { involvesMovement: true } }, handlers);
    const select = box.children[0].children[0];
    select.value = 'false';
    select.listeners.change();
    assert.deepEqual(calls, [['select', { magicConditionContext: { involvesMovement: true, runningOrHiding: false } }], ['calculate']]);
    const answered = prepareMagicOptions(mage([{ key: 'brise', name: 'Brisé', level: 2 }]), 'casting', { conditionContext: calls[0][1].magicConditionContext });
    assert.equal(penalty(answered), -2);
    assert.deepEqual(answered.conditionNeeds, []);
  } finally { cleanDom(); }
});

test('États mixtes : la question du mode a ses deux réponses, À terre en Désavantage ou Sonné en DR', () => {
  const states = [{ key: 'sonne', name: 'Sonné', level: 1 }, { key: 'aterre', name: 'À terre', level: 1 }];
  const ctx = { involvesMovement: true };
  const open = prepareMagicOptions(mage(states), 'dispel', { conditionContext: ctx });
  assert.deepEqual(conditionQuestions(open.conditionNeeds).map(q => [q.field, q.kind]), [['conditionPenaltyMode', 'mode']]);
  assert.equal(penalty(prepareMagicOptions(mage(states), 'dispel', { conditionContext: { ...ctx, conditionPenaltyMode: 'sl' } })), -1);
  assert.equal(penalty(prepareMagicOptions(mage(states), 'dispel', { conditionContext: { ...ctx, conditionPenaltyMode: 'disadvantage' } })), 0);
});

test('recette 06/11 : la question répondue reste visible avec sa réponse, et le détail montre le Désavantage « À terre »', async () => {
  const { visibleConditionQuestions, conditionDetailLines } = await import('../../../js/ui/resolution-panel/condition-questions.js');
  const actor = mage([{ key: 'aterre', name: 'À terre', level: 1 }]);
  const open = prepareMagicOptions(actor, 'casting', { conditionContext: {} });
  assert.deepEqual(visibleConditionQuestions(open.conditionNeeds, {}).map(q => q.field), ['involvesMovement']);
  const answered = prepareMagicOptions(actor, 'casting', { conditionContext: { involvesMovement: true } });
  assert.deepEqual(answered.conditionNeeds, []);
  assert.deepEqual(visibleConditionQuestions(answered.conditionNeeds, { involvesMovement: true }).map(q => q.field), ['involvesMovement']);
  fakeDom();
  try {
    const calls = [];
    const box = renderConditionQuestions({ conditionNeeds: [] }, { magicConditionContext: { involvesMovement: true } }, { select: p => calls.push(p), calculate: () => calls.push('calc') });
    const select = box.children[0].children[0];
    assert.equal(select.value, 'true');
    select.value = '';
    select.listeners.change();
    assert.deepEqual(calls, [{ magicConditionContext: { involvesMovement: undefined } }, 'calc']);
  } finally { cleanDom(); }
  const lines = conditionDetailLines({ conditionDisadvantages: answered.disadvantageSources, conditionModifiers: answered.slModifiers });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^Désavantage : .*terre/i);
  const pen = conditionDetailLines({ conditionModifiers: [{ id: 'magic-condition-penalty', label: 'Pénalité d’État', amount: -2 }] });
  assert.deepEqual(pen, ['Pénalité d’État (État) : −2 DR']);
});
