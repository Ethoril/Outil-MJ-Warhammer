// C35 · G-MAG-3 et G-MAG-2 : les saisies exigées par l'aperçu magique doivent avoir un champ visible.
// (a) Focalisation, Test d'interruption raté : perte de réserve (1d10) et jet d'incident (1d100).
// (b) Brise-os (domaine maw) : d10 de l'offrande (Grande Gueule).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchBrowser } from './helpers/browser.mjs';
import { createStaticServer } from './helpers/static-server.mjs';
import { openU1Settings, clickU1Magic } from './helpers/u1-drawer.mjs';

const ROOT = resolve('.');
const server = createStaticServer({ root: ROOT });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const HARNESS = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/MJ.css"><link rel="stylesheet" href="/js/ui/workspace.css"></head>
<body><div id="workspace-mount"></div><script type="module">
import { createStore } from '/js/core/store.js';
import { initWorkspaceView } from '/js/ui/workspace-view.js';
const store = createStore({ storage: null }); await store.ready;
const mage = { id: 'mage', name: 'Mage des Bêtes', kind: 'PJ', camp: 'pj', zone: 'active', init: 55, hp: 14, maxHp: 14,
  caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35 },
  skills: [{ name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Calme', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }],
  spells: [{ id: 'spell-tradition-brise-os', name: 'Brise-os' }], actions: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 },
  extensions: { v5: { magic: { lore: 'beasts' }, channelling: { sl: 5, type: 'winds' } } } };
const foe = { id: 'foe', name: 'Brigand', kind: 'PNJ', camp: 'ennemi', zone: 'active', init: 40, hp: 15, maxHp: 15,
  caracs: { CC: 45, CT: 30, F: 40, E: 30, I: 35, Ag: 30, Dex: 25, Int: 30, FM: 35, Soc: 20 }, actions: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 } };
await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], combat: { round: 1, currentActorId: 'mage', order: ['mage', 'foe'], participants: [mage, foe] } });
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, actions: { applyResolution: p => store.applyResolution(p) } });
view.setSpace('play'); window.__TEST__ = { Store: store, view };
</script></body></html>`;

const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, true]); console.log('ok   -', name); } catch (e) { results.push([name, false]); console.log('FAIL -', name, '\n      ', e.message.split('\n').slice(0, 4).join('\n       ')); } };
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.route(`${baseUrl}/__c35__.html`, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS }));
  await page.goto(`${baseUrl}/__c35__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');

  await check('G-MAG-3 : interruption de Focalisation ratée (jet 95), les champs perte (1d10) et incident (1d100) sont visibles', async () => {
    await clickU1Magic(page, 'channelling'); await openU1Settings(page);
    await page.locator('[data-focus-key="magicChannelMode"]').selectOption('interruption');
    await page.fill('[data-roll-input="attack"]', '95');
    await page.click('[data-focus-key="calculate"]');
    const preview = await page.evaluate(() => document.querySelector('.workspace-magic-result')?.innerText || document.querySelector('.workspace-resolution')?.innerText);
    assert.match(preview, /perte de réserve \(1d10\)/, 'précondition : l’aperçu réclame bien la perte de réserve');
    assert.equal(await page.locator('[data-focus-key="magicFumbleLossRoll"]').isVisible(), true, 'champ « perte de réserve » visible');
    assert.equal(await page.locator('[data-focus-key="magicMiscastRoll"]').isVisible(), true, 'champ « jet d’incident » visible');
  });

  await check('G-MAG-3 : une fois la perte saisie, le motif de blocage ne reste pas générique non cliquable', async () => {
    const footer = page.locator('.workspace-resolution-footer');
    const generic = footer.getByText('Complétez les éléments requis pour la magie');
    if (await generic.count()) assert.equal(await footer.getByRole('button', { name: /Complétez les éléments requis pour la magie/ }).count(), 1, 'motif générique cliquable');
  });

  await check('G-MAG-2 : Brise-os (maw), le d10 de l’offrande a un champ de saisie', async () => {
    await clickU1Magic(page, 'cast'); await openU1Settings(page);
    await page.getByLabel('Sort à lancer').selectOption('spell-tradition-brise-os');
    await page.fill('[data-roll-input="attack"]', '05');
    await page.click('[data-focus-key="calculate"]');
    const text = await page.locator('.workspace-resolution').innerText();
    assert.match(text, /offrande/i, 'précondition : l’aperçu réclame le d10 de l’offrande');
    const field = page.getByLabel(/offrande/i);
    assert.ok(await field.count() >= 1 && await field.first().isVisible(), 'aucun champ « offrande » visible');
  });
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
const failed = results.filter(([, ok]) => !ok).length;
console.log(`${results.length - failed} réussis, ${failed} échoués`); process.exit(failed ? 1 : 0);
