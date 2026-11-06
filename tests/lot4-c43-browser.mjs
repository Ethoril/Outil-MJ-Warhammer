// C43 · prêtre sans action préparée : Prière à portée de main, « Allié admissible » déduit du camp, « Fin de l’effet » par défaut, Pénitences repliées.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { launchBrowser } from './helpers/browser.mjs';
import { openU1Settings, clickU1Magic } from './helpers/u1-drawer.mjs';

const ROOT = resolve('.');
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const file = resolve(join(ROOT, path));
    if (!file.startsWith(ROOT) || !(await stat(file)).isFile()) throw new Error('missing');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
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
const priest = { ...common, id: 'priest', name: 'Prêtre', kind: 'PJ', camp: 'pj', init: 60, initiative: 60, caracs,
  skills: [{ id: 'skill-50_72_69_e8_72_65-base', name: 'Prière', status: 'resolved', carac: 'Soc', total: 60 }],
  talents: [{ id: 'talent-bless', status: 'resolved', rank: 1, specialization: 'Ranald' }, { id: 'talent-invoke', status: 'resolved', rank: 1, specialization: 'Ranald' }],
  prayers: getAllDivineContracts().filter(row => row.type === 'miracle').map(row => ({ name: row.catalogueName, status: 'resolved' })), extensions: { v5: { divine: { sin: 0 } } } };
const alpha = { ...common, id: 'alpha', name: 'PJ Alpha', kind: 'PJ', camp: 'pj', init: 30, initiative: 30, caracs, skills: [], extensions: { v5: {} } };
const foe = { ...common, id: 'foe', name: 'Brigand', kind: 'PNJ', camp: 'ennemi', init: 20, initiative: 20, caracs, skills: [], extensions: { v5: {} } };
await store.loadFromJSON({ schemaVersion: 3, reserve: [], log: [], diceLines: [], extensions: { v5: { turnIndex: 1 } }, combat: { round: 1, currentActorId: 'priest', order: ['priest', 'alpha', 'foe'], participants: [priest, alpha, foe] } });
const view = initWorkspaceView({ mount: document.getElementById('workspace-mount'), Store: store, actions: { applyResolution: p => store.applyResolution(p) } });
view.setSpace('play'); window.__TEST__ = { Store: store, view };
</script></body></html>`;

const results = [];
const check = async (name, fn) => { try { await fn(); results.push([name, true]); console.log('ok   -', name); } catch (e) { results.push([name, false]); console.log('FAIL -', name, '\n      ', e.message.split('\n').slice(0, 4).join('\n       ')); } };
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 700 }, serviceWorkers: 'block' });
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.route(`${baseUrl}/__c43__.html`, route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS }));
  await page.goto(`${baseUrl}/__c43__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');

  await check('Prière : le panneau s’ouvre et le jet de Prière prend le focus, visible dans la fenêtre', async () => {
    await page.locator('[data-magic-menu]').click();
    await page.locator('#workspace-magic-menu').getByRole('button', { name: 'Prière', exact: true }).click();
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const active = document.activeElement, box = active?.getBoundingClientRect();
      return { key: active?.dataset?.focusKey, open: document.querySelector('[data-divine-panel]')?.open, visible: Boolean(box && box.top >= 0 && box.bottom <= innerHeight) };
    });
    assert.equal(state.open, true, 'panneau de prière ouvert');
    assert.equal(state.key, 'divine-roll', 'le focus est sur le jet de Prière');
    assert.equal(state.visible, true, 'le jet est dans la fenêtre');
  });

  await check('Pénitences de la fiche repliées tant qu’aucune pénitence n’existe', async () => {
    const box = page.locator('.workspace-divine-penances');
    if (await box.count()) assert.equal(await box.first().evaluate(element => element.open), false);
  });

  await check('Bonne fortune (alliés) : « Allié admissible » est déduit Oui pour un allié du même camp ; « Fin de l’effet » vaut Fin de Round', async () => {
    await page.getByLabel('Prière divine', { exact: true }).selectOption('divine:miracle:ranald:bountiful-fortune');
    await page.getByLabel('Destinataire PJ Alpha').check();
    const ally = page.getByRole('group', { name: 'PJ Alpha · Allié admissible' });
    assert.equal(await ally.getByRole('button', { name: 'Oui' }).getAttribute('aria-pressed'), 'true', 'Allié admissible déduit du camp');
    assert.equal(await page.locator('select[aria-label="Fin de l’effet (choix du MJ)"]').inputValue(), 'endOfRound');
  });

  await check('Bonne fortune : pour un camp ennemi, « Allié admissible » reste à préciser', async () => {
    await page.getByLabel('Destinataire Brigand').check();
    const foeAlly = page.getByRole('group', { name: 'Brigand · Allié admissible' });
    assert.equal(await foeAlly.getByRole('button', { name: 'Oui' }).getAttribute('aria-pressed'), 'false');
    assert.equal(await foeAlly.getByRole('button', { name: 'Non' }).getAttribute('aria-pressed'), 'false');
  });
  assert.equal(pageErrors.length, 0, pageErrors.join(' | '));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
const failed = results.filter(([, ok]) => !ok).length;
console.log(`${results.length - failed} réussis, ${failed} échoués`); process.exit(failed ? 1 : 0);
