// Interface des Traits calculés (docs/specs/traits-calculs, lot L6) : demandes avec bouton de dé, demande `choice` en Oui/Non,
// blocs de la fiche, marqueurs et pastilles. Le DOM est un faux arbre ; aucune règle n'est simulée (le moteur est réel).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openV5EffectInputDialog } from '../../../js/ui/v5-effect-dialog.js';
import { renderResult, renderTraitPlanRequests } from '../../../js/ui/resolution-panel/result.js';
import { buildEncounterBlock, bindEncounterBlock, buildTraitStatusBlock, buildBodyIntactControl, readBodyIntact } from '../../../js/ui/creature-states-block.js';
import { resolveTraitAnswer, traitRequest } from '../../../js/core/trait-effects.js';

class El {
  constructor(tag) { Object.assign(this, { tagName: tag, children: [], options: [], dataset: {}, attrs: {}, listeners: {}, className: '', value: '', checked: false, disabled: false, hidden: false, _text: '' }); }
  append(...items) { for (const item of items) if (item != null) (item.isOption ? this.options : this.children).push(item); }
  appendChild(item) { this.append(item); return item; }
  replaceChildren(...items) { this.children = []; this.options = []; this.append(...items); }
  after() {} remove() {} focus() {} showModal() {} show() {}
  close() { for (const fn of this.listeners.close || []) fn(); }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key]; }
  matches(selector) { return selector.split(',').some(part => part.trim().startsWith('.') && this.className.split(' ').includes(part.trim().slice(1))); }
  querySelector() { return null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type, event = {}) { return Promise.all((this.listeners[type] || []).map(fn => fn({ preventDefault() {}, target: this, ...event }))); }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
}
const withDom = async work => {
  const old = { document: globalThis.document, Option: globalThis.Option, random: Math.random };
  const body = new El('body');
  globalThis.document = { createElement: tag => new El(tag), body, activeElement: null };
  globalThis.Option = class { constructor(text, value) { Object.assign(this, { isOption: true, text, value }); } };
  try { return await work(body); } finally { Object.assign(globalThis, { document: old.document, Option: old.Option }); Math.random = old.random; }
};
const all = (root, predicate, found = []) => { if (!root) return found; if (predicate(root)) found.push(root); for (const child of root.children || []) all(child, predicate, found); return found; };
const byTag = (root, tag) => all(root, el => el.tagName === tag);
const buttonNamed = (root, pattern) => all(root, el => el.tagName === 'button' && pattern.test(el.textContent))[0];
const choose = (select, value) => { select.value = value; return select.fire('change'); };

const target = { score: 50, characteristic: 'Int', dr: 4, slModifiers: [], advantageSources: [], disadvantageSources: [] };
const pending = requests => ({ status: 'requires-input', requests, inputs: {}, baseRevision: 3 });
// Ouvre le dialogue, rend { dialog, form, outcome } ; `submit` reçoit les entrées et rend `done`.
async function open(requests, submit = async () => ({ ok: true })) {
  let captured = null;
  const outcome = openV5EffectInputDialog({ pending: pending(requests), submit: async (inputs, revision) => { captured = structuredClone(inputs); return submit(inputs, revision); }, getCurrentRevision: () => 3 });
  const dialog = document.body.children.at(-1);
  return { dialog, form: byTag(dialog, 'form')[0], outcome, captured: () => captured };
}
const submitForm = form => form.fire('submit');

test('une demande `choice` (Stupide guidé) s’affiche en Oui/Non et se résout, au lieu de boucler sur une saisie numérique', () => withDom(async () => {
  const request = traitRequest({ field: 'stupidGuided', kind: 'choice', participantId: 'orc', participantName: 'Orque', label: 'Orque · Stupide : un allié le guide-t-il ?' });
  const ctx = await open([request]);
  assert.equal(byTag(ctx.dialog, 'input').length, 0, 'aucune saisie numérique');
  const select = byTag(ctx.dialog, 'select')[0];
  assert.deepEqual(select.options.map(option => option.text), ['À préciser', 'Oui', 'Non']);
  await submitForm(ctx.form);
  assert.equal(ctx.captured(), null, 'sans choix, rien n’est envoyé');
  await choose(select, 'true');
  await submitForm(ctx.form);
  assert.deepEqual(ctx.captured(), { orc: { stupidGuided: true } });
  assert.deepEqual(resolveTraitAnswer(request, ctx.captured().orc.stupidGuided), { value: true }, 'le moteur accepte cette réponse');
  assert.equal((await ctx.outcome).ok, true);
}));

