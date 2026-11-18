// L3 des miracles narratifs : bouton du Test imposé `manual` (Effrayer l'Ennemi, puis Portal's Threshold en L4) dans les prières
// actives du panneau divin. Le DOM est un faux arbre ; un Store sans la commande ne fait rien planter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderImposedTestControls, renderDivineZoneControls, renderDivineCounterControls } from '../../../js/ui/v5-divine-panel.js';

class El {
  constructor(tag) { Object.assign(this, { tagName: tag, children: [], options: [], dataset: {}, attrs: {}, listeners: {}, className: '', value: '', disabled: false, hidden: false, _text: '' }); }
  append(...items) { for (const item of items) if (item != null) (item.isOption ? this.options : this.children).push(item); }
  appendChild(item) { this.append(item); return item; }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type) { return Promise.all((this.listeners[type] || []).map(fn => fn({ preventDefault() {}, target: this }))); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
}
const withDom = async work => {
  const old = { document: globalThis.document, Option: globalThis.Option };
  globalThis.document = { createElement: tag => new El(tag), body: new El('body'), activeElement: null };
  globalThis.Option = class { constructor(text, value) { Object.assign(this, { isOption: true, text, value }); } };
  try { return await work(); } finally { Object.assign(globalThis, old); }
};
const all = (root, predicate, found = []) => { if (predicate(root)) found.push(root); for (const child of root.children || []) all(child, predicate, found); return found; };
const buttonNamed = (root, pattern) => all(root, el => el.tagName === 'button' && pattern.test(el.textContent))[0];

const participants = [
  { id: 'priest', name: 'Prêtre', camp: 'pj' },
  { id: 'ally', name: 'Allié', camp: 'pj' },
  { id: 'foe', name: 'Orque', camp: 'ennemi' }
];
const layer = { id: 'exec:priest:dismay:imposed-test', type: 'imposed-test', casterId: 'priest', targetId: 'priest',
  imposedTest: { label: 'Effrayer l’Ennemi', when: 'manual', subjects: 'enemies', test: { skill: 'calm', slModifier: 0 }, resolved: {} } };

test('Test imposé manuel : un bouton, un choix des ennemis seulement, un d100 ; la commande reçoit le jet', () => withDom(async () => {
  const calls = [];
  const Store = { resolveDivineImposedTest: async (...args) => { calls.push(args); return { ok: true }; } };
  const box = new El('div');
  renderImposedTestControls(box, { layer, participants, Store, onDone: () => {} });
  const button = buttonNamed(box, /Test imposé/);
  assert.ok(button, 'bouton présent');
  const select = all(box, el => el.tagName === 'select')[0];
  assert.deepEqual(select.options.map(option => option.value), ['', 'foe']);
  const roll = all(box, el => el.tagName === 'input')[0];
  select.value = 'foe'; roll.value = '87';
  await button.fire('click');
  assert.deepEqual(calls, [['foe', layer.id, { roll: 87 }]]);
}));

test('camps lus comme le reste de l’outil : « allie » et PJ sans camp ne sont pas des ennemis', () => withDom(async () => {
  const box = new El('div');
  const people = [...participants, { id: 'amie', name: 'Amie', camp: 'allie' }, { id: 'pj2', name: 'PJ2', kind: 'PJ', camp: 'PJ' }, { id: 'pj3', name: 'PJ3', kind: 'PJ' }];
  renderImposedTestControls(box, { layer, participants: people, Store: {}, onDone: () => {} });
  assert.deepEqual(all(box, el => el.tagName === 'select')[0].options.map(option => option.value), ['', 'foe']);
}));

test('Store sans la méthode : aucun plantage, message en français', () => withDom(async () => {
  const box = new El('div');
  renderImposedTestControls(box, { layer, participants, Store: {}, onDone: () => {} });
  const select = all(box, el => el.tagName === 'select')[0];
  const roll = all(box, el => el.tagName === 'input')[0];
  select.value = 'foe'; roll.value = '40';
  await assert.doesNotReject(() => buttonNamed(box, /Test imposé/).fire('click'));
  assert.match(box.textContent, /indisponible/);
}));

