import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../../js/core/store.js';
import { createV5CorruptionPanel } from '../../../js/ui/v5-corruption-panel.js';

// C23 (G-COR-2, 3, 4) : les boutons du panneau Corruption doivent s'activer dès que les champs
// requis sont saisis (écouteur « input »), sans rendu complet du panneau.
const RESISTANCE = 'skill-52_e9_73_69_73_74_61_6e_63_65-base';

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attributes = {}; this.value = ''; this.disabled = false; this.textContent = ''; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
  async click() { for (const handler of this.listeners.click || []) await handler(); }
  enter(value) { this.value = String(value); for (const handler of this.listeners.input || []) handler(); }
  all() { return [this, ...this.children.flatMap(child => child instanceof Element ? child.all() : [])]; }
  control(label) { return this.all().find(el => el.attributes['aria-label'] === label); }
  button(label) { return this.all().find(el => el.tag === 'button' && el.textContent === label); }
}

async function mount(extraV5, caracs = { E: 30, FM: 30 }) {
  const store = createStore({ storage: null }); await store.ready;
  const hero = { id: 'hero', name: 'hero', zone: 'active', hp: 12, maxHp: 12, states: [], species: 'Human', caracs,
    skills: [{ id: RESISTANCE, status: 'resolved', total: 50 }], talents: [], extensions: { v5: extraV5 } };
  await store.loadFromJSON({ schemaVersion: 3, reserve: [], combat: { round: 0, order: [], participants: [hero] }, log: [], diceLines: [] });
  const panel = createV5CorruptionPanel({ Store: store });
  const rendered = panel.render(store.listParticipants().find(row => row.id === 'hero'));
  assert.ok(rendered, 'panneau rendu');
  return rendered;
}

async function withFakeDocument(fn) {
  const original = { document: globalThis.document, Option: globalThis.Option };
  globalThis.document = { createElement: tag => new Element(tag) };
  globalThis.Option = class Option extends Element { constructor(text, value) { super('option'); this.textContent = text; this.value = value; } };
  try { await fn(); } finally { globalThis.document = original.document; globalThis.Option = original.Option; }
}

test('C23 solde inconnu : « Enregistrer le solde connu » s’active après saisie du solde et du motif', () => withFakeDocument(async () => {
  const root = await mount({});
  const save = root.button('Enregistrer le solde connu');
  assert.ok(save, 'bouton présent quand le solde est inconnu');
  assert.equal(save.disabled, true, 'grisé tant que rien n’est saisi');
  root.control('Points de Corruption connus').enter(0);
  root.control('Motif de cette valeur connue').enter('Fiche papier');
  assert.equal(save.disabled, false, 'actif après saisie (0 est une valeur valide)');
}));

test('C23 Test de seuil requis : « Calculer le Test de seuil » s’active après saisie du jet de Résistance', () => withFakeDocument(async () => {
  const root = await mount({ corruptionPoints: 9, pendingCorruptionTest: { id: 'pending', status: 'pending', pointsAtTrigger: 9, thresholdAtTrigger: 6 } });
  const compute = root.button('Calculer le Test de seuil');
  assert.ok(compute, 'bouton présent');
  assert.equal(compute.disabled, true);
  root.control('Jet de Résistance (d100)').enter(95);
  [3, 5, 7].forEach((die, index) => root.all().filter(el => el.tag === 'input' && /d10/i.test(el.attributes['aria-label'] || ''))[index]?.enter(die));
  assert.equal(compute.disabled, false, 'actif après saisie du jet (d10 de délai facultatifs)');
}));

test('C23 absolution : « Appliquer l’absolution » s’active après saisie des points et du motif', () => withFakeDocument(async () => {
  const root = await mount({ corruptionPoints: 5 });
  const apply = root.button('Appliquer l’absolution');
  assert.ok(apply, 'bouton présent');
  assert.equal(apply.disabled, true);
  root.control('Points retirés').enter(1);
  root.control('Motif de l’absolution').enter('Rite de purification');
  assert.equal(apply.disabled, false, 'actif après saisie');
}));