test('une réponse `choice` déjà donnée se relit Oui/Non, pas true/false (défaut relevé par L8)', () => withDom(async () => {
  const guided = traitRequest({ field: 'stupidGuided', kind: 'choice', participantId: 'orc', participantName: 'Orque', label: 'Orque · guidé ?' });
  const intTest = traitRequest({ field: 'stupidInt', kind: 'test', participantId: 'orc', participantName: 'Orque', label: 'Orque · Intelligence', testTarget: target });
  const ctx = await open([guided], async inputs => ({ ok: false, status: 'requires-input', requests: [intTest], inputs, baseRevision: 3 }));
  await choose(byTag(ctx.dialog, 'select')[0], 'true');
  await submitForm(ctx.form);
  const text = ctx.dialog.textContent;
  assert.match(text, /guidé \? : Oui/);
  assert.doesNotMatch(text, /guidé \? : true/);
}));

test('« Non » est une réponse valide pour une demande `choice`', () => withDom(async () => {
  const request = traitRequest({ field: 'stupidGuided', kind: 'choice', participantId: 'orc', label: 'Guidé ?' });
  const ctx = await open([request]);
  await choose(byTag(ctx.dialog, 'select')[0], 'false');
  await submitForm(ctx.form);
  assert.deepEqual(ctx.captured(), { orc: { stupidGuided: false } });
  assert.deepEqual(resolveTraitAnswer(request, false), { value: false });
}));

test('un Test avec `testTarget` a un bouton « Lancer d100 » qui donne le même résultat que la saisie', () => withDom(async () => {
  const request = traitRequest({ field: 'stupidIntelligence', kind: 'test', participantId: 'orc', label: 'Orque · Intelligence (+4 DR)', testTarget: target });
  Math.random = () => 0.295; // d100 = 30
  const rolled = await open([request]);
  const roll = buttonNamed(rolled.dialog, /Lancer d100/);
  assert.ok(roll, 'bouton de dé présent');
  await roll.fire('click');
  assert.equal(roll.disabled, true, 'un seul tirage par demande');
  await submitForm(rolled.form);
  const expected = resolveTraitAnswer(request, 30);
  assert.deepEqual(rolled.captured().orc.stupidIntelligence, expected);
  // Saisie du même résultat à la main : même valeur envoyée.
  const manual = await open([request]);
  const [success] = byTag(manual.dialog, 'select'), [sl] = byTag(manual.dialog, 'input');
  success.value = String(expected.success); sl.value = String(expected.sl);
  await submitForm(manual.form);
  assert.deepEqual(manual.captured().orc.stupidIntelligence, expected);
}));

test('un Test sans `testTarget` garde la saisie seule (CA0) ; un d10 garde son bouton', () => withDom(async () => {
  const bare = await open([{ field: 'enduranceTest', kind: 'test', participantId: 'p', label: 'Endurance' }]);
  assert.equal(buttonNamed(bare.dialog, /Lancer/), undefined);
  const d10 = await open([traitRequest({ field: 'corrosive', kind: 'd10', participantId: 'p', label: 'Sang corrosif' })]);
  assert.ok(buttonNamed(d10.dialog, /Lancer d10/));
}));

