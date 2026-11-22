import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openV5FateDialog } from '../../../js/ui/v5-fate-dialog.js';
import { openV5FortuneDialog } from '../../../js/ui/v5-fortune-dialog.js';

// Refonte E7b (CA10) : Chance, Destin et Temps de campagne s'ouvrent sans bloquer le reste de l'écran.
const source = name => readFileSync(new URL(`../../../js/ui/${name}`, import.meta.url), 'utf8');

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.attributes = {}; this.style = {}; this.checked = false; this.value = ''; this.isConnected = true; }
  append(...items) { this.children.push(...items); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  remove() { this.isConnected = false; }
  focus() {}
  show() { this.opened = 'non-modal'; }
  showModal() { this.opened = 'modal'; }
  close() { this.listeners.close?.(); }
}
async function withDocument(run) {
  const original = globalThis.document;
  const body = new Element('body');
  const originalOption = globalThis.Option;
  globalThis.document = { activeElement: null, body, createElement: tag => new Element(tag) };
  globalThis.Option = function Option(text, value) { return Object.assign(new Element('option'), { textContent: text, value }); };
  try { return await run(body); } finally { globalThis.document = original; globalThis.Option = originalOption; }
}

test('la fenêtre de Destin s’ouvre en non modale, et son refus de fermeture pendant un envoi reste gardé', async () => {
  await withDocument(async body => {
    const promise = openV5FateDialog({ participantName: 'Elyse', fate: { balance: 3, permanent: 3, baseRevision: 1 }, getCurrentRevision: () => 1, submit: async () => ({ ok: true }) });
    const dialog = body.children[0];
    assert.equal(dialog.opened, 'non-modal');
    assert.equal(typeof dialog.listeners.cancel, 'function', 'le refus de fermeture pendant un envoi est conservé');
    dialog.close();
    await promise;
  });
});

test('la fenêtre de Chance s’ouvre en non modale', async () => {
  await withDocument(async body => {
    const promise = openV5FortuneDialog({ participantName: 'Elyse', fortune: { balance: 3, permanent: 3, temporary: 0, sourceBalance: 3, baseRevision: 1 }, getCurrentRevision: () => 1, submit: async () => ({ ok: true }) });
    const dialog = body.children[0];
    assert.equal(dialog.opened, 'non-modal');
    assert.equal(typeof dialog.listeners.cancel, 'function');
    dialog.close();
    await promise;
  });
});

test('Chance, Destin et Temps de campagne ne font plus appel à showModal', () => {
  for (const name of ['v5-fortune-dialog.js', 'v5-fate-dialog.js', 'v5-campaign-time-dialog.js']) {
    const text = source(name);
    assert.doesNotMatch(text, /showModal\(/, `${name} : plus de showModal`);
    assert.match(text, /dialog\.show\(\)/, `${name} : dialog.show()`);
    assert.match(text, /addEventListener\('cancel'/, `${name} : refus de fermeture pendant un envoi gardé`);
  }
});
