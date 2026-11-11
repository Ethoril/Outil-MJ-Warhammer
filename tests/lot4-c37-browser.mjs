// C37 · G-DIV-8 : N’écoutez point la Sorcière doit imposer −2 DR au Test d'Incantation affiché ET appliqué (sort visant un protégé).
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
import { getAllDivineContracts } from '/js/core/v5-divine-store.js';
const store = createStore({ storage: null }); await store.ready;
const caracs = { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 60, M: 4 };
const common = { zone: 'active', hp: 30, maxHp: 30, equipment: [], traits: [], states: [], armor: { head: 0, body: 0, arms: 0, legs: 0 }, actions: [] };
const mage = { ...common, id: 'mage', name: 'Mage', kind: 'PJ', camp: 'ennemi', init: 60, initiative: 60, caracs,
  skills: [{ name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 }, { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }],
  spells: [{ id: 'spell-audit-c0be30bce9349904668c', name: 'Tête Brûlante' }], extensions: { v5: { magic: { lore: 'fire' }, channelling: { sl: 0, type: null } } } };
const alpha = { ...common, id: 'alpha', name: 'PJ Alpha', kind: 'PJ', camp: 'pj', init: 30, initiative: 30, caracs, skills: [], extensions: { v5: {} } };
const priest = { ...common, id: 'priest', name: 'Prêtre', kind: 'PJ', camp: 'pj', init: 40, initiative: 40, caracs,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Sigmar' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Sigmar' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })), extensions: { v5: { divine: { sin: 0 } } } };
await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } }, combat: { round: 1, currentActorId: 'mage', order: ['mage', 'priest', 'alpha'], participants: [mage, priest, alpha] } });
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, actions: { applyResolution: p => store.applyResolution(p) } });
view.setSpace('play'); window.__TEST__ = { Store: store, view };
window.__heed = async () => {
  const id = 'divine:miracle:sigmar:heed-not-the-witch';
  const pv = store.previewDivineExecution(id, { actorId: 'priest', targetIds: ['priest', 'alpha'], roll: 45, canSpeak: true, choices: { range: 0, targets: 0, duration: 0, effect: 0 },
    facts: { targets: { priest: { withinRange: true, withinArea: true }, alpha: { withinRange: true, withinArea: true } } }, expiry: { phase: 'endOfTurn', round: 6, actorId: 'priest' } });
  if (!pv.ready) throw new Error(JSON.stringify(pv.needsInput));
  await store.applyDivineExecution(id, { preview: pv });
};
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

  const castLine = async () => {
    await clickU1Magic(page, 'cast'); await openU1Settings(page);
    await page.getByLabel('Sort à lancer').selectOption('spell-audit-c0be30bce9349904668c');
    await page.fill('[data-roll-input="attack"]', '35');
    await page.click('[data-focus-key="calculate"]');
    return await page.locator('.workspace-resolution').innerText();
  };
  let without;
  await check('précondition : Calcul d’incantation sans la prière', async () => {
    without = await castLine();
    assert.match(without, /Calcul d’incantation : ([+−-]?\d+) DR \(test\)/);
  });
  await check('G-DIV-8 : avec la prière sur le protégé, le Test d’Incantation affiché perd 2 DR et le motif est visible', async () => {
    await page.evaluate(() => window.__heed());
    const after = await castLine();
    const pick = text => Number(/Calcul d’incantation : ([+−-]?\d+) DR \(test\)/.exec(text)[1].replace('−', '-'));
    assert.match(after, /PJ Alpha|Prêtre/, 'précondition : une cible de la zone est visée');
    assert.equal(pick(after), pick(without) - 2, `avant ${pick(without)} DR, après ${pick(after)} DR`);
    assert.match(after, /N’écoutez point la Sorcière|−2 DR|-2 DR/, 'le malus est nommé');
  });
  await check('G-DIV-8 : seule la cible protégée subit le malus (le lanceur seul, hors zone, n’en subit aucun)', async () => {
    const pick = text => Number(/Calcul d’incantation : ([+−-]?\d+) DR \(test\)/.exec(text)[1].replace('−', '-'));
    const castOn = async name => {
      // On coche d'abord la cible voulue : une liste vide retomberait sur la cible par défaut.
      for (const label of [name, ...['Mage', 'Prêtre', 'PJ Alpha'].filter(row => row !== name)]) {
        const box = page.getByLabel(`Cible du sort : ${label}`);
        assert.equal(await box.count(), 1, `case « Cible du sort : ${label} » introuvable`);
        if (await box.isChecked() !== (label === name)) await box.click();
      }
      await page.click('[data-focus-key="calculate"]');
      return await page.locator('.workspace-resolution').innerText();
    };
    await clickU1Magic(page, 'cast'); await openU1Settings(page);
    const box = page.getByLabel('Cible du sort : PJ Alpha');
    if (!await box.isVisible()) await page.getByText(/Cibles multiples/).click();
    const onAlpha = await castOn('PJ Alpha'), onMage = await castOn('Mage');
    assert.equal(pick(onAlpha), pick(without) - 2, 'cible protégée : −2 DR');
    assert.equal(pick(onMage), pick(without), 'cible non protégée : aucun malus');
    assert.doesNotMatch(onMage, /N’écoutez point la Sorcière/, 'pas de motif sans cible protégée');
  });
  assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
const failed = results.filter(([, ok]) => !ok).length;
console.log(`${results.length - failed} réussis, ${failed} échoués`); process.exit(failed ? 1 : 0);