test('le panneau de résultat montre chaque demande à la blessure avec son bouton de dé et sa saisie, valeurs équivalentes', () => withDom(async () => {
  const requests = [
    traitRequest({ field: 'corrosiveRoll', kind: 'd10', participantId: 'acid', participantName: 'Acide', label: 'Acide · Sang corrosif' }),
    traitRequest({ field: 'infectedEndurance', kind: 'test', participantId: 'hero', participantName: 'Héros', label: 'Héros · Endurance (+4 DR)', testTarget: target })
  ];
  const selected = [];
  let calculated = 0;
  const handlers = { select: patch => selected.push(patch), calculate: () => { calculated += 1; } };
  const panel = renderTraitPlanRequests(requests, { v5Context: {} }, handlers);
  const d10 = buttonNamed(panel, /Lancer d10/), d100 = buttonNamed(panel, /Lancer d100/);
  assert.ok(d10 && d100);
  Math.random = () => 0.45; // d10 = 5, d100 = 46
  await d10.fire('click');
  assert.deepEqual(selected.at(-1).v5Context.traitInputs, { acid: { corrosiveRoll: 5 } });
  await d100.fire('click');
  assert.deepEqual(selected.at(-1).v5Context.traitInputs.hero.infectedEndurance, resolveTraitAnswer(requests[1], 46));
  assert.equal(calculated, 2, 'chaque réponse relance le calcul');
  assert.ok(selected.every(patch => patch.keepChoice === true), 'une réponse de Trait garde le choix de résultat déjà fait (défaut relevé par L8)');
  const typed = renderTraitPlanRequests([requests[0]], { v5Context: {} }, handlers);
  const input = byTag(typed, 'input')[0];
  input.value = '5'; await input.fire('change');
  assert.deepEqual(selected.at(-1).v5Context.traitInputs, { acid: { corrosiveRoll: 5 } }, 'saisie et tirage : même valeur');
  assert.equal(renderTraitPlanRequests([], { v5Context: {} }, handlers), null);
}));

const person = (id, traits = [], extra = {}) => ({ id, name: id, zone: 'active', camp: 'ennemi', hp: 10, maxHp: 10, caracs: { E: 30, M: 4 }, traits, states: [], extensions: { v5: {} }, ...extra });
const hero = person('hero', [], { camp: 'pj' });
const make = tag => document.createElement(tag);

test('bloc « Rencontre » : un bouton par Trait présent, rien sans Trait', () => withDom(async () => {
  assert.equal(buildEncounterBlock(make, person('plain'), [hero]), null);
  const wolf = person('wolf', [{ name: 'Effrayé', key: 'afraid' }, { name: 'Frénésie' }, { name: 'Affamé' }, { name: 'Bestial' }]);
  const block = buildEncounterBlock(make, wolf, [wolf, hero]);
  for (const text of [/Rencontre/, /Entrer en Frénésie/, /Cadavre frais/, /protège ses petits/, /acculé/]) assert.match(block.textContent, text);
}));

test('Vampirique : Blessures pré-remplies, Morsure et proie à cocher ; Se cabrer pour une monture', () => withDom(async () => {
  const vamp = person('vamp', [{ name: 'Vampirique' }], { extensions: { v5: { mountOf: 'hero' } } });
  const block = buildEncounterBlock(make, vamp, [vamp, hero], { lastWounds: 4 });
  assert.equal(all(block, el => el.className.includes('vampiric-wounds'))[0].value, '4');
  assert.equal(all(block, el => el.tagName === 'input' && el.type === 'checkbox').length >= 2, true);
  assert.match(block.textContent, /Se cabrer/);
}));

test('sans les méthodes du Store, un clic ne plante pas et prévient le MJ', () => withDom(async () => {
  const wolf = person('wolf', [{ name: 'Frénésie' }, { name: 'Affamé' }]);
  const block = buildEncounterBlock(make, wolf, [wolf, hero]);
  const messages = [];
  bindEncounterBlock(block, { Store: {}, participant: wolf, notify: message => messages.push(message), ask: async () => null, refresh: () => {} });
  await buttonNamed(block, /Entrer en Frénésie/).fire('click');
  await buttonNamed(block, /Cadavre frais/).fire('click');
  assert.equal(messages.length, 2);
}));

test('un bouton qui demande un dé ouvre le dialogue puis rejoue la commande avec la réponse', () => withDom(async () => {
  const wolf = person('wolf', [{ name: 'Frénésie' }]);
  const block = buildEncounterBlock(make, wolf, [wolf, hero]);
  const request = traitRequest({ field: 'frenzyWill', kind: 'test', participantId: 'wolf', label: 'Volonté', testTarget: target });
  const calls = [];
  const Store = { enterTraitFrenzy: (id, { inputs } = {}) => { calls.push(inputs); return inputs ? { ok: true } : { ok: false, status: 'requires-input', requests: [request] }; } };
  const asked = [];
  bindEncounterBlock(block, { Store, participant: wolf, notify() {}, refresh() {}, ask: async (result, retry) => { asked.push(result.requests[0].field); return retry({ wolf: { frenzyWill: { success: true, sl: 1 } } }); } });
  await buttonNamed(block, /Entrer en Frénésie/).fire('click');
  assert.deepEqual(asked, ['frenzyWill']);
  assert.deepEqual(calls.at(-1), { wolf: { frenzyWill: { success: true, sl: 1 } } });
}));