test('couche récurrente ou déjà résolue : libellé sans bouton manuel', () => withDom(async () => {
  const box = new El('div');
  renderImposedTestControls(box, { layer: { ...layer, imposedTest: { ...layer.imposedTest, when: 'round', label: 'Vent sauvage' } }, participants, Store: {} });
  assert.equal(buttonNamed(box, /Test imposé/), undefined);
  assert.match(box.textContent, /Vent sauvage/);
}));

const zoneLayer = { id: 'exec:priest:pax:divine-zone', type: 'divine-zone', casterId: 'priest', targetId: 'priest', zone: { label: 'Paix de Taal', radius: 60, members: ['foe'], excludes: ['attack'] } };

test('Zone divine : une case par participant (présents cochés), la commande reçoit la liste', () => withDom(async () => {
  const calls = [];
  const Store = { setDivineZoneMembers: async (...args) => { calls.push(args); return { ok: true }; } };
  const box = new El('div');
  renderDivineZoneControls(box, { layer: zoneLayer, participants, Store, onDone: () => {} });
  const checks = all(box, el => el.tagName === 'input');
  assert.deepEqual(checks.map(el => [el.dataset.participantId, el.checked]), [['ally', false], ['foe', true]]);
  checks[0].checked = true;
  await buttonNamed(box, /Enregistrer la présence/).fire('click');
  assert.deepEqual(calls, [['priest', zoneLayer.id, ['ally', 'foe']]]);
}));

test('Zone divine, Store sans la méthode : aucun plantage, message en français', () => withDom(async () => {
  const box = new El('div');
  renderDivineZoneControls(box, { layer: zoneLayer, participants, Store: {}, onDone: () => {} });
  await buttonNamed(box, /Enregistrer la présence/).fire('click');
  assert.match(box.textContent, /commande absente/);
}));


const counterLayer = { id: 'exec:priest:force:miracle-counter', type: 'miracle-counter', casterId: 'priest', targetId: 'priest',
  counter: { key: 'force', label: 'Forcer la main du hasard', value: 2, min: 0, push: { threshold: 6, step: 1 } } };
const flagLayer = { id: 'exec:ally:vanquish:miracle-counter', type: 'miracle-counter', casterId: 'priest', targetId: 'ally',
  flag: { key: 'hatred-kill', label: 'A tué un ennemi visé', set: false } };

test('Compteur divin : état affiché, la dépense et le jet de 1d10 appellent le Store avec la couche du porteur', () => withDom(async () => {
  const calls = [];
  const Store = { spendDivineCounter: async (...args) => { calls.push(['spend', ...args]); return { ok: true }; }, pushDivineCounter: async (...args) => { calls.push(['push', ...args]); return { ok: true }; } };
  const box = new El('div');
  renderDivineCounterControls(box, { layer: counterLayer, Store, onDone: () => {} });
  assert.match(box.textContent, /Forcer la main du hasard : 2 DR en réserve/);
  const [amount, roll] = all(box, el => el.tagName === 'input');
  amount.value = '2'; roll.value = '4';
  await buttonNamed(box, /Dépenser/).fire('click');
  await buttonNamed(box, /Jet de 1d10/).fire('click');
  assert.deepEqual(calls, [['spend', 'priest', counterLayer.id, 2], ['push', 'priest', counterLayer.id, 4]]);
}));

test('Compteur divin, Store sans la méthode : aucun plantage, message en français', () => withDom(async () => {
  const box = new El('div');
  renderDivineCounterControls(box, { layer: counterLayer, Store: {}, onDone: () => {} });
  await assert.doesNotReject(() => buttonNamed(box, /Dépenser/).fire('click'));
  assert.match(box.textContent, /commande absente/);
}));

test('Case divine : cocher appelle setDivineFlag sur le porteur', () => withDom(async () => {
  const calls = [];
  const box = new El('div');
  renderDivineCounterControls(box, { layer: flagLayer, Store: { setDivineFlag: async (...args) => { calls.push(args); return { ok: true }; } }, onDone: () => {} });
  const check = all(box, el => el.tagName === 'input')[0];
  check.checked = true;
  await check.fire('change');
  assert.deepEqual(calls, [['ally', flagLayer.id, true]]);
  assert.match(box.textContent, /A tué un ennemi visé/);
}));
