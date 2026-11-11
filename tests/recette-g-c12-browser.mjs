import { openU1Settings, clickU1Magic } from './helpers/u1-drawer.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from './helpers/browser.mjs';
import { startStaticServer } from './helpers/static-server.mjs';

const ROOT = resolve('.');
const TMP_DIR = resolve('tmp/lot3');
const LAUNCH_OPTS = { headless: true };


const HARNESS_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lot 3 Magie V5 — Smoke UI</title>
  <link rel="stylesheet" href="/MJ.css">
  <link rel="stylesheet" href="/js/ui/workspace.css">
</head>
<body>
  <div id="test-controls" style="display:flex;gap:.5rem;padding:.5rem 1rem;background:#1a1510;border-bottom:1px solid #4a3c2c">
    <button id="test-undo" type="button">Annuler (Undo)</button>
    <button id="test-next-turn" type="button">Tour suivant</button>
  </div>
  <div id="workspace-mount"></div>
  <script type="module">
    import { createStore } from '/js/core/store.js';
    import { initWorkspaceView } from '/js/ui/workspace-view.js';
    import { createCombatEngine } from '/js/core/combat.js';

    let saved = null;
    const listeners = new Map();
    const bus = {
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(fn);
      },
      emit(event, ...args) {
        for (const fn of listeners.get(event) || []) fn(...args);
      }
    };
    const store = createStore({
      bus,
      persistence: {
        async load() { return structuredClone(saved); },
        async saveAtomic({ state }) { saved = structuredClone(state); return { ok: true }; }
      }
    });
    await store.ready;

    const mage = {
      id: 'mage-1',
      name: 'Aldous Flammecoeur',
      kind: 'PNJ',
      camp: 'pj',
      zone: 'active',
      init: 55,
      hp: 14,
      maxHp: 14,
      caracs: { CC: 35, CT: 35, F: 30, E: 40, I: 45, Ag: 40, Dex: 40, Int: 50, FM: 50, Soc: 35 },
      skills: [
        { name: 'Focalisation', characteristic: 'FM', advances: 0, value: 50 },
        { name: 'Focalisation (Aqshy)', characteristic: 'FM', advances: 10, value: 60 },
        { name: 'Langue (Magick)', characteristic: 'Int', advances: 10, value: 60 }
      ],
      spells: [
        { id: 'spell-audit-f44d90e9c50d6dafb769', name: 'Carreau' },
        { id: 'spell-audit-44d3e9b3a2c7a6e5cef2', name: 'Forme bestiale — Jade' },
        { id: 'spell-audit-1c1dcaf3632d91591839', name: 'Main de Gloire' },
        { id: 'spell-audit-eea74da21cd65c8b6570', name: 'Robe scintillante' }
      ],
      actions: [
        { id: 'staff-1', note: 'Bâton de sorcier', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }
      ],
      states: [],
      armor: { head: 0, body: 0, arms: 0, legs: 0 },
      extensions: {
        v5: {
          magic: { lore: 'fire' },
          channelling: { sl: 0, type: null }
        }
      }
    };

    const enemy = {
      id: 'enemy-1',
      name: 'Guerrier du Chaos',
      kind: 'Créature',
      camp: 'ennemi',
      zone: 'active',
      init: 40,
      hp: 15,
      maxHp: 15,
      caracs: { CC: 45, CT: 30, F: 40, E: 30, I: 35, Ag: 30, Dex: 25, Int: 30, FM: 35, Soc: 20 },
      actions: [
        { id: 'axe-1', note: 'Hache du Chaos', type: 'attack', attr: 'CC', base: 45, mod: 0, damage: 4, qualities: [] }
      ],
      states: [],
      armor: { head: 0, body: 0, arms: 0, legs: 0 }
    };

    await store.loadFromJSON({
      schemaVersion: 3,
      reserve: [],
      combat: {
        round: 1,
        currentActorId: 'mage-1',
        order: ['mage-1', 'enemy-1'],
        participants: [mage, enemy]
      },
      diceLines: [],
      log: []
    });

    const view = initWorkspaceView({
      mount: document.getElementById('workspace-mount'),
      Store: store,
      Bus: bus,
      actions: {
        applyResolution: preview => store.applyResolution(preview),
        acquireStates: (actorId, states, meta) => store.acquireStates(actorId, states, meta),
        recoverState: (actorId, key, opts) => store.recoverState(actorId, key, opts),
        setStates: (actorId, states, label) => store.setStates(actorId, states, label),
        setMomentum: (actorId, val) => store.setMomentum(actorId, val)
      }
    });
    view.setSpace('play');

    document.getElementById('test-undo').addEventListener('click', async () => {
      await store.undo();
      view.render();
    });
    document.getElementById('test-next-turn').addEventListener('click', async () => {
      await combat.nextTurn(); // chemin réel de main.js advanceTurn (commande end-turn-v5)
      view.render();
    });

    const combat = createCombatEngine(store);
    window.__TEST__ = { Store: store, view };
  </script>
</body>
</html>`;

const { server, baseUrl } = await startStaticServer({ root: ROOT, headers: { 'Cache-Control': 'no-cache' } });
let browser;

try {
  await mkdir(TMP_DIR, { recursive: true });
  browser = await launchBrowser(LAUNCH_OPTS);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.route(`${baseUrl}/__lot3_magic_ui__.html`, route =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS_HTML })
  );

  await page.goto(`${baseUrl}/__lot3_magic_ui__.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.workspace-resolution');

  await clickU1Magic(page,'cast');
  await openU1Settings(page);
  await page.fill('[data-roll-input="attack"]','22');
  await page.locator('[data-circumstances-toggle]').click();
  await page.click('[data-focus-key="calculate"]');
  await page.locator('.workspace-resolution-footer').getByRole('button',{name:/Jet d’incident magique/}).click();
  const field=page.locator('[data-focus-key="magicMiscastRoll"]');
  assert.equal(await field.isVisible(),true);
  const roll=field.locator('..').getByRole('button',{name:/^Lancer le d100/});
  assert.equal(await roll.count(),1,'un bouton permet de lancer le jet d’incident');
  await page.evaluate(()=>{Math.random=()=>0.14});await roll.click();
  assert.equal(await field.inputValue(),'15');
  await page.click('[data-focus-key="calculate"]');
  assert.match(await page.locator('.workspace-magic-result').innerText(),/Distraction/);
  await page.click('[data-focus-key="apply"]');
  assert.ok(await page.evaluate(()=>window.__TEST__.Store.listParticipants().find(p=>p.id==='mage-1').states.some(s=>(s.key||s.name)==='surpris')));
  await page.reload();await page.waitForSelector('.workspace-resolution');
  await clickU1Magic(page,'cast');await openU1Settings(page);
  await page.fill('[data-roll-input="attack"]','22');
  await page.evaluate(()=>{Math.random=()=>0.14});
  await page.getByRole('button',{name:'Lancer tous les dés des PNJ',exact:true}).click();
  assert.equal(await page.locator('[data-focus-key="magicMiscastRoll"]').inputValue(),'15');
  assert.match(await page.locator('.workspace-magic-result').innerText(),/Distraction/);
  assert.equal(pageErrors.length,0);
} finally { await browser?.close(); await new Promise(resolveClose=>server.close(resolveClose)); }