test('marqueurs de la fiche : tour perdu, total d’Increvable, Bond', () => withDom(async () => {
  assert.equal(buildTraitStatusBlock(make, person('plain')), null);
  const marked = person('orc', [{ name: 'Stupide' }], { extensions: { v5: { lostTurn: { cause: 'stupid', sourceId: null, since: { round: 1, turnIndex: 0 } } } } });
  assert.match(buildTraitStatusBlock(make, marked).textContent, /Tour perdu.*passer outre/);
  const dead = person('undying', [{ name: 'Increvable' }], { hp: 0, extensions: { v5: { dead: true, dieHard: { total: 4, roundsLeft: 2, bodyIntact: true, ended: null } } } });
  assert.match(buildTraitStatusBlock(make, dead).textContent, /Increvable.*4.*6 DR/);
  const horse = person('horse', [{ name: 'Bond' }], { caracs: { E: 30, M: 6 } });
  assert.match(buildTraitStatusBlock(make, horse).textContent, /Bond : Charge, Saut, Sprint à 2 × Course/);
}));

test('case « corps intact » : seulement pour un porteur d’Increvable, lue par la décision de mort', () => withDom(async () => {
  assert.equal(buildBodyIntactControl(make, person('plain')), null);
  const control = buildBodyIntactControl(make, person('undying', [{ name: 'Increvable' }]));
  assert.equal(readBodyIntact(control), false);
  all(control, el => el.type === 'checkbox')[0].checked = true;
  assert.equal(readBodyIntact(control), true);
  assert.equal(readBodyIntact(null), false);
}));

test('constat 7 : la fiche convertit un refus ok:false du Store en message français, comme workspace-view', () => {
  const card = readFileSync('js/ui/card.js', 'utf8');
  assert.match(card, /import \{[^}]*userError[^}]*\} from '\.\/messages\.js'/);
  assert.match(card, /next\?\.ok === false && next\.status !== 'requires-input' \? \{ \.\.\.next, error: userError\(next\.message \|\| 'Commande refusée\.'\) \}/);
});

test('constat 6 : le panneau refuse Réussite avec des DR négatifs et Échec avec des DR positifs, comme le dialogue', () => withDom(async () => {
  const request = traitRequest({ field: 'infectedEndurance', kind: 'test', participantId: 'hero', participantName: 'Héros', label: 'Héros · Endurance (+4 DR)', testTarget: target });
  const selected = [];
  const panel = renderTraitPlanRequests([request], { v5Context: {} }, { select: patch => selected.push(patch), calculate: () => {} });
  const [success] = byTag(panel, 'select'), [dr] = byTag(panel, 'input');
  success.value = 'true'; dr.value = '-2'; await success.fire('change');
  assert.equal(selected.length, 0, 'Réussite avec DR négatifs : aucune réponse envoyée');
  assert.match(panel.textContent, /incompatibles/);
  success.value = 'false'; dr.value = '3'; await dr.fire('change');
  assert.equal(selected.length, 0, 'Échec avec DR positifs : aucune réponse envoyée');
  success.value = 'false'; dr.value = '-1'; await dr.fire('change');
  assert.deepEqual(selected.at(-1).v5Context.traitInputs.hero.infectedEndurance, { success: false, sl: -1 });
  assert.doesNotMatch(panel.textContent, /incompatibles/, 'le message disparaît une fois la saisie cohérente');
}));

test('le panneau de résultat dit quand la relance de Chance est gratuite (Vindicte vengeresse, R-59)', () => withDom(async () => {
  const handlers = { select() {}, calculate() {} };
  const render = fortuneReroll => renderResult({ input: {}, fortuneReroll }, null, {}, handlers);
  assert.match(render({ active: true, free: true, source: 'Vindicte vengeresse' }).textContent, /Relance gratuite : Vindicte vengeresse/);
  assert.doesNotMatch(render({ active: true }).textContent, /Relance gratuite/);
}));
