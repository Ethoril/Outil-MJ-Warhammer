import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFicheDetails, resetFicheTabs } from '../../../js/ui/fiche-details.js';

class El {
  constructor(tag) { this.tag = tag; this.children = []; this.className = ''; this.attrs = {}; this.listeners = {}; this._text = ''; this.hidden = false; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(' '); }
  append(...c) { this.children.push(...c); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  focus() { El.focused = this; }
  fire(type, event = {}) { for (const f of this.listeners[type] || []) f({ preventDefault() {}, ...event }); }
  all(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) c.all(pred, out); return out; }
}
const withDom = fn => () => { const prev = globalThis.document; globalThis.document = { createElement: t => new El(t) }; resetFicheTabs(); try { return fn(); } finally { if (prev === undefined) delete globalThis.document; else globalThis.document = prev; } };
const tabs = root => root.all(n => n.attrs.role === 'tab');
const panels = root => root.all(n => n.attrs.role === 'tabpanel');
const subject = (extra = {}) => ({ id: 'p1', skills: [{ name: 'Athlétisme', total: 40, advances: 5, carac: 'Ag', status: 'resolved' }],
  talents: [{ name: 'Chanceux', rank: 1, description: 'Relancez un jet raté.' }],
  equipment: [{ name: 'Épée', damage: 'BF+4' }], ...extra });

test('U4 : onglets présents seulement s’ils ont du contenu, rôles ARIA posés', withDom(() => {
  const root = renderFicheDetails(subject());
  assert.deepEqual(tabs(root).map(t => t._text), ['Compétences (1)', 'Talents (1)', 'Équipement (1)']);
  assert.equal(root.all(n => n.attrs.role === 'tablist').length, 1);
  assert.deepEqual(tabs(root).map(t => t.attrs['aria-selected']), ['true', 'false', 'false']);
  const hidden = panels(root).map(p => p.hidden);
  assert.deepEqual(hidden, [false, true, true]);
  assert.match(root.textContent, /Relancez un jet raté/, 'le texte est dans le DOM sans clic');
  const magic = renderFicheDetails(subject({ id: 'p2', spells: [{ nom: 'Boule de feu', desc: 'Dégâts' }] }));
  assert.ok(tabs(magic).some(t => t._text.startsWith('Magie/Foi')));
}));

test('U4 : l’onglet actif est conservé d’un rendu à l’autre, par participant', withDom(() => {
  const first = renderFicheDetails(subject());
  tabs(first)[1].fire('click');
  const again = renderFicheDetails(subject());
  assert.deepEqual(tabs(again).map(t => t.attrs['aria-selected']), ['false', 'true', 'false']);
  assert.deepEqual(panels(again).map(p => p.hidden), [true, false, true]);
  const other = renderFicheDetails(subject({ id: 'p9' }));
  assert.equal(tabs(other)[0].attrs['aria-selected'], 'true', 'un autre participant garde son propre onglet');
}));

test('U4 : navigation clavier par flèches, Home et End', withDom(() => {
  const root = renderFicheDetails(subject());
  const [a, b, c] = tabs(root);
  a.fire('keydown', { key: 'ArrowRight' });
  assert.equal(b.attrs['aria-selected'], 'true'); assert.equal(El.focused, b); assert.equal(b.attrs.tabindex, '0'); assert.equal(a.attrs.tabindex, '-1');
  b.fire('keydown', { key: 'End' }); assert.equal(c.attrs['aria-selected'], 'true');
  c.fire('keydown', { key: 'ArrowRight' }); assert.equal(a.attrs['aria-selected'], 'true', 'boucle');
  a.fire('keydown', { key: 'ArrowLeft' }); assert.equal(c.attrs['aria-selected'], 'true');
  c.fire('keydown', { key: 'Home' }); assert.equal(a.attrs['aria-selected'], 'true');
}));

test('U4 : un texte long se déplie en place, sans troisième niveau', withDom(() => {
  const long = 'x'.repeat(200);
  const root = renderFicheDetails(subject({ talents: [{ name: 'Long', rank: 1, description: long }] }));
  const row = root.all(n => /fiche-row-long/.test(n.className))[0];
  assert.equal(row.attrs['aria-expanded'], 'false');
  row.fire('click');
  assert.equal(row.attrs['aria-expanded'], 'true'); assert.match(row.className, /is-open/);
  assert.equal(root.all(n => n.tag === 'details').length, 1, 'seul le conteneur racine est un details');
}));
